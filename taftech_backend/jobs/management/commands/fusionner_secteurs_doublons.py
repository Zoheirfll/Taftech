"""Fusionne le contenu de 5 secteurs "autonomes" (TSEC-*) qui faisaient doublon avec des
domaines déjà riches existant sous "Informatique"/"Industrie" — trouvé en auditant
l'incohérence hiérarchique signalée par l'utilisateur (2026-09-25) : "Informatique",
"Intelligence Artificielle" et "Cloud Computing" apparaissaient comme 3 secteurs
PARALLÈLES alors que IA/Cloud/Cybersécurité sont déjà des domaines sous Informatique.

Contrairement aux 3 fusions déjà faites en direct (Nucléaire/Lubrifiants/Dispositifs
Médicaux -> aucune collision, simple reparentage), ces 5 cas ont du contenu RÉELLEMENT
CHEVAUCHANT MAIS PAS IDENTIQUE entre l'arbre autonome et le domaine déjà existant (ex:
"Ingénieur Deep Learning" n'existait QUE côté secteur autonome IA, "Prompt Engineer" QUE
côté domaine Informatique>Intelligence Artificielle) — nécessite une vraie fusion :
- Métier avec un homonyme exact déjà dans la cible -> relié via `metier_canonique`
  (même mécanisme déjà utilisé dans le référentiel pour les 41 doublons/44 redirections
  de métiers existants), jamais dupliqué.
- Métier sans équivalent -> déplacé (`groupe_principal`) vers le sous-domaine de même nom
  dans la cible, ou vers un nouveau sous-domaine reparenté si aucun homonyme n'existe.
- Domaines/secteur devenus vides après la fusion -> supprimés.

Idempotente par construction : si relancée après un premier passage réussi, les secteurs
sources n'existent plus (`GroupeMetier.DoesNotExist` -> ignoré proprement par paire)."""
import unicodedata
import re

from django.core.management.base import BaseCommand
from django.db import transaction

from jobs.models import GroupeMetier, Metier


