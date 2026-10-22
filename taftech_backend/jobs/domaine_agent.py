"""Agent IA dédié à la classification du Metier (référentiel v2) d'une expérience
professionnelle.

Remplace l'ancien classifieur de Domaine ANEM (session 19/07/2026) — le système
NAME/Secteur/Domaine/SousDomaine/MetierReferentiel a été retiré (cutover complet,
session 18/09/2026). Séparé du parsing CV (qui extrait 10 choses différentes en un
seul appel Groq surchargé) car la précision de ce code conditionne directement le
score de matching.

Différence structurante avec l'ancien agent : le référentiel v2 compte 1038 métiers
(contre 87 domaines) — bien trop pour tenir dans un prompt sous forme de liste
complète. L'agent ne choisit donc plus dans une liste exhaustive : il choisit
UNIQUEMENT parmi les appellations réelles trouvées par recherche de mots-clés (RAG,
`_candidats_pour_experience`), ou s'abstient si aucune ne correspond clairement —
jamais un choix à l'aveugle parmi les 1038 métiers jamais montrés (REGLES_MATCHING
R02 du client : ambiguïté → proposer les choix trouvés, ne jamais réécrire/deviner)."""
import logging
import re

from django.db.models import Q

from .models import Appellation
from .referentiel_utils import normaliser_recherche, corriger_mots_flous, developper_abreviations, _singulariser

logger = logging.getLogger(__name__)

SPECIALITE_INDEX = -1  # clé de retour réservée à la spécialité du profil dans le dict résultat

_MOTS_MIN_LEN = 4
# Mots techniques de 3 lettres qui qualifient un métier (« développeur web ») : gardés malgré leur longueur.
_MOTS_COURTS_UTILES = {"web", "sql", "sap", "erp", "cao", "dao", "bim", "api"}

# Mots trop génériques dans un titre de poste pour servir seuls d'indice de matching —
# "ingénieur"/"cadre"/"chargé" seuls correspondent à des milliers d'appellations sans
# rapport et biaisaient le RAG vers les premières fiches trouvées en base.
_MOTS_GENERIQUES = {
    "ingenieur", "cadre", "charge", "chargee", "responsable", "agent", "technicien",
    "directeur", "directrice", "chef", "assistant", "assistante", "employe", "employee",
    "operateur", "operatrice", "administratif", "administrative", "developpement",
    "gestion", "operations", "activites", "service", "national", "general", "generale",
    "professionnel", "professionnelle", "poste", "travail", "expert", "experte",
    # Statut, pas métier : « Stagiaire en Informatique » se classe sur « informatique ».
    "stagiaire", "stagiaires", "stage", "stages",
}


_POIDS_MOT_TITRE = 3.0  # un mot du titre du poste est un signal bien plus fort/spécifique
_POIDS_MOT_DESCRIPTION = 1.0  # qu'un mot noyé dans les missions (souvent générique/verbal)


def _mots_pertinents(texte):
    """Mots significatifs (>=4 lettres, hors mots génériques, corrigés du flou N04) d'un
    texte — factorisé pour appliquer exactement le même filtrage au titre et à la
    description avant de les pondérer séparément."""
    texte_long = developper_abreviations(normaliser_recherche(texte or ""))  # « RH » -> « ressources humaines »
    tous_mots = [m for m in re.findall(r"\w+", texte_long) if len(m) >= _MOTS_MIN_LEN or m in _MOTS_COURTS_UTILES]
    mots = [m for m in tous_mots if m not in _MOTS_GENERIQUES]
    return corriger_mots_flous(mots) if mots else []  # N04 : flou Levenshtein<=1, exact d'abord


_MOTS_ENCADREMENT = {
    "responsable", "chef", "cheffe", "directeur", "directrice", "manager", "management",
    "superviseur", "superviseuse", "encadrement", "encadrant", "encadrante",
}


def _evoque_encadrement(*textes):
    """Vrai si l'un des textes contient un mot d'encadrement ou de direction."""
    return any(_MOTS_ENCADREMENT & set(re.findall(r"\w+", normaliser_recherche(t or ""))) for t in textes)


