import { useSubmitLock } from "../../utils/useSubmitLock";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { notifier } from "../../utils/notifier";
import { Plus, Pencil, Trash2, X, Search, Tags, Check, Ban, PowerOff, RotateCcw, Link2 } from "lucide-react";
import MetiersCompetenceModal from "./MetiersCompetenceModal";
import FicheAdminModal from "../../Components/FicheAdminModal";
import { adminService } from "../../Services/adminService";
import DemandesAjoutPanel from "./demandes/DemandesAjoutPanel";
import BadgeIssueDeDemande from "./demandes/BadgeIssueDeDemande";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import AdminPagination from "../../Components/AdminPagination";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const ITEM_VIDE = { label: "", synonymes: "" };

// Cycle de vie d'une compétence du référentiel (point 11) :
// Suggérée -> Validée | Rejetée ; Validée <-> Désactivée ; Rejetée -> Validée (réexamen).
// Seule une compétence « Validée » est officielle (autocomplete, parser CV, IA, matching).
const STATUTS = {
  SUGGEREE: { libelle: "Suggérée", classe: "bg-amber-50 text-amber-700" },
  VALIDEE: { libelle: "Validée", classe: `${tw.bgSuccessSoft} ${tw.textSuccess}` },
  REJETEE: { libelle: "Rejetée", classe: tw.badgeErrorLight },
  DESACTIVEE: { libelle: "Désactivée", classe: "bg-slate-100 text-slate-600" },
};
// La liste ne montre que les compétences officielles : les suggestions et les rejets sont des demandes d'ajout.
const ONGLETS = [
  { code: "", libelle: "Toutes" },
  { code: "VALIDEE", libelle: "Actives" },
  { code: "DESACTIVEE", libelle: "Masquées" },
];
const TRANSITIONS = {
  SUGGEREE: ["VALIDEE", "REJETEE"],
  VALIDEE: ["DESACTIVEE"],
  DESACTIVEE: ["VALIDEE"],
  REJETEE: ["VALIDEE"],
};
const ORIGINES = { PROPOSITION_AUTO: "Proposition automatique", IMPORT: "Import du référentiel", ADMIN: "Ajoutée par l'admin" };

const statutDe = (item) => item.statut || (item.actif ? "VALIDEE" : "DESACTIVEE");

// Libellé et icône de l'action menant à `cible` depuis le statut actuel.
const actionVers = (courant, cible) => {
  if (cible === "VALIDEE") {
    if (courant === "SUGGEREE") return { libelle: "Valider", Icone: Check, classe: "hover:text-emerald-700 hover:bg-emerald-50" };
    if (courant === "REJETEE") return { libelle: "Valider (réexamen)", Icone: Check, classe: "hover:text-emerald-700 hover:bg-emerald-50" };
    return { libelle: "Réactiver", Icone: RotateCcw, classe: "hover:text-emerald-700 hover:bg-emerald-50" };
  }
  if (cible === "REJETEE") return { libelle: "Rejeter", Icone: Ban, classe: "hover:text-red-600 hover:bg-red-50" };
  return { libelle: "Désactiver", Icone: PowerOff, classe: "hover:text-slate-800 hover:bg-slate-100" };
};

