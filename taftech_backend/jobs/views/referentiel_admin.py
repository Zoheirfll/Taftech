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

import uuid

from ..models import Metier, SpecialiteFormation, TypeDiplome, RelationMetier, RelationSpecialite, FormationCandidat
from ..referentiel_utils import normaliser_recherche
from ..serializers.referentiel_admin import (
    AdminMetierSerializer, AdminSpecialiteFormationSerializer, AdminTypeDiplomeSerializer,
    AdminRelationSimilaireSerializer, AdminRelationSpecialiteSerializer,
    AdminFormationAVerifierSerializer,
)


def _paginer(queryset, serializer_class, request, champ_recherche='libelle'):
    search = request.query_params.get('search', '')
    if search:
        # `cle_recherche` est déjà normalisé côté import (accents retirés) — la requête
        # tapée par l'admin doit donc l'être aussi, sinon "développeur" (avec accents,
        # la saisie la plus naturelle) ne matche plus rien. `libelle` garde ses accents,
        # pas besoin de normaliser dans ce cas.
        mots = normaliser_recherche(search).split() if champ_recherche == 'cle_recherche' else search.strip().split()
        q = Q()
        for mot in mots:
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


class AdminFormationsAVerifierAPIView(APIView):
    """Formations candidat en attente de vérification (flux "Autre, préciser", retour client
    26/09/2026) — liste celles où `statut_validation='A_PRECISER'` (aucun diplome_ref résolu
    de façon fiable, ni par recherche mots-clés ni par confirmation candidat) et permet à
    l'admin d'attribuer un `diplome_ref`/`specialite_ref` réel. Dès qu'un `diplome_ref` est
    posé, `FormationCandidat.save()` bascule automatiquement `statut_validation` vers
    `DECLARE` — la formation sort d'elle-même de cette liste, aucune action manuelle en plus."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        formations = (
            FormationCandidat.objects.filter(statut_validation='A_PRECISER')
            .select_related('profil__user', 'diplome_ref', 'specialite_ref')
            .order_by('-id')
        )
        return _paginer(formations, AdminFormationAVerifierSerializer, request, champ_recherche='diplome')

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            formation = FormationCandidat.objects.select_related('profil__user').get(pk=pk)
        except FormationCandidat.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = AdminFormationAVerifierSerializer(formation, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            if formation.statut_validation == 'DECLARE':
                from ..models import Notification
                Notification.objects.create(
                    destinataire=formation.profil.user,
                    type_notif='INFO',
                    titre="Formation validée",
                    message=(
                        f"Votre formation \"{formation.diplome}\" a été vérifiée et rattachée au "
                        f"référentiel ({formation.diplome_ref.libelle if formation.diplome_ref_id else ''}"
                        f"{' — ' + formation.specialite_ref.libelle if formation.specialite_ref_id else ''}) — "
                        "elle est désormais correctement prise en compte dans le calcul de vos scores de matching."
                    ),
                    lien='/profil',
                )
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        """"Refuser" une formation en attente — utilisé quand l'intitulé déclaré ne
        correspond à rien de vérifiable (spam, texte incompréhensible...) plutôt que de la
        laisser indéfiniment dans la file d'attente. Le candidat est notifié pour pouvoir la
        re-déclarer avec un intitulé plus précis — pas une sanction silencieuse."""
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            formation = FormationCandidat.objects.select_related('profil__user').get(pk=pk)
        except FormationCandidat.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        motif = (request.data.get('motif') or '').strip()
        from ..models import Notification
        message = (
            f"Votre formation \"{formation.diplome}\" n'a pas pu être rattachée à un diplôme "
            "reconnu de notre référentiel et a été retirée de votre profil."
        )
        if motif:
            message += f" Motif indiqué par l'administrateur : {motif}."
        message += (
            " Vous pouvez la redéclarer avec un intitulé plus précis (type de diplôme officiel, "
            "ex: \"Licence\", \"BTS\", \"Master\")."
        )
        Notification.objects.create(
            destinataire=formation.profil.user,
            type_notif='INFO',
            titre="Formation non validée",
            message=message,
            lien='/profil',
        )
        formation.delete()
        return Response(status=204)


class AdminRelationsSimilaireAPIView(APIView):
    """CRUD des relations 'similaire' (matcher.py::_relation_similaire, session 24/09/2026) —
    seul type de RelationMetier créé/supprimé depuis l'admin. Les 49 relations importées du
    client (redirection_equivalente/plus_precis_que) ne sont ni listées ni modifiables ici :
    ce endpoint filtre toujours `relation='similaire'`, jamais les autres types."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        relations = RelationMetier.objects.filter(relation='similaire').select_related(
            'metier_depart', 'metier_arrivee').order_by('-id')
        search = request.query_params.get('search', '').strip()
        if search:
            # Recherche OR sur les deux métiers (pas le pattern AND mono-champ de `_paginer`,
            # inadapté ici — une relation a deux libellés, pas un seul champ `libelle`).
            mots = search.split()
            q = Q()
            for mot in mots:
                q &= (Q(metier_depart__libelle__icontains=mot) | Q(metier_arrivee__libelle__icontains=mot))
            relations = relations.filter(q)
        page = int(request.query_params.get('page', 1))
        paginator = Paginator(relations, 30)
        page_obj = paginator.get_page(page)
        return Response({
            'results': AdminRelationSimilaireSerializer(page_obj.object_list, many=True).data,
            'count': paginator.count,
            'total_pages': paginator.num_pages,
        })

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = AdminRelationSimilaireSerializer(data=request.data)
        if serializer.is_valid():
            # `code` est unique et sert d'identifiant stable pour le réimport client — une
            # relation créée ici n'a pas d'équivalent dans le fichier Excel, on lui génère
            # un code interne dédié (préfixe TAF-SIM- pour ne jamais entrer en collision avec
            # un `relation_id` du référentiel importé).
            serializer.save(relation='similaire', active_recherche=True, code=f"TAF-SIM-{uuid.uuid4().hex[:12]}")
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            relation = RelationMetier.objects.get(pk=pk, relation='similaire')
        except RelationMetier.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        relation.delete()
        return Response(status=204)


class AdminRelationsSpecialiteAPIView(APIView):
    """CRUD des relations 'similaire' entre spécialités de formation (matcher.py::
    _specialite_relation_similaire, session 25/09/2026) — même pattern que
    AdminRelationsSimilaireAPIView, pour le référentiel Diplômes (SpecialiteFormation)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        relations = RelationSpecialite.objects.select_related(
            'specialite_depart', 'specialite_arrivee',
            'specialite_depart__domaine', 'specialite_arrivee__domaine',
        ).order_by('-id')
        search = request.query_params.get('search', '').strip()
        if search:
            mots = search.split()
            q = Q()
            for mot in mots:
                q &= (Q(specialite_depart__libelle__icontains=mot) | Q(specialite_arrivee__libelle__icontains=mot))
            relations = relations.filter(q)
        page = int(request.query_params.get('page', 1))
        paginator = Paginator(relations, 30)
        page_obj = paginator.get_page(page)
        return Response({
            'results': AdminRelationSpecialiteSerializer(page_obj.object_list, many=True).data,
            'count': paginator.count,
            'total_pages': paginator.num_pages,
        })

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = AdminRelationSpecialiteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(active_recherche=True)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            relation = RelationSpecialite.objects.get(pk=pk)
        except RelationSpecialite.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        relation.delete()
        return Response(status=204)
