import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const AdminStatistiques = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await jobsService.getAdminStats();
      setStats(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des statistiques.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">
            Contrôle global TafTech
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-3 hover:bg-gray-100 rounded-2xl transition-all"
        >
          🔄
        </button>
      </div>

      {/* SECTION CRITIQUE (ALERTES) */}
      {(stats.offres_attente > 0 || stats.entreprises_attente > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin-taftech/entreprises"
            className="bg-orange-50 border-2 border-orange-100 p-5 rounded-[2rem] flex items-center gap-4 hover:border-orange-400 transition-all"
          >
            <span className="text-2xl">⚠️</span>
            <p className="text-sm font-black text-orange-900">
              {stats.entreprises_attente} Entreprise(s) attendent votre
              validation
            </p>
          </Link>
          <Link
            to="/admin-taftech/offres"
            className="bg-red-50 border-2 border-red-100 p-5 rounded-[2rem] flex items-center gap-4 hover:border-red-400 transition-all"
          >
            <span className="text-2xl">🚨</span>
            <p className="text-sm font-black text-red-900">
              {stats.offres_attente} Offre(s) attendent votre modération
            </p>
          </Link>
        </div>
      )}

      {/* GRILLE DES KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARTE : CANDIDATS */}
        <StatCard
          icon="👥"
          label="Candidats"
          value={stats.total_candidats}
          color="blue"
        />

        {/* CARTE : RECRUTEURS */}
        <StatCard
          icon="👔"
          label="Recruteurs"
          value={stats.total_recruteurs}
          color="purple"
        />

        {/* CARTE : RECRUTEMENTS RÉUSSIS */}
        <StatCard
          icon="🎉"
          label="Recrutements"
          value={stats.total_recrutements}
          color="pink"
        />

        {/* CARTE : ENTREPRISES TOTALES */}
        <StatCard
          icon="🏢"
          label="Entreprises"
          value={stats.total_entreprises}
          color="emerald"
        />

        {/* CARTE : ENTREPRISES EN ATTENTE */}
        <StatCard
          icon="⏳"
          label="Entreprises en attente"
          value={stats.entreprises_attente}
          color="orange"
        />

        {/* CARTE : OFFRES PUBLIÉES */}
        <StatCard
          icon="📊"
          label="Offres publiées"
          value={stats.total_offres}
          color="indigo"
        />

        {/* CARTE : OFFRES EN ATTENTE */}
        <StatCard
          icon="📁"
          label="Offres en attente"
          value={stats.offres_attente}
          color="red"
        />
      </div>
    </div>
  );
};

// COMPOSANT RÉUTILISABLE POUR LES CARTES
const StatCard = ({ icon, label, value, color }) => {
  const styles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    pink: "bg-pink-50 text-pink-600 border-pink-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <div
      className={`p-8 rounded-[2.5rem] bg-white border-2 ${styles[color]} shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-2 ${styles[color].split(" ")[0]} ${styles[color].split(" ")[1]}`}
      >
        {icon}
      </div>
      <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">
        {label}
      </p>
      <p className="text-4xl font-black text-gray-900">{value}</p>
    </div>
  );
};

export default AdminStatistiques;
