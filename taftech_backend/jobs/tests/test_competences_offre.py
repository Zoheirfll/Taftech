"""Compétences structurées sur l'offre (CompetenceOffre) — matching fiable en plus de la zone
texte libre, voir CLAUDE.md session compétences requises."""
import json
from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import (
    ProfilCandidat, ProfilEntreprise, OffreEmploi, CompetenceOffre, CompetenceCandidat,
    CompetenceReferentiel, Palier, AbonnementEntreprise,
)
from jobs.matcher import calculer_score_matching

User = get_user_model()


def _make_offre(**kwargs):
    entreprise_user = User.objects.create_user(
        username=kwargs.pop("username", "reco_rh"), email="reco_rh@test.dz", password="pwd", role="RECRUTEUR",
    )
    entreprise = ProfilEntreprise.objects.create(
        user=entreprise_user, nom_entreprise="CoReco", registre_commerce="RC-RECO", est_approuvee=True,
    )
    offre = OffreEmploi.objects.create(
        entreprise=entreprise, titre="Chargé de recrutement", wilaya="16 - Alger",
        experience_requise="DEBUTANT", statut_moderation="APPROUVEE",
    )
    return entreprise_user, entreprise, offre


class CompetenceOffreModelTest(TestCase):
    def test_creation_et_unicite_par_offre(self):
        _, _, offre = _make_offre()
        CompetenceOffre.objects.create(offre=offre, label="Excel", type_exigence="OBLIGATOIRE")
        CompetenceOffre.objects.create(offre=offre, label="Power BI", type_exigence="SOUHAITEE", niveau_requis="INTERMEDIAIRE")
        self.assertEqual(offre.competences_requises.count(), 2)


