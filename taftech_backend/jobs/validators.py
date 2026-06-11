from django.core.exceptions import ValidationError

# Magic bytes des formats autorisés
MIME_SIGNATURES = {
    # PDF
    b'%PDF': 'application/pdf',
    # DOCX / DOC (ZIP-based Office)
    b'PK\x03\x04': 'application/vnd.openxmlformats-officedocument',
    # DOC (legacy OLE)
    b'\xd0\xcf\x11\xe0': 'application/msword',
    # JPEG
    b'\xff\xd8\xff': 'image/jpeg',
    # PNG
    b'\x89PNG': 'image/png',
    # WEBP (starts with RIFF....WEBP)
    b'RIFF': 'image/webp',
}

ALLOWED_MIME_FOR_DOCUMENT = {'application/pdf', 'application/vnd.openxmlformats-officedocument', 'application/msword'}
ALLOWED_MIME_FOR_IMAGE = {'image/jpeg', 'image/png', 'image/webp'}


def _detect_mime(file_obj) -> str:
    """Lit les premiers octets du fichier pour détecter le vrai type MIME."""
    file_obj.seek(0)
    header = file_obj.read(8)
    file_obj.seek(0)

    for signature, mime in MIME_SIGNATURES.items():
        if header.startswith(signature):
            return mime

    # Cas WEBP : RIFF????WEBP
    if header[:4] == b'RIFF' and header[8:12] == b'WEBP':
        return 'image/webp'

    return 'application/octet-stream'


def validate_document_mime(file_obj):
    """Valide que le fichier est bien un PDF, DOC ou DOCX (magic bytes)."""
    mime = _detect_mime(file_obj)
    if mime not in ALLOWED_MIME_FOR_DOCUMENT:
        raise ValidationError(
            "Format de fichier invalide. Seuls les fichiers PDF, DOC et DOCX sont acceptés."
        )


def validate_image_mime(file_obj):
    """Valide que le fichier est bien une image JPEG, PNG ou WEBP (magic bytes)."""
    mime = _detect_mime(file_obj)
    if mime not in ALLOWED_MIME_FOR_IMAGE:
        raise ValidationError(
            "Format d'image invalide. Seuls les fichiers JPG, PNG et WEBP sont acceptés."
        )


def validate_file_size(max_mb: int):
    """Factory — retourne un validator qui limite la taille du fichier."""
    def validator(file_obj):
        if file_obj.size > max_mb * 1024 * 1024:
            raise ValidationError(
                f"La taille du fichier dépasse la limite autorisée ({max_mb} Mo)."
            )
    return validator
