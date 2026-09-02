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

  const [infosForm, setInfosForm] = useState({});
  const [infosMode, setInfosMode] = useState("ajouter");
  const [pendingExperiences, setPendingExperiences] = useState([]);
  const [experiencesMode, setExperiencesMode] = useState("ajouter");
  const [pendingFormations, setPendingFormations] = useState([]);
  const [formationsMode, setFormationsMode] = useState("ajouter");
  const [pendingLangues, setPendingLangues] = useState([]);
  const [languesMode, setLanguesMode] = useState("ajouter");
  const [pendingCompetences, setPendingCompetences] = useState([]);
  const [competencesMode, setCompetencesMode] = useState("ajouter");

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

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, 7)), []);
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
      setInfosForm((prev) => ({
        ...prev,
        telephone: result.telephone || prev.telephone,
        wilaya: result.wilaya || prev.wilaya,
        diplome: result.diplome || prev.diplome,
        specialite: result.specialite || prev.specialite,
      }));
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
    const formData = new FormData();
    Object.entries(infosForm).forEach(([key, value]) => {
      if (infosMode === "remplacer" || value) formData.append(key, value ?? "");
    });
    try {
      await profilService.updateProfil(formData);
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
      reportError("ECHEC_SAVE_INFOS_ONBOARDING", err);
    }
  }, [infosForm, infosMode, nextStep, refresh]);

  const saveExperiencesStep = useCallback(async () => {
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
    }
  }, [pendingExperiences, experiencesMode, profil, nextStep, refresh]);

  const saveFormationsStep = useCallback(async () => {
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
    }
  }, [pendingFormations, formationsMode, profil, nextStep, refresh]);

  const saveLanguesStep = useCallback(async () => {
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
    }
  }, [pendingLangues, languesMode, profil, nextStep, refresh]);

  const saveCompetencesStep = useCallback(async () => {
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
    }
  }, [pendingCompetences, competencesMode, profil, nextStep, refresh]);

  const completionPercent = useMemo(() => {
    if (!profil) return 0;
    return Math.round((CHAMPS_PROFIL.filter((c) => c.test(profil)).length / CHAMPS_PROFIL.length) * 100);
  }, [profil]);

  return {
    step, goToStep, nextStep, skipStep,
    loading, profil, constants,
    parsedData, parserLoading, uploadCV,
    infosForm, setInfosForm, infosMode, setInfosMode, saveInfosStep,
    pendingExperiences, setPendingExperiences, experiencesMode, setExperiencesMode, saveExperiencesStep,
    pendingFormations, setPendingFormations, formationsMode, setFormationsMode, saveFormationsStep,
    pendingLangues, setPendingLangues, languesMode, setLanguesMode, saveLanguesStep,
    pendingCompetences, setPendingCompetences, competencesMode, setCompetencesMode, saveCompetencesStep,
    completionPercent,
  };
};
