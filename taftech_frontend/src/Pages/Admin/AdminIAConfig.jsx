import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { confirmToast } from "../../utils/confirmToast";
import { notifier } from "../../utils/notifier";
import { AlertTriangle, ChevronDown, ChevronUp, Cpu } from "lucide-react";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminErreurChargement } from "../../Components/AdminEtat";

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
    desc: "Résumé de compatibilité candidat/offre affiché au recruteur. Quota configuré par palier (onglet « Paliers & tarifs »), inclus dans l'abonnement.",
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
    desc: "Pré-remplissage IA du formulaire de publication d'offre. Quota configuré par palier (onglet « Paliers & tarifs »).",
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

// Calculés / informatifs côté serveur : ne jamais les renvoyer dans le PUT.
const CHAMPS_LECTURE_SEULE = ["prompts_accessibles", "budget_modifiable", "modele_modifiable", "appels_ia_mois", "consommation_mois"];
// Plafond et seuil : réservés au Super Admin (le serveur répond 403 si un admin simple les envoie).
const CHAMPS_BUDGET = ["budget_ia_appels_mois_max", "budget_ia_alerte_pct"];
// Bornes de max_tokens : miroir de MAX_TOKENS_MIN / MAX_TOKENS_MAX dans jobs/models/ia.py (le serveur
// refuse en 400 toute valeur hors bornes ; ici on prévient avant l'envoi).
const MAX_TOKENS_MIN = 100;
const MAX_TOKENS_MAX = 16000;
// Fournisseur, modèles, température, effort de raisonnement et max_tokens : même règle (ils changent
// le coût, le comportement et le destinataire des données).
const CHAMPS_MODELE = [
  "provider", "groq_model", "ollama_model", "temperature", "reasoning_effort",
  ...FEATURES.map((f) => `${f.key}_max_tokens`),
];

const AdminIAConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openPrompt, setOpenPrompt] = useState(null);
  const [erreur, setErreur] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    setErreur(false);
    try {
      const data = await jobsService.getAIConfig();
      setConfig(data);
    } catch (err) {
      setErreur(true);
      reportError("ECHEC_GET_AI_CONFIG", err);
      notifier.echec("Chargement impossible", err);
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
      const exclus = [
        ...CHAMPS_LECTURE_SEULE,
        ...(config.budget_modifiable === false ? CHAMPS_BUDGET : []),
        ...(config.modele_modifiable === false ? CHAMPS_MODELE : []),
      ];
      const payload = Object.fromEntries(Object.entries(config).filter(([cle]) => !exclus.includes(cle)));
      const updated = await jobsService.updateAIConfig(payload);
      setConfig(updated);
      notifier.succes("Configuration IA mise à jour");
    } catch (err) {
      reportError("ECHEC_UPDATE_AI_CONFIG", err);
      notifier.echec("Enregistrement impossible", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Champ vide : Number("") vaut 0 — à exclure explicitement, sinon il passerait pour 0.
    const temperature = config.temperature === "" || config.temperature == null ? NaN : Number(config.temperature);
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      notifier.erreur("Température invalide", "La température doit être comprise entre 0 et 2.");
      return;
    }
    const tokensTropBas = FEATURES.filter((f) => {
      const v = config[`${f.key}_max_tokens`];
      return v !== undefined && v !== null && !(Number(v) >= MAX_TOKENS_MIN && Number(v) <= MAX_TOKENS_MAX);
    });
    if (tokensTropBas.length > 0) {
      notifier.erreur("Valeur de max_tokens invalide", `max_tokens doit être compris entre ${MAX_TOKENS_MIN} et ${MAX_TOKENS_MAX} — ${tokensTropBas.map((f) => f.label).join(", ")}.`);
      return;
    }
    const problemes = getTokensManquants();
    if (problemes.length > 0) {
      notifier.erreur(
        "Variables manquantes",
        `${problemes.map((p) => `${p.label} : ${p.tokens.join(", ")}`).join(" · ")}. Ces prompts ne fonctionneront pas correctement sans elles.`,
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

  const header = (
    <AdminPageHeader
      compact
      icon={Cpu}
      color="violet"
      title="Configuration IA"
      subtitle="Modèle utilisé et interrupteurs par fonctionnalité — pour couper une fonctionnalité en panne sans déploiement."
      aideKey="ia-config"
      aide={[
        "Chaque fonctionnalité IA peut être coupée individuellement (interrupteur Activée/Désactivée) : les utilisateurs voient alors un message « service indisponible » au lieu d'une erreur.",
        "max_tokens = longueur maximale de la réponse de l'IA. Trop bas, la réponse est tronquée ; ne descendez pas sous les valeurs actuelles sans raison.",
        "Les quotas candidats se règlent ici ; les quotas recruteurs se règlent par palier (onglet « Paliers & tarifs »). Un compte précis peut recevoir un quota personnalisé tout en bas.",
        "Prompt vide = retour automatique au prompt d'origine. Les variables entre accolades {…} ne doivent jamais être supprimées.",
        "Tout enregistrement s'applique immédiatement à tout le site : une confirmation est demandée.",
      ]}
    />
  );

  if (loading && !config) {
    return (
      <div className="space-y-5 max-w-2xl">
        {header}
        <div className={`${tw.card} p-6 space-y-3`}>
          {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (erreur || !config) {
    return (
      <div className="space-y-5 max-w-2xl">
        {header}
        <AdminErreurChargement message="Impossible de charger la configuration IA." onRetry={fetchConfig} />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {header}

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
            <select className={inputClass} disabled={config.modele_modifiable === false} value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value })}>
              <option value="GROQ">Groq (cloud)</option>
              <option value="OLLAMA">Ollama (local, post-déploiement — pas encore actif)</option>
            </select>
          </div>
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Modèle Groq</label>
            <input className={inputClass} disabled={config.modele_modifiable === false} value={config.groq_model} onChange={(e) => setConfig({ ...config, groq_model: e.target.value })} />
          </div>
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Modèle Ollama (local)</label>
            <input className={inputClass} disabled={config.modele_modifiable === false} value={config.ollama_model} onChange={(e) => setConfig({ ...config, ollama_model: e.target.value })} />
          </div>
          {config.modele_modifiable === false && (
            <p className={`text-xs ${tw.textMuted}`}>Fournisseur, modèles, température, effort de raisonnement et max_tokens : modifiables uniquement par le Super Admin.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Température (0 = précis, 2 = créatif)</label>
              <input type="number" step="0.1" min="0" max="2" className={inputClass} disabled={config.modele_modifiable === false} value={config.temperature ?? ""} onChange={(e) => setConfig({ ...config, temperature: e.target.value === "" ? "" : parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Effort de raisonnement</label>
              <select className={inputClass} disabled={config.modele_modifiable === false} value={config.reasoning_effort} onChange={(e) => setConfig({ ...config, reasoning_effort: e.target.value })}>
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
            disabled={config.budget_modifiable === false}
            value={config.budget_ia_appels_mois_max ?? ""}
            onChange={(e) => setConfig({ ...config, budget_ia_appels_mois_max: e.target.value === "" ? null : Number(e.target.value) })}
          />
          {config.budget_modifiable === false && (
            <p className={`text-xs ${tw.textMuted}`}>Plafond et seuil d'alerte : modifiables uniquement par le Super Admin.</p>
          )}
          {config.appels_ia_mois !== undefined && (
            <p className={`text-xs font-semibold ${tw.textStrong}`}>
              {config.budget_ia_appels_mois_max
                ? `${config.appels_ia_mois} / ${config.budget_ia_appels_mois_max} appels IA ce mois-ci (${Math.round((config.appels_ia_mois / config.budget_ia_appels_mois_max) * 100)} %)`
                : `${config.appels_ia_mois} appels IA ce mois-ci`}
            </p>
          )}
          {Array.isArray(config.consommation_mois) && config.consommation_mois.length > 0 && (
            <div className="overflow-x-auto" data-testid="consommation-ia">
              <table className="w-full text-xs">
                <caption className={`text-left text-[10px] font-medium ${tw.textMuted} mb-1`}>
                  Consommation du mois par fonctionnalité (les appels remboursés ne comptent pas)
                </caption>
                <thead>
                  <tr className={tw.textMuted}>
                    <th className="text-left font-medium py-1 pr-3">Fonction</th>
                    <th className="text-right font-medium py-1 px-2">Appels</th>
                    <th className="text-right font-medium py-1 px-2">Remboursés</th>
                    <th className="text-right font-medium py-1 px-2">Tokens entrée</th>
                    <th className="text-right font-medium py-1 px-2">Tokens sortie</th>
                    <th className="text-right font-medium py-1 pl-2">Moyenne / appel</th>
                  </tr>
                </thead>
                <tbody>
                  {config.consommation_mois.map((ligne) => (
                    <tr key={ligne.fonction} className={`border-t ${tw.borderSubtle} ${tw.textStrong}`}>
                      <td className="py-1 pr-3">{ligne.libelle}</td>
                      <td className="text-right py-1 px-2">{ligne.appels.toLocaleString("fr-FR")}</td>
                      <td className="text-right py-1 px-2">{ligne.remboursees.toLocaleString("fr-FR")}</td>
                      <td className="text-right py-1 px-2">{ligne.tokens_entree.toLocaleString("fr-FR")}</td>
                      <td className="text-right py-1 px-2">{ligne.tokens_sortie.toLocaleString("fr-FR")}</td>
                      <td className="text-right py-1 pl-2">{ligne.moyenne_tokens.toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!config.budget_ia_appels_mois_max && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Aucun plafond défini : la consommation IA n'est pas bornée. Définissez un plafond avant la mise en production.
            </p>
          )}
          <div className="pt-2">
            <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>Seuil d'alerte (% du plafond)</label>
            <input
              type="number"
              min="1"
              max="100"
              disabled={config.budget_modifiable === false}
              className={`${inputClass} max-w-[140px]`}
              value={config.budget_ia_alerte_pct ?? ""}
              onChange={(e) => setConfig({ ...config, budget_ia_alerte_pct: e.target.value === "" ? "" : Number(e.target.value) })}
            />
            <p className={`text-[10px] ${tw.textMuted} mt-1`}>Un email est envoyé aux Super Admins une fois par mois à ce seuil, puis quand le plafond est épuisé.</p>
          </div>
        </div>

        <div className={`${tw.card} rounded-2xl p-5 space-y-4`}>
          <p className={`text-sm font-bold ${tw.textStrong}`}>Fonctionnalités</p>
          {FEATURES.map((f) => (
            <div key={f.key} className={`border rounded-xl p-4 ${config[`${f.key}_actif`] ? tw.borderSubtle : "border-red-200 bg-red-50/40"}`}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className={`text-sm font-semibold ${tw.textStrong}`}>{f.label}</p>
                {/* Interrupteur explicite (avant : case à cocher nue, sans libellé ni état lisible) */}
                <label className="relative inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <span className={`text-[11px] font-semibold ${config[`${f.key}_actif`] ? "text-emerald-700" : "text-red-600"}`}>
                    {config[`${f.key}_actif`] ? "Activée" : "Désactivée"}
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={`Activer ${f.label}`}
                    className="sr-only peer"
                    checked={!!config[`${f.key}_actif`]}
                    onChange={(e) => setConfig({ ...config, [`${f.key}_actif`]: e.target.checked })}
                  />
                  <span className="relative w-9 h-5 rounded-full bg-slate-300 peer-checked:bg-emerald-500 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
                </label>
              </div>
              <p className={`text-xs ${tw.textMuted} mb-2`}>{f.desc}</p>
              <div className="mb-3">
                <label className={`text-[10px] font-medium ${tw.textMuted} mb-1 block`}>max_tokens</label>
                <input
                  type="number"
                  min={MAX_TOKENS_MIN}
                  max={MAX_TOKENS_MAX}
                  className={`${inputClass} max-w-[140px]`}
                  disabled={config.modele_modifiable === false}
                  value={config[`${f.key}_max_tokens`] ?? ""}
                  onChange={(e) => setConfig({ ...config, [`${f.key}_max_tokens`]: Number(e.target.value) })}
                />
              </div>
              {f.quota && (
                <div className="mb-3 flex flex-wrap gap-3">
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

              {config.prompts_accessibles === false ? (
                <p className={`text-xs ${tw.textMuted}`}>Prompt IA : modifiable uniquement par le Super Admin.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenPrompt(openPrompt === f.key ? null : f.key)}
                  className={`flex items-center gap-1.5 text-xs font-semibold ${tw.textPrimary} hover:underline`}
                >
                  {openPrompt === f.key ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  Prompt IA
                </button>
              )}

              {config.prompts_accessibles !== false && openPrompt === f.key && (
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
      setOverrides(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      reportError("ECHEC_GET_QUOTA_IA_OVERRIDES", err);
      notifier.echec("Chargement des overrides impossible", err);
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
      notifier.echec("Compte introuvable", err);
    } finally {
      setChecking(false);
    }
  };

  const creerOverride = async (e) => {
    e.preventDefault();
    if (!usage) {
      notifier.erreur("Compte non vérifié", "Vérifiez d'abord le compte (e-mail) avant de créer un override.");
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
      notifier.succes("Override enregistré");
      setForm({ fonction: "PARSER_CV", limite_jour: "", limite_mois: "", justification: "" });
      fetchOverrides();
    } catch (err) {
      reportError("ECHEC_CREER_QUOTA_IA_OVERRIDE", err);
      notifier.echec("Création impossible", err);
    } finally {
      setSaving(false);
    }
  };

  const supprimer = (id) => {
    confirmToast("Supprimer cet override ? Le compte reviendra au quota par défaut (palier ou config globale).", async () => {
      try {
        await jobsService.supprimerQuotaIAOverride(id);
        notifier.succes("Override supprimé");
        fetchOverrides();
      } catch (err) {
        reportError("ECHEC_SUPPRIMER_QUOTA_IA_OVERRIDE", err);
        notifier.echec("Suppression impossible", err);
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
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); verifierCompte(); } }}
          />
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
            <button type="button" onClick={() => supprimer(o.id)} aria-label={`Supprimer le quota personnalisé de ${o.user_email}`} className={`text-red-600 hover:underline font-semibold shrink-0 ml-2 ${tw.focusRing} rounded`}>Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminIAConfig;
