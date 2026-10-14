"""Propositions de métier (correction client n°23) : un recruteur ou un candidat qui ne trouve pas
son métier dans le référentiel le propose ; l'admin décide. Rien n'entre jamais tout seul dans le
référentiel, et une proposition n'a aucun effet (profil, offre, score) tant qu'elle n'est pas validée."""
import logging
import re

from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Appellation, Notification, PropositionMetier
from .referentiel_utils import normaliser_recherche

logger = logging.getLogger(__name__)

LIBELLE_MIN = 3
LIBELLE_MAX = 120
CONTEXTE_MAX = 300
MOTIF_MIN = 5
MOTIF_MAX = 500
MAX_PROPOSITIONS_OUVERTES_PAR_UTILISATEUR = 5

MODE_RATTACHER = 'RATTACHER'
MODE_CREER = 'CREER'


class PropositionRefusee(Exception):
    """Refus métier, avec un `code` stable pour l'interface et un message lisible par l'utilisateur."""

    def __init__(self, message, code, **extra):
        super().__init__(message)
        self.message = message
        self.code = code
        self.extra = extra


def _nettoyer(texte):
    return ' '.join(str(texte or '').split())


def proposer_metier(utilisateur, libelle, contexte, origine):
    """Enregistre une proposition. Retourne `(proposition, deja_proposee)`.

    Refus (PropositionRefusee) : libellé invalide, métier déjà présent dans le référentiel, métier
    déjà examiné et rejeté, trop de propositions ouvertes pour ce compte. Une demande identique à une
    proposition ouverte s'y ajoute (un compte ne compte qu'une fois)."""
    libelle = _nettoyer(libelle)
    contexte = _nettoyer(contexte)

    if not (LIBELLE_MIN <= len(libelle) <= LIBELLE_MAX):
        raise PropositionRefusee(
            f"L'intitulé du métier doit contenir entre {LIBELLE_MIN} et {LIBELLE_MAX} caractères.", 'LIBELLE_INVALIDE',
        )
    if not re.search(r'[^\W\d_]', libelle):
        raise PropositionRefusee("L'intitulé du métier doit contenir des lettres.", 'LIBELLE_INVALIDE')
    if len(contexte) > CONTEXTE_MAX:
        raise PropositionRefusee(f"La précision ne doit pas dépasser {CONTEXTE_MAX} caractères.", 'CONTEXTE_TROP_LONG')

    cle = normaliser_recherche(libelle)
    if not cle:
        raise PropositionRefusee("L'intitulé du métier est invalide.", 'LIBELLE_INVALIDE')

    existante = Appellation.objects.filter(cle_recherche=cle, actif=True).select_related('metier').order_by('id').first()
    if existante is not None:
        raise PropositionRefusee(
            f"Ce métier existe déjà dans la liste (« {existante.metier.libelle} »). Choisissez-le dans la recherche.",
            'METIER_EXISTANT', metier_libelle=existante.metier.libelle,
        )
    if PropositionMetier.objects.filter(cle_recherche=cle, statut=PropositionMetier.STATUT_REJETEE).exists():
        raise PropositionRefusee(
            "Cette proposition a déjà été examinée et n'a pas été retenue.", 'DEJA_REJETEE',
        )

    def _ajouter_a(ouverte):
        if ouverte.demandeurs.filter(pk=utilisateur.pk).exists():
            return ouverte, True
        _verifier_quota(utilisateur)
        ouverte.demandeurs.add(utilisateur)
        return ouverte, True

    ouverte = PropositionMetier.objects.filter(cle_recherche=cle, statut=PropositionMetier.STATUT_SUGGEREE).first()
    if ouverte is not None:
        return _ajouter_a(ouverte)

    _verifier_quota(utilisateur)
    try:
        with transaction.atomic():
            proposition = PropositionMetier.objects.create(
                libelle=libelle, cle_recherche=cle, contexte=contexte, origine=origine, proposee_par=utilisateur,
            )
            proposition.demandeurs.add(utilisateur)
        return proposition, False
    except IntegrityError:
        # Requête simultanée : une proposition ouverte vient d'être créée pour ce libellé.
        ouverte = PropositionMetier.objects.get(cle_recherche=cle, statut=PropositionMetier.STATUT_SUGGEREE)
        return _ajouter_a(ouverte)


