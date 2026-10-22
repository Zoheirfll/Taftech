import { useState, useEffect, useMemo } from "react";
import { profilService } from "../../../Services/profilService";
import { jobsService } from "../../../Services/jobsService";
import { reportError } from "../../../utils/errorReporter";
import { mediaUrl } from "../../../utils/mediaUrl";
import { confirmToast } from "../../../utils/confirmToast";
import { notifier } from "../../../utils/notifier";
import communesAlgerie from "../../../data/communes.json";
import { formatDatePrecise } from "../../../utils/cvDates";
import { notifierProfilMisAJour } from "../../../utils/evenementsProfil";

const INITIAL_EXP = {
  titre_poste: "",
  entreprise: "",
  metier: "",
  metier_libelle: "",
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
  diplome_ref: "",
  specialite_ref: "",
  statut: "OBTENU",
};

const formatText = (text) => {
  if (!text) return "Non spécifié";
  return text
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
};

// Clés d'affichage du métier proposé (jamais envoyées : seul `demande_metier*` l'est).
const CLES_AFFICHAGE_PROPOSITION = [
  "demande_metier_libelle", "demande_metier_statut", "demande_metier_motif",
  "demande_metier_souhaite_libelle", "demande_metier_souhaite_statut", "demande_metier_souhaite_motif",
];

const normalizeExp = (exp) => {
  const envoye = {
    ...exp,
    metier: exp.metier || null,
    appellation: exp.appellation || null,
    date_fin: exp.date_fin || null,
    demande_metier: exp.demande_metier || null,
  };
  CLES_AFFICHAGE_PROPOSITION.forEach((cle) => delete envoye[cle]);
  return envoye;
};

