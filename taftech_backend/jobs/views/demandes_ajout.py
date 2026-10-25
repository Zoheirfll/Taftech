"""Demandes d'ajout au référentiel : création par un candidat ou un recruteur, décision par l'admin
(accepter, rattacher, refuser). La logique métier vit dans `jobs/demandes_ajout/`."""
from django.core.paginator import Paginator
from django.db.models import Count
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..demandes_ajout import (
    ADAPTATEURS, DemandeRefusee, accepter_demande, adaptateur_pour, creer_demande, rattacher_demande, refuser_demande,
)
from ..demandes_ajout.regles import nettoyer, valider_motif
from ..models import DemandeAjout
from ..permissions import IsAdminRole
from ..serializers.demande_ajout import DemandeAjoutAdminSerializer
from ..throttles import WriteActionThrottle
from .admin import _audit
from .equipe import get_entreprise_for_user

PAR_PAGE = 30
DETAIL_AUDIT_MAX = 255  # AuditLog.detail est un CharField(255)


class CreerDemandeAjoutAPIView(APIView):
    """POST : un candidat, ou un recruteur rattaché à une entreprise, demande l'ajout d'un type de diplôme
    ou d'une spécialité absent de la liste. Aucun effet sur le profil, l'offre ou le score : la demande
    attend la décision de l'admin."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [WriteActionThrottle]

    def post(self, request):
        role = getattr(request.user, 'role', None)
        if role != 'CANDIDAT' and not (role == 'RECRUTEUR' and get_entreprise_for_user(request.user) is not None):
            return Response({'error': "Réservé aux candidats et aux recruteurs."}, status=403)
        try:
            demande, deja = creer_demande(
                request.user, request.data.get('type'), request.data.get('libelle'), request.data.get('contexte'),
                explicite=True,
            )
        except DemandeRefusee as refus:
            return Response({'error': refus.message, 'code': refus.code, **refus.extra}, status=400)
        message = (
            "Cette entrée a déjà été demandée : votre demande est enregistrée avec la précédente."
            if deja else "Merci, votre demande sera examinée par notre équipe."
        )
        return Response(
            {'message': message + " En attendant, choisissez l'entrée la plus proche dans la liste.",
             'deja_demandee': deja, 'id': demande.pk},
            status=200 if deja else 201,
        )


def _type_valide(valeur):
    return valeur if valeur in ADAPTATEURS else ''


def demandes_ajout_filtrees(params):
    """(demandes du type demandé, ces demandes filtrées par statut et libellé). La liste calcule ses
    compteurs sur la première, et l'export Excel reprend la seconde : mêmes filtres des deux côtés."""
    base_du_type = DemandeAjout.objects.all()
    type_demande = _type_valide(params.get('type', ''))
    if type_demande:
        base_du_type = base_du_type.filter(type=type_demande)
    filtrees = base_du_type
    statut = params.get('statut', '')
    if statut in dict(DemandeAjout.STATUT_CHOICES):
        filtrees = filtrees.filter(statut=statut)
    recherche = params.get('search', '').strip()
    if recherche:
        filtrees = filtrees.filter(libelle__icontains=recherche)
    return base_du_type, filtrees


class AdminDemandesAjoutAPIView(APIView):
    """GET : demandes d'ajout, filtrées par `type`, `statut` et `search` (libellé), 30 par page, avec les
    compteurs par statut du type demandé."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        base_du_type, base = demandes_ajout_filtrees(request.query_params)  # mêmes filtres que l'export Excel
        compteurs = {code: 0 for code, _ in DemandeAjout.STATUT_CHOICES}
        for ligne in base_du_type.values('statut').annotate(n=Count('id')):
            compteurs[ligne['statut']] = ligne['n']
        compteurs['TOUTES'] = sum(compteurs.values())
        base = (
            base.select_related('traite_par').prefetch_related('demandeurs', 'arrivees')
            .annotate(
                nb_formations_diplome=Count('formations_diplome', distinct=True),
                nb_formations_specialite=Count('formations_specialite', distinct=True),
            ).order_by('-date_creation', '-id')
        )
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
        except (TypeError, ValueError):
            page = 1
        paginateur = Paginator(base, PAR_PAGE)
        page_obj = paginateur.get_page(page)
        return Response({
            'results': DemandeAjoutAdminSerializer(page_obj.object_list, many=True).data,
            'count': paginateur.count,
            'total_pages': paginateur.num_pages,
            'compteurs': compteurs,
        })


class _AdminDemandeBase(APIView):
    permission_classes = [IsAdminRole]

    def _demande(self, pk):
        return DemandeAjout.objects.filter(pk=pk).first()


class AdminDemandeProchesAPIView(_AdminDemandeBase):
    """GET : les entrées existantes les plus proches du libellé demandé (aide à rattacher, jamais une décision).
    `?q=` : recherche libre de l'admin parmi les entrées du type (au moins 2 caractères)."""

    def get(self, request, pk):
        demande = self._demande(pk)
        if demande is None:
            return Response({'error': 'Demande introuvable.'}, status=404)
        try:
            adaptateur = adaptateur_pour(demande.type)
        except DemandeRefusee as refus:
            return Response({'error': refus.message, 'code': refus.code}, status=400)
        recherche = request.query_params.get('q', '').strip()
        if len(recherche) >= 2:
            return Response({'proches': adaptateur.proches(recherche[:120], limite=8, minimum=3)})
        return Response({'proches': adaptateur.proches(demande.libelle)})


