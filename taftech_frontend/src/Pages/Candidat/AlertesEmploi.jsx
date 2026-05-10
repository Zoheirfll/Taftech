import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter"; // 👇 Import de la télémétrie

const AlertesEmploi = () => {
  const [alertes, setAlertes] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newAlerte, setNewAlerte] = useState({
    mots_cles: "",
    wilaya: "",
    frequence: "QUOTIDIENNE",
  });

  // 1. CHARGER LES ALERTES ET LES CONSTANTES (WILAYAS) AU DÉMARRAGE
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertesData, constantsData] = await Promise.all([
          jobsService.getAlertes(),
          jobsService.getConstants(),
        ]);

        setAlertes(alertesData);
        setWilayas(constantsData.wilayas);
      } catch (error) {
        toast.error("Erreur lors du chargement des données.");
        reportError("ECHEC_CHARGEMENT_ALERTES", error); // 🛑 Télémétrie
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. CRÉER UNE ALERTE
  const handleCreateAlerte = async (e) => {
    e.preventDefault();
    if (!newAlerte.mots_cles.trim()) {
      return toast.error("Les mots-clés sont obligatoires.");
    }

    const payload = { ...newAlerte };
    if (!payload.wilaya) {
      delete payload.wilaya;
    }

    try {
      const response = await jobsService.createAlerte(payload);
      setAlertes([response, ...alertes]);
      toast.success("Alerte créée avec succès !");
      setIsModalOpen(false);
      setNewAlerte({ mots_cles: "", wilaya: "", frequence: "QUOTIDIENNE" });
    } catch (error) {
      reportError("ECHEC_CREATION_ALERTE", error); // 🛑 Télémétrie
      toast.error("Impossible de créer l'alerte. Vérifiez vos champs.");
    }
  };

  // 3. ACTIVER/DÉSACTIVER UNE ALERTE
  const handleToggle = async (alerteId, currentState) => {
    setAlertes(
      alertes.map((a) =>
        a.id === alerteId ? { ...a, est_active: !currentState } : a,
      ),
    );
    try {
      await jobsService.toggleAlerte(alerteId, !currentState);
      toast.success(currentState ? "Alerte désactivée" : "Alerte activée");
    } catch (error) {
      setAlertes(
        alertes.map((a) =>
          a.id === alerteId ? { ...a, est_active: currentState } : a,
        ),
      );
      toast.error("Erreur lors de la modification.");
      reportError("ECHEC_TOGGLE_ALERTE", error); // 🛑 Télémétrie
    }
  };

  // 4. SUPPRIMER UNE ALERTE
  const handleDelete = async (alerteId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette alerte ?"))
      return;
    try {
      await jobsService.deleteAlerte(alerteId);
      setAlertes(alertes.filter((a) => a.id !== alerteId));
      toast.success("Alerte supprimée.");
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
      reportError("ECHEC_SUPPRESSION_ALERTE", error); // 🛑 Télémétrie
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-fadeIn relative">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Alertes d'emploi
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
        >
          <span>+</span> Créer une alerte
        </button>
      </div>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 min-h-[300px]">
        {alertes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <svg
                className="w-10 h-10 text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                ></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Aucune alerte enregistrée
            </h3>
            <p className="text-gray-500 max-w-md">
              Créez une alerte pour recevoir par email les dernières
              opportunités d'emploi qui correspondent à vos critères.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alertes.map((alerte) => (
              <div
                key={alerte.id}
                className="flex justify-between items-center p-6 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow"
              >
                <div>
                  <h4 className="font-bold text-lg text-gray-900">
                    {alerte.mots_cles}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {alerte.wilaya ? alerte.wilaya : "Toute l'Algérie"} •{" "}
                    {alerte.frequence === "QUOTIDIENNE"
                      ? "Chaque jour"
                      : "Chaque semaine"}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <label
                    className="relative inline-flex items-center cursor-pointer"
                    title={alerte.est_active ? "Désactiver" : "Activer"}
                  >
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={alerte.est_active}
                      onChange={() =>
                        handleToggle(alerte.id, alerte.est_active)
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>

                  <button
                    onClick={() => handleDelete(alerte.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* POPUP MODALE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    ></path>
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Créer une alerte
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateAlerte} className="p-8 space-y-6">
              <p className="text-sm text-gray-500 text-center mb-6">
                Reçois par email les dernières opportunités d'emploi qui
                correspondent à ta recherche.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Mots clés <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Développeur React, Comptable..."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  value={newAlerte.mots_cles}
                  onChange={(e) =>
                    setNewAlerte({ ...newAlerte, mots_cles: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Région, Wilaya
                </label>
                <select
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium appearance-none"
                  value={newAlerte.wilaya}
                  onChange={(e) =>
                    setNewAlerte({ ...newAlerte, wilaya: e.target.value })
                  }
                >
                  <option value="">Toute l'Algérie (Toutes les wilayas)</option>
                  {wilayas.map((w, i) => (
                    <option key={i} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Fréquence
                </label>
                <select
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium appearance-none"
                  value={newAlerte.frequence}
                  onChange={(e) =>
                    setNewAlerte({ ...newAlerte, frequence: e.target.value })
                  }
                >
                  <option value="QUOTIDIENNE">Quotidienne</option>
                  <option value="HEBDOMADAIRE">Hebdomadaire</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 pt-4 mt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertesEmploi;
