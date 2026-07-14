import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import Select from "react-select";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter";
import { authService } from "../../Services/authService";
import {
  MapPin, Search, Briefcase, Users, Building2, Sparkles,
  Clock, ArrowRight, CheckCircle, Zap, Globe, Star,
  FileText, ChevronRight,
} from "lucide-react";

const tempsDepuis = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `il y a ${Math.floor(diff / 86400)}j`;
  return `il y a ${Math.floor(diff / 2592000)} mois`;
};

const EXPERIENCE_LABELS = {
  DEBUTANT: "Débutant",
  JEUNE_DIPLOME: "Jeune diplômé",
  CONFIRME: "Confirmé",
  SENIOR: "Senior",
  EXPERT: "Expert",
};

const estNouveau = (dateStr) => {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr)) / 1000 < 7 * 86400;
};

const STEPS = [
  { num: 1, icon: FileText, title: "Créez votre profil", desc: "Renseignez vos compétences, expériences et préférences en quelques minutes." },
  { num: 2, icon: Zap, title: "L'IA analyse votre profil", desc: "Notre algorithme calcule votre compatibilité avec chaque offre automatiquement." },
  { num: 3, icon: Star, title: "Postulez en un clic", desc: "Candidatez aux offres les plus pertinentes et suivez vos candidatures en temps réel." },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Matching intelligent",
    desc: "Notre technologie analyse les profils des candidats et les besoins des entreprises afin de proposer les correspondances les plus pertinentes, pour un recrutement plus rapide et plus efficace.",
    color: "bg-indigo-50 text-indigo-600",
    border: "group-hover:border-indigo-300",
  },
  {
    icon: Users,
    title: "Une CVthèque riche et qualifiée",
    desc: "Accédez à une base de profils issus de nombreux secteurs d'activité, du débutant au cadre expérimenté, partout en Algérie.",
    color: "bg-amber-50 text-amber-600",
    border: "group-hover:border-amber-300",
  },
  {
    icon: Globe,
    title: "Pensé pour le marché algérien",
    desc: "Une plateforme conçue pour répondre aux réalités du recrutement en Algérie, conforme à la réglementation nationale et adaptée aux besoins des entreprises locales.",
    color: "bg-emerald-50 text-emerald-600",
    border: "group-hover:border-emerald-300",
  },
  {
    icon: Zap,
    title: "Simple, rapide et sécurisé",
    desc: "Publiez vos offres, gérez vos candidatures et recrutez en toute simplicité depuis une plateforme intuitive et sécurisée.",
    color: "bg-rose-50 text-rose-600",
    border: "group-hover:border-rose-300",
  },
];

