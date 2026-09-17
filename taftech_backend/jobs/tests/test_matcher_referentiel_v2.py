"""Tests Phase 4 (17/09/2026) — matcher.py branché sur le référentiel v2 client
(Metier pour la spécialité, couples DiplomeSpecialite pour le diplôme), avec repli
garanti sur l'ancien comportement texte tant que les fiches ne sont pas migrées."""
from django.test import TestCase
from django.contrib.auth import get_user_model

from jobs.matcher import calculer_score_matching, metiers_compatibles
from jobs.models import (
    ProfilEntreprise, OffreEmploi, ProfilCandidat, FormationCandidat,
    GroupeMetier, Metier, TypeDiplome, DomaineFormation, SpecialiteFormation,
    DiplomeSpecialite, OffreDiplomeAccepte,
)

User = get_user_model()


class MetiersCompatiblesTest(TestCase):
    def setUp(self):
        self.groupe_it = GroupeMetier.objects.create(code='G-IT', type_groupe='domaine_source', libelle='Informatique')
        self.groupe_rh = GroupeMetier.objects.create(code='G-RH', type_groupe='domaine_source', libelle='RH')
        self.dev = Metier.objects.create(code='M-DEV', libelle='Développeur web', cle_recherche='developpeur web', groupe_principal=self.groupe_it)
        self.dev_bis = Metier.objects.create(code='M-DEV2', libelle='Développeur logiciel', cle_recherche='developpeur logiciel', groupe_principal=self.groupe_it)
        self.rh = Metier.objects.create(code='M-RH', libelle='Chargé de recrutement', cle_recherche='charge de recrutement', groupe_principal=self.groupe_rh)

    def test_meme_metier_score_maximal(self):
        compat, ratio = metiers_compatibles(self.dev, self.dev)
        self.assertTrue(compat)
        self.assertEqual(ratio, 1.0)

    def test_meme_groupe_score_eleve(self):
        compat, ratio = metiers_compatibles(self.dev, self.dev_bis)
        self.assertTrue(compat)
        self.assertEqual(ratio, 0.85)

    def test_groupe_different_incompatible(self):
        compat, ratio = metiers_compatibles(self.dev, self.rh)
        self.assertFalse(compat)


class MatcherReferentielV2IntegrationTest(TestCase):
    """Utilise de vraies instances (pas des Mock) car le nouveau chemin a besoin de vraies
    relations FK (Metier, FormationCandidat, DiplomeSpecialite) — les 25 tests historiques de
    test_matcher.py restent sur des Mock et vérifient le repli vers l'ancien comportement."""

    def setUp(self):
        self.groupe = GroupeMetier.objects.create(code='G-DEV', type_groupe='domaine_source', libelle='Développement')
        self.metier_offre = Metier.objects.create(code='M-DEV', libelle='Développeur web', cle_recherche='developpeur web', groupe_principal=self.groupe)
        self.metier_candidat_meme = self.metier_offre
        self.metier_candidat_autre = Metier.objects.create(code='M-COMPTA', libelle='Comptable', cle_recherche='comptable')

        self.domaine = DomaineFormation.objects.create(code='D-INFO', libelle='Informatique', systeme='universitaire')
        self.specialite_info = SpecialiteFormation.objects.create(code='SP-INFO', domaine=self.domaine, libelle='Informatique', cle_recherche='informatique')
        self.specialite_finance = SpecialiteFormation.objects.create(code='SP-FIN', domaine=self.domaine, libelle='Finance', cle_recherche='finance')
        self.diplome_master = TypeDiplome.objects.create(code='D-M2', libelle='Master 2', systeme='universitaire')
        self.couple_info = DiplomeSpecialite.objects.create(code='DS-1', diplome=self.diplome_master, specialite=self.specialite_info)
        self.couple_finance = DiplomeSpecialite.objects.create(code='DS-2', diplome=self.diplome_master, specialite=self.specialite_finance)

        rh_user = User.objects.create_user(username='rh_v2', email='rh_v2@test.com', password='pwd', role='RECRUTEUR')
        self.entreprise = ProfilEntreprise.objects.create(user=rh_user, nom_entreprise='TestCo', registre_commerce='RC-V2', est_approuvee=True)
        self.offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre='Développeur', wilaya='16 - Alger', metier=self.metier_offre,
        )

        self.candidat = User.objects.create_user(username='cand_v2', email='cand_v2@test.com', password='pwd', role='CANDIDAT')
        self.profil = ProfilCandidat.objects.create(user=self.candidat, wilaya='16 - Alger')

    def test_metier_identique_score_specialite_maximal(self):
        self.profil.metier = self.metier_candidat_meme
        self.profil.save()
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['specialite'], 25.0)
        self.assertNotIn('specialite', resultat['criteres_manquants'])

    def test_metier_different_incompatible(self):
        self.profil.metier = self.metier_candidat_autre
        self.profil.save()
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['specialite'], 0.0)

    def test_repli_ancien_comportement_si_metier_absent(self):
        """Ni le profil ni l'offre n'ont de Metier v2 renseigné → repli intégral sur
        l'ancienne comparaison texte specialite/secteur, comme avant cette session."""
        self.offre.metier = None
        self.offre.specialite = 'L18'
        self.offre.save()
        self.profil.specialite = 'L18'
        self.profil.save()
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['specialite'], 25.0)

    def test_diplome_couple_exact_score_maximal(self):
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_info)
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Master Informatique',
            diplome_ref=self.diplome_master, specialite_ref=self.specialite_info, statut='OBTENU',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['diplome'], 20.0)

    def test_diplome_et_specialite_de_deux_formations_differentes_pas_combines(self):
        """Règle client explicite : un master en finance + une licence en informatique ne
        doivent jamais être combinés pour simuler un 'master en informatique'."""
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_info)
        # Le candidat a le bon diplôme (Master) mais dans la spécialité Finance — formation
        # SÉPARÉE de toute formation en Informatique.
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Master Finance',
            diplome_ref=self.diplome_master, specialite_ref=self.specialite_finance, statut='OBTENU',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        # Type de diplôme reconnu (Master) mais spécialité différente → score partiel, pas 20.
        self.assertEqual(resultat['details']['diplome'], 12.0)
        self.assertLess(resultat['details']['diplome'], 20.0)

    def test_diplome_non_renseigne_est_donnee_manquante_pas_incompatible(self):
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_info)
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['diplome'], 6.0)
        self.assertIn('diplome', resultat['criteres_manquants'])
        self.assertLess(resultat['completude'], 1.0)

    def test_formation_en_cours_non_comptee_comme_obtenue(self):
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_info)
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Master Informatique (en cours)',
            diplome_ref=self.diplome_master, specialite_ref=self.specialite_info, statut='EN_COURS',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['diplome'], 6.0)
        self.assertIn('diplome', resultat['criteres_manquants'])

    def test_completude_maximale_si_offre_sans_couples_repli_legacy(self):
        """Sans OffreDiplomeAccepte, l'ancien scoring hiérarchique s'applique et n'est jamais
        compté comme 'donnée manquante' côté diplôme (comportement historique inchangé)."""
        self.offre.diplome = None
        self.offre.save()
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertNotIn('diplome', resultat['criteres_manquants'])
