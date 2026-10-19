# Journal de session — 19/10/2026 — pseudonymisation IA, coût Groq, NIN

> Branche `feature/pseudonymisation-ia` (depuis `main`). Conception : [spec](../superpowers/specs/2026-10-17-pseudonymisation-ia-design.md) ; plan : [plan](../superpowers/plans/2026-10-17-pseudonymisation-ia.md). Détail technique : [parser-cv-ia.md](../fonctionnel/parser-cv-ia.md), SECURITY.md §34 et §35.

## Ce qui a été fait

Les 18 tâches du plan sont codées, testées et commitées (une tâche = un ou deux commits, fichiers listés explicitement, jamais `git add .`).

1. Dépendances et réglage : spaCy `fr_core_news_md`, Stanza (modèle arabe), `CONFIDENTIALITE_IA_NER_ACTIF` refusé à `false` en production.
2. Package `jobs/confidentialite_ia/` : motifs, noms/lieux par spaCy, arabe par Stanza, filet dans `call_ai`, extraction locale des coordonnées, champs structurés.
3. Branchement : parser CV, classification métiers/diplômes/spécialités, analyse carrière, conseils, analyse recruteur (jeton `CANDIDAT_xxxxxx`).
4. Aperçu des données transmises (route + composant), case de masquage verrouillée.
5. Coût et résilience Groq : tokens par fonction, analyses réutilisées sans appel, 429 remboursé avec disjoncteur.
6. Information du candidat (consentement, aperçu) et NIN obligatoire pour postuler (exigence ANEM).

## Décisions (et pourquoi)

- **Presidio écarté** : spaCy direct + motifs maison. Le filet de sécurité et les tests ne dépendent d'aucun modèle ; une dépendance de moins.
- **Masquage non décochable** (écart avec le brief initial, validé) : la case est affichée cochée et verrouillée, elle informe sans donner le choix.
- **Employeurs → « Entreprise A/B » + domaine du métier** : le secteur réel de l'employeur n'existe pas dans le modèle (`entreprise` est un texte libre) ; ajouter un champ aurait été un choix de modèle de données.
- **Arabe par Stanza** (choix de l'utilisateur) : spaCy `xx_ent_wiki_sm` écarté (prise en charge de l'arabe non confirmée), GLiNER écarté (le modèle PII officiel ne couvre pas l'arabe, le modèle arabe est communautaire). Mesure sur 10 CV réels = condition d'adoption.
- **429 remboursé, autres pannes décomptées** ; **analyse inchangée = résultat stocké sans décompte** ; **plafond de dépense Groq au passage au payant** (décisions de l'utilisateur).
- **NIN** : obligatoire pour postuler avec un compte, pas à l'inscription ; visible du candidat et de l'admin seulement ; candidature rapide inchangée (contournement consigné).
- **Page `/confidentialite`** : contenu en base, non modifié automatiquement ; paragraphe fourni à l'admin ([cms-contenu.md](../fonctionnel/cms-contenu.md)).

## Approches abandonnées

- Remplacer l'aperçu par un texte calculé côté client : le serveur recalcule toujours le nettoyage (le client ne peut pas envoyer « sa » version).
- Écran de saisie du NIN dans le profil : écarté (YAGNI), la saisie se fait à la candidature, rejouée automatiquement.

## Constats pendant la mise en œuvre

- **Défaut corrigé** : `ParserCVAPIView` renvoyait `str(e)` au navigateur ; plusieurs `logger.error(... %s, e)` écrivaient le texte brut des erreurs du fournisseur (qui peut contenir la clé). Désormais type et statut seulement, avec tests.
- **Piège** : un test de `JobCard` mockait `jobsService` avec seulement `postuler` ; le nouvel appel `enregistrerNIN` impose un mock dédié.
- **Mesures (Windows, CPU)** : spaCy fr + Stanza ar + PyTorch ≈ 1 Go par processus, modèle arabe 220 Mo sur disque, premier chargement ≈ 10 s par modèle. Chaque worker gunicorn charge ses modèles.
- Stanza : le NER arabe a besoin du processeur `mwt` (téléchargé avec `tokenize`), non prévu au plan.

## Reste à faire

- Mesure de qualité du parser sur 10 CV réels (avant/après) et mesure du NER arabe sur 10 CV arabes : à faire avec des CV fournis par l'utilisateur, hors dépôt ; consigner ici **uniquement des décomptes**.
- Coller le paragraphe « Analyse par intelligence artificielle » dans la page Confidentialité (Admin → Pages du site) après relecture juridique.
- Question juridique pour l'employeur : formalités éventuelles ANPDP pour un transfert hors d'Algérie ([problemes-a-traiter.md](../problemes-a-traiter.md)).
- Plafond mensuel de dépense Groq au passage au compte payant.
- Trancher le contournement du NIN par la candidature rapide.
