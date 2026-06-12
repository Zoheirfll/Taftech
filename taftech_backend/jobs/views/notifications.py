from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from ..models import Notification, ProfilEntreprise
from ..serializers import NotificationSerializer, EntreprisePublicSerializer

User = get_user_model()


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class NotificationListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(destinataire=request.user).order_by('-date_creation')
        paginator = NotificationPagination()
        result_page = paginator.paginate_queryset(notifs, request)
        serializer = NotificationSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)

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

class EntrepriseListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = ProfilEntreprise.objects.filter(est_approuvee=True).order_by('-id')
        search = request.query_params.get('search', '').strip()
        secteur = request.query_params.get('secteur', '').strip()
        tri = request.query_params.get('tri', '')
        if search:
            qs = qs.filter(nom_entreprise__icontains=search)
        if secteur:
            qs = qs.filter(secteur_activite=secteur)
        if tri == 'nom':
            qs = qs.order_by('nom_entreprise')
        elif tri == 'offres':
            from django.db.models import Count
            qs = qs.annotate(nb_offres=Count('offres')).order_by('-nb_offres')
        serializer = EntreprisePublicSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class EntrepriseDetailAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, entreprise_id):
        try:
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id, est_approuvee=True)
            serializer = EntreprisePublicSerializer(entreprise)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ProfilEntreprise.DoesNotExist:
            return Response({"error": "Entreprise introuvable ou en cours de validation."}, status=status.HTTP_404_NOT_FOUND)