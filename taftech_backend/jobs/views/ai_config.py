from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from ..models import AIConfig
from ..serializers import AIConfigSerializer


class AIConfigAdminAPIView(APIView):
    """Configuration IA (singleton) — GET retourne la config actuelle (créée avec les valeurs par
    défaut au premier accès), PUT la met à jour. Pas de POST/DELETE : une seule ligne existe
    toujours, gérée via `AIConfig.get_solo()`."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        return Response(AIConfigSerializer(AIConfig.get_solo()).data)

    def put(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        config = AIConfig.get_solo()
        serializer = AIConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
