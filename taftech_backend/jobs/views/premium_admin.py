from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from django.core.cache import cache
from ..models import FaqItem, CompetenceReferentiel
from ..serializers import FaqItemSerializer, CompetenceReferentielSerializer
from ..throttles import PublicReadThrottle

# NOTE (27/08/2026) : les vues PremiumPlansPublicAPIView/PremiumAvantagesPublicAPIView/
# PremiumPlansAdminAPIView/PremiumAvantagesAdminAPIView ont été supprimées de ce fichier —
# le système Premium legacy (PremiumPlan/PremiumAvantage) est retiré au profit du seul
# système Palier/AbonnementEntreprise (voir jobs/views/paliers_admin.py). Ce fichier ne
# garde que la FAQ et le référentiel de compétences (sans rapport avec Premium), pas
# renommé pour limiter le diff.
CACHE_FAQ = 'jobs_faq_'  # + catégorie


class FaqPublicAPIView(APIView):
    """FAQ actives d'une catégorie (?categorie=GENERAL|RECRUTEUR|PREMIUM) — pour ContactezNous,
    LandingRecruteur, PremiumPage."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        categorie = request.query_params.get('categorie', 'GENERAL')
        cache_key = CACHE_FAQ + categorie
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        items = FaqItem.objects.filter(categorie=categorie, actif=True)
        data = FaqItemSerializer(items, many=True).data
        cache.set(cache_key, data, timeout=3600)
        return Response(data)


class FaqAdminAPIView(APIView):
    """CRUD admin des FAQ, toutes catégories confondues — filtrage côté frontend."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        items = FaqItem.objects.all()
        return Response(FaqItemSerializer(items, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = FaqItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_FAQ + serializer.validated_data['categorie'])
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            item = FaqItem.objects.get(pk=pk)
        except FaqItem.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        ancienne_categorie = item.categorie
        serializer = FaqItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_FAQ + ancienne_categorie)
            cache.delete(CACHE_FAQ + item.categorie)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            item = FaqItem.objects.get(pk=pk)
            categorie = item.categorie
            item.delete()
            cache.delete(CACHE_FAQ + categorie)
            return Response({'message': 'Supprimé.'})
        except FaqItem.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class CompetencesAutocompleteAPIView(APIView):
    """Suggestions de compétences actives (?search=xxx) — le champ reste du texte libre côté
    candidat/offre, ceci ne fait que suggérer. Pas de cache (dépend de la recherche), mais requête
    simple sur un référentiel de taille modeste."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        qs = CompetenceReferentiel.objects.filter(actif=True)
        if search:
            qs = qs.filter(label__icontains=search)
        return Response(CompetenceReferentielSerializer(qs[:15], many=True).data)


class CompetencesAdminAPIView(APIView):
    """CRUD admin du référentiel de compétences — même pattern que MetierReferentielAdminAPIView."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        search = request.query_params.get('search', '').strip()
        qs = CompetenceReferentiel.objects.all()
        if search:
            qs = qs.filter(label__icontains=search)
        return Response(CompetenceReferentielSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = CompetenceReferentielSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            item = CompetenceReferentiel.objects.get(pk=pk)
        except CompetenceReferentiel.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = CompetenceReferentielSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            CompetenceReferentiel.objects.get(pk=pk).delete()
            return Response({'message': 'Supprimé.'})
        except CompetenceReferentiel.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
