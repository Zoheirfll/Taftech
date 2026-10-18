"""Reprend les anciennes propositions de métier (`PropositionMetier`) dans les demandes d'ajout (`DemandeAjout`).

    python manage.py migrer_propositions_metier_vers_demandes              # simulation
    python manage.py migrer_propositions_metier_vers_demandes --appliquer  # sauvegarde JSON puis création

Idempotente : une proposition déjà reprise (même type, même libellé normalisé, même statut) est ignorée. Les
anciennes lignes `PropositionMetier` ne sont ni modifiées ni supprimées (nettoyage à l'étape 4)."""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from jobs.models import DemandeAjout, PropositionMetier

ECHANTILLON = 10


def statut_equivalent(proposition):
    if proposition.statut == PropositionMetier.STATUT_SUGGEREE:
        return DemandeAjout.STATUT_A_EXAMINER
    if proposition.statut == PropositionMetier.STATUT_REJETEE:
        return DemandeAjout.STATUT_REFUSEE
    if proposition.issue == PropositionMetier.ISSUE_RATTACHEE:
        return DemandeAjout.STATUT_RATTACHEE
    return DemandeAjout.STATUT_ACCEPTEE


def propositions_a_reprendre():
    reprises = []
    for proposition in PropositionMetier.objects.select_related('metier_resultat').order_by('id'):
        statut = statut_equivalent(proposition)
        deja = DemandeAjout.objects.filter(
            type=DemandeAjout.TYPE_METIER, cle_recherche=proposition.cle_recherche, statut=statut,
        ).exists()
        if not deja:
            reprises.append((proposition, statut))
    return reprises


class Command(BaseCommand):
    help = "Reprend les propositions de métier dans les demandes d'ajout (simulation par défaut)."

    def add_arguments(self, parser):
        parser.add_argument('--appliquer', action='store_true', help="Écrit la sauvegarde JSON puis crée les demandes.")

    def handle(self, *args, **options):
        reprises = propositions_a_reprendre()
        self.stdout.write(f"Propositions de métier à reprendre : {len(reprises)} sur {PropositionMetier.objects.count()}")
        for proposition, statut in reprises[:ECHANTILLON]:
            self.stdout.write(f"  - proposition {proposition.id} : « {proposition.libelle[:80]} » ({proposition.statut} -> {statut})")
        if not options['appliquer']:
            self.stdout.write("Simulation : rien n'a été écrit. Relancez avec --appliquer pour migrer.")
            return
        if not reprises:
            self.stdout.write("Rien à migrer.")
            return

        chemin = self._sauvegarder(reprises)
        self.stdout.write(f"Sauvegarde écrite : {chemin}")
        with transaction.atomic():
            for proposition, statut in reprises:
                self._creer(proposition, statut)
        self.stdout.write(self.style.SUCCESS(f"Demandes créées : {len(reprises)}"))

    def _creer(self, proposition, statut):
        demande = DemandeAjout.objects.create(
            type=DemandeAjout.TYPE_METIER, libelle=proposition.libelle, cle_recherche=proposition.cle_recherche,
            contexte=proposition.contexte, explicite=True, origine=proposition.origine,
            premier_demandeur=proposition.proposee_par, statut=statut,
            entree_id=proposition.metier_resultat_id,
            entree_libelle=proposition.metier_resultat.libelle if proposition.metier_resultat_id else '',
            motif_refus=proposition.motif_rejet, traite_par=proposition.traite_par, date_decision=proposition.date_statut,
        )
        demande.demandeurs.set(proposition.demandeurs.all())
        # `date_creation` est automatique (auto_now_add) : on rétablit la date d'origine.
        DemandeAjout.objects.filter(pk=demande.pk).update(date_creation=proposition.date_creation)

    def _sauvegarder(self, reprises):
        dossier = Path(settings.BASE_DIR).parent / 'docs' / 'archives'
        dossier.mkdir(parents=True, exist_ok=True)
        chemin = dossier / f"sauvegarde-propositions-metier-avant-demandes-{timezone.now():%Y-%m-%d-%H%M}.json"
        donnees = [
            {
                'id': p.id, 'libelle': p.libelle, 'cle_recherche': p.cle_recherche, 'contexte': p.contexte,
                'origine': p.origine, 'statut': p.statut, 'issue': p.issue, 'motif_rejet': p.motif_rejet,
                'metier_resultat_id': p.metier_resultat_id, 'proposee_par_id': p.proposee_par_id,
                'demandeurs_ids': list(p.demandeurs.values_list('id', flat=True)),
                'date_creation': p.date_creation.isoformat(), 'date_statut': p.date_statut.isoformat() if p.date_statut else None,
            }
            for p, _statut in reprises
        ]
        chemin.write_text(json.dumps(donnees, ensure_ascii=False, indent=2), encoding='utf-8')
        return chemin
