// Widget « Candidats recommandés » : top 3 des candidats ≥ 80 % avec favoris et invitation à postuler.
import { Link } from "react-router-dom";
import { Star, Users, Bookmark, Send } from "lucide-react";
import { candidatFichierUrl } from "../../../utils/mediaUrl";
import { identiteCandidature } from "../../../utils/candidatureNom";
import { tw } from "../../../theme";

export const WidgetCandidatsRecommandes = ({
  candidatsRecommandesTous,
  navigate,
  handleToggleFavoriRecommande,
  setOffreInvitation,
  setInviterCandidat,
}) => (
  <div className={`${tw.cardColors} rounded-2xl p-5 flex flex-col`}>
    <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
      <Star size={15} className={tw.textTeal} /> Candidats recommandés
      <span className={`px-1.5 py-0.5 rounded-full text-xs ${tw.tagSlateSoft700}`}>{candidatsRecommandesTous.length}</span>
    </h2>
    <div className="grid grid-cols-1 gap-3">
      {candidatsRecommandesTous.slice(0, 3).map((cand) => {
        const score = Math.round(parseFloat(cand.score_matching));
        const identite = identiteCandidature(cand);
        const nomAffiche = `${identite.first_name} ${(identite.last_name || "").slice(0, 1)}.`
          .trim();
        const tags = (cand.candidat.competences || "").split(",").map((c) => c.trim()).filter(Boolean).slice(0, 3);
        return (
          <div key={cand.id} className={`p-3.5 rounded-xl border ${tw.borderBase}`}>
            <div className="flex items-start gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/offres/${cand.offreId}`)}
                className={`w-10 h-10 rounded-full ${tw.surfaceSubtle} flex items-center justify-center overflow-hidden shrink-0`}
              >
                {cand.candidat.photo_profil ? (
                  <img src={candidatFichierUrl(cand.candidat.id, "photo")} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={16} className={tw.textMuted} />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/offres/${cand.offreId}`)}
                    className={`text-sm font-semibold ${tw.textStrong} hover:underline`}
                  >
                    {nomAffiche}
                  </button>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${score >= 80 ? tw.bgSuccessSoft + " " + tw.textSuccess : score >= 60 ? tw.textAmber500 : tw.textRed400}`}>
                    {score}% compatible
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${tw.textTeal}`}>{cand.offreTitre}</p>
                {cand.candidat.wilaya && (
                  <p className={`text-xs mt-0.5 ${tw.textMuted}`}>{cand.candidat.wilaya.split(" - ")[1] || cand.candidat.wilaya}, Algérie</p>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tags.map((t) => (
                      <span key={t} className={`px-1.5 py-0.5 text-[10px] rounded ${tw.tagSlateSoft}`}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleFavoriRecommande(cand.candidat.id)}
                  title="Ajouter aux favoris"
                  className={`p-1 rounded-md transition-colors ${tw.hoverSurfaceSubtle}`}
                >
                  <Bookmark size={14} className={tw.iconMuted} />
                </button>
                <button
                  type="button"
                  onClick={() => { setOffreInvitation(""); setInviterCandidat(cand); }}
                  title="Inviter à postuler"
                  className={`p-1 rounded-md transition-colors ${tw.hoverSurfaceSubtle}`}
                >
                  <Send size={14} className={tw.iconMuted} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    <div className="mt-3 text-center">
      <Link to="/candidats-recommandes" className={`text-xs font-semibold ${tw.textTeal}`}>
        Voir plus de candidats recommandés →
      </Link>
    </div>
  </div>
);
