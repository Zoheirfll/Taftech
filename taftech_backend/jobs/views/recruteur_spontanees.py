"""Candidatures spontanées : envoi public, liste, marquage lu, suppression."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from ..models import ProfilEntreprise, CandidatureSpontanee
from .equipe import get_entreprise_for_user, get_membre_role
from ..throttles import WriteActionThrottle, EmailRateThrottle
from ..serializers import CandidatureSpontaneeSerializer



class EnvoyerCandidatureSpontaneeAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [WriteActionThrottle, EmailRateThrottle]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, slug):
        try:
            entreprise = ProfilEntreprise.objects.get(slug=slug, est_approuvee=True)
        except ProfilEntreprise.DoesNotExist:
            return Response({'error': 'Entreprise introuvable.'}, status=404)
        if request.user.is_authenticated and request.user.role == 'CANDIDAT':
            if CandidatureSpontanee.objects.filter(entreprise=entreprise, candidat=request.user).exists():
                return Response({'error': 'Candidature spontanée déjà envoyée.'}, status=400)
        else:
            email = (request.data.get('email') or '').strip()
            if email and CandidatureSpontanee.objects.filter(entreprise=entreprise, email__iexact=email).exists():
                return Response({'error': 'Candidature spontanée déjà envoyée avec cet email.'}, status=400)
        serializer = CandidatureSpontaneeSerializer(data=request.data)
        if serializer.is_valid():
            candidature = serializer.save(entreprise=entreprise)
            if request.user.is_authenticated and request.user.role == 'CANDIDAT':
                candidature.candidat = request.user
                candidature.save()
            from .equipe import _notifier_equipe
            nom_spontane = f"{candidature.prenom} {candidature.nom}".strip() or "Un candidat"
            _notifier_equipe(
                entreprise, 'CANDIDATURE_SPONTANEE',
                "Nouvelle candidature spontanée",
                f"{nom_spontane} a envoyé une candidature spontanée.",
                lien='/candidatures-spontanees'
            )
            return Response({'message': 'Candidature spontanée envoyée !'}, status=201)
        return Response(serializer.errors, status=400)


# Les candidatures spontanées (CV hors offre) ne sont pas visibles par l'Invité (observateur).
_ROLES_SPONTANEES = ('PROPRIETAIRE', 'ADMIN', 'UTILISATEUR')


def _refus_si_invite(user, entreprise):
    if get_membre_role(user, entreprise) not in _ROLES_SPONTANEES:
        return Response(
            {'error': 'Action non autorisée pour votre rôle.', 'code': 'ROLE_INSUFFISANT'},
            status=403,
        )
    return None


class ListeCandidaturesSpontaneesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Accès refusé.'}, status=403)
        refus_role = _refus_si_invite(request.user, entreprise)
        if refus_role:
            return refus_role
        from ..paliers_utils import reponse_entreprise_non_validee
        refus = reponse_entreprise_non_validee(entreprise)
        if refus:
            return refus
        candidatures = CandidatureSpontanee.objects.filter(entreprise=entreprise)
        serializer = CandidatureSpontaneeSerializer(candidatures, many=True)
        return Response(serializer.data)


class MarquerSpontaneeLueAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Accès refusé.'}, status=403)
        refus_role = _refus_si_invite(request.user, entreprise)
        if refus_role:
            return refus_role
        try:
            candidature = CandidatureSpontanee.objects.get(pk=pk, entreprise=entreprise)
            candidature.lue = True
            candidature.save()
            return Response({'message': 'Marquée comme lue.'})
        except CandidatureSpontanee.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class SupprimerSpontaneeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Accès refusé.'}, status=403)
        refus_role = _refus_si_invite(request.user, entreprise)
        if refus_role:
            return refus_role
        try:
            candidature = CandidatureSpontanee.objects.get(pk=pk, entreprise=entreprise)
            candidature.delete()
            return Response({'message': 'Supprimée.'})
        except CandidatureSpontanee.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
