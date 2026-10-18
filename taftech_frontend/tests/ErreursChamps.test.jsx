// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, renderHook, act, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useErreursChamps } from "../src/utils/useErreursChamps";
import LoginRecruteur from "../src/Pages/Recruteur/Portal/LoginRecruteur";
import MesCompetences from "../src/Pages/Candidat/MesCompetences";
import { ModalExperience } from "../src/Pages/Candidat/ProfilCandidat/ModalExperience";
import { ModalInfos } from "../src/Pages/Candidat/ProfilCandidat/ModalInfos";
import { authService } from "../src/Services/authService";
import { jobsService } from "../src/Services/jobsService";
import toast from "react-hot-toast";

vi.mock("../src/Services/authService", () => ({ authService: { login: vi.fn(), logout: vi.fn() } }));
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getMesCompetencesDetail: vi.fn(() => Promise.resolve([])),
    searchCompetences: vi.fn(() => Promise.resolve([])),
    ajouterCompetence: vi.fn(),
  },
}));
vi.mock("react-hot-toast", () => {
  const toast = Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), loading: vi.fn(() => "id"), dismiss: vi.fn(),
  });
  return { default: toast };
});
vi.mock("../src/Components/MetierAutocomplete", () => ({ MetierAutocomplete: () => <div data-testid="metier" /> }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("🧩 useErreursChamps", () => {
  it("🟢 exiger : signale les champs vides ou blancs, sans toucher aux autres", () => {
    const { result } = renderHook(() => useErreursChamps());
    let manque;
    act(() => { manque = result.current.exiger({ nom: "  ", email: "a@b.dz" }, { nom: "Nom obligatoire.", email: "Email obligatoire." }); });
    expect(manque).toBe(true);
    expect(result.current.erreurs).toEqual({ nom: "Nom obligatoire." });
    expect(result.current.attributs("nom")).toEqual({ "aria-invalid": true, "aria-describedby": "err-nom" });
    expect(result.current.attributs("email")).toEqual({ "aria-invalid": false, "aria-describedby": undefined });
  });

  it("🟢 exiger : renvoie false quand tout est renseigné", () => {
    const { result } = renderHook(() => useErreursChamps());
    let manque;
    act(() => { manque = result.current.exiger({ nom: "Amine" }, { nom: "Nom obligatoire." }); });
    expect(manque).toBe(false);
    expect(result.current.erreurs).toEqual({});
  });

  it("🟢 depuisReponse : lit les erreurs de validation du serveur, ignore les erreurs génériques", () => {
    const { result } = renderHook(() => useErreursChamps());
    let trouve;
    act(() => { trouve = result.current.depuisReponse({ response: { data: { telephone: ["Numéro invalide."], detail: "x" } } }); });
    expect(trouve).toBe(true);
    expect(result.current.erreurs).toEqual({ telephone: "Numéro invalide." });
    act(() => { trouve = result.current.depuisReponse({ response: { data: { detail: "Erreur serveur" } } }); });
    expect(trouve).toBe(false);
    expect(result.current.erreurs).toEqual({});
  });

  it("🟢 effacer : retire seulement l'erreur du champ corrigé", () => {
    const { result } = renderHook(() => useErreursChamps());
    act(() => { result.current.definir({ a: "Erreur A", b: "Erreur B" }); });
    act(() => { result.current.effacer("a"); });
    expect(result.current.erreurs.a).toBeUndefined();
    expect(result.current.erreurs.b).toBe("Erreur B");
  });
});

describe("🔐 Connexion recruteur : erreurs sous les champs", () => {
  const rendre = () => render(<MemoryRouter><LoginRecruteur /></MemoryRouter>);
  const champs = (c) => [c.querySelector('input[type="email"]'), c.querySelector('input[type="password"]')];

  it("🔴 champs vides : un message sous chaque champ, aucun appel serveur", () => {
    const { container } = rendre();
    fireEvent.submit(container.querySelector("form"));
    expect(screen.getByText("Saisissez votre adresse e-mail professionnelle.")).toBeInTheDocument();
    expect(screen.getByText("Saisissez votre mot de passe.")).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
    const [email, mdp] = champs(container);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(mdp).toHaveAttribute("aria-invalid", "true");
  });

  it("🔴 e-mail mal formé refusé sous le champ", () => {
    const { container } = rendre();
    const [email, mdp] = champs(container);
    fireEvent.change(email, { target: { value: "pas-un-email" } });
    fireEvent.change(mdp, { target: { value: "secret" } });
    fireEvent.submit(container.querySelector("form"));
    expect(screen.getByText("Adresse e-mail invalide.")).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("🔴 mauvais identifiants : message sous le mot de passe, effacé dès la frappe", async () => {
    authService.login.mockRejectedValue({ response: { data: { detail: "no" } } });
    const { container } = rendre();
    const [email, mdp] = champs(container);
    fireEvent.change(email, { target: { value: "rh@entreprise.dz" } });
    fireEvent.change(mdp, { target: { value: "faux" } });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(screen.getByText("Email ou mot de passe incorrect.", { selector: "p" })).toBeInTheDocument());
    expect(toast.error).toHaveBeenCalled();
    fireEvent.change(mdp, { target: { value: "faux2" } });
    expect(screen.queryByText("Email ou mot de passe incorrect.", { selector: "p" })).not.toBeInTheDocument();
  });
});

describe("🧰 Compétences : erreur sous le champ", () => {
  it("🔴 une compétence vide est refusée sous le champ", async () => {
    render(<MesCompetences />);
    await waitFor(() => expect(jobsService.getMesCompetencesDetail).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole("button", { name: /ajouter/i })[0]);
    const formulaire = document.querySelector("form");
    fireEvent.submit(formulaire);
    expect(within(formulaire).getByText("Le nom de la compétence est obligatoire.")).toBeInTheDocument();
    expect(jobsService.ajouterCompetence).not.toHaveBeenCalled();
  });
});

describe("🪟 Fenêtres du profil candidat : champs obligatoires", () => {
  const commun = { inputClass: "i", modalClass: "m", modalInnerClass: "mi", btnPrimary: "b", btnCancel: "c" };
  const experience = (newExp, handleAddExperience) => (
    <ModalExperience
      {...commun}
      showExpForm
      setShowExpForm={vi.fn()}
      newExp={newExp}
      setNewExp={vi.fn()}
      editingExpId={null}
      setEditingExpId={vi.fn()}
      expTitreSuggestions={[]}
      showExpTitreSuggestions={false}
      setShowExpTitreSuggestions={vi.fn()}
      handleExpTitreChange={vi.fn()}
      handleAddExperience={handleAddExperience}
      handleUpdateExperience={vi.fn()}
    />
  );

  it("🔴 Expérience : trois messages, et le gestionnaire n'est pas appelé", () => {
    const handleAddExperience = vi.fn((e) => e.preventDefault());
    render(experience({ titre_poste: "", entreprise: "", date_debut: "", date_fin: "", description: "" }, handleAddExperience));
    fireEvent.submit(document.querySelector("form"));
    expect(screen.getByText("Le titre du poste est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le nom de l'entreprise est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("La date de début est obligatoire.")).toBeInTheDocument();
    expect(handleAddExperience).not.toHaveBeenCalled();
  });

  it("🟢 Expérience : tout renseigné, le gestionnaire est appelé", async () => {
    const handleAddExperience = vi.fn((e) => e.preventDefault());
    render(experience({ titre_poste: "Comptable", entreprise: "SOMIZ", date_debut: "2020-01-01", date_fin: "", description: "" }, handleAddExperience));
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(handleAddExperience).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Le titre du poste est obligatoire.")).not.toBeInTheDocument();
  });

  it("🔴 Informations : prénom, nom et téléphone obligatoires", () => {
    const handleUpdateGeneric = vi.fn((e) => e.preventDefault());
    render(
      <ModalInfos
        {...commun}
        constants={{ wilayas: [], secteurs: [], diplomes: [], niveaux_etudes: [] }}
        typesDiplomes={[]}
        showInfoForm
        setShowInfoForm={vi.fn()}
        editInfo={{ first_name: "", last_name: "", telephone: "", wilaya: "", commune: "", adresse: "", service_militaire: "" }}
        setEditInfo={vi.fn()}
        handleUpdateGeneric={handleUpdateGeneric}
        getCommunesOptions={() => []}
      />,
    );
    fireEvent.submit(document.querySelector("form"));
    expect(screen.getByText("Le prénom est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le nom est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le numéro de téléphone est obligatoire.")).toBeInTheDocument();
    expect(handleUpdateGeneric).not.toHaveBeenCalled();
  });
});
