import React, { useState, useEffect } from "react";
import { adminService } from "../../Services/adminService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Shield } from "lucide-react";
import { tw } from "../../theme";

const FORM_VIDE = { email: "", first_name: "", last_name: "", telephone: "", password: "" };

const AdminComptes = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit'|'delete', data?: {} }
  const [form, setForm] = useState(FORM_VIDE);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdmins();
      setAdmins(data);
    } catch (err) {
      toast.error("Erreur de chargement.");
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
    setModal({ mode: "delete", data: admin });
  };

  const fermer = () => {
    setModal(null);
    setForm(FORM_VIDE);
  };

  const handleSauvegarder = async () => {
    if (!form.email.trim()) return toast.error("Email obligatoire.");
    if (modal.mode === "create" && !form.password.trim()) return toast.error("Mot de passe obligatoire.");
    setSaving(true);
    try {
      if (modal.mode === "create") {
        await adminService.createAdmin(form);
        toast.success("Compte admin créé !");
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await adminService.updateAdmin(modal.data.id, payload);
        toast.success("Compte mis à jour !");
      }
      fermer();
      charger();
    } catch (err) {
      reportError("ECHEC_SAVE_ADMIN_COMPTE", err);
      const msg = err.response?.data?.error || "Erreur lors de l'enregistrement.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = async () => {
    setSaving(true);
    try {
      await adminService.deleteAdmin(modal.data.id);
      toast.success("Compte supprimé.");
      fermer();
      charger();
    } catch (err) {
      reportError("ECHEC_DELETE_ADMIN_COMPTE", err);
      const msg = err.response?.data?.error || "Erreur lors de la suppression.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>Comptes administrateurs</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Créez, modifiez ou supprimez les comptes admin TAFTECH.
          </p>
        </div>
        <button
          onClick={ouvrirCreer}
          className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}
        >
          <Plus size={15} /> Nouvel admin
        </button>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <table className="w-full text-left">
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
          <tbody className={tw.divideBase}>
            {loading ? (
              <tr>
                <td colSpan="6" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>
                  Chargement...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan="6" className={`py-12 text-center text-sm ${tw.textMuted}`}>
                  Aucun administrateur trouvé.
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
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => ouvrirModifier(a)}
                      className={`p-2 ${tw.surfaceSubtle} ${tw.textMuted} rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}
                      title="Modifier"
                    >
                      <Edit2 size={13} />
                    </button>
                    {!a.is_superuser && (
                      <button
                        onClick={() => ouvrirSupprimer(a)}
                        className={`p-2 ${tw.bgErrorSoft} ${tw.textError} rounded-lg ${tw.hoverErrorSoft} transition-colors`}
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Créer / Modifier */}
      {modal && modal.mode !== "delete" && (
        <div className={tw.modalOverlay}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-md w-full shadow-2xl`}>
            <div className={`flex justify-between items-center mb-5 pb-4 border-b ${tw.borderSubtle}`}>
              <h2 className={`text-lg font-bold ${tw.textStrong}`}>
                {modal.mode === "create" ? "Créer un compte admin" : "Modifier le compte"}
              </h2>
              <button onClick={fermer} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg`}>
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
                  placeholder="admin@taftech.dz"
                />
              </div>

              <div>
                <label className={`text-xs font-semibold ${tw.textMuted} mb-1 block`}>Téléphone</label>
                <input
                  type="text"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className={`w-full px-3 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`}
                  placeholder="0550 000 000"
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
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={fermer}
                className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-semibold rounded-xl ${tw.hoverSurfaceSubtleStrong} transition-colors`}
              >
                Annuler
              </button>
              <button
                onClick={handleSauvegarder}
                disabled={saving}
                className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60`}
              >
                {saving ? "Enregistrement..." : modal.mode === "create" ? "Créer le compte" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supprimer */}
      {modal?.mode === "delete" && (
        <div className={tw.modalOverlay}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center`}>
            <div className={`w-12 h-12 ${tw.bgErrorSoft} border ${tw.borderError} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Trash2 size={20} className={tw.textError} />
            </div>
            <h2 className={`text-lg font-bold ${tw.textStrong} mb-2`}>Supprimer ce compte ?</h2>
            <p className={`text-sm ${tw.textMuted700} mb-6`}>
              Le compte de <span className={`font-semibold ${tw.textMuted700}`}>{modal.data.email}</span> sera définitivement supprimé.
            </p>
            <div className="flex gap-3">
              <button
                onClick={fermer}
                className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-semibold rounded-xl ${tw.hoverSurfaceSubtleStrong} transition-colors`}
              >
                Annuler
              </button>
              <button
                onClick={handleSupprimer}
                disabled={saving}
                className={`flex-1 py-2.5 ${tw.buttonDangerSolid} text-sm font-semibold rounded-xl transition-colors disabled:opacity-60`}
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
