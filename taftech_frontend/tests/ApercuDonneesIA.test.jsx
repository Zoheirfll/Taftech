// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ApercuDonneesIA } from "../src/Components/ApercuDonneesIA";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getApercuDonneesIA: vi.fn() },
}));
vi.mock("../src/utils/errorReporter", () => ({ reportError: vi.fn() }));

const APERCU = {
  fonction: "PARSER_CV",
  texte: "Contact : [EMAIL]\nDéveloppeur Python",
  categories: { EMAIL: 1 },
  libelles: { EMAIL: "adresse e-mail" },
};

describe("ApercuDonneesIA", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("affiche la case de masquage cochée et verrouillée", () => {
    render(<ApercuDonneesIA fonction="PARSER_CV" />);
    const caseMasquage = screen.getByRole("checkbox", { name: /masquer mes informations personnelles/i });
    expect(caseMasquage).toBeChecked();
    expect(caseMasquage).toBeDisabled();
  });

  it("ouvre la modale avec le texte transmis et les catégories masquées", async () => {
    jobsService.getApercuDonneesIA.mockResolvedValue(APERCU);
    render(<ApercuDonneesIA fonction="PARSER_CV" />);
    fireEvent.click(screen.getByRole("button", { name: /voir les données qui seront transmises/i }));
    await waitFor(() => expect(screen.getByText(/adresse e-mail/i)).toBeInTheDocument());
    expect(screen.getByText(/Développeur Python/)).toBeInTheDocument();
    expect(jobsService.getApercuDonneesIA).toHaveBeenCalledWith("PARSER_CV", null);
  });

  it("transmet le fichier en attente à l'aperçu", async () => {
    jobsService.getApercuDonneesIA.mockResolvedValue(APERCU);
    const fichier = new File(["x"], "cv.pdf", { type: "application/pdf" });
    render(<ApercuDonneesIA fonction="PARSER_CV" fichier={fichier} />);
    fireEvent.click(screen.getByRole("button", { name: /voir les données/i }));
    await waitFor(() => expect(jobsService.getApercuDonneesIA).toHaveBeenCalledWith("PARSER_CV", fichier));
  });

  it("affiche un message si l'aperçu échoue", async () => {
    jobsService.getApercuDonneesIA.mockRejectedValue({ response: { data: { error: "Aucun CV à analyser." } } });
    render(<ApercuDonneesIA fonction="PARSER_CV" />);
    fireEvent.click(screen.getByRole("button", { name: /voir les données/i }));
    await waitFor(() => expect(screen.getByText("Aucun CV à analyser.")).toBeInTheDocument());
  });
});
