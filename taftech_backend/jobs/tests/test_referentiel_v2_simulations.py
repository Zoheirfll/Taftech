"""Traduit en tests d'intégration les cas fournis par le client dans les onglets
SIMULATIONS (TAFTECH_Metiers_Matching_v2.xlsx) et RECETTE (les deux classeurs) —
session 17/09/2026, réécrit session 21/09/2026 pour la mise en conformité S01-S14
(voir docs/superpowers/plans/2026-09-21-matching-referentiel-v2-conformite.md) :
le critère "spécialité" (poids 0.25) est désormais la spécialité de FORMATION
(`SpecialiteFormation`, couplée au diplôme sur une même `FormationCandidat`, S06/S07)
et non plus le métier/poste — conforme à PARAM_MATCHING ("spécialité... couplée au
diplôme sur le même enregistrement candidat"). La formule est désormais une somme
pondérée dynamique (S01/S02, `jobs.matcher._composer_score`), plus des paliers fixes
sur 100 points — les 6 cas SIMULATIONS sont donc vérifiés au score EXACT, y compris
EX-05 (expérience continue S09, plus de vérification seulement directionnelle).

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
    DiplomeSpecialite, OffreDiplomeAccepte, CompetenceOffre,
)

User = get_user_model()


def _il_y_a(annees_flottant):
    return datetime.date.today() - datetime.timedelta(days=int(annees_flottant * 365.25))


class SimulationsMatchingTest(TestCase):
    """SIMULATIONS (fichier métiers) — poids PARAM_MATCHING : région 20 / diplôme 20 /
    spécialité (formation) 25 / expérience 20 / compétences 15. `metier` reste renseigné
    sur profil/offre/expérience (utilisé par `_experience_pertinente` pour juger la
    pertinence d'une expérience) mais n'est plus lui-même un critère noté séparément."""

    def _offre(self, **overrides):
        defaults = dict(
            titre="Développeur", wilaya="31 - Oran", commune="Bir El Djir",
            metier=self.metier_dev, experience_requise="CONFIRME",
        )
        defaults.update(overrides)
        offre = OffreEmploi.objects.create(entreprise=self.entreprise, **defaults)
        OffreDiplomeAccepte.objects.create(offre=offre, couple=self.couple_master_info)
        CompetenceOffre.objects.create(offre=offre, label="React", type_exigence="OBLIGATOIRE")
        return offre

    def _profil_complet(self, user, formation_couple=None, **overrides):
        defaults = dict(wilaya="31 - Oran", commune="Bir El Djir", metier=self.metier_dev, competences="React, Python")
        defaults.update(overrides)
        profil = ProfilCandidat.objects.create(user=user, **defaults)
        ExperienceCandidat.objects.create(
            profil=profil, titre_poste="Développeur", entreprise="TestCo", metier=self.metier_dev,
            date_debut=_il_y_a(4), date_fin=None,
        )
        if formation_couple is not False:
            diplome_ref, specialite_ref = formation_couple or (self.diplome_master, self.specialite_info)
            FormationCandidat.objects.create(
                profil=profil, diplome="Formation", diplome_ref=diplome_ref,
                specialite_ref=specialite_ref, statut="OBTENU",
            )
        return profil

    def setUp(self):
        rh = User.objects.create_user(username='rh_sim', email='rh_sim@test.com', password='pwd', role='RECRUTEUR')
        self.entreprise = ProfilEntreprise.objects.create(user=rh, nom_entreprise='SimCo', registre_commerce='RC-SIM', est_approuvee=True)
        groupe_dev = GroupeMetier.objects.create(code='G-SIM-DEV', type_groupe='domaine_source', libelle='Informatique')
        self.metier_dev = Metier.objects.create(code='M-SIM-DEV', libelle='Développeur', cle_recherche='developpeur', groupe_principal=groupe_dev)

        self.domaine = DomaineFormation.objects.create(code='D-SIM', libelle='Informatique', systeme='universitaire')
        self.specialite_info = SpecialiteFormation.objects.create(code='SP-SIM-INFO', domaine=self.domaine, libelle='Informatique', cle_recherche='informatique')
        self.specialite_finance = SpecialiteFormation.objects.create(code='SP-SIM-FIN', domaine=self.domaine, libelle='Finance', cle_recherche='finance')
        self.diplome_master = TypeDiplome.objects.create(code='D-SIM-M2', libelle='Master 2', systeme='universitaire')
        self.couple_master_info = DiplomeSpecialite.objects.create(code='DS-SIM-1', diplome=self.diplome_master, specialite=self.specialite_info)

    def _candidat(self, username, formation_couple=None, **profil_overrides):
        user = User.objects.create_user(username=username, email=f'{username}@test.com', password='pwd', role='CANDIDAT')
        self._profil_complet(user, formation_couple=formation_couple, **profil_overrides)
        return user

    def test_ex01_correspondance_complete(self):
        offre = self._offre()
        candidat = self._candidat('ex01')
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 100.0)
        self.assertEqual(resultat['completude'], 1.0)

    def test_ex02_competences_absentes_reste_satisfait(self):
        """Compétences demandées absentes, mais champ renseigné (connu=1, satisfait=0) —
        distinct du cas 'non renseigné' qui donnerait un critère non demandé/manquant."""
        offre = self._offre()
        candidat = self._candidat('ex02', competences='cobol, fortran')
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 85.0)
        self.assertEqual(resultat['completude'], 1.0)
        self.assertNotIn('competences', resultat['criteres_manquants'])

    def test_ex03_specialite_differente_explicitement_renseignee(self):
        """Même diplôme (Master) accepté, mais spécialité Finance au lieu d'Informatique —
        diplome=1 (type accepté), specialite=0 (spécialité différente, S06 binaire strict)."""
        offre = self._offre()
        candidat = self._candidat('ex03', formation_couple=(self.diplome_master, self.specialite_finance))
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 75.0)
        self.assertEqual(resultat['completude'], 1.0)
        self.assertNotIn('specialite', resultat['criteres_manquants'])

    def test_ex04_diplome_et_specialite_inconnus(self):
        """Candidat sans aucune FormationCandidat obtenue référencée — diplôme ET
        spécialité de formation inconnus (donnée manquante, pas incompatible)."""
        offre = self._offre()
        candidat = self._candidat('ex04', formation_couple=False)
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 55.0)
        self.assertEqual(resultat['completude'], 0.55)
        self.assertIn('diplome', resultat['criteres_manquants'])
        self.assertIn('specialite', resultat['criteres_manquants'])

    def test_ex05_experience_a_moitie_du_minimum_score_exact(self):
        """S09 continu : expérience pertinente à exactement la moitié du minimum requis
        (CONFIRME = 3 ans, ici 1.5 an) -> s_experience=0.5 pile, score EXACT 90 (plus
        seulement vérifié directionnellement comme avant la mise en conformité S09)."""
        offre = self._offre()
        candidat = self._candidat('ex05')
        ExperienceCandidat.objects.filter(profil=candidat.profil_candidat).update(date_debut=_il_y_a(1.5))
        resultat = calculer_score_matching(candidat, offre)
        self.assertAlmostEqual(resultat['total'], 90.0, places=1)
        self.assertEqual(resultat['completude'], 1.0)

    def test_ex06_mobilite_incompatible_declaree(self):
        """Wilaya explicitement renseignée mais éloignée, sans mobilité déclarée —
        donnée connue (pas manquante), simplement incompatible (région binaire S04)."""
        offre = self._offre()
        candidat = self._candidat('ex06', wilaya='01 - Adrar', commune='Adrar', mobilite=None)
        resultat = calculer_score_matching(candidat, offre)
        self.assertEqual(resultat['total'], 80.0)
        self.assertEqual(resultat['completude'], 1.0)
        self.assertNotIn('region', resultat['criteres_manquants'])


class RecetteExperienceChevauchementTest(TestCase):
    """RECETTE T13 — deux périodes qui se chevauchent partiellement doivent être fusionnées
    avant de sommer (18 mois réels dans l'exemple client, jamais 24 = somme naïve des deux
    périodes prises séparément)."""

    def setUp(self):
        rh = User.objects.create_user(username='rh_t13', email='rh_t13@test.com', password='pwd', role='RECRUTEUR')
        self.entreprise = ProfilEntreprise.objects.create(user=rh, nom_entreprise='T13Co', registre_commerce='RC-T13', est_approuvee=True)
        groupe = GroupeMetier.objects.create(code='G-T13', type_groupe='domaine_source', libelle='Informatique')
        self.metier = Metier.objects.create(code='M-T13', libelle='Développeur', cle_recherche='developpeur', groupe_principal=groupe)
        self.offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre='Développeur', wilaya='16 - Alger',
            metier=self.metier, experience_requise='DEBUTANT',
        )
        user = User.objects.create_user(username='cand_t13', email='cand_t13@test.com', password='pwd', role='CANDIDAT')
        self.profil = ProfilCandidat.objects.create(user=user, wilaya='16 - Alger', metier=self.metier)
        self.candidat = user

    def test_periodes_chevauchantes_fusionnees_pas_sommees_naivement(self):
        # [2024-01, 2024-12] (12 mois) + [2024-07, 2025-06] (12 mois), 6 mois de recouvrement
        # -> ~18 mois réels attendus, jamais 24 (somme naïve des deux périodes séparées).
        ExperienceCandidat.objects.create(
            profil=self.profil, titre_poste='Développeur', entreprise='A', metier=self.metier,
            date_debut=datetime.date(2024, 1, 1), date_fin=datetime.date(2024, 12, 31),
        )
        ExperienceCandidat.objects.create(
            profil=self.profil, titre_poste='Développeur', entreprise='B', metier=self.metier,
            date_debut=datetime.date(2024, 7, 1), date_fin=datetime.date(2025, 6, 30),
        )
        # Score DEBUTANT (seuil bas) ne distingue pas 18 mois de 24 — on vérifie directement
        # la fonction de fusion des périodes, pas seulement le score global.
        calculer_score_matching(self.candidat, self.offre)
        from jobs.matcher import _deduire_annees_sans_chevauchement
        annees = _deduire_annees_sans_chevauchement([
            (datetime.date(2024, 1, 1), datetime.date(2024, 12, 31), 1.0),
            (datetime.date(2024, 7, 1), datetime.date(2025, 6, 30), 1.0),
        ])
        mois = annees * 12
        self.assertGreater(mois, 15)  # nettement plus que 12 (une seule période)
        self.assertLess(mois, 20)     # nettement moins que 24 (somme naïve sans fusion)


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
        self.diplome_licence = TypeDiplome.objects.create(code='D-LIC-R', libelle='Licence', systeme='universitaire')
        self.couple_info = DiplomeSpecialite.objects.create(code='DS-R1', diplome=self.diplome_master, specialite=self.specialite_info)

        rh = User.objects.create_user(username='rh_recette', email='rh_recette@test.com', password='pwd', role='RECRUTEUR')
        self.entreprise = ProfilEntreprise.objects.create(user=rh, nom_entreprise='RecetteCo', registre_commerce='RC-RECETTE', est_approuvee=True)
        self.offre = OffreEmploi.objects.create(entreprise=self.entreprise, titre='Développeur', wilaya='16 - Alger')
        OffreDiplomeAccepte.objects.create(offre=self.offre, couple=self.couple_info)

        self.candidat = User.objects.create_user(username='cand_recette', email='cand_recette@test.com', password='pwd', role='CANDIDAT')
        self.profil = ProfilCandidat.objects.create(user=self.candidat, wilaya='16 - Alger')

    def test_t10_pas_de_master_informatique_fabrique(self):
        """RECETTE T10 : 'master finance obtenu' + 'licence informatique obtenue' ne
        doivent jamais constituer un 'master en informatique' accepté — S07 choisit la
        meilleure FORMATION (licence-informatique, specialite seule 0.25) sans jamais
        combiner le diplôme de l'une (master) avec la spécialité de l'autre (informatique)
        pour fabriquer un score de 45 pts qui n'existe sur aucune formation réelle."""
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Master Finance',
            diplome_ref=self.diplome_master, specialite_ref=self.specialite_finance, statut='OBTENU',
        )
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Licence Informatique',
            diplome_ref=self.diplome_licence, specialite_ref=self.specialite_info, statut='OBTENU',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['specialite'], 25.0)
        self.assertEqual(resultat['details']['diplome'], 0.0)

    def test_t11_formation_en_cours_non_comptee_obtenue(self):
        """RECETTE T11 : un diplôme en cours ne doit jamais être compté comme obtenu."""
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Master Informatique (en cours)',
            diplome_ref=self.diplome_master, specialite_ref=self.specialite_info, statut='EN_COURS',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertNotEqual(resultat['details']['diplome'], 20.0)

    def test_t14_critere_diplome_non_demande_non_penalise(self):
        """RECETTE T14 : l'offre ne précise aucune exigence de diplôme (ni couples
        acceptés, ni niveau minimum) -> le poids diplôme ne doit pénaliser personne,
        et ne doit pas être compté comme une donnée manquante côté candidat (rien
        n'était demandé)."""
        offre_ouverte = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre='Développeur ouvert', wilaya='16 - Alger', diplome='',
        )
        resultat = calculer_score_matching(self.candidat, offre_ouverte)
        # S01 : critère non demandé -> exclu du calcul (0.0 affiché, pas de contribution),
        # jamais un score de 20/20 "offert" pour une exigence qui n'existe pas (S05/F06).
        self.assertEqual(resultat['details']['diplome'], 0.0)
        self.assertNotIn('diplome', resultat['criteres_manquants'])
        self.assertIn('diplome', resultat['criteres_non_demandes'])

    def test_t22_diplome_autre_traite_comme_donnee_manquante(self):
        """RECETTE T22 : un candidat ayant choisi 'Autre, préciser' (diplome_ref = D-AUTRE)
        n'a pas fourni de type exploitable -> traité comme donnée manquante (0, signalé),
        jamais comme une vraie incompatibilité, et surtout jamais un score supérieur
        implicite par rapport à ne rien avoir déclaré du tout."""
        diplome_autre = TypeDiplome.objects.create(code='D-AUTRE', libelle='Autre diplôme à préciser', systeme='autre')
        FormationCandidat.objects.create(
            profil=self.profil, diplome='Certificat maison non catalogué',
            diplome_ref=diplome_autre, statut='OBTENU',
        )
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['diplome'], 0.0)
        self.assertIn('diplome', resultat['criteres_manquants'])

    def test_t15_diplome_candidat_inconnu_contribution_nulle(self):
        """RECETTE T15 : l'offre exige un couple diplôme+spécialité précis, mais le
        candidat n'a AUCUNE formation référencée (diplome_ref) obtenue -> contribution
        diplôme nulle (0, jamais un crédit partiel inventé) et couverture réduite via
        'criteres_manquants' -- pas de renormalisation qui gonflerait artificiellement
        le score sur les autres critères."""
        # Aucune FormationCandidat créée pour self.profil -> diplôme totalement inconnu.
        resultat = calculer_score_matching(self.candidat, self.offre)
        self.assertEqual(resultat['details']['diplome'], 0.0)
        self.assertIn('diplome', resultat['criteres_manquants'])
