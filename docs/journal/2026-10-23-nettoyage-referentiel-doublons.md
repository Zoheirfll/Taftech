# 23/10/2026 — Nettoyage du référentiel : doublons de spécialités et d'appellations

Point de départ : sur l'écran « Publier une offre », l'aperçu « Ce que le candidat lira » répétait trois
fois « Gestion des ressources humaines ». L'utilisateur y a vu un problème de fond du référentiel.
Branche : `fix/referentiel-doublons-specialites`.

## 1. Spécialités de formation : 25 libellés présents dans plusieurs domaines (52 lignes)

Constat (lecture seule, aucune écriture) : 58 domaines, 921 spécialités ; **aucun doublon à l'intérieur d'un
même domaine**. Les 25 libellés répétés viennent du recouvrement de trois sources : thèmes éditoriaux
(`SRC_D1`, `DOM-…`), formation professionnelle (`SRC_FP19`, `FP-…`) et universitaire (`SRC_BEJ` / `SRC_TL`,
`SP-…`). « Gestion des ressources humaines » existe ×4. Aucune formation de candidat n'y pointe ; seules 3 offres
utilisent le groupe RH.

**Décision (utilisateur, 23/10/2026) : ne PAS fusionner.** Raison : `referentiel_fusions.py` (l. 360-363) consigne
déjà que les doublons ENTRE domaines sont volontairement conservés (décision client du 25/09/2026) et chaque
paire est reliée par une `RelationSpecialite` que `matcher.py` (l. 157-162) utilise : le score traite donc ces
doublons comme équivalents. Fusionner aurait inversé une décision client et retiré une spécialité de l'un des
deux domaines (« Ajouter tout un domaine » en aurait ajouté une de moins).

**Approche abandonnée** : fusion des 25 groupes via `SPECIALITES_FUSIONS` (règle : thème→FP, FP→universitaire).
Prête à être rejouée si la décision change, mais non appliquée.

**Correctif retenu : affichage seulement** (commit `71b8678`). `phraseFormation.js` écrit une spécialité une seule
fois (comparaison sans casse ni accents) et jamais si un domaine cité entièrement la contient déjà. Concerne
`BlocFormationRequise.jsx`, `JobDetail.jsx`, `AdminOffres.jsx`. Tests : 2 nouveaux dans `phraseFormation.test.js`.

## 2. Autres parties du référentiel (audit en lecture seule)

- Métiers : 996 actifs, 0 libellé dupliqué, tous rattachés à un groupe.
- Compétences : 407 (374 validées, 33 suggérées). 3 vrais doublons à traiter plus tard : « PowerPoint » /
  « Microsoft PowerPoint », « SEO » / « Référencement naturel SEO », « Développement back-end » /
  « Développement Back-End & Base de données ». (« C# » / « C++ » = faux positif de l'outil d'audit.)
- Groupes : 48 libellés répétés dans un même type (« Production » ×5…), **parents non vérifiés** : probablement
  légitimes (même nom de domaine sous plusieurs secteurs). À regarder avant de conclure.
- 118 appellations rattachées à des métiers différents : ambiguïtés réelles pour certaines, à relire métier par
  métier. Pas de traitement automatique.

## 3. Appellations en double dans un même métier : 88 lignes supprimées (75 groupes)

Cause : le classeur importe parfois deux fois la même appellation (`APP-…`), et une ligne « préférée »
(`APPX-…`, `SRC_TAF_V2`) s'ajoute à une ligne existante. **Aucune référence candidat** sur ces lignes (0
rattachement effectué). `type_alias` n'est jamais lu par le code (seulement écrit).

Nouvelle commande **`python manage.py supprimer_doublons_appellations [--dry-run]`**
(`jobs/doublons_appellations.py`, test `jobs/tests/test_doublons_appellations.py`, 11 tests OK).
- Groupe = même métier + même `cle_recherche`. Les mêmes appellations sur des métiers DIFFÉRENTS ne sont jamais
  touchées.
- Règle de conservation : la ligne `preferent` si elle existe, sinon le plus petit code ; si une ligne du groupe
  est ambiguë, la conservée l'est aussi.
- Références candidat (profil, expérience) rattachées à la conservée avant suppression ; sauvegarde JSON
  (`backups/doublons_appellations_*.json`, ignoré par git) ; une transaction ; idempotente.
- **Exécutée sur la base de développement le 23/10/2026 à 18:11** : 88 supprimées, sauvegarde
  `backups/doublons_appellations_20261023_181102.json`, second passage « [déjà fait] ».

