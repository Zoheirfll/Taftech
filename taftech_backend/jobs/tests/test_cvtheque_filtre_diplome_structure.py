"""Point 9 : le filtre « Diplôme » de la CVthèque s'appuie sur le type de diplôme structuré
(profil ou formation), plus sur l'ancien champ texte (Master 2, Ingéniorat, Bac+5…)."""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import CustomUser
from jobs.models import AbonnementEntreprise, FormationCandidat, Palier, ProfilCandidat, ProfilEntreprise, TypeDiplome


class CVThequeFiltreDiplomeStructureTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        rec = CustomUser.objects.create_user(username="rec_dip", email="rec_dip@test.com", password="x", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(
            user=rec, nom_entreprise="ACME Diplome", registre_commerce="RC-DIP", est_approuvee=True)
        rec.consentement_cvtheque = True
        rec.save()
        palier, _ = Palier.objects.get_or_create(
            nom="BUSINESS", defaults={"limite_offres": None, "acces_coordonnees": True,
                                       "acces_ia_recommandes": True, "acces_ia_avancee": True, "acces_equipe": True})
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
        self.client.force_authenticate(user=rec)

        self.licence = TypeDiplome.objects.create(code="D-LIC-T", libelle="Licence test", systeme="superieur_lmd")
        self.bts = TypeDiplome.objects.create(code="D-BTS-T", libelle="BTS test", systeme="formation_professionnelle")

        self.u_profil = self._candidat("c_profil")
        ProfilCandidat.objects.filter(user=self.u_profil).update(diplome_ref=self.licence)
        self.u_formation = self._candidat("c_formation")
        FormationCandidat.objects.create(
            profil=self.u_formation.profil_candidat, diplome="Licence", etablissement="Univ", diplome_ref=self.licence)
        self.u_autre = self._candidat("c_autre")
        ProfilCandidat.objects.filter(user=self.u_autre).update(diplome_ref=self.bts)

    def _candidat(self, nom):
        user = CustomUser.objects.create_user(username=nom, email=f"{nom}@test.com", password="x", role="CANDIDAT")
        ProfilCandidat.objects.create(user=user, titre_professionnel=f"Titre {nom}")
        return user

    def _ids(self, **params):
        resp = self.client.get(reverse('cvtheque'), params)
        self.assertEqual(resp.status_code, 200)
        data = resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else resp.data
        return {c["user_id"] for c in data}

    def test_filtre_par_type_de_diplome_du_profil_ou_d_une_formation(self):
        ids = self._ids(diplome_ref=self.licence.id)
        self.assertEqual(ids, {self.u_profil.id, self.u_formation.id})

    def test_filtre_sans_resultat_pour_un_autre_type(self):
        self.assertEqual(self._ids(diplome_ref=self.bts.id), {self.u_autre.id})

    def test_valeur_non_numerique_ignoree(self):
        self.assertEqual(self._ids(diplome_ref="abc"), {self.u_profil.id, self.u_formation.id, self.u_autre.id})
