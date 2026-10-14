"""Référentiel v2 : diplômes/spécialités, métiers/appellations, compétences, relations et paramètres de matching."""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from ..validators import validate_document_mime, validate_image_mime, validate_file_size, validate_document_or_image_mime
from ..constants import (
    WILAYAS_CHOICES, DIPLOMES_CHOICES,
    NIVEAUX_EXPERIENCE, TYPES_CONTRAT, TAILLES_ENTREPRISE_CHOICES
)


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


class RelationSpecialite(models.Model):
    """Relation manuelle 'similaire' entre deux spécialités de formation (référentiel Diplômes,
    matcher.py::_specialite_relation_similaire, session 25/09/2026) — même principe que
    RelationMetier/'similaire' : le référentiel v2 du client contient deux taxonomies
    parallèles pour un même grand domaine (ex: Domaine 200 'Mathématiques et informatique',
    spécialités académiques précises importées des classeurs universités ; Domaine 218
    'Informatique, données et numérique', thèmes éditoriaux v1 larges type 'Informatique'/
    'Développement web') qui ne se recoupent jamais par exact match de spécialité alors
    qu'elles décrivent le même champ en pratique. Jamais déduite automatiquement (pas de
    bonus 'même domaine' générique, qui produirait trop de faux positifs sur des domaines
    couvrant des spécialités hétérogènes) — seulement peuplée à la main via le panel admin
    référentiel v2."""
    specialite_depart = models.ForeignKey(SpecialiteFormation, on_delete=models.CASCADE, related_name='relations_similaires_depart')
    specialite_arrivee = models.ForeignKey(SpecialiteFormation, on_delete=models.CASCADE, related_name='relations_similaires_arrivee')
    active_recherche = models.BooleanField(default=True)
    justification = models.TextField(blank=True, default='')

    class Meta:
        unique_together = [('specialite_depart', 'specialite_arrivee')]

    def __str__(self):
        return f"{self.specialite_depart} → {self.specialite_arrivee} (similaire)"


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
    actif = models.BooleanField(
        default=True, verbose_name="Officielle et proposée",
        help_text="Dérivé du statut : vrai uniquement pour une compétence VALIDÉE. Les consommateurs "
                  "(autocomplete, parser CV, IA de génération, suggestions par métier) filtrent sur ce champ, "
                  "donc une simple suggestion n'y apparaît jamais.",
    )
    source_id = models.CharField(max_length=20, blank=True, default='', verbose_name="Provenance (Source.code)")

    # Cycle de vie (point 11, 13/10/2026) : SUGGÉRÉE -> VALIDÉE | REJETÉE ; VALIDÉE <-> DÉSACTIVÉE ;
    # REJETÉE -> VALIDÉE (réexamen). Une compétence proposée automatiquement naît SUGGÉRÉE et ne
    # devient officielle (VALIDÉE) que par une décision explicite de l'admin.
    STATUT_SUGGEREE = 'SUGGEREE'
    STATUT_VALIDEE = 'VALIDEE'
    STATUT_REJETEE = 'REJETEE'
    STATUT_DESACTIVEE = 'DESACTIVEE'
    STATUT_CHOICES = [
        (STATUT_SUGGEREE, 'Suggérée (en attente de validation)'),
        (STATUT_VALIDEE, 'Validée (officielle)'),
        (STATUT_REJETEE, 'Rejetée'),
        (STATUT_DESACTIVEE, 'Désactivée'),
    ]
    TRANSITIONS = {
        STATUT_SUGGEREE: {STATUT_VALIDEE, STATUT_REJETEE},
        STATUT_VALIDEE: {STATUT_DESACTIVEE},
        STATUT_DESACTIVEE: {STATUT_VALIDEE},
        STATUT_REJETEE: {STATUT_VALIDEE},
    }
    # Statuts qui servent encore à normaliser (rattacher) une saisie : une compétence désactivée
    # n'est plus proposée mais reste connue, pour ne pas casser les liens et les scores existants.
    STATUTS_RECONNUS = (STATUT_VALIDEE, STATUT_DESACTIVEE)

    ORIGINE_CHOICES = [
        ('ADMIN', "Créée par l'administrateur"),
        ('IMPORT', 'Importée du référentiel v2'),
        ('PROPOSITION_AUTO', 'Proposée automatiquement (saisies fréquentes hors référentiel)'),
    ]
    statut = models.CharField(max_length=12, choices=STATUT_CHOICES, default=STATUT_VALIDEE, db_index=True)
    origine = models.CharField(max_length=20, choices=ORIGINE_CHOICES, default='ADMIN')
    date_statut = models.DateTimeField(null=True, blank=True, verbose_name="Dernier changement de statut")
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='+', verbose_name="Décision prise par",
    )

    class Meta:
        ordering = ['label']

    def __str__(self):
        return self.label

    def save(self, *args, **kwargs):
        # Compatibilité : l'ancien booléen « actif=False » (créé par le code ou l'admin) signifie
        # « désactivée » ; ensuite `actif` suit toujours le statut.
        if self.statut == self.STATUT_VALIDEE and not self.actif:
            self.statut = self.STATUT_DESACTIVEE
        self.actif = self.statut == self.STATUT_VALIDEE
        champs = kwargs.get('update_fields')
        if champs is not None and 'statut' in champs and 'actif' not in champs:
            kwargs['update_fields'] = list(champs) + ['actif']
        super().save(*args, **kwargs)

    def changer_statut(self, nouveau, utilisateur=None):
        """Applique une transition autorisée (sinon ValueError) et trace qui/quand."""
        from django.utils import timezone
        if nouveau not in self.TRANSITIONS.get(self.statut, set()):
            raise ValueError(f"Transition interdite : {self.statut} -> {nouveau}.")
        self.statut = nouveau
        self.actif = nouveau == self.STATUT_VALIDEE  # avant save() : la règle de compatibilité lit `actif`
        self.date_statut = timezone.now()
        self.traite_par = utilisateur
        self.save(update_fields=['statut', 'actif', 'date_statut', 'traite_par'])
