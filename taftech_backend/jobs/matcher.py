import datetime
from django.utils.timezone import now

def calculer_score_matching(candidat_user, offre):
    """
    Calcule le pourcentage de correspondance entre un candidat et une offre.
    Retourne un dictionnaire de notes, d'explications et de faits saillants.
    """
    details = {
        "specialite": 0.0,
        "region": 0.0,
        "diplome": 0.0,
        "experience": 0.0,
        "competences": 0.0
    }
    explications = {
        "specialite": "Aucune spécialité renseignée ou domaine non concordant.",
        "region": "Éloignement géographique (Hors wilaya et sans mobilité nationale).",
        "diplome": "Le niveau de diplôme ne correspond pas aux exigences du poste.",
        "experience": "Manque d'expérience pertinente validée dans cette spécialité.",
        "competences": "Aucune correspondance trouvée dans les mots-clés du profil recherché."
    }
    points_forts = []
    ecarts = []
    
    # Sécurité profil manquant
    if not candidat_user or not hasattr(candidat_user, 'profil_candidat'):
        ecarts.append("Dossier candidat incomplet (Profil manquant).")
        return {
            "total": 0.0, 
            "details": details, 
            "explications": explications,
            "highlights": {"points_forts": points_forts, "ecarts": ecarts}
        }
        
    profil = candidat_user.profil_candidat

    # ==========================================
    # 1. SPÉCIALITÉ (Max 25%)
    # ==========================================
    specialite_candidat = profil.specialite or profil.secteur_souhaite
    if specialite_candidat and offre.specialite:
        if str(specialite_candidat).strip().upper() == str(offre.specialite).strip().upper():
            details["specialite"] = 25.0
            explications["specialite"] = "Le domaine d'activité correspond parfaitement."
            points_forts.append("Spécialité parfaitement alignée sur le poste.")
        else:
            ecarts.append("Le domaine d'activité du candidat diffère de l'offre.")
    else:
        ecarts.append("Spécialité ou secteur non renseigné sur le profil.")

    # ==========================================
    # 2. LOCALISATION (Max 20%)
    # ==========================================
    if profil.wilaya and offre.wilaya and str(profil.wilaya).strip().lower() == str(offre.wilaya).strip().lower():
        details["region"] += 15.0
        explications["region"] = "Réside dans la même wilaya."
        points_forts.append(f"Résidence dans la même Wilaya ({profil.wilaya}).")
        
        if profil.commune and offre.commune and str(profil.commune).strip().lower() == str(offre.commune).strip().lower():
            details["region"] += 5.0
            explications["region"] = "Réside dans la même commune (Proximité idéale)."
            points_forts.append(f"Proximité locale idéale (Commune de {profil.commune}).")
    elif profil.mobilite == 'NATIONALE':
        details["region"] += 15.0
        explications["region"] = "Dispose d'une mobilité nationale sur toute l'Algérie."
        points_forts.append("Mobilité nationale totale acceptée par le candidat.")
    else:
        wilaya_label = profil.wilaya if profil.wilaya else "Wilaya inconnue"
        ecarts.append(f"Candidat basé hors zone ({wilaya_label}) sans mobilité nationale.")

    # ==========================================
    # 3. DIPLÔME (Max 20%)
    # ==========================================
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
        explications["diplome"] = "Aucun diplôme spécifique exigé pour ce poste."
        points_forts.append("Critère de diplôme ouvert (sans exigences restrictives).")
    elif niveau_candidat >= niveau_requis:
        details["diplome"] = 20.0
        explications["diplome"] = "Niveau d'études requis atteint ou dépassé."
        points_forts.append("Niveau d'études requis validé.")
    elif niveau_candidat == niveau_requis - 1:
        details["diplome"] = 10.0
        explications["diplome"] = "Niveau d'études légèrement inférieur aux exigences."
        ecarts.append("Niveau d'études légèrement en dessous du niveau demandé.")
    else:
        ecarts.append("Diplôme ou niveau académique insuffisant pour les critères exigés.")

    # ==========================================
    # 4. EXPÉRIENCE (Max 20%)
    # ==========================================
    annees_experience = 0.0
    specialite_offre = str(offre.specialite).lower() if offre.specialite else ""
    mots_cles_offre = str(offre.titre).lower().split() if offre.titre else []

    # Utilisation sécurisée du manager d'objets liés Django
    if hasattr(profil, 'experiences_detail'):
        for exp in profil.experiences_detail.all():
            texte_exp = f"{exp.titre_poste} {exp.entreprise} {exp.description or ''}".lower()
            est_pertinente = False
            
            if specialite_offre and specialite_offre in texte_exp:
                est_pertinente = True
            elif any(mot in texte_exp for mot in mots_cles_offre if len(mot) > 3):
                est_pertinente = True
                
            if est_pertinente:
                debut = exp.date_debut
                fin = exp.date_fin
                
                # Conversion de sécurité si la date est lue comme une String
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

    map_experience_requise = {
        'STAGIAIRE': 0, 'DEBUTANT': 0, 'JEUNE_DIPLOME': 1, 
        'CONFIRME': 3, 'MANAGER': 5, 'RESPONSABLE_EQUIPE': 5, 'CADRE_DIRIGEANT': 8
    }
    annees_requises = map_experience_requise.get(offre.experience_requise, 0)
    
    if annees_requises == 0:
        details["experience"] = 20.0
        explications["experience"] = "Aucune expérience préalable exigée."
        points_forts.append("Poste ouvert aux profils débutants/juniors.")
    elif annees_experience >= annees_requises:
        details["experience"] = 20.0
        explications["experience"] = f"Expérience validée ({round(annees_experience, 1)} ans) conforme aux exigences."
        points_forts.append(f"Volume d'expérience requis atteint ({round(annees_experience, 1)} ans dans le domaine).")
    elif annees_experience >= (annees_requises / 2):
        details["experience"] = 10.0
        explications["experience"] = f"Expérience intermédiaire ({round(annees_experience, 1)} ans). Proche du niveau attendu."
        ecarts.append(f"Années d'expérience un peu courtes ({round(annees_experience, 1)} ans sur {annees_requises} ans demandés).")
    else:
        ecarts.append("Manque important d'expérience pratique dans ce secteur métier.")

    # ==========================================
    # 5. COMPÉTENCES (Max 15%)
    # ==========================================
    if profil.competences and offre.profil_recherche:
        tags_candidat = [tag.strip().lower() for tag in str(profil.competences).split(',') if tag.strip()]
        texte_offre = str(offre.profil_recherche).lower()
        if tags_candidat:
            tags_trouves = sum(1 for tag in tags_candidat if tag in texte_offre)
            ratio = tags_trouves / len(tags_candidat)
            details["competences"] = round(ratio * 15.0, 2)
            if ratio >= 0.8:
                explications["competences"] = "Excellente adéquation des compétences clés avec l'offre."
                points_forts.append("Fortes correspondances techniques détectées (Mots-clés CV).")
            elif ratio >= 0.4:
                explications["competences"] = "Une partie des compétences recherchées correspond à l'offre."
            else:
                explications["competences"] = "Peu de mots-clés ou compétences correspondent au profil recherché."
                ecarts.append("Compétences techniques clés manquantes ou non mentionnées.")
        else:
            ecarts.append("Aucune compétence technique exploitable rédigée.")
    else:
        ecarts.append("Aucune compétence technique clé détectée/analysée.")

    # Calcul du total
    total = sum(details.values())
    return {
        "total": min(round(total, 2), 100.0),
        "details": details,
        "explications": explications,
        "highlights": {
            "points_forts": points_forts,
            "ecarts": ecarts
        }
    }