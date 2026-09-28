import datetime
import difflib
import re
from django.db.models import Q

def normaliser(texte):
    if not texte:
        return ""
    return str(texte).strip().lower()


# ---------------------------------------------------------------------------
# Proximité géographique wilaya — valeurs réelles de WILAYAS_CHOICES
# ---------------------------------------------------------------------------
_REGIONS = [
    {"16 - alger", "09 - blida", "42 - tipaza", "35 - boumerdès", "44 - aïn defla"},
    {"31 - oran", "27 - mostaganem", "29 - mascara", "48 - relizane",
     "22 - sidi bel abbès", "13 - tlemcen", "46 - aïn témouchent", "45 - naâma"},
    {"25 - constantine", "23 - annaba", "24 - guelma", "21 - skikda",
     "36 - el tarf", "41 - souk ahras", "43 - mila"},
    {"19 - sétif", "34 - bordj bou arréridj", "28 - m'sila", "06 - béjaïa",
     "18 - jijel", "05 - batna", "40 - khenchela"},
    {"15 - tizi ouzou", "10 - bouira", "26 - médéa"},
    {"02 - chlef", "38 - tissemsilt", "14 - tiaret", "20 - saïda"},
    {"07 - biskra", "40 - khenchela", "04 - oum el bouaghi", "12 - tébessa"},
    {"08 - béchar", "45 - naâma", "32 - el bayadh", "37 - tindouf"},
    {"01 - adrar", "11 - tamanrasset", "33 - illizi", "53 - in salah",
     "54 - in guezzam", "56 - djanet", "50 - bordj badji mokhtar"},
    {"47 - ghardaïa", "03 - laghouat", "17 - djelfa", "39 - el oued",
     "30 - ouargla", "55 - touggourt", "58 - el meniaa", "51 - ouled djellal",
     "57 - el m'ghair", "49 - timimoun"},
]

def _meme_region(w1, w2):
    w1n, w2n = normaliser(w1), normaliser(w2)
    for groupe in _REGIONS:
        if w1n in groupe and w2n in groupe:
            return True
    return False


# ---------------------------------------------------------------------------
# Spécialité — les deux côtés stockent un code Domaine de la nomenclature ANEM
# (ex: "A11"). Les codes ANEM encodent déjà le Secteur en préfixe (1ère lettre),
# donc "même secteur" se déduit directement du code sans table de proximité à
# maintenir à la main (voir jobs/models.py Secteur/Domaine).
# ---------------------------------------------------------------------------

def _mots(texte):
    return set(re.findall(r'\b\w+\b', normaliser(texte)))


# ---------------------------------------------------------------------------
# Métier (référentiel v2, session 17/09/2026) — comparaison précise au niveau
# Metier (1038 valeurs) quand candidat ET offre l'ont renseigné, en plus de la
# comparaison texte historique `specialites_compatibles` (code Domaine ANEM,
# conservée intacte comme repli tant que les anciennes fiches ne sont pas
# migrées vers ce nouveau champ — voir CLAUDE.md, Phase 2).
# ---------------------------------------------------------------------------
def _relation_similaire(metier_candidat, metier_offre, relations_cache=None):
    """Relation manuelle 'similaire' (RelationMetier) — couvre les métiers que le référentiel
    v2 du client classe dans des branches secteur/domaine totalement séparées (artefact de la
    nomenclature source, ex: 'Informaticien chargé d'étude' rangé sous 'Support à l'entreprise'
    alors que 'Développeur' est sous 'Informatique') mais qu'on juge substituables en pratique.
    Décision produit du 24/09/2026 : jamais déduite automatiquement, seulement peuplée à la
    main via le panel admin référentiel v2 — contrairement à redirection_equivalente/
    plus_precis_que (importées du client), ce type est propre à TafTech.

    `relations_cache` (set d'ids de métiers déjà liés à `metier_candidat`, précalculée en
    UNE requête par l'appelant) évite une requête SQL par paire quand cette fonction est
    appelée en masse (ex: `metiers_matching.calculer_metiers_accessibles`, qui compare un
    candidat à ~1000 métiers d'affilée — sans ce cache, chaque comparaison hors groupe
    déclenchait sa propre requête, un vrai N+1 découvert en creusant une lenteur signalée
    sur le dashboard candidat). `None` (défaut) garde l'ancien comportement, une requête
    par appel — correct pour les usages "une seule paire à la fois" (matching candidat↔offre)."""
    if relations_cache is not None:
        return metier_offre.pk in relations_cache
    from .models import RelationMetier
    paire_directe = Q(metier_depart_id=metier_candidat.pk, metier_arrivee_id=metier_offre.pk)
    paire_inverse = Q(metier_depart_id=metier_offre.pk, metier_arrivee_id=metier_candidat.pk)
    return RelationMetier.objects.filter(
        relation='similaire', active_recherche=True,
    ).filter(paire_directe | paire_inverse).exists()


