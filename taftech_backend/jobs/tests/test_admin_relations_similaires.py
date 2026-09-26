from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import CustomUser
from jobs.models import GroupeMetier, Metier, RelationMetier


class AdminRelationsSimilaireAPITest(TestCase):
    """Panel admin pour créer/lister/supprimer les relations 'similaire' (matcher.py, session
    24/09/2026) — rapproche deux métiers d'un même grand domaine que le référentiel v2 du
    client sépare en branches secteur/domaine distinctes."""

    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username="admin-rel", email="admin-rel@test.com", password="x", role="ADMIN", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

        groupe = GroupeMetier.objects.create(code="G-REL-TEST", type_groupe="domaine_source", libelle="Test")
        self.m1 = Metier.objects.create(code="TAF-REL-1", libelle="Métier A", groupe_principal=groupe)
        self.m2 = Metier.objects.create(code="TAF-REL-2", libelle="Métier B", groupe_principal=groupe)
        # Relation importée du client — jamais listée/supprimable via ce endpoint.
        RelationMetier.objects.create(
            code="TAF-REL-IMPORTED", metier_depart=self.m1, metier_arrivee=self.m2,
            relation="redirection_equivalente")

    def test_liste_vide_au_depart_ignore_relations_importees(self):
        resp = self.client.get("/api/jobs/admin/referentiel-v2/relations-similaires/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 0)

    def test_creation_relation_similaire(self):
        resp = self.client.post("/api/jobs/admin/referentiel-v2/relations-similaires/", {
            "metier_depart": self.m1.id, "metier_arrivee": self.m2.id, "justification": "test",
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        rel = RelationMetier.objects.get(pk=resp.data["id"])
        self.assertEqual(rel.relation, "similaire")
        self.assertTrue(rel.active_recherche)
        self.assertTrue(rel.code.startswith("TAF-SIM-"))

    def test_creation_meme_metier_refusee(self):
        resp = self.client.post("/api/jobs/admin/referentiel-v2/relations-similaires/", {
            "metier_depart": self.m1.id, "metier_arrivee": self.m1.id,
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_suppression_relation_similaire(self):
        rel = RelationMetier.objects.create(
            code="TAF-SIM-TEST", metier_depart=self.m1, metier_arrivee=self.m2,
            relation="similaire", active_recherche=True)
        resp = self.client.delete(f"/api/jobs/admin/referentiel-v2/relations-similaires/{rel.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(RelationMetier.objects.filter(pk=rel.id).exists())

    def test_suppression_relation_importee_refusee(self):
        rel_importee = RelationMetier.objects.get(code="TAF-REL-IMPORTED")
        resp = self.client.delete(f"/api/jobs/admin/referentiel-v2/relations-similaires/{rel_importee.id}/")
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(RelationMetier.objects.filter(pk=rel_importee.id).exists())

    def test_non_admin_refuse(self):
        candidat = CustomUser.objects.create_user(username="c-rel", email="c-rel@test.com", password="x", role="CANDIDAT")
        client = APIClient()
        client.force_authenticate(candidat)
        resp = client.get("/api/jobs/admin/referentiel-v2/relations-similaires/")
        self.assertEqual(resp.status_code, 403)

    def test_recherche_par_libelle_metier(self):
        RelationMetier.objects.create(
            code="TAF-SIM-SEARCH", metier_depart=self.m1, metier_arrivee=self.m2,
            relation="similaire", active_recherche=True)
        resp = self.client.get("/api/jobs/admin/referentiel-v2/relations-similaires/?search=Métier A")
        self.assertEqual(resp.data["count"], 1)
        resp = self.client.get("/api/jobs/admin/referentiel-v2/relations-similaires/?search=Introuvable")
        self.assertEqual(resp.data["count"], 0)
