import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";

const AdminStatistiques = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await jobsService.getAdminStats();
        setStats(data);
      } catch (err) {
        alert("Erreur lors du chargement des statistiques.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats)
    return (
      <div className="p-20 text-center font-bold animate-pulse text-blue-600">
        Chargement des données...
      </div>
    );

  return (
    <div>
      <h2 className="text-3xl font-black text-gray-900 mb-8">
        Vue d'ensemble TafTech
      </h2>

      {/* Grille des KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Carte Offres */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Offres d'emploi
          </p>
          <div className="mt-4 flex items-end justify-between">
            <h3 className="text-5xl font-black text-gray-900">
              {stats.total_offres}
            </h3>
            {stats.offres_attente > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">
                {stats.offres_attente} en attente
              </span>
            )}
          </div>
        </div>

        {/* Carte Entreprises */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-purple-600">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Entreprises
          </p>
          <div className="mt-4 flex items-end justify-between">
            <h3 className="text-5xl font-black text-gray-900">
              {stats.total_entreprises}
            </h3>
            {stats.entreprises_attente > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">
                {stats.entreprises_attente} à vérifier
              </span>
            )}
          </div>
        </div>

        {/* Carte Candidats */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-600">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Candidats Inscrits
          </p>
          <div className="mt-4 flex items-end justify-between">
            <h3 className="text-5xl font-black text-gray-900">
              {stats.total_candidats}
            </h3>
            <span className="text-sm font-bold text-gray-400">
              En recherche
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistiques;
