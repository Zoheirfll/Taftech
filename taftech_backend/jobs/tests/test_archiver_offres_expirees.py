import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from jobs.models import ProfilEntreprise, OffreEmploi, Notification

User = get_user_model()


class ArchiverOffresExpireesTest(TestCase):
    def setUp(self):
        self.recruteur = User.objects.create_user(
            username="rec_archive", email="rec_archive@test.dz", password="Pass1234!", role="RECRUTEUR",
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.recruteur, nom_entreprise="ArchiveCo", secteur_activite="IT",
            registre_commerce="RC999", wilaya_siege="31 - Oran", est_approuvee=True,
        )
        self.offre_expiree = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre expirée", wilaya="31 - Oran",
            type_contrat="CDI", experience_requise="CONFIRME", statut_moderation="APPROUVEE",
            est_active=True, est_cloturee=False,
            date_expiration=timezone.now().date() - datetime.timedelta(days=5),
        )
        self.offre_valide = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre valide", wilaya="31 - Oran",
            type_contrat="CDI", experience_requise="CONFIRME", statut_moderation="APPROUVEE",
            est_active=True, est_cloturee=False,
            date_expiration=timezone.now().date() + datetime.timedelta(days=5),
        )

    def test_cloture_les_offres_expirees(self):
        call_command("archiver_offres_expirees")
        self.offre_expiree.refresh_from_db()
        self.offre_valide.refresh_from_db()
        self.assertTrue(self.offre_expiree.est_cloturee)
        self.assertIsNotNone(self.offre_expiree.date_cloture)
        self.assertFalse(self.offre_valide.est_cloturee)

    def test_notifie_le_proprietaire(self):
        call_command("archiver_offres_expirees")
        notif = Notification.objects.filter(destinataire=self.recruteur, type_notif="OFFRE_EXPIREE").first()
        self.assertIsNotNone(notif)
        self.assertIn("Offre expirée", notif.titre)
        self.assertIn("Offre expirée", notif.message)

    def test_dry_run_ne_modifie_rien(self):
        call_command("archiver_offres_expirees", "--dry-run")
        self.offre_expiree.refresh_from_db()
        self.assertFalse(self.offre_expiree.est_cloturee)
        self.assertEqual(Notification.objects.filter(type_notif="OFFRE_EXPIREE").count(), 0)

    def test_notification_visible_cote_portail_recruteur(self):
        call_command("archiver_offres_expirees")
        from jobs.views.notifications import _filtrer_par_portail
        qs = Notification.objects.filter(destinataire=self.recruteur)
        self.assertEqual(_filtrer_par_portail(qs, "recruteur").count(), 1)
        self.assertEqual(_filtrer_par_portail(qs, None).count(), 0)
