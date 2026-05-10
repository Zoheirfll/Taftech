from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilCandidat, ExperienceCandidat
import datetime

User = get_user_model()

class CVthequeAndAdvancedTests(APITestCase):
    def setUp(self):
        # CORRECTION : Ajout des adresses emails pour respecter la contrainte d'unicité (UniqueConstraint)
        self.rh = User.objects.create_user(username="rh_cv", email="rh_cv@test.com", role="RECRUTEUR")
        self.cand = User.objects.create_user(username="cand_ia", email="cand_ia@test.com", role="CANDIDAT")
        
        self.profil_cand = ProfilCandidat.objects.create(
            user=self.cand, wilaya="16 - Alger", specialite="IT", titre_professionnel="Dev React"
        )
        
        # On lui donne 3 ans d'expérience
        ExperienceCandidat.objects.create(
            profil=self.profil_cand,
            titre_poste="Dev Web",
            entreprise="WebCorp",
            date_debut=datetime.date.today() - datetime.timedelta(days=365*3),
            date_fin=datetime.date.today()
        )

    def test_acces_cvtheque_recruteur_uniquement(self):
        """ Edge Case: Seuls les recruteurs peuvent chasser les têtes """
        url = reverse('cvtheque-search')
        
        # Tentative du candidat (Doit échouer)
        self.client.force_authenticate(user=self.cand)
        response_fail = self.client.get(url)
        self.assertEqual(response_fail.status_code, status.HTTP_403_FORBIDDEN)
        
        # Tentative du recruteur (Succès)
        self.client.force_authenticate(user=self.rh)
        response_success = self.client.get(url)
        self.assertEqual(response_success.status_code, status.HTTP_200_OK)

    def test_recherche_cvtheque_par_experience(self):
        """ US-CVT-01: Le filtre de la somme des durées d'expériences """
        self.client.force_authenticate(user=self.rh)
        
        # On cherche quelqu'un avec au moins 2 ans d'XP. Le candidat en a 3, il doit ressortir.
        url_match = reverse('cvtheque-search') + "?experience=2"
        response_match = self.client.get(url_match)
        self.assertEqual(len(response_match.data['results']), 1)
        
        # On cherche quelqu'un avec 5 ans d'XP. Le candidat n'en a que 3, il ne doit pas ressortir.
        url_no_match = reverse('cvtheque-search') + "?experience=5"
        response_no_match = self.client.get(url_no_match)
        self.assertEqual(len(response_no_match.data['results']), 0)

    def test_offres_recommandees_ia(self):
        """ US-IA-01: L'IA scanne et propose des jobs """
        self.client.force_authenticate(user=self.cand)
        url = reverse('offres-recommandees')
        
        # L'algo de matcher est mocké ou exécuté. Si aucune offre n'existe, retourne []
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # La liste renvoyée est le Top 10 des offres (ici 0 car aucune offre créée dans le setUp)
        self.assertIsInstance(response.data, list)