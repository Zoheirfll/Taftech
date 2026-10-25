"""Profil candidat (expériences, formations, compétences), favoris et documents privés."""
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
from .referentiel import DiplomeSpecialite


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
        ('NON_CONCERNE', 'Non concerné'),
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
    # Persistance des 2 analyses IA du dashboard candidat (session 27/09/2026) — jusqu'ici
    # recalculées à chaque clic sans jamais être sauvegardées, donc perdues à la prochaine
    # visite. Le bouton associé devient "Ré-analyser" dès qu'un résultat existe déjà.
    derniers_conseils_dashboard = models.JSONField(null=True, blank=True, verbose_name="Derniers conseils IA (dashboard)")
    conseils_dashboard_le = models.DateTimeField(null=True, blank=True, verbose_name="Date des derniers conseils IA")
    derniere_analyse_carriere = models.TextField(null=True, blank=True, verbose_name="Dernière analyse carrière IA")
    analyse_carriere_le = models.DateTimeField(null=True, blank=True, verbose_name="Date de la dernière analyse carrière IA")
    # Empreinte (SHA-256) du prompt, des données envoyées, du modèle et de max_tokens au moment de la
    # dernière analyse : si elle n'a pas changé, le résultat stocké est renvoyé sans appel IA ni
    # décompte de quota (voir confidentialite_ia/empreinte.py). Aucune donnée personnelle : un hash.
    empreinte_analyse_carriere = models.CharField(max_length=64, blank=True, default='')
    empreinte_conseils = models.CharField(max_length=64, blank=True, default='')
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
    # Appellation précise choisie pour chacun des deux métiers (« Développeur web » au sein de « Études et
    # développement informatique ») : affichage seulement, le métier reste la clé du calcul.
    metier_appellation = models.ForeignKey(
        'Appellation', null=True, blank=True, on_delete=models.SET_NULL, related_name='profils_metier',
        verbose_name="Appellation du métier actuel (référentiel v2)",
    )
    metier_souhaite_appellation = models.ForeignKey(
        'Appellation', null=True, blank=True, on_delete=models.SET_NULL, related_name='profils_metier_souhaite',
        verbose_name="Appellation du métier souhaité (référentiel v2)",
    )
    # Métier proposé par le candidat (« Je ne trouve pas mon métier ») : affiché sur le profil en attente de
    # la décision de l'admin, mais JAMAIS un critère de calcul (le matching ne lit que `metier` /
    # `metier_souhaite`). Accepté ou rattaché : le métier officiel est posé et le lien retiré ; refusé : le lien
    # reste pour afficher le motif, sans effet sur le score.
    demande_metier = models.ForeignKey(
        'DemandeAjout', null=True, blank=True, on_delete=models.SET_NULL, related_name='profils_metier',
        verbose_name="Demande d'ajout du métier actuel",
    )
    demande_metier_souhaite = models.ForeignKey(
        'DemandeAjout', null=True, blank=True, on_delete=models.SET_NULL, related_name='profils_metier_souhaite',
        verbose_name="Demande d'ajout du métier souhaité",
    )

    # --- ANCIENS CHAMPS GARDÉS ---
    diplome = models.CharField(max_length=100, choices=DIPLOMES_CHOICES, blank=True, null=True, verbose_name="Diplôme (ancien champ, conservé pour compat historique)")
    diplome_ref = models.ForeignKey(
        'TypeDiplome', null=True, blank=True, on_delete=models.SET_NULL, related_name='profils_niveau_declare',
        verbose_name="Niveau d'études (référentiel v2)",
        help_text="Choisi directement par le candidat (sélecteur référentiel v2, 37 valeurs précises) — remplace "
                  "l'ancien champ `diplome` texte libre côté formulaire. Sert de repli au matching diplôme quand "
                  "aucune `FormationCandidat` obtenue n'est renseignée (jamais pour la spécialité, qui n'a pas "
                  "d'équivalent ici) — voir `matcher._score_diplome_specialite`, `diplome_source='niveau_profil'`.",
    )
    niveau_scolaire_ref = models.ForeignKey(
        'Scolarite', null=True, blank=True, on_delete=models.SET_NULL, related_name='profils_niveau_declare',
        verbose_name="Niveau de scolarité (référentiel v2)",
        help_text="Pour un niveau qui n'est pas un diplôme mais un niveau de scolarité (secondaire, universitaire "
                  "sans diplôme) — mutuellement exclusif avec `diplome_ref`.",
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
        # Le candidat choisit désormais `diplome_ref` directement (sélecteur référentiel v2) —
        # ne jamais écraser ce choix explicite. La résolution automatique depuis l'ancien champ
        # `diplome` (texte) ne s'applique qu'aux profils qui n'ont encore jamais choisi via le
        # nouveau sélecteur (compat des profils créés avant ce changement).
        if self.diplome_ref_id is None and self.niveau_scolaire_ref_id is None:
            from ..referentiel_utils import resoudre_diplome_legacy
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
    # Métier proposé en attente de décision (voir ProfilCandidat.demande_metier) : jamais un critère de calcul.
    demande_metier = models.ForeignKey(
        'DemandeAjout', null=True, blank=True, on_delete=models.SET_NULL, related_name='experiences_metier',
        verbose_name="Demande d'ajout du métier de cette expérience",
    )

    date_debut = models.DateField(verbose_name="Date de début")
    date_fin = models.DateField(null=True, blank=True, verbose_name="Date de fin (Vide si toujours en poste)")

    # Précision réellement connue de chaque date (CV qui n'indique que « 2023 » ou
    # « mars 2023 »). La DateField reste complète (tri, calcul de durée du matcher) :
    # le jour/mois manquant y est une valeur technique de repli, jamais affichée.
    PRECISION_CHOICES = [('JOUR', 'Date complète'), ('MOIS', 'Mois et année'), ('ANNEE', 'Année seule')]
    date_debut_precision = models.CharField(max_length=5, choices=PRECISION_CHOICES, default='JOUR', verbose_name="Précision de la date de début")
    date_fin_precision = models.CharField(max_length=5, choices=PRECISION_CHOICES, default='JOUR', verbose_name="Précision de la date de fin")

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
        # Décision candidat vs admin sur une formation en attente : refusée par un admin, jamais
        # supprimée (règle projet — pas de hard delete de données candidat sans garde-fou/trace).
        # La formation reste visible sur le profil, sort de la file "à vérifier"
        # (AdminFormationsAVerifierAPIView filtre A_PRECISER seulement) et n'est plus traitée
        # comme provisoire par le matcher (`formation_a_verifier` ne teste que A_PRECISER) —
        # un candidat qui corrige l'intitulé et re-sauvegarde revient en A_PRECISER (save()
        # ci-dessous ne bascule REFUSEE qu'à travers ce même incertain/DECLARE, donc une
        # nouvelle tentative repasse par le flux normal, jamais bloquée définitivement).
        ('REFUSEE', 'Refusée par un administrateur'),
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

    # Précision réellement connue de chaque date (CV qui n'indique que « 2023 » ou
    # « mars 2023 »). La DateField reste complète (tri, calcul de durée du matcher) :
    # le jour/mois manquant y est une valeur technique de repli, jamais affichée.
    PRECISION_CHOICES = [('JOUR', 'Date complète'), ('MOIS', 'Mois et année'), ('ANNEE', 'Année seule')]
    date_debut_precision = models.CharField(max_length=5, choices=PRECISION_CHOICES, default='JOUR', verbose_name="Précision de la date de début")
    date_fin_precision = models.CharField(max_length=5, choices=PRECISION_CHOICES, default='JOUR', verbose_name="Précision de la date de fin")

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
    specialite_texte = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name="Spécialité saisie en « Autre, préciser »",
        help_text="Texte libre de la spécialité absente de la liste (vide dès qu'une `specialite_ref` est choisie). "
                  "Distinct de `description` (note libre : mémoire, mention) qui ne déclenche aucune vérification.",
    )

    # Trace d'audit du refus admin (statut_validation='REFUSEE') — jamais de hard delete d'une
    # formation candidat sans garde-fou : motif + auteur + date conservés même si le candidat
    # corrige ensuite l'intitulé et repasse en DECLARE (voir save()).
    motif_refus = models.TextField(blank=True, default='', verbose_name="Motif du refus (si refusée par un admin)")
    refusee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='formations_refusees', verbose_name="Admin ayant refusé cette formation",
    )
    date_refus = models.DateTimeField(null=True, blank=True, verbose_name="Date du refus")

    # Demandes d'ajout au référentiel liées à cette formation (« Autre, préciser » : diplôme ou
    # spécialité absent de la liste). Posées à l'enregistrement, résolues par la décision de l'admin.
    demande_diplome = models.ForeignKey(
        'DemandeAjout', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='formations_diplome', verbose_name="Demande d'ajout du type de diplôme",
    )
    demande_specialite = models.ForeignKey(
        'DemandeAjout', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='formations_specialite', verbose_name="Demande d'ajout de la spécialité",
    )

    class Meta:
        ordering = ['-date_fin']

    def __str__(self):
        return f"{self.diplome} - {self.etablissement}"

    def save(self, *args, **kwargs):
        # Flux "Autre, préciser" (retour client 26/09/2026) : un intitulé libre sans
        # `diplome_ref` résolu passe en attente de vérification (admin ou nouvelle
        # tentative de résolution), jamais laissé en `DECLARE` silencieux ni traité comme
        # une incompatibilité par le matcher (voir `_score_diplome_specialite`, déjà neutre
        # sur ce cas). Sort automatiquement de l'attente dès qu'un `diplome_ref` (et une
        # spécialité si elle est pertinente pour ce diplôme — voir ci-dessous) est
        # attribué (choix référentiel direct, confirmation candidat, ou validation admin) —
        # ne touche jamais un `DOCUMENT_VERIFIE` déjà posé par un tiers.
        #
        # Extension (retour client 26/09/2026, suite) : la Spécialité déclenche la même
        # attente que le Type de diplôme, mais uniquement quand elle est réellement
        # pertinente pour CE diplôme précis (des couples `DiplomeSpecialite` existent) —
        # sinon un Bac (qui n'a le plus souvent aucune spécialité attestée) serait à tort
        # marqué "à vérifier" simplement parce que le champ est resté vide. `specialite_texte`
        # sert de signal d'intention : c'est le texte tapé en mode "Autre, préciser" de la
        # Spécialité (non résolu) — non vide + `specialite_ref` absent = une tentative est
        # restée sans correspondance. (Avant le 19/10/2026 ce rôle était tenu par
        # `description`, qui recevait aussi le « Mémoire : … » importé du CV : une simple note
        # déclenchait à tort une vérification et s'affichait comme « spécialité ».)
        diplome_incertain = not self.diplome_ref_id and bool(self.diplome)
        specialite_incertaine = False
        if self.diplome_ref_id and not self.specialite_ref_id and self.specialite_texte:
            specialite_incertaine = DiplomeSpecialite.objects.filter(
                diplome_id=self.diplome_ref_id, selectionnable=True,
            ).exists()
        incertain = diplome_incertain or specialite_incertaine
        # REFUSEE traité comme A_PRECISER côté bascule (mais jamais listé dans la file
        # d'attente admin, qui filtre strictement 'A_PRECISER') : un candidat qui corrige
        # l'intitulé après un refus et fournit un diplome_ref valide doit pouvoir revenir en
        # DECLARE sans intervention admin, plutôt que rester bloqué en REFUSEE pour toujours.
        if incertain and self.statut_validation == 'DECLARE':
            self.statut_validation = 'A_PRECISER'
        elif not incertain and self.statut_validation in ('A_PRECISER', 'REFUSEE'):
            self.statut_validation = 'DECLARE'
        super().save(*args, **kwargs)

# ==========================================
# 3. FONCTIONNALITÉS AVANCÉES DU CANDIDAT
# ==========================================

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
    ORIGINE_CHOICES = [
        ('SAISIE', 'Saisie par le candidat ou issue de son CV'),
        ('SUGGESTION', 'Choisie parmi les suggestions du métier'),
    ]
    origine = models.CharField(
        max_length=12, choices=ORIGINE_CHOICES, default='SAISIE', verbose_name="Origine",
        help_text="Information seulement (montrée au candidat et au recruteur) : jamais lue par le calcul du score.",
    )
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
