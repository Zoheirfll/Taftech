# Source de candidature + invitation CVthèque — Design

**Contexte** : l'employeur a envoyé un mockup du dashboard recruteur (voir sous-projet 2, spec séparé) incluant un widget "Sources des candidatures" (donut : Site TAFTECH, CVthèque, Réseaux sociaux, Cooptation, Autres). Aucun mécanisme de tracking de source n'existe aujourd'hui sur `Candidature`. Décision : construire un vrai tracking basé sur le parcours réel du candidat plutôt qu'inventer des chiffres — 3 catégories réelles (Site TAFTECH, CVthèque, Autres/rapide), pas 5. "Réseaux sociaux"/"Cooptation" restent hors périmètre (aucun mécanisme naturel de tracking existant, pas de partage tracké ni de programme de cooptation).

Ce sous-projet introduit aussi une vraie fonctionnalité produit : permettre à un recruteur d'inviter un candidat de la CVthèque à postuler à une offre précise — n'existait pas avant.

## Modèle de données

### `Candidature.source` (nouveau champ)

```python
SOURCE_CHOICES = (
    ('SITE', 'Site TafTech'),       # candidature normale via /jobs/<id>, valeur par défaut
    ('CVTHEQUE', 'Invitation CVthèque'),  # via lien d'invitation recruteur (voir ci-dessous)
    ('AUTRE', 'Autre'),             # candidature rapide (est_rapide=True), sans compte
)
source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='SITE')
```

Règle d'assignation à la création de la `Candidature` :
1. Si `est_rapide=True` → `AUTRE` (inchangé quel que soit le contexte).
2. Sinon, si la requête de candidature porte un `invitation_token` valide correspondant à `(candidat=request.user, offre=offre_id)` et non expiré → `CVTHEQUE`.
3. Sinon → `SITE`.

### `InvitationCVTheque` (nouveau modèle)

```python
class InvitationCVTheque(models.Model):
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='invitations_cvtheque')
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invitations_recues')
    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='invitations')
    token = models.CharField(max_length=64, unique=True, default=<uuid4 hex>)
    date_envoi = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField()  # date_envoi + 7 jours, calculé à la création

    class Meta:
        unique_together = [('entreprise', 'candidat', 'offre')]  # anti-doublon (candidat, offre)
```

