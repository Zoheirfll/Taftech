# Dashboard recruteur — grille stricte + sidebar recommandés Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réorganiser la section "aperçu" de `DashboardRecruteur.jsx` (Évolution/Pipeline/Offres actives/Sources/Activité récente/Candidats recommandés) en grille stricte 2 colonnes de contenu + 1 colonne latérale sticky dédiée aux candidats recommandés, conformément au mockup employeur.

**Architecture:** Pure restructuration JSX dans un seul fichier — aucune donnée, aucun endpoint, aucun nouveau composant. Le contenu (Évolution, Pipeline, Offres actives, Sources, Activité récente) passe dans une grille interne `lg:col-span-2` / `grid-cols-2`, le widget Candidats recommandés passe dans une colonne `lg:col-span-1 sticky top-20` et perd sa checkbox de filtre + pagination "voir plus" au profit d'un lien "Voir plus →" vers la page dédiée `/candidats-recommandes` (route déjà existante, `App.jsx:314`).

**Tech Stack:** React 18, Tailwind CSS v4, Vitest + @testing-library/react.

## Global Constraints

- Ne pas toucher à la logique de données (`useMemo`/calculs `evolution`, `pipeline`, `sourcesData`, `candidatsRecommandesTous`) — seul le rendu JSX change.
- Ne pas toucher aux blocs "Gestion de vos offres" (table) et "Recherche CVthèque / Générer offre IA / Besoin d'aide" — ils restent pleine largeur, en dehors de cette grille.
- `npx vite build` doit rester propre après le changement.
- Suite Vitest complète doit rester verte.

---

### Task 1 : Restructurer la grille aperçu + widget recommandés

**Files:**
- Modify: `taftech_frontend/src/Pages/Recruteur/DashboardRecruteur.jsx:789-1017`
- Test: `taftech_frontend/tests/DashboardRecruteur.test.jsx`

**Interfaces:**
- Consumes : états/valeurs déjà calculés plus haut dans le composant — `funnelEtapes`, `PIPELINE_STAGES`, `pipelineCounts`, `pipelineMax`, `pipelineTotal`, `offres`, `activite`, `formatTempsRelatif`, `sourcesDonut`, `periodeSources`, `setPeriodeSources`, `PERIODES_EVOLUTION`, `candidatsRecommandesTous`, `handleToggleFavoriRecommande`, `setOffreInvitation`, `setInviterCandidat`, `candidatFichierUrl`, `navigate`, `setActiveTab`. Toutes ces valeurs existent déjà avant la ligne 789, aucune nouvelle n'est introduite.
- Produces : aucune nouvelle interface exposée à d'autres tasks (task unique).

- [ ] **Step 1 : Lire le bloc actuel à remplacer**

Lire `taftech_frontend/src/Pages/Recruteur/DashboardRecruteur.jsx` lignes 789 à 1017 pour confirmer le contenu exact avant remplacement (déjà lu pendant le brainstorming — ce step sert de garde-fou si le fichier a changé entre-temps).

- [ ] **Step 2 : Remplacer le bloc par la nouvelle grille**

