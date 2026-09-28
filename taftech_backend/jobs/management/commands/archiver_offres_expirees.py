from django.core.management.base import BaseCommand
from django.utils import timezone
from jobs.models import OffreEmploi


class Command(BaseCommand):
    help = "Clôture automatiquement les offres dont la date d'expiration est dépassée."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Affiche sans clôturer.")

    def handle(self, *args, **options):
        from jobs.views.equipe import _notifier_equipe

        dry_run = options['dry_run']
        today = timezone.now().date()
        offres = OffreEmploi.objects.select_related('entreprise').filter(
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
        # Boucle (pas de .update() en masse) — chaque offre notifie individuellement toute
        # l'équipe de son entreprise, ce qu'un update() bulk ne permet pas de déclencher.
        for offre in offres:
            offre.est_cloturee = True
            offre.date_cloture = timezone.now()
            offre.save(update_fields=['est_cloturee', 'date_cloture'])
            _notifier_equipe(
                offre.entreprise, 'OFFRE_EXPIREE',
                f"Offre expirée : {offre.titre}",
                f"Votre offre « {offre.titre} » a atteint sa date d'expiration et a été archivée automatiquement.",
                lien=f"/dashboard/offres/{offre.id}",
            )
        self.stdout.write(self.style.SUCCESS(f"{count} offre(s) clôturée(s) automatiquement."))
