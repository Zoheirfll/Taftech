"""Validation, éclatement, niveau et rapprochement référentiel des compétences extraites."""
import re

from ..referentiel_utils import normaliser_recherche


_NIVEAU_LABEL_VERS_CODE = {
    'débutant': 'DEBUTANT', 'intermédiaire': 'INTERMEDIAIRE', 'avancé': 'AVANCE', 'confirmé': 'CONFIRME',
}


PARSER_VERSION = "parser-2026.10.22-1"  # à incrémenter à chaque changement de prompt/logique (journal ParsingCV)
_MAX_MOTS_COMPETENCE = 8
_MAX_MOTS_COMPETENCE_LIGNE = 8  # au-delà, un libellé composé est éclaté (voir _eclater_competence_composee)
_MAX_CHARS_COMPETENCE = 70
_RE_SEPARATEUR_COMPOSE = re.compile(r'\s*(?:&|/|\bet\b)\s*', re.IGNORECASE)


def _eclater_competence_composee(label):
    """Une "compétence" qui combine plusieurs notions avec "&"/"et"/"/" (ex: "Relations
    sociales & dialogue syndical", "Reporting RH & indicateurs sociaux") est éclatée en
    plusieurs intitulés distincts au lieu d'être gardée comme un seul bloc composé qui
    dépasserait la longueur/le nombre de mots attendu d'une vraie compétence."""
    # Une ligne courte de la section "Compétences" du CV reste UNE compétence, telle qu'écrite
    # ("Administration du personnel & conformité réglementaire") : on n'éclate que les
    # libellés trop longs pour être un intitulé.
    if len(label.split()) <= _MAX_MOTS_COMPETENCE_LIGNE:
        return [label]
    morceaux = [m.strip() for m in _RE_SEPARATEUR_COMPOSE.split(label) if m.strip()]
    return morceaux if len(morceaux) > 1 else [label]

# Signaux numériques trahissant un chiffre-clé d'expérience (montant, effectif, date,
# pourcentage) recopié par erreur comme "compétence" au lieu d'un vrai intitulé —
# ex: "400 – 500 – 50 % x 30 M$", "2019-2023", "500 employés".
_RE_POURCENTAGE = re.compile(r'%')
_RE_MONTANT = re.compile(r'[$€£]|\b(da|dza|mda|kda)\b', re.IGNORECASE)
_RE_PLAGE_NUMERIQUE = re.compile(r'^\s*\d[\d\s.,]*\s*[-–—x×]\s*\d[\d\s.,]*(\s*[-–—x×]\s*\d[\d\s.,]*)*\s*$')
_RE_EFFECTIF = re.compile(r'\b\d[\d\s]*\s*(employ|salari|personnes?|collaborat|agents?)', re.IGNORECASE)
_RE_DATE_ANNEE = re.compile(r'^(19|20)\d{2}(\s*[-–—/]\s*(19|20)?\d{2,4})?$')
# Effectifs/volumes/durées décrits avec une unité ("30 personnes", "équipe de 12", "5 ans
# d'expérience", "plus de 200 clients") — jamais un nom de compétence.
_RE_QUANTITE = re.compile(
    r'\b\d[\d\s.,]*\s*(ans?|années?|mois|jours?|heures?|h\b|semaines?|projets?|clients?|sites?|postes?|'
    r'personnes?|employ\w*|salari\w*|collaborat\w*|agents?|équipes?|equipes?|managers?|dossiers?|'
    r'contrats?|recrutements?|millions?|milliards?|k\b|m\b)',
    re.IGNORECASE,
)
_RE_EQUIPE_DE_N = re.compile(r'\b(équipe|equipe|effectif|encadrement|manag\w*|supervis\w*)\b[^\d]{0,15}\d', re.IGNORECASE)
_MOIS_RE = (r'(janv(?:ier)?|f[ée]vr(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t?|sept(?:embre)?|'
            r'oct(?:obre)?|nov(?:embre)?|d[ée]c(?:embre)?|january|february|march|april|june|july|august|'
            r'september|october|november|december)')
