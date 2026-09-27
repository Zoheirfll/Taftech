import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { confirmToast } from "../../utils/confirmToast";
import toast from "react-hot-toast";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { tw } from "../../theme";

// `tokens` = variables que le prompt DOIT conserver pour que la fonctionnalité marche —
// vérifiées avant sauvegarde pour éviter qu'un admin efface par erreur un jeton et casse
// silencieusement l'interpolation (le texte serait envoyé tel quel à l'IA, ex: littéralement
// "Poste : {titre}" au lieu du vrai titre saisi par le recruteur).
const FEATURES = [
  {
    key: "parser_cv",
    label: "Parser CV",
    desc: "Extraction automatique des infos d'un CV uploadé (candidat).",
    tokens: ["{cv_text}", "{domaines_list}"],
    quota: true,
  },
  {
    key: "analyse_carriere",
    label: "Analyse carrière candidat (suggestions métiers)",
    desc: "Analyse IA personnalisée du profil candidat (métiers possibles, compétences manquantes...).",
    tokens: [],
    quota: true,
  },
  {
    key: "analyse_recruteur",
    label: "Analyse IA recruteur",
    desc: "Résumé de compatibilité candidat/offre affiché au recruteur. Quota configuré par palier (page Abonnements & paliers), incluse dans l'abonnement.",
    tokens: [
      "{offre_titre}", "{entreprise}", "{specialite}", "{type_contrat}", "{offre_wilaya}",
      "{nom_candidat}", "{titre_candidat}", "{diplome}", "{wilaya_candidat}",
      "{competences}", "{experiences}", "{formations}", "{score}",
    ],
    quota: false,
  },
  {
    key: "generation_offre",
    label: "Génération d'offre IA",
    desc: "Pré-remplissage IA du formulaire de publication d'offre. Quota configuré par palier (page Abonnements & paliers).",
    tokens: ["{titre}", "{specialite}", "{diplome}", "{experience}", "{contrat}", "{wilaya}"],
    quota: false,
  },
  {
    key: "conseils_dashboard",
    label: "Conseils personnalisés (tableau de bord candidat)",
    desc: "Conseils générés par IA à partir du profil, du score et des candidatures réels du candidat.",
    tokens: [],
    quota: true,
  },
];

const FONCTION_PAR_KEY = {
  parser_cv: "PARSER_CV",
  analyse_carriere: "SUGGESTIONS_METIER",
  conseils_dashboard: "CONSEILS_DASHBOARD",
};

const AdminIAConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openPrompt, setOpenPrompt] = useState(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAIConfig();
      setConfig(data);
    } catch (err) {
      reportError("ECHEC_GET_AI_CONFIG", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Jetons manquants par fonctionnalité — [{ label, tokens: [...] }, ...], vide si tout va bien.
  const getTokensManquants = () => {
    const problemes = [];
    FEATURES.forEach((f) => {
      if (f.tokens.length === 0) return;
      const prompt = config[`${f.key}_prompt`] || "";
      if (!prompt.trim()) return; // prompt vide → repli sur le défaut backend, rien à valider
      const manquants = f.tokens.filter((t) => !prompt.includes(t));
      if (manquants.length > 0) problemes.push({ label: f.label, tokens: manquants });
    });
    return problemes;
  };

  const enregistrer = async () => {
    setSaving(true);
    try {
      const updated = await jobsService.updateAIConfig(config);
      setConfig(updated);
      toast.success("Configuration IA mise à jour !");
    } catch (err) {
      reportError("ECHEC_UPDATE_AI_CONFIG", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const problemes = getTokensManquants();
    if (problemes.length > 0) {
      toast.error(
        `Variable(s) manquante(s) — ${problemes.map((p) => `${p.label} : ${p.tokens.join(", ")}`).join(" · ")}. Ces prompts ne fonctionneront pas correctement sans elles.`,
        { duration: 8000 },
      );
      return;
    }
    confirmToast(
      "Enregistrer la configuration IA ? Ces changements affectent immédiatement le comportement de l'IA sur tout le site, pour tous les utilisateurs.",
      enregistrer,
    );
  };

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;
  const textareaClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-xs font-mono leading-relaxed`;

  if (loading || !config) {
    return <p className={`text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</p>;
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className={tw.pageTitle}>Configuration IA</h1>
        <p className={`${tw.pageSubtitle} mt-0.5`}>Modèle utilisé et interrupteurs par fonctionnalité — pour couper une fonctionnalité en panne sans déploiement.</p>
      </div>

      <div className={`${tw.bgWarningSoft} border ${tw.borderWarning} rounded-xl p-4 flex items-start gap-3`}>
        <AlertTriangle size={18} className={`${tw.textWarning} shrink-0 mt-0.5`} />
        <p className={`text-sm ${tw.textWarning}`}>
          Groq déprécie parfois ses modèles sans préavis (déjà arrivé). Si toutes les fonctionnalités IA tombent en panne d'un coup, vérifiez d'abord la liste des modèles disponibles sur console.groq.com/docs/models avant de changer la valeur ci-dessous.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`${tw.card} rounded-2xl p-5 space-y-4`}>
          <p className={`text-sm font-bold ${tw.textStrong}`}>Fournisseur & modèle</p>
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Fournisseur</label>
            <select className={inputClass} value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value })}>
              <option value="GROQ">Groq (cloud)</option>
              <option value="OLLAMA">Ollama (local, post-déploiement — pas encore actif)</option>
            </select>
          </div>
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Modèle Groq</label>
            <input className={inputClass} value={config.groq_model} onChange={(e) => setConfig({ ...config, groq_model: e.target.value })} />
          </div>
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Modèle Ollama (local)</label>
            <input className={inputClass} value={config.ollama_model} onChange={(e) => setConfig({ ...config, ollama_model: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Température</label>
              <input type="number" step="0.1" min="0" max="2" className={inputClass} value={config.temperature} onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Effort de raisonnement</label>
              <select className={inputClass} value={config.reasoning_effort} onChange={(e) => setConfig({ ...config, reasoning_effort: e.target.value })}>
                <option value="low">Low (rapide)</option>
                <option value="medium">Medium</option>
                <option value="high">High (lent, plus précis)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={`${tw.card} rounded-2xl p-5 space-y-2`}>
          <p className={`text-sm font-bold ${tw.textStrong}`}>Plafond global de dépense</p>
          <p className={`text-xs ${tw.textMuted}`}>Kill-switch de sécurité : au-delà de ce nombre d'appels IA (toutes fonctions, tous comptes confondus) sur le mois en cours, l'IA devient temporairement indisponible pour tout le monde.</p>
          <input
            type="number"
            min="0"
            className={`${inputClass} max-w-[220px]`}
            placeholder="Illimité"
            value={config.budget_ia_appels_mois_max ?? ""}
            onChange={(e) => setConfig({ ...config, budget_ia_appels_mois_max: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>

        <div className={`${tw.card} rounded-2xl p-5 space-y-4`}>
          <p className={`text-sm font-bold ${tw.textStrong}`}>Fonctionnalités</p>
          {FEATURES.map((f) => (
            <div key={f.key} className={`border ${tw.borderSubtle} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm font-semibold ${tw.textStrong}`}>{f.label}</p>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className={`${tw.accentPrimary} w-4 h-4`}
                    checked={config[`${f.key}_actif`]}
                    onChange={(e) => setConfig({ ...config, [`${f.key}_actif`]: e.target.checked })}
                  />
                </label>
              </div>
              <p className={`text-xs ${tw.textMuted} mb-2`}>{f.desc}</p>
              <div className="mb-3">
                <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>max_tokens</label>
                <input
                  type="number"
                  min="100"
                  className={`${inputClass} max-w-[140px]`}
                  value={config[`${f.key}_max_tokens`]}
                  onChange={(e) => setConfig({ ...config, [`${f.key}_max_tokens`]: Number(e.target.value) })}
                />
              </div>
              {f.quota && (
                <div className="mb-3 flex gap-3">
                  <div>
                    <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>Quota / jour (vide = illimité)</label>
                    <input
                      type="number"
                      min="0"
                      className={`${inputClass} max-w-[140px]`}
                      value={config[`${f.key}_limite_jour`] ?? ""}
                      onChange={(e) => setConfig({ ...config, [`${f.key}_limite_jour`]: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>Quota / mois (vide = illimité)</label>
                    <input
                      type="number"
                      min="0"
                      className={`${inputClass} max-w-[140px]`}
                      value={config[`${f.key}_limite_mois`] ?? ""}
                      onChange={(e) => setConfig({ ...config, [`${f.key}_limite_mois`]: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setOpenPrompt(openPrompt === f.key ? null : f.key)}
                className={`flex items-center gap-1.5 text-xs font-semibold ${tw.textPrimary} hover:underline`}
              >
                {openPrompt === f.key ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                Prompt IA
              </button>

              {openPrompt === f.key && (
                <div className="mt-2">
                  {f.tokens.length > 0 && (
                    <p className={`text-[10px] ${tw.textMuted} mb-1.5`}>
                      Variables obligatoires — <strong>ne pas les supprimer</strong>, elles sont remplacées automatiquement :{" "}
                      {f.tokens.map((t) => (
                        <code key={t} className={`inline-block mx-0.5 px-1 py-0.5 rounded ${tw.badgeNeutral}`}>{t}</code>
                      ))}
                    </p>
                  )}
                  <textarea
                    rows={10}
                    className={textareaClass}
                    value={config[`${f.key}_prompt`] || ""}
                    onChange={(e) => setConfig({ ...config, [`${f.key}_prompt`]: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <button type="submit" disabled={saving} className={`w-full py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60`}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      <QuotaOverridesPanel />
    </div>
  );
};

const QuotaOverridesPanel = () => {
  const [overrides, setOverrides] = useState([]);
  const [email, setEmail] = useState("");
  const [usage, setUsage] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({ fonction: "PARSER_CV", limite_jour: "", limite_mois: "", justification: "" });
  const [saving, setSaving] = useState(false);

  const fetchOverrides = async () => {
    try {
      const data = await jobsService.getQuotaIAOverrides();
      setOverrides(data);
    } catch (err) {
      reportError("ECHEC_GET_QUOTA_IA_OVERRIDES", err);
      toast.error(apiErrMsg(err, "Erreur de chargement des overrides."));
    }
  };

  useEffect(() => {
    fetchOverrides();
  }, []);

  const verifierCompte = async () => {
    if (!email.trim()) return;
    setChecking(true);
    setUsage(null);
    try {
      const data = await jobsService.getQuotaIAUsage(email.trim());
      setUsage(data);
    } catch (err) {
      reportError("ECHEC_GET_QUOTA_IA_USAGE", err);
      toast.error(apiErrMsg(err, "Compte introuvable."));
    } finally {
      setChecking(false);
    }
  };

  const creerOverride = async (e) => {
    e.preventDefault();
    if (!usage) {
      toast.error("Vérifiez d'abord le compte (email) avant de créer un override.");
      return;
    }
    setSaving(true);
    try {
      await jobsService.creerQuotaIAOverride({
        user: usage.user_id,
        fonction: form.fonction,
        limite_jour: form.limite_jour === "" ? null : Number(form.limite_jour),
        limite_mois: form.limite_mois === "" ? null : Number(form.limite_mois),
        justification: form.justification,
      });
      toast.success("Override enregistré.");
      setForm({ fonction: "PARSER_CV", limite_jour: "", limite_mois: "", justification: "" });
      fetchOverrides();
    } catch (err) {
      reportError("ECHEC_CREER_QUOTA_IA_OVERRIDE", err);
      toast.error(apiErrMsg(err, "Erreur lors de la création."));
    } finally {
      setSaving(false);
    }
  };

  const supprimer = (id) => {
    confirmToast("Supprimer cet override ? Le compte reviendra au quota par défaut (palier ou config globale).", async () => {
      try {
        await jobsService.supprimerQuotaIAOverride(id);
        toast.success("Override supprimé.");
        fetchOverrides();
      } catch (err) {
        reportError("ECHEC_SUPPRIMER_QUOTA_IA_OVERRIDE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  return (
    <div className={`${tw.card} rounded-2xl p-5 space-y-4`}>
      <div>
        <p className={`text-sm font-bold ${tw.textStrong}`}>Quotas personnalisés par compte</p>
        <p className={`text-xs ${tw.textMuted} mt-0.5`}>Remplace le quota par défaut (palier ou config globale) pour UN compte précis — ex. compte de test, client VIP, compte pénalisé après abus.</p>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Email du compte</label>
          <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="compte@exemple.com" />
        </div>
        <button type="button" onClick={verifierCompte} disabled={checking} className={`px-4 py-2.5 ${tw.buttonSecondary} rounded-lg text-sm font-semibold disabled:opacity-60`}>
          {checking ? "..." : "Vérifier"}
        </button>
      </div>

      {usage && (
        <div className={`border ${tw.borderSubtle} rounded-xl p-3 text-xs space-y-1`}>
          <p className={`font-semibold ${tw.textStrong}`}>{usage.user_email} — usage actuel</p>
          {usage.usage.map((u) => (
            <p key={u.fonction} className={tw.textMuted}>
              {u.fonction_libelle} : {u.utilise_jour}/{u.limite_jour ?? "∞"} aujourd'hui · {u.utilise_mois}/{u.limite_mois ?? "∞"} ce mois
            </p>
          ))}
        </div>
      )}

      {usage && (
        <form onSubmit={creerOverride} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <div>
            <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>Fonction</label>
            <select className={inputClass} value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })}>
              <option value="PARSER_CV">Parser CV</option>
              <option value="SUGGESTIONS_METIER">Suggestions métiers</option>
              <option value="CONSEILS_DASHBOARD">Conseils personnalisés</option>
              <option value="GENERATION_OFFRE">Génération d'offre</option>
              <option value="ANALYSE_RECRUTEUR">Analyse IA candidature</option>
            </select>
          </div>
          <div>
            <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>Quota/jour</label>
            <input type="number" min="0" className={inputClass} placeholder="Illimité" value={form.limite_jour} onChange={(e) => setForm({ ...form, limite_jour: e.target.value })} />
          </div>
          <div>
            <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>Quota/mois</label>
            <input type="number" min="0" className={inputClass} placeholder="Illimité" value={form.limite_mois} onChange={(e) => setForm({ ...form, limite_mois: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className={`px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white rounded-lg text-sm font-semibold disabled:opacity-60`}>
            {saving ? "..." : "Créer"}
          </button>
          <input className={`${inputClass} sm:col-span-4`} placeholder="Justification (optionnel)" value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} />
        </form>
      )}

      <div className="space-y-2">
        {overrides.length === 0 && <p className={`text-xs ${tw.textMuted}`}>Aucun override actif.</p>}
        {overrides.map((o) => (
          <div key={o.id} className={`flex items-center justify-between border ${tw.borderSubtle} rounded-lg px-3 py-2 text-xs`}>
            <span>
              <strong>{o.user_email}</strong> — {o.fonction_libelle} : {o.limite_jour ?? "∞"}/jour, {o.limite_mois ?? "∞"}/mois
              {o.justification && <span className={tw.textMuted}> ({o.justification})</span>}
            </span>
            <button type="button" onClick={() => supprimer(o.id)} className="text-red-600 hover:underline font-semibold">Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminIAConfig;
