# Demandes d'ajout au référentiel — conception

Date : 16/10/2026 · Branche : `feature/qualite-ia-stats-recruteur` · Statut : **en attente de relecture par l'utilisateur** (aucun code écrit).

## 1. Objectif

Métiers, compétences, types de diplôme et spécialités ont le même besoin : quand une personne ne trouve pas ce qu'elle cherche dans le référentiel, elle le signale, et l'administrateur décide de l'**ajouter**, de le **rattacher** à une entrée existante, ou de le **refuser**. Aujourd'hui trois circuits différents font presque la même chose avec trois vocabulaires, et les spécialités et types de diplôme n'ont aucun circuit d'ajout. Cette conception les unifie : mêmes termes, mêmes décisions, mêmes pages.

## 2. État actuel (vérifié dans le code le 16/10/2026)

| | Compétences | Métiers | Formations (diplôme / spécialité) |
|---|---|---|---|
| Déclencheur | saisie hors référentiel (automatique depuis le 15/10) | lien « Je ne trouve pas mon métier » (candidat, recruteur) | « Autre, préciser » (candidat seulement) |
| Stockage | ligne de la liste officielle avec un statut | table `PropositionMetier` | la formation du candidat (`statut_validation = A_PRECISER`) |
| Statuts | Suggérée, Validée, Rejetée, Désactivée | Suggéré, Validé, Rejeté | Déclaré, À préciser, Refusée |
| Décisions | valider, rejeter | rattacher, créer, rejeter | attribuer un diplôme ou une spécialité existants, refuser |
| Créer une entrée neuve | oui | oui | **non** |
| Motif de refus | non | obligatoire | facultatif |
| Notification du proposant | non | oui | oui |
| Journal d'audit | `STATUT_COMPETENCE` | `STATUT_METIER` | **aucun** |
| Aide à la décision | usages | demandeurs distincts, métiers proches | aucune |
| Limite par compte | aucune | 5 ouvertes, 30 envois/h | sans objet |

Le texte « Autre spécialité » est stocké dans le champ `description` de la formation et ne déclenche une vérification que si le diplôme choisi a des spécialités connues (`FormationCandidat.save()`). Les recruteurs n'ont aucun moyen de signaler un diplôme ou une spécialité manquant dans une offre.

## 3. Décisions prises pendant le brainstorming

