"""Offres d'emploi, exigences et compétences d'offre, offres sauvegardées et alertes emploi."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)


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
    diplome_ref = models.ForeignKey(
        'TypeDiplome', null=True, blank=True, on_delete=models.SET_NULL, related_name='offres_niveau_requis',
        verbose_name="Diplôme requis (référentiel v2, résolu depuis `diplome`)",
        help_text="Résolution non ambiguë uniquement — voir ProfilCandidat.diplome_ref. Champ purement "
                  "informatif (affiché sur l'annonce, sert de filtre de recherche), jamais consommé par "
                  "matcher.py — le matching lit exclusivement `diplomes_requis`/`specialites_requises`.",
    )
    niveau_scolaire_ref = models.ForeignKey(
        'Scolarite', null=True, blank=True, on_delete=models.SET_NULL, related_name='offres_niveau_requis',
        verbose_name="Niveau de scolarité requis (référentiel v2, résolu depuis `diplome`)",
    )
    metier = models.ForeignKey(
        'Metier', null=True, blank=True, on_delete=models.SET_NULL, related_name='offres',
        verbose_name="Métier (référentiel v2)",
    )
    diplomes_requis = models.ManyToManyField(
        'TypeDiplome', blank=True, related_name='offres_requises',
        verbose_name="Diplômes acceptés (référentiel v2)",
        help_text="Liste plate de diplômes acceptés (S05, REGLES_MATCHING) — indépendante de "
                  "`specialites_requises`, jamais un couple imposé (F06 : pas de rang/équivalence "
                  "construits). Vide = critère diplôme non demandé pour le matching (S01).",
    )
    specialites_requises = models.ManyToManyField(
        'SpecialiteFormation', blank=True, related_name='offres_requises_specialite',
        verbose_name="Spécialités de formation acceptées (référentiel v2, optionnel)",
        help_text="Liste plate de spécialités acceptées (S06, REGLES_MATCHING) — indépendante de "
                  "`diplomes_requis`. Vide = critère spécialité non demandé pour le matching (S01).",
    )
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
    date_cloture = models.DateTimeField(null=True, blank=True, verbose_name="Date de clôture")
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
        from ..referentiel_utils import resoudre_diplome_legacy
        self.diplome_ref, self.niveau_scolaire_ref = resoudre_diplome_legacy(self.diplome)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.titre} - {self.entreprise.nom_entreprise}"


class ExigenceImperative(models.Model):
    """S12 (REGLES_MATCHING) — exigence professionnelle impérative déclarée par le recruteur
    sur son offre (permis, habilitation, droit d'exercice, certification...), distincte du
    diplôme (S12 : "Droits d'exercice, permis et certifications restent des champs avec
    justificatifs, distincts du diplôme"). Ne participe jamais au score de matching — c'est un
    filtre d'éligibilité à vérifier manuellement, pas un critère noté."""
    # Catégorie : seule une exigence déclarée par l'offre autorise le filtre CVthèque correspondant
    # (permis, véhicule, passeport, service national) — correction client n°19 : ces données
    # personnelles ne se filtrent que si l'offre les justifie par un critère professionnel précis.
    CATEGORIE_CHOICES = [
        ('AUTRE', 'Autre'),
        ('PERMIS_CONDUIRE', 'Permis de conduire'),
        ('VEHICULE', 'Véhicule personnel'),
        ('PASSEPORT', 'Passeport valide'),
        ('SERVICE_NATIONAL', 'Situation militaire'),
    ]

    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='exigences_imperatives')
    label = models.CharField(max_length=150, verbose_name="Exigence (ex: Permis B, Habilitation électrique)")
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, default='AUTRE')
    description = models.TextField(blank=True, default='')
    justificatif_requis = models.BooleanField(
        default=False,
        verbose_name="Justificatif requis",
        help_text="Si coché, le candidat doit joindre un document prouvant qu'il satisfait cette exigence.",
    )

    class Meta:
        unique_together = [('offre', 'label')]
        ordering = ['id']

    def __str__(self):
        return f"{self.label} ({self.offre.titre})"


class CompetenceOffre(models.Model):
    """Compétence structurée requise par une offre, normalisée sur le même référentiel que
    CompetenceCandidat (label libre, suggéré via CompetenceReferentiel) — permet un matching
    fiable en plus de la zone texte libre `OffreEmploi.competences` conservée pour l'annonce."""
    TYPE_EXIGENCE_CHOICES = [
        ('OBLIGATOIRE', 'Obligatoire'),
        ('SOUHAITEE', 'Souhaitée'),
    ]
    # Dupliqué depuis CompetenceCandidat.NIVEAU_CHOICES (défini plus bas dans ce fichier) —
    # référencer la classe ici provoquerait un NameError, cette classe n'étant pas encore
    # définie à ce point du module.
    NIVEAU_CHOICES = [
        ('DEBUTANT', 'Débutant'),
        ('INTERMEDIAIRE', 'Intermédiaire'),
        ('AVANCE', 'Avancé'),
        ('CONFIRME', 'Confirmé / Expert'),
    ]

    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='competences_requises')
    label = models.CharField(max_length=100, verbose_name="Compétence")
    # Même référentiel que CompetenceCandidat.competence_ref : le matching compare les
    # identifiants du référentiel (« Project Management » = « Gestion de projet »), le libellé
    # texte ne sert plus que de repli pour une compétence hors référentiel.
    competence_ref = models.ForeignKey(
        'CompetenceReferentiel', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='competences_offres', verbose_name="Compétence normalisée (référentiel)",
    )
    type_exigence = models.CharField(max_length=15, choices=TYPE_EXIGENCE_CHOICES, default='OBLIGATOIRE')
    niveau_requis = models.CharField(max_length=20, choices=NIVEAU_CHOICES, blank=True, null=True)

    class Meta:
        ordering = ['type_exigence', 'label']
        unique_together = [('offre', 'label')]

    def __str__(self):
        return f"{self.label} ({self.get_type_exigence_display()}) — {self.offre.titre}"


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
    derniere_alerte_envoyee = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Dernière alerte envoyée",
        help_text="Mise à jour par la commande envoyer_alertes après un envoi réussi — sert de curseur pour ne jamais manquer/redoubler une offre, indépendamment de la régularité du cron.",
    )

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"Alerte de {self.candidat.username} - {self.mots_cles}"
