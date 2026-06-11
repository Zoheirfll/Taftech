from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.db.models import Q
from datetime import timedelta
from jobs.models import AlerteEmploi, OffreEmploi, Notification

SITE_URL = getattr(settings, 'SITE_URL', 'http://localhost:5173')


class Command(BaseCommand):
    help = "Scan les nouvelles offres et envoie les alertes (Email + Boîte de réception) aux candidats."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Simule l'envoi sans créer de notifications ni envoyer d'emails.",
        )

    def handle(self, *args, **kwargs):
        dry_run = kwargs['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("MODE DRY-RUN — aucun email ni notification ne sera envoyé."))

        self.stdout.write("Lancement du robot d'alertes TafTech...")

        maintenant = timezone.now()
        hier = maintenant - timedelta(days=1)
        semaine_derniere = maintenant - timedelta(days=7)

        alertes_actives = AlerteEmploi.objects.filter(est_active=True).select_related('candidat', 'candidat__profil_candidat')
        total_notifs = 0
        emails_envoyes = 0

        for alerte in alertes_actives:
            # Offres approuvées, actives, non clôturées
            offres = OffreEmploi.objects.filter(
                est_active=True,
                statut_moderation='APPROUVEE',
                est_cloturee=False,
            ).select_related('entreprise')

            # Filtre temporel
            if alerte.frequence == 'QUOTIDIENNE':
                offres = offres.filter(date_publication__gte=hier)
            else:
                offres = offres.filter(date_publication__gte=semaine_derniere)

            # Filtre géographique
            if alerte.wilaya:
                offres = offres.filter(wilaya=alerte.wilaya)

            # Filtre mots-clés
            if alerte.mots_cles:
                query = Q()
                for mot in alerte.mots_cles.split():
                    query |= Q(titre__icontains=mot) | Q(missions__icontains=mot)
                offres = offres.filter(query)

            if not offres.exists():
                continue

            candidat = alerte.candidat
            nb_offres = offres.count()
            titre_notif = f"{nb_offres} nouvelle(s) offre(s) pour '{alerte.mots_cles}'"

            # Résumé pour la boîte de réception
            resume = f"Bonne nouvelle ! Nous avons trouvé {nb_offres} offre(s) correspondant à vos critères '{alerte.mots_cles}'.\n\n"
            for o in offres[:3]:
                resume += f"- {o.titre} ({o.entreprise.nom_entreprise})\n"
            if nb_offres > 3:
                resume += f"... et {nb_offres - 3} autres opportunités à découvrir sur TafTech."

            self.stdout.write(f"  → {candidat.email} : {nb_offres} offre(s) trouvée(s)")

            if not dry_run:
                try:
                    Notification.objects.create(
                        destinataire=candidat,
                        type_notif='ALERTE',
                        titre=titre_notif,
                        message=resume,
                    )
                    total_notifs += 1
                except Exception as e:
                    self.stderr.write(f"Erreur notification interne pour {candidat.email} : {e}")

            # Email si le candidat a activé les newsletters
            if not hasattr(candidat, 'profil_candidat') or not candidat.profil_candidat.notif_newsletter:
                continue

            offres_ctx = [
                {'titre': o.titre, 'entreprise': o.entreprise.nom_entreprise, 'wilaya': o.wilaya, 'lien': f"{SITE_URL}/offres/{o.id}"}
                for o in offres[:5]
            ]
            ctx = {
                'prenom': candidat.first_name,
                'mots_cles': alerte.mots_cles,
                'nb_offres': nb_offres,
                'offres': offres_ctx,
                'nb_restantes': max(0, nb_offres - 5),
                'annee': timezone.now().year,
            }
            html_body = render_to_string('emails/alerte_emploi.html', ctx)
            texte = f"Bonjour {candidat.first_name},\n\n{nb_offres} offre(s) correspondent à votre alerte « {alerte.mots_cles} ».\n\nL'équipe TafTech."

            if not dry_run:
                try:
                    msg = EmailMultiAlternatives(
                        f"[TafTech] {titre_notif}",
                        texte,
                        settings.EMAIL_HOST_USER,
                        [candidat.email],
                    )
                    msg.attach_alternative(html_body, 'text/html')
                    msg.send(fail_silently=False)
                    emails_envoyes += 1
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"Erreur email pour {candidat.email} : {e}"))
            else:
                self.stdout.write(f"  [dry-run] Email simulé pour {candidat.email}")

        self.stdout.write(self.style.SUCCESS(
            f"Tâche terminée.\n"
            f"  Notifications créées : {total_notifs}\n"
            f"  Emails envoyés      : {emails_envoyes}"
        ))
