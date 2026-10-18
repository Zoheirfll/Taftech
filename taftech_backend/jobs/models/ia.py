"""Configuration IA (AIConfig), quotas/utilisation et journal de qualité du parsing de CV."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)


# Longueur maximale de réponse acceptée par fonction IA : le plafond global compte des appels, pas des
# tokens, donc la dépense maximale est plafond × max_tokens ; sans borne haute, une erreur de saisie
# (ou un abus) ferait exploser cette estimation. Le plus grand défaut est 7000 (Parser CV).
MAX_TOKENS_MIN = 100
MAX_TOKENS_MAX = 16000


class AIConfig(models.Model):
    """Configuration IA du site — singleton (une seule ligne, `AIConfig.get_solo()`). Permet à
    l'admin de couper une fonctionnalité IA en panne (ex: Groq a déjà changé de modèle sans
    préavis, cassant tout silencieusement — cf. CLAUDE.md session 18/08/2026) sans déploiement, et
    d'ajuster le modèle Groq utilisé sans toucher au code. `groq_model` reste un champ texte libre
    (pas un `choices` figé) car Groq déprécie ses modèles de façon imprévisible."""
    # `provider` anticipe la migration Groq → Ollama local prévue post-déploiement (roadmap
    # CLAUDE.md, `ollama` déjà en dépendance mais pas encore câblé) — champ présent dès maintenant
    # pour que ce futur changement soit un simple toggle admin, pas un redesign du modèle. OLLAMA
    # n'est pas encore fonctionnel côté code (hors scope de cette session, tâche reportée) : le
    # sélectionner n'a aucun effet tant que l'intégration n'est pas câblée.
    PROVIDER_CHOICES = [('GROQ', 'Groq (cloud)'), ('OLLAMA', 'Ollama (local, post-déploiement)')]
    provider = models.CharField(max_length=10, choices=PROVIDER_CHOICES, default='GROQ')
    groq_model = models.CharField(max_length=100, default='openai/gpt-oss-20b', verbose_name="Modèle Groq")
    ollama_model = models.CharField(max_length=100, default='mistral', blank=True, verbose_name="Modèle Ollama")
    temperature = models.FloatField(
        default=0.7,
        validators=[MinValueValidator(0.0), MaxValueValidator(2.0)],
    )
    reasoning_effort = models.CharField(
        max_length=10,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
        default='low',
    )

    parser_cv_actif = models.BooleanField(default=True, verbose_name="Parser CV actif")
    parser_cv_max_tokens = models.PositiveIntegerField(default=7000, validators=[MinValueValidator(MAX_TOKENS_MIN), MaxValueValidator(MAX_TOKENS_MAX)])
    parser_cv_prompt = models.TextField(
        blank=True, verbose_name="Prompt Parser CV",
        help_text="Variables obligatoires : {cv_text} et {domaines_list}. Si vide, le prompt par défaut du code est utilisé.",
    )

    analyse_carriere_actif = models.BooleanField(default=True, verbose_name="Analyse carrière candidat active")
    analyse_carriere_max_tokens = models.PositiveIntegerField(default=1200, validators=[MinValueValidator(MAX_TOKENS_MIN), MaxValueValidator(MAX_TOKENS_MAX)])
    analyse_carriere_prompt = models.TextField(
        blank=True, verbose_name="Prompt Analyse carrière",
        help_text="Instructions système (aucune variable à interpoler — le profil du candidat est envoyé séparément). Si vide, le prompt par défaut du code est utilisé.",
    )

    analyse_recruteur_actif = models.BooleanField(default=True, verbose_name="Analyse IA recruteur active")
    analyse_recruteur_max_tokens = models.PositiveIntegerField(default=400, validators=[MinValueValidator(MAX_TOKENS_MIN), MaxValueValidator(MAX_TOKENS_MAX)])
    analyse_recruteur_prompt = models.TextField(
        blank=True, verbose_name="Prompt Analyse recruteur",
        help_text=(
            "Variables disponibles : {offre_titre}, {entreprise}, {specialite}, {type_contrat}, {wilaya}, "
            "{nom_candidat}, {titre_candidat}, {diplome}, {competences}, {experiences}, {formations}, {score}. "
            "Si vide, le prompt par défaut du code est utilisé."
        ),
    )

    generation_offre_actif = models.BooleanField(default=True, verbose_name="Génération d'offre IA active")
    generation_offre_max_tokens = models.PositiveIntegerField(default=1900, validators=[MinValueValidator(MAX_TOKENS_MIN), MaxValueValidator(MAX_TOKENS_MAX)])
    generation_offre_prompt = models.TextField(
        blank=True, verbose_name="Prompt Génération d'offre",
        help_text=(
            "Variables disponibles : {titre}, {specialite}, {diplome}, {experience}, {contrat}, {wilaya}. "
            "Si vide, le prompt par défaut du code est utilisé."
        ),
    )

    conseils_dashboard_actif = models.BooleanField(default=True, verbose_name="Conseils personnalisés (tableau de bord) actifs")
    conseils_dashboard_max_tokens = models.PositiveIntegerField(default=600, validators=[MinValueValidator(MAX_TOKENS_MIN), MaxValueValidator(MAX_TOKENS_MAX)])
    conseils_dashboard_prompt = models.TextField(
        blank=True, verbose_name="Prompt Conseils personnalisés",
        help_text="Instructions système (le profil/score/activité du candidat sont envoyés séparément). Si vide, le prompt par défaut du code est utilisé.",
    )

    # Quotas IA côté candidat (fonctions sans palier — flat par compte). Vide = illimité.
    # Génération offre/analyse recruteur (côté recruteur) sont sur Palier, pas ici — voir
    # jobs/ia_quota.py pour la résolution complète (override compte > palier/config > illimité).
    parser_cv_limite_jour = models.PositiveIntegerField(
        null=True, blank=True, default=3, verbose_name="Parser CV — quota/jour (vide = illimité)",
    )
    parser_cv_limite_mois = models.PositiveIntegerField(
        null=True, blank=True, default=10, verbose_name="Parser CV — quota/mois (vide = illimité)",
    )
    analyse_carriere_limite_jour = models.PositiveIntegerField(
        null=True, blank=True, default=10, verbose_name="Suggestions métiers — quota/jour (vide = illimité)",
    )
    analyse_carriere_limite_mois = models.PositiveIntegerField(
        null=True, blank=True, default=50, verbose_name="Suggestions métiers — quota/mois (vide = illimité)",
    )
    conseils_dashboard_limite_jour = models.PositiveIntegerField(
        null=True, blank=True, default=10, verbose_name="Conseils personnalisés — quota/jour (vide = illimité)",
    )
    conseils_dashboard_limite_mois = models.PositiveIntegerField(
        null=True, blank=True, default=50, verbose_name="Conseils personnalisés — quota/mois (vide = illimité)",
    )
    budget_ia_appels_mois_max = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name="Plafond global — appels IA/mois tous comptes confondus (vide = illimité)",
        help_text="Kill-switch de sécurité budgétaire : au-delà, toute fonctionnalité IA est temporairement indisponible pour tout le monde, quel que soit le quota individuel restant.",
    )
    budget_ia_alerte_pct = models.PositiveSmallIntegerField(
        default=80, validators=[MinValueValidator(1), MaxValueValidator(100)],
        verbose_name="Seuil d'alerte (% du plafond global)",
        help_text="Un email est envoyé aux Super Admins une fois par mois quand ce pourcentage du plafond est atteint, puis quand il est épuisé.",
    )
    # Clés « AAAA-MM:ALERTE » / « AAAA-MM:EPUISE » déjà notifiées : une alerte n'est envoyée qu'une
    # fois par mois et par niveau (les clés des mois passés sont purgées à chaque envoi).
    budget_ia_alertes_envoyees = models.JSONField(default=list, blank=True)

    date_modification = models.DateTimeField(auto_now=True)

    @classmethod
    def get_solo(cls):
        from django.core.cache import cache
        cached = cache.get('jobs_ai_config')
        if cached is not None:
            return cached
        obj, _ = cls.objects.get_or_create(pk=1)
        cache.set('jobs_ai_config', obj, timeout=300)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('jobs_ai_config')

    def __str__(self):
        return f"Config IA ({self.groq_model})"


class UtilisationIA(models.Model):
    """Log d'un appel IA facturable (une ligne par appel demandé, compté même si l'appel Groq
    échoue ensuite — le client a explicitement demandé que 'chaque nouvelle génération ou
    réécriture demandée compte comme une utilisation'). Jamais un compteur stocké à incrémenter :
    les quotas jour/mois sont toujours recalculés en comptant les lignes de la période en cours,
    même principe que TelechargementCV/quota_cv_atteint (voir jobs/paliers_utils.py)."""
    FONCTION_CHOICES = [
        ('PARSER_CV', 'Parser CV (candidat)'),
        ('SUGGESTIONS_METIER', 'Suggestions métiers (candidat)'),
        ('CONSEILS_DASHBOARD', 'Conseils personnalisés (candidat)'),
        ('GENERATION_OFFRE', "Génération d'offre (recruteur)"),
        ('ANALYSE_RECRUTEUR', 'Analyse IA candidature (recruteur)'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='utilisations_ia')
    fonction = models.CharField(max_length=25, choices=FONCTION_CHOICES)
    date_heure = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_heure']
        indexes = [models.Index(fields=['user', 'fonction', 'date_heure'])]


class ParsingCV(models.Model):
    """Journal d'un parsing de CV, pour mesurer et améliorer le parser au fil de l'eau.
    Ne stocke JAMAIS le contenu du CV (ni texte, ni noms d'employeurs) : uniquement des compteurs
    et des indicateurs de résolution. `user` passe à NULL à la suppression du compte
    (anonymisation), purge auto des lignes de plus de 12 mois (commande purger_qualite_ia)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='parsings_cv')
    date = models.DateTimeField(auto_now_add=True, db_index=True)
    duree_ms = models.PositiveIntegerField(default=0)
    succes = models.BooleanField(default=True)
    code_erreur = models.CharField(max_length=30, blank=True, default='')
    version_parser = models.CharField(max_length=30, blank=True, default='')
    extension = models.CharField(max_length=6, blank=True, default='')
    nb_experiences = models.PositiveSmallIntegerField(default=0)
    nb_formations = models.PositiveSmallIntegerField(default=0)
    nb_competences = models.PositiveSmallIntegerField(default=0)
    nb_langues = models.PositiveSmallIntegerField(default=0)
    champs_vides = models.JSONField(default=list, blank=True)
    nb_exp_metier_ia = models.PositiveSmallIntegerField(default=0)
    nb_exp_metier_repli = models.PositiveSmallIntegerField(default=0)
    nb_exp_sans_metier = models.PositiveSmallIntegerField(default=0)
    nb_formations_sans_diplome_ref = models.PositiveSmallIntegerField(default=0)
    source_competences = models.CharField(max_length=10, blank=True, default='')  # SECTION | IA

    class Meta:
        ordering = ['-date']


