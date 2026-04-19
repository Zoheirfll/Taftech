# accounts/authenticate.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

class CustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'accessToken')
        
        # 1. On tente de récupérer le token dans le header (Standard)
        header = self.get_header(request)
        raw_token = None
        
        if header is not None:
            raw_token = self.get_raw_token(header)
        
        # 2. Si pas de header, on fouille dans les cookies (Double vérification)
        if raw_token is None:
            # On check l'objet request de DRF puis l'objet Django natif
            raw_token = getattr(request, 'COOKIES', {}).get(cookie_name)
            if not raw_token and hasattr(request, '_request'):
                raw_token = request._request.COOKIES.get(cookie_name)

        if not raw_token:
            return None

        # 3. Validation du token sans crash
        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            return None