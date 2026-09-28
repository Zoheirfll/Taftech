import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import communesAlgerie from "../../data/communes.json";
import { reportError } from "../../utils/errorReporter";
import { selectStylesTeal, tw } from "../../theme";
import { MetierAutocomplete } from "../../Components/MetierAutocomplete";
import { Briefcase, MapPin, GraduationCap, FileText, ClipboardList, Send, Sparkles, Clock, Calendar, ArrowLeft, X, ShieldCheck, Paperclip } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import QuotaIABadge from "../../Components/QuotaIABadge";
import { iaService } from "../../Services/iaService";
import { recruteurService } from "../../Services/recruteurService";
import { CreateQuestionnaireModal } from "../../Components/CreateQuestionnaireModal";
import { apiErrMsg } from "../../utils/apiErrMsg";

const NIVEAU_LABELS = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
  CONFIRME: "Confirmé / Expert",
};

const TYPE_QUESTION_LABELS = {
  COURT: "Texte court",
  LONG: "Texte long",
  NUMERIQUE: "Numérique",
  CHOIX_UNIQUE: "Choix unique",
  CHOIX_MULTIPLE: "Choix multiple",
};

const Section = ({ icon: Icon, title, children }) => (
  <div className={`${tw.card} p-6`}>
    <div className="flex items-center gap-2 mb-5">
      <Icon size={16} className={`${tw.textTeal} shrink-0`} />
      <h3 className={`text-sm font-bold ${tw.textStrong} uppercase tracking-wider`}>{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className={`text-sm font-semibold ${tw.textMuted} mb-1.5 block`}>
      {label} {required && <span className={tw.textErrorMuted}>*</span>}
    </label>
    {children}
  </div>
);

const inputClass = `w-full px-4 py-2.5 rounded-lg text-sm transition-colors ${tw.inputColorsMutedTeal}`;
const textareaClass = `w-full px-4 py-3 rounded-lg text-sm transition-colors resize-none leading-relaxed ${tw.inputColorsMutedTeal}`;

const CreateJob = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [quotaGenerationOffre, setQuotaGenerationOffre] = useState(null);
  const [questionnaires, setQuestionnaires] = useState([]);
  const [showCreateQuestionnaire, setShowCreateQuestionnaire] = useState(false);
  const [metierSuggestions, setMetierSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState({});

  const [constants, setConstants] = useState({ wilayas: [], secteurs: [], diplomes: [], experiences: [], contrats: [] });

  const [formData, setFormData] = useState({
    titre: "",
    type_contrat: "CDI",
    salaire_propose: "",
    wilaya: "",
    commune: "",
    metier: "",
    metier_libelle: "",
    experience_requise: "DEBUTANT",
    nombre_postes: 1,
    description: "",
    missions: "",
    profil_recherche: "",
    competences: "",
    questionnaire: "",
    date_expiration: "",
  });
  const [questionsEntretien, setQuestionsEntretien] = useState([]);
  const [modalPrefillQuestions, setModalPrefillQuestions] = useState(null);

  // Compétences structurées pour le matching — voir NIVEAU_LABELS plus bas.
  const [competencesRequises, setCompetencesRequises] = useState([]);
  const [compSuggestions, setCompSuggestions] = useState([]);
  const [showCompSuggestions, setShowCompSuggestions] = useState(false);
  const [compType, setCompType] = useState("OBLIGATOIRE");
  const [compNiveau, setCompNiveau] = useState("");

  // Diplômes et spécialités requis (référentiel v2, REGLES_MATCHING S05/S06) — DEUX listes
  // plates INDÉPENDANTES, jamais un couple imposé (F06 : pas de rang/équivalence construits).
  const [diplomesRequis, setDiplomesRequis] = useState([]);
  const [specialitesRequises, setSpecialitesRequises] = useState([]);
  const [draftDiplomeId, setDraftDiplomeId] = useState("");
  const [draftSpecialiteId, setDraftSpecialiteId] = useState("");
  const [nomenclatureFormation, setNomenclatureFormation] = useState(null);

  // Les entrées génériques "Autre X — préciser" du référentiel sont masquées ici : dans une
  // liste d'exigences utilisée pour le matching, elles ne comparent rien côté candidat (bruit
  // pur). Le champ texte libre "Diplôme attendu" reste le bon endroit pour exprimer ce type de
  // flexibilité de façon informative.
  const RE_AUTRE_PRECISER = /autre.*préciser/i;
  const typesDiplomesFiltres = (nomenclatureFormation?.types_diplomes || []).filter((d) => !RE_AUTRE_PRECISER.test(d.libelle));
  const specialitesFiltrees = (nomenclatureFormation?.specialites || []).filter((s) => !RE_AUTRE_PRECISER.test(s.libelle));

  // Suggestions compétences/spécialités du métier choisi (référentiel v2, MetierCompetence/
  // MetierFormation) — purement informatif, le recruteur ajoute ce qu'il veut, rien d'imposé.
  const [suggestionsPourMetier, setSuggestionsPourMetier] = useState({ competences: [], specialites: [], avertissement: "" });

  // Exigences impératives (S12, REGLES_MATCHING) — permis, habilitation, droit d'exercice...
  // Distinctes du diplôme, jamais notées dans le score de matching : un simple filtre
  // d'éligibilité que le candidat déclare et que le recruteur vérifie manuellement.
  const [exigencesImperatives, setExigencesImperatives] = useState([]);
  const [draftExigenceLabel, setDraftExigenceLabel] = useState("");
  const [draftExigenceDescription, setDraftExigenceDescription] = useState("");
  const [draftExigenceJustificatif, setDraftExigenceJustificatif] = useState(false);

  const ajouterExigence = () => {
    const label = draftExigenceLabel.trim();
    if (!label) return;
    if (exigencesImperatives.some((e) => e.label.toLowerCase() === label.toLowerCase())) {
      toast.error("Cette exigence est déjà dans la liste.");
      return;
    }
    setExigencesImperatives((prev) => [...prev, {
      label, description: draftExigenceDescription.trim(), justificatif_requis: draftExigenceJustificatif,
    }]);
    setDraftExigenceLabel("");
    setDraftExigenceDescription("");
    setDraftExigenceJustificatif(false);
  };

  const retirerExigence = (label) => {
    setExigencesImperatives((prev) => prev.filter((e) => e.label !== label));
  };

  useEffect(() => {
    jobsService.getNomenclatureFormation().then(setNomenclatureFormation).catch(() => {});
  }, []);

  useEffect(() => {
    if (!formData.metier) {
      setSuggestionsPourMetier({ competences: [], specialites: [], avertissement: "" });
      return;
    }
    jobsService.getMetierSuggestions(formData.metier).then(setSuggestionsPourMetier);
  }, [formData.metier]);

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
    // `item` vient de MetierSuggestionsAPIView (METIER_FORMATIONS, fichier client) — ne lie le
    // métier qu'à une spécialité, jamais à un diplôme précis. On n'ajoute donc que la
    // spécialité ; le recruteur choisit ses diplômes séparément (jamais un diplôme reconstruit
    // par nous en croisant DiplomeSpecialite, qui suggérerait un diplôme non validé par le client
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

  const ajouterCompetenceRequise = (label) => {
    const trimmed = (label || "").trim();
    if (!trimmed) return;
    if (competencesRequises.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Cette compétence est déjà ajoutée.");
      return;
    }
    setCompetencesRequises((prev) => [...prev, { label: trimmed, type_exigence: compType, niveau_requis: compNiveau || null }]);
    setShowCompSuggestions(false);
  };

  const retirerCompetenceRequise = (label) => {
    setCompetencesRequises((prev) => prev.filter((c) => c.label !== label));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, qData, dash] = await Promise.all([
          jobsService.getConstants(),
          jobsService.getQuestionnaires(),
          recruteurService.getDashboard().catch(() => ({})),
        ]);
        setConstants(data);
        setQuestionnaires(qData);
        if (dash.palier_actif) setIsPremium(true);
        jobsService.getQuotaIA("GENERATION_OFFRE").then(setQuotaGenerationOffre).catch(() => {});
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_CONSTANTES_JOB", error);
        toast.error(apiErrMsg(error, "Erreur lors du chargement des listes déroulantes."));
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const titreQuery = searchParams.get("titre");
    if (titreQuery) {
      setFormData((prev) => ({ ...prev, titre: titreQuery }));
      handleGenererIA(titreQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitreChange = async (value) => {
    setFormData({ ...formData, titre: value });
    if (value.length >= 2) {
      try {
        const data = await jobsService.searchMetiers(value);
        setMetierSuggestions(data.slice(0, 10));
        setShowSuggestions(true);
      } catch {
        setMetierSuggestions([]);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFormData({ ...formData, [actionMeta.name]: selectedOption ? selectedOption.value : "" });
  };

  const getCommunesOptions = () => {
    if (!formData.wilaya) return [];
    const code = formData.wilaya.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === code)
      .map((c) => ({ value: c.commune_name_ascii, label: c.commune_name_ascii }));
  };

  const handleGenererIA = async (titreOverride) => {
    // Garde-fou : un onClick={handleGenererIA} direct (sans wrapper fléché) passerait
    // l'événement React ici au lieu d'un titre — on ignore tout ce qui n'est pas une chaîne.
    const titrePourGeneration = (typeof titreOverride === "string" ? titreOverride : "") || formData.titre;
    if (!titrePourGeneration) {
      toast.error("Saisissez au moins le titre du poste avant de générer.");
      return;
    }
    setIaLoading(true);
    const toastId = toast.loading("L'IA génère le contenu de votre offre...");
    try {
      const result = await iaService.genererOffreIA({
        titre: titrePourGeneration,
        metier: formData.metier,
        wilaya: formData.wilaya,
        experience_requise: formData.experience_requise,
        type_contrat: formData.type_contrat,
      });
      setFormData((prev) => ({
        ...prev,
        description: result.description || prev.description,
        missions: result.missions || prev.missions,
        profil_recherche: result.profil_recherche || prev.profil_recherche,
        competences: result.competences || prev.competences,
        // Le recruteur n'a peut-être saisi que le titre — l'IA devine le métier via le
        // référentiel v2 ; on ne l'auto-sélectionne que si le champ était vide (jamais
        // écraser un choix déjà fait manuellement par le recruteur).
        metier: prev.metier || result.metier_resolu || prev.metier,
        metier_libelle: prev.metier ? prev.metier_libelle : (result.metier_resolu_libelle || prev.metier_libelle),
      }));
      setQuestionsEntretien(result.questions_entretien || []);
      if (result.competences_requises?.length > 0) {
        setCompetencesRequises((prev) => {
          const dejaPresentes = new Set(prev.map((c) => c.label.toLowerCase()));
          const nouvelles = result.competences_requises.filter((c) => !dejaPresentes.has(c.label.toLowerCase()));
          return [...prev, ...nouvelles];
        });
      }
      if (result.quota_ia) setQuotaGenerationOffre({ ...result.quota_ia, disponible: true });
      toast.success("Contenu généré ! Relisez et ajustez selon vos besoins.", { id: toastId });
    } catch (err) {
      toast.error(apiErrMsg(err, "Service IA indisponible."), { id: toastId });
      reportError("ECHEC_GENERER_OFFRE_IA", err);
      if (err.response?.data?.quota_restant_jour !== undefined || err.response?.data?.code) {
        setQuotaGenerationOffre({ ...err.response.data, disponible: false });
      }
    } finally {
      setIaLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.titre) newErrors.titre = "Le titre du poste est requis.";
    if (!formData.wilaya) newErrors.wilaya = "La wilaya est requise.";
    if (!formData.metier) newErrors.metier = "Le métier est requis.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Veuillez corriger les champs manquants.");
      const firstKey = Object.keys(newErrors)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setLoading(true);
    const toastId = toast.loading("Publication en cours...");
    try {
      const payload = {
        ...formData,
        metier: formData.metier || null,
        date_expiration: formData.date_expiration || null,
        competences_requises: competencesRequises,
        diplomes_requis: diplomesRequis.map((d) => d.id),
        specialites_requises: specialitesRequises.map((s) => s.id),
        exigences_imperatives: exigencesImperatives,
      };
      delete payload.metier_libelle;
      await jobsService.creerOffre(payload);
      toast.success("Offre soumise ! Elle sera visible après validation par notre équipe.", { id: toastId, duration: 5000 });
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (error) {
      reportError("ECHEC_PUBLICATION_OFFRE", error);
      toast.error(apiErrMsg(error, "Erreur lors de la publication. Vérifiez vos informations."), { id: toastId, duration: 6000 });
      setLoading(false);
    }
  };

  const iaReady = isPremium && !!formData.titre;
  const errClass = (key) => errors[key] ? ` ${tw.inputErrorRing}` : "";

  return (
    <div className={`min-h-screen ${tw.surfaceSubtle} pb-24 sm:pb-0`}>
      {/* Header */}
      <div className={`${tw.surface} border-b ${tw.borderBase} px-6 py-4`}>
        <div className="max-w-4xl mx-auto">
          <Link to="/dashboard" className={`inline-flex items-center gap-1.5 text-sm font-medium mb-2 transition-colors ${tw.textMutedHoverTeal}`}>
            <ArrowLeft size={15} /> Retour au dashboard
          </Link>
          <h1 className={`text-xl font-bold ${tw.textStrong}`}>Publier une offre d'emploi</h1>
          <p className={`text-sm mt-0.5 ${tw.bodyText}`}>Remplissez les informations pour attirer les bons candidats.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Fix 7 : InfoBanner dans le form */}
        <InfoBanner storageKey="creer_offre" title="Conseils pour une offre efficace" color="teal">
          Un titre précis et un profil recherché détaillé améliorent la qualité du matching IA.
          Renseignez la <strong>spécialité</strong> et le <strong>diplôme</strong> requis pour que l'algorithme propose votre offre aux candidats les plus pertinents.
          {isPremium && <> Saisissez simplement le <strong>titre du poste</strong> et cliquez sur <strong>✨ Générer l'offre avec l'IA</strong> pour rédiger automatiquement description, missions, profil recherché, compétences et questions d'entretien.</>}
        </InfoBanner>

        <div className={`${tw.bgWarningSoft} border ${tw.borderWarning} rounded-xl p-4`}>
          <p className={`text-sm ${tw.textWarning900}`}>
            ⚠️ Cette offre sera <strong>examinée par l'équipe TafTech</strong> avant d'être visible publiquement.
            Vous serez informé par email dès sa validation.
          </p>
        </div>

        {/* Section 1 — Informations du poste */}
        <Section icon={Briefcase} title="Informations du poste">
          <div className="space-y-4">
            {/* Titre + métier fusionnés : choisir une suggestion résout titre ET métier en un
                seul geste (référentiel v2). Une saisie 100% libre reste possible mais exige
                alors de rattacher manuellement un métier ci-dessous (obligatoire pour le 25%
                du score de matching, REGLES_MATCHING S06/S07). */}
            <div id="field-titre">
              <Field label="Intitulé du poste" required>
                <div className="relative">
                  <input
                    name="titre"
                    value={formData.titre}
                    onChange={(e) => { handleTitreChange(e.target.value); if (errors.titre) setErrors(p => ({ ...p, titre: "" })); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className={inputClass + " font-semibold" + errClass("titre")}
                    placeholder="Ex: Ingénieur Fullstack Django/React"
                  />
                  {showSuggestions && metierSuggestions.length > 0 && (
                    <div className={`absolute top-full left-0 right-0 ${tw.surface} border ${tw.borderBase} rounded-xl shadow-lg z-50 mt-1 overflow-hidden`}>
                      <div className="max-h-52 overflow-y-auto">
                        {metierSuggestions.map((m) => (
                          <button
                            key={m.metier_id}
                            type="button"
                            onMouseDown={() => {
                              setFormData((p) => ({ ...p, titre: m.appellation_libelle, metier: m.metier_id, metier_libelle: m.metier_libelle }));
                              setShowSuggestions(false);
                              if (errors.metier) setErrors((p) => ({ ...p, metier: "" }));
                            }}
                            className={`w-full text-left px-4 py-2.5 transition-colors border-b ${tw.borderSubtle} last:border-0 ${tw.bgTealHover}`}
                          >
                            <p className={`text-sm font-medium ${tw.textStrong}`}>{m.appellation_libelle}</p>
                            <p className={`text-xs ${tw.textMuted700}`}>{m.metier_libelle}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.titre && <p className={`text-xs mt-1 ${tw.textErrorMuted}`}>{errors.titre}</p>}

                {formData.metier ? (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tw.badgeAccent || "bg-teal-50 text-teal-700"}`}>
                      Métier de référence : {formData.metier_libelle}
                    </span>
                    <button
                      type="button"
                      className={`text-xs underline ${tw.textMuted700}`}
                      onClick={() => setFormData((p) => ({ ...p, metier: "", metier_libelle: "" }))}
                    >
                      Modifier
                    </button>
                  </div>
                ) : (
                  <div id="field-metier" className="mt-2">
                    <p className={`text-xs mb-1 ${tw.textWarning || "text-amber-700"}`}>
                      Rattachez ce poste à un métier du référentiel — obligatoire pour le matching (25% du score).
                    </p>
                    <MetierAutocomplete
                      value=""
                      onSelect={(item) => {
                        setFormData((p) => ({ ...p, metier: item.metier_id, metier_libelle: item.metier_libelle }));
                        if (errors.metier) setErrors((p) => ({ ...p, metier: "" }));
                      }}
                      placeholder="Rechercher le métier le plus proche du poste..."
                    />
                    {errors.metier && <p className={`text-xs mt-1 ${tw.textErrorMuted}`}>{errors.metier}</p>}
                  </div>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Type de contrat">
                <Select
                  name="type_contrat"
                  options={constants.contrats}
                  onChange={handleSelectChange}
                  value={constants.contrats.find((c) => c.value === formData.type_contrat) || null}
                  placeholder="Sélectionner..."
                  styles={selectStylesTeal}
                />
              </Field>
              <Field label="Nombre de postes">
                <input
                  type="number"
                  min="1"
                  name="nombre_postes"
                  value={formData.nombre_postes}
                  onChange={(e) => setFormData({ ...formData, nombre_postes: e.target.value ? parseInt(e.target.value, 10) : 1 })}
                  className={inputClass}
                />
              </Field>
              <Field label="Salaire proposé">
                <input
                  name="salaire_propose"
                  value={formData.salaire_propose}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Ex: 80 000 DA / Négociable"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* Section 2 — Profil recherché */}
        <Section icon={GraduationCap} title="Profil recherché">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Expérience requise">
              <Select
                name="experience_requise"
                options={constants.experiences}
                onChange={handleSelectChange}
                value={constants.experiences.find((e) => e.value === formData.experience_requise) || null}
                placeholder="Sélectionner..."
                styles={selectStylesTeal}
              />
            </Field>
          </div>
          <div className="mt-5 border border-slate-200 rounded-xl p-5 bg-slate-50/60">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={14} className={`${tw.textTeal} shrink-0`} />
              <p className={`text-sm font-bold ${tw.textStrong}`}>
                Formation requise <span className="font-normal text-slate-500">(optionnel)</span>
              </p>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Le diplôme et la spécialité ci-dessous sont deux critères indépendants (jamais un couple imposé) : laisser "Spécialités acceptées" vide accepte toute spécialité pour les diplômes choisis. Cette liste alimente aussi le filtre "Diplôme" de la recherche publique d'offres.
            </p>

            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Diplômes acceptés</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                <Select
                  options={typesDiplomesFiltres.map((d) => ({ value: d.id, label: d.libelle }))}
                  value={typesDiplomesFiltres.map((d) => ({ value: d.id, label: d.libelle })).find((o) => String(o.value) === String(draftDiplomeId)) || null}
                  onChange={(opt) => setDraftDiplomeId(opt ? opt.value : "")}
                  styles={selectStylesTeal}
                  placeholder="Sélectionner un type de diplôme..."
                  isClearable
                />
                <button
                  type="button"
                  onClick={ajouterDiplomeRequis}
                  disabled={!draftDiplomeId}
                  className={`${tw.buttonSecondary} h-fit px-4 py-2.5 disabled:opacity-50`}
                >
                  Ajouter
                </button>
              </div>
              {diplomesRequis.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {diplomesRequis.map((d) => (
                    <span key={d.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
                      {d.libelle}
                      <button type="button" onClick={() => retirerDiplomeRequis(d.id)} className="hover:text-red-600">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Spécialités acceptées (optionnel — vide = toute spécialité)</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                <Select
                  options={specialitesFiltrees.map((s) => ({ value: s.id, label: s.libelle }))}
                  value={specialitesFiltrees.map((s) => ({ value: s.id, label: s.libelle })).find((o) => String(o.value) === String(draftSpecialiteId)) || null}
                  onChange={(opt) => setDraftSpecialiteId(opt ? opt.value : "")}
                  styles={selectStylesTeal}
                  placeholder="Sélectionner une spécialité..."
                  isClearable
                />
                <button
                  type="button"
                  onClick={ajouterSpecialiteRequise}
                  disabled={!draftSpecialiteId}
                  className={`${tw.buttonSecondary} h-fit px-4 py-2.5 disabled:opacity-50`}
                >
                  Ajouter
                </button>
              </div>
              {specialitesRequises.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {specialitesRequises.map((s) => (
                    <span key={s.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
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
                <p className="text-[11px] font-medium text-slate-500 mb-1.5">
                  Suggéré pour ce métier — cliquez pour ajouter la spécialité :
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestionsPourMetier.specialites
                    .filter((s) => !specialitesRequises.some((sp) => String(sp.id) === String(s.id)))
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => ajouterSpecialiteSuggeree(s)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed ${tw.borderBase} hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600`}
                      >
                        + {s.libelle}
                      </button>
                    ))}
                </div>
                {suggestionsPourMetier.avertissement && (
                  <p className="text-[11px] text-slate-500 italic mt-2">{suggestionsPourMetier.avertissement}</p>
                )}
              </div>
            )}
          </div>
          <div className="mt-5 border border-slate-200 rounded-xl p-5 bg-slate-50/60">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className={`${tw.textTeal} shrink-0`} />
              <p className={`text-sm font-bold ${tw.textStrong}`}>
                Exigences impératives <span className="font-normal text-slate-500">(optionnel)</span>
              </p>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Permis, habilitation, droit d'exercice, certification... — distinct du diplôme, jamais utilisé pour calculer le score de matching. Le candidat déclare s'il y répond au moment de postuler, vous vérifiez ensuite.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={tw.formLabel}>Exigence</label>
                <input
                  type="text"
                  value={draftExigenceLabel}
                  onChange={(e) => setDraftExigenceLabel(e.target.value)}
                  placeholder="Ex: Permis B"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={tw.formLabel}>Précision (optionnel)</label>
                <input
                  type="text"
                  value={draftExigenceDescription}
                  onChange={(e) => setDraftExigenceDescription(e.target.value)}
                  placeholder="Ex: Bulletin n°3 du casier judiciaire"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={draftExigenceJustificatif}
                  onChange={(e) => setDraftExigenceJustificatif(e.target.checked)}
                  className={`${tw.accentPrimary} w-3.5 h-3.5`}
                />
                <Paperclip size={12} className="text-slate-400" />
                Justificatif requis
              </label>
              <button
                type="button"
                onClick={ajouterExigence}
                disabled={!draftExigenceLabel.trim()}
                className={`${tw.buttonSecondary} px-4 py-2.5 disabled:opacity-50`}
              >
                Ajouter
              </button>
            </div>
            {exigencesImperatives.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {exigencesImperatives.map((e) => (
                  <span key={e.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
                    {e.label}
                    {e.justificatif_requis && <Paperclip size={11} className="opacity-70" />}
                    <button type="button" onClick={() => retirerExigence(e.label)} className="hover:text-red-600">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Section 3 — Localisation */}
        <Section icon={MapPin} title="Localisation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fix 3 : validation wilaya */}
            <div id="field-wilaya">
              <Field label="Wilaya" required>
                <Select
                  name="wilaya"
                  options={constants.wilayas}
                  onChange={(opt) => { setFormData({ ...formData, wilaya: opt ? opt.value : "", commune: "" }); if (errors.wilaya) setErrors(p => ({ ...p, wilaya: "" })); }}
                  value={constants.wilayas.find((w) => w.value === formData.wilaya) || null}
                  placeholder="Sélectionner..."
                  isClearable
                  styles={{
                    ...selectStylesTeal,
                    control: (base, state) => ({
                      ...(selectStylesTeal.control ? selectStylesTeal.control(base, state) : base),
                      ...(errors.wilaya ? { borderColor: "#f87171", boxShadow: "0 0 0 2px #fee2e2" } : {}),
                    }),
                  }}
                />
                {errors.wilaya && <p className={`text-xs mt-1 ${tw.textErrorMuted}`}>{errors.wilaya}</p>}
              </Field>
            </div>
            <Field label="Commune (optionnel)">
              <Select
                name="commune"
                options={getCommunesOptions()}
                isDisabled={!formData.wilaya || getCommunesOptions().length === 0}
                value={getCommunesOptions().find((c) => c.value === formData.commune) || null}
                onChange={handleSelectChange}
                placeholder={formData.wilaya ? "Sélectionner..." : "Wilaya d'abord"}
                isClearable
                styles={selectStylesTeal}
              />
            </Field>
          </div>
        </Section>

        {/* Section 4 — Détails de la mission */}
        <Section icon={FileText} title="Détails de la mission">
          <div className="space-y-4">
            {/* Fix 5 : bouton IA avec état "Prêt" */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border ${iaReady ? tw.amberReadyBanner : `${tw.surfaceMuted} ${tw.borderBase}`}`}>
              <div>
                <p className={`text-sm font-semibold flex items-center flex-wrap gap-1.5 ${iaReady ? tw.textWarning800 : tw.textMuted}`}>
                  <Sparkles size={14} className={iaReady ? tw.textAmber500 : tw.textMuted} />
                  Générer l'offre avec l'IA
                  {iaReady && <span className={`px-2 py-0.5 ${tw.badgeSuccessSolid100} text-[10px] font-bold rounded-full`}>Prêt</span>}
                </p>
                <p className={`text-xs mt-0.5 ${iaReady ? tw.textWarning : tw.textLight}`}>
                  {isPremium
                    ? (iaReady ? "Description, missions, profil, compétences et questions d'entretien." : "Saisissez le titre du poste pour activer.")
                    : "Fonctionnalité réservée aux comptes Premium ⭐"}
                </p>
                {isPremium && <QuotaIABadge quota={quotaGenerationOffre} className="mt-1" />}
              </div>
              {isPremium ? (
                <button
                  type="button"
                  onClick={() => handleGenererIA()}
                  disabled={iaLoading || !iaReady || quotaGenerationOffre?.disponible === false}
                  title={!iaReady ? "Saisissez le titre du poste d'abord" : ""}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 w-full sm:w-auto text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${iaReady ? tw.bgAmberSolidHover : tw.bgSlate300}`}
                >
                  <Sparkles size={14} />
                  {iaLoading ? "Génération..." : "Générer l'offre avec l'IA"}
                </button>
              ) : (
                <span className={`text-xs font-semibold ${tw.badgeAmberSolid100} px-3 py-1.5 rounded-lg shrink-0 self-start`}>Premium uniquement</span>
              )}
            </div>

            {/* Fix 6 : description rows=5 */}
            <Field label="Description générale">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className={textareaClass}
                placeholder="Présentez le contexte, l'entreprise et les enjeux du poste..."
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Missions & Tâches">
                <textarea
                  name="missions"
                  value={formData.missions}
                  onChange={handleChange}
                  rows={6}
                  className={textareaClass}
                  placeholder="- Développer les fonctionnalités&#10;- Participer aux réunions techniques&#10;- ..."
                />
              </Field>
              <Field label="Profil recherché">
                <textarea
                  name="profil_recherche"
                  value={formData.profil_recherche}
                  onChange={handleChange}
                  rows={6}
                  className={textareaClass}
                  placeholder="- Maîtrise de Python/Django&#10;- 2 ans d'expérience minimum&#10;- ..."
                />
              </Field>
            </div>
            <div>
              <label className={`text-sm font-semibold ${tw.textMuted} mb-1.5 block`}>
                Compétences requises
              </label>
              <p className={`text-xs mb-2 ${tw.textMuted700}`}>
                Ajoutez vos compétences ci-dessous : le texte affiché sur l'annonce est généré automatiquement à partir de cette liste, pour qu'il corresponde toujours exactement à ce que l'IA utilise pour le matching.
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {competencesRequises.map((c) => (
                  <span
                    key={c.label}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.type_exigence === "OBLIGATOIRE" ? tw.badgeError : tw.badgeNeutral}`}
                  >
                    {c.label}
                    <span className="opacity-70 font-normal">
                      · {c.type_exigence === "OBLIGATOIRE" ? "Obligatoire" : "Souhaitée"}
                      {c.niveau_requis ? ` · ${NIVEAU_LABELS[c.niveau_requis]}` : ""}
                    </span>
                    <button type="button" onClick={() => retirerCompetenceRequise(c.label)} className="hover:opacity-70">
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {competencesRequises.length === 0 && (
                  <p className={`text-xs ${tw.textMuted700}`}>Aucune compétence structurée ajoutée.</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    id="comp-offre-input"
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
                    className={inputClass}
                  />
                  {showCompSuggestions && compSuggestions.length > 0 && (
                    <div className={`absolute top-full left-0 right-0 rounded-xl shadow-lg z-50 mt-1 overflow-hidden ${tw.autocompleteDropdown}`}>
                      <div className="max-h-48 overflow-y-auto">
                        {compSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => {
                              ajouterCompetenceRequise(c.label);
                              const el = document.getElementById("comp-offre-input");
                              if (el) el.value = "";
                            }}
                            className={`w-full text-left px-4 py-2.5 transition-colors text-sm font-medium ${tw.autocompleteItem} ${tw.autocompleteItemTitle}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <select value={compType} onChange={(e) => setCompType(e.target.value)} className={`${inputClass} sm:w-40`}>
                  <option value="OBLIGATOIRE">Obligatoire</option>
                  <option value="SOUHAITEE">Souhaitée</option>
                </select>
                <select value={compNiveau} onChange={(e) => setCompNiveau(e.target.value)} className={`${inputClass} sm:w-44`}>
                  <option value="">Niveau (optionnel)</option>
                  {Object.entries(NIVEAU_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
              {suggestionsPourMetier.competences.filter((s) => !competencesRequises.some((c) => c.label.toLowerCase() === s.label.toLowerCase())).length > 0 && (
                <div className="mt-3">
                  <p className={`text-[11px] font-medium ${tw.textMuted700} mb-1.5`}>
                    Suggéré pour ce métier — cliquez pour ajouter :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestionsPourMetier.competences
                      .filter((s) => !competencesRequises.some((c) => c.label.toLowerCase() === s.label.toLowerCase()))
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => ajouterCompetenceRequise(s.label)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed ${tw.borderBase} hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600`}
                        >
                          + {s.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {competencesRequises.length > 0 && (
                <div className={`mt-3 p-3 rounded-lg text-xs whitespace-pre-line ${tw.surfaceMuted} ${tw.textMuted700}`}>
                  <p className={`font-semibold mb-1 ${tw.textMuted}`}>Aperçu du texte affiché sur l'annonce :</p>
                  {competencesRequises
                    .map((c) => `- ${c.label}${c.niveau_requis ? ` (niveau ${NIVEAU_LABELS[c.niveau_requis]} minimum)` : ""} — ${c.type_exigence === "OBLIGATOIRE" ? "Obligatoire" : "Souhaitée"}`)
                    .join("\n")}
                </div>
              )}
            </div>

            {questionsEntretien.length > 0 && (
              <div className={`p-4 rounded-lg border ${tw.borderTeal200} ${tw.bgTealSoft}`}>
                <p className={`text-sm font-semibold flex items-center gap-1.5 ${tw.textTeal}`}>
                  <Sparkles size={14} /> Questions d'entretien suggérées par l'IA
                </p>
                <ul className="mt-2 space-y-2">
                  {questionsEntretien.map((q, i) => (
                    <li key={i} className="text-sm">
                      <div className={`${tw.textMuted700} flex items-start gap-2`}>
                        <span className={`${tw.textTeal} font-bold shrink-0`}>{i + 1}.</span>
                        <span>
                          {q.texte}
                          <span className={`ml-1.5 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${tw.tagSlateSoft700}`}>
                            {TYPE_QUESTION_LABELS[q.type_question] || q.type_question}
                          </span>
                        </span>
                      </div>
                      {q.choix?.length > 0 && (
                        <ul className="mt-1 ml-5 space-y-0.5">
                          {q.choix.map((c, ci) => (
                            <li key={ci} className={`text-xs ${tw.textMuted} flex items-center gap-1.5`}>
                              <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" /> {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { setModalPrefillQuestions(questionsEntretien); setShowCreateQuestionnaire(true); }}
                  className={`mt-3 text-sm font-semibold transition-colors ${tw.linkTeal}`}
                >
                  Créer un questionnaire avec ces questions →
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Section 5 — Questionnaire */}
        <Section icon={ClipboardList} title="Questionnaire (optionnel)">
          {questionnaires.length === 0 ? (
            <div className={`flex items-center justify-between p-3 rounded-lg ${tw.surfaceMuted} border ${tw.borderBase}`}>
              <p className={tw.bodyText}>Vous n'avez aucun questionnaire créé.</p>
              <button
                type="button"
                onClick={() => { setModalPrefillQuestions(null); setShowCreateQuestionnaire(true); }}
                className={`text-sm font-semibold transition-colors shrink-0 ${tw.linkTeal}`}
              >
                Créer un questionnaire →
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    name="questionnaire"
                    options={questionnaires.map((q) => ({ value: q.id, label: `${q.titre} (${q.questions.length} questions)` }))}
                    onChange={(opt) => setFormData({ ...formData, questionnaire: opt ? opt.value : "" })}
                    value={questionnaires.map((q) => ({ value: q.id, label: `${q.titre} (${q.questions.length} questions)` })).find((o) => o.value === formData.questionnaire) || null}
                    placeholder="Associer un questionnaire à cette offre..."
                    isClearable
                    styles={selectStylesTeal}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setModalPrefillQuestions(null); setShowCreateQuestionnaire(true); }}
                  className={`text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${tw.linkTeal}`}
                >
                  + Nouveau
                </button>
              </div>
              <p className={`text-xs mt-2 ${tw.textMuted700}`}>Les candidats devront répondre avant de postuler.</p>
            </>
          )}
        </Section>

        <CreateQuestionnaireModal
          open={showCreateQuestionnaire}
          onClose={() => setShowCreateQuestionnaire(false)}
          onCreated={(created) => {
            setQuestionnaires((prev) => [...prev, created]);
            setFormData((prev) => ({ ...prev, questionnaire: created.id }));
          }}
          initialQuestions={modalPrefillQuestions}
          initialTitre={modalPrefillQuestions ? `Entretien — ${formData.titre}` : ""}
        />

        {/* Fix 1 — Durée d'affichage en section Paramètres de publication */}
        <Section icon={Calendar} title="Paramètres de publication">
          <Field label="Durée d'affichage de l'offre">
            <div className="flex flex-wrap gap-2">
              {[30, 60, 90].map((days) => {
                const addDays = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().split("T")[0]; };
                const isSelected = (() => {
                  if (!formData.date_expiration) return false;
                  const t = new Date(); t.setDate(t.getDate() + days);
                  return Math.abs(Math.round((new Date(formData.date_expiration) - t) / 86400000)) <= 1;
                })();
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setFormData({ ...formData, date_expiration: addDays(days) })}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${isSelected ? tw.chipTealActive : tw.chipTealInactive}`}
                  >
                    <Clock size={13} className="inline mr-1 mb-0.5" />{days} jours
                  </button>
                );
              })}
              <input
                type="date"
                value={formData.date_expiration}
                onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
                className={inputClass + " w-auto"}
                min={new Date().toISOString().split("T")[0]}
              />
              {formData.date_expiration && (
                <button type="button" onClick={() => setFormData({ ...formData, date_expiration: "" })} className={`text-xs transition-colors ${tw.textMutedHoverDanger}`}>
                  × Sans limite
                </button>
              )}
            </div>
            <p className={`text-xs mt-1.5 ${tw.textMuted}`}>L'offre sera clôturée automatiquement à cette date. Laissez vide pour pas de limite.</p>
          </Field>
        </Section>

        {/* Fix 4 : boutons desktop */}
        <div className="hidden sm:flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tw.buttonNeutralSoft}`}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm ${tw.bgTealSolid}`}
          >
            <Send size={15} />
            {loading ? "Publication..." : "Publier l'offre"}
          </button>
        </div>
      </form>

      {/* Fix 4 : boutons sticky mobile */}
      <div className={`fixed bottom-0 left-0 right-0 sm:hidden ${tw.surface} border-t ${tw.borderBase} px-4 py-3 flex gap-3 z-40`}>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tw.buttonNeutralSoft}`}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${tw.bgTealSolid}`}
        >
          <Send size={15} />
          {loading ? "Publication..." : "Publier l'offre"}
        </button>
      </div>
    </div>
  );
};

export default CreateJob;