class CorrectionParsing(models.Model):
    """Correction faite par le candidat sur un champ pré-rempli par le parser : paire
    (proposé -> choisi). `texte_source` = intitulé du poste ou du diplôme tel que déclaré
    (200 caractères max), jamais le nom de l'employeur ni les missions."""
    TYPES = [
        ('METIER_EXPERIENCE', "Métier d'une expérience"),
        ('DIPLOME', 'Diplôme'),
        ('SPECIALITE', 'Spécialité'),
    ]
    parsing = models.ForeignKey(ParsingCV, null=True, blank=True, on_delete=models.SET_NULL, related_name='corrections')
    date = models.DateTimeField(auto_now_add=True, db_index=True)
    type_correction = models.CharField(max_length=20, choices=TYPES)
    texte_source = models.CharField(max_length=200, blank=True, default='')
    propose_id = models.PositiveIntegerField(null=True, blank=True)
    propose_libelle = models.CharField(max_length=250, blank=True, default='')
    corrige_id = models.PositiveIntegerField(null=True, blank=True)
    corrige_libelle = models.CharField(max_length=250, blank=True, default='')

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.email} — {self.get_fonction_display()} ({self.date_heure:%d/%m/%Y %H:%M})"


class QuotaIAOverride(models.Model):
    """Quota IA personnalisé pour UN compte précis, remplace intégralement le quota par défaut
    (palier ou AIConfig) pour cette fonction — ex. compte de test, client VIP, compte pénalisé
    après abus. L'existence d'une ligne = override actif ; `limite_jour`/`limite_mois` à None sur
    la ligne signifie illimité POUR CE COMPTE (distinct de l'absence de ligne, qui signifie
    'utiliser le défaut'). Résolu en priorité par jobs/ia_quota.py avant palier/config."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quotas_ia_override')
    fonction = models.CharField(max_length=25, choices=UtilisationIA.FONCTION_CHOICES)
    limite_jour = models.PositiveIntegerField(null=True, blank=True, verbose_name="Quota/jour (vide = illimité)")
    limite_mois = models.PositiveIntegerField(null=True, blank=True, verbose_name="Quota/mois (vide = illimité)")
    justification = models.CharField(max_length=255, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'fonction')

    def __str__(self):
        return f"{self.user.email} — {self.get_fonction_display()} (override)"
