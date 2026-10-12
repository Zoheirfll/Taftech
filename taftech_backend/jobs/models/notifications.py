"""Notifications utilisateur et journal d'activité du profil candidat."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)


class Notification(models.Model):
    """
    Boîte de réception : Stocke les messages automatiques du système
    (candidat : convocations/décisions ; recruteur : nouvelles candidatures).
    """
    TYPES_NOTIF = (
        ('INFO', 'Information'),
        ('ENTRETIEN', 'Entretien programmé'),
        ('RETENU', 'Candidature retenue'),
        ('REFUS', 'Candidature refusée'),
        ('ALERTE', 'Alerte Emploi'),
        ('CANDIDATURE_SPONTANEE', 'Candidature spontanée reçue'),
        ('NOUVELLE_CANDIDATURE', 'Nouvelle candidature'),
        ('CANDIDAT_RECOMMANDE', 'Candidat recommandé'),
        ('OFFRE_EXPIREE', 'Offre expirée et archivée'),
    )

    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type_notif = models.CharField(max_length=25, choices=TYPES_NOTIF, default='INFO')
    titre = models.CharField(max_length=200)
    message = models.TextField()
    lue = models.BooleanField(default=False, verbose_name="Message lu")
    date_creation = models.DateTimeField(auto_now_add=True)
    lien = models.CharField(
        max_length=255, blank=True, default='',
        verbose_name="Lien vers le sujet",
        help_text="Route frontend relative vers laquelle rediriger au clic (ex: /mes-candidatures)."
    )

    class Meta:
        ordering = ['-date_creation'] # Les messages les plus récents en premier

    def __str__(self):
        return f"{self.get_type_notif_display()} pour {self.destinataire.username}"

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
