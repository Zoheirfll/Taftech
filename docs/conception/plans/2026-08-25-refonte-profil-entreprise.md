# Refonte page vitrine EntreprisePublic.jsx Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la page vitrine publique `/entreprise/:slug` (hero neutre + 3 stats, onglets À propos/Offres/Photos, contact en texte simple) et ajouter le champ `annee_creation` qui alimente la stat d'ancienneté.

**Architecture:** Un champ backend simple (`PositiveIntegerField` nullable sur `ProfilEntreprise`) exposé en lecture publique et en écriture recruteur ; côté frontend, `EntreprisePublic.jsx` passe d'un scroll unique à un layout à onglets pilotés par un `useState` local (pas de nouvelle route), et `ParametresRecruteur.jsx` gagne un champ de formulaire numérique de plus dans le formulaire "Mon entreprise" déjà existant.

**Tech Stack:** Django 5.2 + DRF (backend), React 18 + Vite + Tailwind (frontend), Vitest + Django TestCase pour les tests.

## Global Constraints

- Ne jamais afficher "N/A" ou "0 ans" quand `annee_creation` est vide — la stat d'ancienneté doit être **omise silencieusement** (spec bloc B).
- Pas d'onglet "Avis" (aucune fonctionnalité d'avis n'existe dans le produit) (spec bloc C).
- La galerie photo, la carte de localisation et la liste d'offres existantes gardent leur style/logique interne inchangés — seul leur emplacement dans la page change (spec blocs B/C).
- Les badges de type de contrat (CDI/CDD/etc.) dans la liste d'offres ne changent pas (spec "Hors scope").
- Toujours vérifier `python manage.py check` et `npx vite build` avant de considérer une tâche terminée (CLAUDE.md règle #7).
- Afficher old_string/new_string avant chaque Edit n'est pas requis ici (ce n'est pas une session interactive avec l'utilisateur ligne par ligne), mais chaque tâche doit rester revuable indépendamment.

---

### Task 1: Backend — champ `annee_creation`

**Files:**
- Modify: `taftech_backend/jobs/models.py` (ajout du champ sur `ProfilEntreprise`, juste après `culture_entreprise` ligne 59)
- Create: `taftech_backend/jobs/migrations/0087_profilentreprise_annee_creation.py` (générée par `makemigrations`)
- Modify: `taftech_backend/jobs/serializers/offres.py` (`EntreprisePublicSerializer`, ajout à `fields`)
- Modify: `taftech_backend/jobs/views/recruteur.py` (`UpdateProfilEntrepriseAPIView.put`, gestion dédiée du champ numérique)
- Test: `taftech_backend/jobs/tests/test_api_cms.py` (ou fichier existant testant `EntreprisePublicSerializer`/`UpdateProfilEntrepriseAPIView` — vérifier avec `grep -rl "UpdateProfilEntrepriseAPIView\|EntreprisePublicSerializer" jobs/tests/` avant d'écrire, ajouter dans le fichier trouvé)

**Interfaces:**
- Produces: `ProfilEntreprise.annee_creation` (int|None), exposé côté API publique sous la clé `annee_creation` dans la réponse de `GET jobs/entreprises/<slug>/`, modifiable via `PUT jobs/entreprise/profil/` (champ `annee_creation` dans le payload, chaîne ou vide).

- [ ] **Step 1: Localiser les tests existants du profil entreprise**

```bash
cd taftech_backend
grep -rl "UpdateProfilEntrepriseAPIView\|EntreprisePublicSerializer" jobs/tests/
```

Note le(s) fichier(s) retourné(s) — c'est là que les nouveaux tests de ce Task iront (ne pas créer de nouveau fichier de test).

- [ ] **Step 2: Écrire le test backend qui échoue (modèle + validation)**

Dans le fichier de test localisé à l'étape 1, ajouter :

```python
from django.core.exceptions import ValidationError as DjangoValidationError

class ProfilEntrepriseAnneeCreationTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="rec-annee@test.dz", password="Pass1234!", role="RECRUTEUR",
        )
        self.profil = ProfilEntreprise.objects.create(
            user=self.user, nom_entreprise="Boite Test", registre_commerce="RC-999",
            secteur_activite="IT", wilaya_siege="31 - Oran", est_approuvee=True,
        )

    def test_annee_creation_nulle_par_defaut(self):
        self.assertIsNone(self.profil.annee_creation)

    def test_annee_creation_acceptee(self):
        self.profil.annee_creation = 2019
        self.profil.full_clean()
        self.profil.save()
        self.profil.refresh_from_db()
        self.assertEqual(self.profil.annee_creation, 2019)

    def test_annee_creation_trop_basse_rejetee(self):
        self.profil.annee_creation = 1800
        with self.assertRaises(DjangoValidationError):
            self.profil.full_clean()
```

Adapter les imports (`CustomUser`, `ProfilEntreprise`, `TestCase`) au style déjà utilisé en tête du fichier localisé à l'étape 1 — ne pas dupliquer un import déjà présent.

- [ ] **Step 3: Lancer les tests pour vérifier l'échec**

```bash
python manage.py test jobs.tests.test_api_cms.ProfilEntrepriseAnneeCreationTests -v 2
```

(remplacer `test_api_cms` par le module réellement localisé à l'étape 1 si différent)

Expected: FAIL — `AttributeError: 'ProfilEntreprise' object has no attribute 'annee_creation'`

- [ ] **Step 4: Ajouter le champ au modèle**

Dans `taftech_backend/jobs/models.py`, juste après la ligne `culture_entreprise = models.TextField(blank=True, null=True, verbose_name="Culture d'entreprise")` (ligne 59) :

```python
    annee_creation = models.PositiveIntegerField(
        blank=True, null=True,
        validators=[MinValueValidator(1900)],
        verbose_name="Année de création de l'entreprise",
    )
```

- [ ] **Step 5: Générer et vérifier la migration**

```bash
python manage.py makemigrations jobs
```

Expected: crée `jobs/migrations/0087_profilentreprise_annee_creation.py` (le numéro peut différer si d'autres migrations ont été ajoutées entre-temps — utiliser le numéro réel généré pour la suite).

- [ ] **Step 6: Appliquer la migration et relancer les tests**

```bash
python manage.py migrate jobs
python manage.py test jobs.tests.test_api_cms.ProfilEntrepriseAnneeCreationTests -v 2
```

Expected: PASS (3 tests)

- [ ] **Step 7: Exposer le champ dans le serializer public**

Dans `taftech_backend/jobs/serializers/offres.py`, `EntreprisePublicSerializer.Meta.fields` (ligne ~80-85), ajouter `'annee_creation'` à la liste existante :

```python
        fields = (
            'id', 'slug', 'nom_entreprise', 'secteur_activite', 'wilaya_siege', 'commune_siege',
            'adresse_complete', 'taille_entreprise', 'description', 'culture_entreprise',
            'annee_creation',
            'logo_url', 'banniere_url', 'photos', 'linkedin', 'site_web',
            'offres_actives', 'nombre_offres_actives',
        )
```

- [ ] **Step 8: Écrire le test qui échoue pour la lecture publique**

Dans le même fichier de test, ajouter :

```python
    def test_annee_creation_exposee_api_publique(self):
        self.profil.annee_creation = 2015
        self.profil.save()
        response = self.client.get(f"/api/jobs/entreprises/{self.profil.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["annee_creation"], 2015)

    def test_annee_creation_null_api_publique(self):
        response = self.client.get(f"/api/jobs/entreprises/{self.profil.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["annee_creation"])
```

- [ ] **Step 9: Lancer les tests, vérifier PASS**

```bash
python manage.py test jobs.tests.test_api_cms.ProfilEntrepriseAnneeCreationTests -v 2
```

Expected: PASS (5 tests) — l'exposition suffit, pas de code supplémentaire nécessaire côté serializer (champ direct, pas de `SerializerMethodField`).

- [ ] **Step 10: Gérer l'écriture dans `UpdateProfilEntrepriseAPIView`**

Dans `taftech_backend/jobs/views/recruteur.py`, la méthode `put` (lignes 428-447) traite déjà une liste `champs` par boucle générique — `annee_creation` ne peut pas y entrer tel quel car c'est un entier (la boucle applique une troncature de chaîne). Ajouter une gestion dédiée juste après la boucle `for champ in champs:` (après la ligne 442, avant le bloc `if 'logo' in request.FILES:`) :

```python
        if 'annee_creation' in data:
            valeur_annee = data['annee_creation']
            if valeur_annee in ('', None):
                profil.annee_creation = None
            else:
                try:
                    profil.annee_creation = int(valeur_annee)
                except (TypeError, ValueError):
                    return Response({"error": "Année de création invalide."}, status=400)
```

Et ajouter `"annee_creation": profil.annee_creation,` à la réponse `Response({...})` finale (après la ligne `"culture_entreprise": profil.culture_entreprise,`).

- [ ] **Step 11: Écrire le test qui échoue pour l'écriture**

Dans le même fichier de test :

```python
    def test_put_annee_creation_valide(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            "/api/jobs/entreprise/profil/",
            {"annee_creation": "2018"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.profil.refresh_from_db()
        self.assertEqual(self.profil.annee_creation, 2018)

    def test_put_annee_creation_vide_remet_a_none(self):
        self.profil.annee_creation = 2018
        self.profil.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            "/api/jobs/entreprise/profil/",
            {"annee_creation": ""},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.profil.refresh_from_db()
        self.assertIsNone(self.profil.annee_creation)

    def test_put_annee_creation_invalide_rejetee(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            "/api/jobs/entreprise/profil/",
            {"annee_creation": "pas-un-nombre"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
```

Vérifier que le test utilise `APITestCase` (pas `TestCase`) pour `force_authenticate` — si la classe existante utilise `TestCase` simple, remplacer `self.client.force_authenticate` par le mécanisme d'authentification déjà en place ailleurs dans le même fichier (ex. login JWT via `self.client.post("/api/accounts/login/", ...)`), en suivant le pattern déjà utilisé par les tests voisins de ce fichier.

- [ ] **Step 12: Lancer tous les tests du fichier, vérifier PASS**

```bash
python manage.py test jobs.tests.test_api_cms -v 2
```

Expected: tous PASS, aucune régression sur les tests existants du fichier.

- [ ] **Step 13: `python manage.py check` et commit**

```bash
python manage.py check
git add jobs/models.py jobs/migrations/ jobs/serializers/offres.py jobs/views/recruteur.py jobs/tests/
git commit -m "feat: ajoute le champ annee_creation sur ProfilEntreprise"
```

---

### Task 2: Frontend — champ `annee_creation` dans Paramètres

**Files:**
- Modify: `taftech_frontend/src/Pages/Recruteur/ParametresRecruteur.jsx` (3 endroits : les 2 blocs `setEntrepriseForm({...})` du `useEffect` de chargement, et le JSX du formulaire "Mon entreprise")
- Test: `taftech_frontend/tests/ParametresRecruteur.test.jsx`

**Interfaces:**
- Consumes: `annee_creation` renvoyé par `dash.entreprise` (Task 1, exposé par `EntreprisePublicSerializer`... — en réalité `dash.entreprise` vient d'`EntrepriseDashboardDetailSerializer`, pas `EntreprisePublicSerializer` ; voir Step 0 ci-dessous avant de coder).

- [ ] **Step 0: Vérifier que `EntrepriseDashboardDetailSerializer` expose bien `annee_creation`**

`ParametresRecruteur.jsx` lit `dash.entreprise` (venant de `DashboardRecruteurAPIView`, sérialisé par `EntrepriseDashboardDetailSerializer` — **différent** de `EntreprisePublicSerializer` modifié au Task 1). Chercher ce serializer :

```bash
cd taftech_backend
grep -n "class EntrepriseDashboardDetailSerializer" -A 20 jobs/serializers/entreprise.py
```

Si `annee_creation` n'est pas dans ses `fields`, l'ajouter à la liste `fields` de `EntrepriseDashboardDetailSerializer` (même fichier) avant de continuer ce Task — sinon le formulaire de Paramètres ne pourra jamais afficher la valeur déjà enregistrée au rechargement de la page. Committer ce correctif seul si nécessaire :

```bash
git add jobs/serializers/entreprise.py
git commit -m "fix: expose annee_creation dans EntrepriseDashboardDetailSerializer"
```

- [ ] **Step 1: Écrire le test qui échoue**

Dans `taftech_frontend/tests/ParametresRecruteur.test.jsx`, localiser le mock de `dash.entreprise` utilisé par les tests de l'onglet "Mon entreprise" (chercher `culture_entreprise` dans ce fichier pour trouver le bon objet mock) et y ajouter `annee_creation: 2019`. Puis ajouter un nouveau test à la suite des tests existants de cet onglet :

```jsx
  it("🟢 Affiche et modifie l'année de création de l'entreprise", async () => {
    render(<ParametresRecruteur />);
    await waitFor(() => screen.getByDisplayValue("2019"));

    const input = screen.getByLabelText(/Année de création/i);
    fireEvent.change(input, { target: { value: "2021" } });

    const saveBtn = screen.getByRole("button", { name: /Enregistrer/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(jobsService.updateProfilEntreprise).toHaveBeenCalledWith(
        expect.objectContaining({ annee_creation: "2021" }),
      );
    });
  });
```

Adapter les imports (`fireEvent`, `waitFor`, `screen`) et le nom du bouton de sauvegarde ("Enregistrer" à vérifier contre le texte réel du bouton dans le fichier — chercher `sauvegarderEntreprise` pour trouver le `onClick` correspondant et son libellé).

- [ ] **Step 2: Lancer le test, vérifier l'échec**

```bash
cd taftech_frontend
npm test -- --run tests/ParametresRecruteur.test.jsx
```

Expected: FAIL — `Unable to find a label with the text of: /Année de création/i`

- [ ] **Step 3: Ajouter le champ au state initial (2 endroits)**

Dans `taftech_frontend/src/Pages/Recruteur/ParametresRecruteur.jsx`, aux lignes 120-131 et 158-169 (les deux blocs `setEntrepriseForm({...})`), ajouter `annee_creation: e.annee_creation || "",` juste après la ligne `culture_entreprise: e.culture_entreprise || "",` dans chacun des deux blocs.

- [ ] **Step 4: Ajouter le champ au JSX du formulaire**

Après le bloc "Taille de l'entreprise" (lignes 861-881, se terminant par `</div>` à la ligne 881) et avant le bloc "Description" (ligne 882), insérer :

```jsx
              <div className="md:col-span-1">
                <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`} htmlFor="annee_creation">
                  Année de création (optionnel)
                </label>
                <input
                  id="annee_creation"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={entrepriseForm.annee_creation || ""}
                  onChange={(e) =>
                    setEntrepriseForm({
                      ...entrepriseForm,
                      annee_creation: e.target.value,
                    })
                  }
                  placeholder="Ex : 2015"
                  className={`w-full px-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`}
                />
              </div>
```

- [ ] **Step 5: Lancer le test, vérifier PASS**

```bash
npm test -- --run tests/ParametresRecruteur.test.jsx
```

Expected: PASS, tous les tests du fichier (y compris ceux préexistants).

- [ ] **Step 6: Build et commit**

```bash
npx vite build
git add src/Pages/Recruteur/ParametresRecruteur.jsx tests/ParametresRecruteur.test.jsx
git commit -m "feat: ajoute le champ année de création dans Paramètres entreprise"
```

---

### Task 3: Frontend — hero neutre + 3 stats sur EntreprisePublic.jsx

**Files:**
- Modify: `taftech_frontend/src/Pages/Recruteur/EntreprisePublic.jsx` (bloc HERO, lignes 154-192)
- Test: `taftech_frontend/tests/EntreprisePublic.test.jsx`

**Interfaces:**
- Consumes: `entreprise.annee_creation` (Task 1), `entreprise.nombre_offres_actives`, `entreprise.taille_entreprise` (existants).
- Produces: aucune nouvelle fonction exportée — modification de rendu uniquement.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `taftech_frontend/tests/EntreprisePublic.test.jsx`, ajouter à `mockEntrepriseBase` (ligne 28-38) le champ `nombre_offres_actives: 3, taille_entreprise: "ME"`. Puis ajouter deux nouveaux tests après HP2 :

```jsx
  it("🟢 HP2b : Affiche les 3 stats (offres/effectif/ancienneté) quand annee_creation est renseignée", async () => {
    const entrepriseAvecAnnee = { ...mockEntrepriseBase, annee_creation: 2019 };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseAvecAnnee);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument(); // offres actives
      expect(screen.getByText(/ans$/i)).toBeInTheDocument(); // ancienneté "N ans"
    });
  });

  it("🔴 EC3 : Stat ancienneté absente si annee_creation est null", async () => {
    jobsService.getEntreprisePublic.mockResolvedValue({ ...mockEntrepriseBase, annee_creation: null });
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("TafTech Solutions")).toBeInTheDocument();
    });
    expect(screen.queryByText(/ans$/i)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

```bash
cd taftech_frontend
npm test -- --run tests/EntreprisePublic.test.jsx
```

Expected: FAIL sur HP2b (`nombre_offres_actives` "3" n'est affiché nulle part encore avec ce style).

- [ ] **Step 3: Remplacer le bloc HERO**

Dans `taftech_frontend/src/Pages/Recruteur/EntreprisePublic.jsx`, remplacer entièrement les lignes 154-192 (du commentaire `{/* ── HERO ── */}` jusqu'au `</div>` fermant le bandeau, juste avant `{/* Corps */}`) par :

```jsx
      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
        {/* Photo de couverture */}
        {entreprise.banniere_url && (
          <div className="h-48 md:h-64 w-full overflow-hidden">
            <img src={getMediaUrl(entreprise.banniere_url)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {/* Bandeau neutre : logo + nom + bouton */}
        <div className="px-6 md:px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              {entreprise.logo_url
                ? <img src={getMediaUrl(entreprise.logo_url)} alt={entreprise.nom_entreprise} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                : <Building2 size={28} className="text-slate-300" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold leading-tight truncate text-slate-900">{entreprise.nom_entreprise}</h1>
              <div className="flex items-center gap-2 mt-1.5 text-slate-700 text-sm overflow-hidden">
                <span className="flex items-center gap-1 shrink-0"><Briefcase size={13} /> {secteurCourt}</span>
                <span className="text-slate-300 shrink-0">·</span>
                <span className="flex items-center gap-1 shrink-0"><MapPin size={13} /> {lieuAffiche}</span>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
            >
              <Send size={14} /> Candidature spontanée
            </button>
          </div>

          {/* Stats clés */}
          <div className="flex flex-wrap items-center gap-6 mt-5 pt-5 border-t border-slate-100">
            <div>
              <p className="text-xl font-extrabold text-slate-900">{entreprise.nombre_offres_actives ?? entreprise.offres_actives?.length ?? 0}</p>
              <p className="text-xs text-slate-600">Offres en ligne</p>
            </div>
            {tailleLabel && (
              <div>
                <p className="text-xl font-extrabold text-slate-900">{tailleLabel}</p>
                <p className="text-xs text-slate-600">Employés</p>
              </div>
            )}
            {entreprise.annee_creation && (
              <div>
                <p className="text-xl font-extrabold text-slate-900">{new Date().getFullYear() - entreprise.annee_creation} ans</p>
                <p className="text-xs text-slate-600">D'existence</p>
              </div>
            )}
          </div>
        </div>
```

Le `{/* Corps */}` et son contenu (lignes 194 et suivantes) restent en place tels quels pour l'instant — ils seront réorganisés en onglets au Task 4.

- [ ] **Step 4: Lancer les tests, vérifier PASS**

```bash
npm test -- --run tests/EntreprisePublic.test.jsx
```

Expected: PASS (HP1, HP2, HP2b, HP3, HP4, EC1, EC2, EC3).

- [ ] **Step 5: Build et commit**

```bash
npx vite build
git add src/Pages/Recruteur/EntreprisePublic.jsx tests/EntreprisePublic.test.jsx
git commit -m "feat: hero neutre avec stats (offres/effectif/ancienneté) sur la page vitrine entreprise"
```

---

### Task 4: Frontend — onglets À propos / Offres / Photos + contact en texte simple

**Files:**
- Modify: `taftech_frontend/src/Pages/Recruteur/EntreprisePublic.jsx` (bloc "Corps", lignes ~194-298 après Task 3, plus la section "OFFRES" lignes ~300-366)
- Test: `taftech_frontend/tests/EntreprisePublic.test.jsx`

**Interfaces:**
- Consumes: `entreprise.photos`, `entreprise.description`, `entreprise.culture_entreprise`, `entreprise.linkedin`, `entreprise.site_web`, `entreprise.offres_actives` (tous existants, inchangés).
- Produces: état local `activeTab` (`"apropos" | "offres" | "photos"`), consommé uniquement dans ce composant.

- [ ] **Step 1: Écrire les tests qui échouent (navigation onglets)**

Dans `taftech_frontend/tests/EntreprisePublic.test.jsx`, remplacer le test HP3 existant (qui suppose la liste d'offres visible sans interaction) par une version qui clique d'abord sur l'onglet "Offres" :

```jsx
  it("🟢 HP3 : Affichage de la liste des offres actives (onglet Offres)", async () => {
    const entrepriseWithOffers = {
      ...mockEntrepriseBase,
      offres_actives: [
        {
          id: 1,
          code_public: "x1y2z3",
          secteur_libelle: "Informatique",
          titre: "Développeur Front-End",
          wilaya: "Alger",
          commune: "Bab Ezzouar",
          type_contrat: "CDI",
        },
      ],
    };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseWithOffers);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("TafTech Solutions"));
    fireEvent.click(screen.getByRole("button", { name: /Offres/i }));

    await waitFor(() => {
      expect(screen.getByText("Développeur Front-End")).toBeInTheDocument();
      expect(screen.getByText("Alger")).toBeInTheDocument();
      expect(screen.getByText("CDI")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Voir l'offre/i }),
      ).toHaveAttribute("href", "/entreprises/taftech-solutions/offres-d-emploi/informatique/developpeur-front-end-x1y2z3");
    });
  });
```

Ajouter `import { fireEvent } from "@testing-library/react";` à l'import existant de `@testing-library/react` en haut du fichier si absent.

Ajouter un nouveau test pour l'onglet "À propos" par défaut et la colonne photo à côté du texte :

```jsx
  it("🟢 HP5 : Onglet À propos actif par défaut, avec culture d'entreprise et photo à côté du texte", async () => {
    const entrepriseComplete = {
      ...mockEntrepriseBase,
      culture_entreprise: "Ambiance conviviale, esprit d'équipe.",
      photos: [{ id: 1, image: "https://example.com/photo1.jpg", legende: "Bureaux" }],
    };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseComplete);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Agence de développement web.")).toBeInTheDocument();
      expect(screen.getByText("Ambiance conviviale, esprit d'équipe.")).toBeInTheDocument();
      expect(screen.getByAltText("Bureaux")).toBeInTheDocument();
    });
    // La liste d'offres n'est pas visible tant que l'onglet Offres n'est pas cliqué
    expect(screen.queryByText("Aucune offre ouverte")).not.toBeInTheDocument();
  });

  it("🟢 HP6 : Onglet Photos affiche la galerie complète", async () => {
    const entrepriseAvecPhotos = {
      ...mockEntrepriseBase,
      photos: [
        { id: 1, image: "https://example.com/photo1.jpg", legende: "Bureaux" },
        { id: 2, image: "https://example.com/photo2.jpg", legende: "Équipe" },
      ],
    };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseAvecPhotos);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("TafTech Solutions"));
    fireEvent.click(screen.getByRole("button", { name: /^Photos/i }));

    await waitFor(() => {
      expect(screen.getByAltText("Équipe")).toBeInTheDocument();
    });
  });

  it("🟢 HP7 : Liens LinkedIn/Site web affichés en texte simple", async () => {
    const entrepriseAvecLiens = {
      ...mockEntrepriseBase,
      linkedin: "https://linkedin.com/company/taftech",
      site_web: "https://taftech.dz",
    };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseAvecLiens);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const linkedinLink = screen.getByRole("link", { name: /LinkedIn/i });
      expect(linkedinLink).toHaveAttribute("href", "https://linkedin.com/company/taftech");
      const siteLink = screen.getByRole("link", { name: /Site web/i });
      expect(siteLink).toHaveAttribute("href", "https://taftech.dz");
    });
  });
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

```bash
npm test -- --run tests/EntreprisePublic.test.jsx
```

Expected: FAIL sur HP3 (pas de bouton "Offres" encore), HP5/HP6/HP7 (structure onglets inexistante).

- [ ] **Step 3: Ajouter l'état `activeTab` et la barre d'onglets**

Dans `taftech_frontend/src/Pages/Recruteur/EntreprisePublic.jsx`, ajouter l'état après la ligne `const [showModal, setShowModal] = useState(false);` (ligne 44) :

```jsx
  const [activeTab, setActiveTab] = useState("apropos");
```

- [ ] **Step 4: Remplacer le bloc "Corps" par la version à onglets**

Remplacer tout le contenu depuis `{/* Corps */}` (juste après le hero produit au Task 3, avant l'ancien contenu) jusqu'à la fermeture du `<div>` racine du hero, **et** la section `{/* ── OFFRES ── */}` qui suit (ancien code lignes 194-366 en tout, en gardant la modale de candidature spontanée intacte après) par :

```jsx
        {/* Corps */}
        <div className="px-6 md:px-8 pb-8 pt-5">
          {/* Bouton mobile seulement */}
          <div className="sm:hidden mb-5">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-800 transition-colors shadow-sm"
            >
              <Send size={14} /> Candidature spontanée
            </button>
          </div>

          {/* Liens web en texte simple */}
          {(entreprise.linkedin || entreprise.site_web) && (
            <div className="flex flex-wrap gap-4 mb-5">
              {entreprise.linkedin && (
                <a
                  href={entreprise.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <LinkedinIcon /> LinkedIn
                </a>
              )}
              {entreprise.site_web && (
                <a
                  href={entreprise.site_web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <Globe size={14} /> Site web
                </a>
              )}
            </div>
          )}

          {/* Barre d'onglets */}
          <div className="flex items-center gap-1 border-b border-slate-200 mb-5">
            <button
              onClick={() => setActiveTab("apropos")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "apropos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              À propos
            </button>
            <button
              onClick={() => setActiveTab("offres")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "offres" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Offres <span className="ml-1 text-xs text-slate-600">({entreprise.nombre_offres_actives ?? entreprise.offres_actives?.length ?? 0})</span>
            </button>
            {entreprise.photos?.length > 0 && (
              <button
                onClick={() => setActiveTab("photos")}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "photos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Photos <span className="ml-1 text-xs text-slate-600">({entreprise.photos.length})</span>
              </button>
            )}
          </div>

          {/* Onglet À propos */}
          {activeTab === "apropos" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                {entreprise.description && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Présentation</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {entreprise.description}
                    </p>
                  </div>
                )}
                {entreprise.culture_entreprise && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Culture d'entreprise</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {entreprise.culture_entreprise}
                    </p>
                  </div>
                )}
              </div>
              {entreprise.photos?.length > 0 && (
                <div className="md:col-span-1">
                  <img
                    src={getMediaUrl(entreprise.photos[0].image)}
                    alt={entreprise.photos[0].legende || ""}
                    className="w-full h-full min-h-[160px] object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}
            </div>
          )}

          {/* Onglet Offres */}
          {activeTab === "offres" && (
            <div>
              {entreprise.offres_actives?.length > 0 ? (
                <div className="space-y-3">
                  {entreprise.offres_actives.map((offre) => (
                    <div
                      key={offre.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          to={jobUrl(offre, entreprise.slug)}
                          className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {offre.titre}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${CONTRAT_BADGES[offre.type_contrat] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {offre.type_contrat}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-700">
                            <MapPin size={11} /> {offre.wilaya?.split(" - ")[1] || offre.wilaya}
                          </span>
                          {offre.experience_requise && (
                            <span className="flex items-center gap-1 text-xs text-slate-700">
                              <Clock size={11} /> {expLabel(offre.experience_requise)}
                            </span>
                          )}
                          {offre.date_publication && (
                            <span className="flex items-center gap-1 text-xs text-slate-600">
                              <Calendar size={11} /> {formatDate(offre.date_publication)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        to={jobUrl(offre, entreprise.slug)}
                        className="shrink-0 px-4 py-2 bg-indigo-50 text-indigo-800 text-xs font-semibold rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                        Voir l'offre →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Briefcase size={20} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Aucune offre ouverte</p>
                  <p className="text-xs text-slate-600 mb-4">L'entreprise ne recrute pas en ce moment.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-800 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Send size={13} /> Envoyer une candidature spontanée
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Onglet Photos */}
          {activeTab === "photos" && entreprise.photos?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {entreprise.photos.map((p) => (
                <img
                  key={p.id}
                  src={getMediaUrl(p.image)}
                  alt={p.legende || ""}
                  title={p.legende || ""}
                  className="w-full h-32 object-cover rounded-lg border border-slate-200"
                />
              ))}
            </div>
          )}

          {/* Localisation — toujours visible, hors onglets */}
          {(entreprise.adresse_complete || wilayaVille) && (() => {
            const lieuRecherche = entreprise.adresse_complete || [communeAffichee, wilayaVille, "Algérie"].filter(Boolean).join(", ");
            return (
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 mt-4">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Localisation</p>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <iframe
                    title="Localisation de l'entreprise"
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(lieuRecherche)}&z=12&output=embed`}
                  />
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lieuRecherche)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Ouvrir dans Google Maps →
                </a>
              </div>
            );
          })()}
        </div>
      </div>
```

Note : ce remplacement absorbe l'ancienne section `{/* ── OFFRES ── */}` (ancien niveau racine, hors de la carte hero) — elle n'existe plus comme bloc séparé, son contenu vit maintenant dans l'onglet "Offres" à l'intérieur de la carte. La modale de candidature spontanée (`{showModal && (...)}`) reste inchangée et intacte juste après ce bloc, à la racine du composant.

- [ ] **Step 5: Lancer les tests, vérifier PASS**

```bash
npm test -- --run tests/EntreprisePublic.test.jsx
```

Expected: PASS — HP1, HP2, HP2b, HP3, HP4, HP5, HP6, HP7, EC1, EC2, EC3.

Si HP4 échoue ("Aucune offre ouverte" non trouvé) : vérifier que le test HP4 clique bien sur l'onglet "Offres" avant l'assertion — l'ajouter si besoin (même pattern que HP3 Step 1) :

```jsx
    await waitFor(() => screen.getByText("TafTech Solutions"));
    fireEvent.click(screen.getByRole("button", { name: /Offres/i }));
```

- [ ] **Step 6: Vérifier la suite complète frontend (pas de régression ailleurs)**

```bash
npm test -- --run
```

Expected: tous les fichiers PASS (aucun autre fichier ne devrait référencer la structure interne de `EntreprisePublic.jsx`).

- [ ] **Step 7: Build et commit**

```bash
npx vite build
git add src/Pages/Recruteur/EntreprisePublic.jsx tests/EntreprisePublic.test.jsx
git commit -m "feat: onglets À propos/Offres/Photos + contact en texte simple sur la page vitrine entreprise"
```

---

### Task 5: Vérification finale bout-en-bout

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Suite backend complète**

```bash
cd taftech_backend
python manage.py test jobs.tests
python manage.py check
```

Expected: tous PASS, aucune erreur de config.

- [ ] **Step 2: Suite frontend complète + build**

```bash
cd taftech_frontend
npm test -- --run
npx vite build
```

Expected: tous PASS, build propre.

- [ ] **Step 3: Vérification manuelle rapide (optionnel mais recommandé)**

Lancer `python manage.py runserver` + `npm run dev`, se connecter en recruteur, aller dans Paramètres → Mon entreprise, renseigner une année de création, sauvegarder, puis ouvrir `/entreprise/<slug>` dans un nouvel onglet pour vérifier visuellement le nouveau hero + les 3 onglets.

- [ ] **Step 4: Mettre à jour CLAUDE.md**

Ajouter une entrée de session résumant : nouveau champ `annee_creation`, refonte hero (neutre + 3 stats) et passage à onglets (À propos/Offres/Photos) de `EntreprisePublic.jsx`, contact en texte simple — suivant le format des entrées de session déjà présentes en tête du fichier (règle #8 de CLAUDE.md).

```bash
git add CLAUDE.md
git commit -m "docs: documente la refonte de la page vitrine entreprise"
```
