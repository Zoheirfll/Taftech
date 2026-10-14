from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from ..models import MentionsLegalesEntreprise
from ..permissions import IsAdminRole
from ..serializers.societe import CHAMPS_EDITABLES, InformationsSocieteSerializer
from ..throttles import PublicReadThrottle
from .admin import _audit

DETAIL_AUDIT_MAX = 255  # AuditLog.detail est un CharField(255)


class InformationsSocietePublicAPIView(APIView):
    """Coordonnées et informations légales de la société, pour les pieds de page, la page Contact
    et la page Mentions légales. Un champ non renseigné est renvoyé vide : le frontend ne l'affiche pas."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        return Response(InformationsSocieteSerializer(MentionsLegalesEntreprise.get_solo()).data)


class InformationsSocieteAdminAPIView(APIView):
    """Lecture et modification des informations société (singleton). Toute modification est tracée
    dans le journal d'audit (noms des champs modifiés : ces données sont publiques, mais un
    changement de coordonnées ou de n° de RC doit rester attribuable)."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(InformationsSocieteSerializer(MentionsLegalesEntreprise.get_solo()).data)

    def put(self, request):
        infos = MentionsLegalesEntreprise.get_solo()
        avant = {champ: getattr(infos, champ) for champ in CHAMPS_EDITABLES}
        serializer = InformationsSocieteSerializer(infos, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        modifies = [champ for champ in CHAMPS_EDITABLES if avant[champ] != getattr(infos, champ)]
        if modifies:
            _audit(request, 'MODIFIER_INFOS_SOCIETE', ', '.join(modifies)[:DETAIL_AUDIT_MAX])
        return Response(InformationsSocieteSerializer(infos).data)
