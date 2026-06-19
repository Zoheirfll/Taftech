import React, { useState } from "react";
import { jobsService } from "../Services/jobsService";
import { authService } from "../Services/authService";
import { Link } from "react-router-dom";
import { reportError } from "../utils/errorReporter";
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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all">
      <div className="h-0.5 bg-indigo-600" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <Link to={`/jobs/${job.id}`}>
              <h3 className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2">
                {job.titre}
              </h3>
            </Link>
            <p className="text-xs font-medium text-indigo-600 mt-0.5">
              {job.entreprise?.nom_entreprise}
            </p>
          </div>
          <span className="flex-shrink-0 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
            {job.type_contrat}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 text-xs rounded-md">
            <MapPin size={11} />
            {job.wilaya?.split(" - ")[1] || job.wilaya}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 text-xs rounded-md">
            <Briefcase size={11} />
            {job.experience_requise}
          </span>
          {job.salaire_propose && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-md">
              <Banknote size={11} />
              {job.salaire_propose}
            </span>
          )}
        </div>

        {statusMessage && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium ${
              isError
                ? "bg-red-50 text-red-600"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isError ? <XCircle size={14} /> : <CheckCircle size={14} />}
            {statusMessage}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1 text-xs text-slate-600">
            <Calendar size={11} />
            {new Date(job.date_publication).toLocaleDateString("fr-FR")}
          </span>
          <div className="flex items-center gap-2">
            <Link
              to={`/jobs/${job.id}`}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Voir les détails
            </Link>
            {isLogged ? (
              <button
                onClick={handlePostuler}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Postuler
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-50 transition-colors"
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
