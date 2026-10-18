// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { erreurFichier, erreurLien, FICHIER_CV } from "../src/utils/validations";
import { ModalCV } from "../src/Pages/Candidat/ProfilCandidat/ModalCV";
import { ModalLiens } from "../src/Pages/Candidat/ProfilCandidat/ModalLiens";
import { ModalPreferences } from "../src/Pages/Candidat/ProfilCandidat/ModalPreferences";
import { ModalFormation } from "../src/Pages/Candidat/ProfilCandidat/ModalFormation";
import { OngletMonProfil } from "../src/Pages/Recruteur/ParametresRecruteur/OngletMonProfil";

vi.mock("../src/Services/authService", () => ({ authService: { getEstMembreEquipe: () => false } }));
vi.mock("../src/Components/MetierAutocomplete", () => ({ MetierAutocomplete: () => <div data-testid="metier" /> }));
vi.mock("../src/Components/FormationReferentielSelect", () => ({
  FormationReferentielSelect: () => <div data-testid="referentiel-formation" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const commun = { inputClass: "i", modalClass: "m", modalInnerClass: "mi", btnPrimary: "b", btnCancel: "c" };
const fichier = (nom, octets = 100) => {
  const f = new File(["x"], nom);
  Object.defineProperty(f, "size", { value: octets });
  return f;
};

describe("🧰 validations.js", () => {
  it("🟢 erreurFichier : accepte un fichier correct ou l'absence de fichier", () => {
    expect(erreurFichier(null, FICHIER_CV)).toBeNull();
    expect(erreurFichier(fichier("cv.PDF"), FICHIER_CV)).toBeNull();
    expect(erreurFichier(fichier("cv.docx", 5 * 1024 * 1024), FICHIER_CV)).toBeNull();
  });

  it("🔴 erreurFichier : refuse un mauvais format et un fichier trop lourd", () => {
    expect(erreurFichier(fichier("virus.exe"), FICHIER_CV)).toMatch(/Format non accepté \(PDF, DOC, DOCX\)/);
    expect(erreurFichier(fichier("cv"), FICHIER_CV)).toMatch(/Format non accepté/);
    expect(erreurFichier(fichier("cv.pdf", 5 * 1024 * 1024 + 1), FICHIER_CV)).toBe("Fichier trop volumineux (5 Mo maximum).");
  });

  it("🟢🔴 erreurLien : vide accepté, http(s) accepté, le reste refusé", () => {
    expect(erreurLien("")).toBeNull();
    expect(erreurLien("   ")).toBeNull();
    expect(erreurLien("https://linkedin.com/in/amine")).toBeNull();
    expect(erreurLien("http://github.com/amine")).toBeNull();
    for (const mauvais of ["linkedin.com/in/amine", "javascript:alert(1)", "ftp://x.com", "https://localhost", "n'importe quoi"]) {
      expect(erreurLien(mauvais), mauvais).toMatch(/Adresse invalide/);
    }
  });
});

describe("📄 Fenêtre CV", () => {
  const rendre = (file, handleUpdateCV) =>
    render(
      <ModalCV
        {...commun}
        showCVForm
        setShowCVForm={vi.fn()}
        editCV={{ titre: "Comptable", file }}
        setEditCV={vi.fn()}
        titreSuggestions={[]}
        showTitreSuggestions={false}
        setShowTitreSuggestions={vi.fn()}
        handleUpdateCV={handleUpdateCV}
        handleTitreProChange={vi.fn()}
      />,
    );

  it("🔴 un CV trop lourd est refusé sous la zone de dépôt, sans envoi", () => {
    const handleUpdateCV = vi.fn((e) => e.preventDefault());
    rendre(fichier("cv.pdf", 6 * 1024 * 1024), handleUpdateCV);
    fireEvent.submit(document.querySelector("form"));
    expect(screen.getByText("Fichier trop volumineux (5 Mo maximum).")).toBeInTheDocument();
    expect(handleUpdateCV).not.toHaveBeenCalled();
  });

  it("🟢 un CV correct, ou aucun fichier (titre seul), est envoyé", async () => {
    const handleUpdateCV = vi.fn((e) => e.preventDefault());
    rendre(fichier("cv.pdf"), handleUpdateCV);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(handleUpdateCV).toHaveBeenCalledTimes(1));
    cleanup();
    rendre(null, handleUpdateCV);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(handleUpdateCV).toHaveBeenCalledTimes(2));
  });
});

describe("🔗 Fenêtre Liens", () => {
  const rendre = (editLinks, handleUpdateLinks) =>
    render(
      <ModalLiens
        {...commun}
        showLinksForm
        setShowLinksForm={vi.fn()}
        editLinks={editLinks}
        setEditLinks={vi.fn()}
        profil={{}}
        handleUpdateLinks={handleUpdateLinks}
      />,
    );

  it("🔴 une adresse sans https:// est refusée sous son champ", () => {
    const handleUpdateLinks = vi.fn((e) => e.preventDefault());
    rendre({ bio: "", linkedin: "linkedin.com/in/amine", github: "javascript:alert(1)" }, handleUpdateLinks);
    fireEvent.submit(document.querySelector("form"));
    expect(screen.getAllByText(/Adresse invalide/)).toHaveLength(2);
    expect(handleUpdateLinks).not.toHaveBeenCalled();
  });

  it("🟢 adresses valides ou vides : envoyé", async () => {
    const handleUpdateLinks = vi.fn((e) => e.preventDefault());
    rendre({ bio: "", linkedin: "https://linkedin.com/in/amine", github: "" }, handleUpdateLinks);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(handleUpdateLinks).toHaveBeenCalledTimes(1));
  });
});

