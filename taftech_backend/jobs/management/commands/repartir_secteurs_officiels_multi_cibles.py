"""Répartit 2 secteurs officiels ANEM (`K` Banque/assurances/immobilier, `I` Transport et
logistique) entre plusieurs secteurs TAFTECH plus précis, cas volontairement laissé hors
périmètre de `fusionner_secteurs_racines_doublons.py` (celle-ci gère uniquement les fusions
1↔1 sans ambiguïté de cible) — voir son docstring.

Contrairement à ce qui était anticipé au départ, ce n'est PAS un classement métier par métier :
chaque DOMAINE de ces 2 secteurs est déjà homogène et va d'un seul bloc vers une seule cible
(vérifié en inspectant la structure réelle, 2026-09-26) :
- K "Banque, assurances et immobilier" : domaines Banque/Assurances/Marché financier -> secteur
  TSEC "Banque & Assurance" (marché financier rattaché à la banque, pas à l'assurance ni
  l'immobilier — activité de gestion de portefeuille/front-office, cœur de métier bancaire).
  Domaine Immobilier -> secteur TSEC "Immobilier".
- I "Transport et logistique" : domaine Logistique -> secteur TSEC "Logistique & Supply Chain".
  Domaines Transport aérien/maritime/terrestre -> secteur TSEC "Transport".

Même logique de fusion que les 2 commandes sœurs (métier homonyme -> `metier_canonique`,
métier unique -> déplacé, structure vide -> supprimée) si jamais un domaine cible portait le
même nom qu'un domaine à déplacer (non constaté en dry-run mais géré par sécurité).

Idempotente : si un domaine source n'existe plus (déjà déplacé), il est ignoré proprement."""
import unicodedata
import re

from django.core.management.base import BaseCommand
from django.db import transaction

from jobs.models import GroupeMetier, Metier


