"""Statistiques d'usage derrière les suggestions de création d'offre.

Pour un métier donné, mesure ce qui est réellement utilisé :
- côté candidats : % de profils (métier actuel OU souhaité = ce métier) qui déclarent
  telle compétence / tel diplôme / telle spécialité ;
- côté offres : nombre d'offres approuvées du même métier qui exigent cet élément.

Garde-fous :
- seuil minimum (`MIN_CANDIDATS` / `MIN_OFFRES`) : en dessous, le chiffre correspondant n'est
  pas exposé (un « 100 % » calculé sur 2 profils serait trompeur et quasi identifiant) ;
- uniquement des agrégats, jamais de donnée nominative ;
- les statistiques ne servent qu'à TRIER et ANNOTER : aucune suggestion n'est retirée, pour
  éviter l'effet de boucle (tout le monde copie le plus fréquent).
Résultat mis en cache 1 h par métier canonique (même principe que `jobs_constants`).
"""
from collections import Counter, defaultdict

from django.core.cache import cache
from django.db.models import Q

MIN_CANDIDATS = 10
MIN_OFFRES = 5
MAX_PAR_CATEGORIE = 12
CACHE_TTL = 3600


def _cle(label):
    return (label or '').strip().lower()


def _famille(code):
    """'D-LIC-A' → 'D-LIC' ; un code sans variante reste tel quel."""
    parts = (code or '').split('-')
    return '-'.join(parts[:2]) if len(parts) >= 3 else (code or '')


def _agreger(paires, total):
    """paires = [(id_unite, cle_element, libelle_affiche, id_element)] → par élément, nombre
    d'unités (profils ou offres) DISTINCTES. Retourne {cle: {...}} ."""
    unites = defaultdict(set)
    libelles = defaultdict(Counter)
    ids = {}
    for unite, cle, libelle, ident in paires:
        if not cle:
            continue
        unites[cle].add(unite)
        libelles[cle][libelle] += 1
        ids.setdefault(cle, ident)
    return {
        cle: {'id': ids[cle], 'label': libelles[cle].most_common(1)[0][0], 'nb': len(u)}
        for cle, u in unites.items()
    }


