// Correction d'une offre « En attente » par l'admin (16/10/2026) : tous les champs de l'offre, seuls les
// champs réellement modifiés sont envoyés. Le serveur trace l'audit et prévient le recruteur par e-mail.
import React, { useEffect, useMemo, useState } from "react";
import { notifier } from "../../../utils/notifier";
import { jobsService } from "../../../Services/jobsService";
import MetierAutocomplete from "../../../Components/MetierAutocomplete";
import useEchapPourFermer from "../../../utils/useEchapPourFermer";
import { reportError } from "../../../utils/errorReporter";
import { nomWilaya } from "../../../utils/wilaya";
import { tw } from "../../../theme";

const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;
const CHAMPS = [
  "titre", "metier", "wilaya", "commune", "type_contrat", "experience_requise", "nombre_postes", "salaire_propose",
  "date_expiration", "description", "missions", "profil_recherche", "competences",
];

const valeurInitiale = (offre) =>
  Object.fromEntries(CHAMPS.map((champ) => [champ, offre[champ] ?? ""]));

const Champ = ({ id, label, children }) => (
  <div>
    <label htmlFor={id} className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>{label}</label>
    {children}
  </div>
);

const CorrectionOffreModal = ({ offre, onClose, onSaved }) => {
  const [valeurs, setValeurs] = useState(() => valeurInitiale(offre));
  const [metierLibelle, setMetierLibelle] = useState(offre.metier_libelle || "");
  const [constantes, setConstantes] = useState({ wilayas: [], experiences: [], contrats: [] });
  const [enCours, setEnCours] = useState(false);
  useEchapPourFermer(true, onClose);

  useEffect(() => {
    jobsService.getConstants().then(setConstantes).catch((err) => reportError("ECHEC_CHARGEMENT_CONSTANTES_CORRECTION", err));
  }, []);

  const modifies = useMemo(() => {
    const initial = valeurInitiale(offre);
    return CHAMPS.filter((champ) => String(valeurs[champ] ?? "") !== String(initial[champ] ?? ""));
  }, [valeurs, offre]);

  const changer = (champ) => (e) => setValeurs((v) => ({ ...v, [champ]: e.target.value }));

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!String(valeurs.titre).trim()) return notifier.erreur("Titre manquant", "Le titre ne peut pas être vide.");
    if (modifies.length === 0) return onClose();
    setEnCours(true);
    try {
      const donnees = Object.fromEntries(modifies.map((champ) => [champ, valeurs[champ] === "" ? null : valeurs[champ]]));
      if (donnees.titre) donnees.titre = String(donnees.titre).trim();
      await jobsService.corrigerOffre(offre.id, donnees);
      notifier.succes("Offre corrigée", "Le recruteur a été prévenu par e-mail.");
      onSaved();
    } catch (err) {
      notifier.echec("Correction impossible", err);
      reportError("ECHEC_CORRECTION_OFFRE", err);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Corriger l'offre" className={`${tw.surface} rounded-2xl p-7 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <h2 className={`text-lg font-bold ${tw.textStrong} mb-1`}>Corriger l'offre</h2>
        <p className={`text-xs ${tw.textMuted700} mb-5`}>
          Correction par l'administration, possible tant que l'offre est en attente de validation. Le recruteur reçoit
          la liste des changements par e-mail et l'action est tracée dans le journal d'audit.
        </p>
        <form onSubmit={enregistrer} className="space-y-4">
          <Champ id="corr-titre" label="Titre">
            <input id="corr-titre" type="text" required value={valeurs.titre} onChange={changer("titre")} className={inputClass} />
          </Champ>
          <Champ id="corr-metier" label="Métier de référence">
            <MetierAutocomplete
              value={metierLibelle}
              onSelect={(item) => {
                setMetierLibelle(item.appellation_libelle);
                setValeurs((v) => ({ ...v, metier: item.metier_id }));
              }}
            />
          </Champ>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Champ id="corr-wilaya" label="Wilaya">
              <select id="corr-wilaya" value={valeurs.wilaya} onChange={changer("wilaya")} className={inputClass}>
                {valeurs.wilaya && !constantes.wilayas.some((w) => w.value === valeurs.wilaya) && (
                  <option value={valeurs.wilaya}>{nomWilaya(valeurs.wilaya)}</option>
                )}
                {constantes.wilayas.map((w) => <option key={w.value} value={w.value}>{nomWilaya(w.value)}</option>)}
              </select>
            </Champ>
            <Champ id="corr-commune" label="Commune">
              <input id="corr-commune" type="text" value={valeurs.commune} onChange={changer("commune")} className={inputClass} />
            </Champ>
            <Champ id="corr-contrat" label="Type de contrat">
              <select id="corr-contrat" value={valeurs.type_contrat} onChange={changer("type_contrat")} className={inputClass}>
                {constantes.contrats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Champ>
            <Champ id="corr-experience" label="Expérience requise">
              <select id="corr-experience" value={valeurs.experience_requise} onChange={changer("experience_requise")} className={inputClass}>
                {constantes.experiences.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </Champ>
            <Champ id="corr-postes" label="Nombre de postes">
              <input id="corr-postes" type="number" min="1" value={valeurs.nombre_postes} onChange={changer("nombre_postes")} className={inputClass} />
            </Champ>
            <Champ id="corr-salaire" label="Salaire proposé">
              <input id="corr-salaire" type="number" min="0" value={valeurs.salaire_propose} onChange={changer("salaire_propose")} className={inputClass} />
            </Champ>
            <Champ id="corr-expiration" label="Date d'expiration">
              <input id="corr-expiration" type="date" value={valeurs.date_expiration} onChange={changer("date_expiration")} className={inputClass} />
            </Champ>
          </div>
          {[
            ["description", "Description", 6],
            ["missions", "Missions", 4],
            ["profil_recherche", "Profil recherché", 4],
            ["competences", "Compétences", 2],
          ].map(([champ, label, lignes]) => (
            <Champ key={champ} id={`corr-${champ}`} label={label}>
              <textarea id={`corr-${champ}`} rows={lignes} value={valeurs[champ]} onChange={changer(champ)} className={`${inputClass} resize-none`} />
            </Champ>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>
              Annuler
            </button>
            <button type="submit" disabled={enCours} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>
              {enCours ? "Enregistrement..." : modifies.length ? `Enregistrer (${modifies.length} changement${modifies.length > 1 ? "s" : ""})` : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CorrectionOffreModal;
