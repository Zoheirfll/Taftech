"""Extraction des expériences professionnelles (formats « Du … au … », dates, repli)."""
import re



# ==========================================
# 6. EXPÉRIENCES (PATTERN AMÉLIORÉ)
# ==========================================
# Format très répandu dans les CV algériens : "Du 01/11/2021 au 04/2024 : Chef de projet chez FIELDCORE"
DATE_HEADER_PATTERN = re.compile(r'^du\s+(.+?)\s+au\s+(.+?)\s*:\s*(.*)$', re.IGNORECASE)


def _parse_titre_entreprise(texte):
    """Sépare 'Chef de projet chez FIELDCORE, GE...' en (titre, entreprise)."""
    for separateur in (r'\bchez\b', r'\bà\b', r'\bau sein de\b'):
        parts = re.split(separateur, texte, maxsplit=1, flags=re.IGNORECASE)
        if len(parts) == 2:
            return parts[0].strip(" :-"), parts[1].strip(" .")
    return texte.strip(" :-"), ""


def _extract_experiences_du_au(lines):
    """Détecte le format 'Du <date> au <date> : Titre chez Entreprise'.
    Le PDF coupe parfois cette ligne en deux (ex: "...: Organisateur de conditionnement"
    puis "chez ACG SIM." sur la ligne suivante) — on recolle les lignes de continuation
    (celles qui ne commencent pas par une puce) avant de considérer que la description commence."""
    indices = [i for i, l in enumerate(lines) if DATE_HEADER_PATTERN.match(l)]
    if not indices:
        return []
    experiences = []
    for idx, start in enumerate(indices):
        end = indices[idx + 1] if idx + 1 < len(indices) else len(lines)
        block = lines[start:end]
        m = DATE_HEADER_PATTERN.match(block[0])
        date_debut_raw, date_fin_raw, reste = m.groups()
        reste = reste.strip()

        # Recolle les lignes suivantes tant qu'elles ne sont pas des puces de description
        i = 1
        while i < len(block) and not block[i].lstrip().startswith(('-', '•', '*')):
            reste = f"{reste} {block[i].strip()}".strip()
            i += 1

        titre, entreprise = _parse_titre_entreprise(reste)

        # Format fréquent : le titre est sur la ligne D'AVANT ("Chef de projet\nDu ... au ... : chez FIELDCORE")
        # plutôt que sur la ligne de date elle-même (qui ne contient alors que "chez Entreprise").
        if not titre and start > 0:
            ligne_precedente = lines[start - 1].strip()
            if (
                ligne_precedente
                and len(ligne_precedente) < 100
                and not DATE_HEADER_PATTERN.match(ligne_precedente)
                and not ligne_precedente.lstrip().startswith(('-', '•', '*'))
            ):
                titre = ligne_precedente
                # Cette ligne avait été ajoutée à tort comme puce finale de l'expérience précédente : on la retire.
                if experiences:
                    bogus = f"- {ligne_precedente}"
                    if experiences[-1]["description"].endswith(bogus):
                        experiences[-1]["description"] = experiences[-1]["description"][: -len(bogus)].rstrip("\n")

        date_fin_present = bool(re.search(r"aujourd'?hui|présent|present|en cours", date_fin_raw, re.IGNORECASE))
        description_lines = block[i:]
        description = "\n".join(
            l if l.lstrip().startswith(('-', '•', '*')) else f"- {l}"
            for l in description_lines
        )
        if titre:
            experiences.append({
                "titre_poste": titre[:200],
                "entreprise": entreprise[:200],
                "date_debut_raw": date_debut_raw.strip(),
                "date_fin_raw": "Aujourd'hui" if date_fin_present else date_fin_raw.strip(),
                "description": description[:3000],
            })
    return experiences[:10]


def extract_experiences_list(text_section):
    """
    Extrait les expériences en détectant les titres de postes
    (lignes en majuscules ou contenant des mots-clés métier).
    Chaque expérience commence par un titre, suivi de l'entreprise, des dates, des missions.
    """
    if not text_section:
        return []

    lines_du_au = [l.strip() for l in text_section.split("\n") if l.strip()]
    experiences_du_au = _extract_experiences_du_au(lines_du_au)
    if experiences_du_au:
        return experiences_du_au

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

        description = "\n".join(
            l if l.lstrip().startswith(('-', '•', '*')) else f"- {l}"
            for l in description_clean
        )

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
                "description": description[:3000],
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
        description = "\n".join(
            l if l.lstrip().startswith(('-', '•', '*')) else f"- {l}"
            for l in contenu_lines[2:]
        ) if len(contenu_lines) > 2 else ""

        date_debut = annees_full[0] if annees_full else ""
        date_fin = "Aujourd'hui" if date_fin_present else (annees_full[-1] if len(annees_full) >= 2 else date_debut)

        if titre and date_debut:
            experiences.append({
                "titre_poste": titre[:200],
                "entreprise": entreprise[:200],
                "date_debut_raw": date_debut,
                "date_fin_raw": date_fin,
                "description": description[:3000],
            })

    return experiences[:10]
