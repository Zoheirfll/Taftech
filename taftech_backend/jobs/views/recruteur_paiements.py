"""Abonnements recruteur : activation, paiement Chargily, webhook, reçu."""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
import datetime
import hmac
import hashlib
import requests as http_requests
from ..models import ProfilEntreprise, DemandeActivationPremium, AuditLog
from .equipe import get_entreprise_for_user, get_membre_role

logger = logging.getLogger(__name__)


class DemanderActivationPremiumAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Profil entreprise introuvable.'}, status=404)
        if get_membre_role(request.user, entreprise) != 'PROPRIETAIRE':
            return Response({'error': 'Réservé au propriétaire.'}, status=403)
        if not entreprise.est_approuvee:
            return Response(
                {'error': 'Votre entreprise est en cours de validation. Vous pourrez activer votre formule après validation de votre compte.', 'code': 'ENTREPRISE_NON_VALIDEE'},
                status=403,
            )
        moyen = request.data.get('moyen_paiement', 'CIB')
        try:
            nb_mois = max(1, min(int(request.data.get('nb_mois', 1)), 60))
        except (TypeError, ValueError):
            return Response({'error': 'nb_mois doit être un nombre entier.'}, status=400)
        if DemandeActivationPremium.objects.filter(entreprise=entreprise, est_traitee=False).exists():
            return Response({'message': 'Demande déjà envoyée. En attente de traitement.'}, status=200)
        DemandeActivationPremium.objects.create(entreprise=entreprise, moyen_paiement=moyen, nb_mois=nb_mois)
        return Response({'message': 'Demande enregistrée. Votre compte sera activé sous 24h ouvrables.'}, status=201)


