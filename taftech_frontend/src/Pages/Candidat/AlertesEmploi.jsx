import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { Bell, Trash2, Plus, X } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { tw } from "../../theme";

const INPUT_CLASS = `w-full px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`;

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
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.borderPrimary}`}></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={tw.pageTitleGrand}>Alertes d'emploi</h1>
          <p className={`${tw.bodyTextGrand} mt-0.5`}>
            Recevez les offres qui correspondent à vos critères.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-sm font-bold rounded-xl transition-colors shadow-sm`}
        >
          <Plus size={16} /> Créer une alerte
        </button>
      </div>

      <InfoBanner storageKey="alertes_emploi" title="Comment fonctionnent les alertes ?">
        Définissez des mots-clés (ex: "Comptable", "Développeur React") et optionnellement une wilaya.
        TAFTECH vous envoie un email <strong>quotidien ou hebdomadaire</strong> dès qu'une nouvelle offre correspond à vos critères.
        Vous pouvez activer/désactiver chaque alerte à tout moment.
      </InfoBanner>

      <div className={`${tw.card} rounded-2xl overflow-hidden`}>
        {alertes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${tw.emptyStateIconCircle}`}>
              <Bell size={24} />
            </div>
            <h3 className={`text-sm font-semibold ${tw.textStrong} mb-1`}>
              Aucune alerte
            </h3>
            <p className={`text-xs ${tw.textMuted700} max-w-xs`}>
              Créez une alerte pour recevoir les opportunités correspondant à
              vos critères.
            </p>
          </div>
        ) : (
          <div className={`divide-y ${tw.divideBase}`}>
            {alertes.map((alerte) => (
              <div
                key={alerte.id}
                className="flex justify-between items-center px-5 py-4"
              >
                <div>
                  <p className={`text-sm font-semibold ${tw.textStrong}`}>
                    {alerte.mots_cles}
                  </p>
                  <p className={`text-xs ${tw.textMuted700} mt-0.5`}>
                    {alerte.wilaya ? (alerte.wilaya.split(" - ")[1] || alerte.wilaya) : "Toute l'Algérie"} ·{" "}
                    {alerte.frequence === "QUOTIDIENNE"
                      ? "Quotidienne"
                      : "Hebdomadaire"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(alerte.id, alerte.est_active)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${alerte.est_active ? tw.toggleTrackOn : tw.toggleTrackOff}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full transition ${tw.toggleThumb} ${alerte.est_active ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(alerte.id)}
                    className={`p-1.5 rounded-lg transition-colors ${tw.deleteIconButton}`}
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
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${tw.modalOverlayLight}`}>
          <div className={`${tw.surface} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden`}>
            <div className={`flex justify-between items-center px-6 py-4 border-b ${tw.borderSubtle}`}>
              <h3 className={`text-base font-bold ${tw.textStrong}`}>
                Créer une alerte
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${tw.modalCloseButton}`}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateAlerte} className="p-6 space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
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
                <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
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
                <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
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
                  className={`flex-1 py-3 text-base font-semibold rounded-xl transition-colors ${tw.buttonCancelSoft}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-base font-bold rounded-xl transition-colors`}
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
