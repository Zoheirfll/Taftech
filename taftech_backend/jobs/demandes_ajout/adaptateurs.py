"""Un adaptateur par type de demande : il sait retrouver une entrée existante, proposer les entrées
proches, créer une entrée neuve (Accepter), ajouter un alias à une entrée existante (Rattacher) et
appliquer les effets d'une décision. Étape 1 : DIPLOME et SPECIALITE. Les métiers (étape 2) et les
compétences (étape 3) s'ajouteront ici sans toucher au service."""
import difflib
import re

from django.db.models import Q

from ..models import (
    AliasDiplome, AliasSpecialite, Appellation, CompetenceReferentiel, DemandeAjout, DiplomeSpecialite, DomaineFormation,
    FiliereFormation, GroupeMetier, Metier, SpecialiteFormation, TypeDiplome,
)
from ..referentiel_utils import (
    FAMILLES_FORMATION, construire_index_competences, famille_formation, normaliser_recherche,
    rattacher_competences_orphelines,
)
from .regles import DemandeRefusee

CODE_DIPLOME_AUTRE = 'D-AUTRE'  # « Autre diplôme à préciser » : entrée générique, jamais une vraie cible
CODE_SPECIALITE_AUTRE = 'SP-AUTRE'
CODE_DOMAINE_AUTRE = 'D-AUTRE'
SOURCE_TAFTECH = 'TAF'


def _mots_utiles(cle, minimum=4):
    return [mot for mot in cle.split() if len(mot) >= minimum]


def _classer(cle, candidats, limite):
    """`candidats` : (id, libellé, détail, clé normalisée). Les plus proches d'abord, sans doublon d'id."""
    notes = sorted(
        ((difflib.SequenceMatcher(None, cle, cle_candidat).ratio(), id_, libelle, detail)
         for id_, libelle, detail, cle_candidat in candidats),
        key=lambda ligne: (-ligne[0], ligne[2]),
    )
    vus, resultat = set(), []
    for _note, id_, libelle, detail in notes:
        if id_ in vus:
            continue
        vus.add(id_)
        resultat.append({'id': id_, 'libelle': libelle, 'detail': detail})
        if len(resultat) >= limite:
            break
    return resultat


class Adaptateur:
    type = ''

    def libelle_valide(self, libelle):
        """Contrôle propre au type en plus des règles communes (par défaut : aucun)."""
        return True

    def libelle_existant(self, cle):
        """Libellé de l'entrée officielle qui porte déjà cette clé (libellé ou alias), sinon None."""
        raise NotImplementedError

    def proches(self, libelle, limite=5, minimum=4):
        """Entrées existantes les plus proches. `minimum` : longueur minimale d'un mot pris en compte
        (3 pour une recherche libre de l'admin, afin de retrouver un sigle comme « BTS »)."""
        raise NotImplementedError

    def parents(self):
        """Choix proposés à l'admin dans la fenêtre « Accepter »."""
        raise NotImplementedError

    def accepter(self, demande, libelle, parent, options):
        """Crée l'entrée officielle. Retourne (identifiant, libellé). Lève ValueError (message affichable)."""
        raise NotImplementedError

    def rattacher(self, demande, entree_id):
        """Ajoute le libellé de la demande comme alias de l'entrée choisie. Retourne (identifiant, libellé)."""
        raise NotImplementedError

    def appliquer(self, demande, entree_id):
        """Effets d'une demande acceptée ou rattachée : saisies déjà faites rattachées à l'entrée."""
        raise NotImplementedError


