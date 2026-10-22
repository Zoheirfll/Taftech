import { describe, it, expect } from "vitest";
import { doitRetirerPhoto } from "./photoProfil";

const base = {
  infosMode: "remplacer",
  cvAnalyse: { photo: null },
  photoEnAttente: null,
  profil: { photo_profil: "/media/photos/ancienne.png" },
};

describe("doitRetirerPhoto", () => {
  it("retire l'ancienne photo quand le nouveau CV n'en a pas, en mode Remplacer", () => {
    expect(doitRetirerPhoto(base)).toBe(true);
  });

  it("garde l'ancienne photo en mode Ajouter", () => {
    expect(doitRetirerPhoto({ ...base, infosMode: "ajouter" })).toBe(false);
  });

  it("ne touche pas à la photo si aucun CV n'a été analysé", () => {
    expect(doitRetirerPhoto({ ...base, cvAnalyse: null })).toBe(false);
  });

  it("ne retire rien quand le nouveau CV contient une photo", () => {
    expect(doitRetirerPhoto({ ...base, cvAnalyse: { photo: { data: "AAAA", ext: "png" } } })).toBe(false);
    expect(doitRetirerPhoto({ ...base, photoEnAttente: new File(["x"], "photo.png") })).toBe(false);
  });

  it("n'a rien à retirer quand le profil n'a pas de photo", () => {
    expect(doitRetirerPhoto({ ...base, profil: { photo_profil: null } })).toBe(false);
    expect(doitRetirerPhoto({ ...base, profil: null })).toBe(false);
  });
});
