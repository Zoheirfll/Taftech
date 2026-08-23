import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const formatTempsRelatif = (dateStr) => {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures}h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours}j`;
};

const ActiviteCompletePage = () => {
  const [activite, setActivite] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsService.getActiviteRecente(50)
      .then(setActivite)
      .catch((err) => reportError("ECHEC_ACTIVITE_COMPLETE", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Activité récente</h1>
        <p className="text-sm text-slate-600 mt-1">Les 50 derniers événements de votre entreprise.</p>
      </div>

      <div className={`${tw.card} p-5`}>
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">Chargement...</p>
        ) : activite.length === 0 ? (
          <p className="text-sm italic text-slate-500">Aucune activité pour le moment.</p>
        ) : (
          <ul className="space-y-4">
            {activite.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <span className="mt-1 w-2 h-2 rounded-full shrink-0 bg-teal-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{a.phrase}</p>
                  <p className="text-xs mt-0.5 text-slate-500">{formatTempsRelatif(a.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ActiviteCompletePage;
