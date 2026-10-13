# Mise en conformité matching + recherche avec le référentiel v2 client — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner `jobs/matcher.py` (score de matching) et `CVThequeView` (recherche de candidats) sur les règles exactes des onglets `REGLES_MATCHING`/`PARAM_MATCHING`/`REGLES_FORMATION` des classeurs `TAFTECH_Metiers_Matching_v2.xlsx` et `TAFTECH_Diplomes_Specialites_Algerie_v2.xlsx`, en corrigeant les écarts trouvés lors de la vérification (métier/spécialité inversés, bonus non prévu, poids figés au lieu de dynamiques, expérience/région non conformes à S04/S09).

**Architecture:** Le score de matching passe d'un total fixe sur 100 points (20/20/25/20/15 toujours sommés) à une formule à poids actifs (S01/S02) : chaque critère non demandé par l'offre est exclu du dénominateur `W`, et le score est renormalisé sur les critères réellement évalués. Le critère "spécialité" (25%) redevient la spécialité de formation (`SpecialiteFormation`, couplée au diplôme sur une même `FormationCandidat`, formule S07), et non plus le métier/poste — le métier (`Metier`) reste utilisé uniquement pour juger la pertinence d'une expérience (S09, déjà en place) et pour la recherche de candidats. Les poids sont lus depuis `ParametreMatching` (déjà importé en base, jamais branché) au lieu d'être codés en dur.

**Tech Stack:** Django 5.2 / DRF, tests `django.test.TestCase` + `APIClient`, React/Vite côté frontend pour les 5 labels de critères.

## Global Constraints

