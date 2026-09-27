"""Fusionne des paires de secteurs racines (`GroupeMetier.type_groupe='secteur_source'`) qui
désignent le même secteur réel en double — un secteur officiel ANEM (NSEC-*) et un secteur
TAFTECH (TSEC-*) qui se recoupent totalement ou partiellement, jamais réellement fusionnés au
niveau de la hiérarchie métier malgré leur masquage de la liste publique `secteurs_entreprise()`
(voir `jobs/referentiel_utils.py::SECTEURS_CODES_MASQUES` — ce masquage ne touche que
l'affichage du dropdown d'inscription entreprise, jamais `GroupeMetier` en base, comme documenté
dans son propre docstring).

Trouvé en vérifiant un signalement client (2026-09-26) sur un cas précis (Informatique/Systèmes
d'information/Cloud Computing, déjà résolu par `_meme_secteur_parent` le jour même) — l'audit a
révélé que ce même défaut existe encore sur 7 autres paires : tant que les deux racines restent
séparées, `matcher.py::metiers_compatibles()` ne peut jamais leur attribuer mieux qu'un score
fuzzy hasardeux (souvent proche de 0) entre deux métiers du même secteur réel.

Périmètre volontairement limité aux fusions 1↔1 sans ambiguïté de classement (une seule cible
possible par métier). Les 2 cas restants identifiés (`K` Banque/assurances/immobilier → à
répartir entre 2 cibles TSEC ; `I` Transport et logistique → à répartir entre 2 cibles TSEC)
exigent un classement métier par métier et sont explicitement HORS PÉRIMÈTRE de cette commande.

Même logique de fusion que `fusionner_secteurs_doublons.py` (métier avec homonyme exact dans la
cible -> relié via `metier_canonique`, jamais dupliqué ; métier sans équivalent -> déplacé ;
structure devenue vide -> supprimée), généralisée pour s'appliquer au niveau secteur entier
(domaines en collision de nom -> fusion récursive niveau par niveau, domaines sans collision ->
reparentage intact en un seul geste).

Idempotente par construction : si relancée après un premier passage réussi, les secteurs sources
n'existent plus (`GroupeMetier.DoesNotExist` -> ignoré proprement par paire)."""
import unicodedata
import re

from django.core.management.base import BaseCommand
from django.db import transaction

from jobs.models import GroupeMetier, Metier


