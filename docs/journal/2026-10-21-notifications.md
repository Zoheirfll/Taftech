# Journal du 21/10/2026 (soir) — Notifications centralisées et sobres

Demande : « changer les messages comme « Message supprimé » pour un style moins vibe codé », puis, après essai sur un seul message : « ça me plaît, faites tout comme ça mais centralisé, les mêmes options, fonctions ».

## Décisions de l'utilisateur
- Ce qui gênait : **l'apparence** (toast centré, gras, icône ronde par défaut), pas seulement le texte. Une phrase complète (« Le message a été supprimé. ») avait été refusée comme « pas pro ».
- Style retenu après essai sur la boîte de réception : carte sobre en haut à droite, titre court + détail discret, filet de couleur à gauche.
- Périmètre : **toutes** les notifications (succès, erreurs, chargement, information).

## Réalisé
- `utils/notifier.js` : point d'entrée unique (`succes`, `erreur`, `echec`, `info`, `chargement`, `fermer`). `echec(titre, err)` prend le message du serveur (`apiErrMsg`) comme détail, sinon « Veuillez réessayer dans quelques instants. ». Les options (`{ id, duration }`) ne sont transmises que si elles existent.
- `Components/NotificationsHost.jsx` (hôte unique, monté dans `App.jsx`) et `Components/Notification.jsx` (carte), jetons `notif*` dans `theme.js`.
- **≈ 470 appels** migrés dans **70 fichiers** (candidat, recruteur, authentification, pages publiques, composants, administration). Un même titre pour une même situation. Les « Erreur lors de… » deviennent « … impossible » ; les « … ! » et « … . » perdent leur ponctuation.
- `tests/notificationsCentralisees.test.js` : aucun fichier hors `notifier.js` / `NotificationsHost.jsx` n'importe `react-hot-toast` ; aucune notification écrite avec « ! ».
- Tests adaptés (≈ 40 fichiers) : les assertions vérifient la chaîne `"Titre\nDétail"` transmise au mock de `react-hot-toast`.
- Autres corrections du jour dans la même passe : `NavbarRecruteur` (logo périmé), avertissement avant retrait de la photo, date de début manquante signalée avant l'envoi des expériences (voir [journal parser](2026-10-21-parser-cv-metiers-photo.md)).

## Approches écartées
- `toast.custom` : souci de résolution ESM/CJS sous Vitest (déjà documenté pour `confirmToast`). Remplacé par la fonction enfant du `<Toaster>`.
- Passer titre et détail en JSX (`<Texte titre detail />`) : les tests ne pourraient plus assertir le texte. Une chaîne `"Titre\nDétail"` garde les assertions lisibles.
- Une table centrale de tous les messages (`messages.js`) : sur-ingénierie pour ~470 textes dont la plupart ne servent qu'à un endroit ; la convention d'écriture + le test d'architecture suffisent.
- Phrases complètes (« Le message a été supprimé. ») : refusées par l'utilisateur comme pas assez « pro ».

## Vérifié
- Front : suite complète **721 / 725** ; les 4 échecs sont ceux de `MesCandidatures.test.jsx`, causés par une modification **en cours de l'utilisateur** sur `MesCandidatures.jsx`, `candidatService.js` et `candidatures.py` (hors de ce chantier, non touchée). Build de production OK.
- Backend : suite complète lancée avant ce chantier, **1305 tests OK** (le chantier ne touche pas au backend).
- Non vérifié : le rendu dans le navigateur de tous les cas (chargement qui se transforme en succès, erreur longue sur mobile). À contrôler à l'œil.

## À savoir
- Les notifications de **chargement** n'ont pas de bouton de fermeture (elles se remplacent par le résultat).
- La fenêtre de confirmation (`confirmToast`) reste une modale, hors de ce chantier.
