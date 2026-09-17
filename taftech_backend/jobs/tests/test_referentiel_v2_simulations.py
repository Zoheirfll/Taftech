"""Traduit en tests d'intégration les cas fournis par le client dans les onglets
SIMULATIONS (TAFTECH_Metiers_Matching_v2.xlsx) et RECETTE (les deux classeurs) —
session 17/09/2026, suite des Phases 1-5 du référentiel v2.

Portée assumée : SIMULATIONS modélise un score de façon abstraite (une "satisfaction"
continue par critère, ex. 0.5 = moitié du minimum d'expérience) alors que notre
implémentation réelle (jobs/matcher.py) utilise des paliers de confiance discrets
(20/12/6/0 pour l'expérience, par exemple) — hérités de sessions précédentes, non
retouchés ici. Les cas EX-01/02/03/04/06 tombent exactement sur un palier de notre
implémentation et sont vérifiés au score exact ; EX-05 (mi-expérience) est vérifié
de façon directionnelle (score entre le cas complet et le cas nul), le palier ne
permettant pas de reproduire une valeur continue à 90/100 pile.

RECETTE : seuls les cas testables sans reproduire l'intégralité du référentiel (les
~13 000 lignes réelles ne sont pas importées dans la base de test, seule la commande
d'import les charge en dev) sont traduits, avec des fiches/appellations synthétiques
qui reproduisent la structure du cas (redirection, granularité fiche_groupe, absence
d'expansion sémantique) — T06/T07 (normalisation de clé, déjà pré-calculée dans les
colonnes cle_recherche du fichier client) et T01/T08/T09/T19 (règles de saisie
admin/données, pas de comportement de code à vérifier) ne sont pas repris ici.
"""
import datetime

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from jobs.matcher import calculer_score_matching
from jobs.models import (
    ProfilEntreprise, OffreEmploi, ProfilCandidat, ExperienceCandidat, FormationCandidat,
    GroupeMetier, Metier, Appellation, TypeDiplome, DomaineFormation, SpecialiteFormation,
    DiplomeSpecialite, OffreDiplomeAccepte,
)

User = get_user_model()


def _il_y_a(annees_flottant):
    return datetime.date.today() - datetime.timedelta(days=int(annees_flottant * 365.25))


