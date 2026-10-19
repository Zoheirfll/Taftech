"""Quota ou panne Groq : la plateforme continue, l'appel est remboursé, le fournisseur n'est pas
martelé (R20)."""
from unittest.mock import patch

import groq
import httpx
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.ai_engine import (
    CLE_SATURATION, DELAI_SATURATION_MAX, DELAI_SATURATION_MIN, FournisseurIASature, call_ai,
    fournisseur_sature,
)
from jobs.ia_quota import verifier_quota_ia
from jobs.models import AIConfig, ProfilCandidat, UtilisationIA

User = get_user_model()
SECRET = "gsk_CLE_DE_TEST_123"


def erreur_429(retry_after=None):
    entetes = {"retry-after": str(retry_after)} if retry_after is not None else {}
    reponse = httpx.Response(429, headers=entetes, request=httpx.Request("POST", "https://api.groq.com/x"))
    return groq.RateLimitError(f"Rate limit reached {SECRET}", response=reponse, body=None)


class FournisseurSatureTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)  # la pause du fournisseur ne doit jamais polluer un autre test
        AIConfig.get_solo()
        self.user = User.objects.create_user(
            username="sat_cand", email="sat_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        ProfilCandidat.objects.create(user=self.user, titre_professionnel="Développeur")
        self.client.force_authenticate(user=self.user)

    @patch("jobs.ai_engine._get_groq_client")
    def test_429_donne_un_message_propre_et_rembourse_l_appel(self, client):
        client.return_value.chat.completions.create.side_effect = erreur_429()
        reponse = self.client.get(reverse("analyse-carriere"))
        self.assertEqual(reponse.status_code, 503)
        self.assertEqual(reponse.data["code"], "IA_FOURNISSEUR_SATURE")
        self.assertIn("temporairement indisponible", reponse.data["error"])
        self.assertNotIn(SECRET, reponse.content.decode())
        self.assertEqual(UtilisationIA.objects.get(user=self.user).statut, "REMBOURSE")
        # Le refus suivant vient de la pause du fournisseur, pas d'un quota utilisateur atteint.
        ok, info = verifier_quota_ia(self.user, "SUGGESTIONS_METIER")
        self.assertFalse(ok)
        self.assertEqual(info["code"], "IA_FOURNISSEUR_SATURE")

    @patch("jobs.ai_engine._get_groq_client")
    def test_pendant_la_pause_groq_n_est_pas_rappele(self, client):
        client.return_value.chat.completions.create.side_effect = erreur_429()
        self.client.get(reverse("analyse-carriere"))
        client.return_value.chat.completions.create.reset_mock()
        suite = self.client.get(reverse("analyse-carriere"))
        self.assertEqual(suite.data["code"], "IA_FOURNISSEUR_SATURE")
        client.return_value.chat.completions.create.assert_not_called()
        self.assertEqual(UtilisationIA.objects.filter(user=self.user).count(), 1)  # aucun nouveau décompte

    @patch("jobs.ai_engine._get_groq_client")
    def test_conseils_gerent_aussi_la_saturation(self, client):
        client.return_value.chat.completions.create.side_effect = erreur_429()
        reponse = self.client.get(reverse("conseils-personnalises"))
        self.assertEqual(reponse.status_code, 503)
        self.assertEqual(reponse.data["code"], "IA_FOURNISSEUR_SATURE")
        self.assertEqual(UtilisationIA.objects.get(fonction="CONSEILS_DASHBOARD").statut, "REMBOURSE")

    @patch("jobs.ai_engine._get_groq_client")
    def test_autre_erreur_reste_decomptee(self, client):
        client.return_value.chat.completions.create.side_effect = TimeoutError(f"timeout {SECRET}")
        reponse = self.client.get(reverse("analyse-carriere"))
        self.assertEqual(reponse.status_code, 503)
        self.assertNotEqual(reponse.data.get("code"), "IA_FOURNISSEUR_SATURE")
        self.assertEqual(UtilisationIA.objects.get(user=self.user).statut, "ACCEPTE")
        self.assertFalse(fournisseur_sature())
        self.assertNotIn(SECRET, reponse.content.decode())

    @patch("jobs.ai_engine._get_groq_client")
    def test_la_plateforme_continue_pendant_la_saturation(self, client):
        client.return_value.chat.completions.create.side_effect = erreur_429()
        self.client.get(reverse("analyse-carriere"))
        self.assertTrue(fournisseur_sature())
        # Une route sans IA répond normalement.
        self.assertEqual(self.client.get(reverse("api-constants")).status_code, 200)

    @patch("jobs.ai_engine._get_groq_client")
    def test_parser_cv_sature_import_manuel_possible_et_appel_rembourse(self, client):
        client.return_value.chat.completions.create.side_effect = erreur_429()
        fichier = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        cv = "Karim Benali, développeur Python. " + "Expérience en développement web. " * 5
        with override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False), \
                patch("jobs.cv_parser.parser.extract_text", return_value=cv), \
                patch("jobs.cv_parser.parser.extract_photo_from_pdf", return_value=None):
            reponse = self.client.post(reverse("parser-cv"), {"cv": fichier}, format="multipart")
        self.assertEqual(reponse.status_code, 200)
        self.assertFalse(reponse.data["success"])
        self.assertIn("temporairement indisponible", reponse.data["error"])
        self.assertEqual(UtilisationIA.objects.get(fonction="PARSER_CV").statut, "REMBOURSE")


