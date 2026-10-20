"""Explorateur du référentiel (20/10/2026) : consulter, en LECTURE SEULE, toute la hiérarchie des
métiers (secteur → domaine → sous-domaine → métier → appellations / compétences / spécialités) et
celle des formations (domaine → spécialités), avec des compteurs à chaque niveau et un panneau
d'anomalies (données incomplètes à corriger). Aucune écriture : les modifications restent dans les
pages Métiers / Formations / Spécialités / Compétences et dans `referentiel_fusions.py`."""
from django.db.models import Count, F, Q
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import (
    Appellation, DiplomeSpecialite, DomaineFormation, FiliereFormation, GroupeMetier, Metier,
    MetierCompetence, MetierFormation, SpecialiteFormation, TypeDiplome,
)
from ..permissions import IsAdminRole
from ..referentiel_utils import _nettoyer_libelle_secteur_nsec, normaliser_recherche

TAILLE_PAGE = 15  # lignes par page des listes (pagination côté serveur : aucune liste n'est coupée)
PROFONDEUR_MAX = 10  # garde-fou contre une boucle dans la hiérarchie
TYPES_GROUPE = {
    'secteur_source': 'Secteur', 'domaine_source': 'Domaine', 'sous_domaine_source': 'Sous-domaine',
}

# Un métier « actif » : il pointe vers lui-même ou n'a pas de métier canonique (voir CLAUDE.md).
METIER_ACTIF = Q(statut='actif') & (Q(metier_canonique__isnull=True) | Q(metier_canonique_id=F('id')))

ANOMALIES_METIERS = {
    'metiers_sans_groupe': Q(groupe_principal__isnull=True),
    'metiers_sans_competence': Q(competences_suggerees__isnull=True),
    'metiers_sans_formation': Q(formations_suggerees__isnull=True),
}


def _metiers_actifs():
    return Metier.objects.filter(METIER_ACTIF)


def _terme(request):
    """Texte cherché (`?search=`), normalisé comme `cle_recherche` (sans accent ni casse)."""
    return normaliser_recherche(request.query_params.get('search', '')).strip()


def _filtrer_cle(queryset, terme):
    """Garde les lignes dont `cle_recherche` contient chacun des mots cherchés."""
    for mot in terme.split():
        queryset = queryset.filter(cle_recherche__icontains=mot)
    return queryset


