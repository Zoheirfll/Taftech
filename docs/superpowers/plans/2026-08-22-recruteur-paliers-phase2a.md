# Modèle Paliers Backend + Admin (Phase 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer le nouveau modèle de données `Palier` (4 paliers Starter/Pro/Business/Enterprise, remplace `PremiumPlan`) + `AbonnementEntreprise` (abonnement actif d'une entreprise), avec CRUD admin complet (backend + panel React), et migrer les entreprises déjà Premium vers le palier Business — **sans toucher au gating existant** (CVthèque/limite offres/IA restent branchés sur `ProfilEntreprise.est_premium_actif` comme avant ; le rebranchement sur les nouveaux paliers est la Phase 2b, un plan séparé).

**Architecture:** Suit exactement le pattern déjà établi par `PremiumPlan`/`PremiumAvantage` (`jobs/models.py`, `jobs/views/premium_admin.py`, `jobs/serializers/premium.py`) — 2 nouveaux modèles Django, 1 serializer, des vues admin CRUD (`IsAdminUser` + vérif `role == 'ADMIN'`) + 1 vue de lecture publique cachée, migration de schéma puis migration de données (seed des 4 paliers + bascule des entreprises Premium existantes), et un panel admin React calqué sur `AdminPremium.jsx`.

**Tech Stack:** Django 5.2 + DRF, PostgreSQL (port 5433), React 18 + Vite, Tailwind (tokens `tw.*`), Vitest.

## Global Constraints

