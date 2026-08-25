from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from .validators import validate_document_mime, validate_image_mime, validate_file_size
from .constants import (
    WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)

class ProfilEntreprise(models.Model):
    """
    Représente la "Page Entreprise" (Le recruteur).
    Relié au compte CustomUser (qui a le rôle RECRUTEUR).
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_entreprise')
    nom_entreprise = models.CharField(max_length=150, verbose_name="Nom de l'entreprise")
    slug = models.SlugField(max_length=180, unique=True, blank=True, verbose_name="Slug URL")
    est_approuvee = models.BooleanField(default=False, verbose_name="Entreprise approuvée")
    
    # Listes appliquées ici :
    secteur_activite = models.CharField(max_length=100, choices=SECTEURS_CHOICES, verbose_name="Secteur d'activité")
    wilaya_siege = models.CharField(max_length=100, choices=WILAYAS_CHOICES, verbose_name="Wilaya du siège social")
    
    # 👇 NOUVEAU : Ajout du champ pour la commune du siège 👇
    commune_siege = models.CharField(max_length=150, blank=True, null=True, verbose_name="Commune du siège")
    adresse_complete = models.CharField(max_length=255, blank=True, null=True, verbose_name="Adresse complète (pour la carte)")
    
    registre_commerce = models.CharField(max_length=50, unique=True, verbose_name="Numéro de Registre de Commerce (RC)")
    description = models.TextField(blank=True, null=True, verbose_name="Présentation de l'entreprise")
    logo = models.ImageField(
        upload_to='logos_entreprises/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(2),
        ]
    )
    taille_entreprise = models.CharField(
        max_length=10,
        choices=TAILLES_ENTREPRISE_CHOICES,
        blank=True,
        null=True,
        verbose_name="Taille de l'entreprise (effectif)"
    )
    banniere = models.ImageField(
        upload_to='bannieres_entreprises/',
        blank=True,
        null=True,
        verbose_name="Bannière (page vitrine)",
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(5),
        ]
    )
    culture_entreprise = models.TextField(blank=True, null=True, verbose_name="Culture d'entreprise")
    annee_creation = models.PositiveIntegerField(
        blank=True, null=True,
        validators=[MinValueValidator(1900)],
        verbose_name="Année de création de l'entreprise",
    )
    est_premium = models.BooleanField(default=False, verbose_name="Compte Premium (Accès CVthèque)")
    premium_expire_at = models.DateTimeField(null=True, blank=True, verbose_name="Premium expire le")
    mise_en_avant_accueil = models.BooleanField(
        default=False, verbose_name='Afficher dans "Ils nous font confiance" (logos clients)'
    )

    @property
    def est_premium_actif(self):
        if not self.est_premium:
            return False
        if self.premium_expire_at is None:
            return True
        from django.utils import timezone
        return self.premium_expire_at > timezone.now()
    
    linkedin = models.URLField(blank=True, null=True, verbose_name="Lien LinkedIn entreprise")
    site_web = models.URLField(blank=True, null=True, verbose_name="Site web de l'entreprise")

    email_refus_auto = models.BooleanField(default=False)
    message_refus_auto = models.TextField(
    blank=True,
    default="Bonjour {prenom},\n\nNous avons bien étudié votre candidature pour le poste de {titre_offre} et nous avons le regret de vous informer qu'elle n'a pas été retenue.\n\nNous vous remercions de l'intérêt que vous portez à {nom_entreprise} et vous souhaitons bonne chance dans vos recherches.\n\nCordialement,\nL'équipe {nom_entreprise}"
)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.nom_entreprise)
            slug = base
            n = 1
            while ProfilEntreprise.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom_entreprise


class EntreprisePhoto(models.Model):
    """Galerie photo de la page vitrine entreprise (bureaux, équipe, événements...)."""
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(
        upload_to='photos_entreprises/',
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(3),
        ]
    )
    legende = models.CharField(max_length=150, blank=True, null=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_ajout']

    def __str__(self):
        return f"Photo {self.entreprise.nom_entreprise} — {self.date_ajout:%d/%m/%Y}"


class Secteur(models.Model):
    """Nomenclature ANEM — niveau 1 (ex: 'A' = Agriculture et pêche)."""
    code = models.CharField(max_length=5, unique=True)
    libelle = models.CharField(max_length=150)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} — {self.libelle}"


class Domaine(models.Model):
    """Nomenclature ANEM — niveau 2 (ex: 'A11' = Espaces naturels et espaces verts)."""
    secteur = models.ForeignKey(Secteur, on_delete=models.CASCADE, related_name='domaines')
    code = models.CharField(max_length=10, unique=True)
    libelle = models.CharField(max_length=200)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} — {self.libelle}"


class SousDomaine(models.Model):
    """Nomenclature ANEM — niveau 3, optionnel (absent pour la plupart des domaines)."""
    domaine = models.ForeignKey(Domaine, on_delete=models.CASCADE, related_name='sous_domaines')
    libelle = models.CharField(max_length=200)

    def __str__(self):
        return self.libelle


class MetierReferentiel(models.Model):
    """Nomenclature ANEM — niveau 5, une ligne par appellation de poste (ex: 'Élagueur-grimpeur')."""
    titre = models.CharField(max_length=200)
    domaine = models.ForeignKey(Domaine, null=True, blank=True, on_delete=models.CASCADE, related_name='metiers')
    sous_domaine = models.ForeignKey(SousDomaine, null=True, blank=True, on_delete=models.SET_NULL, related_name='metiers')
    code_fiche = models.CharField(max_length=10, blank=True, default='', db_index=True)
    fiche_metier = models.CharField(max_length=200, blank=True)
    secteur_code = models.CharField(max_length=5, blank=True, default='', db_index=True)
    est_actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['secteur_code', 'titre']

    def __str__(self):
        return f"{self.titre} — {self.secteur_code}"

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
    code_public = models.CharField(
        max_length=8, unique=True, blank=True, null=True,
        verbose_name="Code public (URL SEO)",
        help_text="Code court aléatoire utilisé dans l'URL publique de l'offre, généré automatiquement.",
    )
    
    # Listes appliquées ici :
    wilaya = models.CharField(max_length=100, choices=WILAYAS_CHOICES, verbose_name="Lieu de travail (Wilaya)")
    commune = models.CharField(max_length=100, blank=True, null=True, verbose_name="Commune")
    diplome = models.CharField(max_length=100, choices=DIPLOMES_CHOICES, blank=True, null=True, verbose_name="Diplôme requis")
    specialite = models.CharField(max_length=100, blank=True, null=True, verbose_name="Spécialité (code Domaine ANEM)")
    type_contrat = models.CharField(max_length=50, choices=TYPES_CONTRAT, default='CDI')
    experience_requise = models.CharField(max_length=50, choices=NIVEAUX_EXPERIENCE, default='DEBUTANT')
    nombre_postes = models.PositiveIntegerField(default=1, verbose_name="Nombre de postes à pourvoir")
    
    description = models.TextField(blank=True, null=True, verbose_name="Description générale")
    missions = models.TextField(blank=True, null=True, verbose_name="Missions du poste")
    profil_recherche = models.TextField(blank=True, null=True, verbose_name="Profil recherché (Exigences)")
    competences = models.TextField(blank=True, null=True, verbose_name="Compétences requises")
    salaire_propose = models.CharField(max_length=100, blank=True, null=True, help_text="Ex: 68 000 DA Net")
    
    date_publication = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateField(null=True, blank=True, verbose_name="Date d'expiration automatique")
    est_active = models.BooleanField(default=True, verbose_name="Offre visible")
    statut_moderation = models.CharField(max_length=20, choices=STATUTS_MODERATION, default='EN_ATTENTE')
    motif_rejet = models.TextField(blank=True, null=True)
    est_cloturee = models.BooleanField(default=False)
    questionnaire = models.ForeignKey('Questionnaire', on_delete=models.SET_NULL, null=True, blank=True, related_name='offres')

    def save(self, *args, **kwargs):
        if not self.code_public:
            import random
            import string
            alphabet = string.ascii_lowercase + string.digits
            code = ''.join(random.choices(alphabet, k=6))
            while OffreEmploi.objects.filter(code_public=code).exclude(pk=self.pk).exists():
                code = ''.join(random.choices(alphabet, k=6))
            self.code_public = code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.titre} - {self.entreprise.nom_entreprise}"


class Candidature(models.Model):
    """
    Représente la candidature d'un utilisateur à une offre (Connecté OU Rapide).
    """
    STATUTS = (
        ('RECUE', '🟡 Candidature reçue'),
        ('EN_COURS', '🔵 En cours d’étude'),
        ('PRESELECTION', '🟣 Présélectionné'),
        ('ENTRETIEN', '🟠 Entretien programmé'),
        ('RETENU', '🟢 Candidat retenu'),
        ('REFUSE', '🔴 Candidat refusé'),
    )

    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='candidatures')
    
    # 👇 MODIFIÉ : null=True, blank=True car un visiteur rapide n'a pas de compte
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='candidatures', null=True, blank=True)
    
    SOURCE_CHOICES = (
        ('SITE', 'Site TafTech'),
        ('CVTHEQUE', 'Invitation CVthèque'),
        ('AUTRE', 'Autre'),
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='SITE', verbose_name="Source de la candidature")

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
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx']),
            validate_document_mime,
            validate_file_size(5),
        ]
    )

    date_postulation = models.DateTimeField(auto_now_add=True)
    lettre_motivation = models.TextField(blank=True, null=True, verbose_name="Lettre de motivation (Optionnelle)")
    lettre_motivation_file = models.FileField(
        upload_to='lettres_motivation/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx']),
            validate_document_mime,
            validate_file_size(5),
        ],
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
    profil_snapshot = models.JSONField(null=True, blank=True)    
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
    
    cv_pdf = models.FileField(
        upload_to='cvs/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx']),
            validate_document_mime,
            validate_file_size(5),
        ]
    )
    cv_pdf_maj_le = models.DateTimeField(null=True, blank=True, verbose_name="Dernière mise à jour du CV")
    photo_profil = models.ImageField(
        upload_to='photos_profil/',
        blank=True,
        null=True,
        verbose_name="Photo de profil",
        validators=[
            validate_image_mime,
            validate_file_size(2),
        ]
    )
    # --- NOUVEAU : RÉSEAUX ET BIO EXTRAITS PAR L'IA ---
    bio = models.TextField(blank=True, null=True, verbose_name="Résumé de profil / Bio")
    linkedin = models.URLField(blank=True, null=True, verbose_name="Lien LinkedIn")
    github = models.URLField(blank=True, null=True, verbose_name="Lien GitHub")

    # --- NOUVEAU : INFOS LOCALISATION (Samira) ---
    wilaya = models.CharField(max_length=100, choices=WILAYAS_CHOICES, blank=True, null=True, verbose_name="Wilaya de résidence")
    commune = models.CharField(max_length=100, blank=True, null=True, verbose_name="Commune")
    adresse = models.CharField(max_length=255, blank=True, null=True, verbose_name="Adresse")

    # --- INFOS ADMINISTRATIVES ---
    service_militaire = models.CharField(max_length=50, choices=SERVICE_MILITAIRE_CHOICES, blank=True, null=True)
    permis_conduire = models.BooleanField(default=False, verbose_name="Permis de conduire")
    vehicule_personnel = models.BooleanField(default=False, verbose_name="Véhiculé") 
    passeport_valide = models.BooleanField(default=False, verbose_name="Passeport valide")

    # --- PRÉFÉRENCES DE RECRUTEMENT ---
    secteur_souhaite = models.CharField(max_length=100, blank=True, null=True, verbose_name="Domaine souhaité (code ANEM)")
    salaire_souhaite = models.CharField(max_length=100, blank=True, null=True, help_text="Ex: 80 000 DA")
    mobilite = models.CharField(max_length=50, choices=MOBILITE_CHOICES, blank=True, null=True)
    situation_actuelle = models.CharField(max_length=50, choices=SITUATION_ACTUELLE, blank=True, null=True)

    # --- ANCIENS CHAMPS GARDÉS ---
    diplome = models.CharField(max_length=100, choices=DIPLOMES_CHOICES, blank=True, null=True, verbose_name="Diplôme")
    specialite = models.CharField(max_length=100, blank=True, null=True, verbose_name="Spécialité (code Domaine ANEM)")
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
    secteur = models.CharField(max_length=100, blank=True, null=True, verbose_name="Domaine d'activité (code ANEM)")

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
    etablissement = models.CharField(max_length=200, blank=True, verbose_name="Université ou École")
    
    date_debut = models.DateField(null=True, blank=True, verbose_name="Date de début")
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
    derniere_consultation = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Dernière consultation",
        help_text="Mise à jour quand le candidat consulte les offres de cette alerte — sert à calculer le compteur \"nouvelles offres\".",
    )

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

class ProfilCandidatFavori(models.Model):
    """
    Lien entre un recruteur et un candidat marqué en favori dans la CVthèque.
    """
    recruteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='candidats_favoris'
    )
    candidat = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favori_par'
    )
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('recruteur', 'candidat')
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.recruteur.username} ⭐ {self.candidat.username}"
    
class CandidatureSpontanee(models.Model):
    entreprise = models.ForeignKey('ProfilEntreprise', on_delete=models.CASCADE, related_name='candidatures_spontanees')
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField()
    telephone = models.CharField(max_length=20, blank=True)
    cv = models.FileField(
        upload_to='cvs_spontanes/',
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx']),
            validate_document_mime,
            validate_file_size(5),
        ]
    )
    lettre_motivation = models.TextField(blank=True)
    date_envoi = models.DateTimeField(auto_now_add=True)
    lue = models.BooleanField(default=False)
    wilaya = models.CharField(max_length=100, blank=True)
    diplome = models.CharField(max_length=100, blank=True)
    specialite = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-date_envoi']

    def __str__(self):
        return f"{self.nom} {self.prenom} → {self.entreprise.nom_entreprise}"
    
class Questionnaire(models.Model):
    recruteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='questionnaires')
    titre = models.CharField(max_length=200)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titre


class QuestionQuestionnaire(models.Model):
    TYPE_CHOICES = [
        ('COURT', 'Réponse courte'),
        ('LONG', 'Réponse longue'),
        ('NUMERIQUE', 'Numérique'),
        ('CHOIX_UNIQUE', 'Choix unique'),
        ('CHOIX_MULTIPLE', 'Choix multiple'),
    ]
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='questions')
    texte = models.CharField(max_length=500)
    type_question = models.CharField(max_length=20, choices=TYPE_CHOICES, default='COURT')
    requis = models.BooleanField(default=False)
    disqualifiant = models.BooleanField(default=False)
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['ordre']


class ReponseChoix(models.Model):
    question = models.ForeignKey(QuestionQuestionnaire, on_delete=models.CASCADE, related_name='choix')
    texte = models.CharField(max_length=200)


class ReponseCandidat(models.Model):
    candidature = models.ForeignKey('Candidature', on_delete=models.CASCADE, related_name='reponses')
    question = models.ForeignKey(QuestionQuestionnaire, on_delete=models.CASCADE)
    reponse = models.TextField(blank=True)

    class Meta:
        unique_together = ['candidature', 'question']


class AuditLog(models.Model):
    ACTIONS = [
        ('APPROUVER_OFFRE', 'Approuver offre'),
        ('REFUSER_OFFRE', 'Refuser offre'),
        ('APPROUVER_ENTREPRISE', 'Approuver entreprise'),
        ('REFUSER_ENTREPRISE', 'Refuser entreprise'),
        ('SUPPRIMER_USER', 'Supprimer utilisateur'),
        ('SUPPRIMER_OFFRE', 'Supprimer offre'),
        ('AUTRE', 'Autre'),
    ]
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=30, choices=ACTIONS)
    detail = models.CharField(max_length=255, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.admin} | {self.action} | {self.date:%Y-%m-%d %H:%M}"


class MembreEquipe(models.Model):
    ROLES = [
        ('PROPRIETAIRE', 'Propriétaire'),
        ('ADMIN', 'Administrateur'),
        ('UTILISATEUR', 'Utilisateur'),
        ('INVITE', 'Invité'),
    ]
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='membres')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='membre_equipes')
    role = models.CharField(max_length=20, choices=ROLES, default='UTILISATEUR')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('entreprise', 'user')
        ordering = ['date_ajout']

    def __str__(self):
        return f"{self.user.email} — {self.role} @ {self.entreprise.nom_entreprise}"


class InvitationEquipe(models.Model):
    ROLES = [
        ('ADMIN', 'Administrateur'),
        ('UTILISATEUR', 'Utilisateur'),
        ('INVITE', 'Invité'),
    ]
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='invitations_equipe')
    email = models.EmailField()
    token = models.CharField(max_length=64, unique=True)
    role = models.CharField(max_length=20, choices=ROLES, default='UTILISATEUR')
    expire_at = models.DateTimeField()
    est_acceptee = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"Invitation {self.email} → {self.entreprise.nom_entreprise} ({self.role})"


class EquipeActionLog(models.Model):
    ACTIONS = [
        ('CONNEXION', 'Connexion'),
        ('CREER_OFFRE', 'Créer offre'),
        ('MODIFIER_OFFRE', 'Modifier offre'),
        ('CLOTURER_OFFRE', 'Clôturer offre'),
        ('STATUT_CANDIDATURE', 'Changer statut candidature'),
        ('EVALUER_CANDIDATURE', 'Évaluer candidature'),
        ('INVITER_MEMBRE', 'Inviter membre'),
        ('RETIRER_MEMBRE', 'Retirer membre'),
        ('CHANGER_ROLE', 'Changer rôle membre'),
        ('AUTRE', 'Autre'),
    ]
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='equipe_logs')
    membre = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='equipe_action_logs')
    action = models.CharField(max_length=25, choices=ACTIONS)
    detail = models.CharField(max_length=255, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.membre} | {self.action} | {self.date:%Y-%m-%d %H:%M}"


class DemandeActivationPremium(models.Model):
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='demandes_premium')
    moyen_paiement = models.CharField(max_length=20, choices=[('CIB', 'CIB'), ('EDAHABIA', 'EDAHABIA'), ('CHARGILY', 'Chargily Pay')], default='CIB')
    nb_mois = models.PositiveSmallIntegerField(default=1)
    est_traitee = models.BooleanField(default=False)
    date_demande = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_demande']

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} — {self.moyen_paiement} — {'Traitée' if self.est_traitee else 'En attente'}"


# Icônes lucide-react déjà utilisées dans PremiumPage.jsx/LandingRecruteur.jsx — whitelist stricte
# pour que le nom stocké en base corresponde toujours à un composant React existant, jamais de
# texte libre injecté comme nom de composant.
ICONES_CHOICES = [
    ('Mail', 'Mail'), ('Download', 'Download'), ('SlidersHorizontal', 'SlidersHorizontal'),
    ('Sparkles', 'Sparkles'), ('Heart', 'Heart'), ('Headset', 'Headset'), ('Star', 'Star'),
    ('Shield', 'Shield'), ('Zap', 'Zap'), ('Clock', 'Clock'), ('CheckCircle2', 'CheckCircle2'),
    ('CreditCard', 'CreditCard'), ('Users', 'Users'), ('TrendingUp', 'TrendingUp'),
    ('Search', 'Search'), ('FileText', 'FileText'), ('Award', 'Award'), ('Target', 'Target'),
    ('Lock', 'Lock'), ('Bell', 'Bell'),
]


class PremiumPlan(models.Model):
    """Palier d'abonnement Premium (durée + prix), éditable par l'admin sans toucher au code.
    Source de vérité unique pour le montant réellement facturé via Chargily — pas de formule
    calculée, prix final saisi directement (voir docs/superpowers/specs/2026-08-20-...)."""
    nb_mois = models.PositiveIntegerField(
        unique=True, verbose_name="Durée (mois)", validators=[MinValueValidator(1)]
    )
    label = models.CharField(max_length=50, verbose_name="Libellé")
    prix_da = models.PositiveIntegerField(
        verbose_name="Prix final (DA)", validators=[MinValueValidator(1)]
    )
    populaire = models.BooleanField(default=False, verbose_name="Badge \"Populaire\"")
    actif = models.BooleanField(default=True, verbose_name="Visible/activable")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")

    class Meta:
        ordering = ['ordre', 'nb_mois']

    def __str__(self):
        return f"{self.label} — {self.prix_da} DA"


class PremiumAvantage(models.Model):
    """Carte "avantage Premium" (icône + titre + description), éditable par l'admin."""
    icone = models.CharField(max_length=40, choices=ICONES_CHOICES, verbose_name="Icône")
    titre = models.CharField(max_length=100, verbose_name="Titre")
    description = models.CharField(max_length=300, verbose_name="Description")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    actif = models.BooleanField(default=True, verbose_name="Visible")

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return self.titre


