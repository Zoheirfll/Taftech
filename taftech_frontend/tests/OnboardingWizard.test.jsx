// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import toast from "react-hot-toast";
import OnboardingWizard from "../src/Pages/Candidat/Onboarding/OnboardingWizard";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { profilService } from "../src/Services/profilService";
import { jobsService } from "../src/Services/jobsService";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/Services/profilService", () => ({
  profilService: {
    getProfil: vi.fn(),
    updateProfil: vi.fn(),
    addExperience: vi.fn(),
    deleteExperience: vi.fn(),
    addFormation: vi.fn(),
    deleteFormation: vi.fn(),
  },
}));
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    parserCV: vi.fn(),
    getApercuDonneesIA: vi.fn(),
    ajouterCompetence: vi.fn(),
    supprimerCompetence: vi.fn(),
    searchCompetences: vi.fn(),
    getNomenclature: vi.fn().mockResolvedValue({
      secteurs: [{ code: "L", libelle: "Support à l'entreprise" }],
      domaines: [{ id: 1, code: "L18", libelle: "Systèmes d'information", secteur_code: "L" }],
      sous_domaines: [],
    }),
    getNomenclatureFormation: vi.fn().mockResolvedValue({
      types_diplomes: [{ id: 5, code: "D-LIC-NP", libelle: "Licence" }],
      domaines: [],
      filieres: [],
      specialites: [],
      diplome_specialite: [],
    }),
  },
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "id"), dismiss: vi.fn() },
}));

