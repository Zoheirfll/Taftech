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

## 9. Nettoyage de l'interface liée aux diplômes
- Mentions techniques retirées du texte visible : « référentiel v2 », « référentiel national », « hors référentiel » (→ « Autre diplôme / Autre domaine / Autre spécialité »), « métier du référentiel » (→ « métier de référence »).
- Doublon supprimé dans l'assistant d'inscription : l'ancienne liste « Diplôme » (Master 2, Ingéniorat, Bac+5…) n'est plus affichée à côté du diplôme structuré ; un seul champ « Diplôme ». Dans le profil : « Diplôme le plus élevé ».
- Recruteur synchronisé : le filtre « Diplôme » de la CVthèque utilise les types de diplôme structurés (profil ou formation du candidat) ; la carte candidat et le détail des formations affichent d'abord le diplôme structuré.
- « Autre, préciser » : le champ libre n'apparaît que si « Autre » est réellement choisi ; une formation enregistrée comme « Autre diplôme » se rouvre en mode « Autre ».
- Formulaire de candidature spontanée (visiteur sans compte) : liste simple conservée (un seul champ, pas de doublon).
- Tests : `test_cvtheque_filtre_diplome_structure.py`, tests frontend mis à jour.

## 10. Compétences des offres
- Structure conservée : compétence normalisée + obligatoire/souhaitée + niveau éventuel.
- Offre et candidat utilisent le même référentiel : un libellé ou un synonyme exact mène à la même compétence (`CompetenceOffre.competence_ref`, migration 0130, résolveur partagé).
- Le matching compare par identifiant de référentiel (libellé en repli pour une compétence hors référentiel) ; le niveau requis est comparé sur la même clé.
- Une compétence d'offre saisie en synonyme devient le libellé canonique ; hors référentiel : badge « hors liste » à la création et à la modification d'offre.
- Rattachement automatique des saisies existantes (migration, ajout d'une compétence ou d'un synonyme par l'admin, import du référentiel).
- Limite : une compétence hors référentiel n'est comparée que sur son texte exact ; enrichir les synonymes côté admin pour élargir.
- Tests : `test_competences_referentiel_commun.py`.

## 11. Compétences suggérées dans l'administration
- Cycle clair : Suggérée → Validée (officielle) ou Rejetée ; Validée ↔ Désactivée ; Rejetée → Validée (réexamen). Transitions contrôlées côté serveur, tracées (qui, quand) et inscrites au journal d'audit.
- Une compétence proposée automatiquement reste « Suggérée » : elle n'apparaît ni dans les suggestions, ni dans le parser de CV, ni dans la génération d'offre IA, ni dans le score, tant que l'admin ne l'a pas validée.
- Propositions automatiques : compétences saisies hors référentiel par au moins 3 candidats/offres distincts (bouton « Détecter les propositions »), avec anti-bruit ; une compétence rejetée n'est jamais re-proposée.
- Valider une proposition rattache aussitôt les saisies existantes (candidats, offres).
- Page admin : onglets avec compteurs, badges de statut, actions Valider/Rejeter/Désactiver/Réactiver, usage réel ; badge « à valider » dans la barre latérale ; le tableau de bord ne compte que les compétences officielles.
- Limites : détection manuelle (pas de tâche planifiée) ; seuil fixé à 3 dans l'interface.
- Tests : `test_competences_cycle_vie.py`, `AdminCompetences.test.jsx`.

## 12. CVthèque / confidentialité
- Formulation « accès à vie » / « définitivement » supprimée de toute l'interface (packs de crédits admin, bandeaux CVthèque et abonnements, confirmation de déblocage, pages d'explication recruteur et candidat). Aucune occurrence en base (FAQ, pages, articles, bannières).
- Le déblocage n'est plus un accès permanent : le candidat peut masquer son profil ou supprimer son compte.
  - Profil masqué : il disparaît de la CVthèque et l'accès est suspendu pour tous, même pour une entreprise qui l'avait débloqué ; il est rétabli sans nouvelle dépense si le candidat réaffiche son profil.
  - Compte supprimé : tout accès recruteur cesse (CV, documents partagés, déblocage).
  - Une entreprise à qui le candidat a postulé garde l'accès à son CV tant que le compte est actif, même profil masqué.
