const BASE = import.meta.env.VITE_MEDIA_BASE_URL ?? "";
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export const mediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  // En dev sans proxy (ex: fichier direct), on avertit une fois
  if (import.meta.env.DEV && !BASE && !path.startsWith("/")) {
    console.warn(`[mediaUrl] Chemin relatif sans slash initial : "${path}". Ajouter VITE_MEDIA_BASE_URL en prod.`);
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withMedia = normalized.startsWith("/media/") ? normalized : `/media${normalized}`;
  return `${BASE}${withMedia}`;
};

// CV PDF et photo de profil candidat : servis via une vue authentifiée (vérif propriétaire/
// recruteur autorisé/admin côté backend) au lieu d'une URL /media/ publique.
export const candidatFichierUrl = (candidatId, type) => {
  if (!candidatId || !type) return null;
  return `${API_BASE}/api/jobs/media-prive/candidat/${candidatId}/${type}/`;
};
