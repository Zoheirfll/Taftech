from rest_framework import serializers
from ..models import Metier, SpecialiteFormation, TypeDiplome


class AdminMetierSerializer(serializers.ModelSerializer):
    groupe_libelle = serializers.CharField(source='groupe_principal.libelle', read_only=True, default=None)
    metier_canonique_libelle = serializers.CharField(source='metier_canonique.libelle', read_only=True, default=None)

    class Meta:
        model = Metier
        fields = ('id', 'code', 'libelle', 'granularite', 'groupe_libelle', 'metier_canonique_libelle', 'selectionnable', 'statut')
        read_only_fields = ('code', 'granularite')


class AdminSpecialiteFormationSerializer(serializers.ModelSerializer):
    domaine_libelle = serializers.CharField(source='domaine.libelle', read_only=True)
    filiere_libelle = serializers.CharField(source='filiere.libelle', read_only=True, default=None)

    class Meta:
        model = SpecialiteFormation
        fields = ('id', 'code', 'libelle', 'domaine_libelle', 'filiere_libelle', 'nature', 'selectionnable')
        read_only_fields = ('code', 'nature')


class AdminTypeDiplomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeDiplome
        fields = ('id', 'code', 'libelle', 'systeme', 'niveau_fp', 'selectionnable', 'diplome_formel')
        read_only_fields = ('code', 'systeme', 'niveau_fp')
