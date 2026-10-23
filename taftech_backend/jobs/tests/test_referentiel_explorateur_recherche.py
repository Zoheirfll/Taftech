"""Explorateur : recherche directe d'un métier par son libellé ou par l'une de ses appellations (23/10/2026)."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.models import Appellation, GroupeMetier, Metier
from jobs.referentiel_utils import normaliser_recherche

User = get_user_model()


class RechercheExplorateurTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm', email='adm@test.com', password='x-Pass-1234', role='ADMIN', is_staff=True)
        secteur = GroupeMetier.objects.create(code='S1', type_groupe='secteur_source', libelle='BTP')
        self.domaine = GroupeMetier.objects.create(code='D1', type_groupe='domaine_source', libelle='Chantiers', parent=secteur)
        self.conducteur = self._metier('M1', 'Conducteur de travaux')
        Appellation.objects.create(code='A1', metier=self.conducteur, libelle='Chef de chantier', cle_recherche='chef de chantier')
        Appellation.objects.create(code='A2', metier=self.conducteur, libelle='Chef de projet BTP', cle_recherche='chef de projet btp')
        Appellation.objects.create(code='A3', metier=self.conducteur, libelle='Ancienne appellation', cle_recherche='ancienne chef', actif=False)
        self.chef = self._metier('M2', 'Chef de service')
        self._metier('M3', 'Comptable')
        self.client.force_authenticate(user=self.admin)

    def _metier(self, code, libelle):
        metier = Metier.objects.create(code=code, libelle=libelle, cle_recherche=normaliser_recherche(libelle), groupe_principal=self.domaine)
        metier.metier_canonique = metier
        metier.save()
        return metier

    def chercher(self, texte):
        return self.client.get(reverse('admin-explorateur-recherche'), {'search': texte}).data['resultats']

    def test_trouve_un_metier_par_son_libelle(self):
        self.assertEqual([r['libelle'] for r in self.chercher('chef de service')], ['Chef de service'])

    def test_trouve_un_metier_par_son_appellation(self):
        resultats = {r['libelle']: r for r in self.chercher('Chef')}
        self.assertEqual(set(resultats), {'Conducteur de travaux', 'Chef de service'})
        self.assertEqual(
            sorted(resultats['Conducteur de travaux']['appellations']), ['Chef de chantier', 'Chef de projet BTP'])

    def test_sans_accent_ni_casse(self):
        self.assertEqual([r['libelle'] for r in self.chercher('CONDUCTEUR')], ['Conducteur de travaux'])

    def test_une_appellation_desactivee_ne_fait_pas_sortir_le_metier(self):
        self.assertEqual(self.chercher('ancienne'), [])

    def test_le_chemin_du_metier_est_renvoye(self):
        self.assertEqual(self.chercher('comptable')[0]['groupe'].split()[-1], 'Chantiers')

    def test_un_seul_caractere_ne_cherche_rien(self):
        self.assertEqual(self.chercher('c'), [])

    def test_refuse_aux_non_admins(self):
        candidat = User.objects.create_user(username='c', email='c@test.com', password='x-Pass-1234', role='CANDIDAT')
        self.client.force_authenticate(user=candidat)
        self.assertEqual(self.client.get(reverse('admin-explorateur-recherche'), {'search': 'chef'}).status_code, 403)
