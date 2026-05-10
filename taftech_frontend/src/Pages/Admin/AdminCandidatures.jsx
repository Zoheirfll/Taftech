import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter"; // 👇 Import de la télémétrie ajouté

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
      setTotalPages(Math.ceil(data.count / 10)); // 10 est le page_size défini dans Django
    } catch (err) {
      toast.error("Erreur lors du chargement des candidatures.");
      // 🛑 Remplacement de console.error par reportError
      reportError("ECHEC_CHARGEMENT_CANDIDATURES_ADMIN", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatures(page, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // On revient à la première page lors d'une nouvelle recherche
    fetchCandidatures(1, searchTerm);
  };

  // 👇 FONCTION POUR L'EXPORT EXCEL SÉCURISÉ 👇
  const handleExport = async () => {
    const toastId = toast.loading("Génération du fichier en cours...");
    try {
      const blob = await jobsService.exportCandidatures();

      // Magie Javascript pour forcer le téléchargement du fichier reçu
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "candidatures_taftech.csv"); // Nom du fichier
      document.body.appendChild(link);
      link.click();

      // Nettoyage
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error("Erreur lors de l'exportation.");
      // 🛑 Remplacement de console.error par reportError
      reportError("ECHEC_EXPORT_EXCEL_CANDIDATURES", err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const getBadgeStyle = (statut) => {
    const styles = {
      RECUE: "bg-yellow-50 text-yellow-700 border-yellow-200",
      EN_COURS: "bg-blue-50 text-blue-700 border-blue-200",
      ENTRETIEN: "bg-orange-50 text-orange-700 border-orange-200",
      RETENU: "bg-green-100 text-green-800 border-green-300",
      REFUSE: "bg-red-50 text-red-700 border-red-200",
    };
    return styles[statut] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6 font-sans animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Candidatures Globales
          </h1>
          <p className="text-gray-500 font-bold mt-1 text-sm">
            Vue d'ensemble de tous les recrutements de la plateforme.
          </p>
        </div>

        {/* 👇 LE BOUTON EXCEL SÉCURISÉ 👇 */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 text-white font-black px-6 py-3 rounded-2xl hover:bg-green-700 hover:-translate-y-1 transition-all shadow-md"
        >
          📊 EXPORTER EN EXCEL
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher un candidat, une offre, une entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white font-black px-6 py-3 rounded-xl hover:bg-blue-700 transition-all"
          >
            🔍 Chercher
          </button>
        </form>
      </div>

      {/* Tableau des candidatures */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 text-left text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="p-4">Date & ID</th>
                <th className="p-4">Candidat</th>
                <th className="p-4">Offre & Entreprise</th>
                <th className="p-4 text-center">Score IA</th>
                <th className="p-4 text-center">Note Entretien</th>
                <th className="p-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-blue-600 font-bold animate-pulse"
                  >
                    Chargement des données...
                  </td>
                </tr>
              ) : candidatures.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-gray-400 font-bold italic"
                  >
                    Aucune candidature trouvée.
                  </td>
                </tr>
              ) : (
                candidatures.map((cand) => (
                  <tr
                    key={cand.id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="p-4 align-middle">
                      <p className="text-xs font-black text-gray-900">
                        {new Date(cand.date_postulation).toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold">
                        ID: #{cand.id}
                      </p>
                    </td>
                    <td className="p-4 align-middle">
                      <p className="text-sm font-black text-gray-900 uppercase">
                        {cand.candidat
                          ? `${cand.candidat.last_name} ${cand.candidat.first_name}`
                          : `${cand.nom_rapide} ${cand.prenom_rapide}`}
                      </p>
                      <p className="text-xs text-blue-600 font-bold">
                        {cand.est_rapide
                          ? "⚡ Rapide (Sans compte)"
                          : "Compte TafTech"}
                      </p>
                    </td>
                    <td className="p-4 align-middle">
                      <p className="text-sm font-black text-gray-900 truncate max-w-[250px]">
                        {cand.offre_titre}
                      </p>
                      <p className="text-xs text-gray-500 font-bold">
                        🏢 {cand.entreprise_nom}
                      </p>
                    </td>
                    <td className="p-4 align-middle text-center">
                      {cand.est_rapide ? (
                        <span className="text-[10px] text-gray-400 font-bold">
                          N/A
                        </span>
                      ) : (
                        <span className="text-sm font-black text-gray-800">
                          {cand.score_matching}%
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-center">
                      {cand.note_globale ? (
                        <span className="bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 rounded-lg text-xs font-black">
                          ⭐ {cand.note_globale}/20
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold italic">
                          Non évalué
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <span
                        className={`text-[10px] font-black px-3 py-1.5 rounded-lg border ${getBadgeStyle(cand.statut)}`}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-center gap-2 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-lg disabled:opacity-50 text-sm hover:bg-gray-100"
            >
              Précédent
            </button>
            <span className="px-4 py-2 text-sm font-black text-gray-800">
              Page {page} sur {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-lg disabled:opacity-50 text-sm hover:bg-gray-100"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCandidatures;
