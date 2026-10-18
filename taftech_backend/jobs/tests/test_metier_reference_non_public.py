"""Règle client : le recruteur garde son intitulé public (ex. « Développeur Django »), rattaché en
interne à un métier de référence (ex. « Développeur Python ») qui ne sert qu'au calcul du matching.
La référence n'est JAMAIS montrée au public ni aux candidats ; seuls le recruteur et l'admin la voient."""
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from jobs.models import GroupeMetier, Metier, OffreEmploi
from jobs.serializers import OffreEmploiSerializer
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()


class MetierReferenceNonPublicTests(APITestCase):
    def setUp(self):
        self.recruteur, self.entreprise = make_entreprise("ref_rh", palier_nom="BUSINESS")
        groupe = GroupeMetier.objects.create(code="G-REF", type_groupe="domaine_source", libelle="Développement")
        self.reference = Metier.objects.create(
            code="M-PY", libelle="Développeur Python", cle_recherche="developpeur python", groupe_principal=groupe,
        )
        self.offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Développeur Django", metier=self.reference,
            wilaya="16 - Alger", diplome="LICENCE", experience_requise="DEBUTANT", type_contrat="CDI",
            description="Desc", statut_moderation="APPROUVEE", est_active=True, est_cloturee=False,
        )
        self.visiteur = APIClient()

    def _items(self, reponse):
        donnees = reponse.data
        return donnees["results"] if isinstance(donnees, dict) and "results" in donnees else donnees

    def test_liste_publique_affiche_l_intitule_du_recruteur_sans_la_reference(self):
        reponse = self.visiteur.get("/api/jobs/")
        self.assertEqual(reponse.status_code, 200)
        offre = next(o for o in self._items(reponse) if o["id"] == self.offre.id)
        self.assertEqual(offre["titre"], "Développeur Django")
        self.assertNotIn("metier", offre)
        self.assertNotIn("metier_libelle", offre)

    def test_detail_public_sans_la_reference(self):
        reponse = self.visiteur.get(f"/api/jobs/{self.offre.id}/")
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data["titre"], "Développeur Django")
        self.assertNotIn("metier", reponse.data)
        self.assertNotIn("metier_libelle", reponse.data)

    def test_serialiseur_sur_par_defaut_et_explicite_pour_le_recruteur(self):
        par_defaut = OffreEmploiSerializer(self.offre).data
        self.assertNotIn("metier", par_defaut)
        self.assertNotIn("metier_libelle", par_defaut)
        explicite = OffreEmploiSerializer(self.offre, context={"inclure_metier_reference": True}).data
        self.assertEqual(explicite["metier"], self.reference.id)
        self.assertEqual(explicite["metier_libelle"], "Développeur Python")

    def test_le_recruteur_voit_toujours_la_reference_dans_son_tableau_de_bord(self):
        self.client.force_authenticate(user=self.recruteur)
        reponse = self.client.get("/api/jobs/dashboard/")
        self.assertEqual(reponse.status_code, 200)
        offre = next(o for o in reponse.data["offres"] if o["id"] == self.offre.id)
        self.assertEqual(offre["titre"], "Développeur Django")
        self.assertEqual(offre["metier_libelle"], "Développeur Python")
