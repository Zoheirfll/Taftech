# Sidebar recruteur : catégories + recherche/filtres manquants

_26/08/2026_

## Contexte

`RecruteurLayout.jsx` liste 17 liens à plat, sans regroupement. Certaines pages listées par la sidebar (Recrutements, Facturation, Candidatures, Évaluations) n'ont aucune recherche ni filtre malgré des tables potentiellement longues et non paginées. Le menu hamburger mobile (`NavbarRecruteur.jsx`) duplique la même liste plate.

Audit complet des 17 pages effectué (recherche/filtres existants, ce qui manque, volume de données) — voir résumé dans la conversation. Pages déjà bien équipées (CVthèque, OffresListPage, CandidaturesSpontanees, CandidatsRecommandesPage, MonEquipe, StatistiquesPage) : non touchées.

## Portée

### 1. Sidebar desktop — catégories + scroll indépendant
`RecruteurLayout.jsx` : les 17 `menuItems` sont regroupés en 4 sections avec en-tête (pattern déjà utilisé par `AdminLayout.jsx` — sections "Principal/Modération/Communauté/Système") :
- **Principal** : Tableau de bord
- **Recrutement** : Offres d'emploi, Publier une offre, Questionnaires, Candidatures, CVthèque, Favoris, Candidatures spontanées, Candidats recommandés, Entretiens, Recrutements, Évaluations
- **Analyse** : Statistiques
- **Compte** : Mon équipe, Abonnements & tarifs, Facturation, Paramètres entreprise

Le conteneur `<aside>` passe de `sticky top-20` (simple) à `sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto` — la sidebar défile indépendamment de la page une fois pleine, au lieu de forcer un scroll de toute la page pour atteindre "Paramètres" en bas de liste. Le bouton "Déconnexion" reste toujours visible en bas via un `pt-2 border-t` sticky interne (non prioritaire si complexité excessive — simple `mb-2` sinon).

### 2. Recherche/filtres — 4 pages à compléter
Pattern réutilisé : client-side filter sur les données déjà chargées (comme `CandidaturesListPage`/`OffresListPage` existants), pas de nouvel endpoint backend.

- **RecrutementsPage.jsx** : champ recherche (nom candidat + titre offre) + select période (déjà présent ailleurs dans l'app, réutiliser le pattern `periodeEvolution` de `DashboardRecruteur`/`StatistiquesPage` si la donnée le permet, sinon une plage de dates simple).
- **CandidaturesListPage.jsx** : ajout d'un champ recherche nom/email candidat, en plus des selects offre/statut déjà existants.
- **EvaluationsPage.jsx** : champ recherche (nom candidat + offre) + filtre plage de score (min/max ou tranches, cohérent avec le pattern déjà utilisé pour `répartition_score` dans `StatistiquesPage`).
- **FacturationPage.jsx** : champ recherche (numéro de facture) + select période/année.

Toutes en filtrage 100% client-side sur les données déjà récupérées par la page (pas de nouveau paramètre API), avec debounce si nécessaire pour la cohérence UX avec le reste de l'app.

### 3. Menu mobile — alignement
`NavbarRecruteur.jsx` (menu hamburger) : réorganiser la liste plate des liens recruteur pour suivre les mêmes 4 catégories que la sidebar desktop (mini en-têtes de section dans le menu déroulant), sans changer la logique de garde `peutFaire()`/`minRole` déjà en place.

## Hors périmètre
- Aucun nouvel endpoint backend (tout filtrage reste client-side, cohérent avec l'état actuel de ces pages).
- CVthèque, OffresListPage, CandidaturesSpontanees, CandidatsRecommandesPage, MonEquipe, StatistiquesPage, Questionnaires, GestionOffre : non modifiés.
- Pas d'ancres de scroll intra-page (scrollspy) — l'amélioration porte sur la sidebar elle-même, pas sur un jump interne à une page.

## Tests
- Vérifier `RecruteurLayout.test.jsx` (si existant) après regroupement en catégories.
- Nouveaux/mis à jour tests pour recherche/filtre sur les 4 pages concernées (au moins 1 cas "recherche filtre bien la liste").
- `npx vite build` propre avant de considérer terminé.
