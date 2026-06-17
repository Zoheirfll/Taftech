const BASE = import.meta.env.VITE_MEDIA_BASE_URL ?? "";

export const mediaUrl = (path) =>
  path ? (path.startsWith("http") ? path : `${BASE}${path}`) : null;
