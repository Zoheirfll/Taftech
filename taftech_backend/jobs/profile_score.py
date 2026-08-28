"""Score de profil composite candidat (/100) — dashboard candidat (session
specs/important-features, mockup employeur). Contrairement au score de matching
(`matcher.py`, spécifique à une offre), celui-ci mesure la solidité générale du profil :
complétude + diplôme + expérience + langues + pertinence marché. Volontairement PAS généré
par l'IA (peu fiable pour s'auto-noter sur une échelle arbitraire) — calcul déterministe
à partir de données réelles, toujours reproductible."""
from .constants import DIPLOMES_CHOICES

POINTS_DIPLOME = {
    'NIVEAU_SECONDAIRE': 4, 'NIVEAU_TERMINAL': 4, 'UNIVERSITAIRE_SANS_DIPLOME': 4,
    'BACCALAUREAT': 8,
    'TS': 10,
    'LICENCE': 12,
    'MASTER_1': 15,
    'MASTER_2': 18, 'MAGISTERE': 18,
    'DOCTORAT': 20,
    'NON_DIPLOMANTE': 6, 'FORMATION_PRO': 6, 'CERTIFICATION': 6,
}

POINTS_NIVEAU_LANGUE = {'Débutant': 1, 'Intermédiaire': 2, 'Avancé': 3, 'Bilingue / Maternelle': 4}

CHAMPS_PROFIL = [
    ('telephone', lambda p: bool(p.user.telephone)),
    ('photo_profil', lambda p: bool(p.photo_profil)),
    ('cv_pdf', lambda p: bool(p.cv_pdf)),
    ('titre_professionnel', lambda p: bool(p.titre_professionnel)),
    ('wilaya_commune', lambda p: bool(p.wilaya and p.commune)),
    ('diplome', lambda p: bool(p.diplome)),
    ('specialite', lambda p: bool(p.specialite)),
    ('experiences', lambda p: p.experiences_detail.exists()),
    ('formations', lambda p: p.formations_detail.exists()),
    ('competences', lambda p: bool(p.competences and p.competences.strip())),
    ('langues', lambda p: bool(p.langues and p.langues.strip())),
]


def calculer_completude(profil):
    """% de complétude (0-100) — même 11 critères que le frontend (CandidatDashboard.jsx),
    dupliqué ici car le score composite doit être calculable côté serveur."""
    valides = sum(1 for _, test in CHAMPS_PROFIL if test(profil))
    return round(valides / len(CHAMPS_PROFIL) * 100)


def _annees_experience_totales(profil):
    from .matcher import _annees_experience, _deduire_annees_sans_chevauchement
    periodes = []
    for exp in profil.experiences_detail.all():
        annees, debut, fin = _annees_experience(exp)
        if debut and fin:
            periodes.append((debut, fin, 1.0))
    return _deduire_annees_sans_chevauchement(periodes)


def _score_langues(profil):
    """langues stocké au format "Nom:Niveau, Nom:Niveau" — moyenne des niveaux déclarés."""
    if not profil.langues:
        return 0.0
    niveaux = []
    for item in profil.langues.split(','):
        item = item.strip()
        if ':' not in item:
            continue
        _, niveau = item.split(':', 1)
        niveau = niveau.strip()
        if niveau in POINTS_NIVEAU_LANGUE:
            niveaux.append(POINTS_NIVEAU_LANGUE[niveau])
    if not niveaux:
        return 0.0
    return sum(niveaux) / len(niveaux)


def _score_pertinence_marche(candidat_user):
    """Moyenne du score de matching sur toutes les offres actives — partage le même cache
    que OffresRecommandeesAPIView (jobs/matching_cache.py) au lieu de rescorer tout le
    catalogue une 2e fois à chaque chargement du dashboard."""
    from .matching_cache import scores_offres_actives_pour_candidat
    scores = scores_offres_actives_pour_candidat(candidat_user)
    if not scores:
        return None
    totaux = [total for _, total in scores]
    return sum(totaux) / len(totaux)


def calculer_score_profil(candidat_user):
    """Retourne {'total': int, 'details': {...}} — 5 composantes sur 100 :
    complétude 25 + diplôme 20 + expérience 20 + langues 15 + pertinence marché 20."""
    profil = candidat_user.profil_candidat

    completude_pct = calculer_completude(profil)
    pts_completude = completude_pct / 100 * 25

    pts_diplome = POINTS_DIPLOME.get(profil.diplome, 0)

    annees = _annees_experience_totales(profil)
    pts_experience = min(annees, 10) * 2

    niveau_langue_moy = _score_langues(profil)
    pts_langues = niveau_langue_moy / 4 * 15

    pertinence = _score_pertinence_marche(candidat_user)
    pts_marche = (pertinence / 100 * 20) if pertinence is not None else 0

    total = round(pts_completude + pts_diplome + pts_experience + pts_langues + pts_marche)

    return {
        'total': min(100, total),
        'details': {
            'completude': {'points': round(pts_completude, 1), 'max': 25, 'pct': completude_pct},
            'diplome': {'points': pts_diplome, 'max': 20, 'libelle': dict(DIPLOMES_CHOICES).get(profil.diplome, 'Non renseigné')},
            'experience': {'points': round(pts_experience, 1), 'max': 20, 'annees': round(annees, 1)},
            'langues': {'points': round(pts_langues, 1), 'max': 15},
            'pertinence_marche': {'points': round(pts_marche, 1), 'max': 20, 'moyenne_pct': round(pertinence, 1) if pertinence is not None else None},
        },
    }
