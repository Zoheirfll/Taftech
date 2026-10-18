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
import json
import logging
import re
import unicodedata
from collections import Counter
from django.db.models import Q
from .models import Appellation

logger = logging.getLogger(__name__)

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


def _nettoyer_libelle_secteur_nsec(libelle):
    """Les 16 secteurs officiels ANEM (`GroupeMetier.code_source` = une seule lettre A-P)
    ont été importés avec la lettre du code collée dans le libellé lui-même, en majuscules
    ("A-AGRICULTURE ET PÊCHE", "L-SUPPORT A L 'ENTREPRISE" avec espace parasite avant
    l'apostrophe) — bruit visuel signalé par l'utilisateur (2026-09-25), incohérent avec les
    ~60 secteurs plus précis ajoutés par TAFTECH (TSEC-*), déjà propres ("Agriculture &
    Agroalimentaire"). Correction faite à la lecture (pas en base) pour ne jamais être
    écrasée par un futur réimport ANEM idempotent. Ne touche pas les libellés TSEC (déjà
    propres, `code_source` vide pour ceux-là)."""
    m = re.match(r'^[A-Z]\s*-\s*(.+)$', libelle)
    if not m:
        return libelle
    reste = re.sub(r"\s+,", ",", m.group(1))     # "INSTALLATION , MAINTENANCE" -> "..., ..."
    reste = re.sub(r",(?=\S)", ", ", reste)        # "HÔTELLERIE ,RESTAURATION" (sans espace après)
    reste = re.sub(r"\s+'", "'", reste)             # "L 'ENTREPRISE" -> "L'ENTREPRISE"
    # Majuscules source sans accent : "SUPPORT A L'ENTREPRISE" -> "Support à l'entreprise"
    # ("a" isolé = toujours la préposition dans ces 16 libellés).
    return re.sub(r"\ba\b", "à", reste.capitalize())


# Chevauchements sémantiques entre secteurs (même sujet décrit deux fois, texte différent) —
# trouvés en auditant les 76 secteurs (2026-09-25) après le nettoyage des libellés NSEC.
# Décision explicite de l'utilisateur pour chaque paire : garder le libellé le plus clair/
# complet, peu importe qu'il vienne du référentiel officiel ANEM (NSEC-*) ou de TAFTECH
# (TSEC-*) — jamais une règle automatique "l'officiel gagne toujours". Vérifié avant
# retrait : aucune `ProfilEntreprise.secteur_activite` en base n'utilise les codes masqués
# (3 entreprises seulement ont un secteur renseigné, aucune sur ces codes).
SECTEURS_CODES_MASQUES = {
    'TSEC-7081C23F6C1B': "BTP — doublon de l'officiel F, gardé sous sa forme non abrégée « Bâtiment et travaux publics »",
    'A': "Agriculture et pêche — remplacé par le TSEC plus complet « Agriculture & Agroalimentaire » (couvre aussi l'agroalimentaire)",
    'TSEC-9EB017D9085A': "Hôtellerie & Tourisme — doublon de l'officiel H, plus complet (« ... restauration et tourisme »)",
    'TSEC-34F06D8D9947': "Communication & Médias — doublon de l'officiel J, plus complet (« ... et multimédia »)",
    'K': "Banque, assurances et immobilier — remplacé par les 2 TSEC plus précis « Banque & Assurance » et « Immobilier »",
    'I': "Transport et logistique — remplacé par les 2 TSEC plus précis « Transport » et « Logistique & Supply Chain »",
    'TSEC-C43BAB65E355': "Éducation & Formation — doublon de l'officiel O, plus complet (couvre aussi la recherche scientifique)",
    # Note : "Intelligence Artificielle", "Cloud Computing", "Cybersécurité",
    # "Instrumentation & Automatisme" et "Maintenance Industrielle" ont existé un temps
    # comme secteurs autonomes en doublon avec des domaines déjà riches sous Informatique/
    # Industrie (incohérence signalée par l'utilisateur, 2026-09-25) — plus la peine de les
    # masquer ici : leur contenu a été réellement fusionné (métiers doublons reliés via
    # `metier_canonique`, métiers/sous-domaines uniques déplacés) et les secteurs supprimés
    # par `python manage.py fusionner_secteurs_doublons` (management/commands/).
}


