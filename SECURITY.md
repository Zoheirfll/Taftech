# SECURITY.md — Journal des audits sécurité TafTech

> Historique des audits de sécurité menés sur ce projet, findings et correctifs appliqués. Mis à jour après chaque session d'audit.

---

## 🌿 Branche

Travail effectué sur `security/audit-2026-07` (créée depuis `main`), pas encore mergée.

---

## ✅ 1. XSS (Cross-Site Scripting)

**Verdict global : posture solide.**

- Aucun `dangerouslySetInnerHTML`/`innerHTML`/`document.write` côté React.
- Aucun `|safe`/`mark_safe`/`format_html`/`autoescape off` côté Django.
- CSP stricte (`script-src 'self'`, pas de `unsafe-inline`) via `SecurityHeadersMiddleware`.
- Champs LinkedIn/GitHub/site web validés via `URLField` DRF + préfixage forcé `https://` (bloque `javascript:` scheme).
- Tous les liens externes ont `target="_blank" rel="noopener noreferrer"`.

**Correctif appliqué :**
- `Modals.jsx` (parser CV) : whitelist de l'extension image (`jpg/jpeg/png/webp`) avant injection dans un `data:` URI, au lieu de faire confiance à l'extension extraite du CV.

---

## ✅ 2. Rate limiting

**Trouvé** : le scope `'auth': '10/min'` défini dans `settings.py` n'était câblé sur aucune vue — login/inscription/reset password utilisaient le scope générique `'anon'` (100/j).

**Correctifs appliqués** (`accounts/views.py`) :
- Nouvelle classe `AuthRateThrottle` (scope `auth`, 10/min réel) branchée sur les 7 endpoints sensibles : login, inscription candidat/recruteur, vérification email, renvoi code, forgot/reset password.
- Bug annexe découvert : le bypass Cypress (`if settings.DEBUG`) ne fonctionnait jamais sous `manage.py test` car Django force `settings.DEBUG=False` pendant les tests peu importe le `.env` — corrigé en lisant `os.getenv('DEBUG')` directement (`_DEBUG_ENV`).

---

## ✅ 3. Secrets en dur (hardcoded API keys)

**Trouvé** : une vraie clé Groq exposée dans l'historique Git **local uniquement** (commit `9b04392`, branche locale `feature-US6`, jamais poussée sur `origin` — vérifié sur toutes les branches distantes).

**Décision** : pas de réécriture d'historique (clé de toute façon vouée à être remplacée par Ollama local au déploiement). Recommandation : révoquer la clé sur console.groq.com par précaution.

**Le reste est propre** : toutes les clés (`SECRET_KEY`, `GROQ_API_KEY`, `DB_PASSWORD`, `EMAIL_HOST_PASSWORD`, `GOOGLE_CLIENT_ID`, `CHARGILY_*`) passent par `os.getenv()`, `.gitignore` couvre bien `.env`/`*.env` partout.

---

## ✅ 4. Authentification manquante (missing authentication)

**Trouvé** : `AdminMarcheAPIView` et `MetierReferentielAdminAPIView` utilisaient `IsAuthenticated` + check de rôle manuel dans le corps de la méthode, au lieu de `IsAdminUser` — n'importe quel utilisateur connecté passait la couche permission, bloqué seulement par le check applicatif (fragile si refactoré).

