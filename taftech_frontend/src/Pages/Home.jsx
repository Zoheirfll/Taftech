import React, { useEffect, useState } from "react";
import { jobsService } from "../Services/jobsService";
import JobCard from "../Components/JobCard";

const Home = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // NOUVEAU : Les états pour la recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [wilaya, setWilaya] = useState("");

  // La fonction qui charge les offres (maintenant elle accepte des filtres)
  const fetchJobs = async (searchQuery = "", wilayaQuery = "") => {
    setLoading(true);
    try {
      const data = await jobsService.getAllJobs(searchQuery, wilayaQuery);
      setJobs(data);
    } catch (err) {
      console.error("Échec du chargement :", err);
    } finally {
      setLoading(false);
    }
  };

  // Au premier chargement de la page (sans filtres)
  useEffect(() => {
    fetchJobs();
  }, []);

  // Quand l'utilisateur clique sur le bouton "Rechercher"
  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs(searchTerm, wilaya); // On relance la requête AVEC les filtres
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
          Trouvez votre futur emploi en{" "}
          <span className="text-green-600">Algérie</span> 🇩🇿
        </h1>
        <p className="text-gray-500 mt-4 text-lg">
          Découvrez les dernières opportunités chez TafTech.
        </p>
      </header>

      {/* NOUVEAU : La Barre de Recherche (Style Emploitic) */}
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

      {/* Affichage des résultats */}
      {loading ? (
        <div className="text-center p-20 font-bold text-blue-600">
          Recherche en cours...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {jobs.length > 0 ? (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          ) : (
            <div className="text-center p-10 bg-gray-100 rounded-lg italic text-gray-600">
              Oups ! Aucune offre ne correspond à votre recherche. Essayez
              d'autres mots-clés.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
