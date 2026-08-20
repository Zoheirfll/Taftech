from rest_framework import serializers
from ..models import PremiumPlan, PremiumAvantage, FaqItem, CompetenceReferentiel


class PremiumPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumPlan
        fields = ['id', 'nb_mois', 'label', 'prix_da', 'populaire', 'actif', 'ordre']


class PremiumAvantageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumAvantage
        fields = ['id', 'icone', 'titre', 'description', 'ordre', 'actif']


class FaqItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqItem
        fields = ['id', 'categorie', 'question', 'reponse', 'ordre', 'actif']


class CompetenceReferentielSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetenceReferentiel
        fields = ['id', 'label', 'actif']
