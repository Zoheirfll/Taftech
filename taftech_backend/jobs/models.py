from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from .validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from .constants import (
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

class Scolarite(models.Model):
    """Niveau d'études déclaré, sans lien avec un diplôme obtenu (ex: 'Niveau secondaire')."""
    code = models.CharField(max_length=20, unique=True, verbose_name="Identifiant (niveau_etudes_id)")
    libelle = models.CharField(max_length=200)
    diplome_implique = models.BooleanField(default=False)
    usage = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['code']

    def __str__(self):
        return self.libelle


class Source(models.Model):
    """Table SOURCES du référentiel v2 — identique dans les deux classeurs client (IMPORT
    étape 19 : `source_partagee`), partagée par toutes les entités des deux fichiers via leur
    champ `source_id` (ex: SRC_NAME, SRC_FP19, SRC_TAF_V2). Upsert par `code`, aucun doublon :
    réimporter le même classeur ou l'autre met simplement à jour la même ligne."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (source_id)")
    titre = models.CharField(max_length=250)
    nature = models.CharField(max_length=40, blank=True, default='')
    organisme = models.CharField(max_length=250, blank=True, default='')
    fichier = models.CharField(max_length=250, blank=True, default='')
    url = models.URLField(max_length=500, blank=True, default='')
    edition_annee = models.PositiveSmallIntegerField(null=True, blank=True)
    consulte_le = models.DateField(null=True, blank=True)
    sha256 = models.CharField(max_length=64, blank=True, default='')
    perimetre_limite = models.TextField(
        blank=True, default='',
        verbose_name="Limites de la source",
        help_text="Ex: '5789 lignes ; 420 codes de fiche. Authenticité administrative et édition non vérifiées indépendamment.'",
    )

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} — {self.titre}"


class TypeDiplome(models.Model):
    """Type/catégorie de diplôme (37 valeurs) — régimes séparés (universitaire, formation
    professionnelle, historique, ENS, paramédical), sans rang numérique commun entre eux
    (REGLES_FORMATION F06 : aucune équivalence légale automatique entre systèmes)."""
    code = models.CharField(max_length=20, unique=True, verbose_name="Identifiant (diplome_id)")
    libelle = models.CharField(max_length=250)
    systeme = models.CharField(max_length=50, verbose_name="Système (universitaire, formation_professionnelle...)")
    cycle = models.CharField(max_length=50, blank=True, default='')
    niveau_fp = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name="Qualification FP (1-5)",
        help_text="Nomenclature interne à la formation professionnelle uniquement — ne compare pas les diplômes universitaires.",
    )
    statut_reference = models.CharField(max_length=100, blank=True, default='')
    selectionnable = models.BooleanField(default=True, help_text="1 = proposé dans le formulaire candidat.")
    diplome_formel = models.BooleanField(default=True)
    precision = models.TextField(blank=True, default='')
    source_id = models.CharField(
        max_length=20, blank=True, default='',
        verbose_name="Provenance (référence à Source.code)",
        help_text="IMPORT étape 11 : exposé en API sous la clé `source` — pas une FK stricte, Source peut "
                  "être importée après ce référentiel (ordre d'import DICTIONNAIRE non garanti entre les deux).",
    )

    class Meta:
        ordering = ['systeme', 'libelle']

    def __str__(self):
        return self.libelle


class DomaineFormation(models.Model):
    """Domaine de formation (ex: 'Art, culture et patrimoine') — distinct du Domaine ANEM métiers."""
    code = models.CharField(max_length=20, unique=True, verbose_name="Identifiant (domaine_id)")
    libelle = models.CharField(max_length=250)
    libelle_ar = models.CharField(max_length=250, blank=True, default='')
    systeme = models.CharField(max_length=50)
    code_source = models.CharField(max_length=20, blank=True, default='')
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['libelle']

    def __str__(self):
        return self.libelle


class FiliereFormation(models.Model):
    """Filière (facultative, ex: 'Architecture') — toujours rattachée au même domaine que ses
    spécialités (REGLES_FORMATION F03)."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (filiere_id)")
    domaine = models.ForeignKey(DomaineFormation, on_delete=models.CASCADE, related_name='filieres')
    libelle = models.CharField(max_length=250)
    libelle_ar = models.CharField(max_length=250, blank=True, default='')
    cle_recherche = models.CharField(max_length=250, db_index=True)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['libelle']

    def __str__(self):
        return self.libelle


