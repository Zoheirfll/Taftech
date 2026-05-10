from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi, Candidature

User = get_user_model()

class ApiRecruteurTest(APITestCase):

    def setUp(self):
        # 1. Création de l'entreprise A (Le gentil)
        self.user_rh_a = User.objects.create_user(username="rh_a", email="rh_a@test.com", password="pwd", role="RECRUTEUR")
        # CORRECTION 1 : On passe l'entreprise à est_approuvee=True pour qu'il puisse publier
        self.entreprise_a = ProfilEntreprise.objects.create(
            user=self.user_rh_a, nom_entreprise="Tech A", registre_commerce="RC_A", est_approuvee=True
        )
        
        self.offre_a = OffreEmploi.objects.create(entreprise=self.entreprise_a, titre="Dev Python", wilaya="16 - Alger")
        
        # 2. Création de l'entreprise B (Le concurrent/pirate)
        self.user_rh_b = User.objects.create_user(username="rh_b", email="rh_b@test.com", password="pwd", role="RECRUTEUR")
        self.entreprise_b = ProfilEntreprise.objects.create(user=self.user_rh_b, nom_entreprise="Tech B", registre_commerce="RC_B")
        
        # 3. Création d'un candidat et de sa candidature pour l'entreprise A
        self.user_candidat = User.objects.create_user(username="candidat", email="cand@test.com", password="pwd", role="CANDIDAT")
        self.candidature_a = Candidature.objects.create(offre=self.offre_a, candidat=self.user_candidat, statut="RECUE")

    # =======================================================
    # TESTS DE CRÉATION D'OFFRE
    # =======================================================
    def test_creer_offre_success(self):
        """ Happy Path : Le recruteur A crée une offre """
        url = reverse('creer-offre')
        self.client.force_authenticate(user=self.user_rh_a)
        
        payload = {
            "titre": "Développeur Front",
            "wilaya": "31 - Oran",
            "type_contrat": "CDI",
            "experience_requise": "CONFIRME"
        }
        response = self.client.post(url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(OffreEmploi.objects.filter(titre="Développeur Front", entreprise=self.entreprise_a).exists())

    def test_candidat_ne_peut_pas_creer_offre(self):
        """ Edge Case : Un candidat tente d'accéder à la création d'offre """
        url = reverse('creer-offre')
        self.client.force_authenticate(user=self.user_candidat) 
        
        payload = {"titre": "Offre Pirate"}
        response = self.client.post(url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # =======================================================
    # TESTS DU DASHBOARD ET STATUTS
    # =======================================================
    def test_dashboard_recruteur_success(self):
        """ Happy Path : Le recruteur récupère son tableau de bord """
        url = reverse('dashboard-recruteur')
        self.client.force_authenticate(user=self.user_rh_a)
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # CORRECTION 2 : On lit dans le dictionnaire "offres"
        self.assertEqual(response.data['offres'][0]['titre'], "Dev Python")

    def test_modifier_statut_candidature_success(self):
        """ Happy Path : Le recruteur A passe le candidat en Entretien """
        url = reverse('update-statut', kwargs={'candidature_id': self.candidature_a.id})
        self.client.force_authenticate(user=self.user_rh_a)
        
        payload = {"statut": "ENTRETIEN"}
        response = self.client.patch(url, payload) 
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.candidature_a.refresh_from_db()
        self.assertEqual(self.candidature_a.statut, "ENTRETIEN")

    def test_modifier_statut_candidature_autrui_interdit(self):
        """ Edge Case (CRITIQUE) : Le recruteur B tente de modifier la candidature du recruteur A """
        url = reverse('update-statut', kwargs={'candidature_id': self.candidature_a.id})
        
        self.client.force_authenticate(user=self.user_rh_b)
        
        payload = {"statut": "REFUSE"}
        response = self.client.patch(url, payload)
        
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])
        
        self.candidature_a.refresh_from_db()
        self.assertEqual(self.candidature_a.statut, "RECUE")

    # =======================================================
    # TEST D'ÉVALUATION POST-ENTRETIEN
    # =======================================================
    def test_evaluer_candidature_success(self):
        """ Happy Path : Le recruteur remplit sa grille (US 5) """
        url = reverse('evaluer-candidature', kwargs={'candidature_id': self.candidature_a.id})
        self.client.force_authenticate(user=self.user_rh_a)
        
        # CORRECTION 3 : On envoie les 4 notes pour que la vue calcule correctement la note globale
        payload = {
            "note_technique": 4,
            "note_communication": 5,
            "note_motivation": 4,
            "note_experience": 3,
            "commentaire_evaluation": "Très bon profil"
        }
        response = self.client.patch(url, payload) 
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.candidature_a.refresh_from_db()
        # 4 + 5 + 4 + 3 = 16
        self.assertEqual(self.candidature_a.note_globale, 16)