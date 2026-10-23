# Journal du 23/10/2026 — Évaluation du parser et du masquage sur un corpus de 2 484 CV (Kaggle)

## Corpus

« Resume Dataset » (Kaggle, `snehaanbhawal/resume-dataset`) : 2 484 CV **PDF**, en **anglais**, américains, rangés par catégorie (`archive\data\data\<CATEGORIE>\<id>.pdf`), plus un `Resume.csv` (texte déjà extrait, non utilisé ici). Stocké **hors dépôt** (`Téléchargements\archive`) : ce sont des CV de personnes réelles, même si le jeu est public.

**Ce que le corpus mesure** : plantages, lenteurs, découpage en sections, masquage des motifs (e-mail, téléphone, URL). **Ce qu'il ne mesure pas** : le NER (spaCy français sur de l'anglais = bruit, désactivé), l'arabe, le français, les PDF Canva en colonnes de TafTech (aucun caractère invisible U+200C dans ce corpus), le métier proposé. Il ne remplace donc pas la mesure sur des CV algériens réels (condition d'adoption du NER arabe, toujours ouverte).

## Outil : `python manage.py evaluer_corpus_cv <dossier> --sortie <rapport.json> [--echantillon N] [--avec-ner]`

Lecture seule (aucune écriture en base, aucun changement du parser). Le rapport ne contient **aucun texte de CV** : noms de fichiers et compteurs. Écrire le rapport **hors dépôt**.

## Résultats

| Mesure | Avant | Après |
|---|---|---|
| Plantages / CV lents (> 5 s) | 0 / 0 | 0 / 0 |
| Texte extrait trop court | 1 | 1 |
| Section **Expériences** trouvée | 2 246 / 2 484 (90 %) | **2 468 (99,4 %)** |
| Numéros restant après masquage (contrôle large) | 85 CV | **47 CV** |

## Corrections

1. **`cv_parser/sections.py`** : « Work History » ouvrait l'expérience de 221 des 238 CV non détectés. Ajout de `work history`, `employment history`, `professional history` à `experiences`. « Additional Information », « Accomplishments » et « Affiliations » rejoignent `interets` (section volontairement non exploitée : simple délimiteur, sinon leur contenu se mélangeait aux compétences). Tests : `test_cv_parser_sections.py` (4).
2. **`confidentialite_ia/patterns.py`** : numéros étrangers jusque-là en clair (diaspora) : indicatif `+`/`00` hors 213 avec groupes de 2 à 4 chiffres (`+216 20 123 456`, `+44 7700 900123`, `0033612345678`), format nord-américain (`(304) 558-2686`, `304.558.2686`), britannique national (`07700 900123`). Quantificateurs tous bornés (règle anti-ReDoS du fichier). Tests : `test_confidentialite_motifs.py` (+2, dont un garde-fou « dates et années jamais masquées »).

**Effet de bord voulu** : `coordonnees.py` lit le premier motif `TELEPHONE` pour pré-remplir le profil ; un numéro étranger en tête de CV peut donc maintenant être extrait. À surveiller sur de vrais CV.

## Les 47 restants : acceptés, pas corrigés