def _fenetre(request, total):
    """Page demandée (`?page=`, bornée) : renvoie `(meta, debut, fin)` ; `meta` est fusionné dans la réponse."""
    demandee = request.query_params.get('page', '')
    pages = max(1, -(-total // TAILLE_PAGE))
    page = min(max(int(demandee), 1), pages) if demandee.isdigit() else 1
    debut = (page - 1) * TAILLE_PAGE
    return {'total': total, 'page': page, 'total_pages': pages}, debut, debut + TAILLE_PAGE


def _libelle_groupe(groupe):
    return _nettoyer_libelle_secteur_nsec(groupe.libelle) if groupe.type_groupe == 'secteur_source' else groupe.libelle


def _cumuls(parents, directs):
    """Nombre de métiers actifs de chaque groupe, descendants compris : chaque groupe ajoute son
    compte direct à tous ses ancêtres. `parents` = {groupe_id: parent_id}."""
    total = dict(directs)
    for groupe_id, n in directs.items():
        ancetre, profondeur = parents.get(groupe_id), 0
        while ancetre is not None and profondeur < PROFONDEUR_MAX:
            total[ancetre] = total.get(ancetre, 0) + n
            ancetre, profondeur = parents.get(ancetre), profondeur + 1
    return total


def _arbre():
    groupes = list(GroupeMetier.objects.all())
    directs = {
        ligne['groupe_principal_id']: ligne['n']
        for ligne in _metiers_actifs().exclude(groupe_principal__isnull=True)
        .values('groupe_principal_id').annotate(n=Count('id'))
    }
    return groupes, directs, _cumuls({g.id: g.parent_id for g in groupes}, directs)


def _groupes_vides(groupes, cumuls):
    return [g for g in groupes if g.type_groupe in TYPES_GROUPE and not cumuls.get(g.id)]


def _sans_appellation(actifs):
    return actifs.exclude(appellations__actif=True)


def _anomalies_comptes(groupes, cumuls):
    actifs = _metiers_actifs()
    return {
        'metiers_sans_groupe': actifs.filter(ANOMALIES_METIERS['metiers_sans_groupe']).count(),
        'metiers_sans_competence': actifs.filter(ANOMALIES_METIERS['metiers_sans_competence']).count(),
        'metiers_sans_appellation': _sans_appellation(actifs).count(),
        'metiers_sans_formation': actifs.filter(ANOMALIES_METIERS['metiers_sans_formation']).count(),
        'groupes_vides': len(_groupes_vides(groupes, cumuls)),
        'specialites_sans_diplome': SpecialiteFormation.objects.filter(diplomes_lies__isnull=True).count(),
    }


class AdminExplorateurArbreAPIView(APIView):
    """Arbre complet des groupes (≈ 800 lignes) + totaux + compteurs d'anomalies."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        groupes, directs, cumuls = _arbre()
        return Response({
            'groupes': [
                {
                    'id': g.id, 'code': g.code, 'parent_id': g.parent_id, 'type': g.type_groupe,
                    'type_libelle': TYPES_GROUPE.get(g.type_groupe, g.type_groupe),
                    'libelle': _libelle_groupe(g),
                    'nb_metiers_directs': directs.get(g.id, 0), 'nb_metiers': cumuls.get(g.id, 0),
                }
                for g in groupes
            ],
            'totaux': {
                'secteurs': sum(1 for g in groupes if g.type_groupe == 'secteur_source'),
                'domaines': sum(1 for g in groupes if g.type_groupe == 'domaine_source'),
                'sous_domaines': sum(1 for g in groupes if g.type_groupe == 'sous_domaine_source'),
                'metiers_actifs': _metiers_actifs().count(),
                'appellations': Appellation.objects.filter(actif=True).count(),
                'liens_competences': MetierCompetence.objects.count(),
                'liens_formations': MetierFormation.objects.count(),
                'domaines_formation': DomaineFormation.objects.count(),
                'specialites': SpecialiteFormation.objects.count(),
            },
            'anomalies': _anomalies_comptes(groupes, cumuls),
        })


def _descendants(groupes, groupe_id):
    """Identifiants du groupe et de tous ses sous-groupes (parcours en mémoire, profondeur bornée)."""
    enfants = {}
    for g in groupes:
        enfants.setdefault(g.parent_id, []).append(g.id)
    ids, a_visiter, profondeur = {groupe_id}, [groupe_id], 0
    while a_visiter and profondeur < PROFONDEUR_MAX:
        a_visiter = [e for g in a_visiter for e in enfants.get(g, []) if e not in ids]
        ids.update(a_visiter)
        profondeur += 1
    return ids


def _metiers_comptes(queryset):
    return queryset.select_related('groupe_principal').annotate(
        n_appellations=Count('appellations', filter=Q(appellations__actif=True), distinct=True),
        n_competences=Count('competences_suggerees', distinct=True),
        n_formations=Count('formations_suggerees', distinct=True),
    ).order_by('libelle')


def _ligne_metier(m):
    return {
        'id': m.id, 'code': m.code, 'libelle': m.libelle, 'selectionnable': m.selectionnable,
        'groupe': _libelle_groupe(m.groupe_principal) if m.groupe_principal else '—',
        'nb_appellations': m.n_appellations, 'nb_competences': m.n_competences, 'nb_formations': m.n_formations,
    }


class AdminExplorateurGroupeAPIView(APIView):
    """Métiers actifs rattachés directement à un groupe, avec leurs compteurs ; avec `?sous_groupes=1`,
    tous les métiers du groupe et de ses sous-groupes (le nombre affiché sur chaque ligne de l'arbre)."""
    permission_classes = [IsAdminRole]

    def get(self, request, groupe_id):
        groupe = GroupeMetier.objects.filter(pk=groupe_id).first()
        if groupe is None:
            return Response({'error': 'Groupe introuvable.'}, status=404)
        if request.query_params.get('sous_groupes') == '1':
            ids = _descendants(list(GroupeMetier.objects.only('id', 'parent_id')), groupe.id)
            qs = _metiers_actifs().filter(groupe_principal_id__in=ids)
        else:
            qs = _metiers_actifs().filter(groupe_principal=groupe)
        qs = _filtrer_cle(qs, _terme(request))
        meta, debut, fin = _fenetre(request, qs.count())
        return Response({
            'groupe': {'id': groupe.id, 'libelle': _libelle_groupe(groupe), 'code': groupe.code},
            **meta,
            'metiers': [_ligne_metier(m) for m in _metiers_comptes(qs)[debut:fin]],
        })


class AdminExplorateurMetierAPIView(APIView):
    """Fiche d'un métier : chemin dans la hiérarchie, appellations, compétences et spécialités liées."""
    permission_classes = [IsAdminRole]

    def get(self, request, metier_id):
        metier = Metier.objects.filter(pk=metier_id).select_related('groupe_principal', 'metier_canonique').first()
        if metier is None:
            return Response({'error': 'Métier introuvable.'}, status=404)
        chemin, g, profondeur = [], metier.groupe_principal, 0
        while g is not None and profondeur < PROFONDEUR_MAX:
            chemin.insert(0, {'id': g.id, 'libelle': _libelle_groupe(g), 'type': TYPES_GROUPE.get(g.type_groupe, g.type_groupe)})
            g, profondeur = g.parent, profondeur + 1
        redirige = metier.metier_canonique_id not in (None, metier.id)
        return Response({
            'metier': {
                'id': metier.id, 'code': metier.code, 'libelle': metier.libelle, 'statut': metier.statut,
                'granularite': metier.granularite, 'selectionnable': metier.selectionnable,
                'redirige_vers': metier.metier_canonique.libelle if redirige else None,
            },
            'chemin': chemin,
            'appellations': list(metier.appellations.order_by('libelle').values('id', 'libelle', 'langue', 'actif')),
            'competences': list(
                metier.competences_suggerees.order_by('competence__label')
                .values('competence_id', 'competence__label', 'competence__actif')
            ),
            'specialites': list(
                metier.formations_suggerees.order_by('specialite__libelle')
                .values('specialite_id', 'specialite__libelle', 'specialite__domaine__libelle', 'relation')
            ),
        })


def _elements_metiers(request, qs):
    qs = _filtrer_cle(qs, _terme(request)).select_related('groupe_principal').order_by('libelle')
    meta, debut, fin = _fenetre(request, qs.count())
    return {
        **meta,
        'elements': [
            {'id': m.id, 'libelle': m.libelle, 'metier_id': m.id,
             'detail': _libelle_groupe(m.groupe_principal) if m.groupe_principal else '—'}
            for m in qs[debut:fin]
        ],
    }


class AdminExplorateurAnomaliesAPIView(APIView):
    """Liste (plafonnée, total exact) des éléments d'une anomalie. `code` : voir `_anomalies_comptes`."""
    permission_classes = [IsAdminRole]

    def get(self, request, code):
        actifs = _metiers_actifs()
        if code in ANOMALIES_METIERS:
            return Response({'code': code, **_elements_metiers(request, actifs.filter(ANOMALIES_METIERS[code]))})
        if code == 'metiers_sans_appellation':
            return Response({'code': code, **_elements_metiers(request, _sans_appellation(actifs))})
        if code == 'groupes_vides':
            groupes, _, cumuls = _arbre()
            terme = _terme(request)
            vides = sorted(
                (g for g in _groupes_vides(groupes, cumuls) if terme in normaliser_recherche(_libelle_groupe(g))),
                key=lambda g: (g.type_groupe, g.libelle),
            )
            meta, debut, fin = _fenetre(request, len(vides))
            return Response({
                'code': code, **meta,
                'elements': [
                    {'id': g.id, 'libelle': _libelle_groupe(g), 'detail': TYPES_GROUPE[g.type_groupe], 'metier_id': None}
                    for g in vides[debut:fin]
                ],
            })
        if code == 'specialites_sans_diplome':
            qs = _filtrer_cle(SpecialiteFormation.objects.filter(diplomes_lies__isnull=True), _terme(request))
            qs = qs.select_related('domaine').order_by('libelle')
            meta, debut, fin = _fenetre(request, qs.count())
            return Response({
                'code': code, **meta,
                'elements': [
                    {'id': s.id, 'libelle': s.libelle, 'detail': s.domaine.libelle, 'metier_id': None}
                    for s in qs[debut:fin]
                ],
            })
        return Response({'error': 'Anomalie inconnue.'}, status=404)


class AdminExplorateurSpecialiteAPIView(APIView):
    """Fiche d'une spécialité de formation : diplômes avec lesquels elle est attestée et métiers qui y sont liés."""
    permission_classes = [IsAdminRole]

    def get(self, request, specialite_id):
        s = SpecialiteFormation.objects.filter(pk=specialite_id).select_related('domaine', 'filiere').first()
        if s is None:
            return Response({'error': 'Spécialité introuvable.'}, status=404)
        liens_metiers = (
            s.metiers_lies.select_related('metier__groupe_principal').order_by('metier__libelle')
        )
        return Response({
            'specialite': {
                'id': s.id, 'code': s.code, 'libelle': s.libelle, 'domaine': s.domaine.libelle,
                'filiere': s.filiere.libelle if s.filiere else '', 'nature': s.nature,
                'selectionnable': s.selectionnable,
            },
            'diplomes': list(
                s.diplomes_lies.select_related('diplome').order_by('diplome__libelle')
                .values('diplome_id', 'diplome__libelle', 'diplome__systeme', 'statut')
            ),
            'metiers': [
                {
                    'id': lien.metier_id, 'libelle': lien.metier.libelle, 'relation': lien.relation,
                    'groupe': _libelle_groupe(lien.metier.groupe_principal) if lien.metier.groupe_principal else '—',
                }
                for lien in liens_metiers
            ],
        })


class AdminExplorateurFormationsAPIView(APIView):
    """Domaines de formation avec le nombre de filières et de spécialités ; avec `?domaine=<id>`,
    les spécialités de ce domaine (plafonnées, total exact)."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        domaine_id = request.query_params.get('domaine', '')
        if domaine_id.isdigit():
            base = _filtrer_cle(SpecialiteFormation.objects.filter(domaine_id=int(domaine_id)), _terme(request))
            qs = base.select_related('filiere').annotate(
                n_metiers=Count('metiers_lies', distinct=True), n_diplomes=Count('diplomes_lies', distinct=True),
            ).order_by('libelle')
            meta, debut, fin = _fenetre(request, qs.count())
            filieres = (
                FiliereFormation.objects.filter(domaine_id=int(domaine_id))
                .annotate(nb_specialites=Count('specialites')).order_by('libelle')
                .values('id', 'libelle', 'nb_specialites')
            )
            return Response({
                **meta,
                'filieres': list(filieres),
                'specialites': [
                    {
                        'id': s.id, 'libelle': s.libelle, 'filiere': s.filiere.libelle if s.filiere else '',
                        'nature': s.nature, 'selectionnable': s.selectionnable,
                        'nb_metiers': s.n_metiers, 'nb_diplomes': s.n_diplomes,
                    }
                    for s in qs[debut:fin]
                ],
            })
        domaines = DomaineFormation.objects.annotate(
            n_filieres=Count('filieres', distinct=True), n_specialites=Count('specialites', distinct=True),
        ).order_by('libelle')
        return Response({
            'totaux': {
                'domaines': DomaineFormation.objects.count(),
                'filieres': FiliereFormation.objects.count(),
                'specialites': SpecialiteFormation.objects.count(),
                'types_diplome': TypeDiplome.objects.count(),
                'liens_diplome_specialite': DiplomeSpecialite.objects.count(),
            },
            'domaines': [
                {
                    'id': d.id, 'code': d.code, 'libelle': d.libelle, 'systeme': d.systeme, 'actif': d.actif,
                    'nb_filieres': d.n_filieres, 'nb_specialites': d.n_specialites,
                }
                for d in domaines
            ],
        })
