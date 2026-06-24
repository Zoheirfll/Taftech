import secrets
from datetime import timedelta
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import MembreEquipe, InvitationEquipe, ProfilEntreprise, EquipeActionLog

User = get_user_model()

ROLES_MODIFIABLES = ['ADMIN', 'UTILISATEUR', 'INVITE']
INVITATION_EXPIRY_HOURS = 72


def get_entreprise_for_user(user):
    """Retourne le ProfilEntreprise lié à l'utilisateur (owner ou membre)."""
    if hasattr(user, 'profil_entreprise'):
        return user.profil_entreprise
    membre = MembreEquipe.objects.filter(user=user).select_related('entreprise').first()
    return membre.entreprise if membre else None


def get_membre_role(user, entreprise):
    """Retourne le rôle de l'utilisateur dans l'entreprise."""
    if hasattr(user, 'profil_entreprise') and user.profil_entreprise.id == entreprise.id:
        return 'PROPRIETAIRE'
    membre = MembreEquipe.objects.filter(user=user, entreprise=entreprise).first()
    return membre.role if membre else None


def _log(user, entreprise, action, detail=''):
    """Enregistre une action d'un membre dans le journal de l'équipe."""
    EquipeActionLog.objects.create(entreprise=entreprise, membre=user, action=action, detail=detail)


def _envoyer_email_invitation(invitation, request):
    site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')
    lien = f"{site_url}/invitation/equipe/{invitation.token}"
    sujet = f"Invitation à rejoindre {invitation.entreprise.nom_entreprise} sur TafTech"
    texte = (
        f"Bonjour,\n\n"
        f"Vous avez été invité(e) à rejoindre l'équipe de {invitation.entreprise.nom_entreprise} "
        f"sur TafTech en tant que {invitation.get_role_display()}.\n\n"
        f"Cliquez sur le lien suivant pour accepter l'invitation (valable 72h) :\n{lien}\n\n"
        f"Si vous n'attendiez pas cette invitation, ignorez cet email.\n\n"
        f"L'équipe TafTech"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#1e293b">Invitation à rejoindre <strong>{invitation.entreprise.nom_entreprise}</strong></h2>
      <p style="color:#475569">Vous avez été invité(e) en tant que <strong>{invitation.get_role_display()}</strong>.</p>
      <a href="{lien}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
        Accepter l'invitation
      </a>
      <p style="color:#94a3b8;font-size:12px">Lien valable 72 heures. Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
    </div>
    """
    msg = EmailMultiAlternatives(sujet, texte, settings.EMAIL_HOST_USER, [invitation.email])
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=True)


def _envoyer_email_bienvenue(user, entreprise, role):
    role_display = dict(MembreEquipe.ROLES).get(role, role)
    site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')
    sujet = f"Vous avez été ajouté(e) à l'équipe {entreprise.nom_entreprise} sur TafTech"
    texte = (
        f"Bonjour {user.first_name or user.email},\n\n"
        f"Vous avez été ajouté(e) à l'équipe de {entreprise.nom_entreprise} "
        f"en tant que {role_display}.\n\n"
        f"Connectez-vous à votre espace recruteur : {site_url}/recruteurs/connexion\n\n"
        f"L'équipe TafTech"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#1e293b">Vous rejoignez <strong>{entreprise.nom_entreprise}</strong></h2>
      <p style="color:#475569">Bonjour {user.first_name or ''},<br>
      Vous avez été ajouté(e) en tant que <strong>{role_display}</strong>.</p>
      <a href="{site_url}/recruteurs/connexion" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
        Accéder à mon espace recruteur
      </a>
      <p style="color:#94a3b8;font-size:12px">Utilisez votre email et mot de passe habituels TafTech.</p>
    </div>
    """
    msg = EmailMultiAlternatives(sujet, texte, settings.EMAIL_HOST_USER, [user.email])
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=True)


