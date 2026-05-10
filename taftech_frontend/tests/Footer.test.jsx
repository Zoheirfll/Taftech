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
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../src/Components/Footer";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/api/axiosConfig");

describe("📑 UI & Logique - Composant <Footer />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Happy Path 1 : Rendu des sections principales", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Ne ratez plus aucune opportunité/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Siège Social/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Proudly built with React & Django/i),
    ).toBeInTheDocument();
  });

  it("🟢 Happy Path 2 : Inscription Newsletter réussie", async () => {
    api.post.mockResolvedValue({ status: 200 });
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Votre email.../i);
    const button = screen.getByText(/S'INSCRIRE/i);

    fireEvent.change(input, { target: { value: "test@taftech.dz" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("newsletter/subscribe/", {
        email: "test@taftech.dz",
      });
      expect(input.value).toBe(""); // Champ vidé
    });
  });

  it("🔴 Edge Case : Erreur Serveur (500) -> reportError appelé", async () => {
    api.post.mockRejectedValue({ response: { status: 500 } });
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/Votre email.../i), {
      target: { value: "error@taftech.dz" },
    });
    fireEvent.click(screen.getByText(/S'INSCRIRE/i));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CRITIQUE_NEWSLETTER",
        expect.anything(),
      );
    });
  });
});
