from django.core.cache import cache
from django.test import TestCase

from accounts.models import CustomUser
from jobs.models import CompetenceCandidat, GroupeMetier, Metier, ProfilCandidat
from jobs.suggestions_stats import MIN_CANDIDATS, calculer_stats_metier


class SuggestionsStatsTest(TestCase):
    def setUp(self):
        cache.clear()
        g = GroupeMetier.objects.create(code='G1', libelle='RH', type_groupe='domaine_source')
        self.metier = Metier.objects.create(code='M1', libelle='Chargé RH', groupe_principal=g)

    def _candidats(self, n, competences):
        for i in range(n):
            u = CustomUser.objects.create_user(username=f'c{i}', email=f'c{i}@x.dz', password='x', role='CANDIDAT')
            p = ProfilCandidat.objects.get_or_create(user=u)[0]
            p.metier = self.metier
            p.save()
            for c in competences:
                CompetenceCandidat.objects.create(profil=p, label=c)

    def test_sous_le_seuil_aucun_pourcentage(self):
        self._candidats(MIN_CANDIDATS - 1, ['Paie'])
        st = calculer_stats_metier(self.metier)
        self.assertIsNone(st['nb_candidats'])
        self.assertTrue(all(v['pct_candidats'] is None for v in st['competences'].values()))

    def test_pourcentage_calcule_au_seuil(self):
        self._candidats(MIN_CANDIDATS, ['Paie'])
        st = calculer_stats_metier(self.metier)
        self.assertEqual(st['competences']['paie']['pct_candidats'], 100)
