# -*- coding: utf-8 -*-
"""Consolidation du référentiel v2 (27/09/2026, jobs/referentiel_fusions.py) :
- un import sur base vierge doit reproduire EXACTEMENT l'état consolidé (instantané versionné)
  et le rester au réimport — sinon toute fusion est silencieusement annulée ;
- la fusion de spécialités repointe candidats/offres/relations sans rien perdre ;
- la fusion de groupes ne crée jamais de cycle de redirection métier ;
- regrouper deux métiers ne fait jamais baisser leur score de matching."""
import json
import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from jobs.matcher import metiers_compatibles
from jobs.models import (
    DiplomeSpecialite, DomaineFormation, FormationCandidat, GroupeMetier, Metier, OffreEmploi,
    ProfilCandidat, ProfilEntreprise, RelationSpecialite, SpecialiteFormation, TypeDiplome,
)
from jobs.referentiel_fusions import (
    CHEMIN_INSTANTANE, SPECIALITES_FUSIONS, _Journal, _fusionner_groupe, _fusionner_specialite,
    calculer_instantane,
)

User = get_user_model()


class ImportReproduitConsolidationTest(TestCase):
    def setUp(self):
        base = str(settings.BASE_DIR)
        self.diplomes = os.path.join(base, "TAFTECH_Diplomes_Specialites_Algerie_v2.xlsx")
        self.metiers = os.path.join(base, "TAFTECH_Metiers_Matching_v2.xlsx")
        if not (os.path.exists(self.diplomes) and os.path.exists(self.metiers)):
            self.skipTest("Classeurs référentiel v2 absents de cet environnement.")

    def _importer(self):
        call_command("import_referentiel_v2", diplomes=self.diplomes, metiers=self.metiers, stdout=open(os.devnull, "w"))

    def _verifier_etat_consolide(self):
        import openpyxl
        with open(CHEMIN_INSTANTANE, encoding="utf-8") as f:
            attendu = json.load(f)
        wb = openpyxl.load_workbook(self.metiers, read_only=True, data_only=True)
        self.assertEqual(calculer_instantane(wb), attendu)

        self.assertEqual(GroupeMetier.objects.filter(type_groupe="secteur_source").count(), 45)
        self.assertFalse(GroupeMetier.objects.filter(parent__isnull=True).exclude(type_groupe="secteur_source").exists())
        self.assertFalse(Metier.objects.filter(groupe_principal__isnull=True).exists())
        self.assertFalse(SpecialiteFormation.objects.filter(code__in=[d for d, _ in SPECIALITES_FUSIONS]).exists())
        self.assertEqual(SpecialiteFormation.objects.count(), 921)
        for m in Metier.objects.filter(metier_canonique__isnull=False).select_related("metier_canonique"):
            self.assertIn(m.metier_canonique.metier_canonique_id, (None, m.metier_canonique_id), m.code)

    def test_import_vierge_puis_reimport(self):
        self._importer()
        self._verifier_etat_consolide()
        # Électrotechnique : une seule fiche, qui porte ses trois niveaux de diplôme.
        electro = SpecialiteFormation.objects.get(code="FP-ELE1202")
        self.assertEqual(set(electro.diplomes_lies.values_list("diplome__code", flat=True)), {"D-CMP", "D-BT", "D-BTS"})
        self._importer()
        self._verifier_etat_consolide()


