"""Correction d'une offre par l'admin pendant la modération (spécification du 16/10/2026).

L'admin peut corriger les fautes d'une offre tant qu'elle est « En attente » : après publication, seul le
recruteur la modifie (sinon les scores de matching déjà affichés changeraient en silence). Chaque
correction est tracée dans le journal d'audit (champs modifiés) et le recruteur en est informé par e-mail
avec la liste des changements (ancienne et nouvelle valeur)."""
from django.conf import settings
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import OffreEmploi
from ..permissions import IsAdminRole
from ..serializers import OffreDashboardDTO, OffreEmploiCreateDTO
from .admin import _audit

# Liste blanche : jamais `statut_moderation`, `motif_rejet`, `entreprise`… (l'approbation reste la route
# « moderer » et ses propres traces d'audit).
CHAMPS_CORRIGEABLES = (
    'titre', 'wilaya', 'commune', 'lieux_supplementaires', 'metier', 'description', 'missions', 'profil_recherche',
    'competences', 'type_contrat', 'types_contrat_supplementaires', 'experience_requise', 'nombre_postes',
    'salaire_propose', 'date_expiration',
)
LIBELLES_CHAMPS = {
    'titre': 'Titre', 'wilaya': 'Wilaya', 'commune': 'Commune', 'lieux_supplementaires': 'Autres lieux de travail',
    'metier': 'Métier', 'description': 'Description',
    'missions': 'Missions', 'profil_recherche': 'Profil recherché', 'competences': 'Compétences',
    'type_contrat': 'Type de contrat', 'types_contrat_supplementaires': 'Autres types de contrat',
    'experience_requise': 'Expérience', 'nombre_postes': 'Nombre de postes',
    'salaire_propose': 'Salaire proposé', 'date_expiration': "Date d'expiration",
}
APERCU_MAX = 60
DETAIL_AUDIT_MAX = 255


def _valeur(offre, champ):
    return getattr(offre, 'metier_id' if champ == 'metier' else champ)


def _apercu(valeur):
    if isinstance(valeur, list):  # lieux ([{wilaya, commune}]) ou contrats (codes) supplémentaires : en clair, pas en repr Python
        elements = [f"{e.get('wilaya', '')} {e.get('commune', '')}".strip() if isinstance(e, dict) else str(e) for e in valeur]
        valeur = ' | '.join(elements) or 'aucun'
    texte = '' if valeur is None else str(valeur).strip()
    return texte if len(texte) <= APERCU_MAX else texte[:APERCU_MAX - 1] + '…'


def _changements(avant, offre):
    """Liste de (champ, ancienne valeur, nouvelle valeur) pour les seuls champs réellement modifiés."""
    return [
        (champ, avant[champ], _valeur(offre, champ))
        for champ in CHAMPS_CORRIGEABLES if str(avant[champ] or '') != str(_valeur(offre, champ) or '')
    ]


def _detail_audit(offre, changements):
    champs = ', '.join(champ for champ, _ancien, _nouveau in changements)
    return f"offre #{offre.id} - {offre.titre} : {champs}"[:DETAIL_AUDIT_MAX]


def _prevenir_recruteur(offre, changements):
    """E-mail au recruteur. Jamais bloquant : la correction est déjà enregistrée."""
    destinataire = offre.entreprise.user.email
    if not destinataire:
        return
    lignes = '\n'.join(
        f"- {LIBELLES_CHAMPS[champ]} : « {_apercu(ancien)} » → « {_apercu(nouveau)} »"
        for champ, ancien, nouveau in changements
    )
    corps = (
        f"Bonjour,\n\nL'équipe TafTech a corrigé votre offre « {offre.titre} » avant sa publication :\n\n"
        f"{lignes}\n\nVotre offre reste en attente de validation. Vous pouvez la consulter depuis votre espace.\n"
    )
    try:
        send_mail(f"Votre offre a été corrigée — {offre.titre}", corps, settings.DEFAULT_FROM_EMAIL, [destinataire], fail_silently=True)
    except Exception:
        pass


class AdminOffreCorrigerAPIView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.select_related('entreprise__user').get(id=offre_id)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if offre.statut_moderation != 'EN_ATTENTE' or offre.est_cloturee:
            return Response(
                {"error": "Une offre ne peut être corrigée par l'admin que tant qu'elle est en attente de validation.", "code": "OFFRE_NON_EN_ATTENTE"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        donnees = {champ: request.data[champ] for champ in CHAMPS_CORRIGEABLES if champ in request.data}
        if not donnees:
            return Response({"error": "Aucun champ à corriger."}, status=status.HTTP_400_BAD_REQUEST)
        avant = {champ: _valeur(offre, champ) for champ in CHAMPS_CORRIGEABLES}
        serializer = OffreEmploiCreateDTO(offre, data=donnees, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        changements = _changements(avant, offre)
        if changements:
            _audit(request, 'CORRIGER_OFFRE', _detail_audit(offre, changements))
            _prevenir_recruteur(offre, changements)
        return Response(
            {"message": "Offre corrigée.", "changements": [champ for champ, _a, _n in changements], "offre": OffreDashboardDTO(offre).data},
            status=status.HTTP_200_OK,
        )
