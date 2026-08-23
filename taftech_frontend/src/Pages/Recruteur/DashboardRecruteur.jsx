import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl } from "../../utils/mediaUrl";
import { tw } from "../../theme";
import {
  Plus,
  Search,
  Building2,
  CheckCircle,
  AlertCircle,
  Settings,
  Users,
  Inbox,
  Sparkles,
  Clock,
  Download,
  TrendingUp,
  GitBranch,
  Star,
  HelpCircle,
  ChevronDown,
  SlidersHorizontal,
  LineChart,
  BarChart3,
  History,
  Percent,
  Calendar,
  FileDown,
  Send,
  Bookmark,
  Activity,
  LifeBuoy,
  Mail,
  GraduationCap,
} from "lucide-react";
import MiniAreaChart from "../../Components/MiniAreaChart";
import FunnelChart from "../../Components/FunnelChart";
import DonutChart from "../../Components/DonutChart";
import { candidatFichierUrl } from "../../utils/mediaUrl";

// ─── Constantes pipeline / recommandations ────────────────────────────────────
const ACTIVITE_EMOJIS = {
  CREER_OFFRE: "📢",
  MODIFIER_OFFRE: "✏️",
  CLOTURER_OFFRE: "🔒",
  STATUT_CANDIDATURE: "🔄",
  EVALUER_CANDIDATURE: "⭐",
  INVITER_MEMBRE: "👥",
  RETIRER_MEMBRE: "🚫",
  CHANGER_ROLE: "🛡️",
  AUTRE: "🔔",
};

const PIPELINE_STAGES = [
  { key: "RECUE", label: "Reçue", color: "#d97706" },
  { key: "EN_COURS", label: "En cours", color: "#2563eb" },
  { key: "PRESELECTION", label: "Présélection", color: "#9333ea" },
  { key: "ENTRETIEN", label: "Entretien", color: "#ea580c" },
  { key: "RETENU", label: "Retenu(e)", color: "#059669" },
  { key: "REFUSE", label: "Refusé(e)", color: "#dc2626" },
];

const STATUTS_LABELS = {
  RECUE: "Candidature reçue",
  EN_COURS: "En cours d'étude",
  PRESELECTION: "Présélectionné",
  ENTRETIEN: "Entretien programmé",
  RETENU: "Candidat retenu",
  REFUSE: "Candidat refusé",
};

const CRITERES_MATCHING = [
  { key: "specialite", label: "Spécialité", max: 25 },
  { key: "diplome", label: "Diplôme", max: 20 },
  { key: "experience", label: "Expérience", max: 20 },
  { key: "region", label: "Localisation & mobilité", max: 20 },
  { key: "competences", label: "Compétences", max: 15 },
];

const PERIODES_EVOLUTION = [
  { key: "7j", label: "7 derniers jours" },
  { key: "30j", label: "30 derniers jours" },
  { key: "6m", label: "6 derniers mois" },
  { key: "1a", label: "12 derniers mois" },
];

