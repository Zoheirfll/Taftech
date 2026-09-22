"""Utilitaires partagés autour du référentiel métiers v2 (Metier/Appellation).

Centralise la résolution "texte libre → Metier", utilisée par le parsing de CV
(cv_parser.extract_specialite) et par la génération d'offre IA (jobs/views/ia.py) —
remplace l'ancienne résolution vers un code Domaine ANEM (MetierReferentiel), le
système NAME/Secteur/Domaine/SousDomaine a été retiré (cutover complet, 18/09/2026).

Contrairement à l'ancien système (87 domaines, assez peu pour être listés dans un
prompt IA), le référentiel v2 compte 1038 métiers — cette résolution reste donc
volontairement déterministe (mots-clés, pas un appel LLM) : c'est un filet de
sécurité rapide, pas un remplacement de l'agent de classification dédié
(jobs/metier_agent.py) qui, lui, s'appuie sur un vrai appel Groq grounded sur des
appellations réelles trouvées par recherche."""
import re
import unicodedata
from collections import Counter
from django.db.models import Q
from .models import Appellation

_TOKENS_TECHNIQUES = [
    (re.compile(r"(?<!\w)c\+\+(?!\w)", re.IGNORECASE), "cpp"),
    (re.compile(r"(?<!\w)c#(?!\w)", re.IGNORECASE), "csharp"),
    (re.compile(r"(?<!\w)\.net(?!\w)", re.IGNORECASE), "dotnet"),
]
_HARAKAT_TATWEEL = re.compile(r"[ً-ْٰـ]")
_ALEF_VARIANTES = re.compile(r"[أإآٱ]")  # أ إ آ ٱ
_PONCTUATION = re.compile(r"[^\w\s؀-ۿ]", re.UNICODE)


def normaliser_recherche(texte):
    """Normalise une requête de recherche pour comparaison avec `Appellation.cle_recherche`
    (déjà normalisé côté import) — REGLES_MATCHING N01/N02/N03 du référentiel v2 :
    minuscule + œ/æ ; jetons techniques C++/C#/.NET → cpp/csharp/dotnet AVANT le retrait
    de ponctuation, aux limites de mot (N02) ; harakat/tatweel arabes retirés et
    أ/إ/آ/ٱ→ا, ى→ي, l'arabe n'est jamais translittéré ni supprimé (N03) ; décomposition
    NFKD + retrait des marques diacritiques latines (N01). Sans cette normalisation,
    une requête tapée avec les accents usuels (« développeur ») ne matchait plus aucune
    entrée du référentiel (bug trouvé en vérifiant la Phase 3, session du 18/09/2026)."""
    if not texte:
        return ""
    t = str(texte).lower().replace("œ", "oe").replace("æ", "ae")
    for pattern, remplacement in _TOKENS_TECHNIQUES:
        t = pattern.sub(remplacement, t)
    t = _HARAKAT_TATWEEL.sub("", t)
    t = _ALEF_VARIANTES.sub("ا", t)
    t = t.replace("ى", "ي")
    t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
    t = _PONCTUATION.sub(" ", t)
    return re.sub(r"\s+", " ", t).strip()


# Acronymes/mots explicitement exclus du flou par le client (N04), même s'ils atteignaient
# 5 lettres après normalisation (aucun ne l'atteint actuellement, exclusion défensive).
_MOTS_EXCLUS_FLOU = {"daf", "bts", "cap", "si", "c", "cpp", "csharp", "dotnet"}


def _levenshtein_leq1(a, b):
    """True si la distance de Levenshtein(a, b) <= 1 — jamais un calcul complet si les
    longueurs divergent de plus de 1 (impossible d'être à distance <=1 dans ce cas)."""
    if a == b:
        return True
    if abs(len(a) - len(b)) > 1:
        return False
    m, n = len(a), len(b)
    ligne = list(range(n + 1))
    for i in range(1, m + 1):
        precedent = ligne[0]
        ligne[0] = i
        for j in range(1, n + 1):
            courant = ligne[j]
            ligne[j] = precedent if a[i - 1] == b[j - 1] else 1 + min(precedent, ligne[j], ligne[j - 1])
            precedent = courant
        if min(ligne) > 1:
            return False  # aucune chance de redescendre à <=1, court-circuit
    return ligne[n] <= 1


