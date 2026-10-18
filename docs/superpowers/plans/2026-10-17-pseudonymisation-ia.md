# Pseudonymisation des données candidat avant appel IA — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aucune donnée directement identifiante d'un candidat n'atteint Groq : le CV est nettoyé avant l'analyse, les autres fonctions IA reçoivent des champs structurés pseudonymisés, et le candidat voit exactement ce qui est transmis.

**Architecture:** Un package `jobs/confidentialite_ia/` (motifs regex + spaCy pour noms/lieux, échec fermé) est la source unique. `call_ai(..., donnees_candidat=texte)` refuse tout texte contenant encore un e-mail, téléphone, URL ou NIN. Les infos personnelles du profil (nom, e-mail, téléphone…) sont extraites localement, jamais par l'IA. Un endpoint d'aperçu et un composant React montrent le texte exact envoyé.

**Tech Stack:** Django 5.2 + DRF (tests `python manage.py test`), spaCy `fr_core_news_md`, React 18 + Vite + Vitest.

**Spec :** [docs/superpowers/specs/2026-10-17-pseudonymisation-ia-design.md](../specs/2026-10-17-pseudonymisation-ia-design.md) — exigences R1 à R17 (§12). Presidio est écarté (spec §5).

## Global Constraints

- Aucun fichier de code au-dessus de 1000 lignes (cible 200-400, plafond doux 800).
- Tests backend : `python manage.py test <module>` depuis `taftech_backend/` (Django `TestCase`/`APITestCase`, pas pytest).
- Le masquage est **obligatoire et non désactivable** : aucun paramètre d'API ni option d'interface ne le coupe.
- `matcher.py` et `matching_cache.py` ne contiennent jamais d'appel IA.
- Jamais de contenu de CV, de nom ou d'e-mail dans les logs : seulement des décomptes de catégories.
- Échec fermé : si le modèle spaCy manque, aucun appel IA n'a lieu (pas de repli silencieux).
- Frontend : pas de `window.confirm`/`prompt`, pas de couleur en dur (tokens `tw.*` de `theme.js`), pas de composant défini à l'intérieur d'un autre composant.
- Modifier les fichiers existants avec Edit (changements visibles dans l'éditeur), jamais par script sed/python.
- Le dépôt contient beaucoup de modifications non commitées étrangères à ce chantier : **ne jamais `git add .` ni `git commit -a`**. Toujours `git add <fichiers>` puis `git commit -m "..." -- <fichiers>`.
- Commits au format `type: description` (feat, fix, refactor, docs, test, chore).
- Après chaque tâche : `python manage.py check` ; en fin de chantier `npm run build` (frontend).
- Tout nouvel appelant de `call_ai` doit être ajouté à la liste blanche du test d'architecture (Task 11).

---

## File Structure

Créer :
- `taftech_backend/jobs/confidentialite_ia/__init__.py` — réexporte l'API publique.
- `taftech_backend/jobs/confidentialite_ia/modeles.py` — `Detection`, `ResultatNettoyage`, jetons, libellés.
- `taftech_backend/jobs/confidentialite_ia/patterns.py` — motifs regex (source unique).
- `taftech_backend/jobs/confidentialite_ia/ner.py` — noms/lieux par spaCy, échec fermé.
- `taftech_backend/jobs/confidentialite_ia/pseudonymisation.py` — `nettoyer_texte`, références, fusion.
- `taftech_backend/jobs/confidentialite_ia/coordonnees.py` — extraction locale des coordonnées.
- `taftech_backend/jobs/confidentialite_ia/champs_structures.py` — jeton candidat, pseudonymes d'employeurs, lignes, intitulés.
- `taftech_backend/jobs/confidentialite_ia/filet.py` — `verifier_absence_pii`.
- `taftech_backend/jobs/confidentialite_ia/construction.py` — textes carrière/conseils (partagés avec l'aperçu).
- `taftech_backend/jobs/views/ia_apercu.py` — endpoint d'aperçu.
- `taftech_frontend/src/Components/ApercuDonneesIA.jsx` — case verrouillée, bouton, modale.
- Tests : `jobs/tests/test_confidentialite_motifs.py`, `test_confidentialite_ner.py`, `test_confidentialite_champs.py`, `test_call_ai_garde.py`, `test_ia_pseudonymisation_vues.py`, `test_confidentialite_classification.py`, `test_cv_parser_confidentialite.py`, `test_apercu_donnees_ia.py`, `test_architecture_ia.py`, `taftech_frontend/tests/ApercuDonneesIA.test.jsx`.

Modifier : `requirements.txt`, `taftech_backend/settings.py`, `jobs/ai_engine.py`, `jobs/views/ia.py`, `jobs/views/candidat_dashboard.py`, `jobs/referentiel_utils.py`, `jobs/domaine_agent.py`, `jobs/cv_parser/groq_json.py`, `jobs/cv_parser/parser.py`, `jobs/cv_parser/normalisation.py`, `jobs/urls.py`, `jobs/views/__init__.py`, `taftech_frontend/src/Services/iaService.js`, `StepUploadCV.jsx`, `SuggestionsCarriere.jsx`, `CandidatDashboard.jsx`, docs.

---

### Task 1: Dépendances, réglage et garde de production

**Files:**
- Modify: `taftech_backend/requirements.txt`
- Modify: `taftech_backend/taftech_backend/settings.py` (près de la ligne 210, `GROQ_API_KEY`, et dans le bloc `if not DEBUG`)
- Modify: `docs/exploitation/deploiement.md`

**Interfaces:**
- Produces: `settings.CONFIDENTIALITE_IA_NER_ACTIF` (bool, défaut `True`), lu par `pseudonymisation._ner_actif()`.

- [ ] **Step 1: Installer spaCy et le modèle français**

```powershell
cd taftech_backend
pip install spacy
python -m spacy download fr_core_news_md
pip freeze | Select-String -Pattern "spacy|fr_core_news"
```
Expected : des lignes `spacy==X.Y.Z`, `fr_core_news_md @ https://github.com/...whl` ou `fr-core-news-md==X.Y.Z`. Noter les lignes exactes.

- [ ] **Step 2: Vérifier le chargement du modèle**

Run : `python -c "import spacy; nlp = spacy.load('fr_core_news_md'); print([(e.text, e.label_) for e in nlp('Jean Dupont habite à Oran.').ents])"`
Expected : une liste contenant `('Jean Dupont', 'PER')` et `('Oran', 'LOC')`. Si le modèle ne se charge pas, ne pas continuer.

- [ ] **Step 3: Ajouter les lignes à requirements.txt**

Ouvrir `taftech_backend/requirements.txt` et ajouter, en respectant l'ordre alphabétique du fichier, les lignes **exactement** telles que `pip freeze` les a affichées au Step 1 (spaCy et ses dépendances directes `thinc`, `srsly`, `wasabi`, etc. que `pip freeze` liste aussi) ainsi que la ligne du modèle `fr_core_news_md`. Vérifier avec `pip install --dry-run -r requirements.txt` qu'il n'y a aucun conflit.

- [ ] **Step 4: Ajouter le réglage**

Dans `settings.py`, juste après la ligne `GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')` :

```python
# Détection locale de noms/lieux (spaCy) avant tout envoi à l'IA — voir jobs/confidentialite_ia/.
# Ne peut pas être désactivé en production (garde plus bas).
CONFIDENTIALITE_IA_NER_ACTIF = os.getenv('CONFIDENTIALITE_IA_NER_ACTIF', 'true').lower() != 'false'
```

- [ ] **Step 5: Ajouter la garde de production**

Lire le bloc `if not DEBUG:` qui lève `ImproperlyConfigured` pour les secrets manquants, et y ajouter, au même niveau d'indentation que les autres contrôles :

```python
    if not CONFIDENTIALITE_IA_NER_ACTIF:
        raise ImproperlyConfigured(
            "CONFIDENTIALITE_IA_NER_ACTIF ne peut pas être désactivé en production "
            "(les noms doivent être masqués avant tout envoi à l'IA)."
        )
```

- [ ] **Step 6: Documenter le déploiement**

Dans `docs/exploitation/deploiement.md`, ajouter une section « Modèle spaCy » : `pip install -r requirements.txt` installe `fr_core_news_md` ; vérifier avec la commande du Step 2 ; mémoire supplémentaire attendue : environ 200 Mo ; `CONFIDENTIALITE_IA_NER_ACTIF=true` obligatoire en production.

- [ ] **Step 7: Vérifier et commiter**

Run : `python manage.py check`
Expected : `System check identified no issues`.

```bash
git add taftech_backend/requirements.txt taftech_backend/taftech_backend/settings.py docs/exploitation/deploiement.md
git commit -m "chore: dependances spaCy et reglage de confidentialite IA" -- taftech_backend/requirements.txt taftech_backend/taftech_backend/settings.py docs/exploitation/deploiement.md
```

---

### Task 2: Motifs de détection et nettoyage par motifs (R2, R4)

**Files:**
- Create: `taftech_backend/jobs/confidentialite_ia/__init__.py` (docstring seule pour l'instant)
- Create: `taftech_backend/jobs/confidentialite_ia/modeles.py`
- Create: `taftech_backend/jobs/confidentialite_ia/patterns.py`
- Create: `taftech_backend/jobs/confidentialite_ia/pseudonymisation.py`
- Test: `taftech_backend/jobs/tests/test_confidentialite_motifs.py`

**Interfaces:**
- Produces: `modeles.Detection(debut:int, fin:int, categorie:str)`, `modeles.ResultatNettoyage(texte:str, categories:dict)`, `modeles.JETONS`, `modeles.LIBELLES_CATEGORIES`, `patterns.MOTIFS` (tuple de `(categorie, motif_compile)`), `pseudonymisation.nettoyer_texte(texte, *, avec_ner=None, noms_connus=()) -> ResultatNettoyage`, `pseudonymisation.retirer_section_references(texte) -> (str, int)`.

- [ ] **Step 1: Écrire les tests qui échouent**

`taftech_backend/jobs/tests/test_confidentialite_motifs.py` :

```python
"""Détection par motifs des données personnelles (sans modèle spaCy : avec_ner=False)."""
from django.test import SimpleTestCase

from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte


def nettoyer(texte):
    return nettoyer_texte(texte, avec_ner=False)


class MotifsDetectionTest(SimpleTestCase):
    def test_email_masque(self):
        r = nettoyer("Contact : zoheir.fll31@gmail.com")
        self.assertNotIn("zoheir", r.texte)
        self.assertIn("[EMAIL]", r.texte)
        self.assertEqual(r.categories["EMAIL"], 1)

    def test_telephones_algeriens_masques(self):
        for numero in ("0555 12 34 56", "05.55.12.34.56", "+213 555 12 34 56",
                       "00213555123456", "0555123456", "041 12 34 56"):
            with self.subTest(numero=numero):
                r = nettoyer(f"Tél : {numero}")
                self.assertIn("[TÉLÉPHONE]", r.texte)
                self.assertNotRegex(r.texte, r"\d{2}[\s.]?\d{2}[\s.]?\d{2}")

    def test_urls_personnelles_masquees(self):
        r = nettoyer("https://www.linkedin.com/in/zoheir-fll et github.com/Zoheirfll")
        self.assertNotIn("zoheir-fll", r.texte)
        self.assertNotIn("Zoheirfll", r.texte)
        self.assertEqual(r.categories["URL"], 2)

    def test_nin_masque(self):
        r = nettoyer("NIN : 109876543210987654")
        self.assertIn("[NIN]", r.texte)
        self.assertNotIn("109876543210987654", r.texte)

    def test_numero_de_passeport_masque_mais_pas_la_mention(self):
        r = nettoyer("Passeport valide n° 12AB34567")
        self.assertIn("Passeport valide", r.texte)
        self.assertNotIn("12AB34567", r.texte)

    def test_mention_passeport_sans_numero_conservee(self):
        texte = "Passeport valide jusqu'en 2027"
        self.assertEqual(nettoyer(texte).texte, texte)

    def test_date_de_naissance_masquee(self):
        for texte in ("Né le 12/03/1990 à Oran", "Date de naissance : 5 mars 1990"):
            with self.subTest(texte=texte):
                r = nettoyer(texte)
                self.assertIn("[DATE_NAISSANCE]", r.texte)
                self.assertNotIn("1990", r.texte)

    def test_adresse_masquee(self):
        for texte in ("Adresse : 12 rue des Frères Bouadou, Oran",
                      "12 Rue Didouche Mourad, Alger"):
            with self.subTest(texte=texte):
                r = nettoyer(texte)
                self.assertIn("[ADRESSE]", r.texte)
                self.assertNotIn("Didouche", r.texte)
                self.assertNotIn("Bouadou", r.texte)

    def test_texte_ordinaire_inchange(self):
        for texte in ("Développeur Python 2019 - 2023", "Master 2 ADSI",
                      "Mise en route du projet en 2021"):
            with self.subTest(texte=texte):
                self.assertEqual(nettoyer(texte).texte, texte)

    def test_section_references_supprimee_et_suite_conservee(self):
        cv = "RÉFÉRENCES\nM. Ali Ben — 0555 12 34 56\nSociété X\n\nLANGUES\nFrançais"
        r = nettoyer(cv)
        self.assertNotIn("Ali Ben", r.texte)
        self.assertNotIn("0555", r.texte)
        self.assertIn("LANGUES", r.texte)
        self.assertIn("Français", r.texte)
        self.assertEqual(r.categories["REFERENCES"], 1)

    def test_deterministe(self):
        cv = "Contact : a@b.dz\nTél 0555 12 34 56"
        self.assertEqual(nettoyer(cv), nettoyer(cv))

    def test_texte_vide(self):
        self.assertEqual(nettoyer("").texte, "")
        self.assertEqual(nettoyer(None).texte, "")
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_confidentialite_motifs -v 2`
Expected : `ModuleNotFoundError: No module named 'jobs.confidentialite_ia'`.

- [ ] **Step 3: Créer le package et les modèles**

`jobs/confidentialite_ia/__init__.py` :

```python
"""Confidentialité avant tout appel IA : détection, pseudonymisation et extraction locale des
données personnelles d'un candidat. Voir docs/superpowers/specs/2026-10-17-pseudonymisation-ia-design.md."""
```

`jobs/confidentialite_ia/modeles.py` :

```python
"""Types et libellés partagés par le package de confidentialité IA."""
from dataclasses import dataclass, field

JETONS = {
    "EMAIL": "[EMAIL]",
    "TELEPHONE": "[TÉLÉPHONE]",
    "URL": "[URL]",
    "NIN": "[NIN]",
    "DOCUMENT": "[DOCUMENT_IDENTITE]",
    "DATE_NAISSANCE": "[DATE_NAISSANCE]",
    "ADRESSE": "[ADRESSE]",
    "NOM": "[NOM]",
    "LIEU": "[LIEU]",
}

LIBELLES_CATEGORIES = {
    "EMAIL": "adresse e-mail",
    "TELEPHONE": "numéro de téléphone",
    "URL": "lien personnel (LinkedIn, GitHub, site)",
    "NIN": "numéro d'identification nationale",
    "DOCUMENT": "numéro de pièce d'identité",
    "DATE_NAISSANCE": "date de naissance",
    "ADRESSE": "adresse postale",
    "NOM": "nom ou prénom",
    "LIEU": "lieu",
    "REFERENCES": "bloc de références (coordonnées de tiers)",
}


@dataclass(frozen=True)
class Detection:
    debut: int
    fin: int
    categorie: str


@dataclass(frozen=True)
class ResultatNettoyage:
    texte: str
    categories: dict = field(default_factory=dict)
```

- [ ] **Step 4: Créer les motifs**

`jobs/confidentialite_ia/patterns.py` :

```python
"""Motifs de détection des données personnelles (Algérie) — source unique pour le nettoyage
(pseudonymisation.py), l'extraction locale (coordonnees.py) et le filet de sécurité (filet.py).
Un groupe nommé `valeur` restreint le masquage à cette partie du match (ex. le numéro d'un
passeport, pas le mot « passeport » qui renseigne un champ du profil)."""
import re

_MOIS = r"(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)"
_DATE = rf"(?:\d{{1,2}}[/.\-]\d{{1,2}}[/.\-]\d{{2,4}}|\d{{1,2}}(?:er)?\s+{_MOIS}\s+\d{{4}})"
_FIN_URL = r"[^\s<>\"')\]]+"

MOTIFS = (
    ("EMAIL", re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")),
    ("URL", re.compile(
        rf"(?:https?://|www\.){_FIN_URL}|\b(?:linkedin|github)\.com/{_FIN_URL}", re.I)),
    ("NIN", re.compile(r"(?<!\d)\d{18}(?!\d)")),
    ("DOCUMENT", re.compile(
        r"\b(?:cni|carte\s+nationale(?:\s+d['’]identit[ée])?|carte\s+d['’]identit[ée]|passeport)\b"
        r"[^\n\d]{0,25}?(?P<valeur>(?=[A-Z0-9]*\d)[A-Z0-9]{6,20})", re.I)),
    ("DATE_NAISSANCE", re.compile(
        rf"(?:n[ée](?:\(e\)|e)?\s+le|date\s+de\s+naissance|naissance)\s*:?\s*(?P<valeur>{_DATE})", re.I)),
    ("ADRESSE", re.compile(r"adresse\s*:?[^\n]{3,100}", re.I)),
    ("ADRESSE", re.compile(
        r"\b\d{1,4}\s*,?\s*(?:bis\s+)?(?:rue|avenue|boulevard|bd|cit[ée]|lotissement|lot|hai|chemin"
        r"|route|r[ée]sidence)\b[^\n]{3,80}", re.I)),
    ("TELEPHONE", re.compile(
        r"(?<!\d)(?:(?:\+|00)213[\s.\-]?|0)"
        r"(?:[5-7](?:[\s.\-]?\d{2}){4}|[2-4]\d(?:[\s.\-]?\d{2}){3})(?!\d)")),
)

TITRE_REFERENCES = re.compile(r"^\s*(?:personnes?\s+de\s+)?r[ée]f[ée]rences?\s*:?\s*$", re.I)
TITRE_SECTION = re.compile(
    r"^\s*(?:exp[ée]riences?|formations?|comp[ée]tences?|langues?|loisirs?"
    r"|centres?\s+d['’]int[ée]r[êe]ts?|projets?|certifications?|dipl[ôo]mes?)\b", re.I)
MAX_LIGNES_REFERENCES = 8
```

- [ ] **Step 5: Créer le nettoyage**

`jobs/confidentialite_ia/pseudonymisation.py` :

```python
"""Nettoyage déterministe d'un texte avant envoi à l'IA : même entrée, même sortie (l'aperçu
montré au candidat doit être identique à ce qui part)."""
import re
from collections import Counter

from django.conf import settings

from .modeles import JETONS, Detection, ResultatNettoyage
from .patterns import MAX_LIGNES_REFERENCES, MOTIFS, TITRE_REFERENCES, TITRE_SECTION

JETON_REFERENCES = "[RÉFÉRENCES SUPPRIMÉES]"
LONGUEUR_MIN_NOM = 3


def _ner_actif() -> bool:
    return getattr(settings, "CONFIDENTIALITE_IA_NER_ACTIF", True)


def retirer_section_references(texte: str) -> tuple[str, int]:
    """Remplace chaque bloc « Références » (titre + 8 lignes au plus, jusqu'à la section
    suivante) par un jeton. Retourne le texte et le nombre de blocs retirés."""
    lignes = texte.split("\n")
    sortie, i, retires = [], 0, 0
    while i < len(lignes):
        if not TITRE_REFERENCES.match(lignes[i]):
            sortie.append(lignes[i])
            i += 1
            continue
        retires += 1
        sortie.append(JETON_REFERENCES)
        i += 1
        consommees = 0
        while i < len(lignes) and consommees < MAX_LIGNES_REFERENCES and not TITRE_SECTION.match(lignes[i]):
            i += 1
            consommees += 1
    return "\n".join(sortie), retires


def detecter_motifs(texte: str) -> list[Detection]:
    detections = []
    for categorie, motif in MOTIFS:
        restreint = "valeur" in motif.groupindex
        for m in motif.finditer(texte):
            debut, fin = (m.start("valeur"), m.end("valeur")) if restreint else m.span()
            detections.append(Detection(debut, fin, categorie))
    return detections


def detecter_noms_connus(texte: str, noms) -> list[Detection]:
    """Masque les noms que TafTech connaît déjà (compte du candidat) : filet déterministe
    indépendant de la reconnaissance automatique."""
    a_masquer = set()
    for nom in noms or ():
        nom = (nom or "").strip()
        if len(nom) >= 2:
            a_masquer.add(nom)
        a_masquer.update(p for p in re.split(r"[\s\-]+", nom) if len(p) >= LONGUEUR_MIN_NOM)
    detections = []
    for nom in a_masquer:
        for m in re.finditer(rf"(?<!\w){re.escape(nom)}(?!\w)", texte, re.I):
            detections.append(Detection(m.start(), m.end(), "NOM"))
    return detections


def fusionner(detections: list[Detection]) -> list[Detection]:
    """Écarte les détections qui en chevauchent une autre (la plus longue, à début égal, gagne)."""
    retenues: list[Detection] = []
    for d in sorted(detections, key=lambda x: (x.debut, -(x.fin - x.debut))):
        if retenues and d.debut < retenues[-1].fin:
            continue
        retenues.append(d)
    return retenues


def appliquer(texte: str, detections: list[Detection]) -> str:
    morceaux, curseur = [], 0
    for d in detections:
        morceaux.append(texte[curseur:d.debut])
        morceaux.append(JETONS[d.categorie])
        curseur = d.fin
    morceaux.append(texte[curseur:])
    return "".join(morceaux)


def nettoyer_texte(texte, *, avec_ner=None, noms_connus=()) -> ResultatNettoyage:
    """Retire les données personnelles d'un texte libre. `avec_ner=None` suit le réglage
    CONFIDENTIALITE_IA_NER_ACTIF ; le NER lève ModeleNerIndisponible si le modèle manque."""
    texte = texte or ""
    if avec_ner is None:
        avec_ner = _ner_actif()
    texte, nb_references = retirer_section_references(texte)
    detections = detecter_motifs(texte) + detecter_noms_connus(texte, noms_connus)
    if avec_ner:
        from .ner import entites_ner
        detections += entites_ner(texte)
    retenues = fusionner(detections)
    categories = dict(Counter(d.categorie for d in retenues))
    if nb_references:
        categories["REFERENCES"] = nb_references
    return ResultatNettoyage(texte=appliquer(texte, retenues), categories=categories)
```

- [ ] **Step 6: Vérifier que les tests passent**

Run : `python manage.py test jobs.tests.test_confidentialite_motifs -v 2`
Expected : `OK` (12 tests). Si un motif échoue, corriger le **motif**, jamais l'assertion (ex. numéro `0555 12 34 56` mal reconnu : revoir `TELEPHONE`).

- [ ] **Step 7: Commit**

```bash
git add taftech_backend/jobs/confidentialite_ia taftech_backend/jobs/tests/test_confidentialite_motifs.py
git commit -m "feat: detection par motifs des donnees personnelles avant appel IA" -- taftech_backend/jobs/confidentialite_ia taftech_backend/jobs/tests/test_confidentialite_motifs.py
```

---

### Task 3: Noms et lieux par spaCy, échec fermé (R4)

**Files:**
- Create: `taftech_backend/jobs/confidentialite_ia/ner.py`
- Test: `taftech_backend/jobs/tests/test_confidentialite_ner.py`

**Interfaces:**
- Consumes: `Detection` (Task 2), `nettoyer_texte(..., avec_ner, noms_connus)`.
- Produces: `ner.entites_ner(texte) -> list[Detection]` (catégories `NOM`, `LIEU`), `ner.ModeleNerIndisponible`, `ner.ZONE_ENTETE = 600`.

- [ ] **Step 1: Écrire les tests qui échouent**

```python
"""Reconnaissance de noms/lieux (spaCy fr_core_news_md installé en Task 1) et échec fermé."""
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from jobs.confidentialite_ia.ner import ModeleNerIndisponible
from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte


class NerTest(SimpleTestCase):
    def test_nom_dans_le_texte_masque(self):
        r = nettoyer_texte("J'ai travaillé avec Jean Dupont sur ce projet.")
        self.assertNotIn("Dupont", r.texte)
        self.assertIn("[NOM]", r.texte)

    def test_lieu_masque_dans_l_entete_seulement(self):
        entete = "Jean Dupont\nOran, Algérie\n"
        corps = "x " * 400 + "Mission réalisée à Alger pour un client."
        r = nettoyer_texte(entete + corps)
        self.assertNotIn("Oran", r.texte)
        self.assertIn("Alger", r.texte)  # hors en-tête : conservé (utile à l'analyse)

    def test_noms_connus_masques_sans_modele(self):
        r = nettoyer_texte("Karim BENALI, ingénieur", avec_ner=False, noms_connus=("Karim", "Benali"))
        self.assertNotIn("Karim", r.texte)
        self.assertNotIn("BENALI", r.texte)

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    def test_ner_desactive_ne_masque_pas_les_noms_inconnus(self):
        self.assertIn("Dupont", nettoyer_texte("Jean Dupont").texte)

    def test_echec_ferme_si_modele_absent(self):
        with patch("jobs.confidentialite_ia.ner._charger", side_effect=ModeleNerIndisponible("absent")):
            with self.assertRaises(ModeleNerIndisponible):
                nettoyer_texte("Jean Dupont")
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_confidentialite_ner -v 2`
Expected : `ModuleNotFoundError: ... jobs.confidentialite_ia.ner`.

- [ ] **Step 3: Écrire ner.py**

```python
"""Reconnaissance des noms de personnes et des lieux d'en-tête par spaCy. Le modèle est chargé
une seule fois. S'il manque, on lève ModeleNerIndisponible : jamais de repli silencieux (un CV
non nettoyé ne doit pas partir chez le fournisseur IA)."""
import logging

from .modeles import Detection

logger = logging.getLogger(__name__)

MODELE = "fr_core_news_md"
ZONE_ENTETE = 600  # un lieu n'est masqué que dans l'en-tête (adresse), pas dans le corps

_nlp = None


class ModeleNerIndisponible(RuntimeError):
    """Le modèle spaCy n'a pas pu être chargé."""


def _charger():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load(MODELE, exclude=["lemmatizer"])
        except Exception as exc:
            logger.error("Modèle spaCy %s indisponible : %s", MODELE, type(exc).__name__)
            raise ModeleNerIndisponible(f"Modèle {MODELE} indisponible.") from exc
    return _nlp


def entites_ner(texte: str) -> list[Detection]:
    detections = []
    for ent in _charger()(texte).ents:
        if ent.label_ == "PER" and not any(c.isdigit() for c in ent.text):
            detections.append(Detection(ent.start_char, ent.end_char, "NOM"))
        elif ent.label_ == "LOC" and ent.start_char < ZONE_ENTETE:
            detections.append(Detection(ent.start_char, ent.end_char, "LIEU"))
    return detections
```

- [ ] **Step 4: Vérifier que les tests passent**

Run : `python manage.py test jobs.tests.test_confidentialite_ner -v 2`
Expected : `OK` (5 tests). Si le modèle ne reconnaît pas `Jean Dupont`, **ne pas affaiblir le test** : noter la limite dans `docs/fonctionnel/parser-cv-ia.md` et signaler à l'utilisateur (le modèle `fr_core_news_lg` est l'alternative plus précise).

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/confidentialite_ia/ner.py taftech_backend/jobs/tests/test_confidentialite_ner.py
git commit -m "feat: reconnaissance des noms et lieux par spaCy, echec ferme" -- taftech_backend/jobs/confidentialite_ia/ner.py taftech_backend/jobs/tests/test_confidentialite_ner.py
```

---

### Task 4: Extraction locale, filet de sécurité et champs structurés (R6, R10, R11, R14)

**Files:**
- Create: `taftech_backend/jobs/confidentialite_ia/coordonnees.py`
- Create: `taftech_backend/jobs/confidentialite_ia/filet.py`
- Create: `taftech_backend/jobs/confidentialite_ia/champs_structures.py`
- Modify: `taftech_backend/jobs/confidentialite_ia/__init__.py`
- Test: `taftech_backend/jobs/tests/test_confidentialite_champs.py`

**Interfaces:**
- Consumes: `nettoyer_texte`, `MOTIFS`, `entites_ner`.
- Produces:
  - `extraire_coordonnees(texte, *, avec_ner=None) -> dict` avec clés `email, telephone, linkedin, github, date_naissance_raw, wilaya, nom_complet` (valeur `None` si absente).
  - `verifier_absence_pii(texte)` lève `FuiteDonneesPersonnelles(categories)`.
  - `jeton_candidat() -> str` (`CANDIDAT_` + 6 hex majuscules), `PseudonymeurEmployeurs.libelle(nom) -> str`, `lignes_experiences(experiences, pseudonymeur=None) -> list[str]` (dicts `titre_poste, entreprise, domaine, debut, fin`), `lignes_formations(formations) -> list[str]` (dicts `diplome, specialite`), `nettoyer_champ(texte) -> str`, `nettoyer_intitule_formation(texte) -> str`, `effectifs_par_statut(statuts) -> str`.

- [ ] **Step 1: Écrire les tests qui échouent**

```python
"""Extraction locale, filet de sécurité et champs structurés pseudonymisés."""
from django.test import SimpleTestCase

from jobs.confidentialite_ia import (
    FuiteDonneesPersonnelles, PseudonymeurEmployeurs, effectifs_par_statut, extraire_coordonnees,
    jeton_candidat, lignes_experiences, lignes_formations, nettoyer_champ,
    nettoyer_intitule_formation, verifier_absence_pii,
)

CV = (
    "Karim BENALI\nkarim.benali@mail.dz\n0555 12 34 56\nOran\n"
    "Né le 12/03/1990\nhttps://www.linkedin.com/in/karim-benali\ngithub.com/kbenali\n"
)


class CoordonneesTest(SimpleTestCase):
    def test_extraction_locale(self):
        c = extraire_coordonnees(CV, avec_ner=False)
        self.assertEqual(c["email"], "karim.benali@mail.dz")
        self.assertEqual(c["telephone"], "0555 12 34 56")
        self.assertEqual(c["date_naissance_raw"], "12/03/1990")
        self.assertIn("linkedin.com/in/karim-benali", c["linkedin"])
        self.assertIn("github.com/kbenali", c["github"])
        self.assertIsNone(c["nom_complet"])  # sans NER

    def test_absences_donnent_none(self):
        c = extraire_coordonnees("Développeur Python", avec_ner=False)
        self.assertTrue(all(v is None for v in c.values()))


class FiletTest(SimpleTestCase):
    def test_refuse_email_telephone_url_nin(self):
        for texte in ("a@b.dz", "0555 12 34 56", "https://x.dz/p", "109876543210987654"):
            with self.subTest(texte=texte):
                with self.assertRaises(FuiteDonneesPersonnelles):
                    verifier_absence_pii(f"profil {texte}")

    def test_message_sans_contenu(self):
        with self.assertRaises(FuiteDonneesPersonnelles) as ctx:
            verifier_absence_pii("a@b.dz")
        self.assertNotIn("a@b.dz", str(ctx.exception))
        self.assertEqual(ctx.exception.categories, ("EMAIL",))

    def test_texte_propre_accepte(self):
        verifier_absence_pii("Titre : Développeur [EMAIL] [TÉLÉPHONE] Python 2019-2023")
        verifier_absence_pii("")


class ChampsStructuresTest(SimpleTestCase):
    def test_jeton_candidat(self):
        self.assertRegex(jeton_candidat(), r"^CANDIDAT_[0-9A-F]{6}$")
        self.assertNotEqual(jeton_candidat(), jeton_candidat())

    def test_pseudonymes_stables_dans_un_appel(self):
        p = PseudonymeurEmployeurs()
        self.assertEqual(p.libelle("SONATRACH"), "Entreprise A")
        self.assertEqual(p.libelle("Sonelgaz"), "Entreprise B")
        self.assertEqual(p.libelle("  sonatrach "), "Entreprise A")
        self.assertEqual(p.libelle(""), "Entreprise non précisée")

    def test_lignes_experiences_sans_employeur(self):
        lignes = lignes_experiences([
            {"titre_poste": "Ingénieur chez SONATRACH", "entreprise": "SONATRACH",
             "domaine": "Informatique", "debut": "2019", "fin": "2023"},
            {"titre_poste": "Développeur", "entreprise": "Sonelgaz", "domaine": None,
             "debut": "2023", "fin": None},
        ])
        texte = "\n".join(lignes)
        self.assertNotIn("SONATRACH", texte)
        self.assertNotIn("Sonelgaz", texte)
        self.assertIn("Entreprise A", texte)
        self.assertIn("Entreprise B", texte)
        self.assertIn("domaine : Informatique", texte)
        self.assertIn("2023 - présent", texte)

    def test_intitule_sans_etablissement(self):
        cas = {
            "Master informatique – Université d'Oran": "Master informatique",
            "Licence en droit à l'Université d'Alger 2": "Licence en droit",
            "Ingénieur d'état - ESI Alger": "Ingénieur d'état",
            "Master 2 ADSI": "Master 2 ADSI",
        }
        for brut, attendu in cas.items():
            with self.subTest(brut=brut):
                self.assertEqual(nettoyer_intitule_formation(brut), attendu)

    def test_intitule_uniquement_etablissement_donne_vide(self):
        self.assertEqual(nettoyer_intitule_formation("Université d'Oran"), "")

    def test_intitule_masque_les_pii(self):
        self.assertNotIn("a@b.dz", nettoyer_intitule_formation("Master informatique a@b.dz"))

    def test_lignes_formations(self):
        lignes = lignes_formations([
            {"diplome": "Master informatique – Université d'Oran", "specialite": "Systèmes d'information"},
            {"diplome": "Université d'Oran", "specialite": None},
        ])
        self.assertEqual(lignes, ["Master informatique (Systèmes d'information)"])

    def test_nettoyer_champ(self):
        self.assertEqual(nettoyer_champ("Python, joindre a@b.dz"), "Python, joindre [EMAIL]")
        self.assertEqual(nettoyer_champ(None), "")

    def test_effectifs_par_statut(self):
        self.assertEqual(effectifs_par_statut(["RECUE", "ENTRETIEN", "RECUE"]), "1 ENTRETIEN, 2 RECUE")
        self.assertEqual(effectifs_par_statut([]), "aucune candidature")
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_confidentialite_champs -v 2`
Expected : `ImportError: cannot import name 'FuiteDonneesPersonnelles'`.

- [ ] **Step 3: Écrire filet.py**

```python
"""Dernier garde-fou : refuse d'envoyer à l'IA un texte qui contient encore une donnée
directement identifiante détectable par motif. Le message ne contient jamais la donnée."""
from .patterns import MOTIFS

CATEGORIES_FILET = ("EMAIL", "TELEPHONE", "URL", "NIN")


class FuiteDonneesPersonnelles(Exception):
    def __init__(self, categories):
        self.categories = tuple(categories)
        super().__init__("Données personnelles détectées avant envoi à l'IA : " + ", ".join(self.categories))


def verifier_absence_pii(texte) -> None:
    trouvees = sorted({
        categorie for categorie, motif in MOTIFS
        if categorie in CATEGORIES_FILET and motif.search(texte or "")
    })
    if trouvees:
        raise FuiteDonneesPersonnelles(trouvees)
```

- [ ] **Step 4: Écrire coordonnees.py**

```python
"""Extraction locale des coordonnées d'un candidat à partir du CV brut : ces valeurs remplissent
le profil sans jamais être montrées à l'IA (qui ne voit que le texte nettoyé)."""
import re

from ..constants import WILAYAS_MAPPING
from .patterns import MOTIFS
from .pseudonymisation import _ner_actif

ZONE_ENTETE = 600
ZONE_NOM = 400
_FIN_URL = r"[^\s<>\"')\]]+"
_LINKEDIN = re.compile(rf"(?:https?://)?(?:[\w-]+\.)?linkedin\.com/{_FIN_URL}", re.I)
_GITHUB = re.compile(rf"(?:https?://)?(?:[\w-]+\.)?github\.com/{_FIN_URL}", re.I)


def _premier(categorie: str, texte: str):
    for cat, motif in MOTIFS:
        if cat == categorie:
            m = motif.search(texte)
            if m:
                return m
    return None


def deviner_wilaya(entete: str):
    """Code de wilaya trouvé dans l'en-tête du CV (même table que le parser), ou None."""
    bas = entete.lower()
    for texte_wilaya, code in WILAYAS_MAPPING.items():
        if re.search(r"\b" + re.escape(texte_wilaya) + r"\b", bas):
            return code
    return None


def _nom_entete(texte: str):
    from .ner import entites_ner
    for d in entites_ner(texte[:ZONE_NOM]):
        if d.categorie == "NOM":
            return texte[d.debut:d.fin].strip()
    return None


def extraire_coordonnees(texte, *, avec_ner=None) -> dict:
    texte = texte or ""
    if avec_ner is None:
        avec_ner = _ner_actif()
    email, tel = _premier("EMAIL", texte), _premier("TELEPHONE", texte)
    naissance = _premier("DATE_NAISSANCE", texte)
    linkedin, github = _LINKEDIN.search(texte), _GITHUB.search(texte)
    return {
        "email": email.group(0) if email else None,
        "telephone": tel.group(0).strip() if tel else None,
        "linkedin": linkedin.group(0) if linkedin else None,
        "github": github.group(0) if github else None,
        "date_naissance_raw": naissance.group("valeur") if naissance else None,
        "wilaya": deviner_wilaya(texte[:ZONE_ENTETE]),
        "nom_complet": _nom_entete(texte) if avec_ner else None,
    }
```

- [ ] **Step 5: Écrire champs_structures.py**

```python
"""Champs structurés envoyés à l'IA par les fonctions qui partent de la base (analyse carrière,
conseils, analyse recruteur) : liste blanche, employeurs pseudonymisés, établissements retirés."""
import re
import secrets
from collections import Counter

from .pseudonymisation import nettoyer_texte

_MARQUEURS_ETABLISSEMENT = re.compile(
    r"\b(?:universit[ée]s?|[ée]cole|institut|facult[ée]|lyc[ée]e|centre\s+de\s+formation"
    r"|cfpa|insfp|esi|ens|enp|usthb|ista)\b", re.I)
_SEPARATEURS = re.compile(r"\s*[-–—|,;/@]\s*|\s+(?:à|au)\s+", re.I)
LIBELLE_EMPLOYEUR_INCONNU = "Entreprise non précisée"


def jeton_candidat() -> str:
    """Identifiant technique temporaire (aléatoire, jamais l'identifiant en base, non stocké)."""
    return f"CANDIDAT_{secrets.token_hex(3).upper()}"


def nettoyer_champ(texte) -> str:
    """Texte libre du profil : retire e-mails, téléphones, liens, adresses, pièces d'identité."""
    return nettoyer_texte(texte or "", avec_ner=False).texte


def nettoyer_intitule_formation(texte) -> str:
    """Intitulé de formation sans le nom de l'établissement (vide s'il ne reste rien)."""
    if not texte:
        return ""
    nettoye = nettoyer_texte(texte, avec_ner=False).texte
    segments = [s.strip() for s in _SEPARATEURS.split(nettoye) if s and s.strip()]
    return " – ".join(s for s in segments if not _MARQUEURS_ETABLISSEMENT.search(s))


class PseudonymeurEmployeurs:
    """Associe chaque employeur à « Entreprise A », « Entreprise B »… de façon stable au sein
    d'un même appel (pas d'un appel à l'autre)."""

    def __init__(self):
        self._table: dict[str, str] = {}

    def libelle(self, nom) -> str:
        cle = (nom or "").strip().lower()
        if not cle:
            return LIBELLE_EMPLOYEUR_INCONNU
        if cle not in self._table:
            rang = len(self._table)
            self._table[cle] = f"Entreprise {chr(65 + rang) if rang < 26 else rang + 1}"
        return self._table[cle]


def _sans_employeur(titre: str, nom, libelle: str) -> str:
    titre = nettoyer_champ(titre)
    nom = (nom or "").strip()
    return re.sub(re.escape(nom), libelle, titre, flags=re.I) if len(nom) >= 3 else titre


def lignes_experiences(experiences, pseudonymeur=None) -> list[str]:
    pseudo = pseudonymeur or PseudonymeurEmployeurs()
    lignes = []
    for e in experiences:
        libelle = pseudo.libelle(e.get("entreprise"))
        titre = _sans_employeur(e.get("titre_poste") or "", e.get("entreprise"), libelle)
        domaine = f" — domaine : {e['domaine']}" if e.get("domaine") else ""
        lignes.append(f"{titre} chez {libelle}{domaine} ({e.get('debut') or ''} - {e.get('fin') or 'présent'})")
    return lignes


def lignes_formations(formations) -> list[str]:
    lignes = []
    for f in formations:
        diplome = nettoyer_intitule_formation(f.get("diplome"))
        if not diplome:
            continue
        specialite = f.get("specialite")
        lignes.append(f"{diplome} ({specialite})" if specialite else diplome)
    return lignes


def effectifs_par_statut(statuts) -> str:
    compte = Counter(statuts)
    return ", ".join(f"{n} {s}" for s, n in sorted(compte.items())) or "aucune candidature"
```

- [ ] **Step 6: Réexporter l'API publique**

Remplacer le contenu de `jobs/confidentialite_ia/__init__.py` par :

```python
"""Confidentialité avant tout appel IA : détection, pseudonymisation et extraction locale des
données personnelles d'un candidat. Voir docs/superpowers/specs/2026-10-17-pseudonymisation-ia-design.md.
`construction` n'est pas réexporté ici (il importe les modèles) : l'importer directement."""
from .champs_structures import (
    PseudonymeurEmployeurs, effectifs_par_statut, jeton_candidat, lignes_experiences,
    lignes_formations, nettoyer_champ, nettoyer_intitule_formation,
)
from .coordonnees import extraire_coordonnees
from .filet import FuiteDonneesPersonnelles, verifier_absence_pii
from .modeles import LIBELLES_CATEGORIES, Detection, ResultatNettoyage
from .ner import ModeleNerIndisponible
from .pseudonymisation import nettoyer_texte
```

- [ ] **Step 7: Vérifier que les tests passent**

Run : `python manage.py test jobs.tests.test_confidentialite_champs jobs.tests.test_confidentialite_motifs jobs.tests.test_confidentialite_ner -v 2`
Expected : `OK`.

- [ ] **Step 8: Commit**

```bash
git add taftech_backend/jobs/confidentialite_ia taftech_backend/jobs/tests/test_confidentialite_champs.py
git commit -m "feat: extraction locale, filet de securite et champs structures pseudonymises" -- taftech_backend/jobs/confidentialite_ia taftech_backend/jobs/tests/test_confidentialite_champs.py
```

---

### Task 5: Garde dans `call_ai` (R2, R3)

**Files:**
- Modify: `taftech_backend/jobs/ai_engine.py:27-37`
- Modify: `taftech_backend/jobs/cv_parser/groq_json.py:10-27`
- Modify: `taftech_backend/jobs/views/ia.py:341-348` (`_appel_groq`)
- Test: `taftech_backend/jobs/tests/test_call_ai_garde.py`

**Interfaces:**
- Consumes: `verifier_absence_pii`, `FuiteDonneesPersonnelles`.
- Produces: `call_ai(messages, max_tokens=500, temperature=None, response_format=None, timeout=25, donnees_candidat=None)` ; `_call_groq(prompt, max_tokens=3000, donnees_candidat=None)` ; `_appel_groq(messages, max_tokens=500, temperature=None, donnees_candidat=None)`. `donnees_candidat` = texte des données candidat contenues dans le prompt (pas le prompt entier, pour ne pas bloquer sur des exemples du prompt).

- [ ] **Step 1: Écrire les tests qui échouent**

```python
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import TestCase

from jobs.ai_engine import call_ai
from jobs.confidentialite_ia import FuiteDonneesPersonnelles
from jobs.models import AIConfig

MESSAGES = [{"role": "user", "content": "x"}]


class CallAIGardeTest(TestCase):
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()

    @patch("jobs.ai_engine._get_groq_client")
    def test_refuse_un_texte_avec_email_sans_appeler_le_fournisseur(self, mock_client):
        with self.assertRaises(FuiteDonneesPersonnelles):
            call_ai(MESSAGES, donnees_candidat="contact : a@b.dz")
        mock_client.assert_not_called()

    @patch("jobs.ai_engine._get_groq_client")
    def test_accepte_un_texte_propre(self, mock_client):
        reponse = MagicMock()
        reponse.choices[0].message.content = "ok"
        mock_client.return_value.chat.completions.create.return_value = reponse
        self.assertEqual(call_ai(MESSAGES, donnees_candidat="Développeur [EMAIL]"), "ok")

    @patch("jobs.ai_engine._get_groq_client")
    def test_sans_parametre_comportement_inchange(self, mock_client):
        reponse = MagicMock()
        reponse.choices[0].message.content = "ok"
        mock_client.return_value.chat.completions.create.return_value = reponse
        self.assertEqual(call_ai(MESSAGES), "ok")
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_call_ai_garde -v 2`
Expected : `TypeError: call_ai() got an unexpected keyword argument 'donnees_candidat'`.

- [ ] **Step 3: Modifier `call_ai`**

Remplacer dans `ai_engine.py` la signature et le début du corps :

Avant :
```python
def call_ai(messages, max_tokens=500, temperature=None, response_format=None, timeout=25):
    """Appelle le moteur IA configuré (`AIConfig.provider`) et retourne le texte brut de la
    réponse. Lève une exception si l'appel échoue — à charge de l'appelant de la catcher, comme
    c'était déjà le cas avant ce module (aucun changement de contrat pour les appelants)."""
    from .models import AIConfig
```
Après :
```python
def call_ai(messages, max_tokens=500, temperature=None, response_format=None, timeout=25,
            donnees_candidat=None):
    """Appelle le moteur IA configuré (`AIConfig.provider`) et retourne le texte brut de la
    réponse. Lève une exception si l'appel échoue — à charge de l'appelant de la catcher, comme
    c'était déjà le cas avant ce module.

    `donnees_candidat` : texte des données d'un candidat contenues dans `messages`. S'il est
    fourni, l'appel est refusé (FuiteDonneesPersonnelles) quand il contient encore un e-mail,
    un téléphone, une URL personnelle ou un NIN — dernier garde-fou après le nettoyage."""
    if donnees_candidat is not None:
        from .confidentialite_ia import verifier_absence_pii
        verifier_absence_pii(donnees_candidat)
    from .models import AIConfig
```

- [ ] **Step 4: Passer le paramètre dans `_call_groq` (groq_json.py)**

Avant :
```python
def _call_groq(prompt, max_tokens=3000):
```
et dans l'appel :
```python
        content = call_ai(
            [{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0,  # extraction/classification : mêmes entrées => mêmes sorties
        )
```
Après :
```python
def _call_groq(prompt, max_tokens=3000, donnees_candidat=None):
```
```python
        content = call_ai(
            [{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0,  # extraction/classification : mêmes entrées => mêmes sorties
            donnees_candidat=donnees_candidat,
        )
```

- [ ] **Step 5: Passer le paramètre dans `_appel_groq` (views/ia.py)**

Avant :
```python
def _appel_groq(messages, max_tokens=500, temperature=None):
```
```python
    texte = call_ai(messages, max_tokens=max_tokens, temperature=temperature)
```
Après :
```python
def _appel_groq(messages, max_tokens=500, temperature=None, donnees_candidat=None):
```
```python
    texte = call_ai(messages, max_tokens=max_tokens, temperature=temperature,
                    donnees_candidat=donnees_candidat)
```

- [ ] **Step 6: Vérifier**

Run : `python manage.py test jobs.tests.test_call_ai_garde jobs.tests.test_ai_engine -v 2`
Expected : `OK` (les tests existants de `call_ai` restent verts).

- [ ] **Step 7: Commit**

```bash
git add taftech_backend/jobs/ai_engine.py taftech_backend/jobs/cv_parser/groq_json.py taftech_backend/jobs/views/ia.py taftech_backend/jobs/tests/test_call_ai_garde.py
git commit -m "feat: call_ai refuse les donnees candidat contenant encore des identifiants" -- taftech_backend/jobs/ai_engine.py taftech_backend/jobs/cv_parser/groq_json.py taftech_backend/jobs/views/ia.py taftech_backend/jobs/tests/test_call_ai_garde.py
```

---

### Task 6: Analyse IA recruteur — jeton `CANDIDAT_xxx` (R6, R10)

**Files:**
- Modify: `taftech_backend/jobs/views/ia.py` (imports en tête ; bloc `AnalyseGroqRecruteurAPIView.post`, lignes 439-511)
- Test: `taftech_backend/jobs/tests/test_ia_pseudonymisation_vues.py` (créé ici, complété Task 7)

**Interfaces:**
- Consumes: `jeton_candidat`, `lignes_experiences`, `lignes_formations`, `nettoyer_champ`, `_appel_groq(..., donnees_candidat=)`.
- Produces: le prompt envoyé ne contient ni nom, ni prénom, ni employeur, ni établissement ; la réponse stockée remplace le jeton par « le candidat ».

- [ ] **Step 1: Écrire le test qui échoue**

`jobs/tests/test_ia_pseudonymisation_vues.py` :

```python
"""Les prompts envoyés à l'IA ne contiennent plus d'identifiant candidat (R6, R10, R11, R14)."""
import re
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.models import Candidature, OffreEmploi
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()


class AnalyseRecruteurPseudonymeTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.proprio, self.entreprise = make_entreprise("pseudo_rec", palier_nom="BUSINESS")
        offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre", wilaya="16 - Alger",
            description="d", statut_moderation="APPROUVEE",
        )
        candidat = User.objects.create_user(
            username="pseudo_cand", email="pseudo_cand@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        self.candidature = Candidature.objects.create(
            offre=offre, candidat=candidat, score_matching=70,
            profil_snapshot={
                "first_name": "Karim", "last_name": "Benali", "titre_professionnel": "Développeur",
                "diplome": "MASTER_2", "competences": "Python, Django", "wilaya": "16 - Alger",
                "experiences": [{"titre_poste": "Développeur", "entreprise": "SONATRACH",
                                 "date_debut": "2019", "date_fin": "2023"}],
                "formations": [{"diplome": "Master informatique – Université d'Oran",
                                "etablissement": "Université d'Oran"}],
            },
        )
        self.url = reverse("analyse-groq", args=[self.candidature.id])

    @patch("jobs.views.ia._appel_groq", return_value="Analyse")
    def test_prompt_sans_nom_ni_employeur_ni_ecole(self, mock_ia):
        self.client.force_authenticate(user=self.proprio)
        self.assertEqual(self.client.post(self.url).status_code, 200)
        prompt = mock_ia.call_args[0][0][0]["content"]
        for interdit in ("Karim", "Benali", "SONATRACH", "Université", "Oran"):
            self.assertNotIn(interdit, prompt)
        self.assertRegex(prompt, r"CANDIDAT_[0-9A-F]{6}")
        self.assertIn("Entreprise A", prompt)
        self.assertIn("Master informatique", prompt)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)

    def test_reponse_rattachee_sans_le_jeton(self):
        def faux_appel(messages, **kwargs):
            jeton = re.search(r"CANDIDAT_[0-9A-F]{6}", messages[0]["content"]).group(0)
            return f"{jeton} est solide."
        self.client.force_authenticate(user=self.proprio)
        with patch("jobs.views.ia._appel_groq", side_effect=faux_appel):
            r = self.client.post(self.url)
        self.assertEqual(r.data["analyse"], "le candidat est solide.")
        self.candidature.refresh_from_db()
        self.assertEqual(self.candidature.derniere_analyse_ia, "le candidat est solide.")
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_ia_pseudonymisation_vues.AnalyseRecruteurPseudonymeTest -v 2`
Expected : FAIL (`Karim` présent dans le prompt).

- [ ] **Step 3: Ajouter l'import**

Dans `views/ia.py`, après la ligne `from ..throttles import PublicReadThrottle, FileUploadThrottle` :

```python
from ..confidentialite_ia import (
    jeton_candidat, lignes_experiences, lignes_formations, nettoyer_champ,
)
```

- [ ] **Step 4: Remplacer la préparation des données du candidat**

Avant (de `snapshot = candidature.profil_snapshot` jusqu'à `form_text = ... or "Aucune"`), le bloc qui calcule `nom`, `titre`, `diplome`, `competences`, `wilaya`, `experiences`, `formations`, `exp_text`, `form_text`. Après :

```python
        jeton = jeton_candidat()
        snapshot = candidature.profil_snapshot
        if snapshot:
            titre = snapshot.get('titre_professionnel', 'Non renseigné')
            diplome = snapshot.get('diplome', 'Non renseigné')
            competences = snapshot.get('competences', 'Non renseigné')
            wilaya = snapshot.get('wilaya', 'Non renseigné')
            experiences = snapshot.get('experiences', [])
            formations = snapshot.get('formations', [])
        elif candidature.candidat:
            try:
                profil = candidature.candidat.profil_candidat
                titre = profil.titre_professionnel or 'Non renseigné'
                diplome = profil.diplome or 'Non renseigné'
                competences = profil.competences or 'Non renseigné'
                wilaya = profil.wilaya or 'Non renseigné'
                experiences = [
                    {'titre_poste': e.titre_poste, 'entreprise': e.entreprise,
                     'date_debut': _date_precise(e.date_debut, e.date_debut_precision),
                     'date_fin': _date_precise(e.date_fin, e.date_fin_precision) or None}
                    for e in profil.experiences_detail.all()
                ]
                formations = [{'diplome': f.diplome} for f in profil.formations_detail.all()]
            except Exception:
                return Response({'error': 'Pas de données candidat.'}, status=400)
        else:
            return Response({'error': 'Candidature rapide sans profil.'}, status=400)

        offre = candidature.offre
        titre, diplome, competences = nettoyer_champ(titre), nettoyer_champ(diplome), nettoyer_champ(competences)
        exp_text = '\n'.join(f"- {ligne}" for ligne in lignes_experiences([
            {'titre_poste': e.get('titre_poste'), 'entreprise': e.get('entreprise'),
             'debut': e.get('date_debut', ''), 'fin': e.get('date_fin')}
            for e in experiences
        ])) or "Aucune"
        form_text = '\n'.join(f"- {ligne}" for ligne in lignes_formations(
            [{'diplome': f.get('diplome')} for f in formations]
        )) or "Aucune"
```

- [ ] **Step 5: Remplacer le jeton dans le prompt et passer le texte candidat au garde**

Avant : `.replace("{nom_candidat}", str(nom))` — Après : `.replace("{nom_candidat}", jeton)`.

Puis, juste avant `if not acquerir_verrou_ia(request.user, 'ANALYSE_RECRUTEUR'):`, ajouter :

```python
        donnees_candidat = '\n'.join([titre, diplome, competences, exp_text, form_text])
```

Modifier l'appel et le stockage :

Avant :
```python
            analyse = _appel_groq(
                [{'role': 'user', 'content': prompt}],
                max_tokens=ai_config.analyse_recruteur_max_tokens,
                temperature=0.5
            )
```
Après :
```python
            analyse = _appel_groq(
                [{'role': 'user', 'content': prompt}],
                max_tokens=ai_config.analyse_recruteur_max_tokens,
                temperature=0.5,
                donnees_candidat=donnees_candidat,
            )
            analyse = analyse.replace(jeton, "le candidat")
```

- [ ] **Step 6: Vérifier (nouveaux tests + tests existants de la route)**

Run : `python manage.py test jobs.tests.test_ia_pseudonymisation_vues jobs.tests.test_audit_acces_paliers jobs.tests.test_api_groq_throttle -v 2`
Expected : `OK`.

- [ ] **Step 7: Commit**

```bash
git add taftech_backend/jobs/views/ia.py taftech_backend/jobs/tests/test_ia_pseudonymisation_vues.py
git commit -m "feat: analyse IA recruteur sans nom, employeur ni etablissement (jeton CANDIDAT_xxx)" -- taftech_backend/jobs/views/ia.py taftech_backend/jobs/tests/test_ia_pseudonymisation_vues.py
```

---

### Task 7: Analyse carrière et conseils — champs structurés minimaux (R6, R11, R14)

**Files:**
- Create: `taftech_backend/jobs/confidentialite_ia/construction.py`
- Modify: `taftech_backend/jobs/views/ia.py` (`AnalyseCarriereGroqAPIView.get`, lignes 371-396)
- Modify: `taftech_backend/jobs/views/candidat_dashboard.py` (`ConseilsPersonnalisesIAAPIView.get`, lignes 95-132)
- Test: `taftech_backend/jobs/tests/test_ia_pseudonymisation_vues.py` (compléter)

**Interfaces:**
- Produces: `texte_carriere(profil) -> str` et `texte_conseils(user, profil) -> str`, utilisés à la fois par les vues et par l'aperçu (Task 10) : le texte montré est donc exactement le texte envoyé.

- [ ] **Step 1: Ajouter les tests qui échouent** (à la suite du fichier de la Task 6)

```python
from datetime import date

from jobs.models import ExperienceCandidat, FormationCandidat, ProfilCandidat


class AnalyseCarrierePseudonymeTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="pseudo_car", email="pseudo_car@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        self.profil = ProfilCandidat.objects.create(
            user=self.user, titre_professionnel="Développeur", competences="Python, joindre a@b.dz",
        )
        ExperienceCandidat.objects.create(
            profil=self.profil, titre_poste="Développeur", entreprise="SONATRACH",
            date_debut=date(2019, 1, 1), date_fin=date(2023, 1, 1),
        )
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master informatique – Université d'Oran",
            etablissement="Université d'Oran",
        )

    @patch("jobs.views.ia._appel_groq", return_value="###MÉTIERS POSSIBLES###\nx")
    def test_carriere_sans_employeur_ni_ecole_ni_contact(self, mock_ia):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(reverse("analyse-carriere")).status_code, 200)
        contenu = mock_ia.call_args[0][0][1]["content"]
        for interdit in ("SONATRACH", "Université", "Oran", "a@b.dz", "Karim", "Benali"):
            self.assertNotIn(interdit, contenu)
        self.assertIn("Entreprise A", contenu)
        self.assertIn("Master informatique", contenu)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)


class ConseilsPseudonymesTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="pseudo_con", email="pseudo_con@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        ProfilCandidat.objects.create(user=self.user, titre_professionnel="Développeur")

    @patch("jobs.ai_engine.call_ai", return_value='{"conseils": ["a", "b", "c"]}')
    def test_conseils_sans_identifiant_et_avec_effectifs(self, mock_ia):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(reverse("conseils-personnalises")).status_code, 200)
        contenu = mock_ia.call_args[0][0][1]["content"]
        self.assertNotIn("Karim", contenu)
        self.assertNotIn("Benali", contenu)
        self.assertIn("aucune candidature", contenu)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_ia_pseudonymisation_vues -v 2`
Expected : FAIL (`SONATRACH` présent ; `aucune candidature` absent). Si le quota IA renvoie 403, appliquer la préparation utilisée par `jobs/tests/test_ia_quota.py` (le candidat doit avoir un quota disponible) avant de continuer.

- [ ] **Step 3: Créer construction.py**

```python
"""Texte envoyé à l'IA par l'analyse carrière et les conseils : construit ici (et non dans les
vues) pour que l'aperçu montré au candidat soit exactement ce qui part."""
from ..models import AlerteEmploi, Candidature
from ..profile_score import calculer_score_profil
from .champs_structures import (
    PseudonymeurEmployeurs, effectifs_par_statut, lignes_experiences, lignes_formations,
    nettoyer_champ,
)


