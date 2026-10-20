"""Exports Excel (.xlsx) de l'administration : une classe par liste de données.

Règles communes (SECURITY.md) :
- réservés aux administrateurs (`IsAdminRole`) ;
- mêmes filtres que la liste affichée (`admin_filtres`) : ce que l'admin voit est ce qu'il exporte ;
- chaque export est tracé dans le journal d'audit (action « AUTRE », détail « Export … (N lignes, filtres) ») ;
- le NIN n'est exporté nulle part ; les erreurs système n'exportent ni trace technique ni agent navigateur ;
- aucune formule Excel exécutable (`export_xlsx.neutraliser_formules`).
"""
from collections import Counter

from django.db.models import Count
from rest_framework.views import APIView

from accounts.models import SystemErrorLog

from ..models import AuditLog, Candidature, DemandeActivationPremium, OffreEmploi
from ..permissions import IsAdminRole
from ..profile_score import calculer_completude
from ..referentiel_utils import libelle_secteur_entreprise
from .admin import _audit
from .admin_filtres import (
    audit_logs_filtres, candidatures_filtrees, entreprises_filtrees, offres_filtrees, rendez_vous_filtres,
    utilisateurs_filtres,
)
from .demandes_ajout import demandes_ajout_filtrees
from .export_xlsx import reponse_xlsx

FORMAT_DATE = "%d/%m/%Y"
FORMAT_DATE_HEURE = "%d/%m/%Y %H:%M"
DETAIL_AUDIT_MAX = 255  # AuditLog.detail est un CharField(255)
VALEUR_FILTRE_MAX = 40
PARAMETRES_FILTRES = ('search', 'role', 'statut', 'type', 'abonnement_expire_sous')
NB_COLONNES_CANDIDAT = 23  # de « Sexe » à « Nb candidatures » dans l'export des utilisateurs


def _date(valeur, format_=FORMAT_DATE):
    return valeur.strftime(format_) if valeur else ""


def _oui_non(valeur):
    return 'Oui' if valeur else 'Non'


def _choix(objet, champ):
    """Libellé lisible d'un champ à choix (valeur brute si le champ n'en a pas)."""
    methode = getattr(objet, f'get_{champ}_display', None)
    return methode() if methode else getattr(objet, champ, "")


def _libelle(relation):
    return relation.libelle if relation is not None else ""


class ExportAdminBase(APIView):
    """Squelette : `colonnes`, `nom_fichier`, `titre_onglet`, `libelle_audit` et `lignes(params)`."""
    permission_classes = [IsAdminRole]
    nom_fichier = ''
    titre_onglet = ''
    libelle_audit = ''
    mention_audit = ''  # ajoutée à la trace d'audit des exports qui contiennent des données très sensibles
    colonnes = []

    def lignes(self, params):
        raise NotImplementedError

    @staticmethod
    def _filtres_appliques(params):
        return ", ".join(
            f"{cle}={str(params[cle])[:VALEUR_FILTRE_MAX]}" for cle in PARAMETRES_FILTRES if params.get(cle)
        )

    def get(self, request):
        lignes = list(self.lignes(request.query_params))
        filtres = self._filtres_appliques(request.query_params)
        nombre = len(lignes)
        detail = f"Export {self.libelle_audit} ({nombre} ligne{'s' if nombre > 1 else ''}{', ' + filtres if filtres else ''})"
        if self.mention_audit:
            detail += f" — {self.mention_audit}"
        _audit(request, 'AUTRE', detail[:DETAIL_AUDIT_MAX])
        return reponse_xlsx(self.nom_fichier, self.titre_onglet, self.colonnes, lignes)


