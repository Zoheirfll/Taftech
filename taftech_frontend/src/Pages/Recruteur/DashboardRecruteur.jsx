import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import Select from "react-select";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl } from "../../utils/mediaUrl";
import { selectStylesTeal, tw } from "../../theme";
import {
  Plus,
  Search,
  Building2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Settings,
  Users,
  Inbox,
  Sparkles,
  Clock,
  Trash2,
  X,
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
import InfoBanner from "../../Components/InfoBanner";
import { SecteurDomaineSelect } from "../../Components/SecteurDomaineSelect";
import MiniAreaChart from "../../Components/MiniAreaChart";
import FunnelChart from "../../Components/FunnelChart";
import { candidatFichierUrl } from "../../utils/mediaUrl";

// ─── Constantes grille ────────────────────────────────────────────────────────
const GRID = "minmax(0,1fr) 88px 72px 80px 52px 60px 64px 52px 60px 112px";

// ─── Constantes pipeline / recommandations ────────────────────────────────────
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
  const [activeTab, setActiveTab] = useState("ouvertes");
  const [filtreStatut, setFiltreStatut] = useState("toutes");
  const [search, setSearch] = useState("");
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [offreAModifier, setOffreAModifier] = useState(null);
  const [modifierForm, setModifierForm] = useState({});
  const [entreprise, setEntreprise] = useState(null);
  const [offres, setOffres] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpire, setPremiumExpire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });
  const [sortConfig, setSortConfig] = useState({ col: null, dir: "asc" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filtreOffreId, setFiltreOffreId] = useState("toutes");
  const [periodeEvolution, setPeriodeEvolution] = useState("6m");
  const [masquerDecides, setMasquerDecides] = useState(true);
  const [recommandesLimit, setRecommandesLimit] = useState(3);
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [statutMenuOuvertId, setStatutMenuOuvertId] = useState(null);
  const [changingStatutId, setChangingStatutId] = useState(null);
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
        const [dashData, constData] = await Promise.all([
          jobsService.getDashboard(dateDebut, dateFin),
          jobsService.getConstants(),
        ]);
        setConstants(constData);
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

  const handleOuvrirModification = (offre) => {
    setOffreAModifier(offre);
    setModifierForm({
      titre: offre.titre || "",
      wilaya: offre.wilaya || "",
      commune: offre.commune || "",
      diplome: offre.diplome || "",
      specialite: offre.specialite || "",
      type_contrat: offre.type_contrat || "",
      experience_requise: offre.experience_requise || "",
      nombre_postes: offre.nombre_postes || 1,
      description: offre.description || "",
      missions: offre.missions || "",
      profil_recherche: offre.profil_recherche || "",
      competences: offre.competences || "",
      salaire_propose: offre.salaire_propose || "",
    });
    setShowModifierModal(true);
  };

  const handleSauvegarderModification = async () => {
    const toastId = toast.loading("Envoi en cours...");
    try {
      const response = await jobsService.modifierOffre(offreAModifier.id, modifierForm);
      setOffres(offres.map((o) => (o.id === offreAModifier.id ? response.offre : o)));
      setShowModifierModal(false);
      setOffreAModifier(null);
      toast.success("Offre soumise pour revalidation !", { id: toastId });
    } catch (err) {
      toast.error("Erreur lors de la modification.", { id: toastId });
      reportError("ECHEC_MODIFIER_OFFRE", err);
    }
  };

  const handleSupprimerOffre = async (offre) => {
    setDeletingId(offre.id);
    try {
      await jobsService.supprimerOffre(offre.id);
      setOffres(offres.filter((o) => o.id !== offre.id));
      setConfirmDeleteId(null);
      toast.success("Offre supprimée.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de la suppression.");
      reportError("ECHEC_SUPPRIMER_OFFRE", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportExcelGlobal = async () => {
    try {
      await jobsService.exporterCandidaturesExcel();
    } catch (err) {
      toast.error("Erreur lors de l'export Excel.");
      reportError("ECHEC_EXPORT_EXCEL_GLOBAL", err);
    }
  };

  const handleChangerStatutRecommande = async (candidatureId, offreId, nouveauStatut) => {
    setChangingStatutId(candidatureId);
    try {
      await jobsService.updateStatutCandidature(candidatureId, { statut: nouveauStatut });
      setOffres((prev) =>
        prev.map((o) =>
          o.id !== offreId
            ? o
            : { ...o, candidatures: o.candidatures.map((c) => (c.id === candidatureId ? { ...c, statut: nouveauStatut } : c)) },
        ),
      );
      toast.success("Statut mis à jour.");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du statut.");
      reportError("ECHEC_CHANGER_STATUT_RECOMMANDE", err);
    } finally {
      setChangingStatutId(null);
      setStatutMenuOuvertId(null);
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
  const offresOuvertes = offres.filter((o) => !o.est_cloturee);
  const offresCloturees = offres.filter((o) => o.est_cloturee);

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

  // ─── Candidats recommandés : meilleurs scores, filtrables par offre/statut ──
  const candidatsRecommandesTous = (() => {
    const all = [];
    offresPourAnalyse.forEach((o) => o.candidatures?.forEach((c) => {
      if (!c.est_rapide && c.candidat && c.score_matching !== null && c.score_matching !== undefined) {
        if (masquerDecides && (c.statut === "RETENU" || c.statut === "REFUSE")) return;
        all.push({ ...c, offreTitre: o.titre, offreId: o.id });
      }
    }));
    return all.sort((a, b) => parseFloat(b.score_matching) - parseFloat(a.score_matching));
  })();

  const getStatutBadge = (offre) => {
    if (offre.est_cloturee)      return { label: "Archivée",    cls: tw.tagSlateSoft };
    if (offre.statut_moderation === "EN_ATTENTE") return { label: "En validation", cls: `border ${tw.candidatureStatutStyles.RECUE}` };
    if (offre.statut_moderation === "REJETEE")    return { label: "À corriger",    cls: `border ${tw.candidatureStatutStyles.REFUSE}` };
    return { label: "Publiée", cls: `border ${tw.candidatureStatutStyles.RETENU}` };
  };

  const listeBase = activeTab === "ouvertes" ? offresOuvertes : offresCloturees;
  const listeStatut = filtreStatut === "toutes" ? listeBase : listeBase.filter((o) => o.statut_moderation === filtreStatut);
  const listeRecherchee = search.trim()
    ? listeStatut.filter((o) => o.titre?.toLowerCase().includes(search.toLowerCase()))
    : listeStatut;

  const enriched = listeRecherchee.map((offre) => {
    const nbCandidatures = offre.candidatures?.length || 0;
    const nbNouvelles    = offre.candidatures?.filter((c) => c.statut === "RECUE").length || 0;
    const nbEntretiens   = offre.candidatures?.filter((c) => c.statut === "ENTRETIEN").length || 0;
    const nbRetenus      = offre.candidatures?.filter((c) => c.statut === "RETENU").length || 0;
    const meilleurScore  = offre.candidatures?.length > 0
      ? Math.max(...offre.candidatures.map((c) => parseFloat(c.score_matching) || 0))
      : null;
    const jours = offre.date_expiration && !offre.est_cloturee
      ? Math.max(0, Math.ceil((new Date(offre.date_expiration) - new Date()) / 86400000))
      : null;
    return { offre, nbCandidatures, nbNouvelles, nbEntretiens, nbRetenus, meilleurScore, jours };
  });

  if (sortConfig.col) {
    const dir = sortConfig.dir === "asc" ? 1 : -1;
    enriched.sort((a, b) => {
      const map = {
        titre:        [a.offre.titre,       b.offre.titre],
        wilaya:       [a.offre.wilaya,      b.offre.wilaya],
        type_contrat: [a.offre.type_contrat,b.offre.type_contrat],
        expiration:   [a.jours ?? 9999,     b.jours ?? 9999],
        total:        [a.nbCandidatures,    b.nbCandidatures],
        nouvelles:    [a.nbNouvelles,       b.nbNouvelles],
        entretiens:   [a.nbEntretiens,      b.nbEntretiens],
        retenus:      [a.nbRetenus,         b.nbRetenus],
        score:        [a.meilleurScore ?? -1, b.meilleurScore ?? -1],
      };
      const [va, vb] = map[sortConfig.col] || [0, 0];
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });
  }

  const nbPubliees    = offresOuvertes.filter((o) => o.statut_moderation === "APPROUVEE").length;
  const nbEnValidation= offresOuvertes.filter((o) => o.statut_moderation === "EN_ATTENTE").length;
  const nbACorrection = offresOuvertes.filter((o) => o.statut_moderation === "REJETEE").length;

  const toggleSort = (col) =>
    setSortConfig((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));

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
              onChange={(e) => { setFiltreOffreId(e.target.value); setRecommandesLimit(3); }}
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

          {/* ── GRILLE APERÇU : contenu (2 col) + sidebar recommandés ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 mb-5 items-start">
            {/* Colonne contenu — Évolution / Pipeline / Offres actives / Sources / Activité récente */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">
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

              <div className={`${tw.cardColors} rounded-2xl p-5 overflow-hidden`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h2 className={`text-sm font-bold ${tw.textStrong}`}>Mes offres d'emploi actives</h2>
                  <button type="button" onClick={() => { setActiveTab("ouvertes"); }} className={`text-xs font-semibold ${tw.textTeal}`}>Voir toutes</button>
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
                  <div className="space-y-2.5">
                    {sourcesDonut.map((s) => (
                      <div key={s.key} className="flex items-center gap-3">
                        <span className={`text-xs w-24 shrink-0 ${tw.textMuted700}`}>{s.label}</span>
                        <div className={`flex-1 h-2.5 ${tw.surfaceSubtle} rounded-full overflow-hidden`}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: s.couleur }} />
                        </div>
                        <span className={`text-xs font-bold w-8 text-right shrink-0 ${tw.textStrong}`}>{s.count}</span>
                        <span className={`text-[10px] w-9 text-right shrink-0 ${tw.textMuted}`}>{s.count > 0 ? `${s.pct}%` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`${tw.cardColors} rounded-2xl p-5 md:col-span-2`}>
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
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${tw.bgTealSolid}`} />
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

            {/* Sidebar — Candidats recommandés, sticky sur toute la hauteur (desktop) */}
            {candidatsRecommandesTous.length > 0 && (
              <div className="lg:col-span-1 lg:sticky lg:top-20">
                <div className={`${tw.cardColors} rounded-2xl p-5`}>
                  <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
                    <Star size={15} className={tw.textTeal} /> Candidats recommandés
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${tw.tagSlateSoft700}`}>{candidatsRecommandesTous.length}</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    {candidatsRecommandesTous.slice(0, 6).map((cand) => {
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
              </div>
            )}
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

      {/* ── GESTION DÉTAILLÉE DES OFFRES (séparée de l'aperçu ci-dessus) ────── */}
      <div className={`border-t-2 ${tw.borderBase} pt-6 mt-2 mb-4`}>
        <h2 className={`text-base font-bold ${tw.textStrong}`}>Gestion de vos offres</h2>
        <p className={`text-xs mt-0.5 ${tw.textMuted}`}>Recherche, filtres, modification et suivi détaillé de chaque offre.</p>
      </div>

      {/* ── ONGLETS principaux ─────────────────────────────────────────────── */}
      <div className={`flex gap-1 border-b ${tw.borderBase} mb-5`}>
        {[
          { key: "ouvertes",  label: "Offres en cours", count: offresOuvertes.length },
          { key: "cloturees", label: "Archives",         count: offresCloturees.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setFiltreStatut("toutes"); setSearch(""); setSortConfig({ col: null, dir: "asc" }); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === key ? tw.segmentTabActiveTeal : tw.segmentTabInactive}`}
          >
            {label}
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === key ? tw.compareChipActive : tw.tagSlateSoft}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── INFOBANNER (après onglets) ─────────────────────────────────────── */}
      <div className="mb-4">
        <InfoBanner storageKey="dashboard_recruteur" title="Bienvenue sur votre tableau de bord" color="teal">
          Publiez des offres, suivez vos candidatures et analysez vos talents depuis ici.
          Votre entreprise doit être <strong>validée par l'équipe TAFTECH</strong> avant de pouvoir publier.
          Pour accéder à la CVthèque et à l'analyse IA, passez en <strong>Premium</strong>.
        </InfoBanner>
      </div>

      {/* ── BARRE DE RECHERCHE + CHIPS STATUT ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Recherche */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une offre..."
            className={`w-full pl-8 pr-4 py-2 rounded-lg text-sm ${tw.inputColorsWhiteTeal}`}
          />
        </div>

        {/* Chips statut */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(activeTab === "ouvertes" ? [
            { key: "toutes",     label: "Toutes",      count: offresOuvertes.length },
            { key: "APPROUVEE",  label: "Publiées",    count: nbPubliees,     dot: tw.dotEmerald400 },
            { key: "EN_ATTENTE", label: "En validation",count: nbEnValidation, dot: tw.dotAmber400 },
            { key: "REJETEE",    label: "À corriger",  count: nbACorrection,  dot: tw.dotRed400 },
          ] : [
            { key: "toutes",    label: "Toutes",   count: offresCloturees.length },
            { key: "APPROUVEE", label: "Publiées", count: offresCloturees.filter((o) => o.statut_moderation === "APPROUVEE").length },
            { key: "REJETEE",   label: "Rejetées", count: offresCloturees.filter((o) => o.statut_moderation === "REJETEE").length },
          ]).map(({ key, label, count, dot }) => (
            <button
              key={key}
              onClick={() => setFiltreStatut(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filtreStatut === key
                  ? tw.chipTealActive
                  : tw.chipNeutralInactive
              }`}
            >
              {dot && filtreStatut !== key && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
              {label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${filtreStatut === key ? tw.badgeOnGradient : tw.tagSlateSoft700}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      {enriched.length === 0 ? (
        <div className={`${tw.cardColors} border-dashed rounded-2xl py-16 px-8 text-center`}>
          {search ? (
            <>
              <Search size={32} className={`${tw.textSlate200} mx-auto mb-3`} />
              <p className={`text-sm font-semibold mb-1 ${tw.textMuted700}`}>Aucun résultat pour "{search}"</p>
              <p className={`text-xs mb-4 ${tw.textMuted}`}>Essayez un autre mot-clé ou effacez la recherche.</p>
              <button onClick={() => setSearch("")} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tw.buttonNeutralSoft}`}>
                Effacer la recherche
              </button>
            </>
          ) : activeTab === "ouvertes" && offresOuvertes.length === 0 ? (
            <>
              <div className={`w-16 h-16 rounded-2xl ${tw.bgTealSoft} border ${tw.borderTeal100} flex items-center justify-center mx-auto mb-4`}>
                <Plus size={28} className={tw.textTeal600} />
              </div>
              <p className={`text-base font-bold mb-1 ${tw.textStrong}`}>Aucune offre publiée</p>
              <p className={`text-sm mb-6 max-w-xs mx-auto ${tw.textMuted}`}>
                {entreprise?.est_approuvee
                  ? "Commencez à recruter en publiant votre première offre d'emploi."
                  : "Votre entreprise est en cours de validation par l'équipe TAFTECH avant de pouvoir publier."}
              </p>
              {entreprise?.est_approuvee && authService.peutFaire("UTILISATEUR") && (
                <button
                  onClick={() => navigate("/creer-offre")}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors shadow-sm ${tw.bgTealSolid}`}
                >
                  <Plus size={16} /> Publier ma première offre
                </button>
              )}
            </>
          ) : (
            <>
              <Building2 size={28} className={`${tw.textSlate200} mx-auto mb-3`} />
              <p className={`text-sm font-medium ${tw.textMuted700}`}>Aucune offre dans cette catégorie</p>
            </>
          )}
        </div>
      ) : (
        <div className={`border ${tw.borderBase} rounded-2xl overflow-hidden`}>
          {/* En-têtes desktop */}
          <div className={`hidden md:grid ${tw.surfaceMuted} border-b ${tw.borderBase} px-4 py-2.5`} style={{ gridTemplateColumns: GRID }}>
            {[
              { label: "Offre",      col: "titre",        align: "left" },
              { label: "Wilaya",     col: "wilaya",       align: "left" },
              { label: "Contrat",    col: "type_contrat", align: "left" },
              { label: "Expiration", col: "expiration",   align: "center" },
              { label: "Total",      col: "total",        align: "center" },
              { label: "Nouv.",      col: "nouvelles",    align: "center" },
              { label: "Entret.",    col: "entretiens",   align: "center" },
              { label: "Ret.",       col: "retenus",      align: "center" },
              { label: "Top IA",     col: "score",        align: "center" },
              { label: "",           col: null,           align: "right" },
            ].map(({ label, col, align }, i) => (
              <button
                key={i}
                onClick={() => col && toggleSort(col)}
                className={`text-[11px] font-semibold uppercase tracking-wide flex items-center gap-0.5 transition-colors
                  ${align === "center" ? "justify-center" : ""}
                  ${col ? `${tw.textMutedHoverMuted700} cursor-pointer` : "cursor-default"}`}
              >
                {label}
                {col && sortConfig.col === col && (
                  <span className={`ml-0.5 ${tw.textTeal600}`}>{sortConfig.dir === "asc" ? "▲" : "▼"}</span>
                )}
              </button>
            ))}
          </div>

          {/* Lignes */}
          {enriched.map(({ offre, nbCandidatures, nbNouvelles, nbEntretiens, nbRetenus, meilleurScore, jours }) => {
            const badge = getStatutBadge(offre);

            const rowBg = offre.statut_moderation === "REJETEE"
              ? tw.rowRejetee
              : offre.statut_moderation === "EN_ATTENTE"
              ? tw.rowEnAttente
              : offre.est_cloturee
              ? tw.rowCloturee
              : tw.rowDefault;

            const expColor = jours === null ? tw.textSubtle
              : jours === 0 ? tw.textError
              : jours <= 7 ? tw.textErrorMuted
              : jours <= 30 ? tw.textAmber500
              : jours <= 60 ? tw.textTeal600
              : tw.textMuted700;

            const canDelete = authService.peutFaire("UTILISATEUR");
            const isConfirmingDelete = confirmDeleteId === offre.id;
            const DeleteControl = () => {
              if (!canDelete) return null;
              if (isConfirmingDelete) {
                return (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => handleSupprimerOffre(offre)}
                      disabled={deletingId === offre.id}
                      className={`px-2 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap ${tw.buttonDangerSolid} disabled:opacity-50`}
                    >
                      {deletingId === offre.id ? "..." : "Confirmer"}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className={`p-1.5 rounded-lg ${tw.iconButton}`}>
                      <X size={12} />
                    </button>
                  </span>
                );
              }
              return (
                <button onClick={() => setConfirmDeleteId(offre.id)} className={`p-1.5 rounded-lg ${tw.iconButton}`} title="Supprimer l'offre">
                  <Trash2 size={13} />
                </button>
              );
            };

            const ActionBtn = () => {
              if (offre.statut_moderation === "REJETEE") {
                return authService.peutFaire("UTILISATEUR")
                  ? <span className="flex items-center gap-1.5">
                      <button onClick={() => handleOuvrirModification(offre)} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${tw.buttonDangerSolid}`}>Corriger <ChevronRight size={12} /></button>
                      <DeleteControl />
                    </span>
                  : <span className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border ${tw.badgeErrorLight100} ${tw.borderError}`}>Rejetée</span>;
              }
              if (offre.statut_moderation === "EN_ATTENTE") {
                return (
                  <span className="flex items-center gap-1.5">
                    <span className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${tw.tagSlateSoft}`}>En attente</span>
                    <DeleteControl />
                  </span>
                );
              }
              return (
                <button onClick={() => navigate(`/dashboard/offres/${offre.id}`)} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${tw.bgTealSolid}`}>
                  Candidats <ChevronRight size={12} />
                </button>
              );
            };

            return (
              <React.Fragment key={offre.id}>
                {/* ── Ligne desktop ── */}
                <div
                  className={`hidden md:grid items-center px-4 py-3 border-b ${tw.borderSubtle} last:border-0 transition-colors ${rowBg}`}
                  style={{ gridTemplateColumns: GRID }}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${tw.textStrong}`}>{offre.titre}</span>
                      <span className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    {offre.motif_rejet && (
                      <p className={`text-xs truncate mt-0.5 flex items-center gap-1 ${tw.textErrorMuted}`}>
                        <AlertTriangle size={10} className="shrink-0" /> {offre.motif_rejet}
                      </p>
                    )}
                  </div>

                  <span className={`text-xs truncate pr-2 ${tw.textMuted}`}>{offre.wilaya?.split(" - ")[1] || offre.wilaya}</span>
                  <span className={`text-xs ${tw.textMuted}`}>{offre.type_contrat}</span>

                  <span className={`text-xs font-semibold text-center tabular-nums ${expColor}`}>
                    {jours === null ? <span className={`${tw.textSubtle} text-base`}>∞</span> : jours === 0 ? "Auj." : `${jours}j`}
                  </span>

                  {[
                    { val: nbCandidatures, color: tw.textMuted700 },
                    { val: nbNouvelles,    color: tw.scoreTextSuccess },
                    { val: nbEntretiens,   color: tw.textOrange500 },
                    { val: nbRetenus,      color: tw.textTeal },
                  ].map(({ val, color }, i) => (
                    <span key={i} className={`text-base font-bold tabular-nums text-center ${val > 0 ? color : tw.textSubtle}`}>{val}</span>
                  ))}

                  <span className={`text-sm font-bold tabular-nums text-center ${
                    meilleurScore > 0
                      ? meilleurScore >= 80 ? tw.scoreTextSuccess : meilleurScore >= 60 ? tw.textAmber500 : tw.textRed400
                      : tw.textSlate200
                  }`}>
                    {meilleurScore > 0 ? `${meilleurScore}%` : "—"}
                  </span>

                  <div className="flex justify-end"><ActionBtn /></div>
                </div>

                {/* ── Card mobile ── */}
                <div className={`md:hidden border-b ${tw.borderSubtle} last:border-0 p-4 transition-colors ${rowBg}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-semibold truncate ${tw.textStrong}`}>{offre.titre}</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className={`flex items-center gap-2 flex-wrap text-xs ${tw.textMuted700}`}>
                        <span className="flex items-center gap-1"><MapPin size={10} />{offre.wilaya?.split(" - ")[1] || offre.wilaya}</span>
                        <span>{offre.type_contrat}</span>
                        {jours === null
                          ? <span className={tw.textSubtle}>∞ sans limite</span>
                          : <span className={`font-semibold ${expColor}`}>{jours === 0 ? "Expire auj." : `${jours}j`}</span>}
                      </div>
                      {offre.motif_rejet && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${tw.textErrorMuted}`}>
                          <AlertTriangle size={10} className="shrink-0" /> {offre.motif_rejet}
                        </p>
                      )}
                    </div>
                    <ActionBtn />
                  </div>
                  <div className="flex items-center gap-5">
                    {[
                      { val: nbCandidatures, label: "Total", color: tw.textMuted700 },
                      { val: nbNouvelles,    label: "Nouv.",  color: tw.scoreTextSuccess },
                      { val: nbEntretiens,   label: "Entr.",  color: tw.textOrange500 },
                      { val: nbRetenus,      label: "Ret.",   color: tw.textTeal },
                    ].map(({ val, label, color }) => (
                      <div key={label} className="text-center">
                        <p className={`text-lg font-bold tabular-nums ${val > 0 ? color : tw.textSubtle}`}>{val}</p>
                        <p className={`text-xs uppercase tracking-wide ${tw.textMuted}`}>{label}</p>
                      </div>
                    ))}
                    {meilleurScore > 0 && (
                      <div className="text-center ml-auto">
                        <p className={`text-lg font-bold ${meilleurScore >= 80 ? tw.scoreTextSuccess : meilleurScore >= 60 ? tw.textAmber500 : tw.textRed400}`}>{meilleurScore}%</p>
                        <p className={`text-xs uppercase tracking-wide ${tw.textMuted}`}>Top IA</p>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── MODAL MODIFICATION ─────────────────────────────────────────────── */}
      {showModifierModal && offreAModifier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">Corriger l'offre</h3>
                <p className="text-xs text-slate-600 mt-0.5">L'offre sera soumise à revalidation après modification.</p>
              </div>
              <button onClick={() => setShowModifierModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">✕</button>
            </div>
            {offreAModifier.motif_rejet && (
              <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Motif de rejet</p>
                <p className="text-sm text-red-600">{offreAModifier.motif_rejet}</p>
              </div>
            )}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Titre *</label>
                <input
                  type="text"
                  value={modifierForm.titre}
                  onChange={(e) => setModifierForm({ ...modifierForm, titre: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Wilaya</label>
                  <Select
                    options={constants.wilayas}
                    value={constants.wilayas.find((w) => w.value === modifierForm.wilaya) || null}
                    onChange={(s) => setModifierForm({ ...modifierForm, wilaya: s ? s.value : "" })}
                    styles={selectStylesTeal}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Spécialité</label>
                  <SecteurDomaineSelect
                    value={modifierForm.specialite}
                    onChange={(domaineCode) => setModifierForm({ ...modifierForm, specialite: domaineCode })}
                    styles={selectStylesTeal}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Nombre de postes</label>
                  <input
                    type="number"
                    min="1"
                    value={modifierForm.nombre_postes || 1}
                    onChange={(e) => setModifierForm({ ...modifierForm, nombre_postes: e.target.value ? parseInt(e.target.value, 10) : 1 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              {["description", "missions", "profil_recherche", "competences"].map((field) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    {field === "profil_recherche" ? "Profil recherché" : field === "competences" ? "Compétences requises" : field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <textarea
                    rows="3"
                    value={modifierForm[field] || ""}
                    onChange={(e) => setModifierForm({ ...modifierForm, [field]: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModifierModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">Annuler</button>
                <button onClick={handleSauvegarderModification} className="flex-1 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors">Soumettre pour revalidation</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
