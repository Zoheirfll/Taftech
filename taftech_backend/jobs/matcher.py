import datetime
import difflib
import re
from .constants import SYNONYMES_SPECIALITE

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
# Spécialité — les deux côtés utilisent SECTEURS_CHOICES (même codes)
# ---------------------------------------------------------------------------

# Mapping inter-codes : secteurs proches métier (Point 1)
# Clé = code SECTEURS_CHOICES, valeur = set de codes compatibles
_CODES_PROCHES = {
    "IT":           {"IT", "INGENIERIE"},
    "INGENIERIE":   {"INGENIERIE", "IT", "PRODUCTION", "BTP", "MAINTENANCE", "QSE"},
    "FINANCE":      {"FINANCE", "BANQUE", "ADMIN", "JURIDIQUE"},
    "BANQUE":       {"BANQUE", "FINANCE"},
    "COMMERCIAL":   {"COMMERCIAL", "VENTE", "GRANDS_COMPTES", "MARKETING"},
    "VENTE":        {"VENTE", "COMMERCIAL", "GRANDS_COMPTES"},
    "GRANDS_COMPTES": {"GRANDS_COMPTES", "COMMERCIAL", "VENTE"},
    "MARKETING":    {"MARKETING", "COMMERCIAL"},
    "RH":           {"RH", "ADMIN"},
    "ADMIN":        {"ADMIN", "RH", "SECRETARIAT"},
    "SECRETARIAT":  {"SECRETARIAT", "ADMIN"},
    "PRODUCTION":   {"PRODUCTION", "INGENIERIE", "MAINTENANCE", "LOGISTIQUE", "QSE"},
    "LOGISTIQUE":   {"LOGISTIQUE", "PRODUCTION"},
    "MAINTENANCE":  {"MAINTENANCE", "PRODUCTION", "INGENIERIE"},
    "BTP":          {"BTP", "INGENIERIE"},
    "QSE":          {"QSE", "INGENIERIE", "PRODUCTION"},
    "JURIDIQUE":    {"JURIDIQUE", "FINANCE"},
    "SANTE":        {"SANTE"},
    "TOURISME":     {"TOURISME"},
}

def _mots(texte):
    import re
    return set(re.findall(r'\b\w+\b', normaliser(texte)))

def specialites_compatibles(spec_candidat, spec_offre):
    if not spec_candidat or not spec_offre:
        return False, 0.0
    sc = normaliser(spec_candidat).upper()
    so = normaliser(spec_offre).upper()
    # 1. Codes identiques
    if sc == so:
        return True, 1.0
    # 2. Mapping inter-codes (ex : IT ↔ INGENIERIE)
    codes_proches_sc = _CODES_PROCHES.get(sc, set())
    if so in codes_proches_sc:
        return True, 0.85
    # 3. Synonymes texte libre (pour les champs non normalisés éventuels)
    for cle, synonymes in SYNONYMES_SPECIALITE.items():
        cle_norm = normaliser(cle)
        mots_sc = _mots(sc.lower())
        mots_so = _mots(so.lower())
        syns = {normaliser(s) for s in synonymes} | {cle_norm}
        sc_in = bool(mots_sc & syns) or sc.lower() == cle_norm
        so_in = bool(mots_so & syns) or so.lower() == cle_norm
        if sc_in and so_in:
            return True, 0.9
    # 4. Fuzzy (filet de sécurité pour anciens champs texte libre)
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


# ---------------------------------------------------------------------------
# Pertinence d'une expérience
# ---------------------------------------------------------------------------
def _experience_pertinente(exp, offre):
    secteur_exp = getattr(exp, 'secteur', None)
    if secteur_exp and isinstance(secteur_exp, str) and offre.specialite:
        # Même code SECTEURS_CHOICES → match direct
        if normaliser(secteur_exp) == normaliser(offre.specialite):
            return True, 1.0
        compat, ratio = specialites_compatibles(secteur_exp, offre.specialite)
        if compat and ratio >= 0.8:
            return True, ratio

    if offre.specialite:
        spec_norm = normaliser(offre.specialite)
        mots_titre = _mots(exp.titre_poste)
        if spec_norm in mots_titre:
            return True, 0.85

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

    synonymes_offre = SYNONYMES_SPECIALITE.get(
        str(offre.specialite).upper() if offre.specialite else "", []
    )
    if synonymes_offre and exp.description:
        desc_norm = normaliser(exp.description)
        if any(re.search(r'\b' + re.escape(normaliser(s)) + r'\b', desc_norm) for s in synonymes_offre):
            return True, 0.65

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


