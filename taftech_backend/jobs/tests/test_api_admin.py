from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi

User = get_user_model()

class ApiAdminTest(APITestCase):

    def setUp(self):
        # 1. Création du Super Administrateur
        self.user_admin = User.objects.create_user(
            username="admin_boss", email="admin@taftech.dz", password="pwd", role="ADMIN", is_superuser=True, is_staff=True
        )
        
        # 2. Création d'un Recruteur normal (qui va essayer de tricher)
        self.user_rh = User.objects.create_user(username="rh_tricheur", email="rh@test.com", password="pwd", role="RECRUTEUR")
        
        # 3. Création d'une entreprise "En attente"
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.user_rh, nom_entreprise="Startup DZ", registre_commerce="RC123", est_approuvee=False
        )
        
        # 4. Création d'une offre "En attente"
        self.offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Graphiste", wilaya="16 - Alger", statut_moderation="EN_ATTENTE"
        )

    # =======================================================
    # TESTS DE MODÉRATION (ENTREPRISES ET OFFRES)
    # =======================================================
    def test_admin_approuve_entreprise_success(self):
        """ Happy Path : L'admin valide le registre de commerce """
        url = reverse('admin-entreprise-moderate', kwargs={'entreprise_id': self.entreprise.id})
        self.client.force_authenticate(user=self.user_admin)
        
        payload = {"est_approuvee": True}
        response = self.client.patch(url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.entreprise.refresh_from_db()
        self.assertTrue(self.entreprise.est_approuvee)

    def test_recruteur_ne_peut_pas_s_auto_approuver(self):
        """ Edge Case (CRITIQUE) : Un recruteur essaie de bypasser la modération """
        url = reverse('admin-entreprise-moderate', kwargs={'entreprise_id': self.entreprise.id})
        
        # On authentifie le RECRUTEUR au lieu de l'Admin !
        self.client.force_authenticate(user=self.user_rh)
        
        payload = {"est_approuvee": True}
        response = self.client.patch(url, payload)
        
        # Le système de permissions doit bloquer (403)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Vérification ultime en base : l'entreprise est toujours bloquée
        self.entreprise.refresh_from_db()
        self.assertFalse(self.entreprise.est_approuvee)

    def test_admin_approuve_offre_success(self):
        """ Happy Path : L'admin met une offre en ligne """
        url = reverse('admin-offre-moderate', kwargs={'offre_id': self.offre.id})
        self.client.force_authenticate(user=self.user_admin)
        
        payload = {"statut_moderation": "APPROUVEE"}
        response = self.client.patch(url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.offre.refresh_from_db()
        self.assertEqual(self.offre.statut_moderation, "APPROUVEE")

    # =======================================================
    # TESTS DES EXPORTS CSV
    # =======================================================
    def test_admin_export_utilisateurs_csv(self):
        """ Happy Path : L'admin télécharge la base de données CSV """
        url = reverse('admin-export-utilisateurs')
        self.client.force_authenticate(user=self.user_admin)
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # CORRECTION ICI : On précise le charset exact attendu pour la compatibilité Excel
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8-sig')
        # Vérifie que le fichier s'appelle bien "utilisateurs.csv" (ou contient 'attachment')
        self.assertIn('attachment', response['Content-Disposition'])

    def test_recruteur_export_csv_interdit(self):
        """ Edge Case : Blocage de fuite de données """
        url = reverse('admin-export-utilisateurs')
        self.client.force_authenticate(user=self.user_rh) # Un simple recruteur
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)