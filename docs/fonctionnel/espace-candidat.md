# Espace candidat : dashboard, documents, compétences, rendez-vous

> À lire avant de toucher au dashboard candidat, à « Mes documents », « Mes compétences », « Prendre rendez-vous » ou au partage de documents.
>
> Extrait de l'ancien `CLAUDE.md` monolithique (découpage du 2026-10-12) — contenu déplacé tel quel, sans réécriture, du plus récent au plus ancien.
> Les renvois « voir section X » pointent vers un autre fichier de `docs/fonctionnel/` : voir l'index de `CLAUDE.md`.

---

## 🆕 SESSION 21/10/2026 — Mes candidatures : pagination « Voir plus »

- `GET jobs/mes-candidatures/` : **sans `?page`** = liste complète (tableau), car `CandidatDashboard` en tire ses compteurs ; **avec `?page=N`** = `{count, next, previous, results}`, 10 par page (`page_size` ≤ 50, `MesCandidaturesPagination`). Tri `-date_maj, -id` (l'`id` stabilise l'ordre entre deux pages).
- `MesCandidatures.jsx` : page 1 au chargement, bouton « Voir plus (N restantes) » qui **ajoute** la page suivante (jamais de remplacement : le scroll et les panneaux « Pourquoi ce score ? » ouverts sont conservés), compteur « X sur Y ».
- Choix : pagination seule, sans suppression. Un masquage côté candidat (champ + migration) reste possible plus tard ; le recruteur garderait de toute façon la candidature.
- Tests : `jobs/tests/test_api_mes_candidatures_pagination.py` (5 tests sur la vraie route : liste complète, page 1, page 2 sans doublon, périmètre du compte, anonyme refusé). Build Vite OK.

---

## 🆕 SESSION 19/10/2026 — NIN obligatoire pour postuler (exigence ANEM)