**Correctifs appliqués** :
- `AdminMarcheAPIView` et `MetierReferentielAdminAPIView` → `IsAdminUser`.
- `settings.py` : ajout de `DEFAULT_PERMISSION_CLASSES: ['IsAuthenticated']` en garde-fou global (évite qu'une future vue oubliant `permission_classes` retombe sur `AllowAny` par défaut DRF).

---

## ✅ 5. Authentification faible (weak authentication — mots de passe)

**Trouvé** :
- `RegisterCandidatDTO.password` (inscription candidat) n'avait **aucune** contrainte de longueur — un mot de passe de 1 caractère était accepté.
- `AUTH_PASSWORD_VALIDATORS` configuré dans `settings.py` mais **jamais appliqué** — aucun code n'appelait `validate_password()` de Django ; reset password et changement de mdp ne vérifiaient qu'un `len() < 8` en dur.

**Correctifs appliqués** :
- `min_length=8` + `validate_password()` Django branché sur `RegisterCandidatDTO` et `RecruteurRegisterSerializer` (avec `User` transitoire pour le check de similarité email/nom).
- `ResetPasswordAPIView` et `ChangerMotDePasseAPIView` : remplacé le check `len() < 8` par `validate_password()` (vraie politique centralisée : longueur, mot de passe commun, similarité profil, pas 100% numérique).

**Déjà solide** : JWT (access 15min/refresh 7j, rotation+blacklist, cookies HttpOnly/Secure/SameSite=Lax), verrouillage compte (5 échecs → 15min), OTP 6 chiffres (expiry 10min, brute-force infaisable vu le throttle).

---

## ✅ 6. Autorisation faible (weak authorization / IDOR)

**Vérifié — quasiment tout est propre.** Le pattern "fetch par id puis vérifier explicitement propriétaire/entreprise avant mutation" est appliqué systématiquement dans `candidatures.py`, `offres.py`, `equipe.py`, `recruteur.py`.

**Trouvé** : `JobDetailAPIView` (offre publique) ne filtrait pas `statut_moderation='APPROUVEE'` (contrairement à `JobListAPIView`) — une offre `EN_ATTENTE` ou `REJETEE` était consultable en devinant/incrémentant son ID, avec fuite du champ interne `motif_rejet` (note admin de rejet).

**Correctif appliqué** : `JobDetailAPIView` filtre maintenant aussi `statut_moderation='APPROUVEE'`.

**Noté pour plus tard (documenté au checklist déploiement)** : fichiers média (CV/photos/logos) servis sans auth via `/media/` — actuellement inoffensif car ce serving est gardé par `if settings.DEBUG` (jamais actif en prod tel quel), mais à traiter avant déploiement.

---

## ✅ 7. Sécurisation des fichiers média (CV/photo candidat)

**Décision** : protéger uniquement CV PDF + photo de profil candidat (les plus sensibles) — logos entreprise et lettres de motivation restent en accès direct (peu sensibles / déjà publics par nature).

**Implémenté** :
- Nouvelle vue `CandidatFichierPriveAPIView` (`jobs/views/profils.py`) — sert le fichier via `/api/jobs/media-prive/candidat/<id>/<cv|photo>/` après vérification : le candidat lui-même, un admin, un recruteur ayant reçu une candidature de ce candidat, ou un recruteur premium (CVThèque).
- Frontend : nouveau helper `candidatFichierUrl()` dans `mediaUrl.js`, branché dans `ProfilCandidat/index.jsx`, `CVTheque.jsx`, `ReviewCandidature.jsx`, `GestionOffre/index.jsx` + `DetailCandidature.jsx`, `AdminUsers.jsx`.
- Le cookie JWT (`accessToken`, HttpOnly) est envoyé automatiquement par le navigateur sur ces requêtes same-origin — aucun changement JS supplémentaire nécessaire (`<img src>`/`<a href>` fonctionnent tels quels).

---

## ✅ 8. Input validation

**Trouvé et corrigé** :
- `CandidatureSpontanee.cv` (`FileField` brut, sans validateur) — seul champ fichier du projet sans `FileExtensionValidator`/`validate_document_mime`/`validate_file_size`. Corrigé + migration `0053`.
- `nb_mois` (durée premium) non plafonné hors webhook Chargily — 4 points d'entrée (`AdminDemandesPremiumAPIView`, `DemanderActivationPremiumAPIView`, `ChargilyCheckoutAPIView`, `EnvoyerRecuPremiumAPIView`) plafonnés à `[1, 12]` avec gestion propre des erreurs de type (plus de 500 sur valeur non numérique).
- Réponses questionnaire (`PostulerAPIView`) créées via `.objects.create()` en contournant tout serializer — `ReponseCandidat.reponse` (`TextField`) sans limite de taille, et aucune vérification que la question appartient au questionnaire de l'offre visée. Corrigé : troncature à 2000 caractères + filtre `questionnaire=offre.questionnaire`.
- `telephone` (`CustomUser`) sans aucun validateur de format nulle part (inscription candidat/recruteur, mise à jour profil). Corrigé : `RegexValidator` sur le modèle (auto-appliqué aux serializers via DRF `ModelSerializer`) + vérification explicite dans les 2 vues de mise à jour manuelle (`ProfilCandidatAPIView.put`, `UpdateProfilEntrepriseAPIView`).

**Vérifié safe** : aucune requête SQL brute (`raw()`/`cursor.execute()`/`extra()`) dans tout le backend ; filtres de recherche (`Q()`/`icontains`) paramétrés ; validateurs fichiers (magic-bytes + taille) déjà bien appliqués ailleurs ; pas de `eval()`/`exec()` (pas de risque prompt-injection → exécution via Groq) ; noms de fichiers gérés par Django (pas de path traversal). NIN validé une seule fois à l'inscription puis immuable — cohérent, aucun risque.

---

## ✅ 9. Variables d'environnement

**Trouvé** : `SECRET_KEY = os.getenv('SECRET_KEY', 'changeme-in-production')` — fallback silencieux vers une valeur connue publiquement si la variable d'env est absente en prod. Risque : forge de tokens de reset password / cookies signés avec un secret public.

**Correctif appliqué** : garde au démarrage dans `settings.py` — `ImproperlyConfigured` levée si `DEBUG=False` et `SECRET_KEY` est resté au placeholder par défaut.

**Vérifié safe** : `.env` bien exclu de git partout, aucun secret jamais logué/exposé en réponse API.

---

## ✅ 10. Dépendances vulnérables

Scan via `pip-audit` (backend) et `npm audit` (frontend).

**Backend Python** — 4 paquets avec CVE connues (toutes transitives, pas dans `requirements.txt` en direct au départ) :
- Django 5.2.12 → **5.2.16**
- Pillow 12.2.0 → **12.3.0**
- PyJWT 2.12.1 → **2.13.0**
- cryptography 48.0.0 → **48.0.1**

**Frontend** — 14 vulnérabilités (`npm audit`) → 4 restantes après `npm audit fix` :
- **axios** (dépendance directe, utilisée pour tout appel API) — corrigé. CVEs incluaient SSRF, prototype pollution, fuite de credentials via proxy.
- **react-router-dom** (dépendance directe, toute la navigation) — corrigé. CVEs incluaient open redirect, contournement CSRF sur PUT/PATCH/DELETE.
- **vite** (devDependency, serveur dev/build) — corrigé. Faille de traversée de chemin sur Windows, pertinente vu l'usage documenté de ngrok pour exposer le serveur dev.
- **Restant, volontairement non touché** : 4 vulnérabilités "moderate" (`qs`, `uuid`) via la chaîne de dépendances Cypress. Le fix automatique (`npm audit fix --force`) upgraderait Cypress vers la v15, dont le binaire est cassé sur Windows 10 (raison du downgrade documenté vers 13.17.0). Cypress ne tourne qu'en local/CI, jamais exposé aux utilisateurs finaux — risque accepté.

**Build frontend vérifié ✅** après upgrade. Tests backend pas encore relancés après l'upgrade Django/Pillow/PyJWT — à faire avant de merger.

---

## ✅ 11. CSRF / CORS

**CSRF** : l'app authentifie via cookie JWT httpOnly (`accessToken`), pas via header `Authorization` — donc potentiellement exposée au CSRF classique (les cookies sont envoyés automatiquement cross-site par le navigateur). Deux points :
- DRF exempte automatiquement toutes ses `APIView` de la protection CSRF native de Django (comportement DRF standard) — `CsrfViewMiddleware` ne protège en pratique que `/admin/`, pas l'API REST.
- Seule protection réelle : `AUTH_COOKIE_SAMESITE`. Vérifié qu'aucun endpoint ne mute des données via GET (uniquement POST/PUT/PATCH/DELETE partout) — condition nécessaire pour que `SameSite` fasse son travail.

**Correctif appliqué** : `AUTH_COOKIE_SAMESITE` passé de `'Lax'` à `'Strict'` (protection maximale). Vérifié que ça ne casse aucun flux : les liens email (vérification/reset password) amènent sur une page où l'utilisateur saisit un code manuellement — pas d'auto-connexion via cookie sur navigation cross-site — et Google Sign-In (`@react-oauth/google`) utilise un flux JS (popup/One Tap), pas une redirection top-level, donc pas concerné non plus.

**CORS** : propre — `CORS_ALLOW_CREDENTIALS=True` combiné à `CORS_ALLOWED_ORIGINS` en liste blanche stricte (pas de wildcard), `CorsMiddleware` bien positionné en premier dans `MIDDLEWARE` (recommandation officielle django-cors-headers).

---

## ✅ 12. Exposition de données sensibles (logs/erreurs) & gestion de session

**Trouvé et corrigé** :
- `errorReporter.js` avait une URL **hardcodée en `http://127.0.0.1:8000`** — en prod, chaque `reportError()` (appelé dans tous les catch blocks frontend) tentait de contacter le localhost du navigateur de l'utilisateur, ce qui échoue toujours silencieusement. Toute la télémétrie d'erreurs frontend était donc morte en production. Corrigé sur le même pattern que `axiosConfig.js`/`mediaUrl.js` (`VITE_API_URL` si défini, sinon URL relative via le proxy).
- `ErrorReportAPIView` acceptait `message`/`details`/`stack_trace`/`url` bruts sans limite de taille (`TextField` illimité, endpoint `AllowAny`). Corrigé : troncature explicite (1000/2000/500/1000/5000 caractères) — corrige au passage un bug latent où une URL trop longue (`CharField(max_length=500)`) aurait fait planter l'insertion en DB.

**Vérifié safe** : aucun mot de passe/token jamais loggé côté backend (`logger.error`/`print`) sur tout le repo ; `stack_trace` JS ne contient que noms de fonctions/lignes, pas de valeurs de variables ; `SystemErrorLog` visible uniquement par `IsAdminUser`, lecture seule côté Django admin ; pas de `|safe`/rendu HTML non échappé nulle part (confirmé lors de l'audit XSS) donc pas de XSS stocké possible via ce canal.

**Gestion de session — solide, rien à corriger** :
- Logout : `RefreshToken.blacklist()` réellement appelé (invalidation serveur, pas juste suppression du cookie côté client).
- Rotation : `ROTATE_REFRESH_TOKENS=True` + `BLACKLIST_AFTER_ROTATION=True` — chaque refresh invalide l'ancien token, empêche le rejeu d'un refresh token volé.
- Durées : access 15min / refresh 7j — raisonnable.
- Cookies : HttpOnly + Secure (prod) + SameSite=Strict.

**Rappel process (pas un fix de code)** : le risque n°1 d'exposition de données sensibles reste `DEBUG=True` oublié en prod (stack trace complète + variables locales + tout `settings.py` sur toute erreur 500) — déjà en tête de la checklist déploiement.

---

## ✅ 13. SSRF & logique métier (abus de fonctionnalités)

**SSRF** : surface quasi nulle — vérifié qu'il n'existe qu'un seul appel HTTP sortant dans tout le backend (paiement Chargily, `recruteur.py:528`), avec une URL **codée en dur**, jamais construite depuis une entrée utilisateur. Aucun `requests.get/post`, `urlopen`, `httpx` ailleurs. `linkedin`/`site_web` sont de simples liens affichés côté navigateur, jamais fetchés par le serveur. Rien à corriger.

**Logique métier — 2 trous de déduplication corrigés** :
- `PostulerRapideAPIView` (candidature rapide anonyme, [candidatures.py:180-182](taftech_backend/jobs/views/candidatures.py#L180-L182)) — le dedup "une candidature par email+offre" comparait l'email en sensible à la casse (`Test@x.com` ≠ `test@x.com`), contournable trivialement. Corrigé avec `email_rapide__iexact`.
- `EnvoyerCandidatureSpontaneeAPIView` (candidature spontanée, [recruteur.py:306-311](taftech_backend/jobs/views/recruteur.py#L306-L311)) — le anti-doublon ne s'appliquait que si le visiteur était connecté en tant que candidat ; un visiteur anonyme (endpoint `AllowAny` par design) pouvait spammer une entreprise en illimité, aucun check par email. Corrigé : ajout d'un dedup par `email__iexact` pour les soumissions anonymes.

**Vérifié safe** : `score_matching`/`details_matching` toujours calculés côté serveur (`calculer_score_matching`), jamais acceptés depuis le client — pas de manipulation de score possible.

---

## 📋 Ajouts au checklist déploiement (`CLAUDE.md`)

- Sécurisation `/media/` en prod (nginx `alias` explicite requis — `static()` Django ne sert plus rien hors `DEBUG=True`).
