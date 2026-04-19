from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterCandidatDTO
from rest_framework_simplejwt.views import TokenObtainPairView # NOUVEAU
from .serializers import RegisterCandidatDTO, EmailTokenObtainSerializer # NOUVEAU
from .services import UserService
from .serializers import RecruteurRegisterSerializer
from rest_framework.permissions import AllowAny
from django.conf import settings
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework_simplejwt.views import TokenRefreshView

class CandidatRegistrationAPIView(APIView):
    def post(self, request):
        # --- ÉTAPE D'ESPIONNAGE ---
        print("1. DONNÉES BRUTES DE REACT:", request.data) 
        
        dto = RegisterCandidatDTO(data=request.data)
        
        if dto.is_valid():
            print("2. DONNÉES VALIDÉES PAR LE DTO:", dto.validated_data)
            try:
                user = UserService.create_candidat(dto.validated_data)
                print(f"3. UTILISATEUR CRÉÉ: {user.email}, NIN: {user.nin}")
                
                return Response({
                    "message": "Candidat créé avec succès.",
                    "user": {
                        "username": user.username,
                        "email": user.email,
                        "role": user.role
                    }
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                print("ERREUR SERVICE:", str(e))
                return Response(
                    {"error": "Une erreur serveur est survenue."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        print("ERREURS DTO:", dto.errors)
        return Response(dto.errors, status=status.HTTP_400_BAD_REQUEST)

class EmailTokenObtainView(TokenObtainPairView):
    """
    Endpoint (POST) pour la connexion par Email.
    Remplace la vue par défaut de SimpleJWT.
    """
    serializer_class = EmailTokenObtainSerializer

class RecruteurRegisterAPIView(APIView):
    """
    Endpoint (POST) pour l'inscription d'une Entreprise.
    URL prévue : /api/accounts/register/recruteur/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RecruteurRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": "Demande de création de compte entreprise envoyée. "
                               "Vous pourrez publier des offres une fois votre Registre de Commerce validé par nos équipes."
                }, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CookieTokenObtainView(TokenObtainPairView):
    serializer_class = EmailTokenObtainSerializer

    def post(self, request, *args, **kwargs):
        # On laisse le serializer valider l'email et le mot de passe
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response({"detail": "Email ou mot de passe incorrect"}, status=401)

        # Si valide, on récupère les tokens générés par le serializer
        data = serializer.validated_data
        response = Response({"role": data['role']}, status=status.HTTP_200_OK)

        # On dépose les cookies
        response.set_cookie(
            key=settings.SIMPLE_JWT['AUTH_COOKIE'],
            value=data['access'],
            httponly=True,
            samesite='Lax',
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        )
        response.set_cookie(
            key='refreshToken',
            value=data['refresh'],
            httponly=True,
            samesite='Lax',
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        )
        return response

# Dans accounts/views.py
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Sécurité : on cherche le cookie partout où il peut être
        refresh_token = getattr(request, 'COOKIES', {}).get('refreshToken')
        if not refresh_token and hasattr(request, '_request'):
            refresh_token = request._request.COOKIES.get('refreshToken')
        
        if refresh_token:
            request.data['refresh'] = refresh_token
            
        try:
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200:
                response.set_cookie(
                    key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                    value=response.data['access'],
                    httponly=True,
                    samesite='Lax',
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                )
                del response.data['access']
            return response
        except Exception as e:
            return Response({"detail": "Session expirée, veuillez vous reconnecter."}, status=401)