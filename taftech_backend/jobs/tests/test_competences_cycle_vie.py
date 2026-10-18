"""Point 11 : cycle de vie des compétences du référentiel — Suggérée -> Validée -> Rejetée /
Désactivée. Une compétence proposée automatiquement ne devient jamais officielle d'elle-même."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase

from jobs.models import (
    AuditLog, CompetenceCandidat, CompetenceOffre, CompetenceReferentiel, OffreEmploi, ProfilCandidat, ProfilEntreprise,
)
from jobs.referentiel_utils import construire_index_competences, proposer_competences_frequentes, resoudre_competence_ref

User = get_user_model()
C = CompetenceReferentiel


def _admin(nom="adm_comp"):
    return User.objects.create_user(username=nom, email=f"{nom}@test.dz", password="pwd", role="ADMIN", is_staff=True)


class ModeleCycleVieTest(TestCase):
    def setUp(self):
        C.objects.all().delete()

    def test_une_suggestion_n_est_pas_officielle(self):
        c = C.objects.create(label="Prompt engineering", statut=C.STATUT_SUGGEREE)
        self.assertFalse(c.actif)
        self.assertFalse(C.objects.filter(actif=True).exists())

    def test_creation_classique_reste_validee(self):
        c = C.objects.create(label="Excel")
        self.assertEqual((c.statut, c.actif), (C.STATUT_VALIDEE, True))

    def test_ancien_booleen_actif_false_signifie_desactivee(self):
        c = C.objects.create(label="Ancienne", actif=False)
        self.assertEqual(c.statut, C.STATUT_DESACTIVEE)
        self.assertFalse(c.actif)

    def test_transitions_autorisees_et_interdites(self):
        admin = _admin()
        c = C.objects.create(label="Nouvelle", statut=C.STATUT_SUGGEREE)
        c.changer_statut(C.STATUT_VALIDEE, admin)
        self.assertEqual((c.statut, c.actif, c.traite_par), (C.STATUT_VALIDEE, True, admin))
        self.assertIsNotNone(c.date_statut)
        c.changer_statut(C.STATUT_DESACTIVEE, admin)
        self.assertFalse(c.actif)
        c.changer_statut(C.STATUT_VALIDEE, admin)  # réactivation : redevient bien officielle
        self.assertTrue(C.objects.get(pk=c.pk).actif)
        with self.assertRaises(ValueError):
            c.changer_statut(C.STATUT_SUGGEREE, admin)  # on ne revient jamais à « suggérée »
        rejetee = C.objects.create(label="Bruit", statut=C.STATUT_SUGGEREE)
        rejetee.changer_statut(C.STATUT_REJETEE, admin)
        with self.assertRaises(ValueError):
            rejetee.changer_statut(C.STATUT_DESACTIVEE, admin)

    def test_suggestion_et_rejetee_ne_rattachent_aucune_saisie(self):
        C.objects.create(label="Suggestion", statut=C.STATUT_SUGGEREE)
        C.objects.create(label="Rejet", statut=C.STATUT_REJETEE)
        C.objects.create(label="Officielle", statut=C.STATUT_VALIDEE)
        C.objects.create(label="Retiree", statut=C.STATUT_DESACTIVEE)
        index = construire_index_competences()
        self.assertIsNone(resoudre_competence_ref("Suggestion", index))
        self.assertIsNone(resoudre_competence_ref("Rejet", index))
        self.assertIsNotNone(resoudre_competence_ref("Officielle", index))
        self.assertIsNotNone(resoudre_competence_ref("Retiree", index))  # liens existants préservés


class PropositionsAutomatiquesTest(TestCase):
    def setUp(self):
        C.objects.all().delete()
        user = User.objects.create_user(username="rh_prop", email="rh_prop@test.dz", password="pwd", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(user=user, nom_entreprise="CoProp", registre_commerce="RC-PROP", est_approuvee=True)
        self.offre = OffreEmploi.objects.create(
            entreprise=entreprise, titre="Poste", wilaya="16 - Alger", experience_requise="DEBUTANT", statut_moderation="APPROUVEE")
        self.profils = []
        for i in range(3):
            u = User.objects.create_user(username=f"cand_prop{i}", email=f"cand_prop{i}@test.dz", password="pwd", role="CANDIDAT")
            self.profils.append(ProfilCandidat.objects.create(user=u))

    def _saisies(self, label, nb):
        for profil in self.profils[:nb]:
            CompetenceCandidat.objects.create(profil=profil, label=label)

    def test_une_competence_frequente_devient_une_suggestion_jamais_une_officielle(self):
        self._saisies("Prompt engineering", 3)
        propositions = proposer_competences_frequentes()
        self.assertEqual([p["label"] for p in propositions], ["Prompt engineering"])
        c = C.objects.get(label="Prompt engineering")
        self.assertEqual((c.statut, c.origine, c.actif), (C.STATUT_SUGGEREE, "PROPOSITION_AUTO", False))

    def test_une_saisie_de_candidat_suffit_le_seuil_ne_vaut_que_pour_les_offres(self):
        self._saisies("Rare", 1)
        CompetenceOffre.objects.create(offre=self.offre, label="Seulement en offre")
        self.assertEqual([p["label"] for p in proposer_competences_frequentes()], ["Rare"])

    def test_le_bruit_est_ecarte(self):
        self._saisies("500", 3)
        self._saisies("J'ai piloté le recrutement de toute l'équipe commerciale", 3)
        self.assertEqual(proposer_competences_frequentes(), [])

    def test_ne_repropose_ni_une_rejetee_ni_un_synonyme_existant_ni_une_suggestion(self):
        C.objects.create(label="Rejetée", statut=C.STATUT_REJETEE)
        C.objects.create(label="Gestion de projet", synonymes="Project Management")
        self._saisies("Rejetée", 3)
        self._saisies("Project Management", 3)
        self.assertEqual(proposer_competences_frequentes(), [])
        self._saisies("Nouvelle idée", 3)
        self.assertEqual(len(proposer_competences_frequentes()), 1)
        self.assertEqual(proposer_competences_frequentes(), [])  # idempotent : déjà suggérée

    def test_simulation_n_ecrit_rien(self):
        self._saisies("Prompt engineering", 3)
        self.assertEqual(len(proposer_competences_frequentes(simuler=True)), 1)
        self.assertFalse(C.objects.exists())

    def test_comptage_candidats_et_offres_distincts(self):
        self._saisies("Cloud", 2)
        CompetenceOffre.objects.create(offre=self.offre, label="Cloud")
        propositions = proposer_competences_frequentes()
        self.assertEqual(propositions[0]["nb_candidats"], 2)
        self.assertEqual(propositions[0]["nb_offres"], 1)


class SuggestionDirecteCandidatTest(APITestCase):
    """15/10/2026 : une compétence ajoutée par un candidat hors référentiel devient tout de suite une
    suggestion visible de l'admin (sans effet officiel avant sa décision)."""

    def setUp(self):
        C.objects.all().delete()
        self.user = User.objects.create_user(username="cand_sug", email="cand_sug@test.dz", password="pwd", role="CANDIDAT")
        ProfilCandidat.objects.create(user=self.user)
        self.client.force_authenticate(user=self.user)

    def _ajouter(self, label):
        return self.client.post("/api/jobs/mes-competences/", {"label": label, "niveau": "DEBUTANT"}, format="json")

    def test_premiere_saisie_cree_une_suggestion_non_officielle(self):
        from jobs.models import DemandeAjout
        self.assertIn(self._ajouter("Prompt engineering").status_code, (200, 201))
        self.assertFalse(C.objects.exists())  # rien d'officiel avant la décision de l'admin
        demande = DemandeAjout.objects.get(type="COMPETENCE")
        self.assertEqual((demande.libelle, demande.statut), ("Prompt engineering", "A_EXAMINER"))
        self.assertIsNone(CompetenceCandidat.objects.get(label="Prompt engineering").competence_ref_id)

    def test_la_demande_est_visible_de_l_admin(self):
        self._ajouter("Prompt engineering")
        self.client.force_authenticate(user=_admin("adm_sug"))
        r = self.client.get("/api/jobs/admin/demandes-ajout/?type=COMPETENCE&statut=A_EXAMINER")
        self.assertEqual([d["libelle"] for d in r.data["results"]], ["Prompt engineering"])

    def test_pas_de_doublon_autre_casse_ou_accents(self):
        from jobs.models import DemandeAjout
        self._ajouter("Prompt engineering")
        self._ajouter("PROMPT Engineering")
        self.assertEqual(DemandeAjout.objects.filter(type="COMPETENCE").count(), 1)

    def test_ne_cree_rien_pour_une_officielle_un_synonyme_ou_une_rejetee(self):
        C.objects.create(label="Gestion de projet", synonymes="Project Management")
        C.objects.create(label="Rejetée", statut=C.STATUT_REJETEE)
        for label in ("Gestion de projet", "Project Management", "Rejetée"):
            self._ajouter(label)
        self.assertEqual(C.objects.count(), 2)
        self.assertEqual(C.objects.get(label="Rejetée").statut, C.STATUT_REJETEE)

    def test_le_bruit_est_ecarte(self):
        self._ajouter("500")
        self._ajouter("J'ai piloté le recrutement de toute l'équipe commerciale")
        self.assertFalse(C.objects.exists())