def _norm(s):
    s = unicodedata.normalize('NFKD', s.strip().lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', s)


# (id secteur source -> fusionné et supprimé, id secteur cible -> conservé) — identifiés par pk
# plutôt que par libellé : plusieurs secteurs ont un libellé quasi-identique une fois le préfixe
# officiel nettoyé (ex: "C-INDUSTRIE" -> "Industrie"), un lookup par texte serait ambigu.
PAIRES = [
    (1912, 1739, "Industrie (TSEC) -> C-INDUSTRIE (officiel)"),
    (2084, 1840, "Santé (TSEC) -> M-SANTÉ (officiel)"),
    (1963, 1779, "BTP (TSEC) -> F-BÂTIMENT ET TRAVAUX PUBLICS (officiel)"),
    (1725, 2192, "A-AGRICULTURE ET PÊCHE (officiel) -> Agriculture & Agroalimentaire (TSEC, plus complet)"),
    (2164, 1796, "Hôtellerie & Tourisme (TSEC) -> H-HÔTELLERIE, RESTAURATION ET TOURISME (officiel)"),
    (2246, 1821, "Communication & Médias (TSEC) -> J-COMMUNICATION, MÉDIA ET MULTIMÉDIA (officiel)"),
    (2231, 1851, "Éducation & Formation (TSEC) -> O-FORMATION, ENSEIGNEMENT ET RECHERCHE SCIENTIFIQUE (officiel)"),
]


class Command(BaseCommand):
    help = "Fusionne 7 paires de secteurs racines dupliqués (officiel ANEM <-> TAFTECH) au niveau de la hiérarchie métier."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="N'écrit rien, affiche seulement ce qui serait fait.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("Mode --dry-run : aucune écriture en base."))

        for source_id, cible_id, note in PAIRES:
            self._fusionner_secteur(source_id, cible_id, note, dry_run)

        self.stdout.write(self.style.SUCCESS("Terminé."))

    # -- helpers -------------------------------------------------------------

    def _relier_ou_deplacer_metier(self, m, cible_map, cible_groupe, dry_run):
        """m : Metier à traiter. cible_map : dict normalisé {libelle: Metier} du côté cible.
        cible_groupe : GroupeMetier où déplacer m si aucun homonyme n'existe."""
        m_existant = cible_map.get(_norm(m.libelle))
        if m_existant:
            self.stdout.write(f"      métier doublon relié : {m.libelle!r} [{m.id}] -> canonique [{m_existant.id}]")
            if not dry_run:
                m.metier_canonique = m_existant
                # groupe_principal a on_delete=SET_NULL — le groupe source sera supprimé juste
                # après, sans réaffectation ce champ deviendrait NULL (incohérent avec le pattern
                # déjà établi : un métier avec metier_canonique garde toujours un groupe_principal
                # valide, voir fusionner_secteurs_doublons.py).
                m.groupe_principal_id = m_existant.groupe_principal_id
                m.save(update_fields=['metier_canonique', 'groupe_principal'])
        else:
            self.stdout.write(f"      métier unique déplacé : {m.libelle!r} [{m.id}] -> {cible_groupe.libelle!r} [{cible_groupe.id}]")
            if not dry_run:
                m.groupe_principal = cible_groupe
                m.save(update_fields=['groupe_principal'])

    def _nb_metiers_sous(self, groupe):
        """Compte récursif (métiers directs + sous-domaines) — sert à décider si un domaine/
        sous-domaine sans collision de nom vaut la peine d'être reparenté ou peut être ignoré
        (vide, pas de contenu réel à préserver)."""
        total = Metier.objects.filter(groupe_principal_id=groupe.id).count()
        for enfant in GroupeMetier.objects.filter(parent_id=groupe.id):
            total += self._nb_metiers_sous(enfant)
        return total

    def _fusionner_sous_domaine(self, sd_source, sd_cible, dry_run):
        cible_map = {_norm(m.libelle): m for m in Metier.objects.filter(groupe_principal_id=sd_cible.id)}
        for m in list(Metier.objects.filter(groupe_principal_id=sd_source.id)):
            self._relier_ou_deplacer_metier(m, cible_map, sd_cible, dry_run)

    def _fusionner_domaine(self, domaine_source, domaine_cible, dry_run):
        # Métiers attachés directement au domaine (pas via un sous-domaine).
        cible_map_direct = {_norm(m.libelle): m for m in Metier.objects.filter(groupe_principal_id=domaine_cible.id)}
        for m in list(Metier.objects.filter(groupe_principal_id=domaine_source.id)):
            self._relier_ou_deplacer_metier(m, cible_map_direct, domaine_cible, dry_run)

        sous_domaines_cibles = {_norm(sd.libelle): sd for sd in GroupeMetier.objects.filter(parent_id=domaine_cible.id)}
        for sd in list(GroupeMetier.objects.filter(parent_id=domaine_source.id)):
            sd_existant = sous_domaines_cibles.get(_norm(sd.libelle))
            if sd_existant:
                self.stdout.write(f"    sous-domaine fusionné : {sd.libelle!r} [{sd.id}] -> {sd_existant.libelle!r} [{sd_existant.id}]")
                self._fusionner_sous_domaine(sd, sd_existant, dry_run)
                if not dry_run:
                    sd.delete()
            elif self._nb_metiers_sous(sd) > 0:
                self.stdout.write(f"    sous-domaine sans équivalent reparenté : {sd.libelle!r} [{sd.id}] -> sous {domaine_cible.libelle!r} [{domaine_cible.id}]")
                if not dry_run:
                    sd.parent = domaine_cible
                    sd.save(update_fields=['parent'])
            else:
                self.stdout.write(f"    sous-domaine vide ignoré : {sd.libelle!r} [{sd.id}] (sera supprimé)")

    def _fusionner_secteur(self, source_id, cible_id, note, dry_run):
        self.stdout.write(f"\n=== FUSION SECTEUR : {note} ===")
        try:
            secteur_source = GroupeMetier.objects.get(pk=source_id, type_groupe='secteur_source')
        except GroupeMetier.DoesNotExist:
            self.stdout.write("   déjà fusionné (secteur source introuvable) — ignoré.")
            return
        secteur_cible = GroupeMetier.objects.get(pk=cible_id, type_groupe='secteur_source')

        with transaction.atomic():
            # Métiers attachés directement au secteur (rare mais possible).
            cible_map_direct = {_norm(m.libelle): m for m in Metier.objects.filter(groupe_principal_id=secteur_cible.id)}
            for m in list(Metier.objects.filter(groupe_principal_id=secteur_source.id)):
                self._relier_ou_deplacer_metier(m, cible_map_direct, secteur_cible, dry_run)

            domaines_cibles = {_norm(d.libelle): d for d in GroupeMetier.objects.filter(parent_id=secteur_cible.id)}
            for domaine in list(GroupeMetier.objects.filter(parent_id=secteur_source.id)):
                d_existant = domaines_cibles.get(_norm(domaine.libelle))
                if d_existant:
                    self.stdout.write(f"  domaine fusionné : {domaine.libelle!r} [{domaine.id}] -> {d_existant.libelle!r} [{d_existant.id}]")
                    self._fusionner_domaine(domaine, d_existant, dry_run)
                    if not dry_run:
                        domaine.delete()
                elif self._nb_metiers_sous(domaine) > 0:
                    self.stdout.write(f"  domaine sans équivalent reparenté : {domaine.libelle!r} [{domaine.id}] -> sous {secteur_cible.libelle!r} [{secteur_cible.id}]")
                    if not dry_run:
                        domaine.parent = secteur_cible
                        domaine.save(update_fields=['parent'])
                else:
                    self.stdout.write(f"  domaine vide ignoré : {domaine.libelle!r} [{domaine.id}] (sera supprimé)")

            if not dry_run:
                secteur_source.delete()
                self.stdout.write(f"   secteur {secteur_source.libelle!r} et ses domaines vidés supprimés.")
            else:
                self.stdout.write(f"   [dry-run] secteur {secteur_source.libelle!r} serait supprimé avec ses domaines vidés.")
