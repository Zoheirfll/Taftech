from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import AuditLog

User = get_user_model()


class AuditLogTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='auditadmin', email='auditadmin@test.com', password='pass1234'
        )
        self.client.force_authenticate(user=self.admin)

    def test_audit_log_cree_lors_moderation_offre(self):
        from jobs.models import OffreEmploi, ProfilEntreprise
        recruteur = User.objects.create_user(
            username='rec_audit', email='rec_audit@test.com', password='pass', role='RECRUTEUR'
        )
        entreprise = ProfilEntreprise.objects.create(user=recruteur, nom_entreprise='TestCo', registre_commerce='RC123')
        offre = OffreEmploi.objects.create(
            entreprise=entreprise, titre='Dev', wilaya='Alger', diplome='LICENCE',
            specialite='Informatique', missions='Dev', profil_recherche='Dev',
            type_contrat='CDI', experience_requise='JUNIOR'
        )
        url = reverse('admin-offre-moderer', kwargs={'offre_id': offre.id})
        self.client.patch(url, {'statut_moderation': 'APPROUVEE'}, format='json')
        self.assertEqual(AuditLog.objects.filter(action='APPROUVER_OFFRE').count(), 1)

    def test_liste_audit_logs_accessible_admin(self):
        AuditLog.objects.create(admin=self.admin, action='AUTRE', detail='test')
        url = reverse('admin-audit-logs')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)

    def test_liste_audit_logs_refuse_non_admin(self):
        candidat = User.objects.create_user(
            username='cand_audit', email='cand_audit@test.com', password='pass', role='CANDIDAT'
        )
        self.client.force_authenticate(user=candidat)
        url = reverse('admin-audit-logs')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)