# "Janvier 2023", "mars 2020 - présent", "depuis 2019", "2019 à aujourd'hui", "03/2021".
_RE_DATE_TEXTE = re.compile(
    r'\b' + _MOIS_RE + r'\.?\s+(19|20)\d{2}\b|\b(depuis|jusqu.?en|de|en|from|since)\s+(19|20)\d{2}\b|'
    r'\b(19|20)\d{2}\b.*\b(pr[ée]sent|aujourd|en cours|actuel)|\b\d{1,2}[/.-](19|20)\d{2}\b',
    re.IGNORECASE,
)
# Signaux de phrase/mission : ponctuation de phrase, tournure à la 1re personne ou verbe
# introductif de mission ("en charge de", "responsable de", "j'ai", "dans le cadre de").
_RE_PHRASE_PONCTUATION = re.compile(r'[.!?;]\s*\S|[.!?]$|\s[-–—]\s.+\s[-–—]\s')
_RE_TOURNURE_MISSION = re.compile(
    r"^(j'|je\s|nous\s|ma\s|mon\s|mes\s)|\b(en charge|au sein|dans le cadre|afin de|permettant|ayant|"
    r"charg[ée]e? (de|du|des))\b",
    re.IGNORECASE,
)
# Tournures qui, dans un libellé court, restent un intitulé légitime ("Suivi de projets",
# "Mise en place de processus") : rejetées seulement si le libellé dépasse 5 mots, donc
# s'il s'agit d'une description de mission.
_RE_TOURNURE_MISSION_FAIBLE = re.compile(
    r"\b(responsable (de|du|des) (la |le |les |l')|participation à|réalisation (de|du|des)|"
    r"mise en (place|œuvre|oeuvre)|pilotage (de|du|des)|suivi (de|du|des)|gestion (de|du|des) .{3,} (et|pour|afin)) ",
    re.IGNORECASE,
)
_MAX_MOTS_TOURNURE_FAIBLE = 5
_RE_COORDONNEE = re.compile(r'@|https?://|www\.|\+?\d[\d\s.-]{7,}\d')


def _contient_signal_numerique_suspect(label):
    """True si le libellé ressemble à un montant/pourcentage/date/effectif isolé
    (chiffre-clé d'une expérience) plutôt qu'à un nom de compétence — certaines
    compétences légitimes contiennent des chiffres (ex: "Python 3", "ISO 9001", "5S"),
    donc on ne bannit jamais les chiffres en soi : seuls des motifs typiquement
    numériques (ou un texte majoritairement composé de chiffres/symboles) sont rejetés."""
    if _RE_POURCENTAGE.search(label) or _RE_MONTANT.search(label):
        return True
    if _RE_PLAGE_NUMERIQUE.match(label) or _RE_DATE_ANNEE.match(label) or _RE_EFFECTIF.search(label):
        return True
    if _RE_QUANTITE.search(label) or _RE_EQUIPE_DE_N.search(label) or _RE_DATE_TEXTE.search(label):
        return True
    if re.fullmatch(r'[\d\s.,/+-]+', label) or _RE_COORDONNEE.search(label):
        return True
    lettres = sum(1 for ch in label if ch.isalpha())
    if label and lettres / len(label) < 0.35:
        return True
    return False


def _est_competence_valide(label):
    """Rejette une "compétence" qui ressemble à une phrase de mission, un chiffre-clé
    (montant/pourcentage/date/effectif) ou un extrait de texte plutôt qu'à un intitulé
    court — garde-fou contre une hallucination Groq qui recopierait une responsabilité
    entière d'une expérience (ex: "Gestion des dossiers disciplinaires et suivi des
    sanctions") ou un chiffre d'expérience (ex: "400 – 500 – 50 % x 30 M$") au lieu
    d'un nom de compétence (ex: "Gestion disciplinaire")."""
    label = label.strip()
    if not label or len(label) > _MAX_CHARS_COMPETENCE:
        return False
    if len(label.split()) > _MAX_MOTS_COMPETENCE:
        return False
    if _contient_signal_numerique_suspect(label):
        return False
    # Phrase complète / description de mission : ponctuation de phrase, 1re personne ou
    # tournure introductive de mission (voir _RE_TOURNURE_MISSION*).
    if _RE_PHRASE_PONCTUATION.search(label) or _RE_TOURNURE_MISSION.search(label):
        return False
    if len(label.split()) > _MAX_MOTS_TOURNURE_FAIBLE and _RE_TOURNURE_MISSION_FAIBLE.search(label):
        return False
    return True


def _filtrer_competences_valides(labels):
    """Filtre unique appliqué à TOUTES les sources de compétences (IA, bloc lu ligne par
    ligne dans le CV, outils) — une compétence invalide n'atteint jamais le candidat."""
    return [c for c in labels if _est_competence_valide(c)]


_MOTS_VIDES = frozenset({"de", "du", "des", "la", "le", "les", "l", "d", "en", "et", "au", "aux", "un", "une",
                         "pour", "sur", "par", "a"})


_LONGUEUR_RACINE = 6  # « amélioration » et « améliorer » partagent leur racine : une dérivation reste ancrée


def _singulier(jeton):
    return jeton[:-1] if len(jeton) > 3 and jeton.endswith(("s", "x")) else jeton


