"""Audit des accès par palier (29/09/2026) — deux failles corrigées :
1. la limite d'offres actives ne comptait pas les offres EN_ATTENTE (contournable en déposant
   plusieurs offres pendant la modération) ;
2. l'analyse IA d'une candidature filtrait sur `user.role == 'RECRUTEUR'` : elle écartait les
   membres d'équipe dont le compte est de type CANDIDAT et laissait passer le rôle « Invité »."""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.models import Candidature, MembreEquipe, OffreEmploi
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()

PAYLOAD_OFFRE = {
    "titre": "Dev Test", "wilaya": "16 - Alger", "specialite": "IT",
    "diplome": "MASTER_2", "experience_requise": "CONFIRME", "type_contrat": "CDI",
    "description": "desc", "missions": "m", "profil_recherche": "p",
}


class LimiteOffresEnAttenteTest(APITestCase):
    def test_offre_en_attente_compte_dans_la_limite(self):
        user, _ = make_entreprise("audit_lim_attente")  # Gratuit = 1 offre
        self.client.force_authenticate(user=user)
        r1 = self.client.post(reverse("creer-offre"), PAYLOAD_OFFRE)
        self.assertEqual(r1.status_code, 201)
        # Aucune approbation entre les deux : la 1re offre est EN_ATTENTE.
        r2 = self.client.post(reverse("creer-offre"), PAYLOAD_OFFRE)
        self.assertEqual(r2.status_code, 403)
        self.assertEqual(r2.data.get("code"), "LIMITE_OFFRES_ATTEINTE")

    def test_offre_cloturee_ne_compte_pas(self):
        user, entreprise = make_entreprise("audit_lim_cloturee")
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.post(reverse("creer-offre"), PAYLOAD_OFFRE).status_code, 201)
        OffreEmploi.objects.filter(entreprise=entreprise).update(est_cloturee=True)
        self.assertEqual(self.client.post(reverse("creer-offre"), PAYLOAD_OFFRE).status_code, 201)


class AnalyseIARolesTest(APITestCase):
    def setUp(self):
        # Le cache est partagé entre les tests : une pause du fournisseur IA ou un verrou laissés par un
        # autre module ne doivent jamais fausser ces cas.
        cache.clear()
        self.proprio, self.entreprise = make_entreprise("audit_ia_proprio", palier_nom="BUSINESS")
        offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Offre", wilaya="16 - Alger",
            description="d", statut_moderation="APPROUVEE",
        )
        candidat = User.objects.create_user(
            username="audit_ia_cand", email="audit_ia_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        self.candidature = Candidature.objects.create(
            offre=offre, candidat=candidat, score_matching=70,
            profil_snapshot={"first_name": "Test", "last_name": "Candidat", "titre_professionnel": "Développeur"},
        )
        self.url = reverse("analyse-groq", args=[self.candidature.id])

    def _membre(self, username, role_equipe):
        # Compte de type CANDIDAT invité dans l'équipe : cas réel écarté par l'ancien contrôle.
        user = User.objects.create_user(
            username=username, email=f"{username}@test.dz", password="pwd", role="CANDIDAT",
        )
        MembreEquipe.objects.create(entreprise=self.entreprise, user=user, role=role_equipe)
        return user

    @patch("jobs.views.ia._appel_groq", return_value="Analyse de test")
    def test_membre_utilisateur_de_compte_candidat_peut_analyser(self, _mock):
        self.client.force_authenticate(user=self._membre("audit_ia_membre", "UTILISATEUR"))
        self.assertEqual(self.client.post(self.url).status_code, 200)

    @patch("jobs.views.ia._appel_groq", return_value="Analyse de test")
    def test_membre_invite_ne_peut_pas_analyser(self, mock_ia):
        self.client.force_authenticate(user=self._membre("audit_ia_invite", "INVITE"))
        r = self.client.post(self.url)
        self.assertEqual(r.status_code, 403)
        mock_ia.assert_not_called()

    @patch("jobs.views.ia._appel_groq", return_value="Analyse de test")
    def test_autre_entreprise_refusee(self, mock_ia):
        autre, _ = make_entreprise("audit_ia_autre", palier_nom="BUSINESS")
        self.client.force_authenticate(user=autre)
        # 404 (et non 403) : identique à un identifiant inexistant, pour ne pas révéler qu'une
        # candidature existe chez une autre entreprise.
        reponse = self.client.post(self.url)
        self.assertEqual(reponse.status_code, 404)
        inconnue = self.client.post(reverse("analyse-groq", args=[999999]))
        self.assertEqual(inconnue.status_code, 404)
        self.assertEqual(reponse.json(), inconnue.json())
        mock_ia.assert_not_called()

    @patch("jobs.views.ia._appel_groq", return_value="Analyse de test")
    def test_candidat_sans_entreprise_refuse(self, mock_ia):
        simple = User.objects.create_user(
            username="audit_ia_simple", email="audit_ia_simple@test.dz", password="pwd", role="CANDIDAT",
        )
        self.client.force_authenticate(user=simple)
        # Sans entreprise : même 404 qu'une candidature inexistante (aucune information sur son existence).
        self.assertEqual(self.client.post(self.url).status_code, 404)
        mock_ia.assert_not_called()


