import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";

const SECTEURS = [
  "IT",
  "FINANCE",
  "BTP",
  "COMMERCIAL",
  "MARKETING",
  "RH",
  "INGENIERIE",
  "LOGISTIQUE",
  "ADMIN",
  "SANTE",
  "JURIDIQUE",
  "EDUCATION",
  "TOURISME",
  "MAINTENANCE",
  "PRODUCTION",
  "AGRICULTURE",
  "COMMUNICATION",
  "ARTS",
  "SPECTACLE",
  "SERVICE_PUBLIC",
  "AUTRE",
];

const AdminMetiers = () => {
  const [metiers, setMetiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [form, setForm] = useState({
    titre: "",
    secteur: "IT",
    niveau_experience: "",
    mots_cles: "",
    est_actif: true,
  });

  useEffect(() => {
    fetchMetiers();
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
    setForm({
      titre: "",
      secteur: "IT",
      niveau_experience: "",
      mots_cles: "",
      est_actif: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (m) => {
    setEditingId(m.id);
    setForm({
      titre: m.titre,
      secteur: m.secteur,
      niveau_experience: m.niveau_experience || "",
      mots_cles: m.mots_cles || "",
      est_actif: m.est_actif,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return toast.error("Le titre est obligatoire.");
    try {
      if (editingId) {
        await jobsService.updateMetier(editingId, form);
        setMetiers(
          metiers.map((m) => (m.id === editingId ? { ...m, ...form } : m)),
        );
        toast.success("Métier mis à jour !");
      } else {
        const created = await jobsService.createMetier(form);
        setMetiers([created, ...metiers]);
        toast.success("Métier ajouté !");
      }
      setShowModal(false);
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

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Référentiel métiers
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount} métiers au total
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Ajouter un métier
        </button>
      </div>

      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Rechercher un métier..."
          value={search}
          onChange={handleSearch}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              <th className="px-5 py-3">Titre</th>
              <th className="px-5 py-3">Secteur</th>
              <th className="px-5 py-3">Niveau</th>
              <th className="px-5 py-3 text-center">Statut</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan="5"
                  className="py-12 text-center text-sm text-indigo-600 animate-pulse font-medium"
                >
                  Chargement...
                </td>
              </tr>
            ) : metiers.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="py-12 text-center text-sm text-slate-400 italic"
                >
                  Aucun métier trouvé.
                </td>
              </tr>
            ) : (
              metiers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {m.titre}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                      {m.secteur}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {m.niveau_experience || "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${m.est_actif ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                    >
                      {m.est_actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <button
              onClick={() => {
                const p = page - 1;
                setPage(p);
                fetchMetiers(search, p);
              }}
              disabled={page === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              ← Précédent
            </button>
            <span className="text-xs font-medium text-slate-600">
              Page {page} / {totalPages} · {totalCount} métiers
            </span>
            <button
              onClick={() => {
                const p = page + 1;
                setPage(p);
                fetchMetiers(search, p);
              }}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? "Modifier le métier" : "Ajouter un métier"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Titre *
                </label>
                <input
                  required
                  className={inputClass}
                  placeholder="Ex: Développeur Full-Stack"
                  value={form.titre}
                  onChange={(e) => setForm({ ...form, titre: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Secteur *
                </label>
                <select
                  className={inputClass}
                  value={form.secteur}
                  onChange={(e) =>
                    setForm({ ...form, secteur: e.target.value })
                  }
                >
                  {SECTEURS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Niveau d'expérience
                </label>
                <input
                  className={inputClass}
                  placeholder="Ex: Junior/Senior"
                  value={form.niveau_experience}
                  onChange={(e) =>
                    setForm({ ...form, niveau_experience: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Mots-clés
                </label>
                <input
                  className={inputClass}
                  placeholder="Ex: React, Django, Python"
                  value={form.mots_cles}
                  onChange={(e) =>
                    setForm({ ...form, mots_cles: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="est_actif"
                  className="accent-indigo-600 w-4 h-4"
                  checked={form.est_actif}
                  onChange={(e) =>
                    setForm({ ...form, est_actif: e.target.checked })
                  }
                />
                <label
                  htmlFor="est_actif"
                  className="text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Métier actif
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
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
