from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import OffreEmploi
from .serializers import OffreEmploiSerializer

class JobListAPIView(APIView):
    """
    Endpoint pour lister toutes les offres d'emploi actives.
    URL : /api/jobs/
    """
    def get(self, request):
        # On récupère uniquement les offres actives, triées par date décroissante
        offres = OffreEmploi.objects.filter(est_active=True).order_by('-date_publication')
        
        # On passe les données au DTO (many=True car c'est une liste)
        serializer = OffreEmploiSerializer(offres, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)