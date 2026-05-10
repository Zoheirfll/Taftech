import axios from "axios";

// On utilise une instance séparée de votre "api.js" habituel.
// Pourquoi ? Parce que si votre API principale plante (ex: problème de token JWT),
// il faut que l'outil de signalement puisse quand même fonctionner de manière indépendante.
const telemetryApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/accounts",
  withCredentials: true,
});

export const reportError = async (message, error = null) => {
  // On formate les données pour correspondre exactement à votre modèle Django
  const errorData = {
    message: message,
    details: error?.message || "Aucun détail technique fourni",
    url: window.location.href,
    user_agent: navigator.userAgent,
    stack_trace: error?.stack || "Aucune stack trace disponible",
  };

  try {
    // On envoie la requête en mode POST
    await telemetryApi.post("/report-error/", errorData);
  } catch {
    // 🛑 LE MUR DE SILENCE 🛑
    // Si Django est éteint ou injoignable, on "avale" l'erreur.
    // Le client ne doit jamais s'en apercevoir.
  }
};
