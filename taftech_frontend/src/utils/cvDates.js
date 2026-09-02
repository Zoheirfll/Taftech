// Convertit une date brute extraite d'un CV ("Janvier 2026", "2025", "Présent")
// en date ISO (YYYY-MM-DD) ou null — partagé entre useProfilCandidat.js (parsing
// classique) et useOnboardingWizard.js (wizard), pour ne pas dupliquer cette regex.
export const convertDateRaw = (dateStr) => {
  if (!dateStr) return null;
  const lower = dateStr.toLowerCase().trim();
  if (
    lower.includes("présent") ||
    lower.includes("present") ||
    lower.includes("aujourd") ||
    lower.includes("en cours")
  )
    return null;
  const mois = {
    janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", août: "08", aout: "08",
    septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
  };
  const matchMoisAnnee = lower.match(/([a-zà-ÿ]+)\s+(\d{4})/);
  if (matchMoisAnnee)
    return `${matchMoisAnnee[2]}-${mois[matchMoisAnnee[1]] || "01"}-01`;
  const matchAnnee = lower.match(/(\d{4})/);
  if (matchAnnee) return `${matchAnnee[1]}-01-01`;
  return null;
};
