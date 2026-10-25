"""Commande `appliquer_liens_competences_metiers` : liens compétence ↔ métiers d'une liste validée à la main.

Même principe que `appliquer_ajouts_referentiel` : idempotente, tout-ou-rien, `--dry-run`, rejouable après
chaque import du référentiel (les liens créés ici portent un code `TAF-LC-…`, jamais touché par l'import)."""
import json
import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import CommandError, call_command
from django.test import TestCase

from jobs.models import CompetenceReferentiel, GroupeMetier, Metier, MetierCompetence


def _metier(code, libelle, canonique=None):
    groupe, _ = GroupeMetier.objects.get_or_create(code='G-LC', defaults={'type_groupe': 'domaine_source', 'libelle': 'Qualité'})
    metier = Metier.objects.create(code=code, libelle=libelle, cle_recherche=libelle.lower(), groupe_principal=groupe, selectionnable=True)
    metier.metier_canonique = canonique or metier
    metier.save(update_fields=['metier_canonique'])
    return metier


class AppliquerLiensCompetencesMetiersTests(TestCase):
    def setUp(self):
        self.qualite = _metier('M-QUAL', 'Responsable qualité')
        self.inspecteur = _metier('M-INSP', 'Inspecteur qualité')
        self.kaizen = CompetenceReferentiel.objects.create(label='Kaizen', statut='VALIDEE')
        self.dossier = tempfile.TemporaryDirectory()
        self.addCleanup(self.dossier.cleanup)

    def lancer(self, liens, *options):
        chemin = Path(self.dossier.name) / 'liens.json'
        chemin.write_text(json.dumps(liens), encoding='utf-8')
        sortie = StringIO()
        call_command('appliquer_liens_competences_metiers', *options, fichier=str(chemin), stdout=sortie)
        return sortie.getvalue()

    def test_cree_les_liens_listes(self):
        self.lancer([{'competence': 'kaizen', 'metiers': ['M-QUAL', 'M-INSP']}])
        self.assertEqual(
            set(MetierCompetence.objects.filter(competence=self.kaizen).values_list('metier__code', flat=True)),
            {'M-QUAL', 'M-INSP'},
        )

    def test_relancee_elle_ne_cree_rien_de_plus(self):
        liens = [{'competence': 'Kaizen', 'metiers': ['M-QUAL']}]
        self.lancer(liens)
        sortie = self.lancer(liens)
        self.assertEqual(MetierCompetence.objects.count(), 1)
        self.assertIn('déjà fait', sortie)

    def test_dry_run_n_ecrit_rien(self):
        sortie = self.lancer([{'competence': 'Kaizen', 'metiers': ['M-QUAL']}], '--dry-run')
        self.assertEqual(MetierCompetence.objects.count(), 0)
        self.assertIn('DRY-RUN', sortie)

    def test_un_metier_redirige_est_lie_a_son_canonique(self):
        synonyme = _metier('M-SYN', 'Qualiticien', canonique=self.qualite)
        self.lancer([{'competence': 'Kaizen', 'metiers': [synonyme.code]}])
        self.assertEqual(MetierCompetence.objects.get().metier_id, self.qualite.pk)

    def test_une_cible_introuvable_annule_tout(self):
        with self.assertRaises(CommandError) as ctx:
            self.lancer([
                {'competence': 'Kaizen', 'metiers': ['M-QUAL']},
                {'competence': 'Kaizen', 'metiers': ['M-INCONNU']},
            ])
        self.assertIn('M-INCONNU', str(ctx.exception))
        self.assertEqual(MetierCompetence.objects.count(), 0)

    def test_une_competence_non_officielle_est_refusee(self):
        CompetenceReferentiel.objects.create(label='Brouillon', statut='SUGGEREE')
        with self.assertRaises(CommandError) as ctx:
            self.lancer([{'competence': 'Brouillon', 'metiers': ['M-QUAL']}])
        self.assertIn('Brouillon', str(ctx.exception))
        self.assertEqual(MetierCompetence.objects.count(), 0)
