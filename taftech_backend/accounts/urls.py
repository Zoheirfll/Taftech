# accounts/urls.py
from django.urls import path
from .views import CandidatRegistrationAPIView, RecruteurRegisterAPIView, CookieTokenObtainView, VerifyEmailAPIView, ErrorReportAPIView
from .views import ForgotPasswordAPIView, ResetPasswordAPIView


urlpatterns = [
    # C'est cette route que React doit appeler !
    path('login/', CookieTokenObtainView.as_view(), name='token_obtain_pair'),
    
    path('register/candidat/', CandidatRegistrationAPIView.as_view(), name='register-candidat'),
    path('register/recruteur/', RecruteurRegisterAPIView.as_view(), name='register-recruteur'),
    path('verifier-email/',VerifyEmailAPIView.as_view(), name='verifier_email'),
    path('report-error/', ErrorReportAPIView.as_view(), name='report-error'),
    path('forgot-password/', ForgotPasswordAPIView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordAPIView.as_view(), name='reset-password'),
]