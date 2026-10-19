"""Une analyse déjà faite sur les mêmes données est renvoyée sans appel IA ni décompte (R19)."""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.models import AIConfig, Candidature, CompetenceCandidat, OffreEmploi, ProfilCandidat, UtilisationIA
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()


class CacheCarriereEtConseilsTest(APITestCase):
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()
        self.user = User.objects.create_user(
            username="cache_cand", email="cache_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        self.profil = ProfilCandidat.objects.create(user=self.user, titre_professionnel="Développeur")
        self.client.force_authenticate(user=self.user)

    # ----- Analyse carrière -----
    @patch("jobs.views.ia._appel_groq", return_value="Analyse carrière")
    def test_carriere_deux_appels_identiques_un_seul_appel_ia(self, mock_ia):
        url = reverse("analyse-carriere")
        premier = self.client.get(url)
        second = self.client.get(url)
        self.assertEqual(premier.status_code, 200)
        self.assertNotIn("depuis_cache", premier.data)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.data["depuis_cache"])
        self.assertEqual(second.data["analyse"], "Analyse carrière")
        self.assertEqual(mock_ia.call_count, 1)
        self.assertEqual(UtilisationIA.objects.filter(user=self.user).count(), 1)

    @patch("jobs.views.ia._appel_groq", return_value="Analyse carrière")
    def test_carriere_profil_modifie_nouvel_appel(self, mock_ia):
        url = reverse("analyse-carriere")
        self.client.get(url)
        self.profil.titre_professionnel = "Ingénieur"
        self.profil.save()
        self.client.get(url)
        self.assertEqual(mock_ia.call_count, 2)

    @patch("jobs.views.ia._appel_groq", return_value="Analyse carrière")
    def test_carriere_regenerer_nouvel_appel_et_decompte(self, mock_ia):
        url = reverse("analyse-carriere")
        self.client.get(url)
        reponse = self.client.get(url, {"regenerer": "1"})
        self.assertNotIn("depuis_cache", reponse.data)
        self.assertEqual(mock_ia.call_count, 2)
        self.assertEqual(UtilisationIA.objects.filter(user=self.user).count(), 2)

    @patch("jobs.views.ia._appel_groq", return_value="Analyse carrière")
    def test_carriere_prompt_modifie_nouvel_appel(self, mock_ia):
        url = reverse("analyse-carriere")
        self.client.get(url)
        config = AIConfig.get_solo()
        config.analyse_carriere_prompt = "Nouveau prompt système choisi par l'administrateur."
        config.save()
        self.client.get(url)
        self.assertEqual(mock_ia.call_count, 2)

    @patch("jobs.views.ia._appel_groq", return_value="Analyse carrière")
    def test_carriere_quota_epuise_le_resultat_a_jour_reste_lisible(self, mock_ia):
        url = reverse("analyse-carriere")
        self.client.get(url)
        config = AIConfig.get_solo()
        config.analyse_carriere_limite_jour = 1
        config.save()
        reponse = self.client.get(url)
        self.assertEqual(reponse.status_code, 200)
        self.assertTrue(reponse.data["depuis_cache"])
        # ...mais une vraie nouvelle analyse est bien refusée quand le quota est épuisé.
        refus = self.client.get(url, {"regenerer": "1"})
        self.assertEqual(refus.status_code, 403)

    # ----- Conseils personnalisés -----
    @patch("jobs.ai_engine.call_ai", return_value='{"conseils": ["a", "b", "c"]}')
    def test_conseils_deux_appels_identiques_un_seul_appel_ia(self, mock_ia):
        url = reverse("conseils-personnalises")
        self.client.get(url)
        second = self.client.get(url)
        self.assertTrue(second.data["depuis_cache"])
        self.assertEqual(second.data["conseils"], ["a", "b", "c"])
        self.assertEqual(mock_ia.call_count, 1)

    @patch("jobs.ai_engine.call_ai", return_value='{"conseils": ["a", "b", "c"]}')
    def test_conseils_competence_ajoutee_nouvel_appel(self, mock_ia):
        url = reverse("conseils-personnalises")
        self.client.get(url)
        CompetenceCandidat.objects.create(profil=self.profil, label="Python", niveau="DEBUTANT")
        self.client.get(url)
        self.assertEqual(mock_ia.call_count, 2)

    @patch("jobs.ai_engine.call_ai", return_value='{"conseils": ["a", "b", "c"]}')
    def test_conseils_regenerer_nouvel_appel(self, mock_ia):
        url = reverse("conseils-personnalises")
        self.client.get(url)
        self.client.get(url, {"regenerer": "1"})
        self.assertEqual(mock_ia.call_count, 2)


class EmpreinteVersionTest(APITestCase):
    def test_durcir_les_regles_de_nettoyage_invalide_les_resultats_stockes(self):
        from jobs.confidentialite_ia.empreinte import empreinte_ia
        avant = empreinte_ia("prompt", "donnees")
        with patch("jobs.confidentialite_ia.empreinte.VERSION_NETTOYAGE", "autre-version"):
            apres = empreinte_ia("prompt", "donnees")
        self.assertNotEqual(avant, apres)
        self.assertEqual(avant, empreinte_ia("prompt", "donnees"))  # stable à version égale


class CacheAnalyseRecruteurTest(APITestCase):
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()
        self.proprio, self.entreprise = make_entreprise("cache_rec", palier_nom="BUSINESS")
        offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre", wilaya="16 - Alger",
            description="d", statut_moderation="APPROUVEE",
        )
        candidat = User.objects.create_user(
            username="cache_cand2", email="cache_cand2@test.dz", password="pwd", role="CANDIDAT",
        )
        self.candidature = Candidature.objects.create(
            offre=offre, candidat=candidat, score_matching=70,
            profil_snapshot={"titre_professionnel": "Développeur", "competences": "Python",
                             "experiences": [], "formations": []},
        )
        self.url = reverse("analyse-groq", args=[self.candidature.id])
        self.client.force_authenticate(user=self.proprio)

    @patch("jobs.views.ia._appel_groq", return_value="Analyse recruteur")
    def test_deux_appels_identiques_un_seul_appel_ia_malgre_le_jeton_aleatoire(self, mock_ia):
        premier = self.client.post(self.url)
        second = self.client.post(self.url)
        self.assertEqual(premier.status_code, 200)
        self.assertTrue(second.data["depuis_cache"])
        self.assertEqual(mock_ia.call_count, 1)
        self.assertEqual(UtilisationIA.objects.count(), 1)

    @patch("jobs.views.ia._appel_groq", return_value="Analyse recruteur")
    def test_profil_modifie_nouvel_appel(self, mock_ia):
        self.client.post(self.url)
        self.candidature.profil_snapshot = {**self.candidature.profil_snapshot, "competences": "Python, Django"}
        self.candidature.save()
        self.client.post(self.url)
        self.assertEqual(mock_ia.call_count, 2)

    @patch("jobs.views.ia._appel_groq", return_value="Analyse recruteur")
    def test_regenerer_nouvel_appel_et_decompte(self, mock_ia):
        self.client.post(self.url)
        reponse = self.client.post(self.url, {"regenerer": True}, format="json")
        self.assertNotIn("depuis_cache", reponse.data)
        self.assertEqual(mock_ia.call_count, 2)
        self.assertEqual(UtilisationIA.objects.count(), 2)
