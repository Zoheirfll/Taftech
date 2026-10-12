"""Orchestration : parse_with_groq (analyse IA) et parse_cv (point d'entrée du parsing)."""
import re
from ..constants import WILAYAS_MAPPING
from ..constants import DIPLOMES_MAPPING
import logging
from .prompts import PROMPT_CV_COMPLET
from .groq_json import _call_groq, _extract_json_object
from .competences import _eclater_competence_composee, _est_competence_valide, _filtrer_competences_valides, _labels_du_referentiel, _normaliser_avec_referentiel, _parser_niveaux_competences
from .normalisation import _normaliser_date_naissance, _normaliser_mobilite, _normaliser_sexe, _normaliser_situation_actuelle
from .extraction import extract_photo_from_docx, extract_photo_from_pdf, extract_text
from .sections import extraire_competences_par_ligne

logger = logging.getLogger(__name__)


def parse_with_groq(text):
    """
    Appelle Groq UNE SEULE FOIS pour tout extraire (titre, expériences, formations, infos perso).
    Avant : 4 appels séquentiels renvoyant chacun le CV complet en entrée → 4x la consommation
    de tokens pour le même texte, ce qui déclenchait le rate-limit Groq (429) sur les CV longs.
    Retourne un dict complet, ou None si l'appel échoue entièrement.
    """
    # Réduit vs la version précédente : la liste des domaines ANEM injectée dans le
    # prompt (~900 tokens) grignote le budget TPM Groq (8000 tokens/min, requête =
    # prompt + max_tokens de complétion, donc le budget complet doit tenir dessous).
    text_truncated = text[:7000]

    result = {
        "titre_professionnel": None,
        "experiences": [],
        "formations": [],
        "nom_complet": None,
        "telephone": None,
        "competences": None,
        "competences_niveaux": {},
        "langues": None,
        "linkedin": None,
        "github": None,
        "bio": None,
        "email": None,
        "wilaya": None,
        "diplome": None,
        "service_militaire": None,
        "sexe": None,
        "permis_conduire": False,
        "passeport_valide": False,
        "vehicule_personnel": False,
    }

    logger.debug("Groq : extraction complète du CV (1 appel)...")
    from ..models import AIConfig
    ai_config = AIConfig.get_solo()
    prompt_source = ai_config.parser_cv_prompt or PROMPT_CV_COMPLET
    prompt = prompt_source.replace("{cv_text}", text_truncated)
    content = _call_groq(prompt, max_tokens=ai_config.parser_cv_max_tokens)
    infos = _extract_json_object(content)
    if not infos:
        # Un échec ponctuel (timeout, JSON malformé, 429) ne doit pas dégrader
        # tout le résultat vers le regex — un seul retry avant d'abandonner.
        logger.warning("Groq : échec 1er appel parsing CV, retry...")
        content = _call_groq(prompt, max_tokens=ai_config.parser_cv_max_tokens)
        infos = _extract_json_object(content)
        if not infos:
            return None

    if infos.get("titre_professionnel"):
        titre = str(infos["titre_professionnel"]).strip().strip('"').strip("'")
        if titre and titre != "NON_TROUVE" and len(titre) < 150:
            result["titre_professionnel"] = titre

    experiences = infos.get("experiences")
    if isinstance(experiences, list):
        experiences_clean = [
            e for e in experiences
            if isinstance(e, dict) and e.get("titre_poste")
        ]
        result["experiences"] = experiences_clean[:15]

    formations = infos.get("formations")
    if isinstance(formations, list):
        formations_clean = [
            f for f in formations
            if isinstance(f, dict) and f.get("diplome")
        ]
        result["formations"] = formations_clean[:10]

    if infos.get("nom_complet"):
        result["nom_complet"] = str(infos["nom_complet"]).strip()
    if infos.get("telephone"):
        tel = re.sub(r'[\s.\-()]', '', str(infos["telephone"]))
        tel = re.split(r'[/,;]', tel)[0]
        # L'IA colle parfois 2 numéros sans séparateur ("05523990670770960926") ou
        # préfixe l'indicatif international ("2130552399067") — un numéro algérien
        # fait 10 chiffres (0X XX XX XX XX) une fois l'indicatif retiré.
        digits_only = re.sub(r'\D', '', tel)
        if digits_only.startswith('00213'):
            digits_only = '0' + digits_only[5:]
        elif digits_only.startswith('213') and len(digits_only) > 10:
            digits_only = '0' + digits_only[3:]
        if len(digits_only) > 10 and digits_only.startswith('0'):
            digits_only = digits_only[:10]
        tel = digits_only or tel
        result["telephone"] = tel
    if infos.get("competences"):
        items = [m for c in str(infos["competences"]).split(',') for m in _eclater_competence_composee(c.strip())]
        valides = [c for c in items if _est_competence_valide(c)]
        if valides:
            result["competences"] = ", ".join(valides)
    if infos.get("competences_niveaux"):
        niveaux_bruts = _parser_niveaux_competences(str(infos["competences_niveaux"]))
        niveaux = {}
        for label, niveau in niveaux_bruts.items():
            for morceau in _eclater_competence_composee(label):
                niveaux.setdefault(morceau, niveau)
        result["competences_niveaux"] = {k: v for k, v in niveaux.items() if _est_competence_valide(k)}
    if infos.get("langues"):
        result["langues"] = str(infos["langues"]).strip()

    result["linkedin"] = infos.get("linkedin")
    result["github"] = infos.get("github")
    result["bio"] = infos.get("bio")

    if infos.get("email"):
        result["email"] = str(infos["email"]).strip()

    # L'IA renvoie le libellé libre (ex: "Oran", "Master 2 en Informatique") — mappé
    # vers le code interne via les dictionnaires déjà utilisés par extract_wilaya/
    # extract_diplome_max (pas besoin d'injecter la liste complète des 58 wilayas/13
    # diplômes dans le prompt, ça dépassait le quota TPM Groq).
    if infos.get("wilaya"):
        wilaya_low = str(infos["wilaya"]).strip().lower()
        for wilaya_text, code in WILAYAS_MAPPING.items():
            if re.search(r'\b' + re.escape(wilaya_text) + r'\b', wilaya_low):
                result["wilaya"] = code
                break

    if infos.get("diplome"):
        diplome_texte_brut = str(infos["diplome"]).strip()
        # Gardé à côté du code mappé (13 valeurs coarse ci-dessous) — nécessaire pour résoudre
        # le "Niveau d'études" référentiel v2 (TypeDiplome, 37 valeurs précises) par recherche
        # de mots entiers, seul l'intitulé original permet cette précision.
        result["diplome_texte_brut"] = diplome_texte_brut
        diplome_low = diplome_texte_brut.lower()
        for keywords, code in DIPLOMES_MAPPING:
            if any(re.search(r'\b' + re.escape(kw) + r'\b', diplome_low) for kw in keywords):
                result["diplome"] = code
                break

    service_militaire_map = {
        'non concerné': 'NON_CONCERNE', 'dégagé': 'DEGAGE', 'sursitaire': 'SURSITAIRE',
        'inapte': 'INAPTE', 'incorporé': 'INCORPORE',
    }
    if infos.get("service_militaire"):
        sm_low = str(infos["service_militaire"]).strip().lower()
        result["service_militaire"] = service_militaire_map.get(sm_low)

    result["permis_conduire"] = bool(infos.get("permis_conduire"))
    result["passeport_valide"] = bool(infos.get("passeport_valide"))
    result["vehicule_personnel"] = bool(infos.get("vehicule_personnel"))

    return result

