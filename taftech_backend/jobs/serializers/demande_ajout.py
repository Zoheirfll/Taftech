from rest_framework import serializers

from ..demandes_ajout import DemandeRefusee, adaptateur_pour
from ..models import DemandeAjout

MAX_DEMANDEURS_AFFICHES = 50  # la fenêtre de détail de l'admin liste tous les demandeurs (nombre réel : `nb_demandeurs`)


class DemandeAjoutAdminSerializer(serializers.ModelSerializer):
    """Vue admin d'une demande d'ajout. L'e-mail des demandeurs n'est jamais exposé côté public : ce
    sérialiseur n'est utilisé que par les vues réservées au rôle ADMIN. À utiliser avec
    `prefetch_related('demandeurs')` et les annotations `nb_formations_diplome` / `nb_formations_specialite`
    (une requête pour toute la page au lieu de plusieurs par ligne)."""
    type_libelle = serializers.CharField(source='get_type_display', read_only=True)
    nb_demandeurs = serializers.SerializerMethodField()
    demandeurs_apercu = serializers.SerializerMethodField()
    nb_formations = serializers.SerializerMethodField()
    traite_par_email = serializers.SerializerMethodField()
    transitions_possibles = serializers.SerializerMethodField()
    proches = serializers.SerializerMethodField()

    class Meta:
        model = DemandeAjout
        fields = (
            'id', 'type', 'type_libelle', 'libelle', 'contexte', 'explicite', 'origine', 'statut',
            'nb_demandeurs', 'demandeurs_apercu', 'nb_formations', 'entree_id', 'entree_libelle', 'motif_refus',
            'date_creation', 'date_decision', 'traite_par_email', 'transitions_possibles', 'proches',
        )

    def get_nb_demandeurs(self, obj):
        return len(obj.demandeurs.all())

    def get_demandeurs_apercu(self, obj):
        # Date d'arrivée de chaque demandeur (table `ArriveeDemandeur`) ; absente pour une ligne plus ancienne.
        dates = {a.utilisateur_id: a.date_demande for a in obj.arrivees.all()}
        apercu = []
        for utilisateur in list(obj.demandeurs.all())[:MAX_DEMANDEURS_AFFICHES]:
            nom = f"{utilisateur.first_name} {utilisateur.last_name}".strip() or utilisateur.email
            apercu.append({
                'nom': nom, 'email': utilisateur.email, 'role': utilisateur.role,
                'date': dates.get(utilisateur.pk),
            })
        return apercu

    def get_nb_formations(self, obj):
        if hasattr(obj, 'nb_formations_diplome'):
            return obj.nb_formations_diplome + obj.nb_formations_specialite
        return obj.formations_diplome.count() + obj.formations_specialite.count()

    def get_traite_par_email(self, obj):
        return obj.traite_par.email if obj.traite_par else None

    def get_transitions_possibles(self, obj):
        return sorted(DemandeAjout.TRANSITIONS.get(obj.statut, set()))

    def get_proches(self, obj):
        # Seulement quand une décision est encore possible (coût de quelques requêtes par ligne).
        if not DemandeAjout.TRANSITIONS.get(obj.statut):
            return []
        try:
            return adaptateur_pour(obj.type).proches(obj.libelle)
        except DemandeRefusee:
            return []
