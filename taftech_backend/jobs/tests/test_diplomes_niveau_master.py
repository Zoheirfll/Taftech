"""Un niveau de diplôme (« Master ») réunit ses natures (académique, professionnel, non précisée) : l'offre
enregistre les trois types, donc un candidat « Master à nature non précisée » est retenu par une offre
« Master » — sans aucun changement du score (comparaison par identifiant). Les groupes eux-mêmes vivent côté
interface (`utils/groupesDiplomes.js`) ; l'API fournit le `code` de chaque diplôme pour les regrouper."""
from django.test import TestCase

from accounts.models import CustomUser
from jobs.matcher import _score_diplome_specialite
from jobs.models import FormationCandidat, OffreEmploi, ProfilCandidat, ProfilEntreprise, TypeDiplome
from jobs.serializers.offres import OffreEmploiSerializer


class DiplomesNiveauMasterTest(TestCase):
    def setUp(self):
        creer = lambda code, libelle: TypeDiplome.objects.create(code=code, libelle=libelle, systeme="superieur_lmd")
        self.mas_a = creer("D-MAS-A", "Master académique")
        self.mas_p = creer("D-MAS-P", "Master professionnel")
        self.mas_np = creer("D-MAS-NP", "Master à nature non précisée")
        self.licence = creer("D-LIC-A", "Licence académique")
        self.ingenieur = creer("D-ING", "Diplôme d'ingénieur d'État")

        user = CustomUser.objects.create_user(username="cand_m", email="cand_m@test.com", password="x", role="CANDIDAT")
        self.profil = ProfilCandidat.objects.create(user=user)
        rec = CustomUser.objects.create_user(username="rec_m", email="rec_m@test.com", password="x", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(user=rec, nom_entreprise="ACME M", est_approuvee=True)
        self.offre = OffreEmploi.objects.create(entreprise=entreprise, titre="Analyste", wilaya="31 - Oran", description="x")

    def _candidat_avec(self, diplome):
        FormationCandidat.objects.create(profil=self.profil, diplome=diplome.libelle, statut="OBTENU", diplome_ref=diplome)

    def test_offre_avec_les_trois_masters_retient_un_master_non_precise(self):
        self.offre.diplomes_requis.set([self.mas_a, self.mas_p, self.mas_np])
        self._candidat_avec(self.mas_np)
        contrib_diplome, _, _ = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_diplome["score"], 1.0)

    def test_offre_master_academique_seul_ne_retient_pas_un_master_non_precise(self):
        """Le problème d'origine, conservé comme garde-fou : seul le niveau (3 types) le résout."""
        self.offre.diplomes_requis.set([self.mas_a])
        self._candidat_avec(self.mas_np)
        contrib_diplome, _, _ = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_diplome["score"], 0.0)

    def test_le_niveau_master_ingeniorat_retient_un_ingenieur_d_etat(self):
        """Décision explicite de l'utilisateur (23/10/2026) : l'ingéniorat (Bac +5) fait partie du niveau Master.
        L'offre enregistre les 4 types ; le score compare toujours par identifiant, il n'a pas changé."""
        self.offre.diplomes_requis.set([self.mas_a, self.mas_p, self.mas_np, self.ingenieur])
        self._candidat_avec(self.ingenieur)
        contrib_diplome, _, _ = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_diplome["score"], 1.0)

    def test_une_offre_ingenieur_seule_ne_retient_pas_un_master(self):
        """Pas de réciproque implicite : seul le niveau (4 types) accepte les deux."""
        self.offre.diplomes_requis.set([self.ingenieur])
        self._candidat_avec(self.mas_a)
        contrib_diplome, _, _ = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_diplome["score"], 0.0)

    def test_le_niveau_master_ne_retient_pas_une_licence(self):
        self.offre.diplomes_requis.set([self.mas_a, self.mas_p, self.mas_np])
        self._candidat_avec(self.licence)
        contrib_diplome, _, _ = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_diplome["score"], 0.0)

    def test_le_detail_de_l_offre_porte_le_code_des_diplomes(self):
        self.offre.diplomes_requis.set([self.mas_a, self.mas_p, self.mas_np])
        detail = OffreEmploiSerializer(self.offre).data["diplomes_requis_detail"]
        self.assertCountEqual([d["code"] for d in detail], ["D-MAS-A", "D-MAS-P", "D-MAS-NP"])
        self.assertTrue(all({"id", "libelle", "code"} <= set(d) for d in detail))
