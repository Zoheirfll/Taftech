"""
Tests complets pour le système d'équipe recruteur :
- EquipeActionLog (modèle + helper _log)
- EquipeAPIView (GET liste, PATCH rôle, DELETE membre)
- InviterMembreAPIView (POST invitation / ajout direct, DELETE annuler invitation)
- AccepterInvitationAPIView (GET valider token, POST créer compte / compte existant)
- EquipeAuditLogAPIView (GET journal — PROPRIETAIRE/ADMIN seulement)
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import (
    EquipeActionLog,
    InvitationEquipe,
    MembreEquipe,
    ProfilEntreprise,
)
from jobs.views.equipe import _log

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers communs
# ---------------------------------------------------------------------------

def _make_recruteur(email, username=None):
    username = username or email.split("@")[0]
    u = User.objects.create_user(username=username, email=email, password="pwd123!", role="RECRUTEUR")
    return u


def _make_entreprise(user, nom="TechCorp", rc="RC001", approuvee=True, premium=False, premium_expire=None):
    return ProfilEntreprise.objects.create(
        user=user,
        nom_entreprise=nom,
        registre_commerce=rc,
        est_approuvee=approuvee,
        est_premium=premium,
        premium_expire_at=premium_expire,
    )


# ---------------------------------------------------------------------------
# 1. Tests du modèle EquipeActionLog + helper _log
# ---------------------------------------------------------------------------

class EquipeActionLogModelTests(APITestCase):

    def setUp(self):
        self.user = _make_recruteur("owner@test.dz", "owner")
        self.entreprise = _make_entreprise(self.user)

    def test_log_cree_entree_correcte(self):
        """_log() crée un EquipeActionLog avec les bons champs."""
        _log(self.user, self.entreprise, "CREER_OFFRE", "Dev Python")
        log = EquipeActionLog.objects.get(action="CREER_OFFRE")
        self.assertEqual(log.detail, "Dev Python")
        self.assertEqual(log.membre, self.user)
        self.assertEqual(log.entreprise, self.entreprise)

    def test_log_sans_detail(self):
        """_log() accepte un detail vide."""
        _log(self.user, self.entreprise, "CONNEXION")
        log = EquipeActionLog.objects.get(action="CONNEXION")
        self.assertEqual(log.detail, "")

    def test_log_avec_membre_null(self):
        """_log() accepte membre=None (cas système)."""
        _log(None, self.entreprise, "AUTRE", "action système")
        log = EquipeActionLog.objects.get(action="AUTRE")
        self.assertIsNone(log.membre)

    def test_log_ordering_desc(self):
        """Les logs sont retournés par date décroissante."""
        _log(self.user, self.entreprise, "CONNEXION")
        _log(self.user, self.entreprise, "CREER_OFFRE")
        logs = list(EquipeActionLog.objects.filter(entreprise=self.entreprise))
        self.assertEqual(logs[0].action, "CREER_OFFRE")

    def test_plusieurs_actions_differentes(self):
        """Toutes les actions valides peuvent être enregistrées."""
        actions = [
            "CONNEXION", "CREER_OFFRE", "MODIFIER_OFFRE", "CLOTURER_OFFRE",
            "STATUT_CANDIDATURE", "EVALUER_CANDIDATURE",
            "INVITER_MEMBRE", "RETIRER_MEMBRE", "CHANGER_ROLE",
        ]
        for action in actions:
            _log(self.user, self.entreprise, action, f"test {action}")
        self.assertEqual(
            EquipeActionLog.objects.filter(entreprise=self.entreprise).count(),
            len(actions),
        )


# ---------------------------------------------------------------------------
# 2. Tests EquipeAuditLogAPIView — GET /api/equipe/audit/
# ---------------------------------------------------------------------------

class EquipeAuditLogAPIViewTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@audit.dz", "owner_audit")
        self.entreprise = _make_entreprise(self.owner, nom="AuditCorp", rc="RC_AUDIT")

        # Membre ADMIN
        self.admin_user = _make_recruteur("admin@audit.dz", "admin_audit")
        self.membre_admin = MembreEquipe.objects.create(
            user=self.admin_user, entreprise=self.entreprise, role="ADMIN"
        )

        # Membre UTILISATEUR
        self.util_user = _make_recruteur("util@audit.dz", "util_audit")
        self.membre_util = MembreEquipe.objects.create(
            user=self.util_user, entreprise=self.entreprise, role="UTILISATEUR"
        )

        # Membre INVITE
        self.invite_user = _make_recruteur("invite@audit.dz", "invite_audit")
        self.membre_invite = MembreEquipe.objects.create(
            user=self.invite_user, entreprise=self.entreprise, role="INVITE"
        )

        # Créer quelques logs
        _log(self.owner, self.entreprise, "CONNEXION", "portail recruteur")
        _log(self.admin_user, self.entreprise, "CREER_OFFRE", "Dev Backend")

        self.url = reverse("equipe-audit")

    def test_proprietaire_peut_voir_audit(self):
        """Le PROPRIETAIRE accède au journal d'activité."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_admin_peut_voir_audit(self):
        """Un membre ADMIN accède au journal d'activité."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_utilisateur_ne_peut_pas_voir_audit(self):
        """Un membre UTILISATEUR est bloqué (403)."""
        self.client.force_authenticate(user=self.util_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invite_ne_peut_pas_voir_audit(self):
        """Un membre INVITE est bloqué (403)."""
        self.client.force_authenticate(user=self.invite_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_authentifie_bloque(self):
        """Un utilisateur non authentifié est bloqué (401)."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_structure_reponse(self):
        """La réponse contient les champs attendus."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        log = response.data[0]
        self.assertIn("id", log)
        self.assertIn("action", log)
        self.assertIn("action_display", log)
        self.assertIn("detail", log)
        self.assertIn("date", log)
        self.assertIn("membre_email", log)
        self.assertIn("membre_nom", log)

    def test_limite_100_logs(self):
        """L'endpoint retourne au maximum 100 logs."""
        for i in range(105):
            _log(self.owner, self.entreprise, "AUTRE", f"log {i}")
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data), 100)


