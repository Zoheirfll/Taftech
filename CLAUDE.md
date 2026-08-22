# CLAUDE.md — Mémoire Projet TafTech

> **Lire ce fichier en entier avant toute action dans ce projet.**

_Dernière mise à jour : 22/08/2026 — Branche `specs/important-features` : Phase 2a de la refonte portail recruteur (modèle `Palier`/`AbonnementEntreprise` backend + admin CRUD) livrée, à la suite de la Phase 1 (sidebar `RecruteurLayout`). Voir sections ci-dessous._

## 🆕 SESSION 22/08/2026 (suite) — Refonte portail recruteur (Phase 2a : modèle Paliers backend + admin)

**Contexte** : suite directe de la Phase 1 (sidebar). Spec complet : `docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md`. Plan : `docs/superpowers/plans/2026-08-22-recruteur-paliers-phase2a.md`.

**Nouveaux modèles** (`jobs/models.py`, migration `0079`) : `Palier` (nom STARTER/PRO/BUSINESS/ENTERPRISE unique, prix mensuel/annuel nullable — null = "Sur devis" pour Enterprise —, `remise_annuelle_active`, `limite_offres`/`limite_cv_mois` nullable = illimité, `acces_coordonnees`/`acces_ia_recommandes`/`acces_ia_avancee`/`acces_equipe` booléens, `support_label` texte libre, `ordre`, `actif`) et `AbonnementEntreprise` (OneToOne vers `ProfilEntreprise`, FK `palier` PROTECT, `date_debut` auto, `date_expiration` nullable = illimité, property `est_actif`).

