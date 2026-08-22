import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { tw } from "../../theme";
import { Download, FileText } from "lucide-react";

const NOM_LABELS = { STARTER: "Starter", PRO: "Pro", BUSINESS: "Business", ENTERPRISE: "Enterprise" };

const FacturationPage = () => {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telechargementId, setTelechargementId] = useState(null);

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
      toast.error("Erreur lors du téléchargement de la facture.");
    } finally {
      setTelechargementId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Facturation</h1>
        <p className="text-sm text-slate-600 mt-1">Historique de vos factures d'abonnement, téléchargeables en PDF.</p>
      </div>

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
              ) : factures.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500 italic">Aucune facture pour l'instant.</p>
                  </td>
                </tr>
              ) : (
                factures.map((f) => (
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
