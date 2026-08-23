# Source de candidature + invitation CVthèque Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un champ `source` réel sur `Candidature` (Site TafTech / CVthèque / Autre) et un nouveau flux permettant à un recruteur d'inviter un candidat de la CVthèque à postuler à une offre précise, avec traçage automatique de la source.

**Architecture:** Nouveau modèle `InvitationCVTheque` (token unique, expiration 7j) + champ `Candidature.source`. Le lien d'invitation transporte le token en query param jusqu'à la candidature, qui décide la source à la création. Suit les patterns déjà établis : throttle scope dédié, `get_entreprise_for_user()`/`get_membre_role()` pour le gating, `EquipeActionLog` pour l'audit, templates email existants.

**Tech Stack:** Django 5.2 + DRF, PostgreSQL (port 5433), React 18 + Vite, Tailwind (tokens `tw.*`), Vitest. Pas de TDD strict — implémentation directe, tests écrits et lancés dans la dernière tâche.

## Global Constraints

- Ne pas modifier le comportement existant des candidatures sans invitation — `source` doit toujours retomber sur `SITE`/`AUTRE` par défaut, jamais d'erreur si le token est absent/invalide/expiré.
- Gate palier : `acces_coordonnees` (Pro+) requis pour envoyer une invitation — réutiliser `get_palier_actif()` de `jobs/paliers_utils.py`.
- Anti-abus : 20 invitations/jour/entreprise (nouveau throttle scope `invitation_cvtheque`) + unicité `(entreprise, candidat, offre)`.
- Tests backend (`python manage.py test jobs.tests`) et frontend (`npm test -- --run`) doivent rester à 100 % à la fin. `npx vite build` propre.

---

### Task 1: Modèles `Candidature.source` + `InvitationCVTheque`

**Files:**
- Modify: `taftech_backend/jobs/models.py`
- Create: migration via `makemigrations`

**Interfaces:**
- Produces: `Candidature.source` (CharField, choices `SITE`/`CVTHEQUE`/`AUTRE`, défaut `SITE`) ; `InvitationCVTheque` (`entreprise` FK `ProfilEntreprise`, `candidat` FK user, `offre` FK `OffreEmploi`, `token` CharField unique, `date_envoi` auto, `date_expiration` DateTimeField, `unique_together=[('entreprise','candidat','offre')]`). Consommé par Task 2 (vue invitation) et Task 3 (rattachement candidature).

- [ ] **Step 1: Ajouter le champ `source` à `Candidature`**

Dans `taftech_backend/jobs/models.py`, trouver la classe `Candidature` et son champ `est_rapide` (ligne ~246). Juste après ce champ, ajouter :

```python
    SOURCE_CHOICES = (
        ('SITE', 'Site TafTech'),
        ('CVTHEQUE', 'Invitation CVthèque'),
        ('AUTRE', 'Autre'),
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='SITE', verbose_name="Source de la candidature")
```

- [ ] **Step 2: Ajouter le modèle `InvitationCVTheque`**

Dans `taftech_backend/jobs/models.py`, juste après la classe `TelechargementCV` (fin de fichier, chercher `class TelechargementCV`), ajouter :

```python
class InvitationCVTheque(models.Model):
    """Invitation d'un recruteur à un candidat de la CVthèque pour postuler à une offre
    précise — permet de tracer Candidature.source='CVTHEQUE' (voir
    docs/superpowers/specs/2026-08-23-source-candidature-invitation-cvtheque-design.md)."""
    entreprise = models.ForeignKey(
        'ProfilEntreprise', on_delete=models.CASCADE, related_name='invitations_cvtheque'
    )
    candidat = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invitations_recues'
    )
    offre = models.ForeignKey('OffreEmploi', on_delete=models.CASCADE, related_name='invitations')
    token = models.CharField(max_length=64, unique=True)
    date_envoi = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField()

    class Meta:
        unique_together = [('entreprise', 'candidat', 'offre')]

    def save(self, *args, **kwargs):
        if not self.token:
            import uuid
            self.token = uuid.uuid4().hex
        if not self.date_expiration:
            self.date_expiration = timezone.now() + datetime.timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def est_valide(self):
        return timezone.now() <= self.date_expiration

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} → {self.candidat.email} ({self.offre.titre})"
```

