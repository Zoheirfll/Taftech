"""Profil entreprise du recruteur : mise à jour, photos, paramètres."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.exceptions import ValidationError as DjangoValidationError
from ..models import ProfilEntreprise, EntreprisePhoto
from .equipe import get_entreprise_for_user, get_membre_role
from ..throttles import FileUploadThrottle



class UpdateProfilEntrepriseAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    throttle_classes = [FileUploadThrottle]

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
        if 'annee_creation' in data:
            valeur_annee = data['annee_creation']
            if valeur_annee in ('', None):
                profil.annee_creation = None
            else:
                try:
                    profil.annee_creation = int(valeur_annee)
                except (TypeError, ValueError):
                    return Response({"error": "Année de création invalide."}, status=400)
        if 'logo' in request.FILES:
            profil.logo = request.FILES['logo']
        if 'banniere' in request.FILES:
            profil.banniere = request.FILES['banniere']
        profil.save()
        # Sauvegarder les infos personnelles de l'utilisateur
        user = request.user
        user_fields = []
        for field in ('first_name', 'last_name', 'telephone', 'intitule_poste'):
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
            "annee_creation": profil.annee_creation,
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
    throttle_classes = [FileUploadThrottle]

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
