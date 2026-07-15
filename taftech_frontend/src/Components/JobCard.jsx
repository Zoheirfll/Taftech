import React, { useState } from "react";
import { jobsService } from "../Services/jobsService";
import { authService } from "../Services/authService";
import { Link } from "react-router-dom";
import { reportError } from "../utils/errorReporter";
import { tw } from "../theme";
import {
  MapPin,
  Briefcase,
  Banknote,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";

const JobCard = ({ job }) => {
  const isLogged = authService.isAuthenticated();
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handlePostuler = async () => {
    try {
      const data = await jobsService.postuler(job.id);
      setStatusMessage(data.message);
      setIsError(false);
    } catch (error) {
      if (!error.response || error.response.status >= 500) {
        reportError(`CRASH_POSTULATION_OFFRE_ID_${job.id}`, error);
      }
      setStatusMessage(
        error.response?.data?.error || "Erreur lors de la candidature.",
      );
      setIsError(true);
    }
  };

  return (
    <div className={tw.jobCardShell}>
      <div className="h-0.5 bg-indigo-600" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <Link to={`/jobs/${job.id}`}>
              <h3 className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2">
                {job.titre}
              </h3>
            </Link>
            <p className={`text-xs font-medium ${tw.textPrimary} mt-0.5`}>
              {job.entreprise?.nom_entreprise}
            </p>
          </div>
          <span className={tw.jobCardBadgeNeutral}>
            {job.type_contrat}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          <span className={tw.jobCardTagNeutral}>
            <MapPin size={11} />
            {job.wilaya?.split(" - ")[1] || job.wilaya}
          </span>
          <span className={tw.jobCardTagNeutral}>
            <Briefcase size={11} />
            {job.experience_requise}
          </span>
          {job.salaire_propose && (
            <span className={tw.jobCardTagSuccess}>
              <Banknote size={11} />
              {job.salaire_propose}
            </span>
          )}
        </div>

        {statusMessage && (
          <div
            className={isError ? tw.jobCardStatusError : tw.jobCardStatusOk}
          >
            {isError ? <XCircle size={14} /> : <CheckCircle size={14} />}
            {statusMessage}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className={`flex items-center gap-1 text-xs ${tw.textMuted}`}>
            <Calendar size={11} />
            {new Date(job.date_publication).toLocaleDateString("fr-FR")}
          </span>
          <div className="flex items-center gap-2">
            <Link
              to={`/jobs/${job.id}`}
              className={`text-xs font-medium ${tw.textPrimary} hover:underline`}
            >
              Voir les détails
            </Link>
            {isLogged ? (
              <button
                onClick={handlePostuler}
                className={tw.jobCardApplyButton}
              >
                Postuler
              </button>
            ) : (
              <Link
                to="/login"
                className={tw.jobCardGhostButton}
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