const Home = () => {
  const navigate = useNavigate();
  const isLogged = authService.isAuthenticated();
  const role = authService.getUserRole();

  const [constants, setConstants] = useState({ wilayas: [] });
  const [search, setSearch] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [stats, setStats] = useState({ total_offres: 0, total_entreprises: 0, total_candidats: 0 });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [constantsData, statsData, jobsData] = await Promise.all([
          jobsService.getConstants(),
          api.get("jobs/stats/public/"),
          jobsService.getAllJobs({}, 1),
        ]);
        setConstants(constantsData);
        setStats(statsData.data);
        if (jobsData.results) setRecentJobs(jobsData.results.slice(0, 3));
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_ACCUEIL", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  const handleInitialSearch = (e) => {
    e.preventDefault();
    const queryParams = new URLSearchParams();
    if (search) queryParams.append("search", search);
    if (wilaya) queryParams.append("wilaya", wilaya);
    navigate(`/offres?${queryParams.toString()}`);
  };

  return (
    <div className="bg-slate-50 font-sans overflow-x-hidden">

      {/* ─── HERO ─── */}
      <section className="relative pt-24 pb-28 px-4 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">

          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Le bon profil. <span className="text-indigo-600">La bonne opportunité.</span><br />
            Au bon moment.
          </h1>

          <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            Grâce à un matching intelligent, TAFTECH facilite la rencontre entre les
            entreprises à la recherche de compétences et les candidats en quête de
            nouvelles opportunités professionnelles.
          </p>

          {/* BARRE DE RECHERCHE */}
          <form
            onSubmit={handleInitialSearch}
            className="w-full max-w-3xl mx-auto mt-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row overflow-hidden"
          >
            <div className="flex-1 flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-slate-200">
              <Search size={18} className="text-slate-400 mr-3 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Métier, compétence, entreprise..."
                className="w-full bg-transparent outline-none text-sm font-medium text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-1 border-b md:border-b-0 md:border-r border-slate-200">
              <MapPin size={18} className="text-slate-400 mr-2 shrink-0" />
              <Select
                options={constants.wilayas}
                onChange={(opt) => setWilaya(opt ? opt.value : "")}
                value={constants.wilayas.find((w) => w.value === wilaya) || null}
                placeholder="Wilaya..."
                isClearable
                className="w-full text-sm"
                styles={{
                  control: (base) => ({ ...base, border: 0, boxShadow: "none", backgroundColor: "transparent", minHeight: "36px", cursor: "pointer" }),
                  menu: (base) => ({ ...base, zIndex: 9999, borderRadius: "0.5rem", marginTop: "8px" }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
                menuPortalTarget={document.body}
              />
            </div>
            <button type="submit" className="px-6 py-3 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Rechercher
            </button>
          </form>

          {/* CTA non connecté */}
          {!isLogged && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <Link to="/register" className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors shadow-sm">
                Je cherche un emploi
              </Link>
              <Link to="/recruteurs/inscription" className="w-full sm:w-auto px-6 py-2.5 bg-white text-indigo-600 border border-indigo-200 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors">
                Je recrute
              </Link>
            </div>
          )}

          {/* CTA candidat connecté */}
          {isLogged && role === "CANDIDAT" && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <Link to="/profil" className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                Compléter mon profil
              </Link>
              <Link to="/mes-candidatures" className="w-full sm:w-auto px-6 py-2.5 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                Mes candidatures
              </Link>
            </div>
          )}

          {/* CTA recruteur connecté */}
          {isLogged && role === "RECRUTEUR" && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <Link to="/creer-offre" className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                Publier une offre
              </Link>
              <Link to="/dashboard" className="w-full sm:w-auto px-6 py-2.5 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                Tableau de bord
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-12 bg-indigo-600">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { label: "Candidats inscrits", icon: Users, value: stats.total_candidats },
            { label: "Entreprises partenaires", icon: Building2, value: stats.total_entreprises },
            { label: "Offres à pourvoir", icon: Briefcase, value: stats.total_offres },
          ].map(({ label, icon: Icon, value }) => (
            <div key={label} className="py-4 flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-indigo-500/50 rounded-xl flex items-center justify-center mb-1">
                <Icon size={20} className="text-white" />
              </div>
              {loading ? (
                <div className="h-9 w-16 bg-indigo-500/50 rounded-lg animate-pulse mx-auto" />
              ) : (
                <p className="text-3xl font-extrabold text-white tabular-nums">{value}</p>
              )}
              <p className="text-xs font-medium text-indigo-200 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── COMMENT ÇA MARCHE (visiteurs non connectés uniquement) ─── */}
      {!isLogged && (
        <section className="py-20 bg-white px-4 border-b border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">Simple & Rapide</p>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Comment ça marche ?</h2>
              <p className="text-sm text-slate-500">Trouvez un emploi en 3 étapes simples.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
              {/* Connecteur desktop */}
              <div className="hidden sm:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-slate-200 z-0" />
              {STEPS.map(({ num, icon: Icon, title, desc }) => (
                <div key={num} className="flex flex-col items-center text-center relative z-10">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-md shadow-indigo-200">
                    <Icon size={26} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-indigo-500 mb-1">Étape {num}</span>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
                Commencer gratuitement <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── DERNIÈRES OFFRES ─── */}
      <section className="py-20 bg-slate-50 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">En direct</p>
              <h2 className="text-2xl font-extrabold text-slate-900">Dernières offres</h2>
              <p className="text-sm text-slate-500 mt-1">Opportunités récemment publiées.</p>
            </div>
            <Link to="/offres" className="hidden md:flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
              Voir tout <ChevronRight size={15} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
                  <div className="h-3 w-16 bg-slate-100 rounded mb-4" />
                  <div className="h-4 w-3/4 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
                  <div className="flex gap-2 mb-4">
                    <div className="h-5 w-20 bg-slate-100 rounded" />
                    <div className="h-5 w-20 bg-slate-100 rounded" />
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Aucune offre disponible pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentJobs.map((job) => (
                <div key={job.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between group">
                  <div>
                    {estNouveau(job.date_publication) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full mb-3">
                        <Sparkles size={10} /> Nouveau
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                      {job.titre}
                    </h3>
                    <p className="text-xs text-slate-500 mb-1">
                      {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
                    </p>
                    {job.date_publication && (
                      <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                        <Clock size={10} /> {tempsDepuis(job.date_publication)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                        <MapPin size={10} /> {job.wilaya?.split(" - ")[1] || job.wilaya}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                        <Briefcase size={10} /> {EXPERIENCE_LABELS[job.experience_requise] || job.experience_requise}
                      </span>
                    </div>
                  </div>
                  <Link to={`/jobs/${job.id}`} className="block text-center w-full py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 hover:border-indigo-600">
                    Voir l'offre
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link to="/offres" className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-indigo-200 text-indigo-600 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors">
              Voir toutes les offres <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── POURQUOI TAFTECH ─── */}
      <section className="py-20 bg-white px-4 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">Nos atouts</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Pourquoi choisir TAFTECH?</h2>
            <p className="text-sm text-slate-500">La plateforme de recrutement intelligente en Algérie.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color, border }) => (
              <div key={title} className={`bg-slate-50 border border-slate-200 ${border} rounded-xl p-6 hover:shadow-md transition-all group`}>
                <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL (visiteurs non connectés uniquement) ─── */}
      {!isLogged && (
        <section className="py-20 bg-indigo-600 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">Rejoignez TAFTECH</p>
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Prêt à trouver votre prochaine opportunité ?
            </h2>
            <p className="text-indigo-200 text-sm leading-relaxed max-w-xl mx-auto">
              Candidats et entreprises font confiance à TAFTECH pour leurs recrutements en Algérie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-md">
                <CheckCircle size={16} /> Créer un compte candidat
              </Link>
              <Link to="/recruteurs/inscription" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-400 transition-colors border border-indigo-400">
                <Building2 size={16} /> Publier une offre
              </Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

export default Home;