class Palier(models.Model):
    """Palier d'abonnement recruteur (Starter/Pro/Business/Enterprise) — remplace le système
    Premium binaire (voir docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md).
    'Gratuit' n'est PAS une ligne ici : c'est l'absence d'AbonnementEntreprise actif pour une
    entreprise (voir Phase 2b, non câblée dans cette migration)."""
    NOM_CHOICES = [
        ('STARTER', 'Starter'),
        ('PRO', 'Pro'),
        ('BUSINESS', 'Business'),
        ('ENTERPRISE', 'Enterprise'),
    ]
    nom = models.CharField(max_length=20, choices=NOM_CHOICES, unique=True, verbose_name="Palier")
    prix_mensuel_da = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Prix mensuel (DA)", validators=[MinValueValidator(1)]
    )
    prix_annuel_da = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Prix annuel (DA)", validators=[MinValueValidator(1)]
    )
    remise_annuelle_active = models.BooleanField(default=False, verbose_name="Remise annuelle affichée")
    limite_offres = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Limite offres actives (vide = illimité)",
        validators=[MinValueValidator(1)],
    )
    limite_cv_mois = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Limite téléchargements CV/mois (vide = illimité)",
        validators=[MinValueValidator(1)],
    )
    acces_coordonnees = models.BooleanField(default=False, verbose_name="Coordonnées candidats visibles")
    acces_ia_recommandes = models.BooleanField(default=False, verbose_name="Candidats recommandés (IA)")
    acces_ia_avancee = models.BooleanField(default=False, verbose_name="Recherche/filtres/stats IA avancés")
    acces_equipe = models.BooleanField(default=False, verbose_name="Gestion d'équipe multi-utilisateurs")
    support_label = models.CharField(max_length=100, blank=True, verbose_name="Support (texte libre)")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    actif = models.BooleanField(default=True, verbose_name="Visible/achetable")

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return self.get_nom_display()


