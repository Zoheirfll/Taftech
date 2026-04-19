# accounts/urls.py
from django.urls import path
from .views import CandidatRegistrationAPIView, RecruteurRegisterAPIView, CookieTokenObtainView

urlpatterns = [
    # C'est cette route que React doit appeler !
    path('login/', CookieTokenObtainView.as_view(), name='token_obtain_pair'),
    
    path('register/candidat/', CandidatRegistrationAPIView.as_view(), name='register-candidat'),
    path('register/recruteur/', RecruteurRegisterAPIView.as_view(), name='register-recruteur'),
]