from rest_framework import serializers
from ..models import FaqItem, CompetenceReferentiel


class FaqItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqItem
        fields = ['id', 'categorie', 'question', 'reponse', 'ordre', 'actif']


class CompetenceReferentielSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetenceReferentiel
        fields = ['id', 'label', 'actif']
