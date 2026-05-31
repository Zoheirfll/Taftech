import React, { useEffect, useState } from "react";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import { Calendar, Briefcase, Lock } from "lucide-react";

const getBadgeStyle = (statut) => {
  const styles = {
    RECUE: "bg-amber-50 text-amber-700 border-amber-200",
    EN_COURS: "bg-blue-50 text-blue-700 border-blue-200",
    ENTRETIEN: "bg-orange-50 text-orange-700 border-orange-200",
    RETENU: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REFUSE: "bg-red-50 text-red-700 border-red-200",
  };
  return styles[statut] || "bg-slate-100 text-slate-700";
};

const getScoreColor = (score) => {
  const num = parseFloat(score);
  if (num >= 80) return "bg-emerald-500 text-white";
  if (num >= 60) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
};

const getMessageStatut = (statut) => {
  switch (statut) {
    case "RETENU":
      return "Félicitations ! Votre profil a été définitivement retenu pour ce poste.";
    case "REFUSE":
      return "Malheureusement, votre profil n'a pas été retenu. Ne vous découragez pas !";
    case "EN_COURS":
      return "Votre dossier est actuellement examiné par le recruteur.";
    case "ENTRETIEN":
      return "Bonne nouvelle ! Le recruteur souhaite vous rencontrer.";
    default:
      return "Votre candidature a été envoyée et attend d'être évaluée.";
  }
};

const MesCandidatures = () => {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidatures = async () => {
      try {
        const data = await jobsService.getMesCandidatures();
        setCandidatures(data);
      } catch (error) {
        reportError("ECHEC_RECUPERATION_CANDIDATURES", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidatures();
  }, []);

  const formatText = (text) => {
    if (!text) return "Non spécifié";
    return text
      .replace(/_/g, " ")
      .replace(
        /\w\S*/g,
        (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(),
      );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Suivi de mes candidatures
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Suivez l'avancement de toutes vos candidatures.
        </p>
      </div>

      {candidatures.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
          <Briefcase size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900">
            Aucune candidature
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Vous n'avez postulé à aucune offre pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {candidatures.map((cand) => (
            <div
              key={cand.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-all"
            >
              {/* EN-TÊTE */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                <div className="flex items-start gap-4">
                  {/* SCORE MATCHING */}
                  {cand.score_matching !== null &&
                  cand.score_matching !== undefined ? (
                    <div
                      className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm ${getScoreColor(cand.score_matching)}`}
                    >
                      <span className="text-[9px] font-semibold uppercase opacity-80">
                        Match
                      </span>
                      <span className="text-sm font-bold leading-tight">
                        {parseInt(cand.score_matching)}%
                      </span>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-medium text-slate-400 flex-shrink-0">
                      N/A
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-slate-900">
                        {cand.offre_titre}
                      </h2>
                      {cand.offre_est_cloturee && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white text-[10px] font-medium rounded-full">
                          <Lock size={10} /> Clôturée
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-indigo-600 mt-0.5">
                      {cand.entreprise_nom}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar size={11} />
                      Postulé le{" "}
                      {new Date(cand.date_postulation).toLocaleDateString(
                        "fr-FR",
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getBadgeStyle(cand.statut)}`}
                >
                  {formatText(cand.statut)}
                </span>
              </div>

              {/* MESSAGE STATUT */}
              <div className="bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-600">
                  {getMessageStatut(cand.statut)}
                </p>
              </div>

              {/* ENTRETIEN */}
              {cand.statut === "ENTRETIEN" && cand.date_entretien && (
                <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="text-xs font-semibold text-orange-900 flex items-center gap-1.5 mb-2">
                    <Calendar size={13} /> Convocation à un entretien
                  </h4>
                  <p className="text-sm font-bold text-orange-800">
                    {new Date(cand.date_entretien).toLocaleString("fr-FR", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                  {cand.message_entretien && (
                    <div className="mt-2 px-3 py-2 bg-white/80 rounded-lg border border-orange-100 text-xs italic text-slate-700">
                      "{cand.message_entretien}"
                    </div>
                  )}
                  <p className="text-xs text-orange-700 font-medium mt-2">
                    Ces détails vous ont été envoyés par email.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MesCandidatures;
