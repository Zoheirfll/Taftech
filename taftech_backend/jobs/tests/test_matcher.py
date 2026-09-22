import datetime
from unittest.mock import Mock
from django.test import TestCase
from jobs.matcher import calculer_score_matching
from jobs.models import Metier

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
        """ Un candidat qui coche toutes les cases EFFECTIVEMENT DEMANDÉES doit avoir 100%.
        Sur un `Mock`, `offre.diplomes_acceptes.all()`/`offre.competences_requises.all()`
        lèvent `TypeError` à l'itération (pas de couples/compétences structurés) — ces deux
        critères, ainsi que la spécialité (formation) sans OffreDiplomeAccepte, sont donc
        "non demandés" (S01, exclus du calcul), pas notés à 0. Seuls région et expérience
        restent actifs ici ; les critères diplôme/spécialité/compétences sont couverts avec
        de vraies relations FK dans test_matcher_diplome_specialite_s07.py et
        test_matcher_competences_s10.py. """
        self.profil.wilaya = "31 - Oran"
        self.profil.commune = "Bir El Djir"
        self.profil.mobilite = "AUCUNE"

        # On lui donne 4 ans d'expérience (pour un requis de 3 ans)
        exp = Mock()
        exp.titre_poste = "Développeur React"
        exp.entreprise = "Taziri"
        exp.description = "Création web"
        exp.metier = None
        exp.date_debut = datetime.date.today() - datetime.timedelta(days=365 * 4)
        exp.date_fin = datetime.date.today()
        self.profil.experiences_detail.all.return_value = [exp]

        resultat = calculer_score_matching(self.candidat, self.offre)

        self.assertEqual(resultat['details']['specialite'], 0.0)
        self.assertEqual(resultat['details']['region'], 20.0)
        self.assertEqual(resultat['details']['diplome'], 0.0)
        self.assertEqual(resultat['details']['experience'], 20.0)
        self.assertEqual(resultat['details']['competences'], 0.0)
        self.assertEqual(
            sorted(resultat['criteres_non_demandes']),
            ['competences', 'diplome', 'specialite'],
        )
        self.assertEqual(resultat['total'], 100.0)

    # ==========================================
    # 3. EDGE CASE : LE DIPLÔME JUSTE EN DESSOUS
    # ==========================================
    def test_candidat_diplome_inferieur_offre_sans_couples_critere_non_demande(self):
        """ F06/S05 (session 21/09/2026) : plus de rang hiérarchique implicite entre diplômes
        (BTS/Licence/Master...) — une offre sans `OffreDiplomeAccepte` explicite (le cas d'un
        `Mock`) n'a pas de critère diplôme évaluable du tout, quel que soit `profil.diplome`.
        Le diplôme candidat n'est plus jamais comparé à un rang de diplôme requis. """
        self.profil.wilaya = "16 - Alger"
        self.profil.commune = None
        self.profil.mobilite = "NATIONALE"
        self.profil.diplome = "MASTER_1"
        self.profil.competences = "aucune"

        resultat = calculer_score_matching(self.candidat, self.offre)

        self.assertEqual(resultat['details']['diplome'], 0.0)
        self.assertIn('diplome', resultat['criteres_non_demandes'])
        self.assertNotIn('diplome', resultat['criteres_manquants'])

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