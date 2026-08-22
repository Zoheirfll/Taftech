import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

  const candidatures = useMemo(() => {
    let toutes = [];
    offres.forEach((o) => {
      if (filtreOffre !== "TOUTES" && String(o.id) !== filtreOffre) return;
      (o.candidatures || []).forEach((c) => toutes.push({ ...c, offre_id: o.id, offre_titre: o.titre }));
    });
    if (filtreStatut !== "TOUS") toutes = toutes.filter((c) => c.statut === filtreStatut);
    return toutes.sort((a, b) => (b.score_matching || 0) - (a.score_matching || 0));
  }, [offres, filtreOffre, filtreStatut]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Candidatures</h1>
        <p className="text-sm text-slate-600 mt-1">Toutes les candidatures reçues, toutes offres confondues.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select value={filtreOffre} onChange={(e) => setFiltreOffre(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
          <option value="TOUTES">Toutes les offres</option>
          {offres.map((o) => <option key={o.id} value={String(o.id)}>{o.titre}</option>)}
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
                <th className="px-4 py-3">Candidat</th>
                <th className="px-4 py-3">Offre</th>
                <th className="px-4 py-3 text-center">Score IA</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Date</th>
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
