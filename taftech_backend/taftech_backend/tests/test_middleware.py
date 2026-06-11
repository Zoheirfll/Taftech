from django.test import TestCase, override_settings


class SecurityHeadersMiddlewareTests(TestCase):

    def _any_response(self):
        """POST login sans corps → 400, mais les headers middleware sont là."""
        return self.client.post('/api/accounts/login/', {}, content_type='application/json')

    @override_settings(DEBUG=True)
    def test_headers_presents_en_dev(self):
        """En mode DEBUG, CSP en report-only + autres headers défensifs présents."""
        response = self._any_response()
        self.assertIn('Content-Security-Policy-Report-Only', response)
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['X-Frame-Options'], 'DENY')
        self.assertEqual(response['Referrer-Policy'], 'strict-origin-when-cross-origin')
        self.assertIn('Permissions-Policy', response)

    @override_settings(DEBUG=False)
    def test_csp_strict_en_production(self):
        """En production (DEBUG=False), CSP est appliqué (pas report-only)."""
        response = self._any_response()
        self.assertIn('Content-Security-Policy', response)
        self.assertNotIn('Content-Security-Policy-Report-Only', response)
        csp = response['Content-Security-Policy']
        self.assertIn("default-src 'self'", csp)
        self.assertIn("object-src 'none'", csp)
        self.assertIn("frame-ancestors 'none'", csp)