def _racine_secteur_id(groupe):
    """Remonte la hiérarchie GroupeMetier jusqu'au véritable secteur racine
    (type_groupe='secteur_source', toujours `parent=None`) — quel que soit le nombre de
    niveaux intermédiaires. Bug réel corrigé (26/09/2026, retour client sur des secteurs
    dupliqués "Informatique"/"Système d'information"/"Cloud Computing") : l'ancienne
    version ne consultait qu'UN seul niveau au-dessus (`g.parent_id or g.pk`), ce qui
    fonctionnait pour un métier attaché directement à un domaine (secteur > domaine,
    2 niveaux) mais ratait silencieusement tous les métiers attachés à un sous-domaine
    (secteur > domaine > sous-domaine, 3 niveaux, majoritaire dans le référentiel v2 —
    ex: "Développeur Back-End" sous Développement Web > Développement informatique >
    Informatique) : la "racine" calculée était alors le domaine intermédiaire, pas le
    vrai secteur, donc deux métiers du même secteur mais de branches différentes
    tombaient à 0 point au lieu du bonus 0.45 prévu pour ce cas."""
    vu = set()
    courant = groupe
    while courant and courant.parent_id and courant.pk not in vu:
        vu.add(courant.pk)
        courant = courant.parent
    return courant.pk if courant else None


def _meme_secteur_parent(metier_candidat, metier_offre):
    """Même secteur racine (voir `_racine_secteur_id`) mais domaine différent — proximité
    réelle mais plus faible que le même domaine exact (0.85). Décision du 24/09/2026 : le
    référentiel v2 n'avait jusqu'ici AUCUN score intermédiaire pour ce cas (tout ou rien),
    jugé trop strict pour deux métiers d'un même grand secteur (ex: deux métiers
    'Informatique' mais classés dans des domaines différents du fichier client)."""
    g1, g2 = metier_candidat.groupe_principal, metier_offre.groupe_principal
    if not g1 or not g2:
        return False
    racine1 = _racine_secteur_id(g1)
    racine2 = _racine_secteur_id(g2)
    return racine1 is not None and racine1 == racine2


