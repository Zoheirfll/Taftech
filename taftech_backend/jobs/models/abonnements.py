"""Abonnements recruteur : paliers, paiements, crédits CVthèque et déblocages."""
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


class DemandeActivationPremium(models.Model):
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='demandes_premium')
    moyen_paiement = models.CharField(max_length=20, choices=[('CIB', 'CIB'), ('EDAHABIA', 'EDAHABIA'), ('CHARGILY', 'Chargily Pay')], default='CIB')
    nb_mois = models.PositiveSmallIntegerField(default=1)
    est_traitee = models.BooleanField(default=False)
    date_demande = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_demande']

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} — {self.moyen_paiement} — {'Traitée' if self.est_traitee else 'En attente'}"


# Icônes lucide-react déjà utilisées dans PremiumPage.jsx/LandingRecruteur.jsx — whitelist stricte
# pour que le nom stocké en base corresponde toujours à un composant React existant, jamais de
# texte libre injecté comme nom de composant.
ICONES_CHOICES = [
    ('Mail', 'Mail'), ('Download', 'Download'), ('SlidersHorizontal', 'SlidersHorizontal'),
    ('Sparkles', 'Sparkles'), ('Heart', 'Heart'), ('Headset', 'Headset'), ('Star', 'Star'),
    ('Shield', 'Shield'), ('Zap', 'Zap'), ('Clock', 'Clock'), ('CheckCircle2', 'CheckCircle2'),
    ('CreditCard', 'CreditCard'), ('Users', 'Users'), ('TrendingUp', 'TrendingUp'),
    ('Search', 'Search'), ('FileText', 'FileText'), ('Award', 'Award'), ('Target', 'Target'),
    ('Lock', 'Lock'), ('Bell', 'Bell'),
]


class Palier(models.Model):
    """Palier d'abonnement recruteur (Starter/Pro/Business/Enterprise) — remplace le système
    Premium binaire (voir docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md).
    'Gratuit' n'est PAS une ligne ici : c'est l'absence d'AbonnementEntreprise actif pour une
    entreprise (voir Phase 2b, non câblée dans cette migration)."""
    NOM_CHOICES = [
        ('STARTER', 'Starter'),
        ('PRO', 'Pro'),
        ('BUSINESS', 'Business'),
        ('ENTERPRISE', 'Enterprise'),
    ]
    nom = models.CharField(max_length=20, choices=NOM_CHOICES, unique=True, verbose_name="Palier")
    prix_mensuel_da = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Prix mensuel (DA)", validators=[MinValueValidator(1)]
    )
    prix_annuel_da = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Prix annuel (DA)", validators=[MinValueValidator(1)]
    )
    remise_annuelle_active = models.BooleanField(default=False, verbose_name="Remise annuelle affichée")
    limite_offres = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Limite offres actives (vide = illimité)",
        validators=[MinValueValidator(1)],
    )
    credits_mois = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Crédits CVthèque/mois (vide = illimité)",
        validators=[MinValueValidator(1)],
    )
    acces_coordonnees = models.BooleanField(default=False, verbose_name="Coordonnées candidats visibles")
    acces_ia_recommandes = models.BooleanField(default=False, verbose_name="Candidats recommandés (IA)")
    acces_ia_avancee = models.BooleanField(default=False, verbose_name="Recherche/filtres/stats IA avancés")
    acces_equipe = models.BooleanField(default=False, verbose_name="Gestion d'équipe multi-utilisateurs")
    support_label = models.CharField(max_length=100, blank=True, verbose_name="Support (texte libre)")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    actif = models.BooleanField(default=True, verbose_name="Visible/achetable")

    # Quotas IA côté recruteur — génération d'offre et analyse IA d'une candidature (celle-ci
    # "incluse dans l'abonnement" selon la décision client, donc gatée par palier comme le reste,
    # pas par un plafond plat comme les fonctions candidat). Vide = illimité, même convention que
    # limite_offres/credits_mois ci-dessus. Résolu par jobs/ia_quota.py, overridable par compte
    # via QuotaIAOverride.
    quota_generation_offre_jour = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Génération d'offre IA — quota/jour (vide = illimité)",
    )
    quota_generation_offre_mois = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Génération d'offre IA — quota/mois (vide = illimité)",
    )
    quota_analyse_recruteur_jour = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Analyse IA candidature — quota/jour (vide = illimité)",
    )
    quota_analyse_recruteur_mois = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Analyse IA candidature — quota/mois (vide = illimité)",
    )

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return self.get_nom_display()


class AbonnementEntreprise(models.Model):
    """Abonnement actif d'une entreprise à un Palier — source de vérité unique du système de
    facturation recruteur (le legacy ProfilEntreprise.est_premium/premium_expire_at a été
    supprimé le 27/08/2026, voir CLAUDE.md)."""
    entreprise = models.OneToOneField(
        ProfilEntreprise, on_delete=models.CASCADE, related_name='abonnement'
    )
    palier = models.ForeignKey(Palier, on_delete=models.PROTECT, related_name='abonnements')
    date_debut = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField(
        null=True, blank=True, verbose_name="Expire le (vide = illimité)"
    )
    renouvellement_auto = models.BooleanField(default=True)
    credits_achetes_restants = models.PositiveIntegerField(default=0, verbose_name="Crédits CVthèque achetés restants")

    @property
    def est_actif(self):
        if self.date_expiration is None:
            return True
        from django.utils import timezone
        return self.date_expiration > timezone.now()

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} — {self.palier.get_nom_display()}"


