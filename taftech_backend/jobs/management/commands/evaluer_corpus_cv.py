"""Évalue l'extraction PDF, le découpage en sections et le masquage sur un corpus de CV.
Lecture seule : ne modifie ni la base ni le parser. Le rapport ne contient aucun contenu de CV
(noms de fichiers et compteurs seulement)."""
import json
import random
import re
import time
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte
from jobs.cv_parser.extraction import extract_text
from jobs.cv_parser.sections import find_sections

TEXTE_COURT = 200   # en dessous : extraction considérée ratée
LENTEUR_S = 5.0     # seuil d'alerte par CV
FUITES = {
    "email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),
    "url": re.compile(r"(?:https?://|www\.|linkedin\.com|github\.com)\S+", re.I),
    "telephone": re.compile(r"(?<!\d)(?:\+?\d[\s.\-()]?){9,}(?!\d)"),
}
INVISIBLES = re.compile("[​-‏⁠﻿]")


def evaluer_cv(chemin: Path, avec_ner: bool) -> dict:
    debut = time.perf_counter()
    texte = extract_text(str(chemin), chemin.name)
    duree_extraction = time.perf_counter() - debut
    fiche = {"fichier": f"{chemin.parent.name}/{chemin.name}", "longueur": len(texte),
             "extraction_s": round(duree_extraction, 2), "invisibles": len(INVISIBLES.findall(texte))}
    fiche["sections"] = sorted(find_sections(texte))
    debut = time.perf_counter()
    propre = nettoyer_texte(texte, avec_ner=avec_ner).texte
    fiche["masquage_s"] = round(time.perf_counter() - debut, 2)
    fiche["fuites"] = {nom: len(m.findall(propre)) for nom, m in FUITES.items() if m.search(propre)}
    return fiche


class Command(BaseCommand):
    help = "Évalue le parser et le masquage sur un dossier de PDF (lecture seule)."

    def add_arguments(self, parser):
        parser.add_argument("dossier")
        parser.add_argument("--sortie", required=True, help="Fichier JSON du rapport (hors dépôt)")
        parser.add_argument("--echantillon", type=int, default=0, help="0 = tous les PDF")
        parser.add_argument("--graine", type=int, default=42)
        parser.add_argument("--avec-ner", action="store_true", help="Active spaCy/Stanza (lent)")

    def handle(self, *args, **opts):
        racine = Path(opts["dossier"])
        if not racine.is_dir():
            raise CommandError(f"Dossier introuvable : {racine}")
        pdfs = sorted(racine.rglob("*.pdf"))
        if opts["echantillon"]:
            pdfs = random.Random(opts["graine"]).sample(pdfs, min(opts["echantillon"], len(pdfs)))
        fiches, erreurs = [], []
        for chemin in pdfs:
            try:
                fiches.append(evaluer_cv(chemin, opts["avec_ner"]))
            except Exception as exc:  # un CV qui plante est un résultat, pas un arrêt
                erreurs.append({"fichier": f"{chemin.parent.name}/{chemin.name}", "erreur": type(exc).__name__})
        resume = {
            "total": len(pdfs), "plantages": len(erreurs),
            "texte_court": sum(f["longueur"] < TEXTE_COURT for f in fiches),
            "lents": sum(f["extraction_s"] + f["masquage_s"] > LENTEUR_S for f in fiches),
            "avec_caracteres_invisibles": sum(f["invisibles"] > 0 for f in fiches),
            "sans_aucune_section": sum(not f["sections"] for f in fiches),
            "sections_trouvees": dict(Counter(s for f in fiches for s in f["sections"])),
            "fuites_apres_masquage": dict(Counter(k for f in fiches for k in f["fuites"])),
        }
        Path(opts["sortie"]).write_text(
            json.dumps({"resume": resume, "erreurs": erreurs, "fiches": fiches}, ensure_ascii=False, indent=1),
            encoding="utf-8")
        self.stdout.write(json.dumps(resume, ensure_ascii=False, indent=1))
