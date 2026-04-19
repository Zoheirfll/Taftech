import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast"; // <-- IMPORT DU TOAST

const AdminEntreprises = () => {
  const [entreprises, setEntreprises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);

  useEffect(() => {
    chargerEntreprises();
  }, []);

  const chargerEntreprises = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminEntreprises();
      setEntreprises(data);
    } catch (err) {
      toast.error(err.message || "Erreur de chargement des entreprises."); // <-- TOAST ERROR
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApprobation = async (id, statutActuel) => {
    const action = statutActuel ? "suspendre" : "approuver";
    if (window.confirm(`Voulez-vous vraiment ${action} cette entreprise ?`)) {
      try {
        await jobsService.moderateEntreprise(id, {
          est_approuvee: !statutActuel,
        });
        chargerEntreprises();
        toast.success(
          `L'entreprise a été ${statutActuel ? "suspendue" : "approuvée"} avec succès !`,
        ); // <-- TOAST SUCCESS
      } catch (err) {
        toast.error("Erreur lors de la modification du statut.", err); // <-- TOAST ERROR
      }
    }
  };

  if (loading)
    return (
      <div className="text-center p-20 font-bold animate-pulse text-blue-600">
        Chargement des entreprises...
      </div>
    );

  return (
    <div>
      <h2 className="text-3xl font-black text-gray-900 mb-8">
        Validation des Entreprises
      </h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-400 uppercase tracking-widest">
              <th className="p-6">Entreprise & RC</th>
              <th className="p-6">Contact Responsable</th>
              <th className="p-6">Statut</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entreprises.map((ent) => (
              <tr key={ent.id} className="hover:bg-gray-50 transition">
                <td className="p-6">
                  <p className="font-black text-gray-900 text-lg">
                    {ent.nom_entreprise}
                  </p>
                  <p className="text-xs text-gray-500 font-bold mt-1">
                    Secteur: {ent.secteur_activite}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    RC: {ent.registre_commerce}
                  </p>
                </td>
                <td className="p-6">
                  <p className="font-bold text-sm text-gray-800">
                    {ent.last_name} {ent.first_name}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">✉️ {ent.email}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    📞 {ent.telephone}
                  </p>
                </td>
                <td className="p-6">
                  {ent.est_approuvee ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">
                      ✓ VÉRIFIÉE
                    </span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-black">
                      ⏳ EN ATTENTE
                    </span>
                  )}
                </td>
                <td className="p-6 text-right space-x-2">
                  <button
                    onClick={() => setSelectedEntreprise(ent)}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-xs transition"
                  >
                    👁️ Voir
                  </button>
                  <button
                    onClick={() =>
                      handleToggleApprobation(ent.id, ent.est_approuvee)
                    }
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition ${ent.est_approuvee ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-500 text-white hover:bg-green-600 shadow-md"}`}
                  >
                    {ent.est_approuvee ? "Bloquer" : "Approuver"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FENÊTRE DE DÉTAILS DE L'ENTREPRISE */}
      {selectedEntreprise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  {selectedEntreprise.nom_entreprise}
                </h2>
                <p className="text-blue-600 font-bold">
                  📍 Siège : {selectedEntreprise.wilaya_siege}
                </p>
              </div>
              <button
                onClick={() => setSelectedEntreprise(null)}
                className="text-gray-400 hover:text-red-500 text-2xl font-black"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Informations Légales
                </p>
                <p className="font-black mt-2 font-mono bg-white border p-2 rounded">
                  RC: {selectedEntreprise.registre_commerce}
                </p>
                <p className="font-medium mt-2 text-sm">
                  Secteur : {selectedEntreprise.secteur_activite}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Contact Recruteur
                </p>
                <p className="font-bold mt-2">
                  {selectedEntreprise.last_name} {selectedEntreprise.first_name}
                </p>
                <p className="text-sm mt-1">📧 {selectedEntreprise.email}</p>
                <p className="text-sm mt-1">
                  📞 {selectedEntreprise.telephone}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-black text-gray-800 uppercase text-sm mb-2">
                Présentation de l'entreprise
              </h3>
              <p className="text-sm bg-gray-50 p-4 rounded-lg border whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
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
