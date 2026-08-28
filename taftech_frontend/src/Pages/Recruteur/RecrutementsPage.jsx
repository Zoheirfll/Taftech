import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const PERIODES = [
  { value: "tout", label: "Toute la période" },
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
  { value: "6m", label: "6 derniers mois" },
  { value: "1a", label: "12 derniers mois" },
];

const PERIODE_JOURS = { "7j": 7, "30j": 30, "6m": 182, "1a": 365 };

const RecrutementsPage = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periode, setPeriode] = useState("tout");

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

  const recrutementsFiltres = useMemo(() => {
    let liste = recrutements;
    if (periode !== "tout") {
      const seuilJours = PERIODE_JOURS[periode];
      const seuil = new Date();
      seuil.setDate(seuil.getDate() - seuilJours);
      liste = liste.filter((c) => c.date_postulation && new Date(c.date_postulation) >= seuil);
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
    return liste;
  }, [recrutements, search, periode]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Recrutements</h1>
        <p className="text-sm text-slate-600 mt-1">Historique des candidats retenus, toutes offres confondues.</p>
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
        <select value={periode} onChange={(e) => setPeriode(e.target.value)} className={tw.input}>
          {PERIODES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
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
              ) : recrutementsFiltres.length === 0 ? (
                <tr><td colSpan="3" className="py-12 text-center text-sm text-slate-500 italic">
                  {recrutements.length === 0 ? "Aucun recrutement pour l'instant." : "Aucun résultat pour ces critères."}
                </td></tr>
              ) : (
                recrutementsFiltres.map((c) => (
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
