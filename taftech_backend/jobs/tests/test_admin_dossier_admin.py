"""Fiche admin d'un compte administrateur : type de compte et actions tracées."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import AuditLog

User = get_user_model()


class DossierAdminAdminTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="da_admin", email="da_admin@test.dz", password="pwd", role="ADMIN", is_staff=True,
        )
        self.autre = User.objects.create_user(
            username="da_autre", email="da_autre@test.dz", password="pwd", role="ADMIN", is_staff=True,
        )
        self.candidat = User.objects.create_user(
            username="da_cand", email="da_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        for action in ("APPROUVER_OFFRE", "APPROUVER_OFFRE", "REFUSER_OFFRE"):
            AuditLog.objects.create(admin=self.autre, action=action, detail="d")
        AuditLog.objects.create(admin=self.admin, action="AUTRE", detail="mien")
        self.url = reverse("admin-dossier-admin", args=[self.autre.id])

    def _connecter(self, user):
        nom_cookie = settings.SIMPLE_JWT.get("AUTH_COOKIE", "accessToken")
        self.client.cookies[nom_cookie] = str(RefreshToken.for_user(user).access_token)

    def test_admin_obtient_le_dossier_d_un_autre_admin(self):
        self._connecter(self.admin)
        reponse = self.client.get(self.url)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data["compte"]["type"], "Administrateur")
        self.assertEqual(reponse.data["actions"]["total"], 3)
        self.assertEqual(reponse.data["actions"]["par_action"][0]["nombre"], 2)
        self.assertEqual(len(reponse.data["actions"]["recentes"]), 3)

    def test_les_actions_d_un_autre_admin_ne_sont_pas_melangees(self):
        self._connecter(self.admin)
        corps = self.client.get(self.url).content.decode()
        self.assertNotIn("mien", corps)

    def test_candidat_refuse(self):
        self._connecter(self.candidat)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_compte_non_admin_ou_inconnu_donne_404(self):
        self._connecter(self.admin)
        self.assertEqual(self.client.get(reverse("admin-dossier-admin", args=[self.candidat.id])).status_code, 404)
        self.assertEqual(self.client.get(reverse("admin-dossier-admin", args=[999999])).status_code, 404)

    def test_admin_sans_action(self):
        vide = User.objects.create_user(
            username="da_vide", email="da_vide@test.dz", password="pwd", role="ADMIN", is_staff=True,
        )
        self._connecter(self.admin)
        reponse = self.client.get(reverse("admin-dossier-admin", args=[vide.id]))
        self.assertEqual(reponse.data["actions"]["total"], 0)
        self.assertIsNone(reponse.data["actions"]["derniere_le"])
