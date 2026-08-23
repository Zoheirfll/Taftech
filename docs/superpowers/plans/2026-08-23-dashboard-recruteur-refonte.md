# Refonte Dashboard Recruteur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer entièrement `DashboardRecruteur.jsx` par une nouvelle page conforme au mockup employeur (5 KPI avec période comparative, évolution + funnel, table offres actives, donut sources, candidats recommandés avec actions, activité récente, mini-recherche CVthèque, CTA génération IA inline, page Évaluations, recherches sauvegardées, intitulé de poste recruteur).

**Architecture:** Extension de `DashboardRecruteurAPIView` (paramètres de période, KPIs comparatifs) + 3 nouvelles vues API (activité récente, rapport PDF, recherches sauvegardées) + 1 nouveau modèle (`RechercheSauvegardee`) + 1 champ (`CustomUser.intitule_poste`). Frontend : nouvelle page composée de sous-composants réutilisables (`FunnelChart`, cartes KPI, widgets), consolidation des graphiques avancés de l'ancien dashboard.

**Tech Stack:** Django 5.2 + DRF, PostgreSQL (port 5433), React 18 + Vite, Tailwind (tokens `tw.*`), Vitest, ReportLab (PDF). Dépend du plan `2026-08-23-source-candidature-invitation-cvtheque.md` (doit être appliqué avant de commencer celui-ci — `Candidature.source` et `jobsService.inviterCandidatCVTheque` sont des prérequis).

## Global Constraints

- Ne pas casser les pages déjà construites en Phase 2b qui consomment `jobsService.getDashboard()` (`OffresListPage.jsx`, `CandidaturesListPage.jsx`, etc.) — les nouveaux champs (`kpis`, `periode`) s'ajoutent à la réponse existante, rien n'est retiré.
- `StatistiquesPage.jsx` n'est PAS touchée par ce plan (reste la vue détaillée séparée) — seuls les graphiques avancés de l'ancien `DashboardRecruteur.jsx` migrent dans le nouveau dashboard.
- Tous les nouveaux endpoints : `IsAuthenticated` + `get_entreprise_for_user()`, scope strict à l'entreprise de l'utilisateur connecté.
- Funnel : 4 étapes réelles (Candidatures reçues → Présélection → Entretiens → Retenues), pas 5 (voir spec, "Offres envoyées" fusionné avec "Recrutements").
- Tests (`python manage.py test jobs.tests`, `npm test -- --run`) à 100 % et `npx vite build` propre à la fin (Task 9).

---

### Task 1: Modèle `RechercheSauvegardee` + champ `intitule_poste`

**Files:**
- Modify: `taftech_backend/jobs/models.py`
- Modify: `taftech_backend/accounts/models.py`
- Create: migrations via `makemigrations`

**Interfaces:**
- Produces: `RechercheSauvegardee` (`entreprise` FK, `nom` CharField, `filtres` JSONField, `date_creation` auto) ; `CustomUser.intitule_poste` (CharField blank). Consommés par Task 2 (endpoints) et Task 6 (frontend Paramètres/topbar).

- [ ] **Step 1: Modèle `RechercheSauvegardee`**

Dans `taftech_backend/jobs/models.py`, après la classe `InvitationCVTheque` (ajoutée par le plan précédent), ajouter :

```python
class RechercheSauvegardee(models.Model):
    """Filtres CVthèque sauvegardés par un recruteur pour être rappelés plus tard —
    voir docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md."""
    entreprise = models.ForeignKey(
        'ProfilEntreprise', on_delete=models.CASCADE, related_name='recherches_sauvegardees'
    )
    nom = models.CharField(max_length=100, verbose_name="Nom de la recherche")
    filtres = models.JSONField(default=dict, verbose_name="Filtres (query params CVthèque)")
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.nom} ({self.entreprise.nom_entreprise})"
```

- [ ] **Step 2: Champ `intitule_poste`**

Dans `taftech_backend/accounts/models.py`, trouver la classe `CustomUser` et son champ `telephone` (ou équivalent proche). Ajouter juste après :

```python
    intitule_poste = models.CharField(
        max_length=100, blank=True, default='',
        verbose_name="Intitulé de poste (recruteur, cosmétique)",
    )
```

- [ ] **Step 3: Migrations**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py makemigrations jobs accounts`
Expected: 2 migrations créées (une par app).

Run: `python manage.py migrate`
Expected: appliquées sans erreur.

- [ ] **Step 4: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/models.py taftech_backend/accounts/models.py taftech_backend/jobs/migrations/ taftech_backend/accounts/migrations/
git commit -m "feat: modele RechercheSauvegardee + champ CustomUser.intitule_poste"
```

---

### Task 2: KPIs avec période dans `DashboardRecruteurAPIView`

**Files:**
- Modify: `taftech_backend/jobs/views/recruteur.py`

**Interfaces:**
- Consumes: `Candidature.source`, `Candidature.statut`, `Candidature.date_postulation` (existants).
- Produces: réponse `DashboardRecruteurAPIView` enrichie de `kpis` (dict) et `periode` (dict `{date_debut, date_fin}`), acceptant `?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD`.

- [ ] **Step 1: Fonction de calcul des KPIs**

Dans `taftech_backend/jobs/views/recruteur.py`, avant la classe `DashboardRecruteurAPIView`, ajouter :

```python
def _calculer_kpis_periode(entreprise, date_debut, date_fin):
    """Calcule les 5 KPIs du dashboard sur [date_debut, date_fin] et la variation % vs la
    période précédente de même durée. Voir docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md."""
    duree = (date_fin - date_debut).days + 1
    debut_precedent = date_debut - datetime.timedelta(days=duree)
    fin_precedent = date_debut - datetime.timedelta(days=1)

    def _kpis_sur_fenetre(debut, fin):
        candidatures = Candidature.objects.filter(
            offre__entreprise=entreprise,
            date_postulation__date__gte=debut, date_postulation__date__lte=fin,
        )
        recues = candidatures.count()
        entretien = candidatures.filter(statut='ENTRETIEN').count()
        recrutements = candidatures.filter(statut='RETENU').count()
        taux = round((recrutements / recues * 100), 2) if recues else 0.0
        return recues, entretien, recrutements, taux

    recues, entretien, recrutements, taux = _kpis_sur_fenetre(date_debut, date_fin)
    recues_prec, entretien_prec, recrutements_prec, taux_prec = _kpis_sur_fenetre(debut_precedent, fin_precedent)

    def _variation(actuel, precedent):
        if not precedent:
            return None
        return round(((actuel - precedent) / precedent) * 100, 1)

    offres_actives = OffreEmploi.objects.filter(
        entreprise=entreprise, est_active=True, est_cloturee=False, statut_moderation='APPROUVEE',
    ).count()
    offres_actives_avant = OffreEmploi.objects.filter(
        entreprise=entreprise, est_active=True, est_cloturee=False, statut_moderation='APPROUVEE',
        date_publication__date__lte=debut_precedent,
    ).count()

    return {
        "offres_actives": {"valeur": offres_actives, "variation_pct": _variation(offres_actives, offres_actives_avant)},
        "candidatures_recues": {"valeur": recues, "variation_pct": _variation(recues, recues_prec)},
        "candidats_entretien": {"valeur": entretien, "variation_pct": _variation(entretien, entretien_prec)},
        "recrutements": {"valeur": recrutements, "variation_pct": _variation(recrutements, recrutements_prec)},
        "taux_conversion": {"valeur": taux, "variation_pct": _variation(taux, taux_prec)},
    }
```

