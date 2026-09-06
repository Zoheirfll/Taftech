import { useState, useEffect, useMemo, useCallback } from "react";
import { profilService } from "../../../Services/profilService";
import { jobsService } from "../../../Services/jobsService";
import { convertDateRaw } from "../../../utils/cvDates";
import { reportError } from "../../../utils/errorReporter";
import toast from "react-hot-toast";
import { apiErrMsg } from "../../../utils/apiErrMsg";

const CHAMPS_PROFIL = [
  { label: "Téléphone", test: (p) => !!p.telephone },
  { label: "CV", test: (p) => !!p.cv_pdf },
  { label: "Wilaya / Commune", test: (p) => !!(p.wilaya && p.commune) },
  { label: "Diplôme", test: (p) => !!p.diplome },
  { label: "Spécialité", test: (p) => !!p.specialite },
  { label: "Expériences", test: (p) => p.experiences_detail?.length > 0 },
  { label: "Formations", test: (p) => p.formations_detail?.length > 0 },
  { label: "Compétences", test: (p) => p.competences_detail?.length > 0 },
];

const parseLangueBrute = (l) => {
  if (l.includes(":")) {
    const [langue, niveau] = l.split(":");
    return { langue: langue.trim(), niveau: niveau.trim() };
  }
  const m = l.match(/^(.+?)\s*\((.+?)\)$/);
  if (m) return { langue: m[1].trim(), niveau: m[2].trim() };
  return { langue: l.trim(), niveau: "Intermédiaire" };
};

