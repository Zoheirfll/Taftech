# Pseudonymisation des données candidat avant envoi à l'IA cloud — conception

> Date : 17/10/2026 · Statut : **conception finale validée par l'utilisateur le 19/10/2026** (brainstorming de synthèse : volet arabe R21, volet coût et résilience Groq R18 à R20, compléments d'audit) · Origine : consigne de l'employeur (conserver l'IA cloud, ajouter une couche de confidentialité). Plan d'exécution : [docs/superpowers/plans/2026-10-17-pseudonymisation-ia.md](../plans/2026-10-17-pseudonymisation-ia.md) (Tasks 1 à 18, dont 3b).

## 1. Objectif

Aucune donnée directement identifiante d'un candidat ne doit atteindre le fournisseur IA (Groq). Le matching et le score restent 100 % locaux (déjà le cas : `matcher.py`, algorithme classique) et n'envoient rien à l'IA.

Flux cible :

```
CV → extraction texte (serveur TafTech) → détection PII → pseudonymisation/suppression
   → aperçu au candidat → appel IA avec la version nettoyée uniquement
   → résultat → rattachement au profil dans TafTech
```

## 2. Décisions déjà prises (17/10/2026)

1. Détection : **spaCy** en local (noms et lieux) + motifs maison (voir §5, Presidio écarté). Nouvelle dépendance majeure (spaCy et son modèle français), validée par l'utilisateur.
2. Parser de CV : **texte nettoyé** (pas d'alternative possible, la structure n'existe pas avant l'analyse). Autres fonctions : **champs structurés** sans champ identifiant, passant par le même module.
3. **Module central unique** par lequel passent tous les appels IA contenant des données candidat.
4. **Le masquage est obligatoire et non désactivable** (précisé le 17/10/2026). La case « Masquer mes informations personnelles avant l'analyse IA » est affichée cochée et verrouillée : elle informe, elle ne donne pas le choix. Le bouton « Voir les données transmises » est obligatoire.
5. **Consignes complémentaires de l'employeur (17/10/2026)** : Groq et le modèle actuel conservés ; Zero Data Retention (ZDR) à activer côté compte Groq ; analyse recruteur sans nom ni prénom (jeton technique temporaire) ; noms d'employeurs pseudonymisés dans les suggestions carrière (demande : « secteur d'activité » ; réalisation : « Entreprise A/B » + domaine du métier, voir §3 et §13) ; génération d'offre et matching inchangés ; confirmation que la clé API reste côté serveur.

## 3. Points d'appel IA inventoriés

- **Parser de CV** — `cv_parser/parser.py` (`parse_with_groq`, texte tronqué à 7000 car.) via `ParserCVAPIView` (`views/ia.py`). Envoie aujourd'hui le texte brut complet du CV. Voie retenue : **texte nettoyé**.
- **Agent de classification métier** — `domaine_agent.py`. Reçoit les intitulés/descriptions d'expériences issus du parsing. À vérifier : il ne doit recevoir que des données déjà nettoyées.
- **Analyse carrière** — `AnalyseCarriereGroqAPIView`. Envoie titre, diplôme, métier, compétences, expériences (poste + **entreprise** + dates), formations (diplôme + **établissement**). Voie retenue : **champs structurés**, avec le **nom de l'employeur remplacé par un libellé neutre** (« Entreprise A », « Entreprise B »… stable au sein d'un même appel) accompagné du **domaine métier de l'expérience** (`ExperienceCandidat.metier.groupe_principal`, déjà dans le référentiel). Le secteur propre de l'employeur n'existe pas dans le modèle (`entreprise` est un texte libre) ; le domaine du poste donne à l'IA le contexte utile sans nommer l'entreprise. Le **nom de l'établissement de formation est retiré** : seuls le diplôme et la spécialité sont transmis.
- **Conseils personnalisés** — `ConseilsPersonnalisesIAAPIView` (`candidat_dashboard.py`). Envoie score, détail du score, liste des statuts de candidatures, compétences, titre, diplôme, nombre d'alertes. Aucun identifiant, mais la consigne demande « uniquement les données strictement nécessaires » : la liste brute des statuts est remplacée par des **effectifs par statut** (ex. « 3 reçues, 1 en entretien »), et le diplôme est pris dans le référentiel (`diplome_ref.libelle`) plutôt que dans le texte libre. Voie retenue : **champs structurés minimaux**.
- **Analyse IA recruteur** — `AnalyseGroqRecruteurAPIView`. Envoie le **nom du candidat** (`{nom_candidat}`), la wilaya, titre, diplôme, compétences, expériences, formations. Voie retenue : **champs structurés, nom retiré**, remplacé par un **jeton technique temporaire** de type `CANDIDAT_xxx`. Le jeton est aléatoire et généré à chaque appel (jamais l'identifiant séquentiel de la base, qui serait lui-même un identifiant candidat). Il n'est pas stocké : la réponse est rattachée à la candidature localement (`derniere_analyse_ia`), donc le jeton ne sert qu'à nommer le candidat dans le prompt.
- **Classification des diplômes et spécialités** — `referentiel_utils.py::_resoudre_diplome_via_ia` (ligne 701) et `_resoudre_specialite_via_ia` (ligne 645), appelées par `resoudre_diplome_et_specialite_depuis_texte` et `resoudre_specialite_depuis_texte` (parser, formulaire de formation « Autre, préciser »). **Découvert lors de l'audit du 17/10/2026, absent de l'inventaire initial.** Envoient l'intitulé de formation saisi librement par le candidat (`texte`), qui peut contenir le nom de l'école ou de l'université. Voie retenue : le texte passe par un nettoyage dédié (masquage des PII par motifs + retrait du segment qui nomme l'établissement) avant d'être injecté dans le prompt ; la liste de diplômes du référentiel, elle, n'est pas personnelle.
- **Génération d'offre IA** — `GenererOffreIAAPIView`. Aucune donnée candidat : hors périmètre.
- **Matching et score** — `matcher.py`, `matching_cache.py` : aucun appel IA (vérifié par recherche le 17/10/2026). Un test d'architecture garantit qu'ils n'en auront jamais.

Point d'entrée commun existant : `jobs/ai_engine.py::call_ai` (isole déjà le fournisseur). Le garde-fou y sera branché.

## 4. Données à détecter et retirer (minimum demandé)

Nom/prénom · téléphone · e-mail · adresse · date de naissance · NIN / numéro de document d'identité · URLs personnelles (LinkedIn, GitHub, site) · photo · coordonnées de références.

- **Photo** : jamais envoyée, seul le texte est extrait du PDF/DOCX.
- **Motifs maison (`patterns.py`)** : e-mail, téléphones algériens (`+213`, `05/06/07…`), URLs, NIN (18 chiffres), dates de naissance (contexte « né(e) le »), mots-clés arabes (« الاسم », « العنوان », « تاريخ الميلاد », « المراجع »). Les chiffres arabo-indiens (٠١٢…) sont convertis en chiffres ASCII avant détection (correspondance 1 pour 1, les positions ne bougent pas).
- **NER spaCy** (modèle français) : noms, adresses/lieux dans les passages en alphabet latin.
- **NER Stanza arabe** (voir §14) : noms et lieux dans les passages en alphabet arabe.
- **Section « Références »** : détectée par titre de section, contenu supprimé.
- Remplacement par des jetons stables (`[NOM]`, `[EMAIL]`, `[TEL]`…).

## 5. Module central

Nouveau package `jobs/confidentialite_ia/` (un dossier = un sujet) :

- `patterns.py` : motifs regex des données personnelles algériennes (source unique).
- `ner.py` : reconnaissance de noms et lieux par spaCy (`fr_core_news_md`), chargée une seule fois ; **échec fermé** si le modèle manque.
- `pseudonymisation.py` : `nettoyer_texte(texte) -> ResultatNettoyage(texte, categories)`, déterministe (même entrée = même sortie, indispensable pour que l'aperçu corresponde à l'envoi).
- `coordonnees.py` : extraction locale (e-mail, téléphone, liens, nom, date de naissance, wilaya) pour remplir le profil sans que l'IA voie ces valeurs.
- `champs_structures.py` : jeton `CANDIDAT_xxx`, pseudonymes d'employeurs, lignes d'expériences/formations, nettoyage des intitulés.
- `filet.py` : `verifier_absence_pii`, dernier garde-fou appelé par `call_ai`.
- `construction.py` : textes envoyés par l'analyse carrière et les conseils, partagés avec l'aperçu.

**Changement de conception (17/10/2026, lecture du code)** : Presidio est écarté au profit de **spaCy direct + motifs regex maison**. Raisons : le filet de sécurité et les tests ne doivent dépendre d'aucun modèle ; l'API de Presidio pour le français n'a pas pu être vérifiée ici ; une dépendance de moins à maintenir. Aucune perte fonctionnelle (Presidio n'aurait fourni que le cadre des reconnaisseurs). À valider par l'utilisateur.

