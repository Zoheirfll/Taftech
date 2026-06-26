import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import communesAlgerie from "../../data/communes.json";
import { reportError } from "../../utils/errorReporter";
import { selectStyles } from "../../theme";
import { Briefcase, MapPin, GraduationCap, FileText, ClipboardList, Send, Sparkles, Clock, Calendar, ArrowLeft } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { iaService } from "../../Services/iaService";
import { recruteurService } from "../../Services/recruteurService";

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6">
    <div className="flex items-center gap-2 mb-5">
      <Icon size={16} className="text-teal-700 shrink-0" />
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-colors";
const textareaClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-colors resize-none leading-relaxed";

const CreateJob = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [questionnaires, setQuestionnaires] = useState([]);
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
    diplome: "",
    specialite: "",
    experience_requise: "DEBUTANT",
    description: "",
    missions: "",
    profil_recherche: "",
    questionnaire: "",
    date_expiration: "",
  });

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
        if (dash.est_premium) setIsPremium(true);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_CONSTANTES_JOB", error);
        toast.error("Erreur lors du chargement des listes déroulantes.");
      }
    };
    fetchData();
  }, []);

  const handleTitreChange = async (value) => {
    setFormData({ ...formData, titre: value });
    if (value.length >= 2) {
      try {
        const data = await jobsService.getMetiers(value);
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

  const handleGenererIA = async () => {
    if (!formData.titre || !formData.specialite) {
      toast.error("Remplissez au moins le titre et la spécialité avant de générer.");
      return;
    }
    setIaLoading(true);
    const toastId = toast.loading("L'IA génère le contenu de votre offre...");
    try {
      const result = await iaService.genererOffreIA({
        titre: formData.titre,
        specialite: formData.specialite,
        diplome: formData.diplome,
        wilaya: formData.wilaya,
        experience_requise: formData.experience_requise,
        type_contrat: formData.type_contrat,
      });
      setFormData((prev) => ({
        ...prev,
        description: result.description || prev.description,
        missions: result.missions || prev.missions,
        profil_recherche: result.profil_recherche || prev.profil_recherche,
      }));
      toast.success("Contenu généré ! Relisez et ajustez selon vos besoins.", { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || "Service IA indisponible.", { id: toastId });
      reportError("ECHEC_GENERER_OFFRE_IA", err);
    } finally {
      setIaLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.titre) newErrors.titre = "Le titre du poste est requis.";
    if (!formData.wilaya) newErrors.wilaya = "La wilaya est requise.";
    if (!formData.specialite) newErrors.specialite = "La spécialité est requise.";
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
      const payload = { ...formData, date_expiration: formData.date_expiration || null };
      await jobsService.creerOffre(payload);
      toast.success("Offre soumise ! Elle sera visible après validation par notre équipe.", { id: toastId, duration: 5000 });
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (error) {
      reportError("ECHEC_PUBLICATION_OFFRE", error);
      toast.error("Erreur lors de la publication. Vérifiez vos informations.", { id: toastId });
      setLoading(false);
    }
  };

  const iaReady = isPremium && formData.titre && formData.specialite;
  const errClass = (key) => errors[key] ? " border-red-400 ring-2 ring-red-100 bg-red-50" : "";

  return (
    <div className="min-h-screen bg-slate-100 pb-24 sm:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors mb-2">
            <ArrowLeft size={15} /> Retour au dashboard
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Publier une offre d'emploi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Remplissez les informations pour attirer les bons candidats.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Fix 7 : InfoBanner dans le form */}
        <InfoBanner storageKey="creer_offre" title="Conseils pour une offre efficace" color="teal">
          Un titre précis et un profil recherché détaillé améliorent la qualité du matching IA.
          Renseignez la <strong>spécialité</strong> et le <strong>diplôme</strong> requis pour que l'algorithme propose votre offre aux candidats les plus pertinents.
          {isPremium && <> Utilisez le bouton <strong>✨ Générer avec l'IA</strong> pour rédiger la description automatiquement.</>}
        </InfoBanner>

        {/* Section 1 — Informations du poste */}
        <Section icon={Briefcase} title="Informations du poste">
          <div className="space-y-4">
            {/* Fix 3 : validation titre */}
            <div id="field-titre">
              <Field label="Titre du poste" required>
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
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 mt-1 overflow-hidden">
                      <div className="max-h-52 overflow-y-auto">
                        {metierSuggestions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onMouseDown={() => { setFormData({ ...formData, titre: m.titre }); setShowSuggestions(false); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors border-b border-slate-100 last:border-0"
                          >
                            <p className="text-sm font-medium text-slate-900">{m.titre}</p>
                            <p className="text-xs text-slate-500">{m.secteur}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.titre && <p className="text-xs text-red-500 mt-1">{errors.titre}</p>}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Type de contrat">
                <Select
                  name="type_contrat"
                  options={constants.contrats}
                  onChange={handleSelectChange}
                  value={constants.contrats.find((c) => c.value === formData.type_contrat) || null}
                  placeholder="Sélectionner..."
                  styles={selectStyles}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Expérience requise">
              <Select
                name="experience_requise"
                options={constants.experiences}
                onChange={handleSelectChange}
                value={constants.experiences.find((e) => e.value === formData.experience_requise) || null}
                placeholder="Sélectionner..."
                styles={selectStyles}
              />
            </Field>
            <Field label="Diplôme attendu">
              <Select
                name="diplome"
                options={constants.diplomes}
                onChange={handleSelectChange}
                value={constants.diplomes.find((d) => d.value === formData.diplome) || null}
                placeholder="Sélectionner..."
                isClearable
                styles={selectStyles}
              />
            </Field>
            {/* Fix 3 : validation spécialité */}
            <div id="field-specialite">
              <Field label="Spécialité" required>
                <Select
                  name="specialite"
                  options={constants.secteurs}
                  onChange={(opt, meta) => { handleSelectChange(opt, meta); if (errors.specialite) setErrors(p => ({ ...p, specialite: "" })); }}
                  value={constants.secteurs.find((s) => s.value === formData.specialite) || null}
                  placeholder="Sélectionner..."
                  isClearable
                  styles={{
                    ...selectStyles,
                    control: (base, state) => ({
                      ...(selectStyles.control ? selectStyles.control(base, state) : base),
                      ...(errors.specialite ? { borderColor: "#f87171", boxShadow: "0 0 0 2px #fee2e2" } : {}),
                    }),
                  }}
                />
                {errors.specialite && <p className="text-xs text-red-500 mt-1">{errors.specialite}</p>}
              </Field>
            </div>
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
                    ...selectStyles,
                    control: (base, state) => ({
                      ...(selectStyles.control ? selectStyles.control(base, state) : base),
                      ...(errors.wilaya ? { borderColor: "#f87171", boxShadow: "0 0 0 2px #fee2e2" } : {}),
                    }),
                  }}
                />
                {errors.wilaya && <p className="text-xs text-red-500 mt-1">{errors.wilaya}</p>}
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
                styles={selectStyles}
              />
            </Field>
          </div>
        </Section>

        {/* Section 4 — Détails de la mission */}
        <Section icon={FileText} title="Détails de la mission">
          <div className="space-y-4">
            {/* Fix 5 : bouton IA avec état "Prêt" */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${iaReady ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}>
              <div>
                <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: iaReady ? "#92400e" : "#475569" }}>
                  <Sparkles size={14} className={iaReady ? "text-amber-500" : "text-slate-400"} />
                  Remplissage automatique par IA
                  {iaReady && <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Prêt</span>}
                </p>
                <p className="text-xs mt-0.5" style={{ color: iaReady ? "#b45309" : "#94a3b8" }}>
                  {isPremium
                    ? (iaReady ? "Titre et spécialité renseignés — vous pouvez générer." : "Renseignez le titre et la spécialité pour activer.")
                    : "Fonctionnalité réservée aux comptes Premium ⭐"}
                </p>
              </div>
              {isPremium ? (
                <button
                  type="button"
                  onClick={handleGenererIA}
                  disabled={iaLoading || !iaReady}
                  title={!iaReady ? "Remplissez le titre et la spécialité d'abord" : ""}
                  className={`flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${iaReady ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-300"}`}
                >
                  <Sparkles size={14} />
                  {iaLoading ? "Génération..." : "Générer"}
                </button>
              ) : (
                <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg shrink-0">Premium uniquement</span>
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
          </div>
        </Section>

        {/* Section 5 — Questionnaire */}
        <Section icon={ClipboardList} title="Questionnaire (optionnel)">
          {questionnaires.length === 0 ? (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-500">Vous n'avez aucun questionnaire créé.</p>
              <Link to="/questionnaires" className="text-sm font-semibold text-teal-700 hover:text-teal-800 transition-colors shrink-0">
                Créer un questionnaire →
              </Link>
            </div>
          ) : (
            <>
              <Select
                name="questionnaire"
                options={questionnaires.map((q) => ({ value: q.id, label: `${q.titre} (${q.questions.length} questions)` }))}
                onChange={(opt) => setFormData({ ...formData, questionnaire: opt ? opt.value : "" })}
                value={questionnaires.map((q) => ({ value: q.id, label: `${q.titre} (${q.questions.length} questions)` })).find((o) => o.value === formData.questionnaire) || null}
                placeholder="Associer un questionnaire à cette offre..."
                isClearable
                styles={selectStyles}
              />
              <p className="text-xs text-slate-500 mt-2">Les candidats devront répondre avant de postuler.</p>
            </>
          )}
        </Section>

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
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${isSelected ? "bg-teal-700 text-white border-teal-700" : "bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400"}`}
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
                <button type="button" onClick={() => setFormData({ ...formData, date_expiration: "" })} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                  × Sans limite
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">L'offre sera clôturée automatiquement à cette date. Laissez vide pour pas de limite.</p>
          </Field>
        </Section>

        {/* Fix 4 : boutons desktop */}
        <div className="hidden sm:flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Send size={15} />
            {loading ? "Publication..." : "Publier l'offre"}
          </button>
        </div>
      </form>

      {/* Fix 4 : boutons sticky mobile */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-slate-200 px-4 py-3 flex gap-3 z-40">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50"
        >
          <Send size={15} />
          {loading ? "Publication..." : "Publier l'offre"}
        </button>
      </div>
    </div>
  );
};

export default CreateJob;
