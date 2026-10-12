import React, { useEffect, useRef, useState } from "react";
import { adminService } from "../../Services/adminService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Pencil, X, Search, Trash2, Plus } from "lucide-react";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { confirmToast } from "../../utils/confirmToast";
import { MetierAutocomplete } from "../../Components/MetierAutocomplete";
import { CheckCircle2 } from "lucide-react";
import ReactSelect from "react-select";
import { selectStyles } from "../../theme";
import { grouperParFamille } from "../../utils/familleFormation";
import { jobsService } from "../../Services/jobsService";
import AdminPageHeader from "../../Components/AdminPageHeader";
import AdminPagination from "../../Components/AdminPagination";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";
import { GraduationCap } from "lucide-react";

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
  { key: "formations-a-verifier", label: "Formations à vérifier" },
];

const FETCHERS = {
  metiers: adminService.getAdminReferentielMetiers,
  specialites: adminService.getAdminReferentielSpecialites,
  diplomes: adminService.getAdminReferentielDiplomes,
};

const UPDATERS = {
  metiers: adminService.updateAdminReferentielMetier,
  specialites: adminService.updateAdminReferentielSpecialite,
  diplomes: adminService.updateAdminReferentielDiplome,
};

const AdminReferentielV2 = () => {
  const [onglet, setOnglet] = useState("metiers");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editing, setEditing] = useState(null);
  const [editLibelle, setEditLibelle] = useState("");
  const [formationsAVerifierCount, setFormationsAVerifierCount] = useState(0);

  const config = ONGLETS.find((o) => o.key === onglet);

  useEffect(() => {
    adminService
      .getAdminStats()
      .then((data) => setFormationsAVerifierCount(data.formations_a_verifier || 0))
      .catch((err) => reportError("ECHEC_GET_ADMIN_STATS_REFERENTIEL_V2", err));
  }, []);

  const fetchItems = async (s = "", p = 1, tab = onglet) => {
    setLoading(true);
    try {
      const data = await FETCHERS[tab](s, p);
      setItems(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_REFERENTIEL_V2", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch("");
    setPage(1);
    if (!["relations", "relations-specialites", "formations-a-verifier"].includes(onglet)) fetchItems("", 1, onglet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet]);

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
      toast.success(item.selectionnable ? `« ${item.libelle} » masqué des listes de choix.` : `« ${item.libelle} » de nouveau proposé.`);
    } catch (err) {
      reportError("ECHEC_TOGGLE_ADMIN_REFERENTIEL_V2", err);
      toast.error(apiErrMsg(err, "Erreur lors de la mise à jour."));
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
      toast.error("Le libellé ne peut pas être vide.");
      return;
    }
    try {
      await UPDATERS[onglet](editing.id, { libelle: editLibelle.trim() });
      toast.success("Libellé mis à jour.");
      setEditing(null);
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_UPDATE_LIBELLE_REFERENTIEL_V2", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={GraduationCap}
        color="violet"
        title="Référentiel métiers & diplômes"
        subtitle="Contenu importé depuis les classeurs client — masquez une entrée ou corrigez son libellé, sans créer ni supprimer d'identifiant."
        aideKey="referentiel-v2"
        aide={[
          "Métiers / Spécialités / Types de diplôme : cliquez sur le badge « Actif » pour masquer une entrée des listes de choix. Les profils et offres qui l'utilisent déjà ne sont pas modifiés.",
          "Le crayon corrige un libellé (faute, formulation). Le code reste identique : il sert aux réimports du classeur client.",
          "Métiers / Spécialités similaires : rapprochez manuellement deux entrées substituables classées à des endroits différents du référentiel. Elles comptent alors 70 % de compatibilité dans le matching.",
          "Formations à vérifier : diplômes saisis en « Autre » par les candidats. Attribuez un type de diplôme (et une spécialité si possible) pour qu'ils comptent dans le matching, ou refusez avec un motif.",
          "Toute consolidation de fond (fusion de secteurs, doublons) passe par la commande « consolider_referentiel », jamais par ce panel.",
        ]}
      />

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto" role="tablist" aria-label="Sections du référentiel">
        {ONGLETS.map((o) => (
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
            {o.key === "formations-a-verifier" && formationsAVerifierCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {formationsAVerifierCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {onglet === "relations" ? (
        <RelationsSimilairesPanel />
      ) : onglet === "relations-specialites" ? (
        <RelationsSpecialitesPanel />
      ) : onglet === "formations-a-verifier" ? (
        <FormationsAVerifierPanel onTraitee={() => setFormationsAVerifierCount((c) => Math.max(0, c - 1))} />
      ) : (
        <>
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
                      <p className="text-xs text-slate-500">{item.code}</p>
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
      toast.error(apiErrMsg(err, "Erreur de chargement."));
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
      toast.error("Sélectionnez les deux métiers à rapprocher.");
      return;
    }
    if (metierA.metier_id === metierB.metier_id) {
      toast.error("Les deux métiers doivent être différents.");
      return;
    }
    setSaving(true);
    try {
      await adminService.creerRelationSimilaire({
        metier_depart: metierA.metier_id,
        metier_arrivee: metierB.metier_id,
        justification,
      });
      toast.success("Relation créée — les deux métiers seront désormais comptés compatibles à 70% dans le matching.");
      setMetierA(null);
      setMetierB(null);
      setJustification("");
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_CREER_RELATION_SIMILAIRE", err);
      toast.error(apiErrMsg(err, "Erreur lors de la création."));
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
          toast.success("Relation supprimée.");
          fetchItems(search, page);
        } catch (err) {
          reportError("ECHEC_SUPPRIMER_RELATION_SIMILAIRE", err);
          toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
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
      toast.error(apiErrMsg(err, "Erreur de chargement."));
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
      toast.error("Sélectionnez les deux spécialités à rapprocher.");
      return;
    }
    if (specA.id === specB.id) {
      toast.error("Les deux spécialités doivent être différentes.");
      return;
    }
    setSaving(true);
    try {
      await adminService.creerRelationSpecialite({
        specialite_depart: specA.id,
        specialite_arrivee: specB.id,
        justification,
      });
      toast.success("Relation créée — les deux spécialités seront désormais comptées compatibles à 70% dans le matching.");
      setSpecA(null);
      setSpecB(null);
      setJustification("");
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_CREER_RELATION_SPECIALITE", err);
      toast.error(apiErrMsg(err, "Erreur lors de la création."));
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
          toast.success("Relation supprimée.");
          fetchItems(search, page);
        } catch (err) {
          reportError("ECHEC_SUPPRIMER_RELATION_SPECIALITE", err);
          toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
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

const FormationsAVerifierPanel = ({ onTraitee }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // Sélection en cours par ligne (id formation -> {diplomeId, specialiteId}) — les deux
  // champs sont volontairement DÉCOUPLÉS ici (contrairement à la cascade candidat
  // Type→Domaine→Filière→Spécialité) : l'admin doit pouvoir chercher/attribuer une
  // spécialité même quand le type de diplôme déclaré n'existe dans aucun référentiel
  // (ex: "Formation d'auto-école" — le type n'existe pas, mais "Automobile" peut très
  // bien matcher une vraie spécialité existante, indépendamment du type).
  const [selections, setSelections] = useState({});
  const [saving, setSaving] = useState(null);
  const [typesDiplomes, setTypesDiplomes] = useState([]);
  // Refus avec motif (retour client) : id de la formation dont le bandeau "Refuser" est
  // ouvert (une seule à la fois) + le texte de motif tapé par ligne, transmis au candidat
  // dans sa notification pour qu'il sache comment corriger sa formation.
  const [refusOuvertPour, setRefusOuvertPour] = useState(null);
  const [motifs, setMotifs] = useState({});

  useEffect(() => {
    jobsService
      .getNomenclatureFormation()
      .then((data) => setTypesDiplomes(data.types_diplomes || []))
      .catch((err) => reportError("ECHEC_CHARGEMENT_TYPES_DIPLOMES_ADMIN", err));
  }, []);

  const fetchItems = async (s = "", p = 1) => {
    setLoading(true);
    try {
      const data = await adminService.getAdminFormationsAVerifier(s, p);
      setItems(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
    } catch (err) {
      reportError("ECHEC_GET_FORMATIONS_A_VERIFIER", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
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
    clearTimeout(window._formationsAVerifierSearchTimer);
    window._formationsAVerifierSearchTimer = setTimeout(() => fetchItems(val, 1), 400);
  };

  const setSelection = (id, patch) => {
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  // Une formation "à vérifier" peut déjà avoir un Type de diplôme résolu (seule la
  // Spécialité manquait) — pré-remplir depuis l'item évite de forcer l'admin à re-choisir
  // un diplôme déjà correct juste pour pouvoir valider la spécialité.
  const selectionPour = (item) => ({
    diplomeId: selections[item.id]?.diplomeId ?? (item.diplome_ref || ""),
    specialiteId: selections[item.id]?.specialiteId ?? (item.specialite_ref || ""),
    specialiteLibelle: selections[item.id]?.specialiteLibelle ?? (item.specialite_ref_libelle || ""),
  });

  // Retire une formation traitée ; si la page devient vide alors qu'il en reste ailleurs,
  // recharge la 1re page (avant : page blanche "Aucune formation" malgré des éléments restants).
  const retirerDeLaListe = (id) => {
    const restants = items.filter((i) => i.id !== id);
    setItems(restants);
    setTotalCount((c) => Math.max(0, c - 1));
    if (restants.length === 0 && totalCount > 1) {
      setPage(1);
      fetchItems(search, 1);
    }
  };

  const handleValider = async (item) => {
    const sel = selectionPour(item);
    if (!sel.diplomeId) {
      toast.error("Choisissez au moins un type de diplôme avant de valider.");
      return;
    }
    setSaving(item.id);
    try {
      await adminService.validerFormationAVerifier(item.id, {
        diplome_ref: sel.diplomeId,
        specialite_ref: sel.specialiteId || null,
      });
      toast.success("Formation validée — elle sort de la liste d'attente.");
      retirerDeLaListe(item.id);
      if (onTraitee) onTraitee();
    } catch (err) {
      reportError("ECHEC_VALIDER_FORMATION_A_VERIFIER", err);
      toast.error(apiErrMsg(err, "Impossible de valider — ce couple diplôme/spécialité n'existe peut-être pas dans le référentiel."));
    } finally {
      setSaving(null);
    }
  };

  const handleConfirmerRefus = async (item) => {
    setSaving(item.id);
    try {
      await adminService.refuserFormationAVerifier(item.id, motifs[item.id] || "");
      toast.success("Formation refusée et retirée du profil du candidat.");
      retirerDeLaListe(item.id);
      setRefusOuvertPour(null);
      if (onTraitee) onTraitee();
    } catch (err) {
      reportError("ECHEC_REFUSER_FORMATION_A_VERIFIER", err);
      toast.error(apiErrMsg(err, "Erreur lors du refus."));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className={`${tw.card} p-4 bg-amber-50 border-amber-200`}>
        <p className="text-sm text-amber-800">
          Formations déclarées via "Autre, préciser" sans correspondance référentiel fiable
          (ni par recherche automatique, ni par confirmation candidat). Le matching les traite
          comme des critères non-évaluables (score provisoire), jamais comme une
          incompatibilité — attribuez un type de diplôme réel (et une spécialité si pertinent)
          pour les débloquer.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Rechercher par intitulé déclaré..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {loading ? (
        <p className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</p>
      ) : items.length === 0 ? (
        <p className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucune formation en attente de vérification.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`${tw.card} p-4 space-y-3`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.diplome}</p>
                  <p className="text-xs text-slate-500">
                    {item.candidat_nom} — {item.candidat_email}
                    {item.etablissement && ` · ${item.etablissement}`}
                  </p>
                  {item.description && <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{item.description}</p>}
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Type de diplôme</label>
                  <ReactSelect
                    options={grouperParFamille(typesDiplomes, null, (d) => ({ value: d.id, label: d.libelle }))}
                    value={
                      typesDiplomes
                        .map((d) => ({ value: d.id, label: d.libelle }))
                        .find((o) => String(o.value) === String(selectionPour(item).diplomeId)) || null
                    }
                    onChange={(opt) => setSelection(item.id, { diplomeId: opt ? opt.value : "" })}
                    styles={selectStyles}
                    placeholder="Rechercher un type de diplôme..."
                    isClearable
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    Spécialité <span className="text-slate-400">(recherche indépendante — tout le référentiel)</span>
                  </label>
                  <SpecialiteAutocomplete
                    value={selectionPour(item).specialiteLibelle || ""}
                    onSelect={(spec) => setSelection(item.id, { specialiteId: spec.id, specialiteLibelle: spec.libelle })}
                  />
                </div>
              </div>
              {refusOuvertPour === item.id ? (
                <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
                  <label className="text-xs font-medium text-red-700 block">
                    Motif du refus (transmis au candidat dans sa notification, optionnel)
                  </label>
                  <textarea
                    value={motifs[item.id] || ""}
                    onChange={(e) => setMotifs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRefusOuvertPour(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-lg"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmerRefus(item)}
                      disabled={saving === item.id}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {saving === item.id ? "Refus..." : "Confirmer le refus"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRefusOuvertPour(item.id)}
                    disabled={saving === item.id}
                    className="inline-flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Trash2 size={15} /> Refuser (supprimer)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleValider(item)}
                    disabled={saving === item.id}
                    className={`inline-flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60`}
                  >
                    <CheckCircle2 size={15} /> {saving === item.id ? "Validation..." : "Valider cette correspondance"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={`${tw.card} overflow-hidden`}>
          <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} onChange={(p) => { setPage(p); fetchItems(search, p); }} disabled={loading} />
        </div>
      )}
    </div>
  );
};

export default AdminReferentielV2;
