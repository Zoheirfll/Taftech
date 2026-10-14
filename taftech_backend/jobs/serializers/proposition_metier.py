from rest_framework import serializers

from ..models import Appellation, PropositionMetier


def _metiers_proches(proposition, limite=5):
    """Métiers existants dont une appellation contient le mot le plus long de la proposition :
    aide l'admin à rattacher plutôt qu'à créer un doublon. Jamais utilisé pour décider à sa place."""
    mots = sorted((m for m in proposition.cle_recherche.split() if len(m) >= 4), key=len, reverse=True)
    if not mots:
        return []
    vus, resultat = set(), []
    appellations = (
        Appellation.objects.filter(cle_recherche__icontains=mots[0], actif=True, metier__selectionnable=True)
        .select_related('metier', 'metier__metier_canonique').order_by('cle_recherche')[:40]
    )
    for a in appellations:
        canonique = a.metier.metier_canonique or a.metier
        if canonique.id in vus:
            continue
        vus.add(canonique.id)
        resultat.append({'id': canonique.id, 'libelle': canonique.libelle})
        if len(resultat) >= limite:
            break
    return resultat


class PropositionMetierAdminSerializer(serializers.ModelSerializer):
    """Vue admin d'une proposition. L'email du proposant n'est jamais exposé côté public : ce
    serializer n'est utilisé que par les vues réservées au rôle ADMIN."""
    nb_demandeurs = serializers.SerializerMethodField()
    proposee_par_email = serializers.SerializerMethodField()
    traite_par_email = serializers.SerializerMethodField()
    metier_resultat_libelle = serializers.CharField(source='metier_resultat.libelle', read_only=True, default=None)
    transitions_possibles = serializers.SerializerMethodField()
    metiers_proches = serializers.SerializerMethodField()

    class Meta:
        model = PropositionMetier
        fields = (
            'id', 'libelle', 'contexte', 'origine', 'statut', 'nb_demandeurs', 'proposee_par_email',
            'date_creation', 'date_statut', 'traite_par_email', 'motif_rejet', 'issue',
            'metier_resultat', 'metier_resultat_libelle', 'transitions_possibles', 'metiers_proches',
        )

    def get_nb_demandeurs(self, obj):
        return obj.demandeurs.count()

    def get_proposee_par_email(self, obj):
        return obj.proposee_par.email if obj.proposee_par else None

    def get_traite_par_email(self, obj):
        return obj.traite_par.email if obj.traite_par else None

    def get_transitions_possibles(self, obj):
        return sorted(PropositionMetier.TRANSITIONS.get(obj.statut, set()))

    def get_metiers_proches(self, obj):
        # Calculé seulement pour les propositions à examiner (coût d'une requête par ligne).
        return _metiers_proches(obj) if obj.statut == PropositionMetier.STATUT_SUGGEREE else []
