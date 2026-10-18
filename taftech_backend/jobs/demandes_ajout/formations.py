"""Lien entre les demandes d'ajout et les formations des candidats : une formation saisie en
« Autre, préciser » (diplôme ou spécialité absent de la liste) crée ou rejoint une demande, et la
décision de l'admin met la formation à jour."""
import logging

from django.utils import timezone

from ..models import DemandeAjout, FormationCandidat
from .regles import CONTEXTE_MAX, LIBELLE_MIN, DemandeRefusee, nettoyer

logger = logging.getLogger(__name__)

CODE_DIPLOME_AUTRE = 'D-AUTRE'


def _demande_ou_none(utilisateur, type_demande, libelle, contexte):
    """Crée ou rejoint la demande. Un refus métier (entrée déjà existante, déjà refusée, quota...) n'est
    jamais bloquant pour l'enregistrement de la formation : on renvoie simplement None."""
    from .service import creer_demande
    try:
        demande, _deja = creer_demande(utilisateur, type_demande, libelle, contexte, explicite=True)
    except DemandeRefusee as refus:
        logger.info("Demande %s non créée pour une formation : %s (%s)", type_demande, refus.message, refus.code)
        return None
    return demande


def _specialite_a_preciser(formation, autre_diplome):
    """Vrai si la formation attend une vérification à cause de sa spécialité (mécanisme existant de
    `FormationCandidat.save()`) : un vrai diplôme, aucune spécialité de référence, un texte dans `description`."""
    return (
        not autre_diplome and formation.statut_validation == 'A_PRECISER'
        and not formation.specialite_ref_id and bool(nettoyer(formation.description))
    )


def synchroniser_depuis_formation(formation, utilisateur, specialite_autre=''):
    """À appeler après l'enregistrement d'une formation. Pose ou retire les liens `demande_diplome` et
    `demande_specialite` selon ce que le candidat a réellement renseigné.

    - Diplôme : « Autre diplôme » (`D-AUTRE`) ou aucun diplôme de référence, avec un texte d'au moins
      3 caractères → demande de type diplôme. Dès qu'un vrai diplôme est choisi, le lien est retiré.
    - Spécialité : aucune spécialité de référence et un texte « Autre spécialité » explicitement envoyé
      par le formulaire → demande de type spécialité (le diplôme sert de contexte)."""
    champs = {}

    diplome_ref = formation.diplome_ref
    # Seul « Autre diplôme » (D-AUTRE) est une demande : sans type choisi, `diplome` est l'intitulé de la
    # formation (ex. « Informatique pour débutants »), pas un type de diplôme à ajouter au référentiel.
    autre_diplome = diplome_ref is not None and diplome_ref.code == CODE_DIPLOME_AUTRE
    texte_diplome = nettoyer(formation.diplome)
    if autre_diplome and len(texte_diplome) >= LIBELLE_MIN:
        demande = _demande_ou_none(utilisateur, DemandeAjout.TYPE_DIPLOME, texte_diplome, '')
        if demande is not None and formation.demande_diplome_id != demande.pk:
            champs['demande_diplome'] = demande
    elif diplome_ref is not None and not autre_diplome and formation.demande_diplome_id:
        # Un vrai diplôme a été choisi depuis : la demande ne concerne plus cette formation.
        champs['demande_diplome'] = None

    texte_specialite = nettoyer(specialite_autre)
    if not texte_specialite and _specialite_a_preciser(formation, autre_diplome):
        # Formation importée (CV, assistant) dont la spécialité n'a pas été résolue : l'ancienne file
        # « Formations à vérifier » la montrait à l'admin, elle devient une demande de spécialité.
        texte_specialite = nettoyer(formation.description)
    if not formation.specialite_ref_id and len(texte_specialite) >= LIBELLE_MIN:
        demande = _demande_ou_none(
            utilisateur, DemandeAjout.TYPE_SPECIALITE, texte_specialite, texte_diplome[:CONTEXTE_MAX],
        )
        if demande is not None and formation.demande_specialite_id != demande.pk:
            champs['demande_specialite'] = demande
    elif formation.specialite_ref_id and formation.demande_specialite_id:
        # Une vraie spécialité a été choisie depuis. Sans texte envoyé et sans spécialité résolue (le champ
        # n'a simplement pas été modifié), le lien est conservé pour que la décision s'applique encore.
        champs['demande_specialite'] = None

    if champs:
        # `update()` : ne passe pas par FormationCandidat.save(), qui recalcule le statut de validation.
        FormationCandidat.objects.filter(pk=formation.pk).update(**champs)
        for nom, valeur in champs.items():
            setattr(formation, nom, valeur)


def appliquer_diplome_aux_formations(demande, diplome_id):
    """Décision acceptée ou rattachée : les formations liées reçoivent le type de diplôme. `save()` remet
    seul le statut de validation à « déclaré » (le mécanisme existant)."""
    for formation in FormationCandidat.objects.filter(demande_diplome=demande):
        formation.diplome_ref_id = diplome_id
        formation.save()


def appliquer_specialite_aux_formations(demande, specialite_id):
    for formation in FormationCandidat.objects.filter(demande_specialite=demande):
        formation.specialite_ref_id = specialite_id
        formation.save()


def refuser_formations_liees(demande, utilisateur, motif):
    """Un type de diplôme refusé : les formations qui s'y rattachent sont marquées « refusées » (motif,
    auteur, date conservés, comme le refus actuel depuis « Formations à vérifier »). Une spécialité
    refusée ne marque pas la formation : son diplôme peut être parfaitement valide.
    `update()` plutôt que `save()` : save() remettrait aussitôt le statut à « déclaré » pour `D-AUTRE`."""
    if demande.type != DemandeAjout.TYPE_DIPLOME:
        return
    FormationCandidat.objects.filter(demande_diplome=demande).update(
        statut_validation='REFUSEE', motif_refus=motif, refusee_par=utilisateur, date_refus=timezone.now(),
    )
