import { useState, useEffect, useMemo } from "react";
import { profilService } from "../../../Services/profilService";
import { jobsService } from "../../../Services/jobsService";
import { reportError } from "../../../utils/errorReporter";
import { mediaUrl } from "../../../utils/mediaUrl";
import toast from "react-hot-toast";
import communesAlgerie from "../../../data/communes.json";

const INITIAL_EXP = {
  titre_poste: "",
  entreprise: "",
  secteur: "",
  date_debut: "",
  date_fin: "",
  description: "",
};

const INITIAL_FORM = {
  diplome: "",
  etablissement: "",
  date_debut: "",
  date_fin: "",
  description: "",
};

const formatText = (text) => {
  if (!text) return "Non spécifié";
  return text
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
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
    janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", août: "08", aout: "08",
    septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
  };
  const matchMoisAnnee = lower.match(/([a-zà-ÿ]+)\s+(\d{4})/);
  if (matchMoisAnnee)
    return `${matchMoisAnnee[2]}-${mois[matchMoisAnnee[1]] || "01"}-01`;
  const matchAnnee = lower.match(/(\d{4})/);
  if (matchAnnee) return `${matchAnnee[1]}-01-01`;
  return null;
};

const normalizeExp = (exp) => ({
  ...exp,
  secteur: exp.secteur || null,
  date_fin: exp.date_fin || null,
});

