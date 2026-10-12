# Fonctionnalités livrées

> Catalogue des fonctionnalités par domaine (CMS, auth, offres, matching...). Index : [README.md](README.md)

## ✅ FEATURES COMPLÈTES

### 🧩 CMS Admin (contenu du site géré sans code) — chantier terminé session 20/08/2026
Demande initiale de l'employeur : gérer sans intervention technique prix, abonnements, avantages, FAQ, secteurs/métiers/compétences, articles, bannières, pages du site, et contrôle IA. Secteurs/métiers existaient déjà (nomenclature ANEM, `AdminMetiers.jsx`) — 7 sous-projets ajoutés, chacun brainstormé et validé séparément avant implémentation :

| Sous-projet | Panel admin | Modèles clés | Consommateurs publics |
|---|---|---|---|
| ~~Prix/Abonnements/Avantages~~ | ~~`/admin-taftech/premium-config`~~ | ~~`PremiumPlan`, `PremiumAvantage`~~ | **Supprimé le 27/08/2026** — remplacé par `/admin-taftech/paliers` (`AdminPaliers.jsx`, modèle `Palier`) et `/recruteurs/abonnements` (`AbonnementsPage.jsx`), voir session dédiée |
| FAQ | `/admin-taftech/faq` | `FaqItem` (catégorie GENERAL/RECRUTEUR/PALIERS) | `ContactezNous.jsx`, `LandingRecruteur.jsx`, `AbonnementsPage.jsx` |
| Compétences | `/admin-taftech/competences` | `CompetenceReferentiel` | Autocomplete `ProfilCandidat/index.jsx` (suggestions, champ reste libre) |
| Blog/Articles | `/admin-taftech/articles` | `Article`, `ArticleCategorie` | `Blog.jsx` (`/blog`), `ArticleDetail.jsx` (`/blog/:slug`) |
| Bannières | `/admin-taftech/bannieres` | `SiteAnnonce` (bandeau global, 1 active), `BanniereAccueil` (carrousel) | `SiteAnnonceBar.jsx` (toutes pages), `BanniereCarousel.jsx` (Home) |
| Pages du site | `/admin-taftech/pages` | `PageStatique` | `PageStatiqueGenerique.jsx` (`/cgu`, `/confidentialite`, `/pages/:slug`), bloc éditorial dans `QuiSommesNous.jsx` |
| Configuration IA | `/admin-taftech/ia-config` | `AIConfig` (singleton) | Lu par `jobs/ai_engine.py::call_ai()` (Groq/Ollama réel, pas juste un champ de config) — aucune page publique |

**Décisions transverses qui traversent tout le chantier** :
- **Contenu riche** (Blog + Pages du site) : éditeur TipTap (`Components/RichTextEditor.jsx`, réutilisé par les deux), sortie HTML sanitizée côté backend (`bleach`) à chaque `save()` — défense en profondeur même si seul le rôle ADMIN y écrit aujourd'hui.
- **Cache** : chaque endpoint public utilise `django.core.cache` (timeout 5 min à 1h selon la volatilité), invalidé explicitement à chaque écriture admin — pattern déjà établi par `jobs_constants` avant ce chantier, reconduit partout.
- **Sécurité** : tous les endpoints admin `IsAdminUser` + check `request.user.role == 'ADMIN'` ; toutes les lectures publiques passent par `PublicReadThrottle` (scope créé en tout début de cette session, cf. section Sécurité) ; aucun brouillon/contenu inactif jamais exposé côté lecture publique (filtré côté serveur, pas côté client).
- **"Intelligence artificielle" mal compris au départ** : l'employeur ne voulait pas de génération de contenu IA mais un contrôle des paramètres (modèle, kill-switch par fonctionnalité) — clarifié par question ciblée avant de coder, a évité de construire la mauvaise fonctionnalité.
- **Piège récurrent (3 fois cette session)** : ajouter un nouvel appel `jobsService.*` dans un composant déjà couvert par un test cassait ce test silencieusement (mock incomplet) — `PremiumPage.test.jsx`, `Home.test.jsx` corrigés en cours de route. Réflexe à garder : toute nouvelle dépendance `jobsService` dans un fichier testé doit être ajoutée au mock du test correspondant.

