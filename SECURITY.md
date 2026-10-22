# SECURITY.md — Journal des audits sécurité TafTech

> Historique des audits de sécurité menés sur ce projet, findings et correctifs appliqués. Mis à jour après chaque session d'audit.

---

## 🌿 Branche

Travail initial effectué sur `security/audit-2026-07` (créée depuis `main`) — **mergée dans `main`** (commit `749997e`). Toutes les branches créées depuis héritent des correctifs ci-dessous.

---

## ✅ 40. Parser de CV : texte extrait fiable, masquage complété, métier proposé jamais un critère ni visible d'un recruteur (21/10/2026)

- **Texte extrait** : un caractère invisible (U+200C) au milieu des mots faisait lire « Analy se » ; le masquage prenait « Analy » pour un nom et l'IA recevait un texte amputé. L'extraction passe par PyMuPDF et retire ces caractères (`cv_parser/extraction.py`). Aucun élargissement de ce qui part vers l'IA : le texte part toujours après `confidentialite_ia`.
- **Masquage renforcé** : les **wilayas** citées dans l'en-tête sont masquées par liste (`pseudonymisation.detecter_lieux_entete`), indépendamment du modèle spaCy qui ratait les majuscules. **Limite connue** : les **communes** ne le sont pas (aucune liste dans le projet) ; décision de l'utilisateur du 21/10/2026.
- **Masquage assoupli sur des faux positifs seulement** : un mot d'organisation (hypermarché, université…) pris pour une personne n'est plus masqué en bordure d'entité (le reste l'est) ; un **mot unique en début de ligne suivi de texte** n'est plus traité comme entité. **Risque assumé** : un nom d'un seul mot en début de ligne suivi de texte n'est plus masqué par spaCy ; le nom du compte reste masqué par `detecter_noms_connus`. Tests : `test_confidentialite_ner.py`.
- **Métier proposé en attente** (`DemandeAjout` de type métier liée à une expérience ou au profil du candidat) : jamais un critère de calcul (le matching ne lit que `metier` / `metier_souhaite`, test sur le source de `matcher.py`) ; seule une demande **ouverte, de type métier, du compte connecté** peut être liée (vérifié côté serveur, refus fermé par défaut, test d'un autre compte et d'un autre type) ; exposée **au candidat seulement** (`inclure_metier_propose`) : **absente des vues recruteur, de la CVthèque et des candidatures**, vérifié sur la vraie route `cvtheque`. Champs `demande_metier*` en écriture seule. Les offres ne sont jamais modifiées par une décision. Tests : `test_metier_propose_en_attente.py` (16).
- **Retrait de photo** : en mode « Remplacer », un nouveau CV sans photo retire l'ancienne (`remove_photo_profil`, route existante, rôle candidat vérifié). Action définitive sur le fichier ; aucun journal d'audit (action du candidat sur son propre profil).
- **À surveiller** : changement d'extracteur sur tous les CV PDF, à valider sur un corpus réel avant fusion.

## ✅ 39. Explorateur du référentiel : lecture seule, réservé aux administrateurs (20/10/2026)

Page `/admin-taftech/explorateur-referentiel` (`AdminExplorateurReferentiel.jsx`) et 5 routes `admin/referentiel-v2/explorateur/{arbre,groupe/<id>,metier/<id>,anomalies/<code>,formations}/` (`jobs/views/referentiel_explorateur.py`). **Audit** : toutes en `IsAdminRole` (403 pour candidat, vérifié par test sur les vraies routes), uniquement `GET`, aucune écriture ni donnée personnelle (référentiel public). Listes paginées côté serveur (15 par page, `?page=` borné, aucune ligne inaccessible) ; `code` d'anomalie inconnu → 404 ; un métier « actif » exclut les redirections (`metier_canonique` ≠ lui-même). Tests : `jobs/tests/test_referentiel_explorateur.py` (5).

---

## ✅ 38. Le super-administrateur est hors de portée des administrateurs simples (20/10/2026)

**Constat** : seul le changement de mot de passe (`AdminCompteAdminsAPIView.patch`) et la suppression étaient déjà refusés. Un admin simple pouvait encore **bloquer** le super-admin (`admin-user-moderer`, risque de verrouillage), **ouvrir sa fiche** (`dossier-admin`) et **lire ses actions** dans le journal d'audit (liste et export Excel, y compris par la recherche).

**Correctif** : `AdminUserModerateAPIView` → 403 ; `AdminDossierAdminAPIView` → 404 ; `audit_logs_filtres(params, demandeur)` (`admin_filtres.py`) exclut `admin__is_superuser=True` tant que le demandeur n'est pas super-admin, ce qui couvre d'un coup la liste, la recherche et l'export (même fonction). Le super-admin garde la vue complète.

**Tests** : `jobs/tests/test_admin_protection_superadmin.py` (7 tests sur les vraies routes). **Limite connue** : les actions d'un admin simple restent visibles de tous les admins ; seule la trace du super-admin est masquée.

---

## ✅ 37. Exports Excel de l'administration : mêmes filtres que la liste, tracés (NIN inclus dans les utilisateurs) (20/10/2026)

Les exports de l'admin (`jobs/views/admin_exports.py`, routes `admin/export/<ressource>/`) couvrent désormais toutes les listes de données : utilisateurs, candidatures, entreprises, offres, demandes d'ajout, demandes premium, rendez-vous, journal d'audit, erreurs système. L'export des utilisateurs contient des données personnelles (téléphone, date de naissance, adresse, commune, sexe) : décision de l'utilisateur du 20/10/2026, voir ci-dessous les garde-fous.

