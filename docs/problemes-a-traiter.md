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

Un CV de manager industriel sortait avec 5 « Métier à choisir ». Option 1 de l'utilisateur appliquée : 3 appellations sur des métiers officiels (« Organisateur industriel », « Manager de fabrication », « Manager de production ») et 2 métiers (« Chef de projet industriel/technique »), par `jobs/data/referentiel_ajouts.json` + `appliquer_ajouts_referentiel` (journal du jour). **En attente** : rejouer la commande en production ; vérifier sur le CV réel après ré-import. Restent volontairement non rattachés : « Organisateur de conditionnement », « Vehicle Technical Manager » (à proposer par les candidats). D'autres métiers manquants pourront être ajoutés au même fichier.

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
