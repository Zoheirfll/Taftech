# Chantiers sécurité (throttling, audit, secrets)

> À lire avant de toucher au throttling DRF, aux secrets de production, aux dépendances vulnérables ou à un audit de sécurité. Le journal complet reste dans `SECURITY.md`.
>
> Extrait de l'ancien `CLAUDE.md` monolithique (découpage du 2026-10-12) — contenu déplacé tel quel, sans réécriture, du plus récent au plus ancien.
> Les renvois « voir section X » pointent vers un autre fichier de `docs/fonctionnel/` : voir l'index de `CLAUDE.md`.

---

## 🆕 SESSION 03/09/2026 (suite 4) — Badges notifications non rafraîchis + throttling uploads/IA

**Contexte** : deux demandes distinctes de l'utilisateur le même jour, traitées à la suite.

**1. Badge de notifications non lues figé jusqu'à F5** (signalé avec capture — la boîte de réception recruteur affichait toujours "3" après avoir lu tous les messages). Cause : dans `RecruteurLayout.jsx`, `NavbarRecruteur.jsx`, `Navbar.jsx` (candidat), `CandidatLayout.jsx` et `BottomNavCandidat.jsx`, le `useEffect` qui charge le compteur de non-lus avait un tableau de dépendances vide (`[]`) ou ne dépendait que de `isLogged`/`role` — il ne se réexécutait jamais après une navigation, donc marquer un message comme lu sur `/notifications`/`/inbox` ne rafraîchissait jamais le badge affiché ailleurs (sidebar, cloche header, bottom nav). Fix : `location.pathname` ajouté aux dépendances des 5 `useEffect` concernés — le compteur se recharge à chaque changement de route, donc dès qu'on quitte la page de lecture.

**2. Throttling par endpoint — uploads de fichiers + génération IA** (demande explicite "limiter beaucoup comme l'upload documents et bcp autres, le generer ia, et bcp"). Détail complet dans `SECURITY.md` §17 — résumé :
- `ParserCVAPIView` (parsing CV, 1-2 appels Groq) n'avait **strictement aucun throttle** avant cette session — gap le plus sérieux, corrigé avec un nouveau `CVParserThrottle` dédié (10/h, scope `cv_parser`, plus strict que le scope `groq` partagé par les 5 autres fonctionnalités IA) + `FileUploadThrottle` pour la partie upload.
- Nouveau `FileUploadThrottle` (`jobs/throttles.py`, scope `file_upload`, 20/h, ignore GET) appliqué à tous les endpoints d'upload authentifiés qui n'avaient aucune limite : `DocumentCandidatAPIView`, `ProfilCandidatAPIView` (CV/photo), `UpdateProfilEntrepriseAPIView` (logo/bannière), `EntreprisePhotosAPIView`, `PostulerAPIView`.
- Nouveau `AdminFileUploadThrottle` (scope `admin_upload`, 100/h) appliqué aux 3 endpoints CMS admin avec upload (`ArticleAdminAPIView`/`ArticleAdminDetailAPIView`, `BanniereAccueilAdminAPIView`) — risque plus faible (`IsAdminUser`) mais gap réel avant cette session.
- **Documents privés candidat — 1 par type** (`DocumentCandidatAPIView.post`, `jobs/views/candidat_dashboard.py`) : un nouvel upload sur un `TypeDocument` déjà utilisé (y compris le bucket "sans type") est désormais refusé (400) tant que le document existant n'est pas supprimé — avant, un candidat pouvait accumuler un nombre illimité de documents du même type. Plafond global de 20 documents gardé en filet de sécurité supplémentaire.
- **Taille de fichier et types autorisés** : vérifiés déjà corrects avant cette session (validateurs modèle `FileExtensionValidator`/`validate_document_mime`/`validate_image_mime`/`validate_file_size`, 5 Mo documents/CV, 2-5 Mo images selon le champ) — aucun changement nécessaire là.

**Tests** : backend 410/410 ✅ (suite complète `jobs accounts`), `python manage.py check` propre, `npx vite build` propre.

---


## 🆕 SESSION 26/08/2026 — Audit sécurité complet (codebase entier) + fix ajout d'équipe non consenti

**Contexte** : audit sécurité demandé sur tout le codebase (pas juste un diff, branche `main` propre après merge). Méthodologie : sous-agent d'exploration + sous-agent de contre-vérification indépendant par finding, seuil de confiance ≥8/10 pour retenir un finding.

