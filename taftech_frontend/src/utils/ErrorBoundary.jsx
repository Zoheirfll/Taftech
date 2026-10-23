import React from "react";
import { tw } from "../theme";
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
          <div role="alert" className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Une erreur est survenue</h2>
            <p className="text-sm font-normal text-slate-600 mb-6 leading-relaxed">
              Un problème inattendu a interrompu l'affichage. L'incident a été signalé automatiquement.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={`${tw.buttonPrimary} w-full py-2.5`}
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