**Historique détaillé** (design, alternatives écartées, bugs trouvés en testant) : voir les 7 sections "SESSION 20/08/2026" juste en dessous, une par sous-projet, dans l'ordre où ils ont été construits.

### 🔐 Authentification
- Inscription candidat/recruteur, login JWT, déconnexion, mot de passe oublié, vérification email
- Rôles : CANDIDAT / RECRUTEUR / ADMIN
- Changer MDP disponible dans Settings (candidat) ET ParametresRecruteur (onglet Mon profil) — adapté compte Google
- Verrouillage compte (5 échecs → verrou 15 min)
- `GuestRoute` : redirige les utilisateurs déjà connectés hors des pages login/inscription (ADMIN → /admin-taftech, RECRUTEUR/membre → /dashboard, CANDIDAT → /profil)

### 💼 Offres & Candidatures
- CRUD offres recruteur, modération admin (APPROUVEE / EN_ATTENTE / REJETEE)
- Candidature TafTech (profil + snapshot + score IA) et candidature rapide (sans compte)
- Statuts : RECUE / EN_COURS / PRESELECTION / ENTRETIEN / RETENU / REFUSE — chronologie visuelle 6 étapes (`Components/CandidatureTimeline.jsx`) côté candidat et recruteur
- Entretien programmé + email auto, email refus configurable
- Évaluation post-entretien (4 critères /5 = note /20)
- Bulletin PDF (logo + score si >=60% + évaluation + signatures)
- Questionnaires (CRUD + types COURT/LONG/NUMERIQUE/CHOIX_UNIQUE/CHOIX_MULTIPLE + questions disqualifiantes)

### 👤 Profil Candidat
- Titre (autocomplete ROME), photo, CV PDF, bio, LinkedIn, GitHub
- Compétences, langues, expériences, formations, préférences
- Service militaire, permis, passeport, niveau expérience
- Score complétion, parser CV IA (extrait depuis PDF), snapshot à la postulation

### 🏢 Profil Entreprise
- Nom + registre commerce verrouillés après validation, logo, description, taille
- Page publique vitrine, CVThèque avec filtres + favoris
- Email refus auto avec variables ({prenom}, {titre_offre}, {nom_entreprise})