def _dedupliquer_secteurs(secteurs):
    """1. Retire les entrées TSEC-* dont le libellé devient un doublon EXACT d'un secteur
    officiel NSEC-* une fois ce dernier nettoyé de son préfixe (filet de sécurité
    générique, utile si un futur réimport recrée un cas comme "Industrie"/"C-INDUSTRIE").
    2. Retire en plus les codes de `SECTEURS_CODES_MASQUES` (chevauchements sémantiques
    identifiés manuellement, texte différent mais même sujet — voir commentaire ci-dessus).
    Aucun des deux ne touche la hiérarchie domaine/métier en base, seule l'apparition dans
    cette liste plate de sélection disparaît. `secteurs` : liste de dicts avec 'code'/'libelle'."""
    libelles_officiels = {
        s['libelle'].strip().lower() for s in secteurs if len(s['code']) <= 2
    }
    return [
        s for s in secteurs
        if s['code'] not in SECTEURS_CODES_MASQUES
        and (len(s['code']) <= 2 or s['libelle'].strip().lower() not in libelles_officiels)
    ]


def trier_secteurs(secteurs):
    """Ordre alphabétique (sans accent ni casse) sur le libellé déjà nettoyé : « Énergie »
    se range à E. Appliqué à toute liste de secteurs proposée à l'utilisateur, pour qu'elle
    soit identique partout (inscription, paramètres entreprise, pages publiques)."""
    return sorted(secteurs, key=lambda s: normaliser_recherche(s['libelle']))


def secteur_et_domaine_par_metier(metier_ids):
    """Remonte la hiérarchie du référentiel pour chaque métier : métier → [sous-domaine →]
    domaine → secteur (`GroupeMetier.parent`). Retourne
    `{metier_id: {"secteur": (id, libellé nettoyé) | None, "domaine": (id, libellé) | None}}`.
    Sert aux statistiques marché : un « secteur » n'est jamais un métier (Data Analyst,
    Maintenance électrique…), c'est le niveau racine `secteur_source`. Les groupes sont chargés
    en une requête (≈800 lignes) puis remontés en mémoire — pas de requête par métier."""
    from .models import GroupeMetier, Metier
    groupes = {g.id: g for g in GroupeMetier.objects.only('id', 'parent_id', 'type_groupe', 'libelle')}
    resultat = {}
    for metier_id, groupe_id in Metier.objects.filter(id__in=metier_ids).values_list('id', 'groupe_principal_id'):
        secteur = domaine = None
        g, garde_fou = groupes.get(groupe_id), 0
        while g is not None and garde_fou < 10:
            if g.type_groupe == 'domaine_source' and domaine is None:
                domaine = (g.id, g.libelle)
            if g.type_groupe == 'secteur_source':
                secteur = (g.id, _nettoyer_libelle_secteur_nsec(g.libelle))
                break
            g = groupes.get(g.parent_id)
            garde_fou += 1
        resultat[metier_id] = {"secteur": secteur, "domaine": domaine}
    return resultat


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
        {"code": s.code_source or s.code, "libelle": _nettoyer_libelle_secteur_nsec(s.libelle)}
        for s in GroupeMetier.objects.filter(type_groupe='secteur_source').order_by('libelle')
    ]
    secteurs = trier_secteurs(_dedupliquer_secteurs(secteurs))
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


FAMILLES_FORMATION = {
    'superieur': 'Enseignement supérieur',
    'formation_professionnelle': 'Formation professionnelle',
    'scolaire': 'Enseignement moyen et secondaire',
    'certification': 'Certifications et attestations',
    'theme': 'Thèmes généraux TafTech',
    'autre': 'Autres diplômes',
}

# Niveau d'études (Scolarite, 1ʳᵉ étape de la cascade) -> familles de diplômes proposées ensuite.
# Liste vide = aucun diplôme à renseigner (le niveau seul suffit, sans score négatif : table
# Scolarite.usage). Le baccalauréat reste un diplôme séparé du niveau « secondaire ».
FAMILLES_PAR_NIVEAU_ETUDES = {
    'SC-SANS': [],
    'SC-PRIM': [],
    'SC-MOY': ['scolaire'],
    'SC-SEC': ['scolaire'],
    'SC-FP': ['formation_professionnelle', 'certification'],
    'SC-SUP': ['superieur', 'autre'],
    'SC-AUTRE': ['superieur', 'formation_professionnelle', 'scolaire', 'certification', 'autre'],
}

# Types de diplôme exclus d'un niveau malgré sa famille : la famille « enseignement moyen et
# secondaire » réunit BEM, BEF et Baccalauréat, mais un élève de collège (SC-MOY) n'a pas le
# baccalauréat. Le niveau secondaire (SC-SEC) garde les trois (un lycéen a déjà son BEM).
TYPES_EXCLUS_PAR_NIVEAU_ETUDES = {
    'SC-MOY': ['D-BAC'],
}


