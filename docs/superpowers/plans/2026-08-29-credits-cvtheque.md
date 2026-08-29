# Système de crédits CVthèque — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'accès illimité aux coordonnées candidat de la CVthèque (palier Business+) par un système de crédits façon Emploitic — 1 crédit débloque coordonnées + CV d'un candidat, à vie, partagé par toute l'équipe, avec un quota mensuel par palier et des packs de crédits achetables via Chargily.

**Architecture:** Django/DRF backend ajoute deux nouveaux modèles (`CreditPack`, `AccesCandidatDebloque`) et un module de logique métier dédié (`jobs/credits_utils.py`, calqué sur `jobs/paliers_utils.py`) ; `CVThequeView` et `CandidatFichierPriveAPIView` masquent désormais les données par candidat individuel (déblocage) au lieu d'un flag palier global. Le paiement des packs réutilise le webhook Chargily unique existant via un nouveau discriminant de métadonnées. React/Vite frontend ajoute l'UI de déblocage dans `CVTheque.jsx`, une section d'achat dans `AbonnementsPage.jsx`, et un panel admin CRUD pour les packs.

**Tech Stack:** Django 5.2 + DRF, PostgreSQL (port 5433), React 18 + Vite, Tailwind v4 (tokens `tw.*`), Chargily Pay (webhook HMAC déjà en place), react-hot-toast + `confirmToast`.

## Global Constraints

- 1 crédit débloque **coordonnées (email, téléphone) ET CV** ensemble pour un candidat — jamais de granularité plus fine.
- L'accès débloqué est **acquis à vie** et **partagé par toute l'équipe** de l'entreprise (PROPRIETAIRE/ADMIN/UTILISATEUR/INVITE) — jamais de re-consommation.
- `Palier.limite_cv_mois` est **supprimé**, remplacé par `Palier.credits_mois` (même sémantique nullable = illimité) — pas de réutilisation en raccourci.
- Le palier **Gratuit** (absence d'`AbonnementEntreprise` actif) n'a aucun accès CVthèque, donc 0 crédit et aucun achat de pack possible — Starter+ minimum.
- Quota mensuel **non cumulable** : reset chaque mois calendaire, jamais reporté.
- Packs de crédits (Chargily) : seed 10 crédits/2500 DA, 25/5500 DA, 50/9900 DA — éditables sans déploiement (panel admin).
- Crédits achetés en pack : **n'expirent jamais**, consommés seulement après épuisement du quota mensuel du mois en cours.
- Aucun rétro-déblocage : toutes les entreprises repartent de zéro déblocage à la mise en prod.
- Spec source : `docs/superpowers/specs/2026-08-29-credits-cvtheque-design.md`.
- **Décision de résolution d'ambiguïté (prise pendant ce plan, pas dans la spec initiale)** : `Palier.acces_coordonnees` (booléen existant, aujourd'hui `False` pour STARTER) ne gate plus la visibilité des coordonnées dans `CVThequeView`/`ProfilCandidatDTO` — remplacé entièrement par le déblocage par crédit, cohérent avec la décision spec "Starter+ minimum peut acheter/dépenser des crédits". Le champ `acces_coordonnees` reste inchangé sur le modèle et continue de gater `InviterCandidatCVThequeAPIView` et le flag `acces_coordonnees` du dashboard (hors périmètre de ce plan, non touchés).
- Prochain numéro de migration disponible : `0093` (dernière migration existante : `0092_alter_notification_type_notif.py`).

---

### Task 1: `Palier.credits_mois` remplace `limite_cv_mois`

**Files:**
- Modify: `taftech_backend/jobs/models.py:750-753` (champ `Palier.limite_cv_mois`)
- Create: `taftech_backend/jobs/migrations/0093_palier_credits_mois_add.py`
- Create: `taftech_backend/jobs/migrations/0094_backfill_credits_mois.py`
- Create: `taftech_backend/jobs/migrations/0095_palier_remove_limite_cv_mois.py`
- Modify: `taftech_backend/jobs/serializers/paliers.py:9-11`
- Modify: `taftech_frontend/src/Pages/Admin/AdminPaliers.jsx`
- Modify: `taftech_frontend/tests/AdminPaliers.test.jsx`
- Modify: `taftech_frontend/src/Pages/Recruteur/AbonnementsPage.jsx:21`
- Test: `taftech_backend/jobs/tests/test_api_paliers.py` (nouvelle assertion)

**Interfaces:**
- Produces: `Palier.credits_mois` (PositiveIntegerField, null=illimité) — consommé par Task 3 (`credits_utils.py`).

