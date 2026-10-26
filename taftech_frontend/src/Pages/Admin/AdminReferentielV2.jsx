import React, { useEffect, useRef, useState } from "react";
import { adminService } from "../../Services/adminService";
import { reportError } from "../../utils/errorReporter";
import { notifier } from "../../utils/notifier";
import { Pencil, X, Search, Trash2, Plus } from "lucide-react";
import { tw } from "../../theme";
import { confirmToast } from "../../utils/confirmToast";
import { MetierAutocomplete } from "../../Components/MetierAutocomplete";
import { CheckCircle2 } from "lucide-react";
import ReactSelect from "react-select";
import AdminPageHeader from "../../Components/AdminPageHeader";
import AdminPagination from "../../Components/AdminPagination";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";
import { GraduationCap, Briefcase, BookOpen } from "lucide-react";
import DemandesAjoutPanel from "./demandes/DemandesAjoutPanel";
import BadgeIssueDeDemande from "./demandes/BadgeIssueDeDemande";

/**
 * Panel admin du référentiel v2 (métiers/spécialités/diplômes importés depuis les
 * classeurs client, ~11 000 lignes au total). Volontairement sans création ni
 * suppression — ce sont des identifiants stables réimportables (voir
 * jobs/views/referentiel_admin.py) ; l'admin ajuste seulement le libellé et
 * masque/réactive une entrée via `selectionnable` sans jamais casser une FK
 * déjà posée sur un profil/une offre réelle.
 */

const ONGLETS = [
  { key: "metiers", label: "Métiers", secondaryKey: "groupe_libelle", secondaryLabel: "Groupe" },
  { key: "specialites", label: "Spécialités", secondaryKey: "domaine_complet", secondaryLabel: "Domaine" },
  { key: "diplomes", label: "Types de diplôme", secondaryKey: "systeme", secondaryLabel: "Système" },
  { key: "relations", label: "Métiers similaires" },
  { key: "relations-specialites", label: "Spécialités similaires" },
  { key: "demandes-diplomes", label: "Demandes" },
  { key: "demandes-specialites", label: "Demandes" },
  { key: "demandes-metiers", label: "Demandes" },
];

// Quatre entrées de menu (15/10/2026) : Métiers, Formations, Spécialités, Compétences. Chaque groupe
// réunit ce qui se rapporte au même sujet (liste, similarités, propositions à traiter).
const GROUPES = {
  metiers: {
    onglets: ["metiers", "relations", "demandes-metiers"],
    icon: Briefcase,
    titre: "Métiers",
    sousTitre: "Métiers du référentiel, rapprochements entre métiers substituables et métiers proposés par les utilisateurs.",
    aideKey: "referentiel-metiers",
    aide: [
      "Métiers : cliquez sur le badge « Actif » pour masquer un métier des listes de choix. Les profils et offres qui l'utilisent déjà ne sont pas modifiés. Le crayon corrige un libellé ; le code reste identique (il sert aux réimports du classeur client).",
      "Métiers similaires : rapprochez manuellement deux métiers substituables classés à des endroits différents. Ils comptent alors 70 % de compatibilité dans le matching.",
      "Demandes : métiers proposés par les candidats et les recruteurs (« Je ne trouve pas mon métier »). Une demande n'a aucun effet tant que vous n'avez pas décidé : rattachez-la à un métier existant (elle devient une appellation), ajoutez-la comme nouveau métier dans un groupe, ou refusez avec un motif envoyé au demandeur.",
      "Toute fusion de doublons passe par la commande « consolider_referentiel », jamais par ce panel.",
    ],
  },
  formations: {
    onglets: ["diplomes", "demandes-diplomes"],
    icon: GraduationCap,
    titre: "Formations",
    sousTitre: "Types de diplôme du référentiel et demandes d'ajout de types de diplôme absents de la liste.",
    aideKey: "referentiel-formations",
    aide: [
      "Types de diplôme : cliquez sur le badge « Actif » pour masquer une entrée des listes de choix. Les profils et offres qui l'utilisent déjà ne sont pas modifiés. Le crayon corrige un libellé ; le code reste identique.",
      "Demandes : types de diplôme absents de la liste, signalés par les candidats (« Autre, préciser ») ou par les recruteurs. Rattachez la demande à un type existant (elle devient une autre écriture), ajoutez-la au référentiel, ou refusez avec un motif envoyé au demandeur. Les formations concernées sont mises à jour automatiquement.",
    ],
  },
  specialites: {
    onglets: ["specialites", "relations-specialites", "demandes-specialites"],
    icon: BookOpen,
    titre: "Spécialités",
    sousTitre: "Spécialités de formation du référentiel et rapprochements entre spécialités substituables.",
    aideKey: "referentiel-specialites",
    aide: [
      "Spécialités : cliquez sur le badge « Actif » pour masquer une entrée des listes de choix. Les profils et offres qui l'utilisent déjà ne sont pas modifiés. Le crayon corrige un libellé ; le code reste identique.",
      "Spécialités similaires : rapprochez manuellement deux spécialités substituables classées à des endroits différents. Elles comptent alors 70 % de compatibilité dans le matching.",
      "Demandes : spécialités absentes de la liste, signalées par les candidats (« Autre, préciser ») ou par les recruteurs. Rattachez la demande à une spécialité existante, ajoutez-la au référentiel (domaine obligatoire, diplômes concernés facultatifs), ou refusez avec un motif envoyé au demandeur.",
    ],
  },
};