def corriger_mots_flous(mots):
    """REGLES_MATCHING N04 : tolère une faute de frappe (distance de Levenshtein <=1)
    UNIQUEMENT sur des jetons alphabétiques de 5 lettres ou plus, jamais sur les acronymes
    courts (DAF/BTS/CAP/SI/C/C++...) ni sur des chiffres/IDs. "Rechercher exact avant
    correction" : un mot déjà présent tel quel dans le référentiel n'est jamais retouché —
    la correction n'est tentée que pour un mot absent, contre un pool de mots réels du
    référentiel restreint par préfixe (jamais un balayage complet du référentiel, coûteux
    pour un gain marginal). Retourne la liste corrigée (même longueur, même ordre) — un mot
    sans correction plausible est renvoyé inchangé (la recherche exacte échouera comme
    avant, comportement identique à ne pas avoir de flou du tout)."""
    resultat = []
    for mot in mots:
        if len(mot) < 5 or mot in _MOTS_EXCLUS_FLOU or mot.isdigit():
            resultat.append(mot)
            continue
        if Appellation.objects.filter(cle_recherche__icontains=mot).exists():
            resultat.append(mot)
            continue
        prefixe = mot[:3]
        candidats_cle = (
            Appellation.objects.filter(cle_recherche__icontains=prefixe)
            .values_list('cle_recherche', flat=True).distinct()[:200]
        )
        mots_candidats = set()
        for cle in candidats_cle:
            mots_candidats.update(w for w in cle.split() if len(w) >= 5)
        correction = next((w for w in mots_candidats if _levenshtein_leq1(mot, w)), None)
        resultat.append(correction or mot)
    return resultat


def ids_metier_avec_redirections(metier_id):
    """REGLES_MATCHING — MIGRATION : "conserver la compatibilité avec les anciens
    identifiants". Une recherche/un filtre par `metier_id` doit retrouver aussi bien les
    enregistrements qui référencent directement ce métier que ceux qui référencent un ANCIEN
    code désormais redirigé vers lui (R04) — et réciproquement, si `metier_id` est lui-même un
    ancien code redirigé, retrouver les enregistrements posés sur sa cible canonique.

    Retourne l'ensemble complet des ids à utiliser dans un `metier_id__in=...` : `metier_id`
    lui-même, son `metier_canonique_id` s'il en a un, et tous les ids qui redirigent vers ce
    même canonique. Aujourd'hui sans impact sur les données existantes (aucun enregistrement
    ne référence encore un ancien code redirigé, vérifié le 21/09/2026) — nécessaire dès qu'un
    futur réimport du référentiel ajoute de nouvelles redirections sur des métiers déjà utilisés."""
    from .models import Metier
    try:
        metier_id = int(metier_id)
    except (TypeError, ValueError):
        return set()
    canonique_id = (
        Metier.objects.filter(pk=metier_id)
        .values_list('metier_canonique_id', flat=True)
        .first()
    )
    cible = canonique_id or metier_id
    ids = set(Metier.objects.filter(Q(pk=cible) | Q(metier_canonique_id=cible)).values_list('id', flat=True))
    ids.add(metier_id)
    return ids


def secteurs_entreprise():
    """Liste des secteurs sélectionnables pour `ProfilEntreprise.secteur_activite` — même
    source que la navigation publique "Offres par secteur" (`NomenclatureAPIView.secteurs`,
    `GroupeMetier.type_groupe='secteur_source'`) : 16 secteurs officiels ANEM (NSEC-*) + les
    secteurs plus précis ajoutés par TAFTECH (TSEC-*, ex: Informatique, Cybersécurité, RH).
    Un seul référentiel de secteurs dans tout le site, jamais deux listes qui divergent.
    Retourne `[{"code": ..., "libelle": ...}]`, caché 1h."""
    from django.core.cache import cache
    from .models import GroupeMetier
    cached = cache.get('jobs_secteurs_entreprise')
    if cached is not None:
        return cached
    secteurs = [
        {"code": s.code_source or s.code, "libelle": s.libelle}
        for s in GroupeMetier.objects.filter(type_groupe='secteur_source').order_by('libelle')
    ]
    cache.set('jobs_secteurs_entreprise', secteurs, timeout=3600)
    return secteurs


def libelle_secteur_entreprise(code):
    """Résout le libellé humain d'un code `ProfilEntreprise.secteur_activite` (ex: "G" ->
    "G-COMMERCE") — remplace `get_secteur_activite_display()` qui n'existe plus depuis que ce
    champ n'a plus de `choices` figé en Python (la liste vient maintenant de `GroupeMetier`,
    voir `secteurs_entreprise()`). Retourne le code tel quel si aucun secteur ne correspond
    (donnée historique/texte libre non reconnue) — jamais une chaîne vide qui masquerait la
    valeur brute déjà en base."""
    if not code:
        return ""
    for s in secteurs_entreprise():
        if s["code"] == code:
            return s["libelle"]
    return code


