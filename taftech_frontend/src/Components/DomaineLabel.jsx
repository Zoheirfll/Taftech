import { useState, useEffect } from "react";
import { jobsService } from "../Services/jobsService";

// Traduit un code Domaine ANEM (ex: "L18") en libellé lisible.
// Affiche le code brut en repli tant que la nomenclature n'est pas chargée
// ou si le code est introuvable (donnée legacy non migrée).
export default function DomaineLabel({ code, prefix = "" }) {
  const [libelle, setLibelle] = useState(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    jobsService.getNomenclature().then((data) => {
      if (cancelled) return;
      const domaine = data.domaines.find((d) => d.code === code);
      setLibelle(domaine ? domaine.libelle : null);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!code) return null;
  return (
    <>
      {prefix}
      {libelle || code}
    </>
  );
}
