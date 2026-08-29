from rest_framework import serializers
from ..models import CreditPack


class CreditPackSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditPack
        fields = ['id', 'nom', 'credits', 'prix_da', 'actif', 'ordre']
