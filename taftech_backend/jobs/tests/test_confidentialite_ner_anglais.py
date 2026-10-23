"""Masquage des noms dans un CV en anglais (nombreux en Algérie). Mesure du 23/10/2026 sur 60 CV
du corpus Kaggle : le modèle français seul faisait ≈ 5,6 faux positifs par CV et le modèle anglais
seul ratait « Amine Boudiaf » et coupait « Fatima Zohra Haddad » ; on combine donc les deux avec un
filtre de forme (mots capitalisés, sur une seule ligne)."""
from unittest.mock import patch

from django.test import SimpleTestCase

from jobs.confidentialite_ia import ner
from jobs.confidentialite_ia.langue import detecter_langue
from jobs.confidentialite_ia.ner import ModeleNerIndisponible
from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte

PARAGRAPHE_ANGLAIS = (
    "Maintained cash handling procedures and trained new staff, including cashiers.\n"
    "Reporting daily sales to the store manager and working with the team to improve service.\n"
)


def nettoyer(texte):
    return nettoyer_texte(texte, avec_ner=True)


class DetectionDeLangueTest(SimpleTestCase):
    def test_texte_anglais(self):
        self.assertEqual(detecter_langue(PARAGRAPHE_ANGLAIS), "en")

    def test_texte_francais(self):
        texte = "Responsable de la paie pour les employés de l'entreprise et chargé de la gestion des congés."
        self.assertEqual(detecter_langue(texte), "fr")

    def test_vide_arabe_ou_ambigu_reste_francais(self):
        for texte in ("", "المهندس يعمل في وهران مع الفريق", "Software Engineer\nOran"):
            with self.subTest(texte=texte):
                self.assertEqual(detecter_langue(texte), "fr")


class NomsDansUnCvAnglaisTest(SimpleTestCase):
    def test_noms_de_tiers_algeriens_masques_en_entier(self):
        texte = (PARAGRAPHE_ANGLAIS
                 + "My manager Mohamed Lamine Cherif supervised the team.\n"
                 + "Reference: Dr. Fatima Zohra Haddad, Head of Department\n")
        r = nettoyer(texte).texte
        for fragment in ("Cherif", "Lamine", "Haddad", "Zohra"):
            self.assertNotIn(fragment, r)

    def test_nom_en_majuscules_en_entete_masque(self):
        r = nettoyer("SARAH JOHNSON\nProject Manager\n" + PARAGRAPHE_ANGLAIS).texte
        self.assertNotIn("JOHNSON", r.upper())
        self.assertIn("Project Manager", r)

    def test_nom_de_l_entete_ne_deborde_pas_sur_l_intitule(self):
        r = nettoyer("Karim Benali\nSoftware Engineer\nOran, Algeria\n" + PARAGRAPHE_ANGLAIS).texte
        self.assertNotIn("Benali", r)
        self.assertIn("Software Engineer", r)

    def test_phrases_et_verbes_ne_sont_pas_masques(self):
        self.assertEqual(nettoyer(PARAGRAPHE_ANGLAIS).texte, PARAGRAPHE_ANGLAIS)

    def test_intitule_de_poste_en_majuscules_conserve(self):
        texte = "SUBSTITUTE TEACHER\nSummary\n" + PARAGRAPHE_ANGLAIS
        self.assertIn("SUBSTITUTE TEACHER", nettoyer(texte).texte)

    def test_modele_anglais_absent_leve_une_erreur(self):
        charger_reel = ner._charger

        def charger(langue="fr"):
            if langue == "en":
                raise ModeleNerIndisponible("absent")
            return charger_reel(langue)

        with patch("jobs.confidentialite_ia.ner._charger", side_effect=charger):
            with self.assertRaises(ModeleNerIndisponible):
                nettoyer("Contact: Nadir Hamdi\n" + PARAGRAPHE_ANGLAIS)
