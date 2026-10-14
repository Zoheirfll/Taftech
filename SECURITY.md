# SECURITY.md — Journal des audits sécurité TafTech

> Historique des audits de sécurité menés sur ce projet, findings et correctifs appliqués. Mis à jour après chaque session d'audit.

---

## 🌿 Branche

Travail initial effectué sur `security/audit-2026-07` (créée depuis `main`) — **mergée dans `main`** (commit `749997e`). Toutes les branches créées depuis héritent des correctifs ci-dessous.

---

## ✅ 18. Revue complète du panel admin — garde-fous sur les actions sensibles (28/09/2026)

Revue page par page des 25 écrans `/admin-taftech`. Findings sécurité/intégrité (le reste — UX, bugs d'affichage — est dans `CLAUDE.md`, session du 28/09/2026) :

| # | Finding | Risque | Correctif |
|---|---------|--------|-----------|
| 1 | `AdminUserModerateAPIView` (PATCH `admin/utilisateurs/<id>/moderer/`) laissait un admin **bloquer son propre compte** | Perte d'accès immédiate au panel, retour arrière uniquement en base | Refus 400 si `user.pk == request.user.pk` + 2 tests (`test_api_admin.py`) |
| 2 | Diffusion email (`AdminBroadcastEmailAPIView`) envoyée aussi aux comptes **bloqués** par l'admin | Un compte suspendu continuait à recevoir des communications | Filtre `user__is_active=True` |
| 3 | Suppression d'un compte admin = un seul clic de confirmation | Suppression définitive par mégarde | Confirmation renforcée : saisie du mot-clé `SUPPRIMER` (bouton désactivé sinon) + test |
| 4 | Activation d'un abonnement payant (demandes CIB/EDAHABIA) en **un clic, sans confirmation**, et double clic = **prolongation en double** | Accorder un abonnement non payé / durée doublée | Confirmation avec récapitulatif (palier, durée, entreprise) + verrou anti double-clic + test |
| 5 | Changement de prix d'un palier appliqué sans confirmation | Erreur de saisie facturée via Chargily aux prochains paiements | Confirmation « ancien → nouveau tarif » (seulement si un prix change) + test |
| 6 | Recherches admin non encodées dans l'URL (`search=${search}`) | Saisie `&`/`#` → paramètres injectés/tronqués dans la requête | `encodeURIComponent` sur tous les paramètres libres de `adminService.js` |
| 7 | Mentions légales : formulaire vide affiché après un échec de chargement | Un « Enregistrer » écrasait RC/NIF/adresse réels par des champs vides | Écran d'erreur + « Réessayer » à la place du formulaire |

**Vérifié sans anomalie** : journal d'audit en lecture seule (aucune méthode d'écriture sur `AdminAuditLogAPIView`) ; suppression d'admin déjà protégée côté backend (auto-suppression et superutilisateur refusés, mot de passe ≥ 8 caractères) ; rendez-vous admin scopés `role == 'ADMIN'`.

**Non modifié (volontairement)** : les vues de `jobs/views/admin.py` s'appuient sur `IsAdminUser` (`is_staff`) sans vérification `role == 'ADMIN'` explicite. Pas de faille (un non-staff reste bloqué), mais incohérent avec la convention des vues CMS ; l'ajouter casserait les tests qui créent des superusers sans `role`. À harmoniser dans une passe dédiée si souhaité.

---

## ✅ 17. Throttling par endpoint — uploads & IA (03/09/2026)

**Contexte** : demande explicite de l'utilisateur de resserrer le rate limiting sur les uploads de fichiers et la génération IA, au-delà des scopes déjà en place (`auth`, `groq`, `public_read`, `write_action`, `email_write`, `invitation_cvtheque`). Audit ciblé de tous les endpoints authentifiés avec `MultiPartParser` ou appel Groq, pas un audit de vulnérabilité classique (pas de nouveau finding IDOR/injection).

**Trouvé — 6 endpoints authentifiés sans aucun throttle au-delà du seau générique `user` (1000/jour)** :
- `ParserCVAPIView` (`jobs/views/ia.py`) — le plus sérieux : upload de fichier **et** 1-2 appels Groq (extraction + agent de classification domaine), sans limite dédiée depuis sa création.
- `DocumentCandidatAPIView.post` (`jobs/views/candidat_dashboard.py`) — upload de document privé candidat, aucune limite de fréquence **ni de nombre** (un candidat pouvait accumuler des documents indéfiniment, un seul type "CV" pouvait être uploadé en 50 exemplaires).
- `ProfilCandidatAPIView.put` (CV/photo profil), `UpdateProfilEntrepriseAPIView` (logo/bannière), `EntreprisePhotosAPIView.post` (galerie, déjà plafonnée à 12 photos mais sans throttle de fréquence), `PostulerAPIView` (candidature réelle avec CV/lettre) — tous sans throttle dédié.
- Côté admin (`IsAdminUser`, risque plus faible mais non nul si session compromise) : `ArticleAdminAPIView`/`ArticleAdminDetailAPIView` (image de couverture), `BanniereAccueilAdminAPIView` (carrousel accueil) — sans throttle.

