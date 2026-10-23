# Documentation TafTech — où trouver quoi

Point d'entrée : [../CLAUDE.md](../CLAUDE.md) (règles de travail, courtes). Tout le détail est ici.

## Je veux comprendre le projet

| Question | Fichier |
|---|---|
| Comment est organisé le backend Django ? | [architecture/backend.md](architecture/backend.md) |
| Comment est organisé le frontend React ? | [architecture/frontend.md](architecture/frontend.md) |
| Quels sont les modèles de données ? | [architecture/modeles.md](architecture/modeles.md) |
| Couleurs, composants, tokens `tw.*` ? | [architecture/design-system.md](architecture/design-system.md) |
| Carte des gros fichiers découpés (qui contient quoi) | [architecture/carte-du-code.md](architecture/carte-du-code.md) |
| Qu'est-ce que le site sait déjà faire ? | [fonctionnalites.md](fonctionnalites.md) |
| Pourquoi ce choix technique ? Quels pièges ? | [decisions-techniques.md](decisions-techniques.md) |

## Je veux savoir si c'est sûr

| Question | Fichier |
|---|---|
| Quelles protections sont en place ? | [securite-synthese.md](securite-synthese.md) |
| Journal détaillé des correctifs sécurité | [../SECURITY.md](../SECURITY.md) |

## Je veux lancer, tester, déployer

| Question | Fichier |
|---|---|
| Quelles commandes taper ? | [exploitation/commandes.md](exploitation/commandes.md) |
| Workflow git, état des tests, tâches reportées | [exploitation/git-tests.md](exploitation/git-tests.md) |
| Variables `.env` prod, crons, checklist | [exploitation/deploiement.md](exploitation/deploiement.md) |
| Quoi décider le jour du déploiement (workers, mémoire, cache partagé, capacité Groq) | [exploitation/decisions-au-deploiement.md](exploitation/decisions-au-deploiement.md) |
| Qu'est-ce qui reste à faire avant et après la mise en ligne ? | [reste-a-faire-2026-10-18.md](reste-a-faire-2026-10-18.md) |

## Je veux toucher à une zone précise (documentation par chantier)

Même principe que le projet SOMIZ : un fichier par **chantier**, à lire **avant** de modifier la zone. Chaque fichier garde l'historique daté (contexte, décision, bugs, tests), du plus récent au plus ancien.

| Zone du code | Fichier |
|---|---|
| Score de matching, candidats recommandés, cache des scores | [fonctionnel/matching.md](fonctionnel/matching.md) |
| Métiers, diplômes, spécialités, secteurs, import du référentiel | [fonctionnel/referentiel-metiers-diplomes.md](fonctionnel/referentiel-metiers-diplomes.md) |
| Parser de CV, agent IA, prompts, génération d'offre | [fonctionnel/parser-cv-ia.md](fonctionnel/parser-cv-ia.md) |
| Panel admin, audit, permissions admin | [fonctionnel/admin.md](fonctionnel/admin.md) |
| Blog, FAQ, bannières, pages statiques, config IA | [fonctionnel/cms-contenu.md](fonctionnel/cms-contenu.md) |
| Paliers, abonnements, crédits CVthèque, Chargily, factures | [fonctionnel/abonnements-credits.md](fonctionnel/abonnements-credits.md) |
| Dashboard recruteur, CVthèque, candidatures, notifications | [fonctionnel/portail-recruteur.md](fonctionnel/portail-recruteur.md) |
| Dashboard candidat, documents, compétences, rendez-vous | [fonctionnel/espace-candidat.md](fonctionnel/espace-candidat.md) |
| Throttling, secrets, audits de sécurité | [fonctionnel/securite-chantiers.md](fonctionnel/securite-chantiers.md) |
| Pages publiques, navbar, mobile, SEO, conventions UI | [fonctionnel/ui-site-public-mobile.md](fonctionnel/ui-site-public-mobile.md) |

## Conception (plans et specs rédigés avant de coder)

[conception/specs/](conception/specs/) : le « quoi et pourquoi » d'un chantier. [conception/plans/](conception/plans/) : le « comment », étape par étape.

## Archives

[archives/](archives/) : notes temporaires et brouillons de travail, conservés mais plus à jour.

## Règle d'entretien (à respecter à chaque session)

1. Une nouvelle session s'écrit **en haut du fichier `fonctionnel/` du chantier concerné** (nouveau fichier si c'est un nouveau chantier, avec en-tête « À lire avant de toucher… » et une ligne dans ce tableau).
2. Une décision durable (modèle, règle métier, piège) est aussi résumée dans `decisions-techniques.md`.
3. Un correctif de sécurité va dans `../SECURITY.md`.
4. Un fichier de doc qui dépasse ~700 lignes se scinde. Un fichier de code qui dépasse 1000 lignes aussi (voir `architecture/carte-du-code.md`).
5. Les renvois « voir section ... ci-dessus » des anciennes sessions pointaient vers l'ancien CLAUDE.md monolithique : chercher le titre de la session dans `fonctionnel/`.
