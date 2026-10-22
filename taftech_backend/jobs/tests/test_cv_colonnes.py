"""Lecture des tableaux en colonnes d'un PDF (« Expertises clés », « Repères de performance ») colonne
par colonne, sans toucher aux lignes ordinaires (« TITRE … date », frises, en-têtes)."""
import os
import tempfile

import fitz
from django.test import SimpleTestCase

from jobs.cv_parser.colonnes import lignes_simples, regrouper_lignes
from jobs.cv_parser.extraction import extract_text_from_pdf_smart


def mot(x0, texte, largeur_caractere=5):
    return {"x0": x0, "x1": x0 + largeur_caractere * len(texte), "text": texte}


class RegrouperLignesTest(SimpleTestCase):
    def test_tableau_a_trois_colonnes_lu_colonne_par_colonne(self):
        lignes = [
            (100, [mot(70, "Management industriel"), mot(345, "Gestion de projets"), mot(620, "Industrialisation")]),
            (112, [mot(70, "Pilotage production"), mot(345, "Execution contractuelle"), mot(620, "Changements produit")]),
            (122, [mot(70, "plans d'action"), mot(345, "risques, couts"), mot(620, "documentation")]),
        ]
        self.assertEqual(regrouper_lignes(lignes), [
            "Management industriel", "Pilotage production", "plans d'action",
            "Gestion de projets", "Execution contractuelle", "risques, couts",
            "Industrialisation", "Changements produit", "documentation",
        ])

    def test_colonne_plus_courte_que_les_autres(self):
        lignes = [
            (100, [mot(70, "Titre A"), mot(345, "Titre B"), mot(620, "Titre C")]),
            (112, [mot(70, "Texte A1"), mot(345, "Texte B1"), mot(620, "Texte C1")]),
            (122, [mot(70, "Texte A2"), mot(620, "Texte C2")]),
        ]
        self.assertEqual(regrouper_lignes(lignes), [
            "Titre A", "Texte A1", "Texte A2", "Titre B", "Texte B1", "Titre C", "Texte C1", "Texte C2"])

    def test_chiffres_cles_centres_sous_leur_legende(self):
        lignes = [
            (100, [mot(170, "30 M$"), mot(330, "~500"), mot(550, "30"), mot(760, "-50 %")]),
            (112, [mot(105, "Contrat GE/SKE pilote sur site"), mot(281, "Operateurs integres au plan"),
                   mot(480, "Collaborateurs manages en atelier"), mot(700, "Risques securite reduits lors")]),
            (122, [mot(740, "d'une mission Kaizen")]),
        ]
        self.assertEqual(regrouper_lignes(lignes), [
            "30 M$", "Contrat GE/SKE pilote sur site", "~500", "Operateurs integres au plan",
            "30", "Collaborateurs manages en atelier", "-50 %", "Risques securite reduits lors",
            "d'une mission Kaizen"])

    def test_titre_et_date_sur_la_meme_ligne_ne_changent_pas(self):
        lignes = [
            (100, [mot(56, "VEHICLE TECHNICAL MANAGER"), mot(780, "2026")]),
            (112, [mot(64, "Stellantis Production El Djazair")]),
            (124, [mot(70, "- Pilotage des evolutions et changements techniques impactant les modeles fabriques")]),
        ]
        self.assertEqual(regrouper_lignes(lignes), lignes_simples(lignes))
        self.assertEqual(regrouper_lignes(lignes)[0], "VEHICLE TECHNICAL MANAGER 2026")

    def test_frise_a_deux_colonnes_ne_change_pas(self):
        lignes = [
            (100, [mot(56, "2019 - 2021"), mot(200, "Responsable logistique, Renault")]),
            (112, [mot(56, "2015 - 2019"), mot(200, "Organisateur industriel, Renault")]),
            (124, [mot(56, "2011 - 2015"), mot(200, "Ingenieur electronique, CERAL")]),
        ]
        self.assertEqual(regrouper_lignes(lignes), lignes_simples(lignes))

    def test_entete_de_contact_sur_une_ligne_reste_jointe(self):
        lignes = [
            (100, [mot(56, "Oran, Algerie"), mot(250, "0559 71 27 11"), mot(400, "mail@exemple.com"),
                   mot(600, "linkedin.com/in/rafik-")]),
            (110, [mot(600, "boumaza-a3257762")]),
        ]
        self.assertEqual(regrouper_lignes(lignes), lignes_simples(lignes))

    def test_titre_de_section_apres_le_tableau_n_est_pas_absorbe(self):
        lignes = [
            (100, [mot(70, "Titre A"), mot(345, "Titre B"), mot(620, "Titre C")]),
            (112, [mot(70, "Texte A"), mot(345, "Texte B"), mot(620, "Texte C")]),
            (160, [mot(70, "REPERES")]),
        ]
        sortie = regrouper_lignes(lignes)
        self.assertEqual(sortie[-1], "REPERES")
        self.assertEqual(len(sortie), 7)

    def test_ligne_pleine_largeur_apres_le_tableau_n_est_pas_absorbee(self):
        lignes = [
            (100, [mot(70, "Titre A"), mot(345, "Titre B"), mot(620, "Titre C")]),
            (112, [mot(70, "Texte A"), mot(345, "Texte B"), mot(620, "Texte C")]),
            (122, [mot(70, "Une longue phrase qui traverse toute la page et sort de la premiere colonne " * 3)]),
        ]
        sortie = regrouper_lignes(lignes)
        self.assertEqual(len(sortie), 7)
        self.assertTrue(sortie[-1].startswith("Une longue phrase"))

    def test_deuxieme_rangee_dont_un_texte_depasse_la_largeur_des_lignes_du_dessus(self):
        """CV du 22/10/2026 : « 5S, Kaizen, TQM, QRQC, 5 Pourquoi, Ishikawa, QC » est plus large que
        les lignes précédentes de sa colonne ; il ne doit pas fermer le tableau."""
        lignes = [
            (100, [mot(70, "Titre A"), mot(345, "Titre B"), mot(620, "Titre C")]),
            (112, [mot(70, "Texte A"), mot(345, "Texte B"), mot(620, "Texte C")]),
            (134, [mot(70, "Titre D"), mot(345, "Titre E"), mot(620, "Titre F")]),
            (146, [mot(70, "Texte D beaucoup plus long que le reste"), mot(345, "Texte E"), mot(620, "Texte F")]),
            (156, [mot(70, "suite D"), mot(345, "suite E")]),
        ]
        self.assertEqual(regrouper_lignes(lignes), [
            "Titre A", "Texte A", "Titre D", "Texte D beaucoup plus long que le reste", "suite D",
            "Titre B", "Texte B", "Titre E", "Texte E", "suite E",
            "Titre C", "Texte C", "Titre F", "Texte F"])

    def test_liste_vide(self):
        self.assertEqual(regrouper_lignes([]), [])


