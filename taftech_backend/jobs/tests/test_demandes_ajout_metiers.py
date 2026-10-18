"""Étape 2 des demandes d'ajout : le type MÉTIER (adaptateur, API, reprise des anciennes propositions)."""
import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.demandes_ajout import DemandeRefusee, accepter_demande, creer_demande, rattacher_demande, refuser_demande
from jobs.models import (
    Appellation, DemandeAjout, GroupeMetier, Metier, Notification, ProfilEntreprise, PropositionMetier,
)
from jobs.referentiel_utils import normaliser_recherche, resoudre_metier_depuis_texte

User = get_user_model()
D = DemandeAjout


def _referentiel():
    groupe = GroupeMetier.objects.create(code='G-TEST', type_groupe='domaine_source', libelle='Informatique')
    GroupeMetier.objects.create(code='G-SECTEUR', type_groupe='secteur_source', libelle='Secteur sans métier')
    metier = Metier.objects.create(
        code='M-TEST', libelle='Développeur web', cle_recherche='developpeur web', groupe_principal=groupe, selectionnable=True,
    )
    metier.metier_canonique = metier
    metier.save(update_fields=['metier_canonique'])
    Appellation.objects.create(code='A-TEST', metier=metier, libelle='Développeur web', cle_recherche='developpeur web')
    return groupe, metier


class MetierServiceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.groupe, self.metier = _referentiel()
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)

    def demande(self, libelle='Technicien drone'):
        return creer_demande(self.candidat, 'METIER', libelle)[0]

    def test_une_demande_de_metier_n_a_aucun_effet_avant_decision(self):
        avant = (Metier.objects.count(), Appellation.objects.count())
        self.demande()
        self.assertEqual((Metier.objects.count(), Appellation.objects.count()), avant)
        self.assertIsNone(resoudre_metier_depuis_texte('Technicien drone'))

    def test_un_metier_deja_present_est_refuse(self):
        with self.assertRaises(DemandeRefusee) as ctx:
            creer_demande(self.candidat, 'METIER', 'DÉVELOPPEUR web')
        self.assertEqual(ctx.exception.code, 'ENTREE_EXISTANTE')

    def test_accepter_cree_le_metier_et_son_appellation(self):
        demande = self.demande()
        acceptee = accepter_demande(demande, self.admin, parent=self.groupe.pk)
        metier = Metier.objects.get(code=f'TAF-DM-{demande.pk}')
        self.assertEqual((metier.libelle, metier.groupe_principal, metier.selectionnable, metier.metier_canonique), ('Technicien drone', self.groupe, True, metier))
        self.assertTrue(Appellation.objects.filter(metier=metier, cle_recherche=normaliser_recherche('Technicien drone')).exists())
        self.assertEqual((acceptee.statut, acceptee.entree_id), (D.STATUT_ACCEPTEE, metier.pk))
        self.assertEqual(resoudre_metier_depuis_texte('Technicien drone').metier_canonique_id, metier.pk)

    def test_accepter_exige_un_groupe_de_metiers(self):
        demande = self.demande()
        for parent in (None, 99999, GroupeMetier.objects.get(code='G-SECTEUR').pk):
            with self.assertRaises(ValueError):
                accepter_demande(demande, self.admin, parent=parent)
        self.assertFalse(Metier.objects.filter(code__startswith='TAF-').exists())

    def test_rattacher_ajoute_une_appellation_au_metier_existant(self):
        demande = self.demande('Dev web')
        rattachee = rattacher_demande(demande, self.admin, self.metier.pk)
        appellation = Appellation.objects.get(code=f'TAF-DA-{demande.pk}')
        self.assertEqual((appellation.metier, appellation.cle_recherche), (self.metier, 'dev web'))
        self.assertEqual((rattachee.statut, rattachee.entree_libelle), (D.STATUT_RATTACHEE, 'Développeur web'))

    def test_rattacher_un_metier_masque_ou_inconnu_est_refuse(self):
        demande = self.demande('Dev web')
        for cible in (None, 99999):
            with self.assertRaises(ValueError):
                rattacher_demande(demande, self.admin, cible)
        Metier.objects.filter(pk=self.metier.pk).update(selectionnable=False)
        with self.assertRaises(ValueError):
            rattacher_demande(demande, self.admin, self.metier.pk)

    def test_refuser_notifie_le_demandeur_avec_le_motif(self):
        refuser_demande(self.demande(), self.admin, 'Hors périmètre')
        self.assertIn('Hors périmètre', Notification.objects.get(destinataire=self.candidat).message)


class MetierApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.groupe, self.metier = _referentiel()
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.rh = User.objects.create_user(username='rh', email='rh@test.dz', role='RECRUTEUR')
        ProfilEntreprise.objects.create(user=self.rh, nom_entreprise='ACME', registre_commerce='RC1', est_approuvee=True)
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)

    def test_un_candidat_et_un_recruteur_peuvent_demander_un_metier(self):
        for utilisateur in (self.candidat, self.rh):
            self.client.force_authenticate(user=utilisateur)
            reponse = self.client.post(reverse('demande-ajout-creer'), {'type': 'METIER', 'libelle': 'Technicien drone'}, format='json')
            self.assertIn(reponse.status_code, (200, 201), reponse.data)
        demande = D.objects.get(type='METIER')
        self.assertEqual((demande.demandeurs.count(), demande.origine), (2, 'CANDIDAT'))

    def test_l_admin_voit_les_groupes_les_proches_et_decide(self):
        self.client.force_authenticate(user=self.candidat)
        demande_id = self.client.post(reverse('demande-ajout-creer'), {'type': 'METIER', 'libelle': 'Développeur web mobile'}, format='json').data['id']
        self.client.force_authenticate(user=self.admin)
        parents = self.client.get(reverse('admin-demandes-ajout-parents'), {'type': 'METIER'}).data['groupes']
        self.assertEqual([g['libelle'] for g in parents], ['Informatique'])
        ligne = self.client.get(reverse('admin-demandes-ajout'), {'type': 'METIER'}).data['results'][0]
        self.assertIn('Développeur web', [p['libelle'] for p in ligne['proches']])
        reponse = self.client.post(reverse('admin-demande-ajout-rattacher', args=[demande_id]), {'entree_id': self.metier.pk}, format='json')
        self.assertEqual((reponse.status_code, reponse.data['statut']), (200, 'RATTACHEE'))
        stats = self.client.get('/api/jobs/admin/statistiques/').data['demandes_a_examiner']
        self.assertEqual(stats['METIER'], 0)

    def test_un_non_admin_ne_decide_pas(self):
        self.client.force_authenticate(user=self.candidat)
        demande_id = self.client.post(reverse('demande-ajout-creer'), {'type': 'METIER', 'libelle': 'Technicien drone'}, format='json').data['id']
        reponse = self.client.post(reverse('admin-demande-ajout-accepter', args=[demande_id]), {'parent': self.groupe.pk}, format='json')
        self.assertIn(reponse.status_code, (401, 403))
        self.assertEqual(D.objects.get().statut, 'A_EXAMINER')


class ReprisePropositionsTests(TestCase):
    def setUp(self):
        self.groupe, self.metier = _referentiel()
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.autre = User.objects.create_user(username='cand2', email='cand2@test.dz', role='CANDIDAT')
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)

        def proposition(libelle, statut, **champs):
            p = PropositionMetier.objects.create(
                libelle=libelle, cle_recherche=normaliser_recherche(libelle), origine='CANDIDAT', proposee_par=self.candidat,
                statut=statut, **champs,
            )
            p.demandeurs.add(self.candidat, self.autre)
            return p

        self.ouverte = proposition('Technicien drone', 'SUGGEREE')
        self.rejetee = proposition('Charmeur de serpents', 'REJETEE', motif_rejet='Hors périmètre', traite_par=self.admin)
        self.rattachee = proposition('Dev web', 'VALIDEE', issue='RATTACHEE', metier_resultat=self.metier, traite_par=self.admin)
        self.creee = proposition('Pilote de ballon', 'VALIDEE', issue='CREEE', metier_resultat=self.metier, traite_par=self.admin)
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name) / 'taftech_backend'
        self.base.mkdir()

    def lancer(self, *arguments):
        sortie = StringIO()
        with override_settings(BASE_DIR=str(self.base)):
            call_command('migrer_propositions_metier_vers_demandes', *arguments, stdout=sortie)
        return sortie.getvalue()

    def test_simulation_sans_ecriture(self):
        sortie = self.lancer()
        self.assertIn('à reprendre : 4 sur 4', sortie)
        self.assertFalse(D.objects.exists())
        self.assertFalse(list((self.base.parent / 'docs' / 'archives').glob('*')) if (self.base.parent / 'docs').exists() else [])

    def test_reprise_des_statuts_motifs_et_demandeurs(self):
        self.lancer('--appliquer')
        par_libelle = {d.libelle: d for d in D.objects.filter(type='METIER')}
        self.assertEqual(par_libelle['Technicien drone'].statut, 'A_EXAMINER')
        self.assertEqual((par_libelle['Charmeur de serpents'].statut, par_libelle['Charmeur de serpents'].motif_refus), ('REFUSEE', 'Hors périmètre'))
        self.assertEqual((par_libelle['Dev web'].statut, par_libelle['Dev web'].entree_libelle), ('RATTACHEE', 'Développeur web'))
        self.assertEqual(par_libelle['Pilote de ballon'].statut, 'ACCEPTEE')
        self.assertEqual(par_libelle['Technicien drone'].demandeurs.count(), 2)
        self.assertEqual(par_libelle['Technicien drone'].date_creation, self.ouverte.date_creation)
        sauvegardes = list((self.base.parent / 'docs' / 'archives').glob('sauvegarde-propositions-metier-*.json'))
        self.assertEqual(len(sauvegardes), 1)
        self.assertEqual(len(json.loads(sauvegardes[0].read_text(encoding='utf-8'))), 4)

    def test_idempotente_et_sans_toucher_aux_anciennes_lignes(self):
        self.lancer('--appliquer')
        nombre = D.objects.count()
        self.assertIn('Rien à migrer', self.lancer('--appliquer'))
        self.assertEqual(D.objects.count(), nombre)
        self.assertEqual(PropositionMetier.objects.count(), 4)

    def test_une_demande_migree_ouverte_est_rejointe_par_une_nouvelle_demande(self):
        self.lancer('--appliquer')
        demande, deja = creer_demande(self.admin, 'METIER', 'technicien DRONE')
        self.assertTrue(deja)
        self.assertEqual(demande.libelle, 'Technicien drone')
