"""
Réaligne les secteurs du MetierReferentiel en corrigeant les mauvais classements ROME :

1. INGENIERIE -> PRODUCTION  (ouvriers bois, soudeurs, tisserands, abattoir...)
2. INGENIERIE -> BTP         (charpentiers, menuisiers bâtiment, maçons...)
3. INGENIERIE -> MAINTENANCE (dépanneurs, réparateurs non-industriels)
4. ADMIN -> SANTE            (médicosociaux, pharmaciens, aide-soignants...)
5. ADMIN -> RH               (travailleurs sociaux, accompagnateurs insertion)
6. AUTRE -> LOGISTIQUE       (acheteurs, approvisionneurs)
7. AUTRE -> FINANCE          (accountants, comptables, auditeurs)
8. AUTRE -> IT               (administrateurs DB, ERP, ODOO, SAP, réseau)
9. AUTRE -> COMMERCIAL       (account managers, commerciaux)
10. AUTRE -> VENTE           (agents commerciaux, téléconseillers)

Usage :
    python manage.py realigner_secteurs --dry-run
    python manage.py realigner_secteurs --dry-run --secteur INGENIERIE
    python manage.py realigner_secteurs
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from jobs.models import MetierReferentiel


def norm(s):
    """Normalise une chaîne pour comparaison : minuscules + sans accents."""
    s = s.lower()
    for src, dst in [
        ("é", "e"), ("è", "e"), ("ê", "e"), ("ë", "e"),
        ("à", "a"), ("â", "a"), ("ä", "a"),
        ("î", "i"), ("ï", "i"),
        ("ô", "o"), ("ö", "o"),
        ("û", "u"), ("ü", "u"), ("ù", "u"),
        ("ç", "c"),
    ]:
        s = s.replace(src, dst)
    return s


def contient(titre_norm, mots):
    return any(m in titre_norm for m in mots)


def est_cadre(titre_norm):
    """Retourne True si le titre contient un mot indiquant un niveau cadre/ingénieur."""
    return contient(titre_norm, [
        "ingenieur", "directeur", "responsable", "chef de", "chef d",
        "manager", "coordinateur", "superviseur", "r&d", "recherche",
    ])


# ────────────────────────────────────────────────────────────────
# RÈGLES DE RÉALIGNEMENT
# Chaque règle : (secteur_source, nouveau_secteur, mots_déclencheurs, exclusions)
# Si le titre contient un mot exclusion -> on ne corrige pas
# ────────────────────────────────────────────────────────────────

REGLES = [

    # ── INGENIERIE -> PRODUCTION ──────────────────────────────────
    # Ouvriers et opérateurs en industrie (pas des ingénieurs)
    {
        "from": "INGENIERIE",
        "to": "PRODUCTION",
        "include": [
            "abattoir", "scierie", "tisserand", "tissage", "filature",
            "teinture", "broderie", "tapissier", "tapisserie",
            "soudeur", "braseur",
            "industrie du bois", "fabrication en bois", "usinage du bois",
            "machines a bois", "machine a bois",
            "agent de production", "operateur de production",
            "ouvrier", "manoeuvre", "aide-soudeur",
            "chaudronnier", "tolier", "fraiseur", "tourneur",
            "mouleur", "fondeur", "cordonnier", "sellier",
            "tannerie", "maroquinerie",
        ],
        "exclude": ["ingenieur", "directeur", "chef de", "responsable", "r&d", "bureau d"],
    },

    # ── INGENIERIE -> BTP ─────────────────────────────────────────
    {
        "from": "INGENIERIE",
        "to": "BTP",
        "include": [
            "charpentier", "menuisier", "macon", "maçonnerie",
            "carreleur", "couvreur", "plombier", "peintre en batiment",
            "platrier", "etancheur", "poseur de",
            "terrassier", "terrassement",
        ],
        "exclude": ["ingenieur", "directeur", "chef de projet", "bureau d"],
    },

    # ── INGENIERIE -> MAINTENANCE ─────────────────────────────────
    {
        "from": "INGENIERIE",
        "to": "MAINTENANCE",
        "include": [
            "reparateur", "reparation", "depanneur", "depannage",
            "vulcanisateur", "horloger", "bijoutier",
            "technicien de maintenance", "agent de maintenance",
        ],
        # "preparation"/"preparateur" contiennent "reparation"/"reparateur" -> faux positifs
        "exclude": ["ingenieur", "chef", "responsable", "preparateur", "preparation"],
    },

    # ── ADMIN -> SANTE ────────────────────────────────────────────
    {
        "from": "ADMIN",
        "to": "SANTE",
        "include": [
            "medicosocial", "aide soignant", "aide-soignant",
            "auxiliaire de vie", "auxiliaire de soin",
            "infirmier", "pharmacien", "kinesitherapeute",
            "accompagnant educatif", "accompagnant handicap",
            "accueillant familial", "assistant familial",
            "aide medico", "aide-medico",
        ],
        "exclude": ["directeur", "responsable", "chef de service"],
    },

    # ── ADMIN -> RH ───────────────────────────────────────────────
    {
        "from": "ADMIN",
        "to": "RH",
        "include": [
            "travailleur social", "travailleuse sociale",
            "educateur specialise", "educatrice specialisee",
            "agent social", "accompagnateur social",
            "accompagnateur socioprofessionnel",
            "conseiller en insertion", "chargee d insertion",
            "charge d insertion", "accompagnement insertion",
            "accompagnateur technique d insertion",
            "accompagnateur formateur",
            "agent d accueil social", "agent d accueil et d information sociale",
            "mediateur social",
        ],
        "exclude": ["directeur", "chef de service"],
    },

    # ── AUTRE -> LOGISTIQUE ───────────────────────────────────────
    {
        "from": "AUTRE",
        "to": "LOGISTIQUE",
        "include": [
            "acheteur", "acheteuse",
            "approvisionneur", "approvisionnement",
            "agent d entreposage", "gestionnaire de stock",
        ],
        "exclude": ["directeur", "chef departement"],
    },

    # ── AUTRE -> FINANCE ──────────────────────────────────────────
    {
        "from": "AUTRE",
        "to": "FINANCE",
        "include": [
            "accountant", "accounting",
            "account payable", "account receivable",
            "general accountant", "chief accountant",
            "auditeur", "comptabilite generale",
        ],
        "exclude": ["account manager", "account executive", "key account"],
    },

    # ── AUTRE -> IT ───────────────────────────────────────────────
    {
        "from": "AUTRE",
        "to": "IT",
        "include": [
            "administrateur bases de donnees", "administrateur de bases de donnees",
            "administrateur backup", "administrateur odoo",
            "administrateur sap", "administrateur erp",
            "administrateur systeme", "administrateur reseau",
            "developpeur", "developer", "devops",
            "data engineer", "data scientist", "data analyst",
            "cybersecurite",
        ],
        "exclude": [],
    },

    # ── AUTRE -> COMMERCIAL ───────────────────────────────────────
    {
        "from": "AUTRE",
        "to": "COMMERCIAL",
        "include": [
            "account manager", "key account", "account executive",
            "business developer", "business development",
            "charge d affaires", "technico commercial",
        ],
        "exclude": [],
    },

    # ── AUTRE -> VENTE ────────────────────────────────────────────
    {
        "from": "AUTRE",
        "to": "VENTE",
        "include": [
            "agent commercial", "conseiller de vente",
            "vendeur", "teleconseiller", "televendeur",
            "pre-vendeur", "chef de rayon",
        ],
        "exclude": [],
    },

    # ── AUTRE -> TOURISME (spectacle, arts, loisirs) ─────────────
    {
        "from": "AUTRE",
        "to": "TOURISME",
        "include": [
            "acrobate", "acteur", "artiste", "comedien",
            "accordeoniste", "musicien", "danseur",
            "accessoiriste", "decorateur de plateau",
            "realisateur", "chanteur", "metteur en scene",
            "scenographe", "costumier", "coiffeur.*spectacle",
            "regisseur", "animateur de soirees", "disc jockey",
            "eclairagiste", "sonorisateur", "chef operateur",
            "directeur artistique.*danse", "directeur artistique.*theatre",
            "illustrateur", "graveur",
            "photographe",
        ],
        "exclude": ["directeur artistique.*pub", "directeur artistique.*agence"],
    },

    # ── AUTRE -> LOGISTIQUE (chauffeurs, transport) ───────────────
    {
        "from": "AUTRE",
        "to": "LOGISTIQUE",
        "include": [
            "chauffeur", "livreur", "coursier",
            "conducteur de vehicule", "conducteur poids lourd",
            "conducteur routier", "conducteur de camion",
            "agent de transit", "transitaire",
        ],
        "exclude": ["conducteur de travaux", "conducteur d atelier", "conducteur d abatteuse"],
    },

    # ── AUTRE -> SANTE (veterinaires uniquement) ─────────────────
    {
        "from": "AUTRE",
        "to": "SANTE",
        "include": [
            "veterinaire", "veterinaria",
        ],
        "exclude": [],
    },

    # ── AUTRE -> COMMERCIAL (delegues/visiteurs pharma = commerciaux)
    {
        "from": "AUTRE",
        "to": "COMMERCIAL",
        "include": [
            "visiteur medico", "visiteur medic",
            "delegue medico", "delegue pharmac",
            "delegue.*pharmaceut",
            "delegue medico-comercial", "delegue medico commercial",
            "sales analyst", "sales development",
            "analyste des ventes",
        ],
        "exclude": [],
    },

    # ── AUTRE -> RH (charges RH/recrutement/formation) ───────────
    {
        "from": "AUTRE",
        "to": "RH",
        "include": [
            "charge.*recrutement", "chargee.*recrutement",
            "charge.*formation", "chargee.*formation",
            "charge.*capital humain", "charge.*rh",
            "charge.*ressources humaines",
            "gestionnaire rh", "gestionnaire des rh",
            "responsable rh", "directeur rh", "drh",
        ],
        "exclude": [],
    },

    # ── AUTRE -> FINANCE (charges finance/recouvrement/tresorerie)
    {
        "from": "AUTRE",
        "to": "FINANCE",
        "include": [
            "charge.*recouvrement", "chargee.*recouvrement",
            "charge.*tresor", "gestionnaire.*tresor",
            "analyste.*tresor", "analyste.*financ",
            "charge.*comptab", "charge.*fiscal",
            "charge.*facturation",
            "business controller", "financial controller",
            "analyste financier",
        ],
        "exclude": [],
    },

    # ── AUTRE -> IT (termes anglais IT) ──────────────────────────
    {
        "from": "AUTRE",
        "to": "IT",
        "include": [
            "business analyst", "it bi ", "it business",
            "it desk", "it manager", "it engineer",
            "bi engineer", "bi developer",
            "erp consultant", "sap consultant",
            "it support",
        ],
        # "unit" contient "it" comme sous-chaine -> faux positif
        "exclude": ["unit manager", "unit director"],
    },

    # ── AUTRE -> PRODUCTION (agriculture, elevage) ───────────────
    {
        "from": "AUTRE",
        "to": "PRODUCTION",
        "include": [
            "agricol", "maraich", "arboricul", "avicul",
            "viticul", "apicul", "sylvicul", "forestier",
            "horticulture", "polyculture", "grandes cultures",
            "eleveur", "vacher", "berger", "piscicul",
            "ouvrier agricole", "aide agricole",
            "technicien agricole", "technicien arboricole",
            "technicien avicole", "producteur.*ananas",
            "producteur.*oleagineux", "producteur.*fruits",
            "regisseur.*agricole", "conducteur.*production animale",
            "operateur.*abatteuse", "conducteur.*abatteuse",
        ],
        "exclude": ["conseiller agricole", "animateur agricole", "directeur"],
    },

    # ════════════════════════════════════════════════════════════════
    # PASSE 3 — Affinage AUTRE restants
    # ════════════════════════════════════════════════════════════════

    # ── AUTRE -> TOURISME (spectacle/arts restants) ───────────────
    {
        "from": "AUTRE",
        "to": "TOURISME",
        "include": [
            "batteur", "choriste", "disc jockey", "disc-jockey",
            "dompteur", "machiniste spectacle", "machiniste de scene",
            "pupitreur", "son designer", "sound designer",
            "ventriloque", "jongleur", "clown", "magicien",
            "agent d artiste", "agent artistique",
            "agent billetterie", "animateur.*soiree",
            "styliste", "modeliste", "createur.*contenu",
            "administrateur.*theatre", "administrateur.*danse",
            "administrateur.*spectacle", "administrateur.*orchestre",
            "administrateur.*tournee", "administrateur.*cinema",
            "peintre d art", "peintre sur", "sculpteur",
            "joaillier", "bijoutier.*art", "bronzier",
            "agent de voyage", "guide touristique", "guide de montagne",
        ],
        "exclude": [],
    },

    # ── AUTRE -> PRODUCTION (agriculture restante) ────────────────
    {
        "from": "AUTRE",
        "to": "PRODUCTION",
        "include": [
            "chevrier", "oleiculteur", "oleiculture",
            "planteur", "ramasseur", "cueilleur",
            "producteur de lait", "producteur de canne",
            "producteur de cannes", "producteur.*oleagineux",
            "producteur.*laitier", "producteur.*bovin",
            "producteur.*caprin", "producteur.*ovin",
            "producteur.*sucre", "producteur.*fruits",
            "boulanger", "patissier", "boucher",
            "charcutier", "poissonnier", "confiseur",
            "chocolatier", "fromager", "affineur",
            "brasseur", "distillateur", "vinificateur",
            "chef de culture", "ouvrier.*decoration",
        ],
        "exclude": ["directeur", "responsable", "chef d entreprise"],
    },

    # ── AUTRE -> LOGISTIQUE (parc auto, tri, courrier) ───────────
    {
        "from": "AUTRE",
        "to": "LOGISTIQUE",
        "include": [
            "chef de parc", "chef.*parc auto", "responsable parc",
            "chef centre de tri", "chef.*tri postal",
            "agent de courrier", "facteur", "agent postal",
            "coordinateur.*route", "route to market",
        ],
        "exclude": [],
    },

    # ── AUTRE -> COMMERCIAL (clientèle, agence, portefeuille) ─────
    {
        "from": "AUTRE",
        "to": "COMMERCIAL",
        "include": [
            "charge.*clientele", "chargee.*clientele",
            "charge.*portefeuille", "chargee.*portefeuille",
            "gestionnaire.*clientele", "gestionnaire.*portefeuille",
            "coordinateur route to market",
            "chef agence", "chef d agence",
            "superviseur des ventes",
            "responsable de zone", "delegue de zone",
        ],
        "exclude": ["banque", "assurance", "bancaire"],
    },

    # ── AUTRE -> FINANCE (middle office, facturation, recouvrement)
    {
        "from": "AUTRE",
        "to": "FINANCE",
        "include": [
            "middle office", "back office.*finance",
            "attache.*facturation", "charge.*facturation",
            "agent de recouvrement", "agent.*recouvrement",
            "gestionnaire.*finance", "gestionnaire.*tresorerie",
            "analyste de tresorerie", "analyste.*tresor",
            "credit analyst", "credit manager", "credit officer",
        ],
        "exclude": [],
    },

    # ── AUTRE -> RH (coordinateur RH, superviseur RH) ────────────
    {
        "from": "AUTRE",
        "to": "RH",
        "include": [
            "coordinateur.*rh", "coordinatrice.*rh",
            "superviseur rh", "superviseure rh",
            "gestionnaire.*paie", "charge.*paie",
            "administrateur des travailleurs",
            "charge.*talent", "charge.*competence",
        ],
        "exclude": [],
    },

    # ── AUTRE -> SANTE (pharmacovigilance, biomedical) ───────────
    {
        "from": "AUTRE",
        "to": "SANTE",
        "include": [
            "pharmacovigilance", "biomedical",
            "technicien.*medical", "technicienne.*medical",
            "aide-soignant", "aide soignant",
            "agent de soins", "aide.*soins",
            "ambulancier",
        ],
        "exclude": [],
    },

    # ── AUTRE -> MAINTENANCE (accordeur, luthier, réparateur art.) -
    {
        "from": "AUTRE",
        "to": "MAINTENANCE",
        "include": [
            "accordeur", "luthier", "facteur.*instrument",
            "restaurateur.*instrument", "reparateur.*instrument",
            "machiniste",
        ],
        # cintrier-machiniste = rigger de scène → TOURISME, pas MAINTENANCE
        "exclude": ["machiniste spectacle", "machiniste de scene", "cintrier"],
    },

    # ── AUTRE -> ADMIN (assistantes mal typées) ───────────────────
    {
        "from": "AUTRE",
        "to": "ADMIN",
        "include": [
            "assitante administrative", "assistante administratif",
            "adjoint.*directeur", "adjoint.*direction",
            "secretaire general", "secretaire.*general",
            "office manager", "assistant.*back office",
        ],
        # securite n'a pas de bon secteur -> laisser AUTRE
        "exclude": [],
    },

    # ── AUTRE -> JURIDIQUE (compliance, DPO, legal) ──────────────
    {
        "from": "AUTRE",
        "to": "JURIDIQUE",
        "include": [
            "compliance", "conformite",
            "delegue.*protection.*donnees", "dpo",
            "risk manager", "risk analyst",
            "charge.*risque", "analyste.*risque",
            "officier.*conformite",
        ],
        "exclude": [],
    },

    # ── AUTRE -> BANQUE (gestionnaire clientèle banque) ──────────
    {
        "from": "AUTRE",
        "to": "BANQUE",
        "include": [
            "charge.*portefeuille.*particuliers",
            "charge.*portefeuille.*professionnels",
            "gestionnaire.*clientele.*particuliers",
            "gestionnaire.*clientele.*professionnels",
            "gestionnaire middle office",
            "gestionnaire.*comptes",
            "gestionnaire.*produits.*bancaires",
            "charge de clientele.*banque",
        ],
        "exclude": [],
    },
]


class Command(BaseCommand):
    help = "Réaligne les secteurs mal classés du MetierReferentiel"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Affiche les corrections sans les appliquer")
        parser.add_argument("--secteur", type=str, default=None,
                            help="Filtrer sur un secteur source (ex: INGENIERIE)")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        filtre_secteur = options.get("secteur")

        tous = list(MetierReferentiel.objects.all())
        self.stdout.write(f"Total entrées : {len(tous)}")

        a_corriger = []

        for obj in tous:
            if filtre_secteur and obj.secteur != filtre_secteur:
                continue

            titre_n = norm(obj.titre or "")

            for regle in REGLES:
                if obj.secteur != regle["from"]:
                    continue

                inclus = contient(titre_n, [norm(m) for m in regle["include"]])
                exclu = contient(titre_n, [norm(m) for m in regle["exclude"]])

                if inclus and not exclu:
                    a_corriger.append((obj, regle["to"], regle["from"]))
                    break  # on prend la première règle qui match

        # Résumé par type de correction
        par_type = {}
        for obj, nouveau, ancien in a_corriger:
            cle = f"{ancien} -> {nouveau}"
            par_type.setdefault(cle, []).append(obj.titre)

        self.stdout.write(f"\nCorrections détectées : {len(a_corriger)}\n")
        for cle, titres in sorted(par_type.items()):
            self.stdout.write(f"  {cle} : {len(titres)} entrées")
            if dry_run:
                for t in titres[:5]:
                    self.stdout.write(f"    • {t}")
                if len(titres) > 5:
                    self.stdout.write(f"    ... et {len(titres) - 5} autres")

        if dry_run:
            self.stdout.write("\n[DRY-RUN] Aucune modification effectuée.")
            return

        with transaction.atomic():
            for obj, nouveau, _ in a_corriger:
                obj.secteur = nouveau
                obj.save(update_fields=["secteur"])

        self.stdout.write(self.style.SUCCESS(
            f"\nOK {len(a_corriger)} secteurs corriges."
        ))