class AbonnementEntreprise(models.Model):
    """Abonnement actif d'une entreprise à un Palier. Remplace ProfilEntreprise.est_premium/
    premium_expire_at comme future source de vérité — ces 2 champs restent en base pour
    compatibilité (le gating existant les lit encore, voir Phase 2b) mais ne sont plus la
    source de vérité une fois la Phase 2b câblée."""
    entreprise = models.OneToOneField(
        ProfilEntreprise, on_delete=models.CASCADE, related_name='abonnement'
    )
    palier = models.ForeignKey(Palier, on_delete=models.PROTECT, related_name='abonnements')
    date_debut = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField(
        null=True, blank=True, verbose_name="Expire le (vide = illimité)"
    )
    renouvellement_auto = models.BooleanField(default=True)

    @property
    def est_actif(self):
        if self.date_expiration is None:
            return True
        from django.utils import timezone
        return self.date_expiration > timezone.now()

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} — {self.palier.get_nom_display()}"


class MentionsLegalesEntreprise(models.Model):
    """Mentions légales TafTech affichées sur les factures — singleton (`get_solo()`, même
    pattern que AIConfig/ConfigRendezVous). Placeholders vides au départ, complétables par
    l'admin sans déploiement (même logique que les CGU provisoires, mais directement éditable)."""
    raison_sociale = models.CharField(max_length=200, blank=True, default="TafTech")
    registre_commerce = models.CharField(max_length=50, blank=True)
    nif = models.CharField(max_length=50, blank=True, verbose_name="NIF")
    adresse = models.CharField(max_length=255, blank=True)
    tva = models.CharField(max_length=50, blank=True, verbose_name="N° TVA (le cas échéant)")

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Mentions légales TafTech"


