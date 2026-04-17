from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator

class ProfilEntreprise(models.Model):
    """
    Représente la "Page Entreprise" (Le recruteur).
    Relié au compte CustomUser (qui a le rôle RECRUTEUR).
    """
    # Relation 1-à-1 : Un utilisateur recruteur = Une entreprise
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_entreprise')
    
    nom_entreprise = models.CharField(max_length=150, verbose_name="Nom de l'entreprise")
    # NOUVEAU : Le statut de modération (Faux par défaut)
    est_approuvee = models.BooleanField(default=False, verbose_name="Entreprise approuvée")
    secteur_activite = models.CharField(max_length=100, help_text="Ex: Énergie / Hydrocarbures, Informatique, Commerce...")
    registre_commerce = models.CharField(max_length=50, unique=True, verbose_name="Numéro de Registre de Commerce (RC)")
    wilaya_siege = models.CharField(max_length=50, verbose_name="Wilaya du siège social")
    description = models.TextField(blank=True, null=True, verbose_name="Présentation de l'entreprise")
    logo = models.ImageField(upload_to='logos_entreprises/', blank=True, null=True)

    def __str__(self):
        return self.nom_entreprise


class OffreEmploi(models.Model):
    """
    Représente une offre d'emploi structurée comme sur Emploitic.
    """
    TYPES_CONTRAT = (
        ('CDI', 'CDI'),
        ('CDD', 'CDD'),
        ('ANEM', 'Contrat ANEM (CTA / DAIP)'),
        ('STAGE', 'Stage / PFE'),
        ('FREELANCE', 'Freelance'),
    )

    NIVEAUX_EXPERIENCE = (
        ('DEBUTANT', 'Débutant (0 - 1 an)'),
        ('JUNIOR', 'Junior (1 - 3 ans)'),
        ('CONFIRME', 'Confirmé (3 - 5 ans)'),
        ('SENIOR', 'Senior (5 ans et plus)'),
    )
    STATUTS_MODERATION = (
        ('EN_ATTENTE', 'En attente de validation'),
        ('APPROUVEE', 'Approuvée et en ligne'),
        ('REJETEE', 'Rejetée (à corriger)'), )
    entreprise = models.ForeignKey('ProfilEntreprise', on_delete=models.CASCADE, related_name='offres')
    
    titre = models.CharField(max_length=200, verbose_name="Titre du poste")
    wilaya = models.CharField(max_length=50, verbose_name="Lieu de travail (Wilaya)")
    commune = models.CharField(max_length=100, blank=True, null=True, verbose_name="Commune")
    diplome = models.CharField(max_length=150, blank=True, null=True, verbose_name="Diplôme requis")
    specialite = models.CharField(max_length=150, blank=True, null=True, verbose_name="Spécialité")
    
    # On rassemble les champs textes ici proprement (1 seule fois !)
    description = models.TextField(blank=True, null=True, verbose_name="Description générale")
    missions = models.TextField(blank=True, null=True, verbose_name="Missions du poste")
    profil_recherche = models.TextField(blank=True, null=True, verbose_name="Profil recherché (Exigences)")
    
    type_contrat = models.CharField(max_length=20, choices=TYPES_CONTRAT, default='CDI')
    experience_requise = models.CharField(max_length=20, choices=NIVEAUX_EXPERIENCE, default='DEBUTANT')
    salaire_propose = models.CharField(max_length=100, blank=True, null=True, help_text="Ex: 68 000 DA Net")
    
    date_publication = models.DateTimeField(auto_now_add=True)
    est_active = models.BooleanField(default=True, verbose_name="Offre visible")
    statut_moderation = models.CharField(max_length=20, choices=STATUTS_MODERATION, default='EN_ATTENTE')
    motif_rejet = models.TextField(blank=True, null=True) # Pour expliquer au recruteur pourquoi c'est refusé
    

    def __str__(self):
        return f"{self.titre} - {self.entreprise.nom_entreprise}"
    
class Candidature(models.Model):
    """
    Représente la candidature d'un utilisateur à une offre.
    """
    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='candidatures')
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='candidatures')
    
    date_postulation = models.DateTimeField(auto_now_add=True)
    lettre_motivation = models.TextField(blank=True, null=True, verbose_name="Lettre de motivation (Optionnelle)")
    
    # Pour que le recruteur puisse trier les CVs
    STATUTS = (
        ('EN_ATTENTE', 'En attente d\'examen'),
        ('EXAMINEE', 'Candidature examinée'),
        ('ACCEPTEE', 'Retenu pour entretien'),
        ('REFUSEE', 'Candidature refusée'),
    )
    statut = models.CharField(max_length=20, choices=STATUTS, default='EN_ATTENTE')

    class Meta:
        # Un candidat ne peut postuler qu'une seule fois à la même offre
        unique_together = ('offre', 'candidat')

    def __str__(self):
        return f"{self.candidat.username} -> {self.offre.titre}"

class ProfilCandidat(models.Model):
    """
    Profil étendu pour un candidat, contenant son CV.
    """
    # Relie le profil à l'utilisateur (Un utilisateur = Un profil)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_candidat')
    date_naissance = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    # Ex: "Développeur Fullstack", "Comptable"...
    titre_professionnel = models.CharField(max_length=150, blank=True, null=True)
    
    # Le fameux champ pour le fichier ! Django le rangera dans media/cvs/
    cv_pdf = models.FileField(
        upload_to='cvs/', 
        blank=True, 
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx'])]
    )

    diplome = models.CharField(max_length=200, blank=True, null=True, verbose_name="Diplôme")
    specialite = models.CharField(max_length=200, blank=True, null=True, verbose_name="Spécialité")
    experiences = models.TextField(blank=True, null=True, verbose_name="Expériences")
    competences = models.TextField(blank=True, null=True, verbose_name="Compétences")
    langues = models.CharField(max_length=255, blank=True, null=True, verbose_name="Langues")
    def __str__(self):
        return f"Profil de {self.user.username}"