- Faille corrigée : avant, un recruteur ayant débloqué un profil pouvait encore télécharger le CV et les documents partagés d'un compte supprimé.
- Distinction vérifiée : le CV de recrutement est visible après déblocage ou candidature ; les documents privés ne sont jamais visibles automatiquement, même après déblocage, uniquement via un partage explicite du candidat (désormais inopérant tant que le profil est masqué).
- Réglage candidat renommé « Visibilité de mon profil dans la CVthèque », avec explication claire de ce que voit un recruteur.
- Non modifié (décision commerciale) : pas de remboursement d'un crédit déjà dépensé quand l'accès est suspendu ou terminé.
- Tests : `test_cvtheque_profil_masque_supprime.py` (10).

## 13. Abonnements / cohérence commerciale
- Constat : la gratuité n'est PAS une offre de lancement. La formule Gratuite est permanente (1 offre active, sans date d'expiration, `paliers_utils.limite_offres_actives`). Starter 5 offres, Pro 15, Business/Enterprise illimitées.
- Textes harmonisés : « Formule Gratuite : 1 offre active, sans limite de durée » (Landing recruteur, inscription et connexion recruteur) ; « Compte gratuit disponible » → « Création de compte gratuite » ; l'ancienne mention « 1 gratuite, jusqu'à illimité selon votre formule » est remplacée par un renvoi explicite à Starter / Pro / Business.
- Page Abonnements : note précisant que la formule Gratuite est permanente et que les limites des formules payantes sont celles du tableau (chiffres toujours lus depuis la base, jamais codés en dur).
- FAQ en base corrigée (migration `0132`, sans écraser un texte déjà modifié par l'admin) : « au lancement » et « abonnement Premium » supprimés ; la gestion d'équipe est rattachée à Business / Enterprise.
- À confirmer par le client : si la gratuité devait un jour devenir une offre de lancement, il faudra une date de fin et un mécanisme d'expiration (inexistants aujourd'hui).
- Non modifié : FAQ de catégorie PREMIUM obsolètes (ids 11, 12, 14), non affichées.

## 14. Souscription avant validation
- Déjà en place avant ce point : refus serveur 403 `ENTREPRISE_NON_VALIDEE` sur la demande d'activation (`premium/demande/`), le paiement d'une formule (`paliers/chargily/checkout/`) et l'achat de crédits ; boutons de la page Abonnements désactivés avec bandeau d'attente.
- Fait : message aligné mot pour mot sur la demande du client (« Votre entreprise est en cours de validation. Vous pourrez activer votre formule après validation de votre compte. »), côté serveur et bandeau de la page Abonnements.
- Le message d'achat de crédits (`views/credits.py`) garde sa formulation propre (« …acheter des crédits… »).
- Tests : `test_souscription_entreprise_non_validee.py` (refus des deux routes, aucune demande créée, aucun appel au prestataire de paiement, acceptation après validation).

## 15. Statistiques marché : secteur / domaine / sous-domaine / métier
- Constat confirmé : l'onglet « Données marché » (admin) regroupait les offres par métier (`metier_id`) mais l'affichait sous « secteur » : Data Analyst, Développeur Back-End, Maintenance électrique apparaissaient comme des secteurs.
- Corrigé (`AdminMarcheAPIView`, helper `referentiel_utils.secteur_et_domaine_par_metier`) : chaque métier est rattaché à son vrai secteur en remontant la hiérarchie secteur → domaine → sous-domaine → métier ; « Tension marché par secteur » et « Top secteurs » sont agrégés au niveau secteur (libellé nettoyé du préfixe NSEC). Un métier sans secteur est compté dans « Non classé ».
- Nouveau bloc « Top métiers » (nouvelle clé `top_metiers`) : le détail fin reste visible, avec le secteur et le domaine en sous-titre, sans être confondu avec un secteur.
- Les autres écrans (offres par secteur, notifications, nomenclature) utilisaient déjà la vraie hiérarchie.
- Ajouté ensuite : bloc « Top domaines » (clé `top_domaines`, 15 max) et filtre « Tous les secteurs » dans son en-tête, qui filtre aussi « Top métiers » (30 métiers renvoyés, 10 affichés ; filtre côté écran, sans nouvelle route).
- Limite : le filtre est par secteur uniquement (pas de filtre par domaine ou sous-domaine) ; le sous-domaine n'est pas affiché.
- Tests : `test_api_marche.py` (HP4, HP4b, HP4c, HP4d, HP6).

