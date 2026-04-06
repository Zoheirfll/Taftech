from django.urls import path
from .views import CandidatRegistrationAPIView

urlpatterns = [
    path('register/candidat/', CandidatRegistrationAPIView.as_view(), name='register-candidat'),
]