class PaiementAbonnement(models.Model):
    """Historique des paiements de paliers — source des factures PDF (page Facturation).
    Champs dénormalisés (palier_nom/montant_da au moment du paiement, pas de FK vers Palier) :
    supprimer/modifier un palier plus tard ne doit jamais altérer une facture déjà émise, même
    principe déjà appliqué à PremiumPlan (voir CLAUDE.md, chantier CMS Premium)."""
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='paiements_abonnement')
    palier_nom = models.CharField(max_length=20, choices=Palier.NOM_CHOICES)
    montant_da = models.PositiveIntegerField()
    periode = models.CharField(max_length=10, choices=[('MENSUEL', 'Mensuel'), ('ANNUEL', 'Annuel')], default='MENSUEL')
    moyen_paiement = models.CharField(max_length=50, blank=True)
    date_paiement = models.DateTimeField(auto_now_add=True)
    numero_facture = models.CharField(max_length=30, unique=True, editable=False)

    class Meta:
        ordering = ['-date_paiement']

    def save(self, *args, **kwargs):
        if not self.numero_facture:
            from django.utils import timezone
            annee = timezone.now().year
            dernier = PaiementAbonnement.objects.filter(numero_facture__startswith=f"TT-{annee}-").order_by('-id').first()
            prochain_numero = (int(dernier.numero_facture.split('-')[-1]) + 1) if dernier else 1
            self.numero_facture = f"TT-{annee}-{prochain_numero:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero_facture} — {self.entreprise.nom_entreprise}"


