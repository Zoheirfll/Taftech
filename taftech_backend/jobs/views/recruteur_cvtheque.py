"""CVthèque recruteur : recherche de candidats, recommandés, statistiques avancées, invitations, favoris."""
import logging
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import (Q, Sum, F, ExpressionWrapper, DurationField)
from django.db.models.functions import Coalesce, Now
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from django.template.loader import render_to_string
import datetime
from ..models import (OffreEmploi, ProfilCandidat, ProfilCandidatFavori, Candidature, InvitationCVTheque, EquipeActionLog, Notification)
from .equipe import get_entreprise_for_user, get_membre_role
from ..throttles import InvitationCVThequeThrottle
from ..matcher import calculer_score_matching
from ..credits_utils import credits_disponibles
from ..serializers import ProfilCandidatDTO, CandidatureRecruteurDTO

logger = logging.getLogger(__name__)
User = get_user_model()


class CVthequePagination(PageNumberPagination):
    page_size = 10


class CandidatsRecommandesAPIView(APIView):
    """Candidats les mieux classés (score de matching IA) sur les offres encore ACTIVES de
    l'entreprise — page dédiée sidebar "Candidats recommandés". Gatée Pro+ (acces_ia_recommandes)
    côté serveur, pas seulement en façade frontend — contrairement au score de matching affiché
    au fil de l'eau dans GestionOffre (jamais restreint), cette vue agrégée classée est bien la
    fonctionnalité vendue comme premium.
    Restreint aux offres est_active=True/est_cloturee=False/non expirées — une offre dont la date
    d'expiration est dépassée est désormais fermée automatiquement par la commande
    `archiver_offres_expirees` (cron quotidien), donc ce filtre suffit à garantir la fraîcheur de
    l'offre elle-même. La fenêtre de récence sur la date de candidature (60 jours) a été retirée
    sur demande explicite (27/09/2026) — un bon candidat reste recommandé tant que l'offre est
    active, peu importe la date de sa candidature, plutôt que de disparaître arbitrairement."""
    permission_classes = [IsAuthenticated]
    # Même seuil que ActiviteProfil.SEUIL_SCORE_RECOMMANDE — en dessous, un candidat n'est
    # pas réellement "recommandé", juste le moins pire parmi peu de candidatures (signalé
    # par l'utilisateur : un score à 35-41% n'a rien d'une recommandation).
    SEUIL_SCORE_RECOMMANDE = 80.0

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        from ..paliers_utils import get_palier_actif, reponse_entreprise_non_validee
        refus = reponse_entreprise_non_validee(entreprise)
        if refus:
            return refus
        palier = get_palier_actif(entreprise)
        if palier is None or not palier.acces_ia_recommandes:
            return Response({"error": "Fonctionnalité réservée au palier Pro ou supérieur.", "code": "PALIER_INSUFFISANT"}, status=403)

        masquer_decides = request.GET.get('masquer_decides', 'true') == 'true'
        qs = Candidature.objects.select_related('candidat', 'offre').filter(
            offre__entreprise=entreprise, est_rapide=False, score_matching__isnull=False,
            score_matching__gte=self.SEUIL_SCORE_RECOMMANDE,
            offre__est_active=True, offre__est_cloturee=False,
        ).filter(
            Q(offre__date_expiration__isnull=True) | Q(offre__date_expiration__gte=timezone.now().date())
        )
        if masquer_decides:
            qs = qs.exclude(statut__in=['RETENU', 'REFUSE'])
        qs = qs.order_by('-score_matching')

        paginator = CVthequePagination()
        paginator.page_size = 12
        page = paginator.paginate_queryset(qs, request)
        serializer = CandidatureRecruteurDTO(page, many=True)
        results = serializer.data
        for item, candidature in zip(results, page):
            item['offre_id'] = candidature.offre_id
            item['offre_titre'] = candidature.offre.titre
        return paginator.get_paginated_response(results)