- Ne PAS modifier le gating existant (`CVThequeView`, `GenererOffreIAAPIView`, limite d'offres, etc.) — ils continuent de lire `ProfilEntreprise.est_premium_actif` exactement comme avant. Cette phase ne fait qu'ajouter les nouveaux modèles/CRUD, en parallèle, sans brancher personne dessus.
- 4 paliers fixes au départ avec ces valeurs exactes (reproduites du mockup) :
  - **STARTER** : 5900 DA/mois, 70800 DA/an, limite_offres=5, limite_cv_mois=10, acces_coordonnees=False, acces_ia_recommandes=False, acces_ia_avancee=False, acces_equipe=False, support_label="Essentiel"
  - **PRO** : 12900 DA/mois, 154800 DA/an, limite_offres=15, limite_cv_mois=None (illimité), acces_coordonnees=True, acces_ia_recommandes=True, acces_ia_avancee=False, acces_equipe=False, support_label="Prioritaire"
  - **BUSINESS** : 22900 DA/mois, 274800 DA/an, limite_offres=None, limite_cv_mois=None, acces_coordonnees=True, acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True, support_label="Prioritaire + dédié"
  - **ENTERPRISE** : prix_mensuel_da=None, prix_annuel_da=None ("Sur devis"), limite_offres=None, limite_cv_mois=None, acces_coordonnees=True, acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True, support_label="Dédié 24/7"
- Entreprises déjà `est_premium=True` (ancien système) : migrées vers `AbonnementEntreprise(palier=BUSINESS, date_expiration=<leur premium_expire_at actuelle>)`, sans re-paiement forcé — voir spec `docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md`, section "Migration des Premium existants".
- Tests : `python manage.py test jobs.tests` (backend) et `npm test -- --run` (frontend) doivent rester à 100%. `npx vite build` propre.

---

### Task 1: Modèles `Palier` + `AbonnementEntreprise` (schéma)

**Files:**
- Modify: `taftech_backend/jobs/models.py` (ajouter après la classe `PremiumAvantage`, ligne ~754)
- Create: `taftech_backend/jobs/migrations/0079_palier_abonnemententreprise.py` (générée par `makemigrations`)
- Test: `taftech_backend/jobs/tests/test_api_paliers.py`

**Interfaces:**
- Produces: `Palier` (champs : `nom` choix unique STARTER/PRO/BUSINESS/ENTERPRISE, `prix_mensuel_da`, `prix_annuel_da`, `remise_annuelle_active`, `limite_offres`, `limite_cv_mois`, `acces_coordonnees`, `acces_ia_recommandes`, `acces_ia_avancee`, `acces_equipe`, `support_label`, `ordre`, `actif`) ; `AbonnementEntreprise` (FK `entreprise` OneToOne vers `ProfilEntreprise`, FK `palier`, `date_debut` auto, `date_expiration` nullable, `renouvellement_auto`, property `est_actif`). Consommés par Task 2 (serializer/vues) et par la Phase 2b future (gating).

- [ ] **Step 1: Écrire le test qui va échouer (le modèle n'existe pas)**

Créer `taftech_backend/jobs/tests/test_api_paliers.py` :

```python
"""Tests pour le modèle Palier (session 22/08/2026, Phase 2a — voir
docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md)."""
from django.test import TestCase
from django.core.cache import cache
from jobs.models import Palier, AbonnementEntreprise, ProfilEntreprise
from django.contrib.auth import get_user_model

User = get_user_model()


class PalierModelTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_creation_palier_minimal(self):
        p = Palier.objects.create(nom="STARTER", limite_offres=5)
        self.assertEqual(str(p), p.get_nom_display())
        self.assertTrue(p.actif)

    def test_nom_unique(self):
        Palier.objects.create(nom="STARTER")
        with self.assertRaises(Exception):
            Palier.objects.create(nom="STARTER")

    def test_prix_zero_rejete(self):
        p = Palier(nom="PRO", prix_mensuel_da=0)
        with self.assertRaises(Exception):
            p.full_clean()

    def test_prix_null_autorise_pour_enterprise(self):
        p = Palier(nom="ENTERPRISE", prix_mensuel_da=None, prix_annuel_da=None)
        p.full_clean()  # ne doit pas lever


class AbonnementEntrepriseModelTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="rec_paliers", email="rec_paliers@test.dz", password="pwd", role="RECRUTEUR",
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.user, nom_entreprise="TestCo", secteur_activite="IT",
            wilaya_siege="16 - Alger", registre_commerce="RC-PALIERS-1",
        )
        self.palier = Palier.objects.create(nom="BUSINESS")

    def test_creation_abonnement(self):
        ab = AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=self.palier)
        self.assertTrue(ab.est_actif)  # date_expiration=None → illimité

    def test_est_actif_false_si_expire(self):
        from django.utils import timezone
        import datetime
        ab = AbonnementEntreprise.objects.create(
            entreprise=self.entreprise, palier=self.palier,
            date_expiration=timezone.now() - datetime.timedelta(days=1),
        )
        self.assertFalse(ab.est_actif)

    def test_une_seule_entreprise_un_seul_abonnement(self):
        AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=self.palier)
        with self.assertRaises(Exception):
            AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=self.palier)
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests.test_api_paliers -v 2`
Expected: FAIL — `ImportError: cannot import name 'Palier' from 'jobs.models'`.

- [ ] **Step 3: Ajouter les modèles**

Dans `taftech_backend/jobs/models.py`, juste après la classe `PremiumAvantage` (après la ligne `return self.titre` et avant `class AIConfig`), ajouter :

```python
class Palier(models.Model):
    """Palier d'abonnement recruteur (Starter/Pro/Business/Enterprise) — remplace le système
    Premium binaire (voir docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md).
    'Gratuit' n'est PAS une ligne ici : c'est l'absence d'AbonnementEntreprise actif pour une
    entreprise (voir Phase 2b, non câblée dans cette migration)."""
    NOM_CHOICES = [
        ('STARTER', 'Starter'),
        ('PRO', 'Pro'),
        ('BUSINESS', 'Business'),
        ('ENTERPRISE', 'Enterprise'),
    ]
    nom = models.CharField(max_length=20, choices=NOM_CHOICES, unique=True, verbose_name="Palier")
    prix_mensuel_da = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Prix mensuel (DA)", validators=[MinValueValidator(1)]
    )
    prix_annuel_da = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Prix annuel (DA)", validators=[MinValueValidator(1)]
    )
    remise_annuelle_active = models.BooleanField(default=False, verbose_name="Remise annuelle affichée")
    limite_offres = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Limite offres actives (vide = illimité)",
        validators=[MinValueValidator(1)],
    )
    limite_cv_mois = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Limite téléchargements CV/mois (vide = illimité)",
        validators=[MinValueValidator(1)],
    )
    acces_coordonnees = models.BooleanField(default=False, verbose_name="Coordonnées candidats visibles")
    acces_ia_recommandes = models.BooleanField(default=False, verbose_name="Candidats recommandés (IA)")
    acces_ia_avancee = models.BooleanField(default=False, verbose_name="Recherche/filtres/stats IA avancés")
    acces_equipe = models.BooleanField(default=False, verbose_name="Gestion d'équipe multi-utilisateurs")
    support_label = models.CharField(max_length=100, blank=True, verbose_name="Support (texte libre)")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    actif = models.BooleanField(default=True, verbose_name="Visible/achetable")

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return self.get_nom_display()


class AbonnementEntreprise(models.Model):
    """Abonnement actif d'une entreprise à un Palier. Remplace ProfilEntreprise.est_premium/
    premium_expire_at comme future source de vérité — ces 2 champs restent en base pour
    compatibilité (le gating existant les lit encore, voir Phase 2b) mais ne sont plus la
    source de vérité une fois la Phase 2b câblée."""
    entreprise = models.OneToOneField(
        ProfilEntreprise, on_delete=models.CASCADE, related_name='abonnement'
    )
    palier = models.ForeignKey(Palier, on_delete=models.PROTECT, related_name='abonnements')
    date_debut = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField(
        null=True, blank=True, verbose_name="Expire le (vide = illimité)"
    )
    renouvellement_auto = models.BooleanField(default=True)

    @property
    def est_actif(self):
        if self.date_expiration is None:
            return True
        from django.utils import timezone
        return self.date_expiration > timezone.now()

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} — {self.palier.get_nom_display()}"
```

- [ ] **Step 4: Générer la migration**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py makemigrations jobs`
Expected: crée `jobs/migrations/0079_palier_abonnemententreprise.py` (le nom exact peut varier légèrement selon Django — c'est acceptable, noter le nom réel dans le rapport).

- [ ] **Step 5: Appliquer la migration et lancer les tests**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py migrate jobs && python manage.py test jobs.tests.test_api_paliers -v 2`
Expected: PASS — 6/6 tests verts.

- [ ] **Step 6: Vérifier qu'aucune régression n'est introduite sur la suite complète**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests`
Expected: 100% des tests passent (aucun changement de comportement existant — nouveaux modèles seulement).

- [ ] **Step 7: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/models.py taftech_backend/jobs/migrations/0079_palier_abonnemententreprise.py taftech_backend/jobs/tests/test_api_paliers.py
git commit -m "feat: modeles Palier et AbonnementEntreprise (schema)"
```

---

### Task 2: Serializer + CRUD admin + lecture publique

**Files:**
- Create: `taftech_backend/jobs/serializers/paliers.py`
- Modify: `taftech_backend/jobs/serializers/__init__.py`
- Create: `taftech_backend/jobs/views/paliers_admin.py`
- Modify: `taftech_backend/jobs/views/__init__.py`
- Modify: `taftech_backend/jobs/urls.py`
- Modify: `taftech_backend/jobs/tests/test_api_paliers.py` (ajouter les tests d'API)

**Interfaces:**
- Consumes: `Palier` (Task 1).
- Produces: `PalierSerializer` (export depuis `jobs.serializers`) ; vues `PaliersPublicAPIView` (`GET /api/jobs/paliers/`, `AllowAny` + `PublicReadThrottle`, cache 1h clé `jobs_paliers`, ne retourne que `actif=True`) et `PaliersAdminAPIView` (`GET/POST /api/jobs/admin/paliers/`, `PUT/DELETE /api/jobs/admin/paliers/<pk>/`, `IsAdminUser` + vérif `role=='ADMIN'`, invalide le cache `jobs_paliers` à chaque écriture) — consommées par Task 3 (frontend admin) et par les phases futures (page Abonnements publique).

- [ ] **Step 1: Écrire le serializer**

Créer `taftech_backend/jobs/serializers/paliers.py` :

```python
from rest_framework import serializers
from ..models import Palier


class PalierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Palier
        fields = [
            'id', 'nom', 'prix_mensuel_da', 'prix_annuel_da', 'remise_annuelle_active',
            'limite_offres', 'limite_cv_mois', 'acces_coordonnees', 'acces_ia_recommandes',
            'acces_ia_avancee', 'acces_equipe', 'support_label', 'ordre', 'actif',
        ]
```

Dans `taftech_backend/jobs/serializers/__init__.py`, ajouter après la ligne `from .premium import PremiumPlanSerializer, PremiumAvantageSerializer, FaqItemSerializer, CompetenceReferentielSerializer` :

```python
from .paliers import PalierSerializer
```

- [ ] **Step 2: Écrire les tests d'API (échouent — les vues n'existent pas)**

Ajouter à la fin de `taftech_backend/jobs/tests/test_api_paliers.py` :

```python
from django.urls import reverse
from rest_framework.test import APITestCase


def make_admin_paliers():
    return User.objects.create_user(
        username="admin_paliers", email="admin_paliers@test.dz", password="pwd",
        role="ADMIN", is_staff=True,
    )


class PalierAPITest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_admin_paliers()
        self.palier_actif = Palier.objects.create(nom="STARTER", prix_mensuel_da=5900, actif=True)
        self.palier_inactif = Palier.objects.create(nom="PRO", prix_mensuel_da=12900, actif=False)

    def test_public_liste_seulement_actifs(self):
        response = self.client.get(reverse("paliers-public"))
        self.assertEqual(response.status_code, 200)
        noms = [p["nom"] for p in response.data]
        self.assertIn("STARTER", noms)
        self.assertNotIn("PRO", noms)

    def test_admin_liste_tout(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("admin-paliers"))
        self.assertEqual(len(response.data), 2)

    def test_non_admin_refuse(self):
        candidat = User.objects.create_user(
            username="cand_paliers", email="cand_paliers@test.dz", password="pwd", role="CANDIDAT",
        )
        self.client.force_authenticate(user=candidat)
        response = self.client.get(reverse("admin-paliers"))
        self.assertEqual(response.status_code, 403)

    def test_creation_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("admin-paliers"), {
            "nom": "BUSINESS", "prix_mensuel_da": 22900, "limite_offres": None,
        })
        self.assertEqual(response.status_code, 201)

    def test_update_invalide_cache_public(self):
        self.client.get(reverse("paliers-public"))  # peuple le cache
        self.client.force_authenticate(user=self.admin)
        self.client.put(reverse("admin-palier-detail", args=[self.palier_actif.id]), {"prix_mensuel_da": 6900})
        response = self.client.get(reverse("paliers-public"))
        prix = next(p["prix_mensuel_da"] for p in response.data if p["id"] == self.palier_actif.id)
        self.assertEqual(prix, 6900)

    def test_delete_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse("admin-palier-detail", args=[self.palier_actif.id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Palier.objects.filter(id=self.palier_actif.id).exists())
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests.test_api_paliers.PalierAPITest -v 2`
Expected: FAIL — `NoReverseMatch: Reverse for 'paliers-public' not found`.

- [ ] **Step 4: Écrire les vues**

Créer `taftech_backend/jobs/views/paliers_admin.py` :

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from django.core.cache import cache
from ..models import Palier
from ..serializers import PalierSerializer
from ..throttles import PublicReadThrottle

CACHE_PALIERS = 'jobs_paliers'


class PaliersPublicAPIView(APIView):
    """Paliers d'abonnement actifs — consommé par la future page Abonnements recruteur
    (non construite dans cette phase) et tout futur teaser public."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        cached = cache.get(CACHE_PALIERS)
        if cached is not None:
            return Response(cached)
        paliers = Palier.objects.filter(actif=True)
        data = PalierSerializer(paliers, many=True).data
        cache.set(CACHE_PALIERS, data, timeout=3600)
        return Response(data)


class PaliersAdminAPIView(APIView):
    """CRUD admin des paliers d'abonnement — même pattern que PremiumPlansAdminAPIView."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        paliers = Palier.objects.all()
        return Response(PalierSerializer(paliers, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = PalierSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_PALIERS)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            palier = Palier.objects.get(pk=pk)
        except Palier.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = PalierSerializer(palier, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_PALIERS)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            Palier.objects.get(pk=pk).delete()
            cache.delete(CACHE_PALIERS)
            return Response({'message': 'Supprimé.'})
        except Palier.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
```

Dans `taftech_backend/jobs/views/__init__.py`, ajouter après le bloc `from .premium_admin import (...)` (se termine par la ligne `)` après `CompetencesAdminAPIView,`) :

```python
from .paliers_admin import (
    PaliersPublicAPIView,
    PaliersAdminAPIView,
)
```

Dans `taftech_backend/jobs/urls.py`, dans le bloc d'import (après la ligne `PremiumPlansAdminAPIView, PremiumAvantagesAdminAPIView,`), ajouter :

```python
    PaliersPublicAPIView, PaliersAdminAPIView,
```

Puis dans la liste des `path(...)` (juste après les 4 lignes `path('admin/premium/...')`/`path('premium/...')` existantes, avant `path('admin/faq/', ...)`), ajouter :

```python
    path('admin/paliers/', PaliersAdminAPIView.as_view(), name='admin-paliers'),
    path('admin/paliers/<int:pk>/', PaliersAdminAPIView.as_view(), name='admin-palier-detail'),
    path('paliers/', PaliersPublicAPIView.as_view(), name='paliers-public'),
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests.test_api_paliers -v 2`
Expected: PASS — tous les tests de `test_api_paliers.py` verts (modèles + API).

- [ ] **Step 6: Suite complète backend**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests`
Expected: 100% des tests passent.

- [ ] **Step 7: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/serializers/paliers.py taftech_backend/jobs/serializers/__init__.py taftech_backend/jobs/views/paliers_admin.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/urls.py taftech_backend/jobs/tests/test_api_paliers.py
git commit -m "feat: CRUD admin + lecture publique des paliers d'abonnement"
```

---

### Task 3: Migration de données — seed des 4 paliers + bascule des Premium existants

**Files:**
- Create: `taftech_backend/jobs/migrations/0080_seed_paliers_migrer_premium.py`

**Interfaces:**
- Consumes: `Palier`, `AbonnementEntreprise`, `ProfilEntreprise` (via `apps.get_model` — migration de données historique, pas d'import direct des modèles applicatifs).

- [ ] **Step 1: Créer la migration de données vide**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py makemigrations jobs --empty --name seed_paliers_migrer_premium`
Expected: crée `jobs/migrations/0080_seed_paliers_migrer_premium.py` avec un `operations = []` vide, dépendance sur `0079_...`.

- [ ] **Step 2: Écrire le contenu de la migration**

Remplacer le contenu du fichier généré par :

```python
from django.db import migrations


def seed_paliers_et_migrer_premium(apps, schema_editor):
    Palier = apps.get_model('jobs', 'Palier')
    AbonnementEntreprise = apps.get_model('jobs', 'AbonnementEntreprise')
    ProfilEntreprise = apps.get_model('jobs', 'ProfilEntreprise')

    # Texte dupliqué en dur ici (pas d'import du code applicatif) — une migration doit rester
    # un instantané figé, indépendant d'une future modification des valeurs par défaut dans le
    # code (même principe que la migration 0075 documentée dans CLAUDE.md).
    PALIERS = [
        dict(nom='STARTER', prix_mensuel_da=5900, prix_annuel_da=70800,
             limite_offres=5, limite_cv_mois=10, acces_coordonnees=False,
             acces_ia_recommandes=False, acces_ia_avancee=False, acces_equipe=False,
             support_label='Essentiel', ordre=1, actif=True),
        dict(nom='PRO', prix_mensuel_da=12900, prix_annuel_da=154800,
             limite_offres=15, limite_cv_mois=None, acces_coordonnees=True,
             acces_ia_recommandes=True, acces_ia_avancee=False, acces_equipe=False,
             support_label='Prioritaire', ordre=2, actif=True),
        dict(nom='BUSINESS', prix_mensuel_da=22900, prix_annuel_da=274800,
             limite_offres=None, limite_cv_mois=None, acces_coordonnees=True,
             acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True,
             support_label='Prioritaire + dédié', ordre=3, actif=True),
        dict(nom='ENTERPRISE', prix_mensuel_da=None, prix_annuel_da=None,
             limite_offres=None, limite_cv_mois=None, acces_coordonnees=True,
             acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True,
             support_label='Dédié 24/7', ordre=4, actif=True),
    ]
    for data in PALIERS:
        Palier.objects.get_or_create(nom=data['nom'], defaults=data)

    business = Palier.objects.get(nom='BUSINESS')
    for entreprise in ProfilEntreprise.objects.filter(est_premium=True):
        AbonnementEntreprise.objects.get_or_create(
            entreprise=entreprise,
            defaults={
                'palier': business,
                'date_expiration': entreprise.premium_expire_at,
            },
        )


def reverse_noop(apps, schema_editor):
    # Pas de suppression automatique en reverse — reproduire un seed/backfill est une opération
    # à sens unique, cohérent avec le pattern déjà établi dans ce projet (migrations 0062/0064/0066/0070).
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0079_palier_abonnemententreprise'),
    ]

    operations = [
        migrations.RunPython(seed_paliers_et_migrer_premium, reverse_noop),
    ]
```

**Note pour l'implémenteur** : remplacer `'0079_palier_abonnemententreprise'` par le nom réel du fichier généré au Task 1 Step 4 si Django l'a nommé différemment.

- [ ] **Step 3: Appliquer la migration**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py migrate jobs`
Expected: migration appliquée sans erreur.

- [ ] **Step 4: Vérification manuelle en shell (pas de test automatisé — cohérent avec le pattern déjà établi dans ce projet pour les migrations de données, voir CLAUDE.md)**

Run (en une seule commande, `python manage.py shell -c "..."`) :

```bash
cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py shell -c "
from jobs.models import Palier, AbonnementEntreprise
print('Paliers:', Palier.objects.count())
for p in Palier.objects.all().order_by('ordre'):
    print(p.nom, p.prix_mensuel_da, p.limite_offres, p.acces_equipe)
print('Abonnements migrés:', AbonnementEntreprise.objects.count())
"
```

Expected : 4 paliers affichés avec les valeurs exactes du Global Constraints ci-dessus ; le nombre d'`AbonnementEntreprise` correspond au nombre d'entreprises `est_premium=True` existantes dans la base de dev (à vérifier manuellement, pas une valeur fixe attendue).

- [ ] **Step 5: Tester qu'un re-run de la migration ne duplique rien (idempotence)**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py migrate jobs 0079 && python manage.py migrate jobs`
Expected : re-applique la migration 0080 sans erreur (le `get_or_create` empêche toute duplication), `Palier.objects.count()` reste à 4.

- [ ] **Step 6: Suite complète backend**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests`
Expected: 100% des tests passent (la base de test repart de zéro à chaque run, donc cette migration de données s'y applique aussi — vérifier qu'aucun test existant ne comptait un nombre absolu de `Palier`/`AbonnementEntreprise` en base sans vider la table d'abord, pattern déjà documenté dans `CMSTestBase` de `test_api_cms.py`. Les tests écrits au Task 1/2 vident déjà via `Palier.objects.create(...)` dans des tables autrement vides pour leurs propres assertions ciblées — mais `test_admin_liste_tout`/`test_public_liste_seulement_actifs` du Task 2 supposent 2 lignes exactement : si cette migration de seed en ajoute 4 de plus dans la base de test, CES DEUX TESTS VONT CASSER. Corriger en ajoutant `Palier.objects.all().delete()` en première ligne du `setUp()` de `PalierAPITest`, comme le fait déjà `PremiumPlanAPITest` dans `test_api_cms.py:55`).

- [ ] **Step 7: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/migrations/0080_seed_paliers_migrer_premium.py taftech_backend/jobs/tests/test_api_paliers.py
git commit -m "feat: seed des 4 paliers + migration des entreprises Premium existantes vers Business"
```

---

### Task 4: Panel admin frontend `AdminPaliers.jsx`

**Files:**
- Create: `taftech_frontend/src/Pages/Admin/AdminPaliers.jsx`
- Modify: `taftech_frontend/src/Services/adminService.js`
- Modify: `taftech_frontend/src/App.jsx`
- Modify: `taftech_frontend/src/Pages/Admin/AdminLayout.jsx`
- Test: `taftech_frontend/tests/AdminPaliers.test.jsx`

**Interfaces:**
- Consumes: endpoints du Task 2 (`GET/POST /api/jobs/admin/paliers/`, `PUT/DELETE /api/jobs/admin/paliers/<pk>/`).
- Produces: `jobsService.getAdminPaliers()`, `jobsService.updatePalier(id, data)` — pas de create/delete exposés côté UI pour cette phase (4 paliers fixes, pas de bouton "Ajouter"/"Supprimer" — voir Step 3 pour la justification), export par défaut `AdminPaliers` monté sur la route `/admin-taftech/paliers`.

- [ ] **Step 1: Ajouter les méthodes au service admin**

Dans `taftech_frontend/src/Services/adminService.js`, ajouter après le bloc `deletePremiumPlan` (après la ligne `},` qui suit `throw err; } },` du bloc `deletePremiumPlan`) :

```js
  // Paliers d'abonnement recruteur (Starter/Pro/Business/Enterprise)
  getAdminPaliers: async () => {
    try {
      const response = await api.get("jobs/admin/paliers/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PALIERS", err);
      throw err;
    }
  },

  updatePalier: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/paliers/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PALIER", err);
      throw err;
    }
  },
```

- [ ] **Step 2: Écrire le test du composant (échoue — le composant n'existe pas)**

Créer `taftech_frontend/tests/AdminPaliers.test.jsx` :

```jsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import AdminPaliers from "../src/Pages/Admin/AdminPaliers";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import { ConfirmModalHost } from "../src/utils/confirmToast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminPaliers: vi.fn(),
    updatePalier: vi.fn(),
  },
}));

const mockPaliers = [
  { id: 1, nom: "STARTER", prix_mensuel_da: 5900, prix_annuel_da: 70800, remise_annuelle_active: false, limite_offres: 5, limite_cv_mois: 10, acces_coordonnees: false, acces_ia_recommandes: false, acces_ia_avancee: false, acces_equipe: false, support_label: "Essentiel", ordre: 1, actif: true },
  { id: 2, nom: "PRO", prix_mensuel_da: 12900, prix_annuel_da: 154800, remise_annuelle_active: false, limite_offres: 15, limite_cv_mois: null, acces_coordonnees: true, acces_ia_recommandes: true, acces_ia_avancee: false, acces_equipe: false, support_label: "Prioritaire", ordre: 2, actif: true },
];

describe("🏢 AdminPaliers — panel admin paliers d'abonnement", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminPaliers.mockResolvedValue(mockPaliers);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : affiche la liste des paliers", async () => {
    render(<AdminPaliers />);
    await waitFor(() => {
      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : affiche le prix mensuel de chaque palier", async () => {
    render(<AdminPaliers />);
    await waitFor(() => {
      expect(screen.getByText(/5[\s,.]?900/)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : modifier le prix d'un palier appelle updatePalier", async () => {
    jobsService.updatePalier.mockResolvedValue({});
    render(<><AdminPaliers /><ConfirmModalHost /></>);
    await waitFor(() => expect(screen.getByText("Starter")).toBeInTheDocument());

    fireEvent.click(screen.getAllByLabelText(/modifier/i)[0]);
    const input = await screen.findByLabelText(/prix mensuel/i);
    fireEvent.change(input, { target: { value: "6900" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer|mettre à jour/i }));

    await waitFor(() => {
      expect(jobsService.updatePalier).toHaveBeenCalledWith(1, expect.objectContaining({ prix_mensuel_da: 6900 }));
    });
  });

  it("🟡 EC1 : liste vide affiche un message", async () => {
    jobsService.getAdminPaliers.mockResolvedValue([]);
    render(<AdminPaliers />);
    await waitFor(() => {
      expect(screen.getByText(/aucun palier/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run tests/AdminPaliers.test.jsx`
Expected: FAIL — `Failed to resolve import "../src/Pages/Admin/AdminPaliers"`.

- [ ] **Step 4: Écrire le composant**

Créer `taftech_frontend/src/Pages/Admin/AdminPaliers.jsx`. Pas de bouton "Ajouter"/"Supprimer" dans cette UI (contrairement à `AdminPremium.jsx`) : les 4 paliers sont fixes (Starter/Pro/Business/Enterprise, seedés par migration, contrainte `unique=True` sur `nom` empêche d'en créer un 5ᵉ avec le même nom) — l'admin ajuste seulement les valeurs (prix, limites, accès) via édition, jamais de création/suppression de ligne pour cette phase. Modale d'édition avec tous les champs du modèle :

```jsx
import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Pencil, X } from "lucide-react";
import { tw } from "../../theme";

const NOM_LABELS = { STARTER: "Starter", PRO: "Pro", BUSINESS: "Business", ENTERPRISE: "Enterprise" };

const AdminPaliers = () => {
  const [paliers, setPaliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchPaliers = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminPaliers();
      setPaliers(data);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PALIERS", err);
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaliers();
  }, []);

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setForm({ ...p });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      prix_mensuel_da: form.prix_mensuel_da === "" ? null : Number(form.prix_mensuel_da),
      prix_annuel_da: form.prix_annuel_da === "" ? null : Number(form.prix_annuel_da),
      limite_offres: form.limite_offres === "" ? null : Number(form.limite_offres),
      limite_cv_mois: form.limite_cv_mois === "" ? null : Number(form.limite_cv_mois),
      ordre: Number(form.ordre) || 0,
    };
    try {
      await jobsService.updatePalier(editingId, payload);
      toast.success("Palier mis à jour !");
      setShowModal(false);
      fetchPaliers();
    } catch (err) {
      reportError("ECHEC_UPDATE_PALIER", err);
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className={tw.pageTitle}>Config. Paliers</h1>
        <p className={`${tw.pageSubtitle} mt-0.5`}>
          Prix, limites et accès des 4 formules d'abonnement recruteur — sans toucher au code.
        </p>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Palier</th>
                <th className="px-5 py-3">Prix mensuel</th>
                <th className="px-5 py-3">Prix annuel</th>
                <th className="px-5 py-3">Limite offres</th>
                <th className="px-5 py-3">Limite CV/mois</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="7" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : paliers.length === 0 ? (
                <tr><td colSpan="7" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun palier configuré.</td></tr>
              ) : (
                paliers.map((p) => (
                  <tr key={p.id} className={tw.rowHover}>
                    <td className="px-5 py-3"><p className={`text-sm font-bold ${tw.textStrong}`}>{NOM_LABELS[p.nom] || p.nom}</p></td>
                    <td className="px-5 py-3 text-sm">{p.prix_mensuel_da != null ? `${p.prix_mensuel_da.toLocaleString("fr-FR")} DA` : "Sur devis"}</td>
                    <td className="px-5 py-3 text-sm">{p.prix_annuel_da != null ? `${p.prix_annuel_da.toLocaleString("fr-FR")} DA` : "—"}</td>
                    <td className="px-5 py-3 text-sm">{p.limite_offres != null ? p.limite_offres : "Illimité"}</td>
                    <td className="px-5 py-3 text-sm">{p.limite_cv_mois != null ? p.limite_cv_mois : "Illimité"}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${p.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {p.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button aria-label={`Modifier ${NOM_LABELS[p.nom] || p.nom}`} onClick={() => handleOpenEdit(p)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
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
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Modifier {NOM_LABELS[form.nom] || form.nom}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="prix_mensuel_da" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix mensuel (DA) — vide = "Sur devis"</label>
                <input id="prix_mensuel_da" type="number" min="1" className={inputClass} value={form.prix_mensuel_da ?? ""} onChange={(e) => setForm({ ...form, prix_mensuel_da: e.target.value })} />
              </div>
              <div>
                <label htmlFor="prix_annuel_da" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix annuel (DA)</label>
                <input id="prix_annuel_da" type="number" min="1" className={inputClass} value={form.prix_annuel_da ?? ""} onChange={(e) => setForm({ ...form, prix_annuel_da: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remise_annuelle_active" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.remise_annuelle_active} onChange={(e) => setForm({ ...form, remise_annuelle_active: e.target.checked })} />
                <label htmlFor="remise_annuelle_active" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Afficher la remise annuelle</label>
              </div>
              <div>
                <label htmlFor="limite_offres" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Limite offres actives (vide = illimité)</label>
                <input id="limite_offres" type="number" min="1" className={inputClass} value={form.limite_offres ?? ""} onChange={(e) => setForm({ ...form, limite_offres: e.target.value })} />
              </div>
              <div>
                <label htmlFor="limite_cv_mois" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Limite CV/mois (vide = illimité)</label>
                <input id="limite_cv_mois" type="number" min="1" className={inputClass} value={form.limite_cv_mois ?? ""} onChange={(e) => setForm({ ...form, limite_cv_mois: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acces_coordonnees" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.acces_coordonnees} onChange={(e) => setForm({ ...form, acces_coordonnees: e.target.checked })} />
                <label htmlFor="acces_coordonnees" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Coordonnées candidats visibles</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acces_ia_recommandes" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.acces_ia_recommandes} onChange={(e) => setForm({ ...form, acces_ia_recommandes: e.target.checked })} />
                <label htmlFor="acces_ia_recommandes" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Candidats recommandés (IA)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acces_ia_avancee" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.acces_ia_avancee} onChange={(e) => setForm({ ...form, acces_ia_avancee: e.target.checked })} />
                <label htmlFor="acces_ia_avancee" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Recherche/filtres/stats IA avancés</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acces_equipe" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.acces_equipe} onChange={(e) => setForm({ ...form, acces_equipe: e.target.checked })} />
                <label htmlFor="acces_equipe" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Gestion d'équipe multi-utilisateurs</label>
              </div>
              <div>
                <label htmlFor="support_label" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Support (texte libre)</label>
                <input id="support_label" className={inputClass} value={form.support_label ?? ""} onChange={(e) => setForm({ ...form, support_label: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="palier_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                <label htmlFor="palier_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Palier actif (visible/achetable)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>Mettre à jour</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaliers;
```

- [ ] **Step 5: Brancher la route et le lien sidebar**

Dans `taftech_frontend/src/App.jsx`, trouver la ligne `const AdminPremium = lazy(() => import("./Pages/Admin/AdminPremium"));` (ou équivalent import lazy des pages admin CMS) et ajouter juste après :

```js
const AdminPaliers = lazy(() => import("./Pages/Admin/AdminPaliers"));
```

Puis dans le bloc de routes admin (`<Route path="/admin-taftech" ...>`), après la ligne `<Route path="/admin-taftech/premium-config" element={<AdminPremium />} />`, ajouter :

```jsx
              <Route path="/admin-taftech/paliers" element={<AdminPaliers />} />
```

Dans `taftech_frontend/src/Pages/Admin/AdminLayout.jsx` :
1. Ajouter `Layers` à l'import `lucide-react` en haut du fichier (dans la liste existante, par exemple juste après `CreditCard,`).
2. Dans le tableau de navigation, section `"Système"`, ajouter après la ligne `{ to: "/admin-taftech/premium-config", icon: CreditCard, label: "Config. Premium" },` :

```jsx
      { to: "/admin-taftech/paliers", icon: Layers, label: "Config. Paliers" },
```

- [ ] **Step 6: Lancer le test pour vérifier qu'il passe**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run tests/AdminPaliers.test.jsx`
Expected: PASS — 4/4 tests verts.

- [ ] **Step 7: Suite frontend complète**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run`
Expected: 100% des tests passent.

- [ ] **Step 8: Build**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build propre.

- [ ] **Step 9: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Pages/Admin/AdminPaliers.jsx taftech_frontend/src/Services/adminService.js taftech_frontend/src/App.jsx taftech_frontend/src/Pages/Admin/AdminLayout.jsx taftech_frontend/tests/AdminPaliers.test.jsx
git commit -m "feat: panel admin AdminPaliers (CRUD des 4 paliers d'abonnement)"
```

---

### Task 5: Vérification finale + documentation

**Files:** aucun changement de code — vérification et documentation uniquement.

- [ ] **Step 1: Suite backend complète**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests`
Expected: 100% des tests passent.

- [ ] **Step 2: Suite frontend complète + build**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run && npx vite build`
Expected: 100% des tests passent, build propre.

- [ ] **Step 3: `python manage.py check`**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py check`
Expected: `System check identified no issues`.

- [ ] **Step 4: Vérification manuelle du panel admin en conditions réelles**

Run backend (`python manage.py runserver`) et frontend (`npm run dev`) dans deux terminaux séparés. Se connecter en ADMIN, ouvrir `/admin-taftech/paliers`, vérifier : les 4 paliers s'affichent avec les bonnes valeurs (Starter 5900 DA, Pro 12900 DA, Business 22900 DA, Enterprise "Sur devis") ; modifier un prix et vérifier la mise à jour immédiate dans le tableau.

- [ ] **Step 5: Mettre à jour CLAUDE.md**

Ajouter une entrée de session documentant : nouveaux modèles `Palier`/`AbonnementEntreprise`, CRUD admin + lecture publique, seed des 4 paliers avec les valeurs exactes, migration des entreprises Premium existantes vers Business, panel `AdminPaliers.jsx`. Préciser explicitement que **le gating existant n'a pas changé** (CVthèque/limite offres/IA lisent toujours `ProfilEntreprise.est_premium_actif`, pas les nouveaux paliers) — c'est la Phase 2b, à faire dans un plan séparé. Référencer le spec complet.

- [ ] **Step 6: Commit final**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add CLAUDE.md
git commit -m "docs: documenter la Phase 2a (modele Paliers backend + admin) dans CLAUDE.md"
```
