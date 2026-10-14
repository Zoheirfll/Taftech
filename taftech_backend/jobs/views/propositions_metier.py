"""Propositions de métier : envoi par un recruteur ou un candidat, décision par l'admin (correction
client n°23). Logique métier dans `jobs/propositions_metier.py`."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import GroupeMetier, Metier, PropositionMetier
from ..permissions import IsAdminRole
from ..propositions_metier import (
    MODE_CREER, MODE_RATTACHER, PropositionRefusee, proposer_metier, rejeter_proposition, valider_proposition,
)
from ..serializers.proposition_metier import PropositionMetierAdminSerializer
from ..throttles import WriteActionThrottle
from .admin import _audit
from .equipe import get_entreprise_for_user

LISTE_MAX = 100
DETAIL_AUDIT_MAX = 255  # AuditLog.detail est un CharField(255)
# Seuls ces groupes portent réellement des métiers (le secteur source est un simple regroupement).
TYPES_GROUPE_METIER = ('domaine_source', 'sous_domaine_source')


class ProposerMetierAPIView(APIView):
    """POST : un candidat, ou un recruteur rattaché à une entreprise, propose un métier absent de la liste.
    Aucun effet sur le profil, l'offre ou le score : la proposition attend la décision de l'admin."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [WriteActionThrottle]

    def post(self, request):
        role = getattr(request.user, 'role', None)
        if role == 'CANDIDAT':
            origine = PropositionMetier.ORIGINE_CHOICES[1][0]
        elif role == 'RECRUTEUR' and get_entreprise_for_user(request.user) is not None:
            origine = PropositionMetier.ORIGINE_CHOICES[0][0]
        else:
            return Response({'error': "Réservé aux candidats et aux recruteurs."}, status=403)

        try:
            proposition, deja = proposer_metier(
                request.user, request.data.get('libelle'), request.data.get('contexte'), origine,
            )
        except PropositionRefusee as refus:
            return Response({'error': refus.message, 'code': refus.code, **refus.extra}, status=400)

        message = (
            "Ce métier a déjà été demandé : votre demande est enregistrée avec la précédente."
            if deja else "Merci, votre proposition sera examinée par notre équipe."
        )
        return Response(
            {'message': message + " En attendant, choisissez le métier le plus proche dans la liste.", 'deja_proposee': deja},
            status=200 if deja else 201,
        )


class AdminPropositionsMetierAPIView(APIView):
    """GET : propositions de métier par statut (`?statut=SUGGEREE|VALIDEE|REJETEE`, défaut : toutes) avec
    les compteurs par statut, plus récentes d'abord."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        statut = request.query_params.get('statut', '')
        base = PropositionMetier.objects.select_related('proposee_par', 'traite_par', 'metier_resultat')
        compteurs = {s: base.filter(statut=s).count() for s, _ in PropositionMetier.STATUT_CHOICES}
        compteurs['TOUTES'] = sum(compteurs.values())
        if statut in compteurs and statut != 'TOUTES':
            base = base.filter(statut=statut)
        items = PropositionMetierAdminSerializer(base.order_by('-date_creation')[:LISTE_MAX], many=True).data
        reponse = {'compteurs': compteurs, 'results': items}
        if request.query_params.get('groupes') == '1':
            # Chargés à la demande (≈ 700 lignes) : seulement quand l'admin crée un nouveau métier.
            reponse['groupes'] = [
                {'id': g.id, 'libelle': g.libelle, 'parent_libelle': g.parent.libelle if g.parent else ''}
                for g in GroupeMetier.objects.filter(type_groupe__in=TYPES_GROUPE_METIER)
                .select_related('parent').order_by('parent__libelle', 'libelle')
            ]
        return Response(reponse)


class _DecisionBase(APIView):
    permission_classes = [IsAdminRole]

    def _proposition(self, pk):
        return PropositionMetier.objects.filter(pk=pk).first()


class AdminValiderPropositionMetierAPIView(_DecisionBase):
    """POST : valider une proposition. Corps : `{mode: 'RATTACHER', metier_id}` (l'intitulé devient une
    appellation d'un métier existant) ou `{mode: 'CREER', groupe_id}` (nouveau métier officiel)."""

    def post(self, request, pk):
        proposition = self._proposition(pk)
        if proposition is None:
            return Response({'error': 'Proposition introuvable.'}, status=404)
        mode = request.data.get('mode')
        metier = groupe = None
        if mode == MODE_RATTACHER:
            metier = Metier.objects.filter(pk=request.data.get('metier_id') or 0).first()
            if metier is None:
                return Response({'error': "Choisissez le métier auquel rattacher cet intitulé."}, status=400)
        elif mode == MODE_CREER:
            groupe = GroupeMetier.objects.filter(pk=request.data.get('groupe_id') or 0).first()
            if groupe is None:
                return Response({'error': "Choisissez le groupe du nouveau métier."}, status=400)
        else:
            return Response({'error': "Mode de validation inconnu."}, status=400)
        try:
            validee = valider_proposition(proposition, request.user, mode, metier=metier, groupe=groupe)
        except ValueError as erreur:
            return Response({'error': str(erreur)}, status=400)
        cible = validee.metier_resultat.libelle if validee.metier_resultat else ''
        issue = 'rattaché à' if mode == MODE_RATTACHER else 'nouveau métier'
        _audit(request, 'STATUT_METIER', f"« {validee.libelle} » validé ({issue} {cible})"[:DETAIL_AUDIT_MAX])
        return Response(PropositionMetierAdminSerializer(validee).data)


class AdminRejeterPropositionMetierAPIView(_DecisionBase):
    """POST : rejeter une proposition ouverte. Corps : `{motif}` (obligatoire, visible du proposant)."""

    def post(self, request, pk):
        proposition = self._proposition(pk)
        if proposition is None:
            return Response({'error': 'Proposition introuvable.'}, status=404)
        try:
            rejetee = rejeter_proposition(proposition, request.user, request.data.get('motif'))
        except ValueError as erreur:
            return Response({'error': str(erreur)}, status=400)
        _audit(request, 'STATUT_METIER', f"« {rejetee.libelle} » rejeté"[:DETAIL_AUDIT_MAX])
        return Response(PropositionMetierAdminSerializer(rejetee).data)
