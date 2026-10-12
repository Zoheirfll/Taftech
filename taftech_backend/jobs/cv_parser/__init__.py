"""Package de parsing de CV : réexporte les fonctions publiques et internes utilisées ailleurs (vues, tests, agent domaine)."""
from .extraction import (
    extract_photo_from_docx,
    extract_photo_from_pdf,
    extract_text,
    extract_text_from_docx,
    extract_text_from_pdf,
    extract_text_from_pdf_smart,
)
from .champs import (
    extract_diplome_max,
    extract_email,
    extract_name,
    extract_passeport,
    extract_permis,
    extract_phone,
    extract_service_militaire,
    extract_titre_professionnel,
    extract_vehicule,
    extract_wilaya,
)
from .sections import (
    SECTIONS_KEYWORDS,
    _PUCES,
    _RE_TITRE_COMPETENCES,
    _RE_TITRE_OUTILS,
    _est_titre_de_section,
    _raccourcir_competence,
    extract_competences,
    extract_langues,
    extraire_competences_par_ligne,
    find_sections,
)
from .experiences import (
    DATE_HEADER_PATTERN,
    _extract_experiences_du_au,
    _extract_experiences_fallback,
    _parse_titre_entreprise,
    extract_experiences_list,
)
from .formations import (
    DATE_FORMATION_HEADER,
    _extract_formations_fallback,
    _extract_formations_mois_annee,
    _parse_diplome_etablissement,
    extract_formations_list,
)
from .prompts import (
    PROMPT_CV_COMPLET,
)
from .groq_json import (
    _call_groq,
    _extract_json_array,
    _extract_json_object,
    _repair_truncated_json,
)
from .competences import (
    NIVEAU_POINTS_PARSER,
    PARSER_VERSION,
    _MAX_CHARS_COMPETENCE,
    _MAX_MOTS_COMPETENCE,
    _MAX_MOTS_COMPETENCE_LIGNE,
    _MAX_MOTS_TOURNURE_FAIBLE,
    _MOIS_RE,
    _NIVEAU_LABEL_VERS_CODE,
    _RE_COORDONNEE,
    _RE_DATE_ANNEE,
    _RE_DATE_TEXTE,
    _RE_EFFECTIF,
    _RE_EQUIPE_DE_N,
    _RE_MONTANT,
    _RE_PHRASE_PONCTUATION,
    _RE_PLAGE_NUMERIQUE,
    _RE_POURCENTAGE,
    _RE_QUANTITE,
    _RE_SEPARATEUR_COMPOSE,
    _RE_TOURNURE_MISSION,
    _RE_TOURNURE_MISSION_FAIBLE,
    _contient_signal_numerique_suspect,
    _eclater_competence_composee,
    _est_competence_valide,
    _filtrer_competences_valides,
    _labels_du_referentiel,
    _normaliser_avec_referentiel,
    _parser_niveaux_competences,
)
from .normalisation import (
    MOIS_FR,
    _date_iso_valide,
    _date_presente_dans_texte,
    _mois_depuis_nom,
    _normaliser_date_naissance,
    _normaliser_mobilite,
    _normaliser_sexe,
    _normaliser_situation_actuelle,
)
from .parser import (
    parse_cv,
    parse_with_groq,
)
