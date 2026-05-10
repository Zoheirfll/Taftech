from django.urls import reverse
from django.core import mail
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from jobs.models import ProfilCandidat, ProfilEntreprise

User = get_user_model()

class RegistrationAndAuthTests(APITestCase):

    def setUp(self):
        # URLs de ton accounts/urls.py
        self.register_candidat_url = reverse('register-candidat')
        self.register_recruteur_url = reverse('register-recruteur')
        self.verify_email_url = reverse('verifier_email')
        self.login_url = reverse('token_obtain_pair')

    # ==========================================
    # 1. TEST : INSCRIPTION CANDIDAT + OTP
    # ==========================================
    def test_candidat_registration_flow_and_email(self):
        """ Test complet : Inscription -> Envoi Email -> Vérification OTP """
        
        payload = {
            "username": "ali_tech",
            "email": "ali@taftech.dz",
            "password": "SecurePassword123!",
            "first_name": "Ali",
            "last_name": "Dz",
            "nin": "123456789012345678",
            "telephone": "0550112233",
            "consentement_loi_18_07": True,
            "wilaya": "31 - Oran"
        }

        # 1. Appel de l'API
        response = self.client.post(self.register_candidat_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 2. Vérification DB : User créé mais inactif
        user = User.objects.get(email="ali@taftech.dz")
        self.assertFalse(user.is_active)
        self.assertFalse(user.email_verifie)
        self.assertIsNotNone(user.code_verification)

        # 3. Vérification EMAIL : Django met l'email dans une boîte virtuelle (outbox)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(user.code_verification, mail.outbox[0].body)

        # 4. Vérification OTP : Le candidat tape son code
        otp_payload = {
            "email": user.email,
            "code": user.code_verification
        }
        verify_response = self.client.post(self.verify_email_url, otp_payload)
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        # 5. État final : User doit être actif
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.email_verifie)

    # ==========================================
    # 2. TEST : INSCRIPTION RECRUTEUR + PROFIL
    # ==========================================
    def test_recruteur_registration_creates_profile(self):
        """ Vérifie que l'inscription recruteur crée bien le profil entreprise en attente """
        
        payload = {
            "username": "rh_manager",
            "email": "contact@entreprise.dz",
            "password": "Password123!",
            "first_name": "Karim",
            "last_name": "Recruteur",
            "telephone": "0660445566",
            "nom_entreprise": "Sonatrach",
            "secteur_activite": "IT",
            "registre_commerce": "RC123456789"
        }

        response = self.client.post(self.register_recruteur_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Vérification du profil entreprise
        user = User.objects.get(email="contact@entreprise.dz")
        profil = ProfilEntreprise.objects.get(user=user)
        self.assertEqual(profil.nom_entreprise, "Sonatrach")
        self.assertFalse(profil.est_approuvee) # Doit attendre l'admin

    # ==========================================
    # 3. TEST : CONNEXION ET SÉCURITÉ COOKIES
    # ==========================================
    def test_login_sets_secure_cookies(self):
        """ Test critique : Vérifie que les tokens sont bien dans les cookies HttpOnly """
        
        # On crée un utilisateur déjà actif
        user = User.objects.create_user(
            username="testeur",
            email="testeur@taftech.dz",
            password="Password123!",
            is_active=True,
            email_verifie=True,
            role="CANDIDAT"
        )

        login_payload = {
            "username": "testeur@taftech.dz",
            "password": "Password123!"
        }

        response = self.client.post(self.login_url, login_payload)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérification de la présence des cookies
        self.assertIn('accessToken', response.cookies)
        self.assertIn('refreshToken', response.cookies)
        
        # SÉCURITÉ : Vérifie que HttpOnly est activé (protection contre le vol de session JS)
        self.assertTrue(response.cookies['accessToken']['httponly'])
        self.assertEqual(response.cookies['accessToken']['samesite'], 'Lax')

    def test_login_fails_for_unverified_email(self):
        """ Un utilisateur qui n'a pas validé son mail doit être rejeté au login """
        
        User.objects.create_user(
            username="non_valide",
            email="non_valide@test.dz",
            password="Password123!",
            is_active=False,
            email_verifie=False
        )

        login_payload = {
            "username": "non_valide@test.dz",
            "password": "Password123!"
        }

        response = self.client.post(self.login_url, login_payload)
        
        # Doit renvoyer 401 Unauthorized car EmailTokenObtainSerializer lève AuthenticationFailed
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("n'est pas activé", response.data['detail'])

    # ==========================================
    # 4. TEST : ÉCHECS OTP (MAUVAIS CODE)
    # ==========================================
    def test_verify_email_with_wrong_code(self):
        user = User.objects.create_user(
            username="ali_wrong",
            email="ali_wrong@taftech.dz",
            password="Password123!",
            code_verification="111111"
        )

        otp_payload = {
            "email": user.email,
            "code": "999999" # Mauvais code
        }
        
        response = self.client.post(self.verify_email_url, otp_payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], "Le code de vérification est incorrect.")