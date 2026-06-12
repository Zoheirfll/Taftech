from rest_framework import serializers
from ..models import ProfilEntreprise


class EntrepriseDashboardDetailSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    telephone = serializers.CharField(source='user.telephone', read_only=True)

    class Meta:
        model = ProfilEntreprise
        fields = (
            'id', 'nom_entreprise', 'secteur_activite', 'registre_commerce',
            'wilaya_siege', 'commune_siege', 'taille_entreprise', 'logo',
            'description', 'est_approuvee', 'est_premium',
            'first_name', 'last_name', 'email', 'telephone'
        )