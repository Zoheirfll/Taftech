import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Star, ArrowRight } from "lucide-react";

/**
 * Page affichée après un paiement Chargily réussi.
 * Chargily redirige vers /recruteurs/premium/success après confirmation du paiement.
 * Le premium est activé automatiquement via le webhook (quelques secondes de délai possible).
 */
const PremiumSuccessPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
        {/* Icône succès */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-2xl mb-6">
          <CheckCircle2 size={36} className="text-emerald-600" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Paiement confirmé ✅
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Votre paiement a bien été reçu par Chargily Pay. Votre compte Premium
          est en cours d'activation — cela prend quelques secondes.
        </p>

        {/* Info Premium */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 mb-8 flex items-center gap-3 text-left">
          <Star size={20} className="text-teal-600 fill-teal-200 shrink-0" />
          <div>
            <p className="text-sm font-bold text-teal-800">Compte Premium activé</p>
            <p className="text-xs text-teal-600 mt-0.5">
              Accès CVthèque · Analyse IA · Badge ⭐ Premium
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-3 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-800 transition-colors"
          >
            Accéder à mon tableau de bord <ArrowRight size={15} />
          </Link>
          <Link
            to="/recruteurs/premium"
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Voir mon abonnement
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PremiumSuccessPage;
