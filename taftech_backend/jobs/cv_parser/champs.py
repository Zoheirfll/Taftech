"""Extracteurs simples par regex : email, téléphone, nom, titre, wilaya, diplôme, permis, etc."""
import re
from ..constants import WILAYAS_MAPPING
from ..constants import DIPLOMES_MAPPING



# ==========================================
# 3. CHAMPS SIMPLES (REGEX)
# ==========================================
def extract_email(text):
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    match = re.search(pattern, text)
    return match.group(0).lower() if match else None


def extract_phone(text):
    """
    Cherche un numéro algérien peu importe le regroupement de chiffres utilisé
    dans le CV (2-2-2-2-2, 3-3-3, espaces/points/tirets/parenthèses...).
    On capture une plage large de chiffres/séparateurs puis on valide la longueur
    une fois les séparateurs retirés, plutôt que d'imposer un regroupement fixe.
    """
    pattern = r'(?:\(?\+213\)?|00213|0)[\s.\-]?[567][\d\s.\-]{6,14}'
    for match in re.finditer(pattern, text):
        digits = re.sub(r'\D', '', match.group(0))
        if digits.startswith('00213'):
            digits = '0' + digits[5:]
        elif digits.startswith('213') and len(digits) >= 12:
            digits = '0' + digits[3:]
        if len(digits) == 10 and digits[0] == '0':
            return digits
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
            if re.search(r'\b' + re.escape(kw) + r'\b', text_low):
                return code
    return None


def extract_service_militaire(text):
    """Détecte le statut militaire."""
    text_low = text.lower()
    mapping = {
        'dégagé': 'DEGAGE', 'degage': 'DEGAGE', 'exempted': 'DEGAGE', 'discharged': 'DEGAGE', 'معفى': 'DEGAGE',
        'sursitaire': 'SURSITAIRE', 'sursis': 'SURSITAIRE', 'deferred': 'SURSITAIRE', 'مؤجل': 'SURSITAIRE',
        'inapte': 'INAPTE', 'unfit': 'INAPTE', 'غير لائق': 'INAPTE',
        'incorporé': 'INCORPORE', 'incorpore': 'INCORPORE', 'active duty': 'INCORPORE', 'ملتحق': 'INCORPORE',
        'non concerné': 'NON_CONCERNE', 'non concerne': 'NON_CONCERNE', 'not applicable': 'NON_CONCERNE', 'غير معني': 'NON_CONCERNE',
    }
    for keyword, code in mapping.items():
        if re.search(r'\b' + re.escape(keyword) + r'\b', text_low):
            return code
    return None


def extract_permis(text):
    """Détecte la présence d'un permis de conduire."""
    text_low = text.lower()
    keywords = ['permis de conduire', 'permis b', 'permis a', 'driving license', 'driver license', "driver's license", 'رخصة سياقة', 'رخصة قيادة']
    return any(re.search(r'\b' + re.escape(k) + r'\b', text_low) for k in keywords)


def extract_passeport(text):
    """Détecte la présence d'un passeport."""
    text_low = text.lower()
    keywords = ['passeport', 'passport', 'جواز سفر']
    return any(re.search(r'\b' + re.escape(k) + r'\b', text_low) for k in keywords)


def extract_vehicule(text):
    """Détecte si le candidat est véhiculé."""
    text_low = text.lower()
    keywords = ['véhicule personnel', 'vehicule personnel', 'véhiculé', 'vehicule', 'voiture personnelle', 'own vehicle', 'own car', 'personal vehicle', 'car owner', 'سيارة شخصية']
    return any(re.search(r'\b' + re.escape(k) + r'\b', text_low) for k in keywords)
