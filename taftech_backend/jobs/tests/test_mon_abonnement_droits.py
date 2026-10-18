"""`GET /api/jobs/paliers/mon-abonnement/` expose `acces_ia_recommandes` : le menu recruteur s'en
sert pour afficher un cadenas sur « Candidats recommandés ». Le droit est lu sur le palier
réellement ACTIF (un abonnement expiré ne le donne plus), jamais sur le nom du palier."""
from rest_framework.test import APITestCase

from jobs.models import OffreEmploi
from jobs.tests.test_api_paliers_gating import make_entreprise

URL = "/api/jobs/paliers/mon-abonnement/"


class MonAbonnementDroitsTests(APITestCase):
    def _appeler(self, username, **kwargs):
        user, _ = make_entreprise(username, **kwargs)
        self.client.force_authenticate(user=user)
        return self.client.get(URL)

    def test_sans_abonnement_pas_de_droit(self):
        reponse = self._appeler("ab_gratuit")
        self.assertEqual(reponse.status_code, 200)
        self.assertIsNone(reponse.data["palier"])
        self.assertIs(reponse.data["acces_ia_recommandes"], False)

    def test_starter_n_a_pas_les_candidats_recommandes(self):
        reponse = self._appeler("ab_starter", palier_nom="STARTER")
        self.assertEqual(reponse.data["palier"], "STARTER")
        self.assertIs(reponse.data["acces_ia_recommandes"], False)

    def test_pro_a_les_candidats_recommandes(self):
        reponse = self._appeler("ab_pro", palier_nom="PRO")
        self.assertIs(reponse.data["acces_ia_recommandes"], True)

    def test_abonnement_expire_ne_donne_plus_le_droit(self):
        reponse = self._appeler("ab_pro_expire", palier_nom="PRO", expire_dans_jours=-1)
        self.assertIs(reponse.data["acces_ia_recommandes"], False)
        self.assertIs(reponse.data["acces_equipe"], False)
        self.assertIs(reponse.data["acces_cvtheque"], False)

    def test_cvtheque_exige_un_palier_actif(self):
        sans = self._appeler("ab_cv_sans")
        self.assertIs(sans.data["acces_cvtheque"], False)
        starter = self._appeler("ab_cv_starter", palier_nom="STARTER")
        self.assertIs(starter.data["acces_cvtheque"], True)

    def test_publication_bloquee_quand_la_limite_d_offres_est_atteinte(self):
        # Sans abonnement, la limite est de 1 offre active (paliers_utils.limite_offres_actives).
        user, entreprise = make_entreprise("ab_limite_offres")
        self.client.force_authenticate(user=user)
        reponse = self.client.get(URL)
        self.assertIs(reponse.data["peut_publier_offre"], True)
        self.assertEqual(reponse.data["limite_offres"], 1)
        OffreEmploi.objects.create(
            entreprise=entreprise, titre="Poste", wilaya="16 - Alger", diplome="LICENCE",
            experience_requise="DEBUTANT", type_contrat="CDI", description="Desc",
            statut_moderation="EN_ATTENTE", est_active=True, est_cloturee=False,
        )
        # Une offre EN ATTENTE compte déjà (même règle que la création d'offre).
        self.assertIs(self.client.get(URL).data["peut_publier_offre"], False)

    def test_equipe_reservee_aux_paliers_qui_l_incluent(self):
        pro = self._appeler("ab_eq_pro", palier_nom="PRO")
        self.assertIs(pro.data["acces_equipe"], False)
        business = self._appeler("ab_eq_business", palier_nom="BUSINESS")
        self.assertIs(business.data["acces_equipe"], True)
