"""Tests pour InvitationCVTheque + Candidature.source (sous-projet 1, voir
docs/superpowers/specs/2026-08-23-source-candidature-invitation-cvtheque-design.md)."""
from django.test import TestCase
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
import datetime
from rest_framework.test import APITestCase
from jobs.models import (
    InvitationCVTheque, Candidature, OffreEmploi, ProfilEntreprise,
    Palier, AbonnementEntreprise,
)
from django.contrib.auth import get_user_model

User = get_user_model()


def _make_entreprise(email="rec_invit@test.dz", palier_nom="PRO"):
    user = User.objects.create_user(
        username=email, email=email, password="pwd", role="RECRUTEUR",
    )
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise="TestCo", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{email}", est_approuvee=True,
    )
    if palier_nom:
        palier, _ = Palier.objects.get_or_create(nom=palier_nom, defaults={"acces_coordonnees": True})
        if not palier.acces_coordonnees and palier_nom in ("PRO", "BUSINESS", "ENTERPRISE"):
            palier.acces_coordonnees = True
            palier.save()
        AbonnementEntreprise.objects.get_or_create(entreprise=entreprise, defaults={"palier": palier})
    return user, entreprise


def _make_candidat(email="cand_invit@test.dz"):
    return User.objects.create_user(username=email, email=email, password="pwd", role="CANDIDAT")


def _make_offre(entreprise):
    return OffreEmploi.objects.create(
        entreprise=entreprise, titre="Poste Test", wilaya="16 - Alger",
        specialite="L18", diplome="LICENCE", experience_requise="DEBUTANT",
        type_contrat="CDI", description="Desc", statut_moderation="APPROUVEE",
        est_active=True, est_cloturee=False,
    )


class InvitationCVThequeModelTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_token_et_expiration_auto(self):
        _, entreprise = _make_entreprise()
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        inv = InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)
        self.assertTrue(inv.token)
        self.assertTrue(inv.est_valide)

    def test_expire_apres_7_jours(self):
        _, entreprise = _make_entreprise()
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        inv = InvitationCVTheque.objects.create(
            entreprise=entreprise, candidat=candidat, offre=offre,
            date_expiration=timezone.now() - datetime.timedelta(days=1),
        )
        self.assertFalse(inv.est_valide)

    def test_unicite_entreprise_candidat_offre(self):
        _, entreprise = _make_entreprise()
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)
        with self.assertRaises(Exception):
            InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)


class InviterCandidatCVThequeAPITest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_gate_palier_insuffisant(self):
        user, entreprise = _make_entreprise(palier_nom="STARTER")
        Palier.objects.filter(nom="STARTER").update(acces_coordonnees=False)
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-inviter"), {"candidat_id": candidat.id, "offre_id": offre.id})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "PALIER_INSUFFISANT")

    def test_invitation_reussie_palier_suffisant(self):
        user, entreprise = _make_entreprise(palier_nom="PRO")
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-inviter"), {"candidat_id": candidat.id, "offre_id": offre.id})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(InvitationCVTheque.objects.filter(entreprise=entreprise, candidat=candidat, offre=offre).exists())

    def test_double_invitation_refusee(self):
        user, entreprise = _make_entreprise(palier_nom="PRO")
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-inviter"), {"candidat_id": candidat.id, "offre_id": offre.id})
        self.assertEqual(response.status_code, 409)


class CandidatureSourceTest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_candidature_rapide_source_autre(self):
        _, entreprise = _make_entreprise(palier_nom=None)
        offre = _make_offre(entreprise)
        response = self.client.post(
            reverse("postuler-rapide", args=[offre.id]),
            {"nom_rapide": "Test", "prenom_rapide": "T", "email_rapide": "rapide@test.dz"},
        )
        self.assertEqual(response.status_code, 201)
        cand = Candidature.objects.get(offre=offre, email_rapide="rapide@test.dz")
        self.assertEqual(cand.source, "AUTRE")

    def test_candidature_normale_source_site_sans_token(self):
        _, entreprise = _make_entreprise(palier_nom=None)
        offre = _make_offre(entreprise)
        candidat = _make_candidat()
        self.client.force_authenticate(user=candidat)
        response = self.client.post(reverse("postuler-offre", args=[offre.id]), {})
        self.assertEqual(response.status_code, 201)
        cand = Candidature.objects.get(offre=offre, candidat=candidat)
        self.assertEqual(cand.source, "SITE")

    def test_candidature_avec_invitation_source_cvtheque(self):
        _, entreprise = _make_entreprise(palier_nom=None)
        offre = _make_offre(entreprise)
        candidat = _make_candidat()
        inv = InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)
        self.client.force_authenticate(user=candidat)
        response = self.client.post(reverse("postuler-offre", args=[offre.id]), {"invitation_token": inv.token})
        self.assertEqual(response.status_code, 201)
        cand = Candidature.objects.get(offre=offre, candidat=candidat)
        self.assertEqual(cand.source, "CVTHEQUE")
