"""Ajoute au référentiel les appellations et métiers listés dans `jobs/data/referentiel_ajouts.json`
(fichier versionné : source de vérité des ajouts faits en dehors des classeurs du client).

- Une APPELLATION s'ajoute à un métier officiel existant (cible désignée par son code) : le candidat qui
  écrit « Organisateur industriel » est reconnu sans créer de métier en doublon.
- Un MÉTIER s'ajoute dans un domaine ou sous-domaine existant (désigné par son code), comme le fait
  l'acceptation d'une demande d'ajout (`demandes_ajout/adaptateurs.py`).

Idempotente (relancée, chaque ajout déjà fait est signalé `[déjà fait]`), tout-ou-rien (une cible ou un
groupe introuvable annule tout) et `--dry-run` exécute tout dans une transaction annulée. L'import du
référentiel ne supprime rien : cette commande peut être rejouée après chaque import, sans risque."""
import json
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from jobs.demandes_ajout.adaptateurs import TYPES_GROUPE_METIER
from jobs.models import Appellation, DiplomeSpecialite, GroupeMetier, Metier, SpecialiteFormation, TypeDiplome
from jobs.referentiel_utils import normaliser_recherche

CHEMIN_DEFAUT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "referentiel_ajouts.json"))
TYPE_ALIAS = "ajout_referentiel"
TYPE_COUPLE = "ajout_referentiel"  # statut du couple diplôme ↔ spécialité (aucun code ne filtre sur ce champ)


class _Annulation(Exception):
    pass


class Command(BaseCommand):
    help = "Ajoute au référentiel les appellations et métiers de jobs/data/referentiel_ajouts.json."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Rapport complet, rien n'est écrit.")
        parser.add_argument("--fichier", default=CHEMIN_DEFAUT, help="Fichier JSON des ajouts.")

    def handle(self, *args, **options):
        with open(options["fichier"], encoding="utf-8") as f:
            donnees = json.load(f)
        try:
            with transaction.atomic():
                self._appliquer(donnees.get("appellations", []), donnees.get("metiers", []), donnees.get("couples", []))
                if options["dry_run"]:
                    raise _Annulation()
        except _Annulation:
            self.stdout.write("DRY-RUN : rien n'est écrit.")

    def _appliquer(self, appellations, metiers, couples=()):
        for entree in appellations:
            cible = Metier.objects.filter(code=entree["metier"], selectionnable=True).first()
            if cible is None:
                raise CommandError(f"Métier cible introuvable : {entree['metier']} (« {entree['libelle']} »).")
            self._ajouter_appellation(f"TAF-AJ-{entree['id']}", cible.metier_canonique or cible, entree["libelle"])
        for entree in metiers:
            groupe = GroupeMetier.objects.filter(code=entree["groupe"], type_groupe__in=TYPES_GROUPE_METIER).first()
            if groupe is None:
                raise CommandError(f"Groupe introuvable : {entree['groupe']} (« {entree['libelle']} »).")
            self._ajouter_metier(f"TAF-AJ-{entree['id']}", groupe, entree["libelle"])
        for entree in couples:
            self._ajouter_couple(f"TAF-AJ-{entree['id']}", entree["diplome"], entree["specialite"])

    def _ajouter_couple(self, code, code_diplome, code_specialite):
        """Spécialité reconnue pour un diplôme : seuls les couples attestés sont proposés au candidat
        (`referentiel_utils.suggerer_specialites_pour_diplome`, règle F06)."""
        diplome = TypeDiplome.objects.filter(code=code_diplome).first()
        specialite = SpecialiteFormation.objects.filter(code=code_specialite).first()
        if diplome is None or specialite is None:
            raise CommandError(f"Couple impossible : diplôme {code_diplome} ou spécialité {code_specialite} introuvable.")
        if DiplomeSpecialite.objects.filter(diplome=diplome, specialite=specialite).exists():
            self.stdout.write(f"[déjà fait] couple « {diplome.libelle} » / « {specialite.libelle} » déjà présent.")
            return
        DiplomeSpecialite.objects.create(
            code=code, diplome=diplome, specialite=specialite, statut=TYPE_COUPLE, selectionnable=True,
            precision="Ajout validé par l'administrateur (jobs/data/referentiel_ajouts.json).")
        self.stdout.write(f"[créé] couple « {diplome.libelle} » / « {specialite.libelle} ».")

    def _appellation_existante(self, cle):
        return Appellation.objects.filter(cle_recherche=cle, actif=True).select_related("metier").order_by("id").first()

    def _ajouter_appellation(self, code, metier, libelle):
        cle = normaliser_recherche(libelle)
        existante = self._appellation_existante(cle)
        if existante:
            self.stdout.write(f"[déjà fait] « {libelle} » existe déjà (métier « {existante.metier.libelle} »).")
            return
        Appellation.objects.create(
            code=code, metier=metier, libelle=libelle, cle_recherche=cle, langue="fr",
            type_alias=TYPE_ALIAS, ambiguite=False, actif=True)
        self.stdout.write(f"[créé] appellation « {libelle} » -> « {metier.libelle} ».")

    def _ajouter_metier(self, code, groupe, libelle):
        cle = normaliser_recherche(libelle)
        existante = self._appellation_existante(cle)
        if Metier.objects.filter(code=code).exists() or existante:
            self.stdout.write(f"[déjà fait] métier « {libelle} » déjà présent.")
            return
        metier = Metier.objects.create(
            code=code, libelle=libelle, cle_recherche=cle, granularite="metier",
            groupe_principal=groupe, selectionnable=True, statut="actif")
        metier.metier_canonique = metier
        metier.save(update_fields=["metier_canonique"])
        Appellation.objects.create(
            code=f"{code}-A", metier=metier, libelle=libelle, cle_recherche=cle, langue="fr",
            type_alias=TYPE_ALIAS, ambiguite=False, actif=True)
        self.stdout.write(f"[créé] métier « {libelle} » dans « {groupe.libelle} ».")
