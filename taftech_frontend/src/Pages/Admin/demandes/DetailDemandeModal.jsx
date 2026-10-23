// Fenêtre de détail d'une demande d'ajout au référentiel (clic sur une ligne du tableau) : date, demandeurs
// avec leur date d'arrivée, décision. Commune aux quatre types (compétence, métier, type de diplôme, spécialité).
import React from "react";
import { X } from "lucide-react";
import { tw } from "../../../theme";
import useEchapPourFermer from "../../../utils/useEchapPourFermer";
import { ORIGINES_DEMANDE, STATUTS_DEMANDE, TYPES_DEMANDE, formatDateDemande } from "./demandesAjoutUi";

const ROLES = { CANDIDAT: "Candidat", RECRUTEUR: "Recruteur" };

const Ligne = ({ libelle, children }) => (
  <div className="flex justify-between gap-4 py-2 text-sm">
    <dt className={tw.textMuted}>{libelle}</dt>
    <dd className={`text-right ${tw.textStrong}`}>{children}</dd>
  </div>
);

const DetailDemandeModal = ({ demande, onClose }) => {
  useEchapPourFermer(true, onClose);
  const statut = STATUTS_DEMANDE[demande.statut];
  const vocabulaire = TYPES_DEMANDE[demande.type];
  const demandeurs = demande.demandeurs_apercu || [];
  const decidee = demande.statut !== "A_EXAMINER";

  return (
    <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Détail de la demande" className={`${tw.surface} rounded-2xl p-7 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-start gap-3 mb-1">
          <h3 className={`text-base font-bold ${tw.textStrong}`}>« {demande.libelle} »</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}><X size={18} /></button>
        </div>
        <span className={`inline-block px-2.5 py-1 text-[10px] font-semibold rounded-full mb-3 ${statut?.classe || ""}`}>
          {statut?.libelle || demande.statut}
        </span>
        {demande.contexte && <p className={`text-xs ${tw.textMuted} mb-3`}>{demande.contexte}</p>}

        <dl className={`divide-y ${tw.divideBase}`}>
          <Ligne libelle="Type">{vocabulaire?.singulier || demande.type_libelle}</Ligne>
          <Ligne libelle="Origine">{ORIGINES_DEMANDE[demande.origine] || demande.origine}</Ligne>
          <Ligne libelle="Demandée le">{formatDateDemande(demande.date_creation)}</Ligne>
          {decidee && <Ligne libelle="Décision le">{formatDateDemande(demande.date_decision) || "—"}</Ligne>}
          {decidee && demande.traite_par_email && <Ligne libelle="Traitée par">{demande.traite_par_email}</Ligne>}
          {demande.entree_libelle && (
            <Ligne libelle={demande.statut === "RATTACHEE" ? "Rattachée à" : "Ajoutée"}>{demande.entree_libelle}</Ligne>
          )}
          {demande.statut === "REFUSEE" && demande.motif_refus && <Ligne libelle="Motif du refus">{demande.motif_refus}</Ligne>}
          <Ligne libelle="Utilisée par">{demande.nb_formations} formation(s)</Ligne>
        </dl>

        <h4 className={`text-xs font-semibold uppercase tracking-wider ${tw.textMuted} mt-5 mb-2`}>
          Demandeurs ({demande.nb_demandeurs})
        </h4>
        {demandeurs.length === 0 ? (
          <p className={`text-xs ${tw.textMuted}`}>Compte supprimé.</p>
        ) : (
          <ul className={`divide-y ${tw.divideBase}`}>
            {demandeurs.map((d) => (
              <li key={d.email} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${tw.textStrong}`}>{d.nom}</p>
                  <p className={`text-[11px] truncate ${tw.textMuted}`}>{ROLES[d.role] || d.role} · {d.email}</p>
                </div>
                <span className={`shrink-0 text-xs ${tw.textMuted700}`}>{formatDateDemande(d.date) || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DetailDemandeModal;
