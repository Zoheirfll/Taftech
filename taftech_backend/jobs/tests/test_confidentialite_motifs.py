"""Détection par motifs des données personnelles (sans modèle spaCy : avec_ner=False)."""
import time

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


class DurcissementRevueSecuriteTest(SimpleTestCase):
    """Corrections de la revue de sécurité du 19/10/2026."""

    def test_entrees_hostiles_restent_rapides(self):
        """Un fichier téléversé ne doit pas pouvoir bloquer un worker (motifs à temps quadratique)."""
        hostiles = [
            "a" * 100000, "1" + " " * 50000, "x@" * 20000, "cni " + "A" * 50000,
            "né" + " " * 50000 + "le", "adresse" + " " * 50000, "référence" + " " * 50000 + "x",
            "1234 " * 20000, "né à " + "b" * 50000, "0550 " * 20000,
        ]
        for texte in hostiles:
            with self.subTest(debut=texte[:14]):
                debut = time.monotonic()
                nettoyer(texte)
                self.assertLess(time.monotonic() - debut, 3.0)

    def test_texte_borne_avant_analyse(self):
        from jobs.confidentialite_ia.pseudonymisation import LONGUEUR_MAX_ANALYSE
        self.assertLessEqual(len(nettoyer("a" * (LONGUEUR_MAX_ANALYSE * 3)).texte), LONGUEUR_MAX_ANALYSE)

    def test_naissance_avec_le_lieu(self):
        r = nettoyer("Né à Oran, le 02/03/1995")
        self.assertIn("[DATE_NAISSANCE]", r.texte)
        self.assertNotIn("1995", r.texte)

    def test_telephones_autres_ecritures(self):
        for numero in ("0550 123 456", "(0550) 12 34 56", "+213 (0)550 12 34 56", "0550/12/34/56",
                       "+33 6 12 34 56 78"):
            with self.subTest(numero=numero):
                r = nettoyer(f"Tél {numero}")
                self.assertIn("[TÉLÉPHONE]", r.texte)
                self.assertNotRegex(r.texte, r"\d")

    def test_nin_avec_separateurs(self):
        r = nettoyer("NIN 1234 5678 9012 3456 78")
        self.assertIn("[NIN]", r.texte)
        self.assertNotIn("3456", r.texte)

    def test_liens_personnels_hors_linkedin_et_github(self):
        for lien in ("facebook.com/john.doe", "t.me/johndoe", "mon-site.dz/cv/moi"):
            with self.subTest(lien=lien):
                r = nettoyer(f"Profil : {lien}")
                self.assertIn("[URL]", r.texte)
                self.assertNotIn("john", r.texte.lower().replace("[url]", ""))

    def test_dates_et_annees_ne_sont_pas_prises_pour_un_telephone(self):
        for texte in ("Expérience 2018 2019 2020 2021", "Du 01/03/2020 - 12/06/2021", "2018-2019-2020 et 2021",
                      "Version 3.12.1 déployée en 2024"):
            with self.subTest(texte=texte):
                self.assertEqual(nettoyer(texte).texte, texte)

    def test_la_fusion_etend_la_detection_en_cas_de_chevauchement(self):
        from jobs.confidentialite_ia.modeles import Detection
        from jobs.confidentialite_ia.pseudonymisation import fusionner
        resultat = fusionner([Detection(0, 5, "NOM"), Detection(3, 10, "TELEPHONE")])
        self.assertEqual(resultat, [Detection(0, 10, "NOM")])


class UrlCoupeeEnFinDeLigneTest(SimpleTestCase):
    """Un lien LinkedIn que le PDF coupe après un tiret ne doit pas laisser son identifiant en clair
    (CV réel du 22/10/2026 : « -a3257762 » restait visible)."""

    def test_lien_linkedin_coupe_apres_un_tiret_est_masque_en_entier(self):
        from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte
        texte = "Oran 0559 71 27 11 linkedin.com/in/rafik-mohammed-\nboumaza-a3257762\nPROFIL EXECUTIF\n"
        r = nettoyer_texte(texte, avec_ner=False)
        self.assertNotIn("a3257762", r.texte)
        self.assertIn("\nPROFIL EXECUTIF", r.texte)  # la ligne suivante n'est pas absorbée

    def test_lien_linkedin_coupe_est_extrait_en_entier_pour_le_profil(self):
        from jobs.confidentialite_ia.coordonnees import extraire_coordonnees
        texte = "Oran 0559 71 27 11 linkedin.com/in/rafik-mohammed-\nboumaza-a3257762\nPROFIL EXECUTIF\n"
        c = extraire_coordonnees(texte, avec_ner=False)
        self.assertEqual(c["linkedin"], "linkedin.com/in/rafik-mohammed-boumaza-a3257762")

    def test_lien_normal_ne_mange_pas_la_ligne_suivante(self):
        from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte
        r = nettoyer_texte("linkedin.com/in/jean-dupont\nPROFIL", avec_ner=False)
        self.assertIn("\nPROFIL", r.texte)
