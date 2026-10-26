# 25/10/2026 — Entrées issues d'une demande acceptée : badge, filtre, totaux

**Constat** : en base, les 28 demandes de compétences acceptées avaient bien leur compétence « Validée » dans la liste officielle (396 au total). Ce qui manquait à l'écran : aucun total sur les onglets de liste, aucun repère d'origine, aucun moyen de retrouver ces entrées parmi les autres.

**Fait** (option B choisie par l'utilisateur) :
- `demandes_ajout/service.py::ids_entrees_issues_de_demandes(type)` : identifiants des entrées créées par une demande **ACCEPTÉE** (un rattachement n'ajoute qu'un synonyme, il n'est pas compté).
- Champ `issue_de_demande` sur les 4 listes admin (compétences, métiers, spécialités, types de diplôme) via `IssueDeDemandeMixin` (`serializers/referentiel_admin.py`, ensemble d'ids passé par le contexte, une requête par page). Filtre serveur `?origine=demande`, et `nb_issues_de_demandes` dans la réponse.
- Statistiques admin : `referentiel_totaux` (`METIER`, `SPECIALITE`, `DIPLOME`, `COMPETENCE`) pour les titres des onglets.
- Écran : badge `BadgeIssueDeDemande`, puce « Issues d'une demande (n) », total dans le titre des onglets (« Liste (396) », « Métiers (n) », « Types de diplôme (n) », « Spécialités (n) »).

**Piège** : la réponse d'un `PATCH` ne porte pas le contexte, donc `issue_de_demande` y vaut `False` ; l'écran ne s'en sert pas (bascule locale, ou rechargement de la liste).

**Vérifié** : 3 tests backend nouveaux (`test_issues_de_demandes_listes`) + `test_demandes_ajout_api` / `_metiers` OK (base `taftech_db_claude_iso`) ; frontend : 4 fichiers ciblés 41/41, build OK. Suites complètes non relancées, non essayé à l'écran, non commité.
