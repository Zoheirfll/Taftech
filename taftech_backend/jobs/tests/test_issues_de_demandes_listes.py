"""Les entrées créées en acceptant une demande d'ajout sont signalées (`issue_de_demande`) et filtrables
(`?origine=demande`) dans les listes admin ; les totaux des onglets viennent des statistiques."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from jobs.models import CompetenceReferentiel, DemandeAjout

User = get_user_model()


class IssuesDeDemandesListesTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm-origine', email='admin-origine@test.dz', password='MotDePasse!2026', role='ADMIN', is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.issue = CompetenceReferentiel.objects.create(label='Kaizen', statut=CompetenceReferentiel.STATUT_VALIDEE)
        self.autre = CompetenceReferentiel.objects.create(label='Zzz test ordinaire', statut=CompetenceReferentiel.STATUT_VALIDEE)
        DemandeAjout.objects.create(
            type='COMPETENCE', libelle='Kaizen', cle_recherche='kaizen',
            statut=DemandeAjout.STATUT_ACCEPTEE, entree_id=self.issue.pk,
        )

    def _liste(self, **params):
        return self.client.get(reverse('admin-competences'), params).data

    def test_badge_sur_l_entree_acceptee_seulement(self):
        lignes = {r['label']: r['issue_de_demande'] for r in self._liste(search='Kaizen')['results']}
        self.assertEqual(lignes, {'Kaizen': True})
        lignes = {r['label']: r['issue_de_demande'] for r in self._liste(search='Zzz test')['results']}
        self.assertEqual(lignes, {'Zzz test ordinaire': False})

    def test_filtre_origine_demande(self):
        donnees = self._liste(origine='demande')
        self.assertEqual([r['label'] for r in donnees['results']], ['Kaizen'])
        self.assertEqual(donnees['nb_issues_de_demandes'], 1)

    def test_totaux_des_onglets(self):
        stats = self.client.get('/api/jobs/admin/statistiques/').data
        self.assertEqual(stats['referentiel_totaux']['COMPETENCE'], self._liste()['count'])
        self.assertEqual(set(stats['referentiel_totaux']), {'METIER', 'SPECIALITE', 'DIPLOME', 'COMPETENCE'})