// diplome_ref/specialite_ref sont des PrimaryKeyRelatedField nullable côté DRF — une chaîne
// vide "" (valeur par défaut des <select> non renseignés) est rejetée (seul `null` est accepté).
const normalizeForm = (form) => ({
  ...form,
  diplome_ref: form.diplome_ref || null,
  specialite_ref: form.specialite_ref || null,
  date_fin_prevue: form.date_fin_prevue || null,
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
  // Types de diplôme précis (référentiel v2, 37 valeurs) pour le sélecteur "Niveau d'études" —
  // remplace l'ancien select à 13 valeurs génériques ambiguës (`constants.diplomes`).
  const [typesDiplomes, setTypesDiplomes] = useState([]);

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
      const [pData, cData, nfData] = await Promise.all([
        profilService.getProfil(),
        jobsService.getConstants(),
        jobsService.getNomenclatureFormation().catch(() => ({ types_diplomes: [] })),
      ]);
      setProfil(pData);
      setConstants(cData);
      setTypesDiplomes(nfData.types_diplomes || []);
      setEditInfo({
        first_name: pData.first_name,
        last_name: pData.last_name,
        telephone: pData.telephone || "",
        nin: pData.nin || "",
        wilaya: pData.wilaya || "",
        commune: pData.commune || "",
        adresse: pData.adresse || "",
        diplome_ref: pData.diplome_ref || "",
        diplome_ref_libelle: pData.diplome_ref_libelle || "",
        metier: pData.metier || "",
        metier_libelle: pData.metier_libelle || "",
        metier_appellation: pData.metier_appellation || null,
        metier_appellation_libelle: pData.metier_appellation_libelle || "",
        demande_metier: pData.metier_propose?.id || "",
        demande_metier_libelle: pData.metier_propose?.libelle || "",
        demande_metier_statut: pData.metier_propose?.statut || "",
        demande_metier_motif: pData.metier_propose?.motif_refus || "",
        service_militaire: pData.service_militaire || "",
        permis_conduire: pData.permis_conduire || false,
        passeport_valide: pData.passeport_valide || false,
      });
      setEditPref({
        metier_souhaite: pData.metier_souhaite || "",
        metier_souhaite_libelle: pData.metier_souhaite_libelle || "",
        metier_souhaite_appellation: pData.metier_souhaite_appellation || null,
        metier_souhaite_appellation_libelle: pData.metier_souhaite_appellation_libelle || "",
        demande_metier_souhaite: pData.metier_souhaite_propose?.id || "",
        demande_metier_souhaite_libelle: pData.metier_souhaite_propose?.libelle || "",
        demande_metier_souhaite_statut: pData.metier_souhaite_propose?.statut || "",
        demande_metier_souhaite_motif: pData.metier_souhaite_propose?.motif_refus || "",
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
      notifier.echec("Synchronisation impossible", err);
      reportError("ECHEC_FETCH_PROFIL_DATA", err);
    } finally {
      setLoading(false);
    }
  };

  // "action" détermine le raccourci déclenché au clic sur le badge manquant
  // correspondant (voir handleChampManquantClick) — évite le détour habituel
  // "cliquer Modifier puis chercher où saisir".
  const CHAMPS_PROFIL = [
    { label: "Téléphone", action: "info", test: (p) => !!p.telephone },
    { label: "Photo de profil", action: "photo", test: (p) => !!p.photo_profil },
    { label: "CV", action: "cv", test: (p) => !!p.cv_pdf },
    { label: "Titre professionnel", action: "cv-form", test: (p) => !!p.titre_professionnel },
    { label: "Wilaya / Commune", action: "info", test: (p) => !!(p.wilaya && p.commune) },
    { label: "Diplôme", action: "info", test: (p) => !!(p.diplome_ref_libelle || p.niveau_scolaire_ref_libelle || p.diplome) },
    { label: "Métier", action: "info", test: (p) => !!p.metier },
    { label: "Expériences", action: "experiences", test: (p) => p.experiences_detail?.length > 0 },
    { label: "Formations", action: "formations", test: (p) => p.formations_detail?.length > 0 },
    { label: "Compétences", action: "competences", test: (p) => p.competences?.split(",").filter((t) => t).length > 0 },
  ];

  const completionPercent = useMemo(() => {
    if (!profil) return 0;
    return CHAMPS_PROFIL.filter((c) => c.test(profil)).length * 10;
  }, [profil]);

  const champsManquants = useMemo(() => {
    if (!profil) return [];
    return CHAMPS_PROFIL.filter((c) => !c.test(profil)).map((c) => ({ label: c.label, action: c.action }));
  }, [profil]);

  const handleExpTitreChange = async (value) => {
    setNewExp((prev) => ({ ...prev, titre_poste: value }));
    if (value.length >= 2) {
      try {
        const data = await jobsService.searchMetiers(value);
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
        const data = await jobsService.searchMetiers(value);
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
        .filter((key) => !["nin", "metier_libelle", "metier_souhaite_libelle", "diplome_ref_libelle", "metier_appellation_libelle", "metier_souhaite_appellation_libelle", ...CLES_AFFICHAGE_PROPOSITION].includes(key))
        // `metier`/`metier_souhaite`/`diplome_ref` sont des PrimaryKeyRelatedField nullables côté
        // DRF — une chaîne vide (valeur par défaut tant qu'aucun choix n'est fait) est rejetée,
        // contrairement à `null` (que FormData ne sait pas transporter) : on omet simplement la
        // clé, ce qui laisse la valeur actuelle inchangée (PUT partiel) plutôt que d'échouer sur "".
        // Idem pour les appellations (clés étrangères nullables) : omises tant qu'aucune n'est choisie ; le
        // serveur efface l'ancienne si le métier change sans appellation.
        .filter((key) => !(["metier", "metier_souhaite", "diplome_ref", "metier_appellation", "metier_souhaite_appellation", "demande_metier", "demande_metier_souhaite"].includes(key) && !dataState[key]))
        .forEach((key) => formData.append(key, dataState[key]));
      await profilService.updateProfil(formData);
      notifier.succes("Profil mis à jour");
      setModalState(false);
      fetchData();
    } catch (err) {
      notifier.echec("Mise à jour impossible", err);
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
      notifier.succes("Dossier CV actualisé");
      setShowCVForm(false);
      fetchData();
    } catch (err) {
      notifier.echec("Envoi du fichier impossible", err);
      reportError("ECHEC_UPDATE_CV", err);
    }
  };

  const handleDeleteCV = async () => {
    try {
      const formData = new FormData();
      formData.append("remove_cv_pdf", "true");
      await profilService.updateProfil(formData);
      notifier.succes("CV supprimé");
      fetchData();
    } catch (err) {
      notifier.echec("Suppression du CV impossible", err);
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
      notifier.succes("Photo mise à jour");
      notifierProfilMisAJour();
      fetchData();
    } catch (err) {
      notifier.echec("Envoi de la photo impossible", err);
      reportError("ECHEC_UPDATE_PHOTO", err);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setCropperPhoto(file);
  };

  // Upload direct du CV sans passer par la modale "Modifier" — utilisé par le
  // badge "CV" de la checklist de complétion, ouvre directement le sélecteur
  // de fichier local au lieu d'un détour par un formulaire.
  const handleQuickUploadCV = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (![".pdf", ".docx", ".doc"].includes(ext)) {
      notifier.erreur("Format non supporté", "Formats acceptés : PDF, DOC et DOCX.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notifier.erreur("Fichier trop volumineux", "La taille maximale est de 5 Mo.");
      return;
    }
    const toastId = notifier.chargement("Envoi du CV en cours");
    try {
      const formData = new FormData();
      formData.append("cv_pdf", file);
      await profilService.updateProfil(formData);
      notifier.succes("CV ajouté", undefined, { id: toastId });
      fetchData();
    } catch (err) {
      notifier.echec("Envoi du fichier impossible", err, { id: toastId });
      reportError("ECHEC_QUICK_UPLOAD_CV", err);
    }
  };

  const handleAddExperience = async (e) => {
    e.preventDefault();
    try {
      await profilService.addExperience(normalizeExp(newExp));
      notifier.succes("Expérience ajoutée");
      setShowExpForm(false);
      setNewExp(INITIAL_EXP);
      fetchData();
    } catch (err) {
      notifier.echec("Enregistrement impossible", err);
      reportError("ECHEC_AJOUT_EXP", err);
    }
  };

  const handleDeleteExp = (id) => {
    confirmToast("Supprimer cette expérience ?", async () => {
      try {
        await profilService.deleteExperience(id);
        fetchData();
      } catch (err) {
        notifier.echec("Suppression impossible", err);
        reportError("ECHEC_DELETE_EXP", err);
      }
    });
  };

  const handleEditExp = (exp) => {
    setNewExp({
      titre_poste: exp.titre_poste || "",
      entreprise: exp.entreprise || "",
      metier: exp.metier || "",
      metier_libelle: exp.metier_libelle || "",
      appellation: exp.appellation || null,
      appellation_libelle: exp.appellation_libelle || "",
      demande_metier: exp.metier_propose?.id || null,
      demande_metier_libelle: exp.metier_propose?.libelle || "",
      demande_metier_statut: exp.metier_propose?.statut || "",
      demande_metier_motif: exp.metier_propose?.motif_refus || "",
      date_debut: exp.date_debut || "",
      date_fin: exp.date_fin || "",
      date_debut_precision: exp.date_debut_precision || "JOUR",
      date_fin_precision: exp.date_fin_precision || "JOUR",
      description: exp.description || "",
    });
    setEditingExpId(exp.id);
    setShowExpForm(true);
  };

  const handleUpdateExperience = async (e) => {
    e.preventDefault();
    try {
      await profilService.updateExperience(editingExpId, normalizeExp(newExp));
      notifier.succes("Expérience mise à jour");
      setShowExpForm(false);
      setEditingExpId(null);
      setNewExp(INITIAL_EXP);
      fetchData();
    } catch (err) {
      notifier.echec("Mise à jour impossible", err);
      reportError("ECHEC_UPDATE_EXP", err);
    }
  };

  const handleAddFormation = async (e) => {
    e.preventDefault();
    try {
      await profilService.addFormation(normalizeForm(newForm));
      notifier.succes("Formation ajoutée");
      setShowFormForm(false);
      setNewForm(INITIAL_FORM);
      fetchData();
    } catch (err) {
      notifier.echec("Ajout impossible", err);
      reportError("ECHEC_AJOUT_FORMATION", err);
    }
  };

  const handleDeleteForm = (id) => {
    confirmToast("Supprimer cette formation ?", async () => {
      try {
        await profilService.deleteFormation(id);
        fetchData();
      } catch (err) {
        notifier.echec("Suppression impossible", err);
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
      date_debut_precision: form.date_debut_precision || "JOUR",
      date_fin_precision: form.date_fin_precision || "JOUR",
      description: form.description || "",
      specialite_texte: form.specialite_texte || "",
      diplome_ref: form.diplome_ref || "",
      diplome_ref_libelle: form.diplome_ref_libelle || "",
      specialite_ref: form.specialite_ref || "",
      statut: form.statut || "OBTENU",
    });
    setEditingFormId(form.id);
    setShowFormForm(true);
  };

  const handleUpdateFormation = async (e) => {
    e.preventDefault();
    try {
      await profilService.updateFormation(editingFormId, normalizeForm(newForm));
      notifier.succes("Formation mise à jour");
      setShowFormForm(false);
      setEditingFormId(null);
      setNewForm(INITIAL_FORM);
      fetchData();
    } catch (err) {
      notifier.echec("Mise à jour impossible", err);
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

  // Remplace l'entrée EXACTE « Nom:Niveau » à sa place (jamais par préfixe : « An » ne doit pas toucher
  // « Anglais ») et retire un éventuel doublon du même nom.
  const handleUpdateLanguage = async (ancienneEntree, nom, niveau) => {
    const nouvelleEntree = `${nom}:${niveau}`;
    const langues = (profil.langues || "")
      .split(",")
      .filter((l) => l)
      .map((l) => (l === ancienneEntree ? nouvelleEntree : l))
      .filter((l, i, liste) => l === nouvelleEntree
        ? liste.findIndex((x) => x.split(":")[0].trim().toLowerCase() === nom.toLowerCase()) === i
        : l.split(":")[0].trim().toLowerCase() !== nom.toLowerCase());
    const formData = new FormData();
    formData.append("langues", langues.join(","));
    try {
      await profilService.updateProfil(formData);
      notifier.succes("Langue mise à jour");
      fetchData();
    } catch (err) {
      notifier.echec("Mise à jour de la langue impossible", err);
      reportError("ECHEC_MODIFICATION_LANGUE", err);
    }
  };

  const handleUpdateLinks = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(editLinks).forEach(([k, v]) => formData.append(k, v));
    try {
      await profilService.updateProfil(formData);
      notifier.succes("Informations mises à jour");
      setShowLinksForm(false);
      fetchData();
    } catch (err) {
      notifier.echec("Enregistrement impossible", err);
      reportError("ECHEC_UPDATE_LINKS", err);
    }
  };

  // Affichage selon la précision réellement connue (année seule, mois/année, date complète).
  const formatDate = (dateStr, precision = "MOIS") => {
    if (!dateStr) return null;
    return formatDatePrecise(dateStr, precision);
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
    typesDiplomes,
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
    handleQuickUploadCV,
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
    handleUpdateLanguage,
    handleUpdateLinks,
  };
};