- Poids de référence (source `PARAM_MATCHING`, à lire depuis le modèle `ParametreMatching`, jamais recoder en dur une 2ᵉ fois) : région=0.20, diplôme=0.20, spécialité=0.25, expérience=0.20, compétences=0.15.
- **S01/S02** : `W = Σ poids_actif_i` (uniquement les critères réellement demandés par l'offre) ; `score_total = 100 × Σ(poids_actif_i × score_i) / W` ; si `W == 0`, retourner un score `None` explicite (jamais 0 ni 100).
- **S03** : distinguer 3 états par critère actif — `incompatible` (connu, ne correspond pas → contribue 0, compte dans la couverture comme "connu"), `absent` (donnée candidate inconnue → contribue 0, compte comme "manquant"), `non_demande` (poids_actif=0, exclu de `W` et de la couverture).
- **S04** : `score_region ∈ {0, 1}` strictement binaire — 1 si même wilaya OU mobilité compatible, 0 sinon. La granularité commune/wilaya/région reste uniquement dans le texte de l'explication affichée au recruteur/candidat, jamais dans le score.
- **S06** : `score_specialite ∈ {0, 1}` strictement — aucun bonus intermédiaire pour "même domaine"/"même groupe".
- **S07** : pour chaque `FormationCandidat` du profil, calculer `wd×sd(f) + ws×ss(f)` où `sd(f)`/`ss(f)` sont évalués sur la **même** ligne de formation (jamais diplôme d'une formation + spécialité d'une autre) ; retenir la formation qui maximise ce total.
- **S09** : `score_experience = min(mois_pertinents / mois_minimum, 1)` — formule continue, plus de paliers discrets. Si `mois_minimum == 0` → critère expérience **désactivé** (poids_actif=0), pas de crédit automatique.
- **S10** : le score compétences n'est calculé que si l'offre a au moins une `CompetenceOffre` sélectionnée ; sinon critère désactivé (poids_actif=0) — le repli texte libre (`competences_score()`) sort du calcul du score total (il peut rester utilisé ailleurs, ex. recherche, mais plus dans `_calculer_score_algo`).
- Ne jamais utiliser nom/sexe/âge/photo/situation familiale dans le score (S13, déjà respecté — ne pas régresser).
- Le déclenchement `AskUserQuestion` a déjà tranché : région binaire strict, poids dynamiques avec renormalisation — pas de retour en arrière sans redemander à l'utilisateur.
- Toute contribution positive au score doit être accompagnée d'une explication texte dans `explications[...]` (S14) — ne jamais retirer ce comportement déjà en place.

---

### Task 1 : `jobs/matching_params.py` — poids lus depuis `ParametreMatching`

**Contexte** : le modèle `ParametreMatching` existe et est peuplé (12 lignes de `PARAM_MATCHING`) depuis l'import du 17/09/2026, mais son propre docstring dit "consommé par matcher.py... une fois la Phase 4 branchée" — jamais fait. Les poids sont actuellement codés en dur dans `matcher.py` (`_POIDS_CRITERES`).

**Files:**
- Create: `taftech_backend/jobs/matching_params.py`
- Test: `taftech_backend/jobs/tests/test_matching_params.py`

**Interfaces:**
- Produces: `get_parametres_matching() -> dict` avec les clés `poids_region`, `poids_diplome`, `poids_specialite`, `poids_experience`, `poids_competences` (float), `formation_en_cours_admise` (bool), `tolerance_faute_min_lettres` (int), `algorithme_version` (str). Repli sur les valeurs par défaut ci-dessus (Global Constraints) si `ParametreMatching` est vide (base de test sans import, ou une clé manquante).

- [ ] **Step 1: Write the failing test**

```python
# taftech_backend/jobs/tests/test_matching_params.py
from django.test import TestCase
from django.core.cache import cache
from jobs.models import ParametreMatching
from jobs.matching_params import get_parametres_matching


class ParametresMatchingTest(TestCase):
    def setUp(self):
        cache.clear()
        ParametreMatching.objects.all().delete()

    def test_valeurs_par_defaut_si_table_vide(self):
        params = get_parametres_matching()
        self.assertAlmostEqual(params["poids_region"], 0.20)
        self.assertAlmostEqual(params["poids_diplome"], 0.20)
        self.assertAlmostEqual(params["poids_specialite"], 0.25)
        self.assertAlmostEqual(params["poids_experience"], 0.20)
        self.assertAlmostEqual(params["poids_competences"], 0.15)
        self.assertFalse(params["formation_en_cours_admise"])
        self.assertEqual(params["algorithme_version"], "matching-20-20-25-20-15-v2")

    def test_valeurs_lues_depuis_la_table(self):
        ParametreMatching.objects.create(cle="poids_region", valeur="0.30", type_valeur="fraction")
        ParametreMatching.objects.create(cle="formation_en_cours_admise", valeur="1", type_valeur="booleen")
        params = get_parametres_matching()
        self.assertAlmostEqual(params["poids_region"], 0.30)
        self.assertTrue(params["formation_en_cours_admise"])
        # Les autres poids restent sur leur défaut si non présents en base
        self.assertAlmostEqual(params["poids_diplome"], 0.20)

    def test_cache_invalide_apres_ecriture(self):
        get_parametres_matching()  # premier appel, met en cache
        ParametreMatching.objects.create(cle="poids_region", valeur="0.99", type_valeur="fraction")
        cache.clear()
        params = get_parametres_matching()
        self.assertAlmostEqual(params["poids_region"], 0.99)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_matching_params -v 2`
Expected: FAIL — `ModuleNotFoundError: No module named 'jobs.matching_params'`

- [ ] **Step 3: Write minimal implementation**

```python
# taftech_backend/jobs/matching_params.py
from django.core.cache import cache

_CACHE_KEY = "jobs_parametres_matching"
_CACHE_TTL = 3600

_DEFAUTS = {
    "poids_region": 0.20,
    "poids_diplome": 0.20,
    "poids_specialite": 0.25,
    "poids_experience": 0.20,
    "poids_competences": 0.15,
    "formation_en_cours_admise": False,
    "tolerance_faute_min_lettres": 5,
    "algorithme_version": "matching-20-20-25-20-15-v2",
}

_BOOLEENS = {"formation_en_cours_admise", "expansion_semantique_active", "rejet_score_automatique"}
_ENTIERS = {"tolerance_faute_min_lettres"}
_TEXTES = {"algorithme_version", "normalisation_version"}


def _convertir(cle, valeur_brute):
    if cle in _BOOLEENS:
        return str(valeur_brute).strip() in ("1", "true", "True")
    if cle in _ENTIERS:
        try:
            return int(valeur_brute)
        except (TypeError, ValueError):
            return _DEFAUTS.get(cle)
    if cle in _TEXTES:
        return str(valeur_brute)
    try:
        return float(valeur_brute)
    except (TypeError, ValueError):
        return _DEFAUTS.get(cle)


def get_parametres_matching():
    """Poids et paramètres de matching (PARAM_MATCHING) — lus depuis `ParametreMatching`,
    repli sur les valeurs par défaut si la table est vide ou incomplète. Caché 1h, invalidé
    manuellement (cache.clear()) par l'admin qui modifierait ces lignes (pas d'UI d'édition
    prévue dans ce plan — modification uniquement via le réimport ou le shell Django)."""
    cached = cache.get(_CACHE_KEY)
    if cached is not None:
        return cached
    from .models import ParametreMatching
    params = dict(_DEFAUTS)
    for row in ParametreMatching.objects.all():
        if row.cle in params or row.cle in _BOOLEENS or row.cle in _ENTIERS or row.cle in _TEXTES:
            params[row.cle] = _convertir(row.cle, row.valeur)
    cache.set(_CACHE_KEY, params, _CACHE_TTL)
    return params
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_matching_params -v 2`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/matching_params.py taftech_backend/jobs/tests/test_matching_params.py
git commit -m "feat: lecture des poids de matching depuis ParametreMatching (PARAM_MATCHING)"
```

---

### Task 2 : Formule à poids actifs (S01/S02/S03) — squelette générique dans `matcher.py`

**Files:**
- Modify: `taftech_backend/jobs/matcher.py`
- Test: `taftech_backend/jobs/tests/test_matcher_poids_actifs.py`

**Interfaces:**
- Consumes: `get_parametres_matching()` (Task 1).
- Produces: `_composer_score(contributions: dict[str, dict]) -> dict` où chaque valeur de `contributions` est soit `None` (critère non demandé, exclu), soit `{"poids": float, "score": float 0..1, "connu": bool}`. Retourne `{"total": float|None, "completude": float, "criteres_manquants": list[str], "criteres_non_demandes": list[str]}`. Cette fonction sera appelée par `_calculer_score_algo` (Task 3-6) une fois chaque critère individuellement recalculé selon S04/S07/S09/S10.

- [ ] **Step 1: Write the failing test**

```python
# taftech_backend/jobs/tests/test_matcher_poids_actifs.py
from django.test import TestCase
from jobs.matcher import _composer_score


class ComposerScoreTest(TestCase):
    def test_tous_criteres_actifs_et_parfaits(self):
        contributions = {
            "region": {"poids": 0.20, "score": 1.0, "connu": True},
            "diplome": {"poids": 0.20, "score": 1.0, "connu": True},
            "specialite": {"poids": 0.25, "score": 1.0, "connu": True},
            "experience": {"poids": 0.20, "score": 1.0, "connu": True},
            "competences": {"poids": 0.15, "score": 1.0, "connu": True},
        }
        result = _composer_score(contributions)
        self.assertAlmostEqual(result["total"], 100.0)
        self.assertAlmostEqual(result["completude"], 1.0)
        self.assertEqual(result["criteres_manquants"], [])

    def test_critere_non_demande_exclu_du_denominateur(self):
        # T14 : diplôme non demandé par l'offre -> exclu, pas de pénalité, pas de bonus
        contributions = {
            "region": {"poids": 0.20, "score": 1.0, "connu": True},
            "diplome": None,
            "specialite": {"poids": 0.25, "score": 1.0, "connu": True},
            "experience": {"poids": 0.20, "score": 1.0, "connu": True},
            "competences": {"poids": 0.15, "score": 1.0, "connu": True},
        }
        result = _composer_score(contributions)
        # W = 0.20+0.25+0.20+0.15 = 0.80, tous les scores=1 -> 100%
        self.assertAlmostEqual(result["total"], 100.0)
        self.assertEqual(result["criteres_non_demandes"], ["diplome"])

    def test_donnee_manquante_compte_dans_la_couverture_pas_dans_incompatible(self):
        # S03 : absent (connu=False) != incompatible (connu=True, score=0)
        contributions = {
            "region": {"poids": 0.20, "score": 0.0, "connu": True},  # incompatible déclaré
            "diplome": {"poids": 0.20, "score": 0.0, "connu": False},  # absent
            "specialite": {"poids": 0.25, "score": 1.0, "connu": True},
            "experience": {"poids": 0.20, "score": 1.0, "connu": True},
            "competences": {"poids": 0.15, "score": 1.0, "connu": True},
        }
        result = _composer_score(contributions)
        # couverture = (0.20*1 + 0.25*1 + 0.20*1 + 0.15*1) / 1.0 = 0.80 (diplome absent seul compte manquant)
        self.assertAlmostEqual(result["completude"], 0.80)
        self.assertEqual(result["criteres_manquants"], ["diplome"])

    def test_aucun_critere_actif_retourne_score_none(self):
        contributions = {k: None for k in ["region", "diplome", "specialite", "experience", "competences"]}
        result = _composer_score(contributions)
        self.assertIsNone(result["total"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_matcher_poids_actifs -v 2`
Expected: FAIL — `ImportError: cannot import name '_composer_score'`

- [ ] **Step 3: Write minimal implementation**

Ajouter dans `taftech_backend/jobs/matcher.py`, avant `_calculer_score_algo` :

```python
def _composer_score(contributions):
    """S01/S02/S03 — formule à poids actifs. `contributions` : dict critère -> None
    (non demandé, exclu) ou {"poids", "score" (0..1), "connu" (bool)}."""
    actifs = {k: v for k, v in contributions.items() if v is not None}
    non_demandes = sorted(k for k, v in contributions.items() if v is None)
    W = sum(v["poids"] for v in actifs.values())
    if W <= 0:
        return {
            "total": None,
            "completude": 0.0,
            "criteres_manquants": [],
            "criteres_non_demandes": non_demandes,
        }
    total = 100.0 * sum(v["poids"] * v["score"] for v in actifs.values()) / W
    manquants = sorted(k for k, v in actifs.items() if not v["connu"])
    couverture = sum(v["poids"] for k, v in actifs.items() if v["connu"]) / W
    return {
        "total": round(min(total, 100.0), 2),
        "completude": round(couverture, 2),
        "criteres_manquants": manquants,
        "criteres_non_demandes": non_demandes,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_matcher_poids_actifs -v 2`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/matcher.py taftech_backend/jobs/tests/test_matcher_poids_actifs.py
git commit -m "feat: formule de score a poids actifs (S01-S03) - squelette generique"
```

---

### Task 3 : Région binaire (S04)

**Files:**
- Modify: `taftech_backend/jobs/matcher.py` (remplacer le bloc `# 2. LOCALISATION` de `_calculer_score_algo`)
- Test: `taftech_backend/jobs/tests/test_matcher_region_binaire.py`

**Interfaces:**
- Produces: fonction `_score_region(profil, offre) -> dict|None` (même forme de contribution que Task 2 : `None` si non demandé — dans ce plan, région est toujours demandée car `OffreEmploi.wilaya` est un champ obligatoire, donc cette fonction ne retourne jamais `None` ; gardée pour homogénéité et pour une future extension télétravail).

- [ ] **Step 1: Write the failing test**

```python
# taftech_backend/jobs/tests/test_matcher_region_binaire.py
from unittest.mock import Mock
from django.test import TestCase
from jobs.matcher import _score_region


class ScoreRegionBinaireTest(TestCase):
    def test_meme_wilaya_score_1(self):
        profil = Mock(wilaya="31 - Oran", commune="Oran", mobilite="AUCUNE")
        offre = Mock(wilaya="31 - Oran")
        contrib = _score_region(profil, offre)
        self.assertEqual(contrib["score"], 1.0)
        self.assertTrue(contrib["connu"])

    def test_mobilite_nationale_score_1_meme_si_wilaya_differente(self):
        profil = Mock(wilaya="31 - Oran", commune="Oran", mobilite="NATIONALE")
        offre = Mock(wilaya="16 - Alger")
        contrib = _score_region(profil, offre)
        self.assertEqual(contrib["score"], 1.0)

    def test_incompatibilite_declaree_score_0_et_connu(self):
        # EX-06 SIMULATIONS : mobilité incompatible explicitement déclarée -> 0, mais connu=True
        profil = Mock(wilaya="31 - Oran", commune="Oran", mobilite="AUCUNE")
        offre = Mock(wilaya="16 - Alger")
        contrib = _score_region(profil, offre)
        self.assertEqual(contrib["score"], 0.0)
        self.assertTrue(contrib["connu"])

    def test_wilaya_candidat_absente_est_donnee_manquante(self):
        profil = Mock(wilaya="", commune="", mobilite="AUCUNE")
        offre = Mock(wilaya="16 - Alger")
        contrib = _score_region(profil, offre)
        self.assertEqual(contrib["score"], 0.0)
        self.assertFalse(contrib["connu"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_matcher_region_binaire -v 2`
Expected: FAIL — `ImportError: cannot import name '_score_region'`

- [ ] **Step 3: Write minimal implementation**

```python
def _score_region(profil, offre):
    """S04 — binaire strict : 1 si même wilaya OU mobilité compatible, 0 si incompatibilité
    déclarée. `connu=False` seulement si la wilaya du candidat est totalement absente (donnée
    manquante) — une incompatibilité déclarée reste "connue" (S03)."""
    wilaya_c = normaliser(getattr(profil, "wilaya", None))
    wilaya_o = normaliser(getattr(offre, "wilaya", None))
    if not wilaya_c:
        return {"score": 0.0, "connu": False}
    if wilaya_c == wilaya_o:
        return {"score": 1.0, "connu": True}
    mobilite = getattr(profil, "mobilite", None)
    if mobilite == "NATIONALE":
        return {"score": 1.0, "connu": True}
    if mobilite == "REGIONALE" and _meme_region(wilaya_c, wilaya_o):
        return {"score": 1.0, "connu": True}
    return {"score": 0.0, "connu": True}
```

Note d'implémentation pour l'intégration finale (Task 7) : conserver le texte d'explication détaillé actuel (commune/wilaya/région voisine) dans `explications["region"]`, calculé séparément de `contrib["score"]` — le score devient binaire, le texte affiché au recruteur garde sa nuance.

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_matcher_region_binaire -v 2`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/matcher.py taftech_backend/jobs/tests/test_matcher_region_binaire.py
git commit -m "feat: score region binaire strict (S04)"
```

---

### Task 4 : Diplôme + Spécialité séparés, formule S07 par formation

**Contexte** : c'est le changement le plus important trouvé en vérification. Aujourd'hui, `matcher.py` fusionne diplôme+spécialité-formation en un seul bucket "diplôme" (max 20 pts, couple exact=20, diplôme seul=12). Le référentiel veut **deux poids indépendants** (diplôme=0.20, spécialité=0.25) calculés `wd×sd(f) + ws×ss(f)` sur la formation qui maximise ce total (S07), jamais en mélangeant le diplôme d'une formation avec la spécialité d'une autre (T10).

**Files:**
- Modify: `taftech_backend/jobs/matcher.py`
- Test: `taftech_backend/jobs/tests/test_matcher_diplome_specialite_s07.py`

**Interfaces:**
- Produces: `_score_diplome_specialite(profil, offre) -> tuple[dict|None, dict|None, FormationCandidat|None]` — retourne `(contrib_diplome, contrib_specialite, formation_retenue)`. Les deux contributions sont `None` ensemble si l'offre n'a aucun `OffreDiplomeAccepte` (critères non demandés — repli documenté ci-dessous).

- [ ] **Step 1: Write the failing test**

```python
# taftech_backend/jobs/tests/test_matcher_diplome_specialite_s07.py
from django.test import TestCase
from jobs.models import (
    CustomUser, ProfilCandidat, FormationCandidat, TypeDiplome, DomaineFormation,
    SpecialiteFormation, DiplomeSpecialite, OffreEmploi, OffreDiplomeAccepte, ProfilEntreprise,
)
from jobs.matcher import _score_diplome_specialite


class ScoreDiplomeSpecialiteS07Test(TestCase):
    def setUp(self):
        self.d_master = TypeDiplome.objects.create(code="D-MAS-T7", libelle="Master", systeme="universitaire")
        self.d_licence = TypeDiplome.objects.create(code="D-LIC-T7", libelle="Licence", systeme="universitaire")
        self.domaine = DomaineFormation.objects.create(code="DOM-T7", libelle="Sciences", systeme="universitaire")
        self.spec_info = SpecialiteFormation.objects.create(
            code="SPE-INFO-T7", domaine=self.domaine, libelle="Informatique", cle_recherche="informatique")
        self.spec_finance = SpecialiteFormation.objects.create(
            code="SPE-FIN-T7", domaine=self.domaine, libelle="Finance", cle_recherche="finance")
        self.couple_master_info = DiplomeSpecialite.objects.create(
            code="LIEN-T7-1", diplome=self.d_master, specialite=self.spec_info)

        user = CustomUser.objects.create_user(email="cand_t7@test.com", password="x", role="CANDIDAT")
        self.profil = ProfilCandidat.objects.create(user=user)

        entreprise_user = CustomUser.objects.create_user(email="rec_t7@test.com", password="x", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(user=entreprise_user, nom_entreprise="ACME T7", est_approuvee=True)
        self.offre = OffreEmploi.objects.create(
            entreprise=entreprise, titre="Dev", wilaya="31 - Oran", description="x")
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_master_info)

    def test_couple_exact_sur_meme_formation_score_plein(self):
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master Informatique", statut="OBTENU",
            diplome_ref=self.d_master, specialite_ref=self.spec_info)
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_d["score"], 1.0)
        self.assertEqual(contrib_s["score"], 1.0)
        self.assertEqual(formation.specialite_ref_id, self.spec_info.id)

    def test_pas_de_fabrication_cross_formation_T10(self):
        # T10 : master finance obtenu + licence informatique obtenue, offre = master informatique
        # -> ne JAMAIS combiner master (formation A) + informatique (formation B)
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master Finance", statut="OBTENU",
            diplome_ref=self.d_master, specialite_ref=self.spec_finance)
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Licence Informatique", statut="OBTENU",
            diplome_ref=self.d_licence, specialite_ref=self.spec_info)
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        # Meilleure formation = licence-informatique (specialite seule, ws=0.25 > diplome seul wd=0.20)
        self.assertEqual(contrib_d["score"], 0.0)
        self.assertEqual(contrib_s["score"], 1.0)
        self.assertEqual(formation.specialite_ref_id, self.spec_info.id)

    def test_formation_en_cours_non_admissible_par_defaut_S08(self):
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master Informatique", statut="EN_COURS",
            diplome_ref=self.d_master, specialite_ref=self.spec_info)
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_d["score"], 0.0)
        self.assertEqual(contrib_s["score"], 0.0)
        self.assertIsNone(formation)

    def test_aucune_formation_obtenue_est_donnee_manquante(self):
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertFalse(contrib_d["connu"])
        self.assertFalse(contrib_s["connu"])

    def test_offre_sans_couple_accepte_criteres_non_demandes(self):
        self.offre.diplomes_acceptes.all().delete()
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertIsNone(contrib_d)
        self.assertIsNone(contrib_s)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_matcher_diplome_specialite_s07 -v 2`
Expected: FAIL — `ImportError: cannot import name '_score_diplome_specialite'`

- [ ] **Step 3: Write minimal implementation**

```python
def _score_diplome_specialite(profil, offre):
    """S05/S06/S07/S08 — diplôme et spécialité-formation comme deux critères pondérés
    indépendants, évalués sur la MÊME FormationCandidat (jamais un diplôme d'une formation
    combiné à la spécialité d'une autre — T10). Retourne (contrib_diplome, contrib_specialite,
    formation_retenue). (None, None, None) si l'offre ne définit aucun couple accepté
    (critères non demandés, S01)."""
    try:
        diplomes_acceptes = list(offre.diplomes_acceptes.all())
    except TypeError:
        diplomes_acceptes = []
    if not diplomes_acceptes:
        return None, None, None

    couples_diplome_ids = {da.couple.diplome_id for da in diplomes_acceptes}
    couples_specialite_ids = {da.couple.specialite_id for da in diplomes_acceptes}

    try:
        formations = [
            f for f in profil.formations_detail.all()
            if f.statut == 'OBTENU' and f.diplome_ref_id
            and getattr(f.diplome_ref, 'code', None) != 'D-AUTRE'
        ]
    except TypeError:
        formations = []

    if not formations:
        return {"score": 0.0, "connu": False}, {"score": 0.0, "connu": False}, None

    meilleure = None
    meilleur_total = -1.0
    for f in formations:
        sd = 1.0 if f.diplome_ref_id in couples_diplome_ids else 0.0
        ss = 1.0 if f.specialite_ref_id in couples_specialite_ids else 0.0
        total = 0.20 * sd + 0.25 * ss
        if total > meilleur_total:
            meilleur_total = total
            meilleure = (f, sd, ss)

    formation, sd, ss = meilleure
    return (
        {"score": sd, "connu": True},
        {"score": ss, "connu": True},
        formation if (sd or ss) else None,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_matcher_diplome_specialite_s07 -v 2`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/matcher.py taftech_backend/jobs/tests/test_matcher_diplome_specialite_s07.py
git commit -m "feat: separe diplome/specialite en 2 criteres ponderes S06/S07 (fin du bucket combine)"
```

---

### Task 5 : Repli "aucun couple accepté" — hiérarchie legacy retirée du chemin scoré

**Contexte** : F06/S05 interdisent toute équivalence de rang implicite entre diplômes ("ne pas convertir BTS en DEUA, master en magister"). L'ancien repli hiérarchique (`hierarchie = {'TS':7,'LICENCE':8,...}`) fait exactement ça dès qu'une offre n'a pas de couple explicite. Décision : quand l'offre n'a **aucun** `OffreDiplomeAccepte`, le diplôme et la spécialité sont **non demandés** (poids_actif=0 pour les deux), pas un repli sur un rang hiérarchique inventé.

**Files:**
- Modify: `taftech_backend/jobs/matcher.py` (le repli `else: hierarchie = {...}` disparaît du chemin de score — `_score_diplome_specialite` déjà retourne `(None, None, None)` dans ce cas, cf. Task 4)
- Test: étendre `taftech_backend/jobs/tests/test_matcher_diplome_specialite_s07.py`

**Interfaces:**
- Consumes: `_score_diplome_specialite` (Task 4, déjà correct — ce Task documente/verrouille juste la suppression du code mort correspondant).

- [ ] **Step 1: Write the failing test**

Ajouter à `test_matcher_diplome_specialite_s07.py` :

```python
    def test_T14_offre_sans_diplome_du_tout_ne_penalise_pas(self):
        """T14 : le poids diplôme/spécialité est inactif pour tous les candidats — même un
        candidat sans aucune formation ne doit pas être pénalisé sur un critère non demandé."""
        self.offre.diplomes_acceptes.all().delete()
        self.offre.diplome = None
        self.offre.save()
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertIsNone(contrib_d)
        self.assertIsNone(contrib_s)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_matcher_diplome_specialite_s07.test_T14_offre_sans_diplome_du_tout_ne_penalise_pas -v 2`
Expected: PASS immédiatement (Task 4 couvre déjà ce cas) — ce step confirme la non-régression, pas d'implémentation supplémentaire nécessaire ici.

- [ ] **Step 3: Retirer le code mort dans `_calculer_score_algo`**

Dans `taftech_backend/jobs/matcher.py`, supprimer entièrement le bloc `else: hierarchie = {...}` (section "3. DIPLÔME" actuelle, lignes ~431-460) — il sera remplacé dans Task 7 par un appel à `_score_diplome_specialite`. Ne pas le garder "au cas où" : c'est exactement le comportement F06 interdit.

- [ ] **Step 4: Run full matcher test suite**

Run: `python manage.py test jobs.tests.test_matcher jobs.tests.test_matcher_referentiel_v2 jobs.tests.test_matcher_diplome_specialite_s07 -v 2`
Expected: des échecs attendus dans `test_matcher.py`/`test_matcher_referentiel_v2.py` tant que Task 7 (intégration finale) n'est pas faite — noter les échecs, ils seront résolus par la réécriture de `_calculer_score_algo`.

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/matcher.py taftech_backend/jobs/tests/test_matcher_diplome_specialite_s07.py
git commit -m "chore: retire le repli hierarchique diplome interdit par F06/S05"
```

---

### Task 6 : Expérience continue (S09) + critère désactivé si minimum=0

**Files:**
- Modify: `taftech_backend/jobs/matcher.py`
- Test: `taftech_backend/jobs/tests/test_matcher_experience_s09.py`

**Interfaces:**
- Consumes: `_deduire_annees_sans_chevauchement`, `_experience_pertinente`, `_annees_experience` (déjà en place, inchangés).
- Produces: `_score_experience(profil, offre) -> dict|None` — `None` si `mois_minimum == 0` (poste ouvert aux débutants avec minimum réellement nul, S09).

- [ ] **Step 1: Write the failing test**

```python
# taftech_backend/jobs/tests/test_matcher_experience_s09.py
from unittest.mock import Mock
from django.test import TestCase
from jobs.matcher import _score_experience


class ScoreExperienceS09Test(TestCase):
    def test_minimum_zero_critere_desactive(self):
        profil = Mock(experiences_detail=Mock(all=lambda: []), niveau_experience=None)
        offre = Mock(experience_requise="DEBUTANT")
        self.assertIsNone(_score_experience(profil, offre))

    def test_experience_a_moitie_du_minimum_score_0_5_EX05(self):
        # SIMULATIONS EX-05 : expérience pertinente à moitié du minimum -> s_experience=0.5
        import datetime
        exp = Mock(
            titre_poste="Développeur", description="",
            date_debut=datetime.date.today() - datetime.timedelta(days=int(365.25 * 1.5)),
            date_fin=datetime.date.today(),
        )
        profil = Mock(experiences_detail=Mock(all=lambda: [exp]), niveau_experience=None)
        offre = Mock(experience_requise="CONFIRME", titre="Développeur")  # minimum = 3 ans
        contrib = _score_experience(profil, offre)
        self.assertAlmostEqual(contrib["score"], 0.5, places=1)

    def test_experience_atteinte_score_1_capped(self):
        import datetime
        exp = Mock(
            titre_poste="Développeur", description="",
            date_debut=datetime.date.today() - datetime.timedelta(days=int(365.25 * 6)),
            date_fin=datetime.date.today(),
        )
        profil = Mock(experiences_detail=Mock(all=lambda: [exp]), niveau_experience=None)
        offre = Mock(experience_requise="CONFIRME", titre="Développeur")
        contrib = _score_experience(profil, offre)
        self.assertEqual(contrib["score"], 1.0)

    def test_aucune_experience_est_donnee_manquante(self):
        profil = Mock(experiences_detail=Mock(all=lambda: []), niveau_experience=None)
        offre = Mock(experience_requise="CONFIRME", titre="Développeur")
        contrib = _score_experience(profil, offre)
        self.assertEqual(contrib["score"], 0.0)
        self.assertFalse(contrib["connu"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_matcher_experience_s09 -v 2`
Expected: FAIL — `ImportError: cannot import name '_score_experience'`

- [ ] **Step 3: Write minimal implementation**

```python
_MAP_EXP_ANNEES = {
    'STAGIAIRE': 0, 'DEBUTANT': 0, 'JEUNE_DIPLOME': 1,
    'CONFIRME': 3, 'MANAGER': 5, 'RESPONSABLE_EQUIPE': 5, 'CADRE_DIRIGEANT': 8,
}


def _score_experience(profil, offre):
    """S09 — score continu min(mois_pertinents/mois_minimum, 1). minimum=0 -> critère
    désactivé (None), pas de crédit automatique pour un poste "ouvert aux débutants"."""
    annees_requises = _MAP_EXP_ANNEES.get(getattr(offre, 'experience_requise', None), 0)
    if annees_requises == 0:
        return None

    periodes_pertinentes = []
    annees_total_connu = False
    if hasattr(profil, 'experiences_detail'):
        for exp in profil.experiences_detail.all():
            annees, debut, fin = _annees_experience(exp)
            if annees:
                annees_total_connu = True
            pertinente, confiance = _experience_pertinente(exp, offre)
            if pertinente and debut is not None:
                periodes_pertinentes.append((debut, fin, confiance))

    annees_pertinentes = _deduire_annees_sans_chevauchement(periodes_pertinentes)
    if not annees_total_connu and not getattr(profil, 'niveau_experience', None):
        return {"score": 0.0, "connu": False}

    ratio = min(annees_pertinentes / annees_requises, 1.0) if annees_requises else 1.0
    return {"score": round(ratio, 4), "connu": True}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_matcher_experience_s09 -v 2`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/matcher.py taftech_backend/jobs/tests/test_matcher_experience_s09.py
git commit -m "feat: score experience continu S09, critere desactive si minimum=0"
```

---

### Task 7 : Compétences — critère désactivé sans `CompetenceOffre` (S10)

**Files:**
- Modify: `taftech_backend/jobs/matcher.py`
- Test: `taftech_backend/jobs/tests/test_matcher_competences_s10.py`

**Interfaces:**
- Consumes: `competences_score_structure` (déjà en place, Task inchangée).
- Produces: `_score_competences(profil, offre) -> dict|None` — `None` si `offre.competences_requises` est vide (S10 : "sélection offre obligatoire" pour que le critère existe).

- [ ] **Step 1: Write the failing test**

```python
# taftech_backend/jobs/tests/test_matcher_competences_s10.py
from unittest.mock import Mock
from django.test import TestCase
from jobs.matcher import _score_competences


class ScoreCompetencesS10Test(TestCase):
    def test_offre_sans_competence_structuree_critere_desactive(self):
        offre = Mock(competences_requises=Mock(all=lambda: []))
        profil = Mock(competences="Python, Django")
        self.assertIsNone(_score_competences(profil, offre))

    def test_offre_avec_competences_mais_candidat_muet_est_donnee_manquante(self):
        comp = Mock(type_exigence="OBLIGATOIRE", label="Python", niveau_requis=None)
        offre = Mock(competences_requises=Mock(all=lambda: [comp]))
        profil = Mock(competences="", competences_detail=Mock(exists=lambda: False, all=lambda: []))
        contrib = _score_competences(profil, offre)
        self.assertEqual(contrib["score"], 0.0)
        self.assertFalse(contrib["connu"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_matcher_competences_s10 -v 2`
Expected: FAIL — `ImportError: cannot import name '_score_competences'`

- [ ] **Step 3: Write minimal implementation**

```python
def _score_competences(profil, offre):
    """S10 — score compétences uniquement si l'offre a sélectionné au moins une
    CompetenceOffre ; sinon critère désactivé (None), plus de repli texte libre dans le
    score total (le texte libre reste disponible pour la recherche, voir Task 9)."""
    try:
        competences_requises = list(offre.competences_requises.all())
    except TypeError:
        competences_requises = []
    if not competences_requises:
        return None

    try:
        aucune_declaree = (
            not (getattr(profil, 'competences', None) or '').strip()
            and not profil.competences_detail.exists()
        )
    except (TypeError, AttributeError):
        aucune_declaree = False
    if aucune_declaree:
        return {"score": 0.0, "connu": False}

    ratio, _trouvees, _manquantes = competences_score_structure(profil, competences_requises)
    return {"score": round(ratio, 4), "connu": True}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_matcher_competences_s10 -v 2`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/matcher.py taftech_backend/jobs/tests/test_matcher_competences_s10.py
git commit -m "feat: competences desactivees si offre sans CompetenceOffre (S10)"
```

---

### Task 8 : Intégration finale dans `_calculer_score_algo` + explicabilité S14

**Contexte** : les Tasks 2-7 ont produit des fonctions de score isolées et testées. Cette tâche les branche ensemble dans `_calculer_score_algo`/`calculer_score_matching`, en conservant les textes d'explication riches déjà écrits (points forts/écarts), et ajoute la traçabilité S14 (formation retenue, version de l'algorithme).

**Files:**
- Modify: `taftech_backend/jobs/matcher.py` (réécrire `_calculer_score_algo` en entier)
- Modify: `taftech_backend/jobs/tests/test_matcher.py` (25 tests historiques sur `Mock` — vérifier qu'ils passent toujours ou les adapter si un `Mock` déclenchait l'ancien repli hiérarchique désormais supprimé)
- Modify: `taftech_backend/jobs/tests/test_matcher_referentiel_v2.py` (le critère "specialite" y teste actuellement le **métier** — à réécrire pour tester la **spécialité de formation**, cf. Task 9)
- Modify: `taftech_backend/jobs/tests/test_referentiel_v2_simulations.py` (recalculer EX-01 à EX-06 avec les scores EXACTS désormais atteignables, y compris EX-05 qui n'était vérifié que directionnellement)

**Interfaces:**
- Produces: `calculer_score_matching(candidat_user, offre)` garde exactement sa signature et son type de retour externe (`total`, `details`, `explications`, `highlights`, `disqualifie`, `flags`, `completude`, `criteres_manquants`) — ajoute `criteres_non_demandes` (list) et `algorithme_version` (str) au dict retourné, sans rien retirer (pas de breaking change API pour les consommateurs frontend qui ignorent les clés inconnues).
- `total` peut désormais valoir `None` (S01 : `W=0`) — les appelants (`CVThequeView`, `PostulerAPIView`, sérialiseurs) qui font `round(result['total'])` doivent gérer ce cas (voir Task 10).

- [ ] **Step 1: Réécrire `_calculer_score_algo`**

```python
def _calculer_score_algo(candidat_user, offre):
    from .matching_params import get_parametres_matching
    params = get_parametres_matching()
    profil = candidat_user.profil_candidat

    points_forts = []
    ecarts = []
    explications = {}
    formation_retenue = None

    # RÉGION (S04)
    contrib_region = _score_region(profil, offre)
    contrib_region["poids"] = params["poids_region"]
    wilaya_c, wilaya_o = normaliser(profil.wilaya), normaliser(offre.wilaya)
    if contrib_region["score"] == 1.0:
        if wilaya_c == wilaya_o:
            explications["region"] = f"Réside dans la même wilaya ({profil.wilaya})."
            points_forts.append(f"Résidence dans la même Wilaya ({profil.wilaya}).")
        else:
            explications["region"] = "Mobilité déclarée compatible avec le lieu de travail."
            points_forts.append("Mobilité compatible avec le poste.")
    elif not contrib_region["connu"]:
        explications["region"] = "Localisation du candidat non renseignée."
    else:
        explications["region"] = f"Candidat basé à {profil.wilaya or 'wilaya inconnue'}, hors zone et sans mobilité compatible."
        ecarts.append(f"Localisation incompatible avec le poste ({offre.wilaya}).")

    # DIPLÔME + SPÉCIALITÉ (S05-S08)
    contrib_diplome, contrib_specialite, formation_retenue = _score_diplome_specialite(profil, offre)
    if contrib_diplome is not None:
        contrib_diplome["poids"] = params["poids_diplome"]
        if contrib_diplome["score"] == 1.0:
            explications["diplome"] = "Type de diplôme accepté par l'offre."
            points_forts.append("Diplôme conforme aux exigences de l'offre.")
        elif not contrib_diplome["connu"]:
            explications["diplome"] = "Aucune formation obtenue référencée dans le catalogue — correspondance non vérifiable."
        else:
            explications["diplome"] = "Le diplôme du candidat ne fait pas partie des diplômes acceptés."
            ecarts.append("Diplôme non compatible avec les exigences de l'offre.")
    if contrib_specialite is not None:
        contrib_specialite["poids"] = params["poids_specialite"]
        if contrib_specialite["score"] == 1.0:
            explications["specialite"] = f"Spécialité de formation acceptée ({formation_retenue.specialite_ref.libelle if formation_retenue else ''})."
            points_forts.append("Spécialité de formation exactement acceptée par l'offre.")
        elif not contrib_specialite["connu"]:
            explications["specialite"] = "Aucune formation obtenue référencée dans le catalogue — correspondance non vérifiable."
        else:
            explications["specialite"] = "La spécialité de formation ne correspond pas à celles acceptées."
            ecarts.append("Spécialité de formation non compatible avec les exigences de l'offre.")

    # EXPÉRIENCE (S09)
    contrib_experience = _score_experience(profil, offre)
    if contrib_experience is not None:
        contrib_experience["poids"] = params["poids_experience"]
        if contrib_experience["score"] >= 1.0:
            explications["experience"] = "Expérience pertinente suffisante pour ce poste."
            points_forts.append("Expérience requise atteinte.")
        elif not contrib_experience["connu"]:
            explications["experience"] = "Aucune expérience renseignée."
        elif contrib_experience["score"] > 0:
            explications["experience"] = f"Expérience pertinente partielle ({round(contrib_experience['score'] * 100)}% du minimum requis)."
            ecarts.append("Expérience pertinente insuffisante par rapport au minimum requis.")
        else:
            explications["experience"] = "Aucune expérience pertinente pour ce poste."
            ecarts.append("Manque d'expérience pertinente dans ce domaine.")

    # COMPÉTENCES (S10)
    contrib_competences = _score_competences(profil, offre)
    if contrib_competences is not None:
        contrib_competences["poids"] = params["poids_competences"]
        if contrib_competences["score"] >= 0.85:
            explications["competences"] = "Compétences requises largement couvertes."
            points_forts.append("Compétences clés du poste maîtrisées.")
        elif not contrib_competences["connu"]:
            explications["competences"] = "Compétences non renseignées."
        elif contrib_competences["score"] > 0:
            explications["competences"] = "Compétences partiellement couvertes."
        else:
            explications["competences"] = "Aucune des compétences requises n'a été retrouvée."
            ecarts.append("Compétences requises non alignées avec le profil.")

    contributions = {
        "region": contrib_region,
        "diplome": contrib_diplome,
        "specialite": contrib_specialite,
        "experience": contrib_experience,
        "competences": contrib_competences,
    }
    resultat = _composer_score(contributions)

    details = {k: round((v["score"] * v["poids"] * 100), 2) if v else 0.0 for k, v in contributions.items()}

    return {
        "total": resultat["total"],
        "details": details,
        "explications": explications,
        "highlights": {"points_forts": points_forts, "ecarts": ecarts},
        "disqualifie": False,
        "flags": [],
        "completude": resultat["completude"],
        "criteres_manquants": resultat["criteres_manquants"],
        "criteres_non_demandes": resultat["criteres_non_demandes"],
        "algorithme_version": params["algorithme_version"],
        "formation_id_retenue": formation_retenue.id if formation_retenue else None,
    }
```

Adapter aussi `calculer_score_matching()` (le cas "profil incomplet") pour inclure les 2 nouvelles clés (`criteres_non_demandes: []`, `algorithme_version`, `formation_id_retenue: None`) et garder `total: 0.0` dans ce seul cas (dossier candidat totalement absent, distinct de "W=0").

- [ ] **Step 2: Run test to verify it fails, puis adapter**

Run: `python manage.py test jobs.tests.test_matcher -v 2`

Deux catégories d'échecs attendus, à traiter au cas par cas :
1. Des tests qui vérifiaient l'ancienne hiérarchie de diplôme sur un `Mock` sans `OffreDiplomeAccepte` — puisque `offre.diplomes_acceptes.all()` sur un `Mock` lève `TypeError` (déjà le comportement existant), `_score_diplome_specialite` retournera `(None, None, None)` pour eux : ces tests doivent être mis à jour pour vérifier que `details["diplome"]`/`details["specialite"]` valent `0.0` (poids non actif) plutôt qu'un score hiérarchique — mettre à jour les assertions, pas contourner.
2. Des tests qui vérifiaient un score total sur 100 points fixes (ex. `self.assertEqual(result['total'], 82)`) — recalculer la valeur exacte attendue avec la nouvelle formule à poids actifs et documenter le calcul en commentaire à côté de l'assertion.

- [ ] **Step 3: Réécrire `test_matcher_referentiel_v2.py`**

Le fichier actuel teste `metiers_compatibles()`/"comparaison métier candidat/offre" sous la clé `specialite` du score total — ce n'est plus correct (la clé `specialite` teste maintenant `SpecialiteFormation`, pas `Metier`). Renommer la classe de tests "comparaison métier" pour qu'elle teste uniquement `metiers_compatibles()` en tant que fonction utilitaire (toujours utilisée par `_experience_pertinente`), et ajouter les tests de couple diplôme/spécialité déjà écrits en Task 4/5 comme la nouvelle source de vérité pour le critère `specialite` du score total.

- [ ] **Step 4: Recalculer les 6 cas `test_referentiel_v2_simulations.py`**

Avec S09 continu, EX-05 (expérience à moitié du minimum) doit maintenant être vérifié à la valeur EXACTE 90 (plus seulement directionnellement, comme documenté comme limite connue avant ce plan) :

```python
def test_EX05_experience_mi_minimum_score_exact(self):
    # SIMULATIONS EX-05 : s_experience=0.5, tous les autres critères=1 -> score=90, couverture=1.0
    ...  # construire candidat/offre pour obtenir annees_pertinentes == annees_requises/2 exactement
    result = calculer_score_matching(candidat_user, offre)
    self.assertAlmostEqual(result["total"], 90.0, places=1)
    self.assertAlmostEqual(result["completude"], 1.0)
```

- [ ] **Step 5: Run full backend suite**

Run: `python manage.py test jobs accounts -v 2`
Expected: 0 échec. Documenter dans le message de commit le nombre de tests avant/après.

- [ ] **Step 6: Commit**

```bash
git add taftech_backend/jobs/matcher.py taftech_backend/jobs/tests/test_matcher.py taftech_backend/jobs/tests/test_matcher_referentiel_v2.py taftech_backend/jobs/tests/test_referentiel_v2_simulations.py
git commit -m "refactor: integre le score a poids actifs dans calculer_score_matching (S01-S14)"
```

---

### Task 9 : Adapter les appelants à `total` potentiellement `None`

**Contexte** : `CVThequeView` (tri par score), `PostulerAPIView` (score figé à la candidature), les sérialiseurs candidat/recruteur font tous `round(result['total'])` ou stockent `details_matching` tel quel. `total=None` (S01, `W=0` — cas extrême d'une offre qui ne demande absolument rien) doit être géré explicitement.

**Files:**
- Modify: `taftech_backend/jobs/views/recruteur.py` (`CVThequeView`, ~ligne 864 `scored.append((profil, round(result['total'])))`)
- Modify: `taftech_backend/jobs/views/candidatures.py` (`PostulerAPIView`, chercher `calculer_score_matching(`)
- Test: `taftech_backend/jobs/tests/test_matcher_total_none.py`

**Interfaces:**
- Consumes: `calculer_score_matching()` (Task 8) — `result["total"]` peut être `None`.

- [ ] **Step 1: Write the failing test**

```python
# taftech_backend/jobs/tests/test_matcher_total_none.py
from django.test import TestCase
from jobs.matcher import calculer_score_matching


class ScoreTotalNoneTest(TestCase):
    def test_offre_totalement_ouverte_retourne_total_none(self):
        # Une offre sans diplomes_acceptes/diplome, sans CompetenceOffre, experience_requise
        # DEBUTANT (minimum=0) : seul le critère région reste actif -> total n'est PAS None
        # (région est toujours active). Ce test documente le comportement réel plutôt qu'un
        # cas W=0 artificiel (aucune offre réelle ne peut désactiver la région aujourd'hui,
        # cf. Global Constraints — pas de champ télétravail).
        pass  # remplacé par un test d'intégration concret dans Task 8 Step 4 ci-dessus
```

Ce test sert de garde-fou documentaire : comme la région est **toujours** un critère actif (pas de notion de télétravail dans le modèle actuel), `total=None` est en pratique **inatteignable** avec les offres réelles du site. Le code défensif de cette tâche reste nécessaire pour ne jamais planter si ça change un jour (nouveau champ télétravail, etc.) — TDD sur le comportement défensif directement :

```python
# Remplacer le contenu du fichier par un test direct de la fonction défensive
from django.test import TestCase
from jobs.views.recruteur import _score_ou_zero


class ScoreOuZeroTest(TestCase):
    def test_total_none_devient_zero_pour_le_tri(self):
        self.assertEqual(_score_ou_zero({"total": None}), 0)

    def test_total_connu_inchange(self):
        self.assertEqual(_score_ou_zero({"total": 73.4}), 73)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_matcher_total_none -v 2`
Expected: FAIL — `ImportError: cannot import name '_score_ou_zero'`

- [ ] **Step 3: Write minimal implementation**

Dans `taftech_backend/jobs/views/recruteur.py`, ajouter avant `class CVThequeView` :

```python
def _score_ou_zero(result):
    """S01 : `total` peut être None (aucun critère actif sur l'offre) — jamais planter le tri
    ou l'affichage, traiter comme 0 dans ce cas (pas de classement possible, pas un mauvais score)."""
    total = result.get('total')
    return round(total) if total is not None else 0
```

Puis remplacer, dans `CVThequeView.get()` :
```python
scored.append((profil, round(result['total'])))
```
par :
```python
scored.append((profil, _score_ou_zero(result)))
```

Et dans `taftech_backend/jobs/views/candidatures.py` (`PostulerAPIView`), repérer l'appel à `calculer_score_matching(...)` et le point où `score_matching` est assigné sur la `Candidature` (probablement `candidature.score_matching = result['total']` ou similaire) — remplacer par `candidature.score_matching = result['total'] if result['total'] is not None else 0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_matcher_total_none -v 2`
Expected: PASS (2/2)

Puis relancer la suite complète pour vérifier l'absence de régression sur `PostulerAPIView`/`CVThequeView` :
Run: `python manage.py test jobs.tests.test_api_candidat jobs.tests.test_api_cvtheque jobs.tests.test_api_cvtheque_credits -v 2`
Expected: 0 échec

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/views/recruteur.py taftech_backend/jobs/views/candidatures.py taftech_backend/jobs/tests/test_matcher_total_none.py
git commit -m "fix: gere total=None (S01) dans CVThequeView et PostulerAPIView"
```

---

### Task 10 : Recherche CVthèque — normalisation N01-N04 + résolution par type d'entité (R01-R07)

**Contexte** : le paramètre `search` de `CVThequeView` fait un `icontains` brut, sans passer par `normaliser_recherche()` (déjà écrit et utilisé ailleurs — `jobs/referentiel_utils.py`). Le paramètre `specialite` ne peut filtrer QUE par ID `Metier` (pas de recherche par spécialité de formation). Cette tâche ajoute une recherche normalisée sur le texte libre et un filtre dédié `specialite_formation`.

**Files:**
- Modify: `taftech_backend/jobs/views/recruteur.py` (`CVThequeView.get()`)
- Modify: `taftech_backend/jobs/referentiel_utils.py` (si `normaliser_recherche()` n'exporte pas déjà une fonction utilisable côté recherche libre multi-mots — vérifier avant d'écrire, ne pas dupliquer)
- Test: `taftech_backend/jobs/tests/test_api_cvtheque_recherche_normalisee.py`

**Interfaces:**
- Consumes: `referentiel_utils.normaliser_recherche(texte: str) -> str` (déjà existant).
- Produces: `CVThequeView` accepte un nouveau paramètre `specialite_formation` (ID `SpecialiteFormation`) en plus de `specialite` (ID `Metier`, inchangé) ; le paramètre `search` normalise la requête ET les champs comparés côté Python avant le filtre `icontains` (Postgres ne normalise pas les accents nativement sans extension — comparaison faite sur une valeur déjà normalisée stockée, voir Step 3).

- [ ] **Step 1: Write the failing test**

```python
# taftech_backend/jobs/tests/test_api_cvtheque_recherche_normalisee.py
from django.test import TestCase
from rest_framework.test import APIClient
from jobs.models import CustomUser, ProfilCandidat, ProfilEntreprise, AbonnementEntreprise, Palier


class CVThequeRechercheNormaliseeTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        rec = CustomUser.objects.create_user(email="rec_search@test.com", password="x", role="RECRUTEUR")
        self.entreprise = ProfilEntreprise.objects.create(
            user=rec, nom_entreprise="ACME Search", est_approuvee=True, consentement_cvtheque=True)
        rec.consentement_cvtheque = True
        rec.save()
        palier, _ = Palier.objects.get_or_create(
            nom="BUSINESS", defaults={"limite_offres": None, "acces_coordonnees": True,
                                       "acces_ia_recommandes": True, "acces_ia_avancee": True, "acces_equipe": True})
        AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=palier)
        self.client.force_authenticate(user=rec)

        candidat_user = CustomUser.objects.create_user(email="dev_search@test.com", password="x", role="CANDIDAT")
        ProfilCandidat.objects.create(user=candidat_user, titre_professionnel="Développeur Full Stack")

    def test_recherche_sans_accent_trouve_le_candidat_accentue(self):
        resp = self.client.get("/api/jobs/cvtheque/", {"search": "developpeur"})
        self.assertEqual(resp.status_code, 200)
        emails = [c["email"] for c in resp.data["results"]] if "results" in resp.data else [c["email"] for c in resp.data]
        self.assertIn("dev_search@test.com", emails)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_api_cvtheque_recherche_normalisee -v 2`
Expected: FAIL — 0 résultat (le `icontains` brut ne trouve pas "Développeur" avec la requête "developpeur" sans accent).

- [ ] **Step 3: Write minimal implementation**

Dans `taftech_backend/jobs/views/recruteur.py`, remplacer le bloc `if search:` de `CVThequeView.get()` :

```python
if search:
    from ..referentiel_utils import normaliser_recherche
    search_norm = normaliser_recherche(search)
    candidats_filtres_ids = []
    for c in candidats.only('id', 'titre_professionnel', 'competences').iterator():
        champs = [c.titre_professionnel or '', c.competences or '']
        try:
            champs += [e.titre_poste or '' for e in c.experiences_detail.all()]
        except Exception:
            pass
        if any(search_norm in normaliser_recherche(champ) for champ in champs if champ):
            candidats_filtres_ids.append(c.id)
    candidats = candidats.filter(id__in=candidats_filtres_ids)
```

Note : ce filtrage itère en Python (pas de fonction SQL de normalisation d'accents disponible sans extension Postgres `unaccent`) — acceptable pour le volume actuel de la CVthèque (même ordre de grandeur que les boucles de scoring déjà en place dans ce fichier), à optimiser avec `pg_trgm`/`unaccent` si le volume de candidats grossit significativement (même limite déjà documentée pour N04 dans CLAUDE.md).

Ajouter le filtre `specialite_formation` juste après le bloc `specialite` existant :

```python
if request.GET.get('specialite_formation', '').isdigit():
    spec_formation_id = int(request.GET['specialite_formation'])
    candidats = candidats.filter(
        formations_detail__specialite_ref_id=spec_formation_id,
        formations_detail__statut='OBTENU',
    ).distinct()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_api_cvtheque_recherche_normalisee -v 2`
Expected: PASS (1/1)

Puis relancer la suite CVthèque complète :
Run: `python manage.py test jobs.tests.test_api_cvtheque jobs.tests.test_api_cvtheque_credits jobs.tests.test_api_paliers_gating -v 2`
Expected: 0 échec

- [ ] **Step 5: Commit**

```bash
git add taftech_backend/jobs/views/recruteur.py taftech_backend/jobs/tests/test_api_cvtheque_recherche_normalisee.py
git commit -m "feat: recherche CVtheque normalisee (N01-N04) + filtre specialite de formation"
```

---

### Task 11 : Frontend — revert du libellé "Métier" vers "Spécialité"

**Contexte** : la clé `specialite`/`max: 25` reste structurellement identique côté frontend (aucun changement de forme), seul son sens change (spécialité de formation, pas métier) — huit occurrences du libellé `"Métier"` à réécrire en `"Spécialité"`.

**Files:**
- Modify: `taftech_frontend/src/Components/MatchingRadarChart.jsx:11`
- Modify: `taftech_frontend/src/Pages/Candidat/MesCandidatures.jsx:58`
- Modify: `taftech_frontend/src/Pages/Recruteur/DashboardRecruteur.jsx:77`
- Modify: `taftech_frontend/src/Pages/Recruteur/GestionOffre/DetailCandidature.jsx:32,577,595` (garder `:406 "Métier souhaité"` intact — ça référence un vrai champ métier candidat, sans rapport avec le score)
- Modify: `taftech_frontend/src/Pages/Recruteur/GestionOffre/Modals.jsx:24`

**Interfaces:** aucune — changement de texte pur, la clé `key: "specialite"` ne change pas.

- [ ] **Step 1: Vérifier les tests existants référençant "Métier" comme libellé de score**

Run: `cd taftech_frontend && npx vitest run -t "Métier"`
Expected: lister les tests qui échoueront après le renommage (probablement `MesCandidatures.test.jsx`, `DetailCandidature.test.jsx` — vérifier avant de modifier).

- [ ] **Step 2: Remplacer le texte dans les 5 fichiers**

Dans chacun des 5 fichiers listés ci-dessus, remplacer chaque occurrence de `label: "Métier"` (et `specialite: "Métier",` dans le mapping `STATUT_LABELS`-like de `DetailCandidature.jsx:577`) par `label: "Spécialité"` / `specialite: "Spécialité",`. Ne pas toucher à `"Métier souhaité"` (ligne 406, distinct — c'est le libellé d'un champ profil, pas du score).

- [ ] **Step 3: Mettre à jour les tests cassés par le renommage**

Pour chaque test identifié au Step 1, remplacer les assertions `getByText("Métier")` par `getByText("Spécialité")` (ou `getAllByText` si le libellé "Spécialité" existe déjà ailleurs sur la page — vérifier au cas par cas pour éviter le piège déjà documenté dans CLAUDE.md des `getByText` multiples).

- [ ] **Step 4: Run frontend test suite + build**

Run: `cd taftech_frontend && npm test -- --run && npx vite build`
Expected: 0 échec, build propre.

- [ ] **Step 5: Commit**

```bash
git add taftech_frontend/src/Components/MatchingRadarChart.jsx taftech_frontend/src/Pages/Candidat/MesCandidatures.jsx taftech_frontend/src/Pages/Recruteur/DashboardRecruteur.jsx taftech_frontend/src/Pages/Recruteur/GestionOffre/DetailCandidature.jsx taftech_frontend/src/Pages/Recruteur/GestionOffre/Modals.jsx
git commit -m "fix: revient au libelle Specialite pour le critere de score (specialite-formation, pas metier)"
```

---

### Task 12 : Documentation — mise à jour de `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** aucune (documentation).

- [ ] **Step 1: Ajouter une nouvelle section de session**

Ajouter en tête de `CLAUDE.md` une section `## 🆕 SESSION <date> — Mise en conformité matching avec REGLES_MATCHING/PARAM_MATCHING (S01-S14)` documentant :
- Le changement de sens du critère "spécialité" (25%) : de "métier/poste" (Metier) à "spécialité de formation" (SpecialiteFormation, couplée au diplôme via S07).
- Le passage à une formule à poids actifs (S01/S02) — un score n'est plus toujours réparti sur 100 points fixes.
- Région binaire stricte (S04) — perte assumée de la granularité commune/wilaya dans le SCORE (conservée dans le texte d'explication).
- Expérience continue (S09) et compétences désactivées sans `CompetenceOffre` (S10).
- `ParametreMatching` enfin branché (`jobs/matching_params.py`) — poids éditables en base sans déploiement.
- Rappel : pas de notion de télétravail dans le modèle actuel — le carve-out S04 pour le télétravail intégral n'a pas pu être implémenté (pas de champ correspondant), à construire si demandé.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documente la mise en conformite matching avec REGLES_MATCHING v2 (S01-S14)"
```