class ChargilyCheckoutPalierAPIView(APIView):
    """Crée une session de paiement Chargily pour un des 4 nouveaux paliers d'abonnement
    (Starter/Pro/Business/Enterprise) — même mécanisme que ChargilyCheckoutAPIView (ancien
    système PremiumPlan), adapté au nouveau modèle Palier. Enterprise (sur devis, pas de prix)
    n'est pas payable ici — le CTA de la page Abonnements le redirige vers /contact."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Profil entreprise introuvable.'}, status=404)
        if get_membre_role(request.user, entreprise) != 'PROPRIETAIRE':
            return Response({'error': 'Réservé au propriétaire.'}, status=403)
        if not entreprise.est_approuvee:
            return Response(
                {'error': 'Votre entreprise est en cours de validation. Vous pourrez activer votre formule après validation de votre compte.', 'code': 'ENTREPRISE_NON_VALIDEE'},
                status=403,
            )

        from ..models import Palier
        palier_nom = request.data.get('palier_nom', '').upper()
        periode = request.data.get('periode', 'MENSUEL').upper()
        if periode not in ('MENSUEL', 'ANNUEL'):
            return Response({'error': 'periode doit être MENSUEL ou ANNUEL.'}, status=400)
        try:
            palier = Palier.objects.get(nom=palier_nom, actif=True)
        except Palier.DoesNotExist:
            return Response({'error': "Ce palier n'existe pas ou n'est plus disponible."}, status=400)

        montant = palier.prix_annuel_da if periode == 'ANNUEL' else palier.prix_mensuel_da
        if not montant:
            return Response({'error': "Ce palier n'a pas de prix en libre-service — contactez-nous."}, status=400)

        site_url = settings.SITE_URL.rstrip('/')
        success_url = f"{site_url}/recruteurs/abonnements?paid=1"
        failure_url = f"{site_url}/recruteurs/abonnements"

        payload = {
            "amount": montant,
            "currency": "dzd",
            "success_url": success_url,
            "failure_url": failure_url,
            "locale": "fr",
            "metadata": {
                "palier_nom": palier.nom,
                "periode": periode,
                "entreprise_id": entreprise.id,
                "user_id": request.user.id,
            },
        }

        # URL du webhook envoyée à CHAQUE paiement (réglage d'environnement) : l'activation du palier
        # ne dépend plus de l'URL configurée dans le tableau de bord Chargily.
        if settings.CHARGILY_WEBHOOK_URL:
            payload["webhook_endpoint"] = settings.CHARGILY_WEBHOOK_URL

        try:
            resp = http_requests.post(
                "https://pay.chargily.net/test/api/v2/checkouts",
                headers={
                    "Authorization": f"Bearer {settings.CHARGILY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10,
            )
        except Exception as e:
            logger.error(f"[CHARGILY] Erreur connexion (palier) : {e}")
            return Response({'error': 'Impossible de contacter Chargily.'}, status=502)

        if resp.status_code not in (200, 201):
            logger.error(f"[CHARGILY] Erreur {resp.status_code} (palier) : {resp.text}")
            return Response({'error': 'Erreur Chargily.', 'detail': resp.text}, status=502)

        checkout_url = resp.json().get('checkout_url')
        return Response({'checkout_url': checkout_url}, status=200)


class MonAbonnementAPIView(APIView):
    """Statut de l'abonnement (palier) de l'entreprise connectée + résiliation du renouvellement
    automatique. « Résilier » ne coupe jamais l'accès immédiatement (voir badge "Sans engagement"
    de la page Abonnements) : l'entreprise garde son palier jusqu'à date_expiration, puis
    retombe naturellement sur Gratuit — aucun remboursement au prorata, cohérent avec le
    paiement manuel/Chargily non récurrent actuel."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        abonnement = getattr(entreprise, 'abonnement', None)
        # Droit lu sur le palier réellement ACTIF (expiration comprise), pas sur l'abonnement
        # brut : le menu recruteur s'en sert pour afficher un cadenas, au lieu de coder
        # « Pro et plus » en dur alors que l'admin règle les droits palier par palier.
        from ..paliers_utils import get_palier_actif
        palier_actif = get_palier_actif(entreprise)
        # Même règle que la création d'offre (offres approuvées ET en attente, non clôturées) :
        # le menu et la page « Publier une offre » préviennent AVANT que le recruteur remplisse
        # tout le formulaire pour se voir refuser la publication.
        from .offres import _limite_offres_atteinte
        from ..paliers_utils import limite_offres_actives
        droits = {
            "acces_ia_recommandes": bool(palier_actif and palier_actif.acces_ia_recommandes),
            "acces_equipe": bool(palier_actif and palier_actif.acces_equipe),
            "acces_cvtheque": palier_actif is not None,  # la CVthèque exige un palier actif
            "peut_publier_offre": _limite_offres_atteinte(entreprise) is None,
            "limite_offres": limite_offres_actives(entreprise),  # None = illimité
        }
        if not abonnement:
            return Response({"palier": None, **droits})
        return Response({
            "palier": abonnement.palier.nom,
            "date_expiration": abonnement.date_expiration.strftime('%d/%m/%Y') if abonnement.date_expiration else None,
            "renouvellement_auto": abonnement.renouvellement_auto,
            **droits,
        })

    def patch(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        if get_membre_role(request.user, entreprise) != 'PROPRIETAIRE':
            return Response({"error": "Réservé au propriétaire."}, status=403)
        abonnement = getattr(entreprise, 'abonnement', None)
        if not abonnement:
            return Response({"error": "Aucun abonnement actif."}, status=404)
        if 'renouvellement_auto' in request.data:
            abonnement.renouvellement_auto = bool(request.data['renouvellement_auto'])
            abonnement.save(update_fields=['renouvellement_auto'])
        return Response({
            "renouvellement_auto": abonnement.renouvellement_auto,
            "date_expiration": abonnement.date_expiration.strftime('%d/%m/%Y') if abonnement.date_expiration else None,
        })


class ChargilyWebhookAPIView(APIView):
    """
    Endpoint appelé automatiquement par Chargily après un paiement réussi.
    Vérifie la signature HMAC-SHA256 puis active le premium de l'entreprise.
    Aucune authentification JWT — c'est Chargily qui appelle cet endpoint.
    """
    authentication_classes = []  # pas de JWT, c'est un webhook externe
    permission_classes = []

    def post(self, request):
        logger.debug(f"[WEBHOOK] Headers : {dict(request.headers)}")
        logger.debug(f"[WEBHOOK] Body brut : {request.body[:500]}")
        logger.debug(f"[WEBHOOK] Data parsée : {request.data}")

        # Vérification de la signature envoyée par Chargily dans le header
        signature_reçue = request.headers.get('Signature', '')
        secret = settings.CHARGILY_SECRET_KEY.encode('utf-8')
        body = request.body
        signature_attendue = hmac.new(secret, body, hashlib.sha256).hexdigest()

        logger.debug(f"[WEBHOOK] Signature reçue   : {signature_reçue}")
        logger.debug(f"[WEBHOOK] Signature attendue : {signature_attendue}")

        if not hmac.compare_digest(signature_attendue, signature_reçue):
            logger.warning("[WEBHOOK] Signature invalide — paiement ignoré")
            return Response({'error': 'Signature invalide.'}, status=400)

        data = request.data
        event_type = data.get('type', '')
        logger.info(f"[WEBHOOK] Event type : {event_type}")

        # On ne traite que les paiements confirmés
        if event_type != 'checkout.paid':
            logger.info(f"[WEBHOOK] Événement ignoré : {event_type}")
            return Response({'status': 'ignored'}, status=200)

        # Structure Chargily : event.data.metadata (pas event.data.object.metadata)
        metadata = data.get('data', {}).get('metadata', {})
        entreprise_id = metadata.get('entreprise_id')

        try:
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id)
        except ProfilEntreprise.DoesNotExist:
            return Response({'error': 'Entreprise introuvable.'}, status=404)

        pack_id = metadata.get('pack_id')
        if pack_id:
            from ..models import CreditPack, PaiementCreditPack
            try:
                pack = CreditPack.objects.get(id=pack_id)
            except CreditPack.DoesNotExist:
                return Response({'error': 'Pack introuvable.'}, status=404)
            abonnement = getattr(entreprise, 'abonnement', None)
            if abonnement is None:
                return Response({'error': "L'entreprise n'a pas d'abonnement actif."}, status=400)
            abonnement.credits_achetes_restants += pack.credits
            abonnement.save(update_fields=['credits_achetes_restants'])
            PaiementCreditPack.objects.create(
                entreprise=entreprise, pack_nom=pack.nom, credits=pack.credits, montant_da=pack.prix_da,
            )
            AuditLog.objects.create(
                admin=None, action='AUTRE',
                detail=f"Paiement Chargily pack crédits {pack.nom} ({pack.credits} crédits) — {entreprise.nom_entreprise}",
            )
            return Response({'status': 'ok'}, status=200)

        # Seul flux restant : page Abonnements (palier_nom dans les métadonnées). L'ancien flux
        # nb_mois (page Premium legacy) a été supprimé le 27/08/2026 (voir CLAUDE.md).
        palier_nom = metadata.get('palier_nom')
        if not palier_nom:
            logger.warning("[WEBHOOK] Paiement sans palier_nom dans les métadonnées — ignoré")
            return Response({'error': 'Métadonnées de paiement invalides (palier_nom manquant).'}, status=400)

        from ..models import Palier, AbonnementEntreprise, PaiementAbonnement
        periode = metadata.get('periode', 'MENSUEL')
        try:
            palier = Palier.objects.get(nom=palier_nom)
        except Palier.DoesNotExist:
            return Response({'error': 'Palier introuvable.'}, status=404)
        montant = palier.prix_annuel_da if periode == 'ANNUEL' else palier.prix_mensuel_da
        duree_jours = 365 if periode == 'ANNUEL' else 30
        now = timezone.now()
        abonnement = getattr(entreprise, 'abonnement', None)
        if abonnement and abonnement.palier_id == palier.id and abonnement.est_actif:
            abonnement.date_expiration = (abonnement.date_expiration or now) + datetime.timedelta(days=duree_jours)
            abonnement.save(update_fields=['date_expiration'])
        else:
            AbonnementEntreprise.objects.update_or_create(
                entreprise=entreprise,
                defaults={'palier': palier, 'date_expiration': now + datetime.timedelta(days=duree_jours)},
            )
        PaiementAbonnement.objects.create(
            entreprise=entreprise, palier_nom=palier.nom, montant_da=montant or 0,
            periode=periode, moyen_paiement='CHARGILY',
        )
        AuditLog.objects.create(
            admin=None, action='AUTRE',
            detail=f"Paiement Chargily palier {palier.nom} ({periode}) — {entreprise.nom_entreprise}",
        )
        return Response({'status': 'ok'}, status=200)


class EnvoyerRecuPremiumAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'RECRUTEUR':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            entreprise = request.user.profil_entreprise
        except Exception:
            return Response({'error': 'Profil entreprise introuvable.'}, status=404)
        moyen = request.data.get('moyen_paiement', 'CIB')
        try:
            nb_mois = int(request.data.get('nb_mois', 1))
        except (TypeError, ValueError):
            return Response({'error': 'nb_mois doit être un nombre entier.'}, status=400)
        from ..paliers_utils import get_palier_actif
        palier = get_palier_actif(entreprise)
        montant = (palier.prix_mensuel_da * nb_mois) if (palier and palier.prix_mensuel_da) else None
        message_custom = request.data.get('message', '')
        subject = f"[TafTech Premium] Reçu de paiement — {entreprise.nom_entreprise}"
        body = f"""
Bonjour,

L'entreprise suivante a envoyé une confirmation de paiement Premium :

• Entreprise : {entreprise.nom_entreprise}
• Email : {request.user.email}
• Téléphone : {request.user.telephone or 'Non renseigné'}
• Moyen de paiement : {moyen}
• Durée : {nb_mois} mois
• Montant : {f"{montant} DA" if montant else "Non calculé (palier sans prix mensuel)"}

Message du recruteur :
{message_custom or '(aucun message)'}

→ Activez le compte depuis le panel admin TafTech.
        """.strip()
        try:
            mail = EmailMultiAlternatives(subject, body, settings.DEFAULT_FROM_EMAIL, [settings.EMAIL_HOST_USER])
            mail.send()
        except Exception as e:
            return Response({'error': 'Erreur lors de l\'envoi du mail.'}, status=500)
        return Response({'message': 'Email envoyé avec succès. Activation sous 24h ouvrables.'}, status=200)
