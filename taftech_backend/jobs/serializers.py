from rest_framework import serializers
from .models import OffreEmploi, ProfilEntreprise
from .models import Candidature
from django.contrib.auth import get_user_model
from .models import ProfilCandidat

User = get_user_model()
# 1 Entreprise Serializer
class EntrepriseSimpleSerializer(serializers.ModelSerializer):
    """Un petit DTO pour afficher juste le nom et la wilaya de l'entreprise dans l'offre."""
    class Meta:
        model = ProfilEntreprise
        fields = ('nom_entreprise', 'wilaya_siege')
# 2 Offre Emploi Serializer
class OffreEmploiSerializer(serializers.ModelSerializer):
    """Le DTO principal pour lister les offres sur la page d'accueil."""
    # On imbrique le sérialiseur de l'entreprise pour avoir les détails de l'employeur
    entreprise = EntrepriseSimpleSerializer(read_only=True)
    
    class Meta:
        model = OffreEmploi
        fields = (
            'id', 'titre', 'entreprise', 'wilaya', 'type_contrat', 
            'experience_requise', 'salaire_propose', 'date_publication'
        )
#3 Profil Entreprise Create Serializer        
class ProfilEntrepriseCreateDTO(serializers.ModelSerializer):
    """
    DTO pour la création du profil entreprise.
    Le champ 'user' est exclu car on le récupère via la session (le token).
    """
    class Meta:
        model = ProfilEntreprise
        fields = ('nom_entreprise', 'secteur_activite', 'registre_commerce', 'wilaya_siege', 'description')

    def validate_registre_commerce(self, value):
        # On pourrait ajouter ici une validation spécifique au format RC algérien
        if len(value) < 5:
            raise serializers.ValidationError("Le numéro de Registre de Commerce semble invalide.")
        return value        

class PostulerDTO(serializers.ModelSerializer):
    class Meta:
        model = Candidature
        fields = ('lettre_motivation',) # L'offre et le candidat seront gérés par le serveur, pas par l'utilisateur

class OffreEmploiCreateDTO(serializers.ModelSerializer):
    """
    DTO pour la publication d'une nouvelle offre d'emploi.
    L'entreprise n'est pas dans les champs car le serveur s'en occupe.
    """
    class Meta:
        model = OffreEmploi
        fields = (
            'titre', 'wilaya', 'missions', 'profil_recherche', 
            'type_contrat', 'experience_requise', 'salaire_propose'
        )

# 1. Vigile pour les infos basiques du candidat
class CandidatInfoDTO(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

# 2. Vigile pour la candidature
class CandidatureRecruteurDTO(serializers.ModelSerializer):
    candidat = CandidatInfoDTO(read_only=True) # On imbrique les infos du candidat
    
    class Meta:
        model = Candidature
        fields = ('id', 'candidat', 'date_postulation', 'lettre_motivation', 'statut')

# 3. Vigile pour l'offre (avec ses candidatures imbriquées)
class OffreDashboardDTO(serializers.ModelSerializer):
    candidatures = CandidatureRecruteurDTO(many=True, read_only=True)
    
    class Meta:
        model = OffreEmploi
        fields = ('id', 'titre', 'date_publication', 'est_active', 'candidatures')

class ProfilCandidatDTO(serializers.ModelSerializer):
    class Meta:
        model = ProfilCandidat
        fields = ('titre_professionnel', 'cv_pdf')