class SimulationsMatchingTest(TestCase):
    """SIMULATIONS (fichier métiers) — poids PARAM_MATCHING : région 20 / diplôme 20 /
    spécialité 25 / expérience 20 / compétences 15. Chemin legacy (texte) volontairement
    utilisé ici (pas de Metier v2 sur le profil/l'offre) — déjà couvert au niveau Metier
    précis par test_matcher_referentiel_v2.py."""

    def _offre(self, **overrides):
        defaults = dict(
            titre="Développeur", wilaya="31 - Oran", commune="Bir El Djir",
            specialite="L18", diplome="MASTER_2", experience_requise="CONFIRME",
            profil_recherche="react python django",
        )
        defaults.update(overrides)
        return OffreEmploi.objects.create(entreprise=self.entreprise, **defaults)

    def _profil_complet(self, user, **overrides):
        defaults = dict(
            wilaya="31 - Oran", commune="Bir El Djir", specialite="L18", diplome="MASTER_2",
            competences="react, python, django",
        )
        defaults.update(overrides)
        profil = ProfilCandidat.objects.create(user=user, **defaults)
        ExperienceCandidat.objects.create(
            profil=profil, titre_poste="Développeur", entreprise="TestCo", secteur="L18",
            date_debut=_il_y_a(4), date_fin=None,
        )
        return profil

    def setUp(self):
        rh = User.objects.create_user(username='rh_sim', email='rh_sim@test.com', password='pwd', role='RECRUTEUR')
        self.entreprise = ProfilEntreprise.objects.create(user=rh, nom_entreprise='SimCo', registre_commerce='RC-SIM', est_approuvee=True)

    def _candidat(self, username, **profil_overrides):
        user = User.objects.create_user(username=username, email=f'{username}@test.com', password='pwd', role='CANDIDAT')
        self._profil_complet(user, **profil_overrides)
        return user

    def test_ex01_correspondance_complete(self):
        offre = self._offre()
        candidat = self._candidat('ex01')
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 100.0)
        self.assertEqual(resultat['completude'], 1.0)

    def test_ex02_competences_absentes_reste_satisfait(self):
        """Compétences demandées absentes, mais champ renseigné (connu=1, satisfait=0) —
        distinct du cas 'non renseigné' qui donnerait un score neutre 5/15."""
        offre = self._offre()
        candidat = self._candidat('ex02', competences='cobol, fortran')
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 85.0)
        self.assertEqual(resultat['completude'], 1.0)
        self.assertNotIn('competences', resultat['criteres_manquants'])

    def test_ex03_specialite_differente_explicitement_renseignee(self):
        offre = self._offre()
        candidat = self._candidat('ex03', specialite='M11')
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 75.0)
        self.assertEqual(resultat['completude'], 1.0)
        self.assertNotIn('specialite', resultat['criteres_manquants'])

    def test_ex04_diplome_et_specialite_inconnus(self):
        offre = self._offre()
        candidat = self._candidat('ex04', diplome=None, specialite=None)
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 55.0)
        self.assertEqual(resultat['completude'], 0.55)
        self.assertIn('diplome', resultat['criteres_manquants'])
        self.assertIn('specialite', resultat['criteres_manquants'])

    def test_ex05_experience_partielle_score_intermediaire(self):
        """Palier discret (pas de valeur continue) : vérifié directionnellement — un
        candidat à mi-expérience score strictement entre le cas complet (100) et le
        cas sans aucune expérience pertinente."""
        offre = self._offre()
        candidat_complet = self._candidat('ex05_complet')
        candidat_partiel = self._candidat('ex05_partiel')
        ExperienceCandidat.objects.filter(profil=candidat_partiel.profil_candidat).update(
            date_debut=_il_y_a(1.5),
        )
        candidat_absent = self._candidat('ex05_absent')
        ExperienceCandidat.objects.filter(profil=candidat_absent.profil_candidat).delete()

        score_complet = calculer_score_matching(candidat_complet, offre)['total']
        score_partiel = calculer_score_matching(candidat_partiel, offre)['total']
        score_absent = calculer_score_matching(candidat_absent, offre)['total']

        self.assertEqual(score_complet, 100.0)
        self.assertLess(score_partiel, score_complet)
        self.assertLess(score_absent, score_partiel)

    def test_ex06_mobilite_incompatible_declaree(self):
        """Wilaya explicitement renseignée mais éloignée, sans mobilité déclarée —
        donnée connue (pas manquante), simplement incompatible."""
        offre = self._offre()
        candidat = self._candidat('ex06', wilaya='01 - Adrar', commune='Adrar', mobilite=None)
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 80.0)
        self.assertEqual(resultat['completude'], 1.0)
        self.assertNotIn('region', resultat['criteres_manquants'])