**Résultat** : un seul finding retenu, corrigé le jour même. Toutes les autres catégories vérifiées RAS (injection SQL/commande/template, path traversal, JWT/session, désérialisation, XSS via `dangerouslySetInnerHTML`, secrets en dur, contournement signature webhook Chargily, permissions endpoints admin, IDOR fichiers privés candidats, escalade de rôle d'équipe, CORS).

**Fix — `InviterMembreAPIView` (`jobs/views/equipe.py`)** : la branche "compte email classique existant" ajoutait l'utilisateur **directement** à `MembreEquipe` sans aucune étape de consentement (contrairement aux 2 autres branches — compte Google et email inconnu — qui passaient déjà par `InvitationEquipe` + acceptation via token). Deux problèmes cumulés : (1) un recruteur pouvait faire rejoindre n'importe quel compte TafTech existant à son équipe (avec un rôle qu'il contrôle, potentiellement `ADMIN`) sans que la cible ait rien demandé, seul un email a posteriori l'informait ; (2) les 3 messages de réponse distincts (`'ajouté(e) directement'` / `'invitation (Google)'` / `'Invitation envoyée'`) permettaient d'énumérer si un email correspond à un compte TafTech et son type.
- **Fix** : les 3 branches passent désormais toutes par le même mécanisme `InvitationEquipe` (token, expiration 72h, acceptation explicite via `AccepterInvitationAPIView`) — `AccepterInvitationAPIView.post()` gérait déjà le cas "compte existant non-Google" en exigeant la confirmation du mot de passe (`user.check_password()`), donc aucun nouveau code d'acceptation à écrire. Message de réponse unifié (`"Invitation envoyée à {email}."`) quelle que soit l'existence/le type du compte cible.
- `_envoyer_email_bienvenue()` (devenue morte, plus jamais appelée) supprimée.
- **Test cassé par le fix** (verrouillait l'ancien comportement vulnérable) : `test_ajout_direct_compte_existant` → remplacé par `test_compte_existant_recoit_invitation_pas_ajout_direct` (vérifie qu'aucun `MembreEquipe` n'est créé avant acceptation, qu'une `InvitationEquipe` l'est) + nouveau `test_message_invitation_identique_compte_existant_ou_non` (anti-énumération).

**Tests** : `jobs.tests.test_api_equipe` 50/50 ✅.


## 🆕 SESSION 20/08/2026 — Audit sécurité : throttling par scope, garde-fou secrets prod, CVE dépendances

**Contexte** : audit sécurité informel demandé par l'utilisateur (pas de pentest formel) — passage en revue des points faibles réels du projet avant un futur lancement avec paiement réel (Chargily). 4 points traités dans l'ordre, un par un, avec validation de l'utilisateur avant chaque implémentation.

**1. Throttling DRF trop grossier** : avant cette session, `settings.py` n'avait que le seau générique `anon: 100/day` / `user: 1000/day` pour tout endpoint sans scope explicite (seuls `auth` 10/min et `groq` 20/h existaient). Un visiteur légitime naviguant beaucoup (pagination offres + constants + nomenclature à chaque page) pouvait taper le seau générique, tandis qu'aucun scope dédié ne resserrait spécifiquement les écritures anonymes (candidature rapide, candidature spontanée, contact).
- **Nouveau `jobs/throttles.py`** : `PublicReadThrottle` (scope `public_read`, 300/h) et `WriteActionThrottle` (scope `write_action`, 30/h), toutes deux `ScopedRateThrottle` avec le même bypass Cypress en DEBUG que `accounts.views.AuthRateThrottle` (pattern dupliqué intentionnellement — centraliser dans un seul fichier partagé entre `accounts` et `jobs` aurait ajouté une dépendance inter-app pour 4 lignes).
- `public_read` appliqué sur 9 vues à forte fréquence légitime, faible risque : `JobListAPIView`, `JobDetailAPIView`, `ConstantsAPIView`, `NomenclatureAPIView`, `MetierReferentielAPIView` (autocomplete), `PublicStatsAPIView`, `StatsGeoAPIView`, `EntrepriseListAPIView`, `EntrepriseDetailAPIView`.
- `write_action` appliqué sur les 3 endpoints d'écriture anonyme : `PostulerRapideAPIView`, `EnvoyerCandidatureSpontaneeAPIView`, `ContactMessageAPIView` (celui-ci remplace son ancien `CypressAwareThrottle` générique).
- `auth`/`groq` non touchés — déjà bien calibrés.

**2. Aucun garde-fou sur les secrets manquants en prod (hors SECRET_KEY)** : `settings.py` avait déjà un `ImproperlyConfigured` si `DEBUG=False` et `SECRET_KEY` vaut encore `'changeme-in-production'` — mais rien d'équivalent pour `EMAIL_HOST_USER/PASSWORD`, `GROQ_API_KEY`, `CHARGILY_API_KEY/SECRET_KEY`. Une clé vide en prod cassait silencieusement au premier appel runtime (email jamais envoyé, webhook paiement en échec, IA indisponible) au lieu d'empêcher le démarrage.
- Fix : bloc `if not DEBUG` après la section `EXTERNAL APIS`/`CHARGILY` — liste les variables manquantes dans le message d'erreur (`ImproperlyConfigured`), même mécanisme que `SECRET_KEY`. Testé par simulation (`DEBUG=False` + `GROQ_API_KEY=''` en env) → lève bien l'exception avant tout autre code.
- **Aucun impact dev** : les 5 variables restent optionnelles (`''` par défaut) tant que `DEBUG=True`.

**3. Injection HTML potentielle via `message_refus_auto`** : le recruteur personnalise un message de refus (`ProfilEntreprise.message_refus_auto`, texte libre) injecté dans `emails/refus.html` via `render_to_string()`. Inquiétude : un recruteur malveillant qui mettrait du HTML/JS dans ce champ pourrait-il casser le rendu de l'email ou déclencher un souci côté client mail du candidat ?
- **Vérifié empiriquement, pas de faille** : `{{ message }}` dans le template n'a ni `|safe` ni `{% autoescape off %}`, et `TEMPLATES` dans `settings.py` n'a rien qui désactive l'autoescape global — Django échappe donc automatiquement. Testé en rendant le template avec le payload `<script>alert(1)</script><img src=x onerror=alert(2)>` comme valeur de `message` → sortie confirmée en entités HTML échappées (`&lt;script&gt;...`), donc inerte. **Aucun correctif nécessaire.**

**4. Dépendances non auditées (`pip-audit`/`npm audit` jamais lancés)** :
- Backend — 8 CVE trouvées sur 3 packages runtime réels : `Django` 5.2.16→**5.2.17**, `cryptography` 48.0.1→**50.0.0**, `sqlparse` 0.5.5→**0.6.0**. Mis à jour dans `backend_env` (pip install) et `requirements.txt`. `pip-audit -r requirements.txt` re-vérifié après upgrade : **"No known vulnerabilities found"**.
- Frontend — 10 vulnérabilités trouvées via `npm audit`, mais **toutes dans `devDependencies`** (Cypress et sa chaîne : `extract-zip`, `qs`, `uuid`, `@cypress/request` ; plus tooling build/test : `postcss`, `js-yaml`, `nanoid`, `undici`, `brace-expansion`). Rien dans les `dependencies` réelles (`react`, `axios`, `react-router-dom`, etc.) — zéro risque en prod, uniquement surface d'attaque locale/CI. **Décision : pas de correctif** — `npm audit fix --force` upgraderait Cypress vers 15.21.0, connu cassé sur Windows 10 (cf. décision technique existante "Cypress version" dans ce fichier). Pas de valeur à casser Cypress pour patcher des CVE dev-only sans impact prod.

**Tests** : backend 281/281 ✅ (relancé après chaque étape significative — throttling, garde-fou secrets, upgrade dépendances), `python manage.py check` propre, `pip-audit` propre.

**Suite (même session, jour même)** — 2 points restants de la revue de sécurité traités après validation utilisateur sur les choix (question ciblée) :

**5. Scan de dépendances automatisé** : `.github/dependabot.yml` créé — écosystèmes `pip` (`/taftech_backend`) et `npm` (`/taftech_frontend`), fréquence hebdomadaire, PR automatique à chaque nouvelle CVE détectée sur une dépendance. Choix confirmé par l'utilisateur face à l'alternative "job CI pip-audit/npm audit qui échoue le build" — Dependabot préféré car natif GitHub, zéro maintenance.

**6. Anti-abus par email (en plus du throttle IP)** : `WriteActionThrottle` (30/h par IP, session précédente) reste contournable par un attaquant avec un pool d'IPs. Nouveau `EmailRateThrottle` (`jobs/throttles.py`, scope `email_write`, **10/jour**) — clé de cache basée sur l'email soumis dans `request.data` (pas l'IP), donc un même email ne peut pas spammer même en changeant d'adresse IP. `email_field` configurable par sous-classe (`PostulerRapideEmailThrottle` lit `email_rapide`, les 2 autres lisent `email` par défaut). Appliqué en throttle **supplémentaire** (pas en remplacement) sur `PostulerRapideAPIView`, `EnvoyerCandidatureSpontaneeAPIView`, `ContactMessageAPIView` — `throttle_classes = [WriteActionThrottle, EmailRateThrottle]`. Si le champ email est absent/vide, `get_cache_key` retourne `None` → pas de throttle (comportement DRF standard, pas de crash). Bypass Cypress en DEBUG identique aux autres throttles du projet.

**Tests** : 281/281 ✅ — 1 échec observé au premier run (`test_log_ordering_desc`, `EquipeActionLogModelTests`) identifié comme **flaky préexistant** (ordre de 2 logs par timestamp `auto_now` pouvant coller sous charge de suite complète, aucun rapport avec les throttles), confirmé par passage en isolation puis re-run complet au vert.

---

