from django.db import models
from django.conf import settings

class ProfilEntreprise(models.Model):
    """
    Représente la "Page Entreprise" (Le recruteur).
    Relié au compte CustomUser (qui a le rôle RECRUTEUR).
    """
    # Relation 1-à-1 : Un utilisateur recruteur = Une entreprise
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_entreprise')
    
    nom_entreprise = models.CharField(max_length=150, verbose_name="Nom de l'entreprise")
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
    # Options spécifiques au marché algérien
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

    # L'offre est obligatoirement rattachée à une entreprise
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='offres')
    
    titre = models.CharField(max_length=200, verbose_name="Titre du poste")
    wilaya = models.CharField(max_length=50, verbose_name="Lieu de travail (Wilaya)")
    
    # La séparation classique d'Emploitic pour plus de clarté
    missions = models.TextField(verbose_name="Missions du poste")
    profil_recherche = models.TextField(verbose_name="Profil recherché (Exigences)")
    
    type_contrat = models.CharField(max_length=20, choices=TYPES_CONTRAT, default='CDI')
    experience_requise = models.CharField(max_length=20, choices=NIVEAUX_EXPERIENCE, default='DEBUTANT')
    
    salaire_propose = models.CharField(max_length=100, blank=True, null=True, help_text="Ex: 68 000 DA Net, ou 'À négocier'")
    
    date_publication = models.DateTimeField(auto_now_add=True)
    est_active = models.BooleanField(default=True, verbose_name="Offre visible")

    def __str__(self):
        return f"{self.titre} - {self.entreprise.nom_entreprise}"