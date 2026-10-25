"""Crée les relations « similaire » de `jobs/data/relations_metiers_similaires.json` (paires validées à la
main, voir `jobs/relations_metiers_similaires.py`). `--dry-run` : rapport seulement. Idempotente."""
from django.core.management.base import BaseCommand

from jobs.relations_metiers_similaires import appliquer_relations_similaires


class Command(BaseCommand):
    help = "Crée les relations de similarité entre métiers de la liste validée (--dry-run disponible)."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Rapport seulement, rien n'est écrit.")

    def handle(self, *args, **options):
        self.stdout.write("== Relations de similarité entre métiers ==")
        appliquer_relations_similaires(lambda ligne: self.stdout.write(ligne), appliquer=not options['dry_run'])
        if options['dry_run']:
            self.stdout.write(self.style.WARNING("[DRY-RUN] Rien n'a été écrit."))
