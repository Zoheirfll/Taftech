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
from .serializers import RegisterCandidatDTO, EmailTokenObtainSerializer, RecruteurRegisterSerializer
from django.contrib.auth import get_user_model
from .models import SystemErrorLog
from jobs.views.equipe import get_entreprise_for_user, _log
from rest_framework.permissions import IsAdminUser, IsAuthenticated
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


class RenvoyerCodeVerificationAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CypressAwareThrottle]

    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if user.email_verifie:
            return Response({"message": "Ce compte est déjà vérifié."}, status=status.HTTP_200_OK)

        code = _generate_otp(user)
        user.code_verification = code
        user.code_verification_created_at = timezone.now()
        user.save(update_fields=['code_verification', 'code_verification_created_at'])

        sujet = "TafTech — Votre nouveau code de vérification"
        ctx = {'prenom': user.first_name, 'code': code, 'est_recruteur': user.role == 'RECRUTEUR', 'annee': timezone.now().year}
        html_body = render_to_string('emails/verification_code.html', ctx)
        texte = f"Bonjour {user.first_name},\n\nVotre nouveau code de vérification est : {code}\n\nIl est valable 10 minutes."
        try:
            msg = EmailMultiAlternatives(sujet, texte, settings.EMAIL_HOST_USER, [user.email])
            msg.attach_alternative(html_body, 'text/html')
            msg.send(fail_silently=False)
        except Exception as e:
            logger.error("Erreur renvoi code vérification: %s", e)

        return Response({"message": "Nouveau code envoyé."}, status=status.HTTP_200_OK)


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
            detail = e.detail if hasattr(e, 'detail') else str(e)
            if isinstance(detail, dict):
                return Response(detail, status=401)
            return Response({"detail": str(detail)}, status=401)

        data = serializer.validated_data

        # Validation du portail : candidat ne peut pas se connecter sur l'espace recruteur et vice-versa
        portal = request.data.get('portal')
        role = data.get('role')
        if portal == 'recruteur' and role not in ('RECRUTEUR', 'ADMIN') and not data.get('est_membre_equipe'):
            return Response(
                {"detail": "Ce compte n'est pas un compte recruteur."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if portal == 'candidat' and role not in ('CANDIDAT', 'ADMIN'):
            return Response(
                {"detail": "Ce compte n'est pas un compte candidat."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            email = request.data.get('email') or request.data.get('username')
            user_obj = User.objects.get(email=email)
            user_obj.last_login = timezone.now()
            user_obj.save(update_fields=['last_login'])
        except Exception:
            pass

        # Bloquer les membres si le premium a expiré (le propriétaire garde toujours l'accès)
        if data.get('est_membre_equipe'):
            try:
                email = request.data.get('email') or request.data.get('username')
                user_obj = User.objects.get(email=email)
                entreprise = get_entreprise_for_user(user_obj)
                if entreprise and not entreprise.est_premium_actif:
                    return Response(
                        {"detail": "L'abonnement Premium de votre entreprise a expiré. Contactez le propriétaire.", "code": "PREMIUM_EXPIRE"},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except Exception:
                pass

        # Log de connexion pour les membres d'équipe et recruteurs
        try:
            email = request.data.get('email') or request.data.get('username')
            user_for_log = User.objects.get(email=email)
            entreprise_for_log = get_entreprise_for_user(user_for_log)
            if entreprise_for_log:
                _log(user_for_log, entreprise_for_log, 'CONNEXION', f"via portail {portal or 'direct'}")
        except Exception:
            pass

        remember_me = str(request.data.get('remember_me', False)).lower() == 'true'
        cookie_max_age = 60 * 60 * 24 if remember_me else None  # 1 jour — limite le risque sur poste partagé

        response = Response({"role": data['role'], "est_membre_equipe": data.get('est_membre_equipe', False)}, status=status.HTTP_200_OK)
        response.set_cookie(
            key=settings.SIMPLE_JWT['AUTH_COOKIE'],
            value=data['access'],
            httponly=True,
            samesite='Lax',
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            max_age=cookie_max_age,
        )
        response.set_cookie(
            key='refreshToken',
            value=data['refresh'],
            httponly=True,
            samesite='Lax',
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            max_age=cookie_max_age,
        )
        # Marqueur non-sensible (lisible) pour que CookieTokenRefreshView sache
        # s'il doit reconduire la persistance du cookie sur le refresh token roté.
        if remember_me:
            response.set_cookie(
                key='rememberMe',
                value='1',
                httponly=True,
                samesite='Lax',
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                max_age=cookie_max_age,
            )
        else:
            response.delete_cookie('rememberMe')
        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        cookies = getattr(request, 'COOKIES', {}) or getattr(getattr(request, '_request', None), 'COOKIES', {})
        refresh_token = cookies.get('refreshToken')
        remember_me = cookies.get('rememberMe') == '1'
        cookie_max_age = 60 * 60 * 24 if remember_me else None

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
                    max_age=cookie_max_age,
                )
                del response.data['access']
                # ROTATE_REFRESH_TOKENS=True renvoie un nouveau refresh token à
                # chaque appel et blackliste l'ancien : le cookie doit être remplacé
                # sous peine que la session se casse au refresh suivant.
                new_refresh = response.data.pop('refresh', None)
                if new_refresh:
                    response.set_cookie(
                        key='refreshToken',
                        value=new_refresh,
                        httponly=True,
                        samesite='Lax',
                        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                        max_age=cookie_max_age,
                    )
                    if remember_me:
                        response.set_cookie(
                            key='rememberMe',
                            value='1',
                            httponly=True,
                            samesite='Lax',
                            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                            max_age=cookie_max_age,
                        )
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
        response.delete_cookie('rememberMe')
        return response


class ErrorReportAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CypressAwareThrottle]

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
        # Pagination manuelle — 50 par page
        page = int(request.query_params.get('page', 1))
        page_size = 50
        start = (page - 1) * page_size
        end = start + page_size
        total = logs.count()
        serializer = SystemErrorLogSerializer(logs[start:end], many=True)
        return Response({
            'count': total,
            'results': serializer.data,
            'page': page,
            'total_pages': max(1, (total + page_size - 1) // page_size),
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        SystemErrorLog.objects.all().delete()
        return Response({'ok': True}, status=status.HTTP_200_OK)


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


class ChangerMotDePasseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        nouveau = request.data.get('nouveau_mdp', '')

        if not nouveau or len(nouveau) < 8:
            return Response({'error': 'Le mot de passe doit contenir au moins 8 caractères.'}, status=400)

        if getattr(user, 'est_compte_google', False):
            # Compte Google — pas d'ancien mot de passe requis
            user.set_password(nouveau)
            user.save(update_fields=['password'])
            return Response({'message': 'Mot de passe défini avec succès !'})

        # Compte email — vérifier l'ancien mot de passe
        ancien = request.data.get('ancien_mdp', '')
        if not user.check_password(ancien):
            return Response({'error': 'Ancien mot de passe incorrect.'}, status=400)

        user.set_password(nouveau)
        user.save(update_fields=['password'])
        return Response({'message': 'Mot de passe modifié avec succès !'})


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'est_compte_google': getattr(user, 'est_compte_google', False),
            'consentement_cvtheque': user.consentement_cvtheque,
        })


class GoogleSocialAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get('credential')
        role = request.data.get('role', 'CANDIDAT')
        mode = request.data.get('mode', 'register')  # 'login' ou 'register'

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

        if mode == 'login':
            # Connexion uniquement — le compte doit déjà exister
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Aucun compte TafTech associé à cette adresse Gmail. Inscrivez-vous d\'abord.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            created = False
        else:
            # Inscription — créer si inexistant, consentement loi 18-07 à valider ensuite
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': role,
                    'email_verifie': True,
                    'is_active': True,
                    'consentement_loi_18_07': False,
                    'est_compte_google': True,
                }
            )

        if not created:
            # Vérifier que le rôle correspond au portail demandé
            if role == 'RECRUTEUR' and user.role not in ('RECRUTEUR', 'ADMIN'):
                return Response(
                    {'error': 'Ce compte Google est associé à un espace candidat. Utilisez l\'espace candidat pour vous connecter.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if role == 'CANDIDAT' and user.role not in ('CANDIDAT', 'ADMIN'):
                return Response(
                    {'error': 'Ce compte Google est associé à un espace recruteur. Utilisez l\'espace recruteur pour vous connecter.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role

        response = Response({
            'role': user.role,
            'requires_consent': created,  # True si nouveau compte Google
        }, status=200)
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


class ConsentementLoi1807View(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        request.user.consentement_loi_18_07 = True
        request.user.save(update_fields=['consentement_loi_18_07'])
        return Response({'ok': True})


class ConsentementCVThequeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        if not get_entreprise_for_user(request.user):
            return Response({"error": "Réservé aux recruteurs."}, status=status.HTTP_403_FORBIDDEN)
        request.user.consentement_cvtheque = True
        request.user.save(update_fields=['consentement_cvtheque'])
        return Response({'ok': True})