- **Accès** : `IsAdminRole` sur chaque export (403 pour un recruteur ou un candidat, 401/403 sans session), vérifié sur les 9 routes (`test_admin_exports_complets`).
- **NIN** : exporté **uniquement** dans l'export des utilisateurs (colonne « NIN », texte complet de 18 chiffres), sur **décision explicite de l'utilisateur du 20/10/2026** (il avait d'abord choisi de l'exclure, avant de le demander ; la recommandation de l'exclure est consignée ici). Aucun autre export ne le contient (test sur les 8 autres routes). La trace d'audit de cet export porte la mention « contient le NIN, la date de naissance et l'adresse ». Les super-administrateurs sont exclus de l'export des utilisateurs, comme de la liste.
- **Même périmètre que la liste affichée** : la liste et l'export appellent les mêmes fonctions de filtrage (`views/admin_filtres.py`, `demandes_ajout_filtrees`), sans duplication possible. Un export filtré n'expose donc pas plus que l'écran.
- **Traçabilité** : chaque export écrit une ligne dans le journal d'audit (action `AUTRE`, détail « Export utilisateurs (N lignes, role=CANDIDAT, search=…) », IP), comme l'export des statistiques. Un export en masse de données personnelles est ainsi toujours attribuable à un administrateur.
- **Erreurs système** : ni `stack_trace` ni `user_agent` ne sont exportés (données internes, inutiles à la lecture de la liste).
- **Formules Excel** : toutes les chaînes sont forcées en texte (`neutraliser_formules`) sur les 9 exports (test avec `=HYPERLINK(...)` dans les noms, libellés, messages d'erreur et détails d'audit). Les `Decimal` sont exportés en nombres.
- **Export recruteur** (`recruteur_exports.py`) : colonnes enrichies à partir du profil figé à la candidature (titre, wilaya, commune, métier, diplôme, compétences, langues…), donc ce que le recruteur voit déjà ; **jamais** adresse, date de naissance, sexe ni NIN ; périmètre limité à son entreprise (offre d'une autre entreprise : 404) ; le nom de fichier dérivé du titre de l'offre est assaini.
- **Risque résiduel** : un classeur téléchargé quitte la plateforme (poste de l'administrateur). Mitigation : compte admin nominatif et trace d'audit qui signale la présence du NIN. Le NIN est la donnée la plus sensible de l'export : ne pas partager ni conserver le classeur au-delà du besoin. À rappeler dans les consignes aux administrateurs (loi 18-07).

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
- **Plafond et seuil réservés au Super Admin (14/10/2026)** : le plafond global est un réglage de coût ; un admin simple pouvait le relever ou le vider, ce qui supprimait la protection. Désormais, pour un admin simple, GET renvoie toujours les deux valeurs (lecture, jauge) avec `budget_modifiable: false`, et un PUT contenant `budget_ia_appels_mois_max` ou `budget_ia_alerte_pct` est refusé en **403 `BUDGET_RESERVE_SUPER_ADMIN`** (rien n'est enregistré, aucun log d'audit). L'écran désactive les deux champs et ne les renvoie jamais. Les autres réglages (quotas par fonction, interrupteurs) restent modifiables par tout admin. Tests : `test_ai_config_securite.py` (`AccesPromptsTests`), `AdminIAConfig.test.jsx`.
- **Fournisseur, modèles, température, effort de raisonnement et `max_tokens` réservés au Super Admin (18/10/2026)** : groupe `CHAMPS_MODELE` (`serializers/ai_config.py`) = `provider`, `groq_model`, `ollama_model`, `temperature`, `reasoning_effort` et les 5 `*_max_tokens`. Changer de modèle modifie le coût et peut envoyer les données candidat vers un autre fournisseur ; `max_tokens` borne la dépense par appel (le plafond global compte des appels, pas des tokens : un admin qui relevait `max_tokens` faisait sauter l'estimation « plafond × max_tokens ») ; température et effort changent le comportement et le coût de toutes les réponses. Pour un admin simple, GET renvoie les valeurs en lecture (`modele_modifiable: false`) et un PUT contenant l'un de ces champs est refusé en **403 `MODELE_RESERVE_SUPER_ADMIN`** (rien n'est enregistré, aucun log d'audit). L'écran désactive ces champs et ne les renvoie jamais. **Approche écartée** : réserver toute la page au Super Admin ; l'admin simple a besoin de voir la consommation et l'état des quotas pour exploiter la plateforme, et chaque écriture sensible est tracée. Restent ouverts à l'admin simple : interrupteurs des fonctionnalités et quotas par fonction (bornés par le plafond global). Contrôle par un test d'intégration sur la vraie route (`admin-ai-config`), pas sur le défaut global. **Borne haute de `max_tokens` (18/10/2026)** : les 5 champs sont bornés à 100–16000 (`MAX_TOKENS_MIN` / `MAX_TOKENS_MAX` dans `jobs/models/ia.py`, migration `0143` : validateurs seulement, aucune colonne ni donnée modifiée). Refus **400** côté serveur même pour le Super Admin ; l'écran pose `min`/`max` natifs (le navigateur bloque l'envoi d'une valeur hors bornes). 16000 = un peu plus du double du plus grand défaut (7000, Parser CV) : à ajuster dans la constante si un modèle l'exige. Tests : `test_api_cms.py` (`test_max_tokens_trop_haut_rejete_meme_pour_le_super_admin`, `test_max_tokens_a_la_borne_haute_accepte`).
- **Quotas personnalisés par compte tracés (18/10/2026)** : créer ou supprimer un « override » (`QuotaIAOverridesAPIView`) n'était pas journalisé alors qu'un admin simple pouvait donner un quota illimité à un compte. Désormais chaque création (qui remplace l'éventuel quota existant) et chaque suppression écrit une ligne `MODIFIER_CONFIG_IA` (« Quota personnalisé défini/supprimé : email / FONCTION → x/jour, y/mois », ∞ = illimité). Une suppression d'un quota inexistant (404) ne crée aucun log. Pas de nouvelle action d'audit : donc pas de migration.
- **Libellé du statut dans la barre latérale (18/10/2026)** : « Super Admin » était écrit en dur pour tout admin. `AdminStatsAPIView` renvoie maintenant `est_super_admin` (= `is_superuser` du compte connecté) et la barre latérale affiche « Super Admin » ou « Administrateur ». Cosmétique, mais un admin simple ne doit pas se croire Super Admin. **Rappel** : les alertes de budget partent aux comptes `is_superuser` actifs ; sans aucun, elles tombent sur `EMAIL_HOST_USER` (voir `ia_quota._destinataires_alerte_budget`) : vérifier qu'un Super Admin avec un email valide existe avant la production.
- **Limite connue** : le plafond compte des **appels**, pas des tokens ; la dépense maximale théorique est donc plafond × `max_tokens` de la fonction la plus coûteuse. Un plafond en tokens exigerait d'enregistrer la consommation réelle par appel (non fait).
- **À faire avant production** : définir la valeur du plafond global (aujourd'hui vide) ; prévoir la sauvegarde de l'historique des prompts si un retour arrière doit être possible (le journal ne garde pas le texte).
- Tests : `jobs/tests/test_ai_config_securite.py` (24 au 18/10/2026), `AdminIAConfig.test.jsx` (+4), `AdminLayout.test.jsx` (statut réel du compte).

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

## ✅ 29. Recruteur en attente de validation : aucun accès à l'espace recruteur (16/10/2026)

- **Constat** (test manuel de l'utilisateur) : un recruteur dont l'entreprise n'est pas encore validée entrait dans **tout** l'espace (menu, tableau de bord, CVthèque, statistiques…) ; seules certaines routes refusaient (§21, données de candidats). N'importe qui pouvait créer un compte recruteur et parcourir l'interface. À la connexion, `accounts/serializers.py` ne faisait d'ailleurs rien pour ce cas (un `pass`, avec un attribut mal nommé `profilentreprise` au lieu de `profil_entreprise` : code mort).
- **Décision (validée)** : un seul écran d'attente (consignes, « Actualiser mon statut », Déconnexion), aucune autre page ; blocage côté serveur **et** côté frontend.
- **Serveur, un seul point d'application** : `CustomJWTAuthentication` (`accounts/authenticate.py`). Compte `RECRUTEUR` + entreprise non approuvée → **403 `ENTREPRISE_NON_VALIDEE`** sur toute route qui exige une connexion. Restent ouvertes : `/api/accounts/` (connexion, profil, déconnexion, mot de passe) et les vues publiques (`AllowAny` ou liste de permissions vide : le site public reste utilisable, webhook de paiement compris). `accounts/me/` expose `entreprise_approuvee` et `nom_entreprise` (`null` hors recruteur) pour l'écran d'attente.
- **Frontend** : `EntrepriseValideeGuard` enveloppe l'espace recruteur (aucun enfant monté, donc aucun appel de données, tant que le statut est inconnu ou « en attente ») ; `NavbarRecruteur` et `BottomNavRecruteur` masquent tout lien et n'appellent plus tableau de bord/notifications. Dès l'approbation, « Actualiser mon statut » (ou une reconnexion) ouvre l'espace.
- **Approches abandonnées** : (1) ajouter la permission à chaque vue : 166 déclarations `permission_classes` dans 29 fichiers, partagées avec les routes candidat et publiques, risque d'oubli ; (2) la permission par défaut de DRF : elle ne protège que les vues qui n'en déclarent pas (règle générale du projet) ; (3) garde frontend seul : purement cosmétique.
- **Piège** : `force_authenticate` (test) **contourne** la classe d'authentification où le garde est appliqué ; les tests passent donc par un vrai jeton dans le cookie.
- **Limites** : un membre d'équipe (compte `CANDIDAT` rattaché à une entreprise) n'est pas concerné ; une requête SQL de plus par appel authentifié d'un compte recruteur (lecture de `profil_entreprise`) ; si `me/` échoue, le frontend n'affiche pas d'écran bloqué (le serveur reste le vrai garde). Le tableau de bord « accessible mais sans candidatures » du §21 n'est plus joignable en usage réel : son garde reste en défense en profondeur.
- Tests : `jobs/tests/test_recruteur_en_attente_acces_total.py` (6), `EntrepriseValideeGuard.test.jsx` (7).

## ✅ 36. Fiches détaillées des comptes dans l'admin : lecture seule, rôle vérifié (19/10/2026)

Trois routes `admin/utilisateurs/<id>/dossier/`, `dossier-recruteur/`, `dossier-admin/` (détail dans [admin.md](docs/fonctionnel/admin.md)). Audit : toutes en `IsAdminRole` (403 pour candidat et recruteur, testé par cookie JWT réel), `GET` uniquement, un seul compte par appel ; 404 uniforme si le compte n'a pas le rôle attendu, est inconnu ou (recruteur) est un super-administrateur ; le périmètre est borné à l'entreprise du recruteur (test : aucune offre d'une autre entreprise dans la réponse) ; le NIN et les coordonnées de candidats n'y figurent pas ; l'usage IA exclut les lignes remboursées. Front : routes admin déjà protégées par `AdminRoute`.

---

## ✅ 35. NIN obligatoire pour postuler : écriture unique atomique, jamais exposé (19/10/2026)

- **Besoin** : l'ANEM exige le NIN de tout candidat qui postule. Il n'est pas demandé à l'inscription ; il est obligatoire pour postuler **avec un compte**. La candidature rapide (sans compte) n'en exige pas : **contournement possible, décision assumée de l'utilisateur**, consigné dans `docs/problemes-a-traiter.md`.
- **Serveur** : `PostulerAPIView` répond 403 `NIN_REQUIS` si `User.nin` est vide (rôle vérifié d'abord, aucune candidature créée). Route `POST jobs/profil/nin/` (`EnregistrerNINAPIView`) : `IsAuthenticated` + rôle `CANDIDAT`, périmètre = le compte lui-même, 18 chiffres, **écriture unique atomique** (la condition « NIN encore vide » est dans la requête SQL : deux requêtes simultanées du même compte ne s'écrasent pas ; 409 `NIN_DEJA_ENREGISTRE`), correction par l'admin seulement.
- **Anti-énumération** : un NIN déjà pris et un NIN non enregistrable donnent la **même réponse générique** (400 `NIN_NON_ENREGISTRABLE`) ; limite dédiée `nin_enregistrement` **10 essais par jour et par compte** (un NIN libre est accepté, un NIN pris refusé : sans limite basse, un attaquant à plusieurs comptes sonderait les NIN existants). La réponse ne renvoie jamais le NIN ; la trace du journal ne contient pas sa valeur.
- **Confidentialité** : visible du candidat et de l'admin seulement. Vérifié par test : absent du `profil_snapshot`, de `CandidatureRecruteurDTO`, de `ProfilCandidatDTO` sans `include_nin` (CVthèque), de `texte_carriere`, `texte_conseils` et de tout prompt IA (en plus, `patterns.py` masque un NIN de 18 chiffres, y compris avec séparateurs).
- **Limites** : (1) l'**oracle d'existence** subsiste en version réduite (10 essais/jour/compte, plusieurs comptes) ; (2) l'**inscription** (`accounts/serializers.py`) avait déjà un message « NIN déjà utilisé » distinct, plus ancien que ce chantier, **à harmoniser** ; (3) la candidature rapide contourne l'obligation.
- Tests : `jobs/tests/test_nin_postuler.py` (14, dont l'écriture atomique avec un objet utilisateur périmé), `ModalNIN.test.jsx` (9).

## ✅ 34. Pseudonymisation des données candidat avant tout appel IA, résilience du fournisseur (19/10/2026)

- **Risque** : les traitements IA se font chez un prestataire hors d'Algérie (Groq, États-Unis) ; le CV brut contenait nom, coordonnées, adresse, date de naissance, pièces d'identité. Loi 18-07.
- **Périmètre** : parser de CV, classification des métiers, diplômes et spécialités, analyse carrière, conseils, analyse recruteur. Hors périmètre : génération d'offre (aucune donnée candidat) ; matching (100 % local, test d'architecture `test_architecture_ia.py`).
- **Mécanisme** (`jobs/confidentialite_ia/`) : nettoyage déterministe (motifs + spaCy français + Stanza arabe + noms du compte), **échec fermé** (modèle absent = aucun appel IA), filet `call_ai(donnees_candidat=…)` qui refuse un e-mail, téléphone, URL ou NIN restant, jeton aléatoire `CANDIDAT_xxxxxx` pour l'analyse recruteur, employeurs en « Entreprise A/B », établissements retirés, coordonnées extraites **localement** du CV brut. Le masquage n'est **pas désactivable** (aucun paramètre, `CONFIDENTIALITE_IA_NER_ACTIF=false` refusé en production). Aperçu au candidat du texte exact transmis (`POST jobs/ia/apercu-donnees/`, candidat seulement, sans appel IA ni quota).
- **Compte Groq** : Zero Data Retention activé le 17/10/2026. **Incident** : une ancienne clé était dans l'historique git (commit `9b04392`) ; révoquée et remplacée.
- **Défauts trouvés et corrigés pendant le chantier** : (1) `ParserCVAPIView` renvoyait `str(e)` (texte de l'exception du fournisseur) au navigateur ; (2) plusieurs journaux écrivaient le texte brut des erreurs du fournisseur, qui peut citer la clé : désormais type et statut seulement, avec tests (`test_cle_groq_non_exposee.py`).
- **Revue de sécurité indépendante (19/10/2026, agent `ecc:security-reviewer`)** : aucun point critique ; aucun chemin où le NIN, un nom ou la clé atteint un prompt, un journal ou une réponse. **1 point HAUT + 7 MOYENS corrigés** :
  - **HAUT, déni de service** : les motifs (e-mail, adresse…) étaient à temps quadratique sur un texte hostile (40 000 caractères = 5 s, une suite d'espaces = plus d'une minute) ; un candidat pouvait bloquer un worker avec un fichier de 5 Mo. Corrigé : quantificateurs **tous bornés**, texte analysé borné à 30 000 caractères, test avec 10 entrées hostiles (moins de 3 s chacune).
  - Fuite de la date de naissance avec « né à Oran, le … » ; téléphones « 0550 123 456 », « (0550) 12 34 56 », « +213 (0)550… », « 0550/12/34/56 » et numéros étrangers ; NIN avec séparateurs ; liens personnels hors LinkedIn/GitHub (facebook, t.me, sites en `.dz`…) ; chiffres pleine chasse : tous détectés et masqués, sans prendre une suite de dates pour un téléphone (testé).
  - Nom arabe isolé dans un CV surtout français (sous 5 % des lettres) : Stanza se déclenche aussi dès 15 lettres arabes.
  - **Contexte de demande IA oublié sur les sorties anticipées** de `ParserCVAPIView` (le quota était consommé avant les validations du fichier) : validations déplacées avant le décompte, et **middleware** `ReinitialiserContexteIAMiddleware` qui vide le contexte au début et à la fin de chaque requête (un thread gunicorn réutilisé ne voit jamais le contexte d'une autre requête).
  - NIN : écriture unique rendue atomique, essais limités (voir §35).
  - Aussi corrigés : une entité détectée qui déborde sur un numéro ne laisse plus la fin en clair (fusion par union) ; l'empreinte du cache contient `VERSION_NETTOYAGE` (un résultat produit avec d'anciennes règles n'est plus resservi) ; marqueurs d'établissements étendus (« Univ. », « USTO »).
- **Trois points bas de la revue, corrigés ensuite le même jour** : (B1) la garde `donnees_candidat` reste facultative dans la signature de `call_ai`, mais `test_architecture_ia.py` lit désormais le code (analyse syntaxique) et **fait échouer les tests si un appel n'a pas ce paramètre** (seule exception, explicite : `GenererOffreIAAPIView.post`, qui n'envoie aucune donnée candidat) ; (B6) le remboursement ne dépend plus du drapeau global de pause : seule la demande **réellement refusée** par le fournisseur (429 reçu ou appel bloqué par la pause) est remboursée, via une ContextVar remise à zéro par le middleware ; (B8) `AnalyseGroqRecruteurAPIView` répond **404 dans tous les cas** (identifiant inexistant, autre entreprise, utilisateur sans entreprise), ce qui supprime le sondage 404/403. À noter : les noms d'employeurs et d'établissements écrits dans le **texte** du CV du parser partent tels quels dans le texte nettoyé (choix de conception à valider : seuls les identifiants directs sont masqués).
- **Piège de test découvert** : la pause du fournisseur est stockée dans le cache, partagé entre les tests ; un test de saturation pouvait faire échouer un test d'un autre module selon l'ordre d'exécution (403 inattendu). Les tests de saturation nettoient maintenant le cache après chaque cas.
- **Coût et résilience** : tokens et entités masquées (décomptes, jamais de contenu) enregistrés par appel ; un refus du fournisseur (429) est **remboursé** et met les appels IA en pause 30 s à 1 h ; une analyse inchangée est renvoyée sans appel ni décompte. Les réponses d'erreur à l'utilisateur restent génériques.
- **Limites** : une pseudonymisation n'est **pas** une anonymisation (loi 18-07) : des noms rares, des employeurs ou un texte libre peuvent ré-identifier ; les noms d'organisations ne sont pas masqués par spaCy ; la qualité de détection des noms **arabes** reste à mesurer sur des CV réels (condition d'adoption, voir `docs/fonctionnel/parser-cv-ia.md`) ; le cadre juridique d'un transfert hors d'Algérie (ANPDP) est une **question ouverte** pour l'employeur.
- Tests : une centaine de tests backend ajoutés (`test_confidentialite_*`, `test_call_ai_garde`, `test_ia_pseudonymisation_vues`, `test_cv_parser_confidentialite`, `test_apercu_donnees_ia`, `test_architecture_ia`, `test_cle_groq_non_exposee`, `test_ia_integration_jwt`, `test_ia_tokens`, `test_ia_cache_resultats`, `test_ia_fournisseur_sature`) et frontend (`ApercuDonneesIA`, `erreursIA`, `ModalNIN`).

## ✅ 33. Vie privée du navigateur : contenus tiers, cookies, hors ligne, images envoyées (18/10/2026)
- **Contenus tiers** : (1) la carte Google de la page entreprise ne se charge plus qu'après un clic (`CarteSurDemande`) : avant, chaque visite contactait Google (adresse IP, cookies de Google) ; (2) le script « Continuer avec Google » (`GoogleOAuthProvider`) chargeait Google sur **toutes** les pages depuis `main.jsx` ; il est maintenant limité aux pages de connexion et d'inscription (`GoogleAuthProvider`). Vérifié en navigateur : aucune requête vers Google sur `/offres`, une seule sur `/login`.
- **Cookies** : seuls des cookies strictement nécessaires (httpOnly, CSRF). Bannière d'**information** (pas un consentement) avec lien vers la politique de confidentialité ; l'analytics (Plausible/Umami, sans cookie, `https` obligatoire, jamais sur l'admin, inactif sans configuration) n'exige pas de consentement. **À reprendre** si un outil à cookies est ajouté : vrai choix avant dépôt (loi 18-07). **À faire par vous** : mentionner la mesure d'audience dans la politique de confidentialité (page modifiable dans l'admin) et la faire relire.
- **Service worker** (`public/sw.js`) : ne met **jamais** en cache l'API, `/media/` (CV, photos, documents privés), l'administration, les autres domaines ni les requêtes non-GET ; les pages sont toujours demandées au réseau (pas de page périmée ni de page privée gardée sur l'appareil) ; seuls les fichiers `/assets/` à nom haché sont conservés. Test : 7 cas dont tous les refus ci-dessus.
- **Images envoyées** (`jobs/image_utils.py`) : les métadonnées EXIF (position GPS, modèle d'appareil) sont supprimées des photos de profil, logos, bannières et couvertures ; réduction à 1600 px. L'optimisation ne bloque jamais un envoi (original conservé en cas de problème, animation ou fichier illisible).
- **Erreurs de formulaire** : les messages d'erreur du serveur affichés sous les champs viennent de `extraireErreursChamps` (texte, jamais du HTML) ; React échappe tout.
- **Limite** : la page `/merci` est publique et sans effet (aucune donnée, aucun paramètre reflété) ; le robots.txt la bloque.

## ✅ 32. Rendu serveur des balises SEO : tout contenu venu de la base est échappé, aucune fuite (18/10/2026)
- **Ce qui change** : `jobs/seo_pages.py` (routes publiques `/entreprises/.../offres-d-emploi/...`, `/jobs/<id>`, `/entreprise/<slug>`, `/blog/<slug>`) sert `index.html` en y injectant titre, description, aperçu de partage, canonical et JobPosting construits depuis la base. Le titre d'une offre, le nom d'une entreprise et les descriptions sont **saisis par des utilisateurs** : ce sont des entrées non fiables.
- **Échappement** : attributs et `<title>` via `html.escape` ; JSON-LD via `json.dumps` avec `<` remplacé par `<` (impossible de refermer la balise `<script>`) ; côté navigateur (`Seo.jsx`) même remplacement et description JobPosting échappée. Test `test_contenu_hostile_est_echappe_partout` (titre `</script><script>alert(1)</script>`, nom d'entreprise `Evil" onload="…`, description `"><img onerror=…>`) : une seule balise `<script>` dans la page, aucune valeur dangereuse brute.
- **Pas de fuite** : seules les offres au statut `APPROUVEE`, les entreprises approuvées et les articles `PUBLIE` sont rendus ; une offre en attente, rejetée, ou une entreprise non validée répond **404** avec `noindex`. Une offre clôturée, désactivée ou expirée reste affichable (200) mais en `noindex`, sans JobPosting.
- **Aucune donnée personnelle** dans le JobPosting (pas de coordonnées de contact), pas de salaire (texte libre dont l'unité est inconnue, on n'affiche pas un montant risqué).
- **Redirections** : slug obsolète, slash final manquant ou ancienne URL `/jobs/<id>` → 301 vers l'URL officielle (même chemin que le sitemap, vérifié par test) ; pas de redirection ouverte (la cible est toujours calculée depuis la base).
- **robots.txt** : bloque en plus les écrans d'authentification et les espaces connectés (liste `PREFIXES_INTERDITS`, chaque entrée correspond à une route protégée de `App.jsx`). Rappel : robots.txt n'est **pas** une protection d'accès, seulement une consigne ; la sécurité reste assurée par les gardes de routes et les permissions API.
- **Limite** : le garde `FRONTEND_INDEX_PATH` lit un fichier local fixé par la configuration (jamais par la requête) : pas de lecture de fichier arbitraire. Introuvable → 503 sur ces routes uniquement.

## ✅ 31. Page « Statistiques » admin : agrégats seulement, export tracé, périmètre borné (18/10/2026)
- **Accès** : `admin/stats-periode/` et `admin/stats-periode/export/` en `IsAdminRole` (403 pour candidat, recruteur ; refus de l'anonyme). Côté front, la page est sous `AdminRoute` (`/admin-taftech/statistiques`).
- **Données exposées** : des **agrégats** (compteurs, taux, sommes). Aucun nom, e-mail, téléphone ni identifiant de candidat ou de recruteur. Seule exception voulue : la liste du sélecteur d'entreprises (identifiant + nom d'entreprise), lisible par les seuls admins ; test `test_aucune_donnee_personnelle_exposee`.
- **Entrées validées** : dates `AAAA-MM-JJ`, début ≤ fin, durée ≤ 5 ans, `entreprise_id` entier positif existant (sinon 400 `{"error": ...}`) ; paramètres lus par `lire_periode` / `lire_entreprise_id`, jamais concaténés dans une requête (ORM).
- **Export** : `.xlsx` seulement, formules neutralisées (§23) ; **chaque export écrit une ligne d'audit** (action `AUTRE`, période et entreprise dans le détail) ; un export refusé (400) n'écrit rien.
- **Filtre par entreprise** : les inscriptions, non rattachables à une entreprise, sont omises plutôt qu'affichées avec un chiffre global trompeur.
- **Filtre d'expiration** de `admin/entreprises/?abonnement_expire_sous=N` : entier de 1 à 365, valeur invalide ignorée (liste complète, jamais d'erreur ni d'injection) ; réservé aux admins comme le reste de la route. `abonnement_expire_at` ajouté au sérialiseur admin des entreprises (date d'expiration, pas de donnée sensible nouvelle).
- **Limite connue** : aucune limitation de fréquence propre à ces routes (elles héritent du throttling global DRF) ; la période étant bornée à 5 ans et les calculs en `GROUP BY`, le coût par appel reste borné.

## ✅ 30. Métier de référence d'une offre : jamais exposé au public ni aux candidats (17/10/2026)

- **Règle du client** : le recruteur garde son intitulé public (`titre`, ex. « Développeur Django »), rattaché **en interne** à un métier de référence (ex. « Développeur Python ») qui ne sert qu'au calcul du matching. La référence n'est montrée qu'au recruteur (et à l'admin).
- **Constat** : `OffreEmploiSerializer` (`fields = '__all__'` + `metier_libelle`) renvoyait la référence dans la liste et le détail **publics**, dans les offres recommandées et sauvegardées des candidats ; la page publique d'une offre l'affichait dans une carte « Métier » (`JobDetail.jsx`). Le **numéro** `metier` fuyait aussi : l'API publique des nomenclatures permet d'en retrouver le nom.
- **Correction (sûre par défaut)** : `OffreEmploiSerializer.to_representation` retire `metier` et `metier_libelle` de toute réponse, sauf `context['inclure_metier_reference'] = True`, passé seulement par la réponse de création au recruteur (`JobCreateAPIView`). Le tableau de bord recruteur (`OffreDashboardDTO`) et l'admin gardent la référence : ils ont leur propre sérialiseur. Un futur usage du sérialiseur partagé ne fuit donc pas par oubli. Carte « Métier » retirée de la page publique.
- **Non traité (à décider)** : le sous-titre des suggestions de l'autocomplete de recherche (`MetierAutocomplete`) affiche le métier de l'appellation tapée ; c'est une aide de recherche, pas l'affichage d'une offre.
- **Autre** : suppression de 44 doublons de métiers masqués sans donnée candidat/offre (sauvegarde JSON avant, liste validée, refus si un métier est encore référencé) : voir `CORRECTIONS_CLIENT_TEMP.md` point 7.
- Tests : `jobs/tests/test_metier_reference_non_public.py` (4 : liste publique, détail public, comportement du sérialiseur, tableau de bord recruteur).

## ✅ 27. Métiers proposés par les utilisateurs : aucun effet avant décision de l'admin (14/10/2026)

- **Risque** : un formulaire public « proposer un métier » est un point d'écriture ouvert à tous les comptes (spam, pollution du référentiel, libellés injurieux ou trompeurs).
- **Contrôles** : envoi réservé aux candidats et aux recruteurs rattachés à une entreprise (admin et autres rôles : 403 ; anonyme : 401) ; limite d'envois `write_action` ; 5 propositions ouvertes maximum par compte ; intitulé 3 à 120 caractères avec au moins une lettre, précision 300 caractères ; rejet des métiers déjà présents ou déjà rejetés ; contrainte unique en base sur le libellé normalisé tant qu'une proposition est ouverte.
- **Aucune écriture dans le référentiel avant décision** : proposer ne crée ni métier ni appellation et ne change ni profil, ni offre, ni score. Le référentiel et le matching ne changent que par la validation d'un admin (`IsAdminRole`), tracée (`STATUT_METIER`) et réalisée sous verrou de ligne (aucune double validation).
- **Confidentialité** : l'e-mail du proposant n'est visible que dans les vues admin ; le motif de rejet est envoyé au proposant (notification), l'admin évite d'y mettre des données personnelles. Libellés, précisions et motifs sont affichés en texte (jamais en HTML).
- **Limite** : un attaquant disposant de plusieurs comptes peut multiplier les propositions (5 ouvertes par compte, 30 envois par heure) ; l'impact est limité à la file de modération, rien n'est publié sans validation.
- Tests : `test_propositions_metier.py` (19).

## ✅ 28. Demandes d'ajout au référentiel (types de diplôme et spécialités) : aucun effet avant décision, aucune offre modifiée (16/10/2026)

- **Risque** : un formulaire ouvert à tous les candidats et recruteurs (« Je ne trouve pas mon diplôme / ma spécialité », « Autre, préciser ») écrit dans une file de modération : spam, libellés injurieux, pollution du référentiel, ou décision d'admin qui modifierait en silence des offres ou des scores déjà publiés.
- **Contrôles à la création** : réservée aux candidats et aux recruteurs rattachés à une entreprise (admin et recruteur sans entreprise : 403 ; anonyme : 401/403) ; limite d'envois `write_action` ; **5 demandes explicites ouvertes au maximum par compte** ; libellé 3 à 120 caractères, au moins une lettre, ni e-mail, ni adresse web, ni numéro de téléphone, 12 mots maximum ; refus si l'entrée existe déjà (libellé ou alias) ou si le libellé a déjà été refusé ; contrainte unique en base sur (type, libellé normalisé) tant qu'une demande est ouverte.
- **Aucune écriture dans le référentiel avant décision** : une demande ne crée ni entrée, ni alias, ni rattachement, et ne change aucun score. Les décisions (accepter, rattacher, refuser) sont réservées à `IsAdminRole`, prises sous verrou de ligne (aucune double décision), tracées par l'action d'audit `DECISION_DEMANDE_AJOUT`, et le refus exige un motif.
- **Extension aux métiers et aux compétences (16/10/2026)** : mêmes contrôles et même audit. Les compétences saisies par un candidat ou une offre créent une demande implicite (sans notification, 50 créations implicites/24 h au plus) ; rien d'officiel n'est créé avant la décision. Les anciennes routes de proposition (`referentiel/metiers/proposer/`, `admin/propositions-metiers/*`, `admin/competences/proposer/`, `formations-a-verifier/*`) restent actives, réservées admin, jusqu'à l'application des commandes `migrer_*_vers_demandes` en production.
- **Correctif du 16/10/2026** : seul le choix explicite « Autre diplôme » crée une demande de type de diplôme (l'intitulé libre d'une formation n'en crée jamais) ; une spécialité déjà au référentiel ne crée pas de demande et le formulaire l'indique. Aucune donnée personnelle ni exposition nouvelle ; les 10 demandes créées à tort sur la base de développement ont été retirées (sauvegarde JSON conservée).
- **Les offres ne sont jamais modifiées automatiquement** par une décision : changer les diplômes ou spécialités acceptés d'une offre publiée modifierait ses scores. Seules les formations du candidat qui ont déclenché la demande sont mises à jour.
- **Résolution par alias** : un alias créé par un rattachement ne résout une spécialité que si le couple diplôme + spécialité est attesté (règle F06) ; le rattachement ne crée donc aucune équivalence inventée.
- **Confidentialité** : l'e-mail des demandeurs n'est visible que dans les vues admin (5 demandeurs affichés au plus) ; le motif de refus est envoyé aux demandeurs, l'admin évite d'y mettre des données personnelles. Libellés, précisions et motifs sont affichés en texte (jamais en HTML). Le journal d'audit tronque le libellé à 60 caractères.
- **Robustesse** : l'échec de la création d'une demande ne bloque jamais l'enregistrement de la formation du candidat (journalisé).
- **Limite** : un attaquant disposant de plusieurs comptes peut multiplier les demandes (5 explicites ouvertes par compte, 30 envois par heure) ; l'impact est limité à la file de modération, rien n'est publié sans validation.
- Tests : `test_demandes_ajout_service.py` (38), `test_demandes_ajout_api.py` (21, dont les routes admin refusées à un candidat, un recruteur et un anonyme), `test_demandes_ajout_formations.py` (17), `test_migrer_formations_vers_demandes.py` (4).


## ✅ 30. Correction d'une offre par l'admin pendant la modération (16/10/2026)

- **Besoin** : l'admin corrige les fautes d'une offre soumise, sans la renvoyer au recruteur. Route `PATCH /api/jobs/admin/offres/<id>/corriger/` (`IsAdminRole`), vue `jobs/views/offres_correction_admin.py`.
- **Contrôles** : seulement tant que l'offre est **« En attente »** et non clôturée (sinon 400 `OFFRE_NON_EN_ATTENTE` : après publication, changer le contenu modifierait en silence les scores déjà affichés) ; **liste blanche de champs** (titre, métier, wilaya, commune, description, missions, profil, compétences, contrat, expérience, postes, salaire, date d'expiration) : `statut_moderation`, `motif_rejet`, `entreprise` ne passent jamais par cette route ; validation par `OffreEmploiCreateDTO`.
- **Traçabilité** : action d'audit `CORRIGER_OFFRE` (migration 0142) avec les champs réellement modifiés ; **e-mail au recruteur** avec ancienne et nouvelle valeur de chaque champ (aperçu de 60 caractères, jamais bloquant). Aucune trace ni e-mail si rien n'a changé.
- **Point à trancher (hors périmètre de cette route)** : l'ancienne route `admin/offres/<id>/moderer/` accepte toujours n'importe quel champ de l'offre à tout moment (`OffreEmploiSerializer` partiel) ; l'écran n'envoie plus que le statut et le motif. Candidat à un durcissement.
- **Pas couvert** : diplômes/spécialités requis, compétences structurées et exigences impératives (le recruteur les modifie lui-même).

## ✅ 41. Masquage avant l'IA : fuite d'un identifiant LinkedIn coupé, faux positifs réduits (22/10/2026)

- **Fuite corrigée** : un lien `linkedin.com/in/prenom-nom-` coupé en fin de ligne par le PDF laissait la fin de l'identifiant (`-a3257762`, identifiant de profil) en clair dans le texte envoyé à l'IA : le motif d'URL s'arrêtait au retour à la ligne. `patterns._SUITE_URL` reprend le premier mot de la ligne suivante **uniquement si la ligne finit par un tiret** (quantificateur borné à 100, règle anti-ReDoS du fichier) ; une ligne ordinaire n'est jamais absorbée.
- **Faux positifs réduits sans affaiblir le masquage** : règles ciblées dans `ner.py` (le NER reste actif). Garde-fous voulus : un nom cité **une seule fois** n'est jamais écarté ; « Nom, Oran » dans l'**en-tête** garde son nom masqué ; seules les communes du **corps** suivies d'une wilaya sont laissées lisibles (décision antérieure : communes non masquées).
- Tests : 6 nouveaux (`test_confidentialite_ner.py`, `test_confidentialite_motifs.py`), 184 tests ciblés OK. Journal : [2026-10-22-masquage-faux-positifs.md](docs/journal/2026-10-22-masquage-faux-positifs.md).
- Tests : `test_admin_corriger_offre.py` (7 : correction + audit + e-mail, sans changement, offre publiée/rejetée refusée, statut non modifiable, champ absent, admin seulement, introuvable) ; `AdminOffres.test.jsx`.
