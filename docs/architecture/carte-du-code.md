# Carte du code — qui contient quoi

> Cette page répond à : « je dois modifier X, dans quel fichier je vais ? ». Elle liste les gros fichiers qui ont été découpés le 12/10/2026 pour qu'aucun ne dépasse 1000 lignes (plus gros fichier actuel : 990 lignes). Index : [../README.md](../README.md)

## Règle simple

- **Backend** : un fichier découpé devient un **dossier** (package Python). Son `__init__.py` réexporte tout, donc les anciens imports (`from jobs.models import Candidature`) fonctionnent toujours. On n'a rien à changer ailleurs.
- **Frontend** : une grosse page devient un **dossier** avec `index.jsx` (la page, mince), un hook `use*.js` (la logique) et un fichier par bloc visible. L'import `./Pages/Recruteur/CVTheque` pointe vers `index.jsx`.

---

## Backend (`taftech_backend/jobs/`)

### `models/` (ancien `models.py`, 2242 lignes)

| Fichier | Contient |
|---|---|
| `entreprise.py` | ProfilEntreprise, EntreprisePhoto |
| `referentiel.py` | Référentiel v2 : diplômes, spécialités, métiers, appellations, relations, paramètres de matching, CompetenceReferentiel |
| `offres.py` | Offres, exigences impératives, compétences d'offre, offres sauvegardées, alertes emploi |
| `candidatures.py` | Candidatures, réponses aux exigences, candidatures spontanées, questionnaires |
| `profils.py` | Profil candidat, expériences, formations, favoris, compétences, documents privés, partages |
| `notifications.py` | Notification, ActiviteProfil |
| `equipe.py` | AuditLog, membres d'équipe, invitations, journal d'équipe |
| `abonnements.py` | Paliers, abonnements, paiements, crédits CVthèque |
| `ia.py` | AIConfig, utilisation IA, ParsingCV, CorrectionParsing, quotas |
| `cms.py` | Pages statiques, bandeaux, bannières, articles, FAQ |
| `rendezvous.py` | Rendez-vous candidat |
| `cvtheque.py` | InvitationCVTheque, RechercheSauvegardee |

Aucune migration n'a été créée par ce découpage (`makemigrations --check` : « No changes detected »).

### `cv_parser/` (ancien `cv_parser.py`, 1722 lignes)

