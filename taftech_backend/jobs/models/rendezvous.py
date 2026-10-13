"""Prise de rendez-vous candidat : configuration, disponibilités, jours bloqués, rendez-vous."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)


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
