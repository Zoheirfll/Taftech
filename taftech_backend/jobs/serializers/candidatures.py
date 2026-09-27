from rest_framework import serializers
from django.contrib.auth import get_user_model
from ..models import Candidature, ReponseExigence
from .profils import ExperienceSerializer, FormationSerializer, CompetenceCandidatSerializer
from .questionnaires import ReponseCandidatSerializer


class ReponseExigenceSerializer(serializers.ModelSerializer):
    """S12 — réponse du candidat à une exigence impérative de l'offre, avec le libellé de
    l'exigence pour l'affichage recruteur sans requête supplémentaire côté frontend."""
    exigence_label = serializers.CharField(source='exigence.label', read_only=True)
    exigence_id = serializers.IntegerField(source='exigence.id', read_only=True)
    justificatif_url = serializers.SerializerMethodField()

    class Meta:
        model = ReponseExigence
        fields = ('id', 'exigence_id', 'exigence_label', 'statut', 'justificatif_url', 'commentaire', 'date_reponse')

    def get_justificatif_url(self, obj):
        if not obj.justificatif:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.justificatif.url) if request else obj.justificatif.url

User = get_user_model()


class CandidatInfoDTO(serializers.ModelSerializer):
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    telephone = serializers.CharField(read_only=True)
    titre_professionnel = serializers.SerializerMethodField()
    cv_pdf = serializers.SerializerMethodField()
    photo_profil = serializers.SerializerMethodField()
    experiences = serializers.SerializerMethodField()
    formations = serializers.SerializerMethodField()
    competences = serializers.SerializerMethodField()
    competences_detail = serializers.SerializerMethodField()
    langues = serializers.SerializerMethodField()
    service_militaire = serializers.SerializerMethodField()
    permis_conduire = serializers.SerializerMethodField()
    vehicule_personnel = serializers.SerializerMethodField()
    passeport_valide = serializers.SerializerMethodField()
    metier_souhaite = serializers.SerializerMethodField()
    salaire_souhaite = serializers.SerializerMethodField()
    mobilite = serializers.SerializerMethodField()
    situation_actuelle = serializers.SerializerMethodField()
    wilaya = serializers.SerializerMethodField()
    commune = serializers.SerializerMethodField()
    adresse = serializers.SerializerMethodField()
    date_naissance = serializers.DateField(read_only=True)
    sexe = serializers.SerializerMethodField()
    diplome = serializers.SerializerMethodField()
    diplome_ref_libelle = serializers.SerializerMethodField()
    metier = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    linkedin = serializers.SerializerMethodField()
    github = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'telephone',
            'titre_professionnel', 'cv_pdf', 'photo_profil',
            'experiences', 'formations', 'competences', 'competences_detail', 'langues',
            'service_militaire', 'permis_conduire', 'vehicule_personnel', 'passeport_valide',
            'metier_souhaite', 'salaire_souhaite', 'mobilite', 'situation_actuelle',
            'wilaya', 'commune', 'adresse', 'date_naissance', 'sexe', 'diplome', 'diplome_ref_libelle', 'metier',
            'bio', 'linkedin', 'github',
        )

    def _profil(self, obj):
        return obj.profil_candidat if hasattr(obj, 'profil_candidat') else None

    def get_titre_professionnel(self, obj):
        p = self._profil(obj); return p.titre_professionnel if p else None

    def get_cv_pdf(self, obj):
        p = self._profil(obj)
        if not (p and p.cv_pdf):
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(p.cv_pdf.url) if request else p.cv_pdf.url

    def get_photo_profil(self, obj):
        p = self._profil(obj)
        if not (p and p.photo_profil):
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(p.photo_profil.url) if request else p.photo_profil.url

    def get_experiences(self, obj):
        p = self._profil(obj)
        return ExperienceSerializer(p.experiences_detail.all(), many=True).data if p else []

    def get_formations(self, obj):
        p = self._profil(obj)
        return FormationSerializer(p.formations_detail.all(), many=True).data if p else []

    def get_competences(self, obj):
        p = self._profil(obj); return p.competences if p else ""

    def get_competences_detail(self, obj):
        p = self._profil(obj)
        return CompetenceCandidatSerializer(p.competences_detail.all(), many=True).data if p else []

    def get_langues(self, obj):
        p = self._profil(obj); return p.langues if p else ""

    def get_service_militaire(self, obj):
        p = self._profil(obj); return p.service_militaire if p else None

    def get_permis_conduire(self, obj):
        p = self._profil(obj); return p.permis_conduire if p else False

    def get_vehicule_personnel(self, obj):
        p = self._profil(obj); return p.vehicule_personnel if p else False

    def get_passeport_valide(self, obj):
        p = self._profil(obj); return p.passeport_valide if p else False

    def get_metier_souhaite(self, obj):
        p = self._profil(obj); return p.metier_souhaite.libelle if p and p.metier_souhaite else None

    def get_salaire_souhaite(self, obj):
        p = self._profil(obj); return p.salaire_souhaite if p else None

    def get_mobilite(self, obj):
        p = self._profil(obj); return p.mobilite if p else None

    def get_situation_actuelle(self, obj):
        p = self._profil(obj); return p.situation_actuelle if p else None

    def get_wilaya(self, obj):
        p = self._profil(obj); return p.wilaya if p else None

    def get_commune(self, obj):
        p = self._profil(obj); return p.commune if p else None

    def get_adresse(self, obj):
        p = self._profil(obj); return p.adresse if p else None

    def get_sexe(self, obj):
        p = self._profil(obj); return p.sexe if p else None

    def get_diplome(self, obj):
        p = self._profil(obj); return p.diplome if p else None

    def get_diplome_ref_libelle(self, obj):
        p = self._profil(obj)
        if not p:
            return None
        if p.diplome_ref:
            return p.diplome_ref.libelle
        if p.niveau_scolaire_ref:
            return p.niveau_scolaire_ref.libelle
        return None

    def get_metier(self, obj):
        p = self._profil(obj); return p.metier.libelle if p and p.metier else None

    def get_bio(self, obj):
        p = self._profil(obj); return p.bio if p else None

    def get_linkedin(self, obj):
        p = self._profil(obj); return p.linkedin if p else None

    def get_github(self, obj):
        p = self._profil(obj); return p.github if p else None


