from pathlib import Path
import os
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ──────────────────────────────────────────────
# CORE
# ──────────────────────────────────────────────
SECRET_KEY = os.getenv('SECRET_KEY', 'changeme-in-production')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

if not DEBUG and SECRET_KEY == 'changeme-in-production':
    raise ImproperlyConfigured(
        "SECRET_KEY n'est pas défini (variable d'environnement manquante) — "
        "refus de démarrer en production avec la valeur par défaut publique."
    )
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')

# ── NGROK (tests uniquement) ──────────────────────────────────────────────────
# Quand tu lances ngrok, il utilise le domaine *.ngrok-free.app
# Django vérifie le Host: header HTTP — si l'host ngrok n'est pas dans ALLOWED_HOSTS, il renvoie 400.
# Cette ligne accepte automatiquement tous les sous-domaines ngrok-free.app SANS qu'on
# ait à mettre l'URL exacte dans .env à chaque session ngrok.
# En production (DEBUG=False) ngrok ne sera pas utilisé donc ça ne pose aucun risque.
if DEBUG:
    ALLOWED_HOSTS += ['.ngrok-free.app']
# ─────────────────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────
# APPLICATIONS
# ──────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'accounts',
    'jobs',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'taftech_backend.middleware.SecurityHeadersMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'taftech_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'taftech_backend.wsgi.application'

# ──────────────────────────────────────────────
# DATABASE
# ──────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'taftech_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# ──────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────
AUTH_USER_MODEL = 'accounts.CustomUser'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ──────────────────────────────────────────────
# REST FRAMEWORK + THROTTLING
# ──────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authenticate.CustomJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10000/day' if DEBUG else '100/day',
        'user': '10000/day' if DEBUG else '1000/day',
        'auth': '10/min',
        'groq': '20/hour',
        'public_read': '300/hour',
        'write_action': '30/hour',
        'email_write': '10/day',
        'invitation_cvtheque': '20/day',
        'file_upload': '20/hour',
        'cv_parser': '10/hour',
        'admin_upload': '100/hour',
    },
}

# Swagger — activé automatiquement si drf-spectacular est installé
try:
    import drf_spectacular  # noqa: F401
    INSTALLED_APPS += ['drf_spectacular']
    REST_FRAMEWORK['DEFAULT_SCHEMA_CLASS'] = 'drf_spectacular.openapi.AutoSchema'
    SPECTACULAR_SETTINGS = {
        'TITLE': 'TafTech API',
        'DESCRIPTION': 'API de la plateforme de recrutement TafTech — marché algérien.',
        'VERSION': '1.0.0',
        'SERVE_INCLUDE_SCHEMA': False,
        'COMPONENT_SPLIT_REQUEST': True,
        'SWAGGER_UI_SETTINGS': {
            'deepLinking': True,
            'persistAuthorization': True,
            'displayRequestDuration': True,
            'filter': True,
            'docExpansion': 'none',
            'defaultModelsExpandDepth': -1,
        },
    }
except ImportError:
    pass

# ──────────────────────────────────────────────
# JWT
# ──────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_COOKIE': 'accessToken',
    'AUTH_COOKIE_REFRESH': 'refreshToken',
    'AUTH_COOKIE_SECURE': not DEBUG,   # True en production (HTTPS)
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_PATH': '/',
    'AUTH_COOKIE_SAMESITE': 'Strict',
}

# ──────────────────────────────────────────────
# CORS
# ──────────────────────────────────────────────
CORS_ALLOW_CREDENTIALS = True
_cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]

