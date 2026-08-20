import os
from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle

# Le test runner Django force settings.DEBUG=False pendant `manage.py test`,
# même avec DEBUG=True dans .env → on lit la variable d'env brute pour le bypass Cypress
# (même logique que accounts.views.AuthRateThrottle).
_DEBUG_ENV = os.getenv('DEBUG', 'False') == 'True'


class _CypressAwareScopedThrottle(ScopedRateThrottle):
    def allow_request(self, request, view):
        if _DEBUG_ENV:
            ip = request.META.get('REMOTE_ADDR', '')
            if ip in ('127.0.0.1', '::1'):
                return True
        return super().allow_request(request, view)


class PublicReadThrottle(_CypressAwareScopedThrottle):
    """Scope 'public_read' (300/h) — lecture publique à forte fréquence légitime
    (listes/détails d'offres, constants, nomenclature, autocomplete) : plus permissif
    que le seau générique anon (100/jour) qui les bridait sans raison."""
    scope = 'public_read'


class WriteActionThrottle(_CypressAwareScopedThrottle):
    """Scope 'write_action' (30/h) — écritures anonymes (candidature rapide,
    candidature spontanée, contact) : cible réaliste de spam/flood, plus strict
    que le seau générique anon."""
    scope = 'write_action'


class EmailRateThrottle(SimpleRateThrottle):
    """Anti-spam par adresse email plutôt que par IP — un même email ne peut pas
    déclencher plus de `rate` écritures/jour même en changeant d'IP (contrairement à
    WriteActionThrottle, contournable avec un pool d'IPs). Scope 'email_write'
    (10/jour), partagé entre les 3 endpoints d'écriture anonyme.
    `email_field` est le nom du champ dans request.data à lire (diffère selon la vue :
    'email_rapide' pour la candidature rapide, 'email' ailleurs)."""
    scope = 'email_write'
    email_field = 'email'

    def get_cache_key(self, request, view):
        if _DEBUG_ENV:
            ip = request.META.get('REMOTE_ADDR', '')
            if ip in ('127.0.0.1', '::1'):
                return None
        email = (request.data.get(self.email_field) or '').strip().lower()
        if not email:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': email}


class PostulerRapideEmailThrottle(EmailRateThrottle):
    email_field = 'email_rapide'
