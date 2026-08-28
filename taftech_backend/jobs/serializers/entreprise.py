from rest_framework import serializers
from ..models import ProfilEntreprise, EntreprisePhoto


class EntreprisePhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntreprisePhoto
        fields = ('id', 'image', 'legende', 'date_ajout')


class EntrepriseDashboardDetailSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    telephone = serializers.CharField(source='user.telephone', read_only=True)
    intitule_poste = serializers.CharField(source='user.intitule_poste', read_only=True)
    photos = EntreprisePhotoSerializer(many=True, read_only=True)
    palier_actif = serializers.SerializerMethodField()

    def get_palier_actif(self, obj):
        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(obj)
        return palier.nom if palier else None

    class Meta:
        model = ProfilEntreprise
        fields = (
            'id', 'slug', 'nom_entreprise', 'secteur_activite', 'registre_commerce',
            'wilaya_siege', 'commune_siege', 'adresse_complete', 'taille_entreprise', 'logo',
            'banniere', 'culture_entreprise', 'annee_creation', 'linkedin', 'site_web', 'photos',
            'description', 'est_approuvee', 'mise_en_avant_accueil', 'palier_actif',
            'first_name', 'last_name', 'email', 'telephone', 'intitule_poste'
        )