# ---------------------------------------------------------------------------
# Algorithme principal
# ---------------------------------------------------------------------------
def _calculer_score_algo(candidat_user, offre):
    details = {
        "specialite": 0.0, "region": 0.0,
        "diplome": 0.0, "experience": 0.0, "competences": 0.0
    }
    explications = {
        "specialite": "Aucune spécialité renseignée ou domaine non concordant.",
        "region": "Éloignement géographique sans mobilité nationale.",
        "diplome": "Le niveau de diplôme ne correspond pas aux exigences.",
        "experience": "Manque d'expérience pertinente dans cette spécialité.",
        "competences": "Aucune correspondance trouvée dans les compétences."
    }
    points_forts = []
    ecarts = []
    flags = []  # Fix point 8 : flags disqualifiants

    profil = candidat_user.profil_candidat

    # ==========================================
    # 1. SPÉCIALITÉ (Max 25%)
    # profil.specialite et offre.specialite → même codes SECTEURS_CHOICES
    # ==========================================
    specialite_candidat = profil.specialite or profil.secteur_souhaite
    if specialite_candidat and offre.specialite:
        compatible, ratio = specialites_compatibles(specialite_candidat, offre.specialite)
        if compatible:
            if ratio >= 0.95:
                details["specialite"] = 25.0
                explications["specialite"] = "Spécialité parfaitement alignée."
                points_forts.append("Spécialité parfaitement alignée sur le poste.")
            elif ratio >= 0.8:
                details["specialite"] = 20.0
                explications["specialite"] = "Domaine très proche de celui de l'offre."
                points_forts.append("Domaine d'activité très proche du poste.")
            else:
                details["specialite"] = 12.0
                explications["specialite"] = "Domaine partiellement compatible."
                points_forts.append("Domaine partiellement compatible avec le poste.")
        else:
            ecarts.append("Le domaine d'activité du candidat diffère de l'offre.")
    else:
        ecarts.append("Spécialité ou secteur non renseigné sur le profil.")

    # ==========================================
    # 2. LOCALISATION (Max 20%)
    # Fix point 4 : NATIONALE vaut autant que présence locale si même wilaya
    # ==========================================
    wilaya_c = normaliser(profil.wilaya)
    wilaya_o = normaliser(offre.wilaya)
    meme_wilaya = wilaya_c and wilaya_o and wilaya_c == wilaya_o

    if meme_wilaya:
        commune_c = normaliser(profil.commune)
        commune_o = normaliser(offre.commune)
        if commune_c and commune_o and commune_c == commune_o:
            details["region"] = 20.0
            explications["region"] = "Réside dans la même commune (Proximité idéale)."
            points_forts.append(f"Proximité locale idéale (Commune de {profil.commune}).")
        else:
            details["region"] = 15.0
            explications["region"] = f"Réside dans la même wilaya ({profil.wilaya})."
            points_forts.append(f"Résidence dans la même Wilaya ({profil.wilaya}).")
        # NATIONALE + même wilaya = bonus commune possible → déjà géré ci-dessus
    elif profil.mobilite == 'NATIONALE':
        details["region"] = 15.0
        explications["region"] = "Mobilité nationale sur toute l'Algérie."
        points_forts.append("Mobilité nationale totale.")
    elif profil.mobilite == 'REGIONALE':
        if wilaya_c and wilaya_o and _meme_region(wilaya_c, wilaya_o):
            details["region"] = 12.0
            explications["region"] = "Mobilité régionale — wilaya voisine."
            points_forts.append(f"Mobilité régionale couvrant la zone de {offre.wilaya}.")
        else:
            details["region"] = 5.0
            explications["region"] = "Mobilité régionale — wilaya éloignée."
            ecarts.append(f"Candidat basé à {profil.wilaya or 'wilaya inconnue'}, wilaya cible éloignée.")
    else:
        ecarts.append(f"Candidat basé hors zone ({profil.wilaya or 'inconnue'}) sans mobilité.")

    # ==========================================
    # 3. DIPLÔME (Max 20%)
    # ==========================================
    hierarchie = {
        'NON_DIPLOMANTE': 0, 'NIVEAU_SECONDAIRE': 1, 'FORMATION_PRO': 2,
        'NIVEAU_TERMINAL': 3, 'BACCALAUREAT': 4, 'CERTIFICATION': 5,
        'UNIVERSITAIRE_SANS_DIPLOME': 6, 'TS': 7, 'LICENCE': 8,
        'MASTER_1': 9, 'MASTER_2': 10, 'MAGISTERE': 11, 'DOCTORAT': 12
    }
    niveau_requis = hierarchie.get(offre.diplome, 0) if offre.diplome else 0
    niveau_candidat = hierarchie.get(profil.diplome, 0) if profil.diplome else 0

    if niveau_requis == 0:
        details["diplome"] = 20.0
        explications["diplome"] = "Aucun diplôme spécifique exigé."
        points_forts.append("Critère de diplôme ouvert.")
    elif niveau_candidat >= niveau_requis:
        details["diplome"] = 20.0
        explications["diplome"] = "Niveau d'études requis atteint ou dépassé."
        points_forts.append("Niveau d'études requis validé.")
    elif niveau_candidat == niveau_requis - 1:
        details["diplome"] = 10.0
        explications["diplome"] = "Niveau d'études légèrement inférieur au requis."
        ecarts.append("Niveau d'études légèrement en dessous du requis.")
    elif niveau_candidat >= niveau_requis - 3:
        details["diplome"] = 5.0
        explications["diplome"] = "Niveau d'études nettement inférieur."
        ecarts.append("Niveau d'études insuffisant pour ce poste.")
    else:
        ecarts.append("Diplôme insuffisant pour ce poste.")

    # ==========================================
    # 4. EXPÉRIENCE (Max 20%)
    # Fix point 6 : déduplication des chevauchements
    # Fix point 7 : fallback sur niveau_experience déclaré
    # ==========================================
    periodes_pertinentes = []  # (debut, fin, confiance)
    annees_total = 0.0

    if hasattr(profil, 'experiences_detail'):
        for exp in profil.experiences_detail.all():
            annees, debut, fin = _annees_experience(exp)
            annees_total += annees
            pertinente, confiance = _experience_pertinente(exp, offre)
            if pertinente and debut is not None:
                periodes_pertinentes.append((debut, fin, confiance))

    # Fix point 6 : années sans chevauchement
    annees_pertinentes = _deduire_annees_sans_chevauchement(periodes_pertinentes)

    map_exp = {
        'STAGIAIRE': 0, 'DEBUTANT': 0, 'JEUNE_DIPLOME': 1,
        'CONFIRME': 3, 'MANAGER': 5, 'RESPONSABLE_EQUIPE': 5, 'CADRE_DIRIGEANT': 8
    }
    annees_requises = map_exp.get(offre.experience_requise, 0)

    # Fix point 7 : niveau_experience déclaré comme fallback
    niveau_exp_declare = getattr(profil, 'niveau_experience', None)
    niveau_exp_val = map_exp.get(niveau_exp_declare, 0) if niveau_exp_declare else 0

    if annees_requises == 0:
        # Fix point 5 : DEBUTANT → pas de cadeau automatique à 12 pts
        # On valorise si le candidat a quelque chose, sinon score minimal
        if annees_pertinentes >= 1:
            details["experience"] = 20.0
            explications["experience"] = f"Poste junior — expérience pertinente valorisée ({round(annees_pertinentes, 1)} ans)."
            points_forts.append(f"Expérience pertinente valorisée ({round(annees_pertinentes, 1)} ans).")
        elif annees_total >= 0.5 or niveau_exp_val >= 1:
            details["experience"] = 14.0
            explications["experience"] = "Poste ouvert aux débutants — candidat avec antécédents professionnels."
            points_forts.append("Poste ouvert aux débutants.")
        else:
            # Vraiment aucune expérience : 8 pts (pas 12 — on ne sur-récompense pas le vide)
            details["experience"] = 8.0
            explications["experience"] = "Poste ouvert aux débutants/juniors."
            points_forts.append("Poste ouvert aux débutants.")
    elif annees_pertinentes >= annees_requises:
        details["experience"] = 20.0
        explications["experience"] = f"Expérience pertinente validée ({round(annees_pertinentes, 1)} ans dans ce domaine)."
        points_forts.append(f"Expérience requise atteinte ({round(annees_pertinentes, 1)} ans dans ce domaine).")
    elif annees_pertinentes >= annees_requises * 0.6:
        details["experience"] = 12.0
        explications["experience"] = f"Expérience pertinente partielle ({round(annees_pertinentes, 1)} ans / {annees_requises} requis)."
        ecarts.append(f"Expérience dans le domaine légèrement insuffisante ({round(annees_pertinentes, 1)} ans / {annees_requises} requis).")
    elif annees_pertinentes >= annees_requises * 0.3:
        details["experience"] = 6.0
        explications["experience"] = f"Peu d'expérience pertinente ({round(annees_pertinentes, 1)} ans)."
        ecarts.append(f"Expérience dans le domaine trop courte ({round(annees_pertinentes, 1)} ans / {annees_requises} requis).")
    elif niveau_exp_val >= annees_requises:
        # Niveau déclaré compatible mais expériences détaillées absentes → 14/20
        # (pas 10 — le candidat CONFIRME qui n'a pas rempli ses détails ne doit pas être trop pénalisé)
        details["experience"] = 14.0
        explications["experience"] = f"Niveau d'expérience déclaré compatible ({niveau_exp_declare}) — détails non renseignés."
        ecarts.append("Renseignez vos expériences détaillées pour un score plus précis.")
    else:
        ecarts.append(f"Manque d'expérience pertinente dans ce secteur ({round(annees_pertinentes, 1)} ans / {annees_requises} requis).")

    # ==========================================
    # 5. COMPÉTENCES (Max 15%)
    # ==========================================
    texte_offre_comp = " ".join(
        str(v) for v in [offre.profil_recherche, offre.description, offre.missions, offre.titre]
        if v and not callable(v)
    )
    if profil.competences and texte_offre_comp.strip():
        ratio, tags_trouves = competences_score(profil.competences, texte_offre_comp)
        details["competences"] = round(ratio * 15.0, 2)
        if ratio >= 0.6:
            explications["competences"] = f"Excellente adéquation ({len(tags_trouves)} compétences clés détectées)."
            points_forts.append(f"Fortes correspondances techniques ({len(tags_trouves)} compétences validées).")
        elif ratio >= 0.35:
            explications["competences"] = f"Correspondance partielle ({len(tags_trouves)} compétences)."
        elif ratio > 0:
            explications["competences"] = "Peu de compétences correspondent au poste."
            ecarts.append("Compétences techniques partiellement alignées.")
        else:
            explications["competences"] = "Aucune compétence ne correspond au poste."
            ecarts.append("Compétences techniques non alignées avec l'offre.")
    else:
        # Compétences non renseignées → score neutre 5/15
        details["competences"] = 5.0
        explications["competences"] = "Compétences non renseignées — score neutre appliqué."
        ecarts.append("Renseignez vos compétences pour améliorer votre score.")

    # La disqualification questionnaire est gérée par PostulerAPIView
    # après sauvegarde des réponses — pas ici (les réponses n'existent pas encore).
    total = min(round(sum(details.values()), 2), 100.0)
    return {
        "total": total,
        "details": details,
        "explications": explications,
        "highlights": {"points_forts": points_forts, "ecarts": ecarts},
        "disqualifie": False,
        "flags": flags,
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
        }
    return _calculer_score_algo(candidat_user, offre)
