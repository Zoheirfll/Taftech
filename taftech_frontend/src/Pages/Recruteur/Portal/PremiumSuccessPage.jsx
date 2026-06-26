import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Star, ArrowRight } from "lucide-react";

const FONCTIONNALITES = [
  "Accès complet à la CVthèque",
  "Analyse IA approfondie des candidatures",
  "Résumé IA automatique des profils",
  "Badge ⭐ Premium sur votre espace",
];

const REDIRECT_DELAY = 7;

const PremiumSuccessPage = () => {
  const navigate = useNavigate();
  const [secondes, setSecondes] = useState(REDIRECT_DELAY);
  const [visibles, setVisibles] = useState([]);

  useEffect(() => {
    // Afficher les fonctionnalités une par une avec délai
    FONCTIONNALITES.forEach((_, i) => {
      setTimeout(() => setVisibles(p => [...p, i]), 400 + i * 350);
    });
    // Compte à rebours
    const interval = setInterval(() => {
      setSecondes(s => {
        if (s <= 1) {
          clearInterval(interval);
          navigate("/dashboard");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
        {/* Icône animée */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-2xl mb-6 animate-bounce" style={{ animationDuration: "1.5s", animationIterationCount: 3 }}>
          <CheckCircle2 size={36} className="text-emerald-600" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Paiement confirmé !</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Votre paiement a bien été reçu. L'activation Premium est en cours — cela prend quelques secondes.
        </p>

        {/* Checklist animée */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 mb-6 text-left space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Star size={15} className="text-teal-600 fill-teal-200 shrink-0" />
            <p className="text-sm font-bold text-teal-800">Fonctionnalités débloquées</p>
          </div>
          {FONCTIONNALITES.map((f, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm transition-all duration-500 ${visibles.includes(i) ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}`}
            >
              <CheckCircle2 size={14} className="text-teal-600 shrink-0" />
              <span className="text-teal-700">{f}</span>
            </div>
          ))}
        </div>

        {/* Compte à rebours */}
        <p className="text-xs text-slate-400 mb-4">
          Redirection automatique dans{" "}
          <span className="font-bold text-teal-700">{secondes}s</span>…
        </p>

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