Vérifier que `import datetime` est déjà présent en tête de `recruteur.py` (il l'est, utilisé ailleurs) et que `OffreEmploi`/`Candidature` sont bien importés depuis `..models`.

- [ ] **Step 2: Brancher dans `DashboardRecruteurAPIView.get()`**

Dans la méthode `get()` de `DashboardRecruteurAPIView` (`jobs/views/recruteur.py`), juste avant la construction du dict `data = {...}` (ligne ~57), ajouter :

```python
        date_fin_str = request.GET.get('date_fin')
        date_debut_str = request.GET.get('date_debut')
        aujourdhui = timezone.now().date()
        try:
            date_fin = datetime.date.fromisoformat(date_fin_str) if date_fin_str else aujourdhui
            date_debut = datetime.date.fromisoformat(date_debut_str) if date_debut_str else (date_fin - datetime.timedelta(days=30))
        except ValueError:
            return Response({"error": "Format de date invalide (attendu YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)
        if date_fin < date_debut:
            return Response({"error": "date_fin doit être postérieure ou égale à date_debut."}, status=status.HTTP_400_BAD_REQUEST)
        kpis = _calculer_kpis_periode(entreprise, date_debut, date_fin)
```

Puis dans le dict `data` retourné, ajouter les clés :

```python
            "kpis": kpis,
            "periode": {"date_debut": date_debut.isoformat(), "date_fin": date_fin.isoformat()},
```

- [ ] **Step 3: Vérification manuelle**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py check`
Expected: `System check identified no issues`.

- [ ] **Step 4: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/views/recruteur.py
git commit -m "feat: KPIs comparatifs par periode dans DashboardRecruteurAPIView"
```

---

### Task 3: `ActiviteRecenteAPIView`

**Files:**
- Modify: `taftech_backend/jobs/views/recruteur.py`
- Modify: `taftech_backend/jobs/views/__init__.py`
- Modify: `taftech_backend/jobs/urls.py`
- Modify: `taftech_backend/jobs/views/candidatures.py` (log candidature reçue)
- Modify: `taftech_backend/jobs/views/profils.py` (log favori ajouté)

**Interfaces:**
- Consumes: `EquipeActionLog` (existant).
- Produces: `GET jobs/dashboard/activite-recente/` (name `dashboard-activite-recente`) → liste de `{id, phrase, date}`.

- [ ] **Step 1: Vue**

Dans `taftech_backend/jobs/views/recruteur.py`, ajouter après `_calculer_kpis_periode` (ou en fin de fichier, avant la dernière classe) :

```python
_TEMPLATES_ACTIVITE = {
    'CONNEXION': "{membre} s'est connecté(e)",
    'CREER_OFFRE': "{membre} a publié une nouvelle offre : {detail}",
    'MODIFIER_OFFRE': "{membre} a modifié une offre : {detail}",
    'CLOTURER_OFFRE': "{membre} a clôturé une offre : {detail}",
    'STATUT_CANDIDATURE': "{membre} a changé le statut d'une candidature : {detail}",
    'EVALUER_CANDIDATURE': "{membre} a évalué une candidature : {detail}",
    'INVITER_MEMBRE': "{membre} a invité un membre : {detail}",
    'RETIRER_MEMBRE': "{membre} a retiré un membre : {detail}",
    'CHANGER_ROLE': "{membre} a changé un rôle : {detail}",
    'AUTRE': "{detail}",
}


class ActiviteRecenteAPIView(APIView):
    """Fil d'activité récente de l'entreprise (10 derniers événements), formaté en phrases
    lisibles — voir docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        logs = EquipeActionLog.objects.filter(entreprise=entreprise).select_related('membre').order_by('-date')[:10]
        resultats = []
        for log in logs:
            membre_nom = log.membre.first_name or log.membre.email if log.membre else "Un membre"
            template = _TEMPLATES_ACTIVITE.get(log.action, "{detail}")
            phrase = template.format(membre=membre_nom, detail=log.detail or "")
            resultats.append({"id": log.id, "phrase": phrase.strip(), "date": log.date.isoformat()})
        return Response(resultats)
```

- [ ] **Step 2: Brancher la vue**

Dans `taftech_backend/jobs/views/__init__.py`, ajouter `ActiviteRecenteAPIView,` au bloc d'import de `recruteur.py`.

Dans `taftech_backend/jobs/urls.py`, avant le catch-all `<str:offre_id>/`, ajouter :

```python
    path('dashboard/activite-recente/', ActiviteRecenteAPIView.as_view(), name='dashboard-activite-recente'),
```

(et importer `ActiviteRecenteAPIView` dans le bloc d'import du fichier).

- [ ] **Step 3: Logger la candidature reçue**

Dans `taftech_backend/jobs/views/candidatures.py`, dans `PostulerAPIView.post()`, juste après la création de `candidature` (après le bloc `candidature = Candidature.objects.create(...)`), ajouter :

```python
        from .equipe import _log
        _log(None, offre.entreprise, 'AUTRE', f"Nouvelle candidature reçue pour « {offre.titre} » ({request.user.first_name} {request.user.last_name})")
```

Vérifier la signature exacte de `_log()` dans `jobs/views/equipe.py` (elle est documentée dans CLAUDE.md comme `_log(user, entreprise, action, detail)` — si `user=None` n'est pas géré proprement par cette fonction, l'appeler avec `request.user` du candidat à la place, à vérifier en lisant `equipe.py`).

- [ ] **Step 4: Logger l'ajout aux favoris**

Dans `taftech_backend/jobs/views/profils.py`, trouver la vue qui gère l'ajout d'un candidat aux favoris (`ProfilCandidatFavori`, chercher `favori` dans ce fichier). Après la création réussie du favori, ajouter un appel similaire à `_log(request.user, entreprise, 'AUTRE', f"{candidat.first_name} {candidat.last_name} a été ajouté(e) aux favoris")` — importer `_log` depuis `.equipe` et `get_entreprise_for_user` si pas déjà présents dans ce fichier.

- [ ] **Step 5: Vérification manuelle**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py check`
Expected: `System check identified no issues`.

- [ ] **Step 6: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/views/recruteur.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/urls.py taftech_backend/jobs/views/candidatures.py taftech_backend/jobs/views/profils.py
git commit -m "feat: endpoint activite recente + logs candidature/favori"
```

---

### Task 4: `RecherchesSauvegardeesAPIView` + rapport PDF

**Files:**
- Modify: `taftech_backend/jobs/views/recruteur.py`
- Modify: `taftech_backend/jobs/views/__init__.py`
- Modify: `taftech_backend/jobs/urls.py`

**Interfaces:**
- Consumes: `RechercheSauvegardee` (Task 1), `_calculer_kpis_periode` (Task 2).
- Produces: `GET/POST jobs/cvtheque/recherches-sauvegardees/` (name `recherches-sauvegardees`), `DELETE jobs/cvtheque/recherches-sauvegardees/<id>/` (name `recherche-sauvegardee-detail`) ; `GET jobs/dashboard/rapport-pdf/` (name `dashboard-rapport-pdf`).

- [ ] **Step 1: Vue recherches sauvegardées**

Dans `taftech_backend/jobs/views/recruteur.py`, ajouter :

```python
class RecherchesSauvegardeesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        recherches = RechercheSauvegardee.objects.filter(entreprise=entreprise)
        return Response([
            {"id": r.id, "nom": r.nom, "filtres": r.filtres, "date_creation": r.date_creation.isoformat()}
            for r in recherches
        ])

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, entreprise) == 'INVITE':
            return Response({"error": "Action non autorisée pour votre rôle."}, status=403)
        if RechercheSauvegardee.objects.filter(entreprise=entreprise).count() >= 20:
            return Response({"error": "Limite de 20 recherches sauvegardées atteinte."}, status=400)
        nom = (request.data.get('nom') or '').strip()
        filtres = request.data.get('filtres') or {}
        if not nom:
            return Response({"error": "Le nom de la recherche est requis."}, status=400)
        recherche = RechercheSauvegardee.objects.create(entreprise=entreprise, nom=nom[:100], filtres=filtres)
        return Response({"id": recherche.id, "nom": recherche.nom, "filtres": recherche.filtres}, status=201)

    def delete(self, request, pk=None):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, entreprise) == 'INVITE':
            return Response({"error": "Action non autorisée pour votre rôle."}, status=403)
        try:
            RechercheSauvegardee.objects.get(id=pk, entreprise=entreprise).delete()
            return Response({"message": "Supprimée."})
        except RechercheSauvegardee.DoesNotExist:
            return Response({"error": "Introuvable."}, status=404)
```

- [ ] **Step 2: Vue rapport PDF**

Ajouter (s'inspirer du style ReportLab déjà utilisé dans `jobs/views/facturation.py::FacturePDFAPIView` — bandeau indigo, mêmes couleurs `#204883`/`#307020`) :

```python
class RapportDashboardPDFAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        date_fin_str = request.GET.get('date_fin')
        date_debut_str = request.GET.get('date_debut')
        aujourdhui = timezone.now().date()
        try:
            date_fin = datetime.date.fromisoformat(date_fin_str) if date_fin_str else aujourdhui
            date_debut = datetime.date.fromisoformat(date_debut_str) if date_debut_str else (date_fin - datetime.timedelta(days=30))
        except ValueError:
            return Response({"error": "Format de date invalide."}, status=400)

        kpis = _calculer_kpis_periode(entreprise, date_debut, date_fin)

        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        import io

        INDIGO = colors.HexColor("#204883")
        SLATE = colors.HexColor("#1e293b")
        BG_LIGHT = colors.HexColor("#f8fafc")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm, topMargin=15 * mm, bottomMargin=20 * mm)
        story = []
        s_title = ParagraphStyle("title", fontSize=16, textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_LEFT)
        s_h2 = ParagraphStyle("h2", fontSize=12, textColor=INDIGO, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=6)
        s_body = ParagraphStyle("body", fontSize=9, textColor=SLATE, fontName="Helvetica")

        header_table = Table([[Paragraph(f"TafTech — Rapport dashboard<br/>{entreprise.nom_entreprise}", s_title)]], colWidths=[170 * mm])
        header_table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), INDIGO), ('TOPPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 12), ('LEFTPADDING', (0, 0), (-1, -1), 12)]))
        story.append(header_table)
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"Période : {date_debut.strftime('%d/%m/%Y')} — {date_fin.strftime('%d/%m/%Y')}", s_body))
        story.append(Paragraph("Indicateurs clés", s_h2))

        kpi_rows = [["Indicateur", "Valeur"]]
        libelles = {
            "offres_actives": "Offres actives", "candidatures_recues": "Candidatures reçues",
            "candidats_entretien": "Candidats en entretien", "recrutements": "Recrutements",
            "taux_conversion": "Taux de conversion (%)",
        }
        for cle, libelle in libelles.items():
            kpi_rows.append([libelle, str(kpis[cle]["valeur"])])
        kpi_table = Table(kpi_rows, colWidths=[110 * mm, 60 * mm])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9), ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 14))

        story.append(Paragraph("Top 5 offres (candidatures reçues sur la période)", s_h2))
        offres_periode = OffreEmploi.objects.filter(entreprise=entreprise).annotate(
            nb_candidatures_periode=models.Count(
                'candidatures', filter=models.Q(
                    candidatures__date_postulation__date__gte=date_debut,
                    candidatures__date_postulation__date__lte=date_fin,
                )
            )
        ).order_by('-nb_candidatures_periode')[:5]
        offres_rows = [["Offre", "Candidatures"]]
        for o in offres_periode:
            offres_rows.append([o.titre, str(o.nb_candidatures_periode)])
        offres_table = Table(offres_rows, colWidths=[130 * mm, 40 * mm])
        offres_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9), ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(offres_table)

        doc.build(story)
        buffer.seek(0)
        from django.http import HttpResponse
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="rapport_taftech_{date_debut}_{date_fin}.pdf"'
        return response
```

Vérifier que `from django.db import models` (pour `models.Count`/`models.Q`) est disponible — dans ce fichier `Q` est déjà importé (`from django.db.models import Q, Sum, F, ...`), ajouter `Count` à cet import existant plutôt que `from django.db import models`.

- [ ] **Step 3: Brancher les 2 vues**

Dans `taftech_backend/jobs/views/__init__.py`, ajouter `RecherchesSauvegardeesAPIView, RapportDashboardPDFAPIView,` au bloc d'import de `recruteur.py`.

Dans `taftech_backend/jobs/urls.py`, avant le catch-all, ajouter :

```python
    path('cvtheque/recherches-sauvegardees/', RecherchesSauvegardeesAPIView.as_view(), name='recherches-sauvegardees'),
    path('cvtheque/recherches-sauvegardees/<int:pk>/', RecherchesSauvegardeesAPIView.as_view(), name='recherche-sauvegardee-detail'),
    path('dashboard/rapport-pdf/', RapportDashboardPDFAPIView.as_view(), name='dashboard-rapport-pdf'),
```

- [ ] **Step 4: Vérification + commit**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py check`
Expected: `System check identified no issues`.

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/views/recruteur.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/urls.py
git commit -m "feat: recherches sauvegardees CVtheque + rapport PDF dashboard"
```

---

### Task 5: Services frontend

**Files:**
- Modify: `taftech_frontend/src/Services/recruteurService.js`

**Interfaces:**
- Consumes: endpoints Task 2/3/4.
- Produces: `jobsService.getDashboard(dateDebut, dateFin)` (étendu), `jobsService.getActiviteRecente()`, `jobsService.getRecherchesSauvegardees()`, `jobsService.creerRechercheSauvegardee(nom, filtres)`, `jobsService.supprimerRechercheSauvegardee(id)`, `jobsService.telechargerRapportDashboard(dateDebut, dateFin)`.

- [ ] **Step 1: Étendre `getDashboard`**

Dans `taftech_frontend/src/Services/recruteurService.js`, trouver la méthode `getDashboard` existante. La modifier pour accepter des params optionnels :

```js
  getDashboard: async (dateDebut, dateFin) => {
    try {
      const params = {};
      if (dateDebut) params.date_debut = dateDebut;
      if (dateFin) params.date_fin = dateFin;
      const response = await api.get("jobs/dashboard/", { params });
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_DASHBOARD", err);
      throw err;
    }
  },
```

(adapter si la méthode existante a un nom d'endpoint légèrement différent — vérifier la valeur exacte de l'URL déjà utilisée dans le fichier avant de la remplacer).

- [ ] **Step 2: Nouvelles méthodes**

Ajouter à la suite dans le même fichier :

```js
  getActiviteRecente: async () => {
    try {
      const response = await api.get("jobs/dashboard/activite-recente/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ACTIVITE_RECENTE", err);
      throw err;
    }
  },

  getRecherchesSauvegardees: async () => {
    try {
      const response = await api.get("jobs/cvtheque/recherches-sauvegardees/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_RECHERCHES_SAUVEGARDEES", err);
      throw err;
    }
  },

  creerRechercheSauvegardee: async (nom, filtres) => {
    try {
      const response = await api.post("jobs/cvtheque/recherches-sauvegardees/", { nom, filtres });
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_RECHERCHE_SAUVEGARDEE", err);
      throw err;
    }
  },

  supprimerRechercheSauvegardee: async (id) => {
    try {
      await api.delete(`jobs/cvtheque/recherches-sauvegardees/${id}/`);
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_RECHERCHE_SAUVEGARDEE", err);
      throw err;
    }
  },

  telechargerRapportDashboard: async (dateDebut, dateFin) => {
    try {
      const response = await api.get("jobs/dashboard/rapport-pdf/", {
        params: { date_debut: dateDebut, date_fin: dateFin },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `rapport_taftech_${dateDebut}_${dateFin}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      reportError("ECHEC_TELECHARGER_RAPPORT", err);
      throw err;
    }
  },
```

- [ ] **Step 3: Build de vérification**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build propre.

- [ ] **Step 4: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Services/recruteurService.js
git commit -m "feat: services frontend dashboard (periode, activite, recherches, rapport PDF)"
```

---

### Task 6: `FunnelChart.jsx` + intitulé de poste + icône Messages topbar

**Files:**
- Create: `taftech_frontend/src/Components/FunnelChart.jsx`
- Modify: `taftech_frontend/src/Pages/Recruteur/ParametresRecruteur.jsx`
- Modify: `taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx`

**Interfaces:**
- Produces: `<FunnelChart etapes={[{label, count, pct, couleur}]} />` — composant réutilisable, consommé par Task 7.

- [ ] **Step 1: `FunnelChart.jsx`**

Créer `taftech_frontend/src/Components/FunnelChart.jsx` :

```jsx
import React from "react";

/**
 * Funnel SVG : trapèzes empilés, largeur proportionnelle au % de la première étape.
 * etapes: [{ label, count, pct, couleur }] — couleur = classe hex ("#4f46e5") ou token CSS.
 */
const FunnelChart = ({ etapes = [] }) => {
  if (!etapes.length) return null;
  const largeurMax = 320;
  const largeurMin = 80;
  const hauteurEtape = 42;
  const total = etapes[0]?.count || 1;

  const largeurPour = (count) => {
    const ratio = total ? count / total : 0;
    return Math.max(largeurMin, largeurMax * ratio);
  };

  return (
    <div className="flex flex-col items-center gap-1.5" role="img" aria-label="Pipeline de recrutement">
      {etapes.map((etape, i) => {
        const wActuelle = largeurPour(etape.count);
        const wSuivante = i < etapes.length - 1 ? largeurPour(etapes[i + 1].count) : wActuelle;
        const xActuelle = (largeurMax - wActuelle) / 2;
        const xSuivante = (largeurMax - wSuivante) / 2;
        return (
          <svg key={etape.label} width={largeurMax} height={hauteurEtape} className="overflow-visible">
            <polygon
              points={`${xActuelle},0 ${xActuelle + wActuelle},0 ${xSuivante + wSuivante},${hauteurEtape - 4} ${xSuivante},${hauteurEtape - 4}`}
              fill={etape.couleur}
            />
            <text x={largeurMax / 2} y={hauteurEtape / 2 - 2} textAnchor="middle" fontSize="12" fontWeight="600" fill="white">
              {etape.label}  {etape.count}  ({etape.pct}%)
            </text>
          </svg>
        );
      })}
    </div>
  );
};

export default FunnelChart;
```

- [ ] **Step 2: Champ `intitule_poste` dans Paramètres**

Dans `taftech_frontend/src/Pages/Recruteur/ParametresRecruteur.jsx`, onglet "Mon profil" : trouver le champ existant le plus proche (ex. `telephone` ou `first_name`) et ajouter un input contrôlé équivalent pour `intitule_poste` (même pattern `value`/`onChange`/`className={inputClass}` que les champs voisins de cet onglet), avec `label` "Intitulé de poste (ex: Responsable RH)". Trouver l'appel de sauvegarde de ce formulaire (`jobsService.updateProfil...` ou équivalent déjà présent dans ce fichier) et ajouter `intitule_poste` au payload envoyé.

Vérifier côté backend que ce champ est bien accepté : dans `taftech_backend/accounts/views.py`, la vue `MeAPIView`/vue de mise à jour de profil recruteur doit exposer/accepter `intitule_poste` — si le endpoint utilisé ne passe pas déjà tous les champs `CustomUser` en `**request.data`, ajouter `intitule_poste` explicitement à la liste des champs acceptés (chercher le pattern déjà utilisé pour `telephone` dans ce fichier et le reproduire).

- [ ] **Step 3: Topbar — intitulé de poste + icône Messages**

Dans `taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx`, trouver le bloc topbar affichant nom + rôle de l'utilisateur (probablement proche de `Sophie Martin`/`user.first_name` dans le code). Sous le nom, afficher `user.intitule_poste || ROLE_LABELS[membreRole]` (créer un petit mapping `{ PROPRIETAIRE: "Propriétaire", ADMIN: "Administrateur", UTILISATEUR: "Utilisateur", INVITE: "Invité" }` si un équivalent n'existe pas déjà dans ce fichier).

