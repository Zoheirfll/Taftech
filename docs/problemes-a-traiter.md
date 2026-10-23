# Problèmes trouvés — à traiter

> Fichier de suivi des problèmes identifiés mais volontairement reportés (décision explicite de l'utilisateur de ne pas les corriger immédiatement). Chaque entrée doit rester ici jusqu'à ce qu'elle soit traitée puis retirée.

---

## 🔴 Diplôme/Spécialité exclus du score si le recruteur ne remplit que "Diplôme attendu"

**Trouvé le** : 21/09/2026, session de mise en conformité matching (`docs/conception/plans/2026-09-21-matching-referentiel-v2-conformite.md`).

**Contexte** : cette session a supprimé le repli hiérarchique de comparaison de diplômes (`hierarchie = {'TS':7,'LICENCE':8,'MASTER_1':9,...}`) dans `jobs/matcher.py`, conformément à la règle client F06 ("aucune équivalence légale automatique... ne pas utiliser ordre d'affichage, niveau_fp ou nombre d'années comme rang inter-systèmes"). Décision confirmée par l'utilisateur ("suivre le référentiel à la lettre").

**Problème concret** : le formulaire "Publier une offre" / "Modifier une offre" a deux zones distinctes :
1. **"Diplôme attendu"** (`OffreEmploi.diplome`, champ simple, niveau minimum type "Doctorat"/"Master 2"/...) — toujours affiché, pas marqué optionnel dans l'UI.
2. **"Diplômes/spécialités acceptés"** (bloc `OffreDiplomeAccepte`, couples précis diplôme+spécialité) — **marqué "(optionnel)"** dans l'UI (`CreateJob.jsx`, `OffresListPage.jsx`).

Depuis le retrait du repli hiérarchique, **le champ 1 (simple) n'a plus AUCUN effet sur le score de matching** — seul le champ 2 (le bloc "optionnel") est utilisé (`jobs/matcher.py::_score_diplome_specialite`, retourne `(None, None, None)` si `offre.diplomes_acceptes` est vide, quel que soit `offre.diplome`).

**Impact** : diplôme (poids 0.20) + spécialité de formation (poids 0.25) = **45% du score total** silencieusement exclus du calcul pour toute offre où le recruteur ne remplit que le champ simple "Diplôme attendu" — ce qui est probablement le comportement par défaut de la majorité des recruteurs, puisque le bloc détaillé est présenté comme facultatif. Le recruteur n'a aujourd'hui aucun signal fort l'incitant à remplir le bloc détaillé pour ne pas perdre ce poids.

**Ce qui a déjà été fait en attendant** : le texte d'aide sous "Diplômes/spécialités acceptés" a été corrigé pour ne plus prétendre que "Diplôme attendu" sert de repli (c'était devenu faux et trompeur) — il précise maintenant explicitement que sans couple renseigné, ce critère n'est pas évalué. Fichiers : `taftech_frontend/src/Pages/Recruteur/CreateJob.jsx`, `taftech_frontend/src/Pages/Recruteur/OffresListPage.jsx`.