class TelechargementCV(models.Model):
    """Log d'un téléchargement de CV depuis la CVthèque — sert uniquement à compter le quota
    mensuel `Palier.limite_cv_mois` (toujours recalculé à partir des logs du mois en cours, pas
    un compteur stocké à incrémenter — même principe que AlerteEmploiSerializer.nb_nouvelles_offres,
    voir CLAUDE.md). Ne trace PAS les téléchargements via une vraie candidature reçue (accès
    toujours autorisé, jamais compté dans le quota) ni les téléchargements par le candidat
    lui-même/un admin."""
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='telechargements_cv')
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date_telechargement = models.DateTimeField(auto_now_add=True)


class AIConfig(models.Model):
    """Configuration IA du site — singleton (une seule ligne, `AIConfig.get_solo()`). Permet à
    l'admin de couper une fonctionnalité IA en panne (ex: Groq a déjà changé de modèle sans
    préavis, cassant tout silencieusement — cf. CLAUDE.md session 18/08/2026) sans déploiement, et
    d'ajuster le modèle Groq utilisé sans toucher au code. `groq_model` reste un champ texte libre
    (pas un `choices` figé) car Groq déprécie ses modèles de façon imprévisible."""
    # `provider` anticipe la migration Groq → Ollama local prévue post-déploiement (roadmap
    # CLAUDE.md, `ollama` déjà en dépendance mais pas encore câblé) — champ présent dès maintenant
    # pour que ce futur changement soit un simple toggle admin, pas un redesign du modèle. OLLAMA
    # n'est pas encore fonctionnel côté code (hors scope de cette session, tâche reportée) : le
    # sélectionner n'a aucun effet tant que l'intégration n'est pas câblée.
    PROVIDER_CHOICES = [('GROQ', 'Groq (cloud)'), ('OLLAMA', 'Ollama (local, post-déploiement)')]
    provider = models.CharField(max_length=10, choices=PROVIDER_CHOICES, default='GROQ')
    groq_model = models.CharField(max_length=100, default='openai/gpt-oss-20b', verbose_name="Modèle Groq")
    ollama_model = models.CharField(max_length=100, default='mistral', blank=True, verbose_name="Modèle Ollama")
    temperature = models.FloatField(
        default=0.7,
        validators=[MinValueValidator(0.0), MaxValueValidator(2.0)],
    )
    reasoning_effort = models.CharField(
        max_length=10,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
        default='low',
    )

    parser_cv_actif = models.BooleanField(default=True, verbose_name="Parser CV actif")
    parser_cv_max_tokens = models.PositiveIntegerField(default=6000, validators=[MinValueValidator(100)])
    parser_cv_prompt = models.TextField(
        blank=True, verbose_name="Prompt Parser CV",
        help_text="Variables obligatoires : {cv_text} et {domaines_list}. Si vide, le prompt par défaut du code est utilisé.",
    )

    analyse_carriere_actif = models.BooleanField(default=True, verbose_name="Analyse carrière candidat active")
    analyse_carriere_max_tokens = models.PositiveIntegerField(default=1200, validators=[MinValueValidator(100)])
    analyse_carriere_prompt = models.TextField(
        blank=True, verbose_name="Prompt Analyse carrière",
        help_text="Instructions système (aucune variable à interpoler — le profil du candidat est envoyé séparément). Si vide, le prompt par défaut du code est utilisé.",
    )

    analyse_recruteur_actif = models.BooleanField(default=True, verbose_name="Analyse IA recruteur active")
    analyse_recruteur_max_tokens = models.PositiveIntegerField(default=400, validators=[MinValueValidator(100)])
    analyse_recruteur_prompt = models.TextField(
        blank=True, verbose_name="Prompt Analyse recruteur",
        help_text=(
            "Variables disponibles : {offre_titre}, {entreprise}, {specialite}, {type_contrat}, {wilaya}, "
            "{nom_candidat}, {titre_candidat}, {diplome}, {competences}, {experiences}, {formations}, {score}. "
            "Si vide, le prompt par défaut du code est utilisé."
        ),
    )

    generation_offre_actif = models.BooleanField(default=True, verbose_name="Génération d'offre IA active")
    generation_offre_max_tokens = models.PositiveIntegerField(default=1600, validators=[MinValueValidator(100)])
    generation_offre_prompt = models.TextField(
        blank=True, verbose_name="Prompt Génération d'offre",
        help_text=(
            "Variables disponibles : {titre}, {specialite}, {diplome}, {experience}, {contrat}, {wilaya}. "
            "Si vide, le prompt par défaut du code est utilisé."
        ),
    )

    conseils_dashboard_actif = models.BooleanField(default=True, verbose_name="Conseils personnalisés (tableau de bord) actifs")
    conseils_dashboard_max_tokens = models.PositiveIntegerField(default=600, validators=[MinValueValidator(100)])
    conseils_dashboard_prompt = models.TextField(
        blank=True, verbose_name="Prompt Conseils personnalisés",
        help_text="Instructions système (le profil/score/activité du candidat sont envoyés séparément). Si vide, le prompt par défaut du code est utilisé.",
    )

    date_modification = models.DateTimeField(auto_now=True)

    @classmethod
    def get_solo(cls):
        from django.core.cache import cache
        cached = cache.get('jobs_ai_config')
        if cached is not None:
            return cached
        obj, _ = cls.objects.get_or_create(pk=1)
        cache.set('jobs_ai_config', obj, timeout=300)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('jobs_ai_config')

    def __str__(self):
        return f"Config IA ({self.groq_model})"


