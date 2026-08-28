import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import { reportError } from "../../utils/errorReporter";
import { confirmToast } from "../../utils/confirmToast";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { selectStylesTeal, tw } from "../../theme";
import InfoBanner from "../../Components/InfoBanner";
import { SecteurDomaineSelect } from "../../Components/SecteurDomaineSelect";
import { Search, Plus, Building2, ChevronRight, MapPin, AlertTriangle, Trash2, X } from "lucide-react";

const GRID = "minmax(0,1fr) 88px 72px 80px 52px 60px 64px 52px 60px 112px";

const OffresListPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entreprise, setEntreprise] = useState(null);
  const [offres, setOffres] = useState([]);
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });

  const [activeTab, setActiveTab] = useState("ouvertes");
  const [filtreStatut, setFiltreStatut] = useState("toutes");
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ col: null, dir: "asc" });
  const [deletingId, setDeletingId] = useState(null);

  const [showModifierModal, setShowModifierModal] = useState(false);
  const [offreAModifier, setOffreAModifier] = useState(null);
  const [modifierForm, setModifierForm] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, constData] = await Promise.all([
          jobsService.getDashboard(),
          jobsService.getConstants(),
        ]);
        setEntreprise(dash.entreprise);
        setOffres(dash.offres || []);
        setConstants(constData);
      } catch (err) {
        reportError("ECHEC_LOAD_OFFRES_LIST", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      toast.error(apiErrMsg(err, "Erreur lors de la modification."), { id: toastId });
      reportError("ECHEC_MODIFIER_OFFRE", err);
    }
  };

  const handleSupprimerOffre = (offre) => {
    confirmToast(`Supprimer définitivement l'offre "${offre.titre}" ?`, async () => {
      setDeletingId(offre.id);
      try {
        await jobsService.supprimerOffre(offre.id);
        setOffres(offres.filter((o) => o.id !== offre.id));
        toast.success("Offre supprimée.");
      } catch (err) {
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
        reportError("ECHEC_SUPPRIMER_OFFRE", err);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const toggleSort = (col) =>
    setSortConfig((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));

  const getStatutBadge = (offre) => {
    if (offre.est_cloturee) return { label: "Archivée", cls: tw.tagSlateSoft };
    if (offre.statut_moderation === "EN_ATTENTE") return { label: "En validation", cls: `border ${tw.candidatureStatutStyles.RECUE}` };
    if (offre.statut_moderation === "REJETEE") return { label: "À corriger", cls: `border ${tw.candidatureStatutStyles.REFUSE}` };
    return { label: "Publiée", cls: `border ${tw.candidatureStatutStyles.RETENU}` };
  };

  if (loading) {
    return (
      <div className="space-y-4">
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
  }

  const offresOuvertes = offres.filter((o) => !o.est_cloturee);
  const offresCloturees = offres.filter((o) => o.est_cloturee);

  const listeBase = activeTab === "ouvertes" ? offresOuvertes : offresCloturees;
  const listeStatut = filtreStatut === "toutes" ? listeBase : listeBase.filter((o) => o.statut_moderation === filtreStatut);
  const listeRecherchee = search.trim()
    ? listeStatut.filter((o) => o.titre?.toLowerCase().includes(search.toLowerCase()))
    : listeStatut;

  const enriched = listeRecherchee.map((offre) => {
    const nbCandidatures = offre.candidatures?.length || 0;
    const nbNouvelles = offre.candidatures?.filter((c) => c.statut === "RECUE").length || 0;
    const nbEntretiens = offre.candidatures?.filter((c) => c.statut === "ENTRETIEN").length || 0;
    const nbRetenus = offre.candidatures?.filter((c) => c.statut === "RETENU").length || 0;
    const meilleurScore = offre.candidatures?.length > 0
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
        titre: [a.offre.titre, b.offre.titre],
        wilaya: [a.offre.wilaya, b.offre.wilaya],
        type_contrat: [a.offre.type_contrat, b.offre.type_contrat],
        expiration: [a.jours ?? 9999, b.jours ?? 9999],
        total: [a.nbCandidatures, b.nbCandidatures],
        nouvelles: [a.nbNouvelles, b.nbNouvelles],
        entretiens: [a.nbEntretiens, b.nbEntretiens],
        retenus: [a.nbRetenus, b.nbRetenus],
        score: [a.meilleurScore ?? -1, b.meilleurScore ?? -1],
      };
      const [va, vb] = map[sortConfig.col] || [0, 0];
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });
  }

  const nbPubliees = offresOuvertes.filter((o) => o.statut_moderation === "APPROUVEE").length;
  const nbEnValidation = offresOuvertes.filter((o) => o.statut_moderation === "EN_ATTENTE").length;
  const nbACorrection = offresOuvertes.filter((o) => o.statut_moderation === "REJETEE").length;

  return (
    <div className="w-full px-0 py-2">
      <div className="mb-4">
        <h1 className={`text-base font-bold ${tw.textStrong}`}>Gestion de vos offres</h1>
        <p className={`text-xs mt-0.5 ${tw.textMuted}`}>Recherche, filtres, modification et suivi détaillé de chaque offre.</p>
      </div>

      {/* ── ONGLETS principaux ─────────────────────────────────────────────── */}
      <div className={`flex gap-1 border-b ${tw.borderBase} mb-5`}>
        {[
          { key: "ouvertes", label: "Offres en cours", count: offresOuvertes.length },
          { key: "cloturees", label: "Archives", count: offresCloturees.length },
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

      <div className="mb-4">
        <InfoBanner storageKey="offres_emploi_recruteur" title="Bienvenue sur la gestion de vos offres" color="teal">
          Publiez des offres, suivez vos candidatures et analysez vos talents depuis ici.
          Votre entreprise doit être <strong>validée par l'équipe TAFTECH</strong> avant de pouvoir publier.
        </InfoBanner>
      </div>

      {/* ── BARRE DE RECHERCHE + CHIPS STATUT ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

        <div className="flex items-center gap-1.5 flex-wrap">
          {(activeTab === "ouvertes" ? [
            { key: "toutes", label: "Toutes", count: offresOuvertes.length },
            { key: "APPROUVEE", label: "Publiées", count: nbPubliees, dot: tw.dotEmerald400 },
            { key: "EN_ATTENTE", label: "En validation", count: nbEnValidation, dot: tw.dotAmber400 },
            { key: "REJETEE", label: "À corriger", count: nbACorrection, dot: tw.dotRed400 },
          ] : [
            { key: "toutes", label: "Toutes", count: offresCloturees.length },
            { key: "APPROUVEE", label: "Publiées", count: offresCloturees.filter((o) => o.statut_moderation === "APPROUVEE").length },
            { key: "REJETEE", label: "Rejetées", count: offresCloturees.filter((o) => o.statut_moderation === "REJETEE").length },
          ]).map(({ key, label, count, dot }) => (
            <button
              key={key}
              onClick={() => setFiltreStatut(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filtreStatut === key ? tw.chipTealActive : tw.chipNeutralInactive
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
              { label: "Offre", col: "titre", align: "left" },
              { label: "Wilaya", col: "wilaya", align: "left" },
              { label: "Contrat", col: "type_contrat", align: "left" },
              { label: "Expiration", col: "expiration", align: "center" },
              { label: "Total", col: "total", align: "center" },
              { label: "Nouv.", col: "nouvelles", align: "center" },
              { label: "Entret.", col: "entretiens", align: "center" },
              { label: "Ret.", col: "retenus", align: "center" },
              { label: "Top IA", col: "score", align: "center" },
              { label: "", col: null, align: "right" },
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
            const DeleteControl = () => {
              if (!canDelete) return null;
              return (
                <button
                  onClick={() => handleSupprimerOffre(offre)}
                  disabled={deletingId === offre.id}
                  className={`p-1.5 rounded-lg ${tw.iconButton} disabled:opacity-50`}
                  title="Supprimer l'offre"
                >
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
                    { val: nbNouvelles, color: tw.scoreTextSuccess },
                    { val: nbEntretiens, color: tw.textOrange500 },
                    { val: nbRetenus, color: tw.textTeal },
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
                      { val: nbNouvelles, label: "Nouv.", color: tw.scoreTextSuccess },
                      { val: nbEntretiens, label: "Entr.", color: tw.textOrange500 },
                      { val: nbRetenus, label: "Ret.", color: tw.textTeal },
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
              <button onClick={() => setShowModifierModal(false)} title="Fermer" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"><X size={16} /></button>
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
    </div>
  );
};

export default OffresListPage;
