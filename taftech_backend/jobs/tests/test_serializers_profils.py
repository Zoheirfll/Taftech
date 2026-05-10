from django.test import TestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilCandidat, ExperienceCandidat
from jobs.serializers import CandidatInfoDTO, ProfilCandidatDTO

User = get_user_model()

class ProfilCandidatSerializersTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="candidat1", 
            email="candidat1@test.com", # <--- CORRECTION : Ajout de l'email
            first_name="Ali", 
            last_name="Dev"
        )
        self.profil = ProfilCandidat.objects.create(
            user=self.user, 
            wilaya="16 - Alger", 
            diplome="MASTER_2",
            secteur_souhaite="IT"
        )

    def test_candidat_info_dto_extraction_reussie(self):
        serializer = CandidatInfoDTO(self.user)
        data = serializer.data
        
        self.assertEqual(data['first_name'], "Ali")
        self.assertEqual(data['wilaya'], "16 - Alger")
        self.assertEqual(data['diplome'], "MASTER_2")
        self.assertEqual(data['secteur_souhaite'], "IT")
        self.assertEqual(data['experiences'], [])

    def test_candidat_info_dto_sans_profil(self):
        user_fantome = User.objects.create_user(
            username="fantome", 
            email="fantome@test.com", # <--- CORRECTION : Ajout de l'email
            first_name="Zorro"
        )
        
        serializer = CandidatInfoDTO(user_fantome)
        data = serializer.data
        
        self.assertEqual(data['first_name'], "Zorro")
        self.assertIsNone(data['wilaya'])
        self.assertIsNone(data['diplome'])
        self.assertEqual(data['experiences'], [])