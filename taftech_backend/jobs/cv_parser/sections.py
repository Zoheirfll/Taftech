"""Découpage du CV en sections et extraction des compétences et langues."""
import re



# ==========================================
# 4. SECTIONS
# ==========================================
SECTIONS_KEYWORDS = {
    'experiences': [
        'experience', 'expériences', 'expérience', 'experiences',
        'parcours professionnel', 'parcours pro', 'emploi', 'work experience',
        'professional experience', 'carrière', 'carriere',
        'work history', 'employment history', 'professional history',
        # Intitulés qualifiés (corpus du 23/10/2026) : seuls les qualificatifs sûrs, jamais « … experience »
        # seul (« Tutoring experience » est une compétence, pas une rubrique).
        'relevant professional experience', 'relevant experience', 'related experience', 'teaching experience',
        'corporate experience', 'employment & experience', 'employment and experience',
    ],
    'formations': [
        'formation', 'formations', 'education', 'études', 'etudes',
        'diplôme', 'diplome', 'diplômes', 'diplomes', 'cursus', 'scolarité'
    ],
    'competences': [
        'compétence', 'competence', 'compétences', 'competences',
        'skills', 'aptitudes', 'savoir-faire', 'technical skills', 'informatique'
    ],
    'langues': [
        'langue', 'langues', 'languages', 'language', 'compétences linguistiques'
    ],
    # Section volontairement non exploitée : sert juste de délimiteur pour ne pas polluer
    # la section précédente (ex: compétences) avec le contenu "Centres d'intérêt".
    'interets': [
        'centres d', 'centre d', 'hobbies', 'loisirs', "centres d'intérêt", "centres d'interet",
        'additional information', 'accomplishments', 'affiliations',
    ],
}


def _ajouter(sections, nom, lignes):
    """Un titre qui revient (deux « Education », « Teaching Experience » puis « Corporate Experience »)
    complète la section au lieu de l'écraser : sinon les premières expériences étaient perdues."""
    contenu = "\n".join(lignes).strip()
    sections[nom] = f"{sections[nom]}\n{contenu}".strip() if nom in sections else contenu


def find_sections(text):
    lines = text.split("\n")
    sections = {}
    current_section = None
    current_content = []

    for line in lines:
        line_clean = line.strip().lower()
        if not line_clean:
            if current_section:
                current_content.append("")
            continue

        matched_section = None
        for section_name, keywords in SECTIONS_KEYWORDS.items():
            for keyword in keywords:
                if line_clean.startswith(keyword) and len(line_clean) < 60:
                    matched_section = section_name
                    break
            if matched_section:
                break

        if matched_section:
            if current_section:
                _ajouter(sections, current_section, current_content)
            current_section = matched_section
            current_content = []
        elif current_section:
            current_content.append(line)

    if current_section:
        _ajouter(sections, current_section, current_content)

    return sections


# ==========================================
# 5. COMPÉTENCES & LANGUES
# ==========================================
def extract_competences(text_section):
    if not text_section:
        return ""
    cleaned = re.sub(r'[•●○■□▪▫◦‣⁃]', ',', text_section)
    cleaned = re.sub(r'[-–—]\s', ',', cleaned)
    cleaned = re.sub(r'\n+', ',', cleaned)
    items = re.split(r'[,;]', cleaned)
    competences = [item.strip() for item in items if item.strip() and len(item.strip()) > 1]
    seen = set()
    result = []
    for c in competences:
        c_low = c.lower()
        if c_low not in seen and len(c) <= 80:
            seen.add(c_low)
            result.append(c)
        if len(result) >= 30:
            break
    return ", ".join(result)


_PUCES = "•●▪■⁃–—-*>"
_RE_TITRE_COMPETENCES = re.compile(r"^\s*comp[eé]tences?(\s+cl[eé]s?)?\s*:?\s*$", re.IGNORECASE)
_RE_TITRE_OUTILS = re.compile(r"^\s*(informatique|outils?|logiciels?|bureautique)\b[^:]{0,30}$", re.IGNORECASE)


def _est_titre_de_section(ligne):
    """Ligne d'en-tete de section : tout en majuscules, sans puce, courte (ex: 'INFORMATIQUE & LANGUES')."""
    l = ligne.strip()
    lettres = [c for c in l if c.isalpha()]
    return (len(lettres) >= 4 and l == l.upper() and l[0] not in _PUCES and len(l.split()) <= 6)


