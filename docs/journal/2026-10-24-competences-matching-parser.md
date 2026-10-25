# 24/10/2026 — Score de compétences presque toujours nul : diagnostic, tri des demandes, filtre des langues

Point de départ : l'utilisateur constate que les compétences ne sont « presque jamais matchées » entre
candidats et offres. Branche : `fix/referentiel-doublons-specialites`.

## 1. Diagnostic (lecture seule)

Le score (`matcher.competences_score_structure`) compare une compétence d'offre à celle du candidat **par
identifiant de référentiel** (`competence_ref_id`), puis par libellé exact, puis par texte libre égal au libellé.
Aucun rapprochement approximatif, volontairement (`resoudre_competence_ref` : « jamais de rapprochement
approximatif », pour éviter les faux amis).

Mesure sur la base de dev : **offres 21/21 rattachées au référentiel, candidats 14/51 (27 %)**. Les compétences
des offres sont choisies dans la liste ; celles des candidats viennent du CV, en texte libre (« Kaizen », « 5S »,
« reporting RH », « HR Access », « NAVISION »…). `rattacher_competences_orphelines()` n'en rattrapait aucune :
ces mots n'existent ni comme libellé ni comme synonyme du référentiel (374 compétences validées).

**Cause : le contenu du référentiel (RH, qualité, ERP), pas le code du score.**

## 2. Approche écartée : rattacher par IA à l'extraction du CV (« option 1 »)

Proposée d'abord, abandonnée après mesure : sur les 37 compétences orphelines, presque aucune n'a d'équivalent
dans le référentiel (le parser rapproche déjà : exact, synonyme, puis `difflib` à 0,84). Une correspondance par IA
ne rattraperait rien de plus. Ne pas la reprendre tant que le référentiel n'est pas élargi.

## 3. Tri des demandes d'ajout de type compétence (option 2)

Les compétences hors référentiel deviennent des `DemandeAjout` (type COMPETENCE) que l'admin décide ; l'acceptation
rattache automatiquement les saisies existantes (`AdaptateurCompetence.appliquer`). 60 demandes attendaient.
Décisions prises **par les fonctions du service** (`accepter_demande`, `refuser_demande`, `rattacher_demande` :
audit, notification, rattachement), jamais en modifiant des statuts à la main :

- **22 acceptées** (libellé avec majuscule initiale pour les termes RH) : outils et méthodes (ERP, HR Access,
  HTML5, Ishikawa, Kaizen, N8N, Navision, Power Pivot, QC Story, QRQC, Tailwind CSS, TQM) et termes RH (relations
  sociales, dialogue syndical, reporting RH, indicateurs sociaux, diversité, inclusion, pilotage de projets RH,
  gestion des organismes sociaux, sécurisation juridique, conformité réglementaire).
- **26 refusées**, motif visible du candidat : Anglais, Arabe, Français (langues), « Powepoint) » (faute de
  frappe), coordination, audits (trop généraux), 4 intitulés composés (« Reporting RH & indicateurs sociaux »…) et
  16 mots d'un CV industriel qui décrivent une mission ou un chiffre (délais, coûts, flux, stocks, reporting…).
- **1 rattachée** : « Excel avancé » -> « Modélisation Excel avancée ».
- **Laissées en attente (11)**, décision de contenu pour l'utilisateur : NEO BI, KPI, QCDS, instrumentation,
  maintenance, turbines, Turbines a gaz, électronique, excellence opérationnelle, industrialisation, pilotage
  production.
- « 5S » et « 5 Pourquoi » étaient **déjà refusées** (demandes 11 et 12) : décision antérieure non rouverte.

Résultat : compétences de candidats rattachées **14 -> 37 sur 51**. **Non prouvé sur le score** : sur la base de dev,
1 couple candidat x offre sur 30 a un score de compétences > 0, parce que les 6 profils (RH, industrie) et les 6
offres (Git, Docker, AutoCAD, HSE…) n'ont presque rien en commun. À revérifier sur une offre RH/industrielle réelle
ou sur la production. **Ce tri ne vaut que pour la base de dev** : en production, la file sera différente.

## 4. Parser : les langues ne sont plus des compétences

Vérification demandée par l'utilisateur (« je pense déjà résolu ») : **résolu en partie**.
- Bruit inventé par l'IA (« délais », « coûts », « démarrage »…) : demandes du 21-22/10, **avant** le correctif du
  22/10 à 22h19 (prompt réécrit, 15 compétences au plus, ancrage dans le CV `est_ancree_dans_le_cv`). Considéré
  réglé ; un mot réellement écrit dans le CV passe pourtant l'ancrage, donc un résidu reste possible.
