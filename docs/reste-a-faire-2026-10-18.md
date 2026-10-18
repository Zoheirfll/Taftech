# Reste à faire — point d'étape du 18/10/2026

> Tout ce qui demande encore une action (de votre part ou de la mienne) après la session du 18/10/2026. À rouvrir à la reprise. Les problèmes de fond reportés par décision explicite restent dans [problemes-a-traiter.md](problemes-a-traiter.md).
>
> État du code à la fin de la session : suite backend 1006 tests OK, suite frontend 666 tests OK, build de production OK. Détail des travaux : [fonctionnel/ui-site-public-mobile.md](fonctionnel/ui-site-public-mobile.md), [fonctionnel/admin.md](fonctionnel/admin.md), SECURITY.md §31 à §33.

## A. Mise en ligne : à faire par vous (rien n'est faisable côté code)

| # | Action | Pourquoi / conséquence si oubliée | Où c'est expliqué |
|---|---|---|---|
| A1 | **nginx** : envoyer à Django les pages d'offre, d'entreprise et d'article, et `/sitemap.xml`, `/robots.txt` | Sans cela, les aperçus Facebook et WhatsApp, les données JobPosting côté serveur et les vrais codes 404 ne fonctionnent pas en ligne (le site marche quand même) | [exploitation/deploiement.md](exploitation/deploiement.md), section « SEO en production » |
| A2 | **`SITE_URL=https://taftech.dz`** | Sinon le sitemap, les canonicals et le JobPosting publient `http://localhost:5173`. La page admin SEO affiche une alerte tant que c'est local | idem |
| A3 | **`FRONTEND_INDEX_PATH`** vers le `index.html` réellement servi | Sinon le rendu serveur répond 503 (la page SEO admin indique « indisponibles ») | idem |
| A4 | **nginx** : `sw.js` et `hors-ligne.html` sans cache, `/assets/` en cache long | Sans `no-cache` sur `sw.js`, une nouvelle version du service worker n'arrive jamais | idem, « Hors ligne, manifeste et mesure d'audience » |
| A5 | **Google Search Console** : vérifier le domaine, envoyer le sitemap, inspecter une offre | Sans cela, aucune visibilité sur l'indexation (la balise de vérification n'est pas dans `index.html`) | idem |
| A6 | **Rich Results Test** de Google sur une offre active | Confirme que la fiche « Offre d'emploi » est reconnue | idem |
| A7 | **PageSpeed Insights** en mobile (accueil et une offre) | Les mesures de la session sont faites en local, sans réseau mobile | — |
| A8 | Rejouer les vérifications après mise en ligne (liste cochable) | Robots, sitemap, canonical, 404, 301, service worker, manifeste, absence de requêtes Google hors connexion | deploiement.md |

## B. Contenu et décisions (vous)

| # | Action | Détail |
|---|---|---|
| B1 | **Choisir l'outil d'analytics** et créer le compte | Code prêt et inactif (`Components/Analytics.jsx`). Recommandation : Umami auto-hébergé (gratuit, sans cookie, données en Algérie). Puis renseigner `VITE_ANALYTICS_PROVIDER`, `VITE_ANALYTICS_ID`, `VITE_ANALYTICS_HOST` avant le build |
| B2 | **Politique de confidentialité** | Y ajouter la mesure d'audience (page modifiable dans Admin → Pages du site) ; **faire relire CGU et politique par un juriste** (le texte de départ est un modèle générique) |
| B3 | **Admin → Mentions légales et coordonnées** | Renseigner raison sociale, forme juridique, capital, RC, NIF, NIS, adresse du siège (**adresse postale réelle**), représentant légal, directeur de publication, hébergeur, horaires. Un champ vide n'est affiché nulle part ; RC et NIF sont à renseigner avant la production si les factures doivent les mentionner |
| B4 | **E-mail de contact au nom du domaine** | Aujourd'hui un Gmail ; voir aussi [exploitation/delivrabilite-emails.md](exploitation/delivrabilite-emails.md) (SPF, DKIM, DMARC) |
| B5 | **Contenu d'une entreprise** | Une entreprise sans adresse n'affiche pas la carte (rien à corriger, information) |

