"""Orchestration : parse_with_groq (analyse IA) et parse_cv (point d'entrée du parsing)."""
import re
from ..constants import WILAYAS_MAPPING
from ..constants import DIPLOMES_MAPPING
import logging
from .prompts import PROMPT_CV_COMPLET
from .groq_json import _call_groq, _extract_json_object
from .competences import est_ancree_dans_le_cv, jetons_du_texte, _eclater_competence_composee, _est_competence_valide, _filtrer_competences_valides, _labels_du_referentiel, _normaliser_avec_referentiel, _parser_niveaux_competences
from .normalisation import _normaliser_date_naissance, _normaliser_mobilite, _normaliser_sexe, _normaliser_situation_actuelle, _normaliser_telephone
from .extraction import extract_photo_from_docx, extract_photo_from_pdf, extract_text
from .sections import extraire_competences_par_ligne
from ..confidentialite_ia import ModeleNerIndisponible, extraire_coordonnees, nettoyer_texte
from .dates_fin import completer_annee_partagee, completer_dates_fin
from .langues import normaliser_langues
from .presentation import bio_de_presentation
from .entreprise import completer_entreprise
from .jetons import restaurer_jetons

logger = logging.getLogger(__name__)

_CHAMPS_AVEC_JETONS = ("titre_poste", "entreprise", "description", "diplome", "etablissement")

LONGUEUR_MAX_PARSER = 7000  # budget TPM Groq : voir le commentaire dans parse_with_groq

# Le CV envoyé à l'IA est nettoyé : cette note l'en informe pour qu'elle ne recopie jamais un jeton
# et laisse vides les champs personnels (remplis localement par TafTech à partir du CV brut).
NOTE_JETONS = (
    "Les informations personnelles du candidat (nom, e-mail, téléphone, adresse, date de "
    "naissance, liens, pièces d'identité) ont été remplacées par des jetons entre crochets "
    "comme [NOM] ou [EMAIL]. Ne les recopie jamais et renvoie null pour les champs "
    "correspondants (nom_complet, telephone, email, linkedin, github, adresse, "
    "date_naissance_raw).\n\n"
)


def _sans_jeton(valeur):
    """Écarte une valeur renvoyée par l'IA qui n'est qu'un jeton de masquage (ex. « [NOM] »)."""
    if valeur is None or re.fullmatch(r"\s*\[[^\]]*\]\s*", str(valeur)):
        return None
    return valeur


