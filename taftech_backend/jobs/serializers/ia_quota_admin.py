from rest_framework import serializers
from ..models import QuotaIAOverride


class QuotaIAOverrideSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    fonction_libelle = serializers.CharField(source='get_fonction_display', read_only=True)

    class Meta:
        model = QuotaIAOverride
        fields = [
            'id', 'user', 'user_email', 'fonction', 'fonction_libelle',
            'limite_jour', 'limite_mois', 'justification', 'date_creation',
        ]
        read_only_fields = ['date_creation']
