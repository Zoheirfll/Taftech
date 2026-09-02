# Design — Wizard d'onboarding candidat en 7 étapes

Date : 2026-09-02

## Contexte

Inspiration : le flow d'inscription du concurrent globaljob-dz.com (captures fournies par l'utilisateur) — upload CV → extraction automatique → étapes séparées (Infos personnelles, Expériences, Formations, Langues, Compétences), chaque étape validée indépendamment avec compteur ("5 expériences ajoutées") et actions modifier/supprimer par carte.

Chez TafTech, l'inscription candidat (`RegisterCandidat.jsx`) s'arrête aujourd'hui à la création de compte (identité + email/mot de passe + OTP) : le candidat atterrit ensuite sur un dashboard vide, avec pour seul filet de rattrapage la checklist "champs manquants" déjà existante dans `ProfilCandidat`. Le remplissage du profil via parsing CV existe déjà (`useProfilCandidat.js::handleParserCVUpload` / `handleValiderParsing`) mais se fait en une seule confirmation globale (mode Remplacer/Ajouter choisi une fois pour tout le profil), pas étape par étape.

## Objectif

Introduire un wizard en 7 étapes qui guide le candidat dans la complétion de son profil, réutilisable dans deux contextes :
1. **Onboarding** — juste après la création de compte, avant le premier accès au dashboard.
2. **Re-upload CV** — remplace l'actuelle modale de confirmation unique de `ProfilCandidat` ("Remplissage automatique"), pour un candidat déjà inscrit qui met à jour son CV.

## Champ nouveau : Sexe

`ProfilCandidat.sexe` (nouveau `CharField` choices `HOMME`/`FEMME`, nullable — migration) — n'existe dans aucun champ actuel. Ajouté uniquement à l'étape 2 du wizard ("Infos personnelles"), et éditable ensuite dans la section Infos de `ProfilCandidat/index.jsx` (même formulaire que téléphone/wilaya/diplôme). **Pas** ajouté à `RegisterCandidat.jsx` (étape 1 de l'inscription) — hors périmètre, le compte se crée sans ce champ.

## Déclenchement (contexte onboarding)

- **Connexion automatique après OTP** : `VerifyEmailAPIView` (`accounts/views.py`) émet désormais les tokens JWT directement (même génération que la vue de login), au lieu de se contenter de marquer `is_active=True`/`email_verifie=True`. Le frontend n'a plus besoin de rediriger vers `/login` après l'OTP.
- **Flag one-shot** : `sessionStorage.setItem("taftech_new_registration", "1")` posé au moment de l'inscription (`RegisterCandidat.jsx`, avant l'appel à `authService.registerCandidat`). Consommé (lu puis supprimé immédiatement) au premier login réussi après vérification — que ce soit via le flux OTP auto-login ci-dessus, ou via `GoogleLogin` (inscription Google, déjà auto-login) — pour rediriger vers `/onboarding` au lieu de `/dashboard-candidat`. Jamais redéclenché aux connexions suivantes (le flag est consommé une seule fois, `sessionStorage` s'efface aussi à la fermeture de l'onglet).
- Aucun nouveau champ backend "onboarding_termine" — inutile car le déclenchement est un événement one-shot côté session, pas un état persistant à vérifier à chaque connexion.

## Composant réutilisable

