# Panel administrateur

> À lire avant de toucher aux pages `/admin-taftech/*`, aux permissions `IsAdminRole`, au journal d'audit ou au tableau de bord admin.
>
> Extrait de l'ancien `CLAUDE.md` monolithique (découpage du 2026-10-12) — contenu déplacé tel quel, sans réécriture, du plus récent au plus ancien.
> Les renvois « voir section X » pointent vers un autre fichier de `docs/fonctionnel/` : voir l'index de `CLAUDE.md`.

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

