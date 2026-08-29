import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Trash2 } from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";

const SCORES = [
  { value: "tous", label: "Toutes les notes" },
  { value: "16", label: "≥ 16/20" },
  { value: "12", label: "≥ 12/20" },
  { value: "8", label: "≥ 8/20" },
];

const EvaluationsPage = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scoreMin, setScoreMin] = useState("tous");
  const [sortConfig, setSortConfig] = useState({ col: "note_globale", dir: "desc" });
  const toggleSort = (col) =>
    setSortConfig((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setOffres(dash.offres || []);
      } catch (err) {
        reportError("ECHEC_LOAD_EVALUATIONS", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSupprimerEvaluation = (candidatureId, e) => {
    e.stopPropagation();
    confirmToast("Supprimer définitivement cette évaluation ?", async () => {
      try {
        await jobsService.supprimerEvaluation(candidatureId);
        setOffres((prev) =>
          prev.map((o) => ({
            ...o,
            candidatures: (o.candidatures || []).map((c) =>
              c.id === candidatureId
                ? { ...c, note_technique: null, note_communication: null, note_motivation: null, note_experience: null, note_globale: null, commentaire_evaluation: "" }
                : c,
            ),
          })),
        );
        toast.success("Évaluation supprimée.");
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors de la suppression."));
        reportError("ECHEC_SUPPRIMER_EVALUATION_LISTE", error);
      }
    });
  };

  const candidaturesEvaluees = useMemo(() => {
    const liste = [];
    offres.forEach((o) => {
      (o.candidatures || []).forEach((c) => {
        if (c.note_globale !== null && c.note_globale !== undefined) {
          liste.push({ ...c, offre_id: o.id, offre_titre: o.titre });
        }
      });
    });
    return liste.sort((a, b) => (b.note_globale || 0) - (a.note_globale || 0));
  }, [offres]);

  const candidaturesFiltrees = useMemo(() => {
    let liste = candidaturesEvaluees;
    if (scoreMin !== "tous") {
      liste = liste.filter((c) => (c.note_globale || 0) >= Number(scoreMin));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      liste = liste.filter((c) => {
        const nom = c.est_rapide
          ? `${c.prenom_rapide || ""} ${c.nom_rapide || ""}`
          : `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`;
        return nom.toLowerCase().includes(q) || (c.offre_titre || "").toLowerCase().includes(q);
      });
    }
    const dir = sortConfig.dir === "asc" ? 1 : -1;
    const nomDe = (c) => (c.est_rapide ? `${c.prenom_rapide || ""} ${c.nom_rapide || ""}` : `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`).trim();
    liste = [...liste].sort((a, b) => {
      const map = {
        candidat: [nomDe(a).toLowerCase(), nomDe(b).toLowerCase()],
        offre: [(a.offre_titre || "").toLowerCase(), (b.offre_titre || "").toLowerCase()],
        note_technique: [a.note_technique ?? -1, b.note_technique ?? -1],
        note_communication: [a.note_communication ?? -1, b.note_communication ?? -1],
        note_motivation: [a.note_motivation ?? -1, b.note_motivation ?? -1],
        note_experience: [a.note_experience ?? -1, b.note_experience ?? -1],
        note_globale: [a.note_globale ?? -1, b.note_globale ?? -1],
      };
      const [va, vb] = map[sortConfig.col] || [0, 0];
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });
    return liste;
  }, [candidaturesEvaluees, search, scoreMin, sortConfig]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Évaluations</h1>
        <p className="text-sm text-slate-600 mt-1">Toutes les candidatures évaluées, toutes offres confondues.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un candidat ou un poste..."
            className={`${tw.input} w-full pl-9`}
          />
        </div>
        <select value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} className={tw.input}>
          {SCORES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                {[
                  { label: "Candidat", col: "candidat" },
                  { label: "Offre", col: "offre" },
                  { label: "Technique", col: "note_technique" },
                  { label: "Communication", col: "note_communication" },
                  { label: "Motivation", col: "note_motivation" },
                  { label: "Expérience", col: "note_experience" },
                  { label: "Note globale /20", col: "note_globale" },
                  { label: "Commentaire", col: null },
                  { label: "", col: null },
                ].map(({ label, col }, i) => (
                  <th key={i} className="px-4 py-3">
                    {col ? (
                      <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center gap-0.5 hover:text-slate-900 transition-colors">
                        {label}
                        {sortConfig.col === col && (
                          <span className="ml-0.5 text-teal-600">{sortConfig.dir === "asc" ? "▲" : "▼"}</span>
                        )}
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="py-12 text-center text-sm text-slate-500 animate-pulse">Chargement...</td></tr>
              ) : candidaturesFiltrees.length === 0 ? (
                <tr><td colSpan="9" className="py-12 text-center text-sm text-slate-500 italic">
                  {candidaturesEvaluees.length === 0 ? "Aucune candidature évaluée pour le moment." : "Aucun résultat pour ces critères."}
                </td></tr>
              ) : (
                candidaturesFiltrees.map((c) => (
                  <tr
                    key={c.id}
                    className={`${tw.rowHover} cursor-pointer`}
                    onClick={() => navigate(`/dashboard/offres/${c.offre_id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {c.est_rapide ? `${c.prenom_rapide} ${c.nom_rapide}` : `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`}
                    </td>
                    <td className="px-4 py-3 text-sm">{c.offre_titre}</td>
                    <td className="px-4 py-3 text-sm">{c.note_technique ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{c.note_communication ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{c.note_motivation ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{c.note_experience ?? "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold">{c.note_globale}/20</td>
                    <td className="px-4 py-3 text-sm truncate max-w-[200px]">{c.commentaire_evaluation || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {authService.peutFaire("UTILISATEUR") && (
                        <button
                          type="button"
                          onClick={(e) => handleSupprimerEvaluation(c.id, e)}
                          title="Supprimer l'évaluation"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EvaluationsPage;
