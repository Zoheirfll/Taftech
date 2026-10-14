"""Contenu éditorial du site : pages, bandeaux, bannières, articles de blog et FAQ."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)


class PageStatique(models.Model):
    """Contenu éditable d'une page du site (CGU, Confidentialité, Qui sommes-nous, ou toute
    nouvelle page libre) — même sanitization HTML que Article.contenu_html. `slug` fixe
    ('cgu', 'confidentialite', 'qui-sommes-nous') pour les 3 pages existantes ; toute autre valeur
    crée une page accessible via /pages/<slug>."""
    slug = models.SlugField(max_length=100, unique=True)
    titre = models.CharField(max_length=200)
    contenu_html = models.TextField()
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['titre']

    def save(self, *args, **kwargs):
        if self.contenu_html:
            import bleach
            allowed_tags = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'br']
            allowed_attrs = {'a': ['href', 'title', 'target', 'rel'], 'img': ['src', 'alt']}
            self.contenu_html = bleach.clean(self.contenu_html, tags=allowed_tags, attributes=allowed_attrs, strip=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titre


class SiteAnnonce(models.Model):
    """Bandeau d'annonce global, affiché au-dessus de la navbar sur tout le site — un seul actif
    à la fois (l'admin en active un, ça désactive automatiquement les autres au save())."""
    TYPE_CHOICES = [
        ('INFO', 'Info (bleu)'),
        ('WARNING', 'Avertissement (ambre)'),
        ('SUCCESS', 'Succès (vert)'),
    ]
    texte = models.CharField(max_length=200)
    lien_url = models.URLField(blank=True, null=True)
    lien_label = models.CharField(max_length=50, blank=True, null=True, verbose_name="Libellé du lien")
    type_annonce = models.CharField(max_length=10, choices=TYPE_CHOICES, default='INFO')
    actif = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        from django.db import transaction
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.actif:
                SiteAnnonce.objects.exclude(pk=self.pk).update(actif=False)

    def __str__(self):
        return f"{self.texte[:50]} ({'actif' if self.actif else 'inactif'})"


class BanniereAccueil(models.Model):
    """Bannière promotionnelle du carrousel affiché sur la page d'accueil."""
    image = models.ImageField(
        upload_to='bannieres_accueil/',
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'jfif', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(5),
        ]
    )
    titre = models.CharField(max_length=150, blank=True, null=True)
    lien_url = models.URLField(blank=True, null=True)
    ordre = models.PositiveIntegerField(default=0)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return self.titre or f"Bannière #{self.pk}"


class ArticleCategorie(models.Model):
    """Catégorie de blog, gérée librement par l'admin (contrairement à FaqItem qui a des
    catégories fixes) — évite la fragmentation "RH"/"rh"/"Ressources humaines" en forçant le choix
    dans une liste existante plutôt qu'un champ texte libre par article."""
    label = models.CharField(max_length=60, unique=True)

    class Meta:
        ordering = ['label']

    def __str__(self):
        return self.label


class Article(models.Model):
    """Article de blog TafTech — contenu HTML édité via TipTap (WYSIWYG) côté admin, sanitizé au
    save() (bleach) en défense en profondeur même si seul le rôle ADMIN y écrit aujourd'hui."""
    STATUT_CHOICES = [
        ('BROUILLON', 'Brouillon'),
        ('PUBLIE', 'Publié'),
    ]
    titre = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    categorie = models.ForeignKey(ArticleCategorie, on_delete=models.SET_NULL, null=True, blank=True, related_name='articles')
    extrait = models.CharField(max_length=300, verbose_name="Extrait / résumé")
    contenu_html = models.TextField(verbose_name="Contenu")
    image_couverture = models.ImageField(
        upload_to='articles/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'jfif', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(3),
        ]
    )
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='BROUILLON')
    date_publication = models.DateTimeField(null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.titre)
            slug = base
            n = 1
            while Article.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        if self.contenu_html:
            import bleach
            allowed_tags = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'br']
            allowed_attrs = {'a': ['href', 'title', 'target', 'rel'], 'img': ['src', 'alt']}
            self.contenu_html = bleach.clean(self.contenu_html, tags=allowed_tags, attributes=allowed_attrs, strip=True)
        if self.statut == 'PUBLIE' and not self.date_publication:
            from django.utils import timezone
            self.date_publication = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titre


class FaqItem(models.Model):
    """Question/réponse FAQ, éditable par l'admin — 3 catégories correspondant aux 3 pages qui
    affichaient jusqu'ici des listes en dur : ContactezNous (GENERAL), LandingRecruteur
    (RECRUTEUR), PremiumPage (PREMIUM). Un seul modèle + filtre catégorie plutôt que 3 modèles
    séparés — un admin gère tout au même endroit, chaque page ne consomme que sa catégorie."""
    CATEGORIE_CHOICES = [
        ('GENERAL', 'Général (page Contact)'),
        ('RECRUTEUR', 'Recruteur (landing)'),
        ('PALIERS', 'Paliers (page Abonnements)'),
    ]
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, verbose_name="Catégorie")
    question = models.CharField(max_length=300, verbose_name="Question")
    reponse = models.TextField(verbose_name="Réponse")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    actif = models.BooleanField(default=True, verbose_name="Visible")

    class Meta:
        ordering = ['categorie', 'ordre']

    def __str__(self):
        return f"[{self.categorie}] {self.question}"


# ═══════════════════════════════════════════════════════════════════════════
# NOUVEAU TABLEAU DE BORD CANDIDAT (session specs/important-features) — refonte
# demandée par l'employeur sur mockup IA. Modèles pour : compétences structurées
# avec niveau, documents privés, prise de rendez-vous, activité de profil.
# ═══════════════════════════════════════════════════════════════════════════
