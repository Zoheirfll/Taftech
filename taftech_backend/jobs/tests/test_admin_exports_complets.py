"""Exports Excel de l'administration : colonnes complètes et à jour, mêmes filtres que la liste affichée,
trace dans le journal d'audit, aucun NIN, aucune formule Excel exécutable, réservés aux admins."""
import datetime
from io import BytesIO

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from openpyxl import load_workbook
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import SystemErrorLog
from jobs.models import (
    Appellation, AuditLog, Candidature, DemandeActivationPremium, DemandeAjout, ExperienceCandidat,
    FormationCandidat, GroupeMetier, Metier, OffreEmploi, ProfilCandidat, ProfilEntreprise, RendezVous,
)

User = get_user_model()
TOUTES_LES_ROUTES = (
    'export-utilisateurs', 'export-candidatures', 'export-entreprises', 'export-offres',
    'export-demandes-ajout', 'export-demandes-premium', 'export-rendez-vous', 'export-audit-logs',
    'export-erreurs-systeme',
)
NIN = "123456789012345678"
PIEGE = '=HYPERLINK("http://evil.test","clic")'


def lire(reponse):
    """(en-têtes, lignes sous forme de dicts) de la première feuille."""
    feuille = load_workbook(BytesIO(reponse.content)).active
    lignes = list(feuille.iter_rows(values_only=True))
    entetes = list(lignes[0])
    return entetes, [dict(zip(entetes, ligne)) for ligne in lignes[1:]]


class ExportsAdminBase(APITestCase):
    def setUp(self):
        self.super_admin = User.objects.create_user(
            username="boss", email="boss@test.dz", role="ADMIN", is_staff=True, is_superuser=True)
        self.admin = User.objects.create_user(username="adm", email="adm@test.dz", role="ADMIN", is_staff=True)
        groupe = GroupeMetier.objects.create(code="G-INFO", libelle="Informatique", type_groupe="domaine_source")
        self.dev = Metier.objects.create(code="M-DEV", libelle="Études et développement informatique", groupe_principal=groupe)
        self.web = Appellation.objects.create(code="A-WEB", libelle="Développeur web", metier=self.dev, cle_recherche="developpeur web")

        self.cand = User.objects.create_user(
            username="cand", email="cand@test.dz", role="CANDIDAT", first_name="Karim", last_name="Ali",
            telephone="0550000001", date_naissance=datetime.date(1995, 4, 12), nin=NIN)
        self.profil = ProfilCandidat.objects.create(
            user=self.cand, titre_professionnel="Développeur", sexe="HOMME", wilaya="31 - Oran", commune="Bir El Djir",
            adresse="12 rue des Lilas", metier=self.dev, metier_appellation=self.web,
            metier_souhaite=self.dev, metier_souhaite_appellation=self.web,
            langues="Arabe:Maternelle,Anglais:Avancé", salaire_souhaite="80000 DA", visible_cvtheque=True,
        )
        ExperienceCandidat.objects.create(profil=self.profil, titre_poste="Dev", entreprise="Taziri", date_debut=datetime.date(2024, 1, 1))
        FormationCandidat.objects.create(profil=self.profil, diplome="Master", etablissement="Oran 1")

        self.rh = User.objects.create_user(username="rh", email="rh@test.dz", role="RECRUTEUR", first_name="Sara", last_name="Benali")
        self.entreprise = ProfilEntreprise.objects.create(user=self.rh, nom_entreprise="TestCo", est_approuvee=True, wilaya_siege="31 - Oran")
        self.offre = OffreEmploi.objects.create(entreprise=self.entreprise, titre="Ingénieur", wilaya="31 - Oran")
        self.candidature = Candidature.objects.create(offre=self.offre, candidat=self.cand, statut="RETENU", score_matching=77)
        self.client.force_authenticate(user=self.admin)

    def get(self, nom, **params):
        return self.client.get(reverse(nom), params)


