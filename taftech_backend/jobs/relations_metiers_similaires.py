"""Relations « similaire » entre métiers qui partagent une appellation — session 23/10/2026.

Le référentiel range parfois le même poste sous un métier générique ANEM et sous un métier précis
TAFTECH (« Acheteur » / « Opérations d'achat ») : sans lien, `matcher.metiers_compatibles` ne leur
donne que 0,45 (même secteur) ou moins. Une `RelationMetier` « similaire » les ramène à 0,70.

Décision produit du 24/09/2026 : ces relations ne sont JAMAIS déduites automatiquement. Cette
fonction ne crée donc que les paires listées dans `data/relations_metiers_similaires.json`, validées
à la main (`[{"depart": code, "arrivee": code, "appellation": libellé}]`). Idempotente, ignore et
signale un métier introuvable ou redirigé, ne supprime rien. Un import du classeur ne les touche
pas (codes `SIM-…`, propres à TAFTECH) ; rejouable sans risque. Retour arrière : supprimer les
`RelationMetier` dont le code commence par `SIM-`.
"""
import json
import os

from django.db import transaction

CHEMIN_PAIRES = os.path.join(os.path.dirname(__file__), 'data', 'relations_metiers_similaires.json')
PREFIXE_CODE = 'SIM-'
SOURCE_TAFTECH = 'TAF'


def _cle(paire):
    return frozenset(paire)


def appliquer_relations_similaires(log, chemin=CHEMIN_PAIRES, appliquer=True):
    """Crée les relations de la liste validée. `appliquer=False` : rapport seulement.
    Retourne le nombre de relations créées (ou à créer en mode rapport)."""
    from .models import Metier, RelationMetier

    if not os.path.exists(chemin):
        log("  aucune liste de paires validées — rien à faire.")
        return 0
    with open(chemin, encoding='utf-8') as f:
        paires = json.load(f)

    codes = {code for p in paires for code in (p['depart'], p['arrivee'])}
    metiers = {m.code: m for m in Metier.objects.filter(code__in=codes)}
    existantes = {_cle((r.metier_depart_id, r.metier_arrivee_id))
                  for r in RelationMetier.objects.filter(relation='similaire')}

    a_creer = []
    for p in paires:
        depart, arrivee = metiers.get(p['depart']), metiers.get(p['arrivee'])
        if depart is None or arrivee is None:
            log(f"  [ignoré] {p['depart']} <-> {p['arrivee']} : métier introuvable")
            continue
        if depart.pk == arrivee.pk:
            log(f"  [ignoré] {p['depart']} : paire d'un métier avec lui-même")
            continue
        if any(m.metier_canonique_id not in (None, m.pk) for m in (depart, arrivee)):
            log(f"  [ignoré] {depart.code} <-> {arrivee.code} : un des métiers est redirigé vers un autre")
            continue
        cle = _cle((depart.pk, arrivee.pk))
        if cle in existantes:
            continue
        existantes.add(cle)
        a_creer.append((depart, arrivee, p.get('appellation', '')))

    if not a_creer:
        log("  [déjà fait] aucune relation de similarité à créer.")
        return 0
    for depart, arrivee, appellation in a_creer:
        log(f"  {depart.libelle!r} ({depart.code}) <-> {arrivee.libelle!r} ({arrivee.code}) « {appellation} »")
    if not appliquer:
        log(f"  [DRY-RUN] {len(a_creer)} relation(s) seraient créées ; rien n'a été écrit.")
        return len(a_creer)

    with transaction.atomic():
        for depart, arrivee, appellation in a_creer:
            RelationMetier.objects.get_or_create(
                code=f"{PREFIXE_CODE}{depart.code}-{arrivee.code}"[:30],
                defaults=dict(
                    metier_depart=depart, metier_arrivee=arrivee, relation='similaire', active_recherche=True,
                    source_id=SOURCE_TAFTECH,
                    justification=f"Même appellation « {appellation} » : métiers jugés substituables "
                                  f"(paire validée à la main, 23/10/2026)."),
            )
    log(f"  {len(a_creer)} relation(s) de similarité créée(s).")
    return len(a_creer)