## 16. Export des statistiques : Excel (.xlsx) à la place du CSV
- Constat : sur smartphone, le CSV de la page Statistiques recruteur s'ouvrait avec toutes les données dans une seule colonne (séparateur « ; » + BOM fabriqués à la main côté client). Le graphique du dashboard avait déjà été migré vers `.xlsx`, pas cette page.
- Décision du client (13/10) : **plus aucun CSV sur toute la plateforme**, uniquement du `.xlsx`.
- Fait : page Statistiques recruteur → bouton « Exporter (Excel) » (réutilise `jobsService.exporterGraphiqueExcel`, nombres bruts) ; 4 exports admin (candidatures, entreprises, offres, utilisateurs) → `.xlsx`, boutons « Exporter Excel », vues renommées `Export…ExcelAPIView` (`ExportAdminCandidaturesExcelAPIView` pour la distinguer de l'export recruteur), URLs inchangées. Helper unique `views/export_xlsx.py` (`reponse_xlsx`, `neutraliser_formules`) ; plus aucune occurrence de `csv` dans le code applicatif.
- **Sécurité (injection de formule Excel)** : openpyxl écrit une chaîne commençant par `=` comme une formule. Un nom, un titre d'offre ou une candidature rapide anonyme (`nom_rapide`) valant `=HYPERLINK(...)` s'exécuterait à l'ouverture du fichier par l'admin ou le recruteur. Toutes les chaînes sont forcées en type texte (`neutraliser_formules`), y compris dans l'export des candidatures recruteur (qui n'avait pas cette protection).
- Plafond de taille (demandé par l'utilisateur, généreux) : l'export générique du graphique refuse au-delà de 20 000 lignes ou 50 colonnes (400).
- Tests : `test_export_graphique_excel.py` (3), `test_api_admin_exports.py` (formules neutralisées sur les 4 exports), `test_api_admin.py`, `StatistiquesPage.test.jsx`, `AdminCandidatures/AdminUsers.test.jsx`.

## 17. Emails : délivrabilité, SPF / DKIM / DMARC, adresse d'expédition
- Constat : les emails partent via `smtp.gmail.com` depuis un compte Gmail personnel ; SPF/DKIM/DMARC sont ceux de gmail.com, jamais alignés avec le domaine de la plateforme → classement en spam. **Pas corrigeable dans le code** : DNS du domaine définitif + fournisseur d'envoi.
- Fait côté code : (1) `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL` (et `SERVER_EMAIL`) pilotés par l'environnement, valeurs actuelles en repli → passage à l'adresse professionnelle sans modifier le code ; (2) `envoyer_alertes` et `relance_maj_cv` envoyaient avec `EMAIL_HOST_USER` au lieu de `DEFAULT_FROM_EMAIL` : une seule adresse d'expédition désormais.
- Fait côté documentation : procédure complète à exécuter après installation sur le domaine définitif → [delivrabilite-emails.md](../exploitation/delivrabilite-emails.md) (choix du fournisseur, SPF, DKIM, DMARC progressif `p=none` → `reject`, variables d'environnement, vérifications Gmail « Afficher l'original », mail-tester.com, Postmaster Tools).
- **À faire après l'installation (hors code, non vérifiable avant)** : vérifier la délivrabilité réelle, publier les enregistrements DNS, créer l'adresse professionnelle. Statut : en attente du domaine définitif.
- À décider avec le client : fournisseur d'envoi (boîte pro ou service transactionnel) ; en-tête `List-Unsubscribe` + désinscription pour la newsletter admin avant tout envoi en volume (non implémenté).
- Sécurité : le mot de passe d'application Gmail de développement est dans `.env` (ignoré par git) ; à remplacer par les identifiants du fournisseur en production.

## 18. Configuration IA : prompts, audit, plafond global
- Demande : conserver l'architecture IA actuelle ; avant production, (1) prompts réservés au Super Admin, (2) modification des prompts dans le journal d'audit, (3) plafond global de consommation et idéalement une alerte.
- Fait (détail et choix dans SECURITY.md §24) : (1) prompts lisibles/modifiables par `is_superuser` uniquement (403 sinon, champs absents de la réponse, écran verrouillé) ; (2) actions d'audit `MODIFIER_PROMPT_IA` (longueurs + empreinte, jamais le texte) et `MODIFIER_CONFIG_IA` (migration `0133`, libellés dans le journal d'audit du panel) ; (3) le plafond `budget_ia_appels_mois_max` existait déjà : ajout du seuil d'alerte (`budget_ia_alerte_pct`, 80 %), de l'email aux Super Admins (une fois par mois et par niveau), de la jauge de consommation et d'un avertissement tant qu'aucun plafond n'est défini.
- Plafond **dynamique** (14/10) : saisi depuis l'écran Configuration IA, appliqué immédiatement, sans redéploiement. Modifiable par le **Super Admin uniquement** (comme les prompts) : l'admin simple le voit mais ne peut ni le modifier ni le vider (403 `BUDGET_RESERVE_SUPER_ADMIN`). Détail : SECURITY.md §24.
- **À décider / à faire** : valeur du plafond global avant la mise en production, à saisir par le Super Admin (vide = illimité aujourd'hui) ; conservation de l'historique du texte des prompts (non gardé dans le journal) ; plafond en tokens plutôt qu'en appels (non fait).
- Tests : `test_ai_config_securite.py` (17), `AdminIAConfig.test.jsx`.

## 19. Données personnelles et score de compatibilité
- Demande : statut militaire, véhicule, passeport, sexe, âge ou autres informations personnelles ne doivent pas modifier le score général, sauf critère professionnel/légal précis de l'offre ; statut militaire « Non concerné (Femme) » → « Non concerné ».
- **Vérification (14/10)** : le score (`matcher.calculer_score_matching`) n'a que 5 critères (région, diplôme, spécialité, expérience, compétences). Aucun de ces champs n'est lu par le score de compatibilité, le score de profil (`profile_score.py`) ni les analyses IA. Rien à corriger dans le calcul ; la garantie est maintenant **verrouillée par un test** (`test_matching_donnees_personnelles.py` : des propriétés espions sur sexe, date de naissance, service militaire, permis, véhicule, passeport ne sont jamais lues, et le score est identique quelles que soient leurs valeurs). Un futur bonus « véhiculé » ferait échouer ce test.
- Cas d'un critère légal ou professionnel précis : c'est le rôle des **exigences impératives** de l'offre (permis, habilitation…) : filtre d'éligibilité vérifié à la main avec justificatif, jamais noté dans le score (`ExigenceImperative`).
- Libellé : « Non concerné (Femme) » → « Non concerné » (modèle `SERVICE_MILITAIRE_CHOICES`, migration `0134`, fiche profil et onboarding). La valeur stockée `NON_CONCERNE` est inchangée : aucune donnée à migrer.
- **Filtres CVthèque liés à l'offre (14/10, option « lier à l'offre » choisie par l'utilisateur)** : permis, véhicule, passeport et situation militaire ne se filtrent plus librement. `ExigenceImperative` a une `categorie` (AUTRE, PERMIS_CONDUIRE, VEHICULE, PASSEPORT, SERVICE_NATIONAL ; migration `0135`, défaut AUTRE donc aucune donnée existante ne change) choisie par le recruteur dans les deux formulaires d'offre (création et modification). `CVThequeView` ne les applique que si `offre_id` désigne une offre **de l'entreprise** qui déclare la catégorie correspondante ; sinon le filtre est **ignoré côté serveur**, même envoyé à la main. La réponse expose `filtres_exigence_autorises` ; l'écran n'affiche que les pastilles autorisées (sinon un texte explique de choisir l'offre dans « Matching IA ») et remet à zéro un filtre qui n'est plus autorisé. Le sexe et l'âge ne sont toujours pas filtrables. Tests : `test_cvtheque_filtres_exigences.py` (9), `CVTheque.test.jsx` (2).
- **Offre des filtres séparée du classement (14/10)** : `offre_id` déclenche le classement par compatibilité (palier Pro+) ; un nouveau paramètre `offre_filtres_id` autorise uniquement les filtres, sans classement, donc à **tous les paliers**. Il prime sur `offre_id` pour les filtres (à défaut, l'offre du « Matching IA » s'applique). Même contrôle d'appartenance à l'entreprise. Un sélecteur « Offre concernée » est dans le panneau de filtres. Le classement par `offre_id` reste refusé en dessous du palier Pro. Tests : `FiltresSansClassementTests` (4, dont un recruteur Starter), `CVTheque.test.jsx`.
- **Limite** : un recruteur peut déclarer une exigence « Permis de conduire » sur une offre qui n'en a pas besoin pour obtenir le filtre. Le seul garde-fou est que l'exigence est affichée publiquement sur l'offre ; il n'y a pas de vérification automatique de sa pertinence.

