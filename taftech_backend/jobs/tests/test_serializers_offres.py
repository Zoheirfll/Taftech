from django.test import TestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi, Candidature
from jobs.serializers import (
    OffreEmploiCreateDTO, 
    PostulerRapideDTO, 
    EntreprisePublicSerializer
)

User = get_user_model()

class OffresCandidaturesSerializersTest(TestCase):
    def setUp(self):
        self.user_rh = User.objects.create_user(username="rh", email="rh@test.com", password="pwd")
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.user_rh, nom_entreprise="TechCorp", registre_commerce="RC123"
        )

    def test_offre_create_dto_valide(self):
        """ Vérifie que le DTO accepte les données de création d'offre. """
        data = {
            "titre": "Développeur Front",
            "wilaya": "31 - Oran",
            "type_contrat": "CDI",
            "experience_requise": "CONFIRME"
        }
        serializer = OffreEmploiCreateDTO(data=data)
        self.assertTrue(serializer.is_valid())

    def test_postuler_rapide_dto_valide(self):
        """ Vérifie que les données d'un visiteur sans compte sont bien formatées. """
        data = {
            "nom_rapide": "Benali",
            "prenom_rapide": "Samir",
            "email_rapide": "samir@test.com",
            "telephone_rapide": "0555123456"
        }
        serializer = PostulerRapideDTO(data=data)
        self.assertTrue(serializer.is_valid())

    def test_entreprise_public_serializer_filtre_offres(self):
        """ 
        EDGE CASE : Vérifie la méthode get_offres_actives.
        La vitrine publique ne doit afficher QUE les offres approuvées et en ligne.
        """
        # Offre 1 : Valide et en ligne
        OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre Visible", 
            est_active=True, statut_moderation="APPROUVEE", est_cloturee=False
        )
        # Offre 2 : En attente (Cachée)
        OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre Cachée", 
            est_active=True, statut_moderation="EN_ATTENTE", est_cloturee=False
        )
        
        serializer = EntreprisePublicSerializer(self.entreprise)
        
        # Le DTO ne doit renvoyer qu'une seule offre sur les deux
        self.assertEqual(len(serializer.data['offres_actives']), 1)
        self.assertEqual(serializer.data['offres_actives'][0]['titre'], "Offre Visible")