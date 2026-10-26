# Session du 24/10/2026 — Équipe : invitations, rôles, cadenas de navigation

Branche : `fix/referentiel-doublons-specialites` (non commité). Sécurité : SECURITY.md §48. Doc fonctionnelle : [portail-recruteur.md](../fonctionnel/portail-recruteur.md).

## Point de départ

Test réel d'une invitation « Administrateur » envoyée à un compte déjà existant, créé via Google. La page d'invitation demandait « votre mot de passe TAFTECH » à quelqu'un qui n'en avait pas. De là, une série de trous dans la gestion d'équipe, corrigés dans l'ordre où ils sont apparus.

## 1. Couleur du bouton « Accepter l'invitation »

`AccepterInvitation.jsx` : `tw.bgPrimarySolidHover` (indigo) remplacé par `tw.buttonSuccessSolid` (emerald, déjà dans `theme.js`). L'icône « Users » du haut de la carte reste indigo (non demandé).

## 2. Invitation d'un compte sans mot de passe (cause réelle, deux essais)

- **Constat** : `AccepterInvitationAPIView` ne reconnaissait un compte « sans mot de passe » que par `est_compte_google`, un drapeau posé à `True` dans **un seul** chemin de création (`accounts/views.py`, connexion Google). Le compte de test n'avait pas ce drapeau.
- **Essai 1 (insuffisant)** : ajouter `not user.has_usable_password()`. Les tests passaient (ils créaient le compte avec `password=None`, qui produit un mot de passe *inutilisable* préfixé `!`), mais l'écran ne changeait pas.
- **Cause réelle** (lue en base, lecture seule) : le mot de passe du compte était une **chaîne vide** (`''`). Django la juge « utilisable » (`has_usable_password()` renvoie `True`), alors que l'admin affiche « Aucun mot de passe défini ».
- **Correctif** : `_sans_mot_de_passe(user)` (`jobs/views/equipe.py`) = drapeau Google **ou** `not user.password` **ou** `not has_usable_password()`. Utilisé par le GET (écran) et le POST (acceptation). Test avec `update(password='')` qui reproduit le cas réel.
- **Leçon** : un test qui fabrique son propre cas (`password=None`) peut passer sans reproduire la donnée réelle. Reproduire la donnée de la base d'abord.

## 3. Refus d'inviter (et d'accepter) quelqu'un qui ne verrait jamais l'équipe

`get_entreprise_for_user` renvoie **toujours sa propre entreprise** à un propriétaire, et le **premier** rattachement (`.first()`, sans `order_by`) à un membre de plusieurs équipes. Un invité propriétaire ailleurs, ou déjà membre d'une autre équipe, acceptait donc une invitation sans effet visible.

