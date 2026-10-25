"""Accepter une demande de compétence en la liant, en option, à des métiers (24/10/2026).

Le lien `MetierCompetence` alimente les suggestions « compétences souvent liées à ce métier » (publication d'offre,
profil et assistant d'import du candidat). Il est facultatif : une acceptation sans métier reste valide."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.demandes_ajout import accepter_demande, creer_demande
from jobs.models import CompetenceReferentiel, DemandeAjout, GroupeMetier, Metier, MetierCompetence

User = get_user_model()


def _metier(code, libelle, canonique=None):
    groupe, _ = GroupeMetier.objects.get_or_create(code='G-LIENS', defaults={'type_groupe': 'domaine_source', 'libelle': 'Qualité'})
    metier = Metier.objects.create(
        code=code, libelle=libelle, cle_recherche=libelle.lower(), groupe_principal=groupe, selectionnable=True,
    )
    metier.metier_canonique = canonique or metier
    metier.save(update_fields=['metier_canonique'])
    return metier


class LierCompetenceAuMetierTests(TestCase):
    def setUp(self):
        cache.clear()
        self.metier = _metier('M-QUAL', 'Responsable qualité')
        self.autre = _metier('M-PROD', 'Responsable production')
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)

    def demande(self, libelle='Amélioration continue'):
        return creer_demande(self.candidat, 'COMPETENCE', libelle)[0]

    def test_accepter_sans_metier_ne_cree_aucun_lien(self):
        accepter_demande(self.demande(), self.admin)
        self.assertEqual(MetierCompetence.objects.count(), 0)

    def test_accepter_avec_metiers_cree_un_lien_par_metier(self):
        acceptee = accepter_demande(
            self.demande(), self.admin, options={'metiers_ids': [self.metier.pk, self.autre.pk]},
        )
        competence = CompetenceReferentiel.objects.get(pk=acceptee.entree_id)
        self.assertEqual(
            set(MetierCompetence.objects.filter(competence=competence).values_list('metier_id', flat=True)),
            {self.metier.pk, self.autre.pk},
        )

    def test_un_metier_redirige_est_lie_a_son_metier_canonique(self):
        synonyme = _metier('M-SYN', 'Qualiticien', canonique=self.metier)
        acceptee = accepter_demande(self.demande(), self.admin, options={'metiers_ids': [synonyme.pk]})
        lien = MetierCompetence.objects.get(competence_id=acceptee.entree_id)
        self.assertEqual(lien.metier_id, self.metier.pk)

    def test_un_metier_inconnu_annule_toute_la_decision(self):
        demande = self.demande()
        with self.assertRaises(ValueError):
            accepter_demande(demande, self.admin, options={'metiers_ids': [self.metier.pk, 999999]})
        demande.refresh_from_db()
        self.assertEqual(demande.statut, DemandeAjout.STATUT_A_EXAMINER)
        self.assertFalse(CompetenceReferentiel.objects.filter(label='Amélioration continue').exists())
        self.assertEqual(MetierCompetence.objects.count(), 0)

    def test_au_plus_dix_metiers_par_acceptation(self):
        metiers = [_metier(f'M-X{i}', f'Métier {i}') for i in range(11)]
        with self.assertRaises(ValueError):
            accepter_demande(self.demande(), self.admin, options={'metiers_ids': [m.pk for m in metiers]})

    def test_une_ancienne_suggestion_promue_prend_le_libelle_corrige(self):
        CompetenceReferentiel.objects.create(label='dialogue syndical', statut='SUGGEREE')
        acceptee = accepter_demande(self.demande('dialogue syndical'), self.admin, libelle='Dialogue syndical')
        self.assertEqual(CompetenceReferentiel.objects.get(pk=acceptee.entree_id).label, 'Dialogue syndical')
        self.assertEqual(acceptee.entree_libelle, 'Dialogue syndical')

    def test_un_lien_existant_n_est_pas_duplique(self):
        competence = CompetenceReferentiel.objects.create(label='Amélioration continue', statut='SUGGEREE')
        MetierCompetence.objects.create(code='TAF-MC-ancien', metier=self.metier, competence=competence)
        accepter_demande(self.demande(), self.admin, options={'metiers_ids': [self.metier.pk]})
        self.assertEqual(MetierCompetence.objects.filter(competence=competence, metier=self.metier).count(), 1)


class LierCompetenceAuMetierApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.metier = _metier('M-QUAL', 'Responsable qualité')
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)

    def _demande_id(self):
        self.client.force_authenticate(user=self.candidat)
        return self.client.post(
            reverse('demande-ajout-creer'), {'type': 'COMPETENCE', 'libelle': 'Amélioration continue'}, format='json',
        ).data['id']

    def test_l_admin_accepte_et_lie_puis_la_competence_est_suggeree_pour_le_metier(self):
        demande_id = self._demande_id()
        self.client.force_authenticate(user=self.admin)
        reponse = self.client.post(
            reverse('admin-demande-ajout-accepter', args=[demande_id]), {'metiers_ids': [self.metier.pk]}, format='json',
        )
        self.assertEqual((reponse.status_code, reponse.data['statut']), (200, 'ACCEPTEE'), reponse.data)
        suggestions = self.client.get(reverse('api-metier-suggestions', args=[self.metier.pk])).data['competences']
        self.assertEqual([c['label'] for c in suggestions], ['Amélioration continue'])

    def test_un_candidat_ne_peut_pas_decider(self):
        demande_id = self._demande_id()
        reponse = self.client.post(
            reverse('admin-demande-ajout-accepter', args=[demande_id]), {'metiers_ids': [self.metier.pk]}, format='json',
        )
        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(MetierCompetence.objects.count(), 0)

    def test_un_identifiant_de_metier_invalide_est_refuse_en_400(self):
        demande_id = self._demande_id()
        self.client.force_authenticate(user=self.admin)
        reponse = self.client.post(
            reverse('admin-demande-ajout-accepter', args=[demande_id]), {'metiers_ids': ['abc']}, format='json',
        )
        self.assertEqual(reponse.status_code, 400)
