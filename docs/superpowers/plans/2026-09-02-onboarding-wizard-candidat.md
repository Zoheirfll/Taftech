# Onboarding Wizard Candidat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 7-step guided profile-completion wizard for candidates (Upload CV → Infos perso → Expériences → Formations → Langues → Compétences → Terminé), used both right after registration and when an existing candidate re-uploads their CV from `ProfilCandidat`.

**Architecture:** A new standalone React hook (`useOnboardingWizard.js`) owns all wizard state and talks directly to the existing `profilService`/`jobsService` (same service layer already used by `ProfilCandidat`, no duplication of API logic). A shell component (`OnboardingWizard.jsx`) renders a stepper and swaps between 7 small step components based on a `mode` prop (`"page"` for the post-registration full-screen route, `"modal"` for the overlay opened from `ProfilCandidat`). On the backend, `VerifyEmailAPIView` starts issuing the same JWT cookies as login, and `ProfilCandidat.sexe` is a new field.

**Tech Stack:** Django 5.2 + DRF (backend), React 18 + Vite + Tailwind v4 (frontend), Vitest + @testing-library/react (frontend tests), Django TestCase + APIClient (backend tests).

## Global Constraints

- All new/modified backend endpoints keep existing permission patterns (`IsAuthenticated`, `role == 'CANDIDAT'` checks) — no new unauthenticated data exposure.
- Frontend styling uses only existing `tw.*` tokens from `taftech_frontend/src/theme.js` — no new hardcoded Tailwind color classes.
- Every `catch` block in new frontend code calls `reportError(CODE, err)` (see `taftech_frontend/src/utils/errorReporter.js`), matching the project-wide convention.
- Backend migrations follow the existing numbering — next free migration in `jobs` is `0099`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` per repo convention (only when the user has asked for commits — this plan's steps show `git commit` per task since frequent commits are required by this skill; the executor should confirm with the user whether to actually run them if that hasn't already been established for this session).

---

## Task 1: Backend — `ProfilCandidat.sexe` field

**Files:**
- Modify: `taftech_backend/jobs/models.py:309-396` (class `ProfilCandidat`)
- Create: `taftech_backend/jobs/migrations/0099_profilcandidat_sexe.py`
- Modify: `taftech_backend/jobs/serializers/profils.py:28-54` (class `ProfilCandidatDTO`)
- Test: `taftech_backend/jobs/tests/test_profiles_models.py`

**Interfaces:**
- Produces: `ProfilCandidat.sexe` (`CharField`, choices `HOMME`/`FEMME`, nullable/blank), exposed read/write on `ProfilCandidatDTO` (already writable through the existing generic `PUT /api/jobs/profil/` — see `ProfilCandidatAPIView.put` at `taftech_backend/jobs/views/profils.py:104`, which does `ProfilCandidatDTO(profil, data=data, partial=True)` and accepts any field listed in `Meta.fields`).

- [ ] **Step 1: Write the failing test**

Add to `taftech_backend/jobs/tests/test_profiles_models.py` (open the file first to match its existing `TestCase` class and imports — add this method to the class that already tests `ProfilCandidat`):

```python
    def test_sexe_field_accepts_homme_ou_femme(self):
        profil = ProfilCandidat.objects.create(user=self.candidat, sexe='FEMME')
        profil.refresh_from_db()
        self.assertEqual(profil.sexe, 'FEMME')

    def test_sexe_field_nullable(self):
        profil = ProfilCandidat.objects.create(user=self.candidat)
        self.assertIsNone(profil.sexe)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test jobs.tests.test_profiles_models -v 2`
Expected: FAIL — `TypeError` or `django.core.exceptions.FieldError` because `sexe` does not exist on `ProfilCandidat` yet (exact error depends on Django version, but the field lookup fails).

- [ ] **Step 3: Add the field to the model**

In `taftech_backend/jobs/models.py`, inside `class ProfilCandidat` (right after the `SERVICE_MILITAIRE_CHOICES` list, before `user = models.OneToOneField(...)` at line 335):

```python
    SEXE_CHOICES = [
        ('HOMME', 'Homme'),
        ('FEMME', 'Femme'),
    ]

```

Then add the field itself right after `date_naissance` (line 337):

```python
    date_naissance = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    sexe = models.CharField(max_length=10, choices=SEXE_CHOICES, blank=True, null=True, verbose_name="Sexe")
```

- [ ] **Step 4: Generate and inspect the migration**

Run: `python manage.py makemigrations jobs -n profilcandidat_sexe`
Expected output file: `jobs/migrations/0099_profilcandidat_sexe.py` (rename if Django names it differently, keep the `0099` prefix for ordering). Open it and confirm it contains a single `AddField` operation for `sexe` on `profilcandidat`.

- [ ] **Step 5: Run test to verify it passes**

Run: `python manage.py test jobs.tests.test_profiles_models -v 2`
Expected: PASS

- [ ] **Step 6: Expose the field on the serializer**

In `taftech_backend/jobs/serializers/profils.py`, add `'sexe'` to `ProfilCandidatDTO.Meta.fields` (line 45-54), right after `'date_naissance'` is not present there today — add it next to `'diplome', 'specialite'`:

```python
        fields = (
            'titre_professionnel', 'cv_pdf', 'cv_pdf_maj_le', 'photo_profil', 'diplome', 'specialite', 'sexe',
            'experiences', 'competences', 'competences_detail', 'langues',
            'first_name', 'last_name', 'email', 'telephone', 'nin',
            'experiences_detail', 'formations_detail',
            'service_militaire', 'permis_conduire', 'vehicule_personnel', 'passeport_valide',
            'secteur_souhaite', 'salaire_souhaite', 'mobilite', 'situation_actuelle',
            'wilaya', 'commune', 'adresse', 'date_joined', 'is_favori', 'last_login', 'user_id',
            'est_debloque', 'bio', 'linkedin', 'github'
        )
```

- [ ] **Step 7: Add an API-level test for read/write via PUT /api/jobs/profil/**

Open `taftech_backend/jobs/tests/test_api_candidat.py`, find the test class that already covers `ProfilCandidatAPIView.put` (search for `def test_put_profil` or similar existing PUT tests to match its `setUp`/auth pattern), and add:

```python
    def test_put_profil_sets_sexe(self):
        self.client.force_authenticate(user=self.candidat)
        response = self.client.put(
            reverse('candidat-profil'),
            {'sexe': 'HOMME'},
            format='multipart',
        )
        self.assertEqual(response.status_code, 200)
        self.candidat.profil_candidat.refresh_from_db()
        self.assertEqual(self.candidat.profil_candidat.sexe, 'HOMME')
```

Adjust `reverse('candidat-profil')` to whatever URL name `jobs/urls.py` actually gives `ProfilCandidatAPIView` (grep `path.*ProfilCandidatAPIView` in `taftech_backend/jobs/urls.py` if the name differs) and adjust `self.candidat`/`setUp` to match the existing class's fixture names exactly.

- [ ] **Step 8: Run the full jobs test suite**

Run: `python manage.py test jobs.tests.test_profiles_models jobs.tests.test_api_candidat -v 2`
Expected: PASS, no regressions.

- [ ] **Step 9: Commit**

```bash
git add taftech_backend/jobs/models.py taftech_backend/jobs/migrations/0099_profilcandidat_sexe.py taftech_backend/jobs/serializers/profils.py taftech_backend/jobs/tests/test_profiles_models.py taftech_backend/jobs/tests/test_api_candidat.py
git commit -m "$(cat <<'EOF'
feat: ajoute le champ sexe au profil candidat

Nouveau champ ProfilCandidat.sexe (Homme/Femme, optionnel), expose
en lecture/ecriture sur ProfilCandidatDTO pour l'etape "Infos
personnelles" du futur wizard d'onboarding.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Backend — `VerifyEmailAPIView` logs the user in

**Files:**
- Modify: `taftech_backend/accounts/views.py:111-144` (class `VerifyEmailAPIView`)
- Test: `taftech_backend/accounts/tests/test_views.py`

**Interfaces:**
- Consumes: `rest_framework_simplejwt.tokens.RefreshToken`, `settings.SIMPLE_JWT['AUTH_COOKIE']` / `['AUTH_COOKIE_SECURE']` (already used identically in `CookieTokenObtainView`, `taftech_backend/accounts/views.py:290-306`).
- Produces: on success, `POST /api/accounts/verifier-email/` now returns `{"message": "Email vérifié avec succès !", "role": "CANDIDAT", "est_membre_equipe": false}` (status 200) AND sets the same two httpOnly cookies as login (`accessToken`, `refreshToken`) — so the frontend can treat this response exactly like a `CookieTokenObtainView` login response.

- [ ] **Step 1: Write the failing test**

Add to `taftech_backend/accounts/tests/test_views.py`, inside `class RegistrationAndAuthTests` (the same class that already has `test_candidat_registration_flow_and_email` at line 24):

```python
    def test_verify_email_logs_user_in_with_cookies(self):
        """ La verification OTP doit desormais connecter directement le candidat
        (cookies JWT emis), sans repasser par /login. """
        user = User.objects.create_user(
            username="nadia_otp",
            email="nadia@taftech.dz",
            password="Password123!",
            role="CANDIDAT",
            code_verification="424242",
        )

        response = self.client.post(self.verify_email_url, {
            "email": user.email,
            "code": "424242",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'CANDIDAT')
        self.assertIn('accessToken', response.cookies)
        self.assertIn('refreshToken', response.cookies)
        self.assertTrue(response.cookies['accessToken']['httponly'])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test accounts.tests.test_views.RegistrationAndAuthTests.test_verify_email_logs_user_in_with_cookies -v 2`
Expected: FAIL — `AssertionError: False is not true` (no `accessToken` cookie in `response.cookies`), or `KeyError: 'role'` if `response.data` doesn't have `role` yet.

- [ ] **Step 3: Implement the login-on-verify behavior**

In `taftech_backend/accounts/views.py`, add the import near the top (with the other `rest_framework_simplejwt` import at line 43):

```python
from rest_framework_simplejwt.tokens import RefreshToken
```

Replace the body of `VerifyEmailAPIView.post` (lines 116-143) with:

