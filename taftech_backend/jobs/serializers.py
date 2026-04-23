from rest_framework import serializers
from .models import OffreEmploi, ProfilEntreprise
from .models import Candidature
from django.contrib.auth import get_user_model
from .models import ProfilCandidat
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import ExperienceCandidat, FormationCandidat

User = get_user_model()
# 1 Entreprise Serializer
class EntrepriseSimpleSerializer(serializers.ModelSerializer):
    """Un petit DTO pour afficher juste le nom et la wilaya de l'entreprise dans l'offre."""
    class Meta:
        model = ProfilEntreprise
        fields = ('nom_entreprise', 'wilaya_siege')
# 2 Offre Emploi Serializer
class OffreEmploiSerializer(serializers.ModelSerializer):
    entreprise = EntrepriseSimpleSerializer(read_only=True)
    class Meta:
        model = OffreEmploi
        fields = '__all__'
        
#3 Profil Entreprise Create Serializer        
class ProfilEntrepriseCreateDTO(serializers.ModelSerializer):
    """
    DTO pour la création du profil entreprise.
    Le champ 'user' est exclu car on le récupère via la session (le token).
    """
    class Meta:
        model = ProfilEntreprise
        fields = ('nom_entreprise', 'secteur_activite', 'registre_commerce', 'wilaya_siege', 'description')

    def validate_registre_commerce(self, value):
        # On pourrait ajouter ici une validation spécifique au format RC algérien
        if len(value) < 5:
            raise serializers.ValidationError("Le numéro de Registre de Commerce semble invalide.")
        return value        

class PostulerDTO(serializers.ModelSerializer):
    class Meta:
        model = Candidature
        fields = ('lettre_motivation','lettre_motivation_file') # L'offre et le candidat seront gérés par le serveur, pas par l'utilisateur

class OffreEmploiCreateDTO(serializers.ModelSerializer):
    """
    DTO pour la publication d'une nouvelle offre d'emploi.
    L'entreprise n'est pas dans les champs car le serveur s'en occupe.
    """
    class Meta:
        model = OffreEmploi
        fields = (
            'titre', 'wilaya', 'commune', 'diplome', 'specialite', 'missions', 'profil_recherche', 
            'type_contrat', 'experience_requise', 'salaire_propose'
        )