class SpecialiteFormation(models.Model):
    """Spécialité de formation (967 entrées) — nature=specialite (FP attestée) ou
    theme_editorial/observation_universitaire selon la source (voir COUVERTURE)."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (specialite_id)")
    domaine = models.ForeignKey(DomaineFormation, on_delete=models.CASCADE, related_name='specialites')
    filiere = models.ForeignKey(FiliereFormation, null=True, blank=True, on_delete=models.SET_NULL, related_name='specialites')
    libelle = models.CharField(max_length=300)
    libelle_ar = models.CharField(max_length=300, blank=True, default='')
    cle_recherche = models.CharField(max_length=300, db_index=True)
    nature = models.CharField(max_length=40, blank=True, default='')
    code_source = models.CharField(max_length=30, blank=True, default='')
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")
    page_pdf = models.PositiveSmallIntegerField(null=True, blank=True)
    statut_reference = models.CharField(max_length=60, blank=True, default='')
    selectionnable = models.BooleanField(default=True)

    class Meta:
        ordering = ['libelle']

    def __str__(self):
        return self.libelle


class DiplomeSpecialite(models.Model):
    """Couple attesté diplôme+spécialité (921 liens) — la liste à proposer en priorité dans le
    formulaire (REGLES_FORMATION F02) ; un diplôme et une spécialité de deux couples différents
    ne doivent jamais être combinés comme s'ils formaient une même formation."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (lien_id)")
    diplome = models.ForeignKey(TypeDiplome, on_delete=models.CASCADE, related_name='specialites_liees')
    specialite = models.ForeignKey(SpecialiteFormation, on_delete=models.CASCADE, related_name='diplomes_lies')
    statut = models.CharField(max_length=60, blank=True, default='')
    selectionnable = models.BooleanField(default=True)
    precision = models.TextField(blank=True, default='')
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    class Meta:
        unique_together = [('diplome', 'specialite')]

    def __str__(self):
        return f"{self.diplome} — {self.specialite}"


class AliasDiplome(models.Model):
    """Variante d'intitulé/abréviation d'un TypeDiplome (FR/AR) pour la recherche."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (alias_id)")
    diplome = models.ForeignKey(TypeDiplome, on_delete=models.CASCADE, related_name='alias')
    libelle = models.CharField(max_length=250)
    cle_recherche = models.CharField(max_length=250, db_index=True)
    langue = models.CharField(max_length=10, blank=True, default='und')
    ambiguite = models.BooleanField(default=False)
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    def __str__(self):
        return self.libelle


class AliasSpecialite(models.Model):
    """Variante d'intitulé d'une SpecialiteFormation (FR/AR) pour la recherche."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (alias_id)")
    specialite = models.ForeignKey(SpecialiteFormation, on_delete=models.CASCADE, related_name='alias')
    libelle = models.CharField(max_length=300)
    cle_recherche = models.CharField(max_length=300, db_index=True)
    langue = models.CharField(max_length=10, blank=True, default='fr')
    type_alias = models.CharField(max_length=40, blank=True, default='')
    contexte = models.CharField(max_length=250, blank=True, default='')
    ambiguite = models.BooleanField(default=False)
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    def __str__(self):
        return self.libelle


class GroupeMetier(models.Model):
    """Hiérarchie source des métiers (secteur_source → domaine_source, nomenclature NAME) —
    conservée telle quelle pour la migration/redirection, indépendante de Secteur/Domaine ANEM
    déjà en place (mêmes codes source mais rôle différent : classification, pas matching)."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (groupe_id)")
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='enfants')
    type_groupe = models.CharField(max_length=40)
    libelle = models.CharField(max_length=250)
    code_source = models.CharField(max_length=20, blank=True, default='')
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    class Meta:
        ordering = ['code']

    def __str__(self):
        return self.libelle


class Metier(models.Model):
    """Métier (1038 codes, granularite=fiche_groupe ou metier) — `metier_canonique` résout les
    44 redirections d'anciens codes (REGLES_MATCHING R04) ; toujours résoudre ce champ avant
    d'agréger des profils par métier, mais ne jamais supprimer le code de départ stocké ailleurs
    (candidature, offre) — R03 : conserver l'appellation précise du candidat, pas seulement le
    code de fiche, une fiche_groupe pouvant réunir plusieurs postes distincts."""
    code = models.CharField(max_length=20, unique=True, verbose_name="Identifiant (metier_id)")
    metier_canonique = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='redirections',
        help_text="Cible définitive de recherche — soi-même si le métier est actif.",
    )
    libelle = models.CharField(max_length=250)
    cle_recherche = models.CharField(max_length=250, db_index=True)
    granularite = models.CharField(max_length=20, default='metier')
    groupe_principal = models.ForeignKey(GroupeMetier, null=True, blank=True, on_delete=models.SET_NULL, related_name='metiers')
    code_source = models.CharField(max_length=20, blank=True, default='')
    libelle_source = models.CharField(max_length=250, blank=True, default='')
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")
    selectionnable = models.BooleanField(default=True)
    statut = models.CharField(max_length=20, default='actif')

    class Meta:
        ordering = ['libelle']

    def __str__(self):
        return self.libelle


class Appellation(models.Model):
    """Alias/appellation de poste rattachée à un Metier (7429 entrées) — c'est l'intitulé exact
    déclaré par le candidat qui doit être conservé (R03), pas seulement le code Metier."""
    code = models.CharField(max_length=20, unique=True, verbose_name="Identifiant (appellation_id)")
    metier = models.ForeignKey(Metier, on_delete=models.CASCADE, related_name='appellations')
    libelle = models.CharField(max_length=250)
    cle_recherche = models.CharField(max_length=250, db_index=True)
    langue = models.CharField(max_length=10, blank=True, default='fr')
    type_alias = models.CharField(max_length=40, blank=True, default='')
    ambiguite = models.BooleanField(default=False)
    actif = models.BooleanField(default=True)
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    def __str__(self):
        return self.libelle


class ProfilSuggestion(models.Model):
    """Regroupement éditorial de métiers autour d'un même intitulé/contexte (87 entrées) — sert
    à proposer un petit ensemble cohérent de compétences/spécialités lors de la rédaction d'une
    offre, jamais une exigence automatique."""
    code = models.CharField(max_length=80, unique=True, verbose_name="Identifiant (profil_suggestion_id)")
    contexte = models.CharField(max_length=200, verbose_name="Intitulé/contexte (regle_intitule_contexte)")
    nb_metiers = models.PositiveSmallIntegerField(default=0)
    limite = models.TextField(blank=True, default='', verbose_name="Avertissement d'usage")
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    def __str__(self):
        return self.contexte


class MetierCompetence(models.Model):
    """Suggestion de compétence pour un Metier (2813 liens) — jamais attribuée automatiquement
    au candidat (consigne client explicite) : `attribution_candidat_auto` reste toujours False
    en pratique, champ conservé pour fidélité au fichier source."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (lien_id)")
    metier = models.ForeignKey(Metier, on_delete=models.CASCADE, related_name='competences_suggerees')
    competence = models.ForeignKey('CompetenceReferentiel', on_delete=models.CASCADE, related_name='metiers_lies')
    profil_suggestion = models.ForeignKey(ProfilSuggestion, null=True, blank=True, on_delete=models.SET_NULL, related_name='competences_liees')
    usage = models.CharField(max_length=60, blank=True, default='')
    attribution_candidat_auto = models.BooleanField(default=False)
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    class Meta:
        unique_together = [('metier', 'competence')]


