from rest_framework import serializers
from ..models import AIConfig


CHAMPS_PROMPT = (
    'parser_cv_prompt', 'analyse_carriere_prompt', 'analyse_recruteur_prompt',
    'generation_offre_prompt', 'conseils_dashboard_prompt',
)
# Plafond global et seuil d'alerte : réglage de coût réservé au Super Admin (lecture seule pour l'admin).
CHAMPS_BUDGET = ('budget_ia_appels_mois_max', 'budget_ia_alerte_pct')
# Fournisseur, modèles et réglages de génération : changer de modèle modifie le coût et peut envoyer
# les données candidat vers un autre fournisseur ; `max_tokens` borne la dépense par appel (le plafond
# global compte des appels, pas des tokens) ; température et effort de raisonnement changent le
# comportement et le coût de toutes les réponses. Réservés au Super Admin (lecture seule pour l'admin).
CHAMPS_MODELE = (
    'provider', 'groq_model', 'ollama_model', 'temperature', 'reasoning_effort',
    'parser_cv_max_tokens', 'analyse_carriere_max_tokens', 'analyse_recruteur_max_tokens',
    'generation_offre_max_tokens', 'conseils_dashboard_max_tokens',
)


class AIConfigSerializer(serializers.ModelSerializer):
    # Lecture seule : consommation IA du mois en cours, pour la jauge « x / plafond » de l'admin.
    appels_ia_mois = serializers.SerializerMethodField()

    def get_appels_ia_mois(self, obj):
        from ..ia_quota import appels_ia_du_mois
        return appels_ia_du_mois()

    class Meta:
        model = AIConfig
        fields = [
            'id', 'provider', 'groq_model', 'ollama_model', 'temperature', 'reasoning_effort',
            'parser_cv_actif', 'parser_cv_max_tokens', 'parser_cv_prompt',
            'parser_cv_limite_jour', 'parser_cv_limite_mois',
            'analyse_carriere_actif', 'analyse_carriere_max_tokens', 'analyse_carriere_prompt',
            'analyse_carriere_limite_jour', 'analyse_carriere_limite_mois',
            'analyse_recruteur_actif', 'analyse_recruteur_max_tokens', 'analyse_recruteur_prompt',
            'generation_offre_actif', 'generation_offre_max_tokens', 'generation_offre_prompt',
            'conseils_dashboard_actif', 'conseils_dashboard_max_tokens', 'conseils_dashboard_prompt',
            'conseils_dashboard_limite_jour', 'conseils_dashboard_limite_mois',
            'budget_ia_appels_mois_max', 'budget_ia_alerte_pct', 'appels_ia_mois',
            'date_modification',
        ]
