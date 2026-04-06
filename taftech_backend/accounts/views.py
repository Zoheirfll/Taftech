from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterCandidatDTO
from .services import UserService

class CandidatRegistrationAPIView(APIView):
    """
    Endpoint (POST) pour l'inscription d'un candidat.
    URL prévue : /api/accounts/register/candidat/
    """
    
    def post(self, request):
        # 1. Le Vigile (DTO) vérifie les données envoyées par React
        dto = RegisterCandidatDTO(data=request.data)
        
        if dto.is_valid():
            # 2. Si c'est valide, on donne les données propres au Cuisinier (Service)
            try:
                user = UserService.create_candidat(dto.validated_data)
                return Response(
                    {
                        "message": "Candidat créé avec succès.",
                        "user": {
                            "username": user.username,
                            "email": user.email,
                            "role": user.role
                        }
                    },
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response(
                    {"error": "Une erreur serveur est survenue lors de la création."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # 3. Si le DTO refuse (ex: pas de Loi 18-07), on renvoie l'erreur exacte à React
        return Response(dto.errors, status=status.HTTP_400_BAD_REQUEST)