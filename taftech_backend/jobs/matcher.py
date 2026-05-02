import datetime

def calculer_score_matching(candidat_user, offre):
    """
    Calcule le pourcentage et retourne un dictionnaire détaillé.
    """
    details = {
        "specialite": 0.0,
        "region": 0.0,
        "diplome": 0.0,
        "experience": 0.0,
        "competences": 0.0
    }
    
    if not hasattr(candidat_user, 'profil_candidat'):
        return {"total": 0.0, "details": details}
        
    profil = candidat_user.profil_candidat

    # --- 1. SPÉCIALITÉ (Max 25%) ---
    # La spécialité de l'offre et celle du candidat restent indépendantes du diplôme.
    specialite_candidat = profil.specialite or profil.secteur_souhaite
    if specialite_candidat and offre.specialite:
        if specialite_candidat == offre.specialite:
            details["specialite"] = 25.0

    # --- 2. LOCALISATION (Max 20%) ---
    if profil.wilaya == offre.wilaya:
        details["region"] += 15.0
        if profil.commune and offre.commune and profil.commune.strip().lower() == offre.commune.strip().lower():
            details["region"] += 5.0
    elif profil.mobilite == 'NATIONALE':
        details["region"] += 15.0

    # --- 3. DIPLÔME (Max 20%) ---
    # Le diplôme est traité indépendamment pour vérifier uniquement le NIVEAU d'études.
    hierarchie_diplomes = {
        'NON_DIPLOMANTE': 0, 'NIVEAU_SECONDAIRE': 1, 'FORMATION_PRO': 2, 
        'NIVEAU_TERMINAL': 3, 'BACCALAUREAT': 4, 'UNIVERSITAIRE_SANS_DIPLOME': 5, 
        'CERTIFICATION': 6, 'TS': 7, 'LICENCE': 8, 'MASTER_1': 9, 
        'MASTER_2': 10, 'MAGISTERE': 11, 'DOCTORAT': 12
    }
    niveau_requis = hierarchie_diplomes.get(offre.diplome, 0) if offre.diplome else 0
    niveau_candidat = hierarchie_diplomes.get(profil.diplome, 0) if profil.diplome else 0
    
    if niveau_requis == 0:
        details["diplome"] = 20.0
    elif niveau_candidat >= niveau_requis:
        details["diplome"] = 20.0
    elif niveau_candidat == niveau_requis - 1:
        details["diplome"] = 10.0

    # --- 4. EXPÉRIENCE (Uniquement dans le domaine) (Max 20%) ---
    # CORRECTION DE L'ANOMALIE : On filtre les expériences pertinentes
    annees_experience = 0.0
    specialite_offre = offre.specialite.lower() if offre.specialite else ""
    mots_cles_offre = offre.titre.lower().split()

    for exp in profil.experiences_detail.all():
        texte_exp = f"{exp.titre_poste} {exp.entreprise} {exp.description}".lower()
        est_pertinente = False
        
        # Vérification si l'expérience a un lien avec le domaine ou le titre de l'offre
        if specialite_offre and specialite_offre in texte_exp:
            est_pertinente = True
        elif any(mot in texte_exp for mot in mots_cles_offre if len(mot) > 3):
            est_pertinente = True
            
        if est_pertinente:
            debut = exp.date_debut
            fin = exp.date_fin or datetime.date.today()
            jours = (fin - debut).days
            if jours > 0:
                annees_experience += jours / 365.25

    map_experience_requise = {
        'STAGIAIRE': 0, 'DEBUTANT': 0, 'JEUNE_DIPLOME': 1, 
        'CONFIRME': 3, 'MANAGER': 5, 'RESPONSABLE_EQUIPE': 5, 'CADRE_DIRIGEANT': 8
    }
    annees_requises = map_experience_requise.get(offre.experience_requise, 0)
    
    if annees_requises == 0:
        details["experience"] = 20.0
    elif annees_experience >= annees_requises:
        details["experience"] = 20.0
    elif annees_experience >= (annees_requises / 2):
        details["experience"] = 10.0

    # --- 5. COMPÉTENCES (Max 15%) ---
    if profil.competences and offre.profil_recherche:
        tags_candidat = [tag.strip().lower() for tag in profil.competences.split(',') if tag.strip()]
        texte_offre = offre.profil_recherche.lower()
        if tags_candidat:
            tags_trouves = sum(1 for tag in tags_candidat if tag in texte_offre)
            ratio = tags_trouves / len(tags_candidat)
            details["competences"] = round(ratio * 15.0, 2)

    total = sum(details.values())
    return {
        "total": min(round(total, 2), 100.0),
        "details": details
    }