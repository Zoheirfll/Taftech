"""Page admin « Statistiques » : JSON + export Excel (calcul dans `jobs/stats_admin/`)."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Palier, ProfilEntreprise
from ..permissions import IsAdminRole
from ..stats_admin import (
    PeriodeInvalide, construire_statistiques, lire_entreprise_id, lire_periode,
)
from ..stats_admin.kpi import calculer_kpi
from ..stats_admin.kpi_detail import THEMES, calculer_detail
from .admin import _audit
from .export_xlsx import reponse_xlsx_multi

LIBELLES_INDICATEURS = [
    ('offres', 'Offres créées'),
    ('candidatures', 'Candidatures'),
    ('inscriptions_candidats', 'Inscriptions candidats'),
    ('inscriptions_recruteurs', 'Inscriptions recruteurs'),
    ('recrutements', 'Recrutements (candidats retenus)'),
    ('revenu_da', 'Revenu des abonnements (DA)'),
]
LIBELLES_EVOLUTION = [
    ('offres', 'Offres'), ('candidatures', 'Candidatures'),
    ('inscriptions_candidats', 'Inscriptions candidats'),
    ('inscriptions_recruteurs', 'Inscriptions recruteurs'),
    ('recrutements', 'Recrutements'), ('revenu_da', 'Revenu (DA)'),
]
NOMS_PALIERS = dict(Palier.NOM_CHOICES)


def _parametres_ou_erreur(request):
    """((debut, fin), entreprise_id) ou (None, Response 400)."""
    try:
        periode = lire_periode(request.query_params)
        entreprise_id = lire_entreprise_id(request.query_params)
    except PeriodeInvalide as exc:
        return None, Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if entreprise_id and not ProfilEntreprise.objects.filter(pk=entreprise_id).exists():
        return None, Response({'error': "Entreprise introuvable."}, status=status.HTTP_400_BAD_REQUEST)
    return (periode, entreprise_id), None


class AdminStatistiquesAPIView(APIView):
    """GET jobs/admin/stats-periode/?date_debut=&date_fin=&entreprise_id= — agrégats uniquement
    (aucune donnée personnelle de candidat ou de recruteur ; la liste des entreprises se limite à
    identifiant + nom). Ne pas confondre avec `admin/statistiques/` (`AdminStatsAPIView`,
    compteurs instantanés du tableau de bord)."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        parametres, erreur = _parametres_ou_erreur(request)
        if erreur:
            return erreur
        (debut, fin), entreprise_id = parametres
        return Response(construire_statistiques(debut, fin, entreprise_id))


class AdminKpiAPIView(APIView):
    """GET jobs/admin/kpi/?date_debut=&date_fin= — indicateurs de pilotage, agrégats uniquement
    (calcul dans `jobs/stats_admin/kpi.py`). Pas de filtre entreprise : la page est globale."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        try:
            debut, fin = lire_periode(request.query_params)
        except PeriodeInvalide as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(calculer_kpi(debut, fin))


class AdminKpiDetailAPIView(APIView):
    """GET jobs/admin/kpi/<theme>/?date_debut=&date_fin= — détail d'un thème (évolution mensuelle,
    répartitions, classements, entonnoirs). Thèmes : croissance, activite, revenus, ia."""
    permission_classes = [IsAdminRole]

    def get(self, request, theme):
        if theme not in THEMES:
            return Response({'error': "Thème inconnu."}, status=status.HTTP_404_NOT_FOUND)
        try:
            debut, fin = lire_periode(request.query_params)
        except PeriodeInvalide as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(calculer_detail(theme, debut, fin))


TITRES_THEMES = {
    'croissance': 'Croissance', 'activite': 'Offres et candidatures',
    'revenus': 'Revenus et abonnements', 'ia': 'Qualité et IA',
}


def _onglet_kpi(detail):
    """Un thème en lignes plates : Rubrique | Élément | Valeur | Détail (un onglet Excel par thème)."""
    lignes = []
    evolution = detail['evolution']
    for serie in evolution['series']:
        for ligne in evolution['lignes']:
            lignes.append([f"Évolution mensuelle — {serie['label']}", ligne['mois'], ligne[serie['cle']], serie['unite'] or None])
    for rep in detail['repartitions']:
        for ligne in rep['lignes']:
            lignes.append([rep['titre'], ligne['libelle'], ligne['nb'], None])
    for classement in detail['classements']:
        for rang, valeurs in enumerate(classement['lignes'], start=1):
            lignes.append([classement['titre'], f"{rang}. {valeurs[0]}", valeurs[-1],
                           ' | '.join(str(v) for v in valeurs[1:-1]) or None])
    for entonnoir in detail['entonnoirs']:
        for etape in entonnoir['etapes']:
            lignes.append([entonnoir['titre'], etape['libelle'], etape['nb'], f"{etape['pct_du_total']} % du total"])
        if entonnoir.get('refusees') is not None:
            lignes.append([entonnoir['titre'], 'Refusées', entonnoir['refusees'], None])
    return (TITRES_THEMES[detail['theme']], ['Rubrique', 'Élément', 'Valeur', 'Détail'], lignes)


class AdminKpiExportAPIView(APIView):
    """GET jobs/admin/kpi/export/?date_debut=&date_fin= — un onglet par thème, tracé dans le journal d'audit."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        try:
            debut, fin = lire_periode(request.query_params)
        except PeriodeInvalide as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        onglets = [_onglet_kpi(calculer_detail(theme, debut, fin)) for theme in THEMES]
        _audit(request, 'AUTRE', f"Export KPI {debut.isoformat()} au {fin.isoformat()}")
        return reponse_xlsx_multi(f"kpi_taftech_{debut.isoformat()}_au_{fin.isoformat()}", onglets)


