# Journal du 21/10/2026 — Parser de CV : texte, métiers vides, masquage, photo, métier proposé en attente

Point de départ : un CV réel dont les expériences arrivaient **sans métier** dans l'assistant d'intégration, puis une série de défauts découverts en testant avec trois CV réels (un CV de stage, un CV RH, un CV Canva). Tout a été vérifié en rejouant les vrais CV, pas seulement par tests synthétiques.

## 1. Cause racine des métiers vides : le texte extrait du PDF était abîmé

Certains éditeurs de CV (Canva…) glissent un caractère invisible de largeur nulle (**U+200C**, « zero-width non-joiner ») au milieu des mots. `pdfplumber` / pdfminer le lit comme une **vraie espace** de largeur 3 : « Analy se », « HÔT ESSE », « Hyperm arché ». Conséquences en chaîne :
- le masquage de confidentialité prenait « Analy » pour un nom (`[NOM] se et traitement…`) ;
- la classification du métier ne retrouvait plus « Hôte de Caisse » ;
- l'IA recevait des phrases amputées.

**Correctif** (`jobs/cv_parser/extraction.py`) : `extract_text_from_pdf_smart` lit désormais les mots avec **PyMuPDF** (déjà utilisé pour la photo), qui restitue le caractère tel quel et permet de le retirer (U+200B/C/D, U+2060, U+FEFF). Regroupement par ligne refait : **par proximité verticale** (un mot rejoint la ligne en cours s'il est à moins de 3 points du premier mot de la ligne) sur le **centre vertical** du mot, car l'ancien arrondi par tranches fixes et le haut du mot coupaient une même ligne mêlant gras et normal (« Arabe : … | Anglais : … »). Un mois collé à une année (« Novembre2023 ») est séparé. Repli inchangé sur `pdfplumber` si PyMuPDF échoue.

Validation : comparaison ancienne/nouvelle extraction sur les CV réels disponibles ; seules les corrections de mots changent. **Pas de corpus de CV** : un jeu de quelques dizaines de CV réels reste à passer (voir « Reste à faire »).

Approche abandonnée : filtrer les caractères invisibles côté `pdfplumber` (`page.filter`) → sans effet, pdfminer les convertit déjà en espace avant.

## 2. Classification du métier (`jobs/domaine_agent.py`)

- **Garde-fou `_titre_couvert_par`** : comparaison au **masculin singulier** (`_forme_neutre` : hôtesse→hôte, cheffe→chef, directrice→directeur, vendeuse→vendeur, féminin en « -ée »), appliquée **avant** `_singulariser` (qui retire aussi le « e » final : « hotesse » devenait « hotess »). Employeur et parenthèses du titre écartés (`_nettoyer_titre_poste` : « … chez UNO - ES-SENIA », « (Stage de Licence) »).
- **« stagiaire », « stage »** ajoutés aux mots génériques : « Stagiaire en Informatique » se classe sur « informatique » (décision de l'utilisateur : un stage compte comme expérience du métier).
- **Prompt de classification** : règle « respecte le niveau hiérarchique du titre » (un Responsable ne devient pas Gestionnaire). Cause constatée en réel : pour « Responsable Administration RH & Recrutement », l'IA choisissait « Gestionnaire Administration du Personnel », le garde-fou refusait (à juste titre) et le métier restait vide.
- **Limite connue** : l'IA n'est pas déterministe ; sur deux rejeux, ce poste a reçu « Responsable Recrutement » puis rien. Le garde-fou refuse tout choix qui ne couvre pas le titre (règle « ne pas deviner », point 7). Aucun repli « meilleur candidat » (décision à prendre avec l'utilisateur).

Approche abandonnée : équivalence « personnel = ressources humaines » dans le garde-fou. Elle aurait **validé** le mauvais niveau hiérarchique (Gestionnaire pour un Responsable). Le bon correctif était le prompt.

## 3. Masquage de confidentialité (`jobs/confidentialite_ia/`)

- **Wilayas de l'en-tête** masquées par **liste** (`detecter_lieux_entete`, table `WILAYAS_MAPPING`, 600 premiers caractères) : spaCy ratait « EL KERMA / ORAN » en majuscules. La wilaya reste extraite en local pour le profil. **Les communes ne sont pas masquées** (aucune liste dans le projet ; décision utilisateur : option 1 « wilayas seulement »).
- **Mots d'organisation** (`ner.py`, `_MOTS_ORGANISATION`) : « Hypermarché » détecté comme personne n'est plus masqué ; ces mots sont retirés **en bordure** d'une entité personne, le reste est masqué (« Université Karim Benali » masque « Karim Benali »).
- **Mot unique en début de ligne ou de puce, suivi de texte sur la même ligne** (`_ouvre_une_ligne_de_texte`) : « Expertise confirmée… », « Habituée aux… », « - Reporting RH… » n'étaient capitalisés que parce qu'ils ouvrent la phrase, spaCy en faisait des `[LIEU]`/`[NOM]`. Un mot seul sur sa ligne (« Arzew ») reste masqué. **Risque assumé** : un nom de personne d'un seul mot en début de ligne suivi de texte n'est plus masqué par spaCy (le nom du compte reste masqué par `detecter_noms_connus`).

## 4. Photo

- La photo était bien enregistrée côté serveur ; la **barre de navigation** gardait l'ancienne (elle ne rechargeait qu'au changement d'URL, et ne mettait à jour que si une photo existait). Correctif : signal `utils/evenementsProfil.js` (`notifierProfilMisAJour` / `ecouterProfilMisAJour`) émis par l'assistant et la page profil ; la Navbar met toujours à jour son état, y compris à `null`.
- **Retrait de la photo en mode « Remplacer »** (demande de l'utilisateur) : si un nouveau CV est analysé, ne contient pas de photo et que le profil en a une, l'assistant envoie `remove_photo_profil` (règle pure `utils/photoProfil.js`, testée). En mode « Ajouter » rien n'est retiré. Risque : retrait définitif si l'extracteur rate une photo existante ; l'étape Infos affiche donc un **avertissement ambre** tant que la règle s'applique (« Votre nouveau CV ne contient pas de photo : … Choisissez « Ajouter » pour la conserver »).

## 5. Affichage du métier plus visible (matching)

Assistant et page profil : badge « Métier : … » sur sa propre ligne ; badge ambre cliquable « Métier à choisir (utile pour vos offres recommandées) » quand il manque ; libellé du champ « Métier (détermine les offres qui vous sont recommandées) ».

## 6. Métier proposé en attente (« Je ne trouve pas mon métier »)

Conception : [2026-10-21-metier-propose-en-attente-design.md](../superpowers/specs/2026-10-21-metier-propose-en-attente-design.md). Décisions utilisateur : **candidat uniquement** (expériences, métier du profil, métier souhaité ; jamais les offres), **rattachement automatique** à l'acceptation.

- Modèle (migration `0149`) : `ExperienceCandidat.demande_metier`, `ProfilCandidat.demande_metier`, `ProfilCandidat.demande_metier_souhaite` (clés vers `DemandeAjout`, `SET_NULL`).
- `jobs/demandes_ajout/metiers.py` : `demande_metier_utilisable` (demande ouverte, de type métier, du compte), `resume_demande_metier`, `appliquer_metier_aux_candidats` (appelée par `AdaptateurMetier.appliquer`).
- **Jamais un critère de calcul** : le matching ne lit que `metier` / `metier_souhaite` ; un test vérifie que `matcher.py` ne contient pas `demande_metier`.
- Acceptée ou rattachée : le métier officiel et l'appellation (`TAF-DA-<id>`) sont posés, le lien retiré, le cache de scores du candidat invalidé. Refusée : le lien reste, le motif est montré, aucun effet sur le score.
- Un vrai métier choisi retire la proposition ; une proposition remplace le métier choisi auparavant (jamais les deux).
- Visible **du candidat seulement** : `metier_propose` / `metier_souhaite_propose` n'apparaissent que si la vue pose `inclure_metier_propose` (`views/profils.py::_contexte_candidat`) ; absents des vues recruteur et CVthèque (test sur la vraie route `cvtheque`).
- Front : `MetierAutocomplete` (prop `onPropose`, écrans du candidat seulement), `ProposerMetierModal` (prop `onProposed`), `Components/MetierProposeBadge.jsx`. Dans l'assistant, `metier_propose` désigne déjà le métier suggéré par l'IA (statistiques de corrections) : le métier proposé par le candidat s'appelle `demande_metier*` côté formulaire.

## Tests lancés

- Backend : `test_metier_propose_en_attente` (16), `test_cv_extraction_texte` (5), confidentialité (85 : ner, arabe, parser, aperçu, classification, champs, motifs, paragraphe), classification (32), et une passe `-k demandes_ajout/profil/experience/cvtheque/candidature/appellation/metier` : **326 tests OK** avant l'ajout du test CVthèque. **La suite backend complète (≈ 34 min) n'a pas été relancée.**
- Frontend : suite complète **98 fichiers / 722 tests OK**, build de production OK. Lint : 3 erreurs préexistantes dans `Navbar.jsx` (variable `Icon`) et 3 dans `MetierAutocomplete.jsx`, `ProposerMetierModal.jsx`, `StepCompetences.jsx` (setState dans un effet) : non liées à cette session.

## Reste à faire

- Passer un **corpus de CV réels** dans l'ancienne et la nouvelle extraction (le changement d'extracteur touche tous les CV PDF).
- Documentation SECURITY.md §40 faite ; relire avant fusion.
- `NavbarRecruteur.jsx` : l'état du logo est maintenant mis à jour même à `null` ; l'écran de modification du logo n'émet pas encore le signal de rafraîchissement ([problemes-a-traiter.md](../problemes-a-traiter.md)).
- Commits sur la branche `fix/parser-cv-metiers-photo` (poussée), **non fusionnée dans `main`** : fusion sur accord explicite de l'utilisateur.
