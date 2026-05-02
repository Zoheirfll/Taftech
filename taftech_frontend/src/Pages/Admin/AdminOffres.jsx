import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";

const AdminOffres = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- ÉTATS POUR LA RECHERCHE ET PAGINATION ---
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- ÉTATS POUR LES MODALS ---
  const [editingOffre, setEditingOffre] = useState(null);
  const [rejectingOffre, setRejectingOffre] = useState(null);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [motifRejet, setMotifRejet] = useState("");

  // Fonction de chargement mise à jour pour accepter le terme de recherche
  const chargerOffres = useCallback(async () => {
    setLoading(true);
    try {
      // On envoie la page actuelle et le terme de recherche au backend
      const data = await jobsService.getAdminOffres(currentPage, searchTerm);

      if (data.results) {
        setOffres(data.results);
        // Calcul du nombre de pages basé sur un max de 10 par page (data.count)
        setTotalPages(Math.ceil(data.count / 5));
      } else {
        setOffres(data);
      }
    } catch (err) {
      toast.error(
        "Erreur d'accès aux offres. Êtes-vous sûr d'être connecté en tant qu'Admin ?",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  // Utilisation d'un debounce (délai) pour ne pas surcharger le serveur à chaque lettre
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      chargerOffres();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [chargerOffres]);

  const handleApprouver = async (id) => {
    if (window.confirm("Publier cette offre en ligne ?")) {
      try {
        await jobsService.moderateOffre(id, {
          statut_moderation: "APPROUVEE",
          motif_rejet: "",
        });
        chargerOffres();
        toast.success("Offre approuvée et en ligne !");
      } catch (err) {
        (toast.error("Erreur lors de l'approbation."), console.error(err));
      }
    }
  };

  const handleRefuserSubmit = async () => {
    if (!motifRejet.trim()) return toast.error("Veuillez saisir un motif.");
    try {
      await jobsService.moderateOffre(rejectingOffre.id, {
        statut_moderation: "REJETEE",
        motif_rejet: motifRejet,
      });
      setRejectingOffre(null);
      setMotifRejet("");
      chargerOffres();
      toast.success("L'offre a été rejetée.");
    } catch (err) {
      (toast.error("Erreur lors du rejet de l'offre."), console.error(err));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await jobsService.moderateOffre(editingOffre.id, {
        titre: editingOffre.titre,
        description: editingOffre.description,
      });
      setEditingOffre(null);
      chargerOffres();
      toast.success("Offre corrigée avec succès !");
    } catch (err) {
      (toast.error("Erreur lors de la modification."), console.error(err));
    }
  };

  const getBadge = (offre) => {
    if (offre.est_cloturee) {
      return (
        <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
          🔒 CLÔTURÉE
        </span>
      );
    }
    if (offre.statut_moderation === "APPROUVEE")
      return (
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
          EN LIGNE
        </span>
      );
    if (offre.statut_moderation === "REJETEE")
      return (
        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
          REJETÉE
        </span>
      );
    return (
      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
        EN ATTENTE
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER AVEC RECHERCHE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">
          Modération des Offres
        </h2>

        <div className="relative group">
          <input
            type="text"
            placeholder="Rechercher un poste ou une entreprise..."
            className="w-full md:w-80 p-4 pl-12 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // On revient à la page 1 lors d'une recherche
            }}
          />
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-50">
            <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
              <th className="p-6">Offre & Entreprise</th>
              <th className="p-6">Date</th>
              <th className="p-6">Statut</th>
              <th className="p-6 text-right">Actions Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && offres.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="p-20 text-center font-black text-blue-600 animate-pulse"
                >
                  CHARGEMENT DES OFFRES...
                </td>
              </tr>
            ) : offres.length > 0 ? (
              offres.map((offre) => (
                <tr key={offre.id} className="hover:bg-gray-50/50 transition">
                  <td className="p-6">
                    <p className="font-black text-gray-900">{offre.titre}</p>
                    <p className="text-xs text-blue-600 font-bold mt-1">
                      🏢 {offre.entreprise?.nom_entreprise || "Inconnue"}
                    </p>
                    {offre.motif_rejet && (
                      <p className="text-[9px] text-red-500 mt-2 bg-red-50 inline-block px-2 py-0.5 rounded italic font-bold">
                        Motif : {offre.motif_rejet}
                      </p>
                    )}
                  </td>
                  <td className="p-6 text-xs text-gray-500 font-bold">
                    {new Date(offre.date_publication).toLocaleDateString(
                      "fr-FR",
                    )}
                  </td>
                  <td className="p-6">{getBadge(offre)}</td>
                  <td className="p-6 text-right space-x-2">
                    <button
                      onClick={() => setSelectedOffre(offre)}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-xl transition"
                      title="Voir les détails"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => setEditingOffre(offre)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-xl transition"
                      title="Corriger"
                    >
                      ✏️
                    </button>
                    {offre.statut_moderation !== "APPROUVEE" &&
                      !offre.est_cloturee && (
                        <button
                          onClick={() => handleApprouver(offre.id)}
                          className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-xl transition"
                          title="Approuver"
                        >
                          ✅
                        </button>
                      )}
                    {offre.statut_moderation !== "REJETEE" &&
                      !offre.est_cloturee && (
                        <button
                          onClick={() => setRejectingOffre(offre)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-xl transition"
                          title="Refuser"
                        >
                          ❌
                        </button>
                      )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  className="p-20 text-center text-gray-400 font-bold italic"
                >
                  Aucune offre trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-6 py-2 font-black text-xs rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 transition"
          >
            ← PRÉCÉDENT
          </button>
          <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-lg uppercase tracking-widest">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages || loading}
            className="px-6 py-2 font-black text-xs rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 transition"
          >
            SUIVANT →
          </button>
        </div>
      )}

      {/* --- MODAL : VOIR DÉTAILS (Inchangé) --- */}
      {selectedOffre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">
                  {selectedOffre.titre}
                </h2>
                <p className="text-blue-600 font-bold text-sm">
                  🏢 {selectedOffre.entreprise?.nom_entreprise} | 📍{" "}
                  {selectedOffre.wilaya} ({selectedOffre.commune})
                </p>
              </div>
              <button
                onClick={() => setSelectedOffre(null)}
                className="text-gray-400 hover:text-red-500 text-2xl font-black transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase">
                  Contrat
                </p>
                <p className="font-black text-gray-800 text-xs">
                  {selectedOffre.type_contrat}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase">
                  Expérience
                </p>
                <p className="font-black text-gray-800 text-xs">
                  {selectedOffre.experience_requise}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase">
                  Salaire
                </p>
                <p className="font-black text-gray-800 text-xs">
                  {selectedOffre.salaire_propose || "N/P"}
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-2">
                  Diplôme / Spécialité
                </h3>
                <p className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 font-bold text-gray-700">
                  {selectedOffre.diplome} - {selectedOffre.specialite}
                </p>
              </div>
              <div>
                <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-2">
                  Description
                </h3>
                <p className="text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-600 whitespace-pre-line leading-relaxed">
                  {selectedOffre.description}
                </p>
              </div>
              <div>
                <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-2">
                  Missions
                </h3>
                <p className="text-sm bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 whitespace-pre-line leading-relaxed font-medium">
                  {selectedOffre.missions}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL : ÉDITION (Inchangé) --- */}
      {editingOffre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl">
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight">
              Corriger l'offre
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Titre du poste
                </label>
                <input
                  type="text"
                  value={editingOffre.titre}
                  onChange={(e) =>
                    setEditingOffre({ ...editingOffre, titre: e.target.value })
                  }
                  className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 mt-1 font-bold outline-none focus:border-blue-600 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Description
                </label>
                <textarea
                  rows="5"
                  value={editingOffre.description}
                  onChange={(e) =>
                    setEditingOffre({
                      ...editingOffre,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 mt-1 outline-none focus:border-blue-600 transition-all text-sm font-medium"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingOffre(null)}
                  className="px-6 py-3 bg-gray-100 rounded-xl font-black text-xs uppercase transition hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL : REJET (Inchangé) --- */}
      {rejectingOffre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-xl font-black mb-2 text-red-600 uppercase tracking-tight">
              Rejeter l'offre
            </h2>
            <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-widest text-[10px]">
              Précisez le motif pour le recruteur
            </p>
            <textarea
              rows="4"
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              placeholder="Ex: Le titre n'est pas clair ou le salaire est manquant..."
              className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 mb-6 font-medium outline-none focus:border-red-500 transition-all"
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectingOffre(null)}
                className="px-6 py-3 bg-gray-100 rounded-xl font-black text-xs uppercase hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuserSubmit}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-red-200 hover:bg-red-700 transition"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOffres;
