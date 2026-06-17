from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from ..models import OffreEmploi, Candidature, EquipeActionLog
from .equipe import get_entreprise_for_user, _log
from ..serializers import (
    OffreEmploiSerializer,
    OffreEmploiCreateDTO,
    OffreDashboardDTO,
)


class JobListAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        mot_cle = request.query_params.get('search', '')
        wilaya = request.query_params.get('wilaya', '')
        commune = request.query_params.get('commune', '')
        diplome = request.query_params.get('diplome', '')
        specialite = request.query_params.get('specialite', '')
        experience = request.query_params.get('experience', '')
        contrat = request.query_params.get('contrat', '')
        offres = OffreEmploi.objects.filter(est_active=True, statut_moderation='APPROUVEE', est_cloturee=False)
        if mot_cle:
            offres = offres.filter(Q(titre__icontains=mot_cle) | Q(missions__icontains=mot_cle))
        if wilaya:
            offres = offres.filter(wilaya__icontains=wilaya)
        if commune:
            offres = offres.filter(commune__icontains=commune)
        if diplome:
            offres = offres.filter(diplome__icontains=diplome)
        if specialite:
            offres = offres.filter(specialite__icontains=specialite)
        if experience:
            offres = offres.filter(experience_requise=experience)
        if contrat:
            offres = offres.filter(type_contrat=contrat)
        offres = offres.order_by('-date_publication')
        paginator = PageNumberPagination()
        paginator.page_size = 5
        page = paginator.paginate_queryset(offres, request)
        serializer = OffreEmploiSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class JobDetailAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True, est_cloturee=False)
            serializer = OffreEmploiSerializer(offre)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus disponible."}, status=status.HTTP_404_NOT_FOUND)


class JobCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        if not hasattr(request.user, 'profil_entreprise'):
            return Response({"error": "Profil entreprise inexistant."}, status=403)
        if not request.user.profil_entreprise.est_approuvee:
            return Response({"error": "Votre entreprise doit être validée par TafTech avant de publier."}, status=status.HTTP_403_FORBIDDEN)
        serializer = OffreEmploiCreateDTO(data=request.data)
        if serializer.is_valid():
            offre = serializer.save(entreprise=request.user.profil_entreprise)
            _log(request.user, request.user.profil_entreprise, 'CREER_OFFRE', offre.titre)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateOffreRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=404)
        if offre.entreprise.user != request.user:
            return Response({"error": "Non autorisé."}, status=403)
        if offre.statut_moderation == "APPROUVEE":
            return Response({"error": "Impossible de modifier une offre déjà publiée."}, status=400)
        serializer = OffreEmploiCreateDTO(offre, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(statut_moderation="EN_ATTENTE", motif_rejet="")
            _log(request.user, offre.entreprise, 'MODIFIER_OFFRE', offre.titre)
            return Response({
                "message": "Offre mise à jour et soumise pour validation.",
                "offre": OffreDashboardDTO(offre).data
            }, status=200)
        return Response(serializer.errors, status=400)


class CloturerOffreAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id)
            if offre.entreprise.user != request.user:
                return Response({"error": "Vous n'êtes pas autorisé à modifier cette offre."}, status=status.HTTP_403_FORBIDDEN)
            offre.est_cloturee = True
            offre.save()
            _log(request.user, offre.entreprise, 'CLOTURER_OFFRE', offre.titre)
            return Response({"message": "Offre clôturée avec succès."}, status=status.HTTP_200_OK)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)


class ConstantsAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        from ..constants import WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT
        data = {
            "wilayas": [{"value": item[0], "label": item[1]} for item in WILAYAS_CHOICES],
            "secteurs": [{"value": item[0], "label": item[1]} for item in SECTEURS_CHOICES],
            "diplomes": [{"value": item[0], "label": item[1]} for item in DIPLOMES_CHOICES],
            "experiences": [{"value": item[0], "label": item[1]} for item in NIVEAUX_EXPERIENCE],
            "contrats": [{"value": item[0], "label": item[1]} for item in TYPES_CONTRAT],
        }
        return Response(data, status=status.HTTP_200_OK)