class PostulerDTO(serializers.ModelSerializer):
    class Meta:
        model = Candidature
        fields = ('lettre_motivation', 'lettre_motivation_file')


class PostulerRapideDTO(serializers.ModelSerializer):
    class Meta:
        model = Candidature
        fields = ('nom_rapide', 'prenom_rapide', 'email_rapide', 'telephone_rapide', 'cv_rapide', 'lettre_motivation')


class CandidatureRecruteurDTO(serializers.ModelSerializer):
    candidat = CandidatInfoDTO(read_only=True)
    reponses = ReponseCandidatSerializer(many=True, read_only=True)
    reponses_exigences = ReponseExigenceSerializer(many=True, read_only=True)
    lettre_motivation_file = serializers.SerializerMethodField()
    cv_rapide_url = serializers.SerializerMethodField()

    class Meta:
        model = Candidature
        fields = (
            'id', 'candidat', 'date_postulation', 'lettre_motivation',
            'lettre_motivation_file', 'statut', 'score_matching', 'details_matching',
            'est_rapide', 'nom_rapide', 'prenom_rapide', 'email_rapide',
            'telephone_rapide', 'cv_rapide_url', 'date_entretien', 'message_entretien',
            'note_technique', 'note_communication', 'note_motivation', 'note_experience',
            'note_globale', 'commentaire_evaluation', 'reponses', 'reponses_exigences',
            'profil_snapshot', 'source'
        )

    def get_lettre_motivation_file(self, obj):
        if not obj.lettre_motivation_file:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.lettre_motivation_file.url) if request else obj.lettre_motivation_file.url

    def get_cv_rapide_url(self, obj):
        if not obj.cv_rapide:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.cv_rapide.url) if request else obj.cv_rapide.url


class MesCandidaturesDTO(serializers.ModelSerializer):
    offre_titre = serializers.CharField(source='offre.titre', read_only=True)
    entreprise_nom = serializers.CharField(source='offre.entreprise.nom_entreprise', read_only=True)
    entreprise_logo_url = serializers.SerializerMethodField()
    offre_est_cloturee = serializers.BooleanField(source='offre.est_cloturee', read_only=True)

    class Meta:
        model = Candidature
        fields = (
            'id', 'offre_titre', 'entreprise_nom', 'entreprise_logo_url', 'date_postulation',
            'date_maj', 'statut', 'offre_est_cloturee', 'date_entretien', 'message_entretien',
            'score_matching', 'details_matching'
        )

    def get_entreprise_logo_url(self, obj):
        logo = obj.offre.entreprise.logo
        if not logo:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(logo.url) if request else logo.url