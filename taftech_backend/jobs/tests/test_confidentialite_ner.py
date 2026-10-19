"""Reconnaissance de noms/lieux (spaCy fr_core_news_md installé en Task 1) et échec fermé."""
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from jobs.confidentialite_ia.ner import ModeleNerIndisponible
from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte


class NerTest(SimpleTestCase):
    def test_nom_dans_le_texte_masque(self):
        r = nettoyer_texte("J'ai travaillé avec Jean Dupont sur ce projet.")
        self.assertNotIn("Dupont", r.texte)
        self.assertIn("[NOM]", r.texte)

    def test_lieu_masque_dans_l_entete_seulement(self):
        entete = "Jean Dupont\nOran, Algérie\n"
        corps = "x " * 400 + "Mission réalisée à Alger pour un client."
        r = nettoyer_texte(entete + corps)
        self.assertNotIn("Oran", r.texte)
        self.assertIn("Alger", r.texte)  # hors en-tête : conservé (utile à l'analyse)

    def test_noms_connus_masques_sans_modele(self):
        r = nettoyer_texte("Karim BENALI, ingénieur", avec_ner=False, noms_connus=("Karim", "Benali"))
        self.assertNotIn("Karim", r.texte)
        self.assertNotIn("BENALI", r.texte)

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    def test_ner_desactive_ne_masque_pas_les_noms_inconnus(self):
        self.assertIn("Dupont", nettoyer_texte("Jean Dupont").texte)

    def test_echec_ferme_si_modele_absent(self):
        with patch("jobs.confidentialite_ia.ner._charger", side_effect=ModeleNerIndisponible("absent")):
            with self.assertRaises(ModeleNerIndisponible):
                nettoyer_texte("Jean Dupont")
