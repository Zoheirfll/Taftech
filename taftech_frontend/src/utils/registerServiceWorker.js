import { reportError } from "./errorReporter";

// Enregistre le service worker (public/sw.js : page « hors ligne » et cache des fichiers hachés)
// UNIQUEMENT dans la version publiée du site : en développement il fausserait les rechargements.
export const enregistrerServiceWorker = (env = import.meta.env, nav = navigator, fenetre = window) => {
  if (!env.PROD || !("serviceWorker" in nav)) return false;
  fenetre.addEventListener("load", () => {
    nav.serviceWorker.register("/sw.js").catch((err) => reportError("ECHEC_SERVICE_WORKER", err));
  });
  return true;
};
