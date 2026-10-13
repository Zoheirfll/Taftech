import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import {
  StatAreaChart,
  StatDonutChart,
  StatHistogram,
  StatSparkline,
} from "../../Components/StatCharts";
import {
  Lock,
  BarChart3,
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  Briefcase,
  GitBranch,
  Gauge,
  CalendarCheck,
  Star,
  Download,
  Printer,
  PieChart as PieIcon,
  MapPin,
  Filter,
} from "lucide-react";

const PIPELINE_STAGES = [
  { key: "RECUE", label: "Reçue", color: "#d97706" },
  { key: "EN_COURS", label: "En cours", color: "#2563eb" },
  { key: "PRESELECTION", label: "Présélection", color: "#9333ea" },
  { key: "ENTRETIEN", label: "Entretien", color: "#ea580c" },
  { key: "RETENU", label: "Retenu(e)", color: "#059669" },
  { key: "REFUSE", label: "Refusé(e)", color: "#dc2626" },
];

const SOURCES = {
  SITE: { label: "Site TafTech", color: "#204883" },
  CVTHEQUE: { label: "Invitation CVthèque", color: "#3a8226" },
  AUTRE: { label: "Autre", color: "#94a3b8" },
};

const TRANCHES_SCORE = [
  { label: "0-20%", min: 0, max: 20, color: "#94a3b8" },
  { label: "20-40%", min: 20, max: 40, color: "#7ac94e" },
  { label: "40-60%", min: 40, max: 60, color: "#5cad3f" },
  { label: "60-80%", min: 60, max: 80, color: "#3a8226" },
  { label: "80-100%", min: 80, max: 101, color: "#307020" },
];

const PERIODES = [
  { key: "30j", label: "30 jours", jours: 30 },
  { key: "3m", label: "3 mois", jours: 91 },
  { key: "6m", label: "6 mois", jours: 182 },
  { key: "12m", label: "12 mois", jours: 365 },
  { key: "tout", label: "Tout", jours: null },
];

const JOUR = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const aEteEntretien = (c) => !!c.date_entretien || c.statut === "ENTRETIEN";

const variation = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

