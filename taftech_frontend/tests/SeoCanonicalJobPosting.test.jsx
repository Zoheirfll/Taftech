// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Seo from "../src/Components/Seo";
import RouteTitle from "../src/Components/RouteTitle";
import { construireJobPosting, offreIndexable, urlCanoniqueOffre } from "../src/utils/jobPosting";
import { jobUrl } from "../src/utils/slugify";

const canonical = () => document.head.querySelector('link[rel="canonical"]');
const meta = (cle) => document.head.querySelector(`meta[property="${cle}"], meta[name="${cle}"]`);
const scriptsJsonLd = () => document.head.querySelectorAll('script[type="application/ld+json"]');

const offre = (surcharge = {}) => ({
  titre: "Développeur Python",
  code_public: "a1b2c3",
  secteur_libelle: "Informatique",
  description: "Rejoignez-nous.\nStack Django.",
  missions: "Développer des API.",
  profil_recherche: "Bac+5.",
  date_publication: "2026-10-01T08:30:00Z",
  date_expiration: "2026-12-31",
  type_contrat: "CDI",
  wilaya: "31 - Oran",
  commune: "Es Senia",
  nombre_postes: 2,
  est_active: true,
  est_cloturee: false,
  entreprise: { slug: "techcorp", nom_entreprise: "TechCorp", logo_url: "https://taftech.test/media/logo.png" },
  ...surcharge,
});

beforeEach(() => {
  document.head.querySelectorAll('link[rel="canonical"], script[type="application/ld+json"], meta[property="og:url"]').forEach((e) => e.remove());
  window.history.pushState({}, "", "/entreprises/");
});
afterEach(cleanup);

describe("🔎 <Seo /> : canonical, og:url, JSON-LD", () => {
  it("🟢 pose par défaut le canonical de la page courante, sans paramètres, avec slash final", () => {
    window.history.pushState({}, "", "/offres?page=2&q=abc#haut");
    render(<Seo title="Offres" />);
    expect(canonical()).toHaveAttribute("href", `${window.location.origin}/offres/`);
    expect(meta("og:url")).toHaveAttribute("content", `${window.location.origin}/offres/`);
  });

  it("🟢 la racine garde un seul slash", () => {
    window.history.pushState({}, "", "/");
    render(<Seo title="Accueil" />);
    expect(canonical()).toHaveAttribute("href", `${window.location.origin}/`);
  });

  it("🟢 une URL canonique explicite l'emporte", () => {
    render(<Seo title="Offre" canonical="https://taftech.dz/entreprises/x/offres-d-emploi/y/z-abc/" />);
    expect(canonical()).toHaveAttribute("href", "https://taftech.dz/entreprises/x/offres-d-emploi/y/z-abc/");
  });

  it("🟡 noindex : pas de canonical, robots noindex, puis restauré au démontage", () => {
    const { unmount } = render(<Seo title="Introuvable" noindex />);
    expect(canonical()).toBeNull();
    expect(meta("robots")).toHaveAttribute("content", "noindex, nofollow");
    unmount();
    expect(meta("robots")).toHaveAttribute("content", "index, follow");
  });

  it("🟢 l'image de partage devient une URL absolue", () => {
    render(<Seo title="Page" image="/taftech-logo.png" />);
    expect(meta("og:image")).toHaveAttribute("content", `${window.location.origin}/taftech-logo.png`);
  });

  it("🟢 le JSON-LD est posé une seule fois et remplace celui du serveur (même id)", () => {
    const duServeur = document.createElement("script");
    duServeur.type = "application/ld+json";
    duServeur.id = "seo-jsonld";
    duServeur.textContent = '{"@type":"Ancien"}';
    document.head.appendChild(duServeur);
    render(<Seo title="Offre" jsonLd={{ "@type": "JobPosting", title: "Dev" }} />);
    expect(scriptsJsonLd()).toHaveLength(1);
    expect(JSON.parse(scriptsJsonLd()[0].textContent)["@type"]).toBe("JobPosting");
  });

  it("🔴 le JSON-LD ne peut pas refermer la balise <script> (< échappé)", () => {
    render(<Seo title="Offre" jsonLd={{ title: "</script><script>alert(1)</script>" }} />);
    const brut = scriptsJsonLd()[0].textContent;
    expect(brut).not.toContain("</script>");
    expect(JSON.parse(brut).title).toBe("</script><script>alert(1)</script>");
  });

  it("🟡 canonical, og:url et JSON-LD disparaissent au démontage", () => {
    const { unmount } = render(<Seo title="Offre" jsonLd={{ "@type": "JobPosting" }} />);
    expect(canonical()).not.toBeNull();
    unmount();
    expect(canonical()).toBeNull();
    expect(meta("og:url")).toBeNull();
    expect(scriptsJsonLd()).toHaveLength(0);
  });
});

