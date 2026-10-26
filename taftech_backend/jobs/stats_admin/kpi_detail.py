"""Page admin « KPI » : détail par thème (évolution mensuelle, répartitions, classements, entonnoirs).

Un thème = un appel (`calculer_detail`) : l'écran charge un onglet à la fois. Même structure pour
les quatre thèmes, donc un seul affichage et un seul export Excel :

    {'theme', 'periode', 'evolution': {'series': [{cle, label, unite}], 'lignes': [{mois, <cle>: n}]},
     'repartitions': [{cle, titre, note, total, lignes: [{libelle, nb}]}],
     'classements':  [{cle, titre, colonnes: [..], lignes: [[..]]}],
     'entonnoirs':   [{cle, titre, note, etapes: [{libelle, nb, pct_du_total, taux_passage}]}]}

Agrégats uniquement : jamais un nom, e-mail ou contenu de CV de candidat. Les classements portent sur
des entreprises (nom public de la page entreprise) et des offres, jamais sur des personnes.
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum

from ..models import (
    AccesCandidatDebloque, Candidature, CompetenceOffre, OffreEmploi, ParsingCV, PaiementAbonnement,
    PaiementCreditPack, Palier, ProfilCandidat, ProfilEntreprise, UtilisationIA,
)
from ..referentiel_utils import libelle_secteur_entreprise
from .abonnements import calculer_abonnements
from .evolution import _par_mois
from .periode import mois_de_la_periode
from .recrutement import calculer_entonnoir, calculer_matching

User = get_user_model()

THEMES = ('croissance', 'activite', 'revenus', 'ia')
LIMITE = 10
NON_RENSEIGNE = 'Non renseigné'


def _choix(modele, champ):
    return dict(modele._meta.get_field(champ).choices)


# ── briques communes ────────────────────────────────────────────────────────

def _evolution(debut, fin, definitions):
    """definitions = [(cle, libelle, unite, queryset, champ_date, agregat)] -> série mensuelle (mois vides inclus)."""
    valeurs = {
        cle: _par_mois(qs, champ_date, agregat)
        for cle, _libelle, _unite, qs, champ_date, agregat in definitions
    }
    lignes = []
    for premier_jour in mois_de_la_periode(debut, fin):
        mois = premier_jour.strftime('%Y-%m')
        lignes.append({'mois': mois, **{cle: valeurs[cle].get(mois, 0) for cle in valeurs}})
    return {
        'series': [{'cle': cle, 'label': libelle, 'unite': unite} for cle, libelle, unite, *_ in definitions],
        'lignes': lignes,
    }


def _repartition(cle, titre, queryset, champ, libelles=None, note='', agregat=None, vide=NON_RENSEIGNE):
    """Top `LIMITE` des valeurs de `champ` (+ « Autres » pour le reste). `agregat` : Count('id') par défaut."""
    agregat = agregat or Count('id')
    lignes_brutes = list(queryset.values(champ).annotate(nb=agregat).order_by('-nb', champ))
    total = sum(ligne['nb'] or 0 for ligne in lignes_brutes)

    def libelle(valeur):
        if valeur in (None, ''):
            return vide
        return libelles(valeur) if callable(libelles) else (libelles or {}).get(valeur, str(valeur))

    lignes = [{'libelle': libelle(ligne[champ]), 'nb': ligne['nb'] or 0} for ligne in lignes_brutes[:LIMITE]]
    reste = total - sum(ligne['nb'] for ligne in lignes)
    if reste > 0:
        lignes.append({'libelle': 'Autres', 'nb': reste})
    return {'cle': cle, 'titre': titre, 'note': note, 'total': total, 'lignes': lignes}


def _classement(cle, titre, colonnes, lignes, note=''):
    return {'cle': cle, 'titre': titre, 'note': note, 'colonnes': colonnes, 'lignes': lignes}


def _entonnoir(cle, titre, etapes, note=''):
    """etapes = [(libelle, nb)] ; `taux_passage` seulement quand l'étape ne dépasse pas la précédente."""
    base = etapes[0][1] if etapes else 0
    resultat, precedente = [], None
    for libelle, nb in etapes:
        resultat.append({
            'libelle': libelle,
            'nb': nb,
            'pct_du_total': round(nb / base * 100, 1) if base else 0.0,
            'taux_passage': round(nb / precedente * 100, 1) if precedente and nb <= precedente else None,
        })
        precedente = nb
    return {'cle': cle, 'titre': titre, 'note': note, 'etapes': resultat}


