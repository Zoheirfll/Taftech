import datetime
import difflib
from .constants import SYNONYMES_SPECIALITE

def normaliser(texte):
    """Normalise un texte pour la comparaison."""
    if not texte:
        return ""
    return str(texte).strip().lower()

def specialites_compatibles(spec_candidat, spec_offre):
    """Vérifie si deux spécialités sont compatibles sémantiquement."""
    if not spec_candidat or not spec_offre:
        return False, 0.0

    sc = normaliser(spec_candidat)
    so = normaliser(spec_offre)

    # Correspondance exacte
    if sc == so:
        return True, 1.0

    # Chercher dans les synonymes
    for cle, synonymes in SYNONYMES_SPECIALITE.items():
        cle_norm = normaliser(cle)
        # Les deux sont dans le même groupe
        sc_in = (sc == cle_norm or any(s in sc for s in synonymes))
        so_in = (so == cle_norm or any(s in so for s in synonymes))
        if sc_in and so_in:
            return True, 0.9

    # Fuzzy matching
    ratio = difflib.SequenceMatcher(None, sc, so).ratio()
    if ratio >= 0.7:
        return True, ratio

    # Un contient l'autre
    if sc in so or so in sc:
        return True, 0.8

    return False, ratio

def competences_score(competences_candidat, texte_offre):
    """
    Score compétences amélioré avec fuzzy matching.
    Gère React≈React.js, Python≈Python3, etc.
    """
    if not competences_candidat or not texte_offre:
        return 0.0, []

    tags = [t.strip().lower() for t in str(competences_candidat).split(',') if t.strip()]
    texte = normaliser(texte_offre)
    mots_offre = texte.split()

    if not tags:
        return 0.0, []

    tags_trouves = []
    for tag in tags:
        # Correspondance exacte
        if tag in texte:
            tags_trouves.append(tag)
            continue
        # Fuzzy matching avec chaque mot de l'offre
        for mot in mots_offre:
            ratio = difflib.SequenceMatcher(None, tag, mot).ratio()
            if ratio >= 0.8:
                tags_trouves.append(tag)
                break
        # Un contient l'autre (React dans React.js)
        else:
            for mot in mots_offre:
                if tag in mot or mot in tag:
                    tags_trouves.append(tag)
                    break

    ratio_final = len(tags_trouves) / len(tags)
    return ratio_final, tags_trouves