class ExportUtilisateursTests(ExportsAdminBase):
    def test_colonnes_completes_avec_le_nin(self):
        entetes, _ = lire(self.get('export-utilisateurs'))
        for colonne in ('ID', 'Email', 'Nom', 'Prénom', 'Rôle', 'Actif', "Date d'inscription", 'Dernière connexion',
                        'Téléphone', 'Date de naissance', 'NIN', 'Sexe', 'Wilaya', 'Commune', 'Adresse', 'Titre professionnel',
                        'Métier (appellation)', 'Métier officiel', 'Métier souhaité (appellation)',
                        'Nb expériences', 'Nb formations', 'Langues', 'CV déposé', 'Complétude du profil (%)',
                        'Nb candidatures', 'Entreprise'):
            self.assertIn(colonne, entetes)

    def test_valeurs_du_candidat(self):
        _, lignes = lire(self.get('export-utilisateurs', role='CANDIDAT'))
        ligne = next(l for l in lignes if l['Email'] == 'cand@test.dz')
        self.assertEqual(ligne['Date de naissance'], '12/04/1995')
        self.assertEqual(ligne['Adresse'], '12 rue des Lilas')
        self.assertEqual(ligne['Commune'], 'Bir El Djir')
        self.assertEqual(ligne['Métier (appellation)'], 'Développeur web')
        self.assertEqual(ligne['Métier officiel'], 'Études et développement informatique')
        self.assertEqual(ligne['Métier souhaité (appellation)'], 'Développeur web')
        self.assertEqual((ligne['Nb expériences'], ligne['Nb formations'], ligne['Nb candidatures']), (1, 1, 1))
        self.assertEqual(ligne['Langues'], 'Arabe:Maternelle,Anglais:Avancé')
        self.assertEqual(ligne['CV déposé'], 'Non')

    def test_valeurs_du_recruteur(self):
        _, lignes = lire(self.get('export-utilisateurs', role='RECRUTEUR'))
        ligne = next(l for l in lignes if l['Email'] == 'rh@test.dz')
        self.assertEqual(ligne['Entreprise'], 'TestCo')
        self.assertEqual(ligne['Entreprise validée'], 'Oui')

    def test_le_nin_est_exporte_en_texte_complet(self):
        """Décision de l'utilisateur (20/10/2026) : le NIN figure dans l'export des utilisateurs, en texte (18
        chiffres : jamais converti en nombre, qui perdrait des chiffres)."""
        _, lignes = lire(self.get('export-utilisateurs'))
        par_email = {l['Email']: l for l in lignes}
        self.assertEqual(par_email['cand@test.dz']['NIN'], NIN)
        self.assertIsInstance(par_email['cand@test.dz']['NIN'], str)
        self.assertIn(par_email['rh@test.dz']['NIN'], (None, ''))  # un recruteur n'a pas de NIN

    def test_le_nin_n_apparait_dans_aucun_autre_export(self):
        for nom in TOUTES_LES_ROUTES:
            if nom == 'export-utilisateurs':
                continue
            with self.subTest(route=nom):
                feuille = load_workbook(BytesIO(self.get(nom).content)).active
                self.assertNotIn(NIN, [str(c.value) for ligne in feuille.iter_rows() for c in ligne])

    def test_meme_perimetre_que_la_liste_les_super_admins_sont_exclus(self):
        _, lignes = lire(self.get('export-utilisateurs'))
        emails = {l['Email'] for l in lignes}
        self.assertNotIn('boss@test.dz', emails)
        self.assertEqual(emails, {'adm@test.dz', 'cand@test.dz', 'rh@test.dz'})

    def test_suit_les_filtres_de_la_liste(self):
        _, par_role = lire(self.get('export-utilisateurs', role='RECRUTEUR'))
        self.assertEqual([l['Email'] for l in par_role], ['rh@test.dz'])
        _, par_recherche = lire(self.get('export-utilisateurs', search='karim'))
        self.assertEqual([l['Email'] for l in par_recherche], ['cand@test.dz'])
        _, croises = lire(self.get('export-utilisateurs', role='RECRUTEUR', search='karim'))
        self.assertEqual(croises, [])

    def test_l_export_est_trace_dans_le_journal_d_audit(self):
        self.get('export-utilisateurs', role='CANDIDAT')
        trace = AuditLog.objects.get(admin=self.admin, action='AUTRE')
        self.assertIn('Export utilisateurs', trace.detail)
        self.assertIn('1 ligne', trace.detail)
        self.assertIn('role=CANDIDAT', trace.detail)
        self.assertIn('contient le NIN', trace.detail)  # la trace dit que des données très sensibles sont sorties


