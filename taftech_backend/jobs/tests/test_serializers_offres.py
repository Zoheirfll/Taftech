from django.test import TestCase
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
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


class ProfilEntrepriseAnneeCreationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="rec-annee", email="rec-annee@test.dz", password="Pass1234!", role="RECRUTEUR",
        )
        self.profil = ProfilEntreprise.objects.create(
            user=self.user, nom_entreprise="Boite Test", registre_commerce="RC-999",
            secteur_activite="C", wilaya_siege="31 - Oran", est_approuvee=True,
        )

    def test_annee_creation_nulle_par_defaut(self):
        self.assertIsNone(self.profil.annee_creation)

    def test_annee_creation_acceptee(self):
        self.profil.annee_creation = 2019
        self.profil.full_clean()
        self.profil.save()
        self.profil.refresh_from_db()
        self.assertEqual(self.profil.annee_creation, 2019)

    def test_annee_creation_trop_basse_rejetee(self):
        self.profil.annee_creation = 1800
        with self.assertRaises(DjangoValidationError):
            self.profil.full_clean()

    def test_annee_creation_exposee_api_publique(self):
        self.profil.annee_creation = 2015
        self.profil.save()
        response = self.client.get(f"/api/jobs/entreprises/{self.profil.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["annee_creation"], 2015)

    def test_annee_creation_null_api_publique(self):
        response = self.client.get(f"/api/jobs/entreprises/{self.profil.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["annee_creation"])


class UpdateProfilEntrepriseAnneeCreationAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="rec-put-annee", email="rec-put-annee@test.dz", password="Pass1234!", role="RECRUTEUR",
        )
        self.profil = ProfilEntreprise.objects.create(
            user=self.user, nom_entreprise="Boite Put", registre_commerce="RC-888",
            secteur_activite="C", wilaya_siege="31 - Oran", est_approuvee=True,
        )

    def test_put_annee_creation_valide(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            "/api/jobs/entreprise/update/",
            {"annee_creation": "2018"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.profil.refresh_from_db()
        self.assertEqual(self.profil.annee_creation, 2018)

    def test_put_annee_creation_vide_remet_a_none(self):
        self.profil.annee_creation = 2018
        self.profil.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            "/api/jobs/entreprise/update/",
            {"annee_creation": ""},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.profil.refresh_from_db()
        self.assertIsNone(self.profil.annee_creation)

    def test_put_annee_creation_invalide_rejetee(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            "/api/jobs/entreprise/update/",
            {"annee_creation": "pas-un-nombre"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)