def _norm(s):
    s = unicodedata.normalize('NFKD', s.strip().lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', s)


# (libellé du secteur autonome à fusionner, libellés des domaines cibles où fusionner
# — domaines déjà existants sous Informatique/Industrie, identifiés par leur libellé
# + leur secteur parent pour éviter toute ambiguïté de nom)
PAIRES_A_FUSIONNER = [
    ('Intelligence Artificielle', 'Informatique', ['Intelligence Artificielle']),
    ('Cloud Computing', 'Informatique', ['Cloud Computing']),
    ('Cybersécurité', 'Informatique', ['Cybersécurité']),
    ('Instrumentation & Automatisme', 'Industrie', ['Instrumentation', 'Automatisme']),
    ('Maintenance Industrielle', 'Industrie', ['Maintenance Industrielle']),
]


class Command(BaseCommand):
    help = "Fusionne le contenu des 5 secteurs autonomes en doublon avec des domaines déjà existants sous Informatique/Industrie (voir docstring du fichier)."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="N'écrit rien, affiche seulement ce qui serait fait.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("Mode --dry-run : aucune écriture en base."))

        for secteur_libelle, parent_secteur_libelle, domaines_cibles_libelles in PAIRES_A_FUSIONNER:
            self._fusionner(secteur_libelle, parent_secteur_libelle, domaines_cibles_libelles, dry_run)

        self.stdout.write(self.style.SUCCESS("Terminé."))

    def _fusionner(self, secteur_libelle, parent_secteur_libelle, domaines_cibles_libelles, dry_run):
        self.stdout.write(f"\n=== FUSION : {secteur_libelle} -> {parent_secteur_libelle} ({', '.join(domaines_cibles_libelles)}) ===")

        try:
            secteur = GroupeMetier.objects.get(type_groupe='secteur_source', libelle=secteur_libelle)
        except GroupeMetier.DoesNotExist:
            self.stdout.write("   déjà fusionné (secteur introuvable) — ignoré.")
            return

        parent_secteur = GroupeMetier.objects.get(type_groupe='secteur_source', libelle=parent_secteur_libelle)
        cibles = list(GroupeMetier.objects.filter(
            type_groupe='domaine_source', parent_id=parent_secteur.id, libelle__in=domaines_cibles_libelles,
        ))
        if len(cibles) != len(domaines_cibles_libelles):
            self.stdout.write(self.style.ERROR(f"   domaine(s) cible(s) introuvable(s) sous {parent_secteur_libelle!r}, abandon de cette paire."))
            return

        sous_domaines_cibles = {
            _norm(sd.libelle): sd
            for cible in cibles
            for sd in GroupeMetier.objects.filter(parent_id=cible.id)
        }
        metiers_cibles = {
            _norm(m.libelle): m
            for sd in sous_domaines_cibles.values()
            for m in Metier.objects.filter(groupe_principal_id=sd.id)
        }

        with transaction.atomic():
            domaines_source = list(GroupeMetier.objects.filter(parent_id=secteur.id))
            for domaine in domaines_source:
                for sd in list(GroupeMetier.objects.filter(parent_id=domaine.id)):
                    sd_existant = sous_domaines_cibles.get(_norm(sd.libelle))
                    metiers = list(Metier.objects.filter(groupe_principal_id=sd.id))

                    if not metiers and sd_existant is None:
                        # sous-domaine vide sans équivalent -> rien à faire, sera supprimé
                        # (aucun métier), pas de reparentage utile.
                        continue

                    if sd_existant is None:
                        # aucun sous-domaine cible correspondant -> le sous-domaine source
                        # lui-même devient un nouveau sous-domaine de la cible (préserve la
                        # catégorie, pas de perte de nuance).
                        cible_parent = cibles[0]
                        self.stdout.write(f"   sous-domaine sans équivalent reparenté : {sd.libelle!r} [{sd.id}] -> sous {cible_parent.libelle!r} [{cible_parent.id}]")
                        if not dry_run:
                            sd.parent = cible_parent
                            sd.save(update_fields=['parent'])
                        continue

                    for m in metiers:
                        m_existant = metiers_cibles.get(_norm(m.libelle))
                        if m_existant:
                            self.stdout.write(f"   métier doublon relié : {m.libelle!r} [{m.id}] -> canonique [{m_existant.id}]")
                            if not dry_run:
                                m.metier_canonique = m_existant
                                # `groupe_principal` a `on_delete=SET_NULL` — le sous-domaine
                                # `sd` (qui hébergeait ce métier) est supprimé juste après ;
                                # sans réaffectation explicite ici, `groupe_principal`
                                # deviendrait NULL, incohérent avec le pattern déjà établi des
                                # 44 redirections existantes (un métier avec `metier_canonique`
                                # garde toujours son propre `groupe_principal` valide). On le
                                # fait pointer vers le même groupe que le métier canonique.
                                m.groupe_principal_id = m_existant.groupe_principal_id
                                m.save(update_fields=['metier_canonique', 'groupe_principal'])
                        else:
                            self.stdout.write(f"   métier unique déplacé : {m.libelle!r} [{m.id}] -> sous-domaine existant [{sd_existant.id}] {sd_existant.libelle!r}")
                            if not dry_run:
                                m.groupe_principal = sd_existant
                                m.save(update_fields=['groupe_principal'])

                    if not dry_run:
                        # tous les métiers de ce sous-domaine ont été reliés/déplacés -> le
                        # sous-domaine source est maintenant vide, supprimé.
                        sd.delete()

                if not dry_run:
                    domaine.delete()

            if not dry_run:
                secteur.delete()
                self.stdout.write(f"   secteur {secteur_libelle!r} et ses domaines vides supprimés.")
            else:
                self.stdout.write(f"   [dry-run] secteur {secteur_libelle!r} serait supprimé avec ses domaines vidés.")
