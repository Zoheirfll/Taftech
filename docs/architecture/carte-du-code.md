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

## Fichiers proches de la limite (à surveiller)

Plafond dur 1000 lignes, plafond doux 800. À découper si on y ajoute du code : `Admin/AdminReferentielV2.jsx` (990), `Recruteur/OffresListPage.jsx` (989), `theme.js` (937), `Admin/AdminOffres.jsx` (909), `views/offres.py` (883), `Services/adminService.js` (881), `Candidat/CandidatDashboard.jsx` (845), `views/admin.py` (827).