def _candidats_pour_experience(titre_poste, description, limite=10):
    """Appellations réelles (référentiel v2) dont le libellé partage des mots
    significatifs avec le poste/la description — sert d'indice concret à l'IA plutôt
    que de la laisser deviner dans le vide. Triées par pertinence : un mot du TITRE
    (signal fort, ex: "développeur") pèse bien plus qu'un mot de la description (souvent
    un verbe d'action générique, ex: "maintenance" dans "monitoring, maintenance et
    débogage") — sans cette pondération, une appellation de maintenance industrielle
    partageant un seul mot de description pouvait l'emporter sur l'appellation
    "développeur" réellement correcte, faute de tout autre signal de spécificité (bug
    réel constaté : "Développeur N8N" classé en "Maintenance informatique et
    bureautique")."""
    mots_titre = _mots_pertinents(titre_poste)
    mots_desc = _mots_pertinents(description)
    poids = {m: _POIDS_MOT_TITRE for m in mots_titre}
    for m in mots_desc:
        poids[m] = max(poids.get(m, 0.0), _POIDS_MOT_DESCRIPTION) if m in poids else _POIDS_MOT_DESCRIPTION
    # Un mot présent à la fois dans le titre et la description reste au poids fort du
    # titre (déjà géré par le max ci-dessus) — jamais additionné, pour ne pas fausser le
    # score par simple répétition du même mot.
    mots = list(poids.keys())
    # Si le titre ET la description sont entièrement génériques (ex: "Cadre administratif"),
    # aucun indice fiable — mieux vaut ne rien suggérer que suggérer au hasard.
    if not mots:
        return []
    q = Q()
    for mot in mots:
        q |= Q(cle_recherche__icontains=_singulariser(mot))  # le singulier est contenu dans le pluriel
    pool = list(
        Appellation.objects.filter(q, actif=True, metier__selectionnable=True)
        .select_related('metier', 'metier__metier_canonique')
        .values_list('libelle', 'metier__id', 'metier__libelle', 'metier__metier_canonique_id', 'id')
        .distinct()
    )
    # Pas de plafond sur le pool : couper à N lignes dans un ordre arbitraire écartait les
    # bonnes appellations (ex: RH) avant leur notation dès que la description contenait
    # beaucoup de mots courants (bug réel : "Cheffe de Département Administration des RH"
    # proposée uniquement avec des "Chef de département" industriels). ~7 400 appellations
    # au total : le coût de tout lire est négligeable.

    def _score(libelle):
        # Comparaison au singulier : « applications » ↔ « application ».
        libelle_mots = {_singulariser(m) for m in re.findall(r"\w+", normaliser_recherche(libelle))}
        score = sum(poids[m] for m in mots if _singulariser(m) in libelle_mots)
        # Bonus de couverture : une appellation qui contient TOUS les mots du titre passe
        # devant celles qui n'en partagent qu'un (« Gestionnaire … » hors RH).
        if mots_titre and all(_singulariser(m) in libelle_mots for m in mots_titre):
            score += _POIDS_MOT_TITRE * len(mots_titre)
        return score

    pool_scores = [(lib, mid, mlib, canon_id, _score(lib), app_id) for lib, mid, mlib, canon_id, app_id in pool]
    pool_scores = [item for item in pool_scores if item[4] > 0]
    # À score égal, l'appellation la plus concise (la plus proche de l'intitulé) passe en premier :
    # « Développeur web » avant « Développeur d'application » pour « Développeur d'applications web ».
    pool_scores.sort(key=lambda item: (-item[4], len(re.findall(r"\w+", item[0]))))
    # Sans encadrement évoqué par le poste ou ses missions, les appellations « Responsable / Chef /
    # Directeur… » ne sont pas proposées (« Chargé de paie » recevait « Responsable Paie ») ; si rien
    # d'autre ne correspond, on les garde plutôt que de renvoyer une liste vide.
    evoque_encadrement = _evoque_encadrement(titre_poste, description)

    def _construire(ecarter_encadrement):
        # (libelle_appellation, metier_id_canonique, libelle_metier, id_appellation)
        resultats = []
        vus = set()
        for lib, mid, mlib, canon_id, _, app_id in pool_scores:
            if ecarter_encadrement and _evoque_encadrement(lib):
                continue
            metier_id_final = canon_id or mid
            if metier_id_final in vus:
                continue
            vus.add(metier_id_final)
            resultats.append((lib, metier_id_final, mlib, app_id))
            if len(resultats) >= limite:
                break
        return resultats

    return _construire(not evoque_encadrement) or _construire(False)


