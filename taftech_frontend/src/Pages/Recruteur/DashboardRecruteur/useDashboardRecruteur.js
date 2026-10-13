// Hook du tableau de bord recruteur : chargement des données, filtres, actions et valeurs calculées pour les widgets.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { jobsService } from "../../../Services/jobsService";
import { reportError } from "../../../utils/errorReporter";
import { apiErrMsg } from "../../../utils/apiErrMsg";
import {
  calculerStats,
  buildEvolutionBuckets,
  calculerPipeline,
  calculerFunnel,
  calculerSources,
  calculerCandidatsRecommandes,
} from "./calculs";

export const useDashboardRecruteur = () => {
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

  // Invitation d'un candidat recommandé
  const [inviterCandidat, setInviterCandidat] = useState(null);
  const [offreInvitation, setOffreInvitation] = useState("");
  const [envoiInvitation, setEnvoiInvitation] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const dashData = await jobsService.getDashboard(dateDebut, dateFin);
        setEntreprise(dashData.entreprise);
        setOffres(dashData.offres);
        setIsPremium(!!dashData.palier_actif);
        setPremiumExpire(dashData.palier_expiration || null);
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
      toast.error(apiErrMsg(err, "Erreur lors du téléchargement du rapport."));
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
      toast.error(apiErrMsg(err, "Erreur lors de l'export Excel."));
      reportError("ECHEC_EXPORT_EXCEL_GLOBAL", err);
    }
  };

  const handleToggleFavoriRecommande = async (candidatUserId) => {
    if (!candidatUserId) return;
    try {
      await jobsService.toggleFavoriCV(candidatUserId);
      toast.success("Favoris mis à jour.");
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la mise à jour des favoris."));
      reportError("ECHEC_TOGGLE_FAVORI_DASHBOARD", err);
    }
  };

  const handleEnvoyerInvitation = async () => {
    if (!offreInvitation || !inviterCandidat) return;
    setEnvoiInvitation(true);
    try {
      await jobsService.inviterCandidatCVTheque(inviterCandidat.candidat?.id, offreInvitation);
      toast.success("Invitation envoyée !");
      setInviterCandidat(null);
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de l'envoi de l'invitation."));
      reportError("ECHEC_INVITER_CANDIDAT_DASHBOARD", err);
    } finally {
      setEnvoiInvitation(false);
    }
  };

  // ─── Valeurs dérivées (calculées à chaque rendu, comme avant) ───────────
  const stats = calculerStats(offres);
  // Sélecteur partagé graphiques + recommandés
  const offresPourAnalyse = filtreOffreId === "toutes" ? offres : offres.filter((o) => String(o.id) === String(filtreOffreId));
  const evolution = buildEvolutionBuckets(offresPourAnalyse, periodeEvolution, 0);
  const evolutionPrevValues = showComparaison && chartType !== "bar"
    ? buildEvolutionBuckets(offresPourAnalyse, periodeEvolution, 1).map((b) => b.candidatures)
    : null;
  const pipeline = calculerPipeline(offresPourAnalyse);
  const funnelEtapes = calculerFunnel(offresPourAnalyse);
  const sourcesDonut = calculerSources(offres, periodeSources);
  const candidatsRecommandesTous = calculerCandidatsRecommandes(offresPourAnalyse);

  return {
    navigate,
    entreprise, offres, isPremium, premiumExpire, loading, error, kpis, palierActif,
    filtreOffreId, setFiltreOffreId,
    periodeEvolution, setPeriodeEvolution,
    chartType, setChartType,
    showComparaison, setShowComparaison,
    showConversion, setShowConversion,
    dateDebut, setDateDebut, dateFin, setDateFin,
    activite, recherches,
    rechercheMotsCles, setRechercheMotsCles,
    titreIA, setTitreIA,
    periodeSources, setPeriodeSources,
    inviterCandidat, setInviterCandidat,
    offreInvitation, setOffreInvitation,
    envoiInvitation,
    handleTelechargerRapport, handleRechercheCVTheque, handleAppliquerRecherche,
    handleGenererOffreIA, handleExportExcelGlobal, handleToggleFavoriRecommande,
    handleEnvoyerInvitation,
    stats, evolution, evolutionPrevValues, pipeline, funnelEtapes, sourcesDonut,
    candidatsRecommandesTous,
  };
};
