"""Correction client n°20 : une question disqualifiante doit viser une exigence professionnelle
objective (justification obligatoire, critères protégés refusés)."""
import json

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from rest_framework import status
from rest_framework.test import APIClient

from jobs.models import ProfilEntreprise, Questionnaire, QuestionQuestionnaire
from jobs.questionnaire_validation import critere_protege, erreurs_questions_disqualifiantes

User = get_user_model()

JUSTIFICATION = "Le poste impose la conduite d'un véhicule de société."


class CritereProtegeTests(SimpleTestCase):
    def test_criteres_proteges_detectes(self):
        for texte in (
            "Quel est votre âge ?",
            "Avez-vous moins de 30 ans ?",
            "Êtes-vous marié(e) ?",
            "Avez-vous des enfants ?",
            "Quelle est votre situation familiale ?",
            "Êtes-vous une femme ?",
            "Quelle est votre date de naissance ?",
            "Êtes-vous enceinte ?",
            "Quelle est votre religion ?",
            "Avez-vous un handicap ?",
            "Êtes-vous syndiqué ?",
        ):
            with self.subTest(texte=texte):
                self.assertIsNotNone(critere_protege(texte))

    def test_exigences_professionnelles_non_bloquees(self):
        for texte in (
            "Possédez-vous un permis de conduire B ?",
            "Avez-vous au moins 5 ans d'expérience ?",
            "Avez-vous plus de 10 ans d'expérience en Python ?",
            "Avez-vous effectué un stage en entreprise ?",
            "Avez-vous un passeport valide ?",
            "Votre service national est-il accompli ?",
            "Disposez-vous de l'habilitation électrique ?",
            "Êtes-vous disponible immédiatement ?",
        ):
            with self.subTest(texte=texte):
                self.assertIsNone(critere_protege(texte))

    def test_choix_de_reponse_egalement_controles(self):
        erreurs = erreurs_questions_disqualifiantes([{
            'texte': 'Votre situation ?', 'disqualifiant': True, 'justification_disqualifiant': JUSTIFICATION,
            'choix': [{'texte': 'Célibataire'}, {'texte': 'Autre'}],
        }])
        self.assertEqual(len(erreurs), 1)

    def test_justification_obligatoire_et_bornee(self):
        base = {'texte': 'Permis B ?', 'disqualifiant': True}
        self.assertEqual(len(erreurs_questions_disqualifiantes([base])), 1)
        self.assertEqual(len(erreurs_questions_disqualifiantes([{**base, 'justification_disqualifiant': 'court'}])), 1)
        self.assertEqual(len(erreurs_questions_disqualifiantes([{**base, 'justification_disqualifiant': 'x' * 501}])), 1)
        self.assertEqual(erreurs_questions_disqualifiantes([{**base, 'justification_disqualifiant': JUSTIFICATION}]), [])

    def test_question_non_disqualifiante_jamais_controlee(self):
        self.assertEqual(erreurs_questions_disqualifiantes([
            {'texte': "Quel est votre âge ?", 'disqualifiant': False},
        ]), [])


class QuestionnairesDisqualifiantsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.rh = User.objects.create_user(username="rh_q", email="rh_q@test.dz", password="Pass1234!", role="RECRUTEUR")
        ProfilEntreprise.objects.create(
            user=self.rh, nom_entreprise="QCorp", secteur_activite="IT", registre_commerce="RC_Q",
            wilaya_siege="31 - Oran", est_approuvee=True,
        )
        self.client.force_authenticate(user=self.rh)

    def _poster(self, questions, titre="Q"):
        return self.client.post(
            "/api/jobs/questionnaires/", data=json.dumps({"titre": titre, "questions": questions}),
            content_type="application/json",
        )

    def _question(self, **kwargs):
        return {"texte": "Possédez-vous un permis B ?", "type_question": "CHOIX_UNIQUE",
                "disqualifiant": True, "justification_disqualifiant": JUSTIFICATION,
                "choix": [{"texte": "Oui"}, {"texte": "Non"}], **kwargs}

    def test_creation_valide_enregistre_la_justification(self):
        response = self._poster([self._question()])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        question = QuestionQuestionnaire.objects.get()
        self.assertTrue(question.disqualifiant)
        self.assertEqual(question.justification_disqualifiant, JUSTIFICATION)
        self.assertEqual(response.data['questions'][0]['justification_disqualifiant'], JUSTIFICATION)

    def test_creation_sans_justification_refusee_sans_rien_creer(self):
        response = self._poster([self._question(justification_disqualifiant="")])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('justification', response.data['error'])
        self.assertEqual(Questionnaire.objects.count(), 0)

    def test_creation_critere_protege_refusee(self):
        response = self._poster([self._question(texte="Quel est votre âge ?")])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("l'âge", response.data['error'])
        self.assertEqual(Questionnaire.objects.count(), 0)

    def test_question_non_disqualifiante_sans_justification_acceptee(self):
        response = self._poster([self._question(disqualifiant=False, justification_disqualifiant="")])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(QuestionQuestionnaire.objects.get().justification_disqualifiant, "")

    def test_justification_effacee_si_la_question_n_est_plus_disqualifiante(self):
        response = self._poster([self._question(disqualifiant=False)])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(QuestionQuestionnaire.objects.get().justification_disqualifiant, "")

    def test_modification_refusee_conserve_l_ancien_questionnaire(self):
        questionnaire_id = self._poster([self._question()]).data['id']
        response = self.client.put(
            f"/api/jobs/questionnaires/{questionnaire_id}/",
            data=json.dumps({"titre": "Q", "questions": [self._question(texte="Êtes-vous marié ?")]}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(QuestionQuestionnaire.objects.get().texte, "Possédez-vous un permis B ?")
