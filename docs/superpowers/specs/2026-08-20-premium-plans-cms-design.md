# CMS TafTech — Sous-projet 1 : Prix / Abonnements / Avantages Premium

_Date : 20/08/2026 — Branche `feature/demandes-client`_

## Contexte

L'employeur veut gérer sans intervention technique : prix, abonnements, avantages Premium, FAQ,
secteurs, métiers, compétences, articles, bannières, pages du site, et un futur panel de contrôle
des paramètres IA du site. Ce chantier est décomposé en sous-projets indépendants ; celui-ci
couvre le premier : **Prix / Abonnements / Avantages Premium**.

Secteurs/métiers ont déjà un modèle DB + panel admin (`AdminMetiers.jsx`, nomenclature ANEM) —
hors scope ici. FAQ/Articles/Bannières/Pages/Compétences/Contrôle IA seront des sous-projets
brainstormés séparément.

## Constat clé

Le prix Premium était dupliqué en 3 endroits : `PremiumPage.jsx` (affichage),
`recruteur.py::_get_prix_premium` (montant réellement facturé via Chargily), et une 3ᵉ formule en
dur dans un email. Le backend doit devenir la source de vérité unique — sinon changer le prix dans
un futur panel ne changerait que l'affichage, pas ce qui est réellement facturé.

## Modèle de données

```python
class PremiumPlan(models.Model):
    nb_mois = models.PositiveIntegerField(unique=True)
    label = models.CharField(max_length=50)
    prix_da = models.PositiveIntegerField()  # montant final, DA — saisi directement, pas calculé
    populaire = models.BooleanField(default=False)
    actif = models.BooleanField(default=True)
    ordre = models.PositiveIntegerField(default=0)

class PremiumAvantage(models.Model):
    icone = models.CharField(max_length=40, choices=ICONES_CHOICES)  # whitelist lucide-react
    titre = models.CharField(max_length=100)
    description = models.CharField(max_length=300)
    ordre = models.PositiveIntegerField(default=0)
    actif = models.BooleanField(default=True)
```

Deux modèles séparés (pas un générique clé/valeur) — champs vraiment différents et typés, un
modèle générique aurait exigé de sérialiser des champs métier (prix, icône) en JSON flou.

Durées d'abonnement **totalement libres** (pas 4 paliers figés) — l'admin peut ajouter/retirer des
paliers. Prix saisi en **montant final** par palier (pas de formule prix mensuel × remise) — plus
simple à comprendre/modifier pour un non-technique, fonctionne avec n'importe quelle durée.

Pas de FK entre `PremiumPlan`/`PremiumAvantage` et l'historique (`Candidature`,
`ProfilEntreprise.premium_nb_mois`) — ces derniers restent des snapshots figés au moment de
l'achat, cohérent avec le principe déjà appliqué ailleurs dans le projet. Supprimer/désactiver un
plan n'affecte donc jamais l'historique.

## API

```
GET  /api/jobs/premium/plans/        → AllowAny, PublicReadThrottle, paliers actifs triés par ordre
GET  /api/jobs/premium/avantages/    → AllowAny, PublicReadThrottle, avantages actifs triés par ordre

GET/POST     /api/jobs/admin/premium/plans/       → IsAdminUser
PATCH/DELETE /api/jobs/admin/premium/plans/<id>/  → IsAdminUser
GET/POST     /api/jobs/admin/premium/avantages/       → IsAdminUser
PATCH/DELETE /api/jobs/admin/premium/avantages/<id>/  → IsAdminUser
```

Cache `jobs_premium_plans`/`jobs_premium_avantages` (timeout 3600, pattern `jobs_constants`),
invalidé à chaque écriture admin.

## Sécurité

- `ChargilyCheckoutAPIView` : `nb_mois` validé contre les paliers **actifs** en base
  (`PremiumPlan.objects.filter(actif=True).values_list('nb_mois', flat=True)`), rejette toute
  valeur hors liste — remplace l'ancien `max(1, min(nb_mois, 12))`, plus strict (rejette aussi un
  ancien palier désactivé).
- Icônes contraintes par `choices` Django (whitelist), pas de texte libre — élimine tout risque
  d'injection dans le nom de composant React côté frontend.
- Endpoints admin : `IsAdminUser`, pattern identique au reste de l'admin (`AdminMetiers`, etc.).

## Frontend

- Nouveau `Pages/Admin/AdminPremium.jsx` (route `/admin-taftech/premium-config`), entrée sidebar
  section "Système" de `AdminLayout.jsx`. Deux onglets internes (pattern `ParametresRecruteur.jsx`) :
  "Abonnements" (tableau paliers, édition inline) et "Avantages" (liste cartes, select icône
  whitelist, champ `ordre` numérique — pas de drag&drop, cohérent avec le reste de l'admin qui n'en
  a nulle part).
- `PremiumPage.jsx` : `DUREES`/`PRIX_MENSUEL`/`getPrix()`/`AVANTAGES_DETAILLES` supprimés,
  remplacés par fetch des 2 GET publics au montage (cache module-level, pattern
  `jobsService.getNomenclature()`). Skeleton loader pendant chargement.
- `LandingRecruteur.jsx` (teaser prix/avantages) : même source.

## Migration / backfill

`RunPython` : crée les 4 `PremiumPlan` actuels (1/3/6/12 mois → 2000/6000/11040/19920 DA) et les 6
`PremiumAvantage` existants, valeurs identiques à l'existant — bascule invisible pour les
recruteurs, aucun changement de prix au déploiement.

## Génération IA — hors scope ici

Clarifié avec l'utilisateur : la demande "Intelligence artificielle" ne concerne pas la génération
de contenu ici, mais un futur panel de **contrôle des paramètres IA du site** (modèles utilisés,
activer/désactiver des fonctionnalités) — sous-projet séparé, à brainstormer plus tard.

## Tests

- Backend : CRUD admin (create/patch/delete plan+avantage, 403 si non-admin), rejet Chargily d'un
  `nb_mois` hors paliers actifs, désactivation d'un palier n'affecte pas l'historique.
- Frontend : `AdminPremium.test.jsx` (nouveau), `PremiumPage.test.jsx` mis à jour (mock des 2 GET
  au lieu des constantes), `LandingRecruteur.test.jsx` si impacté.
