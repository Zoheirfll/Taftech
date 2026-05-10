from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilCandidat, ExperienceCandidat, FormationCandidat, Candidature, OffreEmploi, ProfilEntreprise

User = get_user_model()

class ProfilAndCVTests(APITestCase):
    def setUp(self):
        # CORRECTION : Ajout des emails pour cand_a et cand_b
        # Création des candidats
        self.cand_a = User.objects.create_user(username="cand_a", email="canda@test.com", role="CANDIDAT")
        self.profil_a = ProfilCandidat.objects.create(user=self.cand_a, wilaya="16 - Alger")
        
        self.cand_b = User.objects.create_user(username="cand_b", email="candb@test.com", role="CANDIDAT")
        self.profil_b = ProfilCandidat.objects.create(user=self.cand_b, wilaya="31 - Oran")

        # Création d'une expérience pour le candidat A
        self.exp_a = ExperienceCandidat.objects.create(
            profil=self.profil_a, titre_poste="Dev", entreprise="Google", date_debut="2020-01-01"
        )

    def test_update_profil_candidat_et_user(self):
        """ US-PROF-01: Mise à jour combinée User + Profil """
        self.client.force_authenticate(user=self.cand_a)
        url = reverse('profil-candidat')
        
        data = {
            "telephone": "0555998877", # Info User
            "wilaya": "31 - Oran",      # Info Profil
            "secteur_souhaite": "IT"
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérification en base
        self.cand_a.refresh_from_db()
        self.profil_a.refresh_from_db()
        self.assertEqual(self.cand_a.telephone, "0555998877")
        self.assertEqual(self.profil_a.wilaya, "31 - Oran")

    def test_crud_experience_success(self):
        """ US-CV-01: Ajouter et supprimer une expérience """
        self.client.force_authenticate(user=self.cand_a)
        
        # Test Ajout (POST)
        url_list = reverse('profil-experiences')
        data_post = {"titre_poste": "Lead Dev", "entreprise": "Meta", "date_debut": "2023-01-01"}
        res_post = self.client.post(url_list, data_post)
        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)
        
        # Test Suppression (DELETE)
        url_detail = reverse('profil-experience-detail', kwargs={'pk': self.exp_a.id})
        res_delete = self.client.delete(url_detail)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)

    def test_suppression_experience_autrui_interdite(self):
        """ US-CV-02 (EDGE CASE): Le candidat B tente de supprimer l'expérience du candidat A """
        self.client.force_authenticate(user=self.cand_b) # <-- Connexion du pirate
        
        url_detail = reverse('profil-experience-detail', kwargs={'pk': self.exp_a.id})
        response = self.client.delete(url_detail)
        
        # Doit échouer car la vue cherche: ExperienceCandidat.objects.get(pk=pk, profil=cand_b)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)