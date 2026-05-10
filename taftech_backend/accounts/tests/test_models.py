from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomUserModelTest(TestCase):
    
    def test_create_user_defaults(self):
        """ Vérifie qu'un utilisateur basique reçoit bien les valeurs par défaut de TafTech. """
        user = User.objects.create_user(
            username="visiteur_simple",
            email="visiteur@taftech.dz",
            password="password123"
        )
        
        self.assertEqual(user.role, 'CANDIDAT')
        self.assertFalse(user.consentement_loi_18_07)
        self.assertFalse(user.email_verifie)
        self.assertIsNone(user.nin)

    def test_create_user_with_custom_fields(self):
        """ Vérifie que le modèle accepte et sauvegarde bien les champs spécifiques. """
        user = User.objects.create_user(
            username="recruteur_pro",
            email="rh@entreprise.dz",
            password="password123",
            role="RECRUTEUR",
            nin="123456789012345678",
            consentement_loi_18_07=True
        )
        
        self.assertEqual(user.role, 'RECRUTEUR')
        self.assertEqual(user.nin, "123456789012345678")
        self.assertTrue(user.consentement_loi_18_07)

    def test_user_string_representation(self):
        """ Vérifie que la fonction __str__ renvoie bien le bon format d'affichage. """
        user = User.objects.create_user(
            username="samira_dev",
            email="samira@taftech.dz",
            password="password123",
            role="CANDIDAT"
        )
        
        self.assertEqual(str(user), "samira_dev (Candidat)")