- Langues (Anglais, Français, Arabe, demandes du 16/10) : **pas filtrées**, `_est_competence_valide('Anglais')`
  renvoyait `True`. Corrigé : `_est_nom_de_langue` (`cv_parser/competences.py`) rejette un libellé composé
  uniquement de noms de langue (+ « langue/language »), accents et casse ignorés ; « Communication en anglais » et
  « Traduction anglais-français » restent valides. Les langues se déclarent dans la section Langues
  (`normaliser_langues`). `PARSER_VERSION` -> `parser-2026.10.24-1`.
- Tests : `test_cv_parser_competences.py` (7 rejets + 2 cas valides ajoutés) ; 64 tests ciblés OK (parser,
  ancrage, langues, sections, cycle de vie, référentiel commun, score S10). Suite complète non relancée.
- **Non fait** : liste de mots génériques refusés (délais, coûts…) : trop risqué (« reporting » est parfois une
  vraie compétence). Un resserrage ne se fait que sur un corpus de CV réels, avec l'utilisateur.

## 5. Compétences suggérées selon le métier (profil, assistant d'import) et lien métier à l'acceptation

Idée de l'utilisateur : proposer au candidat, comme dans « Publier une offre », des compétences selon le(s)
métier(s) qu'il a choisis, pour qu'il choisisse dans la même liste que les offres (matching exact). Constat de
départ (base de dev) : **520 métiers sur 997 ont au moins une compétence suggérée** (4 à 12, moyenne 5,4),
**321 compétences actives sur 396 sont liées à un métier, 75 ne le sont à aucun** ; `MetierCompetence` n'était
écrit que par l'import du classeur (aucun écran). Règle client conservée (docstring du modèle) : **jamais
attribué automatiquement au candidat** ; ici rien n'est pré-coché, le candidat clique.

- **Demandes d'ajout** : vérifié, il n'existait **aucune** option pour lier une compétence à un métier
  (`AdaptateurCompetence.parents()` renvoyait `{}`, `accepter` ignorait `parent`/`options`). Ajouté : champ
  facultatif « Métiers concernés » dans la fenêtre « Accepter » d'une compétence (`DecisionDemandeModal.jsx`,
  recherche par libellé ou appellation via l'Explorateur), corps `metiers_ids`, 10 au plus, tout-ou-rien, métier
  redirigé -> canonique (`AdaptateurCompetence._lier_aux_metiers`). Audit existant `DECISION_DEMANDE_AJOUT`
  (une nouvelle action d'audit aurait exigé une migration du champ à choix).
- **Candidat** : `Components/CompetencesSuggerees.jsx` + `utils/competencesSuggerees.js` (métiers distincts, 3 au
  plus ; fusion, déduplication, exclusion de ce que le candidat a déjà, classement par nombre de métiers, 12 au
  plus) + `utils/useCompetencesSuggerees.js`. Branché dans **Mes compétences** (métier souhaité, métier actuel,
  métiers des expériences) et dans l'**étape Compétences de l'assistant d'import** (`metierIds` calculé dans
  `OnboardingWizard.jsx`). Réutilise `MetierSuggestionsAPIView` : **aucun nouveau point d'API**. Ajout au niveau
  « Débutant » (modifiable). Les suggestions sont facultatives : leur échec n'empêche jamais d'utiliser la page.
- **75 compétences orphelines** : commande `appliquer_liens_competences_metiers [--dry-run]`
  (`jobs/liens_competences_metiers.py`, `jobs/data/liens_competences_metiers.json`, codes `TAF-LC-…`). Liste
  **proposée** : 56 compétences, 154 liens, tous les métiers résolus sur un seul métier ; le `--dry-run` passe.
  **Validée par l'utilisateur puis appliquée sur la base de dev (154 liens créés, seconde exécution : 0)** : les
  compétences officielles sans métier passent de 75 à 19 (les transversales voulues). **À rejouer en production.**
  Compétences volontairement non liées (transversales) :
  savoir-être (Adaptabilité, Autonomie, Leadership, Rigueur…), langues, Pack Office / Word / PowerPoint,
  Communication, Gestion de projet, N8N.
