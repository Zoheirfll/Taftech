import logging
import os
import re
from django.utils import timezone
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.utils import DataError
from ..models import (
    ProfilCandidat, ExperienceCandidat, FormationCandidat,
    OffreSauvegardee, AlerteEmploi, OffreEmploi, Candidature
)
from ..serializers import (
    ProfilCandidatDTO, ExperienceSerializer, FormationSerializer,
    OffreSauvegardeeSerializer, AlerteEmploiSerializer,
    ParametresNotificationsSerializer
)
from .equipe import get_entreprise_for_user
from ..throttles import FileUploadThrottle

logger = logging.getLogger(__name__)


class ProfilCandidatAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    throttle_classes = [FileUploadThrottle]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        profil, created = ProfilCandidat.objects.get_or_create(user=request.user)
        # Backfill paresseux : un profil dont les compétences texte existaient déjà avant
        # l'introduction de CompetenceCandidat (niveau par compétence) n'a jamais déclenché la
        # synchronisation — elle ne se faisait qu'à l'écriture. Sans ce backfill, "Mes
        # compétences" et le profil restent vides tant que le candidat ne resauvegarde rien.
        if profil.competences and profil.competences.strip() and not profil.competences_detail.exists():
            _synchroniser_competences_depuis_texte(profil)
        serializer = ProfilCandidatDTO(profil, context={'is_premium': True, 'include_nin': True})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        profil, created = ProfilCandidat.objects.get_or_create(user=request.user)
        if str(request.data.get('remove_photo_profil', '')).lower() == 'true':
            profil.photo_profil.delete(save=False)
            profil.photo_profil = None
        if str(request.data.get('remove_cv_pdf', '')).lower() == 'true':
            profil.cv_pdf.delete(save=False)
            profil.cv_pdf = None
            profil.cv_pdf_maj_le = None
        nouveau_cv = request.FILES.get('cv_pdf')
        if nouveau_cv:
            profil.cv_pdf_maj_le = timezone.now()
        user = request.user
        user_fields = []
        for field in ('first_name', 'last_name', 'telephone', 'date_naissance'):
            val = request.data.get(field)
            if val is not None:
                model_field = user._meta.get_field(field)
                max_len = model_field.max_length
                if max_len and isinstance(val, str) and len(val) > max_len:
                    val = val[:max_len]
                if val:
                    try:
                        model_field.run_validators(val)
                    except DjangoValidationError as e:
                        return Response({"error": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
                elif field == 'date_naissance':
                    val = None
                setattr(user, field, val)
                user_fields.append(field)
        if user_fields:
            try:
                user.save(update_fields=user_fields)
            except DataError:
                return Response(
                    {"error": "Une des valeurs envoyées est trop longue."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        data = request.data.copy()
        if 'langues' in data and isinstance(data['langues'], str):
            data['langues'] = data['langues'][:255]
        # Les CV mentionnent souvent "linkedin.com/in/..." sans protocole → rejeté par le URLField.
        # L'IA du parser peut aussi noyer l'URL dans une phrase (ex: "LinkedIn : linkedin.com/in/x")
        # ou renvoyer un texte qui n'est pas du tout une URL (ex: "Non spécifié") — dans ce dernier
        # cas on abandonne silencieusement ce seul champ plutôt que de faire échouer tout le PUT.
        url_validator = URLValidator()
        DOMAINES_URL = {'linkedin': r'linkedin\.com/\S+', 'github': r'github\.com/\S+'}
        for champ_url in ('linkedin', 'github'):
            valeur = data.get(champ_url)
            if valeur and isinstance(valeur, str):
                valeur = valeur.strip()
                match = re.search(DOMAINES_URL[champ_url], valeur, re.IGNORECASE)
                if match:
                    valeur = match.group(0)
                valeur = valeur.rstrip('.,;)')
                if not valeur.startswith(('http://', 'https://')):
                    valeur = f"https://{valeur}"
                try:
                    url_validator(valeur)
                    data[champ_url] = valeur
                except DjangoValidationError:
                    data[champ_url] = ""

        # Ces champs sont exposés en LECTURE via SerializerMethodField (masquage CVthèque avant
        # déblocage — voir ProfilCandidatDTO) : DRF ignore silencieusement tout champ déclaré
        # SerializerMethodField à l'écriture, `serializer.save()` ne les persisterait donc
        # jamais. Même bypass que les champs User ci-dessus — assignés directement sur `profil`,
        # persistés par le même `serializer.save()` plus bas (même instance Python, un seul
        # UPDATE en base).
        CHAMPS_TEXTE_DIRECTS = {'bio': None, 'commune': 100, 'adresse': 255, 'salaire_souhaite': 100}
        for champ, max_len in CHAMPS_TEXTE_DIRECTS.items():
            val = data.get(champ)
            if val is not None:
                if max_len and isinstance(val, str) and len(val) > max_len:
                    val = val[:max_len]
                setattr(profil, champ, val)
        for champ_url in ('linkedin', 'github'):
            val = data.get(champ_url)
            if val is not None:
                setattr(profil, champ_url, val)
        diplome_val = data.get('diplome')
        if diplome_val is not None:
            valeurs_valides = {c[0] for c in ProfilCandidat._meta.get_field('diplome').choices}
            if diplome_val == '' or diplome_val in valeurs_valides:
                profil.diplome = diplome_val or None
        nouvelle_photo = request.FILES.get('photo_profil')
        if nouvelle_photo:
            try:
                for validator in ProfilCandidat._meta.get_field('photo_profil').validators:
                    validator(nouvelle_photo)
            except DjangoValidationError as e:
                return Response({"error": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
            profil.photo_profil = nouvelle_photo

        serializer = ProfilCandidatDTO(profil, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            if 'competences' in data:
                _synchroniser_competences_depuis_texte(profil)
            if nouveau_cv:
                _copier_cv_vers_mes_documents(profil)
            return Response({
                "message": "Profil mis à jour avec succès !",
                "profil": serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _copier_cv_vers_mes_documents(profil):
    """Chaque CV uploadé (formulaire profil ou parser IA, même endpoint) est aussi rangé
    dans l'espace privé "Mes documents" du candidat, sous le type CV — pour que l'historique
    de ses CV reste consultable même après un remplacement dans le profil."""
    from django.core.files.base import ContentFile
    from ..models import DocumentCandidat, TypeDocument
    if not profil.cv_pdf:
        return
    type_cv = TypeDocument.objects.filter(label='CV').first()
    nom_fichier = os.path.basename(profil.cv_pdf.name)
    profil.cv_pdf.open('rb')
    try:
        contenu = profil.cv_pdf.read()
    finally:
        profil.cv_pdf.close()
    DocumentCandidat.objects.create(
        profil=profil,
        type_document=type_cv,
        nom_personnalise=nom_fichier,
        fichier=ContentFile(contenu, name=nom_fichier),
    )


def _synchroniser_competences_depuis_texte(profil):
    """Fait converger CompetenceCandidat (structuré, avec niveau) vers le champ texte libre
    ProfilCandidat.competences après toute modification faite via les tags du profil (page
    Mon profil) — pour que "Mes compétences" (niveau par compétence) reste cohérent avec les
    tags affichés sur le profil, quel que soit l'écran utilisé pour les modifier. Sens inverse
    de _resynchroniser_competences_texte (candidat_dashboard.py, appelé quand la modification
    part de "Mes compétences") — les deux écrans convergent vers la même liste."""
    from ..models import CompetenceCandidat, CompetenceReferentiel
    profil.refresh_from_db(fields=['competences'])
    labels_texte = {l.strip() for l in (profil.competences or '').split(',') if l.strip()}
    labels_existants = set(profil.competences_detail.values_list('label', flat=True))
    from ..demandes_ajout import demander_competence_saisie
    from ..referentiel_utils import construire_index_competences, resoudre_competence_ref
    index_competences = construire_index_competences()
    for label in labels_texte - labels_existants:
        # Même résolveur que l'offre (libellé OU synonyme) : le score est comparable (point 10).
        ref = resoudre_competence_ref(label, index_competences)
        CompetenceCandidat.objects.create(profil=profil, label=label, niveau='DEBUTANT', competence_ref=ref)
        if ref is None:
            # Hors référentiel : demande d'ajout implicite visible de l'admin (onglet « Demandes »).
            demander_competence_saisie(profil.user, label)
    profil.competences_detail.exclude(label__in=labels_texte).delete()


class ExperienceAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        profil = request.user.profil_candidat
        serializer = ExperienceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profil=profil)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExperienceDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
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
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        try:
            experience = ExperienceCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
            experience.delete()
            return Response({"message": "Expérience supprimée."}, status=status.HTTP_204_NO_CONTENT)
        except ExperienceCandidat.DoesNotExist:
            return Response({"error": "Expérience introuvable."}, status=status.HTTP_404_NOT_FOUND)


def _synchroniser_demandes_formation(formation, request):
    """Crée ou rejoint les demandes d'ajout au référentiel liées à la formation (« Autre, préciser » :
    diplôme ou spécialité absent de la liste). Jamais bloquant : un échec est journalisé et la formation
    reste enregistrée."""
    try:
        from ..demandes_ajout import synchroniser_depuis_formation
        synchroniser_depuis_formation(formation, request.user, request.data.get('specialite_autre') or '')
    except Exception:
        logger.exception("Synchronisation des demandes d'ajout impossible pour la formation %s", formation.pk)


class FormationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        profil = request.user.profil_candidat
        serializer = FormationSerializer(data=request.data)
        if serializer.is_valid():
            formation = serializer.save(profil=profil)
            _synchroniser_demandes_formation(formation, request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FormationDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        try:
            formation = FormationCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
        except FormationCandidat.DoesNotExist:
            return Response({"error": "Formation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = FormationSerializer(formation, data=request.data)
        if serializer.is_valid():
            formation = serializer.save()
            _synchroniser_demandes_formation(formation, request)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        try:
            formation = FormationCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
            formation.delete()
            return Response({"message": "Formation supprimée."}, status=status.HTTP_204_NO_CONTENT)
        except FormationCandidat.DoesNotExist:
            return Response({"error": "Formation introuvable."}, status=status.HTTP_404_NOT_FOUND)


class OffreSauvegardeeListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        favoris = OffreSauvegardee.objects.filter(candidat=request.user)
        serializer = OffreSauvegardeeSerializer(favoris, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
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
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        try:
            favori = OffreSauvegardee.objects.get(id=pk, candidat=request.user)
            favori.delete()
            return Response({"message": "Offre retirée des favoris."}, status=status.HTTP_204_NO_CONTENT)
        except OffreSauvegardee.DoesNotExist:
            return Response({"error": "Favori introuvable."}, status=status.HTTP_404_NOT_FOUND)


class AlerteEmploiListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        alertes = AlerteEmploi.objects.filter(candidat=request.user)
        serializer = AlerteEmploiSerializer(alertes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        serializer = AlerteEmploiSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(candidat=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AlerteEmploiDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
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
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        try:
            alerte = AlerteEmploi.objects.get(id=pk, candidat=request.user)
        except AlerteEmploi.DoesNotExist:
            return Response({"error": "Alerte introuvable."}, status=status.HTTP_404_NOT_FOUND)
        alerte.delete()
        return Response({"message": "Alerte supprimée."}, status=status.HTTP_200_OK)


class AlerteMarquerVueAPIView(APIView):
    """Réinitialise le compteur "nouvelles offres" d'une alerte — appelé quand le candidat
    clique "Voir les offres" pour cette alerte précise (dashboard ou page /alertes)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
        try:
            alerte = AlerteEmploi.objects.get(id=pk, candidat=request.user)
        except AlerteEmploi.DoesNotExist:
            return Response({"error": "Alerte introuvable."}, status=status.HTTP_404_NOT_FOUND)
        from django.utils import timezone
        alerte.derniere_consultation = timezone.now()
        alerte.save(update_fields=['derniere_consultation'])
        return Response(AlerteEmploiSerializer(alerte).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=status.HTTP_403_FORBIDDEN)
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


class CandidatFichierPriveAPIView(APIView):
    """
    Sert le CV PDF ou la photo de profil d'un candidat après vérification d'accès :
    le candidat lui-même, un admin, ou un recruteur ayant reçu une candidature de
    ce candidat / ayant un abonnement premium actif (CVThèque).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, candidat_id, type_fichier):
        try:
            profil = ProfilCandidat.objects.select_related('user').get(user_id=candidat_id)
        except ProfilCandidat.DoesNotExist:
            raise Http404

        if type_fichier == 'cv':
            fichier = profil.cv_pdf
        elif type_fichier == 'photo':
            fichier = profil.photo_profil
        else:
            return Response({"error": "Type de fichier invalide."}, status=status.HTTP_400_BAD_REQUEST)

        if not self._acces_autorise(request.user, profil):
            return Response({"error": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if not fichier:
            raise Http404

        return FileResponse(fichier.open('rb'), filename=os.path.basename(fichier.name))

    def _acces_autorise(self, user, profil):
        """Le candidat lui-même, un admin, un recruteur ayant reçu une vraie candidature de ce
        candidat (relation voulue par le candidat lui-même), ou un recruteur ayant débloqué ce
        profil via un crédit CVthèque — ce dernier accès cesse si le candidat masque son profil et
        tout accès recruteur cesse si le compte est supprimé (point 12 ; voir jobs/credits_utils.py)."""
        if user.id == profil.user_id or user.role == 'ADMIN':
            return True
        entreprise = get_entreprise_for_user(user)
        if not entreprise or not entreprise.est_approuvee:
            return False
        if not profil.user.is_active:
            return False  # profil supprimé : plus aucun accès recruteur, même via une candidature passée
        if Candidature.objects.filter(candidat_id=profil.user_id, offre__entreprise=entreprise).exists():
            return True
        from ..credits_utils import profil_accessible_aux_recruteurs
        from ..models import AccesCandidatDebloque
        return (
            profil_accessible_aux_recruteurs(profil)
            and AccesCandidatDebloque.objects.filter(entreprise=entreprise, candidat=profil.user).exists()
        )