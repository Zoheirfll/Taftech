import React, { useState, useEffect } from "react";
import { adminService } from "../../Services/adminService";
import { notifier } from "../../utils/notifier";
import { reportError } from "../../utils/errorReporter";
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Shield, UserCog } from "lucide-react";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminVide } from "../../Components/AdminEtat";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const FORM_VIDE = { email: "", first_name: "", last_name: "", telephone: "", password: "" };
// Suppression définitive d'un compte admin = action critique : confirmation par saisie d'un
// mot-clé, pas un simple clic.
const MOT_CLE_SUPPRESSION = "SUPPRIMER";

const AdminComptes = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit'|'delete', data?: {} }
  const [form, setForm] = useState(FORM_VIDE);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmationSaisie, setConfirmationSaisie] = useState("");

  const charger = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdmins();
      setAdmins(data);
    } catch (err) {
      notifier.echec("Chargement impossible", err);
      reportError("ECHEC_GET_ADMINS", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const ouvrirCreer = () => {
    setForm(FORM_VIDE);
    setShowPassword(false);
    setModal({ mode: "create" });
  };

  const ouvrirModifier = (admin) => {
    setForm({
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
      telephone: admin.telephone || "",
      password: "",
    });
    setShowPassword(false);
    setModal({ mode: "edit", data: admin });
  };

  const ouvrirSupprimer = (admin) => {
    setConfirmationSaisie("");
    setModal({ mode: "delete", data: admin });
  };

  const fermer = React.useCallback(() => {
    setModal(null);
    setForm(FORM_VIDE);
    setConfirmationSaisie("");
  }, []);
  useEchapPourFermer(!!modal && !saving, fermer);

  const handleSauvegarder = async (e) => {
    e?.preventDefault();
    if (!form.email.trim()) return notifier.erreur("Adresse e-mail manquante", "L'adresse e-mail est obligatoire.");
    if (modal.mode === "create" && !form.password.trim()) return notifier.erreur("Mot de passe manquant", "Le mot de passe est obligatoire.");
    if (form.password && form.password.trim().length < 8)
      return notifier.erreur("Mot de passe trop court", "Il doit contenir au moins 8 caractères.");
    setSaving(true);
    try {
      if (modal.mode === "create") {
        await adminService.createAdmin(form);
        notifier.succes("Compte administrateur créé");
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await adminService.updateAdmin(modal.data.id, payload);
        notifier.succes("Compte mis à jour");
      }
      fermer();
      charger();
    } catch (err) {
      reportError("ECHEC_SAVE_ADMIN_COMPTE", err);
      notifier.echec("Enregistrement impossible", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = async () => {
    if (confirmationSaisie.trim().toUpperCase() !== MOT_CLE_SUPPRESSION) return;
    setSaving(true);
    try {
      await adminService.deleteAdmin(modal.data.id);
      notifier.succes("Compte supprimé");
      fermer();
      charger();
    } catch (err) {
      reportError("ECHEC_DELETE_ADMIN_COMPTE", err);
      notifier.echec("Suppression impossible", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={UserCog}
        color="blue"
        title="Comptes administrateurs"
        subtitle="Créez, modifiez ou supprimez les comptes ayant accès à ce panel."
        aideKey="comptes-admins"
        aide={[
          "Un compte admin a accès à tout le panel : modération, utilisateurs, facturation, configuration IA. Ne créez que des comptes nominatifs, jamais partagés.",
          "Mot de passe : 8 caractères minimum. En modification, laissez le champ vide pour garder le mot de passe actuel.",
          "Le superutilisateur (compte technique principal) ne peut pas être supprimé, et vous ne pouvez pas supprimer votre propre compte.",
          "La suppression est définitive : il faut taper « SUPPRIMER » pour confirmer. Chaque action est tracée dans le journal d'audit.",
        ]}
        actions={
          <button
            onClick={ouvrirCreer}
            className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}
          >
            <Plus size={15} /> Nouvel admin
          </button>
        }
      />

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
            <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
              <th className="px-5 py-3">Administrateur</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Téléphone</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Inscrit le</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <AdminVide icon={Shield} titre="Aucun administrateur trouvé." />
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className={tw.rowHover}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${tw.bgPrimarySoft} border ${tw.borderPrimarySoft} flex items-center justify-center shrink-0`}>
                        <Shield size={14} className={tw.textPrimary} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${tw.textStrong}`}>
                          {a.last_name} {a.first_name}
                        </p>
                        {!a.is_active && (
                          <span className={`text-[10px] ${tw.textErrorMuted} font-semibold`}>Désactivé</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`px-5 py-4 text-sm ${tw.textPrimary}`}>{a.email}</td>
                  <td className={`px-5 py-4 text-sm ${tw.textMuted700}`}>{a.telephone || "—"}</td>
                  <td className="px-5 py-4">
                    {a.is_superuser ? (
                      <span className={`px-2.5 py-1 ${tw.bgPurpleSoft} ${tw.textPurple} border ${tw.borderPurple} text-[10px] font-semibold rounded-full`}>
                        Superutilisateur
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} border ${tw.borderPrimary200} text-[10px] font-semibold rounded-full`}>
                        Admin
                      </span>
                    )}
                  </td>
                  <td className={`px-5 py-4 text-sm ${tw.textMuted700}`}>{a.date_joined}</td>
                  <td className="px-5 py-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                    {a.modifiable && (
                      <button
                        onClick={() => ouvrirModifier(a)}
                        className={`p-2 ${tw.surfaceSubtle} ${tw.textMuted} rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors ${tw.focusRing}`}
                        title="Modifier"
                        aria-label={`Modifier le compte ${a.email}`}
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    {!a.is_superuser && (
                      <button
                        onClick={() => ouvrirSupprimer(a)}
                        className={`p-2 ${tw.bgErrorSoft} ${tw.textError} rounded-lg ${tw.hoverErrorSoft} transition-colors ${tw.focusRing}`}
                        title="Supprimer"
                        aria-label={`Supprimer le compte ${a.email}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                   </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal Créer / Modifier */}
      {modal && modal.mode !== "delete" && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermer()}>
          <form onSubmit={handleSauvegarder} role="dialog" aria-modal="true" aria-label={modal.mode === "create" ? "Créer un compte admin" : "Modifier le compte"} className={`${tw.surface} rounded-2xl p-7 max-w-md w-full shadow-2xl`}>
            <div className={`flex justify-between items-center mb-5 pb-4 border-b ${tw.borderSubtle}`}>
              <h2 className={`text-lg font-bold ${tw.textStrong}`}>
                {modal.mode === "create" ? "Créer un compte admin" : "Modifier le compte"}
              </h2>
              <button type="button" onClick={fermer} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${tw.textMuted} mb-1 block`}>Prénom</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className={`w-full px-3 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${tw.textMuted} mb-1 block`}>Nom</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className={`w-full px-3 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${tw.textMuted} mb-1 block`}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full px-3 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold ${tw.textMuted} mb-1 block`}>Téléphone</label>
                <input
                  type="text"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className={`w-full px-3 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold ${tw.textMuted} mb-1 block`}>
                  {modal.mode === "create" ? "Mot de passe *" : "Nouveau mot de passe (laisser vide pour ne pas changer)"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={`w-full px-3 py-2.5 pr-10 ${tw.inputColorsMuted} rounded-lg text-sm`}
                    placeholder="8 caractères minimum"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={fermer}
                className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-semibold rounded-xl ${tw.hoverSurfaceSubtleStrong} transition-colors`}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60`}
              >
                {saving ? "Enregistrement..." : modal.mode === "create" ? "Créer le compte" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Supprimer — confirmation renforcée (saisie du mot-clé) */}
      {modal?.mode === "delete" && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && !saving && fermer()}>
          <div role="alertdialog" aria-modal="true" aria-label="Supprimer ce compte" className={`${tw.surface} rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center`}>
            <div className={`w-12 h-12 ${tw.bgErrorSoft} border ${tw.borderError} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Trash2 size={20} className={tw.textError} />
            </div>
            <h2 className={`text-lg font-bold ${tw.textStrong} mb-2`}>Supprimer ce compte ?</h2>
            <p className={`text-sm ${tw.textMuted700} mb-4`}>
              Le compte de <span className={`font-semibold ${tw.textStrong}`}>{modal.data.email}</span> sera définitivement supprimé et perdra immédiatement l'accès au panel.
            </p>
            <label className={`block text-xs font-semibold ${tw.textMuted700} mb-1.5 text-left`} htmlFor="confirmation-suppression-admin">
              Tapez <span className="font-mono font-bold text-red-600">{MOT_CLE_SUPPRESSION}</span> pour confirmer
            </label>
            <input
              id="confirmation-suppression-admin"
              type="text"
              autoComplete="off"
              autoFocus
              value={confirmationSaisie}
              onChange={(e) => setConfirmationSaisie(e.target.value)}
              className={`w-full px-3 py-2.5 mb-5 ${tw.inputColorsMuted} rounded-lg text-sm font-mono`}
            />
            <div className="flex gap-3">
              <button
                onClick={fermer}
                disabled={saving}
                className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-semibold rounded-xl ${tw.hoverSurfaceSubtleStrong} transition-colors`}
              >
                Annuler
              </button>
              <button
                onClick={handleSupprimer}
                disabled={saving || confirmationSaisie.trim().toUpperCase() !== MOT_CLE_SUPPRESSION}
                className={`flex-1 py-2.5 ${tw.buttonDangerSolid} text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {saving ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComptes;
