import React, { useState, useEffect } from "react";
import { adminService } from "../../Services/adminService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Shield } from "lucide-react";

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
          <h1 className="text-2xl font-bold text-slate-900">Comptes administrateurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Créez, modifiez ou supprimez les comptes admin TafTech.
          </p>
        </div>
        <button
          onClick={ouvrirCreer}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={15} /> Nouvel admin
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              <th className="px-5 py-3">Administrateur</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Téléphone</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Inscrit le</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-sm text-indigo-600 animate-pulse font-medium">
                  Chargement...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-sm text-slate-400">
                  Aucun administrateur trouvé.
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Shield size={14} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {a.last_name} {a.first_name}
                        </p>
                        {!a.is_active && (
                          <span className="text-[10px] text-red-500 font-semibold">Désactivé</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-indigo-600">{a.email}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{a.telephone || "—"}</td>
                  <td className="px-5 py-4">
                    {a.is_superuser ? (
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold rounded-full">
                        Superutilisateur
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold rounded-full">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{a.date_joined}</td>
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => ouvrirModifier(a)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 size={13} />
                    </button>
                    {!a.is_superuser && (
                      <button
                        onClick={() => ouvrirSupprimer(a)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {modal.mode === "create" ? "Créer un compte admin" : "Modifier le compte"}
              </h2>
              <button onClick={fermer} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Prénom</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Nom</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="admin@taftech.dz"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Téléphone</label>
                <input
                  type="text"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="0550 000 000"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  {modal.mode === "create" ? "Mot de passe *" : "Nouveau mot de passe (laisser vide pour ne pas changer)"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="8 caractères minimum"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={fermer}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSauvegarder}
                disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : modal.mode === "create" ? "Créer le compte" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supprimer */}
      {modal?.mode === "delete" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-100 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Supprimer ce compte ?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Le compte de <span className="font-semibold text-slate-700">{modal.data.email}</span> sera définitivement supprimé.
            </p>
            <div className="flex gap-3">
              <button
                onClick={fermer}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSupprimer}
                disabled={saving}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
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