def _verifier_quota(utilisateur):
    ouvertes = PropositionMetier.objects.filter(
        demandeurs=utilisateur, statut=PropositionMetier.STATUT_SUGGEREE,
    ).count()
    if ouvertes >= MAX_PROPOSITIONS_OUVERTES_PAR_UTILISATEUR:
        raise PropositionRefusee(
            f"Vous avez déjà {MAX_PROPOSITIONS_OUVERTES_PAR_UTILISATEUR} propositions en attente. "
            "Attendez qu'elles soient examinées avant d'en envoyer d'autres.",
            'TROP_DE_PROPOSITIONS',
        )


def _notifier(proposition, titre, message):
    """Informe les demandeurs de la décision. Un échec de notification ne doit jamais annuler la décision."""
    try:
        Notification.objects.bulk_create([
            Notification(destinataire=u, type_notif='INFO', titre=titre, message=message)
            for u in proposition.demandeurs.all()
        ])
    except Exception:
        logger.exception("Notification de décision de proposition de métier %s impossible", proposition.pk)


def valider_proposition(proposition, utilisateur, mode, metier=None, groupe=None):
    """Valide une proposition. `mode` = RATTACHER (appellation d'un métier existant, `metier` requis)
    ou CREER (nouveau métier dans `groupe`). Lève ValueError si la décision est impossible."""
    with transaction.atomic():
        courante = PropositionMetier.objects.select_for_update().get(pk=proposition.pk)
        if PropositionMetier.STATUT_VALIDEE not in PropositionMetier.TRANSITIONS.get(courante.statut, set()):
            raise ValueError("Cette proposition ne peut plus être validée.")
        if Appellation.objects.filter(cle_recherche=courante.cle_recherche, actif=True).exists():
            raise ValueError("Ce libellé existe déjà comme appellation d'un métier du référentiel.")

        code_appellation = f"TAF-AP-{courante.pk}"
        if mode == MODE_RATTACHER:
            if metier is None:
                raise ValueError("Choisissez le métier auquel rattacher cet intitulé.")
            cible = metier.metier_canonique or metier
            if not cible.selectionnable:
                raise ValueError("Ce métier n'est plus proposé dans le référentiel : choisissez-en un autre.")
            issue = PropositionMetier.ISSUE_RATTACHEE
        elif mode == MODE_CREER:
            if groupe is None:
                raise ValueError("Choisissez le groupe du nouveau métier.")
            from .models import Metier
            cible = Metier.objects.create(
                code=f"TAF-PM-{courante.pk}", libelle=courante.libelle, cle_recherche=courante.cle_recherche,
                granularite='metier', groupe_principal=groupe, selectionnable=True, statut='actif',
            )
            cible.metier_canonique = cible
            cible.save(update_fields=['metier_canonique'])
            issue = PropositionMetier.ISSUE_CREEE
        else:
            raise ValueError("Mode de validation inconnu.")

        Appellation.objects.create(
            code=code_appellation, metier=cible, libelle=courante.libelle, cle_recherche=courante.cle_recherche,
            langue='fr', type_alias='proposition', ambiguite=False, actif=True,
        )
        courante.statut = PropositionMetier.STATUT_VALIDEE
        courante.issue = issue
        courante.metier_resultat = cible
        courante.motif_rejet = ''
        courante.date_statut = timezone.now()
        courante.traite_par = utilisateur
        courante.save()

    _notifier(
        courante, "Métier ajouté à la liste",
        f"Votre proposition « {courante.libelle} » a été acceptée : vous pouvez maintenant la choisir dans la liste des métiers.",
    )
    return courante


def rejeter_proposition(proposition, utilisateur, motif):
    """Rejette une proposition ouverte, avec un motif obligatoire (visible du proposant)."""
    motif = _nettoyer(motif)
    if len(motif) < MOTIF_MIN:
        raise ValueError(f"Indiquez un motif de rejet (au moins {MOTIF_MIN} caractères).")
    if len(motif) > MOTIF_MAX:
        raise ValueError(f"Le motif ne doit pas dépasser {MOTIF_MAX} caractères.")
    with transaction.atomic():
        courante = PropositionMetier.objects.select_for_update().get(pk=proposition.pk)
        if PropositionMetier.STATUT_REJETEE not in PropositionMetier.TRANSITIONS.get(courante.statut, set()):
            raise ValueError("Cette proposition ne peut plus être rejetée.")
        courante.statut = PropositionMetier.STATUT_REJETEE
        courante.motif_rejet = motif
        courante.date_statut = timezone.now()
        courante.traite_par = utilisateur
        courante.save()

    _notifier(
        courante, "Proposition de métier non retenue",
        f"Votre proposition « {courante.libelle} » n'a pas été retenue. Motif : {motif}",
    )
    return courante
