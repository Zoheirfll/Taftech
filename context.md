# CONTEXT.md — TafTech Project

_Dernière mise à jour : 12/06/2026 — US10 visual consistency + responsive mobile_

---

## 🧑‍💻 QUI

**FILALI Zoheir** — Fondateur TafTech

- Master 2 ADSI — Université Oran 1
- Cadre administratif SOMIZ (paie 4000 employés)
- Développeur Full-Stack React + Django + PostgreSQL
- Mentalité "architecture avant code"
- Passionné IA locale, automatisation métier, pensée systémique

---

## 📦 STACK

- **Frontend** : React 18 + Vite + Tailwind CSS + react-router-dom + react-hot-toast + react-select + lucide-react
- **Backend** : Django 5.2 + Django REST Framework
- **Base de données** : PostgreSQL (port 5433)
- **Auth** : JWT (SimpleJWT — access + refresh tokens)
- **IA Matching** : Algorithme classique amélioré (synonymes + difflib fuzzy matching) — PAS Groq
- **IA Analyse** : Groq API (llama-3.1-8b-instant) — gratuit 30 req/min — à la demande uniquement
- **PDF** : ReportLab (Platypus) + logo TafTech
- **Email** : Django send_mail (SMTP Gmail)
- **Tests Backend** : Django TestCase + APIClient — 186/186 passent ✅
- **Tests Frontend** : Vitest + @testing-library/react — 270/270 passent ✅
- **Tests E2E** : Cypress (7 fichiers — tests 1/2/3 stables, 4/5 partiellement instables)
- **GitHub** : https://github.com/Zoheirfll/Taftech (branch main)

---

## 🏗️ ARCHITECTURE BACKEND (refactorisée 06-08/06/2026)

### jobs/views/ (package)

Ancien `views.py` (~1800 lignes) → dossier `jobs/views/` avec `__init__.py` façade :

- `views/notifications.py` — NotificationListAPIView, MarkNotificationReadAPIView, PublicStatsAPIView, EntrepriseDetailAPIView
- `views/offres.py` — JobListAPIView, JobDetailAPIView, JobCreateAPIView, UpdateOffreRecruteurAPIView, CloturerOffreAPIView, ConstantsAPIView
- `views/profils.py` — ProfilCandidatAPIView, ExperienceAPIView, FormationAPIView, alertes, favoris, paramètres
- `views/candidatures.py` — PostulerAPIView, PostulerRapideAPIView, MesCandidaturesAPIView, UpdateCandidatureStatusAPIView, DeleteCandidatureAPIView, EvaluerCandidatureAPIView, Top5CandidatsAPIView
- `views/recruteur.py` — DashboardRecruteurAPIView, CVThequeView, questionnaires, spontanées, paramètres
- `views/admin.py` — AdminPagination + toutes vues admin + exports CSV
- `views/ia.py` — OffresRecommandeesAPIView, ParserCVAPIView, MetierReferentiel, SuggestionsCarriereAPIView, AnalyseCarriereGroqAPIView, AnalyseGroqRecruteurAPIView. Helper `_appel_groq()` mutualisé.
- `views/bulletin.py` — GenererBulletinPDFAPIView (ReportLab isolé)

### jobs/serializers/ (package)

Ancien `serializers.py` → dossier `jobs/serializers/` avec `__init__.py` façade :

- `serializers/questionnaires.py` — ReponseChoixSerializer, QuestionnaireSerializer, ReponseCandidatSerializer
- `serializers/offres.py` — EntrepriseSimpleSerializer, OffreEmploiSerializer, OffreEmploiCreateDTO, EntreprisePublicSerializer
- `serializers/profils.py` — ExperienceSerializer, FormationSerializer, ProfilCandidatDTO, AdminUserSerializer, ParametresNotificationsSerializer
- `serializers/candidatures.py` — CandidatInfoDTO (avec helper `_profil()`), PostulerDTO, CandidatureRecruteurDTO, MesCandidaturesDTO
- `serializers/divers.py` — OffreSauvegardeeSerializer, AlerteEmploiSerializer, NotificationSerializer, CandidatureSpontaneeSerializer, MetierReferentielSerializer
- `serializers/entreprise.py` — EntrepriseDashboardDetailSerializer
- `serializers/dashboard.py` — OffreDashboardDTO (séparé car dépend de CandidatureRecruteurDTO)

