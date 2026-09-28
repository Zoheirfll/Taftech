import FieldError from "../../Components/FieldError";
import { extraireErreursChamps } from "../../utils/fieldErrors";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import { reportError } from "../../utils/errorReporter";
import InfoBanner from "../../Components/InfoBanner";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";

const NOTIF_FIELDS = [
  { field: "notif_offres_exclusives", label: "Offres exclusives", desc: "Recevez des offres spéciales de nos partenaires." },
  { field: "notif_newsletter", label: "Newsletter", desc: "Tendances du marché et astuces professionnelles." },
  { field: "notif_mise_a_jour", label: "Rappels de profil", desc: "Email si votre CV n'a pas été actualisé." },
];

const INPUT_CLASS = `flex-1 px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`;

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? tw.toggleTrackOn : tw.toggleTrackOff}`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full transition ${tw.toggleThumb} ${checked ? "translate-x-5" : "translate-x-0"}`}
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
  const [pwdErrors, setPwdErrors] = useState({});
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ confirmation: "", mot_de_passe: "" });
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [parametres, me] = await Promise.all([
          jobsService.getParametres(),
          authService.getMe(),
        ]);
        setNotifications(parametres);
        setEstCompteGoogle(me.est_compte_google || false);
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors du chargement."));
        reportError("ECHEC_CHARGEMENT_PARAMETRES", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggle = async (field) => {
    const previousState = notifications;
    const updated = { ...previousState, [field]: !previousState[field] };
    setNotifications(prev => ({ ...prev, [field]: !prev[field] }));
    try {
      await jobsService.updateParametres(updated);
      toast.success("Préférence enregistrée !");
    } catch (error) {
      setNotifications(previousState);
      reportError("ECHEC_MAJ_PARAMETRES", error);
      toast.error(apiErrMsg(error, "Échec de la sauvegarde."));
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwdErrors({});
    if (passwords.new !== passwords.confirm) {
      setPwdErrors({ confirm: "Les mots de passe ne correspondent pas." });
      return toast.error("Les mots de passe ne correspondent pas.");
    }
    if (passwords.new.length < 8) {
      setPwdErrors({ new: "Au moins 8 caractères." });
      return toast.error("Le mot de passe doit contenir au moins 8 caractères.");
    }
    setPwdLoading(true);
    try {
      await authService.changerMotDePasse({
        ancien_mdp: passwords.old,
        nouveau_mdp: passwords.new,
      });
      toast.success(estCompteGoogle ? "Mot de passe défini avec succès !" : "Mot de passe modifié avec succès !");
      setPasswords({ old: "", new: "", confirm: "" });
      if (estCompteGoogle) setEstCompteGoogle(false);
    } catch (err) {
      const msg = apiErrMsg(err, "Erreur lors du changement.");
      setPwdErrors(/ancien|actuel/i.test(msg) ? { old: msg } : /mot de passe/i.test(msg) ? { new: msg } : {});
      toast.error(msg);
      reportError("ECHEC_CHANGER_MDP_SETTINGS", err);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSupprimerCompte = async (e) => {
    e.preventDefault();
    if (deleteForm.confirmation.trim().toUpperCase() !== "SUPPRIMER") {
      return toast.error("Tapez SUPPRIMER pour confirmer.");
    }
    setDeleteLoading(true);
    try {
      await authService.supprimerCompte({
        confirmation: deleteForm.confirmation,
        mot_de_passe: deleteForm.mot_de_passe,
      });
      toast.success("Votre compte a été désactivé.");
      authService.logout("/login");
    } catch (error) {
      toast.error(apiErrMsg(error, "Erreur lors de la suppression."));
      reportError("ECHEC_SUPPRIMER_COMPTE_SETTINGS", error);
      setDeleteLoading(false);
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
      <h1 className={tw.pageTitleGrand}>Paramètres</h1>

      <InfoBanner storageKey="settings_candidat" title="Vos préférences">
        Gérez vos <strong>notifications email</strong> (offres exclusives, newsletter, rappels CV) et votre <strong>mot de passe</strong>.
        Si votre compte a été créé avec Google, utilisez la section "Définir un mot de passe" pour pouvoir vous connecter sans Google.
      </InfoBanner>

      {/* NOTIFICATIONS */}
      <div className={`${tw.card} rounded-2xl overflow-hidden`}>
        <div className={`px-5 py-4 border-b ${tw.borderSubtle}`}>
          <h2 className={`text-base font-semibold ${tw.textStrong}`}>Notifications</h2>
        </div>
        <div className={`divide-y ${tw.divideBase}`}>
          {NOTIF_FIELDS.map(({ field, label, desc }) => (
            <div key={field} className="flex justify-between items-center px-5 py-4">
              <div>
                <p className={`text-sm font-medium ${tw.textSlate800}`}>{label}</p>
                <p className={`text-xs ${tw.textMuted} mt-0.5`}>{desc}</p>
              </div>
              <Toggle checked={notifications[field]} onChange={() => handleToggle(field)} />
            </div>
          ))}
        </div>
      </div>

      {/* MOT DE PASSE */}
      <div className={`${tw.card} rounded-2xl overflow-hidden`}>
        <div className={`px-5 py-4 border-b ${tw.borderSubtle}`}>
          <h2 className={`text-base font-semibold ${tw.textStrong}`}>
            {estCompteGoogle ? "Définir un mot de passe" : "Modifier mon mot de passe"}
          </h2>
          {estCompteGoogle && (
            <p className={`text-xs ${tw.textMuted700} mt-1`}>
              Votre compte a été créé via Google. Définissez un mot de passe pour vous connecter sans Google.
            </p>
          )}
        </div>
        <div className="p-5">
          <form onSubmit={handleUpdatePassword} className="flex flex-col md:flex-row md:flex-wrap gap-3">
            {!estCompteGoogle && (
              <input
                type="password"
                placeholder="Mot de passe actuel"
                className={INPUT_CLASS}
                name="old" aria-invalid={!!pwdErrors.old} aria-describedby={pwdErrors.old ? "err-old" : undefined} value={passwords.old}
                onChange={(e) => setPasswords(prev => ({ ...prev, old: e.target.value }))}
              />
            )}
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              className={INPUT_CLASS}
              name="new" aria-invalid={!!pwdErrors.new} aria-describedby={pwdErrors.new ? "err-new" : undefined} value={passwords.new}
              onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
            />
            <input
              type="password"
              placeholder="Confirmer"
              className={INPUT_CLASS}
              name="confirm" aria-invalid={!!pwdErrors.confirm} aria-describedby={pwdErrors.confirm ? "err-confirm" : undefined} value={passwords.confirm}
              onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
            />
            <button
              type="submit"
              disabled={pwdLoading}
              className={`px-5 py-3 text-base font-bold rounded-xl ${tw.buttonDark}`}
            >
              {pwdLoading ? "..." : estCompteGoogle ? "Définir" : "Modifier"}
            </button>
            <div className="basis-full">
              {["old", "new", "confirm"].map((k) => <FieldError key={k} id={`err-${k}`} message={pwdErrors[k]} />)}
            </div>
          </form>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className={`${tw.surface} border ${tw.dangerCardBorder} rounded-2xl p-5 flex justify-between items-center`}>
        <div>
          <h2 className={`text-sm font-semibold ${tw.textError}`}>Supprimer mon compte</h2>
          <p className={`text-xs ${tw.textMuted} mt-0.5`}>Cette action est irréversible.</p>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className={`text-sm font-medium hover:underline ${tw.textErrorMuted}`}
        >
          Supprimer
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSupprimerCompte}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900">Supprimer mon compte</h3>
              <p className="text-xs text-slate-600 mt-1">
                Votre compte sera désactivé immédiatement (déconnexion, plus visible dans la CVthèque).
                Cette action est <strong>irréversible</strong> depuis cette interface.
              </p>
            </div>
            {!estCompteGoogle && (
              <div>
                <label htmlFor="delete-mot-de-passe" className="text-xs font-medium text-slate-600 mb-1 block">
                  Mot de passe actuel
                </label>
                <input
                  id="delete-mot-de-passe"
                  type="password"
                  required
                  className={INPUT_CLASS}
                  value={deleteForm.mot_de_passe}
                  onChange={(e) => setDeleteForm((prev) => ({ ...prev, mot_de_passe: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label htmlFor="delete-confirmation" className="text-xs font-medium text-slate-600 mb-1 block">
                Tapez <strong>SUPPRIMER</strong> pour confirmer
              </label>
              <input
                id="delete-confirmation"
                type="text"
                required
                className={INPUT_CLASS}
                value={deleteForm.confirmation}
                onChange={(e) => setDeleteForm((prev) => ({ ...prev, confirmation: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={deleteLoading || deleteForm.confirmation.trim().toUpperCase() !== "SUPPRIMER"}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "..." : "Supprimer définitivement"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
