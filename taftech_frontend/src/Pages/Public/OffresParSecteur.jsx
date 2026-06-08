import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";

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

const OffresParSecteur = () => {
  const [secteurs, setSecteurs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSecteurs = async () => {
      try {
        const data = await jobsService.getConstants();
        setSecteurs(data.secteurs);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_SECTEURS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSecteurs();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
            Offres par <span className="text-indigo-600">secteur</span>
          </h1>
          <p className="text-sm text-slate-500">
            Explorez les opportunités selon votre expertise métier.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {secteurs.map((secteur, index) => (
              <Link
                key={index}
                to={`/offres?specialite=${encodeURIComponent(secteur.value)}`}
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-2xl group-hover:bg-indigo-50 transition-colors flex-shrink-0">
                  {iconsMap[secteur.value] || "💼"}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {secteur.label}
                  </h3>
                  <p className="text-xs text-indigo-500 font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
