"""CV en arabe : chiffres arabo-indiens, mots-clés arabes, échec fermé, noms par Stanza."""
from unittest import skipUnless
from unittest.mock import patch

from django.test import SimpleTestCase

from jobs.confidentialite_ia.ner import ModeleNerIndisponible
from jobs.confidentialite_ia.ner_arabe import normaliser_chiffres, proportion_arabe
from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte

try:
    import stanza  # noqa: F401
    STANZA = True
except ImportError:
    STANZA = False


class ArabeMotifsTest(SimpleTestCase):
    def test_normalisation_chiffres_conserve_la_longueur(self):
        brut = "٠٥٥٥ ١٢ ٣٤ ٥٦"
        self.assertEqual(normaliser_chiffres(brut), "0555 12 34 56")
        self.assertEqual(len(normaliser_chiffres(brut)), len(brut))

    def test_telephone_en_chiffres_arabes_masque(self):
        r = nettoyer_texte("الهاتف: ٠٥٥٥ ١٢ ٣٤ ٥٦", avec_ner=False)
        self.assertIn("[TÉLÉPHONE]", r.texte)
        self.assertNotIn("٠٥٥٥", r.texte)

    def test_adresse_arabe_masquee(self):
        r = nettoyer_texte("العنوان: 12 شارع ديدوش مراد، الجزائر", avec_ner=False)
        self.assertIn("[ADRESSE]", r.texte)
        self.assertNotIn("ديدوش", r.texte)

    def test_date_de_naissance_arabe_masquee(self):
        r = nettoyer_texte("تاريخ الميلاد: ١٢/٠٣/١٩٩٠", avec_ner=False)
        self.assertIn("[DATE_NAISSANCE]", r.texte)
        self.assertNotIn("١٩٩٠", r.texte)

    def test_section_references_arabe_supprimee(self):
        cv = "المراجع\nالسيد علي — ٠٥٥٥ ١٢ ٣٤ ٥٦\n\nاللغات\nالفرنسية"
        r = nettoyer_texte(cv, avec_ner=False)
        self.assertNotIn("علي", r.texte)
        self.assertIn("اللغات", r.texte)

    def test_proportion_arabe(self):
        self.assertGreater(proportion_arabe("مرحبا بالعالم"), 0.9)
        self.assertEqual(proportion_arabe("Hello world"), 0.0)
        self.assertEqual(proportion_arabe(""), 0.0)

    def test_chiffres_pleine_chasse_normalises(self):
        r = nettoyer_texte("Tél : ０５５５ １２ ３４ ５６", avec_ner=False)
        self.assertIn("[TÉLÉPHONE]", r.texte)

    def test_nom_arabe_isole_dans_un_cv_francais_declenche_la_detection_arabe(self):
        """Un en-tête arabe dans un CV surtout français reste sous 5 % des lettres, mais doit quand
        même déclencher Stanza (sinon le nom partirait en clair)."""
        from jobs.confidentialite_ia.ner_arabe import contient_arabe, proportion_arabe
        cv = ("الاسم : محمد بن علي الجزائري\n" + "Ingénieur logiciel, développement d'applications web. " * 40)
        self.assertLess(proportion_arabe(cv), 0.05)
        self.assertTrue(contient_arabe(cv))
        self.assertFalse(contient_arabe("Ingénieur logiciel " * 40))
        with patch("jobs.confidentialite_ia.ner_arabe._charger_arabe", side_effect=ModeleNerIndisponible("x")), \
                patch("jobs.confidentialite_ia.ner.entites_ner", return_value=[]):
            with self.assertRaises(ModeleNerIndisponible):
                nettoyer_texte(cv)

    def test_texte_francais_inchange_par_la_normalisation(self):
        self.assertEqual(nettoyer_texte("Développeur Python 2019", avec_ner=False).texte, "Développeur Python 2019")


class ArabeEchecFermeTest(SimpleTestCase):
    def test_modele_arabe_absent_aucun_nettoyage(self):
        with patch("jobs.confidentialite_ia.ner_arabe._charger_arabe", side_effect=ModeleNerIndisponible("x")), \
                patch("jobs.confidentialite_ia.ner.entites_ner", return_value=[]):
            with self.assertRaises(ModeleNerIndisponible):
                nettoyer_texte("يعمل أحمد بن علي في وهران")

    def test_cv_latin_n_exige_pas_stanza(self):
        with patch("jobs.confidentialite_ia.ner_arabe._charger_arabe", side_effect=ModeleNerIndisponible("x")), \
                patch("jobs.confidentialite_ia.ner.entites_ner", return_value=[]):
            nettoyer_texte("Développeur Python")  # ne lève pas


@skipUnless(STANZA, "Stanza non installé")
class ArabeStanzaTest(SimpleTestCase):
    def test_nom_arabe_masque(self):
        r = nettoyer_texte("أحمد بن علي\nمهندس برمجيات يعمل مع محمد الأمين على مشروع كبير")
        self.assertIn("[NOM]", r.texte)
