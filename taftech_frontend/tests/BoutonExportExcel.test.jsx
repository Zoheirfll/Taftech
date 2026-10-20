// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import BoutonExportExcel from "../src/Components/BoutonExportExcel";
import { adminService } from "../src/Services/adminService";
import { reportError } from "../src/utils/errorReporter";

vi.mock("../src/Services/adminService", () => ({ adminService: { exporterListe: vi.fn() } }));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "id"), dismiss: vi.fn() },
}));
vi.mock("../src/utils/errorReporter", () => ({ reportError: vi.fn() }));

describe("BoutonExportExcel", () => {
  let telechargements;

  beforeEach(() => {
    vi.clearAllMocks();
    telechargements = [];
    window.URL.createObjectURL = vi.fn(() => "blob:test");
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function suivre() {
      telechargements.push(this.getAttribute("download"));
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("exporte avec les filtres reçus et télécharge le fichier nommé", async () => {
    adminService.exporterListe.mockResolvedValue("contenu");
    render(<BoutonExportExcel ressource="utilisateurs" params={{ search: "karim", role: "CANDIDAT" }} nomFichier="utilisateurs_taftech" />);
    fireEvent.click(screen.getByRole("button", { name: /Exporter Excel/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(adminService.exporterListe).toHaveBeenCalledWith("utilisateurs", { search: "karim", role: "CANDIDAT" });
    expect(telechargements).toEqual(["utilisateurs_taftech.xlsx"]);
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("affiche l'erreur, la journalise et réactive le bouton", async () => {
    adminService.exporterListe.mockRejectedValue(new Error("panne"));
    render(<BoutonExportExcel ressource="offres" nomFichier="offres_taftech" />);
    fireEvent.click(screen.getByRole("button", { name: /Exporter Excel/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(reportError).toHaveBeenCalled();
    expect(telechargements).toEqual([]);
    expect(screen.getByRole("button", { name: /Exporter Excel/i })).toBeEnabled();
  });

  it("ignore un second clic pendant la génération", async () => {
    let terminer;
    adminService.exporterListe.mockReturnValue(new Promise((resolve) => { terminer = resolve; }));
    render(<BoutonExportExcel ressource="entreprises" nomFichier="entreprises_taftech" />);
    const bouton = screen.getByRole("button", { name: /Exporter Excel/i });
    fireEvent.click(bouton);
    fireEvent.click(bouton);
    expect(adminService.exporterListe).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).toBeDisabled();
    terminer("x");
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("accepte un libellé personnalisé", () => {
    render(<BoutonExportExcel ressource="journal-audit" nomFichier="journal" libelle="Exporter le journal" />);
    expect(screen.getByRole("button", { name: /Exporter le journal/i })).toBeInTheDocument();
  });
});