Vérifier en haut de `models.py` que `datetime` et `timezone` (django.utils) sont déjà importés (ils le sont — utilisés ailleurs dans ce fichier, ex. `AbonnementEntreprise.est_actif`). Si `import datetime` n'est pas présent en tête de fichier, l'ajouter.

- [ ] **Step 3: Générer et appliquer la migration**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py makemigrations jobs`
Expected: crée une migration (ex. `0085_candidature_source_invitationcvtheque.py`) ajoutant le champ `source` et le modèle `InvitationCVTheque`.

Run: `python manage.py migrate jobs`
Expected: appliquée sans erreur.

- [ ] **Step 4: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/models.py taftech_backend/jobs/migrations/
git commit -m "feat: modele InvitationCVTheque + champ Candidature.source"
```

---

### Task 2: Throttle + vue `InviterCandidatCVThequeAPIView`

**Files:**
- Modify: `taftech_backend/jobs/throttles.py`
- Modify: `taftech_backend/taftech_backend/settings.py`
- Modify: `taftech_backend/jobs/views/recruteur.py`
- Modify: `taftech_backend/jobs/views/__init__.py`
- Modify: `taftech_backend/jobs/urls.py`
- Create: `taftech_backend/jobs/templates/emails/invitation_cvtheque.html`

**Interfaces:**
- Consumes: `InvitationCVTheque` (Task 1), `get_entreprise_for_user`/`get_membre_role` (`jobs/views/equipe.py`), `get_palier_actif` (`jobs/paliers_utils.py`).
- Produces: `POST jobs/cvtheque/inviter/` (name `cvtheque-inviter`), payload `{candidat_id, offre_id}` → 201 `{message}` / 403 `PALIER_INSUFFISANT` / 400 (offre invalide) / 409 `DEJA_INVITE`. Consommé par Task 5 (frontend CVthèque) et par le sous-projet 2 (carte "Candidats recommandés").

- [ ] **Step 1: Ajouter le throttle scope**

Dans `taftech_backend/jobs/throttles.py`, ajouter à la fin du fichier :

```python
class InvitationCVThequeThrottle(_CypressAwareScopedThrottle):
    """Scope 'invitation_cvtheque' (20/jour) — anti-spam sur les invitations recruteur→candidat
    depuis la CVthèque, clé = utilisateur recruteur connecté (ScopedRateThrottle par défaut)."""
    scope = 'invitation_cvtheque'
```

Dans `taftech_backend/taftech_backend/settings.py`, dans `DEFAULT_THROTTLE_RATES` (bloc trouvé à la ligne ~125), ajouter après `'email_write': '10/day',` :

```python
        'invitation_cvtheque': '20/day',
```

- [ ] **Step 2: Créer le template email**

Créer `taftech_backend/jobs/templates/emails/invitation_cvtheque.html` — copier la structure d'un template existant proche, `taftech_backend/jobs/templates/emails/top_profil.html`, et l'adapter :