# ==========================================
# 8. FONCTION PRINCIPALE
# ==========================================
def parse_cv(file_path, file_name):
    text = extract_text(file_path, file_name)

    if not text or len(text.strip()) < 50:
        return {
            "success": False,
            "error": "Impossible d'extraire du texte. Le PDF est peut-être scanné (image)."
        }

    # Extraction photo — extraction d'image binaire embarquée, pas une heuristique
    # de texte, aucun équivalent IA pertinent pour ça.
    photo = None
    name_lower = file_name.lower()
    if name_lower.endswith(".pdf"):
        photo = extract_photo_from_pdf(file_path)
    elif name_lower.endswith((".docx", ".doc")):
        photo = extract_photo_from_docx(file_path)

    # === Extraction 100% IA — plus de repli regex ===
    # Un échec (après le retry interne de parse_with_groq) retourne une erreur
    # explicite plutôt qu'un résultat dégradé silencieusement.
    ai_data = parse_with_groq(text)
    if not ai_data:
        return {
            "success": False,
            "error": "Le service d'analyse IA est momentanément indisponible. Réessayez dans quelques instants."
        }

    # Normalisation contre le référentiel admin (CompetenceReferentiel) — fait converger
    # les doublons/synonymes ("Gestion de projet" / "Project Management" / "Gestion des
    # projets") vers un seul libellé canonique avant de proposer les compétences au
    # candidat. Reconstruit "competences" (texte) depuis le dict normalisé pour que les
    # deux champs restent cohérents entre eux.
    competences_niveaux_ia = ai_data.get("competences_niveaux") or {}
    # Même filtre que pour l'IA : le bloc lu ligne par ligne peut contenir des puces qui
    # sont des chiffres-clés, dates ou descriptions de missions plutôt que des compétences.
    lignes_cv = _filtrer_competences_valides(extraire_competences_par_ligne(text))
    if len(lignes_cv) < 3:
        lignes_cv = []
    competences_niveaux_ia = {k: v for k, v in competences_niveaux_ia.items() if _est_competence_valide(k)}
    if lignes_cv:
        # Bloc "Competences" identifie dans le CV : il fait foi (une competence par ligne),
        # l'IA ne sert plus qu'a proposer un niveau quand elle a garde le meme intitule.
        niveaux_ia_bas = {k.lower(): v for k, v in competences_niveaux_ia.items()}
        competences_niveaux_ia = {c: niveaux_ia_bas.get(c.lower(), "INTERMEDIAIRE") for c in lignes_cv}
    competences_rapprochees = {}
    competences_niveaux_normalisees = _normaliser_avec_referentiel(competences_niveaux_ia, competences_rapprochees)
    competences_referentiel = _labels_du_referentiel(list(competences_niveaux_normalisees.keys()))
    competences_texte = ", ".join(competences_niveaux_normalisees.keys()) or None

    # "Niveau d'études" référentiel v2 (ProfilCandidat.diplome_ref/niveau_scolaire_ref,
    # sélecteur TypeDiplome/Scolarite) — jusqu'ici jamais rempli par le parser, seul
    # l'ancien champ texte `diplome` (13 valeurs coarse) l'était. Résolu par mot entier
    # depuis l'intitulé brut extrait du CV (même logique que pour les formations
    # individuelles, plus précise que la table de 7 cas de `resoudre_diplome_legacy`) ;
    # repli sur cette dernière (depuis le code coarse déjà mappé) si le texte libre ne
    # matche rien de sûr dans le référentiel — couvre les niveaux de scolarité
    # (secondaire/universitaire sans diplôme) qu'une recherche par mot ne peut pas
    # trouver puisqu'ils ne sont pas des `TypeDiplome`.
    from ..referentiel_utils import resoudre_diplome_et_specialite_depuis_texte, resoudre_diplome_legacy
    diplome_ref, _ = resoudre_diplome_et_specialite_depuis_texte(ai_data.get("diplome_texte_brut"))
    niveau_scolaire_ref = None
    if not diplome_ref:
        diplome_ref, niveau_scolaire_ref = resoudre_diplome_legacy(ai_data.get("diplome"))

    result = {
        "success": True,
        "photo": photo,
        "email": ai_data.get("email"),
        "wilaya": ai_data.get("wilaya"),
        "adresse": ai_data.get("adresse"),
        "diplome": ai_data.get("diplome"),
        "diplome_ref": diplome_ref.id if diplome_ref else None,
        "diplome_ref_libelle": diplome_ref.libelle if diplome_ref else None,
        "niveau_scolaire_ref": niveau_scolaire_ref.id if niveau_scolaire_ref else None,
        "niveau_scolaire_ref_libelle": niveau_scolaire_ref.libelle if niveau_scolaire_ref else None,
        "specialite": None,
        "service_militaire": ai_data.get("service_militaire"),
        "sexe": _normaliser_sexe(ai_data.get("sexe")),
        "date_naissance": _normaliser_date_naissance(ai_data.get("date_naissance_raw"), text),
        "situation_actuelle": _normaliser_situation_actuelle(ai_data.get("situation_actuelle")),
        "mobilite": _normaliser_mobilite(ai_data.get("mobilite")),
        "salaire_souhaite": ai_data.get("salaire_souhaite"),
        "permis_conduire": ai_data.get("permis_conduire", False),
        "passeport_valide": ai_data.get("passeport_valide", False),
        "vehicule_personnel": ai_data.get("vehicule_personnel", False),
        "nom_complet": ai_data.get("nom_complet"),
        "telephone": ai_data.get("telephone"),
        "titre_professionnel": ai_data.get("titre_professionnel"),
        "competences": competences_texte if competences_niveaux_normalisees else ai_data.get("competences"),
        # Rapprochement avec le référentiel TAFTECH : libellés reconnus, et correspondances
        # {intitulé du CV: libellé du référentiel} pour que le candidat valide/modifie/supprime.
        "competences_referentiel": competences_referentiel,
        "competences_rapprochees": competences_rapprochees,
        "competences_niveaux": competences_niveaux_normalisees,
        "competences_source": "SECTION" if lignes_cv else "IA",
        "langues": ai_data.get("langues"),
        "linkedin": ai_data.get("linkedin"),
        "github": ai_data.get("github"),
        "bio": ai_data.get("bio"),
        "experiences": ai_data.get("experiences") or [],
        "formations": ai_data.get("formations") or [],
        "parsing_method": "ia",
    }

    return result