def famille_formation(systeme):
    """Regroupe les `systeme` du référentiel en familles qui ne doivent jamais être mélangées dans
    une même liste (point 8, 12/10/2026) : enseignement supérieur, formation professionnelle,
    enseignement moyen/secondaire (BEM, BEF, Baccalauréat), certifications et attestations,
    thèmes généraux TafTech (regroupements éditoriaux v1), autres (paramédical, ENS...)."""
    systeme = systeme or ''
    if systeme.startswith('superieur') or systeme == 'postgraduation_sante':
        return 'superieur'
    if systeme == 'formation_professionnelle':
        return 'formation_professionnelle'
    if systeme.startswith('scolaire'):
        return 'scolaire'
    if systeme in ('certification', 'formation_continue'):
        return 'certification'
    if systeme == 'theme_taftech':
        return 'theme'
    return 'autre'


def construire_index_competences():
    """Index {libellé ou synonyme normalisé -> CompetenceReferentiel}, commun à l'offre et au
    candidat (point 10, 12/10/2026) : « Project Management » et « Gestion de projet » mènent à la
    MÊME compétence, ce qui rend le score réellement comparable. Un libellé canonique l'emporte
    toujours sur un synonyme d'une autre compétence. À construire une fois puis réutiliser."""
    from .models import CompetenceReferentiel

    # Point 11 : seules les compétences officielles (validées, ou désactivées mais encore connues)
    # servent à normaliser une saisie — une simple suggestion ou une rejetée ne rattache rien.
    refs = list(CompetenceReferentiel.objects.filter(
        statut__in=CompetenceReferentiel.STATUTS_RECONNUS).order_by('id'))
    index = {}
    for ref in refs:
        index.setdefault(normaliser_recherche(ref.label), ref)
    for ref in refs:
        for synonyme in re.split(r"[,;|]", ref.synonymes or ""):
            cle = normaliser_recherche(synonyme)
            if cle:
                index.setdefault(cle, ref)
    return index


def resoudre_competence_ref(label, index=None):
    """CompetenceReferentiel correspondant à `label` (libellé ou synonyme, accents/casse ignorés),
    ou None — jamais de rapprochement approximatif. `index` : résultat de
    `construire_index_competences()` pour éviter une requête par compétence."""
    cle = normaliser_recherche(label or "")
    if not cle:
        return None
    return (index if index is not None else construire_index_competences()).get(cle)


SEUIL_PROPOSITION_COMPETENCE = 3  # nombre minimal d'offres distinctes pour proposer (un candidat suffit)


def cles_competences_connues():
    """Clés normalisées (libellés + synonymes) de TOUTES les compétences du référentiel, quel que
    soit leur statut : une suggestion, une rejetée ou une désactivée ne sont jamais re-proposées."""
    from .models import CompetenceReferentiel

    connues = set()
    for ref in CompetenceReferentiel.objects.all():
        connues.add(normaliser_recherche(ref.label))
        for synonyme in re.split(r"[,;|]", ref.synonymes or ""):
            if normaliser_recherche(synonyme):
                connues.add(normaliser_recherche(synonyme))
    return connues


def suggerer_competence(label, connues=None):
    """Enregistre `label` comme compétence SUGGÉRÉE dès la première saisie d'un candidat hors
    référentiel (15/10/2026) : l'admin la voit dans « Compétences > Suggérées » et décide. Aucun
    effet avant sa décision (ni score, ni parser, ni suggestions : seules les VALIDÉES servent).
    Ne crée rien si le libellé ou un synonyme existe déjà (quel que soit le statut) ou si les règles
    anti-bruit du parser le refusent (chiffres, phrases…). `connues` : résultat de
    `cles_competences_connues()` à réutiliser pour plusieurs libellés (mis à jour ici).
    Retourne la compétence créée, sinon None."""
    from .cv_parser.competences import _est_competence_valide
    from .models import CompetenceReferentiel

    label = (label or "").strip()[:100]
    cle = normaliser_recherche(label)
    if connues is None:
        connues = cles_competences_connues()
    if not cle or cle in connues or not _est_competence_valide(label):
        return None
    competence, creee = CompetenceReferentiel.objects.get_or_create(
        label=label,
        defaults={'statut': CompetenceReferentiel.STATUT_SUGGEREE, 'origine': 'PROPOSITION_AUTO'},
    )
    connues.add(cle)
    return competence if creee else None


