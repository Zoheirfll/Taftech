from rest_framework import serializers
from .models import OffreEmploi, ProfilEntreprise
from .models import Candidature
from django.contrib.auth import get_user_model
from .models import ProfilCandidat
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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
        fields = ('lettre_motivation',) # L'offre et le candidat seront gérés par le serveur, pas par l'utilisateur

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
class CandidatInfoDTO(serializers.ModelSerializer):
    cv_pdf = serializers.SerializerMethodField()
    # On ajoute explicitement le prénom, nom et téléphone
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    telephone = serializers.CharField(read_only=True)
    diplome = serializers.SerializerMethodField() # Petit bonus pour le recruteur

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'telephone', 'cv_pdf', 'diplome')
        
    def get_cv_pdf(self, obj):
        if hasattr(obj, 'profil_candidat') and obj.profil_candidat.cv_pdf:
            # CORRECTION DU BUG CV : On force l'URL complète vers Django
            return f"http://127.0.0.1:8000{obj.profil_candidat.cv_pdf.url}"
        return None

    def get_diplome(self, obj):
        if hasattr(obj, 'profil_candidat'):
            return obj.profil_candidat.diplome
        return None

# 2. Vigile pour la candidature
class CandidatureRecruteurDTO(serializers.ModelSerializer):
    candidat = CandidatInfoDTO(read_only=True) # On imbrique les infos du candidat
    
    class Meta:
        model = Candidature
        fields = ('id', 'candidat', 'date_postulation', 'lettre_motivation', 'statut')

# 3. Vigile pour l'offre (avec ses candidatures imbriquées)
class OffreDashboardDTO(serializers.ModelSerializer):
    candidatures = CandidatureRecruteurDTO(many=True, read_only=True)
    
    class Meta:
        model = OffreEmploi
        fields = ('id', 'titre', 'date_publication', 'est_active', 'candidatures')
class ProfilCandidatDTO(serializers.ModelSerializer):
    # On utilise MethodField pour forcer Django à aller chercher la data manuellement
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    telephone = serializers.SerializerMethodField()
    nin = serializers.SerializerMethodField()

    class Meta:
        model = ProfilCandidat
        fields = (
            'titre_professionnel', 'cv_pdf', 'diplome', 'specialite', 
            'experiences', 'competences', 'langues',
            'first_name', 'last_name', 'email', 'telephone', 'nin'
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

    class Meta:
        model = Candidature
        fields = ('id', 'offre_titre', 'entreprise_nom', 'date_postulation', 'statut')

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