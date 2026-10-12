# Architecture backend (Django)

> Vues, serializers, constantes, commandes de gestion. Index : [../README.md](../README.md)

## 🏗️ ARCHITECTURE BACKEND

### jobs/views/ (package — ancien views.py)
- `notifications.py` — NotificationListAPIView, MarkNotificationReadAPIView, PublicStatsAPIView, EntrepriseDetailAPIView
- `offres.py` — JobListAPIView, JobDetailAPIView, JobCreateAPIView, UpdateOffreRecruteurAPIView, CloturerOffreAPIView, ConstantsAPIView. Toutes les actions (create/update/cloturer) utilisent `get_entreprise_for_user()` + `get_membre_role()` — INVITE bloqué, UTILISATEUR/ADMIN/PROPRIETAIRE autorisés
- `profils.py` — ProfilCandidatAPIView, ExperienceAPIView, FormationAPIView, alertes, favoris, paramètres
- `candidatures.py` — PostulerAPIView, PostulerRapideAPIView, MesCandidaturesAPIView, UpdateCandidatureStatusAPIView, DeleteCandidatureAPIView, EvaluerCandidatureAPIView, Top5CandidatsAPIView. Actions (update/delete/evaluer) utilisent `get_entreprise_for_user()` + `get_membre_role()` — INVITE bloqué
- `recruteur.py` — DashboardRecruteurAPIView (retourne `palier_actif`, `palier_expiration`, `acces_equipe`/`acces_ia_recommandes`/`acces_ia_avancee`/`acces_coordonnees`, **bloc 403 `PREMIUM_EXPIRE` si membre non-propriétaire et aucun palier actif**), CVThequeView, questionnaires, spontanées, paramètres, **DemanderActivationPremiumAPIView**, **EnvoyerRecuPremiumAPIView**
- `admin.py` — AdminPagination + toutes vues admin + exports CSV + **AdminDemandesPremiumAPIView** (GET liste toutes avec `palier_actif`/`abonnement_expire_at`, PATCH activer avec `nb_mois`+`palier` → crée/prolonge un `AbonnementEntreprise`)
- `ia.py` — OffresRecommandeesAPIView, ParserCVAPIView, GenererOffreIAAPIView, AnalyseCarriereGroqAPIView, AnalyseGroqRecruteurAPIView. Helper `_appel_groq()` mutualisé. (`SuggestionsCarriereAPIView`, `MetierReferentielAPIView`/`MetierReferentielAdminAPIView` supprimées — session référentiel v2 du 18/09/2026, remplacées par le référentiel v2 `Metier`/`Appellation` et son panel admin dédié)
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
WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES, WILAYAS_LIST, WILAYAS_MAPPING, DIPLOMES_MAPPING — `SPECIALITES_MAPPING`/`SYNONYMES_SPECIALITE` supprimés (session ANEM 18/07/2026), la spécialité/métier passe désormais par le référentiel v2 (`Metier`/`GroupeMetier`/`Appellation`, voir section "Référentiel v2" — sessions 17-18/09/2026)

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

