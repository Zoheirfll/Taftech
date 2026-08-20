import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { tw } from "../../theme";

const FEATURES = [
  { key: "parser_cv", label: "Parser CV", desc: "Extraction automatique des infos d'un CV uploadé (candidat)." },
  { key: "analyse_carriere", label: "Analyse carrière candidat", desc: "Analyse IA personnalisée du profil candidat (métiers possibles, compétences manquantes...)." },
  { key: "analyse_recruteur", label: "Analyse IA recruteur", desc: "Résumé de compatibilité candidat/offre affiché au recruteur." },
  { key: "generation_offre", label: "Génération d'offre IA", desc: "Pré-remplissage IA du formulaire de publication d'offre (Premium)." },
];

const AdminIAConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAIConfig();
      setConfig(data);
    } catch (err) {
      reportError("ECHEC_GET_AI_CONFIG", err);
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await jobsService.updateAIConfig(config);
      setConfig(updated);
      toast.success("Configuration IA mise à jour !");
    } catch (err) {
      reportError("ECHEC_UPDATE_AI_CONFIG", err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

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
              <div>
                <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>max_tokens</label>
                <input
                  type="number"
                  min="100"
                  className={`${inputClass} max-w-[140px]`}
                  value={config[`${f.key}_max_tokens`]}
                  onChange={(e) => setConfig({ ...config, [`${f.key}_max_tokens`]: Number(e.target.value) })}
                />
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={saving} className={`w-full py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60`}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
};

export default AdminIAConfig;
