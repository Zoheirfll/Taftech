# CLAUDE.md — Mémoire Projet TafTech

> **Lire ce fichier en entier avant toute action dans ce projet.**

_Dernière mise à jour : 12/06/2026 — US10 visual consistency + responsive mobile_

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

1. **Ne jamais merger vers `main` sans permission explicite** de l'utilisateur
2. **Ne jamais committer `.env`** — il est dans `.gitignore` et doit y rester
3. **Rester sur la feature branch courante** — ne pas changer de branche seul
4. **Ne pas prendre d'initiatives non demandées** — faire seulement ce qui est demandé
5. **Demander confirmation avant toute action destructive** (reset, force push, suppression fichiers)
6. **Ne jamais résoudre Cypress** sans demande explicite — les tests E2E sont déprioritisés
7. Toujours vérifier que le build Vite passe (`npx vite build`) avant de déclarer une tâche terminée

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
- **Tests Backend**: Django TestCase + APIClient — 186/186 ✅
- **Tests Frontend**: Vitest + @testing-library/react — 270/270 ✅
- **Tests E2E**: Cypress — 7 fichiers (1/2/3 stables, 4/5 instables — déprioritisés)
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

---

## 🏗️ ARCHITECTURE BACKEND

### jobs/views/ (package — ancien views.py)
- `notifications.py` — NotificationListAPIView, MarkNotificationReadAPIView, PublicStatsAPIView, EntrepriseDetailAPIView
- `offres.py` — JobListAPIView, JobDetailAPIView, JobCreateAPIView, UpdateOffreRecruteurAPIView, CloturerOffreAPIView, ConstantsAPIView
- `profils.py` — ProfilCandidatAPIView, ExperienceAPIView, FormationAPIView, alertes, favoris, paramètres
- `candidatures.py` — PostulerAPIView, PostulerRapideAPIView, MesCandidaturesAPIView, UpdateCandidatureStatusAPIView, DeleteCandidatureAPIView, EvaluerCandidatureAPIView, Top5CandidatsAPIView
- `recruteur.py` — DashboardRecruteurAPIView, CVThequeView, questionnaires, spontanées, paramètres
- `admin.py` — AdminPagination + toutes vues admin + exports CSV
- `ia.py` — OffresRecommandeesAPIView, ParserCVAPIView, MetierReferentiel, SuggestionsCarriereAPIView, AnalyseCarriereGroqAPIView, AnalyseGroqRecruteurAPIView. Helper `_appel_groq()` mutualisé.
- `bulletin.py` — GenererBulletinPDFAPIView

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
- `views.py` — rate limiting (`AnonRateThrottle`), hack Cypress isolé (`if settings.DEBUG`), expiry code reset (10 min)
- `models.py` — CustomUser + champ `code_verification_created_at`

### jobs/management/commands/
- `envoyer_alertes.py` — alertes emploi par email + notification. Option `--dry-run`.
- `relance_maj_cv.py` — relance candidats inactifs 60 jours. Option `--dry-run`.

---

## 🏗️ ARCHITECTURE FRONTEND

### Services/ — pattern façade
`jobsService.js` est une façade qui réexporte tout. Les composants importent toujours `{ jobsService }`.
Sous-services : `candidatService.js`, `adminService.js`, `recruteurService.js`, `iaService.js`

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
- Verrouillage compte (5 échecs → verrou 15 min)

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

### 🔍 Recherche & Dashboard
- Multicritères avec debounce 400ms, pagination, offres recommandées IA
- KPIs dashboard recruteur, Top 5 shortlist IA, archives, correction offre rejetée

### 📬 Notifications, Alertes, Admin
- Cloche navbar avec badge, boîte de réception, alertes emploi par email
- Panel admin : stats, journal d'audit (`AuditLog`), broadcast, données marché
- Référentiel ROME 11 090 métiers, suggestions carrière Groq

### 📝 Candidatures Spontanées
- Envoi sans compte, anti-doublon, vue recruteur filtrable, marquer lue / supprimer

---

## 🏗️ MODÈLES DJANGO

### accounts/
- `CustomUser` (email, telephone, role, code_verification, code_verification_created_at, failed_login_attempts, locked_until, date_naissance)
- `SystemErrorLog` (user, message, stack_trace, url, timestamp)

### jobs/
- `ProfilCandidat` (titre, cv_pdf, photo, bio, linkedin, github, wilaya, commune, diplome, specialite, competences, langues, mobilite, situation_actuelle, salaire_souhaite, secteur_souhaite, service_militaire, permis, passeport, niveau_experience, notif_mise_a_jour)
- `ExperienceCandidat`, `FormationCandidat`
- `ProfilEntreprise` (nom_entreprise, registre_commerce, secteur, wilaya, commune, description, taille, logo, est_approuvee, email_refus_auto, message_refus_auto)
- `OffreEmploi` (entreprise, titre, wilaya, commune, specialite, diplome, experience_requise, type_contrat, description, missions, profil_recherche, salaire_propose, est_active, est_cloturee, statut_moderation, motif_rejet, questionnaire)
- `Candidature` (offre, candidat, statut, score_matching, details_matching, profil_snapshot, est_rapide, date_entretien, note_technique/communication/motivation/experience, note_globale, commentaire_evaluation)
- `CandidatureSpontanee`, `Notification`, `MetierReferentiel`, `Questionnaire`, `QuestionQuestionnaire`, `ReponseChoix`, `ReponseCandidat`, `ProfilCandidatFavori`

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
| Déploiement | Serveur algérien .dz | Conformité ANPDP + latence |

---

## 🌿 WORKFLOW GIT

- Branch principale : `main`
- Feature branches : `feature/us{N}`
- Commits sur la feature, jamais directement sur main
- Merge vers main : **seulement sur permission explicite**
- Format commit : `type: description` (feat, fix, style, refactor, test, docs)

---

## ✅ ÉTAT TESTS (dernière vérification — US10)

- Backend : 186/186 ✅
- Frontend Vitest : 270/270 ✅
- Cypress E2E : 7 fichiers — tests 1/2/3 stables, 4/5 instables (déprioritisé)
- Vite build : propre ✅ (1918 modules)

---

## 🔲 TÂCHES REPORTÉES (ne pas faire sans demande)

- Corriger tests Cypress 4 et 5
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
```

Crontab :
```bash
# Alertes emploi — tous les jours à 8h
0 8 * * * cd /chemin/vers/taftech_backend && python manage.py envoyer_alertes >> /var/log/taftech_alertes.log 2>&1

# Relance CV inactifs — le 1er de chaque mois à 9h
0 9 1 * * cd /chemin/vers/taftech_backend && python manage.py relance_maj_cv >> /var/log/taftech_relance.log 2>&1
```

Checklist avant déploiement :
- [ ] `settings.py` : DEBUG=False, SECRET_KEY env, DATABASE_URL env
- [ ] `ALLOWED_HOSTS` avec vrai domaine .dz
- [ ] `CORS_ALLOWED_ORIGINS` avec vrai domaine frontend
- [ ] Whitenoise pour fichiers statiques
- [ ] `requirements.txt` à jour
- [ ] `python manage.py migrate && python manage.py collectstatic`

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
```

---

## 📧 CONFIG

- Email TafTech : taftech963@gmail.com
- Localisation : Oran, Algérie
