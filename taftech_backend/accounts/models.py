from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings # 👈 L'import manquant est ici !



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
    email = models.EmailField(unique=True, verbose_name="Adresse Email")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CANDIDAT')
    nin = models.CharField(max_length=18, unique=True, null=True, blank=True, verbose_name="Numéro d'Identification National")
    consentement_loi_18_07 = models.BooleanField(default=False, verbose_name="Consentement RGPD Algérie (Loi 18-07)")
    telephone = models.CharField(max_length=15, null=True, blank=True)
    date_naissance = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    email_verifie = models.BooleanField(default=False)
    code_verification = models.CharField(max_length=6, blank=True, null=True)
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
class SystemErrorLog(models.Model):
    """La boîte noire de TafTech : stocke les erreurs sans fuite d'info."""
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, # 👈 La façon professionnelle de lier un utilisateur
        on_delete=models.SET_NULL, 
        null=True, blank=True
    )
    message = models.TextField(help_text="Résumé de l'erreur")
    details = models.TextField(blank=True, null=True)
    url = models.CharField(max_length=500)
    user_agent = models.TextField()
    stack_trace = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Log d'Erreur Système"
        verbose_name_plural = "Logs d'Erreurs Système"
        ordering = ['-timestamp']
        
    def __str__(self):
        return f"Erreur du {self.timestamp.strftime('%d/%m/%Y %H:%M')}"