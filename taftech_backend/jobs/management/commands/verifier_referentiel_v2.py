"""
Gate "staging" pour le référentiel v2, en attendant qu'un vrai serveur/environnement de
recette existe (IMPORT étape 15 : "Importer en staging, exécuter les cas de recette,
comparer compteurs, publier atomiquement").

Sans serveur dédié, ce script joue ce rôle en local : il relance l'import en --dry-run
(rien n'est écrit, cf. import_referentiel_v2.py) et compare chaque compteur obtenu à la
dernière valeur connue et vérifiée manuellement (documentée dans CLAUDE.md, sessions
17/09-21/09/2026) — toute divergence est un signal fort que le client a modifié un des
deux classeurs (nouvelle ligne, code renommé, doublon en plus/en moins) et doit être
regardée avant tout merge vers `main` ou tout import réel en base.

Usage :
    python manage.py verifier_referentiel_v2
    python manage.py verifier_referentiel_v2 --diplomes chemin.xlsx --metiers chemin.xlsx

Sortie non nulle (échec) si au moins un compteur diverge — pensé pour être branché sur un
futur pipeline CI/CD une fois un serveur disponible, sans rien changer ici.
"""
from django.core.management.base import BaseCommand, CommandError

from jobs.management.commands.import_referentiel_v2 import Command as ImportCommand

# Dernières valeurs vérifiées manuellement contre les deux classeurs client
# (TAFTECH-2026.09.11-v2) — voir CLAUDE.md, sections "SESSION 17/09/2026" et
# "SESSION 21/09/2026 (suite)" pour le détail de chaque vérification exhaustive.
COMPTEURS_ATTENDUS = {
    'Source': 26,
    "Source (déjà vue dans l'autre classeur)": 13,
    'Scolarite': 7,
    'TypeDiplome': 37,
    'DomaineFormation': 58,
    'FiliereFormation': 64,
    # 967 lignes au classeur, dont 45 doublons consolidés (jobs/referentiel_fusions.py, 27/09/2026)
    'SpecialiteFormation': 922,
    'SpecialiteFormation (doublons fusionnés)': 45,
    'DiplomeSpecialite': 839,
    'DiplomeSpecialite (doublons couple ignorés)': 82,
    'AliasDiplome': 101,
    'AliasSpecialite': 1207,
    'GroupeMetier': 862,
    'Metier': 1038,
    'Appellation': 7428,
    'Alias fusionnés (synonymes)': 340,
    'ProfilSuggestion': 86,
    'MetierCompetence': 2792,
    'MetierCompetence (doublons couple ignorés)': 21,
    'MetierFormation': 1325,
    'MetierFormation (doublons couple ignorés)': 86,
    'RelationMetier': 49,
    'ParametreMatching': 11,
}

# CompetenceReferentiel : la répartition créées/rattachées dépend de l'état de la table
# AVANT l'import (une compétence déjà créée manuellement dans l'admin avec le même libellé
# est "rattachée", pas "créée") — pas purement dérivé du classeur, donc comparé par SOMME
# (340 = COMPETENCES.libelle_fr du classeur, quelle que soit la répartition locale) plutôt
# que par compteur individuel, pour ne pas déclencher un faux échec selon l'environnement.
GROUPES_SOMMES = [
    (
        ['CompetenceReferentiel (v2, créées)', "CompetenceReferentiel (v2, rattachées à une entrée existante)"],
        340,
    ),
]


class Command(BaseCommand):
    help = ("Vérifie que les deux classeurs référentiel v2 donnent toujours les mêmes compteurs "
            "qu'à la dernière vérification manuelle — gate 'staging' local, en attendant un serveur.")

    def add_arguments(self, parser):
        parser.add_argument('--diplomes', type=str, default=None, help="Chemin du classeur Diplômes/Spécialités.")
        parser.add_argument('--metiers', type=str, default=None, help="Chemin du classeur Métiers/Matching.")

    def handle(self, *args, **options):
        import_cmd = ImportCommand()
        import_cmd.stdout = self.stdout
        import_cmd.stderr = self.stderr
        import_cmd.style = self.style

        self.stdout.write("Import en --dry-run pour vérification des compteurs (rien n'est écrit en base)...\n")
        import_cmd.handle(dry_run=True, diplomes=options['diplomes'], metiers=options['metiers'])
        compteurs = import_cmd.compteurs

        anomalies = []

        for cle, attendu in COMPTEURS_ATTENDUS.items():
            obtenu = compteurs.get(cle)
            if obtenu is None:
                anomalies.append(f"  [X] {cle:<55} absent du rapport d'import (clé renommée/supprimée ?)")
            elif obtenu != attendu:
                anomalies.append(f"  [X] {cle:<55} attendu={attendu}  obtenu={obtenu}")

        for cles, attendu in GROUPES_SOMMES:
            somme = sum(compteurs.get(c) or 0 for c in cles)
            if somme != attendu:
                anomalies.append(f"  [X] {' + '.join(cles):<55} attendu={attendu}  obtenu={somme}")

        cles_inattendues = set(compteurs) - set(COMPTEURS_ATTENDUS) - {c for cles, _ in GROUPES_SOMMES for c in cles}
        for cle in sorted(cles_inattendues):
            self.stdout.write(self.style.WARNING(
                f"  [!] Nouveau compteur non couvert par ce gate : {cle} = {compteurs[cle]} "
                f"- ajouter une valeur attendue si c'est un onglet du référentiel."
            ))

        if anomalies:
            self.stdout.write(self.style.ERROR(
                f"\n{len(anomalies)} divergence(s) trouvée(s) — un des deux classeurs a changé "
                f"depuis la dernière vérification manuelle, à examiner avant merge/import réel :\n"
            ))
            for a in anomalies:
                self.stdout.write(self.style.ERROR(a))
            raise CommandError(f"{len(anomalies)} compteur(s) divergent du référentiel attendu.")

        self.stdout.write(self.style.SUCCESS(
            f"\nOK — les {len(COMPTEURS_ATTENDUS)} compteurs vérifiés correspondent exactement à la "
            f"dernière vérification manuelle."
        ))
