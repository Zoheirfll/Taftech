from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Modèle Utilisateur personnalisé pour TafTech.
    Remplace le modèle par défaut de Django pour intégrer le rôle, le NIN et la Loi 18-07.
    """
    
    # Définition des rôles possibles
    ROLE_CHOICES = (
        ('CANDIDAT', 'Candidat'),
        ('RECRUTEUR', 'Recruteur'),
        ('ADMIN', 'Administrateur'),
    )

    # Nouveaux champs personnalisés
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CANDIDAT')
    nin = models.CharField(max_length=18, unique=True, null=True, blank=True, verbose_name="Numéro d'Identification National")
    consentement_loi_18_07 = models.BooleanField(default=False, verbose_name="Consentement RGPD Algérie (Loi 18-07)")
    telephone = models.CharField(max_length=15, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"