**Correctifs appliqués** (`jobs/throttles.py`, `settings.py`) :
- `FileUploadThrottle` (scope `file_upload`, 20/h, ignore GET/HEAD/OPTIONS) — appliqué à `ProfilCandidatAPIView`, `DocumentCandidatAPIView`, `UpdateProfilEntrepriseAPIView`, `EntreprisePhotosAPIView`, `PostulerAPIView`.
- `CVParserThrottle` (scope `cv_parser`, 10/h, dédié — plus strict que le scope `groq` partagé car combine upload + coût Groq) — appliqué à `ParserCVAPIView` en plus de `FileUploadThrottle` (le plus restrictif des deux s'applique).
- `AdminFileUploadThrottle` (scope `admin_upload`, 100/h — plus généreux car publication en lot légitime par un admin) — appliqué à `ArticleAdminAPIView`, `ArticleAdminDetailAPIView`, `BanniereAccueilAdminAPIView`.
- **Nombre de documents privés plafonné** : `DocumentCandidatAPIView.post` refuse désormais tout nouvel upload au-delà de 20 documents au total, **et un seul document par type** (`TypeDocument`, y compris le bucket "sans type") — un upload sur un type déjà utilisé est rejeté (400) tant que l'ancien n'est pas supprimé explicitement.

**Non touché (déjà correctement borné avant cette session)** : taille de fichier (5 Mo CV/documents/lettre, 2-5 Mo logo/photo/bannière selon le champ) et whitelist d'extensions + vérification magic-bytes — déjà en place au niveau modèle (`FileExtensionValidator`, `validate_document_mime`/`validate_image_mime`, `validate_file_size`), rien à changer.

**Tests** : 410/410 backend ✅ (suite complète `jobs accounts` relancée après chaque lot de changements), `python manage.py check` propre.

---

## ✅ 16. Round 2 (26/08/2026) — audit complet, approfondissement

**Contexte** : suite directe du round 1 ci-dessous, même jour, à la demande explicite d'aller plus loin après un premier passage propre. Méthodologie identique (sous-agent d'exploration + sous-agent de vérification indépendant par finding, seuil de confiance ≥8/10).