def metiers_compatibles(metier_candidat, metier_offre, relations_cache=None, secteur_fallback=True):
    """Compare deux instances Metier (déjà résolues vers leur metier_canonique par
    l'appelant si besoin). Retourne (compatible: bool, ratio: float).

    `relations_cache` : voir `_relation_similaire`. `secteur_fallback=False` saute le
    filet "même secteur racine" (0.45, `_meme_secteur_parent`) — utile pour un appelant
    qui compare un candidat à des centaines/milliers de métiers d'affilée et ignore de
    toute façon ce score intermédiaire (ex: `metiers_matching.calculer_metiers_accessibles`,
    qui l'exclut du calcul final) : `_meme_secteur_parent` remonte la hiérarchie
    `GroupeMetier.parent` en Python sans prefetch, une requête SQL par niveau et par
    métier comparé — un vrai N+1 (avec `_relation_similaire`, la vraie cause d'une lenteur
    de 10s+ sur le dashboard candidat, plusieurs milliers de requêtes par chargement)."""
    if not metier_candidat or not metier_offre:
        return False, 0.0
    if metier_candidat.pk == metier_offre.pk:
        return True, 1.0
    if metier_candidat.groupe_principal_id and metier_candidat.groupe_principal_id == metier_offre.groupe_principal_id:
        # Plancher 0.85, jamais en dessous du filet fuzzy : sans ce max, regrouper deux métiers
        # au libellé quasi identique DANS le même groupe faisait baisser leur score (ex:
        # "Gestionnaire de Paie" / "Gestionnaire de Paie RH" : 0.93 -> 0.85 après la
        # consolidation du 27/09/2026 qui a réuni les deux domaines "Paie").
        ratio = difflib.SequenceMatcher(None, normaliser(metier_candidat.libelle), normaliser(metier_offre.libelle)).ratio()
        return True, max(0.85, ratio)
    if _relation_similaire(metier_candidat, metier_offre, relations_cache):
        return True, 0.70
    # Filet de sécurité : deux métiers différents mais au libellé très proche
    # (ex: variantes non couvertes par une RelationMetier explicite).
    ratio = difflib.SequenceMatcher(None, normaliser(metier_candidat.libelle), normaliser(metier_offre.libelle)).ratio()
    if ratio >= 0.72:
        return True, ratio
    if secteur_fallback and _meme_secteur_parent(metier_candidat, metier_offre):
        return True, 0.45
    return False, ratio

def _specialite_relation_similaire(spec_id_a, spec_id_b):
    """Relation manuelle 'similaire' (RelationSpecialite, session 25/09/2026) — voir docstring
    du modèle. Jamais déduite automatiquement, seulement peuplée via le panel admin."""
    from .models import RelationSpecialite
    paire_directe = Q(specialite_depart_id=spec_id_a, specialite_arrivee_id=spec_id_b)
    paire_inverse = Q(specialite_depart_id=spec_id_b, specialite_arrivee_id=spec_id_a)
    return RelationSpecialite.objects.filter(active_recherche=True).filter(paire_directe | paire_inverse).exists()


def specialites_formation_compatibles(spec_candidat, spec_offre):
    """Compare deux instances SpecialiteFormation (référentiel v2 Diplômes) — même logique que
    metiers_compatibles() : exact (1.0), relation manuelle 'similaire' (0.70, admin-only),
    puis filet fuzzy sur le libellé pour les variantes non couvertes par une relation
    explicite (ex: 'Système d'information' / 'Systèmes d'information'). Contrairement aux
    métiers, PAS de bonus 'même domaine' — le référentiel client a deux domaines
    'Informatique'-like disjoints (200 académique précis / 218 thèmes éditoriaux v1 larges)
    qui ne sont pas garantis proches spécialité par spécialité (F06 : jamais d'équivalence
    construite sans preuve)."""
    if not spec_candidat or not spec_offre:
        return 0.0
    if spec_candidat.pk == spec_offre.pk:
        return 1.0
    if _specialite_relation_similaire(spec_candidat.pk, spec_offre.pk):
        return 0.70
    ratio = difflib.SequenceMatcher(None, normaliser(spec_candidat.libelle), normaliser(spec_offre.libelle)).ratio()
    if ratio >= 0.80:
        return ratio
    return 0.0


def specialites_compatibles(spec_candidat, spec_offre):
    if not spec_candidat or not spec_offre:
        return False, 0.0
    sc = normaliser(spec_candidat).upper()
    so = normaliser(spec_offre).upper()
    # 1. Code Domaine identique
    if sc == so:
        return True, 1.0
    # 2. Même Secteur parent (même 1ère lettre du code Domaine, ex: "A11" et "A21")
    if sc[:1] and sc[:1] == so[:1]:
        return True, 0.85
    # 3. Fuzzy (filet de sécurité pour d'éventuels champs texte libre hérités)
    sc_l, so_l = sc.lower(), so.lower()
    ratio = difflib.SequenceMatcher(None, sc_l, so_l).ratio()
    if ratio >= 0.72:
        return True, ratio
    if sc_l in _mots(so_l) or so_l in _mots(sc_l):
        return True, 0.8
    return False, ratio


