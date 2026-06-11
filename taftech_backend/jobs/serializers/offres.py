from rest_framework import serializers
from ..models import OffreEmploi, ProfilEntreprise
from .questionnaires import QuestionnaireSerializer


class EntrepriseSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilEntreprise
        fields = ('id', 'nom_entreprise', 'wilaya_siege')


class OffreEmploiSerializer(serializers.ModelSerializer):
    entreprise = EntrepriseSimpleSerializer(read_only=True)
    questionnaire = QuestionnaireSerializer(read_only=True)

    class Meta:
        model = OffreEmploi
        fields = '__all__'


class OffreEmploiCreateDTO(serializers.ModelSerializer):
    class Meta:
        model = OffreEmploi
        fields = (
            'titre', 'wilaya', 'commune', 'diplome', 'specialite',
            'missions', 'profil_recherche', 'type_contrat',
            'experience_requise', 'salaire_propose', 'questionnaire'
        )


class OffreEmploiPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = OffreEmploi
        fields = ('id', 'titre', 'wilaya', 'commune', 'type_contrat', 'experience_requise', 'date_publication')


class EntreprisePublicSerializer(serializers.ModelSerializer):
    offres_actives = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = ProfilEntreprise
        fields = (
            'id', 'nom_entreprise', 'secteur_activite', 'wilaya_siege', 'commune_siege',
            'taille_entreprise', 'description', 'logo_url', 'offres_actives'
        )

    def get_offres_actives(self, obj):
        offres = obj.offres.filter(
            est_active=True, statut_moderation='APPROUVEE', est_cloturee=False
        ).order_by('-date_publication')
        return OffreEmploiPublicSerializer(offres, many=True).data

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url