class MentionsLegalesEntreprise(models.Model):
    """Mentions légales TafTech affichées sur les factures — singleton (`get_solo()`, même
    pattern que AIConfig/ConfigRendezVous). Placeholders vides au départ, complétables par
    l'admin sans déploiement (même logique que les CGU provisoires, mais directement éditable)."""
    raison_sociale = models.CharField(max_length=200, blank=True, default="TafTech")
    registre_commerce = models.CharField(max_length=50, blank=True)
    nif = models.CharField(max_length=50, blank=True, verbose_name="NIF")
    adresse = models.CharField(max_length=255, blank=True)
    tva = models.CharField(max_length=50, blank=True, verbose_name="N° TVA (le cas échéant)")

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Mentions légales TafTech"


class PaiementAbonnement(models.Model):
    """Historique des paiements de paliers — source des factures PDF (page Facturation).
    Champs dénormalisés (palier_nom/montant_da au moment du paiement, pas de FK vers Palier) :
    supprimer/modifier un palier plus tard ne doit jamais altérer une facture déjà émise, même
    principe déjà appliqué à PremiumPlan (voir CLAUDE.md, chantier CMS Premium)."""
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='paiements_abonnement')
    palier_nom = models.CharField(max_length=20, choices=Palier.NOM_CHOICES)
    montant_da = models.PositiveIntegerField()
    periode = models.CharField(max_length=10, choices=[('MENSUEL', 'Mensuel'), ('ANNUEL', 'Annuel')], default='MENSUEL')
    moyen_paiement = models.CharField(max_length=50, blank=True)
    date_paiement = models.DateTimeField(auto_now_add=True)
    numero_facture = models.CharField(max_length=30, unique=True, editable=False)

    class Meta:
        ordering = ['-date_paiement']

    def save(self, *args, **kwargs):
        if not self.numero_facture:
            from django.utils import timezone
            annee = timezone.now().year
            dernier = PaiementAbonnement.objects.filter(numero_facture__startswith=f"TT-{annee}-").order_by('-id').first()
            prochain_numero = (int(dernier.numero_facture.split('-')[-1]) + 1) if dernier else 1
            self.numero_facture = f"TT-{annee}-{prochain_numero:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero_facture} — {self.entreprise.nom_entreprise}"


class TelechargementCV(models.Model):
    """Log d'un téléchargement de CV depuis la CVthèque — sert uniquement à compter le quota
    mensuel `Palier.limite_cv_mois` (toujours recalculé à partir des logs du mois en cours, pas
    un compteur stocké à incrémenter — même principe que AlerteEmploiSerializer.nb_nouvelles_offres,
    voir CLAUDE.md). Ne trace PAS les téléchargements via une vraie candidature reçue (accès
    toujours autorisé, jamais compté dans le quota) ni les téléchargements par le candidat
    lui-même/un admin."""
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='telechargements_cv')
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date_telechargement = models.DateTimeField(auto_now_add=True)


class CreditPack(models.Model):
    """Pack de crédits CVthèque achetable via Chargily quand le quota mensuel d'un palier
    est épuisé — voir docs/superpowers/specs/2026-08-29-credits-cvtheque-design.md."""
    nom = models.CharField(max_length=50, verbose_name="Nom du pack")
    credits = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    prix_da = models.PositiveIntegerField(verbose_name="Prix (DA)", validators=[MinValueValidator(1)])
    actif = models.BooleanField(default=True, verbose_name="Visible/achetable")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return self.nom


class AccesCandidatDebloque(models.Model):
    """Déblocage permanent d'un candidat CVthèque par une entreprise — 1 crédit dépensé donne
    un accès à vie aux coordonnées + CV de ce candidat, partagé par toute l'équipe. `source`
    indique quel pool (quota mensuel du palier ou pack acheté) a été consommé — sert au calcul
    du quota mensuel restant dans jobs/credits_utils.py. Jamais dupliqué (unique_together) :
    redébloquer un candidat déjà débloqué ne consomme rien (idempotent, voir credits_utils)."""
    SOURCE_CHOICES = [
        ('MENSUEL', 'Quota mensuel du palier'),
        ('ACHETE', 'Pack de crédits acheté'),
    ]
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='candidats_debloques')
    candidat = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='debloque_par')
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES)
    date_debloque = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('entreprise', 'candidat')
        ordering = ['-date_debloque']

    def __str__(self):
        return f"{self.entreprise.nom_entreprise} → {self.candidat.email} ({self.source})"


class PaiementCreditPack(models.Model):
    """Historique des achats de packs de crédits confirmés — source des factures, même principe
    que PaiementAbonnement : champs dénormalisés (pack_nom/credits/montant_da au moment de
    l'achat), un pack supprimé/modifié plus tard n'altère jamais un paiement déjà enregistré."""
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='paiements_credit_pack')
    pack_nom = models.CharField(max_length=50)
    credits = models.PositiveIntegerField()
    montant_da = models.PositiveIntegerField()
    date_paiement = models.DateTimeField(auto_now_add=True)
    numero_facture = models.CharField(max_length=30, unique=True, editable=False)

    class Meta:
        ordering = ['-date_paiement']

    def save(self, *args, **kwargs):
        if not self.numero_facture:
            from django.utils import timezone
            annee = timezone.now().year
            dernier = PaiementCreditPack.objects.filter(numero_facture__startswith=f"TT-CR-{annee}-").order_by('-id').first()
            prochain_numero = (int(dernier.numero_facture.split('-')[-1]) + 1) if dernier else 1
            self.numero_facture = f"TT-CR-{annee}-{prochain_numero:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero_facture} — {self.entreprise.nom_entreprise}"