def _norm(s):
    s = unicodedata.normalize('NFKD', s.strip().lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', s)


# (id domaine source, id secteur cible, libellé domaine pour les logs/repérage humain)
DOMAINES_A_REPARTIR = [
    (1827, 2109, "Banque -> Banque & Assurance"),
    (1828, 2109, "Assurances -> Banque & Assurance"),
    (1829, 2109, "Marché financier -> Banque & Assurance"),
    (1830, 2313, "Immobilier -> Immobilier"),
    (1806, 2060, "Logistique -> Logistique & Supply Chain"),
    (1810, 2388, "Transport aérien et activités aéroportuaires -> Transport"),
    (1813, 2388, "Transport maritime et activités portuaires -> Transport"),
    (1816, 2388, "Transport terrestre -> Transport"),
]

# Secteurs sources vidés par cette répartition -> supprimés une fois tous leurs domaines partis.
SECTEURS_SOURCES = [1826, 1805]  # K, I


class Command(BaseCommand):
    help = "Répartit les domaines des secteurs K (Banque/assurances/immobilier) et I (Transport et logistique) vers 4 secteurs TSEC plus précis."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="N'écrit rien, affiche seulement ce qui serait fait.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("Mode --dry-run : aucune écriture en base."))

        with transaction.atomic():
            for domaine_id, cible_id, note in DOMAINES_A_REPARTIR:
                self._deplacer_domaine(domaine_id, cible_id, note, dry_run)

            for secteur_id in SECTEURS_SOURCES:
                self._supprimer_si_vide(secteur_id, dry_run)

        self.stdout.write(self.style.SUCCESS("Terminé."))

    def _relier_ou_deplacer_metier(self, m, cible_map, cible_groupe, dry_run):
        m_existant = cible_map.get(_norm(m.libelle))
        if m_existant:
            self.stdout.write(f"      métier doublon relié : {m.libelle!r} [{m.id}] -> canonique [{m_existant.id}]")
            if not dry_run:
                m.metier_canonique = m_existant
                m.groupe_principal_id = m_existant.groupe_principal_id
                m.save(update_fields=['metier_canonique', 'groupe_principal'])
        else:
            self.stdout.write(f"      métier déplacé : {m.libelle!r} [{m.id}] -> {cible_groupe.libelle!r} [{cible_groupe.id}]")
            if not dry_run:
                m.groupe_principal = cible_groupe
                m.save(update_fields=['groupe_principal'])

    def _deplacer_domaine(self, domaine_id, secteur_cible_id, note, dry_run):
        try:
            domaine = GroupeMetier.objects.get(pk=domaine_id, type_groupe='domaine_source')
        except GroupeMetier.DoesNotExist:
            self.stdout.write(f"  déjà déplacé (domaine {domaine_id} introuvable) — ignoré. [{note}]")
            return
        secteur_cible = GroupeMetier.objects.get(pk=secteur_cible_id, type_groupe='secteur_source')
        self.stdout.write(f"\n=== {note} ===")

        if domaine.parent_id == secteur_cible_id:
            self.stdout.write(f"  déjà à sa place : {domaine.libelle!r} [{domaine.id}] — ignoré.")
            return

        domaine_existant = GroupeMetier.objects.filter(
            parent=secteur_cible, type_groupe='domaine_source', libelle__iexact=domaine.libelle,
        ).exclude(pk=domaine.pk).first()

        if domaine_existant is None:
            self.stdout.write(f"  domaine déplacé intact : {domaine.libelle!r} [{domaine.id}] -> sous {secteur_cible.libelle!r} [{secteur_cible.id}]")
            if not dry_run:
                domaine.parent = secteur_cible
                domaine.save(update_fields=['parent'])
            return

        # Collision de nom (non constatée en dry-run mais gérée par sécurité) : fusion niveau
        # par niveau, même logique que fusionner_secteurs_racines_doublons.py.
        self.stdout.write(f"  collision détectée avec {domaine_existant.libelle!r} [{domaine_existant.id}] -> fusion")
        cible_map_direct = {_norm(m.libelle): m for m in Metier.objects.filter(groupe_principal_id=domaine_existant.id)}
        for m in list(Metier.objects.filter(groupe_principal_id=domaine.id)):
            self._relier_ou_deplacer_metier(m, cible_map_direct, domaine_existant, dry_run)

        sous_domaines_cibles = {_norm(sd.libelle): sd for sd in GroupeMetier.objects.filter(parent_id=domaine_existant.id)}
        for sd in list(GroupeMetier.objects.filter(parent_id=domaine.id)):
            sd_existant = sous_domaines_cibles.get(_norm(sd.libelle))
            if sd_existant:
                cible_map_sd = {_norm(m.libelle): m for m in Metier.objects.filter(groupe_principal_id=sd_existant.id)}
                for m in list(Metier.objects.filter(groupe_principal_id=sd.id)):
                    self._relier_ou_deplacer_metier(m, cible_map_sd, sd_existant, dry_run)
                if not dry_run:
                    sd.delete()
            else:
                self.stdout.write(f"    sous-domaine reparenté : {sd.libelle!r} [{sd.id}] -> {domaine_existant.libelle!r} [{domaine_existant.id}]")
                if not dry_run:
                    sd.parent = domaine_existant
                    sd.save(update_fields=['parent'])

        if not dry_run:
            domaine.delete()

    def _supprimer_si_vide(self, secteur_id, dry_run):
        try:
            secteur = GroupeMetier.objects.get(pk=secteur_id, type_groupe='secteur_source')
        except GroupeMetier.DoesNotExist:
            return
        reste_domaines = GroupeMetier.objects.filter(parent=secteur).count()
        reste_metiers = Metier.objects.filter(groupe_principal=secteur).count()
        if reste_domaines or reste_metiers:
            self.stdout.write(self.style.ERROR(
                f"secteur {secteur.libelle!r} [{secteur.id}] NON supprimé — {reste_domaines} domaine(s) et "
                f"{reste_metiers} métier(s) direct(s) restants (répartition incomplète, à corriger avant relance)."
            ))
            return
        if not dry_run:
            secteur.delete()
            self.stdout.write(f"secteur vidé supprimé : {secteur.libelle!r} [{secteur.id}]")
        else:
            self.stdout.write(f"[dry-run] secteur {secteur.libelle!r} serait supprimé (vide après répartition).")
