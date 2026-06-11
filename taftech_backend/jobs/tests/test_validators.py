from django.core.exceptions import ValidationError
from django.test import TestCase
from io import BytesIO
from unittest.mock import MagicMock

from jobs.validators import validate_document_mime, validate_image_mime, validate_file_size


def _make_file(content: bytes, name: str = "test", size: int = None) -> MagicMock:
    """Crée un faux fichier uploadé avec les magic bytes fournis."""
    f = MagicMock()
    f.name = name
    f.size = size or len(content)
    buf = BytesIO(content)
    f.seek = buf.seek
    f.read = buf.read
    return f


class DocumentMimeValidatorTests(TestCase):

    def test_vrai_pdf_accepte(self):
        f = _make_file(b'%PDF-1.4 rest of file content')
        validate_document_mime(f)  # Ne doit pas lever d'exception

    def test_vrai_docx_accepte(self):
        f = _make_file(b'PK\x03\x04rest of zip content')
        validate_document_mime(f)

    def test_vrai_doc_accepte(self):
        f = _make_file(b'\xd0\xcf\x11\xe0rest of ole content')
        validate_document_mime(f)

    def test_image_renommee_en_pdf_rejetee(self):
        f = _make_file(b'\xff\xd8\xff\xe0fake jpeg content', name='malware.pdf')
        with self.assertRaises(ValidationError) as ctx:
            validate_document_mime(f)
        self.assertIn("invalide", str(ctx.exception))

    def test_executable_renomme_en_pdf_rejete(self):
        f = _make_file(b'MZ\x90\x00fake exe content', name='cv.pdf')
        with self.assertRaises(ValidationError):
            validate_document_mime(f)

    def test_fichier_vide_rejete(self):
        f = _make_file(b'')
        with self.assertRaises(ValidationError):
            validate_document_mime(f)


class ImageMimeValidatorTests(TestCase):

    def test_vrai_jpeg_accepte(self):
        f = _make_file(b'\xff\xd8\xff\xe0fake jpeg content')
        validate_image_mime(f)

    def test_vrai_png_accepte(self):
        f = _make_file(b'\x89PNG\r\n\x1a\nfake png content')
        validate_image_mime(f)

    def test_pdf_renomme_en_png_rejete(self):
        f = _make_file(b'%PDF-1.4 fake pdf content', name='photo.png')
        with self.assertRaises(ValidationError) as ctx:
            validate_image_mime(f)
        self.assertIn("invalide", str(ctx.exception))

    def test_executable_renomme_en_jpg_rejete(self):
        f = _make_file(b'MZ\x90\x00fake exe content', name='photo.jpg')
        with self.assertRaises(ValidationError):
            validate_image_mime(f)


class FileSizeValidatorTests(TestCase):

    def test_fichier_dans_limite_accepte(self):
        f = _make_file(b'content', size=2 * 1024 * 1024)  # 2 Mo
        validate_file_size(5)(f)  # limite 5 Mo — OK

    def test_fichier_trop_grand_rejete(self):
        f = _make_file(b'content', size=6 * 1024 * 1024)  # 6 Mo
        with self.assertRaises(ValidationError) as ctx:
            validate_file_size(5)(f)
        self.assertIn("5 Mo", str(ctx.exception))

    def test_fichier_exactement_a_la_limite_accepte(self):
        f = _make_file(b'content', size=5 * 1024 * 1024)  # exactement 5 Mo
        validate_file_size(5)(f)
