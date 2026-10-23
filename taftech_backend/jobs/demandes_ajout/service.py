"""Service des demandes d'ajout au référentiel : création avec garde-fous, puis les trois décisions de
l'admin (accepter, rattacher, refuser). La logique propre à chaque type vit dans les adaptateurs ; ce
fichier ne connaît que le cycle de vie, les limites et les notifications."""
import logging
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from ..models import ArriveeDemandeur, DemandeAjout, Notification
from ..referentiel_utils import normaliser_recherche
from .adaptateurs import adaptateur_pour
from .formations import refuser_formations_liees
from .regles import (
    MAX_EXPLICITES_OUVERTES, MAX_IMPLICITES_PAR_JOUR, DemandeRefusee, nettoyer, valider_contexte, valider_libelle,
    valider_motif,
)

logger = logging.getLogger(__name__)


def _origine(utilisateur):
    if getattr(utilisateur, 'role', None) == 'CANDIDAT':
        return DemandeAjout.ORIGINE_CANDIDAT
    return DemandeAjout.ORIGINE_RECRUTEUR


def enregistrer_demandeur(demande, utilisateur):
    """Ajoute `utilisateur` aux demandeurs de `demande` et date son arrivée. Idempotent : un même compte ne
    crée jamais une seconde ligne, la date conservée est celle de sa première demande."""
    demande.demandeurs.add(utilisateur)
    ArriveeDemandeur.objects.get_or_create(demande=demande, utilisateur=utilisateur)


def _verifier_quota_explicite(utilisateur):
    ouvertes = DemandeAjout.objects.filter(
        demandeurs=utilisateur, statut=DemandeAjout.STATUT_A_EXAMINER, explicite=True,
    ).count()
    if ouvertes >= MAX_EXPLICITES_OUVERTES:
        raise DemandeRefusee(
            f"Vous avez déjà {MAX_EXPLICITES_OUVERTES} demandes en attente. "
            "Attendez qu'elles soient examinées avant d'en envoyer d'autres.",
            'TROP_DE_DEMANDES',
        )


def _verifier_quota_implicite(utilisateur):
    recentes = DemandeAjout.objects.filter(
        premier_demandeur=utilisateur, explicite=False, date_creation__gte=timezone.now() - timedelta(hours=24),
    ).count()
    if recentes >= MAX_IMPLICITES_PAR_JOUR:
        raise DemandeRefusee("Trop de nouvelles demandes en 24 heures.", 'TROP_DE_DEMANDES')


def creer_demande(utilisateur, type_demande, libelle, contexte='', explicite=True):
    """Enregistre une demande. Retourne `(demande, deja_demandee)`.

    Refus (DemandeRefusee, code stable) : type inconnu, libellé invalide, entrée déjà présente dans le
    référentiel, libellé déjà examiné et refusé, trop de demandes. Une demande identique à une demande
    ouverte la rejoint (un compte ne compte qu'une fois)."""
    adaptateur = adaptateur_pour(type_demande)
    libelle = nettoyer(libelle)
    contexte = nettoyer(contexte)
    valider_libelle(libelle)
    valider_contexte(contexte)
    cle = normaliser_recherche(libelle)
    if not cle or not adaptateur.libelle_valide(libelle):
        raise DemandeRefusee("Le libellé est invalide.", 'LIBELLE_INVALIDE')

    existant = adaptateur.libelle_existant(cle)
    if existant:
        raise DemandeRefusee(
            f"Cette entrée existe déjà dans la liste (« {existant} »). Choisissez-la dans la recherche.",
            'ENTREE_EXISTANTE', entree_libelle=existant,
        )
    if DemandeAjout.objects.filter(type=type_demande, cle_recherche=cle, statut=DemandeAjout.STATUT_REFUSEE).exists():
        raise DemandeRefusee("Cette demande a déjà été examinée et n'a pas été retenue.", 'DEJA_REFUSEE')

    def _rejoindre(ouverte):
        if not ouverte.demandeurs.filter(pk=utilisateur.pk).exists():
            if explicite:
                _verifier_quota_explicite(utilisateur)
            enregistrer_demandeur(ouverte, utilisateur)
        if explicite and not ouverte.explicite:
            # Une demande créée par simple saisie devient explicite dès qu'une personne la réclame : elle sera notifiée.
            ouverte.explicite = True
            ouverte.save(update_fields=['explicite'])
        return ouverte, True

    ouverte = DemandeAjout.objects.filter(
        type=type_demande, cle_recherche=cle, statut=DemandeAjout.STATUT_A_EXAMINER,
    ).order_by('id').first()
    if ouverte is not None:
        return _rejoindre(ouverte)

    if explicite:
        _verifier_quota_explicite(utilisateur)
    else:
        _verifier_quota_implicite(utilisateur)
    try:
        with transaction.atomic():
            demande = DemandeAjout.objects.create(
                type=type_demande, libelle=libelle, cle_recherche=cle, contexte=contexte, explicite=explicite,
                origine=_origine(utilisateur), premier_demandeur=utilisateur,
            )
            enregistrer_demandeur(demande, utilisateur)
        return demande, False
    except IntegrityError:
        # Requête simultanée : une demande ouverte vient d'être créée pour ce libellé.
        return _rejoindre(DemandeAjout.objects.get(
            type=type_demande, cle_recherche=cle, statut=DemandeAjout.STATUT_A_EXAMINER,
        ))


