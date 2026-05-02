from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from jobs.models import ProfilCandidat

class Command(BaseCommand):
    help = "Relance les candidats inactifs depuis 60 jours pour la mise à jour du CV."

    def handle(self, *args, **kwargs):
        self.stdout.write("🤖 Lancement du robot de relance TafTech...")
        
        # 👇 MISE À JOUR : 60 jours au lieu de 90 👇
        limite_inactivite = timezone.now() - timedelta(days=60)

        # On cible uniquement ceux qui ont accepté les rappels et sont inactifs
        profils_a_relancer = ProfilCandidat.objects.filter(
            notif_mise_a_jour=True,
            user__last_login__lt=limite_inactivite
        )

        emails_envoyes = 0

        for profil in profils_a_relancer:
            candidat = profil.user
            # Un sujet plus accrocheur et pro
            sujet = f"🚀 {candidat.first_name}, boostez votre visibilité sur TafTech !"
            
            # Un message "parfait" : motivant, court et clair
            message = (
                f"Bonjour {candidat.first_name},\n\n"
                f"Cela fait 60 jours que nous ne vous avons pas vu sur TafTech. 🎯\n\n"
                f"Saviez-vous que les recruteurs consultent en priorité les profils mis à jour récemment ? "
                f"Un profil actualisé multiplie par 3 vos chances d'être contacté pour une opportunité.\n\n"
                f"Prenez 2 minutes pour rafraîchir votre CV ou vos compétences et restez en haut de la pile !\n\n"
                f"👉 Actualiser mon profil : http://localhost:5173/login\n\n"
                f"Bonne chance dans vos recherches,\n"
                f"L'équipe TafTech.\n\n"
                f"---\n"
                f"Vous recevez ce rappel car l'option est activée dans vos paramètres."
            )

            try:
                send_mail(
                    subject=sujet,
                    message=message,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[candidat.email],
                    fail_silently=False
                )
                emails_envoyes += 1
                self.stdout.write(self.style.SUCCESS(f"✅ Relance envoyée : {candidat.email}"))
            except Exception as e:
                self.stderr.write(f"❌ Erreur envoi {candidat.email} : {e}")

        self.stdout.write(self.style.SUCCESS(f"🏁 Terminé. {emails_envoyes} candidats relancés."))