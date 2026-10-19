"""Détection par motifs des données personnelles (sans modèle spaCy : avec_ner=False)."""
from django.test import SimpleTestCase

from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte


def nettoyer(texte):
    return nettoyer_texte(texte, avec_ner=False)


class MotifsDetectionTest(SimpleTestCase):
    def test_email_masque(self):
        r = nettoyer("Contact : zoheir.fll31@gmail.com")
        self.assertNotIn("zoheir", r.texte)
        self.assertIn("[EMAIL]", r.texte)
        self.assertEqual(r.categories["EMAIL"], 1)

    def test_telephones_algeriens_masques(self):
        for numero in ("0555 12 34 56", "05.55.12.34.56", "+213 555 12 34 56",
                       "00213555123456", "0555123456", "041 12 34 56"):
            with self.subTest(numero=numero):
                r = nettoyer(f"Tél : {numero}")
                self.assertIn("[TÉLÉPHONE]", r.texte)
                self.assertNotRegex(r.texte, r"\d{2}[\s.]?\d{2}[\s.]?\d{2}")

    def test_urls_personnelles_masquees(self):
        r = nettoyer("https://www.linkedin.com/in/zoheir-fll et github.com/Zoheirfll")
        self.assertNotIn("zoheir-fll", r.texte)
        self.assertNotIn("Zoheirfll", r.texte)
        self.assertEqual(r.categories["URL"], 2)

    def test_nin_masque(self):
        r = nettoyer("NIN : 109876543210987654")
        self.assertIn("[NIN]", r.texte)
        self.assertNotIn("109876543210987654", r.texte)

    def test_numero_de_passeport_masque_mais_pas_la_mention(self):
        r = nettoyer("Passeport valide n° 12AB34567")
        self.assertIn("Passeport valide", r.texte)
        self.assertNotIn("12AB34567", r.texte)

    def test_mention_passeport_sans_numero_conservee(self):
        texte = "Passeport valide jusqu'en 2027"
        self.assertEqual(nettoyer(texte).texte, texte)

    def test_date_de_naissance_masquee(self):
        for texte in ("Né le 12/03/1990 à Oran", "Date de naissance : 5 mars 1990"):
            with self.subTest(texte=texte):
                r = nettoyer(texte)
                self.assertIn("[DATE_NAISSANCE]", r.texte)
                self.assertNotIn("1990", r.texte)

    def test_adresse_masquee(self):
        for texte in ("Adresse : 12 rue des Frères Bouadou, Oran",
                      "12 Rue Didouche Mourad, Alger"):
            with self.subTest(texte=texte):
                r = nettoyer(texte)
                self.assertIn("[ADRESSE]", r.texte)
                self.assertNotIn("Didouche", r.texte)
                self.assertNotIn("Bouadou", r.texte)

    def test_texte_ordinaire_inchange(self):
        for texte in ("Développeur Python 2019 - 2023", "Master 2 ADSI",
                      "Mise en route du projet en 2021"):
            with self.subTest(texte=texte):
                self.assertEqual(nettoyer(texte).texte, texte)

    def test_section_references_supprimee_et_suite_conservee(self):
        cv = "RÉFÉRENCES\nM. Ali Ben — 0555 12 34 56\nSociété X\n\nLANGUES\nFrançais"
        r = nettoyer(cv)
        self.assertNotIn("Ali Ben", r.texte)
        self.assertNotIn("0555", r.texte)
        self.assertIn("LANGUES", r.texte)
        self.assertIn("Français", r.texte)
        self.assertEqual(r.categories["REFERENCES"], 1)

    def test_deterministe(self):
        cv = "Contact : a@b.dz\nTél 0555 12 34 56"
        self.assertEqual(nettoyer(cv), nettoyer(cv))

    def test_texte_vide(self):
        self.assertEqual(nettoyer("").texte, "")
        self.assertEqual(nettoyer(None).texte, "")