class ExportsCommunsTests(ExportsAdminBase):
    def test_reserves_aux_administrateurs(self):
        for utilisateur in (self.rh, self.cand):
            self.client.force_authenticate(user=utilisateur)
            for nom in TOUTES_LES_ROUTES:
                with self.subTest(utilisateur=utilisateur.role, route=nom):
                    self.assertEqual(self.get(nom).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=None)
        self.assertIn(self.get('export-utilisateurs').status_code, (401, 403))

    def test_chaque_export_renvoie_un_classeur_et_est_trace(self):
        DemandeAjout.objects.create(type='METIER', libelle='Soudeur', cle_recherche='soudeur')
        DemandeActivationPremium.objects.create(entreprise=self.entreprise, moyen_paiement='CIB', nb_mois=3)
        RendezVous.objects.create(candidat=self.cand, date_heure=timezone.now(), motif='Conseil')
        SystemErrorLog.objects.create(message='ECHEC_TEST', details='boom')
        for nom in TOUTES_LES_ROUTES:
            with self.subTest(route=nom):
                reponse = self.get(nom)
                self.assertEqual(reponse.status_code, 200)
                self.assertIn('spreadsheetml', reponse['Content-Type'])
                self.assertIn('attachment', reponse['Content-Disposition'])
        self.assertEqual(AuditLog.objects.filter(action='AUTRE', detail__startswith='Export ').count(), len(TOUTES_LES_ROUTES))

    def test_chaque_ligne_a_autant_de_cellules_que_d_en_tetes(self):
        """Une cellule en trop ou en moins décalerait toutes les colonnes suivantes (bug trouvé sur les
        comptes sans profil candidat)."""
        DemandeAjout.objects.create(type='METIER', libelle='Soudeur', cle_recherche='soudeur')
        DemandeActivationPremium.objects.create(entreprise=self.entreprise, moyen_paiement='CIB', nb_mois=3)
        RendezVous.objects.create(candidat=self.cand, date_heure=timezone.now(), motif='Conseil')
        SystemErrorLog.objects.create(message='ECHEC_TEST')
        AuditLog.objects.create(admin=None, action='AUTRE', detail='x')
        for nom in TOUTES_LES_ROUTES:
            with self.subTest(route=nom):
                feuille = load_workbook(BytesIO(self.get(nom).content)).active
                lignes = list(feuille.iter_rows(values_only=True))
                self.assertGreater(len(lignes), 1, "aucune ligne de données")
                self.assertEqual({len(ligne) for ligne in lignes}, {len(lignes[0])})
        # Compte sans profil candidat ni entreprise : l'administrateur.
        _, par_role = lire(self.get('export-utilisateurs', role='ADMIN'))
        self.assertEqual(par_role[0]['Email'], 'adm@test.dz')

    def test_aucune_formule_excel_n_est_executable(self):
        User.objects.filter(pk=self.cand.pk).update(last_name=PIEGE)
        DemandeAjout.objects.create(type='METIER', libelle=PIEGE, cle_recherche='piege')
        SystemErrorLog.objects.create(message=PIEGE, details=PIEGE)
        AuditLog.objects.create(admin=self.admin, action='AUTRE', detail=PIEGE)
        for nom in TOUTES_LES_ROUTES:
            with self.subTest(route=nom):
                feuille = load_workbook(BytesIO(self.get(nom).content)).active
                self.assertTrue(all(c.data_type != 'f' for ligne in feuille.iter_rows() for c in ligne))


class ExportCandidaturesEntreprisesOffresTests(ExportsAdminBase):
    def test_candidatures_colonnes_a_jour_et_filtres(self):
        entetes, lignes = lire(self.get('export-candidatures'))
        for colonne in ('Téléphone', 'Wilaya du candidat', 'Source', 'Date entretien', 'Score IA (%)'):
            self.assertIn(colonne, entetes)
        self.assertEqual(len(lignes), 1)
        self.assertEqual(lignes[0]['Score IA (%)'], 77)
        _, aucune = lire(self.get('export-candidatures', statut='REFUSE'))
        self.assertEqual(aucune, [])
        _, trouvee = lire(self.get('export-candidatures', search='ingénieur'))
        self.assertEqual(len(trouvee), 1)

    def test_entreprises_colonnes_a_jour_et_filtres(self):
        entetes, lignes = lire(self.get('export-entreprises'))
        for colonne in ('Slug', 'Site web', 'Adresse', 'Registre de commerce', 'Palier', "Fin d'abonnement",
                        'Nb offres', 'Nb candidatures reçues', 'Responsable'):
            self.assertIn(colonne, entetes)
        self.assertEqual((lignes[0]['Nom'], lignes[0]['Nb offres'], lignes[0]['Nb candidatures reçues']), ('TestCo', 1, 1))
        _, aucune = lire(self.get('export-entreprises', search='introuvable'))
        self.assertEqual(aucune, [])

    def test_offres_colonnes_a_jour_et_filtres(self):
        entetes, lignes = lire(self.get('export-offres'))
        for colonne in ('Code public', 'Commune', 'Expérience requise', 'Nombre de postes', "Date d'expiration",
                        'Nb candidatures', 'Motif de rejet'):
            self.assertIn(colonne, entetes)
        self.assertEqual((lignes[0]['Titre'], lignes[0]['Nb candidatures']), ('Ingénieur', 1))
        _, aucune = lire(self.get('export-offres', statut='REJETEE'))
        self.assertEqual(aucune, [])


