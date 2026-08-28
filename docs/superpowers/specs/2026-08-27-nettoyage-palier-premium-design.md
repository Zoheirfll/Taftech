# Nettoyage duplication Palier/Premium

## Contexte
Deux systèmes de facturation Premium coexistent depuis la Phase 2a du portail recruteur (22/08/2026) :
- **Legacy** : `PremiumPlan`/`PremiumAvantage`, champs `ProfilEntreprise.est_premium`/`premium_expire_at`/`premium_nb_mois`, page `PremiumPage.jsx`, panel `AdminPremium.jsx`, `ChargilyCheckoutAPIView` (flux `nb_mois`).
- **Nouveau** : `Palier` (STARTER/PRO/BUSINESS/ENTERPRISE) + `AbonnementEntreprise`, panel `AdminPaliers.jsx`, page `AbonnementsPage.jsx`, `ChargilyCheckoutPalierAPIView`, gating réel déjà câblé (Phase 2b) sur CVthèque/limite offres/IA/équipe.

`Palier` devient l'unique système. Le legacy est supprimé, pas seulement désactivé.

## Backend

**Migration de données (avant suppression des champs)** : nouvelle migration Django — pour chaque `ProfilEntreprise(est_premium=True)` sans `AbonnementEntreprise`, créer `AbonnementEntreprise(palier=<BUSINESS>, date_debut=now, date_expiration=premium_expire_at)`. Texte/valeurs dupliqués en dur dans la migration (pattern déjà établi dans ce projet — une migration ne doit jamais dépendre du code applicatif).

**Suppressions** :
- Modèles `PremiumPlan`, `PremiumAvantage`
- Champs `ProfilEntreprise.est_premium`, `premium_expire_at`, `premium_nb_mois`, property `est_premium_actif`
- Vues : `ChargilyCheckoutAPIView` (ancien flux), `PremiumPlansAdminAPIView`, `PremiumPlansPublicAPIView`, `PremiumAvantagesAdminAPIView`, `PremiumAvantagesPublicAPIView` (`jobs/views/premium_admin.py` supprimé en entier)
- Branche `nb_mois` du webhook Chargily unique (`ChargilyWebhookAPIView`) — ne garde que la branche `metadata.palier_nom`
- Routes correspondantes dans `jobs/urls.py`

**Adaptations** :
- `AdminDemandesPremiumAPIView` (activation manuelle CIB/EDAHABIA) : au lieu d'écrire `est_premium`/`premium_expire_at`, crée/prolonge un `AbonnementEntreprise`. Ajout d'un champ `palier` dans le payload PATCH (admin choisit le palier, plus seulement `nb_mois`). `DemandeActivationPremium.nb_mois` reste pour compat historique d'affichage mais n'est plus utilisé pour calculer un prix.
- `EnvoyerRecuPremiumAPIView` : lit le prix via `Palier` (le palier actif de l'entreprise) au lieu de `_get_plan_premium()`.
- `get_palier_actif()` (`jobs/paliers_utils.py`) : supprime le repli legacy vers `est_premium_actif` (n'a plus lieu d'être, toutes les entreprises premium ont désormais un vrai `AbonnementEntreprise` après migration).
- `DashboardRecruteurAPIView` : retire `est_premium`/`premium_expire_at`/`premium_active_since`/`premium_nb_mois` de la réponse, garde uniquement `palier_actif`/`acces_equipe`/`acces_ia_recommandes`/`acces_ia_avancee`/`acces_coordonnees` (déjà exposés).
- `accounts/views.py` (blocage login membre premium expiré, code `PREMIUM_EXPIRE`) : bascule sur `get_palier_actif(entreprise) is None`.

## Frontend

**Suppressions** : `Pages/Recruteur/Portal/PremiumPage.jsx`, `Pages/Admin/AdminPremium.jsx`, route `/admin-taftech/premium-config`, entrée sidebar correspondante, `jobsService.getPremiumPlans`/`getPremiumAvantages`/`updatePremiumPlans`/etc.

**Conservé** : redirection `/recruteurs/premium` → `<Navigate to="/recruteurs/abonnements" replace />` (déjà en place, pointeur mis à jour si nécessaire).

**Réalignement des consommateurs `isPremium`/`est_premium`** (remplacés par les flags palier déjà exposés par `getDashboard()`) :
- `NavbarRecruteur.jsx` — badge "⭐ Premium" → nom du palier (`palier_actif`), déjà partiellement fait pour le nom mais garde un fallback `est_premium` à retirer
- `CreateJob.jsx` — `iaReady = isPremium && ...` → `acces_ia_recommandes` (palier Starter+ selon doc) — vérifier le seuil exact déjà utilisé côté backend (`GenererOffreIAAPIView`)
- `CVTheque.jsx` — déjà en grande partie migré (Phase 2b), vérifier résidus `isPremium`
- `GestionOffre/DetailCandidature.jsx`, `GestionOffre/useGestionOffre.js` — Analyse IA/Résumé IA bloqués : `acces_ia_avancee`
- `ParametresRecruteur.jsx` — déjà migré pour `acces_equipe` (Phase 2b), vérifier résidus
- `DashboardRecruteur.jsx` — badge date expiry → `AbonnementEntreprise.date_expiration` via le dashboard

## Tests
- Adapter toutes les fixtures de test utilisant `est_premium=True` (nombreuses, cf. `test_api_cvtheque.py`, `test_api_premium.py`, `test_api_recruteur.py`, `test_api_equipe.py`) vers `AbonnementEntreprise`.
- Supprimer `test_api_premium.py` (couvrait `PremiumPlan`) — remplacé par la couverture déjà existante `test_api_paliers.py`/`test_api_paliers_gating.py`.
- Backend `manage.py test jobs`, frontend build + suite Vitest complète (retirer/adapter les tests `AdminPremium.test.jsx`, `PremiumPage.test.jsx`).

## Non touché
`AbonnementsPage.jsx`, `AdminPaliers.jsx`, tout `paliers_admin.py`/`paliers_utils.py` (sauf le repli legacy retiré ci-dessus).