class AdaptateurDiplome(Adaptateur):
    type = DemandeAjout.TYPE_DIPLOME

    def _types(self):
        return TypeDiplome.objects.exclude(code=CODE_DIPLOME_AUTRE)

    def libelle_existant(self, cle):
        for type_diplome in self._types():
            if normaliser_recherche(type_diplome.libelle) == cle:
                return type_diplome.libelle
        alias = (
            AliasDiplome.objects.filter(cle_recherche=cle).exclude(diplome__code=CODE_DIPLOME_AUTRE)
            .select_related('diplome').order_by('id').first()
        )
        return alias.diplome.libelle if alias else None

    def proches(self, libelle, limite=5, minimum=4):
        cle = normaliser_recherche(libelle)
        mots = _mots_utiles(cle, minimum)
        if not mots:
            return []
        candidats = []
        for type_diplome in self._types():
            cle_type = normaliser_recherche(type_diplome.libelle)
            if any(mot in cle_type for mot in mots):
                candidats.append((type_diplome.id, type_diplome.libelle, type_diplome.systeme, cle_type))
        filtre = Q()
        for mot in mots:
            filtre |= Q(cle_recherche__icontains=mot)
        for alias in AliasDiplome.objects.filter(filtre).exclude(diplome__code=CODE_DIPLOME_AUTRE).select_related('diplome')[:40]:
            candidats.append((alias.diplome_id, alias.diplome.libelle, alias.diplome.systeme, alias.cle_recherche))
        return _classer(cle, candidats, limite)

    def parents(self):
        systemes = sorted(set(self._types().values_list('systeme', flat=True)) - {'autre', ''})
        return {'systemes': [
            {
                'valeur': systeme,
                'libelle': systeme.replace('_', ' '),
                'famille': FAMILLES_FORMATION.get(famille_formation(systeme), ''),
            }
            for systeme in systemes
        ]}

    def accepter(self, demande, libelle, parent, options):
        systemes = set(self._types().values_list('systeme', flat=True)) - {'autre', ''}
        if parent not in systemes:
            raise ValueError("Choisissez le système (famille de formation) du nouveau type de diplôme.")
        existant = self.libelle_existant(normaliser_recherche(libelle))
        if existant:
            raise ValueError(f"Ce libellé existe déjà dans le référentiel (« {existant} ») : rattachez la demande à cette entrée.")
        diplome = TypeDiplome.objects.create(
            code=f"TAF-DIP-{demande.pk}", libelle=libelle, systeme=parent, selectionnable=True, diplome_formel=True,
            source_id=SOURCE_TAFTECH, precision="Ajouté à la demande des utilisateurs, validé par l'administrateur.",
        )
        # Si l'admin a corrigé le libellé, la formulation d'origine reste reconnue (un alias suffit).
        if normaliser_recherche(libelle) != demande.cle_recherche and not self.libelle_existant(demande.cle_recherche):
            AliasDiplome.objects.create(
                code=f"TAF-AD-{demande.pk}", diplome=diplome, libelle=demande.libelle, cle_recherche=demande.cle_recherche,
                langue='fr', ambiguite=False, source_id=SOURCE_TAFTECH,
            )
        return diplome.pk, diplome.libelle

    def rattacher(self, demande, entree_id):
        cible = self._types().filter(pk=entree_id or 0, selectionnable=True).first()
        if cible is None:
            raise ValueError("Choisissez le type de diplôme auquel rattacher cette demande.")
        existant = self.libelle_existant(demande.cle_recherche)
        if existant:
            raise ValueError(f"Ce libellé existe déjà dans le référentiel (« {existant} ») : il n'y a rien à rattacher.")
        AliasDiplome.objects.create(
            code=f"TAF-AD-{demande.pk}", diplome=cible, libelle=demande.libelle, cle_recherche=demande.cle_recherche,
            langue='fr', ambiguite=False, source_id=SOURCE_TAFTECH,
        )
        return cible.pk, cible.libelle

    def appliquer(self, demande, entree_id):
        from .formations import appliquer_diplome_aux_formations
        appliquer_diplome_aux_formations(demande, entree_id)