Ajouter une icône Messages (lucide-react `MessageSquare` ou équivalent déjà importé) à côté de la cloche Notifications existante dans la topbar, avec le même compteur non-lues que le lien sidebar "Messages" (réutiliser la variable d'état déjà calculée pour ce badge dans ce fichier — chercher où le badge "12" de la sidebar est actuellement calculé), `onClick={() => navigate("/candidatures-spontanees")}`.

- [ ] **Step 4: Build de vérification**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build propre.

- [ ] **Step 5: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Components/FunnelChart.jsx taftech_frontend/src/Pages/Recruteur/ParametresRecruteur.jsx taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx
git commit -m "feat: composant FunnelChart, intitule de poste recruteur, icone messages topbar"
```

---

### Task 7: Nouvelle page `DashboardRecruteur.jsx` (remplacement complet)

**Files:**
- Modify: `taftech_frontend/src/Pages/Recruteur/DashboardRecruteur.jsx` (réécriture complète)
- Modify: `taftech_frontend/src/Pages/Recruteur/CVTheque.jsx` (bouton message/bookmark sur cartes recommandés — voir Task 8 pour la partie "Candidats recommandés" spécifiquement, ce fichier n'est PAS retouché ici sauf s'il expose déjà le composant carte à réutiliser)
- Modify: `taftech_frontend/src/Pages/Recruteur/CreateJob.jsx`

**Interfaces:**
- Consumes: `jobsService.getDashboard(dateDebut, dateFin)` (Task 5), `FunnelChart` (Task 6), `MiniAreaChart` (existant), `jobsService.getCandidatsRecommandes()` (existant, Phase 2b), `jobsService.getActiviteRecente()` (Task 5), `jobsService.getRecherchesSauvegardees()` (Task 5), `jobsService.telechargerRapportDashboard()` (Task 5), `jobsService.inviterCandidatCVTheque` (plan précédent), `jobsService.toggleFavori` (existant).

- [ ] **Step 1: Structure générale + KPIs + sélecteur de période**

Réécrire `taftech_frontend/src/Pages/Recruteur/DashboardRecruteur.jsx`. Lire d'abord l'ancien fichier en entier pour repérer : les imports déjà en place (`tw`, `jobsService`, icônes lucide-react déjà utilisées), la structure `useState`/`useEffect` de chargement (`dash`), et le pattern de tokens `tw.*` déjà utilisé pour les cartes KPI (à réutiliser tel quel plutôt qu'en inventer de nouveaux).

Structure cible du composant :

```jsx
const [dash, setDash] = useState(null);
const [dateDebut, setDateDebut] = useState(() => {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
});
const [dateFin, setDateFin] = useState(() => new Date().toISOString().slice(0, 10));
const [activite, setActivite] = useState([]);
const [recherches, setRecherches] = useState([]);
const [offreFiltre, setOffreFiltre] = useState("");
const [periodeSources, setPeriodeSources] = useState("30j");

const fetchDashboard = async () => {
  try {
    const data = await jobsService.getDashboard(dateDebut, dateFin);
    setDash(data);
  } catch (err) {
    reportError("ECHEC_DASHBOARD_RECRUTEUR", err);
  }
};

useEffect(() => { fetchDashboard(); }, [dateDebut, dateFin]);
useEffect(() => {
  jobsService.getActiviteRecente().then(setActivite).catch(() => {});
  jobsService.getRecherchesSauvegardees().then(setRecherches).catch(() => {});
}, []);
```

5 cartes KPI, mappées depuis `dash.kpis` :

```jsx
const KPI_CONFIG = [
  { cle: "offres_actives", label: "Offres actives", icon: Briefcase },
  { cle: "candidatures_recues", label: "Candidatures reçues", icon: Users },
  { cle: "candidats_entretien", label: "Candidats en entretien", icon: Calendar },
  { cle: "recrutements", label: "Recrutements", icon: CheckCircle },
  { cle: "taux_conversion", label: "Taux de conversion", icon: TrendingUp, suffixe: "%" },
];

// dans le rendu :
{KPI_CONFIG.map(({ cle, label, icon: Icon, suffixe }) => {
  const kpi = dash?.kpis?.[cle];
  if (!kpi) return null;
  const variation = kpi.variation_pct;
  return (
    <div key={cle} className={tw.card}>
      <div className="flex items-center justify-between p-4">
        <div>
          <p className={`text-xs ${tw.textMuted}`}>{label}</p>
          <p className={`text-2xl font-bold ${tw.textStrong}`}>{kpi.valeur}{suffixe || ""}</p>
          {variation !== null && (
            <p className={`text-xs font-medium ${variation >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {variation >= 0 ? "↗" : "↘"} {Math.abs(variation)}% vs période précédente
            </p>
          )}
        </div>
        <Icon size={20} className={tw.iconMuted} />
      </div>
    </div>
  );
})}
```

Sélecteur de période (2 `<input type="date">` contrôlés par `dateDebut`/`dateFin`) + bouton "Télécharger le rapport" (`onClick={() => jobsService.telechargerRapportDashboard(dateDebut, dateFin)}`).

- [ ] **Step 2: Funnel + graphique évolution (consolidé)**

Calculer les étapes du funnel côté client depuis `dash.offres` (filtré par `offreFiltre` si non vide) et `dateDebut`/`dateFin` :

```jsx
const calculerFunnel = () => {
  if (!dash) return [];
  let candidatures = dash.offres
    .filter((o) => !offreFiltre || String(o.id) === offreFiltre)
    .flatMap((o) => o.candidatures || [])
    .filter((c) => {
      const d = c.date_postulation?.slice(0, 10);
      return d >= dateDebut && d <= dateFin;
    });
  const total = candidatures.length || 1;
  const presel = candidatures.filter((c) => ["PRESELECTION", "ENTRETIEN", "RETENU", "REFUSE"].includes(c.statut)).length;
  const entretien = candidatures.filter((c) => ["ENTRETIEN", "RETENU"].includes(c.statut)).length;
  const retenu = candidatures.filter((c) => c.statut === "RETENU").length;
  return [
    { label: "Candidatures reçues", count: candidatures.length, pct: 100, couleur: "#4f46e5" },
    { label: "Présélection", count: presel, pct: Math.round((presel / total) * 100), couleur: "#6366f1" },
    { label: "Entretiens", count: entretien, pct: Math.round((entretien / total) * 100), couleur: "#0ea5e9" },
    { label: "Recrutements", count: retenu, pct: Math.round((retenu / total) * 100), couleur: "#10b981" },
  ];
};
```

Dropdown "Tous les postes" au-dessus du `<FunnelChart etapes={calculerFunnel()} />` : `<select value={offreFiltre} onChange={(e) => setOffreFiltre(e.target.value)}>` avec `<option value="">Tous les postes</option>` + une option par `dash.offres`.

Graphique évolution : réutiliser `MiniAreaChart` existant. Migrer ici les fonctionnalités avancées de l'ancien `DashboardRecruteur.jsx` (`chartType` toggle, `compareValues`, export PNG/CSV) — copier telles quelles les fonctions `buildEvolutionBuckets`, l'état `chartType`/`comparerPeriode`/`afficherConversion`, et le menu d'export déjà présents dans l'ancien fichier (avant réécriture, les avoir extraites dans un fichier temporaire ou gardées en mémoire depuis la lecture du Step 1) — ne pas les réinventer, ne garder qu'une seule instance de ce graphique sur toute l'app (celle-ci).

- [ ] **Step 3: Table offres actives + donut sources + candidats recommandés + activité récente**

Table "Mes offres d'emploi actives" : `dash.offres.slice(0, 8)`, colonnes `titre`/`candidatures.length`/`entretiens count`/`date_publication`/badge statut, bouton "..." → petit menu dropdown local (`useState` d'ID ouvert) avec 3 actions (Voir les candidatures → `navigate(/dashboard/offres/${id})`, Clôturer → réutilise l'appel déjà existant dans l'ancien dashboard vers `CloturerOffreAPIView`, à retrouver dans le fichier lu au Step 1).

Donut "Sources des candidatures" : calcul client sur `dash.offres[].candidatures[]` filtré par `periodeSources` (état local séparé, indépendant de `dateDebut`/`dateFin` globaux — mapping `{7j: 7, "30j": 30, "6m": 180, "1a": 365}` jours en arrière depuis aujourd'hui), regroupé par `source` (`SITE`/`CVTHEQUE`/`AUTRE`). SVG donut simple (cercle avec `stroke-dasharray` par tranche, pattern déjà utilisé ailleurs dans le projet pour `RadarChart`/`MiniAreaChart` — s'inspirer du style SVG inline déjà en place, pas de nouvelle librairie).

Candidats recommandés IA : `jobsService.getCandidatsRecommandes()` (vérifier le nom exact de la méthode déjà exposée en Phase 2b dans `recruteurService.js`), `.results.slice(0, 3)`. Par carte : icône message (`onClick` ouvre la modale d'invitation — extraire le JSX de modale du plan précédent, Task 5 Step 2, en composant partagé `Components/InviterCandidatModal.jsx` réutilisé ici et dans `CVTheque.jsx` — refactor mineur : déplacer le code de la modale de `CVTheque.jsx` vers ce nouveau composant, l'importer dans les deux fichiers) et icône bookmark (`onClick={() => jobsService.toggleFavori(candidat.user_id)}`, vérifier le nom exact de cette méthode déjà existante dans `recruteurService.js`).

Activité récente : `activite.map((a) => <p key={a.id}>{a.phrase} <span className={tw.textMuted}>· {formatRelativeDate(a.date)}</span></p>)` — utiliser une fonction de formatage relatif déjà présente ailleurs dans le projet si elle existe (chercher `il y a` dans le codebase avant d'en écrire une nouvelle), sinon écrire une petite fonction locale simple (minutes/heures/jours).

- [ ] **Step 4: Recherche CVthèque mini-form + CTA IA + Besoin d'aide**

Mini-formulaire CVthèque (4 champs : mots-clés, secteur, métier, localisation — `<select>` secteur/métier réutilisant `SecteurDomaineSelect.jsx` existant si adapté à un contexte compact, sinon 2 `<select>` simples alimentés par `jobsService.getNomenclature()` déjà en cache module-level). Bouton "Rechercher" : `navigate("/cvtheque?" + new URLSearchParams({search: motsClés, secteur, metier: metier, wilaya: localisation}).toString())`. Lien "Recherche enregistrée" : dropdown listant `recherches`, sélection → `navigate("/cvtheque?" + new URLSearchParams(recherche.filtres).toString())`.

CTA IA : `<input placeholder="Ex: Ingénieur qualité avec 5 ans d'expérience" value={titreIA} onChange={...} />` + bouton "Générer avec l'IA" → `navigate("/creer-offre?titre=" + encodeURIComponent(titreIA))`. Désactivé si `!dash?.palier_actif`.

Besoin d'aide : 3 liens statiques (`/contact`, `mailto:taftech963@gmail.com`, `/pages/formation-recruteur` — cette dernière page créée en Task 9).

- [ ] **Step 5: Wiring `CreateJob.jsx` — auto-génération depuis le titre en query param**

Dans `taftech_frontend/src/Pages/Recruteur/CreateJob.jsx`, trouver le `useEffect` de montage existant (ou en ajouter un si absent) :

```jsx
const [searchParams] = useSearchParams();
useEffect(() => {
  const titreQuery = searchParams.get("titre");
  if (titreQuery) {
    setFormData((prev) => ({ ...prev, titre: titreQuery }));
    // Déclenche la génération IA existante une seule fois si le champ titre est prérempli
    setTimeout(() => handleGenererIA?.(), 0);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Adapter le nom exact de `handleGenererIA` (ou équivalent) au handler déjà utilisé par le bouton "Générer avec l'IA" existant dans ce fichier — le lire avant d'écrire ce `useEffect` pour utiliser le nom exact de la fonction.

- [ ] **Step 6: Build de vérification**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build propre (les tests sont dans Task 9, pas ici — juste vérifier l'absence d'erreur de compilation à cette étape).

- [ ] **Step 7: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Pages/Recruteur/DashboardRecruteur.jsx taftech_frontend/src/Pages/Recruteur/CreateJob.jsx taftech_frontend/src/Components/InviterCandidatModal.jsx taftech_frontend/src/Pages/Recruteur/CVTheque.jsx
git commit -m "feat: refonte complete DashboardRecruteur.jsx (mockup employeur)"
```

---

### Task 8: Page `EvaluationsPage.jsx`

**Files:**
- Create: `taftech_frontend/src/Pages/Recruteur/EvaluationsPage.jsx`
- Modify: `taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx`
- Modify: `taftech_frontend/src/App.jsx`

**Interfaces:**
- Consumes: `jobsService.getDashboard()` (existant).
- Produces: page `/evaluations`.

- [ ] **Step 1: Composant**

Créer `taftech_frontend/src/Pages/Recruteur/EvaluationsPage.jsx`, en s'inspirant directement de la structure déjà en place dans `taftech_frontend/src/Pages/Recruteur/RecrutementsPage.jsx` (page similaire déjà construite en Phase 2b, même pattern d'agrégation client sur `dash.offres`) :

```jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const EvaluationsPage = () => {
  const [dash, setDash] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    jobsService.getDashboard().then(setDash).catch((err) => reportError("ECHEC_EVALUATIONS_PAGE", err));
  }, []);

  const candidaturesEvaluees = (dash?.offres || [])
    .flatMap((o) => (o.candidatures || []).map((c) => ({ ...c, offre_titre: o.titre, offre_id: o.id })))
    .filter((c) => c.note_globale !== null && c.note_globale !== undefined)
    .sort((a, b) => (b.note_globale || 0) - (a.note_globale || 0));

  return (
    <div className="space-y-5">
      <div>
        <h1 className={tw.pageTitle}>Évaluations</h1>
        <p className={`${tw.pageSubtitle} mt-0.5`}>Toutes les candidatures évaluées, toutes offres confondues.</p>
      </div>
      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Candidat</th>
                <th className="px-5 py-3">Offre</th>
                <th className="px-5 py-3">Technique</th>
                <th className="px-5 py-3">Communication</th>
                <th className="px-5 py-3">Motivation</th>
                <th className="px-5 py-3">Expérience</th>
                <th className="px-5 py-3">Note globale /20</th>
                <th className="px-5 py-3">Commentaire</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {candidaturesEvaluees.length === 0 ? (
                <tr><td colSpan="8" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucune candidature évaluée pour le moment.</td></tr>
              ) : (
                candidaturesEvaluees.map((c) => (
                  <tr
                    key={c.id}
                    className={`${tw.rowHover} cursor-pointer`}
                    onClick={() => navigate(`/dashboard/offres/${c.offre_id}`)}
                  >
                    <td className="px-5 py-3 text-sm font-medium">{c.candidat_nom || `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`}</td>
                    <td className="px-5 py-3 text-sm">{c.offre_titre}</td>
                    <td className="px-5 py-3 text-sm">{c.note_technique ?? "—"}</td>
                    <td className="px-5 py-3 text-sm">{c.note_communication ?? "—"}</td>
                    <td className="px-5 py-3 text-sm">{c.note_motivation ?? "—"}</td>
                    <td className="px-5 py-3 text-sm">{c.note_experience ?? "—"}</td>
                    <td className="px-5 py-3 text-sm font-bold">{c.note_globale}/20</td>
                    <td className="px-5 py-3 text-sm truncate max-w-[200px]">{c.commentaire_evaluation || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EvaluationsPage;
```

Vérifier le nom exact du champ candidat dans `CandidatureRecruteurDTO` (`candidat_nom` ou objet `candidat.first_name`/`last_name` — lire `RecrutementsPage.jsx` ou `CandidaturesListPage.jsx` pour le pattern exact déjà utilisé et aligner ce fichier dessus).

- [ ] **Step 2: Route + sidebar**

Dans `taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx`, ajouter dans le tableau de menu, après l'entrée `"Statistiques"` (ligne ~92) :

```jsx
      { name: "Évaluations", path: "/evaluations", icon: Star, minRole: "INVITE" },
```

(vérifier que `Star` est importé depuis `lucide-react` en tête de fichier, sinon l'ajouter à l'import existant).

Dans `taftech_frontend/src/App.jsx` : ajouter `const EvaluationsPage = lazy(() => import("./Pages/Recruteur/EvaluationsPage"));` à côté des autres imports lazy recruteur, et `<Route path="/evaluations" element={<EvaluationsPage />} />` dans le même bloc de routes que `/statistiques`/`/recrutements`.

- [ ] **Step 3: Build de vérification + commit**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build propre.

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Pages/Recruteur/EvaluationsPage.jsx taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx taftech_frontend/src/App.jsx
git commit -m "feat: nouvelle page Evaluations (sidebar recruteur)"
```

---

### Task 9: Page CMS "Formation recruteur" + tests (backend + frontend, à la fin)

**Files:**
- Create: migration de données `taftech_backend/jobs/migrations/00XX_seed_page_formation_recruteur.py`
- Create: `taftech_backend/jobs/tests/test_api_dashboard_refonte.py`
- Create/Modify: `taftech_frontend/tests/DashboardRecruteur.test.jsx` (réécriture)
- Create: `taftech_frontend/tests/FunnelChart.test.jsx`
- Create: `taftech_frontend/tests/EvaluationsPage.test.jsx`

- [ ] **Step 1: Seed de la page CMS "Formation recruteur"**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py makemigrations jobs --empty --name seed_page_formation_recruteur`

Remplacer le contenu généré par :

```python
from django.db import migrations


def seed_page(apps, schema_editor):
    PageStatique = apps.get_model('jobs', 'PageStatique')
    PageStatique.objects.get_or_create(
        slug='formation-recruteur',
        defaults={
            'titre': 'Formation recruteur',
            'contenu_html': '<p>Cette section sera bientôt enrichie de guides et de bonnes pratiques pour tirer le meilleur parti de TafTech. En attendant, contactez-nous à taftech963@gmail.com pour toute question.</p>',
        },
    )


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('jobs', '0085_candidature_source_invitationcvtheque'),  # adapter au nom réel de la dernière migration jobs appliquée
    ]
    operations = [
        migrations.RunPython(seed_page, reverse_noop),
    ]
```

**Note pour l'implémenteur** : remplacer la valeur de `dependencies` par le nom réel de la toute dernière migration `jobs` présente sur le disque au moment de l'exécution (`ls taftech_backend/jobs/migrations/ | tail -5`).

Run: `python manage.py migrate jobs`
Expected: appliquée sans erreur, `PageStatique.objects.get(slug='formation-recruteur')` existe.

- [ ] **Step 2: Tests backend**

Créer `taftech_backend/jobs/tests/test_api_dashboard_refonte.py` — s'inspirer du pattern déjà en place dans `jobs/tests/test_api_paliers_gating.py` (fixtures `_make_entreprise`/`_make_candidat`/`_make_offre`, valeurs valides `specialite="L18"`/`diplome="LICENCE"`/`experience_requise="DEBUTANT"`) :

```python
"""Tests pour la refonte dashboard recruteur (sous-projet 2, voir
docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md)."""
from django.test import TestCase
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
import datetime
from rest_framework.test import APITestCase
from jobs.models import (
    Candidature, OffreEmploi, ProfilEntreprise, Palier, AbonnementEntreprise,
    RechercheSauvegardee, EquipeActionLog,
)
from django.contrib.auth import get_user_model

User = get_user_model()


def _make_entreprise(email="rec_dash@test.dz"):
    user = User.objects.create_user(username=email, email=email, password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise="TestCo", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{email}", est_approuvee=True,
    )
    palier, _ = Palier.objects.get_or_create(nom="BUSINESS", defaults={
        "acces_coordonnees": True, "acces_ia_recommandes": True, "acces_ia_avancee": True, "acces_equipe": True,
    })
    AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


def _make_offre(entreprise):
    return OffreEmploi.objects.create(
        entreprise=entreprise, titre="Poste Test", wilaya="16 - Alger",
        specialite="L18", diplome="LICENCE", experience_requise="DEBUTANT",
        type_contrat="CDI", description="Desc", statut_moderation="APPROUVEE",
        est_active=True, est_cloturee=False,
    )


class DashboardKPIsPeriodeTest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_kpis_presents_dans_reponse(self):
        user, entreprise = _make_entreprise()
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-recruteur"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("kpis", response.data)
        self.assertIn("candidatures_recues", response.data["kpis"])

    def test_date_invalide_rejetee(self):
        user, entreprise = _make_entreprise()
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-recruteur"), {"date_debut": "pas-une-date"})
        self.assertEqual(response.status_code, 400)

    def test_candidatures_comptees_dans_la_fenetre(self):
        user, entreprise = _make_entreprise()
        offre = _make_offre(entreprise)
        candidat = User.objects.create_user(username="c1@test.dz", email="c1@test.dz", password="pwd", role="CANDIDAT")
        Candidature.objects.create(offre=offre, candidat=candidat, score_matching=50, statut="RECUE")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-recruteur"))
        self.assertEqual(response.data["kpis"]["candidatures_recues"]["valeur"], 1)


class ActiviteRecenteAPITest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_scope_entreprise(self):
        user, entreprise = _make_entreprise()
        EquipeActionLog.objects.create(entreprise=entreprise, membre=user, action="CREER_OFFRE", detail="Poste Test")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-activite-recente"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertIn("Poste Test", response.data[0]["phrase"])


class RecherchesSauvegardeesAPITest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_creation_et_liste(self):
        user, entreprise = _make_entreprise()
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("recherches-sauvegardees"), {"nom": "Devs Alger", "filtres": {"wilaya": "16"}}, format="json")
        self.assertEqual(response.status_code, 201)
        response = self.client.get(reverse("recherches-sauvegardees"))
        self.assertEqual(len(response.data), 1)

    def test_limite_20(self):
        user, entreprise = _make_entreprise()
        for i in range(20):
            RechercheSauvegardee.objects.create(entreprise=entreprise, nom=f"R{i}", filtres={})
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("recherches-sauvegardees"), {"nom": "Trop", "filtres": {}}, format="json")
        self.assertEqual(response.status_code, 400)


class RapportPDFAPITest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_genere_pdf_non_vide(self):
        user, entreprise = _make_entreprise()
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-rapport-pdf"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertGreater(len(response.content), 500)
```

**Note pour l'implémenteur** : vérifier le nom exact de la route `reverse("dashboard-recruteur")` dans `jobs/urls.py` (peut différer légèrement, ex. `dashboard`).

- [ ] **Step 3: Lancer la suite backend complète**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests --noinput`
Expected: 100 % des tests passent.

- [ ] **Step 4: Tests frontend**

Réécrire `taftech_frontend/tests/DashboardRecruteur.test.jsx` en s'inspirant fortement de l'ancien fichier de test (mêmes mocks `jobsService`, adapter aux nouveaux appels : `getActiviteRecente`, `getRecherchesSauvegardees`, `getCandidatsRecommandes`). Couvrir : affichage des 5 KPI avec variation, funnel avec 4 étapes, dropdown filtre offre, donut sources avec période indépendante, table offres actives avec menu "...", widget candidats recommandés avec icônes message/bookmark fonctionnelles, mini-recherche CVthèque redirige vers `/cvtheque?...`, CTA IA désactivé si palier absent, icône Messages topbar.

Créer `taftech_frontend/tests/FunnelChart.test.jsx` :

```jsx
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FunnelChart from "../src/Components/FunnelChart";

describe("📊 FunnelChart", () => {
  afterEach(() => cleanup());

  it("🟢 HP1 : affiche toutes les étapes avec count et %", () => {
    render(<FunnelChart etapes={[
      { label: "Candidatures reçues", count: 100, pct: 100, couleur: "#4f46e5" },
      { label: "Entretiens", count: 20, pct: 20, couleur: "#0ea5e9" },
    ]} />);
    expect(screen.getByText(/Candidatures reçues/)).toBeInTheDocument();
    expect(screen.getByText(/Entretiens/)).toBeInTheDocument();
  });

  it("🟡 EC1 : liste vide ne plante pas", () => {
    const { container } = render(<FunnelChart etapes={[]} />);
    expect(container).toBeInTheDocument();
  });
});
```

Créer `taftech_frontend/tests/EvaluationsPage.test.jsx` — mock `jobsService.getDashboard` retournant `offres` avec candidatures notées, vérifier tri par note desc et affichage "Aucune candidature évaluée" si vide (pattern déjà standard du projet, s'inspirer de `RecrutementsPage.test.jsx` s'il existe, ou de tout autre test de page listant `dash.offres`).

- [ ] **Step 5: Lancer la suite frontend complète + build**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run`
Expected: 100 % des tests passent.

Run: `npx vite build`
Expected: build propre.

- [ ] **Step 6: `python manage.py check`**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py check`
Expected: `System check identified no issues`.

- [ ] **Step 7: Mettre à jour CLAUDE.md**

Ajouter une entrée de session documentant : source de candidature + invitation CVthèque, refonte complète du dashboard recruteur (KPIs comparatifs, funnel, sources, activité récente, recherches sauvegardées, page Évaluations, intitulé de poste), consolidation des graphiques avancés dans le nouveau dashboard. Référencer les 2 specs.

- [ ] **Step 8: Commit final**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/migrations/ taftech_backend/jobs/tests/test_api_dashboard_refonte.py taftech_frontend/tests/DashboardRecruteur.test.jsx taftech_frontend/tests/FunnelChart.test.jsx taftech_frontend/tests/EvaluationsPage.test.jsx CLAUDE.md
git commit -m "test: couverture refonte dashboard recruteur + doc CLAUDE.md"
```
