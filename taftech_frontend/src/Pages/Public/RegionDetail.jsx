import React, { useState, useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import JobCard from "../../Components/JobCard";
import Seo from "../../Components/Seo";
import { ChevronLeft, ChevronRight, ArrowLeft, MapPin } from "lucide-react";
import { tw } from "../../theme";

// Route /regions/:slug — "16-alger" ou juste "16" (le préfixe avant le premier "-" est
// le code numérique de wilaya, seul significatif — WILAYAS_CHOICES au format "NN - Nom").
const RegionDetail = () => {
  const { slug } = useParams();
  const code = slug?.split("-")[0];

  const [wilaya, setWilaya] = useState(null);
  const [nom, setNom] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWilaya = async () => {
      try {
        const constants = await jobsService.getConstants();
        const found = (constants.wilayas || []).find((w) => w.value?.split(" - ")[0] === code);
        if (!found) {
          setNotFound(true);
          return;
        }
        setWilaya(found);
        setNom(found.value?.split(" - ")[1] || found.value);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_WILAYA", error);
        setNotFound(true);
      }
    };
    fetchWilaya();
  }, [code]);

  useEffect(() => {
    if (!wilaya) return;
    setLoading(true);
    jobsService
      .getAllJobs({ wilaya: wilaya.value }, page)
      .then((data) => {
        setJobs(data.results || []);
        setCount(data.count || 0);
      })
      .catch((error) => reportError("ECHEC_CHARGEMENT_OFFRES_WILAYA", error))
      .finally(() => setLoading(false));
  }, [wilaya, page]);

  if (notFound) return <Navigate to="/regions" replace />;
  if (!wilaya) return null;

  const totalPages = Math.ceil(count / 5) || 1;

  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
      <Seo
        title={`Offres d'emploi à ${nom}`}
        description={`Consultez ${count > 0 ? `${count} offre${count > 1 ? "s" : ""} d'emploi` : "les offres d'emploi"} à ${nom} sur TafTech, la plateforme de recrutement en Algérie.`}
      />

      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link to="/regions" className={`inline-flex items-center gap-1.5 text-sm ${tw.textPrimaryOnDark} hover:underline mb-3`}>
            <ArrowLeft size={14} /> Toutes les régions
          </Link>
          <h1 className={`text-3xl font-extrabold ${tw.textOnDark} tracking-tight mb-1`}>
            Offres d'emploi à {nom}
          </h1>
          <p className={`${tw.textPrimaryOnDark} text-base`}>
            {count > 0 ? `${count} offre${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}` : "Aucune offre disponible pour le moment"} dans la wilaya de {nom}.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`${tw.cardColors} rounded-2xl p-5 animate-pulse h-40`} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <MapPin size={40} className={`mx-auto mb-3 ${tw.textSubtle}`} />
            <p className={`${tw.textMuted700} font-medium`}>Aucune offre à {nom} pour le moment.</p>
            <Link to="/offres" className={`inline-block mt-3 text-sm ${tw.textPrimary} font-semibold hover:underline`}>
              Voir toutes les offres
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-lg border ${tw.borderBase} ${tw.surface} disabled:opacity-40 ${tw.hoverSurfaceMuted}`}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={`text-sm ${tw.textMuted700}`}>Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`p-2 rounded-lg border ${tw.borderBase} ${tw.surface} disabled:opacity-40 ${tw.hoverSurfaceMuted}`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RegionDetail;
