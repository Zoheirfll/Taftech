"""Resynchronisation du prompt du parser de CV : `AIConfig.parser_cv_prompt` PRIME sur la constante du code,
donc modifier `PROMPT_CV_COMPLET` n'a aucun effet tant que la base n'est pas resynchronisée. La commande n'écrase
jamais un texte personnalisé par l'admin sans `--force`."""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from jobs.cv_parser.prompts import PROMPT_CV_COMPLET
from jobs.management.commands.synchroniser_prompt_parser_cv import empreinte
from jobs.models import AIConfig


class SynchroniserPromptParserCvTest(TestCase):
    def _lancer(self, *options):
        sortie = StringIO()
        call_command("synchroniser_prompt_parser_cv", *options, stdout=sortie)
        return sortie.getvalue()

    def _definir(self, texte):
        config = AIConfig.get_solo()
        config.parser_cv_prompt = texte
        config.save()

    def _lire(self):
        return AIConfig.get_solo().parser_cv_prompt

    def test_prompt_vide_resynchronise(self):
        self._definir("")
        self._lancer()
        self.assertEqual(self._lire(), PROMPT_CV_COMPLET)

    def test_deja_a_jour_sans_effet(self):
        self._definir(PROMPT_CV_COMPLET)
        self.assertIn("déjà à jour", self._lancer())

    def test_version_precedente_connue_resynchronisee(self):
        from jobs.management.commands import synchroniser_prompt_parser_cv as cmd
        ancien = "ancienne version du prompt"
        self._definir(ancien)
        avant = cmd.VERSIONS_PRECEDENTES
        cmd.VERSIONS_PRECEDENTES = avant | {empreinte(ancien)}
        try:
            self._lancer()
        finally:
            cmd.VERSIONS_PRECEDENTES = avant
        self.assertEqual(self._lire(), PROMPT_CV_COMPLET)

    def test_texte_personnalise_jamais_ecrase_sans_force(self):
        self._definir("prompt personnalisé par l'admin")
        sortie = self._lancer()
        self.assertEqual(self._lire(), "prompt personnalisé par l'admin")
        self.assertIn("personnalisé", sortie)

    def test_force_ecrase_le_texte_personnalise(self):
        self._definir("prompt personnalisé par l'admin")
        self._lancer("--force")
        self.assertEqual(self._lire(), PROMPT_CV_COMPLET)

    def test_dry_run_n_ecrit_rien(self):
        self._definir("")
        self._lancer("--dry-run")
        self.assertEqual(self._lire(), "")
