from django.test import TestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise
# Assure-toi que l'import correspond bien au chemin de ton fichier service
from jobs.services import EntrepriseService 

User = get_user_model()

class EntrepriseServiceTest(TestCase):
    def setUp(self):
        # 1. Edge Case : Un utilisateur qui n'a pas encore le bon rôle
        self.user_candidat = User.objects.create_user(
            username="futur_rh", email="rh@test.com", password="pwd", role="CANDIDAT"
        )
        
        # 2. Happy Path : Un utilisateur qui a déjà le bon rôle
        self.user_rh = User.objects.create_user(
            username="vrai_rh", email="vrai_rh@test.com", password="pwd", role="RECRUTEUR"
        )

        # Les données envoyées par React
        self.data = {
            "nom_entreprise": "TafTech",
            "secteur_activite": "IT",
            "wilaya_siege": "31 - Oran",
            "registre_commerce": "RC12345"
        }

    def test_creer_profil_met_a_jour_role(self):
        """ 
        EDGE CASE : L'élévation de privilège.
        Vérifie qu'un candidat devient officiellement recruteur lors de la création de l'entreprise.
        """
        profil = EntrepriseService.creer_profil(self.user_candidat, self.data)

        # On vérifie que l'entreprise est bien créée
        self.assertEqual(profil.nom_entreprise, "TafTech")
        self.assertEqual(profil.user, self.user_candidat)
        
        # On rafraîchit l'utilisateur depuis la base de données pour vérifier la mise à jour
        self.user_candidat.refresh_from_db()
        self.assertEqual(self.user_candidat.role, "RECRUTEUR")

    def test_creer_profil_role_deja_correct(self):
        """ 
        HAPPY PATH : La création classique.
        Si l'utilisateur est déjà recruteur, on crée juste l'entreprise.
        """
        profil = EntrepriseService.creer_profil(self.user_rh, self.data)

        self.assertEqual(profil.nom_entreprise, "TafTech")
        self.assertEqual(profil.user, self.user_rh)
        
        self.user_rh.refresh_from_db()
        self.assertEqual(self.user_rh.role, "RECRUTEUR")