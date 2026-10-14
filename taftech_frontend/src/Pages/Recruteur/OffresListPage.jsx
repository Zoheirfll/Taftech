import SuggestionsDiplomes from "../../Components/SuggestionsDiplomes";
import { libelleUsage } from "../../utils/suggestionStats";
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
import { grouperParFamille, aplatirGroupes } from "../../utils/familleFormation";
import { rapprocherDuReferentiel } from "../../utils/competencesReferentiel";
import { CATEGORIES_EXIGENCE, CATEGORIE_EXIGENCE_PAR_DEFAUT } from "../../utils/exigencesCategories";
import InfoBanner from "../../Components/InfoBanner";
import { MetierAutocomplete } from "../../Components/MetierAutocomplete";
import { Search, Plus, Building2, ChevronRight, MapPin, AlertTriangle, Trash2, X, Pencil } from "lucide-react";

const GRID = "minmax(0,1fr) 88px 72px 80px 52px 60px 64px 52px 60px 148px";

const NIVEAU_LABELS = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
  CONFIRME: "Confirmé / Expert",
};

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

  // Compétences structurées + couples diplôme/spécialité acceptés — même builder que
  // CreateJob.jsx, manquant jusqu'ici sur le formulaire de modification (gap comblé).
  const [competencesRequises, setCompetencesRequises] = useState([]);
  const [compSuggestions, setCompSuggestions] = useState([]);
  const [showCompSuggestions, setShowCompSuggestions] = useState(false);
  const [compType, setCompType] = useState("OBLIGATOIRE");
  const [compNiveau, setCompNiveau] = useState("");
  const [diplomesRequis, setDiplomesRequis] = useState([]);
  const [specialitesRequises, setSpecialitesRequises] = useState([]);
  const [draftDiplomeId, setDraftDiplomeId] = useState("");
  const [draftSpecialiteId, setDraftSpecialiteId] = useState("");
  const [nomenclatureFormation, setNomenclatureFormation] = useState(null);
  const [suggestionsPourMetier, setSuggestionsPourMetier] = useState({ competences: [], specialites: [], diplomes: [], avertissement: "" });

  // Entrées génériques "Autre X — préciser" masquées — ne comparent rien côté candidat dans
  // une liste d'exigences de matching (voir même décision dans CreateJob.jsx).
  const RE_AUTRE_PRECISER = /autre.*préciser/i;
  const typesDiplomesFiltres = (nomenclatureFormation?.types_diplomes || []).filter((d) => !RE_AUTRE_PRECISER.test(d.libelle));
  const specialitesFiltrees = (nomenclatureFormation?.specialites || []).filter((s) => !RE_AUTRE_PRECISER.test(s.libelle));
  // Point 8 : listes présentées par famille (supérieur / formation professionnelle / thèmes).
  const diplomesGroupes = grouperParFamille(typesDiplomesFiltres, nomenclatureFormation?.familles, (d) => ({ value: d.id, label: d.libelle }));
  const specialitesGroupes = grouperParFamille(specialitesFiltrees, nomenclatureFormation?.familles, (s) => ({ value: s.id, label: s.libelle }));

  // Exigences impératives (S12) — même builder que CreateJob.jsx, manquant jusqu'ici
  // sur le formulaire de modification (même gap que compétences/diplômes ci-dessus).
  const [exigencesImperatives, setExigencesImperatives] = useState([]);
  const [draftExigenceLabel, setDraftExigenceLabel] = useState("");
  const [draftExigenceDescription, setDraftExigenceDescription] = useState("");
  const [draftExigenceJustificatif, setDraftExigenceJustificatif] = useState(false);
  const [draftExigenceCategorie, setDraftExigenceCategorie] = useState(CATEGORIE_EXIGENCE_PAR_DEFAUT);

  const ajouterExigence = () => {
    const label = draftExigenceLabel.trim();
    if (!label) return;
    if (exigencesImperatives.some((e) => e.label.toLowerCase() === label.toLowerCase())) {
      toast.error("Cette exigence est déjà dans la liste.");
      return;
    }
    setExigencesImperatives((prev) => [...prev, {
      label, description: draftExigenceDescription.trim(), justificatif_requis: draftExigenceJustificatif,
      categorie: draftExigenceCategorie,
    }]);
    setDraftExigenceLabel("");
    setDraftExigenceDescription("");
    setDraftExigenceJustificatif(false);
    setDraftExigenceCategorie(CATEGORIE_EXIGENCE_PAR_DEFAUT);
  };

  const retirerExigence = (label) => {
    setExigencesImperatives((prev) => prev.filter((e) => e.label !== label));
  };

  useEffect(() => {
    jobsService.getNomenclatureFormation().then(setNomenclatureFormation).catch(() => {});
  }, []);

  useEffect(() => {
    if (!modifierForm.metier) {
      setSuggestionsPourMetier({ competences: [], specialites: [], diplomes: [], avertissement: "" });
      return;
    }
    jobsService.getMetierSuggestions(modifierForm.metier).then(setSuggestionsPourMetier);
  }, [modifierForm.metier]);

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
      metier: offre.metier || "",
      metier_libelle: offre.metier_libelle || "",
      type_contrat: offre.type_contrat || "",
      experience_requise: offre.experience_requise || "",
      nombre_postes: offre.nombre_postes || 1,
      description: offre.description || "",
      missions: offre.missions || "",
      profil_recherche: offre.profil_recherche || "",
      competences: offre.competences || "",
      salaire_propose: offre.salaire_propose || "",
    });
    setCompetencesRequises(
      (offre.competences_requises || []).map((c) => ({
        label: c.label, type_exigence: c.type_exigence, niveau_requis: c.niveau_requis,
        dans_referentiel: !!c.competence_ref,
      })),
    );
    setDiplomesRequis((offre.diplomes_requis_detail || []).map((d) => ({ id: d.id, libelle: d.libelle })));
    setSpecialitesRequises((offre.specialites_requises_detail || []).map((s) => ({ id: s.id, libelle: s.libelle })));
    setDraftDiplomeId("");
    setDraftSpecialiteId("");
    setExigencesImperatives(
      (offre.exigences_imperatives || []).map((e) => ({
        label: e.label, description: e.description || "", justificatif_requis: !!e.justificatif_requis,
        categorie: e.categorie || CATEGORIE_EXIGENCE_PAR_DEFAUT,
      })),
    );
    setDraftExigenceLabel("");
    setDraftExigenceDescription("");
    setDraftExigenceJustificatif(false);
    setDraftExigenceCategorie(CATEGORIE_EXIGENCE_PAR_DEFAUT);
    setShowModifierModal(true);
  };

  const handleSauvegarderModification = async () => {
    const toastId = toast.loading("Envoi en cours...");
    try {
      const payload = {
        ...modifierForm,
        competences_requises: competencesRequises,
        diplomes_requis: diplomesRequis.map((d) => d.id),
        specialites_requises: specialitesRequises.map((s) => s.id),
        exigences_imperatives: exigencesImperatives,
      };
      const response = await jobsService.modifierOffre(offreAModifier.id, payload);
      setOffres(offres.map((o) => (o.id === offreAModifier.id ? response.offre : o)));
      setShowModifierModal(false);
      setOffreAModifier(null);
      toast.success("Offre soumise pour revalidation !", { id: toastId });
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la modification."), { id: toastId });
      reportError("ECHEC_MODIFIER_OFFRE", err);
    }
  };

  const ajouterDiplomeRequis = () => {
    if (!draftDiplomeId || !nomenclatureFormation) return;
    if (diplomesRequis.some((d) => String(d.id) === String(draftDiplomeId))) return;
    const libelle = typesDiplomesFiltres.find((t) => String(t.id) === String(draftDiplomeId))?.libelle || "";
    setDiplomesRequis((prev) => [...prev, { id: draftDiplomeId, libelle }]);
    setDraftDiplomeId("");
  };
  const retirerDiplomeRequis = (id) => setDiplomesRequis((prev) => prev.filter((d) => String(d.id) !== String(id)));

  const ajouterSpecialiteRequise = () => {
    if (!draftSpecialiteId || !nomenclatureFormation) return;
    if (specialitesRequises.some((s) => String(s.id) === String(draftSpecialiteId))) return;
    const libelle = specialitesFiltrees.find((s) => String(s.id) === String(draftSpecialiteId))?.libelle || "";
    setSpecialitesRequises((prev) => [...prev, { id: draftSpecialiteId, libelle }]);
    setDraftSpecialiteId("");
  };
  const retirerSpecialiteRequise = (id) => setSpecialitesRequises((prev) => prev.filter((s) => String(s.id) !== String(id)));

  const ajouterSpecialiteSuggeree = (item) => {
    // METIER_FORMATIONS (fichier client) ne lie qu'à une spécialité, jamais à un diplôme précis
    // — pas de diplôme reconstruit par croisement DiplomeSpecialite (jamais validé par le client
    // pour ce métier).
    setSpecialitesRequises((prev) => (prev.some((s) => String(s.id) === String(item.id)) ? prev : [...prev, { id: item.id, libelle: item.libelle }]));
  };

  const handleCompInputChange = async (value) => {
    if (value.length >= 2) {
      try {
        const data = await jobsService.searchCompetences(value);
        setCompSuggestions(data);
        setShowCompSuggestions(data.length > 0);
      } catch {
        setCompSuggestions([]);
      }
    } else {
      setShowCompSuggestions(false);
    }
  };

  const ajouterCompetenceRequise = async (label) => {
    const saisie = (label || "").trim();
    if (!saisie) return;
    // Point 10 : rapprochement avec le référentiel commun au candidat (libellé ou synonyme exact).
    const canonique = await rapprocherDuReferentiel(saisie);
    const trimmed = canonique || saisie;
    if (competencesRequises.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Cette compétence est déjà ajoutée.");
      return;
    }
    setCompetencesRequises((prev) => [
      ...prev,
      { label: trimmed, type_exigence: compType, niveau_requis: compNiveau || null, dans_referentiel: !!canonique },
    ]);
    setShowCompSuggestions(false);
  };

  const retirerCompetenceRequise = (label) => {
    setCompetencesRequises((prev) => prev.filter((c) => c.label !== label));
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
    // Pas de clamp à 0 : une valeur négative signale une offre déjà expirée mais pas
    // encore archivée par le cron `archiver_offres_expirees` — l'affichage doit le montrer
    // ("Expirée") au lieu d'afficher indéfiniment "Auj." une fois la date dépassée.
    const jours = offre.date_expiration && !offre.est_cloturee
      ? Math.ceil((new Date(offre.date_expiration) - new Date()) / 86400000)
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
              : jours <= 0 ? tw.textError
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
                <span className="flex items-center justify-end gap-1 w-full">
                  {authService.peutFaire("UTILISATEUR") && (
                    <button
                      onClick={() => handleOuvrirModification(offre)}
                      className={`shrink-0 p-1.5 rounded-lg ${tw.iconButton} ${tw.focusRing}`}
                      title="Modifier l'offre"
                      aria-label="Modifier l'offre"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  <button onClick={() => navigate(`/dashboard/offres/${offre.id}`)} className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${tw.bgTealSolid}`}>
                    Candidats <ChevronRight size={11} />
                  </button>
                </span>
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
                    {jours === null
                      ? <span className={`${tw.textSubtle} text-base`}>∞</span>
                      : jours < 0
                        ? "Expirée"
                        : jours === 0
                          ? "Auj."
                          : `${jours}j`}
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
                          : <span className={`font-semibold ${expColor}`}>
                              {jours < 0 ? "Expirée" : jours === 0 ? "Expire auj." : `${jours}j`}
                            </span>}
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
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Métier</label>
                  <MetierAutocomplete
                    proposable
                    value={modifierForm.metier_libelle}
                    onSelect={(item) => setModifierForm({ ...modifierForm, metier: item.metier_id, metier_libelle: item.appellation_libelle })}
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

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-700">
                  Formation requise (optionnel)
                </p>
                <p className="text-xs text-slate-600 mb-3">
                  Le diplôme et la spécialité ci-dessous sont deux critères indépendants (jamais un couple imposé) : laisser "Spécialités acceptées" vide accepte toute spécialité pour les diplômes choisis. Cette liste alimente aussi le filtre "Diplôme" de la recherche publique d'offres.
                </p>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Diplômes acceptés</p>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                    <Select
                      options={diplomesGroupes}
                      value={aplatirGroupes(diplomesGroupes).find((o) => String(o.value) === String(draftDiplomeId)) || null}
                      onChange={(opt) => setDraftDiplomeId(opt ? opt.value : "")}
                      styles={selectStylesTeal}
                      isClearable
                      placeholder="Sélectionner un type de diplôme..."
                    />
                    <button
                      type="button"
                      onClick={ajouterDiplomeRequis}
                      disabled={!draftDiplomeId}
                      className="h-fit px-4 py-2.5 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                    >
                      Ajouter
                    </button>
                  </div>
                  {diplomesRequis.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {diplomesRequis.map((d) => (
                        <span key={d.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                          {d.libelle}
                          <button type="button" onClick={() => retirerDiplomeRequis(d.id)} className="hover:text-red-600">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <SuggestionsDiplomes
                    diplomes={suggestionsPourMetier.diplomes}
                    dejaAjoutes={diplomesRequis}
                    elargi={suggestionsPourMetier.elargi}
                    onAjouter={(d) => setDiplomesRequis((prev) => (prev.some((x) => String(x.id) === String(d.id)) ? prev : [...prev, { id: d.id, libelle: d.libelle }]))}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Spécialités acceptées (optionnel — vide = toute spécialité)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                    <Select
                      options={specialitesGroupes}
                      value={aplatirGroupes(specialitesGroupes).find((o) => String(o.value) === String(draftSpecialiteId)) || null}
                      onChange={(opt) => setDraftSpecialiteId(opt ? opt.value : "")}
                      styles={selectStylesTeal}
                      isClearable
                      placeholder="Sélectionner une spécialité..."
                    />
                    <button
                      type="button"
                      onClick={ajouterSpecialiteRequise}
                      disabled={!draftSpecialiteId}
                      className="h-fit px-4 py-2.5 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                    >
                      Ajouter
                    </button>
                  </div>
                  {specialitesRequises.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {specialitesRequises.map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                          {s.libelle}
                          <button type="button" onClick={() => retirerSpecialiteRequise(s.id)} className="hover:text-red-600">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {suggestionsPourMetier.specialites.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-slate-500 mb-1.5">Suggéré pour ce métier — cliquez pour ajouter la spécialité :</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestionsPourMetier.specialites
                        .filter((s) => !specialitesRequises.some((sp) => String(sp.id) === String(s.id)))
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => ajouterSpecialiteSuggeree(s)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 text-slate-600"
                          >
                            + {s.libelle}
                        {s.famille_libelle && <span className="text-[10px] text-slate-500">({s.famille_libelle})</span>}
                        {libelleUsage(s) && <span className="text-[10px] font-semibold text-indigo-600">{libelleUsage(s)}</span>}
                          </button>
                        ))}
                    </div>
                    {suggestionsPourMetier.avertissement && (
                      <p className="text-[11px] text-slate-500 italic mt-2">{suggestionsPourMetier.avertissement}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-700">
                  Exigences impératives (optionnel)
                </p>
                <p className="text-xs text-slate-600 mb-3">
                  Permis, habilitation, droit d'exercice, certification... — distinct du diplôme, jamais utilisé pour calculer le score de matching. Le candidat déclare s'il y répond au moment de postuler, vous vérifiez ensuite.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Exigence</label>
                    <input
                      type="text"
                      value={draftExigenceLabel}
                      onChange={(e) => setDraftExigenceLabel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Précision (optionnel)</label>
                    <input
                      type="text"
                      value={draftExigenceDescription}
                      onChange={(e) => setDraftExigenceDescription(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Catégorie</label>
                    <select
                      value={draftExigenceCategorie}
                      onChange={(e) => setDraftExigenceCategorie(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {CATEGORIES_EXIGENCE.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700 h-fit pb-2.5 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={draftExigenceJustificatif}
                      onChange={(e) => setDraftExigenceJustificatif(e.target.checked)}
                    />
                    Justificatif requis
                  </label>
                  <button
                    type="button"
                    onClick={ajouterExigence}
                    disabled={!draftExigenceLabel.trim()}
                    className="h-fit px-4 py-2.5 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                </div>
                {exigencesImperatives.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {exigencesImperatives.map((e) => (
                      <span key={e.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                        {e.label}
                        {e.categorie && e.categorie !== "AUTRE" ? ` · ${CATEGORIES_EXIGENCE.find((c) => c.value === e.categorie)?.label}` : ""}
                        {e.justificatif_requis ? " 📎" : ""}
                        <button type="button" onClick={() => retirerExigence(e.label)} className="hover:text-red-600">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Compétences requises (structurées)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {competencesRequises.map((c) => (
                    <span
                      key={c.label}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.type_exigence === "OBLIGATOIRE" ? "bg-red-50 text-red-700" : "bg-slate-200 text-slate-700"}`}
                    >
                      {c.label}
                      <span className="opacity-70 font-normal">
                        · {c.type_exigence === "OBLIGATOIRE" ? "Obligatoire" : "Souhaitée"}
                        {c.niveau_requis ? ` · ${NIVEAU_LABELS[c.niveau_requis]}` : ""}
                      </span>
                      {c.dans_referentiel === false && (
                        <span
                          className="text-[10px] font-semibold text-amber-700"
                          title="Cette compétence ne figure pas dans la liste TAFTECH : elle ne sera comparée aux candidats que sur son texte exact. Choisissez de préférence une compétence proposée."
                        >
                          hors liste
                        </span>
                      )}
                      <button type="button" onClick={() => retirerCompetenceRequise(c.label)} className="hover:opacity-70">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {competencesRequises.length === 0 && (
                    <p className="text-xs text-slate-600">Aucune compétence structurée ajoutée.</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      id="comp-modifier-input"
                      onChange={(e) => handleCompInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          e.preventDefault();
                          ajouterCompetenceRequise(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowCompSuggestions(false), 200)}
                      placeholder="Tapez une compétence puis Entrée..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                    />
                    {showCompSuggestions && compSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 rounded-xl shadow-lg z-50 mt-1 overflow-hidden bg-white border border-slate-200">
                        <div className="max-h-48 overflow-y-auto">
                          {compSuggestions.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={() => {
                                ajouterCompetenceRequise(c.label);
                                const el = document.getElementById("comp-modifier-input");
                                if (el) el.value = "";
                              }}
                              className="w-full text-left px-4 py-2.5 transition-colors text-sm font-medium hover:bg-slate-50"
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <select value={compType} onChange={(e) => setCompType(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:w-40">
                    <option value="OBLIGATOIRE">Obligatoire</option>
                    <option value="SOUHAITEE">Souhaitée</option>
                  </select>
                  <select value={compNiveau} onChange={(e) => setCompNiveau(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:w-44">
                    <option value="">Niveau (optionnel)</option>
                    {Object.entries(NIVEAU_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
                {suggestionsPourMetier.competences.filter((s) => !competencesRequises.some((c) => c.label.toLowerCase() === s.label.toLowerCase())).length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-slate-600 mb-1.5">Suggéré pour ce métier — cliquez pour ajouter :</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestionsPourMetier.competences
                        .filter((s) => !competencesRequises.some((c) => c.label.toLowerCase() === s.label.toLowerCase()))
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => ajouterCompetenceRequise(s.label)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 text-slate-600"
                          >
                            + {s.label}
                          {libelleUsage(s) && <span className="text-[10px] font-semibold text-indigo-600">{libelleUsage(s)}</span>}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {["description", "missions", "profil_recherche", "competences"].map((field) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    {field === "profil_recherche" ? "Profil recherché" : field === "competences" ? "Compétences (texte libre affiché sur l'annonce)" : field.charAt(0).toUpperCase() + field.slice(1)}
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
