import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Case, When, Value, IntegerField
from django.utils import timezone
import datetime
from ..models import OffreEmploi, Candidature, EquipeActionLog, CompetenceOffre
from .equipe import get_entreprise_for_user, get_membre_role, _log
from ..serializers import (
    OffreEmploiSerializer,
    OffreEmploiCreateDTO,
    OffreDashboardDTO,
)
from ..throttles import PublicReadThrottle


# Une offre clôturée reste visible dans le flux public (badge "Poste pourvu", candidature
# désactivée) pendant cette durée au lieu de disparaître instantanément — évite que le site
# paraisse vide quand les recruteurs clôturent correctement leurs offres pourvues. Passé ce
# délai, elle disparaît réellement (pas de valeur à afficher une offre morte depuis des mois).
RETENTION_OFFRES_CLOTUREES_JOURS = 60


class JobListAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]
    def get(self, request):
        mot_cle = request.query_params.get('search', '')
        wilaya = request.query_params.get('wilaya', '')
        commune = request.query_params.get('commune', '')
        diplome_id = request.query_params.get('diplome_id', '')
        specialite = request.query_params.get('specialite', '')
        domaine_id = request.query_params.get('domaine_id', '')
        secteur_id = request.query_params.get('secteur_id', '')
        experience = request.query_params.get('experience', '')
        contrat = request.query_params.get('contrat', '')
        seuil_retention = timezone.now() - datetime.timedelta(days=RETENTION_OFFRES_CLOTUREES_JOURS)
        offres = OffreEmploi.objects.select_related('entreprise').prefetch_related('diplomes_requis').filter(
            est_active=True, statut_moderation='APPROUVEE',
        ).filter(
            Q(est_cloturee=False) | Q(est_cloturee=True, date_cloture__gte=seuil_retention)
        )
        if mot_cle:
            offres = offres.filter(Q(titre__icontains=mot_cle) | Q(missions__icontains=mot_cle))
        if wilaya:
            # Lieu principal OU l'un des lieux supplémentaires (« Oran, Mostaganem »).
            offres = offres.filter(Q(wilaya__icontains=wilaya) | Q(lieux_supplementaires__icontains=wilaya))
        if commune:
            offres = offres.filter(commune__icontains=commune)
        if diplome_id and diplome_id.isdigit():
            # Filtre référentiel v2 (remplace l'ancien `diplome` texte libre, retiré du
            # formulaire de création d'offre — un seul système de diplôme désormais, celui
            # qui alimente aussi le matching, cf. `diplomes_requis`/`specialites_requises`).
            offres = offres.filter(diplomes_requis__id=int(diplome_id))
        if specialite:
            # Référentiel v2 : un id Metier (numérique) filtre exactement ce métier ; un
            # code secteur (1 lettre, ex: "A") filtre tous les métiers de ce secteur via la
            # hiérarchie GroupeMetier (secteur_source > domaine_source > Metier).
            if specialite.isdigit():
                from ..referentiel_utils import ids_metier_avec_redirections
                offres = offres.filter(metier_id__in=ids_metier_avec_redirections(specialite))
            elif len(specialite) == 1:
                offres = offres.filter(metier__groupe_principal__parent__code_source__iexact=specialite)
        if domaine_id and domaine_id.isdigit():
            # Page "Offres par métier" (au sens GroupeMetier domaine_source, ex: "Espaces
            # naturels et espaces verts") — id GroupeMetier, pas Metier.
            offres = offres.filter(metier__groupe_principal_id=int(domaine_id))
        if secteur_id and secteur_id.isdigit():
            # Page "Offres par secteur" (référentiel v2, GroupeMetier id) — remplace le
            # filtre `specialite` à 1 lettre, qui ne couvrait que les 16 secteurs NAME
            # officiels (code_source) et pas les ~61 secteurs ajoutés par TAFTECH (code_source
            # vide). L'id GroupeMetier fonctionne pour tous les secteurs, quel que soit leur code.
            sid = int(secteur_id)
            offres = offres.filter(Q(metier__groupe_principal_id=sid) | Q(metier__groupe_principal__parent_id=sid))
        if experience:
            offres = offres.filter(experience_requise=experience)
        if contrat:
            # Contrat principal OU l'un des contrats supplémentaires (« CDD ou Mission »).
            offres = offres.filter(Q(type_contrat=contrat) | Q(types_contrat_supplementaires__contains=[contrat]))
        # Actives toujours avant les clôturées récentes, peu importe le tri secondaire
        offres = offres.annotate(
            priorite_cloture=Case(When(est_cloturee=True, then=Value(1)), default=Value(0), output_field=IntegerField())
        ).order_by('priorite_cloture', '-date_publication')
        paginator = PageNumberPagination()
        paginator.page_size = 5
        page = paginator.paginate_queryset(offres, request)
        serializer = OffreEmploiSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class JobDetailAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]
    def get(self, request, offre_id):
        # `offre_id` est soit l'ID numérique historique (liens internes non publics :
        # admin, favoris, retour de candidature), soit le `code_public` court utilisé
        # dans les URLs SEO imbriquées (/entreprises/.../offres-d-emploi/.../titre-code).
        lookup = {'id': offre_id} if str(offre_id).isdigit() else {'code_public': offre_id}
        seuil_retention = timezone.now() - datetime.timedelta(days=RETENTION_OFFRES_CLOTUREES_JOURS)
        try:
            offre = OffreEmploi.objects.select_related('entreprise').filter(
                Q(est_cloturee=False) | Q(est_cloturee=True, date_cloture__gte=seuil_retention)
            ).get(est_active=True, statut_moderation='APPROUVEE', **lookup)
            serializer = OffreEmploiSerializer(offre)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus disponible."}, status=status.HTTP_404_NOT_FOUND)


