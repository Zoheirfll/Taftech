# Portail recruteur : dashboard, candidatures, CVthèque, notifications

> À lire avant de toucher au dashboard recruteur, aux statistiques, à la CVthèque, aux candidatures/évaluations, aux notifications recruteur ou à la sidebar recruteur.
>
> Extrait de l'ancien `CLAUDE.md` monolithique (découpage du 2026-10-12) — contenu déplacé tel quel, sans réécriture, du plus récent au plus ancien.
> Les renvois « voir section X » pointent vers un autre fichier de `docs/fonctionnel/` : voir l'index de `CLAUDE.md`.

---

## 🆕 SESSION 29/09/2026 (suite) — Refonte de la page Statistiques recruteur (inspirée de SOMIZ)

**Demande** : la page `/statistiques` (recruteur) était trop pauvre (4 KPI, 1 courbe, barres). Inspirée de `SOMIZ/frontend/src/pages/Statistiques.jsx` (KPI + variation + sparkline, filtres de période, donuts/histogramme recharts, export, impression).

**Réalisé, 100 % côté frontend, aucun endpoint ajouté** (tout est calculé sur `getDashboard().offres[].candidatures[]`, déjà scopé à l'entreprise) :
- `Components/StatCharts.jsx` (nouveau, recharts déjà en dépendance) : `StatAreaChart`, `StatDonutChart` (total au centre, légende scrollable), `StatHistogram`, `StatSparkline`, `ChartTooltip`.
- `Pages/Recruteur/StatistiquesPage.jsx` réécrite : filtres période (30 j / 3 m / 6 m / 12 m / Tout + dates libres) et filtre par offre ; 6 KPI (candidatures, entretiens, recrutements, taux de conversion, score moyen, offres actives) avec **variation vs période précédente de même durée** (masquée pour « Tout », non comparable) et sparkline ; évolution 3 séries à granularité automatique (jour ≤ 35 j, semaine ≤ 200 j, mois au-delà) ; entonnoir cumulatif ; donuts statut / source / type de contrat ; candidatures par wilaya de l'offre ; tableau « Performance par offre » ; export CSV (`;` + BOM UTF-8) et impression (`window.print`, contrôles en `print:hidden`).
- **Choix assumé** : « entretien » = `date_entretien` renseignée OU statut ENTRETIEN (un RETENU sans entretien tracé n'est pas compté). Les statuts sont l'état **actuel** de la candidature (aucun historique de transitions n'existe), donc pas de « délai moyen de traitement ».
- **Palier Business+** : l'appel `getStatistiquesAvancees()` est conservé pour le contrôle d'accès serveur (403 `PALIER_INSUFFISANT`), mais l'histogramme de score est désormais calculé sur la période filtrée (l'endpoint global ne filtre pas par date). Les scores étant déjà exposés par le dashboard à tous les paliers, le gating reste un gating d'affichage cohérent avec l'existant, pas une nouvelle protection.
- Test : `tests/StatistiquesPage.test.jsx`.


## 🆕 SESSION 25/09/2026 — Fixes CVthèque (exposition données), dashboard, questionnaire candidat, déconnexions intempestives

**Contexte** : série de bugs remontés par l'utilisateur avec captures d'écran, traités un par un dans l'ordre. Détail sécurité complet des points 1 et 5 dans `SECURITY.md` §14-15.

**1. CVthèque — données candidat exposées avant déblocage** (capture d'écran, panneau détail affichant un profil non débloqué) — `jobs/serializers/profils.py::ProfilCandidatDTO` :
- **Bug réel** : `linkedin`/`github` étaient listés dans `Meta.fields` sans être déclarés `serializers.SerializerMethodField()` sur la classe — DRF ignorait donc silencieusement les méthodes `get_linkedin()`/`get_github()` (censées masquer tant que non débloqué) et sérialisait la valeur brute du modèle. Les deux liens fuyaient systématiquement.
- **`bio`** ("À propos") : aucun masquage du tout — vérifié sur un cas réel, le texte contient souvent des noms d'employeurs précis ("... chez Renault Algérie Production... site Stellantis/Fiat d'Oran..."), l'info la plus identifiante, alors que les fiches d'expérience structurées affichaient déjà correctement "Entreprise non communiquée" pour la même donnée.
- **Étendu sur demande explicite de l'utilisateur** ("à part la ville" doit rester visible) : `photo_profil`, `first_name`/`last_name` (nom complet — avant : `last_name` tronqué en initiale mais `first_name` en clair, combiné à la vraie photo la ré-identification restait triviale), `commune`, `diplome`/`diplome_ref_libelle`, `metier_libelle` masqués eux aussi avant déblocage. Seuls titre du poste + wilaya restent visibles (nécessaires pour parcourir la liste avant de dépenser un crédit).
- **Bug frontend lié trouvé au passage** (`CVTheque.jsx`) : la `key` React et `isSelected` de chaque carte reposaient sur `candidat.email` — toujours `null` avant déblocage, donc toutes les cartes non débloquées partageaient la même clé et se marquaient mutuellement "sélectionnées". Basculé sur `user_id` (toujours présent).

**2. Activité récente — déblocage CVthèque affichait l'email brut du candidat** au lieu d'une phrase lisible (capture : "rafikboumaza31@gmail.com" au lieu de "Vous avez débloqué le profil de..."). Cause : `DeverrouillerCandidatAPIView.post()` (`jobs/views/credits.py`) passait `candidat.email` comme `detail` du log, et `_phrase_activite()` (`jobs/views/recruteur.py`) n'avait aucun cas pour l'action `DEBLOQUER_CANDIDAT` — repli sur `return detail` brut. Fix : `detail` construit à partir du nom complet du candidat (ou son titre de poste, ou "un candidat" en dernier recours) + nouveau cas dans `_phrase_activite()` → *"Vous avez débloqué le profil de X dans la CVthèque"*.

**3. Dashboard — une offre `EN_ATTENTE` (en cours de validation admin) affichée comme "Active"** (capture d'écran) dans le widget "Mes offres d'emploi actives" (`DashboardRecruteur.jsx`) — le badge de statut ne testait que `est_cloturee`, ignorant complètement `statut_moderation`. Fix : badge à 4 états réels (Clôturée / En attente / Rejetée / Active), cohérent avec ce que fait déjà `OffresListPage.jsx` (page complète liée par "Voir toutes", elle était déjà correcte).

**4. "Candidats recommandés" affichait des scores très faibles (35%, 41%)** comme s'ils étaient pertinents (widget dashboard + page dédiée `/candidats-recommandes`) — aucun seuil minimum n'existait, juste "les meilleurs scores disponibles parmi les candidatures". Aligné sur le seuil déjà utilisé ailleurs dans le code pour qualifier un profil de "recommandé" (`ActiviteProfil.SEUIL_SCORE_RECOMMANDE = 80.0`, utilisé pour la notification "profil recommandé") : en dessous de 80%, un candidat n'apparaît plus dans ces deux endroits — le widget disparaît simplement si aucun candidat n'atteint le seuil, plutôt que d'afficher un score faible comme une recommandation. Appliqué à `DashboardRecruteur.jsx::candidatsRecommandesTous` (frontend) et `CandidatsRecommandesAPIView` (`jobs/views/recruteur.py`, backend — `score_matching__gte=80.0` ajouté au queryset).

**5. Questionnaire candidat — impossible de taper dans les champs** ("je n'ai rien pu écrire") — `Pages/Public/JobDetail.jsx`. Même piège déjà documenté et corrigé pour `FiltersPanel` (`JobsList.jsx`, session 19/07/2026) : `QuestionnaireForm` était un composant défini **à l'intérieur** du rendu de `JobDetail` — chaque frappe déclenche `setReponses` → re-render du parent → nouvelle référence de type pour `QuestionnaireForm` → React démonte/remonte tout le sous-arbre → l'input perd focus et contenu après le premier caractère. Fix : converti en fonction `renderQuestionnaireForm(onNext)` qui renvoie du JSX directement (appelée `{renderQuestionnaireForm(...)}`, pas instanciée comme balise `<QuestionnaireForm />`) — plus de frontière de composant, plus de démontage. **Rappel pour toute future session** : ne jamais définir un composant (`const X = () => (...)`) à l'intérieur du corps d'un autre composant qui a du state local — c'est la 2ᵉ fois que ce pattern précis casse un formulaire dans ce projet.

**6. Déconnexions forcées intempestives en pleine utilisation** ("session expirée" alors qu'il travaillait, bug récurrent) — race condition sur la rotation du refresh token JWT. Backend (`SIMPLE_JWT`) a `ROTATE_REFRESH_TOKENS=True`+`BLACKLIST_AFTER_ROTATION=True` (bonne pratique — empêche le rejeu d'un refresh token volé) : chaque `token/refresh/` réussi blackliste l'ancien refresh token. `axiosConfig.js` ne mutualisait pas les rafraîchissements — sur une page qui charge plusieurs endpoints en parallèle (dashboard, CVthèque), si l'access token (15 min) expirait pile à ce moment, chaque requête en 401 déclenchait indépendamment son propre appel `token/refresh/` ; le 1ᵉʳ réussissait et blacklistait l'ancien refresh token, les suivants (envoyés avant que le navigateur applique le nouveau cookie) échouaient → déconnexion forcée alors que la session était en réalité valide. Fix : mutex `refreshEnCours` (variable module-level, une seule `Promise` de rafraîchissement partagée) — toute requête en 401 pendant qu'un rafraîchissement est déjà en cours attend ce même rafraîchissement au lieu d'en déclencher un second.

**Tests** : backend 102/102 sur les fichiers concernés (cvtheque, crédits, recruteur, serializers profils, candidat, paliers gating), frontend CVTheque/DashboardRecruteur/JobDetail/api/authService tous verts, `npx vite build` propre à chaque étape, `python manage.py check` propre.

---


## 🆕 SESSION 03/09/2026 (suite) — CVthèque : masquage nom employeur + nom complet tant que non débloqué

**Contexte** : capture d'écran utilisateur montrant qu'un profil non débloqué dans la CVthèque affichait déjà, gratuitement, le nom complet du candidat ET le nom exact de son employeur actuel ("SOMIZ Société de Maintenance Industrielle") avec dates et missions détaillées — seules les coordonnées (email/tél) étaient gatées. Avis donné : c'est trop généreux, un recruteur peut déjà identifier et recontacter le candidat par ses propres moyens sans jamais dépenser de crédit — le nom de l'employeur est l'info la plus identifiante d'une expérience. Validé par l'utilisateur.

**Backend** (`jobs/serializers/profils.py::ProfilCandidatDTO`) :
- `get_last_name()` : tronqué à l'initiale (`"T."`) tant que `_peut_voir_coordonnees(obj)` est `False` — même helper déjà utilisé pour email/téléphone/linkedin/github, réutilisé pour rester cohérent avec la logique de déblocage existante. Le prénom reste toujours affiché (repère de navigation dans la liste).
- `experiences_detail` passe de `ExperienceSerializer(many=True, read_only=True)` (champ déclaratif) à un `SerializerMethodField` (`get_experiences_detail`) — sérialise normalement puis remplace `entreprise` par `"Entreprise non communiquée"` sur chaque expérience si non débloqué. Titre du poste, dates et description restent visibles (aperçu suffisant pour donner envie de débloquer, sans donner l'identité de l'employeur).
- **Piège évité** : `ExperienceSerializer` est aussi consommé directement par `CandidatInfoDTO` (`jobs/serializers/candidatures.py::get_experiences`) pour l'affichage d'une **vraie candidature reçue** côté recruteur (`GestionOffre`) — ce contexte n'a AUCUNE notion de crédit/déblocage, l'entreprise doit toujours y être visible. `_peut_voir_coordonnees()` repose sur `self.context.get('unlocked_ids')`/`is_premium` : si le masquage avait été mis directement dans `ExperienceSerializer` (partagé), l'appel `ExperienceSerializer(...)` sans context de `CandidatInfoDTO` (context vide par défaut) aurait halluciné `is_premium=False` → masqué à tort le nom de l'employeur sur une candidature réelle déjà reçue. Évité en gardant `ExperienceSerializer` inchangé et en faisant le masquage un cran au-dessus, dans `ProfilCandidatDTO` uniquement (jamais instancié pour `CandidatInfoDTO`).
- Aucune requête supplémentaire : `get_experiences_detail` réutilise `obj.experiences_detail.all()` (déjà `prefetch_related` par `CVThequeView`), même comportement de requête que le champ déclaratif remplacé.

**Tests** : `test_api_cvtheque.py`/`test_api_cvtheque_credits.py`/`test_api_paliers_gating.py`/`test_api_recruteur.py`/`test_profiles_models.py` (40/40 ✅), `test_api_candidat.py` (6/6 ✅ — confirme que le candidat consultant son propre profil voit toujours son nom complet et ses employeurs, `context={'is_premium': True}` sur `ProfilCandidatAPIView.get()` couvre ce cas), `test_api_cms.py` (44/44 ✅), `python manage.py check` propre.

**Non fait (à discuter si besoin)** : pas de masquage de la photo de profil ni de la wilaya/commune précise (seulement wilaya déjà, pas de commune fine actuellement affichée sans déblocage — à vérifier si jugé encore trop permissif) ; pas de masquage des formations/établissement (jugé moins identifiant qu'un employeur nommé).


## 🆕 SESSION 02/09/2026 — Fix boîte de réception candidat/recruteur mélangées

**Contexte** : signalé par l'utilisateur avec une capture d'écran — sur `/inbox` (portail candidat), la liste affichait des notifications recruteur (« Candidat recommandé », « Nouvelle candidature ») mélangées aux vraies notifications candidat. Ne se produit que pour un compte qui a les deux rôles (candidat ET propriétaire/membre d'une entreprise) — ce qui est le cas du compte de test de l'utilisateur.

**Root cause** : `Notification.destinataire` est un FK `User` générique consommé par un seul endpoint (`GET jobs/notifications/`, `NotificationListAPIView`) sans aucun filtre par portail — juste `filter(destinataire=request.user)`. Les 3 événements recruteur (`CANDIDATURE_SPONTANEE`/`NOUVELLE_CANDIDATURE`/`CANDIDAT_RECOMMANDE`, ajoutés session 29/08/2026 « Centre de notifications recruteur ») et les événements candidat (`INFO`/`ENTRETIEN`/`RETENU`/`REFUS`/`ALERTE`) partagent la même table sans distinction de portail — un compte avec les deux rôles reçoit tout dans la même boîte, quel que soit le portail consulté.

**Fix backend** (`jobs/views/notifications.py`) : nouveau filtre `_filtrer_par_portail(qs, portail)` — `portail=recruteur` ne garde que les 3 types recruteur, sinon (`candidat`, défaut) les exclut. Appliqué sur `NotificationListAPIView.get()` et `MarkAllNotificationsReadAPIView.post()` (lit `request.query_params.get('portail')`) — pas nécessaire sur `MarkNotificationReadAPIView`/`DeleteNotificationAPIView` (déjà scopés par `id` + `destinataire`, un portail ne peut pas agir sur la notification de l'autre par erreur).

**Fix frontend** : `candidatService.getNotifications(portail = "candidat")` et `markAllNotificationsAsRead(portail = "candidat")` passent désormais `portail` en query param. Les 3 emplacements recruteur passent explicitement `"recruteur"` : `NotificationsRecruteur.jsx` (liste + marquer tout lu), `NavbarRecruteur.jsx` et `RecruteurLayout.jsx` (badge compteur). Les 4 emplacements candidat (`BoiteReception.jsx`, `CandidatLayout.jsx`, `Navbar.jsx`, `BottomNavCandidat.jsx`) gardent le défaut `"candidat"`, aucun changement de code nécessaire.

**Tests** : backend 403/403 ✅ (suite complète `jobs accounts`), `npx vite build` propre.

---


## 🆕 SESSION 29/08/2026 (suite 4) — Candidatures des offres clôturées masquées dans la liste globale

**Contexte** : la page sidebar "Candidatures" (`CandidaturesListPage.jsx`) agrégeait `dash.offres` sans filtrer sur `est_cloturee` — les candidatures d'offres archivées depuis longtemps polluaient la liste globale au même titre que les offres actives. Décision utilisateur : les masquer de cette liste, elles restent consultables en ouvrant l'offre directement (fiche offre / onglet "Archivées" de la page Offres).

- `CandidaturesListPage.jsx` : nouveau `offresOuvertes = offres.filter(o => !o.est_cloturee)`, utilisé pour construire la liste de candidatures ET peupler le `<select>` de filtre par offre (une offre clôturée n'apparaît plus non plus dans ce dropdown). Sous-titre de page mis à jour pour expliciter où retrouver les candidatures d'une offre clôturée.
- **Candidats recommandés — vérifié, déjà correct, aucun changement nécessaire** : la page dédiée `/candidats-recommandes` (`CandidatsRecommandesAPIView`, backend) et le widget compact du dashboard (`DashboardRecruteur.jsx::candidatsRecommandesTous`) excluaient déjà les offres `est_cloturee=True` depuis la session du 25/08/2026 — confirmé en relisant le code avant de conclure qu'il n'y avait rien à faire ici.
- **Non touché (périmètre explicitement limité)** : Recrutements et Évaluations gardent toutes les offres (y compris clôturées) — ce sont des historiques (qui a été embauché, quelles notes ont été données), pas des listes d'action où une offre clôturée devrait disparaître.

**Tests** : `npx vite build` propre (pas de test dédié existant pour cette page).


## 🆕 SESSION 29/08/2026 (suite 3) — Suppression de notifications + bouton évaluation dans la liste

**Contexte** : suite directe des 2 fonctionnalités précédentes (centre de notifications, suppression d'évaluation) — ajustements demandés après tests en direct par l'utilisateur.

**Suppression de notifications (candidat + recruteur)** : `DeleteNotificationAPIView` (`DELETE jobs/notifications/<id>/supprimer/`, `jobs/views/notifications.py`) — scopé `destinataire=request.user`, réutilisable des deux côtés. Bouton corbeille (`confirmToast`) sur chaque ligne de la liste ET dans le panneau détail, dans `BoiteReception.jsx` (candidat) et `NotificationsRecruteur.jsx` (recruteur). `candidatService.deleteNotification()`.

**Bouton "Supprimer" une évaluation, aussi visible directement dans la liste** : la 1ʳᵉ version (session précédente) ne mettait le bouton que dans l'onglet "Évaluation" du détail d'une candidature (`DetailCandidature.jsx`) — retrouvé par l'utilisateur comme absent de la page sidebar "Évaluations" (`EvaluationsPage.jsx`), qui liste pourtant toutes les candidatures évaluées. Ajouté : colonne "Actions" en bout de tableau, corbeille par ligne (`handleSupprimerEvaluation`, `confirmToast`, `jobsService.supprimerEvaluation`), réservé `peutFaire("UTILISATEUR")` — met à jour l'état local (`offres`) directement sans recharger toute la liste.

**Fix lien "Espace recruteur" ouvrait un nouvel onglet** : `Navbar.jsx` (desktop + menu mobile) avait `target="_blank" rel="noopener noreferrer"` sur le lien `/recruteurs` — jugé non voulu par l'utilisateur ("je veux qu'il me laisse sur la même page"), retiré des deux occurrences.

**Tests** : `npx vite build` propre à chaque étape, `python manage.py check` propre, `BoiteReception.test.jsx` 4/4 ✅, `Navbar.test.jsx` 5/5 ✅.


## 🆕 SESSION 29/08/2026 (suite) — Suppression d'évaluation d'entretien

**Contexte** : après avoir ajouté la suppression de notifications, audit des autres listes utilisateur sans suppression — un seul cas jugé légitime (pas un bug) : une évaluation d'entretien (notes 4 critères + commentaire, stockées directement sur `Candidature`) ne pouvait être que réécrite, jamais effacée. Décision : **effacer les champs d'évaluation, pas supprimer la candidature** — contrairement aux notifications, la candidature elle-même reste une trace de recrutement.

- Backend : `EvaluerCandidatureAPIView.delete()` (`jobs/views/candidatures.py`) — remet `note_technique/communication/motivation/experience/globale` à `None` et `commentaire_evaluation` à `''`, mêmes contrôles d'accès que le `patch()` existant (`get_entreprise_for_user` + `get_membre_role` dans `_ROLES_ACTION`, INVITE bloqué), log `EquipeActionLog`.
- Frontend : `recruteurService.supprimerEvaluation()`, hook `useGestionOffre.js::supprimerEvaluation` (confirmToast), bouton "Supprimer" (rouge, à côté de "Modifier la note") dans l'onglet Évaluation de `DetailCandidature.jsx`, visible seulement `peutFaire("UTILISATEUR")`.

**Tests** : backend `test_api_gestion_recruteur` 8/8 ✅, frontend `GestionOffre.test.jsx` 11/11 ✅, `npx vite build` propre, `python manage.py check` propre.


## 🆕 SESSION 29/08/2026 — Centre de notifications recruteur

**Contexte** : le portail recruteur n'avait aucun système de notification transverse — seul le badge "Messages" (candidatures spontanées non lues) existait dans la sidebar. Demande utilisateur : être averti de tout événement de recrutement (candidature spontanée, nouvelle candidature sur une offre, nouveau candidat recommandé). Spec : `docs/conception/specs/2026-08-29-notifications-recruteur-design.md`.

**Décision** : réutilisation du modèle `Notification` existant (`jobs/models.py`) — jusque-là documenté "boîte de réception du candidat" mais `destinataire` est un FK `User` générique, déjà consommé par une API `IsAuthenticated` sans filtre de rôle (`GET jobs/notifications/`, `PATCH jobs/notifications/<id>/lire/`). Pas de nouveau modèle.

**Backend** :
- `Notification.TYPES_NOTIF` : 3 nouveaux types — `CANDIDATURE_SPONTANEE`, `NOUVELLE_CANDIDATURE`, `CANDIDAT_RECOMMANDE`. `type_notif` élargi `max_length=20`→`25` (`CANDIDATURE_SPONTANEE` fait 21 caractères), migration `0092`.
- Nouveau helper `jobs/views/equipe.py::_notifier_equipe(entreprise, type_notif, titre, message)` — crée une `Notification` par destinataire (`entreprise.user` + tous les `MembreEquipe.user`, dédupliqués via un `set`, `bulk_create`) — **toute l'équipe** reçoit sa propre notification (PROPRIETAIRE/ADMIN/UTILISATEUR/INVITE), cohérent avec l'accès déjà partagé à la CVthèque/candidatures.
- Hooks ajoutés (aucun nouvel endroit de logique métier, juste des appels en plus) :
  - `PostulerAPIView.post` (`jobs/views/candidatures.py`) : `NOUVELLE_CANDIDATURE` à chaque candidature ; `CANDIDAT_RECOMMANDE` en plus si `score_matching >= 80` (l'email "Top Profil" existant à ce même seuil reste inchangé, les deux coexistent).
  - `PostulerRapideAPIView.post` : `NOUVELLE_CANDIDATURE` (jamais recommandé — score toujours 0 en rapide).
  - `EnvoyerCandidatureSpontaneeAPIView.post` (`jobs/views/recruteur.py`) : `CANDIDATURE_SPONTANEE`.
- Nouvel endpoint `POST jobs/notifications/marquer-toutes-lues/` (`MarkAllNotificationsReadAPIView`) — générique, réutilisable côté candidat aussi (`Notification.objects.filter(destinataire=request.user, lue=False).update(lue=True)`).

**Frontend** :
- `candidatService.js` : nouvelle méthode `markAllNotificationsAsRead()` — `getNotifications`/`markNotificationAsRead` déjà génériques, réutilisés tels quels.
- Nouvelle page `Pages/Recruteur/NotificationsRecruteur.jsx` (route `/notifications`, sous `RecruteurLayout`) — même structure liste+détail que `BoiteReception.jsx` (candidat), icône par `type_notif` (Inbox=spontanée, UserCheck=nouvelle candidature, Award=recommandé), bouton "Tout marquer lu".
- `RecruteurLayout.jsx` : item "Notifications" ajouté en tête du groupe "Principal" (badge = non lus), + bouton cloche dédié dans le header à côté du bouton "Candidatures spontanées" existant (remplace l'ancien bouton qui pointait par erreur vers `/candidatures-spontanees` à cet emplacement — désormais deux boutons distincts).
- `NavbarRecruteur.jsx` : lien "Notifications" ajouté au groupe "Principal" du menu mobile (`MOBILE_MENU_GROUPS`), sans badge de compteur côté mobile (le badge vit sur la sidebar/header desktop, pattern jugé suffisant — pas de duplication de fetch supplémentaire pour un menu secondaire).

**Non fait (hors périmètre explicite)** : pas de push navigateur/WebSocket temps réel (rafraîchissement au chargement de page, comme le reste du système notifications) ; pas de préférences on/off par type d'événement.

**Tests** : backend 72/72 ✅ (`test_api_candidat`/`test_api_recruteur`/`test_api_gestion_recruteur`/`test_api_equipe`), `python manage.py check` propre. Frontend 420/421 — le seul échec (`RecruteurLayout.test.jsx` attendant le libellé "Messages") est **préexistant**, sans rapport avec cette session (le fichier avait déjà une modification non commitée renommant ce lien en "Candidatures spontanées" avant le début de cette session — à traiter séparément). `npx vite build` propre.

---


## 🆕 SESSION 27/08/2026 — Sidebar recruteur/candidat en catégories + recherche/filtres manquants + navbar raccourcie

**Contexte** : demande utilisateur — ajouter recherche/filtres sur les pages sidebar recruteur qui n'en avaient pas, regrouper la sidebar (devenue longue, 17 liens à plat) en catégories façon `AdminLayout`, faire en sorte qu'elle défile indépendamment de la page, et vérifier la navbar mobile/dropdown. Spec : `docs/conception/specs/2026-08-26-sidebar-recruteur-categories-recherche-design.md`.

**Audit préalable** (sous-agent, 16 pages recruteur passées en revue) : les plus gros trous étaient `RecrutementsPage`, `FacturationPage`, `EvaluationsPage` (aucune recherche/filtre du tout) et `CandidaturesListPage` (filtres offre/statut mais pas de recherche nom). CVthèque/OffresListPage/CandidaturesSpontanees/CandidatsRecommandesPage/MonEquipe/StatistiquesPage déjà bien équipées — non touchées.

**`RecruteurLayout.jsx`** — `menuItems` (17 liens à plat) → `menuGroups` (4 catégories, ajustées après retours utilisateur en direct) :
- **Principal** : Tableau de bord
- **Offres** : Offres d'emploi, Candidatures (déplacée ici sur demande explicite — liée aux offres, pas aux profils candidats), Publier une offre, Questionnaires
- **Candidats** : CVthèque, Favoris, Messages (candidatures spontanées), Candidats recommandés, Entretiens, Évaluations, Recrutements
- **Compte** : Mon équipe, Abonnements & tarifs, Facturation, Paramètres entreprise

Le conteneur `<aside>` passe de `sticky top-20` simple à `sticky top-20 max-h-[calc(100vh-5.5rem)] flex flex-col overflow-hidden` avec `<nav className="overflow-y-auto flex-1">` — la sidebar défile indépendamment de la page une fois pleine (avant : il fallait scroller toute la page pour atteindre "Paramètres" tout en bas). Le bouton Déconnexion reste toujours visible en bas (`shrink-0`, hors zone scrollable).
- **Bug introduit puis corrigé en cours de session** : lors du regroupement, l'en-tête de catégorie a été écrit en `text-teal-100/70` (pensé pour un fond teal) — la sidebar réelle est fond blanc (`bg-white border border-slate-200`), rendant le texte quasi invisible. Corrigé en `text-slate-400`.
- **2ᵉ bug introduit puis corrigé** : le libellé du lien "Messages" (`/candidatures-spontanees`) a été réécrit par erreur en "Candidatures spontanées" pendant la restructuration — casse une décision produit déjà actée (session 22/08/2026, "Messages" = candidatures spontanées renommées dans la sidebar). Restauré à "Messages" partout (sidebar, tooltip du bouton raccourci dans le header, menu mobile) — détecté par le test `RecruteurLayout.test.jsx` déjà existant (HP1/HP3 attendaient "Messages").

**`CandidatLayout.jsx`** — même traitement, 4 catégories :
- **Principal** : Tableau de bord
- **Candidature** : Mon profil, Mes candidatures, Mes compétences, Offres sauvegardées, Boîte de réception, Alertes d'emploi
- **Carrière** : Suggestions carrière, Prendre rendez-vous
- **Compte** : Mes documents, Paramètres

Même pattern de scroll indépendant (`max-h-[calc(100vh-5.5rem)] overflow-y-auto`) que la sidebar recruteur.

**Recherche/filtres ajoutés — 4 pages, 100% client-side sur les données déjà chargées, aucun nouvel endpoint backend** :
- `RecrutementsPage.jsx` : recherche (nom candidat + titre offre) + select période (7j/30j/6m/1a/tout).
- `FacturationPage.jsx` : recherche n° facture + select année (dérivé dynamiquement des factures chargées).
- `CandidaturesListPage.jsx` : recherche nom/email ajoutée en plus des selects offre/statut déjà existants.
- `EvaluationsPage.jsx` : recherche (nom + offre) + select score minimum (≥8/≥12/≥16).

**Navbar recruteur (`NavbarRecruteur.jsx`) et candidat (`Navbar.jsx`) — dropdown "Mon espace"/"Mon compte" raccourci** : signalé par l'utilisateur comme "trop long" — une fois la sidebar complète en place, le dropdown du header dupliquait presque tous ses liens (14 entrées recruteur, 7 candidat). Réduit à l'essentiel (raccourcis les plus utilisés, pas de doublon avec un lien déjà visible ailleurs) :
- Recruteur : Mon équipe, Abonnement/Premium, Paramètres (Tableau de bord retiré du dropdown car déjà présent dans la barre de liens horizontale du haut).
- Candidat : Tableau de bord, Mon profil, Paramètres.
- Le menu hamburger mobile recruteur (`MOBILE_MENU_GROUPS`, nouveau) reprend les mêmes 4 catégories que la sidebar desktop (avec le split Offres/Candidats), au lieu d'une liste plate — et corrige au passage un vrai oubli : le lien **"Évaluations" n'existait dans AUCUN menu mobile ni dropdown desktop** avant cette session (page créée lors d'une session précédente, jamais raccordée à la navigation recruteur hors sidebar desktop `hidden md:block`, donc totalement inatteignable sur mobile).

**Tests** : `Navbar.test.jsx` — 2 assertions mises à jour pour matcher le dropdown raccourci (`Mes candidatures`/`CVthèque` retirés du dropdown candidat/recruteur testé → remplacés par `Mon profil` côté candidat). `RecruteurLayout.test.jsx`/`CandidatLayout.test.jsx` déjà existants, passés sans modification une fois le bug de libellé "Messages" corrigé. Suite frontend complète relancée : **436/436 ✅**, `npx vite build` propre.

**Non fait (hors périmètre explicite de la spec)** : pas de nouvel endpoint backend (tout le filtrage reste client-side, cohérent avec l'état actuel de ces pages) ; pas d'ancres de scroll intra-page (scrollspy) — seule la sidebar elle-même a été rendue navigable indépendamment de la page, pas de jump vers une section précise à l'intérieur d'une page.

---


## 🆕 SESSION 25/08/2026 (suite 2) — Offres clôturées visibles 60 jours (badge "Poste pourvu")

**Contexte** : en creusant le fix "Candidats recommandés" (session juste en dessous), l'utilisateur a soulevé un vrai risque produit — si les recruteurs clôturent correctement leurs offres pourvues (bonne pratique déjà encouragée par ce fix), le catalogue public `/jobs` se réduit et le site risque de paraître vide/mort. Décision validée : au lieu de disparaître instantanément, une offre clôturée reste visible dans le flux public le temps d'une fenêtre de rétention, clairement badgée et non-candidatable — donne l'impression d'un site actif sans mentir sur la disponibilité réelle.

**Nouveau champ `OffreEmploi.date_cloture`** (`DateTimeField` nullable, migration `0089`) — horodate le moment de clôture, alimenté par `CloturerOffreAPIView.patch()` (clôture manuelle recruteur) et `archiver_offres_expirees` (clôture auto sur expiration). Nécessaire pour calculer la fenêtre de rétention (`est_cloturee` seul n'indique pas depuis quand).

**Backend** (`jobs/views/offres.py`, constante module-level `RETENTION_OFFRES_CLOTUREES_JOURS = 60`) :
- `JobListAPIView` : filtre `Q(est_cloturee=False) | Q(est_cloturee=True, date_cloture__gte=seuil_60j)` au lieu de `est_cloturee=False` strict. Tri `.annotate(priorite_cloture=Case(...)).order_by('priorite_cloture', '-date_publication')` — **les offres actives apparaissent toujours avant les clôturées récentes**, jamais mélangées par simple date, pour ne pas noyer les vraies opportunités.
- `JobDetailAPIView` : même filtre — une offre clôturée récente reste accessible en détail (pas de 404) pour afficher le badge/état "Poste pourvu", au lieu de disparaître.
- **Bug réel trouvé en implémentant** : `PostulerAPIView`/`PostulerRapideAPIView` (`jobs/views/candidatures.py`) ne vérifiaient `est_cloturee` nulle part — ça ne posait pas de risque avant car l'offre 404ait dès la clôture (page de candidature inatteignable). Une fois la page de détail conservée 60 jours, un candidat aurait pu techniquement soumettre une candidature à une offre pourvue (le bouton frontend est désactivé, mais rien ne bloquait un appel API direct). Fix : 400 explicite `"Cette offre est clôturée..."` ajouté aux deux vues.
- Endpoints non touchés intentionnellement (gardent `est_cloturee=False` strict) : `OffresRecommandeesAPIView` (`ia.py`), `AlerteEmploi` (`envoyer_alertes.py`), `profile_score.py`, `sitemap.xml` (`seo_views.py`), `NotificationsAPIView`/stats — une offre clôturée ne doit jamais être recommandée, alertée, ou comptée comme opportunité active, seule la page de *navigation* publique bénéficie de la rétention visuelle.

**Frontend** : nouveaux tokens `theme.js` (`jobCardBadgeCloturee`, `jobCardDisabledButton`). `Components/JobCard.jsx` : badge "Poste pourvu" (remplace le badge type de contrat) + bouton "Postuler" désactivé (`disabled`, tooltip) quand `job.est_cloturee`. `Pages/Public/JobDetail.jsx` : panneau de candidature remplacé par un état "Poste pourvu" explicite, badge "Poste pourvu" à la place du badge d'expiration, bouton flottant mobile masqué. `JobsList.jsx`/`OffresParSecteur.jsx`/`OffresParRegion.jsx` héritent automatiquement (consomment `JobCard`, aucun changement nécessaire).

**Tests** : backend `test_api_candidat`/`test_serializers_offres`/`test_jobs_models`/`test_api_gestion_recruteur` 29/29 ✅, suite `jobs.tests` complète relancée en arrière-plan, frontend `JobCard`/`JobDetail`/`JobsList` 19/19 ✅, `npx vite build` propre.


## 🆕 SESSION 23/08/2026 (suite) — Dashboard recruteur : grille stricte + sidebar recommandés (2e mockup employeur)

**Contexte** : après la restructuration du jour même (Pipeline/Offres actives/Activité récente sur une ligne 3 colonnes), l'employeur a fourni un 2e mockup (dashboard style LinkedIn Talent) montrant une vraie disposition en grille avec une colonne latérale droite sticky dédiée aux candidats recommandés. Brainstormé (spec `docs/conception/specs/2026-08-23-dashboard-recruteur-grille-sidebar-design.md`, plan `docs/conception/plans/2026-08-23-dashboard-recruteur-grille-sidebar.md`), implémenté en inline (changement d'un seul fichier, pas de sous-agents).

**Nouveau layout `DashboardRecruteur.jsx`** : la section aperçu passe en `grid-cols-1 lg:grid-cols-3` — colonne contenu (`lg:col-span-2`, grille interne 2 colonnes) avec Évolution+Pipeline sur une ligne, Offres actives+Sources sur la ligne suivante, Activité récente en pleine largeur (`md:col-span-2`) en 3e ligne ; colonne sidebar (`lg:col-span-1 sticky top-20`) contenant uniquement le widget Candidats recommandés.

**Widget Candidats recommandés simplifié pour la sidebar** : retrait de la checkbox "Masquer retenus/refusés" et de la pagination "Voir plus" (state `recommandesLimit` gardé pour compat avec le filtre offre, mais `candidatsRecommandes`/`hasMoreRecommandes` supprimés — devenus morts) — remplacés par un lien "Voir plus de candidats recommandés →" vers la page dédiée déjà existante `/candidats-recommandes` (`CandidatsRecommandesPage.jsx`, Phase 2b). Le détail matching complet et le changement de statut inline restent uniquement sur cette page dédiée, pas de perte de fonctionnalité.

**Piège corrigé pendant le brainstorm** : le spec initial supposait la route `/dashboard/candidats-recommandes` — vérifié dans `App.jsx:314`, la vraie route est `/candidats-recommandes` (sans préfixe). Le plan/l'implémentation utilisent la route réelle.

**Tests** : `DashboardRecruteur.test.jsx` 10/10 ✅ (nouveau test HP5 avec un candidat scoré complet, vérifie le rendu de la carte + le `href` du lien sidebar), frontend 424/424 ✅, `npx vite build` propre.


## 🆕 SESSION 23/08/2026 (suite 2) — Polish visuel dashboard (funnel/sources/activité) + déplacement "Gestion de vos offres"

**Contexte** : retours utilisateur en continu sur le rendu réel du dashboard (captures d'écran) après la refonte grille ci-dessus.

**Funnel de pipeline cassé, réécrit** (`Components/FunnelChart.jsx`) : l'ancienne version SVG (`viewBox` fixe 320×42 + `<text>` centré) coupait le texte des étapes dès que le conteneur de la carte devenait plus étroit que le viewBox (texte tronqué des deux côtés, illisible). Remplacé par des `<div>` empilés (pas de SVG) — largeur en `%` proportionnelle au count avec un plancher `largeurMinPct=46`, `truncate` CSS natif comme filet de sécurité, `title` HTML pour le texte complet au survol. **Piège trouvé en écrivant le test** : une première version avec un `<span>` imbriqué pour styliser le `(pct%)` séparément faisait échouer `getByText` (deux éléments — le div parent et le span — matchaient le même texte) ; revenu à un unique texte enfant direct du `<div>`.

**Tentative "grille vers la droite" ratée puis annulée** : une demande de faire flotter plus de cartes par ligne (`xl:grid-cols-4` sur la grille interne) a écrasé toute la mise en page sur écran large (cartes ~180px, texte tronqué partout, donut illisible) — confirmé par capture d'écran utilisateur ("vous avez nique la page"). **Annulé intégralement**, retour à la disposition `md:grid-cols-2` qui fonctionnait. Leçon : ne pas empiler plusieurs widgets riches (graphique, funnel, tableau, donut) sur une même ligne au-delà de 2 colonnes sans wireframe validé au préalable — la densité de contenu de ces cartes ne supporte pas plus.

**Sources des candidatures — donut + légende colorée** (`Components/DonutChart.jsx`, nouveau) : SVG donut compact (cercles empilés via `stroke-dasharray`/`stroke-dashoffset`, total au centre) affiché à gauche du widget, légende à droite avec un point de couleur (`<span style={{backgroundColor}}>`) par source au lieu d'une simple barre de progression — répond à la demande "chacun sa couleur et un rond graph".

**Activité récente — emoji par type d'action** : `ActiviteRecenteAPIView` (`jobs/views/recruteur.py`) expose désormais le champ `action` brut du `EquipeActionLog` en plus de `phrase`/`date` (`{"id", "action", "phrase", "date"}`) — jusqu'ici seule la phrase formatée était renvoyée, aucune donnée structurée pour choisir une icône côté frontend. `ACTIVITE_EMOJIS` (`DashboardRecruteur.jsx`) mappe chaque valeur `EquipeActionLog.ACTIONS` (CREER_OFFRE 📢, MODIFIER_OFFRE ✏️, CLOTURER_OFFRE 🔒, STATUT_CANDIDATURE 🔄, EVALUER_CANDIDATURE ⭐, INVITER_MEMBRE 👥, RETIRER_MEMBRE 🚫, CHANGER_ROLE 🛡️, AUTRE 🔔) — remplace le simple point teal par un badge rond `w-7 h-7` avec l'emoji.

**"Gestion de vos offres" déplacée du Dashboard vers la page dédiée "Offres d'emploi"** (décision produit demandée puis confirmée par l'utilisateur) : la table détaillée (recherche, chips de filtre par statut, tri par colonne, édition/correction d'offre rejetée, suppression, vue mobile en cartes) — ~400 lignes de JSX + state (`activeTab`/`filtreStatut`/`search`/`sortConfig`/`showModifierModal`/etc.) — extraite de `DashboardRecruteur.jsx` vers `Pages/Recruteur/OffresListPage.jsx` (route déjà existante `/offres-emploi`, remplace l'ancienne version basique de cette page qui n'avait qu'un tableau minimal 5 colonnes). `OffresListPage.jsx` devient autonome : charge son propre `getDashboard()`/`getConstants()` au montage au lieu de recevoir les données du Dashboard. Raison : le Dashboard était devenu trop long (scroll excessif avant d'atteindre le contenu), et cette table dupliquait déjà en grande partie le rôle de la page sidebar "Offres d'emploi" existante (mini-liste "Mes offres actives" + lien "Voir toutes" sur le Dashboard sert de raccourci vers cette page, comme `/candidats-recommandes` pour le widget recommandés).
- **Nettoyage `DashboardRecruteur.jsx`** après extraction : state mort supprimé (`activeTab`, `filtreStatut`, `search`, `showModifierModal`, `offreAModifier`, `modifierForm`, `sortConfig`, `confirmDeleteId`, `deletingId`, `constants` + son fetch `getConstants()`), handlers morts supprimés (`handleOuvrirModification`, `handleSauvegarderModification`, `handleSupprimerOffre`), imports inutilisés retirés (`Select`, `SecteurDomaineSelect`, `selectStylesTeal`, `InfoBanner`, `ChevronRight`, `MapPin`, `AlertTriangle`, `Trash2`, `X`), constante `GRID` déplacée. Bundle `DashboardRecruteur` : 48,5 Ko → 31 Ko après nettoyage.
- Bouton "Voir toutes" (mini-liste "Mes offres d'emploi actives" du Dashboard) : `setActiveTab("ouvertes")` (onglet local, maintenant inexistant) → `<Link to="/offres-emploi">`.

**Tests** : `FunnelChart.test.jsx` 2/2 ✅ (inchangé, compatible avec la réécriture), `DashboardRecruteur.test.jsx` — 2 tests obsolètes supprimés (HP2/HP4 testaient la navigation d'onglets Offres en cours/Archives, fonctionnalité déplacée), 8/8 ✅. Nouveau `OffresListPage.test.jsx` (4/4 ✅ : bascule onglets, recherche, suppression avec confirmation, erreur de chargement/télémétrie) — la page n'avait aucun test avant cette session. Frontend 426/426 ✅, backend `test_api_recruteur` 9/9 ✅ (champ `action` ajouté sans casser le format existant), `npx vite build` propre, `python manage.py check` propre.


## 🆕 SESSION 23/08/2026 (suite 3) — Widget recommandés capé à 3 + grille 2 lignes × 3 colonnes (fin des zones vides)

**Contexte** : itérations rapides sur la sidebar "Candidats recommandés" — d'abord demande explicite de limiter l'affichage à 3 candidats (`slice(0, 6)` → `slice(0, 3)`), ce qui a raccourci la sidebar et laissé un vide sous "Mes offres actives/Sources" (2 lignes de contenu vs 1 seule carte courte en face). Une 1ʳᵉ tentative a déplacé "Activité récente" dans la sidebar sous les recommandés — a résolu le vide côté contenu mais en a créé un nouveau côté contenu cette fois (la sidebar recommandés+activité devenait plus haute que les 2 lignes de contenu). L'utilisateur a explicitement rejeté cette 2ᵉ tentative ("non, je veux organiser bien sans espace vide").

**Solution retenue — grille à 2 lignes de 3 colonnes strictement alignées** (au lieu d'une colonne "contenu" 2/3 + une colonne "sidebar" 1/3 séparées) :
- **Ligne 1** (`grid grid-cols-1 lg:grid-cols-3 items-stretch`) : Évolution | Pipeline de recrutement | Candidats recommandés (top 3).
- **Ligne 2** (même pattern) : Mes offres d'emploi actives | Sources des candidatures | Activité récente.

`items-stretch` (comportement par défaut de CSS Grid, explicité ici) fait que les 3 cartes d'une même ligne s'étirent toujours à la hauteur de la plus haute — le vide résiduel (ex. si Candidats recommandés n'a que 3 petites cartes face à un graphique Évolution plus haut) reste **à l'intérieur** de la carte elle-même (padding en bas, fond de carte visible) au lieu d'un trou de fond de page entre deux colonnes de hauteurs différentes — c'est ce qui donne l'effet "rien d'espace vide" demandé, sans calcul de hauteur manuel ni JS.
- Sidebar sticky abandonnée (n'a plus de sens dans ce pattern — chaque widget vit désormais dans sa propre ligne, pas dans une colonne qui défile indépendamment).
- Widget recommandés : toujours capé à 3 (`candidatsRecommandesTous.slice(0, 3)`), lien "Voir plus de candidats recommandés →" vers `/candidats-recommandes` inchangé.
- **Filtre "masquer retenus/refusés" retiré silencieusement de ce widget compact** (`masquerDecides` supprimé, plus de checkbox depuis la session précédente) — les candidats recommandés affichés ici sont désormais TOUS les candidats scorés, décidés ou non, pour éviter qu'ils disparaissent sans moyen de les revoir (la page dédiée `/candidats-recommandes` garde son propre toggle indépendant).
- **Nettoyage further** : `handleChangerStatutRecommande`, `expandedMatchId`, `statutMenuOuvertId`, `changingStatutId`, `recommandesLimit`/`setRecommandesLimit` — tous du state/handlers morts issus d'une ancienne version plus riche du widget (détail matching dépliable + dropdown statut inline), jamais consommés dans le JSX actuel, supprimés.

**Tests** : `DashboardRecruteur.test.jsx` 8/8 ✅ (aucune régression, la disposition CSS n'était pas testée), frontend 426/426 ✅, `npx vite build` propre.


## 🆕 SESSION 19/08/2026 — Dashboard recruteur : filtres, détail matching complet, actions inline

**Contexte** : le client jugeait la 1ʳᵉ version (session 18/08/2026 — graphiques + Candidats recommandés) insuffisante sur 3 points précis (clarifiés via questions ciblées) : l'explication du matching (1 seule phrase), les graphiques (pas de granularité/filtre), et la section recommandés (pas d'actions, pas de tri). **Toujours zéro endpoint backend ajouté** — uniquement de l'agrégation/filtrage client-side sur les données déjà exposées par `DashboardRecruteurAPIView`.

**Filtre partagé "par offre" + "période"** (`DashboardRecruteur.jsx`) : deux `<select>` (`tw.inputColorsWhite`) au-dessus des graphiques — `filtreOffreId` (toutes / une offre précise) et `periodeEvolution` (7j/30j/6m/1a). `offresPourAnalyse` dérivé filtre le tableau `offres` avant tout calcul (évolution + pipeline + recommandés partagent ce filtre). Changer le filtre offre réinitialise `recommandesLimit` à 6 (évite un état de pagination incohérent avec la nouvelle liste).

**Évolution — granularité paramétrable** : `evolution` bascule entre buckets journaliers (7j/30j, clé = `date_postulation.slice(0,10)`) et mensuels (6m/1a, même logique qu'avant mais nbMois variable). `MiniAreaChart` reçoit un nouveau prop optionnel `height` (défaut 160, passé à 190 depuis le dashboard pour plus de lisibilité) — aucun autre composant ne l'utilisait, pas de régression.

**Pipeline — taux de conversion** : chaque barre affiche désormais `count` **et** `%` (part de `count` sur `pipelineTotal`, le total toutes étapes confondues du filtre actif) — répond à la demande "plus de métriques" sans ajouter de vrai calcul de conversion étape-à-étape (aurait nécessité un historique de transitions de statut non trackée actuellement, hors scope).

**Candidats recommandés — 3 ajouts** :
1. **Détail matching complet** : bouton "Voir le détail du matching" par carte (state `expandedMatchId`) déplie les 5 critères (`CRITERES_MATCHING`, mêmes clés/max que `DetailCandidature.jsx`) avec barre de progression + phrase d'explication par critère — réutilise exactement le pattern de "Pourquoi ce score ?" (`DM.scores || DM`, `DM.explications`) au lieu d'une seule phrase.
2. **Filtre "masquer retenus/refusés"** (`masquerDecides`, coché par défaut) + pagination "Voir plus" par pas de 6 (`recommandesLimit`) au lieu d'un top 5 fixe.
3. **Action directe** : dropdown de changement de statut inline par carte (`handleChangerStatutRecommande` → `jobsService.updateStatutCandidature`, même endpoint que `DetailCandidature.jsx`/`useGestionOffre.js`), respecte `authService.peutFaire("UTILISATEUR")` (INVITE lecture seule, cohérent avec le reste de l'app). **Simplification assumée** : pas de modale de programmation d'entretien pour le statut ENTRETIEN depuis cette carte (contrairement à `useGestionOffre.js`) — la prise de rendez-vous détaillée reste sur la fiche candidature complète, cette action rapide est pour les changements de statut simples.

**Piège HTML évité** : la carte recommandée était un `<button>` unique (clic = navigation) dans la version précédente. Impossible d'y imbriquer les nouveaux boutons interactifs (toggle détail, dropdown statut) — bouton dans bouton est invalide en HTML et cassait déjà ailleurs dans le projet (cf. bug modale imbriquée du 28/07/2026). Fix : carte convertie en `<div>`, seul le bloc avatar+nom+score reste un `<button>` cliquable (navigate), le reste de la carte (dropdown statut, lien "Voir la candidature") est en boutons siblings, pas imbriqués.

**Audit sécurité** : aucune route/endpoint créé — `handleChangerStatutRecommande` appelle le même `PATCH jobs/candidatures/<id>/statut/` déjà protégé par `get_entreprise_for_user()` + `get_membre_role()` (INVITE bloqué en écriture côté backend, pas seulement masqué côté UI). RAS.

**Tests** : 338/338 frontend ✅ (dont 9/9 `DashboardRecruteur.test.jsx`), `npx vite build` propre.

**🐛 Bug réel trouvé en testant sur mobile via ngrok (capture d'écran utilisateur)** : `MiniAreaChart.jsx` forçait `minWidth: 420` sur le SVG quel que soit le nombre de points — sur un téléphone ~340-390px de large (largeur d'écran usuelle), ça déclenchait un scroll horizontal non voulu pour la vue par défaut "6 derniers mois" (6 points, largement suffisant sans scroll). Pire : la légende (`<div className="flex...">`) était à l'intérieur du **même conteneur** `overflow-x-auto` que le SVG → en scrollant le graphique, la légende scrollait aussi et son texte se retrouvait tronqué ("Candidatures reçues" affiché "ques"), et seuls 4 des 6 mois restaient visibles sans indication qu'il fallait scroller.
- **Fix** : légende sortie du conteneur scrollable (toujours visible, fixe). Largeur du SVG (`W`) calculée dynamiquement (`Math.max(320, data.length * 30)`) au lieu d'une valeur fixe — les vues à peu de points (6m/12m mensuel) tiennent sur mobile sans scroll, les vues denses (7j/30j quotidien) scrollent volontairement (comportement attendu, comme un graphe de contributions GitHub).
- **Ajouts** (répondant à "graphique trop nul, aucune valeur lisible") : axe Y avec 3 valeurs numériques (0/milieu/max) à gauche des lignes de grille ; tap/clic sur un point affiche sous le graphique la valeur exacte de chaque série à cette date (`hoverIdx` state) — utile notamment pour "Recrutements", souvent une ligne plate à 0 donc invisible sans cette lecture explicite.
- **Décision** : pas de librairie de charts ajoutée (toujours SVG inline, cohérent avec [[MiniAreaChart]] créé en session 18/08/2026) — le bug était un défaut de responsive/UX, pas une limite du SVG inline en soi.

**Fonctionnalités ajoutées au graphique "Évolution"** (demande client explicite après le fix du bug ci-dessus) — toujours zéro appel backend, tout calculé côté client :
- **Courbe / Barres** : toggle (icônes `LineChart`/`BarChart3`) — `chartType` prop sur `MiniAreaChart`, bascule le rendu SVG entre `polyline`+aire et `rect` groupés par point.
- **Comparaison période précédente** : checkbox "Comparer à la période précédente" — `buildEvolutionBuckets(periode, shiftPeriodes)` dans `DashboardRecruteur.jsx` généralise le calcul de buckets (avant : inline, une seule fois) avec un décalage en nombre de périodes (7j/30j/6m/1a × shiftPeriodes) ; seule la série "candidatures" de la période N-1 est superposée en pointillé (comparer TOUTES les séries aurait surchargé un petit widget) — prop `compareValues` (tableau de valeurs aligné par index, pas par date, sur `data`).
- **Taux de conversion (%)** : checkbox "Taux de conversion" — 3ᵉ métrique calculée par bucket (`recrutements/candidatures*100`, 0 si aucune candidature) tracée sur un **axe droit indépendant 0-100%** (`secondarySeries` + `secondaryMax`, `scaleY2` séparée de l'échelle des comptages) — mélanger un pourcentage (0-100) avec des comptages bruts (souvent <20) sur la même échelle aurait rendu la courbe de conversion illisible (quasi plate en bas).
- **Export PNG/CSV** : bouton "Exporter" par graphique (menu dropdown). CSV = sérialisation manuelle avec séparateur `;` + BOM UTF-8 (compat Excel FR). PNG = clonage du `<svg>` (dimensions explicites fixées sur le clone, la version affichée n'a que `width:100%` CSS qui ne suffit pas pour un export autonome) → sérialisé → dessiné sur un `<canvas>` à l'échelle ×2 (netteté) → `canvas.toBlob()`.
- **Décision produit (confirmée avec l'utilisateur)** : comparaison + conversion sont **désactivées automatiquement en mode Barres** (checkboxes grisées, `disabled`) — combiner barres groupées + ligne pointillée + axe secondaire sur un mini-widget aurait été illisible ; l'utilisateur a validé cette contrainte plutôt que de tout rendre combinable.

**Tests** : 338/338 frontend ✅ (dont 9/9 `DashboardRecruteur.test.jsx`), `npx vite build` propre.

**Génération IA enrichie sur "Publier une offre"** (demande client : bouton "Générer l'offre avec l'IA", recruteur saisit juste le poste) :
- **Simplification du déclencheur** : `GenererOffreIAAPIView` (`jobs/views/ia.py`) n'exige plus que `titre` (avant : `titre` ET `specialite`). Si `specialite` absente, résolue automatiquement via `resoudre_domaine_depuis_texte(titre)` (même référentiel métiers que le parser CV candidat) et renvoyée au frontend (`specialite_resolue`) qui pré-sélectionne le champ Spécialité **seulement s'il était vide** (ne jamais écraser un choix déjà fait manuellement). `CreateJob.jsx` : `iaReady = isPremium && !!formData.titre` (avant : + `formData.specialite`).
- **2 nouveaux champs générés** : `competences` (5-8 compétences techniques/outils, format tiret comme missions/profil_recherche) et `questions_entretien` (tableau de 4-6 questions, jamais stocké tel quel — voir ci-dessous). `max_tokens` monté 1000→1600 (2 champs de plus).
- **Nouveau champ persistant `OffreEmploi.competences`** (migration `0057`, `TextField` nullable, même pattern que `missions`/`profil_recherche`) — ajouté à `OffreEmploiCreateDTO`, `OffreDashboardDTO` (`OffreEmploiSerializer` l'inclut automatiquement via `__all__`), formulaire `CreateJob.jsx`, modale de modification `DashboardRecruteur.jsx`, affichage `JobDetail.jsx` (candidat) et `GestionOffre/index.jsx` (recruteur).
- **Questions d'entretien — pas de nouveau modèle** : les questions générées ne sont **pas** auto-créées en `Questionnaire`/`QuestionQuestionnaire` (ça exigerait de deviner type de réponse/choix/disqualifiant sans supervision humaine — risqué). À la place : affichées en liste dans `CreateJob.jsx` sous les champs texte, avec un bouton "Créer un questionnaire avec ces questions →" qui ouvre `CreateQuestionnaireModal` **pré-rempli** (nouveaux props `initialQuestions`/`initialTitre`, `useEffect` sur `open` qui reconstruit `form` seulement si des questions sont fournies — sinon la modale garde son comportement par défaut d'une question vide). Le recruteur choisit le type de chaque question (COURT par défaut) et peut éditer/retirer avant de créer — jamais publié sans relecture, cohérent avec la demande client ("le recruteur garde la possibilité de modifier avant publication").
- **Audit sécurité** : aucun nouvel endpoint — `GenererOffreIAAPIView` reste `IsAuthenticated` + vérif `entreprise.est_premium_actif` inchangée ; le nouveau champ `competences` suit exactement le même chemin de permission que `missions`/`profil_recherche` sur `UpdateOffreRecruteurAPIView` (déjà `get_entreprise_for_user()` + `get_membre_role()`). RAS.

**Tests** : 338/338 frontend ✅ (dont 6/6 `CreateJob.test.jsx`), backend relancé après migration, `npx vite build` propre.

**Questions d'entretien IA — type + options générés, pas seulement du texte libre** (précision demandée : "questionnaire créé auto avec les réponses", clarifiée = les questions doivent utiliser les vrais types du questionnaire — COURT/LONG/NUMERIQUE/CHOIX_UNIQUE/CHOIX_MULTIPLE — pas toutes en texte libre) :
- **Backend** (`GenererOffreIAAPIView`) : `questions_entretien` n'est plus un tableau de chaînes mais d'objets `{texte, type_question, choix}` — le prompt Groq demande explicitement de varier les types et de fournir 3-5 options réalistes (pas génériques "Oui/Non") pour les QCM. Validation stricte côté serveur avant retour au frontend : `type_question` doit être dans les 5 valeurs valides (repli `COURT` sinon) ; `choix` dédupliqué/tronqué à 6 ; un type QCM avec moins de 2 options réelles retombe automatiquement en `COURT` (jamais de QCM à 0-1 option envoyé au frontend).
- **Frontend** : panneau de suggestions (`CreateJob.jsx`) affiche désormais le type de chaque question (badge) + ses options le cas échéant. `CreateQuestionnaireModal.jsx` (`initialQuestions`) mappe ces objets enrichis directement dans le formulaire (type + choix pré-remplis, pas juste le texte) — accepte aussi une simple chaîne en repli pour rester rétrocompatible.
- **Toujours pas d'auto-création sans relecture** (confirmé avec l'utilisateur) : le questionnaire passe toujours par la modale de relecture avant création réelle — seule la richesse du pré-remplissage (type + options au lieu de texte vide) a changé, pas le flux de validation.

**Tests** : 338/338 frontend ✅ (dont `CreateJob.test.jsx` + `Questionnaires.test.jsx`), backend relancé, `npx vite build` propre.

**CVthèque — 5 nouveaux filtres** (demande client : disponibilité, mobilité, permis, langues, diplôme, années d'expérience, secteur, compétences — diplôme/expérience/secteur existaient déjà, seuls les 5 autres manquaient) :
- **Backend** (`CVThequeView`, `jobs/views/recruteur.py`) : `mobilite` (exact match sur `ProfilCandidat.mobilite`), `disponibilite` (exact match sur `situation_actuelle`), `permis` (`true` → `permis_conduire=True`), `langues`/`competences` (`icontains` — ce sont des `CharField`/`TextField` texte libre sans référentiel structuré côté candidat, donc filtrage par sous-chaîne et pas par égalité comme les champs à choix).
- **Nouvelles options exposées** : `ConstantsAPIView` (`jobs/views/offres.py`) retourne désormais `mobilites`/`disponibilites` (sourcées directement de `ProfilCandidat.MOBILITE_CHOICES`/`SITUATION_ACTUELLE`, pas dupliquées dans `constants.py`). Cache `jobs_constants` vidé manuellement en session (LocMemCache — se vide de toute façon au prochain redémarrage du serveur dev).
- **Frontend** (`CVTheque.jsx`) : 2ᵉ ligne de filtres ajoutée sous la première (Mobilité + Disponibilité en `Select`, Langue + Compétence en texte libre `icontains`), chip "Permis de conduire" ajouté à côté de Photo/CV/Inscrits récemment. Whitelist de query params élargie dans `recruteurService.searchCVtheque`.
- **Décision** : `langues`/`competences` en texte libre (pas de dropdown) car aucun référentiel structuré n'existe côté `ProfilCandidat` pour ces deux champs (stockage `CharField`/`TextField` libre, format `"Nom:Niveau, ..."` pour les langues) — un dropdown supposerait des valeurs normalisées qui n'existent pas.

**CVthèque — 4 filtres supplémentaires** (demande "ajoutez plus si c'est possible", après les 5 premiers) — passage en revue de tous les champs `ProfilCandidat` non encore filtrables :
- `vehicule_personnel` (chip booléen, comme Permis)
- `passeport_valide` (chip booléen)
- `service_militaire` (`Select`, choix `ProfilCandidat.SERVICE_MILITAIRE_CHOICES` — exposé via `ConstantsAPIView.services_militaires`)
- `niveau_experience` (`Select`, réutilise `constants.experiences`/`NIVEAUX_EXPERIENCE`) — **distinct** du filtre "Expérience minimum" déjà existant : celui-ci est calculé dynamiquement depuis les dates des `ExperienceCandidat` (années réelles), `niveau_experience` est une auto-déclaration catégorielle du candidat (ex: "Confirmé", "Manager") — les deux peuvent diverger (candidat qui se sous/sur-estime), donc gardés comme 2 filtres séparés plutôt que fusionnés.
- **Champ non ajouté** : `salaire_souhaite` — `CharField` texte libre sans format normalisé (ex: "80 000 DA", "Négociable", "80k") → un filtre numérique/range serait peu fiable sans forcer une saisie structurée côté profil candidat, hors scope de cette demande.
- Cache `jobs_constants` re-vidé manuellement (nouvelle clé `services_militaires`).

**Tests** : 338/338 frontend ✅ (dont 11/11 `CVTheque.test.jsx`), backend relancé, `npx vite build` propre.

**Page Premium — avantages mis en avant** (demande client : rendre les formules plus attractives, 6 avantages à valoriser) : `AVANTAGES` (4 lignes génériques à coche simple) remplacé par `AVANTAGES_DETAILLES` (6 items structurés `{icon, titre, description}`) affichés en grille de cartes (`AvantageCard`, icône dans chip teal + titre + description courte) au lieu d'une liste plate — utilisé à la fois dans l'écran de paiement ("Ce qui est inclus") et l'écran de statut abonné ("Fonctionnalités incluses"), un seul endroit à maintenir.
- **Point signalé à l'utilisateur avant d'écrire le code** : "Support prioritaire" ne correspondait à aucune fonctionnalité réelle (aucun canal de support distinct/priorisé n'existe dans le produit). Décision utilisateur : l'afficher quand même avec une promesse simple et vraie — email dédié `taftech963@gmail.com`, réponse sous 24h — pas de système de tickets à construire, juste un engagement opérationnel documenté sur la page.
- Les 5 autres avantages (coordonnées candidats, téléchargement CV, recherche avancée, analyses IA, favoris) sont déjà des fonctionnalités réelles, toutes déjà cachées derrière le gate Premium existant de la CVthèque — aucun changement backend nécessaire, uniquement de la présentation.

**Tests** : 338/338 frontend ✅ (dont 10/10 `PremiumPage.test.jsx`), `npx vite build` propre.

**🐛 Bug réel — lien Premium absent du menu mobile recruteur** (signalé par l'utilisateur) : "Mon Premium ⭐"/"Passer Premium 🔒" n'existait que dans le dropdown desktop de `NavbarRecruteur.jsx` (tableau `minRole: "PROPRIETAIRE"` ligne ~184) — jamais dans la liste du menu hamburger mobile, ni dans `BottomNavRecruteur` (5 slots déjà pris). Un PROPRIETAIRE sur mobile n'avait donc **aucun moyen d'atteindre `/recruteurs/premium`**. Fix : lien ajouté après la liste mappée du menu mobile, même garde `authService.peutFaire("PROPRIETAIRE")`, même libellé dynamique selon `isPremium` (ambre si déjà premium, teal sinon) que la version desktop.

**Tests** : 338/338 frontend ✅, `npx vite build` propre.

**Profil entreprise — bannière, culture, galerie photo** (demande client — sur les 7 items listés, `secteur`/`site web`/`présentation` existaient déjà) :
- **Nouveaux champs `ProfilEntreprise`** (migration `0058`) : `banniere` (ImageField, 5 Mo max — plus permissif que `logo` car format large), `culture_entreprise` (TextField). **Nouveau modèle `EntreprisePhoto`** (FK `entreprise` related_name `photos`, `image` + `legende` + `date_ajout`, `ordering=['-date_ajout']`) — pattern calqué sur `ExperienceCandidat`/`FormationCandidat` (enfant FK simple), pas de champ JSON/array — cohérent avec le reste du projet qui n'a jamais stocké de listes d'images en JSON.
- **Nouveaux endpoints** `POST/DELETE jobs/entreprise/photos/(<id>/)` (`EntreprisePhotosAPIView`) — limite 12 photos, 3 Mo/photo, gate `PROPRIETAIRE`/`ADMIN` (même pattern que `UpdateProfilEntrepriseAPIView`). `banniere` + `culture_entreprise` ajoutés au whitelist/upload de `UpdateProfilEntrepriseAPIView` existant (pas de nouvel endpoint pour ces deux-là).
- **🐛 Bug réel trouvé en marge** : `recruteurService.updateProfilEntreprise` détectait un fichier à uploader uniquement via `data.logo instanceof File` — un upload de `banniere` seul (sans changer le logo) aurait été silencieusement sérialisé en JSON au lieu de multipart, donc jamais reçu par `request.FILES` côté backend. Corrigé (`data.logo instanceof File || data.banniere instanceof File`).
- **🐛 Bug réel trouvé en marge #2** : `linkedin`/`site_web` étaient déjà des champs fonctionnels dans le formulaire `ParametresRecruteur.jsx`, mais **jamais préremplis au chargement** — `EntrepriseDashboardDetailSerializer` (utilisé par `dash.entreprise`) ne les exposait pas du tout. Un recruteur qui avait déjà renseigné son LinkedIn le voyait toujours vide en rouvrant Paramètres (donnée présente en base, juste jamais renvoyée). Corrigé : `linkedin`, `site_web`, `banniere`, `culture_entreprise`, `photos` ajoutés aux champs du serializer. Même trou constaté et corrigé dans la branche "membre d'équipe" de `ParametresRecruteur.jsx` (`adresse_complete` y manquait aussi).
- **Frontend `ParametresRecruteur.jsx`** (onglet "Mon entreprise") : upload bannière (même pattern que logo, preview via `URL.createObjectURL`), textarea Culture d'entreprise, galerie photo (grille de vignettes + bouton supprimer au survol + upload avec légende optionnelle, compteur "x/12").
- **Frontend `EntreprisePublic.jsx`** (page vitrine) : bannière affichée en pleine largeur au-dessus du bandeau logo/nom si présente, bloc "Culture d'entreprise" (même style que "Présentation"), grille de miniatures "Photos". "Offres disponibles" utilise désormais `nombre_offres_actives` (nouveau champ backend calculé, `SerializerMethodField` sur `EntreprisePublicSerializer`) avec repli sur l'ancien calcul client `offres_actives.length` — la liste complète `offres_actives` reste inchangée, le nouveau champ est un ajout, pas un remplacement.
- **SEO — reporté** : demandé en fin de message sans détail ; après clarification l'utilisateur veut meta tags par page + sitemap.xml/robots.txt + vérification des slugs offres — **pas encore fait**, prochaine session.

**Tests** : 338/338 frontend ✅ (dont 21/21 `ParametresRecruteur.test.jsx` + `EntreprisePublic.test.jsx`), backend relancé, `npx vite build` propre, `python manage.py check` propre.

**SEO — meta tags par page + sitemap.xml/robots.txt** :
- **Composant `Components/Seo.jsx`** — balises `<title>`/`<meta description>`/Open Graph/Twitter Card par page, appliqué sur `Home.jsx`, `JobDetail.jsx` (titre+description dynamiques par offre, image = logo entreprise), `JobsList.jsx`, `EntreprisePublic.jsx` (titre+description dynamiques par entreprise, image = bannière ou logo). **Décision technique** : d'abord tenté `react-helmet-async` (standard du marché), abandonné avant de casser les tests — la lib exige un `<HelmetProvider>` ancêtre que les 4 fichiers de test (`Home`/`JobDetail`/`JobsList`/`EntreprisePublic`) n'ont pas (ils wrappent seulement `<MemoryRouter>`). Remplacé par un composant sans dépendance (`useEffect` + manipulation directe de `document.head`, restaure les valeurs par défaut au démontage) — même résultat pour une SPA sans SSR, zéro dépendance ajoutée, zéro test cassé. `index.html` : `lang="en"` → `lang="fr"` (jamais corrigé depuis la création du projet), meta description/OG par défaut ajoutées comme filet pour les pages sans `<Seo>`.
- **`jobs/seo_views.py`** (nouveau fichier, hors du package `views/` — monté directement dans `taftech_backend/urls.py`, pas sous `/api/`) : `SitemapXMLView` (offres actives approuvées + entreprises approuvées + pages statiques, XML protocole sitemap.org, URLs construites depuis `settings.SITE_URL` — donc pointent vers le frontend, pas l'API Django) et `RobotsTxtView` (autorise tout sauf les routes authentifiées : dashboard, parametres, profil, cvtheque, etc. — `Disallow` par préfixe de route ; référence le sitemap).
- **Routes montées à la racine du domaine** (`/sitemap.xml`, `/robots.txt`, pas `/api/jobs/...`) — c'est là que les crawlers et Google Search Console les cherchent par convention. `vite.config.js` : proxy dev étendu (même pattern que `/api`/`/media`) pour que ces deux chemins fonctionnent aussi via le tunnel ngrok en test. **⚠️ Prod** : la config nginx du déploiement devra proxy `/sitemap.xml` et `/robots.txt` vers Django, comme `/api`/`/media` — pas encore fait (nginx pas encore configuré, hors scope dev).
- **Vérifié (pas modifié)** : `OffreEmploi` n'a **pas** de slug — routes offres toujours `/jobs/<id>/` (contrairement à `ProfilEntreprise.slug` qui existe déjà). Décision **non prise** unilatéralement : ajouter un slug aux offres casserait les URLs déjà partagées/indexées (liens email, éventuels partages) sans stratégie de redirection 301 depuis l'ancien `/jobs/<id>/` — nécessite une vraie décision produit avant implémentation, pas juste un ajout de champ. Le sitemap utilise donc `/jobs/<id>/` tel quel pour l'instant.

**Tests** : 338/338 frontend ✅ (dont Home/JobDetail/JobsList/EntreprisePublic — 26/26), backend relancé, `npx vite build` propre, sitemap/robots vérifiés manuellement via `Client(SERVER_NAME='localhost')`.

**URLs offres — pattern id+slug** (suite SEO, décision utilisateur après recommandation) : `/jobs/16-responsable-rh-et-paie/` au lieu de `/jobs/16/`. **Pattern hybride choisi délibérément** (comme Indeed/LinkedIn Jobs) plutôt qu'un slug pur type `ProfilEntreprise.slug` — l'ID reste l'unique clé de lookup, le slug n'est que cosmétique et ignoré au parsing. Avantages : zéro migration DB, zéro redirection 301 nécessaire (`/jobs/16/` sans slug continue de fonctionner à l'identique), pas de risque de collision entre offres au titre identique (contrairement à un slug unique en base).
- **Frontend** : `utils/slugify.js` (nouveau, `slugify()` + `jobUrl(id, titre)` — pas de librairie, `normalize("NFKD")` + strip diacritiques). `JobDetail.jsx` parse le param de route en extrayant le préfixe numérique (`idSlug.split("-")[0]`) avant tout appel API — le slug n'existe que dans l'URL affichée, jamais transmis au backend. Tous les liens sortants vers une offre (`JobCard.jsx`, `Home.jsx`, `JobsList.jsx`, `EntreprisePublic.jsx`) construits via `jobUrl()`. Liens laissés en ID seul (hors périmètre SEO, pages authentifiées non crawlées) : `ReviewCandidature.jsx`, `AdminCandidatures.jsx`, `OffresSauvegardees.jsx`.
- **Backend** : `jobs/seo_views.py` (`SitemapXMLView`) génère désormais `{id}-{slugify(titre)}` via `django.utils.text.slugify` (même utilitaire que `ProfilEntreprise.save()`) — aucun champ stocké, calculé à la volée à chaque génération du sitemap.
- **Aucune route Django modifiée** — l'API continue de recevoir un ID pur (`GET jobs/<id>/`), le slug est une pure façade côté React Router (`/jobs/:id` capture tout le segment "16-responsable-rh-et-paie" tel quel, extrait ensuite côté client).

**Tests** : 338/338 frontend ✅ (1 assertion mise à jour dans `EntreprisePublic.test.jsx` — href attendu passe de `/jobs/1` à `/jobs/1-developpeur-front-end`), sitemap re-vérifié manuellement (`/jobs/16-responsable-administration-rh-et-paie/` confirmé en sortie).

---

