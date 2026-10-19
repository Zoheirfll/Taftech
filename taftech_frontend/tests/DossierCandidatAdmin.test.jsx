// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import DossierCandidatAdmin from "../src/Pages/Admin/DossierCandidatAdmin";
import { adminDossierService } from "../src/Services/adminDossierService";

vi.mock("../src/Services/adminDossierService", () => ({
  adminDossierService: { getDossierCandidat: vi.fn() },
}));

const DOSSIER = {
  compte: { derniere_connexion: "2026-10-19T12:00:00Z", inscrit_le: "2026-06-22T10:00:00Z", est_actif: true },
  identite: {
    sexe: "Homme", date_naissance: "2002-03-02", bio: "Ingénieur passionné", linkedin: "https://linkedin.com/in/test",
    github: null, vehicule_personnel: true, visible_cvtheque: false, cv_maj_le: null,
  },
  score_profil: 72,
  competences: [
    { label: "Python", niveau: "CONFIRME", niveau_libelle: "Confirmé", source: "DECLARE" },
    { label: "Excel", niveau: "DEBUTANT", niveau_libelle: "Débutant", source: "DECLARE" },
  ],
  langues: [
    { langue: "Arabe", niveau: "Maternelle" },
    { langue: "Espagnol", niveau: "" },
  ],
  candidatures: {
    total: 12, par_statut: { Reçue: 9, Refusée: 3 }, score_moyen: 61, derniere_le: "2026-10-18T09:00:00Z",
    recentes: [
      { id: 1, offre: "Développeur Back-End", entreprise: "TAFTECH", statut: "Reçue", score: 80, date: "2026-10-18T09:00:00Z" },
    ],
  },
  activite: {
    offres_sauvegardees: 4, alertes_total: 2, alertes_actives: 1, documents: 3, rendez_vous_total: 1, rendez_vous_a_venir: 1,
  },
  ia_mois: [{ libelle: "Parser CV (candidat)", appels: 2, tokens: 5400 }],
};

describe("DossierCandidatAdmin", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("affiche le niveau de chaque compétence et de chaque langue", async () => {
    adminDossierService.getDossierCandidat.mockResolvedValue(DOSSIER);
    render(<DossierCandidatAdmin userId={7} />);
    await screen.findByTestId("dossier-candidat");
    expect(adminDossierService.getDossierCandidat).toHaveBeenCalledWith(7);
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Confirmé")).toBeInTheDocument();
    expect(screen.getByText("Débutant")).toBeInTheDocument();
    expect(screen.getByText("Arabe")).toBeInTheDocument();
    expect(screen.getByText("Maternelle")).toBeInTheDocument();
    expect(screen.getByText("Niveau non précisé")).toBeInTheDocument();
  });

  it("affiche le nombre de candidatures, leur répartition et les dernières", async () => {
    adminDossierService.getDossierCandidat.mockResolvedValue(DOSSIER);
    render(<DossierCandidatAdmin userId={7} />);
    await screen.findByTestId("dossier-candidat");
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Reçue : 9")).toBeInTheDocument();
    expect(screen.getByText("Refusée : 3")).toBeInTheDocument();
    expect(screen.getByText("Développeur Back-End")).toBeInTheDocument();
    expect(screen.getByText("1 dernières candidatures sur 12.")).toBeInTheDocument();
    expect(screen.getByText("61 %")).toBeInTheDocument();
  });

  it("affiche l'activité, le profil complémentaire et l'usage de l'IA", async () => {
    adminDossierService.getDossierCandidat.mockResolvedValue(DOSSIER);
    render(<DossierCandidatAdmin userId={7} />);
    await screen.findByTestId("dossier-candidat");
    expect(screen.getByText("72/100")).toBeInTheDocument();
    expect(screen.getByText("1 active(s)")).toBeInTheDocument();
    expect(screen.getByText("Ingénieur passionné")).toBeInTheDocument();
    expect(screen.getByText("Visible dans la CVthèque").nextSibling).toHaveTextContent("Non");
    expect(screen.getByText("Véhiculé").nextSibling).toHaveTextContent("Oui");
    expect(screen.getByText(/2 appel\(s\)/)).toBeInTheDocument();
  });

  it("sans candidature, le dit clairement", async () => {
    adminDossierService.getDossierCandidat.mockResolvedValue({
      ...DOSSIER, competences: [], langues: [], ia_mois: [],
      candidatures: { total: 0, par_statut: {}, score_moyen: null, derniere_le: null, recentes: [] },
    });
    render(<DossierCandidatAdmin userId={7} />);
    await screen.findByTestId("dossier-candidat");
    expect(screen.getByText("Aucune candidature envoyée.")).toBeInTheDocument();
    expect(screen.getByText("Aucune compétence renseignée")).toBeInTheDocument();
    expect(screen.getByText("Aucune langue renseignée")).toBeInTheDocument();
    expect(screen.queryByText(/Utilisation de l'IA/)).not.toBeInTheDocument();
  });

  it("pendant le chargement, montre le repli simple", () => {
    adminDossierService.getDossierCandidat.mockReturnValue(new Promise(() => {}));
    render(<DossierCandidatAdmin userId={7} repli={<p>Repli compétences</p>} />);
    expect(screen.getByText("Chargement du dossier…")).toBeInTheDocument();
    expect(screen.getByText("Repli compétences")).toBeInTheDocument();
  });

  it("si le chargement échoue, le dit et garde le repli", async () => {
    adminDossierService.getDossierCandidat.mockRejectedValue(new Error("boom"));
    render(<DossierCandidatAdmin userId={7} repli={<p>Repli compétences</p>} />);
    await waitFor(() => expect(screen.getByText("Impossible de charger le dossier détaillé.")).toBeInTheDocument());
    expect(screen.getByText("Repli compétences")).toBeInTheDocument();
  });
});
