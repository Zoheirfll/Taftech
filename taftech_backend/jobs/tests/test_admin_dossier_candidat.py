"""Fiche admin d'un candidat : dossier complet (niveaux, candidatures, activité, usage IA)."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import (
    AlerteEmploi, Candidature, CompetenceCandidat, OffreEmploi, OffreSauvegardee, ProfilCandidat,
    UtilisationIA,
)
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()


class DossierCandidatAdminTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="dos_admin", email="dos_admin@test.dz", password="pwd", role="ADMIN", is_staff=True,
        )
        self.candidat = User.objects.create_user(
            username="dos_cand", email="dos_cand@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        self.profil = ProfilCandidat.objects.create(
            user=self.candidat, titre_professionnel="Développeur", langues="Arabe:Maternelle, Anglais:Avancé, Espagnol",
            bio="Bio de test", visible_cvtheque=True,
        )
        CompetenceCandidat.objects.create(profil=self.profil, label="Python", niveau="CONFIRME")
        CompetenceCandidat.objects.create(profil=self.profil, label="Excel", niveau="DEBUTANT")
        CompetenceCandidat.objects.create(profil=self.profil, label="Django", niveau="AVANCE")
        proprio, entreprise = make_entreprise("dos_rec", palier_nom="BUSINESS")
        self.offres = [
            OffreEmploi.objects.create(
                entreprise=entreprise, titre=f"Offre {i}", wilaya="16 - Alger", description="d",
                statut_moderation="APPROUVEE",
            )
            for i in range(3)
        ]
        Candidature.objects.create(offre=self.offres[0], candidat=self.candidat, score_matching=80, statut="RECUE")
        Candidature.objects.create(offre=self.offres[1], candidat=self.candidat, score_matching=60, statut="RECUE")
        Candidature.objects.create(offre=self.offres[2], candidat=self.candidat, score_matching=40, statut="REFUSEE")
        OffreSauvegardee.objects.create(candidat=self.candidat, offre=self.offres[0])
        AlerteEmploi.objects.create(candidat=self.candidat, mots_cles="react", est_active=True)
        AlerteEmploi.objects.create(candidat=self.candidat, mots_cles="java", est_active=False)
        UtilisationIA.objects.create(user=self.candidat, fonction="PARSER_CV", tokens_entree=300, tokens_sortie=100)
        UtilisationIA.objects.create(user=self.candidat, fonction="PARSER_CV", statut="REMBOURSE")
        self.url = reverse("admin-dossier-candidat", args=[self.candidat.id])

    def _connecter(self, user):
        nom_cookie = settings.SIMPLE_JWT.get("AUTH_COOKIE", "accessToken")
        self.client.cookies[nom_cookie] = str(RefreshToken.for_user(user).access_token)

    def test_admin_obtient_le_dossier(self):
        self._connecter(self.admin)
        reponse = self.client.get(self.url)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data["identite"]["bio"], "Bio de test")
        self.assertTrue(reponse.data["identite"]["visible_cvtheque"])

    def test_competences_avec_leur_niveau_triees_du_plus_haut_au_plus_bas(self):
        self._connecter(self.admin)
        competences = self.client.get(self.url).data["competences"]
        self.assertEqual([c["label"] for c in competences], ["Python", "Django", "Excel"])
        self.assertEqual([c["niveau"] for c in competences], ["CONFIRME", "AVANCE", "DEBUTANT"])
        self.assertTrue(all(c["niveau_libelle"] for c in competences))

    def test_langues_avec_leur_niveau(self):
        self._connecter(self.admin)
        langues = self.client.get(self.url).data["langues"]
        self.assertEqual(langues, [
            {"langue": "Arabe", "niveau": "Maternelle"},
            {"langue": "Anglais", "niveau": "Avancé"},
            {"langue": "Espagnol", "niveau": ""},
        ])

    def test_statistiques_de_candidatures(self):
        self._connecter(self.admin)
        c = self.client.get(self.url).data["candidatures"]
        self.assertEqual(c["total"], 3)
        self.assertEqual(c["score_moyen"], 60)
        self.assertEqual(sum(c["par_statut"].values()), 3)
        self.assertEqual(len(c["recentes"]), 3)
        self.assertEqual({r["offre"] for r in c["recentes"]}, {"Offre 0", "Offre 1", "Offre 2"})

    def test_activite(self):
        self._connecter(self.admin)
        a = self.client.get(self.url).data["activite"]
        self.assertEqual(a["offres_sauvegardees"], 1)
        self.assertEqual((a["alertes_total"], a["alertes_actives"]), (2, 1))

    def test_usage_ia_du_mois_exclut_les_appels_rembourses(self):
        self._connecter(self.admin)
        ia = self.client.get(self.url).data["ia_mois"]
        self.assertEqual(len(ia), 1)
        self.assertEqual((ia[0]["appels"], ia[0]["tokens"]), (1, 400))

    def test_le_dossier_ne_contient_aucun_nin_ni_donnee_d_un_autre_candidat(self):
        autre = User.objects.create_user(
            username="dos_autre", email="dos_autre@test.dz", password="pwd", role="CANDIDAT",
            nin="109876543210987654",
        )
        ProfilCandidat.objects.create(user=autre, langues="Chinois:Courant")
        self._connecter(self.admin)
        corps = self.client.get(self.url).content.decode()
        self.assertNotIn("Chinois", corps)
        self.assertNotIn("109876543210987654", corps)

    def test_candidat_et_recruteur_refuses(self):
        self._connecter(self.candidat)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        recruteur, _ = make_entreprise("dos_rec2", palier_nom="BUSINESS")
        self._connecter(recruteur)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_sans_cookie_refuse(self):
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_compte_non_candidat_ou_inconnu_donne_404(self):
        self._connecter(self.admin)
        recruteur, _ = make_entreprise("dos_rec3", palier_nom="BUSINESS")
        self.assertEqual(self.client.get(reverse("admin-dossier-candidat", args=[recruteur.id])).status_code, 404)
        self.assertEqual(self.client.get(reverse("admin-dossier-candidat", args=[999999])).status_code, 404)

    def test_candidat_sans_donnees_donne_des_listes_vides(self):
        vide = User.objects.create_user(username="dos_vide", email="dos_vide@test.dz", password="pwd", role="CANDIDAT")
        ProfilCandidat.objects.create(user=vide)
        self._connecter(self.admin)
        d = self.client.get(reverse("admin-dossier-candidat", args=[vide.id])).data
        self.assertEqual((d["competences"], d["langues"], d["ia_mois"]), ([], [], []))
        self.assertEqual(d["candidatures"]["total"], 0)
        self.assertIsNone(d["candidatures"]["score_moyen"])
