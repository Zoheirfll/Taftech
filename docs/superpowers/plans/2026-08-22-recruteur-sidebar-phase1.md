# Sidebar Recruteur (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au portail recruteur un vrai layout à sidebar (`RecruteurLayout.jsx`), calqué sur `CandidatLayout.jsx` existant, avec un premier lot de 8 liens vers des pages qui existent déjà aujourd'hui, plus le raccourci de recherche Ctrl+K.

**Architecture:** Nouveau composant `RecruteurLayout.jsx` (sidebar + `<Outlet/>`) qui remplace l'enveloppement individuel `<RecruteurRoute>` de chaque route recruteur connectée par un seul enveloppement `<RecruteurRoute><RecruteurLayout/></RecruteurRoute>` parent dans `App.jsx`, exactement comme `CandidatLayout` le fait déjà pour l'espace candidat. `NavbarRecruteur` reste affichée au-dessus (aucun changement), le `RecruteurLayout` n'ajoute que la sidebar + une barre de recherche Ctrl+K en haut du contenu.

**Tech Stack:** React 18, react-router-dom v6 (`Outlet`, `useLocation`, `useNavigate`, `useSearchParams`), Tailwind CSS v4 (tokens `tw.*` dans `theme.js`), Vitest + @testing-library/react.

## Global Constraints

- Aucun lien mort : seuls les 8 liens vers des pages déjà existantes sont ajoutés à cette phase (Tableau de bord, CVthèque, Favoris, Messages, Publier une offre, Questionnaires, Mon équipe, Paramètres entreprise). Les 8 autres (Offres, Candidatures, Recommandés, Entretiens, Recrutements, Statistiques, Abonnements, Facturation) seront ajoutés phase par phase plus tard — ne pas les inclure ici.
- Respecter les rôles d'équipe existants via `authService.peutFaire(minRole)` — un lien caché aujourd'hui pour un rôle insuffisant doit le rester.
- Ne pas toucher au contenu des pages recruteur existantes (Dashboard, CVthèque, etc.) sauf l'ajout minimal du filtre Favoris décrit au Task 4.
- Tests : `npm test -- --run` doit rester à 100% après chaque tâche. Build : `npx vite build` doit rester propre en fin de plan.
- Suivre le pattern déjà établi par `CandidatLayout.jsx` (`taftech_frontend/src/Pages/Candidat/CandidatLayout.jsx`) pour la structure du composant.

---

### Task 1: Tokens de thème teal pour la sidebar recruteur

