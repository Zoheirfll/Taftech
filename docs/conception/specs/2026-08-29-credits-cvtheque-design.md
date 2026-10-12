# Système de crédits CVthèque

Date : 2026-08-29

## Contexte

La CVthèque donne aujourd'hui un accès binaire par palier : un palier Business+ voit les coordonnées (email/téléphone) de **tous** les candidats de la base sans aucune limite ni coût perçu — seul le téléchargement du CV est compté contre un quota mensuel (`Palier.limite_cv_mois`, via le modèle `TelechargementCV`). L'utilisateur juge que cet accès illimité "ne plaît pas" : des milliers de profils consultables sans friction ni valeur perçue, alors que d'autres plateformes du marché (Emploitic) font payer l'accès à chaque profil via un système de crédits.

Objectif : donner une vraie valeur à chaque profil consulté, sur le modèle "1 crédit = 1 candidat débloqué", tout en gardant la navigation/recherche CVthèque incluse dans le palier (le crédit ne bloque pas la découverte, seulement l'accès aux coordonnées).

## Décisions actées

1. **Portée d'un crédit** : 1 crédit débloque coordonnées (email, téléphone) **et** téléchargement du CV **ensemble**, pour un candidat donné — pas de granularité plus fine.
2. **Durée de l'accès débloqué** : acquis **à vie** une fois payé — pas de re-consommation à chaque consultation ultérieure du même profil.
3. **Portée de l'accès débloqué** : partagé par **toute l'équipe** de l'entreprise (PROPRIETAIRE/ADMIN/UTILISATEUR/INVITE), cohérent avec le reste du projet où l'accès CVthèque/candidatures est déjà partagé.
4. **Quota mensuel** : chaque palier donne un nombre de crédits par mois, remis à zéro chaque mois (non cumulables, non reportables). Le champ existant `Palier.limite_cv_mois` est **remplacé** par un nouveau champ dédié `Palier.credits_mois` — pas de réutilisation en raccourci d'un champ existant.
5. **Palier Gratuit** : aucun accès CVthèque (inchangé), donc 0 crédit et pas d'achat de pack possible sans palier payant (Starter+ minimum).
6. **Packs de crédits achetables** : quand le quota mensuel est épuisé, achat de packs fixes via Chargily (déjà branché pour les paliers). Valeurs de départ (éditables sans déploiement, panel admin) : 10 crédits / 2500 DA, 25 crédits / 5500 DA, 50 crédits / 9900 DA.
7. **Expiration des crédits achetés** : jamais — s'accumulent indéfiniment dans un pool séparé du quota mensuel, consommés seulement quand le quota mensuel du mois est épuisé.
8. **Migration** : pas de rétro-déblocage des profils déjà consultés avant la mise en prod — toutes les entreprises repartent de zéro déblocage. C'est un changement de comportement assumé : ce qui était gratuit (voir les coordonnées) devient l'action payante.

## Modèle de données

### `Palier` (modifié)
- `limite_cv_mois` **supprimé**.
- `credits_mois` (IntegerField, nullable = illimité comme les autres limites du modèle) **ajouté** — nombre de crédits offerts chaque mois à ce palier.
- Migration schéma (`RemoveField`/`AddField`) + migration de données backfillant `credits_mois` avec les valeurs actuelles de `limite_cv_mois` (pas de saisie manuelle nécessaire au déploiement).

### `CreditPack` (nouveau)
- `nom` (ex: "Pack 10"), `credits` (IntegerField), `prix_da` (IntegerField, `MinValueValidator(1)`), `actif` (bool), `ordre` (IntegerField).
- CRUD admin (`CreditPackAdminAPIView`, pattern identique à `PaliersAdminAPIView`), lecture publique `GET jobs/credit-packs/` (`AllowAny` + `PublicReadThrottle`, cache 1h, ne retourne que `actif=True`).
- Migration de seed : 3 packs (10/2500 DA, 25/5500 DA, 50/9900 DA), `ordre` croissant.

### `AccesCandidatDebloque` (nouveau)
- `entreprise` (FK `ProfilEntreprise`), `candidat` (FK `User`), `source` (choix `MENSUEL`/`ACHETE` — indique quel pool a été consommé, sert au calcul du quota mensuel restant), `date_debloque` (auto).
- `unique_together(entreprise, candidat)` — un seul déblocage par paire entreprise/candidat, jamais dupliqué (idempotent : si l'entreprise "débloque" un candidat déjà débloqué, l'action ne doit rien consommer et retourner l'état existant).

### `AbonnementEntreprise` (modifié)
- `credits_achetes_restants` (IntegerField, default 0) — pool cumulatif des crédits achetés via packs, jamais reset par le cron mensuel, décrémenté à chaque déblocage `source=ACHETE`.

### `PaiementCreditPack` (nouveau)
- Log de chaque achat confirmé : `entreprise` (FK), `pack_nom`/`credits`/`montant_da` (dénormalisés, comme `PaiementAbonnement.palier_nom`/`montant_da` — un pack supprimé/modifié plus tard n'altère jamais une facture déjà émise), `date_paiement`, `numero_facture` (même format `TT-{année}-{00001}` que `PaiementAbonnement`).

## Backend

### `jobs/credits_utils.py` (nouveau fichier)
- `credits_mensuel_utilises_ce_mois(entreprise)` : compte les `AccesCandidatDebloque` de cette entreprise avec `source=MENSUEL` et `date_debloque` dans le mois calendaire en cours (même principe que `quota_cv_atteint` existant — jamais un compteur stocké à décrémenter, toujours recalculable).
- `credits_disponibles(entreprise)` : retourne `{mensuel_restant, achetes_restant}` — `mensuel_restant = max(0, palier.credits_mois - credits_mensuel_utilises_ce_mois(entreprise))` (illimité si `credits_mois is None`), `achetes_restant = abonnement.credits_achetes_restants`.
- `deverrouiller_candidat(entreprise, candidat)` :
  - Si un `AccesCandidatDebloque` existe déjà pour cette paire → retourne l'existant sans consommer de crédit (idempotent).
  - Sinon, consomme `mensuel_restant` en priorité (crée `AccesCandidatDebloque(source=MENSUEL)`) ; si épuisé, consomme `achetes_restant` (crée `AccesCandidatDebloque(source=ACHETE)`, décrémente `credits_achetes_restants`) ; si les deux sont à 0, lève une exception dédiée (`CreditsEpuisesError`) que la vue traduit en 403.

### `CVThequeView` (modifiée)
- Le filtrage/recherche reste inchangé (toujours gaté par `palier` existant : Gratuit bloqué entièrement, filtres avancés Business+).
- Chaque résultat expose `est_debloque` (bool, `AccesCandidatDebloque` existe pour ce candidat) — si `False`, `email`/`telephone`/URL du CV sont masqués côté réponse (pas seulement côté frontend — ne jamais faire confiance au client pour cacher une donnée sensible).
- La réponse inclut un résumé `credits_disponibles: {mensuel_restant, achetes_restant}`.

### Nouvel endpoint `POST jobs/cvtheque/candidats/<candidat_id>/debloquer/`
- `DeverrouillerCandidatAPIView` — `get_entreprise_for_user()` + `get_membre_role()` (INVITE bloqué en écriture, cohérent avec le reste du projet).
- 403 `PALIER_INSUFFISANT` si palier absent/Gratuit.
- 403 `CREDITS_EPUISES` si `CreditsEpuisesError` levée.
- 200 avec le candidat désormais débloqué (coordonnées + URL CV en clair) sinon.
- Log `EquipeActionLog` (nouvelle action `DEVERROUILLER_CANDIDAT`), cohérent avec le pattern d'audit déjà en place sur les autres actions d'équipe.

### `CandidatFichierPriveAPIView` (téléchargement CV, modifiée)
- Remplace la logique actuelle `_acces_autorise()` (qui retournait `(acces, via_cvtheque)` et comptait chaque téléchargement contre le quota) par une simple vérification de l'existence d'un `AccesCandidatDebloque` pour ce candidat — un profil déjà débloqué se télécharge sans jamais reconsommer de crédit, y compris plusieurs fois.
- Les autres voies d'accès existantes (vraie candidature reçue, candidat lui-même, admin) restent inchangées et continuent de ne jamais consommer de crédit.

### Packs — achat
- `GET jobs/credit-packs/` (public, décrit plus haut).
- `POST jobs/credit-packs/checkout/` (`CreditPackCheckoutAPIView`) — même mécanisme que `ChargilyCheckoutPalierAPIView` (crée une session Chargily avec `metadata.pack_id`).
- `ChargilyWebhookAPIView` : nouvelle branche détectant `metadata.pack_id` — crédite `AbonnementEntreprise.credits_achetes_restants += pack.credits`, crée `PaiementCreditPack`. Signature HMAC déjà vérifiée en amont (inchangé), cette branche est en aval comme les autres.

### Admin
- `CreditPackAdminAPIView` (CRUD, `IsAdminUser` + vérif rôle, pattern `PaliersAdminAPIView`) — pas de suppression physique si des `PaiementCreditPack` y référencent déjà un nom dénormalisé (aucune contrainte FK à casser de toute façon, mais cohérent avec le principe déjà appliqué à `Palier`/`PremiumPlan`).

### Dashboard
- `DashboardRecruteurAPIView` expose `credits_mensuel_restant`/`credits_achetes_restant` (calculés via `credits_disponibles()`), consommé par le badge compteur frontend.

## Frontend

### `CVTheque.jsx`
- Carte candidat déjà débloqué (`est_debloque: true`) : coordonnées visibles, bouton téléchargement CV direct — comportement identique à aujourd'hui pour ce candidat précis.
- Carte candidat verrouillé : coordonnées floutées/masquées, bouton "Débloquer ce profil (1 crédit)" — `confirmToast()` avant l'appel (dépense réelle, pas anodine), puis `POST .../debloquer/`. En cas de 403 `CREDITS_EPUISES`, toast avec lien vers la section d'achat de packs (`/recruteurs/abonnements`) au lieu d'un message d'erreur générique.
- Compteur "X crédits ce mois-ci + Y achetés" affiché en haut de la page (depuis la réponse `credits_disponibles` de `CVThequeView` ou du dashboard).

### `AbonnementsPage.jsx`
- Nouvelle section "Crédits CVthèque" : liste des `CreditPack` actifs (`jobsService.getCreditPacks()`), bouton d'achat par pack → `jobsService.checkoutCreditPack(packId)` → redirection Chargily (même flux que l'achat de palier).
- Affiche le solde actuel (mensuel restant + acheté) au-dessus de la liste.

### Admin `Pages/Admin/AdminCreditPacks.jsx` (nouveau)
- Route `/admin-taftech/credit-packs`, sidebar section "Système" — tableau des packs + modale d'édition (nom, crédits, prix, actif, ordre), pattern `AdminPaliers.jsx`. Pas de suppression si le pack a déjà des paiements associés (avertissement, pas un blocage dur — cohérent avec le reste de l'admin qui privilégie désactiver plutôt que supprimer).

## Sécurité

- `DeverrouillerCandidatAPIView`, `CreditPackCheckoutAPIView` : `IsAuthenticated` + `get_entreprise_for_user()` + `get_membre_role()` (INVITE bloqué en écriture) — même pattern que toutes les actions d'équipe existantes.
- `CVThequeView` masque email/téléphone/URL CV **côté serializer**, jamais seulement côté affichage frontend — un appel API direct sans passer par l'UI ne doit jamais fuiter les coordonnées d'un profil non débloqué.
- `CreditPackAdminAPIView` : `IsAdminUser` + vérif rôle, identique aux 6 autres CRUD admin du chantier CMS.
- Webhook Chargily : la nouvelle branche `pack_id` est strictement en aval de la vérification de signature HMAC déjà en place (inchangée).

## Tests

- Backend : `credits_utils.py` (calcul quota mensuel, consommation mensuel-puis-acheté, idempotence d'un double déblocage), `DeverrouillerCandidatAPIView` (403 palier insuffisant, 403 crédits épuisés, 200 + log audit, INVITE bloqué), `CVThequeView` (coordonnées masquées si non débloqué, exposées si débloqué), `CandidatFichierPriveAPIView` (téléchargement libre après déblocage, aucune reconsommation), webhook pack (crédite le bon pool), CRUD `CreditPackAdminAPIView`.
- Frontend : `CVTheque.jsx` (carte verrouillée/déverrouillée, flux de déblocage, message crédits épuisés), `AbonnementsPage.jsx` (section packs, achat), `AdminCreditPacks.jsx` (CRUD).

## Hors périmètre (explicitement écarté)

- Pas d'accès CVthèque ni d'achat de packs pour le palier Gratuit.
- Pas de rétro-déblocage des profils déjà consultés avant cette fonctionnalité.
- Pas de granularité séparée coordonnées/CV (un seul crédit débloque les deux ensemble).
- Pas de cumul/report du quota mensuel non utilisé d'un mois sur l'autre.