class EquipeAPIView(APIView):
    """Liste les membres et gère les actions sur un membre existant."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Entreprise introuvable.'}, status=404)

        mon_role = get_membre_role(request.user, entreprise)

        # Propriétaire
        membres = [
            {
                'id': None,
                'user_id': entreprise.user.id,
                'email': entreprise.user.email,
                'first_name': entreprise.user.first_name,
                'last_name': entreprise.user.last_name,
                'role': 'PROPRIETAIRE',
                'date_ajout': entreprise.user.date_joined.strftime('%d/%m/%Y'),
                'est_moi': entreprise.user.id == request.user.id,
            }
        ]

        # Membres
        for m in MembreEquipe.objects.filter(entreprise=entreprise).select_related('user'):
            membres.append({
                'id': m.id,
                'user_id': m.user.id,
                'email': m.user.email,
                'first_name': m.user.first_name,
                'last_name': m.user.last_name,
                'role': m.role,
                'date_ajout': m.date_ajout.strftime('%d/%m/%Y'),
                'est_moi': m.user.id == request.user.id,
            })

        # Invitations en attente
        invitations = [
            {
                'id': inv.id,
                'email': inv.email,
                'role': inv.role,
                'expire_at': inv.expire_at.strftime('%d/%m/%Y %H:%M'),
                'est_expiree': inv.expire_at < timezone.now(),
            }
            for inv in InvitationEquipe.objects.filter(entreprise=entreprise, est_acceptee=False)
        ]

        return Response({
            'membres': membres,
            'invitations': invitations,
            'mon_role': mon_role,
        })

    def patch(self, request, membre_id):
        """Changer le rôle d'un membre."""
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Entreprise introuvable.'}, status=404)
        if get_membre_role(request.user, entreprise) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({'error': 'Action réservée au propriétaire ou admin.'}, status=403)

        try:
            membre = MembreEquipe.objects.get(id=membre_id, entreprise=entreprise)
        except MembreEquipe.DoesNotExist:
            return Response({'error': 'Membre introuvable.'}, status=404)

        nouveau_role = request.data.get('role')
        if nouveau_role not in ROLES_MODIFIABLES:
            return Response({'error': 'Rôle invalide.'}, status=400)

        membre.role = nouveau_role
        membre.save(update_fields=['role'])
        _log(request.user, entreprise, 'CHANGER_ROLE', f"{membre.user.email} → {nouveau_role}")
        return Response({'message': 'Rôle mis à jour.'})

    def delete(self, request, membre_id):
        """Retirer un membre de l'équipe."""
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Entreprise introuvable.'}, status=404)

        mon_role = get_membre_role(request.user, entreprise)

        try:
            membre = MembreEquipe.objects.get(id=membre_id, entreprise=entreprise)
        except MembreEquipe.DoesNotExist:
            return Response({'error': 'Membre introuvable.'}, status=404)

        # Un membre peut se retirer lui-même, propriétaire/admin peuvent retirer tout le monde
        # Mais un admin ne peut pas retirer le propriétaire (il n'a pas de MembreEquipe donc DoesNotExist déjà levé)
        if membre.user != request.user and mon_role not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({'error': 'Action non autorisée.'}, status=403)

        email_retire = membre.user.email
        membre.delete()
        _log(request.user, entreprise, 'RETIRER_MEMBRE', email_retire)
        return Response({'message': 'Membre retiré.'}, status=204)


class InviterMembreAPIView(APIView):
    """Envoie une invitation par email."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Entreprise introuvable.'}, status=404)
        if get_membre_role(request.user, entreprise) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({'error': 'Action réservée au propriétaire ou admin.'}, status=403)

        email = request.data.get('email', '').strip().lower()
        role = request.data.get('role', 'UTILISATEUR')

        if not email:
            return Response({'error': 'Email obligatoire.'}, status=400)
        if role not in ROLES_MODIFIABLES:
            return Response({'error': 'Rôle invalide.'}, status=400)

        # Déjà membre ?
        if MembreEquipe.objects.filter(entreprise=entreprise, user__email=email).exists():
            return Response({'error': 'Cette personne est déjà membre de votre équipe.'}, status=400)

        # Propriétaire lui-même ?
        if entreprise.user.email == email:
            return Response({'error': 'Vous êtes déjà le propriétaire.'}, status=400)

        # Si l'utilisateur a déjà un compte TafTech
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            if getattr(existing_user, 'est_compte_google', False):
                # Compte Google : envoyer lien invitation pour qu'il définisse un mot de passe recruteur
                InvitationEquipe.objects.filter(entreprise=entreprise, email=email, est_acceptee=False).delete()
                token = secrets.token_urlsafe(32)
                invitation = InvitationEquipe.objects.create(
                    entreprise=entreprise,
                    email=email,
                    token=token,
                    role=role,
                    expire_at=timezone.now() + timedelta(hours=INVITATION_EXPIRY_HOURS),
                )
                _envoyer_email_invitation(invitation, request)
                _log(request.user, entreprise, 'INVITER_MEMBRE', f"{email} ({role}) — invitation Google (mdp requis)")
                return Response({'message': f'Invitation envoyée à {email} (compte Google — définition mot de passe requise).'}, status=201)
            # Compte email classique → ajout direct
            MembreEquipe.objects.create(entreprise=entreprise, user=existing_user, role=role)
            _envoyer_email_bienvenue(existing_user, entreprise, role)
            _log(request.user, entreprise, 'INVITER_MEMBRE', f"{email} ({role}) — ajout direct")
            return Response({'message': f'{email} a été ajouté(e) directement à votre équipe.', 'direct': True}, status=201)

        # Supprimer ancienne invitation non acceptée pour re-inviter
        InvitationEquipe.objects.filter(entreprise=entreprise, email=email, est_acceptee=False).delete()

        token = secrets.token_urlsafe(32)
        invitation = InvitationEquipe.objects.create(
            entreprise=entreprise,
            email=email,
            token=token,
            role=role,
            expire_at=timezone.now() + timedelta(hours=INVITATION_EXPIRY_HOURS),
        )
        _envoyer_email_invitation(invitation, request)
        _log(request.user, entreprise, 'INVITER_MEMBRE', f"{email} ({role}) — invitation envoyée")
        return Response({'message': f'Invitation envoyée à {email}.'}, status=201)

    def delete(self, request, invitation_id):
        """Annuler une invitation en attente."""
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Entreprise introuvable.'}, status=404)
        if get_membre_role(request.user, entreprise) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({'error': 'Action non autorisée.'}, status=403)

        try:
            inv = InvitationEquipe.objects.get(id=invitation_id, entreprise=entreprise, est_acceptee=False)
        except InvitationEquipe.DoesNotExist:
            return Response({'error': 'Invitation introuvable.'}, status=404)

        inv.delete()
        return Response({'message': 'Invitation annulée.'}, status=204)


class EquipeAuditLogAPIView(APIView):
    """Journal d'activité de l'équipe — accessible PROPRIETAIRE et ADMIN uniquement."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({'error': 'Entreprise introuvable.'}, status=404)
        if get_membre_role(request.user, entreprise) not in ('PROPRIETAIRE', 'ADMIN'):
            return Response({'error': 'Accès réservé au propriétaire ou admin.'}, status=403)

        logs = EquipeActionLog.objects.filter(entreprise=entreprise).select_related('membre')[:100]
        data = [
            {
                'id': log.id,
                'action': log.action,
                'action_display': log.get_action_display(),
                'detail': log.detail,
                'date': log.date.strftime('%d/%m/%Y à %H:%M'),
                'membre_email': log.membre.email if log.membre else '—',
                'membre_nom': f"{log.membre.first_name} {log.membre.last_name}".strip() if log.membre else '—',
            }
            for log in logs
        ]
        return Response(data)


