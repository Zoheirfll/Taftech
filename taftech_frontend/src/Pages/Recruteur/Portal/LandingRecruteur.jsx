import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Brain, FileSearch, ClipboardCheck, BarChart3, Zap, Shield,
  ArrowRight, CheckCircle, Users, ChevronRight, Briefcase, Building2,
  ChevronDown, ChevronUp,
} from "lucide-react";
import api from "../../../api/axiosConfig";
import { tw } from "../../../theme";

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

const FAQ = [
  {
    q: "L'inscription est-elle gratuite ?",
    r: "Oui, la création de compte et la publication d'offres sont gratuites au lancement. Certaines fonctionnalités avancées (CVthèque, analyse IA) nécessitent un abonnement Premium à partir de 2 000 DA/mois.",
  },
  {
    q: "Combien de temps faut-il pour valider mon entreprise ?",
    r: "La validation de votre registre de commerce prend généralement moins de 24h ouvrables. Vous recevez un email de confirmation dès que votre compte est approuvé.",
  },
  {
    q: "Comment fonctionne le score de matching IA ?",
    r: "Chaque candidature reçoit un score de 0 à 100% basé sur 5 critères : spécialité (25pts), diplôme (20pts), expérience (20pts), région (20pts) et compétences (15pts). L'algorithme utilise la correspondance sémantique et les synonymes métier.",
  },
  {
    q: "Mes données et celles des candidats sont-elles sécurisées ?",
    r: "TAFTECH est 100% conforme à la loi algérienne 18-07 sur la protection des données personnelles. Les données sont stockées sur des serveurs localisés en Algérie. Aucune donnée n'est revendue à des tiers.",
  },
  {
    q: "Puis-je inviter des collaborateurs sur mon espace recruteur ?",
    r: "Oui, avec l'abonnement Premium vous pouvez inviter des membres avec des rôles distincts (Admin, Utilisateur, Invité) pour gérer les offres et candidatures en équipe.",
  },
  {
    q: "Que se passe-t-il si une offre est rejetée par la modération ?",
    r: "Vous recevez une notification avec le motif de rejet. Vous pouvez corriger l'offre directement depuis votre tableau de bord et la resoumettre en un clic.",
  },
];

const LandingRecruteur = () => {
  const [stats, setStats] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);

  useEffect(() => {
    api.get("jobs/stats/public/").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  // Fix 1 — valeur uniforme pendant chargement
  const fmt = (val) => (val !== undefined && val !== null ? `${val}` : "…");

  return (
    <div className="bg-white">

      {/* ─── HERO ─── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* TEXTE */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
              Publiez vos annonces.
              <br />
              <span className="text-teal-700">Trouvez les meilleurs</span>
              <br />
              talents en un temps record.
            </h1>
            <p className="text-slate-700 text-lg leading-relaxed mb-8 max-w-lg">
              TAFTECH connecte les entreprises algériennes aux profils qualifiés grâce à l'intelligence artificielle. Matching automatique, CVthèque nationale, gestion complète.
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-base"
              >
                Se connecter <ChevronRight size={16} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-4">
              {["Gratuit au lancement", "Sans engagement", "Validé ANPDP"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <CheckCircle size={14} className="text-teal-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* CARTE STATS — Fix 4 badge responsive */}
          <div className="relative">
            <div className="bg-slate-900 rounded-3xl p-8 text-white">
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-6">TAFTECH en chiffres</p>
              <div className="space-y-4">
                {[
                  { label: "Offres actives",        value: fmt(stats?.total_offres),      color: "bg-teal-500" },
                  { label: "Entreprises vérifiées", value: fmt(stats?.total_entreprises), color: "bg-indigo-500" },
                  { label: "Candidats inscrits",    value: fmt(stats?.total_candidats),   color: "bg-emerald-500" },
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
          </div>
        </div>
      </section>

      {/* ─── STATS — Fix 1 + Fix 2 icônes ─── */}
      <section className="bg-teal-700 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Briefcase, value: fmt(stats?.total_offres),      label: "Offres actives" },
              { icon: Building2, value: fmt(stats?.total_entreprises), label: "Entreprises vérifiées" },
              { icon: Users,     value: fmt(stats?.total_candidats),   label: "Candidats inscrits" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center mb-1">
                  <Icon size={22} className="text-teal-100" />
                </div>
                <p className="text-3xl font-extrabold text-white">{value}</p>
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
            <p className="text-slate-700 text-lg max-w-2xl mx-auto">
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
                <p className="text-sm text-slate-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Fix 3 — CTA intermédiaire après fonctionnalités */}
          <div className="text-center mt-12">
            <Link
              to="/recruteurs/inscription"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-teal-700 text-white font-bold rounded-xl hover:bg-teal-800 transition-colors shadow-md text-base"
            >
              Commencer gratuitement <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── COMMENT ÇA MARCHE — Fix 5 connecteur ─── */}
      <section id="comment-ca-marche" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Recrutez en 4 étapes</h2>
            <p className="text-slate-700 text-lg">Simple, rapide, efficace.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map(({ num, title, desc }, i) => (
              <div key={num} className="relative">
                {/* Fix 5 — connecteur centré sur l'icône, ne dépasse pas */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-14 -right-4 h-px bg-slate-200 z-0" />
                )}
                <div className="relative z-10 w-14 h-14 bg-teal-700 text-white text-xl font-extrabold rounded-2xl flex items-center justify-center mb-4 shadow-md">
                  {num}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{desc}</p>
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
              Pourquoi choisir TAFTECH ?
            </h2>
            <p className="text-slate-700 text-base leading-relaxed mb-8">
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


{/* ─── FAQ ─── */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Questions fréquentes</h2>
            <p className="text-slate-700 text-base">Tout ce que vous devez savoir avant de vous lancer.</p>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-800 pr-4">{item.q}</span>
                  {faqOpen === i
                    ? <ChevronUp size={18} className="text-teal-600 shrink-0" />
                    : <ChevronDown size={18} className="text-slate-600 shrink-0" />}
                </button>
                {faqOpen === i && (
                  <div className="px-6 pb-5 text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-4">
                    {item.r}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-sm text-slate-700 mb-4">Vous avez d'autres questions ?</p>
            <Link
              to="/recruteurs/inscription"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white font-bold rounded-xl hover:bg-teal-800 transition-colors text-sm"
            >
              Créer mon compte gratuitement <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingRecruteur;
