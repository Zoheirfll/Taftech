from rest_framework import serializers
from django.contrib.auth import get_user_model
from ..models import ProfilCandidat, ExperienceCandidat, FormationCandidat, CompetenceCandidat

User = get_user_model()


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperienceCandidat
        fields = ['id', 'titre_poste', 'entreprise', 'secteur', 'date_debut', 'date_fin', 'description']


class FormationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormationCandidat
        fields = ['id', 'diplome', 'etablissement', 'date_debut', 'date_fin', 'description']


class CompetenceCandidatSerializer(serializers.ModelSerializer):
    niveau_libelle = serializers.CharField(source='get_niveau_display', read_only=True)

    class Meta:
        model = CompetenceCandidat
        fields = ['id', 'label', 'niveau', 'niveau_libelle', 'source']


class ProfilCandidatDTO(serializers.ModelSerializer):
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    telephone = serializers.SerializerMethodField()
    nin = serializers.SerializerMethodField()
    date_joined = serializers.SerializerMethodField()
    last_login = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    est_debloque = serializers.SerializerMethodField()
    is_favori = serializers.SerializerMethodField()
    experiences_detail = ExperienceSerializer(many=True, read_only=True)
    formations_detail = FormationSerializer(many=True, read_only=True)
    competences_detail = CompetenceCandidatSerializer(many=True, read_only=True)

    class Meta:
        model = ProfilCandidat
        fields = (
            'titre_professionnel', 'cv_pdf', 'cv_pdf_maj_le', 'photo_profil', 'diplome', 'specialite',
            'experiences', 'competences', 'competences_detail', 'langues',
            'first_name', 'last_name', 'email', 'telephone', 'nin',
            'experiences_detail', 'formations_detail',
            'service_militaire', 'permis_conduire', 'vehicule_personnel', 'passeport_valide',
            'secteur_souhaite', 'salaire_souhaite', 'mobilite', 'situation_actuelle',
            'wilaya', 'commune', 'adresse', 'date_joined', 'is_favori', 'last_login', 'user_id',
            'est_debloque', 'bio', 'linkedin', 'github'
        )

    def _peut_voir_coordonnees(self, obj):
        """True si ce candidat précis est débloqué pour l'entreprise du contexte
        ('unlocked_ids', calculé une fois par la vue) — ou repli sur l'ancien flag
        'is_premium' pour les appelants hors CVthèque (ex: le candidat consultant son
        propre profil, toujours is_premium=True)."""
        unlocked_ids = self.context.get('unlocked_ids')
        if unlocked_ids is not None:
            return obj.user_id in unlocked_ids
        return self.context.get('is_premium', False)

    def get_est_debloque(self, obj):
        return self._peut_voir_coordonnees(obj)

    def get_first_name(self, obj): return obj.user.first_name
    def get_last_name(self, obj): return obj.user.last_name
    def get_email(self, obj): return obj.user.email if self._peut_voir_coordonnees(obj) else None
    def get_telephone(self, obj): return obj.user.telephone if self._peut_voir_coordonnees(obj) else None
    def get_nin(self, obj): return obj.user.nin if self.context.get('include_nin') else None
    def get_date_joined(self, obj): return obj.user.date_joined
    def get_last_login(self, obj): return obj.user.last_login
    def get_user_id(self, obj): return obj.user.id

    def get_is_favori(self, obj):
        recruteur = self.context.get('recruteur')
        if not recruteur:
            return False
        from ..models import ProfilCandidatFavori
        return ProfilCandidatFavori.objects.filter(
            recruteur=recruteur, candidat=obj.user
        ).exists()

    def get_linkedin(self, obj):
        p = obj
        val = getattr(p, 'linkedin', None)
        return val if self._peut_voir_coordonnees(obj) else None

    def get_github(self, obj):
        p = obj
        val = getattr(p, 'github', None)
        return val if self._peut_voir_coordonnees(obj) else None


class ProfilCandidatAdminSerializer(serializers.ModelSerializer):
    experiences_detail = ExperienceSerializer(many=True, read_only=True)
    formations_detail = FormationSerializer(many=True, read_only=True)

    class Meta:
        model = ProfilCandidat
        fields = '__all__'


class AdminUserSerializer(serializers.ModelSerializer):
    profil_candidat = ProfilCandidatAdminSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'role',
            'is_active', 'date_joined', 'telephone', 'nin', 'date_naissance',
            'consentement_loi_18_07', 'profil_candidat'
        )


class ParametresNotificationsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilCandidat
        fields = ['notif_offres_exclusives', 'notif_newsletter', 'notif_mise_a_jour']