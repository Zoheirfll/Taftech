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
} from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { SecteurDomaineSelect } from "../../Components/SecteurDomaineSelect";

// ─── Constantes grille ────────────────────────────────────────────────────────
const GRID = "minmax(0,1fr) 88px 72px 80px 52px 60px 64px 52px 60px 112px";

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

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashData, constData] = await Promise.all([
          jobsService.getDashboard(),
          jobsService.getConstants(),
        ]);
        setConstants(constData);
        setEntreprise(dashData.entreprise);
        setOffres(dashData.offres);
        setIsPremium(dashData.est_premium || false);
        setPremiumExpire(dashData.premium_expire_at || null);
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
  }, [navigate]);

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
        if (c.statut === "EN_COURS" || c.statut === "ENTRETIEN") enTraitement++;
        if (parseFloat(c.score_matching) >= 80) pertinentes++;
      });
    });
    return { total, nouvelles, pertinentes, enTraitement };
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
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">

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
              {["description", "missions", "profil_recherche"].map((field) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    {field === "profil_recherche" ? "Profil recherché" : field.charAt(0).toUpperCase() + field.slice(1)}
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
    </div>
  );
};

export default DashboardRecruteur;
