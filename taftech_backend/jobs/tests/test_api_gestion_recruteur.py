from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi, Candidature

User = get_user_model()

class GestionAvanceeRecruteurTests(APITestCase):
    def setUp(self):
        # CORRECTION : Ajout des emails pour rh_a et rh_b
        # Recruteur A (Le légitime)
        self.rh_a = User.objects.create_user(username="rh_a", email="rh_a@test.com", role="RECRUTEUR")
        self.ent_a = ProfilEntreprise.objects.create(
            user=self.rh_a, nom_entreprise="Apple", registre_commerce="RC_A", description="Old desc"
        )
        self.offre_a = OffreEmploi.objects.create(entreprise=self.ent_a, titre="iOS Dev")
        self.cand_a = Candidature.objects.create(offre=self.offre_a, statut="REFUSE")

        # Recruteur B (Le pirate)
        self.rh_b = User.objects.create_user(username="rh_b", email="rh_b@test.com", role="RECRUTEUR")
        self.ent_b = ProfilEntreprise.objects.create(user=self.rh_b, nom_entreprise="Microsoft", registre_commerce="RC_B")

    def test_update_profil_entreprise_securise(self):
        """ US-REC-04: Met à jour la description, mais ignore le nom d'entreprise (Edge Case) """
        self.client.force_authenticate(user=self.rh_a)
        url = reverse('update-entreprise')
        
        data = {
            "description": "Nouvelle description",
            "nom_entreprise": "PIRATE INC" # Tentative de hack
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.ent_a.refresh_from_db()
        # La description a bien changé
        self.assertEqual(self.ent_a.description, "Nouvelle description")
        # Le nom est resté intact !
        self.assertEqual(self.ent_a.nom_entreprise, "Apple")

    def test_cloturer_offre_success(self):
        """ US-REC-05: Le recruteur clôture sa propre offre """
        self.client.force_authenticate(user=self.rh_a)
        url = reverse('cloturer_offre', kwargs={'offre_id': self.offre_a.id})
        
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.offre_a.refresh_from_db()
        self.assertTrue(self.offre_a.est_cloturee)

    def test_cloturer_offre_concurrent_interdit(self):
        """ US-REC-07 (EDGE CASE): Le recruteur B tente de clôturer l'offre du recruteur A """
        self.client.force_authenticate(user=self.rh_b)
        url = reverse('cloturer_offre', kwargs={'offre_id': self.offre_a.id})
        
        response = self.client.patch(url)
        # La vue possède la vérification : if offre.entreprise.user != request.user
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        self.offre_a.refresh_from_db()
        self.assertFalse(self.offre_a.est_cloturee)

    def test_supprimer_candidature_concurrent_interdite(self):
        """ US-REC-07 (EDGE CASE): Le recruteur B tente de supprimer la candidature de A """
        self.client.force_authenticate(user=self.rh_b)
        url = reverse('supprimer_candidature', kwargs={'candidature_id': self.cand_a.id})
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)