def _calculer_score_algo(candidat_user, offre):
    """Algorithme de matching amélioré avec synonymes et fuzzy matching."""
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

    profil = candidat_user.profil_candidat

    # ==========================================
    # 1. SPÉCIALITÉ (Max 25%)
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
                details["specialite"] = 15.0
                explications["specialite"] = "Domaine partiellement compatible."
                points_forts.append("Domaine partiellement compatible avec le poste.")
        else:
            ecarts.append("Le domaine d'activité du candidat diffère de l'offre.")
    else:
        ecarts.append("Spécialité ou secteur non renseigné sur le profil.")

    # ==========================================
    # 2. LOCALISATION (Max 20%)
    # ==========================================
    wilaya_c = normaliser(profil.wilaya)
    wilaya_o = normaliser(offre.wilaya)

    if wilaya_c and wilaya_o and wilaya_c == wilaya_o:
        details["region"] += 15.0
        explications["region"] = f"Réside dans la même wilaya ({profil.wilaya})."
        points_forts.append(f"Résidence dans la même Wilaya ({profil.wilaya}).")
        commune_c = normaliser(profil.commune)
        commune_o = normaliser(offre.commune)
        if commune_c and commune_o and commune_c == commune_o:
            details["region"] += 5.0
            explications["region"] = "Réside dans la même commune (Proximité idéale)."
            points_forts.append(f"Proximité locale idéale (Commune de {profil.commune}).")
    elif profil.mobilite == 'NATIONALE':
        details["region"] += 15.0
        explications["region"] = "Mobilité nationale sur toute l'Algérie."
        points_forts.append("Mobilité nationale totale.")
    elif profil.mobilite == 'REGIONALE':
        # Vérifier si même région (approximation par numéro wilaya)
        details["region"] += 5.0
        explications["region"] = "Mobilité régionale — wilaya différente."
        ecarts.append(f"Candidat basé à {profil.wilaya or 'wilaya inconnue'} avec mobilité régionale.")
    else:
        ecarts.append(f"Candidat basé hors zone ({profil.wilaya or 'inconnue'}) sans mobilité.")

    # ==========================================
    # 3. DIPLÔME (Max 20%)
    # ==========================================
    hierarchie = {
        'NON_DIPLOMANTE': 0, 'NIVEAU_SECONDAIRE': 1, 'FORMATION_PRO': 2,
        'NIVEAU_TERMINAL': 3, 'BACCALAUREAT': 4, 'UNIVERSITAIRE_SANS_DIPLOME': 5,
        'CERTIFICATION': 6, 'TS': 7, 'LICENCE': 8, 'MASTER_1': 9,
        'MASTER_2': 10, 'MAGISTERE': 11, 'DOCTORAT': 12
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
        explications["diplome"] = "Niveau d'études légèrement inférieur."
        ecarts.append("Niveau d'études légèrement en dessous du requis.")
    else:
        ecarts.append("Diplôme insuffisant pour ce poste.")

    # ==========================================
    # 4. EXPÉRIENCE (Max 20%)
    # ==========================================
    annees_experience = 0.0
    specialite_offre = normaliser(offre.specialite)
    mots_cles_offre = normaliser(offre.titre).split() if offre.titre else []
    synonymes_offre = SYNONYMES_SPECIALITE.get(
        str(offre.specialite).upper() if offre.specialite else "", []
    )

    if hasattr(profil, 'experiences_detail'):
        for exp in profil.experiences_detail.all():
            texte_exp = normaliser(
                f"{exp.titre_poste} {exp.entreprise} {exp.description or ''}"
            )
            est_pertinente = False

            if specialite_offre and specialite_offre in texte_exp:
                est_pertinente = True
            elif any(mot in texte_exp for mot in mots_cles_offre if len(mot) > 3):
                est_pertinente = True
            elif any(syn in texte_exp for syn in synonymes_offre):
                est_pertinente = True
            else:
                # Fuzzy sur le titre du poste
                ratio = difflib.SequenceMatcher(
                    None, normaliser(exp.titre_poste), normaliser(offre.titre)
                ).ratio()
                if ratio >= 0.5:
                    est_pertinente = True

            if est_pertinente:
                debut = exp.date_debut
                fin = exp.date_fin
                if isinstance(debut, str):
                    debut = datetime.datetime.strptime(debut, "%Y-%m-%d").date()
                if isinstance(fin, str):
                    fin = datetime.datetime.strptime(fin, "%Y-%m-%d").date()
                if not fin:
                    fin = datetime.date.today()
                try:
                    jours = (fin - debut).days
                    if jours > 0:
                        annees_experience += jours / 365.25
                except Exception:
                    pass

    map_exp = {
        'STAGIAIRE': 0, 'DEBUTANT': 0, 'JEUNE_DIPLOME': 1,
        'CONFIRME': 3, 'MANAGER': 5, 'RESPONSABLE_EQUIPE': 5, 'CADRE_DIRIGEANT': 8
    }
    annees_requises = map_exp.get(offre.experience_requise, 0)

    if annees_requises == 0:
        details["experience"] = 20.0
        explications["experience"] = "Aucune expérience préalable exigée."
        points_forts.append("Poste ouvert aux débutants/juniors.")
    elif annees_experience >= annees_requises:
        details["experience"] = 20.0
        explications["experience"] = f"Expérience validée ({round(annees_experience, 1)} ans)."
        points_forts.append(f"Expérience requise atteinte ({round(annees_experience, 1)} ans).")
    elif annees_experience >= (annees_requises / 2):
        details["experience"] = 10.0
        explications["experience"] = f"Expérience intermédiaire ({round(annees_experience, 1)} ans)."
        ecarts.append(f"Expérience courte ({round(annees_experience, 1)} ans / {annees_requises} requis).")
    else:
        ecarts.append("Manque d'expérience dans ce secteur.")

    # ==========================================
    # 5. COMPÉTENCES (Max 15%)
    # ==========================================
    texte_offre_comp = f"{offre.profil_recherche or ''} {offre.description or ''} {offre.missions or ''}"
    if profil.competences and texte_offre_comp.strip():
        ratio, tags_trouves = competences_score(profil.competences, texte_offre_comp)
        details["competences"] = round(ratio * 15.0, 2)
        if ratio >= 0.7:
            explications["competences"] = f"Excellente adéquation ({len(tags_trouves)} compétences clés détectées)."
            points_forts.append(f"Fortes correspondances techniques ({len(tags_trouves)} compétences validées).")
        elif ratio >= 0.4:
            explications["competences"] = f"Correspondance partielle ({len(tags_trouves)} compétences)."
        elif ratio > 0:
            explications["competences"] = "Peu de compétences correspondent au poste."
            ecarts.append("Compétences techniques partiellement alignées.")
        else:
            explications["competences"] = "Aucune compétence ne correspond."
            ecarts.append("Compétences techniques non alignées avec l'offre.")
    else:
        ecarts.append("Aucune compétence ou description de poste disponible.")

    total = min(round(sum(details.values()), 2), 100.0)
    return {
        "total": total,
        "details": details,
        "explications": explications,
        "highlights": {"points_forts": points_forts, "ecarts": ecarts}
    }


def calculer_score_matching(candidat_user, offre):
    """Point d'entrée principal — algorithme amélioré avec synonymes et fuzzy matching."""
    if not candidat_user or not hasattr(candidat_user, 'profil_candidat'):
        return {
            "total": 0.0,
            "details": {"specialite": 0, "region": 0, "diplome": 0, "experience": 0, "competences": 0},
            "explications": {},
            "highlights": {"points_forts": [], "ecarts": ["Dossier candidat incomplet."]}
        }
    return _calculer_score_algo(candidat_user, offre)