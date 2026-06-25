import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import { reportError } from "../../utils/errorReporter";
import api from "../../api/axiosConfig";
import InfoBanner from "../../Components/InfoBanner";

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
  const [estCompteGoogle, setEstCompteGoogle] = useState(false);
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [parametres, me] = await Promise.all([
          jobsService.getParametres(),
          api.get("accounts/me/"),
        ]);
        setNotifications(parametres);
        setEstCompteGoogle(me.data.est_compte_google || false);
      } catch (error) {
        toast.error("Erreur lors du chargement.");
        reportError("ECHEC_CHARGEMENT_PARAMETRES", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm)
      return toast.error("Les mots de passe ne correspondent pas.");
    if (passwords.new.length < 8)
      return toast.error("Le mot de passe doit contenir au moins 8 caractères.");
    setPwdLoading(true);
    try {
      await api.post("accounts/changer-mot-de-passe/", {
        ancien_mdp: passwords.old,
        nouveau_mdp: passwords.new,
      });
      toast.success(estCompteGoogle ? "Mot de passe défini avec succès !" : "Mot de passe modifié avec succès !");
      setPasswords({ old: "", new: "", confirm: "" });
      if (estCompteGoogle) setEstCompteGoogle(false);
    } catch (err) {
      const msg = err.response?.data?.error || "Erreur lors du changement.";
      toast.error(msg);
      reportError("ECHEC_CHANGER_MDP", err);
    } finally {
      setPwdLoading(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  const inputClass =
    "flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Paramètres</h1>

      <InfoBanner storageKey="settings_candidat" title="Vos préférences">
        Gérez vos <strong>notifications email</strong> (offres exclusives, newsletter, rappels CV) et votre <strong>mot de passe</strong>.
        Si votre compte a été créé avec Google, utilisez la section "Définir un mot de passe" pour pouvoir vous connecter sans Google.
      </InfoBanner>

      {/* NOTIFICATIONS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { field: "notif_offres_exclusives", label: "Offres exclusives", desc: "Recevez des offres spéciales de nos partenaires." },
            { field: "notif_newsletter", label: "Newsletter", desc: "Tendances du marché et astuces professionnelles." },
            { field: "notif_mise_a_jour", label: "Rappels de profil", desc: "Email si votre CV n'a pas été actualisé." },
          ].map(({ field, label, desc }) => (
            <div key={field} className="flex justify-between items-center px-5 py-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={notifications[field]} onChange={() => handleToggle(field)} />
            </div>
          ))}
        </div>
      </div>

      {/* MOT DE PASSE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {estCompteGoogle ? "Définir un mot de passe" : "Modifier mon mot de passe"}
          </h2>
          {estCompteGoogle && (
            <p className="text-xs text-slate-500 mt-1">
              Votre compte a été créé via Google. Définissez un mot de passe pour vous connecter sans Google.
            </p>
          )}
        </div>
        <div className="p-5">
          <form onSubmit={handleUpdatePassword} className="flex flex-col md:flex-row gap-3">
            {!estCompteGoogle && (
              <input
                type="password"
                placeholder="Mot de passe actuel"
                className={inputClass}
                value={passwords.old}
                onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
              />
            )}
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              className={inputClass}
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            />
            <input
              type="password"
              placeholder="Confirmer"
              className={inputClass}
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            />
            <button
              type="submit"
              disabled={pwdLoading}
              className="px-5 py-3 bg-slate-900 text-white text-base font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-60"
            >
              {pwdLoading ? "..." : estCompteGoogle ? "Définir" : "Modifier"}
            </button>
          </form>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="bg-white border border-red-100 rounded-2xl p-5 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-red-600">Supprimer mon compte</h2>
          <p className="text-xs text-slate-600 mt-0.5">Cette action est irréversible.</p>
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