const formatTempsRelatif = (dateStr) => {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures}h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours}j`;
};

const DashboardRecruteur = () => {
  const navigate = useNavigate();
  const [entreprise, setEntreprise] = useState(null);
  const [offres, setOffres] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpire, setPremiumExpire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtreOffreId, setFiltreOffreId] = useState("toutes");
  const [periodeEvolution, setPeriodeEvolution] = useState("6m");
  const [chartType, setChartType] = useState("area");
  const [showComparaison, setShowComparaison] = useState(false);
  const [showConversion, setShowConversion] = useState(false);

  // Période globale + KPIs comparatifs
  const [dateDebut, setDateDebut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateFin, setDateFin] = useState(() => new Date().toISOString().slice(0, 10));
  const [kpis, setKpis] = useState(null);
  const [palierActif, setPalierActif] = useState(null);

  // Activité récente + recherches sauvegardées
  const [activite, setActivite] = useState([]);
  const [recherches, setRecherches] = useState([]);

  // Mini-recherche CVthèque + CTA IA
  const [rechercheMotsCles, setRechercheMotsCles] = useState("");
  const [titreIA, setTitreIA] = useState("");

  // Sources des candidatures — période indépendante
  const [periodeSources, setPeriodeSources] = useState("30j");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const dashData = await jobsService.getDashboard(dateDebut, dateFin);
        setEntreprise(dashData.entreprise);
        setOffres(dashData.offres);
        setIsPremium(dashData.est_premium || false);
        setPremiumExpire(dashData.premium_expire_at || null);
        setKpis(dashData.kpis || null);
        setPalierActif(dashData.palier_actif || null);
      } catch (err) {
        if (err.response?.data?.code === "PREMIUM_EXPIRE") {
          setError("PREMIUM_EXPIRE");
        } else if (err.response?.status === 404) {
          navigate("/register-entreprise");
        } else {
          reportError("ECHEC_CHARGEMENT_DASHBOARD", err);
          setError("Impossible de charger les données du dashboard.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate, dateDebut, dateFin]);

  useEffect(() => {
    jobsService.getActiviteRecente().then(setActivite).catch(() => {});
    jobsService.getRecherchesSauvegardees().then(setRecherches).catch(() => {});
  }, []);

  const handleTelechargerRapport = async () => {
    try {
      await jobsService.telechargerRapportDashboard(dateDebut, dateFin);
    } catch (err) {
      toast.error("Erreur lors du téléchargement du rapport.");
    }
  };

  const handleRechercheCVTheque = () => {
    const params = new URLSearchParams();
    if (rechercheMotsCles) params.set("search", rechercheMotsCles);
    navigate(`/cvtheque?${params.toString()}`);
  };

  const handleAppliquerRecherche = (recherche) => {
    const params = new URLSearchParams(recherche.filtres || {});
    navigate(`/cvtheque?${params.toString()}`);
  };

  const handleGenererOffreIA = () => {
    const params = titreIA ? `?titre=${encodeURIComponent(titreIA)}` : "";
    navigate(`/creer-offre${params}`);
  };

  const handleExportExcelGlobal = async () => {
    try {
      await jobsService.exporterCandidaturesExcel();
    } catch (err) {
      toast.error("Erreur lors de l'export Excel.");
      reportError("ECHEC_EXPORT_EXCEL_GLOBAL", err);
    }
  };

  const handleToggleFavoriRecommande = async (candidatUserId) => {
    if (!candidatUserId) return;
    try {
      await jobsService.toggleFavoriCV(candidatUserId);
      toast.success("Favoris mis à jour.");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour des favoris.");
      reportError("ECHEC_TOGGLE_FAVORI_DASHBOARD", err);
    }
  };

  const [inviterCandidat, setInviterCandidat] = useState(null);
  const [offreInvitation, setOffreInvitation] = useState("");
  const [envoiInvitation, setEnvoiInvitation] = useState(false);

  const handleEnvoyerInvitation = async () => {
    if (!offreInvitation || !inviterCandidat) return;
    setEnvoiInvitation(true);
    try {
      await jobsService.inviterCandidatCVTheque(inviterCandidat.candidat?.id, offreInvitation);
      toast.success("Invitation envoyée !");
      setInviterCandidat(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'envoi de l'invitation.");
      reportError("ECHEC_INVITER_CANDIDAT_DASHBOARD", err);
    } finally {
      setEnvoiInvitation(false);
    }
  };

  // ─── États de chargement/erreur ──────────────────────────────────────────
  if (loading)
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${tw.card} rounded-2xl p-5 animate-pulse space-y-2`}>
              <div className={`h-3 w-1/2 ${tw.surfaceSubtle} rounded`} />
              <div className={`h-6 w-1/3 ${tw.surfaceSubtle} rounded`} />
            </div>
          ))}
        </div>
        <div className={`${tw.card} rounded-2xl overflow-hidden`}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-4 animate-pulse ${i > 0 ? `border-t ${tw.borderBase}` : ""}`}>
              <div className={`h-4 flex-1 ${tw.surfaceSubtle} rounded`} />
              <div className={`h-4 w-16 ${tw.surfaceSubtle} rounded`} />
              <div className={`h-4 w-12 ${tw.surfaceSubtle} rounded`} />
              <div className={`h-4 w-14 ${tw.surfaceSubtle} rounded`} />
            </div>
          ))}
        </div>
      </div>
    );

  if (error === "PREMIUM_EXPIRE")
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className={`w-16 h-16 rounded-2xl ${tw.bgWarningSoft} border ${tw.borderWarning} flex items-center justify-center text-3xl`}>⭐</div>
        <h2 className={`text-xl font-bold ${tw.textSlate800}`}>Abonnement Premium expiré</h2>
        <p className={`text-sm max-w-sm ${tw.bodyText}`}>
          L'abonnement Premium de votre entreprise a expiré. Votre accès est suspendu jusqu'au renouvellement.
          Contactez le propriétaire du compte.
        </p>
      </div>
    );

  if (error)
    return (
      <div className={`max-w-4xl mx-auto mt-10 p-6 ${tw.bgErrorSoft} ${tw.textError700} rounded-xl text-center text-sm font-medium`}>
        {error}
      </div>
    );

  // ─── Dérivées ─────────────────────────────────────────────────────────────
  const stats = (() => {
    let total = 0, nouvelles = 0, pertinentes = 0, enTraitement = 0;
    offres.forEach((o) => {
      o.candidatures?.forEach((c) => {
        total++;
        if (c.statut === "RECUE") nouvelles++;
        if (c.statut === "EN_COURS" || c.statut === "PRESELECTION" || c.statut === "ENTRETIEN") enTraitement++;
        if (parseFloat(c.score_matching) >= 80) pertinentes++;
      });
    });
    return { total, nouvelles, pertinentes, enTraitement };
  })();

  // ─── Offres filtrées (sélecteur partagé graphiques + recommandés) ─────────
  const offresPourAnalyse = filtreOffreId === "toutes" ? offres : offres.filter((o) => String(o.id) === String(filtreOffreId));

  // ─── Évolution candidatures/recrutements — période paramétrable ───────────
  // shiftPeriodes=1 décale tout le bucket d'une période complète en arrière (comparaison)
  const buildEvolutionBuckets = (periode, shiftPeriodes = 0) => {
    const now = new Date();
    let buckets;
    if (periode === "7j" || periode === "30j") {
      const nbJours = periode === "7j" ? 7 : 30;
      const decalage = shiftPeriodes * nbJours;
      buckets = Array.from({ length: nbJours }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (nbJours - 1 - i) - decalage);
        return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), candidatures: 0, recrutements: 0 };
      });
      offresPourAnalyse.forEach((o) => o.candidatures?.forEach((c) => {
        if (!c.date_postulation) return;
        const key = c.date_postulation.slice(0, 10);
        const entry = buckets.find((b) => b.key === key);
        if (entry) {
          entry.candidatures++;
          if (c.statut === "RETENU") entry.recrutements++;
        }
      }));
    } else {
      const nbMois = periode === "1a" ? 12 : 6;
      const decalage = shiftPeriodes * nbMois;
      buckets = Array.from({ length: nbMois }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (nbMois - 1 - i) - decalage, 1);
        return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("fr-FR", { month: "short" }), candidatures: 0, recrutements: 0 };
      });
      offresPourAnalyse.forEach((o) => o.candidatures?.forEach((c) => {
        if (!c.date_postulation) return;
        const d = new Date(c.date_postulation);
        const entry = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
        if (entry) {
          entry.candidatures++;
          if (c.statut === "RETENU") entry.recrutements++;
        }
      }));
    }
    buckets.forEach((b) => {
      b.tauxConversion = b.candidatures > 0 ? Math.round((b.recrutements / b.candidatures) * 100) : 0;
    });
    return buckets;
  };

  const evolution = buildEvolutionBuckets(periodeEvolution, 0);
  const evolutionPrevValues = showComparaison && chartType !== "bar"
    ? buildEvolutionBuckets(periodeEvolution, 1).map((b) => b.candidatures)
    : null;

  // ─── Pipeline : répartition des candidatures par statut + taux de conversion ──
  const pipelineCounts = (() => {
    const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.key, 0]));
    offresPourAnalyse.forEach((o) => o.candidatures?.forEach((c) => {
      if (counts[c.statut] !== undefined) counts[c.statut]++;
    }));
    return counts;
  })();
  const pipelineTotal = Object.values(pipelineCounts).reduce((a, b) => a + b, 0);
  const pipelineMax = Math.max(1, ...Object.values(pipelineCounts));

  // ─── Funnel 4 étapes (Candidatures reçues → Présélection → Entretiens → Recrutements) ──
  const funnelEtapes = (() => {
    const candidatures = offresPourAnalyse.flatMap((o) => o.candidatures || []);
    const total = candidatures.length || 1;
    const presel = candidatures.filter((c) => ["PRESELECTION", "ENTRETIEN", "RETENU", "REFUSE"].includes(c.statut)).length;
    const entretien = candidatures.filter((c) => ["ENTRETIEN", "RETENU"].includes(c.statut)).length;
    const retenu = candidatures.filter((c) => c.statut === "RETENU").length;
    return [
      { label: "Candidatures reçues", count: candidatures.length, pct: 100, couleur: "#4f46e5" },
      { label: "Présélection", count: presel, pct: Math.round((presel / total) * 100), couleur: "#6366f1" },
      { label: "Entretiens", count: entretien, pct: Math.round((entretien / total) * 100), couleur: "#0ea5e9" },
      { label: "Recrutements", count: retenu, pct: Math.round((retenu / total) * 100), couleur: "#10b981" },
    ];
  })();

  // ─── Sources des candidatures (donut, période indépendante) ─────────────────
  const sourcesDonut = (() => {
    const joursParPeriode = { "7j": 7, "30j": 30, "6m": 180, "1a": 365 };
    const seuil = new Date();
    seuil.setDate(seuil.getDate() - (joursParPeriode[periodeSources] || 30));
    const candidatures = offres.flatMap((o) => o.candidatures || []).filter((c) => {
      if (!c.date_postulation) return false;
      return new Date(c.date_postulation) >= seuil;
    });
    const counts = { SITE: 0, CVTHEQUE: 0, AUTRE: 0 };
    candidatures.forEach((c) => {
      const src = c.source || "SITE";
      if (counts[src] !== undefined) counts[src]++;
      else counts.AUTRE++;
    });
    const total = candidatures.length || 1;
    return [
      { key: "SITE", label: "Site TafTech", count: counts.SITE, pct: Math.round((counts.SITE / total) * 100), couleur: "#4f46e5" },
      { key: "CVTHEQUE", label: "CVthèque", count: counts.CVTHEQUE, pct: Math.round((counts.CVTHEQUE / total) * 100), couleur: "#0ea5e9" },
      { key: "AUTRE", label: "Autres", count: counts.AUTRE, pct: Math.round((counts.AUTRE / total) * 100), couleur: "#94a3b8" },
    ];
  })();

  // ─── Candidats recommandés : meilleurs scores toutes offres confondues ──
  // Pas de filtre "masquer retenus/refusés" ici (widget compact sans toggle,
  // contrairement à la page dédiée /candidats-recommandes) — sinon des
  // candidats scorés disparaissent silencieusement sans moyen de les revoir.
  const candidatsRecommandesTous = (() => {
    const all = [];
    offresPourAnalyse.forEach((o) => o.candidatures?.forEach((c) => {
      if (!c.est_rapide && c.candidat && c.score_matching !== null && c.score_matching !== undefined) {
        all.push({ ...c, offreTitre: o.titre, offreId: o.id });
      }
    }));
    return all.sort((a, b) => parseFloat(b.score_matching) - parseFloat(a.score_matching));
  })();

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-0 py-2">

      {/* ── HEADER COMPACT ─────────────────────────────────────────────────── */}
      <div className={`${tw.cardColors} rounded-2xl p-4 md:p-5 mb-5`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Logo + nom + badges */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${tw.surfaceSubtle} border ${tw.borderBase} flex items-center justify-center overflow-hidden shrink-0`}>
              {entreprise?.logo
                ? <img src={mediaUrl(entreprise.logo)} alt="Logo" className="w-full h-full object-cover" />
                : <Building2 size={18} className={tw.textMuted} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-lg font-extrabold ${tw.textStrong}`}>{entreprise?.nom_entreprise}</h1>
                {entreprise?.est_approuvee
                  ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.bgSuccessSoft} ${tw.textSuccess} text-xs font-semibold rounded-full`}><CheckCircle size={11} /> Vérifié</span>
                  : <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.bgWarningSoft} ${tw.textWarning} text-xs font-semibold rounded-full`}><AlertCircle size={11} /> En attente</span>}
                {isPremium
                  ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.bgTealSoft} ${tw.textTeal} text-xs font-bold rounded-full border ${tw.borderTeal200}`}>
                      ⭐ Premium{premiumExpire && <span className="font-normal opacity-70"> · {premiumExpire}</span>}
                    </span>
                  : <Link to="/recruteurs/premium" className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.tagSlateSoft700} text-xs font-medium rounded-full transition-colors hover:bg-teal-50 hover:text-teal-700`}>🔒 Premium</Link>}
              </div>

              {/* Mini stats inline — grille 2×2 mobile, ligne desktop */}
              <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-0 mt-2">
                {[
                  { val: stats.total,        label: "candidatures",  color: tw.textMuted700 },
                  { val: stats.nouvelles,    label: "nouvelles",     color: tw.scoreTextSuccess },
                  { val: stats.enTraitement, label: "en traitement", color: tw.scoreTextWarning },
                  { val: stats.pertinentes,  label: "+80% IA",       color: tw.textTeal },
                ].map(({ val, label, color }, i) => (
                  <React.Fragment key={label}>
                    <span className={`text-xs py-0.5 sm:py-0 sm:pr-4 ${tw.textMuted700}`}>
                      <span className={`font-bold text-sm ${color}`}>{val}</span> {label}
                    </span>
                    {i < 3 && <span className={`hidden sm:inline pr-4 ${tw.textSlate200}`}>|</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Boutons d'action + lien vitrine */}
          <div className="flex items-center gap-2 flex-wrap">
            {entreprise?.slug && entreprise?.est_approuvee && (
              <Link
                to={`/entreprise/${entreprise.slug}`}
                className={`flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-sm font-medium rounded-lg transition-colors ${tw.surface} ${tw.textMuted} ${tw.hoverSurfaceMuted}`}
              >
                <Building2 size={14} /> Ma vitrine
              </Link>
            )}
            {offres?.length > 0 && (
              <button
                onClick={handleExportExcelGlobal}
                className={`flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-sm font-medium rounded-lg transition-colors ${tw.surface} ${tw.textMuted} ${tw.hoverSurfaceMuted}`}
              >
                <Download size={14} /> Exporter Excel
              </button>
            )}
            {authService.peutFaire("UTILISATEUR") && entreprise?.est_approuvee && (
              <>
                <button
                  onClick={() => navigate("/cvtheque")}
                  className={`flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-sm font-semibold rounded-lg transition-colors ${tw.surface} ${tw.textMuted700} ${tw.hoverSurfaceMuted}`}
                >
                  <Search size={14} /> CV
                </button>
                <button
                  onClick={() => navigate("/creer-offre")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm ${tw.bgTealSolid}`}
                >
                  <Plus size={14} /> Publier une offre
                </button>
              </>
            )}
            {authService.peutFaire("UTILISATEUR") && !entreprise?.est_approuvee && (
              <div className="text-right">
                <button disabled className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg cursor-not-allowed ${tw.buttonNeutralSoft}`}>
                  <Plus size={14} /> Publier une offre
                </button>
                <p className={`text-xs font-medium mt-1 ${tw.scoreTextWarning}`}>Validation admin requise</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SÉLECTEUR DE PÉRIODE + KPIs + RAPPORT ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={14} className={tw.textMuted} />
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
          />
          <span className={`text-xs ${tw.textMuted}`}>→</span>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
          />
        </div>
        <button
          type="button"
          onClick={handleTelechargerRapport}
          className={`inline-flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-xs font-semibold rounded-lg transition-colors ${tw.surface} ${tw.textMuted700} ${tw.hoverSurfaceMuted}`}
        >
          <FileDown size={14} /> Télécharger le rapport
        </button>
      </div>

      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { cle: "offres_actives", label: "Offres actives", icon: Building2 },
            { cle: "candidatures_recues", label: "Candidatures reçues", icon: Users },
            { cle: "candidats_entretien", label: "Candidats en entretien", icon: Calendar },
            { cle: "recrutements", label: "Recrutements", icon: CheckCircle },
            { cle: "taux_conversion", label: "Taux de conversion", icon: TrendingUp, suffixe: "%" },
          ].map(({ cle, label, icon: Icon, suffixe }) => {
            const kpi = kpis[cle];
            if (!kpi) return null;
            const variation = kpi.variation_pct;
            return (
              <div key={cle} className={`${tw.cardColors} rounded-2xl p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${tw.textMuted}`}>{label}</p>
                    <p className={`text-2xl font-bold ${tw.textStrong}`}>{kpi.valeur}{suffixe || ""}</p>
                    {variation !== null && variation !== undefined && (
                      <p className={`text-xs font-medium ${variation >= 0 ? tw.scoreTextSuccess : tw.textRed400}`}>
                        {variation >= 0 ? "↗" : "↘"} {Math.abs(variation)}% vs période précédente
                      </p>
                    )}
                  </div>
                  <Icon size={18} className={tw.textMuted} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── GRAPHIQUES ─────────────────────────────────────────────────────── */}
      {offres.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SlidersHorizontal size={13} className={tw.textMuted} />
            <select
              value={filtreOffreId}
              onChange={(e) => setFiltreOffreId(e.target.value)}
              className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5 max-w-[220px]`}
            >
              <option value="toutes">Toutes les offres</option>
              {offres.map((o) => (
                <option key={o.id} value={o.id}>{o.titre}</option>
              ))}
            </select>
            <select
              value={periodeEvolution}
              onChange={(e) => setPeriodeEvolution(e.target.value)}
              className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
            >
              {PERIODES_EVOLUTION.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* ── LIGNE 1 : Évolution | Pipeline | Candidats recommandés (hauteur alignée) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 mb-2.5 items-stretch">
              <div className={`${tw.cardColors} rounded-2xl p-5`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
                    <TrendingUp size={15} className={tw.textTeal} /> Évolution
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setChartType("area")}
                      title="Courbe"
                      className={`p-1.5 rounded-lg border ${tw.borderBase} ${chartType === "area" ? tw.bgTealSoft + " " + tw.textTeal : `${tw.surface} ${tw.textMuted}`}`}
                    >
                      <LineChart size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      title="Barres"
                      className={`p-1.5 rounded-lg border ${tw.borderBase} ${chartType === "bar" ? tw.bgTealSoft + " " + tw.textTeal : `${tw.surface} ${tw.textMuted}`}`}
                    >
                      <BarChart3 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <label className={`flex items-center gap-1.5 text-xs font-medium ${chartType === "bar" ? "opacity-40" : "cursor-pointer"} ${tw.textMuted700}`}>
                    <input
                      type="checkbox"
                      checked={showComparaison}
                      disabled={chartType === "bar"}
                      onChange={(e) => setShowComparaison(e.target.checked)}
                      className="rounded"
                    />
                    <History size={12} /> Comparer à la période précédente
                  </label>
                  <label className={`flex items-center gap-1.5 text-xs font-medium ${chartType === "bar" ? "opacity-40" : "cursor-pointer"} ${tw.textMuted700}`}>
                    <input
                      type="checkbox"
                      checked={showConversion}
                      disabled={chartType === "bar"}
                      onChange={(e) => setShowConversion(e.target.checked)}
                      className="rounded"
                    />
                    <Percent size={12} /> Taux de conversion
                  </label>
                </div>
                <MiniAreaChart
                  data={evolution}
                  height={190}
                  chartType={chartType}
                  exportTitle="evolution-candidatures"
                  series={[
                    { key: "candidatures", color: "#4f46e5", label: "Candidatures reçues" },
                    { key: "recrutements", color: "#059669", label: "Recrutements" },
                  ]}
                  compareValues={evolutionPrevValues}
                  secondarySeries={showConversion && chartType !== "bar" ? { key: "tauxConversion", color: "#ea580c", label: "Taux de conversion (%)" } : null}
                />
              </div>

              <div className={`${tw.cardColors} rounded-2xl p-5`}>
                <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
                  <GitBranch size={15} className={tw.textTeal} /> Pipeline de recrutement
                </h2>
                <div className="flex justify-center mb-4">
                  <FunnelChart etapes={funnelEtapes} />
                </div>
                <div className="space-y-2.5">
                  {PIPELINE_STAGES.map((stage) => {
                    const count = pipelineCounts[stage.key];
                    const pct = (count / pipelineMax) * 100;
                    const pctTotal = pipelineTotal > 0 ? Math.round((count / pipelineTotal) * 100) : 0;
                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <span className={`text-xs w-24 shrink-0 ${tw.textMuted700}`}>{stage.label}</span>
                        <div className={`flex-1 h-2.5 ${tw.surfaceSubtle} rounded-full overflow-hidden`}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: stage.color }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-8 text-right shrink-0 ${tw.textStrong}`}>{count}</span>
                        <span className={`text-[10px] w-9 text-right shrink-0 ${tw.textMuted}`}>{count > 0 ? `${pctTotal}%` : ""}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {candidatsRecommandesTous.length > 0 ? (
                <div className={`${tw.cardColors} rounded-2xl p-5 flex flex-col`}>
                  <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
                    <Star size={15} className={tw.textTeal} /> Candidats recommandés
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${tw.tagSlateSoft700}`}>{candidatsRecommandesTous.length}</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    {candidatsRecommandesTous.slice(0, 3).map((cand) => {
                      const score = Math.round(parseFloat(cand.score_matching));
                      const nomAffiche = `${cand.candidat.first_name} ${(cand.candidat.last_name || "").slice(0, 1)}.`
                        .trim();
                      const tags = (cand.candidat.competences || "").split(",").map((c) => c.trim()).filter(Boolean).slice(0, 3);
                      return (
                        <div key={cand.id} className={`p-3.5 rounded-xl border ${tw.borderBase}`}>
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/offres/${cand.offreId}`)}
                              className={`w-10 h-10 rounded-full ${tw.surfaceSubtle} flex items-center justify-center overflow-hidden shrink-0`}
                            >
                              {cand.candidat.photo_profil ? (
                                <img src={candidatFichierUrl(cand.candidat.id, "photo")} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users size={16} className={tw.textMuted} />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/dashboard/offres/${cand.offreId}`)}
                                  className={`text-sm font-semibold ${tw.textStrong} hover:underline`}
                                >
                                  {nomAffiche}
                                </button>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${score >= 80 ? tw.bgSuccessSoft + " " + tw.textSuccess : score >= 60 ? tw.textAmber500 : tw.textRed400}`}>
                                  {score}% compatible
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${tw.textTeal}`}>{cand.offreTitre}</p>
                              {cand.candidat.wilaya && (
                                <p className={`text-xs mt-0.5 ${tw.textMuted}`}>{cand.candidat.wilaya.split(" - ")[1] || cand.candidat.wilaya}, Algérie</p>
                              )}
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {tags.map((t) => (
                                    <span key={t} className={`px-1.5 py-0.5 text-[10px] rounded ${tw.tagSlateSoft}`}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleFavoriRecommande(cand.candidat.id)}
                                title="Ajouter aux favoris"
                                className={`p-1 rounded-md transition-colors ${tw.hoverSurfaceSubtle}`}
                              >
                                <Bookmark size={14} className={tw.iconMuted} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setOffreInvitation(""); setInviterCandidat(cand); }}
                                title="Inviter à postuler"
                                className={`p-1 rounded-md transition-colors ${tw.hoverSurfaceSubtle}`}
                              >
                                <Send size={14} className={tw.iconMuted} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-center">
                    <Link to="/candidats-recommandes" className={`text-xs font-semibold ${tw.textTeal}`}>
                      Voir plus de candidats recommandés →
                    </Link>
                  </div>
                </div>
              ) : <div />}
          </div>

          {/* ── LIGNE 2 : Offres actives | Sources | Activité récente (hauteur alignée) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 mb-5 items-stretch">
              <div className={`${tw.cardColors} rounded-2xl p-5 overflow-hidden`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h2 className={`text-sm font-bold ${tw.textStrong}`}>Mes offres d'emploi actives</h2>
                  <Link to="/offres-emploi" className={`text-xs font-semibold ${tw.textTeal}`}>Voir toutes</Link>
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-left min-w-[280px]">
                    <thead>
                      <tr className={`text-[10px] uppercase tracking-wide font-semibold ${tw.textMuted}`}>
                        <th className="px-1 py-1.5">Poste</th>
                        <th className="px-1 py-1.5 text-center">Cand.</th>
                        <th className="px-1 py-1.5 text-center">Entret.</th>
                        <th className="px-1 py-1.5 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${tw.divideBase}`}>
                      {[...offres].sort((a, b) => new Date(b.date_publication) - new Date(a.date_publication)).slice(0, 5).map((o) => {
                        const nbCand = o.candidatures?.length || 0;
                        const nbEnt = o.candidatures?.filter((c) => c.statut === "ENTRETIEN").length || 0;
                        return (
                          <tr key={o.id} className={tw.rowHover}>
                            <td className="px-1 py-2 text-xs font-medium truncate max-w-[110px]">{o.titre}</td>
                            <td className="px-1 py-2 text-xs text-center">{nbCand}</td>
                            <td className="px-1 py-2 text-xs text-center">{nbEnt}</td>
                            <td className="px-1 py-2 text-right">
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${o.est_cloturee ? tw.tagSlateSoft : "bg-emerald-100 text-emerald-700"}`}>
                                {o.est_cloturee ? "Clôturée" : "Active"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {offres.length > 0 && (
                <div className={`${tw.cardColors} rounded-2xl p-5`}>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
                      Sources des candidatures
                    </h2>
                    <select
                      value={periodeSources}
                      onChange={(e) => setPeriodeSources(e.target.value)}
                      className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
                    >
                      {PERIODES_EVOLUTION.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <DonutChart data={sourcesDonut} />
                    <div className="flex-1 space-y-2.5 min-w-0">
                      {sourcesDonut.map((s) => (
                        <div key={s.key} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.couleur }} />
                          <span className={`text-xs flex-1 truncate ${tw.textMuted700}`}>{s.label}</span>
                          <span className={`text-xs font-bold shrink-0 ${tw.textStrong}`}>{s.count}</span>
                          <span className={`text-[10px] w-9 text-right shrink-0 ${tw.textMuted}`}>{s.count > 0 ? `${s.pct}%` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className={`${tw.cardColors} rounded-2xl p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
                    <Activity size={15} className={tw.textTeal} /> Activité récente
                  </h2>
                  {activite.length > 5 && (
                    <Link to="/activite" className={`text-xs font-semibold ${tw.textTeal}`}>Voir tout</Link>
                  )}
                </div>
                {activite.length === 0 ? (
                  <p className={`text-xs italic ${tw.textMuted}`}>Aucune activité récente.</p>
                ) : (
                  <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {activite.slice(0, 5).map((a) => (
                      <li key={a.id} className="flex items-start gap-2.5">
                        <span className={`w-7 h-7 rounded-full ${tw.surfaceSubtle} flex items-center justify-center text-sm shrink-0`}>
                          {ACTIVITE_EMOJIS[a.action] || ACTIVITE_EMOJIS.AUTRE}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs ${tw.textMuted700}`}>{a.phrase}</p>
                          <p className={`text-[10px] mt-0.5 ${tw.textMuted}`}>{formatTempsRelatif(a.date)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
          </div>
        </>
      )}

      {/* ── RECHERCHE CVTHÈQUE + GÉNÉRER OFFRE IA + BESOIN D'AIDE ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className={`${tw.cardColors} rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-bold ${tw.textStrong}`}>Recherche avancée dans la CVthèque</h2>
            {recherches.length > 0 && (
              <div className="relative group">
                <button type="button" className={`text-xs font-semibold ${tw.textTeal}`}>Recherche enregistrée</button>
                <div className={`absolute right-0 top-full mt-1 hidden group-hover:block ${tw.surface} border ${tw.borderBase} rounded-xl shadow-lg z-30 overflow-hidden min-w-[180px]`}>
                  {recherches.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleAppliquerRecherche(r)}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50"
                    >
                      {r.nom}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <input
            type="text"
            value={rechercheMotsCles}
            onChange={(e) => setRechercheMotsCles(e.target.value)}
            placeholder="Mots-clés (compétence, métier...)"
            className={`w-full px-3 py-2 rounded-lg text-sm mb-3 ${tw.inputColorsWhite}`}
          />
          <button
            type="button"
            onClick={handleRechercheCVTheque}
            className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${tw.bgTealSolid}`}
          >
            Rechercher
          </button>
        </div>

        <div className={`${tw.cardColors} rounded-2xl p-5`}>
          <h2 className={`text-sm font-bold ${tw.textStrong} mb-1`}>Générez vos offres avec l'IA</h2>
          <p className={`text-xs mb-3 ${tw.textMuted}`}>Créez une offre complète en quelques secondes.</p>
          <input
            type="text"
            value={titreIA}
            onChange={(e) => setTitreIA(e.target.value)}
            placeholder="Ex: Ingénieur qualité avec 5 ans d'expérience"
            disabled={!palierActif}
            className={`w-full px-3 py-2 rounded-lg text-sm mb-3 ${tw.inputColorsWhite} disabled:opacity-50`}
          />
          <button
            type="button"
            onClick={handleGenererOffreIA}
            disabled={!palierActif}
            className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${tw.bgTealSolid} disabled:opacity-50 disabled:cursor-not-allowed`}
            title={!palierActif ? "Nécessite un abonnement actif" : ""}
          >
            Générer avec l'IA
          </button>
          <Link to="/contact" className={`block text-center text-xs mt-2 ${tw.textTeal}`}>En savoir plus</Link>
        </div>

        <div className={`${tw.cardColors} rounded-2xl p-5`}>
          <h2 className={`text-sm font-bold ${tw.textStrong} mb-3 flex items-center gap-2`}>
            <LifeBuoy size={15} className={tw.textTeal} /> Besoin d'aide ?
          </h2>
          <div className="space-y-2.5">
            <Link to="/contact" className={`flex items-center gap-2 text-xs font-medium ${tw.textMuted700} hover:${tw.textTeal}`}>
              <LifeBuoy size={13} /> Centre d'aide
            </Link>
            <a href="mailto:taftech963@gmail.com" className={`flex items-center gap-2 text-xs font-medium ${tw.textMuted700} hover:${tw.textTeal}`}>
              <Mail size={13} /> Contacter un conseiller
            </a>
            <Link to="/pages/formation-recruteur" className={`flex items-center gap-2 text-xs font-medium ${tw.textMuted700} hover:${tw.textTeal}`}>
              <GraduationCap size={13} /> Formation recruteur
            </Link>
          </div>
        </div>
      </div>

      {inviterCandidat && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-base font-bold ${tw.textStrong} mb-4`}>
              Inviter {inviterCandidat.candidat?.first_name || "ce candidat"} à postuler
            </h3>
            <select
              value={offreInvitation}
              onChange={(e) => setOffreInvitation(e.target.value)}
              className={`w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm mb-4`}
            >
              <option value="" disabled>Choisir une offre</option>
              {offres.filter((o) => o.est_active && !o.est_cloturee && o.statut_moderation === "APPROUVEE").map((o) => (
                <option key={o.id} value={o.id}>{o.titre}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setInviterCandidat(null)}
                className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg`}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!offreInvitation || envoiInvitation}
                onClick={handleEnvoyerInvitation}
                className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg disabled:opacity-50`}
              >
                {envoiInvitation ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardRecruteur;
