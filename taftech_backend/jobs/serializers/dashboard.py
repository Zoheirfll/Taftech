from rest_framework import serializers
from ..models import OffreEmploi
from .offres import OffreEmploiSerializer, EntrepriseSimpleSerializer, CompetenceOffreSerializer, ExigenceImperativeSerializer, detail_specialites_requises
from .candidatures import CandidatureRecruteurDTO
from .questionnaires import QuestionnaireSerializer


class OffreDashboardDTO(serializers.ModelSerializer):
    candidatures = CandidatureRecruteurDTO(many=True, read_only=True)
    questionnaire = QuestionnaireSerializer(read_only=True)
    entreprise = EntrepriseSimpleSerializer(read_only=True)
    competences_requises = CompetenceOffreSerializer(many=True, read_only=True)
    metier_libelle = serializers.CharField(source='metier.libelle', read_only=True, default=None)
    diplomes_requis_detail = serializers.SerializerMethodField()
    specialites_requises_detail = serializers.SerializerMethodField()
    experience_annees = serializers.SerializerMethodField()
    exigences_imperatives = ExigenceImperativeSerializer(many=True, read_only=True)

    class Meta:
        model = OffreEmploi
        fields = (
            'id', 'titre', 'date_publication', 'date_expiration', 'est_active', 'est_cloturee',
            'wilaya', 'commune', 'diplome', 'metier', 'metier_libelle', 'type_contrat',
            'lieux_supplementaires', 'types_contrat_supplementaires',
            'experience_requise', 'experience_annees', 'nombre_postes', 'description', 'missions', 'profil_recherche', 'competences',
            'competences_requises', 'diplomes_requis_detail', 'specialites_requises_detail', 'exigences_imperatives',
            'salaire_propose', 'candidatures', 'statut_moderation', 'motif_rejet',
            'entreprise', 'questionnaire'
        )

    def get_experience_annees(self, obj):
        from ..matcher import annees_experience_pour_niveau
        return annees_experience_pour_niveau(obj.experience_requise)

    def get_diplomes_requis_detail(self, obj):
        return [{"id": d.id, "libelle": d.libelle, "code": d.code} for d in obj.diplomes_requis.all()]

    def get_specialites_requises_detail(self, obj):
        return detail_specialites_requises(obj.specialites_requises.all())