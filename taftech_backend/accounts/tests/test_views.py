from django.urls import reverse
from django.core import mail
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
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


class LoginLockoutTests(APITestCase):
    """Tests pour le verrouillage de compte après X tentatives échouées."""

    def setUp(self):
        self.login_url = reverse('token_obtain_pair')
        self.user = User.objects.create_user(
            username="lockout_user",
            email="lockout@taftech.dz",
            password="CorrectPassword123!",
            is_active=True,
            email_verifie=True,
            role="CANDIDAT",
        )

    def _try_login(self, password="WrongPassword!"):
        return self.client.post(self.login_url, {
            "username": "lockout@taftech.dz",
            "password": password,
        })

    def test_compteur_incremente_apres_echec(self):
        """Chaque mauvais mot de passe incrémente failed_login_attempts."""
        self._try_login()
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 1)

    def test_compte_verrouille_apres_5_echecs(self):
        """Au 5ème échec, le compte est verrouillé 15 min."""
        for _ in range(5):
            self._try_login()

        response = self._try_login()
        self.assertEqual(response.status_code, 401)
        self.assertIn("verrouillé", response.data['detail'])

    def test_login_reussi_reinitialise_compteur(self):
        """Un login réussi remet failed_login_attempts à 0."""
        self._try_login()
        self._try_login()
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 2)

        self._try_login(password="CorrectPassword123!")
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.locked_until)

    def test_compte_verrouille_bloque_meme_bon_mdp(self):
        """Un compte verrouillé est bloqué même avec le bon mot de passe."""
        self.user.locked_until = timezone.now() + timedelta(minutes=10)
        self.user.save()

        response = self._try_login(password="CorrectPassword123!")
        self.assertEqual(response.status_code, 401)
        self.assertIn("verrouillé", response.data['detail'])


class LogoutSecurityTests(APITestCase):
    """Tests pour la révocation du token au logout."""

    def setUp(self):
        self.logout_url = reverse('logout')
        self.login_url = reverse('token_obtain_pair')
        self.user = User.objects.create_user(
            username="logout_user",
            email="logout@taftech.dz",
            password="Password123!",
            is_active=True,
            email_verifie=True,
            role="CANDIDAT",
        )

    def test_logout_supprime_cookies(self):
        """Après logout, les cookies accessToken et refreshToken sont supprimés."""
        # Login pour obtenir les cookies
        self.client.post(self.login_url, {"username": "logout@taftech.dz", "password": "Password123!"})

        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, 200)

        # Les cookies doivent être vidés (max-age=0 ou expires dans le passé)
        access_cookie = response.cookies.get('accessToken')
        refresh_cookie = response.cookies.get('refreshToken')
        if access_cookie:
            self.assertTrue(
                access_cookie.get('max-age') == 0 or access_cookie.value == '',
                "accessToken doit être effacé"
            )
        if refresh_cookie:
            self.assertTrue(
                refresh_cookie.get('max-age') == 0 or refresh_cookie.value == '',
                "refreshToken doit être effacé"
            )

    def test_logout_sans_token_ne_crashe_pas(self):
        """Logout sans cookie → 200 propre (pas de crash)."""
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, 200)


