from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from ..models import Article, ArticleCategorie
from ..serializers import (
    ArticleListSerializer, ArticleDetailSerializer, ArticleCategorieSerializer,
)
from ..throttles import PublicReadThrottle


class ArticlePagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 30


class ArticleListPublicAPIView(APIView):
    """Liste des articles publiés — pour la page /blog."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        articles = Article.objects.filter(statut='PUBLIE').select_related('categorie')
        categorie = request.query_params.get('categorie')
        if categorie:
            articles = articles.filter(categorie_id=categorie)
        articles = articles.order_by('-date_publication')
        paginator = ArticlePagination()
        page = paginator.paginate_queryset(articles, request)
        serializer = ArticleListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ArticleDetailPublicAPIView(APIView):
    """Détail d'un article publié — pour /blog/<slug>."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request, slug):
        try:
            article = Article.objects.select_related('categorie').get(slug=slug, statut='PUBLIE')
        except Article.DoesNotExist:
            return Response({'error': "Cet article n'existe pas ou n'est plus disponible."}, status=404)
        return Response(ArticleDetailSerializer(article).data)


class ArticleCategoriesPublicAPIView(APIView):
    """Catégories utilisées par au moins un article publié — pour le filtre de /blog."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        categories = ArticleCategorie.objects.filter(articles__statut='PUBLIE').distinct()
        return Response(ArticleCategorieSerializer(categories, many=True).data)


class ArticleAdminAPIView(APIView):
    """CRUD admin des articles — inclut les brouillons, toutes catégories."""
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        articles = Article.objects.select_related('categorie').all()
        return Response(ArticleListSerializer(articles, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = ArticleDetailSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class ArticleAdminDetailAPIView(APIView):
    """GET/PUT/DELETE sur un article précis — vue séparée de la liste car GET détail doit
    retourner contenu_html complet (ArticleDetailSerializer), pas la liste allégée."""
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            article = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        return Response(ArticleDetailSerializer(article).data)

    def put(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            article = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = ArticleDetailSerializer(article, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            Article.objects.get(pk=pk).delete()
            return Response({'message': 'Supprimé.'})
        except Article.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class ArticleCategoriesAdminAPIView(APIView):
    """CRUD admin des catégories de blog."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        return Response(ArticleCategorieSerializer(ArticleCategorie.objects.all(), many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = ArticleCategorieSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            ArticleCategorie.objects.get(pk=pk).delete()
            return Response({'message': 'Supprimé.'})
        except ArticleCategorie.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
