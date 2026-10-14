from rest_framework import serializers
from ..models import MentionsLegalesEntreprise

CHAMPS_EDITABLES = (
    'raison_sociale', 'forme_juridique', 'capital_social', 'registre_commerce', 'nif', 'nis', 'tva',
    'representant_legal', 'directeur_publication', 'hebergeur',
    'adresse', 'telephone', 'whatsapp', 'email_contact', 'horaires',
    'facebook_url', 'instagram_url', 'linkedin_url',
)


class InformationsSocieteSerializer(serializers.ModelSerializer):
    """Coordonnées et informations légales de la société (publiques par nature : elles figurent
    dans les mentions légales). Les validations (http(s) pour les liens, format du téléphone et
    de WhatsApp) viennent du modèle."""
    class Meta:
        model = MentionsLegalesEntreprise
        fields = CHAMPS_EDITABLES + ('date_modification',)
        read_only_fields = ('date_modification',)