describe("⚙️ Fenêtre Préférences", () => {
  const rendre = (salaire, handleUpdateGeneric) =>
    render(
      <ModalPreferences
        {...commun}
        showPrefForm
        setShowPrefForm={vi.fn()}
        editPref={{ salaire_souhaite: salaire, mobilite: "", situation_actuelle: "", metier_souhaite_libelle: "" }}
        setEditPref={vi.fn()}
        handleUpdateGeneric={handleUpdateGeneric}
      />,
    );

  it("🔴 un salaire sans aucun chiffre est refusé sous le champ", () => {
    const handleUpdateGeneric = vi.fn((e) => e.preventDefault());
    rendre("beaucoup", handleUpdateGeneric);
    fireEvent.submit(document.querySelector("form"));
    expect(screen.getByText("Indiquez un montant en chiffres.")).toBeInTheDocument();
    expect(handleUpdateGeneric).not.toHaveBeenCalled();
  });

  it("🟢 un montant, ou un champ vide, est accepté", async () => {
    const handleUpdateGeneric = vi.fn((e) => e.preventDefault());
    rendre("60 000 DA", handleUpdateGeneric);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(handleUpdateGeneric).toHaveBeenCalledTimes(1));
    cleanup();
    rendre("", handleUpdateGeneric);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(handleUpdateGeneric).toHaveBeenCalledTimes(2));
  });
});

describe("🎓 Fenêtre Formation", () => {
  const rendre = (newForm, handleAddFormation) =>
    render(
      <ModalFormation
        {...commun}
        showFormForm
        setShowFormForm={vi.fn()}
        newForm={newForm}
        setNewForm={vi.fn()}
        editingFormId={null}
        setEditingFormId={vi.fn()}
        profil={{}}
        handleAddFormation={handleAddFormation}
        handleUpdateFormation={vi.fn()}
      />,
    );
  const base = { diplome: "", diplome_ref: null, specialite_ref: null, etablissement: "", statut: "OBTENU", date_debut: "", date_fin: "" };

  it("🔴 diplôme et établissement manquants : deux messages, aucun envoi", () => {
    const handleAddFormation = vi.fn((e) => e.preventDefault());
    rendre(base, handleAddFormation);
    fireEvent.submit(document.querySelector("form"));
    expect(screen.getByText("Choisissez votre diplôme dans la liste, ou précisez-le.")).toBeInTheDocument();
    expect(screen.getByText("L'établissement est obligatoire.")).toBeInTheDocument();
    expect(handleAddFormation).not.toHaveBeenCalled();
  });

  it("🟢 un diplôme de la liste (référence) ou saisi à la main suffit", async () => {
    const handleAddFormation = vi.fn((e) => e.preventDefault());
    rendre({ ...base, diplome_ref: 12, etablissement: "USTO" }, handleAddFormation);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(handleAddFormation).toHaveBeenCalledTimes(1));
    cleanup();
    rendre({ ...base, diplome: "Diplôme maison", etablissement: "USTO" }, handleAddFormation);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(handleAddFormation).toHaveBeenCalledTimes(2));
  });
});

describe("🔑 Mot de passe du profil recruteur", () => {
  const profil = (pwdForm, changerMotDePasse, estCompteGoogle = false) => ({
    role: "RECRUTEUR",
    profilForm: { last_name: "", first_name: "", email: "a@b.dz", telephone: "", intitule_poste: "" },
    setProfilForm: vi.fn(),
    photoPreview: null,
    handlePhotoChange: vi.fn(),
    sauvegarderProfil: vi.fn(),
    saving: false,
    estCompteGoogle,
    pwdForm,
    setPwdForm: vi.fn(),
    pwdLoading: false,
    changerMotDePasse,
  });

  it("🔴 trois règles vérifiées avant l'envoi", () => {
    const changer = vi.fn((e) => e.preventDefault());
    render(<OngletMonProfil p={profil({ old: "", new: "court", confirm: "autre" }, changer)} />);
    fireEvent.submit(document.querySelector("form"));
    expect(screen.getByText("Saisissez votre mot de passe actuel.")).toBeInTheDocument();
    expect(screen.getByText("8 caractères minimum.")).toBeInTheDocument();
    expect(screen.getByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
    expect(changer).not.toHaveBeenCalled();
  });

  it("🟢 un compte Google n'a pas besoin du mot de passe actuel", async () => {
    const changer = vi.fn((e) => e.preventDefault());
    render(<OngletMonProfil p={profil({ old: "", new: "longmotdepasse", confirm: "longmotdepasse" }, changer, true)} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(changer).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Saisissez votre mot de passe actuel.")).not.toBeInTheDocument();
  });

  it("🟢 tout correct : envoyé", async () => {
    const changer = vi.fn((e) => e.preventDefault());
    render(<OngletMonProfil p={profil({ old: "ancien", new: "longmotdepasse", confirm: "longmotdepasse" }, changer)} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(changer).toHaveBeenCalledTimes(1));
  });
});
