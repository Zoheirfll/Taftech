// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { enregistrerServiceWorker } from "../src/utils/registerServiceWorker";

// Vitest se lance depuis taftech_frontend : `public/sw.js` est lu tel qu'il sera servi.
const CODE = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
const ORIGINE = "https://taftech.test";
const reponse = (url, ok = true) => ({ ok, status: ok ? 200 : 404, url, clone() { return this; } });
const requete = (chemin, surcharge = {}) => ({ method: "GET", mode: "cors", url: `${ORIGINE}${chemin}`, ...surcharge });

// Exécute public/sw.js dans un « self » simulé (faux caches, faux réseau) et renvoie ses écouteurs.
const monter = (fetchImpl) => {
  const ecouteurs = {};
  const stores = new Map();
  const cle = (r) => (typeof r === "string" ? r : r.url);
  const ouvrir = (nom) => {
    if (!stores.has(nom)) stores.set(nom, new Map());
    const m = stores.get(nom);
    return {
      addAll: async (urls) => urls.forEach((u) => m.set(u, { ...reponse(u), corps: `precache:${u}` })),
      match: async (r) => m.get(cle(r)),
      put: async (r, rep) => { m.set(cle(r), rep); },
      keys: async () => [...m.keys()].map((url) => ({ url })),
      delete: async (r) => m.delete(cle(r)),
    };
  };
  const caches = {
    open: async (nom) => ouvrir(nom),
    keys: async () => [...stores.keys()],
    delete: async (nom) => stores.delete(nom),
    match: async (r) => {
      for (const m of stores.values()) if (m.has(cle(r))) return m.get(cle(r));
      return undefined;
    },
  };
  const self_ = {
    addEventListener: (type, fn) => { ecouteurs[type] = fn; },
    location: { origin: ORIGINE },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
  };
  const fetchMock = fetchImpl || vi.fn(async (req) => reponse(req.url));
  new Function("self", "caches", "fetch", "URL", CODE)(self_, caches, fetchMock, URL);
  return { ecouteurs, stores, fetchMock, self: self_ };
};

const lancer = async (ecouteur) => {
  let promesse;
  await ecouteur({ waitUntil: (p) => { promesse = p; } });
  await promesse;
};

const demander = async (sw, request) => {
  let promesse;
  const evt = { request, respondWith: vi.fn((p) => { promesse = p; }) };
  sw.ecouteurs.fetch(evt);
  return { evt, resultat: promesse ? await promesse : undefined };
};

describe("📴 Service worker : hors ligne sans version périmée", () => {
  it("🟢 à l'installation, précharge la page hors ligne et prend la main tout de suite", async () => {
    const sw = monter();
    await lancer(sw.ecouteurs.install);
    expect([...sw.stores.get("taftech-static-v1").keys()]).toEqual(["/hors-ligne.html", "/taftech-icone-192.png"]);
    expect(sw.self.skipWaiting).toHaveBeenCalled();
  });

  it("🟢 à l'activation, supprime ses anciens caches et laisse ceux des autres", async () => {
    const sw = monter();
    sw.stores.set("taftech-static-v0", new Map());
    sw.stores.set("autre-application", new Map());
    sw.stores.set("taftech-static-v1", new Map());
    await lancer(sw.ecouteurs.activate);
    expect([...sw.stores.keys()].sort()).toEqual(["autre-application", "taftech-static-v1"]);
    expect(sw.self.clients.claim).toHaveBeenCalled();
  });

  it("🟢 une page demandée en ligne vient du serveur, jamais d'un cache", async () => {
    const sw = monter();
    await lancer(sw.ecouteurs.install);
    const { resultat } = await demander(sw, requete("/offres/", { mode: "navigate" }));
    expect(resultat.url).toBe(`${ORIGINE}/offres/`);
    expect(sw.fetchMock).toHaveBeenCalledTimes(1);
    expect(sw.stores.get("taftech-static-v1").has(`${ORIGINE}/offres/`)).toBe(false);
  });

  it("🟢 réseau coupé : la page « Vous êtes hors ligne » s'affiche", async () => {
    const sw = monter(vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await lancer(sw.ecouteurs.install);
    const { resultat } = await demander(sw, requete("/offres/", { mode: "navigate" }));
    expect(resultat.corps).toBe("precache:/hors-ligne.html");
  });

  it("🔴 ne touche jamais à l'API, aux médias privés, à l'admin, aux autres domaines ni aux envois", async () => {
    const sw = monter();
    await lancer(sw.ecouteurs.install);
    const cas = [
      requete("/api/jobs/offres/"),
      requete("/api/accounts/profil/", { mode: "navigate" }),
      requete("/media/cvs/CV_secret.pdf"),
      requete("/admin-taftech/dashboard", { mode: "navigate" }),
      { ...requete("/offres/"), url: "https://cdn.autre.test/script.js" },
      requete("/api/jobs/postuler/", { method: "POST" }),
      requete("/manifest.webmanifest"),
    ];
    for (const r of cas) {
      const { evt } = await demander(sw, r);
      expect(evt.respondWith, `${r.method} ${r.url}`).not.toHaveBeenCalled();
    }
  });

  it("🟢 un fichier haché de /assets/ est gardé puis servi sans retourner au réseau", async () => {
    const sw = monter();
    await lancer(sw.ecouteurs.install);
    await demander(sw, requete("/assets/index-abc123.js"));
    await demander(sw, requete("/assets/index-abc123.js"));
    expect(sw.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("🟡 une réponse en erreur n'est pas mise en cache", async () => {
    const sw = monter(vi.fn(async (req) => reponse(req.url, false)));
    await lancer(sw.ecouteurs.install);
    await demander(sw, requete("/assets/absent.js"));
    await demander(sw, requete("/assets/absent.js"));
    expect(sw.fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("🔌 Enregistrement du service worker", () => {
  const faux = (surcharge = {}) => {
    const fenetre = { addEventListener: vi.fn((_, fn) => fn()) };
    const nav = { serviceWorker: { register: vi.fn(() => Promise.resolve()) }, ...surcharge };
    return { fenetre, nav };
  };

  it("🟢 s'enregistre dans la version publiée", () => {
    const { fenetre, nav } = faux();
    expect(enregistrerServiceWorker({ PROD: true }, nav, fenetre)).toBe(true);
    expect(nav.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
  });

  it("🟡 jamais en développement", () => {
    const { fenetre, nav } = faux();
    expect(enregistrerServiceWorker({ PROD: false }, nav, fenetre)).toBe(false);
    expect(nav.serviceWorker.register).not.toHaveBeenCalled();
  });

  it("🟡 sans prise en charge par le navigateur, ne fait rien", () => {
    const { fenetre } = faux();
    expect(enregistrerServiceWorker({ PROD: true }, {}, fenetre)).toBe(false);
  });
});