**Files:**
- Modify: `taftech_frontend/src/theme.js:611-620` (juste après le bloc `// === SIDEBAR CANDIDAT (CandidatLayout) ===`)
- Test: `taftech_frontend/tests/theme.test.js` (si le fichier n'existe pas, ne pas en créer un nouveau — ce token sera vérifié indirectement par le test du Task 2 qui rend le composant et lit les classes réellement appliquées)

**Interfaces:**
- Produces: `tw.sidebarShellTeal`, `tw.sidebarLinkActiveTeal`, `tw.sidebarLinkInactiveTeal`, `tw.sidebarLinkIconActiveTeal`, `tw.sidebarLinkIconInactiveTeal`, `tw.sidebarBadgeActiveTeal`, `tw.sidebarBadgeInactiveTeal` — consommés par `RecruteurLayout.jsx` (Task 2).

- [ ] **Step 1: Vérifier qu'aucun test dédié `theme.js` n'existe**

Run: `find "c:\Users\filali\Desktop\Taftech\taftech_frontend\tests" -iname "theme*"`
Expected: aucun résultat — ce fichier n'a pas de suite de tests dédiée dans ce projet, on passe directement à l'implémentation (les tokens sont des chaînes Tailwind statiques, aucune logique à tester isolément).

- [ ] **Step 2: Ajouter les tokens teal**

Dans `taftech_frontend/src/theme.js`, juste après la ligne `sidebarLogoutButton: "text-red-500 hover:bg-red-50",` (ligne 620), ajouter :

```js
  // === SIDEBAR RECRUTEUR (RecruteurLayout) — variante teal ===
  sidebarShellTeal: "bg-white border border-slate-200",
  sidebarLinkActiveTeal: "bg-teal-700 text-white",
  sidebarLinkInactiveTeal: "text-slate-600 hover:bg-slate-50 hover:text-teal-700",
  sidebarLinkIconActiveTeal: "text-white",
  sidebarLinkIconInactiveTeal: "text-slate-600",
  sidebarBadgeActiveTeal: "bg-white text-teal-700",
  sidebarBadgeInactiveTeal: "bg-red-500 text-white",
```

- [ ] **Step 3: Vérifier que le fichier reste syntaxiquement valide**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build réussi, aucune erreur de syntaxe JS.

- [ ] **Step 4: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/theme.js
git commit -m "feat: ajouter tokens theme teal pour la sidebar recruteur"
```

---

### Task 2: Composant `RecruteurLayout.jsx`

**Files:**
- Create: `taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx`
- Test: `taftech_frontend/tests/RecruteurLayout.test.jsx`

**Interfaces:**
- Consumes: `authService.peutFaire(minRole)`, `authService.logout()` (`taftech_frontend/src/Services/authService.js`, déjà existant) ; `jobsService.getCandidaturesSpontanees()` → `Promise<Array<{ id, lue: boolean, ... }>>` (déjà existant, `taftech_frontend/src/Services/recruteurService.js:283-291`, réexporté par la façade `jobsService`) ; `tw.*` du Task 1 + `tw.sidebarDivider`/`tw.sidebarLogoutButton`/`tw.surfaceSubtle` (déjà existants, réutilisés tels quels).
- Produces: export par défaut `RecruteurLayout` — composant sans props, à monter comme élément de route parent avec des routes enfants rendues via `<Outlet/>`. Consommé par `App.jsx` (Task 3).

- [ ] **Step 1: Lire le composant de référence en entier**

Run: `cat "c:\Users\filali\Desktop\Taftech\taftech_frontend\src\Pages\Candidat\CandidatLayout.jsx"`
(Déjà lu dans cette session — sert de patron direct pour la structure du composant : `useState`/`useEffect` pour charger un compteur, `useMemo` pour la liste de menu, rendu `<aside className="hidden md:block ...">` + `<main><Outlet/></main>`.)

- [ ] **Step 2: Écrire le test complet (échoue au départ — le composant n'existe pas encore)**

Créer `taftech_frontend/tests/RecruteurLayout.test.jsx` :

```jsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RecruteurLayout from "../src/Pages/Recruteur/RecruteurLayout";
import { jobsService } from "../src/Services/jobsService";
import { authService } from "../src/Services/authService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getCandidaturesSpontanees: vi.fn(),
  },
}));

vi.mock("../src/Services/authService", () => ({
  authService: {
    peutFaire: vi.fn(() => true),
    logout: vi.fn(),
  },
}));

