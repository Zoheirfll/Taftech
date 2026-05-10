import React from "react";
import { reportError } from "../utils/errorReporter";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // Cette méthode s'active automatiquement si un composant enfant plante
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Cette méthode s'active juste après pour capturer les détails
  componentDidCatch(error) {
    // 📡 On envoie l'alerte silencieuse à la Tour de Contrôle (Django)
    reportError("CRASH_INTERFACE_REACT", error);
  }

  render() {
    if (this.state.hasError) {
      // 🛡️ L'écran de secours que le client verra au lieu d'un écran blanc
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Une erreur est survenue
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Un problème inattendu a interrompu l'affichage. Nos équipes
              techniques ont été automatiquement informées et travaillent à sa
              résolution.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    // Si tout va bien, on affiche l'application normalement
    return this.props.children;
  }
}

export default ErrorBoundary;
