"""
Module de parsing de CV automatique.
Phase 1 : Regex + heuristiques (rapide, local, gratuit).
Phase 2 (futur) : Ollama pour les CV complexes.
"""
import re
import io
import base64
import pdfplumber
from docx import Document
import fitz  # pymupdf - pour extraire les images du PDF
import json
import os
from groq import Groq
from .constants import WILAYAS_MAPPING, DIPLOMES_MAPPING, SPECIALITES_MAPPING




# ==========================================
# 1. EXTRACTION DU TEXTE BRUT
# ==========================================
def extract_text_from_pdf(file_path):
    """Extrait tout le texte d'un PDF."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Erreur extraction PDF : {e}")
    return text


def extract_text_from_docx(file_path):
    """Extrait tout le texte d'un fichier Word .docx."""
    text = ""
    try:
        doc = Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Erreur extraction DOCX : {e}")
    return text
def extract_text_from_pdf_smart(file_path):
    """
    Extraction intelligente : utilise les coordonnées des mots
    pour mieux comprendre la structure des CV en colonnes.
    Reconstruit les lignes en regroupant les mots qui sont sur la même ligne Y.
    """
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                words = page.extract_words(
                    keep_blank_chars=False,
                    use_text_flow=False,
                    extra_attrs=["fontname", "size"]
                )
                if not words:
                    continue

                # Regroupe les mots par ligne (même position Y approximative)
                lines_dict = {}
                tolerance = 3  # tolérance en pixels pour considérer "même ligne"
                for w in words:
                    y_key = round(w['top'] / tolerance) * tolerance
                    if y_key not in lines_dict:
                        lines_dict[y_key] = []
                    lines_dict[y_key].append(w)

                # Trie chaque ligne par position X (de gauche à droite)
                sorted_y = sorted(lines_dict.keys())
                for y in sorted_y:
                    line_words = sorted(lines_dict[y], key=lambda w: w['x0'])
                    line_text = " ".join(w['text'] for w in line_words)
                    text += line_text + "\n"
    except Exception as e:
        print(f"Erreur extraction PDF smart : {e}")
    return text

def extract_text(file_path, file_name):
    """Détecte le type et extrait le texte."""
    name_lower = file_name.lower()
    if name_lower.endswith(".pdf"):
        # On essaie d'abord l'extraction "smart" qui gère les colonnes
        text_smart = extract_text_from_pdf_smart(file_path)
        # Si on a bien du texte, on l'utilise
        if text_smart and len(text_smart.strip()) > 100:
            return text_smart
        # Sinon fallback sur l'extraction classique
        return extract_text_from_pdf(file_path)
    elif name_lower.endswith(".docx") or name_lower.endswith(".doc"):
        return extract_text_from_docx(file_path)
    return ""


# ==========================================
# 2. EXTRACTION DE LA PHOTO DEPUIS LE PDF
# ==========================================
def extract_photo_from_pdf(file_path):
    """
    Extrait la plus grande image du PDF (probablement la photo de profil).
    Retourne une string base64 prête à envoyer au frontend.
    """
    try:
        doc = fitz.open(file_path)
        biggest_image = None
        biggest_size = 0

        for page_num in range(min(2, len(doc))):  # Cherche dans les 2 premières pages
            page = doc[page_num]
            images = page.get_images(full=True)
            for img in images:
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]

                # On garde la plus grande (généralement la photo de profil)
                if len(image_bytes) > biggest_size and len(image_bytes) > 5000:
                    biggest_size = len(image_bytes)
                    biggest_image = {
                        "data": base64.b64encode(image_bytes).decode('utf-8'),
                        "ext": image_ext,
                    }
        doc.close()
        return biggest_image
    except Exception as e:
        print(f"Erreur extraction image : {e}")
        return None


# ==========================================
# 3. CHAMPS SIMPLES (REGEX)
# ==========================================
def extract_email(text):
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    match = re.search(pattern, text)
    return match.group(0).lower() if match else None


