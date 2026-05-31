# test_api_questionnaires.py
import json
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import (
    Questionnaire, QuestionQuestionnaire, ReponseChoix, ProfilEntreprise
)

User = get_user_model()


class QuestionnaireAPITestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

        # Recruteur
        self.recruteur = User.objects.create_user(
            username="recruteur_test",
            email="recruteur@test.dz",
            password="Pass1234!",
            role="RECRUTEUR"
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.recruteur,
            nom_entreprise="TechCorp",
            secteur_activite="IT",
            registre_commerce="RC123",
            wilaya_siege="31 - Oran",
            est_approuvee=True
        )

        # Candidat (ne doit pas accéder aux questionnaires)
        self.candidat = User.objects.create_user(
            username="candidat_test",
            email="candidat@test.dz",
            password="Pass1234!",
            role="CANDIDAT"
        )

        # Questionnaire existant
        self.questionnaire = Questionnaire.objects.create(
            recruteur=self.recruteur,
            titre="Questionnaire Dev React"
        )
        self.question = QuestionQuestionnaire.objects.create(
            questionnaire=self.questionnaire,
            texte="Combien d'années d'expérience ?",
            type_question="NUMERIQUE",
            requis=True,
            disqualifiant=False,
            ordre=0
        )

    # ==============================================
    # HAPPY PATHS
    # ==============================================

    def test_HP1_recruteur_liste_ses_questionnaires(self):
        """HP1 : Un recruteur peut lister ses questionnaires."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get("/api/jobs/questionnaires/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titre"], "Questionnaire Dev React")

    def test_HP2_recruteur_cree_questionnaire_avec_questions(self):
        """HP2 : Un recruteur peut créer un questionnaire avec questions et choix."""
        self.client.force_authenticate(user=self.recruteur)
        payload = {
            "titre": "Questionnaire Fullstack",
            "questions": [
                {
                    "texte": "Quel est votre niveau en Django ?",
                    "type_question": "CHOIX_UNIQUE",
                    "requis": True,
                    "disqualifiant": False,
                    "choix": [
                        {"texte": "Débutant"},
                        {"texte": "Intermédiaire"},
                        {"texte": "Expert"}
                    ]
                },
                {
                    "texte": "Décrivez votre expérience",
                    "type_question": "LONG",
                    "requis": False,
                    "disqualifiant": False,
                    "choix": []
                }
            ]
        }
        response = self.client.post(
            "/api/jobs/questionnaires/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["titre"], "Questionnaire Fullstack")
        self.assertEqual(len(response.data["questions"]), 2)
        self.assertEqual(len(response.data["questions"][0]["choix"]), 3)

    def test_HP3_recruteur_modifie_questionnaire(self):
        """HP3 : Un recruteur peut modifier un questionnaire existant."""
        self.client.force_authenticate(user=self.recruteur)
        payload = {
            "titre": "Questionnaire Modifié",
            "questions": [
                {
                    "texte": "Nouvelle question",
                    "type_question": "COURT",
                    "requis": True,
                    "disqualifiant": False,
                    "choix": []
                }
            ]
        }
        response = self.client.put(
            f"/api/jobs/questionnaires/{self.questionnaire.id}/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["titre"], "Questionnaire Modifié")
        self.assertEqual(len(response.data["questions"]), 1)

    def test_HP4_recruteur_supprime_questionnaire(self):
        """HP4 : Un recruteur peut supprimer son questionnaire."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.delete(
            f"/api/jobs/questionnaires/{self.questionnaire.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            Questionnaire.objects.filter(id=self.questionnaire.id).exists()
        )

    def test_HP5_questionnaire_isole_par_recruteur(self):
        """HP5 : Un recruteur ne voit que ses propres questionnaires."""
        autre_recruteur = User.objects.create_user(
            username="autre_recruteur",
            email="autre@test.dz",
            password="Pass1234!",
            role="RECRUTEUR"
        )
        Questionnaire.objects.create(
            recruteur=autre_recruteur,
            titre="Questionnaire de l'autre"
        )
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get("/api/jobs/questionnaires/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titre"], "Questionnaire Dev React")

    # ==============================================
    # EDGE CASES
    # ==============================================

    def test_EC1_candidat_ne_peut_pas_acceder(self):
        """EC1 : Un candidat ne peut pas accéder aux questionnaires."""
        self.client.force_authenticate(user=self.candidat)
        response = self.client.get("/api/jobs/questionnaires/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_EC2_non_authentifie_bloque(self):
        """EC2 : Un utilisateur non authentifié est bloqué."""
        response = self.client.get("/api/jobs/questionnaires/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_EC3_modifier_questionnaire_autre_recruteur_bloque(self):
        """EC3 : Un recruteur ne peut pas modifier le questionnaire d'un autre."""
        autre_recruteur = User.objects.create_user(
            username="autre_rec2",
            email="autre2@test.dz",
            password="Pass1234!",
            role="RECRUTEUR"
        )
        self.client.force_authenticate(user=autre_recruteur)
        payload = {"titre": "Tentative de hack", "questions": []}
        response = self.client.put(
            f"/api/jobs/questionnaires/{self.questionnaire.id}/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_EC4_supprimer_questionnaire_inexistant(self):
        """EC4 : Supprimer un questionnaire inexistant retourne 404."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.delete("/api/jobs/questionnaires/9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_EC5_questions_supprimees_lors_mise_a_jour(self):
        """EC5 : Les anciennes questions sont supprimées lors d'un PUT."""
        self.client.force_authenticate(user=self.recruteur)
        # Vérifier qu'on a 1 question
        self.assertEqual(
            QuestionQuestionnaire.objects.filter(
                questionnaire=self.questionnaire
            ).count(), 1
        )
        payload = {
            "titre": "Questionnaire Modifié",
            "questions": []
        }
        self.client.put(
            f"/api/jobs/questionnaires/{self.questionnaire.id}/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        # Vérifier que les questions sont supprimées
        self.assertEqual(
            QuestionQuestionnaire.objects.filter(
                questionnaire=self.questionnaire
            ).count(), 0
        )