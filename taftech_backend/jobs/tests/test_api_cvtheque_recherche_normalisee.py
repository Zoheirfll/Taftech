from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import CustomUser
from jobs.models import ProfilCandidat, ProfilEntreprise, AbonnementEntreprise, Palier


class CVThequeRechercheNormaliseeTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        rec = CustomUser.objects.create_user(
            username="rec_search", email="rec_search@test.com", password="x", role="RECRUTEUR")
        self.entreprise = ProfilEntreprise.objects.create(
            user=rec, nom_entreprise="ACME Search", registre_commerce="RC-SEARCH",
            est_approuvee=True)
        rec.consentement_cvtheque = True
        rec.save()
        palier, _ = Palier.objects.get_or_create(
            nom="BUSINESS", defaults={
                "limite_offres": None, "acces_coordonnees": True,
                "acces_ia_recommandes": True, "acces_ia_avancee": True, "acces_equipe": True,
            })
        AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=palier)
        self.client.force_authenticate(user=rec)

        self.candidat_user = CustomUser.objects.create_user(
            username="dev_search", email="dev_search@test.com", password="x", role="CANDIDAT")
        ProfilCandidat.objects.create(user=self.candidat_user, titre_professionnel="Développeur Full Stack")

    def test_recherche_sans_accent_trouve_le_candidat_accentue(self):
        resp = self.client.get(reverse('cvtheque'), {"search": "developpeur"})
        self.assertEqual(resp.status_code, 200)
        data = resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else resp.data
        user_ids = [c["user_id"] for c in data]
        self.assertIn(self.candidat_user.id, user_ids)

    def test_champ_correspondant_indique_le_titre(self):
        # R05 : le champ ayant motivé le résultat doit être exposé au recruteur.
        resp = self.client.get(reverse('cvtheque'), {"search": "developpeur"})
        data = resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else resp.data
        item = next(c for c in data if c["user_id"] == self.candidat_user.id)
        self.assertEqual(item["champ_correspondant"], "titre")

    def test_R07_expression_exacte_avant_jetons_disperses(self):
        # Candidat A : le titre contient exactement "developpeur react" (priorité 0).
        # Candidat B : les deux mots existent mais dispersés sur des champs différents
        # (priorité >= 1) — A doit apparaître avant B dans les résultats.
        user_b = CustomUser.objects.create_user(
            username="dev_disperse", email="dev_disperse@test.com", password="x", role="CANDIDAT")
        profil_b = ProfilCandidat.objects.create(user=user_b, titre_professionnel="React specialist", competences="Developpeur")
        self.candidat_user.profil_candidat.titre_professionnel = "Developpeur React confirmé"
        self.candidat_user.profil_candidat.save()

        resp = self.client.get(reverse('cvtheque'), {"search": "developpeur react", "tri": "recents"})
        data = resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else resp.data
        user_ids = [c["user_id"] for c in data]
        self.assertIn(self.candidat_user.id, user_ids)
        self.assertIn(user_b.id, user_ids)
        self.assertLess(user_ids.index(self.candidat_user.id), user_ids.index(user_b.id))
