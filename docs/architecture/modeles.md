# Modèles Django

> Liste des modèles principaux (le code fait foi : taftech_backend/jobs/models/). Index : [../README.md](../README.md)

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

