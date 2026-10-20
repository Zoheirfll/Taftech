"""Les prompts envoyés à l'IA ne contiennent plus d'identifiant candidat (R6, R10, R11, R14)."""
import re
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from datetime import date

from jobs.models import Candidature, ExperienceCandidat, FormationCandidat, OffreEmploi, ProfilCandidat
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()


class AnalyseRecruteurPseudonymeTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.proprio, self.entreprise = make_entreprise("pseudo_rec", palier_nom="BUSINESS")
        offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre", wilaya="16 - Alger",
            description="d", statut_moderation="APPROUVEE",
        )
        candidat = User.objects.create_user(
            username="pseudo_cand", email="pseudo_cand@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        self.candidature = Candidature.objects.create(
            offre=offre, candidat=candidat, score_matching=70,
            profil_snapshot={
                "first_name": "Karim", "last_name": "Benali", "titre_professionnel": "Développeur",
                "diplome": "MASTER_2", "competences": "Python, Django", "wilaya": "16 - Alger",
                "experiences": [{"titre_poste": "Développeur", "entreprise": "SONATRACH",
                                 "date_debut": "2019", "date_fin": "2023"}],
                "formations": [{"diplome": "Master informatique – Université d'Oran",
                                "etablissement": "Université d'Oran"}],
            },
        )
        self.url = reverse("analyse-groq", args=[self.candidature.id])

    @patch("jobs.views.ia._appel_groq", return_value="Analyse")
    def test_prompt_sans_nom_ni_employeur_ni_ecole(self, mock_ia):
        self.client.force_authenticate(user=self.proprio)
        self.assertEqual(self.client.post(self.url).status_code, 200)
        prompt = mock_ia.call_args[0][0][0]["content"]
        for interdit in ("Karim", "Benali", "SONATRACH", "Université", "Oran"):
            self.assertNotIn(interdit, prompt)
        self.assertRegex(prompt, r"CANDIDAT_[0-9A-F]{6}")
        self.assertIn("Entreprise A", prompt)
        self.assertIn("Master informatique", prompt)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)

    def test_reponse_rattachee_sans_le_jeton(self):
        def faux_appel(messages, **kwargs):
            jeton = re.search(r"CANDIDAT_[0-9A-F]{6}", messages[0]["content"]).group(0)
            return f"{jeton} est solide."
        self.client.force_authenticate(user=self.proprio)
        with patch("jobs.views.ia._appel_groq", side_effect=faux_appel):
            r = self.client.post(self.url)
        self.assertEqual(r.data["analyse"], "le candidat est solide.")
        self.candidature.refresh_from_db()
        self.assertEqual(self.candidature.derniere_analyse_ia, "le candidat est solide.")


class AnalyseCarrierePseudonymeTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="pseudo_car", email="pseudo_car@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        self.profil = ProfilCandidat.objects.create(
            user=self.user, titre_professionnel="Développeur", competences="Python, joindre a@b.dz",
        )
        ExperienceCandidat.objects.create(
            profil=self.profil, titre_poste="Développeur", entreprise="SONATRACH",
            date_debut=date(2019, 1, 1), date_fin=date(2023, 1, 1),
        )
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master informatique – Université d'Oran",
            etablissement="Université d'Oran",
        )

    @patch("jobs.views.ia._appel_groq", return_value="###MÉTIERS POSSIBLES###\nx")
    def test_carriere_sans_employeur_ni_ecole_ni_contact(self, mock_ia):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(reverse("analyse-carriere")).status_code, 200)
        contenu = mock_ia.call_args[0][0][1]["content"]
        for interdit in ("SONATRACH", "Université", "Oran", "a@b.dz", "Karim", "Benali"):
            self.assertNotIn(interdit, contenu)
        self.assertIn("Entreprise A", contenu)
        self.assertIn("Master informatique", contenu)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)


class ConseilsPseudonymesTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="pseudo_con", email="pseudo_con@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        ProfilCandidat.objects.create(user=self.user, titre_professionnel="Développeur")

    @patch("jobs.ai_engine.call_ai", return_value='{"conseils": ["a", "b", "c"]}')
    def test_conseils_sans_identifiant_et_avec_effectifs(self, mock_ia):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(reverse("conseils-personnalises")).status_code, 200)
        contenu = mock_ia.call_args[0][0][1]["content"]
        self.assertNotIn("Karim", contenu)
        self.assertNotIn("Benali", contenu)
        self.assertIn("aucune candidature", contenu)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)
