import React from "react";
import { Toaster } from "react-hot-toast";
import { Notification } from "./Notification";
import { notifier } from "../utils/notifier";

/**
 * Hôte unique des notifications, monté une fois à la racine (`App.jsx`). Position et durée se règlent ici,
 * l'apparence dans `Notification.jsx` : aucun écran ne les redéfinit.
 */
export const NotificationsHost = () => (
  <Toaster position="top-right" gutter={8} toastOptions={{ duration: 4000 }}>
    {(toast) => <Notification toast={toast} onClose={() => notifier.fermer(toast.id)} />}
  </Toaster>
);

export default NotificationsHost;