class PageStatique(models.Model):
    """Contenu éditable d'une page du site (CGU, Confidentialité, Qui sommes-nous, ou toute
    nouvelle page libre) — même sanitization HTML que Article.contenu_html. `slug` fixe
    ('cgu', 'confidentialite', 'qui-sommes-nous') pour les 3 pages existantes ; toute autre valeur
    crée une page accessible via /pages/<slug>."""
    slug = models.SlugField(max_length=100, unique=True)
    titre = models.CharField(max_length=200)
    contenu_html = models.TextField()
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['titre']

    def save(self, *args, **kwargs):
        if self.contenu_html:
            import bleach
            allowed_tags = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'br']
            allowed_attrs = {'a': ['href', 'title', 'target', 'rel'], 'img': ['src', 'alt']}
            self.contenu_html = bleach.clean(self.contenu_html, tags=allowed_tags, attributes=allowed_attrs, strip=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titre


class SiteAnnonce(models.Model):
    """Bandeau d'annonce global, affiché au-dessus de la navbar sur tout le site — un seul actif
    à la fois (l'admin en active un, ça désactive automatiquement les autres au save())."""
    TYPE_CHOICES = [
        ('INFO', 'Info (bleu)'),
        ('WARNING', 'Avertissement (ambre)'),
        ('SUCCESS', 'Succès (vert)'),
    ]
    texte = models.CharField(max_length=200)
    lien_url = models.URLField(blank=True, null=True)
    lien_label = models.CharField(max_length=50, blank=True, null=True, verbose_name="Libellé du lien")
    type_annonce = models.CharField(max_length=10, choices=TYPE_CHOICES, default='INFO')
    actif = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        from django.db import transaction
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.actif:
                SiteAnnonce.objects.exclude(pk=self.pk).update(actif=False)

    def __str__(self):
        return f"{self.texte[:50]} ({'actif' if self.actif else 'inactif'})"


class BanniereAccueil(models.Model):
    """Bannière promotionnelle du carrousel affiché sur la page d'accueil."""
    image = models.ImageField(
        upload_to='bannieres_accueil/',
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(5),
        ]
    )
    titre = models.CharField(max_length=150, blank=True, null=True)
    lien_url = models.URLField(blank=True, null=True)
    ordre = models.PositiveIntegerField(default=0)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return self.titre or f"Bannière #{self.pk}"


class ArticleCategorie(models.Model):
    """Catégorie de blog, gérée librement par l'admin (contrairement à FaqItem qui a des
    catégories fixes) — évite la fragmentation "RH"/"rh"/"Ressources humaines" en forçant le choix
    dans une liste existante plutôt qu'un champ texte libre par article."""
    label = models.CharField(max_length=60, unique=True)

    class Meta:
        ordering = ['label']

    def __str__(self):
        return self.label


