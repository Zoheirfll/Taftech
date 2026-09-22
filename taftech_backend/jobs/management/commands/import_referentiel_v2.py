"""
Importe le référentiel v2 fourni par le client (deux classeurs, lot
TAFTECH-2026.09.11-v2) — remplace à terme Secteur/Domaine/SousDomaine/
MetierReferentiel côté métiers, et DIPLOMES_CHOICES/spécialité texte libre côté
diplômes/formations.

Fichiers attendus à la racine du projet (voir taftech_backend/../) :
    TAFTECH_Diplomes_Specialites_Algerie_v2.xlsx
    TAFTECH_Metiers_Matching_v2.xlsx

Ordre d'import strictement dérivé de l'onglet IMPORT de chaque classeur :
    Diplômes : TYPES_DIPLOMES / SCOLARITE / DOMAINES → FILIERES → SPECIALITES
               → DIPLOME_SPECIALITE → ALIAS_DIPLOMES → ALIAS_SPECIALITES
    Métiers  : GROUPES → METIERS (2 passes pour metier_canonique_id)
               → APPELLATIONS → COMPETENCES → ALIAS_COMPETENCES (fusionnées en
               CompetenceReferentiel.synonymes) → PROFILS_SUGGESTIONS
               → METIER_COMPETENCES → METIER_FORMATIONS (pont vers SPECIALITES,
               donc après import complet du fichier diplômes) → RELATIONS_METIERS
               → PARAM_MATCHING

SOURCES (IMPORT étape 19, `source_partagee`) est importée en premier, une seule
fois par classeur, upsert par `source_id` — identique dans les deux fichiers,
donc le second import met simplement à jour les mêmes lignes (aucun doublon).

Onglets volontairement NON importés comme tables opérationnelles (conformes aux
consignes client) : OFFRES_SOURCES, SOURCE_NAME, SOURCE_TAFTECH,
MIGRATION, RECETTE, SIMULATIONS, AUDIT, COUVERTURE, DICTIONNAIRE, IMPORT,
FORMULAIRE, REGLES_FORMATION, REGLES_MATCHING, LIRE_MOI, METIER_GROUPES
(redondant avec METIERS.groupe_principal_id pour cette v2).

Usage :
    python manage.py import_referentiel_v2 --dry-run
    python manage.py import_referentiel_v2
    python manage.py import_referentiel_v2 --diplomes chemin.xlsx --metiers chemin.xlsx
"""
import os

import openpyxl
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from jobs.models import (
    Source, Scolarite, TypeDiplome, DomaineFormation, FiliereFormation, SpecialiteFormation,
    DiplomeSpecialite, AliasDiplome, AliasSpecialite,
    GroupeMetier, Metier, Appellation, CompetenceReferentiel, ProfilSuggestion,
    MetierCompetence, MetierFormation, RelationMetier, ParametreMatching,
)

DEFAULT_DIPLOMES_FILE = 'TAFTECH_Diplomes_Specialites_Algerie_v2.xlsx'
DEFAULT_METIERS_FILE = 'TAFTECH_Metiers_Matching_v2.xlsx'


def _b(v):
    """Boolean(0|1) du fichier -> bool Python. Cellule vide = False."""
    if v is None or v == '':
        return False
    try:
        return bool(int(v))
    except (TypeError, ValueError):
        return str(v).strip().lower() in ('1', 'true', 'oui')


def _s(v):
    """string -> str propre, jamais None (les modèles utilisent blank=True, default='')."""
    if v is None:
        return ''
    return str(v).strip()


