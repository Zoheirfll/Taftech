"""Page « Candidats recommandés » (GET jobs/dashboard/candidats-recommandes/) : accès par
palier (403 PALIER_INSUFFISANT sous Pro), seuil de score, offres actives uniquement,
isolation par entreprise. Vérification demandée avant mise en production."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from jobs.models import Candidature, OffreEmploi
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()


def _offre(entreprise, **extra):
    donnees = dict(
        entreprise=entreprise, titre="Poste Test", wilaya="16 - Alger",
        diplome="LICENCE", experience_requise="DEBUTANT", type_contrat="CDI",
        description="Desc", statut_moderation="APPROUVEE", est_active=True, est_cloturee=False,
    )
    donnees.update(extra)
    return OffreEmploi.objects.create(**donnees)


def _candidat(nom):
    return User.objects.create_user(username=nom, email=f"{nom}@test.dz", password="pwd", role="CANDIDAT")


class CandidatsRecommandesAccesTests(APITestCase):
    url = "/api/jobs/dashboard/candidats-recommandes/"

    def _appel(self, user):
        self.client.force_authenticate(user=user)
        return self.client.get(self.url)

    def test_gratuit_recoit_403_palier_insuffisant(self):
        user, _ = make_entreprise("rec_gratuit")
        reponse = self._appel(user)
        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(reponse.data["code"], "PALIER_INSUFFISANT")

    def test_starter_recoit_403_palier_insuffisant(self):
        user, _ = make_entreprise("rec_starter", palier_nom="STARTER")
        reponse = self._appel(user)
        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(reponse.data["code"], "PALIER_INSUFFISANT")

    def test_pro_et_business_ont_acces(self):
        for palier in ("PRO", "BUSINESS"):
            with self.subTest(palier=palier):
                user, _ = make_entreprise(f"rec_{palier.lower()}", palier_nom=palier)
                self.assertEqual(self._appel(user).status_code, 200)

    def test_abonnement_expire_redevient_403(self):
        user, _ = make_entreprise("rec_expire", palier_nom="PRO", expire_dans_jours=-1)
        self.assertEqual(self._appel(user).status_code, 403)

    def test_non_authentifie_refuse(self):
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_compte_sans_entreprise_recoit_404(self):
        self.assertEqual(self._appel(_candidat("rec_candidat")).status_code, 404)


class CandidatsRecommandesContenuTests(APITestCase):
    url = "/api/jobs/dashboard/candidats-recommandes/"

    def setUp(self):
        self.user, self.entreprise = make_entreprise("rec_contenu", palier_nom="PRO")
        self.client.force_authenticate(user=self.user)

    def _ids(self, **params):
        reponse = self.client.get(self.url, params)
        self.assertEqual(reponse.status_code, 200)
        return [c["id"] for c in reponse.data["results"]]

    def test_seuil_80_et_tri_par_score_decroissant(self):
        offre = _offre(self.entreprise)
        haut = Candidature.objects.create(offre=offre, candidat=_candidat("c_haut"), score_matching=92, statut="RECUE")
        limite = Candidature.objects.create(offre=offre, candidat=_candidat("c_limite"), score_matching=80, statut="RECUE")
        Candidature.objects.create(offre=offre, candidat=_candidat("c_bas"), score_matching=79, statut="RECUE")
        self.assertEqual(self._ids(), [haut.id, limite.id])

    def test_offre_cloturee_ou_inactive_exclue(self):
        cloturee = _offre(self.entreprise, est_cloturee=True)
        inactive = _offre(self.entreprise, est_active=False)
        Candidature.objects.create(offre=cloturee, candidat=_candidat("c_clo"), score_matching=95, statut="RECUE")
        Candidature.objects.create(offre=inactive, candidat=_candidat("c_ina"), score_matching=95, statut="RECUE")
        self.assertEqual(self._ids(), [])

    def test_masquer_decides_par_defaut_et_option_pour_les_voir(self):
        offre = _offre(self.entreprise)
        retenu = Candidature.objects.create(offre=offre, candidat=_candidat("c_ret"), score_matching=90, statut="RETENU")
        recu = Candidature.objects.create(offre=offre, candidat=_candidat("c_rec"), score_matching=85, statut="RECUE")
        self.assertEqual(self._ids(), [recu.id])
        self.assertEqual(set(self._ids(masquer_decides="false")), {retenu.id, recu.id})

    def test_candidature_rapide_ou_sans_score_exclue(self):
        offre = _offre(self.entreprise)
        Candidature.objects.create(offre=offre, candidat=None, est_rapide=True, score_matching=95, statut="RECUE")
        Candidature.objects.create(offre=offre, candidat=_candidat("c_nul"), score_matching=None, statut="RECUE")
        self.assertEqual(self._ids(), [])

    def test_isolation_entre_entreprises(self):
        _, autre = make_entreprise("rec_autre", palier_nom="PRO")
        Candidature.objects.create(offre=_offre(autre), candidat=_candidat("c_autre"), score_matching=95, statut="RECUE")
        self.assertEqual(self._ids(), [])
