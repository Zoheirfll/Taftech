import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import { reportError } from "../utils/errorReporter";
import { selectStyles } from "../theme";
import {
  Users,
  Inbox,
  Sparkles,
  Clock,
  Plus,
  Search,
  Building2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  MapPin,
  Briefcase,
  Calendar,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

const DashboardRecruteur = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ouvertes");
  const [filtreStatut, setFiltreStatut] = useState("toutes");
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [offreAModifier, setOffreAModifier] = useState(null);
  const [modifierForm, setModifierForm] = useState({});
  const [entreprise, setEntreprise] = useState(null);
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });

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
      } catch (err) {
        if (
          err.response &&
          (err.response.status === 404 || err.response.status === 403)
        ) {
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
      const response = await jobsService.modifierOffre(
        offreAModifier.id,
        modifierForm,
      );
      setOffres(
        offres.map((o) => (o.id === offreAModifier.id ? response.offre : o)),
      );
      setShowModifierModal(false);
      setOffreAModifier(null);
      toast.success("Offre soumise pour revalidation !", { id: toastId });
    } catch (err) {
      toast.error("Erreur lors de la modification.", { id: toastId });
      reportError("ECHEC_MODIFIER_OFFRE", err);
    }
  };

  const calculerStatistiques = () => {
    let total = 0,
      nouvelles = 0,
      pertinentes = 0,
      enTraitement = 0;
    offres.forEach((offre) => {
      if (offre.candidatures) {
        total += offre.candidatures.length;
        offre.candidatures.forEach((c) => {
          if (c.statut === "RECUE") nouvelles++;
          if (c.statut === "EN_COURS" || c.statut === "ENTRETIEN")
            enTraitement++;
          if (c.score_matching >= 80) pertinentes++;
        });
      }
    });
    return { total, nouvelles, pertinentes, enTraitement };
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  if (error)
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-50 text-red-700 rounded-xl text-center text-sm font-medium">
        {error}
      </div>
    );

  const offresOuvertes = offres.filter((o) => !o.est_cloturee);
  const offresCloturees = offres.filter((o) => o.est_cloturee);
  const stats = calculerStatistiques();

  const getOffresFiltrees = () => {
    const liste = activeTab === "ouvertes" ? offresOuvertes : offresCloturees;
    if (filtreStatut === "toutes") return liste;
    return liste.filter((o) => o.statut_moderation === filtreStatut);
  };

  const getStatutBadge = (offre) => {
    if (offre.est_cloturee)
      return { label: "Archivée", cls: "bg-slate-100 text-slate-600" };
    if (offre.statut_moderation === "EN_ATTENTE")
      return {
        label: "En validation",
        cls: "bg-amber-50 text-amber-700 border border-amber-200",
      };
    if (offre.statut_moderation === "REJETEE")
      return {
        label: "À corriger",
        cls: "bg-red-50 text-red-700 border border-red-200",
      };
    return {
      label: "Publiée",
      cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {entreprise?.logo ? (
              <img
                src={
                  entreprise.logo.startsWith("http")
                    ? entreprise.logo
                    : `http://127.0.0.1:8000${entreprise.logo}`
                }
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 size={22} className="text-slate-400" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {entreprise?.nom_entreprise}
            </h1>
            <div className="mt-1">
              {entreprise?.est_approuvee ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                  <CheckCircle size={12} /> Compte vérifié
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                  <AlertCircle size={12} /> En attente de validation
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {entreprise?.est_approuvee ? (
            <>
              <button
                onClick={() => navigate("/cvtheque")}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Search size={16} /> Chercher un CV
              </button>
              <button
                onClick={() => navigate("/creer-offre")}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={16} /> Publier une offre
              </button>
            </>
          ) : (
            <div className="text-right">
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                <Plus size={16} /> Publier une offre
              </button>
              <p className="text-xs text-amber-600 font-medium mt-1.5">
                Validation admin requise
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
              <Users size={16} className="text-slate-600" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              Total candidatures
            </p>
          </div>
          <p className="text-3xl font-bold text-slate-600 tabular-nums">
            {stats.total}
          </p>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Inbox size={16} className="text-emerald-600" />
            </div>
            <p className="text-xs font-medium text-slate-500">Nouvelles</p>
          </div>
          <p className="text-3xl font-bold text-emerald-600 tabular-nums">
            {stats.nouvelles}
          </p>
        </div>
        <div className="bg-white border border-indigo-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-indigo-600" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              Pertinentes +80%
            </p>
          </div>
          <p className="text-3xl font-bold text-indigo-600 tabular-nums">
            {stats.pertinentes}
          </p>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock size={16} className="text-amber-600" />
            </div>
            <p className="text-xs font-medium text-slate-500">En traitement</p>
          </div>
          <p className="text-3xl font-bold text-amber-600 tabular-nums">
            {stats.enTraitement}
          </p>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {[
          {
            key: "ouvertes",
            label: "Offres en cours",
            count: offresOuvertes.length,
          },
          {
            key: "cloturees",
            label: "Archives",
            count: offresCloturees.length,
          },
          { key: "profil", label: "Profil entreprise", count: null },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === key ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            {label}
            {count !== null && (
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === key ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SOUS-ONGLETS */}
      {activeTab === "ouvertes" && (
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 mb-6 pb-px">
          {[
            { key: "toutes", label: "Toutes", count: offresOuvertes.length },
            {
              key: "APPROUVEE",
              label: "Publiées",
              count: offresOuvertes.filter(
                (o) => o.statut_moderation === "APPROUVEE",
              ).length,
            },
            {
              key: "EN_ATTENTE",
              label: "En cours de validation",
              count: offresOuvertes.filter(
                (o) => o.statut_moderation === "EN_ATTENTE",
              ).length,
            },
            {
              key: "REJETEE",
              label: "À corriger",
              count: offresOuvertes.filter(
                (o) => o.statut_moderation === "REJETEE",
              ).length,
            },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFiltreStatut(key)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-t transition-colors ${filtreStatut === key ? "bg-white border border-b-white border-slate-200 text-indigo-600 font-semibold -mb-px" : "text-slate-500 hover:text-slate-900"}`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${filtreStatut === key ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* LISTE DES OFFRES */}
      {(activeTab === "ouvertes" || activeTab === "cloturees") && (
        <>
          {getOffresFiltrees().length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-16 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">
                Aucune offre dans cette catégorie
              </p>
              {activeTab === "ouvertes" && entreprise?.est_approuvee && (
                <button
                  onClick={() => navigate("/creer-offre")}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={16} /> Créer votre première offre
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {getOffresFiltrees().map((offre) => {
                const nbCandidatures = offre.candidatures?.length || 0;
                const nbNouvelles =
                  offre.candidatures?.filter((c) => c.statut === "RECUE")
                    .length || 0;
                const nbEntretiens =
                  offre.candidatures?.filter((c) => c.statut === "ENTRETIEN")
                    .length || 0;
                const nbRetenus =
                  offre.candidatures?.filter((c) => c.statut === "RETENU")
                    .length || 0;
                const meilleurScore =
                  offre.candidatures?.length > 0
                    ? Math.max(
                        ...offre.candidatures.map(
                          (c) => parseFloat(c.score_matching) || 0,
                        ),
                      )
                    : null;
                const badge = getStatutBadge(offre);

                return (
                  <div
                    key={offre.id}
                    className="bg-white border border-slate-200 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all overflow-hidden"
                  >
                    <div className="flex items-center gap-0">
                      {/* Barre colorée gauche */}
                      <div
                        className={`w-1 self-stretch flex-shrink-0 ${offre.statut_moderation === "REJETEE" ? "bg-red-500" : offre.statut_moderation === "EN_ATTENTE" ? "bg-amber-400" : offre.est_cloturee ? "bg-slate-300" : "bg-indigo-600"}`}
                      />

                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                          {/* Infos principales */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="text-sm font-bold text-slate-900 truncate">
                                {offre.titre}
                              </h2>
                              <span
                                className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin size={11} />{" "}
                                {offre.wilaya?.split(" - ")[1] || offre.wilaya}
                              </span>
                              <span className="flex items-center gap-1">
                                <Briefcase size={11} /> {offre.type_contrat}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />{" "}
                                {new Date(
                                  offre.date_publication,
                                ).toLocaleDateString("fr-FR")}
                              </span>
                              {offre.salaire_propose && (
                                <span className="text-emerald-600 font-medium">
                                  {offre.salaire_propose} DA
                                </span>
                              )}
                            </div>
                            {offre.motif_rejet && (
                              <div className="mt-2 flex items-start gap-1.5 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                                <AlertTriangle
                                  size={13}
                                  className="text-red-500 flex-shrink-0 mt-0.5"
                                />
                                <p className="text-xs text-red-600">
                                  {offre.motif_rejet}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Stats candidatures */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="text-center min-w-[40px]">
                                <p className="text-xl font-bold text-slate-700 tabular-nums">
                                  {nbCandidatures}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                  Total
                                </p>
                              </div>
                              {nbNouvelles > 0 && (
                                <div className="text-center min-w-[40px]">
                                  <p className="text-xl font-bold text-emerald-600 tabular-nums">
                                    {nbNouvelles}
                                  </p>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                    Nouvelles
                                  </p>
                                </div>
                              )}
                              {nbEntretiens > 0 && (
                                <div className="text-center min-w-[40px]">
                                  <p className="text-xl font-bold text-orange-500 tabular-nums">
                                    {nbEntretiens}
                                  </p>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                    Entretiens
                                  </p>
                                </div>
                              )}
                              {nbRetenus > 0 && (
                                <div className="text-center min-w-[40px]">
                                  <p className="text-xl font-bold text-indigo-600 tabular-nums">
                                    {nbRetenus}
                                  </p>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                    Retenus
                                  </p>
                                </div>
                              )}
                              {meilleurScore !== null && meilleurScore > 0 && (
                                <div className="text-center min-w-[48px]">
                                  <p
                                    className={`text-xl font-bold tabular-nums ${meilleurScore >= 80 ? "text-emerald-600" : meilleurScore >= 60 ? "text-amber-500" : "text-red-500"}`}
                                  >
                                    {meilleurScore}%
                                  </p>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                    Top IA
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Bouton action */}
                            <div className="ml-2">
                              {offre.statut_moderation === "REJETEE" ? (
                                <button
                                  onClick={() =>
                                    handleOuvrirModification(offre)
                                  }
                                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  Corriger <ChevronRight size={13} />
                                </button>
                              ) : offre.statut_moderation === "EN_ATTENTE" ? (
                                <button
                                  disabled
                                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 text-xs font-medium rounded-lg cursor-not-allowed"
                                >
                                  En attente
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    navigate(`/dashboard/offres/${offre.id}`)
                                  }
                                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  Candidats <ChevronRight size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ONGLET PROFIL */}
      {activeTab === "profil" && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 mb-1">
            Paramètres de l'entreprise
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Gérez votre profil, logo et préférences depuis la page Paramètres.
          </p>
          <button
            onClick={() => navigate("/parametres")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Aller aux Paramètres
          </button>
        </div>
      )}

      {/* MODAL MODIFICATION */}
      {showModifierModal && offreAModifier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Corriger l'offre
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  L'offre sera soumise à revalidation après modification.
                </p>
              </div>
              <button
                onClick={() => setShowModifierModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>
            {offreAModifier.motif_rejet && (
              <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">
                  Motif de rejet
                </p>
                <p className="text-sm text-red-600">
                  {offreAModifier.motif_rejet}
                </p>
              </div>
            )}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Titre *
                </label>
                <input
                  type="text"
                  value={modifierForm.titre}
                  onChange={(e) =>
                    setModifierForm({ ...modifierForm, titre: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Wilaya
                  </label>
                  <Select
                    options={constants.wilayas}
                    value={
                      constants.wilayas.find(
                        (w) => w.value === modifierForm.wilaya,
                      ) || null
                    }
                    onChange={(s) =>
                      setModifierForm({
                        ...modifierForm,
                        wilaya: s ? s.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Spécialité
                  </label>
                  <Select
                    options={constants.secteurs}
                    value={
                      constants.secteurs.find(
                        (s) => s.value === modifierForm.specialite,
                      ) || null
                    }
                    onChange={(s) =>
                      setModifierForm({
                        ...modifierForm,
                        specialite: s ? s.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
              </div>
              {["description", "missions", "profil_recherche"].map((field) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {field === "profil_recherche"
                      ? "Profil recherché"
                      : field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <textarea
                    rows="3"
                    value={modifierForm[field] || ""}
                    onChange={(e) =>
                      setModifierForm({
                        ...modifierForm,
                        [field]: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModifierModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSauvegarderModification}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Soumettre pour revalidation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardRecruteur;
