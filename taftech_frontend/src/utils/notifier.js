import toast from "react-hot-toast";
import { apiErrMsg } from "./apiErrMsg";

/**
 * Point d'entrée UNIQUE des notifications de l'application : aucun autre fichier n'importe `react-hot-toast`
 * (test d'architecture `tests/notificationsCentralisees.test.js`). L'apparence vient d'un seul endroit,
 * `Components/NotificationsHost.jsx` (carte `Components/Notification.jsx`, jetons `notif*` de `theme.js`).
 *
 * Écriture : un titre court, sans point ni « ! » (« Profil mis à jour », « Connexion réussie »), et un détail
 * facultatif sur une seconde ligne. Le titre et le détail voyagent dans une seule chaîne séparée par un saut de
 * ligne : la carte les sépare à l'affichage.
 */
const DETAIL_PAR_DEFAUT = "Veuillez réessayer dans quelques instants.";

const texte = (titre, detail) => (detail ? `${titre}\n${detail}` : titre);

// Les options ne sont transmises que si elles existent : un appel sans option reste `toast.x("Titre")`.
const afficher = (fonction, message, options) => (options ? fonction(message, options) : fonction(message));

export const notifier = {
  /** Confirmation : `notifier.succes("Message supprimé", "Il ne figure plus dans votre boîte de réception.")`. */
  succes: (titre, detail, options) => afficher(toast.success, texte(titre, detail), options),

  /** Erreur dont on écrit soi-même le texte (validation d'un formulaire, règle métier). */
  erreur: (titre, detail, options) => afficher(toast.error, texte(titre, detail), options),

  /** Échec d'un appel serveur : titre de l'action (« Suppression impossible »), détail = message du serveur. */
  echec: (titre, erreur, options) => afficher(toast.error, texte(titre, apiErrMsg(erreur, DETAIL_PAR_DEFAUT)), options),

  /** Information neutre (ni succès ni erreur). */
  info: (titre, detail, options) => afficher(toast, texte(titre, detail), options),

  /** Opération en cours. Retourne l'identifiant à passer en `{ id }` à `succes` / `erreur` / `echec` pour la remplacer. */
  chargement: (titre, options) => afficher(toast.loading, titre, options),

  /** Ferme une notification (par exemple celle de chargement quand l'opération se termine sans message). */
  fermer: (id) => toast.dismiss(id),
};
