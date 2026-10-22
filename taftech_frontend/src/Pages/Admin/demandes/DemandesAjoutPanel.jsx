// Onglet « Demandes » d'une page du référentiel (types de diplôme, spécialités) : même tableau, mêmes
// pastilles de statut et même fenêtre de décision partout (spécification du 16/10/2026).
import React, { useCallback, useEffect, useState } from "react";
import { notifier } from "../../../utils/notifier";
import { Ban, Check, Inbox, Link2, Search } from "lucide-react";
import { adminService } from "../../../Services/adminService";
import { tw } from "../../../theme";
import AdminPagination from "../../../Components/AdminPagination";
import SkeletonTableRows from "../../../Components/SkeletonTableRows";
import { AdminVide } from "../../../Components/AdminEtat";
import BoutonExportExcel from "../../../Components/BoutonExportExcel";
import DecisionDemandeModal from "./DecisionDemandeModal";
import {
  ORIGINES_DEMANDE, PASTILLES_DEMANDE, STATUTS_DEMANDE, TYPES_DEMANDE, formatDateDemande,
} from "./demandesAjoutUi";

const DELAI_RECHERCHE_MS = 400;

const DemandesAjoutPanel = ({ type, onChange }) => {
  const [items, setItems] = useState([]);
  const [compteurs, setCompteurs] = useState({});
  const [statutFiltre, setStatutFiltre] = useState("A_EXAMINER");
  const [recherche, setRecherche] = useState("");
  const [rechercheEffective, setRechercheEffective] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState(null);

  const vocabulaire = TYPES_DEMANDE[type] || TYPES_DEMANDE.DIPLOME;

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getDemandesAjout({ type, statut: statutFiltre, search: rechercheEffective, page });
      setItems(data.results || []);
      setCompteurs(data.compteurs || {});
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
    } catch (err) {
      notifier.echec("Chargement impossible", err);
    } finally {
      setLoading(false);
    }
  }, [type, statutFiltre, rechercheEffective, page]);

  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRechercheEffective(recherche.trim());
      setPage(1);
    }, DELAI_RECHERCHE_MS);
    return () => clearTimeout(minuteur);
  }, [recherche]);

  useEffect(() => {
    charger();
  }, [charger]);

  const choisirPastille = (code) => {
    setStatutFiltre(code);
    setPage(1);
  };

  const apresDecision = () => {
    charger();
    onChange?.();
  };

  const peutDecider = (item, transition) => item.transitions_possibles?.includes(transition);
  const bouton = (classe) => `p-2 ${classe} rounded-lg transition-colors ${tw.focusRing}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrer par statut">
        {PASTILLES_DEMANDE.map((pastille) => {
          const actif = statutFiltre === pastille.code;
          return (
            <button
              key={pastille.code || "toutes"}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => choisirPastille(pastille.code)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${tw.focusRing} ${actif ? `${tw.bgPrimarySolidHover} text-white` : `${tw.surfaceSubtle} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong}`}`}
            >
              {pastille.libelle}
              <span className="ml-1.5 opacity-80">({compteurs[pastille.compteur] ?? 0})</span>
            </button>
          );
        })}
        <div className="ml-auto">
          <BoutonExportExcel
            ressource="demandes-ajout"
            params={{ type, statut: statutFiltre, search: rechercheEffective }}
            nomFichier={`demandes_ajout_${String(type).toLowerCase()}_taftech`}
          />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          aria-label="Rechercher une demande"
          placeholder={`Rechercher une demande de ${vocabulaire.singulier}...`}
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-190">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Demande</th>
                <th className="px-5 py-3">Demandée par</th>
                <th className="px-5 py-3">Utilisée par</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={5} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <AdminVide icon={Inbox} titre={vocabulaire.vide} />
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3">
                      <p className={`text-sm font-medium ${tw.textStrong}`}>{item.libelle}</p>
                      {item.contexte && <p className={`text-xs ${tw.textMuted} max-w-sm`}>{item.contexte}</p>}
                      {item.entree_libelle && (
                        <p className={`text-[11px] ${tw.textMuted}`}>
                          {item.statut === "RATTACHEE" ? "Rattachée à" : "Ajoutée"} : {item.entree_libelle}
                        </p>
                      )}
                      {item.statut === "REFUSEE" && item.motif_refus && (
                        <p className={`text-[11px] ${tw.textErrorMuted}`}>Motif : {item.motif_refus}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className={`text-xs ${tw.textMuted700}`}>
                        {ORIGINES_DEMANDE[item.origine] || item.origine} · {item.nb_demandeurs} demandeur(s)
                      </p>
                      <p className={`text-[11px] ${tw.textMuted}`}>
                        {item.demandeurs_apercu?.[0]?.nom || "compte supprimé"}
                        {item.nb_demandeurs > 1 ? ` et ${item.nb_demandeurs - 1} autre(s)` : ""} · {formatDateDemande(item.date_creation)}
                      </p>
                    </td>
                    <td className={`px-5 py-3 text-xs ${tw.textMuted700}`}>{item.nb_formations} formation(s)</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${STATUTS_DEMANDE[item.statut]?.classe || ""}`}>
                        {STATUTS_DEMANDE[item.statut]?.libelle || item.statut}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {peutDecider(item, "ACCEPTEE") && (
                          <button type="button" onClick={() => setDecision({ demande: item, mode: "ACCEPTER" })} aria-label={`Accepter ${item.libelle}`} title="Accepter" className={bouton(tw.iconButtonHoverPrimary)}>
                            <Check size={14} />
                          </button>
                        )}
                        {peutDecider(item, "RATTACHEE") && (
                          <button type="button" onClick={() => setDecision({ demande: item, mode: "RATTACHER" })} aria-label={`Rattacher ${item.libelle}`} title="Rattacher à une entrée existante" className={bouton(tw.iconButtonHoverPrimary)}>
                            <Link2 size={14} />
                          </button>
                        )}
                        {peutDecider(item, "REFUSEE") && (
                          <button type="button" onClick={() => setDecision({ demande: item, mode: "REFUSER" })} aria-label={`Refuser ${item.libelle}`} title="Refuser" className={bouton(tw.iconButtonHoverDanger)}>
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} onChange={setPage} disabled={loading} />
      </div>

      {decision && (
        <DecisionDemandeModal
          demande={decision.demande}
          modeInitial={decision.mode}
          onClose={() => setDecision(null)}
          onDecidee={apresDecision}
        />
      )}
    </div>
  );
};

export default DemandesAjoutPanel;
