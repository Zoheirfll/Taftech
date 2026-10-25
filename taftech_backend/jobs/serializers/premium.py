from rest_framework import serializers
from ..models import FaqItem, CompetenceReferentiel


class FaqItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqItem
        fields = ['id', 'categorie', 'question', 'reponse', 'ordre', 'actif']


class CompetenceReferentielSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetenceReferentiel
        fields = ['id', 'label', 'synonymes', 'actif']


class CompetenceReferentielAdminSerializer(serializers.ModelSerializer):
    """Vue admin du référentiel de compétences (point 11) : statut du cycle de vie, origine,
    décision et usage réel. `statut`/`actif` sont en lecture seule ici : un changement de statut
    ne passe que par l'endpoint dédié (transitions contrôlées + journal d'audit), jamais par une
    écriture libre. Jamais exposé publiquement (l'autocomplete garde le serializer ci-dessus)."""
    nb_candidats = serializers.SerializerMethodField()
    nb_offres = serializers.SerializerMethodField()
    nb_metiers = serializers.SerializerMethodField()
    traite_par_nom = serializers.SerializerMethodField()
    transitions_possibles = serializers.SerializerMethodField()

    class Meta:
        model = CompetenceReferentiel
        fields = ['id', 'label', 'synonymes', 'actif', 'statut', 'origine', 'date_statut',
                  'traite_par_nom', 'nb_candidats', 'nb_offres', 'nb_metiers', 'transitions_possibles']
        read_only_fields = ['actif', 'statut', 'origine', 'date_statut']

    def get_nb_candidats(self, obj):
        from ..models import CompetenceCandidat
        return CompetenceCandidat.objects.filter(label__iexact=obj.label).values('profil_id').distinct().count()

    def get_nb_offres(self, obj):
        from ..models import CompetenceOffre
        return CompetenceOffre.objects.filter(label__iexact=obj.label).values('offre_id').distinct().count()

    def get_nb_metiers(self, obj):
        # Métiers auxquels la compétence est suggérée (0 = jamais proposée à un candidat ni à un recruteur).
        return obj.metiers_lies.count()

    def get_traite_par_nom(self, obj):
        return obj.traite_par.get_full_name() or obj.traite_par.email if obj.traite_par_id else None

    def get_transitions_possibles(self, obj):
        return sorted(CompetenceReferentiel.TRANSITIONS.get(obj.statut, set()))
