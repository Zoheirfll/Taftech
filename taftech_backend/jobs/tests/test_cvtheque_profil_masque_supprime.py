"""Point 12 (CVthèque / confidentialité) : un déblocage n'est pas un accès « à vie ». Le candidat
peut masquer son profil (accès suspendu, rendu au retour) ou supprimer son compte (accès terminé).
Le CV de recrutement et les documents privés restent deux choses distinctes."""
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from jobs.models import (
    AccesCandidatDebloque, Candidature, DocumentCandidat, OffreEmploi, PartageDocument, ProfilCandidat, TypeDocument,
)
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()
PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"


class DeblocageNonPermanentTests(APITestCase):
    def setUp(self):
        self.user, self.entreprise = make_entreprise("deb_perm", palier_nom="BUSINESS")
        self.candidat = User.objects.create_user(
            username="deb_cand", email="deb_cand@test.dz", password="pwd", role="CANDIDAT")
        self.profil = ProfilCandidat.objects.create(
            user=self.candidat, titre_professionnel="Comptable",
            cv_pdf=SimpleUploadedFile("cv.pdf", PDF, content_type="application/pdf"))
        AccesCandidatDebloque.objects.create(entreprise=self.entreprise, candidat=self.candidat, source="ACHETE")
        # Un document PRIVÉ (diplôme) du candidat — jamais partagé au départ.
        self.type_doc, _ = TypeDocument.objects.get_or_create(label="Diplôme")
        self.document = DocumentCandidat.objects.create(
            profil=self.profil, type_document=self.type_doc, nom_personnalise="Mon diplôme",
            fichier=SimpleUploadedFile("diplome.pdf", PDF, content_type="application/pdf"))
        self.client.force_authenticate(user=self.user)

    def _ids_cvtheque(self):
        r = self.client.get("/api/jobs/employeur/cvtheque/")
        self.assertEqual(r.status_code, 200, r.data)
        data = r.data["results"] if isinstance(r.data, dict) and "results" in r.data else r.data
        return {c["user_id"] for c in data}

    def _cv(self):
        return self.client.get(f"/api/jobs/media-prive/candidat/{self.candidat.id}/cv/").status_code

    def _partages(self):
        return self.client.get(f"/api/jobs/cvtheque/candidats/{self.candidat.id}/documents-partages/")

    def _fichier_partage(self):
        return self.client.get(
            f"/api/jobs/cvtheque/candidats/{self.candidat.id}/documents-partages/{self.document.id}/fichier/").status_code

    def _masquer(self, visible):
        ProfilCandidat.objects.filter(pk=self.profil.pk).update(visible_cvtheque=visible)

    # --- profil visible : fonctionnement normal ---------------------------------------------
    def test_profil_visible_et_debloque_est_accessible(self):
        self.assertIn(self.candidat.id, self._ids_cvtheque())
        self.assertEqual(self._cv(), 200)

    # --- CV de recrutement vs documents privés -----------------------------------------------
    def test_documents_prives_jamais_visibles_automatiquement_meme_apres_deblocage(self):
        self.assertEqual(self._cv(), 200)  # le CV de recrutement est accessible après déblocage
        self.assertEqual(self._partages().data, [])  # mais aucun document privé n'est exposé
        self.assertEqual(self._fichier_partage(), 403)

    def test_un_document_partage_est_visible_puis_masque_avec_le_profil(self):
        PartageDocument.objects.create(document=self.document, entreprise=self.entreprise)
        self.assertEqual([d["id"] for d in self._partages().data], [self.document.id])
        self.assertEqual(self._fichier_partage(), 200)
        self._masquer(False)
        self.assertEqual(self._partages().data, [])
        self.assertEqual(self._fichier_partage(), 403)

    # --- profil masqué : accès suspendu puis rendu --------------------------------------------
    def test_profil_masque_disparait_de_la_cvtheque_et_l_acces_debloque_est_suspendu(self):
        self._masquer(False)
        self.assertNotIn(self.candidat.id, self._ids_cvtheque())
        self.assertEqual(self._cv(), 403)

    def test_reactiver_la_visibilite_rend_l_acces_sans_nouvelle_depense(self):
        self._masquer(False)
        self.assertEqual(self._cv(), 403)
        self._masquer(True)
        self.assertEqual(self._cv(), 200)
        self.assertIn(self.candidat.id, self._ids_cvtheque())
        self.assertEqual(AccesCandidatDebloque.objects.filter(entreprise=self.entreprise, candidat=self.candidat).count(), 1)

    def test_une_candidature_envoyee_reste_une_relation_meme_si_le_profil_est_masque(self):
        offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Poste", wilaya="16 - Alger", diplome="LICENCE",
            experience_requise="DEBUTANT", type_contrat="CDI", description="Desc",
            statut_moderation="APPROUVEE", est_active=True, est_cloturee=False)
        Candidature.objects.create(offre=offre, candidat=self.candidat, score_matching=50, statut="RECUE")
        AccesCandidatDebloque.objects.all().delete()  # accès uniquement par la candidature
        self._masquer(False)
        self.assertEqual(self._cv(), 200)

    def test_deblocage_d_un_profil_masque_refuse_sans_consommer_de_credit(self):
        AccesCandidatDebloque.objects.all().delete()
        self._masquer(False)
        r = self.client.post(f"/api/jobs/cvtheque/candidats/{self.candidat.id}/debloquer/")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data["code"], "PROFIL_NON_VISIBLE")
        self.assertFalse(AccesCandidatDebloque.objects.exists())

    # --- compte supprimé -------------------------------------------------------------------
    def test_compte_supprime_met_fin_a_tout_acces_recruteur(self):
        PartageDocument.objects.create(document=self.document, entreprise=self.entreprise)
        User.objects.filter(pk=self.candidat.pk).update(is_active=False)  # soft-delete du compte
        self.assertNotIn(self.candidat.id, self._ids_cvtheque())
        self.assertEqual(self._cv(), 403)
        self.assertEqual(self._partages().data, [])
        self.assertEqual(self._fichier_partage(), 403)

    def test_compte_supprime_coupe_meme_l_acces_par_candidature(self):
        offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Poste", wilaya="16 - Alger", diplome="LICENCE",
            experience_requise="DEBUTANT", type_contrat="CDI", description="Desc",
            statut_moderation="APPROUVEE", est_active=True, est_cloturee=False)
        Candidature.objects.create(offre=offre, candidat=self.candidat, score_matching=50, statut="RECUE")
        User.objects.filter(pk=self.candidat.pk).update(is_active=False)
        self.assertEqual(self._cv(), 403)

    def test_deblocage_d_un_compte_supprime_est_introuvable(self):
        AccesCandidatDebloque.objects.all().delete()
        User.objects.filter(pk=self.candidat.pk).update(is_active=False)
        r = self.client.post(f"/api/jobs/cvtheque/candidats/{self.candidat.id}/debloquer/")
        self.assertEqual(r.status_code, 404)
