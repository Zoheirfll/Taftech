import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";
import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";
import { authService } from "../Services/authService";
import {
  MapPin,
  Search,
  Briefcase,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const isLogged = authService.isAuthenticated();
  const role = authService.getUserRole();

  const [constants, setConstants] = useState({ wilayas: [] });
  const [search, setSearch] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [stats, setStats] = useState({
    total_offres: 0,
    total_entreprises: 0,
    total_candidats: 0,
    total_recrutements: 0,
  });
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
      {/* HERO */}
      <section className="relative pt-24 pb-28 px-4 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-2">
            <Sparkles size={13} className="text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700">
              Matching IA · Plateforme algérienne
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Trouvez votre prochain{" "}
            <span className="text-indigo-600">talent</span> ou votre prochaine{" "}
            <span className="text-indigo-600">opportunité</span>
          </h1>

          <p className="text-base text-slate-500 max-w-xl mx-auto">
            TafTech connecte les entreprises algériennes aux profils qualifiés
            grâce à un moteur de matching par intelligence artificielle.
          </p>

          {/* BARRE DE RECHERCHE */}
          <form
            onSubmit={handleInitialSearch}
            className="w-full max-w-3xl mx-auto mt-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-0 overflow-hidden"
          >
            <div className="flex-1 flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-slate-200">
              <Search size={18} className="text-slate-400 mr-3 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Métier, compétence, entreprise..."
                className="w-full bg-transparent outline-none text-sm font-medium text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-1 border-b md:border-b-0 md:border-r border-slate-200">
              <MapPin size={18} className="text-slate-400 mr-2 flex-shrink-0" />
              <Select
                options={constants.wilayas}
                onChange={(opt) => setWilaya(opt ? opt.value : "")}
                value={
                  constants.wilayas.find((w) => w.value === wilaya) || null
                }
                placeholder="Wilaya..."
                isClearable
                className="w-full text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    border: 0,
                    boxShadow: "none",
                    backgroundColor: "transparent",
                    minHeight: "36px",
                    cursor: "pointer",
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999,
                    borderRadius: "0.5rem",
                    marginTop: "8px",
                  }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
                menuPortalTarget={document.body}
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Rechercher
            </button>
          </form>

          {/* CTA — masqué si connecté */}
          {!isLogged && (
            <div className="flex flex-col md:flex-row gap-3 justify-center items-center pt-6">
              <Link
                to="/register"
                className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors shadow-sm"
              >
                Je cherche un emploi
              </Link>
              <Link
                to="/register-entreprise"
                className="w-full md:w-auto px-6 py-2.5 bg-white text-indigo-600 border border-indigo-200 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Je recrute
              </Link>
            </div>
          )}

          {/* CTA connecté */}
          {isLogged && role === "CANDIDAT" && (
            <div className="flex flex-col md:flex-row gap-3 justify-center items-center pt-6">
              <Link
                to="/profil"
                className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Compléter mon profil
              </Link>
              <Link
                to="/mes-candidatures"
                className="w-full md:w-auto px-6 py-2.5 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Mes candidatures
              </Link>
            </div>
          )}

          {isLogged && role === "RECRUTEUR" && (
            <div className="flex flex-col md:flex-row gap-3 justify-center items-center pt-6">
              <Link
                to="/creer-offre"
                className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Publier une offre
              </Link>
              <Link
                to="/dashboard"
                className="w-full md:w-auto px-6 py-2.5 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Tableau de bord
              </Link>
            </div>
          )}
        </div>
      </section>
      {/* STATS */}
      <section className="py-12 bg-indigo-600">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            {
              label: "Talents inscrits",
              value: stats.total_candidats,
              icon: Users,
            },
            {
              label: "Entreprises partenaires",
              value: stats.total_entreprises,
              icon: Building2,
            },
            {
              label: "Offres à pourvoir",
              value: stats.total_offres,
              icon: Briefcase,
            },
            {
              label: "Recrutements réalisés",
              value: stats.total_recrutements || 0,
              icon: Sparkles,
            },
          ].map(({ label, value }) => (
            <div key={label} className="py-4">
              <p className="text-3xl font-bold text-white tabular-nums mb-1">
                {loading ? "—" : value}
              </p>
              <p className="text-xs font-medium text-indigo-200 uppercase tracking-wide">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>
      {/* DERNIÈRES OFFRES */}
      <section className="py-20 bg-slate-50 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Dernières offres
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Opportunités récemment publiées.
              </p>
            </div>
            <Link
              to="/offres"
              className="text-sm font-semibold text-indigo-600 hover:underline hidden md:block"
            >
              Voir tout →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full mb-3">
                      <Sparkles size={10} />
                      Nouveau
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">
                      {job.titre}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                        <MapPin size={10} />
                        {job.wilaya?.split(" - ")[1] || job.wilaya}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                        <Briefcase size={10} />
                        {job.experience_requise}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="block text-center w-full py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 hover:border-indigo-600"
                  >
                    Voir l'offre
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-center md:hidden">
            <Link
              to="/offres"
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              Voir tout →
            </Link>
          </div>
        </div>
      </section>
      {/* POURQUOI TAFTECH */}
      <section className="py-20 bg-white px-4 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Pourquoi TafTech ?
            </h2>
            <p className="text-sm text-slate-500">
              La plateforme de recrutement intelligente en Algérie.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "Matching IA",
                desc: "Notre algorithme analyse les profils et les offres pour proposer les candidatures les plus pertinentes.",
                color: "bg-indigo-50 text-indigo-600",
              },
              {
                icon: Users,
                title: "Base de talents",
                desc: "Accédez à une CVthèque qualifiée de profils algériens dans tous les secteurs d'activité.",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: Building2,
                title: "Fait pour l'Algérie",
                desc: "Conçu pour le marché local, conforme aux réglementations et adapté aux réalités du terrain.",
                color: "bg-emerald-50 text-emerald-600",
              },
            ].map(({ title, desc, color }) => (
              <div
                key={title}
                className="bg-slate-50 border border-slate-200 rounded-xl p-6"
              >
                <div
                  className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-4`}
                ></div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CONTACT */}
      <section className="py-16 bg-slate-900 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-lg font-bold text-white">Une question ?</h2>
          <p className="text-sm text-slate-400">
            Notre équipe est disponible pour vous accompagner.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center pt-2">
            <div className="bg-slate-800 px-6 py-4 rounded-xl border border-slate-700 text-center">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                Email
              </p>
              <p className="text-sm font-semibold text-white">
                taftech963@gmail.com
              </p>
            </div>
            <div className="bg-slate-800 px-6 py-4 rounded-xl border border-slate-700 text-center">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                Localisation
              </p>
              <p className="text-sm font-semibold text-white">Oran, Algérie</p>
            </div>
          </div>
        </div>
      </section>{" "}
    </div>
  );
};

export default Home;
