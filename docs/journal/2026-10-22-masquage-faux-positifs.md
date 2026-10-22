# Journal du 22/10/2026 — Masquage avant l'IA : faux positifs sur un CV industriel

Point de départ : le CV réel d'un manager industriel (PDF 2 pages, en-tête en colonnes) dont l'aperçu « Données qui seront transmises à l'IA » montrait « 9 × nom ou prénom » alors que seul le nom du candidat (en-tête, pieds de page, fin du lien LinkedIn) devait l'être. Reproduction en rejouant le texte extrait dans `nettoyer_texte` (lecture seule, aucune donnée modifiée).

## 1. Ce qui était faux (constaté)

| Texte du CV | Masque posé | Cause |
|---|---|---|
| « …General Electric et **Stellantis** autour du… » | `[NOM]` | spaCy prend le mot pour une personne **à une seule de ses 3 occurrences** (les autres restent lisibles) |
| « Céramique Algérienne **\| Hassi Ameur** - Oran » | `[NOM]` + la barre `\|` avalée | une commune (suivie de sa wilaya) prise pour une personne ; ponctuation de bordure incluse dans l'entité |
| `linkedin.com/in/rafik-mohammed-` ⏎ `boumaza-a3257762` | `[URL]` puis **`-a3257762` en clair** | le PDF coupe le lien après un tiret ; le motif s'arrêtait au retour à la ligne, le reste n'était masqué que par le filet « nom connu » |

Le `[NOM] [NOM]` du pied de page, lui, est **correct** (nom du candidat) : vérifié avec l'utilisateur.

## 2. Correctifs (règles ciblées, le NER n'est jamais désactivé)

- `jobs/confidentialite_ia/patterns.py` : `_SUITE_URL` — un lien linkedin/github qui se termine par un tiret reprend le premier mot de la ligne suivante (quantificateur borné à 100, règle anti-ReDoS du fichier respectée ; une ligne ordinaire n'est **jamais** absorbée). Nouvelle fonction `motif_wilayas()` (motif des wilayas construit une fois, **partagé** par `pseudonymisation.detecter_lieux_entete` et `ner.py` : plus de duplication).
- `jobs/confidentialite_ia/ner.py` :
  - `_a_retirer_en_bordure` : une ponctuation seule (`|`, `-`) en bordure d'une entité « personne » est retirée, comme les mots d'organisation ;
  - `_suivie_d_une_wilaya` : **dans le corps** (au-delà de `ZONE_ENTETE` = 600 caractères), une « personne » suivie de `- / ,` puis d'une wilaya est un lieu → non masquée (décision antérieure : les communes ne sont pas masquées). **Dans l'en-tête** la règle ne s'applique pas : « Mme KARIMI Lina, Oran » garde son nom masqué ;
  - `_detecte_a_tort` : un mot unique détecté comme personne dans **moins de la moitié** de ses occurrences est un nom d'entreprise (Stellantis : 1 sur 3). Un nom cité **une seule fois** n'est jamais écarté.
- `jobs/confidentialite_ia/pseudonymisation.py` : utilise `motif_wilayas()`.

Tests (écrits avant, constatés en échec, puis verts) : `NerFauxPositifsCvIndustrielTest` (4) dans `test_confidentialite_ner.py`, `UrlCoupeeEnFinDeLigneTest` (2) dans `test_confidentialite_motifs.py`. Au passage : un test d'abord rédigé avec un extrait trop court (la commune tombait dans l'en-tête de 600 caractères) a été corrigé en plaçant l'extrait après l'en-tête, comme dans un vrai CV.

Vérifié : 51 tests de confidentialité OK ; 184 tests ciblés (confidentialité, pseudonymisation, parser, IA) OK. **Suite backend complète non relancée.**

## 3. Limites connues / approches écartées

- La règle de cohérence ne rattrape pas un employeur cité **une seule fois** et pris pour une personne : le risque inverse (laisser passer un vrai nom cité une fois) est pire, la règle ne s'applique donc qu'à partir de 2 occurrences.
- Une commune suivie de sa wilaya **dans l'en-tête** reste masquée : c'est voulu (« Nom, Oran »).
- Approche écartée : retirer « Stellantis » par une liste d'employeurs → ne généralise pas ; la cohérence d'occurrences est indépendante du CV.

## 4. Blocs en colonnes du PDF : lecture colonne par colonne (option B, choisie par l'utilisateur)

**Problème** : `extract_text_from_pdf_smart` regroupait les mots par hauteur sur toute la largeur : les tableaux en colonnes (« Expertises clés », « Repères de performance ») sortaient mélangés (« Management industriel Gestion de projets Industrialisation »). Sans effet sur les expériences, dates et formations de ce CV.

**Solution** : nouveau module `jobs/cv_parser/colonnes.py` (`regrouper_lignes`, `lignes_simples`), appelé par `extract_text_from_pdf_smart` :
1. chaque ligne est coupée en **cellules** aux écarts horizontaux > 14 points ;
2. un **tableau** commence quand deux lignes consécutives ont chacune **au moins 3 cellules** tombant dans les mêmes colonnes (colonne = intervalle horizontal fusionné : une légende centrée sous un chiffre est dans sa colonne) ; il se prolonge tant que la ligne suivante tient dans une colonne (même seule : fin d'un texte plus long) et que l'interligne reste ≤ 2 × celui des deux premières lignes ;
3. un tableau est lu **colonne par colonne, de haut en bas** ; toute autre ligne reste lue de gauche à droite comme avant ;
4. repli : si la lecture en colonnes lève une exception, journalisée, on retombe sur `lignes_simples` (lecture historique).

**Garde-fou voulu (`MIN_COLONNES = 3`)** : « TITRE ………… date » (2 cellules), une frise date + texte, un CV à 2 colonnes (barre latérale) restent **inchangés** : les lire colonne par colonne séparerait les dates de leurs postes. Descendre à 2 ne se décide qu'après un **corpus de CV réels** (règle CLAUDE.md pour tout changement d'extracteur) ; **un seul CV réel a été vu** et il n'était pas disponible sur disque : la validation s'est faite sur 10 tests synthétiques (dont 1 sur un vrai PDF produit par PyMuPDF).