_FEMININS_IRREGULIERS = {"hotesse": "hote", "cheffe": "chef", "maitresse": "maitre"}
_SUFFIXES_FEMININS = (("trice", "teur"), ("euse", "eur"))  # directrice→directeur, vendeuse→vendeur


def _forme_neutre(mot):
    """Mot normalisé ramené au singulier masculin : « hôtesses » et « hôte » se comparent comme
    un seul mot (sinon « Hôtesse de caisse » ne couvrait pas l'appellation « Hôte de Caisse »)."""
    from .referentiel_utils import _singulariser

    # Le féminin se traite AVANT `_singulariser`, qui retire aussi le « e » final (« hotesse » → « hotess »).
    if len(mot) > 4 and mot.endswith("s") and not mot.endswith("ss"):
        mot = mot[:-1]
    if len(mot) > 4 and mot.endswith("ee"):  # « spécialisée » → « spécialisé »
        mot = mot[:-1]
    if mot in _FEMININS_IRREGULIERS:
        return _FEMININS_IRREGULIERS[mot]
    for feminin, masculin in _SUFFIXES_FEMININS:
        if len(mot) >= 6 and mot.endswith(feminin):
            return mot[: -len(feminin)] + masculin
    return _singulariser(mot)


def _nettoyer_titre_poste(titre):
    """Retire ce qui n'est pas la fonction : parenthèses (« (Stage de Licence) ») et employeur ou lieu
    collé au poste (« … chez UNO - ES-SENIA », « … @ Société »). Le CV les glisse parfois dans le titre."""
    titre = re.sub(r"\([^)]*\)", " ", titre or "")
    return re.sub(r"\s+(?:chez|@)\s+.*$", "", titre, flags=re.IGNORECASE).strip()


def _titre_couvert_par(titre, libelle_appellation):
    """Garde-fou serveur : l'appellation choisie par l'IA doit couvrir une fonction entière du
    titre. Un titre composite (« Administrateur des ventes et support IT ») se découpe sur
    « et », « & », « , », « / » : couvrir UNE des fonctions suffit. Comparaison au singulier et au
    masculin (« applications » ↔ « application », « hôtesse » ↔ « hôte »), employeur et parenthèses
    du titre écartés. Un titre sans mot significatif n'est pas bloqué."""
    mots_libelle = {_forme_neutre(m) for m in re.findall(
        r"\w+", developper_abreviations(normaliser_recherche(libelle_appellation)))}
    fonctions = [_mots_pertinents(seg) for seg in re.split(
        r"\s+(?:et|&)\s+|[,/;]", _nettoyer_titre_poste(titre), flags=re.IGNORECASE)]
    fonctions = [mots for mots in fonctions if mots]
    if not fonctions:
        return True
    # Plus de la moitié des mots d'UNE fonction suffit (« Développeur web » couvre 2 mots sur 3 de
    # « Développeur d'applications web »). Une moitié exacte ne suffit pas : « Gestionnaire administratif
    # RH » ne doit pas passer pour « Gestionnaire recrutement ».
    return any(2 * sum(1 for m in mots if _forme_neutre(m) in mots_libelle) > len(mots) for mots in fonctions)


