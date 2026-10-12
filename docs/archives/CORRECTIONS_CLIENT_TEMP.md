# Corrections finales client — points 1 à 6 (fichier TEMPORAIRE)

Branche : `feature/qualite-ia-stats-recruteur` — rien n'est commité.

## 1. Pages d'inscription sur smartphone
- `RegisterCandidat.jsx`, `RegisterRecruteur.jsx` : mise en deux colonnes à partir de `lg:` (avant `md:`), `min-w-0` sur les colonnes, `overflow-x-hidden` sur le conteneur, marges réduites sur mobile, bulle d'aide limitée à `max-w-[70vw]`.
- Limite : non testé dans un vrai navigateur.

## 2. Date de naissance (jj/mm/aaaa)
- `cv_parser.py` : contrôle tolérant (séparateurs, « 1er », mois sans accent ou abrégés) + validation de la date ISO.

## 3. Dates issues du CV : année seule ≠ 01/01
- Nouveau champ de précision `date_debut_precision` / `date_fin_precision` (ANNEE / MOIS / JOUR) sur expériences et formations (migration `0129`).
- Affichage selon la précision : « 2023 », « mars 2023 », « 12/03/2023 » (`utils/cvDates.js`, `formatDatePrecise`).
- Nouveau composant `DatePrecisionInput.jsx` dans les formulaires et l'assistant d'inscription.
- Affichage synchronisé côté recruteur : CVthèque, ReviewCandidature, DetailCandidature, AdminUsers, analyses IA.
- Limites : les anciennes données s'affichent en date complète tant qu'elles ne sont pas rééditées ; le matcher traite encore une année seule comme le 1er janvier (la base garde une date complète pour le tri) ; ce choix « hybride » diffère de l'option « année/mois/jour séparés ».

## 4. Parser CV : compétences
- Rejet renforcé : chiffres, montants, pourcentages, effectifs, dates, coordonnées, phrases complètes, descriptions de missions (`_est_competence_valide`, `_filtrer_competences_valides`).
- Rapprochement avec le référentiel TAFTECH (`competences_referentiel`, `competences_rapprochees`).
- Étape « Compétences » de l'assistant : badges Référentiel / À vérifier, renommer, supprimer, changer le niveau, ajouter.
- Limite : règles heuristiques ; l'édition n'existe que dans l'assistant, pas dans l'ancienne modale de confirmation du profil.

## 5. Erreur 403 « Candidats recommandés »
- Le 403 est volontaire : palier inférieur à Pro (`PALIER_INSUFFISANT`). La page l'affiche déjà comme écran « palier requis » ; il n'est plus journalisé comme erreur système.
- 11 tests ajoutés (`test_api_candidats_recommandes.py`).

## 6. Sécurité : entreprise non validée
- Règle appliquée côté serveur : entreprise validée + abonnement actif + permission = accès. Une entreprise non validée reçoit 403 `ENTREPRISE_NON_VALIDEE`, même avec un abonnement.
- Gardes ajoutées (`paliers_utils.reponse_entreprise_non_validee`) : CVthèque, déblocage, téléchargement CV/photo, documents partagés, favoris, invitation, candidats recommandés, exports Excel, candidatures spontanées, Top 5.
- Le tableau de bord reste accessible mais sans aucune candidature.
- 8 tests (`test_entreprise_non_validee_acces_candidats.py`).
- Non couvert explicitement : les vues de statut/évaluation d'une candidature.
- Ce correctif a été appliqué par script ; il se relit dans l'onglet Source Control de VS Code.

## 7. Référentiel métiers (canonique → appellations → recherche)
- `TAFTECH_Metiers_Matching_v2.xlsx` considéré comme la version finale.
- Bug trouvé : « Gestionnaire RH » rattaché à « Assistant RH » (« RH » ignoré, vote à la fréquence des mots). Le rattachement automatique ne devine plus : seule une appellation exacte est acceptée, sinon le recruteur / le candidat choisit le métier de référence.
- Talent Acquisition Specialist → Chargé de Recrutement (`METIERS_REDIRECTIONS`, rejoué après chaque import ; l'intitulé reste affiché).
- Abréviations développées (RH, DRH, DAF) dans la recherche de métier et le classement des candidats du CV ; même appellation portée par deux métiers départagée par le libellé du métier.
- CV : le choix de l'IA est rejeté si l'appellation ne contient pas tous les mots du titre.
- Reste à fournir par le client : les autres équivalences (dont le bon rattachement de « Gestionnaire RH »).
- Tests : `test_rattachement_metier_canonique.py`.

## 8. Diplômes et spécialités
- Listes groupées par famille : enseignement supérieur / formation professionnelle / thèmes généraux TafTech (types de diplôme, domaines, spécialités ; formulaire de formation et formulaires d'offre).
- Après le choix du type de diplôme, seuls les domaines de la même famille sont proposés.
- Faux domaine « Domaine non répertorié » retiré de la liste des domaines.
- Doublon réel fusionné (Langue anglaise), 44 libellés harmonisés (majuscules/minuscules) ; homonymes entre systèmes volontairement conservés (formations différentes).
- Niveau d'études ajouté comme 1ʳᵉ étape de la cascade (niveau → type de diplôme → domaine → filière → spécialité).
- Accents et casse des libellés restitués à partir du référentiel lui-même (132 libellés), sans jamais déformer un mot correct.
- Synchronisé partout : profil candidat, assistant d'inscription, filtre d'offres, création/modification d'offre, suggestions par métier, admin du référentiel ; parser CV cohérent par construction.
- Reste : quelques libellés universitaires sans accent attesté (ex. « Modeles »).
- Tests : `test_nomenclature_formation_familles.py`.

## À faire
- Documenter dans CLAUDE.md et SECURITY.md (en attente de votre accord).
- Lancer la suite de tests backend complète.
- Aucun commit sans votre accord.
