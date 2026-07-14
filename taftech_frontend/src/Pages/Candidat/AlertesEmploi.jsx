import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { Bell, Trash2, Plus, X } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";

const INPUT_CLASS =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

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
        toast.error("Erreur lors du chargement.");
        reportError("ECHEC_CHARGEMENT_ALERTES", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCreateAlerte = async (e) => {
    e.preventDefault();
    if (!newAlerte.mots_cles.trim())
      return toast.error("Les mots-clés sont obligatoires.");
    const payload = { ...newAlerte };
    if (!payload.wilaya) delete payload.wilaya;
    try {
      const response = await jobsService.createAlerte(payload);
      setAlertes(prev => [response, ...prev]);
      toast.success("Alerte créée !");
      setIsModalOpen(false);
      setNewAlerte({ mots_cles: "", wilaya: "", frequence: "QUOTIDIENNE" });
    } catch (error) {
      reportError("ECHEC_CREATION_ALERTE", error);
      toast.error("Impossible de créer l'alerte.");
    }
  };

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
      setAlertes(prev =>
        prev.map((a) =>
          a.id === alerteId ? { ...a, est_active: currentState } : a,
        ),
      );
      toast.error("Erreur lors de la modification.");
      reportError("ECHEC_TOGGLE_ALERTE", error);
    }
  };

  const handleDelete = async (alerteId) => {
    if (!window.confirm("Supprimer cette alerte ?")) return;
    try {
      await jobsService.deleteAlerte(alerteId);
      setAlertes(prev => prev.filter((a) => a.id !== alerteId));
      toast.success("Alerte supprimée.");
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
      reportError("ECHEC_SUPPRESSION_ALERTE", error);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Alertes d'emploi</h1>
          <p className="text-base text-slate-500 mt-0.5">
            Recevez les offres qui correspondent à vos critères.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Créer une alerte
        </button>
      </div>

      <InfoBanner storageKey="alertes_emploi" title="Comment fonctionnent les alertes ?">
        Définissez des mots-clés (ex: "Comptable", "Développeur React") et optionnellement une wilaya.
        TAFTECH vous envoie un email <strong>quotidien ou hebdomadaire</strong> dès qu'une nouvelle offre correspond à vos critères.
        Vous pouvez activer/désactiver chaque alerte à tout moment.
      </InfoBanner>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {alertes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Bell size={24} className="text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Aucune alerte
            </h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Créez une alerte pour recevoir les opportunités correspondant à
              vos critères.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alertes.map((alerte) => (
              <div
                key={alerte.id}
                className="flex justify-between items-center px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {alerte.mots_cles}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {alerte.wilaya ? (alerte.wilaya.split(" - ")[1] || alerte.wilaya) : "Toute l'Algérie"} ·{" "}
                    {alerte.frequence === "QUOTIDIENNE"
                      ? "Quotidienne"
                      : "Hebdomadaire"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(alerte.id, alerte.est_active)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${alerte.est_active ? "bg-indigo-600" : "bg-slate-200"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${alerte.est_active ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(alerte.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Créer une alerte
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateAlerte} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Mots-clés *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Développeur React, Comptable..."
                  className={INPUT_CLASS}
                  value={newAlerte.mots_cles}
                  onChange={(e) =>
                    setNewAlerte({ ...newAlerte, mots_cles: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Wilaya
                </label>
                <select
                  className={INPUT_CLASS}
                  value={newAlerte.wilaya}
                  onChange={(e) =>
                    setNewAlerte({ ...newAlerte, wilaya: e.target.value })
                  }
                >
                  <option value="">Toute l'Algérie</option>
                  {wilayas.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Fréquence
                </label>
                <select
                  className={INPUT_CLASS}
                  value={newAlerte.frequence}
                  onChange={(e) =>
                    setNewAlerte({ ...newAlerte, frequence: e.target.value })
                  }
                >
                  <option value="QUOTIDIENNE">Quotidienne</option>
                  <option value="HEBDOMADAIRE">Hebdomadaire</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 text-base font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white text-base font-bold rounded-xl hover:bg-indigo-700 transition-colors"
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