class ApiAdminCycleVieTest(APITestCase):
    def setUp(self):
        C.objects.all().delete()
        self.admin = _admin()
        self.client.force_authenticate(user=self.admin)
        self.suggestion = C.objects.create(label="Prompt engineering", statut=C.STATUT_SUGGEREE, origine="PROPOSITION_AUTO")

    def _statut(self, pk, statut):
        return self.client.patch(f"/api/jobs/admin/competences/{pk}/statut/", {"statut": statut}, format="json")

    def test_liste_filtree_par_statut_avec_compteurs(self):
        C.objects.create(label="Excel")
        r = self.client.get("/api/jobs/admin/competences/")
        self.assertEqual(r.status_code, 200)
        # les anciennes suggestions ne sont plus dans la liste : elles passent par les demandes
        self.assertEqual([c["label"] for c in r.data["results"]], ["Excel"])
        self.assertEqual(r.data["compteurs"]["VALIDEE"], 1)

    def test_valider_rend_officielle_rattache_les_saisies_et_journalise(self):
        u = User.objects.create_user(username="cand_val", email="cand_val@test.dz", password="pwd", role="CANDIDAT")
        comp = CompetenceCandidat.objects.create(profil=ProfilCandidat.objects.create(user=u), label="Prompt engineering")
        r = self._statut(self.suggestion.pk, "VALIDEE")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual((r.data["statut"], r.data["actif"]), ("VALIDEE", True))
        self.assertEqual(r.data["liens_crees"], 1)
        comp.refresh_from_db()
        self.assertEqual(comp.competence_ref_id, self.suggestion.pk)
        self.assertTrue(AuditLog.objects.filter(action="STATUT_COMPETENCE", admin=self.admin).exists())

    def test_rejeter_ne_rattache_rien(self):
        r = self._statut(self.suggestion.pk, "REJETEE")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(C.objects.get(pk=self.suggestion.pk).actif)

    def test_transition_interdite_et_statut_inconnu(self):
        self.assertEqual(self._statut(self.suggestion.pk, "DESACTIVEE").status_code, 400)
        self.assertEqual(self._statut(self.suggestion.pk, "BIDON").status_code, 400)
        self.assertEqual(self._statut(999999, "VALIDEE").status_code, 404)

    def test_le_statut_ne_s_ecrit_pas_par_la_modification_libre(self):
        self.client.put(f"/api/jobs/admin/competences/{self.suggestion.pk}/", {"statut": "VALIDEE", "actif": True}, format="json")
        suggestion = C.objects.get(pk=self.suggestion.pk)
        self.assertEqual(suggestion.statut, "SUGGEREE")
        self.assertFalse(suggestion.actif)

    def test_creation_par_l_admin_est_officielle_d_emblee(self):
        r = self.client.post("/api/jobs/admin/competences/", {"label": "Power BI", "synonymes": "PowerBI"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        c = C.objects.get(label="Power BI")
        self.assertEqual((c.statut, c.origine, c.actif), ("VALIDEE", "ADMIN", True))

    def test_non_admin_refuse(self):
        recruteur = User.objects.create_user(username="rec_x", email="rec_x@test.dz", password="pwd", role="RECRUTEUR")
        self.client.force_authenticate(user=recruteur)
        self.assertIn(self._statut(self.suggestion.pk, "VALIDEE").status_code, (401, 403))
        self.assertIn(self.client.post("/api/jobs/admin/competences/proposer/", {}, format="json").status_code, (401, 403))

    def test_l_autocomplete_public_ne_montre_jamais_une_suggestion(self):
        C.objects.create(label="Prompt officielle", statut=C.STATUT_VALIDEE)
        self.client.force_authenticate(user=None)
        r = self.client.get("/api/jobs/competences/?search=prompt")
        self.assertEqual([c["label"] for c in r.data], ["Prompt officielle"])

    def test_tableau_de_bord_ne_compte_que_les_officielles_et_signale_les_propositions(self):
        C.objects.create(label="Excel")
        C.objects.create(label="Retirée", statut=C.STATUT_DESACTIVEE)
        C.objects.create(label="Bruit", statut=C.STATUT_REJETEE)
        r = self.client.get("/api/jobs/admin/statistiques/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["nb_competences_referentiel"], 1)  # seule « Excel » est officielle
        self.assertEqual(r.data["competences_a_valider"], 1)  # « Prompt engineering » (setUp)

    def test_detection_via_l_api(self):
        for i in range(3):
            u = User.objects.create_user(username=f"c_api{i}", email=f"c_api{i}@test.dz", password="pwd", role="CANDIDAT")
            CompetenceCandidat.objects.create(profil=ProfilCandidat.objects.create(user=u), label="Data storytelling")
        r = self.client.post("/api/jobs/admin/competences/proposer/", {}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["nb"], 1)
        self.assertEqual(C.objects.get(label="Data storytelling").statut, "SUGGEREE")
