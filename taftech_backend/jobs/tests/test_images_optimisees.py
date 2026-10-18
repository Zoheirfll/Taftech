# test_images_optimisees.py — réduction, compression et nettoyage EXIF des images envoyées
import io
import shutil
import tempfile
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from jobs.image_utils import COTE_MAX
from jobs.models import Article, ProfilEntreprise

User = get_user_model()

ORIENTATION = 0x0112
MARQUE_APPAREIL = 0x010F


def _octets(image, format_image, **options):
    sortie = io.BytesIO()
    image.save(sortie, format_image, **options)
    return sortie.getvalue()


def _bruit(largeur, hauteur, mode='RGB'):
    return Image.effect_noise((largeur, hauteur), 80).convert(mode)


class OptimisationDesImagesTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media = tempfile.mkdtemp()
        cls._reglage = override_settings(MEDIA_ROOT=cls._media)
        cls._reglage.enable()

    @classmethod
    def tearDownClass(cls):
        cls._reglage.disable()
        shutil.rmtree(cls._media, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.user = User.objects.create_user(
            username='rec', email='rec@test.dz', password='Pass1234!', role='RECRUTEUR')

    def _entreprise(self, contenu, nom='logo.jpg', type_mime='image/jpeg'):
        return ProfilEntreprise.objects.create(
            user=self.user, nom_entreprise='TechCorp', secteur_activite='IT', registre_commerce='RC1',
            wilaya_siege='31 - Oran', logo=SimpleUploadedFile(nom, contenu, content_type=type_mime))

    def _lire(self, champ):
        with champ.open('rb') as f:
            return f.read()

    def _relire(self, champ):
        contenu = self._lire(champ)
        return contenu, Image.open(io.BytesIO(contenu))

    def test_grande_photo_reduite_et_plus_legere(self):
        origine = _octets(_bruit(3200, 2400), 'JPEG', quality=95)
        entreprise = self._entreprise(origine)
        contenu, image = self._relire(entreprise.logo)
        self.assertLessEqual(max(image.size), COTE_MAX)
        self.assertEqual(image.format, 'JPEG')
        self.assertLess(len(contenu), len(origine) / 2)
        self.assertEqual(round(image.size[0] / image.size[1], 2), round(3200 / 2400, 2))  # proportions gardées

    def test_png_transparent_garde_sa_transparence(self):
        origine = _octets(_bruit(2000, 1000, 'RGBA'), 'PNG')
        _, image = self._relire(self._entreprise(origine, 'logo.png', 'image/png').logo)
        self.assertEqual(image.format, 'PNG')
        self.assertEqual(image.mode, 'RGBA')
        self.assertLessEqual(max(image.size), COTE_MAX)

    def test_exif_retire_et_orientation_appliquee(self):
        exif = Image.Exif()
        exif[MARQUE_APPAREIL] = 'AppareilSecret'
        exif[ORIENTATION] = 6  # à pivoter de 90° pour s'afficher droite
        origine = _octets(_bruit(300, 100), 'JPEG', exif=exif.tobytes())
        contenu, image = self._relire(self._entreprise(origine).logo)
        self.assertEqual(image.size, (100, 300))
        self.assertFalse(image.getexif())
        self.assertNotIn(b'AppareilSecret', contenu)

    def test_fichier_illisible_conserve_tel_quel_sans_erreur(self):
        faux = b'ceci n est pas une image'
        self.assertEqual(self._lire(self._entreprise(faux).logo), faux)

    def test_gif_anime_non_touche(self):
        origine = _octets(_bruit(50, 50, 'P'), 'GIF', save_all=True,
                          append_images=[_bruit(50, 50, 'P')], duration=100, loop=0)
        entreprise = self._entreprise(origine, 'anim.gif', 'image/gif')
        self.assertEqual(self._lire(entreprise.logo), origine)

    def test_image_deja_enregistree_jamais_retraitee(self):
        entreprise = self._entreprise(_octets(_bruit(2400, 1800), 'JPEG', quality=95))
        nom, avant = entreprise.logo.name, self._lire(entreprise.logo)
        entreprise.nom_entreprise = 'Autre nom'
        entreprise.save()
        entreprise.refresh_from_db()
        self.assertEqual(entreprise.logo.name, nom)
        self.assertEqual(self._lire(entreprise.logo), avant)

    def test_couverture_d_article_optimisee_aussi(self):
        article = Article.objects.create(
            titre='Conseils', extrait='x', contenu_html='<p>x</p>', statut='PUBLIE',
            image_couverture=SimpleUploadedFile('couv.jpg', _octets(_bruit(3000, 2000), 'JPEG', quality=95),
                                                content_type='image/jpeg'))
        _, image = self._relire(article.image_couverture)
        self.assertLessEqual(max(image.size), COTE_MAX)

    def test_une_panne_d_optimisation_ne_bloque_jamais_l_envoi(self):
        origine = _octets(_bruit(300, 200), 'JPEG')
        with mock.patch('jobs.image_utils.optimiser_image', side_effect=RuntimeError('boom')):
            entreprise = self._entreprise(origine)
        self.assertEqual(self._lire(entreprise.logo), origine)
