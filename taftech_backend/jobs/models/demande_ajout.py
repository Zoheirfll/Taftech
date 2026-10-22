from django.conf import settings
from django.db import models
from django.db.models import Q


class DemandeAjout(models.Model):
    """Demande d'ajout au référentiel : une personne ne trouve pas un métier, une compétence, un type
    de diplôme ou une spécialité, l'admin décide de l'**accepter** (nouvelle entrée officielle), de la
    **rattacher** à une entrée existante (le libellé devient appellation, synonyme ou alias) ou de la
    **refuser** (motif obligatoire). Même cycle pour les quatre types (spécification du 16/10/2026).

    Rien n'entre jamais tout seul dans le référentiel : tant que l'admin n'a pas décidé, la demande
    n'est visible nulle part côté public et ne change aucun score. Seul le demandeur la voit sur SON profil : une
    formation (diplôme, spécialité) ou un métier (expérience, profil) garde le lien vers sa demande, sans jamais compter
    dans le calcul (métiers : `demandes_ajout/metiers.py`).
    Étape 1 : seuls les types DIPLOME et SPECIALITE sont gérés (métiers : étape 2, compétences : étape 3)."""
    TYPE_METIER = 'METIER'
    TYPE_COMPETENCE = 'COMPETENCE'
    TYPE_DIPLOME = 'DIPLOME'
    TYPE_SPECIALITE = 'SPECIALITE'
    TYPE_CHOICES = [
        (TYPE_METIER, 'Métier'),
        (TYPE_COMPETENCE, 'Compétence'),
        (TYPE_DIPLOME, 'Type de diplôme'),
        (TYPE_SPECIALITE, 'Spécialité'),
    ]

    STATUT_A_EXAMINER = 'A_EXAMINER'
    STATUT_ACCEPTEE = 'ACCEPTEE'
    STATUT_RATTACHEE = 'RATTACHEE'
    STATUT_REFUSEE = 'REFUSEE'
    STATUT_CHOICES = [
        (STATUT_A_EXAMINER, 'À examiner'),
        (STATUT_ACCEPTEE, 'Acceptée'),
        (STATUT_RATTACHEE, 'Rattachée'),
        (STATUT_REFUSEE, 'Refusée'),
    ]
    # Une demande acceptée ou rattachée est terminale : pour revenir en arrière, on modifie ou on
    # masque l'entrée officielle. Une demande refusée peut être réexaminée.
    TRANSITIONS = {
        STATUT_A_EXAMINER: {STATUT_ACCEPTEE, STATUT_RATTACHEE, STATUT_REFUSEE},
        STATUT_REFUSEE: {STATUT_ACCEPTEE, STATUT_RATTACHEE},
        STATUT_ACCEPTEE: set(),
        STATUT_RATTACHEE: set(),
    }

    ORIGINE_CANDIDAT = 'CANDIDAT'
    ORIGINE_RECRUTEUR = 'RECRUTEUR'
    ORIGINE_CHOICES = [(ORIGINE_CANDIDAT, 'Candidat'), (ORIGINE_RECRUTEUR, 'Recruteur')]

    type = models.CharField(max_length=10, choices=TYPE_CHOICES, db_index=True)
    libelle = models.CharField(max_length=120)
    cle_recherche = models.CharField(
        max_length=250, db_index=True,
        help_text="Forme normalisée du libellé (accents, casse, abréviations) : sert à détecter les doublons.",
    )
    contexte = models.CharField(
        max_length=300, blank=True, default='',
        help_text="Précision facultative qui aide l'admin à décider (diplôme concerné, titre de l'offre...).",
    )
    explicite = models.BooleanField(
        default=True,
        help_text="Vrai pour un clic « Je ne trouve pas... » ou « Autre, préciser » ; faux pour une "
                  "compétence créée par simple saisie (le proposant n'est alors pas notifié).",
    )
    origine = models.CharField(max_length=10, choices=ORIGINE_CHOICES)
    premier_demandeur = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='demandes_ajout_initiees',
    )
    # Tous les demandeurs (le premier est `premier_demandeur`) : une demande répétée du même compte
    # ne compte qu'une fois, le nombre de demandeurs distincts aide l'admin à juger.
    demandeurs = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='demandes_ajout')

    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default=STATUT_A_EXAMINER, db_index=True)
    entree_id = models.PositiveIntegerField(
        null=True, blank=True, help_text="Identifiant de l'entrée officielle créée ou choisie, selon le type.",
    )
    entree_libelle = models.CharField(max_length=300, blank=True, default='')
    motif_refus = models.TextField(blank=True, default='')
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='demandes_ajout_traitees',
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_decision = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_creation']
        constraints = [
            # Une seule demande ouverte par libellé normalisé et par type (sûr même en cas de requêtes simultanées).
            models.UniqueConstraint(
                fields=['type', 'cle_recherche'], condition=Q(statut='A_EXAMINER'), name='demande_ajout_ouverte_unique',
            ),
        ]

    def __str__(self):
        return f"{self.get_type_display()} : {self.libelle}"