def proposer_competences_frequentes(seuil=SEUIL_PROPOSITION_COMPETENCE, simuler=False):
    """Détecte les compétences saisies hors référentiel par au moins `seuil` candidats/offres
    distincts et les enregistre comme SUGGÉRÉES (jamais validées automatiquement : elles
    attendent une décision de l'admin, point 11). Ne propose pas : un sigle ou un libellé déjà
    présent dans le référentiel quel que soit son statut (une compétence rejetée n'est pas
    re-proposée), ni ce que les règles anti-bruit du parser refusent (chiffres, phrases…).
    Retourne la liste [{label, nb_candidats, nb_offres}] des propositions créées (ou simulées)."""
    from collections import Counter, defaultdict
    from .cv_parser.competences import _est_competence_valide
    from .models import CompetenceCandidat, CompetenceOffre, CompetenceReferentiel

    connus = cles_competences_connues()

    candidats_par_cle, offres_par_cle = defaultdict(set), defaultdict(set)
    graphies = defaultdict(Counter)
    for profil_id, label in CompetenceCandidat.objects.filter(competence_ref__isnull=True).values_list('profil_id', 'label'):
        cle = normaliser_recherche(label)
        candidats_par_cle[cle].add(profil_id)
        graphies[cle][label.strip()] += 1
    for offre_id, label in CompetenceOffre.objects.filter(competence_ref__isnull=True).values_list('offre_id', 'label'):
        cle = normaliser_recherche(label)
        offres_par_cle[cle].add(offre_id)
        graphies[cle][label.strip()] += 1

    propositions = []
    for cle, comptes in graphies.items():
        if not cle or cle in connus:
            continue
        nb_cand, nb_off = len(candidats_par_cle[cle]), len(offres_par_cle[cle])
        # Une saisie de candidat suffit (15/10/2026) ; le seuil ne s'applique qu'aux offres seules.
        if nb_cand < 1 and nb_cand + nb_off < seuil:
            continue
        label = comptes.most_common(1)[0][0][:100]
        if not _est_competence_valide(label) or CompetenceReferentiel.objects.filter(label__iexact=label).exists():
            continue
        propositions.append({'label': label, 'nb_candidats': nb_cand, 'nb_offres': nb_off})
        if not simuler:
            CompetenceReferentiel.objects.create(
                label=label, statut=CompetenceReferentiel.STATUT_SUGGEREE, origine='PROPOSITION_AUTO')
    return propositions


def rattacher_competences_orphelines():
    """Rattache au référentiel les compétences d'offres et de candidats encore sans lien (libellé
    ou synonyme exact). À appeler quand le référentiel change (compétence ou synonyme ajouté par
    l'admin, import) pour que le score reste comparable. Idempotent ; retourne le nombre de liens
    posés."""
    from .models import CompetenceCandidat, CompetenceOffre

    index = construire_index_competences()
    total = 0
    for modele in (CompetenceOffre, CompetenceCandidat):
        for ligne in modele.objects.filter(competence_ref__isnull=True).only('id', 'label'):
            ref = resoudre_competence_ref(ligne.label, index)
            if ref:
                modele.objects.filter(pk=ligne.pk).update(competence_ref=ref)
                total += 1
    return total


_ABREVIATIONS = {
    "rh": "ressources humaines",
    "drh": "directeur ressources humaines",
    "daf": "directeur administratif financier",
}


def developper_abreviations(texte_normalise):
    """Remplace les abréviations métier courantes (mots entiers, texte déjà normalisé) par leur
    forme longue : « gestionnaire rh » -> « gestionnaire ressources humaines ». Sans ça, « rh »
    (moins de 4 lettres) était ignoré des recherches par mots-clés et un intitulé comme
    « Gestionnaire RH » se rattachait au premier « Gestionnaire … » venu (point 7, 12/10/2026)."""
    if not texte_normalise:
        return texte_normalise
    return " ".join(_ABREVIATIONS.get(mot, mot) for mot in texte_normalise.split())


def resoudre_metier_depuis_texte(*textes):
    """Rattache un intitulé de poste à son Metier canonique, SANS jamais deviner
    (REGLES_MATCHING R02/F02 du client, point 7 de la liste de corrections finales).

    Seule une appellation dont la clé de recherche est EXACTEMENT l'intitulé normalisé
    (casse, accents, ponctuation ignorés) est acceptée, et seulement si toutes les
    appellations exactes mènent au même métier canonique. Sinon None : le recruteur
    choisit alors le métier de référence dans la liste (l'intitulé public reste libre).

    L'ancienne version votait à la fréquence des mots (4+ lettres) trouvés par `icontains` :
    « Gestionnaire RH » (« RH » ignoré car trop court) était rattaché à « Assistant en
    ressources humaines »."""
    texte = normaliser_recherche(" ".join(t for t in textes if t))
    if not texte:
        return None
    appellations = list(
        Appellation.objects.filter(cle_recherche=texte, actif=True, metier__selectionnable=True)
        .select_related('metier', 'metier__metier_canonique')[:20]
    )
    metiers = {(a.metier.metier_canonique or a.metier).id: (a.metier.metier_canonique or a.metier) for a in appellations}
    if len(metiers) > 1:
        # Même appellation portée par plusieurs métiers (ex. « Chargé de recrutement » :
        # métier ANEM large + métier TafTech précis). Seul le métier qui porte exactement
        # ce libellé est retenu ; sinon on s'abstient.
        homonymes = [m for m in metiers.values() if normaliser_recherche(m.libelle) == texte]
        if len(homonymes) != 1:
            return None
        return homonymes[0]
    if len(metiers) != 1:
        return None
    return next(iter(metiers.values()))


