# Demandes d'ajout — étape 1 : socle + diplômes et spécialités

> **Exécution :** inline, par moi, sans sous-agent (demande de l'utilisateur du 16/10/2026). **Les tests viennent à la fin** de l'étape (tâche 9), pas tâche par tâche (demande de l'utilisateur). Pas de commit sans demande explicite, pas de merge vers `main`.

**Spécification :** `docs/superpowers/specs/2026-10-16-demandes-ajout-design.md`
**Objectif :** une table unique de demandes d'ajout, avec le service, l'API et les écrans communs, branchée sur les **types de diplôme** et les **spécialités** (les deux types qui n'avaient aucun circuit d'ajout). Métiers et compétences ne bougent pas (étapes 2 et 3).
**Architecture :** modèle `DemandeAjout` ; service dans `jobs/demandes_ajout/` avec un adaptateur par type ; API publique de création et API admin de décision ; composants React communs. « Formations à vérifier » disparaît de l'interface.
**Pile :** Django 5.2, DRF, PostgreSQL ; React 18, Vite, Tailwind, tokens `tw.*`.

## Contraintes globales (reprises de la spécification et de CLAUDE.md)
- Statuts : `A_EXAMINER`, `ACCEPTEE`, `RATTACHEE`, `REFUSEE`. Libellé 3 à 120 caractères ; motif de refus 5 à 500 ; contexte 300.
- Demandes explicites : 5 ouvertes maximum par compte, throttle `write_action` (30/h). Une seule demande ouverte par (`type`, `cle_recherche`) : contrainte en base. Décisions sous `select_for_update`.
- Aucun effet avant décision. Les offres ne sont jamais modifiées automatiquement. Un libellé refusé n'est jamais re-proposé.
- Codes des entrées créées : `TAF-DIP-<id>`, `TAF-SPE-<id>`, `TAF-AD-<id>`, `TAF-AS-<id>`, `TAF-DS-<id>-<diplôme>` (`<id>` = id de la demande).
- Audit : action `DECISION_DEMANDE_AJOUT` (`AuditLog.action` = 30 caractères maximum). Notifications dans l'application, seulement pour les demandes explicites.
- Permissions : création par un candidat ou un recruteur rattaché à une entreprise ; admin : `IsAdminRole`. Vérifiées par des tests sur de vraies routes.
- Pas de `window.confirm`, couleurs par tokens `tw.*`, pas de placeholder « exemple » dans les formulaires, un fichier de code ne dépasse pas 800 lignes.
- Après `makemigrations`, lancer **aussitôt** `migrate`. Ne jamais modifier la base de développement par shell : la migration de données passe par une commande avec simulation et sauvegarde.
- Rester sur la branche `feature/qualite-ia-stats-recruteur`.

## Constats qui précisent la conception
1. **« Autre diplôme » n'entre jamais dans la file admin actuelle** : le formulaire pose `diplome_ref = D-AUTRE` (une vraie entrée), et `FormationCandidat.save()` ne marque « à préciser » que `not diplome_ref_id`. Les demandes corrigent ce défaut : `D-AUTRE` ou diplôme absent, avec un texte d'au moins 3 caractères, crée une demande `DIPLOME`.
2. **Le texte « Autre spécialité » est stocké dans `description`**, champ aussi utilisé pour le libellé d'une vraie spécialité choisie. Il faut un signal explicite : le formulaire enverra `specialite_autre` (seulement quand le mode « Autre » est actif et le texte rempli).
3. La base de développement n'a aucune formation « à préciser » ni `D-AUTRE` (17 formations) : la migration de données n'a rien à déplacer ici, mais elle doit exister pour la production.

## Cartographie des fichiers
**Backend — créés :**
- `jobs/models/demande_ajout.py` : modèle `DemandeAjout`.
- `jobs/demandes_ajout/__init__.py` : exports publics.
- `jobs/demandes_ajout/regles.py` : constantes, `DemandeRefusee`, validation du texte, quotas.
- `jobs/demandes_ajout/adaptateurs.py` : un adaptateur par type (`DIPLOME`, `SPECIALITE`) et le registre.
- `jobs/demandes_ajout/service.py` : `creer_demande`, `accepter_demande`, `rattacher_demande`, `refuser_demande`, notifications.
- `jobs/demandes_ajout/formations.py` : lien avec `FormationCandidat` (`synchroniser_depuis_formation`, effets d'une décision).
- `jobs/serializers/demande_ajout.py` : sérialiseur admin.
- `jobs/views/demandes_ajout.py` : vues publique et admin.
- `jobs/management/commands/migrer_formations_vers_demandes.py` : simulation, sauvegarde JSON, application.
- Tests : `jobs/tests/test_demandes_ajout_service.py`, `test_demandes_ajout_api.py`, `test_demandes_ajout_formations.py`, `test_migrer_formations_vers_demandes.py`.

**Backend — modifiés :** `jobs/models/__init__.py`, `jobs/models/profils.py` (deux FK sur `FormationCandidat`), `jobs/models/equipe.py` (action d'audit), `jobs/urls.py`, `jobs/views/profils.py` (appel après enregistrement d'une formation), `jobs/views/admin.py` (bloc `demandes_a_examiner`), `jobs/referentiel_utils.py` si les résolveurs de spécialité ignorent `AliasSpecialite`.

**Frontend — créés :** `src/Components/ProposerEntreeModal.jsx`, `src/Pages/Admin/demandes/DemandesAjoutPanel.jsx`, `src/Pages/Admin/demandes/DecisionDemandeModal.jsx`, `src/Pages/Admin/demandes/demandesAjoutUi.js`, et les tests `tests/DemandesAjoutPanel.test.jsx`, `tests/ProposerEntreeModal.test.jsx`.
**Frontend — modifiés :** `src/Services/jobsService.js`, `src/Services/adminService.js`, `src/Pages/Admin/AdminReferentielV2.jsx`, `src/Pages/Admin/AdminLayout.jsx`, `src/Components/FormationReferentielSelect.jsx`, `ModalFormation.jsx`, `Onboarding/steps/StepFormations.jsx`, `src/Pages/Recruteur/CreateJob/BlocFormationRequise.jsx`, et les tests existants touchés.

---

### Tâche 1 : modèle et migrations
**Produit :** `DemandeAjout`, `FormationCandidat.demande_diplome`, `FormationCandidat.demande_specialite`, action d'audit.

```python
# jobs/models/demande_ajout.py
class DemandeAjout(models.Model):
    TYPE_METIER, TYPE_COMPETENCE, TYPE_DIPLOME, TYPE_SPECIALITE = 'METIER', 'COMPETENCE', 'DIPLOME', 'SPECIALITE'
    TYPE_CHOICES = [(TYPE_METIER, 'Métier'), (TYPE_COMPETENCE, 'Compétence'),
                    (TYPE_DIPLOME, 'Type de diplôme'), (TYPE_SPECIALITE, 'Spécialité')]
    STATUT_A_EXAMINER, STATUT_ACCEPTEE, STATUT_RATTACHEE, STATUT_REFUSEE = 'A_EXAMINER', 'ACCEPTEE', 'RATTACHEE', 'REFUSEE'
    STATUT_CHOICES = [(STATUT_A_EXAMINER, 'À examiner'), (STATUT_ACCEPTEE, 'Acceptée'),
                      (STATUT_RATTACHEE, 'Rattachée'), (STATUT_REFUSEE, 'Refusée')]
    TRANSITIONS = {STATUT_A_EXAMINER: {STATUT_ACCEPTEE, STATUT_RATTACHEE, STATUT_REFUSEE},
                   STATUT_REFUSEE: {STATUT_ACCEPTEE, STATUT_RATTACHEE},
                   STATUT_ACCEPTEE: set(), STATUT_RATTACHEE: set()}
    ORIGINE_CHOICES = [('CANDIDAT', 'Candidat'), ('RECRUTEUR', 'Recruteur')]

    type = models.CharField(max_length=10, choices=TYPE_CHOICES, db_index=True)
    libelle = models.CharField(max_length=120)
    cle_recherche = models.CharField(max_length=250, db_index=True)
    contexte = models.CharField(max_length=300, blank=True, default='')
    explicite = models.BooleanField(default=True)
    origine = models.CharField(max_length=10, choices=ORIGINE_CHOICES)
    premier_demandeur = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                          on_delete=models.SET_NULL, related_name='demandes_ajout_initiees')
    demandeurs = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='demandes_ajout')
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default=STATUT_A_EXAMINER, db_index=True)
    entree_id = models.PositiveIntegerField(null=True, blank=True)
    entree_libelle = models.CharField(max_length=300, blank=True, default='')
    motif_refus = models.TextField(blank=True, default='')
    traite_par = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='demandes_ajout_traitees')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_decision = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_creation']
        constraints = [models.UniqueConstraint(fields=['type', 'cle_recherche'],
                       condition=Q(statut='A_EXAMINER'), name='demande_ajout_ouverte_unique')]
```
- [ ] Créer le fichier, exporter dans `jobs/models/__init__.py`.
- [ ] `profils.py` : `demande_diplome` et `demande_specialite` = `ForeignKey('DemandeAjout', null=True, blank=True, on_delete=models.SET_NULL, related_name='formations_diplome'/'formations_specialite')`.
- [ ] `equipe.py` : ajouter `('DECISION_DEMANDE_AJOUT', "Décider d'une demande d'ajout au référentiel")` à `AuditLog.ACTIONS`.
- [ ] `python manage.py makemigrations jobs -n demandes_ajout` puis **immédiatement** `python manage.py migrate` ; `python manage.py check`.

### Tâche 2 : règles et adaptateurs
**Produit (interfaces) :**
```python
# regles.py
class DemandeRefusee(Exception):  # message, code, **extra  (même forme que PropositionRefusee)
def texte_plausible(libelle) -> bool    # au moins une lettre, pas d'e-mail/téléphone/URL, au plus 12 mots
MAX_EXPLICITES_OUVERTES = 5; MAX_IMPLICITES_PAR_JOUR = 50; MOTIF_MIN = 5; MOTIF_MAX = 500

# adaptateurs.py
class Adaptateur:   # une instance par type
    type: str
    def libelle_existant(self, cle) -> str | None         # entrée officielle déjà présente (libellé ou alias)
    def proches(self, libelle, limite=5) -> list[dict]     # [{id, libelle, detail}]
    def parents(self) -> dict                              # options du formulaire « Accepter »
    def accepter(self, demande, libelle, parent, options) -> tuple[int, str]
    def rattacher(self, demande, entree_id) -> tuple[int, str]
    def appliquer(self, demande, entree_id)                # effets : formations en attente, etc.
ADAPTATEURS = {'DIPLOME': AdaptateurDiplome(), 'SPECIALITE': AdaptateurSpecialite()}
```
- [ ] `AdaptateurDiplome.accepter` : `parent` = valeur de `systeme` existante (≠ `autre`) → `TypeDiplome(code=f"TAF-DIP-{demande.pk}", libelle, systeme, selectionnable=True, diplome_formel=True, source_id='TAF')`.
- [ ] `AdaptateurDiplome.rattacher` : refuse si la clé existe déjà comme libellé ou alias → `AliasDiplome(code=f"TAF-AD-{demande.pk}", diplome, libelle, cle_recherche, langue='fr', source_id='TAF')`.
- [ ] `AdaptateurSpecialite.accepter` : `parent` = id d'un `DomaineFormation` actif (≠ `D-AUTRE`), `options = {filiere_id?, diplomes_ids?}` → `SpecialiteFormation(code=f"TAF-SPE-{pk}", domaine, filiere, libelle, cle_recherche, nature='taftech', selectionnable=True, source_id='TAF')` + `DiplomeSpecialite(code=f"TAF-DS-{pk}-{diplome.pk}", ...)` pour chaque diplôme.
- [ ] `AdaptateurSpecialite.rattacher` : `AliasSpecialite(code=f"TAF-AS-{pk}", specialite, libelle, cle_recherche, langue='fr', type_alias='demande')`.
- [ ] `proches` : mots de 4 lettres et plus de `cle_recherche`, `icontains` sur libellé et alias, classés par `difflib.SequenceMatcher`, 5 résultats.
- [ ] `appliquer` : pour les formations liées (`demande_diplome` / `demande_specialite`), poser `diplome_ref` / `specialite_ref` puis `save()` (le mécanisme actuel remet `DECLARE`).

### Tâche 3 : service
**Produit :**
```python
def creer_demande(utilisateur, type_demande, libelle, contexte='', explicite=True) -> tuple[DemandeAjout, bool]
def accepter_demande(demande, utilisateur, libelle=None, parent=None, options=None) -> DemandeAjout
def rattacher_demande(demande, utilisateur, entree_id) -> DemandeAjout
def refuser_demande(demande, utilisateur, motif) -> DemandeAjout
def notifier_decision(demande, titre, message)   # seulement si demande.explicite ; jamais bloquant
```
- [ ] `creer_demande` : refuse (`DemandeRefusee`, codes `TYPE_INCONNU`, `LIBELLE_INVALIDE`, `ENTREE_EXISTANTE`, `DEJA_REFUSEE`, `TROP_DE_DEMANDES`) ; rejoint la demande ouverte du même (`type`, `cle_recherche`) ; gère la requête simultanée par `IntegrityError` (même schéma que `proposer_metier`) ; l'origine vient du rôle.
- [ ] Les trois décisions : `transaction.atomic()` + `select_for_update()`, contrôle de `TRANSITIONS`, appel de l'adaptateur, `adaptateur.appliquer(...)`, puis `notifier_decision` (hors transaction). Un refus sur une formation liée : `statut_validation='REFUSEE'`, `motif_refus`, `refusee_par`, `date_refus` (comportement actuel).

### Tâche 4 : lien avec les formations
```python
# jobs/demandes_ajout/formations.py
def synchroniser_depuis_formation(formation, utilisateur, specialite_autre='') -> None
```
- [ ] Diplôme : `diplome_ref` absent ou de code `D-AUTRE`, avec `formation.diplome` d'au moins 3 caractères → `creer_demande(DIPLOME, explicite=True)` puis `formation.demande_diplome = demande`. Si le diplôme devient réel : `demande_diplome = None`.
- [ ] Spécialité : `specialite_ref` absent et `specialite_autre` d'au moins 3 caractères → `creer_demande(SPECIALITE, contexte=formation.diplome)` puis `formation.demande_specialite = demande`. Sinon : `demande_specialite = None`.
- [ ] `views/profils.py` : appeler la fonction après `serializer.save(...)` dans `FormationAPIView.post` et `FormationDetailAPIView.put`, dans un `try/except` qui journalise sans bloquer l'enregistrement de la formation. Lire `specialite_autre` dans `request.data`.
- [ ] Nouvelle commande `migrer_formations_vers_demandes` : simulation par défaut (liste exacte + échantillon), `--appliquer` écrit d'abord une sauvegarde JSON dans `docs/archives/`, puis crée les demandes pour les formations `D-AUTRE`/sans diplôme avec texte, et les `A_PRECISER` à spécialité non résolue.

### Tâche 5 : API
- [ ] `views/demandes_ajout.py` :
  - `CreerDemandeAjoutAPIView` : `POST /api/jobs/demandes-ajout/` `{type, libelle, contexte?}` ; `IsAuthenticated` + `WriteActionThrottle` ; candidat ou recruteur avec `get_entreprise_for_user` sinon 403 ; types limités à `DIPLOME`, `SPECIALITE` à cette étape (400 `TYPE_INCONNU` sinon) ; 201 créée, 200 rejointe, 400 `{error, code}`.
  - `AdminDemandesAjoutAPIView` : `GET admin/demandes-ajout/?type=&statut=&search=&page=` (30 par page, `compteurs`).
  - `AdminDemandeProchesAPIView`, `AdminDemandeParentsAPIView` (`?type=`).
  - `AdminDemandeAccepterAPIView`, `AdminDemandeRattacherAPIView`, `AdminDemandeRefuserAPIView` : `IsAdminRole`, 404 si introuvable, 400 sur `ValueError`, `_audit(request, 'DECISION_DEMANDE_AJOUT', detail[:255])`.
- [ ] `serializers/demande_ajout.py` : `DemandeAjoutAdminSerializer` (id, type, libelle, contexte, explicite, origine, statut, `demandeurs` limités à 5 avec nom et entreprise, `nb_demandeurs`, `nb_formations`, `entree_libelle`, `motif_refus`, dates, `traite_par_nom`, `transitions_possibles`).
- [ ] `urls.py` : 7 routes. `views/admin.py` : ajouter `demandes_a_examiner = {'DIPLOME': n, 'SPECIALITE': n}` aux statistiques, en conservant les anciennes clés.

### Tâche 6 : résolveurs d'alias de spécialité
- [ ] Lire `referentiel_utils.py` (autour de `suggerer_diplome`, ligne 700 et suivantes) et le parser de CV : consultent-ils `AliasSpecialite` ? Si non, les compléter pour qu'un libellé rattaché se résolve seul. Si oui, le consigner dans le journal.

### Tâche 7 : frontend commun et écrans admin
- [ ] `jobsService.creerDemandeAjout(type, libelle, contexte)` ; `adminService` : `getDemandesAjout`, `getDemandeProches`, `getDemandesParents`, `accepterDemande`, `rattacherDemande`, `refuserDemande`.
- [ ] `demandesAjoutUi.js` : vocabulaire (statuts, libellés de pastilles, motifs rapides) en un seul endroit.
- [ ] `DemandesAjoutPanel.jsx` (prop `type`) et `DecisionDemandeModal.jsx` (modes Rattacher, Accepter, Refuser ; portail, sans `<form>`, `useEchapPourFermer`, `useSubmitLock`).
- [ ] `AdminReferentielV2.jsx` : nouveaux onglets `demandes-diplomes` (groupe Formations) et `demandes-specialites` (groupe Spécialités) ; retrait de l'onglet « Formations à vérifier » ; badges depuis `demandes_a_examiner`.
- [ ] `AdminLayout.jsx` : le badge de « Formations » lit `demandes_a_examiner.DIPLOME`, celui de « Spécialités » `demandes_a_examiner.SPECIALITE`.

### Tâche 8 : frontend candidat et recruteur
- [ ] `ProposerEntreeModal.jsx` (props `open`, `type`, `libelleInitial`, `contexteInitial`, `onClose`) : même fenêtre que `ProposerMetierModal`, textes adaptés au type.
- [ ] `FormationReferentielSelect.jsx` : « ↩ revenir à la liste » de la spécialité vide aussi le texte (`onChangeAutreTexte("")`) ; texte d'aide « marqué "à vérifier" » remplacé par « en attente de validation ».
- [ ] `ModalFormation.jsx` et `StepFormations.jsx` : `onChangeAutreTexte` écrit aussi `specialite_autre`.
- [ ] `BlocFormationRequise.jsx` : liens « Je ne trouve pas mon diplôme » et « Je ne trouve pas ma spécialité » sous chaque liste, ouvrant `ProposerEntreeModal`.
- [ ] Rechercher les autres textes visibles « à vérifier » côté candidat et recruteur et les remplacer par « en attente de validation ».

### Tâche 9 : tests (à la fin)
- [ ] **Service** (`test_demandes_ajout_service.py`) : création, doublon rejoint, entrée existante, déjà refusée, texte invalide, quota de 5, concurrence (une seule ouverte) ; accepter diplôme et spécialité (entrée créée, codes, `DiplomeSpecialite`) ; rattacher (alias créé, clé déjà prise refusée) ; refuser (motif 5 à 500) ; réexamen d'un refus ; transitions interdites ; notification seulement si explicite ; effets sur les formations liées ; aucune modification d'offre.
- [ ] **API** (`test_demandes_ajout_api.py`) sur de vraies routes : candidat et recruteur rattaché autorisés, recruteur sans entreprise et anonyme refusés, non-admin refusé sur toutes les routes admin, throttle, types non gérés, audit écrit, bloc `demandes_a_examiner`.
- [ ] **Formations** (`test_demandes_ajout_formations.py`) : `D-AUTRE` crée une demande liée, un diplôme réel détache, `specialite_autre` crée une demande, échec de la synchronisation n'empêche pas l'enregistrement.
- [ ] **Commande** (`test_migrer_formations_vers_demandes.py`) : simulation n'écrit rien, application crée les demandes et la sauvegarde JSON, idempotence.
- [ ] **Frontend** : `DemandesAjoutPanel` (pastilles, tableau, actions, ouverture de la fenêtre), `DecisionDemandeModal` (motif obligatoire, présélection du plus proche), `ProposerEntreeModal`, mise à jour de `AdminReferentielV2.test.jsx`, `AdminLayout`, `BlocFormationRequise`, `ModalFormation`.
- [ ] **Finale** : `python manage.py check`, `makemigrations --check --dry-run`, suite backend complète, suite frontend complète, `npm run build`.

### Tâche 10 : documentation et sécurité
- [ ] `docs/fonctionnel/demandes-ajout.md` (nouveau), `SECURITY.md` §28 (permissions, limites, absence d'effet avant décision, offres jamais modifiées), index de `CLAUDE.md`, `docs/architecture/carte-du-code.md`, section de suivi dans `docs/archives/CORRECTIONS_CLIENT_TEMP.md`.
- [ ] Noter le constat n° 1 (« Autre diplôme » invisible de l'ancienne file) et la commande de migration à lancer en production.

---

## Auto-revue du plan contre la spécification
- **Couverture :** modèle et contraintes (T1), trois décisions et effets pour diplôme et spécialité (T2-T3), liens formations (T4), points d'entrée candidat et recruteur diplôme/spécialité (T4, T8), garde-fous (T2-T3), API (T5), vocabulaire et pages (T7), migration avec sauvegarde et simulation (T4), vérification des alias (T6), tests (T9), documentation (T10). **Hors étape 1 par décision :** compétences et métiers (étapes 2 et 3), implicites de compétences, bouton « Détecter », anciennes routes.
- **Placeholders :** aucun « à définir » ; les valeurs (codes, limites, noms de fonctions) sont fixées ici.
- **Cohérence des noms :** `DemandeAjout`, `creer_demande`, `accepter_demande`, `rattacher_demande`, `refuser_demande`, `synchroniser_depuis_formation`, `DemandeRefusee`, `demandes_a_examiner` sont utilisés à l'identique dans les tâches 1 à 9.