class AdaptateurSpecialite(Adaptateur):
    type = DemandeAjout.TYPE_SPECIALITE

    def _specialites(self):
        return SpecialiteFormation.objects.exclude(code=CODE_SPECIALITE_AUTRE)

    def libelle_existant(self, cle):
        specialite = self._specialites().filter(cle_recherche=cle).order_by('id').first()
        if specialite:
            return specialite.libelle
        alias = (
            AliasSpecialite.objects.filter(cle_recherche=cle).exclude(specialite__code=CODE_SPECIALITE_AUTRE)
            .select_related('specialite').order_by('id').first()
        )
        return alias.specialite.libelle if alias else None

    def proches(self, libelle, limite=5, minimum=4):
        cle = normaliser_recherche(libelle)
        mots = _mots_utiles(cle, minimum)
        if not mots:
            return []
        filtre = Q()
        for mot in mots:
            filtre |= Q(cle_recherche__icontains=mot)
        candidats = []
        for specialite in self._specialites().filter(filtre, selectionnable=True).select_related('domaine')[:60]:
            candidats.append((specialite.id, specialite.libelle, specialite.domaine.libelle, specialite.cle_recherche))
        alias_qs = AliasSpecialite.objects.filter(filtre).exclude(specialite__code=CODE_SPECIALITE_AUTRE)
        for alias in alias_qs.select_related('specialite__domaine')[:60]:
            candidats.append((alias.specialite_id, alias.specialite.libelle, alias.specialite.domaine.libelle, alias.cle_recherche))
        return _classer(cle, candidats, limite)

    def parents(self):
        domaines = list(DomaineFormation.objects.filter(actif=True).exclude(code=CODE_DOMAINE_AUTRE).order_by('libelle'))
        filieres = {}
        for filiere in FiliereFormation.objects.filter(actif=True, domaine__in=domaines).order_by('libelle'):
            filieres.setdefault(filiere.domaine_id, []).append({'id': filiere.id, 'libelle': filiere.libelle})
        diplomes = TypeDiplome.objects.exclude(code=CODE_DIPLOME_AUTRE).filter(selectionnable=True).order_by('libelle')
        return {
            'domaines': [
                {
                    'id': d.id, 'libelle': d.libelle,
                    'famille': FAMILLES_FORMATION.get(famille_formation(d.systeme), ''),
                    'filieres': filieres.get(d.id, []),
                }
                for d in domaines
            ],
            'diplomes': [{'id': d.id, 'libelle': d.libelle} for d in diplomes],
        }

    def accepter(self, demande, libelle, parent, options):
        domaine = DomaineFormation.objects.filter(pk=_entier(parent), actif=True).exclude(code=CODE_DOMAINE_AUTRE).first()
        if domaine is None:
            raise ValueError("Choisissez le domaine de la nouvelle spécialité.")
        filiere = None
        filiere_id = _entier((options or {}).get('filiere_id'))
        if filiere_id:
            filiere = FiliereFormation.objects.filter(pk=filiere_id, domaine=domaine, actif=True).first()
            if filiere is None:
                raise ValueError("Cette filière n'appartient pas au domaine choisi.")
        diplomes_ids = [_entier(i) for i in ((options or {}).get('diplomes_ids') or [])]
        diplomes = list(self._types_diplome().filter(pk__in=[i for i in diplomes_ids if i]))
        if len(diplomes) != len({i for i in diplomes_ids if i}):
            raise ValueError("Un des diplômes choisis n'existe pas dans le référentiel.")
        cle = normaliser_recherche(libelle)
        existant = self.libelle_existant(cle)
        if existant:
            raise ValueError(f"Ce libellé existe déjà dans le référentiel (« {existant} ») : rattachez la demande à cette entrée.")
        specialite = SpecialiteFormation.objects.create(
            code=f"TAF-SPE-{demande.pk}", domaine=domaine, filiere=filiere, libelle=libelle, cle_recherche=cle,
            nature='taftech', selectionnable=True, source_id=SOURCE_TAFTECH, statut_reference='ajout administrateur',
        )
        for diplome in diplomes:
            DiplomeSpecialite.objects.create(
                code=f"TAF-DS-{demande.pk}-{diplome.pk}", diplome=diplome, specialite=specialite,
                statut='ajout administrateur', selectionnable=True, source_id=SOURCE_TAFTECH,
            )
        if cle != demande.cle_recherche and not self.libelle_existant(demande.cle_recherche):
            AliasSpecialite.objects.create(
                code=f"TAF-AS-{demande.pk}", specialite=specialite, libelle=demande.libelle, cle_recherche=demande.cle_recherche,
                langue='fr', type_alias='demande', ambiguite=False, source_id=SOURCE_TAFTECH,
            )
        return specialite.pk, specialite.libelle

    def _types_diplome(self):
        return TypeDiplome.objects.exclude(code=CODE_DIPLOME_AUTRE)

    def rattacher(self, demande, entree_id):
        cible = self._specialites().filter(pk=entree_id or 0, selectionnable=True).first()
        if cible is None:
            raise ValueError("Choisissez la spécialité à laquelle rattacher cette demande.")
        existant = self.libelle_existant(demande.cle_recherche)
        if existant:
            raise ValueError(f"Ce libellé existe déjà dans le référentiel (« {existant} ») : il n'y a rien à rattacher.")
        AliasSpecialite.objects.create(
            code=f"TAF-AS-{demande.pk}", specialite=cible, libelle=demande.libelle, cle_recherche=demande.cle_recherche,
            langue='fr', type_alias='demande', ambiguite=False, source_id=SOURCE_TAFTECH,
        )
        return cible.pk, cible.libelle

    def appliquer(self, demande, entree_id):
        from .formations import appliquer_specialite_aux_formations
        appliquer_specialite_aux_formations(demande, entree_id)


