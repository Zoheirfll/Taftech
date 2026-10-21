"""Extraction du texte brut (PDF/DOCX) et de la photo d'un CV."""
import base64
import re
import pdfplumber
from docx import Document
import fitz  # pymupdf - pour extraire les images du PDF
import logging


logger = logging.getLogger(__name__)


# ==========================================
# 1. EXTRACTION DU TEXTE BRUT
# ==========================================
# Caractères de largeur nulle que certains éditeurs de CV (Canva…) glissent au milieu des mots
# (« Analy‌se », « HÔT‌ESSE ») : pdfplumber/pdfminer les lit comme une vraie espace et renvoie
# « Analy se » (puis le masquage de confidentialité prend « Analy » pour un nom). PyMuPDF les
# restitue tels quels, ce qui permet de les retirer.
_SANS_CARACTERES_INVISIBLES = {ord(c): None for c in ("​", "‌", "‍", "⁠", "﻿")}
# « Novembre2023 » (mois collé à l'année dans le PDF) : l'espace est rétablie pour la lecture des dates.
_MOIS_COLLE_ANNEE = re.compile(
    r"\b(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)"
    r"((?:19|20)\d{2})\b", re.IGNORECASE)


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
        logger.error("Erreur extraction PDF : %s", e)
    return text


def extract_text_from_docx(file_path):
    """Extrait tout le texte d'un fichier Word .docx."""
    text = ""
    try:
        doc = Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        logger.error("Erreur extraction DOCX : %s", e)
    return text
def extract_text_from_pdf_smart(file_path):
    """
    Extraction intelligente : utilise les coordonnées des mots
    pour mieux comprendre la structure des CV en colonnes.
    Reconstruit les lignes en regroupant les mots qui sont sur la même ligne Y.
    """
    text = ""
    try:
        doc = fitz.open(file_path)
        try:
            for page in doc:
                # (x0, y0, x1, y1, mot, ...) : on retire les caractères invisibles du mot, puis on
                # écarte les mots devenus vides. Le regroupement par ligne se fait sur le CENTRE vertical
                # du mot : son bord haut varie avec la police (gras/normal) et éclatait une même ligne.
                words = [
                    {"x0": w[0], "top": (w[1] + w[3]) / 2, "text": w[4].translate(_SANS_CARACTERES_INVISIBLES)}
                    for w in page.get_text("words")
                ]
                words = [w for w in words if w["text"].strip()]
                if not words:
                    continue

                # Regroupe les mots par ligne : un mot rejoint la ligne en cours s'il est à moins de
                # `tolerance` du premier mot de cette ligne (des tranches fixes coupaient parfois une
                # même ligne en deux, ex. « Arabe : … | Anglais : … » mêlant gras et normal).
                tolerance = 3  # tolérance en points pour considérer "même ligne"
                lignes = []  # [(y_du_premier_mot, [mots])]
                for w in sorted(words, key=lambda w: w['top']):
                    if lignes and w['top'] - lignes[-1][0] <= tolerance:
                        lignes[-1][1].append(w)
                    else:
                        lignes.append((w['top'], [w]))

                # Trie chaque ligne par position X (de gauche à droite)
                for _, mots_ligne in lignes:
                    line_text = " ".join(w['text'] for w in sorted(mots_ligne, key=lambda w: w['x0']))
                    text += _MOIS_COLLE_ANNEE.sub(r"\1 \2", line_text) + "\n"
        finally:
            doc.close()
    except Exception as e:
        logger.error("Erreur extraction PDF smart : %s", e)
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
        logger.error("Erreur extraction image : %s", e)
        return None


def extract_photo_from_docx(file_path):
    """
    Extrait la plus grande image embarquée dans le fichier Word (probablement la photo de profil).
    Retourne une string base64 prête à envoyer au frontend.
    """
    try:
        doc = Document(file_path)
        biggest_image = None
        biggest_size = 0
        for rel in doc.part.rels.values():
            if rel.is_external or "image" not in rel.reltype:
                continue
            image_part = rel.target_part
            image_bytes = image_part.blob
            if len(image_bytes) > biggest_size and len(image_bytes) > 5000:
                ext = image_part.content_type.split("/")[-1]
                if ext == "jpg":
                    ext = "jpeg"
                biggest_size = len(image_bytes)
                biggest_image = {
                    "data": base64.b64encode(image_bytes).decode('utf-8'),
                    "ext": ext,
                }
        return biggest_image
    except Exception as e:
        logger.error("Erreur extraction image DOCX : %s", e)
        return None
