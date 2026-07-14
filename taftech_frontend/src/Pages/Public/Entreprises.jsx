import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl as getMediaUrl } from "../../utils/mediaUrl";
import { Building2, MapPin, Users, Briefcase, Search, ChevronDown, X } from "lucide-react";

const TAILLE_LABELS = {
  TPE: "TPE (< 10 salariés)",
  PME: "PME (10–250 salariés)",
  ETI: "ETI (250–5 000 salariés)",
  GRANDE_ENTREPRISE: "Grande entreprise (> 5 000)",
  STARTUP: "Startup",
};

const LogoEntreprise = ({ url, nom }) => {
  const [err, setErr] = React.useState(false);
  return (
    <div className="w-16 h-16 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
      {url && !err ? (
        <img src={url} alt={nom} className="w-full h-full object-contain p-1.5" onError={() => setErr(true)} />
      ) : (
        <Building2 size={26} className="text-slate-300" />
      )}
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse flex flex-col">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-16 h-16 bg-slate-100 rounded-xl shrink-0" />
      <div className="flex-1 pt-1 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-2 mb-4 flex-1">
      <div className="h-3 bg-slate-100 rounded w-2/3" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
      <div className="h-3 bg-slate-100 rounded w-full" />
      <div className="h-3 bg-slate-100 rounded w-4/5" />
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
      <div className="h-7 w-24 bg-slate-100 rounded-full" />
      <div className="h-8 w-24 bg-slate-100 rounded-xl" />
    </div>
  </div>
);

const TRIS = [
  { value: "", label: "Plus récentes" },
  { value: "nom", label: "Nom A→Z" },
  { value: "offres", label: "Plus d'offres" },
];

const Entreprises = () => {
  const [entreprises, setEntreprises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tri, setTri] = useState("");
  const [showTri, setShowTri] = useState(false);
  const triRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (triRef.current && !triRef.current.contains(e.target)) setShowTri(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const fetchEntreprises = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (tri) params.append("tri", tri);
        const res = await api.get(`jobs/entreprises/?${params}`);
        setEntreprises(res.data);
      } catch (err) {
        reportError("ECHEC_LISTE_ENTREPRISES", err);
      } finally {
        setLoading(false);
      }
    };
    const delay = setTimeout(fetchEntreprises, 300);
    return () => clearTimeout(delay);
  }, [search, tri]);

  const triLabel = TRIS.find((t) => t.value === tri)?.label || "Trier par";
  const hasFilter = search || tri;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-linear-to-br from-indigo-700 to-indigo-500">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Entreprises</h1>
          <p className="text-indigo-200 text-base">Découvrez les entreprises qui recrutent sur TAFTECH</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6">
        {/* Barre recherche + tri */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une entreprise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="relative" ref={triRef}>
            <button
              onClick={() => setShowTri(!showTri)}
              className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors min-w-44"
            >
              {triLabel}
              <ChevronDown size={15} className={`ml-auto transition-transform ${showTri ? "rotate-180" : ""}`} />
            </button>
            {showTri && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 min-w-44 overflow-hidden">
                {TRIS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setTri(t.value); setShowTri(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${tri === t.value ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Compteur */}
        {!loading && (
          <p className="text-sm text-slate-500 mb-6">
            <span className="font-bold text-slate-800">{entreprises.length}</span>{" "}
            entreprise{entreprises.length > 1 ? "s" : ""} trouvée{entreprises.length > 1 ? "s" : ""}
          </p>
        )}

        {/* Grille */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : entreprises.length === 0 ? (
          <div className="text-center py-32">
            <Building2 size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-semibold text-slate-700 text-lg mb-1">Aucune entreprise trouvée</p>
            <p className="text-sm text-slate-400 mb-6">
              {hasFilter ? "Aucun résultat pour votre recherche." : "Aucune entreprise disponible pour l'instant."}
            </p>
            {hasFilter && (
              <button
                onClick={() => { setSearch(""); setTri(""); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <X size={14} /> Réinitialiser la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
            {entreprises.map((e) => {
              const nbOffres = e.offres_actives?.length || 0;
              return (
                <div
                  key={e.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col group"
                >
                  {/* Logo + nom */}
                  <div className="flex items-start gap-4 mb-4">
                    <LogoEntreprise url={getMediaUrl(e.logo_url)} nom={e.nom_entreprise} />
                    <div className="flex-1 min-w-0 pt-1">
                      <h2 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 mb-1.5 group-hover:text-indigo-700 transition-colors">
                        {e.nom_entreprise}
                      </h2>
                      {e.secteur_activite && (
                        <span className="inline-block text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                          {e.secteur_activite}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="flex flex-col gap-2 mb-4 flex-1">
                    {e.wilaya_siege && (
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        {e.wilaya_siege?.split(" - ")[1] || e.wilaya_siege}
                        {e.commune_siege ? ` · ${e.commune_siege}` : ""}
                      </span>
                    )}
                    {e.taille_entreprise && (
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <Users size={13} className="text-slate-400 shrink-0" />
                        {TAILLE_LABELS[e.taille_entreprise] || e.taille_entreprise}
                      </span>
                    )}
                    {e.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mt-1">
                        {e.description}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${nbOffres > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                      <Briefcase size={12} />
                      {nbOffres} offre{nbOffres > 1 ? "s" : ""} active{nbOffres > 1 ? "s" : ""}
                    </span>
                    <Link
                      to={`/entreprise/${e.slug}`}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      Consulter →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Entreprises;