class ExportUtilisateursExcelAPIView(ExportAdminBase):
    """Tous les comptes visibles dans la liste (candidats, recruteurs, administrateurs), recherche et rôle
    compris. Colonnes candidat et recruteur vides quand elles ne s'appliquent pas au rôle. Contient le NIN
    (décision de l'utilisateur, 20/10/2026) : l'audit le mentionne explicitement."""
    mention_audit = "contient le NIN, la date de naissance et l'adresse"
    nom_fichier = "utilisateurs_taftech"
    titre_onglet = "Utilisateurs"
    libelle_audit = "utilisateurs"
    colonnes = [
        'ID', 'Email', 'Nom', 'Prénom', 'Rôle', 'Actif', "Date d'inscription", 'Dernière connexion',
        'E-mail vérifié', 'Compte Google', 'Consentement loi 18-07', 'Consentement CVthèque',
        'Téléphone', 'Date de naissance', 'NIN', 'Intitulé de poste',
        'Sexe', 'Wilaya', 'Commune', 'Adresse', 'Titre professionnel',
        'Métier (appellation)', 'Métier officiel', 'Métier souhaité (appellation)', 'Métier souhaité officiel',
        "Niveau d'études", 'Situation actuelle', 'Mobilité', 'Salaire souhaité',
        'Nb expériences', 'Nb formations', 'Nb compétences', 'Langues', 'CV déposé', 'Visible CVthèque',
        'LinkedIn', 'GitHub', 'Complétude du profil (%)', 'Nb candidatures',
        'Entreprise', 'Entreprise validée', 'Palier',
    ]

    def lignes(self, params):
        users = utilisateurs_filtres(params).select_related(
            'profil_candidat', 'profil_candidat__metier', 'profil_candidat__metier_appellation',
            'profil_candidat__metier_souhaite', 'profil_candidat__metier_souhaite_appellation',
            'profil_candidat__diplome_ref', 'profil_entreprise', 'profil_entreprise__abonnement__palier',
        ).prefetch_related(
            'profil_candidat__experiences_detail', 'profil_candidat__formations_detail',
            'profil_candidat__competences_detail',
        )
        candidatures_par_candidat = dict(
            Candidature.objects.filter(candidat__isnull=False).values_list('candidat_id').annotate(n=Count('id'))
        )
        for u in users.iterator(chunk_size=500):
            yield self._ligne(u, candidatures_par_candidat.get(u.id, 0))

    @staticmethod
    def _ligne(u, nb_candidatures):
        profil = getattr(u, 'profil_candidat', None)
        entreprise = getattr(u, 'profil_entreprise', None)
        abonnement = getattr(entreprise, 'abonnement', None) if entreprise else None
        palier = getattr(abonnement, 'palier', None) if abonnement else None
        commun = [
            u.id, u.email, u.last_name, u.first_name, u.role, _oui_non(u.is_active),
            _date(u.date_joined), _date(u.last_login, FORMAT_DATE_HEURE),
            _oui_non(u.email_verifie), _oui_non(u.est_compte_google),
            _oui_non(u.consentement_loi_18_07), _oui_non(u.consentement_cvtheque),
            u.telephone or "", _date(u.date_naissance), u.nin or "", u.intitule_poste or "",
        ]
        if profil is not None:
            candidat = [
                _choix(profil, 'sexe'), profil.wilaya or "", profil.commune or "", profil.adresse or "",
                profil.titre_professionnel or "",
                _libelle(profil.metier_appellation), _libelle(profil.metier),
                _libelle(profil.metier_souhaite_appellation), _libelle(profil.metier_souhaite),
                _libelle(profil.diplome_ref), _choix(profil, 'situation_actuelle') or "", _choix(profil, 'mobilite') or "",
                profil.salaire_souhaite or "",
                len(profil.experiences_detail.all()), len(profil.formations_detail.all()),
                len(profil.competences_detail.all()), profil.langues or "",
                _oui_non(profil.cv_pdf), _oui_non(profil.visible_cvtheque),
                profil.linkedin or "", profil.github or "",
                calculer_completude(profil), nb_candidatures,
            ]
        else:
            candidat = [""] * NB_COLONNES_CANDIDAT
        recruteur = (
            [entreprise.nom_entreprise, _oui_non(entreprise.est_approuvee), palier.nom if palier else ""]
            if entreprise is not None else ["", "", ""]
        )
        return commun + candidat + recruteur


class ExportAdminCandidaturesExcelAPIView(ExportAdminBase):
    nom_fichier = "candidatures_taftech"
    titre_onglet = "Candidatures"
    libelle_audit = "candidatures"
    colonnes = [
        'ID', 'Date', 'Candidat', 'Email', 'Téléphone', 'Wilaya du candidat', 'Source', 'Candidature rapide',
        'ID offre', 'Offre', 'Entreprise', 'Statut', 'Date entretien',
        'Score IA (%)', 'Note technique', 'Note communication', 'Note motivation', 'Note expérience',
        'Note Entretien (/20)',
    ]

    def lignes(self, params):
        candidatures = candidatures_filtrees(params).select_related('candidat__profil_candidat')
        for c in candidatures.iterator(chunk_size=500):
            if c.candidat:
                nom = f"{c.candidat.last_name} {c.candidat.first_name}".strip()
                email, telephone = c.candidat.email, c.candidat.telephone or ""
                profil = getattr(c.candidat, 'profil_candidat', None)
                wilaya = (profil.wilaya if profil else "") or ""
            else:
                nom = f"{c.nom_rapide} {c.prenom_rapide}".strip() + " (rapide)"
                email, telephone, wilaya = c.email_rapide or "", c.telephone_rapide or "", ""
            yield [
                c.id, _date(c.date_postulation), nom, email, telephone, wilaya,
                _choix(c, 'source'), _oui_non(c.est_rapide),
                c.offre_id, c.offre.titre, c.offre.entreprise.nom_entreprise, c.get_statut_display(),
                _date(c.date_entretien, FORMAT_DATE_HEURE),
                c.score_matching if c.score_matching is not None else "N/A",
                c.note_technique, c.note_communication, c.note_motivation, c.note_experience,
                c.note_globale if c.note_globale is not None else "Non évalué",
            ]


