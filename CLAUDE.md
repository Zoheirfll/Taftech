# CLAUDE.md — Mémoire Projet TafTech

> **Lire ce fichier en entier avant toute action dans ce projet.**

_Dernière mise à jour : 18/07/2026 — Remplacement complet du référentiel métiers + du système de secteurs par la nomenclature officielle ANEM (hiérarchie Secteur/Domaine/Sous-domaine/Appellation), sur branche `feature/anem-nomenclature`._

---

## 🆕 SESSION NOMENCLATURE ANEM (18/07/2026)

**Contexte** : l'ANEM a fourni un fichier officiel (`NAME.xlsx`, 5790 lignes) contenant la nomenclature algérienne des métiers. Remplacement complet (pas d'ajout) de deux systèmes existants :
1. `SECTEURS_CHOICES` (19 codes plats codés en dur type `IT`/`BTP`/`FINANCE`) → 16 secteurs officiels ANEM (`A`.."P")
2. `MetierReferentiel` plat (13 388 lignes ROME+Emploitic, un seul champ `secteur` texte libre) → hiérarchie complète Secteur → Domaine (87) → Sous-domaine (36) → Appellation (5786, = nouveau `MetierReferentiel`)

**Nouveaux modèles** (`jobs/models.py`, migration `0054`) : `Secteur` (code, libelle), `Domaine` (FK Secteur, code type "A11", libelle), `SousDomaine` (FK Domaine, libelle). `MetierReferentiel` restructuré : `titre` (= appellation), `domaine` FK, `sous_domaine` FK nullable, `code_fiche`, `fiche_metier`, `secteur_code` dénormalisé. Anciens champs `secteur`/`niveau_experience`/`mots_cles` supprimés.

**Matching au niveau Domaine (pas Secteur)** : `OffreEmploi.specialite`, `ProfilCandidat.specialite`/`secteur_souhaite`, `ExperienceCandidat.secteur` restent des `CharField` simples (pas de FK — éviterait un refactor massif de matcher.py/serializers/frontend) mais stockent désormais un **code Domaine** (ex `"L18"`) au lieu d'un code Secteur. Le préfixe du code Domaine encode son Secteur (`"L18"[0] == "L"`) → sert à déduire la compatibilité "même secteur" dans `matcher.py` sans table de proximité codée en dur. `ProfilEntreprise.secteur_activite` reste au niveau Secteur (16 codes) — une entreprise n'est pas cantonnée à un seul domaine.

**`jobs/matcher.py`** : `_CODES_PROCHES` (dict 19×19 codé en dur) et `SYNONYMES_SPECIALITE` supprimés. `specialites_compatibles()` : code Domaine identique → 1.0, même Secteur (même 1ère lettre) → 0.85, sinon fuzzy `difflib` ≥0.72 en filet de sécurité.

**`jobs/constants.py`** : `SPECIALITES_MAPPING`/`SYNONYMES_SPECIALITE` supprimés, remplacés par résolution dynamique via `jobs/referentiel_utils.resoudre_domaine_depuis_texte()` (recherche par mots-clés dans `MetierReferentiel.titre`, retourne le `domaine.code` le plus fréquent) — utilisé par `cv_parser.extract_specialite()` et `matcher._experience_pertinente()` (fallback).

**Nouvel endpoint `GET jobs/nomenclature/`** (`NomenclatureAPIView`, `jobs/views/offres.py`) : retourne l'arbre complet (secteurs+domaines+sous_domaines, ~140 nœuds), caché 1h (`jobs_nomenclature`). Filtré côté client en cascade, même pattern que wilaya→commune. `domaines[].id` exposé en plus de `code` — nécessaire pour soumettre le FK numérique depuis l'admin (`AdminMetiers.jsx`).

**`MetierReferentielAPIView`** (autocomplete public) : accepte désormais `secteur`, `domaine`, `sous_domaine` en query params en plus de `search`.

**Frontend — `SecteurDomaineSelect.jsx`** (nouveau composant réutilisable) : cascade Secteur → Domaine → Sous-domaine (affiché seulement si non vide pour le domaine choisi). Charge la nomenclature une seule fois via `jobsService.getNomenclature()` (cache module-level). Intégré dans `CreateJob.jsx`, `JobsList.jsx`, `CVTheque.jsx`, `CandidaturesSpontanees.jsx`, `ProfilCandidat/Modals.jsx` (spécialité candidat, secteur souhaité, secteur d'expérience), `AdminMetiers.jsx`.

**`OffresParSecteur.jsx`** : nouveau `iconsMap` 16 entrées (A→Sprout ... P→Users), fallback Briefcase inchangé.

**Migration des données existantes** : commande `import_anem_nomenclature.py` (`--dry-run`, `--migrate-existing-data`, `--file`). Import réel : 16 secteurs, 87 domaines, 36 sous-domaines, 5786 métiers. Les 6 offres + 8 profils + 28 expériences existants (base dev) remappés automatiquement via un dict `ANCIEN_VERS_DOMAINE` (19 anciens codes → code Domaine ANEM le plus pertinent, vérifié manuellement contre les libellés réels après import, ex: `IT`→`L18` "Systèmes d'information et de télécommunication", `BTP`→`F11`, `JURIDIQUE`→`P16` "Droit").

**`requirements.txt`** : ajout `openpyxl==3.1.5` (lecture du fichier Excel ANEM).

**Tests** : backend `test_api_metiers.py` réécrit pour le nouveau modèle (25/25). Frontend : ajout du mock `getNomenclature` dans 7 fichiers de test consommant `SecteurDomaineSelect`, `OffresParSecteur.test.jsx` mis à jour avec les nouveaux codes secteur. 338/338 frontend + 283/283 backend au vert, `npx vite build` propre.

---

## 🆕 SESSION PARSER CV + REFONTE ADMIN (17/07/2026)

### Parser CV (`jobs/cv_parser.py`) — bugs réels trouvés sur CV utilisateurs
- **`find_sections()`** : le matching de mot-clé était en sous-chaîne (`keyword in line_clean`) au lieu de `line_clean.startswith(keyword)` → une ligne comme "Arabe Langue maternelle..." était prise pour un nouveau header de section (contenait "langue") et son contenu était perdu. Fix : `startswith`.
- **Format d'expérience "Du DATE au DATE : ..."** : nouvelle fonction `_extract_experiences_du_au()` — gère le cas réel où le titre du poste est sur la ligne PRÉCÉDENTE (pas fusionné avec la ligne de dates), avec retrait rétroactif de la puce erronée ajoutée par erreur à l'expérience précédente.
- **Format de formation "Mois AAAA : Diplôme à Établissement"** : nouvelle fonction `_extract_formations_mois_annee()`, même logique de continuation.
- **Téléphone** : `extract_phone()` réécrit — gérait mal les regroupements de chiffres autres que 2-2-2-2-2 (ex: "698 560 337" en 3-3-3) et l'indicatif entre parenthèses `(+213)`.
- **Langues** : regex de niveau élargie (`bon niveau`, `notions`, `scolaire` ajoutés), charset élargi pour capter "IELTS : B2" sans couper au `/`.
- **Description tronquée** : `description[:500]` → `description[:3000]` (CV à nombreuses puces coupés à mi-phrase).
- **1 seul appel Groq au lieu de 4** (`PROMPT_CV_COMPLET` fusionné) — réduit le token usage ~4x, corrige un 429 TPM ; `text[:12000]` + `max_tokens=8000` (rééquilibré après la fusion).
- **`ProfilCandidatAPIView.put()`** : troncature auto des champs `User` trop longs + auto-préfixe `https://` sur `linkedin`/`github` (CV contiennent souvent "linkedin.com/..." sans protocole → `URLField` rejetait avant).
- **`_deviner_secteur_experience()`** (nouveau, `jobs/views/ia.py`) : devine le secteur de chaque expérience extraite (recherche `MetierReferentiel` puis fallback mots-clés puis `'AUTRE'` — ne retourne jamais `None`).
- **Limite connue non résolue** : CV à mise en page colonnes (ex. dates alignées à droite) peuvent scrambler l'ordre du texte extrait par `pdfplumber`, regroupant tous les headers de section en tête sans contenu entre eux — cassant le modèle séquentiel de `find_sections()`. Pas encore corrigé ; fallback recommandé = laisser Groq gérer (plus robuste à l'ordre) plutôt que réécrire l'extraction PDF.

