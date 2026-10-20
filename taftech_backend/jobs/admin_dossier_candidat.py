"""Dossier complet d'un candidat pour la fiche admin (Administration → Utilisateurs).

Rassemble ce que la liste des utilisateurs ne charge pas (niveaux de compétences et de langues,
activité, candidatures, usage de l'IA). Lecture seule, un seul candidat à la fois : appelé à
l'ouverture de la fiche, jamais pour toute la liste."""
from collections import Counter

from django.utils import timezone

from .models import (
    AlerteEmploi, Candidature, CompetenceCandidat, DocumentCandidat, OffreSauvegardee, RendezVous,
    UtilisationIA,
)
from .profile_score import calculer_score_profil

NB_CANDIDATURES_RECENTES = 8


def _langues(texte):
    """« Arabe:Maternelle, Anglais:Avancé » → [{'langue': 'Arabe', 'niveau': 'Maternelle'}, …]."""
    resultat = []
    for morceau in (texte or '').split(','):
        morceau = morceau.strip()
        if not morceau:
            continue
        langue, _, niveau = morceau.partition(':')
        resultat.append({'langue': langue.strip(), 'niveau': niveau.strip()})
    return resultat


def _competences(profil):
    lignes = sorted(
        profil.competences_detail.all(),
        key=lambda c: (-CompetenceCandidat.NIVEAU_POINTS.get(c.niveau, 0), c.label.lower()),
    )
    return [
        {'label': c.label, 'niveau': c.niveau, 'niveau_libelle': c.get_niveau_display(), 'source': c.source}
        for c in lignes
    ]


def _candidatures(user):
    candidatures = Candidature.objects.filter(candidat=user).select_related('offre__entreprise').order_by('-date_postulation')
    total = candidatures.count()
    statuts = Counter(c.get_statut_display() for c in candidatures)
    scores = [c.score_matching for c in candidatures if c.score_matching is not None]
    return {
        'total': total,
        'par_statut': dict(statuts),
        'score_moyen': round(sum(scores) / len(scores)) if scores else None,
        'derniere_le': candidatures[0].date_postulation.isoformat() if total else None,
        'recentes': [
            {
                'id': c.id,
                'offre': c.offre.titre,
                'entreprise': c.offre.entreprise.nom_entreprise,
                'statut': c.get_statut_display(),
                'score': c.score_matching,
                'date': c.date_postulation.isoformat(),
            }
            for c in candidatures[:NB_CANDIDATURES_RECENTES]
        ],
    }


def _activite(user, profil):
    maintenant = timezone.now()
    rendez_vous = RendezVous.objects.filter(candidat=user)
    alertes = AlerteEmploi.objects.filter(candidat=user)
    return {
        'offres_sauvegardees': OffreSauvegardee.objects.filter(candidat=user).count(),
        'alertes_total': alertes.count(),
        'alertes_actives': alertes.filter(est_active=True).count(),
        'documents': DocumentCandidat.objects.filter(profil=profil).count(),
        'rendez_vous_total': rendez_vous.count(),
        'rendez_vous_a_venir': rendez_vous.filter(date_heure__gte=maintenant, statut='CONFIRME').count(),
    }


def _usage_ia_du_mois(user):
    debut = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    lignes = UtilisationIA.objects.filter(user=user, date_heure__gte=debut).exclude(statut='REMBOURSE')
    par_fonction = {}
    for ligne in lignes:
        bloc = par_fonction.setdefault(ligne.fonction, {'libelle': ligne.get_fonction_display(), 'appels': 0, 'tokens': 0})
        bloc['appels'] += 1
        bloc['tokens'] += ligne.tokens_entree + ligne.tokens_sortie
    return list(par_fonction.values())


def dossier_candidat(user, profil):
    return {
        'compte': {
            'derniere_connexion': user.last_login.isoformat() if user.last_login else None,
            'inscrit_le': user.date_joined.isoformat(),
            'est_actif': user.is_active,
        },
        'identite': {
            'sexe': profil.get_sexe_display() if profil.sexe else None,
            'date_naissance': user.date_naissance.isoformat() if user.date_naissance else None,
            'bio': profil.bio or None,
            'linkedin': profil.linkedin or None,
            'github': profil.github or None,
            'vehicule_personnel': profil.vehicule_personnel,
            'visible_cvtheque': profil.visible_cvtheque,
            'cv_maj_le': profil.cv_pdf_maj_le.isoformat() if profil.cv_pdf_maj_le else None,
        },
        'score_profil': calculer_score_profil(user).get('total'),
        'competences': _competences(profil),
        'langues': _langues(profil.langues),
        'candidatures': _candidatures(user),
        'activite': _activite(user, profil),
        'ia_mois': _usage_ia_du_mois(user),
    }
