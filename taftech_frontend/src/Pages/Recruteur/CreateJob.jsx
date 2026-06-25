import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import communesAlgerie from "../../data/communes.json";
import { reportError } from "../../utils/errorReporter";
import { selectStyles } from "../../theme";
import { Briefcase, MapPin, GraduationCap, FileText, ClipboardList, Send, Sparkles, Clock } from "lucide-react";
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
    if (!formData.wilaya || !formData.specialite) {
      toast.error("Veuillez sélectionner une Wilaya et une Spécialité.");
      return;
    }
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

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900">Publier une offre d'emploi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Remplissez les informations pour attirer les bons candidats.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6">
        <InfoBanner storageKey="creer_offre" title="Conseils pour une offre efficace" color="teal">
          Un titre précis et un profil recherché détaillé améliorent la qualité du matching IA.
          Renseignez la <strong>spécialité</strong> et le <strong>diplôme</strong> requis pour que l'algorithme propose votre offre aux candidats les plus pertinents.
          Compte Premium : utilisez le bouton <strong>✨ Générer avec l'IA</strong> pour rédiger la description automatiquement.
        </InfoBanner>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Titre du poste */}
        <Section icon={Briefcase} title="Informations du poste">
          <div className="space-y-4">
            <Field label="Titre du poste" required>
              <div className="relative">
                <input
                  required
                  name="titre"
                  value={formData.titre}
                  onChange={(e) => handleTitreChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className={inputClass + " font-semibold"}
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
            </Field>

            {/* Durée d'affichage */}
            <Field label="Durée d'affichage">
              <div className="flex flex-wrap gap-2">
                {[30, 60, 90].map((days) => {
                  const addDays = (d) => {
                    const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().split("T")[0];
                  };
                  const isSelected = (() => {
                    if (!formData.date_expiration) return false;
                    const t = new Date(); t.setDate(t.getDate() + days);
                    const diff = Math.round((new Date(formData.date_expiration) - t) / 86400000);
                    return Math.abs(diff) <= 1;
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
              </div>
              <p className="text-xs text-slate-400 mt-1.5">L'offre sera clôturée automatiquement à cette date. Laissez vide pour pas de limite.</p>
            </Field>

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

        {/* Profil idéal */}
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
            <Field label="Spécialité" required>
              <Select
                name="specialite"
                options={constants.secteurs}
                onChange={handleSelectChange}
                value={constants.secteurs.find((s) => s.value === formData.specialite) || null}
                placeholder="Sélectionner..."
                isClearable
                styles={selectStyles}
              />
            </Field>
          </div>
        </Section>

        {/* Localisation */}
        <Section icon={MapPin} title="Localisation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Wilaya" required>
              <Select
                name="wilaya"
                options={constants.wilayas}
                onChange={(opt) => setFormData({ ...formData, wilaya: opt ? opt.value : "", commune: "" })}
                value={constants.wilayas.find((w) => w.value === formData.wilaya) || null}
                placeholder="Sélectionner..."
                isClearable
                styles={selectStyles}
              />
            </Field>
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

        {/* Détails de la mission */}
        <Section icon={FileText} title="Détails de la mission">
          <div className="space-y-4">
            {/* Bouton IA */}
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  Remplissage automatique par IA
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {isPremium
                    ? "Basé sur le titre, la spécialité, le diplôme et la wilaya renseignés."
                    : "Fonctionnalité réservée aux comptes Premium ⭐"}
                </p>
              </div>
              {isPremium ? (
                <button
                  type="button"
                  onClick={handleGenererIA}
                  disabled={iaLoading || !formData.titre || !formData.specialite}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
                >
                  <Sparkles size={14} />
                  {iaLoading ? "Génération..." : "Générer"}
                </button>
              ) : (
                <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg shrink-0">Premium uniquement</span>
              )}
            </div>

            <Field label="Description générale">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className={textareaClass}
                placeholder="Présentez le contexte et les enjeux du poste..."
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

        {/* Questionnaire */}
        <Section icon={ClipboardList} title="Questionnaire (optionnel)">
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
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
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
    </div>
  );
};

export default CreateJob;
