import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";

const CRITERES_MATCHING = {
  specialite: { label: "Spécialité", max: 25 },
  diplome: { label: "Diplôme", max: 20 },
  experience: { label: "Expérience", max: 20 },
  competences: { label: "Compétences", max: 15 },
  region: { label: "Localisation & mobilité", max: 20 },
};

const CandidatsRecommandesPage = () => {
  const [candidats, setCandidats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acces, setAcces] = useState(true);
  const [masquerDecides, setMasquerDecides] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const charger = useCallback(async (numPage, reset) => {
    try {
      const data = await jobsService.getCandidatsRecommandes(numPage, masquerDecides);
      setAcces(true);
      setCandidats((prev) => (reset ? data.results : [...prev, ...data.results]));
      setHasNext(!!data.next);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code === "PALIER_INSUFFISANT") {
        setAcces(false);
      } else {
        reportError("ECHEC_LOAD_RECOMMANDES", err);
      }
    } finally {
      setLoading(false);
    }
  }, [masquerDecides]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    charger(1, true);
  }, [masquerDecides, charger]);

  const handleVoirPlus = () => {
    const suivante = page + 1;
    setPage(suivante);
    charger(suivante, false);
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-600 animate-pulse">Chargement...</div>;
  }

  if (!acces) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-3">
        <Lock size={32} className="mx-auto text-slate-400" />
        <h1 className="text-lg font-bold text-slate-900">Candidats recommandés (IA)</h1>
        <p className="text-sm text-slate-600">Cette fonctionnalité nécessite le palier Pro ou supérieur.</p>
        <Link to="/recruteurs/abonnements" className="inline-block mt-2 px-4 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors">
          Voir les paliers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Candidats recommandés</h1>
          <p className="text-sm text-slate-600 mt-1">Classés par score de compatibilité IA, toutes offres confondues.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={masquerDecides} onChange={(e) => setMasquerDecides(e.target.checked)} className="w-4 h-4" />
          Masquer retenus/refusés
        </label>
      </div>

      <div className="space-y-3">
        {candidats.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-10">Aucun candidat pour l'instant.</p>
        ) : (
          candidats.map((c) => {
            const DM = c.details_matching || {};
            const scores = DM.scores || DM;
            const explications = DM.explications || {};
            const nom = c.candidat ? `${c.candidat.first_name || ""} ${c.candidat.last_name || ""}` : "Candidat";
            const isOpen = expandedId === c.id;
            return (
              <div key={c.id} className={`${tw.card} p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/dashboard/offres/${c.offre_id}`} className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 text-teal-700 font-bold text-sm">
                      {(nom.trim()[0] || "?").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{nom.trim() || "Candidat"}</p>
                      <p className="text-xs text-slate-500 truncate">{c.offre_titre}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-extrabold text-teal-700">{Math.round(c.score_matching)}%</span>
                    <button
                      onClick={() => setExpandedId(isOpen ? null : c.id)}
                      title={isOpen ? "Masquer le détail du matching" : "Voir le détail du matching"}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    {Object.entries(CRITERES_MATCHING).map(([key, { label, max }]) => {
                      const val = scores[key] ?? 0;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">{label}</span>
                            <span className="text-slate-500">{val}/{max}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-600 rounded-full" style={{ width: `${max ? (val / max) * 100 : 0}%` }} />
                          </div>
                          {explications[key] && <p className="text-[11px] text-slate-500 mt-1">{explications[key]}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {hasNext && (
        <div className="text-center">
          <button onClick={handleVoirPlus} className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors">
            Voir plus
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidatsRecommandesPage;