class RecetteMetiersRechercheTest(TestCase):
    """RECETTE (fichier métiers) — cas de recherche testables avec des fiches
    synthétiques reproduisant la structure du cas réel (redirection, granularité,
    absence d'expansion sémantique)."""

    def setUp(self):
        self.client = APIClient()

    def _search(self, texte):
        return self.client.get(f'/api/jobs/referentiel/metiers/?search={texte}').data

    def test_t02_sigle_exact_daf(self):
        """Sigle exact — jamais de correction floue sur un sigle court."""
        groupe = GroupeMetier.objects.create(code='G-DAF', type_groupe='domaine_source', libelle='Direction')
        metier = Metier.objects.create(code='TAF2-DAF', libelle='Directeur administratif et financier', cle_recherche='directeur administratif et financier', groupe_principal=groupe)
        Appellation.objects.create(code='APP-DAF', metier=metier, libelle='DAF', cle_recherche='daf')
        resultats = self._search('DAF')
        self.assertTrue(any(r['metier_id'] == metier.pk for r in resultats))

    def test_t03_redirection_resolue_vers_canonique(self):
        """Ancien code (redirection_equivalente) résolu automatiquement vers le métier
        canonique (R04) — jamais un doublon affiché."""
        fullstack = Metier.objects.create(code='TAF000001', libelle='Développeur fullstack', cle_recherche='developpeur fullstack')
        Appellation.objects.create(code='APP-FS-1', metier=fullstack, libelle='Développeur fullstack', cle_recherche='developpeur fullstack')
        ancien = Metier.objects.create(
            code='TAF-000013', libelle='Développeur fullstack (ancien)', cle_recherche='developpeur fullstack ancien',
            metier_canonique=fullstack,
        )
        Appellation.objects.create(code='APP-FS-2', metier=ancien, libelle='Développeur fullstack', cle_recherche='developpeur fullstack')
        resultats = self._search('developpeur fullstack')
        metier_ids = {r['metier_id'] for r in resultats}
        self.assertEqual(metier_ids, {fullstack.pk})

    def test_t04_mobile_presente_android_et_ios_separement(self):
        """Ne jamais attribuer iOS à un candidat Android — les deux métiers distincts
        doivent tous les deux apparaître, jamais fusionnés."""
        android = Metier.objects.create(code='M-AND', libelle='Développeur mobile Android', cle_recherche='developpeur mobile android')
        ios = Metier.objects.create(code='M-IOS', libelle='Développeur mobile iOS', cle_recherche='developpeur mobile ios')
        Appellation.objects.create(code='APP-AND', metier=android, libelle='Développeur mobile Android', cle_recherche='developpeur mobile android')
        Appellation.objects.create(code='APP-IOS', metier=ios, libelle='Développeur mobile iOS', cle_recherche='developpeur mobile ios')
        resultats = self._search('developpeur mobile')
        metier_ids = {r['metier_id'] for r in resultats}
        self.assertEqual(metier_ids, {android.pk, ios.pk})

    def test_t05_commercial_sans_expansion_vers_developpeur(self):
        """Aucune expansion sémantique automatique — chercher 'commercial' ne doit
        jamais faire remonter un métier de développement logiciel."""
        commercial = Metier.objects.create(code='M-COM', libelle='Commercial', cle_recherche='commercial')
        dev = Metier.objects.create(code='M-DEV', libelle='Développeur logiciel', cle_recherche='developpeur logiciel')
        Appellation.objects.create(code='APP-COM', metier=commercial, libelle='Commercial', cle_recherche='commercial')
        Appellation.objects.create(code='APP-DEV', metier=dev, libelle='Développeur logiciel', cle_recherche='developpeur logiciel')
        resultats = self._search('commercial')
        metier_ids = {r['metier_id'] for r in resultats}
        self.assertIn(commercial.pk, metier_ids)
        self.assertNotIn(dev.pk, metier_ids)


class RecetteDiplomesTest(TestCase):
    """RECETTE (fichier diplômes) — cas déjà couverts fonctionnellement par
    test_matcher_referentiel_v2.py (T10, T11) : reproduits ici sous leur identifiant
    RECETTE d'origine pour la traçabilité avec le document client."""

    def setUp(self):
        self.domaine = DomaineFormation.objects.create(
            code='D-INFO-R', libelle='Informatique', systeme='universitaire',
        )
        self.specialite_info = SpecialiteFormation.objects.create(code='SP-INFO-R', domaine=self.domaine, libelle='Informatique', cle_recherche='informatique')
        self.specialite_finance = SpecialiteFormation.objects.create(code='SP-FIN-R', domaine=self.domaine, libelle='Finance', cle_recherche='finance')
        self.diplome_master = TypeDiplome.objects.create(code='D-M2-R', libelle='Master 2', systeme='universitaire')
        self.couple_info = DiplomeSpecialite.objects.create(code='DS-R1', diplome=self.diplome_master, specialite=self.specialite_info)

        rh = User.objects.create_user(username='rh_recette', email='rh_recette@test.com', password='pwd', role='RECRUTEUR')
        self.entreprise = ProfilEntreprise.objects.create(user=rh, nom_entreprise='RecetteCo', registre_commerce='RC-RECETTE', est_approuvee=True)
        self.offre = OffreEmploi.objects.create(entreprise=self.entreprise, titre='Développeur', wilaya='16 - Alger')
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_info)

        self.candidat = User.objects.create_user(username='cand_recette', email='cand_recette@test.com', password='pwd', role='CANDIDAT')
        self.profil = ProfilCandidat.objects.create(user=self.candidat, wilaya='16 - Alger')

    def test_t10_pas_de_master_informatique_fabrique(self):
        """RECETTE T10 : 'master finance obtenu' + 'licence informatique obtenue' ne
        doivent jamais constituer un 'master en informatique' accepté."""
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Master Finance',
            diplome_ref=self.diplome_master, specialite_ref=self.specialite_finance, statut='OBTENU',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertLess(resultat['details']['diplome'], 20.0)

    def test_t11_formation_en_cours_non_comptee_obtenue(self):
        """RECETTE T11 : un diplôme en cours ne doit jamais être compté comme obtenu."""
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Master Informatique (en cours)',
            diplome_ref=self.diplome_master, specialite_ref=self.specialite_info, statut='EN_COURS',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertNotEqual(resultat['details']['diplome'], 20.0)