class ResoumissionOffreRefuseeTest(APITestCase):
    """Une offre REJETEE n'est pas comptée ; la corriger la remet EN_ATTENTE : la limite doit être
    revérifiée, sinon refus + resoumission contournent la limite du palier."""

    def _offre(self, entreprise, statut, **extra):
        return OffreEmploi.objects.create(
            entreprise=entreprise, titre="O", wilaya="16 - Alger", description="d",
            statut_moderation=statut, **extra,
        )

    def test_resoumission_bloquee_si_limite_atteinte(self):
        user, entreprise = make_entreprise("audit_resoum_bloque")  # Gratuit = 1 offre
        self._offre(entreprise, "APPROUVEE")
        rejetee = self._offre(entreprise, "REJETEE")
        self.client.force_authenticate(user=user)
        r = self.client.patch(reverse("modifier-offre", args=[rejetee.id]), {"titre": "Corrigée"})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data.get("code"), "LIMITE_OFFRES_ATTEINTE")
        rejetee.refresh_from_db()
        self.assertEqual(rejetee.statut_moderation, "REJETEE")

    def test_resoumission_autorisee_si_place_disponible(self):
        user, entreprise = make_entreprise("audit_resoum_ok")
        self._offre(entreprise, "APPROUVEE", est_cloturee=True)  # clôturée : ne compte pas
        rejetee = self._offre(entreprise, "REJETEE")
        self.client.force_authenticate(user=user)
        r = self.client.patch(reverse("modifier-offre", args=[rejetee.id]), {"titre": "Corrigée"})
        self.assertEqual(r.status_code, 200)
        rejetee.refresh_from_db()
        self.assertEqual(rejetee.statut_moderation, "EN_ATTENTE")


class QuotaIAParEntrepriseTest(APITestCase):
    def setUp(self):
        from jobs.models import Palier
        Palier.objects.filter(nom="BUSINESS").update(
            quota_analyse_recruteur_jour=2, quota_analyse_recruteur_mois=None,
        )
        self.proprio, self.entreprise = make_entreprise("audit_quota_proprio", palier_nom="BUSINESS")
        self.membre = User.objects.create_user(
            username="audit_quota_membre", email="audit_quota_membre@test.dz", password="pwd", role="CANDIDAT",
        )
        MembreEquipe.objects.create(entreprise=self.entreprise, user=self.membre, role="UTILISATEUR")

    def test_le_quota_est_partage_entre_proprietaire_et_membres(self):
        from jobs.ia_quota import consommer_quota_ia, verifier_quota_ia
        consommer_quota_ia(self.proprio, "ANALYSE_RECRUTEUR")
        consommer_quota_ia(self.membre, "ANALYSE_RECRUTEUR")
        ok, info = verifier_quota_ia(self.membre, "ANALYSE_RECRUTEUR")
        self.assertFalse(ok)
        self.assertEqual(info["code"], "QUOTA_IA_JOUR_ATTEINT")
        ok, _ = verifier_quota_ia(self.proprio, "ANALYSE_RECRUTEUR")
        self.assertFalse(ok)

    def test_une_autre_entreprise_a_son_propre_quota(self):
        from jobs.ia_quota import consommer_quota_ia, verifier_quota_ia
        autre, _ = make_entreprise("audit_quota_autre", palier_nom="BUSINESS")
        consommer_quota_ia(self.proprio, "ANALYSE_RECRUTEUR")
        consommer_quota_ia(self.membre, "ANALYSE_RECRUTEUR")
        ok, _ = verifier_quota_ia(autre, "ANALYSE_RECRUTEUR") if False else verifier_quota_ia(autre, "ANALYSE_RECRUTEUR")
        self.assertTrue(ok)

    def test_la_derogation_reste_propre_au_compte(self):
        from jobs.ia_quota import consommer_quota_ia, verifier_quota_ia
        from jobs.models import QuotaIAOverride
        QuotaIAOverride.objects.create(user=self.membre, fonction="ANALYSE_RECRUTEUR", limite_jour=5, limite_mois=None)
        consommer_quota_ia(self.proprio, "ANALYSE_RECRUTEUR")
        consommer_quota_ia(self.proprio, "ANALYSE_RECRUTEUR")
        ok, _ = verifier_quota_ia(self.membre, "ANALYSE_RECRUTEUR")  # compte seulement SES appels
        self.assertTrue(ok)


class AccesMembreSelonPalierTest(APITestCase):
    def _membre(self, entreprise, username):
        user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="CANDIDAT")
        MembreEquipe.objects.create(entreprise=entreprise, user=user, role="UTILISATEUR")
        return user

    def test_membre_perd_l_acces_si_le_palier_n_inclut_plus_l_equipe(self):
        from jobs.views.equipe import get_entreprise_for_user
        proprio, entreprise = make_entreprise("audit_membre_pro", palier_nom="PRO")  # Pro : pas d'équipe
        membre = self._membre(entreprise, "audit_membre_pro_m")
        self.assertIsNone(get_entreprise_for_user(membre))
        self.assertEqual(get_entreprise_for_user(proprio), entreprise)  # le propriétaire n'est jamais concerné

    def test_membre_garde_l_acces_avec_un_palier_equipe(self):
        from jobs.views.equipe import get_entreprise_for_user
        _, entreprise = make_entreprise("audit_membre_biz", palier_nom="BUSINESS")
        membre = self._membre(entreprise, "audit_membre_biz_m")
        self.assertEqual(get_entreprise_for_user(membre), entreprise)

    def test_membre_bloque_sur_une_route_metier_apres_retrogradation(self):
        _, entreprise = make_entreprise("audit_membre_route", palier_nom="STARTER")
        membre = self._membre(entreprise, "audit_membre_route_m")
        self.client.force_authenticate(user=membre)
        self.assertIn(self.client.get(reverse("cvtheque")).status_code, (403, 404))
