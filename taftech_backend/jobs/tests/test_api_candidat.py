from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi, Candidature

User = get_user_model()

class ApiCandidatTest(APITestCase):

    def setUp(self):
        # 1. Création de l'environnement de base (Recruteur + Entreprise)
        self.user_rh = User.objects.create_user(username="rh_api", email="rh@test.com", password="pwd", role="RECRUTEUR")
        self.entreprise = ProfilEntreprise.objects.create(user=self.user_rh, nom_entreprise="API Corp", registre_commerce="RC1")
        
        # 2. Création de deux offres (Une valide, une cachée)
        self.offre_valide = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Dev React", wilaya="16 - Alger",
            est_active=True, statut_moderation="APPROUVEE", est_cloturee=False
        )
        self.offre_cachee = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Secret Job", wilaya="16 - Alger",
            est_active=True, statut_moderation="EN_ATTENTE", est_cloturee=False
        )

        # 3. Création du candidat pour les tests connectés
        self.user_candidat = User.objects.create_user(
            username="candidat_api", email="cand@test.com", password="pwd", role="CANDIDAT"
        )

    # =======================================================
    # TESTS DE LECTURE DES OFFRES
    # =======================================================
    def test_job_list_n_affiche_que_les_offres_approuvees(self):
        """ Vérifie que la route principale cache les offres en attente (Edge Case) """
        url = reverse('job-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Selon la pagination de DRF, les résultats sont souvent dans response.data['results']
        # Si tu n'utilises pas la pagination, c'est directement dans response.data
        data = response.data.get('results', response.data)
        
        # On ne doit voir que "Dev React" et surtout pas "Secret Job"
        titres_recus = [offre['titre'] for offre in data]
        self.assertIn("Dev React", titres_recus)
        self.assertNotIn("Secret Job", titres_recus)

    def test_job_detail_success(self):
        """ Vérifie qu'on peut lire les détails d'une offre spécifique """
        url = reverse('job-detail', kwargs={'offre_id': self.offre_valide.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['titre'], "Dev React")

    # =======================================================
    # TESTS DE POSTULATION
    # =======================================================
    def test_postuler_connecte_success(self):
        """ Happy Path : Un candidat connecté postule """
        url = reverse('postuler-offre', kwargs={'offre_id': self.offre_valide.id})
        
        # On authentifie le client de test avec notre candidat
        self.client.force_authenticate(user=self.user_candidat)
        
        payload = {"lettre_motivation": "Je suis très motivé pour ce poste."}
        response = self.client.post(url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Candidature.objects.filter(candidat=self.user_candidat, offre=self.offre_valide).exists())

    def test_postuler_connecte_rejette_anonymes(self):
        """ Edge Case : La route classique refuse les visiteurs non connectés """
        url = reverse('postuler-offre', kwargs={'offre_id': self.offre_valide.id})
        
        # On NE FORCE PAS l'authentification
        payload = {"lettre_motivation": "Pirate trying to apply."}
        response = self.client.post(url, payload)
        
        # DRF doit bloquer l'accès
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_postuler_rapide_success(self):
        """ Happy Path : Un visiteur utilise la route rapide """
        url = reverse('postuler-rapide', kwargs={'offre_id': self.offre_valide.id})
        
        # Client anonyme
        payload = {
            "nom_rapide": "Visiteur",
            "prenom_rapide": "Test",
            "email_rapide": "visiteur@test.com",
            "lettre_motivation": "Candidature rapide."
        }
        # Note: Pour tester un upload de fichier (CV), on utilise self.client.post avec format='multipart'
        response = self.client.post(url, payload, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # On vérifie en base que la candidature s'est bien créée sans lier de User
        candidature = Candidature.objects.get(email_rapide="visiteur@test.com")
        self.assertTrue(candidature.est_rapide)
        self.assertIsNone(candidature.candidat)