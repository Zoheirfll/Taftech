from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from jobs.models import CorrectionParsing, ParsingCV


class Command(BaseCommand):
    help = "Supprime les lignes du journal de qualité IA (parsing CV + corrections) de plus de N mois (12 par défaut)."

    def add_arguments(self, parser):
        parser.add_argument('--mois', type=int, default=12)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        limite = timezone.now() - timedelta(days=30 * options['mois'])
        parsings = ParsingCV.objects.filter(date__lt=limite)
        corrections = CorrectionParsing.objects.filter(date__lt=limite)
        self.stdout.write(f"{parsings.count()} parsing(s) et {corrections.count()} correction(s) antérieurs à {limite:%d/%m/%Y}.")
        if options['dry_run']:
            self.stdout.write("Dry-run : rien supprimé.")
            return
        corrections.delete()
        parsings.delete()
        self.stdout.write(self.style.SUCCESS("Purge terminée."))
