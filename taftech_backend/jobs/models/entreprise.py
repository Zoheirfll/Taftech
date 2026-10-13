"""Profil entreprise (recruteur) et sa galerie de photos."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)


class ProfilEntreprise(models.Model):
    """
    Représente la "Page Entreprise" (Le recruteur).
    Relié au compte CustomUser (qui a le rôle RECRUTEUR).
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_entreprise')
    nom_entreprise = models.CharField(max_length=150, verbose_name="Nom de l'entreprise")
    slug = models.SlugField(max_length=180, unique=True, blank=True, verbose_name="Slug URL")
    est_approuvee = models.BooleanField(default=False, verbose_name="Entreprise approuvée")
    
    # Listes appliquées ici :
    secteur_activite = models.CharField(
        max_length=100, verbose_name="Secteur d'activité",
        help_text="Code `GroupeMetier.code_source` (ou `code` si absent) parmi les entrées "
                  "type_groupe='secteur_source' du référentiel v2 — 16 secteurs officiels ANEM "
                  "(NSEC-*) + ~70 secteurs plus précis ajoutés par TAFTECH (TSEC-*, ex: "
                  "Informatique, Cybersécurité, RH...). Plus de `choices` figé en Python : la "
                  "liste vient désormais de la même source que la navigation publique "
                  "'Offres par secteur' (NomenclatureAPIView), jamais deux référentiels "
                  "différents pour le même concept. Anciennes valeurs (lettres A-P) restent "
                  "valides sans migration — elles correspondent exactement aux `code_source` "
                  "des 16 entrées NSEC-*.",
    )
    wilaya_siege = models.CharField(max_length=100, choices=WILAYAS_CHOICES, verbose_name="Wilaya du siège social")
    
    # 👇 NOUVEAU : Ajout du champ pour la commune du siège 👇
    commune_siege = models.CharField(max_length=150, blank=True, null=True, verbose_name="Commune du siège")
    adresse_complete = models.CharField(max_length=255, blank=True, null=True, verbose_name="Adresse complète (pour la carte)")
    
    registre_commerce = models.CharField(max_length=50, unique=True, verbose_name="Numéro de Registre de Commerce (RC)")
    description = models.TextField(blank=True, null=True, verbose_name="Présentation de l'entreprise")
    logo = models.ImageField(
        upload_to='logos_entreprises/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'jfif', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(2),
        ]
    )
    taille_entreprise = models.CharField(
        max_length=10,
        choices=TAILLES_ENTREPRISE_CHOICES,
        blank=True,
        null=True,
        verbose_name="Taille de l'entreprise (effectif)"
    )
    banniere = models.ImageField(
        upload_to='bannieres_entreprises/',
        blank=True,
        null=True,
        verbose_name="Bannière (page vitrine)",
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'jfif', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(5),
        ]
    )
    culture_entreprise = models.TextField(blank=True, null=True, verbose_name="Culture d'entreprise")
    annee_creation = models.PositiveIntegerField(
        blank=True, null=True,
        validators=[MinValueValidator(1900)],
        verbose_name="Année de création de l'entreprise",
    )
    mise_en_avant_accueil = models.BooleanField(
        default=False, verbose_name='Afficher dans "Ils nous font confiance" (logos clients)'
    )

    linkedin = models.URLField(blank=True, null=True, verbose_name="Lien LinkedIn entreprise")
    site_web = models.URLField(blank=True, null=True, verbose_name="Site web de l'entreprise")

    email_refus_auto = models.BooleanField(default=False)
    message_refus_auto = models.TextField(
    blank=True,
    default="Bonjour {prenom},\n\nNous avons bien étudié votre candidature pour le poste de {titre_offre} et nous avons le regret de vous informer qu'elle n'a pas été retenue.\n\nNous vous remercions de l'intérêt que vous portez à {nom_entreprise} et vous souhaitons bonne chance dans vos recherches.\n\nCordialement,\nL'équipe {nom_entreprise}"
)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.nom_entreprise)
            slug = base
            n = 1
            while ProfilEntreprise.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom_entreprise


class EntreprisePhoto(models.Model):
    """Galerie photo de la page vitrine entreprise (bureaux, équipe, événements...)."""
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(
        upload_to='photos_entreprises/',
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'jfif', 'png', 'webp']),
            validate_image_mime,
            validate_file_size(3),
        ]
    )
    legende = models.CharField(max_length=150, blank=True, null=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_ajout']

    def __str__(self):
        return f"Photo {self.entreprise.nom_entreprise} — {self.date_ajout:%d/%m/%Y}"


# ==========================================
# RÉFÉRENTIEL V2 (fichiers client TAFTECH_Diplomes_Specialites_Algerie_v2.xlsx +
# TAFTECH_Metiers_Matching_v2.xlsx) — remplace intégralement l'ancienne nomenclature ANEM
# (Secteur/Domaine/SousDomaine/MetierReferentiel, basée sur NAME.xlsx) côté métiers, et
# DIPLOMES_CHOICES/ProfilCandidat.specialite (texte libre) côté diplômes/spécialités.
# Cutover complet (session 18/09/2026) : les anciens modèles ont été supprimés, le
# référentiel v2 est la seule source de vérité pour le matching. Le champ `code` de chaque
# modèle est l'identifiant stable du fichier Excel (ex: "D-CFPS", "A1101"), conservé pour
# permettre les réimports idempotents et les redirections de MIGRATION.
#
# "Domaine"/"Filière"/"Spécialité" préfixés *Formation (hiérarchie de formation, ex-cité de
# collision avec l'ancien Domaine/SousDomaine ANEM métiers) — conservé tel quel même après
# la suppression de l'ancien système (renommage cosmétique non fait, aucun gain fonctionnel).
# ==========================================
