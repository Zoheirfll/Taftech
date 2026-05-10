from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator

# ==========================================
# 1. LES LISTES STANDARDISÉES (Constantes)
# ==========================================

WILAYAS_CHOICES = [
    ('01 - Adrar', '01 - Adrar'), ('02 - Chlef', '02 - Chlef'), ('03 - Laghouat', '03 - Laghouat'),
    ('04 - Oum El Bouaghi', '04 - Oum El Bouaghi'), ('05 - Batna', '05 - Batna'), ('06 - Béjaïa', '06 - Béjaïa'),
    ('07 - Biskra', '07 - Biskra'), ('08 - Béchar', '08 - Béchar'), ('09 - Blida', '09 - Blida'),
    ('10 - Bouira', '10 - Bouira'), ('11 - Tamanrasset', '11 - Tamanrasset'), ('12 - Tébessa', '12 - Tébessa'),
    ('13 - Tlemcen', '13 - Tlemcen'), ('14 - Tiaret', '14 - Tiaret'), ('15 - Tizi Ouzou', '15 - Tizi Ouzou'),
    ('16 - Alger', '16 - Alger'), ('17 - Djelfa', '17 - Djelfa'), ('18 - Jijel', '18 - Jijel'),
    ('19 - Sétif', '19 - Sétif'), ('20 - Saïda', '20 - Saïda'), ('21 - Skikda', '21 - Skikda'),
    ('22 - Sidi Bel Abbès', '22 - Sidi Bel Abbès'), ('23 - Annaba', '23 - Annaba'), ('24 - Guelma', '24 - Guelma'),
    ('25 - Constantine', '25 - Constantine'), ('26 - Médéa', '26 - Médéa'), ('27 - Mostaganem', '27 - Mostaganem'),
    ('28 - M\'Sila', '28 - M\'Sila'), ('29 - Mascara', '29 - Mascara'), ('30 - Ouargla', '30 - Ouargla'),
    ('31 - Oran', '31 - Oran'), ('32 - El Bayadh', '32 - El Bayadh'), ('33 - Illizi', '33 - Illizi'),
    ('34 - Bordj Bou Arréridj', '34 - Bordj Bou Arréridj'), ('35 - Boumerdès', '35 - Boumerdès'), 
    ('36 - El Tarf', '36 - El Tarf'), ('37 - Tindouf', '37 - Tindouf'), ('38 - Tissemsilt', '38 - Tissemsilt'),
    ('39 - El Oued', '39 - El Oued'), ('40 - Khenchela', '40 - Khenchela'), ('41 - Souk Ahras', '41 - Souk Ahras'),
    ('42 - Tipaza', '42 - Tipaza'), ('43 - Mila', '43 - Mila'), ('44 - Aïn Defla', '44 - Aïn Defla'),
    ('45 - Naâma', '45 - Naâma'), ('46 - Aïn Témouchent', '46 - Aïn Témouchent'), ('47 - Ghardaïa', '47 - Ghardaïa'),
    ('48 - Relizane', '48 - Relizane'), ('49 - Timimoun', '49 - Timimoun'), ('50 - Bordj Badji Mokhtar', '50 - Bordj Badji Mokhtar'),
    ('51 - Ouled Djellal', '51 - Ouled Djellal'), ('52 - Béni Abbès', '52 - Béni Abbès'), ('53 - In Salah', '53 - In Salah'),
    ('54 - In Guezzam', '54 - In Guezzam'), ('55 - Touggourt', '55 - Touggourt'), ('56 - Djanet', '56 - Djanet'),
    ('57 - El M\'Ghair', '57 - El M\'Ghair'), ('58 - El Meniaa', '58 - El Meniaa'),
]

