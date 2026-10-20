"""Dossier complet d'un recruteur pour la fiche admin (Administration → Utilisateurs).

Entreprise, abonnement et crédits, offres, candidatures reçues, équipe, déblocages CVthèque et
usage de l'IA de toute l'entreprise. Lecture seule, un seul recruteur à la fois : appelé à
l'ouverture de la fiche, jamais pour toute la liste."""
from collections import Counter

from django.db.models import Count
from django.utils import timezone

from .credits_utils import credits_disponibles
from .models import AccesCandidatDebloque, Candidature, MembreEquipe, UtilisationIA
from .paliers_utils import get_palier_actif
from .referentiel_utils import libelle_secteur_entreprise

NB_OFFRES_RECENTES = 8


def _debut_mois():
    return timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _entreprise(e):
    return {
        'nom': e.nom_entreprise,
        'approuvee': e.est_approuvee,
        'secteur': libelle_secteur_entreprise(e.secteur_activite),
        'wilaya_siege': e.get_wilaya_siege_display(),
        'commune_siege': e.commune_siege,
        'adresse': e.adresse_complete,
        'registre_commerce': e.registre_commerce,
        'taille': e.taille_entreprise,
        'annee_creation': e.annee_creation,
        'site_web': e.site_web,
        'linkedin': e.linkedin,
        'mise_en_avant_accueil': e.mise_en_avant_accueil,
        'refus_auto': e.email_refus_auto,
    }


def _abonnement(e):
    abonnement = getattr(e, 'abonnement', None)
    palier = get_palier_actif(e)
    credits = credits_disponibles(e)
    return {
        'palier': palier.get_nom_display() if palier else 'Gratuit',
        'actif': bool(abonnement and abonnement.est_actif),
        'debut': abonnement.date_debut.isoformat() if abonnement else None,
        'expiration': abonnement.date_expiration.isoformat() if abonnement and abonnement.date_expiration else None,
        'renouvellement_auto': abonnement.renouvellement_auto if abonnement else None,
        'limite_offres': palier.limite_offres if palier else None,
        'credits_mensuels_restants': credits['mensuel_restant'],
        'credits_achetes_restants': credits['achetes_restant'],
    }


def _offres(e):
    offres = e.offres.all()
    candidatures_par_offre = dict(
        Candidature.objects.filter(offre__entreprise=e).values_list('offre').annotate(n=Count('id'))
    )
    recentes = offres.order_by('-date_publication')[:NB_OFFRES_RECENTES]
    return {
        'total': offres.count(),
        'en_ligne': offres.filter(est_active=True, statut_moderation='APPROUVEE', est_cloturee=False).count(),
        'cloturees': offres.filter(est_cloturee=True).count(),
        'par_statut': dict(Counter(o.get_statut_moderation_display() for o in offres)),
        'recentes': [
            {
                'id': o.id,
                'titre': o.titre,
                'statut': o.get_statut_moderation_display(),
                'cloturee': o.est_cloturee,
                'candidatures': candidatures_par_offre.get(o.id, 0),
                'date': o.date_publication.isoformat(),
            }
            for o in recentes
        ],
    }


def _candidatures_recues(e):
    candidatures = Candidature.objects.filter(offre__entreprise=e).order_by('-date_postulation')
    total = candidatures.count()
    return {
        'total': total,
        'par_statut': dict(Counter(c.get_statut_display() for c in candidatures)),
        'derniere_le': candidatures[0].date_postulation.isoformat() if total else None,
    }


def _equipe(e):
    return [
        {
            'nom': m.user.get_full_name() or m.user.username,
            'email': m.user.email,
            'role': m.get_role_display(),
            'ajoute_le': m.date_ajout.isoformat(),
        }
        for m in MembreEquipe.objects.filter(entreprise=e).select_related('user').order_by('date_ajout')
    ]


def _cvtheque(e):
    acces = AccesCandidatDebloque.objects.filter(entreprise=e)
    return {
        'debloques_total': acces.count(),
        'debloques_ce_mois': acces.filter(date_debloque__gte=_debut_mois()).count(),
    }


def _usage_ia_du_mois(e):
    """Usage de l'IA de toute l'entreprise (propriétaire et membres) : le quota du palier est partagé."""
    ids = [e.user_id, *MembreEquipe.objects.filter(entreprise=e).values_list('user_id', flat=True)]
    lignes = UtilisationIA.objects.filter(user_id__in=ids, date_heure__gte=_debut_mois()).exclude(statut='REMBOURSE')
    par_fonction = {}
    for ligne in lignes:
        bloc = par_fonction.setdefault(ligne.fonction, {'libelle': ligne.get_fonction_display(), 'appels': 0, 'tokens': 0})
        bloc['appels'] += 1
        bloc['tokens'] += ligne.tokens_entree + ligne.tokens_sortie
    return list(par_fonction.values())


def dossier_recruteur(user, entreprise):
    return {
        'compte': {
            'derniere_connexion': user.last_login.isoformat() if user.last_login else None,
            'inscrit_le': user.date_joined.isoformat(),
            'est_actif': user.is_active,
        },
        'entreprise': _entreprise(entreprise),
        'abonnement': _abonnement(entreprise),
        'offres': _offres(entreprise),
        'candidatures_recues': _candidatures_recues(entreprise),
        'equipe': _equipe(entreprise),
        'cvtheque': _cvtheque(entreprise),
        'ia_mois': _usage_ia_du_mois(entreprise),
    }