# ---------------------------------------------------------------------------
# Compétences
# ---------------------------------------------------------------------------
def competences_score(competences_candidat, texte_offre):
    if not competences_candidat or not texte_offre:
        return 0.0, []

    tags_candidat = [t.strip().lower() for t in str(competences_candidat).split(',') if t.strip()]
    texte = normaliser(texte_offre)
    mots_offre = set(texte.split())

    if not tags_candidat:
        return 0.0, []

    tags_trouves = []
    for tag in tags_candidat:
        if not tag:
            continue
        if re.search(r'\b' + re.escape(tag) + r'\b', texte):
            tags_trouves.append(tag)
            continue
        for mot in mots_offre:
            if difflib.SequenceMatcher(None, tag, mot).ratio() >= 0.85:
                tags_trouves.append(tag)
                break
        else:
            for mot in mots_offre:
                if len(tag) >= 4 and len(mot) >= 4 and (tag in mot or mot in tag):
                    tags_trouves.append(tag)
                    break

    # Fix point 3 : éviter qu'1 seul match sur 20 skills = 15/15
    # Si candidat a >= 3 skills : dénominateur = min(total, 5), plancher 3
    # Si candidat a 1-2 skills et tous matchent : score plein (il a peu mais couvre)
    n_match = len(tags_trouves)
    n_total = len(tags_candidat)
    if n_total >= 3:
        denominateur = max(min(n_total, 5), 3)
    else:
        denominateur = n_total  # 1 ou 2 skills : ratio exact
    ratio = min(n_match / denominateur, 1.0) if denominateur else 0.0
    return ratio, tags_trouves


_NIVEAU_POINTS = {'DEBUTANT': 1, 'INTERMEDIAIRE': 2, 'AVANCE': 3, 'CONFIRME': 4}


def _niveaux_candidat_par_label(profil):
    """Récupère une fois les compétences structurées du candidat, indexées par label
    normalisé — évite une requête par compétence requise de l'offre."""
    niveaux = {}
    competences_detail = getattr(profil, 'competences_detail', None)
    if competences_detail is not None:
        for c in competences_detail.all():
            niveaux[normaliser(c.label)] = c.niveau
    return niveaux


def _trouver_competence_candidat(profil, label_norm, niveaux_par_label):
    """Cherche `label_norm` (déjà normalisé) parmi les compétences structurées pré-chargées du
    candidat, puis dans le texte libre en filet de sécurité. Retourne (trouve, niveau_ou_None,
    niveau_fiable) — niveau_fiable=False si le match vient du texte libre (niveau inconnu)."""
    if label_norm in niveaux_par_label:
        return True, niveaux_par_label[label_norm], True
    if profil.competences:
        for tag in str(profil.competences).split(','):
            if normaliser(tag.strip()) == label_norm:
                return True, None, False
    return False, None, False


def competences_score_structure(profil, competences_requises):
    """Score de compétences basé sur le référentiel structuré (CompetenceOffre/CompetenceCandidat)
    — pondère Obligatoire (poids 2) plus fort que Souhaitée (poids 1), et tient compte du niveau
    minimum requis quand il est renseigné. Utilisé à la place de `competences_score` (texte libre)
    dès qu'une offre a au moins une compétence structurée."""
    items = list(competences_requises)
    if not items:
        return 0.0, [], []

    niveaux_par_label = _niveaux_candidat_par_label(profil)
    poids_total = 0.0
    poids_obtenu = 0.0
    trouvees = []
    manquantes = []
    for comp in items:
        poids = 2.0 if comp.type_exigence == 'OBLIGATOIRE' else 1.0
        poids_total += poids
        label_norm = normaliser(comp.label)
        trouve, niveau_candidat, niveau_fiable = _trouver_competence_candidat(profil, label_norm, niveaux_par_label)
        if not trouve:
            manquantes.append(comp)
            continue
        if not comp.niveau_requis:
            poids_obtenu += poids
            trouvees.append(comp)
        elif not niveau_fiable:
            # Match via texte libre seul, niveau réel inconnu — crédit partiel.
            poids_obtenu += poids * 0.8
            trouvees.append(comp)
        elif _NIVEAU_POINTS.get(niveau_candidat, 0) >= _NIVEAU_POINTS.get(comp.niveau_requis, 0):
            poids_obtenu += poids
            trouvees.append(comp)
        else:
            poids_obtenu += poids * 0.6
            trouvees.append(comp)

    ratio = min(poids_obtenu / poids_total, 1.0) if poids_total else 0.0
    return ratio, trouvees, manquantes


