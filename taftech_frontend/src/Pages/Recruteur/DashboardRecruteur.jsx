import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import Select from "react-select";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl } from "../../utils/mediaUrl";
import { selectStyles } from "../../theme";
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
} from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";

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

  // ─── États de chargement/erreur ──────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700" />
      </div>
    );

  if (error === "PREMIUM_EXPIRE")
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl">⭐</div>
        <h2 className="text-xl font-bold text-slate-800">Abonnement Premium expiré</h2>
        <p className="text-sm text-slate-700 max-w-sm">
          L'abonnement Premium de votre entreprise a expiré. Votre accès est suspendu jusqu'au renouvellement.
          Contactez le propriétaire du compte.
        </p>
      </div>
    );

  if (error)
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-50 text-red-700 rounded-xl text-center text-sm font-medium">
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
    if (offre.est_cloturee)      return { label: "Archivée",    cls: "bg-slate-100 text-slate-600" };
    if (offre.statut_moderation === "EN_ATTENTE") return { label: "En validation", cls: "bg-amber-50 text-amber-700 border border-amber-200" };
    if (offre.statut_moderation === "REJETEE")    return { label: "À corriger",    cls: "bg-red-50 text-red-700 border border-red-200" };
    return { label: "Publiée", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Logo + nom + badges */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {entreprise?.logo
                ? <img src={mediaUrl(entreprise.logo)} alt="Logo" className="w-full h-full object-cover" />
                : <Building2 size={18} className="text-slate-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-slate-900">{entreprise?.nom_entreprise}</h1>
                {entreprise?.est_approuvee
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full"><CheckCircle size={11} /> Vérifié</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full"><AlertCircle size={11} /> En attente</span>}
                {isPremium
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-bold rounded-full border border-teal-200">
                      ⭐ Premium{premiumExpire && <span className="font-normal opacity-70"> · {premiumExpire}</span>}
                    </span>
                  : <Link to="/recruteurs/premium" className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-full hover:bg-teal-50 hover:text-teal-700 transition-colors">🔒 Premium</Link>}
              </div>

              {/* Mini stats inline — grille 2×2 mobile, ligne desktop */}
              <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-0 mt-2">
                {[
                  { val: stats.total,        label: "candidatures",  color: "text-slate-700" },
                  { val: stats.nouvelles,    label: "nouvelles",     color: "text-emerald-600" },
                  { val: stats.enTraitement, label: "en traitement", color: "text-amber-600" },
                  { val: stats.pertinentes,  label: "+80% IA",       color: "text-teal-700" },
                ].map(({ val, label, color }, i) => (
                  <React.Fragment key={label}>
                    <span className="text-xs text-slate-500 py-0.5 sm:py-0 sm:pr-4">
                      <span className={`font-bold text-sm ${color}`}>{val}</span> {label}
                    </span>
                    {i < 3 && <span className="hidden sm:inline text-slate-200 pr-4">|</span>}
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
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Building2 size={14} /> Ma vitrine
              </Link>
            )}
            {authService.peutFaire("UTILISATEUR") && entreprise?.est_approuvee && (
              <>
                <button
                  onClick={() => navigate("/cvtheque")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Search size={14} /> CV
                </button>
                <button
                  onClick={() => navigate("/creer-offre")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white text-sm font-bold rounded-lg hover:bg-teal-800 transition-colors shadow-sm"
                >
                  <Plus size={14} /> Publier une offre
                </button>
              </>
            )}
            {authService.peutFaire("UTILISATEUR") && !entreprise?.est_approuvee && (
              <div className="text-right">
                <button disabled className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed">
                  <Plus size={14} /> Publier une offre
                </button>
                <p className="text-xs text-amber-600 font-medium mt-1">Validation admin requise</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ONGLETS principaux ─────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {[
          { key: "ouvertes",  label: "Offres en cours", count: offresOuvertes.length },
          { key: "cloturees", label: "Archives",         count: offresCloturees.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setFiltreStatut("toutes"); setSearch(""); setSortConfig({ col: null, dir: "asc" }); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === key ? "border-teal-700 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            {label}
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === key ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600"}`}>
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une offre..."
            className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* Chips statut */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(activeTab === "ouvertes" ? [
            { key: "toutes",     label: "Toutes",      count: offresOuvertes.length },
            { key: "APPROUVEE",  label: "Publiées",    count: nbPubliees,     dot: "bg-emerald-400" },
            { key: "EN_ATTENTE", label: "En validation",count: nbEnValidation, dot: "bg-amber-400" },
            { key: "REJETEE",    label: "À corriger",  count: nbACorrection,  dot: "bg-red-400" },
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
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {dot && filtreStatut !== key && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
              {label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtreStatut === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      {enriched.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-16 px-8 text-center">
          {search ? (
            <>
              <Search size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 mb-1">Aucun résultat pour "{search}"</p>
              <p className="text-xs text-slate-400 mb-4">Essayez un autre mot-clé ou effacez la recherche.</p>
              <button onClick={() => setSearch("")} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                Effacer la recherche
              </button>
            </>
          ) : activeTab === "ouvertes" && offresOuvertes.length === 0 ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
                <Plus size={28} className="text-teal-600" />
              </div>
              <p className="text-base font-bold text-slate-900 mb-1">Aucune offre publiée</p>
              <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
                {entreprise?.est_approuvee
                  ? "Commencez à recruter en publiant votre première offre d'emploi."
                  : "Votre entreprise est en cours de validation par l'équipe TAFTECH avant de pouvoir publier."}
              </p>
              {entreprise?.est_approuvee && authService.peutFaire("UTILISATEUR") && (
                <button
                  onClick={() => navigate("/creer-offre")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Publier ma première offre
                </button>
              )}
            </>
          ) : (
            <>
              <Building2 size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Aucune offre dans cette catégorie</p>
            </>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          {/* En-têtes desktop */}
          <div className="hidden md:grid bg-slate-50 border-b border-slate-200 px-4 py-2.5" style={{ gridTemplateColumns: GRID }}>
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
                  ${col ? "text-slate-400 hover:text-slate-700 cursor-pointer" : "cursor-default"}`}
              >
                {label}
                {col && sortConfig.col === col && (
                  <span className="text-teal-600 ml-0.5">{sortConfig.dir === "asc" ? "▲" : "▼"}</span>
                )}
              </button>
            ))}
          </div>

          {/* Lignes */}
          {enriched.map(({ offre, nbCandidatures, nbNouvelles, nbEntretiens, nbRetenus, meilleurScore, jours }) => {
            const badge = getStatutBadge(offre);

            const rowBg = offre.statut_moderation === "REJETEE"
              ? "bg-red-50 hover:bg-red-50/60"
              : offre.statut_moderation === "EN_ATTENTE"
              ? "bg-amber-50 hover:bg-amber-50/60"
              : offre.est_cloturee
              ? "bg-slate-50 hover:bg-slate-100/50"
              : "bg-white hover:bg-slate-50/50";

            const expColor = jours === null ? "text-slate-300"
              : jours === 0 ? "text-red-600"
              : jours <= 7 ? "text-red-500"
              : jours <= 30 ? "text-amber-500"
              : jours <= 60 ? "text-teal-600"
              : "text-slate-500";

            const ActionBtn = () => {
              if (offre.statut_moderation === "REJETEE") {
                return authService.peutFaire("UTILISATEUR")
                  ? <button onClick={() => handleOuvrirModification(offre)} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap">Corriger <ChevronRight size={12} /></button>
                  : <span className="px-2.5 py-1.5 bg-red-100 text-red-600 text-xs font-semibold rounded-lg border border-red-200">Rejetée</span>;
              }
              if (offre.statut_moderation === "EN_ATTENTE") {
                return <span className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-medium rounded-lg whitespace-nowrap">En attente</span>;
              }
              return (
                <button onClick={() => navigate(`/dashboard/offres/${offre.id}`)} className="flex items-center gap-1 px-3 py-1.5 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap">
                  Candidats <ChevronRight size={12} />
                </button>
              );
            };

            return (
              <React.Fragment key={offre.id}>
                {/* ── Ligne desktop ── */}
                <div
                  className={`hidden md:grid items-center px-4 py-3 border-b border-slate-100 last:border-0 transition-colors ${rowBg}`}
                  style={{ gridTemplateColumns: GRID }}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">{offre.titre}</span>
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    {offre.motif_rejet && (
                      <p className="text-xs text-red-500 truncate mt-0.5 flex items-center gap-1">
                        <AlertTriangle size={10} className="shrink-0" /> {offre.motif_rejet}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-slate-600 truncate pr-2">{offre.wilaya?.split(" - ")[1] || offre.wilaya}</span>
                  <span className="text-xs text-slate-600">{offre.type_contrat}</span>

                  <span className={`text-xs font-semibold text-center tabular-nums ${expColor}`}>
                    {jours === null ? <span className="text-slate-300 text-base">∞</span> : jours === 0 ? "Auj." : `${jours}j`}
                  </span>

                  {[
                    { val: nbCandidatures, color: "text-slate-700" },
                    { val: nbNouvelles,    color: "text-emerald-600" },
                    { val: nbEntretiens,   color: "text-orange-500" },
                    { val: nbRetenus,      color: "text-teal-700" },
                  ].map(({ val, color }, i) => (
                    <span key={i} className={`text-base font-bold tabular-nums text-center ${val > 0 ? color : "text-slate-300"}`}>{val}</span>
                  ))}

                  <span className={`text-sm font-bold tabular-nums text-center ${
                    meilleurScore > 0
                      ? meilleurScore >= 80 ? "text-emerald-600" : meilleurScore >= 60 ? "text-amber-500" : "text-red-400"
                      : "text-slate-200"
                  }`}>
                    {meilleurScore > 0 ? `${meilleurScore}%` : "—"}
                  </span>

                  <div className="flex justify-end"><ActionBtn /></div>
                </div>

                {/* ── Card mobile ── */}
                <div className={`md:hidden border-b border-slate-100 last:border-0 p-4 transition-colors ${rowBg}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 truncate">{offre.titre}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin size={10} />{offre.wilaya?.split(" - ")[1] || offre.wilaya}</span>
                        <span>{offre.type_contrat}</span>
                        {jours === null
                          ? <span className="text-slate-300">∞ sans limite</span>
                          : <span className={`font-semibold ${expColor}`}>{jours === 0 ? "Expire auj." : `${jours}j`}</span>}
                      </div>
                      {offre.motif_rejet && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} className="shrink-0" /> {offre.motif_rejet}
                        </p>
                      )}
                    </div>
                    <ActionBtn />
                  </div>
                  <div className="flex items-center gap-5">
                    {[
                      { val: nbCandidatures, label: "Total", color: "text-slate-700" },
                      { val: nbNouvelles,    label: "Nouv.",  color: "text-emerald-600" },
                      { val: nbEntretiens,   label: "Entr.",  color: "text-orange-500" },
                      { val: nbRetenus,      label: "Ret.",   color: "text-teal-700" },
                    ].map(({ val, label, color }) => (
                      <div key={label} className="text-center">
                        <p className={`text-lg font-bold tabular-nums ${val > 0 ? color : "text-slate-300"}`}>{val}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                      </div>
                    ))}
                    {meilleurScore > 0 && (
                      <div className="text-center ml-auto">
                        <p className={`text-lg font-bold ${meilleurScore >= 80 ? "text-emerald-600" : meilleurScore >= 60 ? "text-amber-500" : "text-red-400"}`}>{meilleurScore}%</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Top IA</p>
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
              <button onClick={() => setShowModifierModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">✕</button>
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
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Spécialité</label>
                  <Select
                    options={constants.secteurs}
                    value={constants.secteurs.find((s) => s.value === modifierForm.specialite) || null}
                    onChange={(s) => setModifierForm({ ...modifierForm, specialite: s ? s.value : "" })}
                    styles={selectStyles}
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