class AccepterInvitationAPIView(APIView):
    """Endpoint public pour valider et accepter une invitation."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        """Valide le token et retourne les infos de l'invitation."""
        try:
            inv = InvitationEquipe.objects.select_related('entreprise').get(token=token)
        except InvitationEquipe.DoesNotExist:
            return Response({'error': 'Lien invalide ou expiré.'}, status=404)

        if inv.est_acceptee:
            return Response({'error': 'Cette invitation a déjà été acceptée.'}, status=400)
        if inv.expire_at < timezone.now():
            return Response({'error': 'Ce lien a expiré. Demandez une nouvelle invitation.'}, status=400)

        # Vérifier si un compte existe déjà avec cet email
        existing = User.objects.filter(email=inv.email).first()
        compte_existant = existing is not None
        sans_mot_de_passe = compte_existant and getattr(existing, 'est_compte_google', False)

        return Response({
            'entreprise': inv.entreprise.nom_entreprise,
            'role': inv.role,
            'role_display': inv.get_role_display(),
            'email': inv.email,
            'compte_existant': compte_existant,
            'sans_mot_de_passe': sans_mot_de_passe,
        })

    def post(self, request, token):
        """Accepte l'invitation. Crée un compte si nécessaire."""
        try:
            inv = InvitationEquipe.objects.select_related('entreprise').get(token=token)
        except InvitationEquipe.DoesNotExist:
            return Response({'error': 'Lien invalide ou expiré.'}, status=404)

        if inv.est_acceptee:
            return Response({'error': 'Cette invitation a déjà été acceptée.'}, status=400)
        if inv.expire_at < timezone.now():
            return Response({'error': 'Ce lien a expiré.'}, status=400)

        user = User.objects.filter(email=inv.email).first()

        if user:
            password = request.data.get('password', '')
            if getattr(user, 'est_compte_google', False):
                # Compte Google — définir un mot de passe pour l'espace recruteur
                if not password or len(password) < 8:
                    return Response({'error': 'Créez un mot de passe (8 caractères minimum) pour accéder à l\'espace recruteur.'}, status=400)
                user.set_password(password)
                user.save(update_fields=['password'])
            else:
                # Compte email — vérifier le mot de passe existant
                if not user.check_password(password):
                    return Response({'error': 'Mot de passe incorrect.'}, status=400)
        else:
            # Nouveau compte
            password = request.data.get('password', '')
            first_name = request.data.get('first_name', '').strip()
            last_name = request.data.get('last_name', '').strip()

            if not password or len(password) < 8:
                return Response({'error': 'Mot de passe requis (8 caractères minimum).'}, status=400)

            user = User.objects.create_user(
                username=inv.email,
                email=inv.email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                role='RECRUTEUR',
            )
            user.email_verifie = True
            user.save(update_fields=['email_verifie'])

        # Créer le lien MembreEquipe (éviter doublon)
        MembreEquipe.objects.get_or_create(
            entreprise=inv.entreprise,
            user=user,
            defaults={'role': inv.role},
        )

        inv.est_acceptee = True
        inv.save(update_fields=['est_acceptee'])

        return Response({
            'message': f'Bienvenue dans l\'équipe {inv.entreprise.nom_entreprise} !',
            'email': user.email,
        })
