import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const STATUT_LABELS = {
  RECUE: "Reçue", EN_COURS: "En cours", PRESELECTION: "Présélection",
  ENTRETIEN: "Entretien", RETENU: "Retenu", REFUSE: "Refusé",
};

const CandidaturesListPage = () => {
  const navigate = useNavigate();
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreOffre, setFiltreOffre] = useState("TOUTES");
  const [filtreStatut, setFiltreStatut] = useState("TOUS");
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ col: "score", dir: "desc" });
  const toggleSort = (col) =>
    setSortConfig((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setOffres(dash.offres || []);
      } catch (err) {
        reportError("ECHEC_LOAD_CANDIDATURES_LIST", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Offres clôturées exclues des candidatures affichées ici : ce sont des offres archivées,
  // leurs candidatures restent consultables directement dans la fiche de l'offre (onglet
  // "Archivées" de la page Offres > Candidats), pas dans cette liste globale.
  const offresOuvertes = useMemo(() => offres.filter((o) => !o.est_cloturee), [offres]);

  const candidatures = useMemo(() => {
    let toutes = [];
    offresOuvertes.forEach((o) => {
      if (filtreOffre !== "TOUTES" && String(o.id) !== filtreOffre) return;
      (o.candidatures || []).forEach((c) => toutes.push({ ...c, offre_id: o.id, offre_titre: o.titre }));
    });
    if (filtreStatut !== "TOUS") toutes = toutes.filter((c) => c.statut === filtreStatut);
    const q = search.trim().toLowerCase();
    if (q) {
      toutes = toutes.filter((c) => {
        const nom = c.est_rapide
          ? `${c.prenom_rapide || ""} ${c.nom_rapide || ""}`
          : `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`;
        const email = c.est_rapide ? c.email_rapide || "" : c.candidat?.email || "";
        return nom.toLowerCase().includes(q) || email.toLowerCase().includes(q);
      });
    }
    const dir = sortConfig.dir === "asc" ? 1 : -1;
    const nomDe = (c) => (c.est_rapide ? `${c.prenom_rapide || ""} ${c.nom_rapide || ""}` : `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`).trim();
    toutes.sort((a, b) => {
      const map = {
        candidat: [nomDe(a).toLowerCase(), nomDe(b).toLowerCase()],
        offre: [(a.offre_titre || "").toLowerCase(), (b.offre_titre || "").toLowerCase()],
        score: [a.score_matching ?? -1, b.score_matching ?? -1],
        statut: [(STATUT_LABELS[a.statut] || a.statut || ""), (STATUT_LABELS[b.statut] || b.statut || "")],
        date: [a.date_postulation ? new Date(a.date_postulation).getTime() : 0, b.date_postulation ? new Date(b.date_postulation).getTime() : 0],
      };
      const [va, vb] = map[sortConfig.col] || [0, 0];
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });
    return toutes;
  }, [offresOuvertes, filtreOffre, filtreStatut, search, sortConfig]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Candidatures</h1>
        <p className="text-sm text-slate-600 mt-1">
          Toutes les candidatures reçues sur vos offres actives. Les candidatures d'une offre clôturée restent consultables en ouvrant cette offre depuis l'onglet « Archivées » de la page Offres.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un candidat par nom ou email..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <select value={filtreOffre} onChange={(e) => setFiltreOffre(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
          <option value="TOUTES">Toutes les offres</option>
          {offresOuvertes.map((o) => <option key={o.id} value={String(o.id)}>{o.titre}</option>)}
        </select>
        <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
          <option value="TOUS">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                {[
                  { label: "Candidat", col: "candidat", align: "left" },
                  { label: "Offre", col: "offre", align: "left" },
                  { label: "Score IA", col: "score", align: "center" },
                  { label: "Statut", col: "statut", align: "center" },
                  { label: "Date", col: "date", align: "right" },
                ].map(({ label, col, align }) => (
                  <th key={col} className={`px-4 py-3 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className={`inline-flex items-center gap-0.5 hover:text-slate-900 transition-colors ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : ""}`}
                    >
                      {label}
                      {sortConfig.col === col && (
                        <span className="ml-0.5 text-teal-600">{sortConfig.dir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-500 animate-pulse">Chargement...</td></tr>
              ) : candidatures.length === 0 ? (
                <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-500 italic">Aucune candidature.</td></tr>
              ) : (
                candidatures.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/dashboard/offres/${c.offre_id}`)} className={`${tw.rowHover} cursor-pointer`}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {c.est_rapide ? `${c.prenom_rapide} ${c.nom_rapide}` : `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.offre_titre}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-teal-700">{c.score_matching != null ? `${Math.round(c.score_matching)}%` : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${tw.candidatureStatutStyles?.[c.statut] || "bg-slate-100 text-slate-600"}`}>
                        {STATUT_LABELS[c.statut] || c.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-600">{c.date_postulation ? new Date(c.date_postulation).toLocaleDateString("fr-FR") : "—"}</td>
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

export default CandidaturesListPage;
