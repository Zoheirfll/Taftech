from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from django.core.cache import cache
from ..models import Palier
from ..serializers import PalierSerializer
from ..throttles import PublicReadThrottle

CACHE_PALIERS = 'jobs_paliers'


class PaliersPublicAPIView(APIView):
    """Paliers d'abonnement actifs — consommé par la future page Abonnements recruteur
    (non construite dans cette phase) et tout futur teaser public."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        cached = cache.get(CACHE_PALIERS)
        if cached is not None:
            return Response(cached)
        paliers = Palier.objects.filter(actif=True)
        data = PalierSerializer(paliers, many=True).data
        cache.set(CACHE_PALIERS, data, timeout=3600)
        return Response(data)


class PaliersAdminAPIView(APIView):
    """CRUD admin des paliers d'abonnement — même pattern que PremiumPlansAdminAPIView."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        paliers = Palier.objects.all()
        return Response(PalierSerializer(paliers, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = PalierSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_PALIERS)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            palier = Palier.objects.get(pk=pk)
        except Palier.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = PalierSerializer(palier, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_PALIERS)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            Palier.objects.get(pk=pk).delete()
            cache.delete(CACHE_PALIERS)
            return Response({'message': 'Supprimé.'})
        except Palier.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