describe("🔎 <RouteTitle /> : canonical des pages publiques sans <Seo>", () => {
  it.each(["/entreprises", "/qui-sommes-nous", "/contact", "/recruteurs"])("🟢 %s reçoit un canonical", (chemin) => {
    render(<MemoryRouter initialEntries={[chemin]}><RouteTitle /></MemoryRouter>);
    expect(canonical()).toHaveAttribute("href", `${window.location.origin}${chemin}/`);
  });

  it("🟡 une page privée n'a pas de canonical", () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><RouteTitle /></MemoryRouter>);
    expect(canonical()).toBeNull();
  });
});

describe("💼 JobPosting (données structurées)", () => {
  const origin = "https://taftech.test";

  it("🟢 contient les champs exigés par Google", () => {
    const d = construireJobPosting(offre(), origin);
    expect(d["@type"]).toBe("JobPosting");
    expect(d.title).toBe("Développeur Python");
    expect(d.datePosted).toBe("2026-10-01");
    expect(d.validThrough).toBe("2026-12-31");
    expect(d.employmentType).toBe("FULL_TIME");
    expect(d.hiringOrganization).toMatchObject({ name: "TechCorp", sameAs: `${origin}/entreprise/techcorp/` });
    expect(d.hiringOrganization.logo).toBe("https://taftech.test/media/logo.png");
    expect(d.jobLocation.address).toMatchObject({ addressCountry: "DZ", addressLocality: "Es Senia", addressRegion: "Oran" });
    expect(d.totalJobOpenings).toBe(2);
    expect(d.url).toBe(`${origin}${jobUrl(offre())}/`);
    expect(d.baseSalary).toBeUndefined();
  });

  it("🟢 la description est en HTML échappé, avec les trois sections", () => {
    const d = construireJobPosting(offre({ description: "<img src=x onerror=alert(1)>\nLigne 2" }), origin);
    expect(d.description).not.toContain("<img");
    expect(d.description).toContain("&lt;img");
    expect(d.description).toContain("<br>");
    expect(d.description).toContain("Développer des API.");
    expect(d.description).toContain("Bac+5.");
  });

  it("🟡 champs facultatifs absents si non renseignés", () => {
    const d = construireJobPosting(offre({ date_expiration: null, type_contrat: "AUTRE", entreprise: { slug: "x", nom_entreprise: "X" } }), origin);
    expect(d.validThrough).toBeUndefined();
    expect(d.employmentType).toBeUndefined();
    expect(d.hiringOrganization.logo).toBeUndefined();
  });

  it("🟢 types de contrat traduits", () => {
    const attendu = { CDD: "TEMPORARY", FREELANCE: "CONTRACTOR", STAGE: "INTERN", INTERIM: "TEMPORARY", ALTERNANCE: "INTERN" };
    Object.entries(attendu).forEach(([contrat, valeur]) => {
      expect(construireJobPosting(offre({ type_contrat: contrat }), origin).employmentType).toBe(valeur);
    });
  });

  it("🟢 offreIndexable : active et non expirée seulement", () => {
    const aujourdhui = "2026-10-18";
    expect(offreIndexable(offre(), aujourdhui)).toBe(true);
    expect(offreIndexable(offre({ est_cloturee: true }), aujourdhui)).toBe(false);
    expect(offreIndexable(offre({ est_active: false }), aujourdhui)).toBe(false);
    expect(offreIndexable(offre({ date_expiration: "2026-10-01" }), aujourdhui)).toBe(false);
    expect(offreIndexable(offre({ date_expiration: null }), aujourdhui)).toBe(true);
  });

  it("🟢 l'URL canonique est celle de jobUrl avec un slash final (comme le sitemap)", () => {
    expect(urlCanoniqueOffre(offre(), origin)).toBe(`${origin}/entreprises/techcorp/offres-d-emploi/informatique/developpeur-python-a1b2c3/`);
  });
});