def q_mots_cle_recherche(mots, champ='cle_recherche', mode='and'):
    """Construit un Q() qui exige la présence d'un ou plusieurs mots comme jetons ENTIERS dans
    un champ `cle_recherche` (déjà normalisé/espacé à l'import) — jamais un `icontains` par
    mot, qui ne respecte pas les limites de mot (N02 : "ne pas confondre C, C++ et C#" — un
    `icontains` sur "c" matche à tort "cpp" en tant que sous-chaîne). Bug trouvé le 21/09/2026
    en écrivant `RechercheUniverselleAPIView`, présent aussi dans `MetierAutocompleteAPIView`
    depuis sa création — corrigé aux deux endroits avec ce même helper partagé.

    `mode='and'` (défaut) : TOUS les mots doivent être présents — adapté à une recherche
    mono-entité où plusieurs mots décrivent la même fiche (ex: "développeur mobile").
    `mode='or'` : AU MOINS UN mot suffit — nécessaire pour une requête composée (R06, ex:
    "BTS informatique") où chaque moitié de la requête cible une entité DIFFÉRENTE (le
    diplôme "BTS" et la spécialité "informatique" n'ont chacun qu'un seul des deux mots)."""
    conditions = [Q(**{f'{champ}__iregex': r'(^|\s)' + re.escape(mot) + r'($|\s)'}) for mot in mots]
    if not conditions:
        return Q()
    q = conditions[0]
    for c in conditions[1:]:
        q = (q | c) if mode == 'or' else (q & c)
    return q


def resoudre_metier_depuis_texte(*textes):
    """Devine le Metier le plus probable à partir d'un ou plusieurs textes (titre de
    poste, description...). Cherche les appellations dont le libellé contient un des
    mots (4+ lettres) du texte fourni, retourne le métier (résolu vers son canonique)
    le plus fréquent parmi les correspondances. Retourne None si rien n'est trouvé —
    ne jamais deviner au hasard (REGLES_MATCHING R02/F02 du client)."""
    texte = normaliser_recherche(" ".join(t for t in textes if t))
    mots = [m for m in re.findall(r"\w+", texte) if len(m) >= 4]
    if not mots:
        return None
    mots = corriger_mots_flous(mots)  # N04
    q = Q()
    for mot in mots:
        q |= Q(cle_recherche__icontains=mot)
    appellations = list(
        Appellation.objects.filter(q, actif=True, metier__selectionnable=True)
        .select_related('metier', 'metier__metier_canonique')[:50]
    )
    if not appellations:
        return None
    metiers = [(a.metier.metier_canonique or a.metier) for a in appellations]
    plus_frequent = Counter(m.id for m in metiers).most_common(1)[0][0]
    for m in metiers:
        if m.id == plus_frequent:
            return m
    return None


_MOTS_GENERIQUES_DIPLOME = {"diplome", "formation", "professionnel", "professionnelle", "degree"}


