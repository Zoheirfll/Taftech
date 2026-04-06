from rest_framework import serializers
from .models import OffreEmploi, ProfilEntreprise
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