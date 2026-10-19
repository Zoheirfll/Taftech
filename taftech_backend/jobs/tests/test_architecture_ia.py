"""Garde-fous d'architecture : le matching reste local et tout appelant de call_ai est connu."""
import re
from pathlib import Path

from django.test import SimpleTestCase

RACINE = Path(__file__).resolve().parents[1]  # jobs/
# Chaque appelant de call_ai passe `donnees_candidat` quand il envoie des données candidat
# (views/ia.py : génération d'offre = aucune donnée candidat). Un nouvel appelant fait échouer
# ce test : le relire, lui faire utiliser le nettoyage, puis l'ajouter ici.
APPELANTS_AUTORISES = {
    "ai_engine.py",
    "views/ia.py",
    "views/candidat_dashboard.py",
    "referentiel_utils.py",
    "cv_parser/groq_json.py",
}


class ArchitectureIATest(SimpleTestCase):
    def test_appelants_de_call_ai_connus(self):
        trouves = set()
        for chemin in RACINE.rglob("*.py"):
            relatif = chemin.relative_to(RACINE).as_posix()
            if relatif.startswith(("tests/", "migrations/")):
                continue
            if re.search(r"\bcall_ai\(", chemin.read_text(encoding="utf-8")):
                trouves.add(relatif)
        self.assertEqual(trouves, APPELANTS_AUTORISES)

    def test_matching_sans_appel_ia(self):
        for nom in ("matcher.py", "matching_cache.py"):
            source = (RACINE / nom).read_text(encoding="utf-8").lower()
            for interdit in ("call_ai", "ai_engine", "groq"):
                self.assertNotIn(interdit, source, f"{nom} ne doit jamais appeler l'IA")

    def test_generation_d_offre_ne_recoit_aucune_donnee_candidat(self):
        source = (RACINE / "views" / "ia.py").read_text(encoding="utf-8")
        debut = source.index("class GenererOffreIAAPIView")
        self.assertNotIn("profil_candidat", source[debut:])
