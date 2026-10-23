"""Supprime les appellations en double dans un même métier (voir `jobs/doublons_appellations.py`).

`--dry-run` : rapport complet, rien n'est écrit. À rejouer après chaque `import_referentiel_v2`
(l'import recrée les lignes supprimées, comme pour les doublons de métiers)."""
from django.core.management.base import BaseCommand

from jobs.doublons_appellations import supprimer_doublons_appellations


class Command(BaseCommand):
    help = "Supprime les appellations en double dans un même métier (sauvegarde JSON avant, --dry-run disponible)."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Rapport seulement, rien n'est supprimé.")

    def handle(self, *args, **options):
        self.stdout.write("== Doublons d'appellations ==")
        supprimer_doublons_appellations(
            lambda ligne: self.stdout.write(ligne),
            sauvegarder=not options['dry_run'],
            appliquer=not options['dry_run'],
        )
        if options['dry_run']:
            self.stdout.write(self.style.WARNING("[DRY-RUN] Rien n'a été écrit."))
