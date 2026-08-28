import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { jobsService } from "../Services/jobsService";
import { mediaUrl } from "../utils/mediaUrl";
import { reportError } from "../utils/errorReporter";

// Carrousel de bannières promotionnelles, géré par l'admin (BanniereAccueil) — défilement auto
// toutes les 6s, pause au survol. Ne rend rien si aucune bannière active (pas de placeholder
// vide sur la page d'accueil).
const BanniereCarousel = () => {
  const [bannieres, setBannieres] = useState([]);
  const [index, setIndex] = useState(0);
  const [pause, setPause] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    jobsService
      .getBannieresAccueil()
      .then(setBannieres)
      .catch((err) => reportError("ECHEC_GET_BANNIERES_ACCUEIL", err));
  }, []);

  useEffect(() => {
    if (bannieres.length <= 1 || pause) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % bannieres.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [bannieres.length, pause]);

  if (bannieres.length === 0) return null;

  const banniere = bannieres[index];

  const Wrapper = ({ children }) =>
    banniere.lien_url ? (
      <a href={banniere.lien_url} className="block rounded-2xl overflow-hidden bg-white border border-slate-200">{children}</a>
    ) : (
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200">{children}</div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 mt-8" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
      <Wrapper>
        <img src={mediaUrl(banniere.image)} alt={banniere.titre || "Bannière promotionnelle"} className="w-full h-60 sm:h-80 object-contain bg-white" loading="lazy" />
        {banniere.titre && (
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-slate-800 font-semibold text-sm sm:text-base">{banniere.titre}</p>
          </div>
        )}
      </Wrapper>

      {bannieres.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={() => setIndex((i) => (i - 1 + bannieres.length) % bannieres.length)} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          {bannieres.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-teal-600" : "bg-slate-300"}`}
            />
          ))}
          <button onClick={() => setIndex((i) => (i + 1) % bannieres.length)} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default BanniereCarousel;
