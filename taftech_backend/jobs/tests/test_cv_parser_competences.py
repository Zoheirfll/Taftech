from django.test import SimpleTestCase, TestCase

from jobs.cv_parser import (
    _est_competence_valide, _filtrer_competences_valides,
    _labels_du_referentiel, _normaliser_avec_referentiel,
)
from jobs.models import CompetenceReferentiel


class CompetenceValideTests(SimpleTestCase):
    """Verrouille les règles qui empêchent de transformer en « compétence » un
    chiffre, un montant, un pourcentage, un effectif, une date, une phrase complète
    ou une description de mission (retour client)."""

    REJETEES = [
        "500", "50 %", "30 M$", "2019-2023", "03/2021",
        "12 ans d'expérience", "3 projets", "plus de 200 clients",
        "équipe de 12 personnes", "Management d'une équipe de 8",
        "Janvier 2023", "mars 2020 - présent", "depuis 2019",
        "0555 12 34 56", "rh@exemple.dz",
        "J'ai piloté le recrutement", "En charge de la paie",
        "Piloter le plan annuel; former les managers",
        "Gestion des dossiers disciplinaires et suivi des sanctions pour les 500 employés.",
        "Responsable de la mise en place des procédures RH et du suivi",
        "Anglais", "Français", "Arabe", "Tamazight", "english", "Arabic", "Langue arabe",
    ]

    ACCEPTEES = [
        "Python 3", "ISO 9001", "5S", "Office 365", "Gestion de projet",
        "Suivi de projets", "Mise en place de processus", "Paie",
        "Excel avancé", "Droit du travail", "SAP HR", "Power BI", "Lean Six Sigma",
        "Traduction anglais-français", "Communication en anglais",
    ]

    def test_rejette_chiffres_dates_effectifs_phrases_et_missions(self):
        for libelle in self.REJETEES:
            with self.subTest(libelle=libelle):
                self.assertFalse(_est_competence_valide(libelle))

    def test_conserve_les_competences_legitimes_avec_chiffres(self):
        for libelle in self.ACCEPTEES:
            with self.subTest(libelle=libelle):
                self.assertTrue(_est_competence_valide(libelle))

    def test_filtre_commun_ne_garde_que_les_competences_valides(self):
        entree = ["Paie", "500", "J'ai piloté le recrutement", "Excel avancé"]
        self.assertEqual(_filtrer_competences_valides(entree), ["Paie", "Excel avancé"])


class RapprochementReferentielTests(TestCase):
    """Les compétences extraites sont rapprochées du référentiel TAFTECH et le résultat
    indique lesquelles sont reconnues (pour validation par le candidat)."""

    def setUp(self):
        CompetenceReferentiel.objects.all().delete()
        CompetenceReferentiel.objects.create(label="Gestion de projet", synonymes="Project Management")
        CompetenceReferentiel.objects.create(label="Paie")

    def test_synonyme_rapproche_du_libelle_canonique(self):
        rapprochements = {}
        res = _normaliser_avec_referentiel({"Project Management": "AVANCE", "Paie": "CONFIRME", "Cuisine": "DEBUTANT"}, rapprochements)
        self.assertEqual(set(res), {"Gestion de projet", "Paie", "Cuisine"})
        self.assertEqual(rapprochements, {"Project Management": "Gestion de projet"})

    def test_labels_reconnus_ignorent_la_casse_et_les_inconnus(self):
        self.assertEqual(_labels_du_referentiel(["paie", "Cuisine", "Gestion de projet"]), ["paie", "Gestion de projet"])
