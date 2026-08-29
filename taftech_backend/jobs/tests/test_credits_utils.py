from django.test import TestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, AccesCandidatDebloque
from jobs.credits_utils import credits_disponibles, deverrouiller_candidat, CreditsEpuisesError

User = get_user_model()


def make_entreprise_avec_palier(username, palier_nom):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    palier = Palier.objects.get(nom=palier_nom)
    AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return entreprise


def make_candidat(username):
    return User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="CANDIDAT")


class CreditsDisponiblesTest(TestCase):
    def test_starter_mensuel_restant_egale_credits_mois(self):
        entreprise = make_entreprise_avec_palier("cd_starter", "STARTER")
        result = credits_disponibles(entreprise)
        self.assertEqual(result['mensuel_restant'], 10)
        self.assertEqual(result['achetes_restant'], 0)

    def test_pro_illimite_mensuel_restant_none(self):
        entreprise = make_entreprise_avec_palier("cd_pro", "PRO")
        result = credits_disponibles(entreprise)
        self.assertIsNone(result['mensuel_restant'])

    def test_mensuel_restant_decremente_apres_deblocage(self):
        entreprise = make_entreprise_avec_palier("cd_decr", "STARTER")
        candidat = make_candidat("cd_decr_cand")
        deverrouiller_candidat(entreprise, candidat)
        result = credits_disponibles(entreprise)
        self.assertEqual(result['mensuel_restant'], 9)


class DeverrouillerCandidatTest(TestCase):
    def test_premier_deblocage_consomme_mensuel(self):
        entreprise = make_entreprise_avec_palier("dc_1", "STARTER")
        candidat = make_candidat("dc_1_cand")
        acces = deverrouiller_candidat(entreprise, candidat)
        self.assertEqual(acces.source, 'MENSUEL')

    def test_redeblocage_meme_candidat_idempotent_ne_consomme_rien(self):
        entreprise = make_entreprise_avec_palier("dc_2", "STARTER")
        candidat = make_candidat("dc_2_cand")
        deverrouiller_candidat(entreprise, candidat)
        deverrouiller_candidat(entreprise, candidat)  # 2e appel, ne doit pas planter ni recompter
        self.assertEqual(AccesCandidatDebloque.objects.filter(entreprise=entreprise, candidat=candidat).count(), 1)
        result = credits_disponibles(entreprise)
        self.assertEqual(result['mensuel_restant'], 9)  # un seul déblocage compté

    def test_quota_mensuel_epuise_bascule_sur_achetes(self):
        entreprise = make_entreprise_avec_palier("dc_3", "STARTER")
        entreprise.abonnement.credits_achetes_restants = 5
        entreprise.abonnement.save(update_fields=['credits_achetes_restants'])
        # épuise les 10 crédits mensuels de STARTER
        for i in range(10):
            deverrouiller_candidat(entreprise, make_candidat(f"dc_3_cand_{i}"))
        acces = deverrouiller_candidat(entreprise, make_candidat("dc_3_cand_extra"))
        self.assertEqual(acces.source, 'ACHETE')
        entreprise.abonnement.refresh_from_db()
        self.assertEqual(entreprise.abonnement.credits_achetes_restants, 4)

    def test_aucun_credit_disponible_leve_erreur(self):
        entreprise = make_entreprise_avec_palier("dc_4", "STARTER")
        for i in range(10):
            deverrouiller_candidat(entreprise, make_candidat(f"dc_4_cand_{i}"))
        with self.assertRaises(CreditsEpuisesError):
            deverrouiller_candidat(entreprise, make_candidat("dc_4_cand_extra"))
