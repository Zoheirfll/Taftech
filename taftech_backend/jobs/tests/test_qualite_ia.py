from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import CustomUser
from jobs.models import (Appellation, Candidature, CorrectionParsing, GroupeMetier, Metier,
                         OffreEmploi, ParsingCV, ProfilEntreprise)


def _user(email, role="CANDIDAT", staff=False):
    return CustomUser.objects.create_user(username=email, email=email, password="x", role=role, is_staff=staff)


class CorrectionsParsingTest(TestCase):
    def setUp(self):
        self.user = _user("cand-q@test.com")
        self.autre = _user("autre-q@test.com")
        self.parsing = ParsingCV.objects.create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = f"/api/jobs/parsing/{self.parsing.id}/corrections/"

    def test_enregistre_une_correction_metier(self):
        r = self.client.post(self.url, {"corrections": [{
            "type_correction": "METIER_EXPERIENCE", "texte_source": "Cheffe de département RH",
            "propose_id": 10, "propose_libelle": "A", "corrige_id": 20, "corrige_libelle": "B",
        }]}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["enregistrees"], 1)
        self.assertEqual(CorrectionParsing.objects.count(), 1)

    def test_ignore_type_invalide_absence_de_changement_et_doublon(self):
        item = {"type_correction": "DIPLOME", "texte_source": "x", "propose_id": 1, "corrige_id": 2}
        r = self.client.post(self.url, {"corrections": [
            {"type_correction": "NIMPORTE", "propose_id": 1, "corrige_id": 2},
            {"type_correction": "DIPLOME", "propose_id": 5, "corrige_id": 5},
            item, item,
        ]}, format="json")
        self.assertEqual(r.data["enregistrees"], 1)

    def test_parsing_d_un_autre_utilisateur_refuse(self):
        self.client.force_authenticate(self.autre)
        r = self.client.post(self.url, {"corrections": []}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_texte_source_tronque(self):
        self.client.post(self.url, {"corrections": [{
            "type_correction": "SPECIALITE", "texte_source": "z" * 500, "propose_id": 1, "corrige_id": 2}]}, format="json")
        self.assertEqual(len(CorrectionParsing.objects.get().texte_source), 200)


class AdminQualiteIATest(TestCase):
    def setUp(self):
        self.admin = _user("admin-q@test.com", role="ADMIN", staff=True)
        self.cand = _user("cand2-q@test.com")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        groupe = GroupeMetier.objects.create(code="G-Q", type_groupe="domaine_source", libelle="G")
        self.metier = Metier.objects.create(code="M-Q", libelle="Management RH", groupe_principal=groupe)

    def test_endpoints_refuses_a_un_non_admin(self):
        self.client.force_authenticate(self.cand)
        for url in ("parser", "corrections", "matching"):
            self.assertEqual(self.client.get(f"/api/jobs/admin/qualite-ia/{url}/").status_code, 403)

    def test_stats_parser(self):
        ParsingCV.objects.create(user=self.cand, succes=True, nb_experiences=4, nb_exp_metier_ia=3, nb_exp_sans_metier=1,
                                 nb_formations=2, nb_formations_sans_diplome_ref=1, champs_vides=["bio"], version_parser="v1")
        ParsingCV.objects.create(user=self.cand, succes=False, code_erreur="IA_INDISPONIBLE")
        d = self.client.get("/api/jobs/admin/qualite-ia/parser/").data
        self.assertEqual(d["total"], 2)
        self.assertEqual(d["taux_reussite"], 50.0)
        self.assertEqual(d["pct_exp_sans_metier"], 25.0)
        self.assertEqual(d["pct_formations_sans_diplome"], 50.0)
        self.assertEqual(d["erreurs"][0]["code_erreur"], "IA_INDISPONIBLE")
        self.assertEqual(d["champs_vides"][0]["champ"], "bio")

    def test_corrections_agregees(self):
        for _ in range(3):
            CorrectionParsing.objects.create(type_correction="METIER_EXPERIENCE", texte_source="Chef RH",
                                             propose_id=1, propose_libelle="A", corrige_id=self.metier.id, corrige_libelle="B")
        d = self.client.get("/api/jobs/admin/qualite-ia/corrections/").data
        self.assertEqual(d["resultats"][0]["n"], 3)

    def test_creation_appellation_depuis_une_correction(self):
        payload = {"texte_source": "Chef de département RH", "metier_id": self.metier.id}
        r = self.client.post("/api/jobs/admin/qualite-ia/appellation/", payload, format="json")
        self.assertEqual(r.status_code, 201)
        a = Appellation.objects.get(pk=r.data["id"])
        self.assertEqual(a.cle_recherche, "chef de departement rh")
        self.assertEqual(self.client.post("/api/jobs/admin/qualite-ia/appellation/", payload, format="json").status_code, 409)

    def test_matching_par_tranche(self):
        rec = _user("rec-q@test.com", role="RECRUTEUR")
        ent = ProfilEntreprise.objects.create(user=rec, nom_entreprise="E", registre_commerce="RC-Q", est_approuvee=True)
        offre = OffreEmploi.objects.create(entreprise=ent, titre="O", description="d", wilaya="Oran")
        Candidature.objects.create(offre=offre, candidat=self.cand, statut="RETENU", score_matching=90)
        d = self.client.get("/api/jobs/admin/qualite-ia/matching/").data
        haute = d["tranches"][-1]
        self.assertEqual(haute["total"], 1)
        self.assertEqual(haute["pct_retenu"], 100.0)


class PurgeQualiteIATest(TestCase):
    def test_purge_supprime_seulement_l_ancien(self):
        vieux = ParsingCV.objects.create()
        ParsingCV.objects.filter(pk=vieux.pk).update(date=timezone.now() - timedelta(days=400))
        ParsingCV.objects.create()
        call_command("purger_qualite_ia")
        self.assertEqual(ParsingCV.objects.count(), 1)
