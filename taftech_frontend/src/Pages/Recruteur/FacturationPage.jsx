import React, { useState, useEffect, useMemo } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { tw } from "../../theme";
import { Download, FileText, Search } from "lucide-react";
import { apiErrMsg } from "../../utils/apiErrMsg";

const NOM_LABELS = { STARTER: "Starter", PRO: "Pro", BUSINESS: "Business", ENTERPRISE: "Enterprise" };

const FacturationPage = () => {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telechargementId, setTelechargementId] = useState(null);
  const [search, setSearch] = useState("");
  const [annee, setAnnee] = useState("toutes");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await jobsService.getFactures();
        setFactures(data);
      } catch (err) {
        reportError("ECHEC_LOAD_FACTURATION", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleTelecharger = async (facture) => {
    setTelechargementId(facture.id);
    try {
      const blob = await jobsService.telechargerFacturePDF(facture.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${facture.numero_facture}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors du téléchargement de la facture."));
    } finally {
      setTelechargementId(null);
    }
  };

  const annees = useMemo(() => {
    const set = new Set(
      factures.map((f) => (f.date_paiement ? new Date(f.date_paiement).getFullYear() : null)).filter(Boolean),
    );
    return Array.from(set).sort((a, b) => b - a);
  }, [factures]);

  const facturesFiltrees = useMemo(() => {
    let liste = factures;
    if (annee !== "toutes") {
      liste = liste.filter((f) => f.date_paiement && new Date(f.date_paiement).getFullYear() === Number(annee));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      liste = liste.filter((f) => (f.numero_facture || "").toLowerCase().includes(q));
    }
    return liste;
  }, [factures, search, annee]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Facturation</h1>
        <p className="text-sm text-slate-600 mt-1">Historique de vos factures d'abonnement, téléchargeables en PDF.</p>
      </div>

      {factures.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un n° de facture..."
              className={`${tw.input} w-full pl-9`}
            />
          </div>
          <select value={annee} onChange={(e) => setAnnee(e.target.value)} className={tw.input}>
            <option value="toutes">Toutes les années</option>
            {annees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3">N° facture</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Palier</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-500 animate-pulse">Chargement...</td></tr>
              ) : facturesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500 italic">
                      {factures.length === 0 ? "Aucune facture pour l'instant." : "Aucun résultat pour ces critères."}
                    </p>
                  </td>
                </tr>
              ) : (
                facturesFiltrees.map((f) => (
                  <tr key={f.id} className={tw.rowHover}>
                    <td className="px-4 py-3 text-sm font-mono text-slate-900">{f.numero_facture}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{f.date_paiement}</td>
                    <td className="px-4 py-3 text-sm">{NOM_LABELS[f.palier_nom] || f.palier_nom}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{f.montant_da.toLocaleString("fr-FR")} DA</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleTelecharger(f)}
                        disabled={telechargementId === f.id}
                        className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-100 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Download size={13} /> {telechargementId === f.id ? "..." : "Télécharger"}
                      </button>
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

export default FacturationPage;
