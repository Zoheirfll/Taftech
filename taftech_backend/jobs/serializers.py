from rest_framework import serializers
from .models import OffreEmploi, ProfilEntreprise

class EntrepriseSimpleSerializer(serializers.ModelSerializer):
    """Un petit DTO pour afficher juste le nom et la wilaya de l'entreprise dans l'offre."""
    class Meta:
        model = ProfilEntreprise
        fields = ('nom_entreprise', 'wilaya_siege')

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