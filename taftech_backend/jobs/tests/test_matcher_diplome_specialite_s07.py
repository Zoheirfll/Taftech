from django.test import TestCase
from accounts.models import CustomUser
from jobs.models import (
    ProfilCandidat, FormationCandidat, TypeDiplome, DomaineFormation,
    SpecialiteFormation, DiplomeSpecialite, OffreEmploi, ProfilEntreprise,
)
from jobs.matcher import _score_diplome_specialite


class ScoreDiplomeSpecialiteS07Test(TestCase):
    def setUp(self):
        self.d_master = TypeDiplome.objects.create(code="D-MAS-T7", libelle="Master", systeme="universitaire")
        self.d_licence = TypeDiplome.objects.create(code="D-LIC-T7", libelle="Licence", systeme="universitaire")
        self.domaine = DomaineFormation.objects.create(code="DOM-T7", libelle="Sciences", systeme="universitaire")
        self.spec_info = SpecialiteFormation.objects.create(
            code="SPE-INFO-T7", domaine=self.domaine, libelle="Informatique", cle_recherche="informatique")
        self.spec_finance = SpecialiteFormation.objects.create(
            code="SPE-FIN-T7", domaine=self.domaine, libelle="Finance", cle_recherche="finance")
        self.couple_master_info = DiplomeSpecialite.objects.create(
            code="LIEN-T7-1", diplome=self.d_master, specialite=self.spec_info)

        user = CustomUser.objects.create_user(username="cand_t7", email="cand_t7@test.com", password="x", role="CANDIDAT")
        self.profil = ProfilCandidat.objects.create(user=user)

        entreprise_user = CustomUser.objects.create_user(username="rec_t7", email="rec_t7@test.com", password="x", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(user=entreprise_user, nom_entreprise="ACME T7", est_approuvee=True)
        self.offre = OffreEmploi.objects.create(
            entreprise=entreprise, titre="Dev", wilaya="31 - Oran", description="x")
        self.offre.diplomes_requis.add(self.d_master)
        self.offre.specialites_requises.add(self.spec_info)

    def test_couple_exact_sur_meme_formation_score_plein(self):
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master Informatique", statut="OBTENU",
            diplome_ref=self.d_master, specialite_ref=self.spec_info)
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_d["score"], 1.0)
        self.assertEqual(contrib_s["score"], 1.0)
        self.assertEqual(formation.specialite_ref_id, self.spec_info.id)

    def test_pas_de_fabrication_cross_formation_T10(self):
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master Finance", statut="OBTENU",
            diplome_ref=self.d_master, specialite_ref=self.spec_finance)
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Licence Informatique", statut="OBTENU",
            diplome_ref=self.d_licence, specialite_ref=self.spec_info)
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_d["score"], 0.0)
        self.assertEqual(contrib_s["score"], 1.0)
        self.assertEqual(formation.specialite_ref_id, self.spec_info.id)

    def test_formation_en_cours_non_admissible_par_defaut_S08(self):
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master Informatique", statut="EN_COURS",
            diplome_ref=self.d_master, specialite_ref=self.spec_info)
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_d["score"], 0.0)
        self.assertEqual(contrib_s["score"], 0.0)
        self.assertIsNone(formation)

    def test_aucune_formation_obtenue_est_donnee_manquante(self):
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertFalse(contrib_d["connu"])
        self.assertFalse(contrib_s["connu"])

    def test_offre_sans_couple_accepte_criteres_non_demandes(self):
        self.offre.diplomes_requis.clear()
        self.offre.specialites_requises.clear()
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertIsNone(contrib_d)
        self.assertIsNone(contrib_s)

    def test_T14_offre_sans_diplome_du_tout_ne_penalise_pas(self):
        self.offre.diplomes_requis.clear()
        self.offre.specialites_requises.clear()
        self.offre.diplome = None
        self.offre.save()
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertIsNone(contrib_d)
        self.assertIsNone(contrib_s)

    def test_repli_niveau_profil_sans_formation_detaillee(self):
        """Aucune FormationCandidat, mais `ProfilCandidat.diplome_ref` choisi directement (nouveau
        sélecteur référentiel v2 du haut de profil) — sert de repli pour le diplôme uniquement,
        jamais pour la spécialité (aucune info spécialité à ce niveau)."""
        self.profil.diplome_ref = self.d_master
        self.profil.save()
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_d["score"], 1.0)
        self.assertTrue(contrib_d["connu"])
        self.assertEqual(contrib_d["source"], "niveau_profil")
        self.assertFalse(contrib_s["connu"])  # spécialité toujours donnée manquante
        self.assertIsNone(formation)

    def test_repli_niveau_profil_diplome_non_accepte(self):
        self.profil.diplome_ref = self.d_licence  # offre exige Master, pas Licence
        self.profil.save()
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_d["score"], 0.0)
        self.assertTrue(contrib_d["connu"])  # connu, mais incompatible — pas une donnée manquante
        self.assertEqual(contrib_d["source"], "niveau_profil")

    def test_formation_detaillee_prioritaire_sur_niveau_profil(self):
        """Si une vraie formation OBTENU existe, elle prime toujours sur le niveau déclaré en
        haut du profil — le repli `niveau_profil` ne s'applique que si `formations` est vide."""
        self.profil.diplome_ref = self.d_licence  # incompatible, mais ignoré ici
        self.profil.save()
        FormationCandidat.objects.create(
            profil=self.profil, diplome="Master Informatique", statut="OBTENU",
            diplome_ref=self.d_master, specialite_ref=self.spec_info)
        contrib_d, contrib_s, formation = _score_diplome_specialite(self.profil, self.offre)
        self.assertEqual(contrib_d["score"], 1.0)
        self.assertEqual(contrib_d["source"], "formation")
