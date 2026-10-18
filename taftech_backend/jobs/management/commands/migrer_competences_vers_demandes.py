"""Reprend les compétences « Suggérée » et « Rejetée » du référentiel dans les demandes d'ajout (`DemandeAjout`).

    python manage.py migrer_competences_vers_demandes              # simulation
    python manage.py migrer_competences_vers_demandes --appliquer  # sauvegarde JSON puis création

Depuis l'étape 3 des demandes d'ajout, la liste officielle des compétences ne montre que les compétences actives
ou masquées : les suggestions et les rejets existants n'y apparaissent plus tant qu'ils ne sont pas repris ici.
Idempotente (même type, même libellé normalisé, même statut = déjà repris). Les anciennes lignes
`CompetenceReferentiel` ne sont ni modifiées ni supprimées (nettoyage à l'étape 4)."""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from jobs.models import CompetenceCandidat, CompetenceOffre, CompetenceReferentiel, DemandeAjout
from jobs.referentiel_utils import normaliser_recherche

ECHANTILLON = 10
STATUTS_REPRIS = {
    CompetenceReferentiel.STATUT_SUGGEREE: DemandeAjout.STATUT_A_EXAMINER,
    CompetenceReferentiel.STATUT_REJETEE: DemandeAjout.STATUT_REFUSEE,
}


def competences_a_reprendre():
    reprises = []
    for competence in CompetenceReferentiel.objects.filter(statut__in=STATUTS_REPRIS).order_by('id'):
        statut = STATUTS_REPRIS[competence.statut]
        cle = normaliser_recherche(competence.label)
        if cle and not DemandeAjout.objects.filter(type=DemandeAjout.TYPE_COMPETENCE, cle_recherche=cle, statut=statut).exists():
            reprises.append((competence, cle, statut))
    return reprises


def demandeurs_de(competence):
    """Comptes qui ont saisi ce libellé : candidats (« Mes compétences ») puis recruteurs (offres)."""
    candidats = list(dict.fromkeys(
        CompetenceCandidat.objects.filter(label__iexact=competence.label).order_by('id').values_list('profil__user_id', flat=True),
    ))
    recruteurs = list(dict.fromkeys(
        CompetenceOffre.objects.filter(label__iexact=competence.label).order_by('id').values_list('offre__entreprise__user_id', flat=True),
    ))
    return candidats, recruteurs


class Command(BaseCommand):
    help = "Reprend les compétences suggérées ou rejetées dans les demandes d'ajout (simulation par défaut)."

    def add_arguments(self, parser):
        parser.add_argument('--appliquer', action='store_true', help="Écrit la sauvegarde JSON puis crée les demandes.")

    def handle(self, *args, **options):
        reprises = competences_a_reprendre()
        self.stdout.write(f"Compétences suggérées ou rejetées à reprendre : {len(reprises)}")
        for competence, _cle, statut in reprises[:ECHANTILLON]:
            self.stdout.write(f"  - compétence {competence.id} : « {competence.label[:80]} » ({competence.statut} -> {statut})")
        if not options['appliquer']:
            self.stdout.write("Simulation : rien n'a été écrit. Relancez avec --appliquer pour migrer.")
            return
        if not reprises:
            self.stdout.write("Rien à migrer.")
            return

        self.stdout.write(f"Sauvegarde écrite : {self._sauvegarder(reprises)}")
        with transaction.atomic():
            for competence, cle, statut in reprises:
                self._creer(competence, cle, statut)
        self.stdout.write(self.style.SUCCESS(f"Demandes créées : {len(reprises)}"))

    def _creer(self, competence, cle, statut):
        candidats, recruteurs = demandeurs_de(competence)
        demandeurs = candidats + [u for u in recruteurs if u not in candidats]
        demande = DemandeAjout.objects.create(
            type=DemandeAjout.TYPE_COMPETENCE, libelle=competence.label, cle_recherche=cle, explicite=False,
            origine=DemandeAjout.ORIGINE_CANDIDAT if candidats or not recruteurs else DemandeAjout.ORIGINE_RECRUTEUR,
            premier_demandeur_id=demandeurs[0] if demandeurs else None, statut=statut,
            traite_par=competence.traite_par, date_decision=competence.date_statut,
        )
        demande.demandeurs.set(demandeurs)

    def _sauvegarder(self, reprises):
        dossier = Path(settings.BASE_DIR).parent / 'docs' / 'archives'
        dossier.mkdir(parents=True, exist_ok=True)
        chemin = dossier / f"sauvegarde-competences-avant-demandes-{timezone.now():%Y-%m-%d-%H%M}.json"
        donnees = [
            {
                'id': c.id, 'label': c.label, 'synonymes': c.synonymes, 'statut': c.statut, 'origine': c.origine,
                'date_statut': c.date_statut.isoformat() if c.date_statut else None, 'traite_par_id': c.traite_par_id,
            }
            for c, _cle, _statut in reprises
        ]
        chemin.write_text(json.dumps(donnees, ensure_ascii=False, indent=2), encoding='utf-8')
        return chemin
