// Onglet « Analyse IA » : radar + score de matching, détail du score, et analyse approfondie Groq (Premium).
import { TrendingUp, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import QuotaIABadge from "../../../../Components/QuotaIABadge";
import MatchingRadarChart from "../../../../Components/MatchingRadarChart";
import { tw } from "../../../../theme";
import { CRITERES_RADAR } from "./constantesDetail";
import { DetailScoreMatching } from "./DetailScoreMatching";

export const OngletAnalyseIA = ({
  selectedCandidature,
  candidatData,
  renderScore,
  isPremium,
  analyseGroq,
  loadingGroq,
  quotaAnalyseRecruteur,
  handleAnalyseGroq,
}) => (
  <div className="p-6 overflow-y-auto max-h-[calc(100vh-220px)]">
    {!candidatData ? (
      <div className="text-center py-8">
        <TrendingUp size={28} className={`${tw.textSubtle} mx-auto mb-2`} />
        <p className={`text-sm ${tw.textMuted700}`}>
          Analyse IA indisponible pour les candidatures rapides.
        </p>
      </div>
    ) : (
      <div className="space-y-5">
        <div className={`p-4 ${tw.surfaceMuted} rounded-xl border ${tw.borderSubtle} flex flex-col items-center gap-3`}>
          {selectedCandidature.details_matching?.scores && (
            <MatchingRadarChart scores={selectedCandidature.details_matching.scores} criteres={CRITERES_RADAR} height={200} />
          )}
          <div className="text-center">
            <p className={`${tw.sectionLabel} mb-1.5`}>Score de matching IA</p>
            {renderScore(selectedCandidature.score_matching) ? (
              <span className={`inline-flex px-4 py-1.5 text-base font-bold rounded-full border ${renderScore(selectedCandidature.score_matching).style}`}>
                {renderScore(selectedCandidature.score_matching).label}
              </span>
            ) : (
              <p className={`text-sm ${tw.textMuted} italic`}>Non calculé</p>
            )}
          </div>
        </div>

        {selectedCandidature.details_matching && (
          <DetailScoreMatching detailsMatching={selectedCandidature.details_matching} />
        )}

        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <p className={tw.sectionLabel}>
              Analyse approfondie IA
            </p>
            {!loadingGroq && (
              isPremium ? (
                <div className="flex items-center gap-2">
                  <QuotaIABadge quota={quotaAnalyseRecruteur} />
                  <button
                    onClick={handleAnalyseGroq}
                    disabled={quotaAnalyseRecruteur?.disponible === false}
                    className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.bgTealSolid} text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Sparkles size={12} />{" "}
                    {analyseGroq ? "Relancer" : "Analyser avec l'IA"}
                  </button>
                </div>
              ) : (
                <Link
                  to="/recruteurs/premium"
                  className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-lg transition-colors ${tw.premiumLockBadge}`}
                >
                  ⭐ Passer Premium
                </Link>
              )
            )}
          </div>
          {loadingGroq ? (
            <div className={`flex items-center gap-2 py-4 ${tw.textTeal}`}>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-700"></div>
              <p className="text-xs font-medium animate-pulse">
                Analyse en cours...
              </p>
            </div>
          ) : analyseGroq ? (
            <div className="space-y-3">
              {[
                { id: "VERDICT", label: "Verdict", box: tw.analyseVerdictBox },
                {
                  id: "POINTS FORTS",
                  label: "Points forts",
                  box: tw.analyseFortsBox,
                },
                {
                  id: "RECOMMANDATION",
                  label: "Recommandation",
                  box: tw.analyseRecommandationBox,
                },
              ].map(({ id, label, box }) => {
                const regex = new RegExp(
                  `#{1,3}${id}#{1,3}\\s*([\\s\\S]*?)(?=#{1,3}|$)`,
                  "i",
                );
                const match = analyseGroq.match(regex);
                const content = match ? match[1].trim() : "";
                if (!content) return null;
                const parts = box.split(" ");
                return (
                  <div
                    key={id}
                    className={`border rounded-xl p-3 ${parts.slice(0, 2).join(" ")}`}
                  >
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${parts[2]}`}
                    >
                      {label}
                    </p>
                    <p className={`text-xs ${tw.textMuted700} leading-relaxed whitespace-pre-line`}>
                      {content}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={`text-xs ${tw.textMuted} italic`}>
              Cliquez sur "Analyser avec l'IA" pour obtenir une analyse
              approfondie.
            </p>
          )}
        </div>
      </div>
    )}
  </div>
);
