from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilCandidat, ExperienceCandidat, ProfilEntreprise, OffreEmploi
import datetime

User = get_user_model()

class CVthequeAndAdvancedTests(APITestCase):
    def setUp(self):
        self.rh = User.objects.create_user(username="rh_cv", email="rh_cv@test.com", role="RECRUTEUR")
        # ProfilEntreprise requis — CVThèque retourne 403 si pas d'entreprise
        ProfilEntreprise.objects.create(
            user=self.rh,
            nom_entreprise="CVCorp",
            registre_commerce="RC_CV",
            est_approuvee=True,
            est_premium=True,
            premium_expire_at=timezone.now() + timedelta(days=30),
        )
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
        url = reverse('cvtheque')
        
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
        url_match = reverse('cvtheque') + "?experience=2"
        response_match = self.client.get(url_match)
        self.assertEqual(len(response_match.data['results']), 1)
        
        # On cherche quelqu'un avec 5 ans d'XP. Le candidat n'en a que 3, il ne doit pas ressortir.
        url_no_match = reverse('cvtheque') + "?experience=5"
        response_no_match = self.client.get(url_no_match)
        self.assertEqual(len(response_no_match.data['results']), 0)

    def _creer_offre(self, **kwargs):
        entreprise = ProfilEntreprise.objects.get(user=self.rh)
        defaults = dict(
            entreprise=entreprise,
            titre="Développeur Django",
            wilaya="16 - Alger",
            specialite="IT",
            diplome="MASTER",
            experience_requise="3_5",
            type_contrat="CDI",
            statut_moderation="APPROUVEE",
            est_active=True,
            est_cloturee=False,
        )
        defaults.update(kwargs)
        return OffreEmploi.objects.create(**defaults)

    def test_cvtheque_avec_offre_id_retourne_score_offre(self):
        """offre_id dans la requête → chaque résultat a un champ score_offre."""
        offre = self._creer_offre()
        self.client.force_authenticate(user=self.rh)
        url = reverse('cvtheque') + f"?offre_id={offre.pk}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertTrue(len(results) >= 1)
        for item in results:
            self.assertIn('score_offre', item)
            self.assertIsInstance(item['score_offre'], (int, float))

    def test_cvtheque_sans_offre_id_pas_de_score_offre(self):
        """Sans offre_id, les résultats ne contiennent pas score_offre."""
        self._creer_offre()
        self.client.force_authenticate(user=self.rh)
        url = reverse('cvtheque')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        if results:
            self.assertNotIn('score_offre', results[0])

    def test_cvtheque_offre_id_inexistant_ignore_le_matching(self):
        """offre_id inexistant → pas d'erreur, résultats normaux sans tri par score."""
        self.client.force_authenticate(user=self.rh)
        url = reverse('cvtheque') + "?offre_id=99999"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_cvtheque_offre_id_autre_entreprise_ignore(self):
        """offre_id d'une autre entreprise → ignoré (aucun score_offre)."""
        autre_rh = User.objects.create_user(username="autre_rh", email="autre@test.dz", role="RECRUTEUR")
        autre_ent = ProfilEntreprise.objects.create(
            user=autre_rh, nom_entreprise="AutreCorp", registre_commerce="RC_AUTRE",
            est_approuvee=True, est_premium=True,
            premium_expire_at=timezone.now() + timedelta(days=30),
        )
        offre_autre = OffreEmploi.objects.create(
            entreprise=autre_ent, titre="Dev Java", wilaya="31 - Oran",
            specialite="IT", diplome="LICENCE", experience_requise="1_3",
            type_contrat="CDD", statut_moderation="APPROUVEE",
        )
        self.client.force_authenticate(user=self.rh)
        url = reverse('cvtheque') + f"?offre_id={offre_autre.pk}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # L'offre appartient à une autre entreprise → pas de matching activé
        results = response.data['results']
        if results:
            self.assertNotIn('score_offre', results[0])

    def test_offres_recommandees_ia(self):
        """ US-IA-01: L'IA scanne et propose des jobs """
        self.client.force_authenticate(user=self.cand)
        url = reverse('recommandations')
        
        # L'algo de matcher est mocké ou exécuté. Si aucune offre n'existe, retourne []
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # La liste renvoyée est le Top 10 des offres (ici 0 car aucune offre créée dans le setUp)
        self.assertIsInstance(response.data, list)