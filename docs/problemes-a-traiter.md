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

## 🟠 Groq : 8 000 tokens par minute = environ 1 analyse de CV par minute pour tout le site

**Trouvé le** : 23/10/2026 ([journal](journal/2026-10-23-corpus-kaggle-evaluation-parser.md)). **Cause vérifiée** par une requête de 5 tokens (en-têtes `x-ratelimit-*`) et par la mesure d'un CV.

**Constat** : le modèle configuré est `openai/gpt-oss-20b`, limite **8 000 tokens par minute** (et 1 000 requêtes). Une analyse de CV consomme **≈ 6 300 tokens** (extraction : 4 115 en entrée dont ≈ 2 800 de prompt de 11 296 caractères, 1 413 en sortie ; classification du titre : 702 + 99). Le compte ne tient donc qu'**environ 1 CV par minute pour l'ensemble du site** : sur 50 CV passés à la suite, 39 ont été refusés (429), même relancés à 45 s d'intervalle. Le premier 429 ouvre un disjoncteur (`ai_engine.CLE_SATURATION`, pause = `retry-after` borné entre 30 s et 1 h) qui refuse ensuite tous les appels.

**Correction d'un constat du 23/10** : la voie de production (`views/ia.py`, vue d'analyse de CV) **gère déjà** la saturation : appel remboursé, message « L'analyse IA est temporairement indisponible. Vous pouvez poursuivre manuellement. » (`IA_FOURNISSEUR_SATURE`), bouton resté actif côté écran (`utils/erreursIA.js`). Le « profil vide sans explication » ne concernait que mon script, qui appelait `parse_cv` directement. Aucun message à décider.

**Risque non vérifié en production** : `settings.CACHES` n'est pas défini (**`LocMemCache`, mémoire de chaque processus**). Avec plusieurs workers gunicorn, le disjoncteur et les verrous anti-double-appel (`ia_quota`, `cache.add`) **ne sont pas partagés** : un worker peut continuer à appeler Groq pendant qu'un autre est en pause, et un double clic traité par deux workers passe le verrou. Le nombre de workers en production n'est pas connu dans le dépôt.

**Mesuré sur les 12 CV traités** : remplissage des champs seulement (expériences : titre, entreprise, date de début 100 % ; formations : diplôme 100 %, établissement 90 %), **pas l'exactitude** (extractions non relues).

**Décisions à prendre (structurantes, à valider)** : (A) passer au compte payant de Groq (plus de tokens par minute ; lié au plafond de dépense du plan du 19/10) ; (B) réduire les tokens par CV (prompt de 11 296 caractères à raccourcir : risque de régression de qualité, à mesurer) ; (C) file d'attente avec nouvelle tentative au lieu d'un refus ; (D) cache partagé (Redis ou table en base) pour le disjoncteur et les verrous. Reprendre ensuite la mesure sur les 39 CV restants (`mesure_ia.py`, pause de 45 s, arrêt après 3 échecs).

**Leviers gratuits examinés le 23/10/2026 (sans passer au compte payant)** : (1) **changer de modèle ne sert à rien** : le compte n'a que 4 modèles de texte (`allam-2-7b` 6 000, `openai/gpt-oss-20b`, `openai/gpt-oss-120b` et `qwen/qwen3.8-27b` 8 000 tokens par minute chacun) ; (2) `reasoning_effort` est **déjà à `low`** ; (3) il reste le prompt (≈ 2 800 des 4 115 tokens d'entrée) : le diviser par deux donnerait environ 4 900 tokens par CV, soit **1,6 CV par minute au mieux**, au prix d'une qualité à mesurer. Sans le compte payant, le plafond réaliste est donc de **1 à 2 analyses de CV par minute** : suffisant au lancement (le candidat peut remplir à la main), insuffisant dès qu'une dizaine de candidats s'inscrivent en même temps.

## 🟡 CV en anglais : NER corrigé le 23/10/2026 (reste : noms d'un seul mot, faux positifs résiduels)

**Corrigé** : modèles français + anglais réunis avec un filtre de forme (`ner.py`, `langue.py`), 338 → 201 détections sur 60 CV, noms de tiers et noms en majuscules masqués ([journal](journal/2026-10-23-corpus-kaggle-evaluation-parser.md)). **Reste ouvert** : un nom d'un seul mot n'est plus masqué sur un CV anglais ; faux positifs résiduels (« Line Cook », « Word ») ; mémoire par worker du modèle anglais non mesurée ; aucun vrai nom en en-tête dans le corpus (rappel mesuré sur quelques cas fictifs seulement). Constat d'origine ci-dessous.

**Trouvé le** : 23/10/2026 ([journal](journal/2026-10-23-corpus-kaggle-evaluation-parser.md)). **Beaucoup de candidats algériens ont un CV en anglais** (remarque de l'utilisateur) : ce n'est pas un cas marginal.

**Constat** (60 CV du corpus Kaggle, `entites_ner`) : le modèle spaCy **français** appliqué à de l'anglais produit ≈ 5,6 détections par CV, presque toutes fausses (« Maintain », « Trained », « including », « Reporting », des bouts de phrases). Pas de fuite, mais le texte envoyé à l'IA perd des mots utiles (un intitulé de poste entier est devenu `[NOM]`). Inversement, sur des CV fictifs : `Karim Benali`, `Amine Boudiaf`, `Fatima Zohra Haddad` sont masqués, mais **`SARAH JOHNSON` en majuscules en en-tête ne l'est pas** ; le nom du candidat est rattrapé par le filet « nom connu » du compte, **pas les tiers** (référents, managers).

**Options à trancher** : (A) détecter la langue et ajouter un modèle spaCy anglais (`en_core_web_sm`, quelques dizaines de Mo par worker, nouvelle dépendance de déploiement) ; (B) garder le modèle français et ajouter des règles ciblées (liste de mots courants à ne pas masquer : fragile) ; (C) ne pas passer le NER sur un texte détecté comme anglais (risque de fuite des noms de tiers).

**Aussi non validé** (corpus anglais, sans PDF en colonnes) : français, arabe, `MIN_COLONNES` (`cv_parser/colonnes.py`), filet de `call_ai` face à un numéro étranger sans indicatif. **À faire** : constituer un corpus de CV algériens (français, arabe, anglais) avec l'accord des personnes ou anonymisés, le passer dans `python manage.py evaluer_corpus_cv --avec-ner`.