**Validé sur le vrai PDF** (`Downloads/CV_Rafik_Boumaza_…pdf`, ancien et nouveau texte comparés) : « Repères de performance » correct du premier coup ; « Expertises clés » **mal ordonné** au premier essai : une description de 2e rangée plus large que les lignes du dessus sortait de sa colonne et fermait le tableau (critère « tient dans la colonne »). Corrigé : une ligne reste dans le tableau si elle **chevauche une seule colonne** (`_nb_colonnes_chevauchees` ; une ligne pleine largeur en chevauche plusieurs et ferme toujours le tableau), test `test_deuxieme_rangee_dont_un_texte_depasse…` ajouté. Rejeu : chaque titre est suivi de sa description, colonne par colonne ; le reste du texte est identique à l'ancien.

Tests : `test_cv_colonnes.py` (11) ; les tests ciblés (cv, parser, extraction, confidentialité) restent verts. **À faire** : rejouer les CV suivants pour comparer l'ancien et le nouveau texte.

## 5. Même CV, étape d'intégration : LinkedIn tronqué, date de début manquante, métiers vides

- **LinkedIn tronqué dans le profil** (`linkedin.com/in/rafik-mohammed-` au lieu de `…-boumaza-a3257762`) : l'extraction **locale** des coordonnées (`confidentialite_ia/coordonnees.py`) avait ses propres motifs LinkedIn/GitHub, sans la suite de ligne ajoutée au masquage (§2). `patterns.SUITE_URL` (rendu public) est maintenant partagé et le saut de ligne retiré de la valeur extraite. Test : `test_lien_linkedin_coupe_est_extrait_en_entier_pour_le_profil`.
- **« Date de début manquante »** sur « ORGANISATEUR DE CONDITIONNEMENT Sept. - Nov. 2020 » : l'année n'est écrite qu'une fois pour les deux mois, l'IA ne garde que la fin. `dates_fin.completer_annee_partagee` (appelée dans `parser.py` après `completer_dates_fin`) relit la plage sur la ligne du titre quand le début n'a pas d'année ; une date déjà renseignée n'est jamais modifiée ; le texte du CV est conservé tel quel (« Sept. 2020 »). 4 tests dans `test_cv_parser_dates_fin.py`.
- **« Métier à choisir » sur 5 expériences sur 7** : **ce n'est pas un bug**, c'est un manque du référentiel. Lecture seule de la base : aucun métier « Organisateur… », « Technical… », « Industrialisation… », pas de « Chef de projet industriel/technique » ni de « Manager de production/fabrication » (seulement des « Responsable Production » par sous-secteur et des « Chef de Projet » par domaine). Le garde-fou « ne pas deviner » refuse à juste titre. **Décision de l'utilisateur (option 1)** : (A) trois **appellations** sur des métiers officiels ANEM déjà présents (le référentiel avait « Encadrement méthode en production industrielle » C1401 et « Direction, ingénierie en production industrielle » C2501, mais pas les intitulés écrits par les candidats) : « Organisateur industriel » → C1401, « Manager de fabrication » et « Manager de production » → C2501 ; (B) deux **métiers** sans équivalent, dans le sous-domaine « Méthodes et gestion industrielles » (`TSUB-C3F3E405E022`) : « Chef de projet industriel », « Chef de projet technique » (le groupe « Gestion de Projet » ne concerne que l'informatique). Non rattachés volontairement (trop spécifiques pour un seul CV) : « Organisateur de conditionnement », « Vehicle Technical Manager ».
  - **Mécanisme** : fichier versionné `jobs/data/referentiel_ajouts.json` + commande `python manage.py appliquer_ajouts_referentiel [--dry-run]` (idempotente, tout-ou-rien, cibles désignées par leurs **codes stables**, jamais en pk ; l'import du référentiel ne supprime rien, la commande se rejoue sans risque après chaque import). Même principe que `consolider_referentiel`. Un métier créé suit exactement la forme de l'acceptation d'une demande d'ajout (`demandes_ajout/adaptateurs.py`).
  - **Appliqué** sur la base de développement le 22/10/2026 : 2 métiers, 5 appellations ; 2e passage = « déjà fait » ; `consolider_referentiel --dry-run` : aucune anomalie d'intégrité ; 254 tests liés au référentiel OK. Tests : `test_ajouts_referentiel.py` (8). **Reste à faire** : rejouer la commande en production, et ré-importer le CV (« Remplacer ») pour constater les métiers choisis (l'IA n'est pas déterministe, voir « Limite connue » du 21/10).
- Le CV indique « VEHICLE TECHNICAL MANAGER 2026 » avec une seule année : affiché « 2026 — 2026 ». Non modifié (rien n'indique si le poste est en cours).

Approches écartées : A seule (couper aux écarts sans regrouper : le titre se sépare de sa description) ; C (ordre natif des blocs PyMuPDF : dépend de l'outil qui a généré le PDF, risque de régression sur d'autres CV).
