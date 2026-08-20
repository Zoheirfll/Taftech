import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";

const STYLES = {
  INFO: "bg-indigo-600 text-white",
  WARNING: "bg-amber-500 text-white",
  SUCCESS: "bg-teal-700 text-white",
};

// Bandeau d'annonce global, géré par l'admin (SiteAnnonce) — au plus une annonce active à la
// fois. Dismissable en sessionStorage (pas localStorage : le contenu change souvent, on ne veut
// pas qu'un utilisateur ne revoie plus jamais les futures annonces après avoir fermé la première).
const SiteAnnonceBar = () => {
  const [annonce, setAnnonce] = useState(null);
  const [ferme, setFerme] = useState(false);

  useEffect(() => {
    jobsService
      .getSiteAnnonce()
      .then((data) => {
        if (data && sessionStorage.getItem(`annonce_fermee_${data.id}`)) return;
        setAnnonce(data);
      })
      .catch((err) => reportError("ECHEC_GET_SITE_ANNONCE", err));
  }, []);

  if (!annonce || ferme) return null;

  const dismiss = () => {
    sessionStorage.setItem(`annonce_fermee_${annonce.id}`, "1");
    setFerme(true);
  };

  return (
    <div className={`w-full px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-3 ${STYLES[annonce.type_annonce] || STYLES.INFO}`}>
      <span>
        {annonce.texte}
        {annonce.lien_url && annonce.lien_label && (
          <a href={annonce.lien_url} className="ml-2 underline font-semibold">
            {annonce.lien_label}
          </a>
        )}
      </span>
      <button onClick={dismiss} className="shrink-0 opacity-80 hover:opacity-100 transition-opacity" title="Fermer">
        <X size={14} />
      </button>
    </div>
  );
};

export default SiteAnnonceBar;
