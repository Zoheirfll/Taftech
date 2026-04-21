import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";

const AdminStatistiques = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Assure-toi d'avoir cette fonction dans ton jobsService.js :
        // getAdminStats: async () => (await api.get("jobs/admin/statistiques/")).data
        const data = await jobsService.getAdminStats();
        setStats(data);
      } catch (err) {
        (toast.error("Erreur lors du chargement des statistiques."),
          console.error(err));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center p-20 font-bold text-blue-600 animate-pulse">
        Chargement de la vue d'ensemble...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Vue d'ensemble</h1>
        <p className="text-gray-500 font-bold mt-2">
          Bienvenue dans le centre de contrôle TafTech.
        </p>
      </div>

      {/* ALERTES (Actions requises) */}
      {(stats.offres_attente > 0 || stats.entreprises_attente > 0) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-2xl shadow-sm">
          <h2 className="text-red-800 font-black text-lg mb-2">
            ⚠️ Actions requises
          </h2>
          <div className="flex gap-6">
            {stats.entreprises_attente > 0 && (
              <p className="text-sm font-bold text-red-600">
                🏢{" "}
                <span className="font-black text-lg">
                  {stats.entreprises_attente}
                </span>{" "}
                entreprise(s) en attente de validation.
              </p>
            )}
            {stats.offres_attente > 0 && (
              <p className="text-sm font-bold text-red-600">
                💼{" "}
                <span className="font-black text-lg">
                  {stats.offres_attente}
                </span>{" "}
                offre(s) en attente de modération.
              </p>
            )}
          </div>
        </div>
      )}

      {/* CARTES KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* KPI Utilisateurs */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 transition hover:shadow-md">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl">
            👥
          </div>
          <div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">
              Candidats
            </p>
            <p className="text-3xl font-black text-gray-900">
              {stats.total_candidats}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 transition hover:shadow-md">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-3xl">
            👔
          </div>
          <div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">
              Recruteurs
            </p>
            <p className="text-3xl font-black text-gray-900">
              {stats.total_recruteurs}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 transition hover:shadow-md">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-3xl">
            🏢
          </div>
          <div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">
              Entreprises Totales
            </p>
            <p className="text-3xl font-black text-gray-900">
              {stats.total_entreprises}
            </p>
          </div>
        </div>

        {/* KPI Offres */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 transition hover:shadow-md">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl">
            📊
          </div>
          <div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">
              Offres publiées
            </p>
            <p className="text-3xl font-black text-gray-900">
              {stats.total_offres}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 transition hover:shadow-md">
          <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center text-3xl">
            ⏳
          </div>
          <div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">
              Offres en attente
            </p>
            <p className="text-3xl font-black text-gray-900">
              {stats.offres_attente}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistiques;
