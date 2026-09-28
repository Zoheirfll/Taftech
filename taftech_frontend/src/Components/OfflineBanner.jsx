import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// Signale la perte de connexion au lieu de laisser des actions échouer sans explication.
const OfflineBanner = () => {
  const [horsLigne, setHorsLigne] = useState(typeof navigator !== "undefined" && navigator.onLine === false);
  useEffect(() => {
    const off = () => setHorsLigne(true);
    const on = () => setHorsLigne(false);
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); };
  }, []);
  if (!horsLigne) return null;
  return (
    <div role="status" className="fixed top-0 inset-x-0 z-[70] bg-amber-500 text-white text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff size={16} /> Vous êtes hors ligne. Vos actions seront possibles dès le retour de la connexion.
    </div>
  );
};

export default OfflineBanner;
