// Onglet « Profil » du détail candidature : résumé IA, exigences, coordonnées, bio, liens, puis détails du profil.
import { Sparkles, Mail, Phone, Copy, ExternalLink, Zap } from "lucide-react";
import { tw } from "../../../../theme";
import { ExigencesOffre } from "./ExigencesOffre";
import { ProfilCandidatDetails } from "./ProfilCandidatDetails";

export const OngletProfil = ({
  selectedCandidature,
  candidatData,
  formatText,
  isPremium,
  analyseGroq,
  setActiveDetailTab,
  exigenceOverrides,
  handleVerifierExigence,
}) => (
  <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)]">
    {/* Résumé IA — lecture seule, fusionné avec "Analyse approfondie IA" (onglet Analyse
        IA) : une seule action/quota génère les deux affichages du même résultat. */}
    {candidatData && (
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className={tw.textTeal} />
            <span className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
              Résumé IA
            </span>
          </div>
          <button
            onClick={() => setActiveDetailTab("ia")}
            className={`text-xs font-semibold ${tw.textTeal} hover:underline`}
          >
            {analyseGroq ? "Voir le détail" : "Analyser ce candidat"}
          </button>
        </div>
        {analyseGroq ? (
          <p className={`text-xs ${tw.textMuted700} leading-relaxed`}>
            {analyseGroq
              .replace(/#{1,3}[A-ZÀ-Ÿ\s]+#{1,3}/g, "")
              .replace(/\n{2,}/g, " ")
              .trim()}
          </p>
        ) : (
          <p className={`text-xs ${tw.textMuted} italic`}>
            {isPremium
              ? "Générez une analyse IA depuis l'onglet \"Analyse IA\"."
              : "🔒 Fonctionnalité Premium — passez sur un palier supérieur pour l'activer."}
          </p>
        )}
      </div>
    )}

    {/* Exigences impératives (S12) — jamais notées dans le score, filtre d'éligibilité
        vérifié manuellement. INCONNU = à vérifier, pas une disqualification. */}
    {selectedCandidature.reponses_exigences?.length > 0 && (
      <ExigencesOffre
        reponsesExigences={selectedCandidature.reponses_exigences}
        exigenceOverrides={exigenceOverrides}
        handleVerifierExigence={handleVerifierExigence}
      />
    )}

    {/* Coordonnées */}
    <div>
      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Coordonnées</h4>
      <div className="flex flex-wrap gap-2">
        {(candidatData?.email || selectedCandidature.email_rapide) && (() => {
          const email = candidatData?.email || selectedCandidature.email_rapide;
          return (
            <div className="flex items-center gap-1">
              <a href={`mailto:${email}`} className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.pillTeal} text-xs font-semibold rounded-lg transition-colors`}>
                <Mail size={12} /> {email}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(email); }} className={`p-1.5 ${tw.iconButtonHoverTeal} rounded-md transition-colors`} title="Copier">
                <Copy size={11} />
              </button>
            </div>
          );
        })()}
        {(candidatData?.telephone || selectedCandidature.telephone_rapide) && (() => {
          const tel = candidatData?.telephone || selectedCandidature.telephone_rapide;
          return (
            <div className="flex items-center gap-1">
              <a href={`tel:${tel}`} className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.pillSlate} text-xs font-semibold rounded-lg transition-colors`}>
                <Phone size={12} /> {tel}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(tel); }} className={`p-1.5 ${tw.iconButtonHoverSlate} rounded-md transition-colors`} title="Copier">
                <Copy size={11} />
              </button>
            </div>
          );
        })()}
      </div>
    </div>

    {candidatData?.bio && (
      <p className={`text-sm leading-relaxed p-3 rounded-lg italic ${tw.quoteBoxMuted}`}>
        "{candidatData.bio}"
      </p>
    )}
    {(candidatData?.linkedin || candidatData?.github) && (
      <div className="flex gap-2">
        {candidatData?.linkedin && (
          <a
            href={candidatData.linkedin}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${tw.pillTeal} text-xs font-semibold rounded-lg transition-colors`}
          >
            <ExternalLink size={13} /> LinkedIn
          </a>
        )}
        {candidatData?.github && (
          <a
            href={candidatData.github}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${tw.pillSlate} text-xs font-semibold rounded-lg transition-colors`}
          >
            <ExternalLink size={13} /> GitHub
          </a>
        )}
      </div>
    )}

    {candidatData ? (
      <ProfilCandidatDetails candidatData={candidatData} formatText={formatText} />
    ) : (
      <div className={`text-center py-8 rounded-xl border ${tw.emptyStateAmberBox}`}>
        <Zap size={28} className={`${tw.textAmber500} mx-auto mb-2`} />
        <p className="text-sm font-semibold text-amber-900">
          Candidature rapide
        </p>
        <p className={`text-xs ${tw.textWarning} mt-1`}>
          Pas de profil TAFTECH — consultez le CV joint.
        </p>
      </div>
    )}
  </div>
);