class MetierFormation(models.Model):
    """Suggestion de spécialité pour rédiger une offre autour d'un Metier (1411 liens, pont vers
    le fichier Diplômes) — le recruteur choisit les diplômes/spécialités réellement acceptés,
    ce lien n'est jamais une exigence légale ni une preuve de compétence."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (lien_id)")
    metier = models.ForeignKey(Metier, on_delete=models.CASCADE, related_name='formations_suggerees')
    specialite = models.ForeignKey(SpecialiteFormation, on_delete=models.CASCADE, related_name='metiers_lies')
    profil_suggestion = models.ForeignKey(ProfilSuggestion, null=True, blank=True, on_delete=models.SET_NULL, related_name='formations_liees')
    relation = models.CharField(max_length=40, blank=True, default='')
    usage_score_auto = models.BooleanField(default=False)
    precision = models.TextField(blank=True, default='')
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    class Meta:
        unique_together = [('metier', 'specialite')]


class RelationMetier(models.Model):
    """Relation entre deux métiers (50 lignes) — redirection_equivalente (fusion de recherche)
    ou plus_precis_que ; R04 : ne jamais suivre plus_precis_que comme une équivalence."""
    code = models.CharField(max_length=30, unique=True, verbose_name="Identifiant (relation_id)")
    metier_depart = models.ForeignKey(Metier, on_delete=models.CASCADE, related_name='relations_depart')
    metier_arrivee = models.ForeignKey(Metier, on_delete=models.CASCADE, related_name='relations_arrivee')
    relation = models.CharField(max_length=40)
    active_recherche = models.BooleanField(default=True)
    justification = models.TextField(blank=True, default='')
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    def __str__(self):
        return f"{self.metier_depart} → {self.metier_arrivee} ({self.relation})"


class ParametreMatching(models.Model):
    """Paramètres de pondération/matching éditables (PARAM_MATCHING, 12 lignes) — consommé par
    matcher.py au lieu de poids codés en dur, une fois la Phase 4 branchée."""
    cle = models.CharField(max_length=60, unique=True, verbose_name="Identifiant (parametre)")
    valeur = models.CharField(max_length=60)
    type_valeur = models.CharField(max_length=20, default='string')
    usage = models.CharField(max_length=150, blank=True, default='')
    regle = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.cle} = {self.valeur}"


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
        help_text="Résolution non ambiguë uniquement — voir ProfilCandidat.diplome_ref. Le vrai repli de matching "
                  "reste `diplomes_acceptes` (couples explicites) ; ce champ est informatif, pas consommé par matcher.py.",
    )
    niveau_scolaire_ref = models.ForeignKey(
        'Scolarite', null=True, blank=True, on_delete=models.SET_NULL, related_name='offres_niveau_requis',
        verbose_name="Niveau de scolarité requis (référentiel v2, résolu depuis `diplome`)",
    )
    metier = models.ForeignKey(
        'Metier', null=True, blank=True, on_delete=models.SET_NULL, related_name='offres',
        verbose_name="Métier (référentiel v2)",
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
        from .referentiel_utils import resoudre_diplome_legacy
        self.diplome_ref, self.niveau_scolaire_ref = resoudre_diplome_legacy(self.diplome)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.titre} - {self.entreprise.nom_entreprise}"


class OffreDiplomeAccepte(models.Model):
    """Couple diplôme+spécialité explicitement accepté par le recruteur pour cette offre
    (REGLES_FORMATION F06 — le recruteur définit la liste, jamais une équivalence automatique
    déduite d'un niveau/nombre d'années). Une offre sans ligne ici n'exige aucun couple précis
    (donnée manquante ≠ incompatibilité) — repli sur `OffreEmploi.diplome` (niveau minimum)."""
    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='diplomes_acceptes')
    couple = models.ForeignKey('DiplomeSpecialite', on_delete=models.CASCADE, related_name='offres_liees')

    class Meta:
        unique_together = [('offre', 'couple')]

    def __str__(self):
        return f"{self.offre.titre} — {self.couple}"


class ExigenceImperative(models.Model):
    """S12 (REGLES_MATCHING) — exigence professionnelle impérative déclarée par le recruteur
    sur son offre (permis, habilitation, droit d'exercice, certification...), distincte du
    diplôme (S12 : "Droits d'exercice, permis et certifications restent des champs avec
    justificatifs, distincts du diplôme"). Ne participe jamais au score de matching — c'est un
    filtre d'éligibilité à vérifier manuellement, pas un critère noté."""
    offre = models.ForeignKey(OffreEmploi, on_delete=models.CASCADE, related_name='exigences_imperatives')
    label = models.CharField(max_length=150, verbose_name="Exigence (ex: Permis B, Habilitation électrique)")
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
    type_exigence = models.CharField(max_length=15, choices=TYPE_EXIGENCE_CHOICES, default='OBLIGATOIRE')
    niveau_requis = models.CharField(max_length=20, choices=NIVEAU_CHOICES, blank=True, null=True)

    class Meta:
        ordering = ['type_exigence', 'label']
        unique_together = [('offre', 'label')]

    def __str__(self):
        return f"{self.label} ({self.get_type_exigence_display()}) — {self.offre.titre}"


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


class ProfilCandidat(models.Model):
    """
    Profil étendu pour un candidat, contenant son CV et toutes ses préférences.
    """
    SITUATION_ACTUELLE = [
        ('EN_RECHERCHE', 'En recherche active'),
        ('EN_POSTE', 'En poste'),
        ('A_L_ECOUTE', 'À l\'écoute du marché'),
        ('ETUDIANT', 'Étudiant'),
    ]
    
    MOBILITE_CHOICES = [
        ('LOCALE', 'Locale (Wilaya)'),
        ('REGIONALE', 'Régionale'),
        ('NATIONALE', 'Nationale'),
        ('INTERNATIONALE', 'Internationale'),
    ]

    SERVICE_MILITAIRE_CHOICES = [
        ('NON_CONCERNE', 'Non concerné (Femme)'),
        ('DEGAGE', 'Dégagé'),
        ('SURSITAIRE', 'Sursitaire'),
        ('INAPTE', 'Inapte'),
        ('INCORPORE', 'Incorporé'),
    ]

    SEXE_CHOICES = [
        ('HOMME', 'Homme'),
        ('FEMME', 'Femme'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_candidat')
    titre_professionnel = models.CharField(max_length=150, blank=True, null=True)
    date_naissance = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    sexe = models.CharField(max_length=10, choices=SEXE_CHOICES, blank=True, null=True, verbose_name="Sexe")
    
    cv_pdf = models.FileField(
        upload_to='cvs/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx']),
            validate_document_mime,
            validate_file_size(5),
        ]
    )
    cv_pdf_maj_le = models.DateTimeField(null=True, blank=True, verbose_name="Dernière mise à jour du CV")
    photo_profil = models.ImageField(
        upload_to='photos_profil/',
        blank=True,
        null=True,
        verbose_name="Photo de profil",
        validators=[
            validate_image_mime,
            validate_file_size(2),
        ]
    )
    # --- NOUVEAU : RÉSEAUX ET BIO EXTRAITS PAR L'IA ---
    bio = models.TextField(blank=True, null=True, verbose_name="Résumé de profil / Bio")
    linkedin = models.URLField(blank=True, null=True, verbose_name="Lien LinkedIn")
    github = models.URLField(blank=True, null=True, verbose_name="Lien GitHub")

    # --- NOUVEAU : INFOS LOCALISATION (Samira) ---
    wilaya = models.CharField(max_length=100, choices=WILAYAS_CHOICES, blank=True, null=True, verbose_name="Wilaya de résidence")
    commune = models.CharField(max_length=100, blank=True, null=True, verbose_name="Commune")
    adresse = models.CharField(max_length=255, blank=True, null=True, verbose_name="Adresse")

    # --- INFOS ADMINISTRATIVES ---
    service_militaire = models.CharField(max_length=50, choices=SERVICE_MILITAIRE_CHOICES, blank=True, null=True)
    permis_conduire = models.BooleanField(default=False, verbose_name="Permis de conduire")
    vehicule_personnel = models.BooleanField(default=False, verbose_name="Véhiculé") 
    passeport_valide = models.BooleanField(default=False, verbose_name="Passeport valide")
    visible_cvtheque = models.BooleanField(
        default=True,
        verbose_name="Profil déblocable dans la CVthèque",
        help_text="Si désactivé, le profil reste visible/recherchable mais aucun recruteur ne peut "
                  "débloquer les coordonnées/CV via un crédit tant que ce n'est pas réactivé.",
    )

    # --- PRÉFÉRENCES DE RECRUTEMENT ---
    salaire_souhaite = models.CharField(max_length=100, blank=True, null=True, help_text="Ex: 80 000 DA")
    mobilite = models.CharField(max_length=50, choices=MOBILITE_CHOICES, blank=True, null=True)
    situation_actuelle = models.CharField(max_length=50, choices=SITUATION_ACTUELLE, blank=True, null=True)
    metier = models.ForeignKey(
        'Metier', null=True, blank=True, on_delete=models.SET_NULL, related_name='candidats',
        verbose_name="Métier actuel/déclaré (référentiel v2)",
    )
    metier_souhaite = models.ForeignKey(
        'Metier', null=True, blank=True, on_delete=models.SET_NULL, related_name='candidats_interesses_v2',
        verbose_name="Métier souhaité / préférence de recherche (référentiel v2)",
        help_text="Distinct de `metier` (situation actuelle) — un candidat peut viser un métier différent de "
                  "celui qu'il exerce aujourd'hui.",
    )

    # --- ANCIENS CHAMPS GARDÉS ---
    diplome = models.CharField(max_length=100, choices=DIPLOMES_CHOICES, blank=True, null=True, verbose_name="Diplôme")
    diplome_ref = models.ForeignKey(
        'TypeDiplome', null=True, blank=True, on_delete=models.SET_NULL, related_name='profils_niveau_declare',
        verbose_name="Diplôme (référentiel v2, résolu depuis `diplome`)",
        help_text="Résolution non ambiguë uniquement (MIGRATION niveau_v1_vers_diplome, F02/F06) — reste vide pour "
                  "les valeurs de `diplome` trop imprécises pour être converties sans deviner (ex: TS, MASTER_1/2, "
                  "FORMATION_PRO). `diplome` (texte) reste la source de vérité, jamais modifié par cette résolution.",
    )
    niveau_scolaire_ref = models.ForeignKey(
        'Scolarite', null=True, blank=True, on_delete=models.SET_NULL, related_name='profils_niveau_declare',
        verbose_name="Niveau de scolarité (référentiel v2, résolu depuis `diplome`)",
        help_text="Pour les valeurs de `diplome` qui ne sont pas un diplôme mais un niveau de scolarité "
                  "(NIVEAU_SECONDAIRE, UNIVERSITAIRE_SANS_DIPLOME) — mutuellement exclusif avec `diplome_ref`.",
    )
    experiences = models.TextField(blank=True, null=True, verbose_name="Expériences")
    competences = models.TextField(blank=True, null=True, verbose_name="Compétences")
    langues = models.CharField(max_length=255, blank=True, null=True, verbose_name="Langues")
    
    # --- PARAMÈTRES ET NOTIFICATIONS (UX Emploitic) ---
    notif_offres_exclusives = models.BooleanField(default=True, verbose_name="Offres exclusives et partenaires")
    notif_newsletter = models.BooleanField(default=True, verbose_name="Actualités et newsletter")
    notif_mise_a_jour = models.BooleanField(default=True, verbose_name="Emails de mise à jour")
    niveau_experience = models.CharField(max_length=50, choices=NIVEAUX_EXPERIENCE, blank=True, null=True, verbose_name="Niveau d'expérience global")

    def save(self, *args, **kwargs):
        from .referentiel_utils import resoudre_diplome_legacy
        self.diplome_ref, self.niveau_scolaire_ref = resoudre_diplome_legacy(self.diplome)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Profil de {self.user.username}"
class ExperienceCandidat(models.Model):
    """
    Table pour stocker chaque expérience professionnelle séparément (comme les cartes Emploitic)
    """
    profil = models.ForeignKey(ProfilCandidat, on_delete=models.CASCADE, related_name='experiences_detail')
    titre_poste = models.CharField(max_length=200, verbose_name="Titre du poste (Ex: Développeur Front-End)")
    entreprise = models.CharField(max_length=200, verbose_name="Nom de l'entreprise")
    metier = models.ForeignKey(
        'Metier', null=True, blank=True, on_delete=models.SET_NULL, related_name='experiences',
        verbose_name="Métier de cette expérience (référentiel v2)",
    )
    appellation = models.ForeignKey(
        'Appellation', null=True, blank=True, on_delete=models.SET_NULL, related_name='experiences',
        verbose_name="Appellation précise (référentiel v2)",
        help_text="FORMULAIRE experience.appellation_id — conserve l'intitulé précis au sein d'une fiche métier "
                  "large (ex. une fiche Metier peut regrouper plusieurs appellations de poste distinctes).",
    )

    date_debut = models.DateField(verbose_name="Date de début")
    date_fin = models.DateField(null=True, blank=True, verbose_name="Date de fin (Vide si toujours en poste)")
    
    description = models.TextField(blank=True, null=True, verbose_name="Missions et réalisations")

    class Meta:
        ordering = ['-date_debut'] # Trie automatiquement de la plus récente à la plus ancienne

    def __str__(self):
        return f"{self.titre_poste} chez {self.entreprise}"


class FormationCandidat(models.Model):
    """
    Table pour stocker chaque diplôme/formation séparément
    """
    STATUT_CHOICES = [
        ('OBTENU', 'Obtenu'),
        ('EN_COURS', 'En cours'),
        ('INTERROMPU', 'Interrompu'),
    ]
    STATUT_VALIDATION_CHOICES = [
        ('DECLARE', 'Déclaré'),
        ('DOCUMENT_VERIFIE', 'Document vérifié'),
        ('A_PRECISER', 'À préciser'),
    ]
    VERSION_REFERENTIEL_DEFAUT = 'TAFTECH-2026.09.11-v2'

    profil = models.ForeignKey(ProfilCandidat, on_delete=models.CASCADE, related_name='formations_detail')
    diplome = models.CharField(max_length=200, verbose_name="Nom de la formation ou diplôme (intitulé exact déclaré)")
    etablissement = models.CharField(max_length=200, blank=True, verbose_name="Université ou École")
    pays_formation = models.CharField(
        max_length=2, blank=True, default='DZ',
        verbose_name="Pays de la formation (code ISO)",
        help_text="FORMULAIRE pays_formation — accepte un diplôme étranger, aucune reconnaissance administrative déduite.",
    )

    # --- Référentiel v2 (Phase 2, 17/09/2026) — nullable : `diplome` ci-dessus reste
    # l'intitulé original à préserver (FORMULAIRE F01/F02) même une fois ces champs remplis.
    diplome_ref = models.ForeignKey(
        'TypeDiplome', null=True, blank=True, on_delete=models.SET_NULL, related_name='formations_candidats',
        verbose_name="Type de diplôme (référentiel v2)",
    )
    specialite_ref = models.ForeignKey(
        'SpecialiteFormation', null=True, blank=True, on_delete=models.SET_NULL, related_name='formations_candidats',
        verbose_name="Spécialité (référentiel v2)",
        help_text="Doit correspondre à la même formation que `diplome_ref` (ne jamais combiner un diplôme d'une "
                  "formation avec la spécialité d'une autre — REGLES_FORMATION du client).",
    )
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='OBTENU', verbose_name="Statut de la formation")
    statut_validation = models.CharField(
        max_length=20, choices=STATUT_VALIDATION_CHOICES, default='DECLARE',
        verbose_name="Statut de validation",
        help_text="FORMULAIRE statut_validation — un diplôme déclaré n'est pas automatiquement authentifié.",
    )

    date_debut = models.DateField(null=True, blank=True, verbose_name="Date de début")
    date_fin = models.DateField(
        null=True, blank=True,
        verbose_name="Date de fin",
        help_text="Année d'obtention si statut=OBTENU ; sans valeur si INTERROMPU. Ne jamais confondre avec "
                  "`date_fin_prevue` (statut=EN_COURS) — FORMULAIRE distingue explicitement annee_obtention "
                  "et annee_fin_prevue.",
    )
    date_fin_prevue = models.DateField(
        null=True, blank=True,
        verbose_name="Date de fin prévue (si en cours)",
        help_text="FORMULAIRE annee_fin_prevue — ne valide pas le diplôme, juste une échéance annoncée.",
    )

    document_reference = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name="Référence du justificatif",
        help_text="FORMULAIRE document_reference — référence privée gérée par le site, jamais rendue publique.",
    )
    est_principale = models.BooleanField(
        default=False,
        verbose_name="Formation principale (préférence d'affichage)",
        help_text="FORMULAIRE est_principale — le matching continue d'examiner toutes les formations quel que soit ce choix.",
    )
    version_referentiel = models.CharField(
        max_length=30, blank=True, default=VERSION_REFERENTIEL_DEFAUT,
        verbose_name="Version du référentiel utilisée",
    )

    description = models.TextField(blank=True, null=True, verbose_name="Description ou mention")

    class Meta:
        ordering = ['-date_fin']

    def __str__(self):
        return f"{self.diplome} - {self.etablissement}"

