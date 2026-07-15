from rest_framework import serializers
from ..models import OffreEmploi
from .offres import OffreEmploiSerializer, EntrepriseSimpleSerializer
from .candidatures import CandidatureRecruteurDTO
from .questionnaires import QuestionnaireSerializer


class OffreDashboardDTO(serializers.ModelSerializer):
    candidatures = CandidatureRecruteurDTO(many=True, read_only=True)
    questionnaire = QuestionnaireSerializer(read_only=True)
    entreprise = EntrepriseSimpleSerializer(read_only=True)

    class Meta:
        model = OffreEmploi
        fields = (
            'id', 'titre', 'date_publication', 'date_expiration', 'est_active', 'est_cloturee',
            'wilaya', 'commune', 'diplome', 'specialite', 'type_contrat',
            'experience_requise', 'nombre_postes', 'description', 'missions', 'profil_recherche',
            'salaire_propose', 'candidatures', 'statut_moderation', 'motif_rejet',
            'entreprise', 'questionnaire'
        )