**Options envisagées avec l'utilisateur, décision reportée** :
1. Restaurer un repli hiérarchique sur le champ simple (accepter l'écart avec F06 par pragmatisme produit).
2. Garder le comportement conforme F06 mais forcer/encourager fortement le recruteur à remplir au moins un couple diplôme+spécialité à la création de l'offre (ex. suggestion automatique via `MetierSuggestionsAPIView` déjà existante, pré-remplissage plus agressif, ou champ rendu non-optionnel visuellement).
3. Autre approche à définir.

**À faire à la reprise** : trancher l'une des options ci-dessus avec l'utilisateur avant toute implémentation (décision structurante affectant le score sur potentiellement toutes les offres actives).

---

## 🟠 Changement d'extracteur de texte PDF non validé sur un corpus de CV

**Trouvé le** : 21/10/2026.

**Contexte** : l'extraction du texte passe de `pdfplumber` à PyMuPDF (caractères invisibles Canva). Validée sur 4 CV réels seulement.

**À faire** : passer un jeu de quelques dizaines de CV réels (fournis par l'utilisateur, jamais dans le dépôt) dans l'ancienne et la nouvelle extraction, comparer les lignes (colonnes, dates, puces) avant fusion.

## 🟡 Tableaux en colonnes d'un PDF : lecture colonne par colonne limitée à 3 colonnes (22/10/2026)

Livré (option B, `cv_parser/colonnes.py`, voir le journal du jour) mais **limité aux tableaux d'au moins 3 colonnes** (`MIN_COLONNES`) : frises date + texte et CV à 2 colonnes restent lus ligne par ligne pour ne pas séparer une date de son poste. À trancher après un **corpus de CV réels** : passer à 2 colonnes ? Rejouer d'abord le CV de Rafik Boumaza (colonnes « Expertises clés », « Repères de performance ») et comparer l'ancien et le nouveau texte.

## ✅ Référentiel sans métiers industriels : traité (22/10/2026), à rejouer en production

Un CV de manager industriel sortait avec 5 « Métier à choisir ». Option 1 de l'utilisateur appliquée : 3 appellations sur des métiers officiels (« Organisateur industriel », « Manager de fabrication », « Manager de production ») et 2 métiers (« Chef de projet industriel/technique »), par `jobs/data/referentiel_ajouts.json` + `appliquer_ajouts_referentiel` (journal du jour). **En attente** : rejouer la commande en production ; vérifier sur le CV réel après ré-import. Restent volontairement non rattachés : « Organisateur de conditionnement », « Vehicle Technical Manager » (à proposer par les candidats). D'autres métiers manquants pourront être ajoutés au même fichier. **23/10/2026** : `M03` « Responsable Administration RH & Recrutement » ajouté (groupe « Gestion Administrative »), à rejouer aussi en production ([journal](journal/2026-10-23-assistant-cv-reinitialisation.md)). **À trancher** : dater l'arrivée de chaque demandeur sur une demande d'ajout (modèle intermédiaire) ; effacer en base un métier souhaité laissé vide dans l'assistant.

## 🟠 Communes non masquées avant l'IA

**Trouvé le** : 21/10/2026.

**Contexte** : les wilayas de l'en-tête sont masquées par liste ; les communes (« El Kerma ») ne le sont que si spaCy les reconnaît, ce qu'il rate en majuscules. Aucune liste de communes dans le projet (le champ est libre). Décision de l'utilisateur : wilayas seulement.

**À faire** : si l'employeur l'exige, constituer une liste officielle des communes ou masquer les segments voisins du téléphone/e-mail sur la ligne de contact (risque de sur-masquage).

## 🟡 Logo de la barre recruteur non rafraîchi après modification

**Trouvé le** : 21/10/2026 (état corrigé le jour même : la barre met à jour son logo, y compris à `null`).

**Contexte** : `NavbarRecruteur.jsx` ne charge le logo qu'au changement de page ; l'écran de modification du logo de l'entreprise n'émet pas encore le signal `notifierProfilMisAJour` (`utils/evenementsProfil.js`), que seule la barre du candidat écoute.

**À faire** : émettre le signal depuis l'écran du logo et l'écouter dans `NavbarRecruteur.jsx`.

## 🟡 Classification IA non déterministe pour les titres composites

**Trouvé le** : 21/10/2026.

**Contexte** : « Responsable Administration RH & Recrutement » reçoit selon l'appel « Responsable Recrutement » ou rien. Le garde-fou refuse ce qui ne couvre pas le titre (point 7).

**À faire** : décider avec l'utilisateur d'un éventuel repli (par exemple n'accepter que les appellations de même niveau hiérarchique), ou laisser le candidat choisir.

## 🟠 NIN obligatoire pour postuler : contournable par la candidature rapide

**Trouvé le** : 19/10/2026 (exigence ANEM, plan `docs/superpowers/plans/2026-10-17-pseudonymisation-ia.md`, Task 18).

**Décision de l'utilisateur** : le NIN devient obligatoire pour postuler avec un compte (pas à l'inscription), et la candidature rapide (`PostulerRapideAPIView`, sans compte ni profil) reste sans NIN.

**Problème concret** : un candidat qui veut éviter de saisir son NIN peut postuler par la voie rapide. L'obligation ANEM n'est donc pas garantie pour toutes les candidatures.

**Options à trancher plus tard** : exiger le NIN aussi dans le formulaire rapide ; supprimer la candidature rapide ; accepter l'écart et le documenter auprès de l'ANEM.

## 🟠 Transfert de données vers Groq (États-Unis) : cadre juridique loi 18-07 à confirmer

**Trouvé le** : 19/10/2026 (plan pseudonymisation, Task 17).

**Contexte** : le texte masqué des CV et des profils est envoyé à un prestataire d'IA hors d'Algérie (ZDR activé, données pseudonymisées). Une pseudonymisation n'est pas une anonymisation.

**À faire** : l'employeur confirme si un transfert hors d'Algérie impose des formalités auprès de l'ANPDP. Tant que ce n'est pas confirmé, aucun texte du site n'affirme une autorisation ou une conformité détenue.

## 🟠 Groq saturé : le parser rend un résultat vide, qualité de l'extraction IA mesurée sur 12 CV seulement

**Trouvé le** : 23/10/2026 ([journal](journal/2026-10-23-corpus-kaggle-evaluation-parser.md)).

**Constat** : sur 50 CV du corpus Kaggle passés par `parse_cv`, **39 ont été refusés par le fournisseur** (`FournisseurIASature`, relancé à 45 s d'intervalle : encore 3 échecs de suite). Dans ces cas le parser **avale l'erreur et rend un résultat vide** (`parsing_method` absent, 0 expérience) : un candidat réel verrait un profil non rempli sans explication claire. La cause (limite de débit du plan gratuit, disjoncteur du projet resté ouvert) n'est **pas vérifiée**.

**Mesuré sur les 12 CV traités** : remplissage des champs seulement (expériences : titre, entreprise, date de début 100 % ; formations : diplôme 100 %, établissement 90 %), **pas l'exactitude** (extractions non relues). Trop peu pour conclure.

**À faire** : (1) vérifier la cause (en-têtes de limite Groq, durée du disjoncteur dans `ia_quota`) ; (2) décider du message affiché au candidat quand l'IA est indisponible ; (3) reprendre la mesure sur les 39 CV restants (`mesure_ia.py` : pause de 45 s, arrêt après 3 échecs) quand l'accès est rétabli ; (4) lier au plafond de dépense et au passage au compte payant (plan du 19/10).

## 🟡 CV en anglais : NER corrigé le 23/10/2026 (reste : noms d'un seul mot, faux positifs résiduels)

**Corrigé** : modèles français + anglais réunis avec un filtre de forme (`ner.py`, `langue.py`), 338 → 201 détections sur 60 CV, noms de tiers et noms en majuscules masqués ([journal](journal/2026-10-23-corpus-kaggle-evaluation-parser.md)). **Reste ouvert** : un nom d'un seul mot n'est plus masqué sur un CV anglais ; faux positifs résiduels (« Line Cook », « Word ») ; mémoire par worker du modèle anglais non mesurée ; aucun vrai nom en en-tête dans le corpus (rappel mesuré sur quelques cas fictifs seulement). Constat d'origine ci-dessous.

**Trouvé le** : 23/10/2026 ([journal](journal/2026-10-23-corpus-kaggle-evaluation-parser.md)). **Beaucoup de candidats algériens ont un CV en anglais** (remarque de l'utilisateur) : ce n'est pas un cas marginal.

**Constat** (60 CV du corpus Kaggle, `entites_ner`) : le modèle spaCy **français** appliqué à de l'anglais produit ≈ 5,6 détections par CV, presque toutes fausses (« Maintain », « Trained », « including », « Reporting », des bouts de phrases). Pas de fuite, mais le texte envoyé à l'IA perd des mots utiles (un intitulé de poste entier est devenu `[NOM]`). Inversement, sur des CV fictifs : `Karim Benali`, `Amine Boudiaf`, `Fatima Zohra Haddad` sont masqués, mais **`SARAH JOHNSON` en majuscules en en-tête ne l'est pas** ; le nom du candidat est rattrapé par le filet « nom connu » du compte, **pas les tiers** (référents, managers).

**Options à trancher** : (A) détecter la langue et ajouter un modèle spaCy anglais (`en_core_web_sm`, quelques dizaines de Mo par worker, nouvelle dépendance de déploiement) ; (B) garder le modèle français et ajouter des règles ciblées (liste de mots courants à ne pas masquer : fragile) ; (C) ne pas passer le NER sur un texte détecté comme anglais (risque de fuite des noms de tiers).

**Aussi non validé** (corpus anglais, sans PDF en colonnes) : français, arabe, `MIN_COLONNES` (`cv_parser/colonnes.py`), filet de `call_ai` face à un numéro étranger sans indicatif. **À faire** : constituer un corpus de CV algériens (français, arabe, anglais) avec l'accord des personnes ou anonymisés, le passer dans `python manage.py evaluer_corpus_cv --avec-ner`.