_ROLES_ACTION = ('PROPRIETAIRE', 'ADMIN', 'UTILISATEUR')

_TYPES_EXIGENCE_VALIDES = {choix[0] for choix in CompetenceOffre.TYPE_EXIGENCE_CHOICES}
_NIVEAUX_VALIDES = {choix[0] for choix in CompetenceOffre.NIVEAU_CHOICES}


def _synchroniser_competences_offre(offre, items):
    """Remplace intégralement les compétences structurées d'une offre à partir d'une liste
    [{label, type_exigence, niveau_requis}] — appelé à la création et sur toute mise à jour
    qui inclut explicitement la clé `competences_requises` (sémantique remplacement, pas merge,
    cohérent avec le fait que le recruteur revoit toujours la liste complète dans l'UI)."""
    offre.competences_requises.all().delete()
    if not items:
        return
    from ..referentiel_utils import construire_index_competences, resoudre_competence_ref
    index_competences = construire_index_competences()
    vues = set()
    a_creer = []
    for item in items:
        if not isinstance(item, dict):
            continue
        label = str(item.get('label', '')).strip()[:100]
        if not label:
            continue
        # Point 10 : la compétence est normalisée sur le référentiel commun au candidat (libellé
        # canonique + lien) ; un synonyme (« Project Management ») devient « Gestion de projet ».
        ref = resoudre_competence_ref(label, index_competences)
        if ref:
            label = ref.label[:100]
        if label.lower() in vues:
            continue
        vues.add(label.lower())
        type_exigence = item.get('type_exigence') or 'OBLIGATOIRE'
        if type_exigence not in _TYPES_EXIGENCE_VALIDES:
            type_exigence = 'OBLIGATOIRE'
        niveau_requis = item.get('niveau_requis') or None
        if niveau_requis not in _NIVEAUX_VALIDES:
            niveau_requis = None
        a_creer.append(CompetenceOffre(
            offre=offre, label=label, competence_ref=ref, type_exigence=type_exigence, niveau_requis=niveau_requis))
    if a_creer:
        CompetenceOffre.objects.bulk_create(a_creer)
        # Compétence hors référentiel saisie dans l'offre : demande d'ajout implicite visible de l'admin.
        from ..demandes_ajout import demander_competence_saisie
        for competence in a_creer:
            if competence.competence_ref is None:
                demander_competence_saisie(offre.entreprise.user, competence.label)


def _synchroniser_diplomes_requis_offre(offre, diplome_ids, specialite_ids):
    """Remplace intégralement les diplômes/spécialités requis par le recruteur (REGLES_MATCHING
    S05/S06) — deux listes plates INDÉPENDANTES, jamais un couple imposé (F06 : ne jamais
    déduire une équivalence/un rang entre diplôme et spécialité). Chaque liste vide/absente
    signifie "ce critère n'est pas demandé pour le matching" (exclu du calcul, S01) —
    `OffreEmploi.diplome` reste affiché sur l'annonce et sert de filtre de recherche, mais
    n'est plus lu par le matcher depuis la réécriture S01-S14."""
    from ..models import TypeDiplome, SpecialiteFormation
    diplome_ids = diplome_ids or []
    specialite_ids = specialite_ids or []
    offre.diplomes_requis.set(TypeDiplome.objects.filter(pk__in=diplome_ids))
    offre.specialites_requises.set(SpecialiteFormation.objects.filter(pk__in=specialite_ids))


def _synchroniser_exigences_offre(offre, items):
    """S12 (REGLES_MATCHING) — remplace intégralement les exigences impératives de l'offre
    (permis, habilitation, droit d'exercice...) à partir d'une liste
    [{label, description, justificatif_requis}], même sémantique remplacement que compétences/
    couples diplôme+spécialité. Ces exigences ne participent jamais au score de matching —
    seulement à un contrôle d'éligibilité vérifié manuellement par le recruteur."""
    from ..models import ExigenceImperative
    offre.exigences_imperatives.all().delete()
    if not items:
        return
    vues = set()
    a_creer = []
    for item in items:
        if not isinstance(item, dict):
            continue
        label = str(item.get('label', '')).strip()[:150]
        if not label or label.lower() in vues:
            continue
        vues.add(label.lower())
        description = str(item.get('description', '') or '')[:2000]
        justificatif_requis = bool(item.get('justificatif_requis'))
        categorie = item.get('categorie')
        if categorie not in dict(ExigenceImperative.CATEGORIE_CHOICES):
            categorie = 'AUTRE'
        a_creer.append(ExigenceImperative(
            offre=offre, label=label, description=description, justificatif_requis=justificatif_requis,
            categorie=categorie,
        ))
    if a_creer:
        ExigenceImperative.objects.bulk_create(a_creer)


_NIVEAU_LABELS = dict(CompetenceOffre.NIVEAU_CHOICES)


def _texte_depuis_competences(competences_requises):
    """Génère le texte affiché sur l'annonce à partir des compétences structurées — seule
    source de vérité pour le recruteur (il ne remplit plus le texte libre à la main), évite
    toute divergence entre les deux."""
    lignes = []
    for comp in competences_requises:
        niveau = f" (niveau {_NIVEAU_LABELS.get(comp.niveau_requis, comp.niveau_requis)} minimum)" if comp.niveau_requis else ""
        exigence = "Obligatoire" if comp.type_exigence == 'OBLIGATOIRE' else "Souhaitée"
        lignes.append(f"- {comp.label}{niveau} — {exigence}")
    return "\n".join(lignes)


