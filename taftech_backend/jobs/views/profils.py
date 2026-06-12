from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from ..models import (
    ProfilCandidat, ExperienceCandidat, FormationCandidat,
    OffreSauvegardee, AlerteEmploi, OffreEmploi
)
from ..serializers import (
    ProfilCandidatDTO, ExperienceSerializer, FormationSerializer,
    OffreSauvegardeeSerializer, AlerteEmploiSerializer,
    ParametresNotificationsSerializer
)


class ProfilCandidatAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        profil, created = ProfilCandidat.objects.get_or_create(user=request.user)
        serializer = ProfilCandidatDTO(profil)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        profil, created = ProfilCandidat.objects.get_or_create(user=request.user)
        user = request.user
        nin = request.data.get('nin')
        telephone = request.data.get('telephone')
        if nin is not None:
            user.nin = nin
        if telephone is not None:
            user.telephone = telephone
        user.save()
        serializer = ProfilCandidatDTO(profil, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Profil mis à jour avec succès !",
                "profil": serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExperienceAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profil = request.user.profil_candidat
        serializer = ExperienceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profil=profil)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExperienceDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            experience = ExperienceCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
        except ExperienceCandidat.DoesNotExist:
            return Response({"error": "Expérience introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ExperienceSerializer(experience, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            experience = ExperienceCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
            experience.delete()
            return Response({"message": "Expérience supprimée."}, status=status.HTTP_204_NO_CONTENT)
        except ExperienceCandidat.DoesNotExist:
            return Response({"error": "Expérience introuvable."}, status=status.HTTP_404_NOT_FOUND)


class FormationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profil = request.user.profil_candidat
        serializer = FormationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profil=profil)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FormationDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            formation = FormationCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
        except FormationCandidat.DoesNotExist:
            return Response({"error": "Formation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = FormationSerializer(formation, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            formation = FormationCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
            formation.delete()
            return Response({"message": "Formation supprimée."}, status=status.HTTP_204_NO_CONTENT)
        except FormationCandidat.DoesNotExist:
            return Response({"error": "Formation introuvable."}, status=status.HTTP_404_NOT_FOUND)


class OffreSauvegardeeListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        favoris = OffreSauvegardee.objects.filter(candidat=request.user)
        serializer = OffreSauvegardeeSerializer(favoris, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        offre_id = request.data.get('offre')
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas."}, status=status.HTTP_404_NOT_FOUND)
        if OffreSauvegardee.objects.filter(candidat=request.user, offre=offre).exists():
            return Response({"error": "Cette offre est déjà dans vos favoris."}, status=status.HTTP_400_BAD_REQUEST)
        favori = OffreSauvegardee.objects.create(candidat=request.user, offre=offre)
        serializer = OffreSauvegardeeSerializer(favori)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OffreSauvegardeeDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            favori = OffreSauvegardee.objects.get(id=pk, candidat=request.user)
            favori.delete()
            return Response({"message": "Offre retirée des favoris."}, status=status.HTTP_204_NO_CONTENT)
        except OffreSauvegardee.DoesNotExist:
            return Response({"error": "Favori introuvable."}, status=status.HTTP_404_NOT_FOUND)


class AlerteEmploiListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        alertes = AlerteEmploi.objects.filter(candidat=request.user)
        serializer = AlerteEmploiSerializer(alertes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AlerteEmploiSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(candidat=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AlerteEmploiDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            alerte = AlerteEmploi.objects.get(id=pk, candidat=request.user)
        except AlerteEmploi.DoesNotExist:
            return Response({"error": "Alerte introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AlerteEmploiSerializer(alerte, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            alerte = AlerteEmploi.objects.get(id=pk, candidat=request.user)
            alerte.delete()
            return Response({"message": "Alerte supprimée."}, status=status.HTTP_204_NO_CONTENT)
        except AlerteEmploi.DoesNotExist:
            return Response({"error": "Alerte introuvable."}, status=status.HTTP_404_NOT_FOUND)


class ParametresNotificationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profil = request.user.profil_candidat
        except Exception:
            return Response({"error": "Profil candidat introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ParametresNotificationsSerializer(profil)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        try:
            profil = request.user.profil_candidat
        except Exception:
            return Response({"error": "Profil candidat introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ParametresNotificationsSerializer(profil, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)