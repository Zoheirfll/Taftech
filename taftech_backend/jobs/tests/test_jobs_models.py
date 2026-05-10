from django.test import TestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi, Candidature

User = get_user_model()

class OffreEmploiModelTest(TestCase):
    def setUp(self):
        # On prépare le terrain : Un recruteur et son entreprise
        self.user_rh = User.objects.create_user(username="rh", email="rh@test.com", password="pwd")
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.user_rh, nom_entreprise="Sonatrach", registre_commerce="RC001"
        )
        
        # On crée une offre d'emploi (Happy Path)
        self.offre = OffreEmploi.objects.create(
            entreprise=self.entreprise,
            titre="Ingénieur Data",
            wilaya="16 - Alger",
            type_contrat="CDI",
            experience_requise="CONFIRME"
        )

    def test_creation_offre_valeurs_par_defaut(self):
        """ 
        Test de sécurité (Edge Case) : Vérifie qu'une offre fraîchement créée 
        n'est PAS publiée automatiquement. Elle doit être 'EN_ATTENTE'.
        """
        self.assertEqual(self.offre.statut_moderation, 'EN_ATTENTE')
        self.assertTrue(self.offre.est_active)
        self.assertFalse(self.offre.est_cloturee)

    def test_offre_str_representation(self):
        """ Vérifie l'affichage de l'offre dans l'administration """
        self.assertEqual(str(self.offre), "Ingénieur Data - Sonatrach")


class CandidatureModelTest(TestCase):
    def setUp(self):
        # Préparation : Recruteur, Entreprise, Offre
        self.user_rh = User.objects.create_user(username="rh2", email="rh2@test.com", password="pwd")
        self.entreprise = ProfilEntreprise.objects.create(user=self.user_rh, nom_entreprise="Ooredoo", registre_commerce="RC002")
        self.offre = OffreEmploi.objects.create(entreprise=self.entreprise, titre="Développeur Web", wilaya="31 - Oran")
        
        # Préparation : Candidat standard
        self.user_candidat = User.objects.create_user(username="dev_pro", email="dev@test.com", password="pwd")

    # ==========================================
    # 1. HAPPY PATH : CANDIDATURE CLASSIQUE
    # ==========================================
    def test_candidature_standard_success(self):
        """ Un utilisateur connecté postule normalement. """
        candidature = Candidature.objects.create(
            offre=self.offre,
            candidat=self.user_candidat,
            est_rapide=False,
            score_matching=85.50
        )
        
        self.assertEqual(candidature.statut, 'RECUE')
        self.assertEqual(candidature.score_matching, 85.50)
        # Edge Case : Le __str__ utilise le username du candidat
        self.assertEqual(str(candidature), "dev_pro -> Développeur Web - 85.5%")

    # ==========================================
    # 2. EDGE CASE : POSTULATION RAPIDE (SANS COMPTE)
    # ==========================================
    def test_candidature_rapide_sans_compte(self):
        """ 
        Test critique : Un visiteur non connecté postule.
        Le champ 'candidat' (User) est null, on doit utiliser 'nom_rapide'.
        """
        candidature_rapide = Candidature.objects.create(
            offre=self.offre,
            candidat=None, # <--- AUCUN COMPTE DJANGO
            est_rapide=True,
            nom_rapide="Benali",
            prenom_rapide="Karim",
            email_rapide="karim@gmail.com"
        )
        
        self.assertTrue(candidature_rapide.est_rapide)
        self.assertIsNone(candidature_rapide.candidat)
        self.assertEqual(candidature_rapide.email_rapide, "karim@gmail.com")
        
        # Le __str__ doit s'adapter pour ne pas crasher sur un 'User' vide !
        self.assertEqual(str(candidature_rapide), "Benali Karim (Rapide) -> Développeur Web")

    # ==========================================
    # 3. HAPPY PATH : ÉVALUATION POST-ENTRETIEN (US 5)
    # ==========================================
    def test_evaluation_post_entretien_sauvegarde(self):
        """ 
        Vérifie que les nouveaux champs d'évaluation (US 5) s'enregistrent correctement 
        lorsque le recruteur note le candidat après l'entretien.
        """
        candidature = Candidature.objects.create(
            offre=self.offre,
            candidat=self.user_candidat,
            statut='ENTRETIEN',
            # Le recruteur remplit sa grille d'évaluation
            note_technique=4,
            note_communication=5,
            note_motivation=4,
            note_experience=3,
            note_globale=16.00,
            commentaire_evaluation="Excellent profil, à embaucher."
        )
        
        self.assertEqual(candidature.note_globale, 16.00)
        self.assertEqual(candidature.note_technique, 4)
        self.assertEqual(candidature.commentaire_evaluation, "Excellent profil, à embaucher.")