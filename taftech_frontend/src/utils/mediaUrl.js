const BASE = import.meta.env.VITE_MEDIA_BASE_URL ?? "";

export const mediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  // En dev sans proxy (ex: fichier direct), on avertit une fois
  if (import.meta.env.DEV && !BASE && !path.startsWith("/")) {
    console.warn(`[mediaUrl] Chemin relatif sans slash initial : "${path}". Ajouter VITE_MEDIA_BASE_URL en prod.`);
  }
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
};