def _limite_offres_atteinte(entreprise, exclure_offre_id=None):
    """Retourne la limite du palier si l'entreprise l'a déjà atteinte, sinon None.

    Compte les offres APPROUVEES **et EN_ATTENTE** non clôturées : sans les offres en attente, on
    pouvait en déposer un nombre illimité pendant la modération puis dépasser la limite dès leur
    approbation. `exclure_offre_id` évite de compter l'offre qu'on est en train de resoumettre."""
    from ..paliers_utils import limite_offres_actives
    limite = limite_offres_actives(entreprise)
    if limite is None:
        return None
    offres = OffreEmploi.objects.filter(
        entreprise=entreprise, statut_moderation__in=['APPROUVEE', 'EN_ATTENTE'], est_cloturee=False,
    )
    if exclure_offre_id is not None:
        offres = offres.exclude(pk=exclure_offre_id)
    return limite if offres.count() >= limite else None


class JobCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise inexistant."}, status=403)
        if not entreprise.est_approuvee:
            return Response({"error": "Votre entreprise doit être validée par TafTech avant de publier."}, status=status.HTTP_403_FORBIDDEN)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        limite = _limite_offres_atteinte(entreprise)
        if limite is not None:
            return Response(
                {"error": f"Limite d'offres actives atteinte ({limite}) pour votre palier. Passez à un palier supérieur pour publier plus d'offres.", "code": "LIMITE_OFFRES_ATTEINTE"},
                status=403,
            )
        serializer = OffreEmploiCreateDTO(data=request.data)
        if serializer.is_valid():
            offre = serializer.save(entreprise=entreprise)
            _synchroniser_competences_offre(offre, request.data.get('competences_requises'))
            _synchroniser_diplomes_requis_offre(offre, request.data.get('diplomes_requis'), request.data.get('specialites_requises'))
            _synchroniser_exigences_offre(offre, request.data.get('exigences_imperatives'))
            if offre.competences_requises.exists():
                offre.competences = _texte_depuis_competences(offre.competences_requises.all())
                offre.save(update_fields=['competences'])
            _log(request.user, entreprise, 'CREER_OFFRE', offre.titre)
            # Notifier tous les admins
            from django.contrib.auth import get_user_model
            from ..models import Notification
            User = get_user_model()
            admins = User.objects.filter(is_staff=True, is_active=True)
            for admin in admins:
                Notification.objects.create(
                    destinataire=admin,
                    type_notif='INFO',
                    titre="Nouvelle offre à valider",
                    message=f"Nouvelle offre en attente de validation : « {offre.titre} » — {entreprise.nom_entreprise}",
                    lien='/admin-taftech/offres',
                )
            # Réponse au recruteur qui vient de créer l'offre : il voit son métier de référence.
            return Response(
                OffreEmploiSerializer(offre, context={'inclure_metier_reference': True}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateOffreRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=404)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or offre.entreprise != entreprise:
            return Response({"error": "Non autorisé."}, status=403)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        # date_expiration seule → autorisé même si APPROUVEE
        if offre.statut_moderation == "APPROUVEE" and set(request.data.keys()) - {"date_expiration"}:
            return Response({"error": "Impossible de modifier une offre déjà publiée."}, status=400)
        # Une offre REJETEE n'est pas comptée dans la limite ; la corriger la remet EN_ATTENTE
        # (donc comptée) : on revérifie ici, sinon le refus puis la resoumission contournent la limite.
        if offre.statut_moderation == "REJETEE" and not offre.est_cloturee:
            limite = _limite_offres_atteinte(entreprise, exclure_offre_id=offre.id)
            if limite is not None:
                return Response(
                    {"error": f"Limite d'offres actives atteinte ({limite}) pour votre palier : impossible de soumettre à nouveau cette offre.", "code": "LIMITE_OFFRES_ATTEINTE"},
                    status=403,
                )
        serializer = OffreEmploiCreateDTO(offre, data=request.data, partial=True)
        if serializer.is_valid():
            if offre.statut_moderation == "APPROUVEE":
                serializer.save()
            else:
                serializer.save(statut_moderation="EN_ATTENTE", motif_rejet="")
            if 'competences_requises' in request.data:
                _synchroniser_competences_offre(offre, request.data.get('competences_requises'))
                if offre.competences_requises.exists():
                    offre.competences = _texte_depuis_competences(offre.competences_requises.all())
                    offre.save(update_fields=['competences'])
            if 'diplomes_requis' in request.data or 'specialites_requises' in request.data:
                _synchroniser_diplomes_requis_offre(offre, request.data.get('diplomes_requis'), request.data.get('specialites_requises'))
            if 'exigences_imperatives' in request.data:
                _synchroniser_exigences_offre(offre, request.data.get('exigences_imperatives'))
            _log(request.user, offre.entreprise, 'MODIFIER_OFFRE', offre.titre)
            return Response({
                "message": "Offre mise à jour.",
                "offre": OffreDashboardDTO(offre).data
            }, status=200)
        return Response(serializer.errors, status=400)


class CloturerOffreAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or offre.entreprise != entreprise:
            return Response({"error": "Vous n'êtes pas autorisé à modifier cette offre."}, status=status.HTTP_403_FORBIDDEN)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        from django.utils import timezone
        offre.est_cloturee = True
        offre.date_cloture = timezone.now()
        offre.save()
        _log(request.user, offre.entreprise, 'CLOTURER_OFFRE', offre.titre)
        return Response({"message": "Offre clôturée avec succès."}, status=status.HTTP_200_OK)


class SupprimerOffreAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or offre.entreprise != entreprise:
            return Response({"error": "Vous n'êtes pas autorisé à supprimer cette offre."}, status=status.HTTP_403_FORBIDDEN)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        # Verrou métier : seule une offre jamais publiée (en attente ou rejetée) peut être supprimée.
        # Une offre déjà approuvée doit être clôturée, jamais supprimée (historique/candidatures à préserver).
        if offre.statut_moderation not in ("EN_ATTENTE", "REJETEE"):
            return Response({"error": "Seule une offre en attente ou rejetée peut être supprimée."}, status=400)
        if offre.candidatures.exists():
            return Response({"error": "Impossible de supprimer une offre ayant déjà reçu des candidatures."}, status=400)
        titre = offre.titre
        offre.delete()
        _log(request.user, entreprise, 'SUPPRIMER_OFFRE', titre)
        return Response({"message": "Offre supprimée avec succès."}, status=status.HTTP_200_OK)


class ConstantsAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]
    def get(self, request):
        from django.core.cache import cache
        cached = cache.get('jobs_constants')
        if cached:
            return Response(cached, status=status.HTTP_200_OK)
        from ..constants import WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT
        from ..models import ProfilCandidat
        from ..referentiel_utils import normaliser_recherche
        data = {
            "wilayas": [{"value": item[0], "label": item[1]} for item in WILAYAS_CHOICES],
            "secteurs": sorted(
                ({"value": item[0], "label": item[1]} for item in SECTEURS_CHOICES),
                key=lambda s: normaliser_recherche(s["label"]),
            ),
            "diplomes": [{"value": item[0], "label": item[1]} for item in DIPLOMES_CHOICES],
            "experiences": [{"value": item[0], "label": item[1]} for item in NIVEAUX_EXPERIENCE],
            "contrats": [{"value": item[0], "label": item[1]} for item in TYPES_CONTRAT],
            "mobilites": [{"value": item[0], "label": item[1]} for item in ProfilCandidat.MOBILITE_CHOICES],
            "disponibilites": [{"value": item[0], "label": item[1]} for item in ProfilCandidat.SITUATION_ACTUELLE],
            "services_militaires": [{"value": item[0], "label": item[1]} for item in ProfilCandidat.SERVICE_MILITAIRE_CHOICES],
        }
        cache.set('jobs_constants', data, timeout=3600)
        return Response(data, status=status.HTTP_200_OK)