**Migration de données** (`0080_seed_paliers_migrer_premium.py`) : seed des 4 paliers avec les valeurs exactes du mockup employeur (Starter 5900/70800 DA, Pro 12900/154800 DA, Business 22900/274800 DA, Enterprise sur devis) + bascule automatique des entreprises `est_premium=True` (ancien système) vers `AbonnementEntreprise(palier=BUSINESS, date_expiration=<premium_expire_at existant>)`, sans re-paiement forcé. Texte des valeurs dupliqué en dur dans la migration (pas d'import du code applicatif), même principe que la migration `0075` déjà documentée dans ce fichier — une migration reste un instantané figé.

**Backend CRUD** (`jobs/views/paliers_admin.py`, pattern identique à `PremiumPlansAdminAPIView`) : `PaliersPublicAPIView` (`GET jobs/paliers/`, `AllowAny` + `PublicReadThrottle`, cache 1h `jobs_paliers`, ne retourne que `actif=True` — consommé par une future page Abonnements, pas encore construite) et `PaliersAdminAPIView` (CRUD complet, `IsAdminUser` + vérif rôle, invalide le cache à l'écriture).

**Panel admin `AdminPaliers.jsx`** (route `/admin-taftech/paliers`, sidebar section "Système") : tableau des 4 paliers + modale d'édition complète (prix, limites, accès, support). **Pas de bouton Ajouter/Supprimer** (contrairement à `AdminPremium.jsx`) — les 4 paliers sont fixes (contrainte `unique=True` sur `nom`), l'admin ajuste seulement les valeurs.

**🐛 Piège trouvé en testant (déjà anticipé dans le plan)** : les tests `PalierModelTest`/`AbonnementEntrepriseModelTest` (Task 1, écrits avant la migration de seed) créaient leurs propres `Palier(nom="STARTER"/"BUSINESS"/...)` sans vider la table d'abord — une fois la migration `0080` appliquée à la base de test, ces noms existaient déjà (contrainte unique), 6 tests en erreur sur la suite complète. Fix : `Palier.objects.all().delete()` ajouté en tête de `setUp()` des deux classes, même pattern que `CMSTestBase`/`PremiumPlanAPITest` déjà en place dans `test_api_cms.py`.

**🔴 IMPORTANT — ce qui n'a PAS changé cette session** : le gating existant (`CVThequeView`, limite d'offres — inexistante avant —, `GenererOffreIAAPIView`, candidats recommandés IA, gestion d'équipe) continue de lire `ProfilEntreprise.est_premium_actif` exactement comme avant. Les nouveaux modèles `Palier`/`AbonnementEntreprise` existent en base et sont administrables, mais **rien ne les consomme encore côté gating** — c'est la Phase 2b (plan séparé, pas encore écrit), qui rebranchera CVthèque/limite offres/quota CV/IA/équipe sur les nouveaux paliers.

**Tests** : `jobs/tests/test_api_paliers.py` (13/13 ✅ : 4 modèle Palier, 3 modèle AbonnementEntreprise, 6 API CRUD/permissions/cache), `AdminPaliers.test.jsx` (4/4 ✅), frontend 419/419 ✅, `npx vite build` propre, `python manage.py check` propre. Suite backend complète relancée après le fix ci-dessus.

**Non fait cette session (Phase 2b, à faire)** : rebrancher CVthèque (accès + coordonnées + quota CV/mois), limite d'offres actives à la publication, génération offre IA (Starter+), candidats recommandés IA (Pro+), recherche/filtres/stats IA avancés (Business+), gestion d'équipe (Business+) sur le nouveau modèle `Palier`/`AbonnementEntreprise` au lieu de `ProfilEntreprise.est_premium_actif`. Voir le spec complet pour le détail déjà tranché de chaque gate.

## 🆕 SESSION 22/08/2026 — Refonte portail recruteur (Phase 1 : sidebar)

**Contexte** : l'employeur a envoyé un mockup IA d'une page "Abonnements & tarifs" recruteur avec sidebar, 4 formules tarifaires, tableau comparatif, FAQ, etc. Brainstorming complet mené point par point (checklist exhaustive de la capture, rien laissé de côté — spec écrit incrémentalement pour ne rien perdre en implémentation, contrairement à une session précédente sur un autre projet où 90% avait été oublié à l'implémentation). Spec complet : `docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md`.

**Portée totale** (bien plus large que la seule page Abonnements) : nouveau layout à sidebar pour **tout** le portail recruteur (n'existait pas — contrairement au candidat qui a déjà `CandidatLayout.jsx`), refonte du système Premium binaire actuel en **4 vrais paliers** (Starter/Pro/Business/Enterprise) avec fonctionnalités différenciées, et 9 nouvelles pages sidebar (Offres, Candidatures, Candidats recommandés, Entretiens, Recrutements, Statistiques, Facturation, Favoris [réutilise CVthèque], Abonnements & tarifs). Découpage acté en **phases séparées**, chacune avec son propre plan d'implémentation (`docs/superpowers/plans/`) — cette session livre uniquement la **Phase 1**.

**Phase 1 livrée — `RecruteurLayout.jsx`** (`taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx`, nouveau) : sidebar calquée sur `CandidatLayout.jsx` (même structure `useMemo` menu + `<aside className="hidden md:block">` + `<main><Outlet/></main>`), variante teal (nouveaux tokens `theme.js` : `sidebarShellTeal`/`sidebarLinkActiveTeal`/etc., même pattern que les tokens indigo candidat). **8 liens actifs** pour l'instant (uniquement des pages qui existent déjà — pas de lien mort) : Tableau de bord, CVthèque, Favoris, Messages, Publier une offre, Questionnaires, Mon équipe, Paramètres entreprise. Les 8 liens restants (Offres, Candidatures, Recommandés, Entretiens, Recrutements, Statistiques, Abonnements, Facturation) seront ajoutés un par un dans les phases suivantes, au fur et à mesure que chaque page est construite.

- **"Messages"** = `/candidatures-spontanees` renommé dans la sidebar (boîte de réception recruteur existante), badge = nombre de candidatures spontanées non lues (`jobsService.getCandidaturesSpontanees()`, filtre `!lue`).
- **"Favoris"** = pas une nouvelle page — lien vers `/cvtheque?favoris=true`. `CVTheque.jsx` lit désormais ce paramètre au montage (`useSearchParams`) pour ouvrir directement sur l'onglet Favoris (l'onglet existait déjà en interne, seule l'initialisation depuis l'URL est nouvelle).
- **Recherche Ctrl+K** : champ de recherche en haut de `RecruteurLayout` (raccourci clavier focus le champ), Entrée redirige vers `/cvtheque?search=<terme>` — réutilise la recherche CVthèque existante, aucun nouveau moteur/endpoint.
- **`App.jsx`** : les 8 routes recruteur connectées (`/dashboard`, `/dashboard/offres/:id`, `/creer-offre`, `/cvtheque`, `/candidatures-spontanees`, `/questionnaires`, `/parametres`, `/mon-equipe`) nichées sous un seul `<Route element={<RecruteurRoute><RecruteurLayout/></RecruteurRoute>}>` parent au lieu d'un `<RecruteurRoute>` individuel par route — même pattern que le bloc `CandidatLayout` déjà présent juste en dessous. Les `RoleGuard minRole="UTILISATEUR"` internes (creer-offre/cvtheque/questionnaires) sont préservés tels quels sur les routes enfants.
- **Parité mobile** (trouvé en revue de code, pas dans le plan initial) : `RecruteurLayout` n'a pas d'équivalent mobile (`hidden md:block`, comme `CandidatLayout`) — le menu hamburger + dropdown desktop de `NavbarRecruteur.jsx` couvraient déjà 6 des 8 liens mais pas "Mon équipe"/"Favoris" (nouveaux). Ajoutés aux deux listes existantes de `NavbarRecruteur.jsx` (dropdown desktop + hamburger mobile), même pattern `minRole`/`peutFaire` que les entrées existantes — pas de nouveau composant.

**Exécuté en Subagent-Driven Development** (4 tâches, chacune avec implémenteur + relecteur dédiés, un aller-retour de correctifs sur la tâche 2 pour la parité mobile ci-dessus) — voir `docs/superpowers/plans/2026-08-22-recruteur-sidebar-phase1.md`.

**Tests** : frontend 410/410 ✅ (410, +8 par rapport à la session précédente : nouveau `RecruteurLayout.test.jsx` + 1 test ajouté à `CVTheque.test.jsx`), `npx vite build` propre.

**Non fait cette session (phases suivantes)** : les 4 paliers Premium (Starter/Pro/Business/Enterprise, nouveau modèle `Palier`/`AbonnementEntreprise`, gating limite offres/CV mensuel/coordonnées), les 8 pages sidebar restantes (Offres, Candidatures, Recommandés, Entretiens, Recrutements, Statistiques, Abonnements & tarifs, Facturation) — voir le spec complet pour le détail déjà tranché de chacune.

**🐛 3 bugs réels trouvés en revue de branche complète (corrigés le jour même)** — la recherche Ctrl+K et le lien Favoris de `RecruteurLayout.jsx` naviguaient bien vers `/cvtheque?search=...`/`?favoris=true`, mais `CVTheque.jsx` ne réagissait pas correctement :
1. **`?search=` mort** : `CVTheque.jsx` ne lisait jamais le paramètre `search` de l'URL (seul `favoris` était lu) — taper Ctrl+K puis Entrée atterrissait bien sur `/cvtheque?search=...` mais le champ de recherche restait vide et aucune requête n'était lancée avec ce terme.
2. **`activeTab`/`search` non réactifs à un changement d'URL sans remount** : les deux étaient initialisés via `useState(...)` (exécuté une seule fois au montage) — React Router ne remonte pas `CVTheque` quand seule la query string change sur la même route, donc cliquer "Favoris" depuis `/cvtheque` (déjà monté) changeait l'URL sans jamais faire bouger l'onglet actif. Fix : nouveau `useEffect` keyé sur `searchParams` (`taftech_frontend/src/Pages/Recruteur/CVTheque.jsx`, juste après la déclaration de `searchParams`) qui resynchronise `activeTab` et `search` à chaque montage ET à chaque navigation vers une nouvelle query string — ne fight pas avec les handlers existants (clic onglet, saisie recherche) car il ne se déclenche que sur un vrai changement de `searchParams`, jamais sur une frappe clavier qui ne touche pas l'URL.
3. **Double highlight sidebar** : le lien "CVthèque" utilisait le check d'activation par défaut (`location.pathname === item.path`), donc restait actif même quand `favoris=true` était dans l'URL — les deux liens "CVthèque" et "Favoris" s'affichaient actifs simultanément. Fix : `isActive` dédié sur l'entrée "CVthèque" (`RecruteurLayout.jsx`) qui exclut explicitement `favoris=true`.

Tests ajoutés : `CVTheque.test.jsx` (recherche préchargée depuis `?search=`, navigation même-route `/cvtheque` → `/cvtheque?favoris=true` sans remount via un harnais `useNavigate` local), `RecruteurLayout.test.jsx` (Ctrl+K+Entrée navigue vers `/cvtheque?search=...`, un seul des deux liens CVthèque/Favoris actif dans chaque état d'URL).

**Tests** : frontend 415/415 ✅ (+5 par rapport à la Phase 1), `npx vite build` propre.

## 🆕 SESSION 21/08/2026 (suite 2) — Unification compétences, conseils IA réels, polish dashboard candidat

**Contexte** : suite directe de la refonte dashboard candidat de la session précédente. Retours utilisateur en continu sur l'implémentation initiale, traités un par un.

**Compétences unifiées profil ↔ Mes compétences** : le tag input de la page "Mon profil" (texte libre `ProfilCandidat.competences`) et la page structurée "Mes compétences" (`CompetenceCandidat`, avec niveau) étaient deux systèmes distincts qui divergeaient. Décision utilisateur explicite : les deux doivent refléter EXACTEMENT la même donnée, jamais une duplication. Fix :
- `ProfilCandidatAPIView.put()` (`jobs/views/profils.py`) : nouvelle fonction `_synchroniser_competences_depuis_texte(profil)` appelée à chaque écriture du champ `competences` — fait converger `CompetenceCandidat` vers la liste texte (ajoute les nouvelles au niveau DEBUTANT, supprime celles retirées, préserve le niveau des existantes).
- **Backfill paresseux** (`ProfilCandidatAPIView.get()` et `CompetenceCandidatAPIView.get()`) : un profil dont les compétences texte existaient déjà AVANT l'introduction de `CompetenceCandidat` n'avait jamais déclenché la synchro (elle ne se faisait qu'à l'écriture) — sans ce backfill à la lecture, "Mes compétences" restait vide indéfiniment pour tout profil existant tant qu'aucune resauvegarde n'avait lieu. Bug réel découvert en testant sur le vrai compte de l'utilisateur.
- `ProfilCandidatDTO` (`jobs/serializers/profils.py`) expose désormais `competences_detail` (nouveau `CompetenceCandidatSerializer`) en plus du texte libre `competences`.
- Frontend `ProfilCandidat/index.jsx` : la section Compétences affiche maintenant `profil.competences_detail` (tags avec sélecteur de niveau inline + suppression) au lieu de `profil.competences.split(",")` — ajout via `jobsService.ajouterCompetence(label, "DEBUTANT")` au lieu du mécanisme `handleAddTag` générique (toujours utilisé pour les langues).
- **Décision produit reconfirmée** (page "Mes compétences" faillie supprimée par erreur puis restaurée sur demande explicite) : garder les DEUX écrans (profil = usage courant rapide, Mes compétences = gestion dédiée avec recherche), la donnée sous-jacente étant maintenant unique.

**🚨 Incident — données de test réelles écrasées** : plusieurs commandes de smoke-test lancées via `python manage.py shell` contre la base de dev réelle (pas une base de test isolée) utilisaient `User.objects.filter(role='CANDIDAT').first()` sans `order_by` explicite — non déterministe côté PostgreSQL, a retourné tantôt le compte `meriembelamri432@gmail.com` (id 5) tantôt le compte réel de l'utilisateur `zoheir.fll31@gmail.com` (id 7) selon l'appel. Résultat : les 16 compétences réelles du compte de l'utilisateur ont été écrasées par des valeurs de test. Restauré manuellement à partir des captures d'écran partagées dans la conversation (seule source de la valeur d'origine, la BD ne la conservait plus). **Leçon actée : ne plus jamais faire de `.filter().first()` sans `order_by` ni muter des données via shell contre la base de dev réelle — utiliser `.get(email=...)` sur un compte identifié, ou le framework de test Django avec une base isolée.**

**Parser CV — niveau détecté par compétence** : `PROMPT_CV_COMPLET` (`jobs/cv_parser.py`) étend l'extraction avec `competences_niveaux` — même format texte que les langues (`"Compétence:Niveau, ..."`), Groq estime le niveau depuis le contexte du CV (ancienneté, mentions, mots comme "maîtrise"/"notions"). Nouvelle fonction `_parser_niveaux_competences()` convertit vers les codes `CompetenceCandidat.NIVEAU_CHOICES`. `parse_cv()` expose `result["competences_niveaux"]` (dict `{label: code}`). Frontend (`useProfilCandidat.js::handleValiderParsing`) : après la sauvegarde du profil (qui crée les compétences au niveau DEBUTANT par défaut via la synchro), affine chaque niveau détecté via `jobsService.ajouterCompetence(label, niveau)`. Aperçu de confirmation (`Modals.jsx`) affiche le niveau à côté de chaque compétence détectée.

**Conseils personnalisés — LLM réel, pas déterministe** : première version (règles if/else côté client) jugée insuffisante par l'utilisateur ("non faites le llm, et pas qu'un seul conseil"). Remplacé par un vrai appel Groq :
- Nouveau `jobs/conseils-personnalises/` (`ConseilsPersonnalisesIAAPIView`, `jobs/views/candidat_dashboard.py`) — envoie au LLM le score de profil, les statuts de candidatures, les compétences non confirmées, le nombre d'alertes ; retourne 3-5 conseils concrets en JSON strict (`response_format: json_object`, comme `GenererOffreIAAPIView`). `GroqThrottle` réutilisé (20/h).
- **Nouveau toggle admin** `AIConfig.conseils_dashboard_actif`/`_max_tokens`/`_prompt` (migration `0078`), ajouté à `AdminIAConfig.jsx` (5ᵉ carte fonctionnalité) — même pattern kill-switch que les 4 fonctionnalités IA existantes.
- **Décision** : contrairement au Score de profil (volontairement déterministe, cf. session précédente — fiabilité d'un score arbitraire), les conseils sont du texte reformulé à partir de données réelles fournies dans le prompt, pas une auto-évaluation numérique — cas d'usage où le LLM est fiable.
- Widget dashboard toujours visible (même vide) plutôt que masqué silencieusement en cas d'échec — affiche le message d'erreur exact renvoyé par le backend (503 si désactivé par l'admin, sinon message générique).

**Recherche rapide dans le dashboard candidat** : après plusieurs tentatives ratées de l'intégrer dans la `Navbar.jsx` globale (collisions de layout avec les liens de navigation et les icônes de compte à largeur de fenêtre réduite, revert complet à deux reprises), décision finale : barre de recherche + sélecteur wilaya **dans la page `CandidatDashboard.jsx` elle-même**, pleine largeur, juste sous le titre — pas dans la navbar. Soumission navigue vers `/offres?search=...&wilaya=...` (déjà lu par `JobsList.jsx` via `useSearchParams`).

**Alertes d'emploi — widget dashboard enrichi** : affiche désormais wilaya + fréquence (Quotidienne/Hebdomadaire) sous chaque alerte (pas seulement les mots-clés), liste complète (plus de troncature à 4), et une bascule groupée "Recevoir mes alertes par email" en haut du widget qui active/désactive toutes les alertes du candidat en un clic (boucle sur `jobsService.toggleAlerte` existant, aucun nouveau endpoint).

**Mise en page — alignement sur le palier "Petit" du design system** : le dashboard avait dérivé vers une densité encore plus compacte que le palier "Petit" documenté (Login/ReviewCandidature/CVthèque), créant une incohérence visuelle marquée avec le reste du site. Remonté à `text-sm`/`text-xl`, `p-5`, icônes 16px — cohérent avec le reste de l'app, toujours nettement plus dense que le palier "Grand" (ProfilCandidat/MesCandidatures). Colonne latérale (Suivi candidatures/Alertes/Activité) passée en `sticky top-20` pour éviter un grand vide visuel quand elle est plus courte que la colonne principale.

**Offres recommandées — carte dédiée** : `JobCard` générique (conçue pour des grilles pleine largeur) rendait mal dans le carrousel étroit du dashboard. Nouveau composant local `RecommendedJobCard` (logo circulaire, titre, wilaya, badges CDI/Compatible, salaire) — plus proche du mockup, sans les actions "Postuler"/"Voir détails" superflues dans ce contexte compact.

**Analyse de mon CV — remplace l'ancien widget "Score de profil" isolé** : même score composite déterministe (session précédente, inchangé), mais présenté avec un message contextuel ("Bon profil !"/"Profil à renforcer") et deux colonnes **Points forts / À améliorer** dérivées des composantes du score (ratio points/max ≥ 0.7 = point fort), plus une liste "Compétences à développer" (barres de progression par niveau, exclut les compétences déjà Confirmées) — remplace l'ancien widget "Mes compétences" (liste plate) sur le dashboard uniquement, la page dédiée "Mes compétences" reste inchangée.

**🐛 Piège récurrent (déjà documenté dans ce fichier pour le chantier CMS) reconfirmé** : le changement de rendu des compétences dans `ProfilCandidat/index.jsx` (texte → `competences_detail`) a cassé silencieusement 2 tests (`ProfilCandidat.test.jsx`, et `RegisterCandidat.test.jsx` — qui teste en réalité `<ProfilCandidat />`, nom de fichier trompeur) car leurs mocks de profil n'incluaient pas `competences_detail`. Fix : ajout du champ aux fixtures + mocks `jobsService.ajouterCompetence`/`supprimerCompetence`/`searchCompetences` + réécriture de l'assertion HP4 (attendait un `FormData` PUT sur `/profil/`, attend maintenant un appel direct à `ajouterCompetence`).

**Tests** : backend 338/338 ✅, frontend 402/402 ✅, `npx vite build` propre, `python manage.py check` propre, endpoints IA vérifiés en conditions réelles (Groq réel, pas mocké) contre la base de dev.

---

## 🆕 SESSION 21/08/2026 (branche `specs/important-features`) — Refonte tableau de bord candidat (mockup employeur)

**Contexte** : l'employeur a envoyé des mockups générés par IA montrant une refonte souhaitée du tableau de bord candidat. Chaque point discuté individuellement avec l'utilisateur avant tout code (14 points au total : 6 "réorganiser l'existant", 8 "nouvelles fonctionnalités"), puis délégation complète ("faites tt debrouilles vous je vais sortir je compte sur votre expertise"). Nouvelle branche `specs/important-features` créée depuis `main` à jour (après commit du travail précédent : prompts IA éditables + audit dashboard admin).

**Décisions actées point par point** :
1. Jauge de complétude compacte + 6 sous-barres par catégorie (Informations personnelles, Expérience professionnelle, Compétences, Formation, Langues, CV), chacune avec tooltip listant ses critères exacts.
2. Offres recommandées : badge % de matching + carrousel horizontal (au lieu d'une liste verticale figée).
3. Nouveau **Score de profil** composite /100, remplace l'ancienne "Analyse IA du CV" comme widget principal — **volontairement pas généré par l'IA** (peu fiable pour s'auto-noter sur une échelle arbitraire), calcul déterministe backend : complétude (25pts) + diplôme (20pts, barème hiérarchique) + expérience (20pts, années plafonnées à 10) + langues (15pts, moyenne des niveaux déclarés) + pertinence marché (20pts, moyenne du score de matching sur les offres actives, réutilise `matcher.calculer_score_matching` sans nouvelle logique). "Pourquoi ce score ?" (explication détaillée) volontairement reporté — pas encore fait.
4. Dernières candidatures : logo entreprise ajouté (nouveau champ `entreprise_logo_url` sur `MesCandidaturesDTO`).
5. Alertes d'emploi : compteur "nouvelles offres" fiabilisé via un timestamp `derniere_consultation` (reset à la consultation) plutôt qu'un calcul figé — dupliqué sur le dashboard et sur `/alertes`.
6. Suivi candidatures : funnel 6 lignes (Envoyées / Présélection / En cours / Entretien / Retenu / Refusé) — décision : ne PAS fusionner Retenu+Refusé en une seule ligne "Décision".
7. **Compétences à développer** (%) — reporté, lié à la Feature 3 ("Mes tests") qui reste à décider.
8. Recommandations de formation externe (Udemy/Coursera) — **écarté**, pas fait.
9. **Mes tests** (évaluation de compétences) — **PARKÉ explicitement**, l'utilisateur veut y réfléchir davantage. Ne pas construire sans nouvelle demande.
10. **Prendre rendez-vous** — système complet avec agenda réel, entièrement configurable par l'admin, un seul conseiller/agenda (pas multi-intervenants).
11. **Mes documents** — espace 100% privé (jamais visible aux recruteurs), catégories de documents configurables par l'admin (pas codées en dur).
12. **Mes compétences** (page dédiée) — option structurée choisie : chaque compétence a un niveau auto-déclaré (Débutant/Intermédiaire/Avancé/Confirmé), conçu pour s'articuler plus tard avec un statut "Vérifié par test" une fois "Mes tests" construit.
13. **Activité récente** — fil d'événements "Candidature consultée" (recruteur a ouvert la candidature) et "Profil recommandé" (déclenché uniquement si score de matching ≥ 80%, même seuil que la convention "+80% IA" déjà en place ailleurs — pas pour une simple consultation de profil sans contexte).
14. **Publier mon CV** — simple raccourci vers le flux d'upload CV existant, aucun nouveau backend.

### Backend — 8 nouveaux modèles (`jobs/models.py`, migration `0076` + seed `0077`)
`CompetenceCandidat` (label, niveau, source — resynchronise `ProfilCandidat.competences` texte libre à chaque écriture pour ne rien casser côté `matcher.py`/`cv_parser.py`), `TypeDocument` (catalogue admin, seedé avec 5 types de départ : CV/Diplôme/Attestation/Lettre de motivation/Certificat), `DocumentCandidat` (FK profil + type, jamais exposé aux recruteurs), `ConfigRendezVous` (singleton `get_solo()`, délai min de réservation + horizon max), `DisponibiliteRecurrente` (gabarit hebdomadaire admin : jour + heures + durée créneau), `JourBloque`, `RendezVous`, `ActiviteProfil`. Champ `derniere_consultation` ajouté à `AlerteEmploi` existant.

**Score de profil** (`jobs/profile_score.py`, nouveau fichier) : `calculer_score_profil(candidat_user)` — 5 composantes documentées ci-dessus, réutilise `_annees_experience`/`_deduire_annees_sans_chevauchement` de `matcher.py` (pas de réimplémentation).

**Créneaux de rendez-vous calculés à la volée** (`jobs/views/candidat_dashboard.py::_generer_creneaux_disponibles()`) — jamais matérialisés en base individuellement, calculés à chaque requête à partir de 3 entrées indépendantes (gabarit hebdomadaire actif + jours bloqués + créneaux déjà réservés). Vérifié en conditions réelles : le délai minimum de réservation exclut bien les créneaux du jour même pour le jour de la semaine configuré, en sautant à l'occurrence de la semaine suivante.

**Compteur d'alertes fiable** (`AlerteEmploiSerializer.nb_nouvelles_offres`) : compte les offres publiées après `derniere_consultation` (ou `date_creation` si jamais consultée) — pas un compteur stocké à incrémenter, toujours recalculable, pas de race condition. Nouveau `AlerteMarquerVueAPIView` (`POST jobs/alertes/<id>/marquer-vue/`) reset le timestamp.

**Activité récente — anti-spam** : `CandidatureMarquerConsulteeAPIView` (`POST jobs/candidatures/<id>/marquer-consultee/`, appelé côté frontend recruteur dans `GestionOffre/index.jsx::handleSelectCandidature`, fire-and-forget) logue un événement `CANDIDATURE_CONSULTEE` via `get_or_create` (jamais de doublon). `CVThequeView.get()` (`jobs/views/recruteur.py`) logue `PROFIL_RECOMMANDE` pour tout candidat scoré ≥80% dans les résultats, **throttlé à 1 événement / 24h par paire (candidat, entreprise)** pour éviter le spam à chaque rafraîchissement de recherche CVthèque.

**19 nouvelles routes** ajoutées dans `jobs/urls.py`, toutes placées avant le catch-all final `<str:offre_id>/` (contrainte critique déjà documentée dans ce fichier — toute route littérale doit précéder ce pattern).

### Frontend
- **`Services/dashboardCandidatService.js`** (nouveau) — ~20 méthodes candidat + admin, réexporté dans la façade `jobsService.js` (`...dashboardCandidatService`).
- **`Pages/Candidat/CandidatDashboard.jsx`** — réécrit en entier : jauge compacte + 6 sous-barres avec `TooltipIcon`, carrousel offres recommandées (scroll horizontal + boutons flèches) avec badge `matching_score`, widget Score de profil (jauge + détail 5 composantes), funnel candidatures 6 lignes, dernières candidatures avec logo entreprise, widget alertes avec compteur fiable, widget Activité récente, 3 raccourcis vers Mes compétences / Mes documents / Prendre rendez-vous, bouton "Publier mon CV".
- **3 nouvelles pages candidat** : `MesCompetences.jsx`, `MesDocuments.jsx`, `PrendreRendezVous.jsx` — pattern déjà établi (`AlertesEmploi.jsx` : liste + modale + `confirmToast`). Ajoutées à `CandidatLayout.jsx` (sidebar) et aux routes `App.jsx` (dans le même `<Route element={<CandidatRoute><CandidatLayout /></CandidatRoute>}>`).
- **2 nouveaux panels admin** : `AdminRendezVous.jsx` (config délai/horizon + 3 onglets : créneaux récurrents / jours bloqués / liste rendez-vous avec changement de statut inline) et `AdminTypesDocuments.jsx` (CRUD simple, pattern `AdminFaq.jsx`). Routes + entrées sidebar section "Système" dans `AdminLayout.jsx`.

**Piège récurrent (déjà documenté dans ce fichier pour le chantier CMS) reconfirmé cette session** : l'ajout de `jobsService.marquerCandidatureConsultee` dans `GestionOffre/index.jsx::handleSelectCandidature` a fait échouer silencieusement (unhandled exception, pas un test rouge) `GestionOffre.test.jsx` — le mock `vi.mock("../src/Services/jobsService")` du test ne définissait pas cette méthode. Fix : ajout de `marquerCandidatureConsultee: vi.fn().mockResolvedValue(null)` au mock.

**Audit sécurité** : tous les nouveaux endpoints candidat vérifient `request.user.role == 'CANDIDAT'` explicitement (pattern déjà établi) ; tous les endpoints admin `IsAdminUser` + `request.user.role == 'ADMIN'`. Documents candidat (`DocumentCandidatAPIView`) scopés strictement à `request.user.profil_candidat` — jamais exposés aux recruteurs (aucune route recruteur/admin ne les expose). `RendezVousAPIView`/`RendezVousAnnulerAPIView` scopés à `candidat=request.user`. RAS.

**Tests** : backend 338/338 ✅ (2 échecs pré-existants sans rapport avec ce chantier corrigés au passage — `test_api_marche.py` référençait encore l'ancien champ `salaires_par_secteur`, renommé `tension_par_secteur` lors de la refonte dashboard admin du 21/08 ; mis à jour vers le nouveau format), frontend 402/402 ✅ (dont le fix `GestionOffre.test.jsx` ci-dessus), `npx vite build` propre, `python manage.py check` propre, tous les nouveaux endpoints vérifiés manuellement en conditions réelles contre la base de dev (`APIClient` en shell Django).

**Non fait cette session (hors scope explicite)** : "Mes tests" (Feature 3, parké par l'utilisateur), "Compétences à développer" %, recommandations de formation externes, explication détaillée "Pourquoi ce score ?" pour le Score de profil.

---

## 🆕 SESSION 21/08/2026 (suite) — Audit + refonte tableau de bord admin & données marché

**Contexte** : demande utilisateur d'auditer et d'améliorer le tableau de bord admin ("Vue d'ensemble" + "Données marché") à la lumière de tout le chantier CMS ajouté depuis (Premium, Blog, FAQ, Compétences, Bannières) — capture d'écran fournie montrant la table "Comparaison offres publiées vs attentes candidats" avec **"N/A" sur toutes les lignes de "Moy. candidats" et "—" sur toutes les lignes d'"Écart"**.

**🐛 Bug trouvé (pas un bug de calcul — une donnée source vide)** : `AdminMarcheAPIView` (`jobs/views/admin.py`) comparait le salaire proposé par l'offre (fiable, saisi par le recruteur) au salaire **déclaré comme souhaité par le candidat** (`ProfilCandidat.salaire_souhaite`, `CharField` libre) — ce champ n'est quasiment jamais rempli en pratique (aucune pression UX ne l'impose), donc `salaires_candidats` était vide pour tous les secteurs, `moy_candidats`/`ecart` toujours `None` → "N/A"/"—" partout. Même souci sur `top_secteurs.nb_candidats`, qui comptait `ProfilCandidat.secteur_souhaite` (préférence déclarée, tout aussi rarement renseignée) — vérifié en base réelle : résultats à 0 sur la plupart des secteurs alors que des candidatures existaient bel et bien.

**Fix — remplacé par un signal toujours peuplé** : au lieu des préférences déclarées par le candidat (jamais fiables), le nouveau calcul utilise les **candidatures réellement déposées** (`Candidature.offre__specialite`), qui existent forcément dès qu'un candidat postule. Nouvelle métrique `tension_par_secteur` (remplace `salaires_par_secteur`) : `candidatures_par_offre` = nb candidatures / nb offres actives par secteur — bas (< 1) signale une pénurie de candidats face aux postes ouverts (marché candidat), élevé signale beaucoup d'intérêt par poste (marché employeur). Salaire moyen proposé conservé (fiable, colonne seule, sans fausse comparaison). `top_secteurs.nb_candidats` bascule sur le même comptage de candidatures réelles.
- Vérifié en conditions réelles (pas juste lu le code) : appel direct des 2 endpoints via `APIClient` en session Django shell contre la base de dev — `tension_par_secteur` renvoie désormais des valeurs réelles (`candidatures_par_offre: 1.7`, `2.5`, `0.0`...) au lieu de `None` partout.
- Frontend (`AdminStatistiques.jsx`) : table renommée "Tension marché par secteur", colonnes "Salaire moyen proposé" + "Candidatures / offre" (badge rouge `TrendingDown` si tension < 1, vert `TrendingUp` sinon) avec tooltip explicatif. `formatSalaire()` affiche désormais "Non renseigné" au lieu de "N/A" quand la donnée est réellement absente (plus honnête, "N/A" laissait penser à un bug plutôt qu'à une absence de saisie).

**Nouveaux KPI — Premium** (`AdminStatsAPIView`) : `premium_actifs` (`ProfilEntreprise.est_premium=True` et non expiré), `revenu_premium_estime` (somme du `PremiumPlan.prix_da` correspondant au dernier `DemandeActivationPremium.nb_mois` traité de chaque entreprise actuellement Premium — approximation assumée, pas une comptabilité exacte, n'inclut pas les paiements Chargily sans demande d'activation correspondante ; documenté via tooltip dans l'UI), `premium_expirant_bientot` (échéance ≤ 7 jours, affiché en bandeau d'alerte ambre si > 0, même style que les alertes existantes offres/entreprises en attente).

**Nouveaux KPI — Contenu du site (CMS)** : `nb_articles_publies`/`nb_articles_brouillons`, `nb_faq_actives`, `nb_competences_referentiel`, `nb_bannieres_actives` — aucun de ces 5 chantiers CMS récents n'avait la moindre visibilité sur le tableau de bord jusqu'ici (confirmé par audit : zéro occurrence de `Article`/`FaqItem`/`CompetenceReferentiel`/`BanniereAccueil` dans `AdminStatsAPIView`/`AdminMarcheAPIView` avant cette session).

**Décision produit — pas de KPI pour Journal d'audit / Erreurs système / Comptes admins / Référentiel métiers** : ces sections ont déjà leur propre page dédiée avec les vrais chiffres à jour en temps réel (pas de valeur ajoutée à dupliquer un compteur figé sur le dashboard) — contrairement à Premium/CMS qui n'avaient absolument aucune surface de visibilité ailleurs.

**Audit sécurité** : aucun nouvel endpoint créé, uniquement des champs supplémentaires sur `AdminStatsAPIView`/`AdminMarcheAPIView` déjà `IsAdminUser` + vérif rôle. Aucune donnée sensible exposée (agrégats/comptages uniquement, pas de données nominatives). RAS.

**Tests** : `AdminStatistiques.test.jsx` 4/4 ✅ (aucune modification nécessaire — ne couvrait pas la table détaillée), frontend 402/402 ✅, `npx vite build` propre, `python manage.py check` propre, backend relancé.

---

## 🆕 SESSION 21/08/2026 — Prompts IA éditables + vérification anti-erreur (panel "Configuration IA")

**Contexte** : le panel "Configuration IA" (session 20/08/2026) permettait déjà de couper une fonctionnalité IA ou d'ajuster son `max_tokens`, mais pas de modifier le **texte du prompt** envoyé à Groq/Ollama — ceux-ci restaient codés en dur dans `cv_parser.py`/`jobs/views/ia.py`. Demande utilisateur : rendre les 4 prompts éditables depuis ce même panel, **avec une vérification pour éviter qu'une modification erronée casse silencieusement une fonctionnalité**.

**Backend — 4 nouveaux champs `TextField` sur `AIConfig`** (migration `0074` + backfill `0075`) : `parser_cv_prompt`, `analyse_carriere_prompt`, `analyse_recruteur_prompt`, `generation_offre_prompt`, tous `blank=True`. **Comportement de repli si vide** : chaque appelant fait `ai_config.xxx_prompt or DEFAULT_PROMPT_XXX` — un champ vidé (volontairement ou par erreur) ne casse jamais rien, il retombe sur le prompt d'origine codé en dur, jamais un appel Groq avec un prompt vide.
- Les 3 prompts de `jobs/views/ia.py` (analyse carrière, analyse recruteur, génération d'offre) étaient des f-strings Python — **convertis en constantes de gabarit avec jetons `{nom}` substitués via `.replace()`** (même mécanisme déjà en place pour `PROMPT_CV_COMPLET`/`{cv_text}`/`{domaines_list}` dans `cv_parser.py`, juste étendu aux 3 autres). Nécessaire car un prompt chargé depuis la base à l'exécution ne peut pas être un f-string littéral.
- `DEFAULT_PROMPT_ANALYSE_CARRIERE`/`DEFAULT_PROMPT_ANALYSE_RECRUTEUR`/`DEFAULT_PROMPT_GENERATION_OFFRE` : nouvelles constantes module-level en haut de `jobs/views/ia.py`, texte identique à l'ancien prompt en dur (aucun changement de comportement par défaut).
- **Migration de backfill (`0075`) : texte dupliqué en dur dans le fichier de migration**, pas d'import de `jobs.views.ia`/`jobs.cv_parser` — décision technique volontaire : une migration doit rester un instantané figé, indépendant d'une future modification des constantes `DEFAULT_PROMPT_*` dans le code applicatif (sinon rejouer cette migration sur un nouvel environnement plus tard backfillerait avec un texte différent de celui réellement utilisé au moment de l'écriture).
- Vérifié en conditions réelles (pas juste lu le code) : `AIConfig.get_solo().parser_cv_prompt` non vide après migration (3520 caractères), substitution `.replace()` fonctionne bout-en-bout sur un exemple concret (`generation_offre`), schéma JSON de sortie toujours intact après substitution.

**Frontend (`AdminIAConfig.jsx`)** :
- Chaque carte fonctionnalité a désormais un bloc "Prompt IA" repliable (`<textarea>` monospace 10 lignes) + rappel des variables obligatoires à ne pas supprimer (badges au-dessus du textarea).
- **Vérification anti-erreur avant sauvegarde** (la demande explicite de l'utilisateur) : si un prompt **non vide** ne contient plus l'une de ses variables obligatoires, `toast.error` bloquant nommant précisément la/les variable(s) manquante(s) par fonctionnalité — la sauvegarde est refusée tant que ce n'est pas corrigé. Un prompt **vide** ne déclenche jamais cette alerte (repli naturel sur le défaut backend, cas valide).
- **Confirmation avant application** : `confirmToast()` (utilitaire déjà standard du projet, remplace `window.confirm`) — "Enregistrer la configuration IA ? Ces changements affectent immédiatement le comportement de l'IA sur tout le site, pour tous les utilisateurs." Le bouton "Enregistrer" n'appelle plus `updateAIConfig` directement, seulement après confirmation.
- **Audit sécurité** : aucun nouvel endpoint (même `AIConfigAdminAPIView`, `IsAdminUser` + vérif rôle déjà en place, juste 4 champs de plus dans le serializer déjà `IsAdminUser`-only). RAS.

**Tests** : `AdminIAConfig.test.jsx` (7/7, 3 tests mis à jour pour rendre `<ConfirmModalHost />` et cliquer "Confirmer" après "Enregistrer" — pattern déjà standard du projet pour tout composant utilisant `confirmToast`), frontend 402/402 ✅, `npx vite build` propre, `python manage.py check` propre.

---

## 🆕 SESSION 20/08/2026 — CMS "Prix / Abonnements / Avantages Premium" (autonomie éditoriale)

**Contexte** : l'employeur veut gérer sans intervention technique — prix, abonnements, avantages, FAQ, secteurs, métiers, compétences, articles, bannières, pages du site, plus un futur contrôle des paramètres IA. Chantier découpé en sous-projets indépendants (brainstormé via skill dédié, spec dans `docs/superpowers/specs/2026-08-20-premium-plans-cms-design.md`) — celui-ci couvre le premier : **Prix / Abonnements / Avantages Premium**. Les sous-projets FAQ/Secteurs-Métiers-Compétences/Articles/Bannières/Pages/Contrôle IA restent à faire, chacun sera brainstormé séparément le moment venu.

**Constat clé avant tout code** : le prix Premium était dupliqué en 3 endroits — `PremiumPage.jsx` (affichage), `recruteur.py::_get_prix_premium` (montant **réellement facturé** via Chargily), et une 3ᵉ formule en dur dans l'email de reçu manuel. Un futur panel qui n'aurait changé que l'affichage frontend aurait laissé le vrai montant facturé inchangé — le backend devait devenir la source de vérité unique en premier.

**Nouveaux modèles** (`jobs/models.py`, migration `0061` + backfill `0062`) : `PremiumPlan` (`nb_mois` unique, `label`, `prix_da` — **montant final saisi directement**, pas de formule prix-mensuel×remise, décision utilisateur pour rester simple à éditer sans "comprendre" un calcul caché ; `populaire`, `actif`, `ordre`) et `PremiumAvantage` (`icone` — `choices` whitelist de ~20 noms lucide-react déjà utilisés dans le projet, jamais de texte libre ; `titre`, `description`, `ordre`, `actif`). Durées d'abonnement **totalement libres** (pas 4 paliers figés dans le code) — décision utilisateur, l'admin peut ajouter/retirer des paliers à volonté. Migration de backfill peuple automatiquement les 4 paliers (1/3/6/12 mois → 2000/6000/11040/19920 DA) et les 6 avantages déjà en dur — bascule invisible pour les recruteurs au déploiement.

**Backend** — nouveau `jobs/views/premium_admin.py` : 2 GET publics (`PremiumPlansPublicAPIView`/`PremiumAvantagesPublicAPIView`, `AllowAny` + `PublicReadThrottle`, cache 1h pattern `jobs_constants`) et 2 CRUD admin (`PremiumPlansAdminAPIView`/`PremiumAvantagesAdminAPIView`, `IsAdminUser`, même style GET/POST/PUT/DELETE combiné que `MetierReferentielAdminAPIView`). `_get_prix_premium()` renommé `_get_plan_premium()` et lit désormais `PremiumPlan.objects.filter(nb_mois=nb_mois, actif=True)` — `ChargilyCheckoutAPIView` **rejette** (400) tout `nb_mois` ne correspondant à aucun palier actif au lieu de l'ancien `max(1, min(nb_mois, 12))` qui acceptait n'importe quelle valeur dans une plage fixe. Les 2 autres usages du prix (`EnvoyerRecuPremiumAPIView`, `AdminDemandesPremiumAPIView`) lisent la même source. Plafonds `nb_mois` élargis de 12 à 60 mois (webhook Chargily, demande manuelle, activation admin) — filet de sécurité générique, plus lié à l'ancien jeu de paliers figés puisque les durées sont maintenant libres.

**Frontend** : `PremiumPage.jsx` — `DUREES`/`PRIX_MENSUEL`/`getPrix()`/`AVANTAGES_DETAILLES` (en dur) supprimés, remplacés par un fetch des 2 GET publics au montage (`jobsService.getPremiumPlans()`/`getPremiumAvantages()`, cache module-level, pattern `getNomenclature()`). `PREMIUM_ICON_MAP` exporté depuis ce fichier (nom d'icône stocké en base → composant lucide-react réel) et réimporté par `AdminPremium.jsx` pour peupler le `<select>` d'icônes — un seul endroit à maintenir si une icône est ajoutée/retirée. "Économies"/remise recalculées dynamiquement par rapport au palier le plus court (pas de prix mensuel global fixe, cohérent avec des durées libres).

**Nouveau panel admin `Pages/Admin/AdminPremium.jsx`** (route `/admin-taftech/premium-config`, entrée sidebar section "Système") — 2 onglets internes (pattern `ParametresRecruteur.jsx`) : "Abonnements" (tableau paliers, CRUD) et "Avantages" (liste cartes, select icône whitelist). Pas de drag&drop pour réordonner (champ `ordre` numérique manuel) — cohérent avec le reste de l'admin qui n'a de DnD nulle part.

**Audit sécurité** : endpoints admin `IsAdminUser` (pattern standard du projet) ; icônes contraintes par `choices` Django (élimine tout risque d'injection de nom de composant) ; `nb_mois` validé contre les paliers actifs en base côté Chargily (whitelist stricte, remplace un range arbitraire) ; pas de FK entre `PremiumPlan`/historique (`Candidature`, `ProfilEntreprise.premium_nb_mois` restent des snapshots figés à l'achat, cohérent avec le principe déjà appliqué ailleurs) — supprimer/désactiver un palier n'affecte jamais l'historique déjà facturé.

**Tests** : backend 281/281 ✅ (1 flaky préexistant `test_log_ordering_desc`, sans rapport, confirmé en isolation), `AdminPremium.test.jsx` (10/10, nouveau) + `PremiumPage.test.jsx` (7/7, nouveau — n'existait pas avant cette session malgré une mention dans une session précédente de ce fichier), `npx vite build` propre, `python manage.py check` propre.

**Suite (même session) — sous-projet 2 : FAQ** — 3 listes FAQ en dur découvertes (`ContactezNous.jsx` public général, `LandingRecruteur.jsx` landing recruteur, `PremiumPage.jsx` page Premium), chacune avec un nom de champ différent (`a`/`r`/`r`). Décision utilisateur : **un seul modèle avec catégorie** plutôt que 3 modèles séparés — un admin gère tout au même endroit, chaque page ne consomme que sa catégorie.

- **Nouveau modèle `FaqItem`** (`jobs/models.py`, migration `0063` + backfill `0064` peuplant les 14 questions existantes) : `categorie` (choix `GENERAL`/`RECRUTEUR`/`PREMIUM`), `question`, `reponse` (`TextField`, pas de limite de taille contrairement aux champs courts de `PremiumAvantage`), `ordre`, `actif`.
- **Backend** : `FaqPublicAPIView` (`GET jobs/faq/?categorie=X`, `AllowAny` + `PublicReadThrottle`, cache 1h par catégorie — clé `jobs_faq_<CATEGORIE>`) et `FaqAdminAPIView` (CRUD complet toutes catégories confondues, `IsAdminUser`, même style GET/POST/PUT/DELETE que les autres vues admin de ce chantier). Invalidation cache sur write — sur `PUT`, invalide **les deux** clés (ancienne ET nouvelle catégorie) au cas où l'admin change la catégorie d'une question existante.
- **Frontend** : `jobsService.getFaq(categorie)` — cache module-level **par catégorie** (objet `_faqCacheParCategorie`, pas une seule variable comme `getNomenclature`/`getPremiumPlans` — 3 catégories indépendantes ne doivent pas partager un seul cache). Les 3 pages consommatrices remplacent leur `const FAQ = [...]`/`const FAQ_ITEMS = [...]` en dur par un fetch au montage ; le state d'accordéon ouvert (`faqOpen`/`openFaq`) passe d'un index de tableau à `item.id` (plus robuste si l'ordre change côté admin).
- **Nouveau panel admin `Pages/Admin/AdminFaq.jsx`** (route `/admin-taftech/faq`) — liste unique avec chips de filtre par catégorie (Toutes/Général/Recruteur/Premium) au-dessus du tableau, CRUD modal identique au pattern déjà établi (`AdminPremium.jsx`).
- **🐛 Piège trouvé en testant** : l'ajout de l'appel `jobsService.getFaq()` dans le `Promise.all` de chargement de `PremiumPage.jsx` a fait échouer silencieusement `PremiumPage.test.jsx` (écrit à la session précédente) — le mock du test ne définissait pas `getFaq`, donc `jobsService.getFaq is not a function` rejetait tout le `Promise.all` et aucun palier/avantage ne s'affichait, malgré des mocks corrects pour les autres appels. Rappel : chaque nouvel appel `jobsService.*` ajouté à une page déjà testée doit être ajouté au mock du test correspondant, sinon échec silencieux (pas une erreur de compilation).
- **Audit sécurité** : endpoints admin `IsAdminUser` (pattern standard) ; lecture publique déjà scopée par catégorie côté serveur (le frontend ne peut pas demander "toutes les catégories" via l'API publique, seul `FaqAdminAPIView` — protégé — expose tout). RAS.

**Tests** : backend 281/281 ✅, frontend 352/352 ✅ (dont `AdminFaq.test.jsx` 7/7, nouveau), `npx vite build` propre.

**Suite (même session) — sous-projet 3 : Compétences** — contrairement à secteurs/métiers, `ProfilCandidat.competences`/`OffreEmploi.competences` sont des `TextField` libres sans aucun référentiel structuré. **Clarifié avec l'utilisateur avant de coder** : transformer ce champ en relation structurée obligatoire aurait été un gros refactor (matcher.py, tous les formulaires, migration de données candidats/offres déjà en base) pour un bénéfice incertain — décision : rester sur du texte libre partout, ajouter seulement un **référentiel de suggestions/autocomplete**, zéro impact sur le matching existant.

- **Nouveau modèle `CompetenceReferentiel`** (`label` unique, `actif`) — migration `0065` + seed `0066` (~40 compétences de démarrage génériques FR marché algérien : bureautique, soft skills, langues, quelques technos/métiers) pour que l'autocomplete ne soit pas vide au lancement.
- **Backend** : `CompetencesAutocompleteAPIView` (`GET jobs/competences/?search=X`, `AllowAny` + `PublicReadThrottle`, limite 15 résultats, pas de cache car dépend de la recherche) et `CompetencesAdminAPIView` (CRUD + `?search=` pour filtrer, `IsAdminUser`, même pattern GET/POST/PUT/DELETE que `MetierReferentielAdminAPIView`).
- **Nouveau panel admin `Pages/Admin/AdminCompetences.jsx`** (route `/admin-taftech/competences`) — liste + recherche debounce 400ms (pattern `AdminMetiers.jsx`), CRUD modal minimal (juste `label` + toggle "Suggérée").
- **Autocomplete branché sur le profil candidat uniquement** (`ProfilCandidat/index.jsx`, champ tag "Compétences") — pas sur le textarea compétences de `CreateJob.jsx` côté recruteur : ce dernier est un texte multi-lignes généré par l'IA (`GenererOffreIAAPIView`), format différent du tag-input candidat, ajouter une autocomplete dessus aurait demandé de changer sa structure entière pour une valeur ajoutée faible. `useProfilCandidat.js` expose `handleCompetenceInputChange`/`competenceSuggestions`/`showCompetenceSuggestions` — même pattern que `handleTitreProChange`/`titreSuggestions` déjà existant pour l'autocomplete du titre professionnel (réutilise les tokens `tw.autocompleteDropdown`/`tw.autocompleteItem`).
- **Audit sécurité** : endpoints admin `IsAdminUser` ; l'autocomplete publique ne retourne que les compétences `actif=True` (un admin peut désactiver une suggestion embarrassante/obsolète sans la supprimer). RAS — aucune donnée sensible, champ candidat toujours en texte libre non contraint.

**Tests** : backend 281/281 ✅, frontend 352/352 ✅ (pas de nouveau fichier de test dédié — CRUD identique au pattern déjà couvert par `AdminMetiers.test.jsx`, aucun test existant n'interagit avec le champ compétences candidat donc aucune régression possible), `npx vite build` propre.

**Suite (même session) — sous-projet 4 : Blog/Articles** — le plus gros morceau du chantier CMS, seul sous-projet qui a nécessité un vrai brainstorm complet (nouveau type de contenu, pas une extension d'un pattern existant). 3 décisions validées avec l'utilisateur avant de coder : éditeur **texte riche WYSIWYG** (pas Markdown/texte brut), librairie **TipTap**, et **sanitization HTML côté backend** en défense en profondeur même si seul ADMIN écrit aujourd'hui.

- **Nouvelle dépendance backend `bleach==6.4.0`** (+ `webencodings` transitive) — sanitize `Article.contenu_html` dans `Article.save()` : whitelist stricte de balises (p, h1-h3, strong/em/u/s, ul/ol/li, a, img, blockquote, br) et attributs (`a`: href/title/target/rel, `img`: src/alt). Le HTML est ensuite injecté tel quel côté frontend (`dangerouslySetInnerHTML`) — sans ce filtre, un compte admin compromis ou un futur rôle éditeur moins fiable pourrait injecter du JS exécuté chez tout visiteur du blog.
- **Nouveaux modèles** (`jobs/models.py`, migration `0067`) : `ArticleCategorie` (label unique — catégories **librement créées par l'admin**, contrairement aux catégories fixes de `FaqItem`, car les sujets de blog évoluent et ne rentrent pas dans un enum figé) et `Article` (titre, `slug` auto-généré unique — pattern `ProfilEntreprise.save()`, `categorie` FK nullable `SET_NULL`, `extrait` — sert à la fois d'aperçu liste ET de meta description SEO, `contenu_html`, `image_couverture` optionnelle, `statut` BROUILLON/PUBLIE, `date_publication` renseignée automatiquement au premier passage à PUBLIE).
- **Backend** (`jobs/views/articles.py`, nouveau fichier) : lecture publique (`ArticleListPublicAPIView` paginé 9/page + filtre `?categorie=`, `ArticleDetailPublicAPIView` par slug, `ArticleCategoriesPublicAPIView` — ne retourne que les catégories utilisées par au moins un article **publié**, pas toutes les catégories créées) et CRUD admin (`ArticleAdminAPIView`/`ArticleAdminDetailAPIView` — vue détail séparée de la liste car la liste utilise `ArticleListSerializer` allégé sans `contenu_html`, `ArticleCategoriesAdminAPIView`). Toutes les vues d'écriture en `MultiPartParser` (upload image de couverture).
- **`sitemap.xml`** étendu (`jobs/seo_views.py`) : articles publiés ajoutés automatiquement (`/blog/<slug>/`), `/blog` ajouté aux `STATIC_PATHS`.
- **Nouveau composant réutilisable `Components/RichTextEditor.jsx`** — wrapper TipTap (`@tiptap/react` + `starter-kit` + `extension-link` + `extension-image`, nouvelles dépendances frontend), toolbar minimale (gras/italique/H2/H3/listes/citation/lien), sortie HTML brute passée au parent via `onChange`. **`@tailwindcss/typography`** ajouté (nouveau plugin Tailwind, `tailwind.config.js` — import ESM `import typography from '@tailwindcss/typography'`, pas `require()` qui casserait le fichier ESM) pour les classes `prose` de mise en forme du contenu affiché.
- **Panel admin `Pages/Admin/AdminArticles.jsx`** — pattern différent des CRUD précédents : pas de modale (l'éditeur a besoin de place), un état interne `vue` ("liste"/"form") bascule l'affichage dans la même page plutôt que d'ajouter des routes `/nouveau`/`/:id/modifier` — plus simple, cohérent avec le niveau d'outillage du reste de l'admin.
- **2 nouvelles pages publiques** : `Pages/Public/Blog.jsx` (`/blog`, grille de cartes + filtre catégorie + pagination) et `Pages/Public/ArticleDetail.jsx` (`/blog/:slug`, `<Seo>` avec `extrait` comme meta description et image de couverture comme OG image, contenu rendu via `dangerouslySetInnerHTML` + classes `prose`). Lien "Blog" ajouté aux deux footers (candidat teal, recruteur indigo).
- **Sécurité** : endpoints admin `IsAdminUser`, lecture publique ne retourne jamais un brouillon (`statut='PUBLIE'` filtré côté serveur, pas côté client), upload image validé par magic bytes + taille (pattern `jobs/validators.py` déjà en place), sanitization HTML détaillée ci-dessus.

**Tests** : backend 281/281 ✅, frontend 360/360 ✅ (dont `AdminArticles.test.jsx` 8/8, nouveau — `RichTextEditor` mocké en `<textarea>` dans le test car TipTap/ProseMirror dépend d'APIs DOM que jsdom ne fournit pas complètement), `npx vite build` propre (chunk `AdminArticles` ~415 Ko à cause de TipTap, mais lazy-loadé uniquement pour la page admin — aucun impact sur le bundle public).

**Suite (même session) — sous-projet 5 : Bannières** — le terme était ambigu (banner promotionnel type e-commerce ? bandeau d'annonce ? bannière de page entreprise, déjà existante via `ProfilEntreprise.banniere` — pas ça) : clarifié avec l'utilisateur, **les deux** : un bandeau d'annonce texte global + un carrousel d'images promotionnelles sur l'accueil, deux besoins distincts.

- **`SiteAnnonce`** (`jobs/models.py`, migration `0068`) : `texte`, `lien_url`/`lien_label` optionnels, `type_annonce` (INFO/WARNING/SUCCESS), `actif`. **Une seule annonce active à la fois** — `save()` désactive automatiquement toutes les autres quand une nouvelle est activée (`SiteAnnonce.objects.exclude(pk=self.pk).update(actif=False)`), pas de contrainte DB `unique` sur `actif=True` (SQLite/Postgres ne le permettent pas nativement sur un booléen simple sans index partiel) — logique applicative suffisante ici, un seul admin à la fois de toute façon.
- **`BanniereAccueil`** (image, titre optionnel, lien optionnel, ordre, actif) — plusieurs bannières actives possibles (carrousel), décision utilisateur plutôt qu'une image fixe unique, pour permettre d'alterner plusieurs promos sans réédition manuelle à chaque fois.
- **Backend** (`jobs/views/banners.py`) : lecture publique avec cache (`SiteAnnoncePublicAPIView` — `204 No Content` si aucune annonce active, pas un objet vide, pour que le frontend distingue "pas encore chargé" de "rien à afficher" ; `BanniereAccueilPublicAPIView`, filtré `actif=True`, trié par `ordre`) + CRUD admin classique.
- **`Components/SiteAnnonceBar.jsx`** — monté une seule fois dans `App.jsx` juste avant la navbar (masqué sur les routes `/admin-taftech` — pas pertinent pour l'admin qui gère justement ce contenu), pas par page. Dismissable en **`sessionStorage`** (pas `localStorage` comme `InfoBanner.jsx`) — le contenu de l'annonce change dans le temps contrôlé par l'admin, un `localStorage` aurait caché indéfiniment les futures annonces après la première fermeture par l'utilisateur.
- **`Components/BanniereCarousel.jsx`** — intégré sur `Home.jsx` uniquement (entre la section offres récentes et "Pourquoi TafTech"), défilement auto 6s avec pause au survol, ne rend rien si aucune bannière active (pas de placeholder vide qui casserait la mise en page).
- **Panel admin `Pages/Admin/AdminBannieres.jsx`** — 2 onglets (pattern déjà établi `AdminPremium.jsx`/`AdminFaq.jsx`) : "Bandeau d'annonce" (tableau) et "Carrousel accueil" (grille de vignettes avec image, plus adapté visuellement qu'un tableau pour du contenu image).
- **🐛 Piège récurrent (3ᵉ fois cette session) confirmé en testant** : ajouter `BanniereCarousel` dans `Home.jsx` a cassé silencieusement `Home.test.jsx` (4/4 échecs) — le mock `jobsService` du test ne définissait pas `getBannieresAccueil`, provoquant un rejet non géré dans le composant. Fix : ajout de `getBannieresAccueil: vi.fn().mockResolvedValue([])` au mock. **Leçon confirmée à nouveau** : tout nouvel appel `jobsService.*` ajouté à un composant déjà couvert par un test doit être répercuté dans le mock de ce test — vérifié aussi qu'aucun test ne rend `App.jsx` en entier avec un mock `jobsService` incomplet qui aurait pu être affecté par `SiteAnnonceBar`.
- **Audit sécurité** : endpoints admin `IsAdminUser`, upload image validé par magic bytes + taille (5 Mo, pattern `banniere`/`logo` de `ProfilEntreprise`), lecture publique ne filtre que sur `actif=True` côté serveur.

**Tests** : backend 281/281 ✅, frontend 360/360 ✅ (`Home.test.jsx` corrigé, pas de nouveau fichier de test dédié pour `AdminBannieres.jsx`/`SiteAnnonceBar.jsx`/`BanniereCarousel.jsx` — CRUD identique au pattern déjà couvert ailleurs), `npx vite build` propre.

**Suite (même session) — sous-projet 6 : Pages du site** — dernier sous-projet de contenu du chantier CMS (reste "Contrôle des paramètres IA", de nature différente — pas du contenu éditorial). 3 pages existaient déjà en JSX en dur (`CGU.jsx`, `PolitiqueConfidentialite.jsx`, `QuiSommesNous.jsx`) ; CGU/Confidentialité avaient un sommaire structuré par sections, Qui-sommes-nous affichait des stats en direct (pas du contenu éditorial pur). **Décision utilisateur validée avant de coder** : convertir les 3 en CMS, en acceptant explicitement de perdre le sommaire sticky/les cartes à icônes structurées au profit de texte riche libre — sauf les stats live et le hero/CTA de Qui-sommes-nous qui **restent en code** (ce sont des widgets fonctionnels, pas de l'éditorial).

- **Nouveau modèle `PageStatique`** (`jobs/models.py`, migration `0069` + seed `0070`) : `slug` unique, `titre`, `contenu_html` (même sanitization bleach que `Article`). Migration de données porte le **texte** des 3 pages existantes en HTML équivalent (titres H2, listes, gras) — la mise en forme spécifique (cartes à icônes, grilles, sommaire sticky) n'est **pas** reproduite, remplacée par du texte riche simple, conformément à la décision validée.
- **Backend** (`jobs/views/pages.py`) : `PageStatiquePublicAPIView` (`GET jobs/pages/<slug>/`, cache 1h par slug) + CRUD admin `PageStatiqueAdminAPIView`.
- **Frontend** : nouveau composant générique `Pages/Public/PageStatiqueGenerique.jsx` — sert `/cgu` et `/confidentialite` (prop `slugFixe`) **et** une nouvelle route catch-all `/pages/:slug` pour toute page libre créée par l'admin en plus des 3 existantes. **`CGU.jsx` et `PolitiqueConfidentialite.jsx` supprimés** (plus de duplication de logique, entièrement remplacés — aucun test existant n'y faisait référence, vérifié avant suppression).
- **`QuiSommesNous.jsx`** : sections "Mission"/"Valeurs"/"Services" (listes `VALEURS`/`SERVICES` en dur + rendu en grille de cartes) supprimées, remplacées par un seul bloc `dangerouslySetInnerHTML` fetché via `getPageStatique("qui-sommes-nous")`. Hero, bloc "TafTech en chiffres" (stats live `jobs/stats/public/`) et CTA final **inchangés** — toujours en code, toujours fonctionnels.
- **Panel admin `Pages/Admin/AdminPages.jsx`** — même pattern "vue liste/form" que `AdminArticles.jsx` (réutilise `RichTextEditor.jsx`, maintenant partagé entre les deux, code-splitté dans son propre chunk par Vite). Les 3 pages système (`cgu`/`confidentialite`/`qui-sommes-nous`) ont leur bouton de suppression masqué (`PAGES_FIXES` côté frontend uniquement — pas de contrainte backend équivalente, un admin pourrait forcer la suppression via l'API directement, jugé acceptable car réservé au rôle ADMIN de toute façon) et leur champ slug verrouillé en édition.
- **Audit sécurité** : endpoints admin `IsAdminUser`, sanitization HTML identique à `Article` (bleach), pas de nouvelle surface d'attaque.

**Tests** : backend 281/281 ✅ (1 flaky préexistant `test_log_ordering_desc`, confirmé sans rapport en isolation), frontend 360/360 ✅ (aucune régression malgré la suppression de 2 fichiers), `npx vite build` propre.

**Suite (même session) — sous-projet 7 (dernier) : Configuration IA** — clarifié en tout début de chantier (voir plus bas) : "Intelligence artificielle" ne voulait pas dire génération de contenu, mais contrôle des paramètres IA du site. Contexte concret qui justifie ce sous-projet : Groq a déjà changé de modèle disponible sans préavis une fois cette année (session 18/08/2026, cf. section "MODÈLES GROQ DÉPRÉCIÉS"), cassant silencieusement 4 fonctionnalités IA d'un coup, découvert seulement en testant manuellement. Un panel admin pour changer le modèle et couper une fonctionnalité en panne sans déploiement répond directement à ce risque déjà vécu, pas à un besoin hypothétique.

- **Nouveau modèle singleton `AIConfig`** (`jobs/models.py`, migration `0071`, pattern `get_or_create(pk=1)` + cache 5 min invalidé au `save()` — même esprit que les autres configs de ce chantier mais une seule ligne, pas une liste) : `groq_model` (texte libre, **pas de `choices` figé** — un enum se serait retrouvé obsolète à la prochaine dépréciation Groq, exactement le problème vécu), `temperature`, `reasoning_effort` (low/medium/high), puis pour chacune des 4 fonctionnalités Groq réelles du site (`parser_cv`, `analyse_carriere`, `analyse_recruteur`, `generation_offre`) : un toggle `_actif` (kill-switch, 503 explicite si désactivé) et un `_max_tokens` dédié (**pas un plafond global** — les 4 valeurs actuelles vont de 400 à 6000 tokens, calibrées précisément par fonctionnalité ; un seul champ partagé aurait cassé le format JSON attendu de certains appels si réglé trop bas pour d'autres — clarifié avec l'utilisateur avant de coder).
- **Anticipation migration Ollama (précision apportée par l'utilisateur en cours de session)** : champ `provider` (GROQ/OLLAMA) + `ollama_model` ajoutés au modèle dès maintenant — la dépendance `ollama` est déjà dans `requirements.txt` mais **aucune intégration n'est câblée** (tâche explicitement reportée post-déploiement dans ce même fichier, section "TÂCHES REPORTÉES"). Choisir OLLAMA dans le panel n'a donc aucun effet pour l'instant, un commentaire dans le code et un libellé "(pas encore actif)" côté UI le précisent — objectif : que la vraie migration future soit un simple câblage, pas un redesign du modèle de config.
- **Backend** : `_call_groq()` (`cv_parser.py`, utilisé aussi par `domaine_agent.py` sans changement nécessaire — appel centralisé) et `_appel_groq()` (`jobs/views/ia.py`) lisent désormais `AIConfig.get_solo()` au lieu des constantes `GROQ_MODEL`/`reasoning_effort="low"` en dur. `GenererOffreIAAPIView` (appel Groq direct, **volontairement pas via `_appel_groq()`** — décision déjà actée : cette fonction strip les `*` qui corrompent le JSON attendu) lit la config directement dans son propre appel `requests.post()`. Chacune des 4 vues consommant Groq vérifie son toggle `_actif` en tout début de `post()`/`get()`, retourne 503 avec message explicite si désactivée — pas de dégradation silencieuse vers un comportement différent.
- **Panel admin `Pages/Admin/AdminIAConfig.jsx`** — formulaire simple (pas de liste/CRUD, un seul enregistrement) : bloc fournisseur/modèle/température/reasoning en premier avec bandeau d'avertissement rappelant l'incident Groq déjà vécu, puis 4 cartes fonctionnalité (toggle + max_tokens) avec description de ce que fait réellement chacune côté produit.
- **Audit sécurité** : `IsAdminUser` sur l'unique endpoint (`GET`/`PUT` seulement, pas de `POST`/`DELETE` — cohérent avec le pattern singleton, aucune création/suppression possible). Aucune donnée sensible exposée (le endpoint ne retourne jamais `GROQ_API_KEY`, uniquement le nom du modèle et les toggles).

**Tests** : backend 281/281 ✅ (même flaky préexistant confirmé sans rapport), frontend 360/360 ✅, `npx vite build` propre, `python manage.py check` propre.

---

## 🆕 SESSION 20/08/2026 (suite) — Abstraction moteur IA réelle + audit complet + couverture de tests exhaustive du chantier CMS

**Contexte** : après le sous-projet "Configuration IA" ci-dessus, retour client (transmis par l'utilisateur) : le client veut que l'architecture permette de **remplacer facilement le moteur IA plus tard sans reconstruire la plateforme**, et que les futurs modules puissent s'ajouter sans remettre en cause l'existant. Constat honnête fait à l'utilisateur avant de coder : `AIConfig.provider` (GROQ/OLLAMA) existait déjà mais n'avait **aucun effet réel** — Groq restait appelé en dur à 3 endroits (`cv_parser.py`, `jobs/views/ia.py` ×2). C'était une promesse non tenue, corrigée dans cette session. Le deuxième point (modules futurs sans casser l'existant) était déjà globalement acquis — le chantier CMS venait justement de valider ce pattern 7 fois de suite sans jamais toucher au code d'un module en construisant le suivant.

### Abstraction du moteur IA — `jobs/ai_engine.py` (nouveau fichier)

Point d'entrée unique `call_ai(messages, max_tokens, temperature=None, response_format=None, timeout=25)` qui dispatch vers Groq ou Ollama selon `AIConfig.get_solo().provider` — **plus aucun appel Groq en dur dans le code applicatif**, seulement dans ce fichier.

- `cv_parser.py::_call_groq()` (nom conservé — importé par `domaine_agent.py`) délègue maintenant à `call_ai()`. Le client Groq bas niveau (`get_groq_client()`, `GROQ_MODEL`, `GROQ_TIMEOUT`) et l'import `from groq import Groq` sont **supprimés** de ce fichier (code mort après la délégation).
- `jobs/views/ia.py::_appel_groq()` (nom conservé — nombreux appelants existants) délègue à `call_ai()` puis applique le strip markdown (`**`/`##`/`*`) qu'il faisait déjà — **ne jamais l'utiliser pour un appel attendant du JSON strict** (documenté en docstring), c'est pour ça que `GenererOffreIAAPIView` appelle `call_ai()` directement avec `response_format={'type': 'json_object'}` plutôt que de passer par `_appel_groq()`. `import requests as req` supprimé de `ia.py` (devenu mort, tous les appels HTTP bruts sont passés par `ai_engine`).
- **Branche Ollama** (`_call_ollama()`) : implémentée avec la lib `ollama` (déjà en dépendance) — `ollama.chat(model=..., messages=..., options={"temperature":..., "num_predict":...})`. **⚠️ Non validée en conditions réelles** — aucun serveur Ollama local disponible dans cet environnement de dev pour tester contre un vrai serveur. Le code est écrit et suit l'API documentée d'`ollama-python`, mais à vérifier avec `ollama serve` avant tout usage prod. L'import `import ollama` est fait au niveau module (pas local à la fonction) exprès — nécessaire pour pouvoir le mocker proprement dans les tests (`@patch("jobs.ai_engine.ollama")`), et vérifié que l'import seul ne tente aucune connexion réseau (juste le chargement du client HTTP paresseux).
- **Bascule Groq→Ollama = un changement de config admin**, plus un futur chantier de refactor — c'est exactement la garantie demandée par le client.

### Audit complet — 3 corrections apportées

1. **`SiteAnnonce.save()` non atomique** : la désactivation des autres annonces (`SiteAnnonce.objects.exclude(pk=self.pk).update(actif=False)`) se faisait après le `super().save()` sans transaction — sous écriture concurrente (peu probable avec un seul admin, mais incorrect par principe), une lecture pourrait voir 2 annonces actives entre les deux opérations. Enveloppé dans `transaction.atomic()`.
2. **`PremiumPlan.prix_da`/`nb_mois` acceptaient 0 côté backend** — seul le frontend (`AdminPremium.jsx`) bloquait un prix à 0 DA. Un appel API direct (bypass du frontend, ou futur bug) aurait pu créer un palier Premium **gratuit**, avec un montant de 0 DA réellement envoyé à Chargily. Ajout de `MinValueValidator(1)` sur les deux champs (migration `0073`).
3. **`AIConfig.temperature`/`*_max_tokens` sans bornes** — un admin aurait pu saisir `temperature=99` (rejeté par l'API Groq avec une erreur peu claire) ou `max_tokens=1` (réponse tronquée avant même le raisonnement du modèle — piège déjà documenté dans ce fichier pour les modèles "reasoning"). Ajout de `MinValueValidator`/`MaxValueValidator` (temperature 0-2, max_tokens ≥100), et alignement des bornes HTML `min`/`max` côté `AdminIAConfig.jsx`.

**Vérifié sans anomalie** : tous les endpoints admin des 7 sous-projets CMS ont un check `role == 'ADMIN'` explicite dans **chaque** méthode (comptage croisé public/admin methods vs occurrences du check — correspondance exacte partout) ; aucun hardcodage résiduel de `'openai/gpt-oss-20b'` ou `reasoning_effort='low'` en dehors de la valeur par défaut du modèle `AIConfig` ; aucun endpoint admin ne fuit `GROQ_API_KEY`.

### Couverture de tests exhaustive du chantier CMS (zéro test avant cette session pour la plupart)

- **Backend** : `jobs/tests/test_api_cms.py` (nouveau, 51 tests) — CRUD admin + lecture publique + permissions + validateurs pour les 7 sous-projets (PremiumPlan/PremiumAvantage, FAQ, Compétences, Articles, SiteAnnonce/BanniereAccueil, PageStatique, AIConfig), plus une classe dédiée au kill-switch IA (vérifie qu'un toggle désactivé retourne 503 **avant** tout appel réseau, sans mocker Groq). `jobs/tests/test_ai_engine.py` (nouveau, 6 tests) — dispatch Groq/Ollama, priorité `temperature` explicite vs config, transmission `response_format`, erreur propre si `GROQ_API_KEY` absente.
  - **🐛 Piège trouvé en écrivant ces tests** : plusieurs migrations de ce chantier (`0062`, `0064`, `0066`, `0070`) **peuplent des données** (paliers Premium, FAQ, compétences de départ, pages CGU/confidentialité/qui-sommes-nous) — la base de test les contient donc dès la création, contrairement à une base vierge. Des assertions sur des comptages absolus (`len(response.data) == 3`) ou des créations avec un slug/nb_mois qui collisionnait avec une valeur seedée (`nb_mois=1`, `slug="cgu"`) échouaient pour cette raison, pas à cause d'un bug applicatif. Fix : chaque classe de test concernée vide la table du modèle en `setUp()` avant de poser ses propres fixtures.
  - **🐛 Deuxième piège** : `AIConfig.get_solo()` met en cache l'instance en LocMemCache (process-wide, **pas** rollback par les transactions de test Django) — un test qui change `provider` et ne vide pas le cache peut faire fuiter cette valeur vers les tests suivants dans le même run, y compris entre deux fichiers de test différents. Fix : `cache.clear()` systématique en `setUp()` partout où `AIConfig`/du contenu CMS public est en jeu.
- **Frontend** (7 nouveaux fichiers, 51 tests) : `AdminCompetences.test.jsx` (8), `AdminBannieres.test.jsx` (8), `AdminPages.test.jsx` (8), `AdminIAConfig.test.jsx` (7), `Blog.test.jsx` (5), `ArticleDetail.test.jsx` (4), `PageStatiqueGenerique.test.jsx` (3).

**Tests** : backend 338/338 ✅ (aucun échec, y compris le flaky habituel qui est passé cette fois — confirme sa nature intermittente), frontend 402/402 ✅ (58 fichiers), `npx vite build` propre, `python manage.py check` propre.

---

## 🆕 SESSION 20/08/2026 — Audit sécurité : throttling par scope, garde-fou secrets prod, CVE dépendances

**Contexte** : audit sécurité informel demandé par l'utilisateur (pas de pentest formel) — passage en revue des points faibles réels du projet avant un futur lancement avec paiement réel (Chargily). 4 points traités dans l'ordre, un par un, avec validation de l'utilisateur avant chaque implémentation.

**1. Throttling DRF trop grossier** : avant cette session, `settings.py` n'avait que le seau générique `anon: 100/day` / `user: 1000/day` pour tout endpoint sans scope explicite (seuls `auth` 10/min et `groq` 20/h existaient). Un visiteur légitime naviguant beaucoup (pagination offres + constants + nomenclature à chaque page) pouvait taper le seau générique, tandis qu'aucun scope dédié ne resserrait spécifiquement les écritures anonymes (candidature rapide, candidature spontanée, contact).
- **Nouveau `jobs/throttles.py`** : `PublicReadThrottle` (scope `public_read`, 300/h) et `WriteActionThrottle` (scope `write_action`, 30/h), toutes deux `ScopedRateThrottle` avec le même bypass Cypress en DEBUG que `accounts.views.AuthRateThrottle` (pattern dupliqué intentionnellement — centraliser dans un seul fichier partagé entre `accounts` et `jobs` aurait ajouté une dépendance inter-app pour 4 lignes).
- `public_read` appliqué sur 9 vues à forte fréquence légitime, faible risque : `JobListAPIView`, `JobDetailAPIView`, `ConstantsAPIView`, `NomenclatureAPIView`, `MetierReferentielAPIView` (autocomplete), `PublicStatsAPIView`, `StatsGeoAPIView`, `EntrepriseListAPIView`, `EntrepriseDetailAPIView`.
- `write_action` appliqué sur les 3 endpoints d'écriture anonyme : `PostulerRapideAPIView`, `EnvoyerCandidatureSpontaneeAPIView`, `ContactMessageAPIView` (celui-ci remplace son ancien `CypressAwareThrottle` générique).
- `auth`/`groq` non touchés — déjà bien calibrés.

**2. Aucun garde-fou sur les secrets manquants en prod (hors SECRET_KEY)** : `settings.py` avait déjà un `ImproperlyConfigured` si `DEBUG=False` et `SECRET_KEY` vaut encore `'changeme-in-production'` — mais rien d'équivalent pour `EMAIL_HOST_USER/PASSWORD`, `GROQ_API_KEY`, `CHARGILY_API_KEY/SECRET_KEY`. Une clé vide en prod cassait silencieusement au premier appel runtime (email jamais envoyé, webhook paiement en échec, IA indisponible) au lieu d'empêcher le démarrage.
- Fix : bloc `if not DEBUG` après la section `EXTERNAL APIS`/`CHARGILY` — liste les variables manquantes dans le message d'erreur (`ImproperlyConfigured`), même mécanisme que `SECRET_KEY`. Testé par simulation (`DEBUG=False` + `GROQ_API_KEY=''` en env) → lève bien l'exception avant tout autre code.
- **Aucun impact dev** : les 5 variables restent optionnelles (`''` par défaut) tant que `DEBUG=True`.

**3. Injection HTML potentielle via `message_refus_auto`** : le recruteur personnalise un message de refus (`ProfilEntreprise.message_refus_auto`, texte libre) injecté dans `emails/refus.html` via `render_to_string()`. Inquiétude : un recruteur malveillant qui mettrait du HTML/JS dans ce champ pourrait-il casser le rendu de l'email ou déclencher un souci côté client mail du candidat ?
- **Vérifié empiriquement, pas de faille** : `{{ message }}` dans le template n'a ni `|safe` ni `{% autoescape off %}`, et `TEMPLATES` dans `settings.py` n'a rien qui désactive l'autoescape global — Django échappe donc automatiquement. Testé en rendant le template avec le payload `<script>alert(1)</script><img src=x onerror=alert(2)>` comme valeur de `message` → sortie confirmée en entités HTML échappées (`&lt;script&gt;...`), donc inerte. **Aucun correctif nécessaire.**

**4. Dépendances non auditées (`pip-audit`/`npm audit` jamais lancés)** :
- Backend — 8 CVE trouvées sur 3 packages runtime réels : `Django` 5.2.16→**5.2.17**, `cryptography` 48.0.1→**50.0.0**, `sqlparse` 0.5.5→**0.6.0**. Mis à jour dans `backend_env` (pip install) et `requirements.txt`. `pip-audit -r requirements.txt` re-vérifié après upgrade : **"No known vulnerabilities found"**.
- Frontend — 10 vulnérabilités trouvées via `npm audit`, mais **toutes dans `devDependencies`** (Cypress et sa chaîne : `extract-zip`, `qs`, `uuid`, `@cypress/request` ; plus tooling build/test : `postcss`, `js-yaml`, `nanoid`, `undici`, `brace-expansion`). Rien dans les `dependencies` réelles (`react`, `axios`, `react-router-dom`, etc.) — zéro risque en prod, uniquement surface d'attaque locale/CI. **Décision : pas de correctif** — `npm audit fix --force` upgraderait Cypress vers 15.21.0, connu cassé sur Windows 10 (cf. décision technique existante "Cypress version" dans ce fichier). Pas de valeur à casser Cypress pour patcher des CVE dev-only sans impact prod.

**Tests** : backend 281/281 ✅ (relancé après chaque étape significative — throttling, garde-fou secrets, upgrade dépendances), `python manage.py check` propre, `pip-audit` propre.

**Suite (même session, jour même)** — 2 points restants de la revue de sécurité traités après validation utilisateur sur les choix (question ciblée) :

**5. Scan de dépendances automatisé** : `.github/dependabot.yml` créé — écosystèmes `pip` (`/taftech_backend`) et `npm` (`/taftech_frontend`), fréquence hebdomadaire, PR automatique à chaque nouvelle CVE détectée sur une dépendance. Choix confirmé par l'utilisateur face à l'alternative "job CI pip-audit/npm audit qui échoue le build" — Dependabot préféré car natif GitHub, zéro maintenance.

**6. Anti-abus par email (en plus du throttle IP)** : `WriteActionThrottle` (30/h par IP, session précédente) reste contournable par un attaquant avec un pool d'IPs. Nouveau `EmailRateThrottle` (`jobs/throttles.py`, scope `email_write`, **10/jour**) — clé de cache basée sur l'email soumis dans `request.data` (pas l'IP), donc un même email ne peut pas spammer même en changeant d'adresse IP. `email_field` configurable par sous-classe (`PostulerRapideEmailThrottle` lit `email_rapide`, les 2 autres lisent `email` par défaut). Appliqué en throttle **supplémentaire** (pas en remplacement) sur `PostulerRapideAPIView`, `EnvoyerCandidatureSpontaneeAPIView`, `ContactMessageAPIView` — `throttle_classes = [WriteActionThrottle, EmailRateThrottle]`. Si le champ email est absent/vide, `get_cache_key` retourne `None` → pas de throttle (comportement DRF standard, pas de crash). Bypass Cypress en DEBUG identique aux autres throttles du projet.

**Tests** : 281/281 ✅ — 1 échec observé au premier run (`test_log_ordering_desc`, `EquipeActionLogModelTests`) identifié comme **flaky préexistant** (ordre de 2 logs par timestamp `auto_now` pouvant coller sous charge de suite complète, aucun rapport avec les throttles), confirmé par passage en isolation puis re-run complet au vert.

---

## 🆕 SESSION 19/08/2026 — Dashboard recruteur : filtres, détail matching complet, actions inline

**Contexte** : le client jugeait la 1ʳᵉ version (session 18/08/2026 — graphiques + Candidats recommandés) insuffisante sur 3 points précis (clarifiés via questions ciblées) : l'explication du matching (1 seule phrase), les graphiques (pas de granularité/filtre), et la section recommandés (pas d'actions, pas de tri). **Toujours zéro endpoint backend ajouté** — uniquement de l'agrégation/filtrage client-side sur les données déjà exposées par `DashboardRecruteurAPIView`.

**Filtre partagé "par offre" + "période"** (`DashboardRecruteur.jsx`) : deux `<select>` (`tw.inputColorsWhite`) au-dessus des graphiques — `filtreOffreId` (toutes / une offre précise) et `periodeEvolution` (7j/30j/6m/1a). `offresPourAnalyse` dérivé filtre le tableau `offres` avant tout calcul (évolution + pipeline + recommandés partagent ce filtre). Changer le filtre offre réinitialise `recommandesLimit` à 6 (évite un état de pagination incohérent avec la nouvelle liste).

**Évolution — granularité paramétrable** : `evolution` bascule entre buckets journaliers (7j/30j, clé = `date_postulation.slice(0,10)`) et mensuels (6m/1a, même logique qu'avant mais nbMois variable). `MiniAreaChart` reçoit un nouveau prop optionnel `height` (défaut 160, passé à 190 depuis le dashboard pour plus de lisibilité) — aucun autre composant ne l'utilisait, pas de régression.

**Pipeline — taux de conversion** : chaque barre affiche désormais `count` **et** `%` (part de `count` sur `pipelineTotal`, le total toutes étapes confondues du filtre actif) — répond à la demande "plus de métriques" sans ajouter de vrai calcul de conversion étape-à-étape (aurait nécessité un historique de transitions de statut non trackée actuellement, hors scope).

**Candidats recommandés — 3 ajouts** :
1. **Détail matching complet** : bouton "Voir le détail du matching" par carte (state `expandedMatchId`) déplie les 5 critères (`CRITERES_MATCHING`, mêmes clés/max que `DetailCandidature.jsx`) avec barre de progression + phrase d'explication par critère — réutilise exactement le pattern de "Pourquoi ce score ?" (`DM.scores || DM`, `DM.explications`) au lieu d'une seule phrase.
2. **Filtre "masquer retenus/refusés"** (`masquerDecides`, coché par défaut) + pagination "Voir plus" par pas de 6 (`recommandesLimit`) au lieu d'un top 5 fixe.
3. **Action directe** : dropdown de changement de statut inline par carte (`handleChangerStatutRecommande` → `jobsService.updateStatutCandidature`, même endpoint que `DetailCandidature.jsx`/`useGestionOffre.js`), respecte `authService.peutFaire("UTILISATEUR")` (INVITE lecture seule, cohérent avec le reste de l'app). **Simplification assumée** : pas de modale de programmation d'entretien pour le statut ENTRETIEN depuis cette carte (contrairement à `useGestionOffre.js`) — la prise de rendez-vous détaillée reste sur la fiche candidature complète, cette action rapide est pour les changements de statut simples.

**Piège HTML évité** : la carte recommandée était un `<button>` unique (clic = navigation) dans la version précédente. Impossible d'y imbriquer les nouveaux boutons interactifs (toggle détail, dropdown statut) — bouton dans bouton est invalide en HTML et cassait déjà ailleurs dans le projet (cf. bug modale imbriquée du 28/07/2026). Fix : carte convertie en `<div>`, seul le bloc avatar+nom+score reste un `<button>` cliquable (navigate), le reste de la carte (dropdown statut, lien "Voir la candidature") est en boutons siblings, pas imbriqués.

**Audit sécurité** : aucune route/endpoint créé — `handleChangerStatutRecommande` appelle le même `PATCH jobs/candidatures/<id>/statut/` déjà protégé par `get_entreprise_for_user()` + `get_membre_role()` (INVITE bloqué en écriture côté backend, pas seulement masqué côté UI). RAS.

**Tests** : 338/338 frontend ✅ (dont 9/9 `DashboardRecruteur.test.jsx`), `npx vite build` propre.

**🐛 Bug réel trouvé en testant sur mobile via ngrok (capture d'écran utilisateur)** : `MiniAreaChart.jsx` forçait `minWidth: 420` sur le SVG quel que soit le nombre de points — sur un téléphone ~340-390px de large (largeur d'écran usuelle), ça déclenchait un scroll horizontal non voulu pour la vue par défaut "6 derniers mois" (6 points, largement suffisant sans scroll). Pire : la légende (`<div className="flex...">`) était à l'intérieur du **même conteneur** `overflow-x-auto` que le SVG → en scrollant le graphique, la légende scrollait aussi et son texte se retrouvait tronqué ("Candidatures reçues" affiché "ques"), et seuls 4 des 6 mois restaient visibles sans indication qu'il fallait scroller.
- **Fix** : légende sortie du conteneur scrollable (toujours visible, fixe). Largeur du SVG (`W`) calculée dynamiquement (`Math.max(320, data.length * 30)`) au lieu d'une valeur fixe — les vues à peu de points (6m/12m mensuel) tiennent sur mobile sans scroll, les vues denses (7j/30j quotidien) scrollent volontairement (comportement attendu, comme un graphe de contributions GitHub).
- **Ajouts** (répondant à "graphique trop nul, aucune valeur lisible") : axe Y avec 3 valeurs numériques (0/milieu/max) à gauche des lignes de grille ; tap/clic sur un point affiche sous le graphique la valeur exacte de chaque série à cette date (`hoverIdx` state) — utile notamment pour "Recrutements", souvent une ligne plate à 0 donc invisible sans cette lecture explicite.
- **Décision** : pas de librairie de charts ajoutée (toujours SVG inline, cohérent avec [[MiniAreaChart]] créé en session 18/08/2026) — le bug était un défaut de responsive/UX, pas une limite du SVG inline en soi.

**Fonctionnalités ajoutées au graphique "Évolution"** (demande client explicite après le fix du bug ci-dessus) — toujours zéro appel backend, tout calculé côté client :
- **Courbe / Barres** : toggle (icônes `LineChart`/`BarChart3`) — `chartType` prop sur `MiniAreaChart`, bascule le rendu SVG entre `polyline`+aire et `rect` groupés par point.
- **Comparaison période précédente** : checkbox "Comparer à la période précédente" — `buildEvolutionBuckets(periode, shiftPeriodes)` dans `DashboardRecruteur.jsx` généralise le calcul de buckets (avant : inline, une seule fois) avec un décalage en nombre de périodes (7j/30j/6m/1a × shiftPeriodes) ; seule la série "candidatures" de la période N-1 est superposée en pointillé (comparer TOUTES les séries aurait surchargé un petit widget) — prop `compareValues` (tableau de valeurs aligné par index, pas par date, sur `data`).
- **Taux de conversion (%)** : checkbox "Taux de conversion" — 3ᵉ métrique calculée par bucket (`recrutements/candidatures*100`, 0 si aucune candidature) tracée sur un **axe droit indépendant 0-100%** (`secondarySeries` + `secondaryMax`, `scaleY2` séparée de l'échelle des comptages) — mélanger un pourcentage (0-100) avec des comptages bruts (souvent <20) sur la même échelle aurait rendu la courbe de conversion illisible (quasi plate en bas).
- **Export PNG/CSV** : bouton "Exporter" par graphique (menu dropdown). CSV = sérialisation manuelle avec séparateur `;` + BOM UTF-8 (compat Excel FR). PNG = clonage du `<svg>` (dimensions explicites fixées sur le clone, la version affichée n'a que `width:100%` CSS qui ne suffit pas pour un export autonome) → sérialisé → dessiné sur un `<canvas>` à l'échelle ×2 (netteté) → `canvas.toBlob()`.
- **Décision produit (confirmée avec l'utilisateur)** : comparaison + conversion sont **désactivées automatiquement en mode Barres** (checkboxes grisées, `disabled`) — combiner barres groupées + ligne pointillée + axe secondaire sur un mini-widget aurait été illisible ; l'utilisateur a validé cette contrainte plutôt que de tout rendre combinable.

**Tests** : 338/338 frontend ✅ (dont 9/9 `DashboardRecruteur.test.jsx`), `npx vite build` propre.

**Génération IA enrichie sur "Publier une offre"** (demande client : bouton "Générer l'offre avec l'IA", recruteur saisit juste le poste) :
- **Simplification du déclencheur** : `GenererOffreIAAPIView` (`jobs/views/ia.py`) n'exige plus que `titre` (avant : `titre` ET `specialite`). Si `specialite` absente, résolue automatiquement via `resoudre_domaine_depuis_texte(titre)` (même référentiel métiers que le parser CV candidat) et renvoyée au frontend (`specialite_resolue`) qui pré-sélectionne le champ Spécialité **seulement s'il était vide** (ne jamais écraser un choix déjà fait manuellement). `CreateJob.jsx` : `iaReady = isPremium && !!formData.titre` (avant : + `formData.specialite`).
- **2 nouveaux champs générés** : `competences` (5-8 compétences techniques/outils, format tiret comme missions/profil_recherche) et `questions_entretien` (tableau de 4-6 questions, jamais stocké tel quel — voir ci-dessous). `max_tokens` monté 1000→1600 (2 champs de plus).
- **Nouveau champ persistant `OffreEmploi.competences`** (migration `0057`, `TextField` nullable, même pattern que `missions`/`profil_recherche`) — ajouté à `OffreEmploiCreateDTO`, `OffreDashboardDTO` (`OffreEmploiSerializer` l'inclut automatiquement via `__all__`), formulaire `CreateJob.jsx`, modale de modification `DashboardRecruteur.jsx`, affichage `JobDetail.jsx` (candidat) et `GestionOffre/index.jsx` (recruteur).
- **Questions d'entretien — pas de nouveau modèle** : les questions générées ne sont **pas** auto-créées en `Questionnaire`/`QuestionQuestionnaire` (ça exigerait de deviner type de réponse/choix/disqualifiant sans supervision humaine — risqué). À la place : affichées en liste dans `CreateJob.jsx` sous les champs texte, avec un bouton "Créer un questionnaire avec ces questions →" qui ouvre `CreateQuestionnaireModal` **pré-rempli** (nouveaux props `initialQuestions`/`initialTitre`, `useEffect` sur `open` qui reconstruit `form` seulement si des questions sont fournies — sinon la modale garde son comportement par défaut d'une question vide). Le recruteur choisit le type de chaque question (COURT par défaut) et peut éditer/retirer avant de créer — jamais publié sans relecture, cohérent avec la demande client ("le recruteur garde la possibilité de modifier avant publication").
- **Audit sécurité** : aucun nouvel endpoint — `GenererOffreIAAPIView` reste `IsAuthenticated` + vérif `entreprise.est_premium_actif` inchangée ; le nouveau champ `competences` suit exactement le même chemin de permission que `missions`/`profil_recherche` sur `UpdateOffreRecruteurAPIView` (déjà `get_entreprise_for_user()` + `get_membre_role()`). RAS.

**Tests** : 338/338 frontend ✅ (dont 6/6 `CreateJob.test.jsx`), backend relancé après migration, `npx vite build` propre.

**Questions d'entretien IA — type + options générés, pas seulement du texte libre** (précision demandée : "questionnaire créé auto avec les réponses", clarifiée = les questions doivent utiliser les vrais types du questionnaire — COURT/LONG/NUMERIQUE/CHOIX_UNIQUE/CHOIX_MULTIPLE — pas toutes en texte libre) :
- **Backend** (`GenererOffreIAAPIView`) : `questions_entretien` n'est plus un tableau de chaînes mais d'objets `{texte, type_question, choix}` — le prompt Groq demande explicitement de varier les types et de fournir 3-5 options réalistes (pas génériques "Oui/Non") pour les QCM. Validation stricte côté serveur avant retour au frontend : `type_question` doit être dans les 5 valeurs valides (repli `COURT` sinon) ; `choix` dédupliqué/tronqué à 6 ; un type QCM avec moins de 2 options réelles retombe automatiquement en `COURT` (jamais de QCM à 0-1 option envoyé au frontend).
- **Frontend** : panneau de suggestions (`CreateJob.jsx`) affiche désormais le type de chaque question (badge) + ses options le cas échéant. `CreateQuestionnaireModal.jsx` (`initialQuestions`) mappe ces objets enrichis directement dans le formulaire (type + choix pré-remplis, pas juste le texte) — accepte aussi une simple chaîne en repli pour rester rétrocompatible.
- **Toujours pas d'auto-création sans relecture** (confirmé avec l'utilisateur) : le questionnaire passe toujours par la modale de relecture avant création réelle — seule la richesse du pré-remplissage (type + options au lieu de texte vide) a changé, pas le flux de validation.

**Tests** : 338/338 frontend ✅ (dont `CreateJob.test.jsx` + `Questionnaires.test.jsx`), backend relancé, `npx vite build` propre.

**CVthèque — 5 nouveaux filtres** (demande client : disponibilité, mobilité, permis, langues, diplôme, années d'expérience, secteur, compétences — diplôme/expérience/secteur existaient déjà, seuls les 5 autres manquaient) :
- **Backend** (`CVThequeView`, `jobs/views/recruteur.py`) : `mobilite` (exact match sur `ProfilCandidat.mobilite`), `disponibilite` (exact match sur `situation_actuelle`), `permis` (`true` → `permis_conduire=True`), `langues`/`competences` (`icontains` — ce sont des `CharField`/`TextField` texte libre sans référentiel structuré côté candidat, donc filtrage par sous-chaîne et pas par égalité comme les champs à choix).
- **Nouvelles options exposées** : `ConstantsAPIView` (`jobs/views/offres.py`) retourne désormais `mobilites`/`disponibilites` (sourcées directement de `ProfilCandidat.MOBILITE_CHOICES`/`SITUATION_ACTUELLE`, pas dupliquées dans `constants.py`). Cache `jobs_constants` vidé manuellement en session (LocMemCache — se vide de toute façon au prochain redémarrage du serveur dev).
- **Frontend** (`CVTheque.jsx`) : 2ᵉ ligne de filtres ajoutée sous la première (Mobilité + Disponibilité en `Select`, Langue + Compétence en texte libre `icontains`), chip "Permis de conduire" ajouté à côté de Photo/CV/Inscrits récemment. Whitelist de query params élargie dans `recruteurService.searchCVtheque`.
- **Décision** : `langues`/`competences` en texte libre (pas de dropdown) car aucun référentiel structuré n'existe côté `ProfilCandidat` pour ces deux champs (stockage `CharField`/`TextField` libre, format `"Nom:Niveau, ..."` pour les langues) — un dropdown supposerait des valeurs normalisées qui n'existent pas.

**CVthèque — 4 filtres supplémentaires** (demande "ajoutez plus si c'est possible", après les 5 premiers) — passage en revue de tous les champs `ProfilCandidat` non encore filtrables :
- `vehicule_personnel` (chip booléen, comme Permis)
- `passeport_valide` (chip booléen)
- `service_militaire` (`Select`, choix `ProfilCandidat.SERVICE_MILITAIRE_CHOICES` — exposé via `ConstantsAPIView.services_militaires`)
- `niveau_experience` (`Select`, réutilise `constants.experiences`/`NIVEAUX_EXPERIENCE`) — **distinct** du filtre "Expérience minimum" déjà existant : celui-ci est calculé dynamiquement depuis les dates des `ExperienceCandidat` (années réelles), `niveau_experience` est une auto-déclaration catégorielle du candidat (ex: "Confirmé", "Manager") — les deux peuvent diverger (candidat qui se sous/sur-estime), donc gardés comme 2 filtres séparés plutôt que fusionnés.
- **Champ non ajouté** : `salaire_souhaite` — `CharField` texte libre sans format normalisé (ex: "80 000 DA", "Négociable", "80k") → un filtre numérique/range serait peu fiable sans forcer une saisie structurée côté profil candidat, hors scope de cette demande.
- Cache `jobs_constants` re-vidé manuellement (nouvelle clé `services_militaires`).

**Tests** : 338/338 frontend ✅ (dont 11/11 `CVTheque.test.jsx`), backend relancé, `npx vite build` propre.

**Page Premium — avantages mis en avant** (demande client : rendre les formules plus attractives, 6 avantages à valoriser) : `AVANTAGES` (4 lignes génériques à coche simple) remplacé par `AVANTAGES_DETAILLES` (6 items structurés `{icon, titre, description}`) affichés en grille de cartes (`AvantageCard`, icône dans chip teal + titre + description courte) au lieu d'une liste plate — utilisé à la fois dans l'écran de paiement ("Ce qui est inclus") et l'écran de statut abonné ("Fonctionnalités incluses"), un seul endroit à maintenir.
- **Point signalé à l'utilisateur avant d'écrire le code** : "Support prioritaire" ne correspondait à aucune fonctionnalité réelle (aucun canal de support distinct/priorisé n'existe dans le produit). Décision utilisateur : l'afficher quand même avec une promesse simple et vraie — email dédié `taftech963@gmail.com`, réponse sous 24h — pas de système de tickets à construire, juste un engagement opérationnel documenté sur la page.
- Les 5 autres avantages (coordonnées candidats, téléchargement CV, recherche avancée, analyses IA, favoris) sont déjà des fonctionnalités réelles, toutes déjà cachées derrière le gate Premium existant de la CVthèque — aucun changement backend nécessaire, uniquement de la présentation.

**Tests** : 338/338 frontend ✅ (dont 10/10 `PremiumPage.test.jsx`), `npx vite build` propre.

**🐛 Bug réel — lien Premium absent du menu mobile recruteur** (signalé par l'utilisateur) : "Mon Premium ⭐"/"Passer Premium 🔒" n'existait que dans le dropdown desktop de `NavbarRecruteur.jsx` (tableau `minRole: "PROPRIETAIRE"` ligne ~184) — jamais dans la liste du menu hamburger mobile, ni dans `BottomNavRecruteur` (5 slots déjà pris). Un PROPRIETAIRE sur mobile n'avait donc **aucun moyen d'atteindre `/recruteurs/premium`**. Fix : lien ajouté après la liste mappée du menu mobile, même garde `authService.peutFaire("PROPRIETAIRE")`, même libellé dynamique selon `isPremium` (ambre si déjà premium, teal sinon) que la version desktop.

**Tests** : 338/338 frontend ✅, `npx vite build` propre.

**Profil entreprise — bannière, culture, galerie photo** (demande client — sur les 7 items listés, `secteur`/`site web`/`présentation` existaient déjà) :
- **Nouveaux champs `ProfilEntreprise`** (migration `0058`) : `banniere` (ImageField, 5 Mo max — plus permissif que `logo` car format large), `culture_entreprise` (TextField). **Nouveau modèle `EntreprisePhoto`** (FK `entreprise` related_name `photos`, `image` + `legende` + `date_ajout`, `ordering=['-date_ajout']`) — pattern calqué sur `ExperienceCandidat`/`FormationCandidat` (enfant FK simple), pas de champ JSON/array — cohérent avec le reste du projet qui n'a jamais stocké de listes d'images en JSON.
- **Nouveaux endpoints** `POST/DELETE jobs/entreprise/photos/(<id>/)` (`EntreprisePhotosAPIView`) — limite 12 photos, 3 Mo/photo, gate `PROPRIETAIRE`/`ADMIN` (même pattern que `UpdateProfilEntrepriseAPIView`). `banniere` + `culture_entreprise` ajoutés au whitelist/upload de `UpdateProfilEntrepriseAPIView` existant (pas de nouvel endpoint pour ces deux-là).
- **🐛 Bug réel trouvé en marge** : `recruteurService.updateProfilEntreprise` détectait un fichier à uploader uniquement via `data.logo instanceof File` — un upload de `banniere` seul (sans changer le logo) aurait été silencieusement sérialisé en JSON au lieu de multipart, donc jamais reçu par `request.FILES` côté backend. Corrigé (`data.logo instanceof File || data.banniere instanceof File`).
- **🐛 Bug réel trouvé en marge #2** : `linkedin`/`site_web` étaient déjà des champs fonctionnels dans le formulaire `ParametresRecruteur.jsx`, mais **jamais préremplis au chargement** — `EntrepriseDashboardDetailSerializer` (utilisé par `dash.entreprise`) ne les exposait pas du tout. Un recruteur qui avait déjà renseigné son LinkedIn le voyait toujours vide en rouvrant Paramètres (donnée présente en base, juste jamais renvoyée). Corrigé : `linkedin`, `site_web`, `banniere`, `culture_entreprise`, `photos` ajoutés aux champs du serializer. Même trou constaté et corrigé dans la branche "membre d'équipe" de `ParametresRecruteur.jsx` (`adresse_complete` y manquait aussi).
- **Frontend `ParametresRecruteur.jsx`** (onglet "Mon entreprise") : upload bannière (même pattern que logo, preview via `URL.createObjectURL`), textarea Culture d'entreprise, galerie photo (grille de vignettes + bouton supprimer au survol + upload avec légende optionnelle, compteur "x/12").
- **Frontend `EntreprisePublic.jsx`** (page vitrine) : bannière affichée en pleine largeur au-dessus du bandeau logo/nom si présente, bloc "Culture d'entreprise" (même style que "Présentation"), grille de miniatures "Photos". "Offres disponibles" utilise désormais `nombre_offres_actives` (nouveau champ backend calculé, `SerializerMethodField` sur `EntreprisePublicSerializer`) avec repli sur l'ancien calcul client `offres_actives.length` — la liste complète `offres_actives` reste inchangée, le nouveau champ est un ajout, pas un remplacement.
- **SEO — reporté** : demandé en fin de message sans détail ; après clarification l'utilisateur veut meta tags par page + sitemap.xml/robots.txt + vérification des slugs offres — **pas encore fait**, prochaine session.

**Tests** : 338/338 frontend ✅ (dont 21/21 `ParametresRecruteur.test.jsx` + `EntreprisePublic.test.jsx`), backend relancé, `npx vite build` propre, `python manage.py check` propre.

**SEO — meta tags par page + sitemap.xml/robots.txt** :
- **Composant `Components/Seo.jsx`** — balises `<title>`/`<meta description>`/Open Graph/Twitter Card par page, appliqué sur `Home.jsx`, `JobDetail.jsx` (titre+description dynamiques par offre, image = logo entreprise), `JobsList.jsx`, `EntreprisePublic.jsx` (titre+description dynamiques par entreprise, image = bannière ou logo). **Décision technique** : d'abord tenté `react-helmet-async` (standard du marché), abandonné avant de casser les tests — la lib exige un `<HelmetProvider>` ancêtre que les 4 fichiers de test (`Home`/`JobDetail`/`JobsList`/`EntreprisePublic`) n'ont pas (ils wrappent seulement `<MemoryRouter>`). Remplacé par un composant sans dépendance (`useEffect` + manipulation directe de `document.head`, restaure les valeurs par défaut au démontage) — même résultat pour une SPA sans SSR, zéro dépendance ajoutée, zéro test cassé. `index.html` : `lang="en"` → `lang="fr"` (jamais corrigé depuis la création du projet), meta description/OG par défaut ajoutées comme filet pour les pages sans `<Seo>`.
- **`jobs/seo_views.py`** (nouveau fichier, hors du package `views/` — monté directement dans `taftech_backend/urls.py`, pas sous `/api/`) : `SitemapXMLView` (offres actives approuvées + entreprises approuvées + pages statiques, XML protocole sitemap.org, URLs construites depuis `settings.SITE_URL` — donc pointent vers le frontend, pas l'API Django) et `RobotsTxtView` (autorise tout sauf les routes authentifiées : dashboard, parametres, profil, cvtheque, etc. — `Disallow` par préfixe de route ; référence le sitemap).
- **Routes montées à la racine du domaine** (`/sitemap.xml`, `/robots.txt`, pas `/api/jobs/...`) — c'est là que les crawlers et Google Search Console les cherchent par convention. `vite.config.js` : proxy dev étendu (même pattern que `/api`/`/media`) pour que ces deux chemins fonctionnent aussi via le tunnel ngrok en test. **⚠️ Prod** : la config nginx du déploiement devra proxy `/sitemap.xml` et `/robots.txt` vers Django, comme `/api`/`/media` — pas encore fait (nginx pas encore configuré, hors scope dev).
- **Vérifié (pas modifié)** : `OffreEmploi` n'a **pas** de slug — routes offres toujours `/jobs/<id>/` (contrairement à `ProfilEntreprise.slug` qui existe déjà). Décision **non prise** unilatéralement : ajouter un slug aux offres casserait les URLs déjà partagées/indexées (liens email, éventuels partages) sans stratégie de redirection 301 depuis l'ancien `/jobs/<id>/` — nécessite une vraie décision produit avant implémentation, pas juste un ajout de champ. Le sitemap utilise donc `/jobs/<id>/` tel quel pour l'instant.

**Tests** : 338/338 frontend ✅ (dont Home/JobDetail/JobsList/EntreprisePublic — 26/26), backend relancé, `npx vite build` propre, sitemap/robots vérifiés manuellement via `Client(SERVER_NAME='localhost')`.

**URLs offres — pattern id+slug** (suite SEO, décision utilisateur après recommandation) : `/jobs/16-responsable-rh-et-paie/` au lieu de `/jobs/16/`. **Pattern hybride choisi délibérément** (comme Indeed/LinkedIn Jobs) plutôt qu'un slug pur type `ProfilEntreprise.slug` — l'ID reste l'unique clé de lookup, le slug n'est que cosmétique et ignoré au parsing. Avantages : zéro migration DB, zéro redirection 301 nécessaire (`/jobs/16/` sans slug continue de fonctionner à l'identique), pas de risque de collision entre offres au titre identique (contrairement à un slug unique en base).
- **Frontend** : `utils/slugify.js` (nouveau, `slugify()` + `jobUrl(id, titre)` — pas de librairie, `normalize("NFKD")` + strip diacritiques). `JobDetail.jsx` parse le param de route en extrayant le préfixe numérique (`idSlug.split("-")[0]`) avant tout appel API — le slug n'existe que dans l'URL affichée, jamais transmis au backend. Tous les liens sortants vers une offre (`JobCard.jsx`, `Home.jsx`, `JobsList.jsx`, `EntreprisePublic.jsx`) construits via `jobUrl()`. Liens laissés en ID seul (hors périmètre SEO, pages authentifiées non crawlées) : `ReviewCandidature.jsx`, `AdminCandidatures.jsx`, `OffresSauvegardees.jsx`.
- **Backend** : `jobs/seo_views.py` (`SitemapXMLView`) génère désormais `{id}-{slugify(titre)}` via `django.utils.text.slugify` (même utilitaire que `ProfilEntreprise.save()`) — aucun champ stocké, calculé à la volée à chaque génération du sitemap.
- **Aucune route Django modifiée** — l'API continue de recevoir un ID pur (`GET jobs/<id>/`), le slug est une pure façade côté React Router (`/jobs/:id` capture tout le segment "16-responsable-rh-et-paie" tel quel, extrait ensuite côté client).

**Tests** : 338/338 frontend ✅ (1 assertion mise à jour dans `EntreprisePublic.test.jsx` — href attendu passe de `/jobs/1` à `/jobs/1-developpeur-front-end`), sitemap re-vérifié manuellement (`/jobs/16-responsable-administration-rh-et-paie/` confirmé en sortie).

---

## 🆕 SESSION 18/08/2026 — demandes client : Home agrément, tableau de bord candidat, modèles Groq

**Contexte** : nouvelle branche `feature/demandes-client` (créée depuis `main`, stash du WIP `feature/diplome-referentiel` mis de côté). Plusieurs demandes client distinctes traitées dans l'ordre.

**Home — mise en avant agrément TAFTECH** : bandeau institutionnel sobre (icône + titre + référence, bordure fine, pas de pilule pleine couleur type IA générique) au-dessus de "Pourquoi choisir TAFTECH" avec le texte exact "Agrément n°14 du 09 mai 2026, Ministère du Travail, de l'Emploi et de la Sécurité Sociale". Section "Pourquoi choisir TAFTECH ?" recentrée sur les 3 piliers demandés par le client : Matching intelligent, Expertise RH, Protection des données (remplace les anciennes cartes CVthèque/simple-rapide-sécurisé). CTA "Je cherche un emploi" / "Je recrute" conservés inchangés dans le hero.

**Nouveau tableau de bord candidat** (`taftech_frontend/src/Pages/Candidat/CandidatDashboard.jsx`, route `/dashboard-candidat`) — première page vue par le candidat après connexion. Agrège : complétude du profil (jauge circulaire SVG, réutilise la logique `CHAMPS_PROFIL` de `useProfilCandidat.js` en version locale allégée + langues), checklist des éléments manquants (badges cliquables → `/profil`), offres recommandées (`jobsService.getOffresRecommandees()`, réutilise `JobCard`), dernières candidatures (3 dernières, badge de statut coloré), suggestions de métiers IA (`getSuggestionsCarriere()`, auto-chargé), et **Analyse IA du CV** (`getAnalyseCarriere()`, à la demande via bouton — pas auto-fetché pour respecter le throttle Groq).
- Devenue la page d'atterrissage candidat : `GuestRoute`, `RecruteurRoute`, `AdminRoute` (`App.jsx`) redirigent désormais vers `/dashboard-candidat` au lieu de `/profil`. `Login.jsx` et `RegisterCandidat.jsx` (login classique + Google, inscription Google) `navigate()` vers `/dashboard-candidat` après connexion/inscription réussie au lieu de `/`.
- Ajouté en premier dans `CandidatLayout.jsx` (sidebar), `Navbar.jsx` (dropdown desktop + menu mobile), `BottomNavCandidat.jsx` (remplace "Accueil" — bottom nav plafonnée à 5 items, décision produit déjà actée).
- **Audit sécurité** (nouvelle règle #9, voir Règles de collaboration) : route protégée par `CandidatRoute` (identique à `/profil`). Aucun nouvel endpoint backend créé — réutilise uniquement des endpoints déjà `IsAuthenticated` + scopés `request.user` (`MesCandidaturesAPIView` filtre `candidat=request.user`, `ProfilCandidatAPIView`/`SuggestionsCarriereAPIView`/`AnalyseCarriereGroqAPIView` vérifient `role == 'CANDIDAT'`). RAS.

**🐛 Bug critique découvert et corrigé — modèles Groq dépréciés (llama-3.x introuvables)** : en testant "Analyse IA du CV", l'API Groq retournait 404 `model_not_found` sur `llama-3.1-8b-instant` (utilisé par `_appel_groq()` et `GenererOffreIAAPIView` dans `jobs/views/ia.py`) et `llama-3.3-70b-versatile` (utilisé par `cv_parser.py`, `GROQ_MODEL`) — **Groq a retiré tous les modèles Llama de l'API pour cette clé/compte**, confirmé via `GET https://api.groq.com/openai/v1/models` (plus aucun modèle `llama-*` texte dans la liste). Impactait silencieusement : Suggestions carrière (analyse IA), génération d'offre IA, ET tout le parsing CV (`_call_groq` dans `cv_parser.py` → `domaine_agent.py` en dépend aussi).
- **Fix** : remplacement par `openai/gpt-oss-20b` (modèle "reasoning" disponible sur Groq) partout (3 emplacements : `_appel_groq()`, l'appel direct de `GenererOffreIAAPIView`, `GROQ_MODEL` dans `cv_parser.py`).
- **Piège spécifique aux modèles reasoning (gpt-oss)** : par défaut, le modèle consomme le budget `max_tokens` sur son raisonnement interne (`reasoning` field de la réponse) et retourne `content` vide si `max_tokens` est atteint avant la fin du raisonnement (`finish_reason: "length"`). Fix : ajout de `reasoning_effort: "low"` sur les 3 appels (paramètre supporté nativement par le SDK Python `groq` 1.2.0 et par l'API REST directe) — réduit le raisonnement à ~15-20 tokens, laissant le budget `max_tokens` existant (500/800→1000/3000-6000) largement suffisant pour le contenu réel. Vérifié en JSON mode (`response_format: json_object`) également fonctionnel.
- **Non fait** : pas de liste de fallback multi-modèles ni de retry automatique — un seul modèle codé en dur par appel, comme avant. Si Groq déprécie encore ce modèle, le symptôme sera identique ("Service IA temporairement indisponible") et le diagnostic est désormais documenté ici (tester `curl .../v1/models` en premier réflexe).

**Analyse IA du CV/carrière — personnalisation demandée par le client** : le client a jugé les 3 sections d'origine (`ÉVOLUTION POSSIBLE`/`COMPÉTENCES À ACQUÉRIR`/`CONSEIL PERSONNALISÉ`) trop génériques. `AnalyseCarriereGroqAPIView` (`jobs/views/ia.py`) réécrite avec **5 sections** ancrées sur le métier réel du candidat : `MÉTIERS POSSIBLES` (3-5 métiers concrets), `POINTS FORTS`, `COMPÉTENCES MANQUANTES`, `FORMATIONS RECOMMANDÉES`, `ÉVOLUTION PROFESSIONNELLE`. Prompt système durci ("interdiction absolue de conseils génériques", "cite des éléments concrets tirés du profil") — testé manuellement sur un profil réel (dev Full Stack Django/React), résultat correctement personnalisé (cite les technologies/l'employeur/le diplôme exacts). `max_tokens` monté de 800 à 1200 (5 sections vs 3).
- Frontend : `SECTIONS_CONFIG` régénéré dynamiquement depuis un tableau `SECTION_KEYS` (au lieu de 3 blocs dupliqués) dans `SuggestionsCarriere.jsx` ET `CandidatDashboard.jsx` (parsing dupliqué intentionnellement, comme avant). 2 nouveaux tokens `tw.analyseSectionColors` (`blue`, `rose`) ajoutés dans `theme.js` pour couvrir les 5 sections (avant : seulement indigo/amber/emerald).
- **Piège regex découvert en testant en conditions réelles** : le modèle `openai/gpt-oss-20b` ne ferme pas toujours le `###` après l'intitulé de section (ex. `###MÉTIERS POSSIBLES` sans `###` de fin avant le contenu) — la regex de parsing exigeait `#{1,3}` obligatoire après la clé, ce qui faisait échouer TOUT le parsing silencieusement (repli sur bloc "ANALYSE PERSONNALISÉE" brut). Fix : `#{1,3}` → `#{0,3}` (optionnel) après la clé dans les deux fichiers. Validé par un test Node isolé (regex exécutée hors navigateur contre un vrai payload Groq) avant de considérer le fix acquis — les tests Vitest ne couvrent pas le contenu réel retourné par Groq, donc ce genre de régression de format ne se voit qu'en testant avec de vraies réponses IA.

**Matching — bouton "Pourquoi ce score ?"** : le client voulait que candidat ET recruteur comprennent comment le score est obtenu (expérience, diplôme, compétences, localisation, mobilité). Aucune donnée backend manquante — `matcher.py` calcule déjà `details` (points par critère : specialite 25, diplome 20, experience 20, competences 15, region 20) ET `explications` (phrase lisible par critère, ex. région narre déjà la règle de mobilité appliquée : "Mobilité nationale sur toute l'Algérie.") ; les deux DTOs (`MesCandidaturesDTO` côté candidat, `CandidatureRecruteurDTO` côté recruteur) exposaient déjà `details_matching` en entier — mais le champ `explications` n'était consommé QUE côté recruteur (`DetailCandidature.jsx`), jamais côté candidat.
- **Décision produit** : pas de critère "Mobilité" séparé créé (aurait fallu inventer un score arbitraire non calculé par l'algorithme) — le critère `region` existant est relabellisé partout `"Localisation & mobilité"` (déjà ce qu'il calcule réellement : distance + `ProfilCandidat.mobilite`), plus honnête que d'afficher un doublon fictif.
- **Côté candidat** (`MesCandidatures.jsx`) : bouton renommé `"Voir l'analyse IA détaillée"` → `"Pourquoi ce score ?"` (icône `HelpCircle`), le texte `explications[key]` (jusque-là inutilisé) est désormais affiché sous chaque barre de progression du détail par critère, comme côté recruteur.
- **Côté recruteur** (`DetailCandidature.jsx`, onglet "Analyse IA") : ajout d'un en-tête explicite `"Pourquoi ce score ?"` au-dessus du détail par critère (déjà affiché mais sans titre clair). `Modals.jsx` (comparateur 2 candidats) : label relabellisé en cohérence, pas de nouveau bouton ajouté (hors scope, composant différent).
- **Audit sécurité** : zéro endpoint backend créé/modifié — uniquement affichage de données déjà exposées par les DTOs existants (scopées candidat → ses propres candidatures, recruteur → candidatures de son entreprise via `get_entreprise_for_user()`). RAS.

**Suivi des candidatures — nouveau statut `PRESELECTION` + chronologie visuelle** : le client voulait 6 étapes visibles (Candidature envoyée, Reçue, En cours d'étude, Présélection, Entretien, Décision) — le workflow n'avait que 5 statuts sans "Présélection" distincte. Décision prise avec l'utilisateur : ajouter un vrai statut backend plutôt qu'un habillage purement visuel.
- **Backend** : `Candidature.STATUTS` (`jobs/models.py`) — nouveau choix `PRESELECTION` inséré entre `EN_COURS` et `ENTRETIEN`. `CharField` simple (pas de contrainte DB) → migration `0056_alter_candidature_statut` générée par `makemigrations` (no-op schéma, reflète juste les nouveaux choix Django). `UpdateCandidatureStatusAPIView` (`jobs/views/candidatures.py`) : whitelist de statuts valides déjà dérivée dynamiquement de `Candidature.STATUTS` (`[choix[0] for choix in Candidature.STATUTS]`) → aucun changement de validation nécessaire. Nouvelle branche `elif nouveau_statut == 'PRESELECTION'` ajoutée pour la notification en boîte de réception (type `INFO` par défaut, comme `EN_COURS` — pas d'email envoyé, comme avant pour ce palier).
- **Frontend** : nouveau composant réutilisable `Components/CandidatureTimeline.jsx` — chronologie horizontale scrollable à 6 nœuds (icônes `Send`/`Inbox`/`Search`/`ListChecks`/`Users`/`CheckCircle2`), le dernier nœud "Décision" prend la couleur succès (vert, `Retenu(e)`) ou danger (rouge, `Refusé(e)`) une fois tranché, sinon reste neutre. Mapping `STATUT_STAGE_INDEX` : `RECUE`→1 (Envoyée+Reçue comptent comme acquises ensemble, il n'existe aucun état "avant RECUE"), `EN_COURS`→2, `PRESELECTION`→3, `ENTRETIEN`→4, `RETENU`/`REFUSE`→5. Intégrée dans `MesCandidatures.jsx` (candidat, toujours visible sur chaque carte) et `DetailCandidature.jsx` (recruteur, sous l'en-tête du panneau détail).
- Ajouté partout où le statut est mappé : `STATUT_LABELS`/`getBadgeStyle`/`getMessageStatut` (`MesCandidatures.jsx`), `STATUTS_LABELS` (dropdown recruteur `DetailCandidature.jsx` — `Object.entries().map()` donc l'ordre d'insertion dans l'objet suffit), `AdminCandidatures.jsx` (filtre + badge), `DashboardRecruteur.jsx` (compteur "en traitement" inclut désormais `PRESELECTION`), label `Modals.jsx` (comparateur). Nouveaux tokens `theme.js` : `statusPurpleSoft`, `candidatureStatutStyles.PRESELECTION`, section `timelineNode*`/`timelineLine*`.
- **Non touché** : `BoiteReception.jsx` (switch sur `type_notif`, pas sur `statut` — le type `INFO` par défaut couvre déjà PRESELECTION correctement, aucun changement requis).
- **Piège tests** : les libellés d'étape de la chronologie (`"Reçue"`, `"Entretien"`, `"Refusé(e)"`) coïncident textuellement avec les badges de statut déjà testés dans `MesCandidatures.test.jsx` → 2 tests passés de `getByText` à `getAllByText(...).length >= 1` (un seul élément attendu devenait 2, `getByText` lève une erreur "multiple elements found" si non unique).
- **Audit sécurité** : `PRESELECTION` traverse exactement le même chemin de permission que les 5 statuts existants (`get_entreprise_for_user()` + `get_membre_role() in _ROLES_ACTION`, INVITE toujours bloqué en écriture) — aucune nouvelle surface d'attaque.

**Dashboard recruteur — graphiques + "Candidats recommandés"** : le client jugeait le dashboard déjà bien, demandait juste d'ajouter des graphiques (évolution candidatures/recrutements, pipeline) et une section candidats recommandés (score, points forts, points de vigilance, explication du matching). **Zéro appel backend supplémentaire** — `DashboardRecruteurAPIView` (`jobs/views/recruteur.py`) retournait déjà `offres[].candidatures[]` avec `score_matching`/`details_matching`/`statut`/`date_postulation` en entier (via `CandidatureRecruteurDTO`, déjà prefetch `candidatures__candidat`) : tout calculé côté client dans `DashboardRecruteur.jsx`.
- **Graphiques** : projet sans librairie de charts (`package.json` ne liste ni recharts ni chart.js) — nouveau composant réutilisable `Components/MiniAreaChart.jsx` (SVG inline, pattern déjà établi par `RadarChart` de `MesCandidatures.jsx`) pour la courbe "Évolution (6 derniers mois)" à 2 séries (candidatures reçues en indigo, recrutements/RETENU en emerald). "Pipeline de recrutement" : barres horizontales simples (divs, pas de SVG) sur les 6 statuts (couleurs alignées sur `PIPELINE_STAGES`, mêmes teintes que `candidatureStatutStyles`/`CandidatureTimeline`).
- **Candidats recommandés** : agrège `offres[].candidatures[]` de toutes les offres du recruteur (hors candidatures rapides, hors score null), trie par `score_matching` desc, top 5. Réutilise `details_matching.highlights.points_forts` (points forts) et `.highlights.ecarts` relabellisé **"Points de vigilance"** (cohérence de vocabulaire avec la demande client, même donnée que "Axes d'amélioration" ailleurs dans l'app). "Explication du matching" = une seule phrase (`explications.specialite`, ou `experience`, ou la première disponible) plutôt qu'un debug complet — le detail par critère complet reste accessible via "Pourquoi ce score ?" dans `DetailCandidature.jsx`, pas dupliqué ici. Carte cliquable → `/dashboard/offres/{offreId}` (pas de deep-link vers la candidature précise, la route ne le permet pas).
- **Décision produit** : pas de 3ᵉ graphique séparé pour "recrutements" — fusionné dans la courbe "Évolution" comme 2ᵉ série, évite un widget redondant avec les mêmes données temporelles.
- **Audit sécurité** : aucune route/endpoint ajouté, uniquement de l'agrégation client-side sur des données déjà scopées à l'entreprise du recruteur connecté (`get_entreprise_for_user()` en amont dans `DashboardRecruteurAPIView`). RAS.

---

## 🆕 SESSION 28/07/2026 — sécurité mdp FR, confirmToast, spécialité IA, questionnaire modale, export Excel

**Contexte** : session longue avec plusieurs correctifs UX/backend distincts, tous sur `feature/us13-aout` (créée depuis `main` après un premier commit direct sur `main` : fix message d'erreur inscription + ajustements navbar/IA, poussé avec permission explicite de l'utilisateur).

**Messages d'erreur mot de passe en français** : `LANGUAGE_CODE` passé de `'en-us'` à `'fr'` dans `settings.py` — active les traductions françaises déjà intégrées à Django pour `AUTH_PASSWORD_VALIDATORS` (trop court, trop courant, entièrement numérique, similaire à un champ utilisateur). Combiné à un fix frontend antérieur (`RegisterCandidat.jsx` affiche le premier message d'erreur backend réel au lieu de "Une erreur est survenue"). Un test (`test_reset_password_trop_court_rejete`) mis à jour pour matcher le message français.

**`window.confirm()` remplacé partout** — popups navigateur natifs ("localhost dit...") jugés non professionnels. Nouveau `utils/confirmToast.jsx` : mini-modale maison (store module + `<ConfirmModalHost />` monté une fois dans `App.jsx`), pas `toast.custom()` de react-hot-toast (cassait sous Vitest — mock manuel de `react-hot-toast` dans plusieurs fichiers de test sans `.custom`, plus un souci de résolution ESM/CJS). 13 occurrences remplacées dans 9 fichiers (Admin : Broadcast, Entreprises, Offres, Users, Métiers, SystemLogs ; Candidat : ProfilCandidat, AlertesEmploi ; Recruteur : GestionOffre). 7 fichiers de tests adaptés (rendent `<ConfirmModalHost />` à côté du composant testé, cliquent "Confirmer"/"Annuler" au lieu de mocker `window.confirm`).

**Spécialité candidat mal classée par l'IA (bug réel signalé)** : `extract_specialite()` utilisait `resoudre_domaine_depuis_texte()` sur tout le texte brut du CV (vote majoritaire par fréquence de mots sur 50 fiches `MetierReferentiel`) → classait un "Ingénieur IA" en secteur Agricole. Root cause en 2 couches :
1. `_candidats_pour_experience()` (RAG des indices donnés à l'agent Groq) ne triait jamais par pertinence — requête `OR` sur mots-clés retournait les 10 premiers résultats dans l'ordre brut de la base (secteur A=Agricole en tête par ordre d'insertion). Fix : exclusion des mots trop génériques (`_MOTS_GENERIQUES` : ingénieur, cadre, chargé, développement...) + tri par nombre réel de mots communs, liste vide plutôt que suggestion trompeuse si titre 100% générique.
2. `classifier_domaines_experiences()` : la spécialité globale (élément `[PROFIL]`) était injectée avec un index négatif (`-1`) dans le même batch Groq que les expériences — l'IA l'ignorait silencieusement dès qu'il y avait plusieurs vraies expériences (renvoyait un tableau JSON positionnel 0..n-1 sans jamais inclure -1). Fix : décalage séquentiel (`[PROFIL]`=index 0, expériences=1..n côté prompt, re-décalées côté retour) au lieu d'un index spécial.
3. Règle d'abstention du prompt ("si trop vague, réponds vide") s'appliquait aussi au `[PROFIL]` — un titre composé ("Ingénieur IA ET Cadre administratif") était jugé trop ambigu et laissé vide. Fix : exception explicite pour `[PROFIL]` — ne jamais s'abstenir, classer selon la **première fonction mentionnée** dans le titre (décision produit validée avec l'utilisateur).
Testé 3x de suite sur le vrai CV de l'utilisateur → `L18 Systèmes d'information et de télécommunication` stable.

**Génération IA de l'offre (`GenererOffreIAAPIView`) cassée depuis l'ajout Domaine/Sous-domaine** : `specialite` envoyée au prompt Groq était le code brut (`"L18"`) au lieu d'un libellé lisible. Fix : traduction code→libellé via `Domaine.objects.filter(code=...)` avant construction du prompt (même pattern que le fix Suggestions Carrière d'une session précédente).

**Questionnaire créable directement depuis "Publier une offre"** : le sélecteur de questionnaire existait déjà dans `CreateJob.jsx` mais le lien "Créer un questionnaire" menait vers `/questionnaires` (perte du formulaire d'offre en cours). Nouveau composant réutilisable `Components/CreateQuestionnaireModal.jsx` (logique de création extraite de `Questionnaires.jsx`, pas de refactor de la page existante pour ne pas risquer ses tests). **Bug trouvé en testant** : le `<form>` interne de la modale était imbriqué dans le `<form>` de la page offre (invalide en HTML) → cliquer sur "Créer le questionnaire" soumettait le formulaire PARENT (rechargement de page, perte des données saisies). Fix : `<form>` interne remplacé par `<div>` + bouton `type="button"` avec `onClick` manuel.

**CV upload — feedback visuel amélioré** : nouveau champ `cv_pdf_maj_le` (migration `0055`) sur `ProfilCandidat`, mis à jour à chaque upload (parser ou formulaire normal) ; la modale "Remplissage automatique" affiche désormais une carte "CV actuel : `nom.pdf` — Mis à jour le [date]" avant la dropzone au lieu d'un écran neutre qui ne changeait jamais. Bouton supprimer CV ajouté dans `ProfilCandidat/index.jsx` (`remove_cv_pdf` côté backend, même pattern que `remove_photo_profil`).

**Checklist "champs manquants" sur la page Profil Candidat** : réutilise exactement la logique déjà présente dans `ReviewCandidature.jsx` (`CHAMPS_PROFIL` avec labels + tests) — affichée en badges ambre sous la jauge de complétion, factorisée dans `useProfilCandidat.js` (`champsManquants`).

**Suggestions Carrière — badges "IA Cloud"/"Regex" retirés** de la modale parser CV (jugés inutiles par l'utilisateur, exposaient un détail d'implémentation sans valeur pour le candidat).

**Export Excel candidatures (notes + commentaires recruteur)** : deux nouveaux endpoints backend (`jobs/views/recruteur.py`, openpyxl déjà en dépendance) —
- `GET jobs/dashboard/offres/<id>/export-excel/` : candidatures d'une offre (date, candidat, email, tél, statut, score IA, 4 notes détaillées, note globale /20, commentaire recruteur).
- `GET jobs/dashboard/export-excel/` : toutes offres confondues de l'entreprise (+ colonne Offre).
Boutons "Exporter Excel" dans `GestionOffre` (par offre) et `DashboardRecruteur` (global).

**Date d'entretien absente de la notification boîte de réception** (signalé par l'utilisateur, l'email de convocation l'affichait déjà) : `jobs/views/candidatures.py`, la notification en base pour le statut `ENTRETIEN` inclut maintenant la date/heure formatée (`"...Le 05/08/2026 à 14h00."`) quand `candidature.date_entretien` est renseignée.

**Tests** : 338/338 frontend ✅, backend suite complète ✅ (relancée après chaque fix significatif).

---

## 🆕 SUITE SESSION REFONTE MOBILE (19/07/2026, tard) — style, bottom nav, bugs réels

**Contexte** : après les 8 lots structurels/perf (voir section précédente), l'utilisateur a testé sur téléphone réel via ngrok et remonté 3 problèmes concrets avec captures d'écran — l'exercice a servi de rappel que l'audit statique ne remplace pas un test réel.

**Bug réel #1 — overflow horizontal sur ProfilCandidat** : le nom de fichier CV (`Curriculum_Vitae_Officiel_BOUMAZA_Rafik-1_CHPwxq6.pdf`) faisait déborder toute la page horizontalement au lieu d'être tronqué. Cause : `truncate` sur un `<span flex-1>` sans `min-w-0` sur la chaîne de parents flex (`<a>` et son `<div flex-1>`) — anti-pattern classique, les flex-items ont `min-width:auto` par défaut donc un texte long pousse tout le layout plus large que le viewport au lieu d'être coupé. Fix : `min-w-0` ajouté sur `<div className="flex-1">` et `<a>` (`ProfilCandidat/index.jsx` section CV). Vérifié qu'aucun autre endroit du code n'a le même pattern non protégé (`CVTheque.jsx` avait déjà `min-w-0` correctement).

**Bug réel #2 — navigation candidat dupliquée sur mobile** : `CandidatLayout.jsx` a une sidebar desktop (`aside w-full md:w-60`) qui se rabattait en **pleine largeur** sur mobile au lieu de disparaître — résultat : les mêmes liens (Mon profil, Mes candidatures, Boîte de réception, etc.) apparaissaient DEUX fois : dans le hamburger ET en grosse carte blanche redondante en haut de chaque page candidat. Fix : `<aside>` passé en `hidden md:block` (uniquement desktop/tablette, le hamburger/bottom nav couvrent le mobile). Padding de page resserré en même temps (`px-6 py-8` → `px-4 py-5` sur mobile, `md:` restaure l'ancien).

**Style visuel — flat touch-first sur JobCard** : l'utilisateur a précisé vouloir un vrai changement visuel (pas seulement structurel), en gardant les couleurs de marque indigo/teal. `tw.jobCardShell` : `rounded-2xl` sur mobile (vs `rounded-xl` desktop inchangé via `sm:`), `active:scale-[0.98]` (feedback de press immédiat, `sm:active:scale-100` pour ne pas l'appliquer au hover desktop). Badges/tags passés de gris neutre discret à blocs de couleur pleins et contrastés (`jobCardBadgeNeutral` : `bg-slate-100` → `bg-indigo-50 text-indigo-700 font-bold`, `jobCardTagSuccess` : `bg-emerald-50` → `bg-emerald-100 text-emerald-800 font-semibold`). Titre/nom entreprise en `text-base font-bold` sur mobile (vs `text-sm font-semibold` desktop). Autres écrans (Accueil, Dashboard) pas retouchés visuellement cette session — JobCard est le composant le plus visible/répété (Accueil + Recherche offres).

**Bottom nav mobile — 3 nouveaux composants** (`Components/BottomNav{Candidat,Guest,Recruteur}.jsx`) : barre fixe en bas d'écran, 5 destinations max, visible uniquement `<md` (sous 768px). Complète le hamburger, ne le remplace pas — le hamburger garde les liens secondaires.
- `BottomNavCandidat` (candidat connecté) : Accueil, Offres, Profil, Candidatures, Messages (badge non-lus).
- `BottomNavGuest` (visiteur non connecté, portail candidat) : Accueil, Offres, Secteurs, Entreprises, Connexion.
- `BottomNavRecruteur` (recruteur/membre équipe connecté) : Tableau, Publier, CVthèque, Spontanées, Paramètres — filtré par rôle via `authService.peutFaire()` (un INVITE ne voit pas Publier/CVthèque, identique à la logique du dropdown desktop existant).
- Branché dans `App.jsx` (`showBottomNavCandidat`/`showBottomNavGuest`/`showBottomNavRecruteur`, mutuellement exclusifs selon `role`/`recruteurPortal`/`isLogged`), pas affiché sur les routes admin. `<main>` reçoit `pb-16 md:pb-0` quand une bottom nav est visible pour ne pas passer dessous.
- **Décision produit** : pas de bottom nav pour les visiteurs non connectés du portail recruteur (landing page) — déjà dense en CTA, jugé non prioritaire.

**Hamburger allégé pour éviter le triple-doublon** (Navbar + NavbarRecruteur) : une fois la bottom nav en place, le hamburger dupliquait ses liens en dessous de 768px. `mobileLinkClass(path, dupBottomNav)` : les liens déjà couverts par la bottom nav sont masqués `hidden md:flex` — **cachés sous 768px, réaffichés en tablette portrait 768-1024px** où il n'y a pas de bottom nav et le hamburger reste la seule navigation. Candidat : Accueil/Offres masqués (guest : + Secteurs/Entreprises/Connexion). Recruteur : Tableau/Publier/CVthèque/Spontanées/Paramètres masqués, seuls Questionnaires et Déconnexion restent visibles sous 768px.

**Hamburger converti en dropdown ancré (pas plein écran)** : après le trim ci-dessus, le panneau plein écran (`fixed inset-0`, ajouté plus tôt dans la session) laissait un immense vide blanc pour 2-3 liens restants (ex. visiteur : juste "Par région" + "S'inscrire" + "Espace recruteur"). Remplacé par un menu déroulant ancré sous la navbar (`tw.mobileMenuSheet` : `fixed top-16 inset-x-0 rounded-b-2xl shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto` — hauteur = contenu, pas viewport) + `tw.mobileMenuBackdrop` (fond assombri cliquable pour fermer, `bg-slate-900/40`). Header interne dupliqué (logo + bouton fermer) supprimé — la vraie navbar reste visible au-dessus, son bouton hamburger (devenu ✕) suffit à fermer. Tokens `mobileOverlayPanel`/plein écran retirés de `theme.js`, remplacés par ces deux nouveaux.

**Tests** : 338/338 vert après chaque étape (bug fixes, style JobCard, 3 bottom nav, trim hamburger, conversion dropdown) — aucune régression sur toute cette suite de changements.

---

## 🆕 SESSION REFONTE MOBILE (19/07/2026)

**Contexte** : l'utilisateur jugeait le mode mobile "bas de gamme" (perf + polish). Audit exploratoire complet du frontend avant travail (skill `ui-ux-pro-max`), plan en 8 lots exécutés d'un coup avec `npx vite build` + suite Vitest complète vérifiés après chaque lot (338/338 systématiquement). Aucune couleur de marque ni rendu desktop modifiés — uniquement des ajustements responsive/perf.

**`theme.js`** : nouveaux tokens `tapTarget` (`min-h-[44px] min-w-[44px] flex items-center justify-center`, cibles tactiles), `mobileOverlayPanel` (`fixed inset-0 z-[60] bg-white flex flex-col overscroll-contain`, panneau nav mobile plein écran), `modalPanelMobile` (variante bottom-sheet définie mais **non consommée** — voir limite ci-dessous). `jobCardApplyButton`/`jobCardGhostButton` agrandis en `py-2.5 sm:py-1.5 text-sm sm:text-xs` (desktop inchangé). `modalOverlay` passe de `items-center` à `items-end sm:items-center` — toutes les modales de l'app (12 fichiers, backdrop partagé) s'ancrent désormais en bas d'écran sur mobile au lieu de flotter au centre, desktop identique.

**Navigation mobile** (`Navbar.jsx`, `NavbarRecruteur.jsx`) : le panneau hamburger, auparavant inséré en flux normal sous la navbar (`lg:hidden` + `border-t`), est remplacé par un overlay `fixed inset-0` plein écran avec header interne (logo + bouton fermer) et liste scrollable. Scroll-lock du `<body>` via `useEffect` sur l'état d'ouverture (`document.body.style.overflow`). Boutons hamburger/fermer et liens mobiles portés à ≥44px (`tw.tapTarget`, `min-h-[44px]`).

**Grids sans fallback mobile** corrigés (pattern `grid-cols-1 sm:grid-cols-2 md:grid-cols-N` déjà standard au projet) : `JobDetail.jsx` (×2), `ParametresRecruteur.jsx` (skeleton loader), `DetailCandidature.jsx`, `AdminUsers.jsx`. Deux grids `grid-cols-2` volontaires laissés tels quels (mini-stats 2×2 `DashboardRecruteur.jsx`/`QuiSommesNous.jsx`, commentés comme un choix délibéré, pas un bug).

**Tap targets & lisibilité** : tous les `text-[10px]` remontés à `text-xs` (12px, minimum lisible mobile) dans `JobsList.jsx`, `DashboardRecruteur.jsx`, `AdminOffres.jsx`.

**Tables admin non responsive** : bug confirmé `overflow-hidden` (au lieu de `overflow-x-auto`) sur le wrapper `${tw.card}` — la table coupait/comprimait son contenu sur mobile sans scroll possible. Corrigé en généralisant le pattern déjà correct de `AdminCandidatures.jsx`/`MonEquipe.jsx` (`<div className="overflow-x-auto"><table className="min-w-[Npx]">`) sur `AdminOffres.jsx`, `AdminUsers.jsx`, `AdminAuditLogs.jsx`, `AdminMetiers.jsx`, `AdminEntreprises.jsx`, `AdminDemandesPremium.jsx`, `AdminSystemLogs.jsx`.
**Décision produit** : pas de carte mobile dédiée par ligne (pattern déjà utilisé dans `DashboardRecruteur.jsx`) généralisée à ces 7 tables admin — jugé disproportionné (risque de doublons DOM dans les tests RTL type `getByText` + effort élevé) pour un panel interne à faible trafic mobile. Le scroll horizontal résout le bug réel (contenu coupé) ; la carte mobile reste une amélioration future si le besoin se confirme.

**Perf images** : `loading="lazy"` + `width`/`height` HTML natifs (anti-CLS) sur les images répétées en liste/grille : logos entreprise (`JobsList.jsx`, `Entreprises.jsx`), avatars candidats (`CVTheque.jsx`, `AdminUsers.jsx`, `GestionOffre/index.jsx`). Logos navbar (au-dessus de la ligne de flottaison) : dimensions ajoutées sans `lazy`. Code-splitting existant (`React.lazy` sur la majorité des pages) laissé tel quel — `Home`/`JobsList`/`JobDetail`/`Login` restent statiques (pages d'entrée les plus visitées, un lazy-load dégraderait le temps perçu).

**`prefers-reduced-motion`** : règle globale ajoutée dans `index.css` (`animation-duration`/`transition-duration` ramenés à ~0 quand l'utilisateur l'a demandé au niveau OS) — couvre l'unique `@keyframes` custom du projet (`fadeInDown`) et toutes les transitions Tailwind standards.

**Limite connue** : `modalPanelMobile` (bottom-sheet avec coins arrondis seulement en haut, poignée de fermeture) a été défini dans `theme.js` mais n'est pas consommé — les 12 fichiers utilisant des modales référencent uniquement `tw.modalOverlay` (le fond) et définissent leur propre classe de panneau en dur (`rounded-xl`/`rounded-2xl` sur tous les coins, pas de token `modalPanel` central à réviser en un seul endroit). Un vrai bottom-sheet par modale nécessiterait une passe fichier par fichier — non fait cette session, `modalOverlay` (ancrage bas d'écran) apporte déjà l'essentiel du gain UX à risque quasi nul.

---

## 🆕 SESSION AGENT IA CLASSIFICATION DOMAINE (19/07/2026)

**Contexte** : le choix du Domaine ANEM par expérience se trompait trop souvent — il était décidé dans le même appel Groq géant que toute l'extraction CV (titre, expériences, formations, infos perso), noyé parmi 87 codes sans ancrage sur de vraies données.

**Nouveau `jobs/domaine_agent.py`** — agent Groq **dédié**, appelé séparément après `parse_cv()` (pas dans le prompt d'extraction) : `classifier_domaines_experiences(experiences)`.
- Pour chaque expérience, `_candidats_pour_experience()` cherche par mots-clés (`icontains`, mots ≥4 lettres) des appellations `MetierReferentiel` réelles ressemblant au poste/à la description → fournies à l'IA comme indices concrets (RAG léger, réduit l'hallucination vs deviner un code parmi 87 dans le vide).
- Un seul appel Groq batché pour toutes les expériences du CV (pas un appel par expérience — coût token).
- Réponse JSON `{"classifications": [{"index", "domaine_code", "raison"}]}` — `raison` demandée pour forcer un vrai raisonnement mais jamais stockée. Codes validés contre `Domaine.objects.values_list('code')` avant usage — un code halluciné est ignoré.
- Si l'agent échoue ou ne répond rien pour un index → repli sur l'ancienne logique (`_deviner_secteur_experience` : choix Groq inline du prompt d'extraction, puis `resoudre_domaine_depuis_texte` par mots-clés).

**`jobs/referentiel_utils.py`** : nouvelle fonction publique `domaines_list_pour_prompt()` (liste "code — libellé" des 87 domaines, cache 1h `jobs_domaines_prompt_list`) — mutualisée entre le prompt d'extraction CV et le nouvel agent. `cv_parser._domaines_list_pour_prompt()` délègue désormais à celle-ci (plus de duplication).

**`jobs/views/ia.py`** (`ParserCVAPIView.post`) : appelle `classifier_domaines_experiences(experiences)` une fois sur toutes les expériences extraites, avant la boucle qui assigne `exp['secteur']`.

**Décision produit** : pas de champ `sous_domaine` ajouté sur `ExperienceCandidat`/`ProfilCandidat` malgré la demande initiale — rien ne le consomme (matching reste au niveau Domaine), et ça aurait nécessité une migration + toucher tout le frontend pour zéro valeur mesurable. Le sous-domaine ANEM est fait pour classifier des appellations précises (5786 lignes), pas des expériences en langage libre. Priorité donnée à la précision du Domaine seul, qui est ce qui alimente réellement le matching.

**Tests** : `test_api_metiers.py` 16/16 ✅ après le changement (aucune régression, le nouveau flux ne touche pas le modèle/l'API testée).

---

## 🆕 SESSION NOMENCLATURE ANEM (18/07/2026)

**Contexte** : l'ANEM a fourni un fichier officiel (`NAME.xlsx`, 5790 lignes) contenant la nomenclature algérienne des métiers. Remplacement complet (pas d'ajout) de deux systèmes existants :
1. `SECTEURS_CHOICES` (19 codes plats codés en dur type `IT`/`BTP`/`FINANCE`) → 16 secteurs officiels ANEM (`A`.."P")
2. `MetierReferentiel` plat (13 388 lignes ROME+Emploitic, un seul champ `secteur` texte libre) → hiérarchie complète Secteur → Domaine (87) → Sous-domaine (36) → Appellation (5786, = nouveau `MetierReferentiel`)

**Nouveaux modèles** (`jobs/models.py`, migration `0054`) : `Secteur` (code, libelle), `Domaine` (FK Secteur, code type "A11", libelle), `SousDomaine` (FK Domaine, libelle). `MetierReferentiel` restructuré : `titre` (= appellation), `domaine` FK, `sous_domaine` FK nullable, `code_fiche`, `fiche_metier`, `secteur_code` dénormalisé. Anciens champs `secteur`/`niveau_experience`/`mots_cles` supprimés.

**Matching au niveau Domaine (pas Secteur)** : `OffreEmploi.specialite`, `ProfilCandidat.specialite`/`secteur_souhaite`, `ExperienceCandidat.secteur` restent des `CharField` simples (pas de FK — éviterait un refactor massif de matcher.py/serializers/frontend) mais stockent désormais un **code Domaine** (ex `"L18"`) au lieu d'un code Secteur. Le préfixe du code Domaine encode son Secteur (`"L18"[0] == "L"`) → sert à déduire la compatibilité "même secteur" dans `matcher.py` sans table de proximité codée en dur. `ProfilEntreprise.secteur_activite` reste au niveau Secteur (16 codes) — une entreprise n'est pas cantonnée à un seul domaine.

**`jobs/matcher.py`** : `_CODES_PROCHES` (dict 19×19 codé en dur) et `SYNONYMES_SPECIALITE` supprimés. `specialites_compatibles()` : code Domaine identique → 1.0, même Secteur (même 1ère lettre) → 0.85, sinon fuzzy `difflib` ≥0.72 en filet de sécurité.

**`jobs/constants.py`** : `SPECIALITES_MAPPING`/`SYNONYMES_SPECIALITE` supprimés, remplacés par résolution dynamique via `jobs/referentiel_utils.resoudre_domaine_depuis_texte()` (recherche par mots-clés dans `MetierReferentiel.titre`, retourne le `domaine.code` le plus fréquent) — utilisé par `cv_parser.extract_specialite()` et `matcher._experience_pertinente()` (fallback).

**Nouvel endpoint `GET jobs/nomenclature/`** (`NomenclatureAPIView`, `jobs/views/offres.py`) : retourne l'arbre complet (secteurs+domaines+sous_domaines, ~140 nœuds), caché 1h (`jobs_nomenclature`). Filtré côté client en cascade, même pattern que wilaya→commune. `domaines[].id` exposé en plus de `code` — nécessaire pour soumettre le FK numérique depuis l'admin (`AdminMetiers.jsx`).

**`MetierReferentielAPIView`** (autocomplete public) : accepte désormais `secteur`, `domaine`, `sous_domaine` en query params en plus de `search`.

**Frontend — `SecteurDomaineSelect.jsx`** (nouveau composant réutilisable) : cascade Secteur → Domaine → Sous-domaine (affiché seulement si non vide pour le domaine choisi). Charge la nomenclature une seule fois via `jobsService.getNomenclature()` (cache module-level). Intégré dans `CreateJob.jsx`, `JobsList.jsx`, `CVTheque.jsx`, `CandidaturesSpontanees.jsx`, `ProfilCandidat/Modals.jsx` (spécialité candidat, secteur souhaité, secteur d'expérience), `AdminMetiers.jsx`.

**`OffresParSecteur.jsx`** : nouveau `iconsMap` 16 entrées (A→Sprout ... P→Users), fallback Briefcase inchangé.

**Migration des données existantes** : commande `import_anem_nomenclature.py` (`--dry-run`, `--migrate-existing-data`, `--file`). Import réel : 16 secteurs, 87 domaines, 36 sous-domaines, 5786 métiers. Les 6 offres + 8 profils + 28 expériences existants (base dev) remappés automatiquement via un dict `ANCIEN_VERS_DOMAINE` (19 anciens codes → code Domaine ANEM le plus pertinent, vérifié manuellement contre les libellés réels après import, ex: `IT`→`L18` "Systèmes d'information et de télécommunication", `BTP`→`F11`, `JURIDIQUE`→`P16` "Droit").

**`requirements.txt`** : ajout `openpyxl==3.1.5` (lecture du fichier Excel ANEM).

**Tests** : backend `test_api_metiers.py` réécrit pour le nouveau modèle (25/25). Frontend : ajout du mock `getNomenclature` dans 7 fichiers de test consommant `SecteurDomaineSelect`, `OffresParSecteur.test.jsx` mis à jour avec les nouveaux codes secteur. 338/338 frontend + 283/283 backend au vert, `npx vite build` propre.

---

## 🆕 SESSION PARSER CV + REFONTE ADMIN (17/07/2026)

### Parser CV (`jobs/cv_parser.py`) — bugs réels trouvés sur CV utilisateurs
- **`find_sections()`** : le matching de mot-clé était en sous-chaîne (`keyword in line_clean`) au lieu de `line_clean.startswith(keyword)` → une ligne comme "Arabe Langue maternelle..." était prise pour un nouveau header de section (contenait "langue") et son contenu était perdu. Fix : `startswith`.
- **Format d'expérience "Du DATE au DATE : ..."** : nouvelle fonction `_extract_experiences_du_au()` — gère le cas réel où le titre du poste est sur la ligne PRÉCÉDENTE (pas fusionné avec la ligne de dates), avec retrait rétroactif de la puce erronée ajoutée par erreur à l'expérience précédente.
- **Format de formation "Mois AAAA : Diplôme à Établissement"** : nouvelle fonction `_extract_formations_mois_annee()`, même logique de continuation.
- **Téléphone** : `extract_phone()` réécrit — gérait mal les regroupements de chiffres autres que 2-2-2-2-2 (ex: "698 560 337" en 3-3-3) et l'indicatif entre parenthèses `(+213)`.
- **Langues** : regex de niveau élargie (`bon niveau`, `notions`, `scolaire` ajoutés), charset élargi pour capter "IELTS : B2" sans couper au `/`.
- **Description tronquée** : `description[:500]` → `description[:3000]` (CV à nombreuses puces coupés à mi-phrase).
- **1 seul appel Groq au lieu de 4** (`PROMPT_CV_COMPLET` fusionné) — réduit le token usage ~4x, corrige un 429 TPM ; `text[:12000]` + `max_tokens=8000` (rééquilibré après la fusion).
- **`ProfilCandidatAPIView.put()`** : troncature auto des champs `User` trop longs + auto-préfixe `https://` sur `linkedin`/`github` (CV contiennent souvent "linkedin.com/..." sans protocole → `URLField` rejetait avant).
- **`_deviner_secteur_experience()`** (nouveau, `jobs/views/ia.py`) : devine le secteur de chaque expérience extraite (recherche `MetierReferentiel` puis fallback mots-clés puis `'AUTRE'` — ne retourne jamais `None`).
- **Limite connue non résolue** : CV à mise en page colonnes (ex. dates alignées à droite) peuvent scrambler l'ordre du texte extrait par `pdfplumber`, regroupant tous les headers de section en tête sans contenu entre eux — cassant le modèle séquentiel de `find_sections()`. Pas encore corrigé ; fallback recommandé = laisser Groq gérer (plus robuste à l'ordre) plutôt que réécrire l'extraction PDF.

### Refonte Admin — design + fonctionnalités
- **Sidebar** (`AdminLayout.jsx`) : regroupée en sections (Principal/Modération/Communauté/Système), fond clair (plus de slate-900 sombre), lien actif = `bg-indigo-50` + barre latérale indigo. Badges de notification (offres/entreprises/demandes premium en attente) alimentés par `AdminStatsAPIView`.
- **Nouvelle page** `AdminDemandesPremium.jsx` (+ route `/admin-taftech/demandes-premium`) : expose l'endpoint `AdminDemandesPremiumAPIView` qui existait déjà côté backend mais n'était jamais utilisé côté frontend.
- **AdminUsers.jsx** : migré vers `tw.*` (était 100% Tailwind en dur) + onglets par rôle (Tous/Candidats/Recruteurs/Admins) avec compteurs, alimentés par un filtre `role` + champ `counts` ajoutés à `AdminUsersListAPIView`.
- **AdminSystemLogs.jsx** : migré vers `tw.*`.
- **Cartes KPI dashboard** (`AdminStatistiques.jsx`) : emojis remplacés par icônes lucide-react dans des chips colorés, recentrées sur la charte TafTech (indigo/teal), ambre/rouge réservés aux alertes.
- **Filtres + tri serveur** : `statut` sur Offres/Candidatures, `ordering` sur Offres/Entreprises/Utilisateurs/Candidatures (nouveau paramètre backend `ORDERING_FIELDS` par vue, whitelist stricte des champs triables). En-têtes cliquables via composant réutilisable `SortableTh.jsx`.
- **Actions groupées** : sélection multiple + "Approuver la sélection" sur Offres et Entreprises (boucle `Promise.all` sur l'endpoint de modération existant, pas de nouvel endpoint bulk côté backend). Volontairement PAS ajouté sur Candidatures (le changement de statut appartient au workflow recruteur/équipe, pas à l'admin).
- **Skeleton loaders** : nouveau composant partagé `SkeletonTableRows.jsx`, remplace le texte "Chargement..." clignotant sur les 4 tableaux admin (Offres/Candidatures/Entreprises/Utilisateurs).
- **Tooltips d'info** (`TooltipIcon` existant réutilisé) : ajoutés sur les KPI ambigus (Recrutements réussis, Offres en attente...), colonnes Score IA/Note entretien, tarif Premium.
- **Accessibilité** : anneau de focus clavier (`tw.focusRing`, nouveau token) + `aria-label` ajoutés sur les boutons d'action icône-seule (Offres/Entreprises/Utilisateurs/Demandes Premium).
- **Décision produit** : pas de bouton "Supprimer" généralisé dans l'admin — seul bloquer/débloquer par défaut, suppression réservée aux cas déjà sûrs (offres non approuvées sans candidature). Historique de recrutement = valeur légale/business, suppression accidentelle plus coûteuse que son absence.
- **5 comptes de test supprimés** (`test_e2e@example.com`, `test_repro@example.com` ×4) — créés le même jour, jamais réels, supprimés en cascade (profil + formations) après confirmation explicite.

---

## 🆕 SESSION UI/UX + PAGES LÉGALES + NOMBRE DE POSTES (15/07/2026, tard)

**Footers refaits (candidat + recruteur)** : structure identique aux deux (Marque / Contact / Réseaux sociaux / Légal), même hauteur/espacement, fond `bg-slate-950`, police Poppins (chargée dans `index.html`) appliquée uniquement au footer via `style={{fontFamily}}`. Colonne "Espace candidat"/"Espace recruteur"/"Plateforme" retirées — jugées redondantes avec la navbar. Réseaux sociaux réels : Facebook `Taftechemploi`, Instagram `taftechemploi`, LinkedIn `oranemploi`, WhatsApp `+213770123440`.

**Nouvelles pages publiques** (routes ajoutées dans `App.jsx`, liées depuis les footers en `target="_blank"`) :
- `/confidentialite` — Politique de confidentialité (sommaire sticky, catégories de données réelles incl. NIN, durée conservation 5 ans candidats / 10 ans recruteurs — valeurs provisoires faute de mieux, à confirmer)
- `/cgu` — CGU, marquées **version provisoire** (bandeau d'alerte) tant que raison sociale/immatriculation ne sont pas fournies par l'utilisateur
- `/contact` — formulaire de contact fonctionnel (envoie un email réel, voir `ContactMessageAPIView`) + FAQ accordéon + horaires (Dim-Jeu 08h-17h, choisi par défaut)
- `/qui-sommes-nous` — mission/valeurs/services + **stats réelles en direct** (`jobs/stats/public/`, jamais de chiffres inventés)

**Portail recruteur vs candidat sur pages partagées** : `App.jsx` lit un paramètre `?portail=recruteur` (en plus du rôle connecté) pour forcer la navbar recruteur sur ces 4 pages quand on y arrive depuis le footer recruteur, même déconnecté. Voir `forcePortalParam` dans `AppContent()`.

**Fix bug navbar recruteur fantôme** : `estRecruteurConnecte` vérifiait seulement `portal === "recruteur"` sans vérifier qu'un rôle actif existe → si `loginPortal` restait à "recruteur" en localStorage (session expirée) alors que `userRole` était vide, la navbar recruteur s'affichait sur les pages candidat même déconnecté. Fix : `role === "ADMIN" || (!!role && portal === "recruteur")`.

**Fix bug déconnexion candidat → recruteur** : `authService.logout()` et l'intercepteur 401 (`axiosConfig.js`) décidaient de la redirection selon `estMembreEquipe` au lieu du portail de connexion réel (`loginPortal`) — un candidat membre d'une équipe recruteur atterrissait sur `/recruteurs/connexion` en se déconnectant du portail candidat. Fix : redirection basée sur `loginPortal` uniquement.

**Fix bug focus perdu — champ "Mots-clés" (JobsList)** : `FiltersPanel` était un composant défini à l'intérieur de `JobsList`, donc recréé à chaque frappe → React démontait/remontait tout le panneau de filtres, perdant le focus après chaque lettre. Fix : converti en variable JSX (`filtersPanel`) au lieu d'un composant-fonction.

**Token `tw.bgPrimarySolid` manquant** : utilisé à 11 endroits (Home, JobsList, Entreprises, JobDetail) mais jamais défini dans `theme.js` → boutons sans aucun style (texte brut). Ajouté dans `theme.js`.

**Nouveau champ `nombre_postes`** sur `OffreEmploi` (migration `0052`, défaut 1) — visible/éditable dans CreateJob, DashboardRecruteur (modale modifier), GestionOffre, JobDetail (tuile info), JobsList (badge si >1). Exposé dans `OffreEmploiSerializer` (`__all__`), `OffreEmploiCreateDTO`, `OffreEmploiPublicSerializer`, `OffreDashboardDTO`.

**Nouveau champ `adresse_complete`** sur `ProfilEntreprise` (migration `0051`, texte libre, indépendant de `wilaya_siege`) — configurable dans ParametresRecruteur → Mon entreprise, affiché en carte Google Maps embed sur **EntreprisePublic uniquement** (pas sur JobDetail : la localisation d'une offre doit toujours suivre le wilaya/commune de l'offre elle-même, pas le siège de l'entreprise — un siège à Alger avec une offre à Oran doit afficher Oran).

**Suppression d'offre recruteur** : nouvel endpoint `DELETE /api/jobs/dashboard/offres/<id>/supprimer/` (`SupprimerOffreAPIView`) — autorisé uniquement sur offres `EN_ATTENTE`/`REJETEE`, jamais sur une offre `APPROUVEE` (clôturer seulement), refuse si des candidatures existent déjà. Bouton corbeille + confirmation inline dans DashboardRecruteur, réservé aux rôles UTILISATEUR+.

**Sécurité** : CSP (`middleware.py`) n'avait pas de `frame-src` → bloquait silencieusement les iframes Google Maps en prod (`DEBUG=False`), fonctionnait par accident en dev (CSP Report-Only). Ajouté `frame-src https://www.google.com https://maps.google.com`. `ContactMessageAPIView` durci : validation format email + troncature de tous les champs à leur longueur max. `UpdateProfilEntrepriseAPIView` tronque désormais chaque champ à son `max_length` modèle avant `save()` (évitait un 500 Postgres sur une valeur trop longue).

---

## 🎨 MIGRATION THEME.JS — EN PAUSE (statut au 15/07/2026)

**Contexte** : chantier de centralisation de toutes les couleurs Tailwind (`text-*`, `bg-*`, `border-*`, `ring-*`, `placeholder-*`) vers des tokens `tw.*` dans `taftech_frontend/src/theme.js`, au lieu de classes écrites en dur dans chaque composant. Mis en pause car trop long (plusieurs passes d'agents ont échoué sur limite de quota Claude) — **ne pas relancer de migration automatique en masse sans demande explicite**.

`tailwind.config.js` redéfinit déjà : `indigo` = bleu logo TafTech (600 = `#204883`, exact logo), `teal` = vert TafTech (600 = `#3a8226`, 700 = `#307020` — nuance utilisée par la majorité des boutons/textes `bg-teal-700`/`text-teal-700`, calibrée AA ≥4.5:1), `slate` décalé d'une teinte (plus foncé). Couleurs échantillonnées au pixel sur `src/assets/logo-taftech.png` (bleu `#204883`, vert `#67af57` à l'origine, puis assombri en 600/700 pour respecter le contraste texte). Les classNames restent `text-indigo-600`/`bg-teal-700`/`text-slate-500` etc. dans le code — la migration ne change QUE l'endroit où la classe est écrite (dans `tw.*` au lieu d'en dur), pas la couleur elle-même.

**Important Tailwind v4** : `index.css` doit contenir `@config "../tailwind.config.js";` juste après `@import "tailwindcss";` — sans cette ligne, Tailwind v4 **ignore silencieusement** `tailwind.config.js` (mode CSS-first par défaut, JS config non chargé). C'est ce qui causait "aucun changement visible" lors des premiers tests de couleur — pas un problème de cache navigateur.

### ✅ Fichiers entièrement migrés (utilisent `tw.*`, plus aucune couleur en dur)
- **Components** : InfoBanner.jsx, Tooltip.jsx
- **Admin** : AdminAuditLogs, AdminBroadcast, AdminCandidatures, AdminComptes, AdminEntreprises, AdminLayout, AdminMetiers, AdminOffres
- **Auth** : ForgotPassword, Login, RegisterCandidat, RegisterRecruteur, ResetPassword
- **Candidat** : AlertesEmploi, BoiteReception, CandidatLayout, MesCandidatures, OffresSauvegardees, ProfilCandidat/index.jsx, Settings, SuggestionsCarriere
- **Public** : Entreprises, Home, JobDetail, JobsList, OffresParRegion, OffresParSecteur
- **Recruteur** : AccepterInvitation, CVTheque, CandidaturesSpontanees, CreateJob

### 🟡 Partiellement migrés (utilisent déjà `tw.*` par endroits, mais gardent encore des classes couleur en dur — à terminer)
- Components : Footer.jsx, FooterRecruteur.jsx, JobCard.jsx, Navbar.jsx, NavbarRecruteur.jsx
- Admin : AdminStatistiques, AdminSystemLogs, AdminUsers
- Candidat : ProfilCandidat/Modals.jsx
- Recruteur : DashboardRecruteur, EntreprisePublic, GestionOffre/DetailCandidature, GestionOffre/Modals, GestionOffre/index, MonEquipe, ParametresRecruteur, Portal/LandingRecruteur (Hero + bande stats migrés, sections Fonctionnalités/Comment ça marche/Avantages/FAQ pas encore), Portal/ForgotPasswordRecruteur, Portal/LoginRecruteur, Portal/PremiumPage, Portal/PremiumSuccessPage, Questionnaires, ReviewCandidature

### Tokens `tw.*` disponibles dans theme.js (déjà créés, à réutiliser en priorité — ne pas dupliquer)
`buttonPrimary/Secondary/Ghost/Accent`, `card/cardHover/cardSelected`, `input/inputSearch`, `badgePrimary/Accent/Success/Neutral/Error`, `pageTitle/pageSubtitle/sectionTitle/sectionLabel/bodyText/mutedText/metricNumber`, `pageContainer/pageBackground`, `textMuted/textMuted700/textStrong/textSubtle/textLight/textOnDark/iconMuted/iconStrong`, `surface*`, `border*`, `divideBase`, tokens primary (indigo)/teal séparés (`textPrimary`, `bgTeal`, etc.), `navLink*` (desktop/mobile, actif/inactif, indigo/teal), `dropdownItem*`, `dropdownPanel`, `iconButton`, `navbarShell`, `modalOverlay(Strong)`, `modalPanel`, `pageTitleGrand/Petit`, `bodyTextGrand/Petit` (respectent le système 2 niveaux de densité), `footer*` (variante indigo candidat + variante teal/slate recruteur), `jobCard*`, `tooltipPanel/Arrow`, tokens couleurs ponctuelles (blue/orange/violet/purple), `auditAction*`, `score High/Mid/Low`, tokens AUTH (`authInput(Teal)`, `authLabel`, `otpBoxInput`, `heroPanelDark`, etc.), tokens LANDING RECRUTEUR (`landingHeroBorder`, `buttonTealSolidLg`, `landingStatsPanelDark`, `landingFeatureCard`, `landingFaq*`, etc.).

### Pour reprendre la migration
1. Lire `src/theme.js` en entier pour voir les tokens déjà là.
2. Prendre UN fichier à la fois de la liste "partiellement migrés", remplacer les classes couleur restantes par des tokens existants ou en créer de nouveaux si besoin.
3. Lancer `npx vite build` après chaque fichier.
4. Ne pas lancer plusieurs agents en parallèle sur ce chantier — ça a saturé le quota Claude plusieurs fois de suite sans finir un dossier complet.

---

## 👤 PROFIL UTILISATEUR

**FILALI Zoheir** — Fondateur TafTech
- Git user: `Zoheirfll` — email: `zoheir.fll31@gmail.com`
- Master 2 ADSI — Université Oran 1
- Cadre administratif SOMIZ (paie 4000 employés)
- Développeur Full-Stack React + Django + PostgreSQL
- Mentalité "architecture avant code" — pense en systèmes
- Passionné IA locale, automatisation métier
- Localisation : Oran, Algérie
- Préfère les réponses **courtes et directes** (pas de listes exhaustives inutiles)
- Parle **français** — répondre toujours en français

---

## 🚨 RÈGLES DE COLLABORATION — IMPÉRATIVES

1. 🔴 **TOUJOURS afficher le code AVANT/APRÈS dans le chat avant chaque Edit** — montrer `old_string` et `new_string` en blocs de code dans la réponse. Ne jamais faire un Edit silencieux.
2. **Ne jamais merger vers `main` sans permission explicite** de l'utilisateur
3. **Ne jamais committer `.env`** — il est dans `.gitignore` et doit y rester
4. **Rester sur la feature branch courante** — ne pas changer de branche seul
5. **Ne pas prendre d'initiatives non demandées** — faire seulement ce qui est demandé
6. **Demander confirmation avant toute action destructive** (reset, force push, suppression fichiers)
6. **Ne jamais résoudre Cypress** sans demande explicite — les tests E2E sont déprioritisés
7. Toujours vérifier que le build Vite passe (`npx vite build`) avant de déclarer une tâche terminée
8. **Mettre à jour CLAUDE.md après chaque changement technique** — tout nouveau comportement, décision, ou correction doit être reflété ici avant le commit. CLAUDE.md est la source de vérité du projet pour les futures sessions.
9. **Audit sécurité obligatoire à chaque nouvelle fonctionnalité** — après toute création de page/route/endpoint, vérifier explicitement : les routes protégées côté frontend (`CandidatRoute`/`RecruteurRoute`/`AdminRoute`/`RoleGuard`), les permissions backend (`IsAuthenticated`, vérification de `role`, `get_entreprise_for_user()`/`get_membre_role()` si pertinent), et qu'aucune donnée sensible n'est exposée sans contrôle d'accès. Documenter le résultat dans CLAUDE.md.

---

## 🏗️ PROJET : TafTech

Plateforme de recrutement en ligne ciblant le marché algérien.

- **Backend**: Django 5.2 + DRF — `taftech_backend/`
- **Frontend**: React 18 + Vite + Tailwind CSS v4 — `taftech_frontend/`
- **DB**: PostgreSQL port **5433** (pas 5432 — conflit avec autre projet SOMIZ)
- **Auth**: JWT SimpleJWT (access 15 min / refresh 7 jours)
- **IA Matching**: Algorithme classique (difflib + synonymes) — PAS Groq
- **IA Analyse**: Groq API (llama-3.1-8b-instant) — à la demande uniquement
- **PDF**: ReportLab
- **Email**: Django SMTP Gmail
- **Tests Backend**: Django TestCase + APIClient — 282/282 ✅
- **Tests Frontend**: Vitest + @testing-library/react — 338/338 ✅
- **Tests E2E**: Cypress 13.17.0 — 7 fichiers tous stables ✅
- **GitHub**: https://github.com/Zoheirfll/Taftech

**Attention** : SOMIZ tourne aussi sur port 8000 — vérifier le bon backend.

---

## 🎨 DESIGN SYSTEM

### Tailwind CSS v4 — classes canoniques
- `bg-linear-to-br` (pas `bg-gradient-to-br`)
- `shrink-0` (pas `flex-shrink-0`)

### Couleurs
- Primaire : `indigo-600` (#4f46e5)
- Accent : `amber-500`
- Texte : `slate-900 / slate-700 / slate-500 / slate-400`
- Backgrounds : `white / slate-50 / slate-100`
- Bordures : `slate-200`
- Success : `emerald-600` — Danger : `red-600` — Warning : `amber-600`

### Composants standards
- **Inputs** : `px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`
- **Bouton primaire** : `bg-indigo-600 text-white rounded-lg hover:bg-indigo-700`
- **Bouton annuler** : `bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200`
- **Modales** : `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50`
- **Cards** : `bg-white border border-slate-200 rounded-xl`

### Système deux niveaux de densité visuelle

**"Grand" — pages publiques et profil** (`text-2xl/3xl font-extrabold`, `text-base`, `py-3`, `rounded-2xl`):
> JobDetail, MesCandidatures, ProfilCandidat, DashboardRecruteur, OffresParRegion, OffresParSecteur, EntreprisePublic, ParametresRecruteur, AlertesEmploi, OffresSauvegardees, Settings (candidat), BoiteReception, SuggestionsCarriere

**"Petit" — auth et outils denses** (`text-xl/2xl font-bold`, `text-sm`, `py-2.5`, `rounded-xl`):
> Login, RegisterCandidat, RegisterRecruteur, ForgotPassword, ResetPassword, ReviewCandidature, CandidaturesSpontanees, Questionnaires, CVTheque, GestionOffre

### Mobile Responsive
Pattern à appliquer sur tous les grids :
```
grid-cols-1 sm:grid-cols-2 md:grid-cols-N
```
Ne jamais commencer un grid directement à `grid-cols-2` sans breakpoint mobile.

### 🎨 Rebranding couleurs (tailwind.config.js) — 15/07/2026
`taftech_frontend/tailwind.config.js` redéfinit les couleurs Tailwind par défaut (les classNames dans le code restent inchangés, ex. `bg-indigo-600`, `text-teal-700`, `text-slate-500` — seule la valeur hexadécimale change) :
- `indigo` → bleu logo TafTech exact (`indigo-600` = `#204883`)
- `teal` → vert vif TafTech, AA-safe (`teal-600` = `#3a8226`, `teal-700` = `#307020` contraste 6:1)
- `slate` → décalé d'une teinte, plus foncé partout (`slate-400` = ancien `#64748b`, etc.) pour un texte plus lisible/moins délavé

### Textes plus foncés (15/07/2026)
Remplacement global dans tout `src/` :
- `text-slate-500` → `text-slate-700` (paragraphes/texte secondaire)
- `text-slate-400` → `text-slate-600` (icônes/labels très clairs), sans toucher aux `placeholder-slate-400` (comportement normal des champs de saisie)

### Navbars — fond opaque (15/07/2026)
`Navbar.jsx` et `NavbarRecruteur.jsx` : `bg-white/95 backdrop-blur-md` → `bg-white` (fond blanc plein, plus de transparence/flou au scroll).

### LandingRecruteur.jsx — badges retirés (15/07/2026)
Suppression du badge "🇩🇿 Plateforme de recrutement algérienne" (hero) et du badge "IA activée ✓" (carte stats) — jugés redondants par l'utilisateur.

---

## 🏗️ ARCHITECTURE BACKEND

### jobs/views/ (package — ancien views.py)
- `notifications.py` — NotificationListAPIView, MarkNotificationReadAPIView, PublicStatsAPIView, EntrepriseDetailAPIView
- `offres.py` — JobListAPIView, JobDetailAPIView, JobCreateAPIView, UpdateOffreRecruteurAPIView, CloturerOffreAPIView, ConstantsAPIView. Toutes les actions (create/update/cloturer) utilisent `get_entreprise_for_user()` + `get_membre_role()` — INVITE bloqué, UTILISATEUR/ADMIN/PROPRIETAIRE autorisés
- `profils.py` — ProfilCandidatAPIView, ExperienceAPIView, FormationAPIView, alertes, favoris, paramètres
- `candidatures.py` — PostulerAPIView, PostulerRapideAPIView, MesCandidaturesAPIView, UpdateCandidatureStatusAPIView, DeleteCandidatureAPIView, EvaluerCandidatureAPIView, Top5CandidatsAPIView. Actions (update/delete/evaluer) utilisent `get_entreprise_for_user()` + `get_membre_role()` — INVITE bloqué
- `recruteur.py` — DashboardRecruteurAPIView (retourne `est_premium`, `premium_expire_at`, `premium_active_since`, `premium_nb_mois`, **bloc 403 `PREMIUM_EXPIRE` si membre non-propriétaire et premium expiré**), CVThequeView, questionnaires, spontanées, paramètres, **DemanderActivationPremiumAPIView**, **EnvoyerRecuPremiumAPIView**
- `admin.py` — AdminPagination + toutes vues admin + exports CSV + **AdminDemandesPremiumAPIView** (GET liste toutes, PATCH activer avec nb_mois → étend premium_expire_at)
- `ia.py` — OffresRecommandeesAPIView, ParserCVAPIView, MetierReferentiel, SuggestionsCarriereAPIView, AnalyseCarriereGroqAPIView, AnalyseGroqRecruteurAPIView. Helper `_appel_groq()` mutualisé.
- `bulletin.py` — GenererBulletinPDFAPIView
- `equipe.py` — EquipeAPIView, InviterMembreAPIView, AccepterInvitationAPIView, **EquipeAuditLogAPIView** (`GET jobs/equipe/audit/` — 100 derniers logs, PROPRIETAIRE/ADMIN seulement). Helper `_log(user, entreprise, action, detail)` — appelé dans equipe, offres, candidatures, accounts/views.

### jobs/serializers/ (package)
- `questionnaires.py` — ReponseChoixSerializer, QuestionnaireSerializer, ReponseCandidatSerializer
- `offres.py` — EntrepriseSimpleSerializer, OffreEmploiSerializer, OffreEmploiCreateDTO, EntreprisePublicSerializer
- `profils.py` — ExperienceSerializer, FormationSerializer, ProfilCandidatDTO, AdminUserSerializer, ParametresNotificationsSerializer
- `candidatures.py` — CandidatInfoDTO (avec helper `_profil()`), PostulerDTO, CandidatureRecruteurDTO, MesCandidaturesDTO
- `divers.py` — OffreSauvegardeeSerializer, AlerteEmploiSerializer, NotificationSerializer, CandidatureSpontaneeSerializer, MetierReferentielSerializer
- `entreprise.py` — EntrepriseDashboardDetailSerializer
- `dashboard.py` — OffreDashboardDTO

### jobs/constants.py
Centralise toutes les constantes métier — importer depuis là, pas depuis models.py.
WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES, WILAYAS_MAPPING, DIPLOMES_MAPPING, SPECIALITES_MAPPING, SYNONYMES_SPECIALITE

### accounts/
- `views.py` — rate limiting (`AnonRateThrottle`), hack Cypress isolé (`if settings.DEBUG`), expiry code reset (10 min), **bloc login membre si premium expiré** (code `PREMIUM_EXPIRE`), **`RenvoyerCodeVerificationAPIView`** POST `/api/accounts/renvoyer-code/`
- `models.py` — CustomUser + champ `code_verification_created_at`

### jobs/management/commands/
- `envoyer_alertes.py` — alertes emploi par email + notification. Option `--dry-run`.
- `relance_maj_cv.py` — relance candidats inactifs 60 jours. Option `--dry-run`.
- `archiver_offres_expirees.py` — clôture auto les offres dont `date_expiration < today`. Option `--dry-run`.
- `scraper_emploitic.py` — scrape titres de postes depuis emploitic.com via Playwright (subprocess pour éviter bug greenlet Windows). Importe dans MetierReferentiel. Options `--pages N` `--dry-run`. Playwright requis (`pip install playwright && python -m playwright install chromium`).
- `nettoyer_referentiel.py` — nettoie MetierReferentiel : supprime format ROME slash (masculin/féminin), reconstruit titre masculin propre, corrige H/F, noms de villes, tirets, déduplique. Option `--dry-run`.
- `corriger_secteurs_referentiel.py` — mappe codes ROME non standard (SERVICE_PUBLIC, AGRICULTURE, COMMUNICATION, SPECTACLE, ARTS) vers nos SECTEURS_CHOICES, devine secteur pour entrées AUTRE via mots-clés. Option `--dry-run`.

---

## 🏗️ ARCHITECTURE FRONTEND

### Services/ — pattern façade
`jobsService.js` est une façade qui réexporte tout. Les composants importent toujours `{ jobsService }`.
Sous-services : `candidatService.js`, `adminService.js`, `recruteurService.js`, `iaService.js`

### utils/mediaUrl.js — URLs médias centralisées
```js
import { mediaUrl } from "../utils/mediaUrl";
// En dev (VITE_MEDIA_BASE_URL vide) → URLs relatives → proxy Vite gère /media/
// En prod → VITE_MEDIA_BASE_URL=https://taftech.dz → URLs absolues
```
Ne plus jamais hardcoder `http://127.0.0.1:8000` dans les composants — utiliser `mediaUrl(path)`.

### utils/errorReporter.js — Télémétrie frontend
```js
import { reportError } from "../utils/errorReporter";
// Dans chaque catch block : reportError("CODE_ERREUR", error)
```
Tous les catch blocks dans tous les fichiers frontend ont `reportError()`.

### Réponses API paginées Django
```js
// Toujours gérer les deux formats
return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
```

### details_matching — deux structures possibles
```js
// Toujours utiliser :
const scores = DM.scores || DM;
```

### Structure Pages/
```
Pages/
├── Admin/
├── Candidat/
│   ├── ProfilCandidat/ (index.jsx + useProfilCandidat.js + Modals.jsx)
│   ├── MesCandidatures.jsx, BoiteReception.jsx, OffresSauvegardees.jsx
│   ├── AlertesEmploi.jsx, SuggestionsCarriere.jsx, Settings.jsx
├── Recruteur/
│   ├── GestionOffre/ (index.jsx + useGestionOffre.js + DetailCandidature.jsx + Modals.jsx)
│   ├── DashboardRecruteur.jsx, CreateJob.jsx, CVTheque.jsx
│   ├── CandidaturesSpontanees.jsx, ParametresRecruteur.jsx
│   ├── Questionnaires.jsx, ReviewCandidature.jsx, EntreprisePublic.jsx
├── Public/
│   ├── Home.jsx, JobsList.jsx, JobDetail.jsx
│   ├── OffresParRegion.jsx, OffresParSecteur.jsx
└── Auth/
    ├── Login.jsx, ForgotPassword.jsx, ResetPassword.jsx
    ├── RegisterCandidat.jsx, RegisterRecruteur.jsx
```

---

## ✅ FEATURES COMPLÈTES

### 🧩 CMS Admin (contenu du site géré sans code) — chantier terminé session 20/08/2026
Demande initiale de l'employeur : gérer sans intervention technique prix, abonnements, avantages, FAQ, secteurs/métiers/compétences, articles, bannières, pages du site, et contrôle IA. Secteurs/métiers existaient déjà (nomenclature ANEM, `AdminMetiers.jsx`) — 7 sous-projets ajoutés, chacun brainstormé et validé séparément avant implémentation :

| Sous-projet | Panel admin | Modèles clés | Consommateurs publics |
|---|---|---|---|
| Prix/Abonnements/Avantages | `/admin-taftech/premium-config` | `PremiumPlan`, `PremiumAvantage` | `PremiumPage.jsx`, `LandingRecruteur.jsx` |
| FAQ | `/admin-taftech/faq` | `FaqItem` (catégorie GENERAL/RECRUTEUR/PREMIUM) | `ContactezNous.jsx`, `LandingRecruteur.jsx`, `PremiumPage.jsx` |
| Compétences | `/admin-taftech/competences` | `CompetenceReferentiel` | Autocomplete `ProfilCandidat/index.jsx` (suggestions, champ reste libre) |
| Blog/Articles | `/admin-taftech/articles` | `Article`, `ArticleCategorie` | `Blog.jsx` (`/blog`), `ArticleDetail.jsx` (`/blog/:slug`) |
| Bannières | `/admin-taftech/bannieres` | `SiteAnnonce` (bandeau global, 1 active), `BanniereAccueil` (carrousel) | `SiteAnnonceBar.jsx` (toutes pages), `BanniereCarousel.jsx` (Home) |
| Pages du site | `/admin-taftech/pages` | `PageStatique` | `PageStatiqueGenerique.jsx` (`/cgu`, `/confidentialite`, `/pages/:slug`), bloc éditorial dans `QuiSommesNous.jsx` |
| Configuration IA | `/admin-taftech/ia-config` | `AIConfig` (singleton) | Lu par `jobs/ai_engine.py::call_ai()` (Groq/Ollama réel, pas juste un champ de config) — aucune page publique |

**Décisions transverses qui traversent tout le chantier** :
- **Contenu riche** (Blog + Pages du site) : éditeur TipTap (`Components/RichTextEditor.jsx`, réutilisé par les deux), sortie HTML sanitizée côté backend (`bleach`) à chaque `save()` — défense en profondeur même si seul le rôle ADMIN y écrit aujourd'hui.
- **Cache** : chaque endpoint public utilise `django.core.cache` (timeout 5 min à 1h selon la volatilité), invalidé explicitement à chaque écriture admin — pattern déjà établi par `jobs_constants` avant ce chantier, reconduit partout.
- **Sécurité** : tous les endpoints admin `IsAdminUser` + check `request.user.role == 'ADMIN'` ; toutes les lectures publiques passent par `PublicReadThrottle` (scope créé en tout début de cette session, cf. section Sécurité) ; aucun brouillon/contenu inactif jamais exposé côté lecture publique (filtré côté serveur, pas côté client).
- **"Intelligence artificielle" mal compris au départ** : l'employeur ne voulait pas de génération de contenu IA mais un contrôle des paramètres (modèle, kill-switch par fonctionnalité) — clarifié par question ciblée avant de coder, a évité de construire la mauvaise fonctionnalité.
- **Piège récurrent (3 fois cette session)** : ajouter un nouvel appel `jobsService.*` dans un composant déjà couvert par un test cassait ce test silencieusement (mock incomplet) — `PremiumPage.test.jsx`, `Home.test.jsx` corrigés en cours de route. Réflexe à garder : toute nouvelle dépendance `jobsService` dans un fichier testé doit être ajoutée au mock du test correspondant.

**Historique détaillé** (design, alternatives écartées, bugs trouvés en testant) : voir les 7 sections "SESSION 20/08/2026" juste en dessous, une par sous-projet, dans l'ordre où ils ont été construits.

### 🔐 Authentification
- Inscription candidat/recruteur, login JWT, déconnexion, mot de passe oublié, vérification email
- Rôles : CANDIDAT / RECRUTEUR / ADMIN
- Changer MDP disponible dans Settings (candidat) ET ParametresRecruteur (onglet Mon profil) — adapté compte Google
- Verrouillage compte (5 échecs → verrou 15 min)
- `GuestRoute` : redirige les utilisateurs déjà connectés hors des pages login/inscription (ADMIN → /admin-taftech, RECRUTEUR/membre → /dashboard, CANDIDAT → /profil)

### 💼 Offres & Candidatures
- CRUD offres recruteur, modération admin (APPROUVEE / EN_ATTENTE / REJETEE)
- Candidature TafTech (profil + snapshot + score IA) et candidature rapide (sans compte)
- Statuts : RECUE / EN_COURS / PRESELECTION / ENTRETIEN / RETENU / REFUSE — chronologie visuelle 6 étapes (`Components/CandidatureTimeline.jsx`) côté candidat et recruteur
- Entretien programmé + email auto, email refus configurable
- Évaluation post-entretien (4 critères /5 = note /20)
- Bulletin PDF (logo + score si >=60% + évaluation + signatures)
- Questionnaires (CRUD + types COURT/LONG/NUMERIQUE/CHOIX_UNIQUE/CHOIX_MULTIPLE + questions disqualifiantes)

### 👤 Profil Candidat
- Titre (autocomplete ROME), photo, CV PDF, bio, LinkedIn, GitHub
- Compétences, langues, expériences, formations, préférences
- Service militaire, permis, passeport, niveau expérience
- Score complétion, parser CV IA (extrait depuis PDF), snapshot à la postulation

### 🏢 Profil Entreprise
- Nom + registre commerce verrouillés après validation, logo, description, taille
- Page publique vitrine, CVThèque avec filtres + favoris
- Email refus auto avec variables ({prenom}, {titre_offre}, {nom_entreprise})

### 🤖 Matching IA
- Score 0-100% : Spécialité (0-25) + Diplôme (0-20) + Expérience (0-20) + Région (0-20) + Compétences (0-15)
- Radar SVG 5 critères (candidat + recruteur), comparateur 2 candidats
- Groq séparé du scoring — classique uniquement
- **Algo rewrite** : `matcher.py` entièrement réécrit — `_CODES_PROCHES` inter-secteurs, `_experience_pertinente()` vérifie `exp.secteur` (code SECTEURS_CHOICES), fuzzy 0.60, mots communs ≥5 lettres, synonymes. Déduplication périodes chevauchantes (`_deduire_annees_sans_chevauchement`). Score neutre 5/15 si compétences vides. Fallback `niveau_experience` 14/20.
- **`ExperienceCandidat.secteur`** : champ ajouté (CharField choices SECTEURS_CHOICES, nullable) — migration 0046. Affiché dans ProfilCandidat, ReviewCandidature, DetailCandidature. `normalizeExp()` convertit `""` → `null` avant API.
- **Référentiel MetierReferentiel** : 13 402 titres (11 065 ROME + ~2 337 Emploitic). Scraper Playwright via subprocess. Nettoyage format slash ROME. Secteurs corrigés (3 617 entrées).
- **Autocomplete titre_poste expériences** : même UX que titre profil — suggestions depuis MetierReferentiel via `handleExpTitreChange`.
- **Recherche référentiel par mots** : `MetierReferentielAPIView` utilise Q() par mot individuel → "ingenieur informatique" trouve "Ingénieur en informatique".

### 🔍 Recherche & Dashboard
- Multicritères avec debounce 400ms, pagination, offres recommandées IA
- KPIs dashboard recruteur, Top 5 shortlist IA, archives, correction offre rejetée

### 🔴 Dashboard Erreurs Système (Admin)
- Page `/admin-taftech/erreurs-systeme` → `AdminSystemLogs.jsx`
- API `GET /api/accounts/admin/system-logs/?page=N` — pagination 50/page
- API `DELETE /api/accounts/admin/system-logs/` — tout effacer
- Liste : date, message, URL, user + modal détail avec stack trace
- Lien dans sidebar AdminLayout avec icône AlertTriangle

### 📬 Notifications, Alertes, Admin
- Cloche navbar avec badge, boîte de réception, alertes emploi par email
- Panel admin : stats, journal d'audit (`AuditLog`), broadcast, données marché
- Référentiel ROME 11 090 métiers, suggestions carrière Groq

### 🔐 Vérification Email — Flux complet
- `RenvoyerCodeVerificationAPIView` : POST `/api/accounts/renvoyer-code/` — génère nouveau code, reset timer, envoie email
- `sessionStorage` clé `taftech_pending_verification` (candidat) / `taftech_pending_verification_recruteur` (recruteur) — persiste entre reloads, effacée après vérification réussie
- Login détecte `COMPTE_NON_VERIFIE` → redirige vers `/register` ou `/recruteurs/inscription` avec email pré-rempli
- `CookieTokenObtainView` propagation dict errors : `isinstance(detail, dict)` → retour direct sans stringify
- Bouton "Renvoyer le code" dans step 2 inscription candidat (indigo) et recruteur (teal)

### 🤖 IA Génération Offre (CreateJob)
- `GenererOffreIAAPIView` : POST `/api/jobs/ia/generer-offre/` — Premium uniquement, appel Groq direct avec `response_format: {type: 'json_object'}`
- Retourne `{description, missions, profil_recherche}` — pré-remplit les champs texte
- Utilise `get_entreprise_for_user()` (pas `request.user.profilentreprise`) pour vérifier premium membres équipe
- Frontend : bannière amber, bouton désactivé si titre/spécialité manquants, badge "Premium uniquement" si non-premium
- `_appel_groq()` NE PAS utiliser pour ce endpoint — strip les `*` qui corrompt le JSON → appel direct Groq

### 📝 Candidatures Spontanées
- Envoi sans compte, anti-doublon, vue recruteur filtrable, marquer lue / supprimer

### 🔑 Compte Google — Mot de passe recruteur
- `CustomUser.est_compte_google` : BooleanField (migration 0008) — marqué `True` à la création via `GoogleSocialAuthView`
- `MeAPIView` : `GET /api/accounts/me/` — retourne `est_compte_google`
- `ChangerMotDePasseAPIView` : `POST /api/accounts/changer-mot-de-passe/` — sans `ancien_mdp` si `est_compte_google=True`
- `Settings.jsx` candidat : formulaire adapté (Définir vs Modifier selon `est_compte_google`)
- `InviterMembreAPIView` : si compte Google → envoie lien invitation (pas ajout direct) pour que l'invité définisse un mot de passe
- `AccepterInvitationAPIView` GET : retourne `sans_mot_de_passe` (basé sur `est_compte_google`)
- `AccepterInvitationAPIView` POST : définit le mot de passe sans changer le rôle (garde accès espace candidat)
- Un membre d'équipe avec rôle `CANDIDAT` peut se connecter sur le portail recruteur grâce au check `est_membre_equipe` (serializer login ligne 119)

### 👥 Gestion d'Équipe Recruteur
- Rôles membres : PROPRIETAIRE / ADMIN / UTILISATEUR / INVITE
- `authService.peutFaire(minRole)` : hiérarchie `["INVITE","UTILISATEUR","ADMIN","PROPRIETAIRE"]`
- INVITE : accès lecture seule (candidatures, dashboard stats) — boutons d'action masqués (UI level, pas route level)
- ADMIN uniquement pour onglet "Mon entreprise" dans ParametresRecruteur
- `EquipeActionLog` : journal d'activité complet — log automatique sur CONNEXION, CREER_OFFRE, MODIFIER_OFFRE, CLOTURER_OFFRE, STATUT_CANDIDATURE, EVALUER_CANDIDATURE, INVITER_MEMBRE, RETIRER_MEMBRE, CHANGER_ROLE
- `EquipeAuditLogAPIView` : endpoint `GET /api/equipe/audit/` — visible PROPRIETAIRE/ADMIN, 100 derniers logs
- Journal accordéon lazy-load dans MonEquipe.jsx (ne charge qu'à l'ouverture)
- **Premium expiré → membres bloqués** : blocage au login (403 PREMIUM_EXPIRE) + blocage dashboard API ; PROPRIETAIRE toujours autorisé
- Onglet "Mon équipe" toujours visible pour PROPRIETAIRE même si premium expiré (pour gérer/supprimer membres)

### 🔗 Slug Entreprise
- `ProfilEntreprise.slug` — auto-généré depuis `nom_entreprise` via `slugify()` à la création (unicité garantie avec suffixe `-N` si collision)
- Migration 0044 : data migration peuple les slugs existants puis ajoute contrainte UNIQUE via `RunSQL` (pas `AlterField` — évite double création index `_like` PostgreSQL)
- URLs publiques : `/api/jobs/entreprises/<slug:slug>/` et `/api/jobs/entreprises/<slug:slug>/candidature-spontanee/`
- Frontend route : `/entreprise/:slug` (plus `:id`)
- QR code dans ParametresRecruteur encode `window.location.origin + /entreprise/{slug}`
- `slug` exposé dans `EntrepriseSimpleSerializer`, `EntreprisePublicSerializer`, `EntrepriseDashboardDetailSerializer`

### 🎨 Navbar Redesign
- Backdrop blur `bg-white/95 backdrop-blur-md` sur les deux navbars
- Liens nav : pill hover coloré (`hover:bg-indigo-50 rounded-lg` candidat, `hover:bg-teal-50` recruteur)
- Icônes sur tous les liens de navigation (lucide-react)
- Texte `text-slate-900` (noir) au lieu de `text-slate-600` (gris) sur les navbars
- Logo `h-16` dans conteneur `h-15` (légèrement débordant — effet voulu)
- ~80 occurrences de `text-slate-400/500` remplacées par `text-slate-600/700` sur 21 fichiers frontend

### 🧭 Onboarding Contextuel
- Composant `InfoBanner` (`src/Components/InfoBanner.jsx`) — bannière dismissable, localStorage `banner_${storageKey}`, variants indigo/teal/amber/slate
- Composant `Tooltip` + `TooltipIcon` (`src/Components/Tooltip.jsx`) — hover tooltip, prop `position` top/bottom/left/right
- Pages avec InfoBanner : ProfilCandidat, MesCandidatures, AlertesEmploi, BoiteReception, SuggestionsCarriere, Settings (candidat), DashboardRecruteur, CreateJob, CVThèque, CandidaturesSpontanees, Questionnaires, ParametresRecruteur
- Pages avec TooltipIcon : ProfilCandidat (complétion %), MesCandidatures (score), GestionOffre (tri score), DetailCandidature (note /20), JobDetail (score matching)
- Empty states améliorés : MesCandidatures (CTA vers /offres), CandidaturesSpontanees, JobsList

### 🤖 Matching IA CVthèque
- Dropdown "Comparer avec une offre" dans CVThèque — filtre sur offres APPROUVEE + active + non clôturée
- Paramètre `offre_id` dans `CVThequeView.get()` → calcule `calculer_score_matching` pour chaque candidat → trie par score desc
- Retourne `score_offre` dans chaque résultat (indexé par `user_id`, pas `pk`)
- Badge coloré sur chaque card : vert ≥70%, orange ≥40%, gris <40%
- Bandeau teal "Classement par compatibilité activé" avec bouton ✕
- `searchCVtheque` dans `recruteurService.js` passe `offre_id` dans les queryParams

### 📱 QR Code Entreprise
- Lib : `qrcode.react` (QRCodeCanvas)
- Visible dans **Paramètres → Mon entreprise** uniquement si entreprise approuvée
- Encode : `window.location.origin + /entreprise/{slug}` (dynamique, pas hardcodé)
- Bouton téléchargement PNG : `canvas.toDataURL("image/png")`

### ⏱ Expiration Automatique des Offres
- Champ `date_expiration` (DateField nullable) sur `OffreEmploi` — migration 0045
- `jours_restants` calculé dans `OffreEmploiSerializer` (SerializerMethodField)
- `OffreDashboardDTO` inclut `date_expiration` — visible dashboard recruteur, GestionOffre, admin
- `OffreEmploiCreateDTO` inclut `date_expiration`
- Command `archiver_offres_expirees` — clôture auto offres expirées, option `--dry-run`
- Crontab prod : `30 0 * * * python manage.py archiver_offres_expirees`
- CreateJob : boutons 30/60/90 jours + sélecteur date custom
- Affichage coloré : rouge ≤7j, orange ≤30j, teal ≤60j, vert >60j
- GestionOffre : sélecteur date inline pour modifier expiration (autorisé même si APPROUVEE)
- `UpdateOffreRecruteurAPIView` : si seul `date_expiration` dans le PATCH → pas de remise EN_ATTENTE

### ⭐ Système Premium (US11/12)
- `DemandeActivationPremium` : traçabilité complète des demandes (moyen, nb_mois, est_traitee, date_traitement)
- `ProfilEntreprise.est_premium_actif` : property qui vérifie `est_premium` + `premium_expire_at > now()`
- `premium_expire_at` + `premium_nb_mois` sur `ProfilEntreprise`
- Flow paiement recruteur : choix durée (1/3/6/12 mois) + CIB/EDAHABIA + envoi reçu email
- Prix avec remises : 6 mois −8% (11 040 DA), 12 mois −17% (19 920 DA)
- Page statut `/recruteurs/premium` : actif → dates activation/expiration/jours restants + section "envoyer reçu"
- Renouvellement/prolongation depuis page statut (étend l'expiry existante)
- Badge ⭐ Premium dans NavbarRecruteur (subtitle) + DashboardRecruteur (avec date expiry)
- Lien "Mon Premium ⭐" / "Passer Premium 🔒" dans dropdown navbar
- CVThèque bloquée intégralement pour non-premium (overlay)
- Analyse IA + Résumé IA bloqués dans GestionOffre pour non-premium
- Admin panel : onglet "Demandes Premium" dans `AdminEntreprises`, activation avec sélecteur mois
- Logout role-aware : recruteur → `/recruteurs/connexion`, candidat → `/login`
- 401 interceptor dans `axiosConfig.js` aussi role-aware

---

## 🏗️ MODÈLES DJANGO

### accounts/
- `CustomUser` (email, telephone, role, code_verification, code_verification_created_at, failed_login_attempts, locked_until, date_naissance, **est_compte_google** BooleanField default=False)
- `SystemErrorLog` (user, message, stack_trace, url, timestamp)

### jobs/
- `ProfilCandidat` (titre, cv_pdf, photo, bio, linkedin, github, wilaya, commune, diplome, specialite, competences, langues, mobilite, situation_actuelle, salaire_souhaite, secteur_souhaite, service_militaire, permis, passeport, niveau_experience, notif_mise_a_jour)
- `ExperienceCandidat` (**secteur** CharField choices SECTEURS_CHOICES nullable — migration 0046), `FormationCandidat`
- `ProfilEntreprise` (nom_entreprise, **slug** auto-généré depuis nom_entreprise, registre_commerce, secteur, wilaya, commune, description, taille, logo, est_approuvee, email_refus_auto, message_refus_auto, **est_premium**, **premium_expire_at**, property `est_premium_actif`)
- `OffreEmploi` (entreprise, titre, wilaya, commune, specialite, diplome, experience_requise, type_contrat, description, missions, profil_recherche, salaire_propose, **date_expiration** (DateField nullable), est_active, est_cloturee, statut_moderation, motif_rejet, questionnaire)
- `Candidature` (offre, candidat, statut, score_matching, details_matching, profil_snapshot, est_rapide, date_entretien, note_technique/communication/motivation/experience, note_globale, commentaire_evaluation)
- `CandidatureSpontanee`, `Notification`, `MetierReferentiel`, `Questionnaire`, `QuestionQuestionnaire`, `ReponseChoix`, `ReponseCandidat`, `ProfilCandidatFavori`
- **`DemandeActivationPremium`** (entreprise FK, moyen_paiement, nb_mois, est_traitee, date_demande, date_traitement) — migration 0040/0041
- **`EquipeActionLog`** (entreprise FK, membre FK User nullable, action CharField, detail, date auto) — migration 0043. Actions : CONNEXION, CREER_OFFRE, MODIFIER_OFFRE, CLOTURER_OFFRE, STATUT_CANDIDATURE, EVALUER_CANDIDATURE, INVITER_MEMBRE, RETIRER_MEMBRE, CHANGER_ROLE, AUTRE

---

## 🔒 SÉCURITÉ

| Mesure | Statut | Détail |
|--------|--------|--------|
| `.env` dans `.gitignore` | ✅ | SECRET_KEY, DB, EMAIL, GROQ — plus rien hardcodé |
| JWT expiry | ✅ | Access 15 min / Refresh 7 jours + blacklist |
| Rate limiting auth | ✅ | `AnonRateThrottle` sur tous les endpoints sensibles |
| Expiry code reset | ✅ | 10 min — `code_verification_created_at` vérifié |
| Hack Cypress isolé | ✅ | `if settings.DEBUG` — inactif en prod |
| Verrouillage compte | ✅ | 5 échecs → verrou 15 min |
| Validation MIME fichiers | ✅ | Magic bytes PDF/DOCX/JPEG/PNG — `jobs/validators.py` |
| Limite taille fichiers | ✅ | CV/lettre 5 Mo, logo/photo 2 Mo |
| CSP headers | ✅ | `SecurityHeadersMiddleware` |
| HTTPS/HSTS en prod | ✅ | Activé si `DEBUG=False` |
| Webhook nb_mois cap | ✅ | `max(1, min(nb_mois, 12))` — évite activation 999 mois |
| CVTheque API-level | ✅ | 403 si non-premium — pas seulement masquage UI |
| ErrorReport throttle | ✅ | `CypressAwareThrottle` — évite flood DB |
| Logging backend | ✅ | `print()` remplacés par `logger = logging.getLogger(__name__)` |
| reportError frontend | ✅ | Tous les catch blocks ont `reportError()` |
| Throttling par scope | ✅ | `public_read` 300/h + `write_action` 30/h (`jobs/throttles.py`), en plus de `auth`/`groq`/générique — session 20/08/2026 |
| Garde-fou secrets prod | ✅ | Démarrage refusé (`ImproperlyConfigured`) si `DEBUG=False` et `SECRET_KEY`/`EMAIL_HOST_*`/`GROQ_API_KEY`/`CHARGILY_*` manquants — session 20/08/2026 |
| Emails HTML — injection | ✅ | Vérifié : Django autoescape protège `message_refus_auto` dans `emails/refus.html`, testé avec payload `<script>` réel — session 20/08/2026 |
| Dépendances (CVE) | ✅ | `pip-audit` propre (Django/cryptography/sqlparse patchés) — session 20/08/2026. `npm audit` : 10 CVE restantes, toutes `devDependencies` (Cypress), zéro risque prod |
| Scan CVE automatisé | ✅ | Dependabot (`.github/dependabot.yml`, pip + npm, hebdo) — session 20/08/2026 |
| Anti-abus par email | ✅ | `EmailRateThrottle` (10/jour/email) en plus du throttle IP sur candidature rapide/spontanée/contact — session 20/08/2026 |

**Ne jamais committer `.env`.** Regénérer `SECRET_KEY` avant la prod.

---

## ⚠️ POINTS D'ATTENTION CRITIQUES

- PostgreSQL sur port **5433** (pas 5432)
- SOMIZ tourne aussi sur port 8000 — vérifier le bon backend
- `details_matching` a 2 structures selon ancienneté candidature :
  - Ancienne : `{region, diplome...}` directement
  - Nouvelle : `{scores:{...}, highlights:{...}, explications:{...}}`
  - → toujours utiliser `DM.scores || DM`
- `CandidatInfoDTO` et `profil_snapshot` incluent bio/linkedin/github
- `difflib` — stdlib Python, pas d'installation requise
- `ajuster_score_avec_groq` — supprimé, ne plus utiliser

---

## 🔧 DÉCISIONS TECHNIQUES

| Sujet | Décision | Raison |
|-------|----------|--------|
| Matching | Algorithme classique (difflib + synonymes) | Groq trop lent/coûteux à chaque postulation |
| Groq | Uniquement à la demande | Analyse recruteur + suggestions carrière |
| Snapshot | Figé à la postulation | Historique fidèle même si profil change |
| Suggestions | Seed = hash(user_id + spécialité) | Stable mais change si profil change |
| Bulletin PDF | Score si >= 60% seulement | Pas de mauvais score sur document officiel |
| PostgreSQL | Port 5433 | Conflit avec port 5432 (SOMIZ) |
| views/ | Package avec __init__ façade | urls.py inchangé, découpage lisible |
| serializers/ | Package avec __init__ façade | Imports inchangés dans les vues |
| constants.py | Fichier centralisé | Plus de duplication entre models/matcher/cv_parser |
| jobsService.js | Façade + 4 sous-services | Zéro changement dans les composants |
| Premium paiement | Manuel CIB/EDAHABIA + email | Pas de Chargily Pay pour l'instant |
| Premium durée | nb_mois × 2000 DA (remises 6M/12M) | Remises 8%/17% intégrées |
| Premium renouvellement | Étend depuis expiry actuelle si premium actif | Pas de perte de jours restants |
| Swagger DEFAULT_SCHEMA_CLASS | Injecté dans `REST_FRAMEWORK` dict **après** sa définition (bloc try/except déplacé sous REST_FRAMEWORK) | `NameError` si injecté avant — settings.py est exécuté de haut en bas |
| Slug migration PostgreSQL | Utiliser `AddField` (sans unique) + `RunPython` (populate) + `RunSQL ALTER TABLE ADD CONSTRAINT` | `AlterField` avec `unique=True` recrée l'index `_like` déjà créé par `AddField` → `DuplicateTable` |
| QR code URL | `window.location.origin` (dynamique) | Pas hardcodé — s'adapte dev/prod automatiquement |
| Navbar texte | `text-slate-900` sur les liens de navigation | Plus lisible, contraste WCAG |
| Vérification email persistence | sessionStorage (pas localStorage) — localStorage causait bug déconnexion admin | Clé auto-effacée à la fermeture navigateur, login redirect couvre le cas "revient le lendemain" |
| GenererOffreIA Groq | Appel direct sans `_appel_groq()` | `_appel_groq` strip les `**`/`*` ce qui corrompt le JSON retourné |
| Notification offre admin | Champ `destinataire` (pas `user`) + `titre` obligatoire | Modèle Notification a `destinataire` FK et titre requis |
| date_expiration PATCH APPROUVEE | Autorisé si seul ce champ dans payload | Ne remet pas l'offre EN_ATTENTE pour un simple changement de date |
| photo_profil snapshot | `.url` (pas `str()`) | `str()` retourne `photos/xxx.jpg` sans `/media/` — `.url` retourne le chemin complet |
| ExperienceCandidat.secteur | CharField choices nullable | `normalizeExp()` convertit `""` → `null` avant PUT — Django rejette string vide sur choices field |
| Matcher expérience pertinente | Vérifie `isinstance(secteur_exp, str)` avant usage | Mock retourne Mock object au lieu de None si pas vérifié |
| Parser CV — mode Remplacer/Ajouter | Modal parser CV propose un choix radio `parserMode` ("remplacer" par défaut / "ajouter"). Remplacer : écrase champs simples/photo/compétences/langues + supprime exp/formations existantes avant d'ajouter celles du CV. Ajouter : ne remplit que les champs vides, cumule compétences/langues sans doublon, ajoute exp/formations sans supprimer | Reparser un CV mis à jour créait des doublons d'expériences/formations en mode ajout systématique — l'utilisateur doit pouvoir choisir selon le cas (CV mis à jour vs profil à compléter) |
| Email approbation offre | `AdminOffreModerateAPIView.patch` envoie un email au recruteur (`entreprise.user.email`) uniquement quand `statut_moderation` passe à `APPROUVEE` (transition, pas à chaque save) — template `emails/offre_approuvee.html` | Le recruteur doit être informé automatiquement quand son offre devient visible, sans spammer à chaque modération |
| Email approbation entreprise | `AdminEntrepriseModerateAPIView.patch` envoie un email (`_envoyer_email_entreprise_approuvee`) uniquement sur transition `est_approuvee` False→True (comparé à `etait_approuvee` capturé avant `serializer.save()`) — template `emails/entreprise_approuvee.html`, même mécanisme que l'email offre | Même logique que l'offre : notifier une seule fois, pas à chaque modification du profil entreprise |
| Messages d'erreur backend affichés | `CreateJob.jsx` et `useGestionOffre.js` (helper `apiErrMsg()`) affichent `error.response?.data?.error` au lieu d'un toast générique | Le backend renvoie déjà des causes précises (entreprise non validée, rôle INVITE bloqué, premium expiré) mais le frontend les avalait avec des messages génériques — confus pour le recruteur |
| Swagger UI restylé | Template overridé `jobs/templates/drf_spectacular/swagger_ui.html` (trouvé avant celui de drf_spectacular car `jobs` précède l'app dans `INSTALLED_APPS`) — bandeau indigo TafTech, bordures colorées par méthode HTTP, police Inter/JetBrains Mono, blocs de code fond sombre, `SWAGGER_UI_SETTINGS` (filtre, persistAuthorization) | Habillage CSS de Swagger par défaut, jugé insuffisant par l'utilisateur — pas une refonte complète type Stripe/Postman ; à revoir si redemandé |
| Scraper Emploitic | Subprocess séparé + JSON tmp file | Playwright sync_playwright sur Windows bloque le greenlet à la fermeture — subprocess évite le hang |
| Référentiel recherche | Q() par mot individuel | `icontains` substring exact ne trouve pas "Ingénieur en informatique" avec "ingenieur informatique" |
| Playwright Windows | `python -m playwright install chromium` dans backend_env | Binaire chromium lié à l'env Python — installer dans le bon venv |
| CVThèque matching | Indexer `scores_map` par `user_id` (pas `profil.pk`) | `ProfilCandidatDTO` expose `user_id` pas `id` — sinon `score_offre` absent de la réponse |
| CVThèque offres dropdown | Filtrer `APPROUVEE + est_active + !est_cloturee` | Pas afficher les offres en attente ou rejetées dans le comparateur |
| InfoBanner dismiss | localStorage `banner_${storageKey}` | sessionStorage se réinitialise à chaque onglet — localStorage = 1 seule dismissal |
| Changer MDP recruteur | Dans ParametresRecruteur onglet "Mon profil" | Même logique que Settings candidat — adapté compte Google |
| scrollIntoView en test | `?.scrollIntoView?.()` (double optional chain) | jsdom définit l'élément mais pas la méthode scrollIntoView — simple `?.` ne protège pas contre méthode absente |
| Suppression inline confirm | Questionnaires + CandidaturesSpontanees : clic corbeille → inline Confirmer/Annuler, pas window.confirm | Pattern UX inline — les tests doivent cliquer 2 fois : corbeille puis "Confirmer" |
| navigator.clipboard jsdom | Mock dans CandidaturesSpontanees.test.jsx : `Object.assign(navigator, { clipboard: { writeText: vi.fn() } })` | jsdom ne définit pas clipboard API |
| N+1 queries | select_related/prefetch_related sur Dashboard, CVTheque, MesCandidatures | Dashboard 50 offres : 101 requêtes → 3 avec prefetch |
| Cache constants | `cache.get/set('jobs_constants', timeout=3600)` dans ConstantsAPIView | Wilayas/secteurs/diplômes statiques — pas de hit DB après 1ère requête |
| Mobile grids | Toutes les pages corrigées avec `grid-cols-1 sm:grid-cols-2` | Jamais commencer un grid directement à grid-cols-2+ sans breakpoint mobile — déjà appliqué partout |
| Invitation membre Google | Envoie lien invitation (pas ajout direct) | Compte Google sans mot de passe → ne peut pas se connecter sans définir un mot de passe d'abord |
| Rôle membre équipe Google | Ne pas changer le rôle à l'acceptation | Membre peut rester CANDIDAT — `est_membre_equipe` dans le serializer autorise le login recruteur |
| mediaUrl normalization | Ajoute `/media/` si absent du chemin | Snapshots anciens stockés sans `/media/` prefix |
| JobDetail redesign | Bandeau entreprise + grille infos + 2 colonnes | Plus lisible, style Emploitic/LinkedIn |
| Cypress version | Downgrade 15 → 13.17.0 | Cypress 15 binaire cassé sur Windows 10 (`--smoke-test` option non reconnue) |
| Cypress login recruteur | `cy.login("recruteur")` visite `/recruteurs/connexion` (placeholder `votre@entreprise.com`) | Portail séparé — login candidat via `/login` retourne 403 pour rôle RECRUTEUR |
| Cypress ECONNREFUSED GUI | `host: true` dans vite.config.js server | Windows résout `localhost` en IPv6 mais Vite écoutait IPv4 seulement |
| Cypress mock questionnaire | Utiliser `requis: true` (pas `obligatoire: true`) dans les mocks | Le composant JobDetail.jsx vérifie `q.requis`, pas `q.obligatoire` |
| Cypress intercept jobDetail | Regex `/\/api\/jobs\/\d+\/$/` au lieu de `**/jobs/*/` | Le glob matchait aussi `/api/jobs/recommandations/` — race condition sur `cy.wait("@jobDetail")` |
| AdminSystemLogs pagination | Pagination manuelle 50/page dans la vue (pas PageNumberPagination DRF) | Vue APIView simple, pas un ListAPIView — pagination injectée directement dans le GET |
| Parser CV — matching mots-clés | Tous les extracteurs de cv_parser.py + matcher.py (`competences_score`, `_experience_pertinente`) utilisent `re.search(r'\bKW\b', ...)` au lieu de `KW in texte` | Bug réel détecté sur un CV : le mot-clé `'ia'` (IT) matchait en sous-chaîne dans "Algeria/social/industrial", et `'ts'` (diplôme TS) matchait dans "tests/students" → mauvaise spécialité/diplôme détectés sans lien avec le contenu réel |
| SPECIALITES_MAPPING / DIPLOMES_MAPPING / SYNONYMES_SPECIALITE | Couverture FR + EN + AR sur toutes les catégories | CV testés en anglais (mots RH absents à l'origine) et marché algérien → CV parfois en arabe |
| _experience_pertinente synonymes | Comparé contre la description normalisée en texte (`\b` regex) au lieu d'un `set` de mots exacts | Les synonymes multi-mots ("ressources humaines", "génie civil") ne matchaient jamais un set de mots simples — faux négatif silencieux corrigé |
| DIPLOMES_MAPPING master générique | Ajout mot-clé `'master'`/`"master's degree"` dans MASTER_2 | "Master's Degree in..." ne matchait aucun mot-clé (seuls "master 1/2" existaient) → diplôme retombait sur LICENCE via "Bachelor's Degree" détecté plus loin |
| FormationCandidat.date_debut / etablissement | Rendus nullable/blank (migrations 0048, 0049) | CV n'indiquant qu'une année d'obtention (pas de date de début) ou un diplôme/certif sans établissement précisé — le POST formation échouait en 400 silencieux, formations "détectées mais non ajoutées" |
| ProfilCandidatAPIView.put() | Troncature auto des champs User trop longs + `remove_photo_profil` flag pour vider explicitement un FileField | Le parser CV peut extraire 2 numéros de téléphone concaténés (`0552.../0770...`) dépassant `User.telephone` (max 15) → 500 non catché ; un FileField ne peut pas être vidé avec une chaîne vide en multipart |
| Remplissage profil via parser CV — mode Remplacer | Sémantique de remplacement total : chaque champ (nom, tel, titre, wilaya, diplôme, spécialité, bio, réseaux, permis/passeport/véhicule, compétences, langues, expériences, formations, photo) est explicitement vidé s'il est absent du nouveau CV, pas seulement écrasé s'il est présent | L'utilisateur veut un vrai "remplacer" (delete-then-fill), pas un merge partiel — cas concret : nom jamais câblé du tout (nom_complet détecté mais jamais envoyé au PUT) |
| Remplissage profil — perf & anti double-clic | Suppressions/ajouts expériences+formations parallélisés (`Promise.allSettled` au lieu de `for...of` séquentiel) + état `remplissageLoading` désactivant le bouton "Valider et remplir" | Jusqu'à 22 requêtes HTTP séquentielles pour un CV avec 6 exp + 5 formations = lenteur perçue → double-clic → remplissage en double |
| extract_photo_from_docx | Nouvelle fonction (parcourt `doc.part.rels`, garde la plus grosse image, ignore les rels externes) | Seuls les PDF extrayaient une photo (`fitz`) ; les CV Word n'en extrayaient jamais |
| Description expériences/formations parser CV | `\n`-joined avec préfixe `"- "` (regex ET prompt Groq) au lieu de `" ".join()` qui aplatissait tout en un paragraphe | Le candidat veut retrouver la structure à puces d'origine du CV — `whitespace-pre-line` déjà présent côté frontend, seul le texte généré manquait de structure |
| Premium expiré membres | Blocage login (403) + blocage dashboard API | PROPRIETAIRE bypasse les deux couches |
| INVITE accès | Masquage UI des boutons d'action, pas blocage route | Candidatures en lecture seule autorisées |
| GuestRoute | Redirect si déjà connecté depuis login/register | Évite double session ou confusion de rôle |
| EquipeActionLog | Nouveau modèle migration 0043 | Traçabilité complète équipe recruteur |
| authService.peutFaire() | ORDRE = ["INVITE","UTILISATEUR","ADMIN","PROPRIETAIRE"] | Bug : ADMIN absent → indexOf=-1 → INVITE passait ADMIN check |
| Logout redirect | Role-aware (RECRUTEUR → /recruteurs/connexion) | Lire role AVANT clearStorage |
| mediaUrl centralisé | `src/utils/mediaUrl.js` — `VITE_MEDIA_BASE_URL` env | 127.0.0.1 hardcodé = cassé en prod/ngrok |
| Accès membres équipe API | `get_entreprise_for_user()` + `get_membre_role()` dans offres/candidatures | INVITE bloqué en écriture, UTILISATEUR+ autorisé |
| Backend logging | `logger = logging.getLogger(__name__)` dans chaque view | Remplace print() — prod-ready |
| Déploiement | Serveur algérien .dz | Conformité ANPDP + latence |
| ngrok tests | Proxy Vite + 1 seul tunnel | Compte gratuit ngrok = 1 tunnel max. Vite proxy redirige /api vers Django côté serveur |

---

## 🌿 WORKFLOW GIT

- Branch principale : `main`
- Feature branches : `feature/us{N}`
- Commits sur la feature, jamais directement sur main
- Merge vers main : **seulement sur permission explicite**
- Format commit : `type: description` (feat, fix, style, refactor, test, docs)

---

## ✅ ÉTAT TESTS (dernière vérification — MAJ tests coverage + corrections)

- Backend : 282/282 ✅ (dont 8 tests ChangerMotDePasseAPIView + 4 tests CVThequeView offre_id nouveaux)
- Frontend Vitest : 338/338 ✅
  - Nouveaux tests : InfoBanner (8) + Tooltip (10) + ParametresRecruteur MDP (5) + CVTheque matching (3)
  - Corrigés : Settings, RegisterRecruteur, Home, JobDetail, MesCandidatures, Navbar, CreateJob, CandidaturesSpontanees, EntreprisePublic, Questionnaires, ParametresRecruteur HP3/HP7/EC3, GestionOffre (dropdown statut), ResetPassword, DashboardRecruteur
- Cypress E2E : 7 fichiers — tous stables ✅
- Vite build : propre ✅ (1928 modules)

---

## 🔲 TÂCHES REPORTÉES (ne pas faire sans demande)
- Sentry error tracking
- Remplacer Groq par Ollama local (après déploiement) — **le câblage existe déjà** (`jobs/ai_engine.py::_call_ollama()`, session 20/08/2026) et bascule via `AIConfig.provider` dans l'admin, mais **non validé contre un vrai serveur Ollama** (aucun disponible en dev). Reste à faire le jour venu : installer/lancer `ollama serve` en prod, tester `_call_ollama()` en conditions réelles, ajuster si l'API `ollama-python` a changé entre-temps.
- RAG avec pgvector (roadmap 3-6 mois)

---

## 🚀 DÉPLOIEMENT

Serveur algérien `.dz` — conformité ANPDP.

Variables `.env` requises en prod :
```env
SECRET_KEY=<nouvelle clé générée>
DEBUG=False
ALLOWED_HOSTS=taftech.dz,www.taftech.dz
DB_NAME=taftech_db
DB_USER=<user postgres>
DB_PASSWORD=<mot de passe>
DB_HOST=127.0.0.1
DB_PORT=5432
EMAIL_HOST_USER=taftech963@gmail.com
EMAIL_HOST_PASSWORD=<app password Gmail>
GROQ_API_KEY=<clé Groq>
CORS_ALLOWED_ORIGINS=https://taftech.dz,https://www.taftech.dz
SITE_URL=https://taftech.dz
VITE_MEDIA_BASE_URL=https://taftech.dz
```

Crontab :
```bash
# Alertes emploi — tous les jours à 8h
0 8 * * * cd /chemin/vers/taftech_backend && python manage.py envoyer_alertes >> /var/log/taftech_alertes.log 2>&1

# Relance CV inactifs — le 1er de chaque mois à 9h
0 9 1 * * cd /chemin/vers/taftech_backend && python manage.py relance_maj_cv >> /var/log/taftech_relance.log 2>&1

# Archivage auto offres expirées — tous les jours à 00h30
30 0 * * * cd /chemin/vers/taftech_backend && python manage.py archiver_offres_expirees >> /var/log/taftech_archivage.log 2>&1
```

Checklist avant déploiement :
- [ ] `settings.py` : DEBUG=False, SECRET_KEY env, DATABASE_URL env
- [ ] `ALLOWED_HOSTS` avec vrai domaine .dz
- [ ] `CORS_ALLOWED_ORIGINS` avec vrai domaine frontend
- [ ] `.env` frontend : `VITE_MEDIA_BASE_URL=https://taftech.dz`
- [ ] Whitenoise pour fichiers statiques
- [ ] `requirements.txt` à jour
- [ ] `python manage.py migrate && python manage.py collectstatic`
- [ ] **Sécurisation fichiers média (CV/photos/logos)** : en DEBUG=False, `taftech_backend/urls.py` ne sert plus `/media/` du tout (bloc `static()` gardé par `if settings.DEBUG`) — il faut un serving explicite en prod (nginx `alias` ou équivalent). Les fichiers gardent leur nom original (`upload_to='cvs/'` sans fonction de nommage, ex. `CV_Ahmed_Benali.pdf`) donc plus devinable qu'un UUID. Avant d'exposer `/media/` publiquement, décider : (a) accepter le risque (fichiers non listables, mais devinables si le nom réel est connu), ou (b) passer par une vue Django authentifiée qui vérifie la propriété/l'accès avant de streamer le fichier, ou (c) URLs signées à expiration (nginx `secure_link` / S3 presigned URLs)

---

## 🤖 ROADMAP RAG — IA LOCALE (POST-DÉPLOIEMENT)

| Étape | Timing | Action |
|-------|--------|--------|
| 1 | Après déploiement | Installer Ollama + mistral 7B, valider `jobs/ai_engine.py::_call_ollama()` (déjà écrit, non testé) contre un vrai serveur, puis basculer `AIConfig.provider` sur OLLAMA depuis l'admin |
| 2 | 1 mois | Ajouter pgvector, vectoriser offres + profils |
| 3 | 3 mois | Construire retriever, injecter contexte dans prompts |
| 4 | 6 mois | Affiner prompts avec données réelles TafTech |

La valeur de TafTech n'est pas le LLM — ce sont les données. Fine-tuning écarté (GPU A100/H100 requis), RAG retenu.

---

## 💻 COMMANDES UTILES

```bash
# Backend
cd C:\Users\filali\Desktop\Taftech\taftech_backend
python manage.py runserver

# Frontend
cd C:\Users\filali\Desktop\Taftech\taftech_frontend
npm run dev

# Build Vite (vérification avant commit)
npx vite build

# Tests backend
python manage.py test jobs.tests

# Tests frontend
npm test -- --run

# Cypress
npx cypress open

# PostgreSQL port 5433

# ── NGROK (partage pour tests externes) ──────────────────────────────────────
# ngrok est installé dans : C:\Users\filali\Downloads\ngrok-v3-stable-windows-amd64\ngrok.exe
# (ajouté au PATH utilisateur — ouvrir un nouveau terminal si non reconnu)
#
# Procédure complète (3 terminaux) :
#   Terminal 1 : python manage.py runserver          (backend Django port 8000)
#   Terminal 2 : npm run dev                         (frontend Vite port 5173)
#   Terminal 3 : ngrok http 5173                     (tunnel public → port 5173)
#
# → Envoyer l'URL ngrok affichée (https://xxx.ngrok-free.app) aux testeurs
#
# Fonctionnement : Vite proxy intercepte /api et /media et les redirige vers
# localhost:8000 côté serveur — les testeurs n'ont besoin que d'une seule URL.
#
# Rien à changer dans .env ni settings.py — tout est déjà configuré :
#   - vite.config.js : proxy /api + /media → 127.0.0.1:8000, allowedHosts: true
#   - axiosConfig.js : VITE_API_URL vide → URLs relatives → proxy Vite
#   - settings.py    : ALLOWED_HOSTS += ['.ngrok-free.app'] si DEBUG=True
# ─────────────────────────────────────────────────────────────────────────────
```

---

## 📧 CONFIG

- Email TafTech : taftech963@gmail.com
- Localisation : Oran, Algérie