const renderLayout = (initialPath = "/dashboard") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RecruteurLayout />}>
          <Route path="/dashboard" element={<div>Contenu Dashboard</div>} />
          <Route path="/cvtheque" element={<div>Contenu CVthèque</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("🏢 RecruteurLayout — sidebar recruteur", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getCandidaturesSpontanees.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : affiche les 8 liens de la sidebar avec leurs labels", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());

    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("CVthèque")).toBeInTheDocument();
    expect(screen.getByText("Favoris")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Publier une offre")).toBeInTheDocument();
    expect(screen.getByText("Questionnaires")).toBeInTheDocument();
    expect(screen.getByText("Mon équipe")).toBeInTheDocument();
    expect(screen.getByText("Paramètres entreprise")).toBeInTheDocument();
  });

  it("🟢 HP2 : affiche le contenu de la route enfant via Outlet", async () => {
    renderLayout("/dashboard");
    await waitFor(() => expect(screen.getByText("Contenu Dashboard")).toBeInTheDocument());
  });

  it("🟢 HP3 : le badge Messages affiche le nombre de candidatures spontanées non lues", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue([
      { id: 1, lue: false },
      { id: 2, lue: true },
      { id: 3, lue: false },
    ]);
    renderLayout();
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });

  it("🟢 HP4 : le lien Favoris pointe vers /cvtheque?favoris=true", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    const lien = screen.getByText("Favoris").closest("a");
    expect(lien).toHaveAttribute("href", "/cvtheque?favoris=true");
  });

  it("🟡 EC1 : un lien caché par le rôle (peutFaire=false) n'apparaît pas", async () => {
    authService.peutFaire.mockImplementation((minRole) => minRole !== "PROPRIETAIRE");
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    expect(screen.queryByText("Mon équipe")).not.toBeInTheDocument();
  });

  it("🟢 HP5 : le bouton Déconnexion appelle authService.logout()", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Déconnexion"));
    expect(authService.logout).toHaveBeenCalled();
  });

  it("🟢 HP6 : Ctrl+K focus le champ de recherche du header", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    const input = screen.getByPlaceholderText(/Rechercher un candidat/i);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(input).toHaveFocus();
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue (le composant n'existe pas)**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run tests/RecruteurLayout.test.jsx`
Expected: FAIL — `Failed to resolve import "../src/Pages/Recruteur/RecruteurLayout"`.

- [ ] **Step 4: Écrire le composant**

Créer `taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx` :

```jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import {
  LayoutDashboard,
  Search,
  Star,
  Inbox,
  Briefcase,
  ClipboardList,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

const RecruteurLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messagesNonLus, setMessagesNonLus] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const spontanees = await jobsService.getCandidaturesSpontanees();
        setMessagesNonLus(spontanees.filter((c) => !c.lue).length);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_MESSAGES_LAYOUT_RECRUTEUR", error);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" && searchValue.trim()) {
      navigate(`/cvtheque?search=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const menuItems = useMemo(
    () => [
      { name: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard, minRole: "INVITE" },
      { name: "CVthèque", path: "/cvtheque", icon: Search, minRole: "UTILISATEUR" },
      {
        name: "Favoris",
        path: "/cvtheque?favoris=true",
        icon: Star,
        minRole: "UTILISATEUR",
        isActive: () => location.pathname === "/cvtheque" && location.search.includes("favoris=true"),
      },
      {
        name: "Messages",
        path: "/candidatures-spontanees",
        icon: Inbox,
        minRole: "INVITE",
        badge: messagesNonLus > 0 ? messagesNonLus : null,
      },
      { name: "Publier une offre", path: "/creer-offre", icon: Briefcase, minRole: "UTILISATEUR" },
      { name: "Questionnaires", path: "/questionnaires", icon: ClipboardList, minRole: "UTILISATEUR" },
      { name: "Mon équipe", path: "/mon-equipe", icon: Users, minRole: "PROPRIETAIRE" },
      { name: "Paramètres entreprise", path: "/parametres", icon: Settings, minRole: "INVITE" },
    ],
    [messagesNonLus, location.pathname, location.search],
  );

  const visibleItems = menuItems.filter((item) => authService.peutFaire(item.minRole));

  return (
    <div className={`max-w-7xl mx-auto flex flex-col gap-4 md:gap-5 px-4 md:px-6 py-5 md:py-6 min-h-screen ${tw.surfaceSubtle}`}>
      <div className="relative w-full max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleSearchSubmit}
          placeholder="Rechercher un candidat, un CV, une compétence... (Ctrl+K)"
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        <aside className="hidden md:block md:w-56 shrink-0">
          <div className={`${tw.sidebarShellTeal} rounded-xl overflow-hidden sticky top-20`}>
            <nav className="p-2">
              {visibleItems.map((item) => {
                const isActive = item.isActive ? item.isActive() : location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors mb-0.5 ${
                      isActive ? tw.sidebarLinkActiveTeal : tw.sidebarLinkInactiveTeal
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon
                        size={16}
                        className={isActive ? tw.sidebarLinkIconActiveTeal : tw.sidebarLinkIconInactiveTeal}
                      />
                      <span className="text-sm font-semibold">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? tw.sidebarBadgeActiveTeal : tw.sidebarBadgeInactiveTeal
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              <div className={`${tw.sidebarDivider} mt-2 pt-2`}>
                <button
                  onClick={() => authService.logout()}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tw.sidebarLogoutButton}`}
                >
                  <LogOut size={16} />
                  Déconnexion
                </button>
              </div>
            </nav>
          </div>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RecruteurLayout;
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run tests/RecruteurLayout.test.jsx`
Expected: PASS — 7/7 tests verts.

- [ ] **Step 6: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx taftech_frontend/tests/RecruteurLayout.test.jsx
git commit -m "feat: ajouter RecruteurLayout (sidebar + recherche Ctrl+K)"
```

---

### Task 3: Brancher `RecruteurLayout` dans `App.jsx`

**Files:**
- Modify: `taftech_frontend/src/App.jsx:92, 287-294`

**Interfaces:**
- Consumes: `RecruteurLayout` (Task 2, export par défaut).
- Produces: routes recruteur connectées désormais nichées sous un seul parent `<Route element={<RecruteurRoute><RecruteurLayout/></RecruteurRoute>}>`, mêmes chemins qu'avant (`/dashboard`, `/dashboard/offres/:id`, `/creer-offre`, `/cvtheque`, `/candidatures-spontanees`, `/questionnaires`, `/parametres`, `/mon-equipe`).

- [ ] **Step 1: Ajouter l'import**

Dans `taftech_frontend/src/App.jsx`, après la ligne `import CandidatLayout from "./Pages/Candidat/CandidatLayout";` (ligne 92), ajouter :

```js
import RecruteurLayout from "./Pages/Recruteur/RecruteurLayout";
```

- [ ] **Step 2: Restructurer le bloc de routes recruteur connecté**

Remplacer (lignes 286-294) :

```jsx
            {/* ESPACE RECRUTEUR CONNECTÉ */}
            <Route path="/creer-offre" element={<RecruteurRoute><RoleGuard minRole="UTILISATEUR"><CreateJob /></RoleGuard></RecruteurRoute>} />
            <Route path="/dashboard" element={<RecruteurRoute><DashboardRecruteur /></RecruteurRoute>} />
            <Route path="/dashboard/offres/:id" element={<RecruteurRoute><GestionOffre /></RecruteurRoute>} />
            <Route path="/cvtheque" element={<RecruteurRoute><RoleGuard minRole="UTILISATEUR"><CVTheque /></RoleGuard></RecruteurRoute>} />
            <Route path="/candidatures-spontanees" element={<RecruteurRoute><CandidaturesSpontanees /></RecruteurRoute>} />
            <Route path="/questionnaires" element={<RecruteurRoute><RoleGuard minRole="UTILISATEUR"><Questionnaires /></RoleGuard></RecruteurRoute>} />
            <Route path="/parametres" element={<RecruteurRoute><ParametresRecruteur /></RecruteurRoute>} />
            <Route path="/mon-equipe" element={<RecruteurRoute><MonEquipe /></RecruteurRoute>} />
```

par :

```jsx
            {/* ESPACE RECRUTEUR CONNECTÉ */}
            <Route element={<RecruteurRoute><RecruteurLayout /></RecruteurRoute>}>
              <Route path="/creer-offre" element={<RoleGuard minRole="UTILISATEUR"><CreateJob /></RoleGuard>} />
              <Route path="/dashboard" element={<DashboardRecruteur />} />
              <Route path="/dashboard/offres/:id" element={<GestionOffre />} />
              <Route path="/cvtheque" element={<RoleGuard minRole="UTILISATEUR"><CVTheque /></RoleGuard>} />
              <Route path="/candidatures-spontanees" element={<CandidaturesSpontanees />} />
              <Route path="/questionnaires" element={<RoleGuard minRole="UTILISATEUR"><Questionnaires /></RoleGuard>} />
              <Route path="/parametres" element={<ParametresRecruteur />} />
              <Route path="/mon-equipe" element={<MonEquipe />} />
            </Route>
```

- [ ] **Step 3: Lancer la suite complète frontend**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run`
Expected: 100% des tests passent (aucune régression sur `DashboardRecruteur.test.jsx`, `CVTheque.test.jsx`, `GestionOffre.test.jsx`, `CreateJob.test.jsx`, `Questionnaires.test.jsx`, `ParametresRecruteur.test.jsx`, `MonEquipe.test.jsx`, `CandidaturesSpontanees.test.jsx` — ces pages ne changent pas de contenu, seulement leur enveloppe de route).

- [ ] **Step 4: Vérifier le build**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build propre.

- [ ] **Step 5: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/App.jsx
git commit -m "feat: nicher les routes recruteur sous RecruteurLayout"
```

---

### Task 4: CVthèque lit `?favoris=true` pour activer l'onglet Favoris

**Files:**
- Modify: `taftech_frontend/src/Pages/Recruteur/CVTheque.jsx:1-2, 93`
- Test: `taftech_frontend/tests/CVTheque.test.jsx`

**Interfaces:**
- Consumes: `useSearchParams` de `react-router-dom` (déjà une dépendance du projet, utilisé ailleurs — ex. `JobsList.jsx`).
- Produces: aucun changement d'interface publique — comportement interne au composant.

- [ ] **Step 1: Écrire le test (échoue au départ)**

Dans `taftech_frontend/tests/CVTheque.test.jsx`, ajouter ce test dans le bloc `describe` existant (après le test HP1, avant `afterEach` du fichier) :

```jsx
  it("🟢 HP5 : ouvre directement sur l'onglet Favoris si l'URL contient ?favoris=true", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockResolvedValue(mockResults);
    render(
      <MemoryRouter initialEntries={["/cvtheque?favoris=true"]}>
        <CVTheque />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const ongletFavoris = screen.getByText("Favoris").closest("button");
      expect(ongletFavoris.className).toMatch(/border-b-2/);
    });
    await waitFor(() => {
      expect(jobsService.searchCVtheque).toHaveBeenCalledWith(
        expect.objectContaining({ favoris: true }),
      );
    });
  });
```

(Note : ce test s'ajoute au fichier existant, il réutilise les mocks `jobsService`/`mockConstants`/`mockResults` déjà déclarés en haut du fichier — ne pas les redéclarer.)

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run tests/CVTheque.test.jsx -t "HP5"`
Expected: FAIL — l'onglet reste sur "tous" par défaut, `searchCVtheque` n'est jamais appelé avec `favoris: true` au chargement initial.

- [ ] **Step 3: Implémenter**

Dans `taftech_frontend/src/Pages/Recruteur/CVTheque.jsx`, ligne 1-2, remplacer :

```jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
```

par :

```jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
```

Puis, ligne 93, remplacer :

```jsx
  const [activeTab, setActiveTab] = useState("tous"); // "tous" ou "favoris"
```

par :

```jsx
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("favoris") === "true" ? "favoris" : "tous",
  ); // "tous" ou "favoris"
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run tests/CVTheque.test.jsx`
Expected: PASS — tous les tests de `CVTheque.test.jsx` verts, y compris le nouveau HP5.

- [ ] **Step 5: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Pages/Recruteur/CVTheque.jsx taftech_frontend/tests/CVTheque.test.jsx
git commit -m "feat: CVthèque ouvre sur l'onglet Favoris via ?favoris=true"
```

---

### Task 5: Vérification finale complète

**Files:** aucun changement — vérification uniquement.

- [ ] **Step 1: Suite de tests frontend complète**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run`
Expected: 100% des tests passent.

- [ ] **Step 2: Build Vite**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build propre, aucune erreur/warning bloquant.

- [ ] **Step 3: Test manuel rapide en dev**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm run dev` (terminal séparé, backend Django déjà lancé sur le port 8000)
Se connecter en recruteur, vérifier : sidebar visible sur `/dashboard`, `/cvtheque`, `/parametres`, etc. ; clic sur "Favoris" ouvre CVthèque avec l'onglet Favoris actif ; Ctrl+K focus le champ de recherche ; taper un terme + Entrée redirige vers `/cvtheque?search=...` ; bouton Déconnexion fonctionne.

- [ ] **Step 4: Mettre à jour CLAUDE.md**

Ajouter une entrée dans `CLAUDE.md` (section session du jour) documentant : nouveau `RecruteurLayout.jsx`, routes recruteur nichées, 8 liens actifs (liste), Favoris = filtre CVthèque via query param, Ctrl+K = redirection recherche. Référencer le spec `docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md` et noter que les 8 liens restants arrivent en phases suivantes.

- [ ] **Step 5: Commit final**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add CLAUDE.md
git commit -m "docs: documenter la Phase 1 sidebar recruteur dans CLAUDE.md"
```