def demander_competence_saisie(utilisateur, libelle):
    """Compétence saisie hors référentiel (profil, « Mes compétences », offre) : demande implicite, jamais
    bloquante pour la saisie. Retourne la demande, ou None si elle n'a pas lieu d'être (déjà officielle,
    déjà refusée, bruit, plafond atteint)."""
    try:
        return creer_demande(utilisateur, DemandeAjout.TYPE_COMPETENCE, libelle, explicite=False)[0]
    except DemandeRefusee:
        return None


def _lien_notification(utilisateur):
    return '/profil' if getattr(utilisateur, 'role', None) == 'CANDIDAT' else '/dashboard/offres'


def notifier_decision(demande, titre, message):
    """Informe les demandeurs, mais seulement pour une demande explicite. Un échec de notification ne doit
    jamais annuler la décision."""
    if not demande.explicite:
        return
    try:
        Notification.objects.bulk_create([
            Notification(
                destinataire=utilisateur, type_notif='INFO', titre=titre, message=message,
                lien=_lien_notification(utilisateur),
            )
            for utilisateur in demande.demandeurs.all()
        ])
    except Exception:
        logger.exception("Notification de décision de la demande d'ajout %s impossible", demande.pk)


def _decider(demande, utilisateur, statut_cible, agir):
    """Applique une décision sous verrou de ligne. `agir(courante, adaptateur)` retourne
    `(entree_id, entree_libelle)` pour une acceptation ou un rattachement, `None` pour un refus."""
    with transaction.atomic():
        courante = DemandeAjout.objects.select_for_update().get(pk=demande.pk)
        if statut_cible not in DemandeAjout.TRANSITIONS.get(courante.statut, set()):
            raise ValueError("Cette demande ne peut plus recevoir cette décision.")
        try:
            adaptateur = adaptateur_pour(courante.type)
        except DemandeRefusee as refus:
            raise ValueError(refus.message)
        entree = agir(courante, adaptateur)
        courante.statut = statut_cible
        courante.traite_par = utilisateur
        courante.date_decision = timezone.now()
        if entree:
            courante.entree_id, courante.entree_libelle = entree
            courante.motif_refus = ''
        courante.save()
        if entree:
            adaptateur.appliquer(courante, entree[0])
    return courante


def accepter_demande(demande, utilisateur, libelle=None, parent=None, options=None):
    """Crée l'entrée officielle. `libelle` : formulation corrigée par l'admin (sinon celle de la demande)."""
    def agir(courante, adaptateur):
        texte = nettoyer(libelle) or courante.libelle
        try:
            valider_libelle(texte)
        except DemandeRefusee as refus:
            raise ValueError(refus.message)
        return adaptateur.accepter(courante, texte, parent, options or {})

    acceptee = _decider(demande, utilisateur, DemandeAjout.STATUT_ACCEPTEE, agir)
    notifier_decision(
        acceptee, "Demande acceptée",
        f"Votre demande « {acceptee.libelle} » a été acceptée : « {acceptee.entree_libelle} » est maintenant "
        "disponible dans la liste.",
    )
    return acceptee


def rattacher_demande(demande, utilisateur, entree_id):
    """Le libellé de la demande devient un alias de l'entrée existante choisie."""
    rattachee = _decider(
        demande, utilisateur, DemandeAjout.STATUT_RATTACHEE,
        lambda courante, adaptateur: adaptateur.rattacher(courante, entree_id),
    )
    notifier_decision(
        rattachee, "Demande rattachée",
        f"Votre demande « {rattachee.libelle} » a été rattachée à « {rattachee.entree_libelle} » : "
        "ce libellé est maintenant reconnu.",
    )
    return rattachee


def refuser_demande(demande, utilisateur, motif):
    """Refuse une demande, avec un motif obligatoire visible du demandeur."""
    motif = nettoyer(motif)
    valider_motif(motif)

    def agir(courante, _adaptateur):
        courante.motif_refus = motif
        refuser_formations_liees(courante, utilisateur, motif)
        return None

    refusee = _decider(demande, utilisateur, DemandeAjout.STATUT_REFUSEE, agir)
    notifier_decision(
        refusee, "Demande non retenue",
        f"Votre demande « {refusee.libelle} » n'a pas été retenue. Motif : {motif}",
    )
    return refusee
