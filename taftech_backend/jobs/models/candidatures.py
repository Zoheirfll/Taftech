"""Candidatures (réponses, exigences impératives), candidatures spontanées et questionnaires."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)
from .offres import OffreEmploi, ExigenceImperative


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
    date_maj = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")
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
    # Persistance de l'analyse IA recruteur (session 27/09/2026, même principe que
    # ProfilCandidat.derniere_analyse_carriere) — jusqu'ici recalculée à chaque ouverture de la
    # candidature (perdue en changeant de candidat dans la liste), le bouton associé devient
    # "Régénérer" dès qu'un résultat existe déjà. Le "Résumé IA" et l'"Analyse approfondie" du
    # panel recruteur consomment le même appel/champ (jobs/views/ia.py::AnalyseGroqRecruteurAPIView).
    derniere_analyse_ia = models.TextField(null=True, blank=True, verbose_name="Dernière analyse IA (recruteur)")
    analyse_ia_le = models.DateTimeField(null=True, blank=True, verbose_name="Date de la dernière analyse IA")

    def __str__(self):
        nom = self.candidat.username if self.candidat else f"{self.nom_rapide} {self.prenom_rapide} (Rapide)"
        score_display = f" - {self.score_matching}%" if self.score_matching else ""
        return f"{nom} -> {self.offre.titre}{score_display}"


class ReponseExigence(models.Model):
    """S12 — réponse du candidat à une `ExigenceImperative` de l'offre, à trois états
    (jamais binaire) : un statut INCONNU déclenche une vérification manuelle par le recruteur,
    jamais un rejet automatique de la candidature (S12 : "inconnu provoque une vérification,
    pas un rejet automatique")."""
    STATUT_CHOICES = [
        ('SATISFAIT', 'Satisfait'),
        ('NON_SATISFAIT', 'Non satisfait'),
        ('INCONNU', 'Inconnu — à vérifier'),
    ]
    candidature = models.ForeignKey(Candidature, on_delete=models.CASCADE, related_name='reponses_exigences')
    exigence = models.ForeignKey(ExigenceImperative, on_delete=models.CASCADE, related_name='reponses')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='INCONNU')
    justificatif = models.FileField(
        upload_to='justificatifs_exigences/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png', 'webp']),
            validate_document_or_image_mime,
            validate_file_size(5),
        ],
    )
    commentaire = models.TextField(blank=True, default='')
    date_reponse = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('candidature', 'exigence')]

    def __str__(self):
        return f"{self.exigence.label} — {self.get_statut_display()}"


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
