# Sécurité — synthèse

> Tableau des mesures. Journal détaillé par chantier : [../SECURITY.md](../SECURITY.md). Index : [README.md](README.md)

## 🔒 SÉCURITÉ

| Mesure | Statut | Détail |
|--------|--------|--------|
| `.env` dans `.gitignore` | ✅ | SECRET_KEY, DB, EMAIL, GROQ — plus rien hardcodé |
| JWT expiry | ✅ | Access 15 min / Refresh 7 jours + blacklist |
| Rate limiting auth | ✅ | `AnonRateThrottle` sur tous les endpoints sensibles |
| Expiry code reset | ✅ | 10 min — `code_verification_created_at` vérifié |
| Hack Cypress isolé | ✅ | `if settings.DEBUG` — inactif en prod |
| Verrouillage compte | ✅ | 5 échecs → verrou 15 min |
| Validation MIME fichiers | ✅ | Magic bytes PDF/DOCX/JPEG/PNG — `jobs/validators.py` |
| Limite taille fichiers | ✅ | CV/lettre 5 Mo, logo/photo 2 Mo |
| CSP headers | ✅ | `SecurityHeadersMiddleware` |
| HTTPS/HSTS en prod | ✅ | Activé si `DEBUG=False` |
| Webhook Chargily palier | ✅ | Flux `nb_mois` (legacy) supprimé le 27/08/2026 — seul le flux `palier_nom` (`ChargilyCheckoutPalierAPIView`) subsiste, capé à un `Palier.actif` existant |
| CVTheque API-level | ✅ | 403 si aucun palier actif (`get_palier_actif() is None`) — pas seulement masquage UI |
| ErrorReport throttle | ✅ | `CypressAwareThrottle` — évite flood DB |
| Logging backend | ✅ | `print()` remplacés par `logger = logging.getLogger(__name__)` |
| reportError frontend | ✅ | Tous les catch blocks ont `reportError()` |
| Throttling par scope | ✅ | `public_read` 300/h + `write_action` 30/h (`jobs/throttles.py`), en plus de `auth`/`groq`/générique — session 20/08/2026 |
| Garde-fou secrets prod | ✅ | Démarrage refusé (`ImproperlyConfigured`) si `DEBUG=False` et `SECRET_KEY`/`EMAIL_HOST_*`/`GROQ_API_KEY`/`CHARGILY_*` manquants — session 20/08/2026 |
| Emails HTML — injection | ✅ | Vérifié : Django autoescape protège `message_refus_auto` dans `emails/refus.html`, testé avec payload `<script>` réel — session 20/08/2026 |
| Dépendances (CVE) | ✅ | `pip-audit` propre (Django/cryptography/sqlparse patchés) — session 20/08/2026. `npm audit` : 10 CVE restantes, toutes `devDependencies` (Cypress), zéro risque prod |
| Scan CVE automatisé | ✅ | Dependabot (`.github/dependabot.yml`, pip + npm, hebdo) — session 20/08/2026 |
| Anti-abus par email | ✅ | `EmailRateThrottle` (10/jour/email) en plus du throttle IP sur candidature rapide/spontanée/contact — session 20/08/2026 |
| Throttling uploads/IA | ✅ | `FileUploadThrottle` (20/h, uploads candidat/recruteur), `CVParserThrottle` (10/h, dédié parser CV — aucun throttle avant), `AdminFileUploadThrottle` (100/h, CMS admin), documents privés candidat plafonnés à 1/type + 20 total — session 03/09/2026, détail `SECURITY.md` §17 |

**Ne jamais committer `.env`.** Regénérer `SECRET_KEY` avant la prod.

---