**Périmètre couvert** (zones non approfondies en round 1) :
- Endpoints d'upload de fichiers (CV/PDF/DOCX au-delà des images, noms de fichiers, magic bytes)
- IDOR sur ~15 endpoints supplémentaires : `ExperienceDetailAPIView`/`FormationDetailAPIView`, `OffreSauvegardeeDeleteAPIView`, `AlerteEmploiDetailAPIView`/`AlerteMarquerVueAPIView`, `DocumentCandidatAPIView`, `RendezVousAPIView`/`RendezVousAnnulerAPIView`, `CompetenceCandidatAPIView`, `ActiviteProfilAPIView`, `NotificationListAPIView`, `QuestionnaireListCreateAPIView`, `EquipeAuditLogAPIView`, endpoints de modération admin
- Flux reset password / vérification email (ciblage d'un autre compte via `user_id` manipulé, lockout sur le code lui-même)
- JWT/cookies : source de confiance unique (cookie httponly, jamais de fallback header/body), posture CSRF vu l'auth par cookie
- Impersonation admin/propriétaire (changement de mot de passe/email d'un tiers via un endpoint d'équipe)
- Manipulation du montant Chargily (checkout + palier) — le prix est-il toujours résolu serveur ?
- Mass-assignment via serializers `fields = '__all__'` exposant des champs sensibles (rôle, `est_premium`, etc.)
- SSRF (host/protocole contrôlé par l'utilisateur, pas juste le path)

**Résultat : aucun finding ≥7/10.** Tout RAS, notamment :
- CSRF mitigé — cookie JWT `SameSite=Lax` httponly, aucun `SameSite=None` dans tout le codebase, aucun endpoint n'accepte un JWT depuis un header/body alternatif.
- Reset password : le code est lié à l'utilisateur directement dans la requête (`User.objects.get(email=email, code_verification=code)`), aucune manière de cibler un autre compte via un `user_id` fourni séparément.
- Chargily : montant toujours résolu côté serveur depuis `PremiumPlan`/`Palier` par identifiant, jamais un montant fourni par le client, sur les 3 points d'entrée (checkout premium, checkout palier, webhook).
- IDOR : le pattern "scope direct dans le filtre de requête (`profil=request.user.profil_candidat`) ou vérification explicite post-fetch avant mutation" est appliqué sans exception sur les ~15 endpoints vérifiés.

**Point de vigilance noté (pas un correctif à faire aujourd'hui)** : `OffreEmploiSerializer` utilise `fields = '__all__'` et son seul usage en écriture (`jobs/views/admin.py:110`) est gated `IsAdminUser` — sûr aujourd'hui, mais deviendrait un vecteur de mass-assignment réel (`entreprise`, `statut_moderation`, `est_active`) si ce serializer était un jour réutilisé sur un chemin d'écriture non-admin. À garder en tête pour tout futur refactor touchant ce serializer.

---

## ✅ 15. Round 1 (26/08/2026) — audit complet post-merge `specs/important-features`

**Contexte** : audit demandé après le merge de la branche `specs/important-features` dans `main` (24 commits — refonte page vitrine entreprise, blog, navbar, recadrage image, métiers accessibles déterministes, correctifs parser CV). Branche propre au moment de l'audit (rien en attente), donc audit du codebase complet plutôt que d'un diff.

**Périmètre couvert** : injection SQL/commande/template, path traversal, JWT/session, désérialisation, XSS (`dangerouslySetInnerHTML`), secrets en dur, signature webhook Chargily, permissions endpoints admin, IDOR sur le service de fichiers privés candidats, escalade de rôle d'équipe, CORS.

**1 finding retenu (Medium, confiance 8/10 après vérification indépendante) — corrigé le jour même** (commit `6cff857`) :

> **`InviterMembreAPIView` — ajout d'équipe non consenti + énumération de comptes** (`jobs/views/equipe.py`)
> La branche "compte email classique existant" ajoutait l'utilisateur **directement** à `MembreEquipe` sans étape de consentement (`MembreEquipe.objects.create(...)`), contrairement aux branches compte Google / email inconnu qui passaient déjà par `InvitationEquipe` + acceptation par token. Le rôle attribué était en plus contrôlable par l'inviteur (`role` dans le payload, potentiellement `ADMIN`). Les 3 messages de réponse distincts (`'ajouté(e) directement'` / `'invitation (Google)'` / `'Invitation envoyée'`) permettaient en plus l'énumération de comptes TafTech par email, par n'importe quel recruteur authentifié sur un palier Business+.
>
> **Fix appliqué** : les 3 cas passent désormais par le même flux `InvitationEquipe` (token, expiration 72h, acceptation explicite via `AccepterInvitationAPIView` — qui gérait déjà la confirmation de mot de passe pour un compte existant non-Google, aucun nouveau code d'acceptation à écrire). Message de réponse unifié (`"Invitation envoyée à {email}."`) quelle que soit l'existence/le type du compte cible. `_envoyer_email_bienvenue()` (devenue morte) supprimée.
>
> **Tests** : `jobs.tests.test_api_equipe` mis à jour (`test_ajout_direct_compte_existant` remplacé par `test_compte_existant_recoit_invitation_pas_ajout_direct` + nouveau `test_message_invitation_identique_compte_existant_ou_non`) — 50/50 ✅. Suite backend complète relancée : 353/353 ✅.

**Tout le reste du périmètre round 1 : RAS**, notamment :
- Aucune requête SQL brute/`.raw()`/`.extra()`, aucun `eval`/`exec`/`pickle`/`yaml.load` non sûr dans tout le backend ; seul usage de `subprocess` = scraper Emploitic (commande admin, pas exposée aux utilisateurs).
- Webhook Chargily (`jobs/views/recruteur.py`) : `hmac.compare_digest(signature_attendue, signature_reçue)` vérifié et retourne 400 **avant** toute mutation de modèle.
- Sinks `dangerouslySetInnerHTML` (`ArticleDetail.jsx`, `PageStatiqueGenerique.jsx`, `QuiSommesNous.jsx`) : contenu toujours passé par `bleach.clean()` à l'écriture (`jobs/models.py`), whitelist stricte de balises/attributs, `javascript:` neutralisé par le comportement par défaut de bleach (`ALLOWED_PROTOCOLS`). Écriture réservée `IsAdminUser`.
- Service de fichiers privés (`CandidatFichierPriveAPIView`) : IDOR vérifié correctement (propriétaire/admin/recruteur ayant reçu la candidature/CVthèque premium) avant streaming, `os.path.basename()` empêche tout path traversal.
- Tous les endpoints admin échantillonnés déclarent `IsAdminUser` **et** re-vérifient `request.user.role == 'ADMIN'` dans le corps de la méthode.
- Escalade de rôle d'équipe bloquée : `ROLES_MODIFIABLES = ['ADMIN','UTILISATEUR','INVITE']` (jamais `PROPRIETAIRE`).
- `CORS_ALLOWED_ORIGINS` en liste blanche stricte (pas de wildcard), secrets prod avec garde-fou `ImproperlyConfigured` au démarrage si absents.

---

## ✅ 14. Suivi (28/07/2026) — re-vérification des 13 sections + nouvelles dépendances

**Vérifié** : les 13 sections ci-dessous re-contrôlées une à une contre le code de `feature/us13-aout` (basée sur `main` post-audit) — tous les correctifs (SAMESITE=Strict, AuthRateThrottle, CandidatFichierPriveAPIView, IsAdminUser, RegexValidator téléphone/NIN, dedup `iexact`, filtre `statut_moderation` sur JobDetail, clamp `nb_mois`, URL relative `errorReporter.js`, guard `SECRET_KEY`) sont bien présents. Rien à corriger de ce côté.

**Nouvelles vulnérabilités trouvées** (apparues depuis la rédaction de l'audit initial, CVEs publiées après) :
- `react-router-dom` 7.15.1 → **7.18.2** (`npm audit fix`) — CVE open redirect via backslash, XSS `RSCErrorHandler`, DoS route matching.
- `pyasn1` 0.6.3 → **0.6.4** (dépendance transitive crypto, `pip install --upgrade pyasn1` dans le venv — pas dans `requirements.txt`, à re-vérifier au prochain `pip freeze`).
- **Risque accepté, non corrigé** : `react-router-dom@7.18.2` reste flagué "high" pour un CVE **RSC Mode CSRF Bypass** (`GHSA-qwww-vcr4-c8h2`) — non applicable, ce projet est une SPA Vite/React classique, aucun usage de React Server Components (fonctionnalité Next.js). Downgrader casserait les autres CVEs déjà corrigés.
- **Piège évité** : `npm audit fix --force` a aussi remonté `cypress` à `15.19.0` en effet de bord — binaire cassé sur Windows 10 (déjà documenté dans `CLAUDE.md`, raison du pin `13.17.0`). Repéré et repin manuellement avant de continuer.
- `pip`/`setuptools` (18 CVEs via `pip-audit`) : vulnérabilités de l'outil de packaging lui-même (surface d'attaque au moment du `pip install`, pas exposée par l'app web en runtime) — non traité, hors périmètre de l'audit applicatif.

**Build + tests relancés après chaque changement de dépendance** : frontend 338/338 ✅, `npx vite build` propre.

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

---

## Méthodologie des audits (round 1/2, 26/08/2026)

Un sous-agent d'exploration produit une liste de findings candidats avec fichier/ligne/scénario d'exploitation concret, puis chaque finding passe par un sous-agent de vérification indépendant qui relit le code et attribue un score de confiance 1-10. Seuls les findings ≥8/10 après vérification sont retenus. Exclusions systématiques : DOS, secrets sur disque déjà gitignorés, rate-limiting, vérifications côté client uniquement (le backend est la source de vérité), CVE de dépendances tierces (gérées par Dependabot), ReDoS/injection regex, race conditions théoriques, manque de logs d'audit.

**Ce qu'un audit de code ne couvre pas** : sécurité de l'infrastructure de déploiement (serveur, nginx, secrets en prod réels — hors de ce repo), test dynamique / pentest actif (fuzzing, exploitation réelle — ceci reste une revue statique par lecture de code), comportement des services tiers (Groq, Chargily) au-delà de l'intégration côté TafTech.

**Recommandation** : avant tout lancement avec paiement réel à grande échelle, faire compléter cet audit par un pentest externe humain, en particulier sur le flux Chargily et l'authentification JWT.

---

## ✅ 14. Exposition de données candidat en CVthèque avant déblocage (25/09/2026)

**Contexte** : signalé par l'utilisateur avec capture d'écran — un profil candidat non débloqué (bouton "Débloquer ce profil (1 crédit)" toujours affiché) exposait déjà des informations censées être réservées au déblocage.

**Trouvé et corrigé** — `jobs/serializers/profils.py::ProfilCandidatDTO` :
- **`linkedin`/`github`** : les méthodes `get_linkedin()`/`get_github()` existaient et gataient correctement sur `_peut_voir_coordonnees(obj)`, mais **n'étaient jamais appelées par DRF** — les champs `linkedin`/`github` étaient listés dans `Meta.fields` sans être déclarés comme `serializers.SerializerMethodField()` sur la classe. DRF génère alors le champ automatiquement depuis le modèle (comportement par défaut de `ModelSerializer`), en ignorant silencieusement la méthode `get_<field>` — les deux liens fuyaient donc systématiquement, avant tout déblocage. Fix : déclaration explicite en `SerializerMethodField`.
- **`bio`** (texte "À propos") : aucune logique de masquage du tout — un champ texte libre non gaté. Vérifié sur un cas réel : le texte mentionne fréquemment des noms d'employeurs précis ("... chez Renault Algérie Production et une expérience récente sur le site Stellantis/Fiat d'Oran ..."), soit l'information la plus identifiante d'un profil, alors que les fiches d'expérience structurées affichaient correctement "Entreprise non communiquée" pour la même donnée. Nouveau `get_bio()` gaté par `_peut_voir_coordonnees()`.
- **`photo_profil`, `first_name`/`last_name` (nom complet), `commune`, `diplome`/`diplome_ref_libelle`, `metier_libelle`** : sur demande explicite de l'utilisateur, masqués eux aussi avant déblocage (photo réelle, nom complet, précision géographique fine, diplôme, métier) — seuls le titre du poste et la wilaya restent visibles pour permettre de parcourir la liste avant de dépenser un crédit. Avant ce correctif, `last_name` était tronqué à l'initiale (`"T."`) mais `first_name` restait affiché en clair — combiné à la photo réelle, la ré-identification restait triviale malgré le masquage partiel du nom.

**Bug fonctionnel corrigé au passage (pas une fuite de données, mais lié)** — `CVTheque.jsx` : la `key` React et la logique de sélection de carte (`isSelected`) reposaient sur `candidat.email`, qui est justement `null` tant que le profil n'est pas débloqué — toutes les cartes non débloquées partageaient donc la même clé et se marquaient mutuellement "sélectionnées" dans l'UI. Basculé sur `user_id` (toujours présent, débloqué ou non).

**Non touché, décision produit assumée** : le titre du poste (`titre_professionnel`) et les descriptions d'expérience détaillées restent visibles avant déblocage — c'est ce qui permet à un recruteur de juger si un profil mérite un crédit ; sans ça, la CVthèque ne servirait à rien pour la découverte.

**Tests** : `test_api_cvtheque.py`/`test_api_cvtheque_credits.py`/`test_serializers_profils.py`/`test_api_candidat.py`/`test_api_paliers_gating.py`/`test_api_recruteur.py` (102/102 ✅), frontend `CVTheque.test.jsx` (15/15 ✅), `npx vite build` propre.

---

## ✅ 15. Race condition sur la rotation du refresh token JWT — déconnexions forcées intempestives (25/09/2026)

**Contexte** : signalé par l'utilisateur comme un bug récurrent — déconnecté brutalement ("session expirée") en pleine utilisation, sans avoir été inactif.

**Cause** : `SIMPLE_JWT` (`taftech_backend/settings.py`) est configuré avec `ROTATE_REFRESH_TOKENS=True` + `BLACKLIST_AFTER_ROTATION=True` (bonne pratique de sécurité — empêche le rejeu d'un refresh token volé) : chaque appel réussi à `token/refresh/` **blackliste immédiatement l'ancien refresh token** et en pose un nouveau via `Set-Cookie`.

Or `taftech_frontend/src/api/axiosConfig.js` ne mutualisait pas les rafraîchissements. Sur une page qui déclenche plusieurs appels API en parallèle (dashboard, CVthèque — plusieurs `useEffect`/`Promise.all` indépendants), si l'access token (durée de vie 15 min) expire pile à ce moment, **chaque requête tombant en 401 déclenchait indépendamment son propre appel `token/refresh/`**. Le premier réussissait et blacklistait l'ancien refresh token ; les suivants, partis à quelques millisecondes d'écart (avant que le navigateur applique le nouveau `Set-Cookie` du premier appel), envoyaient encore l'ancien refresh token — désormais blacklisté → échec 401 sur le refresh → l'interceptor traitait ça comme "session vraiment expirée" et forçait une déconnexion complète, alors que le premier refresh avait bel et bien réussi une fraction de seconde plus tôt.

**Fix** — `axiosConfig.js` : un seul rafraîchissement en vol à la fois (variable module-level `refreshEnCours`, une `Promise` partagée). Toute requête qui échoue en 401 pendant qu'un rafraîchissement est déjà en cours **attend ce même rafraîchissement** au lieu d'en déclencher un second, puis rejoue sa requête originale une fois le nouvel access token posé. Comportement de déconnexion en cas d'échec réel du refresh (refresh token lui-même expiré/invalide après 7 jours) inchangé.

**Non modifié côté backend** — la configuration `ROTATE_REFRESH_TOKENS`/`BLACKLIST_AFTER_ROTATION` reste la bonne pratique de sécurité à conserver ; le bug était uniquement dans la gestion côté client de la concurrence des appels de rafraîchissement, pas dans la politique de rotation elle-même.

**Tests** : `api.test.js`/`authService.test.js` (24/24 ✅, aucun test dédié à la concurrence de refresh n'existait — à ajouter si l'occasion se présente), `npx vite build` propre.

## ✅ 19. Journal « Qualité IA » : minimisation des données et contrôle d'accès (29/09/2026)

- **Minimisation (loi 18-07)** : `ParsingCV` ne stocke que des compteurs ; `CorrectionParsing` que des intitulés de poste/diplôme (200 caractères) et des identifiants de référentiel, jamais le texte du CV, l'employeur ni les missions. `user` passe à NULL à la suppression du compte. Purge automatique à 12 mois (`purger_qualite_ia`).
- **Accès** : lecture réservée à `IsAdminRole` (staff **et** `role='ADMIN'`). Écriture des corrections : candidat authentifié, uniquement sur **son propre** `ParsingCV` (404 sinon), `WriteActionThrottle`, 30 entrées maximum par envoi, types validés contre une liste fermée, chaînes tronquées.
- **Action admin** : la création d'une appellation depuis une correction écrit un `AuditLog`.
- Tests : `jobs/tests/test_qualite_ia.py` (propriété du parsing, validation, permissions admin, 409 sur doublon, purge).

## ✅ 20. Audit des accès par palier — contournements de limites corrigés (29/09/2026)

- **Limite d'offres contournable** : les offres `EN_ATTENTE` n'étaient pas comptées (dépôt illimité pendant la modération, dépassement à l'approbation) ; une offre `REJETEE` corrigée revenait `EN_ATTENTE` sans revérification. Comptage et revérification ajoutés.
- **Analyse IA — contrôle d'accès erroné** : filtre sur `user.role` (au lieu de l'appartenance à l'entreprise et du rôle d'équipe) → refus à tort des membres de compte CANDIDAT, acceptation du rôle « Invité » (lecture seule) qui consommait le quota du palier.
- **Quotas IA multipliables par l'équipe** : compteur par utilisateur → une équipe Business de N personnes avait N fois le quota. Compteur désormais par entreprise (propriétaire + membres).
- **Membres après rétrogradation** : seule l'expiration bloquait les membres (login + dashboard). Un passage de Business à Pro/Starter laissait l'équipe active. Le contrôle est maintenant centralisé dans `get_entreprise_for_user` (tous les endpoints).
- Tests : `jobs/tests/test_audit_acces_paliers.py`.

## ✅ 21. Entreprise non validée : aucun accès aux données personnelles des candidats (12/10/2026)

- **Règle (contrôlée côté serveur)** : entreprise validée par TAFTECH (`est_approuvee`) + abonnement/droit actif + permission = accès aux coordonnées et CV. Avant ce correctif, seule la partie abonnement/palier était vérifiée sur la plupart des points : une entreprise non validée avec un abonnement actif, ou ayant déjà reçu une candidature, pouvait accéder aux données.
- **Garde commune** : `jobs/paliers_utils.py::reponse_entreprise_non_validee(entreprise)` → 403 `ENTREPRISE_NON_VALIDEE`.
- **Points protégés** : CVthèque, déblocage de profil, téléchargement CV/photo (`CandidatFichierPriveAPIView._acces_autorise`, y compris après un déblocage ou une candidature reçue), documents privés partagés (liste + fichier), favoris, invitation à postuler, candidats recommandés, exports Excel (global et par offre), candidatures spontanées, Top 5.
- **Tableau de bord** : reste accessible (état de validation, abonnement) mais `candidatures: []` pour toute entreprise non validée (`_offres_sans_candidats_si_non_validee`).
- **Limite connue** : les vues de statut/évaluation d'une candidature n'ont pas de garde explicite (sans candidature visible, une entreprise non validée n'a rien à traiter).
- **Autre** : le 403 `PALIER_INSUFFISANT` de « Candidats recommandés » (palier < Pro) est un blocage normal, plus journalisé comme erreur système côté frontend.
- Tests : `jobs/tests/test_entreprise_non_validee_acces_candidats.py` (8), `jobs/tests/test_api_candidats_recommandes.py` (11).

## ✅ 22. CVthèque : un déblocage n'est pas un accès « à vie » — le candidat garde la maîtrise de son profil (13/10/2026)

- **Constat** : les textes annonçaient un accès « tant que le profil reste actif et accessible selon ses paramètres », mais le code ne le faisait pas. (1) Le réglage de visibilité du candidat (`visible_cvtheque`) n'était lu qu'au moment d'un nouveau déblocage : une entreprise qui avait déjà débloqué un profil le gardait, et le profil masqué restait listé. (2) La suppression de compte est un soft-delete (`is_active=False`) : la liste de la CVthèque l'excluait, mais le téléchargement du CV (`CandidatFichierPriveAPIView`) et des documents partagés ne vérifiaient ni le compte actif ni la visibilité — un recruteur ayant débloqué le profil gardait donc accès au CV et aux documents d'un compte supprimé.
- **Décision (validée)** : profil masqué → accès **suspendu** pour tous les recruteurs, y compris ceux qui avaient débloqué, **rendu sans nouvelle dépense** si le candidat réactive la visibilité (la ligne `AccesCandidatDebloque` n'est jamais supprimée par un masquage) ; profil masqué → **disparaît de la liste** ; compte supprimé → **tout accès cesse**.
- **Garde commune** : `credits_utils.profil_accessible_aux_recruteurs` (compte actif ET profil visible), appliquée à : la liste CVthèque (`visible_cvtheque=True` dans la requête de base, favoris compris), le téléchargement CV/photo par déblocage, la liste et le fichier des documents partagés, le déblocage (compte supprimé = 404 ; profil masqué = 403 `PROFIL_NON_VISIBLE`, déjà en place).
- **Candidature ≠ déblocage** : une entreprise à qui le candidat a lui-même postulé garde l'accès à son CV tant que le compte est actif, même profil masqué (relation voulue par le candidat). Si le compte est supprimé, plus aucun accès recruteur, y compris par candidature passée.
- **CV de recrutement vs documents privés** (vérifié, inchangé) : le CV du profil est visible après déblocage ou candidature ; les documents privés (`DocumentCandidat`) ne sont jamais exposés automatiquement, même après déblocage — uniquement via un `PartageDocument` explicite du candidat, révocable, et désormais inopérant tant que le profil est masqué.
- **Textes** : « accès à vie » / « définitivement » retirés de l'interface (packs de crédits admin, bandeaux CVthèque et abonnements, confirmation de déblocage, page « Comment fonctionnent les crédits », page « Ce que voient les recruteurs », réglage de visibilité du candidat renommé « Visibilité de mon profil dans la CVthèque »). Aucune occurrence dans les FAQ/pages/articles/bannières en base.
- **Non modifié (décision commerciale)** : un crédit déjà dépensé n'est pas remboursé quand l'accès est suspendu ou terminé ; les textes ne promettent ni ne nient de remboursement.
- Tests : `jobs/tests/test_cvtheque_profil_masque_supprime.py` (10).

## ✅ 23. Exports : injection de formule Excel neutralisée, plus aucun CSV (13/10/2026)

- **Constat** : décision client « plus de CSV, uniquement du `.xlsx` ». Or openpyxl écrit une chaîne commençant par `=` comme une **formule** : un nom d'utilisateur, un nom d'entreprise, un titre d'offre ou une candidature rapide **anonyme** (`nom_rapide`, aucun compte requis) valant `=HYPERLINK("http://…","clic")` s'exécutait à l'ouverture du fichier par l'admin (exports admin) ou le recruteur (export des candidatures). L'export recruteur des candidatures n'avait pas cette protection.
- **Correctif** : `views/export_xlsx.py` — `neutraliser_formules(ws)` force le type texte sur toute chaîne ; utilisé par `reponse_xlsx` (4 exports admin + export générique des graphiques) et par `_construire_classeur_candidatures` (export recruteur).
- **Contrôle d'accès inchangé** : exports admin = `IsAdminRole` ; export recruteur scopé à l'entreprise (`get_entreprise_for_user`).
- **Plafond de taille** : `ExportGraphiqueExcelAPIView` (authentifié + throttle d'écriture) refuse au-delà de 20 000 lignes ou 50 colonnes (400), valeurs généreuses qui ne bornent que l'abus.
- Tests : `test_api_admin_exports.py::test_exports_admin_xlsx_neutralisent_les_formules`, `test_export_graphique_excel.py` (4, dont le plafond).

## ✅ 24. Configuration IA : prompts réservés au Super Admin, audit, plafond global avec alerte (13/10/2026)

- **Constat** : l'architecture `AIConfig` (singleton, page `/admin-taftech`) est conservée telle quelle. Mais (1) tout compte `role=ADMIN` + `is_staff` pouvait lire et modifier les 5 prompts, qui pilotent le comportement de l'IA pour tous les utilisateurs ; (2) aucune modification de configuration IA n'était tracée ; (3) le plafond global `budget_ia_appels_mois_max` existait mais était **vide (= illimité) par défaut** et aucune alerte n'était envoyée.
- **Super Admin = `is_superuser`** (déjà distingué dans la page Comptes admin). `AIConfigAdminAPIView` (`IsAdminRole`) : pour un admin simple, GET **n'inclut pas** les 5 champs `*_prompt` (`prompts_accessibles: false`) et un PUT contenant l'un d'eux est refusé en **403 `PROMPTS_RESERVES_SUPER_ADMIN`** (rien n'est enregistré). L'interface affiche « modifiable uniquement par le Super Admin » et n'envoie jamais ces champs. `AIConfig` n'est pas enregistré dans l'admin Django : l'API REST est le seul accès.
- **Journal d'audit** : `MODIFIER_PROMPT_IA` (fonction modifiée, longueur avant→après, empreinte SHA-256 de 8 caractères — **jamais le texte du prompt**) et `MODIFIER_CONFIG_IA` (fournisseur, modèle, température, quotas, plafond, seuil : ancienne→nouvelle valeur). Aucun log si rien ne change réellement. Détail tronqué à 255 caractères (`AuditLog.detail`). Migration `0133`.
- **Plafond global + alerte** : au seuil `budget_ia_alerte_pct` (80 % par défaut) puis à l'épuisement, **un email aux Super Admins actifs** (repli : `EMAIL_HOST_USER`), **une fois par mois et par niveau** (clés `AAAA-MM:ALERTE|EPUISE` en base, sous verrou de ligne : pas de doublon en cas d'appels simultanés ; email envoyé après commit). Modifier le plafond ou le seuil **ré-arme** les alertes du mois. Une panne d'envoi est journalisée mais ne bloque jamais l'appel IA. Au plafond, l'IA est suspendue pour tous (`BUDGET_IA_EPUISE`, comportement existant). Page admin : jauge « x / plafond », avertissement tant qu'aucun plafond n'est défini.
- **Plafond et seuil réservés au Super Admin (14/10/2026)** : le plafond global est un réglage de coût ; un admin simple pouvait le relever ou le vider, ce qui supprimait la protection. Désormais, pour un admin simple, GET renvoie toujours les deux valeurs (lecture, jauge) avec `budget_modifiable: false`, et un PUT contenant `budget_ia_appels_mois_max` ou `budget_ia_alerte_pct` est refusé en **403 `BUDGET_RESERVE_SUPER_ADMIN`** (rien n'est enregistré, aucun log d'audit). L'écran désactive les deux champs et ne les renvoie jamais. Les autres réglages (modèle, quotas par fonction, interrupteurs) restent modifiables par tout admin. Tests : `test_ai_config_securite.py` (`AccesPromptsTests`), `AdminIAConfig.test.jsx`.
- **Limite connue** : le plafond compte des **appels**, pas des tokens ; la dépense maximale théorique est donc plafond × `max_tokens` de la fonction la plus coûteuse. Un plafond en tokens exigerait d'enregistrer la consommation réelle par appel (non fait).
- **À faire avant production** : définir la valeur du plafond global (aujourd'hui vide) ; prévoir la sauvegarde de l'historique des prompts si un retour arrière doit être possible (le journal ne garde pas le texte).
- Tests : `jobs/tests/test_ai_config_securite.py` (17), `AdminIAConfig.test.jsx` (+3).

## ✅ 25. Questions disqualifiantes : exigences professionnelles objectives uniquement (14/10/2026)

- **Risque** : une question « Disqualifiant » met le score du candidat à 0 sans intervention humaine ; son texte étant libre, un recruteur pouvait éliminer sur l'âge, le sexe, la situation familiale, etc. (discrimination à l'embauche).
- **Correction** (la fonctionnalité est conservée) : à l'enregistrement d'un questionnaire (`POST`/`PUT /questionnaires/`), `questionnaire_validation.py` refuse en **400**, avant toute écriture (un `PUT` refusé conserve l'ancien questionnaire), (1) une question disqualifiante **sans justification professionnelle** (15 à 500 caractères, nouveau champ `QuestionQuestionnaire.justification_disqualifiant`, migration `0136`) ; (2) une question disqualifiante dont le **texte ou un choix de réponse** vise un critère protégé (âge et bornes d'âge, sexe, situation familiale, grossesse, religion, origine, handicap/santé, opinions politiques, syndicat, orientation sexuelle). Comparaison sans accents ni casse, sur des mots entiers (« stage » n'est pas « âge », « 5 ans d'expérience » reste permis).
- **Transparence** : la justification est affichée au candidat sous la question (« Exigence : … ») et à la modération admin dans le détail de l'offre.
- **Non bloqués volontairement** : permis, passeport, habilitation, service national, nationalité : ce sont des exigences légales ou professionnelles possibles d'une offre.
- **Limites** : le garde-fou est une liste de termes. Il bloque les formulations évidentes, pas une reformulation détournée ; la justification tracée et visible est le second filet. Les questions disqualifiantes **déjà enregistrées** n'ont pas de justification : elles restent actives (aucune offre existante n'est cassée) mais exigent une justification dès que leur questionnaire est modifié ; l'admin les voit marquées « non renseignée ».
- Tests : `test_questionnaires_disqualifiantes.py` (11), `Questionnaires.test.jsx` (+1).

## ✅ 26. Informations société : liens validés, modifications tracées, aucune fausse valeur (14/10/2026)

- Les coordonnées et réseaux sociaux affichés publiquement viennent d'une source unique modifiable par l'admin (`MentionsLegalesEntreprise`). Les liens Facebook / Instagram / LinkedIn sont rendus en `<a href>` : ils sont validés **http(s) uniquement** côté serveur (un lien `javascript:`, `data:` ou `ftp:` est refusé en 400). Piège découvert par un test : DRF écarte les instances de `URLValidator` des validateurs d'un `URLField` et applique le sien, qui accepte `ftp:` ; la validation est donc une **fonction** (`valider_url_http`) que DRF conserve.
- Téléphone, WhatsApp et e-mail sont validés par format ; un champ trop long renvoie 400 (l'ancienne vue assignait sans validation, ce qui aurait provoqué une erreur serveur).
- Édition réservée au rôle ADMIN (`IsAdminRole`) ; toute modification est tracée (`MODIFIER_INFOS_SOCIETE`, noms des champs modifiés). Lecture publique limitée (`PublicReadThrottle`).
- Les valeurs écrites dans les PDF (factures, bulletins, exports) sont **échappées** avant d'être passées à ReportLab, qui interprète des balises : une adresse contenant `<` ou `&` ne peut ni casser ni fausser le document.
- Aucune coordonnée de test par défaut ; un champ vide n'est jamais affiché.
- Tests : `test_informations_societe.py` (12).

## ✅ 27. Métiers proposés par les utilisateurs : aucun effet avant décision de l'admin (14/10/2026)

- **Risque** : un formulaire public « proposer un métier » est un point d'écriture ouvert à tous les comptes (spam, pollution du référentiel, libellés injurieux ou trompeurs).
- **Contrôles** : envoi réservé aux candidats et aux recruteurs rattachés à une entreprise (admin et autres rôles : 403 ; anonyme : 401) ; limite d'envois `write_action` ; 5 propositions ouvertes maximum par compte ; intitulé 3 à 120 caractères avec au moins une lettre, précision 300 caractères ; rejet des métiers déjà présents ou déjà rejetés ; contrainte unique en base sur le libellé normalisé tant qu'une proposition est ouverte.
- **Aucune écriture dans le référentiel avant décision** : proposer ne crée ni métier ni appellation et ne change ni profil, ni offre, ni score. Le référentiel et le matching ne changent que par la validation d'un admin (`IsAdminRole`), tracée (`STATUT_METIER`) et réalisée sous verrou de ligne (aucune double validation).
- **Confidentialité** : l'e-mail du proposant n'est visible que dans les vues admin ; le motif de rejet est envoyé au proposant (notification), l'admin évite d'y mettre des données personnelles. Libellés, précisions et motifs sont affichés en texte (jamais en HTML).
- **Limite** : un attaquant disposant de plusieurs comptes peut multiplier les propositions (5 ouvertes par compte, 30 envois par heure) ; l'impact est limité à la file de modération, rien n'est publié sans validation.
- Tests : `test_propositions_metier.py` (19).

