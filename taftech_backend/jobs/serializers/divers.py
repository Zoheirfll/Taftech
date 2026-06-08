from rest_framework import serializers
from ..models import (
    OffreSauvegardee, AlerteEmploi, Notification,
    CandidatureSpontanee, MetierReferentiel
)
from .offres import OffreEmploiSerializer


class OffreSauvegardeeSerializer(serializers.ModelSerializer):
    offre_detail = OffreEmploiSerializer(source='offre', read_only=True)

    class Meta:
        model = OffreSauvegardee
        fields = ['id', 'offre', 'offre_detail', 'date_sauvegarde']


class AlerteEmploiSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlerteEmploi
        fields = ['id', 'mots_cles', 'wilaya', 'frequence', 'date_creation', 'est_active']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type_notif', 'titre', 'message', 'lue', 'date_creation']


class CandidatureSpontaneeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidatureSpontanee
        fields = [
            'id', 'nom', 'prenom', 'email', 'telephone',
            'wilaya', 'diplome', 'specialite', 'cv',
            'lettre_motivation', 'date_envoi', 'lue'
        ]
        read_only_fields = ['date_envoi', 'lue']


class MetierReferentielSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetierReferentiel
        fields = ['id', 'titre', 'secteur', 'niveau_experience', 'mots_cles', 'est_actif', 'date_creation']
        read_only_fields = ['date_creation']