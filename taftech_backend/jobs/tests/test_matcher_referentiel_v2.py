"""Tests Phase 4 (17/09/2026) — matcher.py branché sur le référentiel v2 client.
Réécrit session 21/09/2026 (mise en conformité S01-S14) : le critère noté "spécialité"
(poids 0.25) est désormais la spécialité de FORMATION (`SpecialiteFormation`, couplée
au diplôme sur une même `FormationCandidat` — S06/S07), pas le métier/poste — voir
`test_matcher_diplome_specialite_s07.py` pour la couverture complète de ce critère.
`Metier` (comparé ici via `metiers_compatibles()`) reste utilisé, mais uniquement comme
signal de pertinence d'une expérience passée (`_experience_pertinente`), plus comme
critère noté séparément dans le score total."""
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

    def test_metier_ne_pese_plus_sur_le_critere_specialite(self):
        """Un métier identique/différent/absent n'a plus aucun effet sur le critère noté
        "spécialité" (désormais la spécialité de formation) — seul un couple
        DiplomeSpecialite via OffreDiplomeAccepte le fait varier (voir les tests diplôme/
        spécialité plus bas). Sans couple accepté sur l'offre, le critère est non demandé."""
        for metier_candidat in (self.metier_candidat_meme, self.metier_candidat_autre, None):
            self.profil.metier = metier_candidat
            self.profil.save()
            resultat = calculer_score_matching(self.candidat, self.offre)
            self.assertEqual(resultat['details']['specialite'], 0.0)
            self.assertIn('specialite', resultat['criteres_non_demandes'])
            self.assertNotIn('specialite', resultat['criteres_manquants'])

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
        # S07 : diplôme et spécialité sont deux critères pondérés indépendants — le type de
        # diplôme (Master) est bien reconnu (20/20, poids 0.20), mais la spécialité de
        # formation ne correspond pas à celle acceptée (0/25, poids 0.25) : jamais un "master
        # en informatique" fabriqué en combinant le diplôme de cette formation avec la
        # spécialité d'une autre.
        self.assertEqual(resultat['details']['diplome'], 20.0)
        self.assertEqual(resultat['details']['specialite'], 0.0)

    def test_diplome_non_renseigne_est_donnee_manquante_pas_incompatible(self):
        # RECETTE T15 : contribution NULLE (0.0, jamais un crédit partiel inventé) quand le
        # diplôme du candidat est totalement inconnu — corrigé session 18/09/2026, un ancien
        # `6.0` ici contredisait directement ce cas de recette client.
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_info)
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['diplome'], 0.0)
        self.assertIn('diplome', resultat['criteres_manquants'])
        self.assertLess(resultat['completude'], 1.0)

    def test_formation_en_cours_non_comptee_comme_obtenue(self):
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_info)
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Master Informatique (en cours)',
            diplome_ref=self.diplome_master, specialite_ref=self.specialite_info, statut='EN_COURS',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['diplome'], 0.0)
        self.assertIn('diplome', resultat['criteres_manquants'])

    def test_diplome_non_demande_sans_couples_jamais_donnee_manquante(self):
        """Sans OffreDiplomeAccepte (F06 : le recruteur définit explicitement la liste, pas
        de repli hiérarchique implicite depuis session 21/09/2026), le critère diplôme est
        exclu du calcul (non demandé, S01) — jamais compté comme 'donnée manquante' côté
        candidat, puisque rien n'a été demandé par l'offre."""
        self.offre.diplome = None
        self.offre.save()
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertNotIn('diplome', resultat['criteres_manquants'])
        self.assertIn('diplome', resultat['criteres_non_demandes'])
