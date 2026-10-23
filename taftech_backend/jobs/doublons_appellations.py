"""Doublons d'appellations dans un MÊME métier (même `cle_recherche`) — session 23/10/2026.

Le classeur client importe parfois deux fois la même appellation (deux codes `APP-…`), et une ligne
« préférée » (`APPX-…`) vient s'ajouter à une ligne déjà présente. Un import (`update_or_create` par
code) recrée les lignes supprimées : cette fonction est donc rejouable après chaque import.

Règles : on garde la ligne « préférée » si elle existe, sinon le plus petit code ; si une ligne du
groupe est marquée ambiguë, la conservée l'est aussi ; les références candidat (profil, expérience)
sont rattachées à la conservée AVANT la suppression ; une sauvegarde JSON (lignes supprimées et
rattachements) est écrite avant. Les mêmes appellations sur des métiers DIFFÉRENTS ne sont jamais
touchées (ambiguïté réelle, à relire à la main). Idempotente.
"""
import json
import os
from collections import defaultdict
from datetime import datetime

from django.conf import settings
from django.db import transaction

TYPE_PREFERE = 'preferent'


def detecter_doublons_appellations():
    """Liste de `(ligne_conservee, [lignes_a_supprimer])`, un élément par groupe de doublons."""
    from .models import Appellation

    groupes = defaultdict(list)
    for appellation in Appellation.objects.select_related('metier').order_by('code'):
        groupes[(appellation.metier_id, appellation.cle_recherche)].append(appellation)

    resultat = []
    for lignes in groupes.values():
        if len(lignes) < 2:
            continue
        conservee = next((a for a in lignes if a.type_alias == TYPE_PREFERE), lignes[0])
        resultat.append((conservee, [a for a in lignes if a.pk != conservee.pk]))
    return resultat


def _ligne(objet):
    return {champ.attname: getattr(objet, champ.attname) for champ in objet._meta.concrete_fields}


def _rattachements(doublons):
    """Références (candidats…) qui pointent vers un doublon : `(modèle, champ, pk, doublon)`."""
    from .models import Appellation

    trouves = []
    for rel in Appellation._meta.related_objects:
        champ = rel.field.name
        for doublon in doublons:
            for pk in rel.related_model.objects.filter(**{champ: doublon}).values_list('pk', flat=True):
                trouves.append((rel.related_model, champ, pk, doublon))
    return trouves


def _sauvegarder(doublons, rattachements, log):
    dossier = os.path.join(str(settings.BASE_DIR), 'backups')
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, f"doublons_appellations_{datetime.now():%Y%m%d_%H%M%S}.json")
    contenu = {
        'appellations': [_ligne(d) for d in doublons],
        'rattachements': [
            {'modele': modele.__name__, 'champ': champ, 'pk': pk, 'ancienne_appellation': doublon.code}
            for modele, champ, pk, doublon in rattachements
        ],
    }
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(contenu, f, ensure_ascii=False, indent=1, default=str)
    log(f"  sauvegarde écrite : {chemin}")


def supprimer_doublons_appellations(log, sauvegarder=True, appliquer=True):
    """Supprime les doublons détectés. `appliquer=False` : rapport seulement, rien n'est écrit.
    Retourne le nombre de lignes en trop (supprimées, ou à supprimer en mode rapport)."""
    from .models import Appellation

    groupes = detecter_doublons_appellations()
    if not groupes:
        log("  [déjà fait] aucun doublon d'appellation à supprimer.")
        return 0

    tous = [d for _, doublons in groupes for d in doublons]
    for conservee, doublons in groupes:
        codes = ", ".join(d.code for d in doublons)
        log(f"  {conservee.libelle!r} ({conservee.metier.libelle}) : conservé {conservee.code}, supprimé {codes}")
    if not appliquer:
        log(f"  [DRY-RUN] {len(tous)} ligne(s) seraient supprimées dans {len(groupes)} groupe(s) ; rien n'a été écrit.")
        return len(tous)

    with transaction.atomic():
        rattachements = _rattachements(tous)
        if sauvegarder:
            _sauvegarder(tous, rattachements, log)
        cible_de = {d.pk: conservee for conservee, doublons in groupes for d in doublons}
        for modele, champ, pk, doublon in rattachements:
            modele.objects.filter(pk=pk).update(**{champ: cible_de[doublon.pk]})
        for conservee, doublons in groupes:
            if not conservee.ambiguite and any(d.ambiguite for d in doublons):
                conservee.ambiguite = True
                conservee.save(update_fields=['ambiguite'])
        Appellation.objects.filter(pk__in=[d.pk for d in tous]).delete()
    log(f"  {len(tous)} doublon(s) supprimé(s) dans {len(groupes)} groupe(s) ; {len(rattachements)} référence(s) rattachée(s).")
    return len(tous)