class AdminDemandeParentsAPIView(APIView):
    """GET `?type=` : les choix de la fenêtre « Accepter » (systèmes de diplôme, ou domaines, filières et diplômes)."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        type_demande = _type_valide(request.query_params.get('type', ''))
        if not type_demande:
            return Response({'error': "Type de demande inconnu."}, status=400)
        return Response(adaptateur_pour(type_demande).parents())


def _detail_audit(demande, action):
    return f"{demande.get_type_display()} « {demande.libelle[:60]} » {action}"[:DETAIL_AUDIT_MAX]


class AdminDemandeAccepterAPIView(_AdminDemandeBase):
    """POST : accepter la demande (nouvelle entrée officielle). Corps : `{libelle?, parent, filiere_id?, diplomes_ids?,
    metiers_ids?}` (`parent` : système de diplôme, ou identifiant du domaine d'une spécialité ; `metiers_ids` : métiers
    auxquels lier une compétence acceptée, facultatif)."""

    def post(self, request, pk):
        demande = self._demande(pk)
        if demande is None:
            return Response({'error': 'Demande introuvable.'}, status=404)
        options = {
            'filiere_id': request.data.get('filiere_id'), 'diplomes_ids': request.data.get('diplomes_ids') or [],
            'metiers_ids': request.data.get('metiers_ids') or [],
        }
        try:
            acceptee = accepter_demande(
                demande, request.user, libelle=request.data.get('libelle'), parent=request.data.get('parent'),
                options=options,
            )
        except ValueError as erreur:
            return Response({'error': str(erreur)}, status=400)
        _audit(request, 'DECISION_DEMANDE_AJOUT', _detail_audit(acceptee, f"acceptée → {acceptee.entree_libelle[:60]}"))
        return Response(DemandeAjoutAdminSerializer(acceptee).data)


class AdminDemandeRattacherAPIView(_AdminDemandeBase):
    """POST : rattacher la demande à une entrée existante (le libellé devient un alias). Corps : `{entree_id}`."""

    def post(self, request, pk):
        demande = self._demande(pk)
        if demande is None:
            return Response({'error': 'Demande introuvable.'}, status=404)
        try:
            rattachee = rattacher_demande(demande, request.user, request.data.get('entree_id'))
        except ValueError as erreur:
            return Response({'error': str(erreur)}, status=400)
        _audit(request, 'DECISION_DEMANDE_AJOUT', _detail_audit(rattachee, f"rattachée à {rattachee.entree_libelle[:60]}"))
        return Response(DemandeAjoutAdminSerializer(rattachee).data)


class AdminDemandeRefuserAPIView(_AdminDemandeBase):
    """POST : refuser la demande. Corps : `{motif}` (obligatoire, visible du demandeur)."""

    def post(self, request, pk):
        demande = self._demande(pk)
        if demande is None:
            return Response({'error': 'Demande introuvable.'}, status=404)
        try:
            refusee = refuser_demande(demande, request.user, request.data.get('motif'))
        except ValueError as erreur:
            return Response({'error': str(erreur)}, status=400)
        _audit(request, 'DECISION_DEMANDE_AJOUT', _detail_audit(refusee, "refusée"))
        return Response(DemandeAjoutAdminSerializer(refusee).data)


REFUS_MASSE_MAX = 100  # demandes refusées par appel


class AdminDemandesRefuserEnMasseAPIView(APIView):
    """POST : refuse plusieurs demandes d'un coup avec le même motif. Corps `{ids: [...], motif}`.

    Chaque demande suit exactement le chemin du refus unitaire (transition vérifiée, motif conservé, notification
    du demandeur, une trace d'audit par demande). Une demande qui ne peut plus être refusée (déjà décidée) est
    signalée dans `ignorees` sans interrompre les autres. Refuser est réversible : une demande refusée peut
    encore être acceptée ou rattachée."""
    permission_classes = [IsAdminRole]

    def post(self, request):
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids:
            return Response({'error': "Sélectionnez au moins une demande."}, status=400)
        if len(ids) > REFUS_MASSE_MAX:
            return Response({'error': f"Au plus {REFUS_MASSE_MAX} demandes à la fois."}, status=400)
        try:
            ids = list(dict.fromkeys(int(i) for i in ids))
        except (TypeError, ValueError):
            return Response({'error': "Identifiants de demandes invalides."}, status=400)
        motif = request.data.get('motif')
        try:
            valider_motif(nettoyer(motif))  # avant de toucher à quoi que ce soit
        except ValueError as erreur:
            return Response({'error': str(erreur)}, status=400)

        refusees, ignorees = 0, []
        for demande in DemandeAjout.objects.filter(pk__in=ids).order_by('id'):
            try:
                refusee = refuser_demande(demande, request.user, motif)
            except ValueError as erreur:
                ignorees.append({'id': demande.id, 'libelle': demande.libelle, 'erreur': str(erreur)})
                continue
            _audit(request, 'DECISION_DEMANDE_AJOUT', _detail_audit(refusee, "refusée (en masse)"))
            refusees += 1
        return Response({'refusees': refusees, 'ignorees': ignorees, 'introuvables': len(ids) - refusees - len(ignorees)})
