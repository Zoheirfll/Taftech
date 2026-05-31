import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? "bg-indigo-600" : "bg-slate-200"}`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0"}`}
    />
  </button>
);

const Settings = () => {
  const [notifications, setNotifications] = useState({
    notif_offres_exclusives: false,
    notif_newsletter: false,
    notif_mise_a_jour: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });

  useEffect(() => {
    const fetchParametres = async () => {
      try {
        const data = await jobsService.getParametres();
        setNotifications(data);
      } catch (error) {
        toast.error("Erreur lors du chargement.");
        reportError("ECHEC_CHARGEMENT_PARAMETRES", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchParametres();
  }, []);

  const handleToggle = async (field) => {
    const previousState = { ...notifications };
    const updated = { ...notifications, [field]: !notifications[field] };
    setNotifications(updated);
    try {
      await jobsService.updateParametres(updated);
      toast.success("Préférence enregistrée !");
    } catch (error) {
      setNotifications(previousState);
      reportError("ECHEC_MAJ_PARAMETRES", error);
      toast.error("Échec de la sauvegarde.");
    }
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm)
      return toast.error("Les mots de passe ne correspondent pas.");
    toast.success("Demande de changement envoyée.");
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  const inputClass =
    "flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>

      {/* NOTIFICATIONS */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Notifications
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            {
              field: "notif_offres_exclusives",
              label: "Offres exclusives",
              desc: "Recevez des offres spéciales de nos partenaires.",
            },
            {
              field: "notif_newsletter",
              label: "Newsletter",
              desc: "Tendances du marché et astuces professionnelles.",
            },
            {
              field: "notif_mise_a_jour",
              label: "Rappels de profil",
              desc: "Email si votre CV n'a pas été actualisé.",
            },
          ].map(({ field, label, desc }) => (
            <div
              key={field}
              className="flex justify-between items-center px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <Toggle
                checked={notifications[field]}
                onChange={() => handleToggle(field)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* MOT DE PASSE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Modifier mon mot de passe
          </h2>
        </div>
        <div className="p-5">
          <form
            onSubmit={handleUpdatePassword}
            className="flex flex-col md:flex-row gap-3"
          >
            <input
              type="password"
              placeholder="Mot de passe actuel"
              className={inputClass}
              onChange={(e) =>
                setPasswords({ ...passwords, old: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Nouveau"
              className={inputClass}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Confirmer"
              className={inputClass}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors"
            >
              Modifier
            </button>
          </form>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="bg-white border border-red-100 rounded-xl p-5 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-red-600">
            Supprimer mon compte
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cette action est irréversible.
          </p>
        </div>
        <button
          onClick={() => toast.error("Action désactivée pour l'instant.")}
          className="text-sm font-medium text-red-500 hover:underline"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
};

export default Settings;
