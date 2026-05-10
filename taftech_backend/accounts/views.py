import random
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.permissions import AllowAny
from .serializers import RegisterCandidatDTO, MyTokenObtainPairSerializer, EmailTokenObtainSerializer, RecruteurRegisterSerializer
from django.contrib.auth import get_user_model
from .models import SystemErrorLog
from rest_framework.permissions import IsAdminUser
from .serializers import SystemErrorLogSerializer

User = get_user_model()

class CandidatRegistrationAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        print("1. DONNÉES BRUTES DE REACT:", request.data) 
        
        dto = RegisterCandidatDTO(data=request.data)
        
        if dto.is_valid():
            print("2. DONNÉES VALIDÉES PAR LE DTO:", dto.validated_data)
            try:
                # 1. Le DTO crée l'utilisateur
                user = dto.save() 
                print(f"3. UTILISATEUR CRÉÉ: {user.email}, NIN: {user.nin}")
                
                # 2. On éteint manuellement les statuts juste après la création
                user.is_active = False 
                user.email_verifie = False
                
                # 3. On génère le code
                code = str(random.randint(100000, 999999))
                
                # 👇 HACK CYPRESS 👇 : OTP magique pour les tests E2E
                if user.email == "cypress@test.dz":
                    code = "111111"
                # 👆 FIN DU HACK 👆

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
    serializer_class = EmailTokenObtainSerializer

class RecruteurRegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RecruteurRegisterSerializer(data=request.data)
        if serializer.is_valid():
            # 1. On crée l'utilisateur (il est is_active=False grâce au serializer)
            user = serializer.save()
            
            # 2. On génère le code OTP
            code = str(random.randint(100000, 999999))
            
            # 👇 HACK CYPRESS 👇 : OTP magique pour les tests E2E
            if user.email == "cypress@test.dz":
                code = "111111"
            # 👆 FIN DU HACK 👆

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
                    "email": user.email
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
            print("🚨 VRAIE ERREUR DE LOGIN :", str(e))
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

class CookieTokenRefreshView(TokenRefreshView):
    serializer_class = MyTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
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

class ErrorReportAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            user = request.user if request.user.is_authenticated else None
            SystemErrorLog.objects.create(
                user=user,
                message=request.data.get('message', 'Erreur Inconnue'),
                details=request.data.get('details', 'N/A'),
                url=request.data.get('url', 'N/A'),
                user_agent=request.data.get('user_agent', 'N/A'),
                stack_trace=request.data.get('stack_trace', 'N/A')
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except:
            return Response(status=status.HTTP_204_NO_CONTENT)

class AdminSystemLogAPIView(APIView):
    permission_classes = [IsAdminUser] 

    def get(self, request):
        logs = SystemErrorLog.objects.all().order_by('-timestamp')
        serializer = SystemErrorLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)