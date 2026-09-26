// Convertit une date brute extraite d'un CV ("Janvier 2026", "Jan. 2026", "01/2026",
// "January 2026", "2025", "Présent") en date ISO (YYYY-MM-DD) ou null — partagé entre
// useProfilCandidat.js (parsing classique) et useOnboardingWizard.js (wizard), pour ne
// pas dupliquer cette regex.
const MOIS = {
  // Français (formes longues + abréviations courantes, avec ou sans point)
  janvier: "01", janv: "01",
  février: "02", fevrier: "02", févr: "02", fevr: "02",
  mars: "03",
  avril: "04", avr: "04",
  mai: "05",
  juin: "06",
  juillet: "07", juil: "07",
  août: "08", aout: "08", aou: "08",
  septembre: "09", sept: "09",
  octobre: "10", oct: "10",
  novembre: "11", nov: "11",
  décembre: "12", decembre: "12", déc: "12", dec: "12",
  // Anglais (certains CV/réponses IA utilisent l'anglais)
  january: "01", jan: "01",
  february: "02", feb: "02",
  march: "03", mar: "03",
  april: "04", apr: "04",
  june: "06", jun: "06",
  july: "07", jul: "07",
  august: "08", aug: "08",
  september: "09", sep: "09",
  october: "10",
  november: "11",
  december: "12",
};

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

  // "Février 2026" / "Fév. 2026" / "February 2026" — mois en toutes lettres (ou abrégé,
  // avec point optionnel) suivi de l'année. Un mois non reconnu (ex: abréviation
  // inhabituelle) ne doit jamais retomber silencieusement sur "01" (janvier) : dans ce
  // cas on ignore le mot et on ne garde que l'année, via le repli plus bas.
  const matchMoisAnnee = lower.match(/([a-zà-ÿ]+)\.?\s+(\d{4})/);
  if (matchMoisAnnee && MOIS[matchMoisAnnee[1]]) {
    return `${matchMoisAnnee[2]}-${MOIS[matchMoisAnnee[1]]}-01`;
  }

  // "02/2026", "02-2026", "02.2026" — mois numérique puis année
  const matchNumMoisAnnee = lower.match(/\b(0?[1-9]|1[0-2])[/.\-](\d{4})\b/);
  if (matchNumMoisAnnee) {
    return `${matchNumMoisAnnee[2]}-${matchNumMoisAnnee[1].padStart(2, "0")}-01`;
  }

  // "2026/02", "2026-02" — année puis mois numérique (plus rare)
  const matchAnneeNumMois = lower.match(/\b(\d{4})[/.\-](0?[1-9]|1[0-2])\b/);
  if (matchAnneeNumMois) {
    return `${matchAnneeNumMois[1]}-${matchAnneeNumMois[2].padStart(2, "0")}-01`;
  }

  const matchAnnee = lower.match(/(\d{4})/);
  if (matchAnnee) return `${matchAnnee[1]}-01-01`;
  return null;
};

// Vrai si la date brute mentionne EXPLICITEMENT que le poste/la formation est en
// cours ("Présent", "Aujourd'hui", "En cours") — distinct d'une date de fin
// simplement absente/vide, qui ne doit jamais être traitée comme "en cours".
export const estDateOuverte = (dateStr) => {
  if (!dateStr) return false;
  const lower = dateStr.toLowerCase().trim();
  return (
    lower.includes("présent") ||
    lower.includes("present") ||
    lower.includes("aujourd") ||
    lower.includes("en cours")
  );
};

// Convertit une date de fin brute, avec repli sur la date de début quand aucune
// fin n'a été trouvée du tout (ni date précise, ni mention explicite "en cours") —
// une fin absente ne doit jamais être confondue avec un poste/une formation encore
// en cours (bug réel : le candidat voyait "Aujourd'hui" affiché pour une expérience
// dont le CV ne précisait simplement pas de date de fin).
export const convertDateFin = (dateFinRaw, dateDebutRaw) => {
  if (estDateOuverte(dateFinRaw)) return null;
  return convertDateRaw(dateFinRaw) || convertDateRaw(dateDebutRaw);
};