### Refonte Admin — design + fonctionnalités
- **Sidebar** (`AdminLayout.jsx`) : regroupée en sections (Principal/Modération/Communauté/Système), fond clair (plus de slate-900 sombre), lien actif = `bg-indigo-50` + barre latérale indigo. Badges de notification (offres/entreprises/demandes premium en attente) alimentés par `AdminStatsAPIView`.
- **Nouvelle page** `AdminDemandesPremium.jsx` (+ route `/admin-taftech/demandes-premium`) : expose l'endpoint `AdminDemandesPremiumAPIView` qui existait déjà côté backend mais n'était jamais utilisé côté frontend.
- **AdminUsers.jsx** : migré vers `tw.*` (était 100% Tailwind en dur) + onglets par rôle (Tous/Candidats/Recruteurs/Admins) avec compteurs, alimentés par un filtre `role` + champ `counts` ajoutés à `AdminUsersListAPIView`.
- **AdminSystemLogs.jsx** : migré vers `tw.*`.
- **Cartes KPI dashboard** (`AdminStatistiques.jsx`) : emojis remplacés par icônes lucide-react dans des chips colorés, recentrées sur la charte TafTech (indigo/teal), ambre/rouge réservés aux alertes.
- **Filtres + tri serveur** : `statut` sur Offres/Candidatures, `ordering` sur Offres/Entreprises/Utilisateurs/Candidatures (nouveau paramètre backend `ORDERING_FIELDS` par vue, whitelist stricte des champs triables). En-têtes cliquables via composant réutilisable `SortableTh.jsx`.
- **Actions groupées** : sélection multiple + "Approuver la sélection" sur Offres et Entreprises (boucle `Promise.all` sur l'endpoint de modération existant, pas de nouvel endpoint bulk côté backend). Volontairement PAS ajouté sur Candidatures (le changement de statut appartient au workflow recruteur/équipe, pas à l'admin).
- **Skeleton loaders** : nouveau composant partagé `SkeletonTableRows.jsx`, remplace le texte "Chargement..." clignotant sur les 4 tableaux admin (Offres/Candidatures/Entreprises/Utilisateurs).
- **Tooltips d'info** (`TooltipIcon` existant réutilisé) : ajoutés sur les KPI ambigus (Recrutements réussis, Offres en attente...), colonnes Score IA/Note entretien, tarif Premium.
- **Accessibilité** : anneau de focus clavier (`tw.focusRing`, nouveau token) + `aria-label` ajoutés sur les boutons d'action icône-seule (Offres/Entreprises/Utilisateurs/Demandes Premium).
- **Décision produit** : pas de bouton "Supprimer" généralisé dans l'admin — seul bloquer/débloquer par défaut, suppression réservée aux cas déjà sûrs (offres non approuvées sans candidature). Historique de recrutement = valeur légale/business, suppression accidentelle plus coûteuse que son absence.
- **5 comptes de test supprimés** (`test_e2e@example.com`, `test_repro@example.com` ×4) — créés le même jour, jamais réels, supprimés en cascade (profil + formations) après confirmation explicite.

---

## 🆕 SESSION UI/UX + PAGES LÉGALES + NOMBRE DE POSTES (15/07/2026, tard)

**Footers refaits (candidat + recruteur)** : structure identique aux deux (Marque / Contact / Réseaux sociaux / Légal), même hauteur/espacement, fond `bg-slate-950`, police Poppins (chargée dans `index.html`) appliquée uniquement au footer via `style={{fontFamily}}`. Colonne "Espace candidat"/"Espace recruteur"/"Plateforme" retirées — jugées redondantes avec la navbar. Réseaux sociaux réels : Facebook `Taftechemploi`, Instagram `taftechemploi`, LinkedIn `oranemploi`, WhatsApp `+213770123440`.