# ──────────────────────────────────────────────
# EMAIL
# ──────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# Serveur SMTP, identifiants et expéditeur pilotés par l'environnement : passer du compte
# Gmail de dev à l'adresse professionnelle du domaine définitif (ou à un service d'envoi)
# ne demande aucune modification de code — voir docs/exploitation/delivrabilite-emails.md.
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
# Adresse d'expédition unique de la plateforme (tous les emails passent par
# DEFAULT_FROM_EMAIL). En production elle doit être sur le domaine qui porte SPF/DKIM/DMARC
# (ex. « TafTech <contact@taftech.dz> ») : un « From » Gmail envoyé hors Gmail est un signal
# spam classique (Outlook, Yahoo...). Le repli ci-dessous ne vaut que pour le développement.
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL') or (
    f'TafTech <{EMAIL_HOST_USER}>' if EMAIL_HOST_USER else 'TafTech <noreply@taftech.dz>'
)
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# ──────────────────────────────────────────────
# EXTERNAL APIS
# ──────────────────────────────────────────────
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')

# Chargily Pay — paiement en ligne algérien (CIB + EDAHABIA)
# Clés disponibles sur : https://pay.chargily.net/dashboard → Développeurs
# En mode test : utiliser les clés "test" (préfixe test_sk_...)
# En production : utiliser les clés "live" (préfixe live_sk_...)
CHARGILY_API_KEY = os.getenv('CHARGILY_API_KEY', '')
CHARGILY_SECRET_KEY = os.getenv('CHARGILY_SECRET_KEY', '')
# URL publique (https) du webhook de paiement, envoyée à Chargily à CHAQUE création de paiement :
# l'activation d'un palier ne dépend plus de l'URL réglée dans le tableau de bord Chargily (qui
# change avec un tunnel ngrok). Vide = Chargily utilise l'URL de son tableau de bord.
# Dev : https://<domaine ngrok>/api/jobs/premium/chargily/webhook/ — production : le domaine définitif.
CHARGILY_WEBHOOK_URL = os.getenv('CHARGILY_WEBHOOK_URL', '')

# En dev, ces clés peuvent être vides sans risque (email/paiement/IA juste
# indisponibles) — mais en prod (DEBUG=False), une clé vide casse silencieusement
# en runtime au premier appel (email de confirmation, webhook de paiement, analyse
# IA) au lieu d'empêcher le démarrage. Refuse de démarrer plutôt que de laisser un
# manque de config passer inaperçu jusqu'au premier incident utilisateur.
if not DEBUG:
    _MISSING_SECRETS = [
        name for name, value in {
            'EMAIL_HOST_USER': os.getenv('EMAIL_HOST_USER', ''),
            'EMAIL_HOST_PASSWORD': os.getenv('EMAIL_HOST_PASSWORD', ''),
            'GROQ_API_KEY': os.getenv('GROQ_API_KEY', ''),
            'CHARGILY_API_KEY': os.getenv('CHARGILY_API_KEY', ''),
            'CHARGILY_SECRET_KEY': os.getenv('CHARGILY_SECRET_KEY', ''),
        }.items() if not value
    ]
    if _MISSING_SECRETS:
        raise ImproperlyConfigured(
            "Variables d'environnement manquantes en production : "
            + ", ".join(_MISSING_SECRETS)
        )

# URL publique du frontend (utilisée dans les emails)
SITE_URL = os.getenv('SITE_URL', 'http://localhost:5173')

# `index.html` construit du frontend (`npm run build`) : sert de gabarit à `jobs/seo_pages.py`, qui
# y injecte les balises SEO par page (titre, canonical, JobPosting) pour les robots. À pointer vers
# le `index.html` réellement servi par nginx en production.
FRONTEND_INDEX_PATH = os.getenv(
    'FRONTEND_INDEX_PATH', str(BASE_DIR.parent / 'taftech_frontend' / 'dist' / 'index.html')
)

# ──────────────────────────────────────────────
# FILES
# ──────────────────────────────────────────────
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ──────────────────────────────────────────────
# I18N
# ──────────────────────────────────────────────
LANGUAGE_CODE = 'fr'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ──────────────────────────────────────────────
# SECURITY HEADERS (production)
# ──────────────────────────────────────────────
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
