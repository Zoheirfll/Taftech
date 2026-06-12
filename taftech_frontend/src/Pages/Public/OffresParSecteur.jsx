import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";

const iconsMap = {
  IT: "💻", FINANCE: "💰", COMMERCIAL: "🤝", PRODUCTION: "⚙️",
  LOGISTIQUE: "📦", MARKETING: "📢", BTP: "🏗️", ADMIN: "📁",
  SANTE: "🏥", INGENIERIE: "🧪", RH: "👥", TOURISME: "🏨",
  MAINTENANCE: "🛠️", JURIDIQUE: "⚖️", AUTRE: "✨",
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
    <div className="bg-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
            Offres par <span className="text-indigo-600">secteur</span>
          </h1>
          <p className="text-base text-slate-500">
            Explorez les opportunités selon votre expertise métier.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {secteurs.map((secteur, index) => (
              <Link
                key={index}
                to={`/offres?specialite=${encodeURIComponent(secteur.value)}`}
                className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-5"
              >
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-indigo-50 transition-colors shrink-0">
                  {iconsMap[secteur.value] || "💼"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {secteur.label}
                  </h3>
                  <p className="text-sm text-indigo-500 font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
