from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from accounts.authenticate import CustomJWTAuthentication

User = get_user_model()

class CustomJWTAuthenticationTest(TestCase):
    def setUp(self):
        """
        Préparation : création d'un faux système de requête HTTP et d'un utilisateur de test.
        """
        self.factory = RequestFactory()
        self.authenticator = CustomJWTAuthentication()
        
        self.user = User.objects.create_user(
            username="utilisateur_test",
            email="test_auth@taftech.dz", 
            password="password123",
            role="CANDIDAT"
        )
        
        self.token = AccessToken.for_user(self.user)
        self.token_string = str(self.token)

    def test_auth_avec_header(self):
        """ Test 1 : Le token est fourni proprement dans le Header HTTP """
        request = self.factory.get('/api/fake/', HTTP_AUTHORIZATION=f'Bearer {self.token_string}')
        result = self.authenticator.authenticate(request)
        
        self.assertIsNotNone(result)
        user_retourne, token_retourne = result
        self.assertEqual(user_retourne, self.user)

    def test_auth_avec_cookie(self):
        """ Test 2 : Pas de Header, le token est caché dans le Cookie (Spécialité TafTech) """
        request = self.factory.get('/api/fake/')
        request.COOKIES['accessToken'] = self.token_string
        result = self.authenticator.authenticate(request)
        
        self.assertIsNotNone(result)
        user_retourne, token_retourne = result
        self.assertEqual(user_retourne, self.user)

    def test_auth_sans_token(self):
        """ Test 3 : Un visiteur arrive sans aucun token """
        request = self.factory.get('/api/fake/')
        result = self.authenticator.authenticate(request)
        self.assertIsNone(result)

    def test_auth_token_invalide(self):
        """ Test 4 : Un pirate essaie de modifier le cookie avec un faux token """
        request = self.factory.get('/api/fake/')
        request.COOKIES['accessToken'] = "Ceci_est_un_faux_token_invalide"
        result = self.authenticator.authenticate(request)
        self.assertIsNone(result)