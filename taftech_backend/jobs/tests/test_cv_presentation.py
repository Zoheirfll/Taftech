"""Repli local de la bio (23/10/2026) : quand l'IA rend une bio nulle, on reprend le paragraphe de présentation
écrit par le candidat, sous l'en-tête et avant la première section."""
from django.test import SimpleTestCase

from jobs.cv_parser.presentation import LONGUEUR_MAX, bio_de_presentation

ENTETE = "Camille DUPONT\nINGÉNIEUR LOGICIEL\nOran | 0550 12 34 56 |\ncamille@example.com\n"
PARAGRAPHE = (
    "Ingénieur logiciel rigoureux avec cinq ans d'expérience dans le développement web et les bases\n"
    "de données, je conçois des applications fiables et maintenables pour des équipes\n"
    "métier exigeantes.\n"
)


class BioDePresentationTest(SimpleTestCase):
    def test_paragraphe_sous_l_entete_repris(self):
        bio = bio_de_presentation(ENTETE + PARAGRAPHE + "EXPÉRIENCES PROFESSIONNELLES\n2020\n")
        self.assertTrue(bio.startswith("Ingénieur logiciel rigoureux"))
        self.assertTrue(bio.endswith("métier exigeantes."))

    def test_derniere_ligne_courte_du_paragraphe_conservee(self):
        deux_premieres_lignes = "\n".join(PARAGRAPHE.splitlines()[:2])
        texte = ENTETE + deux_premieres_lignes + "\nl'atteinte de vos objectifs.\nCOMPÉTENCES\nPython\n"
        self.assertTrue(bio_de_presentation(texte).endswith("l'atteinte de vos objectifs."))

    def test_sans_paragraphe_rien_n_est_invente(self):
        self.assertIsNone(bio_de_presentation(ENTETE + "EXPÉRIENCES\nPoste\n"))

    def test_les_contacts_ne_sont_jamais_repris(self):
        bio = bio_de_presentation(ENTETE + PARAGRAPHE + "FORMATIONS\n2020\n")
        for contact in ("0550", "@", "Oran |"):
            self.assertNotIn(contact, bio)

    def test_sans_titre_de_section_rien_n_est_repris(self):
        self.assertIsNone(bio_de_presentation(ENTETE + PARAGRAPHE))

    def test_paragraphe_trop_long_coupe_en_fin_de_phrase(self):
        long = "Une phrase complète et assez longue pour remplir la ligne du résumé. " * 20
        bio = bio_de_presentation(ENTETE + long.strip() + "\nEXPÉRIENCES\n2020\n")
        self.assertLessEqual(len(bio), LONGUEUR_MAX)
        self.assertTrue(bio.endswith("."))

    def test_texte_vide(self):
        self.assertIsNone(bio_de_presentation(""))
        self.assertIsNone(bio_de_presentation(None))