def parse_with_groq(text, noms_connus=()):
    """
    Appelle Groq UNE SEULE FOIS pour tout extraire (titre, expériences, formations, infos perso).
    Le texte est d'abord nettoyé (nom, coordonnées, adresse, pièces d'identité masqués) : l'IA ne
    voit jamais le CV brut. `noms_connus` : nom/prénom du compte, masqués en plus de la détection.
    Retourne None si le nettoyage est impossible (modèle de détection indisponible, échec fermé).
    Avant : 4 appels séquentiels renvoyant chacun le CV complet en entrée → 4x la consommation
    de tokens pour le même texte, ce qui déclenchait le rate-limit Groq (429) sur les CV longs.
    Retourne un dict complet, ou None si l'appel échoue entièrement.
    """
    # Réduit vs la version précédente : la liste des domaines ANEM injectée dans le
    # prompt (~900 tokens) grignote le budget TPM Groq (8000 tokens/min, requête =
    # prompt + max_tokens de complétion, donc le budget complet doit tenir dessous).
    try:
        nettoye = nettoyer_texte(text, noms_connus=noms_connus)
    except ModeleNerIndisponible:
        logger.error("Parser CV : modèle de détection indisponible, aucun appel IA.")
        return None
    text_truncated = nettoye.texte[:LONGUEUR_MAX_PARSER]

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
    prompt = NOTE_JETONS + prompt_source.replace("{cv_text}", text_truncated)
    content = _call_groq(prompt, max_tokens=ai_config.parser_cv_max_tokens,
                         donnees_candidat=text_truncated)
    infos = _extract_json_object(content)
    if not infos:
        # Un échec ponctuel (timeout, JSON malformé, 429) ne doit pas dégrader
        # tout le résultat vers le regex — un seul retry avant d'abandonner.
        logger.warning("Groq : échec 1er appel parsing CV, retry...")
        content = _call_groq(prompt, max_tokens=ai_config.parser_cv_max_tokens,
                             donnees_candidat=text_truncated)
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
        result["telephone"] = _normaliser_telephone(infos["telephone"])
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
        result["langues"] = normaliser_langues(str(infos["langues"]).strip())

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
def parse_cv(file_path, file_name, noms_connus=()):
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
    ai_data = parse_with_groq(text, noms_connus=noms_connus)
    if not ai_data:
        return {
            "success": False,
            "error": "Le service d'analyse IA est momentanément indisponible. Réessayez dans quelques instants."
        }

    # Coordonnées extraites localement du CV brut : l'IA, qui n'a vu que le texte nettoyé, ne les
    # connaît pas. La valeur locale prime toujours (rattachement au profil dans TafTech).
    coord = extraire_coordonnees(text)
    for cle in ("email", "linkedin", "github", "nom_complet"):
        ai_data[cle] = coord.get(cle) or _sans_jeton(ai_data.get(cle))
    ai_data["telephone"] = _normaliser_telephone(coord["telephone"]) if coord.get("telephone") else None
    ai_data["wilaya"] = ai_data.get("wilaya") or coord.get("wilaya")
    ai_data["date_naissance_raw"] = coord.get("date_naissance_raw") or _sans_jeton(ai_data.get("date_naissance_raw"))
    ai_data["adresse"] = None  # jamais extraite : perdue par construction (le candidat la saisit)

    # Un jeton de masquage recopié par l'IA dans un texte du profil (« [NOM], maintenance… » pour
    # « Monitoring, maintenance… ») est restauré depuis le CV brut, ou retiré.
    for bloc in ("experiences", "formations"):
        for element in ai_data.get(bloc) or []:
            for champ in _CHAMPS_AVEC_JETONS:
                if champ in element:
                    element[champ] = restaurer_jetons(element[champ], text)
    # CV en colonnes : fin d'expérience seule sous le titre, laissée vide par l'IA.
    completer_dates_fin(ai_data.get("experiences"), text)
    # « Sept. - Nov. 2020 » : année écrite une seule fois, début relu sur la ligne du titre.
    completer_annee_partagee(ai_data.get("experiences"), text)
    # Entreprise obligatoire à l'enregistrement : relue sous le titre si le masquage l'a fait perdre.
    completer_entreprise(ai_data.get("experiences"), text)

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
    jetons_cv = jetons_du_texte(text)
    competences_niveaux_ia = {k: v for k, v in competences_niveaux_ia.items()
                              if _est_competence_valide(k) and est_ancree_dans_le_cv(k, jetons_cv)}
    if lignes_cv:
        # Bloc "Competences" identifie dans le CV : il fait foi (une competence par ligne),
        # l'IA ne sert plus qu'a proposer un niveau quand elle a garde le meme intitule.
        niveaux_ia_bas = {k.lower(): v for k, v in competences_niveaux_ia.items()}
        competences_niveaux_ia = {c: niveaux_ia_bas.get(c.lower(), "DEBUTANT") for c in lignes_cv}
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
        "langues": normaliser_langues(ai_data.get("langues")),
        "linkedin": ai_data.get("linkedin"),
        "github": ai_data.get("github"),
        # L'IA rédige la bio mais la rend parfois nulle : repli sur le paragraphe de présentation du CV.
        "bio": ai_data.get("bio") or bio_de_presentation(text),
        "experiences": ai_data.get("experiences") or [],
        "formations": ai_data.get("formations") or [],
        "parsing_method": "ia",
    }

    return result
