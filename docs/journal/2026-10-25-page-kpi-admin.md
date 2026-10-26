# 2026-10-25 — Page admin « KPI »

## Demande et décisions (utilisateur)
- Une **nouvelle page de pilotage** (pas un bandeau ajouté à « Statistiques »), **sans nouveau modèle** ni migration.
- Thèmes retenus : croissance, offres et candidatures, revenus et abonnements, qualité et IA.

## Ce qui a été fait
- Backend : `jobs/stats_admin/kpi.py` (`calculer_kpi`), vue `AdminKpiAPIView` dans `views/admin_statistiques.py`, route `GET jobs/admin/kpi/?date_debut=&date_fin=` (`admin-kpi`), `IsAdminRole`. Réutilise `indicateurs`, `abonnements`, `recrutement` et `periode` de la page Statistiques (période précédente de même durée, variation).
- Frontend : `Pages/Admin/AdminKpi.jsx`, `Components/CarteKpi.jsx` (carte + variation ; `moinsEstMieux` inverse les couleurs pour les échecs), `adminService.getAdminKpi`, route `kpi`, entrée « KPI » du menu (avant « Statistiques »).
- Bandeau « À traiter maintenant » : entreprises à valider, offres à modérer, demandes d'ajout, candidatures jamais ouvertes (liens vers les pages concernées).

## Suite du même jour — KPI détaillés par thème (demande de l'utilisateur : « plus spécifique, complets, en détail »)
Choix de l'utilisateur : évolution mensuelle, répartitions, classements Top 10, entonnoirs et taux, **export Excel un onglet par thème**.
- Backend : `stats_admin/kpi_detail.py` (`calculer_detail(theme, debut, fin)`, thèmes `croissance | activite | revenus | ia`, **même structure pour les quatre** : `evolution`, `repartitions`, `classements`, `entonnoirs`), routes `GET jobs/admin/kpi/<theme>/` (404 si thème inconnu) et `GET jobs/admin/kpi/export/` (**déclarée avant** `<theme>`), export tracé (`AUTRE`, « Export KPI … »). `_par_mois` d'`evolution.py` réutilisé.
- Contenu : croissance (wilaya des candidats, secteur / taille / wilaya des entreprises, parcours candidat inscrit → profil → CV → a postulé, parcours recruteur inscrit → entreprise validée → offre publiée → candidature reçue) ; offres et candidatures (offres par wilaya / contrat / secteur, candidatures par statut / origine, scores, Top 10 offres, entreprises, métiers, compétences, entonnoir) ; revenus (par palier, packs, déblocages, Top 10 entreprises par revenu et par déblocages) ; IA (appels / tokens par fonction et modèle, échecs par code d'erreur, formats, version du parser).
- Frontend : onglets (Vue d'ensemble + 4 thèmes), **détail chargé à l'ouverture de l'onglet** (jamais les quatre d'un coup), `Components/KpiDetailBlocs.jsx` (barres de répartition, tableau de classement, entonnoir en barres : `FunnelChart` est écrit pour des « candidatures », inadapté aux recruteurs ; une courbe **par unité** : DA et effectifs ne se mélangent pas), bouton « Exporter ».
- Limites : les parcours (entonnoirs de croissance) montrent l'**état actuel** des comptes créés pendant la période (un inscrit récent n'a pas encore postulé) ; `taux_passage` n'est donné que si l'étape ne dépasse pas la précédente ; les classements nomment des **entreprises** (nom public) et des offres, **jamais des personnes** ; métier de référence interne affiché à l'admin seulement (page admin). Les wilayas des candidats sont agrégées, sans identité.
- Vérifié : backend `test_api_admin_kpi` 16 OK (accès 401/403/404, structure commune, données réelles par thème, aucun e-mail dans la réponse, export 4 onglets + audit) ; frontend `AdminKpi.test.jsx` 13 OK + build.

## Limites assumées (écrites à l'écran)
- **Délai de réponse du recruteur : non calculé.** `Candidature.date_reponse` est en `auto_now` (modifiée à chaque sauvegarde) : elle ne mesure pas une première réponse. Le faire demanderait un nouveau champ (décision à prendre).
- **Comptes connectés** = `last_login` dans la période : une période passée sous-estime (Django ne garde que la dernière connexion).
- Abonnements actifs / expirations : état actuel, pas d'historique des changements de palier (comme sur « Statistiques »).
- Taux de recrutement : approximation (une candidature déposée avant la période peut être retenue pendant).
- Pas de coût en dinars de l'IA (dépend du tarif du fournisseur) : tokens et appels seulement. Les appels remboursés (`REMBOURSE`) ne sont pas comptés.

## Audit sécurité (règle 9)
- Route : `IsAdminRole` (401 sans session, 403 candidat et recruteur : testé sur la vraie route). Frontend : sous `AdminRoute` / `AdminLayout`.
- Réponse : agrégats uniquement, aucun e-mail, nom, CV ni NIN (testé : aucun e-mail dans la réponse). Pas de filtre entreprise, donc pas d'identifiant d'entreprise en entrée.
- Paramètres de période validés par `lire_periode` (format, ordre, 5 ans au plus) : 400 sinon.

## Vérifié
- Backend : `test_api_admin_kpi` (8) + `test_api_admin_statistiques` = 35 tests OK (`DB_NAME=taftech_db_claude_iso`).
- Frontend : `AdminKpi.test.jsx` (8) + `AdminStatsPeriode.test.jsx` = 18 OK ; `npm run build` OK.
- **Non essayé à l'écran** ; suites complètes non relancées ; non commité.

## Reste / à décider
- `Variation` est dupliquée entre `CarteKpi.jsx` et `AdminStatsPeriode.jsx` : faire utiliser `CarteKpi` par l'ancienne page (non fait, pour ne pas toucher une page qui marche sans accord).
- Objectifs chiffrés par KPI (option « avec objectifs saisis par l'admin ») : non faite, nécessiterait un modèle.