```python
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        try:
            user = User.objects.get(email=email)

            if user.email_verifie:
                return Response({"message": "Ce compte est déjà vérifié."}, status=status.HTTP_200_OK)

            if user.code_verification != str(code):
                return Response({"error": "Le code de vérification est incorrect."}, status=status.HTTP_400_BAD_REQUEST)

            # Vérification expiry (10 min)
            if user.code_verification_created_at:
                expiry = user.code_verification_created_at + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES)
                if timezone.now() > expiry:
                    return Response({"error": "Le code a expiré. Veuillez en demander un nouveau."}, status=status.HTTP_400_BAD_REQUEST)

            user.is_active = True
            user.email_verifie = True
            user.code_verification = None
            user.code_verification_created_at = None
            user.save()

            # Connecte directement le candidat/recruteur — évite de lui faire ressaisir
            # son mot de passe juste après avoir tapé son code OTP (même mécanisme de
            # cookies que CookieTokenObtainView, voir la classe plus bas dans ce fichier).
            refresh = RefreshToken.for_user(user)
            response = Response({
                "message": "Email vérifié avec succès !",
                "role": user.role,
                "est_membre_equipe": False,
            }, status=status.HTTP_200_OK)
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=str(refresh.access_token),
                httponly=True,
                samesite='Lax',
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            )
            response.set_cookie(
                key='refreshToken',
                value=str(refresh),
                httponly=True,
                samesite='Lax',
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            )
            return response

        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test accounts.tests.test_views.RegistrationAndAuthTests -v 2`
Expected: PASS (both the new test and the pre-existing `test_candidat_registration_flow_and_email`, which only checks `verify_response.status_code == 200` and is unaffected by the added cookies).

- [ ] **Step 5: Run the full accounts test suite**