class StatistiquesAvanceesAPIView(APIView):
    """Répartition des candidatures par tranche de score de matching — gatée Business+
    (acces_ia_avancee) côté serveur, même principe que CandidatsRecommandesAPIView."""
    permission_classes = [IsAuthenticated]

    TRANCHES = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 101)]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(entreprise)
        if palier is None or not palier.acces_ia_avancee:
            return Response({"error": "Fonctionnalité réservée au palier Business ou supérieur.", "code": "PALIER_INSUFFISANT"}, status=403)

        scores = Candidature.objects.filter(
            offre__entreprise=entreprise, score_matching__isnull=False,
        ).values_list('score_matching', flat=True)
        repartition = [0] * len(self.TRANCHES)
        for score in scores:
            score = float(score)
            for i, (mini, maxi) in enumerate(self.TRANCHES):
                if mini <= score < maxi:
                    repartition[i] += 1
                    break
        return Response({"repartition_score": repartition})


def _score_ou_zero(result):
    """S01 : `total` peut être None (aucun critère actif sur l'offre) — jamais planter le tri
    ou l'affichage, traiter comme 0 dans ce cas (pas de classement possible, pas un mauvais score)."""
    total = result.get('total')
    return round(total) if total is not None else 0


class CVThequeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise_user = get_entreprise_for_user(request.user)
        if not entreprise_user:
            return Response({"error": "Accès réservé aux recruteurs."}, status=403)
        if not entreprise_user.est_approuvee:
            return Response(
                {"error": "Votre entreprise doit être validée par TafTech avant d'accéder à la CVthèque.", "code": "ENTREPRISE_NON_VALIDEE"},
                status=403,
            )
        if not request.user.consentement_cvtheque:
            return Response(
                {"error": "Vous devez accepter les conditions de traitement des données candidats.", "code": "CVTHEQUE_CONSENT_REQUIRED"},
                status=403,
            )
        search = request.GET.get('search', '')
        wilaya = request.GET.get('wilaya', '')
        diplome = request.GET.get('diplome', '')
        specialite = request.GET.get('specialite', '')
        experience = request.GET.get('experience', '')
        mobilite = request.GET.get('mobilite', '')
        disponibilite = request.GET.get('disponibilite', '')
        langues = request.GET.get('langues', '')
        competences = request.GET.get('competences', '')
        permis = request.GET.get('permis', '') == 'true'
        vehicule = request.GET.get('vehicule', '') == 'true'
        passeport = request.GET.get('passeport', '') == 'true'
        service_militaire = request.GET.get('service_militaire', '')
        niveau_experience = request.GET.get('niveau_experience', '')
        avec_photo = request.GET.get('avec_photo', '') == 'true'
        avec_cv = request.GET.get('avec_cv', '') == 'true'
        inscrit_recent = request.GET.get('inscrit_recent', '') == 'true'
        favoris_only = request.GET.get('favoris', '') == 'true'
        tri = request.GET.get('tri', 'recents')
        candidats = ProfilCandidat.objects.select_related('user').prefetch_related('experiences_detail').filter(user__is_active=True, user__role='CANDIDAT')
        if favoris_only:
            ids_favoris = ProfilCandidatFavori.objects.filter(recruteur=request.user).values_list('candidat_id', flat=True)
            candidats = candidats.filter(user__id__in=ids_favoris)
        if search:
            # R01/N01-N04 : normalisation de la requête libre avant comparaison — sans elle,
            # une saisie accentuée usuelle ("développeur") ne trouvait plus aucun candidat
            # dont les champs sont eux aussi accentués (bug identique à celui déjà corrigé
            # sur l'autocomplete métier, session 18/09/2026). Filtrage en Python (pas de
            # fonction SQL de normalisation d'accents sans extension Postgres `unaccent`) —
            # acceptable au volume actuel de la CVthèque, à optimiser avec pg_trgm/unaccent
            # si le volume grossit significativement.
            #
            # R05 : n'indexer que les faits autorisés du profil (titre déclaré, métier
            # recherché explicitement déclaré, expériences, compétences) — jamais nom/sexe/
            # âge (S13, même principe que le score). Chaque champ autorisé est marqué avec
            # une étiquette ("titre"/"metier_souhaite"/"experience"/"competence") pour que le
            # recruteur voie CE QUI a motivé le résultat (R05 : "marquer le champ ayant
            # motivé le résultat ; une aspiration ne prouve pas une expérience").
            #
            # R07 : ordre du rappel — expression exacte (la requête entière comme
            # sous-chaîne) prioritaire sur une correspondance par jetons significatifs
            # dispersés sur plusieurs champs ; pas d'expansion sémantique (désactivée par
            # défaut, cohérent avec expansion_semantique_active=0 dans PARAM_MATCHING).
            from ..referentiel_utils import normaliser_recherche
            search_norm = normaliser_recherche(search)
            mots_recherche = {m for m in search_norm.split() if len(m) >= 3}
            # Clé = user_id (pas ProfilCandidat.id, distinct — OneToOneField sans
            # primary_key=True) pour rester cohérent avec `score_offre` plus bas, indexé
            # de la même façon sur `item['user_id']` du résultat sérialisé.
            resultats_recherche = {}  # user_id -> {"champ": str, "priorite": int}
            for c in candidats.select_related('metier_souhaite').iterator(chunk_size=200):
                champs_autorises = [
                    ("titre", c.titre_professionnel or ''),
                    ("metier_souhaite", getattr(c.metier_souhaite, 'libelle', '') or ''),
                    ("competence", c.competences or ''),
                ]
                try:
                    champs_autorises += [("experience", e.titre_poste or '') for e in c.experiences_detail.all()]
                except Exception:
                    pass
                meilleur = None  # (priorite, champ) — priorite 0 = meilleure
                for champ, valeur in champs_autorises:
                    if not valeur:
                        continue
                    valeur_norm = normaliser_recherche(valeur)
                    if search_norm in valeur_norm:
                        meilleur = (0, champ)
                        break
                    if mots_recherche and mots_recherche.issubset(set(valeur_norm.split())):
                        if meilleur is None or meilleur[0] > 1:
                            meilleur = (1, champ)
                if meilleur is None and mots_recherche:
                    # Jetons dispersés sur PLUSIEURS champs autorisés — filet de sécurité le
                    # plus permissif, toujours après les deux priorités ci-dessus.
                    tous_mots = set()
                    for _champ, valeur in champs_autorises:
                        tous_mots.update(normaliser_recherche(valeur).split())
                    if mots_recherche.issubset(tous_mots):
                        meilleur = (2, "profil")
                if meilleur is not None:
                    resultats_recherche[c.user_id] = {"champ": meilleur[1], "priorite": meilleur[0]}
            candidats = candidats.filter(user_id__in=resultats_recherche.keys())
            if resultats_recherche:
                # R07 : ordre du rappel — expression exacte avant jetons dispersés, avant
                # expansion sémantique (désactivée par défaut). Priorité en tête d'ordre,
                # le tri choisi par le recruteur (nom/expérience/récents) départage ensuite
                # les candidats à égalité de priorité.
                from django.db.models import Case, When, Value, IntegerField
                candidats = candidats.annotate(
                    _prio_recherche=Case(
                        *[When(user_id=uid, then=Value(r["priorite"])) for uid, r in resultats_recherche.items()],
                        default=Value(3), output_field=IntegerField(),
                    )
                ).order_by('_prio_recherche')
        if request.GET.get('specialite_formation', '').isdigit():
            # Filtre dédié à la spécialité de FORMATION (SpecialiteFormation, référentiel
            # diplômes) — distinct du paramètre `specialite` ci-dessous qui filtre par Metier
            # (poste/profession). Les deux référentiels partageaient jusqu'ici le même nom de
            # paramètre côté recherche libre, source de confusion (voir la vérification du
            # 21/09/2026 contre REGLES_MATCHING).
            spec_formation_id = int(request.GET['specialite_formation'])
            candidats = candidats.filter(
                formations_detail__specialite_ref_id=spec_formation_id,
                formations_detail__statut='OBTENU',
            ).distinct()
        if wilaya:
            candidats = candidats.filter(wilaya=wilaya)
        if diplome:
            candidats = candidats.filter(diplome=diplome)
        if specialite and specialite.isdigit():
            # MIGRATION (R04) : élargit aux anciens codes redirigés vers ce métier (et
            # réciproquement) — sans ça, un futur réimport ajoutant une redirection ferait
            # disparaître silencieusement des candidats déjà en base d'une recherche par métier.
            from ..referentiel_utils import ids_metier_avec_redirections
            metier_ids = ids_metier_avec_redirections(specialite)
            candidats = candidats.filter(Q(metier_id__in=metier_ids) | Q(metier_souhaite_id__in=metier_ids)).distinct()
        if mobilite:
            candidats = candidats.filter(mobilite=mobilite)
        if disponibilite:
            candidats = candidats.filter(situation_actuelle=disponibilite)
        if permis:
            candidats = candidats.filter(permis_conduire=True)
        if vehicule:
            candidats = candidats.filter(vehicule_personnel=True)
        if passeport:
            candidats = candidats.filter(passeport_valide=True)
        # Filtres "recherche avancée" — réservés Business+ (palier.acces_ia_avancee). Un palier
        # inférieur voit ces filtres dans l'UI (CVTheque.jsx) mais ils sont silencieusement
        # ignorés côté API plutôt que de renvoyer une erreur — dégrade la recherche à "basique"
        # sans casser la page pour Starter/Pro.
        from ..paliers_utils import get_palier_actif as _get_palier_pour_filtres
        _palier_filtres = _get_palier_pour_filtres(entreprise_user)
        _recherche_avancee_ok = bool(_palier_filtres and _palier_filtres.acces_ia_avancee)
        if service_militaire and _recherche_avancee_ok:
            candidats = candidats.filter(service_militaire=service_militaire)
        if niveau_experience and _recherche_avancee_ok:
            candidats = candidats.filter(niveau_experience=niveau_experience)
        # `langues`/`competences` sont des champs texte libre (pas de référentiel structuré
        # côté candidat) — filtrage par sous-chaîne, pas par égalité exacte.
        if langues and _recherche_avancee_ok:
            candidats = candidats.filter(langues__icontains=langues)
        if competences and _recherche_avancee_ok:
            candidats = candidats.filter(competences__icontains=competences)
        if avec_photo:
            candidats = candidats.exclude(photo_profil='').exclude(photo_profil__isnull=True)
        if avec_cv:
            candidats = candidats.exclude(cv_pdf='').exclude(cv_pdf__isnull=True)
        if inscrit_recent:
            date_limite = datetime.datetime.now() - datetime.timedelta(days=30)
            candidats = candidats.filter(user__date_joined__gte=date_limite)
        if experience:
            try:
                min_days = float(experience) * 365.25
                candidats = candidats.annotate(
                    duree_totale=Sum(
                        ExpressionWrapper(
                            Coalesce(F('experiences_detail__date_fin'), Now()) - F('experiences_detail__date_debut'),
                            output_field=DurationField()
                        )
                    )
                ).filter(duree_totale__gte=datetime.timedelta(days=min_days))
            except ValueError:
                pass
        offre_id = request.GET.get('offre_id', '')
        offre_match = None
        if offre_id:
            try:
                offre_match = OffreEmploi.objects.get(pk=offre_id, entreprise=entreprise_user)
            except OffreEmploi.DoesNotExist:
                pass

        if offre_match:
            # Tri par score matching — on évalue tous les candidats filtrés
            candidats_list = list(candidats.select_related('user').prefetch_related('experiences_detail'))
            scored = []
            for profil in candidats_list:
                result = calculer_score_matching(profil.user, offre_match)
                scored.append((profil, _score_ou_zero(result)))
            scored.sort(key=lambda x: x[1], reverse=True)
            from ..paliers_utils import get_palier_actif
            palier = get_palier_actif(entreprise_user)
            if palier is None:
                return Response({"error": "Accès réservé aux recruteurs avec un abonnement actif."}, status=403)
            if not palier.acces_ia_recommandes:
                return Response({"error": "Le classement par compatibilité IA nécessite le palier Pro ou supérieur."}, status=403)
            # Pagination manuelle
            page_size = 10
            page = int(request.GET.get('page', 1))
            total = len(scored)
            start = (page - 1) * page_size
            end = start + page_size
            page_items = scored[start:end]
            profils_page = [p for p, _ in page_items]
            scores_map = {p.user.id: s for p, s in page_items}
            from ..models import AccesCandidatDebloque
            unlocked_ids = set(AccesCandidatDebloque.objects.filter(
                entreprise=entreprise_user, candidat_id__in=[p.user_id for p in profils_page],
            ).values_list('candidat_id', flat=True))
            serializer = ProfilCandidatDTO(profils_page, many=True, context={'recruteur': request.user, 'unlocked_ids': unlocked_ids})
            results = serializer.data
            for item in results:
                item['score_offre'] = scores_map.get(item['user_id'], 0)
                if search:
                    item['champ_correspondant'] = resultats_recherche.get(item['user_id'], {}).get('champ')
            # Fil d'activité candidat "profil recommandé" (dashboard candidat, session
            # specs/important-features) — uniquement si score élevé, pas une simple
            # consultation (décision utilisateur). Throttlé à 1 entrée/24h par candidat pour
            # ne pas spammer à chaque rafraîchissement de la recherche CVthèque.
            from ..models import ActiviteProfil
            from django.utils import timezone
            import datetime as _dt
            seuil_recent = timezone.now() - _dt.timedelta(hours=24)
            for profil, sc in page_items:
                if sc >= ActiviteProfil.SEUIL_SCORE_RECOMMANDE:
                    deja_recent = ActiviteProfil.objects.filter(
                        candidat=profil.user, entreprise=entreprise_user,
                        type_activite='PROFIL_RECOMMANDE', date_creation__gte=seuil_recent,
                    ).exists()
                    if not deja_recent:
                        ActiviteProfil.objects.create(
                            candidat=profil.user, entreprise=entreprise_user,
                            type_activite='PROFIL_RECOMMANDE', score=sc,
                        )
            return Response({
                'count': total,
                'next': None,
                'previous': None,
                'results': results,
                'credits_disponibles': credits_disponibles(entreprise_user),
                'recherche_avancee': _recherche_avancee_ok,
            })

        # R07 : quand une recherche libre est active, la priorité de pertinence
        # (_prio_recherche, posée juste au-dessus) passe toujours en tête de tri — le tri
        # choisi par le recruteur ne départage qu'à égalité de priorité.
        ordre_prio = ('_prio_recherche',) if search else ()
        if tri == 'nom_asc':
            candidats = candidats.order_by(*ordre_prio, 'user__last_name', 'user__first_name')
        elif tri == 'experience_desc':
            if 'duree_totale' not in str(candidats.query):
                candidats = candidats.annotate(
                    duree_totale=Sum(
                        ExpressionWrapper(
                            Coalesce(F('experiences_detail__date_fin'), Now()) - F('experiences_detail__date_debut'),
                            output_field=DurationField()
                        )
                    )
                )
            candidats = candidats.order_by(*ordre_prio, F('duree_totale').desc(nulls_last=True))
        else:
            candidats = candidats.order_by(*ordre_prio, '-user__date_joined')
        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(entreprise_user)
        if palier is None:
            return Response({"error": "Accès réservé aux recruteurs avec un abonnement actif."}, status=403)
        paginator = CVthequePagination()
        result_page = paginator.paginate_queryset(candidats, request)
        from ..models import AccesCandidatDebloque
        unlocked_ids = set(AccesCandidatDebloque.objects.filter(
            entreprise=entreprise_user, candidat_id__in=[p.user_id for p in result_page],
        ).values_list('candidat_id', flat=True))
        serializer = ProfilCandidatDTO(result_page, many=True, context={'recruteur': request.user, 'unlocked_ids': unlocked_ids})
        results = serializer.data
        if search:
            for item in results:
                item['champ_correspondant'] = resultats_recherche.get(item['user_id'], {}).get('champ')
        response = paginator.get_paginated_response(results)
        response.data['credits_disponibles'] = credits_disponibles(entreprise_user)
        response.data['recherche_avancee'] = _recherche_avancee_ok
        return response


