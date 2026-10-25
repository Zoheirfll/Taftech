"""Origine d'une compétence du candidat (24/10/2026) : saisie / issue du CV, ou choisie parmi les suggestions du métier.

Information seulement : l'origine n'entre jamais dans le calcul du score (`matcher.py` ne la lit pas). Elle est montrée
au candidat (transparence) et au recruteur (une compétence cochée d'un clic ne prouve pas la même chose qu'une compétence
écrite dans le CV)."""
import inspect

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs import matcher
from jobs.models import CompetenceCandidat, CompetenceReferentiel, ProfilCandidat
from jobs.serializers.profils import CompetenceCandidatSerializer

User = get_user_model()


class OrigineCompetenceTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.profil, _ = ProfilCandidat.objects.get_or_create(user=self.candidat)
        CompetenceReferentiel.objects.create(label='Kaizen', statut='VALIDEE')
        self.client.force_authenticate(user=self.candidat)
        self.url = reverse('mes-competences')

    def ajouter(self, **corps):
        return self.client.post(self.url, {'label': 'Kaizen', 'niveau': 'DEBUTANT', **corps}, format='json')

    def test_par_defaut_la_competence_est_saisie(self):
        reponse = self.ajouter()
        self.assertEqual((reponse.status_code, reponse.data['origine']), (201, 'SAISIE'))

    def test_une_suggestion_est_enregistree_comme_telle(self):
        reponse = self.ajouter(origine='SUGGESTION')
        self.assertEqual(reponse.data['origine'], 'SUGGESTION')
        self.assertEqual(CompetenceCandidat.objects.get(profil=self.profil).origine, 'SUGGESTION')

    def test_une_origine_inconnue_retombe_sur_saisie(self):
        self.assertEqual(self.ajouter(origine='PIRATE').data['origine'], 'SAISIE')

    def test_modifier_le_niveau_ne_change_pas_l_origine(self):
        self.ajouter(origine='SUGGESTION')
        reponse = self.ajouter(niveau='AVANCE', origine='SAISIE')
        self.assertEqual((reponse.status_code, reponse.data['niveau'], reponse.data['origine']), (200, 'AVANCE', 'SUGGESTION'))

    def test_la_liste_du_candidat_porte_l_origine(self):
        self.ajouter(origine='SUGGESTION')
        self.assertEqual([c['origine'] for c in self.client.get(self.url).data], ['SUGGESTION'])

    def test_le_serialiseur_vu_par_le_recruteur_porte_l_origine(self):
        self.ajouter(origine='SUGGESTION')
        donnees = CompetenceCandidatSerializer(self.profil.competences_detail.all(), many=True).data
        self.assertEqual([c['origine'] for c in donnees], ['SUGGESTION'])

    def test_le_score_ne_lit_jamais_l_origine(self):
        self.assertNotIn('origine', inspect.getsource(matcher))
