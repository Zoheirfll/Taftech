import hashlib

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from ..models import AIConfig, QuotaIAOverride, UtilisationIA
from ..permissions import IsAdminRole
from ..serializers import AIConfigSerializer, QuotaIAOverrideSerializer
from ..serializers.ai_config import CHAMPS_BUDGET, CHAMPS_MODELE, CHAMPS_PROMPT
from .admin import _audit

User = get_user_model()

# Champs de configuration tracés dans le journal d'audit (tout sauf les prompts, tracés à part,
# et les champs calculés/automatiques).
CHAMPS_CONFIG_AUDIT = tuple(
    f for f in AIConfigSerializer.Meta.fields
    if f not in CHAMPS_PROMPT and f not in ('id', 'appels_ia_mois', 'consommation_mois', 'date_modification')
)
DETAIL_AUDIT_MAX = 255  # AuditLog.detail est un CharField(255)


def _empreinte(texte):
    return hashlib.sha256((texte or '').encode('utf-8')).hexdigest()[:8]


def _detail_prompts(avant, config):
    """Résumé d'audit des prompts modifiés : nom de la fonction, longueur avant→après et empreinte
    courte du nouveau texte. Jamais le texte lui-même (le journal est lisible par tous les admins)."""
    morceaux = []
    for champ in CHAMPS_PROMPT:
        nouveau = getattr(config, champ) or ''
        if (avant[champ] or '') != nouveau:
            nom = champ[:-len('_prompt')]
            morceaux.append(f"{nom} {len(avant[champ] or '')}→{len(nouveau)} car. #{_empreinte(nouveau)}")
    return "; ".join(morceaux)


def _detail_config(avant, config):
    return "; ".join(
        f"{champ}: {avant[champ]}→{getattr(config, champ)}"
        for champ in CHAMPS_CONFIG_AUDIT if avant[champ] != getattr(config, champ)
    )


def _detail_override(libelle, override):
    """Résumé d'audit d'un quota personnalisé : compte, fonction et limites (∞ = illimité)."""
    jour = '∞' if override.limite_jour is None else override.limite_jour
    mois = '∞' if override.limite_mois is None else override.limite_mois
    return f"{libelle} : {override.user.email} / {override.fonction} → {jour}/jour, {mois}/mois"[:DETAIL_AUDIT_MAX]


def _donnees_visibles(donnees, utilisateur):
    """Les prompts ne sont exposés qu'au Super Admin ; `prompts_accessibles` permet à l'interface
    d'adapter l'écran sans connaître le statut de l'utilisateur."""
    visibles = dict(donnees)
    est_super = bool(utilisateur.is_superuser)
    if not est_super:
        for champ in CHAMPS_PROMPT:
            visibles.pop(champ, None)
    visibles['prompts_accessibles'] = est_super
    visibles['budget_modifiable'] = est_super
    visibles['modele_modifiable'] = est_super
    return visibles


