import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, ProfilCandidat, ExperienceCandidat, FormationCandidat

User = get_user_model()

class ProfilEntrepriseModelTest(TestCase):
    def setUp(self):
        self.user_rh = User.objects.create_user(
            username="rh_test", email="rh@test.dz", password="pass", role="RECRUTEUR"
        )
        self.profil_entreprise = ProfilEntreprise.objects.create(
            user=self.user_rh,
            nom_entreprise="TafTech Corp",
            secteur_activite="IT",
            wilaya_siege="31 - Oran",
            registre_commerce="RC123456"
        )

    def test_creation_entreprise_et_securite(self):
        """ Vérifie que l'entreprise est créée et n'est PAS approuvée par défaut (Sécurité) """
        self.assertEqual(self.profil_entreprise.nom_entreprise, "TafTech Corp")
        self.assertFalse(self.profil_entreprise.est_approuvee)
        self.assertFalse(self.profil_entreprise.est_premium)

    def test_entreprise_str_representation(self):
        """ Vérifie l'affichage dans le panneau d'administration Django """
        self.assertEqual(str(self.profil_entreprise), "TafTech Corp")


class ProfilCandidatModelTest(TestCase):
    def setUp(self):
        self.user_candidat = User.objects.create_user(
            username="candidat_test", email="candidat@test.dz", password="pass", role="CANDIDAT"
        )
        self.profil_candidat = ProfilCandidat.objects.create(
            user=self.user_candidat,
            wilaya="16 - Alger",
            situation_actuelle="EN_RECHERCHE"
        )

    def test_creation_profil_candidat(self):
        """ Vérifie la création et les préférences de notification par défaut """
        self.assertEqual(self.profil_candidat.wilaya, "16 - Alger")
        # Par défaut, le candidat accepte les notifications (UX Emploitic)
        self.assertTrue(self.profil_candidat.notif_offres_exclusives)
        self.assertTrue(self.profil_candidat.notif_newsletter)

    def test_candidat_str_representation(self):
        self.assertEqual(str(self.profil_candidat), "Profil de candidat_test")


class ExperienceEtFormationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="dev_test", email="dev@test.dz", password="pass")
        self.profil = ProfilCandidat.objects.create(user=self.user)

    def test_tri_experiences_plus_recentes_en_premier(self):
        """ 
        Test crucial : Vérifie que la Meta class 'ordering = [-date_debut]' fonctionne.
        Le recruteur doit toujours voir la dernière expérience en haut du CV !
        """
        # Création d'une ancienne expérience (2020)
        exp_ancienne = ExperienceCandidat.objects.create(
            profil=self.profil,
            titre_poste="Stagiaire",
            entreprise="Boite A",
            date_debut=datetime.date(2020, 1, 1),
            date_fin=datetime.date(2020, 6, 1)
        )
        
        # Création d'une expérience récente (2023)
        exp_recente = ExperienceCandidat.objects.create(
            profil=self.profil,
            titre_poste="Développeur",
            entreprise="Boite B",
            date_debut=datetime.date(2023, 1, 1)
        )

        experiences = list(ExperienceCandidat.objects.filter(profil=self.profil))
        
        # L'expérience de 2023 DOIT être en première position (index 0)
        self.assertEqual(experiences[0], exp_recente)
        self.assertEqual(experiences[1], exp_ancienne)

    def test_tri_formations_plus_recentes_en_premier(self):
        """ Vérifie le tri pour les formations (ordering = [-date_fin]) """
        form_ancienne = FormationCandidat.objects.create(
            profil=self.profil, diplome="Licence", etablissement="Univ",
            date_debut=datetime.date(2018, 9, 1), date_fin=datetime.date(2021, 6, 1)
        )
        form_recente = FormationCandidat.objects.create(
            profil=self.profil, diplome="Master", etablissement="Univ",
            date_debut=datetime.date(2021, 9, 1), date_fin=datetime.date(2023, 6, 1)
        )

        formations = list(FormationCandidat.objects.filter(profil=self.profil))
        self.assertEqual(formations[0], form_recente)