from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from jobs.models import ProfilCandidat, ExperienceCandidat, GroupeMetier, Metier
from jobs.metiers_matching import calculer_metiers_accessibles

User = get_user_model()


def _make_metier(code, libelle, groupe):
    return Metier.objects.create(code=code, libelle=libelle, groupe_principal=groupe)


class MetiersAccessiblesCalculTests(TestCase):
    def setUp(self):
        self.secteur_l = GroupeMetier.objects.create(code="TST-SECT-L", libelle="Administration", type_groupe="secteur_source")
        self.groupe_rh = GroupeMetier.objects.create(code="TST-DOM-L15", libelle="Ressources humaines", type_groupe="domaine_source", parent=self.secteur_l)
        self.groupe_compta = GroupeMetier.objects.create(code="TST-DOM-L12", libelle="Comptabilité et finance", type_groupe="domaine_source", parent=self.secteur_l)
        self.secteur_a = GroupeMetier.objects.create(code="TST-SECT-A", libelle="Agriculture et pêche", type_groupe="secteur_source")
        self.groupe_agri = GroupeMetier.objects.create(code="TST-DOM-A11", libelle="Espaces naturels", type_groupe="domaine_source", parent=self.secteur_a)

        self.metier_rh = _make_metier("TST-M-L15", "Ressources humaines", self.groupe_rh)
        self.metier_compta = _make_metier("TST-M-L12", "Comptabilité et finance", self.groupe_compta)
        self.metier_agri = _make_metier("TST-M-A11", "Espaces naturels", self.groupe_agri)

        self.user = User.objects.create_user(
            username="candidat-metiers", email="candidat-metiers@test.dz", password="Pass1234!", role="CANDIDAT",
        )
        self.profil = ProfilCandidat.objects.create(user=self.user, metier=self.metier_rh)

    def test_domaine_propre_specialite_mieux_note(self):
        resultats = calculer_metiers_accessibles(self.user)
        par_id = {r["metier_id"]: r["score"] for r in resultats}
        # Seul le métier déclaré (ou un métier du même groupe_principal) obtient un score —
        # metiers_compatibles() n'accorde aucun bonus de "même secteur parent" contrairement
        # à l'ancienne comparaison texte par préfixe de code.
        self.assertGreater(par_id[self.metier_rh.id], 0)
        self.assertNotIn(self.metier_compta.id, par_id)
        self.assertNotIn(self.metier_agri.id, par_id)

    def test_domaine_sans_lien_absent_du_resultat(self):
        resultats = calculer_metiers_accessibles(self.user)
        ids = [r["metier_id"] for r in resultats]
        self.assertNotIn(self.metier_agri.id, ids)
        self.assertNotIn(self.metier_compta.id, ids)

    def test_experience_reelle_augmente_le_score(self):
        sans_exp = {r["metier_id"]: r["score"] for r in calculer_metiers_accessibles(self.user)}
        ExperienceCandidat.objects.create(
            profil=self.profil, titre_poste="Assistante RH", entreprise="ACME", metier=self.metier_rh,
            date_debut="2020-01-01",
        )
        avec_exp = {r["metier_id"]: r["score"] for r in calculer_metiers_accessibles(self.user)}
        self.assertGreater(avec_exp[self.metier_rh.id], sans_exp[self.metier_rh.id])

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
        secteur = GroupeMetier.objects.create(code="TST-SECT-API", libelle="Administration", type_groupe="secteur_source")
        groupe = GroupeMetier.objects.create(code="TST-DOM-API", libelle="Ressources humaines", type_groupe="domaine_source", parent=secteur)
        self.metier = _make_metier("TST-M-API", "Ressources humaines", groupe)

        self.user = User.objects.create_user(
            username="candidat-api-metiers", email="candidat-api-metiers@test.dz", password="Pass1234!", role="CANDIDAT",
        )
        ProfilCandidat.objects.create(user=self.user, metier=self.metier)

    def test_endpoint_retourne_les_metiers_du_candidat_connecte(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/jobs/metiers-accessibles/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["metier_id"], self.metier.id)

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
