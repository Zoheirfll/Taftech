"""Extraction du texte d'un CV PDF : caractères invisibles et regroupement par ligne (21/10/2026).

Cas réel : un CV exporté par un éditeur en ligne glisse un caractère de largeur nulle (U+200C) au milieu
des mots ; pdfplumber le lisait comme une espace (« Analy se », « HÔT ESSE ») et le masquage de
confidentialité prenait « Analy » pour un nom."""
from unittest import mock

from django.test import SimpleTestCase

from jobs.cv_parser.extraction import extract_text_from_pdf_smart


class _FausseDoc:
    def __init__(self, mots):
        self._page = mock.Mock()
        self._page.get_text.return_value = mots

    def __iter__(self):
        return iter([self._page])

    def close(self):
        pass


def _mot(x0, y0, texte, y1=None):
    return (x0, y0, x0 + 10, y1 if y1 is not None else y0 + 10, texte, 0, 0, 0)


class ExtractionTexteCvTests(SimpleTestCase):
    def _extraire(self, mots):
        with mock.patch("jobs.cv_parser.extraction.fitz.open", return_value=_FausseDoc(mots)):
            return extract_text_from_pdf_smart("faux.pdf")

    def test_caractere_invisible_au_milieu_d_un_mot_est_retire(self):
        texte = self._extraire([_mot(0, 0, "HÔT‌ESSE"), _mot(50, 0, "DE"), _mot(70, 0, "CAISSE‌")])
        self.assertEqual(texte.strip(), "HÔTESSE DE CAISSE")

    def test_mot_compose_uniquement_de_caracteres_invisibles_est_ecarte(self):
        texte = self._extraire([_mot(0, 0, "Analyse"), _mot(40, 0, "‌"), _mot(60, 0, "données")])
        self.assertEqual(texte.strip(), "Analyse données")

    def test_gras_et_normal_d_une_meme_ligne_restent_ensemble(self):
        # Le haut des mots varie avec la police : la ligne ne doit pas être coupée en deux.
        texte = self._extraire([
            _mot(0, 10.0, "Arabe", y1=20.0), _mot(40, 11.2, "Anglais", y1=21.2), _mot(90, 9.4, "Français", y1=19.4),
        ])
        self.assertEqual(texte.strip(), "Arabe Anglais Français")

    def test_lignes_distinctes_restent_separees_et_dans_l_ordre(self):
        texte = self._extraire([_mot(0, 40, "Formations"), _mot(0, 10, "Expériences"), _mot(60, 10, "professionnelles")])
        self.assertEqual(texte.splitlines(), ["Expériences professionnelles", "Formations"])

    def test_mois_colle_a_l_annee_est_separe(self):
        texte = self._extraire([_mot(0, 0, "Novembre2023")])
        self.assertEqual(texte.strip(), "Novembre 2023")
