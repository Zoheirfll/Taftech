from rest_framework import serializers
from ..models import Article, ArticleCategorie


class ArticleCategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleCategorie
        fields = ['id', 'label']


class ArticleListSerializer(serializers.ModelSerializer):
    """Vue liste (blog public + admin) — pas le contenu HTML complet, inutile pour une liste."""
    categorie_label = serializers.CharField(source='categorie.label', read_only=True)

    class Meta:
        model = Article
        fields = [
            'id', 'titre', 'slug', 'categorie', 'categorie_label', 'extrait',
            'image_couverture', 'statut', 'date_publication', 'date_creation',
        ]


class ArticleDetailSerializer(serializers.ModelSerializer):
    categorie_label = serializers.CharField(source='categorie.label', read_only=True)

    class Meta:
        model = Article
        fields = [
            'id', 'titre', 'slug', 'categorie', 'categorie_label', 'extrait', 'contenu_html',
            'image_couverture', 'statut', 'date_publication', 'date_creation', 'date_modification',
        ]
