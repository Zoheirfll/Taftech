"""Qualité IA : journal de parsing CV, corrections des candidats, suivi du matching.

Sert à améliorer le parser et le matching au fil de l'eau (session 29/09/2026). Aucune donnée
personnelle du CV n'est stockée : uniquement des compteurs et des paires (proposé -> corrigé)
portant sur des intitulés de poste/diplôme."""
import uuid
from datetime import timedelta

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncWeek
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Appellation, AuditLog, Candidature, CorrectionParsing, Metier, ParsingCV
from ..permissions import IsAdminRole
from ..referentiel_utils import normaliser_recherche
from ..throttles import WriteActionThrottle
from .admin import _get_client_ip

MAX_CORRECTIONS_PAR_ENVOI = 30
NB_ANALYSES_RECENTES_MAX = 200  # le tableau « analyses récentes » est paginé côté écran
TYPES_CORRECTION = {code for code, _ in CorrectionParsing.TYPES}


def _pct(a, b):
    return round(100 * a / b, 1) if b else 0.0


def _entier_ou_none(v):
    try:
        return int(v) if v is not None and v != "" else None
    except (TypeError, ValueError):
        return None


class EnregistrerCorrectionsParsingAPIView(APIView):
    """POST jobs/parsing/<id>/corrections/ — appelé par le frontend quand le candidat valide
    l'assistant : uniquement les champs pré-remplis par le parser qu'il a modifiés."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [WriteActionThrottle]

    def post(self, request, parsing_id):
        parsing = ParsingCV.objects.filter(pk=parsing_id, user=request.user).first()
        if not parsing:
            return Response({'error': 'Analyse introuvable.'}, status=404)
        brut = request.data.get('corrections')
        if not isinstance(brut, list):
            return Response({'error': "Champ 'corrections' (liste) requis."}, status=400)

        deja = set(parsing.corrections.values_list('type_correction', 'texte_source', 'propose_id', 'corrige_id'))
        crees = 0
        for item in brut[:MAX_CORRECTIONS_PAR_ENVOI]:
            if not isinstance(item, dict) or item.get('type_correction') not in TYPES_CORRECTION:
                continue
            propose_id = _entier_ou_none(item.get('propose_id'))
            corrige_id = _entier_ou_none(item.get('corrige_id'))
            if propose_id == corrige_id:
                continue  # rien n'a été corrigé
            texte = str(item.get('texte_source') or '')[:200]
            cle = (item['type_correction'], texte, propose_id, corrige_id)
            if cle in deja:
                continue
            deja.add(cle)
            CorrectionParsing.objects.create(
                parsing=parsing,
                type_correction=item['type_correction'],
                texte_source=texte,
                propose_id=propose_id,
                propose_libelle=str(item.get('propose_libelle') or '')[:250],
                corrige_id=corrige_id,
                corrige_libelle=str(item.get('corrige_libelle') or '')[:250],
            )
            crees += 1
        return Response({'enregistrees': crees}, status=201)


class AdminQualiteIAParserAPIView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        try:
            jours = max(1, min(int(request.query_params.get('jours', 30)), 365))
        except ValueError:
            jours = 30
        depuis = timezone.now() - timedelta(days=jours)
        qs = ParsingCV.objects.filter(date__gte=depuis)
        total = qs.count()
        reussis = qs.filter(succes=True)
        nb_reussis = reussis.count()

        somme = reussis.aggregate(
            exp=Sum('nb_experiences'), ia=Sum('nb_exp_metier_ia'), repli=Sum('nb_exp_metier_repli'),
            aucun=Sum('nb_exp_sans_metier'), form=Sum('nb_formations'), sans_dipl=Sum('nb_formations_sans_diplome_ref'),
            duree=Avg('duree_ms'),
        )
        exp = somme['exp'] or 0
        form = somme['form'] or 0

        champs = {}
        for liste in reussis.values_list('champs_vides', flat=True):
            for c in liste or []:
                champs[c] = champs.get(c, 0) + 1

        par_semaine = [
            {'semaine': r['semaine'].date().isoformat(), 'total': r['total'], 'reussis': r['reussis']}
            for r in qs.annotate(semaine=TruncWeek('date')).values('semaine')
            .annotate(total=Count('id'), reussis=Count('id', filter=Q(succes=True))).order_by('semaine')
        ]
        recents = [
            {
                'id': p.id, 'date': p.date.isoformat(), 'succes': p.succes, 'code_erreur': p.code_erreur,
                'duree_ms': p.duree_ms, 'version': p.version_parser, 'extension': p.extension,
                'nb_experiences': p.nb_experiences, 'nb_formations': p.nb_formations,
                'nb_competences': p.nb_competences, 'exp_sans_metier': p.nb_exp_sans_metier,
                'exp_repli': p.nb_exp_metier_repli, 'source_competences': p.source_competences,
            }
            for p in qs[:NB_ANALYSES_RECENTES_MAX]
        ]
        return Response({
            'jours': jours,
            'total': total,
            'taux_reussite': _pct(nb_reussis, total),
            'duree_moyenne_ms': int(somme['duree'] or 0),
            'erreurs': list(qs.filter(succes=False).values('code_erreur').annotate(n=Count('id')).order_by('-n')),
            'pct_exp_metier_ia': _pct(somme['ia'] or 0, exp),
            'pct_exp_metier_repli': _pct(somme['repli'] or 0, exp),
            'pct_exp_sans_metier': _pct(somme['aucun'] or 0, exp),
            'pct_formations_sans_diplome': _pct(somme['sans_dipl'] or 0, form),
            'competences_source': list(reussis.exclude(source_competences='').values('source_competences').annotate(n=Count('id'))),
            'champs_vides': sorted(({'champ': k, 'n': v} for k, v in champs.items()), key=lambda x: -x['n']),
            'par_semaine': par_semaine,
            'par_version': list(qs.exclude(version_parser='').values('version_parser').annotate(
                n=Count('id'), reussis=Count('id', filter=Q(succes=True))).order_by('-version_parser')),
            'recents': recents,
        })


class AdminQualiteIACorrectionsAPIView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = CorrectionParsing.objects.all()
        type_correction = request.query_params.get('type')
        if type_correction in TYPES_CORRECTION:
            qs = qs.filter(type_correction=type_correction)
        lignes = (
            qs.values('type_correction', 'texte_source', 'propose_id', 'propose_libelle', 'corrige_id', 'corrige_libelle')
            .annotate(n=Count('id')).order_by('-n', 'texte_source')[:100]
        )
        return Response({'total': qs.count(), 'resultats': list(lignes)})


class AdminQualiteIACreerAppellationAPIView(APIView):
    """POST : transforme une correction fréquente en appellation du référentiel — le prochain CV
    dont le poste s'écrit ainsi sera rattaché directement au bon métier."""
    permission_classes = [IsAdminRole]

    def post(self, request):
        texte = str(request.data.get('texte_source') or '').strip()[:200]
        metier = Metier.objects.filter(pk=_entier_ou_none(request.data.get('metier_id'))).first()
        if not texte or not metier:
            return Response({'error': 'Intitulé et métier requis.'}, status=400)
        cle = normaliser_recherche(texte)
        if not cle:
            return Response({'error': 'Intitulé invalide.'}, status=400)
        if Appellation.objects.filter(metier=metier, cle_recherche=cle).exists():
            return Response({'error': 'Cette appellation existe déjà pour ce métier.'}, status=409)
        appellation = Appellation.objects.create(
            code=f"COR-{uuid.uuid4().hex[:12]}", metier=metier, libelle=texte, cle_recherche=cle,
            type_alias='correction_candidat',
        )
        AuditLog.objects.create(
            admin=request.user, action='AUTRE', ip=_get_client_ip(request),
            detail=f"Appellation « {texte} » ajoutée au métier « {metier.libelle} » (depuis les corrections des candidats)",
        )
        return Response({'id': appellation.id, 'libelle': appellation.libelle}, status=201)


