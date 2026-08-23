# Refonte du dashboard recruteur — Design

**Contexte** : l'employeur a envoyé un mockup complet du "Tableau de bord" recruteur (voir capture jointe à la conversation). Cette refonte **remplace entièrement** `DashboardRecruteur.jsx` — nouvelle page, mêmes fondations (`RecruteurLayout`, endpoints déjà là), consolidation des graphiques avancés qui étaient dupliqués entre le dashboard et `StatistiquesPage.jsx`. Dépend du sous-projet 1 (`2026-08-23-source-candidature-invitation-cvtheque-design.md`) pour le widget "Sources des candidatures".

## Vue d'ensemble de la page

Header : greeting "Bonjour {prénom}" + sous-titre, sélecteur de période (date début/fin, défaut 30 derniers jours) + bouton "Télécharger le rapport" (PDF).

Grille de widgets, dans l'ordre du mockup :
1. 5 KPI cards (bandeau haut)
2. Évolution des candidatures (ligne, avec data-labels aux extrémités) + Pipeline de recrutement (funnel, filtrable par offre) — 2 colonnes
3. Mes offres d'emploi actives (table) + Sources des candidatures (donut, période indépendante) — 2 colonnes, + colonne latérale droite (Candidats recommandés IA, Activité récente)
4. Recherche avancée CVthèque (mini-form + lien Recherche enregistrée) + Générez vos offres avec l'IA (CTA) + Besoin d'aide — 3 colonnes
5. Widget "Mon abonnement" — sidebar gauche (déjà dans `RecruteurLayout`, pas dans le contenu principal)

Topbar (`RecruteurLayout`) : ajout d'une icône Messages (raccourci vers `/candidatures-spontanees`, même compteur non-lues que le lien sidebar) à côté de la cloche Notifications déjà existante. Carte profil : nom + nouvel intitulé de poste libre sous le nom (voir "Intitulé de poste recruteur" ci-dessous).

## Backend — filtrage par période

`DashboardRecruteurAPIView` (`jobs/views/recruteur.py`) étendu : accepte `?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD` (défaut : 30 derniers jours si absent). Calcule pour la période ET la période précédente de même durée (pour le %) :

```python
kpis = {
    "offres_actives": {"valeur": ..., "variation_pct": ...},       # état courant, pas de comparaison temporelle (snapshot)
    "candidatures_recues": {"valeur": ..., "variation_pct": ...},  # count Candidature.date_postulation dans [debut, fin]
    "candidats_entretien": {"valeur": ..., "variation_pct": ...},  # count statut=ENTRETIEN, date_postulation dans la période
    "recrutements": {"valeur": ..., "variation_pct": ...},         # count statut=RETENU, date_postulation dans la période
    "taux_conversion": {"valeur": ..., "variation_pct": ...},      # recrutements / candidatures_recues * 100, 0 si aucune candidature
}
```

`variation_pct = None` si la période précédente a 0 candidature (division par zéro évitée, frontend affiche "—" au lieu de "+∞%"). `offres_actives` n'a pas de vraie notion de "période précédente" (c'est un compte instantané) — `variation_pct` compare le nombre d'offres actives à J-{durée période} (approximation simple, documentée en commentaire).

Réponse existante conservée (offres/palier/etc.), `kpis` et `periode` (`{date_debut, date_fin}` résolues) ajoutés.

## Graphiques

### Évolution des candidatures (ligne)

Réutilise `MiniAreaChart.jsx` existant tel quel, filtré sur la période sélectionnée (remplace le sélecteur "7j/30j/6m/1a" de l'ancien dashboard par la période globale de la page — un seul sélecteur de période pour toute la page au lieu d'un sélecteur par graphique, cohérent avec le mockup).

### Pipeline de recrutement (funnel)

Nouveau composant `Components/FunnelChart.jsx` — trapèzes SVG empilés, largeur proportionnelle au %, 5 étapes (Candidatures reçues / Présélection / Entretiens / Offres envoyées / Recrutements — voir note ci-dessous), couleur + `count` + `%` affichés par étape, calculé côté client depuis `offres[].candidatures[]` filtré sur la période. Dropdown "Tous les postes" au-dessus du funnel (filtre client-side sur `dash.offres`, restreint le calcul à une offre précise — pas de nouvel appel API).

