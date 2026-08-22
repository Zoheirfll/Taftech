from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q, Sum, F, ExpressionWrapper, DurationField
from django.db.models.functions import Coalesce, Now
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
import datetime
import hmac
import hashlib
import logging
import requests as http_requests

logger = logging.getLogger(__name__)
from ..models import (
    OffreEmploi, ProfilCandidat, ProfilEntreprise, EntreprisePhoto,
    ProfilCandidatFavori, CandidatureSpontanee,
    Questionnaire, QuestionQuestionnaire, ReponseChoix, Candidature,
    DemandeActivationPremium, AuditLog, MembreEquipe
)
from .equipe import get_entreprise_for_user, get_membre_role
from ..throttles import WriteActionThrottle, EmailRateThrottle
from ..matcher import calculer_score_matching
from ..serializers import (
    EntrepriseDashboardDetailSerializer, OffreDashboardDTO,
    ProfilCandidatDTO, CandidatureSpontaneeSerializer,
    QuestionnaireSerializer
)

User = get_user_model()


class DashboardRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        mon_role = get_membre_role(request.user, entreprise)
        # Bloquer les membres (non-propriétaires) si le premium a expiré
        if mon_role != 'PROPRIETAIRE' and not entreprise.est_premium_actif:
            return Response(
                {"error": "L'abonnement Premium de votre entreprise a expiré. Contactez le propriétaire.", "code": "PREMIUM_EXPIRE"},
                status=status.HTTP_403_FORBIDDEN,
            )
        offres = OffreEmploi.objects.prefetch_related('candidatures', 'candidatures__candidat').filter(entreprise=entreprise).order_by('-date_publication')
        derniere_activation = entreprise.demandes_premium.filter(est_traitee=True).order_by('-date_traitement').first()
        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(entreprise)
        data = {
            "entreprise": EntrepriseDashboardDetailSerializer(entreprise).data,
            "offres": OffreDashboardDTO(offres, many=True).data,
            "est_premium": entreprise.est_premium_actif,
            "premium_expire_at": entreprise.premium_expire_at.strftime('%d/%m/%Y') if entreprise.premium_expire_at else None,
            "premium_active_since": derniere_activation.date_traitement.strftime('%d/%m/%Y') if derniere_activation else None,
            "premium_nb_mois": derniere_activation.nb_mois if derniere_activation else None,
            "membre_role": mon_role,
            "palier_actif": palier.nom if palier else None,
            "acces_equipe": bool(palier and palier.acces_equipe),
        }
        return Response(data, status=status.HTTP_200_OK)


