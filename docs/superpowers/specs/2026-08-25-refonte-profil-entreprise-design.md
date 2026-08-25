# Refonte page vitrine EntreprisePublic.jsx — design

## Contexte

Session d'audit visuel du mockup employeur (13 captures) contre l'état réel de l'app. Sur les 13 points, seule la page "Profil entreprise" (point 9, `/entreprise/:slug`) a reçu des retours de design concrets — le reste est déjà conforme. Retours utilisateur : mise en page en carrés/blocs, onglets (À propos/Offres/Photos), stats clés visibles dès le header, photos à côté du texte "À propos" plutôt qu'en pleine largeur en dessous, contact affiché en texte simple avec icônes plutôt qu'en pastilles colorées, et moins de couleur globale sur la page.

Hors scope : le problème de recadrage de bannière constaté pendant l'audit (logo écrasé par `object-cover`) est un problème de **contenu** (mauvaise image uploadée par l'entreprise test), pas de code — non traité ici.

## A. Backend — nouveau champ `annee_creation`

- `ProfilEntreprise.annee_creation` : `PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(1900)])` — année de fondation de l'entreprise (pas la date d'inscription sur TafTech).
- Migration standard (pas de backfill — champ neuf, vide pour toutes les entreprises existantes).
- Éditable dans `ParametresRecruteur.jsx` (onglet "Mon entreprise"), petit champ numérique optionnel à côté des champs existants (secteur, taille, etc.).
- Exposé en lecture dans `EntreprisePublicSerializer` (`jobs/serializers/offres.py`) — ajouté à `fields` du `Meta`, pas de `SerializerMethodField` nécessaire (champ direct).
- `UpdateProfilEntrepriseAPIView` : ajouté à la whitelist des champs modifiables, même pattern que `culture_entreprise`/`banniere` (troncature/validation déjà en place pour les champs texte — ici c'est juste un entier, pas de troncature à prévoir).

## B. Hero — header neutre + 3 stats

Remplace le bloc hero actuel (`taftech_frontend/src/Pages/Recruteur/EntreprisePublic.jsx` lignes ~154-192) :

- **Photo de couverture** : toujours affichée seulement si `banniere_url` présent (comportement inchangé), mais hauteur augmentée pour un ratio plus proche de 16:9 (`h-48 md:h-64` au lieu de `h-32 md:h-48`), coins arrondis conservés.
- **Bandeau sous la bannière** : le fond `bg-linear-to-br from-indigo-600 to-indigo-900` devient un fond blanc/neutre (`bg-white`, texte en `text-slate-900`/`text-slate-700` au lieu de blanc/indigo-100). Logo, nom, secteur/lieu/effectif restent sur la même ligne qu'aujourd'hui, juste recolorés.
- **Nouvelle ligne de 3 stats** sous le nom (remplace la ligne actuelle secteur/lieu/effectif en petit texte inline — celle-ci est promue en vraies "stat tiles") :
  - Offres actives (`nombre_offres_actives`) — toujours affichée (0 si aucune).
  - Effectif (`tailleLabel`, tranche existante) — affichée si `taille_entreprise` renseigné.
  - Ancienneté (`annee_creation` → `new Date().getFullYear() - annee_creation` ans) — **affichée uniquement si `annee_creation` est renseigné**, sinon la stat est omise silencieusement (pas de "N/A").
  - Secteur/lieu restent affichés en sous-texte (comme aujourd'hui), séparés visuellement des 3 stats chiffrées.
- **Bouton "Candidature spontanée"** : reste un bouton plein `bg-indigo-600` (seul accent de couleur fort conservé dans le hero), posé sur le fond blanc au lieu du fond indigo actuel. Comportement desktop/mobile inchangé (visible desktop dans le hero, dupliqué en haut du corps sur mobile).

## C. Onglets + réorganisation du contenu

Nouvel état local `activeTab` (`"apropos" | "offres" | "photos"`, défaut `"apropos"`) — pas de changement d'URL/route.

Barre d'onglets sous le hero, 3 entrées :
- **À propos** (défaut)
- **Offres** — badge avec `nombre_offres_actives`
- **Photos** — badge avec `photos.length`, onglet masqué si aucune photo (comme aujourd'hui la section est conditionnelle)

Pas d'onglet "Avis" (aucune fonctionnalité d'avis/notation n'existe dans le produit).

**Contenu de l'onglet "À propos"** :
- Layout deux colonnes sur desktop (`md:grid-cols-3`, texte `md:col-span-2`, photo `md:col-span-1`), une colonne empilée sur mobile.
- Colonne texte : blocs "Présentation" (`description`) et "Culture d'entreprise" (`culture_entreprise`) — inchangés dans leur contenu/style de carte (fond `bg-slate-50`), juste réordonnés dans cette colonne.
- Colonne photo : **une seule image**, la première de `entreprise.photos` si elle existe. Rien affiché si aucune photo (pas de placeholder vide).
- Localisation (carte Google Maps) : reste **en dehors des onglets**, affichée en dessous de la barre d'onglets sur toutes les vues (info pratique, pas du contenu à parcourir).

**Contenu de l'onglet "Offres"** : la liste actuelle (`entreprise.offres_actives.map(...)`), déplacée telle quelle, aucun changement de style/logique.

**Contenu de l'onglet "Photos"** : la grille complète actuelle (`grid-cols-2 sm:grid-cols-4`), déplacée telle quelle, aucun changement de style.

## D. Contact en texte simple

Les liens LinkedIn/Site web (actuellement des pastilles `bg-[#0A66C2]/10`/`bg-slate-100` avec bordure) deviennent une liste de liens texte inline :
- Icône (déjà existantes : `LinkedinIcon`, `Globe`) + libellé, couleur `text-slate-700`, hover `text-indigo-600` — même traitement pour les deux liens (plus de bleu LinkedIn spécifique).
- Toujours `target="_blank" rel="noopener noreferrer"`, comportement de clic inchangé.
- Positionnement inchangé (juste après le hero, avant "Présentation").

## Hors scope (confirmé avec l'utilisateur)

- Le recadrage de bannière/galerie (contenu, pas code) — pas traité.
- Les badges de type de contrat (CDI/CDD/etc.) dans la liste d'offres — style inchangé, cohérent avec le reste du site.
- Pas de nouveau champ "nombre d'employés exact" — on garde la tranche (`taille_entreprise`) déjà existante.
- Pas d'onglet "Avis".

## Tests à mettre à jour

- `EntreprisePublic.test.jsx` : assertions sur la structure du hero (fond indigo → attentes à retirer/adapter), nouvelles assertions sur les 3 stats (avec/sans `annee_creation`), navigation entre onglets (clic "Offres"/"Photos" affiche le bon contenu, "À propos" par défaut), lien contact en texte simple.
- `ParametresRecruteur.test.jsx` : nouveau champ `annee_creation` dans le formulaire "Mon entreprise" (saisie + soumission).
- Backend : `test_api_recruteur.py`/`test_api_cms.py` (selon où vivent les tests `EntreprisePublicSerializer`) — champ `annee_creation` exposé, validation `MinValueValidator(1900)`.
