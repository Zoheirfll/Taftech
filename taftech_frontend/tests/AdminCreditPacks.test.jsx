// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AdminCreditPacks from "../src/Pages/Admin/AdminCreditPacks";
import { jobsService } from "../src/Services/jobsService";
import { ConfirmModalHost } from "../src/utils/confirmToast";

vi.mock("../src/Services/jobsService");

describe("AdminCreditPacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobsService.getAdminCreditPacks.mockResolvedValue([
      { id: 1, nom: "Pack 10", credits: 10, prix_da: 2500, actif: true, ordre: 1 },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("HP1: affiche la liste des packs", async () => {
    render(<AdminCreditPacks />);
    await waitFor(() => expect(screen.getByText("Pack 10")).toBeInTheDocument());
    expect(screen.getByText(/2.?500\s*DA/)).toBeInTheDocument();
  });

  it("HP2: crée un nouveau pack", async () => {
    jobsService.createCreditPack.mockResolvedValue({ id: 2, nom: "Pack 100", credits: 100, prix_da: 18000, actif: true, ordre: 4 });
    render(<AdminCreditPacks />);
    await waitFor(() => expect(screen.getByText("Pack 10")).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Ajouter un pack/i));
    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: "Pack 100" } });
    fireEvent.change(screen.getByLabelText(/Crédits/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/Prix/i), { target: { value: "18000" } });
    fireEvent.click(screen.getByText(/^Ajouter$/i));
    await waitFor(() => expect(jobsService.createCreditPack).toHaveBeenCalledWith(
      expect.objectContaining({ nom: "Pack 100", credits: 100, prix_da: 18000 })
    ));
  });

  it("HP3: supprime un pack après confirmation", async () => {
    jobsService.deleteCreditPack.mockResolvedValue({});
    render(<><AdminCreditPacks /><ConfirmModalHost /></>);
    await waitFor(() => expect(screen.getByText("Pack 10")).toBeInTheDocument());
    fireEvent.click(screen.getByTitle(/Supprimer/i));
    fireEvent.click(await screen.findByText("Confirmer"));
    await waitFor(() => expect(jobsService.deleteCreditPack).toHaveBeenCalledWith(1));
  });
});
