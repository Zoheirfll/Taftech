from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from ..models import AIConfig, QuotaIAOverride, UtilisationIA
from ..serializers import AIConfigSerializer, QuotaIAOverrideSerializer

User = get_user_model()


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


class QuotaIAOverridesAPIView(APIView):
    """CRUD des quotas IA personnalisés par compte — voir jobs/ia_quota.py. Un override remplace
    intégralement le quota par défaut (palier ou AIConfig) pour un (user, fonction) donné."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        qs = QuotaIAOverride.objects.select_related('user').order_by('-date_creation')
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(user__email__icontains=search)
        return Response(QuotaIAOverrideSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = QuotaIAOverrideSerializer(data=request.data)
        if serializer.is_valid():
            # unique_together (user, fonction) — un override existant pour ce couple est
            # remplacé plutôt que de renvoyer une erreur de contrainte peu claire à l'admin.
            QuotaIAOverride.objects.filter(
                user_id=serializer.validated_data['user'].id,
                fonction=serializer.validated_data['fonction'],
            ).delete()
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        deleted, _ = QuotaIAOverride.objects.filter(pk=pk).delete()
        if not deleted:
            return Response({'error': 'Introuvable.'}, status=404)
        return Response(status=204)


class QuotaIAUsageAPIView(APIView):
    """Usage IA d'un compte (jour/mois en cours, par fonction) — pour que l'admin voie la
    consommation réelle avant de créer un override. GET ?email=xxx."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        email = request.query_params.get('email', '').strip()
        if not email:
            return Response({'error': 'Paramètre email requis.'}, status=400)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'Compte introuvable.'}, status=404)

        from ..ia_quota import _limites_effectives, _debut_jour, _debut_mois, _compter
        resultats = []
        for cle, libelle in UtilisationIA.FONCTION_CHOICES:
            limite_jour, limite_mois = _limites_effectives(user, cle)
            resultats.append({
                'fonction': cle,
                'fonction_libelle': libelle,
                'utilise_jour': _compter(user, cle, _debut_jour()),
                'limite_jour': limite_jour,
                'utilise_mois': _compter(user, cle, _debut_mois()),
                'limite_mois': limite_mois,
            })
        return Response({'user_id': user.id, 'user_email': user.email, 'usage': resultats})
