import { useState, useEffect, useMemo } from "react";
import { profilService } from "../../../Services/profilService";
import { jobsService } from "../../../Services/jobsService";
import { reportError } from "../../../utils/errorReporter";
import { mediaUrl } from "../../../utils/mediaUrl";
import { confirmToast } from "../../../utils/confirmToast";
import toast from "react-hot-toast";
import communesAlgerie from "../../../data/communes.json";
import { apiErrMsg } from "../../../utils/apiErrMsg";
import { convertDateRaw } from "../../../utils/cvDates";

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
  const [competenceSuggestions, setCompetenceSuggestions] = useState([]);
  const [showCompetenceSuggestions, setShowCompetenceSuggestions] = useState(false);
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
      toast.error(apiErrMsg(err, "Erreur de synchronisation avec le serveur."));
      reportError("ECHEC_FETCH_PROFIL_DATA", err);
    } finally {
      setLoading(false);
    }
  };

  const CHAMPS_PROFIL = [
    { label: "Téléphone", test: (p) => !!p.telephone },
    { label: "Photo de profil", test: (p) => !!p.photo_profil },
    { label: "CV", test: (p) => !!p.cv_pdf },
    { label: "Titre professionnel", test: (p) => !!p.titre_professionnel },
    { label: "Wilaya / Commune", test: (p) => !!(p.wilaya && p.commune) },
    { label: "Diplôme", test: (p) => !!p.diplome },
    { label: "Spécialité", test: (p) => !!p.specialite },
    { label: "Expériences", test: (p) => p.experiences_detail?.length > 0 },
    { label: "Formations", test: (p) => p.formations_detail?.length > 0 },
    { label: "Compétences", test: (p) => p.competences?.split(",").filter((t) => t).length > 0 },
  ];

  const completionPercent = useMemo(() => {
    if (!profil) return 0;
    return CHAMPS_PROFIL.filter((c) => c.test(profil)).length * 10;
  }, [profil]);

  const champsManquants = useMemo(() => {
    if (!profil) return [];
    return CHAMPS_PROFIL.filter((c) => !c.test(profil)).map((c) => c.label);
  }, [profil]);

  const handleExpTitreChange = async (value) => {
    setNewExp((prev) => ({ ...prev, titre_poste: value }));
    if (value.length >= 2) {
      try {
        const data = await jobsService.getMetiers(value, "", newExp.secteur);
        setExpTitreSuggestions(data.slice(0, 20));
        setShowExpTitreSuggestions(true);
      } catch {
        setExpTitreSuggestions([]);
      }
    } else {
      setShowExpTitreSuggestions(false);
    }
  };

  const handleCompetenceInputChange = async (value) => {
    if (value.length >= 2) {
      try {
        const data = await jobsService.searchCompetences(value);
        setCompetenceSuggestions(data);
        setShowCompetenceSuggestions(data.length > 0);
      } catch {
        setCompetenceSuggestions([]);
      }
    } else {
      setShowCompetenceSuggestions(false);
    }
  };

  const handleTitreProChange = async (value) => {
    setEditCV(prev => ({ ...prev, titre: value }));
    if (value.length >= 2) {
      try {
        const data = await jobsService.getMetiers(value, "", editInfo.specialite);
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
      toast.error(apiErrMsg(err, "Erreur lors de la mise à jour"));
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
      toast.error(apiErrMsg(err, "Erreur lors de l'envoi du fichier"));
      reportError("ECHEC_UPDATE_CV", err);
    }
  };

  const handleDeleteCV = async () => {
    try {
      const formData = new FormData();
      formData.append("remove_cv_pdf", "true");
      await profilService.updateProfil(formData);
      toast.success("CV supprimé");
      fetchData();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la suppression du CV"));
      reportError("ECHEC_DELETE_CV", err);
    }
  };

  const [cropperPhoto, setCropperPhoto] = useState(null);
  const fermerCropperPhoto = () => setCropperPhoto(null);

  const uploaderPhotoRecadree = async (fichierRecadre) => {
    fermerCropperPhoto();
    const formData = new FormData();
    formData.append("photo_profil", fichierRecadre);
    try {
      await profilService.updateProfil(formData);
      toast.success("Photo mise à jour !");
      fetchData();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors du téléchargement."));
      reportError("ECHEC_UPDATE_PHOTO", err);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setCropperPhoto(file);
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
      toast.error(apiErrMsg(err, "Vérifiez les données."));
      reportError("ECHEC_AJOUT_EXP", err);
    }
  };

  const handleDeleteExp = (id) => {
    confirmToast("Supprimer cette expérience ?", async () => {
      try {
        await profilService.deleteExperience(id);
        fetchData();
      } catch (err) {
        toast.error(apiErrMsg(err, "Erreur de suppression"));
        reportError("ECHEC_DELETE_EXP", err);
      }
    });
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
      toast.error(apiErrMsg(err, "Erreur lors de la mise à jour"));
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
      toast.error(apiErrMsg(err, "Erreur lors de l'ajout"));
      reportError("ECHEC_AJOUT_FORMATION", err);
    }
  };

  const handleDeleteForm = (id) => {
    confirmToast("Supprimer cette formation ?", async () => {
      try {
        await profilService.deleteFormation(id);
        fetchData();
      } catch (err) {
        toast.error(apiErrMsg(err, "Erreur de suppression"));
        reportError("ECHEC_DELETE_FORMATION", err);
      }
    });
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
      toast.error(apiErrMsg(err, "Erreur lors de la mise à jour"));
      reportError("ECHEC_UPDATE_FORMATION", err);
    }
  };

  const handleAjouterCompetence = async (label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    try {
      await jobsService.ajouterCompetence(trimmed, "DEBUTANT");
      fetchData();
    } catch (err) {
      reportError("ECHEC_AJOUT_COMPETENCE", err);
    }
  };

  const handleSupprimerCompetence = async (id) => {
    try {
      await jobsService.supprimerCompetence(id);
      fetchData();
    } catch (err) {
      reportError("ECHEC_SUPPRESSION_COMPETENCE", err);
    }
  };

  const handleChangerNiveauCompetence = async (id, niveau) => {
    const competence = profil.competences_detail?.find((c) => c.id === id);
    if (!competence) return;
    try {
      await jobsService.ajouterCompetence(competence.label, niveau);
      fetchData();
    } catch (err) {
      reportError("ECHEC_CHANGEMENT_NIVEAU_COMPETENCE", err);
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
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
      reportError("ECHEC_UPDATE_LINKS", err);
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
    competenceSuggestions,
    showCompetenceSuggestions,
    setShowCompetenceSuggestions,
    handleCompetenceInputChange,
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
    // Computed
    completionPercent,
    champsManquants,
    // Handlers
    fetchData,
    getPhotoUrl: mediaUrl,
    formatText,
    formatDate,
    getCommunesOptions,
    handleTitreProChange,
    handleUpdateGeneric,
    handleUpdateCV,
    handleDeleteCV,
    handlePhotoChange,
    cropperPhoto,
    fermerCropperPhoto,
    uploaderPhotoRecadree,
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
    handleAjouterCompetence,
    handleSupprimerCompetence,
    handleChangerNiveauCompetence,
    handleAddLanguage,
    handleUpdateLinks,
  };
};
