"""Applique `jobs/data/liens_competences_metiers.json` : liens compétence ↔ métiers validés à la main.

Idempotente, tout-ou-rien ; `--dry-run` liste les liens à créer sans rien écrire. À rejouer en production
après le déploiement et après chaque import du référentiel (voir `jobs/liens_competences_metiers.py`)."""
from django.core.management.base import BaseCommand, CommandError

from jobs.liens_competences_metiers import CHEMIN_LIENS, appliquer_liens


class Command(BaseCommand):
    help = "Lie des compétences à des métiers (liste validée jobs/data/liens_competences_metiers.json)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Rapport complet, rien n'est écrit.")
        parser.add_argument("--fichier", default=CHEMIN_LIENS, help="Fichier JSON des liens.")

    def handle(self, *args, **options):
        try:
            crees = appliquer_liens(self.stdout.write, options["fichier"], appliquer=not options["dry_run"])
        except ValueError as erreur:
            raise CommandError(str(erreur))
        if options["dry_run"]:
            self.stdout.write(f"DRY-RUN : {crees} lien(s) à créer, rien n'est écrit.")
        else:
            self.stdout.write(f"{crees} lien(s) créé(s).")
