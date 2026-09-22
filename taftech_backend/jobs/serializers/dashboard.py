from rest_framework import serializers
from ..models import OffreEmploi
from .offres import OffreEmploiSerializer, EntrepriseSimpleSerializer, CompetenceOffreSerializer, OffreDiplomeAccepteSerializer, ExigenceImperativeSerializer
from .candidatures import CandidatureRecruteurDTO
from .questionnaires import QuestionnaireSerializer


class OffreDashboardDTO(serializers.ModelSerializer):
    candidatures = CandidatureRecruteurDTO(many=True, read_only=True)
    questionnaire = QuestionnaireSerializer(read_only=True)
    entreprise = EntrepriseSimpleSerializer(read_only=True)
    competences_requises = CompetenceOffreSerializer(many=True, read_only=True)
    metier_libelle = serializers.CharField(source='metier.libelle', read_only=True, default=None)
    diplomes_acceptes = OffreDiplomeAccepteSerializer(many=True, read_only=True)
    exigences_imperatives = ExigenceImperativeSerializer(many=True, read_only=True)

    class Meta:
        model = OffreEmploi
        fields = (
            'id', 'titre', 'date_publication', 'date_expiration', 'est_active', 'est_cloturee',
            'wilaya', 'commune', 'diplome', 'metier', 'metier_libelle', 'type_contrat',
            'experience_requise', 'nombre_postes', 'description', 'missions', 'profil_recherche', 'competences',
            'competences_requises', 'diplomes_acceptes', 'exigences_imperatives',
            'salaire_propose', 'candidatures', 'statut_moderation', 'motif_rejet',
            'entreprise', 'questionnaire'
        )