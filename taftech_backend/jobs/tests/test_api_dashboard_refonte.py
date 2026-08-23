"""Tests pour la refonte dashboard recruteur (sous-projet 2, voir
docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md)."""
from django.test import TestCase
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase
from jobs.models import (
    Candidature, OffreEmploi, ProfilEntreprise, Palier, AbonnementEntreprise,
    RechercheSauvegardee, EquipeActionLog,
)
from django.contrib.auth import get_user_model

User = get_user_model()


def _make_entreprise(email="rec_dash@test.dz"):
    user = User.objects.create_user(username=email, email=email, password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise="TestCo", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{email}", est_approuvee=True,
    )
    palier, _ = Palier.objects.get_or_create(nom="BUSINESS", defaults={
        "acces_coordonnees": True, "acces_ia_recommandes": True, "acces_ia_avancee": True, "acces_equipe": True,
    })
    AbonnementEntreprise.objects.get_or_create(entreprise=entreprise, defaults={"palier": palier})
    return user, entreprise


def _make_offre(entreprise):
    return OffreEmploi.objects.create(
        entreprise=entreprise, titre="Poste Test", wilaya="16 - Alger",
        specialite="L18", diplome="LICENCE", experience_requise="DEBUTANT",
        type_contrat="CDI", description="Desc", statut_moderation="APPROUVEE",
        est_active=True, est_cloturee=False,
    )


class DashboardKPIsPeriodeTest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_kpis_presents_dans_reponse(self):
        user, entreprise = _make_entreprise()
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-recruteur"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("kpis", response.data)
        self.assertIn("candidatures_recues", response.data["kpis"])

    def test_date_invalide_rejetee(self):
        user, entreprise = _make_entreprise()
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-recruteur"), {"date_debut": "pas-une-date"})
        self.assertEqual(response.status_code, 400)

    def test_candidatures_comptees_dans_la_fenetre(self):
        user, entreprise = _make_entreprise()
        offre = _make_offre(entreprise)
        candidat = User.objects.create_user(username="c1@test.dz", email="c1@test.dz", password="pwd", role="CANDIDAT")
        Candidature.objects.create(offre=offre, candidat=candidat, score_matching=50, statut="RECUE")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-recruteur"))
        self.assertEqual(response.data["kpis"]["candidatures_recues"]["valeur"], 1)


class ActiviteRecenteAPITest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_scope_entreprise(self):
        user, entreprise = _make_entreprise()
        EquipeActionLog.objects.create(entreprise=entreprise, membre=user, action="CREER_OFFRE", detail="Poste Test")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-activite-recente"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertIn("Poste Test", response.data[0]["phrase"])


class RecherchesSauvegardeesAPITest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_creation_et_liste(self):
        user, entreprise = _make_entreprise()
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("recherches-sauvegardees"), {"nom": "Devs Alger", "filtres": {"wilaya": "16"}}, format="json")
        self.assertEqual(response.status_code, 201)
        response = self.client.get(reverse("recherches-sauvegardees"))
        self.assertEqual(len(response.data), 1)

    def test_limite_20(self):
        user, entreprise = _make_entreprise()
        for i in range(20):
            RechercheSauvegardee.objects.create(entreprise=entreprise, nom=f"R{i}", filtres={})
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("recherches-sauvegardees"), {"nom": "Trop", "filtres": {}}, format="json")
        self.assertEqual(response.status_code, 400)


class RapportPDFAPITest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_genere_pdf_non_vide(self):
        user, entreprise = _make_entreprise()
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-rapport-pdf"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertGreater(len(response.content), 500)
