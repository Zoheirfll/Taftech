from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta
from jobs.models import ProfilCandidat

SITE_URL = getattr(settings, 'SITE_URL', 'http://localhost:5173')
JOURS_INACTIVITE = 60


class Command(BaseCommand):
    help = "Relance les candidats inactifs depuis 60 jours pour la mise à jour du CV."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Simule l'envoi sans envoyer d'emails.",
        )

    def handle(self, *args, **kwargs):
        dry_run = kwargs['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("MODE DRY-RUN — aucun email ne sera envoyé."))

        self.stdout.write("Lancement du robot de relance TafTech...")

        limite = timezone.now() - timedelta(days=JOURS_INACTIVITE)

        profils = ProfilCandidat.objects.filter(
            notif_mise_a_jour=True,
            user__last_login__lt=limite,
        ).select_related('user')

        emails_envoyes = 0

        for profil in profils:
            candidat = profil.user
            sujet = f"{candidat.first_name}, boostez votre visibilité sur TafTech !"
            ctx = {
                'prenom': candidat.first_name,
                'jours': JOURS_INACTIVITE,
                'lien_profil': f"{SITE_URL}/profil",
                'annee': timezone.now().year,
            }
            html_body = render_to_string('emails/relance_cv.html', ctx)
            message = (
                f"Bonjour {candidat.first_name},\n\n"
                f"Cela fait {JOURS_INACTIVITE} jours que nous ne vous avons pas vu sur TafTech.\n\n"
                f"Actualisez votre profil : {SITE_URL}/profil\n\n"
                f"L'équipe TafTech."
            )

            self.stdout.write(f"  → Relance : {candidat.email}")

            if not dry_run:
                try:
                    msg = EmailMultiAlternatives(sujet, message, settings.EMAIL_HOST_USER, [candidat.email])
                    msg.attach_alternative(html_body, 'text/html')
                    msg.send(fail_silently=False)
                    emails_envoyes += 1
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"Erreur envoi {candidat.email} : {e}"))
            else:
                self.stdout.write(f"  [dry-run] Email simulé pour {candidat.email}")

        self.stdout.write(self.style.SUCCESS(f"Terminé. {emails_envoyes} candidat(s) relancé(s)."))
