import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Receipt } from "lucide-react";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminErreurChargement } from "../../Components/AdminEtat";

const CHAMP_VIDE = { raison_sociale: "", registre_commerce: "", nif: "", adresse: "", tva: "" };

const CHAMPS = [
  { key: "raison_sociale", label: "Raison sociale", requis: true },
  { key: "registre_commerce", label: "Registre de commerce (RC)", requis: true },
  { key: "nif", label: "NIF", requis: true, placeholder: "Numéro d'identification fiscale" },
  { key: "adresse", label: "Adresse du siège", requis: true, placeholder: "Adresse complète, wilaya" },
  { key: "tva", label: "N° TVA (le cas échéant)", requis: false, placeholder: "Laisser vide si non assujetti" },
];

const AdminMentionsLegales = () => {
  const [form, setForm] = useState(CHAMP_VIDE);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const load = useCallback(async () => {
    setLoading(true);
    setErreur(false);
    try {
      const response = await api.get("jobs/admin/mentions-legales/");
      setForm({ ...CHAMP_VIDE, ...response.data });
    } catch (err) {
      reportError("ECHEC_GET_MENTIONS_LEGALES", err);
      // Ne jamais afficher un formulaire vide après un échec : l'enregistrer écraserait les
      // vraies mentions légales avec des champs vides.
      setErreur(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("jobs/admin/mentions-legales/", form);
      toast.success("Mentions légales mises à jour.");
    } catch (err) {
      reportError("ECHEC_UPDATE_MENTIONS_LEGALES", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <AdminPageHeader
        icon={Receipt}
        color="emerald"
        title="Mentions légales"
        subtitle="Informations légales imprimées sur les factures PDF des recruteurs."
        aideKey="mentions-legales"
        aide={[
          "Ces informations apparaissent en bas de chaque facture PDF générée après un paiement d'abonnement ou de pack de crédits.",
          "Une modification ne s'applique qu'aux factures générées ensuite : les factures déjà téléchargées ne changent pas.",
          "Vérifiez le RC et le NIF sur vos documents officiels : une facture avec des mentions erronées n'est pas valable.",
        ]}
      />

      {loading ? (
        <div className={`${tw.card} p-6 space-y-4`}>
          {CHAMPS.map((c) => (
            <div key={c.key} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : erreur ? (
        <AdminErreurChargement message="Impossible de charger les mentions légales." onRetry={load} />
      ) : (
        <form onSubmit={handleSubmit} className={`${tw.card} p-6 space-y-4`}>
          {CHAMPS.map((c) => (
            <div key={c.key}>
              <label htmlFor={`ml-${c.key}`} className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
                {c.label}
                {c.requis && <span className="text-red-500"> *</span>}
              </label>
              <input
                id={`ml-${c.key}`}
                className={inputClass}
                required={c.requis}
                placeholder={c.placeholder}
                value={form[c.key] || ""}
                onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
              />
            </div>
          ))}
          <button type="submit" disabled={saving} className={`w-full py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${tw.focusRing}`}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminMentionsLegales;