_MOTS_GENERIQUES_DIPLOME = {"diplome", "formation", "professionnel", "professionnelle", "degree"}


def _singulariser(mot):
    """Singulier naïf ("informatiques" -> "informatique") — le pluriel français le plus
    courant est un simple 's' final. Sans ça, un intitulé déclaré au pluriel
    ("Informatiques") ne matchait jamais un libellé du référentiel au singulier
    ("Informatique"), un mot ne matchait pas non plus son pluriel dans l'autre sens —
    bug réel : "Licence en Informatique" tombait sur l'unique spécialité contenant le
    mot exact "informatique" ("Statistique et traitement informatique des données")
    au lieu de "Systèmes Informatiques" (bien plus pertinent, mais au pluriel), faute
    de correspondance exacte. Garde-fou : jamais sur un mot déjà court (perte de sens,
    ex: "gaz"/"bus") ni se terminant par un double 's' (ex: "processus")."""
    if len(mot) > 4 and mot.endswith("s") and not mot.endswith("ss"):
        mot = mot[:-1]
    # Féminin ("internationale" -> "international", "humaine" -> "humain") : appliqué des
    # deux côtés (texte du candidat ET libellé du référentiel), donc toujours symétrique.
    if len(mot) > 6 and mot.endswith("e"):
        mot = mot[:-1]
    return mot


def _mots_singularises(texte):
    return {_singulariser(m) for m in re.findall(r"\w+", normaliser_recherche(texte))}


def _specialite_par_alias_exact(type_diplome, texte):
    """Spécialité dont un alias (ex. ajouté lorsqu'une demande d'ajout est rattachée) correspond EXACTEMENT
    au texte (accents et casse ignorés), à condition que le couple diplôme + spécialité soit attesté
    (jamais hors référentiel, F06). Sinon None."""
    from .models import AliasSpecialite, DiplomeSpecialite

    cle = normaliser_recherche(texte)
    if not cle:
        return None
    for alias in AliasSpecialite.objects.filter(cle_recherche=cle).select_related('specialite').order_by('id'):
        if DiplomeSpecialite.objects.filter(diplome=type_diplome, specialite=alias.specialite, selectionnable=True).exists():
            return alias.specialite
    return None


