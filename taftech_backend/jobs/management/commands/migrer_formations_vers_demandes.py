"""Crée les demandes d'ajout au référentiel pour les formations de candidats déjà enregistrées avec un
diplôme « Autre » (ou sans diplôme de référence) ou une spécialité non résolue.

    python manage.py migrer_formations_vers_demandes              # simulation : liste ce qui serait migré
    python manage.py migrer_formations_vers_demandes --appliquer  # sauvegarde JSON puis création des demandes

Idempotent : une formation déjà liée à une demande est ignorée. Aucune formation n'est modifiée en dehors
des deux liens `demande_diplome` et `demande_specialite`."""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from jobs.demandes_ajout import synchroniser_depuis_formation
from jobs.demandes_ajout.regles import LIBELLE_MIN
from jobs.models import FormationCandidat

CODE_DIPLOME_AUTRE = 'D-AUTRE'
ECHANTILLON = 10


def _texte(valeur):
    return ' '.join(str(valeur or '').split())


def formations_concernees():
    """Retourne deux listes de formations : diplôme « Autre » / absent, et spécialité non résolue."""
    base = FormationCandidat.objects.select_related('profil__user', 'diplome_ref').order_by('id')
    diplomes = [
        f for f in base.filter(diplome_ref__code=CODE_DIPLOME_AUTRE, demande_diplome__isnull=True)
        if len(_texte(f.diplome)) >= LIBELLE_MIN
    ]
    specialites = [
        f for f in base.filter(
            statut_validation='A_PRECISER', diplome_ref__isnull=False, specialite_ref__isnull=True,
            demande_specialite__isnull=True,
        ).exclude(diplome_ref__code=CODE_DIPLOME_AUTRE)
        if len(_texte(f.specialite_texte)) >= LIBELLE_MIN
    ]
    return diplomes, specialites


class Command(BaseCommand):
    help = "Crée les demandes d'ajout des formations « Autre diplôme » / « Autre spécialité » (simulation par défaut)."

    def add_arguments(self, parser):
        parser.add_argument('--appliquer', action='store_true', help="Écrit la sauvegarde JSON puis crée les demandes.")

    def handle(self, *args, **options):
        diplomes, specialites = formations_concernees()
        self.stdout.write(f"Formations avec un diplôme « Autre » ou sans diplôme de référence : {len(diplomes)}")
        for formation in diplomes[:ECHANTILLON]:
            self.stdout.write(f"  - formation {formation.id} : « {_texte(formation.diplome)[:80]} »")
        self.stdout.write(f"Formations avec une spécialité non résolue : {len(specialites)}")
        for formation in specialites[:ECHANTILLON]:
            self.stdout.write(f"  - formation {formation.id} : « {_texte(formation.specialite_texte)[:80]} »")

        if not options['appliquer']:
            self.stdout.write("Simulation : rien n'a été écrit. Relancez avec --appliquer pour migrer.")
            return
        if not diplomes and not specialites:
            self.stdout.write("Rien à migrer.")
            return

        sauvegarde = self._sauvegarder(diplomes, specialites)
        self.stdout.write(f"Sauvegarde écrite : {sauvegarde}")

        ids_specialites = {f.id for f in specialites}
        liees = non_liees = 0
        for formation in diplomes + [f for f in specialites if f.id not in {d.id for d in diplomes}]:
            specialite_autre = _texte(formation.specialite_texte) if formation.id in ids_specialites else ''
            synchroniser_depuis_formation(formation, formation.profil.user, specialite_autre)
            formation.refresh_from_db()
            if formation.demande_diplome_id or formation.demande_specialite_id:
                liees += 1
            else:
                non_liees += 1
        self.stdout.write(self.style.SUCCESS(f"Formations reliées à une demande : {liees}"))
        if non_liees:
            self.stdout.write(self.style.WARNING(
                f"Formations sans demande (entrée déjà existante, déjà refusée ou limite de demandes atteinte) : {non_liees}"
            ))

    def _sauvegarder(self, diplomes, specialites):
        dossier = Path(settings.BASE_DIR).parent / 'docs' / 'archives'
        dossier.mkdir(parents=True, exist_ok=True)
        chemin = dossier / f"sauvegarde-formations-avant-demandes-{timezone.now():%Y-%m-%d-%H%M}.json"
        vues = {f.id: f for f in diplomes + specialites}
        donnees = [
            {
                'id': f.id, 'diplome': f.diplome, 'description': f.description, 'specialite_texte': f.specialite_texte,
                'diplome_ref_id': f.diplome_ref_id,
                'specialite_ref_id': f.specialite_ref_id, 'statut_validation': f.statut_validation,
                'demande_diplome_id': f.demande_diplome_id, 'demande_specialite_id': f.demande_specialite_id,
            }
            for f in vues.values()
        ]
        chemin.write_text(json.dumps(donnees, ensure_ascii=False, indent=2), encoding='utf-8')
        return chemin
