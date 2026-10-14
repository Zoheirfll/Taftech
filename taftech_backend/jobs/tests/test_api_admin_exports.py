from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, OffreEmploi, Candidature

User = get_user_model()

class AdminAndExportsTests(APITestCase):
    def setUp(self):
        # CORRECTION : Ajout des adresses emails uniques pour éviter l'IntegrityError
        self.admin = User.objects.create_user(
            username="admin_boss", email="admin@test.com", role="ADMIN", is_staff=True, is_superuser=True
        )
        self.rh = User.objects.create_user(
            username="rh_user", email="rh@test.com", role="RECRUTEUR"
        )
        
        self.ent = ProfilEntreprise.objects.create(user=self.rh, nom_entreprise="TestPDF", est_approuvee=True)
        self.offre = OffreEmploi.objects.create(entreprise=self.ent, titre="Ingénieur")
        
        self.cand = User.objects.create_user(
            username="candidat", email="cand@test.com", role="CANDIDAT"
        )
        self.candidature = Candidature.objects.create(offre=self.offre, candidat=self.cand, statut='RETENU')

    def test_export_csv_admin_uniquement(self):
        """ US-ADM-02: Seul l'admin peut télécharger les CSV """
        url = reverse('export-candidatures')
        
        # 1. Test avec un simple recruteur (Edge Case)
        self.client.force_authenticate(user=self.rh)
        response_fail = self.client.get(url)
        self.assertEqual(response_fail.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Test avec l'Admin (Happy Path)
        self.client.force_authenticate(user=self.admin)
        response_success = self.client.get(url)
        self.assertEqual(response_success.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response_success['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )

    def test_exports_admin_xlsx_neutralisent_les_formules(self):
        """ Un texte saisi par un utilisateur (« =HYPERLINK(...) ») ne doit jamais devenir une formule Excel """
        from io import BytesIO
        from openpyxl import load_workbook
        piege = '=HYPERLINK("http://evil.test","clic")'
        self.cand.last_name = piege
        self.cand.save()
        self.client.force_authenticate(user=self.admin)

        for nom_route in ('export-candidatures', 'export-entreprises', 'export-offres', 'export-utilisateurs'):
            with self.subTest(route=nom_route):
                response = self.client.get(reverse(nom_route))
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                ws = load_workbook(BytesIO(response.content)).active
                cellules = [c for row in ws.iter_rows() for c in row]
                self.assertTrue(all(c.data_type != 'f' for c in cellules), "formule Excel détectée")
                if nom_route == 'export-utilisateurs':
                    self.assertIn(piege, [c.value for c in cellules])

    def test_generation_bulletin_pdf_success(self):
        """ US-PDF-01: Le recruteur télécharge le PDF du candidat retenu """
        self.client.force_authenticate(user=self.rh)
        url = reverse('generer-bulletin', kwargs={'candidature_id': self.candidature.id})
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment', response['Content-Disposition'])

    def test_admin_broadcast_email(self):
        """ US-ADM-03: Envoi massif de newsletter """
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-broadcast')
        
        data = {
            "sujet": "Nouvelle fonctionnalité !",
            "message": "Découvrez notre nouveau site.",
            "type_envoi": "NEWSLETTER"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)