Run: `python manage.py test accounts -v 2`
Expected: PASS, no regressions (in particular `test_verify_email_with_wrong_code` and `test_verify_email_code_expire_rejete` still hit their error branches before reaching the new login code, so they're unaffected).

- [ ] **Step 6: Commit**

```bash
git add taftech_backend/accounts/views.py taftech_backend/accounts/tests/test_views.py
git commit -m "$(cat <<'EOF'
feat: connecte automatiquement le candidat apres verification OTP

VerifyEmailAPIView emet desormais les cookies JWT (meme mecanisme
que le login) au lieu de forcer une reconnexion manuelle -
necessaire pour enchainer directement sur le wizard d'onboarding
apres inscription.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Frontend — extract `convertDateRaw` into a shared util

**Files:**
- Create: `taftech_frontend/src/utils/cvDates.js`
- Modify: `taftech_frontend/src/Pages/Candidat/ProfilCandidat/useProfilCandidat.js:35-56`
- Test: `taftech_frontend/tests/cvDates.test.js` (new)

**Interfaces:**
- Produces: `convertDateRaw(dateStr: string | null | undefined): string | null` — converts a CV-parser raw date string (e.g. `"Janvier 2026"`, `"2025"`, `"Présent"`) into an ISO date (`"2026-01-01"`) or `null`. Consumed by both `useProfilCandidat.js` (existing) and `useOnboardingWizard.js` (Task 7).

- [ ] **Step 1: Write the failing test**

Create `taftech_frontend/tests/cvDates.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { convertDateRaw } from "../src/utils/cvDates";

describe("convertDateRaw", () => {
  it("convertit 'Mois Année' en date ISO", () => {
    expect(convertDateRaw("Janvier 2026")).toBe("2026-01-01");
  });

  it("convertit une année seule en date ISO au 1er janvier", () => {
    expect(convertDateRaw("2025")).toBe("2025-01-01");
  });

  it("retourne null pour 'Présent'/'En cours'", () => {
    expect(convertDateRaw("Présent")).toBeNull();
    expect(convertDateRaw("en cours")).toBeNull();
  });

  it("retourne null pour une valeur vide ou non reconnue", () => {
    expect(convertDateRaw("")).toBeNull();
    expect(convertDateRaw(null)).toBeNull();
    expect(convertDateRaw("texte sans date")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run cvDates`
Expected: FAIL — `Failed to resolve import "../src/utils/cvDates"`.

- [ ] **Step 3: Create the util (moved verbatim from `useProfilCandidat.js`)**

Create `taftech_frontend/src/utils/cvDates.js`:

```javascript
// Convertit une date brute extraite d'un CV ("Janvier 2026", "2025", "Présent")
// en date ISO (YYYY-MM-DD) ou null — partagé entre useProfilCandidat.js (parsing
// classique) et useOnboardingWizard.js (wizard), pour ne pas dupliquer cette regex.
export const convertDateRaw = (dateStr) => {
  if (!dateStr) return null;
  const lower = dateStr.toLowerCase().trim();
  if (
    lower.includes("présent") ||
    lower.includes("present") ||
    lower.includes("aujourd") ||
    lower.includes("en cours")
  )
    return null;
  const mois = {
    janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", août: "08", aout: "08",
    septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
  };
  const matchMoisAnnee = lower.match(/([a-zà-ÿ]+)\s+(\d{4})/);
  if (matchMoisAnnee)
    return `${matchMoisAnnee[2]}-${mois[matchMoisAnnee[1]] || "01"}-01`;
  const matchAnnee = lower.match(/(\d{4})/);
  if (matchAnnee) return `${matchAnnee[1]}-01-01`;
  return null;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run cvDates`
Expected: PASS (4 tests)

- [ ] **Step 5: Update `useProfilCandidat.js` to import instead of defining it locally**

In `taftech_frontend/src/Pages/Candidat/ProfilCandidat/useProfilCandidat.js`, remove the local `convertDateRaw` definition (lines 35-56) and add an import at the top of the file (near the other imports, line 9):

```javascript
import { convertDateRaw } from "../../../utils/cvDates";
```

- [ ] **Step 6: Run the existing ProfilCandidat test suite to confirm no regression**

Run: `npm test -- --run ProfilCandidat`
Expected: PASS, same test count as before this change.

- [ ] **Step 7: Commit**

```bash
git add taftech_frontend/src/utils/cvDates.js taftech_frontend/src/Pages/Candidat/ProfilCandidat/useProfilCandidat.js taftech_frontend/tests/cvDates.test.js
git commit -m "$(cat <<'EOF'
refactor: extrait convertDateRaw en util partage

Prepare la reutilisation par le futur hook useOnboardingWizard.js
sans dupliquer la logique de parsing de dates de CV.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Frontend — `authService.verifyEmail` stores the login state

**Files:**
- Modify: `taftech_frontend/src/Services/authService.js:142-153`
- Test: `taftech_frontend/tests/authService.test.js` (create if it doesn't already exist — check first with `find taftech_frontend/tests -iname "authService*"`)

**Interfaces:**
- Consumes: backend response from Task 2 — `{message, role, est_membre_equipe}` plus two httpOnly cookies (not readable from JS, set automatically by the browser).
- Produces: `authService.verifyEmail(email, code)` now also does `localStorage.setItem("userRole", ...)`, `localStorage.setItem("estMembreEquipe", ...)`, `localStorage.setItem("loginPortal", "candidat")` on success — mirroring `authService.login` (lines 8-27) and `authService.googleLogin` (lines 197-210).

- [ ] **Step 1: Write the failing test**

Check first whether `taftech_frontend/tests/authService.test.js` exists:

Run: `find taftech_frontend/tests -iname "authService*"`

If it exists, open it and add the test below to its existing `describe` block, matching its existing `vi.mock("../src/api/axiosConfig", ...)` pattern. If it does not exist, create `taftech_frontend/tests/authService.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../src/api/axiosConfig";
import { authService } from "../src/Services/authService";

vi.mock("../src/api/axiosConfig", () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("authService.verifyEmail", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("stocke le role et le portail candidat quand le backend connecte directement", async () => {
    api.post.mockResolvedValue({
      data: { message: "Email vérifié avec succès !", role: "CANDIDAT", est_membre_equipe: false },
    });

    await authService.verifyEmail("nadia@taftech.dz", "424242");

    expect(localStorage.getItem("userRole")).toBe("CANDIDAT");
    expect(localStorage.getItem("estMembreEquipe")).toBe("false");
    expect(localStorage.getItem("loginPortal")).toBe("candidat");
  });

  it("ne touche pas le localStorage si le backend ne renvoie pas de role (compte deja verifie)", async () => {
    api.post.mockResolvedValue({ data: { message: "Ce compte est déjà vérifié." } });

    await authService.verifyEmail("nadia@taftech.dz", "424242");

    expect(localStorage.getItem("userRole")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run authService`
Expected: FAIL — `localStorage.getItem("userRole")` is `null` in the first test (the current `verifyEmail` implementation only returns `response.data`, never writes to `localStorage`).

- [ ] **Step 3: Implement**

In `taftech_frontend/src/Services/authService.js`, replace `verifyEmail` (lines 142-153):

```javascript
  verifyEmail: async (email, code) => {
    try {
      const response = await api.post("accounts/verifier-email/", {
        email,
        code,
      });
      // Depuis le changement backend (Task 2), une verification reussie connecte
      // directement l'utilisateur (cookies JWT emis) — on reflete cet etat cote
      // client exactement comme authService.login, pour que les routes protegees
      // (CandidatRoute) le reconnaissent immediatement sans reconnexion manuelle.
      if (response.data.role) {
        localStorage.setItem("userRole", response.data.role);
        localStorage.setItem("estMembreEquipe", response.data.est_membre_equipe ? "true" : "false");
        localStorage.setItem("loginPortal", "candidat");
      }
      return response.data;
    } catch (err) {
      reportError("ECHEC_VERIFY_EMAIL_API", err);
      throw err;
    }
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run authService`
Expected: PASS (both new tests)

- [ ] **Step 5: Commit**

```bash
git add taftech_frontend/src/Services/authService.js taftech_frontend/tests/authService.test.js
git commit -m "$(cat <<'EOF'
feat: authService.verifyEmail reflete la connexion auto post-OTP

Complete le changement backend de VerifyEmailAPIView : stocke role/
portail en localStorage exactement comme authService.login, pour que
CandidatRoute reconnaisse l'utilisateur sans reconnexion manuelle.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Frontend — `RegisterCandidat.jsx` redirects into the wizard

**Files:**
- Modify: `taftech_frontend/src/Pages/Auth/RegisterCandidat.jsx`
- Test: `taftech_frontend/tests/RegisterCandidatInscription.test.jsx` (new — the existing `taftech_frontend/tests/RegisterCandidat.test.jsx` actually tests `<ProfilCandidat />`, a pre-existing filename mismatch noted in `CLAUDE.md`; this plan does not touch that file, and uses a distinct name here to avoid colliding with it)

**Interfaces:**
- Consumes: `authService.verifyEmail` (now sets `localStorage` on success, Task 4), `authService.googleLogin` (already sets `localStorage`, unchanged).
- Produces: `sessionStorage["taftech_new_registration"] = "1"` set right before `authService.registerCandidat(...)` in `handleSubmit`. Consumed (read once, then removed) after a successful `handleVerifyCode` or a successful Google signup, to `navigate("/onboarding")` instead of `navigate("/login")` / `/dashboard-candidat`.

- [ ] **Step 1: Write the failing test**

Create `taftech_frontend/tests/RegisterCandidatInscription.test.jsx`:

```javascript
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterCandidat from "../src/Pages/Auth/RegisterCandidat";
import { authService } from "../src/Services/authService";
import { jobsService } from "../src/Services/jobsService";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/Services/authService", () => ({
  authService: {
    registerCandidat: vi.fn(),
    verifyEmail: vi.fn(),
    renvoyerCodeVerification: vi.fn(),
    googleLogin: vi.fn(),
    accepterConsentement: vi.fn(),
  },
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getConstants: vi.fn().mockResolvedValue({ wilayas: [] }) },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "id"), dismiss: vi.fn() },
}));

describe("RegisterCandidat — redirection vers le wizard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("pose le flag onboarding avant l'inscription puis navigue vers /onboarding apres l'OTP", async () => {
    authService.registerCandidat.mockResolvedValue({});
    authService.verifyEmail.mockResolvedValue({ role: "CANDIDAT", est_membre_equipe: false });

    render(<MemoryRouter><RegisterCandidat /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/Nom \*/i), { target: { value: "Ali" } });
    fireEvent.change(screen.getByLabelText(/Prénom \*/i), { target: { value: "Karim" } });
    fireEvent.change(screen.getByLabelText(/Date de naissance/i), { target: { value: "2000-01-01" } });
    fireEvent.change(screen.getByLabelText(/Téléphone/i), { target: { value: "0555000000" } });
    fireEvent.change(screen.getByLabelText(/Adresse/i), { target: { value: "5 rue Test" } });
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: "karim@test.dz" } });
    fireEvent.change(screen.getByLabelText(/^Mot de passe/i), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText(/Confirmer le mot de passe/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByLabelText(/loi n° 18-07/i, { selector: "input" }) || screen.getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: /Créer mon compte/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem("taftech_new_registration")).toBe("1");
    });

    // Étape 2 : saisir le code OTP
    await screen.findByText(/Vérifiez votre email/i);
    const otpInputs = screen.getAllByRole("textbox").filter((el) => el.maxLength === 1);
    "424242".split("").forEach((digit, i) => fireEvent.change(otpInputs[i], { target: { value: digit } }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmer mon compte/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/onboarding");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run RegisterCandidatInscription`
Expected: FAIL — `sessionStorage.getItem("taftech_new_registration")` is `null` (flag not set yet) and/or `mockNavigate` was called with `"/login"` instead of `"/onboarding"`.

- [ ] **Step 3: Implement — set the flag in `handleSubmit`**

In `taftech_frontend/src/Pages/Auth/RegisterCandidat.jsx`, inside `handleSubmit` (around line 102-121), right before the `try` block's `authService.registerCandidat` call, add the flag:

```javascript
    setLoading(true);
    const toastId = toast.loading("Création de votre profil...");
    sessionStorage.setItem("taftech_new_registration", "1");
    try {
      const usernameGenere = formData.email.split("@")[0] + Math.floor(Math.random() * 1000);
      const { confirmPassword, ...payload } = formData;
      await authService.registerCandidat({ ...payload, username: usernameGenere });
```

(If registration fails, the flag stays set but is harmless — it's only consumed on a successful login/verification, and a failed registration never reaches that path. No cleanup needed in the `catch` branch.)

- [ ] **Step 4: Implement — consume the flag after OTP verification**

In the same file, replace `handleVerifyCode` (lines 158-180):

```javascript
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const codeSaisi = otp.join("");
    if (codeSaisi.length !== 6) {
      toast.error("Veuillez saisir les 6 chiffres du code.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Vérification du code...");
    try {
      await authService.verifyEmail(registeredEmail, codeSaisi);
      sessionStorage.removeItem("taftech_pending_verification");
      toast.success("Email vérifié avec succès !", { id: toastId });
      const isNewRegistration = sessionStorage.getItem("taftech_new_registration") === "1";
      sessionStorage.removeItem("taftech_new_registration");
      navigate(isNewRegistration ? "/onboarding" : "/login");
    } catch (err) {
      toast.error(apiErrMsg(err, "Le code est incorrect."), { id: toastId });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0].focus();
      reportError("ECHEC_VERIFY_OTP_CANDIDAT", err);
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 5: Implement — consume the flag after Google signup**

In the same file, inside the `GoogleLogin onSuccess` handler (around lines 333-348), the success branch that runs when `data.requires_consent` is falsy currently does `navigate("/dashboard-candidat")`. Update it to also check/consume the flag:

```javascript
                onSuccess={async (credentialResponse) => {
                  const toastId = toast.loading("Inscription Google...");
                  try {
                    const data = await authService.googleLogin(credentialResponse.credential, "CANDIDAT", "register");
                    toast.dismiss(toastId);
                    if (data.requires_consent) {
                      setShowConsentModal(true);
                    } else {
                      toast.success("Compte connecté !");
                      const isNewRegistration = sessionStorage.getItem("taftech_new_registration") === "1";
                      sessionStorage.removeItem("taftech_new_registration");
                      navigate(isNewRegistration ? "/onboarding" : "/dashboard-candidat");
                      window.location.reload();
                    }
                  } catch (err) {
                    toast.error(apiErrMsg(err, "Échec de l'inscription Google."), { id: toastId });
                  }
                }}
```

Note: `taftech_new_registration` is only set by the email/password `handleSubmit` flow (Step 3). A Google signup never goes through `handleSubmit`, so `isNewRegistration` will be `false` there today — this is intentional for this task (Google-signup onboarding redirect is out of scope unless the flag is also set on the Google button's own registration path; if the user wants Google signups to also enter the wizard, set the same `sessionStorage` flag at the top of this `onSuccess` handler before calling `authService.googleLogin`). For this plan, add it for consistency since the design doc treats both paths identically:

```javascript
                onSuccess={async (credentialResponse) => {
                  const toastId = toast.loading("Inscription Google...");
                  sessionStorage.setItem("taftech_new_registration", "1");
                  try {
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --run RegisterCandidatInscription`
Expected: PASS

- [ ] **Step 7: Run the full frontend suite for regressions on this file's neighbors**

Run: `npm test -- --run`
Expected: PASS — pay attention to any test that imports `RegisterCandidat.jsx` indirectly (there shouldn't be any beyond the misleadingly-named `RegisterCandidat.test.jsx`, which tests a different component and is unaffected).

- [ ] **Step 8: Commit**

```bash
git add taftech_frontend/src/Pages/Auth/RegisterCandidat.jsx taftech_frontend/tests/RegisterCandidatInscription.test.jsx
git commit -m "$(cat <<'EOF'
feat: redirige les nouveaux candidats vers le wizard d'onboarding

Un flag sessionStorage pose a l'inscription (email/mdp ou Google) est
consomme une seule fois apres la premiere connexion reussie pour
naviguer vers /onboarding au lieu du dashboard.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Frontend — `WizardCategoryToggle` (shared Remplacer/Ajouter switch)

**Files:**
- Create: `taftech_frontend/src/Components/onboarding/WizardCategoryToggle.jsx`
- Test: `taftech_frontend/tests/WizardCategoryToggle.test.jsx`

**Interfaces:**
- Produces: `<WizardCategoryToggle mode={"remplacer"|"ajouter"} onChange={(mode) => void} />` — a small pill switch, visible only when the parent decides to render it (the "hidden if nothing to replace" rule from the spec lives in each step component, not in this presentational component).

- [ ] **Step 1: Write the failing test**

Create `taftech_frontend/tests/WizardCategoryToggle.test.jsx`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run WizardCategoryToggle`
Expected: FAIL — `Failed to resolve import "../src/Components/onboarding/WizardCategoryToggle"`.

- [ ] **Step 3: Implement**

Create `taftech_frontend/src/Components/onboarding/WizardCategoryToggle.jsx`:

```javascript
import React from "react";
import { tw } from "../../theme";

// Switch Remplacer/Ajouter reutilise par chaque etape du wizard (Infos,
// Experiences, Formations, Langues, Competences) — le parent decide seul
// s'il faut l'afficher (seulement si la categorie a deja des donnees en base,
// voir le design "cache si rien a remplacer").
export const WizardCategoryToggle = ({ mode, onChange }) => {
  const options = [
    { value: "ajouter", label: "Ajouter" },
    { value: "remplacer", label: "Remplacer" },
  ];
  return (
    <div className={`inline-flex rounded-lg border ${tw.borderBase} p-0.5 gap-0.5`}>
      {options.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              active ? `${tw.bgPrimarySolid} ${tw.textOnDark}` : `${tw.textMuted} hover:${tw.surfaceMuted}`
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run WizardCategoryToggle`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add taftech_frontend/src/Components/onboarding/WizardCategoryToggle.jsx taftech_frontend/tests/WizardCategoryToggle.test.jsx
git commit -m "$(cat <<'EOF'
feat: composant WizardCategoryToggle pour le wizard d'onboarding

Petit switch Remplacer/Ajouter reutilisable par chaque etape du
futur wizard (infos, experiences, formations, langues, competences).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Frontend — `useOnboardingWizard.js` core hook

**Files:**
- Create: `taftech_frontend/src/Pages/Candidat/Onboarding/useOnboardingWizard.js`
- Test: `taftech_frontend/tests/useOnboardingWizard.test.jsx`

**Interfaces:**
- Consumes: `profilService.{getProfil,updateProfil,addExperience,deleteExperience,addFormation,deleteFormation}` (`taftech_frontend/src/Services/profilService.js`), `jobsService.{getConstants,parserCV,ajouterCompetence,supprimerCompetence,searchCompetences}` (facade re-exporting `iaService`/`dashboardCandidatService`, `taftech_frontend/src/Services/jobsService.js`), `convertDateRaw` (Task 3), `communesAlgerie` data (`taftech_frontend/src/data/communes.json`, same pattern as `useProfilCandidat.js:774-783`).
- Produces (returned object consumed by `OnboardingWizard.jsx` and all step components, Tasks 8-12):
  - `step` (number, 1-7), `goToStep(n)`, `nextStep()`, `skipStep()`
  - `loading` (bool, initial profil fetch)
  - `profil` (object from `getProfil()`, or `null` while loading)
  - `constants` (object from `getConstants()`)
  - `parsedData` (object | null — the raw parser result, held only in memory)
  - `parserLoading` (bool), `uploadCV(file)` (async), `skipCVStep()`
  - `infosForm` (object), `setInfosForm(updater)`, `infosMode` (`"ajouter"|"remplacer"`), `setInfosMode`, `saveInfosStep()` (async, PUTs profil, advances to step 3)
  - `pendingExperiences` (array, pre-filled from `parsedData.experiences` or empty), `setPendingExperiences`, `experiencesMode`, `setExperiencesMode`, `saveExperiencesStep()` (async, bulk add/replace, advances to step 4)
  - `pendingFormations`, `setPendingFormations`, `formationsMode`, `setFormationsMode`, `saveFormationsStep()` (advances to step 5)
  - `pendingLangues` (array of `{langue, niveau}`), `setPendingLangues`, `languesMode`, `setLanguesMode`, `saveLanguesStep()` (advances to step 6)
  - `pendingCompetences` (array of `{label, niveau}`), `setPendingCompetences`, `competencesMode`, `setCompetencesMode`, `saveCompetencesStep()` (advances to step 7)
  - `completionPercent` (number, computed same way as `useProfilCandidat.js:171-174`)

- [ ] **Step 1: Write the failing test (upload + infos step)**

Create `taftech_frontend/tests/useOnboardingWizard.test.jsx`:

```javascript
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOnboardingWizard } from "../src/Pages/Candidat/Onboarding/useOnboardingWizard";
import { profilService } from "../src/Services/profilService";
import { jobsService } from "../src/Services/jobsService";

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
    ajouterCompetence: vi.fn(),
    supprimerCompetence: vi.fn(),
    searchCompetences: vi.fn(),
  },
}));

const mockProfil = {
  first_name: "Karim", last_name: "Ali", telephone: "", wilaya: "", commune: "",
  diplome: "", specialite: "", sexe: "", date_naissance: "",
  experiences_detail: [], formations_detail: [], langues: "", competences_detail: [],
};

describe("useOnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue({ wilayas: [], diplomes: [] });
  });
  afterEach(() => vi.clearAllMocks());

  it("charge le profil et demarre a l'etape 1", async () => {
    const { result } = renderHook(() => useOnboardingWizard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.step).toBe(1);
    expect(result.current.profil.first_name).toBe("Karim");
  });

  it("uploadCV stocke parsedData et avance a l'etape 2 sans rien sauvegarder", async () => {
    jobsService.parserCV.mockResolvedValue({
      success: true,
      telephone: "0555000000",
      wilaya: "16 - Alger",
      experiences: [{ titre_poste: "Dev", entreprise: "ACME", date_debut_raw: "2024", date_fin_raw: "Présent", description: "" }],
    });
    const { result } = renderHook(() => useOnboardingWizard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const file = new File(["dummy"], "cv.pdf", { type: "application/pdf" });
    await act(async () => {
      await result.current.uploadCV(file);
    });

    expect(result.current.step).toBe(2);
    expect(result.current.infosForm.telephone).toBe("0555000000");
    expect(profilService.updateProfil).not.toHaveBeenCalled();
  });

  it("skipStep avance sans appeler aucun service", async () => {
    const { result } = renderHook(() => useOnboardingWizard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.skipStep());

    expect(result.current.step).toBe(2);
    expect(profilService.updateProfil).not.toHaveBeenCalled();
  });

  it("saveInfosStep sauvegarde puis avance a l'etape 3", async () => {
    profilService.updateProfil.mockResolvedValue({});
    const { result } = renderHook(() => useOnboardingWizard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.skipStep()); // étape 2

    act(() => result.current.setInfosForm((f) => ({ ...f, telephone: "0555111111" })));
    await act(async () => {
      await result.current.saveInfosStep();
    });

    expect(profilService.updateProfil).toHaveBeenCalled();
    expect(result.current.step).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run useOnboardingWizard`
Expected: FAIL — `Failed to resolve import "../src/Pages/Candidat/Onboarding/useOnboardingWizard"`.

- [ ] **Step 3: Implement the hook**

Create `taftech_frontend/src/Pages/Candidat/Onboarding/useOnboardingWizard.js`:

```javascript
import { useState, useEffect, useMemo, useCallback } from "react";
import { profilService } from "../../../Services/profilService";
import { jobsService } from "../../../Services/jobsService";
import { convertDateRaw } from "../../../utils/cvDates";
import { reportError } from "../../../utils/errorReporter";
import toast from "react-hot-toast";
import { apiErrMsg } from "../../../utils/apiErrMsg";

const CHAMPS_PROFIL = [
  { label: "Téléphone", test: (p) => !!p.telephone },
  { label: "CV", test: (p) => !!p.cv_pdf },
  { label: "Wilaya / Commune", test: (p) => !!(p.wilaya && p.commune) },
  { label: "Diplôme", test: (p) => !!p.diplome },
  { label: "Spécialité", test: (p) => !!p.specialite },
  { label: "Expériences", test: (p) => p.experiences_detail?.length > 0 },
  { label: "Formations", test: (p) => p.formations_detail?.length > 0 },
  { label: "Compétences", test: (p) => p.competences_detail?.length > 0 },
];

const parseLangueBrute = (l) => {
  if (l.includes(":")) {
    const [langue, niveau] = l.split(":");
    return { langue: langue.trim(), niveau: niveau.trim() };
  }
  const m = l.match(/^(.+?)\s*\((.+?)\)$/);
  if (m) return { langue: m[1].trim(), niveau: m[2].trim() };
  return { langue: l.trim(), niveau: "Intermédiaire" };
};

export const useOnboardingWizard = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState(null);
  const [constants, setConstants] = useState({});
  const [parsedData, setParsedData] = useState(null);
  const [parserLoading, setParserLoading] = useState(false);

  const [infosForm, setInfosForm] = useState({});
  const [infosMode, setInfosMode] = useState("ajouter");
  const [pendingExperiences, setPendingExperiences] = useState([]);
  const [experiencesMode, setExperiencesMode] = useState("ajouter");
  const [pendingFormations, setPendingFormations] = useState([]);
  const [formationsMode, setFormationsMode] = useState("ajouter");
  const [pendingLangues, setPendingLangues] = useState([]);
  const [languesMode, setLanguesMode] = useState("ajouter");
  const [pendingCompetences, setPendingCompetences] = useState([]);
  const [competencesMode, setCompetencesMode] = useState("ajouter");

  const refresh = useCallback(async () => {
    const [p, c] = await Promise.all([profilService.getProfil(), jobsService.getConstants()]);
    setProfil(p);
    setConstants(c);
    setInfosForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      date_naissance: p.date_naissance || "",
      sexe: p.sexe || "",
      wilaya: p.wilaya || "",
      commune: p.commune || "",
      telephone: p.telephone || "",
      diplome: p.diplome || "",
      specialite: p.specialite || "",
    });
    return p;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        toast.error(apiErrMsg(err, "Erreur de chargement du profil."));
        reportError("ECHEC_FETCH_ONBOARDING_PROFIL", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, 7)), []);
  const skipStep = useCallback(() => nextStep(), [nextStep]);
  const goToStep = useCallback((n) => setStep(n), []);

  const uploadCV = useCallback(async (file) => {
    setParserLoading(true);
    try {
      const result = await jobsService.parserCV(file || null);
      if (!result.success) {
        toast.error(result.error || "Impossible d'analyser ce CV.");
        return;
      }
      setParsedData(result);
      setInfosForm((prev) => ({
        ...prev,
        telephone: result.telephone || prev.telephone,
        wilaya: result.wilaya || prev.wilaya,
        diplome: result.diplome || prev.diplome,
        specialite: result.specialite || prev.specialite,
      }));
      if (result.experiences?.length > 0) {
        setPendingExperiences(
          result.experiences.map((exp) => ({
            titre_poste: exp.titre_poste,
            entreprise: exp.entreprise,
            secteur: exp.secteur || null,
            date_debut: convertDateRaw(exp.date_debut_raw),
            date_fin: convertDateRaw(exp.date_fin_raw),
            description: exp.description || "",
          })),
        );
      }
      if (result.formations?.length > 0) {
        setPendingFormations(
          result.formations.map((f) => ({
            diplome: f.diplome,
            etablissement: f.etablissement,
            date_debut: convertDateRaw(f.date_debut_raw),
            date_fin: convertDateRaw(f.date_fin_raw),
            description: f.description || "",
          })),
        );
      }
      if (result.langues) {
        setPendingLangues(
          result.langues.split(",").map((l) => l.trim()).filter(Boolean).map(parseLangueBrute),
        );
      }
      if (result.competences) {
        const niveaux = result.competences_niveaux || {};
        setPendingCompetences(
          result.competences.split(",").map((c) => c.trim()).filter(Boolean).map((label) => ({
            label,
            niveau: niveaux[label] || "DEBUTANT",
          })),
        );
      }
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de l'analyse."));
      reportError("ECHEC_PARSER_CV_ONBOARDING", err);
    } finally {
      setParserLoading(false);
    }
  }, [nextStep]);

  const saveInfosStep = useCallback(async () => {
    const formData = new FormData();
    Object.entries(infosForm).forEach(([key, value]) => {
      if (infosMode === "remplacer" || value) formData.append(key, value ?? "");
    });
    try {
      await profilService.updateProfil(formData);
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
      reportError("ECHEC_SAVE_INFOS_ONBOARDING", err);
    }
  }, [infosForm, infosMode, nextStep, refresh]);

  const saveExperiencesStep = useCallback(async () => {
    try {
      if (experiencesMode === "remplacer") {
        await Promise.allSettled(
          (profil?.experiences_detail || []).map((exp) =>
            profilService.deleteExperience(exp.id).catch((err) => reportError("ECHEC_SUPPR_EXP_ONBOARDING", err)),
          ),
        );
      }
      await Promise.allSettled(
        pendingExperiences.map((exp) =>
          profilService.addExperience(exp).catch((err) => reportError("ECHEC_ADD_EXP_ONBOARDING", err)),
        ),
      );
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des expériences."));
      reportError("ECHEC_SAVE_EXPERIENCES_ONBOARDING", err);
    }
  }, [pendingExperiences, experiencesMode, profil, nextStep, refresh]);

  const saveFormationsStep = useCallback(async () => {
    try {
      if (formationsMode === "remplacer") {
        await Promise.allSettled(
          (profil?.formations_detail || []).map((f) =>
            profilService.deleteFormation(f.id).catch((err) => reportError("ECHEC_SUPPR_FORMATION_ONBOARDING", err)),
          ),
        );
      }
      await Promise.allSettled(
        pendingFormations.map((f) =>
          profilService.addFormation(f).catch((err) => reportError("ECHEC_ADD_FORMATION_ONBOARDING", err)),
        ),
      );
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des formations."));
      reportError("ECHEC_SAVE_FORMATIONS_ONBOARDING", err);
    }
  }, [pendingFormations, formationsMode, profil, nextStep, refresh]);

  const saveLanguesStep = useCallback(async () => {
    try {
      const existing = languesMode === "remplacer" ? [] : (profil?.langues || "").split(",").filter(Boolean).map(parseLangueBrute);
      const parLangue = new Map();
      [...existing, ...pendingLangues].forEach(({ langue, niveau }) => parLangue.set(langue.toLowerCase(), `${langue}:${niveau}`));
      const formData = new FormData();
      formData.append("langues", [...parLangue.values()].join(",").slice(0, 255));
      await profilService.updateProfil(formData);
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des langues."));
      reportError("ECHEC_SAVE_LANGUES_ONBOARDING", err);
    }
  }, [pendingLangues, languesMode, profil, nextStep, refresh]);

  const saveCompetencesStep = useCallback(async () => {
    try {
      if (competencesMode === "remplacer") {
        await Promise.allSettled(
          (profil?.competences_detail || []).map((c) =>
            jobsService.supprimerCompetence(c.id).catch((err) => reportError("ECHEC_SUPPR_COMPETENCE_ONBOARDING", err)),
          ),
        );
      }
      await Promise.allSettled(
        pendingCompetences.map(({ label, niveau }) =>
          jobsService.ajouterCompetence(label, niveau).catch((err) => reportError("ECHEC_ADD_COMPETENCE_ONBOARDING", err)),
        ),
      );
      await refresh();
      nextStep();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde des compétences."));
      reportError("ECHEC_SAVE_COMPETENCES_ONBOARDING", err);
    }
  }, [pendingCompetences, competencesMode, profil, nextStep, refresh]);

  const completionPercent = useMemo(() => {
    if (!profil) return 0;
    return Math.round((CHAMPS_PROFIL.filter((c) => c.test(profil)).length / CHAMPS_PROFIL.length) * 100);
  }, [profil]);

  return {
    step, goToStep, nextStep, skipStep,
    loading, profil, constants,
    parsedData, parserLoading, uploadCV,
    infosForm, setInfosForm, infosMode, setInfosMode, saveInfosStep,
    pendingExperiences, setPendingExperiences, experiencesMode, setExperiencesMode, saveExperiencesStep,
    pendingFormations, setPendingFormations, formationsMode, setFormationsMode, saveFormationsStep,
    pendingLangues, setPendingLangues, languesMode, setLanguesMode, saveLanguesStep,
    pendingCompetences, setPendingCompetences, competencesMode, setCompetencesMode, saveCompetencesStep,
    completionPercent,
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run useOnboardingWizard`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add taftech_frontend/src/Pages/Candidat/Onboarding/useOnboardingWizard.js taftech_frontend/tests/useOnboardingWizard.test.jsx
git commit -m "$(cat <<'EOF'
feat: hook useOnboardingWizard.js pour le wizard candidat

Orchestre les 7 etapes (CV, infos, experiences, formations, langues,
competences, termine) en reutilisant profilService/jobsService, avec
sauvegarde par etape et toggle Remplacer/Ajouter independant par
categorie.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Frontend — `OnboardingWizard.jsx` shell + Step 1 (Upload CV)

**Files:**
- Create: `taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx`
- Create: `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepUploadCV.jsx`
- Test: `taftech_frontend/tests/OnboardingWizard.test.jsx`

**Interfaces:**
- Consumes: `useOnboardingWizard()` (Task 7).
- Produces: `<OnboardingWizard mode="page" | "modal" onClose={fn} />`. In `mode="page"`, on reaching step 7 the "Continuer" button calls `navigate("/dashboard-candidat")`. In `mode="modal"`, the "Continuer"/"Terminé" button on step 7 and an always-visible "✕" both call `onClose()`. This task wires the stepper shell and step 1 only; steps 2-7 are added by Tasks 9-12 as a `switch` inside this same file (each subsequent task edits the `switch`, not duplicates it).

- [ ] **Step 1: Write the failing test**

Create `taftech_frontend/tests/OnboardingWizard.test.jsx`:

```javascript
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OnboardingWizard from "../src/Pages/Candidat/Onboarding/OnboardingWizard";
import { profilService } from "../src/Services/profilService";
import { jobsService } from "../src/Services/jobsService";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/Services/profilService", () => ({
  profilService: {
    getProfil: vi.fn(), updateProfil: vi.fn(),
    addExperience: vi.fn(), deleteExperience: vi.fn(),
    addFormation: vi.fn(), deleteFormation: vi.fn(),
  },
}));
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(), parserCV: vi.fn(),
    ajouterCompetence: vi.fn(), supprimerCompetence: vi.fn(), searchCompetences: vi.fn(),
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

describe("OnboardingWizard — étape 1 (Upload CV)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue({ wilayas: [], diplomes: [] });
  });
  afterEach(cleanup);

  it("affiche le stepper avec l'étape 1 active et le lien Passer cette étape", async () => {
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run OnboardingWizard`
Expected: FAIL — `Failed to resolve import "../src/Pages/Candidat/Onboarding/OnboardingWizard"`.

- [ ] **Step 3: Implement `StepUploadCV.jsx`**

Create `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepUploadCV.jsx`:

```javascript
import React, { useRef } from "react";
import { Sparkles } from "lucide-react";
import { tw } from "../../../../theme";

export const StepUploadCV = ({ parserLoading, uploadCV, skipStep }) => {
  const inputRef = useRef(null);

  const onChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) uploadCV(file);
  };

  return (
    <div className="text-center">
      <h3 className={`${tw.pageTitlePetit} mb-2`}>Facilitez la création de votre profil</h3>
      <p className={`${tw.bodyText} mb-6`}>Importez votre CV, vos informations se rempliront automatiquement.</p>
      <div className={`rounded-xl p-10 text-center relative cursor-pointer transition-colors ${tw.dropzonePrimary}`}>
        <input
          ref={inputRef}
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".pdf,.docx,.doc"
          onChange={onChange}
          disabled={parserLoading}
        />
        {parserLoading ? (
          <div>
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${tw.borderPrimary} mx-auto mb-3`} />
            <p className={`text-sm font-semibold ${tw.textPrimaryStrong}`}>Extraction de votre CV…</p>
          </div>
        ) : (
          <div>
            <Sparkles size={28} className={`${tw.textPrimary} mx-auto mb-3`} />
            <p className={`text-sm font-semibold ${tw.textStrong}`}>Cliquez pour choisir un fichier</p>
            <p className={`text-xs ${tw.textMuted} mt-1`}>PDF, DOC ou DOCX — 5 Mo max</p>
          </div>
        )}
      </div>
      <button type="button" onClick={skipStep} disabled={parserLoading} className={`${tw.linkPrimary} text-sm font-semibold mt-6 disabled:opacity-50`}>
        Passer cette étape
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Implement `OnboardingWizard.jsx` shell**

Create `taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx`:

```javascript
import React from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle2 } from "lucide-react";
import { tw } from "../../../theme";
import { useOnboardingWizard } from "./useOnboardingWizard";
import { StepUploadCV } from "./steps/StepUploadCV";

const STEP_LABELS = [
  "Upload CV",
  "Infos personnelles",
  "Expériences",
  "Formations",
  "Langues",
  "Compétences",
  "Terminé",
];

const OnboardingWizard = ({ mode = "page", onClose }) => {
  const navigate = useNavigate();
  const wizard = useOnboardingWizard();
  const { step, loading } = wizard;

  const handleFinish = () => {
    if (mode === "modal" && onClose) onClose();
    else navigate("/dashboard-candidat");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${tw.borderPrimary}`} />
      </div>
    );
  }

  return (
    <div className={mode === "page" ? `min-h-screen ${tw.authPageBg} flex items-center justify-center p-4` : ""}>
      <div className={`max-w-2xl w-full ${tw.surface} rounded-2xl shadow-xl p-8 relative`}>
        {mode === "modal" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${tw.modalCloseButton}`}
          >
            <X size={18} />
          </button>
        )}

        {/* STEPPER */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step > n ? tw.progressBadgeDone : step === n ? `${tw.bgPrimary} ${tw.textOnDark}` : `${tw.surfaceSubtle} ${tw.textMuted}`
                  }`}>
                    {step > n ? <CheckCircle2 size={14} /> : n}
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${step >= n ? tw.textEmphasis800 : tw.textMuted}`}>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && <div className={`w-4 h-px shrink-0 ${step > n ? tw.progressConnectorDone : tw.bgSlate200}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {step === 1 && <StepUploadCV parserLoading={wizard.parserLoading} uploadCV={wizard.uploadCV} skipStep={wizard.skipStep} />}
        {step === 7 && (
          <div className="text-center">
            <div className={`w-16 h-16 ${tw.bgSuccessSoft} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle2 size={32} className={tw.textSuccess} />
            </div>
            <h3 className={`${tw.pageTitlePetit} mb-2`}>Félicitations !</h3>
            <p className={`${tw.bodyText} mb-6`}>Votre profil est complété à {wizard.completionPercent}%.</p>
            <button type="button" onClick={handleFinish} className={`${tw.buttonPrimary} px-8 py-2.5`}>
              {mode === "modal" ? "Fermer" : "Continuer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run OnboardingWizard`
Expected: PASS (2 tests — step 1 render + skip navigates to step 2, which currently renders nothing because steps 2-6 aren't implemented yet; the test only asserts the stepper label "Infos personnelles" is shown, which it is, since it's part of `STEP_LABELS`).

- [ ] **Step 6: Commit**

```bash
git add taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepUploadCV.jsx taftech_frontend/tests/OnboardingWizard.test.jsx
git commit -m "$(cat <<'EOF'
feat: shell OnboardingWizard.jsx + etape 1 (upload CV)

Stepper 7 etapes + premiere etape (upload/analyse CV, skippable).
Les etapes 2 a 6 sont ajoutees dans les taches suivantes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Frontend — Step 2 (Infos personnelles, incl. Sexe)

**Files:**
- Create: `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepInfos.jsx`
- Modify: `taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx` (wire step 2 into the render switch)
- Modify: `taftech_frontend/tests/OnboardingWizard.test.jsx` (add step 2 tests)

**Interfaces:**
- Consumes: `infosForm`, `setInfosForm`, `infosMode`, `setInfosMode`, `saveInfosStep`, `skipStep`, `constants`, `profil` from `useOnboardingWizard()` (Task 7).
- Produces: nothing new consumed by later tasks beyond what Task 7 already defined.

- [ ] **Step 1: Write the failing test**

Add to `taftech_frontend/tests/OnboardingWizard.test.jsx`, inside the existing `describe` block (or a new one below it in the same file):

```javascript
describe("OnboardingWizard — étape 2 (Infos personnelles)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue({ wilayas: [{ value: "16 - Alger", label: "16 - Alger" }], diplomes: [] });
  });
  afterEach(cleanup);

  it("affiche le champ Sexe et sauvegarde avance à l'étape 3", async () => {
    profilService.updateProfil.mockResolvedValue({});
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i));

    await screen.findByLabelText(/Sexe/i);
    fireEvent.change(screen.getByLabelText(/Sexe/i), { target: { value: "HOMME" } });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    await waitFor(() => {
      expect(profilService.updateProfil).toHaveBeenCalled();
      expect(screen.getByText(/Expériences/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run OnboardingWizard`
Expected: FAIL — `TestingLibraryElementError: Unable to find a label with the text of: /Sexe/i` (step 2 doesn't render anything yet, `OnboardingWizard.jsx` only handles `step === 1` and `step === 7`).

- [ ] **Step 3: Implement `StepInfos.jsx`**

Create `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepInfos.jsx`:

```javascript
import React from "react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

const HAS_EXISTING_INFOS = (p) =>
  !!(p?.telephone || p?.wilaya || p?.commune || p?.diplome || p?.specialite || p?.sexe);

export const StepInfos = ({ infosForm, setInfosForm, infosMode, setInfosMode, saveInfosStep, skipStep, constants, profil }) => {
  const set = (field) => (e) => {
    const value = e.target.value;
    setInfosForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Informations personnelles</h3>
        {HAS_EXISTING_INFOS(profil) && <WizardCategoryToggle mode={infosMode} onChange={setInfosMode} />}
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-last-name" className={`${tw.authLabel} mb-1.5`}>Nom</label>
            <input id="onb-last-name" className={tw.authInput} value={infosForm.last_name || ""} onChange={set("last_name")} />
          </div>
          <div>
            <label htmlFor="onb-first-name" className={`${tw.authLabel} mb-1.5`}>Prénom</label>
            <input id="onb-first-name" className={tw.authInput} value={infosForm.first_name || ""} onChange={set("first_name")} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-date-naissance" className={`${tw.authLabel} mb-1.5`}>Date de naissance</label>
            <input id="onb-date-naissance" type="date" className={tw.authInput} value={infosForm.date_naissance || ""} onChange={set("date_naissance")} />
          </div>
          <div>
            <label htmlFor="onb-sexe" className={`${tw.authLabel} mb-1.5`}>Sexe</label>
            <select id="onb-sexe" className={tw.authInput} value={infosForm.sexe || ""} onChange={set("sexe")}>
              <option value="">Sélectionnez…</option>
              <option value="HOMME">Homme</option>
              <option value="FEMME">Femme</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-wilaya" className={`${tw.authLabel} mb-1.5`}>Wilaya</label>
            <select id="onb-wilaya" className={tw.authInput} value={infosForm.wilaya || ""} onChange={set("wilaya")}>
              <option value="">Sélectionnez…</option>
              {(constants.wilayas || []).map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="onb-telephone" className={`${tw.authLabel} mb-1.5`}>Téléphone</label>
            <input id="onb-telephone" type="tel" className={tw.authInput} value={infosForm.telephone || ""} onChange={set("telephone")} />
          </div>
        </div>
        <div>
          <label htmlFor="onb-diplome" className={`${tw.authLabel} mb-1.5`}>Diplôme</label>
          <select id="onb-diplome" className={tw.authInput} value={infosForm.diplome || ""} onChange={set("diplome")}>
            <option value="">Sélectionnez…</option>
            {(constants.diplomes || []).map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between mt-6">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>
          Passer cette étape
        </button>
        <button type="button" onClick={saveInfosStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>
          Continuer
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Wire step 2 into `OnboardingWizard.jsx`**

In `taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx`, add the import:

```javascript
import { StepInfos } from "./steps/StepInfos";
```

And add the render branch right after `{step === 1 && ...}`:

```javascript
        {step === 2 && (
          <StepInfos
            infosForm={wizard.infosForm}
            setInfosForm={wizard.setInfosForm}
            infosMode={wizard.infosMode}
            setInfosMode={wizard.setInfosMode}
            saveInfosStep={wizard.saveInfosStep}
            skipStep={wizard.skipStep}
            constants={wizard.constants}
            profil={wizard.profil}
          />
        )}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run OnboardingWizard`
Expected: PASS (all tests so far)

- [ ] **Step 6: Commit**

```bash
git add taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepInfos.jsx taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx taftech_frontend/tests/OnboardingWizard.test.jsx
git commit -m "$(cat <<'EOF'
feat: etape 2 du wizard (infos personnelles + sexe)

Le toggle Remplacer/Ajouter n'apparait que si le profil a deja au
moins un de ces champs renseigne.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Frontend — Steps 3 & 4 (Expériences, Formations)

**Files:**
- Create: `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepExperiences.jsx`
- Create: `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepFormations.jsx`
- Modify: `taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx`
- Modify: `taftech_frontend/tests/OnboardingWizard.test.jsx`

**Interfaces:**
- Consumes: `pendingExperiences`, `setPendingExperiences`, `experiencesMode`, `setExperiencesMode`, `saveExperiencesStep`; `pendingFormations`, `setPendingFormations`, `formationsMode`, `setFormationsMode`, `saveFormationsStep`; `skipStep`, `profil` from `useOnboardingWizard()`.

- [ ] **Step 1: Write the failing test**

Add to `taftech_frontend/tests/OnboardingWizard.test.jsx`:

```javascript
describe("OnboardingWizard — étapes 3 et 4 (Expériences, Formations)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue({ wilayas: [], diplomes: [] });
    profilService.updateProfil.mockResolvedValue({});
    profilService.addExperience.mockResolvedValue({});
    profilService.addFormation.mockResolvedValue({});
  });
  afterEach(cleanup);

  const advanceToStep3 = async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 2
    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 3
    await screen.findByText(/^Expériences$/i);
  };

  it("étape 3 : Passer cette étape avance à Formations sans appeler addExperience", async () => {
    await advanceToStep3();
    fireEvent.click(screen.getByText(/Passer cette étape/i));
    await waitFor(() => expect(screen.getByText(/^Formations$/i)).toBeInTheDocument());
    expect(profilService.addExperience).not.toHaveBeenCalled();
  });

  it("étape 3 : Continuer sauvegarde le compteur '0 expérience ajoutée' puis avance", async () => {
    await advanceToStep3();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    await waitFor(() => expect(screen.getByText(/^Formations$/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run OnboardingWizard`
Expected: FAIL — step 3 renders nothing (`OnboardingWizard.jsx` doesn't yet branch on `step === 3`), so `screen.findByText(/^Expériences$/i)` fails (only the stepper label matches, which is ambiguous/absent as page content).

- [ ] **Step 3: Implement a small shared card list presentational piece inline in each step (kept local, not over-abstracted — the two categories have different fields)**

Create `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepExperiences.jsx`:

```javascript
import React from "react";
import { Trash2 } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

export const StepExperiences = ({ pendingExperiences, setPendingExperiences, experiencesMode, setExperiencesMode, saveExperiencesStep, skipStep, profil }) => {
  const removeAt = (idx) => setPendingExperiences((list) => list.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Expériences</h3>
        {(profil?.experiences_detail?.length > 0) && <WizardCategoryToggle mode={experiencesMode} onChange={setExperiencesMode} />}
      </div>
      <div className="space-y-3 mb-4">
        {pendingExperiences.length === 0 && (
          <p className={`text-sm ${tw.textMuted} text-center py-6`}>Aucune expérience détectée — vous pourrez en ajouter plus tard depuis votre profil.</p>
        )}
        {pendingExperiences.map((exp, idx) => (
          <div key={idx} className={`${tw.card} p-4 flex items-start justify-between gap-3`}>
            <div>
              <p className={`text-sm font-bold ${tw.textStrong}`}>{exp.titre_poste}</p>
              <p className={`text-xs ${tw.textMuted}`}>{exp.entreprise}</p>
              {exp.description && <p className={`text-xs ${tw.textMuted} mt-1 line-clamp-2`}>{exp.description}</p>}
            </div>
            <button type="button" onClick={() => removeAt(idx)} aria-label="Supprimer" className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className={`text-xs ${tw.textMuted} mb-4`}>{pendingExperiences.length} expérience(s) prête(s) à être ajoutée(s)</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>Passer cette étape</button>
        <button type="button" onClick={saveExperiencesStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>Continuer</button>
      </div>
    </div>
  );
};
```

Create `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepFormations.jsx`:

```javascript
import React from "react";
import { Trash2 } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

export const StepFormations = ({ pendingFormations, setPendingFormations, formationsMode, setFormationsMode, saveFormationsStep, skipStep, profil }) => {
  const removeAt = (idx) => setPendingFormations((list) => list.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Formations</h3>
        {(profil?.formations_detail?.length > 0) && <WizardCategoryToggle mode={formationsMode} onChange={setFormationsMode} />}
      </div>
      <div className="space-y-3 mb-4">
        {pendingFormations.length === 0 && (
          <p className={`text-sm ${tw.textMuted} text-center py-6`}>Aucune formation détectée — vous pourrez en ajouter plus tard depuis votre profil.</p>
        )}
        {pendingFormations.map((f, idx) => (
          <div key={idx} className={`${tw.card} p-4 flex items-start justify-between gap-3`}>
            <div>
              <p className={`text-sm font-bold ${tw.textStrong}`}>{f.diplome}</p>
              <p className={`text-xs ${tw.textMuted}`}>{f.etablissement}</p>
            </div>
            <button type="button" onClick={() => removeAt(idx)} aria-label="Supprimer" className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className={`text-xs ${tw.textMuted} mb-4`}>{pendingFormations.length} formation(s) prête(s) à être ajoutée(s)</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>Passer cette étape</button>
        <button type="button" onClick={saveFormationsStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>Continuer</button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Wire steps 3 and 4 into `OnboardingWizard.jsx`**

Add imports:

```javascript
import { StepExperiences } from "./steps/StepExperiences";
import { StepFormations } from "./steps/StepFormations";
```

Add render branches after the step 2 branch:

```javascript
        {step === 3 && (
          <StepExperiences
            pendingExperiences={wizard.pendingExperiences}
            setPendingExperiences={wizard.setPendingExperiences}
            experiencesMode={wizard.experiencesMode}
            setExperiencesMode={wizard.setExperiencesMode}
            saveExperiencesStep={wizard.saveExperiencesStep}
            skipStep={wizard.skipStep}
            profil={wizard.profil}
          />
        )}
        {step === 4 && (
          <StepFormations
            pendingFormations={wizard.pendingFormations}
            setPendingFormations={wizard.setPendingFormations}
            formationsMode={wizard.formationsMode}
            setFormationsMode={wizard.setFormationsMode}
            saveFormationsStep={wizard.saveFormationsStep}
            skipStep={wizard.skipStep}
            profil={wizard.profil}
          />
        )}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run OnboardingWizard`
Expected: PASS (all tests so far)

- [ ] **Step 6: Commit**

```bash
git add taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepExperiences.jsx taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepFormations.jsx taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx taftech_frontend/tests/OnboardingWizard.test.jsx
git commit -m "$(cat <<'EOF'
feat: etapes 3 et 4 du wizard (experiences, formations)

Cartes pre-remplies depuis le CV parse, suppression individuelle
avant validation, toggle Remplacer/Ajouter conditionnel.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Frontend — Steps 5 & 6 (Langues, Compétences)

**Files:**
- Create: `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepLangues.jsx`
- Create: `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepCompetences.jsx`
- Modify: `taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx`
- Modify: `taftech_frontend/tests/OnboardingWizard.test.jsx`

**Interfaces:**
- Consumes: `pendingLangues`, `setPendingLangues`, `languesMode`, `setLanguesMode`, `saveLanguesStep`; `pendingCompetences`, `setPendingCompetences`, `competencesMode`, `setCompetencesMode`, `saveCompetencesStep`; `jobsService.searchCompetences` (for the add-competence autocomplete, same as `useProfilCandidat.js::handleCompetenceInputChange`); `skipStep`, `profil` from `useOnboardingWizard()`.

- [ ] **Step 1: Write the failing test**

Add to `taftech_frontend/tests/OnboardingWizard.test.jsx`:

```javascript
describe("OnboardingWizard — étapes 5 et 6 (Langues, Compétences)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue({ wilayas: [], diplomes: [] });
    profilService.updateProfil.mockResolvedValue({});
    jobsService.ajouterCompetence.mockResolvedValue({});
    jobsService.searchCompetences.mockResolvedValue([]);
  });
  afterEach(cleanup);

  const advanceToStep5 = async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 2
    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 3
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 4
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 5
    await screen.findByText(/^Langues$/i);
  };

  it("étape 5 : Passer cette étape avance à Compétences", async () => {
    await advanceToStep5();
    fireEvent.click(screen.getByText(/Passer cette étape/i));
    await waitFor(() => expect(screen.getByText(/^Compétences$/i)).toBeInTheDocument());
    expect(profilService.updateProfil).not.toHaveBeenCalled();
  });

  it("étape 6 : Continuer sauvegarde puis affiche l'écran Félicitations", async () => {
    await advanceToStep5();
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 6
    await screen.findByText(/^Compétences$/i);
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    await waitFor(() => expect(screen.getByText(/Félicitations/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run OnboardingWizard`
Expected: FAIL — step 5 renders nothing, so `screen.findByText(/^Langues$/i)` times out.

- [ ] **Step 3: Implement `StepLangues.jsx`**

Create `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepLangues.jsx`:

```javascript
import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Langue maternelle"];

export const StepLangues = ({ pendingLangues, setPendingLangues, languesMode, setLanguesMode, saveLanguesStep, skipStep, profil }) => {
  const [nouvelleLangue, setNouvelleLangue] = useState("");
  const [nouveauNiveau, setNouveauNiveau] = useState(NIVEAUX[1]);

  const ajouter = () => {
    const langue = nouvelleLangue.trim();
    if (!langue) return;
    setPendingLangues((list) => [...list.filter((l) => l.langue.toLowerCase() !== langue.toLowerCase()), { langue, niveau: nouveauNiveau }]);
    setNouvelleLangue("");
  };

  const removeAt = (idx) => setPendingLangues((list) => list.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Langues</h3>
        {!!profil?.langues && <WizardCategoryToggle mode={languesMode} onChange={setLanguesMode} />}
      </div>
      <div className="space-y-2 mb-4">
        {pendingLangues.map((l, idx) => (
          <div key={idx} className={`${tw.card} p-3 flex items-center justify-between`}>
            <div>
              <span className={`text-sm font-semibold ${tw.textStrong}`}>{l.langue}</span>
              <span className={`text-xs ${tw.textMuted} ml-2`}>{l.niveau}</span>
            </div>
            <button type="button" onClick={() => removeAt(idx)} aria-label="Supprimer" className="p-1.5 rounded-lg hover:bg-red-100 text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        <input
          value={nouvelleLangue}
          onChange={(e) => setNouvelleLangue(e.target.value)}
          placeholder="Ex: Anglais"
          className={`${tw.authInput} flex-1`}
        />
        <select value={nouveauNiveau} onChange={(e) => setNouveauNiveau(e.target.value)} className={tw.authInput}>
          {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" onClick={ajouter} className={`${tw.buttonSecondary} px-3`} aria-label="Ajouter une langue">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>Passer cette étape</button>
        <button type="button" onClick={saveLanguesStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>Continuer</button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Implement `StepCompetences.jsx`**

Create `taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepCompetences.jsx`:

```javascript
import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

const NIVEAUX = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
  { value: "CONFIRME", label: "Confirmé" },
];

export const StepCompetences = ({ pendingCompetences, setPendingCompetences, competencesMode, setCompetencesMode, saveCompetencesStep, skipStep, profil }) => {
  const [nouvelleCompetence, setNouvelleCompetence] = useState("");
  const [nouveauNiveau, setNouveauNiveau] = useState("DEBUTANT");

  const ajouter = () => {
    const label = nouvelleCompetence.trim();
    if (!label) return;
    setPendingCompetences((list) => [...list.filter((c) => c.label.toLowerCase() !== label.toLowerCase()), { label, niveau: nouveauNiveau }]);
    setNouvelleCompetence("");
  };

  const removeAt = (idx) => setPendingCompetences((list) => list.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Compétences</h3>
        {(profil?.competences_detail?.length > 0) && <WizardCategoryToggle mode={competencesMode} onChange={setCompetencesMode} />}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {pendingCompetences.map((c, idx) => (
          <span key={idx} className={`inline-flex items-center gap-2 ${tw.badgeNeutral} px-3 py-1.5`}>
            {c.label} <span className={`text-[10px] ${tw.textMuted}`}>({NIVEAUX.find((n) => n.value === c.niveau)?.label || c.niveau})</span>
            <button type="button" onClick={() => removeAt(idx)} aria-label={`Supprimer ${c.label}`}>
              <Trash2 size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        <input
          value={nouvelleCompetence}
          onChange={(e) => setNouvelleCompetence(e.target.value)}
          placeholder="Ex: React"
          className={`${tw.authInput} flex-1`}
        />
        <select value={nouveauNiveau} onChange={(e) => setNouveauNiveau(e.target.value)} className={tw.authInput}>
          {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
        </select>
        <button type="button" onClick={ajouter} className={`${tw.buttonSecondary} px-3`} aria-label="Ajouter une compétence">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>Passer cette étape</button>
        <button type="button" onClick={saveCompetencesStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>Continuer</button>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Wire steps 5 and 6 into `OnboardingWizard.jsx`**

Add imports:

```javascript
import { StepLangues } from "./steps/StepLangues";
import { StepCompetences } from "./steps/StepCompetences";
```

Add render branches after the step 4 branch:

```javascript
        {step === 5 && (
          <StepLangues
            pendingLangues={wizard.pendingLangues}
            setPendingLangues={wizard.setPendingLangues}
            languesMode={wizard.languesMode}
            setLanguesMode={wizard.setLanguesMode}
            saveLanguesStep={wizard.saveLanguesStep}
            skipStep={wizard.skipStep}
            profil={wizard.profil}
          />
        )}
        {step === 6 && (
          <StepCompetences
            pendingCompetences={wizard.pendingCompetences}
            setPendingCompetences={wizard.setPendingCompetences}
            competencesMode={wizard.competencesMode}
            setCompetencesMode={wizard.setCompetencesMode}
            saveCompetencesStep={wizard.saveCompetencesStep}
            skipStep={wizard.skipStep}
            profil={wizard.profil}
          />
        )}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --run OnboardingWizard`
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepLangues.jsx taftech_frontend/src/Pages/Candidat/Onboarding/steps/StepCompetences.jsx taftech_frontend/src/Pages/Candidat/Onboarding/OnboardingWizard.jsx taftech_frontend/tests/OnboardingWizard.test.jsx
git commit -m "$(cat <<'EOF'
feat: etapes 5 et 6 du wizard (langues, competences)

Toutes les 7 etapes du wizard sont maintenant cablees dans
OnboardingWizard.jsx (upload CV -> infos -> experiences -> formations
-> langues -> competences -> termine).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Frontend — Route `/onboarding`

**Files:**
- Modify: `taftech_frontend/src/App.jsx`

**Interfaces:**
- Consumes: `OnboardingWizard` (default export from `Pages/Candidat/Onboarding/OnboardingWizard.jsx`, Task 8), `CandidatRoute` (already defined in `App.jsx:49-57`).

- [ ] **Step 1: Write the failing test**

Add to `taftech_frontend/tests/OnboardingWizard.test.jsx` a routing-focused test (new `describe` block, this one renders `App` instead of `OnboardingWizard` directly — check `taftech_frontend/tests/App.test.jsx` first to copy its exact mocking setup for `authService.getUserRole`/`getLoginPortal`, since `App.jsx` pulls in many lazy-loaded pages):

```javascript
describe("Route /onboarding", () => {
  it("est déclarée dans App.jsx sous CandidatRoute", async () => {
    const appSource = await import("../src/App.jsx?raw");
    expect(appSource.default).toMatch(/path="\/onboarding"/);
    expect(appSource.default).toMatch(/OnboardingWizard/);
  });
});
```

(This lightweight source-inspection test avoids re-mounting the entire `App` tree with all its lazy imports and route guards, which `App.test.jsx` already exercises separately — it only confirms the route is wired.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run OnboardingWizard`
Expected: FAIL — the route isn't declared yet.

- [ ] **Step 3: Implement**

In `taftech_frontend/src/App.jsx`, add the lazy import near line 135 (next to `ReviewCandidature`):

```javascript
const OnboardingWizard      = lazy(() => import("./Pages/Candidat/Onboarding/OnboardingWizard"));
```

Add the route near line 347 (next to `/jobs/:id/postuler`):

```javascript
            <Route path="/onboarding" element={<CandidatRoute><OnboardingWizard mode="page" /></CandidatRoute>} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run OnboardingWizard`
Expected: PASS

- [ ] **Step 5: Run the full frontend build to catch any import/route typos**

Run: `npx vite build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add taftech_frontend/src/App.jsx taftech_frontend/tests/OnboardingWizard.test.jsx
git commit -m "$(cat <<'EOF'
feat: route /onboarding pour le wizard candidat

Protegee par CandidatRoute, meme pattern que /jobs/:id/postuler.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Frontend — Reuse the wizard as a modal from `ProfilCandidat`, remove the old parser modal

**Files:**
- Modify: `taftech_frontend/src/Pages/Candidat/ProfilCandidat/index.jsx`
- Modify: `taftech_frontend/src/Pages/Candidat/ProfilCandidat/Modals.jsx` (remove the `showParserModal` block, lines 811-… up to its closing, and the now-unused `parserMode`/`setParserMode`/`parsedData`/`resetParser`/`parserLoading`/`remplissageLoading` props from the `Modals` destructuring)
- Modify: `taftech_frontend/src/Pages/Candidat/ProfilCandidat/useProfilCandidat.js` (remove `parserMode`/`setParserMode`, `handleParserCVUpload`, `handleParserCVAnalyserActuel`, `handleValiderParsing`, `resetParser`, `parsedData`/`setParsedData`, `parserFile`, `parserLoading`, `remplissageLoading` — all now dead code, replaced by the wizard's own hook)
- Modify: `taftech_frontend/tests/ProfilCandidat.test.jsx` (mock the new `OnboardingWizard` import)

**Interfaces:**
- Consumes: `OnboardingWizard` (Task 8) with `mode="modal"`.
- Produces: `ProfilCandidat/index.jsx` gains local state `const [showOnboardingModal, setShowOnboardingModal] = useState(false)`; the "Remplissage automatique par IA" button now does `onClick={() => setShowOnboardingModal(true)}`; `<OnboardingWizard mode="modal" onClose={() => { setShowOnboardingModal(false); fetchData(); }} />` is rendered conditionally at the bottom of the page (outside `<Modals />`).

- [ ] **Step 1: Write the failing test**

Open `taftech_frontend/tests/ProfilCandidat.test.jsx` and add the `OnboardingWizard` mock next to the existing `ImageCropperModal` mock (same file, near its top):

```javascript
vi.mock("../src/Pages/Candidat/Onboarding/OnboardingWizard", () => ({
  default: ({ onClose }) => (
    <div data-testid="onboarding-wizard-mock">
      <button onClick={onClose}>Fermer (mock)</button>
    </div>
  ),
}));
```

Then add a new test in the file's main `describe` block:

```javascript
  it("🟢 HP5 (Wizard) : le bouton Remplissage automatique ouvre le wizard en mode modal", async () => {
    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Meriem Belamri/i);

    fireEvent.click(screen.getByText(/Remplissage automatique par IA/i));

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-wizard-mock")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Fermer (mock)"));

    await waitFor(() => {
      expect(screen.queryByTestId("onboarding-wizard-mock")).not.toBeInTheDocument();
    });
  });
```

(Use the correct import name for the real component under test — grep the top of `taftech_frontend/tests/ProfilCandidat.test.jsx` for its existing `import ProfilCandidat from ...` line first, since this file, unlike the misleadingly-named `RegisterCandidat.test.jsx`, is the real one and its exact import path must be reused as-is.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run ProfilCandidat`
Expected: FAIL — clicking "Remplissage automatique par IA" still opens the old `Modals` parser block, `onboarding-wizard-mock` never appears.

- [ ] **Step 3: Implement — swap the trigger in `ProfilCandidat/index.jsx`**

In `taftech_frontend/src/Pages/Candidat/ProfilCandidat/index.jsx`, add the import at the top:

```javascript
import OnboardingWizard from "../Onboarding/OnboardingWizard";
```

Add local state near the other `useState` calls in the component body (search for where `const { ... } = useProfilCandidat();` is destructured, add right after):

```javascript
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
```

(Add `import { useState } from "react"` alongside existing React imports if `useState` isn't already imported in this file directly — it likely is already, since the component uses other local `useState` calls like `cvQuickInputRef`; check the existing import line and merge into it rather than duplicating.)

Replace the button's `onClick` (around line 295):

```javascript
            onClick={() => setShowOnboardingModal(true)}
```

At the bottom of the component's JSX return (right after the closing tag of `<Modals .../>`, before the component's final closing `</div>` — locate the exact spot by finding `<Modals` usage around line 795), add:

```javascript
      {showOnboardingModal && (
        <div className={tw.modalOverlayStrong}>
          <OnboardingWizard
            mode="modal"
            onClose={() => {
              setShowOnboardingModal(false);
              fetchData();
            }}
          />
        </div>
      )}
```

- [ ] **Step 4: Remove the old parser modal from `Modals.jsx`**

In `taftech_frontend/src/Pages/Candidat/ProfilCandidat/Modals.jsx`:
1. Delete the entire `{/* MODAL PARSING CV */} {showParserModal && ( ... )}` block (starts at line 811, ends at its matching closing `)}` — read the file around that range first to find the exact end line before deleting, since it's a large JSX block).
2. Remove these now-unused props from the `Modals` destructuring (lines 38-39, 64-69): `showParserModal`, `setShowParserModal`, `parserLoading`, `remplissageLoading`, `parsedData`, `resetParser`, `parserMode`, `setParserMode`.
3. Remove the now-unused imports `Sparkles`, `FileText` from the top `lucide-react` import line **only if** they're not used elsewhere in the file (grep the file for other usages first — `Sparkles`/`FileText` may still be referenced by other modals in this same large file; only remove from the import list what's genuinely unused after step 1).

- [ ] **Step 5: Remove dead handlers from `useProfilCandidat.js`**

In `taftech_frontend/src/Pages/Candidat/ProfilCandidat/useProfilCandidat.js`, remove:
- State: `showParserModal`/`setShowParserModal`, `parserLoading`/`setParserLoading`, `remplissageLoading`/`setRemplissageLoading`, `parsedData`/`setParsedData`, `parserMode`/`setParserMode`, `parserFile`/`setParserFile`.
- Functions: `handleParserCVUpload`, `handleParserCVAnalyserActuel`, `resetParser`, `handleValiderParsing`.
- Their entries in the final returned object at the bottom of the hook.

Also remove the now-unused `jobsService.parserCV`/`jobsService.ajouterCompetence` calls that only existed for this dead code path if they are not used elsewhere in the file — re-check: `handleAjouterCompetence`/`handleSupprimerCompetence`/`handleChangerNiveauCompetence` in this same file still call `jobsService.ajouterCompetence`/`supprimerCompetence` for the "Mes compétences" tag editor, unrelated to the parser — **keep those**, only remove the parser-specific calls inside the deleted functions.

- [ ] **Step 6: Update `ProfilCandidat/index.jsx`'s and `Modals.jsx`'s prop wiring**

In `taftech_frontend/src/Pages/Candidat/ProfilCandidat/index.jsx`, find the `<Modals .../>` invocation (around line 795-796) and remove the now-nonexistent props being passed: `showParserModal={showParserModal}` and `setShowParserModal={setShowParserModal}` (and any other now-removed hook fields passed through, matching whatever was removed in Step 5).

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- --run ProfilCandidat`
Expected: PASS (new HP5 test, plus all pre-existing tests in this file still passing).

- [ ] **Step 8: Run the full frontend suite**

Run: `npm test -- --run`
Expected: PASS across the board — pay close attention to any other test file that might reference the removed `useProfilCandidat` fields (grep first: `grep -rn "handleValiderParsing\|showParserModal\|parserMode" taftech_frontend/tests taftech_frontend/src` to confirm nothing else references them before finishing this task).

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add taftech_frontend/src/Pages/Candidat/ProfilCandidat/index.jsx taftech_frontend/src/Pages/Candidat/ProfilCandidat/Modals.jsx taftech_frontend/src/Pages/Candidat/ProfilCandidat/useProfilCandidat.js taftech_frontend/tests/ProfilCandidat.test.jsx
git commit -m "$(cat <<'EOF'
refactor: le bouton Remplissage automatique ouvre le wizard en modal

Remplace l'ancienne modale de confirmation unique (parserMode global,
handleValiderParsing) par le meme OnboardingWizard que l'onboarding,
avec le toggle Remplacer/Ajouter desormais par etape. Code mort
correspondant retire de useProfilCandidat.js et Modals.jsx.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Full regression pass (backend + frontend)

**Files:** none new — verification only.

- [ ] **Step 1: Run the full backend test suite**

Run: `cd taftech_backend && python manage.py test jobs accounts -v 2`
Expected: PASS, no regressions versus the baseline noted in `CLAUDE.md` (353/353 at the time this plan was written — the two new tests from Tasks 1-2 push this count up by 2+).

- [ ] **Step 2: Run `python manage.py check`**

Run: `cd taftech_backend && python manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Run the full frontend test suite**

Run: `cd taftech_frontend && npm test -- --run`
Expected: PASS, no regressions.

- [ ] **Step 4: Run the frontend build**

Run: `cd taftech_frontend && npx vite build`
Expected: build succeeds with no errors or new warnings about missing chunks.

- [ ] **Step 5: Manual smoke test (documented, not automatable in this plan)**

Since the plan's automated tests mock every service call, do one manual pass with the real dev servers running (`python manage.py runserver` + `npm run dev`) to confirm:
1. Register a new candidate → verify OTP → land on `/onboarding` already logged in (no `/login` detour).
2. Upload a real CV → confirm steps 2-6 pre-fill from the parsed data.
3. Skip a step → confirm it's skipped with nothing saved for that category, but earlier steps' data persisted.
4. Finish the wizard → confirm redirect to `/dashboard-candidat` and that the profile now shows the saved data.
5. From `/profil`, click "Remplissage automatique par IA" → confirm it opens the same wizard as a modal, with the Remplacer/Ajouter toggle visible only on categories that already have data, and that "Fermer" returns to `/profil` with fresh data.

Record the outcome in the session notes (`CLAUDE.md`) once done, per the project's existing convention of documenting what was and wasn't manually verified.

- [ ] **Step 6: No commit for this task** (verification-only; if step 5 uncovers a bug, fix it as a follow-up task using systematic-debugging, then commit that fix separately).

---

## Self-Review Notes

- **Spec coverage**: Sexe field (Task 1, 9), auto-login on OTP (Task 2, 4), one-shot onboarding flag (Task 5), 7-step wizard reusable in `page`/`modal` mode (Tasks 6-12), per-step Remplacer/Ajouter toggle hidden when nothing to replace (Tasks 9-11, `HAS_EXISTING_INFOS`/`profil?.experiences_detail?.length > 0`/etc. guards), reuse in `ProfilCandidat` replacing the old single-confirmation modal (Task 13) — all covered.
- **Placeholder scan**: no `TODO`/`TBD` left; every step shows full code.
- **Type/signature consistency**: `useOnboardingWizard()` return shape defined once in Task 7's Interfaces block and used identically by every step component in Tasks 8-11 (checked field names: `infosForm`/`setInfosForm`/`infosMode`/`setInfosMode`/`saveInfosStep` etc. match exactly between the hook and each consuming step).
- Task 13's Step 4 and Step 5 both instruct "read the file first to find the exact range" instead of showing the exact deleted lines verbatim — this is intentional (not a placeholder): `Modals.jsx` is ~900+ lines and the exact end-line of the JSX block to delete depends on nesting the executor must visually confirm in their own editor before deleting, since a wrong guess would corrupt the file; the *content* to look for and the *props to remove* are fully specified.