# ── Croissance ──────────────────────────────────────────────────────────────

def _croissance(debut, fin):
    plage = [debut, fin]
    inscrits_c = User.objects.filter(role='CANDIDAT', date_joined__date__range=plage)
    inscrits_r = User.objects.filter(role='RECRUTEUR', date_joined__date__range=plage)
    entreprises = ProfilEntreprise.objects.filter(user__date_joined__date__range=plage)
    taille = _choix(ProfilEntreprise, 'taille_entreprise')

    cohorte_c = inscrits_c.count()
    avec_profil = inscrits_c.filter(profil_candidat__isnull=False).count()
    avec_cv = inscrits_c.filter(profil_candidat__cv_pdf__gt='').count()
    ont_postule = inscrits_c.filter(candidatures__isnull=False).distinct().count()

    cohorte_r = inscrits_r.count()
    avec_entreprise = inscrits_r.filter(profil_entreprise__isnull=False).count()
    validees = inscrits_r.filter(profil_entreprise__est_approuvee=True).count()
    ont_publie = inscrits_r.filter(profil_entreprise__offres__isnull=False).distinct().count()
    ont_candidatures = inscrits_r.filter(profil_entreprise__offres__candidatures__isnull=False).distinct().count()

    return {
        'evolution': _evolution(debut, fin, [
            ('inscriptions_candidats', 'Nouveaux candidats', '', inscrits_c, 'date_joined', Count('id')),
            ('inscriptions_recruteurs', 'Nouveaux recruteurs', '', inscrits_r, 'date_joined', Count('id')),
        ]),
        'repartitions': [
            _repartition('candidats_wilaya', 'Nouveaux candidats par wilaya de résidence',
                         ProfilCandidat.objects.filter(user__date_joined__date__range=plage), 'wilaya'),
            _repartition('entreprises_secteur', "Nouvelles entreprises par secteur d'activité",
                         entreprises, 'secteur_activite', libelles=libelle_secteur_entreprise),
            _repartition('entreprises_taille', 'Nouvelles entreprises par taille', entreprises,
                         'taille_entreprise', libelles=taille),
            _repartition('entreprises_wilaya', 'Nouvelles entreprises par wilaya du siège', entreprises, 'wilaya_siege'),
        ],
        'classements': [],
        'entonnoirs': [
            _entonnoir('candidats', 'Parcours des candidats inscrits sur la période', [
                ('Inscrits', cohorte_c), ('Profil créé', avec_profil),
                ('CV déposé', avec_cv), ('Ont postulé', ont_postule),
            ], note="Suivi des comptes créés pendant la période, à ce jour (un candidat inscrit récemment n'a pas encore eu le temps de postuler)."),
            _entonnoir('recruteurs', 'Parcours des recruteurs inscrits sur la période', [
                ('Inscrits', cohorte_r), ('Entreprise renseignée', avec_entreprise),
                ('Entreprise validée', validees), ('Ont publié une offre', ont_publie),
                ('Ont reçu une candidature', ont_candidatures),
            ], note="Même principe : état actuel des comptes créés pendant la période."),
        ],
    }


# ── Offres et candidatures ──────────────────────────────────────────────────

