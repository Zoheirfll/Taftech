from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi

User = get_user_model()

class PublicAndAdminListsTests(APITestCase):
    def setUp(self):
        # CORRECTION : Ajout des adresses emails pour l'unicité
        self.admin = User.objects.create_user(
            username="admin", email="admin_boss@test.com", role="ADMIN", is_staff=True, is_superuser=True
        )
        self.cand = User.objects.create_user(
            username="cand_1", email="candidat1@test.com", role="CANDIDAT", is_active=True
        )
        
        # Entreprise 1 (Approuvée)
        self.rh_approuve = User.objects.create_user(
            username="rh_ok", email="rh_ok@test.com", role="RECRUTEUR"
        )
        # CORRECTION : Ajout du Registre de Commerce (RC_OK)
        self.ent_approuvee = ProfilEntreprise.objects.create(
            user=self.rh_approuve, nom_entreprise="OK Corp", est_approuvee=True, registre_commerce="RC_OK"
        )
        
        # Entreprise 2 (En attente)
        self.rh_attente = User.objects.create_user(
            username="rh_wait", email="rh_wait@test.com", role="RECRUTEUR"
        )
        # CORRECTION : Ajout du Registre de Commerce (RC_WAIT)
        self.ent_attente = ProfilEntreprise.objects.create(
            user=self.rh_attente, nom_entreprise="Wait Corp", est_approuvee=False, registre_commerce="RC_WAIT"
        )
        
        # Offres
        OffreEmploi.objects.create(entreprise=self.ent_approuvee, titre="Offre Publique", est_active=True, statut_moderation='APPROUVEE')
        OffreEmploi.objects.create(entreprise=self.ent_approuvee, titre="Offre Secrète", est_active=True, statut_moderation='EN_ATTENTE')

    # =======================================================
    # TESTS DE L'ESPACE PUBLIC
    # =======================================================
    def test_constantes_format_react_select(self):
        """ US-PUB-03: Vérifie que les données sortent au format attendu par React sans connexion """
        url = reverse('api-constants')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # On vérifie la présence de la structure value/label dans la première wilaya
        self.assertIn('value', response.data['wilayas'][0])
        self.assertIn('label', response.data['wilayas'][0])

    def test_stats_publiques_filtrent_les_donnees(self):
        """ US-PUB-04 (EDGE CASE): L'accueil ne doit pas compter les offres/entreprises cachées """
        url = reverse('public-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Il y a 2 entreprises en DB, mais 1 seule approuvée
        self.assertEqual(response.data['total_entreprises'], 1)
        # Il y a 2 offres en DB, mais 1 seule approuvée
        self.assertEqual(response.data['total_offres'], 1)

    def test_entreprise_detail_bloque_entreprise_en_attente(self):
        """ US-PUB-05 (EDGE CASE): Impossible de voir la page d'une entreprise non validée """
        # Test Happy Path (OK Corp)
        url_ok = reverse('entreprise-detail-public', kwargs={'entreprise_id': self.ent_approuvee.id})
        res_ok = self.client.get(url_ok)
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        
        # Test Edge Case (Wait Corp)
        url_wait = reverse('entreprise-detail-public', kwargs={'entreprise_id': self.ent_attente.id})
        res_wait = self.client.get(url_wait)
        self.assertEqual(res_wait.status_code, status.HTTP_404_NOT_FOUND)

    # =======================================================
    # TESTS DE L'ESPACE ADMINISTRATEUR
    # =======================================================
    def test_admin_stats_sans_filtre(self):
        """ US-ADM-05: L'admin voit les vrais chiffres de la plateforme """
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # L'admin voit bien les 2 entreprises
        self.assertEqual(response.data['total_entreprises'], 2)
        # L'admin voit le compteur "en attente"
        self.assertEqual(response.data['entreprises_attente'], 1)

    def test_admin_listes_securite_acces(self):
        """ US-ADM-04 (EDGE CASE): Un recruteur tente de lister les utilisateurs """
        self.client.force_authenticate(user=self.rh_approuve) # <-- Token recruteur
        url = reverse('admin-users-list')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_bannir_utilisateur(self):
        """ US-ADM-06: Le bouton de modération inverse le statut is_active """
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-user-moderate', kwargs={'user_id': self.cand.id})
        
        # Le candidat est actif au départ
        self.assertTrue(self.cand.is_active)
        
        # 1er PATCH : Bannissement
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cand.refresh_from_db()
        self.assertFalse(self.cand.is_active) # Devenu inactif
        
        # 2ème PATCH : Débannissement
        self.client.patch(url)
        self.cand.refresh_from_db()
        self.assertTrue(self.cand.is_active) # Redevenu actif