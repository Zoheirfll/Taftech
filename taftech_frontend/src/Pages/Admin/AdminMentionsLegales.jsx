import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Receipt } from "lucide-react";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { extraireErreursChamps } from "../../utils/fieldErrors";
import FieldError from "../../Components/FieldError";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminErreurChargement } from "../../Components/AdminEtat";

// Informations société : source unique des factures, bulletins, pieds de page, page Contact et page
// Mentions légales (correction client n°21). Un champ laissé vide n'est jamais affiché au public.
const GROUPES = [
  {
    titre: "Société",
    champs: [
      { key: "raison_sociale", label: "Raison sociale", requis: true },
      { key: "forme_juridique", label: "Forme juridique" },
      { key: "capital_social", label: "Capital social" },
      { key: "registre_commerce", label: "Registre de commerce (RC)", requis: true },
      { key: "nif", label: "NIF", requis: true, placeholder: "Numéro d'identification fiscale" },
      { key: "nis", label: "NIS", placeholder: "Numéro d'identification statistique" },
      { key: "tva", label: "N° TVA (le cas échéant)", placeholder: "Laisser vide si non assujetti" },
      { key: "representant_legal", label: "Représentant légal" },
      { key: "directeur_publication", label: "Directeur de la publication" },
      { key: "hebergeur", label: "Hébergeur du site", placeholder: "Nom et adresse de l'hébergeur" },
      { key: "adresse", label: "Adresse du siège", requis: true, placeholder: "Adresse complète, wilaya" },
    ],
  },
  {
    titre: "Contact public",
    champs: [
      { key: "email_contact", label: "E-mail de contact", type: "email" },
      { key: "telephone", label: "Téléphone", type: "tel" },
      { key: "whatsapp", label: "WhatsApp (format international, chiffres uniquement, sans +)" },
      { key: "horaires", label: "Horaires d'ouverture" },
    ],
  },
  {
    titre: "Réseaux sociaux",
    champs: [
      { key: "facebook_url", label: "Facebook (lien complet commençant par https://)", type: "url" },
      { key: "instagram_url", label: "Instagram (lien complet commençant par https://)", type: "url" },
      { key: "linkedin_url", label: "LinkedIn (lien complet commençant par https://)", type: "url" },
    ],
  },
];

const CLES = GROUPES.flatMap((g) => g.champs.map((c) => c.key));
const CHAMP_VIDE = Object.fromEntries(CLES.map((k) => [k, ""]));

const AdminMentionsLegales = () => {
  const [form, setForm] = useState(CHAMP_VIDE);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erreursChamps, setErreursChamps] = useState({});

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
    setErreursChamps({});
    try {
      const payload = Object.fromEntries(CLES.map((k) => [k, form[k] || ""]));
      await api.put("jobs/admin/mentions-legales/", payload);
      toast.success("Informations société mises à jour.");
    } catch (err) {
      reportError("ECHEC_UPDATE_MENTIONS_LEGALES", err);
      setErreursChamps(extraireErreursChamps(err, CLES));
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
        title="Mentions légales et coordonnées"
        subtitle="Informations de la société : factures, pieds de page, page Contact et page Mentions légales."
        aideKey="mentions-legales"
        aide={[
          "Ces informations alimentent les factures PDF, les bulletins, les pieds de page du site, la page Contact et la page « Mentions légales ».",
          "Un champ laissé vide n'est pas affiché au public : renseignez uniquement des informations réelles et à jour.",
          "Vérifiez le RC et le NIF sur vos documents officiels : une facture avec des mentions erronées n'est pas valable.",
          "Une modification est appliquée tout de suite sur le site ; elle ne change pas les factures déjà téléchargées. Elle est tracée dans le journal d'audit.",
        ]}
      />

      {loading ? (
        <div className={`${tw.card} p-6 space-y-4`}>
          {CLES.slice(0, 6).map((k) => (
            <div key={k} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : erreur ? (
        <AdminErreurChargement message="Impossible de charger les informations société." onRetry={load} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {GROUPES.map((g) => (
            <div key={g.titre} className={`${tw.card} p-6 space-y-4`}>
              <p className={`text-sm font-bold ${tw.textStrong}`}>{g.titre}</p>
              {g.champs.map((c) => (
                <div key={c.key}>
                  <label htmlFor={`ml-${c.key}`} className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
                    {c.label}
                    {c.requis && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    id={`ml-${c.key}`}
                    type={c.type || "text"}
                    className={inputClass}
                    required={c.requis}
                    placeholder={c.placeholder}
                    aria-invalid={erreursChamps[c.key] ? "true" : undefined}
                    value={form[c.key] || ""}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                  />
                  <FieldError message={erreursChamps[c.key]} />
                </div>
              ))}
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
