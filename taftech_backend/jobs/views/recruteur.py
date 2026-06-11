from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Q, Sum, F, ExpressionWrapper, DurationField
from django.db.models.functions import Coalesce, Now
import datetime
from ..models import (
    OffreEmploi, ProfilCandidat, ProfilEntreprise,
    ProfilCandidatFavori, CandidatureSpontanee,
    Questionnaire, QuestionQuestionnaire, ReponseChoix, Candidature
)
from ..serializers import (
    EntrepriseDashboardDetailSerializer, OffreDashboardDTO,
    ProfilCandidatDTO, CandidatureSpontaneeSerializer,
    QuestionnaireSerializer
)

User = get_user_model()


class DashboardRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'profil_entreprise'):
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = request.user.profil_entreprise
        offres = OffreEmploi.objects.filter(entreprise=entreprise).order_by('-date_publication')
        data = {
            "entreprise": EntrepriseDashboardDetailSerializer(entreprise).data,
            "offres": OffreDashboardDTO(offres, many=True).data
        }
        return Response(data, status=status.HTTP_200_OK)


class UpdateProfilEntrepriseAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def put(self, request):
        if not hasattr(request.user, 'profil_entreprise'):
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        profil = request.user.profil_entreprise
        data = request.data
        champs = ['secteur_activite', 'wilaya_siege', 'commune_siege', 'taille_entreprise', 'description']
        for champ in champs:
            if champ in data:
                setattr(profil, champ, data[champ])
        if 'logo' in request.FILES:
            profil.logo = request.FILES['logo']
        profil.save()
        logo_url = request.build_absolute_uri(profil.logo.url) if profil.logo else None
        return Response({
            "message": "Informations mises à jour.",
            "description": profil.description,
            "wilaya_siege": profil.wilaya_siege,
            "commune_siege": profil.commune_siege,
            "secteur_activite": profil.secteur_activite,
            "taille_entreprise": profil.taille_entreprise,
            "logo": logo_url
        }, status=status.HTTP_200_OK)


class ParametresRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'RECRUTEUR':
            return Response({"error": "Accès refusé."}, status=403)
        try:
            profil = request.user.profil_entreprise
            return Response({
                "email_refus_auto": profil.email_refus_auto,
                "message_refus_auto": profil.message_refus_auto,
            }, status=200)
        except Exception:
            return Response({"error": "Profil entreprise introuvable."}, status=404)

    def put(self, request):
        if request.user.role != 'RECRUTEUR':
            return Response({"error": "Accès refusé."}, status=403)
        try:
            profil = request.user.profil_entreprise
            profil.email_refus_auto = request.data.get('email_refus_auto', profil.email_refus_auto)
            profil.message_refus_auto = request.data.get('message_refus_auto', profil.message_refus_auto)
            profil.save(update_fields=['email_refus_auto', 'message_refus_auto'])
            return Response({
                "email_refus_auto": profil.email_refus_auto,
                "message_refus_auto": profil.message_refus_auto,
            }, status=200)
        except Exception:
            return Response({"error": "Erreur lors de la sauvegarde."}, status=500)


class CVthequePagination(PageNumberPagination):
    page_size = 10


class CVThequeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'RECRUTEUR':
            return Response({"error": "Accès réservé aux recruteurs."}, status=403)
        search = request.GET.get('search', '')
        wilaya = request.GET.get('wilaya', '')
        diplome = request.GET.get('diplome', '')
        specialite = request.GET.get('specialite', '')
        experience = request.GET.get('experience', '')
        avec_photo = request.GET.get('avec_photo', '') == 'true'
        avec_cv = request.GET.get('avec_cv', '') == 'true'
        inscrit_recent = request.GET.get('inscrit_recent', '') == 'true'
        favoris_only = request.GET.get('favoris', '') == 'true'
        tri = request.GET.get('tri', 'recents')
        candidats = ProfilCandidat.objects.filter(user__is_active=True, user__role='CANDIDAT')
        if favoris_only:
            ids_favoris = ProfilCandidatFavori.objects.filter(recruteur=request.user).values_list('candidat_id', flat=True)
            candidats = candidats.filter(user__id__in=ids_favoris)
        if search:
            candidats = candidats.filter(
                Q(titre_professionnel__icontains=search) |
                Q(competences__icontains=search) |
                Q(experiences_detail__titre_poste__icontains=search) |
                Q(experiences_detail__description__icontains=search)
            ).distinct()
        if wilaya:
            candidats = candidats.filter(wilaya=wilaya)
        if diplome:
            candidats = candidats.filter(diplome=diplome)
        if specialite:
            candidats = candidats.filter(Q(specialite=specialite) | Q(secteur_souhaite=specialite)).distinct()
        if avec_photo:
            candidats = candidats.exclude(photo_profil='').exclude(photo_profil__isnull=True)
        if avec_cv:
            candidats = candidats.exclude(cv_pdf='').exclude(cv_pdf__isnull=True)
        if inscrit_recent:
            date_limite = datetime.datetime.now() - datetime.timedelta(days=30)
            candidats = candidats.filter(user__date_joined__gte=date_limite)
        if experience:
            try:
                min_days = float(experience) * 365.25
                candidats = candidats.annotate(
                    duree_totale=Sum(
                        ExpressionWrapper(
                            Coalesce(F('experiences_detail__date_fin'), Now()) - F('experiences_detail__date_debut'),
                            output_field=DurationField()
                        )
                    )
                ).filter(duree_totale__gte=datetime.timedelta(days=min_days))
            except ValueError:
                pass
        if tri == 'nom_asc':
            candidats = candidats.order_by('user__last_name', 'user__first_name')
        elif tri == 'experience_desc':
            if 'duree_totale' not in str(candidats.query):
                candidats = candidats.annotate(
                    duree_totale=Sum(
                        ExpressionWrapper(
                            Coalesce(F('experiences_detail__date_fin'), Now()) - F('experiences_detail__date_debut'),
                            output_field=DurationField()
                        )
                    )
                )
            candidats = candidats.order_by(F('duree_totale').desc(nulls_last=True))
        else:
            candidats = candidats.order_by('-user__date_joined')
        paginator = CVthequePagination()
        result_page = paginator.paginate_queryset(candidats, request)
        serializer = ProfilCandidatDTO(result_page, many=True, context={'recruteur': request.user})
        return paginator.get_paginated_response(serializer.data)


class ToggleFavoriCVAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, candidat_id):
        if request.user.role != 'RECRUTEUR':
            return Response({"error": "Action réservée aux recruteurs."}, status=403)
        try:
            candidat = User.objects.get(id=candidat_id, role='CANDIDAT')
        except User.DoesNotExist:
            return Response({"error": "Candidat introuvable."}, status=404)
        favori, created = ProfilCandidatFavori.objects.get_or_create(recruteur=request.user, candidat=candidat)
        if not created:
            favori.delete()
            return Response({"action": "retire", "is_favori": False}, status=200)
        return Response({"action": "ajoute", "is_favori": True}, status=201)


class EnvoyerCandidatureSpontaneeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, entreprise_id):
        try:
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id, est_approuvee=True)
        except ProfilEntreprise.DoesNotExist:
            return Response({'error': 'Entreprise introuvable.'}, status=404)
        if request.user.is_authenticated and request.user.role == 'CANDIDAT':
            if CandidatureSpontanee.objects.filter(entreprise=entreprise, candidat=request.user).exists():
                return Response({'error': 'Candidature spontanée déjà envoyée.'}, status=400)
        serializer = CandidatureSpontaneeSerializer(data=request.data)
        if serializer.is_valid():
            candidature = serializer.save(entreprise=entreprise)
            if request.user.is_authenticated and request.user.role == 'CANDIDAT':
                candidature.candidat = request.user
                candidature.save()
            return Response({'message': 'Candidature spontanée envoyée !'}, status=201)
        return Response(serializer.errors, status=400)


class ListeCandidaturesSpontaneesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'RECRUTEUR':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            entreprise = ProfilEntreprise.objects.get(user=request.user)
        except ProfilEntreprise.DoesNotExist:
            return Response([], status=200)
        candidatures = CandidatureSpontanee.objects.filter(entreprise=entreprise)
        serializer = CandidatureSpontaneeSerializer(candidatures, many=True)
        return Response(serializer.data)


class MarquerSpontaneeLueAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            candidature = CandidatureSpontanee.objects.get(pk=pk, entreprise__user_id=request.user.id)
            candidature.lue = True
            candidature.save()
            return Response({'message': 'Marquée comme lue.'})
        except CandidatureSpontanee.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class SupprimerSpontaneeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            candidature = CandidatureSpontanee.objects.get(pk=pk, entreprise__user_id=request.user.id)
            candidature.delete()
            return Response({'message': 'Supprimée.'})
        except CandidatureSpontanee.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class QuestionnaireListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'RECRUTEUR':
            return Response({'error': 'Accès refusé.'}, status=403)
        questionnaires = Questionnaire.objects.filter(recruteur=request.user)
        serializer = QuestionnaireSerializer(questionnaires, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != 'RECRUTEUR':
            return Response({'error': 'Accès refusé.'}, status=403)
        data = request.data
        questionnaire = Questionnaire.objects.create(recruteur=request.user, titre=data.get('titre', 'Sans titre'))
        for i, q in enumerate(data.get('questions', [])):
            question = QuestionQuestionnaire.objects.create(
                questionnaire=questionnaire,
                texte=q.get('texte', ''),
                type_question=q.get('type_question', 'COURT'),
                requis=q.get('requis', False),
                disqualifiant=q.get('disqualifiant', False),
                ordre=i,
            )
            for choix in q.get('choix', []):
                if choix.get('texte'):
                    ReponseChoix.objects.create(question=question, texte=choix['texte'])
        return Response(QuestionnaireSerializer(questionnaire).data, status=201)


class QuestionnaireDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            q = Questionnaire.objects.get(pk=pk, recruteur=request.user)
            return Response(QuestionnaireSerializer(q).data)
        except Questionnaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)

    def put(self, request, pk):
        try:
            questionnaire = Questionnaire.objects.get(pk=pk, recruteur=request.user)
        except Questionnaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        questionnaire.titre = request.data.get('titre', questionnaire.titre)
        questionnaire.save()
        questionnaire.questions.all().delete()
        for i, q in enumerate(request.data.get('questions', [])):
            question = QuestionQuestionnaire.objects.create(
                questionnaire=questionnaire,
                texte=q.get('texte', ''),
                type_question=q.get('type_question', 'COURT'),
                requis=q.get('requis', False),
                disqualifiant=q.get('disqualifiant', False),
                ordre=i,
            )
            for choix in q.get('choix', []):
                if choix.get('texte'):
                    ReponseChoix.objects.create(question=question, texte=choix['texte'])
        return Response(QuestionnaireSerializer(questionnaire).data)

    def delete(self, request, pk):
        try:
            Questionnaire.objects.get(pk=pk, recruteur=request.user).delete()
            return Response({'message': 'Supprimé.'})
        except Questionnaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)