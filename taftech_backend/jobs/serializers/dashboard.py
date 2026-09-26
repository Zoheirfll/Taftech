from rest_framework import serializers
from ..models import OffreEmploi
from .offres import OffreEmploiSerializer, EntrepriseSimpleSerializer, CompetenceOffreSerializer, ExigenceImperativeSerializer
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
    exigences_imperatives = ExigenceImperativeSerializer(many=True, read_only=True)

    class Meta:
        model = OffreEmploi
        fields = (
            'id', 'titre', 'date_publication', 'date_expiration', 'est_active', 'est_cloturee',
            'wilaya', 'commune', 'diplome', 'metier', 'metier_libelle', 'type_contrat',
            'experience_requise', 'nombre_postes', 'description', 'missions', 'profil_recherche', 'competences',
            'competences_requises', 'diplomes_requis_detail', 'specialites_requises_detail', 'exigences_imperatives',
            'salaire_propose', 'candidatures', 'statut_moderation', 'motif_rejet',
            'entreprise', 'questionnaire'
        )

    def get_diplomes_requis_detail(self, obj):
        return [{"id": d.id, "libelle": d.libelle} for d in obj.diplomes_requis.all()]

    def get_specialites_requises_detail(self, obj):
        return [{"id": s.id, "libelle": s.libelle} for s in obj.specialites_requises.all()]