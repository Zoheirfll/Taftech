# Session du 25/10/2026 : 10 parcours E2E Cypress

> Commandes de lancement : [../exploitation/commandes.md](../exploitation/commandes.md) (section « Tests E2E Cypress »).

## Demande

Dix fichiers de test end-to-end, un par parcours complet et récurrent, avec **identifiants et données dynamiques** (rien en dur, rien lu dans `cypress.env.json`).

## Ce qui a été fait

Dix fichiers dans `taftech_frontend/cypress/e2e/`, numérotés à la suite des sept existants. Chacun couvre un parcours de bout en bout (cas nominal + cas d'erreur) avec l'API **simulée** (`cy.intercept`) : aucun backend ni base nécessaire.

| # | Fichier | Parcours |
|---|---|---|
| 8 | `8-connexion-candidat-complete` | succès, `?next=`, 401, 429, aucun jeton dans le navigateur |
| 9 | `9-connexion-recruteur-complete` | succès, compte candidat refusé, 401, 429, liens du portail |
| 10 | `10-mot-de-passe-oublie-complet` | demande de code, réinitialisation, mots de passe différents, trop court, code expiré |
| 11 | `11-inscription-candidat-complete` | formulaire, code à 6 chiffres, e-mail déjà pris, consentement Loi 18-07, mauvais code |
| 12 | `12-inscription-recruteur-complete` | 3 étapes, secteur/wilaya manquants, mots de passe différents, RC déjà utilisé |
| 13 | `13-recherche-offres-et-detail` | liste, recherche filtrée côté serveur, détail, aucun résultat, offre retirée |
| 14 | `14-candidature-rapide-visiteur` | formulaire + CV joint, champs vides, e-mail invalide, erreur serveur, lien « se connecter » |
| 15 | `15-formulaire-contact-complet` | envoi, consentement, champs manquants, e-mail invalide, erreur serveur |
| 16 | `16-gardes-roles-et-session` | visiteur, candidat, recruteur, administrateur, session incohérente (pas de boucle) |
| 17 | `17-pages-publiques-et-navigation` | 404, pages d'information, blog, remerciement, pages légales |

Commandes ajoutées dans `cypress/support/commands.js` :
- `identiteDynamique(prefixe)` : e-mail, nom, prénom, téléphone, NIN, entreprise, registre de commerce, mot de passe aléatoire, message ; unique à chaque appel.
- `offreDynamique(id, titre)` : offre fictive.
- `bloquerApiReelle()` : toute route `/api/` non simulée répond 200 `{}`.
- `simulerReferentiel()` : wilayas et secteurs minimaux pour les inscriptions.
- `visiterConnecte(url, role, portail)` : ouvre une page avec `userRole` et `loginPortal` posés.

## Pièges découverts

- **Cypress ne démarre pas dans le terminal de VS Code** : la variable `ELECTRON_RUN_AS_NODE` est héritée (erreurs `cachedDataRejected`, `bad option: --smoke-test`). Solution : `Remove-Item Env:ELECTRON_RUN_AS_NODE` avant de lancer.
- **Intercept trop large** : `**/jobs/?*` captait aussi `jobs/constants/`, `jobs/nomenclature/`, `jobs/pages/`… et la page des offres affichait « Une erreur est survenue ». Solution : `pathname` exact.
- **Champ de recherche désactivé pendant le chargement** (`JobsList`) : attendre la réponse simulée, puis `should("not.be.disabled")` avant de saisir.
- **401 réel = déconnexion automatique** : si une page appelle l'API sans cookie, le site déconnecte et redirige, ce qui fausse tout test de session. D'où `bloquerApiReelle()`.
- Le test n° 1 (ancien) est périmé : il remplit un champ `nin` qui n'existe plus dans `RegisterCandidat.jsx` et dépend d'un endpoint de nettoyage `cypress-cleanup`.

## Approche abandonnée

Un premier fichier unique de 10 tests (`8-parcours-publics-gardes.cy.js`) avait été écrit et exécuté (10/10 verts). Il a été supprimé : la demande portait sur **dix fichiers, un parcours complet chacun**. Ses cas (gardes de routes, 404, contact, mot de passe oublié) sont repris dans les fichiers 15, 16, 17 et 10.

## État de vérification

- **Les fichiers 8 à 17 n'ont jamais été exécutés** (l'utilisateur installait Cypress au moment de l'écriture). Seul le brouillon supprimé l'avait été.
- Points déduits du code source, à confirmer au premier lancement : URL exacte de `postuler-rapide` (fichier 14), clé du code dans les corps de `verifier-email` (`code` ou `otp`) et `reset-password` (`code`), sélecteurs des deux listes de l'inscription recruteur (fichier 12), forme de l'offre simulée lue par `JobDetail.jsx`, titres des pages « Qui sommes-nous », « Blog » et « Merci » (fichier 17).
- Aucune fonctionnalité du site n'a été modifiée : pas de nouvelle route ni de donnée exposée, donc pas d'audit de sécurité spécifique. Les tests vérifient au contraire des règles existantes (gardes de rôle, pas de jeton en `localStorage`, anti-brute-force affiché).
- Non commité.