## C. Tests réels (vous)

| # | Action | Détail |
|---|---|---|
| C1 | **Tester sur un vrai iPhone et un vrai Android** | Les contrôles de la session sont en émulation (iPhone 13, Pixel 5) : débordement, tailles de champs, bannière, hors ligne |
| C2 | **Vérifier les 3 liens externes** | WhatsApp, Facebook, LinkedIn (liens du pied de page) : non testés, ce sont des sites tiers |
| C3 | **Revérifier à la main les points des corrections client non rejoués dans cette session** | Dans [archives/CORRECTIONS_CLIENT_TEMP.md](archives/CORRECTIONS_CLIENT_TEMP.md) : points **1 à 9** (référentiel), **13, 14, 16, 17, 18, 22, 23**. Les points **10, 11, 12, 15, 19, 20, 21** ont été vérifiés pas à pas |

## D. Code laissé volontairement (décisions à reprendre avec moi si besoin)

| # | Sujet | Pourquoi laissé | Si on le reprend |
|---|---|---|---|
| D1 | **Formulaires de l'administration** (paliers, FAQ, bannières, compétences, types de documents, etc.) | Utilisés par l'admin seul ; 21 formulaires candidats et recruteurs ont déjà leurs messages sous les champs | Même modèle : `useErreursChamps` + `FieldError` + `noValidate` |
| D2 | Changement de mot de passe recruteur : erreurs **renvoyées par le serveur** | Elles restent en notification (les erreurs de saisie sont sous les champs) | Faire remonter l'erreur depuis `useParametresRecruteur.js` |
| D3 | Carte « informations personnelles » d'`OngletMonProfil` | Aucun champ obligatoire côté serveur : rien d'honnête à vérifier côté écran | — |
| D4 | **Pré-rendu complet** de toutes les pages | Choix lourd (service tiers ou rendu serveur général). Aujourd'hui seules les offres, entreprises et articles sont rendus côté serveur | Décision d'architecture avec vous |
| D5 | **Vrais 404 pour toute URL inventée** | Une URL hors des quatre familles (`/n-importe-quoi`) répond 200 avec une page « introuvable » en `noindex` posée par le navigateur | Dépend du pré-rendu (D4) ou de la config nginx |
| D6 | **Statistiques exactes dans le temps** | Recrutements par mois, entonnoir et abonnements sont des approximations affichées à l'écran (pas d'historique des statuts ni des paliers) | Nouveaux modèles `HistoriqueStatutCandidature` et `date_approbation` d'offre : exact seulement à partir de la mise en production |
| D7 | **Images déjà enregistrées** avant la compression | `jobs/image_utils.py` ne traite que les nouveaux envois | Commande de reprise à écrire, avec liste validée, sauvegarde avant, normalisation des chemins (règle du projet pour les traitements en masse) |
| D8 | **Salaire dans le JobPosting** | Texte libre à l'unité inconnue : on n'affiche pas un montant risqué | Passer le salaire en champs structurés (montant, unité) |
| D9 | **Pages lisibles hors ligne** | Volontairement non : pas de cache de pages (versions périmées, données privées). Hors ligne = page « Vous êtes hors ligne » | À revoir seulement si le besoin est réel |
| D10 | **Blog : décalage de mise en page 0,09** | Sous le seuil Google (0,1) mais proche | Réserver la hauteur des vignettes |

## E. Déjà documentés ailleurs

- Problèmes de fond reportés : [problemes-a-traiter.md](problemes-a-traiter.md) (diplôme et spécialité exclus du score si le recruteur ne remplit que « Diplôme attendu », etc.).
- Journal de sécurité : [../SECURITY.md](../SECURITY.md) (§31 statistiques, §32 rendu serveur SEO, §33 vie privée du navigateur).
- Nettoyage des anciennes routes de demandes d'ajout au référentiel : en attente des commandes `migrer_*_vers_demandes` en production ([fonctionnel/demandes-ajout.md](fonctionnel/demandes-ajout.md)).
