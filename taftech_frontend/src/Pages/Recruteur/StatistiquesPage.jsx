import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import MiniAreaChart from "../../Components/MiniAreaChart";
import {
  Lock,
  BarChart3,
  Users,
  Trophy,
  TrendingUp,
  Briefcase,
  GitBranch,
  Gauge,
} from "lucide-react";

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

const KpiCard = ({ icon: Icon, label, value, sub, subColor }) => (
  <div className={`${tw.card} rounded-2xl p-5 flex flex-col gap-3`}>
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <span className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-teal-700" />
      </span>
    </div>
    <p className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">{value}</p>
    {sub && <p className={`text-xs font-medium ${subColor || "text-slate-500"}`}>{sub}</p>}
  </div>
);

const SectionCard = ({ icon: Icon, title, right, children }) => (
  <div className={`${tw.card} rounded-2xl p-5`}>
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-teal-700" />
        </span>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      {right}
    </div>
    {children}
  </div>
);

const ScoreBar = ({ label, count, max, index, total }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  // Progression du gris vers le vert TafTech — les tranches de score élevé ressortent visuellement.
  const colors = ["#94a3b8", "#7ac94e", "#5cad3f", "#3a8226", "#307020"];
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500 font-mono tabular-nums">{count}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: colors[index] || "#5cad3f" }}
        />
      </div>
    </div>
  );
};

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

  const kpis = useMemo(() => {
    const totalCandidatures = pipeline.total;
    const totalRecrutements = pipeline.counts.RETENU || 0;
    const offresActives = offres.filter((o) => o.est_active && !o.est_cloturee).length;
    const taux = totalCandidatures > 0 ? Math.round((totalRecrutements / totalCandidatures) * 100) : 0;
    return { totalCandidatures, totalRecrutements, offresActives, taux };
  }, [pipeline, offres]);

  // Complément à "Évolution" — quelles offres captent le plus de candidatures, pour ne pas
  // laisser un seul graphique occuper toute la largeur de la page.
  const topOffres = useMemo(() => {
    return [...offres]
      .map((o) => ({ titre: o.titre, count: (o.candidatures || []).length }))
      .filter((o) => o.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [offres]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-600 animate-pulse">Chargement...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
          <BarChart3 size={20} className="text-teal-700" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Statistiques</h1>
          <p className="text-sm text-slate-600">Évolution des candidatures et de vos recrutements.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Candidatures"
          value={kpis.totalCandidatures}
          sub={`sur ${kpis.offresActives} offre${kpis.offresActives > 1 ? "s" : ""} active${kpis.offresActives > 1 ? "s" : ""}`}
        />
        <KpiCard
          icon={Trophy}
          label="Recrutements"
          value={kpis.totalRecrutements}
          subColor="text-teal-700"
          sub={kpis.totalRecrutements > 0 ? `${kpis.taux}% du pipeline` : "Aucun pour l'instant"}
        />
        <KpiCard
          icon={Gauge}
          label="Taux de conversion"
          value={`${kpis.taux}%`}
          sub={`${kpis.totalRecrutements} recrutement${kpis.totalRecrutements > 1 ? "s" : ""} / ${kpis.totalCandidatures} candidature${kpis.totalCandidatures > 1 ? "s" : ""}`}
        />
        <KpiCard
          icon={Briefcase}
          label="Offres actives"
          value={kpis.offresActives}
          sub={`sur ${offres.length} offre${offres.length > 1 ? "s" : ""} au total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          icon={TrendingUp}
          title="Évolution"
          right={
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="6m">6 derniers mois</option>
              <option value="1a">12 derniers mois</option>
            </select>
          }
        >
          <MiniAreaChart
            data={evolution}
            series={[
              { key: "candidatures", color: "#4f46e5", label: "Candidatures reçues" },
              { key: "recrutements", color: "#059669", label: "Recrutements" },
            ]}
            height={150}
            exportTitle="evolution-candidatures"
          />
        </SectionCard>

        <SectionCard icon={Briefcase} title="Top offres par candidatures">
          {topOffres.length > 0 ? (
            <div className="space-y-3.5">
              {topOffres.map((o, i) => {
                const max = topOffres[0].count;
                return (
                  <div key={o.titre + i}>
                    <div className="flex justify-between text-xs mb-1.5 gap-2">
                      <span className="font-semibold text-slate-700 truncate">{o.titre}</span>
                      <span className="text-slate-500 font-mono tabular-nums shrink-0">{o.count}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-all duration-500"
                        style={{ width: `${(o.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-600 text-center py-8">Aucune candidature reçue pour l'instant.</p>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard icon={GitBranch} title="Pipeline de recrutement">
          <div className="space-y-3.5">
            {PIPELINE_STAGES.map((s) => {
              const count = pipeline.counts[s.key] || 0;
              const pct = pipeline.total > 0 ? Math.round((count / pipeline.total) * 100) : 0;
              const isEmpty = count === 0;
              return (
                <div key={s.key} className={isEmpty ? "opacity-50" : ""}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700">{s.label}</span>
                    <span className={`font-mono tabular-nums ${isEmpty ? "text-slate-400 italic" : "text-slate-500"}`}>
                      {isEmpty ? "—" : `${count} (${pct}%)`}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={
                        isEmpty
                          ? { width: "6%", backgroundColor: s.color, opacity: 0.35 }
                          : { width: `${(count / pipeline.max) * 100}%`, backgroundColor: s.color }
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          icon={Gauge}
          title="Répartition par score de matching (IA)"
          right={!accesAvance && <Lock size={14} className="text-slate-400" />}
        >
          {accesAvance && repartitionScoreAPI ? (
            <div className="space-y-3.5">
              {TRANCHES_SCORE.map((t, i) => (
                <ScoreBar
                  key={t.label}
                  label={t.label}
                  count={repartitionScoreAPI[i]}
                  max={Math.max(1, ...repartitionScoreAPI)}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-slate-600">Statistiques avancées réservées au palier Business ou supérieur.</p>
              <Link
                to="/recruteurs/abonnements"
                className="inline-block mt-3 px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors"
              >
                Voir les paliers
              </Link>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default StatistiquesPage;
