// Validations côté navigateur partagées par les formulaires. Elles préviennent AVANT l'envoi avec
// un message sous le champ ; le serveur refait toujours ses propres contrôles (les valeurs
// ci-dessous reprennent ses limites : voir jobs/models/profils.py et jobs/validators.py).

// Fichier choisi : retourne un message d'erreur, ou null si le fichier convient (ou si aucun fichier).
export const erreurFichier = (fichier, { extensions, tailleMaxMo }) => {
  if (!fichier) return null;
  const extension = String(fichier.name || "").split(".").pop().toLowerCase();
  if (!extensions.includes(extension)) {
    return `Format non accepté (${extensions.map((e) => e.toUpperCase()).join(", ")}).`;
  }
  if (fichier.size > tailleMaxMo * 1024 * 1024) {
    return `Fichier trop volumineux (${tailleMaxMo} Mo maximum).`;
  }
  return null;
};

// Lien facultatif : vide = accepté ; sinon adresse http(s) valide.
export const erreurLien = (valeur) => {
  const texte = String(valeur ?? "").trim();
  if (!texte) return null;
  try {
    const url = new URL(texte);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocole");
    if (!url.hostname.includes(".")) throw new Error("domaine");
    return null;
  } catch {
    return "Adresse invalide : elle doit commencer par https://";
  }
};

// Limites alignées sur le serveur.
export const FICHIER_CV = { extensions: ["pdf", "doc", "docx"], tailleMaxMo: 5 };
