from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterCandidatDTO
from rest_framework_simplejwt.views import TokenObtainPairView # NOUVEAU
from .serializers import RegisterCandidatDTO, EmailTokenObtainSerializer # NOUVEAU
from .services import UserService
from .serializers import RecruteurRegisterSerializer
from rest_framework.permissions import AllowAny

class CandidatRegistrationAPIView(APIView):
    def post(self, request):
        # --- ÉTAPE D'ESPIONNAGE ---
        print("1. DONNÉES BRUTES DE REACT:", request.data) 
        
        dto = RegisterCandidatDTO(data=request.data)
        
        if dto.is_valid():
            print("2. DONNÉES VALIDÉES PAR LE DTO:", dto.validated_data)
            try:
                user = UserService.create_candidat(dto.validated_data)
                print(f"3. UTILISATEUR CRÉÉ: {user.email}, NIN: {user.nin}")
                
                return Response({
                    "message": "Candidat créé avec succès.",
                    "user": {
                        "username": user.username,
                        "email": user.email,
                        "role": user.role
                    }
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                print("ERREUR SERVICE:", str(e))
                return Response(
                    {"error": "Une erreur serveur est survenue."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        print("ERREURS DTO:", dto.errors)
        return Response(dto.errors, status=status.HTTP_400_BAD_REQUEST)

class EmailTokenObtainView(TokenObtainPairView):
    """
    Endpoint (POST) pour la connexion par Email.
    Remplace la vue par défaut de SimpleJWT.
    """
    serializer_class = EmailTokenObtainSerializer

class RecruteurRegisterAPIView(APIView):
    """
    Endpoint (POST) pour l'inscription d'une Entreprise.
    URL prévue : /api/accounts/register/recruteur/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RecruteurRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": "Demande de création de compte entreprise envoyée. "
                               "Vous pourrez publier des offres une fois votre Registre de Commerce validé par nos équipes."
                }, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)