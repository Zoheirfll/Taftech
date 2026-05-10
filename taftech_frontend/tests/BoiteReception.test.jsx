// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BoiteReception from "../src/Pages/BoiteReception";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn() },
}));

const mockNotifications = [
  {
    id: 1,
    titre: "Entretien SOMIZ",
    message: "Bonjour, Nous retenons votre CV.",
    type_notif: "ENTRETIEN",
    lue: false,
    date_creation: "2026-05-01T10:00:00Z",
  },
];

describe("📥 UI & Logique - Composant <BoiteReception />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Chargement et rendu de la liste avec badge", async () => {
    jobsService.getNotifications.mockResolvedValue(mockNotifications);
    render(
      <MemoryRouter>
        <BoiteReception />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // On cherche spécifiquement le titre dans la liste (h4)
      expect(
        screen.getByRole("heading", { level: 4, name: /Entretien SOMIZ/i }),
      ).toBeInTheDocument();
      expect(screen.getByText("1 non lus")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Lecture d'un message et marquage comme lu", async () => {
    jobsService.getNotifications.mockResolvedValue(mockNotifications);
    jobsService.markNotificationAsRead.mockResolvedValue({});
    render(
      <MemoryRouter>
        <BoiteReception />
      </MemoryRouter>,
    );

    // Attendre le chargement
    const messageTitle = await screen.findByRole("heading", {
      level: 4,
      name: /Entretien SOMIZ/i,
    });

    // Clic sur l'élément de la liste
    fireEvent.click(messageTitle);

    // ✅ SOLUTION AU DOUBLON : On vérifie que le message est présent dans le panneau de détail (conteneur prose)
    await waitFor(() => {
      const detailContainer = document.querySelector(".prose");
      expect(
        within(detailContainer).getByText(/Nous retenons votre CV/i),
      ).toBeInTheDocument();
      expect(jobsService.markNotificationAsRead).toHaveBeenCalledWith(1);
    });
  });

  it("🔴 EC1 : Crash API chargement déclenche reportError", async () => {
    jobsService.getNotifications.mockRejectedValue(new Error("API Down"));
    render(
      <MemoryRouter>
        <BoiteReception />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_INBOX",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors du chargement de vos messages.",
      );
    });
  });

  it("🔴 EC2 : Crash API marquage lu n'empêche pas la lecture", async () => {
    jobsService.getNotifications.mockResolvedValue(mockNotifications);
    jobsService.markNotificationAsRead.mockRejectedValue(
      new Error("Update failed"),
    );
    render(
      <MemoryRouter>
        <BoiteReception />
      </MemoryRouter>,
    );

    const messageTitle = await screen.findByRole("heading", {
      level: 4,
      name: /Entretien SOMIZ/i,
    });
    fireEvent.click(messageTitle);

    await waitFor(() => {
      const detailContainer = document.querySelector(".prose");
      expect(
        within(detailContainer).getByText(/Nous retenons votre CV/i),
      ).toBeInTheDocument();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_MARK_READ_NOTIF",
        expect.anything(),
      );
    });
  });
});
