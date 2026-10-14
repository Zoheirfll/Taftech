from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models import Count, Q
from ..models import AuditLog, FaqItem, CompetenceReferentiel
from ..serializers import FaqItemSerializer, CompetenceReferentielSerializer, CompetenceReferentielAdminSerializer
from ..throttles import PublicReadThrottle

# NOTE (27/08/2026) : les vues PremiumPlansPublicAPIView/PremiumAvantagesPublicAPIView/
# PremiumPlansAdminAPIView/PremiumAvantagesAdminAPIView ont été supprimées de ce fichier —
# le système Premium legacy (PremiumPlan/PremiumAvantage) est retiré au profit du seul
# système Palier/AbonnementEntreprise (voir jobs/views/paliers_admin.py). Ce fichier ne
# garde que la FAQ et le référentiel de compétences (sans rapport avec Premium), pas
# renommé pour limiter le diff.
CACHE_FAQ = 'jobs_faq_'  # + catégorie


class FaqPublicAPIView(APIView):
    """FAQ actives d'une catégorie (?categorie=GENERAL|RECRUTEUR|PREMIUM) — pour ContactezNous,
    LandingRecruteur, PremiumPage."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        categorie = request.query_params.get('categorie', 'GENERAL')
        cache_key = CACHE_FAQ + categorie
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        items = FaqItem.objects.filter(categorie=categorie, actif=True)
        data = FaqItemSerializer(items, many=True).data
        cache.set(cache_key, data, timeout=3600)
        return Response(data)


class FaqAdminAPIView(APIView):
    """CRUD admin des FAQ, toutes catégories confondues — filtrage côté frontend."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        items = FaqItem.objects.all()
        return Response(FaqItemSerializer(items, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = FaqItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_FAQ + serializer.validated_data['categorie'])
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            item = FaqItem.objects.get(pk=pk)
        except FaqItem.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        ancienne_categorie = item.categorie
        serializer = FaqItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            cache.delete(CACHE_FAQ + ancienne_categorie)
            cache.delete(CACHE_FAQ + item.categorie)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            item = FaqItem.objects.get(pk=pk)
            categorie = item.categorie
            item.delete()
            cache.delete(CACHE_FAQ + categorie)
            return Response({'message': 'Supprimé.'})
        except FaqItem.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class CompetencesAutocompleteAPIView(APIView):
    """Suggestions de compétences actives (?search=xxx) — le champ reste du texte libre côté
    candidat/offre, ceci ne fait que suggérer. Pas de cache (dépend de la recherche), mais requête
    simple sur un référentiel de taille modeste."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        qs = CompetenceReferentiel.objects.filter(actif=True)
        if search:
            # ALIAS_COMPETENCES (référentiel v2) : un synonyme/sigle (ETL, IAM, CI/CD...) doit
            # retrouver la compétence canonique, pas seulement une saisie du libellé complet.
            qs = qs.filter(Q(label__icontains=search) | Q(synonymes__icontains=search))
        return Response(CompetenceReferentielSerializer(qs[:15], many=True).data)


class CompetencesAdminAPIView(APIView):
    """CRUD admin du référentiel de compétences — même pattern que MetierReferentielAdminAPIView.
    Pagination ajoutée (retour utilisateur 26/09/2026) : la liste renvoyait TOUTES les
    entrées d'un coup (déjà des dizaines en base, appelée à grossir), contrairement aux
    autres panels admin (référentiel v2, formations à vérifier...) déjà paginés."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        search = request.query_params.get('search', '').strip()
        statut = request.query_params.get('statut', '').strip()
        qs = CompetenceReferentiel.objects.select_related('traite_par').order_by('label')
        if search:
            qs = qs.filter(label__icontains=search)
        if statut in dict(CompetenceReferentiel.STATUT_CHOICES):
            qs = qs.filter(statut=statut)
        page = int(request.query_params.get('page', 1))
        paginator = Paginator(qs, 30)
        page_obj = paginator.get_page(page)
        compteurs = {code: 0 for code, _ in CompetenceReferentiel.STATUT_CHOICES}
        for ligne in CompetenceReferentiel.objects.values('statut').annotate(n=Count('id')):
            compteurs[ligne['statut']] = ligne['n']
        return Response({
            'results': CompetenceReferentielAdminSerializer(page_obj.object_list, many=True).data,
            'count': paginator.count,
            'total_pages': paginator.num_pages,
            'compteurs': compteurs,
        })

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = CompetenceReferentielAdminSerializer(data=request.data)
        if serializer.is_valid():
            # Créée par l'admin = décision explicite : officielle d'emblée (statut VALIDÉE).
            serializer.save(origine='ADMIN')
            # Les compétences déjà saisies (offres, candidats) qui correspondent à cette nouvelle
            # entrée ou à ses synonymes y sont rattachées : score comparable (point 10).
            from ..referentiel_utils import rattacher_competences_orphelines
            rattacher_competences_orphelines()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            item = CompetenceReferentiel.objects.get(pk=pk)
        except CompetenceReferentiel.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = CompetenceReferentielAdminSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            from ..referentiel_utils import rattacher_competences_orphelines
            rattacher_competences_orphelines()  # nouveaux synonymes éventuels (point 10)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            CompetenceReferentiel.objects.get(pk=pk).delete()
            return Response({'message': 'Supprimé.'})
        except CompetenceReferentiel.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class CompetenceStatutAdminAPIView(APIView):
    """PATCH admin/competences/<pk>/statut/ {statut} — seul chemin de changement de statut d'une
    compétence du référentiel (point 11) : transitions contrôlées (Suggérée -> Validée | Rejetée ;
    Validée <-> Désactivée ; Rejetée -> Validée), tracées au journal d'audit. Valider rend la
    compétence officielle ET rattache les saisies existantes (offres, candidats) qui lui
    correspondent ; rejeter/désactiver ne supprime rien."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            competence = CompetenceReferentiel.objects.get(pk=pk)
        except CompetenceReferentiel.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        nouveau = request.data.get('statut')
        if nouveau not in dict(CompetenceReferentiel.STATUT_CHOICES):
            return Response({'error': 'Statut inconnu.'}, status=400)
        ancien = competence.statut
        try:
            competence.changer_statut(nouveau, utilisateur=request.user)
        except ValueError:
            return Response({'error': f"Changement impossible : {competence.get_statut_display()} -> "
                                      f"{dict(CompetenceReferentiel.STATUT_CHOICES)[nouveau]}."}, status=400)
        liens = 0
        if nouveau == CompetenceReferentiel.STATUT_VALIDEE:
            from ..referentiel_utils import rattacher_competences_orphelines
            liens = rattacher_competences_orphelines()
        AuditLog.objects.create(
            admin=request.user, action='STATUT_COMPETENCE',
            detail=f"Compétence « {competence.label[:120]} » : {ancien} → {nouveau}"[:255],
        )
        competence.refresh_from_db()
        donnees = CompetenceReferentielAdminSerializer(competence).data
        donnees['liens_crees'] = liens
        return Response(donnees)


class CompetencePropositionsAdminAPIView(APIView):
    """POST admin/competences/proposer/ {seuil?, simuler?} — détecte les compétences saisies hors
    référentiel par plusieurs candidats/offres et les enregistre SUGGÉRÉES (jamais officielles)."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        from ..referentiel_utils import SEUIL_PROPOSITION_COMPETENCE, proposer_competences_frequentes
        try:
            seuil = max(int(request.data.get('seuil', SEUIL_PROPOSITION_COMPETENCE)), 2)
        except (TypeError, ValueError):
            seuil = SEUIL_PROPOSITION_COMPETENCE
        simuler = bool(request.data.get('simuler', False))
        propositions = proposer_competences_frequentes(seuil=seuil, simuler=simuler)
        return Response({'propositions': propositions, 'nb': len(propositions), 'seuil': seuil, 'simulation': simuler})
