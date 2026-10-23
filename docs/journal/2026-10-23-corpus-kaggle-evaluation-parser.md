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

## Approches écartées

- **Repérer les titres en majuscules seulement** : les CV du corpus ont des titres en casse normale, le tri ne remontait que des intitulés de poste. Remplacé par « lignes de 4 mots au plus, sans chiffre ».
- **Masquer tout `999-99-9999` ou toute suite de chiffres de 9+** : trop de dates et de matricules touchés.

## Vérification

Tests ciblés OK : 31 (parser, colonnes, extraction), 54 (confidentialité, sections), 42 (NER, arabe, aperçu, architecture IA). **Suite backend complète non relancée.**

## À faire

- Mesurer sur un corpus de CV **algériens** (français/arabe) : colonnes, NER arabe, `MIN_COLONNES`.
- Tester le filet de `call_ai` avec un numéro étranger sans indicatif.
- Rejouer `evaluer_corpus_cv` après toute modification de `sections.py`, `patterns.py` ou `extraction.py`.
