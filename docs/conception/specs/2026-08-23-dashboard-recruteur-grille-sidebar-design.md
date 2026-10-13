# Dashboard recruteur — grille stricte + sidebar recommandés

**Contexte** : suite directe de la refonte du jour (`2026-08-23-dashboard-recruteur-refonte-design.md`, déjà en grande partie implémentée — voir commits `a9944e9`/`2473d65`/`10b13f2`). L'employeur a fourni un 2e mockup (dashboard style LinkedIn Talent) qui montre une vraie disposition en grille stricte avec une colonne latérale droite sticky dédiée aux candidats recommandés, plutôt que l'empilement actuel en rangées de 3 cartes égales. Ce spec ajuste uniquement la disposition de la section "aperçu" (KPIs + graphiques + recommandés) de `DashboardRecruteur.jsx` — aucune nouvelle donnée, aucun nouvel endpoint.

## Layout actuel vs cible

Actuel (post-refonte du jour) : KPIs (5 cartes) → Évolution (pleine largeur) → Pipeline/Offres actives/Activité récente (3 colonnes égales) → Sources/Recommandés (2 colonnes).

Cible :
```
[ KPI × 5, pleine largeur ]
┌─────────────────────────────────┬──────────────┐
│  Évolution        │  Pipeline    │  Candidats   │
├────────────────────┼──────────────┤  recommandés │
│  Offres actives    │  Sources     │  (sticky,    │
├────────────────────┴──────────────┤  toute la    │
│  Activité récente (pleine largeur)│  hauteur)    │
└────────────────────────────────────┴──────────────┘
```

- Colonne contenu (gauche) : `lg:col-span-2`, grille interne `grid-cols-2` — ligne 1 : Évolution + Pipeline, ligne 2 : Offres actives + Sources, ligne 3 : Activité récente en `col-span-2`. Cartes de chaque ligne à hauteur égale (`items-stretch`).
- Colonne sidebar (droite) : `lg:col-span-1`, `sticky top-20`, contient uniquement le widget Candidats recommandés.
- Sous `lg` : tout repasse en `grid-cols-1` empilé, sidebar après le contenu principal (pattern déjà utilisé côté candidat `sticky top-20` en desktop uniquement).

## Widget Candidats recommandés — simplifié pour la sidebar

Remplace l'affichage actuel (filtre "masquer décidés", détail matching dépliable, dropdown statut inline, pagination "voir plus") par des cartes compactes :
- Avatar + nom + score (badge coloré, logique de couleur inchangée)
- Poste, wilaya
- 2-3 tags compétences
- Carte entière cliquable → `/dashboard/offres/{offreId}` (comportement actuel du clic conservé)
- Lien "Voir plus →" en bas vers la page dédiée existante `/dashboard/candidats-recommandes` (au lieu de charger plus d'items inline)

Le détail matching complet, le changement de statut inline et le filtre restent uniquement sur la page dédiée `CandidatsRecommandesPage.jsx` (déjà existante, pas modifiée) — pas de perte de fonctionnalité, juste déplacée hors du dashboard.

Logique de calcul (tri par score desc, top 5-6, agrégation `offres[].candidatures[]`) inchangée — seul le rendu JSX change.

## Ce qui ne change pas

- Header, sélecteur de période, KPIs (déjà en grille 5 colonnes)
- Logique de données (`evolution`, `pipeline`, `sourcesData`, filtre par offre partagé)
- Table "Gestion de vos offres" et onglets en dessous — pleine largeur, hors de cette grille
- Blocs "Recherche CVthèque / Générer offre IA / Besoin d'aide" — pleine largeur, hors de cette grille
- Endpoints backend — aucun changement, uniquement du rendu client

## Tests

`DashboardRecruteur.test.jsx` : ajuster les assertions sur la structure DOM si elles dépendent de l'ordre/emplacement des widgets (peu probable, les tests actuels ciblent le contenu pas la disposition CSS) ; ajouter une assertion sur le lien "Voir plus →" de la sidebar recommandés pointant vers `/dashboard/candidats-recommandes`.

## Hors périmètre

- Toute modification de la logique de données ou des endpoints.
- Modification de la table "Gestion de vos offres" ou des blocs CVthèque/IA/Aide.
- Le grand spec `2026-08-23-dashboard-recruteur-refonte-design.md` (funnel, sources par période, recherches sauvegardées, etc.) — ce document ne couvre que l'ajustement de disposition demandé ici, pas une réouverture de ce chantier plus large.
