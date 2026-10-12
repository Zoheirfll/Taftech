# TafTech — Frontend (React)

Interface web de la plateforme de recrutement TafTech : espace candidat, espace recruteur et panel administrateur.

**Stack** : React 18, Vite, Tailwind CSS v4, Axios, React Router. Tests : Vitest + Testing Library (unitaires), Cypress (E2E, mis de côté).

> Documentation complète du projet : [`../docs/README.md`](../docs/README.md). Règles de travail : [`../CLAUDE.md`](../CLAUDE.md).

## Démarrer

```bash
npm install        # une seule fois
npm run dev        # serveur de dev sur http://localhost:5173
```

Le backend Django doit tourner en parallèle (`python manage.py runserver`, port 8000). Le serveur de dev redirige automatiquement `/api` et `/media` vers lui (voir `vite.config.js`), il n'y a donc rien à configurer.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (à lancer avant tout commit : doit être propre) |
| `npm test -- --run` | Tous les tests unitaires, une seule fois |
| `npm run lint` | Vérification ESLint |
| `npx cypress open` | Tests E2E (nécessite le backend et `cypress.env.json`) |

## Où se trouve quoi

```
src/
├── App.jsx            Routes de tout le site (qui a le droit d'aller où)
├── main.jsx           Point d'entrée
├── theme.js           Toutes les classes de style centralisées (tokens `tw.*`)
├── Pages/             Un dossier par espace
│   ├── Public/        Accueil, offres, entreprises, blog, pages légales
│   ├── Auth/          Connexion, inscriptions, mot de passe oublié
│   ├── Candidat/      Espace candidat (profil, candidatures, documents...)
│   ├── Recruteur/     Espace recruteur (dashboard, CVthèque, offres...)
│   └── Admin/         Panel administrateur (/admin-taftech)
├── Components/        Composants réutilisables (navbar, cartes, graphiques...)
├── Services/          Appels à l'API, un fichier par domaine
├── api/               Configuration Axios (cookies, refresh du token)
├── utils/             Petites fonctions partagées (dates, URLs médias, erreurs...)
├── data/              Données statiques (communes...)
└── assets/            Images
tests/                 Tests unitaires (un fichier par page ou composant)
cypress/               Tests E2E
```

### Une grosse page = un dossier

Aucun fichier ne dépasse 1000 lignes. Une page importante est donc un dossier avec la même forme partout :

```
Pages/Recruteur/CVTheque/
├── index.jsx            La page : mince, elle assemble les morceaux
├── useCVTheque.js       Toute la logique (état, chargement, actions)
├── CarteCandidat.jsx    Un composant = une partie visible de l'écran
└── ...
```

Pour modifier un comportement, ouvrir le hook `use*.js`. Pour modifier l'apparence d'un bloc, ouvrir le composant correspondant. L'import `./Pages/Recruteur/CVTheque` reste valide : il pointe vers `index.jsx`.

## Règles à respecter

- **Couleurs** : jamais de couleur écrite en dur dans un composant, utiliser les tokens `tw.*` de `src/theme.js`.
- **Confirmations** : jamais `window.confirm` ni `window.prompt`, utiliser `confirmToast`.
- **Composants** : ne jamais définir un composant à l'intérieur d'un autre (le formulaire perdrait le focus à chaque frappe).
- **Appels API** : toujours via `Services/`, avec `reportError()` dans chaque `catch`.
- **Fichiers médias** : toujours via `utils/mediaUrl.js`, jamais d'adresse en dur.
- **Tests** : un nouvel appel `jobsService.*` dans un composant testé doit être ajouté au mock du test correspondant.

## Tester depuis un téléphone (ngrok)

```bash
npm run dev          # terminal 1
ngrok http 5173      # terminal 2 : donne une URL publique à partager
```

Détails : [`../docs/exploitation/commandes.md`](../docs/exploitation/commandes.md).
