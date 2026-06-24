import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Brain, FileSearch, ClipboardCheck, BarChart3, Zap, Shield,
  ArrowRight, CheckCircle, Users, ChevronRight,
} from "lucide-react";
import api from "../../../api/axiosConfig";

const FEATURES = [
  {
    icon: Brain,
    title: "Matching IA sur 5 critères",
    desc: "Spécialité, diplôme, expérience, région, compétences. Chaque candidature est scorée automatiquement.",
  },
  {
    icon: FileSearch,
    title: "CVthèque complète",
    desc: "Parcourez des milliers de profils qualifiés avec filtres avancés. Contactez directement.",
  },
  {
    icon: ClipboardCheck,
    title: "Questionnaires de présélection",
    desc: "Créez des questionnaires liés à vos offres pour filtrer automatiquement les candidats.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord analytique",
    desc: "KPIs en temps réel, top 5 profils IA, taux de conversion, suivi des entretiens.",
  },
  {
    icon: Zap,
    title: "Candidatures spontanées",
    desc: "Recevez des candidatures même sans offre publiée. Gérez un vivier de talents continu.",
  },
  {
    icon: Shield,
    title: "Conforme Loi 18-07",
    desc: "100% conforme à la législation algérienne sur la protection des données (ANPDP).",
  },
];

const STEPS = [
  { num: "01", title: "Créez votre compte", desc: "Inscription avec validation de votre registre de commerce." },
  { num: "02", title: "Publiez votre offre", desc: "Formulaire guidé. Offre en ligne après validation sous 24h." },
  { num: "03", title: "L'IA classe les candidats", desc: "Chaque candidature est scorée et classée automatiquement." },
  { num: "04", title: "Recrutez le meilleur", desc: "Entretiens planifiés, bulletins générés, archivage automatique." },
];

const AVANTAGES = [
  "Publication d'offres illimitée",
  "Score de matching sur chaque candidat",
  "Accès à la CVthèque nationale",
  "Questionnaires de présélection",
  "Notifications en temps réel",
  "Conforme ANPDP / Loi 18-07",
];

const LandingRecruteur = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("jobs/stats/public/").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const STATS = [
    { value: stats ? `${stats.total_offres}` : "—", label: "Offres actives" },
    { value: stats ? `${stats.total_entreprises}` : "—", label: "Entreprises vérifiées" },
    { value: stats ? `${stats.total_candidats}` : "—", label: "Candidats inscrits" },
  ];

  return (
    <div className="bg-white">

      {/* ─── HERO ─── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* TEXTE */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-xs font-semibold mb-6">
              🇩🇿 Plateforme de recrutement algérienne
            </span>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
              Publiez vos annonces.
              <br />
              <span className="text-teal-700">Trouvez les meilleurs</span>
              <br />
              talents en un temps record.
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-lg">
              TafTech connecte les entreprises algériennes aux profils qualifiés grâce à l'intelligence artificielle. Matching automatique, CVthèque nationale, gestion complète.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                to="/recruteurs/inscription"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-700 text-white font-bold rounded-xl hover:bg-teal-800 transition-colors shadow-md text-base"
              >
                Publier une annonce maintenant <ArrowRight size={18} />
              </Link>
              <Link
                to="/recruteurs/connexion"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors border border-slate-200 text-base"
              >
                Se connecter <ChevronRight size={16} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-4">
              {["Gratuit au lancement", "Sans engagement", "Validé ANPDP"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-slate-500">
                  <CheckCircle size={14} className="text-teal-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* CARTE STATS RÉELLES */}
          <div className="relative">
            <div className="bg-slate-900 rounded-3xl p-8 text-white">
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-6">TafTech en chiffres</p>
              <div className="space-y-4">
                {[
                  { label: "Offres actives", value: stats?.total_offres ?? "…", color: "bg-teal-500" },
                  { label: "Entreprises vérifiées", value: stats?.total_entreprises ?? "…", color: "bg-indigo-500" },
                  { label: "Candidats inscrits", value: stats?.total_candidats ?? "…", color: "bg-emerald-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-sm text-slate-300">{label}</span>
                    </div>
                    <span className="text-base font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              IA activée ✓
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="bg-teal-700 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-extrabold text-white mb-1">{value}</p>
                <p className="text-sm text-teal-200">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FONCTIONNALITÉS ─── */}
      <section id="fonctionnalites" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">
              Tout ce dont vous avez besoin pour recruter
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Des outils professionnels pensés pour le marché algérien.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-teal-300 hover:shadow-md transition-all group">
                <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                  <Icon size={22} className="text-teal-700" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMMENT ÇA MARCHE ─── */}
      <section id="comment-ca-marche" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Recrutez en 4 étapes</h2>
            <p className="text-slate-500 text-lg">Simple, rapide, efficace.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map(({ num, title, desc }, i) => (
              <div key={num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-14 w-full h-px bg-slate-200 z-0" />
                )}
                <div className="relative z-10 w-14 h-14 bg-teal-700 text-white text-xl font-extrabold rounded-2xl flex items-center justify-center mb-4 shadow-md">
                  {num}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AVANTAGES + CTA ─── */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">
              Pourquoi choisir TafTech ?
            </h2>
            <p className="text-slate-500 text-base leading-relaxed mb-8">
              La seule plateforme de recrutement algérienne avec matching par IA, conforme ANPDP, pensée pour les entreprises locales.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVANTAGES.map((item) => (
                <div key={item} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <CheckCircle size={16} className="text-teal-600 shrink-0" />
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-teal-700 rounded-3xl p-10 text-white text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-300 mb-4">Commencez maintenant</p>
            <h3 className="text-2xl font-extrabold mb-4 leading-tight">
              Prêt à trouver votre prochain talent ?
            </h3>
            <p className="text-teal-200 text-sm leading-relaxed mb-8">
              Créez votre compte gratuitement et publiez votre première offre en moins de 5 minutes.
            </p>
            <Link
              to="/recruteurs/inscription"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-white text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-colors text-base shadow-md mb-4"
            >
              Créer un compte recruteur <ArrowRight size={18} />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-500 transition-colors text-sm border border-teal-500"
            >
              <Users size={16} /> Voir l'espace candidats
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingRecruteur;
