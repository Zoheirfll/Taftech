import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import MiniAreaChart from "../../Components/MiniAreaChart";
import { Lock } from "lucide-react";

const PIPELINE_STAGES = [
  { key: "RECUE", label: "Reçue", color: "#d97706" },
  { key: "EN_COURS", label: "En cours", color: "#2563eb" },
  { key: "PRESELECTION", label: "Présélection", color: "#9333ea" },
  { key: "ENTRETIEN", label: "Entretien", color: "#ea580c" },
  { key: "RETENU", label: "Retenu(e)", color: "#059669" },
  { key: "REFUSE", label: "Refusé(e)", color: "#dc2626" },
];

const TRANCHES_SCORE = [
  { label: "0-20%", min: 0, max: 20 },
  { label: "20-40%", min: 20, max: 40 },
  { label: "40-60%", min: 40, max: 60 },
  { label: "60-80%", min: 60, max: 80 },
  { label: "80-100%", min: 80, max: 101 },
];

const StatistiquesPage = () => {
  const [offres, setOffres] = useState([]);
  const [accesAvance, setAccesAvance] = useState(false);
  const [repartitionScoreAPI, setRepartitionScoreAPI] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("6m");

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setOffres(dash.offres || []);
      } catch (err) {
        reportError("ECHEC_LOAD_STATISTIQUES", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadAvancees = async () => {
      try {
        const data = await jobsService.getStatistiquesAvancees();
        setRepartitionScoreAPI(data.repartition_score);
        setAccesAvance(true);
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.code === "PALIER_INSUFFISANT") {
          setAccesAvance(false);
        } else {
          reportError("ECHEC_LOAD_STATISTIQUES_AVANCEES", err);
        }
      }
    };
    loadAvancees();
  }, []);

  const evolution = useMemo(() => {
    const now = new Date();
    const nbMois = periode === "1a" ? 12 : 6;
    const buckets = Array.from({ length: nbMois }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (nbMois - 1 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("fr-FR", { month: "short" }), candidatures: 0, recrutements: 0 };
    });
    offres.forEach((o) => (o.candidatures || []).forEach((c) => {
      if (!c.date_postulation) return;
      const d = new Date(c.date_postulation);
      const entry = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (entry) {
        entry.candidatures++;
        if (c.statut === "RETENU") entry.recrutements++;
      }
    }));
    return buckets;
  }, [offres, periode]);

  const pipeline = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.key, 0]));
    offres.forEach((o) => (o.candidatures || []).forEach((c) => {
      if (counts[c.statut] !== undefined) counts[c.statut]++;
    }));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total, max: Math.max(1, ...Object.values(counts)) };
  }, [offres]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-600 animate-pulse">Chargement...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Statistiques</h1>
        <p className="text-sm text-slate-600 mt-1">Évolution des candidatures et de vos recrutements.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Évolution</h2>
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
            <option value="6m">6 derniers mois</option>
            <option value="1a">12 derniers mois</option>
          </select>
        </div>
        <div className={`${tw.card} p-4 overflow-x-auto`}>
          <MiniAreaChart
            data={evolution}
            series={[
              { key: "candidatures", color: "#4f46e5", label: "Candidatures reçues" },
              { key: "recrutements", color: "#059669", label: "Recrutements" },
            ]}
            height={190}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3">Pipeline de recrutement</h2>
        <div className={`${tw.card} p-4 space-y-3`}>
          {PIPELINE_STAGES.map((s) => {
            const count = pipeline.counts[s.key] || 0;
            const pct = pipeline.total > 0 ? Math.round((count / pipeline.total) * 100) : 0;
            return (
              <div key={s.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{s.label}</span>
                  <span className="text-slate-500">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(count / pipeline.max) * 100}%`, backgroundColor: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-slate-900">Répartition par score de matching (IA)</h2>
          {!accesAvance && <Lock size={14} className="text-slate-400" />}
        </div>
        {accesAvance && repartitionScoreAPI ? (
          <div className={`${tw.card} p-4 space-y-3`}>
            {TRANCHES_SCORE.map((t, i) => {
              const count = repartitionScoreAPI[i];
              const max = Math.max(1, ...repartitionScoreAPI);
              return (
                <div key={t.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{t.label}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`${tw.card} p-6 text-center`}>
            <p className="text-sm text-slate-600">Statistiques avancées réservées au palier Business ou supérieur.</p>
            <Link to="/recruteurs/abonnements" className="inline-block mt-3 px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors">
              Voir les paliers
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatistiquesPage;
