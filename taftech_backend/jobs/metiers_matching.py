"""
Calcul déterministe du % de compatibilité candidat ↔ Metier (référentiel v2).

Contrairement au matching candidat ↔ offre (jobs/matcher.py), le score se limite à
2 critères réellement disponibles : le métier déclaré/souhaité et l'expérience
réelle du candidat dans ce métier. Volontairement pas de LLM ici : un pourcentage
affiché comme un fait doit être reproductible, pas une estimation d'IA.
"""
from django.db.models import Q
from .models import Metier, RelationMetier
from .matcher import metiers_compatibles


def _relations_cache_pour(metier_candidat):
    """Précalcule en UNE requête l'ensemble des métiers liés à `metier_candidat` par une
    RelationMetier 'similaire' active — évite que `metiers_compatibles()` fasse une requête
    par métier comparé quand on boucle sur tout le référentiel (~1000 métiers), voir
    `metiers_compatibles`/`_relation_similaire` dans matcher.py pour le détail du bug N+1
    corrigé (lenteur >10s sur le dashboard candidat)."""
    if not metier_candidat:
        return set()
    paires = RelationMetier.objects.filter(
        relation='similaire', active_recherche=True,
    ).filter(
        Q(metier_depart_id=metier_candidat.pk) | Q(metier_arrivee_id=metier_candidat.pk)
    ).values_list('metier_depart_id', 'metier_arrivee_id')
    return {
        arrivee if depart == metier_candidat.pk else depart
        for depart, arrivee in paires
    }


def calculer_metiers_accessibles(candidat_user, top_n=None):
    profil = getattr(candidat_user, 'profil_candidat', None)
    if not profil:
        return []

    metier_candidat = profil.metier or profil.metier_souhaite
    if metier_candidat:
        metier_candidat = metier_candidat.metier_canonique or metier_candidat
    relations_cache = _relations_cache_pour(metier_candidat)
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

        # Métier déclaré/souhaité (60 pts) — le bonus "même groupe_principal" (0.85) de
        # metiers_compatibles() est volontairement pondéré à la baisse ici : un groupe du
        # référentiel v2 peut regrouper des métiers très hétérogènes (ex: "Développement
        # informatique" et "Information géographique/météorologique" dans le même groupe
        # large) — sans cet ajustement, deux métiers sans rapport réel avec le candidat
        # pouvaient dépasser en score un métier au libellé réellement proche (fuzzy < 0.85).
        # Un vrai rapprochement de libellé (exact ou fuzzy) reste toujours mieux crédité
        # qu'un simple "même case du référentiel". Le bonus "même secteur parent, domaine
        # différent" (0.45, `_meme_secteur_parent()`) est exclu entièrement ici — deux
        # métiers dans un même grand secteur (ex: toute l'Administration) n'ont souvent
        # aucun rapport réel avec le métier précis déclaré par le candidat ; ce bonus reste
        # utile pour le matching candidat↔offre (jobs/matcher.py) mais fausserait "métiers
        # accessibles pour vous" en y faisant apparaître des métiers sans lien réel.
        if metier_candidat:
            compatible, ratio = metiers_compatibles(
                metier_candidat, m, relations_cache=relations_cache, secteur_fallback=False
            )
            if compatible:
                score += 60.0 * (ratio * 0.35 if ratio == 0.85 else ratio)

        # Expérience réelle dans ce métier (40 pts) — même métier (40) ou même groupe (10).
        # Le bonus "même groupe" est volontairement plus faible que le bonus "même métier
        # déclaré" ci-dessus car il repose sur le même signal grossier (le groupe, pas le
        # libellé) — additionner deux fois un bonus de groupe suffisait déjà à faire
        # dépasser un vrai rapprochement de libellé (fuzzy) avant ce correctif.
        if m in metiers_experience:
            score += 40.0
        elif m.groupe_principal_id and m.groupe_principal_id in groupes_experience:
            score += 10.0

        if score > 0:
            resultats.append({
                "metier_id": m.id,
                "libelle": m.libelle,
                "groupe_libelle": m.groupe_principal.libelle if m.groupe_principal else None,
                "score": round(min(score, 100.0)),
            })

    resultats.sort(key=lambda r: r["score"], reverse=True)
    return resultats[:top_n] if top_n else resultats
