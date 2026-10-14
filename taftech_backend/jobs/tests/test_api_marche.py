# test_api_marche.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import (
    ProfilEntreprise, OffreEmploi, Candidature, ProfilCandidat, GroupeMetier, Metier
)

User = get_user_model()


class AdminMarcheAPITestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_user(
            username="admin_test",
            email="admin@test.dz",
            password="Pass1234!",
            role="ADMIN",
            is_staff=True
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

        secteur = GroupeMetier.objects.create(code="TST-SECT", libelle="Secteur Test", type_groupe="secteur_source")
        domaine_it = GroupeMetier.objects.create(code="TST-DOM-IT", libelle="Domaine IT", type_groupe="domaine_source", parent=secteur)
        domaine_finance = GroupeMetier.objects.create(code="TST-DOM-FIN", libelle="Domaine Finance", type_groupe="domaine_source", parent=secteur)
        self.metier_it = Metier.objects.create(code="TST-M-IT", libelle="IT", groupe_principal=domaine_it)
        self.metier_finance = Metier.objects.create(code="TST-M-FIN", libelle="FINANCE", groupe_principal=domaine_finance)

        # Offres avec salaires
        self.offre1 = OffreEmploi.objects.create(
            entreprise=self.entreprise,
            titre="Développeur Full-Stack",
            wilaya="31 - Oran",
            metier=self.metier_it,
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
            metier=self.metier_finance,
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
            metier=self.metier_it,
            type_contrat="CDD",
            experience_requise="CONFIRME",
            salaire_propose="90000",
            statut_moderation="APPROUVEE",
            est_active=True
        )

        # Profils candidats
        ProfilCandidat.objects.filter(user=self.candidat1).update(
            wilaya="31 - Oran"
        )
        ProfilCandidat.objects.filter(user=self.candidat2).update(
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
        self.assertIn("tension_par_secteur", response.data)
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
        # Les 2 métiers (IT, FINANCE) appartiennent au même secteur : un seul secteur, 3 offres.
        self.assertEqual(len(secteurs), 1)
        self.assertEqual(secteurs[0]["libelle"], "Secteur Test")
        self.assertEqual(secteurs[0]["nb_offres"], 3)

    def test_HP4b_un_metier_n_apparait_jamais_comme_secteur(self):
        """Point 15 client : « Data Analyst », « Maintenance électrique »… sont des métiers,
        pas des secteurs. Ils figurent dans top_metiers, avec leur secteur et leur domaine."""
        self.client.force_authenticate(user=self.admin)
        data = self.client.get("/api/jobs/admin/marche/").data
        libelles_secteurs = {s["libelle"] for s in data["top_secteurs"]} | {s["secteur"] for s in data["tension_par_secteur"]}
        self.assertNotIn("IT", libelles_secteurs)
        self.assertNotIn("FINANCE", libelles_secteurs)
        metiers = {m["libelle"]: m for m in data["top_metiers"]}
        self.assertEqual(metiers["IT"]["nb_offres"], 2)
        self.assertEqual(metiers["IT"]["secteur"], "Secteur Test")
        self.assertEqual(metiers["IT"]["domaine"], "Domaine IT")
        self.assertEqual(metiers["FINANCE"]["domaine"], "Domaine Finance")

    def test_HP4d_top_domaines_agreges_avec_leur_secteur(self):
        """Top domaines : offres cumulées par domaine, avec l'identifiant du secteur parent
        (utilisé par le filtre « secteur » de l'écran)."""
        self.client.force_authenticate(user=self.admin)
        data = self.client.get("/api/jobs/admin/marche/").data
        domaines = {d["libelle"]: d for d in data["top_domaines"]}
        self.assertEqual(domaines["Domaine IT"]["nb_offres"], 2)
        self.assertEqual(domaines["Domaine Finance"]["nb_offres"], 1)
        self.assertEqual(domaines["Domaine IT"]["secteur"], "Secteur Test")
        self.assertEqual(domaines["Domaine IT"]["secteur_id"], data["top_secteurs"][0]["secteur_id"])
        self.assertTrue(all(m["secteur_id"] == data["top_secteurs"][0]["secteur_id"] for m in data["top_metiers"]))

    def test_HP4c_metier_sous_sous_domaine_remonte_au_secteur(self):
        """Un métier rattaché à un sous-domaine est compté dans le secteur racine, et son domaine
        est le domaine intermédiaire (secteur → domaine → sous-domaine → métier)."""
        secteur = GroupeMetier.objects.get(code="TST-SECT")
        domaine = GroupeMetier.objects.get(code="TST-DOM-IT")
        sous = GroupeMetier.objects.create(code="TST-SDOM", libelle="Sous-domaine IT", type_groupe="sous_domaine_source", parent=domaine)
        metier = Metier.objects.create(code="TST-M-SOUS", libelle="Data Analyst", groupe_principal=sous)
        OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Data", wilaya="31 - Oran", metier=metier, type_contrat="CDI",
            experience_requise="DEBUTANT", statut_moderation="APPROUVEE", est_active=True,
        )
        self.client.force_authenticate(user=self.admin)
        data = self.client.get("/api/jobs/admin/marche/").data
        self.assertEqual(data["top_secteurs"][0]["libelle"], secteur.libelle)
        self.assertEqual(data["top_secteurs"][0]["nb_offres"], 4)
        data_analyst = next(m for m in data["top_metiers"] if m["libelle"] == "Data Analyst")
        self.assertEqual(data_analyst["secteur"], "Secteur Test")
        self.assertEqual(data_analyst["domaine"], "Domaine IT")

    def test_HP5_matching_moyen_calcule(self):
        """HP5 : Le matching moyen est correctement calculé."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        matching = response.data["matching_moyen"]
        self.assertIsNotNone(matching)
        # Moyenne de 75.0 et 85.0 = 80.0
        self.assertAlmostEqual(float(matching), 80.0, delta=0.1)

    def test_HP6_salaires_par_secteur_calcules(self):
        """HP6 : Les salaires moyens proposés par secteur sont calculés (tension_par_secteur,
        remplace l'ancien salaires_par_secteur — session 21/08/2026, voir CLAUDE.md)."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        tension = response.data["tension_par_secteur"]
        self.assertGreater(len(tension), 0)
        secteur_data = next((s for s in tension if s["secteur"] == "Secteur Test"), None)
        self.assertIsNotNone(secteur_data)
        # Moyenne des 3 offres du secteur : (80000 + 90000 + 60000) / 3 = 76666
        self.assertEqual(secteur_data["moy_salaire_offres"], 76666)

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
            type_contrat="CDI",
            experience_requise="DEBUTANT",
            salaire_propose="Négociable",
            statut_moderation="APPROUVEE",
            est_active=True
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/marche/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)