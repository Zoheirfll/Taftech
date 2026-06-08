from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from ..models import Notification, ProfilEntreprise
from ..serializers import NotificationSerializer, EntreprisePublicSerializer

User = get_user_model()

class NotificationListAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        notifs = Notification.objects.filter(destinataire=request.user)
        serializer = NotificationSerializer(notifs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class MarkNotificationReadAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, notif_id):
        try:
            notif = Notification.objects.get(id=notif_id, destinataire=request.user)
            notif.lue = True
            notif.save()
            return Response({"message": "Message marqué comme lu."}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"error": "Message introuvable."}, status=status.HTTP_404_NOT_FOUND)

class PublicStatsAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        from ..models import OffreEmploi, Candidature
        stats = {
            "total_offres": OffreEmploi.objects.filter(est_active=True, statut_moderation='APPROUVEE', est_cloturee=False).count(),
            "total_entreprises": ProfilEntreprise.objects.filter(est_approuvee=True).count(),
            "total_candidats": User.objects.filter(role='CANDIDAT', is_active=True).count(),
            "total_recrutements": Candidature.objects.filter(statut='RETENU').count(),
        }
        return Response(stats, status=status.HTTP_200_OK)

class EntrepriseDetailAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, entreprise_id):
        try:
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id, est_approuvee=True)
            serializer = EntreprisePublicSerializer(entreprise)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ProfilEntreprise.DoesNotExist:
            return Response({"error": "Entreprise introuvable ou en cours de validation."}, status=status.HTTP_404_NOT_FOUND)