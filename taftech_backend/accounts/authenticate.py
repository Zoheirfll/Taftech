# accounts/authenticate.py
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

# Routes qui restent ouvertes à un recruteur dont l'entreprise n'est pas encore validée :
# connexion, profil (`me/` donne le statut à l'écran d'attente), déconnexion, mot de passe.
PREFIXE_ROUTES_COMPTE = "/api/accounts/"


def _entreprise_en_attente(user):
    """True pour un compte RECRUTEUR dont l'entreprise n'a pas été validée par TafTech."""
    if getattr(user, "role", None) != "RECRUTEUR":
        return False
    entreprise = getattr(user, "profil_entreprise", None)
    return entreprise is not None and not entreprise.est_approuvee


def _route_publique(request):
    """True si la vue visée n'exige aucune connexion (`AllowAny` ou liste vide) : le site
    public reste utilisable, même par un recruteur connecté en attente de validation."""
    vue = (getattr(request, "parser_context", None) or {}).get("view")
    classes = getattr(vue, "permission_classes", None)
    return classes is not None and all(c is AllowAny for c in classes)


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
            user = self.get_user(validated_token)
        except Exception:
            return None

        # 4. Entreprise non validée : aucune route métier, seulement le compte et le public.
        if (_entreprise_en_attente(user)
                and not request.path.startswith(PREFIXE_ROUTES_COMPTE)
                and not _route_publique(request)):
            raise PermissionDenied({
                "error": "Votre entreprise est en cours de validation par TafTech. "
                         "L'accès à l'espace recruteur sera ouvert dès son approbation.",
                "code": "ENTREPRISE_NON_VALIDEE",
            })
        return user, validated_token