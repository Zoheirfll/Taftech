"""Point 3 : une date de fin donnée à l'année seule (« 2023 ») court jusqu'au 31/12 de cette année,
sans dépasser aujourd'hui ; les autres précisions (mois, jour) ne changent pas."""
import datetime
from types import SimpleNamespace

from django.test import SimpleTestCase

from jobs.matcher import _annees_experience


def _exp(debut, fin, precision="JOUR"):
    return SimpleNamespace(date_debut=debut, date_fin=fin, date_fin_precision=precision)


class AnneeSeuleTest(SimpleTestCase):
    def test_fin_en_annee_seule_vaut_le_31_decembre(self):
        annees, _, fin = _annees_experience(_exp(datetime.date(2021, 1, 1), datetime.date(2023, 1, 1), "ANNEE"))
        self.assertEqual(fin, datetime.date(2023, 12, 31))
        self.assertAlmostEqual(annees, 3.0, delta=0.02)

    def test_une_date_complete_ne_change_pas(self):
        annees, _, fin = _annees_experience(_exp(datetime.date(2021, 1, 1), datetime.date(2023, 1, 1), "JOUR"))
        self.assertEqual(fin, datetime.date(2023, 1, 1))
        self.assertAlmostEqual(annees, 2.0, delta=0.02)

    def test_une_date_au_mois_ne_change_pas(self):
        _, _, fin = _annees_experience(_exp(datetime.date(2021, 1, 1), datetime.date(2023, 3, 1), "MOIS"))
        self.assertEqual(fin, datetime.date(2023, 3, 1))

    def test_l_annee_en_cours_n_est_jamais_comptee_dans_le_futur(self):
        aujourdhui = datetime.date.today()
        _, _, fin = _annees_experience(_exp(datetime.date(aujourdhui.year - 1, 1, 1), datetime.date(aujourdhui.year, 1, 1), "ANNEE"))
        self.assertLessEqual(fin, aujourdhui)

    def test_un_poste_sans_fin_va_jusqu_a_aujourd_hui(self):
        _, _, fin = _annees_experience(_exp(datetime.date(2021, 1, 1), None, "ANNEE"))
        self.assertEqual(fin, datetime.date.today())
