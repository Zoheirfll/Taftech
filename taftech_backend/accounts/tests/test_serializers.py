from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError, AuthenticationFailed

# Imports de tes applications
from jobs.models import ProfilCandidat, ProfilEntreprise
from accounts.serializers import (
    RegisterCandidatDTO, 
    RecruteurRegisterSerializer, 
    EmailTokenObtainSerializer
)

User = get_user_model()

# ==========================================
# 1. TESTS DU SERIALIZER : INSCRIPTION CANDIDAT
# ==========================================
class CandidatSerializerTest(TestCase):
    def setUp(self):
        self.valid_data = {
            "username": "nouveau_candidat",
            "email": "candidat@test.com",
            "password": "Password123!",
            "first_name": "Ali",
            "last_name": "Taftech",
            "nin": "123456789012345678",
            "telephone": "0555000000",
            "consentement_loi_18_07": True,
            "wilaya": "16 - Alger"
        }

    def test_candidat_creation_success(self):
        """ Vérifie que le serializer crée bien le User (inactif) ET le ProfilCandidat. """
        serializer = RegisterCandidatDTO(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        user = serializer.save()
        
        # Vérifications de sécurité de base
        self.assertEqual(user.role, 'CANDIDAT')
        self.assertFalse(user.is_active) 
        
        # Vérification critique : le lien avec le module jobs (ProfilCandidat) s'est-il bien fait ?
        profil = ProfilCandidat.objects.get(user=user)
        self.assertEqual(profil.wilaya, "16 - Alger")

    def test_candidat_nin_invalid_length(self):
        """ Vérifie le rejet strict d'un NIN trop court. """
        invalid_data = self.valid_data.copy()
        invalid_data['nin'] = "123" # Seulement 3 chiffres au lieu de 18
        
        serializer = RegisterCandidatDTO(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('nin', serializer.errors)

    def test_candidat_missing_consent(self):
        """ Vérifie le rejet strict si la loi 18-07 n'est pas acceptée. """
        invalid_data = self.valid_data.copy()
        invalid_data['consentement_loi_18_07'] = False
        
        serializer = RegisterCandidatDTO(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('consentement_loi_18_07', serializer.errors)


# ==========================================
# 2. TESTS DU SERIALIZER : INSCRIPTION RECRUTEUR
# ==========================================
class RecruteurSerializerTest(TestCase):
    def setUp(self):
        self.valid_data = {
            "username": "nouveau_recruteur",
            "email": "rh@entreprise.com",
            "password": "Password123!",
            "first_name": "Samira",
            "last_name": "RH",
            "telephone": "0666000000",
            "nom_entreprise": "TechDz",
            "secteur_activite": "IT",
            "registre_commerce": "RC999888"
        }

    def test_recruteur_creation_success(self):
        """ Vérifie la création du User (verrouillé) ET du ProfilEntreprise. """
        serializer = RecruteurRegisterSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        user = serializer.save()
        
        self.assertEqual(user.role, 'RECRUTEUR')
        self.assertFalse(user.is_active) 
        self.assertFalse(user.email_verifie)
        
        # Vérification du ProfilEntreprise
        entreprise = ProfilEntreprise.objects.get(user=user)
        self.assertEqual(entreprise.nom_entreprise, "TechDz")
        self.assertEqual(entreprise.registre_commerce, "RC999888")
        self.assertFalse(entreprise.est_approuvee) # Sécurité : non approuvé par défaut


# ==========================================
# 3. TESTS DU SERIALIZER : AUTHENTIFICATION (JWT)
# ==========================================
class AuthSerializerTest(TestCase):
    def setUp(self):
        # Utilisateur légitime et actif
        self.active_user = User.objects.create_user(
            username="active_user",
            email="active@test.com",
            password="Password123!",
            is_active=True,
            email_verifie=True,
            role="CANDIDAT"
        )
        
        # Utilisateur qui n'a pas validé son email
        self.inactive_user = User.objects.create_user(
            username="inactive_user",
            email="inactive@test.com",
            password="Password123!",
            is_active=False
        )

    def test_token_active_user_success(self):
        """ Vérifie qu'un utilisateur actif obtient bien son token avec son rôle injecté. """
        data = {'username': self.active_user.email, 'password': 'Password123!'}
        
        serializer = EmailTokenObtainSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertIn('access', serializer.validated_data) 
        self.assertIn('role', serializer.validated_data) 
        self.assertEqual(serializer.validated_data['role'], 'CANDIDAT')

    def test_token_inactive_user_fails(self):
        """ Vérifie le blocage d'un utilisateur inactif lors de la demande de token. """
        data = {'username': self.inactive_user.email, 'password': 'Password123!'}
        
        serializer = EmailTokenObtainSerializer(data=data)
        
        # On intercepte explicitement l'erreur AuthenticationFailed
        with self.assertRaises(AuthenticationFailed):
            serializer.is_valid()