Règle d'architecture : un test échoue si un nouvel appelant de `call_ai` apparaît hors de la liste blanche (§10), et `call_ai(..., donnees_candidat=texte)` refuse tout texte contenant encore un e-mail, un téléphone, une URL personnelle ou un NIN.

## 6. Écueils prévisibles

- **Le parser a besoin d'infos personnelles pour remplir le profil** (nom, téléphone, e-mail, linkedin, github) : ces champs sont aujourd'hui produits par l'IA. Avec le texte nettoyé, l'IA ne les verra plus. Ils devront être extraits **localement** (regex fiables pour e-mail/téléphone/URLs) et rattachés au profil côté TafTech, ce qui correspond à l'étape « rattachement au profil » de la consigne. À valider champ par champ : `nom_complet`, `telephone`, `email`, `linkedin`, `github`, `wilaya`.
- **Champs du profil qui seront dégradés ou extraits autrement** une fois le texte nettoyé : `nom_complet` (NER local sur l'en-tête du CV), `telephone`/`email`/`linkedin`/`github` (regex locales), `date_naissance` (regex locale avec contexte « né le »), `wilaya` (recherche locale dans l'en-tête), `adresse` (non extraite : perdue, le candidat la saisit), `sexe` (déduit par l'IA des civilités « Mme/M. » qui restent dans le texte ; plus de déduction par le prénom). Le candidat valide ces champs dans le formulaire pré-rempli comme aujourd'hui.
- **Qualité du parsing** : mesurer avant/après sur un jeu de CV réels (sans les stocker dans le dépôt).
- **Performance** : chargement du modèle spaCy au démarrage, pas à chaque requête.
- **Ré-identification** : la pseudonymisation n'est pas une anonymisation (loi 18-07) : employeurs rares, établissements, villes peuvent suffire. Voir décisions ouvertes.

## 7. Interface (exigence explicite de l'employeur)

Avant le bouton « Analyser mon CV » (`StepUploadCV.jsx` et autres points d'entrée du parser) :

1. Case **« Masquer mes informations personnelles avant l'analyse IA »**, affichée **cochée et verrouillée** (non modifiable) : elle sert à informer le candidat que le masquage est systématique.
2. Bouton **« Voir les données qui seront transmises »** (à ne pas oublier) ouvrant une modale (style projet, tokens `tw.*`, pas de `window.confirm`) qui affiche le texte nettoyé exact, avec les jetons mis en évidence, et la liste des catégories masquées avec leur nombre (ex. « 1 e-mail, 1 téléphone, 3 éléments de nom »). Le candidat voit ainsi à la fois ce qui est masqué et ce qui part.
3. Aucune option de désactivation, ni dans l'interface ni dans l'API.

Même principe pour Analyse carrière et Conseils personnalisés : bouton « Voir les données transmises » avant lancement, case verrouillée. Côté recruteur : le masquage est toujours actif aussi ; un bouton équivalent peut afficher le prompt envoyé, avec le jeton `CANDIDAT_xxx`.

## 8. API

- `POST /api/.../ia/apercu-donnees/` : retourne le texte nettoyé et le décompte des entités masquées. **N'appelle pas l'IA, ne consomme pas de quota.** Authentifié, throttlé (coûteux en CPU), périmètre = l'utilisateur lui-même.
- Les endpoints IA existants appliquent **toujours** le nettoyage : aucun paramètre ne permet de le désactiver. Le serveur recalcule le nettoyage au lieu de faire confiance à un texte fourni par le client (le client ne peut pas envoyer « sa » version nettoyée).

## 9. Sécurité et traçabilité

- Journal d'audit : chaque appel IA journalise la fonction, l'utilisateur et le **décompte** des entités masquées (jamais le contenu du CV ni le texte envoyé). Réalisation : colonne JSON `entites_masquees` sur `UtilisationIA` (Task 14), avec les tokens consommés.
- Test : aucune réponse de l'API ne contient la valeur de `GROQ_API_KEY` (Task 13).
- **Clé API Groq** : uniquement côté serveur (`os.getenv("GROQ_API_KEY")` dans `ai_engine.py`), absente du frontend, vérifiée le 17/10/2026. Un test vérifie qu'aucune réponse API ne la contient. **Incident constaté** : le commit `9b04392` contient une vraie clé dans l'historique git (`taftech_backend/.env`, retiré depuis) → **révoquer et regénérer la clé** (phase 0).
- **Zero Data Retention** : à activer dans la console Groq (Data Controls) par le titulaire du compte, capture à remettre à l'employeur. Ce n'est pas du code.
- Nouvelle section dans `SECURITY.md` et mise à jour de `docs/fonctionnel/parser-cv-ia.md`.
- Mention dans la politique de confidentialité et le consentement : le texte nettoyé est transmis à un tiers cloud.
- Les logs d'erreur existants (`logger.error(... %s, e)`) ne doivent pas contenir de texte candidat.

## 10. Tests

- Unitaires par type d'entité (jeu de textes factices, noms algériens, arabe/français).
- Test de non-fuite : le texte envoyé à `call_ai` (mocké) ne contient ni e-mail, ni téléphone, ni nom du jeu de test.
- Test d'architecture : aucun appel IA avec données candidat hors du package `confidentialite_ia` (garde dans `filet.py`, branché dans `call_ai`). Liste blanche des appelants de `call_ai` : `views/ia.py`, `views/candidat_dashboard.py`, `referentiel_utils.py`, `cv_parser/groq_json.py` ; tout nouvel appelant fait échouer le test et force une revue.
- Test d'architecture : `matcher.py` et `matching_cache.py` ne contiennent aucun appel IA.
- Test de filet de sécurité : `call_ai(..., donnees_candidat=True)` lève `FuiteDonneesPersonnelles` si le prompt contient encore un e-mail, un téléphone, une URL personnelle ou un NIN.
- Test des appels de classification (`referentiel_utils`) : le prompt ne contient pas le nom de l'établissement d'un intitulé « Master informatique – Université d'Oran ».
- Intégration par vraie route (cookie JWT réel, pas `force_authenticate`) : aperçu, parser (le nettoyage ne peut pas être contourné), analyse recruteur sans nom ni prénom (jeton `CANDIDAT_xxx` seulement), analyse carrière sans nom d'employeur (secteur à la place).
- Frontend : case cochée et verrouillée, bouton « Voir les données transmises » présent avant « Analyser mon CV » et sur les autres fonctions, modale d'aperçu (mettre à jour les mocks `jobsService.*`).

## 11. Plan par phases (chaque phase cite les exigences R1 à R17 de §12 qu'elle couvre)

0. **Hors code, immédiat** : révoquer/regénérer la clé Groq (présente dans l'historique git) et activer le ZDR dans la console Groq. **Fait le 17/10/2026** : clé remplacée et ancienne clé supprimée, « Inference APIs ZDR » activé, capture et réponse envoyées à l'employeur (R8 et R16 traités côté compte).
1. Module `confidentialite_ia` + tests (détection, jetons, déterminisme).
2. Analyse recruteur : jeton `CANDIDAT_xxx` à la place du nom ; analyse carrière : secteur à la place de l'employeur ; liste blanche et effectifs par statut pour les conseils ; nettoyage des intitulés envoyés à la classification des métiers (`domaine_agent.py`) et des diplômes/spécialités (`referentiel_utils.py`).
3. Parser de CV : nettoyage + extraction locale des champs personnels + mesure de qualité.
4. API d'aperçu (nettoyage toujours actif) + journal des appels.
5. Interface (case verrouillée, bouton « Voir les données transmises », modale).
6. Documentation (SECURITY.md, parser-cv-ia.md, carte-du-code.md, CLAUDE.md) et vérification (`manage.py check`, tests, `npm run build`).

## 12. Matrice de traçabilité des consignes de l'employeur

M1 = premier message de l'employeur (workflow et interface), M2 = second message (Groq, ZDR, points 1 à 7, clé API). Chaque exigence a une section de spec, une phase (§11) et une vérification. Aucune exigence n'est omise ; les deux écarts assumés sont signalés.

- **R1** Conserver Groq et le modèle actuel (M1, M2) — §1, §3 — aucune modification de `AIConfig`/`ai_engine` côté fournisseur — tests `test_ai_engine.py` existants toujours verts.
- **R2** Le CV brut n'est jamais envoyé (M1, M2-2) — §1, §3, §5 — phases 1 et 3 — test de non-fuite.
- **R3** Workflow extraction → détection → pseudonymisation → aperçu → appel → rattachement local (M1, M2 final) — §1, §6 — phases 1 à 5.
- **R4** Détecter nom/prénom, téléphone, e-mail, adresse, date de naissance, NIN/document, URLs personnelles, photo, références (M1, M2-2) — §4 — phase 1 — un test unitaire par type.
- **R5** Case « Masquer mes informations personnelles… » et bouton « Voir les données transmises » (M1) — §7 — phase 5. **Écart validé par l'utilisateur** : la case est verrouillée (cochée, non décochable) au lieu d'être cochée par défaut et décochable.
- **R6** Même mécanisme pour analyse carrière, conseils candidat, analyse recruteur (M1) — §3, §5 — phase 2.
- **R7** Matching et score restent locaux, sans envoyer le CV complet (M1, M2-7) — §1, §3 — test d'architecture (§10).
- **R8** Zero Data Retention Groq, confirmation et capture (M2-1) — §9 — phase 0 — **action du titulaire du compte Groq**, TafTech ne peut pas l'exécuter.
- **R9** Le candidat voit ce qui est masqué et le contenu transmis (M2-2) — §7, §8 — phases 4 et 5.
- **R10** Analyse recruteur : plus de nom ni prénom, jeton `CANDIDAT_xxx`, rattachement local (M2-3) — §3 — phase 2.
- **R11** Analyse carrière : employeurs pseudonymisés (M2-4) — §3 — phase 2. **Écart assumé** : « Entreprise A/B » + domaine du métier au lieu du « secteur d'activité » de l'employeur, qui n'existe pas dans le modèle ; ouvert en §13.1.
- **R12** Classification des métiers : données strictement nécessaires, aucun identifiant (M2-5) — §3 (`domaine_agent.py`) — phase 2.
- **R13** Classification des diplômes et spécialités : idem (M2-5) — §3 (`referentiel_utils.py`) — phase 2.
- **R14** Conseils dashboard : données strictement nécessaires (M2-5) — §3 — phase 2.
- **R15** Génération d'offre inchangée (M2-6) — §3 — aucune modification.
- **R16** Clé Groq uniquement côté serveur, jamais exposée au navigateur (M2-8) — §9 — vérifié le 17/10/2026 ; **incident** : clé présente dans l'historique git (commit `9b04392`), à révoquer en phase 0.
- **R17** Objectif global : données brutes chez TafTech → pseudonymisation → Groq → réponse → rattachement local (M2 final) — §1, §6.

Exigences ajoutées le 19/10/2026 (demande de l'employeur sur le coût Groq, et audit de synthèse) — détail dans [§14](#14-volet-coût-et-résilience-groq-et-volet-arabe-19102026) :

- **R18** Suivi des appels et des tokens consommés par fonctionnalité, avec décompte des entités masquées — plan Task 14.
- **R19** Quotas raisonnables par utilisateur (déjà en place) et réutilisation des résultats stockés quand l'analyse n'a pas besoin d'être recalculée — plan Task 15.
- **R20** Quota ou panne Groq : la plateforme continue, message « analyse IA temporairement indisponible », appel remboursé en cas de refus fournisseur (429) — plan Task 16. Plafond mensuel de dépense Groq : défini au passage au compte payant.
- **R21** CV en arabe : détection des noms et lieux en alphabet arabe (Stanza), chiffres arabo-indiens normalisés ; échec fermé — plan Task 3b.
- **R22** Information du candidat et de l'employeur : consentement et politique de confidentialité mentionnent la transmission du texte masqué à un prestataire cloud (loi 18-07) — plan Task 17.
- **R23** NIN exigé par l'ANEM : obligatoire pour postuler avec un compte (pas à l'inscription), visible du candidat et de l'admin seulement, jamais transmis à l'IA ; la candidature rapide (sans compte) reste sans NIN, contournement consigné — plan Task 18. Chantier indépendant de l'IA, mais soumis à la même règle : le NIN est un identifiant national détecté et masqué avant tout appel IA (§4).

## 13. Décisions ouvertes (à trancher avec l'utilisateur)

Tranchées le 17/10/2026 : employeurs remplacés par le secteur ; case non décochable.

Tranchées le 17/10/2026 (meilleur choix sans changer le modèle de données) : établissements de formation retirés ; employeurs remplacés par « Entreprise A/B… » + domaine du métier de l'expérience (le secteur de l'employeur n'existe pas dans `ExperienceCandidat`).

1. **Secteur d'employeur réel (facultatif)** : si l'employeur exige vraiment « le secteur d'activité de l'entreprise », il faut un nouveau champ sur `ExperienceCandidat` (saisi par le candidat ou déduit par le parser) : choix de modèle de données, donc à valider avant. La solution ci-dessus ne le requiert pas.
2. **Format du NIN** et liste exacte des pièces d'identité à détecter : hypothèse retenue, NIN = 18 chiffres ; à confirmer avec l'employeur.
3. ~~**Arabe**~~ — **tranché le 19/10/2026** : Stanza (NER arabe) pour les passages en alphabet arabe, condition d'adoption = mesure sur 10 CV arabes réels, sinon refus de l'analyse IA des CV majoritairement arabes (§14).
4. **Hébergement** : mémoire du serveur de production pour spaCy (environ 200 Mo), Stanza arabe et PyTorch (estimation 1 à 1,5 Go au total) — à mesurer pendant la Task 1.

## 14. Volet coût et résilience Groq, et volet arabe (19/10/2026)

**Contexte** : Global ZDR activé ; Free Plan Groq pendant les tests, passage au Developer/pay-as-you-go quand le volume l'exigera ; pas d'infrastructure IA locale. Déjà en place avant ce volet : quotas par compte et par fonction (`ia_quota.py`, `QuotaIAOverride`), verrou anti-doublon, plafond global en appels avec alerte e-mail, résultats d'analyse stockés sur le profil.

**Décisions validées le 19/10/2026**
1. Refus du fournisseur (429) : l'appel est **remboursé** (ne compte pas dans le quota) ; les autres pannes restent décomptées (règle du 18/08 conservée). Un disjoncteur de 30 à 3600 s (défaut 60 s) évite de marteler Groq.
2. Données inchangées : le résultat stocké est renvoyé **sans appel Groq ni décompte** (empreinte SHA-256 du prompt, du texte, du modèle et de `max_tokens`) ; « Régénérer quand même » décompte.
3. Tokens : colonnes sur `UtilisationIA` (pas de nouveau modèle) ; ils serviront de base au futur plafond de dépense.
4. Arabe : Stanza + mesure réelle (voir R21). spaCy `xx_ent_wiki_sm` écarté (prise en charge de l'arabe non confirmée), GLiNER PII officiel écarté (arabe absent de ses langues), GLiNER arabe communautaire écarté (modèle non officiel pour une application RH sous loi 18-07).
5. Le plafond mensuel en dépense Groq sera défini lors du passage au compte payant.

**Hors périmètre** : parser de CV non mis en cache (son résultat n'est pas stocké, il préremplit un formulaire) ; aperçu recruteur du prompt (le recruteur voit déjà le profil, YAGNI).