class Article(models.Model):
    """Article de blog TafTech — contenu HTML édité via TipTap (WYSIWYG) côté admin, sanitizé au
    save() (bleach) en défense en profondeur même si seul le rôle ADMIN y écrit aujourd'hui."""
    STATUT_CHOICES = [
        ('BROUILLON', 'Brouillon'),
        ('PUBLIE', 'Publié'),
    ]
    titre = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    categorie = models.ForeignKey(ArticleCategorie, on_delete=models.SET_NULL, null=True, blank=True, related_name='articles')
    extrait = models.CharField(max_length=300, verbose_name="Extrait / résumé")
    contenu_html = models.TextField(verbose_name="Contenu")
    image_couverture = models.ImageField(
        upload_to='articles/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(3),
        ]
    )
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='BROUILLON')
    date_publication = models.DateTimeField(null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.titre)
            slug = base
            n = 1
            while Article.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        if self.contenu_html:
            import bleach
            allowed_tags = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'br']
            allowed_attrs = {'a': ['href', 'title', 'target', 'rel'], 'img': ['src', 'alt']}
            self.contenu_html = bleach.clean(self.contenu_html, tags=allowed_tags, attributes=allowed_attrs, strip=True)
        if self.statut == 'PUBLIE' and not self.date_publication:
            from django.utils import timezone
            self.date_publication = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titre


class CompetenceReferentiel(models.Model):
    """Référentiel de compétences suggérées, éditable par l'admin — alimente l'autocomplete du
    champ "Compétences" du profil candidat (TextField libre, non modifié : ceci ne fait que
    suggérer, jamais ne contraint la saisie)."""
    label = models.CharField(max_length=100, unique=True, verbose_name="Compétence")
    actif = models.BooleanField(default=True, verbose_name="Suggérée")

    class Meta:
        ordering = ['label']

    def __str__(self):
        return self.label


class FaqItem(models.Model):
    """Question/réponse FAQ, éditable par l'admin — 3 catégories correspondant aux 3 pages qui
    affichaient jusqu'ici des listes en dur : ContactezNous (GENERAL), LandingRecruteur
    (RECRUTEUR), PremiumPage (PREMIUM). Un seul modèle + filtre catégorie plutôt que 3 modèles
    séparés — un admin gère tout au même endroit, chaque page ne consomme que sa catégorie."""
    CATEGORIE_CHOICES = [
        ('GENERAL', 'Général (page Contact)'),
        ('RECRUTEUR', 'Recruteur (landing)'),
        ('PREMIUM', 'Premium'),
        ('PALIERS', 'Paliers (page Abonnements)'),
    ]
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, verbose_name="Catégorie")
    question = models.CharField(max_length=300, verbose_name="Question")
    reponse = models.TextField(verbose_name="Réponse")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    actif = models.BooleanField(default=True, verbose_name="Visible")

    class Meta:
        ordering = ['categorie', 'ordre']

    def __str__(self):
        return f"[{self.categorie}] {self.question}"


# ═══════════════════════════════════════════════════════════════════════════
# NOUVEAU TABLEAU DE BORD CANDIDAT (session specs/important-features) — refonte
# demandée par l'employeur sur mockup IA. Modèles pour : compétences structurées
# avec niveau, documents privés, prise de rendez-vous, activité de profil.
# ═══════════════════════════════════════════════════════════════════════════

class CompetenceCandidat(models.Model):
    """Compétence structurée d'un candidat, avec niveau — remplace progressivement le champ
    texte libre `ProfilCandidat.competences` pour l'UI (page "Mes compétences"), mais ce
    dernier reste synchronisé automatiquement à chaque sauvegarde (matcher.py/cv_parser.py
    continuent de lire le texte libre sans modification)."""
    NIVEAU_CHOICES = [
        ('DEBUTANT', 'Débutant'),
        ('INTERMEDIAIRE', 'Intermédiaire'),
        ('AVANCE', 'Avancé'),
        ('CONFIRME', 'Confirmé / Expert'),
    ]
    SOURCE_CHOICES = [
        ('DECLARE', 'Auto-déclaré'),
        ('TESTE', 'Vérifié par test'),  # anticipe le futur module "Mes tests", pas encore actif
    ]
    NIVEAU_POINTS = {'DEBUTANT': 1, 'INTERMEDIAIRE': 2, 'AVANCE': 3, 'CONFIRME': 4}

    profil = models.ForeignKey(ProfilCandidat, on_delete=models.CASCADE, related_name='competences_detail')
    label = models.CharField(max_length=100, verbose_name="Compétence")
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES, default='DEBUTANT')
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='DECLARE')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['label']
        unique_together = [('profil', 'label')]

    def __str__(self):
        return f"{self.label} ({self.get_niveau_display()}) — {self.profil}"


class TypeDocument(models.Model):
    """Référentiel des catégories de documents privés candidat, éditable par l'admin (pattern
    CompetenceReferentiel) — pas figé dans le code, l'admin peut en ajouter/retirer."""
    label = models.CharField(max_length=100, unique=True, verbose_name="Type de document")
    ordre = models.PositiveIntegerField(default=0)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordre', 'label']

    def __str__(self):
        return self.label


class DocumentCandidat(models.Model):
    """Espace documents 100% privé du candidat — jamais exposé aux recruteurs ni attaché
    automatiquement à une candidature (contrairement au CV/lettre de motivation "officiels"
    de ProfilCandidat, qui restent inchangés et sont la seule chose qu'un recruteur voit)."""
    profil = models.ForeignKey(ProfilCandidat, on_delete=models.CASCADE, related_name='documents')
    type_document = models.ForeignKey(TypeDocument, on_delete=models.SET_NULL, null=True, related_name='documents')
    nom_personnalise = models.CharField(max_length=150, blank=True, verbose_name="Nom (ex: CV version IT)")
    fichier = models.FileField(
        upload_to='documents_candidats/',
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']),
            validate_document_mime,
            validate_file_size(5),
        ]
    )
    date_upload = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_upload']

    def __str__(self):
        return self.nom_personnalise or (self.type_document.label if self.type_document else "Document")