# 1. Vigile pour les infos basiques du candidat
# =======================================================
# 2. LE DOSSIER COMPLET ENVOYÉ AU RECRUTEUR
# =======================================================
class CandidatInfoDTO(serializers.ModelSerializer):
    """Ce que le recruteur voit quand il ouvre une candidature."""
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    telephone = serializers.CharField(read_only=True)
    
    # Champs de base et médias
    titre_professionnel = serializers.SerializerMethodField()
    cv_pdf = serializers.SerializerMethodField()
    photo_profil = serializers.SerializerMethodField()
    
    # Listes dynamiques
    experiences = serializers.SerializerMethodField()
    formations = serializers.SerializerMethodField()
    competences = serializers.SerializerMethodField()
    langues = serializers.SerializerMethodField()

    # Nouveaux champs : Administratif et Préférences
    service_militaire = serializers.SerializerMethodField()
    permis_conduire = serializers.SerializerMethodField()
    vehicule_personnel = serializers.SerializerMethodField()
    passeport_valide = serializers.SerializerMethodField()
    secteur_souhaite = serializers.SerializerMethodField()
    salaire_souhaite = serializers.SerializerMethodField()
    mobilite = serializers.SerializerMethodField()
    situation_actuelle = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'telephone', 
            'titre_professionnel', 'cv_pdf', 'photo_profil', 
            'experiences', 'formations', 'competences', 'langues',
            'service_militaire', 'permis_conduire', 'vehicule_personnel', 'passeport_valide',
            'secteur_souhaite', 'salaire_souhaite', 'mobilite', 'situation_actuelle'
        )

    def get_titre_professionnel(self, obj):
        return obj.profil_candidat.titre_professionnel if hasattr(obj, 'profil_candidat') else None

    def get_cv_pdf(self, obj):
        if hasattr(obj, 'profil_candidat') and obj.profil_candidat.cv_pdf:
            return f"http://127.0.0.1:8000{obj.profil_candidat.cv_pdf.url}"
        return None

    def get_photo_profil(self, obj):
        if hasattr(obj, 'profil_candidat') and obj.profil_candidat.photo_profil:
            return f"http://127.0.0.1:8000{obj.profil_candidat.photo_profil.url}"
        return None

    def get_experiences(self, obj):
        if hasattr(obj, 'profil_candidat'):
            return ExperienceSerializer(obj.profil_candidat.experiences_detail.all(), many=True).data
        return []

    def get_formations(self, obj):
        if hasattr(obj, 'profil_candidat'):
            return FormationSerializer(obj.profil_candidat.formations_detail.all(), many=True).data
        return []

    def get_competences(self, obj):
        return obj.profil_candidat.competences if hasattr(obj, 'profil_candidat') else ""

    def get_langues(self, obj):
        return obj.profil_candidat.langues if hasattr(obj, 'profil_candidat') else ""

    # --- Méthodes pour les nouveaux champs administratifs et préférences ---
    def get_service_militaire(self, obj):
        return obj.profil_candidat.service_militaire if hasattr(obj, 'profil_candidat') else None

    def get_permis_conduire(self, obj):
        return obj.profil_candidat.permis_conduire if hasattr(obj, 'profil_candidat') else False

    def get_vehicule_personnel(self, obj):
        return obj.profil_candidat.vehicule_personnel if hasattr(obj, 'profil_candidat') else False

    def get_passeport_valide(self, obj):
        return obj.profil_candidat.passeport_valide if hasattr(obj, 'profil_candidat') else False

    def get_secteur_souhaite(self, obj):
        return obj.profil_candidat.secteur_souhaite if hasattr(obj, 'profil_candidat') else None

    def get_salaire_souhaite(self, obj):
        return obj.profil_candidat.salaire_souhaite if hasattr(obj, 'profil_candidat') else None

    def get_mobilite(self, obj):
        return obj.profil_candidat.mobilite if hasattr(obj, 'profil_candidat') else None

    def get_situation_actuelle(self, obj):
        return obj.profil_candidat.situation_actuelle if hasattr(obj, 'profil_candidat') else None
# 2. Vigile pour la candidature
class CandidatureRecruteurDTO(serializers.ModelSerializer):
    candidat = CandidatInfoDTO(read_only=True)
    
    # 1. On déclare le champ ici
    lettre_motivation_file = serializers.SerializerMethodField()
    
    class Meta:
        model = Candidature
        # 2. VÉRIFIE BIEN CETTE LIGNE : le champ doit être dans la parenthèse !
        fields = ('id', 'candidat', 'date_postulation', 'lettre_motivation', 'lettre_motivation_file', 'statut')

    # 3. La fonction pour créer le lien du fichier
    def get_lettre_motivation_file(self, obj):
        if obj.lettre_motivation_file:
            return f"http://127.0.0.1:8000{obj.lettre_motivation_file.url}"
        return None
# 3. Vigile pour l'offre (avec ses candidatures imbriquées)
class OffreDashboardDTO(serializers.ModelSerializer):
    candidatures = CandidatureRecruteurDTO(many=True, read_only=True)
    
    class Meta:
        model = OffreEmploi
        fields = ('id', 'titre', 'date_publication', 'est_active', 'est_cloturee', 'candidatures')

class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperienceCandidat
        # On liste les champs, mais on retire 'profil' ou on le rend invisible
        fields = ['id', 'titre_poste', 'entreprise', 'date_debut', 'date_fin', 'description']

class FormationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormationCandidat
        fields = ['id', 'diplome', 'etablissement', 'date_debut', 'date_fin', 'description']