- À l'envoi (`InviterMembreAPIView.post`) : 400 « Cette personne possède déjà une entreprise sur TAFTECH » / « fait déjà partie d'une autre équipe ».
- À l'ouverture du lien (GET) et à l'acceptation (POST) : même contrôle (`_refus_acceptation`), car la situation peut changer entre l'envoi et l'acceptation (72 h). Fait **avant** toute modification (avant de définir un mot de passe).
- **Compromis assumé** : ces messages révèlent qu'un email est propriétaire ou membre ailleurs, au seul propriétaire / administrateur d'une équipe Business (la règle « déjà membre de votre équipe » en révélait déjà autant). Le message reste identique pour un compte sans entreprise (test existant sur l'énumération conservé).
- **Non traité** : un membre de plusieurs équipes pour lequel `.first()` est arbitraire n'est plus créable via l'API, mais d'éventuelles données déjà en base restent à vérifier.

## 4. Cadenas de navigation et rôle d'équipe

- **`authService.peutFaire`** donnait **tous les droits** au rôle ADMIN d'équipe (y compris ceux du propriétaire) et à tout compte `RECRUTEUR`, même invité dans l'équipe d'un autre. Le backend refusait déjà (paiements et crédits : `PROPRIETAIRE` strict), d'où des pages ouvertes qui répondaient 403.
- **Correctif** : plus de raccourci ADMIN ; un compte `RECRUTEUR` n'est propriétaire que s'il n'est pas membre d'équipe (`estMembreEquipe !== "true"`). L'ordre `INVITE < UTILISATEUR < ADMIN < PROPRIETAIRE` fait le reste. Tests dans `authService.test.js`.
- **Barre latérale, menu mobile, menu déroulant, barre du bas** : les entrées interdites par le rôle ne sont plus masquées mais gardent un cadenas (`CadenasPalier`, nouveau paramètre `raison`). « Mon équipe » = `minRole: "ADMIN"` (le backend l'autorise à l'Administrateur).
- **Routes** : `RoleGuard` ajouté sur `/facturation` et `/recruteurs/abonnements` (`PROPRIETAIRE`) et sur `/mon-equipe` (`ADMIN`) : « Accès restreint » au lieu d'une page vide avec des erreurs.
- **Effet de bord à connaître** : l'onglet « Notifications » de `/parametres` (`minRole: "PROPRIETAIRE"`) est maintenant masqué aux Administrateurs.
- **Le lien promotionnel « Passer Premium »** reste caché aux non-propriétaires (ce n'est pas une entrée de navigation).

## 5. Page « Mon équipe » : qui voit et qui gère

- **Bug** : la page conditionnait le bouton « Inviter », la colonne « Actions » et les invitations en attente à `estProprietaire`, alors que le backend accepte l'Administrateur. Une seule condition `peutGererEquipe` (propriétaire ou administrateur) remplace ces quatre.
- **Liste réservée** : `EquipeAPIView.get` renvoie 403 sous le rôle Administrateur (avant, tout membre, Invité compris, récupérait les emails de ses collègues par appel direct). La liste n'est utilisée que par la page « Mon équipe » (vérifié). L'ancien test `test_membre_voit_membres` (« un membre peut aussi voir la liste ») est remplacé par trois tests (Utilisateur, Invité refusés ; Administrateur autorisé) : **décision de l'utilisateur du 24/10/2026**.
- **Rôle de soi-même** : `patch` refuse 403 de modifier son propre rôle ; le crayon est masqué sur sa propre ligne. Le retrait de soi-même reste possible côté serveur (un membre peut quitter l'équipe) ; l'écran ne propose pas la corbeille sur sa ligne (inchangé).
- **Seul le propriétaire touche aux administrateurs** (décision du 24/10/2026) : modifier, retirer **et attribuer** le rôle ADMIN (invitation ou changement). `MSG_ADMIN_RESERVE`. Un administrateur peut toujours se retirer lui-même et gérer les rôles inférieurs. Écran : option « Administrateur » absente de ses listes de rôles, aucune action sur une ligne administrateur. **Interprétation** : « toucher aux administrateurs » inclut l'attribution du rôle ; si l'utilisateur ne la voulait pas, retirer le contrôle d'`InviterMembreAPIView.post` et la moitié `nouveau_role` du `patch`.

## 6. Textes de l'écran « Paramètres entreprise → Mon profil »

« Ces informations sont visibles sur votre profil public » était **faux** : nom, téléphone et intitulé de poste ne sortent que dans le sérialiseur privé du dashboard (`EntrepriseDashboardDetailSerializer`) et dans l'export admin des utilisateurs ; aucune page publique ne les lit. Texte remplacé : « …restent dans votre espace recruteur : elles ne sont pas affichées publiquement ». Libellé « Intitulé de poste (ex: …) » : « ex » retiré (règle du projet : pas de placeholder exemple).

## Ce qui est volontairement NON fait (à décider)

- **FAIT LE 25/10/2026 (accord reconfirmé par l'utilisateur) : voir la section « Suite du 25/10/2026 » en bas de ce fichier.** Texte d'origine : **Compte d'un membre retiré** : seul le rattachement `MembreEquipe` est supprimé ; le compte (créé par l'invitation, rôle `RECRUTEUR`) reste, actif, sans entreprise, et bloque l'email (unique) pour une inscription candidat. **Décision de l'utilisateur : le supprimer** (« je ne veux pas qu'il puisse accéder à mon compte recruteur »). Plan proposé, **en attente d'accord** et prévu à la toute fin : champ `compte_cree_par_invitation` + migration, suppression seulement si le compte a été créé par l'invitation, n'a ni entreprise ni autre équipe **et** si sa suppression n'emporte aucune donnée de l'entreprise. **Piège identifié** : `Questionnaire.recruteur` est en `CASCADE` : supprimer le compte d'un Administrateur qui a créé des questionnaires les détruirait. Liste des FK de `jobs/models` lue en partie seulement (sortie tronquée) : refaire l'inventaire complet avant (`NestedObjects`/Collector). Trace obligatoire (`EquipeActionLog`, email conservé), modale de confirmation, jamais pour un compte préexistant.
- Cleanup / message à la connexion d'un recruteur sans entreprise (option 3 écartée au profit de la suppression).
- Throttling de `InviterMembreAPIView` non examiné.

## Tests

- Backend (`jobs/tests/test_api_equipe.py`) : écrits pour tous les points ci-dessus (compte sans mot de passe GET/POST dont chaîne vide, refus à l'envoi / à l'ouverture / à l'acceptation, liste réservée, rôle de soi-même, règle « propriétaire seul pour les administrateurs »). **Vérifié en fin de session** : `test_api_equipe` + `test_audit_acces_paliers` + `test_api_paliers_gating` = **95 tests OK** (≈ 5 min, avec `DB_NAME=taftech_db_claude_iso` car `test_taftech_db` était occupée). Suite backend complète non relancée.
- Frontend : suite complète **847 / 848** ; le seul échec, `RecruteurLayout.test.jsx` EC1, décrivait l'ancien comportement (« un lien interdit par le rôle n'apparaît pas ») : réécrit pour la règle actuelle (lien visible avec cadenas `Réservé à un rôle supérieur dans l'équipe`, deux cadenas pour l'administrateur : abonnements et facturation), fichier **12/12**. `MonEquipe.test.jsx` 14, `authService.test.js`, `App.test.jsx`, `BottomNavRecruteur.test.jsx`, `ParametresRecruteur` 16 OK ; build OK avant ce dernier test. **Non relancés après la correction : les 111 fichiers et le build** ; non essayé à l'écran avec un compte Administrateur après le dernier lot.

## Pièges retenus

- Une chaîne de mot de passe vide n'est pas « inutilisable » pour Django.
- Après `peutFaire` corrigé, `localStorage.estMembreEquipe` n'est posé qu'à la connexion : se reconnecter pour voir un changement de rôle.
- Le garde de fichiers (GateGuard) annule la **première** modification d'un lot sur un fichier jamais touché : rejouer celle-là.

## Suite du 25/10/2026 — suppression du compte d'un membre retiré (accord reconfirmé)

- **Champ** `CustomUser.compte_cree_par_invitation` (migration `accounts/0013`, **à appliquer en production**), posé à `True` seulement quand `AccepterInvitationAPIView` **crée** le compte. Les comptes déjà en base valent `False` : jamais supprimés par ce mécanisme.
- **Décision** : `jobs/equipe_comptes.py` (`motif_de_conservation`, `supprimer_compte_si_orphelin`). Le compte est conservé si : drapeau absent, staff/superuser/rôle autre que `RECRUTEUR`, propriétaire d'une entreprise, membre d'une autre équipe, ou si le `Collector` de Django (lecture seule) trouve des lignes emportées hors d'une liste blanche de données personnelles (`LogEntry`, `MembreEquipe`, `Notification`, `UtilisationIA`, `QuotaIAOverride`, `ArriveeDemandeur`, tables de M2M automatiques). C'est l'inventaire complet que le journal demandait : on ne tient pas une liste de FK à la main, une nouvelle relation `CASCADE` ajoutée plus tard bloque la suppression par défaut.
- **Approche écartée** : lister à la main les modèles dangereux (`Questionnaire`…) : une relation oubliée ou ajoutée plus tard détruirait des données sans signal. La liste blanche échoue du côté sûr (le compte reste).
- **Qui déclenche** : `EquipeAPIView.delete`, seulement si le retrait est fait par un autre que le membre. Un membre qui quitte lui-même garde son compte (choix prudent, non demandé : à confirmer).
- **Trace** : `EquipeActionLog` `RETIRER_MEMBRE`, détail = e-mail + « compte supprimé » ou « compte conservé (motif) ».
- **Écran** : le texte de `confirmToast` de `MonEquipe.jsx` annonce la suppression définitive. **Pas de saisie de mot-clé** (le `confirmToast` actuel est le seul composant de confirmation) : à décider si on veut la confirmation renforcée.
- **Non fait** : un compte conservé (données liées) reste actif sans entreprise ; il n'est pas désactivé.
- **Tests** : `EquipeRetraitSupprimeCompteTests` (9 : suppression, trace, compte préexistant, départ volontaire, questionnaire, autre équipe, staff, parcours complet acceptation puis retrait, drapeau non posé pour un compte existant). `test_api_equipe` 77/77 OK (`DB_NAME=taftech_db_claude_iso`), `MonEquipe.test.jsx` 14/14. Suites complètes et build non relancés ; non essayé à l'écran ; non commité.