# ==========================================
# 3. FONCTIONNALITÉS AVANCÉES DU CANDIDAT
# ==========================================

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

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"Alerte de {self.candidat.username} - {self.mots_cles}"

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
    )

    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type_notif = models.CharField(max_length=25, choices=TYPES_NOTIF, default='INFO')
    titre = models.CharField(max_length=200)
    message = models.TextField()
    lue = models.BooleanField(default=False, verbose_name="Message lu")
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation'] # Les messages les plus récents en premier

    def __str__(self):
        return f"{self.get_type_notif_display()} pour {self.destinataire.username}"

class ProfilCandidatFavori(models.Model):
    """
    Lien entre un recruteur et un candidat marqué en favori dans la CVthèque.
    """
    recruteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='candidats_favoris'
    )
    candidat = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favori_par'
    )
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('recruteur', 'candidat')
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.recruteur.username} ⭐ {self.candidat.username}"
    
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


class AuditLog(models.Model):
    ACTIONS = [
        ('APPROUVER_OFFRE', 'Approuver offre'),
        ('REFUSER_OFFRE', 'Refuser offre'),
        ('APPROUVER_ENTREPRISE', 'Approuver entreprise'),
        ('REFUSER_ENTREPRISE', 'Refuser entreprise'),
        ('SUPPRIMER_USER', 'Supprimer utilisateur'),
        ('SUPPRIMER_OFFRE', 'Supprimer offre'),
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
    parser_cv_max_tokens = models.PositiveIntegerField(default=6000, validators=[MinValueValidator(100)])
    parser_cv_prompt = models.TextField(
        blank=True, verbose_name="Prompt Parser CV",
        help_text="Variables obligatoires : {cv_text} et {domaines_list}. Si vide, le prompt par défaut du code est utilisé.",
    )

    analyse_carriere_actif = models.BooleanField(default=True, verbose_name="Analyse carrière candidat active")
    analyse_carriere_max_tokens = models.PositiveIntegerField(default=1200, validators=[MinValueValidator(100)])
    analyse_carriere_prompt = models.TextField(
        blank=True, verbose_name="Prompt Analyse carrière",
        help_text="Instructions système (aucune variable à interpoler — le profil du candidat est envoyé séparément). Si vide, le prompt par défaut du code est utilisé.",
    )

    analyse_recruteur_actif = models.BooleanField(default=True, verbose_name="Analyse IA recruteur active")
    analyse_recruteur_max_tokens = models.PositiveIntegerField(default=400, validators=[MinValueValidator(100)])
    analyse_recruteur_prompt = models.TextField(
        blank=True, verbose_name="Prompt Analyse recruteur",
        help_text=(
            "Variables disponibles : {offre_titre}, {entreprise}, {specialite}, {type_contrat}, {wilaya}, "
            "{nom_candidat}, {titre_candidat}, {diplome}, {competences}, {experiences}, {formations}, {score}. "
            "Si vide, le prompt par défaut du code est utilisé."
        ),
    )

    generation_offre_actif = models.BooleanField(default=True, verbose_name="Génération d'offre IA active")
    generation_offre_max_tokens = models.PositiveIntegerField(default=1900, validators=[MinValueValidator(100)])
    generation_offre_prompt = models.TextField(
        blank=True, verbose_name="Prompt Génération d'offre",
        help_text=(
            "Variables disponibles : {titre}, {specialite}, {diplome}, {experience}, {contrat}, {wilaya}. "
            "Si vide, le prompt par défaut du code est utilisé."
        ),
    )

    conseils_dashboard_actif = models.BooleanField(default=True, verbose_name="Conseils personnalisés (tableau de bord) actifs")
    conseils_dashboard_max_tokens = models.PositiveIntegerField(default=600, validators=[MinValueValidator(100)])
    conseils_dashboard_prompt = models.TextField(
        blank=True, verbose_name="Prompt Conseils personnalisés",
        help_text="Instructions système (le profil/score/activité du candidat sont envoyés séparément). Si vide, le prompt par défaut du code est utilisé.",
    )

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


class CompetenceReferentiel(models.Model):
    """Référentiel de compétences suggérées, éditable par l'admin — alimente l'autocomplete du
    champ "Compétences" du profil candidat (TextField libre, non modifié : ceci ne fait que
    suggérer, jamais ne contraint la saisie), et sert aussi de table de normalisation pour les
    compétences extraites automatiquement d'un CV (jobs.cv_parser) — un intitulé parsé proche
    d'un `label` ou d'un `synonymes` est remplacé par le libellé canonique avant d'être proposé
    au candidat, pour éviter les doublons type "Gestion de projet" / "Gestion des projets" /
    "Project Management"."""
    label = models.CharField(max_length=100, unique=True, verbose_name="Compétence")
    code = models.CharField(
        max_length=30, unique=True, null=True, blank=True, default=None,
        verbose_name="Identifiant référentiel v2 (competence_id)",
        help_text="Renseigné uniquement pour les compétences importées du référentiel v2 (COMPETENCES.competence_id) — null pour les entrées créées manuellement avant cet import.",
    )
    synonymes = models.TextField(
        blank=True, default="",
        verbose_name="Synonymes / traductions",
        help_text="Intitulés équivalents séparés par des virgules (ex: Project Management, Gestion des projets) — utilisés pour normaliser les compétences extraites d'un CV vers ce libellé.",
    )
    actif = models.BooleanField(default=True, verbose_name="Suggérée")
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    class Meta:
        ordering = ['label']

    def __str__(self):
        return self.label


class FaqItem(models.Model):
    """Question/réponse FAQ, éditable par l'admin — 3 catégories correspondant aux 3 pages qui
    affichaient jusqu'ici des listes en dur : ContactezNous (GENERAL), LandingRecruteur
    (RECRUTEUR), PremiumPage (PREMIUM). Un seul modèle + filtre catégorie plutôt que 3 modèles
    séparés — un admin gère tout au même endroit, chaque page ne consomme que sa catégorie."""
    CATEGORIE_CHOICES = [
        ('GENERAL', 'Général (page Contact)'),
        ('RECRUTEUR', 'Recruteur (landing)'),
        ('PREMIUM', 'Premium'),
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

class CompetenceCandidat(models.Model):
    """Compétence structurée d'un candidat, avec niveau — remplace progressivement le champ
    texte libre `ProfilCandidat.competences` pour l'UI (page "Mes compétences"), mais ce
    dernier reste synchronisé automatiquement à chaque sauvegarde (matcher.py/cv_parser.py
    continuent de lire le texte libre sans modification)."""
    NIVEAU_CHOICES = [
        ('DEBUTANT', 'Débutant'),
        ('INTERMEDIAIRE', 'Intermédiaire'),
        ('AVANCE', 'Avancé'),
        ('CONFIRME', 'Confirmé / Expert'),
    ]
    SOURCE_CHOICES = [
        ('DECLARE', 'Auto-déclaré'),
        ('TESTE', 'Vérifié par test'),  # anticipe le futur module "Mes tests", pas encore actif
    ]
    NIVEAU_POINTS = {'DEBUTANT': 1, 'INTERMEDIAIRE': 2, 'AVANCE': 3, 'CONFIRME': 4}

    profil = models.ForeignKey(ProfilCandidat, on_delete=models.CASCADE, related_name='competences_detail')
    label = models.CharField(max_length=100, verbose_name="Compétence")
    competence_ref = models.ForeignKey(
        'CompetenceReferentiel', null=True, blank=True, on_delete=models.SET_NULL, related_name='competences_candidats',
        verbose_name="Compétence référentiel v2 (competence_id)",
        help_text="FORMULAIRE competence_candidat.competence_id — rattachement au référentiel v2 quand `label` "
                  "correspond à une entrée connue (résolu automatiquement par label, jamais forcé) ; `label` reste "
                  "la source de vérité texte, ce champ ne fait qu'ajouter une résolution stable au COMPETENCES.competence_id.",
    )
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES, default='DEBUTANT')
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='DECLARE')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['label']
        unique_together = [('profil', 'label')]

    def __str__(self):
        return f"{self.label} ({self.get_niveau_display()}) — {self.profil}"


