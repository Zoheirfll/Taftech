"""Optimisation des images envoyées (logos, bannières, photos de profil, couvertures d'article).

Avant : un utilisateur pouvait envoyer une photo de téléphone de 5 Mo et 4000 px, servie telle
quelle sur mobile (lente) avec ses données EXIF (position GPS, modèle de l'appareil).
Maintenant, à la sauvegarde d'un modèle, toute image NOUVELLEMENT envoyée est :
  - ramenée à `COTE_MAX` pixels de côté au plus ;
  - recompressée dans son format d'origine (JPEG, PNG, WebP : la transparence est conservée) ;
  - redressée selon son orientation EXIF puis privée de ses métadonnées EXIF.
Une image déjà enregistrée n'est jamais retraitée. En cas de problème (fichier illisible,
animation, format inconnu), l'original est conservé : l'optimisation ne bloque jamais un envoi.
"""
import io
import logging
import os

from django.core.files.base import ContentFile
from django.db.models import ImageField
from PIL import Image, ImageOps, UnidentifiedImageError

logger = logging.getLogger(__name__)

COTE_MAX = 1600
QUALITE = 82
FORMATS_OPTIMISES = {'JPEG', 'PNG', 'WEBP'}
APPS_CONCERNEES = {'jobs'}


def optimiser_image(fichier, cote_max=COTE_MAX):
    """Contenu optimisé (bytes) de l'image, ou None s'il faut garder l'original."""
    try:
        fichier.seek(0)
        taille_origine = len(fichier.read())
        fichier.seek(0)
        image = Image.open(fichier)
        image.load()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        return None
    format_image = image.format
    if format_image not in FORMATS_OPTIMISES or getattr(image, 'is_animated', False):
        return None

    avait_exif = bool(image.getexif())
    dimensions_origine = image.size
    image = ImageOps.exif_transpose(image)
    if max(image.size) > cote_max:
        image.thumbnail((cote_max, cote_max), Image.LANCZOS)

    sortie = io.BytesIO()
    if format_image == 'JPEG':
        image.convert('RGB').save(sortie, 'JPEG', quality=QUALITE, optimize=True, progressive=True)
    elif format_image == 'PNG':
        image.save(sortie, 'PNG', optimize=True)
    else:
        image.save(sortie, 'WEBP', quality=QUALITE, method=6)
    contenu = sortie.getvalue()

    # On garde la version retraitée si elle est plus légère, redimensionnée, ou si elle retire
    # des métadonnées personnelles ; sinon l'original est déjà optimal.
    if len(contenu) < taille_origine or image.size != dimensions_origine or avait_exif:
        return contenu
    return None


def optimiser_images_avant_sauvegarde(sender, instance, **kwargs):
    """`pre_save` : optimise chaque ImageField dont un nouveau fichier vient d'être envoyé."""
    if sender._meta.app_label not in APPS_CONCERNEES:
        return
    for champ in sender._meta.fields:
        if not isinstance(champ, ImageField):
            continue
        fichier = getattr(instance, champ.name)
        if not fichier or getattr(fichier, '_committed', True):
            continue  # vide, ou déjà enregistré : rien à faire
        try:
            contenu = optimiser_image(fichier.file)
            if contenu is not None:
                fichier.save(os.path.basename(fichier.name), ContentFile(contenu), save=False)
        except Exception:  # noqa: BLE001 — jamais bloquer un envoi pour une optimisation
            logger.exception("Optimisation d'image impossible (%s.%s), original conservé",
                             sender.__name__, champ.name)
