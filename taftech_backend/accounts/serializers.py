from rest_framework import serializers
from .models import CustomUser

class RegisterCandidatDTO(serializers.ModelSerializer):
    """
    DTO pour la validation des données d'inscription d'un candidat.
    """
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = CustomUser
        fields = ('email', 'username', 'password', 'nin', 'telephone', 'consentement_loi_18_07')

    # Validation spécifique : Le candidat DOIT accepter la loi 18-07
    def validate_consentement_loi_18_07(self, value):
        if value is not True:
            raise serializers.ValidationError("Le consentement à la protection des données (Loi 18-07) est obligatoire.")
        return value

    # Validation spécifique : Le NIN doit faire exactement 18 caractères (si fourni)
    def validate_nin(self, value):
        if value and len(value) != 18:
            raise serializers.ValidationError("Le NIN doit contenir exactement 18 caractères.")
        return value