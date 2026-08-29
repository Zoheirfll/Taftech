from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, ProfilCandidat, AccesCandidatDebloque, MembreEquipe

User = get_user_model()


def make_entreprise(username, palier_nom=None):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    if palier_nom:
        palier = Palier.objects.get(nom=palier_nom)
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


def make_candidat(username):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="CANDIDAT")
    ProfilCandidat.objects.create(user=user, wilaya="16 - Alger", titre_professionnel="Dev")
    return user


class DeverrouillerCandidatAPITest(APITestCase):
    def test_gratuit_refuse_palier_insuffisant(self):
        user, _ = make_entreprise("deb_gratuit")
        candidat = make_candidat("deb_gratuit_cand")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-debloquer", args=[candidat.id]))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "PALIER_INSUFFISANT")

    def test_starter_deblocage_reussi(self):
        user, entreprise = make_entreprise("deb_starter", palier_nom="STARTER")
        candidat = make_candidat("deb_starter_cand")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-debloquer", args=[candidat.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["est_debloque"])
        self.assertTrue(AccesCandidatDebloque.objects.filter(entreprise=entreprise, candidat=candidat).exists())

    def test_credits_epuises_403(self):
        user, entreprise = make_entreprise("deb_epuise", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        for i in range(10):
            c = make_candidat(f"deb_epuise_cand_{i}")
            self.client.post(reverse("cvtheque-debloquer", args=[c.id]))
        extra = make_candidat("deb_epuise_cand_extra")
        response = self.client.post(reverse("cvtheque-debloquer", args=[extra.id]))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "CREDITS_EPUISES")

    def test_invite_bloque(self):
        user, entreprise = make_entreprise("deb_invite", palier_nom="STARTER")
        membre = User.objects.create_user(username="deb_invite_m", email="deb_invite_m@test.dz", password="pwd", role="RECRUTEUR")
        MembreEquipe.objects.create(entreprise=entreprise, user=membre, role="INVITE")
        candidat = make_candidat("deb_invite_cand")
        self.client.force_authenticate(user=membre)
        response = self.client.post(reverse("cvtheque-debloquer", args=[candidat.id]))
        self.assertEqual(response.status_code, 403)


class CandidatFichierPriveCreditsAPITest(APITestCase):
    def test_telechargement_cv_bloque_si_non_debloque(self):
        user, entreprise = make_entreprise("cv_bloque", palier_nom="STARTER")
        candidat = make_candidat("cv_bloque_cand")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("candidat-fichier-prive", args=[candidat.id, "cv"]))
        self.assertEqual(response.status_code, 403)

    def test_telechargement_cv_libre_apres_deblocage(self):
        from jobs.credits_utils import deverrouiller_candidat
        user, entreprise = make_entreprise("cv_ok", palier_nom="STARTER")
        candidat = make_candidat("cv_ok_cand")
        candidat.profil_candidat.cv_pdf.save("test.pdf", __import__("django.core.files.base", fromlist=["ContentFile"]).ContentFile(b"%PDF-1.4"))
        deverrouiller_candidat(entreprise, candidat)
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("candidat-fichier-prive", args=[candidat.id, "cv"]))
        self.assertEqual(response.status_code, 200)
