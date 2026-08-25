"""
Calcul déterministe du % de compatibilité candidat ↔ Domaine (nomenclature ANEM).

Contrairement au matching candidat ↔ offre (jobs/matcher.py), un Domaine n'a pas
de diplôme/compétences requis dans le référentiel — le score se limite donc à
2 critères réellement disponibles : la spécialité déclarée et l'expérience réelle
du candidat dans ce domaine. Volontairement pas de LLM ici : un pourcentage
affiché comme un fait doit être reproductible, pas une estimation d'IA.
"""
from .models import Domaine
from .matcher import specialites_compatibles, normaliser


def calculer_metiers_accessibles(candidat_user, top_n=None):
    profil = getattr(candidat_user, 'profil_candidat', None)
    if not profil:
        return []

    specialite_candidat = profil.specialite or profil.secteur_souhaite
    secteurs_experience = {
        normaliser(exp.secteur).upper()
        for exp in profil.experiences_detail.all()
        if exp.secteur
    }

    resultats = []
    for domaine in Domaine.objects.select_related('secteur').all():
        code_domaine = domaine.code.upper()
        score = 0.0

        # Spécialité déclarée (60 pts)
        if specialite_candidat:
            compatible, ratio = specialites_compatibles(specialite_candidat, code_domaine)
            if compatible:
                score += 60.0 * ratio

        # Expérience réelle dans ce domaine (40 pts) — même domaine (40) ou même secteur (20)
        if code_domaine in secteurs_experience:
            score += 40.0
        elif any(s[:1] == code_domaine[:1] for s in secteurs_experience):
            score += 20.0

        if score > 0:
            resultats.append({
                "domaine_code": domaine.code,
                "libelle": domaine.libelle,
                "secteur_code": domaine.secteur.code,
                "score": round(min(score, 100.0)),
            })

    resultats.sort(key=lambda r: r["score"], reverse=True)
    return resultats[:top_n] if top_n else resultats