SECTEURS_CHOICES = [
    ('COMMERCIAL', 'Commercial, Technico Commercial, Service Client'),
    ('PRODUCTION', 'Production, Méthode, Industrie'),
    ('FINANCE', 'Comptabilité, Finance'),
    ('LOGISTIQUE', 'Logistique, Achat, Stock, Transport'),
    ('MARKETING', 'Marketing, Communication'),
    ('IT', 'Informatique, Systèmes d\'Information, Internet'),
    ('BTP', 'Chantier, Métiers BTP, Architecture'),
    ('ADMIN', 'Administration, Moyens Généraux'),
    ('VENTE', 'Vente, Télévente, Assistanat'),
    ('BANQUE', 'Métiers Banque et Assurances'),
    ('SANTE', 'Santé, Médical, Pharmacie'),
    ('INGENIERIE', 'Ingénierie, Etudes, Projet, R&D'),
    ('RH', 'RH, Personnel, Formation'),
    ('AUTRE', 'Autre'),
    ('SECRETARIAT', 'Assistanat, Secrétariat'),
    ('QSE', 'Qualité, Sécurité, Environnement'),
    ('TOURISME', 'Hôtellerie, Tourisme, Restauration, Loisirs'),
    ('MAINTENANCE', 'Maintenance, Entretien'),
    ('JURIDIQUE', 'Juridique, Fiscal, Audit, Conseil'),
    ('GRANDS_COMPTES', 'Responsable Commercial, Grands Comptes'),
]

DIPLOMES_CHOICES = [
    ('NIVEAU_SECONDAIRE', 'Niveau Secondaire'),
    ('NIVEAU_TERMINAL', 'Niveau Terminal'),
    ('BACCALAUREAT', 'Baccalauréat'),
    ('TS', 'TS Bac +2'),
    ('LICENCE', 'Licence (LMD), Bac + 3'),
    ('MASTER_1', 'Master 1, Licence Bac + 4'),
    ('MASTER_2', 'Master 2, Ingéniorat, Bac + 5'),
    ('MAGISTERE', 'Magistère Bac + 7'),
    ('DOCTORAT', 'Doctorat'),
    ('NON_DIPLOMANTE', 'Non Diplômante'),
    ('FORMATION_PRO', 'Formation Professionnelle'),
    ('UNIVERSITAIRE_SANS_DIPLOME', 'Universitaire Sans Diplôme'),
    ('CERTIFICATION', 'Certification'),
]

NIVEAUX_EXPERIENCE = [
    ('DEBUTANT', 'Débutant / Junior'),
    ('JEUNE_DIPLOME', 'Jeune Diplômé'),
    ('STAGIAIRE', 'Stagiaire / Etudiant'),
    ('CONFIRME', 'Confirmé / Expérimenté'),
    ('MANAGER', 'Manager / Responsable Département'),
    ('RESPONSABLE_EQUIPE', 'Responsable d\'Équipe'),
    ('CADRE_DIRIGEANT', 'Cadre Dirigeant'),
]

TYPES_CONTRAT = [
    ('CDI', 'CDI'),
    ('CDD', 'CDD'),
    ('ANEM', 'Contrat ANEM (CTA / DAIP)'),
    ('STAGE', 'Stage / PFE'),
    ('FREELANCE', 'Freelance'),
    ('TEMPS_PARTIEL', 'Temps Partiel'),
]


# ==========================================
# 2. LES MODÈLES DE BASE DE DONNÉES
# ==========================================