PROMPT_CLASSIFICATION = """Tu es un expert RH spécialisé dans la nomenclature des métiers utilisée par TAFTECH (Algérie).

Voici une liste d'expériences professionnelles extraites d'un CV, plus éventuellement un élément [PROFIL] qui représente le titre professionnel / la spécialité recherchée par le candidat (pas une expérience passée). Pour CHACUN, choisis, PARMI LES APPELLATIONS PROPOSÉES pour cet élément, celle qui correspond le mieux au MÉTIER RÉELLEMENT EXERCÉ OU RECHERCHÉ (titre + missions décrites), PAS au secteur d'activité de l'entreprise employeuse.

RÈGLES :
- Tu dois choisir UNIQUEMENT parmi les appellations listées pour chaque élément (identifiées par leur position dans la liste, ex: appellation n°2) — jamais un métier hors de cette liste, même s'il te semble plus juste : si aucune ne convient, réponds "" pour cet élément.
- Ignore le secteur de l'employeur si le métier exercé est transverse (ex: comptable dans une clinique = comptabilité, pas santé ; développeur chez un fabricant de véhicules = informatique, pas industrie).
- Ne choisis une appellation d'encadrement ou de direction (chef, directeur, responsable, manager, management) que si le titre ou les missions décrivent réellement un encadrement d'équipe. Sinon, préfère l'appellation d'exécution ou de spécialité la plus proche du titre (ex. « Gestionnaire de paie » pour un chargé de paie).
- Respecte le niveau hiérarchique du titre : un « Responsable », « Chef » ou « Directeur » reçoit, quand la liste en propose une qui convient, une appellation de même niveau (« Responsable … », « Chef de … ») ; ne le rétrograde pas en « Gestionnaire », « Assistant » ou « Agent ». Inversement, un titre d'exécution ne reçoit pas une appellation de direction.
- Si aucune appellation proposée ne correspond, ou si l'élément est trop vague (ex: "Stage", "Employé polyvalent" sans autre détail), réponds "" plutôt que de deviner au hasard.
- Exception : pour l'élément [PROFIL], ne réponds "" que si VRAIMENT aucune des appellations proposées ne convient — c'est le titre professionnel choisi par le candidat lui-même. Si ce titre combine plusieurs fonctions (ex: "Ingénieur IA et Cadre administratif"), classe-le selon la PREMIÈRE fonction mentionnée.

ÉLÉMENTS À CLASSER (avec leurs appellations candidates numérotées) :
{experiences_bloc}

FORMAT DE RÉPONSE EXIGÉ (JSON strict, un seul objet, rien d'autre avant/après) :
{{"classifications": [{{"index": 0, "appellation_choisie": 2, "raison": "1 phrase courte"}}]}}
(`appellation_choisie` = numéro de l'appellation choisie dans la liste proposée pour cet index, ou -1 si aucune ne convient)
"""


def _bloc_experience(i, titre_poste, description, candidats):
    lignes = [f"[{i}] Poste : {titre_poste or '(vide)'}"]
    if description:
        lignes.append(f"Missions : {description[:400]}")
    if candidats:
        for n, (lib, _metier_id, mlib, *_) in enumerate(candidats):
            lignes.append(f"  Appellation {n} : {lib} (métier : {mlib})")
    else:
        lignes.append("  Aucune appellation candidate trouvée.")
    return "\n".join(lignes)


def classifier_metiers_experiences(experiences, titre_professionnel=None):
    """Version historique : {index_appelant: metier_id} (voir `classifier_appellations_experiences`)."""
    return {
        cle: metier_id
        for cle, (metier_id, _appellation_id, _libelle) in classifier_appellations_experiences(
            experiences, titre_professionnel).items()
    }