class AIConfigAdminAPIView(APIView):
    """Configuration IA (singleton) — GET retourne la config actuelle (créée avec les valeurs par
    défaut au premier accès), PUT la met à jour. Pas de POST/DELETE : une seule ligne existe
    toujours, gérée via `AIConfig.get_solo()`.

    Les prompts (lecture et écriture) sont réservés au Super Admin (`is_superuser`) ; toute
    modification de prompt ou de configuration est tracée dans le journal d'audit."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(_donnees_visibles(AIConfigSerializer(AIConfig.get_solo()).data, request.user))

    def put(self, request):
        if not request.user.is_superuser and any(champ in request.data for champ in CHAMPS_PROMPT):
            return Response(
                {'error': "La modification des prompts IA est réservée au Super Admin.", 'code': 'PROMPTS_RESERVES_SUPER_ADMIN'},
                status=403,
            )
        if not request.user.is_superuser and any(champ in request.data for champ in CHAMPS_BUDGET):
            return Response(
                {'error': "La modification du plafond global et du seuil d'alerte est réservée au Super Admin.", 'code': 'BUDGET_RESERVE_SUPER_ADMIN'},
                status=403,
            )
        if not request.user.is_superuser and any(champ in request.data for champ in CHAMPS_MODELE):
            return Response(
                {'error': "Le changement de fournisseur, de modèle, de température, d'effort de raisonnement ou de longueur maximale des réponses (max_tokens) est réservé au Super Admin.", 'code': 'MODELE_RESERVE_SUPER_ADMIN'},
                status=403,
            )
        config = AIConfig.get_solo()
        avant = {champ: getattr(config, champ) for champ in CHAMPS_PROMPT + CHAMPS_CONFIG_AUDIT}
        serializer = AIConfigSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()

        # Plafond ou seuil modifié : les alertes du mois sont ré-armées (sinon un plafond relevé puis
        # de nouveau atteint dans le même mois ne préviendrait personne).
        if (avant['budget_ia_appels_mois_max'] != config.budget_ia_appels_mois_max
                or avant['budget_ia_alerte_pct'] != config.budget_ia_alerte_pct):
            config.budget_ia_alertes_envoyees = []
            config.save(update_fields=['budget_ia_alertes_envoyees'])

        detail_prompts = _detail_prompts(avant, config)
        if detail_prompts:
            _audit(request, 'MODIFIER_PROMPT_IA', detail_prompts[:DETAIL_AUDIT_MAX])
        detail_config = _detail_config(avant, config)
        if detail_config:
            _audit(request, 'MODIFIER_CONFIG_IA', detail_config[:DETAIL_AUDIT_MAX])
        return Response(_donnees_visibles(AIConfigSerializer(config).data, request.user))


class QuotaIAOverridesAPIView(APIView):
    """CRUD des quotas IA personnalisés par compte — voir jobs/ia_quota.py. Un override remplace
    intégralement le quota par défaut (palier ou AIConfig) pour un (user, fonction) donné."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        qs = QuotaIAOverride.objects.select_related('user').order_by('-date_creation')
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(user__email__icontains=search)
        return Response(QuotaIAOverrideSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = QuotaIAOverrideSerializer(data=request.data)
        if serializer.is_valid():
            # unique_together (user, fonction) — un override existant pour ce couple est
            # remplacé plutôt que de renvoyer une erreur de contrainte peu claire à l'admin.
            QuotaIAOverride.objects.filter(
                user_id=serializer.validated_data['user'].id,
                fonction=serializer.validated_data['fonction'],
            ).delete()
            override = serializer.save()
            _audit(request, 'MODIFIER_CONFIG_IA', _detail_override("Quota personnalisé défini", override))
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            override = QuotaIAOverride.objects.select_related('user').get(pk=pk)
        except QuotaIAOverride.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        detail = _detail_override("Quota personnalisé supprimé", override)
        override.delete()
        _audit(request, 'MODIFIER_CONFIG_IA', detail)
        return Response(status=204)


class QuotaIAUsageAPIView(APIView):
    """Usage IA d'un compte (jour/mois en cours, par fonction) — pour que l'admin voie la
    consommation réelle avant de créer un override. GET ?email=xxx."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        email = request.query_params.get('email', '').strip()
        if not email:
            return Response({'error': 'Paramètre email requis.'}, status=400)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'Compte introuvable.'}, status=404)

        from ..ia_quota import _limites_effectives, _debut_jour, _debut_mois, _compter
        resultats = []
        for cle, libelle in UtilisationIA.FONCTION_CHOICES:
            limite_jour, limite_mois = _limites_effectives(user, cle)
            resultats.append({
                'fonction': cle,
                'fonction_libelle': libelle,
                'utilise_jour': _compter(user, cle, _debut_jour()),
                'limite_jour': limite_jour,
                'utilise_mois': _compter(user, cle, _debut_mois()),
                'limite_mois': limite_mois,
            })
        return Response({'user_id': user.id, 'user_email': user.email, 'usage': resultats})
