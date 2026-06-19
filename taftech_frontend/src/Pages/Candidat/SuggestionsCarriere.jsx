import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import {
  Sparkles,
  TrendingUp,
  BookOpen,
  Lightbulb,
  ChevronRight,
  Briefcase,
  RefreshCw,
} from "lucide-react";

const PER_PAGE = 5;

const SuggestionsCarriere = () => {
  const [suggestions, setSuggestions] = useState(null);
  const [analyse, setAnalyse] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingAnalyse, setLoadingAnalyse] = useState(false);
  const [analysedemandee, setAnalyseDemandee] = useState(false);
  const [page, setPage] = useState(1);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    setPage(1);
    try {
      const data = await jobsService.getSuggestionsCarriere();
      setSuggestions(data);
    } catch (err) {
      reportError("ECHEC_GET_SUGGESTIONS_CARRIERE", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleAnalyseIA = async () => {
    setLoadingAnalyse(true);
    setAnalyseDemandee(true);
    setAnalyse(null);
    try {
      const data = await jobsService.getAnalyseCarriere();
      setAnalyse(data.analyse);
    } catch (err) {
      reportError("ECHEC_GET_ANALYSE_CARRIERE", err);
      setAnalyse(
        "Service IA temporairement indisponible. Réessayez plus tard.",
      );
    } finally {
      setLoadingAnalyse(false);
    }
  };

  const parseAnalyse = (text) => {
    if (!text) return null;

    const sections = [
      { key: "ÉVOLUTION POSSIBLE", icon: TrendingUp, color: "indigo" },
      { key: "COMPÉTENCES À ACQUÉRIR", icon: BookOpen, color: "amber" },
      { key: "CONSEIL PERSONNALISÉ", icon: Lightbulb, color: "emerald" },
    ];

    const parsedSections = sections
      .map(({ key, icon, color }) => {
        // Ce regex ultra-souple intercepte les formats :
        // ### KEY ###  OU  # KEY #  OU  ###KEY###
        const regex = new RegExp(
          `(?:#{1,3})\\s*${key}\\s*(?:#{1,3})\\s*([\\s\\S]*?)(?=(?:#{1,3})\\s*(?:ÉVOLUTION POSSIBLE|COMPÉTENCES À ACQUÉRIR|CONSEIL PERSONNALISÉ)|$)`,
          "i",
        );
        const match = text.match(regex);
        const content = match ? match[1].trim() : "";
        return { label: key, content, icon, color };
      })
      .filter((s) => s.content);

    // Fallback de sécurité si un jour le modèle change radicalement de structure
    if (parsedSections.length === 0) {
      return [
        {
          label: "ANALYSE PERSONNALISÉE",
          content: text.replace(/#/g, "").trim(), // On nettoie les dièses
          icon: Sparkles,
          color: "indigo",
        },
      ];
    }

    return parsedSections;
  };

  const metiers = suggestions?.metiers || [];
  const totalPages = Math.ceil(metiers.length / PER_PAGE);
  const paginated = metiers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const colorMap = {
    indigo: "bg-indigo-50 border-indigo-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
  };
  const iconColorMap = {
    indigo: "text-indigo-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };
  const headerColorMap = {
    indigo: "text-indigo-700",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles size={22} className="text-indigo-600" />
          Suggestions de carrière
        </h1>
        <p className="text-base text-slate-700 mt-1">
          Découvrez les métiers qui correspondent à votre profil et obtenez une
          analyse personnalisée.
        </p>
      </div>

      {/* MÉTIERS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Briefcase size={16} className="text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Métiers correspondant à votre profil
          </h2>
          {suggestions?.profil_secteur && (
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
              {suggestions.profil_secteur}
            </span>
          )}
          <button
            onClick={fetchSuggestions}
            className="ml-auto flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
          >
            <RefreshCw size={12} /> Actualiser
          </button>
        </div>

        {loadingSuggestions ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : metiers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-600 italic">
              Complétez votre profil (titre professionnel, spécialité) pour
              obtenir des suggestions.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {paginated.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {m.titre}
                    </p>
                    {m.niveau_experience && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {m.niveau_experience}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {m.secteur}
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  ← Précédent
                </button>
                <span className="text-xs text-slate-600">
                  Page {page} / {totalPages} · {metiers.length} métiers
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ANALYSE IA */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Analyse IA personnalisée
            </h2>
          </div>
          {(!analysedemandee || (!loadingAnalyse && !analyse)) && (
            <button
              onClick={handleAnalyseIA}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Sparkles size={13} /> Analyser mon profil
            </button>
          )}
        </div>

        <div className="p-5">
          {!analysedemandee ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles size={24} className="text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">
                Analyse IA de votre parcours
              </p>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Notre IA analyse votre profil et vous suggère des évolutions de
                carrière adaptées au marché algérien.
              </p>
            </div>
          ) : loadingAnalyse ? (
            <div className="text-center py-8 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-sm text-indigo-600 font-medium animate-pulse">
                L'IA analyse votre profil...
              </p>
            </div>
          ) : analyse ? (
            <div className="space-y-4">
              {parseAnalyse(analyse)?.map((section, i) => {
                const Icon = section.icon;
                return (
                  <div
                    key={i}
                    className={`border rounded-xl p-4 ${colorMap[section.color]}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={15} className={iconColorMap[section.color]} />
                      <p
                        className={`text-xs font-bold uppercase tracking-wider ${headerColorMap[section.color]}`}
                      >
                        {section.label}
                      </p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </div>
                );
              })}
              <button
                onClick={() => {
                  setAnalyse(null);
                  setAnalyseDemandee(false);
                }}
                className="w-full py-2 text-xs text-slate-500 font-medium hover:underline flex items-center justify-center gap-1"
              >
                Réinitialiser
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SuggestionsCarriere;
