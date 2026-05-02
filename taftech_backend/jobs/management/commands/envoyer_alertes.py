from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
# On ajoute Notification à l'import
from jobs.models import AlerteEmploi, OffreEmploi, Notification 

class Command(BaseCommand):
    help = "Scan les nouvelles offres et envoie les alertes (Email + Boîte de réception) aux candidats."

    def handle(self, *args, **kwargs):
        self.stdout.write("🤖 Lancement du robot d'alertes TafTech...")
        
        maintenant = timezone.now()
        hier = maintenant - timedelta(days=1)
        semaine_derniere = maintenant - timedelta(days=7)

        # 1. On récupère toutes les alertes activées
        alertes_actives = AlerteEmploi.objects.filter(est_active=True)
        total_notifs = 0
        emails_envoyes = 0

        for alerte in alertes_actives:
            # 2. On cible les offres approuvées et non clôturées
            offres = OffreEmploi.objects.filter(
                est_active=True, 
                statut_moderation='APPROUVEE', 
                est_cloturee=False
            )

            # 3. Filtre temporel selon la fréquence
            if alerte.frequence == 'QUOTIDIENNE':
                offres = offres.filter(date_publication__gte=hier)
            else: # HEBDOMADAIRE
                offres = offres.filter(date_publication__gte=semaine_derniere)

            # 4. Filtre géographique
            if alerte.wilaya:
                offres = offres.filter(wilaya=alerte.wilaya)

            # 5. Filtre par mots-clés
            if alerte.mots_cles:
                mots = alerte.mots_cles.split()
                query_mots_cles = Q()
                for mot in mots:
                    query_mots_cles |= Q(titre__icontains=mot) | Q(missions__icontains=mot)
                offres = offres.filter(query_mots_cles)

            # 6. ACTION s'il y a des nouvelles offres
            if offres.exists():
                candidat = alerte.candidat
                nb_offres = offres.count()
                titre_notif = f"🔔 {nb_offres} nouvelle(s) offre(s) pour '{alerte.mots_cles}'"

                # --- PARTIE A : CRÉATION DANS LA BOÎTE DE RÉCEPTION ---
                # On génère un court résumé pour la messagerie interne
                resume_interne = f"Bonne nouvelle ! Nous avons trouvé {nb_offres} offre(s) correspondant à vos critères '{alerte.mots_cles}'.\n\n"
                for o in offres[:3]: # On liste les 3 premières
                    resume_interne += f"• {o.titre} ({o.entreprise.nom_entreprise})\n"
                
                if nb_offres > 3:
                    resume_interne += f"... et {nb_offres - 3} autres opportunités à découvrir."

                try:
                    Notification.objects.create(
                        destinataire=candidat,
                        type_notif='ALERTE', # Assure-toi que 'ALERTE' existe dans tes choix de modèle Notification
                        titre=titre_notif,
                        message=resume_interne
                    )
                    total_notifs += 1
                except Exception as e:
                    self.stderr.write(f"⚠️ Erreur notification interne pour {candidat.email} : {e}")


                # --- PARTIE B : ENVOI DE L'EMAIL (Si autorisé par le candidat) ---
                if hasattr(candidat, 'profil_candidat') and candidat.profil_candidat.notif_newsletter:
                    
                    message_email = f"Bonjour {candidat.first_name},\n\n"
                    message_email += f"Voici les nouvelles offres correspondant à votre alerte : {alerte.mots_cles}\n\n"
                    
                    for offre in offres:
                        message_email += f"🔹 {offre.titre}\n"
                        message_email += f"🏢 Entreprise : {offre.entreprise.nom_entreprise}\n"
                        message_email += f"📍 Lieu : {offre.wilaya}\n"
                        message_email += f"👉 Voir l'offre : http://localhost:5173/offres/{offre.id}\n"
                        message_email += "-" * 40 + "\n"

                    message_email += "\nRetrouvez également ces alertes dans votre boîte de réception TafTech.\n"
                    message_email += "L'équipe TafTech."

                    try:
                        send_mail(
                            subject=titre_notif,
                            message=message_email,
                            from_email=settings.EMAIL_HOST_USER,
                            recipient_list=[candidat.email],
                            fail_silently=False
                        )
                        emails_envoyes += 1
                    except Exception as e:
                        self.stderr.write(self.style.ERROR(f"❌ Erreur email pour {candidat.email} : {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"🏁 Tâche terminée.\n"
            f"📥 Notifications créées : {total_notifs}\n"
            f"📧 Emails envoyés : {emails_envoyes}"
        ))