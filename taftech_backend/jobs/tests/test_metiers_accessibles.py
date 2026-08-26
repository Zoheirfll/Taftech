from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from jobs.models import ProfilCandidat, ExperienceCandidat, Secteur, Domaine
from jobs.metiers_matching import calculer_metiers_accessibles

User = get_user_model()


class MetiersAccessiblesCalculTests(TestCase):
    def setUp(self):
        Secteur.objects.all().delete()
        Domaine.objects.all().delete()
        self.secteur_l = Secteur.objects.create(code="L", libelle="Administration")
        self.domaine_rh = Domaine.objects.create(secteur=self.secteur_l, code="L15", libelle="Ressources humaines")
        self.domaine_compta = Domaine.objects.create(secteur=self.secteur_l, code="L12", libelle="Comptabilité et finance")
        self.secteur_a = Secteur.objects.create(code="A", libelle="Agriculture et pêche")
        self.domaine_agri = Domaine.objects.create(secteur=self.secteur_a, code="A11", libelle="Espaces naturels")

        self.user = User.objects.create_user(
            username="candidat-metiers", email="candidat-metiers@test.dz", password="Pass1234!", role="CANDIDAT",
        )
        self.profil = ProfilCandidat.objects.create(user=self.user, specialite="L15")

    def test_domaine_propre_specialite_mieux_note(self):
        resultats = calculer_metiers_accessibles(self.user)
        par_code = {r["domaine_code"]: r["score"] for r in resultats}
        self.assertGreater(par_code["L15"], par_code["L12"])
        self.assertGreater(par_code["L12"], par_code.get("A11", 0))

    def test_domaine_sans_lien_absent_du_resultat(self):
        resultats = calculer_metiers_accessibles(self.user)
        codes = [r["domaine_code"] for r in resultats]
        self.assertNotIn("A11", codes)

    def test_experience_reelle_augmente_le_score(self):
        sans_exp = {r["domaine_code"]: r["score"] for r in calculer_metiers_accessibles(self.user)}
        ExperienceCandidat.objects.create(
            profil=self.profil, titre_poste="Assistante RH", entreprise="ACME", secteur="L15",
            date_debut="2020-01-01",
        )
        avec_exp = {r["domaine_code"]: r["score"] for r in calculer_metiers_accessibles(self.user)}
        self.assertGreater(avec_exp["L15"], sans_exp["L15"])

    def test_top_n_limite_le_nombre_de_resultats(self):
        resultats = calculer_metiers_accessibles(self.user, top_n=1)
        self.assertEqual(len(resultats), 1)

    def test_aucun_profil_retourne_liste_vide(self):
        user_sans_profil = User.objects.create_user(
            username="sans-profil", email="sans-profil@test.dz", password="Pass1234!", role="CANDIDAT",
        )
        self.assertEqual(calculer_metiers_accessibles(user_sans_profil), [])


class MetiersAccessiblesAPITests(APITestCase):
    def setUp(self):
        Secteur.objects.all().delete()
        Domaine.objects.all().delete()
        secteur = Secteur.objects.create(code="L", libelle="Administration")
        Domaine.objects.create(secteur=secteur, code="L15", libelle="Ressources humaines")

        self.user = User.objects.create_user(
            username="candidat-api-metiers", email="candidat-api-metiers@test.dz", password="Pass1234!", role="CANDIDAT",
        )
        ProfilCandidat.objects.create(user=self.user, specialite="L15")

    def test_endpoint_retourne_les_metiers_du_candidat_connecte(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/jobs/metiers-accessibles/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["domaine_code"], "L15")

    def test_endpoint_refuse_non_candidat(self):
        recruteur = User.objects.create_user(
            username="rec-metiers", email="rec-metiers@test.dz", password="Pass1234!", role="RECRUTEUR",
        )
        self.client.force_authenticate(user=recruteur)
        response = self.client.get("/api/jobs/metiers-accessibles/")
        self.assertEqual(response.status_code, 403)

    def test_endpoint_respecte_limit(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/jobs/metiers-accessibles/?limit=1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
