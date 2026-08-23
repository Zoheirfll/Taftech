import React, { useState, useEffect } from "react";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { tw } from "../../theme";

const CHAMP_VIDE = { raison_sociale: "", registre_commerce: "", nif: "", adresse: "", tva: "" };

const AdminMentionsLegales = () => {
  const [form, setForm] = useState(CHAMP_VIDE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("jobs/admin/mentions-legales/");
        setForm(response.data);
      } catch (err) {
        reportError("ECHEC_GET_MENTIONS_LEGALES", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("jobs/admin/mentions-legales/", form);
      toast.success("Mentions légales mises à jour.");
    } catch (err) {
      reportError("ECHEC_UPDATE_MENTIONS_LEGALES", err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500 animate-pulse">Chargement...</p>;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className={tw.pageTitle}>Mentions légales</h1>
        <p className={`${tw.pageSubtitle} mt-0.5`}>Affichées sur toutes les nouvelles factures PDF générées.</p>
      </div>
      <form onSubmit={handleSubmit} className={`${tw.card} p-6 space-y-4`}>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Raison sociale</label>
          <input className={inputClass} value={form.raison_sociale} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Registre de commerce (RC)</label>
          <input className={inputClass} value={form.registre_commerce} onChange={(e) => setForm({ ...form, registre_commerce: e.target.value })} />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>NIF</label>
          <input className={inputClass} value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Adresse</label>
          <input className={inputClass} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>N° TVA (le cas échéant)</label>
          <input className={inputClass} value={form.tva} onChange={(e) => setForm({ ...form, tva: e.target.value })} />
        </div>
        <button type="submit" disabled={saving} className={`w-full py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
};

export default AdminMentionsLegales;
