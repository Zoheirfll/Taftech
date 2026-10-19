"""NIN obligatoire pour postuler avec un compte (exigence ANEM, 19/10/2026).

Le NIN n'est pas demandé à l'inscription ; il est saisi une seule fois, à la première candidature,
puis il reste visible du candidat et de l'admin seulement : jamais dans le profil_snapshot, la vue
recruteur, la CVthèque ni un prompt IA. Tests par vrai cookie JWT (règle du projet)."""
import json

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.confidentialite_ia.construction import texte_carriere, texte_conseils
from jobs.models import Candidature, OffreEmploi, ProfilCandidat
from jobs.serializers import ProfilCandidatDTO
from jobs.serializers.candidatures import CandidatureRecruteurDTO
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()
NIN = "109876543210987654"
AUTRE_NIN = "209876543210987654"


class NINPostulerTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.recruteur, self.entreprise = make_entreprise("nin_rec", palier_nom="BUSINESS")
        self.offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre NIN", wilaya="16 - Alger",
            description="d", statut_moderation="APPROUVEE",
        )
        self.candidat = User.objects.create_user(
            username="nin_cand", email="nin_cand@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        self.profil = ProfilCandidat.objects.create(user=self.candidat, titre_professionnel="Développeur")
        self.url_postuler = reverse("postuler-offre", args=[self.offre.id])
        self.url_nin = reverse("profil-nin")

    def _connecter(self, user):
        """Cookie JWT réel : traverse CustomJWTAuthentication comme en production."""
        nom_cookie = settings.SIMPLE_JWT.get("AUTH_COOKIE", "accessToken")
        self.client.cookies[nom_cookie] = str(RefreshToken.for_user(user).access_token)

    # ----- Garde de la candidature -----
    def test_postuler_sans_nin_refuse_et_aucune_candidature_creee(self):
        self._connecter(self.candidat)
        reponse = self.client.post(self.url_postuler, {})
        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(reponse.data["code"], "NIN_REQUIS")
        self.assertFalse(Candidature.objects.filter(offre=self.offre).exists())

    def test_enregistrer_le_nin_puis_postuler(self):
        self._connecter(self.candidat)
        self.assertEqual(self.client.post(self.url_nin, {"nin": NIN}).status_code, 200)
        reponse = self.client.post(self.url_postuler, {})
        self.assertIn(reponse.status_code, (200, 201))
        self.assertTrue(Candidature.objects.filter(offre=self.offre, candidat=self.candidat).exists())

    def test_candidature_rapide_sans_compte_reste_possible_sans_nin(self):
        """Décision du 19/10/2026 : la candidature rapide n'exige pas le NIN (contournement consigné)."""
        cv = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        reponse = self.client.post(
            reverse("postuler-rapide", args=[self.offre.id]),
            {"nom_rapide": "Durand", "prenom_rapide": "Paul", "email_rapide": "paul@test.dz",
             "telephone_rapide": "0555123456", "cv_rapide": cv},
            format="multipart",
        )
        self.assertEqual(reponse.status_code, 201)

    # ----- Route d'enregistrement -----
    def test_enregistrement_sans_cookie_refuse(self):
        self.assertIn(self.client.post(self.url_nin, {"nin": NIN}).status_code, (401, 403))

    def test_recruteur_ne_peut_pas_enregistrer_de_nin(self):
        self._connecter(self.recruteur)
        self.assertEqual(self.client.post(self.url_nin, {"nin": NIN}).status_code, 403)

    def test_format_invalide_refuse(self):
        self._connecter(self.candidat)
        for invalide in ("12345678901234567", "1234567890123456789", "10987654321098765A", "", "  "):
            with self.subTest(nin=invalide):
                reponse = self.client.post(self.url_nin, {"nin": invalide})
                self.assertEqual(reponse.status_code, 400)
        self.candidat.refresh_from_db()
        self.assertIsNone(self.candidat.nin)

    def test_ecriture_unique_le_second_enregistrement_est_refuse(self):
        self._connecter(self.candidat)
        self.client.post(self.url_nin, {"nin": NIN})
        reponse = self.client.post(self.url_nin, {"nin": AUTRE_NIN})
        self.assertEqual(reponse.status_code, 409)
        self.assertEqual(reponse.data["code"], "NIN_DEJA_ENREGISTRE")
        self.candidat.refresh_from_db()
        self.assertEqual(self.candidat.nin, NIN)

    def test_nin_d_un_autre_compte_message_generique(self):
        User.objects.create_user(
            username="autre_cand", email="autre@test.dz", password="pwd", role="CANDIDAT", nin=NIN,
        )
        self._connecter(self.candidat)
        reponse = self.client.post(self.url_nin, {"nin": NIN})
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.data["code"], "NIN_NON_ENREGISTRABLE")
        # Rien dans la réponse ne révèle qu'il appartient à un autre compte.
        corps = reponse.content.decode()
        self.assertNotIn("déjà", corps)
        self.assertNotIn("autre", corps.lower())
        self.candidat.refresh_from_db()
        self.assertIsNone(self.candidat.nin)

    def test_la_reponse_ne_renvoie_jamais_le_nin(self):
        self._connecter(self.candidat)
        reponse = self.client.post(self.url_nin, {"nin": NIN})
        self.assertNotIn(NIN, reponse.content.decode())

    # ----- Le NIN reste confidentiel -----
    def test_snapshot_de_candidature_sans_nin(self):
        self.candidat.nin = NIN
        self.candidat.save(update_fields=["nin"])
        self._connecter(self.candidat)
        self.client.post(self.url_postuler, {})
        candidature = Candidature.objects.get(offre=self.offre, candidat=self.candidat)
        self.assertNotIn("nin", candidature.profil_snapshot)
        self.assertNotIn(NIN, json.dumps(candidature.profil_snapshot))

    def test_vue_recruteur_et_cvtheque_sans_nin(self):
        self.candidat.nin = NIN
        self.candidat.save(update_fields=["nin"])
        candidature = Candidature.objects.create(offre=self.offre, candidat=self.candidat, score_matching=50)
        self.assertNotIn(NIN, json.dumps(CandidatureRecruteurDTO(candidature).data, default=str))
        # Sans le drapeau réservé au candidat qui consulte son propre profil, le NIN n'est pas exposé.
        self.assertIsNone(ProfilCandidatDTO(self.profil, context={"is_premium": True}).data["nin"])

    def test_aucun_texte_envoye_a_l_ia_ne_contient_le_nin(self):
        self.candidat.nin = NIN
        self.candidat.save(update_fields=["nin"])
        self.assertNotIn(NIN, texte_carriere(self.profil))
        self.assertNotIn(NIN, texte_conseils(self.candidat, self.profil))