class ExportEntreprisesExcelAPIView(ExportAdminBase):
    nom_fichier = "entreprises_taftech"
    titre_onglet = "Entreprises"
    libelle_audit = "entreprises"
    colonnes = [
        'ID', 'Nom', 'Slug', 'Secteur', 'Wilaya', 'Commune', 'Adresse', 'Registre de commerce', 'Taille',
        'Année de création', 'Site web', 'LinkedIn', 'Approuvée', 'Mise en avant accueil',
        'Responsable', 'Email', 'Téléphone', 'Palier', "Début d'abonnement", "Fin d'abonnement",
        'Crédits achetés restants', 'Nb offres', 'Nb candidatures reçues',
    ]

    def lignes(self, params):
        entreprises = entreprises_filtrees(params).select_related('user', 'abonnement__palier')
        nb_offres = Counter(dict(OffreEmploi.objects.values_list('entreprise_id').annotate(n=Count('id'))))
        nb_candidatures = Counter(dict(
            Candidature.objects.values_list('offre__entreprise_id').annotate(n=Count('id'))))
        for e in entreprises.iterator(chunk_size=500):
            abonnement = getattr(e, 'abonnement', None)
            palier = getattr(abonnement, 'palier', None) if abonnement else None
            yield [
                e.id, e.nom_entreprise, e.slug, libelle_secteur_entreprise(e.secteur_activite),
                e.wilaya_siege or "", e.commune_siege or "", e.adresse_complete or "", e.registre_commerce or "",
                _choix(e, 'taille_entreprise') or "", e.annee_creation or "", e.site_web or "", e.linkedin or "",
                _oui_non(e.est_approuvee), _oui_non(e.mise_en_avant_accueil),
                f"{e.user.last_name} {e.user.first_name}".strip(), e.user.email, e.user.telephone or "",
                palier.nom if palier else "",
                _date(abonnement.date_debut) if abonnement else "",
                _date(abonnement.date_expiration) if abonnement else "",
                abonnement.credits_achetes_restants if abonnement else "",
                nb_offres[e.id], nb_candidatures[e.id],
            ]


class ExportOffresExcelAPIView(ExportAdminBase):
    nom_fichier = "offres_taftech"
    titre_onglet = "Offres"
    libelle_audit = "offres"
    colonnes = [
        'ID', 'Code public', 'Titre', 'Entreprise', 'Wilaya', 'Commune', 'Contrat', 'Expérience requise',
        'Nombre de postes', 'Diplôme', 'Salaire proposé', 'Métier de référence', 'Statut',
        'Motif de rejet', 'Clôturée', 'Date', "Date d'expiration", 'Date de clôture', 'Nb candidatures',
    ]

    def lignes(self, params):
        offres = offres_filtrees(params).select_related('metier', 'diplome_ref')
        nb_candidatures = Counter(dict(Candidature.objects.values_list('offre_id').annotate(n=Count('id'))))
        for o in offres.iterator(chunk_size=500):
            yield [
                o.id, o.code_public or "", o.titre, o.entreprise.nom_entreprise, o.wilaya or "", o.commune or "",
                _choix(o, 'type_contrat') if o.type_contrat else "", _choix(o, 'experience_requise') or "",
                o.nombre_postes, _libelle(o.diplome_ref) or o.diplome or "", o.salaire_propose or "",
                _libelle(o.metier), o.get_statut_moderation_display(), o.motif_rejet or "",
                _oui_non(o.est_cloturee), _date(o.date_publication), _date(o.date_expiration),
                _date(o.date_cloture), nb_candidatures[o.id],
            ]


class ExportDemandesAjoutExcelAPIView(ExportAdminBase):
    nom_fichier = "demandes_ajout_taftech"
    titre_onglet = "Demandes d'ajout"
    libelle_audit = "demandes d'ajout"
    colonnes = [
        'ID', 'Type', 'Libellé', 'Contexte', 'Statut', 'Origine', 'Demandé par', 'Nb demandeurs',
        'Date de création', 'Date de décision', 'Traitée par', 'Entrée retenue', 'Motif de refus',
    ]

    def lignes(self, params):
        _, demandes = demandes_ajout_filtrees(params)
        demandes = demandes.select_related('premier_demandeur', 'traite_par').prefetch_related('demandeurs')
        for d in demandes.order_by('-date_creation', '-id').iterator(chunk_size=500):
            yield [
                d.id, _choix(d, 'type'), d.libelle, d.contexte or "", _choix(d, 'statut'), d.origine or "",
                d.premier_demandeur.email if d.premier_demandeur else "", len(d.demandeurs.all()),
                _date(d.date_creation, FORMAT_DATE_HEURE), _date(d.date_decision, FORMAT_DATE_HEURE),
                d.traite_par.email if d.traite_par else "", d.entree_libelle or "", d.motif_refus or "",
            ]


