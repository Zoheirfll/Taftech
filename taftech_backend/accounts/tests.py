from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import CustomUser
from .services import UserService

# ==========================================
# 1. TESTS UNITAIRES (Couche Service)
# ==========================================
class UserServiceTest(TestCase):
    
    def test_create_candidat_success(self):
        """Vérifie que le service crée bien l'utilisateur et crypte le mot de passe."""
        data = {
            "username": "candidat1",
            "email": "candidat1@test.com",
            "password": "Password123!",
            "nin": "123456789012345678",
            "consentement_loi_18_07": True
        }
        
        user = UserService.create_candidat(data)
        
        # Assertions (Vérifications)
        self.assertEqual(user.username, "candidat1")
        self.assertEqual(user.role, "CANDIDAT")
        self.assertTrue(user.consentement_loi_18_07)
        # On vérifie que le mot de passe a bien été crypté (il ne doit pas être en clair)
        self.assertNotEqual(user.password, "Password123!")
        self.assertTrue(user.check_password("Password123!"))


# ==========================================
# 2. TESTS D'INTÉGRATION (Couche API / Controller)
# ==========================================
class CandidatRegistrationAPITest(APITestCase):
    
    def setUp(self):
        # L'URL qu'on a définie dans urls.py
        self.url = reverse('register-candidat')
        
    def test_registration_api_success(self):
        """Simule React envoyant des données valides."""
        payload = {
            "username": "react_user",
            "email": "react@test.com",
            "password": "SuperPassword123!",
            "nin": "111122223333444455",
            "consentement_loi_18_07": True
        }
        
        response = self.client.post(self.url, payload)
        
        # On attend un code 201 (Créé)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], "Candidat créé avec succès.")
        
    def test_registration_api_fails_without_consent(self):
        """Simule React essayant de tricher en n'acceptant pas la loi 18-07."""
        payload = {
            "username": "hacker_user",
            "email": "hacker@test.com",
            "password": "SuperPassword123!",
            "consentement_loi_18_07": False  # Refus de la loi
        }
        
        response = self.client.post(self.url, payload)
        
        # On attend un code 400 (Mauvaise requête) et un message d'erreur
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("consentement_loi_18_07", response.data)