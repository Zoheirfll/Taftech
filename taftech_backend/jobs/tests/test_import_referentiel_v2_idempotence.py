# -*- coding: utf-8 -*-
"""RECETTE T16 (fichier métiers) — un réimport de la même version du référentiel ne doit
jamais créer de doublon (upsert par `code`, jamais un nouvel enregistrement pour un code déjà
connu). Vérifié manuellement en Phase 1 (17/09/2026, CLAUDE.md), jamais automatisé jusqu'ici."""
import os

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase

from jobs.models import Metier, Appellation, TypeDiplome, SpecialiteFormation


class ImportReferentielV2IdempotenceTest(TestCase):
    def setUp(self):
        base_dir = str(settings.BASE_DIR)
        self.chemin_diplomes = os.path.join(base_dir, "TAFTECH_Diplomes_Specialites_Algerie_v2.xlsx")
        self.chemin_metiers = os.path.join(base_dir, "TAFTECH_Metiers_Matching_v2.xlsx")
        if not (os.path.exists(self.chemin_diplomes) and os.path.exists(self.chemin_metiers)):
            self.skipTest("Classeurs référentiel v2 absents de cet environnement (dev uniquement).")

    def _importer(self):
        call_command(
            "import_referentiel_v2",
            diplomes=self.chemin_diplomes,
            metiers=self.chemin_metiers,
        )

    def test_reimport_ne_cree_aucun_doublon(self):
        self._importer()
        comptes_apres_premier_import = {
            "metier": Metier.objects.count(),
            "appellation": Appellation.objects.count(),
            "type_diplome": TypeDiplome.objects.count(),
            "specialite": SpecialiteFormation.objects.count(),
        }
        self._importer()
        comptes_apres_second_import = {
            "metier": Metier.objects.count(),
            "appellation": Appellation.objects.count(),
            "type_diplome": TypeDiplome.objects.count(),
            "specialite": SpecialiteFormation.objects.count(),
        }
        self.assertEqual(comptes_apres_premier_import, comptes_apres_second_import)
