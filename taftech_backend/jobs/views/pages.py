from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from django.core.cache import cache
from ..models import PageStatique
from ..serializers import PageStatiqueSerializer
from ..throttles import PublicReadThrottle

CACHE_PAGE = 'jobs_page_statique_'  # + slug
CACHE_PAGES_LISTE = 'jobs_pages_statiques_liste'
PAGES_SYSTEME = ('cgu', 'confidentialite', 'qui-sommes-nous')  # déjà liées en dur dans les footers


class PageStatiqueListePublicAPIView(APIView):
    """Liste allégée (slug + titre) des pages libres publiées — hors pages système déjà liées
    en dur (CGU/Confidentialité/Qui-sommes-nous) — pour affichage automatique dans les footers."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        cached = cache.get(CACHE_PAGES_LISTE)
        if cached is not None:
            return Response(cached)
        pages = PageStatique.objects.exclude(slug__in=PAGES_SYSTEME).order_by('titre')
        data = [{'slug': p.slug, 'titre': p.titre} for p in pages]
        cache.set(CACHE_PAGES_LISTE, data, timeout=3600)
        return Response(data)


class PageStatiquePublicAPIView(APIView):
    """Contenu d'une page statique par slug — pour /cgu, /confidentialite, /qui-sommes-nous,
    /pages/<slug>."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request, slug):
        cache_key = CACHE_PAGE + slug
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        try:
            page = PageStatique.objects.get(slug=slug)
        except PageStatique.DoesNotExist:
            return Response({'error': 'Page introuvable.'}, status=404)
        data = PageStatiqueSerializer(page).data
        cache.set(cache_key, data, timeout=3600)
        return Response(data)


class PageStatiqueAdminAPIView(APIView):
    """CRUD admin des pages statiques."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        return Response(PageStatiqueSerializer(PageStatique.objects.all(), many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = PageStatiqueSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_PAGE + serializer.validated_data['slug'])
            cache.delete(CACHE_PAGES_LISTE)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            page = PageStatique.objects.get(pk=pk)
        except PageStatique.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        ancien_slug = page.slug
        serializer = PageStatiqueSerializer(page, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_PAGE + ancien_slug)
            cache.delete(CACHE_PAGE + page.slug)
            cache.delete(CACHE_PAGES_LISTE)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            page = PageStatique.objects.get(pk=pk)
            slug = page.slug
            page.delete()
            cache.delete(CACHE_PAGE + slug)
            cache.delete(CACHE_PAGES_LISTE)
            return Response({'message': 'Supprimé.'})
        except PageStatique.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
