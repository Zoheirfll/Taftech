// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent, within } from "@testing-library/react";
import selectEvent from "react-select-event";
import { FormationReferentielSelect } from "../src/Components/FormationReferentielSelect";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getNomenclatureFormation: vi.fn(), suggererDiplome: vi.fn() },
}));

const NOMENCLATURE = {
  niveaux_etudes: [],
  familles: [{ code: "superieur", libelle: "Enseignement supérieur" }],
  types_diplomes: [
    { id: 1, code: "D-AUTRE", libelle: "Autre diplôme à préciser", famille: "autre" },
    { id: 2, code: "D-LIC", libelle: "Licence", famille: "superieur" },
  ],
  domaines: [],
  filieres: [],
  specialites: [],
  diplome_specialite: [],
};

const monter = (props = {}) => {
  const rappels = {
    onChangeDiplome: vi.fn(), onChangeSpecialite: vi.fn(), onChangeAutreTexte: vi.fn(), onChangeDiplomeAutreTexte: vi.fn(),
  };
  render(<FormationReferentielSelect diplomeId="" specialiteId="" autreTexte="" diplomeAutreTexte="" {...rappels} {...props} />);
  return rappels;
};

describe("🎓 <FormationReferentielSelect /> — « Autre, préciser »", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getNomenclatureFormation.mockResolvedValue(NOMENCLATURE);
    jobsService.suggererDiplome.mockResolvedValue({ trouve: false });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const ouvrirAutreDiplome = async () => {
    const boutons = await screen.findAllByRole("button", { name: "Autre, préciser" });
    fireEvent.click(boutons[0]);
  };

  it("🟢 Choisir « Autre diplôme » bascule aussi la spécialité en mode « Autre »", async () => {
    const rappels = monter();
    await ouvrirAutreDiplome();
    expect(rappels.onChangeDiplome).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Autre spécialité")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Précisez la spécialité...")).toBeInTheDocument();
  });

  it("🟢 La saisie du texte « Autre spécialité » remonte au formulaire parent", async () => {
    const rappels = monter();
    await ouvrirAutreDiplome();
    fireEvent.change(await screen.findByPlaceholderText("Précisez la spécialité..."), { target: { value: "Cybersécurité" } });
    expect(rappels.onChangeAutreTexte).toHaveBeenLastCalledWith("Cybersécurité");
  });

  it("🔒 « Revenir à la liste » vide le texte de la spécialité (sinon il créerait une demande d'ajout)", async () => {
    const rappels = monter({ autreTexte: "Cybersécurité" });
    await ouvrirAutreDiplome();
    const ligneAutre = (await screen.findByText("Autre spécialité")).closest("div");
    rappels.onChangeAutreTexte.mockClear();
    fireEvent.click(within(ligneAutre).getByRole("button", { name: /revenir à la liste/ }));
    expect(rappels.onChangeAutreTexte).toHaveBeenCalledWith("");
  });

  it("🟢 Sans correspondance, le message dit que le type est transmis à l'équipe pour validation (plus de « à vérifier »)", async () => {
    monter({ diplomeAutreTexte: "Certificat maison" });
    await ouvrirAutreDiplome();
    expect(await screen.findByText(/transmis à l'équipe pour validation/, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/à vérifier/)).toBeNull();
    await waitFor(() => expect(jobsService.suggererDiplome).toHaveBeenCalledWith("Certificat maison"));
  });

  it("🟢 Édition : une spécialité saisie en « Autre » sur un vrai diplôme rouvre le champ avec son texte", async () => {
    monter({ diplomeId: "2", autreTexte: "Cybersécurité" });
    expect(await screen.findByText("Autre spécialité")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Précisez la spécialité...")).toHaveValue("Cybersécurité");
  });

  it("🟢 Un texte de moins de 3 caractères prévient qu'il ne sera pas transmis", async () => {
    monter({ diplomeId: "2", autreTexte: "ST" });
    expect(await screen.findByText(/Au moins 3 caractères/)).toBeInTheDocument();
  });

  it("🟢 Un texte « Autre spécialité » déjà au référentiel invite à le choisir dans la liste", async () => {
    jobsService.getNomenclatureFormation.mockResolvedValue({
      ...NOMENCLATURE, specialites: [{ id: 9, code: "SP-CH", libelle: "Chimie", domaine_id: 1 }],
    });
    monter({ diplomeId: "2", autreTexte: "chimie" });
    expect(await screen.findByText(/existe déjà dans la liste/)).toBeInTheDocument();
  });
});

// « Chimie » n'est pas rangée dans le même domaine par toutes les universités : on peut donc chercher une
// spécialité directement, tous domaines confondus, et le reste se remplit quand c'est possible.
const NOMENCLATURE_RECHERCHE = {
  niveaux_etudes: [{ id: 21, code: "SC-SUP", libelle: "Études supérieures", familles: ["superieur"], types_exclus: [] }],
  familles: [{ code: "superieur", libelle: "Enseignement supérieur" }],
  types_diplomes: [
    { id: 1, code: "D-AUTRE", libelle: "Autre diplôme à préciser", famille: "autre" },
    { id: 2, code: "D-LIC", libelle: "Licence", famille: "superieur" },
    { id: 3, code: "D-MAS", libelle: "Master", famille: "superieur" },
  ],
  domaines: [{ id: 5, libelle: "Sciences de la matière", famille: "superieur" }],
  filieres: [{ id: 7, domaine_id: 5, libelle: "Chimie" }],
  specialites: [
    { id: 100, code: "SP-1", libelle: "Chimie appliquée", domaine_id: 5, filiere_id: 7 },
    { id: 101, code: "SP-2", libelle: "Chimie fondamentale", domaine_id: 5, filiere_id: null },
    { id: 102, code: "SP-3", libelle: "Chimie des polymères", domaine_id: 5, filiere_id: null },
  ],
  diplome_specialite: [
    { diplome_id: 2, specialite_id: 100 },
    { diplome_id: 2, specialite_id: 101 },
    { diplome_id: 3, specialite_id: 101 },
  ],
};

describe("🔎 <FormationReferentielSelect /> — recherche directe d'une spécialité", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getNomenclatureFormation.mockResolvedValue(NOMENCLATURE_RECHERCHE);
    jobsService.suggererDiplome.mockResolvedValue({ trouve: false });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const chercher = async (regex) => {
    const champ = await screen.findByLabelText("Rechercher directement votre spécialité");
    await selectEvent.select(champ, regex);
  };

  it("🟢 un seul diplôme attesté : la spécialité, le diplôme et le niveau sont remplis", async () => {
    const rappels = monter();
    await chercher(/Chimie appliquée/);
    expect(rappels.onChangeSpecialite).toHaveBeenCalledWith(100, "Chimie appliquée");
    expect(rappels.onChangeDiplome).toHaveBeenCalledWith(2, "Licence");
    expect(await screen.findByText("Études supérieures")).toBeInTheDocument();
    expect(screen.queryByText(/existe pour plusieurs diplômes/)).toBeNull();
  });

  it("🟢 le domaine est affiché à côté de chaque résultat (la spécialité se retrouve même sous un autre domaine)", async () => {
    monter();
    const champ = await screen.findByLabelText("Rechercher directement votre spécialité");
    selectEvent.openMenu(champ);
    expect(await screen.findByText("Chimie fondamentale — Sciences de la matière")).toBeInTheDocument();
  });

  it("🟡 plusieurs diplômes possibles : rien n'est imposé, un message les liste", async () => {
    const rappels = monter();
    await chercher(/Chimie fondamentale/);
    expect(rappels.onChangeSpecialite).toHaveBeenCalledWith(101, "Chimie fondamentale");
    expect(rappels.onChangeDiplome).not.toHaveBeenCalled();
    expect(await screen.findByText(/existe pour plusieurs diplômes \(Licence, Master\)/)).toBeInTheDocument();
  });

  it("🟡 un diplôme déjà choisi et compatible est conservé", async () => {
    const rappels = monter({ diplomeId: "3" });
    await chercher(/Chimie fondamentale/);
    expect(rappels.onChangeSpecialite).toHaveBeenCalledWith(101, "Chimie fondamentale");
    expect(rappels.onChangeDiplome).not.toHaveBeenCalled();
    expect(screen.queryByText(/existe pour plusieurs diplômes/)).toBeNull();
  });

  it("🟡 aucun diplôme attesté : le diplôme reste libre", async () => {
    const rappels = monter();
    await chercher(/Chimie des polymères/);
    expect(rappels.onChangeSpecialite).toHaveBeenCalledWith(102, "Chimie des polymères");
    expect(rappels.onChangeDiplome).not.toHaveBeenCalled();
    expect(screen.queryByText(/existe pour plusieurs diplômes/)).toBeNull();
  });
});
