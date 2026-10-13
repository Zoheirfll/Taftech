# Design system et migration theme.js

> Couleurs, composants, densité, tokens tw.*, état de la migration. Index : [../README.md](../README.md)

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