def texte_carriere(profil) -> str:
    from ..views.ia import _date_precise  # import différé : views.ia importe ce package

    experiences = [
        {
            'titre_poste': e.titre_poste,
            'entreprise': e.entreprise,
            'domaine': e.metier.groupe_principal.libelle if e.metier and e.metier.groupe_principal else None,
            'debut': _date_precise(e.date_debut, e.date_debut_precision),
            'fin': _date_precise(e.date_fin, e.date_fin_precision) or None,
        }
        for e in profil.experiences_detail.select_related('metier__groupe_principal')
    ]
    formations = [
        {
            'diplome': f.diplome_ref.libelle if f.diplome_ref_id else f.diplome,
            'specialite': f.specialite_ref.libelle if f.specialite_ref_id else None,
        }
        for f in profil.formations_detail.select_related('diplome_ref', 'specialite_ref')
    ]
    experiences_txt = lignes_experiences(experiences, PseudonymeurEmployeurs())
    formations_txt = lignes_formations(formations)
    metier_actuel = profil.metier.libelle if profil.metier else None
    metier_souhaite = profil.metier_souhaite.libelle if profil.metier_souhaite else None
    return f"""
Titre : {nettoyer_champ(profil.titre_professionnel) or 'Non renseigné'}
Diplôme : {profil.diplome or 'Non renseigné'}
Métier : {metier_actuel or 'Non renseigné'}
Compétences : {nettoyer_champ(profil.competences) or 'Non renseigné'}
Expériences : {', '.join(experiences_txt) if experiences_txt else 'Aucune'}
Formations : {', '.join(formations_txt) if formations_txt else 'Aucune'}
Métier souhaité : {metier_souhaite or 'Non renseigné'}
"""


