# Journal du 23/10/2026 — Assistant d'intégration : réinitialisation à chaque analyse de CV, métier RH ajouté

## 1. Réinitialisation du formulaire à chaque nouvelle analyse de CV

**Constat (écran de l'utilisateur)** : après l'analyse d'un nouveau CV, l'étape « Informations personnelles » gardait des valeurs de l'ancien profil absentes du nouveau CV (LinkedIn, service militaire « Dégagé », permis, passeport, véhicule…), de même que l'étape « Préférences de recrutement » (métier souhaité, salaire, mobilité, statut).

**Cause** : dans `uploadCV` (`taftech_frontend/src/Pages/Candidat/Onboarding/useOnboardingWizard.js`), chaque champ s'écrivait `result.x || prev.x` : une information absente du CV laissait l'ancienne valeur du profil.

**Règle décidée avec l'utilisateur** : à chaque analyse, le formulaire repart du CV seul ; **seules les informations données à l'inscription candidat** gardent le repli sur le profil (vérifié dans `RegisterCandidat.jsx` : téléphone, wilaya, adresse, date de naissance obligatoires).

| Étape | Conservé depuis le profil | Remis à zéro (valeur du CV ou vide) |
|---|---|---|
| Infos personnelles | nom, prénom, téléphone, adresse, wilaya, date de naissance (la commune seulement si la wilaya ne change pas) | sexe, titre professionnel, bio, diplôme (+ référence), métier / appellation / métier proposé en attente, service militaire, LinkedIn, GitHub, permis, passeport, véhicule |
| Préférences | — | métier souhaité (jamais déduit d'un CV), appellation, métier proposé en attente, salaire, mobilité, situation actuelle |

**Pièges / limites**
- Le sexe n'est **pas** demandé à l'inscription : il est donc vidé.
- En mode « Ajouter », `saveInfosStep` n'envoie pas les champs vides : le profil en base garde ses anciennes valeurs, seul le formulaire affiché repart du CV.
- `savePrefsStep` omet la clé `metier_souhaite` quand elle est vide : un métier souhaité déjà enregistré n'est pas effacé en base par un formulaire laissé vide (à trancher si l'utilisateur veut l'effacement effectif).
- L'écran du profil (`/profil`, modification manuelle) n'est pas concerné.
- Aucun test ne couvre l'assistant (`uploadCV`) : build de production OK, **non essayé à l'écran après les dernières modifications**.

## 2. Métier ajouté au référentiel : « Responsable Administration RH & Recrutement »

Une expérience (Renault Algérie Production) restait sur « Métier à choisir ». Aucun métier officiel ne couvrait ce poste mixte (existants : « Responsable Administration du Personnel » TAF-000172, « Responsable Recrutement » TAF-000168). Ajout par `jobs/data/referentiel_ajouts.json` (entrée `M03`, groupe `TSUB-4C590EAA46F0` « Gestion Administrative », celui de TAF-000172) puis `python manage.py appliquer_ajouts_referentiel` (simulation `--dry-run` d'abord : seul ce métier était créé). Code créé : `TAF-AJ-M03` (+ appellation `TAF-AJ-M03-A`).

**En attente** : rejouer la commande en production ; rouvrir l'expérience concernée (ou relancer l'analyse) pour sélectionner le métier. Alternative non retenue : le placer dans « Acquisition de Talents » (à côté de « Responsable Recrutement »).

## 3. Demandes d'ajout répétées (compétences, métiers…) — constat, rien modifié

Demande de l'utilisateur : une compétence demandée plusieurs fois ne doit pas se dupliquer à l'infini, seulement garder « qui, quand ». **Déjà en place** (`models/demande_ajout.py`, `demandes_ajout/service.py::creer_demande`) : une seule demande **ouverte** par (type, libellé normalisé), contrainte d'unicité en base ; un même compte ne compte qu'une fois ; les autres rejoignent la demande (`demandeurs`). **Manque** : la date à laquelle chaque demandeur a rejoint la demande (la relation plusieurs-à-plusieurs n'en porte pas). Ajouter un modèle intermédiaire daté est un choix structurant, **à valider avec l'utilisateur** avant toute migration.

**Validé puis fait (même jour)** : nouveau modèle `ArriveeDemandeur(demande, utilisateur, date_demande)` (migration `0150`, unicité par couple, rattrapage des demandes existantes avec la date de création de la demande). `DemandeAjout.demandeurs` est conservée telle quelle (notifications, droits, commandes `migrer_*`) ; `service.enregistrer_demandeur` ajoute le demandeur **et** date son arrivée, sans jamais créer de ligne en double. Le sérialiseur admin expose `demandeurs_apercu[].date`, affichée en infobulle dans `DemandesAjoutPanel.jsx`. Limite : les commandes `migrer_*_vers_demandes` n'écrivent pas de date par demandeur. Tests : `test_demandes_ajout_arrivees.py` (5) ; 78 tests des demandes OK.

## 4. Préférences de recrutement : cause du « rien n'est vidé » (corrigé)

Après l'étape « Infos », `saveInfosStep` appelait `refresh()`, qui **rechargeait `prefsForm` depuis la base** et écrasait la remise à zéro faite à l'analyse. `refresh({ avecPrefs })` ne recharge maintenant les préférences qu'au chargement initial. `savePrefsStep` envoie aussi les champs vides : DRF convertit `''` en `null` pour un `PrimaryKeyRelatedField` nullable (vérifié sur `ProfilCandidatDTO`), donc un métier souhaité laissé vide est **réellement effacé** en base.

## 5. Masquage des communes dans tout le CV (décision du 23/10/2026, SECURITY.md §43)

Constat : « El Kerma » apparaissait masqué `[LIEU]` dans une expérience seulement parce que le CV était court (l'expérience tombait dans les 600 premiers caractères de l'« en-tête »). Décision de l'utilisateur, **qui renverse celle du 21/10** : communes et wilayas masquées **partout**, par son fichier de communes. Fichier du backend : `jobs/data/communes_algerie.json` (généré depuis `taftech_frontend/src/data/communes.json` : noms latins et arabes ; exclus : noms de moins de 4 lettres et quelques noms qui sont aussi des prénoms ou des mots courants). Code : `patterns.trouver_communes` (accents et casse ignorés, mots séparés par espace, tiret ou apostrophe, nom le plus long d'abord) + `pseudonymisation.detecter_communes`.

**Approche abandonnée** : une grande expression régulière à 3 000 branches (jusqu'à 6 s pour 40 000 caractères répétitifs, risque de déni de service) ; remplacée par une recherche dans un ensemble de noms (≤ 0,5 s pour 30 000 caractères). **Limites** : « Hassi Ameur » (CV réel) n'est pas dans le fichier donc reste lisible ; la liste est à compléter à la main. Les tests qui figeaient l'ancienne décision ont été mis à jour (`test_confidentialite_ner.py`). Tests : `test_confidentialite_communes.py` (10) ; 89 tests de confidentialité, parser et arrivées OK.

## 6. Bio vide sur un CV d'étudiant

La bio est **rédigée par l'IA** (`PROMPT_CV_COMPLET`, « sinon null ») : un CV d'étudiante la rendait vide, et l'ancienne valeur masquait ce fait avant la réinitialisation. Consigne durcie dans `cv_parser/prompts.py` (toujours 2 phrases, sur la formation si pas d'expérience, aucun fait inventé). **Pas encore active** : le prompt en base est personnalisé, `synchroniser_prompt_parser_cv` refuse de l'écraser sans `--force` ; à décider avec l'utilisateur.

**Cause mesurée (question « juste ce CV, les autres normal ? »)** : le CV contenait bien son propre paragraphe de présentation et l'extraction (PyMuPDF) et le masquage le laissaient intact. Les journaux `ParsingCV.champs_vides` montrent que, **sur le même CV**, la bio est vide à 4 analyses sur 6 et remplie aux 2 autres : l'IA est non déterministe (même constat pour `nom_complet`, rattrapé par l'extraction locale). Ce n'est donc ni le CV ni les modifications du jour.

**Correctif (actif sans toucher au prompt en base)** : `cv_parser/presentation.py::bio_de_presentation` reprend le paragraphe écrit par le candidat (sous l'en-tête, avant la première section ; lignes de phrase seulement ; jamais de contact ; 600 caractères au plus, coupé en fin de phrase). Branché dans `parse_cv` : `"bio": ai_data.get("bio") or bio_de_presentation(text)`, **la bio de l'IA reste prioritaire**. Vérifié sur le PDF réel. Tests : `test_cv_presentation.py` (7) ; 38 tests ciblés OK. Limite : sans paragraphe net dans le CV, la bio reste vide (rien n'est inventé).

## 7. Photo : ajuster, ne pas l'utiliser, supprimer

- Page profil : bouton corbeille sur la photo (`SectionInfosPerso.jsx`, confirmation `confirmToast`, `handleDeletePhoto` → `remove_photo_profil`, signal à la barre de navigation). Le recadrage existait déjà à l'envoi.
- Assistant, étape « Infos » : la photo détectée peut être **ajustée** (`ImageCropperModal`, cadre rond) ou **écartée** (« Ne pas l'utiliser » : l'ancienne photo est conservée).
- À la fermeture de l'assistant, la page profil émet `notifierProfilMisAJour()` (filet pour la barre de navigation, qui en réalité se mettait déjà à jour : **mon hypothèse initiale était fausse**).
- **Vraie cause du « la photo ne change qu'après avoir actualisé »** : la fiche profil affichait `candidatFichierUrl(user_id, "photo")`, une **URL fixe** (`/media-prive/candidat/<id>/photo/`) que le navigateur garde en cache, alors que la barre de navigation utilise l'URL du fichier (nom unique à chaque envoi). Correctif : `candidatFichierUrl(id, type, version)` ajoute `?v=<nom du fichier>` ; la fiche passe `profil.photo_profil`. Le même piège existe ailleurs (CVthèque, admin, widget recruteur) tant qu'une photo y est remplacée sans rechargement : non traité, la photo n'y change pas pendant la session.

## 8. Écran d'erreur et étape d'envoi du CV

- `utils/ErrorBoundary.jsx` : écriture sobre alignée sur les notifications ; la mise en page d'origine est conservée (première version transformée en carte de notification : **rejetée par l'utilisateur**, une page d'erreur n'est pas une notification). Cet écran était apparu parce que des imports de `StepInfos.jsx` manquaient pendant une série de modifications refusées puis rejouées (corrigé).
- `StepUploadCV.jsx` : un nouveau fichier choisi **remplace** à l'écran le bloc « CV actuellement sur votre profil » ; lien « Annuler » pour revenir à l'ancien CV.

## 9. Admin : fenêtre de détail d'une demande et recherche directe dans l'Explorateur

- **Détail d'une demande** (`demandes/DetailDemandeModal.jsx`, ouverte par un clic sur une ligne du tableau ou sur son libellé ; boutons d'action exclus) : type, origine, date de demande, décision (date, traitée par, entrée ajoutée / rattachée, motif de refus), **tous les demandeurs avec rôle, e-mail et date d'arrivée** (`ArriveeDemandeur`). Un seul composant pour les quatre types (compétence, métier, diplôme, spécialité : `DemandesAjoutPanel` les sert tous). `MAX_DEMANDEURS_AFFICHES` passe de 5 à 50 ; `nb_demandeurs` reste le nombre réel.
- **Recherche de l'Explorateur** (`AdminExplorateurReferentiel.jsx`, onglet Métiers) : la saisie du haut ne filtrait que les secteurs et domaines (« Chef » ne donnait rien). Nouvelle route en lecture seule `GET admin/referentiel-v2/explorateur/recherche/?search=` (`AdminExplorateurRechercheAPIView`, `IsAdminRole`, 2 caractères minimum, 30 résultats au plus) : métiers par libellé **ou par appellation active** (chaque mot dans `cle_recherche`, sans accent ni casse), avec l'appellation qui a fait sortir le métier et son chemin ; un clic ouvre la fiche du métier. Les secteurs/domaines correspondants restent listés dessous. Tests : `test_referentiel_explorateur_recherche.py` (7) ; 15 tests de l'Explorateur OK.

## 10. Admin : refus en masse des demandes d'ajout (SECURITY.md §44)

Demande de l'utilisateur : « supprimer et accepter en masse », précisée ensuite : **seulement le refus en masse** (l'acceptation en masse n'est pas faite : elle demande un parent par demande pour les métiers, diplômes et spécialités). « Supprimer » = **refuser** (aucune suppression de données : une demande refusée garde son motif et peut être réexaminée).
- Route `POST admin/demandes-ajout/refuser-en-masse/` (`AdminDemandesRefuserEnMasseAPIView`, `IsAdminRole`), corps `{ids, motif}`, **100 demandes au plus**. Chaque demande passe par `refuser_demande` comme un refus unitaire (transition vérifiée, motif, notification du demandeur) et reçoit **sa propre trace d'audit** (« refusée (en masse) »). Motif validé **avant** toute écriture. Une demande déjà décidée est signalée dans `ignorees` sans bloquer les autres ; `introuvables` compte les identifiants inconnus.
- Écran (`DemandesAjoutPanel.jsx`, `RefusMasseModal.jsx`) : case à cocher par ligne refusable + case « tout sélectionner » de la page, barre « N sélectionnée(s) · Refuser la sélection », fenêtre qui **liste les demandes concernées** et exige le motif (motifs rapides habituels). La sélection est vidée dès que la liste change (filtre, page, recherche, décision). Valable pour les 4 types.
- Tests : `test_demandes_ajout_refus_masse.py` (9, sur la vraie route : droits candidat / recruteur / anonyme, motif obligatoire, audit, notification, limites).
- Environnement de test : la base `test_taftech_db` était occupée par une autre exécution de tests (session « idle in transaction »), ce qui bloque les lancements ; contournement sans rien modifier dans le projet : un fichier de réglages hors dépôt qui pointe vers une base de test dédiée (`--settings`).

**Vérifié** : build frontend OK ; frontend 721 / 725 tests (les 4 échecs sont ceux, préexistants, de `MesCandidatures`) ; backend : 89 tests ciblés + 26 (demandes) + 15 (Explorateur) + 14 (refus en masse, arrivées) OK. **Non relancée** : la suite backend complète. **Non commité.**