1. **Trois décisions partout** : Accepter (nouvelle entrée), Rattacher (le libellé devient appellation, synonyme ou alias d'une entrée existante), Refuser (motif obligatoire).
2. **Points d'entrée recruteur** : type de diplôme manquant, spécialité manquante, compétence hors liste dès la 1re saisie (en plus du métier, déjà possible).
3. **Table unique** `DemandeAjout` pour les quatre types ; livraison par étapes.
4. **Présentation** : deux onglets par page, *Liste* et *Demandes*.
5. **Notifications** : seulement pour les demandes explicites (clic « Je ne trouve pas… » ou « Autre, préciser »), pas pour une compétence créée par simple saisie.

## 4. Vocabulaire

Statuts : **À examiner → Acceptée | Rattachée | Refusée**. Une demande refusée peut être réexaminée (→ Acceptée | Rattachée). Une demande acceptée ou rattachée est terminale : pour revenir en arrière, on modifie ou on masque l'entrée officielle.
Côté candidat et recruteur, « À vérifier » devient **« En attente de validation »**.
Liste officielle : **Actif / Masqué** pour les quatre types. Pour les compétences, ce n'est qu'un libellé d'affichage : en base, `VALIDEE` et `DESACTIVEE` ne changent pas.

## 5. Modèle de données

`DemandeAjout` (dossier `jobs/demandes_ajout/`) :

| Champ | Rôle |
|---|---|
| `type` | `METIER`, `COMPETENCE`, `DIPLOME`, `SPECIALITE` |
| `libelle` (120) | texte demandé, tel que saisi |
| `cle_recherche` (250, indexé) | forme normalisée (accents, casse, abréviations), sert aux doublons |
| `contexte` (300, facultatif) | précision utile à la décision : diplôme concerné pour une spécialité, titre de l'offre pour un recruteur |
| `explicite` | vrai pour un clic, faux pour une compétence créée par saisie |
| `origine` | `CANDIDAT` ou `RECRUTEUR` (celle du premier demandeur) |
| `premier_demandeur`, `demandeurs` | tous les demandeurs ; un même compte ne compte qu'une fois |
| `statut` | `A_EXAMINER`, `ACCEPTEE`, `RATTACHEE`, `REFUSEE` |
| `entree_id`, `entree_libelle` | entrée officielle créée ou choisie (identifiant et copie du libellé) |
| `motif_refus` | texte, obligatoire (5 à 500 caractères) pour tout nouveau refus |
| `traite_par`, `date_decision`, `date_creation` | traçabilité |

Contraintes : une seule demande `A_EXAMINER` par couple (`type`, `cle_recherche`), garantie en base (sûre en cas de requêtes simultanées). Les décisions se prennent sous verrou de ligne (`select_for_update`), comme `valider_proposition` aujourd'hui.

Liens : `FormationCandidat.demande_diplome` et `FormationCandidat.demande_specialite` (clés étrangères facultatives, `SET_NULL`). Ils remplacent l'astuce fondée sur `description` et l'heuristique de `FormationCandidat.save()`.

## 6. Décisions et effets par type

Un adaptateur par type applique la décision. Les codes des entrées créées suivent la convention actuelle `TAF-<type>-<id de la demande>` (ex. `TAF-PM-12` pour les métiers).

| | Accepter | Rattacher |
|---|---|---|
| Métier | `Metier` dans un `GroupeMetier` choisi (comme aujourd'hui) | `Appellation` du métier choisi |
| Compétence | `CompetenceReferentiel` validée | ajout du libellé aux `synonymes` de la compétence choisie, puis `rattacher_competences_orphelines()` |
| Type de diplôme | `TypeDiplome` ; l'admin choisit le `systeme` parmi ceux qui existent | `AliasDiplome` du diplôme choisi |
| Spécialité | `SpecialiteFormation` ; l'admin choisit le domaine (la filière est facultative) et, en option, les diplômes concernés (`DiplomeSpecialite`) | `AliasSpecialite` de la spécialité choisie |

À l'acceptation, l'admin peut corriger le libellé avant création.
**Effet immédiat** de toute décision acceptée ou rattachée : les saisies existantes qui portent ce libellé sont rattachées (profils, offres, formations en attente). Une formation en attente reçoit son diplôme ou sa spécialité ; son statut revient à `DECLARE` par le mécanisme actuel.
**Les offres ne sont jamais modifiées automatiquement** : changer les diplômes ou spécialités acceptés d'une offre publiée modifierait ses scores. Le recruteur est notifié (demande explicite) et ajoute l'entrée lui-même.
**Aucun effet avant décision** : une demande ne change ni liste publique, ni score, ni rattachement.
Un libellé refusé n'est jamais re-proposé.

## 7. Points d'entrée et garde-fous

| Qui | Où | Déclencheur | Type | Explicite |
|---|---|---|---|---|
| Candidat | formation, niveau diplôme | « Autre, préciser » | diplôme | oui |
| Candidat | formation, niveau spécialité | « Autre, préciser » | spécialité | oui |
| Candidat | profil, assistant CV, « Mes compétences » | libellé hors référentiel, dès la 1re saisie | compétence | non |
| Candidat | profil, préférences, assistant | « Je ne trouve pas mon métier » | métier | oui |
| Recruteur | offre, diplômes acceptés | « Je ne trouve pas mon diplôme » | diplôme | oui |
| Recruteur | offre, spécialités acceptées | « Je ne trouve pas ma spécialité » | spécialité | oui |
| Recruteur | offre, compétences | libellé « hors liste », dès la 1re saisie | compétence | non |
| Recruteur | offre, métier | inchangé | métier | oui |

Garde-fous (service unique, appliqué aux quatre types) :
- Texte de 3 à 120 caractères avec au moins une lettre ; filtre anti-bruit du parser de CV (chiffres seuls, montants, phrases, coordonnées).
- Si le libellé existe déjà comme entrée officielle (libellé, synonyme, alias, appellation ; accents et casse ignorés), aucune demande n'est créée. Un clic explicite reçoit « Cette entrée existe déjà : … ».
- Demande ouverte identique : le demandeur y est ajouté.
- Libellé déjà refusé : refus immédiat avec message clair.
- Demandes explicites : 5 ouvertes au maximum par compte et 30 envois par heure (limite `write_action`).
- Demandes implicites : pas de plafond de principe, mais au plus 50 demandes nouvellement créées par compte et par 24 heures (rejoindre une demande déjà ouverte ne compte pas) ; au-delà, la compétence reste saisie sans créer de demande.
- Accès : candidat, ou recruteur rattaché à une entreprise. Côté admin : rôle admin uniquement, vérifié par un test sur de vraies routes.
- Journal d'audit : action unique `DECISION_DEMANDE_AJOUT` (type, libellé tronqué, décision, entrée cible). Les anciennes actions restent lisibles.

## 8. API

Public (authentifié) : `POST /api/jobs/demandes-ajout/` `{type, libelle, contexte?, formation_id?}` ; réponses : demande créée ou rejointe, ou « entrée déjà existante ».
Admin : `GET admin/demandes-ajout/?type=&statut=&search=&page=` (30 par page, compteurs par statut) ; `GET admin/demandes-ajout/<id>/proches/` (5 entrées proches) ; `POST admin/demandes-ajout/<id>/accepter/` `{libelle?, parent?, filiere_id?, diplomes_ids?}` (`parent` = identifiant du groupe de métier, valeur du système de diplôme ou identifiant du domaine de formation selon le type ; absent pour une compétence ; `filiere_id` et `diplomes_ids` ne concernent que les spécialités) ; `POST …/rattacher/` `{entree_id}` ; `POST …/refuser/` `{motif}`.
Le bloc `demandes_a_examiner` de `admin/statistiques/` (un compteur par type) remplace `metiers_a_valider`, `competences_a_valider` et `formations_a_verifier`.
Les anciennes routes (`referentiel/metiers/proposer/`, `admin/propositions-metiers/…`, `admin/competences/proposer/`, `admin/referentiel-v2/formations-a-verifier/…`) restent actives jusqu'à l'étape 4. `admin/competences/<id>/statut/` reste utilisée pour Actif / Masqué, mais n'accepte plus les statuts Suggérée et Rejetée à partir de l'étape 3.

## 9. Interface

Menu inchangé : Métiers, Formations, Spécialités, Compétences, avec un badge rouge (demandes à examiner de la page).

| Page | Onglets |
|---|---|
| Métiers | Liste · Métiers similaires · Demandes |
| Formations | Types de diplôme · Demandes (« Formations à vérifier » disparaît) |
| Spécialités | Liste · Spécialités similaires · Demandes |
| Compétences | Liste · Demandes (le bouton « Détecter les propositions » disparaît) |

Composant unique `DemandesAjoutPanel` (paramétré par type) : pastilles *À examiner · Acceptées · Rattachées · Refusées* avec compteurs, recherche, pagination admin standard, colonnes Demande / Demandée par / Utilisée par / Statut / Actions, entrées proches cliquables sous chaque libellé. « Utilisée par » compte les saisies qui portent déjà ce libellé : profils et offres pour un métier ou une compétence (même calcul que l'écran Compétences actuel), formations reliées à la demande pour un diplôme ou une spécialité.
Fenêtre unique `DecisionDemandeModal` : Rattacher (recherche dans les entrées du type, la plus proche présélectionnée) · Accepter (libellé corrigeable, parent selon le type) · Refuser (motif obligatoire, motifs rapides : « Existe déjà sous un autre nom », « Trop vague », « Hors périmètre »). Jamais de `window.confirm` ; toutes les couleurs viennent des tokens `tw.*`. Une décision se réexamine, donc pas de mot-clé de confirmation.

## 10. Migration et livraison

| Étape | Contenu | Données migrées |
|---|---|---|
| 1 | Socle (modèle, service, API, composants) + diplômes et spécialités, liens côté recruteur et candidat ; « Formations à vérifier » disparaît | formations `A_PRECISER` existantes → demandes, regroupées par libellé |
| 2 | Métiers : bascule des propositions, notifications et audit unifiés | `PropositionMetier` |
| 3 | Compétences : la liste ne garde que les actives ou masquées ; le service commun remplace `suggerer_competence` et `proposer_competences_frequentes` (écrites le 15/10) | compétences `SUGGEREE` (39 en base de développement) et `REJETEE` |
| 4 | Nettoyage : anciennes routes, table `PropositionMetier`, heuristique `A_PRECISER`, anciens tests | aucune |

Précautions (règles du projet) : sauvegarde JSON avant chaque migration ; commande de simulation qui liste exactement ce qui sera migré avec un échantillon à valider ; anciennes lignes conservées jusqu'à l'étape 4 ; les refus anciens migrés n'ont pas de motif (l'obligation ne vaut que pour les nouveaux refus).
**Vérification obligatoire à l'étape 1** : les résolveurs de spécialité (suggestions du formulaire de formation, parser de CV) tiennent-ils compte de `AliasSpecialite` ? Le résolveur de diplôme utilise déjà `AliasDiplome`. Sinon, les y ajouter, avec un test : « après un rattachement, une saisie du même libellé se résout seule ».

Chaque étape fera l'objet de son propre plan d'implémentation, ses tests et sa documentation, et reste livrable seule. Le premier plan couvre l'étape 1.

## 11. Tests

- Pour chaque type : accepter crée l'entrée correcte, rattacher crée l'appellation, le synonyme ou l'alias, refuser exige un motif et n'est jamais re-proposé, réexamen d'un refus.
- Garde-fous : doublon de demande, entrée déjà existante, limites de 5 et de 50, texte invalide, concurrence (une seule demande ouverte).
- Permissions sur de **vraies routes** : candidat, recruteur rattaché ou non, admin ; l'admin simple et le non-admin sont refusés comme il se doit.
- Notifications seulement pour les demandes explicites ; journal d'audit à chaque décision.
- Effets : formation en attente réattribuée, offre jamais modifiée, score inchangé avant décision.
- Migration : jeu d'essai avec formations en attente, propositions de métier, compétences suggérées et rejetées.
- Frontend : tableau, pastilles, fenêtre de décision, validation du motif, badges du menu.

## 12. Risques et limites

1. Réécriture de deux fonctionnalités testées (environ 30 tests) : on les migre, on ne les supprime pas.
2. Matching : aucun changement des résolveurs d'alias et de synonymes ; test de non-régression.
3. Recherche des entrées proches : 5 résultats, via `cle_recherche` indexée.
4. Taille des fichiers : service, adaptateurs et vues dans un dossier dédié, chaque fichier sous 800 lignes ; entrée à ajouter dans `docs/architecture/carte-du-code.md`.
5. Un candidat peut créer jusqu'à 50 demandes implicites par jour : la modération reste à l'admin.
6. Documentation après chaque étape : `docs/fonctionnel/demandes-ajout.md` (nouveau), `SECURITY.md` §28, index de `CLAUDE.md`, carte du code.

## 13. Hors périmètre

Fusion de deux entrées officielles (reste réservée à `consolider_referentiel`) ; actions groupées sur les demandes ; ajout automatique d'une entrée acceptée aux offres existantes ; nouvelles catégories (langues, secteurs), que le modèle permettrait d'ajouter plus tard ; envoi d'e-mails (notifications dans l'application uniquement, comme aujourd'hui).
