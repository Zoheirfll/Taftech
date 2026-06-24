"""
Scrape les titres de postes depuis emploitic.com/offres-d-emploi
et les importe dans MetierReferentiel.

Usage :
    python manage.py scraper_emploitic --pages 50
    python manage.py scraper_emploitic --pages 50 --dry-run
"""
import json
import os
import subprocess
import sys
import time
import tempfile
from django.core.management.base import BaseCommand
from jobs.models import MetierReferentiel

MOTS_SECTEUR = {
    "IT":          ["developpeur", "dev ", "software", "web", "data", "reseau", "systeme", "informatique", "python", "java", "react", "devops", "cloud", "erp"],
    "FINANCE":     ["comptable", "comptabilite", "finance", "audit", "fiscal", "tresorier", "controleur de gestion", "analyste financier"],
    "RH":          ["ressources humaines", "recruteur", "responsable formation", "paie", "gestionnaire rh", " rh "],
    "COMMERCIAL":  ["commercial", "technico-commercial", "account manager", "business developer"],
    "MARKETING":   ["marketing", "community manager", "seo", "charge de communication"],
    "INGENIERIE":  ["ingenieur", "technicien", "genie civil", "mecanique", "electrique", "industriel"],
    "LOGISTIQUE":  ["logistique", "supply chain", "achat", "stock", "transport", "magasinier", "approvisionnement", "planificateur"],
    "ADMIN":       ["administratif", "administration", "assistant", "office manager", "charge accueil"],
    "SANTE":       ["medecin", "pharmacien", "infirmier", "medical", "paramedical"],
    "BTP":         ["architecte", "btp", "chantier", "conducteur de travaux", "geometre", "topographe"],
    "JURIDIQUE":   ["juriste", "avocat", "juridique", "notaire", "compliance"],
    "MAINTENANCE": ["maintenance", "electromecanicien"],
    "QSE":         ["qse", "qualite", "hse", "responsable qualite"],
    "TOURISME":    ["hotellerie", "tourisme", "restauration", "chef cuisinier", "receptionniste"],
    "VENTE":       ["vendeur", "conseiller de vente", "televendeur", "pre-vendeur"],
    "BANQUE":      ["banque", "assurance", "conseiller financier"],
    "PRODUCTION":  ["production", "operateur", "chef d'atelier", "responsable production"],
    "SECRETARIAT": ["secretaire", "assistante de direction"],
    "GRANDS_COMPTES": ["grands comptes", "key account", "chef de zone", "delegue commercial", "chef de secteur"],
}

SCRAPER_SCRIPT = """
import sys, json, time
from playwright.sync_api import sync_playwright

nb_pages = int(sys.argv[1])
out_file = sys.argv[2]
titres = set()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_extra_http_headers({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"})
    for i in range(1, nb_pages + 1):
        sys.stderr.write(f"PAGE {i}/{nb_pages}\\n")
        sys.stderr.flush()
        try:
            page.goto(f"https://www.emploitic.com/offres-d-emploi?page={i}", timeout=30000)
            time.sleep(3)
            for _ in range(10):
                page.evaluate("window.scrollBy(0, 600)")
                time.sleep(0.4)
            time.sleep(1)
            avant = len(titres)
            for h2 in page.query_selector_all("h2"):
                t = h2.inner_text().strip()
                if t and len(t) > 3:
                    titres.add(t)
            sys.stderr.write(f"+{len(titres)-avant} (total:{len(titres)})\\n")
            sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f"ERR:{e}\\n")
            sys.stderr.flush()

with open(out_file, "w", encoding="utf-8") as f:
    json.dump(list(titres), f, ensure_ascii=False)
sys.stderr.write(f"DONE:{len(titres)}\\n")
sys.stderr.flush()
"""


def deviner_secteur(titre):
    t = titre.lower()
    for src, dst in [("é","e"),("è","e"),("ê","e"),("à","a"),("â","a"),("î","i"),("ô","o"),("û","u"),("ç","c")]:
        t = t.replace(src, dst)
    for code, mots in MOTS_SECTEUR.items():
        if any(m in t for m in mots):
            return code
    return "AUTRE"


class Command(BaseCommand):
    help = "Importe les titres de postes depuis Emploitic dans MetierReferentiel"

    def add_arguments(self, parser):
        parser.add_argument("--pages", type=int, default=20)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        nb_pages = options["pages"]
        dry_run = options["dry_run"]

        titres_existants = set(MetierReferentiel.objects.values_list("titre", flat=True))
        self.stdout.write(f"Referentiel actuel : {len(titres_existants)} metiers")

        # Scraper dans un sous-processus pour eviter le bug greenlet Windows
        tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w")
        tmp.close()
        script_tmp = tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8")
        script_tmp.write(SCRAPER_SCRIPT)
        script_tmp.close()

        self.stdout.write(f"Demarrage scraping {nb_pages} pages...")
        done = False
        try:
            proc = subprocess.Popen(
                [sys.executable, script_tmp.name, str(nb_pages), tmp.name],
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
            )
            for line in proc.stderr:
                line = line.strip()
                if line.startswith("PAGE "):
                    self.stdout.write(f"  {line}")
                elif line.startswith("+"):
                    self.stdout.write(f"    {line}")
                elif line.startswith("DONE:"):
                    self.stdout.write(f"  Scraping OK : {line.split(':')[1]} titres collectes")
                    done = True
                    break  # ne pas attendre la fermeture Playwright qui bloque sur Windows
                elif line.startswith("ERR:"):
                    self.stderr.write(f"  {line}")
            if not done:
                proc.wait(timeout=10)
        except Exception:
            pass
        finally:
            try:
                proc.kill()
            except Exception:
                pass
            os.unlink(script_tmp.name)

        # Lire resultats
        with open(tmp.name, encoding="utf-8") as f:
            titres_scrapes = set(json.load(f))
        os.unlink(tmp.name)

        nouveaux = titres_scrapes - titres_existants
        self.stdout.write(f"\nResultat : {len(titres_scrapes)} titres, {len(nouveaux)} nouveaux")

        if dry_run:
            self.stdout.write("--- DRY RUN ---")
            for t in sorted(nouveaux)[:30]:
                self.stdout.write(f"  + {t}")
            if len(nouveaux) > 30:
                self.stdout.write(f"  ... et {len(nouveaux) - 30} autres")
            return

        if not nouveaux:
            self.stdout.write("Rien de nouveau.")
            return

        objets = [MetierReferentiel(titre=t, secteur=deviner_secteur(t)) for t in nouveaux]
        MetierReferentiel.objects.bulk_create(objets, ignore_conflicts=True)
        self.stdout.write(f"OK {len(objets)} metiers importes.")