export const useProfilCandidat = () => {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState(null);
  const [titreSuggestions, setTitreSuggestions] = useState([]);
  const [showTitreSuggestions, setShowTitreSuggestions] = useState(false);
  const [expTitreSuggestions, setExpTitreSuggestions] = useState([]);
  const [showExpTitreSuggestions, setShowExpTitreSuggestions] = useState(false);
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
  });

  // Modals visibility
  const [showExpForm, setShowExpForm] = useState(false);
  const [showFormForm, setShowFormForm] = useState(false);
  const [showCVForm, setShowCVForm] = useState(false);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [showPrefForm, setShowPrefForm] = useState(false);
  const [showLinksForm, setShowLinksForm] = useState(false);
  const [showParserModal, setShowParserModal] = useState(false);

  // Forms state
  const [newExp, setNewExp] = useState(INITIAL_EXP);
  const [newForm, setNewForm] = useState(INITIAL_FORM);
  const [editingExpId, setEditingExpId] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);
  const [editInfo, setEditInfo] = useState({});
  const [editPref, setEditPref] = useState({});
  const [editCV, setEditCV] = useState({ titre: "", file: null });
  const [editLinks, setEditLinks] = useState({
    bio: "",
    linkedin: "",
    github: "",
  });

  // Parser state
  const [parserLoading, setParserLoading] = useState(false);
  const [remplissageLoading, setRemplissageLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [parserMode, setParserMode] = useState("remplacer");

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
        nin: pData.nin || "",
        wilaya: pData.wilaya || "",
        commune: pData.commune || "",
        adresse: pData.adresse || "",
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
      setEditLinks({
        bio: pData.bio || "",
        linkedin: pData.linkedin || "",
        github: pData.github || "",
      });
    } catch (err) {
      toast.error("Erreur de synchronisation avec le serveur.");
      reportError("ECHEC_FETCH_PROFIL_DATA", err);
    } finally {
      setLoading(false);
    }
  };

  const completionPercent = useMemo(() => {
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
    if (profil.competences?.split(",").filter((t) => t).length > 0) points += 10;
    return points;
  }, [profil]);

  const handleExpTitreChange = async (value) => {
    setNewExp((prev) => ({ ...prev, titre_poste: value }));
    if (value.length >= 2) {
      try {
        const data = await jobsService.getMetiers(value);
        setExpTitreSuggestions(data.slice(0, 20));
        setShowExpTitreSuggestions(true);
      } catch {
        setExpTitreSuggestions([]);
      }
    } else {
      setShowExpTitreSuggestions(false);
    }
  };

  const handleTitreProChange = async (value) => {
    setEditCV(prev => ({ ...prev, titre: value }));
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

  const handleUpdateGeneric = async (e, dataState, setModalState) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(dataState)
        .filter((key) => key !== "nin")
        .forEach((key) => formData.append(key, dataState[key]));
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
      await profilService.addExperience(normalizeExp(newExp));
      toast.success("Expérience ajoutée");
      setShowExpForm(false);
      setNewExp(INITIAL_EXP);
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

  const handleEditExp = (exp) => {
    setNewExp({
      titre_poste: exp.titre_poste || "",
      entreprise: exp.entreprise || "",
      secteur: exp.secteur || "",
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
      await profilService.updateExperience(editingExpId, normalizeExp(newExp));
      toast.success("Expérience mise à jour");
      setShowExpForm(false);
      setEditingExpId(null);
      setNewExp(INITIAL_EXP);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
      reportError("ECHEC_UPDATE_EXP", err);
    }
  };

  const handleAddFormation = async (e) => {
    e.preventDefault();
    try {
      await profilService.addFormation(newForm);
      toast.success("Formation ajoutée");
      setShowFormForm(false);
      setNewForm(INITIAL_FORM);
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
      setNewForm(INITIAL_FORM);
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

  const handleUpdateLinks = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(editLinks).forEach(([k, v]) => formData.append(k, v));
    try {
      await profilService.updateProfil(formData);
      toast.success("Informations mises à jour !");
      setShowLinksForm(false);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde.");
      reportError("ECHEC_UPDATE_LINKS", err);
    }
  };

  const handleParserCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (![".pdf", ".docx", ".doc"].includes(ext)) {
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
      } else {
        toast.error(result.error || "Impossible d'analyser ce CV.", {
          id: toastId,
        });
      }
    } catch (err) {
      toast.error("Erreur lors de l'analyse.", { id: toastId });
      reportError("ECHEC_PARSER_CV_CLIENT", err);
    } finally {
      setParserLoading(false);
    }
  };

  const handleValiderParsing = async () => {
    if (!parsedData || remplissageLoading) return;
    setRemplissageLoading(true);
    const toastId = toast.loading("Remplissage de votre profil...");
    try {
      const remplacer = parserMode === "remplacer";
      const formData = new FormData();

      // Remplacer : écrase toujours (vide si non détecté). Ajouter : ne remplit que si vide.
      const setField = (key, value, profilKey = key) => {
        if (remplacer) formData.append(key, value || "");
        else if (value && !profil[profilKey]) formData.append(key, value);
      };
      const setBoolField = (key, value, profilKey = key) => {
        if (remplacer) formData.append(key, value ? "true" : "false");
        else if (value && !profil[profilKey]) formData.append(key, "true");
      };

      if (parsedData.nom_complet) {
        const parts = parsedData.nom_complet.trim().split(/\s+/).filter(Boolean);
        let prenom = "";
        let nom = "";
        if (parts.length >= 2) {
          if (parts[0] === parts[0].toUpperCase()) {
            nom = parts[0];
            prenom = parts.slice(1).join(" ");
          } else {
            prenom = parts[0];
            nom = parts.slice(1).join(" ");
          }
        } else {
          prenom = parts[0] || "";
        }
        if (remplacer || !profil.first_name) formData.append("first_name", prenom);
        if (remplacer || !profil.last_name) formData.append("last_name", nom);
      }

      setField("telephone", parsedData.telephone);
      setField("titre_professionnel", parsedData.titre_professionnel);
      setField("wilaya", parsedData.wilaya);
      setField("diplome", parsedData.diplome);
      setField("specialite", parsedData.specialite);
      setField("service_militaire", parsedData.service_militaire);
      setField("bio", parsedData.bio);
      setField("linkedin", parsedData.linkedin);
      setField("github", parsedData.github);
      setBoolField("permis_conduire", parsedData.permis_conduire);
      setBoolField("passeport_valide", parsedData.passeport_valide);
      setBoolField("vehicule_personnel", parsedData.vehicule_personnel);
      if (parsedData.competences || remplacer) {
        const existing = remplacer ? "" : profil.competences || "";
        const merged = existing
          ? `${existing},${parsedData.competences || ""}`
          : parsedData.competences || "";
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
      if (parsedData.langues || remplacer) {
        const existing = remplacer ? "" : profil.langues || "";
        const langsRaw = (parsedData.langues || "")
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean);
        const newLangsFormatted = langsRaw.map((l) => {
          if (l.includes(":")) return l;
          const m = l.match(/^(.+?)\s*\((.+?)\)$/);
          if (m) return `${m[1].trim()}:${m[2].trim()}`;
          return `${l}:Intermédiaire`;
        });
        formData.append(
          "langues",
          existing
            ? `${existing},${newLangsFormatted.join(",")}`
            : newLangsFormatted.join(","),
        );
      }
      if (parsedData.photo && (remplacer || !profil.photo_profil)) {
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
      } else if (!parsedData.photo && remplacer && profil.photo_profil) {
        formData.append("remove_photo_profil", "true");
      }
      if ([...formData.entries()].length > 0)
        await profilService.updateProfil(formData);
      if (parsedData.experiences?.length > 0 || remplacer) {
        if (remplacer) {
          await Promise.allSettled(
            (profil.experiences_detail || []).map((exp) =>
              profilService
                .deleteExperience(exp.id)
                .catch((err) => reportError("ECHEC_SUPPR_EXP_PARSER", err)),
            ),
          );
        }
        await Promise.allSettled(
          (parsedData.experiences || []).map((exp) =>
            profilService
              .addExperience({
                titre_poste: exp.titre_poste,
                entreprise: exp.entreprise,
                date_debut: convertDateRaw(exp.date_debut_raw),
                date_fin: convertDateRaw(exp.date_fin_raw),
                description: exp.description,
              })
              .catch((err) => reportError("ECHEC_AJOUT_EXP_PARSER", err)),
          ),
        );
      }
      if (parsedData.formations?.length > 0 || remplacer) {
        if (remplacer) {
          await Promise.allSettled(
            (profil.formations_detail || []).map((form) =>
              profilService
                .deleteFormation(form.id)
                .catch((err) => reportError("ECHEC_SUPPR_FORMATION_PARSER", err)),
            ),
          );
        }
        await Promise.allSettled(
          (parsedData.formations || []).map((form) =>
            profilService
              .addFormation({
                diplome: form.diplome,
                etablissement: form.etablissement,
                date_debut: convertDateRaw(form.date_debut_raw),
                date_fin: convertDateRaw(form.date_fin_raw),
                description: form.description,
              })
              .catch((err) => reportError("ECHEC_AJOUT_FORMATION_PARSER", err)),
          ),
        );
      }
      toast.success("Profil rempli avec succès !", { id: toastId });
      setShowParserModal(false);
      setParsedData(null);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors du remplissage.", { id: toastId });
      reportError("ECHEC_VALIDATION_PARSING", err);
    } finally {
      setRemplissageLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month] = dateStr.split("-");
    const mois = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    return `${mois[parseInt(month, 10) - 1]} ${year}`;
  };

  const getCommunesOptions = (wilaya) => {
    if (!wilaya) return [];
    const wilayaCode = wilaya.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === wilayaCode)
      .map((c) => ({
        value: c.commune_name_ascii,
        label: c.commune_name_ascii,
      }));
  };

  return {
    // State
    loading,
    profil,
    constants,
    titreSuggestions,
    showTitreSuggestions,
    setShowTitreSuggestions,
    expTitreSuggestions,
    showExpTitreSuggestions,
    setShowExpTitreSuggestions,
    handleExpTitreChange,
    showExpForm,
    setShowExpForm,
    showFormForm,
    setShowFormForm,
    showCVForm,
    setShowCVForm,
    showInfoForm,
    setShowInfoForm,
    showPrefForm,
    setShowPrefForm,
    showLinksForm,
    setShowLinksForm,
    showParserModal,
    setShowParserModal,
    newExp,
    setNewExp,
    newForm,
    setNewForm,
    editingExpId,
    setEditingExpId,
    editingFormId,
    setEditingFormId,
    editInfo,
    setEditInfo,
    editPref,
    setEditPref,
    editCV,
    setEditCV,
    editLinks,
    setEditLinks,
    parserLoading,
    remplissageLoading,
    parsedData,
    setParsedData,
    parserMode,
    setParserMode,
    // Computed
    completionPercent,
    // Handlers
    fetchData,
    getPhotoUrl: mediaUrl,
    formatText,
    formatDate,
    getCommunesOptions,
    handleTitreProChange,
    handleUpdateGeneric,
    handleUpdateCV,
    handlePhotoChange,
    handleAddExperience,
    handleDeleteExp,
    handleEditExp,
    handleUpdateExperience,
    handleAddFormation,
    handleDeleteForm,
    handleEditFormation,
    handleUpdateFormation,
    handleAddTag,
    handleRemoveTag,
    handleAddLanguage,
    handleUpdateLinks,
    handleParserCVUpload,
    handleValiderParsing,
  };
};
