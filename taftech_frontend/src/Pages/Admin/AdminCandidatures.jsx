import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Search, Download } from "lucide-react";
import { tw } from "../../theme";

const getBadgeStyle = (statut) => {
  const styles = {
    RECUE: `${tw.bgWarningSoft} ${tw.textWarning} ${tw.borderWarning}`,
    EN_COURS: `${tw.bgBlueSoft} ${tw.textBlue} ${tw.borderBlue}`,
    ENTRETIEN: `${tw.bgOrangeSoft} ${tw.textOrange} ${tw.borderOrange}`,
    RETENU: `${tw.bgSuccessSoft} ${tw.textSuccess} ${tw.borderSuccess}`,
    REFUSE: `${tw.bgErrorSoft} ${tw.textError} ${tw.borderError}`,
  };
  return styles[statut] || `${tw.badgeNeutral}`;
};

const AdminCandidatures = () => {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCandidatures = async (currentPage = 1, search = "") => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminCandidatures(currentPage, search);
      setCandidatures(data.results);
      setTotalPages(Math.ceil(data.count / 10));
    } catch (err) {
      toast.error("Erreur lors du chargement.");
      reportError("ECHEC_CHARGEMENT_CANDIDATURES_ADMIN", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatures(page, searchTerm);
  }, [page]); // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCandidatures(1, searchTerm);
  };

  const handleExport = async () => {
    const toastId = toast.loading("Génération du fichier...");
    try {
      const blob = await jobsService.exportCandidatures();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "candidatures_taftech.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error("Erreur lors de l'exportation.");
      reportError("ECHEC_EXPORT_EXCEL_CANDIDATURES", err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>
            Candidatures globales
          </h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Vue d'ensemble de tous les recrutements.
          </p>
        </div>
        <button
          onClick={handleExport}
          className={`flex items-center gap-2 px-4 py-2.5 ${tw.buttonSuccessSolid} text-sm font-semibold rounded-lg transition-colors`}
        >
          <Download size={15} /> Exporter CSV
        </button>
      </div>

      <div className={`${tw.card} p-4`}>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`}
            />
            <input
              type="text"
              placeholder="Candidat, offre, entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`}
            />
          </div>
          <button
            type="submit"
            className={`px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}
          >
            Chercher
          </button>
        </form>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className={`${tw.surfaceMuted} border-b ${tw.borderSubtle} text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-4 py-3 text-left">Date & ID</th>
                <th className="px-4 py-3 text-left">Candidat</th>
                <th className="px-4 py-3 text-left">Offre & Entreprise</th>
                <th className="px-4 py-3 text-center">Score IA</th>
                <th className="px-4 py-3 text-center">Note entretien</th>
                <th className="px-4 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className={tw.divideBase}>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className={`py-12 text-center text-sm font-medium ${tw.textPrimary} animate-pulse`}
                  >
                    Chargement...
                  </td>
                </tr>
              ) : candidatures.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className={`py-12 text-center text-sm ${tw.textMuted} italic`}
                  >
                    Aucune candidature trouvée.
                  </td>
                </tr>
              ) : (
                candidatures.map((cand) => (
                  <tr
                    key={cand.id}
                    className={tw.rowHover}
                  >
                    <td className="px-4 py-3">
                      <p className={`text-xs font-semibold ${tw.textStrong}`}>
                        {new Date(cand.date_postulation).toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                      <p className={`text-[10px] ${tw.textMuted}`}>#{cand.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-semibold ${tw.textStrong}`}>
                        {cand.candidat
                          ? `${cand.candidat.last_name} ${cand.candidat.first_name}`
                          : `${cand.nom_rapide} ${cand.prenom_rapide}`}
                      </p>
                      <p className={`text-xs ${tw.textPrimary} font-medium`}>
                        {cand.est_rapide ? "⚡ Rapide" : "Compte TAFTECH"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-semibold ${tw.textStrong} truncate max-w-[200px]`}>
                        {cand.offre_titre}
                      </p>
                      <p className={`text-xs ${tw.textMuted700}`}>
                        {cand.entreprise_nom}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cand.est_rapide ? (
                        <span className={`text-xs ${tw.textMuted}`}>N/A</span>
                      ) : (
                        <span className={`text-sm font-semibold ${tw.textSlate800}`}>
                          {cand.score_matching}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cand.note_globale ? (
                        <span className={`px-2.5 py-1 ${tw.bgVioletSoft} ${tw.textViolet} border ${tw.borderViolet} text-xs font-semibold rounded-full`}>
                          ⭐ {cand.note_globale}/20
                        </span>
                      ) : (
                        <span className={`text-xs ${tw.textMuted} italic`}>
                          Non évalué
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${getBadgeStyle(cand.statut)}`}
                      >
                        {cand.statut.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className={`px-4 py-3 border-t ${tw.borderSubtle} flex items-center justify-between ${tw.surfaceMuted}`}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-3 py-1.5 ${tw.surface} border ${tw.borderBase} ${tw.textMuted} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle} transition-colors`}
            >
              ← Précédent
            </button>
            <span className={`text-xs font-medium ${tw.textMuted}`}>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-3 py-1.5 ${tw.surface} border ${tw.borderBase} ${tw.textMuted} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle} transition-colors`}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCandidatures;
