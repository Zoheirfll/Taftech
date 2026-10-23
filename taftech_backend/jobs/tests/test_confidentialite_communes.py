"""Masquage des communes et wilayas d'Algérie dans tout le CV (23/10/2026), par le fichier
`jobs/data/communes_algerie.json` : « El Kerma » citée dans une expérience doit disparaître comme l'adresse."""
import time

from django.test import SimpleTestCase

from jobs.confidentialite_ia.patterns import trouver_communes
from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte


def _masque(texte):
    return nettoyer_texte(texte, avec_ner=False).texte


class CommunesMasqueesTest(SimpleTestCase):
    def test_commune_d_une_experience_masquee(self):
        self.assertEqual(_masque("Direction du Commerce - El Kerma"), "Direction du Commerce - [LIEU]")

    def test_majuscules_tiret_et_accents_reconnus(self):
        texte = _masque("EL-KERMA ; Médéa ; MEDEA ; Sidi Bel Abbès")
        self.assertNotIn("KERMA", texte)
        self.assertNotIn("dé", texte)
        self.assertNotIn("Abb", texte)

    def test_apostrophe_de_l_article_conservee_et_lieu_masque(self):
        self.assertEqual(_masque("Stage d'Oran"), "Stage d'[LIEU]")

    def test_nom_compose_avec_apostrophe(self):
        self.assertNotIn("mel", _masque("Mission à Hassi R'mel"))

    def test_nom_arabe_masque(self):
        self.assertNotIn("وهران", _masque("نشاط في وهران"))

    def test_un_mot_courant_n_est_pas_masque(self):
        texte = "Word Excel Python HTML5 Still Sour"
        self.assertEqual(_masque(texte), texte)

    def test_un_mot_qui_contient_un_nom_de_commune_n_est_pas_masque(self):
        self.assertEqual(_masque("Orange et Oranges"), "Orange et Oranges")

    def test_le_plus_long_nom_l_emporte(self):
        # « Sidi Bel Abbès » est une seule commune : un seul masque, pas un par mot.
        self.assertEqual(_masque("Sidi Bel Abbès").count("[LIEU]"), 1)

    def test_positions_pointent_sur_le_texte_d_origine(self):
        texte = "Poste à Médéa."
        (debut, fin), = trouver_communes(texte)
        self.assertEqual(texte[debut:fin], "Médéa")


class CommunesContenuHostileTest(SimpleTestCase):
    def test_texte_hostile_reste_rapide(self):
        # Revue de sécurité : la recherche doit rester linéaire sur un contenu répétitif (30 000 caractères).
        for texte in ("a" * 30000, "el " * 10000, "ain  - " * 4000, "Sidi " * 6000):
            debut = time.monotonic()
            trouver_communes(texte)
            self.assertLess(time.monotonic() - debut, 3)
