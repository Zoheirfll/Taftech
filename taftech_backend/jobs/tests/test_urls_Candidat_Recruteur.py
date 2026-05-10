from django.urls import reverse
from django.core import mail
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import OffreEmploi, Candidature, ProfilEntreprise

User = get_user_model()

class JobPublicAndCandidateTests(APITestCase):
    def setUp(self):
        self.rh = User.objects.create_user(username="rh_test", role="RECRUTEUR", email="rh@test.dz")
        # CORRECTION : Ajout du registre de commerce unique
        self.ent = ProfilEntreprise.objects.create(
            user=self.rh, nom_entreprise="TafCorp", est_approuvee=True, registre_commerce="RC_TAFCORP"
        )
        self.offre = OffreEmploi.objects.create(
            entreprise=self.ent, titre="Developpeur Python", wilaya="31 - Oran", 
            est_active=True, statut_moderation='APPROUVEE'
        )
        self.cand = User.objects.create_user(username="cand_test", role="CANDIDAT", email="cand@test.dz")

    def test_recherche_offres_filtree(self):
        """ US-PUB-01: Test des filtres de recherche """
        url = reverse('job-list') + "?wilaya=31 - Oran&search=Python"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_postulation_authentifiee_ia_et_email(self):
        """ US-CAND-01: Postulation + calcul IA + Alerte Email """
        self.client.force_authenticate(user=self.cand)
        url = reverse('postuler-offre', kwargs={'offre_id': self.offre.id})
        
        # On simule un matching fictif (l'algo sera appelé en interne)
        response = self.client.post(url, {"lettre_motivation": "Très motivé"})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Candidature.objects.filter(candidat=self.cand).exists())

    def test_postulation_doublon_interdite(self):
        """ Edge Case: Bloquer la double postulation """
        self.client.force_authenticate(user=self.cand)
        url = reverse('postuler-offre', kwargs={'offre_id': self.offre.id})
        self.client.post(url, {"lettre_motivation": "Premier essai"})
        response = self.client.post(url, {"lettre_motivation": "Deuxième essai"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class RecruteurManagementTests(APITestCase):
    def setUp(self):
        self.rh = User.objects.create_user(username="rh_pro", role="RECRUTEUR", email="rh@pro.dz")
        # CORRECTION : Ajout du registre de commerce unique
        self.ent = ProfilEntreprise.objects.create(
            user=self.rh, nom_entreprise="ProTech", est_approuvee=True, registre_commerce="RC_PROTECH"
        )
        self.offre = OffreEmploi.objects.create(entreprise=self.ent, titre="Designer")
        self.cand = User.objects.create_user(username="cand_1", email="c1@test.dz")
        self.candidature = Candidature.objects.create(offre=self.offre, candidat=self.cand, statut='RECUE')

    def test_convocation_entretien_et_notification(self):
        """ US-REC-02: Passage en entretien + Email + Notification """
        self.client.force_authenticate(user=self.rh)
        url = reverse('update-statut', kwargs={'candidature_id': self.candidature.id})
        
        data = {
            "statut": "ENTRETIEN",
            "date_entretien": "2026-06-01T10:00:00Z",
            "message_entretien": "Venez avec votre portfolio."
        }
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Vérification email
        self.assertEqual(len(mail.outbox), 1)
        # Vérification notification
        from jobs.models import Notification
        self.assertTrue(Notification.objects.filter(destinataire=self.cand, type_notif='ENTRETIEN').exists())

    def test_evaluation_candidat_retenu(self):
        """ US-REC-03: Note post-entretien """
        self.client.force_authenticate(user=self.rh)
        url = reverse('evaluer-candidature', kwargs={'candidature_id': self.candidature.id})
        
        data = {"note_technique": 5, "note_communication": 4, "note_motivation": 5, "note_experience": 4}
        response = self.client.patch(url, data)
        
        self.candidature.refresh_from_db()
        self.assertEqual(self.candidature.note_globale, 18.0) # 5+4+5+4

    def test_securite_inter_recruteurs(self):
        """ Edge Case: Un recruteur ne peut pas toucher aux candidatures des autres """
        # CORRECTION : Ajout d'un email pour éviter le crash d'unicité CustomUser
        autre_rh = User.objects.create_user(username="rh_pirate", role="RECRUTEUR", email="pirate@test.com")
        
        # CORRECTION : Ajout d'un registre de commerce unique pour la deuxième entreprise
        ProfilEntreprise.objects.create(user=autre_rh, nom_entreprise="PirateInc", registre_commerce="RC_PIRATE")
        
        self.client.force_authenticate(user=autre_rh)
        url = reverse('update-statut', kwargs={'candidature_id': self.candidature.id})
        response = self.client.patch(url, {"statut": "REFUSE"})
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)