**Note sur "Offres envoyées"** : n'existe pas comme statut dans `Candidature.STATUTS` actuel (RECUE/EN_COURS/PRESELECTION/ENTRETIEN/RETENU/REFUSE) — le mockup l'affiche entre Entretiens et Recrutements. Décision : `Offres envoyées` = candidatures dont le statut est passé par `RETENU` (une offre d'emploi a été faite, qu'elle soit acceptée ou non) — approximation la plus proche du concept sans nouveau champ. Le funnel du mockup devient donc : Candidatures reçues → Présélection → Entretiens → Retenues (offre faite) → Recrutements confirmés, où "Recrutements confirmés" == `RETENU` final (les deux dernières étapes fusionnent en une seule dans notre implémentation faute de distinguer "offre faite" de "recrutement confirmé" — **4 étapes réelles, pas 5**, différence assumée et documentée dans le spec plutôt que d'inventer un champ).

### Consolidation graphiques avancés

Les fonctionnalités avancées de l'ancien `DashboardRecruteur.jsx` (toggle courbe/barres, comparaison période précédente superposée, taux de conversion en axe secondaire, export PNG/CSV par graphique) migrent dans le nouveau dashboard, sur le graphique "Évolution des candidatures". `StatistiquesPage.jsx` reste la vue détaillée séparée (pas touchée par cette refonte, toujours accessible via la sidebar).

## Widgets

### Mes offres d'emploi actives (table)

`titre`, `candidatures` (count), `entretiens` (count statut=ENTRETIEN), `date_publication`, `statut` (badge Actif/Clôturée), bouton "..." → menu dropdown actions rapides (Voir les candidatures → `GestionOffre`, Modifier → modale déjà existante dans l'ancien dashboard, Clôturer → `CloturerOffreAPIView` déjà existant, réutilisés tels quels — pas de nouvelle logique métier, juste le regroupement dans un menu compact au lieu de boutons séparés). Réutilise `dash.offres` déjà chargé, pas de nouvel endpoint. Tri par `date_publication` desc, limité aux 5-8 premières + lien "Voir toutes" vers `/dashboard/offres` (page déjà construite en Phase 2b).

### Sources des candidatures (donut)

Consomme `Candidature.source` (sous-projet 1). 3 tranches réelles : Site TafTech, CVthèque, Autres. Calcul côté client sur `offres[].candidatures[]`, avec son **propre sélecteur de période** (7j/30j/6m/1a — indépendant du sélecteur global de la page, comme dans le mockup) — pas de nouvel appel API, filtrage client sur `date_postulation`.

### Candidats recommandés par IA

Réutilise `CandidatsRecommandesAPIView` existant (Phase 2b), top 3 affichés dans la colonne latérale (au lieu de la page dédiée qui en montre 12/page), carte compacte (avatar, nom, poste, %, wilaya, 2-3 tags compétences), lien "Voir tout" vers `/dashboard/candidats-recommandes`. Gate `acces_ia_recommandes` (Pro+) déjà en place côté API — si palier insuffisant, widget affiche un état verrouillé avec CTA vers Abonnements (pas caché silencieusement).

Deux icônes d'action par carte (mockup) :
- **Message** : ouvre la même modale "Inviter à postuler" que dans la CVthèque (sous-projet 1, `InviterCandidatCVThequeAPIView`) — select d'une offre active de l'entreprise, réutilise le même composant modale que `CVTheque.jsx` (extrait en composant partagé `Components/InviterCandidatModal.jsx` pour éviter la duplication entre les deux écrans). Même gate `acces_coordonnees` (Pro+).
- **Bookmark** : ajoute/retire le candidat des favoris — endpoint favoris déjà existant (`ProfilCandidatFavori`, utilisé par `CVTheque.jsx`), même appel `jobsService.toggleFavori(candidatId)` réutilisé tel quel.

### Activité récente

Nouvelle vue `ActiviteRecenteAPIView` (`GET jobs/dashboard/activite-recente/`), scope `get_entreprise_for_user()`, retourne les 10 derniers `EquipeActionLog` de l'entreprise formatés en phrase lisible côté backend (`detail` déjà présent, ajout d'un mapping `action → template de phrase` par type, ex. `STATUT_CANDIDATURE` → "{membre} a changé le statut de {detail}"). Actions manquantes ajoutées au moment opportun : nouvelle candidature reçue (log `AUTRE` déclenché dans `PostulerAPIView`/`PostulerRapideAPIView`), candidat ajouté aux favoris (log dans l'endpoint favoris existant). Pas de nouveau modèle.

### Recherche avancée CVthèque (mini-form)

4 champs seulement dans le dashboard (mots-clés, secteur, métier, localisation — pas les ~15 filtres complets de `CVTheque.jsx`), bouton "Rechercher" construit une query string et `navigate("/cvtheque?" + params)`. Aucune logique de recherche/résultats dupliquée dans le dashboard — pure redirection avec pré-remplissage. Compteur "(1283 résultats)" du mockup **non reproduit** (nécessiterait un appel API juste pour compter avant même de chercher, valeur ajoutée faible) — bouton "Rechercher" simple. Lien "Recherche enregistrée" (voir section dédiée ci-dessous).

### Recherches enregistrées (nouveau)

Nouveau modèle `RechercheSauvegardee` (`entreprise` FK, `nom` (libellé libre donné par le recruteur), `filtres` (`JSONField`, mêmes clés que les query params `CVTheque.jsx`/`recruteurService.searchCVtheque`), `date_creation`). CRUD simple, scope `get_entreprise_for_user()` + `get_membre_role()` (INVITE bloqué en écriture, lecture autorisée) :
- `GET/POST jobs/cvtheque/recherches-sauvegardees/`, `DELETE jobs/cvtheque/recherches-sauvegardees/<id>/` — nouvelle vue `RecherchesSauvegardeesAPIView`.
- **`CVTheque.jsx`** : bouton "Enregistrer cette recherche" à côté des filtres actifs → modale nom + save. Dropdown "Recherches enregistrées" (liste des recherches de l'entreprise, clic → réapplique les filtres depuis `filtres` JSON, `setSearchParams`).
- **Dashboard** : lien "Recherche enregistrée" à côté du panneau CVthèque → même dropdown compact, sélection redirige directement vers `/cvtheque?...` avec les filtres de la recherche choisie (pas de logique dupliquée, même principe que le mini-formulaire).
- Limite : 20 recherches sauvegardées max par entreprise (évite une liste interminable), 400 si dépassé.

### Page Évaluations (nouvelle page sidebar)

Nouvelle page `EvaluationsPage.jsx` (route `/evaluations`, sidebar après "Statistiques") — vue d'ensemble qui n'existe nulle part aujourd'hui (les notes d'entretien ne sont visibles que candidature par candidature dans `DetailCandidature.jsx`). Réutilise `jobsService.getDashboard()` déjà chargé : table de toutes les candidatures de l'entreprise avec `note_globale` renseignée (toutes offres confondues), colonnes candidat/offre/date entretien/4 notes détaillées/note globale sur 20/commentaire, tri par note desc par défaut, lien vers `DetailCandidature`. Pas de nouvel endpoint — agrégation client-side sur des données déjà exposées et déjà scopées à l'entreprise.

### Intitulé de poste recruteur (nouveau champ, cosmétique)

Nouveau champ `CustomUser.intitule_poste` (`CharField`, `blank=True`, max 100 — ex. "Responsable RH", "Chargé de recrutement"), migration `accounts`. Éditable dans `ParametresRecruteur.jsx` (onglet "Mon profil", à côté des champs déjà éditables). Affiché sous le nom dans la topbar `RecruteurLayout.jsx` (repli sur le rôle technique — Propriétaire/Admin/Utilisateur/Invité — si le champ est vide, jamais une ligne vide). Purement cosmétique, aucun impact sur `get_membre_role()`/permissions.

### Générez vos offres avec l'IA (CTA)

Carte avec **champ de saisie inline** (placeholder "Ex: Ingénieur qualité avec 5 ans d'expérience") + bouton "Générer avec l'IA". Le recruteur tape un intitulé de poste directement dans le dashboard ; au clic, `navigate("/creer-offre?titre=" + encodeURIComponent(valeur))`. `CreateJob.jsx` : nouveau `useEffect` au montage qui lit `?titre=` (`useSearchParams`), pré-remplit le champ titre, et **lance automatiquement la génération IA** si le champ est présent et non vide (appelle le même handler que le bouton "Générer avec l'IA" existant, une seule fois) — pas de duplication de la logique de génération, le dashboard ne fait que transmettre l'intitulé. Champ vide au clic → navigue simplement vers `/creer-offre` sans déclenchement auto (comportement actuel inchangé). Lien "En savoir plus" sous le bouton → ancre vers la section pertinente de `/contact` (FAQ) ou `/qui-sommes-nous`, pas de nouvelle page.

Gate visuel : si palier absent (Gratuit), champ + bouton désactivés + tooltip "Nécessite un abonnement actif" (cohérent avec `GenererOffreIAAPIView` qui exige déjà un palier actif, Phase 2b).

### Besoin d'aide

Carte statique 3 liens : "Centre d'aide" → `/contact`, "Contacter un conseiller" → `mailto:taftech963@gmail.com`, "Formation recruteur" → nouvelle `PageStatique` (slug `formation-recruteur`, réutilise le CMS pages existant — l'admin peut éditer son contenu sans déploiement, contenu de départ minimal type "à venir" plutôt que de bloquer la refonte sur un vrai programme de formation à rédiger).

### Mon abonnement

Déjà présent en sidebar gauche (`RecruteurLayout`, widget existant depuis Phase 2a/2b) — non dupliqué dans le contenu principal, juste vérifié qu'il reste visible/à jour (nom du palier réel, pas juste "Premium").

## PDF "Télécharger le rapport"

Nouvelle vue `RapportDashboardPDFAPIView` (`GET jobs/dashboard/rapport-pdf/?date_debut=...&date_fin=...`), ReportLab, même style que `FacturePDFAPIView`/`GenererBulletinPDFAPIView` (bandeau indigo + logo TafTech). Contenu : période, 5 KPI, tableau funnel (étape/count/%), top 5 offres par candidatures reçues sur la période. `get_entreprise_for_user()` scope.

## Sécurité

- `DashboardRecruteurAPIView` étendu : mêmes permissions qu'avant (`IsAuthenticated` + `get_entreprise_for_user()` + blocage membre si palier absent) — paramètres `date_debut`/`date_fin` validés (format date, `date_fin >= date_debut`, sinon 400 — pas d'injection SQL possible, Django ORM paramètre déjà les requêtes).
- `ActiviteRecenteAPIView`/`RapportDashboardPDFAPIView` : scope entreprise identique, `IsAuthenticated` + `get_entreprise_for_user()`.
- Widget "Sources des candidatures"/"Candidats recommandés" : aucune donnée exposée qui ne l'était pas déjà (agrégats sur les propres candidatures de l'entreprise).
- `RecherchesSauvegardeesAPIView` : `get_entreprise_for_user()` + `get_membre_role()` (INVITE lecture seule, écriture bloquée), `filtres` JSON jamais interprété côté serveur (juste stocké/renvoyé tel quel, la validation des valeurs de filtre reste celle déjà en place côté `CVThequeView` au moment où ils sont réappliqués) — pas d'injection possible.
- `intitule_poste` : champ texte libre, aucune validation particulière au-delà de `max_length` (purement cosmétique, jamais utilisé dans une logique de permission).
- Page Évaluations : aucune donnée nouvelle exposée, mêmes candidatures déjà accessibles via le dashboard.

## Tests

- Backend : `DashboardRecruteurAPIView` avec période (KPIs corrects, variation_pct, gestion division par zéro), `ActiviteRecenteAPIView` (formatage phrases, scope entreprise), `RapportDashboardPDFAPIView` (génère un PDF non vide, scope entreprise), `RecherchesSauvegardeesAPIView` (CRUD, scope entreprise, limite 20, INVITE bloqué en écriture), `intitule_poste` (sauvegarde/lecture via `ParametresRecruteur`).
- Frontend : nouveau `DashboardRecruteur.test.jsx` réécrit pour la nouvelle page (KPIs, funnel avec filtre offre, donut avec période indépendante, mini-recherche CVthèque redirige bien, CTA IA désactivé si palier absent, widget recommandés verrouillé si palier insuffisant, icône Messages topbar), `FunnelChart.test.jsx` (nouveau composant, rendu des étapes + filtre), `EvaluationsPage.test.jsx` (nouveau, tri par note, lien détail), tests recherches enregistrées dans `CVTheque.test.jsx` (save/reload).

## Hors périmètre (explicite)

- Compteur de résultats en temps réel dans le mini-formulaire CVthèque du dashboard.
- 5ᵉ étape distincte "Offres envoyées" vs "Recrutements" dans le funnel (fusionnées, voir note ci-dessus) — nécessiterait un nouveau statut `Candidature` non demandé ici.
- Contenu réel de la page "Formation recruteur" (juste la coquille CMS, éditable plus tard par l'admin).
- Recherche Ctrl+K du topbar : déjà fonctionnelle depuis `RecruteurLayout` (Phase 1), pas retouchée.
- Partage/export des recherches sauvegardées entre entreprises différentes (strictement scopé à l'entreprise propriétaire).
