from django.test import TestCase
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi, OffreSauvegardee, AlerteEmploi, Notification

User = get_user_model()

class OutilsAvancesModelsTest(TestCase):
    def setUp(self):
        # Préparation commune pour tous les tests
        self.candidat = User.objects.create_user(username="chercheur", email="chercheur@test.dz", password="pwd")
        self.recruteur = User.objects.create_user(username="rh_boss", email="boss@test.dz", password="pwd")
        
        self.entreprise = ProfilEntreprise.objects.create(user=self.recruteur, nom_entreprise="Taftech Partenaire", registre_commerce="RC999")
        self.offre = OffreEmploi.objects.create(entreprise=self.entreprise, titre="Chef de Projet", wilaya="16 - Alger")

    # ==========================================
    # 1. TESTS : OFFRES SAUVEGARDÉES (FAVORIS)
    # ==========================================
    def test_sauvegarde_offre_success(self):
        """ Happy Path : Un candidat sauvegarde une offre avec succès. """
        favori = OffreSauvegardee.objects.create(candidat=self.candidat, offre=self.offre)
        
        self.assertEqual(favori.candidat, self.candidat)
        self.assertEqual(favori.offre, self.offre)
        self.assertEqual(str(favori), "chercheur a sauvegardé l'offre : Chef de Projet")

    def test_sauvegarde_offre_double_interdite(self):
        """ 
        Edge Case (Critique) : Vérifie la sécurité "unique_together".
        Un candidat ne peut pas ajouter 2 fois la même offre dans ses favoris.
        """
        # 1ère sauvegarde : Succès
        OffreSauvegardee.objects.create(candidat=self.candidat, offre=self.offre)
        
        # 2ème sauvegarde de la MÊME offre : Doit déclencher une erreur d'intégrité de la base de données
        with self.assertRaises(IntegrityError):
            with transaction.atomic(): # Requis par Django pour intercepter proprement une erreur de base de données
                OffreSauvegardee.objects.create(candidat=self.candidat, offre=self.offre)

    # ==========================================
    # 2. TESTS : ALERTES EMPLOI
    # ==========================================
    def test_creation_alerte_emploi_valeurs_par_defaut(self):
        """ Vérifie qu'une alerte prend bien les bonnes valeurs par défaut. """
        alerte = AlerteEmploi.objects.create(
            candidat=self.candidat,
            mots_cles="React Developer",
            wilaya="31 - Oran"
        )
        
        # Vérification des sécurités et valeurs par défaut
        self.assertTrue(alerte.est_active)
        self.assertEqual(alerte.frequence, 'QUOTIDIENNE')
        self.assertEqual(str(alerte), "Alerte de chercheur - React Developer")

    # ==========================================
    # 3. TESTS : NOTIFICATIONS (BOÎTE DE RÉCEPTION)
    # ==========================================
    def test_creation_notification_valeurs_par_defaut(self):
        """ Vérifie qu'une notification est bien non-lue par défaut. """
        notif = Notification.objects.create(
            destinataire=self.candidat,
            titre="Votre candidature a été vue",
            message="Le recruteur a ouvert votre CV."
        )
        
        self.assertEqual(notif.type_notif, 'INFO') # Type par défaut
        self.assertFalse(notif.lue) # Ne doit pas être marquée "lue" à la création
        
        # Le __str__ utilise le get_FOO_display() de Django pour afficher "Information" au lieu de "INFO"
        self.assertEqual(str(notif), "Information pour chercheur")
        
    def test_notification_changement_etat_lu(self):
        """ Vérifie qu'on peut changer l'état de la notification (quand React appelle l'API). """
        notif = Notification.objects.create(destinataire=self.candidat, titre="Test", message="Test")
        
        # Simulation d'un clic de l'utilisateur sur la notification
        notif.lue = True
        notif.save()
        
        notif_rafraichie = Notification.objects.get(id=notif.id)
        self.assertTrue(notif_rafraichie.lue)