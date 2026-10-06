# CLAUDE.md — Mémoire Projet TafTech

> **Lire ce fichier en entier avant toute action dans ce projet.**

## 🆕 SESSION 06/10/2026 — Suggestions d'offre appuyées par l'usage réel (candidats + offres)

**Demande** : à la création d'offre, un recruteur ne sait pas que 90 % des candidats RH ont « Licence académique » plutôt que « Licence nature non précisée ». Les suggestions (compétences, spécialités, diplômes) doivent être annotées et triées par usage réel. Choix validés : sources candidats **et** offres, seuil de confidentialité, cache 1 h, aucune suggestion retirée (anti-effet de boucle).

- **`jobs/suggestions_stats.py`** (nouveau) : `calculer_stats_metier(metier)` — population candidats = `ProfilCandidat` dont `metier` OU `metier_souhaite` ∈ métier canonique + redirections ; population offres = `OffreEmploi` `APPROUVEE` du métier. Compétences (`CompetenceCandidat`/`CompetenceOffre`, par label insensible à la casse), spécialités (`FormationCandidat.specialite_ref`/`specialites_requises`), diplômes (`diplome_ref`/`diplomes_requis`), un profil/offre compté une fois par élément.
- **Seuils** : `MIN_CANDIDATS = 10`, `MIN_OFFRES = 5` — en dessous, le chiffre correspondant est `None` (jamais exposé). Seuil offres (5) choisi sans validation explicite de l'utilisateur. Agrégats uniquement.
- **Élargissement domaine voisin** : si le métier est sous un seuil, calcul étendu aux métiers du même `groupe_principal` (`elargi: true` dans la réponse).
- **Familles de diplôme** : `D-LIC-A`/`D-LIC-NP` → `D-LIC` (`_famille`), % de la famille exposé (`pct_famille`) ; en-tête affiché seulement pour Licence/Master/Doctorat (`D-LIC`/`D-MAS`/`D-DOC`, codes **non revérifiés en base**).
- **`MetierSuggestionsAPIView`** : réponse enrichie (`pct_candidats`, `nb_offres` par suggestion, nouvelle liste `diplomes`, `nb_candidats`, `nb_offres`, `elargi`) ; tri décroissant stable (sans stat → ordre alphabétique d'origine) ; éléments fréquents hors référentiel ajoutés (max 12/catégorie). Les diplômes ne viennent QUE des données réelles (jamais reconstruits depuis `DiplomeSpecialite`, règle F06 inchangée).
- **Frontend** : `utils/suggestionStats.js::libelleUsage`, `Components/SuggestionsDiplomes.jsx` (groupé par famille), branchés sur `CreateJob.jsx` et `OffresListPage.jsx` (modification d'offre).
- **Limites** : le cache (1 h) n'est pas invalidé à l'écriture ; peu de profils en base de dev, donc peu de pourcentages visibles tant que les inscriptions sont rares ; compétences non regroupées par proximité (pas de familles dans le référentiel).
- **Tests** : `jobs/tests/test_suggestions_stats.py` (seuil + calcul), `test_metier_suggestions` ✅, `CreateJob`/`OffresListPage` ✅, `vite build` propre.

---

## 🆕 SESSION 03/10/2026 — Placeholders « exemple » retirés + menu mobile candidat réorganisé

- **Placeholders** : 65 placeholders « exemple » retirés (« Ex : … », `votre@email…`, `https://…`, `0555…`, `DZ`, `••••`, `____`, gabarits « Bonjour {prenom} », puces d'exemple de CreateJob, « (ex: Anglais) »), car ils donnaient un air « généré par IA ». Conservés : placeholders fonctionnels (« Rechercher… », « Sélectionnez… », « Illimité », « Tapez une compétence puis Entrée… », consignes comme « 8 caractères minimum »). Les tests qui ciblaient ces placeholders utilisent désormais des sélecteurs structurels (`input[type="email"]`, `input[maxlength="6"]`, `input[name="titre"]`…). **Règle : ne plus ajouter de placeholder d'exemple ; le libellé visible suffit.**
- **Menu mobile candidat** (`Navbar.jsx`) : liste plate remplacée par des sections « Explorer » / « Mon espace » / « Aide et compte » (recruteur : « Espace recruteur »). Liens déjà présents dans la bottom nav toujours masqués sous 768 px.
- `StatistiquesPage.test.jsx` réparé (environnement jsdom manquant, pas de `cleanup`, textes multiples).
- **ngrok** : page blanche sur Chrome mobile mais pas Samsung Internet = très probablement l'avertissement ngrok gratuit + mode dev Vite (centaines de modules). Tester avec `npm run build` + `vite preview --host` plutôt que `npm run dev`. Le proxy `/api` de `vite.config.js` vise le port **8001** (vérifier que Django tourne bien dessus).

---

## 🆕 SESSION 29/09/2026 (suite) — Refonte de la page Statistiques recruteur (inspirée de SOMIZ)

**Demande** : la page `/statistiques` (recruteur) était trop pauvre (4 KPI, 1 courbe, barres). Inspirée de `SOMIZ/frontend/src/pages/Statistiques.jsx` (KPI + variation + sparkline, filtres de période, donuts/histogramme recharts, export, impression).

**Réalisé, 100 % côté frontend, aucun endpoint ajouté** (tout est calculé sur `getDashboard().offres[].candidatures[]`, déjà scopé à l'entreprise) :
- `Components/StatCharts.jsx` (nouveau, recharts déjà en dépendance) : `StatAreaChart`, `StatDonutChart` (total au centre, légende scrollable), `StatHistogram`, `StatSparkline`, `ChartTooltip`.
- `Pages/Recruteur/StatistiquesPage.jsx` réécrite : filtres période (30 j / 3 m / 6 m / 12 m / Tout + dates libres) et filtre par offre ; 6 KPI (candidatures, entretiens, recrutements, taux de conversion, score moyen, offres actives) avec **variation vs période précédente de même durée** (masquée pour « Tout », non comparable) et sparkline ; évolution 3 séries à granularité automatique (jour ≤ 35 j, semaine ≤ 200 j, mois au-delà) ; entonnoir cumulatif ; donuts statut / source / type de contrat ; candidatures par wilaya de l'offre ; tableau « Performance par offre » ; export CSV (`;` + BOM UTF-8) et impression (`window.print`, contrôles en `print:hidden`).
- **Choix assumé** : « entretien » = `date_entretien` renseignée OU statut ENTRETIEN (un RETENU sans entretien tracé n'est pas compté). Les statuts sont l'état **actuel** de la candidature (aucun historique de transitions n'existe), donc pas de « délai moyen de traitement ».
- **Palier Business+** : l'appel `getStatistiquesAvancees()` est conservé pour le contrôle d'accès serveur (403 `PALIER_INSUFFISANT`), mais l'histogramme de score est désormais calculé sur la période filtrée (l'endpoint global ne filtre pas par date). Les scores étant déjà exposés par le dashboard à tous les paliers, le gating reste un gating d'affichage cohérent avec l'existant, pas une nouvelle protection.
- Test : `tests/StatistiquesPage.test.jsx`.

## 🆕 SESSION 29/09/2026 — Corrections du parser CV + page admin « Qualité IA »

**Demande** : améliorer le parser et le matching au fil de l'eau à partir de l'usage réel, avec de la visibilité dans l'admin. Périmètre validé par l'utilisateur : journal de parsing + corrections des candidats + file de correction + suivi du matching.

**Bugs du parser corrigés (CV réel de test « Mme TABTI Samira »)** :
- **Métier des expériences faux** (`jobs/domaine_agent.py::_candidats_pour_experience`) : le pool d'appellations était plafonné à `[:500]` dans un ordre arbitraire ; avec une longue description, les appellations RH étaient coupées avant notation et l'IA ne voyait que des « Chef de département » industriels (« Encadrement d'exploitation gisement d'hydrocarbures »). Plafond retiré. Le repli déterministe (`_deviner_metier_experience`, `jobs/views/ia.py`) réutilise désormais ce même scoring pondéré (titre > description, mots génériques filtrés) au lieu de `resoudre_metier_depuis_texte` (fréquence brute, résultats aberrants). `resoudre_metier_depuis_texte` reste utilisée par `GenererOffreIAAPIView`.
- **Nom/prénom** (`useOnboardingWizard.js`) : « Mme TABTI Samira » donnait Prénom « Mme ». Civilités retirées, mots en MAJUSCULES = nom, reste = prénom.
- **Diplôme/spécialité** (`jobs/referentiel_utils.py`) : une spécialité n'est acceptée que si ≥ 2 mots significatifs correspondent (avant : 1 seul mot, « Sciences de Gestion… » → « Sciences De La Mer ») ; singularisation symétrique du féminin (« internationales » ↔ « international ») ; à score égal, préférence au libellé le plus couvert ; indice « professionnalisant/professionnel » → variante `-P` ; formation courte (« Formation en… », « Stage… ») sans mot-diplôme → `D-ATTEST` (Attestation de formation) ; repli sur les variantes de la même famille (`D-MAS-*`, `D-LIC-*`) quand la variante exacte n'a aucune spécialité attestée (« Master professionnel » n'a pas de spécialité RH, seul « Master académique » en a).
- **Compétences** (`jobs/cv_parser.py::extraire_competences_par_ligne`) : le modèle ignorait parfois la consigne « une compétence par ligne » même à température 0. Le bloc « COMPÉTENCES [CLÉS] » (puces) et le bloc « INFORMATIQUE / Outils » (`Libellé : a, b, c`) sont désormais lus **directement dans le texte** ; l'IA ne sert plus qu'à proposer un niveau. Sans bloc identifiable (< 3 éléments), extraction IA inchangée. Niveau par défaut « Intermédiaire » (plus de « Confirmé » systématique). `_call_groq` passe à `temperature=0`. `AIConfig.parser_cv_prompt` resynchronisé en base de dev (piège habituel : la valeur en base prime sur la constante du code).
- **Erreurs système admin** : `Navbar.jsx` appelait le profil candidat pour un ADMIN (aucun profil) à chaque page → 3 517 erreurs `ECHEC_GET_PROFIL_API`/`ECHEC_CHARGEMENT_PHOTO_NAVBAR`. Appel limité au rôle CANDIDAT.
- **Paliers** : `utils/paliersAffichage.js` = source unique de l'affichage (tableau admin, cartes et comparatif de `AbonnementsPage.jsx`), calculée depuis les champs du modèle `Palier` (accès, quotas IA génération d'offre / analyse candidature, support, remise annuelle « -X% »). Vide = illimité, 0 = « Non inclus ».

**Qualité IA (nouveau)** :
- Modèles `ParsingCV` (compteurs et indicateurs de résolution par CV analysé, **jamais le contenu du CV**) et `CorrectionParsing` (paire proposé → choisi sur métier/diplôme/spécialité ; `texte_source` = intitulé du poste ou du diplôme, 200 caractères max, jamais l'employeur ni les missions), migration `0128`. `ParsingCV.user` passe à NULL à la suppression du compte. Commande `purger_qualite_ia` (12 mois, `--mois`, `--dry-run`).
- `ParserCVAPIView` journalise chaque analyse (succès, `IA_INDISPONIBLE`, `PDF_SCANNE`) via `_journaliser_parsing` (n'échoue jamais le parsing) et renvoie `parsing_id`. `PARSER_VERSION` (`cv_parser.py`) est à incrémenter à chaque changement de prompt/logique pour comparer les versions.
- `POST jobs/parsing/<id>/corrections/` (candidat propriétaire uniquement, `WriteActionThrottle`, 30 corrections max, doublons et non-changements ignorés). L'assistant (`useOnboardingWizard.js`) envoie les corrections à l'enregistrement des expériences et des formations (best-effort).
- Admin (`jobs/views/qualite_ia.py`, `IsAdminRole`) : `/admin-taftech/qualite-ia` (`AdminQualiteIA.jsx`, 3 onglets). Parser : taux de réussite, % expériences sans métier / par repli, % formations sans diplôme, erreurs, champs vides, courbe hebdomadaire, versions. Corrections : paires triées par fréquence + bouton « Ajouter l'appellation » (crée une `Appellation` `type_alias='correction_candidat'` et un `AuditLog`). Matching : taux de présélection/entretien/embauche par tranche de score, ≥ 80 % refusés ou non traités depuis 14 j (calculé sur `Candidature`, aucune table dédiée). Le matching n'est lisible qu'avec assez de décisions de recruteurs.

**Tests** : backend `test_qualite_ia` (10) + suites voisines 66/66 ✅, frontend `AdminQualiteIA.test.jsx` (5), `AdminPaliers`, Onboarding/ProfilCandidat/RegisterCandidat, `Navbar` ✅, `npx vite build` propre, `manage.py check` propre.

**À faire (déploiement)** : crontab `0 3 1 * * python manage.py purger_qualite_ia`.

**Audit des accès par palier (tableau « Comparez toutes les fonctionnalités », même jour)** — chaque ligne vérifiée côté serveur ; 4 corrections :
- **Limite d'offres actives** (`jobs/views/offres.py::_limite_offres_atteinte`) : compte désormais les offres `APPROUVEE` **et `EN_ATTENTE`** non clôturées (avant : on pouvait en déposer autant qu'on voulait pendant la modération). Revérifiée aussi quand une offre `REJETEE` est corrigée et resoumise (`UpdateOffreRecruteurAPIView`, 403 `LIMITE_OFFRES_ATTEINTE`). La clôture est définitive (aucune réouverture).
- **Analyse IA d'une candidature** (`AnalyseGroqRecruteurAPIView`) : le contrôle `user.role == 'RECRUTEUR'` écartait les membres d'équipe de compte CANDIDAT et laissait passer le rôle « Invité ». Remplacé par l'appartenance à l'entreprise + rôle d'équipe UTILISATEUR/ADMIN/PROPRIETAIRE.
- **Quotas IA recruteur par ENTREPRISE** (`jobs/ia_quota.py::_utilisateurs_du_quota`) : décision produit « 10 au total » — propriétaire + membres partagent un seul compteur (avant : par utilisateur, une équipe multipliait le quota). Une dérogation `QuotaIAOverride` reste par compte ; les fonctions candidat restent par compte.
- **Membres d'équipe et palier** (`get_entreprise_for_user`) : un membre (non-propriétaire) n'a plus accès à l'entreprise dès que son palier n'inclut plus `acces_equipe` (expiration **ou rétrogradation** vers Starter/Pro) — sur tous les endpoints, plus seulement au login/dashboard. Login et dashboard répondent toujours `403 PREMIUM_EXPIRE` (`membre_bloque_par_palier`). Conséquence pour les tests : les fixtures d'équipe doivent avoir un palier avec équipe (Business).
- Vérifiés sans changement : crédits CVthèque (rôle, entreprise validée, abonnement, `visible_cvtheque`, décrément atomique des crédits achetés), « Inviter à postuler » (palier, rôle, offre de l'entreprise, anti-doublon), Candidats recommandés, Recherche avancée/statistiques IA (403 sous Business), génération d'offre IA. « Niveau de support » = libellé non appliqué techniquement.
- Résiduel connu : deux déblocages simultanés du dernier crédit **mensuel** pourraient passer (risque faible).
- Tests : `jobs/tests/test_audit_acces_paliers.py` (14).

---

## 🆕 SESSION 28/09/2026 — Revue complète du panel admin (25 pages)

**Demande** : vérifier toutes les pages admin (organisation, détails, erreurs, manques, cohérence, aide, couleurs), en autonomie totale. Détail sécurité dans `SECURITY.md` §18.

**Nouveaux composants partagés** (un seul pattern pour toutes les pages) :
- `Components/AdminPageHeader.jsx` : icône colorée (couleur = section de la sidebar), titre, sous-titre, actions, et bouton **« Aide »** repliable. Replié par défaut, l'état est mémorisé par page (`admin_aide_<clé>`, localStorage en try/catch). Prop `compact` pour les pages affichées dans des onglets (`AbonnementsIA`), afin d'éviter deux grands titres empilés.
- `Components/AdminEtat.jsx` : `AdminErreurChargement` (message + « Réessayer », plus de page blanche) et `AdminVide` (état vide illustré).
- `Components/AdminPagination.jsx` : pages fenêtrées `1 … 4 5 6 … 52`.
- `utils/useEchapPourFermer.js` : toutes les modales admin se ferment avec Échap et par clic à l'extérieur.

**Structure (`AdminLayout.jsx`)** :
- `/admin-taftech` ouvre le tableau de bord (ouvrait Entreprises).
- Sidebar responsive : tiroir mobile + barre supérieure avec point rouge d'alerte. Avant, 256 px fixes, inutilisable sur téléphone.
- Badges rechargés à chaque navigation (restaient figés jusqu'au F5).
- Groupes réorganisés et colorés : Principal / Modération / Comptes / Contenu du site / Référentiels / **Espace candidat** (Rendez-vous + Types de documents, auparavant rangés dans « Système ») / Facturation / Système. « Demandes Premium » renommé « Demandes d'abonnement ».

**Bugs réels corrigés** :
- **Pagination tronquée à 10 pages** (`.slice(0, 10)`) : Compétences et les 4 listes du Référentiel v2. Plus de la moitié des 1 038 métiers et 922 spécialités était inaccessible depuis l'admin.
- **FAQ** : la catégorie `PALIERS`, lue par la page Abonnements recruteur, n'était ni créable ni filtrable. Seule `PREMIUM` était proposée, catégorie morte depuis la suppression de la page Premium le 27/08. `PREMIUM` reste affichée « obsolète » si des questions existent encore.
- **Tailles de page** : `ADMIN_PAGE_SIZE = 20` (`adminService.js`) au lieu de 5 pour Offres, Entreprises, Utilisateurs et Candidatures. `AdminCandidaturesListAPIView` utilisait un `PageNumberPagination` brut qui ignorait `?page_size=` ; il passe sur `AdminPagination`.
- **Journal d'audit** : rechercher depuis la page 3 interrogeait la page 3 (valeur de `page` périmée), deux requêtes partaient au montage, et une erreur réseau s'affichait comme « Aucun log ». Réécrit avec un seul effet `[page, searchApplique]` et un état d'erreur.
- Classes Tailwind construites dynamiquement (`hover:${tw.textError}`) : invisibles pour Tailwind, le survol rouge des corbeilles ne marchait sur aucune page (9 fichiers).
- Codes bruts affichés remplacés par des libellés : statuts de candidature, exigences, rôles (Recruteur et Admin partageaient le même violet), types d'annonce, dates ISO, heures `09:00:00`.
- Offres : une offre expirée affichait « Expire aujourd'hui » ; le motif de rejet restait pré-rempli d'une offre à l'autre ; aucun anti double-clic sur le rejet ; description `null` passée au formulaire.
- Candidatures : `<tbody>` sans `divide-y`, score « null% », et un clic sur un lien d'offre ouvrait aussi la fiche. Approbations groupées (offres, entreprises) : `Promise.allSettled` pour compter les échecs partiels.
- `<td className="flex">` cassait l'alignement des tableaux Entreprises et Comptes.
- Rendez-vous : on pouvait créer un créneau fin ≤ début et bloquer une date passée ; l'annulation d'un rendez-vous ne demandait pas de confirmation. Ajout d'une séparation à venir / passés et de statuts colorés.
- Paliers : libellé trompeur « Coordonnées candidats visibles ». Depuis les crédits (29/08), `acces_coordonnees` ne commande plus que « Inviter à postuler » (`recruteur.py:1071`). Ajout de la remise annuelle calculée, avec alerte si l'annuel coûte plus que 12 × le mensuel.
- Configuration IA : interrupteurs explicites (`role="switch"`, Activée/Désactivée) ; température vide rejetée (`Number("")` valait 0) ; `max_tokens` ≥ 100 ; écran d'erreur au lieu d'un « Chargement… » infini.
- Formulaires Articles et Pages : confirmation avant de quitter avec des modifications non enregistrées ; slugs système réservés refusés à la création.
- Formations à vérifier : la page vidée par le dernier traitement se recharge s'il reste des éléments ailleurs.

**Ajouts** :
- Tableau de bord : cartes KPI cliquables, état vide ou erreur sur l'onglet marché, protection contre les divisions par zéro.
- Articles : miniature, date, lien public, filtre Publiés/Brouillons, compteur SEO de l'extrait.
- Bannières : aperçu du bandeau actif tel qu'affiché sur le site.
- Packs de crédits : prix par crédit.
- Pages du site : lien public et cadenas sur les pages système.
- Types de documents et compétences : avertissement de cascade à la suppression. `TypeDocument` est en `SET_NULL`, `MetierCompetence` en `CASCADE`, d'où la recommandation de masquer plutôt que supprimer.
- Diffusion : compteur de caractères et confirmation qui rappelle le sujet.
- Mentions légales : champs obligatoires ; un échec de chargement n'affiche plus un formulaire vide qui écraserait RC/NIF.

Toutes les aides ont été vérifiées contre le code : prix vide = paiement Chargily refusé, quota 0 = bloqué (`ia_quota.py:91`), candidat non notifié d'une annulation de rendez-vous, journal d'audit sans endpoint d'écriture.

**Tests** :
- Frontend **450/450** ✅ (69 fichiers). Nouveaux : `AdminDemandesPremium.test.jsx` (confirmation d'activation), `AdminComptes.test.jsx` (mot-clé SUPPRIMER, mot de passe ≥ 8). Tests ajoutés dans FAQ (PALIERS), Paliers (confirmation de prix) et IA (Réessayer, température vide).
- Les tests qui ciblaient les boutons par index (`allButtons[2]`) passent sur des `aria-label` explicites, le nouveau bouton « Aide » décalant les positions.
- Backend : `test_api_admin` (+2 tests d'auto-blocage), `test_api_audit_logs`, `test_api_admin_exports`, `test_api_cms`, `test_urls_Candidat_Recruteur` : 65/65 ✅.
- `manage.py check` propre, `npx vite build` propre.

**Non fait, à décider** : ~~harmoniser `role == 'ADMIN'` sur les vues de `jobs/views/admin.py`~~ / ~~soft-delete formation refusée~~ / ~~audit log activation-abonnement/prix-palier/suppression-admin~~ — **les 3 traités le 28/09/2026, voir section suivante.**

## 🆕 SESSION 28/09/2026 (suite) — Les 3 points laissés en attente : permission `IsAdminRole`, soft-refuse formation, audit log manquants

**Contexte** : suite directe de la revue admin ci-dessus — l'utilisateur a demandé de traiter les 3 points identifiés comme non faits ("faites les 3"), avec une interruption "on laisse pour après" puis reprise via "continuez tt". Entre les deux, un bug réel signalé par capture d'écran (`ProgrammingError` sur `/api/jobs/admin/offres/`) a été corrigé en urgence, hors de ce plan — cause : la migration `0126` (nouveaux champs `FormationCandidat`, voir point 2) avait été générée mais jamais appliquée à la base de dev avant que le code du point 2 l'utilise déjà. Nouvelle confirmation de la leçon déjà documentée plusieurs fois dans ce fichier : **toujours lancer `migrate` immédiatement après `makemigrations`**, jamais après avoir déjà écrit le code qui consomme les nouveaux champs.

**1. `IsAdminRole` — permission harmonisée sur `jobs/views/admin.py`** : nouveau `jobs/permissions.py::IsAdminRole` (`IsAdminUser` + `role == 'ADMIN'` combinés en une seule permission) — remplace les 18 occurrences de `permission_classes = [IsAdminUser]` dans `admin.py`, seul fichier de vues admin du projet qui n'avait pas déjà ce double contrôle (les 10 autres fichiers de vues admin le faisaient déjà en dur dans chaque méthode). Supprime au passage le check manuel redondant dans `AdminMarcheAPIView.get()`. Étendu aussi à `jobs/views/paliers_admin.py::PaliersAdminAPIView` (trouvé non harmonisé en traitant le point 3, même pattern `IsAdminUser` + check manuel dans chaque méthode). `test_api_audit_logs.py`/`test_api_paliers.py` : nouveaux tests `test_..._refuse_staff_sans_role_admin` (un compte `is_staff=True` avec un rôle non-ADMIN reste bloqué).

**2. Refus d'une formation "à vérifier" — soft-refuse au lieu d'un hard delete** : `AdminFormationsAVerifierAPIView.delete()` (`jobs/views/referentiel_admin.py`) ne supprime plus la ligne (`formation.delete()` retiré) — bascule `FormationCandidat.statut_validation` sur un nouveau statut `REFUSEE` (migration `0126`), avec 3 nouveaux champs de traçabilité : `motif_refus` (texte, optionnel), `refusee_par` (FK admin, `SET_NULL`), `date_refus`. La formation reste visible sur le profil candidat (règle projet : pas de suppression de donnée candidat sans garde-fou), sort de la file "à vérifier" (celle-ci filtre strictement `A_PRECISER`) et le candidat est notifié avec le motif s'il est renseigné. `FormationCandidat.save()` : `REFUSEE` est traité comme `A_PRECISER` côté bascule — si le candidat corrige l'intitulé et qu'un `diplome_ref` valide est fourni ensuite (par lui ou par un admin), la formation ressort automatiquement de `REFUSEE` vers `DECLARE`, jamais bloquée définitivement.
- Nouveau `jobs/tests/test_admin_formations_a_verifier.py` (9 tests, endpoint qui n'avait aucune couverture avant) : accès (non-admin, staff sans rôle admin), liste filtrée sur `A_PRECISER` uniquement, validation (PATCH), refus ne supprime pas la ligne + notifie avec le motif + sort de la file, et le cas de correction post-refus qui repasse en `DECLARE`.

**3. Audit log — 3 actions qui échappaient à la traçabilité (ou y étaient noyées sous `AUTRE`)** : `AuditLog.ACTIONS` (migration `0127`) gagne `ACTIVER_ABONNEMENT`, `MODIFIER_PRIX_PALIER`, `SUPPRIMER_ADMIN`.
- **Activation d'abonnement** (`AdminDemandesPremiumAPIView.patch`) et **suppression de compte admin** (`AdminCompteAdminsAPIView.delete`) étaient déjà loggués, mais sous l'action générique `AUTRE` — recatégorisés sur leur action dédiée, sans changement de comportement.
- **Changement de prix palier** (`PaliersAdminAPIView.put`, `jobs/views/paliers_admin.py`) : **vrai trou trouvé** — aucun audit log n'existait sur cette vue avant cette session, alors que c'est directement le tarif facturé aux entreprises. Ajouté : log créé uniquement si `prix_mensuel_da` ou `prix_annuel_da` change réellement (pas sur les autres champs du palier — limites, accès, ordre — pour ne pas noyer le journal), avec l'ancien et le nouveau prix dans le détail.
- Nouveau `jobs/tests/test_api_admin_audit_actions.py` (aucun test n'existait avant pour `AdminDemandesPremiumAPIView`/`AdminCompteAdminsAPIView`) : activation crée bien `ACTIVER_ABONNEMENT`, suppression admin crée bien `SUPPRIMER_ADMIN` (+ non-admin refusé, auto-suppression refusée). `test_api_paliers.py` : nouveaux tests `test_modification_prix_cree_un_audit_log` / `test_modification_sans_changement_prix_ne_journalise_pas`.
- **Frontend** : `AdminAuditLogs.jsx` (`ACTION_LABELS`) étendu avec les 3 nouvelles actions (libellé + couleur) — sans ça, elles seraient retombées sur le fallback `AUTRE` dans l'affichage (pas de crash, juste un libellé trompeur qui aurait annulé l'intérêt de les avoir dédiées).

**Tests** : backend ciblé (`test_api_paliers`, `test_api_admin_audit_actions`, `test_admin_formations_a_verifier`, `test_api_audit_logs`, `test_api_admin`) 42/42 ✅. Suite complète `jobs accounts` relancée en tâche de fond pour confirmation finale sans régression. `manage.py check` propre, `npx vite build` propre.

## 🆕 SESSION 27/09/2026 (suite 2) — Consolidation secteurs/domaines/spécialités + protection contre le réimport

**Demande** : plus aucune répétition/redondance dans les secteurs et les spécialités, en combinant si besoin, sans casser le matching. Décisions utilisateur : fusionner tous les doublons exacts de spécialités ainsi que leurs quasi-doublons orthographiques, rejouer les fusions après import, et me laisser trancher sur les secteurs.

**Nouveau `jobs/referentiel_fusions.py`** (tout y est exprimé en **codes stables**, jamais en pk) et commande `consolider_referentiel` (`--dry-run`, idempotente). La commande exécute des contrôles d'intégrité bloquants avant validation : groupe orphelin, métier sans groupe, secteur vide, chaîne ou cycle de redirection métier, référence candidat/offre perdue.
- **Secteurs 59 → 45, domaines 251 → 225** (`GROUPES_OPERATIONS`, chaque ligne commentée).
  - Rattachements de secteurs :
    - Audit → Finance>Audit.
    - Emballage → Imprimerie & Packaging.
    - Mines & Carrières, Énergie, Pétrole & Gaz → secteur officiel B.
    - Bureau d'études, Construction Numérique, Topographie & Géomatique → BTP.
    - Facility Management → Services Généraux.
    - Gestion des Déchets → Environnement.
    - Robotique, Utilités Industrielles → Industrie.
    - Distribution → Commerce > Grande distribution.
    - E-commerce → Commerce & Marketing.
  - Achats regroupés en un seul secteur (ils étaient éclatés entre Achats, Logistique et L).
  - L (Support à l'entreprise) perd RH, Comptabilité-finance et Stratégie commerciale au profit des secteurs dédiés. P (Services à la personne) perd Droit au profit de Juridique et Sécurité privée au profit de Sécurité.
  - Paie Finance → Paie RH.
  - Médecine Nucléaire, rangée par erreur sous Énergie → Santé.
  - Domaines homonymes créés par les fusions TSEC→officiel des 25-26/09, désormais fusionnés : Assurance/Assurances, 3 domaines en O, 4 en H, 2 en J, 2 en M.
- **Spécialités 967 → 922** (`SPECIALITES_FUSIONS`, 45 entrées).
  - 27 doublons de la Formation Pro : une fiche par niveau CAP/CMP/BT/BTS. Il n'en reste qu'une par spécialité, qui porte tous ses niveaux via `DiplomeSpecialite`.
  - 5 doublons d'import (même Master).
  - 13 variantes orthographiques vérifiées une à une.
  - Tout est repointé : couples diplôme+spécialité, alias, liens métier, relations, offres, formations candidats.
- **Volontairement non touchés** :
  - Options réellement distinctes (Usinage/Outillage, Flexo/Offset…) et « Économie monétaire et bancaire » ≠ « …et financière ».
  - Doublons *entre* domaines (thème éditorial v1 ↔ spécialité académique), déjà reliés par `RelationSpecialite` : décision client du 25/09.
  - HSE / Sécurité / Qualité, Transport / Logistique, Télécom / Informatique : périmètres réellement différents.
  - Domaines génériques homonymes dans des secteurs différents (« Production », « Qualité »…).

**Méthode garde-fou matching** : j'ai rejoué `metiers_compatibles` sur toutes les paires touchées, ancienne hiérarchie (sauvegarde) contre nouvelle.
- 3 688 paires en hausse : même vrai secteur 0 → 0.45, sous-domaines fusionnés → 0.85.
- 530 baisses 0.45 → 0, voulues : un domaine sorti d'un secteur fourre-tout, par exemple Acheteur ↔ Magasinier.
- **1 seule baisse forte** : « Gestionnaire de Paie » ↔ « …RH » passait de 0.93 à 0.85, car la branche « même groupe » renvoyait 0.85 avant d'essayer le fuzzy. **Corrigé dans `matcher.metiers_compatibles`** : même groupe → `max(0.85, fuzzy)`. Un regroupement ne peut plus jamais faire baisser un score.
- La fusion de groupes relie les métiers homonymes via `metier_canonique`, en suivant toujours la **racine** canonique.

**🐛 Bug trouvé et corrigé pendant l'exécution** : le classeur redirigeait déjà Acheteur/Category Manager/Responsable Achats (TAF-0005xx → TAF-0002xx). La 1ʳᵉ exécution a relié l'autre sens, ce qui créait 3 cycles A→B→A. Les 3 fiches ont été réparées depuis la sauvegarde, la logique est corrigée, et un contrôle d'intégrité ainsi qu'un test bloquent désormais ce cas.

**🔴 Trou majeur comblé — le réimport annulait toutes les fusions (y compris celles des 25-26/09)** : `import_referentiel_v2` refait l'upsert du `parent`/`libelle` des groupes et du `groupe_principal`/`metier_canonique` des métiers depuis l'Excel. Les commandes de fusion précédentes ciblaient les fiches par pk ou libellé, et certaines fusions avaient été faites à la main en shell : aucune n'était rejouable. De plus, une spécialité doublon recréée aurait fait **planter** l'import, puisque le `code` unique de son couple diplôme+spécialité est déjà porté par le couple fusionné. Fix :
1. L'import résout les codes de spécialités fusionnées (`code_specialite_canonique`) et ne recrée jamais les doublons.
2. `jobs/data/referentiel_hierarchie_cible.json` (versionné) contient l'écart base consolidée ↔ classeur : 143 groupes, 38 métiers, 94 groupes fusionnés. Il est réécrit par `consolider_referentiel` et **rejoué en fin d'import** (option `--sans-consolidation` pour désactiver). Le rejeu ne supprime un groupe que s'il est vide.

Les anciennes commandes `fusionner_secteurs_*`/`repartir_*` sont désormais couvertes par l'instantané. **Toute future fusion doit passer par `referentiel_fusions.py` puis `consolider_referentiel`**, jamais en shell.

**Cosmétique** : les libellés de secteurs officiels s'affichent avec « à » (« Support à l'entreprise »), dans `_nettoyer_libelle_secteur_nsec`.

**Sauvegarde avant écriture** : `C:\Users\filali\Desktop\Taftech_backups\referentiel_avant_consolidation_20260927.json` (dumpdata des 10 tables touchées, hors repo). `verifier_referentiel_v2` a été mis à jour : SpecialiteFormation 922 (+45 fusionnées), DiplomeSpecialite 839 (+82), MetierFormation 1325 (+86). Les totaux lus dans le classeur sont inchangés.

**Tests** : nouveau `test_consolidation_referentiel.py`. Il contient notamment un import des vrais classeurs sur base vierge ×2, qui doit reproduire exactement l'instantané. Il couvre aussi la fusion de spécialité sans perte, l'absence de cycle et le score qui ne baisse pas.

**Non traité, signalé** : une entreprise a `secteur_activite='VENTE'`, code qui ne correspond à aucun secteur. C'est antérieur à cette session.

---

## 🆕 SESSION 27/09/2026 (suite) — Checklist qualité site (anti-vibecoding)

Checklist fournie par l'utilisateur vérifiée point par point dans le code. Implémenté : page 404 (`Pages/Public/NotFound.jsx`, route `path="*"` en dernier dans `App.jsx`, `noindex`) ; titre d'onglet par route pour les pages sans `<Seo>` (`Components/RouteTitle.jsx`, placé avant `<Routes>` pour que les `<Seo>` publics gardent la priorité) ; bandeau hors ligne (`Components/OfflineBanner.jsx`, événements `online`/`offline` — pas de PWA/service worker) ; email/téléphone cliquables sur `/contact` ; image Open Graph passée du `.ico` à `public/taftech-logo.png` + `apple-touch-icon` + `theme-color` ; logo compressé (1008×813, 585 Ko → 400 px 125 Ko dans `src/assets`, 512 px 195 Ko dans `public`, original sauvegardé hors repo). Déjà conformes (vérifiés) : meta description, sitemap/robots, favicon, CGU/confidentialité, menu mobile + bottom nav, alt sur toutes les `<img>`, pas de `href="#"`, toasts erreur/succès. **Aussi : `utils/useSubmitLock.js` (bloque le double envoi + `disabled` sur le bouton submit) branché sur les 10 formulaires sans aucune protection (AlertesEmploi, Questionnaires, 6 modales ProfilCandidat, 7 formulaires admin : Bannières/Compétences/CreditPacks/FAQ/Paliers/RendezVous/TypesDocuments) ; règles CSS globales dans `index.css` (`overflow-x: clip` sur html/body, `button:disabled` grisé, `button:active` scale 0.97 — neutralisé par la règle `prefers-reduced-motion` existante). Erreurs sous chaque champ : `Components/FieldError.jsx` (message + `role="alert"`) + `utils/fieldErrors.js::extraireErreursChamps()` (erreurs DRF par champ) + règle CSS globale `[aria-invalid="true"]` (bordure rouge). Branché sur inscription candidat, inscription recruteur (dont les 2 Select secteur/wilaya), contact (validation client : champs requis + format email), réinitialisation mot de passe, changement de mot de passe (Settings — messages regroupés sous la ligne pour ne pas casser la mise en page horizontale). Chaque erreur s'efface dès que l'utilisateur modifie le champ ; le toast est conservé en complément. Formulaires déjà équipés avant : CreateJob, Questionnaires. **Non faits, décision utilisateur requise** : analytics (choix d'outil), bannière cookies (inutile tant qu'il n'y a que des cookies d'auth httpOnly strictement nécessaires — requise dès qu'un analytics est ajouté), adresse postale réelle (seulement « Oran, Algérie »), support hors ligne complet (PWA).

---

## 🆕 SESSION 27/09/2026 — Page explicative du matching (recruteur) + tooltips mis à jour

Nouvelle page `Pages/Recruteur/CommentFonctionneMatching.jsx` (route `/comment-fonctionne-matching`, sous `RecruteurLayout`, lien sidebar « Comprendre le matching » groupe Analyse, lien « Comment est calculé le score ? » à côté de « Pourquoi ce score ? » dans `DetailCandidature.jsx`). Contenu statique, **doit rester aligné sur `jobs/matcher.py`/`matching_params.py`** : formule à poids actifs, 5 critères (région binaire, diplôme, spécialité 1.0/0.70/fuzzy, expérience continue mois pertinents, compétences Obligatoire×2), barème métiers (1.0/0.85/0.70/fuzzy/0.45), donnée manquante ≠ incompatible, seuil 80 %. Tooltips obsolètes « spécialité (25pts)… » (ancien barème fixe) corrigés dans `MesCandidatures.jsx`, `JobDetail.jsx`, `GestionOffre/index.jsx`, `AdminCandidatures.jsx`, `AdminStatistiques.jsx`. Aucun endpoint backend.

**Suite — 3 autres pages explicatives** (gabarit partagé `Components/ExplicationPage.jsx` : `ExplicationPage` + `Bloc`), toutes statiques, à garder alignées sur le code source cité en commentaire de chaque fichier :
- `Pages/Recruteur/CommentFonctionnentCredits.jsx` (`/comment-fonctionnent-credits`, sidebar recruteur « Comprendre les crédits », lien « Comment ça marche ? » dans le bandeau crédits de la CVthèque) — source `credits_utils.py`.
- `Pages/Candidat/ComprendreMesScores.jsx` (`/comprendre-mes-scores`, sidebar candidat Carrière, lien « Comment est-il calculé ? » dans « Pourquoi ce score ? » de `MesCandidatures.jsx`) — score de compatibilité + score de profil + métiers accessibles + conseils d'amélioration ; sources `matcher.py`, `profile_score.py`, `metiers_matching.py`.
- `Pages/Candidat/ConfidentialiteRecruteurs.jsx` (`/confidentialite-recruteurs`, sidebar candidat Compte, lien à côté du toggle « Déblocage par les recruteurs » de `MesDocuments.jsx`) — source `ProfilCandidatDTO._peut_voir_coordonnees`, `visible_cvtheque`, `PartageDocument`.
Routes placées sous `RecruteurRoute`/`CandidatRoute` existants (audit sécu : contenu statique, aucune donnée exposée).

---

## 🆕 SESSION 26/09/2026 — Retour client "familles" de secteurs : audit, fusion de 9 secteurs racines dupliqués, audit diplômes

**Contexte** : le client demande que deux expériences dont les métiers appartiennent à des secteurs "différents mais identiques en pratique" (son exemple : Informatique / Systèmes d'information / Cloud computing) ne reçoivent plus automatiquement 0. La pertinence doit continuer à dépendre du métier, des missions et des compétences. Le poids de l'expérience reste à 20 %, sans nouveau critère "secteur", et les anciens identifiants ainsi que leurs correspondances sont conservés.

**1. Le cas cité était déjà corrigé.** Vérifié en base : les 4 domaines (Développement informatique, Support informatique, Systèmes d'information et de télécommunication, Cloud Computing) sont sous le même secteur racine "Informatique" (id 1864). `_meme_secteur_parent` renvoie bien 0.45 entre eux, grâce au correctif `_racine_secteur_id` qui remonte tous les niveaux (commit `46d33be`). Aucun nouveau système de "famille" n'était nécessaire : `_meme_secteur_parent` (automatique) et `RelationMetier` 'similaire' (manuel, panel admin) couvrent déjà ce besoin.

**2. 🐛 Vrai trou trouvé en auditant** : `_dedupliquer_secteurs()` et `SECTEURS_CODES_MASQUES` (`referentiel_utils.py`) ne masquent les doublons **que dans la liste affichée** (dropdown entreprise). Les deux secteurs racines `GroupeMetier` existaient toujours côté matching, chacun avec de vrais métiers rattachés. Deux métiers du même secteur réel tombaient donc à un score fuzzy proche de 0 (ex. Industrie : 0.16). 9 paires étaient concernées :
- **7 fusions 1↔1**, via la nouvelle commande `jobs/management/commands/fusionner_secteurs_racines_doublons.py` (`--dry-run`, idempotente, PAIRES par pk) : Industrie→C, Santé→M, BTP→F, A (Agriculture et pêche)→Agriculture & Agroalimentaire, Hôtellerie & Tourisme→H, Communication & Médias→J, Éducation & Formation→O. Aucune collision de domaine : tous les domaines ont été reparentés intacts.
- **2 répartitions 1→2**, via la nouvelle commande `repartir_secteurs_officiels_multi_cibles.py`. Chaque domaine était homogène, donc aucun classement métier par métier n'a été nécessaire. Pour K : Banque, Assurances et **Marché financier** → Banque & Assurance, Immobilier → Immobilier. Le rattachement de Marché financier est une décision de jugement, validée par l'utilisateur. Pour I : Logistique → Logistique & Supply Chain (fusionné avec le domaine "Logistique" déjà existant, sous-domaines reparentés), et les trois domaines Transport aérien, maritime et terrestre → Transport.
- Vérifié après coup : chaque paire interne à un secteur fusionné donne 0.45, alors que les secteurs restés réellement distincts (Banque vs Immobilier, Transport vs Logistique) ne reçoivent aucun bonus. On compte 0 métier orphelin, et aucune expérience, offre ou profil n'est cassé. Il reste 59 secteurs racines.
- `SECTEURS_CODES_MASQUES` n'a pas été modifié : les codes masqués ne correspondent plus à aucun secteur en base, donc l'effet est nul.

**3. Audit Diplômes/Spécialités** (même méthode) :
- Doublons exacts entre domaines différents : 25 groupes, tous déjà couverts par les 39 `RelationSpecialite` existantes.
- `TypeDiplome` (37) : aucun vrai doublon, uniquement du bruit fuzzy entre diplômes réellement distincts.
- `DomaineFormation` : "Électricité, électronique et énergie" (theme_formation, 4 entrées) recouvre "...et énergétique" (specialite, 40 entrées). Ce cas est traité au niveau des spécialités, sans fusion de domaine.
- Scan des 141 `theme_formation` contre les 825 `specialite` : 109 paires proches non couvertes, **en très grande majorité des faux positifs fuzzy** (Logistique~Linguistique, Construction métallique~Construction mécanique, Chimie~Biochimie). **9 relations ajoutées à la main**, uniquement là où le concept est réellement le même : Systèmes d'information, Achats et approvisionnements, Assurance(s), Hygiène sécurité environnement, Architecture intérieure, Menuiserie aluminium, Transit et douane, Froid et climatisation, Sociologie des organisations. Total : **48 `RelationSpecialite`**. Le reste est volontairement laissé non lié, car un faux lien fausserait le matching, ce qui serait pire qu'une absence de lien. "Hygiène et sécurité" a été écarté : c'est un thème trop générique, et le scan ne retient que le meilleur score.

**Leçon** : un masquage à l'affichage n'est jamais une fusion. Tout futur dédoublonnage de référentiel doit vérifier la hiérarchie réellement consommée par `matcher.py`.

---

## 🆕 SESSION 25/09/2026 (suite 2) — Nettoyage des secteurs GroupeMetier : préfixes, doublons stricts, chevauchements sémantiques, incohérences hiérarchiques

**Contexte** : l'utilisateur a signalé que la liste "secteurs" (page publique "Offres par secteur", dropdown profil entreprise, source unique `jobs/referentiel_utils.py::secteurs_entreprise()` = `GroupeMetier.type_groupe='secteur_source'`) contenait des libellés avec une lettre collée devant et des doublons, puis a relevé une incohérence plus profonde : "Informatique", "Intelligence Artificielle" et "Cloud Computing" apparaissaient comme 3 secteurs **parallèles** alors que IA/Cloud sont déjà des domaines réels sous Informatique.

**1. Préfixe lettre nettoyé** — les 16 secteurs officiels ANEM (`code_source` = A-P) avaient leur code collé dans le libellé lui-même ("A-AGRICULTURE ET PÊCHE"), + espaces parasites autour virgules/apostrophes ("L 'ENTREPRISE"). Nouveau `_nettoyer_libelle_secteur_nsec()` (`referentiel_utils.py`) — correction à la LECTURE (jamais en base), pour ne jamais être écrasée par un futur réimport ANEM idempotent.

**2. Doublons stricts** (même libellé exact après nettoyage) : "Industrie" (officiel C vs TSEC), "Commerce" (G vs TSEC), "Santé" (M vs TSEC) — dédup auto générique dans `_dedupliquer_secteurs()`.

**3. Chevauchements sémantiques** (texte différent, même sujet) — 7 paires tranchées manuellement (garder le libellé le plus clair/complet, peu importe l'origine officielle/TafTech) : BTP→gardé "Bâtiment et travaux publics", Agriculture et pêche→remplacé par "Agriculture & Agroalimentaire" (plus complet), Hôtellerie & Tourisme→gardé l'officiel (couvre aussi la restauration), Communication & Médias→gardé l'officiel (+ multimédia), Banque/assurances/immobilier→remplacé par les 2 TSEC précis (Banque & Assurance + Immobilier), Transport et logistique→remplacé par les 2 TSEC précis (Transport + Logistique & Supply Chain), Éducation & Formation→gardé l'officiel (couvre aussi la recherche scientifique). Liste curatée `SECTEURS_CODES_MASQUES` dans `referentiel_utils.py`, chaque code justifié en commentaire. Vérifié avant chaque retrait : seules 3 `ProfilEntreprise.secteur_activite` existent en base réellement (codes `C`/`VENTE`/`P`), aucune sur un code masqué.

**4. Incohérence hiérarchique** (le vrai problème signalé) — 10 secteurs "TSEC" (TafTech) étaient en réalité des sous-domaines déguisés en secteurs de premier niveau : soit sans collision de contenu avec leur futur parent (Nucléaire→domaine sous Énergie, Lubrifiants→domaine sous Pétrole & Gaz, Dispositifs Médicaux→domaine sous Santé — simple reparentage direct), soit en **doublon de contenu déjà existant** (Intelligence Artificielle/Cloud Computing/Cybersécurité déjà présents comme domaines riches sous Informatique — 10 domaines/71 métiers ; Instrumentation & Automatisme/Maintenance Industrielle déjà sous Industrie). Pour ces 5 derniers, le contenu réel se chevauchait sans être identique (ex: "Ingénieur Deep Learning" n'existait QUE côté secteur autonome, "Prompt Engineer" QUE côté domaine Informatique) — vraie fusion faite via nouvelle commande `jobs/management/commands/fusionner_secteurs_doublons.py` (idempotente, `--dry-run` supporté) : métier avec homonyme exact dans la cible → relié via `metier_canonique` (même mécanisme déjà utilisé pour les 41 doublons/44 redirections existants du référentiel v2, jamais dupliqué) ; métier/sous-domaine sans équivalent → déplacé tel quel (aucune perte de contenu). Total secteurs : 76 → 58.

**🐛 Bug trouvé en revérifiant à la demande de l'utilisateur ("revérifiez tout un par un")** : le reparentage direct de Lubrifiants (fait à la main, avant la commande de fusion) ne vérifiait la collision que sur le nom du *secteur* ("Lubrifiants") et non sur le nom de son *domaine enfant* ("Production") — résultat, "Pétrole & Gaz" s'est retrouvé avec **2 domaines nommés "Production"**. Corrigé (sous-domaines de la version en trop reparentés dans l'originale, doublon vide supprimé). Scan complet refait sur tous les secteurs (`GroupeMetier.objects.filter(type_groupe='secteur_source')` × leurs domaines enfants, recherche de doublon de libellé) → 0 collision restante nulle part.

**🐛 2ᵉ bug trouvé et corrigé pendant la fusion** : `Metier.groupe_principal` a `on_delete=SET_NULL` — en supprimant le sous-domaine source après avoir relié un métier doublon via `metier_canonique`, son `groupe_principal` passait à `NULL` (incohérent avec le pattern déjà établi où un métier avec `metier_canonique` garde toujours son propre `groupe_principal` valide). 4 métiers affectés, réparés (pointés vers le même groupe que leur métier canonique) ; la commande de fusion corrigée pour ne plus reproduire le bug si relancée.

**Cas volontairement NON touchés** (vérifiés, pas des doublons) :
- **Domaine-level** (16 cas type "Production"/"Qualité"/"Achats" répétés sous plusieurs secteurs différents) — audit approfondi jusqu'au 4ᵉ niveau (`sous_domaine_source`) a montré que chacun a du contenu réel et **distinct** (93 métiers au total) ; ce sont des noms génériques légitimement réutilisés dans des secteurs industriels différents, pas des doublons — les fusionner aurait cassé le matching.
- **Commerce (G) / Commerce & Marketing / Commerce International / Distribution** — questionné explicitement par l'utilisateur ("déjà utilisé dans le matching"), vérifié : **aucune collision de nom de domaine** entre les 4 (commerce de détail classique vs ventes/marketing B2B vs import-export/douane vs gestion de chaîne de magasins — 4 vrais créneaux différents), contrairement au cas Informatique/IA qui avait une collision de nom exacte. Usage réel vérifié : 1 seule offre au total sur "Commerce", 0 ailleurs — risque nul de toute façon.
- **114 doublons d'Appellation** (référentiel v2, même appellation de poste pointant vers 2 fiches Métier différentes — ANEM large vs TafTech précis, cf. audit du même jour) — liste complète déjà produite, en attente de décision utilisateur, pas encore traité.

**Tests** : 108/108 sur la suite ciblée (recherche_normalisation, api_marche, serializers_profils, matcher, matcher_referentiel_v2, referentiel_v2_simulations, accounts) + 92/92 avant le fix Production, relancés après — tout vert. `python manage.py check` propre. Aucune candidature/profil/offre réelle cassée (vérifié `ExperienceCandidat`/`ProfilCandidat`/`OffreEmploi` avec FK `metier_id` — 0 cassée).

---

## 🆕 SESSION 25/09/2026 (suite) — Score spécialité incohérent : deux domaines "informatique" disjoints du référentiel, relation manuelle "Spécialités similaires"

**Contexte** : l'utilisateur signale (captures d'écran, page GestionOffre offre 20) une candidature avec Diplôme 20/20 mais Spécialité 0/25, alors que le domaine de formation candidat ET le domaine affiché sur la spécialité de l'offre contenaient tous les deux « informatique ». Investigation en base (`SpecialiteFormation.objects.get(pk=...)`) : le matcher fonctionnait correctement (comparaison stricte par pk, F06 — jamais de rang/équivalence construits), le vrai problème est dans les données du référentiel client — **deux `DomaineFormation` distincts contiennent tous les deux « informatique » dans leur libellé** :
- Domaine 200 « Mathématiques et informatique » (code `U-MI`, source `SRC_TAF_V2`) — 26 spécialités `nature='specialite'` (académique précis, sources `SRC_BEJ`/`SRC_TL`, ex. « Modeles Intelligents Et Decision », « Genie Logiciel »).
- Domaine 218 « Informatique, données et numérique » (code `DOM-05`, source `SRC_D1`) — 8 spécialités `nature='theme_formation'` (thèmes éditoriaux v1 larges, ex. « Informatique », « Développement web », « Cybersécurité »).

Requête de recherche de doublons proches (`difflib`-friendly normalisation) sur l'ensemble de `SpecialiteFormation` : **50 groupes de libellés quasi-identiques répartis sur des domaines différents** (`assurance`, `banque`, `comptabilite`, `electrotechnique`, `gestion des ressources humaine`, `langue anglaise`, etc.) — confirme que ce n'est pas un cas isolé mais une caractéristique structurelle du référentiel client : une taxonomie `theme_formation` (thèmes éditoriaux v1 larges, ~22 domaines parallèles) coexiste avec la taxonomie `specialite` (précise, académique) sans jamais partager de pk, même quand elles décrivent le même champ. Ces entrées `theme_formation` sont documentées ailleurs dans ce fichier (session 24/09/2026, « 141 thèmes éditoriaux v1 ») comme volontairement conservées telles quelles par le client — **pas question de les fusionner/supprimer** (romprait la fidélité au référentiel fourni, F02/F06).

**Décision validée avec l'utilisateur** (2 autres options proposées et écartées : ne rien changer, ou fusionner/nettoyer les domaines en base) : répliquer exactement le pattern déjà construit pour les métiers le 24/09/2026 (`RelationMetier`/`_relation_similaire`, panel admin « Métiers similaires ») — une relation manuelle **admin-only**, jamais déduite automatiquement, qui accorde un score partiel (0.70) entre deux spécialités jugées substituables en pratique malgré leur séparation dans le référentiel.

**Backend** :
- Nouveau modèle `RelationSpecialite` (`jobs/models.py`, migration `0115`) — `specialite_depart`/`specialite_arrivee` FK `SpecialiteFormation`, `active_recherche`, `justification`, `unique_together`. Pas de champ `relation`/`code` (contrairement à `RelationMetier`, qui gère aussi les 49 relations importées du client) — ce modèle n'a qu'un seul type d'usage, entièrement créé/géré depuis l'admin, aucune donnée importée n'y correspond.
- `jobs/matcher.py::_specialite_relation_similaire(spec_id_a, spec_id_b)` + `specialites_formation_compatibles(spec_candidat, spec_offre)` — même structure que `metiers_compatibles()` : exact (pk identique → 1.0), relation manuelle (0.70), filet fuzzy sur le libellé normalisé (`difflib.SequenceMatcher`, seuil 0.80 — plus strict que le seuil métier 0.72, car deux spécialités techniques courtes au nom proche mais réellement différentes sont plus fréquentes que pour des libellés métier). **Pas de bonus « même domaine »** (contrairement à `metiers_compatibles()` qui a un bonus 0.85 pour même `groupe_principal`) — un domaine du référentiel Diplômes peut regrouper des spécialités hétérogènes, un bonus générique produirait trop de faux positifs.
- `_score_diplome_specialite()` (S07) : la boucle qui choisit la meilleure `FormationCandidat` du candidat utilise désormais `specialites_formation_compatibles()` (score continu 0-1) au lieu d'un test d'égalité stricte `f.specialite_ref_id in specialite_ids` (binaire). `contrib_specialite["score"]` peut désormais être une valeur intermédiaire (ex. 0.70) au lieu de 0.0/1.0 strict.
- Nouvelle branche d'explication dans `calculer_score_matching()` : `elif contrib_specialite["score"] > 0` → « Spécialité de formation jugée proche de celles acceptées par l'offre (libellé). », distincte du cas exact (`== 1.0`, « ...acceptée par l'offre. ») et du cas incompatible (`else`, ecart ajouté).
- Panel admin CRUD répliqué à l'identique du pattern « Métiers similaires » : `AdminRelationsSpecialiteAPIView` (`jobs/views/referentiel_admin.py`), `AdminRelationSpecialiteSerializer` (`jobs/serializers/referentiel_admin.py`), routes `jobs/admin/referentiel-v2/relations-specialites/(<pk>/)`. Contrairement au CRUD métiers, pas de génération de `code` interne (le modèle n'en a pas — aucun import client à distinguer).

**Frontend** : nouvel onglet « Spécialités similaires » dans `AdminReferentielV2.jsx` (`RelationsSpecialitesPanel`, même structure que `RelationsSimilairesPanel`) — formulaire de rapprochement (deux champs + justification optionnelle), liste + suppression. Nouveau composant inline `SpecialiteAutocomplete` (recherche via `adminService.getAdminReferentielSpecialites`, déjà utilisé par l'onglet « Spécialités » de la table générique) — **affiche systématiquement le Domaine sous le libellé** dans les suggestions et la liste des relations créées, précisément pour éviter le piège visuel à l'origine de ce bug (deux domaines « informatique » différents, indiscernables sans cette info). `adminService.js` : `getAdminRelationsSpecialites`/`creerRelationSpecialite`/`supprimerRelationSpecialite`.

**Relation créée en base de dev** pour débloquer le cas réel signalé : `Modeles Intelligents Et Decision` (pk 3490, domaine 200) ↔ `Informatique` (pk 3752, domaine 218). Vérifié en conditions réelles (`calculer_score_matching` relancé en shell sur l'offre 20 / le candidat réel) : score spécialité 0→17.5/25 (0.70×25), total offre 41.17%→58.67%. **Le score stocké sur la candidature existante (`Candidature.score_matching=41.17`, figé à la postulation par design — voir décision « Snapshot » plus bas dans ce fichier) n'est PAS recalculé rétroactivement** — seul le score live (CVthèque, nouvelle candidature) reflète la relation ; aucune tâche de recalcul en masse n'a été prévue/demandée.

**Vérifié qu'aucun autre cas réel n'était impacté** avant d'aller plus loin : sur l'ensemble des candidatures/offres existantes, une seule offre utilisait `specialites_requises` (l'offre 20 ci-dessus) — donc un seul cas actif au moment du fix. En revanche, recherche exhaustive des libellés de spécialité quasi-identiques répartis sur des domaines différents (normalisation accents + comparaison) : **50 groupes trouvés au départ**, confirmant que le piège « académique précis (nature=specialite) vs thème éditorial v1 large (nature=theme_formation) » est structurel au référentiel, pas un cas isolé. Liste des 25 groupes restants (après le premier fix) transmise à l'utilisateur pour arbitrage — **22 validés pour création automatique** (script one-shot, toutes les paires cross-domaine du groupe, sauf paires dans le même domaine qui sont de vrais doublons d'import, pas ce que `RelationSpecialite` est censé couvrir). 3 groupes initialement exclus par excès de prudence (`comptabilite`/`electrotechnique`/`gestion des ressources humaines`, qui contiennent aussi un doublon exact dans un même domaine) ont été réintégrés en ne créant que leurs paires cross-domaine valides. **Total : 39 `RelationSpecialite` en base de dev** (1 manuelle initiale + 38 générées par script, toutes `active_recherche=True`, consultables/supprimables dans l'onglet admin). Les 3 doublons exacts même-domaine (`Comptabilité` ×2 dans le domaine 195, `Electrotechnique` ×3 dans le domaine 185, `Gestion des ressources humaines` — un doublon dans les données sources, pas un cas pour `RelationSpecialite`) restent **non traités**, à signaler éventuellement au client comme anomalie du fichier Excel source.

**Tests** : nouveau `jobs/tests/test_specialite_relation_similaire.py` (13 tests : `specialites_formation_compatibles` exact/relation/inactive/fuzzy, `_score_diplome_specialite` avec/sans relation reproduisant le cas réel candidature 26/offre 20, CRUD admin complet) — 13/13 ✅. Suite ciblée matcher/référentiel v2 (45 tests) relancée sans régression après le changement de `_score_diplome_specialite`. `npx vite build` propre, `python manage.py check` propre.

## 🆕 SESSION 25/09/2026 — Fixes CVthèque (exposition données), dashboard, questionnaire candidat, déconnexions intempestives

**Contexte** : série de bugs remontés par l'utilisateur avec captures d'écran, traités un par un dans l'ordre. Détail sécurité complet des points 1 et 5 dans `SECURITY.md` §14-15.

**1. CVthèque — données candidat exposées avant déblocage** (capture d'écran, panneau détail affichant un profil non débloqué) — `jobs/serializers/profils.py::ProfilCandidatDTO` :
- **Bug réel** : `linkedin`/`github` étaient listés dans `Meta.fields` sans être déclarés `serializers.SerializerMethodField()` sur la classe — DRF ignorait donc silencieusement les méthodes `get_linkedin()`/`get_github()` (censées masquer tant que non débloqué) et sérialisait la valeur brute du modèle. Les deux liens fuyaient systématiquement.
- **`bio`** ("À propos") : aucun masquage du tout — vérifié sur un cas réel, le texte contient souvent des noms d'employeurs précis ("... chez Renault Algérie Production... site Stellantis/Fiat d'Oran..."), l'info la plus identifiante, alors que les fiches d'expérience structurées affichaient déjà correctement "Entreprise non communiquée" pour la même donnée.
- **Étendu sur demande explicite de l'utilisateur** ("à part la ville" doit rester visible) : `photo_profil`, `first_name`/`last_name` (nom complet — avant : `last_name` tronqué en initiale mais `first_name` en clair, combiné à la vraie photo la ré-identification restait triviale), `commune`, `diplome`/`diplome_ref_libelle`, `metier_libelle` masqués eux aussi avant déblocage. Seuls titre du poste + wilaya restent visibles (nécessaires pour parcourir la liste avant de dépenser un crédit).
- **Bug frontend lié trouvé au passage** (`CVTheque.jsx`) : la `key` React et `isSelected` de chaque carte reposaient sur `candidat.email` — toujours `null` avant déblocage, donc toutes les cartes non débloquées partageaient la même clé et se marquaient mutuellement "sélectionnées". Basculé sur `user_id` (toujours présent).

**2. Activité récente — déblocage CVthèque affichait l'email brut du candidat** au lieu d'une phrase lisible (capture : "rafikboumaza31@gmail.com" au lieu de "Vous avez débloqué le profil de..."). Cause : `DeverrouillerCandidatAPIView.post()` (`jobs/views/credits.py`) passait `candidat.email` comme `detail` du log, et `_phrase_activite()` (`jobs/views/recruteur.py`) n'avait aucun cas pour l'action `DEBLOQUER_CANDIDAT` — repli sur `return detail` brut. Fix : `detail` construit à partir du nom complet du candidat (ou son titre de poste, ou "un candidat" en dernier recours) + nouveau cas dans `_phrase_activite()` → *"Vous avez débloqué le profil de X dans la CVthèque"*.

**3. Dashboard — une offre `EN_ATTENTE` (en cours de validation admin) affichée comme "Active"** (capture d'écran) dans le widget "Mes offres d'emploi actives" (`DashboardRecruteur.jsx`) — le badge de statut ne testait que `est_cloturee`, ignorant complètement `statut_moderation`. Fix : badge à 4 états réels (Clôturée / En attente / Rejetée / Active), cohérent avec ce que fait déjà `OffresListPage.jsx` (page complète liée par "Voir toutes", elle était déjà correcte).

**4. "Candidats recommandés" affichait des scores très faibles (35%, 41%)** comme s'ils étaient pertinents (widget dashboard + page dédiée `/candidats-recommandes`) — aucun seuil minimum n'existait, juste "les meilleurs scores disponibles parmi les candidatures". Aligné sur le seuil déjà utilisé ailleurs dans le code pour qualifier un profil de "recommandé" (`ActiviteProfil.SEUIL_SCORE_RECOMMANDE = 80.0`, utilisé pour la notification "profil recommandé") : en dessous de 80%, un candidat n'apparaît plus dans ces deux endroits — le widget disparaît simplement si aucun candidat n'atteint le seuil, plutôt que d'afficher un score faible comme une recommandation. Appliqué à `DashboardRecruteur.jsx::candidatsRecommandesTous` (frontend) et `CandidatsRecommandesAPIView` (`jobs/views/recruteur.py`, backend — `score_matching__gte=80.0` ajouté au queryset).

**5. Questionnaire candidat — impossible de taper dans les champs** ("je n'ai rien pu écrire") — `Pages/Public/JobDetail.jsx`. Même piège déjà documenté et corrigé pour `FiltersPanel` (`JobsList.jsx`, session 19/07/2026) : `QuestionnaireForm` était un composant défini **à l'intérieur** du rendu de `JobDetail` — chaque frappe déclenche `setReponses` → re-render du parent → nouvelle référence de type pour `QuestionnaireForm` → React démonte/remonte tout le sous-arbre → l'input perd focus et contenu après le premier caractère. Fix : converti en fonction `renderQuestionnaireForm(onNext)` qui renvoie du JSX directement (appelée `{renderQuestionnaireForm(...)}`, pas instanciée comme balise `<QuestionnaireForm />`) — plus de frontière de composant, plus de démontage. **Rappel pour toute future session** : ne jamais définir un composant (`const X = () => (...)`) à l'intérieur du corps d'un autre composant qui a du state local — c'est la 2ᵉ fois que ce pattern précis casse un formulaire dans ce projet.

**6. Déconnexions forcées intempestives en pleine utilisation** ("session expirée" alors qu'il travaillait, bug récurrent) — race condition sur la rotation du refresh token JWT. Backend (`SIMPLE_JWT`) a `ROTATE_REFRESH_TOKENS=True`+`BLACKLIST_AFTER_ROTATION=True` (bonne pratique — empêche le rejeu d'un refresh token volé) : chaque `token/refresh/` réussi blackliste l'ancien refresh token. `axiosConfig.js` ne mutualisait pas les rafraîchissements — sur une page qui charge plusieurs endpoints en parallèle (dashboard, CVthèque), si l'access token (15 min) expirait pile à ce moment, chaque requête en 401 déclenchait indépendamment son propre appel `token/refresh/` ; le 1ᵉʳ réussissait et blacklistait l'ancien refresh token, les suivants (envoyés avant que le navigateur applique le nouveau cookie) échouaient → déconnexion forcée alors que la session était en réalité valide. Fix : mutex `refreshEnCours` (variable module-level, une seule `Promise` de rafraîchissement partagée) — toute requête en 401 pendant qu'un rafraîchissement est déjà en cours attend ce même rafraîchissement au lieu d'en déclencher un second.

**Tests** : backend 102/102 sur les fichiers concernés (cvtheque, crédits, recruteur, serializers profils, candidat, paliers gating), frontend CVTheque/DashboardRecruteur/JobDetail/api/authService tous verts, `npx vite build` propre à chaque étape, `python manage.py check` propre.

---

## 🆕 SESSION 24/09/2026 (suite) — "Autre, préciser" retiré des exigences d'offre, neutralisé côté matching candidat

**Contexte** : capture d'écran utilisateur — sur "Publier une offre", les listes "Diplômes acceptés"/"Spécialités acceptées" (référentiel v2) laissaient sélectionner les entrées génériques du référentiel `"Autre diplôme — préciser"` (`TypeDiplome.code='D-AUTRE'`) et `"Autre spécialité — préciser"` (`SpecialiteFormation.code='SP-AUTRE'`, entrée unique en base, pas une par domaine) au même titre que n'importe quelle vraie valeur.

**Décision (après plusieurs allers-retours)** : **retirées des deux sélecteurs** (`CreateJob.jsx` et `OffresListPage.jsx`, filtre `RE_AUTRE_PRECISER` sur le libellé) plutôt que de leur ajouter une vraie capture de précision (essayé puis abandonné en cours de session — nouveau champ `OffreEmploi.precision_diplome_autre`/`precision_specialite_autre`, revert complet, migration supprimée). Raison : dans une liste d'**exigences de matching**, "Autre, préciser" ne compare rien côté candidat (aucune donnée à matcher en face) — un recruteur qui l'ajoute croit avoir posé un critère alors que ça ne filtre/score jamais un candidat. Le champ texte libre "Diplôme attendu" (déjà existant sur l'offre, informatif + filtre de recherche, jamais lu par le matcher) reste le bon endroit pour exprimer ce genre de flexibilité.

**Côté candidat — d'abord neutralisé, puis entièrement retiré aussi** (décision finale de l'utilisateur : "on ne devrait pas enlever le bouton... puisque ça ne sert à rien" — cohérence avec la décision côté offre, "Autre, préciser" n'a aucune utilité réelle nulle part dans ce référentiel) :
- Première passe (neutralisation, gardée) : `FormationReferentielSelect.jsx` filtre `D-AUTRE`/`SP-AUTRE` hors des listes déroulantes normales (`typesDiplomesOptions`/`specialiteOptions`) — `NomenclatureFormationAPIView` expose `code` sur `specialites` pour permettre ce filtre.
- **Bug de scoring réel corrigé dans `matcher.py::_score_diplome_specialite`** (reste valable, protège aussi les anciennes formations déjà enregistrées en `Autre`/vide avant ce chantier) : une `FormationCandidat` sans spécialité renseignée (`specialite_ref` vide) ou pointant vers `SP-AUTRE` produisait `contrib_specialite = {"score": 0.0, "connu": True}` — traité comme une vraie incompatibilité, pénalisant le candidat comme s'il avait déclaré une spécialité qui ne correspond pas. Fix : `specialite_vague = (not formation.specialite_ref_id) or code == 'SP-AUTRE'` → `{"score": 0.0, "connu": False}` (donnée manquante, neutre) — cohérent avec le traitement déjà existant de `diplome_ref` code `D-AUTRE` (exclu de la liste `formations` avant calcul, ligne ~408).
- **Bug UI trouvé en cours de route** : cliquer "Autre, préciser" (Domaine ou Spécialité) ne vidait pas le texte de précision (`autreTexte`, bindé au champ `description` du formulaire parent) — l'ancien libellé réel précédemment choisi restait affiché dans la case "Précisez", donnant l'impression trompeuse d'une entrée dupliquée. Fix : `activerDomaineAutre()`/`activerSpecialiteAutre()`/le clic "Autre" du diplôme appellent désormais `onChangeAutreTexte("")`/`onChangeDiplomeAutreTexte("")`.
- **Décision finale** : `permettreAutre={false}` passé sur l'unique consommateur (`Modals.jsx`, formulaire "Ajouter/Modifier une formation" candidat) — le bouton "Autre, préciser" ne s'affiche plus du tout, sur aucun des 3 champs (Type de diplôme, Domaine, Spécialité). Un candidat dont la formation n'existe pas dans le référentiel doit désormais choisir la valeur la plus proche parmi les entrées réelles — le texte d'aide au-dessus du bloc a été corrigé en conséquence (ne mentionne plus "Autre, préciser"). `permettreAutre` reste dans le composant partagé (comportement par défaut `true`) au cas où un futur consommateur en aurait besoin, mais plus aucun écran du site ne l'active actuellement.

**Tests** : `test_matcher.py`, `test_matcher_diplome_specialite_s07.py`, `test_matcher_referentiel_v2.py`, `test_referentiel_v2_simulations.py` (38/38 ✅ avec `--keepdb`). `npx vite build` propre, `python manage.py check` propre.

---

## 🆕 SESSION 24/09/2026 — Autocomplete métier : recherche pendant la frappe + pertinence, matching secteur/relations manuelles

**Contexte** : l'utilisateur signale via capture d'écran qu'un métier réel ("Contrôle de conformité technique d'équipements et installations") reste introuvable dans le champ "Intitulé du poste" de `CreateJob.jsx`, puis que la saisie en direct ("developpe" avant de finir "développeur") n'affiche aucune suggestion tant que le mot n'est pas complet. Deux bugs réels distincts trouvés dans `MetierAutocompleteAPIView` (`jobs/views/offres.py`).

**Bug 1 — aucun tri de pertinence** : la requête matchait bien 71 appellations pour "controle de" mais les renvoyait dans l'ordre brut de la base (pas de `.order_by()`) — le métier exact tombait hors des 20 premiers résultats. Fix : annotation `Case/When` (exact `cle_recherche` → priorité 0, préfixe → 1, reste → 2) + `order_by('_priorite', 'cle_recherche')`.

**Bug 2 — recherche "tout ou rien" par mot entier, incompatible avec la frappe en direct** : `q_mots_cle_recherche()` (limite de mot stricte `\b`, voir N02) exige que chaque mot soit **complet** — taper "developpe" ne matchait donc rien tant que "développeur" n'était pas fini de taper, contrairement au comportement attendu d'un champ de recherche instantanée. Fix, localisé dans `MetierAutocompleteAPIView` uniquement (pas dans le helper partagé `q_mots_cle_recherche`, qui reste inchangé pour `RechercheUniverselleAPIView` et son test verrou N02) : le **dernier mot** de la requête est traité en préfixe (`(^|\s)mot`, sans borne de fin) si sa saisie n'est pas terminée (pas d'espace final) et qu'il fait ≥2 lettres — un dernier mot d'1 lettre reste exigé en entier pour ne pas régresser sur le cas verrouillé "c" ne doit jamais matcher "cpp"/"csharp" (`test_N02_c_seul_ne_matche_jamais_cpp_avec_fixtures_reelles`). Les mots précédents (déjà tapés en entier) restent en whole-word.

**Suite de la discussion — pourquoi deux métiers du même domaine informatique au sens large ("Informaticien chargé d'étude" vs "Développeur Back-End") scorent 0% en matching** : vérifié en base, ces deux métiers n'ont ni le même `groupe_principal` (domaine) ni même le même secteur racine dans la hiérarchie `GroupeMetier` du référentiel client ("Systèmes d'information et de télécommunication" → parent "L-SUPPORT A L'ENTREPRISE" ; "Développement informatique" → parent "Informatique") — un artefact de la nomenclature source, pas un bug de calcul. Deux mécanismes ajoutés à `matcher.py::metiers_compatibles()` suite à cette discussion :
- **`_meme_secteur_parent()`** (score 0.45) : même secteur racine (`GroupeMetier.parent`) mais domaine différent — avant cette session, `metiers_compatibles()` était strictement "tout ou rien" (0.85 si même domaine exact, sinon repli fuzzy `difflib` uniquement) sans aucun score intermédiaire pour "même grand secteur, domaine différent". **Ne s'applique PAS** au couple Informaticien/Développeur ci-dessus (secteurs racines différents), mais aide d'autres couples partageant un vrai secteur commun.
- **`_relation_similaire()`** (score 0.70) : nouvelle relation manuelle, type `"similaire"` sur le modèle `RelationMetier` existant (`relation` en `CharField` libre, pas de migration nécessaire) — distincte des 49 relations importées du client (`redirection_equivalente`/`plus_precis_que`, jamais touchées). Décision produit explicite : jamais déduite automatiquement, seulement peuplée à la main par l'admin pour les cas où le référentiel v2 sépare à tort deux métiers substituables en pratique (ex. le couple ci-dessus).

**Nouveau panel admin — onglet "Métiers similaires"** (`AdminReferentielV2.jsx`) : formulaire de création (deux `MetierAutocomplete` + justification optionnelle) + liste + suppression, backend `AdminRelationsSimilaireAPIView` (`jobs/views/referentiel_admin.py`, `GET`/`POST`/`DELETE jobs/admin/referentiel-v2/relations-similaires/`) — filtre toujours `relation='similaire'`, ne liste/supprime jamais les relations importées. `code` auto-généré (`TAF-SIM-<uuid12>`) car ces relations n'ont pas d'équivalent dans le fichier Excel client. Nouveau `jobs/tests/test_admin_relations_similaires.py` (7/7 ✅ : liste ignore les relations importées, création, refus même métier des deux côtés, suppression, suppression d'une relation importée refusée 404, permissions non-admin, recherche par libellé).

**Tests** : backend `test_recherche_normalisation`/`test_metier_suggestions`/`test_migration_redirections_recherche`/`test_recherche_universelle`/`test_admin_referentiel_v2` (45/45 ✅, dont le test verrou N02 toujours vert), `test_matcher*`/`test_referentiel_v2_simulations` (51/51 ✅), suite complète `jobs accounts` ✅, `test_admin_relations_similaires` (7/7 ✅ nouveau), `python manage.py check` propre. Frontend : `AdminReferentielV2.test.jsx` (5/5 ✅), `npx vite build` propre.

---

## 🆕 SESSION 23/09/2026 — Formulaire offre : fusion Titre/Métier + Diplôme/Spécialité découplés

**Contexte** : l'utilisateur a remarqué une répétition visuelle sur "Publier une offre" (`CreateJob.jsx`) — un champ "Titre du poste" et un champ "Métier" quasi identiques visuellement, plus un vieux champ "Diplôme attendu" (niveau minimum) à côté d'un builder de couples diplôme+spécialité. Vérifié contre le message client original (retrouvé et cité intégralement en conversation) et les onglets `REGLES_MATCHING`/`REGLES_FORMATION` des deux classeurs référentiel v2 avant de coder — aucune des deux duplications n'était une exigence client, les deux ont été simplifiées.

**1. Fusion Titre/Métier** — un seul champ "Intitulé du poste" en haut du formulaire. Choisir une suggestion (référentiel `Appellation`) résout titre **et** métier en un seul geste (`handleTitreChange`/`searchMetiers`, `setFormData({ titre, metier, metier_libelle })`). Une saisie 100% libre affiche un badge "Métier de référence : X · Modifier" une fois résolu, ou un petit widget `MetierAutocomplete` obligatoire en dessous tant que le métier n'est pas rattaché (25% du score de matching, jamais optionnel). Ancien champ "Métier" dupliqué dans "Profil recherché" supprimé, grille repassée à 2 colonnes.

**2. Diplôme/Spécialité découplés (changement structurant, modèle de données)** — vérifié dans `REGLES_MATCHING` que le client décrit **deux listes indépendantes** sur l'offre : `S05 : score_diplome=1 si diplome_id est dans offre.diplomes_acceptes` et `S06 : score_specialite=1 si specialite_id est dans offre.specialites_acceptees` — jamais un couple imposé (cohérent avec F06 : "ne pas utiliser ordre d'affichage, niveau ou nombre d'années comme rang"). L'implémentation précédente (`OffreDiplomeAccepte → DiplomeSpecialite`, couple obligatoire diplôme+spécialité) empêchait un recruteur de dire "Licence, toute spécialité" — la spécialité devenait toujours un critère actif dès qu'un diplôme était requis, sans façon de la désactiver seule.
- **Modèle** (migration `0113`) : `OffreDiplomeAccepte` supprimé (0 ligne en base au moment du changement, pas de backfill nécessaire), remplacé par deux `ManyToManyField` directes sur `OffreEmploi` — `diplomes_requis` (→ `TypeDiplome`) et `specialites_requises` (→ `SpecialiteFormation`), chacune vide indépendamment = critère non demandé (S01).
- **Matcher** (`_score_diplome_specialite()`, `jobs/matcher.py`) : `diplome_actif`/`specialite_actif` calculés séparément depuis les deux listes plates. Quand les deux sont actifs, reste évalué sur la **même** `FormationCandidat` (jamais un diplôme d'une formation combiné à la spécialité d'une autre — T10, inchangé). Le calcul mathématique par formation (`sd`/`ss`, choix de la formation qui maximise le total pondéré) était déjà indépendant par critère dans l'ancien code (dérivé des couples) — seule la source des listes a changé, pas la logique de scoring.
- **Backend** : `_synchroniser_diplomes_acceptes_offre()` → `_synchroniser_diplomes_requis_offre(offre, diplome_ids, specialite_ids)` (deux `.set()` M2M indépendants, `jobs/views/offres.py`). Payload requête : `diplomes_requis`/`specialites_requises` (listes d'ids) remplacent `diplomes_acceptes` (liste de couple ids). Serializers (`OffreEmploiSerializer`, `OffreDashboardDTO`) exposent `diplomes_requis_detail`/`specialites_requises_detail` (`[{id, libelle}]`) au lieu de `diplomes_acceptes` (`OffreDiplomeAccepteSerializer` supprimé).
- **Frontend** (`CreateJob.jsx`, `OffresListPage.jsx` — création et modification d'offre) : le builder `FormationReferentielSelect` (cascade Type→Domaine→Spécialité, conçu pour la saisie d'UNE formation candidat) remplacé par deux listes indépendantes de chips ("Diplômes acceptés" / "Spécialités acceptées (optionnel — vide = toute spécialité)"), chacune un simple `Select` + bouton Ajouter sur les listes plates `nomenclatureFormation.types_diplomes`/`.specialites`. Les suggestions "pour ce métier" (`MetierSuggestionsAPIView`, inchangé côté backend) alimentent maintenant les deux listes indépendamment au lieu d'un couple. `JobDetail.jsx` (affichage public) : bloc "Diplômes / Spécialités acceptés" lit les deux nouveaux champs séparément.
- **Textes UI clarifiés** (suite d'une question de l'utilisateur, "mais c'est utilisé pas non utilisé") : le texte d'aide précise désormais que "Diplôme attendu" (l'ancien champ niveau minimum) sert de **filtre de recherche** sur `/offres` (`JobListAPIView`, `diplome__icontains`, inchangé) en plus d'être affiché sur l'annonce — seul le **score de matching** ne le lit plus (repli hiérarchique retiré depuis la réécriture S01-S14 du 21/09/2026). Commentaire backend périmé corrigé au même endroit (`jobs/views/offres.py`, mentionnait encore un "repli" supprimé).

**Tests** : 4 fichiers de test backend mis à jour (`test_matcher_diplome_specialite_s07.py`, `test_matcher_referentiel_v2.py`, `test_referentiel_v2_simulations.py`, commentaires dans `test_matcher.py`) — `OffreDiplomeAccepte.objects.create(offre=o, couple=c)` remplacé par `o.diplomes_requis.add(c.diplome); o.specialites_requises.add(c.specialite)`. Suite backend complète **516/517 ✅** (1 échec préexistant sans rapport : fixture Excel synthétique `test_import_referentiel_v2_rejet_fk.py` sans onglet `SOURCES`, jamais touchée par ce changement). Frontend **430/432 ✅** (2 échecs préexistants confirmés sans rapport, `RecruteurLayout.test.jsx`/`FunnelChart.test.jsx`), `CreateJob.test.jsx` adapté (6/6 — un seul geste résout désormais titre+métier), `npx vite build` propre, `python manage.py check` propre.

**Non touché** : la logique de résolution informative `diplome_ref`/`niveau_scolaire_ref` (auto-résolue depuis le vieux champ texte `diplome`, jamais consommée par le matcher — voir session 21/09/2026 "Solveur DIPLOMES_CHOICES") reste inchangée, seul son docstring a été précisé.

---

## 🆕 SESSION 22/09/2026 (suite 2) — Secteur d'activité entreprise sourcé du référentiel v2 (86 secteurs, pas 16)

**Contexte** : question hors périmètre du message client (rien dit sur le profil entreprise), mais soulevée par l'utilisateur en creusant la vérification référentiel v2 — décision produit demandant réflexion : le secteur d'activité de l'entreprise (formulaire d'inscription/paramètres recruteur) doit-il rester sur les 16 secteurs ANEM larges (`SECTEURS_CHOICES`, historique) ou s'enrichir des ~70 secteurs précis ajoutés par TAFTECH dans `GROUPES` (`TSEC-*`, ex: Informatique, Cybersécurité, RH, BTP...) ?

**Comparaison marché faite avant de trancher** (LinkedIn ~150 secteurs, Glassdoor/Indeed/Emploitic — dizaines de secteurs précis, jamais 16 catégories administratives larges) + constat technique : la navigation publique "Offres par secteur" (`NomenclatureAPIView.secteurs`, `GroupeMetier.type_groupe='secteur_source'`) exposait déjà les 86 valeurs (NSEC+TSEC) depuis le cutover du 18/09 — **le site avait donc déjà DEUX référentiels de "secteur" différents et non synchronisés** : 16 pour le profil entreprise (`SECTEURS_CHOICES`), 86 pour la navigation offres/métiers. Décision utilisateur : aligner les deux sur la même source (86).

**Backend** :
- `ProfilEntreprise.secteur_activite` (`jobs/models.py`) : `choices=SECTEURS_CHOICES` retiré — migration `0112` (simple `AlterField`, pas de backfill nécessaire : les anciennes valeurs A-P correspondent **exactement** au `code_source` des 16 entrées `NSEC-*`, vérifié avant de trancher). Champ reste un `CharField(max_length=100)` libre, documenté pour pointer vers `GroupeMetier.code_source`.
- Nouveau `jobs/referentiel_utils.py::secteurs_entreprise()` (liste `[{code, libelle}]`, même source que `NomenclatureAPIView`, caché 1h) et `libelle_secteur_entreprise(code)` (résolution du libellé, remplace `get_secteur_activite_display()` disparu avec `choices`).
- `secteur_activite_libelle` (SerializerMethodField, additif) ajouté à `EntreprisePublicSerializer` et `EntrepriseDashboardDetailSerializer` — jamais de champ retiré, juste enrichi.
- Export CSV admin (`jobs/views/admin.py`) : `get_secteur_activite_display()` (cassé) → `libelle_secteur_entreprise()`.
- `accounts/serializers.py::RegisterRecruteurDTO` : nouvelle `validate_secteur_activite()` — **la seule validation qui ait jamais existé sur ce champ** (avant : `CharField` brut, "IT" passait sans être une valeur réelle). **Repli tolérant si le référentiel v2 est vide** (`if codes_valides and value not in codes_valides`) — ne jamais bloquer une inscription recruteur pour une raison purement opérationnelle côté serveur (référentiel pas encore importé dans un environnement donné), même logique de tolérance que le reste du référentiel v2 dans ce projet.

**Frontend** : `RegisterRecruteur.jsx` et `ParametresRecruteur.jsx` — le `Select` "Secteur d'activité" charge désormais `jobsService.getNomenclature()` (déjà utilisé/caché ailleurs pour les pages "Offres par secteur") au lieu de `jobsService.getConstants().secteurs` (16, figé). `EntreprisePublic.jsx`, `AdminEntreprises.jsx`, `Public/Entreprises.jsx` : affichage basculé sur `secteur_activite_libelle` (repli sur le code brut si absent, pattern additif standard du projet). **Non touché volontairement** : `EntreprisePublic.jsx:462` (filtre "Spécialité" du formulaire de candidature spontanée, lié à `CandidatureSpontanee.specialite` — champ texte libre indépendant déjà documenté, sans rapport avec `ProfilEntreprise.secteur_activite`) et `useGestionOffre.js::formatText` (résolution de libellés génériques candidature, sans rapport).

**🐛 Piège récurrent (déjà documenté plusieurs fois dans ce fichier) reconfirmé** : l'ajout de `jobsService.getNomenclature()` dans `RegisterRecruteur.jsx`/`ParametresRecruteur.jsx` a cassé silencieusement 24 tests (`RegisterRecruteur.test.jsx`, `ParametresRecruteur.test.jsx`) — mocks `jobsService` incomplets. Fix : `getNomenclature: vi.fn()` ajouté aux deux mocks + fixtures `mockNomenclature`.

**Régression backend trouvée et corrigée** : 3 tests `accounts/tests/` (`test_api.py`, `test_serializers.py`, `test_views.py`) utilisaient `"secteur_activite": "IT"` — une valeur qui n'a **jamais** correspondu à un vrai secteur (ni dans l'ancien `SECTEURS_CHOICES` à 16 lettres A-P, ni dans le référentiel v2), passée sans erreur uniquement parce que l'ancien champ n'avait aucune validation réelle malgré `choices=`. La nouvelle validation l'a détecté à juste titre — fixtures corrigées vers `"G"` (Commerce, code réel `NSEC-G`).

**Tests** : frontend 430/432 ✅ (2 échecs préexistants confirmés sans rapport, `RecruteurLayout.test.jsx`/`FunnelChart.test.jsx`), `npx vite build` propre. Backend `accounts.tests` + `test_api_marche` + `test_api_paliers_gating` → 74/74 ✅ après fix des 3 fixtures. `python manage.py check` propre.

---

## 🆕 SESSION 22/09/2026 — Conformité au contrat IMPORT/DICTIONNAIRE : table SOURCES persistée + api_reference

**Contexte** : relecture explicite de LIRE_MOI/IMPORT/DICTIONNAIRE des deux classeurs référentiel v2, comparés à l'implémentation existante. Trois écarts identifiés, tous corrigés sur demande explicite de l'utilisateur ("on fixe les 3").

**1. Table `SOURCES` désormais persistée** (avant : décision assumée de ne pas l'importer, documentée session 17/09) — IMPORT étape 19 (`source_partagee`) exige qu'elle soit identique dans les deux classeurs, upsert par `source_id`, aucun doublon. Nouveau modèle `Source` (`code`, `titre`, `nature`, `organisme`, `fichier`, `url`, `edition_annee`, `consulte_le`, `sha256`, `perimetre_limite`) — migration `0111`. `import_referentiel_v2.py::_import_sources()` importe l'onglet `SOURCES` des deux classeurs avant tout le reste, upsert par `code` : **13 sources uniques réellement en base** (26 lignes lues, 13 doublons croisés — même `source_id` présent dans les deux fichiers, comme attendu). Champ `source_id` (dénormalisé, même pattern que `code_source` déjà en place, pas une FK stricte — Source peut être importée après ou avant le reste selon l'ordre des classeurs) ajouté et peuplé sur les 13 modèles du DICTIONNAIRE qui en ont un : `TypeDiplome`, `DomaineFormation`, `SpecialiteFormation`, `DiplomeSpecialite`, `AliasDiplome`, `AliasSpecialite`, `GroupeMetier`, `Metier`, `Appellation`, `CompetenceReferentiel`, `ProfilSuggestion`, `MetierCompetence`, `MetierFormation`, `RelationMetier`. `FiliereFormation` n'en a volontairement pas (absent du DICTIONNAIRE pour cet onglet).

**2. `api_reference` (IMPORT étape 11)** — le contrat recommande une réponse `{id, label, type_entite, contexte, source, statut, ambiguite}` avec pagination pour les endpoints de recherche référentiel. `MetierAutocompleteAPIView` et `RechercheUniverselleAPIView` (`jobs/views/offres.py`) exposent désormais ces 7 clés **en plus** de leurs clés historiques (`metier_id`/`metier_libelle`/`appellation_libelle` pour le premier, `type`/`libelle`/`ambigu` pour le second) — additif, aucune casse : `MetierAutocomplete.jsx` (seul consommateur frontend) et `test_recherche_universelle.py` continuent de fonctionner tels quels. `RechercheUniverselleAPIView` n'a aucun consommateur frontend à ce jour (vérifié — endpoint backend-only, R01/R02, jamais branché). Pagination `limit`/`offset` ajoutée sur les deux endpoints, défauts identiques au comportement précédent (20/0 pour l'autocomplete, 10/0 par catégorie pour la recherche universelle) pour ne rien changer en pratique tant que ces paramètres ne sont pas explicitement passés.

**3. `MIGRATION`** — déjà vérifié exhaustivement le 18/09/2026 (0 écart sur 1033 métiers + 180 spécialités + 17 catégories de niveau), aucun changement de code nécessaire, juste confirmé conforme en relisant le contrat.

**Tests** : `test_recherche_universelle` (9), `test_admin_referentiel_v2` (9), `test_matcher_referentiel_v2` (9) → 27/27 ✅. `test_jobs_models`, `test_referentiel_v2_simulations`, `test_import_referentiel_v2_idempotence` → exit 0. `python manage.py check` propre. Import réel relancé après migration : tous les compteurs identiques à la session précédente hors `Source` (nouveau).

**Suite (même session) — point IMPORT "tester en staging avant mise en prod"** : signalé comme non conforme (pas une confirmation cette fois) — le projet n'a que deux environnements documentés (dev local, prod jamais déployée), aucun staging. L'utilisateur a confirmé n'avoir **pas encore de serveur** — impossible de monter un vrai staging distant pour l'instant. Adaptation retenue : nouvelle commande `jobs/management/commands/verifier_referentiel_v2.py` — relance l'import en `--dry-run`, compare chaque compteur obtenu à la dernière valeur vérifiée manuellement (`COMPTEURS_ATTENDUS`, 22 entrées), **exit code non nul si divergence** (pensée pour un futur hook CI/CD une fois un serveur disponible, sans rien à changer côté commande). `CompetenceReferentiel (v2, créées/rattachées)` comparé par **somme** (=340) plutôt que par compteur individuel — cette répartition dépend de l'état de la table avant l'import (une compétence déjà créée manuellement dans l'admin avec le même libellé est "rattachée" pas "créée"), donc pas purement dérivée du classeur, un compteur exact aurait produit un faux échec selon l'environnement. Testé dans les deux sens : run propre → exit 0 ("22 compteurs... correspondent exactement") ; run avec une valeur volontairement faussée (`Metier: 9999`) → exit 1, divergence rapportée avec attendu/obtenu, valeur restaurée après coup. **Joue le rôle de "staging + comparaison de compteurs" en attendant un vrai serveur** — mais ne remplace pas un vrai environnement de recette (pas d'exécution des cas RECETTE/SIMULATIONS dedans, ceux-là restent dans la suite Django `test_referentiel_v2_simulations.py` à lancer séparément avant tout merge).

---

## 🆕 SESSION 21/09/2026 (suite) — Vérification pas à pas du fichier Diplômes/Spécialités + comblement des écarts FORMULAIRE

**Contexte** : suite directe de la vérification S01-S14 ci-dessous — l'utilisateur a demandé un passage en revue onglet par onglet du classeur `TAFTECH_Diplomes_Specialites_Algerie_v2.xlsx` (TYPES_DIPLOMES/DOMAINES/FILIERES/SPECIALITES, DIPLOME_SPECIALITE, ALIAS_DIPLOMES/ALIAS_SPECIALITES, FORMULAIRE, REGLES_FORMATION), en comparant systématiquement le contenu réel du fichier Excel (lu directement via `openpyxl`, pas seulement le code d'import) aux modèles Django et à l'import déjà en place.

**Onglets de nomenclature (TYPES_DIPLOMES/DOMAINES/FILIERES/SPECIALITES) et liens (DIPLOME_SPECIALITE, ALIAS_DIPLOMES, ALIAS_SPECIALITES)** : tous vérifiés **conformes**, aucun écart — comptages exacts en base (TypeDiplome=37, DomaineFormation=58, FiliereFormation=64, SpecialiteFormation=967, DiplomeSpecialite=851 + 70 doublons documentés par le client, AliasDiplome=101, AliasSpecialite=1207), zéro clé étrangère orpheline, zéro `alias_id` dupliqué. `import_referentiel_v2.py` dédoublonne correctement les couples diplôme+spécialité par `(diplome.pk, specialite.pk)` en conservant le premier `lien_id` rencontré.

**FORMULAIRE (candidat_formation) — 6 écarts réels trouvés entre les champs attendus et `FormationCandidat`, tous corrigés** (migration `0109`, sur confirmation explicite de l'utilisateur — "on fait tout") :
- `pays_formation` (CharField 2, défaut `'DZ'`) — absent avant, aucune notion de pays de la formation.
- `statut_validation` (choix `DECLARE`/`DOCUMENT_VERIFIE`/`A_PRECISER`, défaut `DECLARE`) — absent avant ; "un diplôme déclaré n'est pas automatiquement authentifié" (FORMULAIRE). **Non exposé au formulaire candidat** — décision : ce champ relève d'une future vérification par un tiers (recruteur/admin), pas d'une auto-déclaration, le candidat ne peut pas se l'attribuer lui-même.
- `document_reference` (CharField libre) — référence privée vers un justificatif, jamais rendue publique.
- `est_principale` (BooleanField) — préférence d'affichage, le matching continue d'examiner toutes les formations quel que soit ce choix.
- `version_referentiel` (défaut `'TAFTECH-2026.09.11-v2'`, constante `FormationCandidat.VERSION_REFERENTIEL_DEFAUT`) — traçabilité de la version du référentiel utilisée à la saisie.
- `date_fin_prevue` (nouveau champ, distinct de `date_fin`) — le FORMULAIRE distingue explicitement `annee_obtention` (statut OBTENU) et `annee_fin_prevue` (statut EN_COURS), jusqu'ici conflatés dans un seul `date_fin` ambigu. Le formulaire candidat (`Modals.jsx`) bascule désormais le libellé et le champ édité ("Fin (obtention)" vs "Fin prévue") selon `newForm.statut`.

**2 gaps annexes comblés dans la même passe** (mentionnés dans FORMULAIRE via `experience.*`/`competence_candidat.*`, cross-référencent le fichier Métiers) :
- `ExperienceCandidat.appellation` (FK `Appellation`, nullable) — conserve l'intitulé précis de poste au sein d'une fiche `Metier` large (`experience.appellation_id`), en complément de `metier` déjà existant.
- `CompetenceCandidat.competence_ref` (FK `CompetenceReferentiel`, nullable) — résolution automatique par `label__iexact` à chaque écriture (les deux points d'entrée : `_synchroniser_competences_depuis_texte` côté profil, `CompetenceCandidatAPIView.post` côté "Mes compétences"), jamais imposée à la saisie. Backfill ponctuel des lignes existantes déjà rattachables (4/4 résolues sur la base de dev).

**Serializers mis à jour** : `FormationSerializer` (+ `date_fin_prevue`, `pays_formation`, `statut_validation`, `document_reference`, `est_principale`, `version_referentiel`), `ExperienceSerializer` (+ `appellation`, `appellation_libelle`), `CompetenceCandidatSerializer` (+ `competence_ref`) — `normalizeForm()` (`useProfilCandidat.js`) étendu pour convertir `date_fin_prevue` vide en `null` (même piège que `diplome_ref`/`specialite_ref`, un `DateField` nullable rejette une chaîne vide en PATCH/PUT DRF).

**Frontend** (`Modals.jsx`, formulaire "Ajouter/Modifier une formation") : bloc Fin/Fin prévue conditionné par le statut, 2 nouveaux champs (Pays de la formation, Référence justificatif) et une case à cocher "Formation principale" ajoutés sous le bloc référentiel v2 existant. Les 3 points de réinitialisation du formulaire (`setNewForm({...})` à la fermeture/annulation) n'ont volontairement pas été étendus avec les nouveaux champs — ils étaient déjà partiels avant cette session (ne réinitialisaient pas `diplome_ref`/`specialite_ref`/`statut` non plus), pas une régression introduite ici.

**Tests** : `python manage.py check` propre, `npx vite build` propre, suite ciblée (`test_jobs_models`, `test_serializers_profils`, `test_matcher`, `test_matcher_referentiel_v2`) **20/20 ✅**. Suite backend complète confirmée après coup (le 1er lancement avait été mal interprété — `... | tail -30` masque le vrai code de sortie de `manage.py test`, ne jamais piper vers `tail` sans capturer le code de sortie réel) : relancée sans pipe (`> fichier.log 2>&1 ; echo EXIT_CODE=$?`) → **`Ran 517 tests in 844.5s` → OK, EXIT_CODE=0**. Durée réelle ~14 min — donc l'attente initiale n'était pas anormale, juste plus longue que d'habitude (probablement l'ajout d'index/FK sur `FormationCandidat`/`ExperienceCandidat`/`CompetenceCandidat`, tables déjà volumineuses après l'import référentiel v2).

**Suite immédiate — onglet MIGRATION (fichier Diplômes)** : 201 lignes, 3 types (`specialite` 180, `niveau_v1_vers_diplome` 17, `niveau_v1_vers_niveau_etudes` 4). Les 180 lignes `specialite` sont **déjà entièrement absorbées** — vérifié sur échantillons : les 141 `conserver` (ancien code `DOM-XX-SP-XX` gardé tel quel) correspondent exactement aux 141 `SpecialiteFormation` en base avec `code` `DOM-*`/`nature='theme_formation'` (les "141 thèmes éditoriaux v1" de F09) ; les 39 `rediriger` ne laissent aucune trace de l'ancien code en base (remplacé proprement par le nouveau `SP-<hash>`), zéro doublon. Rien à corriger sur cette partie — le fichier `SPECIALITES` qu'on a déjà importé reflète l'état post-migration du client.

Les 21 lignes `niveau_v1_vers_diplome`/`niveau_v1_vers_niveau_etudes` mappent les codes internes **du client** (`N00`…`N99`) — jamais stockés dans notre base (nos valeurs sont `DIPLOMES_CHOICES` : `MASTER_2`/`TS`/`LICENCE`...). Même situation que la table MIGRATION métiers du 18/09 : documente la migration interne du client, aucune correspondance automatique par égalité de code.

**Résolveur `DIPLOMES_CHOICES` → référentiel v2 construit** (sur confirmation explicite utilisateur), en reproduisant le même principe d'abstention F02/F06 sur nos propres codes plutôt qu'en réutilisant les codes N-* du client :
- Nouveau `jobs/referentiel_utils.py::RESOLUTION_DIPLOME_LEGACY` + `resoudre_diplome_legacy(code)` — 7 résolutions sûres (`BACCALAUREAT`→`D-BAC`, `LICENCE`→`D-LIC-NP`, `MAGISTERE`→`D-MAG`, `DOCTORAT`→`D-DOC-NP`, `CERTIFICATION`→`D-CERT` approximation assumée, `NIVEAU_SECONDAIRE`→`Scolarite.SC-SEC`, `UNIVERSITAIRE_SANS_DIPLOME`→`Scolarite.SC-SUP`), 6 abstentions volontaires documentées (`NIVEAU_TERMINAL` — Terminale ≠ Bac obtenu ; `TS` — BTS/DEUA mélangés, F12 explicite ; `MASTER_1` — année intermédiaire, pas un Master complet ; `MASTER_2` — regroupe Master ET Ingéniorat, cas N15 ; `FORMATION_PRO` — 8 `TypeDiplome` possibles ; `NON_DIPLOMANTE` — n'est pas un diplôme).
- Nouveaux champs `diplome_ref`/`niveau_scolaire_ref` (FK nullables, mutuellement exclusifs) sur `ProfilCandidat` **et** `OffreEmploi` (migration `0110`) — résolus automatiquement à chaque `save()` (override ajouté sur les deux modèles) depuis le champ texte `diplome` existant, jamais l'inverse (`diplome` reste la source de vérité, jamais réécrit). Exposés en lecture (`diplome_ref_libelle`/`niveau_scolaire_ref_libelle`) dans `ProfilCandidatDTO` et `OffreEmploiSerializer`.
- **Vérifié sur les données réelles** : les 6 candidats/8 offres de la base de dev n'ont que des valeurs dans la liste d'abstention (`MASTER_1`/`MASTER_2`/`TS`) → 0 résolution, comportement attendu et correct (pas un bug).
- **Important, déjà noté avant construction** : `matcher.py` ne lit plus du tout `profil.diplome`/`offre.diplome` depuis la réécriture S01-S14 (repli hiérarchique retiré) — ces nouveaux champs FK sont **informatifs uniquement** (affichage, filtre futur), aucun effet sur le score de matching actuel.

**Prochaine étape (non traitée cette session)** : reprendre la vérification pas à pas sur les autres onglets (RECETTE/SIMULATIONS déjà couverts en tests le 18/09 ; AUDIT/COUVERTURE/DICTIONNAIRE/IMPORT restent à comparer explicitement au code si redemandé).

---

## 🆕 SESSION 21/09/2026 — Mise en conformité matching avec REGLES_MATCHING/PARAM_MATCHING (S01-S14)

**Contexte** : l'utilisateur a demandé une vérification "abondante, sûre et efficace" de la branche `feature/referentiel-v2` contre le message client, en s'appuyant sur les onglets `REGLES_MATCHING`, `PARAM_MATCHING`, `REGLES_FORMATION` des deux classeurs (jamais lus en détail lors des sessions précédentes — seules `RECETTE`/`SIMULATIONS` avaient été traduites en tests le 18/09). Plan écrit (`docs/superpowers/plans/2026-09-21-matching-referentiel-v2-conformite.md`) puis exécuté en inline, avec confirmation explicite de l'utilisateur à chaque décision structurante (règle CLAUDE.md déjà en place).

**Écart le plus important trouvé, corrigé sur confirmation utilisateur — le sens de "spécialité"** : `PARAM_MATCHING` décrit `poids_specialite=0.25` comme "couplée au diplôme sur le même enregistrement candidat" et S06/S07 parlent explicitement de `specialite_id`/`diplome_id` appariés sur une même formation → c'est la **spécialité de formation** (`SpecialiteFormation`, fichier Diplômes), pas le métier/poste. La session du 17/09 avait réutilisé ce slot de 25% pour comparer `Metier` (métier/poste) — décision revue : `Metier` reste utilisé uniquement pour juger la pertinence d'une expérience (`_experience_pertinente`, S09 "pertinence basée sur métier précis") et pour la recherche de candidats, plus comme critère noté séparément dans le score.

**Formule à poids actifs (S01/S02/S03)** — le score n'est plus une somme fixe sur 100 points (20/20/25/20/15 toujours répartis) : chaque critère non demandé par l'offre (aucun `OffreDiplomeAccepte`, aucune `CompetenceOffre`, ou `experience_requise` avec minimum=0) est **exclu du dénominateur `W`** et le score est renormalisé sur les critères réellement actifs (`jobs/matcher.py::_composer_score`). Nouveau champ `criteres_non_demandes` dans le résultat, distinct de `criteres_manquants` (donnée candidate absente, critère pourtant actif).

**Détail des changements dans `jobs/matcher.py`** :
- Nouveau `jobs/matching_params.py` — poids lus depuis `ParametreMatching` (déjà importé en base depuis le 17/09, jamais branché malgré son propre docstring), repli sur 20/20/25/20/15 si la table est vide, caché 1h.
- `_score_region()` : **binaire strict** (S04) — 1 si même wilaya ou mobilité compatible, 0 sinon. La granularité commune/wilaya/région voisine de l'ancienne version (20/15/12/5 pts) est **retirée du score**, conservée uniquement dans le texte d'explication affiché au recruteur/candidat (décision utilisateur explicite — perte de nuance assumée pour suivre S04 à la lettre).
- `_score_diplome_specialite()` : diplôme (poids 0.20) et spécialité-formation (poids 0.25) deviennent **deux critères indépendants**, calculés `wd×sd(f) + ws×ss(f)` sur la formation qui maximise ce total (S07) — jamais en combinant le diplôme d'une `FormationCandidat` avec la spécialité d'une autre (T10, testé explicitement : master-finance + licence-informatique ne fabrique jamais un "master informatique"). Remplace l'ancien bucket combiné (couple exact=20/20, diplôme seul=12/20).
- **Repli hiérarchique retiré** (`hierarchie = {'TS':7,'LICENCE':8,...}`) : F06/S05 interdisent toute équivalence de rang implicite entre diplômes ("ne jamais convertir BTS en DEUA, master en magister"). Une offre sans `OffreDiplomeAccepte` a désormais son critère diplôme/spécialité **non demandé** (exclu du calcul), jamais un repli sur un rang de diplôme deviné.
- `_score_experience()` : formule **continue** `min(mois_pertinents/mois_minimum, 1)` (S09), remplace les paliers discrets (20/12/6/0) — permet enfin de vérifier le cas SIMULATIONS EX-05 (mi-expérience) au score EXACT (90) au lieu d'une vérification seulement directionnelle comme documenté depuis le 18/09. `experience_requise` avec minimum=0 (DEBUTANT/STAGIAIRE) → critère **désactivé** (S09 : "minimum=0 → critère désactivé"), plus de crédit automatique 8-20 pts pour un "poste junior".
- `_score_competences()` : critère désactivé si l'offre n'a **aucune** `CompetenceOffre` sélectionnée (S10 : "sélection offre obligatoire") — le repli texte libre (`competences_score()`, comparaison contre `profil_recherche`/`description`/`missions`) sort du calcul du score total ; cette fonction reste disponible ailleurs (recherche) mais n'est plus jamais mêlée au score de matching.
- Nouveau champs de traçabilité (S14) dans le résultat : `algorithme_version` (`"matching-20-20-25-20-15-v2"`) et `formation_id_retenue` (la `FormationCandidat` choisie par S07, ou `None`).

**Callers adaptés** : `total` peut désormais valoir `None` (S01, `W=0` — cas en pratique inatteignable aujourd'hui puisque la région est toujours un critère actif, aucune notion de télétravail dans le modèle). `CVThequeView` (tri par score) et `PostulerAPIView` (score figé à la candidature) traitent `None` comme `0`, jamais un crash.

**Recherche CVthèque** (`jobs/views/recruteur.py::CVThequeView`) : le paramètre `search` passe désormais par `normaliser_recherche()` (N01-N04, déjà écrit pour l'autocomplete métier mais jamais branché sur la recherche libre de candidats) — sans cette normalisation, taper "developpeur" ne trouvait aucun candidat dont le profil contient "Développeur" (accentué). Nouveau paramètre `specialite_formation` (filtre par `SpecialiteFormation.id`, distinct de `specialite` qui filtre par `Metier.id` — les deux référentiels partageaient jusqu'ici un nom de paramètre ambigu).

**Frontend** : le libellé "Métier" (renommé depuis "Spécialité" le 18/09, sur la base d'une interprétation qui s'est révélée incorrecte) revient à **"Spécialité"** dans les 5 fichiers qui affichent le détail du score (`MatchingRadarChart.jsx`, `MesCandidatures.jsx`, `DashboardRecruteur.jsx`, `DetailCandidature.jsx` ×3, `Modals.jsx`) — la clé `specialite`/`max:25` ne change pas, seul le texte affiché.

**Correction de dette documentaire (trouvée en reprenant la vérification onglet par onglet)** : **N04 (flou orthographique Levenshtein≤1) est en réalité déjà implémenté** — `jobs/referentiel_utils.py::corriger_mots_flous()` (exact d'abord, Levenshtein≤1 uniquement sur jetons ≥5 lettres, exclusions correctes des sigles/`C`/`C++`/`C#`), branché sur `MetierAutocompleteAPIView`, testé (`test_recherche_normalisation.py`, 15/15 ✅). Les 3 mentions "N04 non implémenté" plus bas dans ce fichier (sessions 18/09 et 21/09) étaient fausses — cette fonction existe déjà dans l'arbre de travail (non committée, comme le reste de cette branche) au moment de la vérification du 21/09 ; ne pas la reconstruire.

**Suite de session — R01/R02/R05/R06/R07 construits** (recherche candidats/référentiel, plus seulement CVthèque texte libre) :
- **R05** (marquer le champ ayant motivé le résultat) + **R07** (ordre du rappel : exact > jetons dispersés > filet permissif) : `CVThequeView.get()` calcule désormais une priorité par candidat (`_prio_recherche`, tri SQL via `Case/When`) et expose `champ_correspondant` (`titre`/`metier_souhaite`/`competence`/`experience`/`profil`) sur chaque résultat.
- **R01/R02** : nouvel endpoint `GET jobs/referentiel/recherche-universelle/?q=` (`RechercheUniverselleAPIView`) — résout une requête libre indépendamment contre les 4 référentiels (métiers/appellations, compétences, diplômes, spécialités de formation), retourne le type de chaque résultat + `contexte` (groupe/domaine/système) et `ambigu` (repris du flag `ambiguite` des tables alias diplôme/spécialité, jamais un choix arbitraire).
- **R06** (requête composée, "data analyst Alger"/"BTS informatique") : localisation extraite séparément (comparée à `WILAYAS_LIST`) avant résolution des autres entités ; un couple diplôme+spécialité n'est confirmé que s'il existe réellement dans `DiplomeSpecialite` (jamais un diplôme d'un résultat combiné avec la spécialité d'un autre, T23).
- **Bug historique réel trouvé et corrigé en construisant R06** : `MetierAutocompleteAPIView` (et le nouvel endpoint) utilisaient un `icontains` par mot — ne respecte pas les limites de mot (N02), un mot "c" matchait à tort "cpp" en sous-chaîne. Nouveau helper partagé `jobs/referentiel_utils.py::q_mots_cle_recherche(mots, mode='and'|'or')` (regex `\b`), corrigé aux deux endroits. `mode='or'` nécessaire pour les requêtes composées (chaque moitié de la requête ne doit pas être exigée dans TOUS les référentiels).
- Tests : `test_recherche_universelle.py` (9), `test_recherche_normalisation.py` +2 (dont le test verrou du bug C/cpp), `test_api_cvtheque_recherche_normalisee.py` +2 (R05/R07) — tous verts.

**S12 construit** (exigences impératives à 3 états — permis, certifications, droits d'exercice, distinctes du diplôme, jamais notées dans le score) :
- Nouveaux modèles `ExigenceImperative` (offre FK, label/description/`justificatif_requis`) et `ReponseExigence` (candidature FK, exigence FK, statut SATISFAIT/NON_SATISFAIT/INCONNU par défaut, justificatif `FileField` optionnel via `validate_document_or_image_mime` — nouveau validateur combiné, un justificatif scanné est souvent une image, pas seulement un PDF).
- `_synchroniser_exigences_offre()` (même pattern remplacement intégral que compétences/couples diplôme+spécialité), câblé sur `JobCreateAPIView`/`UpdateOffreRecruteurAPIView` via le payload `exigences_imperatives`.
- `PostulerAPIView` : le candidat déclare un statut par exigence (`reponses_exigences`, JSON) + justificatif optionnel (`justificatif_exigence_<id>`, multipart) ; toute exigence de l'offre sans réponse reste tracée `INCONNU` (jamais silencieusement absente). Un statut `INCONNU`, y compris l'absence totale de réponse, **ne bloque jamais** la création de la candidature (201) — conforme à S12 "inconnu provoque une vérification, pas un rejet automatique".
- Nouvel endpoint `PATCH jobs/candidatures/<id>/exigences/<exigence_id>/` (`MettreAJourReponseExigenceAPIView`) — le recruteur vérifie manuellement une exigence `INCONNU` (ou corrige), même permissions que les autres actions candidature (`get_entreprise_for_user`/`get_membre_role`, INVITE bloqué).
- Frontend : builder recruteur dans `CreateJob.jsx` (label + précision + case "justificatif requis"), déclaration candidat dans `ReviewCandidature.jsx` (3 boutons par exigence + upload conditionnel si justificatif requis et statut Satisfait), affichage + vérification manuelle dans `DetailCandidature.jsx` (badges couleur, boutons ✓/✕ visibles uniquement sur les exigences `INCONNU`, `authService.peutFaire("UTILISATEUR")`).
- Tests : `test_exigences_imperatives.py` (11/11 — modèle, synchronisation offre, candidature avec/sans réponses, exigence étrangère à l'offre ignorée, vérification manuelle + permissions).

**MIGRATION vérifiée** (compatibilité anciens identifiants, R04) : comparaison exhaustive des 44 redirections de l'onglet `MIGRATION` (fichier Métiers) contre `Metier.metier_canonique` en base — **0 écart**, et aucun métier hors de cette liste ne redirige à tort. Aucun enregistrement actuel (offre/profil/expérience) ne référence un ancien code redirigé (0/0/0/0), donc aucun bug visible aujourd'hui — mais **un vrai trou latent trouvé et corrigé** : `JobListAPIView`/`CVThequeView` filtraient par métier via une égalité stricte (`metier_id=X`), sans jamais élargir aux anciens codes redirigés vers `X` (ni inversement) — un futur réimport ajoutant une redirection sur un métier déjà utilisé aurait fait disparaître silencieusement des résultats de recherche. Nouveau helper partagé `jobs/referentiel_utils.py::ids_metier_avec_redirections()`, câblé sur les deux vues. Tests : `test_migration_redirections_recherche.py` (6/6), non-régression offres/CVthèque (37/37).

**Toujours hors périmètre (pas fait, à traiter si redemandé)** :
- **S04 télétravail intégral** — aucun champ télétravail sur `OffreEmploi` ; la région reste donc toujours un critère actif en pratique.
- **N04 tolérance de faute** dans `RechercheUniverselleAPIView` pour les compétences (comparaison Python simple sur label/synonymes, pas de flou Levenshtein comme pour métiers/diplômes/spécialités).

**Tests** : nouveaux fichiers `test_matching_params.py`, `test_matcher_poids_actifs.py`, `test_matcher_region_binaire.py`, `test_matcher_diplome_specialite_s07.py`, `test_matcher_experience_s09.py`, `test_matcher_competences_s10.py`, `test_matcher_total_none.py`, `test_api_cvtheque_recherche_normalisee.py`. `test_matcher.py`/`test_matcher_referentiel_v2.py`/`test_referentiel_v2_simulations.py` mis à jour pour la nouvelle sémantique (les 3 tests "métier=spécialité" de `test_matcher_referentiel_v2.py` retirés/fusionnés, `test_candidat_parfait_score_maximal`/`test_candidat_diplome_inferieur` de `test_matcher.py` adaptés au comportement "critère non demandé"). Suite matcher ciblée 52/52 ✅, suite backend complète relancée.

---

_Dernière mise à jour : 18/09/2026 (suite) — **Référentiel v2 : vérification exhaustive Phases 3-5 (RECETTE/SIMULATIONS) + corrections**. Suite directe du cutover complet ci-dessous. L'utilisateur a demandé une vérification point par point des Phases 3/4/5 contre les specs client (règles N01-N04 de recherche, poids de matching 20/20/25/20/15, indicateur de complétude, les 24 cas RECETTE + 6 cas SIMULATIONS du classeur Métiers/Matching), avec correction réelle de tout écart trouvé plutôt qu'un simple rapport.

**Bugs matcher.py corrigés** (`jobs/matcher.py`) :
- **T15** — diplôme candidat inconnu du référentiel détaillé alors que l'offre exige un couple précis : contribution forcée à `0.0` (donnée manquante), un `6.0` de crédit de consolation existant auparavant contredisait directement ce cas de recette client.
- **T22** — `TypeDiplome` "D-AUTRE" (diplôme saisi en texte libre, hors référentiel) traité comme une **donnée manquante**, jamais une incompatibilité franche — filtré via `formations_precises` avant le calcul.
- **T12** — candidat n'ayant déclaré AUCUNE compétence (ni texte libre ni `CompetenceCandidat`) sur une offre avec compétences requises : passe en donnée manquante (score neutre 5.0 + `criteres_manquants`) au lieu d'un 0 franc — distinct du cas "compétence différente déclarée" qui reste une vraie incompatibilité à 0.

**Gaps de tests comblés** (les 4 gaps que l'utilisateur a demandé de tous corriger — T13/T16/T17/T22) :
- **T13** (chevauchement de périodes d'expérience) — nouveau test vérifiant `_deduire_annees_sans_chevauchement` fusionne bien deux périodes chevauchantes au lieu de les sommer naïvement.
- **T16** (réimport idempotent) — nouveau `test_import_referentiel_v2_idempotence.py` : lance `import_referentiel_v2` deux fois sur les vrais fichiers Excel client, vérifie zéro doublon créé au 2ᵉ passage.
- **T17** (FK introuvable dans `METIER_FORMATIONS`) — **vrai changement de code** dans `import_referentiel_v2.py` : une ligne référençant un `metier_id`/`specialite_id` introuvable lève désormais `CommandError` citant le numéro de ligne exact, rejetant **tout le lot** (transaction atomique) au lieu d'ignorer silencieusement la ligne fautive. Nouveau test dédié avec un classeur Excel synthétique minimal.
- **T22** — voir fix matcher.py ci-dessus + test dédié.
- Compte rendu complet transmis à l'utilisateur : sur les 30 cas RECETTE+SIMULATIONS, statut exhaustif ✅/➖(hors périmètre code — règles de saisie admin)/⚠️ avant correction, 100% ✅ ou ➖ justifié après.

**Aides UI/vocabulaire corrigées** (incohérences trouvées en vérifiant l'affichage face aux nouveaux poids/critères) :
- "Spécialité" (label du critère de matching, qui compare en réalité des `Metier`) renommé **"Métier"** dans 5 fichiers (`MatchingRadarChart.jsx`, `MesCandidatures.jsx`, `DashboardRecruteur.jsx`, `DetailCandidature.jsx` ×2, `Modals.jsx`) — évite la confusion avec `SpecialiteFormation` (référentiel diplômes v2, concept différent).
- "Région" vs "Localisation & mobilité" — libellé incohérent au sein de `DetailCandidature.jsx`, unifié.

**Phase 5 (frontend) vérifiée — 1 vrai bug trouvé et corrigé** : `CandidaturesSpontanees.jsx` avait un filtre "Spécialité" mort (contrôle UI supprimé lors du cutover mais logique de filtrage encore présente, ou l'inverse) — restauré un vrai champ de filtre texte libre (`icontains` sur `c.specialite`), 4ᵉ colonne de la grille de filtres existante. Testé (`CandidaturesSpontanees.test.jsx` 9/9 ✅).

**Formulaire de modification d'offre complété** (`OffresListPage.jsx`) — l'utilisateur a demandé d'ajouter les 2 builders manquants (déjà présents uniquement dans `CreateJob.jsx`, création) :
- Builder **compétences structurées** (chips, autocomplete `searchCompetences`, type Obligatoire/Souhaitée + niveau, suggestions depuis `getMetierSuggestions` selon le métier choisi) — payload `competences_requises`.
- Builder **diplômes/spécialités acceptés** (`FormationReferentielSelect` avec `permettreAutre={false}` — un couple accepté doit toujours pointer un vrai `DiplomeSpecialite`, jamais une saisie libre — + chips + suggestions) — payload `diplomes_acceptes` (liste d'IDs `DiplomeSpecialite`).
- **Point de correction critique repéré avant implémentation** : `OffreDiplomeAccepteSerializer` renvoie `id` (PK de la ligne `OffreDiplomeAccepte`) ET `couple` (PK du vrai `DiplomeSpecialite`) — `_synchroniser_diplomes_acceptes_offre()` attend des PK `DiplomeSpecialite`. Réutiliser `d.id` au lieu de `d.couple` en pré-remplissant le formulaire de modification aurait **supprimé silencieusement tous les couples déjà acceptés** au premier enregistrement (aucun ID ne correspondrait à un vrai `DiplomeSpecialite`). Corrigé dès l'écriture (`d.couple` utilisé dans `handleOuvrirModification`).
- Champ texte libre "Compétences" relabellisé *"Compétences (texte libre affiché sur l'annonce)"* pour ne pas le confondre avec le nouveau builder structuré juste au-dessus.
- Tests : mocks `getNomenclatureFormation`/`getMetierSuggestions`/`searchCompetences` ajoutés à `OffresListPage.test.jsx` (piège récurrent déjà documenté dans ce fichier — un nouvel appel `jobsService.*` sur un composant déjà testé casse silencieusement le test sans mock), 4/4 ✅.

**Tests** : backend ciblé (matcher, référentiel v2 simulations/recette, compétences offre, import idempotence, import rejet FK) 44/44 ✅, frontend complet 430/432 ✅ (2 échecs préexistants `RecruteurLayout.test.jsx`/`FunnelChart.test.jsx` confirmés sans rapport), `npx vite build` propre. Suite backend complète relancée en tâche de fond pour confirmation finale. Rien n'est committé (toujours sur `feature/referentiel-v2`, en attente de validation utilisateur).

---

_Mise à jour précédente : 18/09/2026 — **Référentiel v2 : cutover complet et vérifié**. Suite directe de la session du 17/09 — l'ancien référentiel ANEM (`Secteur`/`Domaine`/`SousDomaine`/`MetierReferentiel`, champs texte `specialite`/`secteur_souhaite`/`secteur`) a été **entièrement retiré du code** (modèles, migrations, vues, serializers, frontend), remplacé partout par `Metier`/`GroupeMetier`/`Appellation` (FK `metier` sur `OffreEmploi`/`ProfilCandidat`/`ExperienceCandidat`, `metier_souhaite` sur `ProfilCandidat`). Décision actée avec l'utilisateur : "je veux tout" — cutover complet plutôt qu'une coexistence temporaire, sur la base du message client original (le référentiel v2 absorbe déjà l'ancien NAME.xlsx). Voir section dédiée ci-dessous pour le détail des ~10 zones fonctionnelles migrées et les tests corrigés. **Suites de tests intégralement vertes après le cutover** : backend 436/436 ✅, frontend 430/432 ✅ (2 échecs préexistants confirmés sans rapport), `npx vite build`/`npm run build` propres. Rien n'est encore committé (travail sur `feature/referentiel-v2`, en attente de validation utilisateur avant commit).

_Mise à jour précédente : 06/09/2026 (suite 2) — Reprise des retours client un par un : cohérence des textes d'abonnement (offres "illimitées"/"gratuites" corrigées face aux vrais plafonds Gratuit=1/Starter=5/Pro=15/Business+=illimité), suppression de la mention "Validé ANPDP" (non obtenue officiellement) remplacée par "Conforme à la loi 18-07" partout, et premier geste sur la délivrabilité email (`DEFAULT_FROM_EMAIL` avec nom d'expéditeur — le vrai fix, hors domaine/DNS, reste en checklist déploiement). Voir section ci-dessous. Session précédente le même jour : bug réel trouvé et corrigé — le bouton "Générer l'offre avec l'IA" (`CreateJob.jsx`) ne fonctionnait JAMAIS au clic manuel (`onClick={handleGenererIA}` passait l'événement React au lieu du titre) — préexistant, découvert en creusant un "Service IA indisponible" systématique signalé par l'utilisateur. Compétences générées par l'IA désormais piochées exclusivement dans le référentiel `CompetenceReferentiel` (jamais inventées) et fusionnées automatiquement avec les étiquettes structurées de l'offre. Session précédente le même jour : wording crédits CVthèque ("à vie" retiré), accroche landing recruteur, blocage accès CVthèque/déblocage/abonnement pour entreprise non validée (`ENTREPRISE_NON_VALIDEE`), et nouveau système de compétences structurées sur les offres (`CompetenceOffre`) pour un matching fiable. Session précédente 03/09/2026 : Throttling par endpoint sur uploads + IA (badges notifications non rafraîchis + `FileUploadThrottle`/`CVParserThrottle`/`AdminFileUploadThrottle`, plafond documents privés 1/type). Voir section ci-dessous et `SECURITY.md` §17. Session précédente le même jour : Retours revue "Samira" (relecture croisée d'un doc Word) traités capture par capture : fix score de complétion "Formation" trompeur, refonte "Mes documents" en 2 sections (CV professionnel visible via CVthèque / Documents privés jamais visibles sans autorisation), nouveau toggle candidat pour activer/désactiver le déblocage CVthèque, et nouveau système de partage ponctuel d'un document privé avec une entreprise précise. Voir section ci-dessous. Session précédente 02/09/2026 : Fix boîte de réception candidat/recruteur mélangées pour un compte ayant les deux rôles, voir section plus bas. Session précédente 29/08/2026 : Système de crédits CVthèque (remplace l'accès illimité aux coordonnées par palier Business+, voir section plus bas). Sessions précédentes du même jour : Centre de notifications recruteur (nouvelle page `/notifications` + événements candidature spontanée/nouvelle candidature/candidat recommandé) avec suppression individuelle (candidat + recruteur), suppression d'évaluation d'entretien (détail candidature + liste Évaluations), masquage des candidatures d'offres clôturées dans la page Candidatures, et fix lien "Espace recruteur" (ouvrait un nouvel onglet). Voir sections ci-dessous._

## 🆕 SESSION 18/09/2026 — Référentiel v2 : cutover complet (suppression de l'ancien système ANEM)

**Contexte** : suite directe de la session 17/09 (Phases 1-5 + panel admin). L'utilisateur a explicitement demandé un cutover total plutôt qu'une coexistence temporaire — question posée en fin de session précédente ("est-ce qu'on supprime l'ancien ou on le garde ?"), tranchée en relisant le message client original (pas notre propre conversation) : le référentiel v2 du client absorbe déjà entièrement l'ancien `NAME.xlsx`, et son vocabulaire "préserver/conserver" concerne les données candidats déjà saisies, pas nos modèles Django internes. Confirmation utilisateur : "je veux tout".

**Ampleur du cutover — ~10 zones fonctionnelles migrées de `Secteur`/`Domaine`/`SousDomaine`/`MetierReferentiel` (+ champs texte `specialite`/`secteur_souhaite`/`secteur`) vers `Metier`/`GroupeMetier`/`Appellation`** :
- **Modèles** (`jobs/models.py`, migration `0107_supprime_referentiel_anem_legacy`) : suppression des 4 classes ANEM ; retrait de `OffreEmploi.specialite`, `ProfilCandidat.specialite`/`secteur_souhaite`, `ExperienceCandidat.secteur` ; nouveau `ProfilCandidat.metier_souhaite` (FK `Metier`, en plus du `metier` déjà posé en Phase 2). `CandidatureSpontanee.specialite` (CharField indépendant, sans FK) **volontairement conservé** — hors périmètre, ne fait pas partie du référentiel structuré.
- **Matching** (`jobs/matcher.py`) : la branche legacy de comparaison texte (`specialites_compatibles()` sur l'ancien code Domaine) est **retirée** — la comparaison spécialité passe désormais exclusivement par `metiers_compatibles()` (Metier exact 1.0 / même `groupe_principal` 0.85 / fuzzy en filet). Idem `_experience_pertinente()` : compare `exp.metier` vs `offre.metier`, plus de "filet de sécurité" par mots-clés texte.
- **`jobs/metiers_matching.py`** (métiers accessibles candidat) : réécrit entièrement pour `Metier`/`GroupeMetier` — réponse `{metier_id, libelle, groupe_libelle, score}` au lieu de `{domaine_code, libelle, secteur_code, score}`. **Important** : `metiers_compatibles()` n'a pas de bonus "même secteur parent" (contrairement à l'ancienne comparaison par préfixe de code Domaine) — un métier hors du `groupe_principal` exact du candidat obtient un score de 0, pas un score dégradé.
- **`jobs/domaine_agent.py`** (agent Groq RAG de classification d'expérience) : `classifier_domaines_experiences` → `classifier_metiers_experiences`, cherche désormais sur `Appellation.cle_recherche` (7428 entrées) et ne fait choisir l'IA qu'**parmi des appellations réelles montrées** (jamais un code deviné dans une liste trop grande pour être injectée en entier) — voir explication RAG donnée à l'utilisateur en cours de session.
- **`jobs/referentiel_utils.py`** : `resoudre_domaine_depuis_texte()` → `resoudre_metier_depuis_texte()`, retourne un objet `Metier` résolu vers son canonique.
- **`jobs/cv_parser.py`** : retrait du token `{domaines_list}` et de l'instruction d'extraction "secteur" du prompt (la classification par expérience est entièrement déléguée à l'agent dédié ci-dessus) ; suppression de `extract_specialite()` (confirmé mort, plus aucun appelant).
- **`jobs/views/ia.py`** : `ParserCVAPIView` appelle `classifier_metiers_experiences` ; `GenererOffreIAAPIView` accepte un `metier` (PK) au lieu d'une `specialite` texte ; `AnalyseCarriereGroqAPIView`/`AnalyseGroqRecruteurAPIView` lisent `profil.metier.libelle`/`offre.metier.libelle`. Suppression des vues mortes `SuggestionsCarriereAPIView` (jamais appelée par le frontend), `MetierReferentielAPIView`, `MetierReferentielAdminAPIView` (remplacées par les vues Référentiel v2 du panel admin, session 17/09 suite).
- **`jobs/views/offres.py`** : `NomenclatureAPIView` sert désormais l'arbre `GroupeMetier`/`Metier` — **piège corrigé** : `GroupeMetier.code` (identifiant interne, ex. `"NSEC-A"`, contient un tiret) a été confondu un temps avec le `code` propre attendu par le parsing de slug frontend (`slug.split("-")[0]`) ; fix en exposant `code_source` (le code d'origine sans tiret, ex. `"A"`) à la place. `JobListAPIView` gagne un nouveau paramètre `domaine_id` (filtre par `metier__groupe_principal_id`) en plus du filtre `specialite` existant (digit = metier_id exact, 1 lettre = secteur via `code_source`).
- **Serializers** (`candidatures.py`, `profils.py`, `offres.py`, `dashboard.py`, `divers.py`) : champs renommés `specialite`→`metier`, `secteur_souhaite`→`metier_souhaite` (résolus en libellé via `SerializerMethodField`) ; suppression de `MetierReferentielSerializer` (classe morte).
- **Frontend** : suppression de `SecteurDomaineSelect.jsx` et `AdminMetiers.jsx` (remplacés par le nouveau `MetierAutocomplete.jsx`, session 17/09 suite, et le panel `/admin-taftech/referentiel-v2`) ; tous les affichages `job.specialite`/`profil.secteur_souhaite`/`exp.secteur` + composant `DomaineLabel` remplacés par `metier_libelle`/`metier_souhaite_libelle` dans `CreateJob.jsx`, `CVTheque.jsx`, `CandidaturesSpontanees.jsx`, `ProfilCandidat/*`, `JobDetail.jsx`, `GestionOffre/*`, `ReviewCandidature.jsx`, `AdminOffres.jsx`, `AdminStatistiques.jsx`, `AdminUsers.jsx`, `CandidatDashboard.jsx`, `SuggestionsCarriere.jsx`, tout l'onboarding (`useOnboardingWizard.js`, `StepInfos/StepExperiences/StepPreferences.jsx`) ; `Components/DomaineLabel.jsx` laissé en place (dégrade proprement, encore utilisé par `CandidaturesSpontanees.jsx` pour le champ `CandidatureSpontanee.specialite`, seul champ texte libre restant) mais tous ses autres appelants ont été retirés.
- **`jobs/admin.py` (Django admin), `jobs/views/admin.py`, `jobs/seo_views.py`** : retrait des imports/`@admin.register` ANEM ; `AdminMarcheAPIView`/`AdminSeoStatsAPIView`/sitemap regroupent désormais par `metier_id`/`Metier`/`GroupeMetier.type_groupe='secteur_source'` au lieu de `Domaine`/`Secteur`.
- **Management commands supprimés** (import/nettoyage de l'ancien référentiel, devenus sans objet) : `import_anem_nomenclature.py`, `corriger_secteurs_referentiel.py`, `nettoyer_referentiel.py`, `realigner_secteurs.py`, `scraper_emploitic.py`.

**Nettoyage des tests cassés par le cutover (44 erreurs au départ, résolues en plusieurs passes)** :
- Fixtures de test créant encore des `OffreEmploi`/`ProfilCandidat` avec les champs texte supprimés — remplacées par de vraies instances `GroupeMetier`/`Metier` (`test_profil_snapshot.py`, `test_api_marche.py`, `test_serializers_profils.py`, `test_api_cvtheque.py`, `test_api_dashboard_refonte.py`, `test_api_invitation_cvtheque.py`, `test_api_audit_logs.py`) — `test_api_marche.py` a aussi eu ses assertions corrigées (clé `specialite`→`libelle`/`secteur` sur les nouvelles réponses `tension_par_secteur`/`top_secteurs`).
- **`test_api_metiers.py` supprimé entièrement** — testait exclusivement `/api/jobs/metiers/` et `/api/jobs/admin/metiers/`, deux endpoints qui n'existent plus (déjà couverts par `test_admin_referentiel_v2.py` pour la partie admin v2).
- **`test_metiers_accessibles.py` réécrit en entier** — modèles `Secteur`/`Domaine` → `GroupeMetier`/`Metier`, réponse `domaine_code` → `metier_id`. Assertion adaptée à un comportement réellement différent (pas juste un renommage) : l'ancienne comparaison par préfixe de code Domaine donnait un score dégradé pour "même secteur, domaine différent" ; `metiers_compatibles()` v2 n'a **aucun** bonus de ce type (seulement exact/`groupe_principal`/fuzzy), donc un métier hors groupe obtient 0, pas un score intermédiaire — test corrigé pour refléter ce comportement réel plutôt que forcé pour matcher l'ancien.
- **`test_api_groq_throttle.py`** : import mort de `MetierReferentielAPIView` (classe supprimée) retiré.
- **`AdminMetiers.test.jsx`** (frontend) supprimé — testait le composant supprimé.
- **`CreateJob.test.jsx`** : 2 tests (HP3, EC3) cassés par le remplacement de la cascade Secteur→Domaine par l'autocomplete métier — réécrits pour taper dans le champ et cliquer une suggestion. **Piège rencontré** : `fireEvent.click()` ne suffit pas, le composant `MetierAutocomplete` utilise `onMouseDown` (pas `onClick`) pour que la sélection s'exécute avant le `onBlur` qui ferme le dropdown — nécessite `fireEvent.mouseDown()`. **2ᵉ piège** : le champ "Titre du poste" (`CreateJob.jsx`) a *aussi* un autocomplete alimenté par `searchMetiers` (suggestions de titre) — un même texte de test ("Développeur web") matchait les deux dropdowns simultanément, `screen.findByText` remontait le mauvais élément (celui du titre, pas celui du champ métier) ; corrigé en scopant la recherche avec `within(container.querySelector("#field-metier"))` et en donnant un libellé de suggestion distinct entre les deux mocks.
- **`test_candidatures_spontanees.py`** : une passe de nettoyage automatique (`sed`) avait par erreur retiré le `specialite="IT"` légitime de la fixture `CandidatureSpontanee.objects.create(...)` (champ texte libre volontairement conservé, voir plus haut) en même temps que les vrais `specialite=` cassés sur `OffreEmploi`/`ProfilCandidat` — restauré après qu'un test (`test_HP7_...`) l'ait révélé en échouant.

**Vérification finale** : `python manage.py check` propre à chaque étape, backend **436/436 ✅** (`python manage.py test jobs accounts`), frontend **430/432 ✅** (les 2 échecs restants — `RecruteurLayout.test.jsx`, `FunnelChart.test.jsx` — sont préexistants et confirmés sans rapport avec ce chantier ailleurs dans ce fichier), `npx vite build` et `npm run build` propres.

**Non fait / laissé en l'état** : le renommage cosmétique `DomaineFormation`→`Domaine`/`FiliereFormation`→`Filiere`/`SpecialiteFormation`→`Specialite` (plus de collision de nom possible depuis que l'ancien `Domaine` métiers a été supprimé) — décision de ne pas le faire pour économiser du temps, purement cosmétique, à faire seulement si redemandé. `specialites_compatibles()` (texte, `matcher.py`) potentiellement devenue du code mort depuis que `metiers_matching.py` ne l'appelle plus — pas vérifié/retiré cette session, à confirmer avant suppression. Rien commité — travail sur `feature/referentiel-v2`, en attente de validation utilisateur.

**Suite (même session) — vérification du rattrapage de données ("Phase 2" du plan client)** : l'utilisateur a fait remarquer que le plan client original prévoyait explicitement une migration des anciennes valeurs (`ProfilCandidat.specialite`, `OffreEmploi.specialite`, `ExperienceCandidat.secteur`, codes ANEM type `"L18"`) vers les nouveaux `metier_id`/`specialite_id`, via des onglets `MIGRATION` fournis dans les deux classeurs Excel — jamais consultés jusqu'ici.
- **Vérifié en ouvrant réellement ces onglets** : ils existent bien (1033 lignes pour `MIGRATION` métiers, 201 pour diplômes) mais **ne s'appliquent pas à nos données** — ils mappent les anciens identifiants internes du référentiel du **client** (codes ROME type `A1101`, ids `TAF-000xxx`, `DOM-01-SP-01`...) vers leurs nouveaux ids stables, pas nos vieux codes ANEM/texte libre (`L18`, `IT`, `MASTER_2`) qui n'apparaissent dans aucune des deux tables. Aucune table de correspondance prête à l'emploi n'existe donc pour notre cas — la migration `0107` a de toute façon déjà supprimé les colonnes sources sans copie préalable, ces valeurs ne sont plus en base pour être migrées.
- **État réel de la base de dev après cutover** : 6 `ProfilCandidat` (3 sans `metier`), 8 `OffreEmploi` (4 sans `metier`), 23 `ExperienceCandidat` (13 sans `metier`), 16 `FormationCandidat` (0 avec `diplome_ref`/`specialite_ref` — non traité cette session).
- **Rattrapage heuristique tenté** (décision utilisateur, après avoir été prévenu que la résolution par simple fréquence de mots-clés — `resoudre_metier_depuis_texte()` seule — donnait des résultats aberrants sur ces vraies données, ex. "Directeur de production"→"Élevage des animaux de production", exactement le bug déjà documenté session 28/07/2026) : utilisé à la place le vrai classifieur Groq dédié (`classifier_metiers_experiences`, RAG + décision LLM), en lots de 4 (un lot de 13 d'un coup tronquait la réponse JSON de Groq — `max_tokens=2000` fixe dans `domaine_agent.py`, jamais ajusté à la taille du lot, non modifié pour rester dans le périmètre de ce backfill ponctuel).
- **2 hallucinations trouvées en relisant les résultats avant écriture** ("Head of HR Administration Department"→"Analyste LCB-FT", "HR Generalist"→"Coordination pédagogique" — aucun rapport malgré des candidats RH corrects montrés au modèle pour les items voisins du même lot) — **exclues de l'écriture** sur décision explicite de l'utilisateur, laissées à `None` plutôt que d'introduire une erreur de classification connue en base.
- **Écrit en base** : 9 `ExperienceCandidat.metier` + 4 `OffreEmploi.metier` (dont les 3 offres "Ingenieur en informatique" identiques, résolues à 2 métiers légèrement différents mais tous deux cohérents — non-déterminisme LLM accepté ici, pas un bug). Reste `None` sans regret : 2 profils sans `titre_professionnel` du tout, 1 profil + 2 expériences où l'IA s'est correctement abstenue (aucune appellation candidate fiable), 2 expériences exclues manuellement (hallucinations ci-dessus).
- **`FormationCandidat.diplome_ref`/`specialite_ref`** : backfill non tenté cette session (16/16 encore vides) — nécessiterait un résolveur dédié diplôme+spécialité qui n'existe pas encore (seul `resoudre_metier_depuis_texte()` existe côté métiers), hors périmètre de cette vérification ponctuelle.
- Script de backfill exécuté depuis le scratchpad de session (jamais committé) — pas de nouvelle commande de management créée pour ce geste ponctuel sur données de dev.

**Suite immédiate — rattrapage `FormationCandidat.diplome_ref`/`specialite_ref`** (partie diplômes du même point client, traitée à la suite) : résolveur ad-hoc écrit dans le scratchpad (recherche par mots entiers sur `TypeDiplome.libelle`/`AliasDiplome.cle_recherche`, puis sur `SpecialiteFormation.libelle` restreint aux couples `DiplomeSpecialite` du diplôme trouvé — jamais un couple hors référentiel, conforme F02/F06).
- **Bug de sous-chaîne trouvé et corrigé en écrivant ce résolveur** (même classe que le bug déjà documenté pour l'ancien parser CV, session 28/07/2026) : `"genie" in "ingenieur"` matchait à tort "Baccalauréat Génie Mécanique" avec "Diplôme d'ingénieur d'état" — corrigé en comparant des ensembles de mots entiers (`re.findall(r"\w+", ...)`) au lieu d'un test de sous-chaîne brute.
- **Résultat, honnête plutôt que complet** : seules 2 des 16 formations résolues sans ambiguïté (`Ingéniorat d'état en Électronique/Instrumentation`→`D-ING`+spécialité `Électronique des systèmes embarqués` ; `Baccalauréat Génie Mécanique`→`D-BAC`, sans spécialité — aucun couple `DiplomeSpecialite` pertinent pour un Bac). Les 14 autres (`"Master Professionnalisant en..."`, `"Licence en Commerce..."`, `"MBA..."`) **abstention correcte, pas un échec du script** : le référentiel v2 distingue Master/Licence en sous-types (académique/professionnel/classique/non précisé — `D-MAS-A`/`D-MAS-P`/`D-MAS-NP`, `D-LIC-A`/`D-LIC-P`/`D-LIC-CL`/`D-LIC-NP`) que le texte déclaré par le candidat ne précise jamais — deviner aurait violé F02/F06.
- Le champ texte `FormationCandidat.diplome` original n'a jamais été touché sur aucune des 16 lignes — conservé intégralement, y compris sur les 2 lignes désormais liées au référentiel.

## 🆕 SESSION 18/09/2026 (suite 2) — Vérification Phase 3 : bug recherche accents, résolveur diplôme parser CV, UX "Autre, préciser" en cascade

**Contexte** : vérification point par point du plan client "Phase 3 — Formulaires candidat/recruteur" (sélection métier offre, cascade formation, normalisation recherche N01-N04).

**1. Bug réel trouvé — recherche référentiel cassée pour toute saisie accentuée** : `Appellation.cle_recherche` est normalisé côté import (accents retirés par le client), mais **aucun des 5 points de recherche ne normalisait la requête utilisateur** avant comparaison — vérifié empiriquement : "développeur" (accents, saisie naturelle) → 0 résultat, "developpeur" → 30 résultats. Violation directe de REGLES_MATCHING N01.
- Nouveau `jobs/referentiel_utils.py::normaliser_recherche()` — implémente N01 (NFKD + retrait diacritiques, œ→oe/æ→ae), N02 (C++→cpp, C#→csharp, .NET→dotnet, aux limites de mot, avant retrait de ponctuation), N03 (harakat/tatweel arabes retirés, أ/إ/آ/ٱ→ا, ى→ي, jamais de translittération). N04 (flou Levenshtein≤1) **non implémenté** — décision explicite de ne pas le construire cette session sans clarification préalable (choix d'architecture : Python vs extension Postgres pg_trgm).
- Branché sur les 5 points identifiés : `MetierAutocompleteAPIView`, `resoudre_metier_depuis_texte()`, `_candidats_pour_experience()` (`domaine_agent.py` — avait déjà un `_sans_accents()` local partiel, remplacé par la fonction partagée), `AdminReferentielMetiersAPIView`/`AdminReferentielSpecialitesAPIView` (recherche sur `cle_recherche`, pas `AdminReferentielDiplomesAPIView` qui cherche sur `libelle` avec accents).
- Nouveau `jobs/tests/test_recherche_normalisation.py` (7 tests) — garde-fou permanent contre régression.

**2. Résolveur diplôme/spécialité créé et branché dans le parser CV** — jusqu'ici, seule la classification métier (expériences) était automatisée ; les formations extraites d'un CV restaient en texte libre pur, `diplome_ref`/`specialite_ref` jamais tentés. Nouveau `resoudre_diplome_et_specialite_depuis_texte()` (`referentiel_utils.py`) — même rigueur que le rattrapage manuel de la session précédente : recherche par **mot entier** (jamais sous-chaîne — bug "genie" dans "ingenieur" détecté et corrigé en écrivant cette fonction, même classe que le bug déjà documenté pour l'ancien parser) sur `TypeDiplome.libelle`/`AliasDiplome.cle_recherche`, puis spécialité restreinte aux couples `DiplomeSpecialite` du diplôme trouvé. S'abstient (None, None) dès qu'il y a ambiguïté (ex: "Master"/"Licence" seuls) — jamais un choix à l'aveugle (R02/F02).
- Branché dans `ParserCVAPIView` (`jobs/views/ia.py`) : chaque formation extraite reçoit `diplome_ref`/`diplome_ref_libelle`/`specialite_ref`/`specialite_ref_libelle` en plus des champs texte existants.
- Câblé jusqu'au bout dans `useOnboardingWizard.js` (seul consommateur restant du parser CV pour les formations — la page ProfilCandidat n'a plus de flux de remplissage automatique séparé, contrairement à ce que documentaient d'anciennes sessions) : `saveFormationsStep` transmet désormais ces 4 champs à `profilService.addFormation()`.

**3. UX "Autre, préciser" repensée en cascade descendante** (`Components/FormationReferentielSelect.jsx`) — l'implémentation précédente (session du jour, plus tôt) reposait sur "laisser le bloc vide, utiliser le champ texte à côté", jugée pas assez explicite par l'utilisateur. Remplacée par un bouton par niveau (Type de diplôme / Domaine / Spécialité) qui bascule ce niveau en mode "Autre" (select remplacé par un badge + champ "Précisez" visible), **avec cascade vers le bas** : choisir "Autre" au Type de diplôme active automatiquement le mode Autre sur Domaine ET Spécialité (si le type n'est pas identifiable, le reste ne l'est pas plus) ; choisir "Autre" au Domaine cascade sur la Spécialité. Chaque niveau reste réversible indépendamment (lien "↩ revenir à la liste").
- **Type de diplôme** : le référentiel a une vraie entrée `D-AUTRE` ("Autre diplôme à préciser") — utilisée comme FK réelle en mode Autre (jamais de FK nulle sans raison, F02 préfère un référentiel réel même générique). Nécessité d'exposer `code` dans `NomenclatureFormationAPIView.types_diplomes` (absent avant, ajouté) pour retrouver cette entrée de façon stable (pas par libellé, fragile).
- **Domaine** : jamais persisté séparément (juste un filtre local) — le mode Autre débloque la liste complète des spécialités sans filtre, pas de texte à capturer à ce niveau.
- **Spécialité** : `specialite_ref` vidé en mode Autre, texte tapé relié au champ `description` déjà existant du formulaire parent (`newForm.description`, "Spécialité / Domaine").
- **Nouveau texte "Type de diplôme"** relié à `newForm.diplome` (`Modals.jsx`) — **découverte en implémentant** : ce champ n'avait en réalité aucune saisie libre possible avant (le seul moyen de le remplir était le dropdown "Niveau de diplôme", 13 valeurs coarse, pas de `CreatableSelect`) ; le mode "Autre, préciser" du Type de diplôme référentiel v2 devient donc la première vraie façon de taper un intitulé de diplôme libre dans ce formulaire.
- `permettreAutre={false}` sur l'usage `CreateJob.jsx` (builder de couples `OffreDiplomeAccepte`) — un couple accepté a besoin d'une vraie FK spécialité, "Autre, préciser" n'y a aucun sens.

**Gaps confirmés, non traités cette session (mentionnés dans le plan client, jamais construits)** :
- **Suggestions compétences/spécialités par métier** (`MetierCompetence`/`MetierFormation`, 2792+1348 liens importés en Phase 1) — vérifié : **jamais consommés nulle part**, ni endpoint backend ni appel frontend. Le builder de compétences de `CreateJob.jsx` utilise toujours l'ancien `CompetenceReferentiel` générique (session CMS 20/08/2026), pas les compétences propres au métier sélectionné.
- **N04 (flou orthographique Levenshtein≤1)** — jamais implémenté, aucune tolérance à la faute de frappe.

**Tests** : backend 443/443 ✅ (dont les 7 nouveaux `test_recherche_normalisation.py`), `python manage.py check` propre, `npx vite build` propre. Vérifié manuellement en conditions réelles (pas mocké) : `normaliser_recherche()` sur accents/C++/C#/.NET/arabe, `resoudre_diplome_et_specialite_depuis_texte()` sur les 3 intitulés réels du rattrapage précédent (résultats identiques).

**Suite immédiate — suppression des 2 champs texte redondants dans "Ajouter/Modifier une formation"** (`Modals.jsx`) : l'utilisateur a remarqué que le dropdown "Niveau de diplôme" (13 valeurs coarse) et le champ "Spécialité / Domaine" (texte libre) faisaient doublon avec le nouveau bloc référentiel v2 en dessous. **Risque identifié avant suppression** : le bloc référentiel n'écrivait `diplome`/`description` que via "Autre, préciser" — un vrai choix dans la liste (Type de diplôme ou Spécialité) ne les remplissait jamais, donc supprimer les 2 champs sans rien d'autre aurait laissé `diplome`/`description` vides sur un choix référentiel réel (perte d'intitulé).
- **Fix** : `FormationReferentielSelect` transmet désormais `(id, label)` (au lieu de `id` seul) via `onChangeDiplome`/`onChangeSpecialite` lors d'un **vrai choix référentiel** (jamais en mode Autre — ce cas passe par `onChangeDiplomeAutreTexte`/`onChangeAutreTexte` séparément, ni au clear). `Modals.jsx` recopie ce libellé dans `newForm.diplome`/`newForm.description` à chaque vrai choix. Nouveau champ `rawLabel` (libellé sans le ★ des couples attestés) sur les options Spécialité pour ne jamais recopier le symbole dans le texte.
- Les 2 champs du haut supprimés — le bloc référentiel (avec ses 3 "Autre, préciser" en cascade) est désormais l'unique point de saisie diplôme/spécialité pour une formation, sans perte de donnée dans aucun cas (référentiel réel ou Autre).
- **Tests** : `ProfilCandidat.test.jsx`/`RegisterCandidat.test.jsx`/`CreateJob.test.jsx` (19/19 ✅, aucun ne référençait les libellés supprimés), `npx vite build` propre.

**Suite immédiate — le gap "suggestions compétences/spécialités par métier" enfin construit** (dernier point manquant de la Phase 3, `MetierCompetence`/`MetierFormation` — 2792+1348 liens importés en Phase 1, jamais consommés jusqu'ici) :
- Nouveau `GET jobs/referentiel/metiers/<id>/suggestions/` (`MetierSuggestionsAPIView`, `jobs/views/offres.py`) — résout le métier vers son `metier_canonique`, renvoie `competences` (`MetierCompetence` → `CompetenceReferentiel`, actives uniquement) et `diplomes_specialites` (`MetierFormation.specialite` croisé avec `DiplomeSpecialite` pour ne suggérer que des couples réellement attestés, avec leur `id` réel — nécessaire pour les ajouter directement à `diplomes_acceptes` sans repasser par le flux manuel). `IsAuthenticated` (consommé uniquement par le recruteur connecté dans `CreateJob.jsx`).
- **Frontend** : `jobsService.getMetierSuggestions(metierId)`, `useEffect` sur `formData.metier` dans `CreateJob.jsx` — dès qu'un métier est choisi (ou changé), affiche des chips en pointillés "Suggéré pour ce métier" sous "Compétences requises" (clic → `ajouterCompetenceRequise`, réutilise le flux existant) et sous "Diplômes/spécialités acceptés" (clic → nouvelle `ajouterCoupleSuggere`, ajoute directement sans repasser par le sélecteur manuel). Chaque liste se filtre pour ne jamais réafficher une suggestion déjà ajoutée. Rien n'est pré-coché ni imposé (exigence client explicite) — juste une suggestion cliquable.
- **Tests** : nouveau `jobs/tests/test_metier_suggestions.py` (4/4 : suggestions réelles, métier introuvable 404, non-authentifié 401, métier sans lien → listes vides), mock `getMetierSuggestions` ajouté à `CreateJob.test.jsx` (même piège récurrent déjà documenté ailleurs dans ce fichier — un nouvel appel `jobsService.*` non mocké fait planter silencieusement un test existant). Backend complet relancé : **447/447 ✅**. `npx vite build` propre.

---

## 🆕 SESSION 17/09/2026 — Nouveau référentiel v2 client (Phase 1 : import brut, rien branché)

**Contexte** : le client a transmis un message de consignes + deux classeurs Excel très structurés (lot `TAFTECH-2026.09.11-v2`, chacun avec ses propres onglets LIRE_MOI/IMPORT/DICTIONNAIRE/FORMULAIRE ou REGLES_MATCHING/RECETTE/SIMULATIONS) :
- `TAFTECH_Diplomes_Specialites_Algerie_v2.xlsx` : hiérarchie Scolarité → Type de diplôme (37) → Domaine formation (58) → Filière (64, facultative) → Spécialité (967), couples attestés Diplôme+Spécialité (921 liens, dont 70 doublons de couple documentés par le client lui-même dans AUDIT/COUVERTURE), alias FR/AR pour la recherche.
- `TAFTECH_Metiers_Matching_v2.xlsx` : Groupe (862, hiérarchie source NAME) → Métier (1038, avec `metier_canonique` résolvant 44 redirections d'anciens codes) → Appellation (7428, l'intitulé de poste précis à conserver — une fiche "Métier" peut regrouper plusieurs postes distincts, R03), Compétences (340, fusionnées dans `CompetenceReferentiel` existant), liens Métier→Compétence (2813) et Métier→Spécialité (1411, pont vers le fichier diplômes), Relations entre métiers (49), poids de matching (région 20%/diplôme 20%/spécialité 25%/expérience 20%/compétences 15%).

C'est un **remplacement de fond**, pas un ajout : à terme ça remplace `Secteur`/`Domaine`/`SousDomaine`/`MetierReferentiel` (nomenclature ANEM actuelle) côté métiers, et `DIPLOMES_CHOICES` plat + `ProfilCandidat.specialite`/`FormationCandidat` (texte libre) côté diplômes. Vu l'ampleur (nouveau modèle de données), plan en 5 phases validé avec l'utilisateur avant tout code (voir CLAUDE.md règle "demander avant les choix structurants") :
1. Nouveaux modèles + import brut (cette session)
2. Migration des données existantes (`ProfilCandidat.specialite`, `OffreEmploi.specialite`, `ExperienceCandidat.secteur`, `FormationCandidat`) vers les nouveaux codes, via les onglets MIGRATION fournis
3. Formulaires candidat/recruteur (cascade Type→Domaine→Filière→Spécialité, sélection métier via Appellation)
4. Réécriture `matcher.py` (nouveaux poids, diplôme+spécialité liés à la même formation, indicateur de complétude)
5. Frontend (remplace `SecteurDomaineSelect.jsx`, `AdminMetiers.jsx`, etc.)

**Décisions actées avec l'utilisateur avant de coder** :
- **Nommage** : les nouveaux modèles côté diplômes qui entrent en collision de nom avec l'existant sont préfixés `*Formation` (`DomaineFormation`, `FiliereFormation`, `SpecialiteFormation`) pour ne jamais les confondre avec `Domaine`/`SousDomaine` (nomenclature ANEM métiers, concept différent malgré le nom partagé) — les modèles côté métiers (`Metier`, `Appellation`, `GroupeMetier`) n'ont pas de collision, gardés courts.
- **Périmètre Phase 1** : import complet direct de toutes les tables de rôle "import" en une seule commande (le fichier est déjà prêt et auto-documenté, pas de raison de fractionner), plutôt qu'un socle minimal puis alias/liens dans une 2ᵉ passe.

**Travail réalisé (branche `feature/referentiel-v2`)** :
- 17 nouveaux modèles ajoutés dans `jobs/models.py` juste après `MetierReferentiel` (voir commentaire de section dans le fichier) : `Scolarite`, `TypeDiplome`, `DomaineFormation`, `FiliereFormation`, `SpecialiteFormation`, `DiplomeSpecialite`, `AliasDiplome`, `AliasSpecialite`, `GroupeMetier`, `Metier`, `Appellation`, `ProfilSuggestion`, `MetierCompetence`, `MetierFormation`, `RelationMetier`, `ParametreMatching` + un champ `code` (nullable, unique) ajouté à `CompetenceReferentiel` existant pour le rattacher au `competence_id` du référentiel v2 — migration `0104_referentiel_v2`. Chaque modèle a un champ `code` = identifiant stable du fichier Excel (ex: "D-CFPS", "A1101"), condition posée par le client pour permettre des réimports idempotents.
- **Simplifications assumées par rapport au DICTIONNAIRE strict** (à mentionner si le client demande une fidélité totale) : `SOURCES`/`OFFRES_SOURCES` (traçabilité de provenance, non consommées par une fonctionnalité produit) ne sont pas persistées en base — conforme à la consigne client de ne pas importer `SOURCE_NAME`/`SOURCE_TAFTECH` comme tables opérationnelles, étendue par choix technique aux autres tables d'audit. `ALIAS_COMPETENCES` (371 lignes) n'a pas de modèle dédié — fusionné dans le champ texte `CompetenceReferentiel.synonymes` déjà existant (même rôle : normalisation pour `cv_parser.py`), pas de table séparée. `METIER_GROUPES` (lien explicite metier↔groupe) non importé — redondant avec `METIERS.groupe_principal_id` (colonne directement sur la fiche métier, celle réellement utilisée par l'import). **Vérification exhaustive faite le 21/09/2026** (comparaison des 1038 métiers, pas un échantillon) : 82 écarts trouvés entre les deux sources, mais **tous concernent exclusivement les ~85 métiers ajoutés par TAFTECH** (codes `TAF-0000xx`/`TAF000xxx`, absents ou désynchronisés dans `METIER_GROUPES` — probablement jamais rétro-portés dans cette table auxiliaire lors de leur ajout), **aucun sur la nomenclature NAME officielle** (codes type `A1101`). Notre import utilise déjà la bonne source (`METIERS.groupe_principal_id`, faisant autorité sur la fiche elle-même) — aucun bug applicatif, seulement une incohérence interne aux fichiers source du client sur ses propres ajouts, sans impact sur le site.
- **Commande `jobs/management/commands/import_referentiel_v2.py`** (`--dry-run`, `--diplomes`/`--metiers` pour surcharger le chemin) : importe dans l'ordre exact des onglets `IMPORT` des deux classeurs (formations avant métiers avant liens cross-fichier `METIER_FORMATIONS`), transaction unique, upsert par `code` (idempotent, revérifié : 2ᵉ exécution = 0 création, tout rattaché). Deux passes pour les auto-références (`GroupeMetier.parent`, `Metier.metier_canonique`), comme demandé dans IMPORT étape 5.
- **Doublons de couples réels dans la source** (documentés par le client dans AUDIT, pas un bug) : `DiplomeSpecialite`, `MetierCompetence`, `MetierFormation` ont chacun une contrainte `unique_together` sur leur couple métier — un `lien_id` différent pointant vers un couple déjà vu est dédupliqué (le premier `code` rencontré est conservé), comptabilisé séparément dans le rapport (`... (doublons couple ignorés)`).
- Les deux fichiers Excel sont copiés à la racine du projet et dans `taftech_backend/` (même emplacement que `NAME.xlsx` déjà présent, chemin par défaut de la commande).

**Vérifié après import réel (pas seulement le dry-run)** : tous les comptages en base correspondent exactement aux totaux annoncés par le client dans LIRE_MOI et AUDIT — `TypeDiplome`=37, `SpecialiteFormation`=967, `DiplomeSpecialite`=851 (+70 doublons = 921 total conforme), `AliasSpecialite`=1207, `Metier`=1038 dont **44 redirections** (`metier_canonique` différent de soi-même — correspond exactement à "44 redirections" cité dans l'audit du fichier), `Appellation`=7428, `CompetenceReferentiel`=368 (340 du référentiel v2 + 28 entrées admin pré-existantes non recouvertes par un libellé v2), `MetierCompetence`=2792 (+21 doublons = 2813), `MetierFormation`=1348 (+63 doublons = 1411), `RelationMetier`=49, `ParametreMatching`=11. `python manage.py check` propre après chaque étape.

**🔴 État actuel — rien n'est branché au site** : ces 17 nouvelles tables existent et sont peuplées, mais `ProfilCandidat`, `OffreEmploi`, `ExperienceCandidat`, `FormationCandidat`, `matcher.py`, les formulaires frontend et `AdminMetiers.jsx` n'ont **pas encore été modifiés** — aucune régression possible sur le site actuel à ce stade. Rien n'est encore committé (travail en cours sur `feature/referentiel-v2`, pas encore validé par l'utilisateur pour la suite).

**Décisions Phase 2 actées avec l'utilisateur** :
- **Niveau de matching** : au niveau `Metier` (précis, 1038 valeurs), pas au niveau `GroupeMetier`/Domaine grossier actuel — cohérent avec le poids client 25% spécialité.
- **Diplôme sur l'offre** : le recruteur définira une **liste de couples diplôme+spécialité acceptés** (nouveau modèle `OffreDiplomeAccepte`, M2M via `DiplomeSpecialite`), fidèle à REGLES_FORMATION F06 du client — pas un simple niveau minimum unique comme avant. `OffreEmploi.diplome` (niveau minimum, CharField) est conservé comme repli si aucun couple explicite n'est défini.
- **Pas de migration automatique des anciennes fiches** vers le `Metier` précis (trop risqué de deviner à partir d'un code Domaine grossier type "L18") — nouvelles FK toutes nullables, remplies uniquement via les nouveaux formulaires (Phase 3) au fil de l'eau. Aucune tâche de rattrapage/relance prévue pour l'instant.

**Travail Phase 2 réalisé** (migration `0105_referentiel_v2_phase2_liens`) :
- FK nullable `metier` → `Metier` ajoutée sur `OffreEmploi`, `ProfilCandidat`, `ExperienceCandidat` — les anciens champs texte (`specialite`, `secteur_souhaite`, `secteur`) restent inchangés et documentés "legacy, voir `metier`" dans leur `verbose_name`.
- `FormationCandidat` : nouvelles FK nullables `diplome_ref` (→ `TypeDiplome`) et `specialite_ref` (→ `SpecialiteFormation`, doit correspondre à la même formation que `diplome_ref` — jamais combiner un diplôme d'une formation avec la spécialité d'une autre), + `statut` (OBTENU/EN_COURS/INTERROMPU, défaut OBTENU). Le champ `diplome` existant (CharField 200) reste l'intitulé original déclaré par le candidat — pas de nouveau champ `intitule_original` séparé, il fait déjà exactement ça.
- Nouveau modèle `OffreDiplomeAccepte` (offre FK, couple FK `DiplomeSpecialite`, `unique_together`).
- Suite ciblée (`test_jobs_models`, `test_matcher`, `test_api_metiers`, 25 tests) + suite complète `jobs accounts` relancées après la migration — aucune régression (tous les nouveaux champs sont nullables, `matcher.py`/formulaires/serializers pas encore modifiés).

**Phase 3 (backend) réalisée** — endpoints + serializers pour exposer/écrire le référentiel v2 :
- `GET jobs/referentiel/nomenclature-formation/` (`NomenclatureFormationAPIView`) : arbre complet TypeDiplome/DomaineFormation/FiliereFormation/SpecialiteFormation + couples `DiplomeSpecialite` attestés, cache 1h (pattern `NomenclatureAPIView`/`ConstantsAPIView` déjà en place) — alimente la cascade Type→Domaine→Filière→Spécialité du futur formulaire "Ajouter une formation".
- `GET jobs/referentiel/metiers/?search=` (`MetierAutocompleteAPIView`) : recherche sur `Appellation.cle_recherche`, résout automatiquement vers `metier_canonique` (R04) tout en renvoyant le libellé précis de l'appellation trouvée (R03) — un seul résultat par métier canonique (dédupliqué).
- `ExperienceSerializer`/`FormationSerializer`/`ProfilCandidatDTO` : ajout des champs `metier`/`metier_libelle` (expérience, profil) et `diplome_ref`/`specialite_ref`/`statut`/`diplome_ref_libelle`/`specialite_ref_libelle` (formation) — écriture déjà fonctionnelle via les vues existantes (`ExperienceAPIView`/`FormationAPIView`/`ProfilCandidatAPIView.put`, aucune n'a eu besoin d'être modifiée, elles passent déjà `request.data` tel quel au serializer). **Décision** : pas de validation bloquante côté serializer sur le couple diplôme+spécialité (REGLES_FORMATION F02 — la couverture n'est pas exhaustive, un couple absent doit rester saisissable) ; la contrainte "même formation" se respecte dans `matcher.py` en traitant chaque `FormationCandidat` comme un tout atomique, pas en rejetant une combinaison à la saisie.
- `OffreEmploiSerializer`/`OffreDashboardDTO` : ajout `metier`/`metier_libelle`/`diplomes_acceptes` (nested `OffreDiplomeAccepteSerializer`). `OffreEmploiCreateDTO` : ajout `metier`. Nouvelle fonction `_synchroniser_diplomes_acceptes_offre()` (`jobs/views/offres.py`, même pattern remplacement intégral que `_synchroniser_competences_offre`) appelée sur `JobCreateAPIView.post()` (toujours) et `UpdateOffreRecruteurAPIView.patch()` (si la clé `diplomes_acceptes` est présente dans le payload).

**Phase 4 (`matcher.py`) réalisée** — comparaison au niveau `Metier` + couples diplôme/spécialité, avec repli garanti :
- Nouvelle fonction `metiers_compatibles(metier_candidat, metier_offre)` (même barème que l'ancienne `specialites_compatibles` texte : 1.0 identique, 0.85 même `groupe_principal`, fuzzy en filet de sécurité).
- Section SPÉCIALITÉ : si `profil.metier` ET `offre.metier` sont tous deux de vraies instances `Metier` (`isinstance` — jamais juste `if profil.metier:`, qui aurait été piégé par l'auto-vivification des `Mock()` dans les 25 tests historiques, cf. piège déjà documenté ailleurs dans ce fichier pour `hasattr` sur un `Mock`), comparaison au niveau `Metier` (résolu vers `metier_canonique` avant comparaison) ; sinon repli **intégral et inchangé** sur l'ancienne comparaison texte `specialite`/`secteur_souhaite`.
- Section DIPLÔME : si l'offre a au moins un `OffreDiplomeAccepte` (`list(offre.diplomes_acceptes.all())` protégé par `try/except TypeError`, même pattern que `competences_requises` déjà en place — un `Mock()` lève `TypeError` à l'itération, donc les 25 tests historiques ne déclenchent jamais cette branche), le score se base exclusivement sur les couples acceptés : couple exact (diplôme+spécialité de la **même** `FormationCandidat`, statut `OBTENU`) → 20/20 ; diplôme seul reconnu (spécialité différente) → 12/20 ; aucune formation `OBTENU` renseignée → 6/20 classé en **donnée manquante** (pas incompatible) ; sinon 0. Une formation `EN_COURS`/`INTERROMPU` n'est jamais comptée comme obtenue (conforme RECETTE T11 du fichier diplômes). Sans couple explicite sur l'offre, repli intégral sur l'ancienne hiérarchie de niveau (`profil.diplome`/`offre.diplome`), inchangée.
- **Indicateur de complétude** (nouveau, demandé par le client) : chaque branche qui aboutit à un score neutre faute de donnée (spécialité/diplôme/région/expérience/compétences non renseignés) alimente `donnees_manquantes` ; le résultat de `calculer_score_matching()` expose désormais `completude` (1.0 = les 5 critères ont pu être réellement évalués) et `criteres_manquants` (liste des clés concernées) — distingue explicitement "donnée manquante" d'"incompatible", exigence client explicite.
- **Nouveau `jobs/tests/test_matcher_referentiel_v2.py`** (11 tests, instances réelles Django — pas des `Mock`, car le nouveau chemin a besoin de vraies relations FK) : `metiers_compatibles` (3), comparaison métier candidat/offre (3, dont le repli legacy), couples diplôme/spécialité (5, dont le cas client explicite "master finance + licence informatique ≠ master informatique" et le cas formation `EN_COURS`). Les 25 tests historiques de `test_matcher.py` (`Mock`) passent sans aucune modification — vérifie le non-régression du repli.

**Phase 5 (frontend) réalisée** :
- Nouveaux composants réutilisables `Components/MetierAutocomplete.jsx` (recherche sur `Appellation`, résout vers `metier_canonique`) et `Components/FormationReferentielSelect.jsx` (cascade Type diplôme→Domaine→Filière→Spécialité, couples `DiplomeSpecialite` attestés mis en avant avec un ★ sans jamais bloquer une combinaison absente — REGLES_FORMATION F02).
- `ProfilCandidat` : champ "Métier recherché" (v2) dans les infos générales, autocomplete métier par expérience, cascade référentiel v2 dans le formulaire formation (`diplome_ref`/`specialite_ref`/`statut`) en complément des champs texte libre existants (jamais remplacés). `normalizeExp`/nouveau `normalizeForm` (`useProfilCandidat.js`) convertissent `""` → `null` avant envoi (`PrimaryKeyRelatedField` nullable n'accepte pas une chaîne vide, seulement `null`).
- `CreateJob.jsx` : autocomplete métier + builder de couples diplôme+spécialité acceptés (chips ajout/suppression, cohérent avec le pattern déjà utilisé pour les compétences structurées).
- Indicateur de complétude/critères manquants affiché dans "Pourquoi ce score ?" côté candidat (`MesCandidatures.jsx`) et recruteur (`DetailCandidature.jsx`).
- Petit fix backend complémentaire : `NomenclatureFormationAPIView` expose désormais l'`id` de chaque `DiplomeSpecialite` (oublié dans la Phase 3 — nécessaire pour que le frontend soumette `diplomes_acceptes` avec la bonne clé primaire).
- **Piège récurrent (déjà documenté ailleurs dans ce fichier) reconfirmé** : `CreateJob.test.jsx`/`ProfilCandidat.test.jsx`/`RegisterCandidat.test.jsx` (qui teste en réalité `<ProfilCandidat />`) ont eu besoin de `getNomenclatureFormation`/`searchMetiers` ajoutés à leurs mocks `jobsService` — sinon échec silencieux dès que le composant monté appelle ces méthodes.
- **Suite complète relancée** : 2 échecs (`RecruteurLayout.test.jsx`, `FunnelChart.test.jsx`) — **vérifiés préexistants** via `git stash` (échouent aussi sur l'arbre non modifié par cette session), sans rapport avec le référentiel v2.

## 🆕 SESSION 17/09/2026 (suite) — Panel admin référentiel v2 + SIMULATIONS/RECETTE en tests formels

**1. Bug de fond trouvé en traduisant les cas `SIMULATIONS`** : l'indicateur `completude` (ajouté Phase 4) était calculé comme un simple compte `1 - nb_manquants/5` — les 6 cas `SIMULATIONS` fournis par le client (poids réels 25/20/20/20/15) montrent que leur "couverture" est en réalité **pondérée par le poids de chaque critère**, pas un compte à plat. Preuve : EX-04 (diplôme+spécialité inconnus, poids 0.20+0.25) attend `couverture_attendue=0.55` — exactement `1-0.45`, jamais `1-2/5=0.6`. Corrigé dans `matcher.py` (`_POIDS_CRITERES`, dict des 5 poids) — **trouvé et corrigé uniquement parce que les cas SIMULATIONS ont été traduits en tests**, aucun test précédent n'aurait détecté cet écart (les tests Phase 4 ne vérifiaient que `< 1.0`, jamais une valeur exacte).

**2. `jobs/tests/test_referentiel_v2_simulations.py` (12 tests)** :
- `SimulationsMatchingTest` — EX-01 à EX-04 et EX-06 vérifiés au **score exact** annoncé par le client (100/85/75/55/80) et à la `completude` exacte (1.0/1.0/1.0/0.55/1.0), chemin legacy (texte, pas Metier v2) volontairement utilisé. **EX-05 (mi-expérience) n'est vérifié que directionnellement** — le modèle abstrait du client suppose une satisfaction continue (0.5 → 10/20 pts), notre implémentation réelle utilise des paliers de confiance discrets hérités de sessions précédentes (20/12/6/0) qui ne retombent jamais sur une valeur continue à 90/100 pile ; assumé et documenté plutôt que bricolé pour forcer un score exact.
- `RecetteMetiersRechercheTest` (T02-T05) et `RecetteDiplomesTest` (T10, T11 — déjà couverts par `test_matcher_referentiel_v2.py`, repris ici sous leur identifiant RECETTE d'origine pour la traçabilité) — fiches/appellations **synthétiques** reproduisant la structure du cas réel (redirection, granularité, absence d'expansion sémantique), pas un réimport complet du référentiel réel dans la base de test (les ~11 000 lignes ne sont peuplées que par la commande d'import en dev, jamais par une migration — la base de test ne les contient donc pas).
- **Cas volontairement non traduits** : T06/T07 (normalisation de clé — déjà pré-calculée par le client dans les colonnes `cle_recherche` du fichier, pas un comportement de notre code) ; T01/T08/T09/T19 (règles de saisie admin/qualité de données, sans comportement de code à vérifier).

**3. Panel admin `/admin-taftech/referentiel-v2`** (`AdminReferentielV2.jsx`, 3 onglets Métiers/Spécialités/Diplômes) :
- Backend `jobs/views/referentiel_admin.py` (3 vues `AdminReferentiel{Metiers,Specialites,Diplomes}APIView`, pattern GET paginé+recherche / PATCH déjà standard du projet) + `jobs/serializers/referentiel_admin.py`.
- **Décision volontaire : ni création ni suppression** — les `code` sont les identifiants stables du réimport idempotent (`import_referentiel_v2`), et supprimer casserait les FK déjà posées sur des profils/offres réels. L'admin ajuste seulement `libelle` et `selectionnable` (masquer une entrée sans la supprimer) — même principe déjà appliqué à `AdminPaliers.jsx` (4 paliers fixes, pas d'ajout/suppression).
- Recherche sur `cle_recherche` (déjà normalisé par le client, insensible aux accents) pour Métiers/Spécialités ; `TypeDiplome` n'a pas de `cle_recherche` dans le référentiel client (seul `ALIAS_DIPLOMES` en a un, non importé comme modèle séparé — voir Phase 1), recherche sur `libelle` pour ce dernier.
- Tests : `jobs/tests/test_admin_referentiel_v2.py` (9/9 : permissions, recherche, PATCH toggle/libellé, `code` en lecture seule, 404), `tests/AdminReferentielV2.test.jsx` (5/5).

**Tests** : backend `jobs accounts` **452/452** ✅ (431 + 21 nouveaux), frontend suite complète relancée (2 échecs `RecruteurLayout.test.jsx`/`FunnelChart.test.jsx` confirmés préexistants via `git stash`, sans rapport). `python manage.py check` / `npx vite build` propres.

**Reste à faire** :
- Rattrapage des anciennes fiches (profils/offres sans `metier` précis) : décision actée de ne rien faire pour l'instant (voir plus haut), aucune tâche de relance prévue

---

## 🆕 SESSION 06/09/2026 (suite 2) — Cohérence abonnements, retrait ANPDP, délivrabilité email

**Contexte** : suite de la liste de retours client transmise progressivement. Deux points listés en attente restent non traités car les fichiers référentiels (métiers canonique + diplômes/spécialités) n'ont toujours pas été transmis par le client — voir rappel en fin de cette section.

**1. Cohérence des textes d'abonnement** — le client a remarqué des pages annonçant "publication illimitée" ou des fonctionnalités payantes comme acquises gratuitement, alors que les vraies formules (vérifié en base) sont : Gratuit=1 offre active, Starter=5, Pro=15, Business/Enterprise=illimité — exactement les chiffres cités par le client. 3 endroits corrigés :
- `RegisterRecruteur.jsx` (bandeau gauche de l'inscription) : *"Publication illimitée d'offres"*, *"Gestion d'équipe multi-rôles"* (en réalité Business+), *"CVthèque intelligente"* (en réalité Starter+, jamais gratuite) → remplacés par *"Publiez votre première offre gratuitement"*, *"Score IA sur chaque candidature"*, *"Formules Starter à Enterprise pour aller plus loin"*, *"Conforme à la loi 18-07"*.
- `LandingRecruteur.jsx` (liste `AVANTAGES`, page vitrine recruteur) : *"Publication d'offres illimitée"* → *"Publication d'offres : 1 gratuite, jusqu'à illimité selon votre formule"* ; *"Accès à la CVthèque nationale"* → *"CVthèque nationale accessible dès la formule Starter"*.
- `LoginRecruteur.jsx` (bandeau du panneau de connexion) : mêmes corrections (CVthèque/équipe non gratuites) → *"Publiez une offre gratuitement pour commencer"*, *"CVthèque accessible dès la formule Starter"*, *"Formules évolutives selon vos besoins"*.
- **Décision actée avec l'utilisateur** : le palier Gratuit n'est **pas** une offre de lancement temporaire — c'est un palier permanent codé en dur (`limite_offres_actives()` retourne 1 pour toute entreprise sans `AbonnementEntreprise`, aucun mécanisme d'expiration) — donc aucune mention "offre de lancement" n'était nécessaire, seule la formulation "illimité" était fausse.
- **Trouvé en creusant, corrigé au passage** : le badge hero de `LandingRecruteur.jsx` disait aussi *"Gratuit au lancement"* — contredisait directement la décision ci-dessus (palier permanent, pas un lancement) → corrigé en *"Compte gratuit disponible"*.

**2. Mention "Validé ANPDP" retirée** — demande explicite : ne garder cette mention que si une validation officielle de l'ANPDP (Autorité Nationale de Protection des Données à caractère Personnel) est réellement obtenue, ce qui n'est pas le cas. Remplacée partout par une formulation de conformité à la **loi** 18-07 (le texte de loi lui-même, pas une validation par l'autorité) :
- `LandingRecruteur.jsx` : badge hero *"Validé ANPDP"* → *"Conforme à la loi 18-07"* ; carte fonctionnalité *"...protection des données (ANPDP)"* → *"...conforme à la loi 18-07 relative à la protection des données à caractère personnel"* ; liste avantages *"Conforme ANPDP / Loi 18-07"* → *"Conforme à la loi 18-07"*.
- `FooterRecruteur.jsx` : *"Conforme loi 18-07 / ANPDP"* → *"Conforme à la loi 18-07"* — et l'accroche du même footer (*"La plateforme de recrutement algérienne avec matching par intelligence artificielle."*, la même formule "seule plateforme" que le hero recruteur corrigé en session précédente) alignée sur la phrase déjà validée par le client : *"La plateforme de recrutement qui combine intelligence artificielle, expertise RH et accompagnement humain."*

**3. Emails de vérification arrivés en spam pendant les tests utilisateur** — diagnostic : le "From" de tous les emails sortants était une adresse Gmail nue (`taftech963@gmail.com`, sans nom d'expéditeur), un signal que les filtres anti-spam des fournisseurs autres que Gmail (Outlook, Yahoo...) surveillent pour du courrier transactionnel automatisé. Fix appliqué **côté code, insuffisant à lui seul** : nouveau `settings.DEFAULT_FROM_EMAIL = f'TafTech <{EMAIL_HOST_USER}>'`, substitué à `settings.EMAIL_HOST_USER` comme expéditeur (`from_email`) dans les ~13 emplacements d'envoi d'email du projet (`accounts/views.py`, `jobs/views/admin.py`/`candidatures.py`/`equipe.py`/`recruteur.py`) — **seulement** quand `EMAIL_HOST_USER` servait d'expéditeur ; les 3 emplacements où il sert de **destinataire** (contact form, broadcast, rapport interne — l'entreprise s'envoie un email à elle-même) sont restés inchangés.
- **Le vrai fix reste hors code** : passer d'un compte Gmail grand public à un expéditeur sur le domaine `taftech.dz` (Google Workspace ou fournisseur transactionnel type SendGrid/Mailgun/AWS SES/Brevo) + configurer SPF/DKIM/DMARC dans le DNS du domaine — nécessite un accès DNS que cette session n'a pas. Ajouté à la checklist de déploiement (section 🚀 DÉPLOIEMENT) avec la recommandation de tester via mail-tester.com avant mise en ligne réelle.

**Rappel — 2 points en attente, fichiers non encore reçus** (voir aussi sessions précédentes du même jour) :
1. **Référentiel métier canonique** — rattacher l'intitulé de poste libre saisi par le recruteur à un métier de référence (ex: "Talent Acquisition Specialist" → "Chargé de recrutement"), tout en gardant l'intitulé libre affiché sur l'annonce.
2. **Référentiel Diplômes & Spécialités hiérarchique** (Niveau minimum → Type de diplôme → Domaine → Filière → Spécialité, avec possibilité de sélectionner plusieurs spécialités compatibles par offre) — remplace les choix actuels type "Master 1, Licence, Bac+4".
Aucun code écrit sur ces deux points tant que les fichiers ne sont pas transmis, pour éviter un travail à refaire une fois le vrai référentiel reçu.

**Tests** : `python manage.py check` propre, suite backend ciblée (`accounts.tests`, `test_api_candidat`, `test_api_recruteur`, `test_api_equipe` — tous les chemins qui envoient un email) relancée après le changement `DEFAULT_FROM_EMAIL`. `npm run build` propre (⚠️ `npx vite build` a échoué une fois avec une erreur `Cannot resolve entry module index.html` — confirmé sans rapport avec le code : npx est allé chercher une version de Vite différente en cache global (`v8.2.2` au lieu de la version du projet `^8.0.4`) ; `npm run build`, qui utilise la version locale du projet, a fonctionné du premier coup — utiliser `npm run build` de préférence à `npx vite build` dans ce projet). Suite frontend complète 440/441 ✅ (même échec pré-existant `RecruteurLayout.test.jsx`, sans rapport).

---

## 🆕 SESSION 06/09/2026 (suite) — Bug critique bouton IA + compétences générées depuis le référentiel

**Contexte** : suite directe de la session compétences structurées ci-dessous. L'utilisateur signale "Service IA indisponible" de façon systématique sur "Générer l'offre avec l'IA" (`CreateJob.jsx`) après le déploiement du builder de compétences — soupçon initial que le nouveau code en était la cause.

**Diagnostic (écarté puis confirmé)** : vérifié par appel direct du backend (Django shell, puis vraie requête HTTP à travers le proxy Vite avec un vrai jeton) — la génération fonctionnait parfaitement à chaque tentative, 200 OK en moins de 2s. Le code des compétences structurées n'était donc pas en cause. Deux fausses pistes explorées et écartées avant la vraie cause : (1) deux processus `runserver` simultanés sur le port 8000 (18h53 et 22h01) — tués et un seul relancé, sans effet ; (2) timeout frontend 30s trop court pour le retry ajouté juste avant — porté à 60s, sans effet non plus.

**Vraie cause — bug préexistant, sans rapport avec cette session** : `CreateJob.jsx`, le bouton avait `onClick={handleGenererIA}` au lieu de `onClick={() => handleGenererIA()}`. React passe l'objet événement du clic comme premier argument à tout `onClick` — `handleGenererIA(titreOverride)` recevait donc le `SyntheticEvent` à la place du titre. Comme un objet est toujours "truthy", le garde-fou `if (!titrePourGeneration) return` ne se déclenchait jamais, et le payload envoyé à l'IA contenait `titre: <SyntheticEvent>` — la sérialisation JSON de cet objet (circulaire) échouait **côté navigateur, avant même l'envoi réseau** (confirmé : aucune requête `generer-offre` n'apparaissait dans l'onglet Réseau du navigateur, preuve déterminante). D'où le message générique systématique (`apiErrMsg` retombe sur son texte par défaut quand `err.response` est absent).
- **Pourquoi jamais remarqué avant** : le seul autre appelant de `handleGenererIA` (déclenchement auto via `?titre=X` dans l'URL, ligne ~147) passe une vraie chaîne — cette voie a toujours fonctionné. Seul le clic manuel sur le bouton était cassé, depuis toujours.
- **Fix** : `onClick={() => handleGenererIA()}` + garde-fou défensif dans la fonction (`typeof titreOverride === "string" ? titreOverride : ""`) pour qu'un futur appel mal câblé de la même façon échoue proprement (message d'erreur clair) plutôt que de planter silencieusement.
- **Méthode de diagnostic qui a fonctionné** : demander à l'utilisateur d'ouvrir l'onglet Réseau du navigateur et vérifier si la requête apparaît **du tout** — l'absence totale de requête réseau est le signal déterminant qu'un JS plante avant l'appel réseau, pas une piste serveur/CORS/timeout.

**Suite — compétences IA générées depuis le référentiel, pas inventées** (demande explicite de l'utilisateur après avoir vu le builder fonctionner) : `GenererOffreIAAPIView` (`jobs/views/ia.py`) injecte désormais la liste complète des `CompetenceReferentiel.objects.filter(actif=True)` (41 entrées en dev, taille gérable en un seul appel) dans le prompt via un nouveau token `{competences_referentiel}`, avec consigne stricte "choisis EXCLUSIVEMENT des libellés présents mot pour mot dans ce référentiel". Nouveau champ JSON demandé `competences_structurees` (label/type_exigence/niveau_requis, même forme que `CompetenceOffre`).
- **Anti-hallucination côté serveur** : chaque label retourné par Groq est comparé (insensible à la casse) à un dict `labels_par_cle` construit depuis le référentiel réel — un label absent du référentiel est silencieusement écarté (pas créé à la volée, pas d'erreur) ; le label retourné au frontend reprend la casse exacte du référentiel (pas celle, possiblement différente, choisie par Groq). `type_exigence`/`niveau_requis` invalides retombent sur `OBLIGATOIRE`/`None`, même pattern de validation que `_synchroniser_competences_offre` (`jobs/views/offres.py`).
- **Piège resynchronisation déjà documenté dans ce fichier (parser CV, session 26/08/2026) reconfirmé ici** : `AIConfig.generation_offre_prompt` était déjà peuplé en base (2 sessions précédentes l'ont écrit) et prenait le pas sur la constante Python — modifier `DEFAULT_PROMPT_GENERATION_OFFRE` dans le code seul n'aurait eu AUCUN effet réel. Resynchronisé manuellement en base de dev (`AIConfig.get_solo().generation_offre_prompt = DEFAULT_PROMPT_GENERATION_OFFRE; save()`, cache vidé) — **même limitation qu'avant : un déploiement en prod avec un prompt personnalisé par l'admin serait écrasé silencieusement, resynchronisation manuelle uniquement faite en dev ici.**
- `AIConfig.generation_offre_max_tokens` : défaut modèle 1600→1900 (migration `0103`) + valeur existante resynchronisée en base de dev — marge pour le nouveau champ `competences_structurees` en plus des questions d'entretien déjà volumineuses.
- **Frontend** (`CreateJob.jsx::handleGenererIA`) : `result.competences_requises` (nom de clé volontairement identique à l'état `competencesRequises` déjà existant) fusionné dans le builder de compétences structurées — dédoublonné par label (insensible à la casse) avec les étiquettes déjà ajoutées manuellement par le recruteur, jamais un remplacement pur qui écraserait un ajout manuel antérieur.
- Vérifié en conditions réelles (vraie requête HTTP, pas mockée) : sur "Chargé de recrutement", l'IA a retourné 5 compétences du référentiel (Ressources humaines, Négociation, Gestion du temps, Communication, Sens de l'organisation) avec type/niveau cohérents.

**Tests** : nouveau `GenererOffreIACompetencesReferentielTest` dans `test_competences_offre.py` (2 tests, `call_ai` mocké — un label inventé par Groq est écarté et la casse réelle du référentiel est restituée ; aucune compétence valide → liste vide, pas d'erreur), suite complète du fichier 10/10 ✅. `python manage.py check` propre, `npx vite build` propre, `CreateJob.test.jsx` 6/6 ✅. Suite backend complète relancée après ce fix.

**Comptes/données de test créés en base de dev pendant le diagnostic — tous nettoyés** : un utilisateur `smoke_ia`/`SmokeCo` créé via shell pour un test HTTP réel, supprimé immédiatement après usage. Un fichier `token.txt` (jeton JWT temporaire) créé deux fois pour des tests `curl` réels, supprimé après chaque usage — jamais committé.

---

## 🆕 SESSION 06/09/2026 — Retours client portail recruteur : wording, blocage entreprise non validée, compétences structurées offre

**Contexte** : liste de retours client à traiter un par un, transmis progressivement en conversation. Deux points (référentiel métier canonique pour l'intitulé de poste, et refonte hiérarchique Diplôme/Spécialité) sont **en attente** — le client doit encore transmettre ses fichiers référentiels ; pas de code écrit dessus pour éviter un travail à refaire.

**1. Wording crédits CVthèque** : `"à vie"` retiré (le candidat peut supprimer son compte / retirer sa visibilité / exercer ses droits RGPD) → `"tant que le profil reste actif et accessible conformément aux paramètres de confidentialité du candidat"`. Corrigé dans `CVTheque.jsx` (bandeau + confirmation de déblocage) et `AbonnementsPage.jsx` (bandeau crédits).

**2. Accroche landing recruteur** : `"La seule plateforme de recrutement algérienne avec matching par IA, conforme ANPDP..."` → `"La plateforme de recrutement algérienne qui combine intelligence artificielle, expertise RH et accompagnement humain."` (`LandingRecruteur.jsx`).

**3. Sécurisation entreprise non validée** — règle actée : **entreprise validée (`est_approuvee`) + abonnement/droit actif = accès autorisé**, jamais l'un sans l'autre. Avant cette session, `est_approuvee` n'était vérifié nulle part sur le chemin CVthèque/crédits/paiement — seul `get_palier_actif()` était contrôlé, une entreprise non validée avec un abonnement actif (ex. activé manuellement par erreur) aurait pu consulter coordonnées/CV. Fix — nouveau check `entreprise.est_approuvee` (403, code `ENTREPRISE_NON_VALIDEE`) ajouté à 5 endpoints : `CVThequeView.get()`, `DeverrouillerCandidatAPIView.post()`, `ChargilyCheckoutPalierAPIView.post()`, `CreditPackCheckoutAPIView.post()`, `DemanderActivationPremiumAPIView.post()` (paiement manuel CIB/EDAHABIA). Frontend `AbonnementsPage.jsx` : bandeau ambre *"Votre entreprise est en cours de validation. Vous pourrez choisir votre formule dès validation de votre compte."* tant que `dash.entreprise.est_approuvee` est `false`, boutons Chargily/virement manuel/achat de pack désactivés dans cet état.

**4. Compétences structurées sur l'offre** (`CompetenceOffre`, migration `0102`) — nouveau modèle (offre FK, `label`, `type_exigence` OBLIGATOIRE/SOUHAITEE, `niveau_requis` optionnel réutilisant les mêmes codes que `CompetenceCandidat.NIVEAU_CHOICES`) en complément de `OffreEmploi.competences` (zone texte libre conservée telle quelle pour l'annonce, jamais remplacée).
- **Backend** : `_synchroniser_competences_offre()` (`jobs/views/offres.py`) — remplacement intégral (delete puis recreate) à partir d'une liste `[{label, type_exigence, niveau_requis}]`, appelé dans `JobCreateAPIView.post()` (toujours) et `UpdateOffreRecruteurAPIView.patch()` (seulement si la clé `competences_requises` est présente dans le payload — sémantique partial classique). Validation défensive : label vide/dupliqué ignoré, `type_exigence`/`niveau_requis` invalides retombent sur `OBLIGATOIRE`/`None`. Exposé en lecture via `CompetenceOffreSerializer` sur `OffreEmploiSerializer` (annonce publique + admin) et `OffreDashboardDTO` (dashboard recruteur).
- **Matching** (`jobs/matcher.py`) : nouvelle fonction `competences_score_structure(profil, competences_requises)` — pondère Obligatoire (poids 2) plus fort que Souhaitée (poids 1), vérifie le niveau candidat (`CompetenceCandidat`) contre `niveau_requis` quand renseigné (crédit plein si niveau atteint, ×0.6 si niveau insuffisant, ×0.8 si trouvé seulement via le texte libre `ProfilCandidat.competences` sans niveau vérifiable). `_calculer_score_algo()` bascule automatiquement sur ce scoring dès que l'offre a au moins une `CompetenceOffre` ; **repli intégral sur l'ancien scoring texte libre** (`competences_score()`, inchangé) pour toute offre n'ayant aucune compétence structurée — aucune régression sur les offres existantes tant que les recruteurs n'utilisent pas le nouveau builder.
- **Piège corrigé en testant** : `test_matcher.py` mocke `offre` avec `unittest.mock.Mock()` (pas `MagicMock`) — `offre.competences_requises.all()` sur un `Mock` simple n'est pas itérable, `list(...)` lève `TypeError`. Une première version avec un cache sur l'instance (`hasattr(offre, '_competences_requises_cache')`) échouait plus subtilement : `hasattr` sur un `Mock` retourne toujours `True` (auto-vivification d'attribut), donc le cache renvoyait un `Mock` non listifié sans jamais appeler `.all()`. Fix : `try/except TypeError` simple autour de `list(offre.competences_requises.all())`, sans cache — accepté comme legere requête supplémentaire par candidat scoré (déjà comparable aux N+1 existants documentés ailleurs dans ce fichier), la correction prime sur l'optimisation prématurée ici.
- **Frontend recruteur** (`CreateJob.jsx`) : nouveau builder sous le champ texte libre "Compétences requises" — autocomplete (réutilise `jobsService.searchCompetences`, même référentiel `CompetenceReferentiel` que "Mes compétences" candidat), toggle Obligatoire/Souhaitée, niveau optionnel, chips retirables. Payload `competences_requises` envoyé à la création (`jobs/creer/`). **Non fait cette session** : pas de builder équivalent dans la modale de modification d'offre (`DashboardRecruteur.jsx`) — l'édition backend (`UpdateOffreRecruteurAPIView`) le supporte déjà via API, seul le formulaire d'édition frontend n'a pas encore ce builder (à ajouter si demandé).
- **Frontend candidat** (`JobDetail.jsx`) : badges Obligatoire (rouge)/Souhaitée (neutre) affichés sous le texte libre des compétences, à partir de `job.competences_requises`.
- **Non fait** : pas d'indicateur "compétence déjà maîtrisée par le candidat" côté `DetailCandidature.jsx` (recruteur) — la donnée existe (matching déjà calculé), affichage visuel non construit cette session, périmètre non demandé explicitement.

**Tests** : nouveau `jobs/tests/test_competences_offre.py` (7/7 ✅ : création/unicité modèle, persistance via API, repli type_exigence invalide, 4 scénarios de matching dont le repli texte libre). Suite ciblée (`test_matcher`, `test_api_gestion_recruteur`, `test_serializers_offres`, `test_jobs_models`, `test_api_cvtheque`, `test_api_candidat`, `test_api_cvtheque_credits`, `test_api_paliers_gating`) et suite complète `jobs accounts` (410/410 ✅) relancées après chaque changement. `npx vite build` propre, `CreateJob.test.jsx`/`JobDetail.test.jsx` verts.

## 🆕 SESSION 03/09/2026 (suite 4) — Badges notifications non rafraîchis + throttling uploads/IA

**Contexte** : deux demandes distinctes de l'utilisateur le même jour, traitées à la suite.

**1. Badge de notifications non lues figé jusqu'à F5** (signalé avec capture — la boîte de réception recruteur affichait toujours "3" après avoir lu tous les messages). Cause : dans `RecruteurLayout.jsx`, `NavbarRecruteur.jsx`, `Navbar.jsx` (candidat), `CandidatLayout.jsx` et `BottomNavCandidat.jsx`, le `useEffect` qui charge le compteur de non-lus avait un tableau de dépendances vide (`[]`) ou ne dépendait que de `isLogged`/`role` — il ne se réexécutait jamais après une navigation, donc marquer un message comme lu sur `/notifications`/`/inbox` ne rafraîchissait jamais le badge affiché ailleurs (sidebar, cloche header, bottom nav). Fix : `location.pathname` ajouté aux dépendances des 5 `useEffect` concernés — le compteur se recharge à chaque changement de route, donc dès qu'on quitte la page de lecture.

**2. Throttling par endpoint — uploads de fichiers + génération IA** (demande explicite "limiter beaucoup comme l'upload documents et bcp autres, le generer ia, et bcp"). Détail complet dans `SECURITY.md` §17 — résumé :
- `ParserCVAPIView` (parsing CV, 1-2 appels Groq) n'avait **strictement aucun throttle** avant cette session — gap le plus sérieux, corrigé avec un nouveau `CVParserThrottle` dédié (10/h, scope `cv_parser`, plus strict que le scope `groq` partagé par les 5 autres fonctionnalités IA) + `FileUploadThrottle` pour la partie upload.
- Nouveau `FileUploadThrottle` (`jobs/throttles.py`, scope `file_upload`, 20/h, ignore GET) appliqué à tous les endpoints d'upload authentifiés qui n'avaient aucune limite : `DocumentCandidatAPIView`, `ProfilCandidatAPIView` (CV/photo), `UpdateProfilEntrepriseAPIView` (logo/bannière), `EntreprisePhotosAPIView`, `PostulerAPIView`.
- Nouveau `AdminFileUploadThrottle` (scope `admin_upload`, 100/h) appliqué aux 3 endpoints CMS admin avec upload (`ArticleAdminAPIView`/`ArticleAdminDetailAPIView`, `BanniereAccueilAdminAPIView`) — risque plus faible (`IsAdminUser`) mais gap réel avant cette session.
- **Documents privés candidat — 1 par type** (`DocumentCandidatAPIView.post`, `jobs/views/candidat_dashboard.py`) : un nouvel upload sur un `TypeDocument` déjà utilisé (y compris le bucket "sans type") est désormais refusé (400) tant que le document existant n'est pas supprimé — avant, un candidat pouvait accumuler un nombre illimité de documents du même type. Plafond global de 20 documents gardé en filet de sécurité supplémentaire.
- **Taille de fichier et types autorisés** : vérifiés déjà corrects avant cette session (validateurs modèle `FileExtensionValidator`/`validate_document_mime`/`validate_image_mime`/`validate_file_size`, 5 Mo documents/CV, 2-5 Mo images selon le champ) — aucun changement nécessaire là.

**Tests** : backend 410/410 ✅ (suite complète `jobs accounts`), `python manage.py check` propre, `npx vite build` propre.

---

## 🆕 SESSION 03/09/2026 — Retours revue croisée : score Formation, refonte Mes documents, visibilité CVthèque, partage de documents

**Contexte** : l'utilisateur a transmis, capture par capture, les retours d'une relecture croisée (Samira TABTI) du produit consignés dans un document Word. Traités un par un, avec clarification à chaque fois avant implémentation.

**1. Score de complétion "Formation" trompeur** (`CandidatDashboard.jsx::CATEGORIES`) : la catégorie affichait 67% pour un profil (BOUMAZA Rafik) dont les formations étaient pourtant bien renseignées — pas un bug de données, la catégorie mélangeait 3 critères indépendants (`Diplôme`, `Spécialité`, `Au moins une formation`) sous le même label "Formation", 2/3 = 67%. Fix : `Diplôme`/`Spécialité` déplacés vers la catégorie "Informations personnelles" (6 critères), "Formation" ne teste plus que `formations_detail.length > 0`.

**2. Refonte "Mes documents" — séparation CV professionnel / Documents privés** : le texte "jamais visible par les recruteurs" du bandeau entrait en contradiction avec la CVthèque (qui expose bien le CV via crédits) — signalé par la relectrice avec la structure cible exacte (CV professionnel visible selon confidentialité / Documents privés diplôme+attestation+certificat+pièce justificative+autres jamais visibles sans autorisation). `MesDocuments.jsx` réécrit en 2 sections distinctes :
- **CV professionnel** : nouvelle carte en haut de page consommant directement `ProfilCandidat.cv_pdf` (upload/remplacer/supprimer via `profilService.updateProfil`, même endpoint que la page Profil) — n'existait auparavant que dans "Mon profil", absent de "Mes documents".
- **Documents privés** : la liste existante (`DocumentCandidat`/`TypeDocument`), renommée, bandeau reformulé sans ambiguïté. Le type "CV" du référentiel `TypeDocument` est **resté actif** (décision explicite de l'utilisateur — utile pour un CV alternatif, ex. version anglaise, distinct du CV principal du profil).

**3. Nouveau : toggle candidat "Déblocage par les recruteurs"** — la case CV professionnel promettait une visibilité "selon vos paramètres de confidentialité" qui n'existait pas encore comme réglage réel (audité : `consentement_cvtheque` existant est le consentement RGPD du **recruteur** avant d'ouvrir la CVthèque, rien côté candidat). Décision utilisateur sur la portée : **le profil reste toujours visible/recherchable** dans la CVthèque, seul le **déblocage par crédit** est bloqué si désactivé.
- Backend : `ProfilCandidat.visible_cvtheque` (BooleanField, défaut `True` — migration `0100`), exposé dans `ProfilCandidatDTO`, modifiable via le PUT `jobs/profil/` existant (déjà générique, aucun code spécial nécessaire). `DeverrouillerCandidatAPIView.post()` (`jobs/views/credits.py`) vérifie `candidat.profil_candidat.visible_cvtheque` **avant** de consommer un crédit — 403 `PROFIL_NON_VISIBLE` si désactivé. Les déblocages déjà acquis (`AccesCandidatDebloque`, "à vie") restent valides quel que soit l'état du toggle — celui-ci ne bloque que les **nouveaux** déblocages.
- Frontend : switch dans la carte CV professionnel de `MesDocuments.jsx` (`profilService.updateProfil` avec `visible_cvtheque` en FormData, comme les autres champs booléens du profil).
- **Piège de déploiement rencontré en direct** : la migration `0100` avait été écrite mais pas appliquée à la base de dev réelle avant que l'utilisateur teste — `PUT /api/jobs/profil/` plantait en `ProgrammingError` (colonne `visible_cvtheque` inexistante). Corrigé par `python manage.py migrate jobs`. **Rappel pour toute session future : toujours appliquer `migrate` avant de dire qu'une fonctionnalité avec nouveau champ modèle est prête à tester**, ne pas se contenter de générer la migration.

**4. Nouveau : partage ponctuel d'un Document privé avec une entreprise** — le bandeau "Documents privés" disait "jamais visibles sans autorisation" mais aucun mécanisme ne permettait de donner cette autorisation (texte non honoré). Demande utilisateur explicite d'ajouter ce mécanisme plutôt que de simplement retirer la mention.
- **Nouveau modèle `PartageDocument`** (`document` FK `DocumentCandidat`, `entreprise` FK `ProfilEntreprise`, `unique_together` — migration `0100`, même migration que le toggle ci-dessus) — autorisation explicite et révocable, jamais un partage global.
- **Entreprises éligibles restreintes** (`_entreprises_relation_candidat()`, `jobs/views/candidat_dashboard.py`) : seules les entreprises avec qui le candidat a déjà une relation réelle (candidature envoyée OU profil débloqué via crédit CVthèque) — décision pour éviter d'exposer un annuaire libre de toutes les entreprises de la plateforme dans le sélecteur de partage.
- **Backend candidat** : `GET jobs/documents/<id>/entreprises-eligibles/` (liste + flag `deja_partage`), `POST`/`DELETE jobs/documents/<id>/partager/(<entreprise_id>/)`. `DocumentCandidatAPIView.get()` inclut désormais `partages: [{entreprise_id, nom_entreprise}]` par document.
- **Backend recruteur** : `GET jobs/cvtheque/candidats/<candidat_id>/documents-partages/` (liste des documents partagés avec l'entreprise du recruteur connecté), `GET .../documents-partages/<doc_id>/fichier/` (sert le fichier via `FileResponse`, uniquement si un `PartageDocument` existe pour cette entreprise — même pattern de vérification d'accès que `CandidatFichierPriveAPIView` pour le CV/photo, pas une URL `/media/` publique).
- **Frontend candidat** (`MesDocuments.jsx`) : bouton "Partager" par document ouvre un panneau inline listant les entreprises éligibles (chargées à la demande), toggle Partager/Partagé ✓ par entreprise, badge "Partagé avec N" sur le document.
- **Frontend recruteur** (`GestionOffre/useGestionOffre.js` + `DetailCandidature.jsx`) : nouveau state `documentsPartages`, fetché à chaque changement de `selectedCandidature` (même effet que le reset de l'analyse IA), affiché en pills vertes à côté des boutons "CV PDF"/"CV Rapide" dans l'en-tête du détail candidature — lien direct vers `documentPartageFichierUrl()` (nouveau helper `utils/mediaUrl.js`, même famille que `candidatFichierUrl`).
- **Surfacé aussi dans la CVthèque** (ajouté après retour utilisateur "je sais pas où le trouver" — le premier passage n'affichait les pills que dans `GestionOffre`, qui exige une vraie candidature déjà reçue ; la CVthèque est l'endroit naturel où un recruteur regarde un profil juste débloqué, sans candidature) : `CVTheque.jsx` a le même `useEffect` (fetch sur `selectedCandidat?.user_id`) et les mêmes pills vertes, juste après le bloc CV PDF/Débloquer du panneau détail.
- **Non fait (périmètre non demandé)** : pas de notification au candidat quand un recruteur consulte un document partagé, pas d'expiration automatique d'un partage (révocation manuelle uniquement).

**🐛 Bugs trouvés en testant en direct, corrigés le jour même** :
1. **`profilService.updateProfil()` renvoie `{message, profil}`, pas le profil** — `MesDocuments.jsx` faisait `setProfil(updated)` avec la réponse brute du PUT au lieu de `updated.profil` (ou d'un refetch), cassant silencieusement l'affichage du CV fraîchement uploadé ("Aucun CV pour l'instant" persistant après upload réussi) et la lecture de `visible_cvtheque` par le toggle. Fix : `refetchProfil()` (un `GET jobs/profil/` après chaque mutation) — même pattern déjà utilisé par `ProfilCandidat/useProfilCandidat.js`, jamais consommer directement la réponse d'un PUT comme si c'était l'objet complet.
2. **Migration `0100` pas appliquée à la base de dev** au moment du premier test utilisateur → `ProgrammingError` (colonne `visible_cvtheque` inexistante) sur `PUT /api/jobs/profil/`. Corrigé par `python manage.py migrate jobs`. **Rappel pour toute session future : toujours lancer `migrate` avant d'annoncer qu'une fonctionnalité avec un nouveau champ modèle est prête à tester.**
3. **Piège récurrent (déjà documenté dans ce fichier pour le chantier CMS) reconfirmé** : `CVTheque.test.jsx` cassé après l'ajout de `jobsService.getDocumentsPartages` — mock incomplet (`getDocumentsPartages` non défini) → `TypeError` non catché dans un `useEffect`. Fix : ajouté au mock (`vi.fn().mockResolvedValue([])`).

**Tests** : `python manage.py check` propre, `npx vite build` propre, `GestionOffre.test.jsx` 11/11 ✅, `CVTheque.test.jsx` 15/15 ✅ (après fix du mock). Pas de test dédié pour `MesDocuments.jsx` (aucun n'existait avant cette session).

## 🆕 SESSION 03/09/2026 (suite) — CVthèque : masquage nom employeur + nom complet tant que non débloqué

**Contexte** : capture d'écran utilisateur montrant qu'un profil non débloqué dans la CVthèque affichait déjà, gratuitement, le nom complet du candidat ET le nom exact de son employeur actuel ("SOMIZ Société de Maintenance Industrielle") avec dates et missions détaillées — seules les coordonnées (email/tél) étaient gatées. Avis donné : c'est trop généreux, un recruteur peut déjà identifier et recontacter le candidat par ses propres moyens sans jamais dépenser de crédit — le nom de l'employeur est l'info la plus identifiante d'une expérience. Validé par l'utilisateur.

**Backend** (`jobs/serializers/profils.py::ProfilCandidatDTO`) :
- `get_last_name()` : tronqué à l'initiale (`"T."`) tant que `_peut_voir_coordonnees(obj)` est `False` — même helper déjà utilisé pour email/téléphone/linkedin/github, réutilisé pour rester cohérent avec la logique de déblocage existante. Le prénom reste toujours affiché (repère de navigation dans la liste).
- `experiences_detail` passe de `ExperienceSerializer(many=True, read_only=True)` (champ déclaratif) à un `SerializerMethodField` (`get_experiences_detail`) — sérialise normalement puis remplace `entreprise` par `"Entreprise non communiquée"` sur chaque expérience si non débloqué. Titre du poste, dates et description restent visibles (aperçu suffisant pour donner envie de débloquer, sans donner l'identité de l'employeur).
- **Piège évité** : `ExperienceSerializer` est aussi consommé directement par `CandidatInfoDTO` (`jobs/serializers/candidatures.py::get_experiences`) pour l'affichage d'une **vraie candidature reçue** côté recruteur (`GestionOffre`) — ce contexte n'a AUCUNE notion de crédit/déblocage, l'entreprise doit toujours y être visible. `_peut_voir_coordonnees()` repose sur `self.context.get('unlocked_ids')`/`is_premium` : si le masquage avait été mis directement dans `ExperienceSerializer` (partagé), l'appel `ExperienceSerializer(...)` sans context de `CandidatInfoDTO` (context vide par défaut) aurait halluciné `is_premium=False` → masqué à tort le nom de l'employeur sur une candidature réelle déjà reçue. Évité en gardant `ExperienceSerializer` inchangé et en faisant le masquage un cran au-dessus, dans `ProfilCandidatDTO` uniquement (jamais instancié pour `CandidatInfoDTO`).
- Aucune requête supplémentaire : `get_experiences_detail` réutilise `obj.experiences_detail.all()` (déjà `prefetch_related` par `CVThequeView`), même comportement de requête que le champ déclaratif remplacé.

**Tests** : `test_api_cvtheque.py`/`test_api_cvtheque_credits.py`/`test_api_paliers_gating.py`/`test_api_recruteur.py`/`test_profiles_models.py` (40/40 ✅), `test_api_candidat.py` (6/6 ✅ — confirme que le candidat consultant son propre profil voit toujours son nom complet et ses employeurs, `context={'is_premium': True}` sur `ProfilCandidatAPIView.get()` couvre ce cas), `test_api_cms.py` (44/44 ✅), `python manage.py check` propre.

**Non fait (à discuter si besoin)** : pas de masquage de la photo de profil ni de la wilaya/commune précise (seulement wilaya déjà, pas de commune fine actuellement affichée sans déblocage — à vérifier si jugé encore trop permissif) ; pas de masquage des formations/établissement (jugé moins identifiant qu'un employeur nommé).

## 🆕 SESSION 03/09/2026 (suite 2) — Bug réel : suppression impossible dans "Mes documents" (415)

**Contexte** : signalé par l'utilisateur avec capture — clic sur la corbeille d'un document dans "Mes documents" affichait un popup rouge "Type de média « application/json » non supporté." et le document restait dans la liste après rafraîchissement (vérifié explicitement avant de creuser, pas supposé).

**Cause identifiée** : `DocumentCandidatAPIView` (`jobs/views/candidat_dashboard.py`) avait `parser_classes = (MultiPartParser, FormParser)` (nécessaire pour le POST d'upload) mais **pas** `JSONParser` — or `jobsService.supprimerDocument()` envoie un DELETE avec un corps JSON (`api.delete(url, { data: { id } })`, comportement par défaut d'axios). Sans `JSONParser` dans la liste, DRF rejette la requête en 415 *Unsupported Media Type* **avant même d'atteindre `delete()`** — le message affiché est la traduction française du message DRF standard (projet configuré `LANGUAGE_CODE='fr'` depuis la session mots de passe du 28/07/2026), pas un texte de notre code (recherché, absent du repo).

**Fix** : `JSONParser` ajouté à `parser_classes`. Le POST (upload, multipart) et le DELETE (JSON) passent maintenant tous les deux.

**Nouveau `jobs/tests/test_api_documents.py`** (n'existait pas avant — aucune couverture de test sur cet espace, malgré la fonctionnalité déjà en prod depuis la session "Prendre rendez-vous/Mes documents") : upload+liste, **suppression via corps JSON** (le test qui aurait attrapé ce bug avant la mise en prod), et suppression d'un document appartenant à un autre candidat refusée (404, scoping vérifié).

**Tests** : `test_api_documents.py` 3/3 ✅ (nouveau), `python manage.py check` propre.

## 🆕 SESSION 03/09/2026 (suite 3) — Bug réel : crash "Une erreur est survenue" en partageant un document tout juste uploadé

**Contexte** : signalé par l'utilisateur — partager un diplôme juste après l'avoir uploadé faisait planter toute la page "Mes documents" (ErrorBoundary générique "Une erreur est survenue").

**Cause** : `DocumentCandidatAPIView.post()` (réponse de l'upload) ne renvoyait pas le champ `partages` — contrairement à `GET jobs/mes-documents/` qui l'inclut depuis la session précédente (feature de partage ponctuel). `MesDocuments.jsx::handleTogglePartage` fait `d.partages.filter(...)` sans garde — sur un document tout juste uploadé (jamais rechargé depuis le GET), `d.partages` était `undefined` → `TypeError` non catché → crash React.

**Fix** : `partages: []` ajouté à la réponse `201` du POST (`jobs/views/candidat_dashboard.py`). Défense en profondeur côté frontend : `d.partages || []` avant `.filter()`/spread dans `handleTogglePartage`.

**Tests** : `python manage.py check` propre, `npx vite build` propre. Pas de nouveau test dédié (le scénario exact — upload puis partage immédiat sans refetch — nécessiterait un test frontend, aucun n'existe encore pour `MesDocuments.jsx`).

## 🆕 SESSION 03/09/2026 (suite 4) — Fix overflow pills documents + audit sécurité exposition profil candidat

**Overflow visuel** (`DetailCandidature.jsx`, `CVTheque.jsx`) : les pills de documents partagés (nom de fichier réel, potentiellement long) débordaient de la barre d'onglets sans retour à la ligne ni troncature — signalé par capture (nom coupé "Cv_FILALI_LP7snqc.pd…" + scrollbar parasite). Fix : `flex-wrap` sur les conteneurs, chaque pill en `max-w-40 min-w-0` avec `<span className="truncate">`, tooltip (`title`) conservant le nom complet + date de partage.

**Question utilisateur — "un document uploadé dans Mes documents remplace-t-il le CV du profil ?"** Réponse : non, `DocumentCandidat` (Documents privés) et `ProfilCandidat.cv_pdf` (CV professionnel) sont deux tables/colonnes totalement indépendantes. La confusion venait d'ailleurs : la pill "CV PDF" dans `DetailCandidature.jsx` lit `candidatData?.cv_pdf`, qui vient de `Candidature.profil_snapshot` — un **instantané figé au moment de la candidature** (décision déjà actée du projet, voir tableau "Décisions techniques" → "Snapshot"), jamais rafraîchi ensuite. Une vieille candidature (ex. juin 2026) affiche le CV tel qu'il était CE jour-là, pas le CV actuel du profil — remplacer/ajouter un CV aujourd'hui ne met à jour aucune candidature déjà envoyée.

**Audit sécurité — exposition des champs du profil candidat au recruteur** (déclenché par la question "est-ce que tout ce qui est dans Mon profil est envoyé au recruteur ?", sous-agent Explore dédié) : comparaison ligne à ligne entre `CandidatInfoDTO` (candidature réelle reçue, `jobs/serializers/candidatures.py`) et `ProfilCandidatDTO` en contexte CVthèque (`jobs/serializers/profils.py`, avant/après déblocage crédit).
- **NIN** : vérifié correctement protégé de bout en bout — `get_nin()` ne renvoie une valeur que si `context.get('include_nin')` est vrai, et seul `ProfilCandidatAPIView.get()` (le candidat consultant son propre profil) passe ce flag. Ni la CVthèque ni une candidature reçue ne l'exposent, jamais. Aucun changement nécessaire, juste confirmé.
- **🐛 2 failles réelles trouvées et corrigées** : `date_naissance` et `adresse` (rue complète) étaient renvoyées à **tout** recruteur consultant la CVthèque, **sans déblocage par crédit** — contrairement à email/téléphone/nom complet/nom d'employeur/linkedin/github qui sont déjà correctement masqués tant que `_peut_voir_coordonnees(obj)` est faux. Un oubli dans la liste des champs masqués lors des sessions précédentes (crédits CVthèque, masquage nom/employeur), pas une régression de cette session. Fix : `get_date_naissance()` et `adresse` (converti de champ direct en `SerializerMethodField` `get_adresse()`) suivent maintenant le même gardien `_peut_voir_coordonnees()` — `wilaya`/`commune` restent visibles sans déblocage (suffisant pour l'aperçu géographique), seule l'adresse précise (rue) est gatée, cohérent avec le traitement déjà appliqué au téléphone.
- **Vérifié sans problème** : `profil_snapshot` (figé à la candidature) ne contient ni NIN ni date de naissance — pas de contournement du masquage par ce biais. `ProfilCandidatAdminSerializer` (`fields='__all__'`) expose tout mais n'est consommé que par les vues d'admin plateforme (staff Taftech), jamais par un recruteur.

**Tests** : `python manage.py check` propre, `npx vite build` propre, `test_api_cvtheque.py`/`test_api_cvtheque_credits.py`/`test_api_paliers_gating.py`/`test_api_candidat.py`/`test_profiles_models.py` (37/37 ✅, confirme qu'un candidat consultant son propre profil voit toujours sa date de naissance/adresse complètes — `context={'is_premium': True}` couvre ce cas).

**Suite (même session) — 2 questions de suivi de l'utilisateur sur l'audit** :
- **`sexe`** : confirmé exposé sans masquage (comme diplôme/mobilité/situation — un critère de profil, pas une coordonnée de contact). Décision : **laissé tel quel**, pas de fix demandé après clarification.
- **`salaire_souhaite`** : demande explicite de masquage — convertie en `SerializerMethodField` (`get_salaire_souhaite`) gardée par `_peut_voir_coordonnees()`, même pattern que `adresse`/`date_naissance`. Raison : un recruteur ne doit pas connaître la prétention salariale du candidat sans avoir débloqué le profil (levier de négociation).
- **Investigation "TABTI Samira" affichée 3-5 fois dans la CVthèque"** (capture initiale) : **pas un bug**. `ProfilCandidat` a une contrainte `OneToOne` stricte avec `User`, aucun doublon de profil possible pour un même compte. Vérifié en base (`python manage.py shell`) : ce sont **5 comptes distincts réels**, tous nommés "Samira TABTI" (`meriembelamri432@gmail.com`, `zoheir.fll31@gmail.com`, `stabti@outlook.fr`, `miratabti@gmail.com` RECRUTEUR, `zoheir.fl313131@gmail.com`) — dont 2 sont manifestement des comptes de test de l'utilisateur laissés en base. Utilisateur a refusé la suppression (`non`) — **comptes de test non nettoyés, laissés tels quels sur décision explicite**, aucune action prise sur les données.

**Tests** : `python manage.py check` propre, `test_api_cvtheque.py`/`test_api_cvtheque_credits.py`/`test_api_paliers_gating.py`/`test_api_candidat.py` (29/29 ✅ après le fix `salaire_souhaite`).

## 🆕 SESSION 02/09/2026 — Fix boîte de réception candidat/recruteur mélangées

**Contexte** : signalé par l'utilisateur avec une capture d'écran — sur `/inbox` (portail candidat), la liste affichait des notifications recruteur (« Candidat recommandé », « Nouvelle candidature ») mélangées aux vraies notifications candidat. Ne se produit que pour un compte qui a les deux rôles (candidat ET propriétaire/membre d'une entreprise) — ce qui est le cas du compte de test de l'utilisateur.

**Root cause** : `Notification.destinataire` est un FK `User` générique consommé par un seul endpoint (`GET jobs/notifications/`, `NotificationListAPIView`) sans aucun filtre par portail — juste `filter(destinataire=request.user)`. Les 3 événements recruteur (`CANDIDATURE_SPONTANEE`/`NOUVELLE_CANDIDATURE`/`CANDIDAT_RECOMMANDE`, ajoutés session 29/08/2026 « Centre de notifications recruteur ») et les événements candidat (`INFO`/`ENTRETIEN`/`RETENU`/`REFUS`/`ALERTE`) partagent la même table sans distinction de portail — un compte avec les deux rôles reçoit tout dans la même boîte, quel que soit le portail consulté.

**Fix backend** (`jobs/views/notifications.py`) : nouveau filtre `_filtrer_par_portail(qs, portail)` — `portail=recruteur` ne garde que les 3 types recruteur, sinon (`candidat`, défaut) les exclut. Appliqué sur `NotificationListAPIView.get()` et `MarkAllNotificationsReadAPIView.post()` (lit `request.query_params.get('portail')`) — pas nécessaire sur `MarkNotificationReadAPIView`/`DeleteNotificationAPIView` (déjà scopés par `id` + `destinataire`, un portail ne peut pas agir sur la notification de l'autre par erreur).

**Fix frontend** : `candidatService.getNotifications(portail = "candidat")` et `markAllNotificationsAsRead(portail = "candidat")` passent désormais `portail` en query param. Les 3 emplacements recruteur passent explicitement `"recruteur"` : `NotificationsRecruteur.jsx` (liste + marquer tout lu), `NavbarRecruteur.jsx` et `RecruteurLayout.jsx` (badge compteur). Les 4 emplacements candidat (`BoiteReception.jsx`, `CandidatLayout.jsx`, `Navbar.jsx`, `BottomNavCandidat.jsx`) gardent le défaut `"candidat"`, aucun changement de code nécessaire.

**Tests** : backend 403/403 ✅ (suite complète `jobs accounts`), `npx vite build` propre.

---

## 🆕 SESSION 29/08/2026 (suite) — Système de crédits CVthèque

**Contexte** : retour utilisateur sur la CVthèque — un palier Business+ donnait accès illimité aux coordonnées de tous les candidats de la base, sans aucune notion de valeur/rareté. Décision (brainstorming complet, spec `docs/superpowers/specs/2026-08-29-credits-cvtheque-design.md`, plan `docs/superpowers/plans/2026-08-29-credits-cvtheque.md`) : système de crédits façon Emploitic — 1 crédit débloque **coordonnées + CV ensemble** pour un candidat donné, **à vie**, **partagé par toute l'équipe** de l'entreprise. Quota mensuel par palier + packs de crédits achetables (jamais expirés) en complément.

**Décision de résolution d'ambiguïté prise en cours d'implémentation** : le champ existant `Palier.acces_coordonnees` (booléen, `False` pour STARTER dans le seed) contredisait la décision spec "Starter+ minimum peut dépenser des crédits" — tranché que ce champ ne gate plus la visibilité des coordonnées dans `CVThequeView`/`ProfilCandidatDTO` (remplacé entièrement par le déblocage par crédit), mais reste inchangé pour `InviterCandidatCVThequeAPIView` (fonctionnalité "Inviter à postuler", Pro+, explicitement hors périmètre) et le flag `acces_coordonnees` du dashboard.

**Backend** :
- `Palier.limite_cv_mois` → `Palier.credits_mois` (renommage, même sémantique nullable=illimité) — migrations `0093`-`0095` (add → backfill → remove, même pattern que la migration `0090` historique de ce projet). **Valeurs ajustées en base après coup** (données, pas migration — modifiable sans code via `/admin-taftech/paliers`) : PRO et BUSINESS avaient hérité de `limite_cv_mois=None` (illimité, valeur pré-existante avant le système de crédits) — reproduisait le problème initial ("un compte premium débloque toute la CVthèque") juste décalé vers les paliers payants. Corrigé : STARTER=10, PRO=30, BUSINESS=75, ENTERPRISE=illimité (seul palier "sur devis", justifie l'absence de plafond).
- Nouveaux modèles (migration `0096`) : `CreditPack` (nom, credits, prix_da, actif, ordre — seedé migration `0098` avec 10 crédits/2500 DA, 25/5500 DA, 50/9900 DA), `AccesCandidatDebloque` (entreprise, candidat, source MENSUEL/ACHETE, `unique_together` — le déblocage permanent), `PaiementCreditPack` (historique, `numero_facture` préfixe `TT-CR-` distinct de `PaiementAbonnement`), `AbonnementEntreprise.credits_achetes_restants` (pool acheté, jamais reset). `EquipeActionLog.ACTIONS` gagne `DEBLOQUER_CANDIDAT` (migration `0097`).
- `jobs/credits_utils.py` (nouveau) — `credits_disponibles(entreprise)` (recompte le quota mensuel depuis les logs du mois, jamais un compteur stocké, même principe que `quota_cv_atteint` avant lui), `deverrouiller_candidat(entreprise, candidat)` (idempotent, consomme le mensuel puis l'acheté). **Protégé contre le double-décompte concurrent** via une `UPDATE ... WHERE credits_achetes_restants > 0` atomique (`F()` expression + `.filter().update()`) plutôt qu'un read-modify-write Python — trouvé et corrigé en revue de code avant même le premier déploiement.
- `DeverrouillerCandidatAPIView` (`POST jobs/cvtheque/candidats/<id>/debloquer/`) — 403 `PALIER_INSUFFISANT` (Gratuit), 403 `CREDITS_EPUISES`, log `EquipeActionLog`.
- `CandidatFichierPriveAPIView` (téléchargement CV) : `_acces_autorise()` simplifié — ne compte plus `TelechargementCV` (devenu mort, laissé en base sans consommateur, pas supprimé), vérifie simplement l'existence d'un `AccesCandidatDebloque`. Réordonné pour vérifier l'accès **avant** l'existence du fichier (403 avant 404 pour un non-autorisé, cohérent avec le test du plan).
- `CVThequeView`/`ProfilCandidatDTO` : nouveau champ `est_debloque` par candidat (calculé via un `unlocked_ids` précomputé en une requête par la vue, pas de N+1), coordonnées masquées par candidat individuel. Réponse expose `credits_disponibles: {mensuel_restant, achetes_restant}` à la place de l'ancien `is_premium`.
- Achat de packs : `CreditPackCheckoutAPIView` (Chargily, réutilise le webhook unique existant via un nouveau discriminant `metadata.pack_id`), `CreditPackPublicAPIView`/`CreditPackAdminAPIView` (CRUD, pattern `PaliersAdminAPIView`).
- `DashboardRecruteurAPIView` expose `credits_mensuel_restant`/`credits_achetes_restant`.

**🐛 Bug trouvé en testant en direct (capture d'écran utilisateur)** : les cartes tarifs de `AbonnementsPage.jsx` (haut de page, pas le tableau comparatif) lisaient encore `p.limite_cv_mois` (champ supprimé) → affichaient "Téléchargement CV illimité" sur tous les paliers peu importe le vrai plafond. La puce "Coordonnées candidats" ✓/✗ (sur `acces_coordonnees`) était aussi devenue trompeuse — Starter a maintenant accès aux coordonnées via crédits, ce n'est plus un booléen par palier. Corrigé : puce crédits/mois basée sur `credits_mois`, puce "Accès à la CVthèque" neutre pour tous (navigation incluse dans tout palier actif).

**Frontend** :
- `AdminCreditPacks.jsx` (nouveau panel `/admin-taftech/credit-packs`, CRUD complet, pattern `AdminFaq.jsx`).
- `AbonnementsPage.jsx` : nouvelle section "Crédits CVthèque" (solde + achat des 3 packs).
- `CVTheque.jsx` : bandeau crédits remplace le bandeau/badge Premium binaire ; bouton "Débloquer ce profil (1 crédit)" dans le panneau détail et sur le bloc CV ; `confirmToast` avant dépense. **L'overlay plein panneau "Accès Premium requis"** (qui bloquait toute la fiche candidat — expériences, formations, pas seulement les coordonnées — pour tout palier sans `acces_coordonnees`) a été **retiré entièrement** : la navigation/consultation du profil est désormais incluse dans n'importe quel palier actif, seul le déblocage coûte un crédit — ce comportement n'était pas explicité dans le plan initial, découvert en implémentant. Le bouton "Inviter à postuler" (Pro+, hors périmètre crédits) est reraccordé à un nouveau flag `acces_coordonnees` récupéré via `jobsService.getDashboard()` au montage, puisque `CVThequeView` n'expose plus `is_premium`.

**Exécuté en Subagent-Driven Development pour les 3 premières tâches (modèles + migrations, revue à deux étages incluant un tour de correction sur la race condition), puis directement par le contrôleur pour les tâches 5 à 13** (bascule décidée par l'utilisateur en cours de session pour limiter la consommation de tokens face à la limite de session Claude Code).

**Tests** : backend 353/353 ✅ (`python manage.py test jobs accounts`, `python manage.py check` propre). Frontend 424/425 — le seul échec (`RecruteurLayout.test.jsx` attendant le libellé "Messages") est **préexistant, confirmé sans rapport** avec cette session (le lien est déjà renommé en "Candidatures spontanées" dans le code, indépendamment de ce chantier). `npx vite build` propre.

**Non fait / non vérifié** : pas de vérification manuelle en conditions réelles dans un navigateur (session automatisée sans accès UI) — à faire avant mise en prod : déblocage réel, persistance après rechargement, achat de pack via Chargily en mode test, CRUD admin des packs. Pas de rétro-déblocage des profils déjà consultés avant cette session (décision spec assumée). `TelechargementCV`/`quota_cv_atteint` laissés en base sans consommateur (code mort, non supprimés — hors périmètre du plan).

## 🆕 SESSION 29/08/2026 (suite 4) — Candidatures des offres clôturées masquées dans la liste globale

**Contexte** : la page sidebar "Candidatures" (`CandidaturesListPage.jsx`) agrégeait `dash.offres` sans filtrer sur `est_cloturee` — les candidatures d'offres archivées depuis longtemps polluaient la liste globale au même titre que les offres actives. Décision utilisateur : les masquer de cette liste, elles restent consultables en ouvrant l'offre directement (fiche offre / onglet "Archivées" de la page Offres).

- `CandidaturesListPage.jsx` : nouveau `offresOuvertes = offres.filter(o => !o.est_cloturee)`, utilisé pour construire la liste de candidatures ET peupler le `<select>` de filtre par offre (une offre clôturée n'apparaît plus non plus dans ce dropdown). Sous-titre de page mis à jour pour expliciter où retrouver les candidatures d'une offre clôturée.
- **Candidats recommandés — vérifié, déjà correct, aucun changement nécessaire** : la page dédiée `/candidats-recommandes` (`CandidatsRecommandesAPIView`, backend) et le widget compact du dashboard (`DashboardRecruteur.jsx::candidatsRecommandesTous`) excluaient déjà les offres `est_cloturee=True` depuis la session du 25/08/2026 — confirmé en relisant le code avant de conclure qu'il n'y avait rien à faire ici.
- **Non touché (périmètre explicitement limité)** : Recrutements et Évaluations gardent toutes les offres (y compris clôturées) — ce sont des historiques (qui a été embauché, quelles notes ont été données), pas des listes d'action où une offre clôturée devrait disparaître.

**Tests** : `npx vite build` propre (pas de test dédié existant pour cette page).

## 🆕 SESSION 29/08/2026 (suite 3) — Suppression de notifications + bouton évaluation dans la liste

**Contexte** : suite directe des 2 fonctionnalités précédentes (centre de notifications, suppression d'évaluation) — ajustements demandés après tests en direct par l'utilisateur.

**Suppression de notifications (candidat + recruteur)** : `DeleteNotificationAPIView` (`DELETE jobs/notifications/<id>/supprimer/`, `jobs/views/notifications.py`) — scopé `destinataire=request.user`, réutilisable des deux côtés. Bouton corbeille (`confirmToast`) sur chaque ligne de la liste ET dans le panneau détail, dans `BoiteReception.jsx` (candidat) et `NotificationsRecruteur.jsx` (recruteur). `candidatService.deleteNotification()`.

**Bouton "Supprimer" une évaluation, aussi visible directement dans la liste** : la 1ʳᵉ version (session précédente) ne mettait le bouton que dans l'onglet "Évaluation" du détail d'une candidature (`DetailCandidature.jsx`) — retrouvé par l'utilisateur comme absent de la page sidebar "Évaluations" (`EvaluationsPage.jsx`), qui liste pourtant toutes les candidatures évaluées. Ajouté : colonne "Actions" en bout de tableau, corbeille par ligne (`handleSupprimerEvaluation`, `confirmToast`, `jobsService.supprimerEvaluation`), réservé `peutFaire("UTILISATEUR")` — met à jour l'état local (`offres`) directement sans recharger toute la liste.

**Fix lien "Espace recruteur" ouvrait un nouvel onglet** : `Navbar.jsx` (desktop + menu mobile) avait `target="_blank" rel="noopener noreferrer"` sur le lien `/recruteurs` — jugé non voulu par l'utilisateur ("je veux qu'il me laisse sur la même page"), retiré des deux occurrences.

**Tests** : `npx vite build` propre à chaque étape, `python manage.py check` propre, `BoiteReception.test.jsx` 4/4 ✅, `Navbar.test.jsx` 5/5 ✅.

## 🆕 SESSION 29/08/2026 (suite) — Suppression d'évaluation d'entretien

**Contexte** : après avoir ajouté la suppression de notifications, audit des autres listes utilisateur sans suppression — un seul cas jugé légitime (pas un bug) : une évaluation d'entretien (notes 4 critères + commentaire, stockées directement sur `Candidature`) ne pouvait être que réécrite, jamais effacée. Décision : **effacer les champs d'évaluation, pas supprimer la candidature** — contrairement aux notifications, la candidature elle-même reste une trace de recrutement.

- Backend : `EvaluerCandidatureAPIView.delete()` (`jobs/views/candidatures.py`) — remet `note_technique/communication/motivation/experience/globale` à `None` et `commentaire_evaluation` à `''`, mêmes contrôles d'accès que le `patch()` existant (`get_entreprise_for_user` + `get_membre_role` dans `_ROLES_ACTION`, INVITE bloqué), log `EquipeActionLog`.
- Frontend : `recruteurService.supprimerEvaluation()`, hook `useGestionOffre.js::supprimerEvaluation` (confirmToast), bouton "Supprimer" (rouge, à côté de "Modifier la note") dans l'onglet Évaluation de `DetailCandidature.jsx`, visible seulement `peutFaire("UTILISATEUR")`.

**Tests** : backend `test_api_gestion_recruteur` 8/8 ✅, frontend `GestionOffre.test.jsx` 11/11 ✅, `npx vite build` propre, `python manage.py check` propre.

## 🆕 SESSION 29/08/2026 — Centre de notifications recruteur

**Contexte** : le portail recruteur n'avait aucun système de notification transverse — seul le badge "Messages" (candidatures spontanées non lues) existait dans la sidebar. Demande utilisateur : être averti de tout événement de recrutement (candidature spontanée, nouvelle candidature sur une offre, nouveau candidat recommandé). Spec : `docs/superpowers/specs/2026-08-29-notifications-recruteur-design.md`.

**Décision** : réutilisation du modèle `Notification` existant (`jobs/models.py`) — jusque-là documenté "boîte de réception du candidat" mais `destinataire` est un FK `User` générique, déjà consommé par une API `IsAuthenticated` sans filtre de rôle (`GET jobs/notifications/`, `PATCH jobs/notifications/<id>/lire/`). Pas de nouveau modèle.

**Backend** :
- `Notification.TYPES_NOTIF` : 3 nouveaux types — `CANDIDATURE_SPONTANEE`, `NOUVELLE_CANDIDATURE`, `CANDIDAT_RECOMMANDE`. `type_notif` élargi `max_length=20`→`25` (`CANDIDATURE_SPONTANEE` fait 21 caractères), migration `0092`.
- Nouveau helper `jobs/views/equipe.py::_notifier_equipe(entreprise, type_notif, titre, message)` — crée une `Notification` par destinataire (`entreprise.user` + tous les `MembreEquipe.user`, dédupliqués via un `set`, `bulk_create`) — **toute l'équipe** reçoit sa propre notification (PROPRIETAIRE/ADMIN/UTILISATEUR/INVITE), cohérent avec l'accès déjà partagé à la CVthèque/candidatures.
- Hooks ajoutés (aucun nouvel endroit de logique métier, juste des appels en plus) :
  - `PostulerAPIView.post` (`jobs/views/candidatures.py`) : `NOUVELLE_CANDIDATURE` à chaque candidature ; `CANDIDAT_RECOMMANDE` en plus si `score_matching >= 80` (l'email "Top Profil" existant à ce même seuil reste inchangé, les deux coexistent).
  - `PostulerRapideAPIView.post` : `NOUVELLE_CANDIDATURE` (jamais recommandé — score toujours 0 en rapide).
  - `EnvoyerCandidatureSpontaneeAPIView.post` (`jobs/views/recruteur.py`) : `CANDIDATURE_SPONTANEE`.
- Nouvel endpoint `POST jobs/notifications/marquer-toutes-lues/` (`MarkAllNotificationsReadAPIView`) — générique, réutilisable côté candidat aussi (`Notification.objects.filter(destinataire=request.user, lue=False).update(lue=True)`).

**Frontend** :
- `candidatService.js` : nouvelle méthode `markAllNotificationsAsRead()` — `getNotifications`/`markNotificationAsRead` déjà génériques, réutilisés tels quels.
- Nouvelle page `Pages/Recruteur/NotificationsRecruteur.jsx` (route `/notifications`, sous `RecruteurLayout`) — même structure liste+détail que `BoiteReception.jsx` (candidat), icône par `type_notif` (Inbox=spontanée, UserCheck=nouvelle candidature, Award=recommandé), bouton "Tout marquer lu".
- `RecruteurLayout.jsx` : item "Notifications" ajouté en tête du groupe "Principal" (badge = non lus), + bouton cloche dédié dans le header à côté du bouton "Candidatures spontanées" existant (remplace l'ancien bouton qui pointait par erreur vers `/candidatures-spontanees` à cet emplacement — désormais deux boutons distincts).
- `NavbarRecruteur.jsx` : lien "Notifications" ajouté au groupe "Principal" du menu mobile (`MOBILE_MENU_GROUPS`), sans badge de compteur côté mobile (le badge vit sur la sidebar/header desktop, pattern jugé suffisant — pas de duplication de fetch supplémentaire pour un menu secondaire).

**Non fait (hors périmètre explicite)** : pas de push navigateur/WebSocket temps réel (rafraîchissement au chargement de page, comme le reste du système notifications) ; pas de préférences on/off par type d'événement.

**Tests** : backend 72/72 ✅ (`test_api_candidat`/`test_api_recruteur`/`test_api_gestion_recruteur`/`test_api_equipe`), `python manage.py check` propre. Frontend 420/421 — le seul échec (`RecruteurLayout.test.jsx` attendant le libellé "Messages") est **préexistant**, sans rapport avec cette session (le fichier avait déjà une modification non commitée renommant ce lien en "Candidatures spontanées" avant le début de cette session — à traiter séparément). `npx vite build` propre.

---

## 🆕 SESSION 28/08/2026 — Tests admin en direct : bugs pages/bannières + liste pages libres dans footer

**Contexte** : l'utilisateur a testé en direct plusieurs panels admin (bannières, carrousel, pages statiques, FAQ, newsletter, paliers) avec le compte `admin1@taftech.dz`. Deux bugs réels remontés pendant les tests, corrigés le jour même.

**Bug 1 — `URLField` rejette une saisie sans protocole** (`jobs/serializers/banners.py`, `SiteAnnonceSerializer`/`BanniereAccueilSerializer`) : taper `google.com` dans le champ "Lien (URL)" du bandeau d'annonce ou d'une bannière carrousel échouait en 400 ("Saisissez une URL valide.") sans que le frontend n'affiche la vraie cause. Fix : normalisation `https://` auto-préfixée (même pattern que linkedin/github ailleurs dans le projet), appliquée dans `to_internal_value()` (pas `validate_<champ>` — le validateur intégré d'`URLField` s'exécute AVANT et rejette la valeur brute avant que `validate_lien_url` ait la main).

**Bug 2 — upload d'image cassé dès que `lien_url` est rempli en même temps** (même fichier) : une 1ʳᵉ version du fix ci-dessus remplaçait `data` (un `QueryDict` multipart) par un dict Python classique (`{**data, ...}`) pour injecter l'URL normalisée — ça casse la détection DRF des champs fichier (`is_html_input()` teste `hasattr(data, 'getlist')`, absent sur un dict classique), donc `BanniereAccueilSerializer` ne reconnaissait plus `image` comme un fichier dès que `lien_url` était aussi présent → erreur "La donnée soumise n'est pas un fichier." Fix : `data.copy()` (un `QueryDict.copy()` reste mutable ET reste un `QueryDict`) au lieu de `{**data}` — préserve `getlist`/`is_html_input` tout en mutant `lien_url` en place.

**Audit des messages d'erreur génériques masquant la vraie cause backend** : nouveau helper partagé `utils/apiErrMsg.js` (gère `{error}`/`{detail}`/`{message}`/erreurs de validation par champ DRF, avec fallback si rien d'exploitable). Appliqué sur ~65 blocs `catch` dans 42 fichiers frontend (tous les panels admin + plusieurs pages recruteur/candidat), remplaçant `toast.error("message générique fixe")` par `toast.error(apiErrMsg(err, "message générique fixe"))` — le comportement par défaut ne change pas si le backend ne renvoie rien d'exploitable, mais la vraie cause s'affiche quand elle existe. Le helper local dupliqué dans `useGestionOffre.js` a été supprimé au profit de l'import partagé — un seul `apiErrMsg` dans tout le projet désormais. Bug de référence trouvé au passage : un premier essai avait placé `apiErrMsg(err, ...)` dans le callback `onError` du bouton Google Login (`Login.jsx`/`RegisterCandidat.jsx`), où `err` n'existe pas dans ce scope (le SDK Google ne fournit aucun objet d'erreur exploitable à ce callback) — corrigé en gardant un message littéral fixe à cet endroit précis.

**Nouvelle fonctionnalité — liste des pages libres automatique dans les footers** : jusqu'ici, une page libre créée via `/admin-taftech/pages` (autre que CGU/Confidentialité/Qui-sommes-nous, déjà liées en dur) n'était accessible que par son URL directe `/pages/<slug>` — aucun lien nulle part sur le site. Décision produit (validée avec l'utilisateur) : lister automatiquement ces pages dans la colonne "Légal" des deux footers (candidat + recruteur), sans qu'aucune action manuelle par page ne soit nécessaire — pas d'ajout dans la navbar ni la page d'accueil (périmètre volontairement limité au footer).
- Nouveau `GET jobs/pages/` (`PageStatiqueListePublicAPIView`, `jobs/views/pages.py`) — liste allégée `{slug, titre}`, exclut les 3 slugs système (`cgu`/`confidentialite`/`qui-sommes-nous`) déjà liés en dur, triée par titre, cache Django 1h (`jobs_pages_statiques_liste`, invalidé sur chaque create/update/delete de `PageStatiqueAdminAPIView` — même pattern que `CACHE_PAGE` déjà en place pour la page unitaire).
- Route ajoutée avant `pages/<slug:slug>/` dans `jobs/urls.py` (littéral avant catch-all-like, cohérent avec la contrainte déjà documentée dans ce fichier pour les offres).
- Frontend : `jobsService.getPagesLibres()`, consommé par `Footer.jsx` et `FooterRecruteur.jsx` (fetch au montage, section "Légal" existante étendue avec les pages retournées — aucune section ne s'affiche si la liste est vide, pas de bloc vide).

**Tests** : `manage.py check` propre, frontend build propre, **421/421 tests verts** (62 fichiers).

## 🆕 SESSION 27/08/2026 (soir) — Nettoyage : suppression du système Premium legacy, Palier devient l'unique système

**Contexte** : depuis la Phase 2a du portail recruteur (22/08/2026), deux systèmes de facturation coexistaient — l'ancien binaire `ProfilEntreprise.est_premium`/`premium_expire_at` + `PremiumPlan`/`PremiumAvantage` (page `PremiumPage.jsx`, panel `AdminPremium.jsx`), et le nouveau `Palier` (STARTER/PRO/BUSINESS/ENTERPRISE) + `AbonnementEntreprise` avec le vrai gating (Phase 2b, session 22-23/08/2026). `get_palier_actif()` avait un repli legacy vers `est_premium_actif` pour ne pas casser les comptes déjà activés par l'ancien flux. Spec : `docs/superpowers/specs/2026-08-27-nettoyage-palier-premium-design.md`. Demande utilisateur : supprimer le legacy en entier, pas seulement le désactiver.

**Migration de données (avant suppression de schéma)** : `0090_backfill_abonnement_avant_suppression_premium.py` — filet de sécurité idempotent (`get_or_create`, même valeurs codées en dur que la migration 0080 déjà existante) qui bascule toute `ProfilEntreprise(est_premium=True)` sans `AbonnementEntreprise` vers `AbonnementEntreprise(palier=BUSINESS, date_expiration=premium_expire_at)` — nécessaire car des activations legacy (`AdminDemandesPremiumAPIView`, ancien webhook Chargily `nb_mois`) avaient pu avoir lieu après la migration 0080 initiale, sans jamais créer d'`AbonnementEntreprise`. `0091_supprime_premium_legacy.py` (générée par `makemigrations`) supprime ensuite les modèles `PremiumPlan`/`PremiumAvantage` et les champs `ProfilEntreprise.est_premium`/`premium_expire_at` (la property Python `est_premium_actif` n'a pas de colonne, retirée du code seul).

**Backend** :
- `jobs/models.py` : `PremiumPlan`/`PremiumAvantage` supprimés, `ProfilEntreprise.est_premium`/`premium_expire_at`/`est_premium_actif` supprimés.
- `jobs/paliers_utils.py::get_palier_actif()` : repli legacy vers `est_premium_actif` retiré — toute entreprise premium a désormais un vrai `AbonnementEntreprise` après la migration 0090, plus besoin de ce filet.
- `jobs/views/premium_admin.py` : vidé de ses 4 vues Premium (`PremiumPlansPublicAPIView`/`PremiumAvantagesPublicAPIView`/`PremiumPlansAdminAPIView`/`PremiumAvantagesAdminAPIView`) — le fichier n'est **pas** supprimé en entier (contrairement à ce que dit le spec littéralement) car il contient aussi `FaqPublicAPIView`/`FaqAdminAPIView`/`CompetencesAutocompleteAPIView`/`CompetencesAdminAPIView`, sans rapport avec Premium, toujours utilisées — seules les classes Premium en ont été retirées.
- `ChargilyCheckoutAPIView` (ancien flux `nb_mois`) et ses routes supprimés — seul `ChargilyCheckoutPalierAPIView` (flux `palier_nom`) subsiste. Le webhook unique `ChargilyWebhookAPIView` ne garde que la branche `metadata.palier_nom` (la branche `nb_mois` avait déjà été retirée avant cette session, confirmé en lisant le code).
- `AdminDemandesPremiumAPIView` (activation manuelle CIB/EDAHABIA) : le PATCH accepte désormais un champ `palier` (nom du palier, défaut `BUSINESS` si absent) en plus de `nb_mois` — crée/prolonge un `AbonnementEntreprise` au lieu d'écrire `est_premium`/`premium_expire_at`. Le GET retourne `palier_actif`/`abonnement_expire_at` par demande au lieu de `montant`/`est_premium_actif`/`premium_expire_at` (le prix catalogue par durée n'a plus de source — `PremiumPlan` supprimé — le prix n'est de toute façon plus affiché sur cette page admin).
- `EnvoyerRecuPremiumAPIView`, `DashboardRecruteurAPIView` (retire `est_premium`/`premium_expire_at`/`premium_active_since`/`premium_nb_mois`, garde `palier_actif`/`palier_expiration`/`acces_equipe`/`acces_ia_recommandes`/`acces_ia_avancee`/`acces_coordonnees`) et `AdminStatsAPIView` (KPI `premium_actifs`/`revenu_premium_estime` recalculés sur `AbonnementEntreprise`/`PaiementAbonnement`) étaient déjà adaptés au système Palier avant cette session (vérifié en lisant le code, pas retouché).
- `accounts/views.py` (blocage login membre si abonnement expiré, code `PREMIUM_EXPIRE`) : bascule sur `get_palier_actif(entreprise) is None` au lieu de `entreprise.est_premium_actif`.
- `jobs/serializers/entreprise.py::EntrepriseDashboardDetailSerializer` : `est_premium` retiré des champs, nouveau `SerializerMethodField` `palier_actif` (via `get_palier_actif()`) ajouté — consommé par `AdminEntreprises.jsx` (affichage palier au lieu du badge Premium binaire) et par le dashboard recruteur (`dash.entreprise`).

**Frontend** :
- Supprimés : `Pages/Recruteur/Portal/PremiumPage.jsx`, `Pages/Admin/AdminPremium.jsx`, route `/admin-taftech/premium-config` + entrée sidebar "Config. Premium" (`AdminLayout.jsx`), `jobsService.getPremiumPlans`/`getPremiumAvantages`, `adminService.getAdminPremiumPlans`/`createPremiumPlan`/`updatePremiumPlan`/`deletePremiumPlan`/`getAdminPremiumAvantages`/`createPremiumAvantage`/`updatePremiumAvantage`/`deletePremiumAvantage`, `recruteurService.chargilyCheckout` (ancien flux, plus aucun appelant). La redirection `/recruteurs/premium` → `/recruteurs/abonnements` (déjà en place) est conservée telle quelle.
- `NavbarRecruteur.jsx`/`DashboardRecruteur.jsx` : lisent `dash.palier_actif`/`dash.palier_expiration` au lieu de `dash.est_premium`/`dash.premium_expire_at` (champs qui n'existent plus dans la réponse du dashboard).
- `AbonnementsPage.jsx` : `detailsAbonnement` n'expose plus que `expireLe` (`dash.palier_expiration`) — `activeDepuis`/`nbMois` n'ont plus de source côté dashboard (le legacy exposait `premium_active_since`/`premium_nb_mois`, jamais repris côté Palier), retirés de l'affichage plutôt que laissés à afficher `undefined`.
- `AdminDemandesPremium.jsx` : nouveau `<select>` palier (STARTER/PRO/BUSINESS/ENTERPRISE, défaut BUSINESS) à côté du sélecteur de durée, colonne "Abonnement" affiche `palier_actif`/`abonnement_expire_at` au lieu du badge Premium binaire ; la colonne "Demande" n'affiche plus de montant (plus de `PremiumPlan.prix_da` côté backend pour le calculer).
- `AdminEntreprises.jsx` : bouton "⭐ Retirer" (togglait `est_premium` directement, plus aucune API pour ça) supprimé — la désactivation d'un abonnement se fait désormais via la page Paliers/Abonnements, pas depuis la liste entreprises. Badge Premium binaire remplacé par `ent.palier_actif` (nom du palier ou "Gratuit").
- `CreateJob.jsx`, `GestionOffre/useGestionOffre.js`, `ParametresRecruteur.jsx` : `isPremium` recalculé depuis `dash.palier_actif` (vérifié contre le seuil réel du backend : `GenererOffreIAAPIView` débloque dès qu'un palier actif existe, Starter compris — pas de changement de seuil nécessaire, juste la source du booléen). `CVTheque.jsx` déjà correct (`is_premium` de la réponse CVthèque reflète `palier.acces_coordonnees` côté backend, jamais lié à `est_premium`).

**Tests** :
- Backend : `test_api_premium.py` supprimé en entier (couvrait `PremiumPlan`/`est_premium_actif`, remplacé par `test_api_paliers.py`/`test_api_paliers_gating.py` déjà existants). `test_api_cms.py` : les 2 classes `PremiumPlanAPITest`/`PremiumAvantageAPITest` retirées (FAQ/Compétences/Articles/Bannières/Pages/AIConfig inchangés). `test_api_paliers_gating.py` : `test_repli_legacy_est_premium_actif_vers_business` supprimé (le repli n'existe plus), fixture `make_entreprise()` simplifiée (plus de paramètre `est_premium`). `test_api_cvtheque.py`, `test_api_equipe.py`, `test_api_recruteur.py`, `accounts/tests/test_views.py`, `test_profiles_models.py` : fixtures `est_premium=True`/`premium_expire_at=...` remplacées par la création d'un `AbonnementEntreprise(palier=BUSINESS)`.
- Frontend : `AdminPremium.test.jsx`/`PremiumPage.test.jsx` déjà absents au moment de cette passe (supprimés lors d'une tentative précédente dans la même session, interrompue puis reprise).
- **Résultat final vérifié** : backend `python manage.py test jobs accounts` → **373/373 ✅**, `python manage.py check` propre. Frontend `npm test -- --run` → **419/419 ✅** (62 fichiers), `npx vite build` propre.

**Non touché (hors périmètre)** : `AbonnementsPage.jsx`, `AdminPaliers.jsx`, `jobs/views/paliers_admin.py`, `jobs/paliers_utils.py::limite_offres_actives`/`quota_cv_atteint` — le système Palier lui-même n'a pas changé, seul le legacy qui coexistait avec lui a été retiré.

---

## 🆕 SESSION 27/08/2026 — Sidebar recruteur/candidat en catégories + recherche/filtres manquants + navbar raccourcie

**Contexte** : demande utilisateur — ajouter recherche/filtres sur les pages sidebar recruteur qui n'en avaient pas, regrouper la sidebar (devenue longue, 17 liens à plat) en catégories façon `AdminLayout`, faire en sorte qu'elle défile indépendamment de la page, et vérifier la navbar mobile/dropdown. Spec : `docs/superpowers/specs/2026-08-26-sidebar-recruteur-categories-recherche-design.md`.

**Audit préalable** (sous-agent, 16 pages recruteur passées en revue) : les plus gros trous étaient `RecrutementsPage`, `FacturationPage`, `EvaluationsPage` (aucune recherche/filtre du tout) et `CandidaturesListPage` (filtres offre/statut mais pas de recherche nom). CVthèque/OffresListPage/CandidaturesSpontanees/CandidatsRecommandesPage/MonEquipe/StatistiquesPage déjà bien équipées — non touchées.

**`RecruteurLayout.jsx`** — `menuItems` (17 liens à plat) → `menuGroups` (4 catégories, ajustées après retours utilisateur en direct) :
- **Principal** : Tableau de bord
- **Offres** : Offres d'emploi, Candidatures (déplacée ici sur demande explicite — liée aux offres, pas aux profils candidats), Publier une offre, Questionnaires
- **Candidats** : CVthèque, Favoris, Messages (candidatures spontanées), Candidats recommandés, Entretiens, Évaluations, Recrutements
- **Compte** : Mon équipe, Abonnements & tarifs, Facturation, Paramètres entreprise

Le conteneur `<aside>` passe de `sticky top-20` simple à `sticky top-20 max-h-[calc(100vh-5.5rem)] flex flex-col overflow-hidden` avec `<nav className="overflow-y-auto flex-1">` — la sidebar défile indépendamment de la page une fois pleine (avant : il fallait scroller toute la page pour atteindre "Paramètres" tout en bas). Le bouton Déconnexion reste toujours visible en bas (`shrink-0`, hors zone scrollable).
- **Bug introduit puis corrigé en cours de session** : lors du regroupement, l'en-tête de catégorie a été écrit en `text-teal-100/70` (pensé pour un fond teal) — la sidebar réelle est fond blanc (`bg-white border border-slate-200`), rendant le texte quasi invisible. Corrigé en `text-slate-400`.
- **2ᵉ bug introduit puis corrigé** : le libellé du lien "Messages" (`/candidatures-spontanees`) a été réécrit par erreur en "Candidatures spontanées" pendant la restructuration — casse une décision produit déjà actée (session 22/08/2026, "Messages" = candidatures spontanées renommées dans la sidebar). Restauré à "Messages" partout (sidebar, tooltip du bouton raccourci dans le header, menu mobile) — détecté par le test `RecruteurLayout.test.jsx` déjà existant (HP1/HP3 attendaient "Messages").

**`CandidatLayout.jsx`** — même traitement, 4 catégories :
- **Principal** : Tableau de bord
- **Candidature** : Mon profil, Mes candidatures, Mes compétences, Offres sauvegardées, Boîte de réception, Alertes d'emploi
- **Carrière** : Suggestions carrière, Prendre rendez-vous
- **Compte** : Mes documents, Paramètres

Même pattern de scroll indépendant (`max-h-[calc(100vh-5.5rem)] overflow-y-auto`) que la sidebar recruteur.

**Recherche/filtres ajoutés — 4 pages, 100% client-side sur les données déjà chargées, aucun nouvel endpoint backend** :
- `RecrutementsPage.jsx` : recherche (nom candidat + titre offre) + select période (7j/30j/6m/1a/tout).
- `FacturationPage.jsx` : recherche n° facture + select année (dérivé dynamiquement des factures chargées).
- `CandidaturesListPage.jsx` : recherche nom/email ajoutée en plus des selects offre/statut déjà existants.
- `EvaluationsPage.jsx` : recherche (nom + offre) + select score minimum (≥8/≥12/≥16).

**Navbar recruteur (`NavbarRecruteur.jsx`) et candidat (`Navbar.jsx`) — dropdown "Mon espace"/"Mon compte" raccourci** : signalé par l'utilisateur comme "trop long" — une fois la sidebar complète en place, le dropdown du header dupliquait presque tous ses liens (14 entrées recruteur, 7 candidat). Réduit à l'essentiel (raccourcis les plus utilisés, pas de doublon avec un lien déjà visible ailleurs) :
- Recruteur : Mon équipe, Abonnement/Premium, Paramètres (Tableau de bord retiré du dropdown car déjà présent dans la barre de liens horizontale du haut).
- Candidat : Tableau de bord, Mon profil, Paramètres.
- Le menu hamburger mobile recruteur (`MOBILE_MENU_GROUPS`, nouveau) reprend les mêmes 4 catégories que la sidebar desktop (avec le split Offres/Candidats), au lieu d'une liste plate — et corrige au passage un vrai oubli : le lien **"Évaluations" n'existait dans AUCUN menu mobile ni dropdown desktop** avant cette session (page créée lors d'une session précédente, jamais raccordée à la navigation recruteur hors sidebar desktop `hidden md:block`, donc totalement inatteignable sur mobile).

**Tests** : `Navbar.test.jsx` — 2 assertions mises à jour pour matcher le dropdown raccourci (`Mes candidatures`/`CVthèque` retirés du dropdown candidat/recruteur testé → remplacés par `Mon profil` côté candidat). `RecruteurLayout.test.jsx`/`CandidatLayout.test.jsx` déjà existants, passés sans modification une fois le bug de libellé "Messages" corrigé. Suite frontend complète relancée : **436/436 ✅**, `npx vite build` propre.

**Non fait (hors périmètre explicite de la spec)** : pas de nouvel endpoint backend (tout le filtrage reste client-side, cohérent avec l'état actuel de ces pages) ; pas d'ancres de scroll intra-page (scrollspy) — seule la sidebar elle-même a été rendue navigable indépendamment de la page, pas de jump vers une section précise à l'intérieur d'une page.

---

## 🆕 SESSION 26/08/2026 (suite 3) — Fix parser CV : dates d'expérience mélangées sur CV en 2 colonnes

**Contexte** : bug remonté par l'utilisateur sur son propre CV réel (`Cv_FILALI_LP7snqc.pdf`) — dates d'expérience manquantes, dupliquées entre postes voisins, ou collées dans le titre/l'entreprise après le remplissage automatique du profil.

**Diagnostic** (vérifié empiriquement, pas supposé) : l'extraction PDF (`extract_text_from_pdf_smart`) était déjà correcte — les dates ressortent bien dans le bon ordre ligne par ligne, y compris quand une date est sur sa propre ligne avant/après le bloc titre+entreprise (limitation "CV en colonnes" documentée comme non résolue dans une session précédente — en réalité déjà corrigée côté extraction depuis, jamais revérifiée). Le vrai bug était dans **`PROMPT_CV_COMPLET`** (`jobs/cv_parser.py`) : aucune consigne ne précisait à Groq que la date de début/fin peut être sur une ligne séparée (pas forcément collée au titre) — résultat, sur ce CV réel : date de début perdue pour le 1ᵉʳ poste, date collée dans `titre_poste` ("DÉVELOPPEUR N8N Novembre 2025") ou `entreprise` ("Eurl DHL Distribution - Oran Octobre 2025") pour 2 autres postes, dates totalement absentes pour le dernier.

**Fix** : ajout d'une consigne courte dans `PROMPT_CV_COMPLET` (section EXPÉRIENCES) expliquant les 2 cas — date sur sa propre ligne avant/après le bloc, ou collée en fin de ligne de titre/entreprise (à en extraire et retirer du texte) — et interdisant de dupliquer la date de début comme date de fin quand une seule date isolée est trouvée.
- **Piège rencontré** : une première version de la consigne, trop verbeuse, a fait dépasser le quota Groq TPM (413 `tokens_per_minute` sur `openai/gpt-oss-20b`, limite 8000) une fois combinée à la liste des ~87 domaines ANEM déjà injectée dans le prompt — resserrée à 2 phrases.
- **Piège #2 (important pour toute future modif de `PROMPT_CV_COMPLET`)** : `AIConfig.parser_cv_prompt` (panel admin "Configuration IA") contient un prompt backfillé en base depuis la session du 21/08 et **prend le pas** sur la constante Python (`ai_config.parser_cv_prompt or PROMPT_CV_COMPLET`) — modifier la constante dans le code n'a AUCUN effet tant que ce champ n'est pas vidé ou resynchronisé manuellement. Resynchronisé en base dev via shell (`AIConfig.get_solo().parser_cv_prompt = PROMPT_CV_COMPLET; save()`) pour que le fix s'applique réellement. **Si l'admin a du texte personnalisé dans ce champ en prod, il sera écrasé par le prochain déploiement de code seul — ce n'est PAS automatique, seulement fait manuellement ici en dev.**

**Vérifié en conditions réelles** (pas juste lu le code) : `parse_cv()` relancé contre le vrai fichier CV en base (`media/cvs/Cv_FILALI_LP7snqc.pdf`) — les 5 expériences ressortent avec titres/entreprises propres (plus de date collée) et les bonnes dates par poste (ex. "Développeur N8N" : Novembre 2025 → Janvier 2026, avant : titre pollué + période "2025-2025").

**Tests** : `manage.py check` propre. Pas de test automatisé dédié à cette regex/prompt (le comportement dépend de la réponse Groq réelle, non mockable de façon utile ici — même limitation déjà documentée pour le fix regex du 18/08/2026 sur les sections d'analyse IA).

## 🆕 SESSION 26/08/2026 (suite) — Perf dashboard candidat : cache scores matching + niveaux compétences visibles recruteur

**Contexte** : dashboard candidat signalé lent au chargement par l'utilisateur. Diagnostic : `OffresRecommandeesAPIView` (`jobs/views/ia.py`) et `_score_pertinence_marche` (`jobs/profile_score.py`) scoraient chacune, indépendamment, **toutes les offres actives** du catalogue via `calculer_score_matching()` à chaque chargement — avec ~500 offres, ça fait ~1000 calculs de matching synchrones par visite, sans `select_related` sur `entreprise` (N+1 en plus).

**Fix — 4 mesures, toutes appliquées** :
1. **Cache 10 min** — nouveau `jobs/matching_cache.py::scores_offres_actives_pour_candidat(user)` : calcule une fois, range le résultat `[(offre_id, score_total)]` dans le cache Django (`SCORES_CACHE_TTL = 600`), réutilisé pour tout rechargement dans la fenêtre. **Jamais utilisé** pour le score figé à la vraie candidature (`PostulerAPIView`) ni pour le matching CVthèque (une offre à la fois) — uniquement les 2 vues qui scorent tout le catalogue.
2. **Dédoublonnage** — `OffresRecommandeesAPIView` et `_score_pertinence_marche` consomment désormais la même fonction : le 2ᵉ appel dans le même chargement de page retrouve le cache déjà chaud, zéro recalcul.
3. **`select_related('entreprise')`** ajouté sur la requête `OffreEmploi.objects.filter(...)` de `scores_offres_actives_pour_candidat` — élimine le N+1 (1 requête au lieu de 501).
4. **Pré-chauffe en tâche de fond** — nouvelle commande `jobs/management/commands/precalculer_scores_matching.py` (option `--dry-run`), destinée au cron toutes les 10 min (aligné sur le TTL) : recalcule le cache (`force=True`) pour tous les candidats **connectés depuis < 60 jours** (même seuil que `relance_maj_cv`, évite de gaspiller du calcul sur des comptes inactifs) — le dashboard trouve alors le cache déjà chaud même à la première visite de la journée.

**Non fait (matérialisation lourde en DB)** : pas de nouveau modèle persistant type `ScoreMatchingCache` — le cache Django (mémoire/LocMem en dev, à adapter en Redis en prod si besoin) suffit largement à ce volume, cohérent avec le reste du projet qui n'a jamais introduit de modèle juste pour du cache (`jobs_constants`, `AIConfig` déjà en cache Django).

**Niveaux de compétence transmis au recruteur** (demande liée) : `CandidatInfoDTO.competences_detail` (`jobs/serializers/candidatures.py`) expose désormais `label`/`niveau_libelle` par compétence (avant : seul le texte brut `competences` sans niveau était transmis). Affiché dans `ReviewCandidature.jsx` (page **candidat** de relecture avant envoi de candidature, malgré son emplacement dans `Pages/Recruteur/`) et `DetailCandidature.jsx` (recruteur) — repli sur l'ancien affichage texte si `competences_detail` est vide (candidatures historiques).

**Tests** : backend 353/353 ✅, `manage.py check` propre, `precalculer_scores_matching --dry-run` vérifié en conditions réelles, `npx vite build` propre.

**Déploiement — nouvelle entrée crontab requise** (voir section 🚀 DÉPLOIEMENT) : `*/10 * * * * python manage.py precalculer_scores_matching`.

## 🆕 SESSION 26/08/2026 — Audit sécurité complet (codebase entier) + fix ajout d'équipe non consenti

**Contexte** : audit sécurité demandé sur tout le codebase (pas juste un diff, branche `main` propre après merge). Méthodologie : sous-agent d'exploration + sous-agent de contre-vérification indépendant par finding, seuil de confiance ≥8/10 pour retenir un finding.

**Résultat** : un seul finding retenu, corrigé le jour même. Toutes les autres catégories vérifiées RAS (injection SQL/commande/template, path traversal, JWT/session, désérialisation, XSS via `dangerouslySetInnerHTML`, secrets en dur, contournement signature webhook Chargily, permissions endpoints admin, IDOR fichiers privés candidats, escalade de rôle d'équipe, CORS).

**Fix — `InviterMembreAPIView` (`jobs/views/equipe.py`)** : la branche "compte email classique existant" ajoutait l'utilisateur **directement** à `MembreEquipe` sans aucune étape de consentement (contrairement aux 2 autres branches — compte Google et email inconnu — qui passaient déjà par `InvitationEquipe` + acceptation via token). Deux problèmes cumulés : (1) un recruteur pouvait faire rejoindre n'importe quel compte TafTech existant à son équipe (avec un rôle qu'il contrôle, potentiellement `ADMIN`) sans que la cible ait rien demandé, seul un email a posteriori l'informait ; (2) les 3 messages de réponse distincts (`'ajouté(e) directement'` / `'invitation (Google)'` / `'Invitation envoyée'`) permettaient d'énumérer si un email correspond à un compte TafTech et son type.
- **Fix** : les 3 branches passent désormais toutes par le même mécanisme `InvitationEquipe` (token, expiration 72h, acceptation explicite via `AccepterInvitationAPIView`) — `AccepterInvitationAPIView.post()` gérait déjà le cas "compte existant non-Google" en exigeant la confirmation du mot de passe (`user.check_password()`), donc aucun nouveau code d'acceptation à écrire. Message de réponse unifié (`"Invitation envoyée à {email}."`) quelle que soit l'existence/le type du compte cible.
- `_envoyer_email_bienvenue()` (devenue morte, plus jamais appelée) supprimée.
- **Test cassé par le fix** (verrouillait l'ancien comportement vulnérable) : `test_ajout_direct_compte_existant` → remplacé par `test_compte_existant_recoit_invitation_pas_ajout_direct` (vérifie qu'aucun `MembreEquipe` n'est créé avant acceptation, qu'une `InvitationEquipe` l'est) + nouveau `test_message_invitation_identique_compte_existant_ou_non` (anti-énumération).

**Tests** : `jobs.tests.test_api_equipe` 50/50 ✅.

## 🆕 SESSION 25/08/2026 (suite 2) — Offres clôturées visibles 60 jours (badge "Poste pourvu")

**Contexte** : en creusant le fix "Candidats recommandés" (session juste en dessous), l'utilisateur a soulevé un vrai risque produit — si les recruteurs clôturent correctement leurs offres pourvues (bonne pratique déjà encouragée par ce fix), le catalogue public `/jobs` se réduit et le site risque de paraître vide/mort. Décision validée : au lieu de disparaître instantanément, une offre clôturée reste visible dans le flux public le temps d'une fenêtre de rétention, clairement badgée et non-candidatable — donne l'impression d'un site actif sans mentir sur la disponibilité réelle.

**Nouveau champ `OffreEmploi.date_cloture`** (`DateTimeField` nullable, migration `0089`) — horodate le moment de clôture, alimenté par `CloturerOffreAPIView.patch()` (clôture manuelle recruteur) et `archiver_offres_expirees` (clôture auto sur expiration). Nécessaire pour calculer la fenêtre de rétention (`est_cloturee` seul n'indique pas depuis quand).

**Backend** (`jobs/views/offres.py`, constante module-level `RETENTION_OFFRES_CLOTUREES_JOURS = 60`) :
- `JobListAPIView` : filtre `Q(est_cloturee=False) | Q(est_cloturee=True, date_cloture__gte=seuil_60j)` au lieu de `est_cloturee=False` strict. Tri `.annotate(priorite_cloture=Case(...)).order_by('priorite_cloture', '-date_publication')` — **les offres actives apparaissent toujours avant les clôturées récentes**, jamais mélangées par simple date, pour ne pas noyer les vraies opportunités.
- `JobDetailAPIView` : même filtre — une offre clôturée récente reste accessible en détail (pas de 404) pour afficher le badge/état "Poste pourvu", au lieu de disparaître.
- **Bug réel trouvé en implémentant** : `PostulerAPIView`/`PostulerRapideAPIView` (`jobs/views/candidatures.py`) ne vérifiaient `est_cloturee` nulle part — ça ne posait pas de risque avant car l'offre 404ait dès la clôture (page de candidature inatteignable). Une fois la page de détail conservée 60 jours, un candidat aurait pu techniquement soumettre une candidature à une offre pourvue (le bouton frontend est désactivé, mais rien ne bloquait un appel API direct). Fix : 400 explicite `"Cette offre est clôturée..."` ajouté aux deux vues.
- Endpoints non touchés intentionnellement (gardent `est_cloturee=False` strict) : `OffresRecommandeesAPIView` (`ia.py`), `AlerteEmploi` (`envoyer_alertes.py`), `profile_score.py`, `sitemap.xml` (`seo_views.py`), `NotificationsAPIView`/stats — une offre clôturée ne doit jamais être recommandée, alertée, ou comptée comme opportunité active, seule la page de *navigation* publique bénéficie de la rétention visuelle.

**Frontend** : nouveaux tokens `theme.js` (`jobCardBadgeCloturee`, `jobCardDisabledButton`). `Components/JobCard.jsx` : badge "Poste pourvu" (remplace le badge type de contrat) + bouton "Postuler" désactivé (`disabled`, tooltip) quand `job.est_cloturee`. `Pages/Public/JobDetail.jsx` : panneau de candidature remplacé par un état "Poste pourvu" explicite, badge "Poste pourvu" à la place du badge d'expiration, bouton flottant mobile masqué. `JobsList.jsx`/`OffresParSecteur.jsx`/`OffresParRegion.jsx` héritent automatiquement (consomment `JobCard`, aucun changement nécessaire).

**Tests** : backend `test_api_candidat`/`test_serializers_offres`/`test_jobs_models`/`test_api_gestion_recruteur` 29/29 ✅, suite `jobs.tests` complète relancée en arrière-plan, frontend `JobCard`/`JobDetail`/`JobsList` 19/19 ✅, `npx vite build` propre.

## 🆕 SESSION 25/08/2026 (suite) — Audit mockup, refonte entreprise/blog/navbar, recadrage image, corrections en direct

**Contexte** : session longue de bout en bout avec l'utilisateur, alternant audit visuel (comparaison mockup employeur ↔ app réelle via captures Playwright), refontes de design demandées après l'audit, et plusieurs bugs réels remontés en testant en conditions réelles (parser CV, inscription, navbar). Tout exécuté en inline, sans sous-agents.

### Audit visuel — mockup employeur (13 puis 15 panneaux) vs app réelle
Comptes de test jetables créés/supprimés à chaque passe (jamais laissés en base). Captures Playwright (`chromium.launch()`, le hang classique de `browser.close()` sur Windows — déjà documenté pour le scraper Emploitic — ignoré, le screenshot est pris avant). Verdict global : **la quasi-totalité des points du mockup étaient déjà conformes** avant même de coder quoi que ce soit — le mockup est un document de validation rétrospective, pas une nouvelle liste de fonctionnalités. Deux écarts réels identifiés et traités (voir sections suivantes) : page vitrine entreprise (design daté) et blog (aucun contenu, donc invisible). Un point volontairement écarté après discussion : **Messagerie candidat/recruteur** (chat temps réel façon LinkedIn) — jugé non prioritaire, le besoin de communication du process de recrutement est déjà couvert par email + statuts + entretiens programmés ; un vrai chat ouvrirait des problèmes de modération/rétention (loi 18-07) sans bénéfice clair.

### Refonte page vitrine entreprise (`EntreprisePublic.jsx`)
Brainstormé et validé section par section avec l'utilisateur (spec `docs/superpowers/specs/2026-08-25-refonte-profil-entreprise-design.md`, plan `docs/superpowers/plans/2026-08-25-refonte-profil-entreprise.md`) :
- **Nouveau champ `ProfilEntreprise.annee_creation`** (`PositiveIntegerField`, nullable, `MinValueValidator(1900)`, migration `0087`) — année de fondation de l'entreprise (pas la date d'inscription sur TafTech). Éditable dans Paramètres → Mon entreprise. Exposé par `EntreprisePublicSerializer` et `EntrepriseDashboardDetailSerializer`.
- **Hero neutre** : bandeau indigo dégradé remplacé par un fond blanc/texte sombre ; **3 stats en évidence** sous le nom (offres actives, tranche d'effectif, ancienneté — cette dernière **masquée silencieusement** si `annee_creation` non renseigné, jamais de "N/A").
- **Onglets À propos / Offres / Photos** (état local, pas de changement de route) — remplace l'ancien scroll unique. "À propos" : texte (Présentation + Culture d'entreprise) en 2 colonnes avec une photo à côté sur desktop, **fond blanc sans encadré gris** (corrigé après retour utilisateur "on dirait un brouillon") et **titres de section en gras foncé** (`text-base font-bold text-slate-900`, pas la petite majuscule grise d'origine).
- **Contact en texte simple** : LinkedIn/Site web passent de pastilles colorées à des liens texte avec icône, couleur neutre.
- Localisation (carte Google Maps) reste hors onglets, toujours visible.
- **Point de contenu (pas de code) identifié pendant l'audit** : le premier essai montrait un logo de livraison (DHD) écrasé en bannière et des logos d'autres sociétés dans la galerie — `object-cover` fonctionne comme prévu, c'est l'image source qui n'a pas le bon ratio. Pas de garde-fou ajouté (jugé pas prioritaire), à nettoyer côté contenu par l'admin.

### Navbar candidat restructurée
Sur inspiration Emploitic (capture fournie par l'utilisateur) : `Accueil | Offres d'emplois | Recherche avancée ▾ (Par secteur / Par région / Par métier) | Entreprises | Blog`. "Recherche avancée" est un **simple déclencheur de menu au clic** (pas de page propre), fermeture au clic extérieur (`useRef` + listener, même pattern que le dropdown "Mon compte" déjà existant). **Blog ajouté en lien top-level** (jusque-là seulement dans le footer). Menu mobile : section "Recherche avancée" affichée comme un sous-groupe indenté sous un label, pas un dropdown imbriqué.

### Métiers accessibles — calcul déterministe par domaine ANEM (pas de LLM)
Nouveau `jobs/metiers_matching.py::calculer_metiers_accessibles(candidat_user, top_n=None)` — décision actée explicitement avec l'utilisateur : un pourcentage affiché comme un fait doit être reproductible, pas une estimation Groq (même principe déjà appliqué au Score de profil). Contrairement au matching candidat↔offre (`matcher.py`), un Domaine n'a pas de diplôme/compétences requis dans le référentiel → score limité à 2 critères réels : spécialité déclarée (60 pts, réutilise `specialites_compatibles`) + expérience réelle dans ce domaine (40 pts, `ExperienceCandidat.secteur`). Nouvel endpoint `GET jobs/metiers-accessibles/?limit=N` (`MetiersAccessiblesAPIView`, réservé CANDIDAT).
- **Dashboard candidat** : nouvelle section "Métiers accessibles pour vous" (top 4) dans le widget "Analyse de mon CV", entre le score et Points forts/À améliorer — correspond quasi trait pour trait au mockup.
- **Suggestions carrière** (`SuggestionsCarriere.jsx`) : la liste "Métiers correspondant à votre profil" (ancien système hash pseudo-aléatoire sans vrai score) est **remplacée** par cette liste déterministe complète avec %. La section Groq "MÉTIERS POSSIBLES" (5ᵉ section de l'analyse IA) est **retirée du parsing frontend uniquement** (`SECTION_KEYS` réduit à 4) — pas besoin de toucher le prompt backend (`AIConfig.analyse_carriere_prompt` peut déjà être surchargé en base par une migration antérieure, un retrait du prompt Python ne garantirait rien) ; l'ancienne section, si Groq la génère quand même, est simplement ignorée côté affichage.
- **Perf dashboard candidat** : le widget "Conseils personnalisés" (Groq) était auto-chargé à chaque ouverture du dashboard, ralentissant perceptiblement la page (latence LLM 1-3s). Passé **à la demande** (bouton "Générer mes conseils"), cohérent avec Suggestions carrière déjà en mode à la demande pour la même raison de quota.

### Refonte Blog (contenu + design)
Le blog existait en code depuis la session CMS du 20/08 mais était **vide** (0 article, 0 catégorie) — d'où l'impression de fonctionnalité manquante lors de l'audit. 3 catégories + 3 articles réels créés (Carrière/Recrutement/Conseils RH — conseils d'entretien, rédaction de CV, tendances marché algérien 2026).
- **Piège rencontré en peuplant le contenu** : un premier essai de seed via heredoc bash a corrompu les accents (UTF-8 mal interprété par le shell). Diagnostiqué en vérifiant les octets bruts à 3 niveaux (Postgres `octet_length`, réponse API Django, proxy Vite) avant de conclure — la bonne méthode : écrire un fichier `.py` UTF-8 propre (outil Write) et l'exécuter directement, jamais de contenu accentué à travers un heredoc shell sur cet environnement Windows.
- **Design en 2 colonnes** (`Blog.jsx`) fidèle au mockup, revu 2 fois après retours utilisateur sur une capture zoomée du mockup : article vedette à gauche (photo/dégradé + catégorie + titre + extrait + "Lire la suite" + date), liste compacte à droite (miniature carrée + catégorie + titre + date), **cartes séparées avec espace** (pas un bloc `divide-y` collé). Bandeau dégradé coloré (hash du nom de catégorie → 1 de 5 dégradés) en secours quand l'article n'a pas de photo, plutôt qu'un carré vide. Pagination **numérotée** (1 2 3...) au lieu de Précédent/Suivant. Couleurs de la page passées de teal (vert) à indigo (bleu) sur demande explicite (catégories actives, survol des titres, pagination).

### Recadrage d'image avant upload — nouveau composant réutilisable
Demande utilisateur explicite après avoir remarqué qu'une bannière entreprise affichait un logo de livraison complètement écrasé (`object-cover` recadre brutalement une image au mauvais ratio). Nouveau `Components/ImageCropperModal.jsx` (basé sur `react-easy-crop`, nouvelle dépendance) : zoom + déplacement dans un cadre au ratio fixé par le contexte d'appel, "Valider" découpe la zone sélectionnée via `<canvas>` et renvoie un `File` du même type — aucun changement backend nécessaire, l'upload se comporte comme si l'utilisateur avait choisi directement un fichier déjà au bon format.
- Intégré sur les **6 emplacements d'upload d'image** existants : logo entreprise (carré), bannière entreprise (3.5:1), galerie photos entreprise (4:3), photo de profil candidat (carré, cadre rond), couverture d'article admin (16:9), bannières carrousel accueil admin (21:9, très large).
- **Piège tests** : `react-easy-crop` + `<canvas>` ne sont pas pleinement supportés par jsdom → `ImageCropperModal` mocké dans `ProfilCandidat.test.jsx`/`RegisterCandidat.test.jsx` (bouton "Valider (mock)" appelant directement `onValidate(file)`), même principe que `RichTextEditor` mocké en `<textarea>` dans les tests existants.

### Bugs réels trouvés et corrigés en testant en direct avec l'utilisateur
1. **Parser CV — un `linkedin`/`github` non-URL faisait échouer TOUT le PUT profil** (`ProfilCandidatAPIView.put`) : l'IA du parser renvoie parfois du texte qui n'est pas une URL valide (ex. noyée dans une phrase "LinkedIn : linkedin.com/in/x.", ou "Non spécifié"). Avant : `serializer.errors` → 400 → **tout le remplissage du profil échouait**, y compris les champs valides, les niveaux de compétences, les expériences et les formations (le flux `handleValiderParsing` est séquentiel, un throw sur l'étape PUT bloque tout le reste). Fix : extraction par regex de l'URL réelle si noyée dans du texte (`linkedin\.com/\S+`), retrait de la ponctuation finale parasite, et **abandon silencieux du seul champ concerné** (mis à `""`) si la valeur ne ressemble toujours pas à une URL — le reste du profil se sauvegarde toujours.
2. **Faux positif "bug formations/réseau"** : après le fix ci-dessus, des erreurs `PANNE_RESEAU_OU_SERVEUR_OFFLINE` sont apparues pendant un nouveau test — diagnostiqué comme une collision avec l'autoreload du serveur Django (plusieurs fichiers backend modifiés en même temps que l'utilisateur testait), pas un bug de code. Leçon opérationnelle : prévenir l'utilisateur de laisser quelques secondes après toute modification backend avant de retester.
3. **NIN retiré de l'inscription candidat** (décision produit — le champ n'a plus d'utilité si personne ne peut le modifier après coup) : `RegisterCandidatDTO.nin` passe de `required=True` à `required=False`. **Piège évité** : un `nin` omis doit être stocké `NULL`, pas `""` — Django utilise `""` par défaut pour un `CharField` omis même avec `null=True, blank=True` (comportement historique du framework), et `""` viole la contrainte `unique=True` dès le 2ᵉ compte sans NIN. Fix : `validated_data['nin'] = None` forcé explicitement dans `RegisterCandidatDTO.create()` si absent. Affichage NIN retiré de "Mon profil" (`Modals.jsx`) sauf si déjà renseigné (comptes historiques).
4. **Bug navbar — un ADMIN voyait une navbar recruteur vide sur les pages publiques** (`App.jsx`) : `estRecruteurConnecte = role === "ADMIN" || ...` forçait `NavbarRecruteur` pour tout compte ADMIN, **sur toutes les pages du site** (pas seulement les routes recruteur) — et `NavbarRecruteur` masque la plupart de ses liens via `isRecruteurOuMembre()`, qu'un ADMIN ne satisfait jamais, d'où une navbar quasi vide sur `/blog` et ailleurs. Fix : `estRecruteurConnecte = !!role && portal === "recruteur"` — un ADMIN garde la navbar candidat normale sur les pages publiques, et ne bascule sur la navbar recruteur que sur les vraies routes recruteur (déjà couvert indépendamment par `isRecruteurRoute()`).
5. **Upload `.jfif` rejeté partout** (`FileExtensionValidator(allowed_extensions=['jpg','jpeg','png','webp'])`) : `.jfif` est une variante JPEG valide (mêmes octets magiques, déjà acceptée par `validate_image_mime`) mais absente de la liste d'extensions — rejeté silencieusement côté admin blog. `jfif` ajouté à la whitelist des 5 champs image concernés (`logo`, `banniere` entreprise, `EntreprisePhoto`, `BanniereAccueil`, `Article.image_couverture`), migration `0088`.

### Nouvelle page admin SEO
`Pages/Admin/AdminSeo.jsx` (route `/admin-taftech/seo`, sidebar section "Système") — tableau statique des 6 types de page publique (Offre d'emploi, Entreprise, Métier, Secteur, Wilaya, Blog/Article) avec un exemple d'URL propre et un badge ✓, plus un bandeau de réassurance SEO. Purement informatif (aucune donnée dynamique, aucun endpoint) — ne pilote rien, juste un écran de statut demandé par le mockup.

**Tests** : backend 349/349 ✅ (dont 8 nouveaux `test_metiers_accessibles.py`, 6 nouveaux linkedin/nin), frontend 436/436 ✅ (dont nouveaux `AdminSeo.test.jsx` 2/2, mise à jour `SuggestionsCarriere.test.jsx`/`EntreprisePublic.test.jsx`/`Navbar.test.jsx`/`Blog.test.jsx`/`ParametresRecruteur.test.jsx`), `npx vite build` propre, `python manage.py check` propre à chaque étape significative.

---

## 🆕 SESSION 25/08/2026 — Fix "Candidats recommandés" : plus de top match sur offres périmées

**Contexte** : l'utilisateur a soulevé un scénario concret — avec ~500 offres postées sur 6 mois, le widget "Candidats recommandés" (dashboard) et la page dédiée `/candidats-recommandes` triaient **toutes** les candidatures scorées de l'entreprise par `score_matching` sans aucun filtre de récence ni de statut d'offre. Un candidat ayant matché à 95% sur une offre publiée il y a plusieurs mois — clôturée, expirée, ou simplement jamais retraitée — pouvait donc rester indéfiniment en tête du "top match", même si le poste n'existe plus.

**Fix — 2 filtres cumulés, backend ET frontend** :
1. **Offre encore active** : `offre__est_active=True`, `offre__est_cloturee=False`, et `date_expiration` non dépassée si renseignée (`OffreEmploi.date_expiration` est nullable — une offre sans expiration mais jamais clôturée ne doit pas continuer à recommander indéfiniment).
2. **Fenêtre de récence 60 jours** (`RECOMMANDES_FENETRE_JOURS`, constante de classe) sur `Candidature.date_postulation` — nécessaire en plus du filtre 1 car une offre peut rester active des mois sans jamais être clôturée manuellement. 60 jours choisi pour cohérence avec `relance_maj_cv` (même seuil d'inactivité déjà utilisé ailleurs dans le projet).

**Backend** (`jobs/views/recruteur.py::CandidatsRecommandesAPIView`, `GET jobs/dashboard/candidats-recommandes/`) : `qs` filtré sur les 2 critères avant tri `-score_matching`.
**Frontend** (`DashboardRecruteur.jsx::candidatsRecommandesTous`, widget compact du dashboard) : même double filtre appliqué côté client sur `offresPourAnalyse` avant le tri — ce widget agrège les données déjà chargées par `getDashboard()`, pas d'appel au nouvel endpoint dédié.

**Non touché** : les graphiques Évolution/Pipeline/Sources du dashboard gardent toutes les offres (y compris clôturées/anciennes) — ce sont des statistiques historiques, pas des recommandations d'action, la logique de filtrage ne s'y applique pas.

**Tests** : backend `test_api_recruteur`/`test_api_paliers_gating` 23/23 ✅, `npx vite build` propre.

## 🆕 SESSION 23/08/2026 (suite) — Dashboard recruteur : grille stricte + sidebar recommandés (2e mockup employeur)

**Contexte** : après la restructuration du jour même (Pipeline/Offres actives/Activité récente sur une ligne 3 colonnes), l'employeur a fourni un 2e mockup (dashboard style LinkedIn Talent) montrant une vraie disposition en grille avec une colonne latérale droite sticky dédiée aux candidats recommandés. Brainstormé (spec `docs/superpowers/specs/2026-08-23-dashboard-recruteur-grille-sidebar-design.md`, plan `docs/superpowers/plans/2026-08-23-dashboard-recruteur-grille-sidebar.md`), implémenté en inline (changement d'un seul fichier, pas de sous-agents).

**Nouveau layout `DashboardRecruteur.jsx`** : la section aperçu passe en `grid-cols-1 lg:grid-cols-3` — colonne contenu (`lg:col-span-2`, grille interne 2 colonnes) avec Évolution+Pipeline sur une ligne, Offres actives+Sources sur la ligne suivante, Activité récente en pleine largeur (`md:col-span-2`) en 3e ligne ; colonne sidebar (`lg:col-span-1 sticky top-20`) contenant uniquement le widget Candidats recommandés.

**Widget Candidats recommandés simplifié pour la sidebar** : retrait de la checkbox "Masquer retenus/refusés" et de la pagination "Voir plus" (state `recommandesLimit` gardé pour compat avec le filtre offre, mais `candidatsRecommandes`/`hasMoreRecommandes` supprimés — devenus morts) — remplacés par un lien "Voir plus de candidats recommandés →" vers la page dédiée déjà existante `/candidats-recommandes` (`CandidatsRecommandesPage.jsx`, Phase 2b). Le détail matching complet et le changement de statut inline restent uniquement sur cette page dédiée, pas de perte de fonctionnalité.

**Piège corrigé pendant le brainstorm** : le spec initial supposait la route `/dashboard/candidats-recommandes` — vérifié dans `App.jsx:314`, la vraie route est `/candidats-recommandes` (sans préfixe). Le plan/l'implémentation utilisent la route réelle.

**Tests** : `DashboardRecruteur.test.jsx` 10/10 ✅ (nouveau test HP5 avec un candidat scoré complet, vérifie le rendu de la carte + le `href` du lien sidebar), frontend 424/424 ✅, `npx vite build` propre.

## 🆕 SESSION 23/08/2026 (suite 2) — Polish visuel dashboard (funnel/sources/activité) + déplacement "Gestion de vos offres"

**Contexte** : retours utilisateur en continu sur le rendu réel du dashboard (captures d'écran) après la refonte grille ci-dessus.

**Funnel de pipeline cassé, réécrit** (`Components/FunnelChart.jsx`) : l'ancienne version SVG (`viewBox` fixe 320×42 + `<text>` centré) coupait le texte des étapes dès que le conteneur de la carte devenait plus étroit que le viewBox (texte tronqué des deux côtés, illisible). Remplacé par des `<div>` empilés (pas de SVG) — largeur en `%` proportionnelle au count avec un plancher `largeurMinPct=46`, `truncate` CSS natif comme filet de sécurité, `title` HTML pour le texte complet au survol. **Piège trouvé en écrivant le test** : une première version avec un `<span>` imbriqué pour styliser le `(pct%)` séparément faisait échouer `getByText` (deux éléments — le div parent et le span — matchaient le même texte) ; revenu à un unique texte enfant direct du `<div>`.

**Tentative "grille vers la droite" ratée puis annulée** : une demande de faire flotter plus de cartes par ligne (`xl:grid-cols-4` sur la grille interne) a écrasé toute la mise en page sur écran large (cartes ~180px, texte tronqué partout, donut illisible) — confirmé par capture d'écran utilisateur ("vous avez nique la page"). **Annulé intégralement**, retour à la disposition `md:grid-cols-2` qui fonctionnait. Leçon : ne pas empiler plusieurs widgets riches (graphique, funnel, tableau, donut) sur une même ligne au-delà de 2 colonnes sans wireframe validé au préalable — la densité de contenu de ces cartes ne supporte pas plus.

**Sources des candidatures — donut + légende colorée** (`Components/DonutChart.jsx`, nouveau) : SVG donut compact (cercles empilés via `stroke-dasharray`/`stroke-dashoffset`, total au centre) affiché à gauche du widget, légende à droite avec un point de couleur (`<span style={{backgroundColor}}>`) par source au lieu d'une simple barre de progression — répond à la demande "chacun sa couleur et un rond graph".

**Activité récente — emoji par type d'action** : `ActiviteRecenteAPIView` (`jobs/views/recruteur.py`) expose désormais le champ `action` brut du `EquipeActionLog` en plus de `phrase`/`date` (`{"id", "action", "phrase", "date"}`) — jusqu'ici seule la phrase formatée était renvoyée, aucune donnée structurée pour choisir une icône côté frontend. `ACTIVITE_EMOJIS` (`DashboardRecruteur.jsx`) mappe chaque valeur `EquipeActionLog.ACTIONS` (CREER_OFFRE 📢, MODIFIER_OFFRE ✏️, CLOTURER_OFFRE 🔒, STATUT_CANDIDATURE 🔄, EVALUER_CANDIDATURE ⭐, INVITER_MEMBRE 👥, RETIRER_MEMBRE 🚫, CHANGER_ROLE 🛡️, AUTRE 🔔) — remplace le simple point teal par un badge rond `w-7 h-7` avec l'emoji.

**"Gestion de vos offres" déplacée du Dashboard vers la page dédiée "Offres d'emploi"** (décision produit demandée puis confirmée par l'utilisateur) : la table détaillée (recherche, chips de filtre par statut, tri par colonne, édition/correction d'offre rejetée, suppression, vue mobile en cartes) — ~400 lignes de JSX + state (`activeTab`/`filtreStatut`/`search`/`sortConfig`/`showModifierModal`/etc.) — extraite de `DashboardRecruteur.jsx` vers `Pages/Recruteur/OffresListPage.jsx` (route déjà existante `/offres-emploi`, remplace l'ancienne version basique de cette page qui n'avait qu'un tableau minimal 5 colonnes). `OffresListPage.jsx` devient autonome : charge son propre `getDashboard()`/`getConstants()` au montage au lieu de recevoir les données du Dashboard. Raison : le Dashboard était devenu trop long (scroll excessif avant d'atteindre le contenu), et cette table dupliquait déjà en grande partie le rôle de la page sidebar "Offres d'emploi" existante (mini-liste "Mes offres actives" + lien "Voir toutes" sur le Dashboard sert de raccourci vers cette page, comme `/candidats-recommandes` pour le widget recommandés).
- **Nettoyage `DashboardRecruteur.jsx`** après extraction : state mort supprimé (`activeTab`, `filtreStatut`, `search`, `showModifierModal`, `offreAModifier`, `modifierForm`, `sortConfig`, `confirmDeleteId`, `deletingId`, `constants` + son fetch `getConstants()`), handlers morts supprimés (`handleOuvrirModification`, `handleSauvegarderModification`, `handleSupprimerOffre`), imports inutilisés retirés (`Select`, `SecteurDomaineSelect`, `selectStylesTeal`, `InfoBanner`, `ChevronRight`, `MapPin`, `AlertTriangle`, `Trash2`, `X`), constante `GRID` déplacée. Bundle `DashboardRecruteur` : 48,5 Ko → 31 Ko après nettoyage.
- Bouton "Voir toutes" (mini-liste "Mes offres d'emploi actives" du Dashboard) : `setActiveTab("ouvertes")` (onglet local, maintenant inexistant) → `<Link to="/offres-emploi">`.

**Tests** : `FunnelChart.test.jsx` 2/2 ✅ (inchangé, compatible avec la réécriture), `DashboardRecruteur.test.jsx` — 2 tests obsolètes supprimés (HP2/HP4 testaient la navigation d'onglets Offres en cours/Archives, fonctionnalité déplacée), 8/8 ✅. Nouveau `OffresListPage.test.jsx` (4/4 ✅ : bascule onglets, recherche, suppression avec confirmation, erreur de chargement/télémétrie) — la page n'avait aucun test avant cette session. Frontend 426/426 ✅, backend `test_api_recruteur` 9/9 ✅ (champ `action` ajouté sans casser le format existant), `npx vite build` propre, `python manage.py check` propre.

## 🆕 SESSION 23/08/2026 (suite 3) — Widget recommandés capé à 3 + grille 2 lignes × 3 colonnes (fin des zones vides)

**Contexte** : itérations rapides sur la sidebar "Candidats recommandés" — d'abord demande explicite de limiter l'affichage à 3 candidats (`slice(0, 6)` → `slice(0, 3)`), ce qui a raccourci la sidebar et laissé un vide sous "Mes offres actives/Sources" (2 lignes de contenu vs 1 seule carte courte en face). Une 1ʳᵉ tentative a déplacé "Activité récente" dans la sidebar sous les recommandés — a résolu le vide côté contenu mais en a créé un nouveau côté contenu cette fois (la sidebar recommandés+activité devenait plus haute que les 2 lignes de contenu). L'utilisateur a explicitement rejeté cette 2ᵉ tentative ("non, je veux organiser bien sans espace vide").

**Solution retenue — grille à 2 lignes de 3 colonnes strictement alignées** (au lieu d'une colonne "contenu" 2/3 + une colonne "sidebar" 1/3 séparées) :
- **Ligne 1** (`grid grid-cols-1 lg:grid-cols-3 items-stretch`) : Évolution | Pipeline de recrutement | Candidats recommandés (top 3).
- **Ligne 2** (même pattern) : Mes offres d'emploi actives | Sources des candidatures | Activité récente.

`items-stretch` (comportement par défaut de CSS Grid, explicité ici) fait que les 3 cartes d'une même ligne s'étirent toujours à la hauteur de la plus haute — le vide résiduel (ex. si Candidats recommandés n'a que 3 petites cartes face à un graphique Évolution plus haut) reste **à l'intérieur** de la carte elle-même (padding en bas, fond de carte visible) au lieu d'un trou de fond de page entre deux colonnes de hauteurs différentes — c'est ce qui donne l'effet "rien d'espace vide" demandé, sans calcul de hauteur manuel ni JS.
- Sidebar sticky abandonnée (n'a plus de sens dans ce pattern — chaque widget vit désormais dans sa propre ligne, pas dans une colonne qui défile indépendamment).
- Widget recommandés : toujours capé à 3 (`candidatsRecommandesTous.slice(0, 3)`), lien "Voir plus de candidats recommandés →" vers `/candidats-recommandes` inchangé.
- **Filtre "masquer retenus/refusés" retiré silencieusement de ce widget compact** (`masquerDecides` supprimé, plus de checkbox depuis la session précédente) — les candidats recommandés affichés ici sont désormais TOUS les candidats scorés, décidés ou non, pour éviter qu'ils disparaissent sans moyen de les revoir (la page dédiée `/candidats-recommandes` garde son propre toggle indépendant).
- **Nettoyage further** : `handleChangerStatutRecommande`, `expandedMatchId`, `statutMenuOuvertId`, `changingStatutId`, `recommandesLimit`/`setRecommandesLimit` — tous du state/handlers morts issus d'une ancienne version plus riche du widget (détail matching dépliable + dropdown statut inline), jamais consommés dans le JSX actuel, supprimés.

**Tests** : `DashboardRecruteur.test.jsx` 8/8 ✅ (aucune régression, la disposition CSS n'était pas testée), frontend 426/426 ✅, `npx vite build` propre.

## 🆕 SESSION 22-23/08/2026 (suite) — Refonte portail recruteur : gating réel, paiement Chargily, facturation, audit

**Contexte** : suite directe des Phases 1/2a. Toutes les pages sidebar restantes construites, le gating par palier réellement câblé côté serveur (pas seulement affiché), le paiement réel branché, et plusieurs failles trouvées en auditant l'implémentation face au mockup — corrigées le jour même.

### Phase 2b — Gating réel par palier

**Nouveau `jobs/paliers_utils.py`** — seule source de vérité pour "quel palier a cette entreprise" :
- `get_palier_actif(entreprise)` : retourne le `Palier` actif via `AbonnementEntreprise`, ou **repli legacy** vers BUSINESS si `entreprise.est_premium_actif=True` mais pas encore d'`AbonnementEntreprise` — **indispensable** car les flux d'activation existants (`AdminDemandesPremiumAPIView`, ancien webhook Chargily `nb_mois`) écrivent encore directement `est_premium`/`premium_expire_at` sans créer d'`AbonnementEntreprise`. Sans ce repli, un compte activé par ces flux se serait retrouvé bloqué partout malgré un paiement réel — bug trouvé en comparant aux tests existants (`test_api_cvtheque.py`/`test_api_premium.py`/`test_api_recruteur.py` utilisent tous `est_premium=True` sans `AbonnementEntreprise`, auraient tous cassé sans ce repli).
- `limite_offres_actives(entreprise)` : Gratuit=1 (codé en dur, pas de ligne `Palier` pour ce cas), sinon `palier.limite_offres`.
- `quota_cv_atteint(entreprise)` : recompte les `TelechargementCV` du mois calendaire en cours (nouveau modèle, log à chaque téléchargement) — jamais un compteur stocké à incrémenter/reset.

**Endpoints rebranchés sur les paliers** (remplacent `est_premium_actif`) :
- `JobCreateAPIView` — bloque la publication au-delà de `limite_offres_actives`, 403 `LIMITE_OFFRES_ATTEINTE`.
- `GenererOffreIAAPIView` — débloqué dès qu'un palier actif existe (Starter+).
- `CVThequeView` — accès total bloqué si Gratuit (403), `is_premium` (context serializer, masque email/téléphone) devient `palier.acces_coordonnees` au lieu du binaire premium. Branche `offre_id` (tri par matching) exige en plus `palier.acces_ia_recommandes` (Pro+).
- `InviterMembreAPIView` — bloque l'invitation si palier absent ou `acces_equipe=False` (Business+). Frontend `ParametresRecruteur.jsx` : nouvel état `accesEquipe` (depuis `dash.acces_equipe`) remplace `isPremium` pour la visibilité de l'onglet "Mon équipe" — le propriétaire garde quand même toujours accès (peut gérer/virer des membres même sans palier suffisant, décision déjà actée).
- **Quota CV** : `CandidatFichierPriveAPIView._acces_autorise()` retourne désormais `(acces, via_cvtheque)` — le quota mensuel n'est compté QUE si l'accès vient de la navigation CVthèque premium (pas d'une vraie candidature reçue, ni du candidat/admin). 403 `QUOTA_CV_ATTEINT` au-delà.
- **Recherche avancée CVthèque** (Business+) — 🐛 **trouvé en audit, pas dans le plan initial** : les filtres `langues`/`competences`/`niveau_experience`/`service_militaire` de `CVThequeView` n'étaient différenciés par AUCUN palier (Starter avait accès à tout comme Business, alors que le tableau comparatif promettait "Recherche avancée" réservée). Fix : ces 4 filtres sont désormais silencieusement ignorés côté API si `!palier.acces_ia_avancee` (pas d'erreur, dégrade juste vers une recherche basique). Nouveau champ `recherche_avancee` dans la réponse — `CVTheque.jsx` grise ces 4 champs + tooltip "palier Business+" + lien vers Abonnements quand `false`.
- **Candidats recommandés (page dédiée)** — 🐛 **trouvé en audit** : la page sidebar "Candidats recommandés" n'était gatée QUE côté frontend (écran de verrouillage), alors que les données sous-jacentes (`score_matching` de toutes les candidatures) étaient déjà exposées sans restriction via `/dashboard`. Fix : nouvelle vue dédiée `CandidatsRecommandesAPIView` (`GET jobs/dashboard/candidats-recommandes/`, paginée 12/page, tri `-score_matching`, filtre `masquer_decides`), vrai 403 `PALIER_INSUFFISANT` si palier < Pro. `CandidatsRecommandesPage.jsx` réécrite pour consommer cet endpoint au lieu d'agréger `dash.offres` côté client.
- **Répartition par score (Statistiques)** — même faille trouvée et même fix : nouvelle vue `StatistiquesAvanceesAPIView` (`GET jobs/dashboard/statistiques-avancees/`), 403 `PALIER_INSUFFISANT` si palier < Business, sinon renvoie `repartition_score` (5 tranches) calculée strictement sur les candidatures de l'entreprise. `StatistiquesPage.jsx` ne calcule plus cette répartition côté client.
- **Décision assumée, pas un bug** : "Candidats recommandés" restait initialement en verrou frontend uniquement avant l'audit — argument à l'époque : le score de matching n'a jamais été une donnée confidentielle dans ce projet (visible sur chaque candidature dans `GestionOffre` peu importe le palier). Corrigé quand même par cohérence avec le reste du tableau comparatif qui promet une vraie restriction.

**Dashboard enrichi** (`DashboardRecruteurAPIView`) : nouveaux champs `palier_actif` (nom ou `null`), `acces_equipe`, `acces_ia_recommandes`, `acces_ia_avancee` — calculés une fois via `get_palier_actif()`, consommés par plusieurs pages/badges.

### Les 9 pages sidebar restantes construites

`OffresListPage.jsx`, `CandidaturesListPage.jsx`, `RecrutementsPage.jsx`, `CandidatsRecommandesPage.jsx`, `StatistiquesPage.jsx`, `EntretiensPage.jsx` (vrai calendrier mensuel, grille CSS pure, pas de librairie), `AbonnementsPage.jsx`, `FacturationPage.jsx` — toutes nichées sous `RecruteurLayout`, ajoutées à la sidebar au fur et à mesure (pattern déjà acté en Phase 1 : pas de lien mort).
- Offres/Candidatures/Recrutements/Statistiques (évolution+pipeline) réutilisent `jobsService.getDashboard()` déjà chargé, calcul 100% client — pas de nouvel endpoint pour ces vues simples.
- **Simplification assumée vs. plan initial** : les graphiques avancés de `DashboardRecruteur.jsx` (comparaison période précédente, export PNG/CSV, toggle courbe/barres) n'ont PAS été extraits/déplacés vers `StatistiquesPage.jsx` — dupliqués en version simplifiée à la place. Risque jugé trop élevé de retirer du code d'un fichier déjà lourdement testé (`DashboardRecruteur.test.jsx`, 9/9) sans pouvoir vérifier immédiatement (tests différés à la fin de session). `DashboardRecruteur.jsx` garde donc pour l'instant ses propres graphiques en plus de la nouvelle page dédiée — à consolider dans une session future.
- **Non fait (reporté)** : le graphique "temps moyen de traitement par étape du pipeline" (2ᵉ graphique avancé prévu au spec) — nécessite un nouveau modèle d'historique des changements de statut (`CandidatureStatutHistorique`), jamais tracé aujourd'hui. Seul le 1ᵉʳ graphique avancé (répartition par score) a été fait.

### Facturation — modèles + PDF + paiement réel

**Nouveaux modèles** (migration `0084`) : `MentionsLegalesEntreprise` (singleton `get_solo()`, RC/NIF/adresse/TVA — placeholders éditables par l'admin sans déploiement, panel `AdminMentionsLegales.jsx`) et `PaiementAbonnement` (log de chaque paiement confirmé — `palier_nom`/`montant_da` dénormalisés, jamais de FK vers `Palier`, même principe que `PremiumPlan` : supprimer un palier plus tard n'altère jamais une facture déjà émise ; `numero_facture` auto-généré format `TT-{année}-{00001}`).

**`FacturePDFAPIView`** — génère la facture au style du bulletin de placement candidat (`GenererBulletinPDFAPIView`) : bandeau indigo + logo TafTech, bandeau teal "Paiement confirmé", tableau détail (palier/période/montant), tampon "✓ PAYÉE", bloc signature — même patron ReportLab, cohérence visuelle entre les deux PDF du site.

**Paiement Chargily réel branché sur les 4 paliers** (`ChargilyCheckoutPalierAPIView`, nouvel endpoint) — même mécanisme que l'ancien système Premium (`ChargilyCheckoutAPIView`), les deux coexistent. Le webhook unique (`ChargilyWebhookAPIView`) détecte `metadata.palier_nom` pour dispatcher vers le nouveau flux (crée/prolonge `AbonnementEntreprise` + `PaiementAbonnement`, **et** garde `est_premium`/`premium_expire_at` en phase pour compat avec l'UI legacy) vs. l'ancien flux `nb_mois` inchangé.
- 🐛 **Bug de test réel trouvé et corrigé en conditions réelles** : premier test de paiement Chargily (mode test) sans résultat — diagnostiqué non pas comme un bug de code mais un webhook injoignable (ngrok non lancé, donc Chargily ne pouvait pas notifier le backend local). Confirmé par requête shell (`PaiementAbonnement.objects.count()==0`, aucun `AuditLog` du jour). Une fois ngrok relancé + URL webhook mise à jour dans le dashboard Chargily test, le paiement a créé la facture `TT-2026-00001` correctement.
- **Résiliation** (bouton manquant, ajouté après coup) : nouveau `MonAbonnementAPIView` (`GET`/`PATCH jobs/paliers/mon-abonnement/`) — bascule `AbonnementEntreprise.renouvellement_auto` (champ déjà présent depuis la Phase 2a, jamais exposé). "Résilier" ne coupe jamais l'accès immédiatement (cohérent avec le badge "Sans engagement") : l'entreprise garde son palier jusqu'à `date_expiration`, retombe ensuite sur Gratuit. Bouton dans le panneau de statut de `AbonnementsPage.jsx`, confirmation via `confirmToast`.
- **Ancienne page Premium consolidée** : `/recruteurs/premium` redirige désormais vers `/recruteurs/abonnements` (`<Navigate replace>`) — plus de duplication d'UI. Tous les liens `NavbarRecruteur.jsx` ("Mon Premium ⭐"/"Passer Premium 🔒") pointent vers la nouvelle route.

### 3 bugs trouvés en auditant visuellement contre le mockup (captures d'écran utilisateur)

1. **Badge navbar codé en dur** : "⭐ Premium · date" au lieu du vrai nom du palier — `NavbarRecruteur.jsx` lisait seulement le booléen `est_premium`, jamais `palier_actif`. Fix : nouvel état `palierNom`, `NOM_PALIERS` map, badge + libellés dropdown/mobile affichent maintenant "Pro"/"Business"/etc.
2. **7 des 9 nouvelles pages invisibles sur mobile** : `RecruteurLayout` (sidebar) est `hidden md:block` comme `CandidatLayout` — mais Offres/Candidatures/Recommandés/Entretiens/Recrutements/Statistiques/Facturation n'avaient jamais été ajoutées au hamburger mobile de `NavbarRecruteur.jsx` (seuls Mon équipe/Favoris l'avaient été en Phase 1). Fix : les 7 routes ajoutées au menu mobile, toujours visibles (pas de `dup` masquage — `BottomNavRecruteur` ne les couvre pas).
3. **Cartes paliers incomplètes vs. mockup** : les cartes `AbonnementsPage.jsx` n'affichaient que 4-6 bullets sur les ~10 du mockup — manquaient "Téléchargement CV" (limité/illimité), "Coordonnées candidats" en ligne séparée (❌ visible en gris pour Starter, pas juste omise), "Export & rapports personnalisés" (Business), et les 5 bullets marketing spécifiques Enterprise (Intégration API, Accompagnement dédié, Formation de vos équipes, Rapports sur mesure, Confidentialité renforcée — texte promotionnel pur, pas de fonctionnalité câblée derrière, cohérent avec "Enterprise = contact manuel" déjà décidé).

**Audit sécurité** : tous les nouveaux endpoints (`CandidatsRecommandesAPIView`, `StatistiquesAvanceesAPIView`, `MonAbonnementAPIView`, `FacturesListAPIView`, `FacturePDFAPIView`) vérifient `get_entreprise_for_user()` + scopent strictement à l'entreprise de l'utilisateur connecté (sauf ADMIN pour les factures). `MentionsLegalesAdminAPIView` : `IsAdminUser` + vérif rôle. Webhook Chargily : signature HMAC-SHA256 déjà vérifiée avant tout traitement (inchangé), le nouveau branchement `palier_nom` est en aval de cette vérification.

**Tests** : vérification complète lancée en fin de session — **11 régressions trouvées et corrigées** dans les fixtures de tests existantes (pas dans le code applicatif) :
- `test_api_equipe.py::InviterMembreTests` (6 tests) — l'entreprise de test n'avait aucun palier ; le nouveau gate `acces_equipe` la bloquait avant même d'atteindre la logique testée. Fix : `_make_entreprise(..., premium=True)` (repli legacy → Business).
- `test_api_paliers_gating.py::CVThequeGatingAPITest` (2 tests) — `make_entreprise()` ne mettait pas `consentement_cvtheque=True`, `CVThequeView` bloquait avant même d'atteindre le nouveau check palier. Fix : ajouté à la fixture.
- `test_api_paliers_gating.py::LimiteOffresPublicationAPITest` (2 tests) — payload de test avec `diplome="MASTER"`/`experience_requise="1"`, valeurs invalides (les vrais choix sont `MASTER_2`/`CONFIRME`) — 400 de validation avant même d'atteindre la logique de quota testée. Fix : payload corrigé.

Après corrections : **backend 317/317 ✅** (suite complète `jobs.tests`), **frontend 419/419 ✅**, `npx vite build` propre, `python manage.py check` propre.

## 🆕 SESSION 22/08/2026 (suite) — Refonte portail recruteur (Phase 2a : modèle Paliers backend + admin)

**Contexte** : suite directe de la Phase 1 (sidebar). Spec complet : `docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md`. Plan : `docs/superpowers/plans/2026-08-22-recruteur-paliers-phase2a.md`.

**Nouveaux modèles** (`jobs/models.py`, migration `0079`) : `Palier` (nom STARTER/PRO/BUSINESS/ENTERPRISE unique, prix mensuel/annuel nullable — null = "Sur devis" pour Enterprise —, `remise_annuelle_active`, `limite_offres`/`limite_cv_mois` nullable = illimité, `acces_coordonnees`/`acces_ia_recommandes`/`acces_ia_avancee`/`acces_equipe` booléens, `support_label` texte libre, `ordre`, `actif`) et `AbonnementEntreprise` (OneToOne vers `ProfilEntreprise`, FK `palier` PROTECT, `date_debut` auto, `date_expiration` nullable = illimité, property `est_actif`).

**Migration de données** (`0080_seed_paliers_migrer_premium.py`) : seed des 4 paliers avec les valeurs exactes du mockup employeur (Starter 5900/70800 DA, Pro 12900/154800 DA, Business 22900/274800 DA, Enterprise sur devis) + bascule automatique des entreprises `est_premium=True` (ancien système) vers `AbonnementEntreprise(palier=BUSINESS, date_expiration=<premium_expire_at existant>)`, sans re-paiement forcé. Texte des valeurs dupliqué en dur dans la migration (pas d'import du code applicatif), même principe que la migration `0075` déjà documentée dans ce fichier — une migration reste un instantané figé.

**Backend CRUD** (`jobs/views/paliers_admin.py`, pattern identique à `PremiumPlansAdminAPIView`) : `PaliersPublicAPIView` (`GET jobs/paliers/`, `AllowAny` + `PublicReadThrottle`, cache 1h `jobs_paliers`, ne retourne que `actif=True` — consommé par une future page Abonnements, pas encore construite) et `PaliersAdminAPIView` (CRUD complet, `IsAdminUser` + vérif rôle, invalide le cache à l'écriture).

**Panel admin `AdminPaliers.jsx`** (route `/admin-taftech/paliers`, sidebar section "Système") : tableau des 4 paliers + modale d'édition complète (prix, limites, accès, support). **Pas de bouton Ajouter/Supprimer** (contrairement à `AdminPremium.jsx`) — les 4 paliers sont fixes (contrainte `unique=True` sur `nom`), l'admin ajuste seulement les valeurs.

**🐛 Piège trouvé en testant (déjà anticipé dans le plan)** : les tests `PalierModelTest`/`AbonnementEntrepriseModelTest` (Task 1, écrits avant la migration de seed) créaient leurs propres `Palier(nom="STARTER"/"BUSINESS"/...)` sans vider la table d'abord — une fois la migration `0080` appliquée à la base de test, ces noms existaient déjà (contrainte unique), 6 tests en erreur sur la suite complète. Fix : `Palier.objects.all().delete()` ajouté en tête de `setUp()` des deux classes, même pattern que `CMSTestBase`/`PremiumPlanAPITest` déjà en place dans `test_api_cms.py`.

**🔴 IMPORTANT — ce qui n'a PAS changé cette session** : le gating existant (`CVThequeView`, limite d'offres — inexistante avant —, `GenererOffreIAAPIView`, candidats recommandés IA, gestion d'équipe) continue de lire `ProfilEntreprise.est_premium_actif` exactement comme avant. Les nouveaux modèles `Palier`/`AbonnementEntreprise` existent en base et sont administrables, mais **rien ne les consomme encore côté gating** — c'est la Phase 2b (plan séparé, pas encore écrit), qui rebranchera CVthèque/limite offres/quota CV/IA/équipe sur les nouveaux paliers.

**Tests** : `jobs/tests/test_api_paliers.py` (13/13 ✅ : 4 modèle Palier, 3 modèle AbonnementEntreprise, 6 API CRUD/permissions/cache), `AdminPaliers.test.jsx` (4/4 ✅), frontend 419/419 ✅, `npx vite build` propre, `python manage.py check` propre. Suite backend complète relancée après le fix ci-dessus.

**Non fait cette session (Phase 2b, à faire)** : rebrancher CVthèque (accès + coordonnées + quota CV/mois), limite d'offres actives à la publication, génération offre IA (Starter+), candidats recommandés IA (Pro+), recherche/filtres/stats IA avancés (Business+), gestion d'équipe (Business+) sur le nouveau modèle `Palier`/`AbonnementEntreprise` au lieu de `ProfilEntreprise.est_premium_actif`. Voir le spec complet pour le détail déjà tranché de chaque gate.

## 🆕 SESSION 22/08/2026 — Refonte portail recruteur (Phase 1 : sidebar)

**Contexte** : l'employeur a envoyé un mockup IA d'une page "Abonnements & tarifs" recruteur avec sidebar, 4 formules tarifaires, tableau comparatif, FAQ, etc. Brainstorming complet mené point par point (checklist exhaustive de la capture, rien laissé de côté — spec écrit incrémentalement pour ne rien perdre en implémentation, contrairement à une session précédente sur un autre projet où 90% avait été oublié à l'implémentation). Spec complet : `docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md`.

**Portée totale** (bien plus large que la seule page Abonnements) : nouveau layout à sidebar pour **tout** le portail recruteur (n'existait pas — contrairement au candidat qui a déjà `CandidatLayout.jsx`), refonte du système Premium binaire actuel en **4 vrais paliers** (Starter/Pro/Business/Enterprise) avec fonctionnalités différenciées, et 9 nouvelles pages sidebar (Offres, Candidatures, Candidats recommandés, Entretiens, Recrutements, Statistiques, Facturation, Favoris [réutilise CVthèque], Abonnements & tarifs). Découpage acté en **phases séparées**, chacune avec son propre plan d'implémentation (`docs/superpowers/plans/`) — cette session livre uniquement la **Phase 1**.

**Phase 1 livrée — `RecruteurLayout.jsx`** (`taftech_frontend/src/Pages/Recruteur/RecruteurLayout.jsx`, nouveau) : sidebar calquée sur `CandidatLayout.jsx` (même structure `useMemo` menu + `<aside className="hidden md:block">` + `<main><Outlet/></main>`), variante teal (nouveaux tokens `theme.js` : `sidebarShellTeal`/`sidebarLinkActiveTeal`/etc., même pattern que les tokens indigo candidat). **8 liens actifs** pour l'instant (uniquement des pages qui existent déjà — pas de lien mort) : Tableau de bord, CVthèque, Favoris, Messages, Publier une offre, Questionnaires, Mon équipe, Paramètres entreprise. Les 8 liens restants (Offres, Candidatures, Recommandés, Entretiens, Recrutements, Statistiques, Abonnements, Facturation) seront ajoutés un par un dans les phases suivantes, au fur et à mesure que chaque page est construite.

- **"Messages"** = `/candidatures-spontanees` renommé dans la sidebar (boîte de réception recruteur existante), badge = nombre de candidatures spontanées non lues (`jobsService.getCandidaturesSpontanees()`, filtre `!lue`).
- **"Favoris"** = pas une nouvelle page — lien vers `/cvtheque?favoris=true`. `CVTheque.jsx` lit désormais ce paramètre au montage (`useSearchParams`) pour ouvrir directement sur l'onglet Favoris (l'onglet existait déjà en interne, seule l'initialisation depuis l'URL est nouvelle).
- **Recherche Ctrl+K** : champ de recherche en haut de `RecruteurLayout` (raccourci clavier focus le champ), Entrée redirige vers `/cvtheque?search=<terme>` — réutilise la recherche CVthèque existante, aucun nouveau moteur/endpoint.
- **`App.jsx`** : les 8 routes recruteur connectées (`/dashboard`, `/dashboard/offres/:id`, `/creer-offre`, `/cvtheque`, `/candidatures-spontanees`, `/questionnaires`, `/parametres`, `/mon-equipe`) nichées sous un seul `<Route element={<RecruteurRoute><RecruteurLayout/></RecruteurRoute>}>` parent au lieu d'un `<RecruteurRoute>` individuel par route — même pattern que le bloc `CandidatLayout` déjà présent juste en dessous. Les `RoleGuard minRole="UTILISATEUR"` internes (creer-offre/cvtheque/questionnaires) sont préservés tels quels sur les routes enfants.
- **Parité mobile** (trouvé en revue de code, pas dans le plan initial) : `RecruteurLayout` n'a pas d'équivalent mobile (`hidden md:block`, comme `CandidatLayout`) — le menu hamburger + dropdown desktop de `NavbarRecruteur.jsx` couvraient déjà 6 des 8 liens mais pas "Mon équipe"/"Favoris" (nouveaux). Ajoutés aux deux listes existantes de `NavbarRecruteur.jsx` (dropdown desktop + hamburger mobile), même pattern `minRole`/`peutFaire` que les entrées existantes — pas de nouveau composant.

**Exécuté en Subagent-Driven Development** (4 tâches, chacune avec implémenteur + relecteur dédiés, un aller-retour de correctifs sur la tâche 2 pour la parité mobile ci-dessus) — voir `docs/superpowers/plans/2026-08-22-recruteur-sidebar-phase1.md`.

**Tests** : frontend 410/410 ✅ (410, +8 par rapport à la session précédente : nouveau `RecruteurLayout.test.jsx` + 1 test ajouté à `CVTheque.test.jsx`), `npx vite build` propre.

**Non fait cette session (phases suivantes)** : les 4 paliers Premium (Starter/Pro/Business/Enterprise, nouveau modèle `Palier`/`AbonnementEntreprise`, gating limite offres/CV mensuel/coordonnées), les 8 pages sidebar restantes (Offres, Candidatures, Recommandés, Entretiens, Recrutements, Statistiques, Abonnements & tarifs, Facturation) — voir le spec complet pour le détail déjà tranché de chacune.

**🐛 3 bugs réels trouvés en revue de branche complète (corrigés le jour même)** — la recherche Ctrl+K et le lien Favoris de `RecruteurLayout.jsx` naviguaient bien vers `/cvtheque?search=...`/`?favoris=true`, mais `CVTheque.jsx` ne réagissait pas correctement :
1. **`?search=` mort** : `CVTheque.jsx` ne lisait jamais le paramètre `search` de l'URL (seul `favoris` était lu) — taper Ctrl+K puis Entrée atterrissait bien sur `/cvtheque?search=...` mais le champ de recherche restait vide et aucune requête n'était lancée avec ce terme.
2. **`activeTab`/`search` non réactifs à un changement d'URL sans remount** : les deux étaient initialisés via `useState(...)` (exécuté une seule fois au montage) — React Router ne remonte pas `CVTheque` quand seule la query string change sur la même route, donc cliquer "Favoris" depuis `/cvtheque` (déjà monté) changeait l'URL sans jamais faire bouger l'onglet actif. Fix : nouveau `useEffect` keyé sur `searchParams` (`taftech_frontend/src/Pages/Recruteur/CVTheque.jsx`, juste après la déclaration de `searchParams`) qui resynchronise `activeTab` et `search` à chaque montage ET à chaque navigation vers une nouvelle query string — ne fight pas avec les handlers existants (clic onglet, saisie recherche) car il ne se déclenche que sur un vrai changement de `searchParams`, jamais sur une frappe clavier qui ne touche pas l'URL.
3. **Double highlight sidebar** : le lien "CVthèque" utilisait le check d'activation par défaut (`location.pathname === item.path`), donc restait actif même quand `favoris=true` était dans l'URL — les deux liens "CVthèque" et "Favoris" s'affichaient actifs simultanément. Fix : `isActive` dédié sur l'entrée "CVthèque" (`RecruteurLayout.jsx`) qui exclut explicitement `favoris=true`.

Tests ajoutés : `CVTheque.test.jsx` (recherche préchargée depuis `?search=`, navigation même-route `/cvtheque` → `/cvtheque?favoris=true` sans remount via un harnais `useNavigate` local), `RecruteurLayout.test.jsx` (Ctrl+K+Entrée navigue vers `/cvtheque?search=...`, un seul des deux liens CVthèque/Favoris actif dans chaque état d'URL).

**Tests** : frontend 415/415 ✅ (+5 par rapport à la Phase 1), `npx vite build` propre.

## 🆕 SESSION 21/08/2026 (suite 2) — Unification compétences, conseils IA réels, polish dashboard candidat

**Contexte** : suite directe de la refonte dashboard candidat de la session précédente. Retours utilisateur en continu sur l'implémentation initiale, traités un par un.

**Compétences unifiées profil ↔ Mes compétences** : le tag input de la page "Mon profil" (texte libre `ProfilCandidat.competences`) et la page structurée "Mes compétences" (`CompetenceCandidat`, avec niveau) étaient deux systèmes distincts qui divergeaient. Décision utilisateur explicite : les deux doivent refléter EXACTEMENT la même donnée, jamais une duplication. Fix :
- `ProfilCandidatAPIView.put()` (`jobs/views/profils.py`) : nouvelle fonction `_synchroniser_competences_depuis_texte(profil)` appelée à chaque écriture du champ `competences` — fait converger `CompetenceCandidat` vers la liste texte (ajoute les nouvelles au niveau DEBUTANT, supprime celles retirées, préserve le niveau des existantes).
- **Backfill paresseux** (`ProfilCandidatAPIView.get()` et `CompetenceCandidatAPIView.get()`) : un profil dont les compétences texte existaient déjà AVANT l'introduction de `CompetenceCandidat` n'avait jamais déclenché la synchro (elle ne se faisait qu'à l'écriture) — sans ce backfill à la lecture, "Mes compétences" restait vide indéfiniment pour tout profil existant tant qu'aucune resauvegarde n'avait lieu. Bug réel découvert en testant sur le vrai compte de l'utilisateur.
- `ProfilCandidatDTO` (`jobs/serializers/profils.py`) expose désormais `competences_detail` (nouveau `CompetenceCandidatSerializer`) en plus du texte libre `competences`.
- Frontend `ProfilCandidat/index.jsx` : la section Compétences affiche maintenant `profil.competences_detail` (tags avec sélecteur de niveau inline + suppression) au lieu de `profil.competences.split(",")` — ajout via `jobsService.ajouterCompetence(label, "DEBUTANT")` au lieu du mécanisme `handleAddTag` générique (toujours utilisé pour les langues).
- **Décision produit reconfirmée** (page "Mes compétences" faillie supprimée par erreur puis restaurée sur demande explicite) : garder les DEUX écrans (profil = usage courant rapide, Mes compétences = gestion dédiée avec recherche), la donnée sous-jacente étant maintenant unique.

**🚨 Incident — données de test réelles écrasées** : plusieurs commandes de smoke-test lancées via `python manage.py shell` contre la base de dev réelle (pas une base de test isolée) utilisaient `User.objects.filter(role='CANDIDAT').first()` sans `order_by` explicite — non déterministe côté PostgreSQL, a retourné tantôt le compte `meriembelamri432@gmail.com` (id 5) tantôt le compte réel de l'utilisateur `zoheir.fll31@gmail.com` (id 7) selon l'appel. Résultat : les 16 compétences réelles du compte de l'utilisateur ont été écrasées par des valeurs de test. Restauré manuellement à partir des captures d'écran partagées dans la conversation (seule source de la valeur d'origine, la BD ne la conservait plus). **Leçon actée : ne plus jamais faire de `.filter().first()` sans `order_by` ni muter des données via shell contre la base de dev réelle — utiliser `.get(email=...)` sur un compte identifié, ou le framework de test Django avec une base isolée.**

**Parser CV — niveau détecté par compétence** : `PROMPT_CV_COMPLET` (`jobs/cv_parser.py`) étend l'extraction avec `competences_niveaux` — même format texte que les langues (`"Compétence:Niveau, ..."`), Groq estime le niveau depuis le contexte du CV (ancienneté, mentions, mots comme "maîtrise"/"notions"). Nouvelle fonction `_parser_niveaux_competences()` convertit vers les codes `CompetenceCandidat.NIVEAU_CHOICES`. `parse_cv()` expose `result["competences_niveaux"]` (dict `{label: code}`). Frontend (`useProfilCandidat.js::handleValiderParsing`) : après la sauvegarde du profil (qui crée les compétences au niveau DEBUTANT par défaut via la synchro), affine chaque niveau détecté via `jobsService.ajouterCompetence(label, niveau)`. Aperçu de confirmation (`Modals.jsx`) affiche le niveau à côté de chaque compétence détectée.

**Conseils personnalisés — LLM réel, pas déterministe** : première version (règles if/else côté client) jugée insuffisante par l'utilisateur ("non faites le llm, et pas qu'un seul conseil"). Remplacé par un vrai appel Groq :
- Nouveau `jobs/conseils-personnalises/` (`ConseilsPersonnalisesIAAPIView`, `jobs/views/candidat_dashboard.py`) — envoie au LLM le score de profil, les statuts de candidatures, les compétences non confirmées, le nombre d'alertes ; retourne 3-5 conseils concrets en JSON strict (`response_format: json_object`, comme `GenererOffreIAAPIView`). `GroqThrottle` réutilisé (20/h).
- **Nouveau toggle admin** `AIConfig.conseils_dashboard_actif`/`_max_tokens`/`_prompt` (migration `0078`), ajouté à `AdminIAConfig.jsx` (5ᵉ carte fonctionnalité) — même pattern kill-switch que les 4 fonctionnalités IA existantes.
- **Décision** : contrairement au Score de profil (volontairement déterministe, cf. session précédente — fiabilité d'un score arbitraire), les conseils sont du texte reformulé à partir de données réelles fournies dans le prompt, pas une auto-évaluation numérique — cas d'usage où le LLM est fiable.
- Widget dashboard toujours visible (même vide) plutôt que masqué silencieusement en cas d'échec — affiche le message d'erreur exact renvoyé par le backend (503 si désactivé par l'admin, sinon message générique).

**Recherche rapide dans le dashboard candidat** : après plusieurs tentatives ratées de l'intégrer dans la `Navbar.jsx` globale (collisions de layout avec les liens de navigation et les icônes de compte à largeur de fenêtre réduite, revert complet à deux reprises), décision finale : barre de recherche + sélecteur wilaya **dans la page `CandidatDashboard.jsx` elle-même**, pleine largeur, juste sous le titre — pas dans la navbar. Soumission navigue vers `/offres?search=...&wilaya=...` (déjà lu par `JobsList.jsx` via `useSearchParams`).

**Alertes d'emploi — widget dashboard enrichi** : affiche désormais wilaya + fréquence (Quotidienne/Hebdomadaire) sous chaque alerte (pas seulement les mots-clés), liste complète (plus de troncature à 4), et une bascule groupée "Recevoir mes alertes par email" en haut du widget qui active/désactive toutes les alertes du candidat en un clic (boucle sur `jobsService.toggleAlerte` existant, aucun nouveau endpoint).

**Mise en page — alignement sur le palier "Petit" du design system** : le dashboard avait dérivé vers une densité encore plus compacte que le palier "Petit" documenté (Login/ReviewCandidature/CVthèque), créant une incohérence visuelle marquée avec le reste du site. Remonté à `text-sm`/`text-xl`, `p-5`, icônes 16px — cohérent avec le reste de l'app, toujours nettement plus dense que le palier "Grand" (ProfilCandidat/MesCandidatures). Colonne latérale (Suivi candidatures/Alertes/Activité) passée en `sticky top-20` pour éviter un grand vide visuel quand elle est plus courte que la colonne principale.

**Offres recommandées — carte dédiée** : `JobCard` générique (conçue pour des grilles pleine largeur) rendait mal dans le carrousel étroit du dashboard. Nouveau composant local `RecommendedJobCard` (logo circulaire, titre, wilaya, badges CDI/Compatible, salaire) — plus proche du mockup, sans les actions "Postuler"/"Voir détails" superflues dans ce contexte compact.

**Analyse de mon CV — remplace l'ancien widget "Score de profil" isolé** : même score composite déterministe (session précédente, inchangé), mais présenté avec un message contextuel ("Bon profil !"/"Profil à renforcer") et deux colonnes **Points forts / À améliorer** dérivées des composantes du score (ratio points/max ≥ 0.7 = point fort), plus une liste "Compétences à développer" (barres de progression par niveau, exclut les compétences déjà Confirmées) — remplace l'ancien widget "Mes compétences" (liste plate) sur le dashboard uniquement, la page dédiée "Mes compétences" reste inchangée.

**🐛 Piège récurrent (déjà documenté dans ce fichier pour le chantier CMS) reconfirmé** : le changement de rendu des compétences dans `ProfilCandidat/index.jsx` (texte → `competences_detail`) a cassé silencieusement 2 tests (`ProfilCandidat.test.jsx`, et `RegisterCandidat.test.jsx` — qui teste en réalité `<ProfilCandidat />`, nom de fichier trompeur) car leurs mocks de profil n'incluaient pas `competences_detail`. Fix : ajout du champ aux fixtures + mocks `jobsService.ajouterCompetence`/`supprimerCompetence`/`searchCompetences` + réécriture de l'assertion HP4 (attendait un `FormData` PUT sur `/profil/`, attend maintenant un appel direct à `ajouterCompetence`).

**Tests** : backend 338/338 ✅, frontend 402/402 ✅, `npx vite build` propre, `python manage.py check` propre, endpoints IA vérifiés en conditions réelles (Groq réel, pas mocké) contre la base de dev.

---

## 🆕 SESSION 21/08/2026 (branche `specs/important-features`) — Refonte tableau de bord candidat (mockup employeur)

**Contexte** : l'employeur a envoyé des mockups générés par IA montrant une refonte souhaitée du tableau de bord candidat. Chaque point discuté individuellement avec l'utilisateur avant tout code (14 points au total : 6 "réorganiser l'existant", 8 "nouvelles fonctionnalités"), puis délégation complète ("faites tt debrouilles vous je vais sortir je compte sur votre expertise"). Nouvelle branche `specs/important-features` créée depuis `main` à jour (après commit du travail précédent : prompts IA éditables + audit dashboard admin).

**Décisions actées point par point** :
1. Jauge de complétude compacte + 6 sous-barres par catégorie (Informations personnelles, Expérience professionnelle, Compétences, Formation, Langues, CV), chacune avec tooltip listant ses critères exacts.
2. Offres recommandées : badge % de matching + carrousel horizontal (au lieu d'une liste verticale figée).
3. Nouveau **Score de profil** composite /100, remplace l'ancienne "Analyse IA du CV" comme widget principal — **volontairement pas généré par l'IA** (peu fiable pour s'auto-noter sur une échelle arbitraire), calcul déterministe backend : complétude (25pts) + diplôme (20pts, barème hiérarchique) + expérience (20pts, années plafonnées à 10) + langues (15pts, moyenne des niveaux déclarés) + pertinence marché (20pts, moyenne du score de matching sur les offres actives, réutilise `matcher.calculer_score_matching` sans nouvelle logique). "Pourquoi ce score ?" (explication détaillée) volontairement reporté — pas encore fait.
4. Dernières candidatures : logo entreprise ajouté (nouveau champ `entreprise_logo_url` sur `MesCandidaturesDTO`).
5. Alertes d'emploi : compteur "nouvelles offres" fiabilisé via un timestamp `derniere_consultation` (reset à la consultation) plutôt qu'un calcul figé — dupliqué sur le dashboard et sur `/alertes`.
6. Suivi candidatures : funnel 6 lignes (Envoyées / Présélection / En cours / Entretien / Retenu / Refusé) — décision : ne PAS fusionner Retenu+Refusé en une seule ligne "Décision".
7. **Compétences à développer** (%) — reporté, lié à la Feature 3 ("Mes tests") qui reste à décider.
8. Recommandations de formation externe (Udemy/Coursera) — **écarté**, pas fait.
9. **Mes tests** (évaluation de compétences) — **PARKÉ explicitement**, l'utilisateur veut y réfléchir davantage. Ne pas construire sans nouvelle demande.
10. **Prendre rendez-vous** — système complet avec agenda réel, entièrement configurable par l'admin, un seul conseiller/agenda (pas multi-intervenants).
11. **Mes documents** — espace 100% privé (jamais visible aux recruteurs), catégories de documents configurables par l'admin (pas codées en dur).
12. **Mes compétences** (page dédiée) — option structurée choisie : chaque compétence a un niveau auto-déclaré (Débutant/Intermédiaire/Avancé/Confirmé), conçu pour s'articuler plus tard avec un statut "Vérifié par test" une fois "Mes tests" construit.
13. **Activité récente** — fil d'événements "Candidature consultée" (recruteur a ouvert la candidature) et "Profil recommandé" (déclenché uniquement si score de matching ≥ 80%, même seuil que la convention "+80% IA" déjà en place ailleurs — pas pour une simple consultation de profil sans contexte).
14. **Publier mon CV** — simple raccourci vers le flux d'upload CV existant, aucun nouveau backend.

### Backend — 8 nouveaux modèles (`jobs/models.py`, migration `0076` + seed `0077`)
`CompetenceCandidat` (label, niveau, source — resynchronise `ProfilCandidat.competences` texte libre à chaque écriture pour ne rien casser côté `matcher.py`/`cv_parser.py`), `TypeDocument` (catalogue admin, seedé avec 5 types de départ : CV/Diplôme/Attestation/Lettre de motivation/Certificat), `DocumentCandidat` (FK profil + type, jamais exposé aux recruteurs), `ConfigRendezVous` (singleton `get_solo()`, délai min de réservation + horizon max), `DisponibiliteRecurrente` (gabarit hebdomadaire admin : jour + heures + durée créneau), `JourBloque`, `RendezVous`, `ActiviteProfil`. Champ `derniere_consultation` ajouté à `AlerteEmploi` existant.

**Score de profil** (`jobs/profile_score.py`, nouveau fichier) : `calculer_score_profil(candidat_user)` — 5 composantes documentées ci-dessus, réutilise `_annees_experience`/`_deduire_annees_sans_chevauchement` de `matcher.py` (pas de réimplémentation).

**Créneaux de rendez-vous calculés à la volée** (`jobs/views/candidat_dashboard.py::_generer_creneaux_disponibles()`) — jamais matérialisés en base individuellement, calculés à chaque requête à partir de 3 entrées indépendantes (gabarit hebdomadaire actif + jours bloqués + créneaux déjà réservés). Vérifié en conditions réelles : le délai minimum de réservation exclut bien les créneaux du jour même pour le jour de la semaine configuré, en sautant à l'occurrence de la semaine suivante.

**Compteur d'alertes fiable** (`AlerteEmploiSerializer.nb_nouvelles_offres`) : compte les offres publiées après `derniere_consultation` (ou `date_creation` si jamais consultée) — pas un compteur stocké à incrémenter, toujours recalculable, pas de race condition. Nouveau `AlerteMarquerVueAPIView` (`POST jobs/alertes/<id>/marquer-vue/`) reset le timestamp.

**Activité récente — anti-spam** : `CandidatureMarquerConsulteeAPIView` (`POST jobs/candidatures/<id>/marquer-consultee/`, appelé côté frontend recruteur dans `GestionOffre/index.jsx::handleSelectCandidature`, fire-and-forget) logue un événement `CANDIDATURE_CONSULTEE` via `get_or_create` (jamais de doublon). `CVThequeView.get()` (`jobs/views/recruteur.py`) logue `PROFIL_RECOMMANDE` pour tout candidat scoré ≥80% dans les résultats, **throttlé à 1 événement / 24h par paire (candidat, entreprise)** pour éviter le spam à chaque rafraîchissement de recherche CVthèque.

**19 nouvelles routes** ajoutées dans `jobs/urls.py`, toutes placées avant le catch-all final `<str:offre_id>/` (contrainte critique déjà documentée dans ce fichier — toute route littérale doit précéder ce pattern).

### Frontend
- **`Services/dashboardCandidatService.js`** (nouveau) — ~20 méthodes candidat + admin, réexporté dans la façade `jobsService.js` (`...dashboardCandidatService`).
- **`Pages/Candidat/CandidatDashboard.jsx`** — réécrit en entier : jauge compacte + 6 sous-barres avec `TooltipIcon`, carrousel offres recommandées (scroll horizontal + boutons flèches) avec badge `matching_score`, widget Score de profil (jauge + détail 5 composantes), funnel candidatures 6 lignes, dernières candidatures avec logo entreprise, widget alertes avec compteur fiable, widget Activité récente, 3 raccourcis vers Mes compétences / Mes documents / Prendre rendez-vous, bouton "Publier mon CV".
- **3 nouvelles pages candidat** : `MesCompetences.jsx`, `MesDocuments.jsx`, `PrendreRendezVous.jsx` — pattern déjà établi (`AlertesEmploi.jsx` : liste + modale + `confirmToast`). Ajoutées à `CandidatLayout.jsx` (sidebar) et aux routes `App.jsx` (dans le même `<Route element={<CandidatRoute><CandidatLayout /></CandidatRoute>}>`).
- **2 nouveaux panels admin** : `AdminRendezVous.jsx` (config délai/horizon + 3 onglets : créneaux récurrents / jours bloqués / liste rendez-vous avec changement de statut inline) et `AdminTypesDocuments.jsx` (CRUD simple, pattern `AdminFaq.jsx`). Routes + entrées sidebar section "Système" dans `AdminLayout.jsx`.

**Piège récurrent (déjà documenté dans ce fichier pour le chantier CMS) reconfirmé cette session** : l'ajout de `jobsService.marquerCandidatureConsultee` dans `GestionOffre/index.jsx::handleSelectCandidature` a fait échouer silencieusement (unhandled exception, pas un test rouge) `GestionOffre.test.jsx` — le mock `vi.mock("../src/Services/jobsService")` du test ne définissait pas cette méthode. Fix : ajout de `marquerCandidatureConsultee: vi.fn().mockResolvedValue(null)` au mock.

**Audit sécurité** : tous les nouveaux endpoints candidat vérifient `request.user.role == 'CANDIDAT'` explicitement (pattern déjà établi) ; tous les endpoints admin `IsAdminUser` + `request.user.role == 'ADMIN'`. Documents candidat (`DocumentCandidatAPIView`) scopés strictement à `request.user.profil_candidat` — jamais exposés aux recruteurs (aucune route recruteur/admin ne les expose). `RendezVousAPIView`/`RendezVousAnnulerAPIView` scopés à `candidat=request.user`. RAS.

**Tests** : backend 338/338 ✅ (2 échecs pré-existants sans rapport avec ce chantier corrigés au passage — `test_api_marche.py` référençait encore l'ancien champ `salaires_par_secteur`, renommé `tension_par_secteur` lors de la refonte dashboard admin du 21/08 ; mis à jour vers le nouveau format), frontend 402/402 ✅ (dont le fix `GestionOffre.test.jsx` ci-dessus), `npx vite build` propre, `python manage.py check` propre, tous les nouveaux endpoints vérifiés manuellement en conditions réelles contre la base de dev (`APIClient` en shell Django).

**Non fait cette session (hors scope explicite)** : "Mes tests" (Feature 3, parké par l'utilisateur), "Compétences à développer" %, recommandations de formation externes, explication détaillée "Pourquoi ce score ?" pour le Score de profil.

---

## 🆕 SESSION 21/08/2026 (suite) — Audit + refonte tableau de bord admin & données marché

**Contexte** : demande utilisateur d'auditer et d'améliorer le tableau de bord admin ("Vue d'ensemble" + "Données marché") à la lumière de tout le chantier CMS ajouté depuis (Premium, Blog, FAQ, Compétences, Bannières) — capture d'écran fournie montrant la table "Comparaison offres publiées vs attentes candidats" avec **"N/A" sur toutes les lignes de "Moy. candidats" et "—" sur toutes les lignes d'"Écart"**.

**🐛 Bug trouvé (pas un bug de calcul — une donnée source vide)** : `AdminMarcheAPIView` (`jobs/views/admin.py`) comparait le salaire proposé par l'offre (fiable, saisi par le recruteur) au salaire **déclaré comme souhaité par le candidat** (`ProfilCandidat.salaire_souhaite`, `CharField` libre) — ce champ n'est quasiment jamais rempli en pratique (aucune pression UX ne l'impose), donc `salaires_candidats` était vide pour tous les secteurs, `moy_candidats`/`ecart` toujours `None` → "N/A"/"—" partout. Même souci sur `top_secteurs.nb_candidats`, qui comptait `ProfilCandidat.secteur_souhaite` (préférence déclarée, tout aussi rarement renseignée) — vérifié en base réelle : résultats à 0 sur la plupart des secteurs alors que des candidatures existaient bel et bien.

**Fix — remplacé par un signal toujours peuplé** : au lieu des préférences déclarées par le candidat (jamais fiables), le nouveau calcul utilise les **candidatures réellement déposées** (`Candidature.offre__specialite`), qui existent forcément dès qu'un candidat postule. Nouvelle métrique `tension_par_secteur` (remplace `salaires_par_secteur`) : `candidatures_par_offre` = nb candidatures / nb offres actives par secteur — bas (< 1) signale une pénurie de candidats face aux postes ouverts (marché candidat), élevé signale beaucoup d'intérêt par poste (marché employeur). Salaire moyen proposé conservé (fiable, colonne seule, sans fausse comparaison). `top_secteurs.nb_candidats` bascule sur le même comptage de candidatures réelles.
- Vérifié en conditions réelles (pas juste lu le code) : appel direct des 2 endpoints via `APIClient` en session Django shell contre la base de dev — `tension_par_secteur` renvoie désormais des valeurs réelles (`candidatures_par_offre: 1.7`, `2.5`, `0.0`...) au lieu de `None` partout.
- Frontend (`AdminStatistiques.jsx`) : table renommée "Tension marché par secteur", colonnes "Salaire moyen proposé" + "Candidatures / offre" (badge rouge `TrendingDown` si tension < 1, vert `TrendingUp` sinon) avec tooltip explicatif. `formatSalaire()` affiche désormais "Non renseigné" au lieu de "N/A" quand la donnée est réellement absente (plus honnête, "N/A" laissait penser à un bug plutôt qu'à une absence de saisie).

**Nouveaux KPI — Premium** (`AdminStatsAPIView`) : `premium_actifs` (`ProfilEntreprise.est_premium=True` et non expiré), `revenu_premium_estime` (somme du `PremiumPlan.prix_da` correspondant au dernier `DemandeActivationPremium.nb_mois` traité de chaque entreprise actuellement Premium — approximation assumée, pas une comptabilité exacte, n'inclut pas les paiements Chargily sans demande d'activation correspondante ; documenté via tooltip dans l'UI), `premium_expirant_bientot` (échéance ≤ 7 jours, affiché en bandeau d'alerte ambre si > 0, même style que les alertes existantes offres/entreprises en attente).

**Nouveaux KPI — Contenu du site (CMS)** : `nb_articles_publies`/`nb_articles_brouillons`, `nb_faq_actives`, `nb_competences_referentiel`, `nb_bannieres_actives` — aucun de ces 5 chantiers CMS récents n'avait la moindre visibilité sur le tableau de bord jusqu'ici (confirmé par audit : zéro occurrence de `Article`/`FaqItem`/`CompetenceReferentiel`/`BanniereAccueil` dans `AdminStatsAPIView`/`AdminMarcheAPIView` avant cette session).

**Décision produit — pas de KPI pour Journal d'audit / Erreurs système / Comptes admins / Référentiel métiers** : ces sections ont déjà leur propre page dédiée avec les vrais chiffres à jour en temps réel (pas de valeur ajoutée à dupliquer un compteur figé sur le dashboard) — contrairement à Premium/CMS qui n'avaient absolument aucune surface de visibilité ailleurs.

**Audit sécurité** : aucun nouvel endpoint créé, uniquement des champs supplémentaires sur `AdminStatsAPIView`/`AdminMarcheAPIView` déjà `IsAdminUser` + vérif rôle. Aucune donnée sensible exposée (agrégats/comptages uniquement, pas de données nominatives). RAS.

**Tests** : `AdminStatistiques.test.jsx` 4/4 ✅ (aucune modification nécessaire — ne couvrait pas la table détaillée), frontend 402/402 ✅, `npx vite build` propre, `python manage.py check` propre, backend relancé.

---

## 🆕 SESSION 21/08/2026 — Prompts IA éditables + vérification anti-erreur (panel "Configuration IA")

**Contexte** : le panel "Configuration IA" (session 20/08/2026) permettait déjà de couper une fonctionnalité IA ou d'ajuster son `max_tokens`, mais pas de modifier le **texte du prompt** envoyé à Groq/Ollama — ceux-ci restaient codés en dur dans `cv_parser.py`/`jobs/views/ia.py`. Demande utilisateur : rendre les 4 prompts éditables depuis ce même panel, **avec une vérification pour éviter qu'une modification erronée casse silencieusement une fonctionnalité**.

**Backend — 4 nouveaux champs `TextField` sur `AIConfig`** (migration `0074` + backfill `0075`) : `parser_cv_prompt`, `analyse_carriere_prompt`, `analyse_recruteur_prompt`, `generation_offre_prompt`, tous `blank=True`. **Comportement de repli si vide** : chaque appelant fait `ai_config.xxx_prompt or DEFAULT_PROMPT_XXX` — un champ vidé (volontairement ou par erreur) ne casse jamais rien, il retombe sur le prompt d'origine codé en dur, jamais un appel Groq avec un prompt vide.
- Les 3 prompts de `jobs/views/ia.py` (analyse carrière, analyse recruteur, génération d'offre) étaient des f-strings Python — **convertis en constantes de gabarit avec jetons `{nom}` substitués via `.replace()`** (même mécanisme déjà en place pour `PROMPT_CV_COMPLET`/`{cv_text}`/`{domaines_list}` dans `cv_parser.py`, juste étendu aux 3 autres). Nécessaire car un prompt chargé depuis la base à l'exécution ne peut pas être un f-string littéral.
- `DEFAULT_PROMPT_ANALYSE_CARRIERE`/`DEFAULT_PROMPT_ANALYSE_RECRUTEUR`/`DEFAULT_PROMPT_GENERATION_OFFRE` : nouvelles constantes module-level en haut de `jobs/views/ia.py`, texte identique à l'ancien prompt en dur (aucun changement de comportement par défaut).
- **Migration de backfill (`0075`) : texte dupliqué en dur dans le fichier de migration**, pas d'import de `jobs.views.ia`/`jobs.cv_parser` — décision technique volontaire : une migration doit rester un instantané figé, indépendant d'une future modification des constantes `DEFAULT_PROMPT_*` dans le code applicatif (sinon rejouer cette migration sur un nouvel environnement plus tard backfillerait avec un texte différent de celui réellement utilisé au moment de l'écriture).
- Vérifié en conditions réelles (pas juste lu le code) : `AIConfig.get_solo().parser_cv_prompt` non vide après migration (3520 caractères), substitution `.replace()` fonctionne bout-en-bout sur un exemple concret (`generation_offre`), schéma JSON de sortie toujours intact après substitution.

**Frontend (`AdminIAConfig.jsx`)** :
- Chaque carte fonctionnalité a désormais un bloc "Prompt IA" repliable (`<textarea>` monospace 10 lignes) + rappel des variables obligatoires à ne pas supprimer (badges au-dessus du textarea).
- **Vérification anti-erreur avant sauvegarde** (la demande explicite de l'utilisateur) : si un prompt **non vide** ne contient plus l'une de ses variables obligatoires, `toast.error` bloquant nommant précisément la/les variable(s) manquante(s) par fonctionnalité — la sauvegarde est refusée tant que ce n'est pas corrigé. Un prompt **vide** ne déclenche jamais cette alerte (repli naturel sur le défaut backend, cas valide).
- **Confirmation avant application** : `confirmToast()` (utilitaire déjà standard du projet, remplace `window.confirm`) — "Enregistrer la configuration IA ? Ces changements affectent immédiatement le comportement de l'IA sur tout le site, pour tous les utilisateurs." Le bouton "Enregistrer" n'appelle plus `updateAIConfig` directement, seulement après confirmation.
- **Audit sécurité** : aucun nouvel endpoint (même `AIConfigAdminAPIView`, `IsAdminUser` + vérif rôle déjà en place, juste 4 champs de plus dans le serializer déjà `IsAdminUser`-only). RAS.

**Tests** : `AdminIAConfig.test.jsx` (7/7, 3 tests mis à jour pour rendre `<ConfirmModalHost />` et cliquer "Confirmer" après "Enregistrer" — pattern déjà standard du projet pour tout composant utilisant `confirmToast`), frontend 402/402 ✅, `npx vite build` propre, `python manage.py check` propre.

---

## 🆕 SESSION 20/08/2026 — CMS "Prix / Abonnements / Avantages Premium" (autonomie éditoriale)

**Contexte** : l'employeur veut gérer sans intervention technique — prix, abonnements, avantages, FAQ, secteurs, métiers, compétences, articles, bannières, pages du site, plus un futur contrôle des paramètres IA. Chantier découpé en sous-projets indépendants (brainstormé via skill dédié, spec dans `docs/superpowers/specs/2026-08-20-premium-plans-cms-design.md`) — celui-ci couvre le premier : **Prix / Abonnements / Avantages Premium**. Les sous-projets FAQ/Secteurs-Métiers-Compétences/Articles/Bannières/Pages/Contrôle IA restent à faire, chacun sera brainstormé séparément le moment venu.

**Constat clé avant tout code** : le prix Premium était dupliqué en 3 endroits — `PremiumPage.jsx` (affichage), `recruteur.py::_get_prix_premium` (montant **réellement facturé** via Chargily), et une 3ᵉ formule en dur dans l'email de reçu manuel. Un futur panel qui n'aurait changé que l'affichage frontend aurait laissé le vrai montant facturé inchangé — le backend devait devenir la source de vérité unique en premier.

**Nouveaux modèles** (`jobs/models.py`, migration `0061` + backfill `0062`) : `PremiumPlan` (`nb_mois` unique, `label`, `prix_da` — **montant final saisi directement**, pas de formule prix-mensuel×remise, décision utilisateur pour rester simple à éditer sans "comprendre" un calcul caché ; `populaire`, `actif`, `ordre`) et `PremiumAvantage` (`icone` — `choices` whitelist de ~20 noms lucide-react déjà utilisés dans le projet, jamais de texte libre ; `titre`, `description`, `ordre`, `actif`). Durées d'abonnement **totalement libres** (pas 4 paliers figés dans le code) — décision utilisateur, l'admin peut ajouter/retirer des paliers à volonté. Migration de backfill peuple automatiquement les 4 paliers (1/3/6/12 mois → 2000/6000/11040/19920 DA) et les 6 avantages déjà en dur — bascule invisible pour les recruteurs au déploiement.

**Backend** — nouveau `jobs/views/premium_admin.py` : 2 GET publics (`PremiumPlansPublicAPIView`/`PremiumAvantagesPublicAPIView`, `AllowAny` + `PublicReadThrottle`, cache 1h pattern `jobs_constants`) et 2 CRUD admin (`PremiumPlansAdminAPIView`/`PremiumAvantagesAdminAPIView`, `IsAdminUser`, même style GET/POST/PUT/DELETE combiné que `MetierReferentielAdminAPIView`). `_get_prix_premium()` renommé `_get_plan_premium()` et lit désormais `PremiumPlan.objects.filter(nb_mois=nb_mois, actif=True)` — `ChargilyCheckoutAPIView` **rejette** (400) tout `nb_mois` ne correspondant à aucun palier actif au lieu de l'ancien `max(1, min(nb_mois, 12))` qui acceptait n'importe quelle valeur dans une plage fixe. Les 2 autres usages du prix (`EnvoyerRecuPremiumAPIView`, `AdminDemandesPremiumAPIView`) lisent la même source. Plafonds `nb_mois` élargis de 12 à 60 mois (webhook Chargily, demande manuelle, activation admin) — filet de sécurité générique, plus lié à l'ancien jeu de paliers figés puisque les durées sont maintenant libres.

**Frontend** : `PremiumPage.jsx` — `DUREES`/`PRIX_MENSUEL`/`getPrix()`/`AVANTAGES_DETAILLES` (en dur) supprimés, remplacés par un fetch des 2 GET publics au montage (`jobsService.getPremiumPlans()`/`getPremiumAvantages()`, cache module-level, pattern `getNomenclature()`). `PREMIUM_ICON_MAP` exporté depuis ce fichier (nom d'icône stocké en base → composant lucide-react réel) et réimporté par `AdminPremium.jsx` pour peupler le `<select>` d'icônes — un seul endroit à maintenir si une icône est ajoutée/retirée. "Économies"/remise recalculées dynamiquement par rapport au palier le plus court (pas de prix mensuel global fixe, cohérent avec des durées libres).

**Nouveau panel admin `Pages/Admin/AdminPremium.jsx`** (route `/admin-taftech/premium-config`, entrée sidebar section "Système") — 2 onglets internes (pattern `ParametresRecruteur.jsx`) : "Abonnements" (tableau paliers, CRUD) et "Avantages" (liste cartes, select icône whitelist). Pas de drag&drop pour réordonner (champ `ordre` numérique manuel) — cohérent avec le reste de l'admin qui n'a de DnD nulle part.

**Audit sécurité** : endpoints admin `IsAdminUser` (pattern standard du projet) ; icônes contraintes par `choices` Django (élimine tout risque d'injection de nom de composant) ; `nb_mois` validé contre les paliers actifs en base côté Chargily (whitelist stricte, remplace un range arbitraire) ; pas de FK entre `PremiumPlan`/historique (`Candidature`, `ProfilEntreprise.premium_nb_mois` restent des snapshots figés à l'achat, cohérent avec le principe déjà appliqué ailleurs) — supprimer/désactiver un palier n'affecte jamais l'historique déjà facturé.

**Tests** : backend 281/281 ✅ (1 flaky préexistant `test_log_ordering_desc`, sans rapport, confirmé en isolation), `AdminPremium.test.jsx` (10/10, nouveau) + `PremiumPage.test.jsx` (7/7, nouveau — n'existait pas avant cette session malgré une mention dans une session précédente de ce fichier), `npx vite build` propre, `python manage.py check` propre.

**Suite (même session) — sous-projet 2 : FAQ** — 3 listes FAQ en dur découvertes (`ContactezNous.jsx` public général, `LandingRecruteur.jsx` landing recruteur, `PremiumPage.jsx` page Premium), chacune avec un nom de champ différent (`a`/`r`/`r`). Décision utilisateur : **un seul modèle avec catégorie** plutôt que 3 modèles séparés — un admin gère tout au même endroit, chaque page ne consomme que sa catégorie.

- **Nouveau modèle `FaqItem`** (`jobs/models.py`, migration `0063` + backfill `0064` peuplant les 14 questions existantes) : `categorie` (choix `GENERAL`/`RECRUTEUR`/`PREMIUM`), `question`, `reponse` (`TextField`, pas de limite de taille contrairement aux champs courts de `PremiumAvantage`), `ordre`, `actif`.
- **Backend** : `FaqPublicAPIView` (`GET jobs/faq/?categorie=X`, `AllowAny` + `PublicReadThrottle`, cache 1h par catégorie — clé `jobs_faq_<CATEGORIE>`) et `FaqAdminAPIView` (CRUD complet toutes catégories confondues, `IsAdminUser`, même style GET/POST/PUT/DELETE que les autres vues admin de ce chantier). Invalidation cache sur write — sur `PUT`, invalide **les deux** clés (ancienne ET nouvelle catégorie) au cas où l'admin change la catégorie d'une question existante.
- **Frontend** : `jobsService.getFaq(categorie)` — cache module-level **par catégorie** (objet `_faqCacheParCategorie`, pas une seule variable comme `getNomenclature`/`getPremiumPlans` — 3 catégories indépendantes ne doivent pas partager un seul cache). Les 3 pages consommatrices remplacent leur `const FAQ = [...]`/`const FAQ_ITEMS = [...]` en dur par un fetch au montage ; le state d'accordéon ouvert (`faqOpen`/`openFaq`) passe d'un index de tableau à `item.id` (plus robuste si l'ordre change côté admin).
- **Nouveau panel admin `Pages/Admin/AdminFaq.jsx`** (route `/admin-taftech/faq`) — liste unique avec chips de filtre par catégorie (Toutes/Général/Recruteur/Premium) au-dessus du tableau, CRUD modal identique au pattern déjà établi (`AdminPremium.jsx`).
- **🐛 Piège trouvé en testant** : l'ajout de l'appel `jobsService.getFaq()` dans le `Promise.all` de chargement de `PremiumPage.jsx` a fait échouer silencieusement `PremiumPage.test.jsx` (écrit à la session précédente) — le mock du test ne définissait pas `getFaq`, donc `jobsService.getFaq is not a function` rejetait tout le `Promise.all` et aucun palier/avantage ne s'affichait, malgré des mocks corrects pour les autres appels. Rappel : chaque nouvel appel `jobsService.*` ajouté à une page déjà testée doit être ajouté au mock du test correspondant, sinon échec silencieux (pas une erreur de compilation).
- **Audit sécurité** : endpoints admin `IsAdminUser` (pattern standard) ; lecture publique déjà scopée par catégorie côté serveur (le frontend ne peut pas demander "toutes les catégories" via l'API publique, seul `FaqAdminAPIView` — protégé — expose tout). RAS.

**Tests** : backend 281/281 ✅, frontend 352/352 ✅ (dont `AdminFaq.test.jsx` 7/7, nouveau), `npx vite build` propre.

**Suite (même session) — sous-projet 3 : Compétences** — contrairement à secteurs/métiers, `ProfilCandidat.competences`/`OffreEmploi.competences` sont des `TextField` libres sans aucun référentiel structuré. **Clarifié avec l'utilisateur avant de coder** : transformer ce champ en relation structurée obligatoire aurait été un gros refactor (matcher.py, tous les formulaires, migration de données candidats/offres déjà en base) pour un bénéfice incertain — décision : rester sur du texte libre partout, ajouter seulement un **référentiel de suggestions/autocomplete**, zéro impact sur le matching existant.

- **Nouveau modèle `CompetenceReferentiel`** (`label` unique, `actif`) — migration `0065` + seed `0066` (~40 compétences de démarrage génériques FR marché algérien : bureautique, soft skills, langues, quelques technos/métiers) pour que l'autocomplete ne soit pas vide au lancement.
- **Backend** : `CompetencesAutocompleteAPIView` (`GET jobs/competences/?search=X`, `AllowAny` + `PublicReadThrottle`, limite 15 résultats, pas de cache car dépend de la recherche) et `CompetencesAdminAPIView` (CRUD + `?search=` pour filtrer, `IsAdminUser`, même pattern GET/POST/PUT/DELETE que `MetierReferentielAdminAPIView`).
- **Nouveau panel admin `Pages/Admin/AdminCompetences.jsx`** (route `/admin-taftech/competences`) — liste + recherche debounce 400ms (pattern `AdminMetiers.jsx`), CRUD modal minimal (juste `label` + toggle "Suggérée").
- **Autocomplete branché sur le profil candidat uniquement** (`ProfilCandidat/index.jsx`, champ tag "Compétences") — pas sur le textarea compétences de `CreateJob.jsx` côté recruteur : ce dernier est un texte multi-lignes généré par l'IA (`GenererOffreIAAPIView`), format différent du tag-input candidat, ajouter une autocomplete dessus aurait demandé de changer sa structure entière pour une valeur ajoutée faible. `useProfilCandidat.js` expose `handleCompetenceInputChange`/`competenceSuggestions`/`showCompetenceSuggestions` — même pattern que `handleTitreProChange`/`titreSuggestions` déjà existant pour l'autocomplete du titre professionnel (réutilise les tokens `tw.autocompleteDropdown`/`tw.autocompleteItem`).
- **Audit sécurité** : endpoints admin `IsAdminUser` ; l'autocomplete publique ne retourne que les compétences `actif=True` (un admin peut désactiver une suggestion embarrassante/obsolète sans la supprimer). RAS — aucune donnée sensible, champ candidat toujours en texte libre non contraint.

**Tests** : backend 281/281 ✅, frontend 352/352 ✅ (pas de nouveau fichier de test dédié — CRUD identique au pattern déjà couvert par `AdminMetiers.test.jsx`, aucun test existant n'interagit avec le champ compétences candidat donc aucune régression possible), `npx vite build` propre.

**Suite (même session) — sous-projet 4 : Blog/Articles** — le plus gros morceau du chantier CMS, seul sous-projet qui a nécessité un vrai brainstorm complet (nouveau type de contenu, pas une extension d'un pattern existant). 3 décisions validées avec l'utilisateur avant de coder : éditeur **texte riche WYSIWYG** (pas Markdown/texte brut), librairie **TipTap**, et **sanitization HTML côté backend** en défense en profondeur même si seul ADMIN écrit aujourd'hui.

- **Nouvelle dépendance backend `bleach==6.4.0`** (+ `webencodings` transitive) — sanitize `Article.contenu_html` dans `Article.save()` : whitelist stricte de balises (p, h1-h3, strong/em/u/s, ul/ol/li, a, img, blockquote, br) et attributs (`a`: href/title/target/rel, `img`: src/alt). Le HTML est ensuite injecté tel quel côté frontend (`dangerouslySetInnerHTML`) — sans ce filtre, un compte admin compromis ou un futur rôle éditeur moins fiable pourrait injecter du JS exécuté chez tout visiteur du blog.
- **Nouveaux modèles** (`jobs/models.py`, migration `0067`) : `ArticleCategorie` (label unique — catégories **librement créées par l'admin**, contrairement aux catégories fixes de `FaqItem`, car les sujets de blog évoluent et ne rentrent pas dans un enum figé) et `Article` (titre, `slug` auto-généré unique — pattern `ProfilEntreprise.save()`, `categorie` FK nullable `SET_NULL`, `extrait` — sert à la fois d'aperçu liste ET de meta description SEO, `contenu_html`, `image_couverture` optionnelle, `statut` BROUILLON/PUBLIE, `date_publication` renseignée automatiquement au premier passage à PUBLIE).
- **Backend** (`jobs/views/articles.py`, nouveau fichier) : lecture publique (`ArticleListPublicAPIView` paginé 9/page + filtre `?categorie=`, `ArticleDetailPublicAPIView` par slug, `ArticleCategoriesPublicAPIView` — ne retourne que les catégories utilisées par au moins un article **publié**, pas toutes les catégories créées) et CRUD admin (`ArticleAdminAPIView`/`ArticleAdminDetailAPIView` — vue détail séparée de la liste car la liste utilise `ArticleListSerializer` allégé sans `contenu_html`, `ArticleCategoriesAdminAPIView`). Toutes les vues d'écriture en `MultiPartParser` (upload image de couverture).
- **`sitemap.xml`** étendu (`jobs/seo_views.py`) : articles publiés ajoutés automatiquement (`/blog/<slug>/`), `/blog` ajouté aux `STATIC_PATHS`.
- **Nouveau composant réutilisable `Components/RichTextEditor.jsx`** — wrapper TipTap (`@tiptap/react` + `starter-kit` + `extension-link` + `extension-image`, nouvelles dépendances frontend), toolbar minimale (gras/italique/H2/H3/listes/citation/lien), sortie HTML brute passée au parent via `onChange`. **`@tailwindcss/typography`** ajouté (nouveau plugin Tailwind, `tailwind.config.js` — import ESM `import typography from '@tailwindcss/typography'`, pas `require()` qui casserait le fichier ESM) pour les classes `prose` de mise en forme du contenu affiché.
- **Panel admin `Pages/Admin/AdminArticles.jsx`** — pattern différent des CRUD précédents : pas de modale (l'éditeur a besoin de place), un état interne `vue` ("liste"/"form") bascule l'affichage dans la même page plutôt que d'ajouter des routes `/nouveau`/`/:id/modifier` — plus simple, cohérent avec le niveau d'outillage du reste de l'admin.
- **2 nouvelles pages publiques** : `Pages/Public/Blog.jsx` (`/blog`, grille de cartes + filtre catégorie + pagination) et `Pages/Public/ArticleDetail.jsx` (`/blog/:slug`, `<Seo>` avec `extrait` comme meta description et image de couverture comme OG image, contenu rendu via `dangerouslySetInnerHTML` + classes `prose`). Lien "Blog" ajouté aux deux footers (candidat teal, recruteur indigo).
- **Sécurité** : endpoints admin `IsAdminUser`, lecture publique ne retourne jamais un brouillon (`statut='PUBLIE'` filtré côté serveur, pas côté client), upload image validé par magic bytes + taille (pattern `jobs/validators.py` déjà en place), sanitization HTML détaillée ci-dessus.

**Tests** : backend 281/281 ✅, frontend 360/360 ✅ (dont `AdminArticles.test.jsx` 8/8, nouveau — `RichTextEditor` mocké en `<textarea>` dans le test car TipTap/ProseMirror dépend d'APIs DOM que jsdom ne fournit pas complètement), `npx vite build` propre (chunk `AdminArticles` ~415 Ko à cause de TipTap, mais lazy-loadé uniquement pour la page admin — aucun impact sur le bundle public).

**Suite (même session) — sous-projet 5 : Bannières** — le terme était ambigu (banner promotionnel type e-commerce ? bandeau d'annonce ? bannière de page entreprise, déjà existante via `ProfilEntreprise.banniere` — pas ça) : clarifié avec l'utilisateur, **les deux** : un bandeau d'annonce texte global + un carrousel d'images promotionnelles sur l'accueil, deux besoins distincts.

- **`SiteAnnonce`** (`jobs/models.py`, migration `0068`) : `texte`, `lien_url`/`lien_label` optionnels, `type_annonce` (INFO/WARNING/SUCCESS), `actif`. **Une seule annonce active à la fois** — `save()` désactive automatiquement toutes les autres quand une nouvelle est activée (`SiteAnnonce.objects.exclude(pk=self.pk).update(actif=False)`), pas de contrainte DB `unique` sur `actif=True` (SQLite/Postgres ne le permettent pas nativement sur un booléen simple sans index partiel) — logique applicative suffisante ici, un seul admin à la fois de toute façon.
- **`BanniereAccueil`** (image, titre optionnel, lien optionnel, ordre, actif) — plusieurs bannières actives possibles (carrousel), décision utilisateur plutôt qu'une image fixe unique, pour permettre d'alterner plusieurs promos sans réédition manuelle à chaque fois.
- **Backend** (`jobs/views/banners.py`) : lecture publique avec cache (`SiteAnnoncePublicAPIView` — `204 No Content` si aucune annonce active, pas un objet vide, pour que le frontend distingue "pas encore chargé" de "rien à afficher" ; `BanniereAccueilPublicAPIView`, filtré `actif=True`, trié par `ordre`) + CRUD admin classique.
- **`Components/SiteAnnonceBar.jsx`** — monté une seule fois dans `App.jsx` juste avant la navbar (masqué sur les routes `/admin-taftech` — pas pertinent pour l'admin qui gère justement ce contenu), pas par page. Dismissable en **`sessionStorage`** (pas `localStorage` comme `InfoBanner.jsx`) — le contenu de l'annonce change dans le temps contrôlé par l'admin, un `localStorage` aurait caché indéfiniment les futures annonces après la première fermeture par l'utilisateur.
- **`Components/BanniereCarousel.jsx`** — intégré sur `Home.jsx` uniquement (entre la section offres récentes et "Pourquoi TafTech"), défilement auto 6s avec pause au survol, ne rend rien si aucune bannière active (pas de placeholder vide qui casserait la mise en page).
- **Panel admin `Pages/Admin/AdminBannieres.jsx`** — 2 onglets (pattern déjà établi `AdminPremium.jsx`/`AdminFaq.jsx`) : "Bandeau d'annonce" (tableau) et "Carrousel accueil" (grille de vignettes avec image, plus adapté visuellement qu'un tableau pour du contenu image).
- **🐛 Piège récurrent (3ᵉ fois cette session) confirmé en testant** : ajouter `BanniereCarousel` dans `Home.jsx` a cassé silencieusement `Home.test.jsx` (4/4 échecs) — le mock `jobsService` du test ne définissait pas `getBannieresAccueil`, provoquant un rejet non géré dans le composant. Fix : ajout de `getBannieresAccueil: vi.fn().mockResolvedValue([])` au mock. **Leçon confirmée à nouveau** : tout nouvel appel `jobsService.*` ajouté à un composant déjà couvert par un test doit être répercuté dans le mock de ce test — vérifié aussi qu'aucun test ne rend `App.jsx` en entier avec un mock `jobsService` incomplet qui aurait pu être affecté par `SiteAnnonceBar`.
- **Audit sécurité** : endpoints admin `IsAdminUser`, upload image validé par magic bytes + taille (5 Mo, pattern `banniere`/`logo` de `ProfilEntreprise`), lecture publique ne filtre que sur `actif=True` côté serveur.

**Tests** : backend 281/281 ✅, frontend 360/360 ✅ (`Home.test.jsx` corrigé, pas de nouveau fichier de test dédié pour `AdminBannieres.jsx`/`SiteAnnonceBar.jsx`/`BanniereCarousel.jsx` — CRUD identique au pattern déjà couvert ailleurs), `npx vite build` propre.

**Suite (même session) — sous-projet 6 : Pages du site** — dernier sous-projet de contenu du chantier CMS (reste "Contrôle des paramètres IA", de nature différente — pas du contenu éditorial). 3 pages existaient déjà en JSX en dur (`CGU.jsx`, `PolitiqueConfidentialite.jsx`, `QuiSommesNous.jsx`) ; CGU/Confidentialité avaient un sommaire structuré par sections, Qui-sommes-nous affichait des stats en direct (pas du contenu éditorial pur). **Décision utilisateur validée avant de coder** : convertir les 3 en CMS, en acceptant explicitement de perdre le sommaire sticky/les cartes à icônes structurées au profit de texte riche libre — sauf les stats live et le hero/CTA de Qui-sommes-nous qui **restent en code** (ce sont des widgets fonctionnels, pas de l'éditorial).

- **Nouveau modèle `PageStatique`** (`jobs/models.py`, migration `0069` + seed `0070`) : `slug` unique, `titre`, `contenu_html` (même sanitization bleach que `Article`). Migration de données porte le **texte** des 3 pages existantes en HTML équivalent (titres H2, listes, gras) — la mise en forme spécifique (cartes à icônes, grilles, sommaire sticky) n'est **pas** reproduite, remplacée par du texte riche simple, conformément à la décision validée.
- **Backend** (`jobs/views/pages.py`) : `PageStatiquePublicAPIView` (`GET jobs/pages/<slug>/`, cache 1h par slug) + CRUD admin `PageStatiqueAdminAPIView`.
- **Frontend** : nouveau composant générique `Pages/Public/PageStatiqueGenerique.jsx` — sert `/cgu` et `/confidentialite` (prop `slugFixe`) **et** une nouvelle route catch-all `/pages/:slug` pour toute page libre créée par l'admin en plus des 3 existantes. **`CGU.jsx` et `PolitiqueConfidentialite.jsx` supprimés** (plus de duplication de logique, entièrement remplacés — aucun test existant n'y faisait référence, vérifié avant suppression).
- **`QuiSommesNous.jsx`** : sections "Mission"/"Valeurs"/"Services" (listes `VALEURS`/`SERVICES` en dur + rendu en grille de cartes) supprimées, remplacées par un seul bloc `dangerouslySetInnerHTML` fetché via `getPageStatique("qui-sommes-nous")`. Hero, bloc "TafTech en chiffres" (stats live `jobs/stats/public/`) et CTA final **inchangés** — toujours en code, toujours fonctionnels.
- **Panel admin `Pages/Admin/AdminPages.jsx`** — même pattern "vue liste/form" que `AdminArticles.jsx` (réutilise `RichTextEditor.jsx`, maintenant partagé entre les deux, code-splitté dans son propre chunk par Vite). Les 3 pages système (`cgu`/`confidentialite`/`qui-sommes-nous`) ont leur bouton de suppression masqué (`PAGES_FIXES` côté frontend uniquement — pas de contrainte backend équivalente, un admin pourrait forcer la suppression via l'API directement, jugé acceptable car réservé au rôle ADMIN de toute façon) et leur champ slug verrouillé en édition.
- **Audit sécurité** : endpoints admin `IsAdminUser`, sanitization HTML identique à `Article` (bleach), pas de nouvelle surface d'attaque.

**Tests** : backend 281/281 ✅ (1 flaky préexistant `test_log_ordering_desc`, confirmé sans rapport en isolation), frontend 360/360 ✅ (aucune régression malgré la suppression de 2 fichiers), `npx vite build` propre.

**Suite (même session) — sous-projet 7 (dernier) : Configuration IA** — clarifié en tout début de chantier (voir plus bas) : "Intelligence artificielle" ne voulait pas dire génération de contenu, mais contrôle des paramètres IA du site. Contexte concret qui justifie ce sous-projet : Groq a déjà changé de modèle disponible sans préavis une fois cette année (session 18/08/2026, cf. section "MODÈLES GROQ DÉPRÉCIÉS"), cassant silencieusement 4 fonctionnalités IA d'un coup, découvert seulement en testant manuellement. Un panel admin pour changer le modèle et couper une fonctionnalité en panne sans déploiement répond directement à ce risque déjà vécu, pas à un besoin hypothétique.

- **Nouveau modèle singleton `AIConfig`** (`jobs/models.py`, migration `0071`, pattern `get_or_create(pk=1)` + cache 5 min invalidé au `save()` — même esprit que les autres configs de ce chantier mais une seule ligne, pas une liste) : `groq_model` (texte libre, **pas de `choices` figé** — un enum se serait retrouvé obsolète à la prochaine dépréciation Groq, exactement le problème vécu), `temperature`, `reasoning_effort` (low/medium/high), puis pour chacune des 4 fonctionnalités Groq réelles du site (`parser_cv`, `analyse_carriere`, `analyse_recruteur`, `generation_offre`) : un toggle `_actif` (kill-switch, 503 explicite si désactivé) et un `_max_tokens` dédié (**pas un plafond global** — les 4 valeurs actuelles vont de 400 à 6000 tokens, calibrées précisément par fonctionnalité ; un seul champ partagé aurait cassé le format JSON attendu de certains appels si réglé trop bas pour d'autres — clarifié avec l'utilisateur avant de coder).
- **Anticipation migration Ollama (précision apportée par l'utilisateur en cours de session)** : champ `provider` (GROQ/OLLAMA) + `ollama_model` ajoutés au modèle dès maintenant — la dépendance `ollama` est déjà dans `requirements.txt` mais **aucune intégration n'est câblée** (tâche explicitement reportée post-déploiement dans ce même fichier, section "TÂCHES REPORTÉES"). Choisir OLLAMA dans le panel n'a donc aucun effet pour l'instant, un commentaire dans le code et un libellé "(pas encore actif)" côté UI le précisent — objectif : que la vraie migration future soit un simple câblage, pas un redesign du modèle de config.
- **Backend** : `_call_groq()` (`cv_parser.py`, utilisé aussi par `domaine_agent.py` sans changement nécessaire — appel centralisé) et `_appel_groq()` (`jobs/views/ia.py`) lisent désormais `AIConfig.get_solo()` au lieu des constantes `GROQ_MODEL`/`reasoning_effort="low"` en dur. `GenererOffreIAAPIView` (appel Groq direct, **volontairement pas via `_appel_groq()`** — décision déjà actée : cette fonction strip les `*` qui corrompent le JSON attendu) lit la config directement dans son propre appel `requests.post()`. Chacune des 4 vues consommant Groq vérifie son toggle `_actif` en tout début de `post()`/`get()`, retourne 503 avec message explicite si désactivée — pas de dégradation silencieuse vers un comportement différent.
- **Panel admin `Pages/Admin/AdminIAConfig.jsx`** — formulaire simple (pas de liste/CRUD, un seul enregistrement) : bloc fournisseur/modèle/température/reasoning en premier avec bandeau d'avertissement rappelant l'incident Groq déjà vécu, puis 4 cartes fonctionnalité (toggle + max_tokens) avec description de ce que fait réellement chacune côté produit.
- **Audit sécurité** : `IsAdminUser` sur l'unique endpoint (`GET`/`PUT` seulement, pas de `POST`/`DELETE` — cohérent avec le pattern singleton, aucune création/suppression possible). Aucune donnée sensible exposée (le endpoint ne retourne jamais `GROQ_API_KEY`, uniquement le nom du modèle et les toggles).

**Tests** : backend 281/281 ✅ (même flaky préexistant confirmé sans rapport), frontend 360/360 ✅, `npx vite build` propre, `python manage.py check` propre.

---

## 🆕 SESSION 20/08/2026 (suite) — Abstraction moteur IA réelle + audit complet + couverture de tests exhaustive du chantier CMS

**Contexte** : après le sous-projet "Configuration IA" ci-dessus, retour client (transmis par l'utilisateur) : le client veut que l'architecture permette de **remplacer facilement le moteur IA plus tard sans reconstruire la plateforme**, et que les futurs modules puissent s'ajouter sans remettre en cause l'existant. Constat honnête fait à l'utilisateur avant de coder : `AIConfig.provider` (GROQ/OLLAMA) existait déjà mais n'avait **aucun effet réel** — Groq restait appelé en dur à 3 endroits (`cv_parser.py`, `jobs/views/ia.py` ×2). C'était une promesse non tenue, corrigée dans cette session. Le deuxième point (modules futurs sans casser l'existant) était déjà globalement acquis — le chantier CMS venait justement de valider ce pattern 7 fois de suite sans jamais toucher au code d'un module en construisant le suivant.

### Abstraction du moteur IA — `jobs/ai_engine.py` (nouveau fichier)

Point d'entrée unique `call_ai(messages, max_tokens, temperature=None, response_format=None, timeout=25)` qui dispatch vers Groq ou Ollama selon `AIConfig.get_solo().provider` — **plus aucun appel Groq en dur dans le code applicatif**, seulement dans ce fichier.

- `cv_parser.py::_call_groq()` (nom conservé — importé par `domaine_agent.py`) délègue maintenant à `call_ai()`. Le client Groq bas niveau (`get_groq_client()`, `GROQ_MODEL`, `GROQ_TIMEOUT`) et l'import `from groq import Groq` sont **supprimés** de ce fichier (code mort après la délégation).
- `jobs/views/ia.py::_appel_groq()` (nom conservé — nombreux appelants existants) délègue à `call_ai()` puis applique le strip markdown (`**`/`##`/`*`) qu'il faisait déjà — **ne jamais l'utiliser pour un appel attendant du JSON strict** (documenté en docstring), c'est pour ça que `GenererOffreIAAPIView` appelle `call_ai()` directement avec `response_format={'type': 'json_object'}` plutôt que de passer par `_appel_groq()`. `import requests as req` supprimé de `ia.py` (devenu mort, tous les appels HTTP bruts sont passés par `ai_engine`).
- **Branche Ollama** (`_call_ollama()`) : implémentée avec la lib `ollama` (déjà en dépendance) — `ollama.chat(model=..., messages=..., options={"temperature":..., "num_predict":...})`. **⚠️ Non validée en conditions réelles** — aucun serveur Ollama local disponible dans cet environnement de dev pour tester contre un vrai serveur. Le code est écrit et suit l'API documentée d'`ollama-python`, mais à vérifier avec `ollama serve` avant tout usage prod. L'import `import ollama` est fait au niveau module (pas local à la fonction) exprès — nécessaire pour pouvoir le mocker proprement dans les tests (`@patch("jobs.ai_engine.ollama")`), et vérifié que l'import seul ne tente aucune connexion réseau (juste le chargement du client HTTP paresseux).
- **Bascule Groq→Ollama = un changement de config admin**, plus un futur chantier de refactor — c'est exactement la garantie demandée par le client.

### Audit complet — 3 corrections apportées

1. **`SiteAnnonce.save()` non atomique** : la désactivation des autres annonces (`SiteAnnonce.objects.exclude(pk=self.pk).update(actif=False)`) se faisait après le `super().save()` sans transaction — sous écriture concurrente (peu probable avec un seul admin, mais incorrect par principe), une lecture pourrait voir 2 annonces actives entre les deux opérations. Enveloppé dans `transaction.atomic()`.
2. **`PremiumPlan.prix_da`/`nb_mois` acceptaient 0 côté backend** — seul le frontend (`AdminPremium.jsx`) bloquait un prix à 0 DA. Un appel API direct (bypass du frontend, ou futur bug) aurait pu créer un palier Premium **gratuit**, avec un montant de 0 DA réellement envoyé à Chargily. Ajout de `MinValueValidator(1)` sur les deux champs (migration `0073`).
3. **`AIConfig.temperature`/`*_max_tokens` sans bornes** — un admin aurait pu saisir `temperature=99` (rejeté par l'API Groq avec une erreur peu claire) ou `max_tokens=1` (réponse tronquée avant même le raisonnement du modèle — piège déjà documenté dans ce fichier pour les modèles "reasoning"). Ajout de `MinValueValidator`/`MaxValueValidator` (temperature 0-2, max_tokens ≥100), et alignement des bornes HTML `min`/`max` côté `AdminIAConfig.jsx`.

**Vérifié sans anomalie** : tous les endpoints admin des 7 sous-projets CMS ont un check `role == 'ADMIN'` explicite dans **chaque** méthode (comptage croisé public/admin methods vs occurrences du check — correspondance exacte partout) ; aucun hardcodage résiduel de `'openai/gpt-oss-20b'` ou `reasoning_effort='low'` en dehors de la valeur par défaut du modèle `AIConfig` ; aucun endpoint admin ne fuit `GROQ_API_KEY`.

### Couverture de tests exhaustive du chantier CMS (zéro test avant cette session pour la plupart)

- **Backend** : `jobs/tests/test_api_cms.py` (nouveau, 51 tests) — CRUD admin + lecture publique + permissions + validateurs pour les 7 sous-projets (PremiumPlan/PremiumAvantage, FAQ, Compétences, Articles, SiteAnnonce/BanniereAccueil, PageStatique, AIConfig), plus une classe dédiée au kill-switch IA (vérifie qu'un toggle désactivé retourne 503 **avant** tout appel réseau, sans mocker Groq). `jobs/tests/test_ai_engine.py` (nouveau, 6 tests) — dispatch Groq/Ollama, priorité `temperature` explicite vs config, transmission `response_format`, erreur propre si `GROQ_API_KEY` absente.
  - **🐛 Piège trouvé en écrivant ces tests** : plusieurs migrations de ce chantier (`0062`, `0064`, `0066`, `0070`) **peuplent des données** (paliers Premium, FAQ, compétences de départ, pages CGU/confidentialité/qui-sommes-nous) — la base de test les contient donc dès la création, contrairement à une base vierge. Des assertions sur des comptages absolus (`len(response.data) == 3`) ou des créations avec un slug/nb_mois qui collisionnait avec une valeur seedée (`nb_mois=1`, `slug="cgu"`) échouaient pour cette raison, pas à cause d'un bug applicatif. Fix : chaque classe de test concernée vide la table du modèle en `setUp()` avant de poser ses propres fixtures.
  - **🐛 Deuxième piège** : `AIConfig.get_solo()` met en cache l'instance en LocMemCache (process-wide, **pas** rollback par les transactions de test Django) — un test qui change `provider` et ne vide pas le cache peut faire fuiter cette valeur vers les tests suivants dans le même run, y compris entre deux fichiers de test différents. Fix : `cache.clear()` systématique en `setUp()` partout où `AIConfig`/du contenu CMS public est en jeu.
- **Frontend** (7 nouveaux fichiers, 51 tests) : `AdminCompetences.test.jsx` (8), `AdminBannieres.test.jsx` (8), `AdminPages.test.jsx` (8), `AdminIAConfig.test.jsx` (7), `Blog.test.jsx` (5), `ArticleDetail.test.jsx` (4), `PageStatiqueGenerique.test.jsx` (3).

**Tests** : backend 338/338 ✅ (aucun échec, y compris le flaky habituel qui est passé cette fois — confirme sa nature intermittente), frontend 402/402 ✅ (58 fichiers), `npx vite build` propre, `python manage.py check` propre.

---

## 🆕 SESSION 20/08/2026 — Audit sécurité : throttling par scope, garde-fou secrets prod, CVE dépendances

**Contexte** : audit sécurité informel demandé par l'utilisateur (pas de pentest formel) — passage en revue des points faibles réels du projet avant un futur lancement avec paiement réel (Chargily). 4 points traités dans l'ordre, un par un, avec validation de l'utilisateur avant chaque implémentation.

**1. Throttling DRF trop grossier** : avant cette session, `settings.py` n'avait que le seau générique `anon: 100/day` / `user: 1000/day` pour tout endpoint sans scope explicite (seuls `auth` 10/min et `groq` 20/h existaient). Un visiteur légitime naviguant beaucoup (pagination offres + constants + nomenclature à chaque page) pouvait taper le seau générique, tandis qu'aucun scope dédié ne resserrait spécifiquement les écritures anonymes (candidature rapide, candidature spontanée, contact).
- **Nouveau `jobs/throttles.py`** : `PublicReadThrottle` (scope `public_read`, 300/h) et `WriteActionThrottle` (scope `write_action`, 30/h), toutes deux `ScopedRateThrottle` avec le même bypass Cypress en DEBUG que `accounts.views.AuthRateThrottle` (pattern dupliqué intentionnellement — centraliser dans un seul fichier partagé entre `accounts` et `jobs` aurait ajouté une dépendance inter-app pour 4 lignes).
- `public_read` appliqué sur 9 vues à forte fréquence légitime, faible risque : `JobListAPIView`, `JobDetailAPIView`, `ConstantsAPIView`, `NomenclatureAPIView`, `MetierReferentielAPIView` (autocomplete), `PublicStatsAPIView`, `StatsGeoAPIView`, `EntrepriseListAPIView`, `EntrepriseDetailAPIView`.
- `write_action` appliqué sur les 3 endpoints d'écriture anonyme : `PostulerRapideAPIView`, `EnvoyerCandidatureSpontaneeAPIView`, `ContactMessageAPIView` (celui-ci remplace son ancien `CypressAwareThrottle` générique).
- `auth`/`groq` non touchés — déjà bien calibrés.

**2. Aucun garde-fou sur les secrets manquants en prod (hors SECRET_KEY)** : `settings.py` avait déjà un `ImproperlyConfigured` si `DEBUG=False` et `SECRET_KEY` vaut encore `'changeme-in-production'` — mais rien d'équivalent pour `EMAIL_HOST_USER/PASSWORD`, `GROQ_API_KEY`, `CHARGILY_API_KEY/SECRET_KEY`. Une clé vide en prod cassait silencieusement au premier appel runtime (email jamais envoyé, webhook paiement en échec, IA indisponible) au lieu d'empêcher le démarrage.
- Fix : bloc `if not DEBUG` après la section `EXTERNAL APIS`/`CHARGILY` — liste les variables manquantes dans le message d'erreur (`ImproperlyConfigured`), même mécanisme que `SECRET_KEY`. Testé par simulation (`DEBUG=False` + `GROQ_API_KEY=''` en env) → lève bien l'exception avant tout autre code.
- **Aucun impact dev** : les 5 variables restent optionnelles (`''` par défaut) tant que `DEBUG=True`.

**3. Injection HTML potentielle via `message_refus_auto`** : le recruteur personnalise un message de refus (`ProfilEntreprise.message_refus_auto`, texte libre) injecté dans `emails/refus.html` via `render_to_string()`. Inquiétude : un recruteur malveillant qui mettrait du HTML/JS dans ce champ pourrait-il casser le rendu de l'email ou déclencher un souci côté client mail du candidat ?
- **Vérifié empiriquement, pas de faille** : `{{ message }}` dans le template n'a ni `|safe` ni `{% autoescape off %}`, et `TEMPLATES` dans `settings.py` n'a rien qui désactive l'autoescape global — Django échappe donc automatiquement. Testé en rendant le template avec le payload `<script>alert(1)</script><img src=x onerror=alert(2)>` comme valeur de `message` → sortie confirmée en entités HTML échappées (`&lt;script&gt;...`), donc inerte. **Aucun correctif nécessaire.**

**4. Dépendances non auditées (`pip-audit`/`npm audit` jamais lancés)** :
- Backend — 8 CVE trouvées sur 3 packages runtime réels : `Django` 5.2.16→**5.2.17**, `cryptography` 48.0.1→**50.0.0**, `sqlparse` 0.5.5→**0.6.0**. Mis à jour dans `backend_env` (pip install) et `requirements.txt`. `pip-audit -r requirements.txt` re-vérifié après upgrade : **"No known vulnerabilities found"**.
- Frontend — 10 vulnérabilités trouvées via `npm audit`, mais **toutes dans `devDependencies`** (Cypress et sa chaîne : `extract-zip`, `qs`, `uuid`, `@cypress/request` ; plus tooling build/test : `postcss`, `js-yaml`, `nanoid`, `undici`, `brace-expansion`). Rien dans les `dependencies` réelles (`react`, `axios`, `react-router-dom`, etc.) — zéro risque en prod, uniquement surface d'attaque locale/CI. **Décision : pas de correctif** — `npm audit fix --force` upgraderait Cypress vers 15.21.0, connu cassé sur Windows 10 (cf. décision technique existante "Cypress version" dans ce fichier). Pas de valeur à casser Cypress pour patcher des CVE dev-only sans impact prod.

**Tests** : backend 281/281 ✅ (relancé après chaque étape significative — throttling, garde-fou secrets, upgrade dépendances), `python manage.py check` propre, `pip-audit` propre.

**Suite (même session, jour même)** — 2 points restants de la revue de sécurité traités après validation utilisateur sur les choix (question ciblée) :

**5. Scan de dépendances automatisé** : `.github/dependabot.yml` créé — écosystèmes `pip` (`/taftech_backend`) et `npm` (`/taftech_frontend`), fréquence hebdomadaire, PR automatique à chaque nouvelle CVE détectée sur une dépendance. Choix confirmé par l'utilisateur face à l'alternative "job CI pip-audit/npm audit qui échoue le build" — Dependabot préféré car natif GitHub, zéro maintenance.

**6. Anti-abus par email (en plus du throttle IP)** : `WriteActionThrottle` (30/h par IP, session précédente) reste contournable par un attaquant avec un pool d'IPs. Nouveau `EmailRateThrottle` (`jobs/throttles.py`, scope `email_write`, **10/jour**) — clé de cache basée sur l'email soumis dans `request.data` (pas l'IP), donc un même email ne peut pas spammer même en changeant d'adresse IP. `email_field` configurable par sous-classe (`PostulerRapideEmailThrottle` lit `email_rapide`, les 2 autres lisent `email` par défaut). Appliqué en throttle **supplémentaire** (pas en remplacement) sur `PostulerRapideAPIView`, `EnvoyerCandidatureSpontaneeAPIView`, `ContactMessageAPIView` — `throttle_classes = [WriteActionThrottle, EmailRateThrottle]`. Si le champ email est absent/vide, `get_cache_key` retourne `None` → pas de throttle (comportement DRF standard, pas de crash). Bypass Cypress en DEBUG identique aux autres throttles du projet.

**Tests** : 281/281 ✅ — 1 échec observé au premier run (`test_log_ordering_desc`, `EquipeActionLogModelTests`) identifié comme **flaky préexistant** (ordre de 2 logs par timestamp `auto_now` pouvant coller sous charge de suite complète, aucun rapport avec les throttles), confirmé par passage en isolation puis re-run complet au vert.

---

## 🆕 SESSION 19/08/2026 — Dashboard recruteur : filtres, détail matching complet, actions inline

**Contexte** : le client jugeait la 1ʳᵉ version (session 18/08/2026 — graphiques + Candidats recommandés) insuffisante sur 3 points précis (clarifiés via questions ciblées) : l'explication du matching (1 seule phrase), les graphiques (pas de granularité/filtre), et la section recommandés (pas d'actions, pas de tri). **Toujours zéro endpoint backend ajouté** — uniquement de l'agrégation/filtrage client-side sur les données déjà exposées par `DashboardRecruteurAPIView`.

**Filtre partagé "par offre" + "période"** (`DashboardRecruteur.jsx`) : deux `<select>` (`tw.inputColorsWhite`) au-dessus des graphiques — `filtreOffreId` (toutes / une offre précise) et `periodeEvolution` (7j/30j/6m/1a). `offresPourAnalyse` dérivé filtre le tableau `offres` avant tout calcul (évolution + pipeline + recommandés partagent ce filtre). Changer le filtre offre réinitialise `recommandesLimit` à 6 (évite un état de pagination incohérent avec la nouvelle liste).

**Évolution — granularité paramétrable** : `evolution` bascule entre buckets journaliers (7j/30j, clé = `date_postulation.slice(0,10)`) et mensuels (6m/1a, même logique qu'avant mais nbMois variable). `MiniAreaChart` reçoit un nouveau prop optionnel `height` (défaut 160, passé à 190 depuis le dashboard pour plus de lisibilité) — aucun autre composant ne l'utilisait, pas de régression.

**Pipeline — taux de conversion** : chaque barre affiche désormais `count` **et** `%` (part de `count` sur `pipelineTotal`, le total toutes étapes confondues du filtre actif) — répond à la demande "plus de métriques" sans ajouter de vrai calcul de conversion étape-à-étape (aurait nécessité un historique de transitions de statut non trackée actuellement, hors scope).

**Candidats recommandés — 3 ajouts** :
1. **Détail matching complet** : bouton "Voir le détail du matching" par carte (state `expandedMatchId`) déplie les 5 critères (`CRITERES_MATCHING`, mêmes clés/max que `DetailCandidature.jsx`) avec barre de progression + phrase d'explication par critère — réutilise exactement le pattern de "Pourquoi ce score ?" (`DM.scores || DM`, `DM.explications`) au lieu d'une seule phrase.
2. **Filtre "masquer retenus/refusés"** (`masquerDecides`, coché par défaut) + pagination "Voir plus" par pas de 6 (`recommandesLimit`) au lieu d'un top 5 fixe.
3. **Action directe** : dropdown de changement de statut inline par carte (`handleChangerStatutRecommande` → `jobsService.updateStatutCandidature`, même endpoint que `DetailCandidature.jsx`/`useGestionOffre.js`), respecte `authService.peutFaire("UTILISATEUR")` (INVITE lecture seule, cohérent avec le reste de l'app). **Simplification assumée** : pas de modale de programmation d'entretien pour le statut ENTRETIEN depuis cette carte (contrairement à `useGestionOffre.js`) — la prise de rendez-vous détaillée reste sur la fiche candidature complète, cette action rapide est pour les changements de statut simples.

**Piège HTML évité** : la carte recommandée était un `<button>` unique (clic = navigation) dans la version précédente. Impossible d'y imbriquer les nouveaux boutons interactifs (toggle détail, dropdown statut) — bouton dans bouton est invalide en HTML et cassait déjà ailleurs dans le projet (cf. bug modale imbriquée du 28/07/2026). Fix : carte convertie en `<div>`, seul le bloc avatar+nom+score reste un `<button>` cliquable (navigate), le reste de la carte (dropdown statut, lien "Voir la candidature") est en boutons siblings, pas imbriqués.

**Audit sécurité** : aucune route/endpoint créé — `handleChangerStatutRecommande` appelle le même `PATCH jobs/candidatures/<id>/statut/` déjà protégé par `get_entreprise_for_user()` + `get_membre_role()` (INVITE bloqué en écriture côté backend, pas seulement masqué côté UI). RAS.

**Tests** : 338/338 frontend ✅ (dont 9/9 `DashboardRecruteur.test.jsx`), `npx vite build` propre.

**🐛 Bug réel trouvé en testant sur mobile via ngrok (capture d'écran utilisateur)** : `MiniAreaChart.jsx` forçait `minWidth: 420` sur le SVG quel que soit le nombre de points — sur un téléphone ~340-390px de large (largeur d'écran usuelle), ça déclenchait un scroll horizontal non voulu pour la vue par défaut "6 derniers mois" (6 points, largement suffisant sans scroll). Pire : la légende (`<div className="flex...">`) était à l'intérieur du **même conteneur** `overflow-x-auto` que le SVG → en scrollant le graphique, la légende scrollait aussi et son texte se retrouvait tronqué ("Candidatures reçues" affiché "ques"), et seuls 4 des 6 mois restaient visibles sans indication qu'il fallait scroller.
- **Fix** : légende sortie du conteneur scrollable (toujours visible, fixe). Largeur du SVG (`W`) calculée dynamiquement (`Math.max(320, data.length * 30)`) au lieu d'une valeur fixe — les vues à peu de points (6m/12m mensuel) tiennent sur mobile sans scroll, les vues denses (7j/30j quotidien) scrollent volontairement (comportement attendu, comme un graphe de contributions GitHub).
- **Ajouts** (répondant à "graphique trop nul, aucune valeur lisible") : axe Y avec 3 valeurs numériques (0/milieu/max) à gauche des lignes de grille ; tap/clic sur un point affiche sous le graphique la valeur exacte de chaque série à cette date (`hoverIdx` state) — utile notamment pour "Recrutements", souvent une ligne plate à 0 donc invisible sans cette lecture explicite.
- **Décision** : pas de librairie de charts ajoutée (toujours SVG inline, cohérent avec [[MiniAreaChart]] créé en session 18/08/2026) — le bug était un défaut de responsive/UX, pas une limite du SVG inline en soi.

**Fonctionnalités ajoutées au graphique "Évolution"** (demande client explicite après le fix du bug ci-dessus) — toujours zéro appel backend, tout calculé côté client :
- **Courbe / Barres** : toggle (icônes `LineChart`/`BarChart3`) — `chartType` prop sur `MiniAreaChart`, bascule le rendu SVG entre `polyline`+aire et `rect` groupés par point.
- **Comparaison période précédente** : checkbox "Comparer à la période précédente" — `buildEvolutionBuckets(periode, shiftPeriodes)` dans `DashboardRecruteur.jsx` généralise le calcul de buckets (avant : inline, une seule fois) avec un décalage en nombre de périodes (7j/30j/6m/1a × shiftPeriodes) ; seule la série "candidatures" de la période N-1 est superposée en pointillé (comparer TOUTES les séries aurait surchargé un petit widget) — prop `compareValues` (tableau de valeurs aligné par index, pas par date, sur `data`).
- **Taux de conversion (%)** : checkbox "Taux de conversion" — 3ᵉ métrique calculée par bucket (`recrutements/candidatures*100`, 0 si aucune candidature) tracée sur un **axe droit indépendant 0-100%** (`secondarySeries` + `secondaryMax`, `scaleY2` séparée de l'échelle des comptages) — mélanger un pourcentage (0-100) avec des comptages bruts (souvent <20) sur la même échelle aurait rendu la courbe de conversion illisible (quasi plate en bas).
- **Export PNG/CSV** : bouton "Exporter" par graphique (menu dropdown). CSV = sérialisation manuelle avec séparateur `;` + BOM UTF-8 (compat Excel FR). PNG = clonage du `<svg>` (dimensions explicites fixées sur le clone, la version affichée n'a que `width:100%` CSS qui ne suffit pas pour un export autonome) → sérialisé → dessiné sur un `<canvas>` à l'échelle ×2 (netteté) → `canvas.toBlob()`.
- **Décision produit (confirmée avec l'utilisateur)** : comparaison + conversion sont **désactivées automatiquement en mode Barres** (checkboxes grisées, `disabled`) — combiner barres groupées + ligne pointillée + axe secondaire sur un mini-widget aurait été illisible ; l'utilisateur a validé cette contrainte plutôt que de tout rendre combinable.

**Tests** : 338/338 frontend ✅ (dont 9/9 `DashboardRecruteur.test.jsx`), `npx vite build` propre.

**Génération IA enrichie sur "Publier une offre"** (demande client : bouton "Générer l'offre avec l'IA", recruteur saisit juste le poste) :
- **Simplification du déclencheur** : `GenererOffreIAAPIView` (`jobs/views/ia.py`) n'exige plus que `titre` (avant : `titre` ET `specialite`). Si `specialite` absente, résolue automatiquement via `resoudre_domaine_depuis_texte(titre)` (même référentiel métiers que le parser CV candidat) et renvoyée au frontend (`specialite_resolue`) qui pré-sélectionne le champ Spécialité **seulement s'il était vide** (ne jamais écraser un choix déjà fait manuellement). `CreateJob.jsx` : `iaReady = isPremium && !!formData.titre` (avant : + `formData.specialite`).
- **2 nouveaux champs générés** : `competences` (5-8 compétences techniques/outils, format tiret comme missions/profil_recherche) et `questions_entretien` (tableau de 4-6 questions, jamais stocké tel quel — voir ci-dessous). `max_tokens` monté 1000→1600 (2 champs de plus).
- **Nouveau champ persistant `OffreEmploi.competences`** (migration `0057`, `TextField` nullable, même pattern que `missions`/`profil_recherche`) — ajouté à `OffreEmploiCreateDTO`, `OffreDashboardDTO` (`OffreEmploiSerializer` l'inclut automatiquement via `__all__`), formulaire `CreateJob.jsx`, modale de modification `DashboardRecruteur.jsx`, affichage `JobDetail.jsx` (candidat) et `GestionOffre/index.jsx` (recruteur).
- **Questions d'entretien — pas de nouveau modèle** : les questions générées ne sont **pas** auto-créées en `Questionnaire`/`QuestionQuestionnaire` (ça exigerait de deviner type de réponse/choix/disqualifiant sans supervision humaine — risqué). À la place : affichées en liste dans `CreateJob.jsx` sous les champs texte, avec un bouton "Créer un questionnaire avec ces questions →" qui ouvre `CreateQuestionnaireModal` **pré-rempli** (nouveaux props `initialQuestions`/`initialTitre`, `useEffect` sur `open` qui reconstruit `form` seulement si des questions sont fournies — sinon la modale garde son comportement par défaut d'une question vide). Le recruteur choisit le type de chaque question (COURT par défaut) et peut éditer/retirer avant de créer — jamais publié sans relecture, cohérent avec la demande client ("le recruteur garde la possibilité de modifier avant publication").
- **Audit sécurité** : aucun nouvel endpoint — `GenererOffreIAAPIView` reste `IsAuthenticated` + vérif `entreprise.est_premium_actif` inchangée ; le nouveau champ `competences` suit exactement le même chemin de permission que `missions`/`profil_recherche` sur `UpdateOffreRecruteurAPIView` (déjà `get_entreprise_for_user()` + `get_membre_role()`). RAS.

**Tests** : 338/338 frontend ✅ (dont 6/6 `CreateJob.test.jsx`), backend relancé après migration, `npx vite build` propre.

**Questions d'entretien IA — type + options générés, pas seulement du texte libre** (précision demandée : "questionnaire créé auto avec les réponses", clarifiée = les questions doivent utiliser les vrais types du questionnaire — COURT/LONG/NUMERIQUE/CHOIX_UNIQUE/CHOIX_MULTIPLE — pas toutes en texte libre) :
- **Backend** (`GenererOffreIAAPIView`) : `questions_entretien` n'est plus un tableau de chaînes mais d'objets `{texte, type_question, choix}` — le prompt Groq demande explicitement de varier les types et de fournir 3-5 options réalistes (pas génériques "Oui/Non") pour les QCM. Validation stricte côté serveur avant retour au frontend : `type_question` doit être dans les 5 valeurs valides (repli `COURT` sinon) ; `choix` dédupliqué/tronqué à 6 ; un type QCM avec moins de 2 options réelles retombe automatiquement en `COURT` (jamais de QCM à 0-1 option envoyé au frontend).
- **Frontend** : panneau de suggestions (`CreateJob.jsx`) affiche désormais le type de chaque question (badge) + ses options le cas échéant. `CreateQuestionnaireModal.jsx` (`initialQuestions`) mappe ces objets enrichis directement dans le formulaire (type + choix pré-remplis, pas juste le texte) — accepte aussi une simple chaîne en repli pour rester rétrocompatible.
- **Toujours pas d'auto-création sans relecture** (confirmé avec l'utilisateur) : le questionnaire passe toujours par la modale de relecture avant création réelle — seule la richesse du pré-remplissage (type + options au lieu de texte vide) a changé, pas le flux de validation.

**Tests** : 338/338 frontend ✅ (dont `CreateJob.test.jsx` + `Questionnaires.test.jsx`), backend relancé, `npx vite build` propre.

**CVthèque — 5 nouveaux filtres** (demande client : disponibilité, mobilité, permis, langues, diplôme, années d'expérience, secteur, compétences — diplôme/expérience/secteur existaient déjà, seuls les 5 autres manquaient) :
- **Backend** (`CVThequeView`, `jobs/views/recruteur.py`) : `mobilite` (exact match sur `ProfilCandidat.mobilite`), `disponibilite` (exact match sur `situation_actuelle`), `permis` (`true` → `permis_conduire=True`), `langues`/`competences` (`icontains` — ce sont des `CharField`/`TextField` texte libre sans référentiel structuré côté candidat, donc filtrage par sous-chaîne et pas par égalité comme les champs à choix).
- **Nouvelles options exposées** : `ConstantsAPIView` (`jobs/views/offres.py`) retourne désormais `mobilites`/`disponibilites` (sourcées directement de `ProfilCandidat.MOBILITE_CHOICES`/`SITUATION_ACTUELLE`, pas dupliquées dans `constants.py`). Cache `jobs_constants` vidé manuellement en session (LocMemCache — se vide de toute façon au prochain redémarrage du serveur dev).
- **Frontend** (`CVTheque.jsx`) : 2ᵉ ligne de filtres ajoutée sous la première (Mobilité + Disponibilité en `Select`, Langue + Compétence en texte libre `icontains`), chip "Permis de conduire" ajouté à côté de Photo/CV/Inscrits récemment. Whitelist de query params élargie dans `recruteurService.searchCVtheque`.
- **Décision** : `langues`/`competences` en texte libre (pas de dropdown) car aucun référentiel structuré n'existe côté `ProfilCandidat` pour ces deux champs (stockage `CharField`/`TextField` libre, format `"Nom:Niveau, ..."` pour les langues) — un dropdown supposerait des valeurs normalisées qui n'existent pas.

**CVthèque — 4 filtres supplémentaires** (demande "ajoutez plus si c'est possible", après les 5 premiers) — passage en revue de tous les champs `ProfilCandidat` non encore filtrables :
- `vehicule_personnel` (chip booléen, comme Permis)
- `passeport_valide` (chip booléen)
- `service_militaire` (`Select`, choix `ProfilCandidat.SERVICE_MILITAIRE_CHOICES` — exposé via `ConstantsAPIView.services_militaires`)
- `niveau_experience` (`Select`, réutilise `constants.experiences`/`NIVEAUX_EXPERIENCE`) — **distinct** du filtre "Expérience minimum" déjà existant : celui-ci est calculé dynamiquement depuis les dates des `ExperienceCandidat` (années réelles), `niveau_experience` est une auto-déclaration catégorielle du candidat (ex: "Confirmé", "Manager") — les deux peuvent diverger (candidat qui se sous/sur-estime), donc gardés comme 2 filtres séparés plutôt que fusionnés.
- **Champ non ajouté** : `salaire_souhaite` — `CharField` texte libre sans format normalisé (ex: "80 000 DA", "Négociable", "80k") → un filtre numérique/range serait peu fiable sans forcer une saisie structurée côté profil candidat, hors scope de cette demande.
- Cache `jobs_constants` re-vidé manuellement (nouvelle clé `services_militaires`).

**Tests** : 338/338 frontend ✅ (dont 11/11 `CVTheque.test.jsx`), backend relancé, `npx vite build` propre.

**Page Premium — avantages mis en avant** (demande client : rendre les formules plus attractives, 6 avantages à valoriser) : `AVANTAGES` (4 lignes génériques à coche simple) remplacé par `AVANTAGES_DETAILLES` (6 items structurés `{icon, titre, description}`) affichés en grille de cartes (`AvantageCard`, icône dans chip teal + titre + description courte) au lieu d'une liste plate — utilisé à la fois dans l'écran de paiement ("Ce qui est inclus") et l'écran de statut abonné ("Fonctionnalités incluses"), un seul endroit à maintenir.
- **Point signalé à l'utilisateur avant d'écrire le code** : "Support prioritaire" ne correspondait à aucune fonctionnalité réelle (aucun canal de support distinct/priorisé n'existe dans le produit). Décision utilisateur : l'afficher quand même avec une promesse simple et vraie — email dédié `taftech963@gmail.com`, réponse sous 24h — pas de système de tickets à construire, juste un engagement opérationnel documenté sur la page.
- Les 5 autres avantages (coordonnées candidats, téléchargement CV, recherche avancée, analyses IA, favoris) sont déjà des fonctionnalités réelles, toutes déjà cachées derrière le gate Premium existant de la CVthèque — aucun changement backend nécessaire, uniquement de la présentation.

**Tests** : 338/338 frontend ✅ (dont 10/10 `PremiumPage.test.jsx`), `npx vite build` propre.

**🐛 Bug réel — lien Premium absent du menu mobile recruteur** (signalé par l'utilisateur) : "Mon Premium ⭐"/"Passer Premium 🔒" n'existait que dans le dropdown desktop de `NavbarRecruteur.jsx` (tableau `minRole: "PROPRIETAIRE"` ligne ~184) — jamais dans la liste du menu hamburger mobile, ni dans `BottomNavRecruteur` (5 slots déjà pris). Un PROPRIETAIRE sur mobile n'avait donc **aucun moyen d'atteindre `/recruteurs/premium`**. Fix : lien ajouté après la liste mappée du menu mobile, même garde `authService.peutFaire("PROPRIETAIRE")`, même libellé dynamique selon `isPremium` (ambre si déjà premium, teal sinon) que la version desktop.

**Tests** : 338/338 frontend ✅, `npx vite build` propre.

**Profil entreprise — bannière, culture, galerie photo** (demande client — sur les 7 items listés, `secteur`/`site web`/`présentation` existaient déjà) :
- **Nouveaux champs `ProfilEntreprise`** (migration `0058`) : `banniere` (ImageField, 5 Mo max — plus permissif que `logo` car format large), `culture_entreprise` (TextField). **Nouveau modèle `EntreprisePhoto`** (FK `entreprise` related_name `photos`, `image` + `legende` + `date_ajout`, `ordering=['-date_ajout']`) — pattern calqué sur `ExperienceCandidat`/`FormationCandidat` (enfant FK simple), pas de champ JSON/array — cohérent avec le reste du projet qui n'a jamais stocké de listes d'images en JSON.
- **Nouveaux endpoints** `POST/DELETE jobs/entreprise/photos/(<id>/)` (`EntreprisePhotosAPIView`) — limite 12 photos, 3 Mo/photo, gate `PROPRIETAIRE`/`ADMIN` (même pattern que `UpdateProfilEntrepriseAPIView`). `banniere` + `culture_entreprise` ajoutés au whitelist/upload de `UpdateProfilEntrepriseAPIView` existant (pas de nouvel endpoint pour ces deux-là).
- **🐛 Bug réel trouvé en marge** : `recruteurService.updateProfilEntreprise` détectait un fichier à uploader uniquement via `data.logo instanceof File` — un upload de `banniere` seul (sans changer le logo) aurait été silencieusement sérialisé en JSON au lieu de multipart, donc jamais reçu par `request.FILES` côté backend. Corrigé (`data.logo instanceof File || data.banniere instanceof File`).
- **🐛 Bug réel trouvé en marge #2** : `linkedin`/`site_web` étaient déjà des champs fonctionnels dans le formulaire `ParametresRecruteur.jsx`, mais **jamais préremplis au chargement** — `EntrepriseDashboardDetailSerializer` (utilisé par `dash.entreprise`) ne les exposait pas du tout. Un recruteur qui avait déjà renseigné son LinkedIn le voyait toujours vide en rouvrant Paramètres (donnée présente en base, juste jamais renvoyée). Corrigé : `linkedin`, `site_web`, `banniere`, `culture_entreprise`, `photos` ajoutés aux champs du serializer. Même trou constaté et corrigé dans la branche "membre d'équipe" de `ParametresRecruteur.jsx` (`adresse_complete` y manquait aussi).
- **Frontend `ParametresRecruteur.jsx`** (onglet "Mon entreprise") : upload bannière (même pattern que logo, preview via `URL.createObjectURL`), textarea Culture d'entreprise, galerie photo (grille de vignettes + bouton supprimer au survol + upload avec légende optionnelle, compteur "x/12").
- **Frontend `EntreprisePublic.jsx`** (page vitrine) : bannière affichée en pleine largeur au-dessus du bandeau logo/nom si présente, bloc "Culture d'entreprise" (même style que "Présentation"), grille de miniatures "Photos". "Offres disponibles" utilise désormais `nombre_offres_actives` (nouveau champ backend calculé, `SerializerMethodField` sur `EntreprisePublicSerializer`) avec repli sur l'ancien calcul client `offres_actives.length` — la liste complète `offres_actives` reste inchangée, le nouveau champ est un ajout, pas un remplacement.
- **SEO — reporté** : demandé en fin de message sans détail ; après clarification l'utilisateur veut meta tags par page + sitemap.xml/robots.txt + vérification des slugs offres — **pas encore fait**, prochaine session.

**Tests** : 338/338 frontend ✅ (dont 21/21 `ParametresRecruteur.test.jsx` + `EntreprisePublic.test.jsx`), backend relancé, `npx vite build` propre, `python manage.py check` propre.

**SEO — meta tags par page + sitemap.xml/robots.txt** :
- **Composant `Components/Seo.jsx`** — balises `<title>`/`<meta description>`/Open Graph/Twitter Card par page, appliqué sur `Home.jsx`, `JobDetail.jsx` (titre+description dynamiques par offre, image = logo entreprise), `JobsList.jsx`, `EntreprisePublic.jsx` (titre+description dynamiques par entreprise, image = bannière ou logo). **Décision technique** : d'abord tenté `react-helmet-async` (standard du marché), abandonné avant de casser les tests — la lib exige un `<HelmetProvider>` ancêtre que les 4 fichiers de test (`Home`/`JobDetail`/`JobsList`/`EntreprisePublic`) n'ont pas (ils wrappent seulement `<MemoryRouter>`). Remplacé par un composant sans dépendance (`useEffect` + manipulation directe de `document.head`, restaure les valeurs par défaut au démontage) — même résultat pour une SPA sans SSR, zéro dépendance ajoutée, zéro test cassé. `index.html` : `lang="en"` → `lang="fr"` (jamais corrigé depuis la création du projet), meta description/OG par défaut ajoutées comme filet pour les pages sans `<Seo>`.
- **`jobs/seo_views.py`** (nouveau fichier, hors du package `views/` — monté directement dans `taftech_backend/urls.py`, pas sous `/api/`) : `SitemapXMLView` (offres actives approuvées + entreprises approuvées + pages statiques, XML protocole sitemap.org, URLs construites depuis `settings.SITE_URL` — donc pointent vers le frontend, pas l'API Django) et `RobotsTxtView` (autorise tout sauf les routes authentifiées : dashboard, parametres, profil, cvtheque, etc. — `Disallow` par préfixe de route ; référence le sitemap).
- **Routes montées à la racine du domaine** (`/sitemap.xml`, `/robots.txt`, pas `/api/jobs/...`) — c'est là que les crawlers et Google Search Console les cherchent par convention. `vite.config.js` : proxy dev étendu (même pattern que `/api`/`/media`) pour que ces deux chemins fonctionnent aussi via le tunnel ngrok en test. **⚠️ Prod** : la config nginx du déploiement devra proxy `/sitemap.xml` et `/robots.txt` vers Django, comme `/api`/`/media` — pas encore fait (nginx pas encore configuré, hors scope dev).
- **Vérifié (pas modifié)** : `OffreEmploi` n'a **pas** de slug — routes offres toujours `/jobs/<id>/` (contrairement à `ProfilEntreprise.slug` qui existe déjà). Décision **non prise** unilatéralement : ajouter un slug aux offres casserait les URLs déjà partagées/indexées (liens email, éventuels partages) sans stratégie de redirection 301 depuis l'ancien `/jobs/<id>/` — nécessite une vraie décision produit avant implémentation, pas juste un ajout de champ. Le sitemap utilise donc `/jobs/<id>/` tel quel pour l'instant.

**Tests** : 338/338 frontend ✅ (dont Home/JobDetail/JobsList/EntreprisePublic — 26/26), backend relancé, `npx vite build` propre, sitemap/robots vérifiés manuellement via `Client(SERVER_NAME='localhost')`.

**URLs offres — pattern id+slug** (suite SEO, décision utilisateur après recommandation) : `/jobs/16-responsable-rh-et-paie/` au lieu de `/jobs/16/`. **Pattern hybride choisi délibérément** (comme Indeed/LinkedIn Jobs) plutôt qu'un slug pur type `ProfilEntreprise.slug` — l'ID reste l'unique clé de lookup, le slug n'est que cosmétique et ignoré au parsing. Avantages : zéro migration DB, zéro redirection 301 nécessaire (`/jobs/16/` sans slug continue de fonctionner à l'identique), pas de risque de collision entre offres au titre identique (contrairement à un slug unique en base).
- **Frontend** : `utils/slugify.js` (nouveau, `slugify()` + `jobUrl(id, titre)` — pas de librairie, `normalize("NFKD")` + strip diacritiques). `JobDetail.jsx` parse le param de route en extrayant le préfixe numérique (`idSlug.split("-")[0]`) avant tout appel API — le slug n'existe que dans l'URL affichée, jamais transmis au backend. Tous les liens sortants vers une offre (`JobCard.jsx`, `Home.jsx`, `JobsList.jsx`, `EntreprisePublic.jsx`) construits via `jobUrl()`. Liens laissés en ID seul (hors périmètre SEO, pages authentifiées non crawlées) : `ReviewCandidature.jsx`, `AdminCandidatures.jsx`, `OffresSauvegardees.jsx`.
- **Backend** : `jobs/seo_views.py` (`SitemapXMLView`) génère désormais `{id}-{slugify(titre)}` via `django.utils.text.slugify` (même utilitaire que `ProfilEntreprise.save()`) — aucun champ stocké, calculé à la volée à chaque génération du sitemap.
- **Aucune route Django modifiée** — l'API continue de recevoir un ID pur (`GET jobs/<id>/`), le slug est une pure façade côté React Router (`/jobs/:id` capture tout le segment "16-responsable-rh-et-paie" tel quel, extrait ensuite côté client).

**Tests** : 338/338 frontend ✅ (1 assertion mise à jour dans `EntreprisePublic.test.jsx` — href attendu passe de `/jobs/1` à `/jobs/1-developpeur-front-end`), sitemap re-vérifié manuellement (`/jobs/16-responsable-administration-rh-et-paie/` confirmé en sortie).

---

## 🆕 SESSION 18/08/2026 — demandes client : Home agrément, tableau de bord candidat, modèles Groq

**Contexte** : nouvelle branche `feature/demandes-client` (créée depuis `main`, stash du WIP `feature/diplome-referentiel` mis de côté). Plusieurs demandes client distinctes traitées dans l'ordre.

**Home — mise en avant agrément TAFTECH** : bandeau institutionnel sobre (icône + titre + référence, bordure fine, pas de pilule pleine couleur type IA générique) au-dessus de "Pourquoi choisir TAFTECH" avec le texte exact "Agrément n°14 du 09 mai 2026, Ministère du Travail, de l'Emploi et de la Sécurité Sociale". Section "Pourquoi choisir TAFTECH ?" recentrée sur les 3 piliers demandés par le client : Matching intelligent, Expertise RH, Protection des données (remplace les anciennes cartes CVthèque/simple-rapide-sécurisé). CTA "Je cherche un emploi" / "Je recrute" conservés inchangés dans le hero.

**Nouveau tableau de bord candidat** (`taftech_frontend/src/Pages/Candidat/CandidatDashboard.jsx`, route `/dashboard-candidat`) — première page vue par le candidat après connexion. Agrège : complétude du profil (jauge circulaire SVG, réutilise la logique `CHAMPS_PROFIL` de `useProfilCandidat.js` en version locale allégée + langues), checklist des éléments manquants (badges cliquables → `/profil`), offres recommandées (`jobsService.getOffresRecommandees()`, réutilise `JobCard`), dernières candidatures (3 dernières, badge de statut coloré), suggestions de métiers IA (`getSuggestionsCarriere()`, auto-chargé), et **Analyse IA du CV** (`getAnalyseCarriere()`, à la demande via bouton — pas auto-fetché pour respecter le throttle Groq).
- Devenue la page d'atterrissage candidat : `GuestRoute`, `RecruteurRoute`, `AdminRoute` (`App.jsx`) redirigent désormais vers `/dashboard-candidat` au lieu de `/profil`. `Login.jsx` et `RegisterCandidat.jsx` (login classique + Google, inscription Google) `navigate()` vers `/dashboard-candidat` après connexion/inscription réussie au lieu de `/`.
- Ajouté en premier dans `CandidatLayout.jsx` (sidebar), `Navbar.jsx` (dropdown desktop + menu mobile), `BottomNavCandidat.jsx` (remplace "Accueil" — bottom nav plafonnée à 5 items, décision produit déjà actée).
- **Audit sécurité** (nouvelle règle #9, voir Règles de collaboration) : route protégée par `CandidatRoute` (identique à `/profil`). Aucun nouvel endpoint backend créé — réutilise uniquement des endpoints déjà `IsAuthenticated` + scopés `request.user` (`MesCandidaturesAPIView` filtre `candidat=request.user`, `ProfilCandidatAPIView`/`SuggestionsCarriereAPIView`/`AnalyseCarriereGroqAPIView` vérifient `role == 'CANDIDAT'`). RAS.

**🐛 Bug critique découvert et corrigé — modèles Groq dépréciés (llama-3.x introuvables)** : en testant "Analyse IA du CV", l'API Groq retournait 404 `model_not_found` sur `llama-3.1-8b-instant` (utilisé par `_appel_groq()` et `GenererOffreIAAPIView` dans `jobs/views/ia.py`) et `llama-3.3-70b-versatile` (utilisé par `cv_parser.py`, `GROQ_MODEL`) — **Groq a retiré tous les modèles Llama de l'API pour cette clé/compte**, confirmé via `GET https://api.groq.com/openai/v1/models` (plus aucun modèle `llama-*` texte dans la liste). Impactait silencieusement : Suggestions carrière (analyse IA), génération d'offre IA, ET tout le parsing CV (`_call_groq` dans `cv_parser.py` → `domaine_agent.py` en dépend aussi).
- **Fix** : remplacement par `openai/gpt-oss-20b` (modèle "reasoning" disponible sur Groq) partout (3 emplacements : `_appel_groq()`, l'appel direct de `GenererOffreIAAPIView`, `GROQ_MODEL` dans `cv_parser.py`).
- **Piège spécifique aux modèles reasoning (gpt-oss)** : par défaut, le modèle consomme le budget `max_tokens` sur son raisonnement interne (`reasoning` field de la réponse) et retourne `content` vide si `max_tokens` est atteint avant la fin du raisonnement (`finish_reason: "length"`). Fix : ajout de `reasoning_effort: "low"` sur les 3 appels (paramètre supporté nativement par le SDK Python `groq` 1.2.0 et par l'API REST directe) — réduit le raisonnement à ~15-20 tokens, laissant le budget `max_tokens` existant (500/800→1000/3000-6000) largement suffisant pour le contenu réel. Vérifié en JSON mode (`response_format: json_object`) également fonctionnel.
- **Non fait** : pas de liste de fallback multi-modèles ni de retry automatique — un seul modèle codé en dur par appel, comme avant. Si Groq déprécie encore ce modèle, le symptôme sera identique ("Service IA temporairement indisponible") et le diagnostic est désormais documenté ici (tester `curl .../v1/models` en premier réflexe).

**Analyse IA du CV/carrière — personnalisation demandée par le client** : le client a jugé les 3 sections d'origine (`ÉVOLUTION POSSIBLE`/`COMPÉTENCES À ACQUÉRIR`/`CONSEIL PERSONNALISÉ`) trop génériques. `AnalyseCarriereGroqAPIView` (`jobs/views/ia.py`) réécrite avec **5 sections** ancrées sur le métier réel du candidat : `MÉTIERS POSSIBLES` (3-5 métiers concrets), `POINTS FORTS`, `COMPÉTENCES MANQUANTES`, `FORMATIONS RECOMMANDÉES`, `ÉVOLUTION PROFESSIONNELLE`. Prompt système durci ("interdiction absolue de conseils génériques", "cite des éléments concrets tirés du profil") — testé manuellement sur un profil réel (dev Full Stack Django/React), résultat correctement personnalisé (cite les technologies/l'employeur/le diplôme exacts). `max_tokens` monté de 800 à 1200 (5 sections vs 3).
- Frontend : `SECTIONS_CONFIG` régénéré dynamiquement depuis un tableau `SECTION_KEYS` (au lieu de 3 blocs dupliqués) dans `SuggestionsCarriere.jsx` ET `CandidatDashboard.jsx` (parsing dupliqué intentionnellement, comme avant). 2 nouveaux tokens `tw.analyseSectionColors` (`blue`, `rose`) ajoutés dans `theme.js` pour couvrir les 5 sections (avant : seulement indigo/amber/emerald).
- **Piège regex découvert en testant en conditions réelles** : le modèle `openai/gpt-oss-20b` ne ferme pas toujours le `###` après l'intitulé de section (ex. `###MÉTIERS POSSIBLES` sans `###` de fin avant le contenu) — la regex de parsing exigeait `#{1,3}` obligatoire après la clé, ce qui faisait échouer TOUT le parsing silencieusement (repli sur bloc "ANALYSE PERSONNALISÉE" brut). Fix : `#{1,3}` → `#{0,3}` (optionnel) après la clé dans les deux fichiers. Validé par un test Node isolé (regex exécutée hors navigateur contre un vrai payload Groq) avant de considérer le fix acquis — les tests Vitest ne couvrent pas le contenu réel retourné par Groq, donc ce genre de régression de format ne se voit qu'en testant avec de vraies réponses IA.

**Matching — bouton "Pourquoi ce score ?"** : le client voulait que candidat ET recruteur comprennent comment le score est obtenu (expérience, diplôme, compétences, localisation, mobilité). Aucune donnée backend manquante — `matcher.py` calcule déjà `details` (points par critère : specialite 25, diplome 20, experience 20, competences 15, region 20) ET `explications` (phrase lisible par critère, ex. région narre déjà la règle de mobilité appliquée : "Mobilité nationale sur toute l'Algérie.") ; les deux DTOs (`MesCandidaturesDTO` côté candidat, `CandidatureRecruteurDTO` côté recruteur) exposaient déjà `details_matching` en entier — mais le champ `explications` n'était consommé QUE côté recruteur (`DetailCandidature.jsx`), jamais côté candidat.
- **Décision produit** : pas de critère "Mobilité" séparé créé (aurait fallu inventer un score arbitraire non calculé par l'algorithme) — le critère `region` existant est relabellisé partout `"Localisation & mobilité"` (déjà ce qu'il calcule réellement : distance + `ProfilCandidat.mobilite`), plus honnête que d'afficher un doublon fictif.
- **Côté candidat** (`MesCandidatures.jsx`) : bouton renommé `"Voir l'analyse IA détaillée"` → `"Pourquoi ce score ?"` (icône `HelpCircle`), le texte `explications[key]` (jusque-là inutilisé) est désormais affiché sous chaque barre de progression du détail par critère, comme côté recruteur.
- **Côté recruteur** (`DetailCandidature.jsx`, onglet "Analyse IA") : ajout d'un en-tête explicite `"Pourquoi ce score ?"` au-dessus du détail par critère (déjà affiché mais sans titre clair). `Modals.jsx` (comparateur 2 candidats) : label relabellisé en cohérence, pas de nouveau bouton ajouté (hors scope, composant différent).
- **Audit sécurité** : zéro endpoint backend créé/modifié — uniquement affichage de données déjà exposées par les DTOs existants (scopées candidat → ses propres candidatures, recruteur → candidatures de son entreprise via `get_entreprise_for_user()`). RAS.

**Suivi des candidatures — nouveau statut `PRESELECTION` + chronologie visuelle** : le client voulait 6 étapes visibles (Candidature envoyée, Reçue, En cours d'étude, Présélection, Entretien, Décision) — le workflow n'avait que 5 statuts sans "Présélection" distincte. Décision prise avec l'utilisateur : ajouter un vrai statut backend plutôt qu'un habillage purement visuel.
- **Backend** : `Candidature.STATUTS` (`jobs/models.py`) — nouveau choix `PRESELECTION` inséré entre `EN_COURS` et `ENTRETIEN`. `CharField` simple (pas de contrainte DB) → migration `0056_alter_candidature_statut` générée par `makemigrations` (no-op schéma, reflète juste les nouveaux choix Django). `UpdateCandidatureStatusAPIView` (`jobs/views/candidatures.py`) : whitelist de statuts valides déjà dérivée dynamiquement de `Candidature.STATUTS` (`[choix[0] for choix in Candidature.STATUTS]`) → aucun changement de validation nécessaire. Nouvelle branche `elif nouveau_statut == 'PRESELECTION'` ajoutée pour la notification en boîte de réception (type `INFO` par défaut, comme `EN_COURS` — pas d'email envoyé, comme avant pour ce palier).
- **Frontend** : nouveau composant réutilisable `Components/CandidatureTimeline.jsx` — chronologie horizontale scrollable à 6 nœuds (icônes `Send`/`Inbox`/`Search`/`ListChecks`/`Users`/`CheckCircle2`), le dernier nœud "Décision" prend la couleur succès (vert, `Retenu(e)`) ou danger (rouge, `Refusé(e)`) une fois tranché, sinon reste neutre. Mapping `STATUT_STAGE_INDEX` : `RECUE`→1 (Envoyée+Reçue comptent comme acquises ensemble, il n'existe aucun état "avant RECUE"), `EN_COURS`→2, `PRESELECTION`→3, `ENTRETIEN`→4, `RETENU`/`REFUSE`→5. Intégrée dans `MesCandidatures.jsx` (candidat, toujours visible sur chaque carte) et `DetailCandidature.jsx` (recruteur, sous l'en-tête du panneau détail).
- Ajouté partout où le statut est mappé : `STATUT_LABELS`/`getBadgeStyle`/`getMessageStatut` (`MesCandidatures.jsx`), `STATUTS_LABELS` (dropdown recruteur `DetailCandidature.jsx` — `Object.entries().map()` donc l'ordre d'insertion dans l'objet suffit), `AdminCandidatures.jsx` (filtre + badge), `DashboardRecruteur.jsx` (compteur "en traitement" inclut désormais `PRESELECTION`), label `Modals.jsx` (comparateur). Nouveaux tokens `theme.js` : `statusPurpleSoft`, `candidatureStatutStyles.PRESELECTION`, section `timelineNode*`/`timelineLine*`.
- **Non touché** : `BoiteReception.jsx` (switch sur `type_notif`, pas sur `statut` — le type `INFO` par défaut couvre déjà PRESELECTION correctement, aucun changement requis).
- **Piège tests** : les libellés d'étape de la chronologie (`"Reçue"`, `"Entretien"`, `"Refusé(e)"`) coïncident textuellement avec les badges de statut déjà testés dans `MesCandidatures.test.jsx` → 2 tests passés de `getByText` à `getAllByText(...).length >= 1` (un seul élément attendu devenait 2, `getByText` lève une erreur "multiple elements found" si non unique).
- **Audit sécurité** : `PRESELECTION` traverse exactement le même chemin de permission que les 5 statuts existants (`get_entreprise_for_user()` + `get_membre_role() in _ROLES_ACTION`, INVITE toujours bloqué en écriture) — aucune nouvelle surface d'attaque.

**Dashboard recruteur — graphiques + "Candidats recommandés"** : le client jugeait le dashboard déjà bien, demandait juste d'ajouter des graphiques (évolution candidatures/recrutements, pipeline) et une section candidats recommandés (score, points forts, points de vigilance, explication du matching). **Zéro appel backend supplémentaire** — `DashboardRecruteurAPIView` (`jobs/views/recruteur.py`) retournait déjà `offres[].candidatures[]` avec `score_matching`/`details_matching`/`statut`/`date_postulation` en entier (via `CandidatureRecruteurDTO`, déjà prefetch `candidatures__candidat`) : tout calculé côté client dans `DashboardRecruteur.jsx`.
- **Graphiques** : projet sans librairie de charts (`package.json` ne liste ni recharts ni chart.js) — nouveau composant réutilisable `Components/MiniAreaChart.jsx` (SVG inline, pattern déjà établi par `RadarChart` de `MesCandidatures.jsx`) pour la courbe "Évolution (6 derniers mois)" à 2 séries (candidatures reçues en indigo, recrutements/RETENU en emerald). "Pipeline de recrutement" : barres horizontales simples (divs, pas de SVG) sur les 6 statuts (couleurs alignées sur `PIPELINE_STAGES`, mêmes teintes que `candidatureStatutStyles`/`CandidatureTimeline`).
- **Candidats recommandés** : agrège `offres[].candidatures[]` de toutes les offres du recruteur (hors candidatures rapides, hors score null), trie par `score_matching` desc, top 5. Réutilise `details_matching.highlights.points_forts` (points forts) et `.highlights.ecarts` relabellisé **"Points de vigilance"** (cohérence de vocabulaire avec la demande client, même donnée que "Axes d'amélioration" ailleurs dans l'app). "Explication du matching" = une seule phrase (`explications.specialite`, ou `experience`, ou la première disponible) plutôt qu'un debug complet — le detail par critère complet reste accessible via "Pourquoi ce score ?" dans `DetailCandidature.jsx`, pas dupliqué ici. Carte cliquable → `/dashboard/offres/{offreId}` (pas de deep-link vers la candidature précise, la route ne le permet pas).
- **Décision produit** : pas de 3ᵉ graphique séparé pour "recrutements" — fusionné dans la courbe "Évolution" comme 2ᵉ série, évite un widget redondant avec les mêmes données temporelles.
- **Audit sécurité** : aucune route/endpoint ajouté, uniquement de l'agrégation client-side sur des données déjà scopées à l'entreprise du recruteur connecté (`get_entreprise_for_user()` en amont dans `DashboardRecruteurAPIView`). RAS.

---

## 🆕 SESSION 28/07/2026 — sécurité mdp FR, confirmToast, spécialité IA, questionnaire modale, export Excel

**Contexte** : session longue avec plusieurs correctifs UX/backend distincts, tous sur `feature/us13-aout` (créée depuis `main` après un premier commit direct sur `main` : fix message d'erreur inscription + ajustements navbar/IA, poussé avec permission explicite de l'utilisateur).

**Messages d'erreur mot de passe en français** : `LANGUAGE_CODE` passé de `'en-us'` à `'fr'` dans `settings.py` — active les traductions françaises déjà intégrées à Django pour `AUTH_PASSWORD_VALIDATORS` (trop court, trop courant, entièrement numérique, similaire à un champ utilisateur). Combiné à un fix frontend antérieur (`RegisterCandidat.jsx` affiche le premier message d'erreur backend réel au lieu de "Une erreur est survenue"). Un test (`test_reset_password_trop_court_rejete`) mis à jour pour matcher le message français.

**`window.confirm()` remplacé partout** — popups navigateur natifs ("localhost dit...") jugés non professionnels. Nouveau `utils/confirmToast.jsx` : mini-modale maison (store module + `<ConfirmModalHost />` monté une fois dans `App.jsx`), pas `toast.custom()` de react-hot-toast (cassait sous Vitest — mock manuel de `react-hot-toast` dans plusieurs fichiers de test sans `.custom`, plus un souci de résolution ESM/CJS). 13 occurrences remplacées dans 9 fichiers (Admin : Broadcast, Entreprises, Offres, Users, Métiers, SystemLogs ; Candidat : ProfilCandidat, AlertesEmploi ; Recruteur : GestionOffre). 7 fichiers de tests adaptés (rendent `<ConfirmModalHost />` à côté du composant testé, cliquent "Confirmer"/"Annuler" au lieu de mocker `window.confirm`).

**Spécialité candidat mal classée par l'IA (bug réel signalé)** : `extract_specialite()` utilisait `resoudre_domaine_depuis_texte()` sur tout le texte brut du CV (vote majoritaire par fréquence de mots sur 50 fiches `MetierReferentiel`) → classait un "Ingénieur IA" en secteur Agricole. Root cause en 2 couches :
1. `_candidats_pour_experience()` (RAG des indices donnés à l'agent Groq) ne triait jamais par pertinence — requête `OR` sur mots-clés retournait les 10 premiers résultats dans l'ordre brut de la base (secteur A=Agricole en tête par ordre d'insertion). Fix : exclusion des mots trop génériques (`_MOTS_GENERIQUES` : ingénieur, cadre, chargé, développement...) + tri par nombre réel de mots communs, liste vide plutôt que suggestion trompeuse si titre 100% générique.
2. `classifier_domaines_experiences()` : la spécialité globale (élément `[PROFIL]`) était injectée avec un index négatif (`-1`) dans le même batch Groq que les expériences — l'IA l'ignorait silencieusement dès qu'il y avait plusieurs vraies expériences (renvoyait un tableau JSON positionnel 0..n-1 sans jamais inclure -1). Fix : décalage séquentiel (`[PROFIL]`=index 0, expériences=1..n côté prompt, re-décalées côté retour) au lieu d'un index spécial.
3. Règle d'abstention du prompt ("si trop vague, réponds vide") s'appliquait aussi au `[PROFIL]` — un titre composé ("Ingénieur IA ET Cadre administratif") était jugé trop ambigu et laissé vide. Fix : exception explicite pour `[PROFIL]` — ne jamais s'abstenir, classer selon la **première fonction mentionnée** dans le titre (décision produit validée avec l'utilisateur).
Testé 3x de suite sur le vrai CV de l'utilisateur → `L18 Systèmes d'information et de télécommunication` stable.

**Génération IA de l'offre (`GenererOffreIAAPIView`) cassée depuis l'ajout Domaine/Sous-domaine** : `specialite` envoyée au prompt Groq était le code brut (`"L18"`) au lieu d'un libellé lisible. Fix : traduction code→libellé via `Domaine.objects.filter(code=...)` avant construction du prompt (même pattern que le fix Suggestions Carrière d'une session précédente).

**Questionnaire créable directement depuis "Publier une offre"** : le sélecteur de questionnaire existait déjà dans `CreateJob.jsx` mais le lien "Créer un questionnaire" menait vers `/questionnaires` (perte du formulaire d'offre en cours). Nouveau composant réutilisable `Components/CreateQuestionnaireModal.jsx` (logique de création extraite de `Questionnaires.jsx`, pas de refactor de la page existante pour ne pas risquer ses tests). **Bug trouvé en testant** : le `<form>` interne de la modale était imbriqué dans le `<form>` de la page offre (invalide en HTML) → cliquer sur "Créer le questionnaire" soumettait le formulaire PARENT (rechargement de page, perte des données saisies). Fix : `<form>` interne remplacé par `<div>` + bouton `type="button"` avec `onClick` manuel.

**CV upload — feedback visuel amélioré** : nouveau champ `cv_pdf_maj_le` (migration `0055`) sur `ProfilCandidat`, mis à jour à chaque upload (parser ou formulaire normal) ; la modale "Remplissage automatique" affiche désormais une carte "CV actuel : `nom.pdf` — Mis à jour le [date]" avant la dropzone au lieu d'un écran neutre qui ne changeait jamais. Bouton supprimer CV ajouté dans `ProfilCandidat/index.jsx` (`remove_cv_pdf` côté backend, même pattern que `remove_photo_profil`).

**Checklist "champs manquants" sur la page Profil Candidat** : réutilise exactement la logique déjà présente dans `ReviewCandidature.jsx` (`CHAMPS_PROFIL` avec labels + tests) — affichée en badges ambre sous la jauge de complétion, factorisée dans `useProfilCandidat.js` (`champsManquants`).

**Suggestions Carrière — badges "IA Cloud"/"Regex" retirés** de la modale parser CV (jugés inutiles par l'utilisateur, exposaient un détail d'implémentation sans valeur pour le candidat).

**Export Excel candidatures (notes + commentaires recruteur)** : deux nouveaux endpoints backend (`jobs/views/recruteur.py`, openpyxl déjà en dépendance) —
- `GET jobs/dashboard/offres/<id>/export-excel/` : candidatures d'une offre (date, candidat, email, tél, statut, score IA, 4 notes détaillées, note globale /20, commentaire recruteur).
- `GET jobs/dashboard/export-excel/` : toutes offres confondues de l'entreprise (+ colonne Offre).
Boutons "Exporter Excel" dans `GestionOffre` (par offre) et `DashboardRecruteur` (global).

**Date d'entretien absente de la notification boîte de réception** (signalé par l'utilisateur, l'email de convocation l'affichait déjà) : `jobs/views/candidatures.py`, la notification en base pour le statut `ENTRETIEN` inclut maintenant la date/heure formatée (`"...Le 05/08/2026 à 14h00."`) quand `candidature.date_entretien` est renseignée.

**Tests** : 338/338 frontend ✅, backend suite complète ✅ (relancée après chaque fix significatif).

---

## 🆕 SUITE SESSION REFONTE MOBILE (19/07/2026, tard) — style, bottom nav, bugs réels

**Contexte** : après les 8 lots structurels/perf (voir section précédente), l'utilisateur a testé sur téléphone réel via ngrok et remonté 3 problèmes concrets avec captures d'écran — l'exercice a servi de rappel que l'audit statique ne remplace pas un test réel.

**Bug réel #1 — overflow horizontal sur ProfilCandidat** : le nom de fichier CV (`Curriculum_Vitae_Officiel_BOUMAZA_Rafik-1_CHPwxq6.pdf`) faisait déborder toute la page horizontalement au lieu d'être tronqué. Cause : `truncate` sur un `<span flex-1>` sans `min-w-0` sur la chaîne de parents flex (`<a>` et son `<div flex-1>`) — anti-pattern classique, les flex-items ont `min-width:auto` par défaut donc un texte long pousse tout le layout plus large que le viewport au lieu d'être coupé. Fix : `min-w-0` ajouté sur `<div className="flex-1">` et `<a>` (`ProfilCandidat/index.jsx` section CV). Vérifié qu'aucun autre endroit du code n'a le même pattern non protégé (`CVTheque.jsx` avait déjà `min-w-0` correctement).

**Bug réel #2 — navigation candidat dupliquée sur mobile** : `CandidatLayout.jsx` a une sidebar desktop (`aside w-full md:w-60`) qui se rabattait en **pleine largeur** sur mobile au lieu de disparaître — résultat : les mêmes liens (Mon profil, Mes candidatures, Boîte de réception, etc.) apparaissaient DEUX fois : dans le hamburger ET en grosse carte blanche redondante en haut de chaque page candidat. Fix : `<aside>` passé en `hidden md:block` (uniquement desktop/tablette, le hamburger/bottom nav couvrent le mobile). Padding de page resserré en même temps (`px-6 py-8` → `px-4 py-5` sur mobile, `md:` restaure l'ancien).

**Style visuel — flat touch-first sur JobCard** : l'utilisateur a précisé vouloir un vrai changement visuel (pas seulement structurel), en gardant les couleurs de marque indigo/teal. `tw.jobCardShell` : `rounded-2xl` sur mobile (vs `rounded-xl` desktop inchangé via `sm:`), `active:scale-[0.98]` (feedback de press immédiat, `sm:active:scale-100` pour ne pas l'appliquer au hover desktop). Badges/tags passés de gris neutre discret à blocs de couleur pleins et contrastés (`jobCardBadgeNeutral` : `bg-slate-100` → `bg-indigo-50 text-indigo-700 font-bold`, `jobCardTagSuccess` : `bg-emerald-50` → `bg-emerald-100 text-emerald-800 font-semibold`). Titre/nom entreprise en `text-base font-bold` sur mobile (vs `text-sm font-semibold` desktop). Autres écrans (Accueil, Dashboard) pas retouchés visuellement cette session — JobCard est le composant le plus visible/répété (Accueil + Recherche offres).

**Bottom nav mobile — 3 nouveaux composants** (`Components/BottomNav{Candidat,Guest,Recruteur}.jsx`) : barre fixe en bas d'écran, 5 destinations max, visible uniquement `<md` (sous 768px). Complète le hamburger, ne le remplace pas — le hamburger garde les liens secondaires.
- `BottomNavCandidat` (candidat connecté) : Accueil, Offres, Profil, Candidatures, Messages (badge non-lus).
- `BottomNavGuest` (visiteur non connecté, portail candidat) : Accueil, Offres, Secteurs, Entreprises, Connexion.
- `BottomNavRecruteur` (recruteur/membre équipe connecté) : Tableau, Publier, CVthèque, Spontanées, Paramètres — filtré par rôle via `authService.peutFaire()` (un INVITE ne voit pas Publier/CVthèque, identique à la logique du dropdown desktop existant).
- Branché dans `App.jsx` (`showBottomNavCandidat`/`showBottomNavGuest`/`showBottomNavRecruteur`, mutuellement exclusifs selon `role`/`recruteurPortal`/`isLogged`), pas affiché sur les routes admin. `<main>` reçoit `pb-16 md:pb-0` quand une bottom nav est visible pour ne pas passer dessous.
- **Décision produit** : pas de bottom nav pour les visiteurs non connectés du portail recruteur (landing page) — déjà dense en CTA, jugé non prioritaire.

**Hamburger allégé pour éviter le triple-doublon** (Navbar + NavbarRecruteur) : une fois la bottom nav en place, le hamburger dupliquait ses liens en dessous de 768px. `mobileLinkClass(path, dupBottomNav)` : les liens déjà couverts par la bottom nav sont masqués `hidden md:flex` — **cachés sous 768px, réaffichés en tablette portrait 768-1024px** où il n'y a pas de bottom nav et le hamburger reste la seule navigation. Candidat : Accueil/Offres masqués (guest : + Secteurs/Entreprises/Connexion). Recruteur : Tableau/Publier/CVthèque/Spontanées/Paramètres masqués, seuls Questionnaires et Déconnexion restent visibles sous 768px.

**Hamburger converti en dropdown ancré (pas plein écran)** : après le trim ci-dessus, le panneau plein écran (`fixed inset-0`, ajouté plus tôt dans la session) laissait un immense vide blanc pour 2-3 liens restants (ex. visiteur : juste "Par région" + "S'inscrire" + "Espace recruteur"). Remplacé par un menu déroulant ancré sous la navbar (`tw.mobileMenuSheet` : `fixed top-16 inset-x-0 rounded-b-2xl shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto` — hauteur = contenu, pas viewport) + `tw.mobileMenuBackdrop` (fond assombri cliquable pour fermer, `bg-slate-900/40`). Header interne dupliqué (logo + bouton fermer) supprimé — la vraie navbar reste visible au-dessus, son bouton hamburger (devenu ✕) suffit à fermer. Tokens `mobileOverlayPanel`/plein écran retirés de `theme.js`, remplacés par ces deux nouveaux.

**Tests** : 338/338 vert après chaque étape (bug fixes, style JobCard, 3 bottom nav, trim hamburger, conversion dropdown) — aucune régression sur toute cette suite de changements.

---

## 🆕 SESSION REFONTE MOBILE (19/07/2026)

**Contexte** : l'utilisateur jugeait le mode mobile "bas de gamme" (perf + polish). Audit exploratoire complet du frontend avant travail (skill `ui-ux-pro-max`), plan en 8 lots exécutés d'un coup avec `npx vite build` + suite Vitest complète vérifiés après chaque lot (338/338 systématiquement). Aucune couleur de marque ni rendu desktop modifiés — uniquement des ajustements responsive/perf.

**`theme.js`** : nouveaux tokens `tapTarget` (`min-h-[44px] min-w-[44px] flex items-center justify-center`, cibles tactiles), `mobileOverlayPanel` (`fixed inset-0 z-[60] bg-white flex flex-col overscroll-contain`, panneau nav mobile plein écran), `modalPanelMobile` (variante bottom-sheet définie mais **non consommée** — voir limite ci-dessous). `jobCardApplyButton`/`jobCardGhostButton` agrandis en `py-2.5 sm:py-1.5 text-sm sm:text-xs` (desktop inchangé). `modalOverlay` passe de `items-center` à `items-end sm:items-center` — toutes les modales de l'app (12 fichiers, backdrop partagé) s'ancrent désormais en bas d'écran sur mobile au lieu de flotter au centre, desktop identique.

**Navigation mobile** (`Navbar.jsx`, `NavbarRecruteur.jsx`) : le panneau hamburger, auparavant inséré en flux normal sous la navbar (`lg:hidden` + `border-t`), est remplacé par un overlay `fixed inset-0` plein écran avec header interne (logo + bouton fermer) et liste scrollable. Scroll-lock du `<body>` via `useEffect` sur l'état d'ouverture (`document.body.style.overflow`). Boutons hamburger/fermer et liens mobiles portés à ≥44px (`tw.tapTarget`, `min-h-[44px]`).

**Grids sans fallback mobile** corrigés (pattern `grid-cols-1 sm:grid-cols-2 md:grid-cols-N` déjà standard au projet) : `JobDetail.jsx` (×2), `ParametresRecruteur.jsx` (skeleton loader), `DetailCandidature.jsx`, `AdminUsers.jsx`. Deux grids `grid-cols-2` volontaires laissés tels quels (mini-stats 2×2 `DashboardRecruteur.jsx`/`QuiSommesNous.jsx`, commentés comme un choix délibéré, pas un bug).

**Tap targets & lisibilité** : tous les `text-[10px]` remontés à `text-xs` (12px, minimum lisible mobile) dans `JobsList.jsx`, `DashboardRecruteur.jsx`, `AdminOffres.jsx`.

**Tables admin non responsive** : bug confirmé `overflow-hidden` (au lieu de `overflow-x-auto`) sur le wrapper `${tw.card}` — la table coupait/comprimait son contenu sur mobile sans scroll possible. Corrigé en généralisant le pattern déjà correct de `AdminCandidatures.jsx`/`MonEquipe.jsx` (`<div className="overflow-x-auto"><table className="min-w-[Npx]">`) sur `AdminOffres.jsx`, `AdminUsers.jsx`, `AdminAuditLogs.jsx`, `AdminMetiers.jsx`, `AdminEntreprises.jsx`, `AdminDemandesPremium.jsx`, `AdminSystemLogs.jsx`.
**Décision produit** : pas de carte mobile dédiée par ligne (pattern déjà utilisé dans `DashboardRecruteur.jsx`) généralisée à ces 7 tables admin — jugé disproportionné (risque de doublons DOM dans les tests RTL type `getByText` + effort élevé) pour un panel interne à faible trafic mobile. Le scroll horizontal résout le bug réel (contenu coupé) ; la carte mobile reste une amélioration future si le besoin se confirme.

**Perf images** : `loading="lazy"` + `width`/`height` HTML natifs (anti-CLS) sur les images répétées en liste/grille : logos entreprise (`JobsList.jsx`, `Entreprises.jsx`), avatars candidats (`CVTheque.jsx`, `AdminUsers.jsx`, `GestionOffre/index.jsx`). Logos navbar (au-dessus de la ligne de flottaison) : dimensions ajoutées sans `lazy`. Code-splitting existant (`React.lazy` sur la majorité des pages) laissé tel quel — `Home`/`JobsList`/`JobDetail`/`Login` restent statiques (pages d'entrée les plus visitées, un lazy-load dégraderait le temps perçu).

**`prefers-reduced-motion`** : règle globale ajoutée dans `index.css` (`animation-duration`/`transition-duration` ramenés à ~0 quand l'utilisateur l'a demandé au niveau OS) — couvre l'unique `@keyframes` custom du projet (`fadeInDown`) et toutes les transitions Tailwind standards.

**Limite connue** : `modalPanelMobile` (bottom-sheet avec coins arrondis seulement en haut, poignée de fermeture) a été défini dans `theme.js` mais n'est pas consommé — les 12 fichiers utilisant des modales référencent uniquement `tw.modalOverlay` (le fond) et définissent leur propre classe de panneau en dur (`rounded-xl`/`rounded-2xl` sur tous les coins, pas de token `modalPanel` central à réviser en un seul endroit). Un vrai bottom-sheet par modale nécessiterait une passe fichier par fichier — non fait cette session, `modalOverlay` (ancrage bas d'écran) apporte déjà l'essentiel du gain UX à risque quasi nul.

---

## 🆕 SESSION AGENT IA CLASSIFICATION DOMAINE (19/07/2026)

**Contexte** : le choix du Domaine ANEM par expérience se trompait trop souvent — il était décidé dans le même appel Groq géant que toute l'extraction CV (titre, expériences, formations, infos perso), noyé parmi 87 codes sans ancrage sur de vraies données.

**Nouveau `jobs/domaine_agent.py`** — agent Groq **dédié**, appelé séparément après `parse_cv()` (pas dans le prompt d'extraction) : `classifier_domaines_experiences(experiences)`.
- Pour chaque expérience, `_candidats_pour_experience()` cherche par mots-clés (`icontains`, mots ≥4 lettres) des appellations `MetierReferentiel` réelles ressemblant au poste/à la description → fournies à l'IA comme indices concrets (RAG léger, réduit l'hallucination vs deviner un code parmi 87 dans le vide).
- Un seul appel Groq batché pour toutes les expériences du CV (pas un appel par expérience — coût token).
- Réponse JSON `{"classifications": [{"index", "domaine_code", "raison"}]}` — `raison` demandée pour forcer un vrai raisonnement mais jamais stockée. Codes validés contre `Domaine.objects.values_list('code')` avant usage — un code halluciné est ignoré.
- Si l'agent échoue ou ne répond rien pour un index → repli sur l'ancienne logique (`_deviner_secteur_experience` : choix Groq inline du prompt d'extraction, puis `resoudre_domaine_depuis_texte` par mots-clés).

**`jobs/referentiel_utils.py`** : nouvelle fonction publique `domaines_list_pour_prompt()` (liste "code — libellé" des 87 domaines, cache 1h `jobs_domaines_prompt_list`) — mutualisée entre le prompt d'extraction CV et le nouvel agent. `cv_parser._domaines_list_pour_prompt()` délègue désormais à celle-ci (plus de duplication).

**`jobs/views/ia.py`** (`ParserCVAPIView.post`) : appelle `classifier_domaines_experiences(experiences)` une fois sur toutes les expériences extraites, avant la boucle qui assigne `exp['secteur']`.

**Décision produit** : pas de champ `sous_domaine` ajouté sur `ExperienceCandidat`/`ProfilCandidat` malgré la demande initiale — rien ne le consomme (matching reste au niveau Domaine), et ça aurait nécessité une migration + toucher tout le frontend pour zéro valeur mesurable. Le sous-domaine ANEM est fait pour classifier des appellations précises (5786 lignes), pas des expériences en langage libre. Priorité donnée à la précision du Domaine seul, qui est ce qui alimente réellement le matching.

**Tests** : `test_api_metiers.py` 16/16 ✅ après le changement (aucune régression, le nouveau flux ne touche pas le modèle/l'API testée).

---

## 🆕 SESSION NOMENCLATURE ANEM (18/07/2026)

**Contexte** : l'ANEM a fourni un fichier officiel (`NAME.xlsx`, 5790 lignes) contenant la nomenclature algérienne des métiers. Remplacement complet (pas d'ajout) de deux systèmes existants :
1. `SECTEURS_CHOICES` (19 codes plats codés en dur type `IT`/`BTP`/`FINANCE`) → 16 secteurs officiels ANEM (`A`.."P")
2. `MetierReferentiel` plat (13 388 lignes ROME+Emploitic, un seul champ `secteur` texte libre) → hiérarchie complète Secteur → Domaine (87) → Sous-domaine (36) → Appellation (5786, = nouveau `MetierReferentiel`)

**Nouveaux modèles** (`jobs/models.py`, migration `0054`) : `Secteur` (code, libelle), `Domaine` (FK Secteur, code type "A11", libelle), `SousDomaine` (FK Domaine, libelle). `MetierReferentiel` restructuré : `titre` (= appellation), `domaine` FK, `sous_domaine` FK nullable, `code_fiche`, `fiche_metier`, `secteur_code` dénormalisé. Anciens champs `secteur`/`niveau_experience`/`mots_cles` supprimés.

**Matching au niveau Domaine (pas Secteur)** : `OffreEmploi.specialite`, `ProfilCandidat.specialite`/`secteur_souhaite`, `ExperienceCandidat.secteur` restent des `CharField` simples (pas de FK — éviterait un refactor massif de matcher.py/serializers/frontend) mais stockent désormais un **code Domaine** (ex `"L18"`) au lieu d'un code Secteur. Le préfixe du code Domaine encode son Secteur (`"L18"[0] == "L"`) → sert à déduire la compatibilité "même secteur" dans `matcher.py` sans table de proximité codée en dur. `ProfilEntreprise.secteur_activite` reste au niveau Secteur (16 codes) — une entreprise n'est pas cantonnée à un seul domaine.

**`jobs/matcher.py`** : `_CODES_PROCHES` (dict 19×19 codé en dur) et `SYNONYMES_SPECIALITE` supprimés. `specialites_compatibles()` : code Domaine identique → 1.0, même Secteur (même 1ère lettre) → 0.85, sinon fuzzy `difflib` ≥0.72 en filet de sécurité.

**`jobs/constants.py`** : `SPECIALITES_MAPPING`/`SYNONYMES_SPECIALITE` supprimés, remplacés par résolution dynamique via `jobs/referentiel_utils.resoudre_domaine_depuis_texte()` (recherche par mots-clés dans `MetierReferentiel.titre`, retourne le `domaine.code` le plus fréquent) — utilisé par `cv_parser.extract_specialite()` et `matcher._experience_pertinente()` (fallback).

**Nouvel endpoint `GET jobs/nomenclature/`** (`NomenclatureAPIView`, `jobs/views/offres.py`) : retourne l'arbre complet (secteurs+domaines+sous_domaines, ~140 nœuds), caché 1h (`jobs_nomenclature`). Filtré côté client en cascade, même pattern que wilaya→commune. `domaines[].id` exposé en plus de `code` — nécessaire pour soumettre le FK numérique depuis l'admin (`AdminMetiers.jsx`).

**`MetierReferentielAPIView`** (autocomplete public) : accepte désormais `secteur`, `domaine`, `sous_domaine` en query params en plus de `search`.

**Frontend — `SecteurDomaineSelect.jsx`** (nouveau composant réutilisable) : cascade Secteur → Domaine → Sous-domaine (affiché seulement si non vide pour le domaine choisi). Charge la nomenclature une seule fois via `jobsService.getNomenclature()` (cache module-level). Intégré dans `CreateJob.jsx`, `JobsList.jsx`, `CVTheque.jsx`, `CandidaturesSpontanees.jsx`, `ProfilCandidat/Modals.jsx` (spécialité candidat, secteur souhaité, secteur d'expérience), `AdminMetiers.jsx`.

**`OffresParSecteur.jsx`** : nouveau `iconsMap` 16 entrées (A→Sprout ... P→Users), fallback Briefcase inchangé.

**Migration des données existantes** : commande `import_anem_nomenclature.py` (`--dry-run`, `--migrate-existing-data`, `--file`). Import réel : 16 secteurs, 87 domaines, 36 sous-domaines, 5786 métiers. Les 6 offres + 8 profils + 28 expériences existants (base dev) remappés automatiquement via un dict `ANCIEN_VERS_DOMAINE` (19 anciens codes → code Domaine ANEM le plus pertinent, vérifié manuellement contre les libellés réels après import, ex: `IT`→`L18` "Systèmes d'information et de télécommunication", `BTP`→`F11`, `JURIDIQUE`→`P16` "Droit").

**`requirements.txt`** : ajout `openpyxl==3.1.5` (lecture du fichier Excel ANEM).

**Tests** : backend `test_api_metiers.py` réécrit pour le nouveau modèle (25/25). Frontend : ajout du mock `getNomenclature` dans 7 fichiers de test consommant `SecteurDomaineSelect`, `OffresParSecteur.test.jsx` mis à jour avec les nouveaux codes secteur. 338/338 frontend + 283/283 backend au vert, `npx vite build` propre.

---

## 🆕 SESSION PARSER CV + REFONTE ADMIN (17/07/2026)

### Parser CV (`jobs/cv_parser.py`) — bugs réels trouvés sur CV utilisateurs
- **`find_sections()`** : le matching de mot-clé était en sous-chaîne (`keyword in line_clean`) au lieu de `line_clean.startswith(keyword)` → une ligne comme "Arabe Langue maternelle..." était prise pour un nouveau header de section (contenait "langue") et son contenu était perdu. Fix : `startswith`.
- **Format d'expérience "Du DATE au DATE : ..."** : nouvelle fonction `_extract_experiences_du_au()` — gère le cas réel où le titre du poste est sur la ligne PRÉCÉDENTE (pas fusionné avec la ligne de dates), avec retrait rétroactif de la puce erronée ajoutée par erreur à l'expérience précédente.
- **Format de formation "Mois AAAA : Diplôme à Établissement"** : nouvelle fonction `_extract_formations_mois_annee()`, même logique de continuation.
- **Téléphone** : `extract_phone()` réécrit — gérait mal les regroupements de chiffres autres que 2-2-2-2-2 (ex: "698 560 337" en 3-3-3) et l'indicatif entre parenthèses `(+213)`.
- **Langues** : regex de niveau élargie (`bon niveau`, `notions`, `scolaire` ajoutés), charset élargi pour capter "IELTS : B2" sans couper au `/`.
- **Description tronquée** : `description[:500]` → `description[:3000]` (CV à nombreuses puces coupés à mi-phrase).
- **1 seul appel Groq au lieu de 4** (`PROMPT_CV_COMPLET` fusionné) — réduit le token usage ~4x, corrige un 429 TPM ; `text[:12000]` + `max_tokens=8000` (rééquilibré après la fusion).
- **`ProfilCandidatAPIView.put()`** : troncature auto des champs `User` trop longs + auto-préfixe `https://` sur `linkedin`/`github` (CV contiennent souvent "linkedin.com/..." sans protocole → `URLField` rejetait avant).
- **`_deviner_secteur_experience()`** (nouveau, `jobs/views/ia.py`) : devine le secteur de chaque expérience extraite (recherche `MetierReferentiel` puis fallback mots-clés puis `'AUTRE'` — ne retourne jamais `None`).
- **Limite connue non résolue** : CV à mise en page colonnes (ex. dates alignées à droite) peuvent scrambler l'ordre du texte extrait par `pdfplumber`, regroupant tous les headers de section en tête sans contenu entre eux — cassant le modèle séquentiel de `find_sections()`. Pas encore corrigé ; fallback recommandé = laisser Groq gérer (plus robuste à l'ordre) plutôt que réécrire l'extraction PDF.

### Refonte Admin — design + fonctionnalités
- **Sidebar** (`AdminLayout.jsx`) : regroupée en sections (Principal/Modération/Communauté/Système), fond clair (plus de slate-900 sombre), lien actif = `bg-indigo-50` + barre latérale indigo. Badges de notification (offres/entreprises/demandes premium en attente) alimentés par `AdminStatsAPIView`.
- **Nouvelle page** `AdminDemandesPremium.jsx` (+ route `/admin-taftech/demandes-premium`) : expose l'endpoint `AdminDemandesPremiumAPIView` qui existait déjà côté backend mais n'était jamais utilisé côté frontend.
- **AdminUsers.jsx** : migré vers `tw.*` (était 100% Tailwind en dur) + onglets par rôle (Tous/Candidats/Recruteurs/Admins) avec compteurs, alimentés par un filtre `role` + champ `counts` ajoutés à `AdminUsersListAPIView`.
- **AdminSystemLogs.jsx** : migré vers `tw.*`.
- **Cartes KPI dashboard** (`AdminStatistiques.jsx`) : emojis remplacés par icônes lucide-react dans des chips colorés, recentrées sur la charte TafTech (indigo/teal), ambre/rouge réservés aux alertes.
- **Filtres + tri serveur** : `statut` sur Offres/Candidatures, `ordering` sur Offres/Entreprises/Utilisateurs/Candidatures (nouveau paramètre backend `ORDERING_FIELDS` par vue, whitelist stricte des champs triables). En-têtes cliquables via composant réutilisable `SortableTh.jsx`.
- **Actions groupées** : sélection multiple + "Approuver la sélection" sur Offres et Entreprises (boucle `Promise.all` sur l'endpoint de modération existant, pas de nouvel endpoint bulk côté backend). Volontairement PAS ajouté sur Candidatures (le changement de statut appartient au workflow recruteur/équipe, pas à l'admin).
- **Skeleton loaders** : nouveau composant partagé `SkeletonTableRows.jsx`, remplace le texte "Chargement..." clignotant sur les 4 tableaux admin (Offres/Candidatures/Entreprises/Utilisateurs).
- **Tooltips d'info** (`TooltipIcon` existant réutilisé) : ajoutés sur les KPI ambigus (Recrutements réussis, Offres en attente...), colonnes Score IA/Note entretien, tarif Premium.
- **Accessibilité** : anneau de focus clavier (`tw.focusRing`, nouveau token) + `aria-label` ajoutés sur les boutons d'action icône-seule (Offres/Entreprises/Utilisateurs/Demandes Premium).
- **Décision produit** : pas de bouton "Supprimer" généralisé dans l'admin — seul bloquer/débloquer par défaut, suppression réservée aux cas déjà sûrs (offres non approuvées sans candidature). Historique de recrutement = valeur légale/business, suppression accidentelle plus coûteuse que son absence.
- **5 comptes de test supprimés** (`test_e2e@example.com`, `test_repro@example.com` ×4) — créés le même jour, jamais réels, supprimés en cascade (profil + formations) après confirmation explicite.

---

## 🆕 SESSION UI/UX + PAGES LÉGALES + NOMBRE DE POSTES (15/07/2026, tard)

**Footers refaits (candidat + recruteur)** : structure identique aux deux (Marque / Contact / Réseaux sociaux / Légal), même hauteur/espacement, fond `bg-slate-950`, police Poppins (chargée dans `index.html`) appliquée uniquement au footer via `style={{fontFamily}}`. Colonne "Espace candidat"/"Espace recruteur"/"Plateforme" retirées — jugées redondantes avec la navbar. Réseaux sociaux réels : Facebook `Taftechemploi`, Instagram `taftechemploi`, LinkedIn `oranemploi`, WhatsApp `+213770123440`.

**Nouvelles pages publiques** (routes ajoutées dans `App.jsx`, liées depuis les footers en `target="_blank"`) :
- `/confidentialite` — Politique de confidentialité (sommaire sticky, catégories de données réelles incl. NIN, durée conservation 5 ans candidats / 10 ans recruteurs — valeurs provisoires faute de mieux, à confirmer)
- `/cgu` — CGU, marquées **version provisoire** (bandeau d'alerte) tant que raison sociale/immatriculation ne sont pas fournies par l'utilisateur
- `/contact` — formulaire de contact fonctionnel (envoie un email réel, voir `ContactMessageAPIView`) + FAQ accordéon + horaires (Dim-Jeu 08h-17h, choisi par défaut)
- `/qui-sommes-nous` — mission/valeurs/services + **stats réelles en direct** (`jobs/stats/public/`, jamais de chiffres inventés)

**Portail recruteur vs candidat sur pages partagées** : `App.jsx` lit un paramètre `?portail=recruteur` (en plus du rôle connecté) pour forcer la navbar recruteur sur ces 4 pages quand on y arrive depuis le footer recruteur, même déconnecté. Voir `forcePortalParam` dans `AppContent()`.

**Fix bug navbar recruteur fantôme** : `estRecruteurConnecte` vérifiait seulement `portal === "recruteur"` sans vérifier qu'un rôle actif existe → si `loginPortal` restait à "recruteur" en localStorage (session expirée) alors que `userRole` était vide, la navbar recruteur s'affichait sur les pages candidat même déconnecté. Fix : `role === "ADMIN" || (!!role && portal === "recruteur")`.

**Fix bug déconnexion candidat → recruteur** : `authService.logout()` et l'intercepteur 401 (`axiosConfig.js`) décidaient de la redirection selon `estMembreEquipe` au lieu du portail de connexion réel (`loginPortal`) — un candidat membre d'une équipe recruteur atterrissait sur `/recruteurs/connexion` en se déconnectant du portail candidat. Fix : redirection basée sur `loginPortal` uniquement.

**Fix bug focus perdu — champ "Mots-clés" (JobsList)** : `FiltersPanel` était un composant défini à l'intérieur de `JobsList`, donc recréé à chaque frappe → React démontait/remontait tout le panneau de filtres, perdant le focus après chaque lettre. Fix : converti en variable JSX (`filtersPanel`) au lieu d'un composant-fonction.

**Token `tw.bgPrimarySolid` manquant** : utilisé à 11 endroits (Home, JobsList, Entreprises, JobDetail) mais jamais défini dans `theme.js` → boutons sans aucun style (texte brut). Ajouté dans `theme.js`.

**Nouveau champ `nombre_postes`** sur `OffreEmploi` (migration `0052`, défaut 1) — visible/éditable dans CreateJob, DashboardRecruteur (modale modifier), GestionOffre, JobDetail (tuile info), JobsList (badge si >1). Exposé dans `OffreEmploiSerializer` (`__all__`), `OffreEmploiCreateDTO`, `OffreEmploiPublicSerializer`, `OffreDashboardDTO`.

**Nouveau champ `adresse_complete`** sur `ProfilEntreprise` (migration `0051`, texte libre, indépendant de `wilaya_siege`) — configurable dans ParametresRecruteur → Mon entreprise, affiché en carte Google Maps embed sur **EntreprisePublic uniquement** (pas sur JobDetail : la localisation d'une offre doit toujours suivre le wilaya/commune de l'offre elle-même, pas le siège de l'entreprise — un siège à Alger avec une offre à Oran doit afficher Oran).

**Suppression d'offre recruteur** : nouvel endpoint `DELETE /api/jobs/dashboard/offres/<id>/supprimer/` (`SupprimerOffreAPIView`) — autorisé uniquement sur offres `EN_ATTENTE`/`REJETEE`, jamais sur une offre `APPROUVEE` (clôturer seulement), refuse si des candidatures existent déjà. Bouton corbeille + confirmation inline dans DashboardRecruteur, réservé aux rôles UTILISATEUR+.

**Sécurité** : CSP (`middleware.py`) n'avait pas de `frame-src` → bloquait silencieusement les iframes Google Maps en prod (`DEBUG=False`), fonctionnait par accident en dev (CSP Report-Only). Ajouté `frame-src https://www.google.com https://maps.google.com`. `ContactMessageAPIView` durci : validation format email + troncature de tous les champs à leur longueur max. `UpdateProfilEntrepriseAPIView` tronque désormais chaque champ à son `max_length` modèle avant `save()` (évitait un 500 Postgres sur une valeur trop longue).

---

## 🎨 MIGRATION THEME.JS — EN PAUSE (statut au 15/07/2026)

**Contexte** : chantier de centralisation de toutes les couleurs Tailwind (`text-*`, `bg-*`, `border-*`, `ring-*`, `placeholder-*`) vers des tokens `tw.*` dans `taftech_frontend/src/theme.js`, au lieu de classes écrites en dur dans chaque composant. Mis en pause car trop long (plusieurs passes d'agents ont échoué sur limite de quota Claude) — **ne pas relancer de migration automatique en masse sans demande explicite**.

`tailwind.config.js` redéfinit déjà : `indigo` = bleu logo TafTech (600 = `#204883`, exact logo), `teal` = vert TafTech (600 = `#3a8226`, 700 = `#307020` — nuance utilisée par la majorité des boutons/textes `bg-teal-700`/`text-teal-700`, calibrée AA ≥4.5:1), `slate` décalé d'une teinte (plus foncé). Couleurs échantillonnées au pixel sur `src/assets/logo-taftech.png` (bleu `#204883`, vert `#67af57` à l'origine, puis assombri en 600/700 pour respecter le contraste texte). Les classNames restent `text-indigo-600`/`bg-teal-700`/`text-slate-500` etc. dans le code — la migration ne change QUE l'endroit où la classe est écrite (dans `tw.*` au lieu d'en dur), pas la couleur elle-même.

**Important Tailwind v4** : `index.css` doit contenir `@config "../tailwind.config.js";` juste après `@import "tailwindcss";` — sans cette ligne, Tailwind v4 **ignore silencieusement** `tailwind.config.js` (mode CSS-first par défaut, JS config non chargé). C'est ce qui causait "aucun changement visible" lors des premiers tests de couleur — pas un problème de cache navigateur.

### ✅ Fichiers entièrement migrés (utilisent `tw.*`, plus aucune couleur en dur)
- **Components** : InfoBanner.jsx, Tooltip.jsx
- **Admin** : AdminAuditLogs, AdminBroadcast, AdminCandidatures, AdminComptes, AdminEntreprises, AdminLayout, AdminMetiers, AdminOffres
- **Auth** : ForgotPassword, Login, RegisterCandidat, RegisterRecruteur, ResetPassword
- **Candidat** : AlertesEmploi, BoiteReception, CandidatLayout, MesCandidatures, OffresSauvegardees, ProfilCandidat/index.jsx, Settings, SuggestionsCarriere
- **Public** : Entreprises, Home, JobDetail, JobsList, OffresParRegion, OffresParSecteur
- **Recruteur** : AccepterInvitation, CVTheque, CandidaturesSpontanees, CreateJob

### 🟡 Partiellement migrés (utilisent déjà `tw.*` par endroits, mais gardent encore des classes couleur en dur — à terminer)
- Components : Footer.jsx, FooterRecruteur.jsx, JobCard.jsx, Navbar.jsx, NavbarRecruteur.jsx
- Admin : AdminStatistiques, AdminSystemLogs, AdminUsers
- Candidat : ProfilCandidat/Modals.jsx
- Recruteur : DashboardRecruteur, EntreprisePublic, GestionOffre/DetailCandidature, GestionOffre/Modals, GestionOffre/index, MonEquipe, ParametresRecruteur, Portal/LandingRecruteur (Hero + bande stats migrés, sections Fonctionnalités/Comment ça marche/Avantages/FAQ pas encore), Portal/ForgotPasswordRecruteur, Portal/LoginRecruteur, Portal/PremiumPage, Portal/PremiumSuccessPage, Questionnaires, ReviewCandidature

### Tokens `tw.*` disponibles dans theme.js (déjà créés, à réutiliser en priorité — ne pas dupliquer)
`buttonPrimary/Secondary/Ghost/Accent`, `card/cardHover/cardSelected`, `input/inputSearch`, `badgePrimary/Accent/Success/Neutral/Error`, `pageTitle/pageSubtitle/sectionTitle/sectionLabel/bodyText/mutedText/metricNumber`, `pageContainer/pageBackground`, `textMuted/textMuted700/textStrong/textSubtle/textLight/textOnDark/iconMuted/iconStrong`, `surface*`, `border*`, `divideBase`, tokens primary (indigo)/teal séparés (`textPrimary`, `bgTeal`, etc.), `navLink*` (desktop/mobile, actif/inactif, indigo/teal), `dropdownItem*`, `dropdownPanel`, `iconButton`, `navbarShell`, `modalOverlay(Strong)`, `modalPanel`, `pageTitleGrand/Petit`, `bodyTextGrand/Petit` (respectent le système 2 niveaux de densité), `footer*` (variante indigo candidat + variante teal/slate recruteur), `jobCard*`, `tooltipPanel/Arrow`, tokens couleurs ponctuelles (blue/orange/violet/purple), `auditAction*`, `score High/Mid/Low`, tokens AUTH (`authInput(Teal)`, `authLabel`, `otpBoxInput`, `heroPanelDark`, etc.), tokens LANDING RECRUTEUR (`landingHeroBorder`, `buttonTealSolidLg`, `landingStatsPanelDark`, `landingFeatureCard`, `landingFaq*`, etc.).

### Pour reprendre la migration
1. Lire `src/theme.js` en entier pour voir les tokens déjà là.
2. Prendre UN fichier à la fois de la liste "partiellement migrés", remplacer les classes couleur restantes par des tokens existants ou en créer de nouveaux si besoin.
3. Lancer `npx vite build` après chaque fichier.
4. Ne pas lancer plusieurs agents en parallèle sur ce chantier — ça a saturé le quota Claude plusieurs fois de suite sans finir un dossier complet.

---

## 👤 PROFIL UTILISATEUR

**FILALI Zoheir** — Fondateur TafTech
- Git user: `Zoheirfll` — email: `zoheir.fll31@gmail.com`
- Master 2 ADSI — Université Oran 1
- Cadre administratif SOMIZ (paie 4000 employés)
- Développeur Full-Stack React + Django + PostgreSQL
- Mentalité "architecture avant code" — pense en systèmes
- Passionné IA locale, automatisation métier
- Localisation : Oran, Algérie
- Préfère les réponses **courtes et directes** (pas de listes exhaustives inutiles)
- Parle **français** — répondre toujours en français

---

## 🚨 RÈGLES DE COLLABORATION — IMPÉRATIVES

1. 🔴 **TOUJOURS afficher le code AVANT/APRÈS dans le chat avant chaque Edit** — montrer `old_string` et `new_string` en blocs de code dans la réponse. Ne jamais faire un Edit silencieux.
2. **Ne jamais merger vers `main` sans permission explicite** de l'utilisateur
3. **Ne jamais committer `.env`** — il est dans `.gitignore` et doit y rester
4. **Rester sur la feature branch courante** — ne pas changer de branche seul
5. **Ne pas prendre d'initiatives non demandées** — faire seulement ce qui est demandé
6. **Demander confirmation avant toute action destructive** (reset, force push, suppression fichiers)
6. **Ne jamais résoudre Cypress** sans demande explicite — les tests E2E sont déprioritisés
7. Toujours vérifier que le build Vite passe (`npx vite build`) avant de déclarer une tâche terminée
8. **Mettre à jour CLAUDE.md après chaque changement technique** — tout nouveau comportement, décision, ou correction doit être reflété ici avant le commit. CLAUDE.md est la source de vérité du projet pour les futures sessions.
9. **Audit sécurité obligatoire à chaque nouvelle fonctionnalité** — après toute création de page/route/endpoint, vérifier explicitement : les routes protégées côté frontend (`CandidatRoute`/`RecruteurRoute`/`AdminRoute`/`RoleGuard`), les permissions backend (`IsAuthenticated`, vérification de `role`, `get_entreprise_for_user()`/`get_membre_role()` si pertinent), et qu'aucune donnée sensible n'est exposée sans contrôle d'accès. Documenter le résultat dans CLAUDE.md.

---

## 🏗️ PROJET : TafTech

Plateforme de recrutement en ligne ciblant le marché algérien.

- **Backend**: Django 5.2 + DRF — `taftech_backend/`
- **Frontend**: React 18 + Vite + Tailwind CSS v4 — `taftech_frontend/`
- **DB**: PostgreSQL port **5433** (pas 5432 — conflit avec autre projet SOMIZ)
- **Auth**: JWT SimpleJWT (access 15 min / refresh 7 jours)
- **IA Matching**: Algorithme classique (difflib + synonymes) — PAS Groq
- **IA Analyse**: Groq API (llama-3.1-8b-instant) — à la demande uniquement
- **PDF**: ReportLab
- **Email**: Django SMTP Gmail
- **Tests Backend**: Django TestCase + APIClient — 282/282 ✅
- **Tests Frontend**: Vitest + @testing-library/react — 338/338 ✅
- **Tests E2E**: Cypress 13.17.0 — 7 fichiers tous stables ✅
- **GitHub**: https://github.com/Zoheirfll/Taftech

**Attention** : SOMIZ tourne aussi sur port 8000 — vérifier le bon backend.

---

## 🎨 DESIGN SYSTEM

### Tailwind CSS v4 — classes canoniques
- `bg-linear-to-br` (pas `bg-gradient-to-br`)
- `shrink-0` (pas `flex-shrink-0`)

### Couleurs
- Primaire : `indigo-600` (#4f46e5)
- Accent : `amber-500`
- Texte : `slate-900 / slate-700 / slate-500 / slate-400`
- Backgrounds : `white / slate-50 / slate-100`
- Bordures : `slate-200`
- Success : `emerald-600` — Danger : `red-600` — Warning : `amber-600`

### Composants standards
- **Inputs** : `px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`
- **Bouton primaire** : `bg-indigo-600 text-white rounded-lg hover:bg-indigo-700`
- **Bouton annuler** : `bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200`
- **Modales** : `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50`
- **Cards** : `bg-white border border-slate-200 rounded-xl`

### Système deux niveaux de densité visuelle

**"Grand" — pages publiques et profil** (`text-2xl/3xl font-extrabold`, `text-base`, `py-3`, `rounded-2xl`):
> JobDetail, MesCandidatures, ProfilCandidat, DashboardRecruteur, OffresParRegion, OffresParSecteur, EntreprisePublic, ParametresRecruteur, AlertesEmploi, OffresSauvegardees, Settings (candidat), BoiteReception, SuggestionsCarriere

**"Petit" — auth et outils denses** (`text-xl/2xl font-bold`, `text-sm`, `py-2.5`, `rounded-xl`):
> Login, RegisterCandidat, RegisterRecruteur, ForgotPassword, ResetPassword, ReviewCandidature, CandidaturesSpontanees, Questionnaires, CVTheque, GestionOffre

### Mobile Responsive
Pattern à appliquer sur tous les grids :
```
grid-cols-1 sm:grid-cols-2 md:grid-cols-N
```
Ne jamais commencer un grid directement à `grid-cols-2` sans breakpoint mobile.

### 🎨 Rebranding couleurs (tailwind.config.js) — 15/07/2026
`taftech_frontend/tailwind.config.js` redéfinit les couleurs Tailwind par défaut (les classNames dans le code restent inchangés, ex. `bg-indigo-600`, `text-teal-700`, `text-slate-500` — seule la valeur hexadécimale change) :
- `indigo` → bleu logo TafTech exact (`indigo-600` = `#204883`)
- `teal` → vert vif TafTech, AA-safe (`teal-600` = `#3a8226`, `teal-700` = `#307020` contraste 6:1)
- `slate` → décalé d'une teinte, plus foncé partout (`slate-400` = ancien `#64748b`, etc.) pour un texte plus lisible/moins délavé

### Textes plus foncés (15/07/2026)
Remplacement global dans tout `src/` :
- `text-slate-500` → `text-slate-700` (paragraphes/texte secondaire)
- `text-slate-400` → `text-slate-600` (icônes/labels très clairs), sans toucher aux `placeholder-slate-400` (comportement normal des champs de saisie)

### Navbars — fond opaque (15/07/2026)
`Navbar.jsx` et `NavbarRecruteur.jsx` : `bg-white/95 backdrop-blur-md` → `bg-white` (fond blanc plein, plus de transparence/flou au scroll).

### LandingRecruteur.jsx — badges retirés (15/07/2026)
Suppression du badge "🇩🇿 Plateforme de recrutement algérienne" (hero) et du badge "IA activée ✓" (carte stats) — jugés redondants par l'utilisateur.

---

## 🏗️ ARCHITECTURE BACKEND

### jobs/views/ (package — ancien views.py)
- `notifications.py` — NotificationListAPIView, MarkNotificationReadAPIView, PublicStatsAPIView, EntrepriseDetailAPIView
- `offres.py` — JobListAPIView, JobDetailAPIView, JobCreateAPIView, UpdateOffreRecruteurAPIView, CloturerOffreAPIView, ConstantsAPIView. Toutes les actions (create/update/cloturer) utilisent `get_entreprise_for_user()` + `get_membre_role()` — INVITE bloqué, UTILISATEUR/ADMIN/PROPRIETAIRE autorisés
- `profils.py` — ProfilCandidatAPIView, ExperienceAPIView, FormationAPIView, alertes, favoris, paramètres
- `candidatures.py` — PostulerAPIView, PostulerRapideAPIView, MesCandidaturesAPIView, UpdateCandidatureStatusAPIView, DeleteCandidatureAPIView, EvaluerCandidatureAPIView, Top5CandidatsAPIView. Actions (update/delete/evaluer) utilisent `get_entreprise_for_user()` + `get_membre_role()` — INVITE bloqué
- `recruteur.py` — DashboardRecruteurAPIView (retourne `palier_actif`, `palier_expiration`, `acces_equipe`/`acces_ia_recommandes`/`acces_ia_avancee`/`acces_coordonnees`, **bloc 403 `PREMIUM_EXPIRE` si membre non-propriétaire et aucun palier actif**), CVThequeView, questionnaires, spontanées, paramètres, **DemanderActivationPremiumAPIView**, **EnvoyerRecuPremiumAPIView**
- `admin.py` — AdminPagination + toutes vues admin + exports CSV + **AdminDemandesPremiumAPIView** (GET liste toutes avec `palier_actif`/`abonnement_expire_at`, PATCH activer avec `nb_mois`+`palier` → crée/prolonge un `AbonnementEntreprise`)
- `ia.py` — OffresRecommandeesAPIView, ParserCVAPIView, GenererOffreIAAPIView, AnalyseCarriereGroqAPIView, AnalyseGroqRecruteurAPIView. Helper `_appel_groq()` mutualisé. (`SuggestionsCarriereAPIView`, `MetierReferentielAPIView`/`MetierReferentielAdminAPIView` supprimées — session référentiel v2 du 18/09/2026, remplacées par le référentiel v2 `Metier`/`Appellation` et son panel admin dédié)
- `bulletin.py` — GenererBulletinPDFAPIView
- `equipe.py` — EquipeAPIView, InviterMembreAPIView, AccepterInvitationAPIView, **EquipeAuditLogAPIView** (`GET jobs/equipe/audit/` — 100 derniers logs, PROPRIETAIRE/ADMIN seulement). Helper `_log(user, entreprise, action, detail)` — appelé dans equipe, offres, candidatures, accounts/views.

### jobs/serializers/ (package)
- `questionnaires.py` — ReponseChoixSerializer, QuestionnaireSerializer, ReponseCandidatSerializer
- `offres.py` — EntrepriseSimpleSerializer, OffreEmploiSerializer, OffreEmploiCreateDTO, EntreprisePublicSerializer
- `profils.py` — ExperienceSerializer, FormationSerializer, ProfilCandidatDTO, AdminUserSerializer, ParametresNotificationsSerializer
- `candidatures.py` — CandidatInfoDTO (avec helper `_profil()`), PostulerDTO, CandidatureRecruteurDTO, MesCandidaturesDTO
- `divers.py` — OffreSauvegardeeSerializer, AlerteEmploiSerializer, NotificationSerializer, CandidatureSpontaneeSerializer, MetierReferentielSerializer
- `entreprise.py` — EntrepriseDashboardDetailSerializer
- `dashboard.py` — OffreDashboardDTO

### jobs/constants.py
Centralise toutes les constantes métier — importer depuis là, pas depuis models.py.
WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES, WILAYAS_LIST, WILAYAS_MAPPING, DIPLOMES_MAPPING — `SPECIALITES_MAPPING`/`SYNONYMES_SPECIALITE` supprimés (session ANEM 18/07/2026), la spécialité/métier passe désormais par le référentiel v2 (`Metier`/`GroupeMetier`/`Appellation`, voir section "Référentiel v2" — sessions 17-18/09/2026)

### accounts/
- `views.py` — rate limiting (`AnonRateThrottle`), hack Cypress isolé (`if settings.DEBUG`), expiry code reset (10 min), **bloc login membre si premium expiré** (code `PREMIUM_EXPIRE`), **`RenvoyerCodeVerificationAPIView`** POST `/api/accounts/renvoyer-code/`
- `models.py` — CustomUser + champ `code_verification_created_at`

### jobs/management/commands/
- `envoyer_alertes.py` — alertes emploi par email + notification. Option `--dry-run`.
- `relance_maj_cv.py` — relance candidats inactifs 60 jours. Option `--dry-run`.
- `archiver_offres_expirees.py` — clôture auto les offres dont `date_expiration < today`. Option `--dry-run`.
- `scraper_emploitic.py` — scrape titres de postes depuis emploitic.com via Playwright (subprocess pour éviter bug greenlet Windows). Importe dans MetierReferentiel. Options `--pages N` `--dry-run`. Playwright requis (`pip install playwright && python -m playwright install chromium`).
- `nettoyer_referentiel.py` — nettoie MetierReferentiel : supprime format ROME slash (masculin/féminin), reconstruit titre masculin propre, corrige H/F, noms de villes, tirets, déduplique. Option `--dry-run`.
- `corriger_secteurs_referentiel.py` — mappe codes ROME non standard (SERVICE_PUBLIC, AGRICULTURE, COMMUNICATION, SPECTACLE, ARTS) vers nos SECTEURS_CHOICES, devine secteur pour entrées AUTRE via mots-clés. Option `--dry-run`.

---

## 🏗️ ARCHITECTURE FRONTEND

### Services/ — pattern façade
`jobsService.js` est une façade qui réexporte tout. Les composants importent toujours `{ jobsService }`.
Sous-services : `candidatService.js`, `adminService.js`, `recruteurService.js`, `iaService.js`

### utils/mediaUrl.js — URLs médias centralisées
```js
import { mediaUrl } from "../utils/mediaUrl";
// En dev (VITE_MEDIA_BASE_URL vide) → URLs relatives → proxy Vite gère /media/
// En prod → VITE_MEDIA_BASE_URL=https://taftech.dz → URLs absolues
```
Ne plus jamais hardcoder `http://127.0.0.1:8000` dans les composants — utiliser `mediaUrl(path)`.

### utils/errorReporter.js — Télémétrie frontend
```js
import { reportError } from "../utils/errorReporter";
// Dans chaque catch block : reportError("CODE_ERREUR", error)
```
Tous les catch blocks dans tous les fichiers frontend ont `reportError()`.

### Réponses API paginées Django
```js
// Toujours gérer les deux formats
return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
```

### details_matching — deux structures possibles
```js
// Toujours utiliser :
const scores = DM.scores || DM;
```

### Structure Pages/
```
Pages/
├── Admin/
├── Candidat/
│   ├── ProfilCandidat/ (index.jsx + useProfilCandidat.js + Modals.jsx)
│   ├── MesCandidatures.jsx, BoiteReception.jsx, OffresSauvegardees.jsx
│   ├── AlertesEmploi.jsx, SuggestionsCarriere.jsx, Settings.jsx
├── Recruteur/
│   ├── GestionOffre/ (index.jsx + useGestionOffre.js + DetailCandidature.jsx + Modals.jsx)
│   ├── DashboardRecruteur.jsx, CreateJob.jsx, CVTheque.jsx
│   ├── CandidaturesSpontanees.jsx, ParametresRecruteur.jsx
│   ├── Questionnaires.jsx, ReviewCandidature.jsx, EntreprisePublic.jsx
├── Public/
│   ├── Home.jsx, JobsList.jsx, JobDetail.jsx
│   ├── OffresParRegion.jsx, OffresParSecteur.jsx
└── Auth/
    ├── Login.jsx, ForgotPassword.jsx, ResetPassword.jsx
    ├── RegisterCandidat.jsx, RegisterRecruteur.jsx
```

---

## ✅ FEATURES COMPLÈTES

### 🧩 CMS Admin (contenu du site géré sans code) — chantier terminé session 20/08/2026
Demande initiale de l'employeur : gérer sans intervention technique prix, abonnements, avantages, FAQ, secteurs/métiers/compétences, articles, bannières, pages du site, et contrôle IA. Secteurs/métiers existaient déjà (nomenclature ANEM, `AdminMetiers.jsx`) — 7 sous-projets ajoutés, chacun brainstormé et validé séparément avant implémentation :

| Sous-projet | Panel admin | Modèles clés | Consommateurs publics |
|---|---|---|---|
| ~~Prix/Abonnements/Avantages~~ | ~~`/admin-taftech/premium-config`~~ | ~~`PremiumPlan`, `PremiumAvantage`~~ | **Supprimé le 27/08/2026** — remplacé par `/admin-taftech/paliers` (`AdminPaliers.jsx`, modèle `Palier`) et `/recruteurs/abonnements` (`AbonnementsPage.jsx`), voir session dédiée |
| FAQ | `/admin-taftech/faq` | `FaqItem` (catégorie GENERAL/RECRUTEUR/PALIERS) | `ContactezNous.jsx`, `LandingRecruteur.jsx`, `AbonnementsPage.jsx` |
| Compétences | `/admin-taftech/competences` | `CompetenceReferentiel` | Autocomplete `ProfilCandidat/index.jsx` (suggestions, champ reste libre) |
| Blog/Articles | `/admin-taftech/articles` | `Article`, `ArticleCategorie` | `Blog.jsx` (`/blog`), `ArticleDetail.jsx` (`/blog/:slug`) |
| Bannières | `/admin-taftech/bannieres` | `SiteAnnonce` (bandeau global, 1 active), `BanniereAccueil` (carrousel) | `SiteAnnonceBar.jsx` (toutes pages), `BanniereCarousel.jsx` (Home) |
| Pages du site | `/admin-taftech/pages` | `PageStatique` | `PageStatiqueGenerique.jsx` (`/cgu`, `/confidentialite`, `/pages/:slug`), bloc éditorial dans `QuiSommesNous.jsx` |
| Configuration IA | `/admin-taftech/ia-config` | `AIConfig` (singleton) | Lu par `jobs/ai_engine.py::call_ai()` (Groq/Ollama réel, pas juste un champ de config) — aucune page publique |

**Décisions transverses qui traversent tout le chantier** :
- **Contenu riche** (Blog + Pages du site) : éditeur TipTap (`Components/RichTextEditor.jsx`, réutilisé par les deux), sortie HTML sanitizée côté backend (`bleach`) à chaque `save()` — défense en profondeur même si seul le rôle ADMIN y écrit aujourd'hui.
- **Cache** : chaque endpoint public utilise `django.core.cache` (timeout 5 min à 1h selon la volatilité), invalidé explicitement à chaque écriture admin — pattern déjà établi par `jobs_constants` avant ce chantier, reconduit partout.
- **Sécurité** : tous les endpoints admin `IsAdminUser` + check `request.user.role == 'ADMIN'` ; toutes les lectures publiques passent par `PublicReadThrottle` (scope créé en tout début de cette session, cf. section Sécurité) ; aucun brouillon/contenu inactif jamais exposé côté lecture publique (filtré côté serveur, pas côté client).
- **"Intelligence artificielle" mal compris au départ** : l'employeur ne voulait pas de génération de contenu IA mais un contrôle des paramètres (modèle, kill-switch par fonctionnalité) — clarifié par question ciblée avant de coder, a évité de construire la mauvaise fonctionnalité.
- **Piège récurrent (3 fois cette session)** : ajouter un nouvel appel `jobsService.*` dans un composant déjà couvert par un test cassait ce test silencieusement (mock incomplet) — `PremiumPage.test.jsx`, `Home.test.jsx` corrigés en cours de route. Réflexe à garder : toute nouvelle dépendance `jobsService` dans un fichier testé doit être ajoutée au mock du test correspondant.

**Historique détaillé** (design, alternatives écartées, bugs trouvés en testant) : voir les 7 sections "SESSION 20/08/2026" juste en dessous, une par sous-projet, dans l'ordre où ils ont été construits.

### 🔐 Authentification
- Inscription candidat/recruteur, login JWT, déconnexion, mot de passe oublié, vérification email
- Rôles : CANDIDAT / RECRUTEUR / ADMIN
- Changer MDP disponible dans Settings (candidat) ET ParametresRecruteur (onglet Mon profil) — adapté compte Google
- Verrouillage compte (5 échecs → verrou 15 min)
- `GuestRoute` : redirige les utilisateurs déjà connectés hors des pages login/inscription (ADMIN → /admin-taftech, RECRUTEUR/membre → /dashboard, CANDIDAT → /profil)

### 💼 Offres & Candidatures
- CRUD offres recruteur, modération admin (APPROUVEE / EN_ATTENTE / REJETEE)
- Candidature TafTech (profil + snapshot + score IA) et candidature rapide (sans compte)
- Statuts : RECUE / EN_COURS / PRESELECTION / ENTRETIEN / RETENU / REFUSE — chronologie visuelle 6 étapes (`Components/CandidatureTimeline.jsx`) côté candidat et recruteur
- Entretien programmé + email auto, email refus configurable
- Évaluation post-entretien (4 critères /5 = note /20)
- Bulletin PDF (logo + score si >=60% + évaluation + signatures)
- Questionnaires (CRUD + types COURT/LONG/NUMERIQUE/CHOIX_UNIQUE/CHOIX_MULTIPLE + questions disqualifiantes)

### 👤 Profil Candidat
- Titre (autocomplete ROME), photo, CV PDF, bio, LinkedIn, GitHub
- Compétences, langues, expériences, formations, préférences
- Service militaire, permis, passeport, niveau expérience
- Score complétion, parser CV IA (extrait depuis PDF), snapshot à la postulation

### 🏢 Profil Entreprise
- Nom + registre commerce verrouillés après validation, logo, description, taille
- Page publique vitrine, CVThèque avec filtres + favoris
- Email refus auto avec variables ({prenom}, {titre_offre}, {nom_entreprise})

### 🤖 Matching IA
> ⚠️ Section réécrite le 18/09/2026 (cutover référentiel v2) — l'ancien référentiel `Secteur`/`Domaine`/`SousDomaine`/`MetierReferentiel` (nomenclature ANEM) décrit ici jusqu'à la session ANEM du 18/07/2026 a été **entièrement supprimé**. Voir les sessions "SESSION 17/09/2026" et "SESSION 18/09/2026 — Référentiel v2 : cutover complet" en tête de fichier pour l'historique complet de la migration.
- Score 0-100% : Spécialité/Métier (0-25) + Diplôme (0-20) + Expérience (0-20) + Région (0-20) + Compétences (0-15)
- Radar SVG 5 critères (candidat + recruteur), comparateur 2 candidats
- Groq séparé du scoring — classique uniquement
- **Matching au niveau `Metier`** (référentiel v2 client, 1038 métiers) : `matcher.py::metiers_compatibles()` compare `OffreEmploi.metier`/`ProfilCandidat.metier`/`ExperienceCandidat.metier` (FK, résolus vers leur `metier_canonique`) — exact 1.0, même `groupe_principal` 0.85, fuzzy `difflib` ≥0.72 en filet de sécurité. **Pas de bonus "même secteur parent"** (contrairement à l'ancien système par préfixe de code Domaine) — un métier hors `groupe_principal` du candidat obtient 0, jamais un score dégradé.
- **Diplôme** : si l'offre définit des `OffreDiplomeAccepte` (couples `DiplomeSpecialite` explicites), le score se base dessus (couple exact 20/20, diplôme seul 12/20, aucune formation obtenue = donnée manquante 6/20) ; sinon repli intégral sur l'ancienne hiérarchie de niveau (`profil.diplome`/`offre.diplome`).
- **Indicateur de complétude** : `calculer_score_matching()` expose `completude` (pondéré par les vrais poids des critères, ex. spécialité+diplôme manquants = 1-0.45=0.55, jamais un simple `1 - nb_manquants/5`) et `criteres_manquants` — distingue "donnée manquante" d'"incompatible" (exigence client explicite, référentiel v2).
- **Référentiel v2 (`Metier`/`GroupeMetier`/`Appellation`)** : 1038 métiers, 7428 appellations de poste précises, hiérarchie `GroupeMetier` (secteur_source → domaine_source) reconstruite depuis le fichier client. Import idempotent via `python manage.py import_referentiel_v2` (upsert par `code`).
- **Autocomplete métier** (`Components/MetierAutocomplete.jsx`) : recherche sur `Appellation.cle_recherche`, résout automatiquement vers le `metier_canonique` (redirections) tout en gardant le libellé précis de l'appellation choisie — utilisé partout où un métier candidat/offre/expérience est saisi.
- **Classification d'expérience par agent Groq dédié** (`jobs/domaine_agent.py::classifier_metiers_experiences`) : RAG léger — cherche des appellations réelles ressemblant au poste (`Appellation.cle_recherche`) puis fait choisir l'IA **uniquement parmi ces candidats montrés**, jamais un code deviné dans les 1038 métiers en une fois (liste trop grande pour un prompt).

### 🔍 Recherche & Dashboard
- Multicritères avec debounce 400ms, pagination, offres recommandées IA
- KPIs dashboard recruteur, Top 5 shortlist IA, archives, correction offre rejetée

### 🔴 Dashboard Erreurs Système (Admin)
- Page `/admin-taftech/erreurs-systeme` → `AdminSystemLogs.jsx`
- API `GET /api/accounts/admin/system-logs/?page=N` — pagination 50/page
- API `DELETE /api/accounts/admin/system-logs/` — tout effacer
- Liste : date, message, URL, user + modal détail avec stack trace
- Lien dans sidebar AdminLayout avec icône AlertTriangle

### 📬 Notifications, Alertes, Admin
- Cloche navbar avec badge, boîte de réception, alertes emploi par email
- Panel admin : stats, journal d'audit (`AuditLog`), broadcast, données marché
- Référentiel ROME 11 090 métiers, suggestions carrière Groq

### 🔐 Vérification Email — Flux complet
- `RenvoyerCodeVerificationAPIView` : POST `/api/accounts/renvoyer-code/` — génère nouveau code, reset timer, envoie email
- `sessionStorage` clé `taftech_pending_verification` (candidat) / `taftech_pending_verification_recruteur` (recruteur) — persiste entre reloads, effacée après vérification réussie
- Login détecte `COMPTE_NON_VERIFIE` → redirige vers `/register` ou `/recruteurs/inscription` avec email pré-rempli
- `CookieTokenObtainView` propagation dict errors : `isinstance(detail, dict)` → retour direct sans stringify
- Bouton "Renvoyer le code" dans step 2 inscription candidat (indigo) et recruteur (teal)

### 🤖 IA Génération Offre (CreateJob)
- `GenererOffreIAAPIView` : POST `/api/jobs/ia/generer-offre/` — Premium uniquement, appel Groq direct avec `response_format: {type: 'json_object'}`
- Retourne `{description, missions, profil_recherche}` — pré-remplit les champs texte
- Utilise `get_entreprise_for_user()` (pas `request.user.profilentreprise`) pour vérifier premium membres équipe
- Frontend : bannière amber, bouton désactivé si titre/spécialité manquants, badge "Premium uniquement" si non-premium
- `_appel_groq()` NE PAS utiliser pour ce endpoint — strip les `*` qui corrompt le JSON → appel direct Groq

### 📝 Candidatures Spontanées
- Envoi sans compte, anti-doublon, vue recruteur filtrable, marquer lue / supprimer

### 🔑 Compte Google — Mot de passe recruteur
- `CustomUser.est_compte_google` : BooleanField (migration 0008) — marqué `True` à la création via `GoogleSocialAuthView`
- `MeAPIView` : `GET /api/accounts/me/` — retourne `est_compte_google`
- `ChangerMotDePasseAPIView` : `POST /api/accounts/changer-mot-de-passe/` — sans `ancien_mdp` si `est_compte_google=True`
- `Settings.jsx` candidat : formulaire adapté (Définir vs Modifier selon `est_compte_google`)
- `InviterMembreAPIView` : si compte Google → envoie lien invitation (pas ajout direct) pour que l'invité définisse un mot de passe
- `AccepterInvitationAPIView` GET : retourne `sans_mot_de_passe` (basé sur `est_compte_google`)
- `AccepterInvitationAPIView` POST : définit le mot de passe sans changer le rôle (garde accès espace candidat)
- Un membre d'équipe avec rôle `CANDIDAT` peut se connecter sur le portail recruteur grâce au check `est_membre_equipe` (serializer login ligne 119)

### 👥 Gestion d'Équipe Recruteur
- Rôles membres : PROPRIETAIRE / ADMIN / UTILISATEUR / INVITE
- `authService.peutFaire(minRole)` : hiérarchie `["INVITE","UTILISATEUR","ADMIN","PROPRIETAIRE"]`
- INVITE : accès lecture seule (candidatures, dashboard stats) — boutons d'action masqués (UI level, pas route level)
- ADMIN uniquement pour onglet "Mon entreprise" dans ParametresRecruteur
- `EquipeActionLog` : journal d'activité complet — log automatique sur CONNEXION, CREER_OFFRE, MODIFIER_OFFRE, CLOTURER_OFFRE, STATUT_CANDIDATURE, EVALUER_CANDIDATURE, INVITER_MEMBRE, RETIRER_MEMBRE, CHANGER_ROLE
- `EquipeAuditLogAPIView` : endpoint `GET /api/equipe/audit/` — visible PROPRIETAIRE/ADMIN, 100 derniers logs
- Journal accordéon lazy-load dans MonEquipe.jsx (ne charge qu'à l'ouverture)
- **Premium expiré → membres bloqués** : blocage au login (403 PREMIUM_EXPIRE) + blocage dashboard API ; PROPRIETAIRE toujours autorisé
- Onglet "Mon équipe" toujours visible pour PROPRIETAIRE même si premium expiré (pour gérer/supprimer membres)

### 🔗 Slug Entreprise
- `ProfilEntreprise.slug` — auto-généré depuis `nom_entreprise` via `slugify()` à la création (unicité garantie avec suffixe `-N` si collision)
- Migration 0044 : data migration peuple les slugs existants puis ajoute contrainte UNIQUE via `RunSQL` (pas `AlterField` — évite double création index `_like` PostgreSQL)
- URLs publiques : `/api/jobs/entreprises/<slug:slug>/` et `/api/jobs/entreprises/<slug:slug>/candidature-spontanee/`
- Frontend route : `/entreprise/:slug` (plus `:id`)
- QR code dans ParametresRecruteur encode `window.location.origin + /entreprise/{slug}`
- `slug` exposé dans `EntrepriseSimpleSerializer`, `EntreprisePublicSerializer`, `EntrepriseDashboardDetailSerializer`

### 🎨 Navbar Redesign
- Backdrop blur `bg-white/95 backdrop-blur-md` sur les deux navbars
- Liens nav : pill hover coloré (`hover:bg-indigo-50 rounded-lg` candidat, `hover:bg-teal-50` recruteur)
- Icônes sur tous les liens de navigation (lucide-react)
- Texte `text-slate-900` (noir) au lieu de `text-slate-600` (gris) sur les navbars
- Logo `h-16` dans conteneur `h-15` (légèrement débordant — effet voulu)
- ~80 occurrences de `text-slate-400/500` remplacées par `text-slate-600/700` sur 21 fichiers frontend

### 🧭 Onboarding Contextuel
- Composant `InfoBanner` (`src/Components/InfoBanner.jsx`) — bannière dismissable, localStorage `banner_${storageKey}`, variants indigo/teal/amber/slate
- Composant `Tooltip` + `TooltipIcon` (`src/Components/Tooltip.jsx`) — hover tooltip, prop `position` top/bottom/left/right
- Pages avec InfoBanner : ProfilCandidat, MesCandidatures, AlertesEmploi, BoiteReception, SuggestionsCarriere, Settings (candidat), DashboardRecruteur, CreateJob, CVThèque, CandidaturesSpontanees, Questionnaires, ParametresRecruteur
- Pages avec TooltipIcon : ProfilCandidat (complétion %), MesCandidatures (score), GestionOffre (tri score), DetailCandidature (note /20), JobDetail (score matching)
- Empty states améliorés : MesCandidatures (CTA vers /offres), CandidaturesSpontanees, JobsList

### 🤖 Matching IA CVthèque
- Dropdown "Comparer avec une offre" dans CVThèque — filtre sur offres APPROUVEE + active + non clôturée
- Paramètre `offre_id` dans `CVThequeView.get()` → calcule `calculer_score_matching` pour chaque candidat → trie par score desc
- Retourne `score_offre` dans chaque résultat (indexé par `user_id`, pas `pk`)
- Badge coloré sur chaque card : vert ≥70%, orange ≥40%, gris <40%
- Bandeau teal "Classement par compatibilité activé" avec bouton ✕
- `searchCVtheque` dans `recruteurService.js` passe `offre_id` dans les queryParams

### 📱 QR Code Entreprise
- Lib : `qrcode.react` (QRCodeCanvas)
- Visible dans **Paramètres → Mon entreprise** uniquement si entreprise approuvée
- Encode : `window.location.origin + /entreprise/{slug}` (dynamique, pas hardcodé)
- Bouton téléchargement PNG : `canvas.toDataURL("image/png")`

### ⏱ Expiration Automatique des Offres
- Champ `date_expiration` (DateField nullable) sur `OffreEmploi` — migration 0045
- `jours_restants` calculé dans `OffreEmploiSerializer` (SerializerMethodField)
- `OffreDashboardDTO` inclut `date_expiration` — visible dashboard recruteur, GestionOffre, admin
- `OffreEmploiCreateDTO` inclut `date_expiration`
- Command `archiver_offres_expirees` — clôture auto offres expirées, option `--dry-run`
- Crontab prod : `30 0 * * * python manage.py archiver_offres_expirees`
- CreateJob : boutons 30/60/90 jours + sélecteur date custom
- Affichage coloré : rouge ≤7j, orange ≤30j, teal ≤60j, vert >60j
- GestionOffre : sélecteur date inline pour modifier expiration (autorisé même si APPROUVEE)
- `UpdateOffreRecruteurAPIView` : si seul `date_expiration` dans le PATCH → pas de remise EN_ATTENTE

### ⭐ Système Premium (US11/12) — ⚠️ OBSOLÈTE, voir section "SESSION 27/08/2026 (soir)" en tête de fichier
> Ce système binaire (`est_premium`/`premium_expire_at`/`PremiumPlan`) a été **entièrement supprimé** le 27/08/2026 — remplacé par `Palier`/`AbonnementEntreprise` (voir Phase 2a/2b, sessions 22-23/08/2026, et le nettoyage du 27/08/2026). Section conservée telle quelle comme journal historique — ne pas s'y fier pour l'état actuel du code.
- `DemandeActivationPremium` : traçabilité complète des demandes (moyen, nb_mois, est_traitee, date_traitement) — **toujours en place**, mais active désormais un `AbonnementEntreprise` (avec palier choisi par l'admin), plus `est_premium`/`premium_expire_at`.
- ~~`ProfilEntreprise.est_premium_actif` : property qui vérifie `est_premium` + `premium_expire_at > now()`~~ — supprimé, remplacé par `jobs/paliers_utils.py::get_palier_actif()`.
- ~~`premium_expire_at` + `premium_nb_mois` sur `ProfilEntreprise`~~ — supprimé.
- Flow paiement recruteur : choix durée (1/3/6/12 mois) + CIB/EDAHABIA + envoi reçu email
- Prix avec remises : 6 mois −8% (11 040 DA), 12 mois −17% (19 920 DA)
- Page statut `/recruteurs/premium` : actif → dates activation/expiration/jours restants + section "envoyer reçu"
- Renouvellement/prolongation depuis page statut (étend l'expiry existante)
- Badge ⭐ Premium dans NavbarRecruteur (subtitle) + DashboardRecruteur (avec date expiry)
- Lien "Mon Premium ⭐" / "Passer Premium 🔒" dans dropdown navbar
- CVThèque bloquée intégralement pour non-premium (overlay)
- Analyse IA + Résumé IA bloqués dans GestionOffre pour non-premium
- Admin panel : onglet "Demandes Premium" dans `AdminEntreprises`, activation avec sélecteur mois
- Logout role-aware : recruteur → `/recruteurs/connexion`, candidat → `/login`
- 401 interceptor dans `axiosConfig.js` aussi role-aware

---

## 🏗️ MODÈLES DJANGO

### accounts/
- `CustomUser` (email, telephone, role, code_verification, code_verification_created_at, failed_login_attempts, locked_until, date_naissance, **est_compte_google** BooleanField default=False)
- `SystemErrorLog` (user, message, stack_trace, url, timestamp)

### jobs/
- `ProfilCandidat` (titre, cv_pdf, photo, bio, linkedin, github, wilaya, commune, diplome, competences, langues, mobilite, situation_actuelle, salaire_souhaite, service_militaire, permis, passeport, niveau_experience, notif_mise_a_jour, **metier**/**metier_souhaite** FK `Metier` nullable — référentiel v2, session 18/09/2026 ; `specialite`/`secteur_souhaite` texte libre supprimés)
- `ExperienceCandidat` (**metier** FK `Metier` nullable — référentiel v2, remplace l'ancien `secteur` CharField supprimé), `FormationCandidat` (**diplome_ref**/**specialite_ref** FK référentiel v2, `statut` OBTENU/EN_COURS/INTERROMPU, en complément du champ texte `diplome` d'origine)
- `ProfilEntreprise` (nom_entreprise, **slug** auto-généré depuis nom_entreprise, registre_commerce, secteur, wilaya, commune, description, taille, logo, est_approuvee, email_refus_auto, message_refus_auto, **est_premium**, **premium_expire_at**, property `est_premium_actif`)
- `OffreEmploi` (entreprise, titre, wilaya, commune, diplome, experience_requise, type_contrat, description, missions, profil_recherche, salaire_propose, **date_expiration** (DateField nullable), est_active, est_cloturee, statut_moderation, motif_rejet, questionnaire, **metier** FK `Metier` nullable — référentiel v2, remplace `specialite` texte libre supprimé, **diplomes_acceptes** M2M via `OffreDiplomeAccepte`)
- `Candidature` (offre, candidat, statut, score_matching, details_matching, profil_snapshot, est_rapide, date_entretien, note_technique/communication/motivation/experience, note_globale, commentaire_evaluation)
- `CandidatureSpontanee`, `Notification`, `MetierReferentiel`, `Questionnaire`, `QuestionQuestionnaire`, `ReponseChoix`, `ReponseCandidat`, `ProfilCandidatFavori`
- **`DemandeActivationPremium`** (entreprise FK, moyen_paiement, nb_mois, est_traitee, date_demande, date_traitement) — migration 0040/0041
- **`EquipeActionLog`** (entreprise FK, membre FK User nullable, action CharField, detail, date auto) — migration 0043. Actions : CONNEXION, CREER_OFFRE, MODIFIER_OFFRE, CLOTURER_OFFRE, STATUT_CANDIDATURE, EVALUER_CANDIDATURE, INVITER_MEMBRE, RETIRER_MEMBRE, CHANGER_ROLE, AUTRE

---

## 🔒 SÉCURITÉ

| Mesure | Statut | Détail |
|--------|--------|--------|
| `.env` dans `.gitignore` | ✅ | SECRET_KEY, DB, EMAIL, GROQ — plus rien hardcodé |
| JWT expiry | ✅ | Access 15 min / Refresh 7 jours + blacklist |
| Rate limiting auth | ✅ | `AnonRateThrottle` sur tous les endpoints sensibles |
| Expiry code reset | ✅ | 10 min — `code_verification_created_at` vérifié |
| Hack Cypress isolé | ✅ | `if settings.DEBUG` — inactif en prod |
| Verrouillage compte | ✅ | 5 échecs → verrou 15 min |
| Validation MIME fichiers | ✅ | Magic bytes PDF/DOCX/JPEG/PNG — `jobs/validators.py` |
| Limite taille fichiers | ✅ | CV/lettre 5 Mo, logo/photo 2 Mo |
| CSP headers | ✅ | `SecurityHeadersMiddleware` |
| HTTPS/HSTS en prod | ✅ | Activé si `DEBUG=False` |
| Webhook Chargily palier | ✅ | Flux `nb_mois` (legacy) supprimé le 27/08/2026 — seul le flux `palier_nom` (`ChargilyCheckoutPalierAPIView`) subsiste, capé à un `Palier.actif` existant |
| CVTheque API-level | ✅ | 403 si aucun palier actif (`get_palier_actif() is None`) — pas seulement masquage UI |
| ErrorReport throttle | ✅ | `CypressAwareThrottle` — évite flood DB |
| Logging backend | ✅ | `print()` remplacés par `logger = logging.getLogger(__name__)` |
| reportError frontend | ✅ | Tous les catch blocks ont `reportError()` |
| Throttling par scope | ✅ | `public_read` 300/h + `write_action` 30/h (`jobs/throttles.py`), en plus de `auth`/`groq`/générique — session 20/08/2026 |
| Garde-fou secrets prod | ✅ | Démarrage refusé (`ImproperlyConfigured`) si `DEBUG=False` et `SECRET_KEY`/`EMAIL_HOST_*`/`GROQ_API_KEY`/`CHARGILY_*` manquants — session 20/08/2026 |
| Emails HTML — injection | ✅ | Vérifié : Django autoescape protège `message_refus_auto` dans `emails/refus.html`, testé avec payload `<script>` réel — session 20/08/2026 |
| Dépendances (CVE) | ✅ | `pip-audit` propre (Django/cryptography/sqlparse patchés) — session 20/08/2026. `npm audit` : 10 CVE restantes, toutes `devDependencies` (Cypress), zéro risque prod |
| Scan CVE automatisé | ✅ | Dependabot (`.github/dependabot.yml`, pip + npm, hebdo) — session 20/08/2026 |
| Anti-abus par email | ✅ | `EmailRateThrottle` (10/jour/email) en plus du throttle IP sur candidature rapide/spontanée/contact — session 20/08/2026 |
| Throttling uploads/IA | ✅ | `FileUploadThrottle` (20/h, uploads candidat/recruteur), `CVParserThrottle` (10/h, dédié parser CV — aucun throttle avant), `AdminFileUploadThrottle` (100/h, CMS admin), documents privés candidat plafonnés à 1/type + 20 total — session 03/09/2026, détail `SECURITY.md` §17 |

**Ne jamais committer `.env`.** Regénérer `SECRET_KEY` avant la prod.

---

## ⚠️ POINTS D'ATTENTION CRITIQUES

- PostgreSQL sur port **5433** (pas 5432)
- SOMIZ tourne aussi sur port 8000 — vérifier le bon backend
- `details_matching` a 2 structures selon ancienneté candidature :
  - Ancienne : `{region, diplome...}` directement
  - Nouvelle : `{scores:{...}, highlights:{...}, explications:{...}}`
  - → toujours utiliser `DM.scores || DM`
- `CandidatInfoDTO` et `profil_snapshot` incluent bio/linkedin/github
- `difflib` — stdlib Python, pas d'installation requise
- `ajuster_score_avec_groq` — supprimé, ne plus utiliser

---

## 🔧 DÉCISIONS TECHNIQUES

| Sujet | Décision | Raison |
|-------|----------|--------|
| Score matching dashboard candidat | Cache Django 10 min (`jobs/matching_cache.py`), jamais utilisé pour le score figé à la candidature | Dashboard scorait 2x tout le catalogue d'offres à chaque chargement (~1000 calculs) — le matching à la vraie candidature doit rester exact/live, pas de cache dessus |
| Parser CV — dates expériences CV 2 colonnes | Consigne courte ajoutée à `PROMPT_CV_COMPLET` (pas de réécriture d'extraction PDF) | L'extraction texte était déjà correcte, le bug était dans le prompt Groq ; `AIConfig.parser_cv_prompt` en base doit être resynchronisé manuellement pour que toute future modif de la constante prenne effet |
| Pré-chauffe scores matching | Commande cron `precalculer_scores_matching`, limitée aux candidats connectés < 60j | Évite de calculer pour des comptes inactifs, même seuil que `relance_maj_cv` |
| Matching | Algorithme classique (difflib + synonymes) | Groq trop lent/coûteux à chaque postulation |
| Groq | Uniquement à la demande | Analyse recruteur + suggestions carrière |
| Snapshot | Figé à la postulation | Historique fidèle même si profil change |
| Suggestions | Seed = hash(user_id + spécialité) | Stable mais change si profil change |
| Bulletin PDF | Score si >= 60% seulement | Pas de mauvais score sur document officiel |
| PostgreSQL | Port 5433 | Conflit avec port 5432 (SOMIZ) |
| views/ | Package avec __init__ façade | urls.py inchangé, découpage lisible |
| serializers/ | Package avec __init__ façade | Imports inchangés dans les vues |
| constants.py | Fichier centralisé | Plus de duplication entre models/matcher/cv_parser |
| jobsService.js | Façade + 4 sous-services | Zéro changement dans les composants |
| Premium paiement | Manuel CIB/EDAHABIA + email, **ou** Chargily Pay | Activation manuelle crée/prolonge un `AbonnementEntreprise(palier=<choisi par l'admin>)` depuis le 27/08/2026 (plus de prix `PremiumPlan` calculé — le tarif catalogue est désormais uniquement celui du `Palier`) |
| Premium durée/prix | `Palier.prix_mensuel_da`/`prix_annuel_da` (STARTER/PRO/BUSINESS/ENTERPRISE) | Le système `nb_mois × 2000 DA` (`PremiumPlan`) a été supprimé le 27/08/2026, voir session dédiée |
| Abonnement renouvellement | Étend `AbonnementEntreprise.date_expiration` depuis l'expiry actuelle si encore active | Pas de perte de jours restants |
| Swagger DEFAULT_SCHEMA_CLASS | Injecté dans `REST_FRAMEWORK` dict **après** sa définition (bloc try/except déplacé sous REST_FRAMEWORK) | `NameError` si injecté avant — settings.py est exécuté de haut en bas |
| Slug migration PostgreSQL | Utiliser `AddField` (sans unique) + `RunPython` (populate) + `RunSQL ALTER TABLE ADD CONSTRAINT` | `AlterField` avec `unique=True` recrée l'index `_like` déjà créé par `AddField` → `DuplicateTable` |
| QR code URL | `window.location.origin` (dynamique) | Pas hardcodé — s'adapte dev/prod automatiquement |
| Navbar texte | `text-slate-900` sur les liens de navigation | Plus lisible, contraste WCAG |
| Vérification email persistence | sessionStorage (pas localStorage) — localStorage causait bug déconnexion admin | Clé auto-effacée à la fermeture navigateur, login redirect couvre le cas "revient le lendemain" |
| GenererOffreIA Groq | Appel direct sans `_appel_groq()` | `_appel_groq` strip les `**`/`*` ce qui corrompt le JSON retourné |
| Notification offre admin | Champ `destinataire` (pas `user`) + `titre` obligatoire | Modèle Notification a `destinataire` FK et titre requis |
| date_expiration PATCH APPROUVEE | Autorisé si seul ce champ dans payload | Ne remet pas l'offre EN_ATTENTE pour un simple changement de date |
| photo_profil snapshot | `.url` (pas `str()`) | `str()` retourne `photos/xxx.jpg` sans `/media/` — `.url` retourne le chemin complet |
| ExperienceCandidat.secteur | CharField choices nullable | `normalizeExp()` convertit `""` → `null` avant PUT — Django rejette string vide sur choices field |
| Matcher expérience pertinente | Vérifie `isinstance(secteur_exp, str)` avant usage | Mock retourne Mock object au lieu de None si pas vérifié |
| Parser CV — mode Remplacer/Ajouter | Modal parser CV propose un choix radio `parserMode` ("remplacer" par défaut / "ajouter"). Remplacer : écrase champs simples/photo/compétences/langues + supprime exp/formations existantes avant d'ajouter celles du CV. Ajouter : ne remplit que les champs vides, cumule compétences/langues sans doublon, ajoute exp/formations sans supprimer | Reparser un CV mis à jour créait des doublons d'expériences/formations en mode ajout systématique — l'utilisateur doit pouvoir choisir selon le cas (CV mis à jour vs profil à compléter) |
| Email approbation offre | `AdminOffreModerateAPIView.patch` envoie un email au recruteur (`entreprise.user.email`) uniquement quand `statut_moderation` passe à `APPROUVEE` (transition, pas à chaque save) — template `emails/offre_approuvee.html` | Le recruteur doit être informé automatiquement quand son offre devient visible, sans spammer à chaque modération |
| Email approbation entreprise | `AdminEntrepriseModerateAPIView.patch` envoie un email (`_envoyer_email_entreprise_approuvee`) uniquement sur transition `est_approuvee` False→True (comparé à `etait_approuvee` capturé avant `serializer.save()`) — template `emails/entreprise_approuvee.html`, même mécanisme que l'email offre | Même logique que l'offre : notifier une seule fois, pas à chaque modification du profil entreprise |
| Messages d'erreur backend affichés | `CreateJob.jsx` et `useGestionOffre.js` (helper `apiErrMsg()`) affichent `error.response?.data?.error` au lieu d'un toast générique | Le backend renvoie déjà des causes précises (entreprise non validée, rôle INVITE bloqué, premium expiré) mais le frontend les avalait avec des messages génériques — confus pour le recruteur |
| Swagger UI restylé | Template overridé `jobs/templates/drf_spectacular/swagger_ui.html` (trouvé avant celui de drf_spectacular car `jobs` précède l'app dans `INSTALLED_APPS`) — bandeau indigo TafTech, bordures colorées par méthode HTTP, police Inter/JetBrains Mono, blocs de code fond sombre, `SWAGGER_UI_SETTINGS` (filtre, persistAuthorization) | Habillage CSS de Swagger par défaut, jugé insuffisant par l'utilisateur — pas une refonte complète type Stripe/Postman ; à revoir si redemandé |
| Scraper Emploitic | Subprocess séparé + JSON tmp file | Playwright sync_playwright sur Windows bloque le greenlet à la fermeture — subprocess évite le hang |
| Référentiel recherche | Q() par mot individuel | `icontains` substring exact ne trouve pas "Ingénieur en informatique" avec "ingenieur informatique" |
| Playwright Windows | `python -m playwright install chromium` dans backend_env | Binaire chromium lié à l'env Python — installer dans le bon venv |
| CVThèque matching | Indexer `scores_map` par `user_id` (pas `profil.pk`) | `ProfilCandidatDTO` expose `user_id` pas `id` — sinon `score_offre` absent de la réponse |
| CVThèque offres dropdown | Filtrer `APPROUVEE + est_active + !est_cloturee` | Pas afficher les offres en attente ou rejetées dans le comparateur |
| InfoBanner dismiss | localStorage `banner_${storageKey}` | sessionStorage se réinitialise à chaque onglet — localStorage = 1 seule dismissal |
| Changer MDP recruteur | Dans ParametresRecruteur onglet "Mon profil" | Même logique que Settings candidat — adapté compte Google |
| scrollIntoView en test | `?.scrollIntoView?.()` (double optional chain) | jsdom définit l'élément mais pas la méthode scrollIntoView — simple `?.` ne protège pas contre méthode absente |
| Suppression inline confirm | Questionnaires + CandidaturesSpontanees : clic corbeille → inline Confirmer/Annuler, pas window.confirm | Pattern UX inline — les tests doivent cliquer 2 fois : corbeille puis "Confirmer" |
| navigator.clipboard jsdom | Mock dans CandidaturesSpontanees.test.jsx : `Object.assign(navigator, { clipboard: { writeText: vi.fn() } })` | jsdom ne définit pas clipboard API |
| N+1 queries | select_related/prefetch_related sur Dashboard, CVTheque, MesCandidatures | Dashboard 50 offres : 101 requêtes → 3 avec prefetch |
| Cache constants | `cache.get/set('jobs_constants', timeout=3600)` dans ConstantsAPIView | Wilayas/secteurs/diplômes statiques — pas de hit DB après 1ère requête |
| Mobile grids | Toutes les pages corrigées avec `grid-cols-1 sm:grid-cols-2` | Jamais commencer un grid directement à grid-cols-2+ sans breakpoint mobile — déjà appliqué partout |
| Invitation membre Google | Envoie lien invitation (pas ajout direct) | Compte Google sans mot de passe → ne peut pas se connecter sans définir un mot de passe d'abord |
| Rôle membre équipe Google | Ne pas changer le rôle à l'acceptation | Membre peut rester CANDIDAT — `est_membre_equipe` dans le serializer autorise le login recruteur |
| mediaUrl normalization | Ajoute `/media/` si absent du chemin | Snapshots anciens stockés sans `/media/` prefix |
| JobDetail redesign | Bandeau entreprise + grille infos + 2 colonnes | Plus lisible, style Emploitic/LinkedIn |
| Cypress version | Downgrade 15 → 13.17.0 | Cypress 15 binaire cassé sur Windows 10 (`--smoke-test` option non reconnue) |
| Cypress login recruteur | `cy.login("recruteur")` visite `/recruteurs/connexion` (placeholder `votre@entreprise.com`) | Portail séparé — login candidat via `/login` retourne 403 pour rôle RECRUTEUR |
| Cypress ECONNREFUSED GUI | `host: true` dans vite.config.js server | Windows résout `localhost` en IPv6 mais Vite écoutait IPv4 seulement |
| Cypress mock questionnaire | Utiliser `requis: true` (pas `obligatoire: true`) dans les mocks | Le composant JobDetail.jsx vérifie `q.requis`, pas `q.obligatoire` |
| Cypress intercept jobDetail | Regex `/\/api\/jobs\/\d+\/$/` au lieu de `**/jobs/*/` | Le glob matchait aussi `/api/jobs/recommandations/` — race condition sur `cy.wait("@jobDetail")` |
| AdminSystemLogs pagination | Pagination manuelle 50/page dans la vue (pas PageNumberPagination DRF) | Vue APIView simple, pas un ListAPIView — pagination injectée directement dans le GET |
| Parser CV — matching mots-clés | Tous les extracteurs de cv_parser.py + matcher.py (`competences_score`, `_experience_pertinente`) utilisent `re.search(r'\bKW\b', ...)` au lieu de `KW in texte` | Bug réel détecté sur un CV : le mot-clé `'ia'` (IT) matchait en sous-chaîne dans "Algeria/social/industrial", et `'ts'` (diplôme TS) matchait dans "tests/students" → mauvaise spécialité/diplôme détectés sans lien avec le contenu réel |
| SPECIALITES_MAPPING / DIPLOMES_MAPPING / SYNONYMES_SPECIALITE | Couverture FR + EN + AR sur toutes les catégories | CV testés en anglais (mots RH absents à l'origine) et marché algérien → CV parfois en arabe |
| _experience_pertinente synonymes | Comparé contre la description normalisée en texte (`\b` regex) au lieu d'un `set` de mots exacts | Les synonymes multi-mots ("ressources humaines", "génie civil") ne matchaient jamais un set de mots simples — faux négatif silencieux corrigé |
| DIPLOMES_MAPPING master générique | Ajout mot-clé `'master'`/`"master's degree"` dans MASTER_2 | "Master's Degree in..." ne matchait aucun mot-clé (seuls "master 1/2" existaient) → diplôme retombait sur LICENCE via "Bachelor's Degree" détecté plus loin |
| FormationCandidat.date_debut / etablissement | Rendus nullable/blank (migrations 0048, 0049) | CV n'indiquant qu'une année d'obtention (pas de date de début) ou un diplôme/certif sans établissement précisé — le POST formation échouait en 400 silencieux, formations "détectées mais non ajoutées" |
| ProfilCandidatAPIView.put() | Troncature auto des champs User trop longs + `remove_photo_profil` flag pour vider explicitement un FileField | Le parser CV peut extraire 2 numéros de téléphone concaténés (`0552.../0770...`) dépassant `User.telephone` (max 15) → 500 non catché ; un FileField ne peut pas être vidé avec une chaîne vide en multipart |
| Remplissage profil via parser CV — mode Remplacer | Sémantique de remplacement total : chaque champ (nom, tel, titre, wilaya, diplôme, spécialité, bio, réseaux, permis/passeport/véhicule, compétences, langues, expériences, formations, photo) est explicitement vidé s'il est absent du nouveau CV, pas seulement écrasé s'il est présent | L'utilisateur veut un vrai "remplacer" (delete-then-fill), pas un merge partiel — cas concret : nom jamais câblé du tout (nom_complet détecté mais jamais envoyé au PUT) |
| Remplissage profil — perf & anti double-clic | Suppressions/ajouts expériences+formations parallélisés (`Promise.allSettled` au lieu de `for...of` séquentiel) + état `remplissageLoading` désactivant le bouton "Valider et remplir" | Jusqu'à 22 requêtes HTTP séquentielles pour un CV avec 6 exp + 5 formations = lenteur perçue → double-clic → remplissage en double |
| extract_photo_from_docx | Nouvelle fonction (parcourt `doc.part.rels`, garde la plus grosse image, ignore les rels externes) | Seuls les PDF extrayaient une photo (`fitz`) ; les CV Word n'en extrayaient jamais |
| Description expériences/formations parser CV | `\n`-joined avec préfixe `"- "` (regex ET prompt Groq) au lieu de `" ".join()` qui aplatissait tout en un paragraphe | Le candidat veut retrouver la structure à puces d'origine du CV — `whitespace-pre-line` déjà présent côté frontend, seul le texte généré manquait de structure |
| Premium expiré membres | Blocage login (403) + blocage dashboard API | PROPRIETAIRE bypasse les deux couches |
| INVITE accès | Masquage UI des boutons d'action, pas blocage route | Candidatures en lecture seule autorisées |
| GuestRoute | Redirect si déjà connecté depuis login/register | Évite double session ou confusion de rôle |
| EquipeActionLog | Nouveau modèle migration 0043 | Traçabilité complète équipe recruteur |
| authService.peutFaire() | ORDRE = ["INVITE","UTILISATEUR","ADMIN","PROPRIETAIRE"] | Bug : ADMIN absent → indexOf=-1 → INVITE passait ADMIN check |
| Logout redirect | Role-aware (RECRUTEUR → /recruteurs/connexion) | Lire role AVANT clearStorage |
| mediaUrl centralisé | `src/utils/mediaUrl.js` — `VITE_MEDIA_BASE_URL` env | 127.0.0.1 hardcodé = cassé en prod/ngrok |
| Accès membres équipe API | `get_entreprise_for_user()` + `get_membre_role()` dans offres/candidatures | INVITE bloqué en écriture, UTILISATEUR+ autorisé |
| Backend logging | `logger = logging.getLogger(__name__)` dans chaque view | Remplace print() — prod-ready |
| Déploiement | Serveur algérien .dz | Conformité ANPDP + latence |
| ngrok tests | Proxy Vite + 1 seul tunnel | Compte gratuit ngrok = 1 tunnel max. Vite proxy redirige /api vers Django côté serveur |

---

## 🌿 WORKFLOW GIT

- Branch principale : `main`
- Feature branches : `feature/us{N}`
- Commits sur la feature, jamais directement sur main
- Merge vers main : **seulement sur permission explicite**
- Format commit : `type: description` (feat, fix, style, refactor, test, docs)

---

## ✅ ÉTAT TESTS (dernière vérification — MAJ tests coverage + corrections)

- Backend : 282/282 ✅ (dont 8 tests ChangerMotDePasseAPIView + 4 tests CVThequeView offre_id nouveaux)
- Frontend Vitest : 338/338 ✅
  - Nouveaux tests : InfoBanner (8) + Tooltip (10) + ParametresRecruteur MDP (5) + CVTheque matching (3)
  - Corrigés : Settings, RegisterRecruteur, Home, JobDetail, MesCandidatures, Navbar, CreateJob, CandidaturesSpontanees, EntreprisePublic, Questionnaires, ParametresRecruteur HP3/HP7/EC3, GestionOffre (dropdown statut), ResetPassword, DashboardRecruteur
- Cypress E2E : 7 fichiers — tous stables ✅
- Vite build : propre ✅ (1928 modules)

---

## 🔲 TÂCHES REPORTÉES (ne pas faire sans demande)
- Sentry error tracking
- Remplacer Groq par Ollama local (après déploiement) — **le câblage existe déjà** (`jobs/ai_engine.py::_call_ollama()`, session 20/08/2026) et bascule via `AIConfig.provider` dans l'admin, mais **non validé contre un vrai serveur Ollama** (aucun disponible en dev). Reste à faire le jour venu : installer/lancer `ollama serve` en prod, tester `_call_ollama()` en conditions réelles, ajuster si l'API `ollama-python` a changé entre-temps.
- RAG avec pgvector (roadmap 3-6 mois)

---

## 🚀 DÉPLOIEMENT

Serveur algérien `.dz` — conformité ANPDP.

Variables `.env` requises en prod :
```env
SECRET_KEY=<nouvelle clé générée>
DEBUG=False
ALLOWED_HOSTS=taftech.dz,www.taftech.dz
DB_NAME=taftech_db
DB_USER=<user postgres>
DB_PASSWORD=<mot de passe>
DB_HOST=127.0.0.1
DB_PORT=5432
EMAIL_HOST_USER=taftech963@gmail.com
EMAIL_HOST_PASSWORD=<app password Gmail>
GROQ_API_KEY=<clé Groq>
CORS_ALLOWED_ORIGINS=https://taftech.dz,https://www.taftech.dz
SITE_URL=https://taftech.dz
VITE_MEDIA_BASE_URL=https://taftech.dz
```

Crontab :
```bash
# Alertes emploi — tous les jours à 8h
0 8 * * * cd /chemin/vers/taftech_backend && python manage.py envoyer_alertes >> /var/log/taftech_alertes.log 2>&1

# Relance CV inactifs — le 1er de chaque mois à 9h
0 9 1 * * cd /chemin/vers/taftech_backend && python manage.py relance_maj_cv >> /var/log/taftech_relance.log 2>&1

# Archivage auto offres expirées — tous les jours à 00h30
30 0 * * * cd /chemin/vers/taftech_backend && python manage.py archiver_offres_expirees >> /var/log/taftech_archivage.log 2>&1

# Pré-chauffe cache scores matching dashboard candidat — toutes les 10 min (aligné sur SCORES_CACHE_TTL)
*/10 * * * * cd /chemin/vers/taftech_backend && python manage.py precalculer_scores_matching >> /var/log/taftech_scores.log 2>&1

# Purge du journal de qualité IA (parsing CV + corrections, > 12 mois) — le 1er de chaque mois à 3h
0 3 1 * * cd /chemin/vers/taftech_backend && python manage.py purger_qualite_ia >> /var/log/taftech_purge_ia.log 2>&1
```

Checklist avant déploiement :
- [ ] `settings.py` : DEBUG=False, SECRET_KEY env, DATABASE_URL env
- [ ] `ALLOWED_HOSTS` avec vrai domaine .dz
- [ ] `CORS_ALLOWED_ORIGINS` avec vrai domaine frontend
- [ ] `.env` frontend : `VITE_MEDIA_BASE_URL=https://taftech.dz`
- [ ] Whitenoise pour fichiers statiques
- [ ] `requirements.txt` à jour
- [ ] `python manage.py migrate && python manage.py collectstatic`
- [ ] **Délivrabilité email** (voir session 06/09/2026 — emails de vérification arrivés en spam pendant les tests) : `DEFAULT_FROM_EMAIL` affiche déjà un nom d'expéditeur ("TafTech <...>") au lieu d'une adresse nue, mais ça ne résout pas le fond du problème — passer d'un compte Gmail grand public (`taftech963@gmail.com`) à un expéditeur sur le domaine `taftech.dz` (Google Workspace ou un fournisseur transactionnel type SendGrid/Mailgun/AWS SES/Brevo), puis configurer SPF + DKIM + DMARC dans le DNS du domaine. Tester ensuite avec mail-tester.com (viser un score proche de 10/10) avant toute mise en prod réelle.
- [ ] **Sécurisation fichiers média (CV/photos/logos)** : en DEBUG=False, `taftech_backend/urls.py` ne sert plus `/media/` du tout (bloc `static()` gardé par `if settings.DEBUG`) — il faut un serving explicite en prod (nginx `alias` ou équivalent). Les fichiers gardent leur nom original (`upload_to='cvs/'` sans fonction de nommage, ex. `CV_Ahmed_Benali.pdf`) donc plus devinable qu'un UUID. Avant d'exposer `/media/` publiquement, décider : (a) accepter le risque (fichiers non listables, mais devinables si le nom réel est connu), ou (b) passer par une vue Django authentifiée qui vérifie la propriété/l'accès avant de streamer le fichier, ou (c) URLs signées à expiration (nginx `secure_link` / S3 presigned URLs)

---

## 🤖 ROADMAP RAG — IA LOCALE (POST-DÉPLOIEMENT)

| Étape | Timing | Action |
|-------|--------|--------|
| 1 | Après déploiement | Installer Ollama + mistral 7B, valider `jobs/ai_engine.py::_call_ollama()` (déjà écrit, non testé) contre un vrai serveur, puis basculer `AIConfig.provider` sur OLLAMA depuis l'admin |
| 2 | 1 mois | Ajouter pgvector, vectoriser offres + profils |
| 3 | 3 mois | Construire retriever, injecter contexte dans prompts |
| 4 | 6 mois | Affiner prompts avec données réelles TafTech |

La valeur de TafTech n'est pas le LLM — ce sont les données. Fine-tuning écarté (GPU A100/H100 requis), RAG retenu.

---

## 💻 COMMANDES UTILES

```bash
# Backend
cd C:\Users\filali\Desktop\Taftech\taftech_backend
python manage.py runserver

# Frontend
cd C:\Users\filali\Desktop\Taftech\taftech_frontend
npm run dev

# Build Vite (vérification avant commit)
npx vite build

# Tests backend
python manage.py test jobs.tests

# Tests frontend
npm test -- --run

# Cypress
npx cypress open

# PostgreSQL port 5433

# ── NGROK (partage pour tests externes) ──────────────────────────────────────
# ngrok est installé dans : C:\Users\filali\Downloads\ngrok-v3-stable-windows-amd64\ngrok.exe
# (ajouté au PATH utilisateur — ouvrir un nouveau terminal si non reconnu)
#
# Procédure complète (3 terminaux) :
#   Terminal 1 : python manage.py runserver          (backend Django port 8000)
#   Terminal 2 : npm run dev                         (frontend Vite port 5173)
#   Terminal 3 : ngrok http 5173                     (tunnel public → port 5173)
#
# → Envoyer l'URL ngrok affichée (https://xxx.ngrok-free.app) aux testeurs
#
# Fonctionnement : Vite proxy intercepte /api et /media et les redirige vers
# localhost:8000 côté serveur — les testeurs n'ont besoin que d'une seule URL.
#
# Rien à changer dans .env ni settings.py — tout est déjà configuré :
#   - vite.config.js : proxy /api + /media → 127.0.0.1:8000, allowedHosts: true
#   - axiosConfig.js : VITE_API_URL vide → URLs relatives → proxy Vite
#   - settings.py    : ALLOWED_HOSTS += ['.ngrok-free.app'] si DEBUG=True
# ─────────────────────────────────────────────────────────────────────────────
```

---

## 📧 CONFIG

- Email TafTech : taftech963@gmail.com
- Localisation : Oran, Algérie