# =======================================================
# 1. LE PROFIL COMPLET POUR LE CANDIDAT (ET POUR L'UPDATE)
# =======================================================
class ProfilCandidatDTO(serializers.ModelSerializer):
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    telephone = serializers.SerializerMethodField()
    nin = serializers.SerializerMethodField()
    
    experiences_detail = ExperienceSerializer(many=True, read_only=True)
    formations_detail = FormationSerializer(many=True, read_only=True)

    class Meta:
        model = ProfilCandidat
        fields = (
            'titre_professionnel', 'cv_pdf', 'photo_profil', 'diplome', 'specialite', # <-- Ajout de photo_profil ici
            'experiences', 'competences', 'langues',
            'first_name', 'last_name', 'email', 'telephone', 'nin',
            'experiences_detail', 'formations_detail', 'service_militaire', 'permis_conduire', 'vehicule_personnel', 'passeport_valide',
            'secteur_souhaite', 'salaire_souhaite', 'mobilite', 'situation_actuelle'
        )

    def get_first_name(self, obj): return obj.user.first_name
    def get_last_name(self, obj): return obj.user.last_name
    def get_email(self, obj): return obj.user.email
    def get_telephone(self, obj): return obj.user.telephone
    def get_nin(self, obj): return obj.user.nin
class CandidatRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    date_naissance = serializers.DateField(required=True)
    nin = serializers.CharField(required=True, min_length=18, max_length=18)
    telephone = serializers.CharField(required=True)
    
    # AJOUT DU CHAMP DE CONSENTEMENT (US 1.6)
    consentement_loi_18_07 = serializers.BooleanField(required=True)

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'first_name', 
            'last_name', 'date_naissance', 'nin', 'telephone',
            'consentement_loi_18_07' # Ajouté ici
        )

    def validate_consentement_loi_18_07(self, value):
        if value is not True:
            raise serializers.ValidationError("Le consentement à la loi 18-07 est obligatoire.")
        return value

    def create(self, validated_data):
        # 1. On récupère TOUTES les valeurs (sans les jeter à la poubelle)
        consentement = validated_data.pop('consentement_loi_18_07')
        date_naiss = validated_data.pop('date_naissance')
        nin = validated_data.pop('nin')
        telephone = validated_data.pop('telephone')
        
        # 2. On injecte toutes les valeurs dans la base de données
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            nin=nin,
            telephone=telephone,
            consentement_loi_18_07=consentement, # <--- LA CORRECTION EST ICI !
            role='CANDIDAT' # On s'assure que le rôle est bien fixé
        )
        
        # 3. On crée le profil associé
        from jobs.models import ProfilCandidat
        ProfilCandidat.objects.create(
            user=user,
            date_naissance=date_naiss
        )
        
        return user

class MesCandidaturesDTO(serializers.ModelSerializer):
    offre_titre = serializers.CharField(source='offre.titre', read_only=True)
    entreprise_nom = serializers.CharField(source='offre.entreprise.nom_entreprise', read_only=True)
    offre_est_cloturee = serializers.BooleanField(source='offre.est_cloturee', read_only=True)
    class Meta:
        model = Candidature
        fields = ('id', 'offre_titre', 'entreprise_nom', 'date_postulation', 'statut', 'offre_est_cloturee')

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # On ajoute le rôle à la réponse pour que React sache si c'est un CANDIDAT ou RECRUTEUR
        data['role'] = self.user.role 
        return data

class EntrepriseDashboardDetailSerializer(serializers.ModelSerializer):
    # On va chercher les infos dans l'objet User lié
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    telephone = serializers.CharField(source='user.telephone', read_only=True)

    class Meta:
        model = ProfilEntreprise
        fields = (
            'id','nom_entreprise', 'secteur_activite', 'registre_commerce', 
            'wilaya_siege', 'description', 'est_approuvee',
            'first_name', 'last_name', 'email', 'telephone'
        )

# Un petit serializer pour extraire le CV et les compétences du candidat
class ProfilCandidatAdminSerializer(serializers.ModelSerializer):
    experiences_detail = ExperienceSerializer(many=True, read_only=True)
    formations_detail = FormationSerializer(many=True, read_only=True)
    class Meta:
        model = ProfilCandidat
        fields = '__all__'

class AdminUserSerializer(serializers.ModelSerializer):
    # On imbrique le profil pour que React reçoive tout le dossier !
    profil_candidat = ProfilCandidatAdminSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'role', 
            'is_active', 'date_joined', 'telephone', 'nin', 'date_naissance', 
            'consentement_loi_18_07', 'profil_candidat'
        )