```html
{% load static %}
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f4f6fb; padding: 20px; margin:0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #204883; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px;">TafTech</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1e293b; font-size: 18px;">Une entreprise s'intéresse à votre profil !</h2>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Bonjour {{ prenom_candidat }},<br><br>
        <strong>{{ nom_entreprise }}</strong> a consulté votre profil dans notre CVthèque et vous invite à postuler à l'offre :
      </p>
      <div style="background: #f0fdfa; border-left: 4px solid #307020; padding: 16px; margin: 16px 0; border-radius: 8px;">
        <strong style="color: #1e293b;">{{ titre_offre }}</strong>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{ lien_offre }}" style="background: #204883; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Voir l'offre et postuler</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Ce lien reste valide 7 jours.</p>
    </div>
    <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 11px;">
      © {{ annee }} TafTech — Oran, Algérie
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 3: Écrire la vue**

Dans `taftech_backend/jobs/views/recruteur.py`, en haut du fichier vérifier que `InvitationCVTheque`, `EquipeActionLog`, `Notification` sont importés depuis `..models` (ajouter dans le bloc d'import existant `from ..models import (...)` s'ils manquent). Ajouter aussi `from ..throttles import InvitationCVThequeThrottle` à côté de l'import existant `WriteActionThrottle, EmailRateThrottle`.

Ajouter la classe suivante après `CVThequeView` (chercher la fin de cette classe, avant la prochaine `class`) :

```python
class InviterCandidatCVThequeAPIView(APIView):
    """Invite un candidat de la CVthèque à postuler à une offre précise — voir
    docs/superpowers/specs/2026-08-23-source-candidature-invitation-cvtheque-design.md."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [InvitationCVThequeThrottle]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        mon_role = get_membre_role(request.user, entreprise)
        if mon_role == 'INVITE':
            return Response({"error": "Action non autorisée pour votre rôle."}, status=status.HTTP_403_FORBIDDEN)

        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(entreprise)
        if not palier or not palier.acces_coordonnees:
            return Response(
                {"error": "L'invitation de candidats nécessite un abonnement Pro ou supérieur.", "code": "PALIER_INSUFFISANT"},
                status=status.HTTP_403_FORBIDDEN,
            )

        candidat_id = request.data.get('candidat_id')
        offre_id = request.data.get('offre_id')
        User = get_user_model()
        try:
            candidat = User.objects.get(id=candidat_id, role='CANDIDAT')
        except User.DoesNotExist:
            return Response({"error": "Candidat introuvable."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            offre = OffreEmploi.objects.get(
                id=offre_id, entreprise=entreprise, statut_moderation='APPROUVEE',
                est_active=True, est_cloturee=False,
            )
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable ou non active."}, status=status.HTTP_400_BAD_REQUEST)

        if InvitationCVTheque.objects.filter(entreprise=entreprise, candidat=candidat, offre=offre).exists():
            return Response({"error": "Ce candidat a déjà été invité à cette offre.", "code": "DEJA_INVITE"}, status=status.HTTP_409_CONFLICT)

        invitation = InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)

        Notification.objects.create(
            destinataire=candidat,
            type_notif='INFO',
            titre="Une entreprise s'intéresse à votre profil",
            message=f"{entreprise.nom_entreprise} vous invite à postuler à l'offre « {offre.titre} ».",
        )

        lien_offre = f"{settings.SITE_URL}/jobs/{offre.id}/?invitation={invitation.token}"
        if candidat.email:
            try:
                ctx = {
                    'prenom_candidat': candidat.first_name,
                    'nom_entreprise': entreprise.nom_entreprise,
                    'titre_offre': offre.titre,
                    'lien_offre': lien_offre,
                    'annee': timezone.now().year,
                }
                html_body = render_to_string('emails/invitation_cvtheque.html', ctx)
                msg = EmailMultiAlternatives(
                    f"{entreprise.nom_entreprise} vous invite à postuler",
                    f"{entreprise.nom_entreprise} vous invite à postuler à l'offre « {offre.titre} » : {lien_offre}",
                    settings.EMAIL_HOST_USER, [candidat.email],
                )
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=True)
            except Exception as e:
                logger.error("Erreur envoi email invitation CVthèque : %s", e)

        EquipeActionLog.objects.create(
            entreprise=entreprise, membre=request.user, action='AUTRE',
            detail=f"Invitation CVthèque envoyée à {candidat.email} pour l'offre « {offre.titre} »",
        )

        return Response({"message": "Invitation envoyée."}, status=status.HTTP_201_CREATED)
```

Vérifier que `render_to_string` est importé en haut du fichier (`from django.template.loader import render_to_string`) — sinon l'ajouter à côté des autres imports Django.

- [ ] **Step 4: Brancher la vue**

Dans `taftech_backend/jobs/views/__init__.py`, trouver le bloc d'import de `recruteur.py` (`from .recruteur import (...)`) et ajouter `InviterCandidatCVThequeAPIView,` dans la liste.

Dans `taftech_backend/jobs/urls.py`, importer `InviterCandidatCVThequeAPIView` dans le bloc d'import existant, puis ajouter (avant le catch-all `<str:offre_id>/` — contrainte critique du projet, toute route littérale doit le précéder) :

```python
    path('cvtheque/inviter/', InviterCandidatCVThequeAPIView.as_view(), name='cvtheque-inviter'),
```

- [ ] **Step 5: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/throttles.py taftech_backend/taftech_backend/settings.py taftech_backend/jobs/views/recruteur.py taftech_backend/jobs/views/__init__.py taftech_backend/jobs/urls.py taftech_backend/jobs/templates/emails/invitation_cvtheque.html
git commit -m "feat: endpoint invitation candidat CVtheque"
```

---

### Task 3: Rattachement de la source à la candidature

**Files:**
- Modify: `taftech_backend/jobs/views/candidatures.py`

**Interfaces:**
- Consumes: `InvitationCVTheque` (Task 1).
- Produces: `Candidature.source` correctement assignée à la création, dans `PostulerAPIView.post()` et `PostulerRapideAPIView.post()`.

- [ ] **Step 1: `PostulerRapideAPIView` — toujours `AUTRE`**

Dans `taftech_backend/jobs/views/candidatures.py`, dans `PostulerRapideAPIView.post()`, trouver l'appel `Candidature.objects.create(...)` (ligne ~187) et ajouter `source='AUTRE',` dans les kwargs (juste après `est_rapide=True,`).

- [ ] **Step 2: `PostulerAPIView` — résoudre la source avant la création**

Dans `taftech_backend/jobs/views/candidatures.py`, dans `PostulerAPIView.post()`, juste avant l'appel `candidature = Candidature.objects.create(...)` (ligne ~95), ajouter :

```python
        source_candidature = 'SITE'
        invitation_token = request.data.get('invitation_token')
        if invitation_token:
            from ..models import InvitationCVTheque
            invitation = InvitationCVTheque.objects.filter(
                token=invitation_token, candidat=request.user, offre=offre,
            ).first()
            if invitation and invitation.est_valide:
                source_candidature = 'CVTHEQUE'
```

Puis dans l'appel `Candidature.objects.create(...)`, ajouter `source=source_candidature,` dans les kwargs (à côté de `statut='RECUE'`).

- [ ] **Step 3: Vérification manuelle rapide**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py shell -c "
from jobs.models import Candidature
print(Candidature._meta.get_field('source').choices)
"`
Expected: affiche les 3 choix `SITE`/`CVTHEQUE`/`AUTRE`.

- [ ] **Step 4: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/views/candidatures.py
git commit -m "feat: rattacher Candidature.source (invitation CVtheque ou defaut)"
```

---

### Task 4: Exposer `source` dans le DTO recruteur

**Files:**
- Modify: `taftech_backend/jobs/serializers/candidatures.py`

**Interfaces:**
- Consumes: `Candidature.source` (Task 1).
- Produces: `CandidatureRecruteurDTO.source` — consommé par le sous-projet 2 (widget "Sources des candidatures").

- [ ] **Step 1: Ajouter le champ au serializer**

Dans `taftech_backend/jobs/serializers/candidatures.py`, trouver la classe `CandidatureRecruteurDTO` et son attribut `fields` (probablement `Meta.fields = [...]` ou déclaration explicite de champs `serializers.CharField`/etc. selon le style du fichier — lire le fichier pour repérer le pattern exact). Ajouter `source` à la liste des champs exposés (si `Meta.fields` est une liste explicite, y ajouter `'source'` ; si le serializer déclare des champs individuellement, ajouter `source = serializers.CharField()`).

- [ ] **Step 2: Vérification manuelle**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py shell -c "
from jobs.serializers import CandidatureRecruteurDTO
print('source' in CandidatureRecruteurDTO().fields)
"`
Expected: `True`.

- [ ] **Step 3: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/serializers/candidatures.py
git commit -m "feat: exposer Candidature.source dans CandidatureRecruteurDTO"
```

---

### Task 5: Frontend — bouton "Inviter à postuler" dans la CVthèque

**Files:**
- Modify: `taftech_frontend/src/Services/recruteurService.js`
- Modify: `taftech_frontend/src/Pages/Recruteur/CVTheque.jsx`
- Modify: `taftech_frontend/src/Pages/Public/JobDetail.jsx`

**Interfaces:**
- Consumes: `POST jobs/cvtheque/inviter/` (Task 2).
- Produces: `jobsService.inviterCandidatCVTheque(candidatId, offreId)` — réutilisé par le sous-projet 2.

- [ ] **Step 1: Service**

Dans `taftech_frontend/src/Services/recruteurService.js`, ajouter (même pattern `try/catch` + `reportError` que les autres méthodes du fichier) :

```js
  inviterCandidatCVTheque: async (candidatId, offreId) => {
    try {
      const response = await api.post("jobs/cvtheque/inviter/", {
        candidat_id: candidatId,
        offre_id: offreId,
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_INVITER_CANDIDAT_CVTHEQUE", err);
      throw err;
    }
  },
```

Vérifier que cette méthode est bien réexportée par la façade `jobsService.js` (elle l'est automatiquement si le fichier fait déjà `...recruteurService` dans son export — vérifier le pattern existant en tête de `jobsService.js`).

- [ ] **Step 2: Bouton + modale dans CVTheque.jsx**

Lire `taftech_frontend/src/Pages/Recruteur/CVTheque.jsx` pour repérer : (a) la carte candidat (où sont déjà les boutons favoris/export), (b) comment `dash`/palier (`accesCoordonnees` ou équivalent) est déjà lu dans ce fichier pour le gating existant. Ajouter :

- Un état `const [inviterCandidat, setInviterCandidat] = useState(null);` (candidat pour lequel la modale d'invitation est ouverte) et `const [offresActives, setOffresActives] = useState([]);` chargé une fois au montage via `jobsService.getDashboard()` (déjà utilisé ailleurs dans l'app pour lister les offres), filtré `statut_moderation === 'APPROUVEE' && est_active && !est_cloturee`.
- Bouton "Inviter à postuler" sur chaque carte candidat, visible seulement si l'accès coordonnées est actif (même condition que l'affichage email/téléphone déjà présent dans ce fichier), sinon désactivé + `title="Nécessite un abonnement Pro ou supérieur"`.
- Modale simple (`<select>` d'offres + bouton "Envoyer") :

```jsx
{inviterCandidat && (
  <div className={`${tw.modalOverlay} p-4`}>
    <div className={`${tw.surface} rounded-2xl p-6 max-w-md w-full shadow-2xl`}>
      <h3 className={`text-base font-bold ${tw.textStrong} mb-4`}>
        Inviter {inviterCandidat.first_name} à postuler
      </h3>
      <select
        id="offre-invitation"
        className={`w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm mb-4`}
        defaultValue=""
      >
        <option value="" disabled>Choisir une offre</option>
        {offresActives.map((o) => (
          <option key={o.id} value={o.id}>{o.titre}</option>
        ))}
      </select>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setInviterCandidat(null)}
          className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg`}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={async () => {
            const offreId = document.getElementById("offre-invitation").value;
            if (!offreId) return;
            try {
              await jobsService.inviterCandidatCVTheque(inviterCandidat.user_id, offreId);
              toast.success("Invitation envoyée !");
              setInviterCandidat(null);
            } catch (err) {
              toast.error(err.response?.data?.error || "Erreur lors de l'envoi.");
            }
          }}
          className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg`}
        >
          Envoyer
        </button>
      </div>
    </div>
  </div>
)}
```

Adapter les noms de tokens `tw.*` exacts en vérifiant ceux déjà utilisés dans ce même fichier (`CVTheque.jsx` a déjà des modales — copier son pattern de classes exact plutôt que celui ci-dessus si différent).

- [ ] **Step 3: `JobDetail.jsx` — transmettre le token d'invitation**

Dans `taftech_frontend/src/Pages/Public/JobDetail.jsx`, en haut du composant, lire le param `invitation` :

```js
const [searchParams] = useSearchParams();
const invitationToken = searchParams.get("invitation");
```

(vérifier si `useSearchParams` est déjà importé/utilisé dans ce fichier — sinon ajouter l'import `import { useSearchParams } from "react-router-dom";`).

Trouver le point d'appel à `jobsService.postuler(...)` (candidature complète, pas rapide) dans ce fichier et ajouter `invitation_token: invitationToken` au payload envoyé (seulement si `invitationToken` est non nul — ne pas envoyer une clé vide inutilement).

- [ ] **Step 4: Vérification manuelle**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npx vite build`
Expected: build propre (pas d'erreur d'import).

- [ ] **Step 5: Commit**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_frontend/src/Services/recruteurService.js taftech_frontend/src/Pages/Recruteur/CVTheque.jsx taftech_frontend/src/Pages/Public/JobDetail.jsx
git commit -m "feat: bouton inviter a postuler CVtheque + transmission token candidature"
```

---

### Task 6: Tests (backend + frontend, à la fin)

**Files:**
- Create: `taftech_backend/jobs/tests/test_api_invitation_cvtheque.py`
- Modify: `taftech_frontend/tests/CVTheque.test.jsx`

- [ ] **Step 1: Tests backend**

Créer `taftech_backend/jobs/tests/test_api_invitation_cvtheque.py` :

```python
"""Tests pour InvitationCVTheque + Candidature.source (sous-projet 1, voir
docs/superpowers/specs/2026-08-23-source-candidature-invitation-cvtheque-design.md)."""
from django.test import TestCase
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
import datetime
from rest_framework.test import APITestCase
from jobs.models import (
    InvitationCVTheque, Candidature, OffreEmploi, ProfilEntreprise,
    Palier, AbonnementEntreprise,
)
from django.contrib.auth import get_user_model

User = get_user_model()


def _make_entreprise(email="rec_invit@test.dz", palier_nom="PRO"):
    user = User.objects.create_user(
        username=email, email=email, password="pwd", role="RECRUTEUR",
    )
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise="TestCo", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{email}", est_approuvee=True,
    )
    if palier_nom:
        palier, _ = Palier.objects.get_or_create(nom=palier_nom, defaults={"acces_coordonnees": True})
        if not palier.acces_coordonnees and palier_nom in ("PRO", "BUSINESS", "ENTERPRISE"):
            palier.acces_coordonnees = True
            palier.save()
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


def _make_candidat(email="cand_invit@test.dz"):
    return User.objects.create_user(username=email, email=email, password="pwd", role="CANDIDAT")


def _make_offre(entreprise):
    return OffreEmploi.objects.create(
        entreprise=entreprise, titre="Poste Test", wilaya="16 - Alger",
        specialite="L18", diplome="LICENCE", experience_requise="DEBUTANT",
        type_contrat="CDI", description="Desc", statut_moderation="APPROUVEE",
        est_active=True, est_cloturee=False,
    )


class InvitationCVThequeModelTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_token_et_expiration_auto(self):
        _, entreprise = _make_entreprise()
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        inv = InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)
        self.assertTrue(inv.token)
        self.assertTrue(inv.est_valide)

    def test_expire_apres_7_jours(self):
        _, entreprise = _make_entreprise()
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        inv = InvitationCVTheque.objects.create(
            entreprise=entreprise, candidat=candidat, offre=offre,
            date_expiration=timezone.now() - datetime.timedelta(days=1),
        )
        self.assertFalse(inv.est_valide)

    def test_unicite_entreprise_candidat_offre(self):
        _, entreprise = _make_entreprise()
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)
        with self.assertRaises(Exception):
            InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)


class InviterCandidatCVThequeAPITest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_gate_palier_insuffisant(self):
        user, entreprise = _make_entreprise(palier_nom="STARTER")
        Palier.objects.filter(nom="STARTER").update(acces_coordonnees=False)
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-inviter"), {"candidat_id": candidat.id, "offre_id": offre.id})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data.get("code"), "PALIER_INSUFFISANT")

    def test_invitation_reussie_palier_suffisant(self):
        user, entreprise = _make_entreprise(palier_nom="PRO")
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-inviter"), {"candidat_id": candidat.id, "offre_id": offre.id})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(InvitationCVTheque.objects.filter(entreprise=entreprise, candidat=candidat, offre=offre).exists())

    def test_double_invitation_refusee(self):
        user, entreprise = _make_entreprise(palier_nom="PRO")
        candidat = _make_candidat()
        offre = _make_offre(entreprise)
        InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("cvtheque-inviter"), {"candidat_id": candidat.id, "offre_id": offre.id})
        self.assertEqual(response.status_code, 409)


class CandidatureSourceTest(APITestCase):
    def setUp(self):
        cache.clear()

    def test_candidature_rapide_source_autre(self):
        _, entreprise = _make_entreprise()
        offre = _make_offre(entreprise)
        response = self.client.post(
            reverse("postuler-rapide", args=[offre.id]),
            {"nom_rapide": "Test", "prenom_rapide": "T", "email_rapide": "rapide@test.dz"},
        )
        self.assertEqual(response.status_code, 201)
        cand = Candidature.objects.get(offre=offre, email_rapide="rapide@test.dz")
        self.assertEqual(cand.source, "AUTRE")

    def test_candidature_normale_source_site_sans_token(self):
        _, entreprise = _make_entreprise()
        offre = _make_offre(entreprise)
        candidat = _make_candidat()
        self.client.force_authenticate(user=candidat)
        response = self.client.post(reverse("postuler", args=[offre.id]), {})
        self.assertEqual(response.status_code, 201)
        cand = Candidature.objects.get(offre=offre, candidat=candidat)
        self.assertEqual(cand.source, "SITE")

    def test_candidature_avec_invitation_source_cvtheque(self):
        _, entreprise = _make_entreprise()
        offre = _make_offre(entreprise)
        candidat = _make_candidat()
        inv = InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)
        self.client.force_authenticate(user=candidat)
        response = self.client.post(reverse("postuler", args=[offre.id]), {"invitation_token": inv.token})
        self.assertEqual(response.status_code, 201)
        cand = Candidature.objects.get(offre=offre, candidat=candidat)
        self.assertEqual(cand.source, "CVTHEQUE")
```

**Note pour l'implémenteur** : vérifier les noms exacts des routes `reverse("postuler", ...)`/`reverse("postuler-rapide", ...)` dans `jobs/urls.py` (les noms peuvent différer légèrement) et adapter. Vérifier aussi que `experience_requise="DEBUTANT"`/`diplome="LICENCE"`/`specialite="L18"` sont des valeurs valides (cohérent avec le fix documenté en Phase 2b : "payload de test avec des valeurs invalides" — utiliser les mêmes valeurs que `test_api_paliers_gating.py` déjà corrigé).

- [ ] **Step 2: Lancer la suite backend complète**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py test jobs.tests --noinput`
Expected: 100 % des tests passent (nouveaux + existants).

- [ ] **Step 3: Tests frontend**

Dans `taftech_frontend/tests/CVTheque.test.jsx`, ajouter un test vérifiant : le bouton "Inviter à postuler" est présent quand l'accès coordonnées est actif, absent/désactivé sinon ; cliquer + choisir une offre + confirmer appelle `jobsService.inviterCandidatCVTheque` avec les bons IDs. S'inspirer du pattern de test déjà en place dans ce fichier pour les autres modales (mock `jobsService`, `render`, `fireEvent`, `waitFor`).

- [ ] **Step 4: Lancer la suite frontend complète**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_frontend" && npm test -- --run`
Expected: 100 % des tests passent.

Run: `npx vite build`
Expected: build propre.

- [ ] **Step 5: `python manage.py check`**

Run: `cd "c:\Users\filali\Desktop\Taftech\taftech_backend" && python manage.py check`
Expected: `System check identified no issues`.

- [ ] **Step 6: Commit final**

```bash
cd "c:\Users\filali\Desktop\Taftech"
git add taftech_backend/jobs/tests/test_api_invitation_cvtheque.py taftech_frontend/tests/CVTheque.test.jsx
git commit -m "test: couverture invitation CVtheque + Candidature.source"
```
