from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

# ==========================================
# 2. TESTS D'INTÉGRATION : LES ROUTES API
# ==========================================
class RegistrationAPIIntegrationTest(APITestCase):
    
    def test_register_candidat_api_success(self):
        """ Simule React envoyant un POST valide à l'URL /register/candidat/ """
        
        # On récupère l'URL grâce au 'name' défini dans ton urls.py
        url = reverse('register-candidat') 
        
        payload = {
            "username": "react_user",
            "email": "react@test.com",
            "password": "SuperPassword123!",
            "first_name": "Test",
            "last_name": "React",
            "nin": "111122223333444455",
            "telephone": "0555000000",
            "consentement_loi_18_07": True,
            "wilaya": "16 - Alger"
        }
        
        # On simule la requête HTTP
        response = self.client.post(url, payload)
        
        # On vérifie que le serveur répond bien avec un 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # On vérifie que l'utilisateur est bien arrivé dans la base de données !
        self.assertTrue(User.objects.filter(email="react@test.com").exists())

    def test_register_recruteur_api_success(self):
        """ Simule React envoyant un POST à /register/recruteur/ """
        url = reverse('register-recruteur')
        
        payload = {
            "username": "rh_react",
            "email": "rh_react@entreprise.com",
            "password": "SuperPassword123!",
            "first_name": "Boss",
            "last_name": "Boss",
            "telephone": "0666000000",
            "nom_entreprise": "React Corp",
            "secteur_activite": "IT",
            "registre_commerce": "RC123456"
        }
        
        response = self.client.post(url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="rh_react@entreprise.com").exists())