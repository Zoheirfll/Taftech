from rest_framework import serializers
from ..models import AIConfig


class AIConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConfig
        fields = [
            'id', 'provider', 'groq_model', 'ollama_model', 'temperature', 'reasoning_effort',
            'parser_cv_actif', 'parser_cv_max_tokens',
            'analyse_carriere_actif', 'analyse_carriere_max_tokens',
            'analyse_recruteur_actif', 'analyse_recruteur_max_tokens',
            'generation_offre_actif', 'generation_offre_max_tokens',
            'date_modification',
        ]