| Fichier | Contient |
|---|---|
| `extraction.py` | Lecture du texte des PDF/DOCX et de la photo |
| `champs.py` | Email, téléphone, nom, wilaya, diplôme, permis... |
| `sections.py` | Découpage du CV en sections, compétences, langues |
| `experiences.py` | Expériences professionnelles |
| `formations.py` | Formations |
| `prompts.py` | `PROMPT_CV_COMPLET` (prompt envoyé à l'IA) |
| `groq_json.py` | `_call_groq` et réparation du JSON renvoyé |
| `competences.py` | Validation, niveau, rapprochement avec le référentiel, `PARSER_VERSION` |
| `normalisation.py` | Date de naissance, sexe, situation, mobilité |
| `parser.py` | Orchestration : `parse_with_groq`, `parse_cv` |

Attention aux tests qui font `@patch` : pour simuler l'appel Groq dans `parse_with_groq`, patcher `jobs.cv_parser.parser._call_groq`.

### `views/recruteur_*.py` (ancien `views/recruteur.py`, 1643 lignes)

`views/recruteur.py` n'est plus qu'un petit fichier de réexport. Le code est dans :

| Fichier | Contient |
|---|---|
| `recruteur_dashboard.py` | KPIs, activité récente, recherches sauvegardées |
| `recruteur_exports.py` | Rapport PDF, exports Excel |
| `export_xlsx.py` | Helper commun des exports Excel (`reponse_xlsx`, `neutraliser_formules`) — plus aucun export CSV |
| `recruteur_entreprise.py` | Profil entreprise, photos, paramètres |
| `recruteur_cvtheque.py` | CVthèque, candidats recommandés, statistiques, invitations, favoris |
| `recruteur_spontanees.py` | Candidatures spontanées |
| `recruteur_questionnaires.py` | Questionnaires |
| `recruteur_paiements.py` | Abonnement, Chargily, webhook, reçu |

---

## Frontend (`taftech_frontend/src/Pages/`)

| Page (dossier) | Fichier principal | Logique | Blocs visibles |
|---|---|---|---|
| `Recruteur/CVTheque/` | `index.jsx` | `useCVTheque.js` | `PanneauFiltres`, `BarreRecherche`, `ListeCandidats`, `CarteCandidat`, `PanneauDetailCandidat`, `SectionsProfilCandidat`, `ModaleInvitation`, `BandeauEtOnglets`, `EcransAccesCVTheque` |
| `Recruteur/ParametresRecruteur/` | `index.jsx` | `useParametresRecruteur.js` | `OngletMonProfil`, `OngletMonEntreprise`, `OngletNotifications`, `MediasEntreprise` |
| `Recruteur/CreateJob/` | `index.jsx` | `useCreateJob.js` | `SectionInfosPoste`, `SectionProfil`, `SectionLocalisation`, `SectionMission`, `SectionQuestionnaire`, `SectionPublication`, `BlocFormationRequise`, `BlocExigences`, `BlocCompetences`, `BlocQuestionsIA`, `formUi.jsx` (champs communs) |
| `Recruteur/DashboardRecruteur/` | `index.jsx` | `useDashboardRecruteur.js`, `calculs.js` (calculs purs), `constantes.js` | `KpiCards`, `WidgetEvolution`, `WidgetPipeline`, `WidgetCandidatsRecommandes`, `WidgetOffresActives`, `WidgetSources`, `WidgetActivite`, `EnteteDashboard`, `FiltresGraphiques`, `BarrePeriodeRapport`, `BlocsActionsBas`, `ModalInvitation`, `EtatsDashboard` |
| `Recruteur/GestionOffre/` | `index.jsx` | `useGestionOffre.js` | `DetailCandidature.jsx` (orchestrateur) + dossier `detail/` : `EnteteCandidature`, `BarreOnglets`, `OngletProfil`, `OngletAnalyseIA`, `OngletEvaluation`, `OngletQuestionnaire`, `ExigencesOffre`, `ProfilCandidatDetails`, `DetailScoreMatching` |
| `Candidat/ProfilCandidat/` | `index.jsx` | `useProfilCandidat.js` | Sections : `SectionCV`, `SectionInfosPerso`, `SectionPreferences`, `SectionExperiences`, `SectionFormations` ; barre latérale : `SidebarCompletion`, `SidebarStats`, `SidebarCompetences`, `SidebarLangues` ; modales : `ModalInfos`, `ModalPreferences`, `ModalLiens`, `ModalCV`, `ModalExperience`, `ModalFormation` (redistribuées par `Modals.jsx`) |

### `demandes_ajout/` (nouveau, 16/10/2026) — demandes d'ajout au référentiel

| Fichier | Contient |
|---|---|
| `regles.py` | Limites, validation du libellé et du motif, `DemandeRefusee` |
| `adaptateurs.py` | Un adaptateur par type (`DIPLOME`, `SPECIALITE` ; métiers et compétences aux étapes 2 et 3) : entrée existante, entrées proches, accepter, rattacher, effets |
| `service.py` | `creer_demande`, `accepter_demande`, `rattacher_demande`, `refuser_demande`, notifications |
| `formations.py` | Lien avec `FormationCandidat` : `synchroniser_depuis_formation`, effets d'une décision |

Modèle dans `models/demande_ajout.py`, API dans `views/demandes_ajout.py` et `serializers/demande_ajout.py`. Fiche : [demandes-ajout.md](../fonctionnel/demandes-ajout.md).

### `stats_admin/` (nouveau, 18/10/2026) — statistiques admin par période
Backend `jobs/stats_admin/` (logique pure, sans HTTP) : `periode.py` (lecture des paramètres, période précédente, variation, mois, `restreindre` par entreprise), `indicateurs.py` (6 indicateurs + variation), `evolution.py` (courbes mensuelles en `GROUP BY`), `recrutement.py` (entonnoir, offres sans candidature, distribution du matching), `abonnements.py` (état actuel + revenu), `__init__.py` (`construire_statistiques`). Vues : `jobs/views/admin_statistiques.py` (JSON + export). Frontend : `Pages/Admin/AdminStatsPeriode.jsx`, `Components/StatsPeriodeGraphiques.jsx` (courbes et histogramme recharts, couleurs via `theme.js`), réutilise `Components/FunnelChart.jsx`. Détail : [admin.md](../fonctionnel/admin.md).

### `seo_pages.py` (nouveau, 18/10/2026) — balises SEO rendues côté serveur
Backend `jobs/seo_pages.py` : `chemin_canonique_offre`, `construire_job_posting`, `injecter_meta` (injection dans `index.html`, échappement HTML et JSON-LD), vues `PageOffreView`, `PageOffreAncienneUrlView`, `PageEntrepriseView`, `PageArticleView` (routes dans `taftech_backend/urls.py`, réglage `FRONTEND_INDEX_PATH`). Sitemap et robots.txt : `jobs/seo_views.py`. Frontend : `Components/Seo.jsx` (canonical, `og:url`, JSON-LD), `Components/RouteTitle.jsx`, `utils/jobPosting.js`. À garder alignés : `chemin_canonique_offre` (Python), `jobUrl` (`utils/slugify.js`) et le sitemap (test de cohérence). Détail : [ui-site-public-mobile.md](../fonctionnel/ui-site-public-mobile.md), consigne nginx : [deploiement.md](../exploitation/deploiement.md).

### Vie privée, hors ligne et formulaires (18/10/2026)
Frontend : `Components/CookieBanner.jsx` (information cookies), `Components/Analytics.jsx` (mesure sans cookie, variables `VITE_ANALYTICS_*`), `Components/CarteSurDemande.jsx` (carte Google après clic), `Components/GoogleAuthProvider.jsx` (script Google limité à la connexion et à l'inscription), `Pages/Public/Merci.jsx` (remerciement), `utils/useErreursChamps.js` (+ `Components/FieldError.jsx`, `utils/fieldErrors.js`) pour les erreurs sous chaque champ, `utils/registerServiceWorker.js` (appelé par `main.jsx`, production seulement), `public/sw.js`, `public/hors-ligne.html`, `public/manifest.webmanifest`, icônes `public/taftech-icone-192.png` et `-512.png`. Backend : `jobs/image_utils.py` (optimisation des images envoyées, branchée par `JobsConfig.ready` dans `jobs/apps.py`), `jobs/seo_views.py` (`offres_indexables`, `stats_job_posting`, `alertes_configuration`, `rendu_serveur_pret`). Détail : [ui-site-public-mobile.md](../fonctionnel/ui-site-public-mobile.md), SECURITY.md §33.

## Fichiers proches de la limite (à surveiller)

Plafond dur 1000 lignes, plafond doux 800. À découper si on y ajoute du code : `Services/adminService.js` (994), `theme.js` (937), `Recruteur/OffresListPage.jsx` (927, son bloc « Formation requise » réutilise désormais `CreateJob/BlocFormationRequise.jsx`), `Admin/AdminOffres.jsx` (909), `views/offres.py` (883), `views/admin.py` (877), `referentiel_utils.py` (875), `Candidat/CandidatDashboard.jsx` (845), `Admin/AdminReferentielV2.jsx` (798, hors de la zone depuis la suppression de l'ancien panneau « Formations à vérifier »).

Frontend admin du référentiel : `Pages/Admin/AdminReferentielV2.jsx` reçoit un `groupe` (`metiers`, `formations`, `specialites`) et affiche ses onglets ; `Pages/Admin/demandes/` contient le tableau et la fenêtre de décision communs à tous les types.
