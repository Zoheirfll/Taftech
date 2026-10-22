"""Une compétence proposée par l'IA doit figurer dans le CV (ancrage dans le texte).

CV du 22/10/2026 : un manager industriel se voyait proposer « gestion de la paie » et « Leadership », absents
de son CV : l'IA recopiait les exemples de sa consigne."""
from django.test import SimpleTestCase

from jobs.cv_parser.competences import est_ancree_dans_le_cv, jetons_du_texte

CV = (
    "Parcours construit chez Renault Algérie Production, du déploiement ERP et du pilotage des changements techniques.\n"
    "Management industriel\nPilotage production, animation équipes, QCDS, KPI,\nplans d'action\n"
    "Gestion de projets\nSupply Chain & ERP\nTechnique & énergie\nÉlectronique, instrumentation, maintenance, turbines\n"
    "a gaz, environnement GE\nChangements produit/process, standards, démarrage,\n"
    "5S, Kaizen, TQM, QRQC, 5 Pourquoi, Ishikawa, QC Story, audits Pack Office, ERP, NEO BI\n"
    "Risques sécurité / ergonomie reduits lors d'une mission Kaizen\n"
)


class AncrageCompetencesTest(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.jetons = jetons_du_texte(CV)

    def test_competences_du_cv_conservees(self):
        for label in ("Kaizen", "5S", "QC Story", "NEO BI", "Pack Office", "turbines a gaz", "environnement GE",
                      "pilotage production", "animation équipes", "plans d'action", "ergonomie"):
            with self.subTest(label=label):
                self.assertTrue(est_ancree_dans_le_cv(label, self.jetons))

    def test_pluriel_et_accents_ignores(self):
        self.assertTrue(est_ancree_dans_le_cv("Gestion de projet", self.jetons))  # CV : « Gestion de projets »
        self.assertTrue(est_ancree_dans_le_cv("changement produit", self.jetons))  # CV : « Changements produit/process »
        self.assertTrue(est_ancree_dans_le_cv("electronique", self.jetons))

    def test_exemples_de_la_consigne_absents_du_cv_ecartes(self):
        for label in ("gestion de la paie", "Leadership", "Python"):
            with self.subTest(label=label):
                self.assertFalse(est_ancree_dans_le_cv(label, self.jetons))

    def test_un_seul_mot_absent_suffit_a_ecarter(self):
        self.assertFalse(est_ancree_dans_le_cv("Gestion de la paie", self.jetons))  # « gestion » est dans le CV, pas « paie »

    def test_derivation_du_cv_reste_ancree(self):
        jetons = jetons_du_texte("Pilotage des observations pour améliorer la qualité en continu")
        self.assertTrue(est_ancree_dans_le_cv("Amélioration continue", jetons))

    def test_libelle_vide_ecarte(self):
        self.assertFalse(est_ancree_dans_le_cv("", self.jetons))
        self.assertFalse(est_ancree_dans_le_cv("de la", self.jetons))