class InviterCandidatCVThequeAPIView(APIView):
    """Invite un candidat de la CVthèque à postuler à une offre précise — voir
    docs/superpowers/specs/2026-08-23-source-candidature-invitation-cvtheque-design.md."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [InvitationCVThequeThrottle]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        mon_role = get_membre_role(request.user, entreprise)
        if mon_role == 'INVITE':
            return Response({"error": "Action non autorisée pour votre rôle."}, status=status.HTTP_403_FORBIDDEN)

        from ..paliers_utils import get_palier_actif, reponse_entreprise_non_validee
        refus = reponse_entreprise_non_validee(entreprise)
        if refus:
            return refus
        palier = get_palier_actif(entreprise)
        if not palier or not palier.acces_coordonnees:
            return Response(
                {"error": "L'invitation de candidats nécessite un abonnement Pro ou supérieur.", "code": "PALIER_INSUFFISANT"},
                status=status.HTTP_403_FORBIDDEN,
            )

        candidat_id = request.data.get('candidat_id')
        offre_id = request.data.get('offre_id')
        try:
            candidat = User.objects.get(id=candidat_id, role='CANDIDAT')
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Candidat introuvable."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            offre = OffreEmploi.objects.get(
                id=offre_id, entreprise=entreprise, statut_moderation='APPROUVEE',
                est_active=True, est_cloturee=False,
            )
        except (OffreEmploi.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Offre introuvable ou non active."}, status=status.HTTP_400_BAD_REQUEST)

        if InvitationCVTheque.objects.filter(entreprise=entreprise, candidat=candidat, offre=offre).exists():
            return Response({"error": "Ce candidat a déjà été invité à cette offre.", "code": "DEJA_INVITE"}, status=status.HTTP_409_CONFLICT)

        invitation = InvitationCVTheque.objects.create(entreprise=entreprise, candidat=candidat, offre=offre)

        Notification.objects.create(
            destinataire=candidat,
            type_notif='INFO',
            titre="Une entreprise s'intéresse à votre profil",
            message=f"{entreprise.nom_entreprise} vous invite à postuler à l'offre « {offre.titre} ».",
            lien=f"/jobs/{offre.id}",
        )

        lien_offre = f"{settings.SITE_URL}/jobs/{offre.id}/?invitation={invitation.token}"
        if candidat.email:
            try:
                ctx = {
                    'prenom_candidat': candidat.first_name,
                    'nom_entreprise': entreprise.nom_entreprise,
                    'titre_offre': offre.titre,
                    'lien_offre': lien_offre,
                    'annee': timezone.now().year,
                }
                html_body = render_to_string('emails/invitation_cvtheque.html', ctx)
                msg = EmailMultiAlternatives(
                    f"{entreprise.nom_entreprise} vous invite à postuler",
                    f"{entreprise.nom_entreprise} vous invite à postuler à l'offre « {offre.titre} » : {lien_offre}",
                    settings.DEFAULT_FROM_EMAIL, [candidat.email],
                )
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=True)
            except Exception as e:
                logger.error("Erreur envoi email invitation CVthèque : %s", e)

        EquipeActionLog.objects.create(
            entreprise=entreprise, membre=request.user, action='AUTRE',
            detail=f"Invitation CVthèque envoyée à {candidat.email} pour l'offre « {offre.titre} »",
        )

        return Response({"message": "Invitation envoyée."}, status=status.HTTP_201_CREATED)


class ToggleFavoriCVAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, candidat_id):
        entreprise_favori = get_entreprise_for_user(request.user)
        if not entreprise_favori:
            return Response({"error": "Action réservée aux recruteurs."}, status=403)
        from ..paliers_utils import reponse_entreprise_non_validee
        refus = reponse_entreprise_non_validee(entreprise_favori)
        if refus:
            return refus
        try:
            candidat = User.objects.get(id=candidat_id, role='CANDIDAT')
        except User.DoesNotExist:
            return Response({"error": "Candidat introuvable."}, status=404)
        favori, created = ProfilCandidatFavori.objects.get_or_create(recruteur=request.user, candidat=candidat)
        if not created:
            favori.delete()
            return Response({"action": "retire", "is_favori": False}, status=200)
        entreprise = get_entreprise_for_user(request.user)
        EquipeActionLog.objects.create(
            entreprise=entreprise, membre=request.user, action='AUTRE',
            detail=f"{candidat.first_name} {candidat.last_name} a été ajouté(e) aux favoris",
        )
        return Response({"action": "ajoute", "is_favori": True}, status=201)
