"""MIGRATION (REGLES_MATCHING) — "conserver la compatibilité avec les anciens identifiants" :
une recherche par métier doit retrouver aussi bien les enregistrements posés sur le métier
canonique que ceux qui référencent encore un ancien code redirigé vers lui (R04)."""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import CustomUser
from jobs.models import (
    GroupeMetier, Metier, ProfilCandidat, ProfilEntreprise, OffreEmploi,
    AbonnementEntreprise, Palier,
)
from jobs.referentiel_utils import ids_metier_avec_redirections


class IdsMetierAvecRedirectionsUnitTest(TestCase):
    def setUp(self):
        groupe = GroupeMetier.objects.create(code="G-MIG", type_groupe="domaine_source", libelle="Dev")
        self.canonique = Metier.objects.create(code="M-MIG-CANON", libelle="Développeur Full Stack", groupe_principal=groupe)
        self.ancien = Metier.objects.create(code="M-MIG-ANCIEN", libelle="Ancien intitulé", groupe_principal=groupe,
                                             metier_canonique=self.canonique)

    def test_recherche_par_canonique_inclut_ancien_code(self):
        ids = ids_metier_avec_redirections(self.canonique.id)
        self.assertIn(self.canonique.id, ids)
        self.assertIn(self.ancien.id, ids)

    def test_recherche_par_ancien_code_inclut_canonique(self):
        ids = ids_metier_avec_redirections(self.ancien.id)
        self.assertIn(self.canonique.id, ids)
        self.assertIn(self.ancien.id, ids)

    def test_metier_sans_redirection_retourne_lui_meme_seul(self):
        groupe = GroupeMetier.objects.create(code="G-MIG-SOLO", type_groupe="domaine_source", libelle="Solo")
        m = Metier.objects.create(code="M-MIG-SOLO", libelle="Solo", groupe_principal=groupe)
        self.assertEqual(ids_metier_avec_redirections(m.id), {m.id})

    def test_id_invalide_retourne_ensemble_vide(self):
        self.assertEqual(ids_metier_avec_redirections("abc"), set())


class RechercheOffresAvecAncienCodeAPITest(TestCase):
    """R04/MIGRATION appliqué à JobListAPIView : une offre posée sur l'ANCIEN code (avant sa
    redirection) doit continuer à remonter quand on cherche par le métier canonique."""

    def setUp(self):
        self.client = APIClient()
        groupe = GroupeMetier.objects.create(code="G-MIG-JOB", type_groupe="domaine_source", libelle="Dev")
        self.canonique = Metier.objects.create(code="M-MIG-JOB-CANON", libelle="Développeur", groupe_principal=groupe)
        self.ancien = Metier.objects.create(code="M-MIG-JOB-ANCIEN", libelle="Ancien Développeur", groupe_principal=groupe,
                                             metier_canonique=self.canonique)
        rec = CustomUser.objects.create_user(username="rec_mig", email="rec_mig@test.dz", password="pwd", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(user=rec, nom_entreprise="MigCo", registre_commerce="RC-MIG", est_approuvee=True)
        # Offre posée sur l'ANCIEN code — simule une donnée écrite avant que la redirection
        # n'existe (comportement réel : le champ FK ne se met jamais à jour tout seul).
        self.offre = OffreEmploi.objects.create(
            entreprise=entreprise, titre="Dev historique", wilaya="16 - Alger",
            experience_requise="DEBUTANT", statut_moderation="APPROUVEE", est_active=True,
            metier=self.ancien,
        )

    def test_recherche_par_metier_canonique_trouve_loffre_sur_lancien_code(self):
        resp = self.client.get("/api/jobs/", {"specialite": str(self.canonique.id)})
        self.assertEqual(resp.status_code, 200)
        ids = [o["id"] for o in resp.data["results"]] if isinstance(resp.data, dict) else [o["id"] for o in resp.data]
        self.assertIn(self.offre.id, ids)


class RechercheCVthequeAvecAncienCodeAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        groupe = GroupeMetier.objects.create(code="G-MIG-CV", type_groupe="domaine_source", libelle="Dev")
        self.canonique = Metier.objects.create(code="M-MIG-CV-CANON", libelle="Développeur", groupe_principal=groupe)
        self.ancien = Metier.objects.create(code="M-MIG-CV-ANCIEN", libelle="Ancien Développeur", groupe_principal=groupe,
                                             metier_canonique=self.canonique)
        rec = CustomUser.objects.create_user(username="rec_mig_cv", email="rec_mig_cv@test.dz", password="pwd", role="RECRUTEUR")
        rec.consentement_cvtheque = True
        rec.save()
        self.entreprise = ProfilEntreprise.objects.create(user=rec, nom_entreprise="MigCVCo", registre_commerce="RC-MIGCV", est_approuvee=True)
        palier, _ = Palier.objects.get_or_create(
            nom="BUSINESS", defaults={"limite_offres": None, "acces_coordonnees": True,
                                       "acces_ia_recommandes": True, "acces_ia_avancee": True, "acces_equipe": True})
        AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=palier)
        self.client.force_authenticate(user=rec)

        self.cand_user = CustomUser.objects.create_user(username="cand_mig_cv", email="cand_mig_cv@test.dz", password="pwd", role="CANDIDAT")
        # Profil posé sur l'ANCIEN code (donnée existante avant la redirection).
        ProfilCandidat.objects.create(user=self.cand_user, metier=self.ancien)

    def test_recherche_par_metier_canonique_trouve_le_candidat_sur_lancien_code(self):
        resp = self.client.get(reverse('cvtheque'), {"specialite": str(self.canonique.id)})
        self.assertEqual(resp.status_code, 200)
        data = resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else resp.data
        user_ids = [c["user_id"] for c in data]
        self.assertIn(self.cand_user.id, user_ids)
