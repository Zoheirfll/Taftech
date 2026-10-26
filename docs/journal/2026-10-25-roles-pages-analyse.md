# 25/10/2026 — Rôles d'équipe : pages d'analyse fermées à l'Invité

**Décision de l'utilisateur** (option A du 25/10/2026) : l'Invité est un observateur en lecture seule.

## Matrice appliquée

| Page | Invité | Utilisateur | Admin | Propriétaire |
|---|---|---|---|---|
| Tableau de bord, Boîte de réception, Offres (lecture), Candidatures, Entretiens, Évaluations, Recrutements, Comprendre le matching | oui | oui | oui | oui |
| Publier une offre, Questionnaires, CVthèque | non | oui | oui | oui |
| **Candidatures spontanées, Candidats recommandés, Statistiques, Comprendre les crédits** (nouveau) | non | oui | oui | oui |
| Mon équipe | non | non | oui | oui |
| Abonnements, Facturation | non | non | non | oui |
| Paramètres : « Mon profil » / « Mon entreprise » / « Notifications » | oui / non / non | oui / non / non | oui / oui / non | oui / oui / oui |

## Côté serveur (403 `ROLE_INSUFFISANT`)

- `CandidatsRecommandesAPIView` et `StatistiquesAvanceesAPIView` (`views/recruteur_cvtheque.py`, `_refus_si_invite`).
- Les 3 routes de candidatures spontanées : liste, marquer lue, supprimer (`views/recruteur_spontanees.py`).
- Paramètres entreprise : déjà réservés au propriétaire et à l'administrateur sur les 5 routes de `recruteur_entreprise.py` (vérifié, rien changé).

## Côté interface

`minRole: "UTILISATEUR"` dans `RecruteurLayout.jsx`, `NavbarRecruteur.jsx`, `BottomNavRecruteur.jsx` (entrée visible avec cadenas, règle du 24/10) ; `RoleGuard` sur les 4 routes de `App.jsx`. `RecruteurLayout` n'appelle plus les spontanées pour un Invité (sinon 403 + erreur journalisée à chaque navigation) et masque son raccourci mobile.

## Limite connue

La page Statistiques lit aussi `getDashboard`, que l'Invité garde pour son tableau de bord : côté serveur seules les statistiques avancées (répartition des scores) lui sont fermées. Les chiffres du tableau de bord restent visibles de toute façon.

## Vérifié

Backend : `test_roles_pages_analyse` (3 tests, vraies routes) + `test_api_dashboard_refonte` (dont la visibilité de l'activité récente par rôle) + `test_api_equipe` = 79 tests OK (`DB_NAME=taftech_db_claude_iso`). Frontend : build OK, tests de navigation 15 OK. **Non lancé** : suites complètes ; **non essayé à l'écran avec un compte Invité** ; non commité.
