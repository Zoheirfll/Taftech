# Demandes d'ajout au référentiel

À lire avant de toucher aux types de diplôme, aux spécialités, au formulaire de formation du candidat, au bloc « Formation requise » d'une offre, ou à l'onglet « Demandes » de l'admin. Conception complète : [spécification du 16/10/2026](../superpowers/specs/2026-10-16-demandes-ajout-design.md) ; plan de l'étape 1 : [plan](../superpowers/plans/2026-10-16-demandes-ajout-etape-1.md).

## Principe
Quand une personne ne trouve pas un type de diplôme ou une spécialité dans une liste, elle le **demande**. L'admin décide :
- **Accepter** : l'entrée devient officielle (nouveau `TypeDiplome` ou `SpecialiteFormation`) ;
- **Rattacher** : le libellé devient un alias d'une entrée existante (`AliasDiplome`, `AliasSpecialite`) et sera reconnu ensuite ;
- **Refuser** : motif obligatoire (5 à 500 caractères), envoyé au demandeur ; un libellé refusé n'est jamais re-proposé.

Statuts : **À examiner → Acceptée | Rattachée | Refusée** ; une demande refusée peut être réexaminée, une demande acceptée ou rattachée est terminale (pour revenir en arrière, on modifie ou on masque l'entrée officielle). Mêmes mots partout : « suggérée » et « à vérifier » ne sont plus utilisés pour ce circuit ; côté candidat et recruteur on dit **« en attente de validation »**.

**Aucun effet avant décision** : une demande ne change ni liste publique, ni score, ni rattachement. **Les offres ne sont jamais modifiées automatiquement** par une décision (cela changerait leurs scores) : le recruteur est notifié et ajoute l'entrée lui-même.

## Où est le code
| Sujet | Fichier |
|---|---|
| Modèle `DemandeAjout`, liens `FormationCandidat.demande_diplome` / `demande_specialite` | `jobs/models/demande_ajout.py`, `jobs/models/profils.py` |
| Règles (limites, validation du texte, `DemandeRefusee`) | `jobs/demandes_ajout/regles.py` |
| Un adaptateur par type (existe déjà ?, entrées proches, accepter, rattacher, effets) | `jobs/demandes_ajout/adaptateurs.py` |
| Création avec garde-fous, trois décisions, notifications | `jobs/demandes_ajout/service.py` |
| Lien avec les formations des candidats | `jobs/demandes_ajout/formations.py` |
| API publique et admin | `jobs/views/demandes_ajout.py`, `jobs/serializers/demande_ajout.py`, routes `demandes-ajout/` et `admin/demandes-ajout/` |
| Migration des formations existantes | `manage.py migrer_formations_vers_demandes` |
| Écrans admin | `Pages/Admin/demandes/` (`DemandesAjoutPanel`, `DecisionDemandeModal`, `demandesAjoutUi.js`), onglets « Demandes » de `AdminReferentielV2.jsx` |
| Fenêtre candidat / recruteur | `Components/ProposerEntreeModal.jsx`, liens dans `BlocFormationRequise.jsx` |

## Règles à connaître
- **Garde-fous** (service unique) : libellé 3 à 120 caractères, au moins une lettre, ni e-mail, ni adresse web, ni numéro de téléphone, 12 mots maximum ; refus si l'entrée existe déjà (libellé ou alias, accents et casse ignorés) ; une demande identique rejoint la demande ouverte (un compte ne compte qu'une fois) ; **5 demandes explicites ouvertes au maximum par compte** et 30 envois par heure (`write_action`) ; demandes implicites (compétences, étape 3) : 50 créations par compte et par 24 heures.
- **Une seule demande ouverte par (type, libellé normalisé)** : contrainte en base (`demande_ajout_ouverte_unique`), sûre en cas de requêtes simultanées. Les décisions se prennent sous `select_for_update`.
- **Accès** : création par un candidat ou un recruteur rattaché à une entreprise (admin, recruteur sans entreprise, anonyme : refusés) ; décisions réservées à `IsAdminRole`.
- **Codes des entrées créées** : `TAF-DIP-<id>`, `TAF-SPE-<id>`, `TAF-AD-<id>`, `TAF-AS-<id>`, `TAF-DS-<id>-<diplôme>`, où `<id>` est celui de la demande.
- **Accepter** : diplôme → l'admin choisit le système (famille) ; spécialité → il choisit le domaine, éventuellement la filière et les diplômes concernés (couples `DiplomeSpecialite`). Il peut corriger le libellé ; l'écriture d'origine reste reconnue par un alias.
- **Résolution par alias** : `referentiel_utils._specialite_par_alias_exact` — un alias qui correspond exactement au texte résout la spécialité, à condition que le couple diplôme + spécialité soit attesté (règle F06 du projet). Le résolveur de diplômes utilisait déjà `AliasDiplome`.
- **Notifications** : seulement pour les demandes **explicites** (un clic « Je ne trouve pas… » ou « Autre, préciser »).
- **Journal d'audit** : action `DECISION_DEMANDE_AJOUT` à chaque décision.

