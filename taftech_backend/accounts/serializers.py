from rest_framework import serializers
from .models import CustomUser, SystemErrorLog
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
class RegisterCandidatDTO(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    # 👇 AJOUT : On récupère la wilaya depuis React
    wilaya = serializers.CharField(write_only=True, required=True)
    nin = serializers.CharField(required=True)
    adresse = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = CustomUser
        fields = (
            'username', 'email', 'password', 'first_name',
            'last_name', 'nin', 'telephone', 'date_naissance',
            'consentement_loi_18_07', 'wilaya', 'adresse' # <-- Ajout de wilaya/adresse ici
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
                raise serializers.ValidationError(
                    "Ce numéro n'a pas pu être validé. Vérifiez votre saisie ou contactez le support si le problème persiste."
                )
        return value

    # --- LA MÉTHODE CREATE MISE À JOUR ---
    def create(self, validated_data):
        # On extrait le mot de passe et la wilaya
        password = validated_data.pop('password')
        wilaya_saisie = validated_data.pop('wilaya')
        adresse_saisie = validated_data.pop('adresse')

        # On crée l'utilisateur
        user = User.objects.create_user(
            **validated_data,
            role='CANDIDAT',
            is_active=False
        )
        
        user.set_password(password)
        user.save()
        
        # 👇 On crée le profil candidat et on y insère directement la wilaya !
        from jobs.models import ProfilCandidat
        ProfilCandidat.objects.create(user=user, wilaya=wilaya_saisie, adresse=adresse_saisie)
        
        return user
class EmailTokenObtainSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email_saisi = attrs.get('username')
        user = User.objects.filter(email=email_saisi).first()

        if not user:
            raise AuthenticationFailed("Aucun compte trouvé avec cette adresse email.")

        # Vérification verrou actif
        if user.locked_until and timezone.now() < user.locked_until:
            minutes_restantes = int((user.locked_until - timezone.now()).total_seconds() // 60) + 1
            raise AuthenticationFailed(
                f"Compte temporairement verrouillé. Réessayez dans {minutes_restantes} minute(s)."
            )

        if not user.is_active:
            raise AuthenticationFailed({
                "code": "COMPTE_NON_VERIFIE",
                "email": user.email,
                "role": user.role,
                "detail": "Votre compte n'est pas activé. Veuillez vérifier votre email.",
            })

        if user.role == 'RECRUTEUR' and hasattr(user, 'profilentreprise') and not user.profilentreprise.est_approuvee:
            pass

        attrs['username'] = user.username

        try:
            data = super().validate(attrs)
        except Exception:
            # Mauvais mot de passe — incrémenter le compteur
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
                user.locked_until = timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                user.failed_login_attempts = 0
                user.save(update_fields=['failed_login_attempts', 'locked_until'])
                raise AuthenticationFailed(
                    f"Trop de tentatives échouées. Compte verrouillé {LOCKOUT_DURATION_MINUTES} minutes."
                )
            user.save(update_fields=['failed_login_attempts'])
            raise AuthenticationFailed("Email ou mot de passe incorrect.")

        # Login réussi — réinitialiser le compteur
        if user.failed_login_attempts > 0 or user.locked_until:
            user.failed_login_attempts = 0
            user.locked_until = None
            user.save(update_fields=['failed_login_attempts', 'locked_until'])

        data['role'] = self.user.role
        from jobs.models import MembreEquipe
        data['est_membre_equipe'] = MembreEquipe.objects.filter(user=self.user).exists()
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

        # 2. On crée le compte et on VERROUILLE le rôle ET L'ACTIVATION
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            telephone=validated_data.get('telephone', ''),
            is_active=False # 👈 LE COUP DE MARTEAU EST LÀ !
        )
        user.role = 'RECRUTEUR'
        user.email_verifie = False # On s'assure que c'est faux
        user.save()

        # 3. On génère le profil entreprise (est_approuvee=False par défaut)
        from jobs.models import ProfilEntreprise # Assure-toi de l'importer si ce n'est pas fait
        ProfilEntreprise.objects.create(
            user=user,
            nom_entreprise=nom_entreprise,
            secteur_activite=secteur_activite,
            registre_commerce=registre_commerce,
            wilaya_siege="Non renseignée" 
        )
        return user
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # 1. Django vérifie si l'email et le mot de passe sont corrects
        data = super().validate(attrs)
        
        # 2. SÉCURITÉ : On vérifie si c'est un Candidat et si son email est validé
        if self.user.role == 'CANDIDAT' and not self.user.email_verifie:
            raise AuthenticationFailed("Votre compte n'est pas activé. Veuillez vérifier votre email avec le code à 6 chiffres.")

        # 3. Si tout est bon, on ajoute le rôle au token pour React
        data['role'] = self.user.role 
        
        return data

class SystemErrorLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemErrorLog
        fields = '__all__'