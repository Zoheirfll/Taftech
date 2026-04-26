import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../Services/jobsService";

const OffresParSecteur = () => {
  const [secteurs, setSecteurs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Petit dictionnaire d'icônes pour rendre ça plus beau que sur Emploitic
  const iconsMap = {
    IT: "💻",
    FINANCE: "💰",
    COMMERCIAL: "🤝",
    PRODUCTION: "⚙️",
    LOGISTIQUE: "📦",
    MARKETING: "📢",
    BTP: "🏗️",
    ADMIN: "📁",
    SANTE: "🏥",
    INGENIERIE: "🧪",
    RH: "👥",
    TOURISME: "🏨",
    MAINTENANCE: "🛠️",
    JURIDIQUE: "⚖️",
    AUTRE: "✨",
  };

  useEffect(() => {
    const fetchSecteurs = async () => {
      try {
        const data = await jobsService.getConstants();
        setSecteurs(data.secteurs);
      } catch (error) {
        console.error("Erreur secteurs", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSecteurs();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen py-12 font-sans">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* En-tête */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100 mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">
            Offres d'emploi en Algérie par{" "}
            <span className="text-blue-600">Secteur</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Explorez les opportunités professionnelles selon votre expertise
            métier.
          </p>
        </div>

        {/* Grille des Secteurs */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {secteurs.map((secteur, index) => (
              <Link
                key={index}
                to={`/offres?specialite=${encodeURIComponent(secteur.value)}`}
                className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex items-center gap-6"
              >
                {/* Icône circulaire */}
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-blue-50 transition-colors">
                  {iconsMap[secteur.value] || "💼"}
                </div>

                <div className="flex-1">
                  <h3 className="font-black text-gray-800 group-hover:text-blue-600 transition-colors leading-tight">
                    {secteur.label}
                  </h3>
                  <p className="text-xs text-blue-500 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Voir les offres →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OffresParSecteur;
