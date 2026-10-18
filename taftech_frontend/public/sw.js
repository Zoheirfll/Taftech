/* Service worker TafTech : support hors ligne SANS risque de version périmée.
 *
 * Règles (toutes volontaires) :
 *  - Pages : toujours demandées au serveur d'abord. La page « Vous êtes hors ligne » ne s'affiche
 *    qu'en cas de panne réseau. Aucune page HTML n'est gardée en cache : après une mise en ligne,
 *    le visiteur reçoit toujours la dernière version.
 *  - Fichiers `/assets/` (noms hachés par Vite) : gardés en cache, jamais périmés puisque leur nom
 *    change à chaque version.
 *  - JAMAIS en cache : l'API, les médias (CV, photos, documents privés), l'administration, tout
 *    contenu d'un autre domaine, toute requête autre que lecture (GET).
 * Pour forcer le renouvellement de tous les caches, changer VERSION.
 */
const VERSION = "v1";
const CACHE_STATIQUE = `taftech-static-${VERSION}`;
const PAGE_HORS_LIGNE = "/hors-ligne.html";
const A_PRECHARGER = [PAGE_HORS_LIGNE, "/taftech-icone-192.png"];
const MAX_FICHIERS = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIQUE)
      .then((cache) => cache.addAll(A_PRECHARGER))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(noms.filter((nom) => nom.startsWith("taftech-") && nom !== CACHE_STATIQUE).map((nom) => caches.delete(nom))),
      )
      .then(() => self.clients.claim()),
  );
});

const jamaisEnCache = (url) =>
  url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/") || url.pathname.startsWith("/admin");

const limiter = (cache) =>
  cache.keys().then((cles) => (cles.length > MAX_FICHIERS ? cache.delete(cles[0]).then(() => limiter(cache)) : undefined));

const cachePuisReseau = (request) =>
  caches.open(CACHE_STATIQUE).then((cache) =>
    cache.match(request).then(
      (enCache) =>
        enCache ||
        fetch(request).then((reponse) => {
          if (reponse && reponse.ok) {
            cache.put(request, reponse.clone());
            limiter(cache);
          }
          return reponse;
        }),
    ),
  );

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || jamaisEnCache(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(PAGE_HORS_LIGNE)));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cachePuisReseau(request));
  }
});