class JobCreateCompetencesAPITest(APITestCase):
    def test_creation_offre_persiste_competences_structurees(self):
        user, entreprise, _ = _make_offre(username="reco_create")
        entreprise.offres.all().delete()  # repart d'une entreprise sans offre pour ce test
        self.client.force_authenticate(user=user)
        payload = {
            "titre": "Chargé de recrutement", "wilaya": "16 - Alger", "specialite": "",
            "experience_requise": "DEBUTANT", "type_contrat": "CDI",
            "competences_requises": [
                {"label": "Excel", "type_exigence": "OBLIGATOIRE"},
                {"label": "Sourcing", "type_exigence": "SOUHAITEE", "niveau_requis": "AVANCE"},
                {"label": "", "type_exigence": "OBLIGATOIRE"},  # ignoré (label vide)
            ],
        }
        r = self.client.post(reverse("creer-offre"), payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        offre = OffreEmploi.objects.get(entreprise=entreprise)
        self.assertEqual(offre.competences_requises.count(), 2)
        labels = set(offre.competences_requises.values_list("label", flat=True))
        self.assertEqual(labels, {"Excel", "Sourcing"})
        self.assertEqual(r.data["competences_requises"][0]["label"] in labels, True)
        # Le texte affiché sur l'annonce est généré automatiquement à partir des étiquettes.
        self.assertIn("- Excel — Obligatoire", offre.competences)
        self.assertIn("- Sourcing (niveau Avancé minimum) — Souhaitée", offre.competences)

    def test_creation_sans_competences_garde_texte_libre_fourni(self):
        user, entreprise, _ = _make_offre(username="reco_texte_libre")
        entreprise.offres.all().delete()
        self.client.force_authenticate(user=user)
        payload = {
            "titre": "Poste", "wilaya": "16 - Alger", "experience_requise": "DEBUTANT",
            "competences": "Texte libre saisi sans étiquette.",
        }
        r = self.client.post(reverse("creer-offre"), payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        offre = OffreEmploi.objects.get(entreprise=entreprise)
        self.assertEqual(offre.competences, "Texte libre saisi sans étiquette.")

    def test_type_exigence_invalide_repli_obligatoire(self):
        user, entreprise, _ = _make_offre(username="reco_invalid")
        entreprise.offres.all().delete()
        self.client.force_authenticate(user=user)
        payload = {
            "titre": "Poste", "wilaya": "16 - Alger", "experience_requise": "DEBUTANT",
            "competences_requises": [{"label": "Excel", "type_exigence": "BIDON"}],
        }
        r = self.client.post(reverse("creer-offre"), payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        offre = OffreEmploi.objects.get(entreprise=entreprise)
        self.assertEqual(offre.competences_requises.first().type_exigence, "OBLIGATOIRE")


class MatchingCompetencesStructureesTest(TestCase):
    def setUp(self):
        _, _, self.offre = _make_offre(username="reco_match")
        CompetenceOffre.objects.create(offre=self.offre, label="Excel", type_exigence="OBLIGATOIRE", niveau_requis="INTERMEDIAIRE")
        CompetenceOffre.objects.create(offre=self.offre, label="Power BI", type_exigence="SOUHAITEE")

        self.cand = User.objects.create_user(username="cand_match", email="cand_match@test.dz", password="pwd", role="CANDIDAT")
        self.profil = ProfilCandidat.objects.create(user=self.cand, wilaya="16 - Alger")

    def test_candidat_avec_toutes_les_competences_score_plein(self):
        CompetenceCandidat.objects.create(profil=self.profil, label="Excel", niveau="AVANCE")
        CompetenceCandidat.objects.create(profil=self.profil, label="Power BI", niveau="DEBUTANT")
        resultat = calculer_score_matching(self.cand, self.offre)
        self.assertEqual(resultat["details"]["competences"], 15.0)

    def test_candidat_sans_competence_obligatoire_score_zero(self):
        resultat = calculer_score_matching(self.cand, self.offre)
        self.assertEqual(resultat["details"]["competences"], 0.0)

    def test_niveau_insuffisant_credit_partiel(self):
        # Excel requis niveau INTERMEDIAIRE, candidat DEBUTANT seulement → crédit partiel (0.6)
        CompetenceCandidat.objects.create(profil=self.profil, label="Excel", niveau="DEBUTANT")
        resultat = calculer_score_matching(self.cand, self.offre)
        attendu = round((2.0 * 0.6) / 3.0 * 15.0, 2)  # poids obligatoire=2, souhaitee=1, total=3
        self.assertEqual(resultat["details"]["competences"], attendu)

    def test_offre_sans_competences_structurees_repli_texte_libre(self):
        offre_libre = OffreEmploi.objects.create(
            entreprise=self.offre.entreprise, titre="Autre poste", wilaya="16 - Alger",
            experience_requise="DEBUTANT", statut_moderation="APPROUVEE",
            profil_recherche="Maîtrise Excel indispensable",
        )
        self.profil.competences = "Excel"
        self.profil.save()
        resultat = calculer_score_matching(self.cand, offre_libre)
        self.assertGreater(resultat["details"]["competences"], 0.0)


class GenererOffreIACompetencesReferentielTest(APITestCase):
    """L'IA doit piocher les compétences structurées exclusivement dans CompetenceReferentiel —
    jamais en inventer une nouvelle (`labels_par_cle` dans GenererOffreIAAPIView)."""

    def setUp(self):
        cache.clear()
        CompetenceReferentiel.objects.all().delete()
        CompetenceReferentiel.objects.create(label="Excel", actif=True)
        CompetenceReferentiel.objects.create(label="Sourcing", actif=True)
        self.user = User.objects.create_user(
            username="ia_comp_rh", email="ia_comp_rh@test.dz", password="pwd", role="RECRUTEUR",
        )
        entreprise = ProfilEntreprise.objects.create(
            user=self.user, nom_entreprise="CoIAComp", registre_commerce="RC-IACOMP", est_approuvee=True,
        )
        palier, _ = Palier.objects.get_or_create(
            nom="BUSINESS", defaults=dict(acces_coordonnees=True, acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True, ordre=3),
        )
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
        self.client.force_authenticate(user=self.user)

    def _reponse_groq(self, extra_competences=None):
        payload = {
            "description": "desc", "missions": "- m", "profil_recherche": "- p",
            "competences": "- Excel",
            "competences_structurees": (extra_competences if extra_competences is not None else [
                {"label": "excel", "type_exigence": "obligatoire", "niveau_requis": "avance"},
                {"label": "Compétence Inventée Par Groq", "type_exigence": "OBLIGATOIRE", "niveau_requis": "AVANCE"},
            ]),
            "questions_entretien": [],
        }
        return json.dumps(payload)

    @patch("jobs.ai_engine.call_ai")
    def test_competence_hallucinee_ecartee_label_reel_normalise(self, mock_call_ai):
        mock_call_ai.return_value = self._reponse_groq()
        r = self.client.post(reverse("generer-offre-ia"), {"titre": "Chargé de recrutement"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        competences = r.data["competences_requises"]
        self.assertEqual(len(competences), 1)
        self.assertEqual(competences[0]["label"], "Excel")  # casse réelle du référentiel, pas "excel"
        self.assertEqual(competences[0]["type_exigence"], "OBLIGATOIRE")
        self.assertEqual(competences[0]["niveau_requis"], "AVANCE")

    @patch("jobs.ai_engine.call_ai")
    def test_aucune_competence_valide_retourne_liste_vide(self, mock_call_ai):
        mock_call_ai.return_value = self._reponse_groq(extra_competences=[
            {"label": "Photoshop", "type_exigence": "OBLIGATOIRE"},
        ])
        r = self.client.post(reverse("generer-offre-ia"), {"titre": "Chargé de recrutement"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["competences_requises"], [])
