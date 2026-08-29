# Centre de notifications recruteur

## Contexte
Le portail recruteur n'a aucun système de notification transverse : seul le badge "Messages" (candidatures spontanées non lues) existe dans la sidebar. L'utilisateur veut être alerté de **tout** événement pertinent pour son équipe de recrutement : nouvelle candidature spontanée, nouvelle candidature sur une offre, nouveau candidat recommandé (score IA ≥80%).

Le modèle `Notification` existe déjà (`jobs/models.py`) et sert aujourd'hui uniquement aux notifications candidat (ENTRETIEN/RETENU/REFUS/ALERTE/INFO). `destinataire` est un FK `User` générique — rien n'empêche de le réutiliser côté recruteur. L'API existante (`GET jobs/notifications/`, `PATCH jobs/notifications/<id>/lire/`) est déjà `IsAuthenticated` sans filtre de rôle.

## Décisions actées
- Centre unifié (pas de badges épars) : une page "Notifications" dans le sidebar recruteur + badge de compteur global.
- Destinataires : **toute l'équipe** (PROPRIETAIRE + tous les `MembreEquipe`, INVITE inclus) reçoit sa propre notification — cohérent avec l'accès déjà partagé à la CVthèque/candidatures.
- 3 nouveaux types d'événements (extension de `Notification.TYPES_NOTIF`) :
  - `CANDIDATURE_SPONTANEE` — nouvelle candidature spontanée reçue par l'entreprise
  - `NOUVELLE_CANDIDATURE` — nouvelle candidature (normale ou rapide) sur une offre
  - `CANDIDAT_RECOMMANDE` — candidature avec score IA ≥80% (en plus de `NOUVELLE_CANDIDATURE`, pas à la place — l'email "Top Profil" existant reste inchangé)

## Backend
- `Notification.TYPES_NOTIF` : 3 nouveaux choix ajoutés (migration no-op générée par `makemigrations`, pattern déjà utilisé pour `Candidature.STATUTS` PRESELECTION).
- Nouveau helper `jobs/views/equipe.py::_notifier_equipe(entreprise, type_notif, titre, message)` — crée une `Notification` par destinataire (`entreprise.user` + tous les `MembreEquipe.user` de l'entreprise, dédupliqué), `bulk_create`.
- Hooks (aucun nouvel endpoint, juste des appels ajoutés aux vues existantes) :
  - `PostulerAPIView.post` (`jobs/views/candidatures.py`) : après création de la candidature → `NOUVELLE_CANDIDATURE` toujours ; si `score_matching >= 80` → `CANDIDAT_RECOMMANDE` en plus.
  - `PostulerRapideAPIView.post` : `NOUVELLE_CANDIDATURE` (jamais recommandé, score toujours 0 en candidature rapide).
  - `EnvoyerCandidatureSpontaneeAPIView.post` (`jobs/views/recruteur.py`) : `CANDIDATURE_SPONTANEE`.
- Nouvel endpoint `POST jobs/notifications/marquer-toutes-lues/` (`MarkAllNotificationsReadAPIView`) — `Notification.objects.filter(destinataire=request.user, lue=False).update(lue=True)`. Réutilisable par candidat et recruteur (générique, comme le reste de l'API notifications).
- Sécurité : `_notifier_equipe` ne fait que créer des `Notification` scopées à `entreprise` → aucune nouvelle surface d'exposition. Les endpoints notifications existants filtrent déjà strictement sur `destinataire=request.user`.

## Frontend
- `jobsService`/`candidatService.js` : nouvelle méthode `markAllNotificationsAsRead()`. `getNotifications`/`markNotificationAsRead` déjà génériques, réutilisés tels quels.
- Nouvelle page `Pages/Recruteur/NotificationsRecruteur.jsx` — même structure que `BoiteReception.jsx` (candidat) : liste à gauche + détail à droite, icône par `type_notif` (Inbox=spontanée, UserCheck=nouvelle candidature, Award=recommandé), bouton "Tout marquer lu".
- `RecruteurLayout.jsx` : nouvel item "Notifications" dans le groupe "Principal", badge = nombre de non lus (fetché en parallèle du badge Messages existant).
- `NavbarRecruteur.jsx` : même badge répercuté sur le lien équivalent du dropdown desktop + menu mobile (pattern déjà suivi pour Messages/Favoris).
- Route `/notifications` ajoutée dans `App.jsx` sous le `<Route element={<RecruteurRoute><RecruteurLayout/></RecruteurRoute>}>` existant (libre, la route candidat équivalente est `/inbox`).

## Hors périmètre
- Pas de push navigateur / WebSocket temps réel — rafraîchissement au chargement de page, comme le reste du système de notifications existant.
- Pas de préférences par type d'événement (on/off individuel) — tout est activé, cohérent avec le fait qu'aucune préférence de notification recruteur n'existe déjà ailleurs dans le produit.
