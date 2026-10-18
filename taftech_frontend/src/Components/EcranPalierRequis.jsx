import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

// Écran unique affiché à la place d'une page que le palier d'abonnement ne donne pas.
// Même rendu partout (Candidats recommandés, CVthèque, Mon équipe…) : le recruteur voit ce
// que l'abonnement lui apporterait et peut aller voir les paliers.
const EcranPalierRequis = ({ titre, message }) => (
  <div className="max-w-2xl mx-auto text-center py-16 space-y-3">
    <Lock size={32} className="mx-auto text-slate-400" />
    <h1 className="text-lg font-bold text-slate-900">{titre}</h1>
    <p className="text-sm text-slate-600">{message}</p>
    <Link
      to="/recruteurs/abonnements"
      className="inline-block mt-2 px-4 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors"
    >
      Voir les paliers
    </Link>
  </div>
);

export default EcranPalierRequis;
