"""
Calcul déterministe du % de compatibilité candidat ↔ Metier (référentiel v2).

Contrairement au matching candidat ↔ offre (jobs/matcher.py), le score se limite à
2 critères réellement disponibles : le métier déclaré/souhaité et l'expérience
réelle du candidat dans ce métier. Volontairement pas de LLM ici : un pourcentage
affiché comme un fait doit être reproductible, pas une estimation d'IA.
"""
from .models import Metier
from .matcher import metiers_compatibles


def calculer_metiers_accessibles(candidat_user, top_n=None):
    profil = getattr(candidat_user, 'profil_candidat', None)
    if not profil:
        return []

    metier_candidat = profil.metier or profil.metier_souhaite
    if metier_candidat:
        metier_candidat = metier_candidat.metier_canonique or metier_candidat
    metiers_experience = {
        exp.metier.metier_canonique or exp.metier
        for exp in profil.experiences_detail.select_related('metier', 'metier__metier_canonique').all()
        if exp.metier
    }
    groupes_experience = {m.groupe_principal_id for m in metiers_experience if m.groupe_principal_id}

    resultats = []
    for metier in Metier.objects.filter(selectionnable=True).select_related('groupe_principal', 'metier_canonique'):
        m = metier.metier_canonique or metier
        score = 0.0

        # Métier déclaré/souhaité (60 pts)
        if metier_candidat:
            compatible, ratio = metiers_compatibles(metier_candidat, m)
            if compatible:
                score += 60.0 * ratio

        # Expérience réelle dans ce métier (40 pts) — même métier (40) ou même groupe (20)
        if m in metiers_experience:
            score += 40.0
        elif m.groupe_principal_id and m.groupe_principal_id in groupes_experience:
            score += 20.0

        if score > 0:
            resultats.append({
                "metier_id": m.id,
                "libelle": m.libelle,
                "groupe_libelle": m.groupe_principal.libelle if m.groupe_principal else None,
                "score": round(min(score, 100.0)),
            })

    resultats.sort(key=lambda r: r["score"], reverse=True)
    return resultats[:top_n] if top_n else resultats