### jobs/constants.py (créé)

Centralise toutes les constantes métier (importées dans models.py, matcher.py, cv_parser.py) :

- WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
- WILAYAS_MAPPING, DIPLOMES_MAPPING, SPECIALITES_MAPPING, SYNONYMES_SPECIALITE

### jobs/urls.py (nettoyé)

Single grouped import block — toutes les vues importées en un seul bloc groupé par domaine.

### jobs/management/commands/

- `envoyer_alertes.py` — Scan les nouvelles offres + envoie email + notification interne aux candidats ayant des alertes actives. Option `--dry-run` pour tester sans envoyer. URL prod depuis `settings.SITE_URL`.
- `relance_maj_cv.py` — Relance par email les candidats inactifs depuis 60 jours (si `notif_mise_a_jour=True`). Option `--dry-run`. URL prod depuis `settings.SITE_URL`.

**Déclenchement** : `crontab` sur le serveur algérien (voir section Déploiement).

### US9 — Qualité & Tests (11/06/2026)

- **Logging structuré** : tous les `print()` remplacés par `logger = logging.getLogger(__name__)` dans `cv_parser.py`, `views/ia.py`, `views/candidatures.py`, `accounts/views.py`
- **Throttling Groq** : `GroqThrottle(UserRateThrottle, scope='groq')` — 20 req/heure sur les 3 vues IA
- **CypressAwareThrottle** : bypass throttle pour 127.0.0.1 en DEBUG — Cypress ne reçoit plus de 429
- **Endpoint cypress-cleanup** : `DELETE /accounts/cypress-cleanup/` (DEBUG only) — supprime cypress@test.dz avant chaque test
- **AuditLog** : nouveau modèle + `_audit()` helper — trace les actions admin (approuver/refuser offre/entreprise, supprimer user/offre)
- **Page admin Journal d'audit** : `AdminAuditLogs.jsx` avec pagination, accessible via `/admin-taftech/audit`
- **Pagination** : `AdminPagination` (audit logs) + `NotificationPagination` (notifications, 20/page)
- **Templates HTML emails** : tous les emails utilisent `EmailMultiAlternatives` + `render_to_string` — templates dans `jobs/templates/emails/` et `accounts/templates/emails/`
  - `entretien.html`, `refus.html`, `top_profil.html`, `alerte_emploi.html`, `relance_cv.html`, `broadcast.html`
  - `verification_code.html`, `reset_password.html`
- **Cypress E2E** : 7 fichiers de tests — `cypress/support/e2e.js` ignore les uncaught exceptions React, `commands.js` avec `cy.login()` et `cy.selectOption()`
- **Note code** : 8.3/10 (depuis 7.5)

### accounts/ (sécurisé 11/06/2026)

- `views.py` — secrets retirés, `print()` → `logger`, rate limiting (`AnonRateThrottle`), hack Cypress isolé (`if settings.DEBUG`), expiry réelle du code reset (10 min)
- `models.py` — champ `code_verification_created_at` ajouté (DateTimeField)
- Migration `0006_add_code_verification_created_at` appliquée

---

## 🏗️ ARCHITECTURE FRONTEND (refactorisée 06-08/06/2026)

### Structure Pages/