def texte_conseils(user, profil) -> str:
    score = calculer_score_profil(user)
    statuts = Candidature.objects.filter(candidat=user).values_list('statut', flat=True)
    competences_faibles = [
        f"{c.label} ({c.get_niveau_display()})"
        for c in profil.competences_detail.exclude(niveau='CONFIRME')[:5]
    ]
    diplome = profil.diplome_ref.libelle if profil.diplome_ref_id else (profil.diplome or 'Non renseigné')
    return f"""
Score de profil global : {score['total']}/100
Détail du score : {nettoyer_champ(str(score['details']))}
Candidatures envoyées par statut : {effectifs_par_statut(statuts)}
Compétences non confirmées (niveau faible) : {', '.join(competences_faibles) if competences_faibles else 'Aucune'}
Nombre d'alertes emploi configurées : {AlerteEmploi.objects.filter(candidat=user).count()}
Titre professionnel : {nettoyer_champ(profil.titre_professionnel) or 'Non renseigné'}
Diplôme : {diplome}
"""
```

- [ ] **Step 4: Utiliser `texte_carriere` dans la vue carrière**

Dans `views/ia.py`, `AnalyseCarriereGroqAPIView.get`, remplacer le bloc qui construit `experiences`, `formations`, `metier_actuel`, `metier_souhaite` et `profil_text` (lignes 371 à 387) par :

```python
        from ..confidentialite_ia.construction import texte_carriere
        profil_text = texte_carriere(profil)