def calculer_stats_metier(metier):
    """Retourne {'nb_candidats', 'nb_offres', 'competences', 'specialites', 'diplomes'} où
    chaque catégorie est {cle: {'id','label','nb_candidats','nb_offres'}}. Les compteurs
    sous le seuil valent None."""
    cache_key = f'jobs_sugg_stats_{metier.pk}'
    resultat = cache.get(cache_key)
    if resultat is not None:
        return resultat

    from .models import (
        CompetenceCandidat, CompetenceOffre, FormationCandidat, Metier, OffreEmploi, ProfilCandidat,
    )

    ids_metier = list(
        Metier.objects.filter(Q(pk=metier.pk) | Q(metier_canonique=metier)).values_list('pk', flat=True)
    )
    profils = list(
        ProfilCandidat.objects.filter(Q(metier_id__in=ids_metier) | Q(metier_souhaite_id__in=ids_metier))
        .values_list('pk', flat=True).distinct()
    )
    offres = list(
        OffreEmploi.objects.filter(metier_id__in=ids_metier, statut_moderation='APPROUVEE')
        .values_list('pk', flat=True)
    )
    # Peu de profils/offres pour ce métier précis : on élargit aux métiers du même groupe
    # (même domaine) plutôt que de masquer les chiffres. Signalé via `elargi`.
    elargi = False
    if (len(profils) < MIN_CANDIDATS or len(offres) < MIN_OFFRES) and metier.groupe_principal_id:
        voisins = list(Metier.objects.filter(groupe_principal_id=metier.groupe_principal_id)
                       .values_list('pk', flat=True))
        if len(profils) < MIN_CANDIDATS:
            profils = list(
                ProfilCandidat.objects.filter(Q(metier_id__in=voisins) | Q(metier_souhaite_id__in=voisins))
                .values_list('pk', flat=True).distinct())
            elargi = True
        if len(offres) < MIN_OFFRES:
            offres = list(OffreEmploi.objects.filter(metier_id__in=voisins, statut_moderation='APPROUVEE')
                          .values_list('pk', flat=True))
            elargi = True
    nb_c, nb_o = len(profils), len(offres)
    expose_c, expose_o = nb_c >= MIN_CANDIDATS, nb_o >= MIN_OFFRES

    cat = {'competences': {}, 'specialites': {}, 'diplomes': {}}

    def fusionner(nom, cand=None, off=None):
        for cle in set(cand or {}) | set(off or {}):
            c, o = (cand or {}).get(cle), (off or {}).get(cle)
            base = c or o
            cat[nom][cle] = {
                'id': base['id'],
                'label': base['label'],
                'nb_candidats': c['nb'] if (c and expose_c) else None,
                'nb_offres': o['nb'] if (o and expose_o) else None,
                'pct_candidats': round(100 * c['nb'] / nb_c) if (c and expose_c) else None,
            }

    if expose_c:
        comp_c = _agreger(
            [(p, _cle(l), l, None) for p, l in
             CompetenceCandidat.objects.filter(profil_id__in=profils).values_list('profil_id', 'label')],
            nb_c)
        spe_c = _agreger(
            [(p, _cle(str(s)), lib, s) for p, s, lib in
             FormationCandidat.objects.filter(profil_id__in=profils, specialite_ref__isnull=False,
                                              specialite_ref__selectionnable=True)
             .values_list('profil_id', 'specialite_ref_id', 'specialite_ref__libelle')],
            nb_c)
        dip_c = _agreger(
            [(p, _cle(str(d)), lib, d) for p, d, lib in
             FormationCandidat.objects.filter(profil_id__in=profils, diplome_ref__isnull=False,
                                              diplome_ref__selectionnable=True)
             .values_list('profil_id', 'diplome_ref_id', 'diplome_ref__libelle')],
            nb_c)
        # Famille de diplôme (D-LIC-A / D-LIC-NP → D-LIC) : un profil compte une fois par famille.
        fam_c = _agreger(
            [(p, _famille(c), c, _famille(c)) for p, c in
             FormationCandidat.objects.filter(profil_id__in=profils, diplome_ref__isnull=False,
                                              diplome_ref__selectionnable=True)
             .values_list('profil_id', 'diplome_ref__code')],
            nb_c)
    else:
        comp_c = spe_c = dip_c = fam_c = None

    if expose_o:
        comp_o = _agreger(
            [(o, _cle(l), l, None) for o, l in
             CompetenceOffre.objects.filter(offre_id__in=offres).values_list('offre_id', 'label')],
            nb_o)
        spe_o = _agreger(
            [(o, _cle(str(s)), lib, s) for o, s, lib in
             OffreEmploi.objects.filter(pk__in=offres, specialites_requises__isnull=False)
             .values_list('pk', 'specialites_requises__id', 'specialites_requises__libelle')],
            nb_o)
        dip_o = _agreger(
            [(o, _cle(str(d)), lib, d) for o, d, lib in
             OffreEmploi.objects.filter(pk__in=offres, diplomes_requis__isnull=False)
             .values_list('pk', 'diplomes_requis__id', 'diplomes_requis__libelle')],
            nb_o)
    else:
        comp_o = spe_o = dip_o = None

    fusionner('competences', comp_c, comp_o)
    fusionner('specialites', spe_c, spe_o)
    fusionner('diplomes', dip_c, dip_o)

    familles = {k: round(100 * v['nb'] / nb_c) for k, v in (fam_c or {}).items()}
    resultat = {'nb_candidats': nb_c if expose_c else None, 'nb_offres': nb_o if expose_o else None,
                'elargi': elargi, 'familles': familles, **cat}
    cache.set(cache_key, resultat, CACHE_TTL)
    return resultat


def score_tri(item):
    """Clé de tri décroissante : % candidats d'abord, puis nombre d'offres. Sans statistique
    → 0 (reste visible, placé après)."""
    return ((item.get('pct_candidats') or 0), (item.get('nb_offres') or 0))
