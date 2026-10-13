"""Consolide le référentiel v2 (secteurs/domaines métiers + spécialités de formation) et écrit
l'instantané de hiérarchie rejoué par `import_referentiel_v2`. Voir `jobs/referentiel_fusions.py`.

Idempotente : relancée, chaque opération déjà faite est signalée `[déjà fait]`.
`--dry-run` exécute tout dans une transaction annulée (rapport complet, rien écrit).
Les contrôles d'intégrité (aucun groupe orphelin, aucun métier sans groupe, aucune référence
candidat/offre cassée) sont exécutés AVANT validation : une anomalie annule tout."""
import os

import openpyxl
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from jobs.management.commands.import_referentiel_v2 import DEFAULT_METIERS_FILE
from jobs.referentiel_fusions import (
    _Journal, appliquer_fusions_specialites, appliquer_operations_groupes, appliquer_redirections_metiers, calculer_instantane,
    ecrire_instantane, CHEMIN_INSTANTANE,
)


class _Annulation(Exception):
    pass


class Command(BaseCommand):
    help = "Fusionne secteurs/domaines/spécialités redondants et met à jour l'instantané de hiérarchie."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--metiers', type=str, default=None, help="Chemin du classeur Métiers/Matching.")

    def handle(self, *args, **options):
        from jobs.models import FormationCandidat, GroupeMetier, Metier, OffreEmploi, SpecialiteFormation

        chemin = options['metiers'] or os.path.join(str(settings.BASE_DIR), DEFAULT_METIERS_FILE)
        if not os.path.exists(chemin):
            raise CommandError(f"Classeur introuvable : {chemin}")
        log = _Journal(lambda l: self.stdout.write(l))

        def etat():
            return (GroupeMetier.objects.filter(type_groupe='secteur_source').count(),
                    GroupeMetier.objects.filter(type_groupe='domaine_source').count(),
                    SpecialiteFormation.objects.count())

        avant = etat()
        refs_avant = (FormationCandidat.objects.exclude(specialite_ref=None).count(),
                      OffreEmploi.specialites_requises.through.objects.count(),
                      Metier.objects.count())
        try:
            with transaction.atomic():
                self.stdout.write("== Secteurs / domaines ==")
                appliquer_operations_groupes(log)
                self.stdout.write("== Redirections de métiers ==")
                appliquer_redirections_metiers(log)
                self.stdout.write("== Spécialités ==")
                appliquer_fusions_specialites(log)

                anomalies = []
                orphelins = GroupeMetier.objects.filter(parent__isnull=True).exclude(type_groupe='secteur_source')
                if orphelins.exists():
                    anomalies.append(f"{orphelins.count()} groupe(s) orphelin(s)")
                if Metier.objects.filter(groupe_principal__isnull=True).exists():
                    anomalies.append("métier(s) sans groupe_principal")
                chaines = [m.code for m in Metier.objects.filter(metier_canonique__isnull=False).select_related('metier_canonique')
                           if m.metier_canonique.metier_canonique_id not in (None, m.metier_canonique_id)]
                if chaines:
                    anomalies.append(f"redirection(s) métier en chaîne/cycle : {chaines}")
                vides = [g for g in GroupeMetier.objects.filter(type_groupe='secteur_source')
                         if not GroupeMetier.objects.filter(parent=g).exists()]
                if vides:
                    anomalies.append(f"secteur(s) vide(s) : {[g.code for g in vides]}")
                refs_apres = (FormationCandidat.objects.exclude(specialite_ref=None).count(),
                              OffreEmploi.specialites_requises.through.objects.count(),
                              Metier.objects.count())
                if refs_apres[0] != refs_avant[0] or refs_apres[2] != refs_avant[2] or refs_apres[1] > refs_avant[1]:
                    anomalies.append(f"références modifiées {refs_avant} -> {refs_apres}")
                if anomalies:
                    raise CommandError("Contrôles d'intégrité en échec, tout est annulé : " + " ; ".join(anomalies))

                apres = etat()
                self.stdout.write(self.style.SUCCESS(
                    f"Secteurs {avant[0]} -> {apres[0]}, domaines {avant[1]} -> {apres[1]}, "
                    f"spécialités {avant[2]} -> {apres[2]}. Références candidats/offres/métiers intactes."))

                wb = openpyxl.load_workbook(chemin, read_only=True, data_only=True)
                instantane = calculer_instantane(wb)
                self.stdout.write(
                    f"Instantané : {len(instantane['groupes'])} groupes, {len(instantane['metiers'])} métiers, "
                    f"{len(instantane['groupes_supprimes'])} groupes fusionnés par rapport au classeur client.")
                if options['dry_run']:
                    raise _Annulation()
                ecrire_instantane(instantane)
                self.stdout.write(self.style.SUCCESS(f"Instantané écrit : {CHEMIN_INSTANTANE}"))
        except _Annulation:
            self.stdout.write(self.style.WARNING("[DRY-RUN] Rien n'a été écrit."))
