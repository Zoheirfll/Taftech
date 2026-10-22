"""Resynchronise `AIConfig.parser_cv_prompt` avec `PROMPT_CV_COMPLET` (jobs/cv_parser/prompts.py).

Piège : `parser.py` lit `ai_config.parser_cv_prompt or PROMPT_CV_COMPLET` : le prompt en base PRIME sur la
constante. Modifier la constante ne change donc rien tant que la base n'est pas resynchronisée, et un
déploiement de code seul ne le fait pas.

Sûre : le prompt de la base n'est remplacé que s'il est vide ou identique à une version précédente connue du
code (`VERSIONS_PRECEDENTES`, empreintes SHA-256). Un texte personnalisé par l'admin n'est jamais écrasé sans
`--force`. `--dry-run` n'écrit rien. À relancer après chaque modification de `PROMPT_CV_COMPLET` (ajouter
l'empreinte de l'ancienne version à `VERSIONS_PRECEDENTES`)."""
import hashlib

from django.core.management.base import BaseCommand

from jobs.cv_parser.prompts import PROMPT_CV_COMPLET
from jobs.models import AIConfig

# Empreintes des versions précédentes de PROMPT_CV_COMPLET (jamais personnalisées : identiques au code).
VERSIONS_PRECEDENTES = frozenset({
    "c508f5518d607111bc2801dfcdbe2f9cfa29679c16753eaeec59a99f132d2876",  # parser-2026.10.19-8 (avant le 22/10/2026)
})


def empreinte(texte):
    return hashlib.sha256((texte or "").strip().encode("utf-8")).hexdigest()


class Command(BaseCommand):
    help = "Resynchronise AIConfig.parser_cv_prompt avec la constante PROMPT_CV_COMPLET (sans écraser un texte personnalisé)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="N'écrit rien, indique seulement ce qui serait fait.")
        parser.add_argument("--force", action="store_true", help="Écrase aussi un texte personnalisé par l'admin.")

    def handle(self, *args, **options):
        config = AIConfig.get_solo()
        actuel = (config.parser_cv_prompt or "").strip()
        if actuel == PROMPT_CV_COMPLET.strip():
            self.stdout.write("[déjà à jour] le prompt en base est identique au code.")
            return
        remplacable = not actuel or empreinte(actuel) in VERSIONS_PRECEDENTES
        if not remplacable and not options["force"]:
            self.stdout.write(
                "[refusé] le prompt en base est personnalisé (ni vide ni une version connue du code) : "
                "relancer avec --force pour l'écraser, ou le modifier dans le panneau « Configuration IA ».")
            return
        if options["dry_run"]:
            self.stdout.write("[dry-run] le prompt en base serait remplacé par celui du code ; rien n'est écrit.")
            return
        config.parser_cv_prompt = PROMPT_CV_COMPLET
        config.save()
        self.stdout.write("[remplacé] le prompt en base est maintenant celui du code.")