class NomenclatureAPIView(APIView):
    """Arbre Secteur > Domaine > Métier (référentiel v2, GroupeMetier hiérarchique), pour
    les pages publiques de navigation ("Offres par secteur/métier") — remplace l'ancien
    Secteur/Domaine/SousDomaine ANEM (cutover complet, session 18/09/2026). Les formulaires
    de saisie (offre/profil) utilisent désormais l'autocomplete `MetierAutocompleteAPIView`,
    pas cette cascade."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]
    def get(self, request):
        from django.core.cache import cache
        cached = cache.get('jobs_nomenclature_v2')
        if cached:
            return Response(cached, status=status.HTTP_200_OK)
        from ..models import GroupeMetier, Metier
        from ..referentiel_utils import _nettoyer_libelle_secteur_nsec, _dedupliquer_secteurs, trier_secteurs
        secteurs = GroupeMetier.objects.filter(type_groupe='secteur_source')
        domaines = GroupeMetier.objects.filter(type_groupe='domaine_source').select_related('parent')
        # `code_source` (ex: "A", "A11") est le code court d'origine, sans tiret —
        # `code` (groupe_id, ex: "NSEC-A") est un identifiant interne non adapté aux URLs.
        secteurs_data = trier_secteurs(_dedupliquer_secteurs([
            {"id": s.id, "code": s.code_source or s.code, "libelle": _nettoyer_libelle_secteur_nsec(s.libelle)}
            for s in secteurs
        ]))
        data = {
            "secteurs": secteurs_data,
            "domaines": [
                {
                    "id": d.id, "code": d.code_source or d.code, "libelle": d.libelle,
                    "secteur_code": (d.parent.code_source or d.parent.code) if d.parent else None,
                }
                for d in domaines
            ],
            "metiers": [
                {"id": m.id, "libelle": m.libelle, "domaine_id": m.groupe_principal_id}
                for m in Metier.objects.filter(selectionnable=True).only('id', 'libelle', 'groupe_principal_id')
            ],
        }
        cache.set('jobs_nomenclature_v2', data, timeout=3600)
        return Response(data, status=status.HTTP_200_OK)


class NomenclatureFormationAPIView(APIView):
    """Arbre complet Type de diplôme / Domaine / Filière / Spécialité (référentiel v2 client) +
    couples attestés Diplôme+Spécialité — alimente la cascade du formulaire "Ajouter une
    formation" (FORMULAIRE/REGLES_FORMATION F01-F03), filtré côté client comme wilaya→commune."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        from django.core.cache import cache
        cached = cache.get('jobs_nomenclature_formation_v3')
        if cached:
            return Response(cached, status=status.HTTP_200_OK)
        from ..models import TypeDiplome, DomaineFormation, FiliereFormation, SpecialiteFormation, DiplomeSpecialite
        from ..models import Scolarite
        from ..referentiel_utils import (
            famille_formation, FAMILLES_FORMATION, FAMILLES_PAR_NIVEAU_ETUDES, TYPES_EXCLUS_PAR_NIVEAU_ETUDES,
        )
        # Point 8 : chaque type de diplôme, domaine et spécialité porte sa `famille` (supérieur /
        # formation professionnelle / thèmes TafTech) pour que l'interface ne les mélange jamais
        # dans une même liste. Le domaine « non répertorié » (D-AUTRE) est géré par le flux
        # « Autre, préciser », pas proposé comme un domaine.
        domaines = list(DomaineFormation.objects.filter(actif=True).exclude(code='D-AUTRE').order_by('libelle'))
        famille_par_domaine = {d.id: famille_formation(d.systeme) for d in domaines}
        data = {
            "familles": [{"code": code, "libelle": libelle} for code, libelle in FAMILLES_FORMATION.items()],
            # 1ʳᵉ étape de la cascade : niveau d'études -> familles de diplômes proposées.
            "niveaux_etudes": [
                {"id": s.id, "code": s.code, "libelle": s.libelle, "usage": s.usage,
                 "familles": FAMILLES_PAR_NIVEAU_ETUDES.get(s.code, []),
                 # Types de diplôme exclus malgré la famille (ex. pas de baccalauréat au collège).
                 "types_exclus": TYPES_EXCLUS_PAR_NIVEAU_ETUDES.get(s.code, [])}
                for s in Scolarite.objects.order_by('id')
            ],
            "types_diplomes": [
                {"id": d.id, "code": d.code, "libelle": d.libelle, "systeme": d.systeme,
                 "famille": famille_formation(d.systeme)}
                for d in TypeDiplome.objects.filter(selectionnable=True).order_by('systeme', 'libelle')
            ],
            "domaines": [
                {"id": d.id, "libelle": d.libelle, "famille": famille_par_domaine[d.id]}
                for d in domaines
            ],
            "filieres": [
                {"id": f.id, "libelle": f.libelle, "domaine_id": f.domaine_id}
                for f in FiliereFormation.objects.filter(actif=True).order_by('libelle')
            ],
            "specialites": [
                {"id": s.id, "code": s.code, "libelle": s.libelle, "domaine_id": s.domaine_id, "filiere_id": s.filiere_id,
                 "famille": famille_par_domaine.get(s.domaine_id, 'autre')}
                for s in SpecialiteFormation.objects.filter(selectionnable=True).order_by('libelle')
            ],
            # Couples attestés — le frontend les met en avant dans la liste des spécialités
            # dès qu'un type de diplôme est choisi (REGLES_FORMATION F02).
            "diplome_specialite": [
                {"id": ds.id, "diplome_id": ds.diplome_id, "specialite_id": ds.specialite_id}
                for ds in DiplomeSpecialite.objects.filter(selectionnable=True)
            ],
        }
        cache.set('jobs_nomenclature_formation_v3', data, timeout=3600)
        return Response(data, status=status.HTTP_200_OK)


