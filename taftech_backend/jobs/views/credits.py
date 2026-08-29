from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from .equipe import get_entreprise_for_user, get_membre_role, _log
from ..paliers_utils import get_palier_actif
from ..credits_utils import credits_disponibles, deverrouiller_candidat, CreditsEpuisesError
from ..throttles import WriteActionThrottle

User = get_user_model()

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
