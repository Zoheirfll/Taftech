# Site public, mobile et conventions UI

> À lire avant de toucher aux pages publiques, à la navbar/footers, au responsive mobile, au SEO, aux pages légales ou aux conventions visuelles.
>
> Extrait de l'ancien `CLAUDE.md` monolithique (découpage du 2026-10-12) — contenu déplacé tel quel, sans réécriture, du plus récent au plus ancien.
> Les renvois « voir section X » pointent vers un autre fichier de `docs/fonctionnel/` : voir l'index de `CLAUDE.md`.

---

## 🆕 SESSION 18/10/2026 (fin) — Checklist qualité : validation point par point

Méthode : build de production servi en local, Playwright (iPhone 13, Pixel 5), plus lecture du code. Limite : émulation, pas de vrai téléphone ; temps de chargement mesurés sans réseau mobile.

| Point | État | Preuve / remarque |
|---|---|---|
| Bouton qui attend le serveur | ✅ | `useSubmitLock` sur 10 formulaires (27/09) ; erreurs et succès restent en toast |
| Squelettes de chargement | ✅ | Présents sur offres, entreprises, secteurs, régions, accueil, blog, article, offre (le constat « simple cercle » du premier rapport était **inexact**) ; fond global `PageLoader` (App.jsx) passé de cercle à squelette de page ; 24 écrans admin |
| Écran vide / état vide | ✅ | « Aucune offre trouvée » vérifié en navigateur (`/offres?search=…`, le paramètre est `search`, pas `q`) |
| Animation au toucher | ✅ | règle globale `index.css` (`button:active`) |
| Hors ligne | ✅ (prudent) | `public/sw.js` + `hors-ligne.html` + `manifest.webmanifest` + icônes carrées 192/512 + `OfflineBanner` ; vérifié : service worker actif, réseau coupé → page « Vous êtes hors ligne ». **Les pages ne sont volontairement pas lisibles hors ligne** (pas de cache de pages : versions périmées, données privées) |
| Scroll horizontal / débordement mobile | ✅ | 0 sur 12 pages × 2 appareils |
| Meta description, titres par page, favicon, Open Graph, sitemap, `alt` | ✅ | voir la section SEO ci-dessous |
| Images compressées | ✅ | logo (122 / 190 Ko) + **toute image envoyée** : `jobs/image_utils.py` (1600 px, recompression, EXIF supprimé), 8 tests |
| E-mail et téléphone cliquables | ✅ | `mailto:`, `tel:`, `wa.me` sur Contact et pied de page |
| Liens cassés | ✅ | 131 liens internes de 15 pages publiques testés : 0 cassé ; 3 liens externes (WhatsApp, Facebook, LinkedIn) non testés |
| Menu mobile, barre du bas, CTA au-dessus de la ligne de flottaison, CTA collant | ✅ | accueil : « S'inscrire » et « Rechercher » visibles ; offre : « Postuler » visible et collant |
| Texte de remplissage | ✅ | aucun (« Lorem », TODO, e-mails d'exemple) dans `src` |
| Messages d'erreur et de succès | ✅ | toasts + messages sous les champs |
| États d'erreur de formulaire | ✅ 21 formulaires (tous ceux des candidats et recruteurs) ; formulaires admin hors périmètre. **Suite du jour** : `ModalCV` (format PDF/DOC/DOCX et 5 Mo vérifiés), `ModalLiens` (adresses https), `ModalPreferences` (salaire en chiffres), `ModalFormation` (diplôme et établissement), carte mot de passe d'`OngletMonProfil`, candidature rapide et questions obligatoires de `JobDetail`. **Correction** : j'avais écrit que `ModalFormation` dépendait de la validation native pour ses listes de diplôme et de spécialité ; c'était faux (l'astérisque de `FormationReferentielSelect` n'est qu'un affichage), seul « Établissement » avait `required`. **Déjà équipés** : `ProposerEntreeModal` / `ProposerMetierModal` (message d'erreur sous les champs, bouton désactivé sous 3 caractères), `CreateQuestionnaireModal` / `Questionnaires` (champs en rouge). **Sans objet** : la recherche du tableau de bord candidat (aucun champ obligatoire). Détail des 15 premiers : | `useErreursChamps` + `FieldError` : inscription candidat et recruteur, réinitialisation et changement de mot de passe, contact, mentions légales admin (avant), **connexion candidat, connexion recruteur, mot de passe oublié ×2, alertes emploi, compétences, fenêtres Informations et Expérience du profil, candidature spontanée** (aujourd'hui). **Seuls non couverts** : les formulaires de l'administration (paliers, FAQ, bannières, compétences, etc., utilisés uniquement par l'admin ; hors mentions légales). Limites connues : la carte « informations personnelles » d'`OngletMonProfil` n'a aucune règle vérifiable côté écran (aucun champ obligatoire côté serveur), et les erreurs renvoyées par le serveur lors du changement de mot de passe restent affichées en toast. Aides : `utils/useErreursChamps.js`, `utils/validations.js` (`erreurFichier`, `erreurLien`, `FICHIER_CV`). |
| Page 404 | ✅ | client + vrai code 404 pour offres/entreprises/articles inconnus (si nginx configuré) |
| Page de remerciement | ✅ | `/merci` (`Pages/Public/Merci.jsx`), appelée après le formulaire de contact ; la candidature à une offre mène volontairement à « Mes candidatures » (déjà une confirmation) ; `noindex`, bloquée dans robots.txt |
| Confidentialité, CGU, mentions légales | ✅ | pages présentes ; **à faire relire par un juriste** et à compléter par la mention de la mesure d'audience |
| Bannière cookies | ✅ (information) | `Components/CookieBanner.jsx` : le site ne dépose que des cookies nécessaires, donc information et non consentement ; texte vérifié contre les faits (carte Google après clic, Google seulement sur connexion/inscription) ; au-dessus de la barre du bas, mémorisée |
| Analytics | ⚠️ code prêt, inactif | `Components/Analytics.jsx` (Plausible ou Umami, sans cookie, `https`, jamais sur l'admin) ; **activation = votre choix d'outil** + 3 variables `VITE_ANALYTICS_*` |
| Vraie adresse de contact | ⚠️ à vous | téléphone, WhatsApp, Facebook, LinkedIn réels ; e-mail = Gmail (préférer une adresse au nom de domaine) ; adresse postale à saisir dans Admin → Mentions légales |
| Test sur appareil réel | ❌ à vous | émulation seulement |

**Découvertes pendant la validation**
- La page entreprise intégrait une **carte Google chargée dès l'ouverture** et `main.jsx` chargeait le script Google sur **toutes** les pages : corrigé (`CarteSurDemande`, `GoogleAuthProvider`), sinon la mention « seulement des cookies nécessaires » aurait été fausse. Vérifié : aucune requête Google sur `/offres`.
- Les entrées internes des listes déroulantes (`react-select`) restaient à 14,9 px malgré la règle des 16 px (style en ligne `font: inherit`) : règle dédiée en `!important` (`input[aria-autocomplete="list"]`). Vérifié : 0 champ sous 16 px sur 6 pages.
- Le décalage de mise en page de la page entreprise est confirmé corrigé : 0 sur 3 essais × 2 appareils (0,33 avant) ; blog 0,09 (< 0,1) ; plus aucun lien du pied de page sous 24 px.
- `jobs/seo_views.py` : le sitemap annonçait encore les offres expirées alors que leur page est en `noindex` ; règle unique `offres_indexables()`, utilisée aussi par la page SEO admin.

**Tests ajoutés aujourd'hui** : `Merci.test.jsx` (8), `Analytics.test.jsx` (6), `CookiesEtCarte.test.jsx` (7), `serviceWorker.test.js` (10), `ErreursChamps.test.jsx` (11), `SeoCanonicalJobPosting.test.jsx` (19), `AdminSeo.test.jsx` (9), `ForgotPassword.test.jsx` et `AlertesEmploi.test.jsx` adaptés ; backend : `test_images_optimisees.py` (8), `test_seo_pages.py` (20).

---


## 🆕 SESSION 18/10/2026 — Audit mobile / performances / SEO et corrections

**Demande** (liste collée par l'utilisateur) : vérifier smartphone Android/iPhone, performances, sitemap, robots.txt, canonical, données structurées JobPosting, indexabilité Google / Search Console. Puis : « fixez tout ».

**Méthode de l'audit** : build de production servi en local (`vite preview`), Playwright (Python) en émulation iPhone 13 et Pixel 5 sur 11 pages (accueil, offres, entreprises, blog, contact, une offre, une entreprise, un article, une 404…). Mesures : débordement horizontal, balises SEO rendues, CLS/LCP, cibles tactiles, taille de police des champs. Limites : `localhost` sans réseau mobile (temps indicatifs), pas de vrais téléphones, pas d'accès à la Search Console (site non en ligne).

**Constats positifs** : aucun débordement horizontal ; viewport déclaré ; un seul `<h1>` par page ; titres et descriptions distincts par page ; `alt` sur toutes les images ; JS principal 103 Ko gzip ; sitemap valide (124 URLs sans doublon) ; page introuvable en `noindex`.

**Corrigé**
1. **Canonical + `og:url`** : `Components/Seo.jsx` les pose par défaut (URL courante sans paramètres, slash final, comme le sitemap) ; `canonical` explicite possible ; absent avec `noindex`. `RouteTitle.jsx` le pose pour `/entreprises`, `/qui-sommes-nous`, `/contact`, `/recruteurs` (pages sans `<Seo>`). Image de partage rendue **absolue** (les robots de partage ne résolvent pas `/logo.png`).
2. **JobPosting** : `utils/jobPosting.js` (`construireJobPosting`, `offreIndexable`, `urlCanoniqueOffre`), branché dans `JobDetail.jsx` via `<Seo canonical noindex jsonLd>`. Offre clôturée, désactivée ou expirée → `noindex`, pas de JobPosting. **Pas de `baseSalary`** : `salaire_propose` est un texte libre, l'unité (mois ? année ?) est inconnue, on n'invente pas un montant. Même contenu côté serveur (`jobs/seo_pages.py`) ; **même id `seo-jsonld`** des deux côtés : le client remplace le JSON-LD du serveur, jamais de doublon.
3. **Aperçus de partage et vrais 404** : `jobs/seo_pages.py` (routes dans `taftech_backend/urls.py`) sert `index.html` avec les balises propres à l'offre / l'entreprise / l'article, renvoie **404** + `noindex` pour un objet inconnu ou non public, **301** vers l'URL officielle pour une mauvaise URL (dont l'ancienne `/jobs/<id>`). **Actif en production seulement si nginx relaie ces URLs** : consigne et vérifications dans [../exploitation/deploiement.md](../exploitation/deploiement.md) ; en développement Vite sert `index.html` et ce module n'intervient pas. Variable `FRONTEND_INDEX_PATH` (settings).
4. **Zoom automatique iPhone** : règle unique dans `index.css`, sous 768 px, `font-size: 16px` pour champs de texte, listes et zones de saisie (cases, radios, curseurs, couleurs, fichiers exclus). Volontairement **hors `@layer`** pour l'emporter sur `text-sm` sans toucher chaque composant. Les champs mesuraient 14,9 px.
5. **Cibles tactiles** : `py-1` sur les quatre tokens de liens de pied de page de `theme.js` (`footerLinkAmber`, `footerLinkAmberBlock`, `footerLinkTeal`, `footerLinkTealBlock`) : 21 px → environ 29 px (minimum WCAG 2.2 : 24 px). D'autres liens ou boutons restent sous 24 px (de 9 à 17 par page mesurée) : à traiter page par page si besoin, non traité ici.
6. **Décalage de mise en page de la page entreprise** (CLS 0,33 au premier passage, non reproduit au second) : hypothèse retenue, le bloc de chargement de 16 rem de haut est remplacé par la page entière et pousse le pied de page vers le bas ; `EntreprisePublic.jsx` : chargement en `min-h-screen`. **À reconfirmer par une nouvelle mesure** (non refaite).
7. **robots.txt** : liste `PREFIXES_INTERDITS` (`jobs/seo_views.py`), chaque entrée correspond à une route protégée de `App.jsx` ; `/offres`, `/recruteurs` (landing), `/jobs/<offre>` (ancienne URL qui doit rester explorable pour que le canonical joue) restent ouverts. **Piège** : `/statistiques` est une page recruteur (sous `RecruteurRoute`), pas une page publique.
8. **Sitemap** : ajout de `/entreprises`, `/mentions-legales`, `/cgu`, `/confidentialite`. Test de cohérence : l'URL canonique d'une offre est identique à celle du sitemap.

**À faire par vous (rien n'est faisable côté code)** : règle nginx ; `SITE_URL` et `FRONTEND_INDEX_PATH` en prod ; vérification du domaine dans la Search Console et envoi du sitemap ; Rich Results Test ; PageSpeed Insights en mobile.

**Non fait / décisions à prendre** : pré-rendu complet de toutes les pages (service tiers ou rendu serveur général) écarté pour l'instant (choix lourd) ; une URL inventée hors des quatre familles (`/n-importe-quoi`) répond encore 200 avec une page « introuvable » en `noindex` posée par le navigateur.

**Tests** : `jobs/tests/test_seo_pages.py` (14 : balises, JobPosting, types de contrat, échappement hostile, 301/404, entreprise, article, 503, robots, sitemap), `tests/SeoCanonicalJobPosting.test.jsx` (19). **Non relancés après ces corrections** : la suite frontend complète et le build (à faire avant tout commit).

---


## 🆕 SESSION 03/10/2026 — Placeholders « exemple » retirés + menu mobile candidat réorganisé

- **Placeholders** : 65 placeholders « exemple » retirés (« Ex : … », `votre@email…`, `https://…`, `0555…`, `DZ`, `••••`, `____`, gabarits « Bonjour {prenom} », puces d'exemple de CreateJob, « (ex: Anglais) »), car ils donnaient un air « généré par IA ». Conservés : placeholders fonctionnels (« Rechercher… », « Sélectionnez… », « Illimité », « Tapez une compétence puis Entrée… », consignes comme « 8 caractères minimum »). Les tests qui ciblaient ces placeholders utilisent désormais des sélecteurs structurels (`input[type="email"]`, `input[maxlength="6"]`, `input[name="titre"]`…). **Règle : ne plus ajouter de placeholder d'exemple ; le libellé visible suffit.**
- **Menu mobile candidat** (`Navbar.jsx`) : liste plate remplacée par des sections « Explorer » / « Mon espace » / « Aide et compte » (recruteur : « Espace recruteur »). Liens déjà présents dans la bottom nav toujours masqués sous 768 px.
- `StatistiquesPage.test.jsx` réparé (environnement jsdom manquant, pas de `cleanup`, textes multiples).
- **ngrok** : page blanche sur Chrome mobile mais pas Samsung Internet = très probablement l'avertissement ngrok gratuit + mode dev Vite (centaines de modules). Tester avec `npm run build` + `vite preview --host` plutôt que `npm run dev`. Le proxy `/api` de `vite.config.js` vise le port **8001** (vérifier que Django tourne bien dessus).

---


## 🆕 SESSION 27/09/2026 (suite) — Checklist qualité site (anti-vibecoding)

Checklist fournie par l'utilisateur vérifiée point par point dans le code. Implémenté : page 404 (`Pages/Public/NotFound.jsx`, route `path="*"` en dernier dans `App.jsx`, `noindex`) ; titre d'onglet par route pour les pages sans `<Seo>` (`Components/RouteTitle.jsx`, placé avant `<Routes>` pour que les `<Seo>` publics gardent la priorité) ; bandeau hors ligne (`Components/OfflineBanner.jsx`, événements `online`/`offline` — pas de PWA/service worker) ; email/téléphone cliquables sur `/contact` ; image Open Graph passée du `.ico` à `public/taftech-logo.png` + `apple-touch-icon` + `theme-color` ; logo compressé (1008×813, 585 Ko → 400 px 125 Ko dans `src/assets`, 512 px 195 Ko dans `public`, original sauvegardé hors repo). Déjà conformes (vérifiés) : meta description, sitemap/robots, favicon, CGU/confidentialité, menu mobile + bottom nav, alt sur toutes les `<img>`, pas de `href="#"`, toasts erreur/succès. **Aussi : `utils/useSubmitLock.js` (bloque le double envoi + `disabled` sur le bouton submit) branché sur les 10 formulaires sans aucune protection (AlertesEmploi, Questionnaires, 6 modales ProfilCandidat, 7 formulaires admin : Bannières/Compétences/CreditPacks/FAQ/Paliers/RendezVous/TypesDocuments) ; règles CSS globales dans `index.css` (`overflow-x: clip` sur html/body, `button:disabled` grisé, `button:active` scale 0.97 — neutralisé par la règle `prefers-reduced-motion` existante). Erreurs sous chaque champ : `Components/FieldError.jsx` (message + `role="alert"`) + `utils/fieldErrors.js::extraireErreursChamps()` (erreurs DRF par champ) + règle CSS globale `[aria-invalid="true"]` (bordure rouge). Branché sur inscription candidat, inscription recruteur (dont les 2 Select secteur/wilaya), contact (validation client : champs requis + format email), réinitialisation mot de passe, changement de mot de passe (Settings — messages regroupés sous la ligne pour ne pas casser la mise en page horizontale). Chaque erreur s'efface dès que l'utilisateur modifie le champ ; le toast est conservé en complément. Formulaires déjà équipés avant : CreateJob, Questionnaires. **Non faits, décision utilisateur requise** : analytics (choix d'outil), bannière cookies (inutile tant qu'il n'y a que des cookies d'auth httpOnly strictement nécessaires — requise dès qu'un analytics est ajouté), adresse postale réelle (seulement « Oran, Algérie »), support hors ligne complet (PWA).

---


## 🆕 SESSION 25/08/2026 (suite) — Audit mockup, refonte entreprise/blog/navbar, recadrage image, corrections en direct

**Contexte** : session longue de bout en bout avec l'utilisateur, alternant audit visuel (comparaison mockup employeur ↔ app réelle via captures Playwright), refontes de design demandées après l'audit, et plusieurs bugs réels remontés en testant en conditions réelles (parser CV, inscription, navbar). Tout exécuté en inline, sans sous-agents.

### Audit visuel — mockup employeur (13 puis 15 panneaux) vs app réelle
Comptes de test jetables créés/supprimés à chaque passe (jamais laissés en base). Captures Playwright (`chromium.launch()`, le hang classique de `browser.close()` sur Windows — déjà documenté pour le scraper Emploitic — ignoré, le screenshot est pris avant). Verdict global : **la quasi-totalité des points du mockup étaient déjà conformes** avant même de coder quoi que ce soit — le mockup est un document de validation rétrospective, pas une nouvelle liste de fonctionnalités. Deux écarts réels identifiés et traités (voir sections suivantes) : page vitrine entreprise (design daté) et blog (aucun contenu, donc invisible). Un point volontairement écarté après discussion : **Messagerie candidat/recruteur** (chat temps réel façon LinkedIn) — jugé non prioritaire, le besoin de communication du process de recrutement est déjà couvert par email + statuts + entretiens programmés ; un vrai chat ouvrirait des problèmes de modération/rétention (loi 18-07) sans bénéfice clair.

### Refonte page vitrine entreprise (`EntreprisePublic.jsx`)
Brainstormé et validé section par section avec l'utilisateur (spec `docs/conception/specs/2026-08-25-refonte-profil-entreprise-design.md`, plan `docs/conception/plans/2026-08-25-refonte-profil-entreprise.md`) :
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

