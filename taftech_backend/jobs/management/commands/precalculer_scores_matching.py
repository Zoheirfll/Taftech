from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from jobs.matching_cache import scores_offres_actives_pour_candidat

User = get_user_model()

# Aligné sur relance_maj_cv.py : un candidat qui ne s'est pas connecté depuis 60 jours n'a
# aucune chance de consulter son dashboard dans les 10 prochaines minutes (TTL du cache) —
# le pré-chauffer pour lui serait du calcul jeté.
JOURS_INACTIVITE_MAX = 60


class Command(BaseCommand):
    help = (
        "Pré-calcule et met en cache le score de matching (dashboard candidat, Score de "
        "profil + Offres recommandées) pour les candidats actifs, pour que le dashboard "
        "se charge instantanément (cache déjà chaud) au lieu de scorer tout le catalogue "
        "d'offres à la demande."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Compte les candidats concernés sans recalculer/écrire le cache.",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("MODE DRY-RUN — aucun cache ne sera écrit."))

        limite = timezone.now() - timedelta(days=JOURS_INACTIVITE_MAX)
        candidats = User.objects.filter(
            role='CANDIDAT', profil_candidat__isnull=False, last_login__gte=limite,
        )

        total = candidats.count()
        traites = 0
        for user in candidats:
            if not dry_run:
                scores_offres_actives_pour_candidat(user, force=True)
            traites += 1

        prefix = "[DRY-RUN] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}{traites}/{total} candidats actifs (connectés < {JOURS_INACTIVITE_MAX}j) traités."
        ))
