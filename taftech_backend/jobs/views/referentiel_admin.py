"""Panel admin pour le référentiel v2 (session 17/09/2026) — Métiers, Spécialités de
formation, Types de diplôme. Les tables sont peuplées par la commande d'import
`import_referentiel_v2` (17 modèles, ~11 000 lignes au total) : ce panel ne permet
volontairement **ni création ni suppression** (les codes sont des identifiants stables
du référentiel client, un réimport doit rester idempotent — créer une ligne à la main
avec un code arbitraire romprait cette garantie, et supprimer casserait les FK déjà
posées sur des profils/offres réels). L'admin ajuste uniquement le libellé et les
indicateurs `selectionnable`/`actif` (masquer une entrée sans la supprimer) — même
principe déjà appliqué à `AdminPaliers.jsx` (4 paliers fixes, pas d'ajout/suppression)."""
from django.core.paginator import Paginator
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from ..models import Metier, SpecialiteFormation, TypeDiplome
from ..serializers.referentiel_admin import (
    AdminMetierSerializer, AdminSpecialiteFormationSerializer, AdminTypeDiplomeSerializer,
)


def _paginer(queryset, serializer_class, request, champ_recherche='libelle'):
    search = request.query_params.get('search', '')
    if search:
        q = Q()
        for mot in search.strip().split():
            q &= Q(**{f'{champ_recherche}__icontains': mot})
        queryset = queryset.filter(q)
    page = int(request.query_params.get('page', 1))
    paginator = Paginator(queryset, 30)
    page_obj = paginator.get_page(page)
    return Response({
        'results': serializer_class(page_obj.object_list, many=True).data,
        'count': paginator.count,
        'total_pages': paginator.num_pages,
    })


class AdminReferentielMetiersAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        metiers = Metier.objects.select_related('groupe_principal', 'metier_canonique').order_by('libelle')
        return _paginer(metiers, AdminMetierSerializer, request, champ_recherche='cle_recherche')

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            metier = Metier.objects.get(pk=pk)
        except Metier.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = AdminMetierSerializer(metier, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class AdminReferentielSpecialitesAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        specialites = SpecialiteFormation.objects.select_related('domaine', 'filiere').order_by('libelle')
        return _paginer(specialites, AdminSpecialiteFormationSerializer, request, champ_recherche='cle_recherche')

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            specialite = SpecialiteFormation.objects.get(pk=pk)
        except SpecialiteFormation.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = AdminSpecialiteFormationSerializer(specialite, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class AdminReferentielDiplomesAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        diplomes = TypeDiplome.objects.order_by('systeme', 'libelle')
        return _paginer(diplomes, AdminTypeDiplomeSerializer, request)

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            diplome = TypeDiplome.objects.get(pk=pk)
        except TypeDiplome.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = AdminTypeDiplomeSerializer(diplome, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
