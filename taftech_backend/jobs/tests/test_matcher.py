import datetime
from unittest.mock import Mock
from django.test import TestCase
from jobs.matcher import calculer_score_matching

class MatcherAlgorithmTest(TestCase):

    def setUp(self):
        # 1. On prépare une FAUSSE offre d'emploi (Mock)
        self.offre = Mock()
        self.offre.specialite = "Informatique"
        self.offre.wilaya = "31 - Oran"
        self.offre.commune = "Bir El Djir"
        self.offre.diplome = "MASTER_2"
        self.offre.experience_requise = "CONFIRME" # Nécessite 3 ans
        self.offre.titre = "Développeur React Senior"
        self.offre.profil_recherche = "Maitrise de react, tailwind et python"

        # 2. On prépare un FAUX candidat de base
        self.candidat = Mock()
        self.profil = Mock()
        self.candidat.profil_candidat = self.profil
        
        # On vide les expériences par défaut
        self.profil.experiences_detail.all.return_value = []

    # ==========================================
    # 1. EDGE CASE : LE CANDIDAT FANTÔME
    # ==========================================
    def test_candidat_sans_profil_retourne_zero(self):
        """ Vérifie que si le candidat n'a pas rempli son profil, il a 0% d'office. """
        candidat_vide = Mock()
        del candidat_vide.profil_candidat # On simule l'absence de l'attribut
        
        resultat = calculer_score_matching(candidat_vide, self.offre)
        
        self.assertEqual(resultat['total'], 0.0)

    # ==========================================
    # 2. HAPPY PATH : LE CANDIDAT PARFAIT (100%)
    # ==========================================
    def test_candidat_parfait_score_maximal(self):
        """ Un candidat qui coche absolument toutes les cases doit avoir 100%. """
        self.profil.specialite = "Informatique"
        self.profil.wilaya = "31 - Oran"
        self.profil.commune = "Bir El Djir"
        self.profil.diplome = "MASTER_2"
        self.profil.competences = "react, python" # 2 tags trouvés sur 2 -> 15/15
        
        # On lui donne 4 ans d'expérience (pour un requis de 3 ans)
        exp = Mock()
        exp.titre_poste = "Développeur React"
        exp.entreprise = "Taziri"
        exp.description = "Création web"
        exp.date_debut = datetime.date.today() - datetime.timedelta(days=365 * 4)
        exp.date_fin = datetime.date.today()
        self.profil.experiences_detail.all.return_value = [exp]

        resultat = calculer_score_matching(self.candidat, self.offre)
        
        # Vérification détaillée (très pratique pour le débogage)
        self.assertEqual(resultat['details']['specialite'], 25.0)
        self.assertEqual(resultat['details']['region'], 20.0) # 15 wilaya + 5 commune
        self.assertEqual(resultat['details']['diplome'], 20.0)
        self.assertEqual(resultat['details']['experience'], 20.0)
        self.assertEqual(resultat['details']['competences'], 15.0)
        
        self.assertEqual(resultat['total'], 100.0)

    # ==========================================
    # 3. EDGE CASE : LE DIPLÔME JUSTE EN DESSOUS
    # ==========================================
    def test_candidat_diplome_inferieur(self):
        """ 
        Test de la règle métier : Si l'offre demande MASTER_2 et que le candidat a MASTER_1 (niveau -1),
        il doit recevoir 10 points sur 20 au lieu de 0 ou 20.
        """
        self.profil.specialite = None
        self.profil.secteur_souhaite = None # Pas de point de spécialité
        self.profil.wilaya = "16 - Alger"
        self.profil.commune = None
        self.profil.mobilite = "NATIONALE" # 15 points
        
        # Le test critique est ici : Master 1 vs Master 2
        self.profil.diplome = "MASTER_1" 
        
        self.profil.competences = "aucune"

        resultat = calculer_score_matching(self.candidat, self.offre)
        
        self.assertEqual(resultat['details']['diplome'], 10.0)

    # ==========================================
    # 4. EDGE CASE : LE TRI DES EXPÉRIENCES
    # ==========================================
    def test_experience_hors_sujet_ignoree(self):
        """
        Vérifie la sécurité de l'anomalie que tu as corrigée : 
        Une expérience de Caissier ne doit pas compter pour une offre en Informatique.
        """
        self.profil.specialite = "Informatique"
        self.profil.diplome = None
        self.profil.wilaya = None
        self.profil.competences = None
        
        # Expérience 1 : Hôte de caisse (Hors sujet, ne doit pas compter)
        exp1 = Mock()
        exp1.titre_poste = "Hôte de caisse"
        exp1.entreprise = "Uno"
        exp1.description = "Encaissement"
        exp1.date_debut = datetime.date.today() - datetime.timedelta(days=365 * 5) # 5 ans d'exp
        exp1.date_fin = datetime.date.today()
        
        self.profil.experiences_detail.all.return_value = [exp1]

        resultat = calculer_score_matching(self.candidat, self.offre)
        
        # Comme l'expérience de caissier ne contient ni "informatique", ni "react", ni "développeur", 
        # elle doit être rejetée par ton filtre "est_pertinente" !
        self.assertEqual(resultat['details']['experience'], 0.0)