def _activite(debut, fin):
    plage = [debut, fin]
    offres = OffreEmploi.objects.filter(statut_moderation='APPROUVEE', date_publication__date__range=plage)
    candidatures = Candidature.objects.filter(date_postulation__date__range=plage)
    matching = calculer_matching(debut, fin)

    top_offres = list(
        offres.annotate(nb=Count('candidatures')).filter(nb__gt=0)
        .order_by('-nb', 'titre').values_list('titre', 'entreprise__nom_entreprise', 'nb')[:LIMITE])
    top_entreprises = list(
        candidatures.values('offre__entreprise__nom_entreprise').annotate(nb=Count('id'))
        .order_by('-nb', 'offre__entreprise__nom_entreprise')[:LIMITE])
    top_metiers = list(
        offres.exclude(metier__isnull=True).values('metier__libelle').annotate(nb=Count('id'))
        .order_by('-nb', 'metier__libelle')[:LIMITE])
    top_competences = list(
        CompetenceOffre.objects.filter(offre__in=offres).values('label').annotate(nb=Count('id'))
        .order_by('-nb', 'label')[:LIMITE])

    return {
        'evolution': _evolution(debut, fin, [
            ('offres', 'Offres', '', OffreEmploi.objects.filter(date_publication__date__range=plage),
             'date_publication', Count('id')),
            ('candidatures', 'Candidatures', '', candidatures, 'date_postulation', Count('id')),
            ('recrutements', 'Recrutements', '',
             Candidature.objects.filter(statut='RETENU', date_maj__date__range=plage), 'date_maj', Count('id')),
        ]),
        'repartitions': [
            _repartition('offres_wilaya', 'Offres approuvées par wilaya', offres, 'wilaya'),
            _repartition('offres_contrat', 'Offres approuvées par type de contrat', offres, 'type_contrat',
                         libelles=_choix(OffreEmploi, 'type_contrat')),
            _repartition('offres_secteur', 'Offres approuvées par secteur de l\'entreprise', offres,
                         'entreprise__secteur_activite', libelles=libelle_secteur_entreprise),
            _repartition('candidatures_statut', 'Candidatures par statut actuel', candidatures, 'statut',
                         libelles=_choix(Candidature, 'statut')),
            _repartition('candidatures_source', 'Candidatures par origine', candidatures, 'source',
                         libelles=_choix(Candidature, 'source')),
            {
                'cle': 'matching', 'titre': 'Scores de matching des candidatures',
                'note': 'Nombre de candidatures par tranche de score.',
                'total': sum(t['nb'] for t in matching['distribution']),
                'lignes': [{'libelle': f"{t['tranche']} %", 'nb': t['nb']} for t in matching['distribution']],
            },
        ],
        'classements': [
            _classement('top_offres', 'Offres les plus postulées', ['Offre', 'Entreprise', 'Candidatures'],
                        [[titre, entreprise, nb] for titre, entreprise, nb in top_offres]),
            _classement('top_entreprises', 'Entreprises qui reçoivent le plus de candidatures',
                        ['Entreprise', 'Candidatures'],
                        [[ligne['offre__entreprise__nom_entreprise'], ligne['nb']] for ligne in top_entreprises]),
            _classement('top_metiers', 'Métiers les plus recherchés (offres)', ['Métier', 'Offres'],
                        [[ligne['metier__libelle'], ligne['nb']] for ligne in top_metiers],
                        note="Métier de référence interne de l'offre : réservé à l'administration."),
            _classement('top_competences', 'Compétences les plus demandées', ['Compétence', 'Offres'],
                        [[ligne['label'], ligne['nb']] for ligne in top_competences]),
        ],
        'entonnoirs': [
            {**calculer_entonnoir(debut, fin), 'cle': 'recrutement', 'titre': 'Entonnoir de recrutement',
             'note': "Approximation : statut actuel des candidatures déposées pendant la période "
                     "(pas d'historique des changements de statut)."},
        ],
    }


def _entonnoir_depuis_calcul(brut):
    """Met l'entonnoir de `calculer_entonnoir` au format commun ({libelle, nb, pct_du_total, taux_passage})."""
    return {
        **{k: brut[k] for k in ('cle', 'titre', 'note')},
        'etapes': [
            {'libelle': e['libelle'], 'nb': e['nb'], 'pct_du_total': e['pct_du_total'], 'taux_passage': e['taux_passage']}
            for e in brut['etapes']
        ],
        'refusees': brut.get('refusees'),
    }


# ── Revenus et abonnements ──────────────────────────────────────────────────