def jetons_du_texte(texte):
    """Mots significatifs d'un texte, sans accents ni pluriel : « Gestion de projets » → {gestion, projet}."""
    return {_singulier(j)[:_LONGUEUR_RACINE] for j in re.findall(r"\w+", normaliser_recherche(texte or ""))
            if len(j) >= 2 and j not in _MOTS_VIDES}


def est_ancree_dans_le_cv(label, jetons_cv):
    """Vrai si TOUS les mots significatifs de la compétence figurent dans le CV (`jetons_cv` =
    `jetons_du_texte(cv)`). L'IA recopie parfois les exemples de sa consigne (« Gestion de la paie »,
    « Leadership ») sur un CV qui n'en parle pas : une compétence que le CV ne contient pas n'est jamais
    proposée au candidat (même garde-fou que les dates, `_date_presente_dans_texte`)."""
    jetons_label = jetons_du_texte(label)
    return bool(jetons_label) and jetons_label <= jetons_cv


NIVEAU_POINTS_PARSER = {'DEBUTANT': 1, 'INTERMEDIAIRE': 2, 'AVANCE': 3, 'CONFIRME': 4}


def _labels_du_referentiel(labels):
    """Sous-ensemble de `labels` qui correspond exactement (casse ignorée) à une entrée
    active du référentiel TAFTECH (CompetenceReferentiel) — sert à indiquer au candidat
    quelles compétences extraites sont reconnues et lesquelles sont à vérifier."""
    from ..models import CompetenceReferentiel
    connus = {l.strip().lower() for l in CompetenceReferentiel.objects.filter(actif=True).values_list('label', flat=True)}
    return [l for l in labels if l.strip().lower() in connus]


def _normaliser_avec_referentiel(competences_niveaux, rapprochements=None):
    """Fait converger les intitulés de compétences parsés vers le référentiel admin
    (CompetenceReferentiel) — un libellé parsé identique/synonyme/très proche d'une
    entrée du référentiel est remplacé par son libellé canonique, pour éviter que
    "Gestion de projet", "Gestion des projets" et "Project Management" (même
    compétence, formulée différemment par le CV) ressortent comme 3 tags distincts.
    Une compétence sans correspondance connue est laissée telle quelle — elle reste
    proposée au candidat pour validation, jamais rejetée pour cette seule raison."""
    if not competences_niveaux:
        return competences_niveaux
    import difflib
    from ..models import CompetenceReferentiel

    # variante normalisée (minuscules, espaces compactés) -> libellé canonique
    variantes_vers_canonique = {}
    for ref in CompetenceReferentiel.objects.filter(actif=True).only('label', 'synonymes'):
        variantes = [ref.label] + [s.strip() for s in (ref.synonymes or '').split(',') if s.strip()]
        for v in variantes:
            cle = re.sub(r'\s+', ' ', v.strip().lower())
            if cle:
                variantes_vers_canonique[cle] = ref.label

    if not variantes_vers_canonique:
        return competences_niveaux

    variantes_connues = list(variantes_vers_canonique.keys())
    resultat = {}
    for label, niveau in competences_niveaux.items():
        cle = re.sub(r'\s+', ' ', label.strip().lower())
        canonique = variantes_vers_canonique.get(cle)
        if not canonique:
            proches = difflib.get_close_matches(cle, variantes_connues, n=1, cutoff=0.84)
            if proches:
                canonique = variantes_vers_canonique[proches[0]]
        label_final = canonique or label
        if rapprochements is not None and canonique and canonique != label:
            rapprochements[label] = canonique
        # Deux libellés parsés convergeant vers le même canonique (ou déjà identiques
        # après nettoyage) → on garde le niveau le plus élevé, pas un doublon.
        if label_final in resultat:
            if NIVEAU_POINTS_PARSER.get(niveau, 0) > NIVEAU_POINTS_PARSER.get(resultat[label_final], 0):
                resultat[label_final] = niveau
        else:
            resultat[label_final] = niveau
    return resultat


def _parser_niveaux_competences(brut):
    """Convertit "Compétence:Niveau, Compétence:Niveau" (sortie Groq) en dict {label: code
    NIVEAU_CHOICES de CompetenceCandidat} — même format texte que les langues, code aligné
    sur jobs.models.CompetenceCandidat.NIVEAU_CHOICES."""
    resultat = {}
    for item in brut.split(','):
        item = item.strip()
        if ':' not in item:
            continue
        label, niveau = item.split(':', 1)
        label, niveau = label.strip(), niveau.strip().lower()
        if label:
            resultat[label] = _NIVEAU_LABEL_VERS_CODE.get(niveau, 'INTERMEDIAIRE')
    return resultat
