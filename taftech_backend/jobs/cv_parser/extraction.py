"""Extraction du texte brut (PDF/DOCX) et de la photo d'un CV."""
import base64
import pdfplumber
from docx import Document
import fitz  # pymupdf - pour extraire les images du PDF
import logging


logger = logging.getLogger(__name__)


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