def _resoudre_specialite_pour_diplome(type_diplome, mots, texte=None):
    """Spécialité la plus proche parmi les couples `DiplomeSpecialite` attestés pour ce
    diplôme (jamais hors référentiel, F06) — factorisé pour être réutilisé par la
    résolution par mots-clés ET par le repli IA ci-dessous.

    Un score de 1 seul mot commun est trop peu fiable pour être accepté seul — un mot
    isolément large mais peu signifiant ("sciences", "gestion"...) partagé par une
    poignée de libellés sans rapport suffisait à faire remonter une spécialité
    aberrante par défaut de tout autre candidat (bug réel : "Master en Sciences de
    Gestion, option Ressources Humaines" résolu en "Sciences De La Mer", le seul
    candidat où "sciences" apparaissait pour ce diplôme). Un score >= 2 (au moins deux
    mots distincts partagés) reste accepté tel quel — c'est ce qui permet à un
    intitulé complet type "Management des Ressources Humaines" de l'emporter
    clairement même si chacun de ses mots pris séparément (management/ressources/
    humaines) est aussi partagé par quelques autres spécialités du même diplôme.

    Quand plusieurs spécialités sont à égalité de score (cas fréquent : des intitulés
    de spécialité proches partagent souvent 1-2 mots, ex: "Modèles Intelligents Et
    Décision" / "Modélisation, optimisation et aide à la décision" / "Sciences de
    données et aide à la décision" partagent tous "décision") et que `texte` (l'intitulé
    complet déclaré par le candidat) est fourni, l'IA tranche entre CES candidats
    précis uniquement — jamais un choix hors de cette liste restreinte."""
    from .models import DiplomeSpecialite

    if texte:
        exacte = _specialite_par_alias_exact(type_diplome, texte)
        if exacte is not None:
            return exacte

    def _candidats(queryset):
        trouves = []
        for c in queryset.select_related('specialite'):
            lib_mots = _mots_singularises(c.specialite.libelle)
            score = sum(1 for m in mots if len(m) >= 4 and m in lib_mots)
            if score >= 2:
                # À score égal, préférer la spécialité dont le libellé est le plus entièrement
                # couvert par le texte ("Commerce international" avant "Finance et commerce
                # international" pour "Commerce et Affaires Internationales").
                non_couverts = sum(1 for m in lib_mots if len(m) >= 4 and m not in mots)
                trouves.append((score, -non_couverts, c.specialite))
        return trouves

    spec_candidats = _candidats(DiplomeSpecialite.objects.filter(diplome=type_diplome, selectionnable=True))
    if not spec_candidats and type_diplome.code.count("-") >= 2:
        # Aucune spécialité attestée pour CETTE variante (ex: "Master professionnel" n'a pas
        # de spécialité RH dans le référentiel, seul "Master académique" en a) : la spécialité
        # est un sujet indépendant du régime du diplôme, on cherche dans la même famille
        # (D-MAS-*, D-LIC-*). Sans ce repli le champ Spécialité restait vide.
        famille = type_diplome.code.rsplit("-", 1)[0] + "-"
        spec_candidats = _candidats(
            DiplomeSpecialite.objects.filter(diplome__code__startswith=famille, selectionnable=True).exclude(diplome=type_diplome)
        )
    if not spec_candidats:
        return None
    spec_candidats.sort(key=lambda c: (-c[0], -c[1]))
    meilleur = (spec_candidats[0][0], spec_candidats[0][1])
    meilleures = [c[2] for c in spec_candidats if (c[0], c[1]) == meilleur]
    if len(set(normaliser_recherche(s.libelle) for s in meilleures)) == 1:
        return min(meilleures, key=lambda s: s.id)  # homonymes exacts : le plus ancien
    if texte:
        return _resoudre_specialite_via_ia(texte, meilleures)
    return None