const AdminCompetences = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFiltre, setStatutFiltre] = useState("");
  const [compteurs, setCompteurs] = useState({});
  const [origine, setOrigine] = useState(""); // "demande" = seulement les compétences issues d'une demande acceptée
  const [nbIssuesDeDemandes, setNbIssuesDeDemandes] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(ITEM_VIDE);
  const [onglet, setOnglet] = useState("liste");
  const [nbDemandes, setNbDemandes] = useState(0);
  const [competenceMetiers, setCompetenceMetiers] = useState(null); // compétence dont on gère les métiers
  const [competenceDetail, setCompetenceDetail] = useState(null); // compétence dont on affiche la fiche (clic sur la ligne)
  // Minuteur de recherche local au composant (avant : variable globale window._competenceSearchTimer).
  const searchTimer = useRef(null);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchItems = async (s = "", p = 1, statut = statutFiltre, org = origine) => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminCompetences(s, p, statut, org);
      setNbIssuesDeDemandes(data.nb_issues_de_demandes || 0);
      setItems(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
      setCompteurs(data.compteurs || {});
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_COMPETENCES", err);
      notifier.echec("Chargement impossible", err);
    } finally {
      setLoading(false);
    }
  };

  // Total de la liste officielle (actives + masquées), indépendant du filtre en cours.
  const totalListe = Object.values(compteurs).reduce((somme, n) => somme + n, 0);

  const chargerNbDemandes = () =>
    adminService
      .getAdminStats()
      .then((data) => setNbDemandes(data.demandes_a_examiner?.COMPETENCE || 0))
      .catch((err) => reportError("ECHEC_GET_ADMIN_STATS_COMPETENCES", err));

  useEffect(() => {
    fetchItems();
    chargerNbDemandes();
    return () => clearTimeout(searchTimer.current);
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchItems(val, 1), 400);
  };

  const handlePage = (p) => {
    setPage(p);
    fetchItems(search, p);
  };

  const basculerOrigine = () => {
    const suivante = origine === "demande" ? "" : "demande";
    setOrigine(suivante);
    setPage(1);
    fetchItems(search, 1, statutFiltre, suivante);
  };

  const choisirOnglet = (code) => {
    setStatutFiltre(code);
    setPage(1);
    fetchItems(search, 1, code);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(ITEM_VIDE);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({ label: item.label, synonymes: item.synonymes || "" });
    setShowModal(true);
  };

  const fermerModal = useCallback(() => setShowModal(false), []);
  useEchapPourFermer(showModal, fermerModal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) return notifier.erreur("Libellé manquant", "Le libellé est obligatoire.");
    try {
      if (editingId) {
        await jobsService.updateCompetence(editingId, form);
        notifier.succes("Compétence mise à jour");
      } else {
        await jobsService.createCompetence(form);
        notifier.succes("Compétence ajoutée");
      }
      setShowModal(false);
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_SAVE_COMPETENCE", err);
      notifier.echec("Enregistrement impossible", err);
    }
  };

  const changerStatut = async (item, cible) => {
    const { libelle } = actionVers(statutDe(item), cible);
    try {
      const maj = await jobsService.changerStatutCompetence(item.id, cible);
      notifier.succes(
        cible === "VALIDEE" && maj?.liens_crees ? "Compétence officielle" : "Statut modifié",
        cible === "VALIDEE" && maj?.liens_crees
          ? `« ${item.label} » est maintenant officielle — ${maj.liens_crees} saisie(s) existante(s) rattachée(s).`
          : `« ${item.label} » : ${libelle.toLowerCase()} effectué.`,
      );
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_STATUT_COMPETENCE", err);
      notifier.echec("Changement de statut impossible", err);
    }
  };

  const handleDelete = (id) => {
    // CASCADE côté modèle : supprimer une compétence retire aussi ses liens avec les métiers du
    // référentiel (suggestions "compétences pour ce métier" des recruteurs).
    confirmToast(
      "Supprimer cette compétence ? Ses liens avec les métiers du référentiel seront aussi supprimés. Pour seulement la retirer des suggestions, utilisez plutôt « Désactiver » (ou « Rejeter » pour une proposition).",
      async () => {
        try {
          await jobsService.deleteCompetence(id);
          setItems((prev) => prev.filter((i) => i.id !== id));
          setTotalCount((c) => Math.max(0, c - 1));
          notifier.succes("Compétence supprimée");
        } catch (err) {
          reportError("ECHEC_DELETE_COMPETENCE", err);
          notifier.echec("Suppression impossible", err);
        }
      },
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Tags}
        color="violet"
        title="Référentiel compétences"
        subtitle="Compétences officielles proposées aux candidats et recruteurs, et demandes d'ajout en attente de décision."
        aideKey="competences"
        aide={[
          "Liste : les compétences officielles. « Masquée » retire la compétence des suggestions sans rien supprimer ni casser les scores existants ; c'est l'option à privilégier plutôt que la suppression.",
          "Demandes : une compétence saisie hors référentiel (profil, « Mes compétences », offre) arrive ici automatiquement, dès la première saisie. Elle n'a aucun effet (ni suggestions, ni parser de CV, ni score) tant que vous n'avez pas décidé.",
          "Accepter ajoute la compétence au référentiel ; Rattacher en fait un synonyme d'une compétence existante ; Refuser exige un motif et la compétence n'est plus re-proposée. Dans tous les cas, les saisies existantes sont rattachées si besoin.",
          "Synonymes : une compétence extraite d'un CV sous l'un de ces intitulés (ex. « Project Management ») est automatiquement ramenée au libellé principal.",
        ]}
        actions={
          onglet === "liste" ? (
            <button
              onClick={handleOpenCreate}
              className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}
            >
              <Plus size={16} /> Ajouter une compétence
            </button>
          ) : null
        }
      />

      <div className="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Sections des compétences">
        {[{ cle: "liste", libelle: "Liste" }, { cle: "demandes", libelle: "Demandes" }].map((o) => (
          <button
            key={o.cle}
            type="button"
            role="tab"
            aria-selected={onglet === o.cle}
            onClick={() => setOnglet(o.cle)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              onglet === o.cle ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.libelle}
            {o.cle === "liste" && totalListe > 0 && <span className="ml-1.5 opacity-70 font-medium">({totalListe})</span>}
            {o.cle === "demandes" && nbDemandes > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {nbDemandes}
              </span>
            )}
          </button>
        ))}
      </div>

      {onglet === "demandes" ? (
        <DemandesAjoutPanel type="COMPETENCE" onChange={() => { chargerNbDemandes(); fetchItems(search, page); }} />
      ) : (
      <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par statut">
        {ONGLETS.map((onglet) => {
          const actif = statutFiltre === onglet.code;
          const nombre = onglet.code ? compteurs[onglet.code] : totalListe;
          return (
            <button
              key={onglet.code || "toutes"}
              role="tab"
              aria-selected={actif}
              onClick={() => choisirOnglet(onglet.code)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${tw.focusRing} ${actif ? `${tw.bgPrimarySolidHover} text-white` : `${tw.surfaceSubtle} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong}`}`}
            >
              {onglet.libelle}
              {nombre !== undefined && <span className="ml-1.5 opacity-80">({nombre})</span>}
            </button>
          );
        })}
        <button
          role="tab"
          aria-selected={origine === "demande"}
          onClick={basculerOrigine}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${tw.focusRing} ${origine === "demande" ? `${tw.bgPrimarySolidHover} text-white` : `${tw.surfaceSubtle} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong}`}`}
        >
          Issues d'une demande <span className="ml-1.5 opacity-80">({nbIssuesDeDemandes})</span>
        </button>
      </div>

      <div className="relative">
        <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
        <input
          type="text"
          placeholder="Rechercher une compétence..."
          value={search}
          onChange={handleSearch}
          aria-label="Rechercher une compétence"
          className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsWhite} rounded-xl text-sm`}
        />
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-190">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Compétence</th>
                <th className="px-5 py-3">Synonymes</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Métiers</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={6} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <AdminVide icon={Tags} titre="Aucune compétence trouvée." texte={search ? "Essayez un autre mot-clé." : undefined} />
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const statut = statutDe(item);
                  const transitions = item.transitions_possibles || TRANSITIONS[statut] || [];
                  return (
                    <tr
                      key={item.id}
                      className={`${tw.rowHover} cursor-pointer`}
                      tabIndex={0}
                      onClick={() => setCompetenceDetail(item)}
                      onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && setCompetenceDetail(item)}
                    >
                      <td className="px-5 py-3">
                        <p className={`text-sm font-medium ${tw.textStrong}`}>
                          {item.label} {item.issue_de_demande && <BadgeIssueDeDemande />}
                        </p>
                        {item.origine && item.origine !== "ADMIN" && (
                          <p className={`text-[11px] ${tw.textMuted}`}>{ORIGINES[item.origine] || item.origine}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <p className={`text-xs ${tw.textMuted} max-w-xs truncate`} title={item.synonymes || ""}>
                          {item.synonymes || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className={`text-xs ${tw.textMuted}`}>
                          {item.nb_candidats !== undefined ? `${item.nb_candidats} candidat(s) · ${item.nb_offres} offre(s)` : "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        {item.nb_metiers === 0 ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700" title="Cette compétence n'est suggérée à aucun métier">Aucun métier</span>
                        ) : (
                          <p className={`text-xs ${tw.textMuted}`}>{item.nb_metiers !== undefined ? `${item.nb_metiers} métier(s)` : "—"}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${STATUTS[statut].classe}`}>
                          {STATUTS[statut].libelle}
                        </span>
                      </td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {transitions.map((cible) => {
                            const { libelle, Icone, classe } = actionVers(statut, cible);
                            return (
                              <button
                                key={cible}
                                onClick={() => changerStatut(item, cible)}
                                aria-label={`${libelle} ${item.label}`}
                                title={libelle}
                                className={`p-2 ${tw.textMuted} ${classe} rounded-lg transition-colors ${tw.focusRing}`}
                              >
                                <Icone size={14} />
                              </button>
                            );
                          })}
                          <button onClick={() => setCompetenceMetiers(item)} aria-label={`Métiers de ${item.label}`} title="Métiers auxquels la compétence est suggérée" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Link2 size={14} /></button>
                          <button onClick={() => handleOpenEdit(item)} aria-label={`Modifier ${item.label}`} title="Modifier" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(item.id)} aria-label={`Supprimer ${item.label}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} onChange={handlePage} disabled={loading} />
      </div>

      </>
      )}

      {competenceDetail && (
        <FicheAdminModal
          titre={competenceDetail.label}
          badge={STATUTS[statutDe(competenceDetail)]}
          lignes={[
            { libelle: "Origine", valeur: ORIGINES[competenceDetail.origine] || competenceDetail.origine },
            { libelle: "Synonymes / traductions", valeur: competenceDetail.synonymes },
            { libelle: "Usage", valeur: competenceDetail.nb_candidats !== undefined ? `${competenceDetail.nb_candidats} candidat(s) · ${competenceDetail.nb_offres} offre(s)` : null },
            { libelle: "Métiers auxquels elle est suggérée", valeur: competenceDetail.nb_metiers === 0 ? "Aucun métier" : competenceDetail.nb_metiers !== undefined ? `${competenceDetail.nb_metiers} métier(s)` : null },
          ]}
          actions={[
            { libelle: "Métiers", Icone: Link2, onClick: () => { const c = competenceDetail; setCompetenceDetail(null); setCompetenceMetiers(c); } },
            { libelle: "Modifier", Icone: Pencil, primaire: true, onClick: () => { const c = competenceDetail; setCompetenceDetail(null); handleOpenEdit(c); } },
          ]}
          onClose={() => setCompetenceDetail(null)}
        />
      )}

      {competenceMetiers && (
        <MetiersCompetenceModal
          competence={competenceMetiers}
          onClose={() => setCompetenceMetiers(null)}
          onChange={(nb) => setItems((liste) => liste.map((c) => (c.id === competenceMetiers.id ? { ...c, nb_metiers: nb } : c)))}
        />
      )}

      {showModal && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerModal()}>
          <div role="dialog" aria-modal="true" aria-label={editingId ? "Modifier la compétence" : "Ajouter une compétence"} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier la compétence" : "Ajouter une compétence"}</h3>
              <button onClick={fermerModal} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Libellé *</label>
                <input required className={inputClass} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Synonymes / traductions</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.synonymes}
                  onChange={(e) => setForm({ ...form, synonymes: e.target.value })}
                />
                <p className={`text-[11px] ${tw.textMuted} mt-1`}>
                  Séparés par des virgules. Une compétence extraite d'un CV portant l'un de ces intitulés (ou très proche) sera automatiquement remplacée par "{form.label || "ce libellé"}".
                </p>
              </div>
              {!editingId && (
                <p className={`text-[11px] ${tw.textMuted}`}>
                  Une compétence ajoutée ici est officielle d'emblée (statut « Validée »). Le statut d'une compétence existante se change avec les boutons de la liste.
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fermerModal} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" disabled={submitBusy} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>{editingId ? "Mettre à jour" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCompetences;