- **Erreur corrigée en cours de route** : `AdaptateurCompetence.accepter` promeut une ancienne suggestion portant
  le même libellé (`label__iexact`) **sans changer sa casse** ; les libellés que j'avais « corrigés » (Dialogue
  syndical…) étaient donc restés en minuscules dans le référentiel officiel. Corrigés (11 libellés, y compris
  Navision). **Corrigé dans le code** : la promotion d'une ancienne suggestion prend maintenant le libellé corrigé
  par l'admin (test `test_une_ancienne_suggestion_promue_prend_le_libelle_corrige`).
- **Vérifié** : backend 136 tests ciblés OK ; frontend : suite complète 109 fichiers, 831/833 tests ; les 2 échecs étaient des
  assertions de `DemandesAjoutPanel.test.jsx` (le corps d'acceptation porte maintenant `metiers_ids`), adaptées puis
  fichier relancé seul 13/13 (pas de second passage complet) ; build OK.
  **Non essayé à l'écran** (navigateur). Suite backend complète non relancée.
- **Pas fait** : suggestions dans la recherche d'emploi / les alertes (hors sujet).

### 5 bis. Origine des compétences (option 2 choisie) et écran « Métiers » (suite, même jour)

Question de l'utilisateur sur l'exactitude (une compétence cochée d'un clic ne prouve rien) : trois options
proposées (ne rien changer / **marquer l'origine** / pondérer à la baisse) ; **l'utilisateur a choisi la 2**.
- **Origine** : `CompetenceCandidat.origine` (`SAISIE` = saisie ou issue du CV, `SUGGESTION` = cliquée dans les
  suggestions du métier), migration `0155`. Écrite à la création seulement, valeur inconnue -> `SAISIE`. **Le score
  ne la lit pas** (un test vérifie que `matcher.py` ne contient pas le mot) : aucun changement de calcul, l'option 3
  (pondération à 0,8) reste disponible si des abus apparaissent. Montrée au candidat (« · suggérée » dans « Mes
  compétences », phrase de transparence sous le bloc de suggestions) et au recruteur (`BadgeCompetenceSuggeree`
  dans `ProfilCandidatDetails.jsx` et `ReviewCandidature.jsx`). Les candidatures déjà envoyées ne portent pas
  l'origine (le profil figé date d'avant) ; seules les suivantes la portent.
- **Écran « Métiers »** de `AdminCompetences.jsx` : colonne « Métiers » (badge « Aucun métier » à 0), bouton
  « Métiers de … » -> `MetiersCompetenceModal.jsx` (liste, ajout par recherche de métier, retrait), routes
  `admin/competences/<id>/metiers/[<metier_id>/]`. Logique de liaison **partagée** avec l'acceptation d'une demande
  (`referentiel_utils.lier_competence_aux_metiers`, le code de l'adaptateur a été réduit à un appel) ; recherche de
  métier partagée (`utils/useChercherMetiers.js`, utilisée aussi par `DecisionDemandeModal`). Garde-fou : seuls les
  liens créés par TafTech (`TAF-…`) se retirent, ceux du classeur (`MC-…`) non. Audit `LIER_COMPETENCE_METIER`
  (migration `0156`).
- **Liens appliqués** sur la base de dev : 154 (commande `appliquer_liens_competences_metiers`), compétences
  officielles sans métier 75 -> 19 (les transversales voulues). **À rejouer en production.**
- **Vérifié** : backend 107 tests voisins OK (profil, CVthèque, snapshot, exports, compétences) + 98 ciblés ;
  frontend : fichiers touchés 27/27, build OK. **Suite frontend complète : 3 échecs** dont 1 sans rapport avec ce
  chantier : `RecruteurLayout.test.jsx` (EC1, « Mon équipe » visible malgré `peutFaire=false`) échoue **même seul** ;
  il concerne `NavbarRecruteur` / `BottomNavRecruteur` / vues d'équipe, modifiés dans l'arbre de travail par un autre
  chantier : **non traité ici**. Les 2 autres étaient mon propre test (jeu de données irréaliste, corrigé) et un
  délai trop court sous charge (attente portée à 5 s). **Non essayé à l'écran** (navigateur).

## 6. À retenir

- Une compétence se valide **dans l'admin / par le service des demandes**, jamais par script direct sur les statuts.
- Pour améliorer le taux de rattachement : élargir le référentiel (synonymes, termes métier), pas le rapprochement.
- À rejouer en production : traiter la file de demandes de compétences, puis contrôler le taux de rattachement des
  `CompetenceCandidat`.