- **Règle** : le NIN n'est **pas** demandé à l'inscription ; il est **obligatoire pour postuler avec un compte**. Il est saisi une seule fois, à la première candidature, puis immuable (correction par le support/admin).
- **Serveur** : `PostulerAPIView` répond 403 `NIN_REQUIS` si `User.nin` est vide (le rôle est vérifié d'abord). Route d'enregistrement `POST jobs/profil/nin/` (`EnregistrerNINAPIView`, candidat authentifié, throttle `write_action`) : 18 chiffres (sinon 400 par champ `nin`), 409 `NIN_DEJA_ENREGISTRE` si déjà renseigné, **message générique** `NIN_NON_ENREGISTRABLE` si le NIN appartient à un autre compte (on ne révèle jamais son existence). La réponse ne renvoie jamais le NIN ; la trace du journal ne contient pas sa valeur.
- **Interface** : `Components/ModalNIN.jsx` (+ hook `useModaleNIN`) : quand le serveur répond `NIN_REQUIS`, la modale s'ouvre, le NIN est enregistré, puis la candidature est **rejouée automatiquement**. Branché sur `JobCard`, `JobDetail` et `Recruteur/ReviewCandidature.jsx` (les trois appelants de `jobsService.postuler`). Le profil candidat affiche le NIN en lecture seule s'il existe, sinon un message explicatif.
- **Confidentialité** : visible du **candidat et de l'admin seulement**. Jamais dans `profil_snapshot`, la vue recruteur (`CandidatureRecruteurDTO`), la CVthèque (`ProfilCandidatDTO` sans `include_nin`), ni un prompt IA (le NIN est aussi détecté et masqué par `patterns.py`). Tests : `jobs/tests/test_nin_postuler.py` (12), `ModalNIN.test.jsx` (9).
- **Limite assumée (décision du 19/10/2026)** : la **candidature rapide** (`PostulerRapideAPIView`, sans compte ni profil) n'exige pas le NIN : un candidat peut contourner l'obligation ANEM par cette voie. Consigné dans [problemes-a-traiter.md](../problemes-a-traiter.md).
- **Pas d'écran de saisie dans le profil** (YAGNI) : le NIN se saisit uniquement à la candidature ; `ModalInfos.jsx` explique pourquoi le champ est vide.
- **Existant** : les candidats sans NIN le saisissent à leur prochaine candidature ; les candidatures déjà envoyées ne sont pas modifiées. 5 fichiers de tests de candidature ont reçu un NIN fictif pour leurs candidats.

---

> ⚠️ **Mise à jour 13/10/2026 (point 12)** : le comportement du réglage de visibilité décrit dans la section du 03/09 ci-dessous (« le profil reste toujours visible/recherchable, seul le déblocage est bloqué ; les déblocages déjà acquis restent valides ») est **remplacé**. Désormais : profil masqué → il disparaît de la CVthèque et l'accès est suspendu pour tous les recruteurs, y compris ceux qui l'avaient débloqué (rendu sans nouvelle dépense si le candidat réaffiche) ; compte supprimé → tout accès cesse. Le réglage s'appelle « Visibilité de mon profil dans la CVthèque ». Voir `SECURITY.md` §22 et `portail-recruteur.md`.

## 🆕 SESSION 03/09/2026 — Retours revue croisée : score Formation, refonte Mes documents, visibilité CVthèque, partage de documents

**Contexte** : l'utilisateur a transmis, capture par capture, les retours d'une relecture croisée (Samira TABTI) du produit consignés dans un document Word. Traités un par un, avec clarification à chaque fois avant implémentation.

**1. Score de complétion "Formation" trompeur** (`CandidatDashboard.jsx::CATEGORIES`) : la catégorie affichait 67% pour un profil (BOUMAZA Rafik) dont les formations étaient pourtant bien renseignées — pas un bug de données, la catégorie mélangeait 3 critères indépendants (`Diplôme`, `Spécialité`, `Au moins une formation`) sous le même label "Formation", 2/3 = 67%. Fix : `Diplôme`/`Spécialité` déplacés vers la catégorie "Informations personnelles" (6 critères), "Formation" ne teste plus que `formations_detail.length > 0`.

**2. Refonte "Mes documents" — séparation CV professionnel / Documents privés** : le texte "jamais visible par les recruteurs" du bandeau entrait en contradiction avec la CVthèque (qui expose bien le CV via crédits) — signalé par la relectrice avec la structure cible exacte (CV professionnel visible selon confidentialité / Documents privés diplôme+attestation+certificat+pièce justificative+autres jamais visibles sans autorisation). `MesDocuments.jsx` réécrit en 2 sections distinctes :
- **CV professionnel** : nouvelle carte en haut de page consommant directement `ProfilCandidat.cv_pdf` (upload/remplacer/supprimer via `profilService.updateProfil`, même endpoint que la page Profil) — n'existait auparavant que dans "Mon profil", absent de "Mes documents".
- **Documents privés** : la liste existante (`DocumentCandidat`/`TypeDocument`), renommée, bandeau reformulé sans ambiguïté. Le type "CV" du référentiel `TypeDocument` est **resté actif** (décision explicite de l'utilisateur — utile pour un CV alternatif, ex. version anglaise, distinct du CV principal du profil).

**3. Nouveau : toggle candidat "Déblocage par les recruteurs"** — la case CV professionnel promettait une visibilité "selon vos paramètres de confidentialité" qui n'existait pas encore comme réglage réel (audité : `consentement_cvtheque` existant est le consentement RGPD du **recruteur** avant d'ouvrir la CVthèque, rien côté candidat). Décision utilisateur sur la portée : **le profil reste toujours visible/recherchable** dans la CVthèque, seul le **déblocage par crédit** est bloqué si désactivé.
- Backend : `ProfilCandidat.visible_cvtheque` (BooleanField, défaut `True` — migration `0100`), exposé dans `ProfilCandidatDTO`, modifiable via le PUT `jobs/profil/` existant (déjà générique, aucun code spécial nécessaire). `DeverrouillerCandidatAPIView.post()` (`jobs/views/credits.py`) vérifie `candidat.profil_candidat.visible_cvtheque` **avant** de consommer un crédit — 403 `PROFIL_NON_VISIBLE` si désactivé. Les déblocages déjà acquis (`AccesCandidatDebloque`, "à vie") restent valides quel que soit l'état du toggle — celui-ci ne bloque que les **nouveaux** déblocages.
- Frontend : switch dans la carte CV professionnel de `MesDocuments.jsx` (`profilService.updateProfil` avec `visible_cvtheque` en FormData, comme les autres champs booléens du profil).
- **Piège de déploiement rencontré en direct** : la migration `0100` avait été écrite mais pas appliquée à la base de dev réelle avant que l'utilisateur teste — `PUT /api/jobs/profil/` plantait en `ProgrammingError` (colonne `visible_cvtheque` inexistante). Corrigé par `python manage.py migrate jobs`. **Rappel pour toute session future : toujours appliquer `migrate` avant de dire qu'une fonctionnalité avec nouveau champ modèle est prête à tester**, ne pas se contenter de générer la migration.

**4. Nouveau : partage ponctuel d'un Document privé avec une entreprise** — le bandeau "Documents privés" disait "jamais visibles sans autorisation" mais aucun mécanisme ne permettait de donner cette autorisation (texte non honoré). Demande utilisateur explicite d'ajouter ce mécanisme plutôt que de simplement retirer la mention.
- **Nouveau modèle `PartageDocument`** (`document` FK `DocumentCandidat`, `entreprise` FK `ProfilEntreprise`, `unique_together` — migration `0100`, même migration que le toggle ci-dessus) — autorisation explicite et révocable, jamais un partage global.
- **Entreprises éligibles restreintes** (`_entreprises_relation_candidat()`, `jobs/views/candidat_dashboard.py`) : seules les entreprises avec qui le candidat a déjà une relation réelle (candidature envoyée OU profil débloqué via crédit CVthèque) — décision pour éviter d'exposer un annuaire libre de toutes les entreprises de la plateforme dans le sélecteur de partage.
- **Backend candidat** : `GET jobs/documents/<id>/entreprises-eligibles/` (liste + flag `deja_partage`), `POST`/`DELETE jobs/documents/<id>/partager/(<entreprise_id>/)`. `DocumentCandidatAPIView.get()` inclut désormais `partages: [{entreprise_id, nom_entreprise}]` par document.
- **Backend recruteur** : `GET jobs/cvtheque/candidats/<candidat_id>/documents-partages/` (liste des documents partagés avec l'entreprise du recruteur connecté), `GET .../documents-partages/<doc_id>/fichier/` (sert le fichier via `FileResponse`, uniquement si un `PartageDocument` existe pour cette entreprise — même pattern de vérification d'accès que `CandidatFichierPriveAPIView` pour le CV/photo, pas une URL `/media/` publique).
- **Frontend candidat** (`MesDocuments.jsx`) : bouton "Partager" par document ouvre un panneau inline listant les entreprises éligibles (chargées à la demande), toggle Partager/Partagé ✓ par entreprise, badge "Partagé avec N" sur le document.
- **Frontend recruteur** (`GestionOffre/useGestionOffre.js` + `DetailCandidature.jsx`) : nouveau state `documentsPartages`, fetché à chaque changement de `selectedCandidature` (même effet que le reset de l'analyse IA), affiché en pills vertes à côté des boutons "CV PDF"/"CV Rapide" dans l'en-tête du détail candidature — lien direct vers `documentPartageFichierUrl()` (nouveau helper `utils/mediaUrl.js`, même famille que `candidatFichierUrl`).
- **Surfacé aussi dans la CVthèque** (ajouté après retour utilisateur "je sais pas où le trouver" — le premier passage n'affichait les pills que dans `GestionOffre`, qui exige une vraie candidature déjà reçue ; la CVthèque est l'endroit naturel où un recruteur regarde un profil juste débloqué, sans candidature) : `CVTheque.jsx` a le même `useEffect` (fetch sur `selectedCandidat?.user_id`) et les mêmes pills vertes, juste après le bloc CV PDF/Débloquer du panneau détail.
- **Non fait (périmètre non demandé)** : pas de notification au candidat quand un recruteur consulte un document partagé, pas d'expiration automatique d'un partage (révocation manuelle uniquement).

**🐛 Bugs trouvés en testant en direct, corrigés le jour même** :
1. **`profilService.updateProfil()` renvoie `{message, profil}`, pas le profil** — `MesDocuments.jsx` faisait `setProfil(updated)` avec la réponse brute du PUT au lieu de `updated.profil` (ou d'un refetch), cassant silencieusement l'affichage du CV fraîchement uploadé ("Aucun CV pour l'instant" persistant après upload réussi) et la lecture de `visible_cvtheque` par le toggle. Fix : `refetchProfil()` (un `GET jobs/profil/` après chaque mutation) — même pattern déjà utilisé par `ProfilCandidat/useProfilCandidat.js`, jamais consommer directement la réponse d'un PUT comme si c'était l'objet complet.
2. **Migration `0100` pas appliquée à la base de dev** au moment du premier test utilisateur → `ProgrammingError` (colonne `visible_cvtheque` inexistante) sur `PUT /api/jobs/profil/`. Corrigé par `python manage.py migrate jobs`. **Rappel pour toute session future : toujours lancer `migrate` avant d'annoncer qu'une fonctionnalité avec un nouveau champ modèle est prête à tester.**
3. **Piège récurrent (déjà documenté dans ce fichier pour le chantier CMS) reconfirmé** : `CVTheque.test.jsx` cassé après l'ajout de `jobsService.getDocumentsPartages` — mock incomplet (`getDocumentsPartages` non défini) → `TypeError` non catché dans un `useEffect`. Fix : ajouté au mock (`vi.fn().mockResolvedValue([])`).

**Tests** : `python manage.py check` propre, `npx vite build` propre, `GestionOffre.test.jsx` 11/11 ✅, `CVTheque.test.jsx` 15/15 ✅ (après fix du mock). Pas de test dédié pour `MesDocuments.jsx` (aucun n'existait avant cette session).


## 🆕 SESSION 03/09/2026 (suite 2) — Bug réel : suppression impossible dans "Mes documents" (415)

**Contexte** : signalé par l'utilisateur avec capture — clic sur la corbeille d'un document dans "Mes documents" affichait un popup rouge "Type de média « application/json » non supporté." et le document restait dans la liste après rafraîchissement (vérifié explicitement avant de creuser, pas supposé).

**Cause identifiée** : `DocumentCandidatAPIView` (`jobs/views/candidat_dashboard.py`) avait `parser_classes = (MultiPartParser, FormParser)` (nécessaire pour le POST d'upload) mais **pas** `JSONParser` — or `jobsService.supprimerDocument()` envoie un DELETE avec un corps JSON (`api.delete(url, { data: { id } })`, comportement par défaut d'axios). Sans `JSONParser` dans la liste, DRF rejette la requête en 415 *Unsupported Media Type* **avant même d'atteindre `delete()`** — le message affiché est la traduction française du message DRF standard (projet configuré `LANGUAGE_CODE='fr'` depuis la session mots de passe du 28/07/2026), pas un texte de notre code (recherché, absent du repo).

**Fix** : `JSONParser` ajouté à `parser_classes`. Le POST (upload, multipart) et le DELETE (JSON) passent maintenant tous les deux.

**Nouveau `jobs/tests/test_api_documents.py`** (n'existait pas avant — aucune couverture de test sur cet espace, malgré la fonctionnalité déjà en prod depuis la session "Prendre rendez-vous/Mes documents") : upload+liste, **suppression via corps JSON** (le test qui aurait attrapé ce bug avant la mise en prod), et suppression d'un document appartenant à un autre candidat refusée (404, scoping vérifié).

**Tests** : `test_api_documents.py` 3/3 ✅ (nouveau), `python manage.py check` propre.


## 🆕 SESSION 03/09/2026 (suite 3) — Bug réel : crash "Une erreur est survenue" en partageant un document tout juste uploadé

**Contexte** : signalé par l'utilisateur — partager un diplôme juste après l'avoir uploadé faisait planter toute la page "Mes documents" (ErrorBoundary générique "Une erreur est survenue").

**Cause** : `DocumentCandidatAPIView.post()` (réponse de l'upload) ne renvoyait pas le champ `partages` — contrairement à `GET jobs/mes-documents/` qui l'inclut depuis la session précédente (feature de partage ponctuel). `MesDocuments.jsx::handleTogglePartage` fait `d.partages.filter(...)` sans garde — sur un document tout juste uploadé (jamais rechargé depuis le GET), `d.partages` était `undefined` → `TypeError` non catché → crash React.

**Fix** : `partages: []` ajouté à la réponse `201` du POST (`jobs/views/candidat_dashboard.py`). Défense en profondeur côté frontend : `d.partages || []` avant `.filter()`/spread dans `handleTogglePartage`.

**Tests** : `python manage.py check` propre, `npx vite build` propre. Pas de nouveau test dédié (le scénario exact — upload puis partage immédiat sans refetch — nécessiterait un test frontend, aucun n'existe encore pour `MesDocuments.jsx`).


## 🆕 SESSION 03/09/2026 (suite 4) — Fix overflow pills documents + audit sécurité exposition profil candidat

**Overflow visuel** (`DetailCandidature.jsx`, `CVTheque.jsx`) : les pills de documents partagés (nom de fichier réel, potentiellement long) débordaient de la barre d'onglets sans retour à la ligne ni troncature — signalé par capture (nom coupé "Cv_FILALI_LP7snqc.pd…" + scrollbar parasite). Fix : `flex-wrap` sur les conteneurs, chaque pill en `max-w-40 min-w-0` avec `<span className="truncate">`, tooltip (`title`) conservant le nom complet + date de partage.

**Question utilisateur — "un document uploadé dans Mes documents remplace-t-il le CV du profil ?"** Réponse : non, `DocumentCandidat` (Documents privés) et `ProfilCandidat.cv_pdf` (CV professionnel) sont deux tables/colonnes totalement indépendantes. La confusion venait d'ailleurs : la pill "CV PDF" dans `DetailCandidature.jsx` lit `candidatData?.cv_pdf`, qui vient de `Candidature.profil_snapshot` — un **instantané figé au moment de la candidature** (décision déjà actée du projet, voir tableau "Décisions techniques" → "Snapshot"), jamais rafraîchi ensuite. Une vieille candidature (ex. juin 2026) affiche le CV tel qu'il était CE jour-là, pas le CV actuel du profil — remplacer/ajouter un CV aujourd'hui ne met à jour aucune candidature déjà envoyée.

**Audit sécurité — exposition des champs du profil candidat au recruteur** (déclenché par la question "est-ce que tout ce qui est dans Mon profil est envoyé au recruteur ?", sous-agent Explore dédié) : comparaison ligne à ligne entre `CandidatInfoDTO` (candidature réelle reçue, `jobs/serializers/candidatures.py`) et `ProfilCandidatDTO` en contexte CVthèque (`jobs/serializers/profils.py`, avant/après déblocage crédit).
- **NIN** : vérifié correctement protégé de bout en bout — `get_nin()` ne renvoie une valeur que si `context.get('include_nin')` est vrai, et seul `ProfilCandidatAPIView.get()` (le candidat consultant son propre profil) passe ce flag. Ni la CVthèque ni une candidature reçue ne l'exposent, jamais. Aucun changement nécessaire, juste confirmé.
- **🐛 2 failles réelles trouvées et corrigées** : `date_naissance` et `adresse` (rue complète) étaient renvoyées à **tout** recruteur consultant la CVthèque, **sans déblocage par crédit** — contrairement à email/téléphone/nom complet/nom d'employeur/linkedin/github qui sont déjà correctement masqués tant que `_peut_voir_coordonnees(obj)` est faux. Un oubli dans la liste des champs masqués lors des sessions précédentes (crédits CVthèque, masquage nom/employeur), pas une régression de cette session. Fix : `get_date_naissance()` et `adresse` (converti de champ direct en `SerializerMethodField` `get_adresse()`) suivent maintenant le même gardien `_peut_voir_coordonnees()` — `wilaya`/`commune` restent visibles sans déblocage (suffisant pour l'aperçu géographique), seule l'adresse précise (rue) est gatée, cohérent avec le traitement déjà appliqué au téléphone.
- **Vérifié sans problème** : `profil_snapshot` (figé à la candidature) ne contient ni NIN ni date de naissance — pas de contournement du masquage par ce biais. `ProfilCandidatAdminSerializer` (`fields='__all__'`) expose tout mais n'est consommé que par les vues d'admin plateforme (staff Taftech), jamais par un recruteur.

**Tests** : `python manage.py check` propre, `npx vite build` propre, `test_api_cvtheque.py`/`test_api_cvtheque_credits.py`/`test_api_paliers_gating.py`/`test_api_candidat.py`/`test_profiles_models.py` (37/37 ✅, confirme qu'un candidat consultant son propre profil voit toujours sa date de naissance/adresse complètes — `context={'is_premium': True}` couvre ce cas).

**Suite (même session) — 2 questions de suivi de l'utilisateur sur l'audit** :
- **`sexe`** : confirmé exposé sans masquage (comme diplôme/mobilité/situation — un critère de profil, pas une coordonnée de contact). Décision : **laissé tel quel**, pas de fix demandé après clarification.
- **`salaire_souhaite`** : demande explicite de masquage — convertie en `SerializerMethodField` (`get_salaire_souhaite`) gardée par `_peut_voir_coordonnees()`, même pattern que `adresse`/`date_naissance`. Raison : un recruteur ne doit pas connaître la prétention salariale du candidat sans avoir débloqué le profil (levier de négociation).
- **Investigation "TABTI Samira" affichée 3-5 fois dans la CVthèque"** (capture initiale) : **pas un bug**. `ProfilCandidat` a une contrainte `OneToOne` stricte avec `User`, aucun doublon de profil possible pour un même compte. Vérifié en base (`python manage.py shell`) : ce sont **5 comptes distincts réels**, tous nommés "Samira TABTI" (`meriembelamri432@gmail.com`, `zoheir.fll31@gmail.com`, `stabti@outlook.fr`, `miratabti@gmail.com` RECRUTEUR, `zoheir.fl313131@gmail.com`) — dont 2 sont manifestement des comptes de test de l'utilisateur laissés en base. Utilisateur a refusé la suppression (`non`) — **comptes de test non nettoyés, laissés tels quels sur décision explicite**, aucune action prise sur les données.

**Tests** : `python manage.py check` propre, `test_api_cvtheque.py`/`test_api_cvtheque_credits.py`/`test_api_paliers_gating.py`/`test_api_candidat.py` (29/29 ✅ après le fix `salaire_souhaite`).


## 🆕 SESSION 21/08/2026 (suite 2) — Unification compétences, conseils IA réels, polish dashboard candidat

**Contexte** : suite directe de la refonte dashboard candidat de la session précédente. Retours utilisateur en continu sur l'implémentation initiale, traités un par un.

**Compétences unifiées profil ↔ Mes compétences** : le tag input de la page "Mon profil" (texte libre `ProfilCandidat.competences`) et la page structurée "Mes compétences" (`CompetenceCandidat`, avec niveau) étaient deux systèmes distincts qui divergeaient. Décision utilisateur explicite : les deux doivent refléter EXACTEMENT la même donnée, jamais une duplication. Fix :
- `ProfilCandidatAPIView.put()` (`jobs/views/profils.py`) : nouvelle fonction `_synchroniser_competences_depuis_texte(profil)` appelée à chaque écriture du champ `competences` — fait converger `CompetenceCandidat` vers la liste texte (ajoute les nouvelles au niveau DEBUTANT, supprime celles retirées, préserve le niveau des existantes).
- **Backfill paresseux** (`ProfilCandidatAPIView.get()` et `CompetenceCandidatAPIView.get()`) : un profil dont les compétences texte existaient déjà AVANT l'introduction de `CompetenceCandidat` n'avait jamais déclenché la synchro (elle ne se faisait qu'à l'écriture) — sans ce backfill à la lecture, "Mes compétences" restait vide indéfiniment pour tout profil existant tant qu'aucune resauvegarde n'avait lieu. Bug réel découvert en testant sur le vrai compte de l'utilisateur.
- `ProfilCandidatDTO` (`jobs/serializers/profils.py`) expose désormais `competences_detail` (nouveau `CompetenceCandidatSerializer`) en plus du texte libre `competences`.
- Frontend `ProfilCandidat/index.jsx` : la section Compétences affiche maintenant `profil.competences_detail` (tags avec sélecteur de niveau inline + suppression) au lieu de `profil.competences.split(",")` — ajout via `jobsService.ajouterCompetence(label, "DEBUTANT")` au lieu du mécanisme `handleAddTag` générique (toujours utilisé pour les langues).
- **Décision produit reconfirmée** (page "Mes compétences" faillie supprimée par erreur puis restaurée sur demande explicite) : garder les DEUX écrans (profil = usage courant rapide, Mes compétences = gestion dédiée avec recherche), la donnée sous-jacente étant maintenant unique.

**🚨 Incident — données de test réelles écrasées** : plusieurs commandes de smoke-test lancées via `python manage.py shell` contre la base de dev réelle (pas une base de test isolée) utilisaient `User.objects.filter(role='CANDIDAT').first()` sans `order_by` explicite — non déterministe côté PostgreSQL, a retourné tantôt le compte `meriembelamri432@gmail.com` (id 5) tantôt le compte réel de l'utilisateur `zoheir.fll31@gmail.com` (id 7) selon l'appel. Résultat : les 16 compétences réelles du compte de l'utilisateur ont été écrasées par des valeurs de test. Restauré manuellement à partir des captures d'écran partagées dans la conversation (seule source de la valeur d'origine, la BD ne la conservait plus). **Leçon actée : ne plus jamais faire de `.filter().first()` sans `order_by` ni muter des données via shell contre la base de dev réelle — utiliser `.get(email=...)` sur un compte identifié, ou le framework de test Django avec une base isolée.**

**Parser CV — niveau détecté par compétence** : `PROMPT_CV_COMPLET` (`jobs/cv_parser.py`) étend l'extraction avec `competences_niveaux` — même format texte que les langues (`"Compétence:Niveau, ..."`), Groq estime le niveau depuis le contexte du CV (ancienneté, mentions, mots comme "maîtrise"/"notions"). Nouvelle fonction `_parser_niveaux_competences()` convertit vers les codes `CompetenceCandidat.NIVEAU_CHOICES`. `parse_cv()` expose `result["competences_niveaux"]` (dict `{label: code}`). Frontend (`useProfilCandidat.js::handleValiderParsing`) : après la sauvegarde du profil (qui crée les compétences au niveau DEBUTANT par défaut via la synchro), affine chaque niveau détecté via `jobsService.ajouterCompetence(label, niveau)`. Aperçu de confirmation (`Modals.jsx`) affiche le niveau à côté de chaque compétence détectée.

**Conseils personnalisés — LLM réel, pas déterministe** : première version (règles if/else côté client) jugée insuffisante par l'utilisateur ("non faites le llm, et pas qu'un seul conseil"). Remplacé par un vrai appel Groq :
- Nouveau `jobs/conseils-personnalises/` (`ConseilsPersonnalisesIAAPIView`, `jobs/views/candidat_dashboard.py`) — envoie au LLM le score de profil, les statuts de candidatures, les compétences non confirmées, le nombre d'alertes ; retourne 3-5 conseils concrets en JSON strict (`response_format: json_object`, comme `GenererOffreIAAPIView`). `GroqThrottle` réutilisé (20/h).
- **Nouveau toggle admin** `AIConfig.conseils_dashboard_actif`/`_max_tokens`/`_prompt` (migration `0078`), ajouté à `AdminIAConfig.jsx` (5ᵉ carte fonctionnalité) — même pattern kill-switch que les 4 fonctionnalités IA existantes.
- **Décision** : contrairement au Score de profil (volontairement déterministe, cf. session précédente — fiabilité d'un score arbitraire), les conseils sont du texte reformulé à partir de données réelles fournies dans le prompt, pas une auto-évaluation numérique — cas d'usage où le LLM est fiable.
- Widget dashboard toujours visible (même vide) plutôt que masqué silencieusement en cas d'échec — affiche le message d'erreur exact renvoyé par le backend (503 si désactivé par l'admin, sinon message générique).

**Recherche rapide dans le dashboard candidat** : après plusieurs tentatives ratées de l'intégrer dans la `Navbar.jsx` globale (collisions de layout avec les liens de navigation et les icônes de compte à largeur de fenêtre réduite, revert complet à deux reprises), décision finale : barre de recherche + sélecteur wilaya **dans la page `CandidatDashboard.jsx` elle-même**, pleine largeur, juste sous le titre — pas dans la navbar. Soumission navigue vers `/offres?search=...&wilaya=...` (déjà lu par `JobsList.jsx` via `useSearchParams`).

**Alertes d'emploi — widget dashboard enrichi** : affiche désormais wilaya + fréquence (Quotidienne/Hebdomadaire) sous chaque alerte (pas seulement les mots-clés), liste complète (plus de troncature à 4), et une bascule groupée "Recevoir mes alertes par email" en haut du widget qui active/désactive toutes les alertes du candidat en un clic (boucle sur `jobsService.toggleAlerte` existant, aucun nouveau endpoint).

**Mise en page — alignement sur le palier "Petit" du design system** : le dashboard avait dérivé vers une densité encore plus compacte que le palier "Petit" documenté (Login/ReviewCandidature/CVthèque), créant une incohérence visuelle marquée avec le reste du site. Remonté à `text-sm`/`text-xl`, `p-5`, icônes 16px — cohérent avec le reste de l'app, toujours nettement plus dense que le palier "Grand" (ProfilCandidat/MesCandidatures). Colonne latérale (Suivi candidatures/Alertes/Activité) passée en `sticky top-20` pour éviter un grand vide visuel quand elle est plus courte que la colonne principale.

**Offres recommandées — carte dédiée** : `JobCard` générique (conçue pour des grilles pleine largeur) rendait mal dans le carrousel étroit du dashboard. Nouveau composant local `RecommendedJobCard` (logo circulaire, titre, wilaya, badges CDI/Compatible, salaire) — plus proche du mockup, sans les actions "Postuler"/"Voir détails" superflues dans ce contexte compact.

**Analyse de mon CV — remplace l'ancien widget "Score de profil" isolé** : même score composite déterministe (session précédente, inchangé), mais présenté avec un message contextuel ("Bon profil !"/"Profil à renforcer") et deux colonnes **Points forts / À améliorer** dérivées des composantes du score (ratio points/max ≥ 0.7 = point fort), plus une liste "Compétences à développer" (barres de progression par niveau, exclut les compétences déjà Confirmées) — remplace l'ancien widget "Mes compétences" (liste plate) sur le dashboard uniquement, la page dédiée "Mes compétences" reste inchangée.

**🐛 Piège récurrent (déjà documenté dans ce fichier pour le chantier CMS) reconfirmé** : le changement de rendu des compétences dans `ProfilCandidat/index.jsx` (texte → `competences_detail`) a cassé silencieusement 2 tests (`ProfilCandidat.test.jsx`, et `RegisterCandidat.test.jsx` — qui teste en réalité `<ProfilCandidat />`, nom de fichier trompeur) car leurs mocks de profil n'incluaient pas `competences_detail`. Fix : ajout du champ aux fixtures + mocks `jobsService.ajouterCompetence`/`supprimerCompetence`/`searchCompetences` + réécriture de l'assertion HP4 (attendait un `FormData` PUT sur `/profil/`, attend maintenant un appel direct à `ajouterCompetence`).

**Tests** : backend 338/338 ✅, frontend 402/402 ✅, `npx vite build` propre, `python manage.py check` propre, endpoints IA vérifiés en conditions réelles (Groq réel, pas mocké) contre la base de dev.

---


## 🆕 SESSION 21/08/2026 (branche `specs/important-features`) — Refonte tableau de bord candidat (mockup employeur)

**Contexte** : l'employeur a envoyé des mockups générés par IA montrant une refonte souhaitée du tableau de bord candidat. Chaque point discuté individuellement avec l'utilisateur avant tout code (14 points au total : 6 "réorganiser l'existant", 8 "nouvelles fonctionnalités"), puis délégation complète ("faites tt debrouilles vous je vais sortir je compte sur votre expertise"). Nouvelle branche `specs/important-features` créée depuis `main` à jour (après commit du travail précédent : prompts IA éditables + audit dashboard admin).

**Décisions actées point par point** :
1. Jauge de complétude compacte + 6 sous-barres par catégorie (Informations personnelles, Expérience professionnelle, Compétences, Formation, Langues, CV), chacune avec tooltip listant ses critères exacts.
2. Offres recommandées : badge % de matching + carrousel horizontal (au lieu d'une liste verticale figée).
3. Nouveau **Score de profil** composite /100, remplace l'ancienne "Analyse IA du CV" comme widget principal — **volontairement pas généré par l'IA** (peu fiable pour s'auto-noter sur une échelle arbitraire), calcul déterministe backend : complétude (25pts) + diplôme (20pts, barème hiérarchique) + expérience (20pts, années plafonnées à 10) + langues (15pts, moyenne des niveaux déclarés) + pertinence marché (20pts, moyenne du score de matching sur les offres actives, réutilise `matcher.calculer_score_matching` sans nouvelle logique). "Pourquoi ce score ?" (explication détaillée) volontairement reporté — pas encore fait.
4. Dernières candidatures : logo entreprise ajouté (nouveau champ `entreprise_logo_url` sur `MesCandidaturesDTO`).
5. Alertes d'emploi : compteur "nouvelles offres" fiabilisé via un timestamp `derniere_consultation` (reset à la consultation) plutôt qu'un calcul figé — dupliqué sur le dashboard et sur `/alertes`.
6. Suivi candidatures : funnel 6 lignes (Envoyées / Présélection / En cours / Entretien / Retenu / Refusé) — décision : ne PAS fusionner Retenu+Refusé en une seule ligne "Décision".
7. **Compétences à développer** (%) — reporté, lié à la Feature 3 ("Mes tests") qui reste à décider.
8. Recommandations de formation externe (Udemy/Coursera) — **écarté**, pas fait.
9. **Mes tests** (évaluation de compétences) — **PARKÉ explicitement**, l'utilisateur veut y réfléchir davantage. Ne pas construire sans nouvelle demande.
10. **Prendre rendez-vous** — système complet avec agenda réel, entièrement configurable par l'admin, un seul conseiller/agenda (pas multi-intervenants).
11. **Mes documents** — espace 100% privé (jamais visible aux recruteurs), catégories de documents configurables par l'admin (pas codées en dur).
12. **Mes compétences** (page dédiée) — option structurée choisie : chaque compétence a un niveau auto-déclaré (Débutant/Intermédiaire/Avancé/Confirmé), conçu pour s'articuler plus tard avec un statut "Vérifié par test" une fois "Mes tests" construit.
13. **Activité récente** — fil d'événements "Candidature consultée" (recruteur a ouvert la candidature) et "Profil recommandé" (déclenché uniquement si score de matching ≥ 80%, même seuil que la convention "+80% IA" déjà en place ailleurs — pas pour une simple consultation de profil sans contexte).
14. **Publier mon CV** — simple raccourci vers le flux d'upload CV existant, aucun nouveau backend.

### Backend — 8 nouveaux modèles (`jobs/models.py`, migration `0076` + seed `0077`)
`CompetenceCandidat` (label, niveau, source — resynchronise `ProfilCandidat.competences` texte libre à chaque écriture pour ne rien casser côté `matcher.py`/`cv_parser.py`), `TypeDocument` (catalogue admin, seedé avec 5 types de départ : CV/Diplôme/Attestation/Lettre de motivation/Certificat), `DocumentCandidat` (FK profil + type, jamais exposé aux recruteurs), `ConfigRendezVous` (singleton `get_solo()`, délai min de réservation + horizon max), `DisponibiliteRecurrente` (gabarit hebdomadaire admin : jour + heures + durée créneau), `JourBloque`, `RendezVous`, `ActiviteProfil`. Champ `derniere_consultation` ajouté à `AlerteEmploi` existant.

**Score de profil** (`jobs/profile_score.py`, nouveau fichier) : `calculer_score_profil(candidat_user)` — 5 composantes documentées ci-dessus, réutilise `_annees_experience`/`_deduire_annees_sans_chevauchement` de `matcher.py` (pas de réimplémentation).

**Créneaux de rendez-vous calculés à la volée** (`jobs/views/candidat_dashboard.py::_generer_creneaux_disponibles()`) — jamais matérialisés en base individuellement, calculés à chaque requête à partir de 3 entrées indépendantes (gabarit hebdomadaire actif + jours bloqués + créneaux déjà réservés). Vérifié en conditions réelles : le délai minimum de réservation exclut bien les créneaux du jour même pour le jour de la semaine configuré, en sautant à l'occurrence de la semaine suivante.

**Compteur d'alertes fiable** (`AlerteEmploiSerializer.nb_nouvelles_offres`) : compte les offres publiées après `derniere_consultation` (ou `date_creation` si jamais consultée) — pas un compteur stocké à incrémenter, toujours recalculable, pas de race condition. Nouveau `AlerteMarquerVueAPIView` (`POST jobs/alertes/<id>/marquer-vue/`) reset le timestamp.

**Activité récente — anti-spam** : `CandidatureMarquerConsulteeAPIView` (`POST jobs/candidatures/<id>/marquer-consultee/`, appelé côté frontend recruteur dans `GestionOffre/index.jsx::handleSelectCandidature`, fire-and-forget) logue un événement `CANDIDATURE_CONSULTEE` via `get_or_create` (jamais de doublon). `CVThequeView.get()` (`jobs/views/recruteur.py`) logue `PROFIL_RECOMMANDE` pour tout candidat scoré ≥80% dans les résultats, **throttlé à 1 événement / 24h par paire (candidat, entreprise)** pour éviter le spam à chaque rafraîchissement de recherche CVthèque.

**19 nouvelles routes** ajoutées dans `jobs/urls.py`, toutes placées avant le catch-all final `<str:offre_id>/` (contrainte critique déjà documentée dans ce fichier — toute route littérale doit précéder ce pattern).

### Frontend
- **`Services/dashboardCandidatService.js`** (nouveau) — ~20 méthodes candidat + admin, réexporté dans la façade `jobsService.js` (`...dashboardCandidatService`).
- **`Pages/Candidat/CandidatDashboard.jsx`** — réécrit en entier : jauge compacte + 6 sous-barres avec `TooltipIcon`, carrousel offres recommandées (scroll horizontal + boutons flèches) avec badge `matching_score`, widget Score de profil (jauge + détail 5 composantes), funnel candidatures 6 lignes, dernières candidatures avec logo entreprise, widget alertes avec compteur fiable, widget Activité récente, 3 raccourcis vers Mes compétences / Mes documents / Prendre rendez-vous, bouton "Publier mon CV".
- **3 nouvelles pages candidat** : `MesCompetences.jsx`, `MesDocuments.jsx`, `PrendreRendezVous.jsx` — pattern déjà établi (`AlertesEmploi.jsx` : liste + modale + `confirmToast`). Ajoutées à `CandidatLayout.jsx` (sidebar) et aux routes `App.jsx` (dans le même `<Route element={<CandidatRoute><CandidatLayout /></CandidatRoute>}>`).
- **2 nouveaux panels admin** : `AdminRendezVous.jsx` (config délai/horizon + 3 onglets : créneaux récurrents / jours bloqués / liste rendez-vous avec changement de statut inline) et `AdminTypesDocuments.jsx` (CRUD simple, pattern `AdminFaq.jsx`). Routes + entrées sidebar section "Système" dans `AdminLayout.jsx`.

**Piège récurrent (déjà documenté dans ce fichier pour le chantier CMS) reconfirmé cette session** : l'ajout de `jobsService.marquerCandidatureConsultee` dans `GestionOffre/index.jsx::handleSelectCandidature` a fait échouer silencieusement (unhandled exception, pas un test rouge) `GestionOffre.test.jsx` — le mock `vi.mock("../src/Services/jobsService")` du test ne définissait pas cette méthode. Fix : ajout de `marquerCandidatureConsultee: vi.fn().mockResolvedValue(null)` au mock.

**Audit sécurité** : tous les nouveaux endpoints candidat vérifient `request.user.role == 'CANDIDAT'` explicitement (pattern déjà établi) ; tous les endpoints admin `IsAdminUser` + `request.user.role == 'ADMIN'`. Documents candidat (`DocumentCandidatAPIView`) scopés strictement à `request.user.profil_candidat` — jamais exposés aux recruteurs (aucune route recruteur/admin ne les expose). `RendezVousAPIView`/`RendezVousAnnulerAPIView` scopés à `candidat=request.user`. RAS.

**Tests** : backend 338/338 ✅ (2 échecs pré-existants sans rapport avec ce chantier corrigés au passage — `test_api_marche.py` référençait encore l'ancien champ `salaires_par_secteur`, renommé `tension_par_secteur` lors de la refonte dashboard admin du 21/08 ; mis à jour vers le nouveau format), frontend 402/402 ✅ (dont le fix `GestionOffre.test.jsx` ci-dessus), `npx vite build` propre, `python manage.py check` propre, tous les nouveaux endpoints vérifiés manuellement en conditions réelles contre la base de dev (`APIClient` en shell Django).

**Non fait cette session (hors scope explicite)** : "Mes tests" (Feature 3, parké par l'utilisateur), "Compétences à développer" %, recommandations de formation externes, explication détaillée "Pourquoi ce score ?" pour le Score de profil.

---