const FETCHERS = {
  metiers: adminService.getAdminReferentielMetiers,
  specialites: adminService.getAdminReferentielSpecialites,
  diplomes: adminService.getAdminReferentielDiplomes,
};

// Type de demande d'ajout correspondant à chaque liste (clé de `referentiel_totaux` des statistiques).
const TYPE_PAR_ONGLET = { metiers: "METIER", specialites: "SPECIALITE", diplomes: "DIPLOME" };

const UPDATERS = {
  metiers: adminService.updateAdminReferentielMetier,
  specialites: adminService.updateAdminReferentielSpecialite,
  diplomes: adminService.updateAdminReferentielDiplome,
};

const AdminReferentielV2 = ({ groupe = "metiers", ongletInitial }) => {
  const def = GROUPES[groupe];
  const onglets = ONGLETS.filter((o) => def.onglets.includes(o.key));
  const [onglet, setOnglet] = useState(ongletInitial || def.onglets[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editing, setEditing] = useState(null);
  const [editLibelle, setEditLibelle] = useState("");
  const [demandesAExaminer, setDemandesAExaminer] = useState({});
  const [totaux, setTotaux] = useState({});
  const [origine, setOrigine] = useState(""); // "" = toutes les entrées, "demande" = issues d'une demande acceptée
  const [nbIssuesDeDemandes, setNbIssuesDeDemandes] = useState(0);

  const config = ONGLETS.find((o) => o.key === onglet);
  // Onglets qui affichent un badge « à traiter ».
  const nbATraiter = {
    "demandes-diplomes": demandesAExaminer.DIPLOME || 0,
    "demandes-specialites": demandesAExaminer.SPECIALITE || 0,
    "demandes-metiers": demandesAExaminer.METIER || 0,
  };

  const chargerCompteurs = () =>
    adminService
      .getAdminStats()
      .then((data) => {
        setDemandesAExaminer(data.demandes_a_examiner || {});
        setTotaux(data.referentiel_totaux || {});
      })
      .catch((err) => reportError("ECHEC_GET_ADMIN_STATS_REFERENTIEL_V2", err));

  useEffect(() => {
    chargerCompteurs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchItems = async (s = "", p = 1, tab = onglet, org = origine) => {
    setLoading(true);
    try {
      const data = await FETCHERS[tab](s, p, org);
      setItems(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
      setNbIssuesDeDemandes(data.nb_issues_de_demandes || 0);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_REFERENTIEL_V2", err);
      notifier.echec("Chargement impossible", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch("");
    setPage(1);
    setOrigine("");
    if (!["relations", "relations-specialites", "demandes-diplomes", "demandes-specialites", "demandes-metiers"].includes(onglet)) fetchItems("", 1, onglet, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet]);

  const choisirOrigine = (code) => {
    setOrigine(code);
    setPage(1);
    fetchItems(search, 1, onglet, code);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(window._referentielV2SearchTimer);
    window._referentielV2SearchTimer = setTimeout(() => fetchItems(val, 1), 400);
  };

  const handlePage = (p) => {
    setPage(p);
    fetchItems(search, p);
  };

  const handleToggleSelectionnable = async (item) => {
    try {
      await UPDATERS[onglet](item.id, { selectionnable: !item.selectionnable });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, selectionnable: !i.selectionnable } : i)));
      notifier.succes(item.selectionnable ? "Entrée masquée des listes de choix" : "Entrée de nouveau proposée", item.libelle);
    } catch (err) {
      reportError("ECHEC_TOGGLE_ADMIN_REFERENTIEL_V2", err);
      notifier.echec("Mise à jour impossible", err);
    }
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setEditLibelle(item.libelle);
  };

  const fermerEdition = React.useCallback(() => setEditing(null), []);
  useEchapPourFermer(!!editing, fermerEdition);

  const handleSaveLibelle = async (e) => {
    e.preventDefault();
    if (!editLibelle.trim()) {
      notifier.erreur("Libellé manquant", "Le libellé ne peut pas être vide.");
      return;
    }
    try {
      await UPDATERS[onglet](editing.id, { libelle: editLibelle.trim() });
      notifier.succes("Libellé mis à jour");
      setEditing(null);
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_UPDATE_LIBELLE_REFERENTIEL_V2", err);
      notifier.echec("Enregistrement impossible", err);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={def.icon}
        color="violet"
        title={def.titre}
        subtitle={def.sousTitre}
        aideKey={def.aideKey}
        aide={def.aide}
      />

      {onglets.length > 1 && (
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto" role="tablist" aria-label="Sections du référentiel">
        {onglets.map((o) => (
          <button
            key={o.key}
            role="tab"
            aria-selected={onglet === o.key}
            onClick={() => setOnglet(o.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              onglet === o.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
            {totaux[TYPE_PAR_ONGLET[o.key]] !== undefined && <span className="ml-1.5 opacity-70 font-medium">({totaux[TYPE_PAR_ONGLET[o.key]]})</span>}
            {nbATraiter[o.key] > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {nbATraiter[o.key]}
              </span>
            )}
          </button>
        ))}
      </div>
      )}

      {onglet === "relations" ? (
        <RelationsSimilairesPanel />
      ) : onglet === "relations-specialites" ? (
        <RelationsSpecialitesPanel />
      ) : onglet === "demandes-metiers" ? (
        <DemandesAjoutPanel type="METIER" onChange={chargerCompteurs} />
      ) : onglet === "demandes-diplomes" ? (
        <DemandesAjoutPanel type="DIPLOME" onChange={chargerCompteurs} />
      ) : onglet === "demandes-specialites" ? (
        <DemandesAjoutPanel type="SPECIALITE" onChange={chargerCompteurs} />
      ) : (
        <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par origine">
        {[{ code: "", libelle: "Toutes", nombre: totaux[TYPE_PAR_ONGLET[onglet]] }, { code: "demande", libelle: "Issues d'une demande", nombre: nbIssuesDeDemandes }].map((o) => (
          <button
            key={o.code || "toutes"}
            role="tab"
            aria-selected={origine === o.code}
            onClick={() => choisirOrigine(o.code)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${tw.focusRing} ${origine === o.code ? `${tw.bgPrimarySolidHover} text-white` : `${tw.surfaceSubtle} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong}`}`}
          >
            {o.libelle}
            {o.nombre !== undefined && <span className="ml-1.5 opacity-80">({o.nombre})</span>}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder={`Rechercher un(e) ${config.label.toLowerCase()}...`}
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Libellé</th>
                <th className="px-5 py-3">{config.secondaryLabel}</th>
                <th className="px-5 py-3 text-center">Actif / sélectionnable</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={4} />
              ) : items.length === 0 ? (
                <tr><td colSpan="4"><AdminVide icon={GraduationCap} titre="Aucun résultat." texte={search ? "Essayez un autre mot-clé (la recherche ignore les accents)." : undefined} /></td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={`${tw.rowHover} ${item.selectionnable ? "" : "opacity-60"}`}>
                    <td className="px-5 py-3">
                      <p className={`text-sm font-medium ${tw.textStrong}`}>{item.libelle}</p>
                      <p className="text-xs text-slate-500">
                        {item.code} {item.issue_de_demande && <BadgeIssueDeDemande />}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{item[config.secondaryKey] || "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleToggleSelectionnable(item)}
                        aria-label={item.selectionnable ? "Désactiver" : "Réactiver"}
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors ${
                          item.selectionnable ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight
                        }`}
                      >
                        {item.selectionnable ? "Actif" : "Masqué"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button aria-label={`Modifier ${item.libelle}`} onClick={() => handleOpenEdit(item)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}>
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} onChange={handlePage} disabled={loading} />
      </div>
        </>
      )}

      {editing && onglet !== "relations" && onglet !== "relations-specialites" && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerEdition()}>
          <div role="dialog" aria-modal="true" aria-label="Modifier le libellé" className={`${tw.surface} rounded-2xl p-7 max-w-md w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Modifier le libellé</h3>
              <button onClick={fermerEdition} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveLibelle} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Libellé</label>
                <input
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={editLibelle}
                  onChange={(e) => setEditLibelle(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">Code : {editing.code} (non modifiable)</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>
                  Annuler
                </button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Onglet "Métiers similaires" — panel dédié (pas la table générique métiers/spécialités/
 * diplômes ci-dessus) : rapproche manuellement deux métiers que le référentiel v2 classe dans
 * des branches secteur/domaine séparées (matcher.py::_relation_similaire, score 0.70). Jamais
 * les 49 relations importées du client (redirection_equivalente/plus_precis_que) — le backend
 * filtre déjà `relation='similaire'` uniquement.
 */
const RelationsSimilairesPanel = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [metierA, setMetierA] = useState(null);
  const [metierB, setMetierB] = useState(null);
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = async (s = "", p = 1) => {
    setLoading(true);
    try {
      const data = await adminService.getAdminRelationsSimilaires(s, p);
      setItems(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
    } catch (err) {
      reportError("ECHEC_GET_RELATIONS_SIMILAIRES", err);
      notifier.echec("Chargement impossible", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems("", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(window._relationsSimilairesSearchTimer);
    window._relationsSimilairesSearchTimer = setTimeout(() => fetchItems(val, 1), 400);
  };

  const handleCreer = async (e) => {
    e.preventDefault();
    if (!metierA || !metierB) {
      notifier.erreur("Sélection incomplète", "Sélectionnez les deux métiers à rapprocher.");
      return;
    }
    if (metierA.metier_id === metierB.metier_id) {
      notifier.erreur("Métiers identiques", "Les deux métiers doivent être différents.");
      return;
    }
    setSaving(true);
    try {
      await adminService.creerRelationSimilaire({
        metier_depart: metierA.metier_id,
        metier_arrivee: metierB.metier_id,
        justification,
      });
      notifier.succes("Relation créée", "Les deux métiers seront désormais comptés compatibles à 70 % dans le matching.");
      setMetierA(null);
      setMetierB(null);
      setJustification("");
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_CREER_RELATION_SIMILAIRE", err);
      notifier.echec("Création impossible", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = (item) => {
    confirmToast(
      `Supprimer le rapprochement entre "${item.metier_depart_libelle}" et "${item.metier_arrivee_libelle}" ?`,
      async () => {
        try {
          await adminService.supprimerRelationSimilaire(item.id);
          notifier.succes("Relation supprimée");
          fetchItems(search, page);
        } catch (err) {
          reportError("ECHEC_SUPPRIMER_RELATION_SIMILAIRE", err);
          notifier.echec("Suppression impossible", err);
        }
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className={`${tw.card} p-5`}>
        <p className={`text-sm font-semibold ${tw.textStrong} mb-1`}>Rapprocher deux métiers</p>
        <p className="text-xs text-slate-500 mb-4">
          Utile quand deux métiers substituables en pratique sont classés dans des secteurs/domaines
          différents du référentiel client (le matching ne détecte alors aucune compatibilité). Une
          fois créée, la relation compte pour 70% de compatibilité entre ces deux métiers précis.
        </p>
        <form onSubmit={handleCreer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Métier A</label>
            <MetierAutocomplete
              value={metierA?.metier_libelle || ""}
              onSelect={(item) => setMetierA(item)}
              placeholder="Rechercher un métier..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Métier B</label>
            <MetierAutocomplete
              value={metierB?.metier_libelle || ""}
              onSelect={(item) => setMetierB(item)}
              placeholder="Rechercher un métier..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Justification (optionnel)</label>
            <input
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60`}
            >
              <Plus size={15} /> {saving ? "Création..." : "Créer la relation"}
            </button>
          </div>
        </form>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Rechercher par libellé de métier..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Métier A</th>
                <th className="px-5 py-3">Métier B</th>
                <th className="px-5 py-3">Justification</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucune relation créée pour l'instant.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{item.metier_depart_libelle}</td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{item.metier_arrivee_libelle}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{item.justification || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button aria-label={`Supprimer la relation ${item.metier_depart_libelle} / ${item.metier_arrivee_libelle}`} onClick={() => handleSupprimer(item)} className={`p-2 ${tw.iconButtonHoverError || "hover:bg-red-50 hover:text-red-600"} rounded-lg transition-colors`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} onChange={(p) => { setPage(p); fetchItems(search, p); }} disabled={loading} />
      </div>
    </div>
  );
};

/**
 * Recherche libre de spécialité de formation, réservée à ce panel admin (pas de version
 * publique). Affiche systématiquement le Domaine à côté du libellé — le bug d'origine de ce
 * panel (session 25/09/2026) vient précisément de deux domaines "informatique"-like distincts
 * (200 "Mathématiques et informatique" académique / 218 "Informatique, données et numérique"
 * thèmes éditoriaux v1) contenant chacun des spécialités au nom proche mais jamais identiques
 * en base — sans le domaine affiché, impossible de distinguer visuellement laquelle est
 * sélectionnée.
 */
const SpecialiteAutocomplete = ({ value = "", onSelect, placeholder = "Rechercher une spécialité..." }) => {
  const [texte, setTexte] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => setTexte(value), [value]);

  const handleChange = (val) => {
    setTexte(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setOuvert(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const data = await adminService.getAdminReferentielSpecialites(val.trim(), 1);
        setSuggestions(data.results || []);
        setOuvert((data.results || []).length > 0);
      } catch (err) {
        reportError("ECHEC_AUTOCOMPLETE_SPECIALITE", err);
      }
    }, 300);
  };

  const handleSelect = (item) => {
    setTexte(item.libelle);
    setOuvert(false);
    onSelect?.(item);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={texte}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      {ouvert && (
        <ul className={`absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg shadow-lg ${tw.autocompleteDropdown}`}>
          {suggestions.map((item) => (
            <li
              key={item.id}
              className={`px-4 py-2 cursor-pointer text-sm ${tw.autocompleteItem}`}
              onMouseDown={() => handleSelect(item)}
            >
              <div className={tw.autocompleteItemTitle}>{item.libelle}</div>
              <div className={`text-xs ${tw.autocompleteItemSubtitle}`}>{item.domaine_complet || item.domaine_libelle}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Onglet "Spécialités similaires" — pendant du panel "Métiers similaires" pour le référentiel
 * Diplômes (matcher.py::_specialite_relation_similaire, score 0.70, session 25/09/2026). Utile
 * quand une offre exige une spécialité (ex: "Informatique", thème éditorial du domaine 218)
 * qu'un candidat n'a jamais exactement — sa formation pointe une spécialité académique précise
 * du domaine 200 ("Modeles Intelligents Et Decision") jugée équivalente en pratique.
 */
const RelationsSpecialitesPanel = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [specA, setSpecA] = useState(null);
  const [specB, setSpecB] = useState(null);
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = async (s = "", p = 1) => {
    setLoading(true);
    try {
      const data = await adminService.getAdminRelationsSpecialites(s, p);
      setItems(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
    } catch (err) {
      reportError("ECHEC_GET_RELATIONS_SPECIALITES", err);
      notifier.echec("Chargement impossible", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems("", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(window._relationsSpecialitesSearchTimer);
    window._relationsSpecialitesSearchTimer = setTimeout(() => fetchItems(val, 1), 400);
  };

  const handleCreer = async (e) => {
    e.preventDefault();
    if (!specA || !specB) {
      notifier.erreur("Sélection incomplète", "Sélectionnez les deux spécialités à rapprocher.");
      return;
    }
    if (specA.id === specB.id) {
      notifier.erreur("Spécialités identiques", "Les deux spécialités doivent être différentes.");
      return;
    }
    setSaving(true);
    try {
      await adminService.creerRelationSpecialite({
        specialite_depart: specA.id,
        specialite_arrivee: specB.id,
        justification,
      });
      notifier.succes("Relation créée", "Les deux spécialités seront désormais comptées compatibles à 70 % dans le matching.");
      setSpecA(null);
      setSpecB(null);
      setJustification("");
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_CREER_RELATION_SPECIALITE", err);
      notifier.echec("Création impossible", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = (item) => {
    confirmToast(
      `Supprimer le rapprochement entre "${item.specialite_depart_libelle}" et "${item.specialite_arrivee_libelle}" ?`,
      async () => {
        try {
          await adminService.supprimerRelationSpecialite(item.id);
          notifier.succes("Relation supprimée");
          fetchItems(search, page);
        } catch (err) {
          reportError("ECHEC_SUPPRIMER_RELATION_SPECIALITE", err);
          notifier.echec("Suppression impossible", err);
        }
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className={`${tw.card} p-5`}>
        <p className={`text-sm font-semibold ${tw.textStrong} mb-1`}>Rapprocher deux spécialités</p>
        <p className="text-xs text-slate-500 mb-4">
          Utile quand deux spécialités décrivent le même champ en pratique mais appartiennent à
          des domaines distincts du référentiel client (ex : une spécialité académique précise vs
          un thème éditorial large) — le matching ne détecte alors aucune compatibilité par match
          exact. Une fois créée, la relation compte pour 70% de compatibilité entre ces deux
          spécialités précises.
        </p>
        <form onSubmit={handleCreer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Spécialité A</label>
            <SpecialiteAutocomplete value={specA?.libelle || ""} onSelect={(item) => setSpecA(item)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Spécialité B</label>
            <SpecialiteAutocomplete value={specB?.libelle || ""} onSelect={(item) => setSpecB(item)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Justification (optionnel)</label>
            <input
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60`}
            >
              <Plus size={15} /> {saving ? "Création..." : "Créer la relation"}
            </button>
          </div>
        </form>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Rechercher par libellé de spécialité..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Spécialité A</th>
                <th className="px-5 py-3">Spécialité B</th>
                <th className="px-5 py-3">Justification</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucune relation créée pour l'instant.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{item.specialite_depart_libelle}</p>
                      <p className="text-xs text-slate-500">{item.specialite_depart_domaine}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{item.specialite_arrivee_libelle}</p>
                      <p className="text-xs text-slate-500">{item.specialite_arrivee_domaine}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{item.justification || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button aria-label={`Supprimer la relation ${item.specialite_depart_libelle} / ${item.specialite_arrivee_libelle}`} onClick={() => handleSupprimer(item)} className={`p-2 ${tw.iconButtonHoverError || "hover:bg-red-50 hover:text-red-600"} rounded-lg transition-colors`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} onChange={(p) => { setPage(p); fetchItems(search, p); }} disabled={loading} />
      </div>
    </div>
  );
};

export default AdminReferentielV2;