class ProfilEntreprise(models.Model):
    """
    Représente la "Page Entreprise" (Le recruteur).
    Relié au compte CustomUser (qui a le rôle RECRUTEUR).
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_entreprise')
    nom_entreprise = models.CharField(max_length=150, verbose_name="Nom de l'entreprise")
    est_approuvee = models.BooleanField(default=False, verbose_name="Entreprise approuvée")
    
    # Listes appliquées ici :
    secteur_activite = models.CharField(max_length=100, choices=SECTEURS_CHOICES, verbose_name="Secteur d'activité")
    wilaya_siege = models.CharField(max_length=100, choices=WILAYAS_CHOICES, verbose_name="Wilaya du siège social")
    
    # 👇 NOUVEAU : Ajout du champ pour la commune du siège 👇
    commune_siege = models.CharField(max_length=150, blank=True, null=True, verbose_name="Commune du siège")
    
    registre_commerce = models.CharField(max_length=50, unique=True, verbose_name="Numéro de Registre de Commerce (RC)")
    description = models.TextField(blank=True, null=True, verbose_name="Présentation de l'entreprise")
    logo = models.ImageField(upload_to='logos_entreprises/', blank=True, null=True)
    est_premium = models.BooleanField(default=False, verbose_name="Compte Premium (Accès CVthèque)")

    def __str__(self):
        return self.nom_entreprise


class OffreEmploi(models.Model):
    """
    Représente une offre d'emploi structurée comme sur Emploitic.
    """
    STATUTS_MODERATION = (
        ('EN_ATTENTE', 'En attente de validation'),
        ('APPROUVEE', 'Approuvée et en ligne'),
        ('REJETEE', 'Rejetée (à corriger)'), 
    )

    entreprise = models.ForeignKey('ProfilEntreprise', on_delete=models.CASCADE, related_name='offres')
    titre = models.CharField(max_length=200, verbose_name="Titre du poste")
    
    # Listes appliquées ici :
    wilaya = models.CharField(max_length=100, choices=WILAYAS_CHOICES, verbose_name="Lieu de travail (Wilaya)")
    commune = models.CharField(max_length=100, blank=True, null=True, verbose_name="Commune")
    diplome = models.CharField(max_length=100, choices=DIPLOMES_CHOICES, blank=True, null=True, verbose_name="Diplôme requis")
    specialite = models.CharField(max_length=100, choices=SECTEURS_CHOICES, blank=True, null=True, verbose_name="Spécialité / Secteur")
    type_contrat = models.CharField(max_length=50, choices=TYPES_CONTRAT, default='CDI')
    experience_requise = models.CharField(max_length=50, choices=NIVEAUX_EXPERIENCE, default='DEBUTANT')
    
    description = models.TextField(blank=True, null=True, verbose_name="Description générale")
    missions = models.TextField(blank=True, null=True, verbose_name="Missions du poste")
    profil_recherche = models.TextField(blank=True, null=True, verbose_name="Profil recherché (Exigences)")
    salaire_propose = models.CharField(max_length=100, blank=True, null=True, help_text="Ex: 68 000 DA Net")
    
    date_publication = models.DateTimeField(auto_now_add=True)
    est_active = models.BooleanField(default=True, verbose_name="Offre visible")
    statut_moderation = models.CharField(max_length=20, choices=STATUTS_MODERATION, default='EN_ATTENTE')
    motif_rejet = models.TextField(blank=True, null=True)
    est_cloturee = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.titre} - {self.entreprise.nom_entreprise}"


class Candidature(models.Model):
    """
    Représente la candidature d'un utilisateur à une offre (Connecté OU Rapide).
    """
    STATUTS = (
        ('RECUE', '🟡 Candidature reçue'),
        ('EN_COURS', '🔵 En cours d’étude'),
        ('ENTRETIEN', '🟠 Entretien programmé'),
        ('RETENU', '🟢 Candidat retenu'),
        ('REFUSE', '🔴 Candidat refusé'),
    )

    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='candidatures')
    
    # 👇 MODIFIÉ : null=True, blank=True car un visiteur rapide n'a pas de compte
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='candidatures', null=True, blank=True)
    
    # 👇 NOUVEAUX CHAMPS POUR LA POSTULATION RAPIDE 👇
    est_rapide = models.BooleanField(default=False, verbose_name="Postulation Rapide")
    nom_rapide = models.CharField(max_length=150, blank=True, null=True)
    prenom_rapide = models.CharField(max_length=150, blank=True, null=True)
    email_rapide = models.EmailField(blank=True, null=True)
    telephone_rapide = models.CharField(max_length=50, blank=True, null=True)
    cv_rapide = models.FileField(
        upload_to='cv_rapide/', 
        blank=True, 
        null=True, 
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx'])]
    )

    date_postulation = models.DateTimeField(auto_now_add=True)
    lettre_motivation = models.TextField(blank=True, null=True, verbose_name="Lettre de motivation (Optionnelle)")
    lettre_motivation_file = models.FileField(
        upload_to='lettres_motivation/', 
        blank=True, 
        null=True, 
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx'])],
        verbose_name="Lettre de motivation (Fichier)"
    )
    
    statut = models.CharField(max_length=20, choices=STATUTS, default='RECUE')
    date_entretien = models.DateTimeField(null=True, blank=True, verbose_name="Date et heure de l'entretien")
    message_entretien = models.TextField(blank=True, null=True, verbose_name="Message du recruteur")
    score_matching = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        verbose_name="Score de correspondance (%)"
    )
    
    details_matching = models.JSONField(
        null=True, 
        blank=True, 
        verbose_name="Détails du Matching"
    )
# ==========================================
    # 👇 NOUVEAUX CHAMPS : ÉVALUATION POST-ENTRETIEN (US 5) 👇
    # ==========================================
    note_technique = models.IntegerField(null=True, blank=True, verbose_name="Compétence technique (1-5)")
    note_communication = models.IntegerField(null=True, blank=True, verbose_name="Communication (1-5)")
    note_motivation = models.IntegerField(null=True, blank=True, verbose_name="Motivation (1-5)")
    note_experience = models.IntegerField(null=True, blank=True, verbose_name="Expérience pertinente (1-5)")
    note_globale = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, verbose_name="Note globale (/20)")
    commentaire_evaluation = models.TextField(blank=True, null=True, verbose_name="Commentaire (privé recruteur)")
    
    def __str__(self):
        nom = self.candidat.username if self.candidat else f"{self.nom_rapide} {self.prenom_rapide} (Rapide)"
        score_display = f" - {self.score_matching}%" if self.score_matching else ""
        return f"{nom} -> {self.offre.titre}{score_display}"

class ProfilCandidat(models.Model):
    """
    Profil étendu pour un candidat, contenant son CV et toutes ses préférences.
    """
    SITUATION_ACTUELLE = [
        ('EN_RECHERCHE', 'En recherche active'),
        ('EN_POSTE', 'En poste'),
        ('A_L_ECOUTE', 'À l\'écoute du marché'),
        ('ETUDIANT', 'Étudiant'),
    ]
    
    MOBILITE_CHOICES = [
        ('LOCALE', 'Locale (Wilaya)'),
        ('REGIONALE', 'Régionale'),
        ('NATIONALE', 'Nationale'),
        ('INTERNATIONALE', 'Internationale'),
    ]

    SERVICE_MILITAIRE_CHOICES = [
        ('NON_CONCERNE', 'Non concerné (Femme)'),
        ('DEGAGE', 'Dégagé'),
        ('SURSITAIRE', 'Sursitaire'),
        ('INAPTE', 'Inapte'),
        ('INCORPORE', 'Incorporé'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_candidat')
    titre_professionnel = models.CharField(max_length=150, blank=True, null=True)
    date_naissance = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    
    cv_pdf = models.FileField(upload_to='cvs/', blank=True, null=True, validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx'])])
    photo_profil = models.ImageField(upload_to='photos_profil/', blank=True, null=True, verbose_name="Photo de profil")

    # --- NOUVEAU : INFOS LOCALISATION (Samira) ---
    wilaya = models.CharField(max_length=100, choices=WILAYAS_CHOICES, blank=True, null=True, verbose_name="Wilaya de résidence")
    commune = models.CharField(max_length=100, blank=True, null=True, verbose_name="Commune")

    # --- INFOS ADMINISTRATIVES ---
    service_militaire = models.CharField(max_length=50, choices=SERVICE_MILITAIRE_CHOICES, blank=True, null=True)
    permis_conduire = models.BooleanField(default=False, verbose_name="Permis de conduire")
    vehicule_personnel = models.BooleanField(default=False, verbose_name="Véhiculé") 
    passeport_valide = models.BooleanField(default=False, verbose_name="Passeport valide")

    # --- PRÉFÉRENCES DE RECRUTEMENT ---
    secteur_souhaite = models.CharField(max_length=100, choices=SECTEURS_CHOICES, blank=True, null=True)
    salaire_souhaite = models.CharField(max_length=100, blank=True, null=True, help_text="Ex: 80 000 DA")
    mobilite = models.CharField(max_length=50, choices=MOBILITE_CHOICES, blank=True, null=True)
    situation_actuelle = models.CharField(max_length=50, choices=SITUATION_ACTUELLE, blank=True, null=True)

    # --- ANCIENS CHAMPS GARDÉS ---
    diplome = models.CharField(max_length=100, choices=DIPLOMES_CHOICES, blank=True, null=True, verbose_name="Diplôme")
    specialite = models.CharField(max_length=100, choices=SECTEURS_CHOICES, blank=True, null=True, verbose_name="Spécialité / Secteur")
    experiences = models.TextField(blank=True, null=True, verbose_name="Expériences")
    competences = models.TextField(blank=True, null=True, verbose_name="Compétences")
    langues = models.CharField(max_length=255, blank=True, null=True, verbose_name="Langues")
    
    # --- PARAMÈTRES ET NOTIFICATIONS (UX Emploitic) ---
    notif_offres_exclusives = models.BooleanField(default=True, verbose_name="Offres exclusives et partenaires")
    notif_newsletter = models.BooleanField(default=True, verbose_name="Actualités et newsletter")
    notif_mise_a_jour = models.BooleanField(default=True, verbose_name="Emails de mise à jour")
    niveau_experience = models.CharField(max_length=50, choices=NIVEAUX_EXPERIENCE, blank=True, null=True, verbose_name="Niveau d'expérience global")
    
    def __str__(self):
        return f"Profil de {self.user.username}"
class ExperienceCandidat(models.Model):
    """
    Table pour stocker chaque expérience professionnelle séparément (comme les cartes Emploitic)
    """
    profil = models.ForeignKey(ProfilCandidat, on_delete=models.CASCADE, related_name='experiences_detail')
    titre_poste = models.CharField(max_length=200, verbose_name="Titre du poste (Ex: Développeur Front-End)")
    entreprise = models.CharField(max_length=200, verbose_name="Nom de l'entreprise")
    
    date_debut = models.DateField(verbose_name="Date de début")
    date_fin = models.DateField(null=True, blank=True, verbose_name="Date de fin (Vide si toujours en poste)")
    
    description = models.TextField(blank=True, null=True, verbose_name="Missions et réalisations")

    class Meta:
        ordering = ['-date_debut'] # Trie automatiquement de la plus récente à la plus ancienne

    def __str__(self):
        return f"{self.titre_poste} chez {self.entreprise}"


class FormationCandidat(models.Model):
    """
    Table pour stocker chaque diplôme/formation séparément
    """
    profil = models.ForeignKey(ProfilCandidat, on_delete=models.CASCADE, related_name='formations_detail')
    diplome = models.CharField(max_length=200, verbose_name="Nom de la formation ou diplôme")
    etablissement = models.CharField(max_length=200, verbose_name="Université ou École")
    
    date_debut = models.DateField(verbose_name="Date de début")
    date_fin = models.DateField(null=True, blank=True, verbose_name="Date de fin")
    
    description = models.TextField(blank=True, null=True, verbose_name="Description ou mention")

    class Meta:
        ordering = ['-date_fin']

    def __str__(self):
        return f"{self.diplome} - {self.etablissement}"

# ==========================================
# 3. FONCTIONNALITÉS AVANCÉES DU CANDIDAT
# ==========================================

class OffreSauvegardee(models.Model):
    """
    Table pour stocker les offres mises en favoris (sauvegardées) par le candidat.
    """
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='offres_sauvegardees')
    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='sauvegardee_par')
    date_sauvegarde = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Un candidat ne peut pas sauvegarder la même offre deux fois
        unique_together = ('candidat', 'offre')
        ordering = ['-date_sauvegarde']

    def __str__(self):
        return f"{self.candidat.username} a sauvegardé l'offre : {self.offre.titre}"


class AlerteEmploi(models.Model):
    """
    Table pour gérer les alertes (notifications envoyées par email selon des critères).
    """
    FREQUENCE_CHOICES = [
        ('QUOTIDIENNE', 'Quotidienne'),
        ('HEBDOMADAIRE', 'Hebdomadaire'),
    ]

    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='alertes')
    mots_cles = models.CharField(max_length=255, verbose_name="Mots clés")
    # On réutilise ta liste de wilayas
    wilaya = models.CharField(max_length=100, choices=WILAYAS_CHOICES, blank=True, null=True, verbose_name="Région, Wilaya")
    frequence = models.CharField(max_length=20, choices=FREQUENCE_CHOICES, default='QUOTIDIENNE')
    
    date_creation = models.DateTimeField(auto_now_add=True)
    est_active = models.BooleanField(default=True, verbose_name="Alerte activée")

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"Alerte de {self.candidat.username} - {self.mots_cles}"

class Notification(models.Model):
    """
    Boîte de réception du candidat : Stocke les messages automatiques du système 
    et les convocations aux entretiens.
    """
    TYPES_NOTIF = (
        ('INFO', 'Information'),
        ('ENTRETIEN', 'Entretien programmé'),
        ('RETENU', 'Candidature retenue'),
        ('REFUS', 'Candidature refusée'),
        ('ALERTE', 'Alerte Emploi'),
    )

    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type_notif = models.CharField(max_length=20, choices=TYPES_NOTIF, default='INFO')
    titre = models.CharField(max_length=200)
    message = models.TextField()
    lue = models.BooleanField(default=False, verbose_name="Message lu")
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation'] # Les messages les plus récents en premier

    def __str__(self):
        return f"{self.get_type_notif_display()} pour {self.destinataire.username}"
