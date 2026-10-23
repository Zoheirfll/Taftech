import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { profilService } from "../../../Services/profilService";
import { jobsService } from "../../../Services/jobsService";
import { convertDateRaw, convertDateFin, precisionDateRaw, precisionDateFin } from "../../../utils/cvDates";
import { reportError } from "../../../utils/errorReporter";
import { notifier } from "../../../utils/notifier";
import { apiErrMsg } from "../../../utils/apiErrMsg";
import { bloqueLaFonctionIA } from "../../../utils/erreursIA";
import { notifierProfilMisAJour } from "../../../utils/evenementsProfil";
import { doitRetirerPhoto } from "../../../utils/photoProfil";

const CHAMPS_PROFIL = [
  { label: "Téléphone", test: (p) => !!p.telephone },
  { label: "CV", test: (p) => !!p.cv_pdf },
  { label: "Wilaya / Commune", test: (p) => !!(p.wilaya && p.commune) },
  { label: "Diplôme", test: (p) => !!p.diplome },
  { label: "Métier", test: (p) => !!p.metier },
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
  const [quotaParserCV, setQuotaParserCV] = useState(null);
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
  // Le CV parsé n'était jusqu'ici jamais attaché au profil (`cv_pdf`) — seules les données
  // extraites l'étaient, le parser backend écrit le fichier envoyé dans un temp file jeté
  // après analyse. Même pattern que `pendingPhoto` : on garde le fichier réellement
  // sélectionné par l'utilisateur (pas de re-upload si `uploadCV(null)` a réutilisé le CV
  // déjà sur le profil) et on l'envoie avec le reste des infos à l'étape suivante.
  const [pendingCvFile, setPendingCvFile] = useState(null);
  const parsingIdRef = useRef(null);

  // `avecPrefs` : seul le chargement initial remplit les préférences depuis le profil. Les rechargements qui
  // suivent chaque enregistrement d'étape ne doivent pas ré-écrire les préférences remises à zéro par l'analyse
  // d'un CV (sinon l'ancien métier souhaité, salaire… réapparaissent à l'étape « Préférences »).
  const refresh = useCallback(async ({ avecPrefs = false } = {}) => {
    const [p, c, nomenclatureFormation] = await Promise.all([
      profilService.getProfil(),
      jobsService.getConstants(),
      jobsService.getNomenclatureFormation().catch(() => ({ types_diplomes: [] })),
    ]);
    setProfil(p);
    setConstants({ ...c, typesDiplomes: nomenclatureFormation.types_diplomes || [] });
    setInfosForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      date_naissance: p.date_naissance || "",
      sexe: p.sexe || "",
      wilaya: p.wilaya || "",
      commune: p.commune || "",
      adresse: p.adresse || "",
      telephone: p.telephone || "",
      diplome: p.diplome || "",
      diplome_ref: p.diplome_ref || "",
      diplome_ref_libelle: p.diplome_ref_libelle || "",
      metier: p.metier || "",
      metier_libelle: p.metier_libelle || "",
      metier_appellation: p.metier_appellation || null,
      metier_appellation_libelle: p.metier_appellation_libelle || "",
      // Métier proposé en attente de décision (« Je ne trouve pas mon métier ») : voir demande_metier côté API.
      demande_metier: p.metier_propose?.id || "",
      demande_metier_libelle: p.metier_propose?.libelle || "",
      demande_metier_statut: p.metier_propose?.statut || "",
      titre_professionnel: p.titre_professionnel || "",
      service_militaire: p.service_militaire || "",
      bio: p.bio || "",
      linkedin: p.linkedin || "",
      github: p.github || "",
      permis_conduire: p.permis_conduire || false,
      passeport_valide: p.passeport_valide || false,
      vehicule_personnel: p.vehicule_personnel || false,
    });
    if (avecPrefs) {
      setPrefsForm({
        metier_souhaite: p.metier_souhaite || "",
        metier_souhaite_libelle: p.metier_souhaite_libelle || "",
        metier_souhaite_appellation: p.metier_souhaite_appellation || null,
        metier_souhaite_appellation_libelle: p.metier_souhaite_appellation_libelle || "",
        demande_metier_souhaite: p.metier_souhaite_propose?.id || "",
        demande_metier_souhaite_libelle: p.metier_souhaite_propose?.libelle || "",
        demande_metier_souhaite_statut: p.metier_souhaite_propose?.statut || "",
        salaire_souhaite: p.salaire_souhaite || "",
        mobilite: p.mobilite || "",
        situation_actuelle: p.situation_actuelle || "",
      });
    }
    return p;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh({ avecPrefs: true });
        jobsService.getQuotaIA("PARSER_CV").then(setQuotaParserCV).catch(() => {});
      } catch (err) {
        notifier.echec("Chargement du profil impossible", err);
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
        notifier.erreur("Analyse du CV impossible", result.error || "Veuillez réessayer avec un autre fichier.");
        return;
      }
      // Le fichier réellement choisi (pas null == "réutiliser le CV déjà sur le profil")
      // doit être attaché au profil, pas seulement analysé — voir saveInfosStep.
      if (file) setPendingCvFile(file);
      setParsedData(result);
      parsingIdRef.current = result.parsing_id || null;
      let prenom, nom;
      if (result.nom_complet) {
        // Civilités en tête de CV ("Mme TABTI Samira") : sans ce retrait, "Mme" était pris pour le prénom.
        const civilite = /^(mme|mlle|mr|m|monsieur|madame|mademoiselle|dr|pr)\.?$/i;
        let parts = result.nom_complet.trim().split(/\s+/).filter(Boolean);
        while (parts.length > 1 && civilite.test(parts[0])) parts = parts.slice(1);
        if (parts.length >= 2) {
          const estMajuscules = (p) => p === p.toUpperCase() && p !== p.toLowerCase();
          const nbMaj = parts.findIndex((p) => !estMajuscules(p));
          if (nbMaj === -1) {
            // Tout en majuscules ("TABTI SAMIRA") : premier mot = nom, comportement historique.
            nom = parts[0];
            prenom = parts.slice(1).join(" ");
          } else if (nbMaj > 0) {
            // Mots en MAJUSCULES au début = nom de famille, le reste = prénom(s).
            nom = parts.slice(0, nbMaj).join(" ");
            prenom = parts.slice(nbMaj).join(" ");
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
        adresse: result.adresse || prev.adresse,
        // Wilaya, téléphone, adresse et date de naissance sont obligatoires à l'inscription : repli sur le profil. La commune
        // dépend de la wilaya : conservée seulement si la wilaya ne change pas.
        wilaya: result.wilaya || prev.wilaya,
        commune: !result.wilaya || result.wilaya === prev.wilaya ? prev.commune : "",
        // Tout ce qui suit vient du CV analysé et de lui seul : une information absente du nouveau CV
        // (sexe, LinkedIn, permis, métier…) ne doit pas survivre depuis l'ancien profil.
        diplome: result.diplome || "",
        diplome_ref: result.diplome_ref || "",
        diplome_ref_libelle: result.diplome_ref_libelle || "",
        metier: result.metier || "",
        metier_libelle: result.metier_libelle || "",
        metier_appellation: result.metier_appellation || null,
        metier_appellation_libelle: result.metier_appellation_libelle || "",
        // Le métier proposé en attente de l'ancien CV ne suit pas non plus.
        demande_metier: "",
        demande_metier_libelle: "",
        demande_metier_statut: "",
        sexe: result.sexe || "",
        date_naissance: result.date_naissance || prev.date_naissance,
        titre_professionnel: result.titre_professionnel || "",
        service_militaire: result.service_militaire || "",
        bio: result.bio || "",
        linkedin: result.linkedin || "",
        github: result.github || "",
        permis_conduire: !!result.permis_conduire,
        passeport_valide: !!result.passeport_valide,
        vehicule_personnel: !!result.vehicule_personnel,
      }));
      // Les préférences repartent de zéro à chaque analyse : seul le CV les remplit (le métier souhaité
      // n'est jamais déduit d'un CV, il est donc vidé).
      setPrefsForm({
        metier_souhaite: "",
        metier_souhaite_libelle: "",
        metier_souhaite_appellation: null,
        metier_souhaite_appellation_libelle: "",
        demande_metier_souhaite: "",
        demande_metier_souhaite_libelle: "",
        demande_metier_souhaite_statut: "",
        salaire_souhaite: result.salaire_souhaite || "",
        mobilite: result.mobilite || "",
        situation_actuelle: result.situation_actuelle || "",
      });
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
            metier: exp.metier || null,
            metier_libelle: exp.metier_libelle || "",
            appellation: exp.appellation || null,
            appellation_libelle: exp.appellation_libelle || "",
            metier_propose: exp.metier || null,
            metier_propose_libelle: exp.metier_libelle || "",
            date_debut: convertDateRaw(exp.date_debut_raw),
            date_fin: convertDateFin(exp.date_fin_raw, exp.date_debut_raw),
            date_debut_precision: precisionDateRaw(exp.date_debut_raw),
            date_fin_precision: precisionDateFin(exp.date_fin_raw, exp.date_debut_raw),
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
            date_fin: convertDateFin(f.date_fin_raw, f.date_debut_raw),
            date_debut_precision: precisionDateRaw(f.date_debut_raw),
            date_fin_precision: precisionDateFin(f.date_fin_raw, f.date_debut_raw),
            description: f.description || "",
            diplome_ref: f.diplome_ref || null,
            diplome_ref_libelle: f.diplome_ref_libelle || "",
            specialite_ref: f.specialite_ref || null,
            specialite_ref_libelle: f.specialite_ref_libelle || "",
            diplome_propose: f.diplome_ref || null,
            diplome_propose_libelle: f.diplome_ref_libelle || "",
            specialite_propose: f.specialite_ref || null,
            specialite_propose_libelle: f.specialite_ref_libelle || "",
            specialites_suggerees: f.specialites_suggerees || [],
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
        // Rapprochement avec le référentiel TAFTECH (calculé côté serveur) : permet à l'étape
        // de signaler les compétences reconnues et celles à vérifier.
        const reconnues = new Set((result.competences_referentiel || []).map((l) => l.toLowerCase()));
        const rapprochees = result.competences_rapprochees || {};
        const intituleCv = Object.fromEntries(Object.entries(rapprochees).map(([orig, canon]) => [canon, orig]));
        setPendingCompetences(
          result.competences.split(",").map((c) => c.trim()).filter(Boolean).map((label) => ({
            label,
            niveau: niveaux[label] || "DEBUTANT",
            dans_referentiel: reconnues.has(label.toLowerCase()),
            intitule_cv: intituleCv[label] || null,
          })),
        );
      }
      if (result.quota_ia) setQuotaParserCV({ ...result.quota_ia, disponible: true });
      nextStep();
    } catch (err) {
      notifier.echec("Analyse impossible", err);
      reportError("ECHEC_PARSER_CV_ONBOARDING", err);
      if (bloqueLaFonctionIA(err.response?.data)) {
        setQuotaParserCV({ ...err.response.data, disponible: false });
      }
    } finally {
      setParserLoading(false);
    }
  }, [nextStep]);

  const saveInfosStep = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const formData = new FormData();
    Object.entries(infosForm).forEach(([key, value]) => {
      if (key === "metier_libelle" || key === "diplome_ref_libelle" || key === "metier_appellation_libelle") return;
      if (key === "demande_metier_libelle" || key === "demande_metier_statut") return; // affichage seulement
      // `metier`/`diplome_ref` sont des PrimaryKeyRelatedField nullables — une chaîne vide
      // est rejetée par DRF, on omet simplement la clé si aucune valeur n'a été choisie.
      if ((key === "metier" || key === "diplome_ref" || key === "metier_appellation" || key === "demande_metier") && !value) return;
      if (infosMode === "remplacer" || value) formData.append(key, value ?? "");
    });
    if (pendingPhoto && (infosMode === "remplacer" || !profil?.photo_profil)) {
      formData.append("photo_profil", pendingPhoto);
    } else if (doitRetirerPhoto({ infosMode, cvAnalyse: parsedData, photoEnAttente: pendingPhoto, profil })) {
      // Le candidat suit son nouveau CV (Remplacer) et celui-ci n'a pas de photo : l'ancienne part aussi.
      formData.append("remove_photo_profil", "true");
    }
    // Toujours attaché si un fichier a été réellement choisi lors du parsing — c'est le
    // fichier que le candidat vient explicitement de sélectionner, indépendant du mode
    // remplacer/ajouter (qui ne s'applique qu'aux champs texte du profil).
    if (pendingCvFile) {
      formData.append("cv_pdf", pendingCvFile);
    }
    try {
      await profilService.updateProfil(formData);
      if (formData.has("photo_profil") || formData.has("remove_photo_profil")) notifierProfilMisAJour();
      setPendingPhoto(null);
      setPendingCvFile(null);
      await refresh();
      nextStep();
    } catch (err) {
      notifier.echec("Enregistrement impossible", err);
      reportError("ECHEC_SAVE_INFOS_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [infosForm, infosMode, pendingPhoto, pendingCvFile, parsedData, profil, nextStep, refresh, saving]);

  // Champs pré-remplis par le parser puis modifiés par le candidat -> paires (proposé, choisi).
  const envoyerCorrections = useCallback((corrections) => {
    const utiles = corrections.filter((c) => (c.propose_id ?? null) !== (c.corrige_id ?? null));
    if (parsingIdRef.current && utiles.length > 0) {
      jobsService.envoyerCorrectionsParsing(parsingIdRef.current, utiles);
    }
  }, []);

  const saveExperiencesStep = useCallback(async () => {
    if (saving) return;
    // La date de début est obligatoire côté serveur : on le vérifie AVANT tout envoi, sinon, en mode
    // « Remplacer », les anciennes expériences seraient supprimées puis la nouvelle refusée.
    const sansDebut = pendingExperiences.find((exp) => !exp.date_debut);
    if (sansDebut) {
      notifier.erreur(
        "Date de début manquante",
        `Renseignez la date de début de « ${sansDebut.titre_poste || "l'expérience"} » (bouton crayon) avant de continuer.`,
      );
      return;
    }
    setSaving(true);
    try {
      if (experiencesMode === "remplacer") {
        await Promise.allSettled(
          (profil?.experiences_detail || []).map((exp) =>
            profilService.deleteExperience(exp.id).catch((err) => reportError("ECHEC_SUPPR_EXP_ONBOARDING", err)),
          ),
        );
      }
      envoyerCorrections(pendingExperiences.map((exp) => ({
        type_correction: "METIER_EXPERIENCE", texte_source: exp.titre_poste,
        propose_id: exp.metier_propose, propose_libelle: exp.metier_propose_libelle,
        corrige_id: exp.metier, corrige_libelle: exp.metier_libelle,
      })));
      const resultats = await Promise.allSettled(
        pendingExperiences.map(({ metier_propose, metier_propose_libelle, demande_metier_libelle, ...exp }) => // eslint-disable-line no-unused-vars
          profilService.addExperience(exp),
        ),
      );
      const echecs = resultats
        .map((r, i) => (r.status === "rejected" ? { exp: pendingExperiences[i], err: r.reason } : null))
        .filter(Boolean);
      echecs.forEach(({ err }) => reportError("ECHEC_ADD_EXP_ONBOARDING", err));
      await refresh();
      if (echecs.length > 0) {
        // Jamais de passage silencieux à l'étape suivante : les expériences réussies sont déjà
        // enregistrées, on ne garde à l'écran que celles en échec et on passe en mode « Ajouter »
        // pour que le nouvel essai ne supprime rien.
        setPendingExperiences(echecs.map(({ exp }) => exp));
        setExperiencesMode("ajouter");
        notifier.erreur(
          `${echecs.length} expérience(s) non enregistrée(s)`,
          apiErrMsg(echecs[0].err, "Vérifiez les champs obligatoires (poste, entreprise)."),
        );
        return;
      }
      nextStep();
    } catch (err) {
      notifier.echec("Enregistrement des expériences impossible", err);
      reportError("ECHEC_SAVE_EXPERIENCES_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [pendingExperiences, experiencesMode, profil, nextStep, refresh, saving, envoyerCorrections]);

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
      envoyerCorrections(pendingFormations.flatMap((f) => [
        {
          type_correction: "DIPLOME", texte_source: f.diplome,
          propose_id: f.diplome_propose, propose_libelle: f.diplome_propose_libelle,
          corrige_id: f.diplome_ref || null, corrige_libelle: f.diplome_ref_libelle,
        },
        {
          type_correction: "SPECIALITE", texte_source: f.diplome,
          propose_id: f.specialite_propose, propose_libelle: f.specialite_propose_libelle,
          corrige_id: f.specialite_ref || null, corrige_libelle: f.specialite_ref_libelle,
        },
      ]));
      await Promise.allSettled(
        pendingFormations.map(({ diplome_propose, diplome_propose_libelle, specialite_propose, specialite_propose_libelle, specialites_suggerees, ...f }) => // eslint-disable-line no-unused-vars
          // diplome_ref/specialite_ref sont des PrimaryKeyRelatedField nullable côté DRF —
          // une chaîne vide (laissée par le Select une fois vidé) est rejetée, seul `null`
          // est accepté (même piège déjà géré par `normalizeForm` dans useProfilCandidat.js).
          profilService
            .addFormation({ ...f, diplome_ref: f.diplome_ref || null, specialite_ref: f.specialite_ref || null })
            .catch((err) => reportError("ECHEC_ADD_FORMATION_ONBOARDING", err)),
        ),
      );
      await refresh();
      nextStep();
    } catch (err) {
      notifier.echec("Enregistrement des formations impossible", err);
      reportError("ECHEC_SAVE_FORMATIONS_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [pendingFormations, formationsMode, profil, nextStep, refresh, saving, envoyerCorrections]);

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
      notifier.echec("Enregistrement des langues impossible", err);
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
      notifier.echec("Enregistrement des compétences impossible", err);
      reportError("ECHEC_SAVE_COMPETENCES_ONBOARDING", err);
    } finally {
      setSaving(false);
    }
  }, [pendingCompetences, competencesMode, profil, nextStep, refresh, saving]);

  const savePrefsStep = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const formData = new FormData();
    Object.entries(prefsForm)
      .filter(([key]) => key !== "metier_souhaite_libelle" && key !== "metier_souhaite_appellation_libelle")
      .filter(([key]) => key !== "demande_metier_souhaite_libelle" && key !== "demande_metier_souhaite_statut")
      // `metier_souhaite` (et son appellation, et le métier proposé en attente) sont des PrimaryKeyRelatedField
      // nullables : DRF convertit la chaîne vide en `null` (vérifié), ce qui EFFACE la valeur enregistrée.
      // Indispensable : après l'analyse d'un nouveau CV, un métier souhaité laissé vide doit disparaître du profil.
      .forEach(([key, value]) => formData.append(key, value ?? ""));
    try {
      await profilService.updateProfil(formData);
      await refresh();
      nextStep();
    } catch (err) {
      notifier.echec("Enregistrement des préférences impossible", err);
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
    parsedData, parserLoading, uploadCV, quotaParserCV,
    infosForm, setInfosForm, infosMode, setInfosMode, saveInfosStep, pendingPhoto, setPendingPhoto,
    pendingExperiences, setPendingExperiences, experiencesMode, setExperiencesMode, saveExperiencesStep,
    pendingFormations, setPendingFormations, formationsMode, setFormationsMode, saveFormationsStep,
    pendingLangues, setPendingLangues, languesMode, setLanguesMode, saveLanguesStep,
    pendingCompetences, setPendingCompetences, competencesMode, setCompetencesMode, saveCompetencesStep,
    prefsForm, setPrefsForm, savePrefsStep,
    completionPercent,
  };
};