- [ ] **Step 1: Écrire le test backend qui échoue (le champ n'existe pas encore)**

Ajouter en fin de `taftech_backend/jobs/tests/test_api_paliers.py` :

```python
class PalierCreditsMoisFieldTest(TestCase):
    def test_credits_mois_remplace_limite_cv_mois(self):
        from jobs.models import Palier
        palier = Palier.objects.get(nom='STARTER')
        self.assertFalse(hasattr(palier, 'limite_cv_mois'))
        self.assertEqual(palier.credits_mois, 10)  # valeur backfillée depuis l'ancien limite_cv_mois=10
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_paliers.PalierCreditsMoisFieldTest -v 2`
Expected: FAIL — `AttributeError: 'Palier' object has no attribute 'credits_mois'` (le champ `limite_cv_mois` existe encore, donc `hasattr` sur `limite_cv_mois` serait True, mais `credits_mois` n'existe pas encore).

- [ ] **Step 3: Modifier le modèle `Palier`**

Dans `taftech_backend/jobs/models.py`, remplacer (lignes 750-753) :

```python
    limite_cv_mois = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Limite téléchargements CV/mois (vide = illimité)",
        validators=[MinValueValidator(1)],
    )
```

par :

```python
    credits_mois = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Crédits CVthèque/mois (vide = illimité)",
        validators=[MinValueValidator(1)],
    )
```

- [ ] **Step 4: Créer la migration d'ajout du champ**

Créer `taftech_backend/jobs/migrations/0093_palier_credits_mois_add.py` :

```python
from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0092_alter_notification_type_notif'),
    ]

    operations = [
        migrations.AddField(
            model_name='palier',
            name='credits_mois',
            field=models.PositiveIntegerField(
                blank=True, null=True,
                validators=[MinValueValidator(1)],
                verbose_name='Crédits CVthèque/mois (vide = illimité)',
            ),
        ),
    ]
```

- [ ] **Step 5: Créer la migration de backfill**

Créer `taftech_backend/jobs/migrations/0094_backfill_credits_mois.py` (même pattern que `0090_backfill_abonnement_avant_suppression_premium.py`) :

```python
from django.db import migrations


def backfill_credits_mois(apps, schema_editor):
    """Copie la valeur actuelle de limite_cv_mois vers le nouveau champ credits_mois avant
    suppression de l'ancien champ — le nombre de crédits mensuels d'un palier reste
    identique à son ancien quota de téléchargements CV, seule la sémantique change
    (crédit = accès complet, pas juste un téléchargement)."""
    Palier = apps.get_model('jobs', 'Palier')
    for palier in Palier.objects.all():
        palier.credits_mois = palier.limite_cv_mois
        palier.save(update_fields=['credits_mois'])


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0093_palier_credits_mois_add'),
    ]

    operations = [
        migrations.RunPython(backfill_credits_mois, reverse_noop),
    ]
```

- [ ] **Step 6: Créer la migration de suppression de l'ancien champ**

Créer `taftech_backend/jobs/migrations/0095_palier_remove_limite_cv_mois.py` :

```python
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0094_backfill_credits_mois'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='palier',
            name='limite_cv_mois',
        ),
    ]
```

- [ ] **Step 7: Appliquer les migrations et relancer le test**

Run:
```bash
cd taftech_backend
python manage.py migrate jobs
python manage.py test jobs.tests.test_api_paliers.PalierCreditsMoisFieldTest -v 2
```
Expected: PASS

- [ ] **Step 8: Mettre à jour le serializer `PalierSerializer`**

Dans `taftech_backend/jobs/serializers/paliers.py`, remplacer `'limite_cv_mois'` par `'credits_mois'` dans la liste `fields` (ligne 10).

- [ ] **Step 9: Mettre à jour `AdminPaliers.jsx`**

Dans `taftech_frontend/src/Pages/Admin/AdminPaliers.jsx`, remplacer chaque occurrence de `limite_cv_mois` par `credits_mois` (le champ de formulaire numérique optionnel, coercé `""` → `null`, suit exactement le même pattern que `limite_offres` déjà dans le fichier — juste renommer la clé et le libellé affiché en "Crédits CVthèque / mois").

- [ ] **Step 10: Mettre à jour `AdminPaliers.test.jsx`**

Remplacer toute occurrence de `limite_cv_mois` par `credits_mois` dans les fixtures/assertions du test.

- [ ] **Step 11: Mettre à jour `AbonnementsPage.jsx`**

Dans `taftech_frontend/src/Pages/Recruteur/AbonnementsPage.jsx`, remplacer dans `CRITERES_TABLEAU` (ligne 21) :

```js
  { key: "limite_cv_mois", label: "Téléchargement CV / mois", format: (v) => (v != null ? v : "Illimité") },
```

par :

```js
  { key: "credits_mois", label: "Crédits CVthèque / mois", format: (v) => (v != null ? v : "Illimité") },
```

- [ ] **Step 12: Lancer la suite complète backend + build frontend**

Run:
```bash
cd taftech_backend && python manage.py test jobs.tests -v 1
cd ../taftech_frontend && npm test -- --run && npx vite build
```
Expected: PASS partout, build propre.

- [ ] **Step 13: Commit**

```bash
git add taftech_backend/jobs/models.py taftech_backend/jobs/migrations/0093_palier_credits_mois_add.py taftech_backend/jobs/migrations/0094_backfill_credits_mois.py taftech_backend/jobs/migrations/0095_palier_remove_limite_cv_mois.py taftech_backend/jobs/serializers/paliers.py taftech_backend/jobs/tests/test_api_paliers.py taftech_frontend/src/Pages/Admin/AdminPaliers.jsx taftech_frontend/tests/AdminPaliers.test.jsx taftech_frontend/src/Pages/Recruteur/AbonnementsPage.jsx
git commit -m "refactor: Palier.credits_mois remplace limite_cv_mois"
```

---

### Task 2: Nouveaux modèles — `CreditPack`, `AccesCandidatDebloque`, `PaiementCreditPack`, `AbonnementEntreprise.credits_achetes_restants`

**Files:**
- Modify: `taftech_backend/jobs/models.py` (insérer après `TelechargementCV`, ligne 852)
- Create: `taftech_backend/jobs/migrations/0096_credits_models.py`
- Create: `taftech_backend/jobs/migrations/0097_seed_credit_packs.py`
- Test: `taftech_backend/jobs/tests/test_credits_models.py`

**Interfaces:**
- Produces: `CreditPack(nom, credits, prix_da, actif, ordre)`, `AccesCandidatDebloque(entreprise, candidat, source, date_debloque)` avec `source` ∈ `{'MENSUEL', 'ACHETE'}` et `unique_together(('entreprise', 'candidat'))`, `PaiementCreditPack(entreprise, pack_nom, credits, montant_da, date_paiement, numero_facture)`, `AbonnementEntreprise.credits_achetes_restants` (int, default 0). Consommé par Task 3 (`credits_utils.py`) et Task 6 (webhook).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `taftech_backend/jobs/tests/test_credits_models.py` :

```python
from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, CreditPack, AccesCandidatDebloque

User = get_user_model()


class CreditPackModelTest(TestCase):
    def test_creation_pack(self):
        pack = CreditPack.objects.create(nom="Pack 10", credits=10, prix_da=2500, ordre=1)
        self.assertTrue(pack.actif)
        self.assertEqual(str(pack), "Pack 10")


class AccesCandidatDebloqueModelTest(TestCase):
    def setUp(self):
        self.recruteur = User.objects.create_user(
            username="acd_recr", email="acd_recr@test.dz", password="pwd", role="RECRUTEUR",
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.recruteur, nom_entreprise="Co ACD", secteur_activite="IT",
            wilaya_siege="16 - Alger", registre_commerce="RC-ACD", est_approuvee=True,
        )
        self.candidat = User.objects.create_user(
            username="acd_cand", email="acd_cand@test.dz", password="pwd", role="CANDIDAT",
        )

    def test_unique_together_entreprise_candidat(self):
        AccesCandidatDebloque.objects.create(entreprise=self.entreprise, candidat=self.candidat, source='MENSUEL')
        with self.assertRaises(IntegrityError):
            AccesCandidatDebloque.objects.create(entreprise=self.entreprise, candidat=self.candidat, source='ACHETE')

    def test_credits_achetes_restants_default_zero(self):
        palier = Palier.objects.get(nom='STARTER')
        abonnement = AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=palier)
        self.assertEqual(abonnement.credits_achetes_restants, 0)
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_credits_models -v 2`
Expected: FAIL — `ImportError: cannot import name 'CreditPack'`

- [ ] **Step 3: Ajouter les modèles**

Dans `taftech_backend/jobs/models.py`, insérer juste après la classe `TelechargementCV` (après la ligne 851, avant `class AIConfig`) :

```python
class CreditPack(models.Model):
    """Pack de crédits CVthèque achetable via Chargily quand le quota mensuel d'un palier
    est épuisé — voir docs/superpowers/specs/2026-08-29-credits-cvtheque-design.md."""
    nom = models.CharField(max_length=50, verbose_name="Nom du pack")
    credits = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    prix_da = models.PositiveIntegerField(verbose_name="Prix (DA)", validators=[MinValueValidator(1)])
    actif = models.BooleanField(default=True, verbose_name="Visible/achetable")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return self.nom


class AccesCandidatDebloque(models.Model):
    """Déblocage permanent d'un candidat CVthèque par une entreprise — 1 crédit dépensé donne
    un accès à vie aux coordonnées + CV de ce candidat, partagé par toute l'équipe. `source`
    indique quel pool (quota mensuel du palier ou pack acheté) a été consommé — sert au calcul
    du quota mensuel restant dans jobs/credits_utils.py. Jamais dupliqué (unique_together) :
    redébloquer un candidat déjà débloqué ne consomme rien (idempotent, voir credits_utils)."""
    SOURCE_CHOICES = [
        ('MENSUEL', 'Quota mensuel du palier'),
        ('ACHETE', 'Pack de crédits acheté'),
    ]
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='candidats_debloques')
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='debloque_par')
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES)
    date_debloque = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('entreprise', 'candidat')
        ordering = ['-date_debloque']

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} → {self.candidat.email} ({self.source})"


class PaiementCreditPack(models.Model):
    """Historique des achats de packs de crédits confirmés — source des factures, même principe
    que PaiementAbonnement : champs dénormalisés (pack_nom/credits/montant_da au moment de
    l'achat), un pack supprimé/modifié plus tard n'altère jamais un paiement déjà enregistré."""
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='paiements_credit_pack')
    pack_nom = models.CharField(max_length=50)
    credits = models.PositiveIntegerField()
    montant_da = models.PositiveIntegerField()
    date_paiement = models.DateTimeField(auto_now_add=True)
    numero_facture = models.CharField(max_length=30, unique=True, editable=False)

    class Meta:
        ordering = ['-date_paiement']

    def save(self, *args, **kwargs):
        if not self.numero_facture:
            from django.utils import timezone
            annee = timezone.now().year
            dernier = PaiementCreditPack.objects.filter(numero_facture__startswith=f"TT-CR-{annee}-").order_by('-id').first()
            prochain_numero = (int(dernier.numero_facture.split('-')[-1]) + 1) if dernier else 1
            self.numero_facture = f"TT-CR-{annee}-{prochain_numero:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero_facture} — {self.entreprise.nom_entreprise}"
```

Note : `numero_facture` utilise le préfixe `TT-CR-` (distinct de `TT-` des paiements de palier) pour ne jamais entrer en collision avec la séquence de `PaiementAbonnement`.

Puis, dans la classe `AbonnementEntreprise` (ligne 769-791), ajouter le champ après `renouvellement_auto` (ligne 781) :

```python
    credits_achetes_restants = models.PositiveIntegerField(default=0, verbose_name="Crédits CVthèque achetés restants")
```

- [ ] **Step 4: Créer la migration des nouveaux modèles**

Run: `cd taftech_backend && python manage.py makemigrations jobs`
Expected: Django génère `jobs/migrations/0096_creditpack_accescandidatdebloque_and_more.py` (ou nom similaire auto-généré). Renommer ce fichier en `0096_credits_models.py` pour rester lisible (le contenu généré par Django est correct tel quel, seul le nom de fichier est cosmétique).

- [ ] **Step 5: Appliquer et relancer le test**

Run:
```bash
python manage.py migrate jobs
python manage.py test jobs.tests.test_credits_models -v 2
```
Expected: PASS

- [ ] **Step 6: Ajouter l'action `DEBLOQUER_CANDIDAT` au journal d'équipe**

Dans `taftech_backend/jobs/models.py`, ajouter dans `EquipeActionLog.ACTIONS` (ligne ~682, avant `('AUTRE', 'Autre')`) :

```python
        ('DEBLOQUER_CANDIDAT', 'Débloquer candidat CVthèque'),
```

Run: `python manage.py makemigrations jobs` (génère une `AlterField` no-op au niveau schéma, même pattern documenté dans CLAUDE.md pour la migration `0056_alter_candidature_statut`) puis `python manage.py migrate jobs`.

- [ ] **Step 7: Créer la migration de seed des packs**

Créer `taftech_backend/jobs/migrations/0097_seed_credit_packs.py` (dépendance sur la migration générée à l'étape 4/6, ajuster le nom exact selon ce que Django a produit) :

```python
from django.db import migrations


PACKS = [
    dict(nom='Pack 10', credits=10, prix_da=2500, ordre=1, actif=True),
    dict(nom='Pack 25', credits=25, prix_da=5500, ordre=2, actif=True),
    dict(nom='Pack 50', credits=50, prix_da=9900, ordre=3, actif=True),
]


def seed_packs(apps, schema_editor):
    CreditPack = apps.get_model('jobs', 'CreditPack')
    for data in PACKS:
        CreditPack.objects.get_or_create(nom=data['nom'], defaults=data)


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0096_credits_models'),
    ]

    operations = [
        migrations.RunPython(seed_packs, reverse_noop),
    ]
```

Ajuster `dependencies` avec le nom réel du fichier de migration produit à l'étape 6 si différent.

- [ ] **Step 8: Appliquer et vérifier le seed**

Run:
```bash
python manage.py migrate jobs
python manage.py shell -c "from jobs.models import CreditPack; print(list(CreditPack.objects.values_list('nom', 'credits', 'prix_da')))"
```
Expected: `[('Pack 10', 10, 2500), ('Pack 25', 25, 5500), ('Pack 50', 50, 9900)]`

- [ ] **Step 9: Lancer la suite complète backend**

Run: `python manage.py test jobs.tests -v 1`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add taftech_backend/jobs/models.py taftech_backend/jobs/migrations/0096_credits_models.py taftech_backend/jobs/migrations/0097_seed_credit_packs.py taftech_backend/jobs/tests/test_credits_models.py
git commit -m "feat: modèles CreditPack, AccesCandidatDebloque, PaiementCreditPack"
```

---

### Task 3: `jobs/credits_utils.py` — logique de consommation des crédits

**Files:**
- Create: `taftech_backend/jobs/credits_utils.py`
- Test: `taftech_backend/jobs/tests/test_credits_utils.py`

**Interfaces:**
- Consumes: `Palier.credits_mois` (Task 1), `AccesCandidatDebloque`/`AbonnementEntreprise.credits_achetes_restants` (Task 2), `jobs.paliers_utils.get_palier_actif(entreprise)`.
- Produces: `credits_disponibles(entreprise) -> {'mensuel_restant': int|None, 'achetes_restant': int}`, `deverrouiller_candidat(entreprise, candidat) -> AccesCandidatDebloque`, `class CreditsEpuisesError(Exception)`. Consommé par Task 4 (`DeverrouillerCandidatAPIView`, `CandidatFichierPriveAPIView`), Task 5 (`CVThequeView`), Task 8 (dashboard).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `taftech_backend/jobs/tests/test_credits_utils.py` :

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, AccesCandidatDebloque
from jobs.credits_utils import credits_disponibles, deverrouiller_candidat, CreditsEpuisesError

User = get_user_model()


def make_entreprise_avec_palier(username, palier_nom):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    palier = Palier.objects.get(nom=palier_nom)
    AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return entreprise


def make_candidat(username):
    return User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="CANDIDAT")


class CreditsDisponiblesTest(TestCase):
    def test_starter_mensuel_restant_egale_credits_mois(self):
        entreprise = make_entreprise_avec_palier("cd_starter", "STARTER")
        result = credits_disponibles(entreprise)
        self.assertEqual(result['mensuel_restant'], 10)
        self.assertEqual(result['achetes_restant'], 0)

    def test_pro_illimite_mensuel_restant_none(self):
        entreprise = make_entreprise_avec_palier("cd_pro", "PRO")
        result = credits_disponibles(entreprise)
        self.assertIsNone(result['mensuel_restant'])

    def test_mensuel_restant_decremente_apres_deblocage(self):
        entreprise = make_entreprise_avec_palier("cd_decr", "STARTER")
        candidat = make_candidat("cd_decr_cand")
        deverrouiller_candidat(entreprise, candidat)
        result = credits_disponibles(entreprise)
        self.assertEqual(result['mensuel_restant'], 9)


class DeverrouillerCandidatTest(TestCase):
    def test_premier_deblocage_consomme_mensuel(self):
        entreprise = make_entreprise_avec_palier("dc_1", "STARTER")
        candidat = make_candidat("dc_1_cand")
        acces = deverrouiller_candidat(entreprise, candidat)
        self.assertEqual(acces.source, 'MENSUEL')

    def test_redeblocage_meme_candidat_idempotent_ne_consomme_rien(self):
        entreprise = make_entreprise_avec_palier("dc_2", "STARTER")
        candidat = make_candidat("dc_2_cand")
        deverrouiller_candidat(entreprise, candidat)
        deverrouiller_candidat(entreprise, candidat)  # 2e appel, ne doit pas planter ni recompter
        self.assertEqual(AccesCandidatDebloque.objects.filter(entreprise=entreprise, candidat=candidat).count(), 1)
        result = credits_disponibles(entreprise)
        self.assertEqual(result['mensuel_restant'], 9)  # un seul déblocage compté

    def test_quota_mensuel_epuise_bascule_sur_achetes(self):
        entreprise = make_entreprise_avec_palier("dc_3", "STARTER")
        entreprise.abonnement.credits_achetes_restants = 5
        entreprise.abonnement.save(update_fields=['credits_achetes_restants'])
        # épuise les 10 crédits mensuels de STARTER
        for i in range(10):
            deverrouiller_candidat(entreprise, make_candidat(f"dc_3_cand_{i}"))
        acces = deverrouiller_candidat(entreprise, make_candidat("dc_3_cand_extra"))
        self.assertEqual(acces.source, 'ACHETE')
        entreprise.abonnement.refresh_from_db()
        self.assertEqual(entreprise.abonnement.credits_achetes_restants, 4)

    def test_aucun_credit_disponible_leve_erreur(self):
        entreprise = make_entreprise_avec_palier("dc_4", "STARTER")
        for i in range(10):
            deverrouiller_candidat(entreprise, make_candidat(f"dc_4_cand_{i}"))
        with self.assertRaises(CreditsEpuisesError):
            deverrouiller_candidat(entreprise, make_candidat("dc_4_cand_extra"))
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_credits_utils -v 2`
Expected: FAIL — `ModuleNotFoundError: No module named 'jobs.credits_utils'`

- [ ] **Step 3: Écrire `jobs/credits_utils.py`**

Créer `taftech_backend/jobs/credits_utils.py` :

```python
"""Helpers de gestion des crédits CVthèque — voir
docs/superpowers/specs/2026-08-29-credits-cvtheque-design.md.

1 crédit débloque coordonnées + CV d'un candidat, à vie, partagé par toute l'équipe de
l'entreprise. Deux pools consommés dans l'ordre : le quota mensuel du palier
(Palier.credits_mois, recompté chaque mois — même principe que quota_cv_atteint avant lui,
jamais un compteur stocké à décrémenter), puis le pool de crédits achetés
(AbonnementEntreprise.credits_achetes_restants, jamais reset, décrémenté à l'usage)."""
from django.db import transaction
from django.utils import timezone

from .paliers_utils import get_palier_actif


class CreditsEpuisesError(Exception):
    """Levée par deverrouiller_candidat() quand ni le quota mensuel ni le pool acheté ne
    peuvent couvrir un nouveau déblocage."""
    pass


def _credits_mensuel_utilises_ce_mois(entreprise):
    from .models import AccesCandidatDebloque
    debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return AccesCandidatDebloque.objects.filter(
        entreprise=entreprise, source='MENSUEL', date_debloque__gte=debut_mois,
    ).count()


def credits_disponibles(entreprise):
    """Retourne {'mensuel_restant': int|None, 'achetes_restant': int}. mensuel_restant est
    None si le palier n'a pas de limite (illimité, même sémantique que credits_mois=None)."""
    palier = get_palier_actif(entreprise)
    abonnement = getattr(entreprise, 'abonnement', None)
    achetes_restant = abonnement.credits_achetes_restants if abonnement else 0
    if palier is None:
        return {'mensuel_restant': 0, 'achetes_restant': achetes_restant}
    if palier.credits_mois is None:
        return {'mensuel_restant': None, 'achetes_restant': achetes_restant}
    utilises = _credits_mensuel_utilises_ce_mois(entreprise)
    return {'mensuel_restant': max(0, palier.credits_mois - utilises), 'achetes_restant': achetes_restant}


@transaction.atomic
def deverrouiller_candidat(entreprise, candidat):
    """Débloque coordonnées+CV d'un candidat pour l'entreprise — idempotent (un candidat déjà
    débloqué ne consomme rien, retourne l'accès existant). Consomme le quota mensuel en
    priorité, puis le pool acheté. Lève CreditsEpuisesError si aucun des deux pools ne peut
    couvrir ce déblocage."""
    from .models import AccesCandidatDebloque

    existant = AccesCandidatDebloque.objects.filter(entreprise=entreprise, candidat=candidat).first()
    if existant:
        return existant

    disponibles = credits_disponibles(entreprise)
    if disponibles['mensuel_restant'] is None or disponibles['mensuel_restant'] > 0:
        return AccesCandidatDebloque.objects.create(entreprise=entreprise, candidat=candidat, source='MENSUEL')

    if disponibles['achetes_restant'] > 0:
        abonnement = entreprise.abonnement
        abonnement.credits_achetes_restants -= 1
        abonnement.save(update_fields=['credits_achetes_restants'])
        return AccesCandidatDebloque.objects.create(entreprise=entreprise, candidat=candidat, source='ACHETE')

    raise CreditsEpuisesError("Aucun crédit disponible.")
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_credits_utils -v 2`
Expected: PASS (5 tests)

- [ ] **Step 5: Lancer la suite complète backend**

Run: `python manage.py test jobs.tests -v 1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add taftech_backend/jobs/credits_utils.py taftech_backend/jobs/tests/test_credits_utils.py
git commit -m "feat: jobs/credits_utils.py — consommation crédits mensuel puis acheté"
```

---

### Task 4: Endpoint de déblocage + téléchargement CV gaté par crédit

**Files:**
- Create: `taftech_backend/jobs/views/credits.py` (contient `DeverrouillerCandidatAPIView`, complété en Task 7 avec les vues admin/publiques)
- Modify: `taftech_backend/jobs/views/__init__.py` (import facade)
- Modify: `taftech_backend/jobs/views/profils.py:350-403` (`CandidatFichierPriveAPIView._acces_autorise`)
- Modify: `taftech_backend/jobs/urls.py` (route + import)
- Test: `taftech_backend/jobs/tests/test_api_credits.py`

**Interfaces:**
- Consumes: `deverrouiller_candidat`, `credits_disponibles`, `CreditsEpuisesError` (Task 3) ; `get_entreprise_for_user`, `get_membre_role`, `_log` (`jobs/views/equipe.py`) ; `get_palier_actif` (`jobs/paliers_utils.py`).
- Produces: route `POST jobs/cvtheque/candidats/<int:candidat_id>/debloquer/` (name=`cvtheque-debloquer`) — 200 `{est_debloque: true, credits_disponibles: {...}}`, 403 `{"code": "PALIER_INSUFFISANT"}`, 403 `{"code": "CREDITS_EPUISES"}`. Consommé par Task 12 (frontend `CVTheque.jsx`).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `taftech_backend/jobs/tests/test_api_credits.py` :

```python
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, ProfilCandidat, AccesCandidatDebloque, MembreEquipe

User = get_user_model()


def make_entreprise(username, palier_nom=None):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    if palier_nom:
        palier = Palier.objects.get(nom=palier_nom)
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


def make_candidat(username):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="CANDIDAT")
    ProfilCandidat.objects.create(user=user, wilaya="16 - Alger", titre_professionnel="Dev")
    return user


class DeverrouillerCandidatAPITest(APITestCase):
    def test_gratuit_refuse_palier_insuffisant(self):
        user, _ = make_entreprise("deb_gratuit")
        candidat = make_candidat("deb_gratuit_cand")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-debloquer", args=[candidat.id]))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "PALIER_INSUFFISANT")

    def test_starter_deblocage_reussi(self):
        user, entreprise = make_entreprise("deb_starter", palier_nom="STARTER")
        candidat = make_candidat("deb_starter_cand")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-debloquer", args=[candidat.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["est_debloque"])
        self.assertTrue(AccesCandidatDebloque.objects.filter(entreprise=entreprise, candidat=candidat).exists())

    def test_credits_epuises_403(self):
        user, entreprise = make_entreprise("deb_epuise", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        for i in range(10):
            c = make_candidat(f"deb_epuise_cand_{i}")
            self.client.post(reverse("cvtheque-debloquer", args=[c.id]))
        extra = make_candidat("deb_epuise_cand_extra")
        response = self.client.post(reverse("cvtheque-debloquer", args=[extra.id]))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "CREDITS_EPUISES")

    def test_invite_bloque(self):
        user, entreprise = make_entreprise("deb_invite", palier_nom="STARTER")
        membre = User.objects.create_user(username="deb_invite_m", email="deb_invite_m@test.dz", password="pwd", role="RECRUTEUR")
        MembreEquipe.objects.create(entreprise=entreprise, user=membre, role="INVITE")
        candidat = make_candidat("deb_invite_cand")
        self.client.force_authenticate(user=membre)
        response = self.client.post(reverse("cvtheque-debloquer", args=[candidat.id]))
        self.assertEqual(response.status_code, 403)


class CandidatFichierPriveCreditsAPITest(APITestCase):
    def test_telechargement_cv_bloque_si_non_debloque(self):
        user, entreprise = make_entreprise("cv_bloque", palier_nom="STARTER")
        candidat = make_candidat("cv_bloque_cand")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("candidat-fichier-prive", args=[candidat.id, "cv"]))
        self.assertEqual(response.status_code, 403)

    def test_telechargement_cv_libre_apres_deblocage(self):
        from jobs.credits_utils import deverrouiller_candidat
        user, entreprise = make_entreprise("cv_ok", palier_nom="STARTER")
        candidat = make_candidat("cv_ok_cand")
        candidat.profil_candidat.cv_pdf.save("test.pdf", __import__("django.core.files.base", fromlist=["ContentFile"]).ContentFile(b"%PDF-1.4"))
        deverrouiller_candidat(entreprise, candidat)
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("candidat-fichier-prive", args=[candidat.id, "cv"]))
        self.assertEqual(response.status_code, 200)
```

Vérifier au préalable le nom exact de la route existante pour `CandidatFichierPriveAPIView` (`name=` dans `urls.py`) — si différent de `candidat-fichier-prive`, ajuster le test en conséquence (`grep CandidatFichierPriveAPIView taftech_backend/jobs/urls.py`).

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_credits -v 2`
Expected: FAIL — `NoReverseMatch: 'cvtheque-debloquer' is not a valid view function or pattern name`

- [ ] **Step 3: Créer `jobs/views/credits.py` avec `DeverrouillerCandidatAPIView`**

Créer `taftech_backend/jobs/views/credits.py` :

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from .equipe import get_entreprise_for_user, get_membre_role, _log
from ..paliers_utils import get_palier_actif
from ..credits_utils import credits_disponibles, deverrouiller_candidat, CreditsEpuisesError
from ..throttles import WriteActionThrottle

User = get_user_model()

_ROLES_ACTION = ('PROPRIETAIRE', 'ADMIN', 'UTILISATEUR')


class DeverrouillerCandidatAPIView(APIView):
    """Débloque coordonnées+CV d'un candidat CVthèque pour l'entreprise, en consommant
    1 crédit — voir docs/superpowers/specs/2026-08-29-credits-cvtheque-design.md."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [WriteActionThrottle]

    def post(self, request, candidat_id):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Accès réservé aux recruteurs."}, status=403)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Action non autorisée pour votre rôle."}, status=403)

        palier = get_palier_actif(entreprise)
        if palier is None:
            return Response(
                {"error": "Le déblocage de profils nécessite un abonnement actif.", "code": "PALIER_INSUFFISANT"},
                status=403,
            )

        try:
            candidat = User.objects.get(id=candidat_id, role='CANDIDAT')
        except User.DoesNotExist:
            return Response({"error": "Candidat introuvable."}, status=404)

        try:
            deverrouiller_candidat(entreprise, candidat)
        except CreditsEpuisesError:
            return Response(
                {"error": "Vous n'avez plus de crédits disponibles ce mois-ci.", "code": "CREDITS_EPUISES"},
                status=403,
            )

        _log(request.user, entreprise, 'DEBLOQUER_CANDIDAT', candidat.email)
        return Response({"est_debloque": True, "credits_disponibles": credits_disponibles(entreprise)})
```

- [ ] **Step 4: Enregistrer la vue dans la façade et les URLs**

Dans `taftech_backend/jobs/views/__init__.py`, ajouter après le bloc `from .paliers_admin import (...)` (ligne 118) :

```python
from .credits import (
    DeverrouillerCandidatAPIView,
)
```

Dans `taftech_backend/jobs/urls.py`, ajouter l'import `DeverrouillerCandidatAPIView` au bloc d'imports existant (près de `CVThequeView`), puis ajouter la route juste après `path('cvtheque/inviter/', ...)` (ligne 139) :

```python
    path('cvtheque/candidats/<int:candidat_id>/debloquer/', DeverrouillerCandidatAPIView.as_view(), name='cvtheque-debloquer'),
```

- [ ] **Step 5: Modifier `CandidatFichierPriveAPIView`**

Dans `taftech_backend/jobs/views/profils.py`, remplacer entièrement le corps de `_acces_autorise` (lignes ~377-403, à partir de `if user.id == profil.user_id...`) et le bloc `get()` qui gérait `via_cvtheque`/`quota_cv_atteint`/`TelechargementCV`. Remplacer :

```python
        acces, via_cvtheque = self._acces_autorise(request.user, profil)
        if not acces:
            return Response({"error": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if type_fichier == 'cv' and via_cvtheque:
            from ..paliers_utils import quota_cv_atteint
            entreprise = get_entreprise_for_user(request.user)
            if quota_cv_atteint(entreprise):
                return Response(
                    {"error": "Quota de téléchargements CV atteint pour ce mois. Passez à un palier supérieur pour un accès illimité.", "code": "QUOTA_CV_ATTEINT"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            from ..models import TelechargementCV
            TelechargementCV.objects.create(entreprise=entreprise, candidat=profil.user)

        return FileResponse(fichier.open('rb'), filename=os.path.basename(fichier.name))

    def _acces_autorise(self, user, profil):
        """Retourne (acces_autorise, via_cvtheque) — `via_cvtheque=True` seulement quand l'accès
        vient de la navigation CVthèque premium (pas d'une vraie candidature reçue) : c'est le
        seul cas compté dans le quota mensuel de téléchargements CV."""
        if user.id == profil.user_id or user.role == 'ADMIN':
            return True, False
        entreprise = get_entreprise_for_user(user)
        if not entreprise:
            return False, False
        if Candidature.objects.filter(candidat_id=profil.user_id, offre__entreprise=entreprise).exists():
            return True, False
        from ..paliers_utils import get_palier_actif
        return get_palier_actif(entreprise) is not None, True
```

par :

```python
        if not self._acces_autorise(request.user, profil):
            return Response({"error": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        return FileResponse(fichier.open('rb'), filename=os.path.basename(fichier.name))

    def _acces_autorise(self, user, profil):
        """Le candidat lui-même, un admin, un recruteur ayant reçu une vraie candidature de ce
        candidat, ou un recruteur ayant débloqué ce profil via un crédit CVthèque
        (AccesCandidatDebloque, acquis à vie — voir jobs/credits_utils.py)."""
        if user.id == profil.user_id or user.role == 'ADMIN':
            return True
        entreprise = get_entreprise_for_user(user)
        if not entreprise:
            return False
        if Candidature.objects.filter(candidat_id=profil.user_id, offre__entreprise=entreprise).exists():
            return True
        from ..models import AccesCandidatDebloque
        return AccesCandidatDebloque.objects.filter(entreprise=entreprise, candidat=profil.user).exists()
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_credits -v 2`
Expected: PASS (5 tests)

- [ ] **Step 7: Lancer la suite complète backend**

Run: `python manage.py test jobs.tests jobs.tests.test_credits_utils -v 1`
Expected: PASS — vérifier en particulier qu'aucun test existant ne référence encore `quota_cv_atteint`/`TelechargementCV`/`QUOTA_CV_ATTEINT` (confirmé absent lors de l'exploration initiale, mais relancer la suite complète pour s'en assurer après ce changement).

- [ ] **Step 8: Commit**

```bash
git add taftech_backend/jobs/views/credits.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/views/profils.py taftech_backend/jobs/urls.py taftech_backend/jobs/tests/test_api_credits.py
git commit -m "feat: endpoint de déblocage candidat CVthèque + téléchargement CV gaté par crédit"
```

---

### Task 5: `CVThequeView` — masquage par crédit individuel

**Files:**
- Modify: `taftech_backend/jobs/serializers/profils.py:28-84` (`ProfilCandidatDTO`)
- Modify: `taftech_backend/jobs/views/recruteur.py:748-830` (`CVThequeView.get`)
- Modify: `taftech_backend/jobs/tests/test_api_paliers_gating.py:101-117` (2 tests à réécrire)
- Test: `taftech_backend/jobs/tests/test_api_cvtheque_credits.py`

**Interfaces:**
- Consumes: `credits_disponibles` (Task 3).
- Produces: `ProfilCandidatDTO` expose `est_debloque` (bool) en plus des champs existants ; `CVThequeView` réponse inclut `credits_disponibles: {mensuel_restant, achetes_restant}` à la place de `is_premium`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `taftech_backend/jobs/tests/test_api_cvtheque_credits.py` :

```python
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, ProfilCandidat
from jobs.credits_utils import deverrouiller_candidat

User = get_user_model()


def make_entreprise(username, palier_nom=None):
    user = User.objects.create_user(
        username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR",
        consentement_cvtheque=True,
    )
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    if palier_nom:
        palier = Palier.objects.get(nom=palier_nom)
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


class CVThequeCreditsMaskingAPITest(APITestCase):
    def setUp(self):
        self.cand = User.objects.create_user(username="cvc_cand", email="cvc_cand@test.dz", password="pwd", role="CANDIDAT")
        ProfilCandidat.objects.create(user=self.cand, wilaya="16 - Alger", titre_professionnel="Dev")

    def test_candidat_non_debloque_coordonnees_masquees(self):
        user, entreprise = make_entreprise("cvc_starter", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertEqual(response.status_code, 200)
        row = response.data["results"][0]
        self.assertFalse(row["est_debloque"])
        self.assertIsNone(row.get("email"))

    def test_candidat_debloque_coordonnees_visibles(self):
        user, entreprise = make_entreprise("cvc_pro", palier_nom="PRO")
        deverrouiller_candidat(entreprise, self.cand)
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        row = response.data["results"][0]
        self.assertTrue(row["est_debloque"])
        self.assertEqual(row["email"], self.cand.email)

    def test_reponse_inclut_credits_disponibles(self):
        user, entreprise = make_entreprise("cvc_credits", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertIn("credits_disponibles", response.data)
        self.assertEqual(response.data["credits_disponibles"]["mensuel_restant"], 10)
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_cvtheque_credits -v 2`
Expected: FAIL — `KeyError: 'est_debloque'`

- [ ] **Step 3: Modifier `ProfilCandidatDTO`**

Dans `taftech_backend/jobs/serializers/profils.py`, dans la classe `ProfilCandidatDTO` :

Ajouter le champ (près des autres `SerializerMethodField`, ligne ~35) :

```python
    est_debloque = serializers.SerializerMethodField()
```

Ajouter `'est_debloque'` à la liste `fields` du `Meta` (après `'user_id'`).

Remplacer la méthode `_is_premium` :

```python
    def _is_premium(self):
        return self.context.get('is_premium', False)
```

par :

```python
    def _peut_voir_coordonnees(self, obj):
        """True si ce candidat précis est débloqué pour l'entreprise du contexte
        ('unlocked_ids', calculé une fois par la vue) — ou repli sur l'ancien flag
        'is_premium' pour les appelants hors CVthèque (ex: le candidat consultant son
        propre profil, toujours is_premium=True)."""
        unlocked_ids = self.context.get('unlocked_ids')
        if unlocked_ids is not None:
            return obj.user_id in unlocked_ids
        return self.context.get('is_premium', False)

    def get_est_debloque(self, obj):
        return self._peut_voir_coordonnees(obj)
```

Puis mettre à jour les 4 méthodes qui appelaient `self._is_premium()` sans argument :

```python
    def get_email(self, obj): return obj.user.email if self._is_premium() else None
    def get_telephone(self, obj): return obj.user.telephone if self._is_premium() else None
```

et plus bas :

```python
    def get_linkedin(self, obj):
        p = obj
        val = getattr(p, 'linkedin', None)
        return val if self._is_premium() else None

    def get_github(self, obj):
        p = obj
        val = getattr(p, 'github', None)
        return val if self._is_premium() else None
```

remplacer chaque `self._is_premium()` par `self._peut_voir_coordonnees(obj)` dans ces 4 méthodes.

- [ ] **Step 4: Modifier `CVThequeView.get`**

Dans `taftech_backend/jobs/views/recruteur.py`, ajouter l'import en haut du fichier (près des autres imports `..credits_utils` n'existe pas encore comme import de tête — l'ajouter à côté de `from ..matcher import calculer_score_matching`, ligne 31) :

```python
from ..credits_utils import credits_disponibles
```

Puis, dans la branche `offre_id` (autour des lignes 756-802), remplacer :

```python
            from ..paliers_utils import get_palier_actif
            palier = get_palier_actif(entreprise_user)
            if palier is None:
                return Response({"error": "Accès réservé aux recruteurs avec un abonnement actif.", "is_premium": False}, status=403)
            if not palier.acces_ia_recommandes:
                return Response({"error": "Le classement par compatibilité IA nécessite le palier Pro ou supérieur.", "is_premium": False}, status=403)
            is_premium = palier.acces_coordonnees
            # Pagination manuelle
            page_size = 10
            page = int(request.GET.get('page', 1))
            total = len(scored)
            start = (page - 1) * page_size
            end = start + page_size
            page_items = scored[start:end]
            profils_page = [p for p, _ in page_items]
            scores_map = {p.user.id: s for p, s in page_items}
            serializer = ProfilCandidatDTO(profils_page, many=True, context={'recruteur': request.user, 'is_premium': is_premium})
            results = serializer.data
```

par :

```python
            from ..paliers_utils import get_palier_actif
            palier = get_palier_actif(entreprise_user)
            if palier is None:
                return Response({"error": "Accès réservé aux recruteurs avec un abonnement actif."}, status=403)
            if not palier.acces_ia_recommandes:
                return Response({"error": "Le classement par compatibilité IA nécessite le palier Pro ou supérieur."}, status=403)
            # Pagination manuelle
            page_size = 10
            page = int(request.GET.get('page', 1))
            total = len(scored)
            start = (page - 1) * page_size
            end = start + page_size
            page_items = scored[start:end]
            profils_page = [p for p, _ in page_items]
            scores_map = {p.user.id: s for p, s in page_items}
            from ..models import AccesCandidatDebloque
            unlocked_ids = set(AccesCandidatDebloque.objects.filter(
                entreprise=entreprise_user, candidat_id__in=[p.user_id for p in profils_page],
            ).values_list('candidat_id', flat=True))
            serializer = ProfilCandidatDTO(profils_page, many=True, context={'recruteur': request.user, 'unlocked_ids': unlocked_ids})
            results = serializer.data
```

Et plus bas dans la même branche, remplacer :

```python
            return Response({
                'count': total,
                'next': None,
                'previous': None,
                'results': results,
                'is_premium': is_premium,
                'recherche_avancee': _recherche_avancee_ok,
            })
```

par :

```python
            return Response({
                'count': total,
                'next': None,
                'previous': None,
                'results': results,
                'credits_disponibles': credits_disponibles(entreprise_user),
                'recherche_avancee': _recherche_avancee_ok,
            })
```

Puis, dans la branche standard (fin de méthode, lignes 819-830), remplacer :

```python
        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(entreprise_user)
        if palier is None:
            return Response({"error": "Accès réservé aux recruteurs avec un abonnement actif.", "is_premium": False}, status=403)
        is_premium = palier.acces_coordonnees
        paginator = CVthequePagination()
        result_page = paginator.paginate_queryset(candidats, request)
        serializer = ProfilCandidatDTO(result_page, many=True, context={'recruteur': request.user, 'is_premium': is_premium})
        response = paginator.get_paginated_response(serializer.data)
        response.data['is_premium'] = is_premium
        response.data['recherche_avancee'] = _recherche_avancee_ok
        return response
```

par :

```python
        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(entreprise_user)
        if palier is None:
            return Response({"error": "Accès réservé aux recruteurs avec un abonnement actif."}, status=403)
        paginator = CVthequePagination()
        result_page = paginator.paginate_queryset(candidats, request)
        from ..models import AccesCandidatDebloque
        unlocked_ids = set(AccesCandidatDebloque.objects.filter(
            entreprise=entreprise_user, candidat_id__in=[p.user_id for p in result_page],
        ).values_list('candidat_id', flat=True))
        serializer = ProfilCandidatDTO(result_page, many=True, context={'recruteur': request.user, 'unlocked_ids': unlocked_ids})
        response = paginator.get_paginated_response(serializer.data)
        response.data['credits_disponibles'] = credits_disponibles(entreprise_user)
        response.data['recherche_avancee'] = _recherche_avancee_ok
        return response
```

- [ ] **Step 5: Lancer le nouveau test pour vérifier qu'il passe**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_cvtheque_credits -v 2`
Expected: PASS (3 tests)

- [ ] **Step 6: Réécrire les 2 tests cassés dans `test_api_paliers_gating.py`**

Dans `taftech_backend/jobs/tests/test_api_paliers_gating.py`, remplacer la classe `CVThequeGatingAPITest` (lignes 87-117) :

```python
class CVThequeGatingAPITest(APITestCase):
    def setUp(self):
        self.cand = User.objects.create_user(
            username="cvg_cand", email="cvg_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        from jobs.models import ProfilCandidat
        ProfilCandidat.objects.create(user=self.cand, wilaya="16 - Alger", titre_professionnel="Dev")

    def test_gratuit_bloque_entierement(self):
        user, _ = make_entreprise("cvg_gratuit")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertEqual(response.status_code, 403)

    def test_starter_acces_mais_coordonnees_masquees(self):
        user, _ = make_entreprise("cvg_starter", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertEqual(response.status_code, 200)
        candidat_row = response.data["results"][0]
        self.assertFalse(candidat_row["est_debloque"])
        self.assertIsNone(candidat_row.get("email"))

    def test_pro_acces_mais_coordonnees_masquees_sans_deblocage(self):
        user, entreprise = make_entreprise("cvg_pro", palier_nom="PRO")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertEqual(response.status_code, 200)
        candidat_row = response.data["results"][0]
        # Un palier Pro donne accès à la CVthèque mais ne débloque plus les coordonnées
        # automatiquement — il faut dépenser un crédit (voir test_api_cvtheque_credits.py).
        self.assertFalse(candidat_row["est_debloque"])
        self.assertIsNone(candidat_row.get("email"))
```

- [ ] **Step 7: Lancer la suite complète backend**

Run: `cd taftech_backend && python manage.py test jobs.tests -v 1`
Expected: PASS

- [ ] **Step 8: Vérifier `python manage.py check`**

Run: `python manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 9: Commit**

```bash
git add taftech_backend/jobs/serializers/profils.py taftech_backend/jobs/views/recruteur.py taftech_backend/jobs/tests/test_api_paliers_gating.py taftech_backend/jobs/tests/test_api_cvtheque_credits.py
git commit -m "feat: CVThequeView masque les coordonnées par crédit individuel (est_debloque)"
```

---

### Task 6: Achat de packs de crédits — Chargily

**Files:**
- Modify: `taftech_backend/jobs/views/credits.py` (ajouter `CreditPackCheckoutAPIView`)
- Modify: `taftech_backend/jobs/views/recruteur.py:1229-1307` (`ChargilyWebhookAPIView`)
- Modify: `taftech_backend/jobs/views/__init__.py`
- Modify: `taftech_backend/jobs/urls.py`
- Test: `taftech_backend/jobs/tests/test_api_credit_pack_checkout.py`

**Interfaces:**
- Consumes: `CreditPack`, `PaiementCreditPack`, `AbonnementEntreprise.credits_achetes_restants` (Task 2).
- Produces: route `POST jobs/credit-packs/checkout/` (name=`credit-pack-checkout`) ; webhook Chargily reconnaît `metadata.pack_id`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `taftech_backend/jobs/tests/test_api_credit_pack_checkout.py` :

```python
import hmac
import hashlib
import json
from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, CreditPack, PaiementCreditPack

User = get_user_model()


def make_entreprise(username, palier_nom="STARTER"):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    palier = Palier.objects.get(nom=palier_nom)
    AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


@override_settings(CHARGILY_API_KEY="test_api_key", CHARGILY_SECRET_KEY="test_secret")
class CreditPackCheckoutAPITest(APITestCase):
    def test_checkout_pack_inexistant_404(self):
        user, _ = make_entreprise("ckt_404")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("credit-pack-checkout"), {"pack_id": 99999})
        self.assertEqual(response.status_code, 404)


@override_settings(CHARGILY_SECRET_KEY="test_secret")
class ChargilyWebhookPackAPITest(APITestCase):
    def test_webhook_pack_credite_le_pool_achete(self):
        user, entreprise = make_entreprise("wh_pack")
        pack = CreditPack.objects.create(nom="Pack 10", credits=10, prix_da=2500, ordre=1)
        payload = {
            "type": "checkout.paid",
            "data": {"metadata": {"pack_id": str(pack.id), "entreprise_id": str(entreprise.id)}},
        }
        body = json.dumps(payload).encode("utf-8")
        signature = hmac.new(b"test_secret", body, hashlib.sha256).hexdigest()
        response = self.client.post(
            reverse("chargily-webhook"), data=body, content_type="application/json",
            HTTP_SIGNATURE=signature,
        )
        self.assertEqual(response.status_code, 200)
        entreprise.abonnement.refresh_from_db()
        self.assertEqual(entreprise.abonnement.credits_achetes_restants, 10)
        self.assertTrue(PaiementCreditPack.objects.filter(entreprise=entreprise, pack_nom="Pack 10").exists())

    def test_webhook_pack_signature_invalide_rejetee(self):
        _, entreprise = make_entreprise("wh_pack_bad")
        pack = CreditPack.objects.create(nom="Pack 25", credits=25, prix_da=5500, ordre=2)
        payload = {"type": "checkout.paid", "data": {"metadata": {"pack_id": str(pack.id), "entreprise_id": str(entreprise.id)}}}
        response = self.client.post(
            reverse("chargily-webhook"), data=json.dumps(payload).encode("utf-8"),
            content_type="application/json", HTTP_SIGNATURE="signature_invalide",
        )
        self.assertEqual(response.status_code, 400)
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_credit_pack_checkout -v 2`
Expected: FAIL — `NoReverseMatch: 'credit-pack-checkout' is not a valid view function or pattern name`

- [ ] **Step 3: Ajouter `CreditPackCheckoutAPIView`**

Dans `taftech_backend/jobs/views/credits.py`, ajouter en fin de fichier :

```python
import hashlib
import hmac
import requests as http_requests
from django.conf import settings


class CreditPackCheckoutAPIView(APIView):
    """Crée une session de paiement Chargily pour un pack de crédits — même mécanisme que
    ChargilyCheckoutPalierAPIView, discriminé côté webhook par metadata.pack_id."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Accès réservé aux recruteurs."}, status=403)
        if get_membre_role(request.user, entreprise) != 'PROPRIETAIRE':
            return Response({"error": "Seul le propriétaire peut acheter des crédits."}, status=403)

        from ..models import CreditPack
        try:
            pack = CreditPack.objects.get(id=request.data.get('pack_id'), actif=True)
        except (CreditPack.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Pack introuvable."}, status=404)

        payload = {
            "items": [{"price": pack.prix_da, "quantity": 1, "name": pack.nom}],
            "success_url": f"{settings.SITE_URL}/recruteurs/abonnements?paid=1",
            "failure_url": f"{settings.SITE_URL}/recruteurs/abonnements?paid=0",
            "metadata": {"pack_id": str(pack.id), "entreprise_id": str(entreprise.id), "user_id": str(request.user.id)},
        }
        response = http_requests.post(
            "https://pay.chargily.net/test/api/v2/checkouts",
            json=payload,
            headers={"Authorization": f"Bearer {settings.CHARGILY_API_KEY}"},
            timeout=15,
        )
        if response.status_code not in (200, 201):
            return Response({"error": "Erreur lors de la création du paiement."}, status=502)
        return Response({"checkout_url": response.json().get("checkout_url")})
```

- [ ] **Step 4: Enregistrer la vue et la route**

Dans `taftech_backend/jobs/views/__init__.py`, modifier le bloc ajouté à la Task 4 :

```python
from .credits import (
    DeverrouillerCandidatAPIView,
    CreditPackCheckoutAPIView,
)
```

Dans `taftech_backend/jobs/urls.py`, ajouter à côté de `path('paliers/chargily/checkout/', ...)` (ligne 177) :

```python
    path('credit-packs/checkout/', CreditPackCheckoutAPIView.as_view(), name='credit-pack-checkout'),
```

(Import `CreditPackCheckoutAPIView` ajouté au même bloc que `DeverrouillerCandidatAPIView`.)

- [ ] **Step 5: Ajouter la branche `pack_id` au webhook Chargily**

Dans `taftech_backend/jobs/views/recruteur.py`, dans `ChargilyWebhookAPIView.post`, juste après la ligne qui extrait `metadata` et `entreprise_id` (avant le bloc `palier_nom = metadata.get('palier_nom')`), insérer :

```python
        pack_id = metadata.get('pack_id')
        if pack_id:
            from ..models import CreditPack, PaiementCreditPack
            try:
                pack = CreditPack.objects.get(id=pack_id)
            except CreditPack.DoesNotExist:
                return Response({'error': 'Pack introuvable.'}, status=404)
            abonnement = getattr(entreprise, 'abonnement', None)
            if abonnement is None:
                return Response({'error': "L'entreprise n'a pas d'abonnement actif."}, status=400)
            abonnement.credits_achetes_restants += pack.credits
            abonnement.save(update_fields=['credits_achetes_restants'])
            PaiementCreditPack.objects.create(
                entreprise=entreprise, pack_nom=pack.nom, credits=pack.credits, montant_da=pack.prix_da,
            )
            AuditLog.objects.create(
                admin=None, action='AUTRE',
                detail=f"Paiement Chargily pack crédits {pack.nom} ({pack.credits} crédits) — {entreprise.nom_entreprise}",
            )
            return Response({'status': 'ok'}, status=200)

```

Cette branche s'insère juste après la résolution de `entreprise` (qui reste commune aux deux flux palier/pack) et avant `palier_nom = metadata.get('palier_nom')`, en aval de la vérification de signature HMAC déjà en place (inchangée).

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_credit_pack_checkout -v 2`
Expected: PASS (3 tests)

- [ ] **Step 7: Lancer la suite complète backend**

Run: `python manage.py test jobs.tests -v 1`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add taftech_backend/jobs/views/credits.py taftech_backend/jobs/views/recruteur.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/urls.py taftech_backend/jobs/tests/test_api_credit_pack_checkout.py
git commit -m "feat: achat de packs de crédits via Chargily"
```

---

### Task 7: CRUD admin des packs de crédits

**Files:**
- Create: `taftech_backend/jobs/serializers/credits.py`
- Modify: `taftech_backend/jobs/serializers/__init__.py`
- Modify: `taftech_backend/jobs/views/credits.py` (ajouter `CreditPackPublicAPIView`, `CreditPackAdminAPIView`)
- Modify: `taftech_backend/jobs/views/__init__.py`
- Modify: `taftech_backend/jobs/urls.py`
- Test: `taftech_backend/jobs/tests/test_api_credit_packs_admin.py`

**Interfaces:**
- Produces: route publique `GET jobs/credit-packs/` (name=`credit-packs-public`), routes admin `GET/POST jobs/admin/credit-packs/` + `PUT/DELETE jobs/admin/credit-packs/<int:pk>/` (names=`admin-credit-packs`, `admin-credit-pack-detail`). Consommé par Task 9 (services frontend), Task 10 (`AdminCreditPacks.jsx`), Task 11 (`AbonnementsPage.jsx`).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `taftech_backend/jobs/tests/test_api_credit_packs_admin.py` :

```python
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import CreditPack

User = get_user_model()


class CreditPacksPublicAPITest(APITestCase):
    def test_liste_publique_ne_retourne_que_les_actifs(self):
        CreditPack.objects.create(nom="Actif", credits=10, prix_da=2500, actif=True, ordre=1)
        CreditPack.objects.create(nom="Inactif", credits=5, prix_da=1500, actif=False, ordre=2)
        response = self.client.get(reverse("credit-packs-public"))
        self.assertEqual(response.status_code, 200)
        noms = [p["nom"] for p in response.data]
        self.assertIn("Actif", noms)
        self.assertNotIn("Inactif", noms)


class CreditPacksAdminAPITest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="cpa_admin", email="cpa_admin@test.dz", password="pwd", role="ADMIN", is_staff=True)
        self.recruteur = User.objects.create_user(username="cpa_recr", email="cpa_recr@test.dz", password="pwd", role="RECRUTEUR")

    def test_non_admin_refuse(self):
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get(reverse("admin-credit-packs"))
        self.assertEqual(response.status_code, 403)

    def test_admin_crud_complet(self):
        self.client.force_authenticate(user=self.admin)
        r1 = self.client.post(reverse("admin-credit-packs"), {"nom": "Pack 100", "credits": 100, "prix_da": 18000, "ordre": 4, "actif": True})
        self.assertEqual(r1.status_code, 201)
        pack_id = r1.data["id"]

        r2 = self.client.put(reverse("admin-credit-pack-detail", args=[pack_id]), {"prix_da": 17500})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data["prix_da"], 17500)

        r3 = self.client.delete(reverse("admin-credit-pack-detail", args=[pack_id]))
        self.assertEqual(r3.status_code, 200)
        self.assertFalse(CreditPack.objects.filter(id=pack_id).exists())
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_credit_packs_admin -v 2`
Expected: FAIL — `NoReverseMatch: 'credit-packs-public' is not a valid view function or pattern name`

- [ ] **Step 3: Créer le serializer**

Créer `taftech_backend/jobs/serializers/credits.py` :

```python
from rest_framework import serializers
from ..models import CreditPack


class CreditPackSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditPack
        fields = ['id', 'nom', 'credits', 'prix_da', 'actif', 'ordre']
```

Dans `taftech_backend/jobs/serializers/__init__.py`, ajouter après `from .paliers import PalierSerializer` (ligne 39) :

```python
from .credits import CreditPackSerializer
```

- [ ] **Step 4: Ajouter les vues CRUD**

Dans `taftech_backend/jobs/views/credits.py`, ajouter en tête les imports manquants et les deux classes en fin de fichier :

```python
from rest_framework.permissions import IsAdminUser, AllowAny
from django.core.cache import cache
from ..throttles import PublicReadThrottle
from ..serializers import CreditPackSerializer

CACHE_CREDIT_PACKS = 'jobs_credit_packs'


class CreditPackPublicAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        cached = cache.get(CACHE_CREDIT_PACKS)
        if cached is not None:
            return Response(cached)
        from ..models import CreditPack
        packs = CreditPack.objects.filter(actif=True)
        data = CreditPackSerializer(packs, many=True).data
        cache.set(CACHE_CREDIT_PACKS, data, timeout=3600)
        return Response(data)


class CreditPackAdminAPIView(APIView):
    """CRUD admin des packs de crédits CVthèque — même pattern que PaliersAdminAPIView."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        from ..models import CreditPack
        packs = CreditPack.objects.all()
        return Response(CreditPackSerializer(packs, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = CreditPackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_CREDIT_PACKS)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        from ..models import CreditPack
        try:
            pack = CreditPack.objects.get(pk=pk)
        except CreditPack.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = CreditPackSerializer(pack, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_CREDIT_PACKS)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        from ..models import CreditPack
        try:
            CreditPack.objects.get(pk=pk).delete()
            cache.delete(CACHE_CREDIT_PACKS)
            return Response({'message': 'Supprimé.'})
        except CreditPack.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
```

- [ ] **Step 5: Enregistrer les vues et les routes**

Dans `taftech_backend/jobs/views/__init__.py`, compléter le bloc :

```python
from .credits import (
    DeverrouillerCandidatAPIView,
    CreditPackCheckoutAPIView,
    CreditPackPublicAPIView,
    CreditPackAdminAPIView,
)
```

Dans `taftech_backend/jobs/urls.py`, ajouter (import complété au même bloc), près de `path('paliers/', PaliersPublicAPIView.as_view(), name='paliers-public'),` (ligne 197) :

```python
    path('credit-packs/', CreditPackPublicAPIView.as_view(), name='credit-packs-public'),
    path('admin/credit-packs/', CreditPackAdminAPIView.as_view(), name='admin-credit-packs'),
    path('admin/credit-packs/<int:pk>/', CreditPackAdminAPIView.as_view(), name='admin-credit-pack-detail'),
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_credit_packs_admin -v 2`
Expected: PASS (3 tests)

- [ ] **Step 7: Lancer la suite complète backend + check**

Run:
```bash
python manage.py test jobs.tests -v 1
python manage.py check
```
Expected: PASS, `System check identified no issues`.

- [ ] **Step 8: Commit**

```bash
git add taftech_backend/jobs/serializers/credits.py taftech_backend/jobs/serializers/__init__.py taftech_backend/jobs/views/credits.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/urls.py taftech_backend/jobs/tests/test_api_credit_packs_admin.py
git commit -m "feat: CRUD admin des packs de crédits CVthèque"
```

---

### Task 8: Dashboard recruteur — exposer les crédits disponibles

**Files:**
- Modify: `taftech_backend/jobs/views/recruteur.py:140-158` (`DashboardRecruteurAPIView.get`)
- Test: `taftech_backend/jobs/tests/test_api_dashboard_credits.py`

**Interfaces:**
- Consumes: `credits_disponibles` (Task 3).
- Produces: `DashboardRecruteurAPIView` réponse inclut `credits_mensuel_restant`, `credits_achetes_restant`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `taftech_backend/jobs/tests/test_api_dashboard_credits.py` :

```python
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise

User = get_user_model()


class DashboardCreditsAPITest(APITestCase):
    def test_dashboard_expose_credits(self):
        user = User.objects.create_user(username="dc_dash", email="dc_dash@test.dz", password="pwd", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(
            user=user, nom_entreprise="Co Dash", secteur_activite="IT",
            wilaya_siege="16 - Alger", registre_commerce="RC-DASH", est_approuvee=True,
        )
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=Palier.objects.get(nom="STARTER"))
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-recruteur"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["credits_mensuel_restant"], 10)
        self.assertEqual(response.data["credits_achetes_restant"], 0)
```

Vérifier le nom exact de la route du dashboard recruteur (`grep DashboardRecruteurAPIView taftech_backend/jobs/urls.py`) avant de lancer — l'utiliser tel quel dans `reverse(...)` s'il diffère de `dashboard-recruteur`.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_dashboard_credits -v 2`
Expected: FAIL — `KeyError: 'credits_mensuel_restant'`

- [ ] **Step 3: Modifier `DashboardRecruteurAPIView.get`**

Dans `taftech_backend/jobs/views/recruteur.py`, remplacer (lignes 143-157) :

```python
        palier = get_palier_actif(entreprise)
        abonnement = getattr(entreprise, 'abonnement', None)
        data = {
            "entreprise": EntrepriseDashboardDetailSerializer(entreprise).data,
            "offres": OffreDashboardDTO(offres, many=True).data,
            "membre_role": mon_role,
            "palier_actif": palier.nom if palier else None,
            "palier_expiration": abonnement.date_expiration.strftime('%d/%m/%Y') if (abonnement and abonnement.date_expiration) else None,
            "acces_equipe": bool(palier and palier.acces_equipe),
            "acces_ia_recommandes": bool(palier and palier.acces_ia_recommandes),
            "acces_ia_avancee": bool(palier and palier.acces_ia_avancee),
            "acces_coordonnees": bool(palier and palier.acces_coordonnees),
            "kpis": kpis,
            "periode": {"date_debut": date_debut.isoformat(), "date_fin": date_fin.isoformat()},
        }
        return Response(data, status=status.HTTP_200_OK)
```

par :

```python
        palier = get_palier_actif(entreprise)
        abonnement = getattr(entreprise, 'abonnement', None)
        from ..credits_utils import credits_disponibles
        _credits = credits_disponibles(entreprise)
        data = {
            "entreprise": EntrepriseDashboardDetailSerializer(entreprise).data,
            "offres": OffreDashboardDTO(offres, many=True).data,
            "membre_role": mon_role,
            "palier_actif": palier.nom if palier else None,
            "palier_expiration": abonnement.date_expiration.strftime('%d/%m/%Y') if (abonnement and abonnement.date_expiration) else None,
            "acces_equipe": bool(palier and palier.acces_equipe),
            "acces_ia_recommandes": bool(palier and palier.acces_ia_recommandes),
            "acces_ia_avancee": bool(palier and palier.acces_ia_avancee),
            "acces_coordonnees": bool(palier and palier.acces_coordonnees),
            "credits_mensuel_restant": _credits['mensuel_restant'],
            "credits_achetes_restant": _credits['achetes_restant'],
            "kpis": kpis,
            "periode": {"date_debut": date_debut.isoformat(), "date_fin": date_fin.isoformat()},
        }
        return Response(data, status=status.HTTP_200_OK)
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `cd taftech_backend && python manage.py test jobs.tests.test_api_dashboard_credits -v 2`
Expected: PASS

- [ ] **Step 5: Lancer la suite complète backend**

Run: `python manage.py test jobs.tests -v 1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add taftech_backend/jobs/views/recruteur.py taftech_backend/jobs/tests/test_api_dashboard_credits.py
git commit -m "feat: dashboard recruteur expose les crédits CVthèque disponibles"
```

---

### Task 9: Services frontend — crédits

**Files:**
- Modify: `taftech_frontend/src/Services/adminService.js`
- Modify: `taftech_frontend/src/Services/recruteurService.js`
- Modify: `taftech_frontend/src/Services/jobsService.js`

**Interfaces:**
- Produces: `adminService.getAdminCreditPacks()`, `createCreditPack(data)`, `updateCreditPack(id, data)`, `deleteCreditPack(id)` ; `recruteurService.deverrouillerCandidat(candidatId)` ; `jobsService.getCreditPacks()` (cachée), `jobsService.checkoutCreditPack(packId)`. Consommé par Task 10, 11, 12.

- [ ] **Step 1: Ajouter les méthodes admin**

Dans `taftech_frontend/src/Services/adminService.js`, ajouter après le bloc `deleteFaqItem` (même fichier que celui contenant les méthodes FAQ, lignes 314-352 de la section explorée) :

```js
  getAdminCreditPacks: async () => {
    try {
      const response = await api.get("jobs/admin/credit-packs/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_CREDIT_PACKS", err);
      throw err;
    }
  },

  createCreditPack: async (data) => {
    try {
      const response = await api.post("jobs/admin/credit-packs/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_CREDIT_PACK", err);
      throw err;
    }
  },

  updateCreditPack: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/credit-packs/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_CREDIT_PACK", err);
      throw err;
    }
  },

  deleteCreditPack: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/credit-packs/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_CREDIT_PACK", err);
      throw err;
    }
  },
