import random
import logging
from django.contrib.auth import authenticate
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle


class CypressAwareThrottle(AnonRateThrottle):
    """En mode DEBUG, désactive le throttle pour 127.0.0.1 (Cypress)."""
    def allow_request(self, request, view):
        if settings.DEBUG:
            ip = request.META.get('REMOTE_ADDR', '')
            if ip in ('127.0.0.1', '::1'):
                return True
        return super().allow_request(request, view)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.permissions import AllowAny
from .serializers import RegisterCandidatDTO, MyTokenObtainPairSerializer, EmailTokenObtainSerializer, RecruteurRegisterSerializer
from django.contrib.auth import get_user_model
from .models import SystemErrorLog
from rest_framework.permissions import IsAdminUser
from .serializers import SystemErrorLogSerializer
from datetime import timedelta

logger = logging.getLogger(__name__)
User = get_user_model()

RESET_CODE_EXPIRY_MINUTES = 10


def _generate_otp(user):
    """Génère un OTP 6 chiffres. En mode DEBUG uniquement, email cypress utilise 111111."""
    code = str(random.randint(100000, 999999))
    if settings.DEBUG and user.email == "cypress@test.dz":
        code = "111111"
    return code


class CandidatRegistrationAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CypressAwareThrottle]

    def post(self, request):
        dto = RegisterCandidatDTO(data=request.data)

        if dto.is_valid():
            try:
                user = dto.save()
                user.is_active = False
                user.email_verifie = False

                code = _generate_otp(user)
                user.code_verification = code
                user.code_verification_created_at = timezone.now()
                user.save()

                sujet = "Bienvenue sur TafTech ! Votre code de vérification"
                ctx = {'prenom': user.first_name, 'code': code, 'est_recruteur': False, 'annee': timezone.now().year}
                html_body = render_to_string('emails/verification_code.html', ctx)
                texte = f"Bonjour {user.first_name},\n\nVotre code de vérification est : {code}\n\nÀ très vite !"
                try:
                    msg = EmailMultiAlternatives(sujet, texte, settings.EMAIL_HOST_USER, [user.email])
                    msg.attach_alternative(html_body, 'text/html')
                    msg.send(fail_silently=False)
                except Exception as e:
                    logger.error("Erreur envoi email inscription: %s", e)

                return Response({
                    "message": "Candidat créé avec succès.",
                    "email": user.email,
                    "user": {"username": user.username, "email": user.email, "role": user.role}
                }, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.exception("Erreur création candidat")
                return Response({"error": "Une erreur serveur est survenue."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(dto.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CypressAwareThrottle]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        try:
            user = User.objects.get(email=email)

            if user.email_verifie:
                return Response({"message": "Ce compte est déjà vérifié."}, status=status.HTTP_200_OK)

            if user.code_verification != str(code):
                return Response({"error": "Le code de vérification est incorrect."}, status=status.HTTP_400_BAD_REQUEST)

            # Vérification expiry (10 min)
            if user.code_verification_created_at:
                expiry = user.code_verification_created_at + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES)
                if timezone.now() > expiry:
                    return Response({"error": "Le code a expiré. Veuillez en demander un nouveau."}, status=status.HTTP_400_BAD_REQUEST)

            user.is_active = True
            user.email_verifie = True
            user.code_verification = None
            user.code_verification_created_at = None
            user.save()
            return Response({"message": "Email vérifié avec succès !"}, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)


class EmailTokenObtainView(TokenObtainPairView):
    serializer_class = EmailTokenObtainSerializer


class RecruteurRegisterAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CypressAwareThrottle]

    def post(self, request):
        serializer = RecruteurRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            code = _generate_otp(user)
            user.code_verification = code
            user.code_verification_created_at = timezone.now()
            user.save()

            sujet = "Bienvenue sur TafTech ! Vérifiez votre compte Entreprise"
            ctx = {'prenom': user.first_name, 'code': code, 'est_recruteur': True, 'annee': timezone.now().year}
            html_body = render_to_string('emails/verification_code.html', ctx)
            texte = (
                f"Bonjour {user.first_name},\n\n"
                f"Votre code de vérification est : {code}\n\n"
                "Une fois votre email vérifié, notre équipe validera votre Registre de Commerce."
            )
            try:
                msg = EmailMultiAlternatives(sujet, texte, settings.EMAIL_HOST_USER, [user.email])
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=False)
            except Exception as e:
                logger.error("Erreur envoi email recruteur: %s", e)

            return Response(
                {"message": "Demande envoyée. Veuillez vérifier votre email avec le code à 6 chiffres.", "email": user.email},
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CookieTokenObtainView(TokenObtainPairView):
    serializer_class = EmailTokenObtainSerializer
    throttle_classes = [CypressAwareThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response({"detail": str(e)}, status=401)

        data = serializer.validated_data

        try:
            email = request.data.get('email') or request.data.get('username')
            user_obj = User.objects.get(email=email)
            user_obj.last_login = timezone.now()
            user_obj.save(update_fields=['last_login'])
        except Exception:
            pass

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
        except Exception:
            return Response({"detail": "Session expirée, veuillez vous reconnecter."}, status=401)


class LogoutAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refreshToken')
        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # Token déjà expiré ou invalide — on nettoie quand même les cookies

        response = Response({"message": "Déconnexion réussie."}, status=status.HTTP_200_OK)
        response.delete_cookie('accessToken')
        response.delete_cookie('refreshToken')
        return response


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
        except Exception:
            return Response(status=status.HTTP_204_NO_CONTENT)


class AdminSystemLogAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        logs = SystemErrorLog.objects.all().order_by('-timestamp')
        serializer = SystemErrorLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ForgotPasswordAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CypressAwareThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'error': 'Email obligatoire.'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'message': 'Si cet email existe, un code a été envoyé.'}, status=200)

        code = str(random.randint(100000, 999999))
        user.code_verification = code
        user.code_verification_created_at = timezone.now()
        user.save(update_fields=['code_verification', 'code_verification_created_at'])

        try:
            ctx = {'prenom': user.first_name, 'code': code, 'annee': timezone.now().year}
            html_body = render_to_string('emails/reset_password.html', ctx)
            texte = f"Bonjour {user.first_name},\n\nVotre code de réinitialisation est : {code}\n\nCe code est valable 10 minutes.\n\nL'équipe TafTech."
            msg = EmailMultiAlternatives(
                "Réinitialisation de votre mot de passe TafTech",
                texte,
                settings.EMAIL_HOST_USER,
                [user.email],
            )
            msg.attach_alternative(html_body, 'text/html')
            msg.send(fail_silently=False)
        except Exception as e:
            logger.error("Erreur envoi email reset password: %s", e)
            return Response({'error': "Erreur lors de l'envoi de l'email."}, status=500)

        return Response({'message': 'Si cet email existe, un code a été envoyé.'}, status=200)


class ResetPasswordAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CypressAwareThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip()
        code = request.data.get('code', '').strip()
        nouveau_mdp = request.data.get('nouveau_mdp', '').strip()

        if not email or not code or not nouveau_mdp:
            return Response({'error': 'Email, code et nouveau mot de passe obligatoires.'}, status=400)

        if len(nouveau_mdp) < 8:
            return Response({'error': 'Le mot de passe doit contenir au moins 8 caractères.'}, status=400)

        try:
            user = User.objects.get(email=email, code_verification=code)
        except User.DoesNotExist:
            return Response({'error': 'Code invalide ou expiré.'}, status=400)

        # Vérification expiry (10 min)
        if user.code_verification_created_at:
            expiry = user.code_verification_created_at + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES)
            if timezone.now() > expiry:
                user.code_verification = None
                user.code_verification_created_at = None
                user.save(update_fields=['code_verification', 'code_verification_created_at'])
                return Response({'error': 'Code invalide ou expiré.'}, status=400)

        user.set_password(nouveau_mdp)
        user.code_verification = None
        user.code_verification_created_at = None
        user.save()

        return Response({'message': 'Mot de passe réinitialisé avec succès !'}, status=200)


class GoogleSocialAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get('credential')
        role = request.data.get('role', 'CANDIDAT')

        if not credential:
            return Response({'error': 'Token Google manquant.'}, status=400)

        if role not in ('CANDIDAT', 'RECRUTEUR'):
            return Response({'error': 'Rôle invalide.'}, status=400)

        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            client_id = settings.GOOGLE_CLIENT_ID
            id_info = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
        except Exception as e:
            logger.warning("Échec vérification token Google: %s", e)
            return Response({'error': 'Token Google invalide.'}, status=400)

        email = id_info.get('email')
        first_name = id_info.get('given_name', '')
        last_name = id_info.get('family_name', '')

        if not email:
            return Response({'error': 'Email non fourni par Google.'}, status=400)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': first_name,
                'last_name': last_name,
                'role': role,
                'email_verifie': True,
                'is_active': True,
                'consentement_loi_18_07': True,
            }
        )

        if not created:
            # Utilisateur existant — on met à jour last_login
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role

        response = Response({'role': user.role}, status=200)
        response.set_cookie(
            key=settings.SIMPLE_JWT['AUTH_COOKIE'],
            value=str(refresh.access_token),
            httponly=True,
            samesite='Lax',
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        )
        response.set_cookie(
            key='refreshToken',
            value=str(refresh),
            httponly=True,
            samesite='Lax',
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        )
        return response
