"""`experience_annees` : les années d'expérience que le SCORE attend pour le niveau de l'offre. Source unique
(`matcher.annees_experience_pour_niveau`), exposée par l'offre publique et la fiche admin pour que la page écrive
« Expérience confirmée (environ 3 ans) dans un poste similaire » sans jamais afficher un chiffre que le calcul
n'utilise pas."""
from django.test import TestCase

from accounts.models import CustomUser
from jobs.matcher import _MAP_EXP_ANNEES, annees_experience_pour_niveau
from jobs.models import OffreEmploi, ProfilEntreprise
from jobs.serializers.dashboard import OffreDashboardDTO
from jobs.serializers.offres import OffreEmploiSerializer


class ExperienceAnneesTest(TestCase):
    def setUp(self):
        rec = CustomUser.objects.create_user(username="rec_ea", email="rec_ea@test.com", password="x", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(user=rec, nom_entreprise="ACME EA", est_approuvee=True)
        self.offre = OffreEmploi.objects.create(entreprise=entreprise, titre="Dev", wilaya="31 - Oran", description="x")

    def _avec_niveau(self, niveau):
        self.offre.experience_requise = niveau
        self.offre.save(update_fields=["experience_requise"])

    def test_la_fonction_suit_la_table_du_score(self):
        for niveau, annees in _MAP_EXP_ANNEES.items():
            self.assertEqual(annees_experience_pour_niveau(niveau), annees)

    def test_niveau_inconnu_vaut_zero(self):
        self.assertEqual(annees_experience_pour_niveau("INCONNU"), 0)
        self.assertEqual(annees_experience_pour_niveau(None), 0)

    def test_l_offre_publique_expose_les_annees(self):
        self._avec_niveau("CONFIRME")
        self.assertEqual(OffreEmploiSerializer(self.offre).data["experience_annees"], 3)

    def test_un_debutant_vaut_zero(self):
        self._avec_niveau("DEBUTANT")
        self.assertEqual(OffreEmploiSerializer(self.offre).data["experience_annees"], 0)

    def test_la_fiche_admin_expose_les_annees(self):
        self._avec_niveau("CADRE_DIRIGEANT")
        self.assertEqual(OffreDashboardDTO(self.offre).data["experience_annees"], 8)

    def test_le_champ_est_en_lecture_seule(self):
        """Un recruteur ne peut pas l'imposer à l'enregistrement : il découle toujours du niveau."""
        self._avec_niveau("CONFIRME")
        serializer = OffreEmploiSerializer(self.offre, data={"experience_annees": 99}, partial=True)
        self.assertTrue(serializer.is_valid())
        self.assertNotIn("experience_annees", serializer.validated_data)