### 🤖 Matching IA
> ⚠️ Section réécrite le 18/09/2026 (cutover référentiel v2) — l'ancien référentiel `Secteur`/`Domaine`/`SousDomaine`/`MetierReferentiel` (nomenclature ANEM) décrit ici jusqu'à la session ANEM du 18/07/2026 a été **entièrement supprimé**. Voir les sessions "SESSION 17/09/2026" et "SESSION 18/09/2026 — Référentiel v2 : cutover complet" en tête de fichier pour l'historique complet de la migration.
- Score 0-100% : Spécialité/Métier (0-25) + Diplôme (0-20) + Expérience (0-20) + Région (0-20) + Compétences (0-15)
- Radar SVG 5 critères (candidat + recruteur), comparateur 2 candidats
- Groq séparé du scoring — classique uniquement
- **Matching au niveau `Metier`** (référentiel v2 client, 1038 métiers) : `matcher.py::metiers_compatibles()` compare `OffreEmploi.metier`/`ProfilCandidat.metier`/`ExperienceCandidat.metier` (FK, résolus vers leur `metier_canonique`) — exact 1.0, même `groupe_principal` 0.85, fuzzy `difflib` ≥0.72 en filet de sécurité. **Pas de bonus "même secteur parent"** (contrairement à l'ancien système par préfixe de code Domaine) — un métier hors `groupe_principal` du candidat obtient 0, jamais un score dégradé.
- **Diplôme** : si l'offre définit des `OffreDiplomeAccepte` (couples `DiplomeSpecialite` explicites), le score se base dessus (couple exact 20/20, diplôme seul 12/20, aucune formation obtenue = donnée manquante 6/20) ; sinon repli intégral sur l'ancienne hiérarchie de niveau (`profil.diplome`/`offre.diplome`).
- **Indicateur de complétude** : `calculer_score_matching()` expose `completude` (pondéré par les vrais poids des critères, ex. spécialité+diplôme manquants = 1-0.45=0.55, jamais un simple `1 - nb_manquants/5`) et `criteres_manquants` — distingue "donnée manquante" d'"incompatible" (exigence client explicite, référentiel v2).
- **Référentiel v2 (`Metier`/`GroupeMetier`/`Appellation`)** : 1038 métiers, 7428 appellations de poste précises, hiérarchie `GroupeMetier` (secteur_source → domaine_source) reconstruite depuis le fichier client. Import idempotent via `python manage.py import_referentiel_v2` (upsert par `code`).
- **Autocomplete métier** (`Components/MetierAutocomplete.jsx`) : recherche sur `Appellation.cle_recherche`, résout automatiquement vers le `metier_canonique` (redirections) tout en gardant le libellé précis de l'appellation choisie — utilisé partout où un métier candidat/offre/expérience est saisi.
- **Classification d'expérience par agent Groq dédié** (`jobs/domaine_agent.py::classifier_metiers_experiences`) : RAG léger — cherche des appellations réelles ressemblant au poste (`Appellation.cle_recherche`) puis fait choisir l'IA **uniquement parmi ces candidats montrés**, jamais un code deviné dans les 1038 métiers en une fois (liste trop grande pour un prompt).

### 🔍 Recherche & Dashboard
- Multicritères avec debounce 400ms, pagination, offres recommandées IA
- KPIs dashboard recruteur, Top 5 shortlist IA, archives, correction offre rejetée

### 🔴 Dashboard Erreurs Système (Admin)
- Page `/admin-taftech/erreurs-systeme` → `AdminSystemLogs.jsx`
- API `GET /api/accounts/admin/system-logs/?page=N` — pagination 50/page
- API `DELETE /api/accounts/admin/system-logs/` — tout effacer
- Liste : date, message, URL, user + modal détail avec stack trace
- Lien dans sidebar AdminLayout avec icône AlertTriangle

### 📬 Notifications, Alertes, Admin
- Cloche navbar avec badge, boîte de réception, alertes emploi par email
- Panel admin : stats, journal d'audit (`AuditLog`), broadcast, données marché
- Référentiel ROME 11 090 métiers, suggestions carrière Groq

### 🔐 Vérification Email — Flux complet
- `RenvoyerCodeVerificationAPIView` : POST `/api/accounts/renvoyer-code/` — génère nouveau code, reset timer, envoie email
- `sessionStorage` clé `taftech_pending_verification` (candidat) / `taftech_pending_verification_recruteur` (recruteur) — persiste entre reloads, effacée après vérification réussie
- Login détecte `COMPTE_NON_VERIFIE` → redirige vers `/register` ou `/recruteurs/inscription` avec email pré-rempli
- `CookieTokenObtainView` propagation dict errors : `isinstance(detail, dict)` → retour direct sans stringify
- Bouton "Renvoyer le code" dans step 2 inscription candidat (indigo) et recruteur (teal)

### 🤖 IA Génération Offre (CreateJob)
- `GenererOffreIAAPIView` : POST `/api/jobs/ia/generer-offre/` — Premium uniquement, appel Groq direct avec `response_format: {type: 'json_object'}`
- Retourne `{description, missions, profil_recherche}` — pré-remplit les champs texte
- Utilise `get_entreprise_for_user()` (pas `request.user.profilentreprise`) pour vérifier premium membres équipe
- Frontend : bannière amber, bouton désactivé si titre/spécialité manquants, badge "Premium uniquement" si non-premium
- `_appel_groq()` NE PAS utiliser pour ce endpoint — strip les `*` qui corrompt le JSON → appel direct Groq

### 📝 Candidatures Spontanées
- Envoi sans compte, anti-doublon, vue recruteur filtrable, marquer lue / supprimer

### 🔑 Compte Google — Mot de passe recruteur
- `CustomUser.est_compte_google` : BooleanField (migration 0008) — marqué `True` à la création via `GoogleSocialAuthView`
- `MeAPIView` : `GET /api/accounts/me/` — retourne `est_compte_google`
- `ChangerMotDePasseAPIView` : `POST /api/accounts/changer-mot-de-passe/` — sans `ancien_mdp` si `est_compte_google=True`
- `Settings.jsx` candidat : formulaire adapté (Définir vs Modifier selon `est_compte_google`)
- `InviterMembreAPIView` : si compte Google → envoie lien invitation (pas ajout direct) pour que l'invité définisse un mot de passe
- `AccepterInvitationAPIView` GET : retourne `sans_mot_de_passe` (basé sur `est_compte_google`)
- `AccepterInvitationAPIView` POST : définit le mot de passe sans changer le rôle (garde accès espace candidat)
- Un membre d'équipe avec rôle `CANDIDAT` peut se connecter sur le portail recruteur grâce au check `est_membre_equipe` (serializer login ligne 119)

### 👥 Gestion d'Équipe Recruteur
- Rôles membres : PROPRIETAIRE / ADMIN / UTILISATEUR / INVITE
- `authService.peutFaire(minRole)` : hiérarchie `["INVITE","UTILISATEUR","ADMIN","PROPRIETAIRE"]`
- INVITE : accès lecture seule (candidatures, dashboard stats) — boutons d'action masqués (UI level, pas route level)
- ADMIN uniquement pour onglet "Mon entreprise" dans ParametresRecruteur
- `EquipeActionLog` : journal d'activité complet — log automatique sur CONNEXION, CREER_OFFRE, MODIFIER_OFFRE, CLOTURER_OFFRE, STATUT_CANDIDATURE, EVALUER_CANDIDATURE, INVITER_MEMBRE, RETIRER_MEMBRE, CHANGER_ROLE
- `EquipeAuditLogAPIView` : endpoint `GET /api/equipe/audit/` — visible PROPRIETAIRE/ADMIN, 100 derniers logs
- Journal accordéon lazy-load dans MonEquipe.jsx (ne charge qu'à l'ouverture)
- **Premium expiré → membres bloqués** : blocage au login (403 PREMIUM_EXPIRE) + blocage dashboard API ; PROPRIETAIRE toujours autorisé
- Onglet "Mon équipe" toujours visible pour PROPRIETAIRE même si premium expiré (pour gérer/supprimer membres)

### 🔗 Slug Entreprise
- `ProfilEntreprise.slug` — auto-généré depuis `nom_entreprise` via `slugify()` à la création (unicité garantie avec suffixe `-N` si collision)
- Migration 0044 : data migration peuple les slugs existants puis ajoute contrainte UNIQUE via `RunSQL` (pas `AlterField` — évite double création index `_like` PostgreSQL)
- URLs publiques : `/api/jobs/entreprises/<slug:slug>/` et `/api/jobs/entreprises/<slug:slug>/candidature-spontanee/`
- Frontend route : `/entreprise/:slug` (plus `:id`)
- QR code dans ParametresRecruteur encode `window.location.origin + /entreprise/{slug}`
- `slug` exposé dans `EntrepriseSimpleSerializer`, `EntreprisePublicSerializer`, `EntrepriseDashboardDetailSerializer`

### 🎨 Navbar Redesign
- Backdrop blur `bg-white/95 backdrop-blur-md` sur les deux navbars
- Liens nav : pill hover coloré (`hover:bg-indigo-50 rounded-lg` candidat, `hover:bg-teal-50` recruteur)
- Icônes sur tous les liens de navigation (lucide-react)
- Texte `text-slate-900` (noir) au lieu de `text-slate-600` (gris) sur les navbars
- Logo `h-16` dans conteneur `h-15` (légèrement débordant — effet voulu)
- ~80 occurrences de `text-slate-400/500` remplacées par `text-slate-600/700` sur 21 fichiers frontend

### 🧭 Onboarding Contextuel
- Composant `InfoBanner` (`src/Components/InfoBanner.jsx`) — bannière dismissable, localStorage `banner_${storageKey}`, variants indigo/teal/amber/slate
- Composant `Tooltip` + `TooltipIcon` (`src/Components/Tooltip.jsx`) — hover tooltip, prop `position` top/bottom/left/right
- Pages avec InfoBanner : ProfilCandidat, MesCandidatures, AlertesEmploi, BoiteReception, SuggestionsCarriere, Settings (candidat), DashboardRecruteur, CreateJob, CVThèque, CandidaturesSpontanees, Questionnaires, ParametresRecruteur
- Pages avec TooltipIcon : ProfilCandidat (complétion %), MesCandidatures (score), GestionOffre (tri score), DetailCandidature (note /20), JobDetail (score matching)
- Empty states améliorés : MesCandidatures (CTA vers /offres), CandidaturesSpontanees, JobsList

### 🤖 Matching IA CVthèque
- Dropdown "Comparer avec une offre" dans CVThèque — filtre sur offres APPROUVEE + active + non clôturée
- Paramètre `offre_id` dans `CVThequeView.get()` → calcule `calculer_score_matching` pour chaque candidat → trie par score desc
- Retourne `score_offre` dans chaque résultat (indexé par `user_id`, pas `pk`)
- Badge coloré sur chaque card : vert ≥70%, orange ≥40%, gris <40%
- Bandeau teal "Classement par compatibilité activé" avec bouton ✕
- `searchCVtheque` dans `recruteurService.js` passe `offre_id` dans les queryParams

### 📱 QR Code Entreprise
- Lib : `qrcode.react` (QRCodeCanvas)
- Visible dans **Paramètres → Mon entreprise** uniquement si entreprise approuvée
- Encode : `window.location.origin + /entreprise/{slug}` (dynamique, pas hardcodé)
- Bouton téléchargement PNG : `canvas.toDataURL("image/png")`

### ⏱ Expiration Automatique des Offres
- Champ `date_expiration` (DateField nullable) sur `OffreEmploi` — migration 0045
- `jours_restants` calculé dans `OffreEmploiSerializer` (SerializerMethodField)
- `OffreDashboardDTO` inclut `date_expiration` — visible dashboard recruteur, GestionOffre, admin
- `OffreEmploiCreateDTO` inclut `date_expiration`
- Command `archiver_offres_expirees` — clôture auto offres expirées, option `--dry-run`
- Crontab prod : `30 0 * * * python manage.py archiver_offres_expirees`
- CreateJob : boutons 30/60/90 jours + sélecteur date custom
- Affichage coloré : rouge ≤7j, orange ≤30j, teal ≤60j, vert >60j
- GestionOffre : sélecteur date inline pour modifier expiration (autorisé même si APPROUVEE)
- `UpdateOffreRecruteurAPIView` : si seul `date_expiration` dans le PATCH → pas de remise EN_ATTENTE

### ⭐ Système Premium (US11/12) — ⚠️ OBSOLÈTE, voir section "SESSION 27/08/2026 (soir)" en tête de fichier
> Ce système binaire (`est_premium`/`premium_expire_at`/`PremiumPlan`) a été **entièrement supprimé** le 27/08/2026 — remplacé par `Palier`/`AbonnementEntreprise` (voir Phase 2a/2b, sessions 22-23/08/2026, et le nettoyage du 27/08/2026). Section conservée telle quelle comme journal historique — ne pas s'y fier pour l'état actuel du code.
- `DemandeActivationPremium` : traçabilité complète des demandes (moyen, nb_mois, est_traitee, date_traitement) — **toujours en place**, mais active désormais un `AbonnementEntreprise` (avec palier choisi par l'admin), plus `est_premium`/`premium_expire_at`.
- ~~`ProfilEntreprise.est_premium_actif` : property qui vérifie `est_premium` + `premium_expire_at > now()`~~ — supprimé, remplacé par `jobs/paliers_utils.py::get_palier_actif()`.
- ~~`premium_expire_at` + `premium_nb_mois` sur `ProfilEntreprise`~~ — supprimé.
- Flow paiement recruteur : choix durée (1/3/6/12 mois) + CIB/EDAHABIA + envoi reçu email
- Prix avec remises : 6 mois −8% (11 040 DA), 12 mois −17% (19 920 DA)
- Page statut `/recruteurs/premium` : actif → dates activation/expiration/jours restants + section "envoyer reçu"
- Renouvellement/prolongation depuis page statut (étend l'expiry existante)
- Badge ⭐ Premium dans NavbarRecruteur (subtitle) + DashboardRecruteur (avec date expiry)
- Lien "Mon Premium ⭐" / "Passer Premium 🔒" dans dropdown navbar
- CVThèque bloquée intégralement pour non-premium (overlay)
- Analyse IA + Résumé IA bloqués dans GestionOffre pour non-premium
- Admin panel : onglet "Demandes Premium" dans `AdminEntreprises`, activation avec sélecteur mois
- Logout role-aware : recruteur → `/recruteurs/connexion`, candidat → `/login`
- 401 interceptor dans `axiosConfig.js` aussi role-aware

---

