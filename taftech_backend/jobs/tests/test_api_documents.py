"""Tests pour l'espace 'Mes documents' (DocumentCandidat/TypeDocument/PartageDocument) —
session 03/09/2026. Couvre le bug réel trouvé en testant en direct : le DELETE
jobs/mes-documents/ envoie un corps JSON (axios `data: {id}`) mais la vue n'acceptait que
multipart/form-data, DRF renvoyait 415 avant même d'atteindre delete()."""
from io import BytesIO
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import TypeDocument, DocumentCandidat, ProfilCandidat

User = get_user_model()

PDF_BYTES = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"


def make_candidat(email="doc_cand@test.dz"):
    user = User.objects.create_user(username=email, email=email, password="pwd", role="CANDIDAT")
    ProfilCandidat.objects.get_or_create(user=user)
    return user


class DocumentCandidatAPITest(APITestCase):
    def setUp(self):
        self.candidat = make_candidat()
        self.type_doc = TypeDocument.objects.filter(actif=True).first() or TypeDocument.objects.create(label="Diplôme")
        self.client.force_authenticate(user=self.candidat)

    def _upload(self):
        fichier = BytesIO(PDF_BYTES)
        fichier.name = "diplome.pdf"
        response = self.client.post(
            "/api/jobs/mes-documents/",
            {"fichier": fichier, "type_document": self.type_doc.id, "nom_personnalise": "Mon diplôme"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data["id"]

    def test_upload_puis_liste(self):
        doc_id = self._upload()
        response = self.client.get("/api/jobs/mes-documents/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], doc_id)
        self.assertEqual(response.data[0]["partages"], [])

    def test_delete_avec_corps_json_fonctionne(self):
        """Régression : DELETE avec Content-Type application/json (comportement réel du
        frontend, `api.delete(url, {data: {id}})`) ne doit plus renvoyer 415."""
        doc_id = self._upload()
        response = self.client.delete("/api/jobs/mes-documents/", {"id": doc_id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertFalse(DocumentCandidat.objects.filter(id=doc_id).exists())

    def test_delete_document_dun_autre_candidat_refuse(self):
        doc_id = self._upload()
        autre = make_candidat(email="autre_cand@test.dz")
        self.client.force_authenticate(user=autre)
        response = self.client.delete("/api/jobs/mes-documents/", {"id": doc_id}, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertTrue(DocumentCandidat.objects.filter(id=doc_id).exists())
