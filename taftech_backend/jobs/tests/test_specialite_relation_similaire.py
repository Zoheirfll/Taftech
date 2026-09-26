from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import CustomUser
from jobs.models import (
    ProfilCandidat, FormationCandidat, TypeDiplome, DomaineFormation,
    SpecialiteFormation, OffreEmploi, ProfilEntreprise, RelationSpecialite,
)
from jobs.matcher import _score_diplome_specialite, specialites_formation_compatibles


class SpecialiteFormationCompatiblesTest(TestCase):
    """Bug réel signalé le 25/09/2026 : deux domaines 'informatique'-like distincts du
    référentiel client (académique précis / thèmes éditoriaux v1) ne partagent aucune
    spécialité exacte — le score spécialité tombait à 0 même quand le domaine affiché
    semblait identique à l'œil. Fix : score partiel via relation manuelle 'similaire'
    (matcher.py::_specialite_relation_similaire) + filet fuzzy sur le libellé."""

    def setUp(self):
        self.dom_academique = DomaineFormation.objects.create(
            code="DOM-ACAD-RS", libelle="Mathématiques et informatique", systeme="universitaire")
        self.dom_theme = DomaineFormation.objects.create(
            code="DOM-THEME-RS", libelle="Informatique, données et numérique", systeme="universitaire")
        self.spec_academique = SpecialiteFormation.objects.create(
            code="SPE-ACAD-RS", domaine=self.dom_academique, libelle="Modeles Intelligents Et Decision",
            cle_recherche="modeles intelligents et decision")
        self.spec_theme = SpecialiteFormation.objects.create(
            code="SPE-THEME-RS", domaine=self.dom_theme, libelle="Informatique", cle_recherche="informatique")
        self.spec_sans_relation = SpecialiteFormation.objects.create(
            code="SPE-AUTRE-RS", domaine=self.dom_theme, libelle="Cybersécurité", cle_recherche="cybersecurite")

    def test_aucune_relation_score_zero(self):
        score = specialites_formation_compatibles(self.spec_academique, self.spec_sans_relation)
        self.assertEqual(score, 0.0)

    def test_relation_similaire_donne_score_partiel(self):
        RelationSpecialite.objects.create(
            specialite_depart=self.spec_academique, specialite_arrivee=self.spec_theme, active_recherche=True)
        score = specialites_formation_compatibles(self.spec_academique, self.spec_theme)
        self.assertEqual(score, 0.70)
        # Symétrique.
        score_inverse = specialites_formation_compatibles(self.spec_theme, self.spec_academique)
        self.assertEqual(score_inverse, 0.70)

    def test_relation_inactive_ignoree(self):
        RelationSpecialite.objects.create(
            specialite_depart=self.spec_academique, specialite_arrivee=self.spec_theme, active_recherche=False)
        score = specialites_formation_compatibles(self.spec_academique, self.spec_theme)
        self.assertEqual(score, 0.0)

    def test_fuzzy_sur_libelle_tres_proche(self):
        spec_variante = SpecialiteFormation.objects.create(
            code="SPE-VARIANTE-RS", domaine=self.dom_theme, libelle="Systeme d'information",
            cle_recherche="systeme information")
        spec_originale = SpecialiteFormation.objects.create(
            code="SPE-ORIGINALE-RS", domaine=self.dom_academique, libelle="Système d'information",
            cle_recherche="systeme information")
        score = specialites_formation_compatibles(spec_originale, spec_variante)
        self.assertGreaterEqual(score, 0.80)

    def test_exact_match_score_un(self):
        self.assertEqual(specialites_formation_compatibles(self.spec_academique, self.spec_academique), 1.0)


