import React from "react";
import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import Seo from "../../Components/Seo";
import { tw } from "../../theme";

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
    <Seo title="Page introuvable" noindex />
    <SearchX size={48} className="text-slate-400" />
    <h1 className={`${tw.pageTitleGrand} mt-4`}>Page introuvable</h1>
    <p className={`mt-2 text-base ${tw.textMuted700}`}>Cette page n'existe pas ou a été déplacée.</p>
    <div className="mt-6 flex flex-wrap gap-3 justify-center">
      <Link to="/" className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Retour à l'accueil</Link>
      <Link to="/offres" className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200">Voir les offres</Link>
    </div>
  </div>
);

export default NotFound;
