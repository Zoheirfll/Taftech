from rest_framework import serializers
from ..models import SiteAnnonce, BanniereAccueil


class SiteAnnonceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteAnnonce
        fields = ['id', 'texte', 'lien_url', 'lien_label', 'type_annonce', 'actif']


class BanniereAccueilSerializer(serializers.ModelSerializer):
    class Meta:
        model = BanniereAccueil
        fields = ['id', 'image', 'titre', 'lien_url', 'ordre', 'actif']
