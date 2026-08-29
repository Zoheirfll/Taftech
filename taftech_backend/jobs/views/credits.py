from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth import get_user_model
from django.core.cache import cache

from .equipe import get_entreprise_for_user, get_membre_role, _log
from ..paliers_utils import get_palier_actif
from ..credits_utils import credits_disponibles, deverrouiller_candidat, CreditsEpuisesError
from ..throttles import WriteActionThrottle, PublicReadThrottle
from ..serializers import CreditPackSerializer

User = get_user_model()

CACHE_CREDIT_PACKS = 'jobs_credit_packs'

_ROLES_ACTION = ('PROPRIETAIRE', 'ADMIN', 'UTILISATEUR')


class DeverrouillerCandidatAPIView(APIView):
    """Débloque coordonnées+CV d'un candidat CVthèque pour l'entreprise, en consommant
    1 crédit — voir docs/superpowers/specs/2026-08-29-credits-cvtheque-design.md."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [WriteActionThrottle]

    def post(self, request, candidat_id):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Accès réservé aux recruteurs."}, status=403)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Action non autorisée pour votre rôle."}, status=403)

        palier = get_palier_actif(entreprise)
        if palier is None:
            return Response(
                {"error": "Le déblocage de profils nécessite un abonnement actif.", "code": "PALIER_INSUFFISANT"},
                status=403,
            )

        try:
            candidat = User.objects.get(id=candidat_id, role='CANDIDAT')
        except User.DoesNotExist:
            return Response({"error": "Candidat introuvable."}, status=404)

        try:
            deverrouiller_candidat(entreprise, candidat)
        except CreditsEpuisesError:
            return Response(
                {"error": "Vous n'avez plus de crédits disponibles ce mois-ci.", "code": "CREDITS_EPUISES"},
                status=403,
            )

        _log(request.user, entreprise, 'DEBLOQUER_CANDIDAT', candidat.email)
        return Response({"est_debloque": True, "credits_disponibles": credits_disponibles(entreprise)})


import hashlib
import hmac
import requests as http_requests
from django.conf import settings


class CreditPackCheckoutAPIView(APIView):
    """Crée une session de paiement Chargily pour un pack de crédits — même mécanisme que
    ChargilyCheckoutPalierAPIView, discriminé côté webhook par metadata.pack_id."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Accès réservé aux recruteurs."}, status=403)
        if get_membre_role(request.user, entreprise) != 'PROPRIETAIRE':
            return Response({"error": "Seul le propriétaire peut acheter des crédits."}, status=403)

        from ..models import CreditPack
        try:
            pack = CreditPack.objects.get(id=request.data.get('pack_id'), actif=True)
        except (CreditPack.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Pack introuvable."}, status=404)

        payload = {
            "items": [{"price": pack.prix_da, "quantity": 1, "name": pack.nom}],
            "success_url": f"{settings.SITE_URL}/recruteurs/abonnements?paid=1",
            "failure_url": f"{settings.SITE_URL}/recruteurs/abonnements?paid=0",
            "metadata": {"pack_id": str(pack.id), "entreprise_id": str(entreprise.id), "user_id": str(request.user.id)},
        }
        response = http_requests.post(
            "https://pay.chargily.net/test/api/v2/checkouts",
            json=payload,
            headers={"Authorization": f"Bearer {settings.CHARGILY_API_KEY}"},
            timeout=15,
        )
        if response.status_code not in (200, 201):
            return Response({"error": "Erreur lors de la création du paiement."}, status=502)
        return Response({"checkout_url": response.json().get("checkout_url")})


class CreditPackPublicAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        cached = cache.get(CACHE_CREDIT_PACKS)
        if cached is not None:
            return Response(cached)
        from ..models import CreditPack
        packs = CreditPack.objects.filter(actif=True)
        data = CreditPackSerializer(packs, many=True).data
        cache.set(CACHE_CREDIT_PACKS, data, timeout=3600)
        return Response(data)


class CreditPackAdminAPIView(APIView):
    """CRUD admin des packs de crédits CVthèque — même pattern que PaliersAdminAPIView."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        from ..models import CreditPack
        packs = CreditPack.objects.all()
        return Response(CreditPackSerializer(packs, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = CreditPackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_CREDIT_PACKS)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        from ..models import CreditPack
        try:
            pack = CreditPack.objects.get(pk=pk)
        except CreditPack.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = CreditPackSerializer(pack, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_CREDIT_PACKS)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        from ..models import CreditPack
        try:
            CreditPack.objects.get(pk=pk).delete()
            cache.delete(CACHE_CREDIT_PACKS)
            return Response({'message': 'Supprimé.'})
        except CreditPack.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