def resoudre_diplome_et_specialite_depuis_texte(texte):
    """Devine le `TypeDiplome` (puis la `SpecialiteFormation`, restreinte aux couples
    `DiplomeSpecialite` attestés pour ce diplôme) à partir d'un intitulé déclaré en texte
    libre (ex: "Master 2 ADSI", "Baccalauréat Génie Mécanique") — même logique que le
    rattrapage manuel effectué en session (18/09/2026), généralisée ici pour le parsing CV.

    Recherche par MOT ENTIER (jamais une sous-chaîne — "genie" ne doit pas matcher dans
    "ingenieur", bug déjà rencontré) sur `TypeDiplome.libelle`/`AliasDiplome.cle_recherche`,
    puis sur `SpecialiteFormation.libelle` des couples liés à ce diplôme uniquement (jamais
    un couple hors référentiel, F06). Retourne (type_diplome_ou_None, specialite_ou_None) —
    s'abstient (None) dès qu'il y a ambiguïté (ex: "Master"/"Licence" seuls, qui ne
    précisent pas académique/professionnel/classique) plutôt que de deviner (R02/F02)."""
    from .models import TypeDiplome, AliasDiplome, DiplomeSpecialite

    if not texte:
        return None, None
    t = normaliser_recherche(texte)
    mots = [m for m in re.findall(r"\w+", t) if len(m) >= 3 and m not in _MOTS_GENERIQUES_DIPLOME]
    if not mots:
        return None, None

    candidats = []
    for td in TypeDiplome.objects.all():
        lib_mots = set(re.findall(r"\w+", normaliser_recherche(td.libelle)))
        score = sum(1 for m in mots if m in lib_mots)
        if score:
            candidats.append((score, td))
    for al in AliasDiplome.objects.select_related('diplome'):
        lib_mots = set(re.findall(r"\w+", normaliser_recherche(al.cle_recherche)))
        score = sum(1 for m in mots if m in lib_mots)
        if score:
            candidats.append((score, al.diplome))
    if not candidats:
        return None, None
    candidats.sort(key=lambda c: -c[0])
    meilleur_score = candidats[0][0]
    meilleurs = [c[1] for c in candidats if c[0] == meilleur_score]
    if len(set(m.id for m in meilleurs)) > 1:
        return None, None  # ambigu (ex: "Master" seul) — ne jamais deviner
    type_diplome = meilleurs[0]

    specialite = None
    spec_candidats = []
    for c in DiplomeSpecialite.objects.filter(diplome=type_diplome, selectionnable=True).select_related('specialite'):
        lib_mots = set(re.findall(r"\w+", normaliser_recherche(c.specialite.libelle)))
        score = sum(1 for m in mots if len(m) >= 4 and m in lib_mots)
        if score:
            spec_candidats.append((score, c.specialite))
    if spec_candidats:
        spec_candidats.sort(key=lambda c: -c[0])
        meilleur = spec_candidats[0][0]
        meilleures = [c[1] for c in spec_candidats if c[0] == meilleur]
        if len(set(s.id for s in meilleures)) == 1:
            specialite = meilleures[0]
    return type_diplome, specialite


# Résolution DIPLOMES_CHOICES (legacy, jobs.constants) -> référentiel v2 (TypeDiplome/Scolarite).
# MIGRATION niveau_v1_vers_diplome/niveau_v1_vers_niveau_etudes utilise les codes internes DU
# CLIENT (N00..N99), jamais stockés dans notre base (nos valeurs sont MASTER_2/TS/LICENCE...) —
# aucune correspondance automatique par égalité de code n'est possible. Cette table reproduit le
# même principe d'abstention (F02/F06) sur nos propres codes : uniquement les cas non ambigus,
# le reste reste `None` plutôt que deviné. Vérifié le 22/09/2026 (session vérification MIGRATION).
RESOLUTION_DIPLOME_LEGACY = {
    'BACCALAUREAT': ('diplome', 'D-BAC'),
    'LICENCE': ('diplome', 'D-LIC-NP'),
    'MAGISTERE': ('diplome', 'D-MAG'),
    'DOCTORAT': ('diplome', 'D-DOC-NP'),
    'CERTIFICATION': ('diplome', 'D-CERT'),  # seul candidat plausible, approximation assumée
    'NIVEAU_SECONDAIRE': ('scolarite', 'SC-SEC'),
    'UNIVERSITAIRE_SANS_DIPLOME': ('scolarite', 'SC-SUP'),
    # Abstention volontaire (aucune conversion) :
    # NIVEAU_TERMINAL (Terminale != Bac obtenu), TS (BTS/DEUA mélangés, F12), MASTER_1 (année
    # intermédiaire, pas un Master complet), MASTER_2 (Master OU Ingéniorat, deux diplômes
    # distincts, cas N15), FORMATION_PRO (8 TypeDiplome possibles, trop générique),
    # NON_DIPLOMANTE (n'est pas un diplôme par définition).
}


def resoudre_diplome_legacy(code_legacy):
    """Retourne (diplome_ref, niveau_scolaire_ref) résolus depuis un code DIPLOMES_CHOICES —
    l'un des deux est toujours None. (None, None) si le code est absent, vide, ou volontairement
    laissé ambigu dans RESOLUTION_DIPLOME_LEGACY."""
    from .models import TypeDiplome, Scolarite
    entree = RESOLUTION_DIPLOME_LEGACY.get(code_legacy)
    if not entree:
        return None, None
    kind, code_cible = entree
    if kind == 'diplome':
        return TypeDiplome.objects.filter(code=code_cible).first(), None
    return None, Scolarite.objects.filter(code=code_cible).first()
