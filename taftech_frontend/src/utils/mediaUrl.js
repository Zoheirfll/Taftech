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
// `version` (facultatif) : l'URL est la même d'un envoi à l'autre, donc le navigateur gardait l'ancienne image
// jusqu'au rechargement de la page. Passer le nom du fichier enregistré (`profil.photo_profil`, unique à chaque
// envoi) pour que l'image se mette à jour immédiatement.
export const candidatFichierUrl = (candidatId, type, version) => {
  if (!candidatId || !type) return null;
  const base = `${API_BASE}/api/jobs/media-prive/candidat/${candidatId}/${type}/`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
};

// Document privé partagé ponctuellement par un candidat avec l'entreprise du recruteur
// connecté — servi uniquement si un PartageDocument existe (voir CandidatDocumentPartageFichierAPIView).
export const documentPartageFichierUrl = (candidatId, docId) => {
  if (!candidatId || !docId) return null;
  return `${API_BASE}/api/jobs/cvtheque/candidats/${candidatId}/documents-partages/${docId}/fichier/`;
};