class RemboursementCibleTest(APITestCase):
    """Le remboursement ne dépend plus du drapeau global : seule la demande réellement refusée par le
    fournisseur est remboursée."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)  # la pause du fournisseur ne doit jamais polluer un autre test
        AIConfig.get_solo()
        self.user = User.objects.create_user(
            username="rb_cand", email="rb_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        ProfilCandidat.objects.create(user=self.user, titre_professionnel="Développeur")
        self.client.force_authenticate(user=self.user)

    def _parser(self):
        fichier = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        cv = "Karim Benali, développeur Python. " + "Expérience en développement web. " * 5
        with override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False), \
                patch("jobs.cv_parser.parser.extract_text", return_value=cv), \
                patch("jobs.cv_parser.parser.extract_photo_from_pdf", return_value=None):
            return self.client.post(reverse("parser-cv"), {"cv": fichier}, format="multipart")

    def test_echec_pour_une_autre_cause_pendant_la_pause_n_est_pas_rembourse(self):
        """Pause Groq en cours, mais la demande échoue AVANT tout appel (modèle de détection
        indisponible) : ce n'est pas un refus du fournisseur, l'appel reste décompté."""
        from jobs.confidentialite_ia import ModeleNerIndisponible
        cache.set(CLE_SATURATION, True, timeout=60)
        with patch("jobs.cv_parser.parser.nettoyer_texte", side_effect=ModeleNerIndisponible("x")), \
                patch("jobs.ia_quota.verifier_quota_ia", return_value=(True, {})):
            reponse = self._parser()
        self.assertFalse(reponse.data["success"])
        self.assertEqual(UtilisationIA.objects.get(fonction="PARSER_CV").statut, "ACCEPTE")

    @patch("jobs.ai_engine._get_groq_client")
    def test_refus_reel_du_fournisseur_reste_rembourse(self, client):
        client.return_value.chat.completions.create.side_effect = erreur_429()
        self._parser()
        self.assertEqual(UtilisationIA.objects.get(fonction="PARSER_CV").statut, "REMBOURSE")

    def test_appel_bloque_par_la_pause_est_rembourse(self):
        cache.set(CLE_SATURATION, True, timeout=60)
        with patch("jobs.ia_quota.verifier_quota_ia", return_value=(True, {})):
            self._parser()  # la pause bloque l'appel dans call_ai : la demande est refusée
        self.assertEqual(UtilisationIA.objects.get(fonction="PARSER_CV").statut, "REMBOURSE")

    def test_la_saturation_d_une_demande_ne_deborde_pas_sur_la_suivante(self):
        from jobs.ai_engine import SATURATION_DEMANDE
        SATURATION_DEMANDE.set(True)  # reste d'une demande précédente
        self.client.get(reverse("api-constants"))  # le middleware remet à zéro
        self.assertFalse(SATURATION_DEMANDE.get())


class DelaiPauseTest(SimpleTestCase):
    """La durée de pause suit `retry-after`, bornée pour ne jamais bloquer l'IA trop longtemps."""

    @patch("jobs.ai_engine._get_groq_client")
    def test_delai_issu_de_retry_after_borne(self, client):
        for brut, attendu in ((None, 60), (5, DELAI_SATURATION_MIN), (120, 120), (999999, DELAI_SATURATION_MAX)):
            with self.subTest(retry_after=brut):
                client.return_value.chat.completions.create.side_effect = erreur_429(brut)
                with patch("jobs.ai_engine.cache") as faux_cache, \
                        patch("jobs.models.AIConfig.get_solo") as config:
                    faux_cache.get.return_value = None
                    config.return_value.provider = "GROQ"
                    config.return_value.temperature = 0.5
                    config.return_value.groq_model = "modele-test"
                    config.return_value.reasoning_effort = "low"
                    with self.assertRaises(FournisseurIASature):
                        call_ai([{"role": "user", "content": "x"}])
                faux_cache.set.assert_called_once_with(CLE_SATURATION, True, timeout=attendu)
