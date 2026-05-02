import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { jobsService } from "../Services/jobsService";

const EntreprisePublic = () => {
  const { id } = useParams();
  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEntreprise = async () => {
      try {
        const data = await jobsService.getEntreprisePublic(id);
        setEntreprise(data);
      } catch (err) {
        (setError("Cette entreprise n'existe pas ou n'est plus disponible."),
          console.error(err));
      } finally {
        setLoading(false);
      }
    };
    fetchEntreprise();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold text-blue-600 animate-pulse">
          Chargement de l'entreprise...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-2xl text-red-600 font-black mb-4">😕 {error}</div>
        <Link to="/offres" className="text-blue-600 font-bold hover:underline">
          Voir toutes les offres d'emploi
        </Link>
      </div>
    );
  }

  if (!entreprise) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 mt-6">
      <Link
        to="/offres"
        className="text-gray-500 font-bold hover:text-blue-600 mb-6 inline-flex items-center gap-2 transition hover:-translate-x-1"
      >
        ← Retour aux offres
      </Link>

      {/* EN-TÊTE DE L'ENTREPRISE */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8">
        <div className="h-32 md:h-48 bg-gradient-to-r from-blue-700 to-indigo-800"></div>

        <div className="px-8 md:px-12 pb-10 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 md:-mt-20 mb-6">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl p-2 shadow-lg border-4 border-white flex-shrink-0 flex items-center justify-center overflow-hidden">
              {entreprise.logo_url ? (
                <img
                  src={entreprise.logo_url}
                  alt={`Logo ${entreprise.nom_entreprise}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-6xl">🏢</span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                {entreprise.nom_entreprise}
              </h1>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="bg-gray-100 text-gray-700 text-xs font-black px-3 py-1.5 rounded-lg border border-gray-200">
                  🎯 {entreprise.secteur_activite || "Secteur non défini"}
                </span>
                <span className="bg-gray-100 text-gray-700 text-xs font-black px-3 py-1.5 rounded-lg border border-gray-200">
                  📍 {entreprise.wilaya_siege}{" "}
                  {entreprise.commune_siege
                    ? `- ${entreprise.commune_siege}`
                    : ""}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">
              Présentation
            </h2>
            <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-line">
              {entreprise.description ||
                "Aucune description fournie par l'entreprise pour le moment."}
            </p>
          </div>
        </div>
      </div>

      {/* LISTE DES OFFRES DE L'ENTREPRISE */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
          Offres disponibles{" "}
          <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full">
            {entreprise.offres_actives?.length || 0}
          </span>
        </h2>

        {entreprise.offres_actives && entreprise.offres_actives.length > 0 ? (
          <div className="space-y-4">
            {entreprise.offres_actives.map((offre) => (
              <div
                key={offre.id}
                className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <Link
                    to={`/jobs/${offre.id}`}
                    className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition"
                  >
                    {offre.titre}
                  </Link>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs font-bold text-gray-500">
                      📍 {offre.wilaya}{" "}
                      {offre.commune ? `- ${offre.commune}` : ""}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      📄 {offre.type_contrat}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/jobs/${offre.id}`}
                  className="bg-blue-50 text-blue-700 px-6 py-3 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition whitespace-nowrap"
                >
                  Voir l'offre ➔
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
            <span className="text-4xl mb-4 block">📭</span>
            <h3 className="text-lg font-black text-gray-900">
              Aucune offre ouverte
            </h3>
            <p className="text-gray-500 mt-2">
              L'entreprise ne recrute pas en ce moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntreprisePublic;
