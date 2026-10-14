"""Validation des questions disqualifiantes d'un questionnaire (correction client n°20).

Une question disqualifiante élimine automatiquement un candidat : elle ne peut donc porter que sur
une exigence professionnelle objective. Deux garde-fous, appliqués à l'enregistrement du
questionnaire :
  1. une justification professionnelle est obligatoire ;
  2. le texte de la question et de ses choix ne doit pas viser un critère protégé (âge, sexe,
     situation familiale, religion, origine, santé/handicap, opinions, appartenance syndicale...).

Le second garde-fou est une liste de termes, pas une garantie : il bloque les formulations
évidentes mais ne remplace ni la justification (tracée, visible de la modération) ni la vigilance
du recruteur. Le service national, la nationalité et les permis ne sont volontairement PAS bloqués :
ils peuvent constituer une exigence légale ou professionnelle précise d'une offre."""
import re
import unicodedata

JUSTIFICATION_MIN = 15
JUSTIFICATION_MAX = 500

# Mots entiers (après normalisation : minuscules, sans accents ni ponctuation).
_MOTS_PROTEGES = {
    'age': "l'âge", 'ages': "l'âge",
    'sexe': 'le sexe', 'homme': 'le sexe', 'hommes': 'le sexe', 'femme': 'le sexe', 'femmes': 'le sexe',
    'masculin': 'le sexe', 'feminin': 'le sexe',
    'marie': 'la situation familiale', 'mariee': 'la situation familiale', 'maries': 'la situation familiale',
    'celibataire': 'la situation familiale', 'celibataires': 'la situation familiale',
    'divorce': 'la situation familiale', 'divorcee': 'la situation familiale',
    'veuf': 'la situation familiale', 'veuve': 'la situation familiale',
    'enfant': 'la situation familiale', 'enfants': 'la situation familiale',
    'enceinte': 'la grossesse', 'grossesse': 'la grossesse',
    'religion': 'la religion', 'religieux': 'la religion', 'religieuse': 'la religion',
    'musulman': 'la religion', 'musulmane': 'la religion', 'chretien': 'la religion',
    'chretienne': 'la religion', 'juif': 'la religion', 'juive': 'la religion', 'athee': 'la religion',
    'ethnie': "l'origine", 'ethnique': "l'origine", 'race': "l'origine",
    'handicap': 'le handicap', 'handicape': 'le handicap', 'handicapee': 'le handicap',
    'syndicat': "l'appartenance syndicale", 'syndique': "l'appartenance syndicale",
    'homosexuel': "l'orientation sexuelle", 'homosexuelle': "l'orientation sexuelle",
}

# Expressions (séquences de mots normalisés).
_EXPRESSIONS_PROTEGEES = {
    'situation familiale': 'la situation familiale',
    'situation matrimoniale': 'la situation familiale',
    'date de naissance': "l'âge",
    'orientation sexuelle': "l'orientation sexuelle",
    'vie privee': 'la vie privée',
    'opinion politique': 'les opinions politiques',
    'opinions politiques': 'les opinions politiques',
    'appartenance politique': 'les opinions politiques',
    'origine ethnique': "l'origine",
    'etat de sante': "l'état de santé",
}

# « moins de 30 ans », « plus de 40 ans », « entre 25 et 35 ans » : une borne d'âge, sauf s'il
# s'agit d'une durée d'expérience (« plus de 5 ans d'expérience »).
_BORNE_AGE = re.compile(r'\b(moins|plus|jusqu a|entre)\b.{0,15}\b\d{2}\s+ans\b')
_MOTS_DUREE = ('experience', 'anciennete', 'pratique', 'exercice')


def _normaliser(texte):
    decompose = unicodedata.normalize('NFKD', str(texte or '').lower())
    sans_accents = ''.join(c for c in decompose if not unicodedata.combining(c))
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', sans_accents).split())


def critere_protege(texte):
    """Retourne le critère protégé visé par `texte` (ex. « l'âge »), ou None."""
    norm = _normaliser(texte)
    if not norm:
        return None
    for mot in norm.split():
        if mot in _MOTS_PROTEGES:
            return _MOTS_PROTEGES[mot]
    entoure = f' {norm} '
    for expression, critere in _EXPRESSIONS_PROTEGEES.items():
        if f' {expression} ' in entoure:
            return critere
    if _BORNE_AGE.search(norm) and not any(m in norm for m in _MOTS_DUREE):
        return "l'âge"
    return None


def erreurs_questions_disqualifiantes(questions):
    """Liste des messages d'erreur (vide si tout est valide) pour les questions disqualifiantes."""
    erreurs = []
    for numero, question in enumerate(questions or [], start=1):
        if not isinstance(question, dict) or not question.get('disqualifiant'):
            continue
        justification = str(question.get('justification_disqualifiant') or '').strip()
        if len(justification) < JUSTIFICATION_MIN:
            erreurs.append(
                f"Question {numero} : une question disqualifiante exige une justification professionnelle "
                f"(au moins {JUSTIFICATION_MIN} caractères)."
            )
        elif len(justification) > JUSTIFICATION_MAX:
            erreurs.append(f"Question {numero} : la justification ne doit pas dépasser {JUSTIFICATION_MAX} caractères.")
        textes = [question.get('texte')] + [c.get('texte') for c in question.get('choix') or [] if isinstance(c, dict)]
        for texte in textes:
            critere = critere_protege(texte)
            if critere:
                erreurs.append(
                    f"Question {numero} : une question disqualifiante ne peut pas porter sur {critere}. "
                    "Elle doit viser une exigence professionnelle objective (permis, habilitation, "
                    "droit d'exercice, certification...)."
                )
                break
    return erreurs
