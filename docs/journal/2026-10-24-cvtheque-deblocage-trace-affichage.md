# Journal du 24/10/2026 — CVthèque : qui a débloqué un profil, et affichage des profils verrouillés

## 1. Demande

Écrire **quand** un profil a été débloqué et **par quel membre de l'équipe**, sur la fiche du candidat et dans le tableau de bord (journal d'activité / suivi) ; rendre la différence entre profils débloqués et verrouillés plus visible (« Identité masquée » était trop passif) ; proposer d'autres façons d'afficher la liste.

## 2. État avant

- Le journal d'équipe (`EquipeActionLog`, action `DEBLOQUER_CANDIDAT`) écrivait déjà « X a débloqué le profil de Y dans la CVthèque » avec date et auteur (`views/credits.py`, `_phrase_activite` du dashboard). **Rien à changer de ce côté.**
- `AccesCandidatDebloque` ne gardait que l'entreprise, le candidat, la source (quota mensuel / pack) et la date : **pas l'auteur**. La fiche du candidat n'affichait donc ni date ni auteur.

## 3. Ce qui a été fait

- **Modèle** : `AccesCandidatDebloque.debloque_par` (FK utilisateur, `null=True`, `SET_NULL`, `related_name='deblocages_effectues'`), migration `0154_acces_candidat_debloque_par`. Les déblocages antérieurs n'ont pas d'auteur (jamais enregistré, non reconstruit) : la fiche n'affiche alors que la date.
- **Écriture** : `credits_utils.deverrouiller_candidat(entreprise, candidat, par=None)` ; la vue `DeverrouillerCandidatAPIView` passe `par=request.user`.
- **Lecture** : `ProfilCandidatDTO` expose `debloque_le` et `debloque_par_nom` (prénom nom, sinon e-mail) **seulement quand le contexte porte `unlocked_ids` sous forme de dict `{candidat_id: accès}`** (posé par `CVThequeView`, `select_related('debloque_par')`, une seule requête par page). Hors CVthèque (vue du candidat sur son propre profil), les deux champs sont `None`. `_peut_voir_coordonnees` continue de tester `user_id in unlocked_ids` (marche pour un dict comme pour un set).
- **Filtre serveur `?debloque=oui|non`** sur `CVThequeView` (onglets « Tous / Débloqués / Verrouillés »), limité aux déblocages de l'entreprise du recruteur connecté.
- **Fiche** (`PanneauDetailCandidat.jsx`) : ligne « 🔓 Débloqué le … par … » ; encart « Coordonnées verrouillées » (cadenas, ce que le déblocage donne, pastilles floutées, bouton) à la place du simple bouton.
- **Carte de la liste** (`CarteCandidat.jsx`) : avatar cadenas + faux nom flouté + « Débloquer pour voir l'identité » + pastille « Verrouillé » ; vrai nom + pastille « Débloqué » une fois débloqué.
- **Affichage** : onglets, bascule liste / grille (préférence `localStorage` `cvtheque_vue`, try/catch, large écran seulement), fiche en fenêtre dans le mode grille, **balayage tactile** (droite = favori, gauche = masquer jusqu'au rechargement ; `touch-action: pan-y` garde le défilement vertical).

## 4. Pièges rencontrés

1. **Migration oubliée sur la base de dev** : `makemigrations` puis `migrate` immédiat (règle déjà au CLAUDE.md). Sans lui, `ProgrammingError` au premier déblocage.
2. **Le serveur de dev ne s'était pas rechargé** après une écriture en deux temps du sérialiseur (champs dans `Meta.fields` avant leur déclaration) : 500 `ImproperlyConfigured: Field name debloque_le is not valid` et liste vide à l'écran, alors que le code final était correct. Redémarrer `runserver` après un changement de sérialiseur qui échoue au premier essai.
3. **Sélection qui sautait** : après un déblocage, `chargerCandidats` re-sélectionnait toujours le premier candidat. Corrigé (`setSelectedCandidat` fonctionnel : garde le candidat sélectionné s'il est encore dans la liste, version rafraîchie).

## 5. Approches écartées

- **Cartes à balayer (type Tinder) comme mode principal** : écarté, une CVthèque se parcourt en comparant plusieurs profils ; le balayage est gardé **sur mobile seulement**, en complément.

## 6. Vérifié

- Backend : `test_api_cvtheque_credits` (+4 tests : auteur et date, non débloqué sans auteur, filtre oui/non, déblocage d'une autre entreprise ignoré), `test_api_credits`, `test_cvtheque_profil_masque_supprime` : 23 tests OK (`DB_NAME=taftech_db_claude_iso`).
- Frontend : `tests/CVTheque.test.jsx` 18 OK, build OK. **Non essayé à l'écran** : grille, fenêtre de fiche et balayage tactile (téléphone).
- Non lancé : suites complètes backend et frontend.
