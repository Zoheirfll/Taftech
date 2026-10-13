# Architecture frontend (React)

> Services, utilitaires, structure des pages. Index : [../README.md](../README.md)

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