def _i(v):
    if v is None or v == '':
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _d(v):
    """date_iso_string(YYYY-MM-DD) -> date Python. openpyxl renvoie déjà un datetime/date pour
    une cellule formatée date ; on ne parse la chaîne qu'en repli (cellule en texte brut)."""
    if v is None or v == '':
        return None
    if hasattr(v, 'date'):
        return v.date()
    if hasattr(v, 'year'):
        return v
    try:
        from datetime import datetime
        return datetime.strptime(str(v).strip(), '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def sheet_rows(wb, sheet_name):
    """Génère un dict par ligne de données (ligne 1 = en-têtes), ignore les lignes vides."""
    ws = wb[sheet_name]
    rows = ws.iter_rows(values_only=True)
    headers = [str(h).strip() if h is not None else '' for h in next(rows)]
    for row in rows:
        if row is None or all(c is None for c in row):
            continue
        yield dict(zip(headers, row))


def sheet_rows_numerotees(wb, sheet_name):
    """Comme `sheet_rows`, mais avec le numéro de ligne réel du classeur (2 = première ligne
    de données, la ligne 1 étant les en-têtes) — réservé aux sheets où une erreur de clé
    étrangère doit être rapportée avec sa position exacte (RECETTE T17 : METIER_FORMATIONS)."""
    ws = wb[sheet_name]
    rows = ws.iter_rows(values_only=True)
    headers = [str(h).strip() if h is not None else '' for h in next(rows)]
    for i, row in enumerate(rows, start=2):
        if row is None or all(c is None for c in row):
            continue
        yield i, dict(zip(headers, row))


class Command(BaseCommand):
    help = "Importe le référentiel v2 (diplômes/spécialités + métiers/matching) fourni par le client."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="N'écrit rien, affiche seulement le rapport.")
        parser.add_argument('--diplomes', type=str, default=None, help="Chemin du classeur Diplômes/Spécialités.")
        parser.add_argument('--metiers', type=str, default=None, help="Chemin du classeur Métiers/Matching.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        base_dir = str(settings.BASE_DIR)  # taftech_backend/ — même emplacement que NAME.xlsx
        chemin_diplomes = options['diplomes'] or os.path.join(base_dir, DEFAULT_DIPLOMES_FILE)
        chemin_metiers = options['metiers'] or os.path.join(base_dir, DEFAULT_METIERS_FILE)

        for chemin in (chemin_diplomes, chemin_metiers):
            if not os.path.exists(chemin):
                self.stderr.write(self.style.ERROR(f"Fichier introuvable : {chemin}"))
                return

        self.compteurs = {}

        try:
            with transaction.atomic():
                wb_dip = openpyxl.load_workbook(chemin_diplomes, read_only=True, data_only=True)
                wb_met = openpyxl.load_workbook(chemin_metiers, read_only=True, data_only=True)

                self._import_sources(wb_dip, wb_met)
                self._import_diplomes(wb_dip)
                self._import_metiers(wb_met)

                if dry_run:
                    raise _DryRunRollback()
        except _DryRunRollback:
            pass

        self.stdout.write(self.style.SUCCESS(
            f"{'[DRY-RUN] ' if dry_run else ''}Import terminé — rien écrit en base." if dry_run
            else "Import terminé et validé."
        ))
        for label, n in self.compteurs.items():
            self.stdout.write(f"  {label:<28} {n}")

    # ------------------------------------------------------------------
    # SOURCES — table partagée par les deux classeurs (IMPORT étape 19)
    # ------------------------------------------------------------------
    def _import_sources(self, wb_dip, wb_met):
        n = 0
        n_doublons = 0
        codes_vus = set()
        for wb in (wb_dip, wb_met):
            for r in sheet_rows(wb, 'SOURCES'):
                code = _s(r['source_id'])
                if code in codes_vus:
                    n_doublons += 1
                else:
                    codes_vus.add(code)
                Source.objects.update_or_create(
                    code=code,
                    defaults=dict(
                        titre=_s(r['titre']),
                        nature=_s(r.get('nature')),
                        organisme=_s(r.get('organisme')),
                        fichier=_s(r.get('fichier')),
                        url=_s(r.get('url')),
                        edition_annee=_i(r.get('edition_annee')),
                        consulte_le=_d(r.get('consulte_le')),
                        sha256=_s(r.get('sha256')),
                        perimetre_limite=_s(r.get('perimetre_limite')),
                    ),
                )
                n += 1
        self.compteurs['Source'] = n
        self.compteurs['Source (déjà vue dans l\'autre classeur)'] = n_doublons

    # ------------------------------------------------------------------
    # Fichier Diplômes / Spécialités
    # ------------------------------------------------------------------
    def _import_diplomes(self, wb):
        n = 0
        for r in sheet_rows(wb, 'SCOLARITE'):
            Scolarite.objects.update_or_create(
                code=_s(r['niveau_etudes_id']),
                defaults=dict(
                    libelle=_s(r['libelle_fr']),
                    diplome_implique=_b(r['diplome_implique']),
                    usage=_s(r.get('usage')),
                ),
            )
            n += 1
        self.compteurs['Scolarite'] = n

        n = 0
        for r in sheet_rows(wb, 'TYPES_DIPLOMES'):
            TypeDiplome.objects.update_or_create(
                code=_s(r['diplome_id']),
                defaults=dict(
                    libelle=_s(r['libelle_fr']),
                    systeme=_s(r['systeme']),
                    cycle=_s(r.get('cycle')),
                    niveau_fp=_i(r.get('niveau_fp')),
                    statut_reference=_s(r.get('statut_reference')),
                    selectionnable=_b(r.get('selectionnable', 1)),
                    diplome_formel=_b(r.get('diplome_formel', 1)),
                    precision=_s(r.get('precision')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['TypeDiplome'] = n

        n = 0
        for r in sheet_rows(wb, 'DOMAINES'):
            DomaineFormation.objects.update_or_create(
                code=_s(r['domaine_id']),
                defaults=dict(
                    libelle=_s(r['libelle_fr']),
                    libelle_ar=_s(r.get('libelle_ar')),
                    systeme=_s(r['systeme']),
                    code_source=_s(r.get('code_source')),
                    source_id=_s(r.get('source_id')),
                    actif=_b(r.get('actif', 1)),
                ),
            )
            n += 1
        self.compteurs['DomaineFormation'] = n

        domaines = {d.code: d for d in DomaineFormation.objects.all()}

        n = 0
        for r in sheet_rows(wb, 'FILIERES'):
            domaine = domaines.get(_s(r['domaine_id']))
            if not domaine:
                self.stderr.write(self.style.WARNING(f"FILIERES {r['filiere_id']}: domaine {r['domaine_id']} introuvable, ignorée."))
                continue
            FiliereFormation.objects.update_or_create(
                code=_s(r['filiere_id']),
                defaults=dict(
                    domaine=domaine,
                    libelle=_s(r['libelle_fr']),
                    libelle_ar=_s(r.get('libelle_ar')),
                    cle_recherche=_s(r['cle_recherche']),
                    actif=_b(r.get('actif', 1)),
                ),
            )
            n += 1
        self.compteurs['FiliereFormation'] = n

        filieres = {f.code: f for f in FiliereFormation.objects.all()}

        n = 0
        for r in sheet_rows(wb, 'SPECIALITES'):
            domaine = domaines.get(_s(r['domaine_id']))
            if not domaine:
                self.stderr.write(self.style.WARNING(f"SPECIALITES {r['specialite_id']}: domaine {r['domaine_id']} introuvable, ignorée."))
                continue
            filiere_id = _s(r.get('filiere_id'))
            SpecialiteFormation.objects.update_or_create(
                code=_s(r['specialite_id']),
                defaults=dict(
                    domaine=domaine,
                    filiere=filieres.get(filiere_id) if filiere_id else None,
                    libelle=_s(r['libelle_fr']),
                    libelle_ar=_s(r.get('libelle_ar')),
                    cle_recherche=_s(r['cle_recherche']),
                    nature=_s(r.get('nature')),
                    code_source=_s(r.get('code_source')),
                    source_id=_s(r.get('source_id')),
                    page_pdf=_i(r.get('page_pdf')),
                    statut_reference=_s(r.get('statut_reference')),
                    selectionnable=_b(r.get('selectionnable', 1)),
                ),
            )
            n += 1
        self.compteurs['SpecialiteFormation'] = n

        diplomes = {d.code: d for d in TypeDiplome.objects.all()}
        specialites = {s.code: s for s in SpecialiteFormation.objects.all()}

        n = 0
        n_doublons = 0
        couples_vus = set()
        for r in sheet_rows(wb, 'DIPLOME_SPECIALITE'):
            diplome = diplomes.get(_s(r['diplome_id']))
            specialite = specialites.get(_s(r['specialite_id']))
            if not diplome or not specialite:
                self.stderr.write(self.style.WARNING(f"DIPLOME_SPECIALITE {r['lien_id']}: diplome/specialite introuvable, ignorée."))
                continue
            couple = (diplome.pk, specialite.pk)
            if couple in couples_vus:
                # Doublon documenté par le client (AUDIT/COUVERTURE) : plusieurs lien_id
                # peuvent pointer sur le même couple diplôme+spécialité (offres source
                # différentes) — dédupliqué pour les listes de sélection (contrat IMPORT §7).
                n_doublons += 1
                continue
            couples_vus.add(couple)
            DiplomeSpecialite.objects.update_or_create(
                diplome=diplome, specialite=specialite,
                defaults=dict(
                    code=_s(r['lien_id']),
                    statut=_s(r.get('statut')),
                    selectionnable=_b(r.get('selectionnable', 1)),
                    precision=_s(r.get('precision')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['DiplomeSpecialite'] = n
        self.compteurs['DiplomeSpecialite (doublons couple ignorés)'] = n_doublons

        n = 0
        for r in sheet_rows(wb, 'ALIAS_DIPLOMES'):
            diplome = diplomes.get(_s(r['diplome_id']))
            if not diplome:
                continue
            AliasDiplome.objects.update_or_create(
                code=_s(r['alias_id']),
                defaults=dict(
                    diplome=diplome,
                    libelle=_s(r['libelle']),
                    cle_recherche=_s(r['cle_recherche']),
                    langue=_s(r.get('langue')) or 'und',
                    ambiguite=_b(r.get('ambiguite')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['AliasDiplome'] = n

        n = 0
        for r in sheet_rows(wb, 'ALIAS_SPECIALITES'):
            specialite = specialites.get(_s(r['specialite_id']))
            if not specialite:
                continue
            AliasSpecialite.objects.update_or_create(
                code=_s(r['alias_id']),
                defaults=dict(
                    specialite=specialite,
                    libelle=_s(r['libelle']),
                    cle_recherche=_s(r['cle_recherche']),
                    langue=_s(r.get('langue')) or 'fr',
                    type_alias=_s(r.get('type_alias')),
                    contexte=_s(r.get('contexte')),
                    ambiguite=_b(r.get('ambiguite')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['AliasSpecialite'] = n

    # ------------------------------------------------------------------
    # Fichier Métiers / Matching
    # ------------------------------------------------------------------
    def _import_metiers(self, wb):
        # --- GROUPES : 2 passes pour parent_id (auto-référence) ---
        n = 0
        for r in sheet_rows(wb, 'GROUPES'):
            GroupeMetier.objects.update_or_create(
                code=_s(r['groupe_id']),
                defaults=dict(
                    type_groupe=_s(r['type_groupe']),
                    libelle=_s(r['libelle_fr']),
                    code_source=_s(r.get('code_source')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['GroupeMetier'] = n

        groupes = {g.code: g for g in GroupeMetier.objects.all()}
        for r in sheet_rows(wb, 'GROUPES'):
            parent_id = _s(r.get('parent_id'))
            if parent_id and parent_id in groupes:
                groupe = groupes[_s(r['groupe_id'])]
                if groupe.parent_id != groupes[parent_id].pk:
                    groupe.parent = groupes[parent_id]
                    groupe.save(update_fields=['parent'])

        # --- METIERS : 2 passes pour metier_canonique_id (auto-référence) ---
        n = 0
        for r in sheet_rows(wb, 'METIERS'):
            groupe = groupes.get(_s(r.get('groupe_principal_id')))
            Metier.objects.update_or_create(
                code=_s(r['metier_id']),
                defaults=dict(
                    libelle=_s(r['libelle_fr']),
                    cle_recherche=_s(r['cle_recherche']),
                    granularite=_s(r.get('granularite')) or 'metier',
                    groupe_principal=groupe,
                    code_source=_s(r.get('code_source')),
                    libelle_source=_s(r.get('libelle_source')),
                    source_id=_s(r.get('source_id')),
                    selectionnable=_b(r.get('selectionnable', 1)),
                    statut=_s(r.get('statut')) or 'actif',
                ),
            )
            n += 1
        self.compteurs['Metier'] = n

        metiers = {m.code: m for m in Metier.objects.all()}
        for r in sheet_rows(wb, 'METIERS'):
            canonique_code = _s(r.get('metier_canonique_id'))
            metier = metiers.get(_s(r['metier_id']))
            canonique = metiers.get(canonique_code)
            if metier and canonique and canonique.pk != metier.pk and metier.metier_canonique_id != canonique.pk:
                metier.metier_canonique = canonique
                metier.save(update_fields=['metier_canonique'])

        # --- APPELLATIONS ---
        n = 0
        for r in sheet_rows(wb, 'APPELLATIONS'):
            metier = metiers.get(_s(r['metier_id']))
            if not metier:
                continue
            Appellation.objects.update_or_create(
                code=_s(r['appellation_id']),
                defaults=dict(
                    metier=metier,
                    libelle=_s(r['libelle']),
                    cle_recherche=_s(r['cle_recherche']),
                    langue=_s(r.get('langue')) or 'fr',
                    type_alias=_s(r.get('type_alias')),
                    ambiguite=_b(r.get('ambiguite')),
                    actif=_b(r.get('actif', 1)),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['Appellation'] = n

        # --- COMPETENCES (fusionnées dans CompetenceReferentiel existant) ---
        # `label` a déjà une contrainte unique (admin, ~40 entrées avant cet import) : si le
        # libellé existe déjà, on rattache le code v2 à la ligne existante au lieu d'en créer
        # une seconde (évite un doublon "Python" / "Python" avec deux id différents).
        n_crees = 0
        n_rattaches = 0
        for r in sheet_rows(wb, 'COMPETENCES'):
            code = _s(r['competence_id'])
            label = _s(r['libelle_fr'])
            source_id = _s(r.get('source_id'))
            existant = CompetenceReferentiel.objects.filter(code=code).first()
            if not existant:
                existant = CompetenceReferentiel.objects.filter(label=label).first()
            if existant:
                existant.code = code
                existant.actif = _b(r.get('actif', 1))
                existant.source_id = source_id
                existant.save(update_fields=['code', 'actif', 'source_id'])
                n_rattaches += 1
            else:
                CompetenceReferentiel.objects.create(code=code, label=label, actif=_b(r.get('actif', 1)), source_id=source_id)
                n_crees += 1
        self.compteurs['CompetenceReferentiel (v2, créées)'] = n_crees
        self.compteurs['CompetenceReferentiel (v2, rattachées à une entrée existante)'] = n_rattaches

        competences_par_code = {c.code: c for c in CompetenceReferentiel.objects.exclude(code__isnull=True)}

        # --- ALIAS_COMPETENCES : fusionnés dans le champ synonymes existant (texte,
        # séparé par virgules) plutôt qu'une table dédiée — CompetenceReferentiel.synonymes
        # sert déjà exactement à ça pour cv_parser.py (normalisation), pas de nouveau modèle.
        alias_par_competence = {}
        for r in sheet_rows(wb, 'ALIAS_COMPETENCES'):
            code = _s(r['competence_id'])
            alias_par_competence.setdefault(code, []).append(_s(r['libelle']))
        n = 0
        for code, libelles in alias_par_competence.items():
            comp = competences_par_code.get(code)
            if not comp:
                continue
            existants = [s.strip() for s in comp.synonymes.split(',') if s.strip()] if comp.synonymes else []
            fusion = existants + [l for l in libelles if l not in existants and l != comp.label]
            nouveau = ', '.join(dict.fromkeys(fusion))  # dédoublonne en préservant l'ordre
            if nouveau != comp.synonymes:
                comp.synonymes = nouveau
                comp.save(update_fields=['synonymes'])
            n += 1
        self.compteurs['Alias fusionnés (synonymes)'] = n

        # --- PROFILS_SUGGESTIONS ---
        n = 0
        for r in sheet_rows(wb, 'PROFILS_SUGGESTIONS'):
            ProfilSuggestion.objects.update_or_create(
                code=_s(r['profil_suggestion_id']),
                defaults=dict(
                    contexte=_s(r['regle_intitule_contexte']),
                    nb_metiers=_i(r.get('nb_metiers')) or 0,
                    limite=_s(r.get('limite')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['ProfilSuggestion'] = n

        profils_suggestion = {p.code: p for p in ProfilSuggestion.objects.all()}

        # --- METIER_COMPETENCES ---
        n = 0
        n_doublons = 0
        couples_vus = set()
        for r in sheet_rows(wb, 'METIER_COMPETENCES'):
            metier = metiers.get(_s(r['metier_id']))
            competence = competences_par_code.get(_s(r['competence_id']))
            if not metier or not competence:
                continue
            couple = (metier.pk, competence.pk)
            if couple in couples_vus:
                n_doublons += 1
                continue
            couples_vus.add(couple)
            MetierCompetence.objects.update_or_create(
                metier=metier, competence=competence,
                defaults=dict(
                    code=_s(r['lien_id']),
                    profil_suggestion=profils_suggestion.get(_s(r.get('profil_suggestion_id'))),
                    usage=_s(r.get('usage')),
                    attribution_candidat_auto=_b(r.get('attribution_candidat_auto')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['MetierCompetence'] = n
        self.compteurs['MetierCompetence (doublons couple ignorés)'] = n_doublons

        # --- METIER_FORMATIONS (pont vers SPECIALITES du fichier diplômes) ---
        # RECETTE T17 : une ligne référençant un metier_id/specialite_id introuvable rejette
        # le lot ENTIER avant publication (erreur explicite + numéro de ligne), contrairement
        # aux autres sheets de liens (METIER_COMPETENCES, RELATIONS_METIERS) qui restent en
        # best-effort (ignorent silencieusement une ligne isolée) — comportement volontairement
        # différencié uniquement pour ce sheet, celui explicitement visé par le cas client.
        specialites = {s.code: s for s in SpecialiteFormation.objects.all()}
        n = 0
        n_doublons = 0
        couples_vus = set()
        for numero_ligne, r in sheet_rows_numerotees(wb, 'METIER_FORMATIONS'):
            metier = metiers.get(_s(r['metier_id']))
            specialite = specialites.get(_s(r['specialite_id']))
            if not metier or not specialite:
                champ = 'metier_id' if not metier else 'specialite_id'
                valeur = r.get('metier_id') if not metier else r.get('specialite_id')
                raise CommandError(
                    f"METIER_FORMATIONS ligne {numero_ligne} : {champ}={valeur!r} introuvable "
                    f"dans le référentiel déjà importé — lot rejeté avant publication (RECETTE T17)."
                )
            couple = (metier.pk, specialite.pk)
            if couple in couples_vus:
                n_doublons += 1
                continue
            couples_vus.add(couple)
            MetierFormation.objects.update_or_create(
                metier=metier, specialite=specialite,
                defaults=dict(
                    code=_s(r['lien_id']),
                    profil_suggestion=profils_suggestion.get(_s(r.get('profil_suggestion_id'))),
                    relation=_s(r.get('relation')),
                    usage_score_auto=_b(r.get('usage_score_auto')),
                    precision=_s(r.get('precision')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['MetierFormation'] = n
        self.compteurs['MetierFormation (doublons couple ignorés)'] = n_doublons

        # --- RELATIONS_METIERS ---
        n = 0
        for r in sheet_rows(wb, 'RELATIONS_METIERS'):
            depart = metiers.get(_s(r['metier_depart_id']))
            arrivee = metiers.get(_s(r['metier_arrivee_id']))
            if not depart or not arrivee:
                continue
            RelationMetier.objects.update_or_create(
                code=_s(r['relation_id']),
                defaults=dict(
                    metier_depart=depart,
                    metier_arrivee=arrivee,
                    relation=_s(r['relation']),
                    active_recherche=_b(r.get('active_recherche', 1)),
                    justification=_s(r.get('justification')),
                    source_id=_s(r.get('source_id')),
                ),
            )
            n += 1
        self.compteurs['RelationMetier'] = n

        # --- PARAM_MATCHING ---
        n = 0
        for r in sheet_rows(wb, 'PARAM_MATCHING'):
            ParametreMatching.objects.update_or_create(
                cle=_s(r['parametre']),
                defaults=dict(
                    valeur=_s(r['valeur']),
                    type_valeur=_s(r.get('type_valeur')),
                    usage=_s(r.get('usage')),
                    regle=_s(r.get('regle')),
                ),
            )
            n += 1
        self.compteurs['ParametreMatching'] = n


class _DryRunRollback(Exception):
    """Utilisée pour annuler la transaction en mode --dry-run sans lever d'erreur visible."""
    pass
