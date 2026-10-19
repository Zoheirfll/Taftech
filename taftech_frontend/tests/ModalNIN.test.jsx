// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ModalNIN } from "../src/Components/ModalNIN";
import JobCard from "../src/Components/JobCard";
import { authService } from "../src/Services/authService";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/authService", () => ({
  authService: { isAuthenticated: vi.fn() },
}));
vi.mock("../src/Services/jobsService", () => ({
  jobsService: { postuler: vi.fn(), enregistrerNIN: vi.fn() },
}));

const NIN = "109876543210987654";
const mockJob = {
  id: 1,
  titre: "Développeur Fullstack",
  entreprise: { nom_entreprise: "TafTech" },
  type_contrat: "CDI",
  wilaya: "Oran",
  date_publication: "2026-05-01",
};

describe("ModalNIN", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("ne s'affiche pas tant qu'elle n'est pas ouverte", () => {
    render(<ModalNIN ouvert={false} onFermer={() => {}} onEnregistre={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explique l'exigence ANEM et la confidentialité", () => {
    render(<ModalNIN ouvert onFermer={() => {}} onEnregistre={() => {}} />);
    expect(screen.getByText(/exigé par l'ANEM/i)).toBeInTheDocument();
    expect(screen.getByText(/jamais communiqué aux recruteurs/i)).toBeInTheDocument();
  });

  it("refuse un NIN qui n'a pas 18 chiffres, avec le message sous le champ et sans appel serveur", () => {
    render(<ModalNIN ouvert onFermer={() => {}} onEnregistre={() => {}} />);
    fireEvent.change(screen.getByLabelText(/NIN \(18 chiffres\)/i), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer et postuler/i }));
    expect(screen.getByText("Le NIN doit contenir exactement 18 chiffres.")).toBeInTheDocument();
    expect(jobsService.enregistrerNIN).not.toHaveBeenCalled();
  });

  it("ne garde que les chiffres saisis", () => {
    render(<ModalNIN ouvert onFermer={() => {}} onEnregistre={() => {}} />);
    const champ = screen.getByLabelText(/NIN \(18 chiffres\)/i);
    fireEvent.change(champ, { target: { value: "12ab 34-56" } });
    expect(champ).toHaveValue("123456");
  });

  it("enregistre le NIN puis prévient l'écran appelant", async () => {
    jobsService.enregistrerNIN.mockResolvedValue({ nin_enregistre: true });
    const onEnregistre = vi.fn();
    render(<ModalNIN ouvert onFermer={() => {}} onEnregistre={onEnregistre} />);
    fireEvent.change(screen.getByLabelText(/NIN \(18 chiffres\)/i), { target: { value: NIN } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer et postuler/i }));
    await waitFor(() => expect(onEnregistre).toHaveBeenCalledTimes(1));
    expect(jobsService.enregistrerNIN).toHaveBeenCalledWith(NIN);
  });

  it("affiche le message générique du serveur sous le champ quand le NIN n'est pas enregistrable", async () => {
    jobsService.enregistrerNIN.mockRejectedValue({
      response: { status: 400, data: { error: "Ce NIN ne peut pas être enregistré. Vérifiez-le ou contactez le support TafTech.", code: "NIN_NON_ENREGISTRABLE" } },
    });
    const onEnregistre = vi.fn();
    render(<ModalNIN ouvert onFermer={() => {}} onEnregistre={onEnregistre} />);
    fireEvent.change(screen.getByLabelText(/NIN \(18 chiffres\)/i), { target: { value: NIN } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer et postuler/i }));
    await waitFor(() => expect(screen.getByText(/ne peut pas être enregistré/i)).toBeInTheDocument());
    expect(onEnregistre).not.toHaveBeenCalled();
  });

  it("Annuler ferme la modale sans rien enregistrer", () => {
    const onFermer = vi.fn();
    render(<ModalNIN ouvert onFermer={onFermer} onEnregistre={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onFermer).toHaveBeenCalled();
    expect(jobsService.enregistrerNIN).not.toHaveBeenCalled();
  });
});

describe("Candidature depuis une carte d'offre quand le NIN manque", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    authService.isAuthenticated.mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("demande le NIN, l'enregistre, puis rejoue la candidature sans que le candidat recommence", async () => {
    jobsService.postuler
      .mockRejectedValueOnce({ response: { status: 403, data: { error: "Votre NIN est obligatoire pour postuler.", code: "NIN_REQUIS" } } })
      .mockResolvedValueOnce({ message: "Candidature envoyée" });
    jobsService.enregistrerNIN.mockResolvedValue({ nin_enregistre: true });

    render(
      <MemoryRouter>
        <JobCard job={mockJob} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText(/Postuler/i));

    // 1) le serveur exige le NIN : la modale s'ouvre, aucun message d'erreur générique.
    const champ = await screen.findByLabelText(/NIN \(18 chiffres\)/i);
    expect(screen.queryByText(/Erreur lors de la candidature/i)).not.toBeInTheDocument();

    // 2) saisie du NIN.
    fireEvent.change(champ, { target: { value: NIN } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer et postuler/i }));

    // 3) NIN enregistré, puis la candidature repart automatiquement et réussit.
    await waitFor(() => expect(screen.getByText(/Candidature envoyée/i)).toBeInTheDocument());
    expect(jobsService.enregistrerNIN).toHaveBeenCalledWith(NIN);
    expect(jobsService.postuler).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("une autre erreur n'ouvre pas la modale", async () => {
    jobsService.postuler.mockRejectedValue({ response: { status: 400, data: { error: "Vous avez déjà postulé à cette offre." } } });
    render(
      <MemoryRouter>
        <JobCard job={mockJob} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText(/Postuler/i));
    await waitFor(() => expect(screen.getByText(/déjà postulé/i)).toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
