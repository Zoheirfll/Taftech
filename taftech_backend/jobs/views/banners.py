from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.cache import cache
from ..models import SiteAnnonce, BanniereAccueil
from ..serializers import SiteAnnonceSerializer, BanniereAccueilSerializer
from ..throttles import PublicReadThrottle

CACHE_ANNONCE = 'jobs_site_annonce_active'
CACHE_BANNIERES = 'jobs_bannieres_accueil'


class SiteAnnoncePublicAPIView(APIView):
    """Annonce active (au plus une) — pour le bandeau au-dessus de la navbar. 204 si aucune active."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        cached = cache.get(CACHE_ANNONCE)
        if cached is not None:
            return Response(cached) if cached else Response(status=204)
        annonce = SiteAnnonce.objects.filter(actif=True).first()
        data = SiteAnnonceSerializer(annonce).data if annonce else None
        cache.set(CACHE_ANNONCE, data, timeout=300)
        return Response(data) if data else Response(status=204)


class BanniereAccueilPublicAPIView(APIView):
    """Bannières actives triées par ordre — pour le carrousel de la page d'accueil."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        cached = cache.get(CACHE_BANNIERES)
        if cached is not None:
            return Response(cached)
        bannieres = BanniereAccueil.objects.filter(actif=True)
        data = BanniereAccueilSerializer(bannieres, many=True).data
        cache.set(CACHE_BANNIERES, data, timeout=3600)
        return Response(data)


class SiteAnnonceAdminAPIView(APIView):
    """CRUD admin de l'annonce globale."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        return Response(SiteAnnonceSerializer(SiteAnnonce.objects.all(), many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = SiteAnnonceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_ANNONCE)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            annonce = SiteAnnonce.objects.get(pk=pk)
        except SiteAnnonce.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = SiteAnnonceSerializer(annonce, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_ANNONCE)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            SiteAnnonce.objects.get(pk=pk).delete()
            cache.delete(CACHE_ANNONCE)
            return Response({'message': 'Supprimé.'})
        except SiteAnnonce.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class BanniereAccueilAdminAPIView(APIView):
    """CRUD admin des bannières du carrousel d'accueil."""
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        return Response(BanniereAccueilSerializer(BanniereAccueil.objects.all(), many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = BanniereAccueilSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_BANNIERES)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            banniere = BanniereAccueil.objects.get(pk=pk)
        except BanniereAccueil.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = BanniereAccueilSerializer(banniere, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_BANNIERES)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            BanniereAccueil.objects.get(pk=pk).delete()
            cache.delete(CACHE_BANNIERES)
            return Response({'message': 'Supprimé.'})
        except BanniereAccueil.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
