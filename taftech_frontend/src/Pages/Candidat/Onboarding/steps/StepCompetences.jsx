import React, { useEffect, useRef, useState } from "react";
import { Trash2, Plus, Pencil, Check, CheckCircle2, AlertCircle } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";
import { jobsService } from "../../../../Services/jobsService";
import CompetencesSuggerees from "../../../../Components/CompetencesSuggerees";
import { useCompetencesSuggerees } from "../../../../utils/useCompetencesSuggerees";

const NIVEAUX = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
  { value: "CONFIRME", label: "Confirmé" },
];

// Cherche `label` dans le référentiel TAFTECH : renvoie son libellé canonique (casse du
// référentiel) ou null si absent — jamais un rapprochement approximatif côté client.
const trouverDansReferentiel = async (label) => {
  const resultats = await jobsService.searchCompetences(label);
  const trouve = (Array.isArray(resultats) ? resultats : []).find(
    (r) => r.label && r.label.trim().toLowerCase() === label.trim().toLowerCase(),
  );
  return trouve ? trouve.label : null;
};

export const StepCompetences = ({ pendingCompetences, setPendingCompetences, competencesMode, setCompetencesMode, saveCompetencesStep, skipStep, profil, saving, metierIds = [] }) => {
  const [nouvelleCompetence, setNouvelleCompetence] = useState("");
  const [nouveauNiveau, setNouveauNiveau] = useState("DEBUTANT");
  const [suggestions, setSuggestions] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [editValeur, setEditValeur] = useState("");
  const minuteur = useRef(null);
  const suggestionsMetier = useCompetencesSuggerees(metierIds, pendingCompetences);

  // Proposée par le référentiel pour le métier : jamais ajoutée d'office, niveau Débutant à corriger.
  const ajouterSuggestion = (label) => setPendingCompetences((list) => [
    ...list.filter((c) => c.label.toLowerCase() !== label.toLowerCase()),
    { label, niveau: "DEBUTANT", dans_referentiel: true, intitule_cv: null, origine: "SUGGESTION" },
  ]);

  // Suggestions du référentiel pendant la saisie d'une nouvelle compétence.
  useEffect(() => {
    clearTimeout(minuteur.current);
    const terme = nouvelleCompetence.trim();
    if (terme.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    minuteur.current = setTimeout(async () => {
      const res = await jobsService.searchCompetences(terme);
      setSuggestions(Array.isArray(res) ? res.slice(0, 6) : []);
    }, 300);
    return () => clearTimeout(minuteur.current);
  }, [nouvelleCompetence]);

  const ajouter = async (saisie) => {
    const brut = (saisie ?? nouvelleCompetence).trim();
    if (!brut) return;
    const canonique = await trouverDansReferentiel(brut);
    const label = canonique || brut;
    setPendingCompetences((list) => [
      ...list.filter((c) => c.label.toLowerCase() !== label.toLowerCase()),
      { label, niveau: nouveauNiveau, dans_referentiel: !!canonique, intitule_cv: null },
    ]);
    setNouvelleCompetence("");
    setSuggestions([]);
  };

  const removeAt = (idx) => setPendingCompetences((list) => list.filter((_, i) => i !== idx));
  const updateNiveau = (idx, niveau) => setPendingCompetences((list) => list.map((c, i) => (i === idx ? { ...c, niveau } : c)));

  const commencerEdition = (idx) => {
    setEditIdx(idx);
    setEditValeur(pendingCompetences[idx].label);
  };

  const validerEdition = async () => {
    const brut = editValeur.trim();
    const idx = editIdx;
    setEditIdx(null);
    if (!brut) return removeAt(idx);
    const canonique = await trouverDansReferentiel(brut);
    const label = canonique || brut;
    setPendingCompetences((list) => list.map((c, i) => (i === idx ? { ...c, label, dans_referentiel: !!canonique } : c)));
  };

  const nbAVerifier = pendingCompetences.filter((c) => !c.dans_referentiel).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className={tw.pageTitlePetit}>Compétences</h3>
        {(profil?.competences_detail?.length > 0) && <WizardCategoryToggle mode={competencesMode} onChange={setCompetencesMode} />}
      </div>
      {pendingCompetences.length > 0 && (
        <p className={`text-xs ${tw.textMuted} mb-4`}>
          Vérifiez les compétences détectées : modifiez-les, supprimez celles qui ne vous correspondent pas
          {nbAVerifier > 0 ? `. ${nbAVerifier} ne figure${nbAVerifier > 1 ? "nt" : ""} pas dans le référentiel TAFTECH (en attente de validation).` : "."}
        </p>
      )}
      <div className="flex flex-col gap-2 mb-4">
        {pendingCompetences.map((c, idx) => (
          <div key={idx} className={`flex flex-wrap items-center gap-2 ${tw.badgeNeutral} px-3 py-2`}>
            {editIdx === idx ? (
              <input
                autoFocus
                value={editValeur}
                onChange={(e) => setEditValeur(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") validerEdition(); }}
                aria-label={`Modifier ${c.label}`}
                className={`${tw.authInput} flex-1 min-w-0`}
              />
            ) : (
              <span className="font-medium flex-1 min-w-0 wrap-break-word">
                {c.label}
                {c.intitule_cv && (
                  <span className={`block text-[11px] font-normal ${tw.textMuted}`}>Rapproché de « {c.intitule_cv} » (votre CV)</span>
                )}
              </span>
            )}
            {c.dans_referentiel ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700" title="Reconnue dans le référentiel TAFTECH">
                <CheckCircle2 size={12} /> Référentiel
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700" title="Absente du référentiel TAFTECH : vérifiez l'intitulé">
                <AlertCircle size={12} /> En attente de validation
              </span>
            )}
            <select
              value={c.niveau}
              onChange={(e) => updateNiveau(idx, e.target.value)}
              aria-label={`Niveau de ${c.label}`}
              className="bg-transparent text-[11px] font-semibold border-l pl-1.5 cursor-pointer focus:outline-none"
            >
              {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            {editIdx === idx ? (
              <button type="button" onClick={validerEdition} aria-label={`Valider ${c.label}`}><Check size={14} /></button>
            ) : (
              <button type="button" onClick={() => commencerEdition(idx)} aria-label={`Modifier ${c.label}`}><Pencil size={13} /></button>
            )}
            <button type="button" onClick={() => removeAt(idx)} aria-label={`Supprimer ${c.label}`}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      {suggestionsMetier.length > 0 && (
        <div className="mb-4">
          <CompetencesSuggerees suggestions={suggestionsMetier} onAjouter={ajouterSuggestion} />
        </div>
      )}
      <div className="relative mb-6">
        <div className="flex gap-2">
          <input
            value={nouvelleCompetence}
            onChange={(e) => setNouvelleCompetence(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouter(); } }}
            aria-label="Ajouter une compétence"
            className={`${tw.authInput} flex-1 min-w-0`}
          />
          <div className="w-40 shrink-0">
            <select value={nouveauNiveau} onChange={(e) => setNouveauNiveau(e.target.value)} className={tw.authInput}>
              {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => ajouter()} className={`${tw.buttonSecondary} px-3`} aria-label="Ajouter la compétence">
            <Plus size={16} />
          </button>
        </div>
        {suggestions.length > 0 && (
          <ul className={`${tw.autocompleteDropdown} mt-1`}>
            {suggestions.map((s) => (
              <li key={s.id ?? s.label}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); ajouter(s.label); }} className={tw.autocompleteItem}>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} disabled={saving} className={`${tw.linkPrimary} text-sm font-semibold disabled:opacity-50`}>Passer cette étape</button>
        <button type="button" onClick={saveCompetencesStep} disabled={saving} className={`${tw.buttonPrimary} px-6 py-2.5 disabled:opacity-60`}>{saving ? "Enregistrement..." : "Continuer"}</button>
      </div>
    </div>
  );
};
