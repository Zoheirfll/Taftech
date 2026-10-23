# Journal du 23/10/2026 — « Formation requise » d'une offre : ajouter tout un domaine de spécialités

## 1. Le problème

Dans « Publier une offre » → « Formation requise », le recruteur choisissait ses « Spécialités acceptées » **une à une** dans une liste de ~970 entrées. Or beaucoup de spécialités sont très voisines (Réseaux, Génie logiciel, Systèmes d'information…). Un recruteur en cite une, juge la tâche ennuyeuse et s'arrête : les candidats des spécialités voisines sont exclus sans que personne l'ait voulu.

## 2. État des lieux du référentiel (lecture seule)

- `SpecialiteFormation.domaine` (obligatoire) : 58 domaines actifs, 56 spécialités au plus par domaine. `filiere` facultative (610 spécialités sur 967 n'en ont pas : ignorée).
- `MetierFormation` : 1 411 liens métier → spécialité, mais **seulement 520 métiers actifs sur 997 (52 %)** en ont au moins un. Les suggestions par métier existaient déjà (15 au plus, ajoutées une par une, **jamais pré-cochées** : règle conservée).
- Piège de vocabulaire : la « famille » de `referentiel_utils.FAMILLES_FORMATION` (supérieur / formation professionnelle / thèmes TafTech) est un **niveau**, pas un thème.
- Les trois taxonomies décrivent parfois le même champ sous plusieurs domaines (informatique : `U-MI` 25, `F-INT` 22, `DOM-05` 8 ; électricité : 3 variantes). **Limite acceptée** : ces domaines restent séparés dans la liste.

## 3. Approche abandonnée : « champs d'étude » (regroupement maison de domaines)

Essai : table `ChampFormation` + `DomaineFormation.champ`, fichier `champs_formation.json` (19 champs réunissant les 58 domaines), commande `appliquer_champs_formation`. **Abandonné le jour même sur retour de l'utilisateur** : en essayant à l'écran, le champ « Sécurité, prévention et services » contenait coiffure, esthétique, blanchisserie, horlogerie. Cause : j'avais rangé le domaine `F-MES` (« Métiers des services ») avec la sécurité d'après son seul intitulé. Un regroupement fait à la main sur 58 domaines ne peut pas être garanti ; l'utilisateur a décidé de **suivre le domaine du référentiel tel quel**.
Retiré entièrement (jamais commité) : modèle, migration `0151` (annulée en dev, fichier supprimé), fichier JSON, commande, tests, changements de `NomenclatureFormationAPIView` (cache revenu à `v3`).

## 4. Solution retenue

Un sélecteur **« Ou ajouter tout un domaine de formation »** sous « Spécialités acceptées » :
- les domaines sont présentés **groupés par niveau** (Enseignement supérieur / Formation professionnelle / Thèmes TafTech) par `grouperParFamille`, comme les autres listes de formation, avec le nombre de spécialités ; un domaine sans spécialité sélectionnable n'est pas proposé ;
- **Version finale (demande de l'utilisateur après essai à l'écran : 36 pastilles de spécialités illisibles)** : plus de sélecteur de spécialité une à une. Choisir un domaine **ajoute d'emblée toutes ses spécialités** (acte explicite du recruteur ; jamais d'ajout automatique) et le domaine s'affiche en **une seule pastille « Domaine (n/total) »** ; un clic sur la pastille déplie ses spécialités, à **décocher / recocher** (« 22/22 » devient « 20/22 ») ; la croix retire toutes les spécialités du domaine. Une spécialité hors domaine connu reste visible en pastille (jamais cachée, même si la nomenclature ne se charge pas). Le lien « Autre, préciser » (demande d'ajout d'une spécialité absente) est conservé. Première version écartée : panneau « Tout ajouter (N) » / « Ajouter la sélection (n) » avec cases à cocher avant ajout ;
- les suggestions du métier gagnent un bouton **« Tout ajouter (N) »** (affiché s'il en reste au moins 2).

**Aucun changement backend ni migration** : la nomenclature publique exposait déjà `domaines` (avec leur niveau) et `domaine_id` sur chaque spécialité.

| Élément | Où |
|---|---|
| Composant | `Pages/Recruteur/CreateJob/DomaineSpecialites.jsx` |
| Branchement création **et** modification d'offre | `BlocFormationRequise.jsx`, `useCreateJob.js`, `OffresListPage.jsx` (`ajouterSpecialitesRequises` : ajout groupé sans doublon) |
| Tests | `tests/DomaineSpecialites.test.jsx` (9) ; `BlocFormationRequise.test.jsx` inchangé et vert |

Le domaine **n'entre jamais dans le score** : seules les spécialités effectivement enregistrées comptent (`matcher.py` inchangé).

## 4 bis. Suite du même jour : une phrase de formation lue par le candidat

**Demande de l'utilisateur** : ne plus afficher les spécialités une par une sur l'offre publique, mais une phrase comme Emploitic (« Diplôme Bac +5 … en commerce, logistique, transport… »), utile aux deux côtés. Deux idées écartées d'abord, sur sa décision : enregistrer seulement des domaines sur l'offre (score élargi à tout le domaine, migration) et un « ou domaine similaire » (promesse que le calcul ne tient pas).

**Retenu** : une phrase **calculée** à partir des données déjà enregistrées (aucune migration, aucun changement de score), par `utils/phraseFormation.js` :
- domaine entièrement coché → son nom ; une ou deux spécialités manquantes → « Domaine (sauf X et Y) » ; sinon les spécialités gardées, plafonnées à 5 (« et N autres ») ; jamais de « ou domaine similaire » ;
- affichée sur la page publique (`JobDetail.jsx`, bloc « Formation requise ») et en **aperçu** « Ce que le candidat lira » dans le formulaire (`BlocFormationRequise.jsx`, via `enrichirSpecialites`) ; le recruteur garde sa liste cochable ;
- l'API fournit ce qui manque à la page publique : `specialites_requises_detail` porte `domaine_id`, `domaine_libelle`, `domaine_total` (spécialités sélectionnables du domaine, hors « Autre, préciser ») et `domaine_non_retenues` (libellés, 2 au plus) — `serializers/offres.py::detail_specialites_requises`, 2 requêtes au plus, utilisé aussi par `OffreDashboardDTO`. `id` et `libelle` inchangés.

### Niveaux de diplôme (« Master » = tous les masters)

**Problème** : le score compare les diplômes **par identifiant exact** (`matcher.py`) ; une offre « Master académique » ne retient donc pas un candidat « Master à nature non précisée » (3 variantes de master, 3 de licence dans le référentiel).
**Solution** : `utils/groupesDiplomes.js` (3 groupes, relus avec l'utilisateur) — **Licence (Bac +3)** = `D-LIC-A`, `D-LIC-P`, `D-LIC-NP` ; **Master (Bac +5)** = `D-MAS-A`, `D-MAS-P`, `D-MAS-NP` ; **Doctorat** = `D-DOC-LMD`, `D-DOC-NP`, `D-DOC-SCI`. Choisir un niveau dans « Diplômes acceptés » (groupe « Niveaux (toutes les natures) ») **enregistre ses types** : le calcul ne change pas. Formulaire et page publique les regroupent en une entrée (« Master (Bac +5) » ; un groupe incomplet reste détaillé) ; `diplomes_requis_detail` porte maintenant le `code`.
**Volontairement hors groupes** : ingénieur d'État, magister, BTS, DES… (aucune équivalence construite) et **licence « ancien système classique »** (4 ans : « Bac +3 » serait faux). Les ajouter reste un choix explicite de l'utilisateur.
Tests : `groupesDiplomes.test.js` (9), `phraseFormation.test.js` (13), `test_specialites_detail_domaine.py` (7), `test_diplomes_niveau_master.py` (4 dont « une offre Master retient un master non précisé » et « ne retient pas une licence »).

### Admin

La fiche d'une offre (`/admin-taftech`, `AdminOffres.jsx`, bloc « Diplômes / spécialités acceptés ») montre en tête **« Ce que le candidat lit : … »** (même `phraseFormation` que la page publique), les diplômes regroupés par niveau (une pastille « Master (Bac +5) ») et **garde le détail des spécialités une par une** : l'admin en a besoin pour modérer. Lecture seule : la correction d'offre par l'admin (`admin/offres/<id>/corriger/`) ne modifie ni diplômes ni spécialités, et ce n'a pas été changé. Tests : 2 ajoutés à `AdminOffres.test.jsx` (10 / 10).

### Expérience écrite comme une phrase (option A) et expiration retirée

**Demande** : faire comme Emploitic (« Expérience confirmée de 5 à 10 ans dans un poste similaire, idéalement dans le secteur… ») et **ne plus afficher l'expiration** sur la page de l'offre.
**État des données** : l'offre n'a qu'un niveau (`experience_requise` : Débutant, Jeune diplômé, Stagiaire, Confirmé, Manager, Responsable d'équipe, Cadre dirigeant) ; le score le convertit en années par `_MAP_EXP_ANNEES` (Confirmé 3, Manager / Responsable d'équipe 5, Cadre dirigeant 8, Jeune diplômé 1, Débutant / Stagiaire 0 = critère désactivé), de façon **progressive** (pas un seuil éliminatoire) et **sur les expériences pertinentes seulement**.
**Option A retenue** (choix de l'utilisateur) : phrase déduite du niveau, sans nouvelle donnée — « Expérience confirmée (**environ** 3 ans) **dans un poste similaire** », « Débutant accepté », « Jeune diplômé (environ 1 an d'expérience) ». « Environ » parce que ce n'est pas un seuil ; « poste similaire » parce que seules les expériences pertinentes comptent.
**Écartées** : « 5 à 10 ans » (option B : 2 champs années min / max + migration + score modifié, à décider si les recruteurs la réclament) ; « idéalement dans le secteur du transport » et « ou domaine similaire » (le score ne les utilise pas : promesse que le calcul ne tient pas) ; années recopiées côté interface (second endroit à maintenir) — donc **pas d'expérience dans l'aperçu du formulaire**, visible sur l'offre publiée.
**Code** : `matcher.annees_experience_pour_niveau` (source unique, utilisée par le score), `experience_annees` en lecture seule sur `OffreEmploiSerializer` et `OffreDashboardDTO`, `utils/phraseExperience.js`, bloc « Formation et expérience requises » de `JobDetail.jsx` et fiche admin. Tests : `test_experience_annees.py`, `phraseExperience.test.js`, `JobDetail.test.jsx` (4 ajoutés), `AdminOffres.test.jsx`.
**Expiration** : le badge « Expire dans N jours » / « Expirée » est retiré de `JobDetail.jsx` (« Poste pourvu » conservé pour une offre clôturée). Ni l'API (`jours_restants`) ni l'archivage automatique ne changent ; les listes et l'admin gardent leurs propres affichages de dates.
**Incident de session** : les serializers ont été modifiés pour appeler `annees_experience_pour_niveau` **avant** que sa définition soit enregistrée dans `matcher.py` (première écriture refusée par le hook, rejouée ensuite) : le serveur de dev gardait l'ancien module et `/api/jobs/` répondait 500 (`ImportError`) jusqu'à son redémarrage. Règle : ajouter la fonction **avant** ses appelants.

### Compétences écrites en phrases

**Demande** : « la même chose des phrases pour les compétences ». La page publique listait des pastilles `Conception d'API · Confirmé` sous « Indispensables » / « Souhaitées ».
**Ce que le score fait** (`competences_score_structure`) : une compétence obligatoire pèse **2**, une souhaitée **1** ; le niveau requis donne un crédit partiel (60 % en dessous du niveau, 80 % si le niveau du candidat est inconnu), **jamais un rejet**. La phrase n'écrit donc que : indispensable / souhaitée et le niveau.
**Résultat** (`utils/phraseCompetences.js`) : « Compétences indispensables : Conception d'API (confirmé) et Gestion de versions Git (intermédiaire). » puis « Compétences souhaitées : Conteneurisation Docker (intermédiaire). ». **Aucun plafond** (contrairement aux spécialités : cacher une compétence indispensable au candidat serait trompeur) ; sans compétence structurée, le texte libre reste affiché ; la fiche admin ajoute ces phrases à « Ce que le candidat lit » et garde ses pastilles détaillées pour modérer.
**Défaut trouvé sur capture et corrigé pour la formation aussi** : « …Informatique, données et numérique, Génie logiciel, …Réseaux et Systèmes Distribués et Statistiques et Probabilités… » était ambigu (les libellés contiennent eux-mêmes des virgules et des « et »). `utils/listeFrancaise.js::joindre` sépare désormais **tous** les éléments par « ; » dès qu'un élément contient une virgule ou « et » (partagé par `phraseFormation` et `phraseCompetences`).
Tests : `phraseCompetences.test.js` (11, dont `joindre`), `phraseFormation.test.js` (+1), `JobDetail.test.jsx` (+2), `AdminOffres.test.jsx` (+1).

## 5. Vérifications et suites

- Tests ciblés (composant + bloc) : 13 / 13 ; build de production OK. Suite frontend complète non relancée après le changement d'approche (la version « champs » avait donné 729 / 733, 4 échecs `MesCandidatures` connus).
- **À essayer à l'écran** sur `/creer-offre` et en modifiant une offre.
- Pistes non faites : une vraie couverture du lien métier ↔ spécialité (48 % des métiers n'en ont aucun) rendrait les suggestions plus utiles ; si un regroupement thématique redevient souhaitable, le faire **avec relecture de chaque domaine par l'utilisateur**, jamais d'après l'intitulé.
