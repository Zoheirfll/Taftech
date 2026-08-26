# Sécurité — TafTech

_Dernière mise à jour : 26/08/2026._

Ce document consolide le modèle de sécurité du projet et l'historique des audits. Pour les décisions techniques et l'historique fonctionnel, voir `CLAUDE.md`.

## Modèle de sécurité

- **Auth** : JWT (SimpleJWT), access 15 min / refresh 7 jours + blacklist, transmis **uniquement** en cookie `httponly`, `SameSite=Lax`, `secure` selon l'environnement — jamais accepté depuis un header/body alternatif.
- **Rôles** : `CANDIDAT` / `RECRUTEUR` / `ADMIN` (global), plus rôles d'équipe par entreprise `PROPRIETAIRE` / `ADMIN` / `UTILISATEUR` / `INVITE`.
- **Autorisation** : chaque endpoint recruteur scope via `get_entreprise_for_user()` + `get_membre_role()` ; chaque endpoint candidat scope via `request.user` directement dans le filtre de requête (pas de fetch-puis-comparaison a posteriori) ; chaque endpoint admin vérifie `IsAdminUser` **et** `request.user.role == 'ADMIN'` explicitement dans le corps de la méthode.
- **Fichiers** : validation par magic bytes (`jobs/validators.py`), pas seulement extension/Content-Type déclaré ; noms de fichiers assainis par Django (`get_valid_filename()`) et servis via `os.path.basename()`.
- **Paiement** : montant toujours résolu côté serveur depuis `PremiumPlan`/`Palier` (jamais un montant fourni par le client) ; webhook Chargily vérifié par HMAC-SHA256 (`hmac.compare_digest`) avant tout traitement d'état.
- **Contenu riche** (Article, PageStatique) : sanitization `bleach` (whitelist stricte de balises/attributs) à l'écriture, avant tout rendu `dangerouslySetInnerHTML` côté frontend.
- **Secrets** : `.env` gitignored, échec au démarrage (`ImproperlyConfigured`) si `SECRET_KEY`/`EMAIL_HOST_*`/`GROQ_API_KEY`/`CHARGILY_*` manquants en prod.
- **Throttling** : `auth` (10/min), `groq` (20/h), `public_read` (300/h), `write_action` (30/h) + `EmailRateThrottle` (10/jour/email) sur les écritures anonymes.

## Historique des audits

### Round 2 — 26/08/2026 (codebase complet, approfondissement)
Périmètre : upload de fichiers (CV/PDF/DOCX, noms de fichiers), IDOR sur ~15 endpoints candidat/recruteur/admin non couverts en round 1, flux reset password/vérification email, JWT/cookies/posture CSRF, impersonation admin/propriétaire, manipulation de montant Chargily, mass-assignment via serializers `__all__`, SSRF.

**Résultat : aucun finding ≥7/10.** Tout RAS, y compris CSRF (mitigé par `SameSite=Lax` sur le cookie JWT httponly, pas de `SameSite=None` dans tout le codebase) et mass-assignment (`OffreEmploiSerializer.fields = '__all__'` existe mais son seul usage en écriture est gated `IsAdminUser` — noté comme point de vigilance pour un futur refactor, pas un correctif à faire aujourd'hui : si ce serializer est un jour réutilisé sur un chemin d'écriture non-admin, `entreprise`/`statut_moderation`/`est_active` deviendraient un vecteur de mass-assignment réel).

### Round 1 — 26/08/2026 (codebase complet)
Périmètre : injection SQL/commande/template, path traversal, JWT/session, désérialisation, XSS (`dangerouslySetInnerHTML`), secrets en dur, signature webhook Chargily, permissions endpoints admin, IDOR fichiers privés candidats, escalade de rôle d'équipe, CORS.

**1 finding retenu et corrigé le jour même** (commit `6cff857`) :

> **`InviterMembreAPIView` — ajout d'équipe non consenti + énumération de comptes** (Medium, confiance 8/10)
> La branche "compte email classique existant" ajoutait l'utilisateur **directement** à `MembreEquipe` sans étape de consentement, contrairement aux branches compte Google/email inconnu qui passaient déjà par `InvitationEquipe` + acceptation par token. Les 3 messages de réponse distincts permettaient en plus l'énumération de comptes par email.
> **Fix** : les 3 cas passent désormais par le même flux d'invitation + acceptation explicite (`AccepterInvitationAPIView`, qui gérait déjà la confirmation de mot de passe pour un compte existant non-Google) ; message de réponse unifié. Tests : `jobs.tests.test_api_equipe` 50/50 ✅, suite backend complète 353/353 ✅.

Tout le reste du périmètre round 1 : RAS (voir détail dans l'historique de session `CLAUDE.md` du 26/08/2026 si besoin de retrouver le raisonnement complet).

## Méthodologie des audits

Chaque round : un sous-agent d'exploration produit une liste de findings candidats avec fichier/ligne/scénario d'exploitation concret, puis chaque finding passe par un sous-agent de vérification indépendant qui relit le code et attribue un score de confiance 1-10. Seuls les findings ≥8/10 après vérification sont retenus. Exclusions systématiques : DOS, secrets sur disque déjà gitignorés, rate-limiting, vérifications côté client uniquement (le backend est la source de vérité), CVE de dépendances tierces (gérées par Dependabot), ReDoS/injection regex, race conditions théoriques, manque de logs d'audit.

## Ce qu'un audit de code ne couvre pas

- Sécurité de l'infrastructure de déploiement (serveur, nginx, secrets en prod réels) — hors de ce repo.
- Test dynamique / pentest actif (fuzzing, exploitation réelle) — ceci reste une revue statique par lecture de code.
- Comportement des services tiers (Groq, Chargily) au-delà de l'intégration côté TafTech.

**Recommandation** : avant tout lancement avec paiement réel à grande échelle, faire compléter cet audit par un pentest externe humain, en particulier sur le flux Chargily et l'authentification JWT.