def _revenus(debut, fin):
    plage = [debut, fin]
    paiements = PaiementAbonnement.objects.filter(date_paiement__date__range=plage)
    packs = PaiementCreditPack.objects.filter(date_paiement__date__range=plage)
    deblocages = AccesCandidatDebloque.objects.filter(date_debloque__date__range=plage)
    noms_paliers = dict(Palier.NOM_CHOICES)
    abonnements = calculer_abonnements(debut, fin)

    top_revenu = {}
    for ligne in paiements.values('entreprise__nom_entreprise').annotate(t=Sum('montant_da')):
        top_revenu[ligne['entreprise__nom_entreprise']] = [ligne['t'] or 0, 0]
    for ligne in packs.values('entreprise__nom_entreprise').annotate(t=Sum('montant_da')):
        top_revenu.setdefault(ligne['entreprise__nom_entreprise'], [0, 0])[1] = ligne['t'] or 0
    classement_revenu = sorted(top_revenu.items(), key=lambda kv: (-(kv[1][0] + kv[1][1]), kv[0]))[:LIMITE]
    top_deblocages = list(
        deblocages.values('entreprise__nom_entreprise').annotate(nb=Count('id'))
        .order_by('-nb', 'entreprise__nom_entreprise')[:LIMITE])

    return {
        'evolution': _evolution(debut, fin, [
            ('revenu_abonnements_da', 'Revenu des abonnements', 'DA', paiements, 'date_paiement', Sum('montant_da')),
            ('revenu_packs_da', 'Revenu des packs de crédits', 'DA', packs, 'date_paiement', Sum('montant_da')),
            ('deblocages', 'Déblocages CVthèque', '', deblocages, 'date_debloque', Count('id')),
        ]),
        'repartitions': [
            _repartition('revenu_palier', 'Revenu des abonnements par palier (DA)', paiements, 'palier_nom',
                         libelles=noms_paliers, agregat=Sum('montant_da')),
            {'cle': 'actifs_palier', 'titre': 'Abonnements actifs par palier',
             'note': "État actuel (pas d'historique des changements de palier).",
             'total': abonnements['actifs'],
             'lignes': [{'libelle': noms_paliers.get(p['palier'], p['palier']), 'nb': p['nb']}
                        for p in abonnements['par_palier']]},
            _repartition('revenu_packs', 'Revenu des packs par pack vendu (DA)', packs, 'pack_nom',
                         agregat=Sum('montant_da')),
            _repartition('credits_packs', 'Crédits vendus par pack', packs, 'pack_nom', agregat=Sum('credits')),
            _repartition('deblocages_source', 'Déblocages par origine du crédit', deblocages, 'source',
                         libelles=_choix(AccesCandidatDebloque, 'source')),
        ],
        'classements': [
            _classement('top_revenu', 'Entreprises qui rapportent le plus',
                        ['Entreprise', 'Abonnements (DA)', 'Packs (DA)', 'Total (DA)'],
                        [[nom, ab, pk, ab + pk] for nom, (ab, pk) in classement_revenu]),
            _classement('top_deblocages', 'Entreprises qui débloquent le plus de candidats',
                        ['Entreprise', 'Déblocages'],
                        [[ligne['entreprise__nom_entreprise'], ligne['nb']] for ligne in top_deblocages]),
        ],
        'entonnoirs': [],
    }


# ── Qualité et IA ───────────────────────────────────────────────────────────

def _ia(debut, fin):
    plage = [debut, fin]
    appels = UtilisationIA.objects.filter(statut='ACCEPTE', date_heure__date__range=plage)
    parsings = ParsingCV.objects.filter(date__date__range=plage)
    echecs = parsings.filter(succes=False)

    return {
        'evolution': _evolution(debut, fin, [
            ('appels', 'Appels IA', '', appels, 'date_heure', Count('id')),
            ('tokens', 'Tokens', '', appels, 'date_heure', Sum('tokens_entree') + Sum('tokens_sortie')),
            ('cv_analyses', 'CV analysés', '', parsings, 'date', Count('id')),
            ('cv_en_echec', 'Analyses en échec', '', echecs, 'date', Count('id')),
        ]),
        'repartitions': [
            _repartition('appels_fonction', 'Appels IA par fonction', appels, 'fonction',
                         libelles=dict(UtilisationIA.FONCTION_CHOICES)),
            _repartition('tokens_fonction', 'Tokens par fonction', appels, 'fonction',
                         libelles=dict(UtilisationIA.FONCTION_CHOICES),
                         agregat=Sum('tokens_entree') + Sum('tokens_sortie')),
            _repartition('appels_modele', 'Appels IA par modèle', appels, 'modele', vide='Modèle non enregistré'),
            _repartition('cv_erreurs', "Analyses de CV en échec par code d'erreur", echecs, 'code_erreur',
                         vide='Code non enregistré'),
            _repartition('cv_format', 'CV analysés par format de fichier', parsings, 'extension', vide='Format inconnu'),
            _repartition('cv_version', 'CV analysés par version du parser', parsings, 'version_parser',
                         vide='Version non enregistrée'),
        ],
        'classements': [],
        'entonnoirs': [],
    }


CALCULS = {'croissance': _croissance, 'activite': _activite, 'revenus': _revenus, 'ia': _ia}


def calculer_detail(theme, debut, fin):
    if theme not in CALCULS:
        raise ValueError(f"Thème inconnu : {theme}")
    detail = CALCULS[theme](debut, fin)
    detail['entonnoirs'] = [_entonnoir_depuis_calcul(e) for e in detail['entonnoirs']]
    return {'theme': theme, 'periode': {'debut': debut.isoformat(), 'fin': fin.isoformat()}, **detail}
