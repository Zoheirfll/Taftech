"""Fiche admin d'un recruteur : dossier complet (entreprise, abonnement, offres, équipe, IA)."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import Candidature, MembreEquipe, OffreEmploi, ProfilCandidat, UtilisationIA
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()


class DossierRecruteurAdminTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="dr_admin", email="dr_admin@test.dz", password="pwd", role="ADMIN", is_staff=True,
        )
        self.proprio, self.entreprise = make_entreprise("dr_rec", palier_nom="BUSINESS")
        self.offres = [
            OffreEmploi.objects.create(
                entreprise=self.entreprise, titre="Offre en ligne", wilaya="16 - Alger", description="d",
                statut_moderation="APPROUVEE",
            ),
            OffreEmploi.objects.create(
                entreprise=self.entreprise, titre="Offre en attente", wilaya="16 - Alger", description="d",
                statut_moderation="EN_ATTENTE",
            ),
            OffreEmploi.objects.create(
                entreprise=self.entreprise, titre="Offre clôturée", wilaya="16 - Alger", description="d",
                statut_moderation="APPROUVEE", est_cloturee=True,
            ),
        ]
        candidat = User.objects.create_user(
            username="dr_cand", email="dr_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        ProfilCandidat.objects.create(user=candidat)
        Candidature.objects.create(offre=self.offres[0], candidat=candidat, score_matching=70, statut="RECUE")
        autre_candidat = User.objects.create_user(
            username="dr_cand2", email="dr_cand2@test.dz", password="pwd", role="CANDIDAT",
        )
        Candidature.objects.create(offre=self.offres[0], candidat=autre_candidat, score_matching=50, statut="REFUSEE")
        self.membre = User.objects.create_user(
            username="dr_membre", email="dr_membre@test.dz", password="pwd", role="CANDIDAT",
            first_name="Amine", last_name="Kaci",
        )
        MembreEquipe.objects.create(entreprise=self.entreprise, user=self.membre, role="UTILISATEUR")
        UtilisationIA.objects.create(user=self.proprio, fonction="ANALYSE_RECRUTEUR", tokens_entree=200, tokens_sortie=100)
        UtilisationIA.objects.create(user=self.membre, fonction="ANALYSE_RECRUTEUR", tokens_entree=100, tokens_sortie=50)
        UtilisationIA.objects.create(user=self.proprio, fonction="GENERATION_OFFRE", statut="REMBOURSE")
        self.url = reverse("admin-dossier-recruteur", args=[self.proprio.id])

    def _connecter(self, user):
        nom_cookie = settings.SIMPLE_JWT.get("AUTH_COOKIE", "accessToken")
        self.client.cookies[nom_cookie] = str(RefreshToken.for_user(user).access_token)

    def test_admin_obtient_le_dossier(self):
        self._connecter(self.admin)
        reponse = self.client.get(self.url)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data["entreprise"]["nom"], self.entreprise.nom_entreprise)
        self.assertTrue(reponse.data["entreprise"]["approuvee"])
        self.assertEqual(reponse.data["entreprise"]["registre_commerce"], self.entreprise.registre_commerce)

    def test_secteur_en_libelle_et_non_en_code(self):
        from jobs.referentiel_utils import libelle_secteur_entreprise
        self.entreprise.secteur_activite = "TSEC-D4AA98B50484"
        self.entreprise.save(update_fields=["secteur_activite"])
        self._connecter(self.admin)
        secteur = self.client.get(self.url).data["entreprise"]["secteur"]
        self.assertEqual(secteur, libelle_secteur_entreprise("TSEC-D4AA98B50484"))

    def test_abonnement_et_credits(self):
        self._connecter(self.admin)
        a = self.client.get(self.url).data["abonnement"]
        self.assertTrue(a["actif"])
        self.assertIn("business", a["palier"].lower())
        self.assertIn("credits_mensuels_restants", a)
        self.assertIn("credits_achetes_restants", a)

    def test_offres_par_statut_et_candidatures_par_offre(self):
        self._connecter(self.admin)
        o = self.client.get(self.url).data["offres"]
        self.assertEqual(o["total"], 3)
        self.assertEqual(o["en_ligne"], 1)
        self.assertEqual(o["cloturees"], 1)
        en_ligne = next(x for x in o["recentes"] if x["titre"] == "Offre en ligne")
        self.assertEqual(en_ligne["candidatures"], 2)
        sans = next(x for x in o["recentes"] if x["titre"] == "Offre en attente")
        self.assertEqual(sans["candidatures"], 0)

    def test_candidatures_recues(self):
        self._connecter(self.admin)
        c = self.client.get(self.url).data["candidatures_recues"]
        self.assertEqual(c["total"], 2)
        self.assertEqual(sum(c["par_statut"].values()), 2)

    def test_equipe(self):
        self._connecter(self.admin)
        equipe = self.client.get(self.url).data["equipe"]
        self.assertEqual(len(equipe), 1)
        self.assertEqual(equipe[0]["nom"], "Amine Kaci")

    def test_usage_ia_de_toute_l_entreprise_sans_les_appels_rembourses(self):
        self._connecter(self.admin)
        ia = self.client.get(self.url).data["ia_mois"]
        self.assertEqual(len(ia), 1)
        self.assertEqual((ia[0]["appels"], ia[0]["tokens"]), (2, 450))

    def test_aucune_donnee_d_une_autre_entreprise(self):
        _, autre_entreprise = make_entreprise("dr_autre", palier_nom="STARTER")
        OffreEmploi.objects.create(
            entreprise=autre_entreprise, titre="Offre secrète autre entreprise", wilaya="31 - Oran",
            description="d", statut_moderation="APPROUVEE",
        )
        self._connecter(self.admin)
        corps = self.client.get(self.url).content.decode()
        self.assertNotIn("Offre secrète autre entreprise", corps)

    def test_candidat_et_recruteur_refuses(self):
        self._connecter(self.membre)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self._connecter(self.proprio)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_sans_cookie_refuse(self):
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_compte_non_recruteur_ou_inconnu_donne_404(self):
        self._connecter(self.admin)
        self.assertEqual(self.client.get(reverse("admin-dossier-recruteur", args=[self.membre.id])).status_code, 404)
        self.assertEqual(self.client.get(reverse("admin-dossier-recruteur", args=[999999])).status_code, 404)
