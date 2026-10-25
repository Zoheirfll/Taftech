"""Relations « similaire » entre métiers qui partagent une appellation : créées UNIQUEMENT à partir d'une
liste de paires validée à la main (décision produit du 24/09/2026 : jamais déduites automatiquement).
Idempotente, ne touche jamais un métier redirigé, n'écrit rien en `--dry-run`."""
import json
import os
import tempfile
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from jobs.matcher import metiers_compatibles
from jobs.models import GroupeMetier, Metier, RelationMetier
from jobs.relations_metiers_similaires import appliquer_relations_similaires


class RelationsMetiersSimilairesTests(TestCase):
    def setUp(self):
        achats = GroupeMetier.objects.create(code="S-ACH", libelle="Achats", type_groupe="secteur_source")
        support = GroupeMetier.objects.create(code="S-SUP", libelle="Support", type_groupe="secteur_source")
        self.taf = Metier.objects.create(code="TAF-1", libelle="Acheteur", groupe_principal=achats)
        self.anem = Metier.objects.create(code="L-9", libelle="Opérations zéro", groupe_principal=support)
        self.autre = Metier.objects.create(code="X-3", libelle="Soudeur", groupe_principal=support)
        self.dossier = tempfile.TemporaryDirectory()
        self.addCleanup(self.dossier.cleanup)
        self.journal = []

    def _fichier(self, paires):
        chemin = os.path.join(self.dossier.name, "paires.json")
        with open(chemin, "w", encoding="utf-8") as f:
            json.dump(paires, f)
        return chemin

    def _appliquer(self, paires, **kw):
        return appliquer_relations_similaires(self.journal.append, chemin=self._fichier(paires), **kw)

    def test_cree_la_relation_et_le_score_monte_a_0_70(self):
        self.assertLess(metiers_compatibles(self.taf, self.anem)[1], 0.70)
        self.assertEqual(self._appliquer([{"depart": "TAF-1", "arrivee": "L-9", "appellation": "Acheteur"}]), 1)
        relation = RelationMetier.objects.get()
        self.assertEqual((relation.relation, relation.active_recherche), ("similaire", True))
        self.assertIn("Acheteur", relation.justification)
        self.assertEqual(metiers_compatibles(self.taf, self.anem)[1], 0.70)

    def test_idempotente(self):
        paires = [{"depart": "TAF-1", "arrivee": "L-9", "appellation": "Acheteur"}]
        self._appliquer(paires)
        self.assertEqual(self._appliquer(paires), 0)
        self.assertEqual(RelationMetier.objects.count(), 1)

    def test_la_paire_inverse_deja_presente_n_est_pas_dupliquee(self):
        RelationMetier.objects.create(code="R-X", metier_depart=self.anem, metier_arrivee=self.taf, relation="similaire")
        self.assertEqual(self._appliquer([{"depart": "TAF-1", "arrivee": "L-9", "appellation": "Acheteur"}]), 0)
        self.assertEqual(RelationMetier.objects.count(), 1)

    def test_un_metier_inconnu_est_ignore_et_signale(self):
        self.assertEqual(self._appliquer([{"depart": "TAF-1", "arrivee": "INCONNU", "appellation": "Acheteur"}]), 0)
        self.assertTrue(any("INCONNU" in ligne for ligne in self.journal))

    def test_un_metier_redirige_est_ignore(self):
        Metier.objects.filter(pk=self.anem.pk).update(metier_canonique=self.autre)
        self.assertEqual(self._appliquer([{"depart": "TAF-1", "arrivee": "L-9", "appellation": "Acheteur"}]), 0)
        self.assertEqual(RelationMetier.objects.count(), 0)

    def test_un_metier_avec_lui_meme_est_ignore(self):
        self.assertEqual(self._appliquer([{"depart": "TAF-1", "arrivee": "TAF-1", "appellation": "Acheteur"}]), 0)

    def test_dry_run_n_ecrit_rien(self):
        self.assertEqual(self._appliquer([{"depart": "TAF-1", "arrivee": "L-9", "appellation": "Acheteur"}], appliquer=False), 1)
        self.assertEqual(RelationMetier.objects.count(), 0)

    def test_fichier_absent_ne_fait_rien(self):
        self.assertEqual(appliquer_relations_similaires(self.journal.append, chemin=os.path.join(self.dossier.name, "absent.json")), 0)

    def test_commande_dry_run(self):
        sortie = StringIO()
        call_command("appliquer_relations_metiers_similaires", "--dry-run", stdout=sortie)
        self.assertIn("DRY-RUN", sortie.getvalue())
        self.assertEqual(RelationMetier.objects.count(), 0)