class ScoreDiplomeSpecialiteAvecRelationTest(TestCase):
    """Reproduit le cas réel de la candidature 26 / offre 20 : diplôme match exact (20/20),
    spécialité candidat hors liste exacte de l'offre mais reliée par RelationSpecialite —
    doit désormais produire un score partiel plutôt qu'un 0 franc."""

    def setUp(self):
        self.d_master = TypeDiplome.objects.create(code="D-MAS-RS", libelle="Master", systeme="universitaire")
        self.dom_academique = DomaineFormation.objects.create(
            code="DOM-ACAD-RS2", libelle="Mathématiques et informatique", systeme="universitaire")
        self.dom_theme = DomaineFormation.objects.create(
            code="DOM-THEME-RS2", libelle="Informatique, données et numérique", systeme="universitaire")
        self.spec_academique = SpecialiteFormation.objects.create(
            code="SPE-ACAD-RS2", domaine=self.dom_academique, libelle="Modeles Intelligents Et Decision",
            cle_recherche="modeles intelligents et decision")
        self.spec_theme = SpecialiteFormation.objects.create(
            code="SPE-THEME-RS2", domaine=self.dom_theme, libelle="Informatique", cle_recherche="informatique")

        user = CustomUser.objects.create_user(username="cand_rs2", email="cand_rs2@test.com", password="x", role="CANDIDAT")
        self.profil = ProfilCandidat.objects.create(user=user)
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master académique", diplome_ref=self.d_master,
            specialite_ref=self.spec_academique, statut="OBTENU")

        entreprise_user = CustomUser.objects.create_user(username="rec_rs2", email="rec_rs2@test.com", password="x", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(user=entreprise_user, nom_entreprise="ACME RS2", est_approuvee=True)
        self.offre = OffreEmploi.objects.create(
            entreprise=entreprise, titre="Dev", wilaya="31 - Oran", description="x")
        self.offre.diplomes_requis.add(self.d_master)
        self.offre.specialites_requises.add(self.spec_theme)

    def test_sans_relation_specialite_a_zero(self):
        contrib_diplome, contrib_specialite, _ = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_diplome["score"], 1.0)
        self.assertEqual(contrib_specialite["score"], 0.0)
        self.assertTrue(contrib_specialite["connu"])

    def test_avec_relation_specialite_score_partiel(self):
        RelationSpecialite.objects.create(
            specialite_depart=self.spec_academique, specialite_arrivee=self.spec_theme, active_recherche=True)
        contrib_diplome, contrib_specialite, formation_retenue = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_diplome["score"], 1.0)
        self.assertEqual(contrib_specialite["score"], 0.70)
        self.assertTrue(contrib_specialite["connu"])
        self.assertIsNotNone(formation_retenue)


class AdminRelationsSpecialiteAPITest(TestCase):
    """Panel admin pour créer/lister/supprimer les relations 'similaire' entre spécialités de
    formation — même pattern que test_admin_relations_similaires.py (métiers)."""

    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username="admin-rel-spec", email="admin-rel-spec@test.com", password="x", role="ADMIN", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        dom = DomaineFormation.objects.create(code="DOM-ADMIN-RS", libelle="Domaine test", systeme="universitaire")
        self.s1 = SpecialiteFormation.objects.create(code="SPE-ADMIN-1", domaine=dom, libelle="Spécialité A", cle_recherche="specialite a")
        self.s2 = SpecialiteFormation.objects.create(code="SPE-ADMIN-2", domaine=dom, libelle="Spécialité B", cle_recherche="specialite b")

    def test_liste_vide_au_depart(self):
        resp = self.client.get("/api/jobs/admin/referentiel-v2/relations-specialites/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 0)

    def test_creation_relation(self):
        resp = self.client.post("/api/jobs/admin/referentiel-v2/relations-specialites/", {
            "specialite_depart": self.s1.id, "specialite_arrivee": self.s2.id, "justification": "test",
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        rel = RelationSpecialite.objects.get(pk=resp.data["id"])
        self.assertTrue(rel.active_recherche)

    def test_creation_meme_specialite_refusee(self):
        resp = self.client.post("/api/jobs/admin/referentiel-v2/relations-specialites/", {
            "specialite_depart": self.s1.id, "specialite_arrivee": self.s1.id,
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_suppression_relation(self):
        rel = RelationSpecialite.objects.create(specialite_depart=self.s1, specialite_arrivee=self.s2, active_recherche=True)
        resp = self.client.delete(f"/api/jobs/admin/referentiel-v2/relations-specialites/{rel.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(RelationSpecialite.objects.filter(pk=rel.id).exists())

    def test_non_admin_refuse(self):
        candidat = CustomUser.objects.create_user(username="c-rel-spec", email="c-rel-spec@test.com", password="x", role="CANDIDAT")
        client = APIClient()
        client.force_authenticate(candidat)
        resp = client.get("/api/jobs/admin/referentiel-v2/relations-specialites/")
        self.assertEqual(resp.status_code, 403)

    def test_recherche_par_libelle(self):
        RelationSpecialite.objects.create(specialite_depart=self.s1, specialite_arrivee=self.s2, active_recherche=True)
        resp = self.client.get("/api/jobs/admin/referentiel-v2/relations-specialites/?search=Spécialité A")
        self.assertEqual(resp.data["count"], 1)
        resp = self.client.get("/api/jobs/admin/referentiel-v2/relations-specialites/?search=Introuvable")
        self.assertEqual(resp.data["count"], 0)
