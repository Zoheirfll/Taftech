"""Texte envoyé à l'IA par l'analyse carrière et les conseils : construit ici (et non dans les
vues) pour que l'aperçu montré au candidat soit exactement ce qui part."""
from ..models import AlerteEmploi, Candidature
from ..profile_score import calculer_score_profil
from .champs_structures import (
    PseudonymeurEmployeurs, effectifs_par_statut, lignes_experiences, lignes_formations,
    nettoyer_champ,
)


def texte_carriere(profil) -> str:
    from ..views.ia import _date_precise  # import différé : views.ia importe ce package

    experiences = [
        {
            'titre_poste': e.titre_poste,
            'entreprise': e.entreprise,
            'domaine': e.metier.groupe_principal.libelle if e.metier and e.metier.groupe_principal else None,
            'debut': _date_precise(e.date_debut, e.date_debut_precision),
            'fin': _date_precise(e.date_fin, e.date_fin_precision) or None,
        }
        for e in profil.experiences_detail.select_related('metier__groupe_principal')
    ]
    formations = [
        {
            'diplome': f.diplome_ref.libelle if f.diplome_ref_id else f.diplome,
            'specialite': f.specialite_ref.libelle if f.specialite_ref_id else None,
        }
        for f in profil.formations_detail.select_related('diplome_ref', 'specialite_ref')
    ]
    experiences_txt = lignes_experiences(experiences, PseudonymeurEmployeurs())
    formations_txt = lignes_formations(formations)
    metier_actuel = profil.metier.libelle if profil.metier else None
    metier_souhaite = profil.metier_souhaite.libelle if profil.metier_souhaite else None
    return f"""
Titre : {nettoyer_champ(profil.titre_professionnel) or 'Non renseigné'}
Diplôme : {profil.diplome or 'Non renseigné'}
Métier : {metier_actuel or 'Non renseigné'}
Compétences : {nettoyer_champ(profil.competences) or 'Non renseigné'}
Expériences : {', '.join(experiences_txt) if experiences_txt else 'Aucune'}
Formations : {', '.join(formations_txt) if formations_txt else 'Aucune'}
Métier souhaité : {metier_souhaite or 'Non renseigné'}
"""


def texte_conseils(user, profil) -> str:
    score = calculer_score_profil(user)
    statuts = Candidature.objects.filter(candidat=user).values_list('statut', flat=True)
    competences_faibles = [
        f"{c.label} ({c.get_niveau_display()})"
        for c in profil.competences_detail.exclude(niveau='CONFIRME')[:5]
    ]
    diplome = profil.diplome_ref.libelle if profil.diplome_ref_id else (profil.diplome or 'Non renseigné')
    return f"""
Score de profil global : {score['total']}/100
Détail du score : {nettoyer_champ(str(score['details']))}
Candidatures envoyées par statut : {effectifs_par_statut(statuts)}
Compétences non confirmées (niveau faible) : {', '.join(competences_faibles) if competences_faibles else 'Aucune'}
Nombre d'alertes emploi configurées : {AlerteEmploi.objects.filter(candidat=user).count()}
Titre professionnel : {nettoyer_champ(profil.titre_professionnel) or 'Non renseigné'}
Diplôme : {diplome}
"""