```

- [ ] **Step 2: Ajouter la méthode de déblocage recruteur**

Dans `taftech_frontend/src/Services/recruteurService.js`, ajouter à côté de `toggleFavoriCV`/`inviterCandidatCVTheque` (lignes ~345-355) :

```js
  deverrouillerCandidat: async (candidatId) => {
    try {
      const response = await api.post(`jobs/cvtheque/candidats/${candidatId}/debloquer/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DEVERROUILLER_CANDIDAT", err);
      throw err;
    }
  },
```

- [ ] **Step 3: Ajouter les méthodes publiques dans `jobsService.js`**

Dans `taftech_frontend/src/Services/jobsService.js`, ajouter dans l'objet `offresPubliquesService` (celui exporté puis spread dans la façade), juste après `getPaliers` (lignes 154-167), une variable de cache module-level et deux méthodes :

D'abord, ajouter la variable de cache en haut du fichier, à côté de `let _paliersCache = null;` (ligne 12) :

```js
let _creditPacksCache = null;
```

Puis, après le bloc `getPaliers` (avant `// Entreprises mises en avant...`, ligne 169) :

```js
  // Packs de crédits CVthèque (achat quand le quota mensuel est épuisé).
  getCreditPacks: async () => {
    if (!_creditPacksCache) {
      _creditPacksCache = api
        .get("jobs/credit-packs/")
        .then((response) => response.data)
        .catch((err) => {
          _creditPacksCache = null;
          reportError("ECHEC_GET_CREDIT_PACKS_API", err);
          throw err;
        });
    }
    return _creditPacksCache;
  },

  checkoutCreditPack: async (packId) => {
    try {
      const response = await api.post("jobs/credit-packs/checkout/", { pack_id: packId });
      return response.data;
    } catch (err) {
      reportError("ECHEC_CHECKOUT_CREDIT_PACK", err);
      throw err;
    }
  },
```

- [ ] **Step 4: Vérifier le build**

Run: `cd taftech_frontend && npx vite build`
Expected: build propre, aucune erreur d'import.

- [ ] **Step 5: Commit**

```bash
git add taftech_frontend/src/Services/adminService.js taftech_frontend/src/Services/recruteurService.js taftech_frontend/src/Services/jobsService.js
git commit -m "feat: services frontend pour les crédits CVthèque"
```

---

### Task 10: Panel admin `AdminCreditPacks.jsx`

**Files:**
- Create: `taftech_frontend/src/Pages/Admin/AdminCreditPacks.jsx`
- Create: `taftech_frontend/tests/AdminCreditPacks.test.jsx`
- Modify: `taftech_frontend/src/App.jsx`
- Modify: `taftech_frontend/src/Pages/Admin/AdminLayout.jsx:68-79`

**Interfaces:**
- Consumes: `jobsService.getAdminCreditPacks/createCreditPack/updateCreditPack/deleteCreditPack` (Task 9).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `taftech_frontend/tests/AdminCreditPacks.test.jsx` (mirroir direct de `AdminFaq.test.jsx` — s'en inspirer pour le style des mocks/assertions si ce fichier existe ; sinon, structure minimale ci-dessous) :

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminCreditPacks from "../src/Pages/Admin/AdminCreditPacks";
import { jobsService } from "../src/Services/jobsService";
import { ConfirmModalHost } from "../src/utils/confirmToast";

vi.mock("../src/Services/jobsService");

describe("AdminCreditPacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobsService.getAdminCreditPacks.mockResolvedValue([
      { id: 1, nom: "Pack 10", credits: 10, prix_da: 2500, actif: true, ordre: 1 },
    ]);
  });

  it("HP1: affiche la liste des packs", async () => {
    render(<AdminCreditPacks />);
    await waitFor(() => expect(screen.getByText("Pack 10")).toBeInTheDocument());
    expect(screen.getByText("2500 DA")).toBeInTheDocument();
  });

  it("HP2: crée un nouveau pack", async () => {
    jobsService.createCreditPack.mockResolvedValue({ id: 2, nom: "Pack 100", credits: 100, prix_da: 18000, actif: true, ordre: 4 });
    render(<AdminCreditPacks />);
    await waitFor(() => expect(screen.getByText("Pack 10")).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Ajouter un pack/i));
    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: "Pack 100" } });
    fireEvent.change(screen.getByLabelText(/Crédits/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/Prix/i), { target: { value: "18000" } });
    fireEvent.click(screen.getByText(/^Ajouter$/i));
    await waitFor(() => expect(jobsService.createCreditPack).toHaveBeenCalledWith(
      expect.objectContaining({ nom: "Pack 100", credits: 100, prix_da: 18000 })
    ));
  });

  it("HP3: supprime un pack après confirmation", async () => {
    jobsService.deleteCreditPack.mockResolvedValue({});
    render(<><AdminCreditPacks /><ConfirmModalHost /></>);
    await waitFor(() => expect(screen.getByText("Pack 10")).toBeInTheDocument());
    fireEvent.click(screen.getByTitle(/Supprimer/i));
    fireEvent.click(await screen.findByText("Confirmer"));
    await waitFor(() => expect(jobsService.deleteCreditPack).toHaveBeenCalledWith(1));
  });
});
```

Vérifier au préalable l'export exact de `ConfirmModalHost` (`grep "export" taftech_frontend/src/utils/confirmToast.jsx`) et ajuster l'import du test si le nom diffère.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd taftech_frontend && npm test -- --run AdminCreditPacks`
Expected: FAIL — le module `../src/Pages/Admin/AdminCreditPacks` n'existe pas.

