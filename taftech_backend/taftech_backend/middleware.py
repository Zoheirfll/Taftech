from django.conf import settings


class ReinitialiserContexteIAMiddleware:
    """Remet à zéro le contexte « demande IA en cours » au début et à la fin de chaque requête.

    `jobs/ia_quota.py` garde dans des ContextVar la ligne UtilisationIA de la demande et le décompte
    des entités masquées. Sous gunicorn, un thread est réutilisé par la requête suivante : un contexte
    oublié (sortie anticipée d'une vue) ajouterait les tokens d'un appel à la ligne d'un autre
    utilisateur. Cette remise à zéro garantit qu'aucune requête ne voit le contexte d'une autre."""

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _reinitialiser():
        from jobs.confidentialite_ia.audit import COMPTEUR_ENTITES
        from jobs.ia_quota import _utilisation_courante
        _utilisation_courante.set(None)
        COMPTEUR_ENTITES.set(None)

    def __call__(self, request):
        self._reinitialiser()
        try:
            return self.get_response(request)
        finally:
            self._reinitialiser()


class SecurityHeadersMiddleware:
    """
    Injecte les en-têtes de sécurité HTTP sur chaque réponse.
    CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # ── Content Security Policy ──────────────────────────────────────
        # En dev : report-only pour ne pas casser l'app pendant le dev
        # En prod : policy stricte appliquée
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self'; "
            "frame-src https://www.google.com https://maps.google.com; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        if settings.DEBUG:
            # En dev on observe sans bloquer
            response['Content-Security-Policy-Report-Only'] = csp
        else:
            response['Content-Security-Policy'] = csp

        # ── Autres en-têtes défensifs ────────────────────────────────────
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'

        return response
