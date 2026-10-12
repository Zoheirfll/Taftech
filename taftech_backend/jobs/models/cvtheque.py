"""CVthèque recruteur : invitations à postuler et recherches sauvegardées."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)


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
