# Refonte portail recruteur — Sidebar + Abonnements 4 paliers

_Design en cours — session du 22/08/2026. Basé sur un mockup IA envoyé par l'employeur (page "Abonnements & tarifs")._

**Statut** : brainstorming en cours, traité point par point pour ne rien perdre en implémentation. Ce document est mis à jour au fur et à mesure des décisions actées avec l'utilisateur, pas seulement à la fin.

## Contexte

L'employeur a envoyé une capture d'un mockup IA montrant une page "Abonnements & tarifs" recruteur avec sidebar, 4 formules tarifaires, tableau comparatif, FAQ, etc. Décision actée : on reproduit fidèlement les prix/formules du mockup, on s'inspire du style pour la mise en page, et on construit un vrai layout à sidebar pour TOUT le portail recruteur (n'existe pas aujourd'hui — contrairement au candidat qui a déjà `CandidatLayout.jsx`).

Portée large (9 nouvelles pages, dont Abonnements & Facturation, + refonte Premium en 4 paliers). Décision : **1 seul spec global**, implémentation en phases séparées.

## Contenu exhaustif de la capture (checklist de travail)

1. [x] Sidebar recruteur (layout global)
2. [x] Barre de recherche globale Ctrl+K (header)
3. [x] 4 formules — noms, prix, contenu réel par palier (principe acté, prix/modèle exact à finaliser à l'implémentation)
4. [x] Toggle Mensuel/Annuel + remise -20%
5. [x] Tableau comparatif détaillé
6. [x] 4 badges avantages (Accès immédiat, Sans engagement, Paiement sécurisé, Support prioritaire)
7. [x] FAQ
8. [x] "Ils nous font confiance" (logos clients)
9. [x] "Pourquoi passer à une formule supérieure ?"
10. [x] Bloc "Besoin d'aide ?"
11. [x] Bandeau conformité loi 18-07

Toute la checklist est passée en revue. Reste à trancher avant l'implémentation : voir "Restant à trancher" dans chaque section (surtout section 3 — modèle Palier, migration, prix exacts).

## 1. Sidebar recruteur — DÉCIDÉ

Nouveau `RecruteurLayout.jsx` (pattern calqué sur `CandidatLayout.jsx` existant), appliqué à **toutes** les pages du portail recruteur (pas seulement Abonnements). Remplace le layout actuel (navbar seule, chaque page autonome).

| Lien sidebar | Route | Statut |
|---|---|---|
| Tableau de bord | `/dashboard` | Existe (DashboardRecruteur.jsx) |
| Offres d'emploi | *(à définir)* | **Nouvelle page** — liste globale des offres, éclatée aujourd'hui entre dashboard/GestionOffre |
| Candidatures | *(à définir)* | **Nouvelle page** — vue globale toutes offres confondues |
| CVthèque | `/cvtheque` | Existe |
| Candidats recommandés | *(à définir)* | **Nouvelle page** — aujourd'hui section du dashboard, à sortir |
| Entretiens | *(à définir)* | **Nouvelle page** — aucune vue dédiée aujourd'hui (candidatures avec `date_entretien`) |
| Recrutements | *(à définir)* | **Nouvelle page** — candidatures RETENU, historique |
| Statistiques | *(à définir)* | **Nouvelle page** — graphiques aujourd'hui dans le dashboard, à sortir |
| Messages | `/candidatures-spontanees` | Existe, **renommé** "Messages" dans la sidebar (= boîte de réception recruteur) |
| Favoris | `/cvtheque?favoris=true` | Réutilise CVthèque avec filtre pré-activé, pas une page distincte |
| Abonnements & tarifs | `/recruteurs/abonnements` | **Nouvelle page** — sujet principal de cette session, remplace `/recruteurs/premium` |
| Facturation | *(à définir)* | **Nouvelle page** — aucun historique de paiement/facture n'existe aujourd'hui |
| Paramètres entreprise | `/parametres` | Existe, renommé dans la sidebar |
| Publier une offre | `/creer-offre` | Existe, gardé (hors mockup) |
| Questionnaires | `/questionnaires` | Existe, gardé (hors mockup) |
| Mon équipe | `/mon-equipe` | Existe, gardé (hors mockup) |

**Décisions actées** :
- "Messages" = boîte de réception recruteur = page `/candidatures-spontanees` renommée dans la sidebar (pas une nouvelle messagerie temps réel candidat↔recruteur).
- Les liens hors mockup (Publier une offre, Questionnaires, Mon équipe) restent dans la sidebar.
- Respect des rôles équipe existants (`authService.peutFaire(minRole)`) — un lien caché pour un rôle insuffisant aujourd'hui doit le rester dans la sidebar.

**Restant à trancher** :
- Routes exactes des 7 nouvelles pages.
- Contenu précis de chaque nouvelle page (quelles données, quels filtres).

**Décidé** : le Tableau de bord (page d'accueil `/dashboard`) devient une vue d'ensemble résumée — KPI clés + raccourcis vers chaque page dédiée, pas de duplication complète du contenu détaillé qui migre vers les nouvelles pages.

## 2. Barre de recherche globale Ctrl+K — DÉCIDÉ

Raccourci clavier Ctrl+K ouvre un champ de recherche dans le header du `RecruteurLayout`. À la validation, redirige vers `/cvtheque?search=<terme>` (réutilise la recherche CVthèque existante, pas de nouveau moteur ni endpoint). Pas de palette de commande multi-entités.

Le reste du header (cloche notifications, badge messages, avatar entreprise) existe déjà dans `NavbarRecruteur.jsx` — repris tel quel, aucun nouveau composant.

## 3. Les 4 formules — EN COURS

**Remplace le système Premium binaire actuel** (`ProfilEntreprise.est_premium`/`PremiumPlan` à durée seule) par 4 paliers réels avec fonctionnalités différenciées. Migration des recruteurs premium existants à traiter à l'implémentation (mapping à définir).

### Palier gratuit (aucun abonnement) — DÉCIDÉ
- CVthèque entièrement bloquée (comme aujourd'hui pour non-premium).
- IA entièrement bloquée (génération offre, recommandés, etc.).
- **1 offre active maximum** — nouveau, n'existait pas de limite avant. Mode "essai" avant de passer à Starter.

### Limite d'offres actives par palier — DÉCIDÉ
Blocage technique à la publication (pas juste informatif) : compte les offres `APPROUVEE` + non clôturées de l'entreprise, refuse la publication au-delà de la limite du palier actif, message clair + lien vers upgrade.
- Gratuit : 1
- Starter : 5
- Pro : 15
- Business / Enterprise : illimité

### Téléchargement CV (CVthèque) — DÉCIDÉ
Nouveau compteur mensuel par entreprise côté backend, reset le 1er de chaque mois, incrémenté à chaque téléchargement de CV depuis la CVthèque.
- Starter : 10/mois (bloqué au-delà)
- Pro/Business/Enterprise : illimité

### Coordonnées candidats (CVthèque) — DÉCIDÉ
- Starter : email + téléphone masqués sur la fiche candidat (reste du profil visible : CV, compétences, expérience).
- Pro+ : coordonnées visibles.

### Répartition IA par palier — DÉCIDÉ
- Starter : Génération offre IA (fonctionnalité déjà existante, débloquée dès l'entrée payante — pas listée dans le mockup mais logique de base).
- Pro : + Candidats recommandés (IA) — comme indiqué dans le mockup.
- Business : + Recherche ultra avancée (IA) + Filtres intelligents (IA) + Statistiques avancées+IA.
- Enterprise : tout Business + solution personnalisée.

### Modèle de données — DÉCIDÉ
Nouveau modèle dédié (remplace complètement `PremiumPlan`/`est_premium`) : `Palier` (nom, prix_mensuel_da, prix_annuel_da, limite_offres nullable=illimité, limite_cv_mois nullable=illimité, acces_coordonnees bool, acces_ia_recommandes bool, acces_ia_avancee bool, ordre) + `AbonnementEntreprise` (FK entreprise, palier actif, date_debut, date_expiration, mode paiement). Détail des champs exacts à finaliser à l'implémentation.

### Palier Enterprise — DÉCIDÉ (principe), DÉTAIL REPORTÉ
Enterprise aura une vraie API publique + gestion multi-utilisateurs avancée (au-delà des rôles d'équipe actuels PROPRIETAIRE/ADMIN/UTILISATEUR/INVITE) — confirmé comme objectif réel, pas juste une promesse marketing. **Mais** : sous-projet énorme en soi (auth API, docs, rate-limiting, rôles étendus) — **reporté à une session de brainstorming dédiée**, pas détaillé/implémenté dans cette phase. Pour l'instant : le bouton Enterprise ouvre un formulaire "Nous contacter" (point d'entrée manuel, activation/config au cas par cas côté admin).

### Prix de départ — DÉCIDÉ
Seed initial = montants exacts du mockup (Starter 5900 DA/mois, Pro 12900 DA/mois affiché barré 16000 -20%, Business 22900 DA/mois affiché barré 28500 -20%, Enterprise = "Sur devis" texte, pas de montant). Ajustables ensuite depuis `AdminPaliers.jsx` (point 4).

### Migration des Premium existants — DÉCIDÉ
Les entreprises `est_premium_actif=True` (ancien système) basculent automatiquement vers le palier **Business** (le plus proche fonctionnellement de l'ancien Premium : CVthèque complète + toute l'IA) via une migration de données, en conservant leur `premium_expire_at` actuelle comme date d'expiration du nouvel `AbonnementEntreprise` — pas de re-paiement immédiat forcé.

## 4. Toggle Mensuel/Annuel + remise -20% — DÉCIDÉ

Tout est éditable par l'admin (pattern déjà établi dans le projet — CMS Premium existant `AdminPremium.jsx`, `PremiumPlan.prix_da` en montant final saisi, pas de formule cachée) :
- Prix mensuel par palier : éditable admin.
- Prix annuel par palier : éditable admin, **indépendant** du prix mensuel × 12 — l'admin peut choisir d'appliquer une remise annuelle ou non, et de quel montant. Pas de calcul automatique caché.
- Champs `palier.remise_annuelle_active` (bool) + `palier.prix_annuel_da` (montant final, comme `PremiumPlan.prix_da` aujourd'hui) sur le nouveau modèle `Palier`.

Reproduit dans le nouveau panel admin `AdminPaliers.jsx` (remplace `AdminPremium.jsx`), même pattern CRUD.

## 5. Tableau comparatif détaillé — DÉCIDÉ

Récapitulatif visuel des mêmes critères déjà actés au point 3 (limite offres, CVthèque, CV/mois, coordonnées, IA, stats), calculé depuis le même modèle `Palier` — pas de nouveau critère, juste une présentation tableau en plus des cartes. Le champ "Support" (Basique/Prioritaire/Prioritaire+dédié/24-7) est un simple texte libre par palier sur le modèle `Palier` (pas de fonctionnalité réelle gérée derrière — support = canal humain, cohérent avec la décision déjà actée sur "Support prioritaire" Premium en session 21/08/2026 : promesse opérationnelle documentée, pas de système de tickets).

## 6. 4 badges avantages — DÉCIDÉ

- **Accès immédiat** : vrai — activation self-service à l'achat, déjà le comportement actuel.
- **Sans engagement / Résiliez à tout moment** : "résilier" = désactiver le renouvellement automatique, l'entreprise garde son palier jusqu'à la fin de la période déjà payée puis repasse en gratuit. **Pas de remboursement au prorata** (cohérent avec le système actuel — paiement manuel CIB/EDAHABIA + Chargily, pas d'abonnement récurrent automatique aujourd'hui).
- **Paiement sécurisé 100% chiffré** : vrai — Chargily déjà utilisé pour le paiement Premium actuel.
- **Support prioritaire / Accompagnement dédié** : promesse opérationnelle simple (canal support documenté), pas de système de tickets — même décision que le badge Premium actuel (session 21/08/2026).

## 7. FAQ — DÉCIDÉ

Réutilise le modèle `FaqItem` existant (session CMS 20/08/2026) — nouvelle catégorie `PALIERS` ajoutée aux choix `categorie` (GENERAL/RECRUTEUR/PREMIUM/PALIERS), seedée avec les 5 questions du mockup adaptées (changer de formule, engagement, sécurité paiement, renouvellement, facture). Gérable depuis `AdminFaq.jsx` existant, zéro nouveau modèle. Page Abonnements fetch `jobsService.getFaq("PALIERS")`.

## 8. "Ils nous font confiance" — logos clients — DÉCIDÉ

Les logos du mockup (Aptiv, Yassir, Schneider, Lactalis, Condor, Ooredoo) sont des exemples fictifs générés par l'IA — **ne pas les reproduire tels quels** (utilisation de marques réelles sans relation client réelle = trompeur). Remplacé par : nouveau champ `ProfilEntreprise.mise_en_avant_accueil` (bool, coché manuellement par l'admin) — logos déjà disponibles via `ProfilEntreprise.logo` existant, pas de nouvel upload. Section n'affiche que les entreprises approuvées + cochées. Lien "Voir tous nos clients" → `/entreprises` (page publique existante).

## 9. "Pourquoi passer à une formule supérieure ?" — DÉCIDÉ

Contenu purement statique/marketing (4 arguments : Gagnez du temps / Accédez aux meilleurs talents / Optimisez vos recrutements / Support dédié à chaque étape) — codé en dur dans la page, pas de gating technique dessous, aucune question de conception à trancher.

## 10. Bloc "Besoin d'aide ?" — DÉCIDÉ

Bouton "Contacter le support" → lien vers `/contact` (page existante, formulaire fonctionnel `ContactMessageAPIView`, envoie un email réel) — pas de nouveau canal, pas de mailto direct.

## 11. Bandeau conformité loi 18-07 — DÉCIDÉ

Bandeau statique (icône + texte) en bas de page, lien "En savoir plus" → `/confidentialite` existante (page CMS `PageStatique` déjà en place) — pas de nouvelle page dédiée.

## Détail des 9 nouvelles pages sidebar

### Page "Abonnements & tarifs" — DÉCIDÉ
La page principale de cette session — entièrement spécifiée aux points 3 à 11 ci-dessus (4 paliers, toggle mensuel/annuel, tableau comparatif, badges, FAQ, logos clients, argumentaire upgrade, aide, conformité). Rien à ajouter ici, juste le point d'entrée sidebar `/recruteurs/abonnements` (remplace `/recruteurs/premium`).

### Page "Favoris" — DÉCIDÉ
Pas une vraie nouvelle page distincte — le lien sidebar navigue vers `/cvtheque?favoris=true` (le filtre backend `favoris_only` existe déjà dans `CVThequeView`), la page CVthèque affiche directement la liste filtrée sur les favoris au chargement si le paramètre est présent.

### Page "Offres d'emploi" — DÉCIDÉ
Liste complète des offres de l'entreprise (toutes statuts : actives/clôturées/en attente/rejetées), filtrable par statut, compteur de candidatures par offre affiché en ligne. Remplace le point d'entrée éparpillé actuel (offres mélangées dans DashboardRecruteur). Clic sur une offre → `GestionOffre` existant (détail/candidatures de cette offre, inchangé).

### Page "Candidatures" — DÉCIDÉ
Vue globale de toutes les candidatures reçues sur toutes les offres de l'entreprise, filtrable par offre + par statut (RECUE/EN_COURS/PRESELECTION/ENTRETIEN/RETENU/REFUSE), tri par score IA — même pattern que `GestionOffre` mais sans filtre d'offre imposé. Clic sur une candidature → `DetailCandidature` existant (inchangé).

### Page "Candidats recommandés" — DÉCIDÉ
Reprend exactement la logique déjà construite dans `DashboardRecruteur.jsx` (session 19/08/2026 : tri `score_matching` desc, filtre "masquer retenus/refusés", détail matching dépliable par critère, action changement de statut inline) mais en page dédiée avec pagination normale (pas le "Voir plus" par pas de 6 limité). Gatée Pro+ (décision point 3).

### Page "Entretiens" — DÉCIDÉ
Vraie vue calendrier/agenda (mois/semaine), pas juste une liste triée par date. Affiche les candidatures au statut `ENTRETIEN` placées sur leur `date_entretien`, agrégées sur toutes les offres de l'entreprise. Composant nouveau à construire — possibilité de s'inspirer du calcul de créneaux déjà existant côté candidat (`jobs/views/candidat_dashboard.py::_generer_creneaux_disponibles()`, système de rendez-vous candidat) pour la structure de grille horaire, mais c'est un affichage en lecture (pas de prise de RDV recruteur — la date d'entretien reste définie depuis `DetailCandidature` comme aujourd'hui).

### Page "Recrutements" — DÉCIDÉ
Historique des candidatures au statut `RETENU`, toutes offres confondues, avec date de recrutement/poste/candidat — pure archive, pas de nouvelle donnée backend, juste un filtre dédié sur les candidatures existantes. Pas de KPI supplémentaire (temps moyen de recrutement, taux de conversion) dans cette phase.

### Page "Statistiques" — DÉCIDÉ
Reprend l'existant (session 19/08/2026 : `MiniAreaChart` courbe/barres, comparaison période précédente, taux de conversion, export PNG/CSV, pipeline barres, filtres offre/période) sorti du dashboard vers cette page dédiée, plus de place pour l'affichage.

**+ 2 nouveaux graphiques "avancées + IA"** (gate Business+, décision point 3) — **aucun nouvel appel Groq**, calculés sur des données déjà en base :
1. **Répartition par score de matching** : histogramme du nombre de candidatures par tranche de `score_matching` (ex. 0-20/20-40/.../80-100%) — montre la qualité du vivier de candidats.
2. **Temps moyen de traitement par étape du pipeline** : durée moyenne entre l'entrée dans un statut et le passage au suivant (RECUE→EN_COURS→PRESELECTION→ENTRETIEN→décision) — nécessite de tracer les dates de transition de statut, absentes aujourd'hui (`Candidature` n'a que `date_postulation` et `date_entretien`, pas d'historique de changement de statut). **Nouveau besoin backend** : soit un nouveau modèle `CandidatureStatutHistorique` (log à chaque changement), soit une approximation moins précise sans historique — à trancher à l'implémentation.

### Page "Facturation" — DÉCIDÉ
Vraies factures PDF téléchargeables (ReportLab, déjà utilisé dans le projet pour le bulletin candidat — même pattern technique réutilisé). Générée à chaque paiement de palier confirmé, basée sur `AbonnementEntreprise` (nouveau modèle, point 3) + historique `DemandeActivationPremium`-like.

**Mentions légales TafTech (RC, NIF, adresse siège, TVA éventuelle)** : placeholders `[à compléter]` dans le template PDF au départ, mais **rendues éditables/complétables depuis l'admin** — nouveau petit modèle singleton `MentionsLegalesEntreprise` (pattern `get_solo()` déjà utilisé pour `AIConfig`/`ConfigRendezVous`) avec les champs RC/NIF/adresse/TVA, exposé dans un panel admin simple. Le template facture lit ces champs au lieu de valeurs codées en dur — dès qu'un admin les renseigne, toutes les factures (nouvelles, pas les anciennes déjà générées) les affichent. Même logique que les CGU provisoires déjà en place (bandeau d'alerte tant que non fournies) mais ici directement éditable sans passer par du code.