class PasswordResetSecurityTests(APITestCase):
    """Tests pour la sécurité du reset de mot de passe (US8)."""

    def setUp(self):
        self.forgot_url = reverse('forgot-password')
        self.reset_url = reverse('reset-password')
        self.user = User.objects.create_user(
            username="reset_user",
            email="reset@taftech.dz",
            password="OldPassword123!",
            is_active=True,
            email_verifie=True,
            first_name="Reset",
        )

    # ==========================================
    # FORGOT PASSWORD
    # ==========================================

    def test_forgot_password_envoie_code(self):
        """Un email existant reçoit bien un code OTP."""
        response = self.client.post(self.forgot_url, {"email": "reset@taftech.dz"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.code_verification)
        self.assertIsNotNone(self.user.code_verification_created_at)

    def test_forgot_password_email_inconnu_ne_revele_pas(self):
        """Un email inexistant renvoie le même message (pas de fuite d'info)."""
        response = self.client.post(self.forgot_url, {"email": "inconnu@taftech.dz"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("Si cet email existe", response.data['message'])
        self.assertEqual(len(mail.outbox), 0)

    def test_forgot_password_email_vide_retourne_400(self):
        """Email vide → 400."""
        response = self.client.post(self.forgot_url, {"email": ""})
        self.assertEqual(response.status_code, 400)

    # ==========================================
    # RESET PASSWORD — Happy Paths
    # ==========================================

    def test_reset_password_succes(self):
        """Code valide + nouveau MDP → mot de passe changé, code effacé."""
        self.user.code_verification = "123456"
        self.user.code_verification_created_at = timezone.now()
        self.user.save()

        response = self.client.post(self.reset_url, {
            "email": "reset@taftech.dz",
            "code": "123456",
            "nouveau_mdp": "NewPassword123!"
        })
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassword123!"))
        self.assertIsNone(self.user.code_verification)
        self.assertIsNone(self.user.code_verification_created_at)

    # ==========================================
    # RESET PASSWORD — Edge Cases Sécurité
    # ==========================================

    def test_reset_password_code_expire_rejete(self):
        """Code créé il y a 11 minutes → rejeté comme expiré."""
        self.user.code_verification = "654321"
        self.user.code_verification_created_at = timezone.now() - timedelta(minutes=11)
        self.user.save()

        response = self.client.post(self.reset_url, {
            "email": "reset@taftech.dz",
            "code": "654321",
            "nouveau_mdp": "NewPassword123!"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("expiré", response.data['error'])

        # Code effacé même après expiry (nettoyage)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.code_verification)

    def test_reset_password_code_invalide_rejete(self):
        """Mauvais code → 400."""
        self.user.code_verification = "111111"
        self.user.code_verification_created_at = timezone.now()
        self.user.save()

        response = self.client.post(self.reset_url, {
            "email": "reset@taftech.dz",
            "code": "999999",
            "nouveau_mdp": "NewPassword123!"
        })
        self.assertEqual(response.status_code, 400)

    def test_reset_password_trop_court_rejete(self):
        """MDP < 8 caractères → 400."""
        self.user.code_verification = "111111"
        self.user.code_verification_created_at = timezone.now()
        self.user.save()

        response = self.client.post(self.reset_url, {
            "email": "reset@taftech.dz",
            "code": "111111",
            "nouveau_mdp": "short"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("8 caractères", response.data['error'])

    def test_reset_password_champs_manquants_rejete(self):
        """Champs manquants → 400."""
        response = self.client.post(self.reset_url, {"email": "reset@taftech.dz"})
        self.assertEqual(response.status_code, 400)

    def test_reset_password_code_usage_unique(self):
        """Un code utilisé une fois ne peut plus servir (code effacé)."""
        self.user.code_verification = "777777"
        self.user.code_verification_created_at = timezone.now()
        self.user.save()

        # Premier reset — succès
        self.client.post(self.reset_url, {
            "email": "reset@taftech.dz",
            "code": "777777",
            "nouveau_mdp": "FirstNewPass123!"
        })

        # Deuxième tentative avec le même code — doit échouer
        response = self.client.post(self.reset_url, {
            "email": "reset@taftech.dz",
            "code": "777777",
            "nouveau_mdp": "SecondNewPass123!"
        })
        self.assertEqual(response.status_code, 400)

    # ==========================================
    # VERIFY EMAIL — Expiry
    # ==========================================

    def test_verify_email_code_expire_rejete(self):
        """Code OTP créé il y a 11 minutes → rejeté comme expiré."""
        user = User.objects.create_user(
            username="expire_user",
            email="expire@taftech.dz",
            password="Pass123!",
            is_active=False,
            email_verifie=False,
            code_verification="555555",
            code_verification_created_at=timezone.now() - timedelta(minutes=11),
        )
        response = self.client.post(reverse('verifier_email'), {
            "email": "expire@taftech.dz",
            "code": "555555"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("expiré", response.data['error'])