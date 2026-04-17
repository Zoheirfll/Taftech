import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../Services/jobsService"; // Vérifie ton chemin d'import

const Home = () => {
  // --- 1. LES ÉTATS ---
  const [hasSearched, setHasSearched] = useState(false); // Permet de savoir si on a cliqué sur "Rechercher"
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // L'état qui stocke tous nos filtres
  const [filters, setFilters] = useState({
    search: "",
    wilaya: "",
    commune: "",
    diplome: "",
    specialite: "",
    experience: "",
    contrat: "",
  });

  // --- 2. LES FONCTIONS ---
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAllJobs(filters, 1);
      setJobs(data.results || data); // Gère la pagination de Django
    } catch (error) {
      console.error("Erreur lors de la récupération des offres:", error);
    } finally {
      setLoading(false);
    }
  };

  // La fonction du gros bouton "Rechercher" de la page d'accueil
  const handleInitialSearch = (e) => {
    e.preventDefault();
    setHasSearched(true); // On transforme la page !
    fetchJobs(); // On lance la recherche
  };

  // Cette fonction permet de chercher automatiquement quand on modifie un filtre (UNIQUEMENT APRÈS la recherche initiale)
  useEffect(() => {
    if (!hasSearched) return; // Si on est sur l'écran d'accueil, on ne cherche pas automatiquement

    const delayDebounceFn = setTimeout(() => {
      fetchJobs();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [filters, hasSearched]);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleReset = () => {
    setFilters({
      search: "",
      wilaya: "",
      commune: "",
      diplome: "",
      specialite: "",
      experience: "",
      contrat: "",
    });
  };

  // --- 3. L'AFFICHAGE ---

  // VUE 1 : L'ÉCRAN D'ACCUEIL (Avant la recherche)
  if (!hasSearched) {
    return (
      <div className="min-h-[80vh] flex flex-col justify-center items-center bg-gray-50 px-4">
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter">
            Trouvez le job de vos <span className="text-blue-600">rêves</span>{" "}
            en Algérie
          </h1>
          <p className="text-xl text-gray-500 font-medium">
            Des milliers d'opportunités n'attendent que vous sur TafTech.
          </p>
        </div>

        {/* La grande barre de recherche centrale */}
        <form
          onSubmit={handleInitialSearch}
          className="w-full max-w-4xl bg-white p-4 md:p-3 rounded-full shadow-2xl flex flex-col md:flex-row gap-3 border border-gray-100"
        >
          <div className="flex-1 flex items-center bg-gray-50 rounded-full px-6 py-3 md:py-0 border border-transparent focus-within:border-blue-500 transition">
            <span className="text-xl mr-3">🔍</span>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Métier, mot-clé, entreprise..."
              className="w-full bg-transparent outline-none font-bold text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="flex-1 flex items-center bg-gray-50 rounded-full px-6 py-3 md:py-0 border border-transparent focus-within:border-blue-500 transition">
            <span className="text-xl mr-3">📍</span>
            <input
              type="text"
              name="wilaya"
              value={filters.wilaya}
              onChange={handleChange}
              placeholder="Wilaya (ex: Alger, Oran)"
              className="w-full bg-transparent outline-none font-bold text-gray-700 placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-4 rounded-full transition-transform hover:scale-105 shadow-lg"
          >
            Rechercher
          </button>
        </form>
      </div>
    );
  }

  // VUE 2 : LA PAGE DE RÉSULTATS (Design Emploitic)
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row gap-6">
        {/* COLONNE GAUCHE : LES FILTRES */}
        <aside className="w-full md:w-1/3 lg:w-1/4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 sticky top-4">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black text-gray-900">Filtrez par</h2>
              <button
                onClick={handleReset}
                className="text-sm font-bold text-gray-500 hover:text-blue-600 transition"
              >
                Réinitialiser
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Mots-clés / Métier
                </label>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleChange}
                  placeholder="Ex: Développeur..."
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Expérience demandée
                </label>
                <select
                  name="experience"
                  value={filters.experience}
                  onChange={handleChange}
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm cursor-pointer"
                >
                  <option value="">Toutes les expériences</option>
                  <option value="DEBUTANT">Débutant (0 - 1 an)</option>
                  <option value="JUNIOR">Junior (1 - 3 ans)</option>
                  <option value="CONFIRME">Confirmé (3 - 5 ans)</option>
                  <option value="SENIOR">Senior (5 ans et plus)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Type de contrat
                </label>
                <select
                  name="contrat"
                  value={filters.contrat}
                  onChange={handleChange}
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm cursor-pointer"
                >
                  <option value="">Tous les contrats</option>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="ANEM">Contrat ANEM</option>
                  <option value="STAGE">Stage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Spécialité
                </label>
                <input
                  type="text"
                  name="specialite"
                  value={filters.specialite}
                  onChange={handleChange}
                  placeholder="Ex: Finance, Informatique..."
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Diplôme attendu
                </label>
                <input
                  type="text"
                  name="diplome"
                  value={filters.diplome}
                  onChange={handleChange}
                  placeholder="Ex: Master 2..."
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Wilaya
                  </label>
                  <input
                    type="text"
                    name="wilaya"
                    value={filters.wilaya}
                    onChange={handleChange}
                    placeholder="Ex: Alger"
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Commune
                  </label>
                  <input
                    type="text"
                    name="commune"
                    value={filters.commune}
                    onChange={handleChange}
                    placeholder="Ex: Hydra"
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* COLONNE DROITE : LES RÉSULTATS */}
        <main className="w-full md:w-2/3 lg:w-3/4">
          <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
            <h1 className="font-bold text-gray-800">
              {jobs.length} Offres d'emploi trouvées
            </h1>
            <button
              onClick={() => setHasSearched(false)}
              className="text-sm text-blue-600 font-bold hover:underline"
            >
              ← Retour à l'accueil
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <span className="text-blue-600 font-bold animate-pulse text-xl">
                Recherche en cours...
              </span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center shadow-sm">
              <h2 className="text-2xl font-black text-gray-800 mb-2">
                Aucune offre trouvée 😕
              </h2>
              <p className="text-gray-500 mb-6">
                Essayez de modifier vos filtres ou de réinitialiser la
                recherche.
              </p>
              <button
                onClick={handleReset}
                className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-black transition"
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-4"
                >
                  <div>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-xl font-black text-blue-700 hover:underline mb-1 block"
                    >
                      {job.titre}
                    </Link>
                    <div className="text-sm font-bold text-gray-600 mb-4">
                      {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg">
                        📍 {job.wilaya} {job.commune ? `- ${job.commune}` : ""}
                      </span>
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                        💼 {job.experience_requise}
                      </span>
                      <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">
                        📄 {job.type_contrat}
                      </span>
                      {job.specialite && (
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg">
                          🎯 {job.specialite}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center md:items-start justify-end mt-4 md:mt-0">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="bg-blue-50 text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-600 hover:text-white transition"
                    >
                      Voir l'offre
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;