class FusionSpecialiteTest(TestCase):
    def setUp(self):
        dom = DomaineFormation.objects.create(code="DF-T", libelle="Domaine test")
        self.cap = TypeDiplome.objects.create(code="D-CAP-T", libelle="CAP")
        self.bts = TypeDiplome.objects.create(code="D-BTS-T", libelle="BTS")
        self.cible = SpecialiteFormation.objects.create(code="SP-C", domaine=dom, libelle="Banque", cle_recherche="banque")
        self.doublon = SpecialiteFormation.objects.create(code="SP-D", domaine=dom, libelle="Banque", cle_recherche="banque")
        self.autre = SpecialiteFormation.objects.create(code="SP-A", domaine=dom, libelle="Finance", cle_recherche="finance")
        DiplomeSpecialite.objects.create(code="L1", diplome=self.cap, specialite=self.cible)
        DiplomeSpecialite.objects.create(code="L2", diplome=self.bts, specialite=self.doublon)
        DiplomeSpecialite.objects.create(code="L3", diplome=self.cap, specialite=self.doublon)
        RelationSpecialite.objects.create(specialite_depart=self.doublon, specialite_arrivee=self.cible)
        RelationSpecialite.objects.create(specialite_depart=self.doublon, specialite_arrivee=self.autre)
        user = User.objects.create_user(username="c", email="c@t.dz", password="x", role="CANDIDAT")
        profil = ProfilCandidat.objects.get_or_create(user=user)[0]
        self.formation = FormationCandidat.objects.create(profil=profil, diplome="BTS Banque", specialite_ref=self.doublon)
        rec = User.objects.create_user(username="r", email="r@t.dz", password="x", role="RECRUTEUR")
        ent = ProfilEntreprise.objects.create(user=rec, nom_entreprise="E", registre_commerce="RC1")
        self.offre = OffreEmploi.objects.create(entreprise=ent, titre="Chargé", wilaya="Oran", description="d")
        self.offre.specialites_requises.add(self.doublon)

    def test_tout_est_repointe_sans_perte(self):
        _fusionner_specialite(self.doublon, self.cible, _Journal())
        self.assertFalse(SpecialiteFormation.objects.filter(code="SP-D").exists())
        self.assertEqual(set(self.cible.diplomes_lies.values_list("diplome__code", flat=True)), {"D-CAP-T", "D-BTS-T"})
        self.formation.refresh_from_db()
        self.assertEqual(self.formation.specialite_ref_id, self.cible.pk)
        self.assertEqual(list(self.offre.specialites_requises.all()), [self.cible])
        # relation doublon<->cible devenue réflexive : supprimée ; doublon->autre : repointée
        self.assertEqual(list(RelationSpecialite.objects.values_list("specialite_depart_id", "specialite_arrivee_id")),
                         [(self.cible.pk, self.autre.pk)])


class FusionGroupeSansCycleTest(TestCase):
    def test_redirection_existante_inverse_ne_cree_pas_de_cycle(self):
        secteur = GroupeMetier.objects.create(code="S", type_groupe="secteur_source", libelle="Achats")
        a = GroupeMetier.objects.create(code="A", type_groupe="domaine_source", libelle="Achats", parent=secteur)
        b = GroupeMetier.objects.create(code="B", type_groupe="domaine_source", libelle="Achats bis", parent=secteur)
        canon = Metier.objects.create(code="M1", libelle="Acheteur", cle_recherche="acheteur", groupe_principal=a)
        redirige = Metier.objects.create(code="M2", libelle="Acheteur", cle_recherche="acheteur", groupe_principal=b, metier_canonique=canon)
        _fusionner_groupe(a, b, _Journal())
        canon.refresh_from_db()
        redirige.refresh_from_db()
        self.assertIsNone(canon.metier_canonique_id)
        self.assertEqual(redirige.metier_canonique_id, canon.pk)
        self.assertEqual(canon.groupe_principal_id, b.pk)


class RegroupementNeBaissePasLeScoreTest(TestCase):
    def test_meme_groupe_garde_le_score_fuzzy_si_plus_eleve(self):
        g = GroupeMetier.objects.create(code="G", type_groupe="domaine_source", libelle="Paie")
        a = Metier.objects.create(code="P1", libelle="Gestionnaire de Paie", cle_recherche="x", groupe_principal=g)
        b = Metier.objects.create(code="P2", libelle="Gestionnaire de Paie RH", cle_recherche="y", groupe_principal=g)
        compatible, score = metiers_compatibles(a, b)
        self.assertTrue(compatible)
        self.assertGreater(score, 0.85)