# ---------------------------------------------------------------------------
# 3. Tests EquipeAPIView — GET liste membres
# ---------------------------------------------------------------------------

class EquipeListTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@equipe.dz", "owner_equipe")
        self.entreprise = _make_entreprise(self.owner, nom="EquipeCorp", rc="RC_EQ")

        self.membre = _make_recruteur("membre@equipe.dz", "membre_equipe")
        MembreEquipe.objects.create(user=self.membre, entreprise=self.entreprise, role="UTILISATEUR")

        self.url = reverse("equipe-list")

    def test_proprietaire_voit_membres(self):
        """Le propriétaire voit la liste complète (lui + membres)."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [m["email"] for m in response.data["membres"]]
        self.assertIn("owner@equipe.dz", emails)
        self.assertIn("membre@equipe.dz", emails)

    def test_membre_voit_membres(self):
        """Un membre peut aussi voir la liste."""
        self.client.force_authenticate(user=self.membre)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("membres", response.data)
        self.assertIn("mon_role", response.data)

    def test_non_authentifie_bloque(self):
        """Accès refusé si non authentifié."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 4. Tests EquipeAPIView — PATCH changer rôle
# ---------------------------------------------------------------------------

class EquipePatchRoleTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@patch.dz", "owner_patch")
        self.entreprise = _make_entreprise(self.owner, nom="PatchCorp", rc="RC_PATCH")

        self.membre = _make_recruteur("m@patch.dz", "m_patch")
        self.mem_obj = MembreEquipe.objects.create(
            user=self.membre, entreprise=self.entreprise, role="UTILISATEUR"
        )

        self.util2 = _make_recruteur("u2@patch.dz", "u2_patch")
        MembreEquipe.objects.create(user=self.util2, entreprise=self.entreprise, role="UTILISATEUR")

    def _url(self, membre_id):
        return reverse("equipe-membre", kwargs={"membre_id": membre_id})

    def test_proprietaire_change_role(self):
        """Le propriétaire peut changer le rôle d'un membre."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self._url(self.mem_obj.id), {"role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.mem_obj.refresh_from_db()
        self.assertEqual(self.mem_obj.role, "ADMIN")

    def test_changement_role_cree_log(self):
        """PATCH rôle crée un EquipeActionLog CHANGER_ROLE."""
        self.client.force_authenticate(user=self.owner)
        self.client.patch(self._url(self.mem_obj.id), {"role": "INVITE"})
        self.assertTrue(
            EquipeActionLog.objects.filter(entreprise=self.entreprise, action="CHANGER_ROLE").exists()
        )

    def test_utilisateur_ne_peut_pas_changer_role(self):
        """Un membre UTILISATEUR ne peut pas changer le rôle d'un autre."""
        self.client.force_authenticate(user=self.util2)
        response = self.client.patch(self._url(self.mem_obj.id), {"role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_role_invalide_rejete(self):
        """Un rôle inconnu est rejeté (400)."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self._url(self.mem_obj.id), {"role": "SUPERADMIN"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_membre_inexistant_404(self):
        """PATCH sur un membre inexistant retourne 404."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self._url(99999), {"role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# 5. Tests EquipeAPIView — DELETE retirer membre
# ---------------------------------------------------------------------------

class EquipeDeleteMembreTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@del.dz", "owner_del")
        self.entreprise = _make_entreprise(self.owner, nom="DelCorp", rc="RC_DEL")

        self.target = _make_recruteur("target@del.dz", "target_del")
        self.target_obj = MembreEquipe.objects.create(
            user=self.target, entreprise=self.entreprise, role="UTILISATEUR"
        )

        # Un autre UTILISATEUR sans droit de suppression
        self.autre = _make_recruteur("autre@del.dz", "autre_del")
        self.autre_obj = MembreEquipe.objects.create(
            user=self.autre, entreprise=self.entreprise, role="UTILISATEUR"
        )

    def _url(self, membre_id):
        return reverse("equipe-membre", kwargs={"membre_id": membre_id})

    def test_proprietaire_retire_membre(self):
        """Le propriétaire peut retirer un membre."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(self._url(self.target_obj.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MembreEquipe.objects.filter(id=self.target_obj.id).exists())

    def test_retrait_cree_log(self):
        """DELETE membre crée un EquipeActionLog RETIRER_MEMBRE."""
        self.client.force_authenticate(user=self.owner)
        self.client.delete(self._url(self.target_obj.id))
        self.assertTrue(
            EquipeActionLog.objects.filter(entreprise=self.entreprise, action="RETIRER_MEMBRE").exists()
        )

    def test_membre_retire_lui_meme(self):
        """Un membre peut se retirer lui-même de l'équipe."""
        self.client.force_authenticate(user=self.target)
        response = self.client.delete(self._url(self.target_obj.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_autre_membre_ne_peut_pas_retirer(self):
        """Un UTILISATEUR ne peut pas retirer un autre membre."""
        self.client.force_authenticate(user=self.autre)
        response = self.client.delete(self._url(self.target_obj.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(MembreEquipe.objects.filter(id=self.target_obj.id).exists())


# ---------------------------------------------------------------------------
# 6. Tests InviterMembreAPIView — POST invitation
# ---------------------------------------------------------------------------

class InviterMembreTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@inv.dz", "owner_inv")
        self.entreprise = _make_entreprise(self.owner, nom="InvCorp", rc="RC_INV")

        # Un utilisateur UTILISATEUR (sans droit d'invitation)
        self.util = _make_recruteur("util@inv.dz", "util_inv")
        MembreEquipe.objects.create(user=self.util, entreprise=self.entreprise, role="UTILISATEUR")

        self.url = reverse("equipe-inviter")

    def test_invitation_nouvel_email(self):
        """Invitation envoyée si l'email n'a pas de compte TafTech."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"email": "nouveau@extern.dz", "role": "UTILISATEUR"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            InvitationEquipe.objects.filter(email="nouveau@extern.dz", entreprise=self.entreprise).exists()
        )

    def test_invitation_cree_log_inviter_membre(self):
        """InviterMembre crée un EquipeActionLog."""
        self.client.force_authenticate(user=self.owner)
        self.client.post(self.url, {"email": "log@extern.dz", "role": "UTILISATEUR"})
        self.assertTrue(
            EquipeActionLog.objects.filter(entreprise=self.entreprise, action="INVITER_MEMBRE").exists()
        )

    def test_ajout_direct_compte_existant(self):
        """Si l'email a déjà un compte TafTech, ajout direct sans invitation."""
        existant = _make_recruteur("existant@taftech.dz", "existant_inv")
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"email": "existant@taftech.dz", "role": "INVITE"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get("direct"))
        self.assertTrue(
            MembreEquipe.objects.filter(user=existant, entreprise=self.entreprise).exists()
        )

    def test_doublon_membre_rejete(self):
        """Inviter quelqu'un qui est déjà membre est refusé (400)."""
        self.client.force_authenticate(user=self.owner)
        self.client.post(self.url, {"email": "util@inv.dz", "role": "ADMIN"})
        # util@inv.dz est déjà membre
        response = self.client.post(self.url, {"email": "util@inv.dz", "role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inviter_proprietaire_lui_meme_rejete(self):
        """Le propriétaire ne peut pas s'inviter lui-même."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"email": "owner@inv.dz", "role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_role_invalide_rejete(self):
        """Un rôle invalide est refusé (400)."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"email": "new@x.dz", "role": "PROPRIETAIRE"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_utilisateur_ne_peut_pas_inviter(self):
        """Un membre UTILISATEUR ne peut pas inviter."""
        self.client.force_authenticate(user=self.util)
        response = self.client.post(self.url, {"email": "autre@x.dz", "role": "INVITE"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_email_manquant_rejete(self):
        """Email absent → 400."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"role": "UTILISATEUR"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# 7. Tests InviterMembreAPIView — DELETE annuler invitation
# ---------------------------------------------------------------------------

class AnnulerInvitationTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@cancel.dz", "owner_cancel")
        self.entreprise = _make_entreprise(self.owner, nom="CancelCorp", rc="RC_CANCEL")

        self.invitation = InvitationEquipe.objects.create(
            entreprise=self.entreprise,
            email="todelete@x.dz",
            token="tokendelete",
            role="UTILISATEUR",
            expire_at=timezone.now() + timedelta(hours=72),
        )

        self.util = _make_recruteur("util@cancel.dz", "util_cancel")
        MembreEquipe.objects.create(user=self.util, entreprise=self.entreprise, role="UTILISATEUR")

    def _url(self, inv_id):
        return reverse("equipe-invitation-supprimer", kwargs={"invitation_id": inv_id})

    def test_proprietaire_annule_invitation(self):
        """Le propriétaire peut annuler une invitation."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(self._url(self.invitation.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InvitationEquipe.objects.filter(id=self.invitation.id).exists())

    def test_utilisateur_ne_peut_pas_annuler(self):
        """Un UTILISATEUR ne peut pas annuler une invitation."""
        self.client.force_authenticate(user=self.util)
        response = self.client.delete(self._url(self.invitation.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invitation_inexistante_404(self):
        """Annuler une invitation inexistante retourne 404."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(self._url(99999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# 8. Tests AccepterInvitationAPIView — GET valider token
# ---------------------------------------------------------------------------

class AccepterInvitationGetTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@accept.dz", "owner_accept")
        self.entreprise = _make_entreprise(self.owner, nom="AcceptCorp", rc="RC_ACCEPT")

    def _make_invitation(self, email="invitee@x.dz", expire_delta=72, est_acceptee=False, token="tok123"):
        return InvitationEquipe.objects.create(
            entreprise=self.entreprise,
            email=email,
            token=token,
            role="UTILISATEUR",
            expire_at=timezone.now() + timedelta(hours=expire_delta),
            est_acceptee=est_acceptee,
        )

    def _url(self, token):
        return reverse("equipe-accepter", kwargs={"token": token})

    def test_token_valide_retourne_infos(self):
        """GET avec token valide retourne les infos de l'invitation."""
        inv = self._make_invitation()
        response = self.client.get(self._url(inv.token))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "invitee@x.dz")
        self.assertIn("entreprise", response.data)
        self.assertIn("role", response.data)
        self.assertIn("compte_existant", response.data)

    def test_token_invalide_404(self):
        """Token inexistant → 404."""
        response = self.client.get(self._url("bidon_token"))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_token_expire_400(self):
        """Token expiré → 400."""
        inv = self._make_invitation(expire_delta=-1, token="exp_tok")
        response = self.client.get(self._url(inv.token))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_deja_accepte_400(self):
        """Token déjà accepté → 400."""
        inv = self._make_invitation(est_acceptee=True, token="used_tok")
        response = self.client.get(self._url(inv.token))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_compte_existant_signale(self):
        """Si l'email a déjà un compte, compte_existant=True."""
        _make_recruteur("known@x.dz", "known_accept")
        inv = self._make_invitation(email="known@x.dz", token="known_tok")
        response = self.client.get(self._url(inv.token))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["compte_existant"])

    def test_nouveau_compte_signale(self):
        """Si l'email n'a pas de compte, compte_existant=False."""
        inv = self._make_invitation(email="nouveau@x.dz", token="new_tok")
        response = self.client.get(self._url(inv.token))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["compte_existant"])


# ---------------------------------------------------------------------------
# 9. Tests AccepterInvitationAPIView — POST accepter invitation
# ---------------------------------------------------------------------------

class AccepterInvitationPostTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@post.dz", "owner_post")
        self.entreprise = _make_entreprise(self.owner, nom="PostCorp", rc="RC_POST")

    def _make_invitation(self, email, token, expire_delta=72, est_acceptee=False):
        return InvitationEquipe.objects.create(
            entreprise=self.entreprise,
            email=email,
            token=token,
            role="UTILISATEUR",
            expire_at=timezone.now() + timedelta(hours=expire_delta),
            est_acceptee=est_acceptee,
        )

    def _url(self, token):
        return reverse("equipe-accepter", kwargs={"token": token})

    def test_nouveau_compte_cree_et_membre_ajoute(self):
        """POST avec nouveaux identifiants crée un compte et l'ajoute à l'équipe."""
        inv = self._make_invitation("nouveau@post.dz", "tok_new_post")
        response = self.client.post(self._url(inv.token), {
            "password": "SuperPwd123!",
            "first_name": "Ali",
            "last_name": "Dz",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(email="nouveau@post.dz").exists())
        user = User.objects.get(email="nouveau@post.dz")
        self.assertTrue(MembreEquipe.objects.filter(user=user, entreprise=self.entreprise).exists())

    def test_invitation_marquee_acceptee(self):
        """Après POST réussi, l'invitation est marquée est_acceptee=True."""
        inv = self._make_invitation("mark@post.dz", "tok_mark_post")
        self.client.post(self._url(inv.token), {"password": "SuperPwd123!"})
        inv.refresh_from_db()
        self.assertTrue(inv.est_acceptee)

    def test_compte_existant_bon_mot_de_passe(self):
        """Compte existant avec bon mot de passe → membre ajouté."""
        existant = User.objects.create_user(
            username="exist_post", email="exist@post.dz", password="MonPwd123!", role="RECRUTEUR"
        )
        inv = self._make_invitation("exist@post.dz", "tok_exist_post")
        response = self.client.post(self._url(inv.token), {"password": "MonPwd123!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(MembreEquipe.objects.filter(user=existant, entreprise=self.entreprise).exists())

    def test_compte_existant_mauvais_mot_de_passe(self):
        """Compte existant avec mauvais mot de passe → 400."""
        User.objects.create_user(
            username="exist_bad", email="exist_bad@post.dz", password="BonPwd123!", role="RECRUTEUR"
        )
        inv = self._make_invitation("exist_bad@post.dz", "tok_bad_post")
        response = self.client.post(self._url(inv.token), {"password": "MauvaisPwd"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mot_de_passe_trop_court(self):
        """Mot de passe < 8 caractères pour nouveau compte → 400."""
        inv = self._make_invitation("court@post.dz", "tok_court")
        response = self.client.post(self._url(inv.token), {"password": "123"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_expire_rejete(self):
        """Token expiré ne permet pas l'acceptation."""
        inv = self._make_invitation("exp@post.dz", "tok_exp_post", expire_delta=-1)
        response = self.client.post(self._url(inv.token), {"password": "SuperPwd123!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_deja_accepte_rejete(self):
        """Token déjà utilisé retourne 400."""
        inv = self._make_invitation("used@post.dz", "tok_used_post", est_acceptee=True)
        response = self.client.post(self._url(inv.token), {"password": "SuperPwd123!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_invalide_rejete(self):
        """Token inexistant retourne 404."""
        response = self.client.post(self._url("invalid_tok"), {"password": "SuperPwd123!"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
