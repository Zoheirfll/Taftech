from rest_framework import serializers
from ..models import SiteAnnonce, BanniereAccueil


def _normaliser_url(valeur):
    """Auto-préfixe https:// si l'admin saisit une URL sans protocole (ex: 'google.com') —
    même pattern que linkedin/github ailleurs dans le projet, un URLField Django rejette
    sinon une saisie naturelle sans scheme."""
    valeur = (valeur or '').strip()
    if valeur and not valeur.startswith(('http://', 'https://')):
        valeur = f'https://{valeur}'
    return valeur


def _normaliser_lien_url(data):
    """Normalise data['lien_url'] en place, sans changer le TYPE de `data` — un multipart
    contient aussi le fichier 'image' sous forme de QueryDict/MultiValueDict ; le remplacer
    par un dict Python classique (via {**data, ...}) casse la détection DRF des champs
    fichier (is_html_input teste hasattr(data, 'getlist')), ce qui fait échouer l'upload
    d'image dès que lien_url est rempli en même temps. On mute donc une copie du QueryDict
    (QueryDict.copy() reste un QueryDict mutable) au lieu de le remplacer par un dict."""
    if not (hasattr(data, 'get') and data.get('lien_url')):
        return data
    valeur = _normaliser_url(data.get('lien_url'))
    if hasattr(data, 'copy') and hasattr(data, 'getlist'):
        data = data.copy()
        data['lien_url'] = valeur
    else:
        data = {**data, 'lien_url': valeur}
    return data


class SiteAnnonceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteAnnonce
        fields = ['id', 'texte', 'lien_url', 'lien_label', 'type_annonce', 'actif']

    def to_internal_value(self, data):
        return super().to_internal_value(_normaliser_lien_url(data))


class BanniereAccueilSerializer(serializers.ModelSerializer):
    class Meta:
        model = BanniereAccueil
        fields = ['id', 'image', 'titre', 'lien_url', 'ordre', 'actif']

    def to_internal_value(self, data):
        return super().to_internal_value(_normaliser_lien_url(data))
