"""Écran « Métiers » d'une compétence officielle (24/10/2026) : lire, ajouter et retirer les métiers liés.

Les liens du classeur du client (codes sans préfixe `TAF-`) ne se retirent pas ici : seul un nouvel import les
touche. Ceux créés par TafTech (`TAF-MC-…` à l'acceptation d'une demande, `TAF-LC-…` par la commande) se retirent.
Chaque ajout et retrait est tracé dans le journal d'audit."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.models import AuditLog, CompetenceReferentiel, GroupeMetier, Metier, MetierCompetence

User = get_user_model()


def _metier(code, libelle, canonique=None):
    groupe, _ = GroupeMetier.objects.get_or_create(code='G-CM', defaults={'type_groupe': 'domaine_source', 'libelle': 'Qualité'})
    metier = Metier.objects.create(code=code, libelle=libelle, cle_recherche=libelle.lower(), groupe_principal=groupe, selectionnable=True)
    metier.metier_canonique = canonique or metier
    metier.save(update_fields=['metier_canonique'])
    return metier


class CompetenceMetiersAdminTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.qualite = _metier('M-QUAL', 'Responsable qualité')
        self.production = _metier('M-PROD', 'Responsable production')
        self.competence = CompetenceReferentiel.objects.create(label='Kaizen', statut='VALIDEE')
        self.url = reverse('admin-competence-metiers', args=[self.competence.pk])
        self.client.force_authenticate(user=self.admin)

    def lier(self, metier, code):
        return MetierCompetence.objects.create(code=code, metier=metier, competence=self.competence)

    def test_la_liste_distingue_les_liens_du_classeur_de_ceux_de_taftech(self):
        self.lier(self.qualite, 'LIEN-CLASSEUR-1')
        self.lier(self.production, 'TAF-LC-1-2')
        lignes = {m['libelle']: m['retirable'] for m in self.client.get(self.url).data['metiers']}
        self.assertEqual(lignes, {'Responsable qualité': False, 'Responsable production': True})

    def test_ajouter_des_metiers_cree_les_liens_et_trace_l_action(self):
        reponse = self.client.post(self.url, {'metiers_ids': [self.qualite.pk, self.production.pk]}, format='json')
        self.assertEqual((reponse.status_code, reponse.data['ajoutes']), (200, 2))
        self.assertEqual(MetierCompetence.objects.filter(competence=self.competence).count(), 2)
        trace = AuditLog.objects.get(action='LIER_COMPETENCE_METIER')
        self.assertIn('Kaizen', trace.detail)

    def test_ajouter_deux_fois_ne_cree_pas_de_doublon(self):
        self.client.post(self.url, {'metiers_ids': [self.qualite.pk]}, format='json')
        reponse = self.client.post(self.url, {'metiers_ids': [self.qualite.pk]}, format='json')
        self.assertEqual(reponse.data['ajoutes'], 0)
        self.assertEqual(MetierCompetence.objects.filter(competence=self.competence).count(), 1)

    def test_un_metier_inconnu_ou_invalide_est_refuse_sans_rien_ecrire(self):
        for corps in ({'metiers_ids': [self.qualite.pk, 999999]}, {'metiers_ids': ['abc']}):
            reponse = self.client.post(self.url, corps, format='json')
            self.assertEqual(reponse.status_code, 400)
        self.assertEqual(MetierCompetence.objects.count(), 0)
        self.assertFalse(AuditLog.objects.filter(action='LIER_COMPETENCE_METIER').exists())

    def test_une_liste_vide_est_refusee(self):
        self.assertEqual(self.client.post(self.url, {'metiers_ids': []}, format='json').status_code, 400)

    def test_retirer_un_lien_taftech(self):
        self.lier(self.production, 'TAF-LC-1-2')
        reponse = self.client.delete(reverse('admin-competence-metier-detail', args=[self.competence.pk, self.production.pk]))
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(MetierCompetence.objects.count(), 0)
        self.assertTrue(AuditLog.objects.filter(action='LIER_COMPETENCE_METIER').exists())

    def test_un_lien_du_classeur_ne_se_retire_pas(self):
        self.lier(self.qualite, 'LIEN-CLASSEUR-1')
        reponse = self.client.delete(reverse('admin-competence-metier-detail', args=[self.competence.pk, self.qualite.pk]))
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(MetierCompetence.objects.count(), 1)

    def test_retirer_un_lien_inexistant_donne_404(self):
        reponse = self.client.delete(reverse('admin-competence-metier-detail', args=[self.competence.pk, self.qualite.pk]))
        self.assertEqual(reponse.status_code, 404)

    def test_une_suggestion_non_officielle_n_a_pas_d_ecran_de_liens(self):
        brouillon = CompetenceReferentiel.objects.create(label='Brouillon', statut='SUGGEREE')
        reponse = self.client.get(reverse('admin-competence-metiers', args=[brouillon.pk]))
        self.assertEqual(reponse.status_code, 404)

    def test_un_candidat_et_un_visiteur_n_y_ont_pas_acces(self):
        self.lier(self.production, 'TAF-LC-1-2')
        for utilisateur in (self.candidat, None):
            self.client.force_authenticate(user=utilisateur)
            self.assertIn(self.client.get(self.url).status_code, (401, 403))
            self.assertIn(self.client.post(self.url, {'metiers_ids': [self.qualite.pk]}, format='json').status_code, (401, 403))
            suppression = self.client.delete(reverse('admin-competence-metier-detail', args=[self.competence.pk, self.production.pk]))
            self.assertIn(suppression.status_code, (401, 403))
        self.assertEqual(MetierCompetence.objects.count(), 1)

    def test_la_liste_des_competences_indique_le_nombre_de_metiers(self):
        self.lier(self.qualite, 'LIEN-CLASSEUR-1')
        lignes = self.client.get(reverse('admin-competences'), {'search': 'Kaizen'}).data['results']
        self.assertEqual({c['label']: c['nb_metiers'] for c in lignes}, {'Kaizen': 1})