class ExportDemandesPremiumExcelAPIView(ExportAdminBase):
    nom_fichier = "demandes_premium_taftech"
    titre_onglet = "Demandes premium"
    libelle_audit = "demandes premium"
    colonnes = [
        'ID', 'Entreprise', 'Email', 'Téléphone', 'Moyen de paiement', 'Nombre de mois', 'Traitée',
        'Date de la demande', 'Date de traitement', 'Palier actif', "Expiration de l'abonnement",
    ]

    def lignes(self, params):
        from ..paliers_utils import get_palier_actif
        demandes = DemandeActivationPremium.objects.select_related(
            'entreprise__user', 'entreprise__abonnement__palier').order_by('-date_demande')
        # Mêmes onglets que la page (le tri « En attente / Traitées / Toutes » s'y fait côté navigateur).
        statut = params.get('statut')
        if statut == 'attente':
            demandes = demandes.filter(est_traitee=False)
        elif statut == 'traitee':
            demandes = demandes.filter(est_traitee=True)
        for d in demandes.iterator(chunk_size=500):
            abonnement = getattr(d.entreprise, 'abonnement', None)
            palier = get_palier_actif(d.entreprise)
            yield [
                d.id, d.entreprise.nom_entreprise, d.entreprise.user.email, d.entreprise.user.telephone or "",
                d.moyen_paiement, d.nb_mois, _oui_non(d.est_traitee),
                _date(d.date_demande, FORMAT_DATE_HEURE), _date(d.date_traitement, FORMAT_DATE_HEURE),
                palier.nom if palier else "",
                _date(abonnement.date_expiration) if abonnement else "",
            ]


class ExportRendezVousExcelAPIView(ExportAdminBase):
    nom_fichier = "rendez_vous_taftech"
    titre_onglet = "Rendez-vous"
    libelle_audit = "rendez-vous"
    colonnes = [
        'ID', 'Candidat', 'Email', 'Téléphone', 'Date et heure', 'Motif', 'Statut', 'Notes admin',
        'Créé le', 'Annulé le',
    ]

    def lignes(self, params):
        for r in rendez_vous_filtres(params).order_by('-date_heure').iterator(chunk_size=500):
            yield [
                r.id, f"{r.candidat.first_name} {r.candidat.last_name}".strip(), r.candidat.email,
                r.candidat.telephone or "", _date(r.date_heure, FORMAT_DATE_HEURE), r.motif or "",
                _choix(r, 'statut'), r.notes_admin or "", _date(r.date_creation, FORMAT_DATE_HEURE),
                _date(r.date_annulation, FORMAT_DATE_HEURE),
            ]


class ExportAuditLogsExcelAPIView(ExportAdminBase):
    nom_fichier = "journal_audit_taftech"
    titre_onglet = "Journal d'audit"
    libelle_audit = "journal d'audit"
    colonnes = ['ID', 'Date', 'Administrateur', 'Action', 'Action (libellé)', 'Détail', 'IP']

    def lignes(self, params):
        libelles = dict(AuditLog.ACTIONS)
        for log in audit_logs_filtres(params, self.request.user).iterator(chunk_size=500):
            yield [
                log.id, _date(log.date, FORMAT_DATE_HEURE), log.admin.email if log.admin else "—",
                log.action, libelles.get(log.action, log.action), log.detail or "", log.ip or "",
            ]


class ExportErreursSystemeExcelAPIView(ExportAdminBase):
    """Erreurs remontées par les navigateurs. Ni la trace technique (`stack_trace`) ni l'agent navigateur
    (`user_agent`) ne sont exportés : ils n'aident pas à lire la liste et peuvent contenir des données internes."""
    nom_fichier = "erreurs_systeme_taftech"
    titre_onglet = "Erreurs système"
    libelle_audit = "erreurs système"
    colonnes = ['ID', 'Date', 'Message', 'Détails', 'URL', 'Utilisateur']

    def lignes(self, params):
        for e in SystemErrorLog.objects.select_related('user').order_by('-timestamp').iterator(chunk_size=500):
            yield [
                e.id, _date(e.timestamp, FORMAT_DATE_HEURE), e.message, e.details or "", e.url or "",
                e.user.email if e.user else "",
            ]