Remplacer intégralement les lignes 789 à 1017 (du commentaire `{/* Pipeline de recrutement | Mes offres actives | Activité récente — même ligne */}` jusqu'au `</div>` fermant la grille Sources/Recommandés) par :

```jsx
          {/* ── GRILLE APERÇU : contenu (2 col) + sidebar recommandés ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 mb-5 items-start">
            {/* Colonne contenu — Pipeline / Offres actives / Sources / Activité récente */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">
              <div className={`${tw.cardColors} rounded-2xl p-5`}>
                <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
                  <GitBranch size={15} className={tw.textTeal} /> Pipeline de recrutement
                </h2>
                <div className="flex justify-center mb-4">
                  <FunnelChart etapes={funnelEtapes} />
                </div>
                <div className="space-y-2.5">
                  {PIPELINE_STAGES.map((stage) => {
                    const count = pipelineCounts[stage.key];
                    const pct = (count / pipelineMax) * 100;
                    const pctTotal = pipelineTotal > 0 ? Math.round((count / pipelineTotal) * 100) : 0;
                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <span className={`text-xs w-24 shrink-0 ${tw.textMuted700}`}>{stage.label}</span>
                        <div className={`flex-1 h-2.5 ${tw.surfaceSubtle} rounded-full overflow-hidden`}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: stage.color }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-8 text-right shrink-0 ${tw.textStrong}`}>{count}</span>
                        <span className={`text-[10px] w-9 text-right shrink-0 ${tw.textMuted}`}>{count > 0 ? `${pctTotal}%` : ""}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${tw.cardColors} rounded-2xl p-5 overflow-hidden`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h2 className={`text-sm font-bold ${tw.textStrong}`}>Mes offres d'emploi actives</h2>
                  <button type="button" onClick={() => { setActiveTab("ouvertes"); }} className={`text-xs font-semibold ${tw.textTeal}`}>Voir toutes</button>
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-left min-w-[280px]">
                    <thead>
                      <tr className={`text-[10px] uppercase tracking-wide font-semibold ${tw.textMuted}`}>
                        <th className="px-1 py-1.5">Poste</th>
                        <th className="px-1 py-1.5 text-center">Cand.</th>
                        <th className="px-1 py-1.5 text-center">Entret.</th>
                        <th className="px-1 py-1.5 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${tw.divideBase}`}>
                      {[...offres].sort((a, b) => new Date(b.date_publication) - new Date(a.date_publication)).slice(0, 5).map((o) => {
                        const nbCand = o.candidatures?.length || 0;
                        const nbEnt = o.candidatures?.filter((c) => c.statut === "ENTRETIEN").length || 0;
                        return (
                          <tr key={o.id} className={tw.rowHover}>
                            <td className="px-1 py-2 text-xs font-medium truncate max-w-[110px]">{o.titre}</td>
                            <td className="px-1 py-2 text-xs text-center">{nbCand}</td>
                            <td className="px-1 py-2 text-xs text-center">{nbEnt}</td>
                            <td className="px-1 py-2 text-right">
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${o.est_cloturee ? tw.tagSlateSoft : "bg-emerald-100 text-emerald-700"}`}>
                                {o.est_cloturee ? "Clôturée" : "Active"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {offres.length > 0 && (
                <div className={`${tw.cardColors} rounded-2xl p-5`}>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
                      Sources des candidatures
                    </h2>
                    <select
                      value={periodeSources}
                      onChange={(e) => setPeriodeSources(e.target.value)}
                      className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
                    >
                      {PERIODES_EVOLUTION.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    {sourcesDonut.map((s) => (
                      <div key={s.key} className="flex items-center gap-3">
                        <span className={`text-xs w-24 shrink-0 ${tw.textMuted700}`}>{s.label}</span>
                        <div className={`flex-1 h-2.5 ${tw.surfaceSubtle} rounded-full overflow-hidden`}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: s.couleur }} />
                        </div>
                        <span className={`text-xs font-bold w-8 text-right shrink-0 ${tw.textStrong}`}>{s.count}</span>
                        <span className={`text-[10px] w-9 text-right shrink-0 ${tw.textMuted}`}>{s.count > 0 ? `${s.pct}%` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`${tw.cardColors} rounded-2xl p-5 md:col-span-2`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
                    <Activity size={15} className={tw.textTeal} /> Activité récente
                  </h2>
                  {activite.length > 5 && (
                    <Link to="/activite" className={`text-xs font-semibold ${tw.textTeal}`}>Voir tout</Link>
                  )}
                </div>
                {activite.length === 0 ? (
                  <p className={`text-xs italic ${tw.textMuted}`}>Aucune activité récente.</p>
                ) : (
                  <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {activite.slice(0, 5).map((a) => (
                      <li key={a.id} className="flex items-start gap-2.5">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${tw.bgTealSolid}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs ${tw.textMuted700}`}>{a.phrase}</p>
                          <p className={`text-[10px] mt-0.5 ${tw.textMuted}`}>{formatTempsRelatif(a.date)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Sidebar — Candidats recommandés, sticky sur toute la hauteur (desktop) */}
            {candidatsRecommandesTous.length > 0 && (
              <div className="lg:col-span-1 lg:sticky lg:top-20">
                <div className={`${tw.cardColors} rounded-2xl p-5`}>
                  <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
                    <Star size={15} className={tw.textTeal} /> Candidats recommandés
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${tw.tagSlateSoft700}`}>{candidatsRecommandesTous.length}</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    {candidatsRecommandesTous.slice(0, 6).map((cand) => {
                      const score = Math.round(parseFloat(cand.score_matching));
                      const nomAffiche = `${cand.candidat.first_name} ${(cand.candidat.last_name || "").slice(0, 1)}.`
                        .trim();
                      const tags = (cand.candidat.competences || "").split(",").map((c) => c.trim()).filter(Boolean).slice(0, 3);
                      return (
                        <div key={cand.id} className={`p-3.5 rounded-xl border ${tw.borderBase}`}>
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/offres/${cand.offreId}`)}
                              className={`w-10 h-10 rounded-full ${tw.surfaceSubtle} flex items-center justify-center overflow-hidden shrink-0`}
                            >
                              {cand.candidat.photo_profil ? (
                                <img src={candidatFichierUrl(cand.candidat.id, "photo")} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users size={16} className={tw.textMuted} />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/dashboard/offres/${cand.offreId}`)}
                                  className={`text-sm font-semibold ${tw.textStrong} hover:underline`}
                                >
                                  {nomAffiche}
                                </button>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${score >= 80 ? tw.bgSuccessSoft + " " + tw.textSuccess : score >= 60 ? tw.textAmber500 : tw.textRed400}`}>
                                  {score}% compatible
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${tw.textTeal}`}>{cand.offreTitre}</p>
                              {cand.candidat.wilaya && (
                                <p className={`text-xs mt-0.5 ${tw.textMuted}`}>{cand.candidat.wilaya.split(" - ")[1] || cand.candidat.wilaya}, Algérie</p>
                              )}
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {tags.map((t) => (
                                    <span key={t} className={`px-1.5 py-0.5 text-[10px] rounded ${tw.tagSlateSoft}`}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleFavoriRecommande(cand.candidat.id)}
                                title="Ajouter aux favoris"
                                className={`p-1 rounded-md transition-colors ${tw.hoverSurfaceSubtle}`}
                              >
                                <Bookmark size={14} className={tw.iconMuted} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setOffreInvitation(""); setInviterCandidat(cand); }}
                                title="Inviter à postuler"
                                className={`p-1 rounded-md transition-colors ${tw.hoverSurfaceSubtle}`}
                              >
                                <Send size={14} className={tw.iconMuted} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-center">
                    <Link to="/candidats-recommandes" className={`text-xs font-semibold ${tw.textTeal}`}>
                      Voir plus de candidats recommandés →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
```

- [ ] **Step 3 : Déplacer le bloc "Évolution" dans la colonne contenu, en 1ʳᵉ position de la grille interne**

Le bloc "Évolution" (actuellement lignes 728-787, juste avant le bloc remplacé au Step 2) doit devenir la première cellule de la grille interne `lg:col-span-2 grid grid-cols-1 md:grid-cols-2` (avant "Pipeline de recrutement"), au lieu de rester en pleine largeur au-dessus. Couper le `<div className={\`${tw.cardColors} rounded-2xl p-5 mb-2.5\`}>...</div>` complet du bloc Évolution (lignes 729-787) et le coller comme première cellule à l'intérieur de la `<div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">` créée au Step 2, juste avant la cellule "Pipeline de recrutement". Retirer `mb-2.5` de sa className (la grille gère déjà l'espacement via `gap-2.5`) :

```jsx
              <div className={`${tw.cardColors} rounded-2xl p-5`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
                    <TrendingUp size={15} className={tw.textTeal} /> Évolution
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setChartType("area")}
                      title="Courbe"
                      className={`p-1.5 rounded-lg border ${tw.borderBase} ${chartType === "area" ? tw.bgTealSoft + " " + tw.textTeal : `${tw.surface} ${tw.textMuted}`}`}
                    >
                      <LineChart size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      title="Barres"
                      className={`p-1.5 rounded-lg border ${tw.borderBase} ${chartType === "bar" ? tw.bgTealSoft + " " + tw.textTeal : `${tw.surface} ${tw.textMuted}`}`}
                    >
                      <BarChart3 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <label className={`flex items-center gap-1.5 text-xs font-medium ${chartType === "bar" ? "opacity-40" : "cursor-pointer"} ${tw.textMuted700}`}>
                    <input
                      type="checkbox"
                      checked={showComparaison}
                      disabled={chartType === "bar"}
                      onChange={(e) => setShowComparaison(e.target.checked)}
                      className="rounded"
                    />
                    <History size={12} /> Comparer à la période précédente
                  </label>
                  <label className={`flex items-center gap-1.5 text-xs font-medium ${chartType === "bar" ? "opacity-40" : "cursor-pointer"} ${tw.textMuted700}`}>
                    <input
                      type="checkbox"
                      checked={showConversion}
                      disabled={chartType === "bar"}
                      onChange={(e) => setShowConversion(e.target.checked)}
                      className="rounded"
                    />
                    <Percent size={12} /> Taux de conversion
                  </label>
                </div>
                <MiniAreaChart
                  data={evolution}
                  height={190}
                  chartType={chartType}
                  exportTitle="evolution-candidatures"
                  series={[
                    { key: "candidatures", color: "#4f46e5", label: "Candidatures reçues" },
                    { key: "recrutements", color: "#059669", label: "Recrutements" },
                  ]}
                  compareValues={evolutionPrevValues}
                  secondarySeries={showConversion && chartType !== "bar" ? { key: "tauxConversion", color: "#ea580c", label: "Taux de conversion (%)" } : null}
                />
              </div>
```

Le fragment JSX englobant (`<>...</>`) qui contenait les filtres au-dessus (lignes 703-704) et se refermait après ce bloc reste ouvert autour de la grille du Step 2 — les filtres offre/période restent affichés au-dessus de toute la grille, inchangés.

- [ ] **Step 4 : Lancer le build Vite**

Run: `cd taftech_frontend && npx vite build`
Expected: build réussi, aucune erreur JSX (balises bien fermées, `md:col-span-2` valide sur le bloc Activité récente).

- [ ] **Step 5 : Lancer la suite de tests frontend complète**

Run: `cd taftech_frontend && npm test -- --run`
Expected: tous les tests passent (aucune assertion existante ne cible la disposition CSS ou la checkbox "Masquer retenus/refusés" / pagination "Voir plus de candidats recommandés" retirées — vérifié par grep avant écriture de ce plan, zéro résultat sur ces libellés dans `tests/DashboardRecruteur.test.jsx`).

- [ ] **Step 6 : Ajouter une assertion sur le nouveau lien "Voir plus" vers la page dédiée**

Ouvrir `taftech_frontend/tests/DashboardRecruteur.test.jsx`, repérer le test qui rend le composant avec au moins un candidat recommandé dans les données mockées (chercher un mock incluant `score_matching` dans `candidatures`). Ajouter un test dédié à la fin du fichier :

```jsx
it("affiche un lien vers la page dédiée Candidats recommandés", async () => {
  renderDashboard(); // ou l'helper de rendu déjà utilisé dans ce fichier, avec les mocks par défaut incluant un candidat scoré
  const lien = await screen.findByRole("link", { name: /Voir plus de candidats recommandés/i });
  expect(lien).toHaveAttribute("href", "/candidats-recommandes");
});
```

Adapter le nom de l'helper de rendu (`renderDashboard`, ou le pattern `render(<MemoryRouter>...</MemoryRouter>)` déjà utilisé dans ce fichier — reprendre exactement le pattern des tests existants du même fichier plutôt que d'introduire un nouveau helper).

- [ ] **Step 7 : Relancer les tests pour confirmer**

Run: `cd taftech_frontend && npm test -- --run`
Expected: tous les tests passent, y compris le nouveau.

- [ ] **Step 8 : Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Pages/Recruteur/DashboardRecruteur.jsx taftech_frontend/tests/DashboardRecruteur.test.jsx
git commit -m "fix: grille dashboard recruteur en 2 colonnes + sidebar recommandés sticky (mockup employeur)"
```

---

## Self-Review Notes

- **Spec coverage** : disposition cible (Évolution+Pipeline / Offres+Sources / Activité pleine largeur / sidebar sticky Candidats recommandés simplifiée avec lien "Voir plus →") — couverte par Steps 2-3. Widget recommandés déjà simplifié visuellement lors d'une session précédente (avatar/nom/score/poste/wilaya/tags) — seule la checkbox de filtre et la pagination inline sont retirées ici, conformément au spec.
- **Correction vs le spec initial** : le spec mentionnait `/dashboard/candidats-recommandes` comme route cible — vérifié dans `App.jsx:314`, la vraie route est `/candidats-recommandes` (sans préfixe `/dashboard`). Le plan utilise la route réelle.
- **États devenus inutilisés** : `masquerDecides`/`setMasquerDecides` et `recommandesLimit`/`setRecommandesLimit`/`hasMoreRecommandes` ne sont plus référencés dans le JSX après ce changement. Ils restent déclarés dans le composant (probablement utilisés uniquement pour calculer `candidatsRecommandesTous`/`candidatsRecommandes` avant ce changement) — **à vérifier au Step 4** : si `npx vite build` ou un lint échoue sur une variable désormais inutilisée, supprimer `candidatsRecommandes` (remplacé par `candidatsRecommandesTous.slice(0, 6)` directement dans le JSX) et le state `recommandesLimit`/`hasMoreRecommandes` de la section calcul (lignes ~481-493) ; garder `masquerDecides` seulement s'il est encore lu ailleurs (il ne l'est pas d'après la lecture du fichier — le retirer aussi si le linter s'en plaint). Ce point n'est volontairement pas pré-résolu en dur dans le plan : Vite/ESLint ne fait pas échouer le build sur une variable inutilisée par défaut dans ce projet (pas de règle `no-unused-vars` bloquante connue), donc probable non-issue, mais à vérifier en pratique.
