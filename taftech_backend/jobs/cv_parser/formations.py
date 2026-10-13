"""Extraction des formations et diplômes (formats « Mois AAAA : … », repli)."""
import re



# ==========================================
# 7. FORMATIONS
# ==========================================
_MOIS_RE = r'(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)'
DATE_FORMATION_HEADER = re.compile(rf'^(?:{_MOIS_RE}\s+)?(\d{{4}})\s*:\s*(.*)$', re.IGNORECASE)


def _parse_diplome_etablissement(texte):
    """Sépare 'MBA ... à l'I.N.S.I.M d'Oran' ou 'Ingéniorat ... Université de Blida' en (diplome, etablissement)."""
    parts = re.split(r'(\bà\b|\bau sein de\b)', texte, maxsplit=1, flags=re.IGNORECASE)
    if len(parts) == 3:
        return parts[0].strip(" :-"), parts[2].strip(" .")
    m = re.search(r'\b(Université|Universite|Institut|École|Ecole|Lycée|Lycee|Centre)\b', texte, re.IGNORECASE)
    if m:
        return texte[:m.start()].strip(" :-"), texte[m.start():].strip(" .")
    return texte.strip(" :-"), ""


def _extract_formations_mois_annee(lines):
    """Détecte le format 'Février 2023 : Diplôme à Établissement' (avec ou sans mois avant l'année)."""
    indices = [i for i, l in enumerate(lines) if DATE_FORMATION_HEADER.match(l)]
    if not indices:
        return []
    formations = []
    for idx, start in enumerate(indices):
        end = indices[idx + 1] if idx + 1 < len(indices) else len(lines)
        block = lines[start:end]
        m = DATE_FORMATION_HEADER.match(block[0])
        annee, reste = m.groups()
        reste = reste.strip()

        i = 1
        while i < len(block) and not block[i].lstrip().startswith(('-', '•', '*')):
            reste = f"{reste} {block[i].strip()}".strip()
            i += 1

        diplome, etablissement = _parse_diplome_etablissement(reste)
        description_lines = block[i:]
        description = "\n".join(
            l if l.lstrip().startswith(('-', '•', '*')) else f"- {l}"
            for l in description_lines
        )
        if diplome:
            formations.append({
                "diplome": diplome[:200],
                "etablissement": etablissement[:200],
                "date_debut_raw": annee,
                "date_fin_raw": annee,
                "description": description[:3000],
            })
    return formations[:10]


def extract_formations_list(text_section):
    """
    Extrait les formations en détectant les titres de diplômes.
    """
    if not text_section:
        return []

    lines_mois_annee = [l.strip() for l in text_section.split("\n") if l.strip()]
    formations_mois_annee = _extract_formations_mois_annee(lines_mois_annee)
    if formations_mois_annee:
        return formations_mois_annee

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
        contains_keyword = any(re.search(r'\b' + re.escape(k) + r'\b', line_low) for k in diplome_keywords)

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
        description = "\n".join(
            l if l.lstrip().startswith(('-', '•', '*')) else f"- {l}"
            for l in description_clean
        )

        date_debut = annees_full[0] if annees_full else ""
        date_fin = annees_full[-1] if len(annees_full) >= 2 else date_debut

        if diplome and len(diplome) < 250:
            formations.append({
                "diplome": diplome[:250],
                "etablissement": etablissement[:200],
                "date_debut_raw": date_debut,
                "date_fin_raw": date_fin,
                "description": description[:3000],
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