```
(import à l'intérieur de `get` pour éviter un import circulaire) et l'appel :

Avant :
```python
            analyse = _appel_groq([
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': f'Analyse ce profil :\n{profil_text}'}
            ], max_tokens=ai_config.analyse_carriere_max_tokens)
```
Après :
```python
            analyse = _appel_groq([
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': f'Analyse ce profil :\n{profil_text}'}
            ], max_tokens=ai_config.analyse_carriere_max_tokens, donnees_candidat=profil_text)
```

- [ ] **Step 5: Utiliser `texte_conseils` dans la vue conseils**

Dans `candidat_dashboard.py`, remplacer les lignes 95 à 117 (calcul de `score`, `candidatures`, `alertes`, `competences_faibles`, `nb_nouvelles_offres_alertes`, `donnees_text`) par :

```python
        from ..confidentialite_ia.construction import texte_conseils
        donnees_text = texte_conseils(request.user, profil)
```
et l'appel `call_ai(` reçoit `donnees_candidat=donnees_text,` après `response_format={'type': 'json_object'},`. Supprimer les imports devenus inutiles dans cette méthode (`calculer_score_profil` reste utilisé par `ScoreProfilAPIView`).

- [ ] **Step 6: Vérifier**

Run : `python manage.py test jobs.tests.test_ia_pseudonymisation_vues jobs.tests.test_audit_acces_paliers -v 2`
Expected : `OK`. Puis `python manage.py check`.

- [ ] **Step 7: Commit**

```bash
git add taftech_backend/jobs/confidentialite_ia/construction.py taftech_backend/jobs/views/ia.py taftech_backend/jobs/views/candidat_dashboard.py taftech_backend/jobs/tests/test_ia_pseudonymisation_vues.py
git commit -m "feat: analyse carriere et conseils avec champs structures minimaux" -- taftech_backend/jobs/confidentialite_ia/construction.py taftech_backend/jobs/views/ia.py taftech_backend/jobs/views/candidat_dashboard.py taftech_backend/jobs/tests/test_ia_pseudonymisation_vues.py
```

---

### Task 8: Classification des métiers, diplômes et spécialités (R12, R13)

**Files:**
- Modify: `taftech_backend/jobs/referentiel_utils.py` (`_resoudre_specialite_via_ia` ~625-657, `_resoudre_diplome_via_ia` ~660-713)
- Modify: `taftech_backend/jobs/domaine_agent.py` (`classifier_metiers_experiences` ~153-185)
- Test: `taftech_backend/jobs/tests/test_confidentialite_classification.py`

**Interfaces:**
- Consumes: `nettoyer_intitule_formation`, `nettoyer_champ`, `call_ai(..., donnees_candidat=)`, `_call_groq(..., donnees_candidat=)`.

- [ ] **Step 1: Écrire les tests qui échouent**

```python
"""Les appels de classification n'envoient ni nom d'établissement ni coordonnées (R12, R13)."""
from unittest.mock import MagicMock, patch

from django.test import TestCase

from jobs.domaine_agent import classifier_metiers_experiences
from jobs.referentiel_utils import _resoudre_diplome_via_ia, _resoudre_specialite_via_ia


def _type_diplome():
    fake = MagicMock()
    fake.libelle = "Master académique"
    return fake


class ClassificationDiplomeTest(TestCase):
    def test_diplome_sans_etablissement_ni_contact(self):
        with patch("jobs.models.TypeDiplome") as td, \
                patch("jobs.ai_engine.call_ai", return_value='{"index": -1}') as ia:
            td.objects.exclude.return_value.order_by.return_value = [_type_diplome()]
            _resoudre_diplome_via_ia("Master informatique – Université d'Oran, contact a@b.dz")
        prompt = ia.call_args[0][0][0]["content"]
        self.assertNotIn("Université", prompt)
        self.assertNotIn("a@b.dz", prompt)
        self.assertIn("Master informatique", prompt)
        self.assertIn("donnees_candidat", ia.call_args.kwargs)

    def test_intitule_uniquement_etablissement_aucun_appel(self):
        with patch("jobs.models.TypeDiplome") as td, patch("jobs.ai_engine.call_ai") as ia:
            td.objects.exclude.return_value.order_by.return_value = [_type_diplome()]
            self.assertIsNone(_resoudre_diplome_via_ia("Université d'Oran"))
        ia.assert_not_called()

    def test_specialite_sans_etablissement(self):
        candidate = MagicMock()
        candidate.libelle = "Informatique de gestion"
        with patch("jobs.ai_engine.call_ai", return_value='{"index": -1}') as ia:
            _resoudre_specialite_via_ia("Informatique de gestion – Université d'Oran", [candidate])
        prompt = ia.call_args[0][0][0]["content"]
        self.assertNotIn("Université", prompt)
        self.assertIn("donnees_candidat", ia.call_args.kwargs)


class ClassificationMetierTest(TestCase):
    def test_experiences_sans_coordonnees(self):
        experiences = [{"titre_poste": "Développeur",
                        "description": "Contact client : a@b.dz ou 0555 12 34 56"}]
        with patch("jobs.cv_parser._call_groq", return_value='{"classifications": []}') as ia:
            classifier_metiers_experiences(experiences, titre_professionnel="Développeur web")
        prompt = ia.call_args[0][0]
        self.assertNotIn("a@b.dz", prompt)
        self.assertNotIn("0555", prompt)
        self.assertIn("donnees_candidat", ia.call_args.kwargs)
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_confidentialite_classification -v 2`
Expected : FAIL (`Université` présent dans le prompt).

- [ ] **Step 3: Nettoyer l'intitulé dans `_resoudre_diplome_via_ia`**

Dans `referentiel_utils.py`, après `from .models import TypeDiplome` de `_resoudre_diplome_via_ia`, ajouter :

```python
    from .confidentialite_ia import nettoyer_intitule_formation

    texte = nettoyer_intitule_formation(texte)
    if not texte:
        return None  # il ne reste que le nom de l'établissement : rien à classifier
```
et remplacer l'appel :

Avant :
```python
        content = call_ai(
            [{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0,
            response_format={"type": "json_object"},
        )
        data = json.loads(content)
        idx = data.get("index")
        if isinstance(idx, int) and 0 <= idx < len(types):
```
Après :
```python
        content = call_ai(
            [{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0,
            response_format={"type": "json_object"},
            donnees_candidat=texte,
        )
        data = json.loads(content)
        idx = data.get("index")
        if isinstance(idx, int) and 0 <= idx < len(types):
```

- [ ] **Step 4: Même traitement pour `_resoudre_specialite_via_ia`**

Après `from .ai_engine import call_ai` :

```python
    from .confidentialite_ia import nettoyer_intitule_formation

    texte = nettoyer_intitule_formation(texte)
    if not texte:
        return None
```
et dans l'appel `call_ai(` de cette fonction (celui suivi de `if isinstance(idx, int) and 0 <= idx < len(candidates):`), ajouter `donnees_candidat=texte,` après `response_format={"type": "json_object"},`.

- [ ] **Step 5: Nettoyer les blocs envoyés par `classifier_metiers_experiences`**

Dans `domaine_agent.py`, remplacer la construction des blocs :

Avant :
```python
    if titre_professionnel:
        candidats = _candidats_pour_experience(titre_professionnel, "")
        candidats_par_index[0] = candidats
        blocs.append(_bloc_experience(0, f"[PROFIL] {titre_professionnel}", "", candidats))
    for i, exp in enumerate(experiences):
        titre_poste = exp.get('titre_poste', '') if isinstance(exp, dict) else ''
        description = exp.get('description', '') if isinstance(exp, dict) else ''
        candidats = _candidats_pour_experience(titre_poste, description)
        candidats_par_index[i + decalage] = candidats
        blocs.append(_bloc_experience(i + decalage, titre_poste, description, candidats))
```
Après :
```python
    from .confidentialite_ia import nettoyer_champ  # même nettoyage que partout avant l'IA

    if titre_professionnel:
        candidats = _candidats_pour_experience(titre_professionnel, "")
        candidats_par_index[0] = candidats
        blocs.append(_bloc_experience(0, f"[PROFIL] {nettoyer_champ(titre_professionnel)}", "", candidats))
    for i, exp in enumerate(experiences):
        titre_poste = exp.get('titre_poste', '') if isinstance(exp, dict) else ''
        description = exp.get('description', '') if isinstance(exp, dict) else ''
        candidats = _candidats_pour_experience(titre_poste, description)  # local : valeurs brutes
        candidats_par_index[i + decalage] = candidats
        blocs.append(_bloc_experience(
            i + decalage, nettoyer_champ(titre_poste), nettoyer_champ(description), candidats))
```
et l'appel : `content = _call_groq(prompt, max_tokens=2000)` devient

```python
    content = _call_groq(prompt, max_tokens=2000, donnees_candidat="\n\n".join(blocs))
```

- [ ] **Step 6: Vérifier**

Run : `python manage.py test jobs.tests.test_confidentialite_classification jobs.tests.test_rattachement_metier_canonique -v 2`
Expected : `OK`.

- [ ] **Step 7: Commit**

```bash
git add taftech_backend/jobs/referentiel_utils.py taftech_backend/jobs/domaine_agent.py taftech_backend/jobs/tests/test_confidentialite_classification.py
git commit -m "feat: classification metiers et diplomes sans etablissement ni coordonnees" -- taftech_backend/jobs/referentiel_utils.py taftech_backend/jobs/domaine_agent.py taftech_backend/jobs/tests/test_confidentialite_classification.py
```

---

### Task 9: Parser de CV sur texte nettoyé (R2, R3, R4, R17)

**Files:**
- Modify: `taftech_backend/jobs/cv_parser/normalisation.py` (ajouter `_normaliser_telephone`)
- Modify: `taftech_backend/jobs/cv_parser/parser.py` (`parse_with_groq`, `parse_cv`)
- Modify: `taftech_backend/jobs/views/ia.py` (`ParserCVAPIView.post`, ligne 285)
- Test: `taftech_backend/jobs/tests/test_cv_parser_confidentialite.py`

**Interfaces:**
- Consumes: `nettoyer_texte`, `extraire_coordonnees`, `ModeleNerIndisponible`.
- Produces: `parse_with_groq(text, noms_connus=())`, `parse_cv(file_path, file_name, noms_connus=())`, constante `LONGUEUR_MAX_PARSER = 7000` (réutilisée par l'aperçu), `normalisation._normaliser_telephone(valeur) -> str`.

- [ ] **Step 1: Écrire les tests qui échouent**

```python
"""Le parser ne transmet que le texte nettoyé et remplit les coordonnées en local (R2, R4, R17)."""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings

from jobs.cv_parser.normalisation import _normaliser_telephone
from jobs.cv_parser.parser import parse_cv, parse_with_groq
from jobs.models import AIConfig

CV = (
    "Karim BENALI\nkarim.benali@mail.dz\n0555 12 34 56\nOran\nNé le 12/03/1990\n"
    "https://www.linkedin.com/in/karim-benali\n\n"
    "Développeur Python\nExpérience : 2019 - 2023 développement d'applications web pour des clients."
)
REPONSE_IA = ('{"titre_professionnel": "Développeur", "experiences": [], "formations": [],'
              ' "nom_complet": "[NOM]", "email": "[EMAIL]", "telephone": "[TÉLÉPHONE]",'
              ' "linkedin": "[URL]"}')


class ParserConfidentialiteTest(TestCase):
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    @patch("jobs.cv_parser.parser._call_groq", return_value=REPONSE_IA)
    def test_prompt_sans_donnees_personnelles(self, mock_ia):
        parse_with_groq(CV, noms_connus=("Karim", "Benali"))
        prompt = mock_ia.call_args[0][0]
        for interdit in ("karim.benali@mail.dz", "0555 12 34 56", "12/03/1990", "Karim", "BENALI",
                         "karim-benali"):
            self.assertNotIn(interdit, prompt)
        self.assertIn("Développeur Python", prompt)
        self.assertIn("[EMAIL]", prompt)
        self.assertIn("jetons entre crochets", prompt)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    @patch("jobs.cv_parser.parser._call_groq", return_value=REPONSE_IA)
    @patch("jobs.cv_parser.parser.extract_text", return_value=CV)
    def test_coordonnees_remplies_localement(self, _extract, _ia):
        result = parse_cv("cv.txt", "cv.txt", noms_connus=("Karim", "Benali"))
        self.assertTrue(result["success"])
        self.assertEqual(result["email"], "karim.benali@mail.dz")
        self.assertEqual(result["telephone"], "0555123456")
        self.assertIn("linkedin.com/in/karim-benali", result["linkedin"])
        self.assertNotIn("[", str(result["nom_complet"] or ""))

    @patch("jobs.cv_parser.parser._call_groq")
    def test_modele_absent_aucun_appel_ia(self, mock_ia):
        from jobs.confidentialite_ia import ModeleNerIndisponible
        with patch("jobs.confidentialite_ia.ner._charger", side_effect=ModeleNerIndisponible("x")):
            self.assertIsNone(parse_with_groq(CV))
        mock_ia.assert_not_called()


class TelephoneTest(TestCase):
    def test_normalisation(self):
        self.assertEqual(_normaliser_telephone("0555 12 34 56"), "0555123456")
        self.assertEqual(_normaliser_telephone("+213 555 12 34 56"), "0555123456")
        self.assertEqual(_normaliser_telephone("00213555123456"), "0555123456")
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_cv_parser_confidentialite -v 2`
Expected : `ImportError: cannot import name '_normaliser_telephone'`.

- [ ] **Step 3: Extraire la normalisation du téléphone**

Dans `normalisation.py`, ajouter (avec `import re` en tête si absent) :

```python
def _normaliser_telephone(valeur):
    """Numéro algérien à 10 chiffres (0X XX XX XX XX) : retire séparateurs, indicatif
    international et numéros collés. Logique déplacée de parse_with_groq (inchangée)."""
    tel = re.sub(r'[\s.\-()]', '', str(valeur))
    tel = re.split(r'[/,;]', tel)[0]
    chiffres = re.sub(r'\D', '', tel)
    if chiffres.startswith('00213'):
        chiffres = '0' + chiffres[5:]
    elif chiffres.startswith('213') and len(chiffres) > 10:
        chiffres = '0' + chiffres[3:]
    if len(chiffres) > 10 and chiffres.startswith('0'):
        chiffres = chiffres[:10]
    return chiffres or tel
```
Dans `parser.py`, remplacer le bloc qui normalise `infos["telephone"]` (lignes 89-103) par :

```python
    if infos.get("telephone"):
        result["telephone"] = _normaliser_telephone(infos["telephone"])
```
et compléter l'import : `from .normalisation import _normaliser_date_naissance, _normaliser_mobilite, _normaliser_sexe, _normaliser_situation_actuelle, _normaliser_telephone`.

- [ ] **Step 4: Nettoyer le texte avant l'appel**

Dans `parser.py`, ajouter aux imports :

```python
from ..confidentialite_ia import ModeleNerIndisponible, extraire_coordonnees, nettoyer_texte
```
et après `logger = logging.getLogger(__name__)` :

```python
LONGUEUR_MAX_PARSER = 7000  # tokens Groq : voir commentaire dans parse_with_groq

NOTE_JETONS = (
    "Les informations personnelles du candidat (nom, e-mail, téléphone, adresse, date de "
    "naissance, liens, pièces d'identité) ont été remplacées par des jetons entre crochets "
    "comme [NOM] ou [EMAIL]. Ne les recopie jamais et renvoie null pour les champs "
    "correspondants (nom_complet, telephone, email, linkedin, github, adresse, "
    "date_naissance_raw).\n\n"
)


def _sans_jeton(valeur):
    """Écarte une valeur renvoyée par l'IA qui n'est qu'un jeton de masquage."""
    if valeur is None or re.fullmatch(r"\s*\[[^\]]*\]\s*", str(valeur)):
        return None
    return valeur
```
Modifier la signature et le début de `parse_with_groq` :

Avant :
```python
def parse_with_groq(text):
```
```python
    text_truncated = text[:7000]
```
Après :
```python
def parse_with_groq(text, noms_connus=()):
```
```python
    try:
        nettoye = nettoyer_texte(text, noms_connus=noms_connus)
    except ModeleNerIndisponible:
        logger.error("Parser CV : modèle de détection indisponible, aucun appel IA.")
        return None
    text_truncated = nettoye.texte[:LONGUEUR_MAX_PARSER]
```
Puis le prompt et les appels :

Avant :
```python
    prompt = prompt_source.replace("{cv_text}", text_truncated)
    content = _call_groq(prompt, max_tokens=ai_config.parser_cv_max_tokens)
```
et
```python
        content = _call_groq(prompt, max_tokens=ai_config.parser_cv_max_tokens)
```
Après :
```python
    prompt = NOTE_JETONS + prompt_source.replace("{cv_text}", text_truncated)
    content = _call_groq(prompt, max_tokens=ai_config.parser_cv_max_tokens,
                         donnees_candidat=text_truncated)
```
et
```python
        content = _call_groq(prompt, max_tokens=ai_config.parser_cv_max_tokens,
                             donnees_candidat=text_truncated)
```

- [ ] **Step 5: Remplir les coordonnées en local dans `parse_cv`**

Modifier la signature : `def parse_cv(file_path, file_name):` → `def parse_cv(file_path, file_name, noms_connus=()):` et l'appel `ai_data = parse_with_groq(text)` → `ai_data = parse_with_groq(text, noms_connus=noms_connus)`.

Juste après le bloc `if not ai_data: return {...}` (avant « Normalisation contre le référentiel admin »), ajouter :

```python
    # Coordonnées extraites localement du CV brut : l'IA, qui n'a vu que le texte nettoyé,
    # ne les connaît pas. La valeur locale prime toujours (rattachement au profil dans TafTech).
    coord = extraire_coordonnees(text)
    for cle in ("email", "linkedin", "github", "nom_complet"):
        ai_data[cle] = coord.get(cle) or _sans_jeton(ai_data.get(cle))
    ai_data["telephone"] = _normaliser_telephone(coord["telephone"]) if coord.get("telephone") else None
    ai_data["wilaya"] = ai_data.get("wilaya") or coord.get("wilaya")
    ai_data["date_naissance_raw"] = coord.get("date_naissance_raw") or _sans_jeton(ai_data.get("date_naissance_raw"))
    ai_data["adresse"] = None  # jamais extraite : perdue par construction (le candidat la saisit)
```

- [ ] **Step 6: Passer les noms du compte depuis la vue**

Dans `views/ia.py`, `ParserCVAPIView.post`, remplacer `result = parse_cv(tmp_file.name, cv_name)` par :

```python
            result = parse_cv(
                tmp_file.name, cv_name,
                noms_connus=(request.user.first_name, request.user.last_name),
            )
```

- [ ] **Step 7: Vérifier (nouveaux tests et tests existants du parser)**

Run : `python manage.py test jobs.tests.test_cv_parser_confidentialite jobs.tests.test_cv_parser_json_repair -v 2`
Puis : `python manage.py test jobs.tests.test_ai_config_securite jobs.tests.test_api_groq_throttle`
Expected : `OK`. Corriger toute régression due à `parse_cv` avant de continuer.

- [ ] **Step 8: Mesure de qualité (manuelle, sans stocker de CV)**

Avec 10 CV réels fournis par l'utilisateur (hors dépôt), comparer pour chacun, avant (branche `main`) et après, les champs : titre, nombre d'expériences, nombre de formations, compétences, wilaya, nom, e-mail, téléphone. Consigner **uniquement** un tableau de décomptes et d'écarts dans `docs/journal/` (jamais le contenu d'un CV). Si l'extraction d'expériences/formations baisse sensiblement, le signaler à l'utilisateur avant de poursuivre.

- [ ] **Step 9: Commit**

```bash
git add taftech_backend/jobs/cv_parser taftech_backend/jobs/views/ia.py taftech_backend/jobs/tests/test_cv_parser_confidentialite.py
git commit -m "feat: parser de CV sur texte nettoye, coordonnees extraites localement" -- taftech_backend/jobs/cv_parser taftech_backend/jobs/views/ia.py taftech_backend/jobs/tests/test_cv_parser_confidentialite.py
```

---

### Task 10: Endpoint d'aperçu des données transmises (R5, R9)

**Files:**
- Create: `taftech_backend/jobs/views/ia_apercu.py`
- Modify: `taftech_backend/jobs/views/__init__.py` (près de `ParserCVAPIView`, ligne 101)
- Modify: `taftech_backend/jobs/urls.py` (import ligne 52 ; route près de la ligne 312)
- Modify: `taftech_backend/taftech_backend/settings.py` (`DEFAULT_THROTTLE_RATES`)
- Test: `taftech_backend/jobs/tests/test_apercu_donnees_ia.py`

**Interfaces:**
- Consumes: `nettoyer_texte`, `texte_carriere`, `texte_conseils`, `LONGUEUR_MAX_PARSER`, `extract_text`.
- Produces: `POST jobs/ia/apercu-donnees/` (candidat authentifié) avec `fonction` ∈ `PARSER_CV | ANALYSE_CARRIERE | CONSEILS_DASHBOARD` (+ fichier `cv` optionnel) → `{"fonction", "texte", "categories": {CODE: n}, "libelles": {CODE: libellé}}`. N'appelle jamais l'IA, ne consomme aucun quota.

- [ ] **Step 1: Écrire les tests qui échouent**

```python
"""Aperçu exact des données transmises à l'IA : jamais d'appel IA, aucun quota consommé."""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.confidentialite_ia.construction import texte_carriere
from jobs.models import ProfilCandidat
from jobs.tests.test_api_paliers_gating import make_entreprise
from jobs.views.ia_apercu import ApercuIAThrottle

User = get_user_model()
CV = "Karim BENALI\nkarim.benali@mail.dz\n0555 12 34 56\n\nDéveloppeur Python. " + "x " * 60


class ApercuDonneesIATest(APITestCase):
    def setUp(self):
        self.url = reverse("ia-apercu-donnees")
        self.user = User.objects.create_user(
            username="apercu_c", email="apercu_c@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        self.profil = ProfilCandidat.objects.create(user=self.user, titre_professionnel="Développeur")

    def test_non_authentifie_refuse(self):
        r = self.client.post(self.url, {"fonction": "ANALYSE_CARRIERE"})
        self.assertIn(r.status_code, (401, 403))

    def test_recruteur_refuse(self):
        recruteur, _ = make_entreprise("apercu_r", palier_nom="BUSINESS")
        self.client.force_authenticate(user=recruteur)
        self.assertEqual(self.client.post(self.url, {"fonction": "ANALYSE_CARRIERE"}).status_code, 403)

    def test_fonction_inconnue(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.post(self.url, {"fonction": "AUTRE"}).status_code, 400)

    @patch("jobs.ai_engine.call_ai")
    def test_carriere_montre_exactement_le_texte_envoye(self, mock_ia):
        self.client.force_authenticate(user=self.user)
        r = self.client.post(self.url, {"fonction": "ANALYSE_CARRIERE"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["texte"], texte_carriere(self.profil))
        mock_ia.assert_not_called()

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    @patch("jobs.ai_engine.call_ai")
    @patch("jobs.views.ia_apercu.extract_text", return_value=CV)
    def test_cv_televerse_masque_et_compte(self, _extract, mock_ia):
        self.client.force_authenticate(user=self.user)
        fichier = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        r = self.client.post(self.url, {"fonction": "PARSER_CV", "cv": fichier}, format="multipart")
        self.assertEqual(r.status_code, 200)
        for interdit in ("karim.benali@mail.dz", "0555 12 34 56", "Karim", "BENALI"):
            self.assertNotIn(interdit, r.data["texte"])
        self.assertEqual(r.data["categories"]["EMAIL"], 1)
        self.assertIn("EMAIL", r.data["libelles"])
        mock_ia.assert_not_called()

    def test_parser_sans_cv_400(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.post(self.url, {"fonction": "PARSER_CV"}).status_code, 400)

    def test_extension_refusee(self):
        self.client.force_authenticate(user=self.user)
        fichier = SimpleUploadedFile("cv.exe", b"x")
        r = self.client.post(self.url, {"fonction": "PARSER_CV", "cv": fichier}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_throttle_dedie(self):
        self.assertEqual(ApercuIAThrottle.scope, "apercu_ia")
```

- [ ] **Step 2: Vérifier l'échec**

Run : `python manage.py test jobs.tests.test_apercu_donnees_ia -v 2`
Expected : `NoReverseMatch: 'ia-apercu-donnees'`.

- [ ] **Step 3: Écrire la vue**

`jobs/views/ia_apercu.py` :

```python
"""Aperçu exact des données transmises à l'IA (exigence de l'employeur, 17/10/2026). N'appelle
jamais l'IA et ne consomme aucun quota : le texte renvoyé est calculé par les mêmes fonctions
que celles qui construisent l'envoi réel (nettoyage déterministe)."""
import os
import tempfile

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from ..confidentialite_ia import LIBELLES_CATEGORIES, ModeleNerIndisponible, nettoyer_texte
from ..confidentialite_ia.construction import texte_carriere, texte_conseils
from ..cv_parser.extraction import extract_text
from ..cv_parser.parser import LONGUEUR_MAX_PARSER

TAILLE_MAX_CV = 5 * 1024 * 1024
EXTENSIONS = ('.pdf', '.docx', '.doc')
FONCTIONS = ('PARSER_CV', 'ANALYSE_CARRIERE', 'CONSEILS_DASHBOARD')


class ApercuIAThrottle(UserRateThrottle):
    scope = 'apercu_ia'


def _reponse(fonction, texte, categories):
    return Response({
        'fonction': fonction,
        'texte': texte,
        'categories': dict(categories),
        'libelles': {c: LIBELLES_CATEGORIES.get(c, c) for c in categories},
    })


def _erreur(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'error': message}, status=code)


class ApercuDonneesIAAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    throttle_classes = [ApercuIAThrottle]

    def post(self, request):
        user = request.user
        if user.role != 'CANDIDAT':
            return _erreur('Réservé aux candidats.', status.HTTP_403_FORBIDDEN)
        fonction = request.data.get('fonction')
        if fonction not in FONCTIONS:
            return _erreur('Fonction inconnue.')
        profil = getattr(user, 'profil_candidat', None)
        if profil is None:
            return _erreur('Profil introuvable.', status.HTTP_404_NOT_FOUND)
        if fonction == 'ANALYSE_CARRIERE':
            return _reponse(fonction, texte_carriere(profil), {})
        if fonction == 'CONSEILS_DASHBOARD':
            return _reponse(fonction, texte_conseils(user, profil), {})
        return self._apercu_cv(request, profil)

    def _apercu_cv(self, request, profil):
        user = request.user
        cv_file = request.FILES.get('cv')
        if cv_file:
            if cv_file.size > TAILLE_MAX_CV:
                return _erreur('Fichier trop volumineux (max 5 Mo).')
            nom = cv_file.name
        elif profil.cv_pdf:
            nom = os.path.basename(profil.cv_pdf.name)
        else:
            return _erreur('Aucun CV à analyser.')
        extension = os.path.splitext(nom)[1].lower()
        if extension not in EXTENSIONS:
            return _erreur(f'Format non supporté ({extension}).')

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
        try:
            if cv_file:
                for morceau in cv_file.chunks():
                    tmp.write(morceau)
            else:
                with profil.cv_pdf.open('rb') as f:
                    for morceau in f.chunks():
                        tmp.write(morceau)
            tmp.close()
            texte = extract_text(tmp.name, nom)
        finally:
            tmp.close()
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)
        if not texte or len(texte.strip()) < 50:
            return _erreur("Impossible d'extraire du texte. Le PDF est peut-être scanné (image).")
        try:
            resultat = nettoyer_texte(texte, noms_connus=(user.first_name, user.last_name))
        except ModeleNerIndisponible:
            return _erreur("Le service de confidentialité est momentanément indisponible.",
                           status.HTTP_503_SERVICE_UNAVAILABLE)
        return _reponse('PARSER_CV', resultat.texte[:LONGUEUR_MAX_PARSER], resultat.categories)
```

- [ ] **Step 4: Enregistrer la vue, la route et le débit**

`views/__init__.py` : sous `ParserCVAPIView,` (ligne 101), ajouter l'import `from .ia_apercu import ApercuDonneesIAAPIView` en suivant le motif d'import déjà utilisé dans ce fichier pour `.ia` (ouvrir le fichier pour reproduire exactement ce style et, si le fichier maintient une liste `__all__`, y ajouter le nom).

`urls.py` : ajouter `ApercuDonneesIAAPIView` à l'import `from .views import (...)` (ligne 52, à côté de `ParserCVAPIView`) puis, sous la route `parser-cv/` (ligne 312) :

```python
    path('ia/apercu-donnees/', ApercuDonneesIAAPIView.as_view(), name='ia-apercu-donnees'),
```

`settings.py`, dans `DEFAULT_THROTTLE_RATES`, après `'cv_parser': '10/hour',` :

```python
        'apercu_ia': '60/hour',
```

- [ ] **Step 5: Vérifier**

Run : `python manage.py test jobs.tests.test_apercu_donnees_ia -v 2` puis `python manage.py check`
Expected : `OK`.

- [ ] **Step 6: Commit**

```bash
git add taftech_backend/jobs/views/ia_apercu.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/urls.py taftech_backend/taftech_backend/settings.py taftech_backend/jobs/tests/test_apercu_donnees_ia.py
git commit -m "feat: endpoint d'apercu des donnees transmises a l'IA" -- taftech_backend/jobs/views/ia_apercu.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/urls.py taftech_backend/taftech_backend/settings.py taftech_backend/jobs/tests/test_apercu_donnees_ia.py
```

---

### Task 11: Tests d'architecture (R7, R15)

**Files:**
- Test: `taftech_backend/jobs/tests/test_architecture_ia.py`

- [ ] **Step 1: Écrire les tests**

```python
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
```

- [ ] **Step 2: Lancer**

Run : `python manage.py test jobs.tests.test_architecture_ia -v 2`
Expected : `OK`. Si `test_appelants_de_call_ai_connus` échoue parce qu'un autre fichier appelle `call_ai(`, l'examiner (c'est précisément le but) avant d'étendre la liste.

- [ ] **Step 3: Commit**

```bash
git add taftech_backend/jobs/tests/test_architecture_ia.py
git commit -m "test: garde-fous d'architecture des appels IA et du matching local" -- taftech_backend/jobs/tests/test_architecture_ia.py
```

---

### Task 12: Interface — case verrouillée, bouton « Voir les données transmises », modale (R5, R9)

**Files:**
- Modify: `taftech_frontend/src/Services/iaService.js`
- Create: `taftech_frontend/src/Components/ApercuDonneesIA.jsx`
- Modify: `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepUploadCV.jsx`
- Modify: `taftech_frontend/src/Pages/Candidat/SuggestionsCarriere.jsx` (autour de la ligne 250)
- Modify: `taftech_frontend/src/Pages/Candidat/CandidatDashboard.jsx` (autour de la ligne 677)
- Test: `taftech_frontend/tests/ApercuDonneesIA.test.jsx`

**Interfaces:**
- Consumes: `POST jobs/ia/apercu-donnees/` (Task 10).
- Produces: `<ApercuDonneesIA fonction="PARSER_CV|ANALYSE_CARRIERE|CONSEILS_DASHBOARD" fichier={File|null} />` ; `iaService.getApercuDonneesIA(fonction, fichier)` (exposé aussi via `jobsService` qui étend `iaService`).

- [ ] **Step 1: Écrire le test qui échoue**

`taftech_frontend/tests/ApercuDonneesIA.test.jsx` :

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApercuDonneesIA } from "../src/Components/ApercuDonneesIA";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getApercuDonneesIA: vi.fn() },
}));
vi.mock("../src/utils/errorReporter", () => ({ reportError: vi.fn() }));

const APERCU = {
  fonction: "PARSER_CV",
  texte: "Contact : [EMAIL]\nDéveloppeur Python",
  categories: { EMAIL: 1 },
  libelles: { EMAIL: "adresse e-mail" },
};

describe("ApercuDonneesIA", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche la case de masquage cochée et verrouillée", () => {
    render(<ApercuDonneesIA fonction="PARSER_CV" />);
    const case_ = screen.getByRole("checkbox", { name: /masquer mes informations personnelles/i });
    expect(case_).toBeChecked();
    expect(case_).toBeDisabled();
  });

  it("ouvre la modale avec le texte transmis et les catégories masquées", async () => {
    jobsService.getApercuDonneesIA.mockResolvedValue(APERCU);
    render(<ApercuDonneesIA fonction="PARSER_CV" />);
    fireEvent.click(screen.getByRole("button", { name: /voir les données qui seront transmises/i }));
    await waitFor(() => expect(screen.getByText(/adresse e-mail/i)).toBeInTheDocument());
    expect(screen.getByText(/Développeur Python/)).toBeInTheDocument();
    expect(jobsService.getApercuDonneesIA).toHaveBeenCalledWith("PARSER_CV", null);
  });

  it("transmet le fichier en attente à l'aperçu", async () => {
    jobsService.getApercuDonneesIA.mockResolvedValue(APERCU);
    const fichier = new File(["x"], "cv.pdf", { type: "application/pdf" });
    render(<ApercuDonneesIA fonction="PARSER_CV" fichier={fichier} />);
    fireEvent.click(screen.getByRole("button", { name: /voir les données/i }));
    await waitFor(() => expect(jobsService.getApercuDonneesIA).toHaveBeenCalledWith("PARSER_CV", fichier));
  });

  it("affiche un message si l'aperçu échoue", async () => {
    jobsService.getApercuDonneesIA.mockRejectedValue({ response: { data: { error: "Aucun CV à analyser." } } });
    render(<ApercuDonneesIA fonction="PARSER_CV" />);
    fireEvent.click(screen.getByRole("button", { name: /voir les données/i }));
    await waitFor(() => expect(screen.getByText("Aucun CV à analyser.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run : `cd taftech_frontend; npx vitest run tests/ApercuDonneesIA.test.jsx`
Expected : échec d'import (`ApercuDonneesIA` introuvable).

- [ ] **Step 3: Ajouter la méthode du service**

Dans `iaService.js`, après `parserCV` :

```javascript
  // Aperçu exact du texte qui sera transmis à l'IA (ne consomme aucun quota, n'appelle pas l'IA).
  // `fichier` : CV choisi mais pas encore analysé ; omis, le backend lit le CV du profil.
  getApercuDonneesIA: async (fonction, fichier = null) => {
    try {
      const formData = new FormData();
      formData.append("fonction", fonction);
      if (fichier) formData.append("cv", fichier);
      const response = await api.post("jobs/ia/apercu-donnees/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_APERCU_DONNEES_IA", err);
      throw err;
    }
  },
```

- [ ] **Step 4: Créer le composant**

`taftech_frontend/src/Components/ApercuDonneesIA.jsx` :

```jsx
import React, { useState } from "react";
import { ShieldCheck, Eye, X } from "lucide-react";
import { tw } from "../theme";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";

const JETON = /(\[[A-ZÉÈ_ ]+\])/;

const TexteAvecJetons = ({ texte }) =>
  texte.split(JETON).map((morceau, i) =>
    JETON.test(morceau) ? (
      <mark key={i} className={`px-1 rounded ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
        {morceau}
      </mark>
    ) : (
      <React.Fragment key={i}>{morceau}</React.Fragment>
    ),
  );

export const ApercuDonneesIA = ({ fonction, fichier = null }) => {
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);

  const ouvrir = async () => {
    setOuvert(true);
    setChargement(true);
    setErreur(null);
    setApercu(null);
    try {
      setApercu(await jobsService.getApercuDonneesIA(fonction, fichier));
    } catch (err) {
      reportError("ECHEC_APERCU_DONNEES_IA_COMPOSANT", err);
      setErreur(err.response?.data?.error || "Impossible d'afficher l'aperçu pour le moment.");
    } finally {
      setChargement(false);
    }
  };

  const categories = apercu ? Object.entries(apercu.categories || {}) : [];

  return (
    <div className="text-left">
      <label className={`flex items-center gap-2 text-sm ${tw.textStrong}`}>
        <input
          type="checkbox"
          checked
          disabled
          readOnly
          aria-label="Masquer mes informations personnelles avant l'analyse IA"
        />
        <ShieldCheck size={16} className={tw.textSuccess} />
        Masquer mes informations personnelles avant l'analyse IA
      </label>
      <p className={`text-xs ${tw.textMuted} mt-1 mb-2`}>
        Ce masquage est toujours appliqué : votre nom, vos coordonnées et vos pièces d'identité ne sont jamais transmis.
      </p>
      <button type="button" onClick={ouvrir} className={`${tw.linkPrimary} text-sm font-semibold flex items-center gap-1`}>
        <Eye size={14} /> Voir les données qui seront transmises
      </button>

      {ouvert && (
        <div className={tw.modalOverlay} role="dialog" aria-modal="true" aria-label="Données transmises à l'IA">
          <div className={`${tw.modalPanel} w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6`}>
            <div className="flex items-start justify-between mb-4">
              <h3 className={tw.sectionHeading}>Données qui seront transmises à l'IA</h3>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className={`p-1 rounded ${tw.modalCloseButton}`}>
                <X size={18} />
              </button>
            </div>
            {chargement && <p className={`text-sm ${tw.textMuted}`}>Préparation de l'aperçu…</p>}
            {erreur && <p className={`text-sm ${tw.textDanger}`}>{erreur}</p>}
            {apercu && (
              <>
                <p className={`text-sm ${tw.bodyText} mb-2`}>
                  {categories.length === 0
                    ? "Aucune information personnelle n'a été détectée dans ce texte."
                    : "Informations masquées :"}
                </p>
                {categories.length > 0 && (
                  <ul className={`text-sm ${tw.textStrong} mb-4 list-disc pl-5`}>
                    {categories.map(([code, nombre]) => (
                      <li key={code}>
                        {nombre} × {apercu.libelles?.[code] || code}
                      </li>
                    ))}
                  </ul>
                )}
                <pre className={`text-xs whitespace-pre-wrap break-words ${tw.textStrong}`}>
                  <TexteAvecJetons texte={apercu.texte} />
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```
Vérifier dans `theme.js` que `tw.textDanger`, `tw.bgPrimarySoft`, `tw.textPrimaryStrong`, `tw.linkPrimary`, `tw.textSuccess` existent (`Grep "textDanger" src/theme.js`) ; si `textDanger` n'existe pas, utiliser le token d'erreur de texte déjà défini dans `theme.js` (jamais une classe de couleur en dur).

- [ ] **Step 5: Vérifier que les tests du composant passent**

Run : `npx vitest run tests/ApercuDonneesIA.test.jsx`
Expected : 4 tests verts.

- [ ] **Step 6: Intégrer au parcours d'import du CV (le candidat choisit, voit, puis lance)**

Dans `StepUploadCV.jsx`, ajouter `useState` à l'import React et l'import du composant :

```jsx
import React, { useRef, useState } from "react";
import { ApercuDonneesIA } from "../../../../Components/ApercuDonneesIA";
```
Dans le composant, après `const inputRef = useRef(null);` :

```jsx
  const [fichierEnAttente, setFichierEnAttente] = useState(null);
```
Remplacer `onChange` :

Avant :
```jsx
    if (file) uploadCV(file);
```
Après :
```jsx
    if (file) setFichierEnAttente(file); // l'analyse démarre au clic sur « Analyser mon CV »
```
Avant le bouton « Analyser ce CV » existant (bloc `{profil?.cv_pdf && ( <button ... onClick={() => uploadCV(null)}`), ajouter dans un `<div className="mb-4">` : `<ApercuDonneesIA fonction="PARSER_CV" />`. Puis, juste avant la `div` de la dropzone (`<div className={`rounded-xl p-10 ...`}>`), ajouter :

```jsx
      {fichierEnAttente && (
        <div className="mb-4 space-y-3 text-left">
          <p className={`text-sm font-semibold truncate ${tw.textStrong}`}>{fichierEnAttente.name}</p>
          <ApercuDonneesIA fonction="PARSER_CV" fichier={fichierEnAttente} />
          <button
            type="button"
            onClick={() => uploadCV(fichierEnAttente)}
            disabled={parserLoading || quotaParserCV?.disponible === false}
            className={`${tw.buttonPrimary} w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60`}
          >
            <Sparkles size={16} /> Analyser mon CV
          </button>
        </div>
      )}
```

- [ ] **Step 7: Intégrer aux deux fonctions candidat**

`SuggestionsCarriere.jsx` : importer `import { ApercuDonneesIA } from "../../Components/ApercuDonneesIA";` ; ouvrir le fichier autour de la ligne 250 et insérer, immédiatement avant l'élément `<button ... onClick={handleAnalyseIA}`, un `<div className="mb-3"><ApercuDonneesIA fonction="ANALYSE_CARRIERE" /></div>`.

`CandidatDashboard.jsx` : même import ; ouvrir le fichier autour de la ligne 677 et insérer avant l'élément `<button ... onClick={handleGenererConseils}` : `<div className="mb-3"><ApercuDonneesIA fonction="CONSEILS_DASHBOARD" /></div>`.

- [ ] **Step 8: Adapter les tests existants touchés**

Run : `Grep "StepUploadCV|uploadCV" taftech_frontend/tests` pour trouver les tests concernés. Un test qui vérifie « choisir un fichier lance `uploadCV` immédiatement » doit devenir : choisir un fichier → `uploadCV` **pas** appelé → clic sur « Analyser mon CV » → `uploadCV(fichier)` appelé. Ajouter dans le mock du test `jobsService.getApercuDonneesIA: vi.fn()` partout où `StepUploadCV`, `SuggestionsCarriere` ou `CandidatDashboard` sont rendus (règle du projet : tout nouvel appel `jobsService.*` doit figurer dans les mocks).

- [ ] **Step 9: Lancer toute la suite front et le build**

Run : `npx vitest run` puis `npm run build`
Expected : tous les tests verts, build sans erreur.

- [ ] **Step 10: Commit**

```bash
git add taftech_frontend/src/Services/iaService.js taftech_frontend/src/Components/ApercuDonneesIA.jsx taftech_frontend/src/Pages/Candidat taftech_frontend/tests
git commit -m "feat(frontend): case de masquage verrouillee et apercu des donnees transmises a l'IA" -- taftech_frontend/src/Services/iaService.js taftech_frontend/src/Components/ApercuDonneesIA.jsx taftech_frontend/src/Pages/Candidat taftech_frontend/tests
```

---

### Task 13: Documentation et vérification finale (R1 à R17)

**Files:**
- Modify: `SECURITY.md` (nouvelle §31), `CLAUDE.md`, `docs/fonctionnel/parser-cv-ia.md`, `docs/architecture/carte-du-code.md`, `docs/securite-synthese.md`
- Create: `docs/journal/2026-10-17-pseudonymisation-ia.md`
- Modify: `docs/superpowers/specs/2026-10-17-pseudonymisation-ia-design.md` (statut)

- [ ] **Step 1: SECURITY.md §31**

Ajouter après la §30 une section « 31. Pseudonymisation des données candidat avant appel IA » contenant : le périmètre (parser de CV, agent de classification métier, classification diplômes/spécialités, analyse carrière, conseils, analyse recruteur ; hors périmètre : génération d'offre, matching local) ; le mécanisme (nettoyage déterministe motifs + spaCy + noms du compte, échec fermé, filet `call_ai(donnees_candidat=)`) ; l'analyse recruteur par jeton `CANDIDAT_xxx` ; employeurs en « Entreprise A/B » + domaine du métier, établissements retirés ; le ZDR Groq « Inference APIs » activé le 17/10/2026 ; **l'incident** : ancienne clé Groq présente dans l'historique git (commit `9b04392`), révoquée et remplacée ; les limites (une pseudonymisation n'est pas une anonymisation au sens de la loi 18-07 ; noms rares non reconnus ; texte libre pouvant ré-identifier) ; le résultat de l'audit des routes (`ApercuDonneesIAAPIView` : `IsAuthenticated`, rôle `CANDIDAT`, périmètre = l'utilisateur lui-même, throttle `apercu_ia`).

- [ ] **Step 2: CLAUDE.md**

Dans « Règles critiques », ajouter : « Données candidat envoyées à l'IA : tout nouvel appel à `call_ai` doit nettoyer ses données par `jobs/confidentialite_ia/` et passer `donnees_candidat=` ; jamais de nom, e-mail, téléphone, adresse, date de naissance, pièce d'identité, URL personnelle, employeur ni établissement dans un prompt ; le masquage n'est pas désactivable ; le matching ne doit jamais appeler l'IA (test d'architecture). » Dans l'en-tête « Session du 17/10/2026 », résumer le chantier avec lien vers la spec, le plan et SECURITY.md §31. Ajouter dans l'index par chantier une ligne vers `docs/fonctionnel/parser-cv-ia.md` (à lire avant de toucher au nettoyage des données candidat).

- [ ] **Step 3: Documentation fonctionnelle et carte du code**

`docs/fonctionnel/parser-cv-ia.md` : section « Confidentialité avant appel IA » (flux, champs extraits localement, champs perdus comme `adresse`, `NOTE_JETONS`, mesure de qualité du Task 9). `docs/architecture/carte-du-code.md` : entrée pour `jobs/confidentialite_ia/` (un fichier par responsabilité). `docs/securite-synthese.md` : ligne « Pseudonymisation avant appel IA ✅ ». `docs/journal/2026-10-17-pseudonymisation-ia.md` : journal de session (décisions : Presidio écarté et pourquoi, masquage non décochable, employeurs → « Entreprise A/B », découverte des appels de `referentiel_utils.py`, incident clé Groq).

- [ ] **Step 4: Statut de la spec**

Dans la spec, passer le statut en « implémenté le 17/10/2026 » et cocher, dans §12, chaque exigence R1 à R17 avec le fichier/test qui la couvre (tableau de couverture ci-dessous).

- [ ] **Step 5: Vérification complète**

```powershell
cd taftech_backend
python manage.py check
python manage.py test jobs
cd ../taftech_frontend
npx vitest run
npm run build
```
Expected : `check` sans erreur ; tous les tests backend et frontend verts ; build réussi. Tout échec : le corriger avant de déclarer le chantier terminé (aucun test ne doit être affaibli).

- [ ] **Step 6: Revue de sécurité**

Lancer l'agent `ecc:security-reviewer` sur le diff du chantier (`jobs/confidentialite_ia/`, `views/ia.py`, `views/ia_apercu.py`, `ai_engine.py`, `cv_parser/`) : logs sans contenu candidat, échec fermé, route d'aperçu cloisonnée, aucune fuite via les messages d'erreur. Traiter tout point CRITIQUE ou HAUT.

- [ ] **Step 7: Commit**

```bash
git add SECURITY.md CLAUDE.md docs
git commit -m "docs: pseudonymisation des donnees candidat avant appel IA (SECURITY 31, journal, cartes)" -- SECURITY.md CLAUDE.md docs
```

---

## Couverture des exigences (spec §12)

- **R1** Groq et modèle conservés : aucune modification de `AIConfig` ni du fournisseur ; Task 5 vérifie que `test_ai_engine` reste vert.
- **R2** CV brut jamais envoyé : Tasks 2, 3, 9 ; test de non-fuite `test_prompt_sans_donnees_personnelles`.
- **R3** Workflow complet : Tasks 2 à 10.
- **R4** Détection des 9 types : Task 2 (un test par type), Task 3 (noms, lieux), photo : jamais envoyée (texte seulement).
- **R5** Case et bouton : Task 12 (case verrouillée, bouton, modale). Écart validé : non décochable.
- **R6** Même mécanisme partout : Tasks 5 à 9 ; `donnees_candidat` sur chaque appelant.
- **R7** Matching local : Task 11 (`test_matching_sans_appel_ia`).
- **R8** ZDR : phase 0 faite le 17/10/2026 ; consignée Task 13 (SECURITY.md §31).
- **R9** Candidat voit masqué et transmis : Tasks 10 et 12.
- **R10** Analyse recruteur : Task 6 (jeton `CANDIDAT_xxx`, rattachement local).
- **R11** Analyse carrière : Task 7 (« Entreprise A/B » + domaine du métier ; écart assumé, secteur réel hors modèle).
- **R12** Classification métiers : Task 8 (`domaine_agent.py`).
- **R13** Classification diplômes/spécialités : Task 8 (`referentiel_utils.py`).
- **R14** Conseils : Task 7 (effectifs par statut, diplôme du référentiel).
- **R15** Génération d'offre inchangée : Task 11 (`test_generation_d_offre_ne_recoit_aucune_donnee_candidat`).
- **R16** Clé Groq côté serveur : vérifié le 17/10/2026 ; incident traité ; consigné Task 13.
- **R17** Objectif global : Tasks 9 (coordonnées extraites localement, rattachées au profil) et 6 (résultat rattaché à la candidature).
