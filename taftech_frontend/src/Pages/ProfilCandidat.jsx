import React, { useState, useEffect } from "react";
import { profilService } from "../Services/profilService";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import communesAlgerie from "../data/communes.json";
import { reportError } from "../utils/errorReporter";
import { selectStyles } from "../theme";
import { Camera, Plus, Pencil, Trash2, X, Sparkles } from "lucide-react";

const ProfilCandidat = () => {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState(null);
  const [titreSuggestions, setTitreSuggestions] = useState([]);
  const [showTitreSuggestions, setShowTitreSuggestions] = useState(false);
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
  });
  const [showExpForm, setShowExpForm] = useState(false);
  const [showFormForm, setShowFormForm] = useState(false);
  const [showCVForm, setShowCVForm] = useState(false);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [showPrefForm, setShowPrefForm] = useState(false);
  const [newExp, setNewExp] = useState({
    titre_poste: "",
    entreprise: "",
    date_debut: "",
    date_fin: "",
    description: "",
  });
  const [newForm, setNewForm] = useState({
    diplome: "",
    etablissement: "",
    date_debut: "",
    date_fin: "",
    description: "",
  });
  const [editingExpId, setEditingExpId] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);
  const [editInfo, setEditInfo] = useState({});
  const [editPref, setEditPref] = useState({});
  const [editCV, setEditCV] = useState({ titre: "", file: null });
  const [showParserModal, setShowParserModal] = useState(false);
  const [parserLoading, setParserLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pData, cData] = await Promise.all([
        profilService.getProfil(),
        jobsService.getConstants(),
      ]);
      setProfil(pData);
      setConstants(cData);
      setEditInfo({
        first_name: pData.first_name,
        last_name: pData.last_name,
        telephone: pData.telephone || "",
        wilaya: pData.wilaya || "",
        commune: pData.commune || "",
        diplome: pData.diplome || "",
        specialite: pData.specialite || "",
        service_militaire: pData.service_militaire || "",
        permis_conduire: pData.permis_conduire || false,
        passeport_valide: pData.passeport_valide || false,
      });
      setEditPref({
        secteur_souhaite: pData.secteur_souhaite || "",
        salaire_souhaite: pData.salaire_souhaite || "",
        mobilite: pData.mobilite || "",
        situation_actuelle: pData.situation_actuelle || "",
      });
      setEditCV({ titre: pData.titre_professionnel || "", file: null });
    } catch (err) {
      toast.error("Erreur de synchronisation avec le serveur.");
      reportError("ECHEC_FETCH_PROFIL_DATA", err);
    } finally {
      setLoading(false);
    }
  };
  const handleTitreProChange = async (value) => {
    setEditCV({ ...editCV, titre: value });
    if (value.length >= 2) {
      try {
        const data = await jobsService.getMetiers(value);
        setTitreSuggestions(data.slice(0, 20));
        setShowTitreSuggestions(true);
      } catch {
        setTitreSuggestions([]);
      }
    } else {
      setShowTitreSuggestions(false);
    }
  };
  const calculerCompletionProfil = () => {
    if (!profil) return 0;
    let points = 0;
    if (profil.telephone) points += 10;
    if (profil.photo_profil) points += 10;
    if (profil.cv_pdf) points += 10;
    if (profil.titre_professionnel) points += 10;
    if (profil.wilaya && profil.commune) points += 10;
    if (profil.diplome) points += 10;
    if (profil.specialite) points += 10;
    if (profil.experiences_detail?.length > 0) points += 10;
    if (profil.formations_detail?.length > 0) points += 10;
    if (profil.competences?.split(",").filter((t) => t).length > 0)
      points += 10;
    return points;
  };

  const getCommunesOptions = () => {
    if (!editInfo.wilaya) return [];
    const wilayaCode = editInfo.wilaya.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === wilayaCode)
      .map((c) => ({
        value: c.commune_name_ascii,
        label: c.commune_name_ascii,
      }));
  };

  const handleUpdateGeneric = async (e, dataState, setModalState) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(dataState).forEach((key) =>
        formData.append(key, dataState[key]),
      );
      await profilService.updateProfil(formData);
      toast.success("Profil mis à jour !");
      setModalState(false);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
      reportError("ECHEC_UPDATE_PROFIL_GENERIC", err);
    }
  };

  const handleUpdateCV = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("titre_professionnel", editCV.titre);
      if (editCV.file) formData.append("cv_pdf", editCV.file);
      await profilService.updateProfil(formData);
      toast.success("Dossier CV actualisé");
      setShowCVForm(false);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de l'envoi du fichier");
      reportError("ECHEC_UPDATE_CV", err);
    }
  };

  const handleParserCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedExt = [".pdf", ".docx", ".doc"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowedExt.includes(ext)) {
      toast.error("Format non supporté.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo).");
      return;
    }
    setParserLoading(true);
    const toastId = toast.loading("Analyse de votre CV en cours...");
    try {
      const result = await jobsService.parserCV(file);
      if (result.success) {
        setParsedData(result);
        toast.success("CV analysé !", { id: toastId });
      } else
        toast.error(result.error || "Impossible d'analyser ce CV.", {
          id: toastId,
        });
    } catch (err) {
      toast.error("Erreur lors de l'analyse.", { id: toastId });
      reportError("ECHEC_PARSER_CV_CLIENT", err);
    } finally {
      setParserLoading(false);
    }
  };

  const handleValiderParsing = async () => {
    if (!parsedData) return;
    const toastId = toast.loading("Remplissage de votre profil...");
    try {
      const formData = new FormData();
      if (parsedData.telephone && !profil.telephone)
        formData.append("telephone", parsedData.telephone);
      if (parsedData.titre_professionnel && !profil.titre_professionnel)
        formData.append("titre_professionnel", parsedData.titre_professionnel);
      if (parsedData.wilaya && !profil.wilaya)
        formData.append("wilaya", parsedData.wilaya);
      if (parsedData.diplome && !profil.diplome)
        formData.append("diplome", parsedData.diplome);
      if (parsedData.specialite && !profil.specialite)
        formData.append("specialite", parsedData.specialite);
      if (parsedData.service_militaire && !profil.service_militaire)
        formData.append("service_militaire", parsedData.service_militaire);
      if (parsedData.permis_conduire && !profil.permis_conduire)
        formData.append("permis_conduire", "true");
      if (parsedData.passeport_valide && !profil.passeport_valide)
        formData.append("passeport_valide", "true");
      if (parsedData.vehicule_personnel && !profil.vehicule_personnel)
        formData.append("vehicule_personnel", "true");
      if (parsedData.competences) {
        const existing = profil.competences || "";
        const merged = existing
          ? `${existing},${parsedData.competences}`
          : parsedData.competences;
        const unique = [
          ...new Set(
            merged
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean),
          ),
        ].join(",");
        formData.append("competences", unique);
      }
      if (parsedData.langues) {
        const existing = profil.langues || "";
        const langsRaw = parsedData.langues.split(",").map((l) => l.trim());
        const newLangsFormatted = langsRaw.map((l) => {
          if (l.includes(":")) return l;
          const m = l.match(/^(.+?)\s*\((.+?)\)$/);
          if (m) return `${m[1].trim()}:${m[2].trim()}`;
          return `${l}:Intermédiaire`;
        });
        const merged = existing
          ? `${existing},${newLangsFormatted.join(",")}`
          : newLangsFormatted.join(",");
        formData.append("langues", merged);
      }
      if (parsedData.photo && !profil.photo_profil) {
        const byteCharacters = atob(parsedData.photo.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++)
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        const blob = new Blob([new Uint8Array(byteNumbers)], {
          type: `image/${parsedData.photo.ext}`,
        });
        formData.append(
          "photo_profil",
          new File([blob], `photo.${parsedData.photo.ext}`, {
            type: `image/${parsedData.photo.ext}`,
          }),
        );
      }
      if ([...formData.entries()].length > 0)
        await profilService.updateProfil(formData);
      if (parsedData.experiences?.length > 0) {
        for (const exp of parsedData.experiences) {
          try {
            await profilService.addExperience({
              titre_poste: exp.titre_poste,
              entreprise: exp.entreprise,
              date_debut: convertDateRaw(exp.date_debut_raw),
              date_fin: convertDateRaw(exp.date_fin_raw),
              description: exp.description,
            });
          } catch (err) {
            reportError("ECHEC_AJOUT_EXP_PARSER", err);
          }
        }
      }
      if (parsedData.formations?.length > 0) {
        for (const form of parsedData.formations) {
          try {
            await profilService.addFormation({
              diplome: form.diplome,
              etablissement: form.etablissement,
              date_debut: convertDateRaw(form.date_debut_raw),
              date_fin: convertDateRaw(form.date_fin_raw),
              description: form.description,
            });
          } catch (err) {
            reportError("ECHEC_AJOUT_FORMATION_PARSER", err);
          }
        }
      }
      toast.success("Profil rempli avec succès !", { id: toastId });
      setShowParserModal(false);
      setParsedData(null);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors du remplissage.", { id: toastId });
      reportError("ECHEC_VALIDATION_PARSING", err);
    }
  };

  const convertDateRaw = (dateStr) => {
    if (!dateStr) return null;
    const lower = dateStr.toLowerCase().trim();
    if (
      lower.includes("présent") ||
      lower.includes("present") ||
      lower.includes("aujourd") ||
      lower.includes("en cours")
    )
      return null;
    const mois = {
      janvier: "01",
      février: "02",
      fevrier: "02",
      mars: "03",
      avril: "04",
      mai: "05",
      juin: "06",
      juillet: "07",
      août: "08",
      aout: "08",
      septembre: "09",
      octobre: "10",
      novembre: "11",
      décembre: "12",
      decembre: "12",
    };
    const matchMoisAnnee = lower.match(/([a-zà-ÿ]+)\s+(\d{4})/);
    if (matchMoisAnnee)
      return `${matchMoisAnnee[2]}-${mois[matchMoisAnnee[1]] || "01"}-01`;
    const matchAnnee = lower.match(/(\d{4})/);
    if (matchAnnee) return `${matchAnnee[1]}-01-01`;
    return null;
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo_profil", file);
    try {
      await profilService.updateProfil(formData);
      toast.success("Photo mise à jour !");
      fetchData();
    } catch (err) {
      toast.error("Erreur lors du téléchargement.");
      reportError("ECHEC_UPDATE_PHOTO", err);
    }
  };

  const handleAddExperience = async (e) => {
    e.preventDefault();
    try {
      await profilService.addExperience(newExp);
      toast.success("Expérience ajoutée");
      setShowExpForm(false);
      setNewExp({
        titre_poste: "",
        entreprise: "",
        date_debut: "",
        date_fin: "",
        description: "",
      });
      fetchData();
    } catch (err) {
      toast.error("Vérifiez les données.");
      reportError("ECHEC_AJOUT_EXP", err);
    }
  };

  const handleDeleteExp = async (id) => {
    if (window.confirm("Supprimer cette expérience ?")) {
      try {
        await profilService.deleteExperience(id);
        fetchData();
      } catch (err) {
        toast.error("Erreur de suppression");
        reportError("ECHEC_DELETE_EXP", err);
      }
    }
  };

  const handleAddFormation = async (e) => {
    e.preventDefault();
    try {
      await profilService.addFormation(newForm);
      toast.success("Formation ajoutée");
      setShowFormForm(false);
      setNewForm({
        diplome: "",
        etablissement: "",
        date_debut: "",
        date_fin: "",
        description: "",
      });
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de l'ajout");
      reportError("ECHEC_AJOUT_FORMATION", err);
    }
  };

  const handleDeleteForm = async (id) => {
    if (window.confirm("Supprimer cette formation ?")) {
      try {
        await profilService.deleteFormation(id);
        fetchData();
      } catch (err) {
        toast.error("Erreur de suppression");
        reportError("ECHEC_DELETE_FORMATION", err);
      }
    }
  };

  const handleEditExp = (exp) => {
    setNewExp({
      titre_poste: exp.titre_poste || "",
      entreprise: exp.entreprise || "",
      date_debut: exp.date_debut || "",
      date_fin: exp.date_fin || "",
      description: exp.description || "",
    });
    setEditingExpId(exp.id);
    setShowExpForm(true);
  };

  const handleUpdateExperience = async (e) => {
    e.preventDefault();
    try {
      await profilService.updateExperience(editingExpId, newExp);
      toast.success("Expérience mise à jour");
      setShowExpForm(false);
      setEditingExpId(null);
      setNewExp({
        titre_poste: "",
        entreprise: "",
        date_debut: "",
        date_fin: "",
        description: "",
      });
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
      reportError("ECHEC_UPDATE_EXP", err);
    }
  };

  const handleEditFormation = (form) => {
    setNewForm({
      diplome: form.diplome || "",
      etablissement: form.etablissement || "",
      date_debut: form.date_debut || "",
      date_fin: form.date_fin || "",
      description: form.description || "",
    });
    setEditingFormId(form.id);
    setShowFormForm(true);
  };

  const handleUpdateFormation = async (e) => {
    e.preventDefault();
    try {
      await profilService.updateFormation(editingFormId, newForm);
      toast.success("Formation mise à jour");
      setShowFormForm(false);
      setEditingFormId(null);
      setNewForm({
        diplome: "",
        etablissement: "",
        date_debut: "",
        date_fin: "",
        description: "",
      });
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
      reportError("ECHEC_UPDATE_FORMATION", err);
    }
  };

  const handleAddTag = async (type, value) => {
    const currentTags = profil[type] ? profil[type].split(",") : [];
    if (!currentTags.includes(value.trim())) {
      const newTags = [...currentTags, value.trim()].join(",");
      const formData = new FormData();
      formData.append(type, newTags);
      try {
        await profilService.updateProfil(formData);
        fetchData();
      } catch (err) {
        reportError("ECHEC_AJOUT_TAG", err);
      }
    }
  };

  const handleRemoveTag = async (type, tagToRemove) => {
    const newTags = profil[type]
      .split(",")
      .filter((tag) => tag.trim() !== tagToRemove.trim())
      .join(",");
    const formData = new FormData();
    formData.append(type, newTags);
    try {
      await profilService.updateProfil(formData);
      fetchData();
    } catch (err) {
      reportError("ECHEC_RETRAIT_TAG", err);
    }
  };

  const handleAddLanguage = async (lang, level) => {
    const currentLangStr = profil.langues || "";
    const newEntry = `${lang}:${level}`;
    const languages = currentLangStr ? currentLangStr.split(",") : [];
    const filtered = languages.filter((l) => !l.startsWith(lang));
    const newLangs = [...filtered, newEntry].join(",");
    const formData = new FormData();
    formData.append("langues", newLangs);
    try {
      await profilService.updateProfil(formData);
      fetchData();
    } catch (err) {
      reportError("ECHEC_AJOUT_LANGUE", err);
    }
  };

  const getPhotoUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `http://127.0.0.1:8000${path}`;
  };

  const formatText = (text) => {
    if (!text) return "Non spécifié";
    return text
      .replace(/_/g, " ")
      .replace(
        /\w\S*/g,
        (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(),
      );
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  const completionPercent = calculerCompletionProfil();

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const modalClass =
    "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4";
  const modalInnerClass =
    "bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]";
  const btnPrimary =
    "flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors";
  const btnCancel =
    "flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors";
  const sectionClass = "bg-white border border-slate-200 rounded-xl p-6";
  const sectionTitle = "text-base font-bold text-slate-900";
  const editBtn =
    "flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors";

  return (
    <div className="space-y-6 pb-16">
      <h1 className="text-xl font-bold text-slate-900">
        Mon profil professionnel
      </h1>

      {/* JAUGE COMPLETION */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-5 text-white">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold">Remplissage du profil</p>
          <span className="text-sm font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
            {completionPercent}%
          </span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all duration-1000"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-xs text-indigo-200 mt-2">
          {completionPercent === 100
            ? "Profil complet — vous maximisez vos chances !"
            : "Complétez vos informations pour améliorer le matching IA."}
        </p>
      </div>

      {/* CV */}
      <div className={sectionClass}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className={sectionTitle}>Mon CV</h2>
            <p className="text-sm font-semibold text-indigo-600 mt-1">
              {profil.titre_professionnel || "Titre à définir"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {profil.cv_pdf
                ? profil.cv_pdf.split("/").pop()
                : "Aucun fichier joint"}
            </p>
          </div>
          <button onClick={() => setShowCVForm(true)} className={editBtn}>
            <Pencil size={12} /> Modifier
          </button>
        </div>
        <div className="border-t border-slate-100 pt-4 mt-4">
          <button
            onClick={() => setShowParserModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
          >
            <Sparkles size={16} />
            Remplir automatiquement depuis mon CV
          </button>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Notre IA analyse votre CV (PDF ou Word) et remplit vos infos en
            quelques secondes.
          </p>
        </div>
      </div>

      {/* INFORMATIONS PERSONNELLES */}
      <div className={sectionClass}>
        <div className="flex justify-between items-start mb-5">
          <h2 className={sectionTitle}>Informations personnelles</h2>
          <button onClick={() => setShowInfoForm(true)} className={editBtn}>
            <Pencil size={12} /> Modifier
          </button>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
              {profil.photo_profil ? (
                <img
                  src={getPhotoUrl(profil.photo_profil)}
                  alt="Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors border-2 border-white">
              <Camera size={12} className="text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </label>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-slate-900">
              {profil.first_name} {profil.last_name}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {profil.wilaya || "Wilaya non renseignée"}
              {profil.commune ? ` · ${profil.commune}` : ""}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatText(profil.diplome)} · {formatText(profil.specialite)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 py-3 border-t border-slate-100 mb-4">
          {[
            {
              label: "Service militaire",
              active: profil.service_militaire === "DEGAGE",
            },
            { label: "Permis de conduire", active: profil.permis_conduire },
            { label: "Passeport valide", active: profil.passeport_valide },
          ].map(({ label, active }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
            >
              {active ? "✓" : "✕"} {label}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <span>📞 {profil.telephone || "Non renseigné"}</span>
          <span>✉️ {profil.email}</span>
        </div>
      </div>

      {/* PRÉFÉRENCES */}
      <div className={sectionClass}>
        <div className="flex justify-between items-start mb-4">
          <h2 className={sectionTitle}>Préférences de recrutement</h2>
          <button onClick={() => setShowPrefForm(true)} className={editBtn}>
            <Pencil size={12} /> Modifier
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              label: "Secteur souhaité",
              value: formatText(profil.secteur_souhaite),
            },
            {
              label: "Salaire souhaité",
              value: profil.salaire_souhaite || "À discuter",
            },
            { label: "Mobilité", value: formatText(profil.mobilite) },
            {
              label: "Situation actuelle",
              value: formatText(profil.situation_actuelle),
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-slate-50 p-3 rounded-lg border border-slate-100"
            >
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {label}
              </p>
              <p className="text-sm font-semibold text-indigo-600">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* EXPÉRIENCES */}
      <div className={sectionClass}>
        <div className="flex justify-between items-center mb-5">
          <h2 className={sectionTitle}>Expériences professionnelles</h2>
          <button
            onClick={() => {
              setEditingExpId(null);
              setNewExp({
                titre_poste: "",
                entreprise: "",
                date_debut: "",
                date_fin: "",
                description: "",
              });
              setShowExpForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
        <div className="space-y-5">
          {profil.experiences_detail?.length === 0 && (
            <p className="text-sm text-slate-400 italic">
              Aucune expérience ajoutée.
            </p>
          )}
          {profil.experiences_detail?.map((exp) => (
            <div
              key={exp.id}
              className="relative group pl-5 border-l-2 border-indigo-100"
            >
              <div className="absolute -left-2 top-1 w-3.5 h-3.5 bg-white border-2 border-indigo-500 rounded-full" />
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {exp.titre_poste}
                  </h4>
                  <p className="text-xs text-indigo-600 font-medium">
                    {exp.entreprise}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {exp.date_debut} — {exp.date_fin || "Aujourd'hui"}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditExp(exp)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteExp(exp.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {exp.description && (
                <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                  {exp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FORMATIONS */}
      <div className={sectionClass}>
        <div className="flex justify-between items-center mb-5">
          <h2 className={sectionTitle}>Formations et diplômes</h2>
          <button
            onClick={() => {
              setEditingFormId(null);
              setNewForm({
                diplome: "",
                etablissement: "",
                date_debut: "",
                date_fin: "",
                description: "",
              });
              setShowFormForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
        <div className="space-y-5">
          {profil.formations_detail?.length === 0 && (
            <p className="text-sm text-slate-400 italic">
              Aucune formation ajoutée.
            </p>
          )}
          {profil.formations_detail?.map((f) => (
            <div
              key={f.id}
              className="relative group pl-5 border-l-2 border-slate-200"
            >
              <div className="absolute -left-2 top-1 w-3.5 h-3.5 bg-white border-2 border-slate-400 rounded-full" />
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {f.diplome || "Diplôme non précisé"}
                  </h4>
                  {f.description && (
                    <p className="text-xs text-indigo-600 font-medium">
                      {f.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 font-medium">
                    {f.etablissement}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {f.date_debut} — {f.date_fin || "En cours"}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditFormation(f)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteForm(f.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPÉTENCES */}
      <div className={sectionClass}>
        <h2 className={`${sectionTitle} mb-4`}>Compétences</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {profil.competences
            ?.split(",")
            .filter((t) => t)
            .map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-sm"
              >
                {tag.trim()}
                <button
                  onClick={() => handleRemoveTag("competences", tag)}
                  className="text-slate-300 hover:text-red-400 transition-colors ml-0.5"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
        </div>
        <input
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (handleAddTag("competences", e.target.value), (e.target.value = ""))
          }
          placeholder="Tapez une compétence puis Entrée..."
          className={inputClass}
        />
      </div>

      {/* LANGUES */}
      <div className={sectionClass}>
        <h2 className={`${sectionTitle} mb-4`}>Langues</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {profil.langues
            ?.split(",")
            .filter((l) => l)
            .map((l, i) => {
              const [name, level] = l.split(":");
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg"
                >
                  <span className="text-sm font-semibold text-indigo-900">
                    {name}
                  </span>
                  <span className="text-[10px] uppercase px-2 py-0.5 bg-white text-indigo-600 rounded-md font-semibold border border-indigo-100">
                    {level}
                  </span>
                  <button
                    onClick={() => handleRemoveTag("langues", l)}
                    className="text-indigo-300 hover:text-red-400 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            id="langName"
            placeholder="Langue (ex: Anglais)"
            className={inputClass + " flex-1"}
          />
          <select id="langLevel" className={inputClass + " flex-1"}>
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Avancé</option>
            <option>Bilingue / Maternelle</option>
          </select>
          <button
            onClick={() => {
              const n = document.getElementById("langName").value;
              const v = document.getElementById("langLevel").value;
              if (n) {
                handleAddLanguage(n, v);
                document.getElementById("langName").value = "";
              }
            }}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* ===== MODALES ===== */}

      {/* MODAL INFORMATIONS PERSONNELLES */}
      {showInfoForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              Informations personnelles
            </h3>
            <form
              onSubmit={(e) =>
                handleUpdateGeneric(e, editInfo, setShowInfoForm)
              }
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Prénom
                  </label>
                  <input
                    required
                    className={inputClass}
                    value={editInfo.first_name}
                    onChange={(e) =>
                      setEditInfo({ ...editInfo, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Nom
                  </label>
                  <input
                    required
                    className={inputClass}
                    value={editInfo.last_name}
                    onChange={(e) =>
                      setEditInfo({ ...editInfo, last_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Téléphone
                </label>
                <input
                  required
                  type="tel"
                  className={inputClass}
                  value={editInfo.telephone}
                  onChange={(e) =>
                    setEditInfo({ ...editInfo, telephone: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Wilaya
                  </label>
                  <Select
                    options={constants.wilayas}
                    value={
                      constants.wilayas.find(
                        (w) => w.value === editInfo.wilaya,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        wilaya: opt ? opt.value : "",
                        commune: "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Commune
                  </label>
                  <Select
                    options={getCommunesOptions()}
                    isDisabled={
                      !editInfo.wilaya || getCommunesOptions().length === 0
                    }
                    value={
                      getCommunesOptions().find(
                        (c) => c.value === editInfo.commune,
                      ) || null
                    }
                    placeholder={
                      editInfo.wilaya ? "Sélectionnez..." : "Wilaya d'abord"
                    }
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        commune: opt ? opt.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Diplôme
                  </label>
                  <Select
                    options={constants.diplomes}
                    value={
                      constants.diplomes.find(
                        (d) => d.value === editInfo.diplome,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        diplome: opt ? opt.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Spécialité
                  </label>
                  <Select
                    options={constants.secteurs}
                    value={
                      constants.secteurs.find(
                        (s) => s.value === editInfo.specialite,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        specialite: opt ? opt.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Situation militaire
                </label>
                <select
                  className={inputClass}
                  value={editInfo.service_militaire}
                  onChange={(e) =>
                    setEditInfo({
                      ...editInfo,
                      service_militaire: e.target.value,
                    })
                  }
                >
                  <option value="">Sélectionner...</option>
                  <option value="DEGAGE">Dégagé</option>
                  <option value="SURSITAIRE">Sursitaire</option>
                  <option value="INAPTE">Inapte</option>
                  <option value="INCORPORE">Incorporé</option>
                  <option value="NON_CONCERNE">Non concerné (Femme)</option>
                </select>
              </div>
              <div className="flex gap-6 py-2">
                {[
                  { label: "Permis de conduire", field: "permis_conduire" },
                  { label: "Passeport valide", field: "passeport_valide" },
                ].map(({ label, field }) => (
                  <label
                    key={field}
                    className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-indigo-600"
                      checked={editInfo[field]}
                      onChange={(e) =>
                        setEditInfo({ ...editInfo, [field]: e.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInfoForm(false)}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRÉFÉRENCES */}
      {showPrefForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              Préférences de recrutement
            </h3>
            <form
              onSubmit={(e) =>
                handleUpdateGeneric(e, editPref, setShowPrefForm)
              }
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Secteur souhaité
                </label>
                <Select
                  options={constants.secteurs}
                  value={
                    constants.secteurs.find(
                      (s) => s.value === editPref.secteur_souhaite,
                    ) || null
                  }
                  placeholder="Sélectionnez..."
                  onChange={(opt) =>
                    setEditPref({
                      ...editPref,
                      secteur_souhaite: opt ? opt.value : "",
                    })
                  }
                  styles={selectStyles}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Salaire mensuel attendu
                </label>
                <input
                  placeholder="Ex: 80 000 DA"
                  className={inputClass}
                  value={editPref.salaire_souhaite}
                  onChange={(e) =>
                    setEditPref({
                      ...editPref,
                      salaire_souhaite: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Mobilité
                  </label>
                  <select
                    className={inputClass}
                    value={editPref.mobilite}
                    onChange={(e) =>
                      setEditPref({ ...editPref, mobilite: e.target.value })
                    }
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="LOCALE">Locale</option>
                    <option value="REGIONALE">Régionale</option>
                    <option value="NATIONALE">Nationale</option>
                    <option value="INTERNATIONALE">Internationale</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Statut actuel
                  </label>
                  <select
                    className={inputClass}
                    value={editPref.situation_actuelle}
                    onChange={(e) =>
                      setEditPref({
                        ...editPref,
                        situation_actuelle: e.target.value,
                      })
                    }
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="EN_RECHERCHE">En recherche active</option>
                    <option value="A_L_ECOUTE">À l'écoute du marché</option>
                    <option value="EN_POSTE">En poste</option>
                    <option value="ETUDIANT">Étudiant</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrefForm(false)}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CV */}
      {showCVForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              Mettre à jour mon CV
            </h3>
            <form onSubmit={handleUpdateCV} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Titre professionnel
                </label>
                <div className="relative">
                  <input
                    placeholder="Ex: Développeur Fullstack"
                    className={inputClass}
                    value={editCV.titre}
                    onChange={(e) => handleTitreProChange(e.target.value)}
                    onBlur={() =>
                      setTimeout(() => setShowTitreSuggestions(false), 200)
                    }
                  />
                  {showTitreSuggestions && titreSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 mt-1 overflow-hidden">
                      <div className="max-h-48 overflow-y-auto">
                        {titreSuggestions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onMouseDown={() => {
                              setEditCV({ ...editCV, titre: m.titre });
                              setShowTitreSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0"
                          >
                            <p className="text-sm font-medium text-slate-900">
                              {m.titre}
                            </p>
                            <p className="text-xs text-slate-400">
                              {m.secteur}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center relative cursor-pointer hover:border-indigo-400 transition-colors group">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf"
                  onChange={(e) =>
                    setEditCV({ ...editCV, file: e.target.files[0] })
                  }
                />
                <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
                  {editCV.file
                    ? editCV.file.name
                    : "Cliquez ou glissez un PDF ici"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCVForm(false)}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Téléverser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXPÉRIENCE */}
      {showExpForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              {editingExpId
                ? "Modifier l'expérience"
                : "Ajouter une expérience"}
            </h3>
            <form
              onSubmit={
                editingExpId ? handleUpdateExperience : handleAddExperience
              }
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Titre du poste *
                </label>
                <input
                  required
                  placeholder="Ex: Développeur Backend"
                  className={inputClass}
                  value={newExp.titre_poste}
                  onChange={(e) =>
                    setNewExp({ ...newExp, titre_poste: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Entreprise *
                </label>
                <input
                  required
                  placeholder="Nom de l'entreprise"
                  className={inputClass}
                  value={newExp.entreprise}
                  onChange={(e) =>
                    setNewExp({ ...newExp, entreprise: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={newExp.date_debut}
                    onChange={(e) =>
                      setNewExp({ ...newExp, date_debut: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Date de fin (optionnel)
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={newExp.date_fin}
                    onChange={(e) =>
                      setNewExp({ ...newExp, date_fin: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Missions, résultats..."
                  className={inputClass + " resize-none"}
                  value={newExp.description}
                  onChange={(e) =>
                    setNewExp({ ...newExp, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpForm(false);
                    setEditingExpId(null);
                    setNewExp({
                      titre_poste: "",
                      entreprise: "",
                      date_debut: "",
                      date_fin: "",
                      description: "",
                    });
                  }}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORMATION */}
      {showFormForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              {editingFormId
                ? "Modifier la formation"
                : "Ajouter une formation"}
            </h3>
            <form
              onSubmit={
                editingFormId ? handleUpdateFormation : handleAddFormation
              }
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Niveau de diplôme
                </label>
                <Select
                  options={constants.diplomes}
                  placeholder="Sélectionnez..."
                  value={
                    constants.diplomes.find(
                      (d) => d.label === newForm.diplome,
                    ) || null
                  }
                  onChange={(opt) =>
                    setNewForm({ ...newForm, diplome: opt ? opt.label : "" })
                  }
                  styles={selectStyles}
                  isClearable
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Spécialité / Domaine
                </label>
                <input
                  placeholder="Ex: Informatique, Génie Civil, Finance..."
                  className={inputClass}
                  value={newForm.description}
                  onChange={(e) =>
                    setNewForm({ ...newForm, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Établissement *
                </label>
                <input
                  required
                  placeholder="Université, École ou Institut"
                  className={inputClass}
                  value={newForm.etablissement}
                  onChange={(e) =>
                    setNewForm({ ...newForm, etablissement: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Début *
                  </label>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={newForm.date_debut}
                    onChange={(e) =>
                      setNewForm({ ...newForm, date_debut: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Fin (ou prévue)
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={newForm.date_fin}
                    onChange={(e) =>
                      setNewForm({ ...newForm, date_fin: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormForm(false);
                    setEditingFormId(null);
                    setNewForm({
                      diplome: "",
                      etablissement: "",
                      date_debut: "",
                      date_fin: "",
                      description: "",
                    });
                  }}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARSING CV */}
      {showParserModal && (
        <div className={modalClass}>
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-600" /> Remplissage
                  automatique
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Notre système extrait les informations de votre CV
                </p>
              </div>
              <button
                onClick={() => {
                  setShowParserModal(false);
                  setParsedData(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {!parsedData ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-violet-200 rounded-xl p-10 text-center relative cursor-pointer hover:border-violet-500 transition-colors group bg-violet-50/30">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.docx,.doc"
                    onChange={handleParserCVUpload}
                    disabled={parserLoading}
                  />
                  {parserLoading ? (
                    <div>
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto mb-3"></div>
                      <p className="text-sm font-semibold text-violet-700">
                        Analyse en cours...
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Cela peut prendre 30 à 60 secondes — ne fermez pas cette
                        fenêtre
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-violet-600 transition-colors">
                        Cliquez ou glissez votre CV ici
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PDF, Word (.docx, .doc) — Max 5 Mo
                      </p>
                    </>
                  )}
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-800 space-y-1">
                  <p className="font-semibold mb-1.5">Comment ça marche :</p>
                  <p>
                    • Le système lit votre CV et détecte vos infos
                    automatiquement
                  </p>
                  <p>
                    • Vous validez les données avant qu'elles soient
                    enregistrées
                  </p>
                  <p>• Vos données restent privées (Loi 18-07)</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-sm font-semibold text-emerald-800">
                    ✅ Analyse terminée — vérifiez les données ci-dessous
                  </p>
                  {parsedData.parsing_method?.includes(":ai") ? (
                    <span className="px-2.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-semibold rounded-full">
                      🤖 IA Cloud
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-full">
                      📐 Regex
                    </span>
                  )}
                </div>

                {parsedData.photo && (
                  <div className="flex items-center gap-4 p-4 bg-pink-50 border border-pink-100 rounded-xl">
                    <img
                      src={`data:image/${parsedData.photo.ext};base64,${parsedData.photo.data}`}
                      alt="Photo"
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-pink-900">
                        Photo détectée
                      </p>
                      <p className="text-xs text-pink-700 mt-0.5">
                        Sera ajoutée à votre profil
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Informations détectées
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Nom complet", value: parsedData.nom_complet },
                      { label: "Email", value: parsedData.email },
                      { label: "Téléphone", value: parsedData.telephone },
                      {
                        label: "Titre professionnel",
                        value: parsedData.titre_professionnel,
                      },
                      { label: "Wilaya", value: parsedData.wilaya },
                      { label: "Diplôme", value: parsedData.diplome },
                      { label: "Spécialité", value: parsedData.specialite },
                      {
                        label: "Service militaire",
                        value: parsedData.service_militaire,
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          {label}
                        </p>
                        <p className="text-sm font-medium text-slate-800">
                          {value || (
                            <span className="text-slate-300 italic text-xs">
                              Non détecté
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                    {[
                      { label: "Permis", active: parsedData.permis_conduire },
                      {
                        label: "Passeport",
                        active: parsedData.passeport_valide,
                      },
                      {
                        label: "Véhiculé",
                        active: parsedData.vehicule_personnel,
                      },
                    ].map(({ label, active }) => (
                      <span
                        key={label}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
                      >
                        {active ? "✓" : "✕"} {label}
                      </span>
                    ))}
                  </div>
                </div>

                {parsedData.experiences?.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-3">
                      Expériences ({parsedData.experiences.length})
                    </p>
                    <div className="space-y-2">
                      {parsedData.experiences.map((exp, i) => (
                        <div
                          key={i}
                          className="bg-white p-3 rounded-lg border border-indigo-100"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {exp.titre_poste}
                          </p>
                          <p className="text-xs text-indigo-600">
                            {exp.entreprise}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {exp.date_debut_raw} — {exp.date_fin_raw}
                          </p>
                          {exp.description && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedData.formations?.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                      Formations ({parsedData.formations.length})
                    </p>
                    <div className="space-y-2">
                      {parsedData.formations.map((f, i) => (
                        <div
                          key={i}
                          className="bg-white p-3 rounded-lg border border-slate-200"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {f.diplome}
                          </p>
                          <p className="text-xs text-slate-600">
                            {f.etablissement}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {f.date_debut_raw} — {f.date_fin_raw}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedData.competences && (
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-violet-900 uppercase tracking-wider mb-2">
                      Compétences
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedData.competences
                        .split(",")
                        .filter((c) => c.trim())
                        .map((c, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-white border border-violet-200 text-violet-800 text-xs font-medium rounded-md"
                          >
                            {c.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {parsedData.langues && (
                  <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-pink-900 uppercase tracking-wider mb-2">
                      Langues
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {parsedData.langues}
                    </p>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-amber-900">
                    ⚠️ Les expériences et formations seront{" "}
                    <strong>ajoutées</strong> sans remplacer les existantes.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setParsedData(null)}
                    className={btnCancel}
                  >
                    Recommencer
                  </button>
                  <button
                    onClick={handleValiderParsing}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Valider et remplir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilCandidat;