`unique_together` empêche une entreprise de ré-inviter le même candidat sur la même offre deux fois (409 si déjà existant, pas d'erreur 500).

## Backend

### `POST jobs/cvtheque/inviter/`

Nouvelle vue `InviterCandidatCVThequeAPIView`, `jobs/views/recruteur.py`.

- `IsAuthenticated` + `get_entreprise_for_user()` + `get_membre_role()` (INVITE bloqué, même pattern que le reste de la CVthèque).
- **Gate palier** : `get_palier_actif(entreprise)` doit avoir `acces_coordonnees=True` (Pro+), sinon 403 `PALIER_INSUFFISANT` — même gate que la visibilité des coordonnées candidat, cohérent (contacter suppose déjà voir les coordonnées).
- Payload : `{candidat_id, offre_id}`. Vérifie que `offre_id` appartient bien à l'entreprise et est active/approuvée (sinon 400).
- **Anti-abus** : nouveau throttle `InvitationCVThequeThrottle` (scope `invitation_cvtheque`, 20/jour, clé = entreprise) dans `jobs/throttles.py`, même pattern que `WriteActionThrottle`. Si `InvitationCVTheque` existe déjà pour `(entreprise, candidat, offre)` → 409 `DEJA_INVITE` (pas de doublon, pas de nouvel envoi de notif).
- Crée `InvitationCVTheque(date_expiration=now()+7j)`.
- Notifie le candidat : `Notification(destinataire=candidat, type_notif='INFO', titre="Une entreprise s'intéresse à votre profil", message="{entreprise.nom_entreprise} vous invite à postuler à l'offre « {offre.titre} ».")` + email (nouveau template `emails/invitation_cvtheque.html`, même style que les autres emails du site) avec lien `{SITE_URL}/jobs/{offre.id}-{slug}/?invitation={token}`.
- Log `EquipeActionLog` (action `AUTRE`, detail "Invitation CVthèque envoyée à {candidat.email}").
- Réponse 201.

### Rattachement à la candidature

`PostulerAPIView`/`PostulerRapideAPIView` (`jobs/views/candidatures.py`) : accepte un champ optionnel `invitation_token` dans le payload (ou query param transmis par le frontend). Si présent :
- Cherche `InvitationCVTheque.objects.filter(token=..., candidat=request.user, offre=offre, date_expiration__gte=now())`.
- Si trouvée → `source='CVTHEQUE'` sur la `Candidature` créée. Token non consommé/supprimé (une invitation peut rester valide si le candidat abandonne puis revient dans les 7 jours) — pas de champ `utilisee`, la présence d'une `Candidature` avec ce candidat+offre+source=CVTHEQUE suffit à savoir qu'elle a été utilisée.
- Si absente/expirée/invalide → `source='SITE'` silencieusement (pas d'erreur, dégrade proprement).

### Frontend

- **`CVTheque.jsx`** : nouveau bouton "Inviter à postuler" par carte candidat, visible seulement si `accesCoordonnees` (déjà lu depuis le dashboard, pattern `accesEquipe` existant). Modale : `<select>` des offres actives de l'entreprise (réutilise `jobsService.getDashboard().offres` déjà chargé côté client, filtré `statut_moderation=APPROUVEE && est_active && !est_cloturee`). Bouton désactivé + tooltip si palier insuffisant (pattern déjà établi ailleurs, ex. filtres avancés Business+).
- **`JobDetail.jsx`** : lit `?invitation=<token>` via `useSearchParams` au montage, le transmet dans le payload de `PostulerAPIView`/`PostulerRapideAPIView` (state local, pas besoin de le raffraîchir après usage).
- `recruteurService.inviterCandidatCVTheque(candidatId, offreId)` ajouté à `jobsService`.

## Sécurité

- `InviterCandidatCVThequeAPIView` : `IsAuthenticated` + `get_entreprise_for_user()` + `get_membre_role()` (INVITE bloqué) + gate palier `acces_coordonnees`, cohérent avec le reste de la CVthèque.
- Token d'invitation : `uuid4().hex` (128 bits, non devinable), scoped strictement à `(candidat, offre)` — même si le token fuite, il ne permet que d'attribuer la source `CVTHEQUE` à une candidature que le candidat aurait de toute façon pu déposer normalement (pas d'élévation de privilège, pas d'accès à une ressource protégée).
- Anti-spam : throttle 20/jour/entreprise + unicité `(entreprise, candidat, offre)` empêchent le harcèlement d'un même candidat.
- Email d'invitation : le candidat peut désactiver ce type de notification ? **Non prévu dans ce spec** — traité comme les autres notifications système (ENTRETIEN, RETENU, REFUS), pas de préférence granulaire existante à réutiliser.

## Tests

- Backend : modèle `InvitationCVTheque` (création, `unique_together`, expiration), vue `InviterCandidatCVThequeAPIView` (gate palier, anti-doublon 409, throttle, notif+email créés), `PostulerAPIView`/`PostulerRapideAPIView` avec/sans token valide/expiré/d'un autre candidat (source correcte dans chaque cas).
- Frontend : `CVTheque.test.jsx` (bouton visible/désactivé selon palier, modale, appel service), `JobDetail.test.jsx` (token transmis à la candidature).

## Hors périmètre (explicite)

- "Réseaux sociaux" / "Cooptation" comme sources trackées — aucun mécanisme naturel, pas construit.
- Préférence de notification dédiée pour les invitations CVthèque.
- Expiration/relance automatique d'une invitation non utilisée après 7 jours (elle devient simplement inutilisable, pas de nettoyage périodique nécessaire — `date_expiration` suffit au filtrage).