class SuggererDiplomeAPIView(APIView):
    """Suggère un `TypeDiplome`/`SpecialiteFormation` du référentiel v2 à partir d'un
    intitulé déclaré en texte libre (flux "Autre, préciser" — retour client 26/09/2026) :
    quand le candidat ne trouve pas son diplôme dans les listes déroulantes, il tape
    l'intitulé réel, cet endpoint tente une correspondance (mots-clés puis IA en dernier
    recours, voir `resoudre_diplome_et_specialite_depuis_texte`) et la propose pour
    confirmation — ne l'enregistre jamais lui-même, l'IA ne doit jamais inventer une
    équivalence sans validation humaine (consigne client explicite)."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        texte = (request.query_params.get('texte') or '').strip()
        if not texte:
            return Response({"trouve": False})
        diplome_id = request.query_params.get('diplome_id')
        if diplome_id:
            # Type de diplôme déjà connu/confirmé — le candidat tape "Autre, préciser"
            # uniquement sur le champ Spécialité, résolution restreinte à ce diplôme précis.
            from ..referentiel_utils import resoudre_specialite_depuis_texte
            specialite = resoudre_specialite_depuis_texte(diplome_id, texte)
            if not specialite:
                return Response({"trouve": False})
            return Response({
                "trouve": True,
                "diplome_ref": None,
                "diplome_ref_libelle": None,
                "specialite_ref": specialite.id,
                "specialite_ref_libelle": specialite.libelle,
            })
        from ..referentiel_utils import resoudre_diplome_et_specialite_depuis_texte
        diplome, specialite = resoudre_diplome_et_specialite_depuis_texte(texte)
        if not diplome:
            return Response({"trouve": False})
        return Response({
            "trouve": True,
            "diplome_ref": diplome.id,
            "diplome_ref_libelle": diplome.libelle,
            "specialite_ref": specialite.id if specialite else None,
            "specialite_ref_libelle": specialite.libelle if specialite else None,
        })


class MetierAutocompleteAPIView(APIView):
    """Recherche libre sur les appellations de poste (référentiel v2, 7428 entrées) — retourne
    un `metier_id` déjà résolu vers son `metier_canonique` (R04) et le libellé précis de
    l'appellation trouvée (à conserver tel quel côté candidat/offre, R03 : une fiche métier
    peut regrouper plusieurs postes distincts).

    Chaque résultat garde ses clés historiques (`metier_id`/`metier_libelle`/
    `appellation_libelle`, consommées par MetierAutocomplete.jsx) et ajoute, en plus, la forme
    recommandée par IMPORT étape 11 (`id`, `label`, `type_entite`, `contexte`, `source`,
    `statut`, `ambiguite`) — additif, pas un remplacement, pour ne rien casser côté frontend.
    Pagination via `limit`/`offset` (défaut 20/0, comme avant l'ajout du contrat)."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        from ..models import Appellation
        from ..referentiel_utils import normaliser_recherche, corriger_mots_flous, q_mots_cle_recherche
        from ..referentiel_utils import developper_abreviations
        search_brut = normaliser_recherche(request.query_params.get('search'))
        # « gestionnaire rh » doit trouver « … ressources humaines » ; l'espace final (mot
        # terminé) est conservé car il change le traitement du dernier mot (préfixe ou entier).
        search = developper_abreviations(search_brut) + (' ' if search_brut.endswith(' ') else '')
        # Un sigle qui existe tel quel comme appellation (« DAF ») n'est jamais développé.
        if search.strip() != search_brut.strip() and Appellation.objects.filter(
                cle_recherche=search_brut.strip(), actif=True).exists():
            search = search_brut
        if not search.strip():
            return Response([])
        try:
            limit = min(max(int(request.query_params.get('limit', 20)), 1), 100)
        except (TypeError, ValueError):
            limit = 20
        try:
            offset = max(int(request.query_params.get('offset', 0)), 0)
        except (TypeError, ValueError):
            offset = 0
        mots = corriger_mots_flous(search.split())  # N04 : flou Levenshtein<=1, exact d'abord
        # N02 : limite de mot entier (pas icontains) — "c" ne doit jamais matcher "cpp"/"c#"
        # en tant que sous-chaîne (bug trouvé le 21/09/2026 en écrivant RechercheUniverselle).
        # Autocomplete "en direct" : le DERNIER mot est traité en préfixe (pas encore fini de
        # taper), les mots précédents restent exigés en entier — sans ça, taper "developpe"
        # (avant de finir "développeur") ne matchait plus RIEN tant que le mot n'était pas
        # complet, contrairement au comportement attendu d'un champ de recherche instantanée
        # (bug réel signalé le 24/09/2026 : "rien ne sort en tapant, seulement une fois fini").
        # Un dernier mot d'1 lettre reste exigé en entier (pas en préfixe) — sinon "c" seul
        # matcherait à tort "cpp"/"csharp" comme au tout début du bug N02 (21/09/2026) ; un
        # dernier mot de 2+ lettres est traité en préfixe (cas normal de la frappe en cours).
        if mots and not search.endswith(' ') and len(mots[-1]) >= 2:
            *mots_complets, dernier = mots
            q = q_mots_cle_recherche(mots_complets) if mots_complets else Q()
            prefixe = Q(cle_recherche__iregex=r'(^|\s)' + re.escape(dernier))
            q = (q & prefixe) if mots_complets else prefixe
        else:
            q = q_mots_cle_recherche(mots)
        # R07 : ordre du rappel exact > préfixe > reste — sans ce tri, un vrai match exact
        # (ex. "controle de" -> "Contrôle de conformité...") peut tomber hors des `limit`
        # premiers résultats parmi des centaines de matches par mots dispersés, dans un ordre
        # DB non déterministe (bug réel trouvé le 24/09/2026 : métier introuvable en recherche).
        priorite = Case(
            When(cle_recherche=search, then=Value(0)),
            When(cle_recherche__istartswith=search, then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )
        appellations = (
            Appellation.objects.filter(q, actif=True, metier__selectionnable=True)
            .annotate(_priorite=priorite)
            .select_related('metier', 'metier__metier_canonique', 'metier__groupe_principal')
            .order_by('_priorite', 'cle_recherche')[:offset + limit + 50]
        )
        resultats = []
        vus = set()
        for app in appellations:
            metier = app.metier.metier_canonique or app.metier
            if metier.id in vus:
                continue
            vus.add(metier.id)
            resultats.append({
                # Clés historiques — MetierAutocomplete.jsx et ses consommateurs.
                "metier_id": metier.id,
                "metier_libelle": metier.libelle,
                "appellation_libelle": app.libelle,
                "appellation_id": app.id,  # le candidat peut conserver l'appellation choisie (affichage)
                # Forme recommandée par IMPORT étape 11 (api_reference).
                "id": metier.id,
                "label": metier.libelle,
                "type_entite": "metier",
                "contexte": metier.groupe_principal.libelle if metier.groupe_principal_id else "",
                "source": metier.source_id or app.source_id,
                "statut": metier.statut,
                "ambiguite": app.ambiguite,
            })
            if len(resultats) >= offset + limit:
                break
        return Response(resultats[offset:offset + limit])


class RechercheUniverselleAPIView(APIView):
    """R01/R02 (REGLES_MATCHING) — résout une requête libre INDÉPENDAMMENT contre chacun des
    4 référentiels (métiers/appellations, compétences, diplômes, spécialités de formation) et
    présente le type de chaque résultat, plutôt que de deviner un seul type à l'avance. Si une
    clé cible plusieurs entrées ambiguës (`ambiguite=True` côté alias diplôme/spécialité), elles
    sont toutes renvoyées avec leur contexte (domaine, système) — jamais un choix arbitraire.

    Chaque résultat garde ses clés historiques (`type`/`libelle`/`ambigu`, vérifiées par
    test_recherche_universelle.py) et ajoute la forme recommandée par IMPORT étape 11
    (`type_entite`, `label`, `source`, `statut`, `ambiguite`) — additif. `limit`/`offset`
    (défaut 10/0 par catégorie, comme avant l'ajout du contrat) paginent chaque liste."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        from ..models import Appellation, CompetenceReferentiel, TypeDiplome, AliasDiplome, SpecialiteFormation, AliasSpecialite, DiplomeSpecialite
        from ..referentiel_utils import normaliser_recherche, corriger_mots_flous, q_mots_cle_recherche
        from ..constants import WILAYAS_LIST

        search_norm = normaliser_recherche(request.query_params.get('q'))
        if not search_norm:
            return Response({"metiers": [], "competences": [], "diplomes": [], "specialites": [], "localisation": None})
        tous_mots = search_norm.split()
        try:
            limit = min(max(int(request.query_params.get('limit', 10)), 1), 50)
        except (TypeError, ValueError):
            limit = 10
        try:
            offset = max(int(request.query_params.get('offset', 0)), 0)
        except (TypeError, ValueError):
            offset = 0

        # R06 (requête composée, ex: "data analyst Alger") : reconnaître métier ET
        # localisation séparément — une wilaya reconnue dans la requête est extraite à part et
        # retirée des jetons envoyés aux 4 référentiels, pour ne pas polluer leur recherche
        # (ex: "Alger" ne doit jamais matcher une compétence ou un diplôme).
        wilayas_normalisees = {normaliser_recherche(w): w for w in WILAYAS_LIST}
        mots_wilaya, mots_reste = [], []
        for mot in tous_mots:
            if mot in wilayas_normalisees:
                mots_wilaya.append(mot)
            else:
                mots_reste.append(mot)
        localisation = wilayas_normalisees[mots_wilaya[0]] if mots_wilaya else None

        mots = corriger_mots_flous(mots_reste)
        search_reste = ' '.join(mots_reste)
        metiers, competences, diplomes = [], [], []
        vus_d = set()

        if mots:
            q_mots = q_mots_cle_recherche(mots)

            # Métiers — même logique que MetierAutocompleteAPIView (dédupliquée par métier
            # canonique, R04), retaggée avec le type "metier" pour l'affichage.
            vus = set()
            for app in (Appellation.objects.filter(q_mots, actif=True, metier__selectionnable=True)
                        .select_related('metier', 'metier__metier_canonique', 'metier__groupe_principal')[:10]):
                metier = app.metier.metier_canonique or app.metier
                if metier.id in vus:
                    continue
                vus.add(metier.id)
                metiers.append({
                    "type": "metier", "id": metier.id, "libelle": metier.libelle,
                    "appellation_libelle": app.libelle,
                    "contexte": metier.groupe_principal.libelle if metier.groupe_principal_id else "",
                    "type_entite": "metier", "label": metier.libelle,
                    "source": metier.source_id or app.source_id, "statut": metier.statut,
                    "ambiguite": app.ambiguite,
                })

            # Compétences — pas de `cle_recherche` dédiée sur ce référentiel (table modeste,
            # 368 lignes), comparaison en Python sur label ET synonymes (ALIAS_COMPETENCES).
            for c in CompetenceReferentiel.objects.filter(actif=True):
                if search_reste in normaliser_recherche(c.label) or search_reste in normaliser_recherche(c.synonymes):
                    competences.append({
                        "type": "competence", "id": c.id, "libelle": c.label, "contexte": "",
                        "type_entite": "competence", "label": c.label, "source": c.source_id,
                        "statut": "actif" if c.actif else "inactif", "ambiguite": False,
                    })
                    if len(competences) >= 10:
                        break

            # Diplômes — recherche sur le libellé et les alias (AliasDiplome.cle_recherche déjà
            # normalisé à l'import), `ambigu` reprend le flag du référentiel client (ne jamais
            # décider seul lequel choisir). mode='or' : une requête composée (R06, "BTS
            # informatique") ne met qu'UN mot par entité — exiger tous les mots ici manquerait
            # systématiquement le diplôme quand l'autre moitié de la requête vise la spécialité.
            q_mots_or = q_mots_cle_recherche(mots, mode='or')
            alias_diplomes = AliasDiplome.objects.filter(q_mots_or).select_related('diplome')[:15]
            for a in alias_diplomes:
                if a.diplome_id in vus_d:
                    continue
                vus_d.add(a.diplome_id)
                diplomes.append({
                    "type": "diplome", "id": a.diplome_id, "libelle": a.diplome.libelle,
                    "contexte": a.diplome.systeme, "ambigu": a.ambiguite,
                    "type_entite": "diplome", "label": a.diplome.libelle,
                    "source": a.diplome.source_id or a.source_id,
                    "statut": "selectionnable" if a.diplome.selectionnable else "non_selectionnable",
                    "ambiguite": a.ambiguite,
                })
            if len(diplomes) < 10:
                # TypeDiplome n'a pas de `cle_recherche` dédiée (contrairement aux alias) —
                # recherche directe sur son seul champ texte, `libelle`.
                q_libelle_diplome = Q()
                for mot in mots:
                    q_libelle_diplome |= Q(libelle__icontains=mot)
                for d in TypeDiplome.objects.filter(q_libelle_diplome, selectionnable=True).exclude(id__in=vus_d)[:10 - len(diplomes)]:
                    diplomes.append({
                        "type": "diplome", "id": d.id, "libelle": d.libelle, "contexte": d.systeme, "ambigu": False,
                        "type_entite": "diplome", "label": d.libelle, "source": d.source_id,
                        "statut": "selectionnable", "ambiguite": False,
                    })

            # Spécialités de formation — même principe, contexte = domaine (utile pour
            # distinguer deux spécialités homonymes de domaines différents, F05).
            specialites = []
            vus_s = set()
            alias_specialites = AliasSpecialite.objects.filter(q_mots_or).select_related('specialite', 'specialite__domaine')[:15]
            for a in alias_specialites:
                if a.specialite_id in vus_s:
                    continue
                vus_s.add(a.specialite_id)
                specialites.append({
                    "type": "specialite", "id": a.specialite_id, "libelle": a.specialite.libelle,
                    "contexte": a.specialite.domaine.libelle, "ambigu": a.ambiguite,
                    "type_entite": "specialite", "label": a.specialite.libelle,
                    "source": a.specialite.source_id or a.source_id,
                    "statut": "selectionnable" if a.specialite.selectionnable else "non_selectionnable",
                    "ambiguite": a.ambiguite,
                })
            if len(specialites) < 10:
                for s in (SpecialiteFormation.objects.filter(q_mots_or, selectionnable=True)
                          .exclude(id__in=vus_s).select_related('domaine')[:10 - len(specialites)]):
                    specialites.append({
                        "type": "specialite", "id": s.id, "libelle": s.libelle, "contexte": s.domaine.libelle, "ambigu": False,
                        "type_entite": "specialite", "label": s.libelle, "source": s.source_id,
                        "statut": "selectionnable", "ambiguite": False,
                    })
        else:
            specialites = []

        # Pagination (api_reference, IMPORT étape 11) — appliquée après recherche/dédoublonnage,
        # avant le calcul des couples (T23 ci-dessous doit refléter ce que la réponse renvoie
        # réellement, pas les résultats internes non paginés).
        metiers = metiers[offset:offset + limit]
        competences = competences[offset:offset + limit]
        diplomes = diplomes[offset:offset + limit]
        specialites = specialites[offset:offset + limit]

        # R06 (requête composée, ex: "BTS informatique") : quand un diplôme ET une spécialité
        # ont TOUS LES DEUX été résolus à partir de la même requête, ne confirmer un "couple
        # trouvé" que s'ils forment vraiment une formation attestée (DiplomeSpecialite) — sinon
        # les deux restent des résultats indépendants, jamais présentés comme liés à tort
        # (T23 : "les termes doivent appartenir à la même formation").
        couples_valides = []
        if diplomes and specialites:
            paires = DiplomeSpecialite.objects.filter(
                diplome_id__in=[d["id"] for d in diplomes],
                specialite_id__in=[s["id"] for s in specialites],
                selectionnable=True,
            ).select_related('diplome', 'specialite')
            for p in paires:
                couples_valides.append({
                    "diplome_id": p.diplome_id, "diplome_libelle": p.diplome.libelle,
                    "specialite_id": p.specialite_id, "specialite_libelle": p.specialite.libelle,
                })

        return Response({
            "metiers": metiers, "competences": competences,
            "diplomes": diplomes, "specialites": specialites,
            "localisation": localisation,
            "couples_diplome_specialite_valides": couples_valides,
        })


class MetierSuggestionsAPIView(APIView):
    """Suggestions de compétences et de spécialités pour un `Metier` donné (référentiel v2,
    `MetierCompetence`/`MetierFormation`). Purement informatif : le recruteur choisit ce qu'il
    ajoute réellement à son offre, rien n'est imposé ni pré-coché (même principe que les
    compétences suggérées par l'IA de génération d'offre — jamais une attribution automatique,
    `MetierCompetence.attribution_candidat_auto` reste toujours False en pratique).

    `METIER_FORMATIONS` (fichier client) ne lie un métier qu'à une SPÉCIALITÉ, jamais à un
    diplôme précis — on ne suggère donc que la spécialité elle-même (jamais un diplôme reconstruit
    en croisant `DiplomeSpecialite`, qui suggérerait un diplôme jamais validé par le client pour ce
    métier). Le recruteur choisit ses diplômes séparément via le builder "Diplômes acceptés"."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [PublicReadThrottle]

    def get(self, request, metier_id):
        from ..models import Metier, MetierCompetence, MetierFormation
        try:
            metier = Metier.objects.get(pk=metier_id)
        except Metier.DoesNotExist:
            return Response({"error": "Métier introuvable."}, status=404)
        metier = metier.metier_canonique or metier

        competences = [
            {"id": mc.competence_id, "label": mc.competence.label}
            for mc in MetierCompetence.objects.filter(metier=metier, competence__actif=True)
            .select_related('competence').order_by('competence__label')[:15]
        ]

        liens_formation = list(
            MetierFormation.objects.filter(metier=metier, specialite__selectionnable=True)
            .select_related('specialite', 'specialite__domaine').order_by('specialite__libelle')[:15]
        )
        from ..referentiel_utils import FAMILLES_FORMATION, famille_formation
        specialites = [
            {"id": lien.specialite_id, "libelle": lien.specialite.libelle,
             # Point 8 : la suggestion indique sa famille (supérieur / formation professionnelle…)
             # pour que le recruteur ne les confonde jamais.
             "famille_libelle": FAMILLES_FORMATION[famille_formation(lien.specialite.domaine.systeme)]}
            for lien in liens_formation
        ]
        # Texte d'avertissement du client (`precision`, identique sur toutes les lignes
        # importées) — jamais montré jusqu'ici malgré son importation en Phase 1.
        avertissement = next((lien.precision for lien in liens_formation if lien.precision), "")

        # Statistiques d'usage (candidats + offres du même métier, voir suggestions_stats.py) :
        # servent à annoter et TRIER, jamais à retirer une suggestion du référentiel. Les
        # éléments très utilisés mais absents du référentiel sont ajoutés (plafonnés).
        from ..suggestions_stats import MAX_PAR_CATEGORIE, calculer_stats_metier, score_tri
        stats = calculer_stats_metier(metier)

        def enrichir(items, cat, cle_item, extra_label):
            index = stats[cat]
            vus = set()
            for it in items:
                cle = cle_item(it)
                vus.add(cle)
                s = index.get(cle) or {}
                it['pct_candidats'] = s.get('pct_candidats')
                it['nb_offres'] = s.get('nb_offres')
            # Éléments fréquents hors référentiel (au plus MAX_PAR_CATEGORIE, déjà triés).
            frequents = sorted(
                (s for k, s in index.items() if k not in vus and (s.get('pct_candidats') or s.get('nb_offres'))),
                key=score_tri, reverse=True,
            )[:MAX_PAR_CATEGORIE]
            for s in frequents:
                items.append({
                    'id': s['id'], extra_label: s['label'],
                    'pct_candidats': s['pct_candidats'], 'nb_offres': s['nb_offres'],
                })
            # sorted() est stable : sans statistique, l'ordre alphabétique d'origine est conservé.
            items.sort(key=score_tri, reverse=True)
            return items

        competences = enrichir(competences, 'competences', lambda i: i['label'].strip().lower(), 'label')
        specialites = enrichir(specialites, 'specialites', lambda i: str(i['id']), 'libelle')
        diplomes = enrichir([], 'diplomes', lambda i: str(i['id']), 'libelle')
        from ..models import TypeDiplome
        codes = dict(TypeDiplome.objects.filter(pk__in=[d['id'] for d in diplomes]).values_list('pk', 'code'))
        for d in diplomes:
            from ..suggestions_stats import _famille
            fam = _famille(codes.get(d['id'], ''))
            d['famille'] = fam
            d['pct_famille'] = stats['familles'].get(fam)

        return Response({
            "competences": competences, "specialites": specialites, "diplomes": diplomes,
            "avertissement": avertissement,
            "nb_candidats": stats['nb_candidats'], "nb_offres": stats['nb_offres'],
            "elargi": stats['elargi'],
        })