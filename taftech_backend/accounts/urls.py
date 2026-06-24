# accounts/urls.py
from django.urls import path
from .views import CandidatRegistrationAPIView, RecruteurRegisterAPIView, CookieTokenObtainView, VerifyEmailAPIView, ErrorReportAPIView
from .views import ForgotPasswordAPIView, ResetPasswordAPIView, LogoutAPIView, GoogleSocialAuthView, AdminSystemLogAPIView, ConsentementLoi1807View, RenvoyerCodeVerificationAPIView
from django.conf import settings


urlpatterns = [
    # C'est cette route que React doit appeler !
    path('login/', CookieTokenObtainView.as_view(), name='token_obtain_pair'),
    
    path('register/candidat/', CandidatRegistrationAPIView.as_view(), name='register-candidat'),
    path('register/recruteur/', RecruteurRegisterAPIView.as_view(), name='register-recruteur'),
    path('verifier-email/',VerifyEmailAPIView.as_view(), name='verifier_email'),
    path('renvoyer-code/', RenvoyerCodeVerificationAPIView.as_view(), name='renvoyer-code'),
    path('report-error/', ErrorReportAPIView.as_view(), name='report-error'),
    path('forgot-password/', ForgotPasswordAPIView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordAPIView.as_view(), name='reset-password'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('social/google/', GoogleSocialAuthView.as_view(), name='social-google'),
    path('admin/system-logs/', AdminSystemLogAPIView.as_view(), name='admin-system-logs'),
    path('consentement/', ConsentementLoi1807View.as_view(), name='consentement-loi'),
]

if settings.DEBUG:
    from django.http import JsonResponse
    from django.views import View
    from django.contrib.auth import get_user_model

    class CypressCleanupView(View):
        def delete(self, request):
            User = get_user_model()
            User.objects.filter(email="cypress@test.dz").delete()
            return JsonResponse({"ok": True})

    urlpatterns += [
        path('cypress-cleanup/', CypressCleanupView.as_view(), name='cypress-cleanup'),
    ]