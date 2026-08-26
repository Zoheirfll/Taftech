from rest_framework import serializers
from ..models import OffreEmploi, ProfilEntreprise, Domaine
from .questionnaires import QuestionnaireSerializer


def _secteur_libelle_pour_offre(obj):
    """Libellé du secteur ANEM parent du Domaine référencé par `specialite` —
    utilisé côté frontend pour construire l'URL SEO imbriquée de l'offre."""
    if not obj.specialite:
        return None
    domaine = Domaine.objects.select_related('secteur').filter(code=obj.specialite).first()
    return domaine.secteur.libelle if domaine else None


class EntrepriseSimpleSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = ProfilEntreprise
        fields = ('id', 'slug', 'nom_entreprise', 'wilaya_siege', 'commune_siege', 'adresse_complete', 'logo_url')

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url


class OffreEmploiSerializer(serializers.ModelSerializer):
    entreprise = EntrepriseSimpleSerializer(read_only=True)
    questionnaire = QuestionnaireSerializer(read_only=True)
    jours_restants = serializers.SerializerMethodField()
    secteur_libelle = serializers.SerializerMethodField()

    class Meta:
        model = OffreEmploi
        fields = '__all__'

    def get_jours_restants(self, obj):
        if not obj.date_expiration or obj.est_cloturee:
            return None
        from django.utils import timezone
        delta = obj.date_expiration - timezone.now().date()
        return max(0, delta.days)

    def get_secteur_libelle(self, obj):
        return _secteur_libelle_pour_offre(obj)


class OffreEmploiCreateDTO(serializers.ModelSerializer):
    class Meta:
        model = OffreEmploi
        fields = (
            'titre', 'wilaya', 'commune', 'diplome', 'specialite',
            'description', 'missions', 'profil_recherche', 'competences', 'type_contrat',
            'experience_requise', 'nombre_postes', 'salaire_propose', 'questionnaire', 'date_expiration'
        )


class OffreEmploiPublicSerializer(serializers.ModelSerializer):
    secteur_libelle = serializers.SerializerMethodField()

    class Meta:
        model = OffreEmploi
        fields = ('id', 'code_public', 'secteur_libelle', 'titre', 'wilaya', 'commune', 'type_contrat', 'experience_requise', 'nombre_postes', 'date_publication')

    def get_secteur_libelle(self, obj):
        return _secteur_libelle_pour_offre(obj)


class EntreprisePublicSerializer(serializers.ModelSerializer):
    offres_actives = serializers.SerializerMethodField()
    nombre_offres_actives = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    banniere_url = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()

    class Meta:
        model = ProfilEntreprise
        fields = (
            'id', 'slug', 'nom_entreprise', 'secteur_activite', 'wilaya_siege', 'commune_siege',
            'adresse_complete', 'taille_entreprise', 'description', 'culture_entreprise',
            'annee_creation',
            'logo_url', 'banniere_url', 'photos', 'linkedin', 'site_web',
            'offres_actives', 'nombre_offres_actives',
        )

    def _offres_actives_qs(self, obj):
        return obj.offres.filter(
            est_active=True, statut_moderation='APPROUVEE', est_cloturee=False
        ).order_by('-date_publication')

    def get_offres_actives(self, obj):
        return OffreEmploiPublicSerializer(self._offres_actives_qs(obj), many=True).data

    def get_nombre_offres_actives(self, obj):
        return self._offres_actives_qs(obj).count()

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url

    def get_banniere_url(self, obj):
        if not obj.banniere:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.banniere.url) if request else obj.banniere.url

    def get_photos(self, obj):
        request = self.context.get('request')
        return [
            {
                "id": p.id,
                "image": request.build_absolute_uri(p.image.url) if request else p.image.url,
                "legende": p.legende,
            }
            for p in obj.photos.all()
        ]