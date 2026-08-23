from rest_framework import serializers
from ..models import Palier


class PalierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Palier
        fields = [
            'id', 'nom', 'prix_mensuel_da', 'prix_annuel_da', 'remise_annuelle_active',
            'limite_offres', 'limite_cv_mois', 'acces_coordonnees', 'acces_ia_recommandes',
            'acces_ia_avancee', 'acces_equipe', 'support_label', 'ordre', 'actif',
        ]