# ---------------------------------------------------------------------------
# Pertinence d'une expérience
# ---------------------------------------------------------------------------
def _experience_pertinente(exp, offre):
    from .models import Metier
    metier_exp = getattr(exp, 'metier', None)
    metier_offre = getattr(offre, 'metier', None)
    if isinstance(metier_exp, Metier) and isinstance(metier_offre, Metier):
        me = metier_exp.metier_canonique or metier_exp
        mo = metier_offre.metier_canonique or metier_offre
        compat, ratio = metiers_compatibles(me, mo)
        if compat:
            return True, ratio

    if exp.titre_poste and offre.titre:
        ratio = difflib.SequenceMatcher(
            None, normaliser(exp.titre_poste), normaliser(offre.titre)
        ).ratio()
        if ratio >= 0.60:
            return True, ratio
        mots_exp = {m for m in _mots(exp.titre_poste) if len(m) >= 5}
        mots_off = {m for m in _mots(offre.titre) if len(m) >= 5}
        if mots_exp & mots_off:
            return True, 0.70

    return False, 0.0


def _annees_experience(exp):
    debut = exp.date_debut
    fin = exp.date_fin
    if isinstance(debut, str):
        try:
            debut = datetime.datetime.strptime(debut, "%Y-%m-%d").date()
        except ValueError:
            return 0.0, None, None
    if isinstance(fin, str):
        try:
            fin = datetime.datetime.strptime(fin, "%Y-%m-%d").date()
        except ValueError:
            fin = None
    if not fin:
        fin = datetime.date.today()
    try:
        jours = (fin - debut).days
        return max(0.0, jours / 365.25), debut, fin
    except Exception:
        return 0.0, None, None


def _deduire_annees_sans_chevauchement(experiences_pertinentes):
    """
    Fix point 6 : fusionne les périodes qui se chevauchent avant de sommer.
    [(debut, fin, confiance), ...] → annees réelles pondérées.
    """
    if not experiences_pertinentes:
        return 0.0
    # Trier par date début
    periodes = sorted(experiences_pertinentes, key=lambda x: x[0])
    fusionnees = []
    for debut, fin, conf in periodes:
        if fusionnees and debut <= fusionnees[-1][1]:
            # Chevauchement → étendre la période existante
            prev_debut, prev_fin, prev_conf = fusionnees[-1]
            fusionnees[-1] = (prev_debut, max(prev_fin, fin), max(prev_conf, conf))
        else:
            fusionnees.append((debut, fin, conf))
    total = sum(
        max(0.0, (fin - debut).days / 365.25) * max(conf, 0.8)
        for debut, fin, conf in fusionnees
    )
    return total


def _score_competences(profil, offre):
    """S10 — score compétences uniquement si l'offre a sélectionné au moins une
    CompetenceOffre ; sinon critère désactivé (None), plus de repli texte libre dans le
    score total (le texte libre reste disponible pour la recherche)."""
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