def _entier(valeur):
    try:
        return int(valeur)
    except (TypeError, ValueError):
        return 0


# Seuls ces groupes portent réellement des métiers (le secteur source est un simple regroupement).
TYPES_GROUPE_METIER = ('domaine_source', 'sous_domaine_source')


class AdaptateurMetier(Adaptateur):
    """Métiers : accepter = nouveau métier officiel dans un groupe ; rattacher = nouvelle appellation d'un métier existant."""
    type = DemandeAjout.TYPE_METIER

    def libelle_existant(self, cle):
        appellation = Appellation.objects.filter(cle_recherche=cle, actif=True).select_related('metier').order_by('id').first()
        return appellation.metier.libelle if appellation else None

    def proches(self, libelle, limite=5, minimum=4):
        cle = normaliser_recherche(libelle)
        mots = _mots_utiles(cle, minimum)
        if not mots:
            return []
        filtre = Q()
        for mot in mots:
            filtre |= Q(cle_recherche__icontains=mot)
        appellations = (
            Appellation.objects.filter(filtre, actif=True, metier__selectionnable=True)
            .select_related('metier', 'metier__metier_canonique', 'metier__groupe_principal')[:60]
        )
        candidats = []
        for appellation in appellations:
            canonique = appellation.metier.metier_canonique or appellation.metier
            groupe = canonique.groupe_principal.libelle if canonique.groupe_principal_id else ''
            candidats.append((canonique.id, canonique.libelle, groupe, appellation.cle_recherche))
        return _classer(cle, candidats, limite)

    def parents(self):
        groupes = GroupeMetier.objects.filter(type_groupe__in=TYPES_GROUPE_METIER).select_related('parent').order_by('parent__libelle', 'libelle')
        return {'groupes': [
            {'id': g.id, 'libelle': g.libelle, 'parent_libelle': g.parent.libelle if g.parent else ''} for g in groupes
        ]}

    def accepter(self, demande, libelle, parent, options):
        groupe = GroupeMetier.objects.filter(pk=_entier(parent), type_groupe__in=TYPES_GROUPE_METIER).first()
        if groupe is None:
            raise ValueError("Choisissez le groupe du nouveau métier.")
        cle = normaliser_recherche(libelle)
        existant = self.libelle_existant(cle)
        if existant:
            raise ValueError(f"Ce libellé existe déjà dans le référentiel (« {existant} ») : rattachez la demande à cette entrée.")
        metier = Metier.objects.create(
            code=f"TAF-DM-{demande.pk}", libelle=libelle, cle_recherche=cle, granularite='metier',
            groupe_principal=groupe, selectionnable=True, statut='actif',
        )
        metier.metier_canonique = metier
        metier.save(update_fields=['metier_canonique'])
        Appellation.objects.create(
            code=f"TAF-DA-{demande.pk}", metier=metier, libelle=libelle, cle_recherche=cle, langue='fr',
            type_alias='proposition', ambiguite=False, actif=True,
        )
        # Si l'admin a corrigé le libellé, la formulation d'origine reste reconnue.
        if cle != demande.cle_recherche and not self.libelle_existant(demande.cle_recherche):
            Appellation.objects.create(
                code=f"TAF-DA-{demande.pk}-O", metier=metier, libelle=demande.libelle, cle_recherche=demande.cle_recherche,
                langue='fr', type_alias='proposition', ambiguite=False, actif=True,
            )
        return metier.pk, metier.libelle

    def rattacher(self, demande, entree_id):
        metier = Metier.objects.filter(pk=_entier(entree_id)).first()
        cible = (metier.metier_canonique or metier) if metier else None
        if cible is None or not cible.selectionnable:
            raise ValueError("Choisissez le métier auquel rattacher cette demande.")
        existant = self.libelle_existant(demande.cle_recherche)
        if existant:
            raise ValueError(f"Ce libellé existe déjà dans le référentiel (« {existant} ») : il n'y a rien à rattacher.")
        Appellation.objects.create(
            code=f"TAF-DA-{demande.pk}", metier=cible, libelle=demande.libelle, cle_recherche=demande.cle_recherche,
            langue='fr', type_alias='proposition', ambiguite=False, actif=True,
        )
        return cible.pk, cible.libelle

    def appliquer(self, demande, entree_id):
        """Un métier proposé ne rattache aucun profil ni aucune offre : le demandeur le choisit ensuite dans la liste."""


