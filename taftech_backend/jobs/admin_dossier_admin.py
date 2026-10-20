"""Dossier d'un compte administrateur pour la fiche admin (Administration → Utilisateurs).

Type de compte, dernière connexion et activité tracée dans le journal d'audit (nombre d'actions,
répartition, dernières actions). Lecture seule, un seul compte à la fois."""
from django.db.models import Count

from .models import AuditLog

NB_ACTIONS_RECENTES = 10


def dossier_admin(user):
    logs = AuditLog.objects.filter(admin=user)
    libelles = dict(AuditLog.ACTIONS)
    par_action = [
        {'action': ligne['action'], 'libelle': libelles.get(ligne['action'], ligne['action']), 'nombre': ligne['n']}
        for ligne in logs.values('action').annotate(n=Count('id')).order_by('-n')
    ]
    recentes = list(logs.order_by('-date')[:NB_ACTIONS_RECENTES])
    return {
        'compte': {
            'type': 'Super administrateur' if user.is_superuser else 'Administrateur',
            'derniere_connexion': user.last_login.isoformat() if user.last_login else None,
            'inscrit_le': user.date_joined.isoformat(),
            'est_actif': user.is_active,
        },
        'actions': {
            'total': logs.count(),
            'par_action': par_action,
            'derniere_le': recentes[0].date.isoformat() if recentes else None,
            'recentes': [
                {'action': libelles.get(l.action, l.action), 'detail': l.detail, 'date': l.date.isoformat()}
                for l in recentes
            ],
        },
    }
