import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";

const AdminOffres = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- ÉTATS POUR LES MODALS ---
  const [editingOffre, setEditingOffre] = useState(null);
  const [rejectingOffre, setRejectingOffre] = useState(null);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [motifRejet, setMotifRejet] = useState("");

  // NOUVEAU : On utilise useCallback pour mémoriser la fonction et satisfaire ESLint
  const chargerOffres = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminOffres(currentPage);

      // Adaptation automatique : si Django envoie des pages (results) ou un tableau simple
      if (data.results) {
        setOffres(data.results);
        setTotalPages(Math.ceil(data.count / 10)); // On suppose 10 offres par page
      } else {
        setOffres(data);
      }
    } catch (err) {
      toast.error(
        "Erreur d'accès aux offres. Êtes-vous sûr d'être connecté en tant qu'Admin ?",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, [currentPage]); // Se recharge uniquement si currentPage change

  // Le useEffect est maintenant propre et sans erreurs !
  useEffect(() => {
    chargerOffres();
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
        toast.error("Erreur lors de l'approbation.", err);
      }
    }
  };

  const handleRefuserSubmit = async () => {
    try {
      await jobsService.moderateOffre(rejectingOffre.id, {
        statut_moderation: "REJETEE",
        motif_rejet: motifRejet,
      });
      setRejectingOffre(null);
      setMotifRejet("");
      chargerOffres();
      toast.success("L'offre a été rejetée et le recruteur sera notifié.");
    } catch (err) {
      toast.error("Erreur lors du rejet de l'offre.", err);
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
      toast.error("Erreur lors de la modification.", err);
    }
  };

  const getBadge = (statut) => {
    if (statut === "APPROUVEE")
      return (
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">
          EN LIGNE
        </span>
      );
    if (statut === "REJETEE")
      return (
        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black">
          REJETÉE
        </span>
      );
    return (
      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-black">
        EN ATTENTE
      </span>
    );
  };

  if (loading && offres.length === 0)
    return (
      <div className="text-center p-20 font-bold animate-pulse text-blue-600">
        Chargement des offres...
      </div>
    );

  return (
    <div>
      <h2 className="text-3xl font-black text-gray-900 mb-8">
        Modération des offres d'emploi
      </h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-400 uppercase tracking-widest">
              <th className="p-6">Offre & Entreprise</th>
              <th className="p-6">Date</th>
              <th className="p-6">Statut</th>
              <th className="p-6 text-right">Actions Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {offres.map((offre) => (
              <tr key={offre.id} className="hover:bg-gray-50 transition">
                <td className="p-6">
                  <p className="font-black text-gray-900">{offre.titre}</p>
                  <p className="text-xs text-blue-600 font-bold mt-1">
                    🏢 {offre.entreprise?.nom_entreprise || "Inconnue"}
                  </p>
                  {offre.motif_rejet && (
                    <p className="text-[10px] text-red-500 mt-2 bg-red-50 inline-block px-2 py-1 rounded">
                      Motif : {offre.motif_rejet}
                    </p>
                  )}
                </td>
                <td className="p-6 text-sm text-gray-500 font-medium">
                  {new Date(offre.date_publication).toLocaleDateString("fr-FR")}
                </td>
                <td className="p-6">{getBadge(offre.statut_moderation)}</td>
                <td className="p-6 text-right space-x-2">
                  <button
                    onClick={() => setSelectedOffre(offre)}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg"
                    title="Voir les détails"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => setEditingOffre(offre)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg"
                    title="Corriger le texte"
                  >
                    ✏️
                  </button>
                  {offre.statut_moderation !== "APPROUVEE" && (
                    <button
                      onClick={() => handleApprouver(offre.id)}
                      className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg"
                      title="Approuver"
                    >
                      ✅
                    </button>
                  )}
                  {offre.statut_moderation !== "REJETEE" && (
                    <button
                      onClick={() => setRejectingOffre(offre)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg"
                      title="Refuser"
                    >
                      ❌
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- LA BARRE DE PAGINATION EST ICI --- */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 font-bold text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            ← Précédent
          </button>
          <span className="text-sm font-black text-gray-600">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-4 py-2 font-bold text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* --- MODAL POUR VOIR TOUTE L'OFFRE --- */}
      {selectedOffre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  {selectedOffre.titre}
                </h2>
                <p className="text-blue-600 font-bold">
                  🏢 {selectedOffre.entreprise?.nom_entreprise} | 📍{" "}
                  {selectedOffre.wilaya} ({selectedOffre.commune})
                </p>
              </div>
              <button
                onClick={() => setSelectedOffre(null)}
                className="text-gray-400 hover:text-red-500 text-2xl font-black"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-xl border text-center">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Contrat
                </p>
                <p className="font-black mt-1 text-gray-800">
                  {selectedOffre.type_contrat}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border text-center">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Expérience
                </p>
                <p className="font-black mt-1 text-gray-800">
                  {selectedOffre.experience_requise}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border text-center">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Salaire
                </p>
                <p className="font-black mt-1 text-gray-800">
                  {selectedOffre.salaire_propose || "Non précisé"}
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-black text-gray-800 uppercase text-sm mb-2">
                  Diplôme / Spécialité
                </h3>
                <p className="text-sm bg-gray-50 p-3 rounded-lg border">
                  {selectedOffre.diplome} - {selectedOffre.specialite}
                </p>
              </div>
              <div>
                <h3 className="font-black text-gray-800 uppercase text-sm mb-2">
                  Description de l'offre
                </h3>
                <p className="text-sm bg-gray-50 p-4 rounded-lg border whitespace-pre-line leading-relaxed">
                  {selectedOffre.description}
                </p>
              </div>
              <div>
                <h3 className="font-black text-gray-800 uppercase text-sm mb-2">
                  Missions du poste
                </h3>
                <p className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-100 whitespace-pre-line leading-relaxed">
                  {selectedOffre.missions}
                </p>
              </div>
              <div>
                <h3 className="font-black text-gray-800 uppercase text-sm mb-2">
                  Profil recherché
                </h3>
                <p className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-100 whitespace-pre-line leading-relaxed">
                  {selectedOffre.profil_recherche}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL POUR L'ÉDITION --- */}
      {editingOffre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <h2 className="text-xl font-black mb-6">Corriger l'offre</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Titre
                </label>
                <input
                  type="text"
                  value={editingOffre.titre}
                  onChange={(e) =>
                    setEditingOffre({ ...editingOffre, titre: e.target.value })
                  }
                  className="w-full p-3 border rounded-xl bg-gray-50 mt-1 font-bold outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Description (Correction)
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
                  className="w-full p-3 border rounded-xl bg-gray-50 mt-1 outline-none focus:border-blue-600"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingOffre(null)}
                  className="px-6 py-2 bg-gray-100 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Sauvegarder les corrections
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL POUR REFUSER --- */}
      {rejectingOffre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-xl font-black mb-2 text-red-600">
              Rejeter l'offre
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Précisez le motif pour que le recruteur puisse corriger son
              annonce.
            </p>
            <textarea
              rows="4"
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              placeholder="Ex: Veuillez préciser le salaire..."
              className="w-full p-4 border rounded-xl bg-gray-50 mb-6 font-medium outline-none focus:border-red-500"
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectingOffre(null)}
                className="px-6 py-2 bg-gray-100 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuserSubmit}
                className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold"
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