```
Pages/
├── Admin/           (AdminLayout, AdminUsers, AdminOffres, AdminEntreprises, AdminCandidatures, AdminStatistiques, AdminMetiers, AdminBroadcast)
├── Candidat/
│   ├── ProfilCandidat/
│   │   ├── index.jsx              (~150 lignes) — rendu principal
│   │   ├── useProfilCandidat.js   (~250 lignes) — tout le state + handlers
│   │   └── Modals.jsx             (~600 lignes) — toutes les modals
│   ├── MesCandidatures.jsx
│   ├── BoiteReception.jsx
│   ├── OffresSauvegardees.jsx
│   ├── AlertesEmploi.jsx
│   ├── SuggestionsCarriere.jsx
│   └── Settings.jsx
├── Recruteur/
│   ├── GestionOffre/
│   │   ├── index.jsx              — layout principal
│   │   ├── useGestionOffre.js     — tout le state + handlers
│   │   ├── DetailCandidature.jsx  — les 4 onglets candidat
│   │   └── Modals.jsx             — entretien + évaluation + comparateur
│   ├── DashboardRecruteur.jsx
│   ├── CreateJob.jsx
│   ├── CVTheque.jsx
│   ├── CandidaturesSpontanees.jsx
│   ├── ParametresRecruteur.jsx
│   ├── Questionnaires.jsx
│   ├── ReviewCandidature.jsx
│   └── EntreprisePublic.jsx
├── Public/
│   ├── Home.jsx
│   ├── JobsList.jsx
│   ├── JobDetail.jsx
│   ├── OffresParRegion.jsx
│   └── OffresParSecteur.jsx
└── Auth/
    ├── Login.jsx
    ├── ForgotPassword.jsx
    ├── ResetPassword.jsx
    ├── RegisterCandidat.jsx
    └── RegisterRecruteur.jsx
```

### Services/ (refactorisés)

Ancien `jobsService.js` (~726 lignes) → façade + 4 sous-services :

- `Services/candidatService.js` — profil, candidatures, sauvegardes, alertes, notifications, postuler, recommandations
- `Services/adminService.js` — offres admin, entreprises, users, candidatures, exports CSV, broadcast, marché, métiers
- `Services/recruteurService.js` — dashboard, offres CRUD, candidatures statut/éval/bulletin, profil entreprise, cvthèque, spontanées, questionnaires
- `Services/iaService.js` — parserCV, suggestionsCarriere, analyseCarriere, analyseGroqRecruteur, offresRecommandees, getMetiers
- `Services/jobsService.js` — façade avec `...spread` de tous les sous-services + offresPubliquesService (getAllJobs, getJobById, getConstants)

**Important** : toutes les pages continuent d'importer `{ jobsService }` — zéro changement dans les composants.

---

## ✅ FEATURES COMPLÈTES

### 🔐 Authentification (accounts/)

- Inscription candidat (email + code vérification)
- Inscription recruteur (entreprise + registre commerce)
- Login JWT (access + refresh)
- Déconnexion
- Mot de passe oublié (code 6 chiffres par email)
- Réinitialisation mot de passe
- Vérification email (code)
- Rôles : CANDIDAT / RECRUTEUR / ADMIN
- SystemErrorLog (logs erreurs frontend)
- CustomUser (telephone, role, code_verification, date_naissance)

### 💼 Offres d'emploi (jobs/)

- CRUD offres recruteur
- Modération admin (APPROUVEE / EN_ATTENTE / REJETEE + motif)
- Clôture offre
- Candidature TafTech (avec profil + snapshot + score IA)
- Candidature rapide (sans compte — nom/prénom/email/tel/CV)
- Lettre motivation texte ou fichier PDF
- Anti-doublon candidature
- Top 5 shortlist IA
- Statuts candidature : RECUE / EN_COURS / ENTRETIEN / RETENU / REFUSE
- Entretien programmé (date + heure + message + email automatique)
- Email recruteur si score >= 70%
- Email refus automatique configurable
- Évaluation post-entretien (4 critères /5 = note globale /20)
- Suppression candidature refusée
- Bulletin PDF professionnel (logo + score IA si >=60% + évaluation + signatures)
- Questionnaires (CRUD + liaison offre + réponses candidats)
- Types questions : COURT / LONG / NUMERIQUE / CHOIX_UNIQUE / CHOIX_MULTIPLE
- Questions requises + disqualifiantes

