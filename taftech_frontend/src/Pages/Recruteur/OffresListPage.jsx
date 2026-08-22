import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const STATUT_LABELS = {
  EN_ATTENTE: "En attente",
  APPROUVEE: "Approuvée",
  REJETEE: "Rejetée",
};

const OffresListPage = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState("TOUS");

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setOffres(dash.offres || []);
      } catch (err) {
        reportError("ECHEC_LOAD_OFFRES_LIST", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const offresFiltrees = useMemo(() => {
    if (filtreStatut === "TOUS") return offres;
    if (filtreStatut === "CLOTUREE") return offres.filter((o) => o.est_cloturee);
    return offres.filter((o) => o.statut_moderation === filtreStatut && !o.est_cloturee);
  }, [offres, filtreStatut]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Offres d'emploi</h1>
          <p className="text-sm text-slate-600 mt-1">Toutes les offres de votre entreprise.</p>
        </div>
        <Link to="/creer-offre" className="px-4 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors text-center">
          + Publier une offre
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["TOUS", "EN_ATTENTE", "APPROUVEE", "REJETEE", "CLOTUREE"].map((s) => (
          <button
            key={s}
            onClick={() => setFiltreStatut(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${filtreStatut === s ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s === "TOUS" ? "Toutes" : s === "CLOTUREE" ? "Clôturées" : STATUT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Publiée le</th>
                <th className="px-4 py-3 text-center">Candidatures</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-500 animate-pulse">Chargement...</td></tr>
              ) : offresFiltrees.length === 0 ? (
                <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-500 italic">Aucune offre.</td></tr>
              ) : (
                offresFiltrees.map((o) => (
                  <tr key={o.id} className={tw.rowHover}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{o.titre}</p>
                      <p className="text-xs text-slate-500">{o.wilaya}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{o.date_publication ? new Date(o.date_publication).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">{(o.candidatures || []).length}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${o.est_cloturee ? "bg-slate-200 text-slate-600" : o.statut_moderation === "APPROUVEE" ? "bg-emerald-100 text-emerald-700" : o.statut_moderation === "REJETEE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {o.est_cloturee ? "Clôturée" : STATUT_LABELS[o.statut_moderation] || o.statut_moderation}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/dashboard/offres/${o.id}`} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-100 transition-colors">
                        Gérer
                      </Link>
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

export default OffresListPage;