def _construire_classeur_candidatures(candidatures, inclure_offre=False):
    """Construit un classeur Excel (openpyxl) à partir d'un queryset/liste de Candidature."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment

    wb = Workbook()
    ws = wb.active
    ws.title = "Candidatures"

    entetes = ["Date", "Candidat", "Email", "Téléphone"]
    if inclure_offre:
        entetes.append("Offre")
    entetes += [
        "Statut", "Score matching IA (%)",
        "Note technique (/5)", "Note communication (/5)",
        "Note motivation (/5)", "Note expérience (/5)",
        "Note globale (/20)", "Commentaire recruteur",
    ]
    ws.append(entetes)
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(vertical="center")

    for cand in candidatures:
        if cand.candidat:
            nom = f"{cand.candidat.last_name} {cand.candidat.first_name}".strip()
            email = cand.candidat.email
            telephone = getattr(cand.candidat, 'telephone', '') or ''
        else:
            nom = f"{cand.nom_rapide or ''} {cand.prenom_rapide or ''}".strip()
            email = cand.email_rapide or ''
            telephone = getattr(cand, 'telephone_rapide', '') or ''
        ligne = [
            cand.date_postulation.strftime("%d/%m/%Y") if cand.date_postulation else '',
            nom, email, telephone,
        ]
        if inclure_offre:
            ligne.append(cand.offre.titre)
        ligne += [
            cand.get_statut_display(),
            cand.score_matching if cand.score_matching is not None else '',
            cand.note_technique if cand.note_technique is not None else '',
            cand.note_communication if cand.note_communication is not None else '',
            cand.note_motivation if cand.note_motivation is not None else '',
            cand.note_experience if cand.note_experience is not None else '',
            float(cand.note_globale) if cand.note_globale is not None else '',
            cand.commentaire_evaluation or '',
        ]
        ws.append(ligne)

    for col_cells in ws.columns:
        longueur = max((len(str(c.value)) for c in col_cells if c.value is not None), default=10)
        ws.column_dimensions[col_cells[0].column_letter].width = min(longueur + 2, 50)
    ws.freeze_panes = "A2"
    return wb


class ExportCandidaturesOffreExcelAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, offre_id):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        try:
            offre = OffreEmploi.objects.get(id=offre_id, entreprise=entreprise)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)
        candidatures = offre.candidatures.select_related('candidat').order_by('-date_postulation')
        wb = _construire_classeur_candidatures(candidatures, inclure_offre=False)

        from django.http import HttpResponse
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        nom_fichier = f"candidatures_{offre.titre[:40].replace(' ', '_')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
        wb.save(response)
        return response


class ExportCandidaturesExcelAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        candidatures = (
            Candidature.objects.select_related('candidat', 'offre')
            .filter(offre__entreprise=entreprise)
            .order_by('-date_postulation')
        )
        wb = _construire_classeur_candidatures(candidatures, inclure_offre=True)

        from django.http import HttpResponse
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="candidatures_taftech.xlsx"'
        wb.save(response)
        return response


class UpdateProfilEntrepriseAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def put(self, request):
        profil = get_entreprise_for_user(request.user)
        if not profil:
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if get_membre_role(request.user, profil) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({"error": "Action réservée au propriétaire ou admin."}, status=403)
        data = request.data
        champs = ['secteur_activite', 'wilaya_siege', 'commune_siege', 'adresse_complete', 'taille_entreprise', 'description', 'linkedin', 'site_web', 'culture_entreprise']
        for champ in champs:
            if champ in data:
                valeur = data[champ]
                max_length = ProfilEntreprise._meta.get_field(champ).max_length
                if isinstance(valeur, str) and max_length:
                    valeur = valeur[:max_length]
                setattr(profil, champ, valeur)
        if 'logo' in request.FILES:
            profil.logo = request.FILES['logo']
        if 'banniere' in request.FILES:
            profil.banniere = request.FILES['banniere']
        profil.save()
        # Sauvegarder les infos personnelles de l'utilisateur
        user = request.user
        user_fields = []
        for field in ('first_name', 'last_name', 'telephone'):
            if field in data:
                val = data[field]
                model_field = user._meta.get_field(field)
                max_len = model_field.max_length
                if max_len and isinstance(val, str) and len(val) > max_len:
                    val = val[:max_len]
                if val:
                    try:
                        model_field.run_validators(val)
                    except DjangoValidationError as e:
                        return Response({"error": " ".join(e.messages)}, status=400)
                setattr(user, field, val)
                user_fields.append(field)
        if user_fields:
            user.save(update_fields=user_fields)
        logo_url = request.build_absolute_uri(profil.logo.url) if profil.logo else None
        banniere_url = request.build_absolute_uri(profil.banniere.url) if profil.banniere else None
        return Response({
            "message": "Informations mises à jour.",
            "description": profil.description,
            "culture_entreprise": profil.culture_entreprise,
            "wilaya_siege": profil.wilaya_siege,
            "commune_siege": profil.commune_siege,
            "adresse_complete": profil.adresse_complete,
            "secteur_activite": profil.secteur_activite,
            "taille_entreprise": profil.taille_entreprise,
            "linkedin": profil.linkedin,
            "site_web": profil.site_web,
            "logo": logo_url,
            "banniere": banniere_url,
        }, status=status.HTTP_200_OK)


class EntreprisePhotosAPIView(APIView):
    """Galerie photo de la page vitrine — ajout/suppression, réservé PROPRIETAIRE/ADMIN."""
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        profil = get_entreprise_for_user(request.user)
        if not profil:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, profil) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({"error": "Action réservée au propriétaire ou admin."}, status=403)
        if 'image' not in request.FILES:
            return Response({"error": "Aucune image fournie."}, status=400)
        if profil.photos.count() >= 12:
            return Response({"error": "Maximum 12 photos dans la galerie."}, status=400)
        photo = EntreprisePhoto(entreprise=profil, image=request.FILES['image'], legende=request.data.get('legende', '')[:150])
        try:
            photo.full_clean()
        except DjangoValidationError as e:
            return Response({"error": " ".join(sum(e.message_dict.values(), []))}, status=400)
        photo.save()
        return Response({
            "id": photo.id,
            "image": request.build_absolute_uri(photo.image.url),
            "legende": photo.legende,
        }, status=201)

    def delete(self, request, photo_id):
        profil = get_entreprise_for_user(request.user)
        if not profil:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, profil) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({"error": "Action réservée au propriétaire ou admin."}, status=403)
        try:
            photo = profil.photos.get(id=photo_id)
        except EntreprisePhoto.DoesNotExist:
            return Response({"error": "Photo introuvable."}, status=404)
        photo.delete()
        return Response({"message": "Photo supprimée."}, status=200)


class ParametresRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profil = get_entreprise_for_user(request.user)
        if not profil:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, profil) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({"error": "Accès refusé."}, status=403)
        return Response({
            "email_refus_auto": profil.email_refus_auto,
            "message_refus_auto": profil.message_refus_auto,
        }, status=200)

    def put(self, request):
        profil = get_entreprise_for_user(request.user)
        if not profil:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, profil) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({"error": "Accès refusé."}, status=403)
        profil.email_refus_auto = request.data.get('email_refus_auto', profil.email_refus_auto)
        profil.message_refus_auto = request.data.get('message_refus_auto', profil.message_refus_auto)
        profil.save(update_fields=['email_refus_auto', 'message_refus_auto'])
        return Response({
            "email_refus_auto": profil.email_refus_auto,
            "message_refus_auto": profil.message_refus_auto,
        }, status=200)


class CVthequePagination(PageNumberPagination):
    page_size = 10


class CVThequeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise_user = get_entreprise_for_user(request.user)
        if not entreprise_user:
            return Response({"error": "Accès réservé aux recruteurs."}, status=403)
        if not request.user.consentement_cvtheque:
            return Response(
                {"error": "Vous devez accepter les conditions de traitement des données candidats.", "code": "CVTHEQUE_CONSENT_REQUIRED"},
                status=403,
            )
        search = request.GET.get('search', '')
        wilaya = request.GET.get('wilaya', '')
        diplome = request.GET.get('diplome', '')
        specialite = request.GET.get('specialite', '')
        experience = request.GET.get('experience', '')
        mobilite = request.GET.get('mobilite', '')
        disponibilite = request.GET.get('disponibilite', '')
        langues = request.GET.get('langues', '')
        competences = request.GET.get('competences', '')
        permis = request.GET.get('permis', '') == 'true'
        vehicule = request.GET.get('vehicule', '') == 'true'
        passeport = request.GET.get('passeport', '') == 'true'
        service_militaire = request.GET.get('service_militaire', '')
        niveau_experience = request.GET.get('niveau_experience', '')
        avec_photo = request.GET.get('avec_photo', '') == 'true'
        avec_cv = request.GET.get('avec_cv', '') == 'true'
        inscrit_recent = request.GET.get('inscrit_recent', '') == 'true'
        favoris_only = request.GET.get('favoris', '') == 'true'
        tri = request.GET.get('tri', 'recents')
        candidats = ProfilCandidat.objects.select_related('user').prefetch_related('experiences_detail').filter(user__is_active=True, user__role='CANDIDAT')
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
        if mobilite:
            candidats = candidats.filter(mobilite=mobilite)
        if disponibilite:
            candidats = candidats.filter(situation_actuelle=disponibilite)
        if permis:
            candidats = candidats.filter(permis_conduire=True)
        if vehicule:
            candidats = candidats.filter(vehicule_personnel=True)
        if passeport:
            candidats = candidats.filter(passeport_valide=True)
        if service_militaire:
            candidats = candidats.filter(service_militaire=service_militaire)
        if niveau_experience:
            candidats = candidats.filter(niveau_experience=niveau_experience)
        # `langues`/`competences` sont des champs texte libre (pas de référentiel structuré
        # côté candidat) — filtrage par sous-chaîne, pas par égalité exacte.
        if langues:
            candidats = candidats.filter(langues__icontains=langues)
        if competences:
            candidats = candidats.filter(competences__icontains=competences)
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
        offre_id = request.GET.get('offre_id', '')
        offre_match = None
        if offre_id:
            try:
                offre_match = OffreEmploi.objects.get(pk=offre_id, entreprise=entreprise_user)
            except OffreEmploi.DoesNotExist:
                pass

        if offre_match:
            # Tri par score matching — on évalue tous les candidats filtrés
            candidats_list = list(candidats.select_related('user').prefetch_related('experiences_detail'))
            scored = []
            for profil in candidats_list:
                result = calculer_score_matching(profil.user, offre_match)
                scored.append((profil, round(result['total'])))
            scored.sort(key=lambda x: x[1], reverse=True)
            from ..paliers_utils import get_palier_actif
            palier = get_palier_actif(entreprise_user)
            if palier is None:
                return Response({"error": "Accès réservé aux recruteurs avec un abonnement actif.", "is_premium": False}, status=403)
            if not palier.acces_ia_recommandes:
                return Response({"error": "Le classement par compatibilité IA nécessite le palier Pro ou supérieur.", "is_premium": False}, status=403)
            is_premium = palier.acces_coordonnees
            # Pagination manuelle
            page_size = 10
            page = int(request.GET.get('page', 1))
            total = len(scored)
            start = (page - 1) * page_size
            end = start + page_size
            page_items = scored[start:end]
            profils_page = [p for p, _ in page_items]
            scores_map = {p.user.id: s for p, s in page_items}
            serializer = ProfilCandidatDTO(profils_page, many=True, context={'recruteur': request.user, 'is_premium': is_premium})
            results = serializer.data
            for item in results:
                item['score_offre'] = scores_map.get(item['user_id'], 0)
            # Fil d'activité candidat "profil recommandé" (dashboard candidat, session
            # specs/important-features) — uniquement si score élevé, pas une simple
            # consultation (décision utilisateur). Throttlé à 1 entrée/24h par candidat pour
            # ne pas spammer à chaque rafraîchissement de la recherche CVthèque.
            from ..models import ActiviteProfil
            from django.utils import timezone
            import datetime as _dt
            seuil_recent = timezone.now() - _dt.timedelta(hours=24)
            for profil, sc in page_items:
                if sc >= ActiviteProfil.SEUIL_SCORE_RECOMMANDE:
                    deja_recent = ActiviteProfil.objects.filter(
                        candidat=profil.user, entreprise=entreprise_user,
                        type_activite='PROFIL_RECOMMANDE', date_creation__gte=seuil_recent,
                    ).exists()
                    if not deja_recent:
                        ActiviteProfil.objects.create(
                            candidat=profil.user, entreprise=entreprise_user,
                            type_activite='PROFIL_RECOMMANDE', score=sc,
                        )
            return Response({
                'count': total,
                'next': None,
                'previous': None,
                'results': results,
                'is_premium': is_premium,
            })

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
        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(entreprise_user)
        if palier is None:
            return Response({"error": "Accès réservé aux recruteurs avec un abonnement actif.", "is_premium": False}, status=403)
        is_premium = palier.acces_coordonnees
        paginator = CVthequePagination()
        result_page = paginator.paginate_queryset(candidats, request)
        serializer = ProfilCandidatDTO(result_page, many=True, context={'recruteur': request.user, 'is_premium': is_premium})
        response = paginator.get_paginated_response(serializer.data)
        response.data['is_premium'] = is_premium
        return response


class ToggleFavoriCVAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, candidat_id):
        if not get_entreprise_for_user(request.user):
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
    permission_classes = [AllowAny]
    throttle_classes = [WriteActionThrottle, EmailRateThrottle]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, slug):
        try:
            entreprise = ProfilEntreprise.objects.get(slug=slug, est_approuvee=True)
        except ProfilEntreprise.DoesNotExist:
            return Response({'error': 'Entreprise introuvable.'}, status=404)
        if request.user.is_authenticated and request.user.role == 'CANDIDAT':
            if CandidatureSpontanee.objects.filter(entreprise=entreprise, candidat=request.user).exists():
                return Response({'error': 'Candidature spontanée déjà envoyée.'}, status=400)
        else:
            email = (request.data.get('email') or '').strip()
            if email and CandidatureSpontanee.objects.filter(entreprise=entreprise, email__iexact=email).exists():
                return Response({'error': 'Candidature spontanée déjà envoyée avec cet email.'}, status=400)
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
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Accès refusé.'}, status=403)
        candidatures = CandidatureSpontanee.objects.filter(entreprise=entreprise)
        serializer = CandidatureSpontaneeSerializer(candidatures, many=True)
        return Response(serializer.data)


class MarquerSpontaneeLueAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            candidature = CandidatureSpontanee.objects.get(pk=pk, entreprise=entreprise)
            candidature.lue = True
            candidature.save()
            return Response({'message': 'Marquée comme lue.'})
        except CandidatureSpontanee.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class SupprimerSpontaneeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            candidature = CandidatureSpontanee.objects.get(pk=pk, entreprise=entreprise)
            candidature.delete()
            return Response({'message': 'Supprimée.'})
        except CandidatureSpontanee.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class QuestionnaireListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_owner(self, request):
        """Retourne le propriétaire de l'entreprise (pour les questionnaires liés à l'owner)."""
        entreprise = get_entreprise_for_user(request.user)
        return entreprise.user if entreprise else None

    def get(self, request):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Accès refusé.'}, status=403)
        questionnaires = Questionnaire.objects.filter(recruteur=owner)
        serializer = QuestionnaireSerializer(questionnaires, many=True)
        return Response(serializer.data)

    def post(self, request):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Accès refusé.'}, status=403)
        entreprise = get_entreprise_for_user(request.user)
        if get_membre_role(request.user, entreprise) not in ('PROPRIETAIRE', 'ADMIN', 'UTILISATEUR'):
            return Response({'error': 'Accès refusé.'}, status=403)
        data = request.data
        questionnaire = Questionnaire.objects.create(recruteur=owner, titre=data.get('titre', 'Sans titre'))
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

    def _get_owner(self, request):
        entreprise = get_entreprise_for_user(request.user)
        return entreprise.user if entreprise else None

    def get(self, request, pk):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Introuvable.'}, status=404)
        try:
            q = Questionnaire.objects.get(pk=pk, recruteur=owner)
            return Response(QuestionnaireSerializer(q).data)
        except Questionnaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)

    def put(self, request, pk):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Introuvable.'}, status=404)
        try:
            questionnaire = Questionnaire.objects.get(pk=pk, recruteur=owner)
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
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Introuvable.'}, status=404)
        try:
            Questionnaire.objects.get(pk=pk, recruteur=owner).delete()
            return Response({'message': 'Supprimé.'})
        except Questionnaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class DemanderActivationPremiumAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Profil entreprise introuvable.'}, status=404)
        if get_membre_role(request.user, entreprise) != 'PROPRIETAIRE':
            return Response({'error': 'Réservé au propriétaire.'}, status=403)
        moyen = request.data.get('moyen_paiement', 'CIB')
        try:
            nb_mois = max(1, min(int(request.data.get('nb_mois', 1)), 60))
        except (TypeError, ValueError):
            return Response({'error': 'nb_mois doit être un nombre entier.'}, status=400)
        if DemandeActivationPremium.objects.filter(entreprise=entreprise, est_traitee=False).exists():
            return Response({'message': 'Demande déjà envoyée. En attente de traitement.'}, status=200)
        DemandeActivationPremium.objects.create(entreprise=entreprise, moyen_paiement=moyen, nb_mois=nb_mois)
        return Response({'message': 'Demande enregistrée. Votre compte sera activé sous 24h ouvrables.'}, status=201)


def _get_plan_premium(nb_mois):
    """Palier Premium actif pour cette durée, ou None si `nb_mois` ne correspond à aucun palier
    actif — source de vérité unique du prix (panel admin `PremiumPlan`), plus de formule codée en
    dur ni de duplication entre frontend/backend/email."""
    from ..models import PremiumPlan
    return PremiumPlan.objects.filter(nb_mois=nb_mois, actif=True).first()


class ChargilyCheckoutAPIView(APIView):
    """
    Crée une session de paiement Chargily Pay et retourne l'URL de redirection.
    Le recruteur est redirigé vers la page Chargily pour payer en ligne (CIB/EDAHABIA).
    Après paiement, Chargily redirige vers success_url et envoie un webhook.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Profil entreprise introuvable.'}, status=404)
        if get_membre_role(request.user, entreprise) != 'PROPRIETAIRE':
            return Response({'error': 'Réservé au propriétaire.'}, status=403)

        try:
            nb_mois = int(request.data.get('nb_mois', 1))
        except (TypeError, ValueError):
            return Response({'error': 'nb_mois doit être un nombre entier.'}, status=400)
        plan = _get_plan_premium(nb_mois)
        if not plan:
            return Response({'error': "Ce palier d'abonnement n'existe pas ou n'est plus disponible."}, status=400)
        montant = plan.prix_da

        # URLs de retour après paiement Chargily
        site_url = settings.SITE_URL.rstrip('/')
        # Après paiement → retour sur la page Premium avec ?paid=1 pour déclencher le retry
        # (le webhook Chargily peut prendre 1-3s — le frontend réessaie 5 fois)
        success_url = f"{site_url}/recruteurs/premium?paid=1"
        failure_url = f"{site_url}/recruteurs/premium"

        payload = {
            "amount": montant,
            "currency": "dzd",
            "success_url": success_url,
            "failure_url": failure_url,
            "locale": "fr",
            # metadata retransmise dans le webhook pour identifier l'entreprise
            "metadata": {
                "nb_mois": nb_mois,
                "entreprise_id": entreprise.id,
                "user_id": request.user.id,
            },
        }

        try:
            resp = http_requests.post(
                "https://pay.chargily.net/test/api/v2/checkouts",
                headers={
                    "Authorization": f"Bearer {settings.CHARGILY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10,
            )
        except Exception as e:
            logger.error(f"[CHARGILY] Erreur connexion : {e}")
            return Response({'error': 'Impossible de contacter Chargily.'}, status=502)

        if resp.status_code not in (200, 201):
            logger.error(f"[CHARGILY] Erreur {resp.status_code} : {resp.text}")
            return Response({'error': 'Erreur Chargily.', 'detail': resp.text}, status=502)

        checkout_url = resp.json().get('checkout_url')
        return Response({'checkout_url': checkout_url}, status=200)


class ChargilyWebhookAPIView(APIView):
    """
    Endpoint appelé automatiquement par Chargily après un paiement réussi.
    Vérifie la signature HMAC-SHA256 puis active le premium de l'entreprise.
    Aucune authentification JWT — c'est Chargily qui appelle cet endpoint.
    """
    authentication_classes = []  # pas de JWT, c'est un webhook externe
    permission_classes = []

    def post(self, request):
        logger.debug(f"[WEBHOOK] Headers : {dict(request.headers)}")
        logger.debug(f"[WEBHOOK] Body brut : {request.body[:500]}")
        logger.debug(f"[WEBHOOK] Data parsée : {request.data}")

        # Vérification de la signature envoyée par Chargily dans le header
        signature_reçue = request.headers.get('Signature', '')
        secret = settings.CHARGILY_SECRET_KEY.encode('utf-8')
        body = request.body
        signature_attendue = hmac.new(secret, body, hashlib.sha256).hexdigest()

        logger.debug(f"[WEBHOOK] Signature reçue   : {signature_reçue}")
        logger.debug(f"[WEBHOOK] Signature attendue : {signature_attendue}")

        if not hmac.compare_digest(signature_attendue, signature_reçue):
            logger.warning("[WEBHOOK] Signature invalide — paiement ignoré")
            return Response({'error': 'Signature invalide.'}, status=400)

        data = request.data
        event_type = data.get('type', '')
        logger.info(f"[WEBHOOK] Event type : {event_type}")

        # On ne traite que les paiements confirmés
        if event_type != 'checkout.paid':
            logger.info(f"[WEBHOOK] Événement ignoré : {event_type}")
            return Response({'status': 'ignored'}, status=200)

        # Structure Chargily : event.data.metadata (pas event.data.object.metadata)
        metadata = data.get('data', {}).get('metadata', {})
        entreprise_id = metadata.get('entreprise_id')
        # Plafond large (5 ans) en filet de sécurité si le webhook est appelé avec un payload
        # corrompu/falsifié — le vrai contrôle (durée valide = palier actif) a déjà eu lieu à la
        # création du checkout ; les paliers n'étant plus figés à 12 mois (admin peut en ajouter
        # au-delà), on ne recale plus sur l'ancien plafond fixe.
        nb_mois = max(1, min(int(metadata.get('nb_mois', 1)), 60))

        try:
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id)
        except ProfilEntreprise.DoesNotExist:
            return Response({'error': 'Entreprise introuvable.'}, status=404)

        # Activation ou prolongation du premium
        now = timezone.now()
        if entreprise.est_premium and entreprise.premium_expire_at and entreprise.premium_expire_at > now:
            # Premium encore actif → on prolonge depuis la date d'expiration actuelle
            entreprise.premium_expire_at += datetime.timedelta(days=nb_mois * 30)
        else:
            # Nouveau premium ou expiré → on part de maintenant
            entreprise.est_premium = True
            entreprise.premium_expire_at = now + datetime.timedelta(days=nb_mois * 30)

        entreprise.save(update_fields=['est_premium', 'premium_expire_at'])

        # Traçabilité — déjà traitée car Chargily a confirmé le paiement
        DemandeActivationPremium.objects.create(
            entreprise=entreprise,
            moyen_paiement='CHARGILY',
            nb_mois=nb_mois,
            est_traitee=True,
            date_traitement=now,
        )

        # Entrée dans le journal d'audit admin (admin=None car c'est un webhook automatique)
        AuditLog.objects.create(
            admin=None,
            action='AUTRE',
            detail=f"[CHARGILY] Premium {nb_mois} mois activé pour {entreprise.nom_entreprise} — expire {entreprise.premium_expire_at.strftime('%d/%m/%Y')}",
            ip=None,
        )

        return Response({'status': 'ok'}, status=200)


class EnvoyerRecuPremiumAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'RECRUTEUR':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            entreprise = request.user.profil_entreprise
        except Exception:
            return Response({'error': 'Profil entreprise introuvable.'}, status=404)
        moyen = request.data.get('moyen_paiement', 'CIB')
        try:
            nb_mois = int(request.data.get('nb_mois', 1))
        except (TypeError, ValueError):
            return Response({'error': 'nb_mois doit être un nombre entier.'}, status=400)
        plan = _get_plan_premium(nb_mois)
        montant = plan.prix_da if plan else nb_mois * 2000  # repli si palier désactivé/inconnu (email informatif seulement)
        message_custom = request.data.get('message', '')
        subject = f"[TafTech Premium] Reçu de paiement — {entreprise.nom_entreprise}"
        body = f"""
Bonjour,

L'entreprise suivante a envoyé une confirmation de paiement Premium :

• Entreprise : {entreprise.nom_entreprise}
• Email : {request.user.email}
• Téléphone : {request.user.telephone or 'Non renseigné'}
• Moyen de paiement : {moyen}
• Durée : {nb_mois} mois
• Montant : {montant} DA

Message du recruteur :
{message_custom or '(aucun message)'}

→ Activez le compte depuis le panel admin TafTech.
        """.strip()
        try:
            mail = EmailMultiAlternatives(subject, body, settings.EMAIL_HOST_USER, [settings.EMAIL_HOST_USER])
            mail.send()
        except Exception as e:
            return Response({'error': 'Erreur lors de l\'envoi du mail.'}, status=500)
        return Response({'message': 'Email envoyé avec succès. Activation sous 24h ouvrables.'}, status=200)