def extract_phone(text):
    patterns = [
        r'\+213\s?[567]\d{1}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}',
        r'00213\s?[567]\d{1}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}',
        r'0[567]\d{1}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return re.sub(r'[\s.-]', '', match.group(0))
    return None


def extract_name(text):
    """Heuristique : le nom est dans les premières lignes."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:8]:
        if "@" in line or re.search(r'\d{4,}', line):
            continue
        if len(line) > 60 or len(line) < 4:
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and all(len(w) >= 2 for w in words):
            blacklist = ['cv', 'curriculum', 'vitae', 'profil', 'profile']
            if not any(b in line.lower() for b in blacklist):
                return line.title()
    return None


def extract_titre_professionnel(text):
    """
    Cherche le titre pro : c'est souvent la 2e ligne (après le nom),
    en majuscules ou contenant "ingénieur", "développeur", "chef", etc.
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    keywords = [
        'ingénieur', 'ingenieur', 'développeur', 'developpeur', 'chef',
        'directeur', 'responsable', 'manager', 'consultant', 'analyste',
        'cadre', 'technicien', 'assistant', 'comptable', 'commercial',
        'administrateur', 'gestionnaire', 'designer', 'architecte',
        'data scientist', 'expert', 'spécialiste', 'specialiste', 'coordinateur'
    ]
    # Acronymes à garder en majuscules après title()
    acronymes = ['IA', 'IT', 'RH', 'BTP', 'QSE', 'HSE', 'R&D', 'SQL', 'CEO', 'CTO', 'CFO', 'PDG', 'DSI', 'ERP', 'CRM', 'SEO', 'SEM', 'API', 'CV', 'PHP', 'CSS', 'HTML', 'PMO']

    for line in lines[:10]:
        line_low = line.lower()
        if "@" in line or re.search(r'\d{4,}', line):
            continue
        if any(k in line_low for k in keywords) and 5 < len(line) < 120:
            # Capitalise proprement
            result = line.title().replace(" Et ", " et ").replace(" De ", " de ").replace(" Du ", " du ").replace(" La ", " la ").replace(" Le ", " le ").replace(" Des ", " des ")
            # Remet les acronymes en majuscules
            for acro in acronymes:
                # On remplace "Ia" par "IA", "Rh" par "RH", etc. (avec word boundaries)
                pattern = r'\b' + acro.capitalize() + r'\b'
                result = re.sub(pattern, acro, result)
            return result
    return None


def extract_wilaya(text):
    """Détecte la wilaya mentionnée dans le CV."""
    text_low = text.lower()
    for wilaya_text, code in WILAYAS_MAPPING.items():
        # On cherche le mot entier
        pattern = r'\b' + re.escape(wilaya_text) + r'\b'
        if re.search(pattern, text_low):
            return code
    return None


def extract_diplome_max(text):
    """Détecte le plus haut diplôme."""
    text_low = text.lower()
    # On parcourt dans l'ordre (du plus élevé au plus bas)
    for keywords, code in DIPLOMES_MAPPING:
        for kw in keywords:
            if kw in text_low:
                return code
    return None


def extract_specialite(text):
    """Détecte la spécialité principale."""
    text_low = text.lower()
    # On compte les occurrences pour choisir la spécialité dominante
    scores = {}
    for keywords, code in SPECIALITES_MAPPING:
        score = sum(text_low.count(kw) for kw in keywords)
        if score > 0:
            scores[code] = scores.get(code, 0) + score
    if scores:
        return max(scores, key=scores.get)
    return None


def extract_service_militaire(text):
    """Détecte le statut militaire."""
    text_low = text.lower()
    mapping = {
        'dégagé': 'DEGAGE', 'degage': 'DEGAGE',
        'sursitaire': 'SURSITAIRE', 'sursis': 'SURSITAIRE',
        'inapte': 'INAPTE',
        'incorporé': 'INCORPORE', 'incorpore': 'INCORPORE',
        'non concerné': 'NON_CONCERNE', 'non concerne': 'NON_CONCERNE',
    }
    for keyword, code in mapping.items():
        if keyword in text_low:
            return code
    return None


def extract_permis(text):
    """Détecte la présence d'un permis de conduire."""
    text_low = text.lower()
    keywords = ['permis de conduire', 'permis b', 'permis a', 'driving license', 'driver license']
    return any(k in text_low for k in keywords)


def extract_passeport(text):
    """Détecte la présence d'un passeport."""
    text_low = text.lower()
    keywords = ['passeport', 'passport']
    return any(k in text_low for k in keywords)


def extract_vehicule(text):
    """Détecte si le candidat est véhiculé."""
    text_low = text.lower()
    keywords = ['véhicule personnel', 'vehicule personnel', 'véhiculé', 'vehicule', 'voiture personnelle']
    return any(k in text_low for k in keywords)


# ==========================================
# 4. SECTIONS
# ==========================================
SECTIONS_KEYWORDS = {
    'experiences': [
        'experience', 'expériences', 'expérience', 'experiences',
        'parcours professionnel', 'parcours pro', 'emploi', 'work experience',
        'professional experience', 'carrière', 'carriere'
    ],
    'formations': [
        'formation', 'formations', 'education', 'études', 'etudes',
        'diplôme', 'diplome', 'diplômes', 'diplomes', 'cursus', 'scolarité'
    ],
    'competences': [
        'compétence', 'competence', 'compétences', 'competences',
        'skills', 'aptitudes', 'savoir-faire', 'technical skills'
    ],
    'langues': [
        'langue', 'langues', 'languages', 'language', 'compétences linguistiques'
    ],
}


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
                if keyword in line_clean and len(line_clean) < 60:
                    matched_section = section_name
                    break
            if matched_section:
                break

        if matched_section:
            if current_section:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = matched_section
            current_content = []
        elif current_section:
            current_content.append(line)

    if current_section:
        sections[current_section] = "\n".join(current_content).strip()

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
            pattern = rf'{langue}\s*[:\-]?\s*([a-zà-ÿ0-9\s\(\)]{{0,40}})'
            m = re.search(pattern, text_low)
            niveau = ""
            if m:
                niveau_raw = m.group(1).strip()
                for keyword in ['maternelle', 'natif', 'native', 'bilingue', 'courant', 'avancé', 'avance', 'fluent', 'intermédiaire', 'intermediaire', 'débutant', 'debutant', 'c1', 'c2', 'b1', 'b2', 'a1', 'a2']:
                    if keyword in niveau_raw:
                        niveau = f" ({keyword.capitalize()})"
                        break
            found.append(langue_clean + niveau)
    return ", ".join(found)


# ==========================================
# 6. EXPÉRIENCES (PATTERN AMÉLIORÉ)
# ==========================================
def extract_experiences_list(text_section):
    """
    Extrait les expériences en détectant les titres de postes
    (lignes en majuscules ou contenant des mots-clés métier).
    Chaque expérience commence par un titre, suivi de l'entreprise, des dates, des missions.
    """
    if not text_section:
        return []

    experiences = []
    annee_pattern = re.compile(r'\b(19\d{2}|20\d{2})\b')

    # Mots-clés indiquant le début d'une expérience (titres de postes typiques)
    titre_keywords = [
        'ingénieur', 'ingenieur', 'développeur', 'developpeur', 'chef',
        'directeur', 'responsable', 'manager', 'consultant', 'analyste',
        'cadre', 'technicien', 'assistant', 'comptable', 'commercial',
        'administrateur', 'gestionnaire', 'designer', 'architecte',
        'data scientist', 'expert', 'spécialiste', 'specialiste', 'coordinateur',
        'chargé', 'charge', 'opérateur', 'operateur', 'agent', 'stagiaire',
        'hote', 'hôte', 'support', 'employé', 'employe', 'collaborateur'
    ]

    lines = [l.strip() for l in text_section.split("\n") if l.strip()]

    # On identifie les indices des lignes qui sont des titres de postes
    titre_indices = []
    for i, line in enumerate(lines):
        line_low = line.lower()
        # Critères pour considérer une ligne comme titre de poste :
        # - Contient un mot-clé de poste
        # - Est en majuscules (au moins 60% des lettres en MAJUSCULE)
        # - Pas trop long
        # - Pas une simple ligne de date
        if len(line) < 5 or len(line) > 150:
            continue
        if annee_pattern.fullmatch(line.replace(" ", "").replace("-", "").replace("—", "")):
            continue

        is_mostly_upper = sum(1 for c in line if c.isupper()) >= max(2, len([c for c in line if c.isalpha()]) * 0.6)
        contains_keyword = any(k in line_low for k in titre_keywords)

        if is_mostly_upper and contains_keyword:
            titre_indices.append(i)

    # Si aucun titre détecté, on tente l'ancienne méthode (fallback)
    if not titre_indices:
        return _extract_experiences_fallback(lines, annee_pattern)

    # On découpe en blocs basés sur les indices de titres
    for idx, start in enumerate(titre_indices):
        end = titre_indices[idx + 1] if idx + 1 < len(titre_indices) else len(lines)
        block = lines[start:end]

        if not block:
            continue

        block_text = " ".join(block)
        annees_full = re.findall(r'\b(19\d{2}|20\d{2})\b', block_text)
        date_fin_present = bool(re.search(r"aujourd'?hui|présent|present|en cours", block_text, re.IGNORECASE))

        titre = block[0]
        entreprise = ""
        description_lines = []

        # La ligne suivante après le titre est généralement l'entreprise
        # (sauf si elle est une date)
        if len(block) >= 2:
            second_line = block[1]
            if not annee_pattern.fullmatch(second_line.replace(" ", "").replace("-", "").replace("—", "")):
                entreprise = second_line
                description_lines = block[2:]
            else:
                description_lines = block[1:]

        # Filtre les dates des descriptions
        description_clean = []
        for l in description_lines:
            # Ignore les lignes qui sont juste des dates/mois
            if re.match(r'^[\s,.\-/]*(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)?\s*\d{4}\s*[\s,.\-/àa]*(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)?\s*(\d{4}|aujourd\'?hui|présent|present)?\s*$', l, re.IGNORECASE):
                continue
            description_clean.append(l)

        description = " ".join(description_clean)

        date_debut = annees_full[0] if annees_full else ""
        if date_fin_present:
            date_fin = "Aujourd'hui"
        elif len(annees_full) >= 2:
            date_fin = annees_full[-1]
        else:
            date_fin = annees_full[0] if annees_full else ""

        if titre and len(titre) < 200:
            experiences.append({
                "titre_poste": titre[:200],
                "entreprise": entreprise[:200],
                "date_debut_raw": date_debut,
                "date_fin_raw": date_fin,
                "description": description[:500],
            })

    return experiences[:10]


def _extract_experiences_fallback(lines, annee_pattern):
    """Ancienne méthode si la détection par mots-clés échoue."""
    experiences = []
    blocks = []
    current_block = []

    for line in lines:
        if not line.strip():
            if current_block:
                blocks.append(current_block)
                current_block = []
        else:
            current_block.append(line)
    if current_block:
        blocks.append(current_block)

    for block in blocks[:10]:
        block_text = " ".join(block)
        if not annee_pattern.search(block_text):
            continue

        annees_full = re.findall(r'\b(19\d{2}|20\d{2})\b', block_text)
        date_fin_present = bool(re.search(r"aujourd'?hui|présent|present|en cours", block_text, re.IGNORECASE))

        contenu_lines = [l for l in block if not annee_pattern.fullmatch(l.replace(" ", "").replace("-", ""))]

        if not contenu_lines:
            continue

        titre = contenu_lines[0]
        entreprise = contenu_lines[1] if len(contenu_lines) >= 2 else ""
        description = " ".join(contenu_lines[2:]) if len(contenu_lines) > 2 else ""

        date_debut = annees_full[0] if annees_full else ""
        date_fin = "Aujourd'hui" if date_fin_present else (annees_full[-1] if len(annees_full) >= 2 else date_debut)

        if titre and date_debut:
            experiences.append({
                "titre_poste": titre[:200],
                "entreprise": entreprise[:200],
                "date_debut_raw": date_debut,
                "date_fin_raw": date_fin,
                "description": description[:500],
            })

    return experiences[:10]


# ==========================================
# 7. FORMATIONS
# ==========================================
def extract_formations_list(text_section):
    """
    Extrait les formations en détectant les titres de diplômes.
    """
    if not text_section:
        return []

    formations = []
    annee_pattern = re.compile(r'\b(19\d{2}|20\d{2})\b')

    # Mots-clés indiquant le début d'une formation
    diplome_keywords = [
        'diplôme', 'diplome', 'master', 'licence', 'ingénieur', 'ingenieur',
        'doctorat', 'phd', 'magistère', 'magistere', 'baccalauréat', 'baccalaureat',
        'bac', 'ts', 'technicien', 'dut', 'bts', 'certification', 'certificat',
        'formation', 'cursus', 'études', 'etudes'
    ]

    lines = [l.strip() for l in text_section.split("\n") if l.strip()]

    titre_indices = []
    for i, line in enumerate(lines):
        line_low = line.lower()
        if len(line) < 5 or len(line) > 250:
            continue
        if annee_pattern.fullmatch(line.replace(" ", "").replace("-", "").replace("—", "")):
            continue

        is_mostly_upper = sum(1 for c in line if c.isupper()) >= max(2, len([c for c in line if c.isalpha()]) * 0.6)
        contains_keyword = any(k in line_low for k in diplome_keywords)

        if is_mostly_upper and contains_keyword:
            titre_indices.append(i)

    # Fallback si rien trouvé
    if not titre_indices:
        return _extract_formations_fallback(lines, annee_pattern)

    for idx, start in enumerate(titre_indices):
        end = titre_indices[idx + 1] if idx + 1 < len(titre_indices) else len(lines)
        block = lines[start:end]

        if not block:
            continue

        block_text = " ".join(block)
        annees_full = re.findall(r'\b(19\d{2}|20\d{2})\b', block_text)

        diplome = block[0]
        etablissement = ""
        description_lines = []

        if len(block) >= 2:
            second_line = block[1]
            if not annee_pattern.fullmatch(second_line.replace(" ", "").replace("-", "").replace("—", "")):
                etablissement = second_line
                description_lines = block[2:]
            else:
                description_lines = block[1:]

        description_clean = [
            l for l in description_lines
            if not re.match(r'^[\s,.\-/]*\d{4}\s*[\s,.\-/à]*\d{0,4}\s*$', l)
        ]
        description = " ".join(description_clean)

        date_debut = annees_full[0] if annees_full else ""
        date_fin = annees_full[-1] if len(annees_full) >= 2 else date_debut

        if diplome and len(diplome) < 250:
            formations.append({
                "diplome": diplome[:250],
                "etablissement": etablissement[:200],
                "date_debut_raw": date_debut,
                "date_fin_raw": date_fin,
                "description": description[:500],
            })

    return formations[:10]


def _extract_formations_fallback(lines, annee_pattern):
    """Ancienne méthode pour formations si pas de mots-clés détectés."""
    formations = []
    blocks = []
    current_block = []

    for line in lines:
        if not line.strip():
            if current_block:
                blocks.append(current_block)
                current_block = []
        else:
            current_block.append(line)
    if current_block:
        blocks.append(current_block)

    for block in blocks[:10]:
        block_text = " ".join(block)
        if not annee_pattern.search(block_text):
            continue
        annees_full = re.findall(r'\b(19\d{2}|20\d{2})\b', block_text)
        contenu_lines = [l for l in block if not annee_pattern.fullmatch(l.replace(" ", "").replace("-", ""))]
        if not contenu_lines:
            continue

        diplome = contenu_lines[0]
        etablissement = contenu_lines[1] if len(contenu_lines) >= 2 else ""
        date_debut = annees_full[0] if annees_full else ""
        date_fin = annees_full[-1] if len(annees_full) >= 2 else date_debut

        if diplome and date_debut:
            formations.append({
                "diplome": diplome[:250],
                "etablissement": etablissement[:200],
                "date_debut_raw": date_debut,
                "date_fin_raw": date_fin,
                "description": "",
            })

    return formations[:10]

# ==========================================
# 9. PARSING VIA OLLAMA (IA LOCALE)
# ==========================================
# === CONFIGURATION GROQ (IA cloud, gratuit et rapide) ===
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_TIMEOUT = 30  # secondes
_groq_client = None


def get_groq_client():
    """Lazy init du client Groq (chargé à la première utilisation)."""
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            return None
        _groq_client = Groq(api_key=api_key)
    return _groq_client 
PROMPT_EXPERIENCES = """Tu es un expert en analyse de CV. Voici le texte brut d'un CV.

Extrais TOUTES les expériences PROFESSIONNELLES (emplois, stages, missions rémunérées) en JSON strict.

⚠️ RÈGLE CRITIQUE : NE METS JAMAIS DE FORMATIONS, DIPLÔMES OU ÉTUDES DANS LES EXPÉRIENCES.
Les éléments suivants ne sont PAS des expériences (ce sont des formations) :
- "Licence en ...", "Master en ...", "Bac", "3ème année licence"
- "Étudiant en ...", "Étudiante en ..."
- Cours suivis, formations en ligne, certifications
- Universités, écoles, instituts (sauf si la personne y a TRAVAILLÉ)

Les VRAIES expériences sont des EMPLOIS comme :
- Caissier, Hôtesse d'accueil, Vendeur
- Ingénieur, Développeur, Comptable, Assistant
- Stage en entreprise (mais pas formation en école)

RÈGLES JSON :
- Réponds UNIQUEMENT avec un tableau JSON, sans texte avant ou après.
- Pour chaque expérience : titre_poste, entreprise, date_debut_raw, date_fin_raw, description.
- Si une date de fin n'existe pas (poste actuel), mets "Aujourd'hui".
- Garde les dates dans le format brut du CV.
- Si une info manque, mets "" (chaîne vide), pas null.
- Si AUCUNE expérience pro trouvée, renvoie un tableau vide [].

FORMAT EXIGÉ :
[
  {
    "titre_poste": "string",
    "entreprise": "string",
    "date_debut_raw": "string",
    "date_fin_raw": "string",
    "description": "string"
  }
]

CV À ANALYSER :
---
{cv_text}
---

RÉPONDS UNIQUEMENT AVEC LE TABLEAU JSON :
"""

PROMPT_FORMATIONS = """Tu es un expert en analyse de CV. Voici le texte brut d'un CV.

Extrais TOUTES les FORMATIONS et DIPLÔMES (Master, Licence, Bac, certifications, cours suivis) en JSON strict.

⚠️ RÈGLE CRITIQUE : NE METS JAMAIS DES EMPLOIS DANS LES FORMATIONS.
Ne sont PAS des formations :
- Postes occupés (caissier, vendeur, ingénieur, hôtesse, etc.)
- Stages en entreprise (sauf si stage académique avec mention d'école)

Les VRAIES formations sont :
- Diplômes universitaires (Licence, Master, Doctorat)
- Bac, BTS, DUT, certifications professionnelles
- Cours suivis en école ou en ligne
- Formations qualifiantes (ex: "prothésiste ongulaire" dans une école)

RÈGLES JSON :
- Réponds UNIQUEMENT avec un tableau JSON, sans texte avant ou après.
- Pour chaque formation : diplome, etablissement, date_debut_raw, date_fin_raw, description.
- Garde les dates dans le format brut du CV.
- Si une info manque, mets "" (chaîne vide), pas null.

FORMAT EXIGÉ :
[
  {
    "diplome": "string",
    "etablissement": "string",
    "date_debut_raw": "string",
    "date_fin_raw": "string",
    "description": "string"
  }
]

CV À ANALYSER :
---
{cv_text}
---

RÉPONDS UNIQUEMENT AVEC LE TABLEAU JSON :
"""

PROMPT_TITRE = """Tu es un expert en analyse de CV. Voici le texte brut d'un CV.

Trouve le TITRE PROFESSIONNEL du candidat. C'est généralement la phrase courte juste sous son nom (ex: "INGÉNIEUR LOGICIEL", "DIRECTRICE MARKETING", "DÉVELOPPEUR FULLSTACK").

RÈGLES :
- Réponds UNIQUEMENT avec le titre, sans guillemets, sans explication.
- Si tu ne trouves pas, réponds exactement : NON_TROUVE
- Maximum 100 caractères.

CV À ANALYSER :
---
{cv_text}
---

LE TITRE PROFESSIONNEL :
"""
PROMPT_INFOS_PERSO = """Tu es un expert en analyse de CV. Voici le texte brut d'un CV.

Extrais les informations personnelles du candidat en JSON strict.

RÈGLES :
- Réponds UNIQUEMENT avec un objet JSON, sans texte avant ou après.
- Si une info manque, mets null.
- Pour le nom complet : nom + prénom du candidat (ex: "FILALI Zoheir"). NE MET PAS son titre professionnel.
- Pour le téléphone : récupère TOUS les chiffres, format brut.
- Pour les compétences : liste TOUTES les compétences techniques mentionnées (langages, outils, logiciels, soft skills). Sépare par des virgules.
- Pour les langues : format "Langue:Niveau" (ex: "Arabe:Maternelle, Anglais:Avancé"). Si pas de niveau, mets "Intermédiaire".
- NOUVEAU - linkedin : Extrais l'URL complète du profil LinkedIn si elle est présente dans le texte.
- NOUVEAU - github : Extrais l'URL complète du profil GitHub si elle est présente (crucial pour les profils IT).
- NOUVEAU - bio : Rédige un résumé percutant et professionnel du profil en 2 phrases maximum basé sur ses expériences.

FORMAT EXIGÉ :
{
  "nom_complet": "string ou null",
  "telephone": "string ou null",
  "competences": "string (compétences séparées par virgules) ou null",
  "langues": "string (format Langue:Niveau séparé par virgules) ou null",
  "linkedin": "string ou null",
  "github": "string ou null",
  "bio": "string ou null"
}

CV À ANALYSER :
---
{cv_text}
---

RÉPONDS UNIQUEMENT AVEC L'OBJET JSON :
"""

def _call_groq(prompt, max_tokens=3000):
    """
    Appelle Groq avec un timeout.
    Retourne la string de réponse ou None en cas d'erreur.
    """
    client = get_groq_client()
    if client is None:
        print("Groq : clé API manquante, fallback regex")
        return None

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=max_tokens,
            timeout=GROQ_TIMEOUT,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq : erreur - {e}")
        return None


def _extract_json_array(content):
    """Helper : nettoie et extrait un tableau JSON depuis la réponse d'Ollama."""
    if not content:
        return None

    # Nettoie les fences markdown
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    # Cherche le premier [ et le dernier ]
    first = content.find("[")
    last = content.rfind("]")
    if first == -1 or last == -1:
        return None

    json_str = content[first:last + 1]
    try:
        data = json.loads(json_str)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError as e:
        print(f"Ollama : JSON invalide - {e}")
    return None

def _extract_json_object(content):
    """Helper : nettoie et extrait un objet JSON depuis la réponse de Groq."""
    if not content:
        return None

    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    first = content.find("{")
    last = content.rfind("}")
    if first == -1 or last == -1:
        return None

    json_str = content[first:last + 1]
    try:
        data = json.loads(json_str)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError as e:
        print(f"Groq : JSON object invalide - {e}")
    return None

def parse_with_groq(text):
    """
    Appelle Groq 4 fois (titre, expériences, formations, infos perso).
    Retourne un dict complet.
    Retourne None si TOUS les appels échouent.
    """
    text_truncated = text[:8000]

    result = {
        "titre_professionnel": None,
        "experiences": [],
        "formations": [],
        "nom_complet": None,
        "telephone": None,
        "competences": None,
        "langues": None,
        "linkedin": None,  # NOUVEAU
        "github": None,    # NOUVEAU
        "bio": None,       # NOUVEAU
    }

    any_success = False

    # === APPEL 1 : TITRE ===
    print("Groq : extraction du titre...")
    content = _call_groq(
        PROMPT_TITRE.replace("{cv_text}", text_truncated),
        max_tokens=100
    )
    if content:
        titre = content.strip().strip('"').strip("'")
        if titre and titre != "NON_TROUVE" and len(titre) < 150:
            result["titre_professionnel"] = titre
            any_success = True

    # === APPEL 2 : EXPÉRIENCES ===
    print("Groq : extraction des expériences...")
    content = _call_groq(
        PROMPT_EXPERIENCES.replace("{cv_text}", text_truncated),
        max_tokens=3000
    )
    experiences = _extract_json_array(content)
    if experiences:
        experiences_clean = [
            e for e in experiences
            if isinstance(e, dict) and e.get("titre_poste")
        ]
        result["experiences"] = experiences_clean[:15]
        any_success = True

    # === APPEL 3 : FORMATIONS ===
    print("Groq : extraction des formations...")
    content = _call_groq(
        PROMPT_FORMATIONS.replace("{cv_text}", text_truncated),
        max_tokens=2000
    )
    formations = _extract_json_array(content)
    if formations:
        formations_clean = [
            f for f in formations
            if isinstance(f, dict) and f.get("diplome")
        ]
        result["formations"] = formations_clean[:10]
        any_success = True

    # === APPEL 4 : INFOS PERSO (nom, téléphone, compétences, langues, réseaux, bio) ===
    print("Groq : extraction des infos personnelles...")
    content = _call_groq(
        PROMPT_INFOS_PERSO.replace("{cv_text}", text_truncated),
        max_tokens=1500
    )
    infos = _extract_json_object(content)
    if infos:
        if infos.get("nom_complet"):
            result["nom_complet"] = str(infos["nom_complet"]).strip()
        if infos.get("telephone"):
            tel = re.sub(r'[\s.\-]', '', str(infos["telephone"]))
            result["telephone"] = tel
        if infos.get("competences"):
            result["competences"] = str(infos["competences"]).strip()
        if infos.get("langues"):
            result["langues"] = str(infos["langues"]).strip()
        
        # Injection des nouveaux champs extraits par l'IA
        result["linkedin"] = infos.get("linkedin")
        result["github"] = infos.get("github")
        result["bio"] = infos.get("bio")
        any_success = True

    if not any_success:
        return None

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

    sections = find_sections(text)

    # Extraction photo (uniquement PDF)
    photo = None
    if file_name.lower().endswith(".pdf"):
        photo = extract_photo_from_pdf(file_path)

    # === Champs simples via regex ===
    result = {
        "success": True,
        "email": extract_email(text),
        "wilaya": extract_wilaya(text),
        "diplome": extract_diplome_max(text),
        "specialite": extract_specialite(text),
        "service_militaire": extract_service_militaire(text),
        "permis_conduire": extract_permis(text),
        "passeport_valide": extract_passeport(text),
        "vehicule_personnel": extract_vehicule(text),
        "photo": photo,
        "linkedin": None,  # Initialisation par défaut
        "github": None,    # Initialisation par défaut
        "bio": None,       # Initialisation par défaut
    }

    # === Champs complexes via Groq ===
    ai_data = parse_with_groq(text)
    methods_used = []

    # Nom complet
    if ai_data and ai_data.get("nom_complet"):
        result["nom_complet"] = ai_data["nom_complet"]
        methods_used.append("nom:ai")
    else:
        result["nom_complet"] = extract_name(text)
        methods_used.append("nom:regex")

    # Téléphone
    if ai_data and ai_data.get("telephone"):
        result["telephone"] = ai_data["telephone"]
        methods_used.append("tel:ai")
    else:
        result["telephone"] = extract_phone(text)
        methods_used.append("tel:regex")

    # Titre professionnel
    if ai_data and ai_data.get("titre_professionnel"):
        result["titre_professionnel"] = ai_data["titre_professionnel"]
        methods_used.append("titre:ai")
    else:
        result["titre_professionnel"] = extract_titre_professionnel(text)
        methods_used.append("titre:regex")

    # Compétences
    if ai_data and ai_data.get("competences"):
        result["competences"] = ai_data["competences"]
        methods_used.append("comp:ai")
    else:
        result["competences"] = extract_competences(sections.get('competences', ''))
        methods_used.append("comp:regex")

    # Langues
    if ai_data and ai_data.get("langues"):
        result["langues"] = ai_data["langues"]
        methods_used.append("lang:ai")
    else:
        result["langues"] = extract_langues(sections.get('langues', ''))
        methods_used.append("lang:regex")

    # Récupération des nouveaux attributs spécifiques à l'IA
    if ai_data:
        result["linkedin"] = ai_data.get("linkedin")
        result["github"] = ai_data.get("github")
        result["bio"] = ai_data.get("bio")

    # Expériences
    if ai_data and ai_data.get("experiences"):
        result["experiences"] = ai_data["experiences"]
        methods_used.append("exp:ai")
    else:
        result["experiences"] = extract_experiences_list(sections.get('experiences', ''))
        methods_used.append("exp:regex")

    # Formations
    if ai_data and ai_data.get("formations"):
        result["formations"] = ai_data["formations"]
        methods_used.append("form:ai")
    else:
        result["formations"] = extract_formations_list(sections.get('formations', ''))
        methods_used.append("form:regex")

    result["parsing_method"] = " | ".join(methods_used)

    return result