Presque tous sont des **faux positifs de mon contrôle** (codes postaux `25305-0330`, numéros d'employeur américains `63-1419015`, années, identifiants). Quelques numéros nationaux étrangers **sans indicatif** (`01207673477`) ne se distinguent pas d'un identifiant : les masquer abîmerait des dates et des matricules. Le filet de `call_ai` reste le dernier rempart. Non vérifié ici : que le filet refuse bien ces cas ; à tester avec un CV réel de la diaspora.

## CV en anglais : le NER (constat, puis correction)

Remarque de l'utilisateur : beaucoup de candidats algériens ont un CV en anglais, donc ce corpus est pertinent et le NER doit être jugé sur l'anglais. Mesure (60 CV tirés au hasard, `entites_ner`, aucune modification) :

- **Faux positifs** : ≈ 338 détections, presque toutes fausses (verbes, noms communs, bouts de phrases : « Maintain », « Trained », « including »). Un intitulé de poste entier (« SUBSTITUTE TEACHER ») est devenu `[NOM]`. Conséquence : texte appauvri pour l'IA, pas de fuite.
- **Noms rates** (5 CV fictifs) : `Karim Benali`, `Amine Boudiaf`, `Fatima Zohra Haddad` masqués ; **`SARAH JOHNSON` (majuscules, en-tête) ne l'est pas**. Le nom du candidat reste rattrapé par `detecter_noms_connus` (compte) ; les noms de tiers (référents, managers) non.
- Le corpus n'a **pas de vrai nom en en-tête** (jeu anonymisé) : le rappel du NER sur de vrais noms anglais n'est mesuré que sur ces 5 cas fictifs.

### Décision de l'utilisateur et correction

Option choisie : **modèle anglais après détection de la langue** (`en_core_web_sm`, nouvelle dépendance). **La mesure a contredit la recommandation initiale** : le modèle anglais **seul** n'est pas meilleur (360 personnes détectées sur 60 CV contre 422 pour le français, rate `Amine Boudiaf`, coupe `Fatima Zohra Haddad`, déborde sur la ligne suivante : `Karim Benali\nSoftware Engineer\nOran` en un seul bloc). Retenu : **les deux modèles réunis** sur un CV détecté anglais, avec un filtre de forme.

- `confidentialite_ia/langue.py` : langue par mots-outils (sans dépendance, déterministe) ; « en » seulement si ≥ 8 mots anglais et 1,5 × plus que de mots français ; le doute, l'arabe et les textes courts restent **français** (comportement historique).
- `ner.py` : `_charger(langue)` (un modèle par langue, échec fermé si l'anglais manque) ; `_entites_anglais` : personnes du français + de l'anglais, fusionnées par `fusionner` (« Mohamed Lamine » + « Cherif »), gardées si ≥ 2 mots capitalisés **sur une seule ligne** et sans mot de métier ou de rubrique (« Project Manager », « Work History ») ; titres de politesse et mots d'organisation retirés en bordure ; lignes de 2 à 4 mots en majuscules passées en casse de titre avant analyse (« SARAH JOHNSON » ; même longueur, positions préservées) ; lieux d'en-tête par le modèle anglais, sans mot du gabarit (« Company Name, City, State »).
- Mesure (60 mêmes CV) : **338 → 201 détections**, noms de tiers et noms en majuscules masqués ; 300 CV avec NER : 0 plantage. 111 tests ciblés OK (dont 9 nouveaux : 3 de langue et 6 de comportement, dont 5 rouges avec l'ancien comportement).
- **Limites connues** : un nom d'**un seul mot** n'est plus masqué sur un CV anglais (le nom du compte reste couvert par `detecter_noms_connus`, un référent désigné par son seul prénom non) ; il reste des faux positifs (« Line Cook », « Word », « JD Edwards ») ; un CV anglais court (< 8 mots-outils) suit le chemin français.
- Déploiement : `en_core_web_sm` ajouté à `requirements.txt` et à [deploiement.md](../exploitation/deploiement.md) ; **sans lui, tout CV anglais est refusé** (échec fermé). Mémoire par worker non mesurée.

## Approches écartées

- **Repérer les titres en majuscules seulement** : les CV du corpus ont des titres en casse normale, le tri ne remontait que des intitulés de poste. Remplacé par « lignes de 4 mots au plus, sans chiffre ».
- **Masquer tout `999-99-9999` ou toute suite de chiffres de 9+** : trop de dates et de matricules touchés.

## Vérification

Tests ciblés OK : 31 (parser, colonnes, extraction), 54 (confidentialité, sections), 42 (NER, arabe, aperçu, architecture IA). **Suite backend complète non relancée.**

## À faire

- Mesurer sur un corpus de CV **algériens** (français/arabe) : colonnes, NER arabe, `MIN_COLONNES`.
- Tester le filet de `call_ai` avec un numéro étranger sans indicatif.
- Rejouer `evaluer_corpus_cv` après toute modification de `sections.py`, `patterns.py` ou `extraction.py`.
