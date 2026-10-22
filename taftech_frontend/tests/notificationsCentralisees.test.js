// @vitest-environment node
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Les notifications passent TOUTES par `utils/notifier.js` (même apparence, mêmes options, mêmes fonctions) :
 * seuls le point d'entrée et l'hôte `NotificationsHost` ont le droit d'importer `react-hot-toast`.
 */
const RACINE = path.resolve(__dirname, "../src");
const AUTORISES = new Set(["utils/notifier.js", "Components/NotificationsHost.jsx"]);

const fichiersSource = (dossier) =>
  fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSource(chemin);
    return /\.(jsx?|tsx?)$/.test(entree.name) ? [chemin] : [];
  });

const relatifs = () => fichiersSource(RACINE).map((f) => path.relative(RACINE, f).split(path.sep).join("/"));
const contenu = (f) => fs.readFileSync(path.join(RACINE, f), "utf8");

describe("Notifications centralisées", () => {
  it("aucun fichier hors du point d'entrée n'importe react-hot-toast", () => {
    const intrus = relatifs()
      .filter((f) => !AUTORISES.has(f))
      .filter((f) => /from\s+["']react-hot-toast["']/.test(contenu(f)));
    expect(intrus).toEqual([]);
  });

  it("aucune notification n'est écrite avec un point d'exclamation", () => {
    const fautifs = relatifs().filter((f) =>
      /notifier\.(succes|erreur|info)\(\s*["'`][^"'`]*!\s*["'`]/.test(contenu(f)),
    );
    expect(fautifs).toEqual([]);
  });
});
