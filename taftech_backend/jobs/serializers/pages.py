from rest_framework import serializers
from ..models import PageStatique


class PageStatiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageStatique
        fields = ['id', 'slug', 'titre', 'contenu_html', 'date_modification']