class AdaptateurCompetence(Adaptateur):
    """Compétences : accepter = nouvelle compétence officielle ; rattacher = nouveau synonyme d'une compétence
    existante. Seules les compétences officielles (validées ou désactivées) comptent comme « déjà présentes »."""
    type = DemandeAjout.TYPE_COMPETENCE
    LABEL_MAX = 100  # CompetenceReferentiel.label

    def libelle_valide(self, libelle):
        from ..cv_parser.competences import _est_competence_valide  # même filtre anti-bruit que le parser de CV
        return len(libelle) <= self.LABEL_MAX and _est_competence_valide(libelle)

    def libelle_existant(self, cle):
        reference = construire_index_competences().get(cle)
        return reference.label if reference else None

    def proches(self, libelle, limite=5, minimum=4):
        cle = normaliser_recherche(libelle)
        mots = _mots_utiles(cle, minimum)
        if not mots:
            return []
        candidats = [
            (reference.id, reference.label, '', cle_reference)
            for cle_reference, reference in construire_index_competences().items()
            if any(mot in cle_reference for mot in mots)
        ]
        return _classer(cle, candidats, limite)

    def parents(self):
        return {}

    def accepter(self, demande, libelle, parent, options):
        libelle = libelle[:self.LABEL_MAX]
        cle = normaliser_recherche(libelle)
        existant = self.libelle_existant(cle)
        if existant:
            raise ValueError(f"Ce libellé existe déjà dans le référentiel (« {existant} ») : rattachez la demande à cette entrée.")
        # Une ancienne suggestion ou un rejet portant ce libellé exact est promu plutôt que dupliqué (libellé unique).
        ancienne = CompetenceReferentiel.objects.filter(label__iexact=libelle).first()
        if ancienne is not None:
            ancienne.changer_statut(CompetenceReferentiel.STATUT_VALIDEE)
            competence = ancienne
        else:
            competence = CompetenceReferentiel.objects.create(
                label=libelle, statut=CompetenceReferentiel.STATUT_VALIDEE, origine='PROPOSITION_AUTO',
            )
        if cle != demande.cle_recherche and not self.libelle_existant(demande.cle_recherche):
            self._ajouter_synonyme(competence, demande.libelle)
        return competence.pk, competence.label

    def rattacher(self, demande, entree_id):
        cible = CompetenceReferentiel.objects.filter(pk=_entier(entree_id), statut=CompetenceReferentiel.STATUT_VALIDEE).first()
        if cible is None:
            raise ValueError("Choisissez la compétence à laquelle rattacher cette demande.")
        existant = self.libelle_existant(demande.cle_recherche)
        if existant:
            raise ValueError(f"Ce libellé existe déjà dans le référentiel (« {existant} ») : il n'y a rien à rattacher.")
        self._ajouter_synonyme(cible, demande.libelle)
        return cible.pk, cible.label

    @staticmethod
    def _ajouter_synonyme(competence, libelle):
        # Les synonymes sont stockés dans un texte séparé par , ; | : on retire ces séparateurs du libellé ajouté.
        propre = re.sub(r"[,;|]", " ", libelle).strip()
        competence.synonymes = f"{competence.synonymes}, {propre}" if competence.synonymes.strip() else propre
        competence.save(update_fields=['synonymes'])

    def appliquer(self, demande, entree_id):
        """Les saisies existantes (profils, offres) qui portent ce libellé ou un synonyme sont rattachées."""
        rattacher_competences_orphelines()


ADAPTATEURS = {
    DemandeAjout.TYPE_DIPLOME: AdaptateurDiplome(),
    DemandeAjout.TYPE_SPECIALITE: AdaptateurSpecialite(),
    DemandeAjout.TYPE_METIER: AdaptateurMetier(),
    DemandeAjout.TYPE_COMPETENCE: AdaptateurCompetence(),
}


def adaptateur_pour(type_demande):
    adaptateur = ADAPTATEURS.get(type_demande)
    if adaptateur is None:
        raise DemandeRefusee("Ce type de demande n'est pas encore pris en charge.", 'TYPE_INCONNU')
    return adaptateur
