import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const RecrutementsPage = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setOffres(dash.offres || []);
      } catch (err) {
        reportError("ECHEC_LOAD_RECRUTEMENTS", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const recrutements = useMemo(() => {
    const liste = [];
    offres.forEach((o) => {
      (o.candidatures || []).forEach((c) => {
        if (c.statut === "RETENU") liste.push({ ...c, offre_id: o.id, offre_titre: o.titre });
      });
    });
    return liste.sort((a, b) => new Date(b.date_postulation) - new Date(a.date_postulation));
  }, [offres]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Recrutements</h1>
        <p className="text-sm text-slate-600 mt-1">Historique des candidats retenus, toutes offres confondues.</p>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3">Candidat</th>
                <th className="px-4 py-3">Poste</th>
                <th className="px-4 py-3 text-right">Recruté le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="3" className="py-12 text-center text-sm text-slate-500 animate-pulse">Chargement...</td></tr>
              ) : recrutements.length === 0 ? (
                <tr><td colSpan="3" className="py-12 text-center text-sm text-slate-500 italic">Aucun recrutement pour l'instant.</td></tr>
              ) : (
                recrutements.map((c) => (
                  <tr key={c.id} className={tw.rowHover}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {c.est_rapide ? `${c.prenom_rapide} ${c.nom_rapide}` : `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link to={`/dashboard/offres/${c.offre_id}`} className="text-teal-700 hover:underline">{c.offre_titre}</Link>
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

export default RecrutementsPage;
