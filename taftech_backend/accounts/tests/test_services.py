from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.services import UserService # On importe ton service

User = get_user_model()

# ==========================================
# 1. TEST UNITAIRE : LA COUCHE SERVICE
# ==========================================
class UserServiceTest(TestCase):
    
    def test_create_candidat_success(self):
        """ Vérifie que le service délègue bien la création et hash le mot de passe. """
        data = {
            "username": "candidat_service",
            "email": "candidat_service@test.com",
            "password": "Password123!",
            "nin": "123456789012345678",
            "consentement_loi_18_07": True
        }
        
        # On appelle ta fonction
        user = UserService.create_candidat(data)
        
        # On vérifie le résultat
        self.assertEqual(user.username, "candidat_service")
        self.assertEqual(user.role, "CANDIDAT")
        self.assertTrue(user.consentement_loi_18_07)
        
        # Sécurité : le mot de passe ne doit PAS être en clair dans la base de données
        self.assertNotEqual(user.password, "Password123!")
        self.assertTrue(user.check_password("Password123!"))