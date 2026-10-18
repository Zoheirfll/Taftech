"""Indicateurs de recrutement : entonnoir, offres sans candidature, qualité du matching.

L'entonnoir se calcule sur le statut ACTUEL des candidatures déposées dans la période : il n'y a
pas d'historique des changements de statut (un candidat présélectionné puis refusé n'est plus
compté comme présélectionné). Cette limite est affichée dans l'écran.
"""
from django.db.models import Avg, Count
from django.utils import timezone

from ..models import Candidature, OffreEmploi
from .periode import restreindre

# (clé, libellé, statuts qui comptent dans l'étape — chaque étape inclut celles d'après)
ETAPES_ENTONNOIR = [
    ('deposees', 'Candidatures déposées', None),
    ('examinees', 'Examinées', ('EN_COURS', 'PRESELECTION', 'ENTRETIEN', 'RETENU')),
    ('preselectionnees', 'Présélectionnées', ('PRESELECTION', 'ENTRETIEN', 'RETENU')),
    ('entretiens', 'Entretiens', ('ENTRETIEN', 'RETENU')),
    ('retenues', 'Retenues', ('RETENU',)),
]

TRANCHES_MATCHING = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 101)]


def calculer_entonnoir(debut, fin, entreprise_id=None):
    base = restreindre(
        Candidature.objects.filter(date_postulation__date__range=[debut, fin]),
        'offre__entreprise_id', entreprise_id)
    par_statut = dict(base.values_list('statut').annotate(n=Count('id')).order_by('statut'))
    total = sum(par_statut.values())
    etapes, precedente = [], None
    for cle, libelle, statuts in ETAPES_ENTONNOIR:
        nb = total if statuts is None else sum(par_statut.get(s, 0) for s in statuts)
        etapes.append({
            'cle': cle,
            'libelle': libelle,
            'nb': nb,
            'pct_du_total': round(nb / total * 100, 1) if total else 0.0,
            'taux_passage': round(nb / precedente * 100, 1) if precedente else None,
        })
        precedente = nb
    return {'etapes': etapes, 'refusees': par_statut.get('REFUSE', 0)}


def calculer_offres(debut, fin, entreprise_id=None):
    aujourdhui = timezone.localdate()
    offres = restreindre(
        OffreEmploi.objects.filter(
            statut_moderation='APPROUVEE', date_publication__date__range=[debut, fin]),
        'entreprise_id', entreprise_id,
    ).annotate(nb_candidatures=Count('candidatures'))
    sans_candidature = offres.filter(nb_candidatures=0)
    moyenne = offres.aggregate(m=Avg('nb_candidatures'))['m']
    return {
        'offres_approuvees': offres.count(),
        'sans_candidature': sans_candidature.count(),
        'expirees_sans_candidature': sans_candidature.filter(date_expiration__lt=aujourdhui).count(),
        'candidatures_par_offre': round(float(moyenne), 1) if moyenne is not None else None,
    }


def calculer_matching(debut, fin, entreprise_id=None):
    base = restreindre(
        Candidature.objects.filter(
            date_postulation__date__range=[debut, fin], score_matching__isnull=False),
        'offre__entreprise_id', entreprise_id)
    distribution = [
        {
            'tranche': f"{bas}-{min(haut, 100)}",
            'nb': base.filter(score_matching__gte=bas, score_matching__lt=haut).count(),
        }
        for bas, haut in TRANCHES_MATCHING
    ]
    moyenne = base.aggregate(m=Avg('score_matching'))['m']
    return {
        'moyenne': round(float(moyenne), 1) if moyenne is not None else None,
        'distribution': distribution,
    }
