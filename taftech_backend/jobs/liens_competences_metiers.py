"""Liens « compétence ↔ métiers » d'une liste validée à la main — session 24/10/2026.

Une compétence liée à un métier est proposée (jamais ajoutée d'office) à ceux qui choisissent ce métier :
publication d'offre, profil et assistant d'import du candidat. Le classeur du client n'en couvre qu'une partie
(520 métiers sur 997) ; cette fonction ajoute ceux de `data/liens_competences_metiers.json`
(`[{"competence": libellé, "metiers": [code, …]}]`). Les liens créés portent un code `TAF-LC-…`, propre à
TafTech : un import du classeur ne les touche pas, la commande est rejouable sans risque. Les compétences
transversales (savoir-être, langues, bureautique de base) ne sont volontairement liées à aucun métier.

Tout-ou-rien : une compétence non officielle ou un métier introuvable annule l'ensemble (aucune écriture).
Retour arrière : supprimer les `MetierCompetence` dont le code commence par `TAF-LC-`."""
import json
import os

from django.db import transaction

CHEMIN_LIENS = os.path.join(os.path.dirname(__file__), 'data', 'liens_competences_metiers.json')
PREFIXE_CODE = 'TAF-LC-'


def appliquer_liens(log, chemin=CHEMIN_LIENS, appliquer=True):
    """Crée les liens de la liste validée. `appliquer=False` : rapport seulement. Retourne le nombre de
    liens créés (ou à créer en mode rapport). Lève ValueError, sans rien écrire, si une cible est invalide."""
    from .models import CompetenceReferentiel, Metier, MetierCompetence

    with open(chemin, encoding='utf-8') as f:
        liste = json.load(f)

    competences = {c.label.lower(): c for c in CompetenceReferentiel.objects.filter(statut=CompetenceReferentiel.STATUT_VALIDEE)}
    metiers = {m.code: m for m in Metier.objects.filter(code__in={code for e in liste for code in e['metiers']})}

    erreurs = []
    for entree in liste:
        if entree['competence'].lower() not in competences:
            erreurs.append(f"Compétence introuvable ou non officielle : {entree['competence']}")
        erreurs.extend(f"Métier introuvable : {code} (« {entree['competence']} »)" for code in entree['metiers'] if code not in metiers)
    if erreurs:
        raise ValueError("\n".join(dict.fromkeys(erreurs)))

    crees = 0
    with transaction.atomic():
        for entree in liste:
            competence = competences[entree['competence'].lower()]
            for code in entree['metiers']:
                cible = metiers[code].metier_canonique or metiers[code]
                if MetierCompetence.objects.filter(metier=cible, competence=competence).exists():
                    log(f"  [déjà fait] {competence.label} -> {cible.libelle}")
                    continue
                crees += 1
                log(f"  + {competence.label} -> {cible.libelle}")
                if appliquer:
                    MetierCompetence.objects.create(
                        code=f"{PREFIXE_CODE}{competence.pk}-{cible.pk}", metier=cible, competence=competence,
                    )
    return crees