## 20. Questions disqualifiantes : exigences professionnelles objectives uniquement
- Demande : conserver la fonctionnalité, mais uniquement sur des exigences professionnelles objectives.
- Constat : une question marquée disqualifiante met le score à 0 si la réponse diffère du choix attendu ; le texte étant libre, rien n'empêchait une question sur l'âge, le sexe ou la situation familiale.
- Option choisie par l'utilisateur (14/10) : **justification + garde-fou** (écartées : lier chaque question à une exigence de l'offre, trop lourd et casse les questionnaires réutilisés ; garde-fou seul, sans trace). Détail et limites : SECURITY.md §25.
- Fait : justification professionnelle obligatoire (champ `justification_disqualifiant`, migration `0136`) ; refus 400 d'un texte ou d'un choix visant un critère protégé, avant toute écriture ; validation identique dans la modale de création et la page Questionnaires ; justification visible du candidat (page de l'offre) et de la modération admin.
- À décider : la liste de termes protégés est à relire avec le client (elle peut se compléter dans `jobs/questionnaire_validation.py`) ; les questions disqualifiantes déjà enregistrées n'ont pas de justification (voir SECURITY.md §25).
- Tests : `test_questionnaires_disqualifiantes.py` (11), `Questionnaires.test.jsx`.

## 21. Textes et mentions avant production
- Demande : remplacer les coordonnées de test ; finaliser mentions légales, CGU, politique de confidentialité, adresse / téléphone / emails, réseaux sociaux, informations société ; aucune « validation institutionnelle » sans justificatif ; ne plus écrire « la seule plateforme algérienne avec IA ».
- Choix de l'utilisateur (14/10) : informations **modifiables depuis l'admin** ; l'agrément du Ministère du Travail affiché en page d'accueil est **conservé** (l'utilisateur confirme détenir le justificatif) ; vraies valeurs **pas encore fournies**.
- **Source unique** : le modèle existant `MentionsLegalesEntreprise` (déjà utilisé par les factures) est étendu au lieu d'en créer un second (migration `0137`) : raison sociale, forme juridique, capital, RC, NIF, NIS, TVA, représentant légal, directeur de publication, hébergeur, adresse, téléphone, WhatsApp, e-mail, horaires, liens Facebook / Instagram / LinkedIn. Écran admin « Mentions légales et coordonnées » (même route), validation (liens `http(s)` uniquement, formats téléphone / WhatsApp / e-mail), cache invalidé à l'enregistrement, action d'audit `MODIFIER_INFOS_SOCIETE`. API publique `GET /api/jobs/informations-societe/`.
- **Aucune fausse valeur** : tous les champs sont vides par défaut et **un champ vide n'est jamais affiché**. Lus depuis cette source : pieds de page candidat et recruteur, page Contact (coordonnées et horaires), lien WhatsApp du dashboard recruteur, ligne de pied de page des factures / bulletins / exports PDF (`informations_societe.ligne_pied_de_page`, valeurs échappées pour ReportLab), nouvelle page publique **/mentions-legales** (lien ajouté aux deux pieds de page). Les anciennes coordonnées de test (Gmail personnel, 0770 123 440, pages Facebook / Instagram / LinkedIn) ne sont plus dans le code.
- Textes déjà en base nettoyés par la migration de données `0138` (remplacements exacts : un texte modifié par l'admin n'est pas touché) : coordonnées de test dans les pages CGU / Confidentialité / Formation recruteur et l'avantage « Support prioritaire » ; FAQ : « 100 % conforme à la loi 18-07 », « serveurs localisés en Algérie », « plateforme de paiement agréée », « 100 % sécurisés » remplacés par des formulations non absolues.
- Slogan : « La plateforme de recrutement qui combine intelligence artificielle, expertise RH et accompagnement humain. » (pied de page candidat, pied de page recruteur, page Qui sommes-nous, landing recruteur, sans « algérienne ») ; carte « Conforme Loi 18-07 / 100 % conforme » de la landing recruteur remplacée par « Données personnelles protégées ».
- Tests : `test_informations_societe.py` (12), `Footer.test.jsx` (5, réécrit) ; suite frontend complète 484/484.
- **À faire par vous avant la mise en production (rien n'est inventé dans le code)** :
  1. Renseigner Admin → « Mentions légales et coordonnées » : raison sociale, forme juridique, capital, RC, NIF, NIS, adresse du siège, représentant légal, directeur de la publication, hébergeur, e-mail professionnel, téléphone, WhatsApp, horaires, 3 liens de réseaux sociaux. Tant qu'un champ est vide, il n'apparaît pas : la page Mentions légales sera quasi vide.
  2. Faire relire **CGU et politique de confidentialité** (pages « Pages du site ») par un juriste : le texte injecté au départ est un modèle générique, je ne l'ai pas réécrit.
  3. Vérifier la phrase « serveurs localisés en Algérie » : retirée de la FAQ car non vérifiable ; ne la remettre que si l'hébergement est effectivement en Algérie.
  4. Conserver le justificatif de l'agrément n°14 du 09 mai 2026 (affiché en page d'accueil, `Home.jsx`).
  5. Relire les textes marketing restants contenant des affirmations (« Algorithme de matching intelligent », « CVthèque nationale », etc.) : ils ne citent aucune validation institutionnelle mais restent des promesses commerciales.

## 22. Petites corrections de contenu
- **« Candidatures spontanées »** : vérifié partout (menus, titres de page, notifications, page entreprise, landing, mobile). Orthographe et accents corrects, pluriel pour les listes et menus (« Candidatures spontanées »), singulier pour l'action (« Candidature spontanée », bouton et fenêtre d'envoi). Seule variante : « Spontanées » dans la barre du bas mobile (`BottomNavRecruteur.jsx`), abrégée faute de place. **Rien modifié** : aucune faute trouvée ; si le client vise un autre libellé précis, il suffit de le donner (une seule constante par écran).
- **Éléments obsolètes de l'administration** : inventaire complet (base de développement) : l'ancien système Premium (`PremiumPlan` / `PremiumAvantage`) est déjà supprimé (tables absentes) ; catégories d'articles (3), pages (3), bannières et annonces (0) : rien d'obsolète. Seul reste : la catégorie FAQ **« Premium (obsolète, non affichée) »**, 4 questions actives jamais affichées (aucune page ne lit cette catégorie ; les équivalents sont dans « Abonnements »).
- Validé par l'utilisateur (14/10) : **sauvegarder puis supprimer**. Sauvegarde : [faq-premium-obsolete-sauvegarde-2026-10-14.json](faq-premium-obsolete-sauvegarde-2026-10-14.json) (ids 11 à 14, texte intégral). Supprimées une à une par identifiant exact dans la base de développement. Code nettoyé : catégorie `PREMIUM` retirée des choix de `FaqItem` (migration `0139`), traitement spécial « obsolète » retiré de `AdminFaq.jsx`, test CMS passé sur « PALIERS ».
- **À faire sur la production (aucun script lancé)** : Admin → FAQ, supprimer à la main les éventuelles questions encore rangées en « PREMIUM » (elles apparaissent avec l'étiquette brute « PREMIUM » ; elles ne sont plus modifiables, seulement supprimables). Le contenu d'origine est dans la sauvegarde ci-dessus si besoin de le reprendre pour les paliers.
- Tests : `test_api_cms.py` (45), `AdminFaq.test.jsx` (8) ; build Vite OK.

## 23. Validation / rejet des métiers suggérés
- Demande : le cycle de validation qui existe pour les compétences (et la file « Formations à vérifier » pour les spécialités) doit exister aussi pour les métiers.
- **Constat** : aucun endroit où un métier manquant s'accumulait. Le matching ne devine jamais un métier (`resoudre_metier_depuis_texte` : correspondance exacte ou rien) et un recruteur ou un candidat doit choisir un métier dans la liste ; en base de développement, 0 intitulé sans métier. Une détection automatique comme celle des compétences n'aurait rien trouvé : il fallait d'abord un moyen de **proposer**.
- Choix de l'utilisateur (14/10) : (1) **les utilisateurs proposent** (candidats et recruteurs), (2) **l'admin choisit l'issue** de la validation.
- **Envoi** : lien « Je ne trouve pas mon métier » (prop `proposable` de `MetierAutocomplete`, au-delà de 3 caractères) dans la création et la modification d'offre, le profil, les préférences et l'assistant d'inscription du candidat ; **jamais** sur les filtres de recherche ni côté admin. Fenêtre `ProposerMetierModal` (portail, sans `<form>` car elle s'ouvre depuis des formulaires). `POST referentiel/metiers/proposer/`.
- **Garde-fous** (`jobs/propositions_metier.py`) : réservé aux candidats et aux recruteurs rattachés à une entreprise ; intitulé de 3 à 120 caractères avec au moins une lettre ; refusé si le métier existe déjà (même avec d'autres accents ou une autre casse) ou a déjà été rejeté ; une seule proposition ouverte par libellé normalisé (contrainte en base, sûre en cas de requêtes simultanées) : une demande identique s'y ajoute, un même compte ne compte qu'une fois ; **5 propositions ouvertes maximum par compte** ; limite d'envois `write_action` (30/h).
- **Aucun effet avant décision** : une proposition ne crée aucun métier ni aucune appellation, ne rattache aucun profil ni aucune offre, ne change aucun score.
- **Décision admin** (`PropositionMetier`, migration `0140`, cycle Suggéré → Validé | Rejeté, Rejeté → Validé en réexamen) : **Rattacher** (l'intitulé devient une appellation d'un métier existant, canonique et sélectionnable : le plus courant, sans doublon, le métier garde ses compétences et formations suggérées), **Créer un nouveau métier** (groupe choisi parmi les domaines et sous-domaines ; le nouveau métier n'a ni compétences ni formations suggérées), ou **Rejeter** avec motif obligatoire (5 à 500 caractères). Décisions sous verrou de ligne (pas de double validation), refus si le libellé existe déjà comme appellation, journal d'audit `STATUT_METIER`, **notification** aux demandeurs (acceptée ; ou refusée avec le motif).
- **Interface admin** : page « Métiers suggérés » (`/admin-taftech/metiers-suggeres`, barre latérale avec badge des propositions à examiner `metiers_a_valider`) : onglets avec compteurs, demandeurs, métiers proches proposés pour rattacher, groupes chargés à la demande.
- **Limites** : la liste est limitée aux 100 propositions les plus récentes du statut choisi ; la détection de « métiers proches » est une recherche par mot, une aide et pas une décision ; un nouveau métier créé ne reprend ni compétences ni formations suggérées (à compléter via l'import du référentiel) ; la fusion ou l'équivalence de métiers reste réservée à `referentiel_fusions.py` (règle du projet).
- Tests : `test_propositions_metier.py` (19), `AdminMetiersSuggeres.test.jsx` (7), `ProposerMetier.test.jsx` (5).

## État des vérifications
- Documentation : points 1 à 23 dans ce fichier, `docs/fonctionnel/` et `SECURITY.md` §21 à §27.
- Tests (14/10/2026, sur le code final des points 1 à 23) : **backend complet 808 tests OK** ; **frontend complet 496 tests OK (74 fichiers)** ; `npm run build` OK. Migrations `0130` à `0140` appliquées sur la base de développement.
- Commit, push et merge vers `main` : effectués le 14/10/2026 sur demande explicite de l'utilisateur (voir l'historique git).
