from rest_framework import serializers
from ..models import Metier, SpecialiteFormation, TypeDiplome, RelationMetier, RelationSpecialite, FormationCandidat


class AdminFormationAVerifierSerializer(serializers.ModelSerializer):
    """Formations candidat déclarées via "Autre, préciser" sans correspondance référentiel
    confirmée (`statut_validation='A_PRECISER'`, retour client 26/09/2026) — l'admin attribue
    ici un `diplome_ref`/`specialite_ref` réel une fois l'intitulé vérifié manuellement.
    L'intitulé original (`diplome`) n'est jamais modifié depuis ce panel — seule la
    correspondance référentiel est ajustable, le texte déclaré par le candidat reste la
    source de vérité (F02)."""
    candidat_nom = serializers.SerializerMethodField()
    candidat_email = serializers.EmailField(source='profil.user.email', read_only=True)
    diplome_ref_libelle = serializers.CharField(source='diplome_ref.libelle', read_only=True, default=None)
    specialite_ref_libelle = serializers.CharField(source='specialite_ref.libelle', read_only=True, default=None)

    class Meta:
        model = FormationCandidat
        fields = (
            'id', 'candidat_nom', 'candidat_email', 'diplome', 'etablissement', 'description',
            'diplome_ref', 'diplome_ref_libelle', 'specialite_ref', 'specialite_ref_libelle',
            'statut_validation',
        )
        read_only_fields = ('diplome', 'etablissement', 'description', 'statut_validation')

    def get_candidat_nom(self, obj):
        user = getattr(obj.profil, 'user', None)
        if not user:
            return None
        nom = f"{user.first_name} {user.last_name}".strip()
        return nom or user.email

    def validate(self, data):
        diplome_ref = data.get('diplome_ref')
        specialite_ref = data.get('specialite_ref')
        if specialite_ref and diplome_ref:
            from ..models import DiplomeSpecialite
            if not DiplomeSpecialite.objects.filter(diplome=diplome_ref, specialite=specialite_ref).exists():
                raise serializers.ValidationError(
                    "Ce couple diplôme/spécialité n'existe pas dans le référentiel — jamais une "
                    "équivalence inventée (F06)."
                )
        return data


class IssueDeDemandeMixin(serializers.Serializer):
    """`issue_de_demande` : l'entrée a été créée en acceptant une demande d'ajout. L'ensemble des identifiants
    arrive par le contexte (`ids_demandes`, une requête par page) ; absent, le champ vaut False."""
    issue_de_demande = serializers.SerializerMethodField()

    def get_issue_de_demande(self, obj):
        return obj.pk in self.context.get('ids_demandes', ())


class AdminMetierSerializer(IssueDeDemandeMixin, serializers.ModelSerializer):
    groupe_libelle = serializers.CharField(source='groupe_principal.libelle', read_only=True, default=None)
    metier_canonique_libelle = serializers.CharField(source='metier_canonique.libelle', read_only=True, default=None)

    class Meta:
        model = Metier
        fields = ('id', 'code', 'libelle', 'granularite', 'groupe_libelle', 'metier_canonique_libelle', 'selectionnable', 'statut', 'issue_de_demande')
        read_only_fields = ('code', 'granularite')


def _domaine_avec_famille(domaine):
    """« Droit et sciences politiques — Enseignement supérieur » : l'admin voit toujours la famille
    (supérieur / formation professionnelle / thèmes TafTech) d'un domaine, jamais mélangées
    sans indication (point 8, 12/10/2026)."""
    if domaine is None:
        return None
    from ..referentiel_utils import FAMILLES_FORMATION, famille_formation
    return f"{domaine.libelle} — {FAMILLES_FORMATION[famille_formation(domaine.systeme)]}"


class AdminSpecialiteFormationSerializer(IssueDeDemandeMixin, serializers.ModelSerializer):
    domaine_libelle = serializers.CharField(source='domaine.libelle', read_only=True)
    domaine_complet = serializers.SerializerMethodField()
    filiere_libelle = serializers.CharField(source='filiere.libelle', read_only=True, default=None)

    class Meta:
        model = SpecialiteFormation
        fields = ('id', 'code', 'libelle', 'domaine_libelle', 'domaine_complet', 'filiere_libelle', 'nature', 'selectionnable', 'issue_de_demande')
        read_only_fields = ('code', 'nature')

    def get_domaine_complet(self, obj):
        return _domaine_avec_famille(obj.domaine)


class AdminTypeDiplomeSerializer(IssueDeDemandeMixin, serializers.ModelSerializer):
    class Meta:
        model = TypeDiplome
        fields = ('id', 'code', 'libelle', 'systeme', 'niveau_fp', 'selectionnable', 'diplome_formel', 'issue_de_demande')
        read_only_fields = ('code', 'systeme', 'niveau_fp')


class AdminRelationSimilaireSerializer(serializers.ModelSerializer):
    """Relations 'similaire' créées manuellement par l'admin (matcher.py::_relation_similaire,
    session 24/09/2026) — rapproche deux métiers que le référentiel v2 du client classe dans
    des branches secteur/domaine séparées mais qu'on juge substituables en pratique. Distinct
    des 49 relations importées (redirection_equivalente/plus_precis_que), jamais éditables ici."""
    metier_depart_libelle = serializers.CharField(source='metier_depart.libelle', read_only=True)
    metier_arrivee_libelle = serializers.CharField(source='metier_arrivee.libelle', read_only=True)

    class Meta:
        model = RelationMetier
        fields = ('id', 'metier_depart', 'metier_depart_libelle', 'metier_arrivee', 'metier_arrivee_libelle',
                   'justification', 'active_recherche')

    def validate(self, data):
        depart = data.get('metier_depart') or getattr(self.instance, 'metier_depart', None)
        arrivee = data.get('metier_arrivee') or getattr(self.instance, 'metier_arrivee', None)
        if depart and arrivee and depart.pk == arrivee.pk:
            raise serializers.ValidationError("Les deux métiers doivent être différents.")
        return data


class AdminRelationSpecialiteSerializer(serializers.ModelSerializer):
    """Relations 'similaire' entre spécialités de formation (matcher.py::
    _specialite_relation_similaire, session 25/09/2026) — même pattern que
    AdminRelationSimilaireSerializer (métiers), pour le référentiel Diplômes."""
    specialite_depart_libelle = serializers.CharField(source='specialite_depart.libelle', read_only=True)
    specialite_arrivee_libelle = serializers.CharField(source='specialite_arrivee.libelle', read_only=True)
    specialite_depart_domaine = serializers.SerializerMethodField()
    specialite_arrivee_domaine = serializers.SerializerMethodField()

    def get_specialite_depart_domaine(self, obj):
        return _domaine_avec_famille(obj.specialite_depart.domaine)

    def get_specialite_arrivee_domaine(self, obj):
        return _domaine_avec_famille(obj.specialite_arrivee.domaine)

    class Meta:
        model = RelationSpecialite
        fields = ('id', 'specialite_depart', 'specialite_depart_libelle', 'specialite_depart_domaine',
                   'specialite_arrivee', 'specialite_arrivee_libelle', 'specialite_arrivee_domaine',
                   'justification', 'active_recherche')

    def validate(self, data):
        depart = data.get('specialite_depart') or getattr(self.instance, 'specialite_depart', None)
        arrivee = data.get('specialite_arrivee') or getattr(self.instance, 'specialite_arrivee', None)
        if depart and arrivee and depart.pk == arrivee.pk:
            raise serializers.ValidationError("Les deux spécialités doivent être différentes.")
        return data
