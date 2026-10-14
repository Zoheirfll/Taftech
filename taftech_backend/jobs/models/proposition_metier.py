from django.conf import settings
from django.db import models
from django.db.models import Q

from .referentiel import Metier


class PropositionMetier(models.Model):
    """Métier proposé par un utilisateur (recruteur ou candidat) parce qu'il ne le trouve pas dans
    le référentiel (correction client n°23). Même cycle de validation que les compétences :
    **Suggérée** → **Validée** | **Rejetée** (une rejetée peut être réexaminée → Validée).

    Rien n'entre jamais tout seul dans le référentiel : tant que l'admin n'a pas décidé, la
    proposition n'est visible nulle part côté public, ne rattache aucun profil ni aucune offre et
    n'a aucun effet sur le score. La validation a deux issues, au choix de l'admin : RATTACHÉE (le
    libellé devient une appellation d'un métier existant, cas le plus courant) ou CRÉÉE (nouveau
    métier officiel dans un groupe choisi par l'admin)."""
    STATUT_SUGGEREE = 'SUGGEREE'
    STATUT_VALIDEE = 'VALIDEE'
    STATUT_REJETEE = 'REJETEE'
    STATUT_CHOICES = [
        (STATUT_SUGGEREE, 'Suggéré (en attente de validation)'),
        (STATUT_VALIDEE, 'Validé'),
        (STATUT_REJETEE, 'Rejeté'),
    ]
    TRANSITIONS = {
        STATUT_SUGGEREE: {STATUT_VALIDEE, STATUT_REJETEE},
        STATUT_REJETEE: {STATUT_VALIDEE},   # réexamen
        STATUT_VALIDEE: set(),              # pour revenir en arrière : modifier le métier / l'appellation
    }

    ORIGINE_CHOICES = [('RECRUTEUR', 'Recruteur'), ('CANDIDAT', 'Candidat')]
    ISSUE_RATTACHEE = 'RATTACHEE'
    ISSUE_CREEE = 'CREEE'
    ISSUE_CHOICES = [
        (ISSUE_RATTACHEE, 'Rattaché à un métier existant'),
        (ISSUE_CREEE, 'Nouveau métier créé'),
    ]

    libelle = models.CharField(max_length=120)
    cle_recherche = models.CharField(max_length=250, db_index=True)
    contexte = models.CharField(
        max_length=300, blank=True, default='',
        help_text="Précision facultative du proposant (secteur, mission...) pour aider l'admin à décider.",
    )
    origine = models.CharField(max_length=10, choices=ORIGINE_CHOICES)
    proposee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='propositions_metier',
    )
    # Tous les utilisateurs ayant demandé ce métier (le premier est `proposee_par`) : une demande
    # répétée du même compte ne compte qu'une fois ; le nombre de demandeurs distincts aide l'admin.
    demandeurs = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='demandes_metier')

    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default=STATUT_SUGGEREE, db_index=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_statut = models.DateTimeField(null=True, blank=True)
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='propositions_metier_traitees',
    )
    motif_rejet = models.TextField(blank=True, default='')
    issue = models.CharField(max_length=10, choices=ISSUE_CHOICES, blank=True, default='')
    metier_resultat = models.ForeignKey(
        Metier, null=True, blank=True, on_delete=models.SET_NULL, related_name='propositions',
    )

    class Meta:
        ordering = ['-date_creation']
        constraints = [
            # Une seule proposition ouverte par libellé normalisé (sûr même en cas de requêtes simultanées).
            models.UniqueConstraint(
                fields=['cle_recherche'], condition=Q(statut='SUGGEREE'), name='proposition_metier_ouverte_unique',
            ),
        ]

    def __str__(self):
        return self.libelle
