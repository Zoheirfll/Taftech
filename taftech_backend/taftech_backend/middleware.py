from django.conf import settings


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
