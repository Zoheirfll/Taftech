import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";

const Home = () => {
  const navigate = useNavigate();
  const [constants, setConstants] = useState({ wilayas: [] });

  // États simples pour la barre de recherche de l'accueil
  const [search, setSearch] = useState("");
  const [wilaya, setWilaya] = useState("");

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
      } catch (error) {
        console.error("Erreur de chargement des constantes", error);
      }
    };
    fetchConstants();
  }, []);

  const handleInitialSearch = (e) => {
    e.preventDefault();
    // On construit l'URL avec les paramètres et on redirige !
    const queryParams = new URLSearchParams();
    if (search) queryParams.append("search", search);
    if (wilaya) queryParams.append("wilaya", wilaya);

    navigate(`/offres?${queryParams.toString()}`);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center bg-gray-50 px-4">
      <div className="text-center mb-10 space-y-4">
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter">
          Trouvez le job de vos <span className="text-blue-600">rêves</span> en
          Algérie
        </h1>
        <p className="text-xl text-gray-500 font-medium">
          Des milliers d'opportunités n'attendent que vous sur TafTech.
        </p>
      </div>

      <form
        onSubmit={handleInitialSearch}
        className="w-full max-w-5xl bg-white p-4 md:p-3 rounded-full shadow-2xl flex flex-col md:flex-row gap-3 border border-gray-100"
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
            value={constants.wilayas.find((w) => w.value === wilaya) || null}
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
              menu: (base) => ({ ...base, zIndex: 50 }),
            }}
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-4 rounded-full transition-transform hover:scale-105 shadow-lg z-10"
        >
          Rechercher
        </button>
      </form>
    </div>
  );
};

export default Home;