class AdminQualiteIAMatchingAPIView(APIView):
    """Le score prédit-il les décisions des recruteurs ? Candidatures scorées (hors candidature
    rapide) regroupées par tranche de score, avec leur devenir."""
    permission_classes = [IsAdminRole]

    TRANCHES = [(0, 40), (40, 60), (60, 80), (80, 101)]

    def get(self, request):
        base = Candidature.objects.filter(est_rapide=False, score_matching__isnull=False)
        tranches = []
        for bas, haut in self.TRANCHES:
            c = base.filter(score_matching__gte=bas, score_matching__lt=haut)
            total = c.count()
            n = lambda statuts: c.filter(statut__in=statuts).count()
            tranches.append({
                'tranche': f"{bas}-{min(haut, 100)}%",
                'total': total,
                'pct_preselection_ou_plus': _pct(n(['PRESELECTION', 'ENTRETIEN', 'RETENU']), total),
                'pct_entretien_ou_plus': _pct(n(['ENTRETIEN', 'RETENU']), total),
                'pct_retenu': _pct(n(['RETENU']), total),
                'pct_refuse': _pct(n(['REFUSE']), total),
                'pct_non_traite': _pct(n(['RECUE']), total),
            })
        limite = timezone.now() - timedelta(days=14)
        forts = base.filter(score_matching__gte=80)
        return Response({
            'total_scorees': base.count(),
            'tranches': tranches,
            'forts_scores_refuses': forts.filter(statut='REFUSE').count(),
            'forts_scores_non_traites_14j': forts.filter(statut='RECUE', date_postulation__lt=limite).count(),
            'avertissement': "Peu de décisions de recruteurs = statistiques peu fiables : à lire comme une tendance, pas une preuve.",
        })