Un seul composant `Pages/Candidat/Onboarding/OnboardingWizard.jsx`, piloté par une prop `mode` :
- `mode="page"` — route protégée `/onboarding` (`CandidatRoute`), plein écran, pas de bouton fermer (mais chaque étape reste skippable, voir plus bas). Étape 7 : bouton "Continuer" → `navigate("/dashboard-candidat")`.
- `mode="modal"` — ouvert en overlay depuis `ProfilCandidat/index.jsx` (bouton "Remplissage automatique", remplace l'actuel `showParserModal`), avec un bouton "✕ Fermer" toujours visible en haut à droite. Étape 7 : bouton "Fermer" → ferme l'overlay, retourne sur ProfilCandidat rafraîchi (`fetchData()`).

Le composant réutilise en interne la logique déjà présente dans `useProfilCandidat.js` (parsing CV, ajout/suppression expérience/formation, ajout compétence/langue, update profil) plutôt que de la dupliquer — voir section Implémentation.

## Les 7 étapes

Stepper horizontal en haut (pattern déjà utilisé dans `RegisterCandidat.jsx` STEPS), numéroté 1 à 7, étape courante mise en évidence.

### 1. Upload CV
- Reprend `handleParserCVUpload` existant (validation extension/taille, appel `jobsService.parserCV`).
- Lien "Passer cette étape" toujours visible (comme le mockup concurrent) — avance à l'étape 2 sans données pré-remplies.
- Le résultat du parsing (`parsedData`) est gardé en state local du wizard, **pas encore sauvegardé** — sert uniquement à pré-remplir les étapes suivantes.
- Pas de toggle Remplacer/Ajouter à cette étape : uploader un nouveau CV remplace toujours le fichier stocké (`cv_pdf`), c'est le sens même de l'action "uploader".

### 2. Infos personnelles
Champs : nom, prénom, date de naissance, **sexe** (nouveau), wilaya, commune, téléphone, diplôme, spécialité — pré-remplis depuis `parsedData` si disponible, sinon depuis les valeurs déjà en base (compte + profil).
- **Toggle Remplacer/Ajouter** : affiché uniquement si au moins un de ces champs est déjà renseigné en base (sinon rien à remplacer, toggle caché). Défaut sur "Ajouter" (ne réécrit que les champs vides).
- "Continuer" : sauvegarde via PUT profil (réutilise `handleUpdateGeneric`/logique de `setField` déjà présente dans `handleValiderParsing`), puis avance.
- "Passer cette étape" : n'enregistre rien, avance directement à l'étape 3.

### 3. Expériences
- Liste de cartes (titre, entreprise, dates, description tronquée avec "Voir plus", icônes modifier/supprimer) — pré-remplies depuis `parsedData.experiences` (affichées comme "en attente d'ajout", pas encore en base).
- Bouton "+ Ajouter une expérience" ouvre le formulaire déjà existant (`showExpForm`/`newExp`) pour ajouter/corriger une entrée avant validation.
- **Toggle Remplacer/Ajouter** : affiché uniquement si `profil.experiences_detail.length > 0`. Remplacer = supprime toutes les expériences existantes puis ajoute celles de la liste (réutilise le pattern `Promise.allSettled` déjà écrit dans `handleValiderParsing`). Ajouter = ajoute sans toucher aux existantes.
- "Continuer" : sauvegarde en lot toute la liste affichée, avance. Compteur "X expériences ajoutées" affiché en bas (pattern mockup).
- "Passer cette étape" : n'enregistre rien (la liste pré-remplie est abandonnée), avance à l'étape 4.

### 4. Formations
Même pattern que l'étape 3, sur `formations_detail`/`parsedData.formations`.

### 5. Langues
Même pattern, sur `profil.langues`/`parsedData.langues` — réutilise `handleAddLanguage`, badges de niveau (Maternelle/Intermédiaire/etc.) et barres de progression déjà présents dans `ProfilCandidat/index.jsx`.
- Toggle visible uniquement si `profil.langues` non vide.

### 6. Compétences
Même pattern, sur `profil.competences_detail`/`parsedData.competences` (+ `parsedData.competences_niveaux` pour le niveau détecté par l'IA) — réutilise `handleAjouterCompetence`, l'autocomplete existante (`handleCompetenceInputChange`/`searchCompetences`), les badges de niveau (Débutant/Avancé/Confirmé) déjà présents.
- Toggle visible uniquement si `profil.competences_detail.length > 0`.

### 7. Terminé
Écran de succès (icône ✅, "Félicitations !"), résumé du score de complétion (réutilise `completionPercent`/`CHAMPS_PROFIL` déjà calculés dans `useProfilCandidat`). Bouton final selon le `mode` (voir section Composant réutilisable).

## Comportement skip / sortie

- Chaque étape 2 à 6 a un lien "Passer cette étape" — n'enregistre rien pour cette étape précise, avance sans bloquer.
- Fermer l'onglet en cours de route (mode page) : tout ce qui a déjà été validé aux étapes précédentes reste sauvegardé en base ; le reste est repris par la checklist "champs manquants" déjà existante sur `ProfilCandidat`/dashboard. Pas de redirection forcée vers `/onboarding` aux connexions suivantes.
- Mode modal : le bouton "✕ Fermer" est disponible à n'importe quelle étape, ferme l'overlay immédiatement (même règle : ce qui est déjà validé reste sauvegardé, le reste est abandonné).

## Décisions actées / écarts par rapport au mockup concurrent

- Pas de badge "type de contrat" (CDI) sur les cartes d'expérience — le champ n'existe pas sur `ExperienceCandidat`, hors périmètre de cette demande.
- Le toggle Remplacer/Ajouter est **par étape**, pas un choix global unique en début de flow (contrairement à l'actuel `parserMode` de `useProfilCandidat.js`, qui devient obsolète et sera retiré au profit de ce choix par étape).
- Sur un profil neuf (contexte onboarding), aucun toggle n'apparaît jamais (rien à remplacer) — le wizard se comporte alors comme un simple ajout guidé, étape par étape, sans changement de sémantique par rapport à un remplissage manuel classique.

## Implémentation (aperçu, détaillé dans le plan)

- Backend : migration `ProfilCandidat.sexe` ; modification de `VerifyEmailAPIView` pour émettre les tokens JWT.
- Frontend :
  - `Pages/Candidat/Onboarding/OnboardingWizard.jsx` (nouveau) + éventuel hook dédié `useOnboardingWizard.js` qui orchestre les 7 étapes en s'appuyant sur les handlers déjà exposés par `useProfilCandidat.js` (pas de duplication de la logique de sauvegarde/parsing).
  - Route `/onboarding` ajoutée dans `App.jsx` sous `CandidatRoute`.
  - `RegisterCandidat.jsx` : pose le flag `sessionStorage`, redirige après OTP/Google vers le flux de login auto au lieu de `/login` direct.
  - `ProfilCandidat/index.jsx` : le bouton "Remplissage automatique" ouvre `<OnboardingWizard mode="modal" onClose={...} />` à la place de l'actuelle modale de confirmation (`showParserModal` et son contenu associé retirés).
  - `useProfilCandidat.js` : `parserMode` (global) retiré, remplacé par la gestion par étape à l'intérieur du wizard.

## Tests à prévoir

- Backend : nouveau test sur `VerifyEmailAPIView` (tokens JWT présents dans la réponse), test migration `sexe`.
- Frontend : nouveau `OnboardingWizard.test.jsx` (navigation entre étapes, skip, toggle remplacer/ajouter conditionnel, sauvegarde par étape), mise à jour `RegisterCandidat.test.jsx` (redirection post-OTP), `ProfilCandidat.test.jsx` (bouton "Remplissage automatique" ouvre le wizard en mode modal au lieu de l'ancienne modale).
