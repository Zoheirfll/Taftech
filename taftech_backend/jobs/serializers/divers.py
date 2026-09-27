from rest_framework import serializers
from ..models import (
    OffreSauvegardee, AlerteEmploi, Notification,
    CandidatureSpontanee
)
from .offres import OffreEmploiSerializer


class OffreSauvegardeeSerializer(serializers.ModelSerializer):
    offre_detail = OffreEmploiSerializer(source='offre', read_only=True)

    class Meta:
        model = OffreSauvegardee
        fields = ['id', 'offre', 'offre_detail', 'date_sauvegarde']


class AlerteEmploiSerializer(serializers.ModelSerializer):
    nb_nouvelles_offres = serializers.SerializerMethodField()
    offres_nouvelles = serializers.SerializerMethodField()

    class Meta:
        model = AlerteEmploi
        fields = ['id', 'mots_cles', 'wilaya', 'frequence', 'date_creation', 'est_active', 'derniere_consultation', 'nb_nouvelles_offres', 'offres_nouvelles']

    def _qs_nouvelles_offres(self, obj):
        from django.db.models import Q
        from ..models import OffreEmploi
        depuis = obj.derniere_consultation or obj.date_creation
        qs = OffreEmploi.objects.filter(
            est_active=True, statut_moderation='APPROUVEE', est_cloturee=False,
            date_publication__gt=depuis,
        ).select_related('entreprise')
        if obj.mots_cles:
            qs = qs.filter(Q(titre__icontains=obj.mots_cles) | Q(missions__icontains=obj.mots_cles))
        if obj.wilaya:
            qs = qs.filter(wilaya__icontains=obj.wilaya)
        return qs.order_by('-date_publication')

    def get_nb_nouvelles_offres(self, obj):
        return self._qs_nouvelles_offres(obj).count()

    def get_offres_nouvelles(self, obj):
        """Détail des offres qui alimentent nb_nouvelles_offres — pour que le candidat voie
        concrètement ce qui a été trouvé (pas seulement un compteur), sur la page /alertes."""
        return [
            {
                'id': o.id,
                'titre': o.titre,
                'entreprise': o.entreprise.nom_entreprise,
                'wilaya': o.wilaya,
                'date_publication': o.date_publication,
            }
            for o in self._qs_nouvelles_offres(obj)[:20]
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type_notif', 'titre', 'message', 'lue', 'date_creation', 'lien']


class CandidatureSpontaneeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidatureSpontanee
        fields = [
            'id', 'nom', 'prenom', 'email', 'telephone',
            'wilaya', 'diplome', 'specialite', 'cv',
            'lettre_motivation', 'date_envoi', 'lue'
        ]
        read_only_fields = ['date_envoi', 'lue']