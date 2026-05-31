# test_api_marche.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import (
    ProfilEntreprise, OffreEmploi, Candidature, ProfilCandidat
)

User = get_user_model()


class AdminMarcheAPITestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_user(
            username="admin_test",
            email="admin@test.dz",
            password="Pass1234!",
            role="ADMIN"
        )
        self.recruteur = User.objects.create_user(
            username="recruteur_test",
            email="recruteur@test.dz",
            password="Pass1234!",
            role="RECRUTEUR"
        )
        self.candidat1 = User.objects.create_user(
            username="candidat1",
            email="candidat1@test.dz",
            password="Pass1234!",
            role="CANDIDAT"
        )
        self.candidat2 = User.objects.create_user(
            username="candidat2",
            email="candidat2@test.dz",
            password="Pass1234!",
            role="CANDIDAT"
        )

        self.entreprise = ProfilEntreprise.objects.create(
            user=self.recruteur,
            nom_entreprise="TechCorp",
            secteur_activite="IT",
            registre_commerce="RC123",
            wilaya_siege="31 - Oran",
            est_approuvee=True
        )

        # Offres avec salaires
        self.offre1 = OffreEmploi.objects.create(
            entreprise=self.entreprise,
            titre="Développeur Full-Stack",
            wilaya="31 - Oran",
            specialite="IT",
            type_contrat="CDI",
            experience_requise="CONFIRME",
            salaire_propose="80000",
            statut_moderation="APPROUVEE",
            est_active=True
        )
        self.offre2 = OffreEmploi.objects.create(
            entreprise=self.entreprise,
            titre="Comptable",
            wilaya="16 - Alger",
            specialite="FINANCE",
            type_contrat="CDI",
            experience_requise="DEBUTANT",
            salaire_propose="60000",
            statut_moderation="APPROUVEE",
            est_active=True
        )
        self.offre3 = OffreEmploi.objects.create(
            entreprise=self.entreprise,
            titre="Ingénieur IT",
            wilaya="31 - Oran",
            specialite="IT",
            type_contrat="CDD",
            experience_requise="CONFIRME",
            salaire_propose="90000",
            statut_moderation="APPROUVEE",
            est_active=True
        )

        # Profils candidats avec salaires souhaités
        ProfilCandidat.objects.filter(user=self.candidat1).update(
            secteur_souhaite="IT",
            salaire_souhaite="100000",
            wilaya="31 - Oran"
        )
        ProfilCandidat.objects.filter(user=self.candidat2).update(
            secteur_souhaite="FINANCE",
            salaire_souhaite="70000",
            wilaya="16 - Alger"
        )

        # Candidatures avec scores
        Candidature.objects.create(
            offre=self.offre1,
            candidat=self.candidat1,
            statut="RECUE",
            score_matching=75.0
        )
        Candidature.objects.create(
            offre=self.offre2,
            candidat=self.candidat2,
            statut="RETENU",
            score_matching=85.0
        )

    # ==============================================
    # HAPPY PATHS
    # ==============================================

    def test_HP1_admin_acces_donnees_marche(self):
        """HP1 : L'admin peut accéder aux données marché."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_HP2_structure_reponse_complete(self):
        """HP2 : La réponse contient toutes les clés attendues."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        self.assertIn("salaires_par_secteur", response.data)
        self.assertIn("top_wilayas", response.data)
        self.assertIn("top_secteurs", response.data)
        self.assertIn("matching_moyen", response.data)

    def test_HP3_top_wilayas_triees_par_nb_offres(self):
        """HP3 : Les wilayas sont triées par nombre d'offres décroissant."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        wilayas = response.data["top_wilayas"]
        self.assertGreater(len(wilayas), 0)
        # Oran a 2 offres, Alger a 1 — Oran doit être en premier
        self.assertEqual(wilayas[0]["wilaya"], "31 - Oran")
        self.assertEqual(wilayas[0]["nb_offres"], 2)

    def test_HP4_top_secteurs_triees_par_nb_offres(self):
        """HP4 : Les secteurs sont triés par nombre d'offres décroissant."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        secteurs = response.data["top_secteurs"]
        self.assertGreater(len(secteurs), 0)
        # IT a 2 offres, FINANCE a 1
        self.assertEqual(secteurs[0]["specialite"], "IT")
        self.assertEqual(secteurs[0]["nb_offres"], 2)

    def test_HP5_matching_moyen_calcule(self):
        """HP5 : Le matching moyen est correctement calculé."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        matching = response.data["matching_moyen"]
        self.assertIsNotNone(matching)
        # Moyenne de 75.0 et 85.0 = 80.0
        self.assertAlmostEqual(float(matching), 80.0, delta=0.1)

    def test_HP6_salaires_par_secteur_calcules(self):
        """HP6 : Les salaires moyens par secteur sont calculés."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        salaires = response.data["salaires_par_secteur"]
        self.assertGreater(len(salaires), 0)
        it_data = next(
            (s for s in salaires if s["secteur"] == "IT"), None
        )
        self.assertIsNotNone(it_data)
        # Moyenne offres IT : (80000 + 90000) / 2 = 85000
        self.assertEqual(it_data["moy_offres"], 85000)

    # ==============================================
    # EDGE CASES
    # ==============================================

    def test_EC1_recruteur_acces_refuse(self):
        """EC1 : Un recruteur ne peut pas accéder aux données marché."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get("/api/jobs/admin/marche/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_EC2_candidat_acces_refuse(self):
        """EC2 : Un candidat ne peut pas accéder aux données marché."""
        self.client.force_authenticate(user=self.candidat1)
        response = self.client.get("/api/jobs/admin/marche/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_EC3_non_authentifie_bloque(self):
        """EC3 : Un utilisateur non authentifié est bloqué."""
        response = self.client.get("/api/jobs/admin/marche/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_EC4_matching_moyen_null_si_aucune_candidature(self):
        """EC4 : Le matching moyen est None si aucune candidature avec score."""
        Candidature.objects.all().delete()
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["matching_moyen"])

    def test_EC5_salaire_non_numerique_ignore(self):
        """EC5 : Les salaires non numériques sont ignorés sans crash."""
        OffreEmploi.objects.create(
            entreprise=self.entreprise,
            titre="Poste avec salaire textuel",
            wilaya="31 - Oran",
            specialite="IT",
            type_contrat="CDI",
            experience_requise="DEBUTANT",
            salaire_propose="Négociable",
            statut_moderation="APPROUVEE",
            est_active=True
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)