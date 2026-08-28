/**
 * Extrait un message d'erreur lisible depuis une réponse Axios/DRF, quelle que soit sa forme :
 * - {error: "..."} ou {detail: "..."} (le cas le plus courant dans ce projet)
 * - {champ: ["message"]} (erreurs de validation serializer DRF, ex: URLField invalide)
 * - chaîne brute
 * Retombe sur `fallback` si rien d'exploitable n'est trouvé (réseau coupé, 500 sans corps...).
 */
export function apiErrMsg(err, fallback = "Une erreur est survenue.") {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string" && data.trim()) return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  if (data.message) return data.message;
  const cle = Object.keys(data)[0];
  if (cle) {
    const val = data[cle];
    const texte = Array.isArray(val) ? val[0] : val;
    if (texte) return typeof texte === "string" ? texte : fallback;
  }
  return fallback;
}
