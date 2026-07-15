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
import { tw } from "../../theme";

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
    colorKey: "indigo",
  },
  {
    icon: Users,
    title: "Une CVthèque riche et qualifiée",
    desc: "Accédez à une base de profils issus de nombreux secteurs d'activité, du débutant au cadre expérimenté, partout en Algérie.",
    colorKey: "amber",
  },
  {
    icon: Globe,
    title: "Pensé pour le marché algérien",
    desc: "Une plateforme conçue pour répondre aux réalités du recrutement en Algérie, conforme à la réglementation nationale et adaptée aux besoins des entreprises locales.",
    colorKey: "emerald",
  },
  {
    icon: Zap,
    title: "Simple, rapide et sécurisé",
    desc: "Publiez vos offres, gérez vos candidatures et recrutez en toute simplicité depuis une plateforme intuitive et sécurisée.",
    colorKey: "rose",
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
    <div className={`${tw.surfaceMuted} font-sans overflow-x-hidden`}>

      {/* ─── HERO ─── */}
      <section className={`relative pt-24 pb-28 px-4 ${tw.surface} border-b ${tw.borderSubtle}`}>
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">

          <h1 className={`text-4xl md:text-5xl font-extrabold ${tw.textStrong} tracking-tight leading-tight`}>
            Le bon profil. <span className={tw.textPrimary}>La bonne opportunité.</span><br />
            Au bon moment.
          </h1>

          <p className={`text-base ${tw.textMuted700} max-w-xl mx-auto leading-relaxed`}>
            Grâce à un matching intelligent, TAFTECH facilite la rencontre entre les
            entreprises à la recherche de compétences et les candidats en quête de
            nouvelles opportunités professionnelles.
          </p>

          {/* BARRE DE RECHERCHE */}
          <form
            onSubmit={handleInitialSearch}
            className={`w-full max-w-3xl mx-auto mt-8 ${tw.surface} border ${tw.borderBase} rounded-xl shadow-sm flex flex-col md:flex-row overflow-hidden`}
          >
            <div className={`flex-1 flex items-center px-4 py-3 border-b md:border-b-0 md:border-r ${tw.borderBase}`}>
              <Search size={18} className={`${tw.textMuted} mr-3 shrink-0`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Métier, compétence, entreprise..."
                className={`w-full bg-transparent outline-none text-sm font-medium ${tw.textMuted700} ${tw.placeholderMuted}`}
              />
            </div>
            <div className={`flex-1 flex items-center px-4 py-1 border-b md:border-b-0 md:border-r ${tw.borderBase}`}>
              <MapPin size={18} className={`${tw.textMuted} mr-2 shrink-0`} />
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
            <button type="submit" className={`px-6 py-3 ${tw.bgPrimarySolid} text-sm font-semibold transition-colors`}>
              Rechercher
            </button>
          </form>

          {/* CTA non connecté */}
          {!isLogged && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <Link to="/register" className={`w-full sm:w-auto px-6 py-2.5 ${tw.buttonDark} text-sm font-semibold rounded-lg shadow-sm`}>
                Je cherche un emploi
              </Link>
              <Link to="/recruteurs/inscription" className={`w-full sm:w-auto px-6 py-2.5 ${tw.surface} ${tw.textPrimary} border ${tw.borderPrimary200} text-sm font-semibold rounded-lg ${tw.bgPrimaryHover} transition-colors`}>
                Je recrute
              </Link>
            </div>
          )}

          {/* CTA candidat connecté */}
          {isLogged && role === "CANDIDAT" && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <Link to="/profil" className={`w-full sm:w-auto px-6 py-2.5 ${tw.bgPrimarySolid} text-sm font-semibold rounded-lg transition-colors`}>
                Compléter mon profil
              </Link>
              <Link to="/mes-candidatures" className={`w-full sm:w-auto px-6 py-2.5 ${tw.surface} ${tw.textMuted700} border ${tw.borderBase} text-sm font-semibold rounded-lg ${tw.rowHover}`}>
                Mes candidatures
              </Link>
            </div>
          )}

          {/* CTA recruteur connecté */}
          {isLogged && role === "RECRUTEUR" && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <Link to="/creer-offre" className={`w-full sm:w-auto px-6 py-2.5 ${tw.bgPrimarySolid} text-sm font-semibold rounded-lg transition-colors`}>
                Publier une offre
              </Link>
              <Link to="/dashboard" className={`w-full sm:w-auto px-6 py-2.5 ${tw.surface} ${tw.textMuted700} border ${tw.borderBase} text-sm font-semibold rounded-lg ${tw.rowHover}`}>
                Tableau de bord
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className={`py-12 ${tw.bgPrimary}`}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { label: "Candidats inscrits", icon: Users, value: stats.total_candidats },
            { label: "Entreprises partenaires", icon: Building2, value: stats.total_entreprises },
            { label: "Offres à pourvoir", icon: Briefcase, value: stats.total_offres },
          ].map(({ label, icon: Icon, value }) => (
            <div key={label} className="py-4 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 ${tw.bgPrimaryOverlay} rounded-xl flex items-center justify-center mb-1`}>
                <Icon size={20} className={tw.textOnDark} />
              </div>
              {loading ? (
                <div className={`h-9 w-16 ${tw.bgPrimaryOverlay} rounded-lg animate-pulse mx-auto`} />
              ) : (
                <p className={`text-3xl font-extrabold ${tw.textOnDark} tabular-nums`}>{value}</p>
              )}
              <p className={`text-xs font-medium ${tw.textPrimaryOnDark} uppercase tracking-wide`}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── COMMENT ÇA MARCHE (visiteurs non connectés uniquement) ─── */}
      {!isLogged && (
        <section className={`py-20 ${tw.surface} px-4 border-b ${tw.borderSubtle}`}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className={`text-xs font-semibold ${tw.textPrimary} uppercase tracking-widest mb-2`}>Simple & Rapide</p>
              <h2 className={`text-2xl font-extrabold ${tw.textStrong} mb-2`}>Comment ça marche ?</h2>
              <p className={`text-sm ${tw.textMuted700}`}>Trouvez un emploi en 3 étapes simples.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
              {/* Connecteur desktop */}
              <div className={`hidden sm:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px ${tw.bgSlate200} z-0`} />
              {STEPS.map(({ num, icon: Icon, title, desc }) => (
                <div key={num} className="flex flex-col items-center text-center relative z-10">
                  <div className={`w-16 h-16 ${tw.bgPrimary} rounded-2xl flex items-center justify-center mb-5 shadow-md shadow-indigo-200`}>
                    <Icon size={26} className={tw.textOnDark} />
                  </div>
                  <span className={`text-xs font-bold ${tw.textPrimary} mb-1`}>Étape {num}</span>
                  <h3 className={`text-base font-bold ${tw.textStrong} mb-2`}>{title}</h3>
                  <p className={`text-sm ${tw.textMuted700} leading-relaxed`}>{desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link to="/register" className={`inline-flex items-center gap-2 px-6 py-3 ${tw.bgPrimarySolid} text-sm font-bold rounded-xl transition-colors shadow-md shadow-indigo-200`}>
                Commencer gratuitement <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── DERNIÈRES OFFRES ─── */}
      <section className={`py-20 ${tw.surfaceMuted} px-4`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className={`text-xs font-semibold ${tw.textPrimary} uppercase tracking-widest mb-1`}>En direct</p>
              <h2 className={`text-2xl font-extrabold ${tw.textStrong}`}>Dernières offres</h2>
              <p className={`text-sm ${tw.textMuted700} mt-1`}>Opportunités récemment publiées.</p>
            </div>
            <Link to="/offres" className={`hidden md:flex items-center gap-1 text-sm font-semibold ${tw.textPrimary} hover:underline`}>
              Voir tout <ChevronRight size={15} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`${tw.cardColors} rounded-xl p-5 animate-pulse`}>
                  <div className={`h-3 w-16 ${tw.surfaceSubtle} rounded mb-4`} />
                  <div className={`h-4 w-3/4 ${tw.surfaceSubtle} rounded mb-2`} />
                  <div className={`h-3 w-1/2 ${tw.surfaceSubtle} rounded mb-4`} />
                  <div className="flex gap-2 mb-4">
                    <div className={`h-5 w-20 ${tw.surfaceSubtle} rounded`} />
                    <div className={`h-5 w-20 ${tw.surfaceSubtle} rounded`} />
                  </div>
                  <div className={`h-8 ${tw.surfaceSubtle} rounded-lg`} />
                </div>
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className={`text-center py-16 ${tw.textMuted} text-sm`}>
              Aucune offre disponible pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentJobs.map((job) => (
                <div key={job.id} className={`${tw.cardColors} rounded-xl p-5 ${tw.borderPrimaryHover} hover:shadow-sm transition-all flex flex-col justify-between group`}>
                  <div>
                    {estNouveau(job.date_publication) && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.bgWarningSoft} ${tw.textWarning} text-[10px] font-semibold rounded-full mb-3`}>
                        <Sparkles size={10} /> Nouveau
                      </span>
                    )}
                    <h3 className={`text-sm font-semibold ${tw.textStrong} mb-1 line-clamp-2 ${tw.groupHoverTextPrimaryStrong} transition-colors`}>
                      {job.titre}
                    </h3>
                    <p className={`text-xs ${tw.textMuted700} mb-1`}>
                      {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
                    </p>
                    {job.date_publication && (
                      <p className={`text-xs ${tw.textMuted} mb-3 flex items-center gap-1`}>
                        <Clock size={10} /> {tempsDepuis(job.date_publication)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className={tw.jobCardTagNeutral}>
                        <MapPin size={10} /> {job.wilaya?.split(" - ")[1] || job.wilaya}
                      </span>
                      <span className={tw.jobCardTagNeutral}>
                        <Briefcase size={10} /> {EXPERIENCE_LABELS[job.experience_requise] || job.experience_requise}
                      </span>
                    </div>
                  </div>
                  <Link to={`/jobs/${job.id}`} className={`block text-center w-full py-2 ${tw.surfaceMuted} ${tw.ctaGhostHoverPrimary} ${tw.textMuted700} text-xs font-semibold rounded-lg transition-colors border ${tw.borderBase}`}>
                    Voir l'offre
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link to="/offres" className={`inline-flex items-center gap-1.5 px-5 py-2.5 border ${tw.borderPrimary200} ${tw.textPrimary} text-sm font-semibold rounded-xl ${tw.bgPrimaryHover} transition-colors`}>
              Voir toutes les offres <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── POURQUOI TAFTECH ─── */}
      <section className={`py-20 ${tw.surface} px-4 border-t ${tw.borderSubtle}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className={`text-xs font-semibold ${tw.textPrimary} uppercase tracking-widest mb-2`}>Nos atouts</p>
            <h2 className={`text-2xl font-extrabold ${tw.textStrong} mb-2`}>Pourquoi choisir TAFTECH?</h2>
            <p className={`text-sm ${tw.textMuted700}`}>La plateforme de recrutement intelligente en Algérie.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, colorKey }) => (
              <div key={title} className={`${tw.surfaceMuted} border ${tw.borderBase} ${tw.featureColors[colorKey].border} rounded-xl p-6 hover:shadow-md transition-all group`}>
                <div className={`w-11 h-11 ${tw.featureColors[colorKey].icon} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={22} />
                </div>
                <h3 className={`text-base font-bold ${tw.textStrong} mb-2`}>{title}</h3>
                <p className={`text-sm ${tw.textMuted700} leading-relaxed`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL (visiteurs non connectés uniquement) ─── */}
      {!isLogged && (
        <section className={`py-20 ${tw.bgPrimary} px-4`}>
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className={`text-xs font-semibold ${tw.heroTextFaint} uppercase tracking-widest`}>Rejoignez TAFTECH</p>
            <h2 className={`text-3xl font-extrabold ${tw.textOnDark} leading-tight`}>
              Prêt à trouver votre prochaine opportunité ?
            </h2>
            <p className={`${tw.textPrimaryOnDark} text-sm leading-relaxed max-w-xl mx-auto`}>
              Candidats et entreprises font confiance à TAFTECH pour leurs recrutements en Algérie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Link to="/register" className={`inline-flex items-center justify-center gap-2 px-6 py-3 ${tw.surface} ${tw.textPrimaryStrong} text-sm font-bold rounded-xl ${tw.bgPrimaryHover} transition-colors shadow-md`}>
                <CheckCircle size={16} /> Créer un compte candidat
              </Link>
              <Link to="/recruteurs/inscription" className={`inline-flex items-center justify-center gap-2 px-6 py-3 ${tw.bgPrimaryLightSolid} text-sm font-bold rounded-xl transition-colors`}>
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