### 👤 Profil Candidat

- Titre professionnel (autocomplete ROME)
- Photo profil
- CV PDF upload
- Bio + LinkedIn + GitHub
- Wilaya + Commune
- Diplôme + Spécialité
- Compétences (tags)
- Langues (niveau)
- Expériences (CRUD avec dates + description)
- Formations (CRUD avec dates + description + spécialité)
- Préférences (secteur + salaire + mobilité + situation)
- Service militaire + permis + passeport
- Niveau expérience
- Score complétion profil
- Parser CV automatique (IA extrait données depuis PDF)
- Snapshot profil à la postulation (figé au moment de postuler)

### 🏢 Profil Entreprise

- Nom + registre commerce (verrouillés après validation)
- Logo
- Secteur + wilaya + commune siège
- Description + taille entreprise
- Validation admin (est_approuvee)
- Page publique vitrine (offres actives)
- Email refus auto + message personnalisable ({prenom}, {titre_offre}, {nom_entreprise})
- CVThèque (recherche candidats avec filtres + modal détail + favoris)

### 🤖 Matching IA

- Score 0-100% par critère :
  - Spécialité (0-25) — synonymes + fuzzy
  - Diplôme (0-20) — hiérarchie 13 niveaux
  - Expérience (0-20) — années + pertinence
  - Région (0-20) — wilaya + commune + mobilité
  - Compétences (0-15) — fuzzy matching difflib
- Points forts + écarts détectés
- Explications par critère
- Dictionnaire SYNONYMES_SPECIALITE dans constants.py
- Groq intentionnellement séparé du scoring — classique uniquement

### 🎨 Features IA Visuelles

- Radar matching candidat — SVG pur 5 critères dans MesCandidatures (toggle "Voir analyse IA")
- Radar matching recruteur — SVG pur dans GestionOffre onglet Analyse IA
- Points forts + écarts visibles candidat — depuis details_matching.highlights
- Barre de score colorée dans liste candidats GestionOffre
- Comparateur 2 candidats — scores, barres, explications, points forts, écarts
- Résumé IA Groq dans onglet Profil recruteur (à la demande)

### 🔍 Recherche & Découverte

- Recherche multicritères offres (mot-clé + wilaya + commune + diplôme + spécialité + expérience + contrat)
- Debounce 400ms
- Pagination
- Offres recommandées IA (carrousel candidat connecté)
- Offres par région (wilayas)
- Offres par secteur

### 📊 Dashboard Recruteur

- KPIs : total candidatures / nouvelles (RECUE) / pertinentes +80% / en traitement
- Liste verticale offres (titre + date + badges statut + stats candidatures)
- Barre colorée gauche selon statut modération
- Top IA score par offre
- Filtres : Toutes / Publiées / En validation / À corriger
- Archives (offres clôturées)
- Correction offre rejetée (resoumission)

### 📋 Gestion Candidature (GestionOffre)

- Split view : liste candidats (gauche) + détail (droite)
- Tri par score IA ou date de postulation
- Top 5 shortlist IA
- Onglets : Profil / Analyse IA / Évaluation / Questionnaire
- Profil depuis snapshot (figé) ou profil actuel (fallback)
- Bio + LinkedIn + GitHub dans profil
- Jauges matching par critère
- Points forts + écarts
- Analyse Groq approfondie à la demande (VERDICT / POINTS FORTS / RECOMMANDATION)
- Modale entretien (date + heure + message)
- Modale évaluation (4 critères RatingRow)
- Téléchargement bulletin PDF
- Suppression candidature refusée
- Candidatures spontanées (filtres wilaya/diplôme/spécialité/lue)

### 📬 Notifications & Messages

- Système notifications (cloche navbar avec badge)
- Boîte de réception candidat (messages recruteur)
- Alertes emploi (critères + fréquence)

### 🗃️ Référentiel Métiers ROME

