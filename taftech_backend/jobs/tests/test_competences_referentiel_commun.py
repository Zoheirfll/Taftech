"""Point 10 des corrections finales : la compétence d'une offre et celle d'un candidat utilisent
le MÊME référentiel (libellé ou synonyme → même CompetenceReferentiel), donc le score est
réellement comparable. La structure existante (normalisée + obligatoire/souhaitée + niveau) est
conservée."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.matcher import calculer_score_matching
from jobs.models import (
    CompetenceCandidat, CompetenceOffre, CompetenceReferentiel, OffreEmploi, ProfilCandidat, ProfilEntreprise,
)
from jobs.referentiel_utils import construire_index_competences, resoudre_competence_ref

User = get_user_model()


def _entreprise_et_offre(prefixe):
    user = User.objects.create_user(username=f"{prefixe}_rh", email=f"{prefixe}_rh@test.dz", password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co {prefixe}", registre_commerce=f"RC-{prefixe}", est_approuvee=True)
    offre = OffreEmploi.objects.create(
        entreprise=entreprise, titre="Chef de projet", wilaya="16 - Alger",
        experience_requise="DEBUTANT", statut_moderation="APPROUVEE")
    return user, entreprise, offre


class ResolveurCommunTest(TestCase):
    def setUp(self):
        CompetenceReferentiel.objects.all().delete()
        self.gestion = CompetenceReferentiel.objects.create(
            label="Gestion de projet", synonymes="Project Management, Gestion des projets")
        self.paie = CompetenceReferentiel.objects.create(label="Paie")

    def test_libelle_et_synonymes_menent_a_la_meme_competence(self):
        self.assertEqual(resoudre_competence_ref("Gestion de projet"), self.gestion)
        self.assertEqual(resoudre_competence_ref("project management"), self.gestion)
        self.assertEqual(resoudre_competence_ref("  GESTION DES PROJETS "), self.gestion)

    def test_pas_de_rapprochement_approximatif(self):
        self.assertIsNone(resoudre_competence_ref("Gestion"))
        self.assertIsNone(resoudre_competence_ref("Cuisine"))
        self.assertIsNone(resoudre_competence_ref(""))

    def test_un_libelle_canonique_l_emporte_sur_un_synonyme(self):
        CompetenceReferentiel.objects.create(label="Management", synonymes="Paie")
        index = construire_index_competences()
        self.assertEqual(resoudre_competence_ref("Paie", index), self.paie)


class RattachementOrphelinesTest(TestCase):
    def test_une_nouvelle_entree_du_referentiel_rattache_les_saisies_existantes(self):
        from jobs.referentiel_utils import rattacher_competences_orphelines
        CompetenceReferentiel.objects.all().delete()
        _, _, offre = _entreprise_et_offre("orph")
        candidat = User.objects.create_user(username="cand_orph", email="cand_orph@test.dz", password="pwd", role="CANDIDAT")
        profil = ProfilCandidat.objects.create(user=candidat)
        c_offre = CompetenceOffre.objects.create(offre=offre, label="Power BI", type_exigence="OBLIGATOIRE")
        c_cand = CompetenceCandidat.objects.create(profil=profil, label="PowerBI", niveau="AVANCE")
        self.assertEqual(rattacher_competences_orphelines(), 0)  # référentiel vide
        ref = CompetenceReferentiel.objects.create(label="Power BI", synonymes="PowerBI")
        self.assertEqual(rattacher_competences_orphelines(), 2)
        c_offre.refresh_from_db()
        c_cand.refresh_from_db()
        self.assertEqual(c_offre.competence_ref, ref)
        self.assertEqual(c_cand.competence_ref, ref)
        self.assertEqual(rattacher_competences_orphelines(), 0)  # idempotent


class OffreNormaliseeTest(APITestCase):
    def setUp(self):
        CompetenceReferentiel.objects.all().delete()
        self.gestion = CompetenceReferentiel.objects.create(
            label="Gestion de projet", synonymes="Project Management")

    def test_synonyme_normalise_en_libelle_canonique_avec_lien(self):
        user, entreprise, _ = _entreprise_et_offre("norm")
        entreprise.offres.all().delete()
        self.client.force_authenticate(user=user)
        payload = {
            "titre": "Chef de projet", "wilaya": "16 - Alger", "experience_requise": "DEBUTANT",
            "competences_requises": [
                {"label": "Project Management", "type_exigence": "OBLIGATOIRE", "niveau_requis": "AVANCE"},
                {"label": "Gestion de projet", "type_exigence": "SOUHAITEE"},  # doublon après normalisation
                {"label": "Cuisine", "type_exigence": "SOUHAITEE"},  # hors référentiel
            ],
        }
        r = self.client.post(reverse("creer-offre"), payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        offre = OffreEmploi.objects.get(entreprise=entreprise)
        competences = {c.label: c for c in offre.competences_requises.all()}
        self.assertEqual(set(competences), {"Gestion de projet", "Cuisine"})
        self.assertEqual(competences["Gestion de projet"].competence_ref, self.gestion)
        self.assertEqual(competences["Gestion de projet"].type_exigence, "OBLIGATOIRE")
        self.assertEqual(competences["Gestion de projet"].niveau_requis, "AVANCE")
        self.assertIsNone(competences["Cuisine"].competence_ref)
        reponse = {c["label"]: c["competence_ref"] for c in r.data["competences_requises"]}
        self.assertEqual(reponse["Gestion de projet"], self.gestion.id)
        self.assertIsNone(reponse["Cuisine"])


class ScoreComparableTest(TestCase):
    def setUp(self):
        CompetenceReferentiel.objects.all().delete()
        self.gestion = CompetenceReferentiel.objects.create(
            label="Gestion de projet", synonymes="Project Management")
        _, _, self.offre = _entreprise_et_offre("score")
        CompetenceOffre.objects.create(
            offre=self.offre, label="Gestion de projet", competence_ref=self.gestion, type_exigence="OBLIGATOIRE")
        self.candidat = User.objects.create_user(username="cand_score", email="cand_score@test.dz", password="pwd", role="CANDIDAT")
        self.profil = ProfilCandidat.objects.create(user=self.candidat, wilaya="16 - Alger")

    def test_synonyme_cote_candidat_donne_le_meme_score_que_le_libelle_canonique(self):
        # Le candidat écrit « Project Management », l'offre « Gestion de projet » : même compétence.
        CompetenceCandidat.objects.create(
            profil=self.profil, label="Project Management", niveau="AVANCE", competence_ref=self.gestion)
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat["details"]["competences"], 15.0)

    def test_sans_lien_de_referentiel_la_comparaison_par_texte_reste_le_repli(self):
        CompetenceCandidat.objects.create(profil=self.profil, label="Project Management", niveau="AVANCE")
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat["details"]["competences"], 0.0)

    def test_niveau_compare_via_le_lien_de_referentiel(self):
        CompetenceOffre.objects.filter(offre=self.offre).update(niveau_requis="CONFIRME")
        CompetenceCandidat.objects.create(
            profil=self.profil, label="Project Management", niveau="DEBUTANT", competence_ref=self.gestion)
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat["details"]["competences"], round(15.0 * 0.6, 2))
