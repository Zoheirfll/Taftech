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
    # La vraie date de naissance vit sur CustomUser (saisie à l'inscription) —
    # ProfilCandidat.date_naissance est une colonne jamais consommée ailleurs
    # dans le code, ce champ mappe explicitement sur celle du User pour ne
    # pas exposer/écraser la colonne morte du modèle ProfilCandidat.
    date_naissance = serializers.SerializerMethodField()
    adresse = serializers.SerializerMethodField()
    salaire_souhaite = serializers.SerializerMethodField()
    date_joined = serializers.SerializerMethodField()
    last_login = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    est_debloque = serializers.SerializerMethodField()
    is_favori = serializers.SerializerMethodField()
    experiences_detail = serializers.SerializerMethodField()
    formations_detail = FormationSerializer(many=True, read_only=True)
    competences_detail = CompetenceCandidatSerializer(many=True, read_only=True)

    class Meta:
        model = ProfilCandidat
        fields = (
            'titre_professionnel', 'cv_pdf', 'cv_pdf_maj_le', 'photo_profil', 'diplome', 'specialite', 'sexe',
            'experiences', 'competences', 'competences_detail', 'langues',
            'first_name', 'last_name', 'email', 'telephone', 'nin', 'date_naissance',
            'experiences_detail', 'formations_detail',
            'service_militaire', 'permis_conduire', 'vehicule_personnel', 'passeport_valide',
            'secteur_souhaite', 'salaire_souhaite', 'mobilite', 'situation_actuelle',
            'wilaya', 'commune', 'adresse', 'date_joined', 'is_favori', 'last_login', 'user_id',
            'est_debloque', 'bio', 'linkedin', 'github', 'visible_cvtheque'
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

    def get_last_name(self, obj):
        """Tronqué à l'initiale tant que le profil n'est pas débloqué en CVthèque (ex: "T.")
        — le prénom seul reste identifiable pour parcourir la liste, le nom complet fait
        partie de la valeur débloquée par crédit, au même titre que email/téléphone."""
        nom = obj.user.last_name
        if self._peut_voir_coordonnees(obj) or not nom:
            return nom
        return f"{nom[0]}."
    def get_date_naissance(self, obj):
        """Masquée tant que le profil n'est pas débloqué en CVthèque — au même titre
        qu'email/téléphone, oubliée du masquage initial (audit du 03/09/2026)."""
        return obj.user.date_naissance if self._peut_voir_coordonnees(obj) else None

    def get_adresse(self, obj):
        """Adresse complète (rue) masquée avant déblocage — wilaya/commune restent visibles
        pour l'aperçu géographique, l'adresse précise est une coordonnée de contact au même
        titre que le téléphone (oubliée du masquage initial, audit du 03/09/2026)."""
        return obj.adresse if self._peut_voir_coordonnees(obj) else None

    def get_salaire_souhaite(self, obj):
        """Masqué avant déblocage — un recruteur ne doit pas connaître la prétention salariale
        du candidat sans avoir débloqué le profil (levier de négociation, demande utilisateur)."""
        return obj.salaire_souhaite if self._peut_voir_coordonnees(obj) else None

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

    def get_experiences_detail(self, obj):
        """Le nom de l'employeur (info la plus identifiante d'une expérience — permet souvent
        de retrouver/contacter le candidat sans jamais débloquer le profil) est masqué tant
        que le profil n'est pas débloqué en CVthèque — le reste (titre, dates, description)
        reste visible pour donner un vrai aperçu et inciter au déblocage."""
        data = ExperienceSerializer(obj.experiences_detail.all(), many=True, context=self.context).data
        if not self._peut_voir_coordonnees(obj):
            for exp in data:
                exp['entreprise'] = "Entreprise non communiquée"
        return data

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