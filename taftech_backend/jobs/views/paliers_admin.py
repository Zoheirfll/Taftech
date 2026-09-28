from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from ..models import Palier, AuditLog
from ..serializers import PalierSerializer
from ..throttles import PublicReadThrottle
from ..permissions import IsAdminRole


def _get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')

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
    """CRUD admin des paliers d'abonnement — même pattern que PremiumPlansAdminAPIView.
    Permission IsAdminRole (is_staff + role='ADMIN') — harmonisée avec jobs/views/admin.py."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        paliers = Palier.objects.all()
        return Response(PalierSerializer(paliers, many=True).data)

    def post(self, request):
        serializer = PalierSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_PALIERS)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        try:
            palier = Palier.objects.get(pk=pk)
        except Palier.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        ancien_mensuel, ancien_annuel = palier.prix_mensuel_da, palier.prix_annuel_da
        serializer = PalierSerializer(palier, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_PALIERS)
            # Trace uniquement un vrai changement de prix — pas les autres ajustements
            # (limites, accès, ordre...) pour ne pas noyer le journal d'audit.
            if palier.prix_mensuel_da != ancien_mensuel or palier.prix_annuel_da != ancien_annuel:
                AuditLog.objects.create(
                    admin=request.user, action='MODIFIER_PRIX_PALIER',
                    detail=(
                        f"Palier {palier.get_nom_display()} : "
                        f"mensuel {ancien_mensuel}→{palier.prix_mensuel_da} DA, "
                        f"annuel {ancien_annuel}→{palier.prix_annuel_da} DA"
                    ),
                    ip=_get_client_ip(request),
                )
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        try:
            Palier.objects.get(pk=pk).delete()
            cache.delete(CACHE_PALIERS)
            return Response({'message': 'Supprimé.'})
        except Palier.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