class NouveauxExportsTests(ExportsAdminBase):
    def test_demandes_ajout_avec_filtres(self):
        DemandeAjout.objects.create(type='METIER', libelle='Soudeur', cle_recherche='soudeur')
        DemandeAjout.objects.create(type='COMPETENCE', libelle='Docker', cle_recherche='docker')
        entetes, lignes = lire(self.get('export-demandes-ajout'))
        for colonne in ('Type', 'Libellé', 'Statut', 'Date de création', 'Traitée par'):
            self.assertIn(colonne, entetes)
        self.assertEqual(len(lignes), 2)
        _, filtrees = lire(self.get('export-demandes-ajout', type='METIER'))
        self.assertEqual([l['Libellé'] for l in filtrees], ['Soudeur'])
        _, recherchees = lire(self.get('export-demandes-ajout', search='dock'))
        self.assertEqual([l['Libellé'] for l in recherchees], ['Docker'])

    def test_demandes_premium(self):
        DemandeActivationPremium.objects.create(entreprise=self.entreprise, moyen_paiement='CIB', nb_mois=3)
        entetes, lignes = lire(self.get('export-demandes-premium'))
        for colonne in ('Entreprise', 'Email', 'Moyen de paiement', 'Nombre de mois', 'Traitée', 'Date de la demande'):
            self.assertIn(colonne, entetes)
        self.assertEqual((lignes[0]['Entreprise'], lignes[0]['Moyen de paiement'], lignes[0]['Traitée']), ('TestCo', 'CIB', 'Non'))

    def test_demandes_premium_suit_le_filtre_de_la_page(self):
        DemandeActivationPremium.objects.create(entreprise=self.entreprise, moyen_paiement='CIB', nb_mois=1)
        DemandeActivationPremium.objects.create(entreprise=self.entreprise, moyen_paiement='EDAHABIA', nb_mois=6, est_traitee=True)
        _, toutes = lire(self.get('export-demandes-premium'))
        _, en_attente = lire(self.get('export-demandes-premium', statut='attente'))
        _, traitees = lire(self.get('export-demandes-premium', statut='traitee'))
        self.assertEqual((len(toutes), len(en_attente), len(traitees)), (2, 1, 1))
        self.assertEqual(en_attente[0]['Moyen de paiement'], 'CIB')
        self.assertEqual(traitees[0]['Traitée'], 'Oui')

    def test_rendez_vous_avec_filtre_de_statut(self):
        RendezVous.objects.create(candidat=self.cand, date_heure=timezone.now(), motif='Conseil carrière')
        entetes, lignes = lire(self.get('export-rendez-vous'))
        for colonne in ('Candidat', 'Email', 'Date et heure', 'Motif', 'Statut', 'Notes admin'):
            self.assertIn(colonne, entetes)
        self.assertEqual((lignes[0]['Candidat'], lignes[0]['Motif']), ('Karim Ali', 'Conseil carrière'))
        _, aucun = lire(self.get('export-rendez-vous', statut='ANNULE'))
        self.assertEqual(aucun, [])

    def test_journal_d_audit_avec_recherche(self):
        AuditLog.objects.create(admin=self.admin, action='APPROUVER_OFFRE', detail="offre #1 - Soudeur")
        AuditLog.objects.create(admin=self.admin, action='AUTRE', detail="autre chose")
        _, lignes = lire(self.get('export-audit-logs', search='soudeur'))
        self.assertEqual([l['Action'] for l in lignes], ['APPROUVER_OFFRE'])
        self.assertEqual(lignes[0]['Administrateur'], 'adm@test.dz')

    def test_erreurs_systeme_sans_trace_technique_ni_agent(self):
        SystemErrorLog.objects.create(message='ECHEC_TEST', details='boom', url='http://localhost/x', stack_trace='SECRET-STACK',
                                      user_agent='Mozilla')
        entetes, lignes = lire(self.get('export-erreurs-systeme'))
        for colonne in ('Date', 'Message', 'Détails', 'URL', 'Utilisateur'):
            self.assertIn(colonne, entetes)
        self.assertEqual(lignes[0]['Message'], 'ECHEC_TEST')
        feuille = load_workbook(BytesIO(self.get('export-erreurs-systeme').content)).active
        self.assertNotIn('SECRET-STACK', [str(c.value) for ligne in feuille.iter_rows() for c in ligne])
