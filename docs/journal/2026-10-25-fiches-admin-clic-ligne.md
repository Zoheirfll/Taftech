# 25/10/2026 — Fiches de détail au clic sur une ligne (listes admin)

**Demande de l'utilisateur** : « si je clique une modale s'affiche » sur le référentiel compétences, puis « on peut ajouter ces modales pour tout qui sont nécessaire dans admin » (choix : composant commun, pages sans fiche, journaux compris).

## Composant commun
`taftech_frontend/src/Components/FicheAdminModal.jsx` : gabarit en **lecture seule** (titre, sous-titre, badge de statut, lignes `{libelle, valeur}`, boutons d'action). Valeur vide -> « — ». Fermeture : croix, Échap (`useEchapPourFermer`), clic sur le fond. Les actions passent par les modales **existantes** de la page (la fiche n'écrit rien).

## Pages branchées
| Page | Contenu de la fiche | Actions |
|---|---|---|
| `AdminCompetences` | origine, synonymes, usage, nb de métiers | Métiers, Modifier |
| `AdminFaq` | page d'affichage, **réponse complète** (tronquée dans la liste), ordre | Modifier |
| `AdminBannieres` (annonces) | **texte complet**, type, lien, libellé du lien | Modifier |
| `AdminRendezVous` | candidat, e-mail, date complète, **motif complet**, statut | aucune (statut modifiable dans la ligne) |
| `AdminAuditLogs` | action, administrateur, **détail complet**, IP | aucune |
| `AdminCreditPacks` | crédits, prix, prix par crédit, ordre | Modifier |
| `AdminDemandesPremium` | coordonnées, durée, paiement, abonnement actuel, traitement | aucune : **l'activation reste dans la ligne** (confirmée par `confirmToast`) |
| `AdminTypesDocuments` | ordre d'affichage | Modifier |

## Règles appliquées à chaque ligne
- `<tr>` cliquable : `cursor-pointer`, `tabIndex={0}`, Entrée ouvre la fiche (`e.target === e.currentTarget` quand la ligne contient des contrôles).
- **Tout contrôle de la ligne coupe la propagation** (`stopPropagation` sur la cellule d'actions, les menus de statut, les liens `mailto:`) : un clic sur une icône ou un menu n'ouvre jamais la fiche.

## Volontairement non branchés
- `AdminSystemLogs` : possède déjà sa fiche (`selected`).
- `AdminQualiteIA` : lignes = statistiques agrégées déjà complètes, une fiche n'apporterait rien.
- Pages avec fiche existante : utilisateurs, offres, entreprises, candidatures, demandes d'ajout, explorateur du référentiel.
- `AdminTypesDocuments` n'apporte que l'« ordre » en plus de la ligne (fait à la demande « faites tout », sans grande valeur).

## Vérifié
`tests/FichesAdminClic.test.jsx` (3 tests du composant + clic FAQ : l'icône « Supprimer » n'ouvre pas la fiche, la ligne l'ouvre avec la réponse complète) ; 6 fichiers admin ciblés = 39 tests OK ; build OK. **Suite frontend complète non lancée (décision de l'utilisateur) ; non essayé à l'écran** ; aucun changement backend ni de sécurité (lecture de données déjà chargées, aucune route ajoutée).