const Variation = ({ value }) => {
  if (value === null || value === undefined) return <span className="text-xs text-slate-400">—</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${up ? "text-emerald-700" : "text-red-600"}`}>
      <Icon size={12} />
      {up ? "+" : ""}
      {value}%
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, variationPct, sub, sparkData, sparkKey, color }) => (
  <div className={`${tw.card} rounded-2xl p-5 flex flex-col gap-2 overflow-hidden`}>
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</p>
      <span className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-teal-700" />
      </span>
    </div>
    <div className="flex items-baseline gap-2">
      <p className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">{value}</p>
      {variationPct !== undefined && <Variation value={variationPct} />}
    </div>
    {sub && <p className="text-xs text-slate-600">{sub}</p>}
    {sparkData && sparkData.length >= 2 && (
      <StatSparkline data={sparkData} dataKey={sparkKey} color={color} />
    )}
  </div>
);

const SectionCard = ({ icon: Icon, title, right, children, className = "" }) => (
  <div className={`${tw.card} rounded-2xl p-5 ${className}`}>
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

const HBar = ({ label, count, max, color, right }) => (
  <div>
    <div className="flex justify-between text-xs mb-1.5 gap-2">
      <span className="font-semibold text-slate-700 truncate">{label}</span>
      <span className="text-slate-600 font-mono tabular-nums shrink-0">{right ?? count}</span>
    </div>
    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${max > 0 ? Math.max((count / max) * 100, count > 0 ? 3 : 0) : 0}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

const Vide = ({ children }) => <p className="text-sm text-slate-600 text-center py-8">{children}</p>;

const StatistiquesPage = () => {
  const [offres, setOffres] = useState([]);
  const [accesAvance, setAccesAvance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [periode, setPeriode] = useState("6m");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [offreId, setOffreId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setOffres(dash.offres || []);
      } catch (err) {
        setErreur(true);
        reportError("ECHEC_LOAD_STATISTIQUES", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // L'appel garde le contrôle d'accès côté serveur (403 PALIER_INSUFFISANT) ; l'histogramme
  // est ensuite calculé sur la période filtrée, ce que l'endpoint global ne sait pas faire.
  useEffect(() => {
    const loadAvancees = async () => {
      try {
        await jobsService.getStatistiquesAvancees();
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

  const toutes = useMemo(() => {
    const list = [];
    offres.forEach((o) => {
      if (offreId && String(o.id) !== String(offreId)) return;
      (o.candidatures || []).forEach((c) => {
        if (!c.date_postulation) return;
        list.push({ ...c, _date: new Date(c.date_postulation), _offre: o });
      });
    });
    return list;
  }, [offres, offreId]);

  // Fenêtre courante + fenêtre précédente de même durée (pour les variations).
  const fenetre = useMemo(() => {
    const fin = dateFin ? new Date(`${dateFin}T23:59:59`) : new Date();
    let debut = null;
    if (dateDebut) debut = new Date(`${dateDebut}T00:00:00`);
    else {
      const p = PERIODES.find((x) => x.key === periode);
      if (p?.jours) debut = startOfDay(new Date(fin.getTime() - p.jours * JOUR));
      else if (toutes.length) debut = startOfDay(new Date(Math.min(...toutes.map((c) => c._date))));
    }
    const dureeFixe = dateDebut || PERIODES.find((x) => x.key === periode)?.jours;
    let prevDebut = null;
    if (debut && dureeFixe) prevDebut = new Date(debut.getTime() - (fin.getTime() - debut.getTime()));
    return { debut, fin, prevDebut };
  }, [periode, dateDebut, dateFin, toutes]);

  const dansFenetre = useMemo(
    () => toutes.filter((c) => (!fenetre.debut || c._date >= fenetre.debut) && c._date <= fenetre.fin),
    [toutes, fenetre]
  );
  const dansPrecedente = useMemo(
    () =>
      fenetre.prevDebut
        ? toutes.filter((c) => c._date >= fenetre.prevDebut && c._date < fenetre.debut)
        : [],
    [toutes, fenetre]
  );

  const mesures = (list) => {
    const total = list.length;
    const entretiens = list.filter(aEteEntretien).length;
    const retenus = list.filter((c) => c.statut === "RETENU").length;
    const scores = list
      .filter((c) => c.score_matching !== null && c.score_matching !== undefined)
      .map((c) => Number(c.score_matching))
      .filter((n) => Number.isFinite(n));
    const scoreMoyen = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { total, entretiens, retenus, scoreMoyen, taux: total ? Math.round((retenus / total) * 100) : 0 };
  };
  const cur = useMemo(() => mesures(dansFenetre), [dansFenetre]);
  const prev = useMemo(() => mesures(dansPrecedente), [dansPrecedente]);
  const comparable = !!fenetre.prevDebut;

  // Granularité auto : jour ≤ 35 j, semaine ≤ 200 j, sinon mois.
  const evolution = useMemo(() => {
    if (!fenetre.debut) return [];
    const jours = Math.max(1, Math.round((fenetre.fin - fenetre.debut) / JOUR));
    const mode = jours <= 35 ? "jour" : jours <= 200 ? "semaine" : "mois";
    const cle = (d) => {
      if (mode === "jour") return iso(d);
      if (mode === "semaine") {
        const x = startOfDay(d);
        x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
        return iso(x);
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const fmt = (d) =>
      mode === "mois"
        ? d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
        : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    const buckets = new Map();
    const curseur = startOfDay(fenetre.debut);
    if (mode === "semaine") curseur.setDate(curseur.getDate() - ((curseur.getDay() + 6) % 7));
    if (mode === "mois") curseur.setDate(1);
    while (curseur <= fenetre.fin) {
      buckets.set(cle(curseur), { label: fmt(curseur), candidatures: 0, entretiens: 0, recrutements: 0 });
      if (mode === "jour") curseur.setDate(curseur.getDate() + 1);
      else if (mode === "semaine") curseur.setDate(curseur.getDate() + 7);
      else curseur.setMonth(curseur.getMonth() + 1);
    }
    dansFenetre.forEach((c) => {
      const b = buckets.get(cle(c._date));
      if (!b) return;
      b.candidatures++;
      if (aEteEntretien(c)) b.entretiens++;
      if (c.statut === "RETENU") b.recrutements++;
    });
    return [...buckets.values()];
  }, [dansFenetre, fenetre]);

  const statuts = useMemo(
    () => PIPELINE_STAGES.map((s) => ({ nom: s.label, color: s.color, count: dansFenetre.filter((c) => c.statut === s.key).length })),
    [dansFenetre]
  );

  // Entonnoir cumulatif : combien de candidatures ont AU MOINS atteint chaque étape.
  const entonnoir = useMemo(() => {
    const total = dansFenetre.length;
    const atteint = (statuts_) => dansFenetre.filter((c) => statuts_.includes(c.statut)).length;
    return [
      { label: "Candidatures reçues", count: total, color: "#204883" },
      { label: "Traitées (au moins « En cours »)", count: dansFenetre.filter((c) => c.statut !== "RECUE").length, color: "#2563eb" },
      { label: "Présélectionnées ou plus", count: atteint(["PRESELECTION", "ENTRETIEN", "RETENU"]), color: "#9333ea" },
      { label: "Entretiens", count: dansFenetre.filter(aEteEntretien).length, color: "#ea580c" },
      { label: "Recrutements", count: atteint(["RETENU"]), color: "#059669" },
    ].map((e) => ({ ...e, pct: total ? Math.round((e.count / total) * 100) : 0 }));
  }, [dansFenetre]);

  const sources = useMemo(
    () =>
      Object.entries(SOURCES).map(([k, v]) => ({
        nom: v.label,
        color: v.color,
        count: dansFenetre.filter((c) => (c.source || "SITE") === k).length,
      })),
    [dansFenetre]
  );

  const parWilaya = useMemo(() => {
    const m = {};
    dansFenetre.forEach((c) => {
      const w = c._offre.wilaya || "Non précisée";
      m[w] = (m[w] || 0) + 1;
    });
    return Object.entries(m).map(([nom, count]) => ({ nom, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [dansFenetre]);

  const parContrat = useMemo(() => {
    const palette = ["#204883", "#3a8226", "#d97706", "#9333ea", "#0891b2", "#94a3b8"];
    const m = {};
    dansFenetre.forEach((c) => {
      const t = c._offre.type_contrat || "Non précisé";
      m[t] = (m[t] || 0) + 1;
    });
    return Object.entries(m)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count)
      .map((d, i) => ({ ...d, color: palette[i % palette.length] }));
  }, [dansFenetre]);

  const histoScore = useMemo(
    () =>
      TRANCHES_SCORE.map((t) => ({
        label: t.label,
        color: t.color,
        count: dansFenetre.filter((c) => c.score_matching !== null && c.score_matching !== undefined && Number(c.score_matching) >= t.min && Number(c.score_matching) < t.max).length,
      })),
    [dansFenetre]
  );

  const tableOffres = useMemo(() => {
    const m = new Map();
    dansFenetre.forEach((c) => {
      const o = c._offre;
      if (!m.has(o.id)) m.set(o.id, { id: o.id, titre: o.titre, actif: o.est_active && !o.est_cloturee, list: [] });
      m.get(o.id).list.push(c);
    });
    return [...m.values()]
      .map((r) => ({ ...r, ...mesures(r.list) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [dansFenetre]);

  const offresActives = offres.filter((o) => o.est_active && !o.est_cloturee).length;

  const exporterCsv = () => {
    const lignes = [
      ["Offre", "Statut offre", "Candidatures", "Entretiens", "Recrutements", "Taux de conversion (%)", "Score moyen (%)"],
      ...tableOffres.map((r) => [r.titre, r.actif ? "Active" : "Clôturée", r.total, r.entretiens, r.retenus, r.taux, r.scoreMoyen ?? ""]),
    ];
    const csv = lignes.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "statistiques-recrutement.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const choisirPeriode = (key) => {
    setPeriode(key);
    setDateDebut("");
    setDateFin("");
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-600 animate-pulse">Chargement...</div>;
  }
  if (erreur) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-600 mb-3">Impossible de charger les statistiques.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800">
          Réessayer
        </button>
      </div>
    );
  }

  const varOf = (c, p) => (comparable ? variation(c, p) : undefined);
  const inputCls = "px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-teal-500";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
            <BarChart3 size={20} className="text-teal-700" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Statistiques</h1>
            <p className="text-sm text-slate-600">Analyse de vos candidatures et de vos recrutements sur la période choisie.</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={exporterCsv} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Download size={14} /> Exporter (CSV)
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800">
            <Printer size={14} /> Imprimer / PDF
          </button>
        </div>
      </div>

      <div className={`${tw.card} rounded-2xl p-4 flex flex-wrap items-center gap-2.5 print:hidden`}>
        <Filter size={14} className="text-slate-500" />
        {PERIODES.map((p) => {
          const actif = !dateDebut && periode === p.key;
          return (
            <button
              key={p.key}
              onClick={() => choisirPeriode(p.key)}
              aria-pressed={actif}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                actif ? "bg-teal-50 border-teal-600 text-teal-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <div className="flex items-center gap-1.5 sm:ml-auto flex-wrap">
          <label htmlFor="stats-debut" className="text-xs text-slate-600">Du</label>
          <input id="stats-debut" type="date" value={dateDebut} max={dateFin || undefined} onChange={(e) => setDateDebut(e.target.value)} className={inputCls} />
          <label htmlFor="stats-fin" className="text-xs text-slate-600">au</label>
          <input id="stats-fin" type="date" value={dateFin} min={dateDebut || undefined} onChange={(e) => setDateFin(e.target.value)} className={inputCls} />
          <select aria-label="Filtrer par offre" value={offreId} onChange={(e) => setOffreId(e.target.value)} className={`${inputCls} max-w-[220px]`}>
            <option value="">Toutes les offres</option>
            {offres.map((o) => (
              <option key={o.id} value={o.id}>{o.titre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={Users} label="Candidatures" value={cur.total} variationPct={varOf(cur.total, prev.total)}
          sub={`sur ${offresActives} offre${offresActives > 1 ? "s" : ""} active${offresActives > 1 ? "s" : ""}`}
          sparkData={evolution} sparkKey="candidatures" color="#204883" />
        <KpiCard icon={CalendarCheck} label="Entretiens" value={cur.entretiens} variationPct={varOf(cur.entretiens, prev.entretiens)}
          sub={cur.total ? `${Math.round((cur.entretiens / cur.total) * 100)}% des candidatures` : "Aucune candidature"}
          sparkData={evolution} sparkKey="entretiens" color="#ea580c" />
        <KpiCard icon={Trophy} label="Recrutements" value={cur.retenus} variationPct={varOf(cur.retenus, prev.retenus)}
          sub={cur.retenus ? `${cur.taux}% de conversion` : "Aucun pour l'instant"}
          sparkData={evolution} sparkKey="recrutements" color="#059669" />
        <KpiCard icon={Gauge} label="Taux de conversion" value={`${cur.taux}%`} variationPct={varOf(cur.taux, prev.taux)}
          sub={`${cur.retenus} recrutement${cur.retenus > 1 ? "s" : ""} / ${cur.total} candidature${cur.total > 1 ? "s" : ""}`} />
        <KpiCard icon={Star} label="Score moyen (IA)" value={cur.scoreMoyen === null ? "—" : `${cur.scoreMoyen}%`} variationPct={varOf(cur.scoreMoyen, prev.scoreMoyen)}
          sub="Compatibilité moyenne des candidats" />
        <KpiCard icon={Briefcase} label="Offres actives" value={offresActives} sub={`sur ${offres.length} offre${offres.length > 1 ? "s" : ""} au total`} />
      </div>
      {comparable && <p className="text-xs text-slate-600 -mt-3">Les variations comparent la période choisie à la période précédente de même durée.</p>}

      <SectionCard icon={TrendingUp} title="Évolution des candidatures, entretiens et recrutements">
        {evolution.length > 0 && dansFenetre.length > 0 ? (
          <StatAreaChart
            data={evolution}
            series={[
              { key: "candidatures", color: "#204883", label: "Candidatures" },
              { key: "entretiens", color: "#ea580c", label: "Entretiens" },
              { key: "recrutements", color: "#059669", label: "Recrutements" },
            ]}
          />
        ) : (
          <Vide>Aucune candidature sur cette période.</Vide>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard icon={Filter} title="Entonnoir de recrutement">
          {cur.total > 0 ? (
            <div className="space-y-3.5">
              {entonnoir.map((e) => (
                <HBar key={e.label} label={e.label} count={e.count} max={entonnoir[0].count} color={e.color} right={`${e.count} (${e.pct}%)`} />
              ))}
            </div>
          ) : (
            <Vide>Aucune candidature sur cette période.</Vide>
          )}
        </SectionCard>

        <SectionCard icon={GitBranch} title="Répartition par statut">
          <StatDonutChart data={statuts} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard icon={PieIcon} title="Sources des candidatures">
          <StatDonutChart data={sources} />
        </SectionCard>
        <SectionCard icon={Briefcase} title="Par type de contrat">
          <StatDonutChart data={parContrat} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard icon={MapPin} title="Candidatures par wilaya de l'offre">
          {parWilaya.length > 0 ? (
            <div className="space-y-3.5">
              {parWilaya.map((w) => (
                <HBar key={w.nom} label={w.nom} count={w.count} max={parWilaya[0].count} color="#3a8226" />
              ))}
            </div>
          ) : (
            <Vide>Aucune donnée sur cette période.</Vide>
          )}
        </SectionCard>

        <SectionCard icon={Gauge} title="Répartition par score de matching (IA)" right={!accesAvance && <Lock size={14} className="text-slate-400" />}>
          {accesAvance ? (
            <StatHistogram data={histoScore} />
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-slate-600">Statistiques avancées réservées au palier Business ou supérieur.</p>
              <Link to="/recruteurs/abonnements" className="inline-block mt-3 px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors">
                Voir les paliers
              </Link>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard icon={Trophy} title="Performance par offre">
        {tableOffres.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-2 pr-3 font-semibold">Offre</th>
                  <th className="py-2 px-3 font-semibold text-right">Candidatures</th>
                  <th className="py-2 px-3 font-semibold text-right">Entretiens</th>
                  <th className="py-2 px-3 font-semibold text-right">Recrutés</th>
                  <th className="py-2 px-3 font-semibold text-right">Conversion</th>
                  <th className="py-2 pl-3 font-semibold text-right">Score moyen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableOffres.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-3">
                      <Link to={`/dashboard/offres/${r.id}`} className="font-semibold text-slate-800 hover:text-teal-700">{r.titre}</Link>
                      {!r.actif && <span className="ml-2 text-[11px] text-slate-500">(clôturée)</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.total}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.entretiens}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.retenus}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.taux}%</td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums">{r.scoreMoyen === null ? "—" : `${r.scoreMoyen}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucune candidature reçue sur cette période.</Vide>
        )}
      </SectionCard>
    </div>
  );
};

export default StatistiquesPage;
