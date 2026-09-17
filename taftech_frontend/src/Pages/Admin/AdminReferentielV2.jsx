import React, { useEffect, useState } from "react";
import { adminService } from "../../Services/adminService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Pencil, X, Search } from "lucide-react";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";

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
  { key: "specialites", label: "Spécialités", secondaryKey: "domaine_libelle", secondaryLabel: "Domaine" },
  { key: "diplomes", label: "Types de diplôme", secondaryKey: "systeme", secondaryLabel: "Système" },
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

  const config = ONGLETS.find((o) => o.key === onglet);

  const fetchItems = async (s = "", p = 1, tab = onglet) => {
    setLoading(true);
    try {
      const data = await FETCHERS[tab](s, p);
      setItems(data.results);
      setTotalPages(data.total_pages);
      setTotalCount(data.count);
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
    fetchItems("", 1, onglet);
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
    } catch (err) {
      reportError("ECHEC_TOGGLE_ADMIN_REFERENTIEL_V2", err);
      toast.error(apiErrMsg(err, "Erreur lors de la mise à jour."));
    }
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setEditLibelle(item.libelle);
  };

  const handleSaveLibelle = async (e) => {
    e.preventDefault();
    try {
      await UPDATERS[onglet](editing.id, { libelle: editLibelle });
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
      <div>
        <h1 className={tw.pageTitle}>Référentiel v2 (métiers, spécialités, diplômes)</h1>
        <p className={`${tw.pageSubtitle} mt-0.5`}>
          Contenu importé depuis les classeurs client — masquez une entrée (bascule "Actif") ou
          corrigez son libellé, sans créer ni supprimer d'identifiant.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {ONGLETS.map((o) => (
          <button
            key={o.key}
            onClick={() => setOnglet(o.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              onglet === o.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
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
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun résultat.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
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
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-5 py-3 border-t ${tw.borderSubtle}`}>
            <p className="text-xs text-slate-500">{totalCount} résultat(s)</p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePage(p)}
                  className={`w-7 h-7 text-xs font-semibold rounded-lg ${p === page ? "bg-indigo-600 text-white" : "hover:bg-slate-100 text-slate-600"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-md w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Modifier le libellé</h3>
              <button onClick={() => setEditing(null)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}>
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

export default AdminReferentielV2;
