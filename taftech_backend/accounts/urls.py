from django.urls import path
from .views import CandidatRegistrationAPIView
from .views import RecruteurRegisterAPIView

urlpatterns = [
    path('register/candidat/', CandidatRegistrationAPIView.as_view(), name='register-candidat'),
    path('register/recruteur/', RecruteurRegisterAPIView.as_view(), name='register-recruteur'),
]