class ConfigRendezVous(models.Model):
    """Réglages globaux du système de prise de rendez-vous — singleton (pattern AIConfig),
    éditable par l'admin. Un seul conseiller/agenda pour l'instant (décision utilisateur)."""
    delai_min_reservation_heures = models.PositiveIntegerField(
        default=24, verbose_name="Délai minimum avant un RDV (heures)",
        help_text="Ex: 24 = un candidat ne peut pas réserver un créneau dans les 24h à venir.",
    )
    horizon_max_jours = models.PositiveIntegerField(
        default=30, verbose_name="Horizon maximum de réservation (jours)",
        help_text="Un candidat ne peut pas réserver au-delà de cet horizon.",
    )

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return "Configuration Rendez-vous"


class DisponibiliteRecurrente(models.Model):
    """Template hebdomadaire de disponibilité du conseiller, géré par l'admin — se répète
    chaque semaine. Les créneaux réellement proposés au candidat sont calculés à la volée
    (template + jours bloqués + créneaux déjà réservés), jamais stockés un par un."""
    JOURS_SEMAINE = [
        (0, 'Lundi'), (1, 'Mardi'), (2, 'Mercredi'), (3, 'Jeudi'),
        (4, 'Vendredi'), (5, 'Samedi'), (6, 'Dimanche'),
    ]
    jour_semaine = models.PositiveSmallIntegerField(choices=JOURS_SEMAINE)
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    duree_creneau_minutes = models.PositiveIntegerField(default=30)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['jour_semaine', 'heure_debut']

    def __str__(self):
        return f"{self.get_jour_semaine_display()} {self.heure_debut}-{self.heure_fin}"


class JourBloque(models.Model):
    """Exception ponctuelle au template récurrent (jour férié, absence) — géré par l'admin."""
    date = models.DateField(unique=True)
    motif = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.date} — {self.motif or 'Bloqué'}"


class RendezVous(models.Model):
    """Rendez-vous d'accompagnement carrière réservé par un candidat sur un créneau généré
    depuis DisponibiliteRecurrente."""
    STATUT_CHOICES = [
        ('CONFIRME', 'Confirmé'),
        ('ANNULE', 'Annulé'),
        ('TERMINE', 'Terminé'),
        ('ABSENT', 'Absent'),
    ]
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rendez_vous')
    date_heure = models.DateTimeField()
    motif = models.CharField(max_length=300, blank=True, verbose_name="Motif de la demande")
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='CONFIRME')
    notes_admin = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_annulation = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_heure']

    def __str__(self):
        return f"RDV {self.candidat} — {self.date_heure} ({self.get_statut_display()})"


class ActiviteProfil(models.Model):
    """Fil d'activité candidat — actions des recruteurs sur son profil/ses candidatures.
    "Profil recommandé" ne se déclenche que si un score de matching ≥ 80% est impliqué
    (décision utilisateur — pas une simple consultation sans contexte)."""
    TYPE_CHOICES = [
        ('CANDIDATURE_CONSULTEE', 'Candidature consultée'),
        ('PROFIL_RECOMMANDE', 'Profil recommandé (score élevé)'),
    ]
    SEUIL_SCORE_RECOMMANDE = 80.0

    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activites_profil')
    type_activite = models.CharField(max_length=25, choices=TYPE_CHOICES)
    entreprise = models.ForeignKey('ProfilEntreprise', on_delete=models.CASCADE, related_name='+')
    candidature = models.ForeignKey('Candidature', on_delete=models.CASCADE, null=True, blank=True, related_name='+')
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.get_type_activite_display()} — {self.candidat} / {self.entreprise}"


class InvitationCVTheque(models.Model):
    """Invitation d'un recruteur à un candidat de la CVthèque pour postuler à une offre
    précise — permet de tracer Candidature.source='CVTHEQUE' (voir
    docs/superpowers/specs/2026-08-23-source-candidature-invitation-cvtheque-design.md)."""
    entreprise = models.ForeignKey(
        'ProfilEntreprise', on_delete=models.CASCADE, related_name='invitations_cvtheque'
    )
    candidat = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invitations_recues'
    )
    offre = models.ForeignKey('OffreEmploi', on_delete=models.CASCADE, related_name='invitations')
    token = models.CharField(max_length=64, unique=True)
    date_envoi = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField()

    class Meta:
        unique_together = [('entreprise', 'candidat', 'offre')]

    def save(self, *args, **kwargs):
        if not self.token:
            import uuid
            self.token = uuid.uuid4().hex
        if not self.date_expiration:
            import datetime
            from django.utils import timezone
            self.date_expiration = timezone.now() + datetime.timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def est_valide(self):
        from django.utils import timezone
        return timezone.now() <= self.date_expiration

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} → {self.candidat.email} ({self.offre.titre})"


class RechercheSauvegardee(models.Model):
    """Filtres CVthèque sauvegardés par un recruteur pour être rappelés plus tard — voir
    docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md."""
    entreprise = models.ForeignKey(
        'ProfilEntreprise', on_delete=models.CASCADE, related_name='recherches_sauvegardees'
    )
    nom = models.CharField(max_length=100, verbose_name="Nom de la recherche")
    filtres = models.JSONField(default=dict, verbose_name="Filtres (query params CVthèque)")
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.nom} ({self.entreprise.nom_entreprise})"