from rest_framework import serializers
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise

User = get_user_model()

class RegisterCandidatDTO(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = (
            'username', 'email', 'password', 'first_name', 
            'last_name', 'nin', 'telephone', 'date_naissance', 
            'consentement_loi_18_07'
        )

    # --- TES VALIDATIONS (Gardées car elles sont parfaites) ---
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cette adresse email.")
        return value

    def validate_consentement_loi_18_07(self, value):
        if value is not True:
            raise serializers.ValidationError("Le consentement à la protection des données (Loi 18-07) est obligatoire.")
        return value

    def validate_nin(self, value):
        if value:
            if len(value) != 18:
                raise serializers.ValidationError("Le NIN doit contenir exactement 18 caractères.")
            if not value.isdigit():
                raise serializers.ValidationError("Le NIN ne doit contenir que des chiffres.")
            if User.objects.filter(nin=value).exists():
                raise serializers.ValidationError("Ce Numéro d'Identification National est déjà enregistré.")
        return value

    # --- LE FIX CRUCIAL : LA MÉTHODE CREATE ---
    def create(self, validated_data):
        # On extrait le mot de passe pour le hacher correctement
        password = validated_data.pop('password')
        
        # On crée l'utilisateur avec TOUTES les données (incluant le consentement)
        user = User.objects.create_user(
            **validated_data,
            role='CANDIDAT' # On force le rôle ici aussi
        )
        
        # On sécurise le mot de passe
        user.set_password(password)
        user.save()
        
        # On crée automatiquement son profil vide (pour éviter les erreurs 404 plus tard)
        from jobs.models import ProfilCandidat
        ProfilCandidat.objects.create(user=user)
        
        return user

class EmailTokenObtainSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # On transforme l'email en username pour que SimpleJWT soit content
        email_saisi = attrs.get('username')
        user = User.objects.filter(email=email_saisi).first()
        
        if user:
            attrs['username'] = user.username
            
        # On récupère les tokens (access/refresh)
        data = super().validate(attrs)
        
        # ON RESTE PRO : On ajoute les infos dont React a besoin
        data['role'] = self.user.role  # <-- CRUCIAL
        data['username'] = self.user.username
        data['full_name'] = f"{self.user.first_name} {self.user.last_name}"
        
        return data

class RecruteurRegisterSerializer(serializers.ModelSerializer):
    """
    DTO pour l'inscription stricte d'un Recruteur (US 1.5).
    Verrouille le rôle à RECRUTEUR et place l'entreprise en attente de validation.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    telephone = serializers.CharField(required=True)

    # Champs de l'entreprise
    nom_entreprise = serializers.CharField(write_only=True, required=True)
    secteur_activite = serializers.CharField(write_only=True, required=True)
    registre_commerce = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            'email', 'username', 'password', 'first_name', 'last_name', 'telephone',
            'nom_entreprise', 'secteur_activite', 'registre_commerce'
        )

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cette adresse email.")
        return value

    def create(self, validated_data):
        # 1. On sépare les infos de l'entreprise
        nom_entreprise = validated_data.pop('nom_entreprise')
        secteur_activite = validated_data.pop('secteur_activite')
        registre_commerce = validated_data.pop('registre_commerce')

        # 2. On crée le compte et on VERROUILLE le rôle
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            telephone=validated_data.get('telephone', '')
        )
        user.role = 'RECRUTEUR' # Rôle définitif
        user.save()

        # 3. On génère le profil entreprise (est_approuvee=False par défaut dans ton modèle)
        ProfilEntreprise.objects.create(
            user=user,
            nom_entreprise=nom_entreprise,
            secteur_activite=secteur_activite,
            registre_commerce=registre_commerce,
            wilaya_siege="Non renseignée" # Valeur par défaut obligatoire si tu l'as mise requise
        )
        return user