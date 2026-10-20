"""Filtres des listes de l'administration, PARTAGÉS avec les exports Excel.

Une liste et son export appellent la même fonction : ce que l'administrateur voit à l'écran (recherche,
rôle, statut…) est exactement ce qu'il exporte, sans que les deux puissent diverger."""
import datetime

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from ..models import AuditLog, Candidature, OffreEmploi, ProfilEntreprise, RendezVous

User = get_user_model()

ROLES_UTILISATEUR = ('CANDIDAT', 'RECRUTEUR', 'ADMIN')
STATUTS_OFFRE = ('EN_ATTENTE', 'APPROUVEE', 'REJETEE')
ABONNEMENT_EXPIRE_SOUS_MAX = 365


def _ordre(params, champs_autorises, defaut):
    """Tri demandé si son champ est autorisé, sinon le tri par défaut."""
    ordering = params.get('ordering', defaut)
    return ordering if ordering.lstrip('-') in champs_autorises else defaut


def utilisateurs_recherches(params):
    """Comptes visibles dans la liste (hors super-administrateurs), après la recherche texte seulement :
    la liste en tire ses compteurs par rôle avant d'appliquer le filtre de rôle."""
    users = User.objects.exclude(is_superuser=True).order_by(_ordre(params, ('date_joined', 'last_name'), '-date_joined'))
    search = params.get('search', '')
    if search:
        users = users.filter(
            Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(email__icontains=search)
        )
    return users


def utilisateurs_filtres(params):
    users = utilisateurs_recherches(params)
    role = params.get('role', '')
    return users.filter(role=role) if role in ROLES_UTILISATEUR else users


def offres_filtrees(params):
    offres = OffreEmploi.objects.select_related('entreprise').order_by(
        _ordre(params, ('date_publication', 'date_expiration', 'titre'), '-date_publication'))
    search = params.get('search', '')
    if search:
        offres = offres.filter(Q(titre__icontains=search) | Q(entreprise__nom_entreprise__icontains=search))
    statut = params.get('statut', '')
    if statut == 'CLOTUREE':
        offres = offres.filter(est_cloturee=True)
    elif statut in STATUTS_OFFRE:
        offres = offres.filter(statut_moderation=statut, est_cloturee=False)
    return offres


def entreprises_filtrees(params):
    entreprises = ProfilEntreprise.objects.order_by(_ordre(params, ('id', 'nom_entreprise'), '-id'))
    # Lien de la bannière « abonnements qui expirent » : abonnements encore actifs dont la date d'expiration
    # tombe dans les N prochains jours (même règle que `premium_expirant_bientot`).
    expire_sous = params.get('abonnement_expire_sous', '')
    if expire_sous.isdigit() and 0 < int(expire_sous) <= ABONNEMENT_EXPIRE_SOUS_MAX:
        maintenant = timezone.now()
        entreprises = entreprises.filter(
            abonnement__date_expiration__gte=maintenant,
            abonnement__date_expiration__lte=maintenant + datetime.timedelta(days=int(expire_sous)),
        )
    search = params.get('search', '')
    if search:
        entreprises = entreprises.filter(Q(nom_entreprise__icontains=search) | Q(registre_commerce__icontains=search))
    return entreprises


def candidatures_filtrees(params):
    candidatures = Candidature.objects.select_related('candidat', 'offre__entreprise').order_by(
        _ordre(params, ('date_postulation', 'score_matching', 'note_globale'), '-date_postulation'))
    search = params.get('search', '')
    if search:
        candidatures = candidatures.filter(
            Q(candidat__first_name__icontains=search) | Q(candidat__last_name__icontains=search)
            | Q(nom_rapide__icontains=search) | Q(offre__titre__icontains=search)
            | Q(offre__entreprise__nom_entreprise__icontains=search)
        )
    statut = params.get('statut', '')
    return candidatures.filter(statut=statut) if statut else candidatures


def audit_logs_filtres(params, demandeur=None):
    """Journal d'audit. Un administrateur simple ne voit jamais les actions d'un super-administrateur
    (`demandeur` = l'utilisateur qui consulte ou exporte)."""
    logs = AuditLog.objects.select_related('admin')
    if demandeur is not None and not demandeur.is_superuser:
        logs = logs.exclude(admin__is_superuser=True)
    search = params.get('search', '').strip()
    if search:
        logs = logs.filter(Q(admin__email__icontains=search) | Q(action__icontains=search) | Q(detail__icontains=search))
    return logs


def rendez_vous_filtres(params):
    rdvs = RendezVous.objects.select_related('candidat')
    statut = params.get('statut')
    return rdvs.filter(statut=statut) if statut else rdvs
