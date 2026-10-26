"""Sort du compte d'un membre retiré de l'équipe.

Un compte créé par l'acceptation d'une invitation n'a aucune autre raison d'exister : on le supprime
quand le propriétaire ou un administrateur retire ce membre (sinon il reste actif, sans entreprise, et
bloque son e-mail). Jamais pour un compte préexistant, et jamais si la suppression emporterait autre
chose que des données personnelles du compte (le CASCADE de `Questionnaire.recruteur` détruirait les
questionnaires de l'entreprise, par exemple).
"""
from django.db import router, transaction
from django.db.models import ProtectedError, RestrictedError
from django.db.models.deletion import Collector

from .models import MembreEquipe, ProfilEntreprise

# Données propres au compte, sans valeur pour l'entreprise : leur disparition est admise.
MODELES_PERSONNELS_ADMIS = {
    'LogEntry', 'MembreEquipe', 'Notification', 'UtilisationIA', 'QuotaIAOverride', 'ArriveeDemandeur',
}


def donnees_emportees(user):
    """Noms des modèles dont des lignes seraient supprimées en cascade avec `user` (hors liste admise).
    Lecture seule : le Collector ne supprime rien. Un objet protégé compte comme emporté."""
    collector = Collector(using=router.db_for_write(type(user), instance=user))
    try:
        collector.collect([user])
    except (ProtectedError, RestrictedError):
        return {'objet protégé'}
    modeles = {model for model, instances in collector.data.items() if instances and model is not type(user)}
    modeles.update(qs.model for qs in collector.fast_deletes if qs.exists())
    return {
        m.__name__ for m in modeles
        if not m._meta.auto_created and m.__name__ not in MODELES_PERSONNELS_ADMIS
    }


def motif_de_conservation(user):
    """Raison pour laquelle le compte doit rester, ou None s'il peut être supprimé."""
    if not user.compte_cree_par_invitation:
        return "compte préexistant"
    if user.is_staff or user.is_superuser or user.role != 'RECRUTEUR':
        return "compte à privilèges ou hors espace recruteur"
    if ProfilEntreprise.objects.filter(user=user).exists():
        return "propriétaire d'une entreprise"
    if MembreEquipe.objects.filter(user=user).exists():
        return "membre d'une autre équipe"
    emportees = donnees_emportees(user)
    if emportees:
        return "données liées : " + ", ".join(sorted(emportees))
    return None


def supprimer_compte_si_orphelin(user):
    """Supprime le compte d'un membre retiré si c'est sans danger. Renvoie (supprime, motif_de_conservation).
    À appeler APRÈS la suppression du `MembreEquipe`."""
    with transaction.atomic():
        motif = motif_de_conservation(user)
        if motif:
            return False, motif
        user.delete()
    return True, None
