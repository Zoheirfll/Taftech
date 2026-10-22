// Hook du formulaire "Publier une offre" : tout l'état, les effets de chargement et les
// gestionnaires (saisie, compétences, diplômes, exigences, génération IA, envoi).
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { notifier } from "../../../utils/notifier";
import { jobsService } from "../../../Services/jobsService";
import { rapprocherDuReferentiel } from "../../../utils/competencesReferentiel";
import { iaService } from "../../../Services/iaService";
import { recruteurService } from "../../../Services/recruteurService";
import communesAlgerie from "../../../data/communes.json";
import { reportError } from "../../../utils/errorReporter";
import { grouperParFamille } from "../../../utils/familleFormation";
import { CATEGORIE_EXIGENCE_PAR_DEFAUT } from "../../../utils/exigencesCategories";
import { bloqueLaFonctionIA } from "../../../utils/erreursIA";

// Les entrées génériques "Autre X — préciser" du référentiel sont masquées ici : dans une
// liste d'exigences utilisée pour le matching, elles ne comparent rien côté candidat (bruit
// pur). Le champ texte libre "Diplôme attendu" reste le bon endroit pour exprimer ce type de
// flexibilité de façon informative.
const RE_AUTRE_PRECISER = /autre.*préciser/i;

export function useCreateJob() {
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

  // Compétences structurées pour le matching.
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

  const typesDiplomesFiltres = (nomenclatureFormation?.types_diplomes || []).filter((d) => !RE_AUTRE_PRECISER.test(d.libelle));
  const specialitesFiltrees = (nomenclatureFormation?.specialites || []).filter((s) => !RE_AUTRE_PRECISER.test(s.libelle));
  // Point 8 : listes présentées par famille (supérieur / formation professionnelle / thèmes).
  const diplomesGroupes = grouperParFamille(typesDiplomesFiltres, nomenclatureFormation?.familles, (d) => ({ value: d.id, label: d.libelle }));
  const specialitesGroupes = grouperParFamille(specialitesFiltrees, nomenclatureFormation?.familles, (s) => ({ value: s.id, label: s.libelle }));

  // Suggestions compétences/spécialités du métier choisi (référentiel v2, MetierCompetence/
  // MetierFormation) — purement informatif, le recruteur ajoute ce qu'il veut, rien d'imposé.
  const [suggestionsPourMetier, setSuggestionsPourMetier] = useState({ competences: [], specialites: [], diplomes: [], avertissement: "" });

  // Exigences impératives (S12, REGLES_MATCHING) — permis, habilitation, droit d'exercice...
  // Distinctes du diplôme, jamais notées dans le score de matching : un simple filtre
  // d'éligibilité que le candidat déclare et que le recruteur vérifie manuellement.
  const [exigencesImperatives, setExigencesImperatives] = useState([]);
  const [draftExigenceLabel, setDraftExigenceLabel] = useState("");
  const [draftExigenceDescription, setDraftExigenceDescription] = useState("");
  const [draftExigenceJustificatif, setDraftExigenceJustificatif] = useState(false);
  const [draftExigenceCategorie, setDraftExigenceCategorie] = useState(CATEGORIE_EXIGENCE_PAR_DEFAUT);

  const ajouterExigence = () => {
    const label = draftExigenceLabel.trim();
    if (!label) return;
    if (exigencesImperatives.some((e) => e.label.toLowerCase() === label.toLowerCase())) {
      notifier.erreur("Exigence déjà ajoutée");
      return;
    }
    setExigencesImperatives((prev) => [...prev, {
      label, description: draftExigenceDescription.trim(), justificatif_requis: draftExigenceJustificatif,
      categorie: draftExigenceCategorie,
    }]);
    setDraftExigenceLabel("");
    setDraftExigenceDescription("");
    setDraftExigenceJustificatif(false);
    setDraftExigenceCategorie(CATEGORIE_EXIGENCE_PAR_DEFAUT);
  };

  const retirerExigence = (label) => {
    setExigencesImperatives((prev) => prev.filter((e) => e.label !== label));
  };

  useEffect(() => {
    jobsService.getNomenclatureFormation().then(setNomenclatureFormation).catch(() => {});
  }, []);

  useEffect(() => {
    if (!formData.metier) {
      setSuggestionsPourMetier({ competences: [], specialites: [], diplomes: [], avertissement: "" });
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

  const ajouterDiplomeSuggere = (d) =>
    setDiplomesRequis((prev) => (prev.some((x) => String(x.id) === String(d.id)) ? prev : [...prev, { id: d.id, libelle: d.libelle }]));

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

  const ajouterCompetenceRequise = async (label) => {
    const saisie = (label || "").trim();
    if (!saisie) return;
    // Point 10 : la compétence est rapprochée du référentiel commun au candidat (libellé ou
    // synonyme exact → libellé canonique). Hors référentiel, elle est signalée par un badge.
    const canonique = await rapprocherDuReferentiel(saisie);
    const trimmed = canonique || saisie;
    if (competencesRequises.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) {
      notifier.erreur("Compétence déjà ajoutée");
      return;
    }
    setCompetencesRequises((prev) => [
      ...prev,
      { label: trimmed, type_exigence: compType, niveau_requis: compNiveau || null, dans_referentiel: !!canonique },
    ]);
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
        notifier.echec("Chargement des listes impossible", error);
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
      notifier.erreur("Titre du poste manquant", "Saisissez au moins le titre du poste avant de générer.");
      return;
    }
    setIaLoading(true);
    const toastId = notifier.chargement("Génération du contenu par l'IA en cours");
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
      notifier.succes("Contenu généré", "Relisez-le et ajustez-le selon vos besoins.", { id: toastId });
    } catch (err) {
      notifier.echec("Service IA indisponible", err, { id: toastId });
      reportError("ECHEC_GENERER_OFFRE_IA", err);
      if (bloqueLaFonctionIA(err.response?.data)) {
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
      notifier.erreur("Formulaire incomplet", "Corrigez les champs signalés.");
      const firstKey = Object.keys(newErrors)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setLoading(true);
    const toastId = notifier.chargement("Publication en cours");
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
      notifier.succes("Offre soumise", "Elle sera visible après validation par notre équipe.", { id: toastId, duration: 5000 });
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (error) {
      reportError("ECHEC_PUBLICATION_OFFRE", error);
      notifier.echec("Publication impossible", error, { id: toastId, duration: 6000 });
      setLoading(false);
    }
  };

  const iaReady = isPremium && !!formData.titre;

  return {
    navigate, loading, iaLoading, isPremium, quotaGenerationOffre, questionnaires, setQuestionnaires,
    showCreateQuestionnaire, setShowCreateQuestionnaire, metierSuggestions, showSuggestions, setShowSuggestions,
    errors, setErrors, constants, formData, setFormData, questionsEntretien, modalPrefillQuestions, setModalPrefillQuestions,
    competencesRequises, compSuggestions, showCompSuggestions, setShowCompSuggestions, compType, setCompType, compNiveau, setCompNiveau,
    diplomesRequis, specialitesRequises, draftDiplomeId, setDraftDiplomeId, draftSpecialiteId, setDraftSpecialiteId,
    diplomesGroupes, specialitesGroupes, suggestionsPourMetier,
    exigencesImperatives, draftExigenceLabel, setDraftExigenceLabel, draftExigenceDescription, setDraftExigenceDescription,
    draftExigenceJustificatif, setDraftExigenceJustificatif, draftExigenceCategorie, setDraftExigenceCategorie,
    ajouterExigence, retirerExigence,
    ajouterDiplomeRequis, retirerDiplomeRequis, ajouterDiplomeSuggere, ajouterSpecialiteRequise, retirerSpecialiteRequise, ajouterSpecialiteSuggeree,
    handleCompInputChange, ajouterCompetenceRequise, retirerCompetenceRequise,
    handleTitreChange, handleChange, handleSelectChange, getCommunesOptions, handleGenererIA, handleSubmit, iaReady,
  };
}