def _score_diplome_specialite(profil, offre):
    """S05/S06/S07 — diplôme et spécialité-formation comme deux critères pondérés
    INDÉPENDANTS et non couplés (S01/S05/S06 : `offre.diplomes_requis` et
    `offre.specialites_requises` sont deux listes plates séparées, chacune activable
    indépendamment — jamais un couple imposé, F06 : pas de rang/équivalence construits).
    Quand les deux sont demandés, ils restent néanmoins évalués sur la MÊME
    FormationCandidat (jamais un diplôme d'une formation combiné à la spécialité d'une
    autre — T10). Retourne (contrib_diplome, contrib_specialite, formation_retenue) ; un
    élément vaut None si son critère n'est pas demandé par l'offre (S01).

    Repli diplôme (pas de repli spécialité, qui n'a pas d'équivalent top-niveau) : si le
    candidat n'a aucune `FormationCandidat` obtenue avec un diplôme rattaché, mais a choisi un
    `ProfilCandidat.diplome_ref` (sélecteur référentiel v2 en haut du profil, sans ambiguïté
    possible puisque c'est déjà une valeur précise du référentiel), ce niveau sert de repli
    pour le critère diplôme uniquement — marqué `contrib_diplome["source"]='niveau_profil'`
    (vs `'formation'` par défaut) pour que le recruteur distingue une correspondance vérifiée
    sur une formation détaillée d'une simple estimation déclarative."""
    try:
        diplome_ids = set(offre.diplomes_requis.values_list('pk', flat=True))
    except TypeError:
        diplome_ids = set()
    try:
        specialites_offre = list(offre.specialites_requises.all())
    except TypeError:
        specialites_offre = []
    specialite_ids = set(s.pk for s in specialites_offre)

    diplome_actif = bool(diplome_ids)
    specialite_actif = bool(specialite_ids)
    if not diplome_actif and not specialite_actif:
        return None, None, None

    try:
        formations = [
            f for f in profil.formations_detail.all()
            if f.statut == 'OBTENU' and f.diplome_ref_id
            and getattr(f.diplome_ref, 'code', None) != 'D-AUTRE'
        ]
    except TypeError:
        formations = []

    if not formations:
        niveau_profil_id = getattr(profil, 'diplome_ref_id', None)
        if diplome_actif and niveau_profil_id:
            sd = 1.0 if niveau_profil_id in diplome_ids else 0.0
            contrib_diplome = {"score": sd, "connu": True, "source": "niveau_profil"}
        else:
            contrib_diplome = {"score": 0.0, "connu": False} if diplome_actif else None
        contrib_specialite = {"score": 0.0, "connu": False} if specialite_actif else None
        return contrib_diplome, contrib_specialite, None

    meilleure = None
    meilleur_total = -1.0
    for f in formations:
        sd = 1.0 if (diplome_actif and f.diplome_ref_id in diplome_ids) else 0.0
        ss = 0.0
        if specialite_actif and f.specialite_ref_id:
            for so in specialites_offre:
                ss = max(ss, specialites_formation_compatibles(f.specialite_ref, so))
        total = (0.20 * sd if diplome_actif else 0.0) + (0.25 * ss if specialite_actif else 0.0)
        if total > meilleur_total:
            meilleur_total = total
            meilleure = (f, sd, ss)

    formation, sd, ss = meilleure
    contrib_diplome = {"score": sd, "connu": True, "source": "formation"} if diplome_actif else None
    # Spécialité non renseignée, ou "SP-AUTRE" (Autre spécialité — préciser, texte libre côté
    # candidat via FormationReferentielSelect) : une vraie spécialité inconnue, pas une
    # incompatibilité constatée — jamais un 0 franc qui pénaliserait le candidat comme s'il
    # avait déclaré une spécialité qui ne correspond pas à celle demandée par l'offre.
    specialite_vague = (not formation.specialite_ref_id) or getattr(formation.specialite_ref, 'code', None) == 'SP-AUTRE'
    if specialite_actif:
        contrib_specialite = {"score": 0.0, "connu": False} if specialite_vague else {"score": round(ss, 4), "connu": True}
    else:
        contrib_specialite = None
    formation_retenue = formation if ((diplome_actif and sd) or (specialite_actif and ss)) else None
    return contrib_diplome, contrib_specialite, formation_retenue


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