## Formulaire de formation du candidat
- « Autre diplôme » est enregistré avec `diplome_ref = D-AUTRE` (une vraie entrée du référentiel) et le texte dans `diplome`.
- « Autre spécialité » : le formulaire envoie en plus `specialite_autre` (le texte), seulement quand le mode « Autre » est actif ; « revenir à la liste » vide ce texte.
- À l'enregistrement d'une formation, `synchroniser_depuis_formation` crée ou rejoint la demande et la relie à la formation. L'échec de cette étape est journalisé et **ne bloque jamais** l'enregistrement.
- On ne délie la demande que si un vrai diplôme ou une vraie spécialité est choisi ensuite. Modifier un autre champ (l'établissement par exemple) conserve le lien.
- Une formation « à préciser » à cause de sa spécialité (importée d'un CV, par exemple) devient aussi une demande, comme l'ancienne file « Formations à vérifier » la montrait à l'admin.

## Pièges rencontrés
- **« Autre diplôme » n'entrait jamais dans l'ancienne file admin** : `FormationCandidat.save()` ne marque « à préciser » que `not diplome_ref_id`, or le formulaire pose `D-AUTRE`. Ces formations étaient donc invisibles pour l'admin ; le nouveau circuit les voit.
- **`FormationCandidat.save()` écrase un statut « refusée »** : pour un diplôme considéré comme certain (`D-AUTRE`), il remet aussitôt `DECLARE`. Le refus d'un type de diplôme marque donc les formations par `update()`, pas par `save()`.
- **~~Le texte « Autre spécialité » vit dans `description`~~ (corrigé le 19/10/2026)** : `description` recevait à la fois le texte libre de la spécialité, le libellé d'une vraie spécialité et le « Mémoire : … » importé du CV ; une simple note déclenchait « à préciser » et s'affichait dans « Autre spécialité ». Le texte libre a maintenant son champ : `FormationCandidat.specialite_texte` (migration `0146`, reprise des données `0147` : seules les formations déjà « à préciser » sans spécialité de référence y reçoivent le texte de `description`, qui n'est jamais modifiée). `save()`, `_specialite_a_preciser`, la commande `migrer_formations_vers_demandes` et les écrans (`ModalFormation.jsx`, `StepFormations.jsx`) lisent `specialite_texte` ; `description` redevient une note libre qui ne déclenche rien ; elle est modifiable dans la modale de formation de la page Profil (champ « Description ou mention (optionnel) », ajouté le 19/10/2026 : la modale n'avait aucun champ pour elle, qui n'était éditable que par le détour du texte « Autre spécialité ») et dans l'assistant d'import. `specialite_autre` reste le signal explicite envoyé par le formulaire.

## Choix abandonnés
- **Deviner la spécialité à partir de `description`** (ancienne heuristique de `save()`) : fragile, remplacée par un signal explicite puis, le 19/10/2026, par le champ dédié `specialite_texte`.
- **Une page « Détecter les propositions » pour les spécialités et diplômes** : inutile, la demande naît à la saisie.
- **Modifier automatiquement les offres quand une entrée est acceptée** : refusé, cela changerait des scores déjà publiés.
- **Fusionner deux entrées officielles depuis ce circuit** : reste réservé à `consolider_referentiel`.

## Correctif du 16/10/2026 : l'intitulé n'est pas un type de diplôme
- **Seul « Autre diplôme » (`D-AUTRE`) crée une demande de type de diplôme.** Une formation sans type choisi garde son intitulé (`diplome`) tel quel : il n'a jamais été un type de diplôme à ajouter. Première version fautive : `synchroniser_depuis_formation` et `migrer_formations_vers_demandes` prenaient aussi les formations sans `diplome_ref` ; 10 demandes erronées (intitulés de formations) ont été créées par la migration sur la base de développement, puis retirées (formations déliées, demandes supprimées ; sauvegarde JSON dans `docs/archives/`).
- **Une spécialité déjà au référentiel ne crée pas de demande** (`ENTREE_EXISTANTE`, refus non bloquant) : le formulaire le dit à l'utilisateur (« existe déjà dans la liste, choisissez-la ») au lieu de l'enregistrer en silence comme texte libre.
- **Édition d'une formation** : une spécialité saisie en « Autre » est réaffichée dans son champ (avant, le formulaire d'édition l'affichait vide).

## Migration des données (production)
`python manage.py migrer_formations_vers_demandes` : **simulation par défaut** (liste exacte et échantillon de 10), `--appliquer` écrit d'abord une sauvegarde JSON dans `docs/archives/` puis crée les demandes. Idempotente (une formation déjà liée est ignorée). Une formation sans demande est signalée si l'entrée existe déjà, si le libellé a déjà été refusé ou si le compte a atteint la limite de 5 demandes. Aucune formation n'est modifiée en dehors des deux liens. Base de développement le 16/10/2026 : 10 formations seraient concernées (diplôme sans référence), 0 spécialité ; la commande n'a **pas** été appliquée.

## État
- **Étape 1 livrée** : types de diplôme et spécialités. L'onglet « Formations à vérifier » a disparu de l'interface ; ses routes serveur (`admin/referentiel-v2/formations-a-verifier/`) restent actives jusqu'à l'étape 4.
- **Étapes 2 et 3 livrées (16/10/2026)** : métiers (`ProposerMetierModal` → `creerDemandeAjout("METIER", …)`, commande `migrer_propositions_metier_vers_demandes`) et compétences (type `COMPETENCE`, adaptateur `AdaptateurCompetence` : accepter = créer/promouvoir la compétence officielle, rattacher = ajouter un synonyme ; première saisie d'un candidat ou d'une offre = demande implicite, sans notification). La liste « Compétences » n'affiche plus les « Suggérées » (statuts reconnus uniquement) ; elles vivent dans l'onglet « Demandes ». Commande `migrer_competences_vers_demandes` (simulation par défaut, `--appliquer` sauvegarde en JSON dans `docs/archives/`)  : **appliquée sur la base de développement le 16/10/2026** (39 compétences reprises ; formations : 10 reliées à une demande ; propositions de métier : 0), sauvegardes JSON dans `docs/archives/`. **À relancer en production** (simulation d'abord), sinon les suggestions restent masquées. Les décisions COMPETENCE n'ont pas de « parent » dans la modale.
- **Métier proposé en attente (21/10/2026)** : « Je ne trouve pas mon métier » ne se contente plus d'envoyer une demande, la proposition **reste sélectionnée** sur l'expérience (`ExperienceCandidat.demande_metier`), le métier du profil (`ProfilCandidat.demande_metier`) ou le métier souhaité (`demande_metier_souhaite`), comme une spécialité « Autre » sur une formation. **Candidat seulement** (jamais les offres), conception : [2026-10-21-metier-propose-en-attente-design.md](../superpowers/specs/2026-10-21-metier-propose-en-attente-design.md), module `jobs/demandes_ajout/metiers.py`, migration `0149`. Règles : jamais un critère de calcul (le matching ne lit que `metier` / `metier_souhaite`) ; seule une demande ouverte, de type métier, du compte connecté peut être liée ; **acceptée ou rattachée** → métier officiel et appellation posés automatiquement, lien retiré, cache de scores invalidé ; **refusée** → le lien reste, le motif s'affiche, aucun effet sur le score ; visible du candidat seulement (`inclure_metier_propose`), jamais d'un recruteur (SECURITY.md §40). Front : `MetierAutocomplete` (prop `onPropose`), `ProposerMetierModal` (prop `onProposed`), `Components/MetierProposeBadge.jsx`. **Piège** : dans l'assistant d'intégration, `metier_propose` désigne le métier suggéré par l'IA (statistiques de corrections) ; le métier proposé par le candidat s'y appelle `demande_metier*`.
- **À venir** : étape 4 (suppression des anciennes routes `referentiel/metiers/proposer/`, `admin/propositions-metiers/*`, `admin/competences/proposer/`, `formations-a-verifier/*`, de `suggerer_competence`, `proposer_competences_frequentes`, de `AdminMetiersSuggeres.jsx`, de la table `PropositionMetier` et de l'heuristique A_PRECISER) — suppressions de fichiers/tables à valider avec l'utilisateur.
- **Limites connues** : un compte malveillant disposant de plusieurs comptes peut multiplier les demandes (5 explicites ouvertes par compte) ; l'impact reste la file de modération, rien n'est publié sans décision. Le badge du menu admin se met à jour au rechargement de la page.
- **Tests** : `test_demandes_ajout_service.py` (38), `test_demandes_ajout_api.py` (21), `test_demandes_ajout_formations.py` (17), `test_migrer_formations_vers_demandes.py` (4) ; côté écran `DemandesAjoutPanel.test.jsx`, `ProposerEntreeModal.test.jsx`, `BlocFormationRequise.test.jsx`, `FormationReferentielSelect.test.jsx`, `AdminReferentielV2.test.jsx`, `AdminLayout.test.jsx`.
