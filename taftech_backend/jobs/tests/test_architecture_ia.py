"""Garde-fous d'architecture : le matching reste local et tout appelant de call_ai est connu."""
import ast
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


# Seul appel IA qui n'envoie aucune donnée candidat (données du recruteur : intitulé de poste…).
APPELS_SANS_DONNEES_CANDIDAT = {("views/ia.py", "GenererOffreIAAPIView.post")}


def appels_sans_garde(source: str) -> list[str]:
    """Noms qualifiés (Classe.méthode ou fonction) des fonctions qui appellent `call_ai(...)` sans
    le paramètre `donnees_candidat`."""
    arbre = ast.parse(source)
    trouves = []

    def parcourir(noeud, contexte):
        for enfant in ast.iter_child_nodes(noeud):
            if isinstance(enfant, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                parcourir(enfant, contexte + [enfant.name])
                continue
            if isinstance(enfant, ast.Call):
                f = enfant.func
                nom = f.id if isinstance(f, ast.Name) else f.attr if isinstance(f, ast.Attribute) else None
                if nom == "call_ai" and "donnees_candidat" not in {k.arg for k in enfant.keywords}:
                    nom_qualifie = ".".join(contexte) or "<module>"
                    if nom_qualifie not in trouves:
                        trouves.append(nom_qualifie)
            parcourir(enfant, contexte)

    parcourir(arbre, [])
    return trouves


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

    def test_chaque_appel_a_call_ai_passe_donnees_candidat(self):
        """La garde `donnees_candidat` est facultative dans la signature : ce test la rend de fait
        obligatoire. Un appel sans ce paramètre ferait partir un prompt sans le filet de sécurité."""
        fautifs = []
        for chemin in RACINE.rglob("*.py"):
            relatif = chemin.relative_to(RACINE).as_posix()
            if relatif.startswith(("tests/", "migrations/")):
                continue
            for fonction in appels_sans_garde(chemin.read_text(encoding="utf-8")):
                if (relatif, fonction) not in APPELS_SANS_DONNEES_CANDIDAT:
                    fautifs.append(f"{relatif}::{fonction}")
        self.assertEqual(fautifs, [], "call_ai(...) sans donnees_candidat= : nettoyer les données et passer le paramètre")

    def test_le_detecteur_repere_un_appel_sans_garde(self):
        source = (
            "def a():\n    call_ai(msgs)\n"
            "def b():\n    call_ai(msgs, donnees_candidat=texte)\n"
            "class C:\n    def d(self):\n        ai_engine.call_ai(msgs, max_tokens=5)\n"
        )
        self.assertEqual(appels_sans_garde(source), ["a", "C.d"])

    def test_matching_sans_appel_ia(self):
        for nom in ("matcher.py", "matching_cache.py"):
            source = (RACINE / nom).read_text(encoding="utf-8").lower()
            for interdit in ("call_ai", "ai_engine", "groq"):
                self.assertNotIn(interdit, source, f"{nom} ne doit jamais appeler l'IA")

    def test_generation_d_offre_ne_recoit_aucune_donnee_candidat(self):
        source = (RACINE / "views" / "ia.py").read_text(encoding="utf-8")
        debut = source.index("class GenererOffreIAAPIView")
        self.assertNotIn("profil_candidat", source[debut:])