class TypeDocument(models.Model):
    """Référentiel des catégories de documents privés candidat, éditable par l'admin (pattern
    CompetenceReferentiel) — pas figé dans le code, l'admin peut en ajouter/retirer."""
    label = models.CharField(max_length=100, unique=True, verbose_name="Type de document")
    ordre = models.PositiveIntegerField(default=0)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordre', 'label']

    def __str__(self):
        return self.label


class DocumentCandidat(models.Model):
    """Espace documents privé du candidat, jamais attaché automatiquement à une candidature
    (contrairement au CV/lettre de motivation "officiels" de ProfilCandidat) et jamais visible
    par un recruteur par défaut — sauf partage ponctuel explicite (voir PartageDocument)."""
    profil = models.ForeignKey(ProfilCandidat, on_delete=models.CASCADE, related_name='documents')
    type_document = models.ForeignKey(TypeDocument, on_delete=models.SET_NULL, null=True, related_name='documents')
    nom_personnalise = models.CharField(max_length=150, blank=True, verbose_name="Nom (ex: CV version IT)")
    fichier = models.FileField(
        upload_to='documents_candidats/',
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']),
            validate_document_mime,
            validate_file_size(5),
        ]
    )
    date_upload = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_upload']

    def __str__(self):
        return self.nom_personnalise or (self.type_document.label if self.type_document else "Document")


class PartageDocument(models.Model):
    """Autorisation explicite du candidat pour qu'une entreprise précise voie un document privé
    précis — le partage par défaut reste fermé (DocumentCandidat), ceci est l'exception ponctuelle
    que le candidat active lui-même. Partagé avec toute l'équipe de l'entreprise (même principe que
    le déblocage CVthèque par crédit — pas juste le recruteur qui a reçu l'autorisation)."""
    document = models.ForeignKey(DocumentCandidat, on_delete=models.CASCADE, related_name='partages')
    entreprise = models.ForeignKey(ProfilEntreprise, on_delete=models.CASCADE, related_name='documents_partages')
    date_partage = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('document', 'entreprise')
        ordering = ['-date_partage']

    def __str__(self):
        return f"{self.document} → {self.entreprise.nom_entreprise}"


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