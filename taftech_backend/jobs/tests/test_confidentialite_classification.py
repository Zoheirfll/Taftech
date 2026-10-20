"""Les appels de classification n'envoient ni nom d'établissement ni coordonnées (R12, R13)."""
from unittest.mock import MagicMock, patch

from django.test import TestCase

from jobs.domaine_agent import classifier_metiers_experiences
from jobs.referentiel_utils import _resoudre_diplome_via_ia, _resoudre_specialite_via_ia


def _type_diplome():
    fake = MagicMock()
    fake.libelle = "Master académique"
    return fake


class ClassificationDiplomeTest(TestCase):
    def test_diplome_sans_etablissement_ni_contact(self):
        with patch("jobs.models.TypeDiplome") as td, \
                patch("jobs.ai_engine.call_ai", return_value='{"index": -1}') as ia:
            td.objects.exclude.return_value.order_by.return_value = [_type_diplome()]
            _resoudre_diplome_via_ia("Master informatique – Université d'Oran, contact a@b.dz")
        prompt = ia.call_args[0][0][0]["content"]
        self.assertNotIn("Université", prompt)
        self.assertNotIn("a@b.dz", prompt)
        self.assertIn("Master informatique", prompt)
        self.assertIn("donnees_candidat", ia.call_args.kwargs)

    def test_intitule_uniquement_etablissement_aucun_appel(self):
        with patch("jobs.models.TypeDiplome") as td, patch("jobs.ai_engine.call_ai") as ia:
            td.objects.exclude.return_value.order_by.return_value = [_type_diplome()]
            self.assertIsNone(_resoudre_diplome_via_ia("Université d'Oran"))
        ia.assert_not_called()

    def test_specialite_sans_etablissement(self):
        candidate = MagicMock()
        candidate.libelle = "Informatique de gestion"
        with patch("jobs.ai_engine.call_ai", return_value='{"index": -1}') as ia:
            _resoudre_specialite_via_ia("Informatique de gestion – Université d'Oran", [candidate])
        prompt = ia.call_args[0][0][0]["content"]
        self.assertNotIn("Université", prompt)
        self.assertIn("donnees_candidat", ia.call_args.kwargs)


class ClassificationMetierTest(TestCase):
    def test_experiences_sans_coordonnees(self):
        experiences = [{"titre_poste": "Développeur",
                        "description": "Contact client : a@b.dz ou 0555 12 34 56"}]
        with patch("jobs.cv_parser._call_groq", return_value='{"classifications": []}') as ia:
            classifier_metiers_experiences(experiences, titre_professionnel="Développeur web")
        prompt = ia.call_args[0][0]
        self.assertNotIn("a@b.dz", prompt)
        self.assertNotIn("0555", prompt)
        self.assertIn("donnees_candidat", ia.call_args.kwargs)
