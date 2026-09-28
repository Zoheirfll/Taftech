import { useEffect } from "react";

// Ferme une modale avec la touche Échap tant qu'elle est ouverte (`actif`). Partagé par les
// modales du panel admin, qui ne se fermaient jusqu'ici qu'avec le bouton ✕.
const useEchapPourFermer = (actif, onFermer) => {
  useEffect(() => {
    if (!actif) return undefined;
    const handler = (e) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actif, onFermer]);
};

export default useEchapPourFermer;
