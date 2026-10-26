"""Rôle d'équipe et pages d'analyse (25/10/2026) : l'Invité (observateur) n'a accès ni aux
candidats recommandés, ni aux statistiques avancées, ni aux candidatures spontanées.
Le contrôle est vérifié sur les vraies routes, pas seulement sur le menu de l'interface."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.models import (
    AbonnementEntreprise, CandidatureSpontanee, MembreEquipe, Palier, ProfilEntreprise,
)

User = get_user_model()


class RolesPagesAnalyseTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.proprio = User.objects.create_user(
            username="proprio_roles@test.dz", email="proprio_roles@test.dz", password="pwd", role="RECRUTEUR",
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.proprio, nom_entreprise="RolesCo", secteur_activite="IT",
            wilaya_siege="16 - Alger", registre_commerce="RC-roles", est_approuvee=True,
        )
        palier, _ = Palier.objects.get_or_create(nom="BUSINESS", defaults={
            "acces_coordonnees": True, "acces_ia_recommandes": True, "acces_ia_avancee": True, "acces_equipe": True,
        })
        AbonnementEntreprise.objects.get_or_create(entreprise=self.entreprise, defaults={"palier": palier})
        self.membres = {}
        for role in ("ADMIN", "UTILISATEUR", "INVITE"):
            u = User.objects.create_user(
                username=f"{role}_roles@test.dz", email=f"{role}_roles@test.dz", password="pwd", role="RECRUTEUR",
            )
            MembreEquipe.objects.create(entreprise=self.entreprise, user=u, role=role)
            self.membres[role] = u
        self.spontanee = CandidatureSpontanee.objects.create(
            entreprise=self.entreprise, nom="Doe", prenom="Jane", email="jane@test.dz",
            cv=SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf"),
        )

    def _routes_lecture(self):
        return [
            reverse("candidats-recommandes"),
            reverse("statistiques-avancees"),
            reverse("liste-spontanees"),
        ]

    def test_invite_refuse_sur_les_pages_d_analyse(self):
        self.client.force_authenticate(user=self.membres["INVITE"])
        for url in self._routes_lecture():
            response = self.client.get(url)
            self.assertEqual(response.status_code, 403, url)
            self.assertEqual(response.data.get("code"), "ROLE_INSUFFISANT", url)

    def test_invite_ne_modifie_ni_ne_supprime_une_spontanee(self):
        self.client.force_authenticate(user=self.membres["INVITE"])
        lire = self.client.patch(reverse("spontanee-lire", args=[self.spontanee.pk]))
        supprimer = self.client.delete(reverse("spontanee-supprimer", args=[self.spontanee.pk]))
        self.assertEqual(lire.status_code, 403)
        self.assertEqual(supprimer.status_code, 403)
        self.spontanee.refresh_from_db()
        self.assertFalse(self.spontanee.lue)
        self.assertTrue(CandidatureSpontanee.objects.filter(pk=self.spontanee.pk).exists())

    def test_autres_roles_gardent_l_acces(self):
        for user in (self.proprio, self.membres["ADMIN"], self.membres["UTILISATEUR"]):
            self.client.force_authenticate(user=user)
            for url in self._routes_lecture():
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200, f"{user.email} {url}")
