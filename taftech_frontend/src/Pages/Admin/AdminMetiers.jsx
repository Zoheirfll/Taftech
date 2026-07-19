import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { tw } from "../../theme";
import { SecteurDomaineSelect } from "../../Components/SecteurDomaineSelect";

const FORM_VIDE = {
  titre: "",
  domaine: "",
  code_fiche: "",
  fiche_metier: "",
  secteur_code: "",
  est_actif: true,
};

const AdminMetiers = () => {
  const [metiers, setMetiers] = useState([]);
  const [nomenclature, setNomenclature] = useState({ secteurs: [], domaines: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [form, setForm] = useState(FORM_VIDE);
  const [domaineCodeSelectionne, setDomaineCodeSelectionne] = useState("");

  useEffect(() => {
    fetchMetiers();
    jobsService
      .getNomenclature()
      .then(setNomenclature)
      .catch((err) => reportError("ECHEC_CHARGEMENT_NOMENCLATURE_ADMIN", err));
  }, []);

  const fetchMetiers = async (s = "", p = 1) => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminMetiers(s, p);
      setMetiers(data.results);
      setTotalPages(data.total_pages);
      setTotalCount(data.count);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_METIERS", err);
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(window._metierSearchTimer);
    window._metierSearchTimer = setTimeout(() => fetchMetiers(val, 1), 400);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(FORM_VIDE);
    setDomaineCodeSelectionne("");
    setShowModal(true);
  };

  const handleOpenEdit = (m) => {
    setEditingId(m.id);
    setForm({
      titre: m.titre,
      domaine: m.domaine,
      code_fiche: m.code_fiche || "",
      fiche_metier: m.fiche_metier || "",
      secteur_code: m.secteur_code || "",
      est_actif: m.est_actif,
    });
    setDomaineCodeSelectionne(m.domaine_code || "");
    setShowModal(true);
  };

  // La sélection du domaine (via le sélecteur en cascade) alimente aussi
  // secteur_code automatiquement, en dénormalisant depuis la nomenclature.
  const handleDomaineChange = (domaineCode) => {
    const domaine = nomenclature.domaines.find((d) => d.code === domaineCode);
    setDomaineCodeSelectionne(domaineCode);
    setForm({ ...form, domaine: domaine?.id || "", secteur_code: domaine?.secteur_code || "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return toast.error("Le titre est obligatoire.");
    if (!form.domaine) return toast.error("Le domaine est obligatoire.");
    if (!form.code_fiche.trim()) return toast.error("Le code fiche est obligatoire.");
    try {
      if (editingId) {
        await jobsService.updateMetier(editingId, form);
        toast.success("Métier mis à jour !");
      } else {
        await jobsService.createMetier(form);
        toast.success("Métier ajouté !");
      }
      setShowModal(false);
      fetchMetiers(search, page);
    } catch (err) {
      reportError("ECHEC_SAVE_METIER", err);
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce métier ?")) return;
    try {
      await jobsService.deleteMetier(id);
      setMetiers(metiers.filter((m) => m.id !== id));
      toast.success("Métier supprimé.");
    } catch (err) {
      reportError("ECHEC_DELETE_METIER", err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>
            Référentiel métiers (nomenclature ANEM)
          </h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            {totalCount} métiers au total
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}
        >
          <Plus size={16} /> Ajouter un métier
        </button>
      </div>

      <div className="relative">
        <Search
          size={15}
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`}
        />
        <input
          type="text"
          placeholder="Rechercher un métier..."
          value={search}
          onChange={handleSearch}
          className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsWhite} rounded-xl text-sm`}
        />
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
            <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
              <th className="px-5 py-3">Titre</th>
              <th className="px-5 py-3">Domaine</th>
              <th className="px-5 py-3">Code fiche</th>
              <th className="px-5 py-3 text-center">Statut</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {loading ? (
              <tr>
                <td
                  colSpan="5"
                  className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}
                >
                  Chargement...
                </td>
              </tr>
            ) : metiers.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className={`py-12 text-center text-sm ${tw.textMuted} italic`}
                >
                  Aucun métier trouvé.
                </td>
              </tr>
            ) : (
              metiers.map((m) => (
                <tr key={m.id} className={tw.rowHover}>
                  <td className="px-5 py-3">
                    <p className={`text-sm font-medium ${tw.textStrong}`}>
                      {m.titre}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-medium rounded-full`}>
                      {m.domaine_label || m.domaine_code}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-xs ${tw.textMuted}`}>
                    {m.code_fiche || "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${m.est_actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}
                    >
                      {m.est_actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}
                      >
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

        {totalPages > 1 && (
          <div className={`px-4 py-3 border-t ${tw.borderSubtle} flex items-center justify-between ${tw.surfaceMuted}`}>
            <button
              onClick={() => {
                const p = page - 1;
                setPage(p);
                fetchMetiers(search, p);
              }}
              disabled={page === 1}
              className={`px-3 py-1.5 ${tw.surface} border ${tw.borderBase} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle} transition-colors`}
            >
              ← Précédent
            </button>
            <span className={`text-xs font-medium ${tw.textMuted}`}>
              Page {page} / {totalPages} · {totalCount} métiers
            </span>
            <button
              onClick={() => {
                const p = page + 1;
                setPage(p);
                fetchMetiers(search, p);
              }}
              disabled={page === totalPages}
              className={`px-3 py-1.5 ${tw.surface} border ${tw.borderBase} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle} transition-colors`}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>
                {editingId ? "Modifier le métier" : "Ajouter un métier"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
                  Titre (appellation) *
                </label>
                <input
                  required
                  className={inputClass}
                  placeholder="Ex: Développeur Full-Stack"
                  value={form.titre}
                  onChange={(e) => setForm({ ...form, titre: e.target.value })}
                />
              </div>
              <SecteurDomaineSelect
                value={domaineCodeSelectionne}
                onChange={handleDomaineChange}
                required
              />
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
                  Code fiche métier *
                </label>
                <input
                  required
                  className={inputClass}
                  placeholder="Ex: A1101"
                  value={form.code_fiche}
                  onChange={(e) =>
                    setForm({ ...form, code_fiche: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
                  Nom de la fiche métier
                </label>
                <input
                  className={inputClass}
                  placeholder="Ex: Sylviculture"
                  value={form.fiche_metier}
                  onChange={(e) =>
                    setForm({ ...form, fiche_metier: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="est_actif"
                  className={`${tw.accentPrimary} w-4 h-4`}
                  checked={form.est_actif}
                  onChange={(e) =>
                    setForm({ ...form, est_actif: e.target.checked })
                  }
                />
                <label
                  htmlFor="est_actif"
                  className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}
                >
                  Métier actif
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}
                >
                  {editingId ? "Mettre à jour" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMetiers;
