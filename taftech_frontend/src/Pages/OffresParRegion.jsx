import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter"; // ✅ Import de la Télémétrie

const OffresParRegion = () => {
  const [wilayas, setWilayas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On récupère la liste officielle des Wilayas depuis ton backend
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setWilayas(data.wilayas);
      } catch (error) {
        // 🛑 Remplacement de console.error par reportError
        reportError("ECHEC_CHARGEMENT_WILAYAS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConstants();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* En-tête de la page */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100 mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">
            Offres d'emploi en Algérie par{" "}
            <span className="text-blue-600">Wilaya</span>
          </h1>
          <p className="text-gray-500 font-medium max-w-2xl">
            Découvrez toutes les opportunités professionnelles triées par
            région. Sélectionnez votre Wilaya pour voir les postes disponibles
            près de chez vous.
          </p>
        </div>

        {/* La Grille des Wilayas */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100">
            {/* On crée une grille : 1 colonne sur mobile, 2 sur tablette, 4 sur grand écran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {wilayas.map((wilaya, index) => (
                <Link
                  key={index}
                  // L'astuce est ici : on envoie le paramètre dans l'URL !
                  to={`/offres?wilaya=${encodeURIComponent(wilaya.value)}`}
                  className="group flex items-center p-4 border border-gray-100 rounded-2xl hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mr-4 shrink-0">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </div>
                  {/* On enlève le "01 -" pour l'affichage si on veut, mais ici je garde le format officiel pour que ça matche bien avec ta BDD */}
                  <span className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors">
                    {wilaya.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OffresParRegion;
