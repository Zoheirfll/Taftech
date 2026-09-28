// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import AdminComptes from "../src/Pages/Admin/AdminComptes";
import { adminService } from "../src/Services/adminService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/adminService", () => ({
  adminService: {
    getAdmins: vi.fn(),
    createAdmin: vi.fn(),
    updateAdmin: vi.fn(),
    deleteAdmin: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockAdmins = [
  { id: 1, email: "super@taftech.dz", first_name: "Super", last_name: "Admin", telephone: "", is_superuser: true, is_active: true, date_joined: "01/01/2026" },
  { id: 2, email: "modo@taftech.dz", first_name: "Modo", last_name: "Rateur", telephone: "", is_superuser: false, is_active: true, date_joined: "02/02/2026" },
];

describe("🛡️ AdminComptes — comptes administrateurs", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    adminService.getAdmins.mockResolvedValue(mockAdmins);
    adminService.deleteAdmin.mockResolvedValue({});
    adminService.createAdmin.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : le superutilisateur n'a pas de bouton de suppression", async () => {
    render(<AdminComptes />);
    await waitFor(() => expect(screen.getByText("modo@taftech.dz")).toBeInTheDocument());
    expect(screen.getByLabelText("Supprimer le compte modo@taftech.dz")).toBeInTheDocument();
    expect(screen.queryByLabelText("Supprimer le compte super@taftech.dz")).not.toBeInTheDocument();
  });

  it("🟢 HP2 : suppression bloquée tant que « SUPPRIMER » n'est pas tapé", async () => {
    render(<AdminComptes />);
    await waitFor(() => expect(screen.getByText("modo@taftech.dz")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Supprimer le compte modo@taftech.dz"));
    const boutonSupprimer = screen.getByRole("button", { name: "Supprimer" });
    expect(boutonSupprimer).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/pour confirmer/), { target: { value: "suppr" } });
    expect(boutonSupprimer).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/pour confirmer/), { target: { value: "SUPPRIMER" } });
    expect(boutonSupprimer).toBeEnabled();
    fireEvent.click(boutonSupprimer);

    await waitFor(() => expect(adminService.deleteAdmin).toHaveBeenCalledWith(2));
  });

  it("🔴 EC1 : mot de passe de moins de 8 caractères refusé avant envoi", async () => {
    render(<AdminComptes />);
    await waitFor(() => expect(screen.getByText("modo@taftech.dz")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Nouvel admin"));
    fireEvent.change(screen.getByPlaceholderText("admin@taftech.dz"), { target: { value: "new@taftech.dz" } });
    fireEvent.change(screen.getByPlaceholderText("8 caractères minimum"), { target: { value: "court" } });
    fireEvent.click(screen.getByText("Créer le compte"));

    expect(toast.error).toHaveBeenCalledWith("Le mot de passe doit contenir au moins 8 caractères.");
    expect(adminService.createAdmin).not.toHaveBeenCalled();
  });
});
