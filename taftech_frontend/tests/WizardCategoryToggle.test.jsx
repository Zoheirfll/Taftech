// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WizardCategoryToggle } from "../src/Components/onboarding/WizardCategoryToggle";

afterEach(cleanup);

describe("WizardCategoryToggle", () => {
  it("affiche les deux options et appelle onChange au clic", () => {
    const onChange = vi.fn();
    render(<WizardCategoryToggle mode="ajouter" onChange={onChange} />);

    expect(screen.getByRole("button", { name: /Ajouter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remplacer/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Remplacer/i }));
    expect(onChange).toHaveBeenCalledWith("remplacer");
  });

  it("marque l'option active via aria-pressed", () => {
    render(<WizardCategoryToggle mode="remplacer" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Remplacer/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Ajouter/i })).toHaveAttribute("aria-pressed", "false");
  });
});
