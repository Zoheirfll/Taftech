import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import { authService } from "../Services/authService"; // 1. IMPORTANT : Importe le service
import JobCard from "../Components/JobCard";

const Home = () => {
  const [jobsData, setJobsData] = useState({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [wilaya, setWilaya] = useState("");

  const [activeSearch, setActiveSearch] = useState("");
  const [activeWilaya, setActiveWilaya] = useState("");

  // 2. On vérifie si l'utilisateur est connecté
  const isLogged = authService.isAuthenticated();

  const fetchJobs = async (searchQuery = "", wilayaQuery = "", page = 1) => {
    setLoading(true);
    try {
      const data = await jobsService.getAllJobs(searchQuery, wilayaQuery, page);
      setJobsData(data);
    } catch (err) {
      console.error("Échec du chargement :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(activeSearch, activeWilaya, currentPage);
  }, [currentPage, activeSearch, activeWilaya]);

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchTerm);
    setActiveWilaya(wilaya);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* --- HEADER PRINCIPAL --- */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
          Trouvez votre futur emploi en{" "}
          <span className="text-green-600">Algérie</span> 🇩🇿
        </h1>
        <p className="text-gray-500 mt-4 text-lg">
          Découvrez les dernières opportunités chez TafTech. ({jobsData.count}{" "}
          offres disponibles)
        </p>
      </header>

      {/* --- 3. MODIFICATION ICI : On n'affiche la bannière QUE si NON connecté --- */}
      {!isLogged && (
        <div className="bg-gray-900 rounded-2xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between shadow-xl border border-gray-800">
          <div className="mb-6 md:mb-0 md:pr-8">
            <h2 className="text-white text-2xl font-bold mb-2">
              Vous êtes un recruteur ?
            </h2>
            <p className="text-gray-400">
              Publiez vos annonces sur TafTech et accédez à une base de profils
              qualifiés. Vérification de compte rapide et sécurisée.
            </p>
          </div>
          <Link
            to="/register-entreprise"
            className="whitespace-nowrap bg-white text-gray-900 px-8 py-4 rounded-xl font-black hover:bg-gray-200 transition duration-300 transform hover:scale-105 shadow-lg"
          >
            Déposer une offre
          </Link>
        </div>
      )}

      {/* --- BARRE DE RECHERCHE --- */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-10 max-w-4xl mx-auto">
        <form
          onSubmit={handleSearch}
          className="flex flex-col md:flex-row gap-4"
        >
          <input
            type="text"
            placeholder="Métier, mot-clé ou entreprise..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="text"
            placeholder="Où ? (ex: Alger, Oran)"
            className="md:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={wilaya}
            onChange={(e) => setWilaya(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200"
          >
            Rechercher
          </button>
        </form>
      </div>

      {/* --- LISTE DES RÉSULTATS --- */}
      {loading ? (
        <div className="text-center p-20 font-bold text-blue-600">
          Chargement des offres...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6">
            {jobsData.results.length > 0 ? (
              jobsData.results.map((job) => <JobCard key={job.id} job={job} />)
            ) : (
              <div className="text-center p-10 bg-gray-100 rounded-lg italic text-gray-600">
                Aucune offre ne correspond à votre recherche.
              </div>
            )}
          </div>

          {/* --- PAGINATION --- */}
          <div className="flex justify-center items-center gap-4 mt-12">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!jobsData.previous}
              className={`px-6 py-2 rounded-lg font-bold transition ${
                jobsData.previous
                  ? "bg-white border border-blue-600 text-blue-600 hover:bg-blue-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              ← Précédent
            </button>

            <span className="text-gray-600 font-medium bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              Page {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!jobsData.next}
              className={`px-6 py-2 rounded-lg font-bold transition ${
                jobsData.next
                  ? "bg-white border border-blue-600 text-blue-600 hover:bg-blue-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Suivant →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
