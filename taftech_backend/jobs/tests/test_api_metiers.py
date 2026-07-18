# test_api_metiers.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import MetierReferentiel, Secteur, Domaine, SousDomaine

User = get_user_model()


class MetierReferentielAPITestCase(TestCase):

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
        self.candidat = User.objects.create_user(
            username="candidat_test",
            email="candidat@test.dz",
            password="Pass1234!",
            role="CANDIDAT"
        )

        # Nomenclature ANEM de test
        self.secteur_j = Secteur.objects.create(code="J", libelle="Communication, média et multimédia")
        self.secteur_l = Secteur.objects.create(code="L", libelle="Support à l'entreprise")
        self.domaine_it = Domaine.objects.create(code="L18", libelle="Systèmes d'information et de télécommunication", secteur=self.secteur_l)
        self.domaine_finance = Domaine.objects.create(code="L12", libelle="Comptabilité et finance", secteur=self.secteur_l)

        # Métiers de test
        self.metier_it = MetierReferentiel.objects.create(
            titre="Développeur Full-Stack",
            domaine=self.domaine_it,
            code_fiche="L1801",
            fiche_metier="Développement informatique",
            secteur_code="L",
            est_actif=True
        )
        self.metier_finance = MetierReferentiel.objects.create(
            titre="Comptable Principal",
            domaine=self.domaine_finance,
            code_fiche="L1201",
            fiche_metier="Comptabilité",
            secteur_code="L",
            est_actif=True
        )
        self.metier_inactif = MetierReferentiel.objects.create(
            titre="Métier Obsolète",
            domaine=self.domaine_it,
            code_fiche="L1802",
            secteur_code="L",
            est_actif=False
        )

    # ==============================================
    # HAPPY PATHS — API PUBLIQUE
    # ==============================================

    def test_HP1_liste_publique_retourne_metiers_actifs(self):
        """HP1 : L'API publique retourne uniquement les métiers actifs."""
        response = self.client.get("/api/jobs/metiers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titres = [m["titre"] for m in response.data]
        self.assertIn("Développeur Full-Stack", titres)
        self.assertIn("Comptable Principal", titres)
        self.assertNotIn("Métier Obsolète", titres)

    def test_HP2_recherche_par_mot_simple(self):
        """HP2 : La recherche par mot simple fonctionne."""
        response = self.client.get("/api/jobs/metiers/?search=développeur")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titre"], "Développeur Full-Stack")

    def test_HP3_recherche_multi_mots(self):
        """HP3 : La recherche multi-mots fonctionne (ex: 'développeur full')."""
        response = self.client.get("/api/jobs/metiers/?search=développeur full")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titre"], "Développeur Full-Stack")

    def test_HP4_recherche_sans_resultat(self):
        """HP4 : Une recherche sans résultat retourne une liste vide."""
        response = self.client.get("/api/jobs/metiers/?search=astrophysicien")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_HP4b_filtre_par_domaine(self):
        """HP4b : Le filtre ?domaine=<code> restreint aux métiers de ce domaine."""
        response = self.client.get(f"/api/jobs/metiers/?domaine={self.domaine_finance.code}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titres = [m["titre"] for m in response.data]
        self.assertIn("Comptable Principal", titres)
        self.assertNotIn("Développeur Full-Stack", titres)

    # ==============================================
    # HAPPY PATHS — API ADMIN
    # ==============================================

    def test_HP5_admin_liste_tous_les_metiers(self):
        """HP5 : L'admin voit tous les métiers y compris inactifs."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/metiers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_HP6_admin_cree_un_metier(self):
        """HP6 : L'admin peut créer un nouveau métier."""
        self.client.force_authenticate(user=self.admin)
        payload = {
            "titre": "Ingénieur DevOps",
            "domaine": self.domaine_it.id,
            "code_fiche": "L1803",
            "secteur_code": "L",
            "est_actif": True
        }
        response = self.client.post("/api/jobs/admin/metiers/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            MetierReferentiel.objects.filter(titre="Ingénieur DevOps").exists()
        )

    def test_HP7_admin_modifie_un_metier(self):
        """HP7 : L'admin peut modifier un métier existant."""
        self.client.force_authenticate(user=self.admin)
        payload = {
            "titre": "Développeur Full-Stack Senior",
            "domaine": self.domaine_it.id,
            "code_fiche": "L1801",
            "secteur_code": "L",
            "est_actif": True
        }
        response = self.client.put(
            f"/api/jobs/admin/metiers/{self.metier_it.id}/",
            payload
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.metier_it.refresh_from_db()
        self.assertEqual(self.metier_it.titre, "Développeur Full-Stack Senior")

    def test_HP8_admin_supprime_un_metier(self):
        """HP8 : L'admin peut supprimer un métier."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(
            f"/api/jobs/admin/metiers/{self.metier_inactif.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            MetierReferentiel.objects.filter(id=self.metier_inactif.id).exists()
        )

    def test_HP9_admin_pagination(self):
        """HP9 : La pagination retourne 20 métiers par page."""
        # Créer 25 métiers supplémentaires
        for i in range(25):
            MetierReferentiel.objects.create(
                titre=f"Métier Test {i}",
                domaine=self.domaine_it,
                code_fiche=f"L99{i:02d}",
                secteur_code="L",
                est_actif=True
            )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/jobs/admin/metiers/?page=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertGreater(response.data["total_pages"], 1)

    # ==============================================
    # EDGE CASES
    # ==============================================

    def test_EC1_recruteur_ne_peut_pas_acceder_admin(self):
        """EC1 : Un recruteur ne peut pas accéder à l'API admin métiers."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get("/api/jobs/admin/metiers/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_EC2_candidat_ne_peut_pas_acceder_admin(self):
        """EC2 : Un candidat ne peut pas accéder à l'API admin métiers."""
        self.client.force_authenticate(user=self.candidat)
        response = self.client.get("/api/jobs/admin/metiers/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_EC3_non_authentifie_bloque_admin(self):
        """EC3 : Un utilisateur non authentifié est bloqué sur l'admin."""
        response = self.client.get("/api/jobs/admin/metiers/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_EC4_modifier_metier_inexistant(self):
        """EC4 : Modifier un métier inexistant retourne 404."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(
            "/api/jobs/admin/metiers/9999/",
            {"titre": "Test", "domaine": self.domaine_it.id, "code_fiche": "X", "secteur_code": "L", "est_actif": True}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_EC5_supprimer_metier_inexistant(self):
        """EC5 : Supprimer un métier inexistant retourne 404."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete("/api/jobs/admin/metiers/9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_EC6_api_publique_sans_authentification(self):
        """EC6 : L'API publique métiers est accessible sans authentification."""
        response = self.client.get("/api/jobs/metiers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