**Hard delete, exception documentée** à la règle « soft-delete par défaut » : un `actif=False` serait remis à
`True` par `import_referentiel_v2` (`update_or_create` par code), et ces lignes ne portent aucune donnée propre.
Garde-fous : liste affichée par `--dry-run`, sauvegarde avant, transaction, test de non-régression.

**À rejouer après chaque `import_referentiel_v2`** (l'import recrée les lignes supprimées), comme
`supprimer_doublons_metiers`. À rejouer aussi en production après déploiement.

## 4. Question ouverte : corriger le classeur Excel ?

L'utilisateur a demandé pourquoi ne pas corriger directement le fichier Excel. Réponse : la base a divergé des
classeurs (fusions, redirections, instantané de hiérarchie, lignes `APPX-…`, ajouts du fichier
`referentiel_ajouts.json`, demandes acceptées par l'admin) ; un réimport (`update_or_create`) écraserait ces
écarts. **Décision : terminer d'abord la commande, puis décider d'un éventuel chantier « source de vérité »**
(export de la base vers un NOUVEAU classeur corrigé, relu ensemble, jamais en écrasant l'original du client).

## 5. Compétences : 3 cas, à traiter dans l'admin (pas de mutation en shell)

- « PowerPoint » (id 741) et « Développement Back-End & Base de données » (id 720) : suggestions automatiques
  inactives, sans référence, déjà synonymes d'une fiche validée → **rejeter**.
- « SEO » (id 30, admin) contre « Référencement naturel SEO » (id 609, import, 7 liens métiers, « SEO » en
  synonyme) → **désactiver** la 30. Fait par l'utilisateur dans la page admin des compétences, ou à faire.

## 6. Groupes répétés : rien à faire

Les 48 libellés répétés sont tous légitimes (aucun n'a le même nom sous le même parent) : « Production » existe
sous 5 secteurs différents. 0 vrai doublon.

## 7. Correspondance des métiers entre catalogues ANEM et Taftech

Les deux catalogues (13 secteurs `NSEC-*` officiels ANEM + 32 `TSEC-*` Taftech, 45 au total) cohabitent
volontairement ; ils ont déjà été consolidés en septembre (86 → 45, `fusionner_secteurs_racines_doublons`,
`GROUPES_OPERATIONS`). On ne les refait pas.

**Mesure réelle** (`matcher.metiers_compatibles`) sur les 117 paires de métiers qui partagent une même appellation
(donc le même poste) : 21 ≥ 0,85, 77 entre 0,45 et 0,85, 19 < 0,45. Exemples : « Acheteur » (Taftech) contre
« Opérations d'achat » (ANEM) = 0,45 ; « Chargé de recrutement » contre « Conseil en emploi » = 0,17.

**Correctif : relations « similaire »** (`RelationMetier`, score 0,70). La décision produit du 24/09/2026 (docstring de
`matcher._relation_similaire`) interdit de les déduire automatiquement : la commande
`python manage.py appliquer_relations_metiers_similaires [--dry-run]` (`jobs/relations_metiers_similaires.py`,
9 tests) ne crée donc QUE les paires de `jobs/data/relations_metiers_similaires.json`, relues et validées à la main.
- 94 paires candidates (score < 0,85) ; **84 retenues** le 23/10/2026. Exclues : 5 postes différents (#8 Ingénieur
  inspection, #10 Directeur régional, #67 Conseiller musical, #81 Opérateur de production, #90 Operations Manager) et
  5 doublons FR/EN de fiches Taftech à traiter par FUSION (`metier_canonique`) plutôt que par relation : Cloud
  Architect, Machine Learning Engineer, Platform Engineer, Facility Manager, Pentester.
- Appliquée sur la base de développement le 23/10/2026 : **84 relations**, codes `SIM-…`, score vérifié à 0,70.
  Retour arrière : supprimer les `RelationMetier` dont le code commence par `SIM-`.
- Le cache des scores (10 min) se rafraîchit seul ; les scores figés à une candidature ne changent pas.
- À rejouer en production après déploiement (idempotente, ignore un métier introuvable ou redirigé).
- **Reste à faire** : fusionner par `referentiel_fusions.py` les 5 doublons FR/EN et les ~15 paires de métiers
  quasi identiques (« Développeur Android » / « Développeur mobile Android », « Automaticien » / « Automaticien
  Industriel »…), avec liste validée.

## 8. Piège rencontré

Les tests Django échouaient avec « la base `test_taftech_db` est en cours d'utilisation » : un autre lancement
(`jobs.tests.test_api_equipe`, relancé en boucle) la tenait. Contournement sans rien toucher : lancer avec
`DB_NAME=taftech_db_claude_iso python manage.py test …` (la base de test s'appelle `test_<DB_NAME>`).
