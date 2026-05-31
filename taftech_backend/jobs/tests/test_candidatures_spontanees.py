# test_candidatures_spontanees.py
import tempfile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, CandidatureSpontanee

User = get_user_model()


class CandidaturesSpontaneesAPITestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.recruteur = User.objects.create_user(
            username="recruteur_test",
            email="recruteur@test.dz",
            password="Pass1234!",
            role="RECRUTEUR"
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.recruteur,
            nom_entreprise="TechCorp",
            secteur_activite="IT",
            registre_commerce="RC123",
            wilaya_siege="31 - Oran",
            est_approuvee=True
        )

        self.recruteur2 = User.objects.create_user(
            username="recruteur2",
            email="recruteur2@test.dz",
            password="Pass1234!",
            role="RECRUTEUR"
        )
        self.entreprise2 = ProfilEntreprise.objects.create(
            user=self.recruteur2,
            nom_entreprise="FinanceCorp",
            secteur_activite="FINANCE",
            registre_commerce="RC456",
            wilaya_siege="16 - Alger",
            est_approuvee=True
        )

        self.candidat = User.objects.create_user(
            username="candidat_test",
            email="candidat@test.dz",
            password="Pass1234!",
            role="CANDIDAT",
            first_name="Zoheir",
            last_name="Filali"
        )

        # Candidature spontanée existante
        self.candidature = CandidatureSpontanee.objects.create(
            candidat=self.candidat,
            entreprise=self.entreprise,
            nom="Filali",
            prenom="Zoheir",
            email="candidat@test.dz",
            telephone="0664540375",
            wilaya="31 - Oran",
            diplome="MASTER_2",
            specialite="IT",
            lettre_motivation="Je suis motivé.",
            lue=False
        )

    # ==============================================
    # HAPPY PATHS
    # ==============================================

    def test_HP1_recruteur_liste_candidatures_spontanees(self):
        """HP1 : Un recruteur peut lister ses candidatures spontanées."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get(
            "/api/jobs/dashboard/candidatures-spontanees/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["nom"], "Filali")

    def test_HP2_recruteur_ne_voit_pas_candidatures_autres(self):
        """HP2 : Un recruteur ne voit que ses propres candidatures spontanées."""
        self.client.force_authenticate(user=self.recruteur2)
        response = self.client.get(
            "/api/jobs/dashboard/candidatures-spontanees/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_HP3_marquer_candidature_lue(self):
        """HP3 : Un recruteur peut marquer une candidature comme lue."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.patch(
            f"/api/jobs/dashboard/candidatures-spontanees/{self.candidature.id}/lire/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.candidature.refresh_from_db()
        self.assertTrue(self.candidature.lue)

    def test_HP4_supprimer_candidature_spontanee(self):
        """HP4 : Un recruteur peut supprimer une candidature spontanée."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.delete(
            f"/api/jobs/dashboard/candidatures-spontanees/{self.candidature.id}/supprimer/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            CandidatureSpontanee.objects.filter(
                id=self.candidature.id
            ).exists()
        )

    def test_HP5_envoyer_candidature_spontanee(self):
        """HP5 : Un candidat peut envoyer une candidature spontanée."""
        nouveau_candidat = User.objects.create_user(
            username="nouveau_candidat",
            email="nouveau@test.dz",
            password="Pass1234!",
            role="CANDIDAT"
        )
        self.client.force_authenticate(user=nouveau_candidat)
    
        import io
        cv_factice = io.BytesIO(b"Contenu CV factice")
        cv_factice.name = "cv_test.pdf"
    
        data = {
            "nom": "Nouveau",
            "prenom": "Candidat",
            "email": "nouveau@test.dz",
            "telephone": "0555000000",
            "wilaya": "31 - Oran",
            "diplome": "LICENCE",
            "specialite": "IT",
            "lettre_motivation": "Bonjour.",
            "cv": cv_factice,
        }
        response = self.client.post(
            f"/api/jobs/entreprises/{self.entreprise.id}/candidature-spontanee/",
            data=data,
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            CandidatureSpontanee.objects.filter(email="nouveau@test.dz").exists()
        )

    def test_HP6_candidature_spontanee_non_lue_par_defaut(self):
        """HP6 : Une candidature spontanée est non lue par défaut."""
        self.assertFalse(self.candidature.lue)

    def test_HP7_candidature_spontanee_contient_infos_wilaya_diplome(self):
        """HP7 : La candidature contient wilaya, diplome et specialite."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get(
            "/api/jobs/dashboard/candidatures-spontanees/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cand = response.data[0]
        self.assertEqual(cand["wilaya"], "31 - Oran")
        self.assertEqual(cand["diplome"], "MASTER_2")
        self.assertEqual(cand["specialite"], "IT")

    # ==============================================
    # EDGE CASES
    # ==============================================

    def test_EC1_candidat_ne_peut_pas_lister(self):
        """EC1 : Un candidat ne peut pas lister les candidatures spontanées."""
        self.client.force_authenticate(user=self.candidat)
        response = self.client.get(
            "/api/jobs/dashboard/candidatures-spontanees/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_EC2_non_authentifie_bloque(self):
        """EC2 : Un utilisateur non authentifié est bloqué."""
        response = self.client.get(
            "/api/jobs/dashboard/candidatures-spontanees/"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_EC3_marquer_lue_autre_recruteur_bloque(self):
        """EC3 : Un recruteur ne peut pas marquer la candidature d'un autre."""
        self.client.force_authenticate(user=self.recruteur2)
        response = self.client.patch(
            f"/api/jobs/dashboard/candidatures-spontanees/{self.candidature.id}/lire/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_EC4_supprimer_candidature_autre_recruteur_bloque(self):
        """EC4 : Un recruteur ne peut pas supprimer la candidature d'un autre."""
        self.client.force_authenticate(user=self.recruteur2)
        response = self.client.delete(
            f"/api/jobs/dashboard/candidatures-spontanees/{self.candidature.id}/supprimer/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_EC5_marquer_lue_candidature_inexistante(self):
        """EC5 : Marquer comme lue une candidature inexistante retourne 404."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.patch(
            "/api/jobs/dashboard/candidatures-spontanees/9999/lire/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_EC6_supprimer_candidature_inexistante(self):
        """EC6 : Supprimer une candidature inexistante retourne 404."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.delete(
            "/api/jobs/dashboard/candidatures-spontanees/9999/supprimer/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_EC7_recruteur_sans_entreprise_liste_vide(self):
        """EC7 : Un recruteur sans entreprise reçoit une liste vide."""
        recruteur_sans_ent = User.objects.create_user(
            username="recruteur_no_ent",
            email="noent@test.dz",
            password="Pass1234!",
            role="RECRUTEUR"
        )
        self.client.force_authenticate(user=recruteur_sans_ent)
        response = self.client.get(
            "/api/jobs/dashboard/candidatures-spontanees/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)