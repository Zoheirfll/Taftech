from django.core.management.base import BaseCommand
from django.utils import timezone
from jobs.models import OffreEmploi


class Command(BaseCommand):
    help = "Clôture automatiquement les offres dont la date d'expiration est dépassée."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Affiche sans clôturer.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = timezone.now().date()
        offres = OffreEmploi.objects.filter(
            date_expiration__lt=today,
            est_cloturee=False,
            est_active=True,
        )
        count = offres.count()
        if dry_run:
            self.stdout.write(f"[dry-run] {count} offre(s) seraient clôturées.")
            for o in offres:
                self.stdout.write(f"  - {o.titre} ({o.entreprise.nom_entreprise}) — expirée le {o.date_expiration}")
            return
        offres.update(est_cloturee=True)
        self.stdout.write(self.style.SUCCESS(f"{count} offre(s) clôturée(s) automatiquement."))
