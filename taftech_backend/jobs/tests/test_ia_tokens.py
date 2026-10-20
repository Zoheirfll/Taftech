"""Suivi des tokens par appel IA, remboursement et décompte des entités masquées (R18)."""
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase

from jobs.ai_engine import call_ai
from jobs.confidentialite_ia import nettoyer_champ
from jobs.confidentialite_ia.audit import COMPTEUR_ENTITES
from jobs.ia_quota import _utilisation_courante, appels_ia_du_mois, consommer_quota_ia, liberer_verrou_ia
from jobs.models import AIConfig, UtilisationIA

User = get_user_model()


def _reponse(entree, sortie):
    r = MagicMock()
    r.choices[0].message.content = "ok"
    r.usage.prompt_tokens, r.usage.completion_tokens = entree, sortie
    return r


class TokensIATest(TestCase):
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()
        _utilisation_courante.set(None)
        COMPTEUR_ENTITES.set(None)
        self.user = User.objects.create_user(username="tok", email="tok@test.dz", password="p", role="CANDIDAT")

    @patch("jobs.ai_engine._get_groq_client")
    def test_tokens_cumules_sur_la_ligne_du_quota(self, client):
        client.return_value.chat.completions.create.side_effect = [_reponse(100, 40), _reponse(50, 10)]
        ligne = consommer_quota_ia(self.user, "PARSER_CV")
        call_ai([{"role": "user", "content": "a"}])
        call_ai([{"role": "user", "content": "b"}])
        ligne.refresh_from_db()
        self.assertEqual((ligne.tokens_entree, ligne.tokens_sortie), (150, 50))
        self.assertTrue(ligne.modele)

    @patch("jobs.ai_engine._get_groq_client")
    def test_sans_contexte_de_quota_aucune_ligne_modifiee(self, client):
        client.return_value.chat.completions.create.return_value = _reponse(10, 5)
        call_ai([{"role": "user", "content": "a"}])
        self.assertEqual(UtilisationIA.objects.count(), 0)

    @patch("jobs.ai_engine._get_groq_client")
    def test_contexte_vide_apres_liberation(self, client):
        client.return_value.chat.completions.create.return_value = _reponse(10, 5)
        ligne = consommer_quota_ia(self.user, "PARSER_CV")
        liberer_verrou_ia(self.user, "PARSER_CV")
        call_ai([{"role": "user", "content": "a"}])
        ligne.refresh_from_db()
        self.assertEqual(ligne.tokens_entree, 0)

    @patch("jobs.ai_engine._get_groq_client")
    def test_usage_illisible_ne_casse_pas_l_appel(self, client):
        """Un fournisseur qui ne renvoie pas d'usage (ou un usage inattendu) ne doit jamais faire
        échouer l'appel IA de l'utilisateur."""
        reponse = MagicMock()
        reponse.choices[0].message.content = "ok"  # usage = MagicMock : valeurs non numériques
        client.return_value.chat.completions.create.return_value = reponse
        ligne = consommer_quota_ia(self.user, "PARSER_CV")
        self.assertEqual(call_ai([{"role": "user", "content": "a"}]), "ok")
        ligne.refresh_from_db()
        self.assertEqual((ligne.tokens_entree, ligne.tokens_sortie), (0, 0))

    def test_ligne_remboursee_exclue_du_plafond(self):
        ligne = consommer_quota_ia(self.user, "PARSER_CV")
        ligne.statut = "REMBOURSE"
        ligne.save(update_fields=["statut"])
        self.assertEqual(appels_ia_du_mois(), 0)

    def test_entites_masquees_comptees_sans_contenu(self):
        ligne = consommer_quota_ia(self.user, "PARSER_CV")
        nettoyer_champ("a@b.dz 0555 12 34 56")
        liberer_verrou_ia(self.user, "PARSER_CV")
        ligne.refresh_from_db()
        self.assertEqual(ligne.entites_masquees, {"EMAIL": 1, "TELEPHONE": 1})
        self.assertNotIn("a@b.dz", str(ligne.entites_masquees))

    def test_consommation_du_mois_par_fonction(self):
        from jobs.ia_quota import consommation_par_fonction_du_mois
        UtilisationIA.objects.create(user=self.user, fonction="PARSER_CV", tokens_entree=300, tokens_sortie=100)
        UtilisationIA.objects.create(user=self.user, fonction="PARSER_CV", tokens_entree=100, tokens_sortie=100)
        UtilisationIA.objects.create(user=self.user, fonction="PARSER_CV", statut="REMBOURSE")
        parser = next(l for l in consommation_par_fonction_du_mois() if l["fonction"] == "PARSER_CV")
        self.assertEqual(parser["appels"], 2)
        self.assertEqual(parser["remboursees"], 1)
        self.assertEqual((parser["tokens_entree"], parser["tokens_sortie"]), (400, 200))
        self.assertEqual(parser["moyenne_tokens"], 300)
        conseils = next(l for l in consommation_par_fonction_du_mois() if l["fonction"] == "CONSEILS_DASHBOARD")
        self.assertEqual((conseils["appels"], conseils["moyenne_tokens"]), (0, 0))

    def test_consommation_exposee_a_la_configuration_admin(self):
        from jobs.serializers import AIConfigSerializer
        donnees = AIConfigSerializer(AIConfig.get_solo()).data
        self.assertEqual(len(donnees["consommation_mois"]), len(UtilisationIA.FONCTION_CHOICES))

    def test_masquage_hors_contexte_n_ecrit_rien(self):
        nettoyer_champ("a@b.dz")
        self.assertEqual(UtilisationIA.objects.count(), 0)
        self.assertIsNone(COMPTEUR_ENTITES.get())
