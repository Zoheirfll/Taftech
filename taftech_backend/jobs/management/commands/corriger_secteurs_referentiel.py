"""
Corrige les secteurs du MetierReferentiel :
1. Mappe les codes ROME non standard vers nos SECTEURS_CHOICES
2. Tente de deviner le secteur pour les entrees AUTRE via mots-cles

Usage :
    python manage.py corriger_secteurs_referentiel --dry-run
    python manage.py corriger_secteurs_referentiel
"""
import re
from django.core.management.base import BaseCommand
from jobs.models import MetierReferentiel

# Codes ROME -> nos codes
MAPPING_ROME = {
    "SERVICE_PUBLIC": "ADMIN",
    "AGRICULTURE":    "AUTRE",
    "COMMUNICATION":  "MARKETING",
    "SPECTACLE":      "AUTRE",
    "ARTS":           "AUTRE",
}

# Mots-cles pour deviner secteur sur les AUTRE (ordre = priorite)
MOTS_SECTEUR = [
    ("IT",           ["developpeur", "dev ", "software", "web", "data", "reseau", "systeme informatique", "informatique", "python", "java", "react", "devops", "cloud", "erp", "programmeur", "base de donnees", "cybersecurite", "ia ", "intelligence artificielle"]),
    ("INGENIERIE",   ["ingenieur", "genie ", "bureau d'etudes", "r&d", "recherche et developpement", "projet industriel", "technicien superieur"]),
    ("FINANCE",      ["comptable", "comptabilite", "finance", "audit", "fiscal", "tresorier", "controleur de gestion", "analyste financier", "credit", "bilan"]),
    ("RH",           ["ressources humaines", "recruteur", "responsable formation", "paie", "gestionnaire rh", "drh", "charge rh", " rh "]),
    ("COMMERCIAL",   ["commercial", "technico-commercial", "account manager", "business developer", "chargé d'affaires", "charge d'affaires"]),
    ("MARKETING",    ["marketing", "community manager", "seo", "communication", "chargé de communication", "brand", "publicite", "digital"]),
    ("LOGISTIQUE",   ["logistique", "supply chain", "achat", "stock", "transport", "magasinier", "approvisionnement", "planificateur", "transit", "douane"]),
    ("ADMIN",        ["administratif", "administration", "assistant", "office manager", "back-office", "accueil", "secretariat", "assistante de direction", "gestionnaire administratif"]),
    ("SANTE",        ["medecin", "pharmacien", "infirmier", "medical", "paramedical", "sante", "chirurgien", "biologiste", "radiologue", "dentiste", "kinesitherapeute"]),
    ("BTP",          ["architecte", "btp", "chantier", "conducteur de travaux", "geometre", "topographe", "genie civil", "batiment", "travaux"]),
    ("JURIDIQUE",    ["juriste", "avocat", "juridique", "notaire", "compliance", "droit", "conseiller juridique"]),
    ("MAINTENANCE",  ["maintenance", "electromecanicien", "entretien", "depannage", "technicien maintenance", "automaticien"]),
    ("QSE",          ["qse", "qualite", "hse", "responsable qualite", "securite industrielle", "environnement", "qhse"]),
    ("TOURISME",     ["hotellerie", "tourisme", "restauration", "chef cuisinier", "receptionniste", "cuisinier", "serveur", "barman"]),
    ("VENTE",        ["vendeur", "conseiller de vente", "televendeur", "pre-vendeur", "chef de rayon", "agent commercial"]),
    ("PRODUCTION",   ["production", "operateur", "chef d'atelier", "responsable production", "fabrication", "monteur", "soudeur", "tournage", "fraisage"]),
    ("SECRETARIAT",  ["secretaire", "assistante de direction", "assistante administrative"]),
    ("GRANDS_COMPTES", ["grands comptes", "key account", "chef de zone", "delegue commercial", "chef de secteur", "directeur regional"]),
]

CODES_VALIDES = {c for c, _ in __import__('jobs.constants', fromlist=['SECTEURS_CHOICES']).SECTEURS_CHOICES}


def normaliser(s):
    s = s.lower()
    for src, dst in [("é","e"),("è","e"),("ê","e"),("à","a"),("â","a"),("î","i"),("ô","o"),("û","u"),("ç","c"),("ë","e"),("ï","i")]:
        s = s.replace(src, dst)
    return s


def deviner_secteur(titre):
    t = normaliser(titre)
    for code, mots in MOTS_SECTEUR:
        if any(m in t for m in mots):
            return code
    return None  # on ne change pas si on ne sait pas


class Command(BaseCommand):
    help = "Corrige les secteurs du MetierReferentiel"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        tous = list(MetierReferentiel.objects.all())
        self.stdout.write(f"Total : {len(tous)}")

        a_corriger = []

        for obj in tous:
            nouveau = None

            # 1. Mapper les codes ROME non standard
            if obj.secteur in MAPPING_ROME:
                nouveau = MAPPING_ROME[obj.secteur]

            # 2. Deviner pour AUTRE ou NULL
            elif obj.secteur in ("AUTRE", None, ""):
                devine = deviner_secteur(obj.titre)
                if devine:
                    nouveau = devine

            # 3. Verifier que le secteur actuel est valide
            elif obj.secteur not in CODES_VALIDES:
                nouveau = "AUTRE"

            if nouveau and nouveau != obj.secteur:
                a_corriger.append((obj, nouveau))

        self.stdout.write(f"A corriger : {len(a_corriger)}")

        if dry_run:
            # Afficher par type de correction
            rome = [(o, n) for o, n in a_corriger if o.secteur in MAPPING_ROME]
            autre = [(o, n) for o, n in a_corriger if o.secteur in ("AUTRE", None, "")]
            self.stdout.write(f"\n--- Mapping ROME ({len(rome)}) exemples ---")
            for o, n in rome[:10]:
                self.stdout.write(f"  {o.secteur} -> {n} | {o.titre}")
            self.stdout.write(f"\n--- AUTRE devines ({len(autre)}) exemples ---")
            for o, n in autre[:20]:
                self.stdout.write(f"  -> {n:15s} | {o.titre}")
            return

        from django.db import transaction
        with transaction.atomic():
            for obj, nouveau in a_corriger:
                obj.secteur = nouveau
                obj.save(update_fields=["secteur"])

        self.stdout.write(f"OK {len(a_corriger)} secteurs corriges.")
