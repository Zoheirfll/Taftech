"""Ajouts au référentiel (appellations et métiers) par `appliquer_ajouts_referentiel` : idempotent,
tout-ou-rien, `--dry-run` sans écriture, jamais de doublon d'une appellation existante."""
import json
import os
import tempfile
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase

from jobs.management.commands.appliquer_ajouts_referentiel import CHEMIN_DEFAUT
from jobs.models import Appellation, GroupeMetier, Metier
from jobs.referentiel_utils import normaliser_recherche


class AjoutsReferentielTest(TestCase):
    def setUp(self):
        self.groupe = GroupeMetier.objects.create(code="TSUB-TEST", libelle="Méthodes et gestion", type_groupe="sous_domaine_source")
        self.cible = Metier.objects.create(
            code="C1401", libelle="Encadrement méthode en production industrielle",
            cle_recherche=normaliser_recherche("Encadrement méthode en production industrielle"),
            groupe_principal=self.groupe, selectionnable=True, statut="actif")
        self.cible.metier_canonique = self.cible
        self.cible.save(update_fields=["metier_canonique"])

    def _lancer(self, contenu, *options):
        with tempfile.TemporaryDirectory() as dossier:
            chemin = os.path.join(dossier, "ajouts.json")
            with open(chemin, "w", encoding="utf-8") as f:
                json.dump(contenu, f)
            sortie = StringIO()
            call_command("appliquer_ajouts_referentiel", *options, fichier=chemin, stdout=sortie)
        return sortie.getvalue()

    ALIAS = {"appellations": [{"id": "A01", "metier": "C1401", "libelle": "Organisateur industriel"}]}
    NOUVEAU = {"metiers": [{"id": "M01", "libelle": "Chef de projet industriel", "groupe": "TSUB-TEST"}]}

    def test_alias_ajoute_au_metier_officiel(self):
        self._lancer(self.ALIAS)
        alias = Appellation.objects.get(code="TAF-AJ-A01")
        self.assertEqual(alias.metier, self.cible)
        self.assertEqual(alias.cle_recherche, normaliser_recherche("Organisateur industriel"))
        self.assertTrue(alias.actif)

    def test_relance_sans_effet(self):
        self._lancer(self.ALIAS)
        sortie = self._lancer(self.ALIAS)
        self.assertEqual(Appellation.objects.filter(code="TAF-AJ-A01").count(), 1)
        self.assertIn("déjà fait", sortie)

    def test_dry_run_n_ecrit_rien(self):
        sortie = self._lancer({**self.ALIAS, **self.NOUVEAU}, "--dry-run")
        self.assertFalse(Appellation.objects.filter(code__startswith="TAF-AJ").exists())
        self.assertFalse(Metier.objects.filter(code__startswith="TAF-AJ").exists())
        self.assertIn("rien n'est écrit", sortie)

    def test_nouveau_metier_cree_dans_son_groupe(self):
        self._lancer(self.NOUVEAU)
        metier = Metier.objects.get(code="TAF-AJ-M01")
        self.assertEqual(metier.groupe_principal, self.groupe)
        self.assertEqual(metier.metier_canonique, metier)
        self.assertTrue(metier.selectionnable)
        self.assertEqual(Appellation.objects.get(code="TAF-AJ-M01-A").metier, metier)

    def test_cible_inconnue_annule_tout(self):
        contenu = {"appellations": [self.ALIAS["appellations"][0], {"id": "A02", "metier": "XXXX", "libelle": "Autre"}]}
        with self.assertRaises(CommandError):
            self._lancer(contenu)
        self.assertFalse(Appellation.objects.filter(code__startswith="TAF-AJ").exists())

    def test_groupe_inconnu_refuse(self):
        with self.assertRaises(CommandError):
            self._lancer({"metiers": [{"id": "M01", "libelle": "X", "groupe": "TSUB-ABSENT"}]})

    def test_libelle_deja_present_n_est_pas_duplique(self):
        Appellation.objects.create(code="EXIST", metier=self.cible, libelle="Organisateur industriel",
                                   cle_recherche=normaliser_recherche("Organisateur industriel"), actif=True)
        self._lancer(self.ALIAS)
        self.assertFalse(Appellation.objects.filter(code="TAF-AJ-A01").exists())


class FichierLivreTest(SimpleTestCase):
    def test_structure_du_fichier_livre(self):
        with open(CHEMIN_DEFAUT, encoding="utf-8") as f:
            donnees = json.load(f)
        entrees = donnees.get("appellations", []) + donnees.get("metiers", [])
        ids = [e["id"] for e in entrees]
        self.assertEqual(len(ids), len(set(ids)), "identifiants en double")
        for e in entrees:
            self.assertTrue(e["libelle"].strip())
        for e in donnees.get("appellations", []):
            self.assertTrue(e["metier"])
        for e in donnees.get("metiers", []):
            self.assertTrue(e["groupe"])
