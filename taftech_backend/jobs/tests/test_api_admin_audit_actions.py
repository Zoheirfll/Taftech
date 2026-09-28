"""Journal d'audit — activation d'abonnement et suppression de compte admin (point 3
du suivi de session 28/09/2026 : ces deux actions existaient déjà mais étaient logguées
sous l'action générique 'AUTRE', désormais des actions dédiées 'ACTIVER_ABONNEMENT'/
'SUPPRIMER_ADMIN'). Aucun test ne couvrait ces deux vues avant ce fichier."""
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from jobs.models import (
    AuditLog, DemandeActivationPremium, Palier, ProfilEntreprise,
)

User = get_user_model()


class ActivationAbonnementAuditLogTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_activ', email='admin_activ@test.dz', password='pwd',
            role='ADMIN', is_staff=True,
        )
        self.recruteur = User.objects.create_user(
            username='rec_activ', email='rec_activ@test.dz', password='pwd', role='RECRUTEUR',
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.recruteur, nom_entreprise='ActivCo', secteur_activite='IT',
            wilaya_siege='16 - Alger', registre_commerce='RC-ACTIV-1',
        )
        # migration 0080 seed déjà les 4 paliers standard — récupérer, pas recréer
        self.palier, _ = Palier.objects.get_or_create(nom='BUSINESS')
        self.demande = DemandeActivationPremium.objects.create(
            entreprise=self.entreprise, moyen_paiement='CIB', nb_mois=3,
        )

    def test_activation_cree_un_audit_log_dedie(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-activer-premium', kwargs={'demande_id': self.demande.id})
        response = self.client.patch(url, {'nb_mois': 3, 'palier': 'BUSINESS'}, format='json')
        self.assertEqual(response.status_code, 200)
        log = AuditLog.objects.filter(action='ACTIVER_ABONNEMENT').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.admin_id, self.admin.id)
        self.assertIn('ActivCo', log.detail)

    def test_non_admin_refuse(self):
        self.client.force_authenticate(user=self.recruteur)
        url = reverse('admin-activer-premium', kwargs={'demande_id': self.demande.id})
        response = self.client.patch(url, {'nb_mois': 3}, format='json')
        self.assertEqual(response.status_code, 403)


class SuppressionCompteAdminAuditLogTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_supp', email='admin_supp@test.dz', password='pwd',
            role='ADMIN', is_staff=True,
        )
        self.autre_admin = User.objects.create_user(
            username='admin_cible', email='admin_cible@test.dz', password='pwd',
            role='ADMIN', is_staff=True,
        )

    def test_suppression_cree_un_audit_log_dedie(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-compte-admin-detail', kwargs={'admin_id': self.autre_admin.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(id=self.autre_admin.id).exists())
        log = AuditLog.objects.filter(action='SUPPRIMER_ADMIN').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.admin_id, self.admin.id)
        self.assertIn('admin_cible@test.dz', log.detail)

    def test_ne_peut_pas_se_supprimer_soi_meme(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-compte-admin-detail', kwargs={'admin_id': self.admin.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 400)
        self.assertTrue(User.objects.filter(id=self.admin.id).exists())

    def test_non_admin_refuse(self):
        candidat = User.objects.create_user(
            username='cand_supp', email='cand_supp@test.dz', password='pwd', role='CANDIDAT',
        )
        self.client.force_authenticate(user=candidat)
        url = reverse('admin-compte-admin-detail', kwargs={'admin_id': self.autre_admin.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 403)