- [ ] **Step 3: Créer `AdminCreditPacks.jsx`**

Créer `taftech_frontend/src/Pages/Admin/AdminCreditPacks.jsx` (calqué sur `AdminFaq.jsx`, sans filtre de catégorie — un seul type d'objet) :

```jsx
import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";

const PACK_VIDE = { nom: "", credits: "", prix_da: "", ordre: 0, actif: true };

const AdminCreditPacks = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(PACK_VIDE);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminCreditPacks();
      setItems(data);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_CREDIT_PACKS", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(PACK_VIDE);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({ nom: item.nom, credits: item.credits, prix_da: item.prix_da, ordre: item.ordre, actif: item.actif });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return toast.error("Le nom est obligatoire.");
    const payload = {
      ...form,
      credits: Number(form.credits) || 0,
      prix_da: Number(form.prix_da) || 0,
      ordre: Number(form.ordre) || 0,
    };
    try {
      if (editingId) {
        await jobsService.updateCreditPack(editingId, payload);
        toast.success("Pack mis à jour !");
      } else {
        await jobsService.createCreditPack(payload);
        toast.success("Pack ajouté !");
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      reportError("ECHEC_SAVE_CREDIT_PACK", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer ce pack ?", async () => {
      try {
        await jobsService.deleteCreditPack(id);
        setItems(items.filter((i) => i.id !== id));
        toast.success("Pack supprimé.");
      } catch (err) {
        reportError("ECHEC_DELETE_CREDIT_PACK", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>Packs de crédits CVthèque</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Crédits achetables par les recruteurs quand leur quota mensuel est épuisé.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}
        >
          <Plus size={16} /> Ajouter un pack
        </button>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Nom</th>
                <th className="px-5 py-3">Crédits</th>
                <th className="px-5 py-3">Prix</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="5" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun pack configuré.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong}`}>{item.nom}</p></td>
                    <td className="px-5 py-3 text-sm">{item.credits}</td>
                    <td className="px-5 py-3 text-sm">{item.prix_da.toLocaleString("fr-FR")} DA</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${item.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {item.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(item)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} title="Supprimer" className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier le pack" : "Ajouter un pack"}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="pack_nom" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Nom *</label>
                <input id="pack_nom" required className={inputClass} placeholder="Ex: Pack 10" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
              <div>
                <label htmlFor="pack_credits" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Crédits *</label>
                <input id="pack_credits" type="number" min="1" required className={inputClass} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
              </div>
              <div>
                <label htmlFor="pack_prix" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix (DA) *</label>
                <input id="pack_prix" type="number" min="1" required className={inputClass} value={form.prix_da} onChange={(e) => setForm({ ...form, prix_da: e.target.value })} />
              </div>
              <div>
                <label htmlFor="pack_ordre" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Ordre d'affichage</label>
                <input id="pack_ordre" type="number" min="0" className={inputClass} value={form.ordre} onChange={(e) => setForm({ ...form, ordre: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pack_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                <label htmlFor="pack_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Pack visible/achetable</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>{editingId ? "Mettre à jour" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCreditPacks;
```

Note : les `<label htmlFor>` sont explicitement liés par `id` (au lieu du simple wrapping utilisé dans `AdminFaq.jsx`) pour que `screen.getByLabelText(...)` fonctionne dans le test Step 1.

- [ ] **Step 4: Ajouter la route et l'entrée sidebar**

Dans `taftech_frontend/src/App.jsx`, ajouter le lazy import à côté de `AdminFaq` (ligne 172) :

```js
const AdminCreditPacks   = lazy(() => import("./Pages/Admin/AdminCreditPacks"));
```

et la route à côté de `/admin-taftech/faq` (ligne 361) :

```jsx
              <Route path="/admin-taftech/credit-packs" element={<AdminCreditPacks />} />
```

Dans `taftech_frontend/src/Pages/Admin/AdminLayout.jsx`, ajouter dans le groupe "Système" (lignes 68-79), après `{ to: "/admin-taftech/paliers", icon: Layers, label: "Config. Paliers" },` :

```jsx
      { to: "/admin-taftech/credit-packs", icon: Coins, label: "Packs de crédits" },
```

Vérifier que `Coins` est importé depuis `lucide-react` en tête du fichier (ajouter à la liste d'imports existante si absent).

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `cd taftech_frontend && npm test -- --run AdminCreditPacks`
Expected: PASS (3 tests)

- [ ] **Step 6: Build + suite complète**

Run:
```bash
npm test -- --run
npx vite build
```
Expected: PASS, build propre.

- [ ] **Step 7: Commit**

```bash
git add taftech_frontend/src/Pages/Admin/AdminCreditPacks.jsx taftech_frontend/tests/AdminCreditPacks.test.jsx taftech_frontend/src/App.jsx taftech_frontend/src/Pages/Admin/AdminLayout.jsx
git commit -m "feat: panel admin CRUD des packs de crédits CVthèque"
```

---

### Task 11: `AbonnementsPage.jsx` — section "Crédits CVthèque"

**Files:**
- Modify: `taftech_frontend/src/Pages/Recruteur/AbonnementsPage.jsx`
- Modify: `taftech_frontend/tests/AbonnementsPage.test.jsx` (si existant — ajuster les mocks `jobsService`)

**Interfaces:**
- Consumes: `jobsService.getCreditPacks()`, `jobsService.checkoutCreditPack(packId)` (Task 9), `jobsService.getDashboard()` (déjà consommé, désormais retourne aussi `credits_mensuel_restant`/`credits_achetes_restant`, Task 8).

- [ ] **Step 1: Vérifier si un test existant casse (mock incomplet)**

Run: `cd taftech_frontend && npm test -- --run AbonnementsPage`
Expected: passe ou échoue selon que le fichier existe et mocke déjà `jobsService` de façon incomplète — noter le résultat avant modification.

- [ ] **Step 2: Ajouter le state et le chargement des packs**

Dans `taftech_frontend/src/Pages/Recruteur/AbonnementsPage.jsx`, ajouter un state après `const [paliers, setPaliers] = useState([]);` (ligne 43) :

```js
  const [creditPacks, setCreditPacks] = useState([]);
  const [creditsMensuelRestant, setCreditsMensuelRestant] = useState(null);
  const [creditsAchetesRestant, setCreditsAchetesRestant] = useState(0);
  const [achatEnCours, setAchatEnCours] = useState(null);
```

Dans le `useEffect` de chargement initial (lignes 60-76), ajouter `jobsService.getCreditPacks()` au `Promise.allSettled` :

```js
      const [p, f, c, cp] = await Promise.allSettled([
        jobsService.getPaliers(),
        jobsService.getFaq("PALIERS"),
        jobsService.getEntreprisesMisesEnAvant(),
        jobsService.getCreditPacks(),
      ]);
      if (p.status === "fulfilled") setPaliers(p.value);
      else reportError("ECHEC_LOAD_PALIERS", p.reason);
      if (f.status === "fulfilled") setFaq(f.value);
      else reportError("ECHEC_LOAD_FAQ_PALIERS", f.reason);
      if (c.status === "fulfilled") setClients(c.value);
      else reportError("ECHEC_LOAD_CLIENTS_MIS_EN_AVANT", c.reason);
      if (cp.status === "fulfilled") setCreditPacks(cp.value);
      else reportError("ECHEC_LOAD_CREDIT_PACKS", cp.reason);
      setLoading(false);
```

Dans le second `useEffect` (chargement du dashboard, autour des lignes 78-90 — `chargerPalierActif`), ajouter la lecture des crédits juste après `setDetailsAbonnement(...)` :

```js
        setCreditsMensuelRestant(dash.credits_mensuel_restant);
        setCreditsAchetesRestant(dash.credits_achetes_restant ?? 0);
```

- [ ] **Step 3: Ajouter le handler d'achat**

Ajouter, à côté des autres handlers de la page :

```js
  const handleAcheterPack = (pack) => {
    confirmToast(`Acheter le pack "${pack.nom}" (${pack.credits} crédits) pour ${pack.prix_da.toLocaleString("fr-FR")} DA ?`, async () => {
      setAchatEnCours(pack.id);
      try {
        const { checkout_url } = await jobsService.checkoutCreditPack(pack.id);
        window.location.href = checkout_url;
      } catch (err) {
        reportError("ECHEC_CHECKOUT_CREDIT_PACK", err);
        toast.error(apiErrMsg(err, "Erreur lors de la création du paiement."));
      } finally {
        setAchatEnCours(null);
      }
    });
  };
```

- [ ] **Step 4: Ajouter la section JSX**

Insérer une nouvelle section, juste après le panneau de statut d'abonnement existant (rechercher `detailsAbonnement` dans le JSX de rendu et insérer après ce bloc) :

```jsx
      {palierActif && (
        <div className={`${tw.card} p-6 mb-8`}>
          <h2 className={`text-lg font-bold ${tw.textStrong} mb-1`}>Crédits CVthèque</h2>
          <p className={`text-sm ${tw.textMuted} mb-4`}>
            Chaque crédit débloque coordonnées + CV d'un candidat, à vie, pour toute votre équipe.
          </p>
          <div className="flex flex-wrap gap-3 mb-5">
            <div className={`px-4 py-2 rounded-lg ${tw.bgPrimarySoft}`}>
              <span className={`text-sm font-semibold ${tw.textPrimaryStrong}`}>
                {creditsMensuelRestant == null ? "Illimité" : creditsMensuelRestant} crédit{creditsMensuelRestant === 1 ? "" : "s"} ce mois-ci
              </span>
            </div>
            <div className={`px-4 py-2 rounded-lg ${tw.surfaceSubtle}`}>
              <span className={`text-sm font-semibold ${tw.textMuted700}`}>{creditsAchetesRestant} crédit{creditsAchetesRestant === 1 ? "" : "s"} acheté{creditsAchetesRestant === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {creditPacks.map((pack) => (
              <div key={pack.id} className={`${tw.card} p-4 text-center`}>
                <p className={`text-2xl font-extrabold ${tw.textStrong}`}>{pack.credits}</p>
                <p className={`text-xs ${tw.textMuted} mb-3`}>crédits</p>
                <p className={`text-sm font-semibold ${tw.textStrong} mb-3`}>{pack.prix_da.toLocaleString("fr-FR")} DA</p>
                <button
                  onClick={() => handleAcheterPack(pack)}
                  disabled={achatEnCours === pack.id}
                  className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${tw.bgPrimarySolidHover} text-white`}
                >
                  {achatEnCours === pack.id ? "..." : "Acheter"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 5: Mettre à jour `CRITERES_TABLEAU`**

Déjà fait à la Task 1, Step 11 — vérifier que la clé est bien `credits_mois`.

- [ ] **Step 6: Corriger le test existant s'il casse**

Si `taftech_frontend/tests/AbonnementsPage.test.jsx` existe et que son mock `jobsService` ne définit pas `getCreditPacks`/`checkoutCreditPack`, ajouter au mock :

```js
jobsService.getCreditPacks.mockResolvedValue([
  { id: 1, nom: "Pack 10", credits: 10, prix_da: 2500, actif: true, ordre: 1 },
]);
```

et, si le mock de `getDashboard` existe, ajouter `credits_mensuel_restant`/`credits_achetes_restant` à l'objet retourné.

- [ ] **Step 7: Lancer les tests + build**

Run:
```bash
cd taftech_frontend
npm test -- --run
npx vite build
```
Expected: PASS, build propre.

- [ ] **Step 8: Commit**

```bash
git add taftech_frontend/src/Pages/Recruteur/AbonnementsPage.jsx taftech_frontend/tests/AbonnementsPage.test.jsx
git commit -m "feat: section Crédits CVthèque sur la page Abonnements"
```

---

### Task 12: `CVTheque.jsx` — UI de déblocage par candidat

**Files:**
- Modify: `taftech_frontend/src/Pages/Recruteur/CVTheque.jsx`
- Modify: `taftech_frontend/tests/CVTheque.test.jsx`

**Interfaces:**
- Consumes: `jobsService.deverrouillerCandidat(candidatId)` (Task 9, via `recruteurService` réexporté), réponse `CVThequeView` avec `est_debloque` par candidat et `credits_disponibles` (Task 5).

- [ ] **Step 1: Vérifier l'état actuel du test**

Run: `cd taftech_frontend && npm test -- --run CVTheque`
Expected: passe (comportement actuel, pas encore modifié).

- [ ] **Step 2: Remplacer le state `isPremium` par les crédits**

Dans `taftech_frontend/src/Pages/Recruteur/CVTheque.jsx`, chercher la déclaration `const [isPremium, setIsPremium] = useState(...)` et la remplacer par :

```js
  const [creditsDisponibles, setCreditsDisponibles] = useState({ mensuel_restant: null, achetes_restant: 0 });
  const [debloquageEnCours, setDebloquageEnCours] = useState(null);
```

Remplacer (ligne 215) :

```js
      if (data.is_premium !== undefined) setIsPremium(data.is_premium);
```

par :

```js
      if (data.credits_disponibles !== undefined) setCreditsDisponibles(data.credits_disponibles);
```

- [ ] **Step 3: Ajouter le handler de déblocage**

Ajouter, à côté des autres handlers de la page (ex: près de `handleToggleFavori`) :

```js
  const handleDeverrouillerCandidat = (candidat) => {
    confirmToast("Débloquer ce profil (1 crédit) ? Coordonnées et CV seront accessibles définitivement pour toute votre équipe.", async () => {
      setDebloquageEnCours(candidat.user_id);
      try {
        const result = await jobsService.deverrouillerCandidat(candidat.user_id);
        setCreditsDisponibles(result.credits_disponibles);
        setCandidats((prev) => prev.map((c) => (c.user_id === candidat.user_id ? { ...c, est_debloque: true, email: null } : c)));
        // Recharge la fiche pour récupérer email/téléphone/linkedin réellement débloqués.
        rechercher();
        toast.success("Profil débloqué !");
      } catch (err) {
        reportError("ECHEC_DEVERROUILLER_CANDIDAT", err);
        if (err.response?.status === 403 && err.response?.data?.code === "CREDITS_EPUISES") {
          toast.error("Plus de crédits disponibles — achetez un pack depuis la page Abonnements.");
        } else {
          toast.error(apiErrMsg(err, "Erreur lors du déblocage."));
        }
      } finally {
        setDebloquageEnCours(null);
      }
    });
  };
```

Vérifier le nom exact de la fonction de rechargement des résultats (probablement `rechercher` ou le nom de la fonction contenant le `useCallback` lu en Step 195-230 du fichier) et l'utiliser tel quel — ajuster l'appel si le nom diffère.

- [ ] **Step 4: Remplacer la bannière Premium**

Remplacer le bloc bannière (lignes 466-486) :

```jsx
      {!isPremium && (
        <div className={`mb-6 ${tw.bannerGradientTeal} rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className={`font-bold text-sm ${tw.textOnDark}`}>Accès limité — Coordonnées masquées</p>
              <p className={`text-xs mt-0.5 ${tw.textTeal200}`}>Passez en Premium pour accéder aux emails, téléphones et réseaux sociaux des candidats.</p>
            </div>
          </div>
          <Link to="/recruteurs/premium" className={`shrink-0 px-4 py-2 text-sm font-bold rounded-xl transition-colors ${tw.linkOnTealGradient}`}>
            Passer Premium →
          </Link>
        </div>
      )}
      {isPremium && (
        <div className={`mb-6 flex items-center gap-2 ${tw.bgTealSoft} border ${tw.borderTeal200} rounded-xl px-4 py-2.5 w-fit`}>
          <span className={`text-sm font-bold ${tw.textTeal}`}>⭐ Compte Premium actif</span>
          <span className={`text-xs ${tw.textTeal600}`}>— Accès complet aux coordonnées</span>
        </div>
      )}
```

par :

```jsx
      <div className={`mb-6 flex flex-wrap items-center gap-3 ${tw.bgTealSoft} border ${tw.borderTeal200} rounded-xl px-4 py-2.5 w-fit`}>
        <span className={`text-sm font-bold ${tw.textTeal}`}>
          {creditsDisponibles.mensuel_restant == null ? "Crédits illimités" : `${creditsDisponibles.mensuel_restant} crédit${creditsDisponibles.mensuel_restant === 1 ? "" : "s"} ce mois-ci`}
        </span>
        {creditsDisponibles.achetes_restant > 0 && (
          <span className={`text-xs ${tw.textTeal600}`}>+ {creditsDisponibles.achetes_restant} acheté{creditsDisponibles.achetes_restant === 1 ? "" : "s"}</span>
        )}
        {creditsDisponibles.mensuel_restant === 0 && creditsDisponibles.achetes_restant === 0 && (
          <Link to="/recruteurs/abonnements" className={`text-xs font-bold underline ${tw.textTeal}`}>
            Acheter des crédits →
          </Link>
        )}
      </div>
```

- [ ] **Step 5: Mettre à jour la phrase de l'`InfoBanner`**

Remplacer (ligne 523) :

```jsx
          Les coordonnées (email, téléphone) sont visibles uniquement avec un compte Premium.
```

par :

```jsx
          Débloquez un profil (1 crédit) pour accéder à ses coordonnées et son CV, à vie, pour toute votre équipe.
```

- [ ] **Step 6: Ajouter le bouton de déblocage dans le panneau détail**

Remplacer le bloc "Coordonnées non disponibles" (lignes 1201-1203) :

```jsx
                  {!selectedCandidat.email && !selectedCandidat.telephone && (
                    <p className={`text-sm italic ${tw.textMuted}`}>Coordonnées non disponibles</p>
                  )}
```

par :

```jsx
                  {!selectedCandidat.est_debloque && (
                    <button
                      onClick={() => handleDeverrouillerCandidat(selectedCandidat)}
                      disabled={debloquageEnCours === selectedCandidat.user_id}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${tw.bgTealSolid}`}
                    >
                      🔓 {debloquageEnCours === selectedCandidat.user_id ? "Déblocage..." : "Débloquer ce profil (1 crédit)"}
                    </button>
                  )}
                  {selectedCandidat.est_debloque && !selectedCandidat.email && !selectedCandidat.telephone && (
                    <p className={`text-sm italic ${tw.textMuted}`}>Coordonnées non renseignées par le candidat.</p>
                  )}
```

- [ ] **Step 7: Gater le téléchargement CV par le déblocage**

Remplacer le bloc "CV PDF" (lignes 1349-1362) :

```jsx
              {selectedCandidat.cv_pdf && (
                <div className="px-6 pb-6">
                  <a
                    href={candidatFichierUrl(selectedCandidat.user_id, "cv")}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${tw.buttonDark}`}
                  >
                    <FileText size={16} />
                    Télécharger le CV complet
                  </a>
                </div>
              )}
```

par :

```jsx
              {selectedCandidat.cv_pdf && selectedCandidat.est_debloque && (
                <div className="px-6 pb-6">
                  <a
                    href={candidatFichierUrl(selectedCandidat.user_id, "cv")}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${tw.buttonDark}`}
                  >
                    <FileText size={16} />
                    Télécharger le CV complet
                  </a>
                </div>
              )}
              {selectedCandidat.cv_pdf && !selectedCandidat.est_debloque && (
                <div className="px-6 pb-6">
                  <button
                    onClick={() => handleDeverrouillerCandidat(selectedCandidat)}
                    disabled={debloquageEnCours === selectedCandidat.user_id}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${tw.buttonDark}`}
                  >
                    <FileText size={16} />
                    Débloquer pour voir le CV (1 crédit)
                  </button>
                </div>
              )}
```

- [ ] **Step 8: Mettre à jour le test existant**

Dans `taftech_frontend/tests/CVTheque.test.jsx`, remplacer toute fixture de réponse `searchCVtheque`/`getDashboard` contenant `is_premium: true/false` par `credits_disponibles: { mensuel_restant: N, achetes_restant: 0 }`, et toute assertion sur le texte "Passer Premium"/"Compte Premium actif" par une assertion sur le nouveau texte de crédits (`"crédits ce mois-ci"` ou `"Crédits illimités"`). Ajouter un test HP couvrant le clic sur "Débloquer ce profil" :

```jsx
  it("HP-CREDITS: débloque un candidat au clic", async () => {
    jobsService.searchCVtheque.mockResolvedValue({
      results: [{ user_id: 1, email: null, telephone: null, est_debloque: false, cv_pdf: "cvs/x.pdf" }],
      count: 1, credits_disponibles: { mensuel_restant: 10, achetes_restant: 0 },
    });
    jobsService.deverrouillerCandidat.mockResolvedValue({ est_debloque: true, credits_disponibles: { mensuel_restant: 9, achetes_restant: 0 } });
    render(<><CVTheque /><ConfirmModalHost /></>);
    await waitFor(() => expect(screen.getByText(/Débloquer ce profil/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Débloquer ce profil/i));
    fireEvent.click(await screen.findByText("Confirmer"));
    await waitFor(() => expect(jobsService.deverrouillerCandidat).toHaveBeenCalledWith(1));
  });
```

Adapter les noms exacts de mocks/imports déjà utilisés en tête du fichier de test existant (ne pas dupliquer un import déjà présent).

- [ ] **Step 9: Lancer les tests + build**

Run:
```bash
cd taftech_frontend
npm test -- --run
npx vite build
```
Expected: PASS, build propre.

- [ ] **Step 10: Commit**

```bash
git add taftech_frontend/src/Pages/Recruteur/CVTheque.jsx taftech_frontend/tests/CVTheque.test.jsx
git commit -m "feat: UI de déblocage par crédit dans la CVthèque"
```

---

### Task 13: Vérification finale end-to-end

**Files:** aucun nouveau fichier — vérification transverse.

- [ ] **Step 1: Suite backend complète**

Run:
```bash
cd taftech_backend
python manage.py test jobs accounts -v 1
python manage.py check
```
Expected: tous les tests passent, `System check identified no issues (0 silenced)`.

- [ ] **Step 2: Suite frontend complète**

Run:
```bash
cd taftech_frontend
npm test -- --run
npx vite build
```
Expected: tous les tests passent, build propre.

- [ ] **Step 3: Vérification manuelle en conditions réelles**

Run le backend (`python manage.py runserver`) et le frontend (`npm run dev`), puis dans le navigateur :
1. Se connecter avec un compte recruteur palier STARTER (ou activer un palier via `/admin-taftech/paliers` puis `AdminDemandesPremiumAPIView`).
2. Ouvrir `/cvtheque` — vérifier que les coordonnées sont masquées et qu'un bandeau affiche le nombre de crédits mensuels restants.
3. Cliquer "Débloquer ce profil" sur un candidat, confirmer — vérifier que les coordonnées et le lien CV apparaissent immédiatement, et que le compteur de crédits décrémente.
4. Recharger la page — vérifier que ce même candidat reste débloqué (persistance).
5. Sur `/recruteurs/abonnements`, vérifier que la section "Crédits CVthèque" affiche le même solde et propose les 3 packs.
6. Sur `/admin-taftech/credit-packs`, vérifier le CRUD (créer/modifier/supprimer un pack).

Documenter tout écart trouvé et le corriger avant de considérer la fonctionnalité terminée.

- [ ] **Step 4: Mettre à jour `CLAUDE.md`**

Ajouter une nouvelle section `## 🆕 SESSION <date du jour> — Système de crédits CVthèque` en tête de `c:\Users\filali\Desktop\Taftech\CLAUDE.md`, résumant : remplacement de `limite_cv_mois`→`credits_mois`, nouveaux modèles `CreditPack`/`AccesCandidatDebloque`/`PaiementCreditPack`, décision de résolution sur `acces_coordonnees` (superseded par le déblocage), nouveaux endpoints, résultats des tests (nombre exact obtenu au Step 1/2).

- [ ] **Step 5: Commit final**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add CLAUDE.md
git commit -m "docs: documente le système de crédits CVthèque dans CLAUDE.md"
```

---

## Self-Review

**Spec coverage** :
- Décision 1 (crédit = coordonnées+CV ensemble) → Task 3 (`deverrouiller_candidat`), Task 4/5 (gating unifié).
- Décision 2 (acquis à vie) → `AccesCandidatDebloque` unique_together, jamais de suppression/expiration codée.
- Décision 3 (partagé équipe) → filtré par `entreprise`, pas par membre.
- Décision 4 (quota mensuel, reset, `credits_mois`) → Task 1, Task 3 (`_credits_mensuel_utilises_ce_mois`).
- Décision 5 (Gratuit exclu) → Task 4 (`PALIER_INSUFFISANT` avant tout calcul de crédit).
- Décision 6 (packs Chargily) → Task 6.
- Décision 7 (crédits achetés n'expirent jamais) → `credits_achetes_restants` jamais reset par un cron/tâche planifiée (aucune tâche de ce type ajoutée dans ce plan).
- Décision 8 (pas de rétro-déblocage) → aucune migration ne peuple `AccesCandidatDebloque` à partir de l'historique `TelechargementCV`.
- Modèles, backend, frontend, sécurité, tests de la spec → couverts respectivement par Tasks 1-2, 3-8, 9-12, (masquage serveur systématique dans Task 5/4), tests intégrés à chaque tâche.

**Placeholder scan** : aucun "TBD"/"TODO" ; chaque step contient du code complet exécutable, pas de résumé de type "ajouter la logique similaire à...".

**Type consistency** : `credits_disponibles()` retourne toujours `{'mensuel_restant', 'achetes_restant'}` — utilisé identiquement dans Task 4 (vue), Task 5 (`CVThequeView`), Task 8 (dashboard), Task 12 (frontend `creditsDisponibles`). `AccesCandidatDebloque.source` ∈ `{'MENSUEL','ACHETE'}` cohérent entre Task 2 (modèle) et Task 3 (logique). `est_debloque` (nom de champ) identique entre Task 5 (backend serializer) et Task 12 (frontend, `selectedCandidat.est_debloque`).

**Gaps identifiés et résolus pendant l'écriture du plan** : le champ `Palier.acces_coordonnees` créait une incohérence avec la décision spec "Starter+ peut dépenser des crédits" (STARTER a `acces_coordonnees=False` en seed) — résolu explicitement dans les Global Constraints : ce champ ne gate plus le masquage CVthèque, remplacé par le déblocage par crédit ; il continue à gater `InviterCandidatCVThequeAPIView` (hors périmètre, non modifié par ce plan).
