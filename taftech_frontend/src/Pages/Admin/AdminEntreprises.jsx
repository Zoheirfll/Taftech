import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";

const AdminEntreprises = () => {
  const [entreprises, setEntreprises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);

  // --- RECHERCHE ET PAGINATION ---
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stabilisation de la fonction avec useCallback
  const chargerEntreprises = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminEntreprises(
        currentPage,
        searchTerm,
      );
      setEntreprises(data.results || []);
      setTotalPages(Math.ceil(data.count / 5) || 1);
    } catch (err) {
      toast.error(err.message || "Erreur de chargement des entreprises.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  // Déclenchement automatique de la recherche (Debounce 300ms)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      chargerEntreprises();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [chargerEntreprises]);

  const handleToggleApprobation = async (id, statutActuel) => {
    const action = statutActuel ? "suspendre" : "approuver";
    if (window.confirm(`Voulez-vous vraiment ${action} cette entreprise ?`)) {
      try {
        await jobsService.moderateEntreprise(id, {
          est_approuvee: !statutActuel,
        });
        chargerEntreprises();
        toast.success(`Statut mis à jour avec succès !`);
      } catch (err) {
        (toast.error("Erreur lors de la modification du statut."),
          console.error(err));
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER + BARRE DE RECHERCHE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">
          Validation des Entreprises
        </h2>

        <div className="relative group">
          <input
            type="text"
            placeholder="Rechercher par nom ou RC..."
            className="w-full md:w-80 p-4 pl-12 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset à la page 1 si on change la recherche
            }}
          />
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
      </div>

      {/* TABLEAU DES RÉSULTATS */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
              <th className="p-6">Entreprise & RC</th>
              <th className="p-6">Contact Responsable</th>
              <th className="p-6">Statut</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && entreprises.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="p-20 text-center font-black text-blue-600 animate-pulse uppercase text-xs tracking-tighter"
                >
                  Synchronisation en cours...
                </td>
              </tr>
            ) : (
              entreprises.map((ent) => (
                <tr key={ent.id} className="hover:bg-gray-50/50 transition">
                  <td className="p-6">
                    <p className="font-black text-gray-900 text-lg">
                      {ent.nom_entreprise}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">
                      Secteur: {ent.secteur_activite}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-1">
                      RC: {ent.registre_commerce}
                    </p>
                  </td>
                  <td className="p-6">
                    <p className="font-bold text-sm text-gray-800">
                      {ent.last_name} {ent.first_name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      ✉️ {ent.email}
                    </p>
                  </td>
                  <td className="p-6">
                    {ent.est_approuvee ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        ✓ VÉRIFIÉE
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        ⏳ EN ATTENTE
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-right space-x-2">
                    <button
                      onClick={() => setSelectedEntreprise(ent)}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl font-black text-[10px] transition"
                    >
                      VOIR
                    </button>
                    <button
                      onClick={() =>
                        handleToggleApprobation(ent.id, ent.est_approuvee)
                      }
                      className={`px-4 py-2 rounded-xl font-black text-[10px] transition ${ent.est_approuvee ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-600 text-white shadow-md hover:bg-green-700"}`}
                    >
                      {ent.est_approuvee ? "BLOQUER" : "APPROUVER"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="px-6 py-2 font-black text-xs rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-30 transition"
          >
            ← PRÉCÉDENT
          </button>

          <span className="font-black text-xs text-blue-600 bg-blue-50 px-4 py-2 rounded-lg uppercase tracking-widest">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || loading}
            className="px-6 py-2 font-black text-xs rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-30 transition"
          >
            SUIVANT →
          </button>
        </div>
      )}

      {/* --- MODAL DE DÉTAILS --- */}
      {selectedEntreprise && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl animate-slideUp">
            <div className="flex justify-between items-start mb-6 border-b pb-4 border-gray-100">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">
                  {selectedEntreprise.nom_entreprise}
                </h2>
                <p className="text-blue-600 font-bold text-sm">
                  📍 Siège : {selectedEntreprise.wilaya_siege}{" "}
                  {selectedEntreprise.commune_siege
                    ? `(${selectedEntreprise.commune_siege})`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedEntreprise(null)}
                className="text-gray-400 hover:text-red-500 text-2xl font-black transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">
                  Informations Légales
                </p>
                <p className="font-black text-gray-800 font-mono bg-white border border-gray-200 p-2 rounded-lg text-xs">
                  RC: {selectedEntreprise.registre_commerce}
                </p>
                <p className="font-bold mt-2 text-xs text-gray-600 uppercase">
                  Secteur : {selectedEntreprise.secteur_activite}
                </p>
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">
                  Contact Recruteur
                </p>
                <p className="font-black text-gray-800 text-sm">
                  {selectedEntreprise.last_name} {selectedEntreprise.first_name}
                </p>
                <p className="text-xs mt-1 font-bold text-blue-600">
                  📧 {selectedEntreprise.email}
                </p>
                <p className="text-xs mt-1 font-bold text-gray-500">
                  📞 {selectedEntreprise.telephone}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-3">
                Présentation de l'entreprise
              </h3>
              <p className="text-sm bg-gray-50 p-6 rounded-2xl border border-gray-100 text-gray-700 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                {selectedEntreprise.description ||
                  "Aucune présentation fournie."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEntreprises;
