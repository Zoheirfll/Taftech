from django.urls import path
from .views import JobListAPIView
from .views import ProfilEntrepriseCreateAPIView


urlpatterns = [
    path('', JobListAPIView.as_view(), name='job-list'),
    path('entreprise/creer/', ProfilEntrepriseCreateAPIView.as_view(), name='creer-entreprise'),
]