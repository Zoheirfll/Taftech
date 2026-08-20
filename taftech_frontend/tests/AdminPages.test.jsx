// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPages from "../src/Pages/Admin/AdminPages";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Components/RichTextEditor", () => ({
  default: ({ value, onChange }) => (
    <textarea data-testid="rich-text-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminPages: vi.fn(),
    createPageStatique: vi.fn(),
    updatePageStatique: vi.fn(),
    deletePageStatique: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockPages = [
  { id: 1, slug: "cgu", titre: "Conditions Générales d'Utilisation", contenu_html: "<p>CGU.</p>" },
  { id: 2, slug: "partenaires", titre: "Nos partenaires", contenu_html: "<p>Partenaires.</p>" },
];

describe("📄 UI & Logique - Composant <AdminPages />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminPages.mockResolvedValue(mockPages);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Chargement et affichage des pages", async () => {
    render(
      <MemoryRouter>
        <AdminPages />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Conditions Générales d'Utilisation")).toBeInTheDocument();
      expect(screen.getByText("Nos partenaires")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : URL affichée diffère entre page système et page libre", async () => {
    render(
      <MemoryRouter>
        <AdminPages />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("/cgu")).toBeInTheDocument();
      expect(screen.getByText("/pages/partenaires")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Bouton supprimer masqué pour une page système", async () => {
    render(
      <MemoryRouter>
        <AdminPages />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Conditions Générales d'Utilisation"));
    // Une seule ligne "libre" (partenaires) doit avoir un bouton delete ; cgu n'en a pas.
    // 0 = Nouvelle page, puis pencil(cgu), pencil(partenaires), trash(partenaires)
    const allButtons = screen.getAllByRole("button");
    expect(allButtons.length).toBe(4);
  });

  it("🟢 HP4 : Ouverture du formulaire de création", async () => {
    render(
      <MemoryRouter>
        <AdminPages />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouvelle page/i));
    fireEvent.click(screen.getByText(/Nouvelle page/i));

    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
  });

  it("🟢 HP5 : Création d'une page réussie", async () => {
    jobsService.createPageStatique.mockResolvedValue({ id: 3 });

    render(
      <MemoryRouter>
        <AdminPages />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouvelle page/i));
    fireEvent.click(screen.getByText(/Nouvelle page/i));

    const titreInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(titreInput, { target: { value: "Nouvelle page test" } });
    const slugInput = screen.getAllByRole("textbox")[1];
    fireEvent.change(slugInput, { target: { value: "nouvelle-page-test" } });
    const editor = screen.getByTestId("rich-text-editor");
    fireEvent.change(editor, { target: { value: "<p>Contenu.</p>" } });

    const form = titreInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createPageStatique).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Page créée !");
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getAdminPages.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <AdminPages />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ADMIN_PAGES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Contenu vide bloque la création", async () => {
    render(
      <MemoryRouter>
        <AdminPages />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouvelle page/i));
    fireEvent.click(screen.getByText(/Nouvelle page/i));

    const titreInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(titreInput, { target: { value: "Titre sans contenu" } });
    const slugInput = screen.getAllByRole("textbox")[1];
    fireEvent.change(slugInput, { target: { value: "titre-sans-contenu" } });

    const form = titreInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Le contenu ne peut pas être vide.");
      expect(jobsService.createPageStatique).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Aucune page", async () => {
    jobsService.getAdminPages.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminPages />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucune page\./i)).toBeInTheDocument();
    });
  });
});
