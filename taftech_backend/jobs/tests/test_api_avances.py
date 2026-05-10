from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi, OffreSauvegardee, AlerteEmploi, Notification

User = get_user_model()

class ApiAvancesTest(APITestCase):

    def setUp(self):
        # 1. Création de l'entreprise et de l'offre
        self.user_rh = User.objects.create_user(username="rh", email="rh@test.com", password="pwd", role="RECRUTEUR")
        self.entreprise = ProfilEntreprise.objects.create(user=self.user_rh, nom_entreprise="TechCorp", registre_commerce="RC1")
        self.offre = OffreEmploi.objects.create(entreprise=self.entreprise, titre="Dev Fullstack", wilaya="31 - Oran")

        # 2. Création de deux candidats pour tester l'étanchéité
        self.candidat_a = User.objects.create_user(username="cand_a", email="a@test.com", password="pwd", role="CANDIDAT")
        self.candidat_b = User.objects.create_user(username="cand_b", email="b@test.com", password="pwd", role="CANDIDAT")

    # =======================================================
    # TESTS DES FAVORIS (OFFRES SAUVEGARDÉES)
    # =======================================================
    def test_ajouter_favori_success(self):
        """ Happy Path : Le candidat A sauvegarde une offre """
        url = reverse('liste-ajout-sauvegardes')
        self.client.force_authenticate(user=self.candidat_a)
        
        payload = {"offre": self.offre.id}
        response = self.client.post(url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(OffreSauvegardee.objects.filter(candidat=self.candidat_a, offre=self.offre).exists())

    def test_ajouter_favori_doublon_echoue(self):
        """ Edge Case : DRF bloque le double-clic (sauvegarde multiple) """
        url = reverse('liste-ajout-sauvegardes')
        self.client.force_authenticate(user=self.candidat_a)
        
        # Première sauvegarde (Succès)
        self.client.post(url, {"offre": self.offre.id})
        
        # Deuxième tentative (Doit échouer)
        response_doublon = self.client.post(url, {"offre": self.offre.id})
        self.assertEqual(response_doublon.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lister_favoris_etancheite(self):
        """ Edge Case : Le candidat B ne doit pas voir les favoris du candidat A """
        OffreSauvegardee.objects.create(candidat=self.candidat_a, offre=self.offre)
        
        url = reverse('liste-ajout-sauvegardes')
        
        # On authentifie le Candidat B
        self.client.force_authenticate(user=self.candidat_b)
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # CORRECTION : On vérifie directement la longueur de la liste renvoyée
        self.assertEqual(len(response.data), 0)

    # =======================================================
    # TESTS DES ALERTES EMPLOI
    # =======================================================
    def test_creer_alerte_success(self):
        """ Happy Path : Création d'une alerte emploi """
        url = reverse('liste-ajout-alertes')
        self.client.force_authenticate(user=self.candidat_a)
        
        payload = {
            "mots_cles": "React, Python",
            "wilaya": "16 - Alger",
            "frequence": "QUOTIDIENNE"
        }
        response = self.client.post(url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AlerteEmploi.objects.filter(candidat=self.candidat_a, mots_cles="React, Python").exists())

    # =======================================================
    # TESTS DES NOTIFICATIONS
    # =======================================================
    def test_marquer_notification_lue_success(self):
        """ Happy Path : Une notification non-lue passe à lue """
        notif = Notification.objects.create(
            destinataire=self.candidat_a, titre="Entretien", message="Demain à 9h", lue=False
        )
        
        url = reverse('notification-read', kwargs={'notif_id': notif.id})
        self.client.force_authenticate(user=self.candidat_a)
        
        # CORRECTION : Utilisation de PATCH au lieu de POST, pour correspondre à la vue
        response = self.client.patch(url) 
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.lue)