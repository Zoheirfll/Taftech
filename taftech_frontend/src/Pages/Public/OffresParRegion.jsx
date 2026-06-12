import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { MapPin } from "lucide-react";

const OffresParRegion = () => {
  const [wilayas, setWilayas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setWilayas(data.wilayas);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_WILAYAS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConstants();
  }, []);

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
            Offres par <span className="text-indigo-600">wilaya</span>
          </h1>
          <p className="text-base text-slate-500">
            Sélectionnez votre wilaya pour voir les postes disponibles près de chez vous.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
              {wilayas.map((wilaya, index) => (
                <Link
                  key={index}
                  to={`/offres?wilaya=${encodeURIComponent(wilaya.value)}`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-colors group"
                >
                  <MapPin size={15} className="text-slate-400 group-hover:text-indigo-500 shrink-0" />
                  <span className="text-base font-medium">{wilaya.label}</span>
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
