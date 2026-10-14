# CLAUDE.md — Mémoire Projet TafTech

> **Lire ce fichier en entier avant toute action.** Il est volontairement court. Le détail est dans [`docs/`](docs/README.md) (index : « je cherche X, je vais où ? »).

## Où trouver quoi (carte rapide)

| Besoin | Aller à |
|---|---|
| Index complet de la doc | [docs/README.md](docs/README.md) |
| Architecture backend / frontend / modèles / design | [docs/architecture/](docs/architecture/) |
| Où est tel code (gros fichiers découpés) | [docs/architecture/carte-du-code.md](docs/architecture/carte-du-code.md) |
| Fonctionnalités déjà livrées | [docs/fonctionnalites.md](docs/fonctionnalites.md) |
| Pourquoi tel choix, pièges connus | [docs/decisions-techniques.md](docs/decisions-techniques.md) |
| Sécurité (synthèse + journal) | [docs/securite-synthese.md](docs/securite-synthese.md), [SECURITY.md](SECURITY.md) |
| Commandes, git, tests, déploiement | [docs/exploitation/](docs/exploitation/) |
| Problèmes connus reportés (à trancher avec l'utilisateur) | [docs/problemes-a-traiter.md](docs/problemes-a-traiter.md) |
| Historique par chantier (sessions datées) | [docs/fonctionnel/](docs/fonctionnel/) (index ci-dessous) |

**Dernière session : 14/10/2026** — points 19 à 23 des corrections finales : 19 données personnelles hors du score + filtres CVthèque liés à l'offre, 20 questions disqualifiantes justifiées, 21 informations société en source unique (admin), 22 nettoyage FAQ obsolète, 23 métiers suggérés à valider ou rejeter (SECURITY.md §25 à §27, détail et décisions dans [CORRECTIONS_CLIENT_TEMP.md](docs/archives/CORRECTIONS_CLIENT_TEMP.md)).

**Session précédente : 12-13/10/2026** — (1) corrections finales client (points 1 à 18 ; 18 config IA : prompts réservés au Super Admin (`is_superuser`), audit `MODIFIER_PROMPT_IA`/`MODIFIER_CONFIG_IA`, alerte de plafond global → SECURITY.md §24 ; 17 délivrabilité email : expéditeur/SMTP pilotés par l'environnement, procédure SPF/DKIM/DMARC dans [delivrabilite-emails.md](docs/exploitation/delivrabilite-emails.md), à exécuter après installation sur le domaine définitif ; 16 plus aucun CSV : tous les exports en `.xlsx` via `views/export_xlsx.py`, formules Excel neutralisées → SECURITY.md §23 ; 13 formules gratuit/payant + FAQ migration 0132, 14 souscription avant validation, 15 statistiques marché par vrai secteur + Top domaines/métiers : détail dans [CORRECTIONS_CLIENT_TEMP.md](docs/archives/CORRECTIONS_CLIENT_TEMP.md) ; point 12 CVthèque/confidentialité → [portail-recruteur.md](docs/fonctionnel/portail-recruteur.md) et SECURITY.md §22) : points 1 à 9 → [referentiel-metiers-diplomes.md](docs/fonctionnel/referentiel-metiers-diplomes.md) (en tête de fichier), point 10 (compétences d'offre/candidat sur le même référentiel) → [matching.md](docs/fonctionnel/matching.md), point 11 (cycle Suggérée → Validée → Rejetée/Désactivée) → [cms-contenu.md](docs/fonctionnel/cms-contenu.md) ; suivi : [CORRECTIONS_CLIENT_TEMP.md](docs/archives/CORRECTIONS_CLIENT_TEMP.md) ; (2) **réorganisation** : CLAUDE.md découpé en `docs/`, 9 fichiers de plus de 1000 lignes découpés en packages/dossiers ([carte-du-code.md](docs/architecture/carte-du-code.md)), racine nettoyée.

## Index de la documentation par chantier

`CLAUDE.md` ne garde que les règles permanentes. Le détail de chaque chantier (dates, pièges, approches abandonnées) est dans `docs/fonctionnel/` — **lire le fichier concerné avant de toucher à la zone correspondante** :

- [`matching.md`](docs/fonctionnel/matching.md) — À lire avant de toucher au score de matching (`matcher.py`), aux candidats recommandés, au cache des scores.
- [`referentiel-metiers-diplomes.md`](docs/fonctionnel/referentiel-metiers-diplomes.md) — À lire avant de toucher aux métiers/appellations, diplômes/spécialités, secteurs, fusions, import du référentiel, autocomplete, suggestions d'offre.
- [`parser-cv-ia.md`](docs/fonctionnel/parser-cv-ia.md) — À lire avant de toucher au parser de CV, à l'agent de classification, aux prompts `AIConfig`, à la génération d'offre IA, à `ai_engine.py`.
- [`admin.md`](docs/fonctionnel/admin.md) — À lire avant de toucher aux pages `/admin-taftech/*`, à `IsAdminRole`, au journal d'audit.
- [`cms-contenu.md`](docs/fonctionnel/cms-contenu.md) — À lire avant de toucher au blog, FAQ, bannières, pages statiques, compétences référentiel.
- [`abonnements-credits.md`](docs/fonctionnel/abonnements-credits.md) — À lire avant de toucher aux paliers, abonnements, crédits CVthèque, Chargily, factures.
- [`portail-recruteur.md`](docs/fonctionnel/portail-recruteur.md) — À lire avant de toucher au dashboard recruteur, à la CVthèque, aux candidatures/évaluations, aux notifications.
- [`espace-candidat.md`](docs/fonctionnel/espace-candidat.md) — À lire avant de toucher au dashboard candidat, « Mes documents », « Mes compétences », rendez-vous.
- [`securite-chantiers.md`](docs/fonctionnel/securite-chantiers.md) — À lire avant de toucher au throttling, aux secrets prod, aux dépendances. Journal complet : [`SECURITY.md`](SECURITY.md).
- [`ui-site-public-mobile.md`](docs/fonctionnel/ui-site-public-mobile.md) — À lire avant de toucher aux pages publiques, navbar/footers, responsive mobile, SEO, conventions UI.

**Règles critiques à ne jamais oublier, même sans avoir lu le détail :**
- Auth : jamais de token en `localStorage` (cookies httpOnly + CSRF). Anti-brute-force sur tout point d'entrée d'authentification.
- Toute vue qui liste des ressources sensibles applique le scoping de périmètre (entreprise du recruteur via `get_entreprise_for_user()`, candidat via `request.user`).
- Une exigence de permission/palier se vérifie par un test d'intégration sur une vraie route métier, pas sur le défaut global.
- Données candidat masquées avant déblocage CVthèque (`ProfilCandidatDTO._peut_voir_coordonnees`) : tout nouveau champ identifiant doit suivre ce garde.
- Un déblocage CVthèque n'est **jamais** un accès permanent : tout accès recruteur à des données candidat fondé sur un déblocage ou un partage doit passer par `credits_utils.profil_accessible_aux_recruteurs` (compte actif ET profil visible). Ne jamais écrire « à vie » dans l'interface. Les documents privés ne sont exposés que par `PartageDocument` explicite.
- Pas de `window.confirm`/`prompt` : `confirmToast` ; pas de couleur en dur : tokens `tw.*` de `theme.js`.
- Soft-delete par défaut ; toute suppression en masse : liste validée, sauvegarde, normalisation de chemin.
- Référentiel : toute fusion/équivalence passe par `referentiel_fusions.py` puis `consolider_referentiel`, jamais en shell.
- Pas de placeholder « exemple » dans les formulaires ; libellé visible suffisant.
- Coordonnées et informations de la société : **jamais en dur**. Source unique `MentionsLegalesEntreprise` (Admin → Mentions légales et coordonnées), lue via `utils/informationsSociete.js` (front) et `informations_societe.ligne_pied_de_page` (PDF). Un champ vide n'est pas affiché. Aucune « validation institutionnelle » (ANPDP, agrément…) sans justificatif détenu.
- Données personnelles (sexe, âge, service militaire, permis, véhicule, passeport) : jamais dans le score ; filtres CVthèque correspondants seulement via une exigence d'offre de même catégorie ; questions disqualifiantes : justification obligatoire, critères protégés refusés (`questionnaire_validation.py`).

## Règles d'organisation du code (impératives)

1. **Aucun fichier de code au-dessus de 1000 lignes.** Cible : 200-400 lignes, plafond doux 800. Au-delà on découpe par responsabilité (voir [carte-du-code](docs/architecture/carte-du-code.md) pour les découpages déjà faits).
2. **Un dossier = un sujet.** Un fichier = une responsabilité, nommé pour ce qu'il contient (`cv_parser/sections.py`, pas `utils2.py`).
3. **Les anciens chemins d'import restent valides** : un package découpé garde un `__init__.py` qui réexporte tout (`from jobs.models import X` marche toujours).
4. **Après chaque découpage** : `python manage.py check`, tests ciblés, puis `npx vite build` (frontend). Jamais de découpage sans test vert.
5. **Documenter** : chaque nouvelle session va dans `docs/journal/`, chaque nouveau découpage dans `docs/architecture/carte-du-code.md`.

## Pièges à ne pas oublier (appris à la dure)

- Après `makemigrations`, lancer **immédiatement** `migrate` (sinon `ProgrammingError` au premier test).
- Jamais `.filter(...).first()` sans `order_by` ni mutation de données via `manage.py shell` sur la base de dev réelle : utiliser `.get(email=...)` ou une base de test.
- Ne jamais définir un composant React **à l'intérieur** d'un autre composant à state local (démontage à chaque frappe, formulaire inutilisable).
- Tout nouvel appel `jobsService.*` dans un composant testé doit être ajouté au mock du test correspondant (sinon échec silencieux).
- `AIConfig.*_prompt` en base **prime** sur la constante du code : resynchroniser après modification d'un prompt.
- Frontend : préférer `npm run build` à `npx vite build` si npx prend une mauvaise version de Vite.
- Ne pas modifier des fichiers par script (sed/python) : utiliser Edit pour que les changements soient visibles dans l'éditeur. Le hook GateGuard exige d'énoncer des faits avant la première écriture de chaque fichier.
- Fichier temporaire `CORRECTIONS_CLIENT_TEMP.md` : déplacé dans `docs/archives/`.

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