- 11 090 métiers importés
- API publique (AllowAny) avec recherche multi-mots
- API admin paginée (20/page)
- CRUD admin + toggle actif/inactif

### 💡 Suggestions Carrière (candidat)

- Métiers ROME similaires (seed = hash(user_id + spécialité) — stable)
- Pagination 5/page
- Analyse Groq personnalisée (ÉVOLUTION POSSIBLE / COMPÉTENCES À ACQUÉRIR / CONSEIL PERSONNALISÉ)

### 📈 Admin

- Dashboard statistiques (vue d'ensemble + données marché)
- Données marché : salaires par secteur / top wilayas / top secteurs / matching moyen
- Gestion utilisateurs / offres / entreprises / candidatures / métiers ROME
- Broadcast message

### 📝 Candidatures Spontanées

- Envoi sans compte
- Anti-doublon (email + entreprise)
- Vue recruteur avec filtres
- Marquer lue / Supprimer

---

## 🏗️ MODÈLES DJANGO

### accounts/

- CustomUser (email, telephone, role, code_verification, code_verification_created_at, failed_login_attempts, locked_until, date_naissance)
- SystemErrorLog (user, message, stack_trace, url, timestamp)

### jobs/

- ProfilCandidat (titre, cv_pdf, photo, bio, linkedin, github, wilaya, commune, diplome, specialite, competences, langues, mobilite, situation_actuelle, salaire_souhaite, secteur_souhaite, service_militaire, permis, passeport, niveau_experience, notif_mise_a_jour)
- ExperienceCandidat (profil, titre_poste, entreprise, date_debut, date_fin, description)
- FormationCandidat (profil, diplome, etablissement, date_debut, date_fin, description)
- ProfilEntreprise (user, nom_entreprise, registre_commerce, secteur, wilaya, commune, description, taille, logo, est_approuvee, email_refus_auto, message_refus_auto)
- OffreEmploi (entreprise, titre, wilaya, commune, specialite, diplome, experience_requise, type_contrat, description, missions, profil_recherche, salaire_propose, est_active, est_cloturee, statut_moderation, motif_rejet, questionnaire)
- Candidature (offre, candidat, statut, lettre_motivation, lettre_motivation_file, score_matching, details_matching, profil_snapshot, est_rapide, nom/prenom/email/tel/cv_rapide, date_entretien, message_entretien, note_technique/communication/motivation/experience, note_globale, commentaire_evaluation)
- CandidatureSpontanee (entreprise, candidat, nom, prenom, email, telephone, wilaya, diplome, specialite, cv, lettre_motivation, lue)
- Notification (user, type_notif, message, lue, offre, candidature)
- MetierReferentiel (titre, secteur, niveau_experience, mots_cles, est_actif)
- Questionnaire (recruteur, titre, date_creation)
- QuestionQuestionnaire (questionnaire, texte, type_question, requis, disqualifiant, ordre)
- ReponseChoix (question, texte)
- ReponseCandidat (candidature, question, reponse)
- ProfilCandidatFavori (recruteur, candidat, date_ajout)

---

## 🎨 DESIGN SYSTEM

- **Couleur principale** : indigo-600 (#4f46e5)
- **Accent** : amber-500 (#f59e0b)
- **Texte** : slate-900 / slate-700 / slate-500 / slate-400
- **Backgrounds** : white / slate-50 / slate-100
- **Bordures** : slate-200
- **Success** : emerald-600
- **Danger** : red-600
- **Warning** : amber-600
- **Inputs** : `px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`
- **Bouton primaire** : `bg-indigo-600 text-white rounded-lg hover:bg-indigo-700`
- **Bouton annuler** : `bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200`
- **Modales** : `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50`
- **Cards** : `bg-white border border-slate-200 rounded-xl`

---

## 🔒 SÉCURITÉ (audit 11/06/2026)

| Mesure | Statut | Détail |
|--------|--------|--------|
| Secrets dans `.env` | ✅ | SECRET_KEY, DB, EMAIL, GROQ — plus rien hardcodé |
| DEBUG via env var | ✅ | `DEBUG=False` en prod automatiquement |
| ALLOWED_HOSTS via env var | ✅ | Plus de liste vide |
| JWT expiry configuré | ✅ | Access 15 min / Refresh 7 jours |
| JWT blacklist à la rotation | ✅ | `token_blacklist` activé |
| Rate limiting auth | ✅ | `AnonRateThrottle` sur tous les endpoints sensibles |
| Expiry code reset (10 min) | ✅ | `code_verification_created_at` vérifié à chaque reset |
| Code reset usage unique | ✅ | Effacé après usage ou expiry |
| Hack Cypress isolé | ✅ | `if settings.DEBUG` uniquement — inactif en prod |
| `print()` → `logger` | ✅ | Logging structuré, aucune donnée sensible en console |
| HTTPS/HSTS en prod | ✅ | Activé automatiquement si `DEBUG=False` |
| Cookies `Secure` en prod | ✅ | `AUTH_COOKIE_SECURE = not DEBUG` |
| `.env` dans `.gitignore` | ✅ | Déjà configuré |
| Logout révoque JWT | ✅ | `LogoutAPIView` blackliste refreshToken + efface cookies |
| Verrouillage compte | ✅ | 5 échecs → verrou 15 min (`failed_login_attempts`, `locked_until`) |
| Validation MIME fichiers | ✅ | Magic bytes PDF/DOCX/JPEG/PNG — `jobs/validators.py` |
| Limite taille fichiers | ✅ | CV/lettre 5 Mo, logo/photo 2 Mo |
| CSP headers | ✅ | `SecurityHeadersMiddleware` — report-only en dev, strict en prod |

**Important** : ne jamais committer `.env`. Regénérer la `SECRET_KEY` avant la mise en prod avec `django-admin startproject` ou `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`.

---

## 🔧 DÉCISIONS TECHNIQUES

| Sujet          | Décision                                                | Raison                                             |
| -------------- | ------------------------------------------------------- | -------------------------------------------------- |
| Matching       | Algorithme classique (difflib + synonymes)              | Groq trop lent/coûteux à chaque postulation        |
| Groq           | Uniquement à la demande                                 | Analyse recruteur + suggestions carrière           |
| Snapshot       | Figé à la postulation                                   | Historique fidèle même si profil change            |
| Suggestions    | Seed = hash(user_id + spécialité)                       | Stable mais change si profil change                |
| Bulletin PDF   | Score si >= 60% seulement                               | Pas de mauvais score sur document officiel         |
| Dashboard      | Liste verticale                                         | Plus lisible avec beaucoup d'offres                |
| Déploiement    | Serveur algérien .dz                                    | Conformité ANPDP + latence                         |
| PostgreSQL     | Port 5433                                               | Conflit avec port 5432 (autre projet)              |
| views/         | Package avec **init** façade                            | urls.py inchangé, découpage lisible                |
| serializers/   | Package avec **init** façade                            | Imports inchangés dans les vues                    |
| constants.py   | Fichier centralisé                                      | Plus de duplication entre models/matcher/cv_parser |
| jobsService.js | Façade + 4 sous-services                                | Zéro changement dans les composants                |
| Pages/         | Organisées par domaine (Auth/Public/Candidat/Recruteur) | Navigation claire, imports propres                 |

---

## 🚀 DÉPLOIEMENT SERVEUR ALGÉRIEN

### Variables `.env` à configurer en production

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
SITE_URL=https://taftech.dz          ← URL du frontend (utilisée dans les emails)
```

### Crontab à configurer sur le serveur

```bash
crontab -e
```

```bash
# Alertes emploi — tous les jours à 8h
0 8 * * * cd /chemin/vers/taftech_backend && python manage.py envoyer_alertes >> /var/log/taftech_alertes.log 2>&1

# Relance CV inactifs — le 1er de chaque mois à 9h
0 9 1 * * cd /chemin/vers/taftech_backend && python manage.py relance_maj_cv >> /var/log/taftech_relance.log 2>&1
```

### Tester avant de mettre en prod (sans envoyer d'emails)

```bash
python manage.py envoyer_alertes --dry-run
python manage.py relance_maj_cv --dry-run
```

### Migrations à appliquer au déploiement

```bash
python manage.py migrate
python manage.py collectstatic
```

---

## ⚠️ POINTS D'ATTENTION CRITIQUES

- `.env` dans `.gitignore` — GROQ_API_KEY ne doit JAMAIS être pushée
- PostgreSQL sur port **5433** (pas 5432)
- SOMIZ tourne aussi sur port 8000 — toujours vérifier le bon backend lancé
- `CandidatInfoDTO` inclut bio/linkedin/github
- `profil_snapshot` inclut bio/linkedin/github
- `MesCandidaturesDTO` retourne `score_matching` + `details_matching`
- `details_matching` a 2 structures possibles selon ancienneté candidature :
  - Ancienne : `{region, diplome...}` directement
  - Nouvelle : `{scores:{...}, highlights:{...}, explications:{...}}`
  - → toujours utiliser `DM.scores || DM` pour lire les scores
- `difflib` — pas besoin d'installation (stdlib Python)
- Ancien code avait `ajuster_score_avec_groq` — supprimé, ne plus utiliser

---

## 📁 STRUCTURE FICHIERS IMPORTANTS

```
taftech_backend/
├── accounts/
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   └── urls.py
├── jobs/
│   ├── constants.py          # ← NOUVEAU — toutes les constantes
│   ├── models.py             # importe depuis constants.py
│   ├── views/                # ← PACKAGE (ancien views.py)
│   │   ├── __init__.py       # façade — exporte tout
│   │   ├── notifications.py
│   │   ├── offres.py
│   │   ├── profils.py
│   │   ├── candidatures.py
│   │   ├── recruteur.py
│   │   ├── admin.py
│   │   ├── ia.py
│   │   └── bulletin.py
│   ├── serializers/          # ← PACKAGE (ancien serializers.py)
│   │   ├── __init__.py       # façade — exporte tout
│   │   ├── questionnaires.py
│   │   ├── offres.py
│   │   ├── profils.py
│   │   ├── candidatures.py
│   │   ├── divers.py
│   │   ├── entreprise.py
│   │   └── dashboard.py
│   ├── urls.py               # single import block
│   ├── matcher.py            # importe SYNONYMES_SPECIALITE depuis constants.py
│   ├── cv_parser.py          # importe WILAYAS/DIPLOMES/SPECIALITES depuis constants.py
│   ├── signals.py
│   ├── admin.py
│   └── tests/

taftech_frontend/
├── src/
│   ├── Pages/
│   │   ├── Admin/
│   │   ├── Candidat/
│   │   │   └── ProfilCandidat/
│   │   │       ├── index.jsx
│   │   │       ├── useProfilCandidat.js
│   │   │       └── Modals.jsx
│   │   ├── Recruteur/
│   │   │   └── GestionOffre/
│   │   │       ├── index.jsx
│   │   │       ├── useGestionOffre.js
│   │   │       ├── DetailCandidature.jsx
│   │   │       └── Modals.jsx
│   │   ├── Public/
│   │   └── Auth/
│   ├── Services/
│   │   ├── jobsService.js    # façade — importe et réexporte tout
│   │   ├── candidatService.js
│   │   ├── adminService.js
│   │   ├── recruteurService.js
│   │   ├── iaService.js
│   │   ├── authService.js
│   │   ├── profilService.js
│   │   └── entrepriseService.js
│   ├── Components/
│   ├── utils/
│   ├── data/communes.json
│   ├── assets/logo-taftech.png
│   ├── theme.js
│   ├── App.jsx
│   └── main.jsx
└── tests/                    # 250/250 passent ✅
```

---

## 🚀 AVANT DÉPLOIEMENT (obligatoire)

- [ ] `settings.py` : DEBUG=False, SECRET_KEY env, DATABASE_URL env
- [ ] `ALLOWED_HOSTS` avec vrai domaine .dz
- [ ] `CORS_ALLOWED_ORIGINS` avec vrai domaine frontend
- [ ] Whitenoise pour fichiers statiques
- [ ] `requirements.txt` à jour
- [ ] Variables d'environnement sur serveur

## 🔲 APRÈS DÉPLOIEMENT

- [ ] Rate Limiting (django-ratelimit) sur /login/ /register/
- [ ] Sentry error tracking
- [ ] Backup PostgreSQL (pg_dump cron quotidien)
- [ ] CI/CD GitHub Actions
- [ ] SSL/HTTPS via Let's Encrypt (Certbot)
- [ ] Nginx + Gunicorn config

## US10 — Visual Consistency + Responsive Mobile (12/06/2026)

- **Système deux niveaux de densité** établi et appliqué sur toutes les pages :
  - "Grand" (pages publiques/profil) : `text-2xl/3xl font-extrabold`, `text-base`, `py-3`, `rounded-2xl`
  - "Petit" (auth/outils denses) : `text-xl/2xl font-bold`, `text-sm`, `py-2.5`, `rounded-xl`
- **Responsive mobile** : tous les grids fixés avec `grid-cols-1 sm:grid-cols-2 md:grid-cols-N`
  - DashboardRecruteur (KPIs + modal wilaya), ReviewCandidature, JobDetail, CandidaturesSpontanees, EntreprisePublic
- **Bugs corrigés** :
  - `notifications.filter is not a function` — réponse paginée Django dans `candidatService.js`
  - `ParametresNotificationsSerializer` 500 — champ `fields` manquant + guard `profil_candidat`
- **Build Vite** : propre (1918 modules, 0 erreurs)

## 🔲 FEATURES RESTANTES

- [ ] Corriger tests Cypress 4 (accepter candidature) et 5 (questionnaire) — encore instables
- [ ] Ajouter Sentry error tracking (optionnel — SystemErrorLog existant couvre le besoin de base)
- [ ] Remplacer Groq par modèle local Ollama après déploiement

---

## 💻 COMMANDES UTILES

```bash
# Backend
cd C:\Users\filali\Desktop\Taftech\taftech_backend
python manage.py runserver

# Frontend
cd C:\Users\filali\Desktop\Taftech\taftech_frontend
npm run dev

# Tests backend
python manage.py test jobs.tests

# Tests frontend (250/250)
npm test -- --run

# Cypress
npx cypress open

# Git
git add .
git commit -m "feat: description"
git push origin main

# PostgreSQL port 5433
```

---

## 🤖 ROADMAP RAG — IA LOCALE (POST-DÉPLOIEMENT)

### Architecture cible

```
Candidat/Recruteur → Django API → RAG Engine → Ollama (LLM local) → Réponsese
                                       ↑
                              PostgreSQL + pgvector
                        (offres, profils, matchings, évaluations)
```

### Étapes

| Étape | Timing            | Action                                               |
| ----- | ----------------- | ---------------------------------------------------- |
| 1     | Après déploiement | Installer Ollama + mistral 7B, remplacer Groq        |
| 2     | 1 mois            | Ajouter pgvector, vectoriser offres + profils        |
| 3     | 3 mois            | Construire retriever, injecter contexte dans prompts |
| 4     | 6 mois            | Affiner prompts avec données réelles TafTech         |

### Décision technique

- Fine-tuning → écarté (nécessite GPU A100/H100, coûteux)
- RAG → retenu (fonctionne sur serveur modeste, exploite les données existantes)

### Note stratégique

La valeur de TafTech n'est pas le LLM — ce sont les données.
Chaque candidature, matching et évaluation recruteur enrichit le contexte.
Un concurrent partant de zéro ne peut pas reproduire cet avantage.

---

## 📧 CONFIG

- Email TafTech : taftech963@gmail.com
- Localisation : Oran, Algérie