def _onglets(data):
    ind, evo = data['indicateurs'], data['evolution']
    offres, abo = data['offres'], data['abonnements']
    colonnes_evolution = [(cle, lib) for cle, lib in LIBELLES_EVOLUTION if evo and cle in evo[0]]
    perimetre = data['entreprise']['nom'] if data['entreprise'] else 'Toutes les entreprises'
    return [
        ('Indicateurs', ['Indicateur', 'Valeur', 'Période précédente', 'Variation (%)'], [
            [libelle, ind[cle]['valeur'], ind[cle]['precedente'], ind[cle]['variation_pct']]
            for cle, libelle in LIBELLES_INDICATEURS if cle in ind
        ] + [['Périmètre', perimetre, None, None]]),
        ('Évolution mensuelle', ['Mois'] + [libelle for _, libelle in colonnes_evolution], [
            [ligne['mois']] + [ligne[cle] for cle, _ in colonnes_evolution] for ligne in evo
        ]),
        ('Entonnoir', ['Étape', 'Candidatures', '% du total', 'Taux de passage (%)'], [
            [e['libelle'], e['nb'], e['pct_du_total'], e['taux_passage']]
            for e in data['entonnoir']['etapes']
        ] + [['Refusées', data['entonnoir']['refusees'], None, None]]),
        ('Offres', ['Indicateur', 'Valeur'], [
            ['Offres approuvées publiées', offres['offres_approuvees']],
            ['Sans aucune candidature', offres['sans_candidature']],
            ['Expirées sans candidature', offres['expirees_sans_candidature']],
            ['Candidatures par offre', offres['candidatures_par_offre']],
        ]),
        ('Matching', ['Tranche de score', 'Candidatures'], [
            [t['tranche'], t['nb']] for t in data['matching']['distribution']
        ] + [['Score moyen', data['matching']['moyenne']]]),
        ('Abonnements', ['Palier', 'Abonnements actifs', 'Paiements (période)', 'Revenu (DA)'], [
            [NOMS_PALIERS.get(p['palier'], p['palier']), p['nb'], None, None] for p in abo['par_palier']
        ] + [
            [NOMS_PALIERS.get(r['palier'], r['palier']), None, r['nb_paiements'], r['total_da']]
            for r in abo['revenu_par_palier']
        ] + [
            ['Expirent sous 7 jours', abo['expirations']['sous_7_jours'], None, None],
            ['Expirent sous 30 jours', abo['expirations']['sous_30_jours'], None, None],
        ]),
    ]


class AdminStatistiquesExportAPIView(APIView):
    """GET jobs/admin/stats-periode/export/?date_debut=&date_fin=&entreprise_id= — un onglet par bloc."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        parametres, erreur = _parametres_ou_erreur(request)
        if erreur:
            return erreur
        (debut_date, fin_date), entreprise_id = parametres
        data = construire_statistiques(debut_date, fin_date, entreprise_id)
        debut, fin = data['periode']['debut'], data['periode']['fin']
        suffixe = f"_entreprise-{entreprise_id}" if entreprise_id else ""
        detail = f"Export statistiques {debut} au {fin}" + (f" (entreprise {entreprise_id})" if entreprise_id else "")
        _audit(request, 'AUTRE', detail)
        return reponse_xlsx_multi(f"statistiques_taftech_{debut}_au_{fin}{suffixe}", _onglets(data))
