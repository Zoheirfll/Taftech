from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import OffreEmploi
from .serializers import OffreEmploiSerializer
from rest_framework.permissions import IsAuthenticated
from .services import EntrepriseService
from .serializers import ProfilEntrepriseCreateDTO

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

class ProfilEntrepriseCreateAPIView(APIView):
    """
    Endpoint pour qu'un utilisateur enregistré devienne Recruteur.
    URL : /api/jobs/entreprise/creer/
    """
    permission_classes = [IsAuthenticated] # Sécurité : il faut être connecté

    def post(self, request):
        serializer = ProfilEntrepriseCreateDTO(data=request.data)
        if serializer.is_valid():
            try:
                profil = EntrepriseService.creer_profil(request.user, serializer.validated_data)
                return Response(
                    {"message": f"Entreprise {profil.nom_entreprise} enregistrée avec succès."},
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)