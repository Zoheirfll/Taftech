"""Équipe recruteur (membres, invitations), journal d'audit admin et journal d'actions d'équipe."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)
from .entreprise import ProfilEntreprise


class AuditLog(models.Model):
    ACTIONS = [
        ('APPROUVER_OFFRE', 'Approuver offre'),
        ('REFUSER_OFFRE', 'Refuser offre'),
        ('CORRIGER_OFFRE', 'Corriger une offre en attente'),
        ('APPROUVER_ENTREPRISE', 'Approuver entreprise'),
        ('REFUSER_ENTREPRISE', 'Refuser entreprise'),
        ('SUPPRIMER_USER', 'Supprimer utilisateur'),
        ('SUPPRIMER_OFFRE', 'Supprimer offre'),
        ('ACTIVER_ABONNEMENT', 'Activer un abonnement (palier)'),
        ('MODIFIER_PRIX_PALIER', "Modifier le prix d'un palier"),
        ('SUPPRIMER_ADMIN', 'Supprimer un compte administrateur'),
        ('STATUT_COMPETENCE', "Changer le statut d'une compétence du référentiel"),
        ('MODIFIER_PROMPT_IA', "Modifier un prompt IA"),
        ('MODIFIER_CONFIG_IA', "Modifier la configuration IA (modèle, quotas, plafond)"),
        ('MODIFIER_INFOS_SOCIETE', "Modifier les informations société (coordonnées, mentions légales)"),
        ('STATUT_METIER', "Valider ou rejeter un métier proposé"),
        ('DECISION_DEMANDE_AJOUT', "Décider d'une demande d'ajout au référentiel"),
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
        ('DEBLOQUER_CANDIDAT', 'Débloquer candidat CVthèque'),
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