def _raccourcir_competence(item):
    item = re.split(r"\s*:\s*", item, maxsplit=1)[0]
    item = re.split(r"\s+(?:dans|pour|afin)\s+", item, maxsplit=1)[0]
    mots = item.split()
    return " ".join(mots[:6]) if len(mots) > 8 else item


def extraire_competences_par_ligne(text):
    """Competences lues LIGNE PAR LIGNE dans un bloc dedie du CV (titre 'COMPETENCES [CLES]' suivi
    de puces, puis eventuel bloc 'INFORMATIQUE'/'Outils' avec 'Libelle : a, b, c'). Deterministe :
    le modele IA ne respecte pas toujours la consigne 'une competence par ligne'. Retourne [] si
    aucun bloc identifiable (l'extraction IA reste alors la seule source)."""
    lignes = [l.rstrip() for l in (text or "").splitlines()]
    items = []
    i = 0
    while i < len(lignes):
        l = lignes[i]
        if _RE_TITRE_COMPETENCES.match(l) and (_est_titre_de_section(l) or l.strip().lower().startswith("comp")):
            i += 1
            courant = None
            while i < len(lignes) and not _est_titre_de_section(lignes[i]):
                brut = lignes[i].strip()
                i += 1
                if not brut:
                    continue
                if brut[0] in _PUCES:
                    if courant:
                        items.append(courant)
                    courant = brut.lstrip(_PUCES + " ").strip()
                elif courant:
                    courant += " " + brut
            if courant:
                items.append(courant)
            continue
        if _RE_TITRE_OUTILS.match(l) and _est_titre_de_section(l):
            i += 1
            while i < len(lignes) and not _est_titre_de_section(lignes[i]):
                brut = lignes[i].strip()
                i += 1
                if ":" not in brut or brut.lower().startswith(("langue", "language")):
                    continue
                for outil in brut.split(":", 1)[1].split(","):
                    outil = re.sub(r"\s*\([^)]*\)", "", outil).strip(" .;")
                    # Phrase coupée par un retour à la ligne ("logiciels développés en / interne") : ignorée.
                    if outil and len(outil.split()) <= 4 and outil.split()[-1].lower() not in ("en", "de", "du", "des", "et", "à", "la", "le", "les", "d'"):
                        items.append(outil)
            continue
        i += 1
    resultat, vus = [], set()
    for it in items:
        # Puce longue (description de projet) : un seul intitulé court, jamais coupée sur ses virgules.
        morceaux = [_raccourcir_competence(it)] if (":" in it or len(it.split()) > 8) else re.split(r"\s*,\s*", it)
        for morceau in morceaux:
            morceau = _raccourcir_competence(morceau.strip())
            cle = morceau.lower()
            if morceau and len(morceau) > 1 and cle not in vus:
                vus.add(cle)
                resultat.append(morceau)
    return resultat if len(resultat) >= 3 else []



def extract_langues(text_section):
    if not text_section:
        return ""
    langues_connues = [
        'français', 'francais', 'french', 'arabe', 'arabic',
        'anglais', 'english', 'espagnol', 'spanish', 'allemand', 'german',
        'italien', 'italian', 'tamazight', 'berbère', 'kabyle', 'chinois',
        'turc', 'russe', 'portugais'
    ]
    found = []
    text_low = text_section.lower()
    for langue in langues_connues:
        if langue in text_low:
            langue_clean = langue.capitalize()
            if langue_clean in [f.split(' (')[0] for f in found]:
                continue
            pattern = rf'{langue}\s*[:\-]?\s*([a-zà-ÿ0-9\s\(\)/.,]{{0,60}})'
            m = re.search(pattern, text_low)
            niveau = ""
            if m:
                niveau_raw = m.group(1).strip()
                for keyword in ['maternelle', 'natif', 'native', 'bilingue', 'courant', 'avancé', 'avance', 'fluent', 'intermédiaire', 'intermediaire', 'débutant', 'debutant', 'bon niveau', 'notions', 'scolaire', 'c1', 'c2', 'b1', 'b2', 'a1', 'a2']:
                    if keyword in niveau_raw:
                        niveau = f" ({keyword.capitalize()})"
                        break
            found.append(langue_clean + niveau)
    return ", ".join(found)
