"""Panel admin référentiel v2 (session 17/09/2026) — Métiers/Spécialités/Diplômes :
liste, recherche, PATCH (libellé + selectionnable/actif), permissions. Pas de
POST/DELETE (voir jobs/views/referentiel_admin.py — décision volontaire)."""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from jobs.models import Metier, GroupeMetier, TypeDiplome, DomaineFormation, SpecialiteFormation

User = get_user_model()


class AdminReferentielMetiersTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin_ref', email='admin_ref@test.dz', password='pwd', role='ADMIN', is_staff=True)
        self.recruteur = User.objects.create_user(username='rh_ref', email='rh_ref@test.dz', password='pwd', role='RECRUTEUR')
        self.groupe = GroupeMetier.objects.create(code='G-1', type_groupe='domaine_source', libelle='Informatique')
        self.metier = Metier.objects.create(code='M-1', libelle='Développeur web', cle_recherche='developpeur web', groupe_principal=self.groupe)

    def test_liste_reservee_admin(self):
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get('/api/jobs/admin/referentiel-v2/metiers/')
        self.assertEqual(response.status_code, 403)

    def test_liste_admin_avec_recherche(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/jobs/admin/referentiel-v2/metiers/?search=developpeur')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['groupe_libelle'], 'Informatique')

    def test_patch_toggle_selectionnable_et_libelle(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/jobs/admin/referentiel-v2/metiers/{self.metier.id}/',
            {'selectionnable': False, 'libelle': 'Développeur web (corrigé)'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.metier.refresh_from_db()
        self.assertFalse(self.metier.selectionnable)
        self.assertEqual(self.metier.libelle, 'Développeur web (corrigé)')

    def test_patch_ne_modifie_pas_le_code(self):
        """`code` est en lecture seule — c'est l'identifiant stable du réimport idempotent."""
        self.client.force_authenticate(user=self.admin)
        self.client.patch(
            f'/api/jobs/admin/referentiel-v2/metiers/{self.metier.id}/',
            {'code': 'AUTRE-CODE'},
            format='json',
        )
        self.metier.refresh_from_db()
        self.assertEqual(self.metier.code, 'M-1')

    def test_patch_introuvable(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch('/api/jobs/admin/referentiel-v2/metiers/999999/', {'libelle': 'X'}, format='json')
        self.assertEqual(response.status_code, 404)


class AdminReferentielSpecialitesEtDiplomesTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin_ref2', email='admin_ref2@test.dz', password='pwd', role='ADMIN', is_staff=True)
        self.domaine = DomaineFormation.objects.create(code='D-1', libelle='Informatique', systeme='universitaire')
        self.specialite = SpecialiteFormation.objects.create(code='SP-1', domaine=self.domaine, libelle='Génie logiciel', cle_recherche='genie logiciel')
        self.diplome = TypeDiplome.objects.create(code='TD-1', libelle='Master 2', systeme='universitaire')

    def test_liste_specialites(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/jobs/admin/referentiel-v2/specialites/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results'][0]['domaine_libelle'], 'Informatique')

    def test_patch_specialite_toggle(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/jobs/admin/referentiel-v2/specialites/{self.specialite.id}/',
            {'selectionnable': False}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.specialite.refresh_from_db()
        self.assertFalse(self.specialite.selectionnable)

    def test_liste_diplomes(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/jobs/admin/referentiel-v2/diplomes/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results'][0]['libelle'], 'Master 2')

    def test_patch_diplome_libelle(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/jobs/admin/referentiel-v2/diplomes/{self.diplome.id}/',
            {'libelle': 'Master 2 (renommé)'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.diplome.refresh_from_db()
        self.assertEqual(self.diplome.libelle, 'Master 2 (renommé)')