# ---------------------------------------------------------------------------
# Formule à poids actifs (REGLES_MATCHING S01/S02/S03) — un critère non demandé par
# l'offre est exclu du dénominateur W plutôt que de recevoir un score neutre inclus
# dans un total fixe sur 100.
# ---------------------------------------------------------------------------
def _composer_score(contributions):
    """`contributions` : dict critère -> None (non demandé, exclu) ou
    {"poids": float, "score": float 0..1, "connu": bool}."""
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


# ---------------------------------------------------------------------------
# Algorithme principal
# ---------------------------------------------------------------------------
def _calculer_score_algo(candidat_user, offre):
    """Score de matching conforme à REGLES_MATCHING S01-S14 : formule à poids actifs
    (un critère non demandé par l'offre est exclu du dénominateur, pas noté), spécialité
    = spécialité de formation couplée au diplôme sur une même FormationCandidat (S06/S07,
    plus le métier/poste — voir jobs.metiers_matching pour la recherche et
    _experience_pertinente pour son usage dans le critère expérience), région binaire
    stricte (S04), expérience continue (S09), compétences désactivées sans CompetenceOffre
    (S10)."""
    from .matching_params import get_parametres_matching
    params = get_parametres_matching()
    profil = candidat_user.profil_candidat

    points_forts = []
    ecarts = []
    explications = {}
    formation_retenue = None

    # RÉGION (S04) — toujours un critère actif : OffreEmploi.wilaya est un champ obligatoire,
    # pas de notion de télétravail intégral dans le modèle actuel pour le désactiver.
    contrib_region = _score_region(profil, offre)
    contrib_region["poids"] = params["poids_region"]
    wilaya_c, wilaya_o = normaliser(profil.wilaya), normaliser(offre.wilaya)
    if contrib_region["score"] == 1.0:
        commune_c, commune_o = normaliser(profil.commune), normaliser(offre.commune)
        if wilaya_c == wilaya_o and commune_c and commune_o and commune_c == commune_o:
            explications["region"] = f"Réside dans la même commune ({profil.commune})."
            points_forts.append(f"Proximité locale idéale (Commune de {profil.commune}).")
        elif wilaya_c == wilaya_o:
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

    # DIPLÔME + SPÉCIALITÉ DE FORMATION (S05-S08) — deux critères pondérés indépendants,
    # évalués sur la même FormationCandidat (jamais un diplôme d'une formation combiné à la
    # spécialité d'une autre — T10).
    # Flux "Autre, préciser" (retour client 26/09/2026) : une formation en attente de
    # vérification (`statut_validation='A_PRECISER'` — intitulé libre sans correspondance
    # référentiel confirmée) rend le score de ce candidat provisoire sur diplôme/spécialité,
    # jamais une incompatibilité déguisée — le libellé de l'explication le précise et
    # `resultat['score_provisoire']` (voir plus bas) permet au frontend de le signaler.
    try:
        # Itérer (pas `.filter().exists()`) — un `Mock()` (25 tests historiques de
        # test_matcher.py) lève `TypeError` à l'itération, jamais sur un simple appel de
        # méthode chaîné, qui renverrait un autre Mock toujours "truthy" et fausserait
        # silencieusement `formation_a_verifier` sur tous ces tests (piège déjà documenté
        # dans ce fichier pour `competences_requises`/`diplomes_acceptes`).
        formation_a_verifier = any(f.statut_validation == 'A_PRECISER' for f in profil.formations_detail.all())
    except TypeError:
        formation_a_verifier = False
    contrib_diplome, contrib_specialite, formation_retenue = _score_diplome_specialite(profil, offre)
    if contrib_diplome is not None:
        contrib_diplome["poids"] = params["poids_diplome"]
        if contrib_diplome["score"] == 1.0:
            if contrib_diplome.get("source") == "niveau_profil":
                explications["diplome"] = "Type de diplôme accepté par l'offre (estimé depuis le niveau déclaré en haut du profil, aucune formation détaillée renseignée)."
            else:
                explications["diplome"] = "Type de diplôme accepté par l'offre."
            points_forts.append("Diplôme conforme aux exigences de l'offre.")
        elif not contrib_diplome["connu"]:
            explications["diplome"] = (
                "Une formation déclarée est en attente de vérification par un administrateur — "
                "score provisoire sur ce critère, non compté comme incompatible."
                if formation_a_verifier else
                "Aucune formation obtenue référencée dans le catalogue — correspondance non vérifiable."
            )
        else:
            explications["diplome"] = "Le diplôme du candidat ne fait pas partie des diplômes acceptés."
            ecarts.append("Diplôme non compatible avec les exigences de l'offre.")
    if contrib_specialite is not None:
        contrib_specialite["poids"] = params["poids_specialite"]
        if contrib_specialite["score"] == 1.0:
            libelle_spe = formation_retenue.specialite_ref.libelle if formation_retenue and formation_retenue.specialite_ref_id else ""
            explications["specialite"] = f"Spécialité de formation acceptée ({libelle_spe})." if libelle_spe else "Spécialité de formation acceptée par l'offre."
            points_forts.append("Spécialité de formation exactement acceptée par l'offre.")
        elif not contrib_specialite["connu"]:
            explications["specialite"] = (
                "Une formation déclarée est en attente de vérification par un administrateur — "
                "score provisoire sur ce critère, non compté comme incompatible."
                if formation_a_verifier else
                "Aucune formation obtenue référencée dans le catalogue — correspondance non vérifiable."
            )
        elif contrib_specialite["score"] > 0:
            libelle_spe = formation_retenue.specialite_ref.libelle if formation_retenue and formation_retenue.specialite_ref_id else ""
            explications["specialite"] = f"Spécialité de formation jugée proche de celles acceptées par l'offre ({libelle_spe})." if libelle_spe else "Spécialité de formation jugée proche de celles acceptées par l'offre."
        else:
            explications["specialite"] = "La spécialité de formation ne correspond pas à celles acceptées par l'offre."
            ecarts.append("Spécialité de formation non compatible avec les exigences de l'offre.")

    # EXPÉRIENCE (S09) — score continu, critère désactivé si aucun minimum n'est exigé.
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

    # COMPÉTENCES (S10) — critère désactivé si l'offre n'a sélectionné aucune CompetenceOffre.
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

    # La disqualification questionnaire est gérée par PostulerAPIView après sauvegarde des
    # réponses — pas ici (les réponses n'existent pas encore).
    details = {k: round(v["score"] * v["poids"] * 100, 2) if v else 0.0 for k, v in contributions.items()}
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
        # "formation" (vérifié sur une FormationCandidat détaillée), "niveau_profil" (repli sur
        # le sélecteur référentiel v2 du haut de profil, sans formation détaillée), ou None si
        # le critère diplôme n'était pas actif/pas connu.
        "diplome_source": contrib_diplome.get("source") if contrib_diplome else None,
        # Score provisoire (retour client 26/09/2026) : au moins une formation déclarée est en
        # attente de vérification admin (flux "Autre, préciser") — jamais une incompatibilité,
        # mais le score global ne doit pas être présenté comme définitif tant que ça dure.
        "score_provisoire": formation_a_verifier,
    }


def calculer_score_matching(candidat_user, offre):
    if not candidat_user or not hasattr(candidat_user, 'profil_candidat'):
        return {
            "total": 0.0,
            "details": {"specialite": 0, "region": 0, "diplome": 0, "experience": 0, "competences": 0},
            "explications": {},
            "highlights": {"points_forts": [], "ecarts": ["Dossier candidat incomplet."]},
            "disqualifie": False,
            "flags": [],
            "completude": 0.0,
            "criteres_manquants": ["specialite", "region", "diplome", "experience", "competences"],
            "criteres_non_demandes": [],
            "algorithme_version": "matching-20-20-25-20-15-v2",
            "formation_id_retenue": None,
            "diplome_source": None,
            "score_provisoire": False,
        }
    return _calculer_score_algo(candidat_user, offre)
