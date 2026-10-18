// Nom d'une wilaya sans son numéro : "31 - Oran" → "Oran". La valeur stockée garde le numéro
// (filtres, matching, URLs) : seul l'affichage le retire.
export const nomWilaya = (valeur) => (valeur ? String(valeur).replace(/^\s*\d+\s*-\s*/, "") : "");