**Nouvelles pages publiques** (routes ajoutées dans `App.jsx`, liées depuis les footers en `target="_blank"`) :
- `/confidentialite` — Politique de confidentialité (sommaire sticky, catégories de données réelles incl. NIN, durée conservation 5 ans candidats / 10 ans recruteurs — valeurs provisoires faute de mieux, à confirmer)
- `/cgu` — CGU, marquées **version provisoire** (bandeau d'alerte) tant que raison sociale/immatriculation ne sont pas fournies par l'utilisateur
- `/contact` — formulaire de contact fonctionnel (envoie un email réel, voir `ContactMessageAPIView`) + FAQ accordéon + horaires (Dim-Jeu 08h-17h, choisi par défaut)
- `/qui-sommes-nous` — mission/valeurs/services + **stats réelles en direct** (`jobs/stats/public/`, jamais de chiffres inventés)

**Portail recruteur vs candidat sur pages partagées** : `App.jsx` lit un paramètre `?portail=recruteur` (en plus du rôle connecté) pour forcer la navbar recruteur sur ces 4 pages quand on y arrive depuis le footer recruteur, même déconnecté. Voir `forcePortalParam` dans `AppContent()`.

**Fix bug navbar recruteur fantôme** : `estRecruteurConnecte` vérifiait seulement `portal === "recruteur"` sans vérifier qu'un rôle actif existe → si `loginPortal` restait à "recruteur" en localStorage (session expirée) alors que `userRole` était vide, la navbar recruteur s'affichait sur les pages candidat même déconnecté. Fix : `role === "ADMIN" || (!!role && portal === "recruteur")`.

**Fix bug déconnexion candidat → recruteur** : `authService.logout()` et l'intercepteur 401 (`axiosConfig.js`) décidaient de la redirection selon `estMembreEquipe` au lieu du portail de connexion réel (`loginPortal`) — un candidat membre d'une équipe recruteur atterrissait sur `/recruteurs/connexion` en se déconnectant du portail candidat. Fix : redirection basée sur `loginPortal` uniquement.

**Fix bug focus perdu — champ "Mots-clés" (JobsList)** : `FiltersPanel` était un composant défini à l'intérieur de `JobsList`, donc recréé à chaque frappe → React démontait/remontait tout le panneau de filtres, perdant le focus après chaque lettre. Fix : converti en variable JSX (`filtersPanel`) au lieu d'un composant-fonction.

**Token `tw.bgPrimarySolid` manquant** : utilisé à 11 endroits (Home, JobsList, Entreprises, JobDetail) mais jamais défini dans `theme.js` → boutons sans aucun style (texte brut). Ajouté dans `theme.js`.

**Nouveau champ `nombre_postes`** sur `OffreEmploi` (migration `0052`, défaut 1) — visible/éditable dans CreateJob, DashboardRecruteur (modale modifier), GestionOffre, JobDetail (tuile info), JobsList (badge si >1). Exposé dans `OffreEmploiSerializer` (`__all__`), `OffreEmploiCreateDTO`, `OffreEmploiPublicSerializer`, `OffreDashboardDTO`.

**Nouveau champ `adresse_complete`** sur `ProfilEntreprise` (migration `0051`, texte libre, indépendant de `wilaya_siege`) — configurable dans ParametresRecruteur → Mon entreprise, affiché en carte Google Maps embed sur **EntreprisePublic uniquement** (pas sur JobDetail : la localisation d'une offre doit toujours suivre le wilaya/commune de l'offre elle-même, pas le siège de l'entreprise — un siège à Alger avec une offre à Oran doit afficher Oran).

**Suppression d'offre recruteur** : nouvel endpoint `DELETE /api/jobs/dashboard/offres/<id>/supprimer/` (`SupprimerOffreAPIView`) — autorisé uniquement sur offres `EN_ATTENTE`/`REJETEE`, jamais sur une offre `APPROUVEE` (clôturer seulement), refuse si des candidatures existent déjà. Bouton corbeille + confirmation inline dans DashboardRecruteur, réservé aux rôles UTILISATEUR+.

**Sécurité** : CSP (`middleware.py`) n'avait pas de `frame-src` → bloquait silencieusement les iframes Google Maps en prod (`DEBUG=False`), fonctionnait par accident en dev (CSP Report-Only). Ajouté `frame-src https://www.google.com https://maps.google.com`. `ContactMessageAPIView` durci : validation format email + troncature de tous les champs à leur longueur max. `UpdateProfilEntrepriseAPIView` tronque désormais chaque champ à son `max_length` modèle avant `save()` (évitait un 500 Postgres sur une valeur trop longue).

---

## 🎨 MIGRATION THEME.JS — EN PAUSE (statut au 15/07/2026)

**Contexte** : chantier de centralisation de toutes les couleurs Tailwind (`text-*`, `bg-*`, `border-*`, `ring-*`, `placeholder-*`) vers des tokens `tw.*` dans `taftech_frontend/src/theme.js`, au lieu de classes écrites en dur dans chaque composant. Mis en pause car trop long (plusieurs passes d'agents ont échoué sur limite de quota Claude) — **ne pas relancer de migration automatique en masse sans demande explicite**.

`tailwind.config.js` redéfinit déjà : `indigo` = bleu logo TafTech (600 = `#204883`, exact logo), `teal` = vert TafTech (600 = `#3a8226`, 700 = `#307020` — nuance utilisée par la majorité des boutons/textes `bg-teal-700`/`text-teal-700`, calibrée AA ≥4.5:1), `slate` décalé d'une teinte (plus foncé). Couleurs échantillonnées au pixel sur `src/assets/logo-taftech.png` (bleu `#204883`, vert `#67af57` à l'origine, puis assombri en 600/700 pour respecter le contraste texte). Les classNames restent `text-indigo-600`/`bg-teal-700`/`text-slate-500` etc. dans le code — la migration ne change QUE l'endroit où la classe est écrite (dans `tw.*` au lieu d'en dur), pas la couleur elle-même.

**Important Tailwind v4** : `index.css` doit contenir `@config "../tailwind.config.js";` juste après `@import "tailwindcss";` — sans cette ligne, Tailwind v4 **ignore silencieusement** `tailwind.config.js` (mode CSS-first par défaut, JS config non chargé). C'est ce qui causait "aucun changement visible" lors des premiers tests de couleur — pas un problème de cache navigateur.

### ✅ Fichiers entièrement migrés (utilisent `tw.*`, plus aucune couleur en dur)
- **Components** : InfoBanner.jsx, Tooltip.jsx
- **Admin** : AdminAuditLogs, AdminBroadcast, AdminCandidatures, AdminComptes, AdminEntreprises, AdminLayout, AdminMetiers, AdminOffres
- **Auth** : ForgotPassword, Login, RegisterCandidat, RegisterRecruteur, ResetPassword
- **Candidat** : AlertesEmploi, BoiteReception, CandidatLayout, MesCandidatures, OffresSauvegardees, ProfilCandidat/index.jsx, Settings, SuggestionsCarriere
- **Public** : Entreprises, Home, JobDetail, JobsList, OffresParRegion, OffresParSecteur
- **Recruteur** : AccepterInvitation, CVTheque, CandidaturesSpontanees, CreateJob

### 🟡 Partiellement migrés (utilisent déjà `tw.*` par endroits, mais gardent encore des classes couleur en dur — à terminer)
- Components : Footer.jsx, FooterRecruteur.jsx, JobCard.jsx, Navbar.jsx, NavbarRecruteur.jsx
- Admin : AdminStatistiques, AdminSystemLogs, AdminUsers
- Candidat : ProfilCandidat/Modals.jsx
- Recruteur : DashboardRecruteur, EntreprisePublic, GestionOffre/DetailCandidature, GestionOffre/Modals, GestionOffre/index, MonEquipe, ParametresRecruteur, Portal/LandingRecruteur (Hero + bande stats migrés, sections Fonctionnalités/Comment ça marche/Avantages/FAQ pas encore), Portal/ForgotPasswordRecruteur, Portal/LoginRecruteur, Portal/PremiumPage, Portal/PremiumSuccessPage, Questionnaires, ReviewCandidature

### Tokens `tw.*` disponibles dans theme.js (déjà créés, à réutiliser en priorité — ne pas dupliquer)
`buttonPrimary/Secondary/Ghost/Accent`, `card/cardHover/cardSelected`, `input/inputSearch`, `badgePrimary/Accent/Success/Neutral/Error`, `pageTitle/pageSubtitle/sectionTitle/sectionLabel/bodyText/mutedText/metricNumber`, `pageContainer/pageBackground`, `textMuted/textMuted700/textStrong/textSubtle/textLight/textOnDark/iconMuted/iconStrong`, `surface*`, `border*`, `divideBase`, tokens primary (indigo)/teal séparés (`textPrimary`, `bgTeal`, etc.), `navLink*` (desktop/mobile, actif/inactif, indigo/teal), `dropdownItem*`, `dropdownPanel`, `iconButton`, `navbarShell`, `modalOverlay(Strong)`, `modalPanel`, `pageTitleGrand/Petit`, `bodyTextGrand/Petit` (respectent le système 2 niveaux de densité), `footer*` (variante indigo candidat + variante teal/slate recruteur), `jobCard*`, `tooltipPanel/Arrow`, tokens couleurs ponctuelles (blue/orange/violet/purple), `auditAction*`, `score High/Mid/Low`, tokens AUTH (`authInput(Teal)`, `authLabel`, `otpBoxInput`, `heroPanelDark`, etc.), tokens LANDING RECRUTEUR (`landingHeroBorder`, `buttonTealSolidLg`, `landingStatsPanelDark`, `landingFeatureCard`, `landingFaq*`, etc.).

### Pour reprendre la migration
1. Lire `src/theme.js` en entier pour voir les tokens déjà là.
2. Prendre UN fichier à la fois de la liste "partiellement migrés", remplacer les classes couleur restantes par des tokens existants ou en créer de nouveaux si besoin.
3. Lancer `npx vite build` après chaque fichier.
4. Ne pas lancer plusieurs agents en parallèle sur ce chantier — ça a saturé le quota Claude plusieurs fois de suite sans finir un dossier complet.

---

## 👤 PROFIL UTILISATEUR

**FILALI Zoheir** — Fondateur TafTech
- Git user: `Zoheirfll` — email: `zoheir.fll31@gmail.com`
- Master 2 ADSI — Université Oran 1
- Cadre administratif SOMIZ (paie 4000 employés)
- Développeur Full-Stack React + Django + PostgreSQL
- Mentalité "architecture avant code" — pense en systèmes
- Passionné IA locale, automatisation métier
- Localisation : Oran, Algérie
- Préfère les réponses **courtes et directes** (pas de listes exhaustives inutiles)
- Parle **français** — répondre toujours en français

---

## 🚨 RÈGLES DE COLLABORATION — IMPÉRATIVES

1. 🔴 **TOUJOURS afficher le code AVANT/APRÈS dans le chat avant chaque Edit** — montrer `old_string` et `new_string` en blocs de code dans la réponse. Ne jamais faire un Edit silencieux.
2. **Ne jamais merger vers `main` sans permission explicite** de l'utilisateur
3. **Ne jamais committer `.env`** — il est dans `.gitignore` et doit y rester
4. **Rester sur la feature branch courante** — ne pas changer de branche seul
5. **Ne pas prendre d'initiatives non demandées** — faire seulement ce qui est demandé
6. **Demander confirmation avant toute action destructive** (reset, force push, suppression fichiers)
6. **Ne jamais résoudre Cypress** sans demande explicite — les tests E2E sont déprioritisés
7. Toujours vérifier que le build Vite passe (`npx vite build`) avant de déclarer une tâche terminée
8. **Mettre à jour CLAUDE.md après chaque changement technique** — tout nouveau comportement, décision, ou correction doit être reflété ici avant le commit. CLAUDE.md est la source de vérité du projet pour les futures sessions.

---

## 🏗️ PROJET : TafTech

Plateforme de recrutement en ligne ciblant le marché algérien.

- **Backend**: Django 5.2 + DRF — `taftech_backend/`
- **Frontend**: React 18 + Vite + Tailwind CSS v4 — `taftech_frontend/`
- **DB**: PostgreSQL port **5433** (pas 5432 — conflit avec autre projet SOMIZ)
- **Auth**: JWT SimpleJWT (access 15 min / refresh 7 jours)
- **IA Matching**: Algorithme classique (difflib + synonymes) — PAS Groq
- **IA Analyse**: Groq API (llama-3.1-8b-instant) — à la demande uniquement
- **PDF**: ReportLab
- **Email**: Django SMTP Gmail
- **Tests Backend**: Django TestCase + APIClient — 282/282 ✅
- **Tests Frontend**: Vitest + @testing-library/react — 338/338 ✅
- **Tests E2E**: Cypress 13.17.0 — 7 fichiers tous stables ✅
- **GitHub**: https://github.com/Zoheirfll/Taftech

**Attention** : SOMIZ tourne aussi sur port 8000 — vérifier le bon backend.

---

## 🎨 DESIGN SYSTEM

### Tailwind CSS v4 — classes canoniques
- `bg-linear-to-br` (pas `bg-gradient-to-br`)
- `shrink-0` (pas `flex-shrink-0`)

### Couleurs
- Primaire : `indigo-600` (#4f46e5)
- Accent : `amber-500`
- Texte : `slate-900 / slate-700 / slate-500 / slate-400`
- Backgrounds : `white / slate-50 / slate-100`
- Bordures : `slate-200`
- Success : `emerald-600` — Danger : `red-600` — Warning : `amber-600`

### Composants standards
- **Inputs** : `px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`
- **Bouton primaire** : `bg-indigo-600 text-white rounded-lg hover:bg-indigo-700`
- **Bouton annuler** : `bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200`
- **Modales** : `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50`
- **Cards** : `bg-white border border-slate-200 rounded-xl`

### Système deux niveaux de densité visuelle

**"Grand" — pages publiques et profil** (`text-2xl/3xl font-extrabold`, `text-base`, `py-3`, `rounded-2xl`):
> JobDetail, MesCandidatures, ProfilCandidat, DashboardRecruteur, OffresParRegion, OffresParSecteur, EntreprisePublic, ParametresRecruteur, AlertesEmploi, OffresSauvegardees, Settings (candidat), BoiteReception, SuggestionsCarriere

**"Petit" — auth et outils denses** (`text-xl/2xl font-bold`, `text-sm`, `py-2.5`, `rounded-xl`):
> Login, RegisterCandidat, RegisterRecruteur, ForgotPassword, ResetPassword, ReviewCandidature, CandidaturesSpontanees, Questionnaires, CVTheque, GestionOffre

### Mobile Responsive
Pattern à appliquer sur tous les grids :
```
grid-cols-1 sm:grid-cols-2 md:grid-cols-N
```
Ne jamais commencer un grid directement à `grid-cols-2` sans breakpoint mobile.

### 🎨 Rebranding couleurs (tailwind.config.js) — 15/07/2026
`taftech_frontend/tailwind.config.js` redéfinit les couleurs Tailwind par défaut (les classNames dans le code restent inchangés, ex. `bg-indigo-600`, `text-teal-700`, `text-slate-500` — seule la valeur hexadécimale change) :
- `indigo` → bleu logo TafTech exact (`indigo-600` = `#204883`)
- `teal` → vert vif TafTech, AA-safe (`teal-600` = `#3a8226`, `teal-700` = `#307020` contraste 6:1)
- `slate` → décalé d'une teinte, plus foncé partout (`slate-400` = ancien `#64748b`, etc.) pour un texte plus lisible/moins délavé

### Textes plus foncés (15/07/2026)
Remplacement global dans tout `src/` :
- `text-slate-500` → `text-slate-700` (paragraphes/texte secondaire)
- `text-slate-400` → `text-slate-600` (icônes/labels très clairs), sans toucher aux `placeholder-slate-400` (comportement normal des champs de saisie)

### Navbars — fond opaque (15/07/2026)
`Navbar.jsx` et `NavbarRecruteur.jsx` : `bg-white/95 backdrop-blur-md` → `bg-white` (fond blanc plein, plus de transparence/flou au scroll).

### LandingRecruteur.jsx — badges retirés (15/07/2026)
Suppression du badge "🇩🇿 Plateforme de recrutement algérienne" (hero) et du badge "IA activée ✓" (carte stats) — jugés redondants par l'utilisateur.

---

## 🏗️ ARCHITECTURE BACKEND

### jobs/views/ (package — ancien views.py)
- `notifications.py` — NotificationListAPIView, MarkNotificationReadAPIView, PublicStatsAPIView, EntrepriseDetailAPIView
- `offres.py` — JobListAPIView, JobDetailAPIView, JobCreateAPIView, UpdateOffreRecruteurAPIView, CloturerOffreAPIView, ConstantsAPIView. Toutes les actions (create/update/cloturer) utilisent `get_entreprise_for_user()` + `get_membre_role()` — INVITE bloqué, UTILISATEUR/ADMIN/PROPRIETAIRE autorisés
- `profils.py` — ProfilCandidatAPIView, ExperienceAPIView, FormationAPIView, alertes, favoris, paramètres
- `candidatures.py` — PostulerAPIView, PostulerRapideAPIView, MesCandidaturesAPIView, UpdateCandidatureStatusAPIView, DeleteCandidatureAPIView, EvaluerCandidatureAPIView, Top5CandidatsAPIView. Actions (update/delete/evaluer) utilisent `get_entreprise_for_user()` + `get_membre_role()` — INVITE bloqué
- `recruteur.py` — DashboardRecruteurAPIView (retourne `est_premium`, `premium_expire_at`, `premium_active_since`, `premium_nb_mois`, **bloc 403 `PREMIUM_EXPIRE` si membre non-propriétaire et premium expiré**), CVThequeView, questionnaires, spontanées, paramètres, **DemanderActivationPremiumAPIView**, **EnvoyerRecuPremiumAPIView**
- `admin.py` — AdminPagination + toutes vues admin + exports CSV + **AdminDemandesPremiumAPIView** (GET liste toutes, PATCH activer avec nb_mois → étend premium_expire_at)
- `ia.py` — OffresRecommandeesAPIView, ParserCVAPIView, MetierReferentiel, SuggestionsCarriereAPIView, AnalyseCarriereGroqAPIView, AnalyseGroqRecruteurAPIView. Helper `_appel_groq()` mutualisé.
- `bulletin.py` — GenererBulletinPDFAPIView
- `equipe.py` — EquipeAPIView, InviterMembreAPIView, AccepterInvitationAPIView, **EquipeAuditLogAPIView** (`GET jobs/equipe/audit/` — 100 derniers logs, PROPRIETAIRE/ADMIN seulement). Helper `_log(user, entreprise, action, detail)` — appelé dans equipe, offres, candidatures, accounts/views.

### jobs/serializers/ (package)
- `questionnaires.py` — ReponseChoixSerializer, QuestionnaireSerializer, ReponseCandidatSerializer
- `offres.py` — EntrepriseSimpleSerializer, OffreEmploiSerializer, OffreEmploiCreateDTO, EntreprisePublicSerializer
- `profils.py` — ExperienceSerializer, FormationSerializer, ProfilCandidatDTO, AdminUserSerializer, ParametresNotificationsSerializer
- `candidatures.py` — CandidatInfoDTO (avec helper `_profil()`), PostulerDTO, CandidatureRecruteurDTO, MesCandidaturesDTO
- `divers.py` — OffreSauvegardeeSerializer, AlerteEmploiSerializer, NotificationSerializer, CandidatureSpontaneeSerializer, MetierReferentielSerializer
- `entreprise.py` — EntrepriseDashboardDetailSerializer
- `dashboard.py` — OffreDashboardDTO

### jobs/constants.py
Centralise toutes les constantes métier — importer depuis là, pas depuis models.py.
WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES, WILAYAS_MAPPING, DIPLOMES_MAPPING, SPECIALITES_MAPPING, SYNONYMES_SPECIALITE

### accounts/
- `views.py` — rate limiting (`AnonRateThrottle`), hack Cypress isolé (`if settings.DEBUG`), expiry code reset (10 min), **bloc login membre si premium expiré** (code `PREMIUM_EXPIRE`), **`RenvoyerCodeVerificationAPIView`** POST `/api/accounts/renvoyer-code/`
- `models.py` — CustomUser + champ `code_verification_created_at`

### jobs/management/commands/
- `envoyer_alertes.py` — alertes emploi par email + notification. Option `--dry-run`.
- `relance_maj_cv.py` — relance candidats inactifs 60 jours. Option `--dry-run`.
- `archiver_offres_expirees.py` — clôture auto les offres dont `date_expiration < today`. Option `--dry-run`.
- `scraper_emploitic.py` — scrape titres de postes depuis emploitic.com via Playwright (subprocess pour éviter bug greenlet Windows). Importe dans MetierReferentiel. Options `--pages N` `--dry-run`. Playwright requis (`pip install playwright && python -m playwright install chromium`).
- `nettoyer_referentiel.py` — nettoie MetierReferentiel : supprime format ROME slash (masculin/féminin), reconstruit titre masculin propre, corrige H/F, noms de villes, tirets, déduplique. Option `--dry-run`.
- `corriger_secteurs_referentiel.py` — mappe codes ROME non standard (SERVICE_PUBLIC, AGRICULTURE, COMMUNICATION, SPECTACLE, ARTS) vers nos SECTEURS_CHOICES, devine secteur pour entrées AUTRE via mots-clés. Option `--dry-run`.

---

## 🏗️ ARCHITECTURE FRONTEND

### Services/ — pattern façade
`jobsService.js` est une façade qui réexporte tout. Les composants importent toujours `{ jobsService }`.
Sous-services : `candidatService.js`, `adminService.js`, `recruteurService.js`, `iaService.js`

### utils/mediaUrl.js — URLs médias centralisées
```js
import { mediaUrl } from "../utils/mediaUrl";
// En dev (VITE_MEDIA_BASE_URL vide) → URLs relatives → proxy Vite gère /media/
// En prod → VITE_MEDIA_BASE_URL=https://taftech.dz → URLs absolues
```
Ne plus jamais hardcoder `http://127.0.0.1:8000` dans les composants — utiliser `mediaUrl(path)`.

### utils/errorReporter.js — Télémétrie frontend
```js
import { reportError } from "../utils/errorReporter";
// Dans chaque catch block : reportError("CODE_ERREUR", error)
```
Tous les catch blocks dans tous les fichiers frontend ont `reportError()`.

### Réponses API paginées Django
```js
// Toujours gérer les deux formats
return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
```

### details_matching — deux structures possibles
```js
// Toujours utiliser :
const scores = DM.scores || DM;
```

### Structure Pages/
```
Pages/
├── Admin/
├── Candidat/
│   ├── ProfilCandidat/ (index.jsx + useProfilCandidat.js + Modals.jsx)
│   ├── MesCandidatures.jsx, BoiteReception.jsx, OffresSauvegardees.jsx
│   ├── AlertesEmploi.jsx, SuggestionsCarriere.jsx, Settings.jsx
├── Recruteur/
│   ├── GestionOffre/ (index.jsx + useGestionOffre.js + DetailCandidature.jsx + Modals.jsx)
│   ├── DashboardRecruteur.jsx, CreateJob.jsx, CVTheque.jsx
│   ├── CandidaturesSpontanees.jsx, ParametresRecruteur.jsx
│   ├── Questionnaires.jsx, ReviewCandidature.jsx, EntreprisePublic.jsx
├── Public/
│   ├── Home.jsx, JobsList.jsx, JobDetail.jsx
│   ├── OffresParRegion.jsx, OffresParSecteur.jsx
└── Auth/
    ├── Login.jsx, ForgotPassword.jsx, ResetPassword.jsx
    ├── RegisterCandidat.jsx, RegisterRecruteur.jsx
```

---

## ✅ FEATURES COMPLÈTES

### 🔐 Authentification
- Inscription candidat/recruteur, login JWT, déconnexion, mot de passe oublié, vérification email
- Rôles : CANDIDAT / RECRUTEUR / ADMIN
- Changer MDP disponible dans Settings (candidat) ET ParametresRecruteur (onglet Mon profil) — adapté compte Google
- Verrouillage compte (5 échecs → verrou 15 min)
- `GuestRoute` : redirige les utilisateurs déjà connectés hors des pages login/inscription (ADMIN → /admin-taftech, RECRUTEUR/membre → /dashboard, CANDIDAT → /profil)

### 💼 Offres & Candidatures
- CRUD offres recruteur, modération admin (APPROUVEE / EN_ATTENTE / REJETEE)
- Candidature TafTech (profil + snapshot + score IA) et candidature rapide (sans compte)
- Statuts : RECUE / EN_COURS / ENTRETIEN / RETENU / REFUSE
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
- Score 0-100% : Spécialité (0-25) + Diplôme (0-20) + Expérience (0-20) + Région (0-20) + Compétences (0-15)
- Radar SVG 5 critères (candidat + recruteur), comparateur 2 candidats
- Groq séparé du scoring — classique uniquement
- **Algo rewrite** : `matcher.py` entièrement réécrit — `_CODES_PROCHES` inter-secteurs, `_experience_pertinente()` vérifie `exp.secteur` (code SECTEURS_CHOICES), fuzzy 0.60, mots communs ≥5 lettres, synonymes. Déduplication périodes chevauchantes (`_deduire_annees_sans_chevauchement`). Score neutre 5/15 si compétences vides. Fallback `niveau_experience` 14/20.
- **`ExperienceCandidat.secteur`** : champ ajouté (CharField choices SECTEURS_CHOICES, nullable) — migration 0046. Affiché dans ProfilCandidat, ReviewCandidature, DetailCandidature. `normalizeExp()` convertit `""` → `null` avant API.
- **Référentiel MetierReferentiel** : 13 402 titres (11 065 ROME + ~2 337 Emploitic). Scraper Playwright via subprocess. Nettoyage format slash ROME. Secteurs corrigés (3 617 entrées).
- **Autocomplete titre_poste expériences** : même UX que titre profil — suggestions depuis MetierReferentiel via `handleExpTitreChange`.
- **Recherche référentiel par mots** : `MetierReferentielAPIView` utilise Q() par mot individuel → "ingenieur informatique" trouve "Ingénieur en informatique".

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

### ⭐ Système Premium (US11/12)
- `DemandeActivationPremium` : traçabilité complète des demandes (moyen, nb_mois, est_traitee, date_traitement)
- `ProfilEntreprise.est_premium_actif` : property qui vérifie `est_premium` + `premium_expire_at > now()`
- `premium_expire_at` + `premium_nb_mois` sur `ProfilEntreprise`
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

## 🏗️ MODÈLES DJANGO

### accounts/
- `CustomUser` (email, telephone, role, code_verification, code_verification_created_at, failed_login_attempts, locked_until, date_naissance, **est_compte_google** BooleanField default=False)
- `SystemErrorLog` (user, message, stack_trace, url, timestamp)

### jobs/
- `ProfilCandidat` (titre, cv_pdf, photo, bio, linkedin, github, wilaya, commune, diplome, specialite, competences, langues, mobilite, situation_actuelle, salaire_souhaite, secteur_souhaite, service_militaire, permis, passeport, niveau_experience, notif_mise_a_jour)
- `ExperienceCandidat` (**secteur** CharField choices SECTEURS_CHOICES nullable — migration 0046), `FormationCandidat`
- `ProfilEntreprise` (nom_entreprise, **slug** auto-généré depuis nom_entreprise, registre_commerce, secteur, wilaya, commune, description, taille, logo, est_approuvee, email_refus_auto, message_refus_auto, **est_premium**, **premium_expire_at**, property `est_premium_actif`)
- `OffreEmploi` (entreprise, titre, wilaya, commune, specialite, diplome, experience_requise, type_contrat, description, missions, profil_recherche, salaire_propose, **date_expiration** (DateField nullable), est_active, est_cloturee, statut_moderation, motif_rejet, questionnaire)
- `Candidature` (offre, candidat, statut, score_matching, details_matching, profil_snapshot, est_rapide, date_entretien, note_technique/communication/motivation/experience, note_globale, commentaire_evaluation)
- `CandidatureSpontanee`, `Notification`, `MetierReferentiel`, `Questionnaire`, `QuestionQuestionnaire`, `ReponseChoix`, `ReponseCandidat`, `ProfilCandidatFavori`
- **`DemandeActivationPremium`** (entreprise FK, moyen_paiement, nb_mois, est_traitee, date_demande, date_traitement) — migration 0040/0041
- **`EquipeActionLog`** (entreprise FK, membre FK User nullable, action CharField, detail, date auto) — migration 0043. Actions : CONNEXION, CREER_OFFRE, MODIFIER_OFFRE, CLOTURER_OFFRE, STATUT_CANDIDATURE, EVALUER_CANDIDATURE, INVITER_MEMBRE, RETIRER_MEMBRE, CHANGER_ROLE, AUTRE

---

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
| Webhook nb_mois cap | ✅ | `max(1, min(nb_mois, 12))` — évite activation 999 mois |
| CVTheque API-level | ✅ | 403 si non-premium — pas seulement masquage UI |
| ErrorReport throttle | ✅ | `CypressAwareThrottle` — évite flood DB |
| Logging backend | ✅ | `print()` remplacés par `logger = logging.getLogger(__name__)` |
| reportError frontend | ✅ | Tous les catch blocks ont `reportError()` |

**Ne jamais committer `.env`.** Regénérer `SECRET_KEY` avant la prod.

---

## ⚠️ POINTS D'ATTENTION CRITIQUES

- PostgreSQL sur port **5433** (pas 5432)
- SOMIZ tourne aussi sur port 8000 — vérifier le bon backend
- `details_matching` a 2 structures selon ancienneté candidature :
  - Ancienne : `{region, diplome...}` directement
  - Nouvelle : `{scores:{...}, highlights:{...}, explications:{...}}`
  - → toujours utiliser `DM.scores || DM`
- `CandidatInfoDTO` et `profil_snapshot` incluent bio/linkedin/github
- `difflib` — stdlib Python, pas d'installation requise
- `ajuster_score_avec_groq` — supprimé, ne plus utiliser

---

## 🔧 DÉCISIONS TECHNIQUES

| Sujet | Décision | Raison |
|-------|----------|--------|
| Matching | Algorithme classique (difflib + synonymes) | Groq trop lent/coûteux à chaque postulation |
| Groq | Uniquement à la demande | Analyse recruteur + suggestions carrière |
| Snapshot | Figé à la postulation | Historique fidèle même si profil change |
| Suggestions | Seed = hash(user_id + spécialité) | Stable mais change si profil change |
| Bulletin PDF | Score si >= 60% seulement | Pas de mauvais score sur document officiel |
| PostgreSQL | Port 5433 | Conflit avec port 5432 (SOMIZ) |
| views/ | Package avec __init__ façade | urls.py inchangé, découpage lisible |
| serializers/ | Package avec __init__ façade | Imports inchangés dans les vues |
| constants.py | Fichier centralisé | Plus de duplication entre models/matcher/cv_parser |
| jobsService.js | Façade + 4 sous-services | Zéro changement dans les composants |
| Premium paiement | Manuel CIB/EDAHABIA + email | Pas de Chargily Pay pour l'instant |
| Premium durée | nb_mois × 2000 DA (remises 6M/12M) | Remises 8%/17% intégrées |
| Premium renouvellement | Étend depuis expiry actuelle si premium actif | Pas de perte de jours restants |
| Swagger DEFAULT_SCHEMA_CLASS | Injecté dans `REST_FRAMEWORK` dict **après** sa définition (bloc try/except déplacé sous REST_FRAMEWORK) | `NameError` si injecté avant — settings.py est exécuté de haut en bas |
| Slug migration PostgreSQL | Utiliser `AddField` (sans unique) + `RunPython` (populate) + `RunSQL ALTER TABLE ADD CONSTRAINT` | `AlterField` avec `unique=True` recrée l'index `_like` déjà créé par `AddField` → `DuplicateTable` |
| QR code URL | `window.location.origin` (dynamique) | Pas hardcodé — s'adapte dev/prod automatiquement |
| Navbar texte | `text-slate-900` sur les liens de navigation | Plus lisible, contraste WCAG |
| Vérification email persistence | sessionStorage (pas localStorage) — localStorage causait bug déconnexion admin | Clé auto-effacée à la fermeture navigateur, login redirect couvre le cas "revient le lendemain" |
| GenererOffreIA Groq | Appel direct sans `_appel_groq()` | `_appel_groq` strip les `**`/`*` ce qui corrompt le JSON retourné |
| Notification offre admin | Champ `destinataire` (pas `user`) + `titre` obligatoire | Modèle Notification a `destinataire` FK et titre requis |
| date_expiration PATCH APPROUVEE | Autorisé si seul ce champ dans payload | Ne remet pas l'offre EN_ATTENTE pour un simple changement de date |
| photo_profil snapshot | `.url` (pas `str()`) | `str()` retourne `photos/xxx.jpg` sans `/media/` — `.url` retourne le chemin complet |
| ExperienceCandidat.secteur | CharField choices nullable | `normalizeExp()` convertit `""` → `null` avant PUT — Django rejette string vide sur choices field |
| Matcher expérience pertinente | Vérifie `isinstance(secteur_exp, str)` avant usage | Mock retourne Mock object au lieu de None si pas vérifié |
| Parser CV — mode Remplacer/Ajouter | Modal parser CV propose un choix radio `parserMode` ("remplacer" par défaut / "ajouter"). Remplacer : écrase champs simples/photo/compétences/langues + supprime exp/formations existantes avant d'ajouter celles du CV. Ajouter : ne remplit que les champs vides, cumule compétences/langues sans doublon, ajoute exp/formations sans supprimer | Reparser un CV mis à jour créait des doublons d'expériences/formations en mode ajout systématique — l'utilisateur doit pouvoir choisir selon le cas (CV mis à jour vs profil à compléter) |
| Email approbation offre | `AdminOffreModerateAPIView.patch` envoie un email au recruteur (`entreprise.user.email`) uniquement quand `statut_moderation` passe à `APPROUVEE` (transition, pas à chaque save) — template `emails/offre_approuvee.html` | Le recruteur doit être informé automatiquement quand son offre devient visible, sans spammer à chaque modération |
| Email approbation entreprise | `AdminEntrepriseModerateAPIView.patch` envoie un email (`_envoyer_email_entreprise_approuvee`) uniquement sur transition `est_approuvee` False→True (comparé à `etait_approuvee` capturé avant `serializer.save()`) — template `emails/entreprise_approuvee.html`, même mécanisme que l'email offre | Même logique que l'offre : notifier une seule fois, pas à chaque modification du profil entreprise |
| Messages d'erreur backend affichés | `CreateJob.jsx` et `useGestionOffre.js` (helper `apiErrMsg()`) affichent `error.response?.data?.error` au lieu d'un toast générique | Le backend renvoie déjà des causes précises (entreprise non validée, rôle INVITE bloqué, premium expiré) mais le frontend les avalait avec des messages génériques — confus pour le recruteur |
| Swagger UI restylé | Template overridé `jobs/templates/drf_spectacular/swagger_ui.html` (trouvé avant celui de drf_spectacular car `jobs` précède l'app dans `INSTALLED_APPS`) — bandeau indigo TafTech, bordures colorées par méthode HTTP, police Inter/JetBrains Mono, blocs de code fond sombre, `SWAGGER_UI_SETTINGS` (filtre, persistAuthorization) | Habillage CSS de Swagger par défaut, jugé insuffisant par l'utilisateur — pas une refonte complète type Stripe/Postman ; à revoir si redemandé |
| Scraper Emploitic | Subprocess séparé + JSON tmp file | Playwright sync_playwright sur Windows bloque le greenlet à la fermeture — subprocess évite le hang |
| Référentiel recherche | Q() par mot individuel | `icontains` substring exact ne trouve pas "Ingénieur en informatique" avec "ingenieur informatique" |
| Playwright Windows | `python -m playwright install chromium` dans backend_env | Binaire chromium lié à l'env Python — installer dans le bon venv |
| CVThèque matching | Indexer `scores_map` par `user_id` (pas `profil.pk`) | `ProfilCandidatDTO` expose `user_id` pas `id` — sinon `score_offre` absent de la réponse |
| CVThèque offres dropdown | Filtrer `APPROUVEE + est_active + !est_cloturee` | Pas afficher les offres en attente ou rejetées dans le comparateur |
| InfoBanner dismiss | localStorage `banner_${storageKey}` | sessionStorage se réinitialise à chaque onglet — localStorage = 1 seule dismissal |
| Changer MDP recruteur | Dans ParametresRecruteur onglet "Mon profil" | Même logique que Settings candidat — adapté compte Google |
| scrollIntoView en test | `?.scrollIntoView?.()` (double optional chain) | jsdom définit l'élément mais pas la méthode scrollIntoView — simple `?.` ne protège pas contre méthode absente |
| Suppression inline confirm | Questionnaires + CandidaturesSpontanees : clic corbeille → inline Confirmer/Annuler, pas window.confirm | Pattern UX inline — les tests doivent cliquer 2 fois : corbeille puis "Confirmer" |
| navigator.clipboard jsdom | Mock dans CandidaturesSpontanees.test.jsx : `Object.assign(navigator, { clipboard: { writeText: vi.fn() } })` | jsdom ne définit pas clipboard API |
| N+1 queries | select_related/prefetch_related sur Dashboard, CVTheque, MesCandidatures | Dashboard 50 offres : 101 requêtes → 3 avec prefetch |
| Cache constants | `cache.get/set('jobs_constants', timeout=3600)` dans ConstantsAPIView | Wilayas/secteurs/diplômes statiques — pas de hit DB après 1ère requête |
| Mobile grids | Toutes les pages corrigées avec `grid-cols-1 sm:grid-cols-2` | Jamais commencer un grid directement à grid-cols-2+ sans breakpoint mobile — déjà appliqué partout |
| Invitation membre Google | Envoie lien invitation (pas ajout direct) | Compte Google sans mot de passe → ne peut pas se connecter sans définir un mot de passe d'abord |
| Rôle membre équipe Google | Ne pas changer le rôle à l'acceptation | Membre peut rester CANDIDAT — `est_membre_equipe` dans le serializer autorise le login recruteur |
| mediaUrl normalization | Ajoute `/media/` si absent du chemin | Snapshots anciens stockés sans `/media/` prefix |
| JobDetail redesign | Bandeau entreprise + grille infos + 2 colonnes | Plus lisible, style Emploitic/LinkedIn |
| Cypress version | Downgrade 15 → 13.17.0 | Cypress 15 binaire cassé sur Windows 10 (`--smoke-test` option non reconnue) |
| Cypress login recruteur | `cy.login("recruteur")` visite `/recruteurs/connexion` (placeholder `votre@entreprise.com`) | Portail séparé — login candidat via `/login` retourne 403 pour rôle RECRUTEUR |
| Cypress ECONNREFUSED GUI | `host: true` dans vite.config.js server | Windows résout `localhost` en IPv6 mais Vite écoutait IPv4 seulement |
| Cypress mock questionnaire | Utiliser `requis: true` (pas `obligatoire: true`) dans les mocks | Le composant JobDetail.jsx vérifie `q.requis`, pas `q.obligatoire` |
| Cypress intercept jobDetail | Regex `/\/api\/jobs\/\d+\/$/` au lieu de `**/jobs/*/` | Le glob matchait aussi `/api/jobs/recommandations/` — race condition sur `cy.wait("@jobDetail")` |
| AdminSystemLogs pagination | Pagination manuelle 50/page dans la vue (pas PageNumberPagination DRF) | Vue APIView simple, pas un ListAPIView — pagination injectée directement dans le GET |
| Parser CV — matching mots-clés | Tous les extracteurs de cv_parser.py + matcher.py (`competences_score`, `_experience_pertinente`) utilisent `re.search(r'\bKW\b', ...)` au lieu de `KW in texte` | Bug réel détecté sur un CV : le mot-clé `'ia'` (IT) matchait en sous-chaîne dans "Algeria/social/industrial", et `'ts'` (diplôme TS) matchait dans "tests/students" → mauvaise spécialité/diplôme détectés sans lien avec le contenu réel |
| SPECIALITES_MAPPING / DIPLOMES_MAPPING / SYNONYMES_SPECIALITE | Couverture FR + EN + AR sur toutes les catégories | CV testés en anglais (mots RH absents à l'origine) et marché algérien → CV parfois en arabe |
| _experience_pertinente synonymes | Comparé contre la description normalisée en texte (`\b` regex) au lieu d'un `set` de mots exacts | Les synonymes multi-mots ("ressources humaines", "génie civil") ne matchaient jamais un set de mots simples — faux négatif silencieux corrigé |
| DIPLOMES_MAPPING master générique | Ajout mot-clé `'master'`/`"master's degree"` dans MASTER_2 | "Master's Degree in..." ne matchait aucun mot-clé (seuls "master 1/2" existaient) → diplôme retombait sur LICENCE via "Bachelor's Degree" détecté plus loin |
| FormationCandidat.date_debut / etablissement | Rendus nullable/blank (migrations 0048, 0049) | CV n'indiquant qu'une année d'obtention (pas de date de début) ou un diplôme/certif sans établissement précisé — le POST formation échouait en 400 silencieux, formations "détectées mais non ajoutées" |
| ProfilCandidatAPIView.put() | Troncature auto des champs User trop longs + `remove_photo_profil` flag pour vider explicitement un FileField | Le parser CV peut extraire 2 numéros de téléphone concaténés (`0552.../0770...`) dépassant `User.telephone` (max 15) → 500 non catché ; un FileField ne peut pas être vidé avec une chaîne vide en multipart |
| Remplissage profil via parser CV — mode Remplacer | Sémantique de remplacement total : chaque champ (nom, tel, titre, wilaya, diplôme, spécialité, bio, réseaux, permis/passeport/véhicule, compétences, langues, expériences, formations, photo) est explicitement vidé s'il est absent du nouveau CV, pas seulement écrasé s'il est présent | L'utilisateur veut un vrai "remplacer" (delete-then-fill), pas un merge partiel — cas concret : nom jamais câblé du tout (nom_complet détecté mais jamais envoyé au PUT) |
| Remplissage profil — perf & anti double-clic | Suppressions/ajouts expériences+formations parallélisés (`Promise.allSettled` au lieu de `for...of` séquentiel) + état `remplissageLoading` désactivant le bouton "Valider et remplir" | Jusqu'à 22 requêtes HTTP séquentielles pour un CV avec 6 exp + 5 formations = lenteur perçue → double-clic → remplissage en double |
| extract_photo_from_docx | Nouvelle fonction (parcourt `doc.part.rels`, garde la plus grosse image, ignore les rels externes) | Seuls les PDF extrayaient une photo (`fitz`) ; les CV Word n'en extrayaient jamais |
| Description expériences/formations parser CV | `\n`-joined avec préfixe `"- "` (regex ET prompt Groq) au lieu de `" ".join()` qui aplatissait tout en un paragraphe | Le candidat veut retrouver la structure à puces d'origine du CV — `whitespace-pre-line` déjà présent côté frontend, seul le texte généré manquait de structure |
| Premium expiré membres | Blocage login (403) + blocage dashboard API | PROPRIETAIRE bypasse les deux couches |
| INVITE accès | Masquage UI des boutons d'action, pas blocage route | Candidatures en lecture seule autorisées |
| GuestRoute | Redirect si déjà connecté depuis login/register | Évite double session ou confusion de rôle |
| EquipeActionLog | Nouveau modèle migration 0043 | Traçabilité complète équipe recruteur |
| authService.peutFaire() | ORDRE = ["INVITE","UTILISATEUR","ADMIN","PROPRIETAIRE"] | Bug : ADMIN absent → indexOf=-1 → INVITE passait ADMIN check |
| Logout redirect | Role-aware (RECRUTEUR → /recruteurs/connexion) | Lire role AVANT clearStorage |
| mediaUrl centralisé | `src/utils/mediaUrl.js` — `VITE_MEDIA_BASE_URL` env | 127.0.0.1 hardcodé = cassé en prod/ngrok |
| Accès membres équipe API | `get_entreprise_for_user()` + `get_membre_role()` dans offres/candidatures | INVITE bloqué en écriture, UTILISATEUR+ autorisé |
| Backend logging | `logger = logging.getLogger(__name__)` dans chaque view | Remplace print() — prod-ready |
| Déploiement | Serveur algérien .dz | Conformité ANPDP + latence |
| ngrok tests | Proxy Vite + 1 seul tunnel | Compte gratuit ngrok = 1 tunnel max. Vite proxy redirige /api vers Django côté serveur |

---

## 🌿 WORKFLOW GIT

- Branch principale : `main`
- Feature branches : `feature/us{N}`
- Commits sur la feature, jamais directement sur main
- Merge vers main : **seulement sur permission explicite**
- Format commit : `type: description` (feat, fix, style, refactor, test, docs)

---

## ✅ ÉTAT TESTS (dernière vérification — MAJ tests coverage + corrections)

- Backend : 282/282 ✅ (dont 8 tests ChangerMotDePasseAPIView + 4 tests CVThequeView offre_id nouveaux)
- Frontend Vitest : 338/338 ✅
  - Nouveaux tests : InfoBanner (8) + Tooltip (10) + ParametresRecruteur MDP (5) + CVTheque matching (3)
  - Corrigés : Settings, RegisterRecruteur, Home, JobDetail, MesCandidatures, Navbar, CreateJob, CandidaturesSpontanees, EntreprisePublic, Questionnaires, ParametresRecruteur HP3/HP7/EC3, GestionOffre (dropdown statut), ResetPassword, DashboardRecruteur
- Cypress E2E : 7 fichiers — tous stables ✅
- Vite build : propre ✅ (1928 modules)

---

## 🔲 TÂCHES REPORTÉES (ne pas faire sans demande)
- Sentry error tracking
- Remplacer Groq par Ollama local (après déploiement)
- RAG avec pgvector (roadmap 3-6 mois)

---

## 🚀 DÉPLOIEMENT

Serveur algérien `.dz` — conformité ANPDP.

Variables `.env` requises en prod :
```env
SECRET_KEY=<nouvelle clé générée>
DEBUG=False
ALLOWED_HOSTS=taftech.dz,www.taftech.dz
DB_NAME=taftech_db
DB_USER=<user postgres>
DB_PASSWORD=<mot de passe>
DB_HOST=127.0.0.1
DB_PORT=5432
EMAIL_HOST_USER=taftech963@gmail.com
EMAIL_HOST_PASSWORD=<app password Gmail>
GROQ_API_KEY=<clé Groq>
CORS_ALLOWED_ORIGINS=https://taftech.dz,https://www.taftech.dz
SITE_URL=https://taftech.dz
VITE_MEDIA_BASE_URL=https://taftech.dz
```

Crontab :
```bash
# Alertes emploi — tous les jours à 8h
0 8 * * * cd /chemin/vers/taftech_backend && python manage.py envoyer_alertes >> /var/log/taftech_alertes.log 2>&1

# Relance CV inactifs — le 1er de chaque mois à 9h
0 9 1 * * cd /chemin/vers/taftech_backend && python manage.py relance_maj_cv >> /var/log/taftech_relance.log 2>&1

# Archivage auto offres expirées — tous les jours à 00h30
30 0 * * * cd /chemin/vers/taftech_backend && python manage.py archiver_offres_expirees >> /var/log/taftech_archivage.log 2>&1
```

Checklist avant déploiement :
- [ ] `settings.py` : DEBUG=False, SECRET_KEY env, DATABASE_URL env
- [ ] `ALLOWED_HOSTS` avec vrai domaine .dz
- [ ] `CORS_ALLOWED_ORIGINS` avec vrai domaine frontend
- [ ] `.env` frontend : `VITE_MEDIA_BASE_URL=https://taftech.dz`
- [ ] Whitenoise pour fichiers statiques
- [ ] `requirements.txt` à jour
- [ ] `python manage.py migrate && python manage.py collectstatic`
- [ ] **Sécurisation fichiers média (CV/photos/logos)** : en DEBUG=False, `taftech_backend/urls.py` ne sert plus `/media/` du tout (bloc `static()` gardé par `if settings.DEBUG`) — il faut un serving explicite en prod (nginx `alias` ou équivalent). Les fichiers gardent leur nom original (`upload_to='cvs/'` sans fonction de nommage, ex. `CV_Ahmed_Benali.pdf`) donc plus devinable qu'un UUID. Avant d'exposer `/media/` publiquement, décider : (a) accepter le risque (fichiers non listables, mais devinables si le nom réel est connu), ou (b) passer par une vue Django authentifiée qui vérifie la propriété/l'accès avant de streamer le fichier, ou (c) URLs signées à expiration (nginx `secure_link` / S3 presigned URLs)

---

## 🤖 ROADMAP RAG — IA LOCALE (POST-DÉPLOIEMENT)

| Étape | Timing | Action |
|-------|--------|--------|
| 1 | Après déploiement | Installer Ollama + mistral 7B, remplacer Groq |
| 2 | 1 mois | Ajouter pgvector, vectoriser offres + profils |
| 3 | 3 mois | Construire retriever, injecter contexte dans prompts |
| 4 | 6 mois | Affiner prompts avec données réelles TafTech |

La valeur de TafTech n'est pas le LLM — ce sont les données. Fine-tuning écarté (GPU A100/H100 requis), RAG retenu.

---

## 💻 COMMANDES UTILES

```bash
# Backend
cd C:\Users\filali\Desktop\Taftech\taftech_backend
python manage.py runserver

# Frontend
cd C:\Users\filali\Desktop\Taftech\taftech_frontend
npm run dev

# Build Vite (vérification avant commit)
npx vite build

# Tests backend
python manage.py test jobs.tests

# Tests frontend
npm test -- --run

# Cypress
npx cypress open

# PostgreSQL port 5433

# ── NGROK (partage pour tests externes) ──────────────────────────────────────
# ngrok est installé dans : C:\Users\filali\Downloads\ngrok-v3-stable-windows-amd64\ngrok.exe
# (ajouté au PATH utilisateur — ouvrir un nouveau terminal si non reconnu)
#
# Procédure complète (3 terminaux) :
#   Terminal 1 : python manage.py runserver          (backend Django port 8000)
#   Terminal 2 : npm run dev                         (frontend Vite port 5173)
#   Terminal 3 : ngrok http 5173                     (tunnel public → port 5173)
#
# → Envoyer l'URL ngrok affichée (https://xxx.ngrok-free.app) aux testeurs
#
# Fonctionnement : Vite proxy intercepte /api et /media et les redirige vers
# localhost:8000 côté serveur — les testeurs n'ont besoin que d'une seule URL.
#
# Rien à changer dans .env ni settings.py — tout est déjà configuré :
#   - vite.config.js : proxy /api + /media → 127.0.0.1:8000, allowedHosts: true
#   - axiosConfig.js : VITE_API_URL vide → URLs relatives → proxy Vite
#   - settings.py    : ALLOWED_HOSTS += ['.ngrok-free.app'] si DEBUG=True
# ─────────────────────────────────────────────────────────────────────────────
```

---

## 📧 CONFIG

- Email TafTech : taftech963@gmail.com
- Localisation : Oran, Algérie
