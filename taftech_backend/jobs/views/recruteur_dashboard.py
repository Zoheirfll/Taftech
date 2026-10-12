"""Tableau de bord recruteur : KPIs, activité récente, recherches sauvegardées."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import datetime
from ..models import (OffreEmploi, Candidature, RechercheSauvegardee, EquipeActionLog)
from .equipe import get_entreprise_for_user, get_membre_role
from ..credits_utils import credits_disponibles
from ..serializers import EntrepriseDashboardDetailSerializer, OffreDashboardDTO



def _calculer_kpis_periode(entreprise, date_debut, date_fin):
    """Calcule les 5 KPIs du dashboard sur [date_debut, date_fin] et la variation % vs la
    période précédente de même durée. Voir docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md."""
    duree = (date_fin - date_debut).days + 1
    debut_precedent = date_debut - datetime.timedelta(days=duree)
    fin_precedent = date_debut - datetime.timedelta(days=1)

    def _kpis_sur_fenetre(debut, fin):
        candidatures = Candidature.objects.filter(
            offre__entreprise=entreprise,
            date_postulation__date__gte=debut, date_postulation__date__lte=fin,
        )
        recues = candidatures.count()
        entretien = candidatures.filter(statut='ENTRETIEN').count()
        recrutements = candidatures.filter(statut='RETENU').count()
        taux = round((recrutements / recues * 100), 2) if recues else 0.0
        return recues, entretien, recrutements, taux

    recues, entretien, recrutements, taux = _kpis_sur_fenetre(date_debut, date_fin)
    recues_prec, entretien_prec, recrutements_prec, taux_prec = _kpis_sur_fenetre(debut_precedent, fin_precedent)

    def _variation(actuel, precedent):
        if not precedent:
            return None
        return round(((actuel - precedent) / precedent) * 100, 1)

    offres_actives = OffreEmploi.objects.filter(
        entreprise=entreprise, est_active=True, est_cloturee=False, statut_moderation='APPROUVEE',
    ).count()
    offres_actives_avant = OffreEmploi.objects.filter(
        entreprise=entreprise, est_active=True, est_cloturee=False, statut_moderation='APPROUVEE',
        date_publication__date__lte=debut_precedent,
    ).count()

    return {
        "offres_actives": {"valeur": offres_actives, "variation_pct": _variation(offres_actives, offres_actives_avant)},
        "candidatures_recues": {"valeur": recues, "variation_pct": _variation(recues, recues_prec)},
        "candidats_entretien": {"valeur": entretien, "variation_pct": _variation(entretien, entretien_prec)},
        "recrutements": {"valeur": recrutements, "variation_pct": _variation(recrutements, recrutements_prec)},
        "taux_conversion": {"valeur": taux, "variation_pct": _variation(taux, taux_prec)},
    }


def _phrase_activite(log, request_user):
    """Formate un EquipeActionLog en phrase lisible, à la 2ᵉ personne ("Vous avez...") si
    l'auteur est l'utilisateur connecté, sinon à son prénom ("Zoheir a...") — voir mockup
    "Activité récente" (docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md)."""
    est_vous = log.membre_id == request_user.id
    sujet = "Vous" if est_vous else ((log.membre.first_name or log.membre.email) if log.membre else "Un membre")
    verbe_avoir = "avez" if est_vous else "a"
    detail = log.detail or ""
    if log.action == 'CREER_OFFRE':
        return f"{sujet} {verbe_avoir} publié une nouvelle offre : {detail}"
    if log.action == 'MODIFIER_OFFRE':
        return f"{sujet} {verbe_avoir} modifié une offre : {detail}"
    if log.action == 'CLOTURER_OFFRE':
        return f"{sujet} {verbe_avoir} clôturé une offre : {detail}"
    if log.action == 'STATUT_CANDIDATURE':
        # `detail` est déjà une continuation naturelle du verbe (voir candidatures.py),
        # ex. "programmé un entretien avec Karim H. pour « Ingénieur Méthodes »"
        return f"{sujet} {verbe_avoir} {detail}"
    if log.action == 'EVALUER_CANDIDATURE':
        return f"{sujet} {verbe_avoir} évalué une candidature : {detail}"
    if log.action == 'INVITER_MEMBRE':
        return f"{sujet} {verbe_avoir} invité un membre : {detail}"
    if log.action == 'RETIRER_MEMBRE':
        return f"{sujet} {verbe_avoir} retiré un membre : {detail}"
    if log.action == 'CHANGER_ROLE':
        return f"{sujet} {verbe_avoir} changé un rôle : {detail}"
    if log.action == 'DEBLOQUER_CANDIDAT':
        return f"{sujet} {verbe_avoir} débloqué le profil de {detail} dans la CVthèque"
    # AUTRE — déjà une phrase complète (candidature reçue, favori ajouté, invitation CVthèque)
    return detail


def _offres_sans_candidats_si_non_validee(entreprise, offres_data):
    """Une entreprise non validée garde l'accès à son tableau de bord (état de validation,
    abonnement) mais ne reçoit jamais de données personnelles de candidats."""
    if entreprise.est_approuvee:
        return offres_data
    return [{**offre, "candidatures": []} for offre in offres_data]


class DashboardRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            from .equipe import membre_bloque_par_palier
            if membre_bloque_par_palier(request.user):
                return Response(
                    {"error": "L'abonnement de votre entreprise a expiré ou n'inclut plus la gestion d'équipe. Contactez le propriétaire.", "code": "PREMIUM_EXPIRE"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        mon_role = get_membre_role(request.user, entreprise)
        from ..paliers_utils import get_palier_actif
        # Bloquer les membres (non-propriétaires) si aucun palier actif (abonnement expiré/absent)
        if mon_role != 'PROPRIETAIRE' and get_palier_actif(entreprise) is None:
            return Response(
                {"error": "L'abonnement de votre entreprise a expiré. Contactez le propriétaire.", "code": "PREMIUM_EXPIRE"},
                status=status.HTTP_403_FORBIDDEN,
            )

        date_fin_str = request.GET.get('date_fin')
        date_debut_str = request.GET.get('date_debut')
        aujourdhui = timezone.now().date()
        try:
            date_fin = datetime.date.fromisoformat(date_fin_str) if date_fin_str else aujourdhui
            date_debut = datetime.date.fromisoformat(date_debut_str) if date_debut_str else (date_fin - datetime.timedelta(days=30))
        except ValueError:
            return Response({"error": "Format de date invalide (attendu YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)
        if date_fin < date_debut:
            return Response({"error": "date_fin doit être postérieure ou égale à date_debut."}, status=status.HTTP_400_BAD_REQUEST)
        kpis = _calculer_kpis_periode(entreprise, date_debut, date_fin)

        offres = OffreEmploi.objects.prefetch_related('candidatures', 'candidatures__candidat').filter(entreprise=entreprise).order_by('-date_publication')
        palier = get_palier_actif(entreprise)
        abonnement = getattr(entreprise, 'abonnement', None)
        from ..credits_utils import credits_disponibles
        _credits = credits_disponibles(entreprise)
        data = {
            "entreprise": EntrepriseDashboardDetailSerializer(entreprise).data,
            "offres": _offres_sans_candidats_si_non_validee(entreprise, OffreDashboardDTO(offres, many=True).data),
            "membre_role": mon_role,
            "palier_actif": palier.nom if palier else None,
            "palier_expiration": abonnement.date_expiration.strftime('%d/%m/%Y') if (abonnement and abonnement.date_expiration) else None,
            "acces_equipe": bool(palier and palier.acces_equipe),
            "acces_ia_recommandes": bool(palier and palier.acces_ia_recommandes),
            "acces_ia_avancee": bool(palier and palier.acces_ia_avancee),
            "acces_coordonnees": bool(palier and palier.acces_coordonnees),
            "credits_mensuel_restant": _credits['mensuel_restant'],
            "credits_achetes_restant": _credits['achetes_restant'],
            "kpis": kpis,
            "periode": {"date_debut": date_debut.isoformat(), "date_fin": date_fin.isoformat()},
        }
        return Response(data, status=status.HTTP_200_OK)


class ActiviteRecenteAPIView(APIView):
    """Fil d'activité récente de l'entreprise, formaté en phrases lisibles — voir
    docs/superpowers/specs/2026-08-23-dashboard-recruteur-refonte-design.md.
    `?limit=N` (défaut 10, max 50) pour la page complète "Voir tout".
    Visibilité : PROPRIETAIRE/ADMIN voient toute l'activité de l'entreprise, UTILISATEUR/INVITE
    ne voient que leurs propres actions (cohérent avec le reste des permissions d'équipe)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        try:
            limite = min(int(request.GET.get('limit', 10)), 50)
        except (TypeError, ValueError):
            limite = 10
        mon_role = get_membre_role(request.user, entreprise)
        qs = EquipeActionLog.objects.filter(entreprise=entreprise).exclude(action='CONNEXION')
        if mon_role not in ('PROPRIETAIRE', 'ADMIN'):
            qs = qs.filter(membre=request.user)
        logs = qs.select_related('membre').order_by('-date')[:limite]
        resultats = [
            {"id": log.id, "action": log.action, "phrase": _phrase_activite(log, request.user).strip(), "date": log.date.isoformat()}
            for log in logs
        ]
        return Response(resultats)


class RecherchesSauvegardeesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        recherches = RechercheSauvegardee.objects.filter(entreprise=entreprise)
        return Response([
            {"id": r.id, "nom": r.nom, "filtres": r.filtres, "date_creation": r.date_creation.isoformat()}
            for r in recherches
        ])

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, entreprise) == 'INVITE':
            return Response({"error": "Action non autorisée pour votre rôle."}, status=403)
        if RechercheSauvegardee.objects.filter(entreprise=entreprise).count() >= 20:
            return Response({"error": "Limite de 20 recherches sauvegardées atteinte."}, status=400)
        nom = (request.data.get('nom') or '').strip()
        filtres = request.data.get('filtres') or {}
        if not nom:
            return Response({"error": "Le nom de la recherche est requis."}, status=400)
        recherche = RechercheSauvegardee.objects.create(entreprise=entreprise, nom=nom[:100], filtres=filtres)
        return Response({"id": recherche.id, "nom": recherche.nom, "filtres": recherche.filtres}, status=201)

    def delete(self, request, pk=None):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, entreprise) == 'INVITE':
            return Response({"error": "Action non autorisée pour votre rôle."}, status=403)
        try:
            RechercheSauvegardee.objects.get(id=pk, entreprise=entreprise).delete()
            return Response({"message": "Supprimée."})
        except RechercheSauvegardee.DoesNotExist:
            return Response({"error": "Introuvable."}, status=404)