def _resoudre_specialite_via_ia(texte, candidates):
    """Départage l'IA entre un petit nombre de spécialités déjà à égalité de score
    (jamais parmi les ~967 spécialités du référentiel entier — uniquement celles
    remontées par le matching par mots-clés). Un index absent/invalide = abstention,
    jamais une spécialité hors de cette liste restreinte. Best-effort, comme le repli
    diplôme : toute erreur retombe silencieusement sur None."""
    from .ai_engine import call_ai

    liste = "\n".join(f"{i}: {c.libelle}" for i, c in enumerate(candidates))
    prompt = (
        "Un candidat a déclaré cet intitulé de formation sur son CV : "
        f"\"{texte}\"\n\n"
        "Plusieurs spécialités du référentiel correspondent également bien à cet "
        "intitulé. Choisis, UNIQUEMENT parmi la liste ci-dessous, celle qui correspond "
        f"le mieux :\n\n{liste}\n\n"
        "Réponds en JSON strict, rien d'autre : "
        '{"index": <numéro entier de la liste ci-dessus, ou -1 si aucune ne convient '
        "clairement mieux qu'une autre>}"
    )
    try:
        content = call_ai(
            [{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0,
            response_format={"type": "json_object"},
        )
        data = json.loads(content)
        idx = data.get("index")
        if isinstance(idx, int) and 0 <= idx < len(candidates):
            return candidates[idx]
    except Exception:
        logger.warning("Départage IA spécialité échoué pour %r", texte, exc_info=True)
    return None


def _resoudre_diplome_via_ia(texte):
    """Dernier recours quand la recherche par mots exacts ne trouve rien d'utilisable
    (intitulé mal formulé, faute de frappe non couverte par corriger_mots_flous, diplôme
    étranger formulé différemment...) — demande à l'IA de choisir le `TypeDiplome` le
    plus proche PARMI LA LISTE RÉELLE du référentiel, jamais un diplôme halluciné hors
    de cette liste. Un index absent/invalide/hors-liste = abstention (F02/F06), jamais
    un choix par défaut. Best-effort : toute erreur (quota, réseau, JSON invalide)
    retombe silencieusement sur None — ce repli ne doit jamais faire échouer tout le
    parsing du CV."""
    from .ai_engine import call_ai
    from .models import TypeDiplome

    # "D-AUTRE" (le placeholder générique "Autre diplôme — préciser") est exclu de la liste
    # proposée à l'IA — bug réel constaté : privée de tout candidat pertinent, l'IA se
    # rabattait sur ce placeholder ("le moins faux"), ce qui renvoie littéralement le
    # candidat au point de départ ("Autre") au lieu d'une vraie abstention (-1).
    types = list(TypeDiplome.objects.exclude(code='D-AUTRE').order_by('libelle'))
    if not types:
        return None
    liste = "\n".join(f"{i}: {t.libelle}" for i, t in enumerate(types))
    prompt = (
        "Un candidat a déclaré ce diplôme sur son CV, en texte libre : "
        f"\"{texte}\"\n\n"
        "Choisis, UNIQUEMENT parmi la liste ci-dessous (référentiel officiel de diplômes "
        "scolaires/universitaires/professionnels reconnus par un employeur), l'entrée qui "
        "correspond RÉELLEMENT à ce diplôme précis.\n\n"
        "IMPORTANT — sois strict, pas complaisant : cette liste contient des catégories "
        "génériques (ex: \"Certification professionnelle\", \"Attestation de formation\") qui "
        "PEUVENT sembler s'appliquer à presque n'importe quoi si tu cherches une case où faire "
        "rentrer l'intitulé de force. Ne les choisis QUE si l'intitulé décrit vraiment une "
        "certification/attestation professionnelle reconnue dans un contexte d'emploi — jamais "
        "pour un loisir, un sport, un permis ou une activité personnelle (ex: un brevet de "
        "plongée, un permis de chasse, un diplôme d'auto-école) qui n'a pas sa place dans un "
        "référentiel de diplômes pour le recrutement. Dans le doute, réponds -1 : une mauvaise "
        "correspondance imposée au candidat est pire qu'une absence de correspondance.\n\n"
        f"{liste}\n\n"
        "Réponds en JSON strict, rien d'autre : "
        '{"index": <numéro entier de la liste ci-dessus, ou -1 si aucune entrée ne '
        'correspond réellement>}'
    )
    try:
        content = call_ai(
            [{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0,
            response_format={"type": "json_object"},
        )
        data = json.loads(content)
        idx = data.get("index")
        if isinstance(idx, int) and 0 <= idx < len(types):
            return types[idx]
    except Exception:
        logger.warning("Résolution diplôme via IA échouée pour %r", texte, exc_info=True)
    return None


def resoudre_specialite_depuis_texte(diplome_id, texte):
    """Résout uniquement la spécialité (le type de diplôme est déjà connu/confirmé) —
    utilisé quand le candidat tape "Autre, préciser" spécifiquement sur le champ Spécialité
    (le Type de diplôme, lui, est soit déjà résolu, soit "Autre" mais sans texte propre à
    exploiter). Même logique de mots-clés + fallback IA (départage) que
    `_resoudre_specialite_pour_diplome`, restreinte aux couples `DiplomeSpecialite` de ce
    diplôme précis (jamais hors référentiel, F06)."""
    from .models import TypeDiplome

    if not texte or not diplome_id:
        return None
    try:
        type_diplome = TypeDiplome.objects.get(pk=diplome_id)
    except TypeDiplome.DoesNotExist:
        return None
    t = normaliser_recherche(texte)
    mots = [_singulariser(m) for m in re.findall(r"\w+", t) if len(m) >= 3 and m not in _MOTS_GENERIQUES_DIPLOME]
    if not mots:
        return None
    return _resoudre_specialite_pour_diplome(type_diplome, mots, texte)


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
    from .models import TypeDiplome, AliasDiplome

    if not texte:
        return None, None
    t = normaliser_recherche(texte)
    mots = [_singulariser(m) for m in re.findall(r"\w+", t) if len(m) >= 3 and m not in _MOTS_GENERIQUES_DIPLOME]
    if not mots:
        return None, None

    if re.match(r"\s*(formation|stage|atelier|seminaire|session|cycle)\b", t) and not re.search(
        r"\b(master|licence|doctorat|ingenieur|magister|bts|dut|baccalaureat|bac|cap|deua|mba|technicien)\b", t
    ):
        # Formation courte sans diplôme : "Attestation de formation", pas une certification d'éditeur.
        attest = TypeDiplome.objects.filter(code='D-ATTEST').first()
        if attest:
            return attest, None

    candidats = []
    for td in TypeDiplome.objects.all():
        lib_mots = _mots_singularises(td.libelle)
        score = sum(1 for m in mots if m in lib_mots)
        if score:
            candidats.append((score, td))
    for al in AliasDiplome.objects.select_related('diplome'):
        lib_mots = _mots_singularises(al.cle_recherche)
        score = sum(1 for m in mots if m in lib_mots)
        if score:
            candidats.append((score, al.diplome))
    if not candidats:
        # Aucun mot ne matche le référentiel par recherche exacte (intitulé mal formulé,
        # faute de frappe non couverte, formulation étrangère...) — plutôt qu'un champ
        # vide que le candidat devrait forcément remplir à la main, on demande à l'IA de
        # se rapprocher du diplôme le plus proche parmi ceux réellement disponibles.
        if re.match(r"\s*(formation|stage|atelier|seminaire|session|cycle)\b", t):
            # Formation courte sans diplôme : "Attestation de formation", pas une
            # certification d'éditeur.
            attest = TypeDiplome.objects.filter(code='D-ATTEST').first()
            if attest:
                return attest, None
        type_diplome = _resoudre_diplome_via_ia(texte)
        if not type_diplome:
            return None, None
        return type_diplome, _resoudre_specialite_pour_diplome(type_diplome, mots, texte)
    candidats.sort(key=lambda c: -c[0])
    meilleur_score = candidats[0][0]
    meilleurs = [c[1] for c in candidats if c[0] == meilleur_score]
    if len(set(m.id for m in meilleurs)) > 1:
        # Ambiguïté entre variantes d'un même diplôme (ex: "Licence" seul matche à égalité
        # Licence académique/professionnelle/ancien système classique/non précisée) — le
        # référentiel prévoit justement une entrée "non précisée" (code se terminant par
        # -NP, ex: D-LIC-NP/D-MAS-NP/D-DOC-NP) pour ce cas exact. Un candidat qui écrit
        # juste "Licence"/"Master"/"Doctorat" sans préciser le régime mérite ce niveau
        # générique plutôt qu'un champ vide qu'il devra forcément remplir à la main — F02
        # préfère un référentiel réel même générique à une absence de donnée. Réservé aux
        # cas où l'ambiguïté porte UNIQUEMENT sur la variante d'un même diplôme (même
        # préfixe de code, ex: "D-LIC-*") — une vraie ambiguïté entre familles différentes
        # (codes sans préfixe commun) passe par le repli IA plutôt qu'une abstention pure.
        # Le 1er mot de l'intitulé désigne presque toujours le diplôme ("Master ...",
        # "Licence ...") : à égalité, on écarte les candidats parasites qui ne partagent
        # qu'un mot secondaire avec un autre diplôme.
        if mots:
            famille = [m for m in meilleurs if mots[0] in _mots_singularises(m.libelle)]
            if famille:
                meilleurs = famille
        prefixes = {"-".join(m.code.split("-")[:-1]) for m in meilleurs}
        prefixe_unique = next(iter(prefixes)) if len(prefixes) == 1 else None
        # Cas "Master"/"Licence"/"Doctorat" seul (ex: "Master en Informatique" sans
        # préciser académique/pro) : le régime académique (ou son équivalent le plus
        # standard/répandu) l'emporte largement en Algérie pour un diplôme universitaire
        # classique — décision produit, préférer une variante concrète à "-NP" (non
        # précisée) dès qu'une variante par défaut existe pour la famille en question.
        # Le Doctorat n'a pas de variante "-A" dans le référentiel (research-only par
        # nature) — son équivalent est "-LMD" (le système actuel, standard depuis la
        # réforme LMD), pas "-SCI" (ancien système, en voie de disparition). Repli sur
        # "-NP" uniquement si aucun défaut n'existe pour cette famille précise.
        suffixe_defaut = "-LMD" if prefixe_unique == "D-DOC" else "-A"
        # Indice explicite dans l'intitulé : "professionnalisant/professionnel" -> variante
        # professionnelle ; "recherche" -> académique (déjà le défaut).
        if prefixe_unique and re.search(r"\bprofessionnalis|\bprofessionnel", t):
            suffixe_defaut = "-P"
        defaut_candidat = (
            next((m for m in meilleurs if m.code == f"{prefixe_unique}{suffixe_defaut}"), None)
            if prefixe_unique else None
        )
        np_candidat = defaut_candidat or (
            next((m for m in meilleurs if m.code.endswith("-NP")), None) if prefixe_unique else None
        )
        if not np_candidat:
            type_diplome = _resoudre_diplome_via_ia(texte)
            if not type_diplome:
                return None, None  # vraiment ambigu, même l'IA n'a pas su trancher
        else:
            type_diplome = np_candidat
    else:
        type_diplome = meilleurs[0]

    return type_diplome, _resoudre_specialite_pour_diplome(type_diplome, mots, texte)


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