export const useOnboardingWizard = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState(null);
  const [constants, setConstants] = useState({});
  const [parsedData, setParsedData] = useState(null);
  const [parserLoading, setParserLoading] = useState(false);
  // Verrou anti-double-clic partagé par toutes les etapes "Continuer" — une
  // sauvegarde reseau lente ne doit jamais pouvoir en declencher une seconde
  // en parallele si l'utilisateur reclique avant la reponse.
  const [saving, setSaving] = useState(false);

  const [infosForm, setInfosForm] = useState({});
  const [infosMode, setInfosMode] = useState("remplacer");
  const [pendingExperiences, setPendingExperiences] = useState([]);
  const [experiencesMode, setExperiencesMode] = useState("remplacer");
  const [pendingFormations, setPendingFormations] = useState([]);
  const [formationsMode, setFormationsMode] = useState("remplacer");
  const [pendingLangues, setPendingLangues] = useState([]);
  const [languesMode, setLanguesMode] = useState("remplacer");
  const [pendingCompetences, setPendingCompetences] = useState([]);
  const [competencesMode, setCompetencesMode] = useState("remplacer");
  const [prefsForm, setPrefsForm] = useState({});
  const [pendingPhoto, setPendingPhoto] = useState(null);

  const refresh = useCallback(async () => {
    const [p, c] = await Promise.all([profilService.getProfil(), jobsService.getConstants()]);
    setProfil(p);
    setConstants(c);
    setInfosForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      date_naissance: p.date_naissance || "",
      sexe: p.sexe || "",
      wilaya: p.wilaya || "",
      commune: p.commune || "",
      telephone: p.telephone || "",
      diplome: p.diplome || "",
      specialite: p.specialite || "",
      titre_professionnel: p.titre_professionnel || "",
      service_militaire: p.service_militaire || "",
      bio: p.bio || "",
      linkedin: p.linkedin || "",
      github: p.github || "",
      permis_conduire: p.permis_conduire || false,
      passeport_valide: p.passeport_valide || false,
      vehicule_personnel: p.vehicule_personnel || false,
    });
    setPrefsForm({
      secteur_souhaite: p.secteur_souhaite || "",
      salaire_souhaite: p.salaire_souhaite || "",
      mobilite: p.mobilite || "",
      situation_actuelle: p.situation_actuelle || "",
    });
    return p;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        toast.error(apiErrMsg(err, "Erreur de chargement du profil."));
        reportError("ECHEC_FETCH_ONBOARDING_PROFIL", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, 8)), []);
  const skipStep = useCallback(() => nextStep(), [nextStep]);
  const goToStep = useCallback((n) => setStep(n), []);

  const uploadCV = useCallback(async (file) => {
    setParserLoading(true);
    try {
      const result = await jobsService.parserCV(file || null);
      if (!result.success) {
        toast.error(result.error || "Impossible d'analyser ce CV.");
        return;
      }
      setParsedData(result);
      let prenom, nom;
      if (result.nom_complet) {
        const parts = result.nom_complet.trim().split(/\s+/).filter(Boolean);
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
      }
      setInfosForm((prev) => ({
        ...prev,
        first_name: prenom || prev.first_name,
        last_name: nom || prev.last_name,
        telephone: result.telephone || prev.telephone,
        wilaya: result.wilaya || prev.wilaya,
        diplome: result.diplome || prev.diplome,
        specialite: result.specialite || prev.specialite,
        sexe: result.sexe || prev.sexe,
        date_naissance: result.date_naissance || prev.date_naissance,
        titre_professionnel: result.titre_professionnel || prev.titre_professionnel,
        service_militaire: result.service_militaire || prev.service_militaire,
        bio: result.bio || prev.bio,
        linkedin: result.linkedin || prev.linkedin,
        github: result.github || prev.github,
        permis_conduire: result.permis_conduire || prev.permis_conduire,
        passeport_valide: result.passeport_valide || prev.passeport_valide,
        vehicule_personnel: result.vehicule_personnel || prev.vehicule_personnel,
      }));
      setPrefsForm((prev) => ({
        ...prev,
        situation_actuelle: result.situation_actuelle || prev.situation_actuelle,
        mobilite: result.mobilite || prev.mobilite,
        salaire_souhaite: result.salaire_souhaite || prev.salaire_souhaite,
      }));
      if (result.photo?.data) {
        try {
          const byteCharacters = atob(result.photo.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          const ext = result.photo.ext || "jpg";
          const blob = new Blob([new Uint8Array(byteNumbers)], { type: `image/${ext}` });
          setPendingPhoto(new File([blob], `photo.${ext}`, { type: `image/${ext}` }));
        } catch (err) {
          reportError("ECHEC_DECODAGE_PHOTO_ONBOARDING", err);
        }
      }
      if (result.experiences?.length > 0) {
        setPendingExperiences(
          result.experiences.map((exp) => ({
            titre_poste: exp.titre_poste,
            entreprise: exp.entreprise,
            secteur: exp.secteur || null,
            date_debut: convertDateRaw(exp.date_debut_raw),
            date_fin: convertDateRaw(exp.date_fin_raw),
            description: exp.description || "",
          })),
        );
      }
      if (result.formations?.length > 0) {
        setPendingFormations(
          result.formations.map((f) => ({
            diplome: f.diplome,
            etablissement: f.etablissement,
            date_debut: convertDateRaw(f.date_debut_raw),
            date_fin: convertDateRaw(f.date_fin_raw),
            description: f.description || "",
          })),
        );
      }
      if (result.langues) {
        setPendingLangues(
          result.langues.split(",").map((l) => l.trim()).filter(Boolean).map(parseLangueBrute),
        );
      }
      if (result.competences) {
        const niveaux = result.competences_niveaux || {};
        setPendingCompetences(
          result.competences.split(",").map((c) => c.trim()).filter(Boolean).map((label) => ({
            label,
            niveau: niveaux[label] || "DEBUTANT",
          })),
        );
      }
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de l'analyse."));
      reportError("ECHEC_PARSER_CV_ONBOARDING", err);
    } finally {
      setParserLoading(false);
    }
  }, [nextStep]);

  const saveInfosStep = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const formData = new FormData();
    Object.entries(infosForm).forEach(([key, value]) => {
      if (infosMode === "remplacer" || value) formData.append(key, value ?? "");
    });
    if (pendingPhoto && (infosMode === "remplacer" || !profil?.photo_profil)) {
      formData.append("photo_profil", pendingPhoto);
    }
    try {
      await profilService.updateProfil(formData);
      setPendingPhoto(null);
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
      reportError("ECHEC_SAVE_INFOS_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [infosForm, infosMode, pendingPhoto, profil, nextStep, refresh, saving]);

  const saveExperiencesStep = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (experiencesMode === "remplacer") {
        await Promise.allSettled(
          (profil?.experiences_detail || []).map((exp) =>
            profilService.deleteExperience(exp.id).catch((err) => reportError("ECHEC_SUPPR_EXP_ONBOARDING", err)),
          ),
        );
      }
      await Promise.allSettled(
        pendingExperiences.map((exp) =>
          profilService.addExperience(exp).catch((err) => reportError("ECHEC_ADD_EXP_ONBOARDING", err)),
        ),
      );
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des expériences."));
      reportError("ECHEC_SAVE_EXPERIENCES_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [pendingExperiences, experiencesMode, profil, nextStep, refresh, saving]);

  const saveFormationsStep = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (formationsMode === "remplacer") {
        await Promise.allSettled(
          (profil?.formations_detail || []).map((f) =>
            profilService.deleteFormation(f.id).catch((err) => reportError("ECHEC_SUPPR_FORMATION_ONBOARDING", err)),
          ),
        );
      }
      await Promise.allSettled(
        pendingFormations.map((f) =>
          profilService.addFormation(f).catch((err) => reportError("ECHEC_ADD_FORMATION_ONBOARDING", err)),
        ),
      );
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des formations."));
      reportError("ECHEC_SAVE_FORMATIONS_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [pendingFormations, formationsMode, profil, nextStep, refresh, saving]);

  const saveLanguesStep = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const existing = languesMode === "remplacer" ? [] : (profil?.langues || "").split(",").filter(Boolean).map(parseLangueBrute);
      const parLangue = new Map();
      [...existing, ...pendingLangues].forEach(({ langue, niveau }) => parLangue.set(langue.toLowerCase(), `${langue}:${niveau}`));
      const formData = new FormData();
      formData.append("langues", [...parLangue.values()].join(",").slice(0, 255));
      await profilService.updateProfil(formData);
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des langues."));
      reportError("ECHEC_SAVE_LANGUES_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [pendingLangues, languesMode, profil, nextStep, refresh, saving]);

  const saveCompetencesStep = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (competencesMode === "remplacer") {
        await Promise.allSettled(
          (profil?.competences_detail || []).map((c) =>
            jobsService.supprimerCompetence(c.id).catch((err) => reportError("ECHEC_SUPPR_COMPETENCE_ONBOARDING", err)),
          ),
        );
      }
      await Promise.allSettled(
        pendingCompetences.map(({ label, niveau }) =>
          jobsService.ajouterCompetence(label, niveau).catch((err) => reportError("ECHEC_ADD_COMPETENCE_ONBOARDING", err)),
        ),
      );
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des compétences."));
      reportError("ECHEC_SAVE_COMPETENCES_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [pendingCompetences, competencesMode, profil, nextStep, refresh, saving]);

  const savePrefsStep = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const formData = new FormData();
    Object.entries(prefsForm).forEach(([key, value]) => formData.append(key, value ?? ""));
    try {
      await profilService.updateProfil(formData);
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des préférences."));
      reportError("ECHEC_SAVE_PREFS_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [prefsForm, nextStep, refresh, saving]);

  const completionPercent = useMemo(() => {
    if (!profil) return 0;
    return Math.round((CHAMPS_PROFIL.filter((c) => c.test(profil)).length / CHAMPS_PROFIL.length) * 100);
  }, [profil]);

  return {
    step, goToStep, nextStep, skipStep,
    loading, profil, constants, saving,
    parsedData, parserLoading, uploadCV,
    infosForm, setInfosForm, infosMode, setInfosMode, saveInfosStep, pendingPhoto, setPendingPhoto,
    pendingExperiences, setPendingExperiences, experiencesMode, setExperiencesMode, saveExperiencesStep,
    pendingFormations, setPendingFormations, formationsMode, setFormationsMode, saveFormationsStep,
    pendingLangues, setPendingLangues, languesMode, setLanguesMode, saveLanguesStep,
    pendingCompetences, setPendingCompetences, competencesMode, setCompetencesMode, saveCompetencesStep,
    prefsForm, setPrefsForm, savePrefsStep,
    completionPercent,
  };
};