class ExtractionPdfColonnesTest(SimpleTestCase):
    """Sur un vrai PDF produit par PyMuPDF."""

    def _pdf(self, ecritures):
        document = fitz.open()
        page = document.new_page()
        for x, y, texte in ecritures:
            page.insert_text((x, y), texte, fontsize=9, fontname="helv")
        dossier = tempfile.mkdtemp()
        chemin = os.path.join(dossier, "cv.pdf")
        document.save(chemin)
        document.close()
        self.addCleanup(lambda: (os.remove(chemin), os.rmdir(dossier)))
        return chemin

    def test_tableau_lu_par_colonne_et_titre_date_conserve(self):
        chemin = self._pdf([
            (56, 60, "VEHICLE TECHNICAL MANAGER"), (480, 60, "2026"),
            (70, 120, "Management industriel"), (250, 120, "Gestion de projets"), (430, 120, "Industrialisation"),
            (70, 132, "Pilotage production"), (250, 132, "Execution contractuelle"), (430, 132, "Changements produit"),
        ])
        texte = extract_text_from_pdf_smart(chemin)
        self.assertIn("VEHICLE TECHNICAL MANAGER 2026", texte)
        self.assertLess(texte.index("Pilotage production"), texte.index("Gestion de projets"))
        self.assertLess(texte.index("Execution contractuelle"), texte.index("Industrialisation"))
