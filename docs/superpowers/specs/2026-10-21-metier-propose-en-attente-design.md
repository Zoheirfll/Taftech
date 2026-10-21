# Métier proposé en attente de décision — conception (21/10/2026)

## Besoin (utilisateur)

Dans « Je ne trouve pas mon métier », le métier proposé doit **rester sélectionné** sur l'expérience ou le profil du candidat ; s'il est **refusé**, il n'est **jamais comptabilisé comme critère**, « comme on fait pour la spécialité » (formation « Autre spécialité » liée à une demande d'ajout).

Avant : la fenêtre n'enregistrait rien sur le profil (« choisissez en attendant le métier le plus proche »).

## Décisions

| Question | Décision |
|---|---|
| Où ? | **Candidat uniquement** : expériences, métier actuel du profil, métier souhaité. Les offres des recruteurs et l'admin gardent le comportement actuel (une décision ne modifie jamais une offre publiée). |
| À l'acceptation ? | **Rattachement automatique** : les expériences et profils en attente reçoivent le métier officiel (et l'appellation créée par la décision), le candidat est prévenu par la notification existante. |
| Refus ? | Le lien reste pour afficher le motif ; aucun effet sur le score. |

## Modèle (migration 0149)

Calqué sur `FormationCandidat.demande_diplome` / `demande_specialite` :
- `ExperienceCandidat.demande_metier` → `DemandeAjout` (`SET_NULL`, `related_name='experiences_metier'`)
- `ProfilCandidat.demande_metier` (`profils_metier`) et `ProfilCandidat.demande_metier_souhaite` (`profils_metier_souhaite`)

## Règles

1. **Jamais un critère** : `matcher.py` ne lit que `Experience.metier`, `Profil.metier`, `Profil.metier_souhaite`. Tant que la demande est ouverte ou refusée, ces champs restent vides.
2. **Liaison** : seule une demande **ouverte, de type MÉTIER, dont le compte est demandeur** peut être liée (`demande_metier_utilisable`). Un lien déjà posé sur l'objet modifié reste valable s'il est renvoyé. Sans utilisateur dans le contexte du sérialiseur : refus (fermé par défaut).
3. **Un seul des deux** : un vrai métier choisi retire la proposition ; une proposition remplace le métier choisi auparavant (et son appellation). Envoyer `demande_metier: null` retire la proposition.
4. **Confidentialité** : la proposition n'est **exposée qu'au candidat lui-même** (`metier_propose`, `metier_souhaite_propose`, clé de contexte `inclure_metier_propose` posée par `views/profils.py::_contexte_candidat`) ; les champs `demande_metier*` sont en **écriture seule**. Jamais dans une vue recruteur, la CVthèque, les candidatures ni `profil_snapshot`.
5. **Application d'une décision** (`demandes_ajout/metiers.py::appliquer_metier_aux_candidats`, appelée par `AdaptateurMetier.appliquer`) : acceptée ou rattachée → métier et appellation posés via `save(update_fields=…)`, lien retiré, `invalider_scores_candidat`. Refusée → rien (le motif est déjà dans la demande).

## Interface

- `MetierAutocomplete` : prop optionnelle `onPropose({id, libelle})` (écrans du candidat seulement). `ProposerMetierModal` : prop `onProposed` ; texte adapté (« reste sélectionnée… ne compte pas dans le calcul tant qu'elle n'est pas validée »).
- `Components/MetierProposeBadge.jsx` : « En attente de validation — ne compte pas encore dans votre score » (ambre) ou « Non retenu : motif — ne compte pas dans votre score » (rouge).
- Écrans : assistant (Infos, Expériences, Préférences), modales du profil (expérience, infos, préférences), sections d'affichage du profil.

## Approches écartées

- Stocker le texte proposé sur l'expérience (comme `specialite_texte`) : inutile, le libellé vit déjà dans `DemandeAjout.libelle`, et un lien évite deux sources de vérité.
- Laisser le candidat valider le métier officiel après acceptation : plus lent, et l'utilisateur a choisi le rattachement automatique.
- Étendre aux offres : une acceptation changerait des scores déjà publiés (refusé par le projet).

## Tests

`jobs/tests/test_metier_propose_en_attente.py` (16) : création/modification d'expérience, demande d'un autre compte ou d'un autre type refusée, remplacement dans les deux sens, retrait, conservation, acceptation / rattachement / refus (expériences, profil, métier souhaité), autres candidats intacts, non-exposition (sérialiseur **et** vraie route `cvtheque`), `matcher.py` sans `demande_metier`. Front : `ProposerMetier.test.jsx`, `OnboardingWizard.test.jsx`.