def classifier_appellations_experiences(experiences, titre_professionnel=None):
    """Classe le Metier de chaque expérience (+ du profil global si fourni) via un
    appel Groq dédié, grounded exclusivement sur des appellations réelles trouvées par
    mots-clés (jamais un choix parmi les 1038 métiers du référentiel, jamais montrés).

    `experiences` : liste de dicts avec au moins titre_poste/description.
    `titre_professionnel` : si fourni, ajouté au batch comme premier élément [PROFIL].
    Retourne {index_appelant: (metier_id, id_appellation, libelle_appellation)} — l'entrée profil
    (si demandée) est sous la clé SPECIALITE_INDEX, les entrées d'expériences sous leur position dans
    `experiences` (0..n-1). N'inclut que les entrées où l'IA a choisi une appellation proposée.
    Le métier reste la clé du calcul ; l'appellation sert à l'affichage (R03 : une fiche métier regroupe
    plusieurs postes distincts)."""
    from .cv_parser import _call_groq, _extract_json_object  # import différé, évite le cycle

    if not experiences and not titre_professionnel:
        return {}

    from .confidentialite_ia import nettoyer_champ  # même nettoyage que partout avant l'IA

    decalage = 1 if titre_professionnel else 0
    blocs = []
    candidats_par_index = {}
    if titre_professionnel:
        titre_bloc = titre_professionnel
        candidats = _candidats_pour_experience(titre_professionnel, "")
        if not candidats and experiences and isinstance(experiences[0], dict):
            # Titre trop générique (« Ingénieur IA et cadre administratif ») : repli sur
            # l'expérience la plus récente, listée en premier dans un CV. L'IA reçoit le titre de
            # cette expérience : devant le titre composite elle répondait « aucune appellation ».
            titre_bloc = experiences[0].get('titre_poste') or titre_professionnel
            candidats = _candidats_pour_experience(titre_bloc, experiences[0].get('description', ''))
        candidats_par_index[0] = candidats
        blocs.append(_bloc_experience(0, f"[PROFIL] {nettoyer_champ(titre_bloc)}", "", candidats))
    for i, exp in enumerate(experiences):
        titre_poste = exp.get('titre_poste', '') if isinstance(exp, dict) else ''
        description = exp.get('description', '') if isinstance(exp, dict) else ''
        candidats = _candidats_pour_experience(titre_poste, description)  # local : valeurs brutes
        candidats_par_index[i + decalage] = candidats
        # Ce qui part vers l'IA est nettoyé : e-mails, téléphones, liens, adresses masqués.
        blocs.append(_bloc_experience(
            i + decalage, nettoyer_champ(titre_poste), nettoyer_champ(description), candidats))

    prompt = PROMPT_CLASSIFICATION.replace("{experiences_bloc}", "\n\n".join(blocs))

    content = _call_groq(prompt, max_tokens=2000, donnees_candidat="\n\n".join(blocs))
    infos = _extract_json_object(content)
    if not infos or not isinstance(infos.get('classifications'), list):
        logger.warning("Agent métier : réponse Groq invalide ou vide, fallback appelant.")
        return {}

    brut = {}
    for item in infos['classifications']:
        if not isinstance(item, dict):
            continue
        idx = item.get('index')
        choix = item.get('appellation_choisie')
        if not isinstance(idx, int) or not isinstance(choix, int) or choix < 0:
            continue
        candidats = candidats_par_index.get(idx, [])
        if 0 <= choix < len(candidats):
            # Garde-fou serveur (point 7) : le choix de l'IA n'est retenu que si l'appellation
            # choisie contient tous les mots significatifs du titre du poste (l'élément
            # [PROFIL], titre composite choisi par le candidat, en est exempté). Sinon le
            # métier reste vide : le candidat le renseigne via la liste de référence.
            if not (titre_professionnel and idx == 0):
                exp = experiences[idx - decalage]
                titre = exp.get('titre_poste', '') if isinstance(exp, dict) else ''
                if not _titre_couvert_par(titre, candidats[choix][0]):
                    continue
            # (metier_id, id_appellation, libelle_appellation) : le métier reste la clé du calcul, l'appellation
            # est conservée pour l'affichage (« Développeur web » plutôt que le métier qui la regroupe).
            brut[idx] = (candidats[choix][1], candidats[choix][3], candidats[choix][0])

    # Ramène les index à ceux attendus par l'appelant : SPECIALITE_INDEX pour le profil,
    # 0..n-1 pour les expériences (annule le décalage appliqué pour l'appel Groq).
    resultats = {}
    if titre_professionnel and 0 in brut:
        resultats[SPECIALITE_INDEX] = brut[0]
    for i in range(len(experiences)):
        if (i + decalage) in brut:
            resultats[i] = brut[i + decalage]
    return resultats