const mockProfil = {
  first_name: "Karim", last_name: "Ali", telephone: "", wilaya: "", commune: "",
  diplome: "", specialite: "", sexe: "", date_naissance: "",
  experiences_detail: [], formations_detail: [], langues: "", competences_detail: [],
};

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue({ wilayas: [{ value: "16 - Alger", label: "16 - Alger" }], diplomes: [] });
    profilService.updateProfil.mockResolvedValue({});
    profilService.addExperience.mockResolvedValue({});
    profilService.addFormation.mockResolvedValue({});
    jobsService.ajouterCompetence.mockResolvedValue({});
  });
  afterEach(cleanup);

  it("affiche l'étape 1 avec le lien Passer cette étape", async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    expect(screen.getByText(/Passer cette étape/i)).toBeInTheDocument();
  });

  it("Passer cette étape avance à l'étape 2 sans appeler parserCV", async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i));
    await waitFor(() => expect(screen.getByText(/Infos personnelles/i)).toBeInTheDocument());
    expect(jobsService.parserCV).not.toHaveBeenCalled();
  });

  it("affiche le champ Sexe à l'étape 2 et sauvegarde avance à l'étape 3", async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i));

    await screen.findByLabelText(/Sexe/i);
    fireEvent.change(screen.getByLabelText(/Sexe/i), { target: { value: "HOMME" } });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    await waitFor(() => {
      expect(profilService.updateProfil).toHaveBeenCalled();
      expect(screen.getByText(/expérience\(s\) prête\(s\)/i)).toBeInTheDocument();
    });
  });

  it("parcourt les 8 étapes en tout skip jusqu'à l'écran Félicitations, puis navigue au dashboard", async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 2

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 3 (save infos)
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 4
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 5
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 6
    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 7 (save compétences)
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 8 (préférences)

    await screen.findByText(/Félicitations/i);
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard-candidat");
  });

  it("propage diplome_ref détecté par le parser jusqu'à la sauvegarde de l'étape Infos", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      diplome: "MASTER_2",
      diplome_ref: 5,
      diplome_ref_libelle: "Licence",
      experiences: [],
      formations: [],
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);

    const input = document.querySelector('input[type="file"]');
    const file = new File(["contenu"], "cv.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    // Le fichier choisi n'est plus analysé tout de suite : le candidat peut d'abord consulter les
    // données transmises à l'IA, puis lance l'analyse.
    const boutonAnalyser = await screen.findByRole("button", { name: /Analyser mon CV/i });
    expect(jobsService.parserCV).not.toHaveBeenCalled();
    fireEvent.click(boutonAnalyser);

    await screen.findByLabelText("Diplôme");
    expect(screen.getByLabelText("Diplôme")).toHaveValue("5");

    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    await waitFor(() => expect(profilService.updateProfil).toHaveBeenCalled());
    const formData = profilService.updateProfil.mock.calls[0][0];
    expect(formData.get("diplome_ref")).toBe("5");
    expect(formData.get("diplome_ref_libelle")).toBeNull();
  });

  it("l'étape Formations propose le sélecteur référentiel v2 (Type de diplôme) en édition", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      experiences: [],
      formations: [
        {
          diplome: "Baccalauréat Génie Mécanique",
          etablissement: "Lycée X",
          date_debut_raw: "",
          date_fin_raw: "2019",
          description: "",
          diplome_ref: 5,
          diplome_ref_libelle: "Licence",
          specialite_ref: null,
          specialite_ref_libelle: "",
        },
      ],
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);

    const input = document.querySelector('input[type="file"]');
    const file = new File(["contenu"], "cv.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    // Etape 2 (Infos) puis étape 3 (Expériences) — on les passe pour atteindre Formations.
    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 3
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 4

    await screen.findByText(/Baccalauréat Génie Mécanique/i);
    fireEvent.click(screen.getByLabelText(/Modifier/i));

    // Le sélecteur référentiel v2 (autrefois absent de cette étape, "ancien menu") est
    // désormais bien présent, pré-rempli avec la résolution faite par le parser.
    await waitFor(() => expect(screen.getAllByText(/Type de diplôme/i).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /Terminé/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    await waitFor(() => expect(profilService.addFormation).toHaveBeenCalled());
    expect(profilService.addFormation.mock.calls[0][0]).toMatchObject({ diplome_ref: 5, specialite_ref: null });
  });

  it("l'étape Formations propose les spécialités suggérées en un clic et envoie celle choisie", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      experiences: [],
      formations: [
        {
          diplome: "DIPLÔME DE LICENCE EN INFORMATIQUE", etablissement: "Université Oran", date_debut_raw: "2019", date_fin_raw: "2022",
          description: "Mémoire : site web", diplome_ref: 5, diplome_ref_libelle: "Licence", specialite_ref: null, specialite_ref_libelle: "",
          specialites_suggerees: [{ id: 41, libelle: "Systèmes informatiques" }, { id: 42, libelle: "Statistique informatique" }],
        },
      ],
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["contenu"], "cv.pdf", { type: "application/pdf" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 3
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 4

    fireEvent.click(await screen.findByRole("button", { name: "Statistique informatique" }));
    expect(screen.queryByText(/Choisissez-la en un clic/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Licence · Statistique informatique/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    await waitFor(() => expect(profilService.addFormation).toHaveBeenCalled());
    const envoye = profilService.addFormation.mock.calls[0][0];
    expect(envoye.specialite_ref).toBe(42);
    expect(envoye).not.toHaveProperty("specialites_suggerees");
    expect(envoye.description).toBe("Mémoire : site web"); // la note libre n'est jamais écrasée
  });

  it("l'étape Infos affiche l'appellation du métier détecté (pas le métier officiel) et l'enregistre", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true, experiences: [], formations: [],
      metier: 7, metier_libelle: "Études et développement informatique",
      metier_appellation: 41, metier_appellation_libelle: "Développeur web",
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["contenu"], "cv.pdf", { type: "application/pdf" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    expect(await screen.findByDisplayValue("Développeur web")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Études et développement informatique")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    await waitFor(() => expect(profilService.updateProfil).toHaveBeenCalled());
    const formData = profilService.updateProfil.mock.calls[0][0];
    expect([formData.get("metier"), formData.get("metier_appellation")]).toEqual(["7", "41"]);
    expect(formData.get("metier_appellation_libelle")).toBeNull();
  });

  it("l'étape Formations permet de modifier l'intitulé de la formation détecté", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      experiences: [],
      formations: [
        {
          diplome: "DIPLÔME DE MASTER EN INFORMATIQUE", etablissement: "Université Oran 1", date_debut_raw: "2022", date_fin_raw: "2024",
          description: "", diplome_ref: 5, diplome_ref_libelle: "Master académique", specialite_ref: null, specialite_ref_libelle: "",
        },
      ],
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["contenu"], "cv.pdf", { type: "application/pdf" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 3
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 4

    await screen.findByText(/DIPLÔME DE MASTER EN INFORMATIQUE/);
    fireEvent.click(screen.getByLabelText(/Modifier/i));
    fireEvent.change(await screen.findByLabelText("Intitulé de la formation"), { target: { value: "Master informatique, option décision" } });
    fireEvent.click(screen.getByRole("button", { name: /Terminé/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    await waitFor(() => expect(profilService.addFormation).toHaveBeenCalled());
    expect(profilService.addFormation.mock.calls[0][0].diplome).toBe("Master informatique, option décision");
  });

  it("l'étape Expériences affiche l'appellation choisie (pas le métier officiel) et l'enregistre", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      formations: [],
      experiences: [
        {
          titre_poste: "DÉVELOPPEUR D'APPLICATIONS WEB", entreprise: "Taziri - Oran", date_debut_raw: "Janvier 2026", date_fin_raw: "",
          description: "", metier: 7, metier_libelle: "Études et développement informatique",
          appellation: 41, appellation_libelle: "Développeur web",
        },
      ],
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["contenu"], "cv.pdf", { type: "application/pdf" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 3 (save infos)
    expect(await screen.findByText("Métier : Développeur web")).toBeInTheDocument();
    expect(screen.queryByText(/Études et développement informatique/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    await waitFor(() => expect(profilService.addExperience).toHaveBeenCalled());
    const envoye = profilService.addExperience.mock.calls[0][0];
    expect([envoye.metier, envoye.appellation]).toEqual([7, 41]);
  });

  it("l'étape Expériences signale en évidence une expérience sans métier, et l'enregistre sans lien de demande", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      formations: [],
      experiences: [
        { titre_poste: "Pilote de drone", entreprise: "Société X", date_debut_raw: "Janvier 2026", date_fin_raw: "", description: "" },
      ],
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["contenu"], "cv.pdf", { type: "application/pdf" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 3 (save infos)
    expect(await screen.findByRole("button", { name: /Métier à choisir/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    await waitFor(() => expect(profilService.addExperience).toHaveBeenCalled());
    const envoye = profilService.addExperience.mock.calls[0][0];
    expect(envoye.demande_metier ?? null).toBeNull();
    expect(envoye).not.toHaveProperty("demande_metier_libelle");
  });

  it("l'étape Expériences signale une date de début manquante et n'envoie rien (ni suppression)", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      formations: [],
      experiences: [
        { titre_poste: "Organisateur de conditionnement", entreprise: "ACG SIM", date_debut_raw: "", date_fin_raw: "novembre 2020", description: "" },
      ],
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["contenu"], "cv.pdf", { type: "application/pdf" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 3 (save infos)
    expect(await screen.findByRole("button", { name: /Date de début manquante/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("date de début")));
    expect(profilService.addExperience).not.toHaveBeenCalled();
    expect(profilService.deleteExperience).not.toHaveBeenCalled();
  });

  it("l'étape Langues permet de modifier le nom et le niveau d'une langue détectée", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true, experiences: [], formations: [], langues: "Arabe:Maternelle,Anglais:Avancé",
    });
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["contenu"], "cv.pdf", { type: "application/pdf" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 3
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 4
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 5

    const niveaux = await screen.findAllByLabelText("Niveau");
    expect(niveaux[0]).toHaveValue("Maternelle"); // niveau du CV absent de la liste : conservé tel quel
    fireEvent.change(niveaux[1], { target: { value: "Intermédiaire" } });
    fireEvent.change(screen.getAllByLabelText("Langue")[0], { target: { value: "Arabe, littéraire:" } });

    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    await waitFor(() => expect(profilService.updateProfil).toHaveBeenCalled());
    const formData = profilService.updateProfil.mock.calls.at(-1)[0];
    expect(formData.get("langues")).toBe("Arabe littéraire:Maternelle,Anglais:Intermédiaire");
  });

  it("une expérience dont l'enregistrement échoue n'est pas perdue en silence : message d'erreur et étape conservée", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      experiences: [
        { titre_poste: "Cadre administratif", entreprise: "", date_debut_raw: "Janvier 2026", date_fin_raw: "", description: "", metier: null, metier_libelle: null },
      ],
      formations: [],
    });
    profilService.addExperience.mockRejectedValue(new Error("Request failed with status code 400"));
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);

    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["contenu"], "cv.pdf", { type: "application/pdf" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Analyser mon CV/i }));

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 3 (save infos)
    await screen.findByText(/expérience\(s\) prête\(s\)/i);
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // save expériences

    await waitFor(() =>
      expect(toast.error.mock.calls.some(([message]) => /1 expérience\(s\) n'ont pas été enregistrées/.test(message))).toBe(true),
    );
    // L'étape n'avance pas : l'expérience en échec reste à l'écran, prête à un nouvel essai.
    expect(screen.getByText(/expérience\(s\) prête\(s\)/i)).toBeInTheDocument();
  });

  it("mode modal : le bouton Quitter demande confirmation puis appelle onClose", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <OnboardingWizard mode="modal" onClose={onClose} />
        <ConfirmModalHost />
      </MemoryRouter>,
    );
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByLabelText(/Quitter/i));
    fireEvent.click(await screen.findByText(/Confirmer/i));
    expect(onClose).toHaveBeenCalled();
  });

  it("mode page : le bouton Quitter demande confirmation puis navigue vers le dashboard", async () => {
    render(
      <MemoryRouter>
        <OnboardingWizard mode="page" />
        <ConfirmModalHost />
      </MemoryRouter>,
    );
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByLabelText(/Quitter/i));
    fireEvent.click(await screen.findByText(/Confirmer/i));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard-candidat");
  });
});
