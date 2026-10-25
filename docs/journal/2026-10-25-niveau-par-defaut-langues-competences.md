# 25/10/2026 — Niveau par défaut « Débutant » (langues et compétences du CV)

**Demande de l'utilisateur** : quand le CV ne précise pas le niveau d'une langue (ou d'une compétence), l'assistant d'intégration doit proposer « Débutant » (et non « Intermédiaire »), avec une indication invitant à ajuster.

## Pourquoi
« Intermédiaire » valait plus de points au score du profil (`profile_score.POINTS_NIVEAU_LANGUE` : Débutant 1, Intermédiaire 2) sans que le candidat l'ait dit. Un niveau non déclaré ne doit pas être surévalué ; le candidat l'ajuste lui-même.

## Langues
- `taftech_frontend/.../Onboarding/useOnboardingWizard.js` : `parseLangueBrute` replie sur « Débutant ».
- `.../steps/StepLangues.jsx` : la ligne d'ajout démarre sur `NIVEAUX[0]` (Débutant) ; une phrase « Niveau « Débutant » par défaut quand votre CV n'en indique pas : ajustez-le si besoin. » s'affiche dès qu'une langue est à Débutant.
- `jobs/cv_parser/langues.py` : `NIVEAU_PAR_DEFAUT = "Débutant"`. **Effet de bord voulu** : un niveau non reconnu (« IELTS 7 ») donne aussi Débutant, car `niveau_canonique` utilise la même constante.
- `jobs/cv_parser/prompts.py` : « Si pas de niveau précisé : "Débutant" ».
- Test adapté : `test_cv_parser_langues.py::test_niveau_absent_ou_inconnu_prend_le_defaut_du_prompt`.

## Compétences
- `jobs/cv_parser/parser.py` (ligne ~260) : une compétence du bloc « Compétences » sans niveau proposé par l'IA passe en `DEBUTANT`.
- `jobs/cv_parser/competences.py` (`_parser_niveaux_competences`) : niveau d'IA non reconnu -> `DEBUTANT`.
- **Non modifié** : les niveaux « Intermédiaire » que l'IA estime elle-même d'après le contexte (consigne `competences_niveaux` du prompt). Les passer à Débutant sauf mention explicite = changer cette consigne (décision à prendre avec l'utilisateur). Aucune phrase « ajustez » dans l'écran des compétences (menu et crayon déjà présents par ligne).

## Limite connue
La phrase d'indication des langues s'affiche aussi quand le CV indiquait réellement « Débutant » (on ne distingue pas défaut / valeur déclarée). Alternative : marquer les lignes remplies par défaut.

## À faire / piège
- **Le prompt en base PRIME sur la constante** : lancer `python manage.py synchroniser_prompt_parser_cv` (aussi après déploiement ; n'écrase pas un texte personnalisé). Sans cela l'IA continue d'écrire « Intermédiaire » pour les langues.
- Impact score : ces langues rapportent 1 point au lieu de 2 tant que le candidat ne les ajuste pas.

## Vérifié
`jobs.tests.test_cv_parser_langues` + `test_cv_parser_competences` : 14 tests OK (`DB_NAME=taftech_db_claude_iso`). **Frontend (tests, build) non relancé ; non essayé à l'écran ; suites complètes non relancées ; non commité.**
