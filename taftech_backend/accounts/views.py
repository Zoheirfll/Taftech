from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterCandidatDTO
from rest_framework_simplejwt.views import TokenObtainPairView # NOUVEAI
from .serializers import MyTokenObtainPairSerializer
from .serializers import RegisterCandidatDTO, EmailTokenObtainSerializer # NOUVEAU
from .services import UserService
from .serializers import RecruteurRegisterSerializer
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework_simplejwt.views import TokenRefreshView
import random
from django.core.mail import send_mail
from django.conf import settings
 
from django.contrib.auth import get_user_model
User = get_user_model()

class CandidatRegistrationAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        print("1. DONNÉES BRUTES DE REACT:", request.data) 
        
        dto = RegisterCandidatDTO(data=request.data)
        
        if dto.is_valid():
            print("2. DONNÉES VALIDÉES PAR LE DTO:", dto.validated_data)
            try:
                # 1. Le DTO crée l'utilisateur (Django le met 'Actif' par défaut)
                user = dto.save() 
                print(f"3. UTILISATEUR CRÉÉ: {user.email}, NIN: {user.nin}")
                
                # 👇 2. LE COUP DE MARTEAU EST ICI 👇
                # On éteint manuellement les statuts juste après la création
                user.is_active = False 
                user.email_verifie = False
                
                # 3. On génère le code
                code = str(random.randint(100000, 999999))
                user.code_verification = code
                
                # 4. On sauvegarde tout ça en base de données en une seule fois !
                user.save()

                sujet = "Bienvenue sur TafTech ! Votre code de vérification"
                message = f"Bonjour {user.first_name},\n\nVotre code de vérification est : {code}\n\nÀ très vite !"
                
                try:
                    send_mail(
                        sujet, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=False,
                    )
                    print("4. EMAIL ENVOYÉ AVEC SUCCÈS À", user.email)
                except Exception as e:
                    print(f"ERREUR CRITIQUE D'ENVOI D'EMAIL : {e}")

                return Response({
                    "message": "Candidat créé avec succès.",
                    "email": user.email, 
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


class VerifyEmailAPIView(APIView):
    """ Endpoint pour vérifier le code reçu par email """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        try:
            user = User.objects.get(email=email)
            
            if user.email_verifie:
                return Response({"message": "Ce compte est déjà vérifié."}, status=status.HTTP_200_OK)

            if user.code_verification == str(code):
                user.is_active = True
                user.email_verifie = True
                user.code_verification = None # On vide le code
                user.save()
                return Response({"message": "Email vérifié avec succès !"}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Le code de vérification est incorrect."}, status=status.HTTP_400_BAD_REQUEST)
                
        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)

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
            # 1. On crée l'utilisateur (il est is_active=False grâce au serializer)
            user = serializer.save()
            
            # 2. On génère le code OTP
            code = str(random.randint(100000, 999999))
            user.code_verification = code
            user.save()

            # 3. On prépare l'email
            sujet = "Bienvenue sur TafTech ! Vérifiez votre compte Entreprise"
            message = f"Bonjour {user.first_name},\n\nVotre demande de création de compte recruteur a bien été enregistrée.\n\nVotre code de vérification est : {code}\n\nUne fois votre email vérifié, notre équipe validera votre Registre de Commerce pour que vous puissiez publier des offres."
            
            # 4. On l'envoie
            try:
                send_mail(
                    sujet, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=False,
                )
                print("📧 EMAIL RECRUTEUR ENVOYÉ AVEC SUCCÈS À", user.email)
            except Exception as e:
                print(f"🚨 ERREUR CRITIQUE D'ENVOI D'EMAIL : {e}")

            return Response(
                {
                    "message": "Demande envoyée. Veuillez vérifier votre email avec le code à 6 chiffres.",
                    "email": user.email # Très important pour que React puisse afficher la page de validation OTP !
                }, 
                status=status.HTTP_201_CREATED
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CookieTokenObtainView(TokenObtainPairView):
    serializer_class = EmailTokenObtainSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # 👇 ESPIONNAGE ULTIME : ON AFFICHE LA VRAIE ERREUR 👇
            print("🚨 VRAIE ERREUR DE LOGIN :", str(e))
            
            # On renvoie la vraie erreur à React pour voir ce qui cloche
            return Response({"detail": str(e)}, status=401)

        data = serializer.validated_data
        response = Response({"role": data['role']}, status=status.HTTP_200_OK)

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
    serializer_class = MyTokenObtainPairSerializer
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