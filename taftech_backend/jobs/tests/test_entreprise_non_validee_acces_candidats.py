"""Sécurité : une entreprise NON validée par TafTech n'accède jamais aux données personnelles
des candidats (CV, coordonnées, candidatures), même avec un abonnement actif ou une
candidature déjà reçue. Le contrôle est fait côté serveur, sur chaque point d'accès."""
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from jobs.models import AccesCandidatDebloque, Candidature, OffreEmploi, ProfilCandidat
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"


class EntrepriseNonValideeTests(APITestCase):
    def setUp(self):
        # Abonnement Business actif MAIS entreprise non validée : le cas à bloquer.
        self.user, self.entreprise = make_entreprise("nv_business", palier_nom="BUSINESS")
        self.entreprise.est_approuvee = False
        self.entreprise.save(update_fields=["est_approuvee"])

        self.candidat = User.objects.create_user(
            username="nv_candidat", email="nv_candidat@test.dz", password="pwd", role="CANDIDAT",
        )
        self.profil = ProfilCandidat.objects.create(
            user=self.candidat, cv_pdf=SimpleUploadedFile("cv.pdf", MINIMAL_PDF, content_type="application/pdf"),
        )
        self.offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Poste", wilaya="16 - Alger", diplome="LICENCE",
            experience_requise="DEBUTANT", type_contrat="CDI", description="Desc",
            statut_moderation="APPROUVEE", est_active=True, est_cloturee=False,
        )
        self.candidature = Candidature.objects.create(
            offre=self.offre, candidat=self.candidat, score_matching=95, statut="RECUE",
        )
        self.client.force_authenticate(user=self.user)

    def _refuse(self, reponse):
        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(reponse.data.get("code"), "ENTREPRISE_NON_VALIDEE")

    def _url_cv(self):
        return f"/api/jobs/media-prive/candidat/{self.candidat.id}/cv/"

    def test_cvtheque_refusee(self):
        self._refuse(self.client.get("/api/jobs/employeur/cvtheque/"))

    def test_deblocage_refuse_meme_avec_abonnement_actif(self):
        reponse = self.client.post(f"/api/jobs/cvtheque/candidats/{self.candidat.id}/debloquer/")
        self._refuse(reponse)
        self.assertFalse(AccesCandidatDebloque.objects.exists())

    def test_telechargement_cv_refuse_meme_avec_candidature_recue(self):
        self.assertEqual(self.client.get(self._url_cv()).status_code, 403)

    def test_telechargement_cv_refuse_meme_apres_deblocage(self):
        AccesCandidatDebloque.objects.create(entreprise=self.entreprise, candidat=self.candidat, source="ACHETE")
        self.assertEqual(self.client.get(self._url_cv()).status_code, 403)

    def test_documents_partages_refuses(self):
        self._refuse(self.client.get(f"/api/jobs/cvtheque/candidats/{self.candidat.id}/documents-partages/"))
        self._refuse(self.client.get(f"/api/jobs/cvtheque/candidats/{self.candidat.id}/documents-partages/1/fichier/"))

    def test_favoris_invitation_recommandes_exports_spontanees_refuses(self):
        self._refuse(self.client.post(f"/api/jobs/cvtheque/favoris/{self.candidat.id}/"))
        self._refuse(self.client.post("/api/jobs/cvtheque/inviter/", {"candidat_id": self.candidat.id, "offre_id": self.offre.id}))
        self._refuse(self.client.get("/api/jobs/dashboard/candidats-recommandes/"))
        self._refuse(self.client.get("/api/jobs/dashboard/export-excel/"))
        self._refuse(self.client.get(f"/api/jobs/dashboard/offres/{self.offre.id}/export-excel/"))
        self._refuse(self.client.get("/api/jobs/dashboard/candidatures-spontanees/"))

    def test_dashboard_accessible_mais_sans_donnees_candidats(self):
        reponse = self.client.get("/api/jobs/dashboard/")
        self.assertEqual(reponse.status_code, 200)
        for offre in reponse.data["offres"]:
            self.assertEqual(offre["candidatures"], [])

    def test_entreprise_validee_garde_ses_acces(self):
        self.entreprise.est_approuvee = True
        self.entreprise.save(update_fields=["est_approuvee"])
        self.assertEqual(self.client.get("/api/jobs/dashboard/candidats-recommandes/").status_code, 200)
        self.assertEqual(self.client.get(self._url_cv()).status_code, 200)
        reponse = self.client.get("/api/jobs/dashboard/")
        self.assertEqual(len(reponse.data["offres"][0]["candidatures"]), 1)
