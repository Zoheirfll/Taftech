import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";
import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter"; // ✅ Import de la Télémétrie

const Home = () => {
  const navigate = useNavigate();
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

        if (jobsData.results) {
          setRecentJobs(jobsData.results.slice(0, 3));
        }
      } catch (error) {
        // 🛑 Remplacement de console.error par reportError
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
    <div className="bg-white font-sans overflow-x-hidden">
      {/* ========================================= */}
      {/* SECTION 1 : HERO & RECHERCHE              */}
      {/* ========================================= */}
      <section className="relative pt-20 pb-32 px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto text-center space-y-6 relative z-10">
          <h1 className="text-6xl md:text-7xl font-black text-blue-700 tracking-tighter mb-2">
            TAFTECH
          </h1>
          <p className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Connecter les talents aux opportunités
          </p>
          <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto pb-8">
            Des milliers d'opportunités n'attendent que vous en Algérie. Lancez
            votre carrière ou trouvez le candidat idéal dès aujourd'hui.
          </p>

          {/* LA BARRE DE RECHERCHE */}
          <form
            onSubmit={handleInitialSearch}
            className="w-full max-w-4xl mx-auto bg-white p-4 md:p-3 rounded-full shadow-2xl flex flex-col md:flex-row gap-3 border border-gray-100"
          >
            <div className="flex-1 flex items-center bg-gray-50 rounded-full px-6 py-3 md:py-0 border border-transparent focus-within:border-blue-500 transition">
              <span className="text-xl mr-3">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Métier, mot-clé, entreprise..."
                className="w-full bg-transparent outline-none font-bold text-gray-700 placeholder-gray-400"
              />
            </div>

            <div className="flex-1 flex items-center bg-gray-50 rounded-full px-6 py-1 md:py-0 border border-transparent focus-within:border-blue-500 transition relative">
              <span className="text-xl mr-3 z-10">📍</span>
              <Select
                options={constants.wilayas}
                onChange={(selectedOption) =>
                  setWilaya(selectedOption ? selectedOption.value : "")
                }
                value={
                  constants.wilayas.find((w) => w.value === wilaya) || null
                }
                placeholder="Wilaya (ex: Alger...)"
                isClearable
                className="w-full font-bold text-gray-700"
                styles={{
                  control: (base) => ({
                    ...base,
                    border: 0,
                    boxShadow: "none",
                    backgroundColor: "transparent",
                    cursor: "text",
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 50,
                    borderRadius: "1rem",
                    overflow: "hidden",
                  }),
                }}
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-4 rounded-full transition-transform hover:scale-105 shadow-lg z-10 w-full md:w-auto"
            >
              Rechercher
            </button>
          </form>

          {/* LES BOUTONS D'APPEL À L'ACTION */}
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center pt-12">
            <Link
              to="/register"
              className="w-full md:w-auto bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:-translate-y-1 hover:bg-black transition-all"
            >
              👨‍💻 JE SUIS CANDIDAT
            </Link>
            <Link
              to="/register-entreprise"
              className="w-full md:w-auto bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-2xl font-black shadow-xl hover:-translate-y-1 hover:bg-blue-50 transition-all"
            >
              🏢 JE SUIS EMPLOYEUR
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================= */}
      {/* SECTION 2 : STATISTIQUES EN TEMPS RÉEL    */}
      {/* ========================================= */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-blue-400">
          <div className="py-4 md:py-0">
            <p className="text-5xl font-black mb-2">
              {loading ? "..." : stats.total_candidats}
            </p>
            <p className="text-sm font-bold tracking-widest text-blue-200 uppercase">
              Talents Inscrits
            </p>
          </div>
          <div className="py-4 md:py-0 border-l border-blue-400 md:border-l-0">
            <p className="text-5xl font-black mb-2">
              {loading ? "..." : stats.total_entreprises}
            </p>
            <p className="text-sm font-bold tracking-widest text-blue-200 uppercase">
              Entreprises Partenaires
            </p>
          </div>
          <div className="py-4 md:py-0 border-t md:border-t-0 border-blue-400">
            <p className="text-5xl font-black mb-2">
              {loading ? "..." : stats.total_offres}
            </p>
            <p className="text-sm font-bold tracking-widest text-blue-200 uppercase">
              Offres à pourvoir
            </p>
          </div>
          <div className="py-4 md:py-0 border-t border-l md:border-t-0 border-blue-400">
            <p className="text-5xl font-black mb-2 text-green-300">
              {loading ? "..." : stats.total_recrutements || 0}
            </p>
            <p className="text-sm font-bold tracking-widest text-blue-200 uppercase">
              Recrutements Réalisés
            </p>
          </div>
        </div>
      </section>

      {/* ========================================= */}
      {/* SECTION 3 : DERNIÈRES OFFRES              */}
      {/* ========================================= */}
      <section className="py-24 bg-gray-50 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
                Dernières Offres
              </h2>
              <p className="text-gray-500 font-medium">
                Découvrez les opportunités récemment publiées.
              </p>
            </div>
            <Link
              to="/offres"
              className="hidden md:block text-blue-600 font-black hover:underline"
            >
              Voir tout ➔
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-10 font-bold text-blue-600 animate-pulse">
              Chargement des offres...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all flex flex-col justify-between h-full"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md mb-4 inline-block">
                      Nouveau
                    </span>
                    <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-2">
                      {job.titre}
                    </h3>
                    <p className="text-sm font-bold text-gray-500 mb-6">
                      🏢{" "}
                      {job.entreprise?.nom_entreprise || "Entreprise Anonyme"}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase px-2 py-1 rounded">
                        📍 {job.wilaya.split(" - ")[0]}
                      </span>
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase px-2 py-1 rounded">
                        💼 {job.experience_requise}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="block text-center w-full py-3 bg-gray-50 hover:bg-blue-600 hover:text-white text-gray-900 font-black rounded-xl transition-colors text-sm"
                  >
                    Découvrir
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 text-center md:hidden">
            <Link
              to="/offres"
              className="text-blue-600 font-black hover:underline"
            >
              Voir tout ➔
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================= */}
      {/* SECTION 4 : PRÉSENTATION TAFTECH          */}
      {/* ========================================= */}
      <section className="py-24 bg-white px-4 border-t border-gray-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="text-5xl block mb-6">🚀</span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">
            Pourquoi choisir TafTech ?
          </h2>
          <p className="text-lg text-gray-600 font-medium leading-relaxed">
            TafTech est la nouvelle plateforme de recrutement intelligente en
            Algérie. Notre mission est de simplifier la rencontre entre les
            entreprises à la recherche de profils qualifiés et les talents en
            quête de nouveaux défis professionnels. Grâce à notre moteur de
            matching par Intelligence Artificielle, nous mettons en avant les CV
            les plus pertinents pour chaque poste.
          </p>
        </div>
      </section>

      {/* ========================================= */}
      {/* SECTION 5 : CONTACT                       */}
      {/* ========================================= */}
      <section className="py-20 bg-gray-900 text-white px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-black">
            Besoin d'aide ou d'informations ?
          </h2>
          <p className="text-gray-400 font-medium">
            Notre équipe est à votre disposition pour vous accompagner dans vos
            recrutements ou votre recherche d'emploi.
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center pt-6">
            <div className="bg-gray-800 p-6 rounded-2xl w-full md:w-64 border border-gray-700">
              <span className="text-2xl block mb-2">✉️</span>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                Email
              </p>
              <p className="font-black text-sm">contact@taftech.dz</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl w-full md:w-64 border border-gray-700">
              <span className="text-2xl block mb-2">📞</span>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                Téléphone
              </p>
              <p className="font-black text-sm">+213 (0) 555 12 34 56</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
