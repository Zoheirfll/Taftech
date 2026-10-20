"""Explorateur du référentiel : lecture seule, réservé aux administrateurs, compteurs exacts."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.models import (
    Appellation, CompetenceReferentiel, DomaineFormation, GroupeMetier, Metier, MetierCompetence,
    SpecialiteFormation,
)

User = get_user_model()


class ExplorateurReferentielTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm', email='adm@test.com', password='x-Pass-1234', role='ADMIN', is_staff=True)
        self.secteur = GroupeMetier.objects.create(code='S1', type_groupe='secteur_source', libelle='A-AGRICULTURE')
        self.domaine = GroupeMetier.objects.create(code='D1', type_groupe='domaine_source', libelle='Cultures', parent=self.secteur)
        self.vide = GroupeMetier.objects.create(code='S2', type_groupe='secteur_source', libelle='Secteur vide')
        self.metier = Metier.objects.create(code='M1', libelle='Agronome', cle_recherche='agronome', groupe_principal=self.domaine)
        self.metier.metier_canonique = self.metier
        self.metier.save()
        self.orphelin = Metier.objects.create(code='M2', libelle='Sans groupe', cle_recherche='sans groupe')
        self.ancien = Metier.objects.create(code='M3', libelle='Ancien', cle_recherche='ancien',
                                            groupe_principal=self.domaine, metier_canonique=self.metier)
        Appellation.objects.create(code='A1', metier=self.metier, libelle='Ingénieur agronome', cle_recherche='ingenieur agronome')
        competence = CompetenceReferentiel.objects.create(label='Irrigation')
        MetierCompetence.objects.create(code='L1', metier=self.metier, competence=competence)
        self.client.force_authenticate(user=self.admin)

    def test_refuse_aux_non_admins(self):
        candidat = User.objects.create_user(username='c', email='c@test.com', password='x-Pass-1234', role='CANDIDAT')
        self.client.force_authenticate(user=candidat)
        for nom in ('admin-explorateur-arbre', 'admin-explorateur-formations'):
            self.assertEqual(self.client.get(reverse(nom)).status_code, 403)
        self.assertEqual(self.client.get(reverse('admin-explorateur-anomalies', kwargs={'code': 'groupes_vides'})).status_code, 403)

    def test_arbre_cumule_les_metiers_actifs_sans_compter_les_redirections(self):
        data = self.client.get(reverse('admin-explorateur-arbre')).data
        par_id = {g['id']: g for g in data['groupes']}
        self.assertEqual(par_id[self.domaine.id]['nb_metiers_directs'], 1)  # « Ancien » est redirigé : exclu
        self.assertEqual(par_id[self.secteur.id]['nb_metiers'], 1)
        self.assertEqual(par_id[self.secteur.id]['libelle'], 'Agriculture')  # lettre ANEM retirée, casse remise en forme
        self.assertEqual(data['totaux']['metiers_actifs'], 2)

    def test_anomalies_comptees_et_listees(self):
        data = self.client.get(reverse('admin-explorateur-arbre')).data
        self.assertEqual(data['anomalies']['metiers_sans_groupe'], 1)
        self.assertEqual(data['anomalies']['groupes_vides'], 1)
        liste = self.client.get(reverse('admin-explorateur-anomalies', kwargs={'code': 'metiers_sans_groupe'})).data
        self.assertEqual([e['libelle'] for e in liste['elements']], ['Sans groupe'])
        vides = self.client.get(reverse('admin-explorateur-anomalies', kwargs={'code': 'groupes_vides'})).data
        self.assertEqual([e['libelle'] for e in vides['elements']], ['Secteur vide'])
        self.assertEqual(self.client.get(reverse('admin-explorateur-anomalies', kwargs={'code': 'inconnue'})).status_code, 404)

    def test_fiche_metier_et_liste_du_groupe(self):
        fiche = self.client.get(reverse('admin-explorateur-metier', kwargs={'metier_id': self.metier.id})).data
        self.assertEqual([c['type'] for c in fiche['chemin']], ['Secteur', 'Domaine'])
        self.assertEqual(len(fiche['appellations']), 1)
        self.assertEqual(fiche['competences'][0]['competence__label'], 'Irrigation')
        groupe = self.client.get(reverse('admin-explorateur-groupe', kwargs={'groupe_id': self.domaine.id})).data
        self.assertEqual(groupe['total'], 1)
        self.assertEqual(groupe['metiers'][0]['nb_competences'], 1)

    def test_liste_paginee_cote_serveur_sans_rien_couper(self):
        for i in range(19):  # 1 métier existant + 19 = 20 dans le domaine
            Metier.objects.create(code=f'P{i}', libelle=f'Métier {i:02d}', cle_recherche=f'metier {i}',
                                  groupe_principal=self.domaine, metier_canonique=None)
        url = reverse('admin-explorateur-groupe', kwargs={'groupe_id': self.domaine.id})
        p1, p2 = self.client.get(url).data, self.client.get(url, {'page': 2}).data
        self.assertEqual((p1['total'], p1['total_pages'], len(p1['metiers'])), (20, 2, 15))
        self.assertEqual((p2['page'], len(p2['metiers'])), (2, 5))
        self.assertEqual(self.client.get(url, {'page': 999}).data['page'], 2)  # page hors limites : ramenée à la dernière
        self.assertEqual(self.client.get(url, {'page': 'abc'}).data['page'], 1)

    def test_formations_domaines_puis_specialites(self):
        domaine = DomaineFormation.objects.create(code='DF1', libelle='Informatique', systeme='LMD')
        SpecialiteFormation.objects.create(code='SF1', domaine=domaine, libelle='Réseaux', cle_recherche='reseaux')
        liste = self.client.get(reverse('admin-explorateur-formations')).data
        self.assertEqual(liste['domaines'][0]['nb_specialites'], 1)
        detail = self.client.get(reverse('admin-explorateur-formations'), {'domaine': domaine.id}).data
        self.assertEqual(detail['specialites'][0]['libelle'], 'Réseaux')
