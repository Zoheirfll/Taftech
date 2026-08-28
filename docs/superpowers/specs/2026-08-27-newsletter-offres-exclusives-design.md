# Newsletter (v1) + Offres exclusives

## 1. Newsletter

**Objectif** : collecte d'emails + envoi manuel par l'admin, même patron que `AdminBroadcast.jsx` (rédaction + envoi immédiat, pas de campagnes planifiées).

**Backend**
- Nouveau modèle `AbonneNewsletter` (`jobs/models.py`) : `email` (unique), `date_inscription` (auto), `actif` (bool, permet un désabonnement sans supprimer la ligne), `source` (CharField libre — "footer", "inscription candidat", etc., valeur par défaut `"footer"`).
- `POST jobs/newsletter/inscrire/` (`NewsletterInscriptionAPIView`, `AllowAny`, `WriteActionThrottle` + `EmailRateThrottle` comme les autres écritures anonymes) — email invalide → 400 ; email déjà existant et `actif=True` → 200 idempotent (pas d'erreur) ; existant mais `actif=False` → réactive.
- `POST jobs/newsletter/desinscrire/` (`AllowAny`, lien de désabonnement par email — pas de token, cohérent avec le niveau de rigueur du reste du projet ; `actif=False`).
- Admin (`IsAdminUser`) : `GET jobs/admin/newsletter/abonnes/` (liste paginée + compteur), `POST jobs/admin/newsletter/envoyer/` (`{sujet, message}` → envoie un email à tous les abonnés `actif=True` via le SMTP Gmail déjà configuré, réutilise le pattern d'envoi en masse déjà existant dans `AdminBroadcast`/notifications ; log `AuditLog` sur l'envoi, comme les autres actions admin sensibles).

**Frontend**
- Composant `NewsletterSignup.jsx` — champ email + bouton, intégré dans `Footer.jsx` (candidat, footer indigo) — pas dans `FooterRecruteur.jsx` (cible = candidats/visiteurs, cohérent avec la donnée collectée).
- Panel admin `AdminNewsletter.jsx` (route `/admin-taftech/newsletter`, sidebar section "Communauté") — tableau des abonnés (email, date, statut) + formulaire d'envoi (sujet + corps texte simple, pas de RichTextEditor — cohérence avec `AdminBroadcast` qui est déjà en texte brut) + confirmation (`confirmToast`) avant envoi vu l'impact (email à N abonnés).

**Sécurité** : endpoints d'inscription/désinscription publics mais throttlés (mêmes garde-fous que candidature spontanée/contact) ; endpoints admin `IsAdminUser` + vérif rôle, aucune donnée sensible au-delà de l'email.

## 2. Offres exclusives

**Objectif** : badge "Exclusif" + priorité d'affichage, activable par l'admin ou un recruteur au palier Business+.

**Backend**
- Nouveau champ `OffreEmploi.est_exclusive` (BooleanField, défaut `False`).
- `JobListAPIView` : tri qui place les offres exclusives en tête (`order_by('-est_exclusive', ...)` combiné au tri existant priorité active/clôturée déjà en place).
- Activation : 
  - **Admin** : ajouté au payload déjà modifiable dans `AdminOffreModerateAPIView` (ou nouvel endpoint PATCH dédié si la vue de modération ne couvre pas ce champ — à vérifier en implémentant).
  - **Recruteur** : `UpdateOffreRecruteurAPIView` accepte `est_exclusive` dans le payload **uniquement si** `get_palier_actif(entreprise)` est Business ou Enterprise (403 sinon) — cohérent avec le gating Phase 2b déjà en place pour les autres fonctionnalités par palier.
  - `JobCreateAPIView` (création) : même gate palier si `est_exclusive` est envoyé à la création.

**Frontend**
- `JobCard.jsx` : badge "Exclusif" (nouveau token `tw.jobCardBadgeExclusive`, doré/ambre pour se distinguer des badges existants) affiché avant le badge type de contrat si `job.est_exclusive`.
- `CreateJob.jsx` : case à cocher "Marquer comme offre exclusive" visible seulement si palier Business+ (sinon message "réservé aux paliers Business et Enterprise" + lien vers Abonnements, même pattern que les filtres CVthèque avancés déjà gatés).
- `DashboardRecruteur.jsx` (modale modifier offre) : même case à cocher, même gate.
- Admin `AdminOffres.jsx` : toggle rapide "Exclusif" par ligne (action groupée non nécessaire — champ ponctuel).

**Sécurité** : le gate palier est vérifié côté serveur (pas seulement UI) sur les deux points d'écriture (création + modification) — un recruteur Starter/Pro ne peut pas forcer `est_exclusive=True` via un appel API direct.

## Tests
- Backend : nouveaux tests `test_api_newsletter.py` (inscription/désinscription/idempotence/throttle, envoi admin, permissions) et ajout de cas dans `test_api_offres.py`/`test_api_paliers_gating.py` pour `est_exclusive` (gate palier, tri).
- Frontend : `AdminNewsletter.test.jsx`, `NewsletterSignup` testé via `Footer.test.jsx`, cas `est_exclusive` ajoutés à `CreateJob.test.jsx`/`JobCard` si testé/`AdminOffres.test.jsx`.

## Non touché
Aucun changement sur le système Palier lui-même (dépendance sur le nettoyage Palier/Premium déjà en cours — `get_palier_actif()` doit exister et fonctionner tel que nettoyé).
