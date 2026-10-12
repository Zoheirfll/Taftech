# Décisions techniques et points d'attention

> Pourquoi le code est ainsi, et les pièges connus. Index : [README.md](README.md)

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

