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
    Palier,
    AbonnementEntreprise,
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


def _business_palier():
    palier, _ = Palier.objects.get_or_create(
        nom='BUSINESS',
        defaults=dict(acces_coordonnees=True, acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True, ordre=3),
    )
    return palier


def _make_entreprise(user, nom="TechCorp", rc="RC001", approuvee=True, premium=False, premium_expire=None):
    entreprise = ProfilEntreprise.objects.create(
        user=user,
        nom_entreprise=nom,
        registre_commerce=rc,
        est_approuvee=approuvee,
    )
    if premium:
        # Système Palier/AbonnementEntreprise (le legacy est_premium/premium_expire_at a été
        # supprimé le 27/08/2026) — palier BUSINESS (acces_equipe=True) par défaut, cohérent
        # avec l'ancien comportement de repli des tests qui utilisaient premium=True.
        AbonnementEntreprise.objects.create(
            entreprise=entreprise, palier=_business_palier(), date_expiration=premium_expire,
        )
    return entreprise


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
        self.entreprise = _make_entreprise(self.owner, nom="AuditCorp", rc="RC_AUDIT", premium=True)

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
        self.entreprise = _make_entreprise(self.owner, nom="EquipeCorp", rc="RC_EQ", premium=True)

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

    def test_utilisateur_ne_voit_pas_la_liste(self):
        """Un membre UTILISATEUR (ou invité) n'a pas accès à la gestion d'équipe : 403,
        et la liste des emails des collègues n'est pas renvoyée."""
        self.client.force_authenticate(user=self.membre)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn("membres", response.data)

    def test_invite_ne_voit_pas_la_liste(self):
        """Un invité (rôle le plus bas) n'a pas accès non plus."""
        invite = _make_recruteur("invite@equipe.dz", "invite_equipe")
        MembreEquipe.objects.create(user=invite, entreprise=self.entreprise, role="INVITE")
        self.client.force_authenticate(user=invite)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_voit_membres(self):
        """Un administrateur voit la liste (il gère l'équipe) avec son rôle."""
        admin = _make_recruteur("admin@equipe.dz", "admin_equipe")
        MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("membres", response.data)
        self.assertEqual(response.data["mon_role"], "ADMIN")

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
        self.entreprise = _make_entreprise(self.owner, nom="PatchCorp", rc="RC_PATCH", premium=True)

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

    def test_admin_ne_peut_pas_modifier_un_autre_admin(self):
        """Seul le propriétaire touche aux administrateurs."""
        admin = _make_recruteur("adm1@patch.dz", "adm1_patch")
        MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        autre = _make_recruteur("adm2@patch.dz", "adm2_patch")
        autre_obj = MembreEquipe.objects.create(user=autre, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.patch(self._url(autre_obj.id), {"role": "INVITE"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        autre_obj.refresh_from_db()
        self.assertEqual(autre_obj.role, "ADMIN")

    def test_admin_ne_peut_pas_promouvoir_en_admin(self):
        """Seul le propriétaire attribue le rôle administrateur."""
        admin = _make_recruteur("adm3@patch.dz", "adm3_patch")
        MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.patch(self._url(self.mem_obj.id), {"role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.mem_obj.refresh_from_db()
        self.assertEqual(self.mem_obj.role, "UTILISATEUR")

    def test_admin_change_le_role_d_un_utilisateur(self):
        """Un administrateur gère toujours les rôles non administrateur."""
        admin = _make_recruteur("adm4@patch.dz", "adm4_patch")
        MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.patch(self._url(self.mem_obj.id), {"role": "INVITE"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_ne_peut_pas_modifier_son_propre_role(self):
        """Personne ne change son propre rôle (même appel direct à l'API)."""
        admin = _make_recruteur("adm@patch.dz", "adm_patch")
        adm_obj = MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.patch(self._url(adm_obj.id), {"role": "UTILISATEUR"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        adm_obj.refresh_from_db()
        self.assertEqual(adm_obj.role, "ADMIN")

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
        self.entreprise = _make_entreprise(self.owner, nom="DelCorp", rc="RC_DEL", premium=True)

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

    def test_admin_ne_peut_pas_retirer_un_autre_admin(self):
        """Seul le propriétaire retire un administrateur."""
        admin = _make_recruteur("adm@del.dz", "adm_del")
        MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        autre = _make_recruteur("adm2@del.dz", "adm2_del")
        autre_obj = MembreEquipe.objects.create(user=autre, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.delete(self._url(autre_obj.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(MembreEquipe.objects.filter(id=autre_obj.id).exists())

    def test_admin_peut_se_retirer_lui_meme(self):
        """Un administrateur peut quitter l'équipe."""
        admin = _make_recruteur("adm3@del.dz", "adm3_del")
        adm_obj = MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.delete(self._url(adm_obj.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_retire_un_utilisateur(self):
        """Un administrateur retire toujours un membre non administrateur."""
        admin = _make_recruteur("adm4@del.dz", "adm4_del")
        MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.delete(self._url(self.target_obj.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_autre_membre_ne_peut_pas_retirer(self):
        """Un UTILISATEUR ne peut pas retirer un autre membre."""
        self.client.force_authenticate(user=self.autre)
        response = self.client.delete(self._url(self.target_obj.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(MembreEquipe.objects.filter(id=self.target_obj.id).exists())


# ---------------------------------------------------------------------------
# 5 bis. Sort du compte d'un membre retiré (25/10/2026)
# ---------------------------------------------------------------------------

class EquipeRetraitSupprimeCompteTests(APITestCase):
    """Un compte créé par l'invitation disparaît quand on le retire ; tout autre cas le conserve."""

    def setUp(self):
        self.owner = _make_recruteur("owner@sup.dz", "owner_sup")
        self.entreprise = _make_entreprise(self.owner, nom="SupCorp", rc="RC_SUP", premium=True)

    def _membre(self, email, par_invitation=True, role="UTILISATEUR"):
        user = _make_recruteur(email)
        user.compte_cree_par_invitation = par_invitation
        user.save(update_fields=["compte_cree_par_invitation"])
        return user, MembreEquipe.objects.create(user=user, entreprise=self.entreprise, role=role)

    def _retirer(self, acteur, membre):
        self.client.force_authenticate(user=acteur)
        return self.client.delete(reverse("equipe-membre", kwargs={"membre_id": membre.id}))

    def test_compte_cree_par_invitation_supprime(self):
        user, membre = self._membre("invite@sup.dz")
        response = self._retirer(self.owner, membre)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(email="invite@sup.dz").exists())

    def test_suppression_tracee_avec_email(self):
        user, membre = self._membre("trace@sup.dz")
        self._retirer(self.owner, membre)
        log = EquipeActionLog.objects.get(entreprise=self.entreprise, action="RETIRER_MEMBRE")
        self.assertIn("trace@sup.dz", log.detail)
        self.assertIn("compte supprimé", log.detail)

    def test_compte_preexistant_conserve(self):
        user, membre = self._membre("ancien@sup.dz", par_invitation=False)
        self._retirer(self.owner, membre)
        self.assertTrue(User.objects.filter(email="ancien@sup.dz").exists())
        self.assertIn("préexistant", EquipeActionLog.objects.get(action="RETIRER_MEMBRE").detail)

    def test_membre_qui_quitte_lui_meme_garde_son_compte(self):
        user, membre = self._membre("quitte@sup.dz")
        response = self._retirer(user, membre)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(User.objects.filter(email="quitte@sup.dz").exists())

    def test_compte_avec_questionnaire_conserve(self):
        """Le CASCADE de Questionnaire.recruteur détruirait un questionnaire de l'entreprise."""
        from jobs.models import Questionnaire
        user, membre = self._membre("quest@sup.dz", role="ADMIN")
        Questionnaire.objects.create(recruteur=user, titre="Entretien")
        self._retirer(self.owner, membre)
        self.assertTrue(User.objects.filter(email="quest@sup.dz").exists())
        self.assertTrue(Questionnaire.objects.filter(titre="Entretien").exists())
        self.assertIn("Questionnaire", EquipeActionLog.objects.get(action="RETIRER_MEMBRE").detail)

    def test_compte_membre_d_une_autre_equipe_conserve(self):
        user, membre = self._membre("deux@sup.dz")
        autre_owner = _make_recruteur("autre_owner@sup.dz")
        autre = _make_entreprise(autre_owner, nom="Autre", rc="RC_AUTRE", premium=True)
        MembreEquipe.objects.create(user=user, entreprise=autre, role="UTILISATEUR")
        self._retirer(self.owner, membre)
        self.assertTrue(User.objects.filter(email="deux@sup.dz").exists())

    def test_compte_staff_conserve(self):
        user, membre = self._membre("staff@sup.dz")
        user.is_staff = True
        user.save(update_fields=["is_staff"])
        self._retirer(self.owner, membre)
        self.assertTrue(User.objects.filter(email="staff@sup.dz").exists())

    def test_parcours_complet_acceptation_puis_retrait(self):
        """Via les vraies routes : l'acceptation pose le drapeau, le retrait supprime le compte."""
        inv = InvitationEquipe.objects.create(
            entreprise=self.entreprise, email="parcours@sup.dz", token="tok_parcours", role="UTILISATEUR",
            expire_at=timezone.now() + timedelta(hours=72),
        )
        self.client.post(reverse("equipe-accepter", kwargs={"token": inv.token}), {"password": "SuperPwd123!"})
        user = User.objects.get(email="parcours@sup.dz")
        self.assertTrue(user.compte_cree_par_invitation)
        membre = MembreEquipe.objects.get(user=user)
        self.assertEqual(self._retirer(self.owner, membre).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(email="parcours@sup.dz").exists())

    def test_acceptation_d_un_compte_existant_ne_pose_pas_le_drapeau(self):
        existant = _make_recruteur("existant@sup.dz")
        inv = InvitationEquipe.objects.create(
            entreprise=self.entreprise, email="existant@sup.dz", token="tok_existant", role="UTILISATEUR",
            expire_at=timezone.now() + timedelta(hours=72),
        )
        self.client.post(reverse("equipe-accepter", kwargs={"token": inv.token}), {"password": "pwd123!"})
        existant.refresh_from_db()
        self.assertFalse(existant.compte_cree_par_invitation)


# ---------------------------------------------------------------------------
# 6. Tests InviterMembreAPIView — POST invitation
# ---------------------------------------------------------------------------

class InviterMembreTests(APITestCase):

    def setUp(self):
        self.owner = _make_recruteur("owner@inv.dz", "owner_inv")
        # premium=True → AbonnementEntreprise(palier=BUSINESS, acces_equipe=True) via le helper
        # _make_entreprise — InviterMembreAPIView est gatée Business+ depuis la Phase 2b
        # (session 22-23/08/2026).
        self.entreprise = _make_entreprise(self.owner, nom="InvCorp", rc="RC_INV", premium=True)

        # Un utilisateur UTILISATEUR (sans droit d'invitation)
        self.util = _make_recruteur("util@inv.dz", "util_inv")
        MembreEquipe.objects.create(user=self.util, entreprise=self.entreprise, role="UTILISATEUR")

        self.url = reverse("equipe-inviter")

    def test_admin_ne_peut_pas_inviter_un_admin(self):
        """Seul le propriétaire invite avec le rôle administrateur."""
        admin = _make_recruteur("adm@inv.dz", "adm_inv")
        MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.post(self.url, {"email": "futur.admin@extern.dz", "role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(InvitationEquipe.objects.filter(email="futur.admin@extern.dz").exists())

    def test_admin_invite_un_utilisateur(self):
        """Un administrateur invite toujours avec un rôle inférieur."""
        admin = _make_recruteur("adm2@inv.dz", "adm2_inv")
        MembreEquipe.objects.create(user=admin, entreprise=self.entreprise, role="ADMIN")
        self.client.force_authenticate(user=admin)
        response = self.client.post(self.url, {"email": "futur.user@extern.dz", "role": "UTILISATEUR"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

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

    def test_compte_existant_recoit_invitation_pas_ajout_direct(self):
        """Si l'email a déjà un compte TafTech classique, une invitation à accepter est envoyée
        (jamais d'ajout direct sans consentement — évite l'ajout non désiré à une équipe)."""
        existant = _make_recruteur("existant@taftech.dz", "existant_inv")
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"email": "existant@taftech.dz", "role": "INVITE"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("direct", response.data)
        self.assertFalse(
            MembreEquipe.objects.filter(user=existant, entreprise=self.entreprise).exists()
        )
        self.assertTrue(
            InvitationEquipe.objects.filter(
                entreprise=self.entreprise, email="existant@taftech.dz", est_acceptee=False
            ).exists()
        )

    def test_message_invitation_identique_compte_existant_ou_non(self):
        """Le message de réponse ne doit pas révéler si l'email correspond à un compte
        TafTech existant (évite l'énumération de comptes via ce endpoint)."""
        _make_recruteur("existant2@taftech.dz", "existant_inv2")
        self.client.force_authenticate(user=self.owner)
        r_existant = self.client.post(self.url, {"email": "existant2@taftech.dz", "role": "INVITE"})
        r_inconnu = self.client.post(self.url, {"email": "totalement.inconnu@x.dz", "role": "INVITE"})
        self.assertEqual(r_existant.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r_inconnu.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            r_existant.data["message"].replace("existant2@taftech.dz", "{email}"),
            r_inconnu.data["message"].replace("totalement.inconnu@x.dz", "{email}"),
        )

    def test_inviter_proprietaire_d_une_autre_entreprise_rejete(self):
        """Un recruteur qui possède déjà son entreprise ne verrait jamais celle-ci
        (get_entreprise_for_user donne la priorité à la sienne) : invitation refusée."""
        autre_owner = _make_recruteur("autreowner@inv.dz", "autre_owner_inv")
        _make_entreprise(autre_owner, nom="AutreCorp", rc="RC_AUTRE")
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"email": "autreowner@inv.dz", "role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(InvitationEquipe.objects.filter(email="autreowner@inv.dz").exists())

    def test_inviter_membre_d_une_autre_equipe_rejete(self):
        """Quelqu'un qui fait déjà partie de l'équipe d'une autre entreprise est refusé."""
        autre_owner = _make_recruteur("autreowner2@inv.dz", "autre_owner_inv2")
        autre_entreprise = _make_entreprise(autre_owner, nom="AutreCorp2", rc="RC_AUTRE2", premium=True)
        membre = _make_recruteur("membre@autre.dz", "membre_autre_inv")
        MembreEquipe.objects.create(user=membre, entreprise=autre_entreprise, role="UTILISATEUR")
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, {"email": "membre@autre.dz", "role": "ADMIN"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(InvitationEquipe.objects.filter(email="membre@autre.dz").exists())

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
        self.entreprise = _make_entreprise(self.owner, nom="CancelCorp", rc="RC_CANCEL", premium=True)

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

    def test_compte_sans_mot_de_passe_signale_meme_sans_drapeau_google(self):
        """Un compte sans mot de passe utilisable (est_compte_google=False) doit être
        traité comme un compte Google : sans_mot_de_passe=True."""
        User.objects.create_user(username="nopwd_get", email="nopwd@x.dz", password=None, role="CANDIDAT")
        inv = self._make_invitation(email="nopwd@x.dz", token="nopwd_tok")
        response = self.client.get(self._url(inv.token))
        self.assertTrue(response.data["sans_mot_de_passe"])

    def test_compte_mot_de_passe_vide_signale_sans_mot_de_passe(self):
        """Mot de passe stocké comme chaîne vide (cas réel d'un compte Google ancien) :
        has_usable_password() est True mais le compte n'a aucun mot de passe."""
        user = User.objects.create_user(username="vide_get", email="vide@x.dz", password="x", role="CANDIDAT")
        User.objects.filter(pk=user.pk).update(password="")
        inv = self._make_invitation(email="vide@x.dz", token="vide_tok")
        response = self.client.get(self._url(inv.token))
        self.assertTrue(response.data["sans_mot_de_passe"])

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

    def test_compte_sans_mot_de_passe_definit_un_mot_de_passe(self):
        """Compte sans mot de passe utilisable : l'acceptation définit le mot de passe saisi."""
        user = User.objects.create_user(username="nopwd_post", email="nopwd@post.dz", password=None, role="CANDIDAT")
        inv = self._make_invitation("nopwd@post.dz", "tok_nopwd_post")
        response = self.client.post(self._url(inv.token), {"password": "NouveauPwd123!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NouveauPwd123!"))
        self.assertTrue(MembreEquipe.objects.filter(user=user, entreprise=self.entreprise).exists())

    def test_proprietaire_d_une_autre_entreprise_ne_peut_pas_accepter(self):
        """Invité devenu propriétaire d'une entreprise entre l'envoi et l'acceptation : refus."""
        user = User.objects.create_user(username="own_acc", email="own@post.dz", password="MonPwd123!", role="RECRUTEUR")
        _make_entreprise(user, nom="DejaCorp", rc="RC_DEJA")
        inv = self._make_invitation("own@post.dz", "tok_own_post")
        response = self.client.post(self._url(inv.token), {"password": "MonPwd123!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(MembreEquipe.objects.filter(user=user, entreprise=self.entreprise).exists())

    def test_membre_d_une_autre_equipe_ne_peut_pas_accepter(self):
        """Invité entré dans une autre équipe entre l'envoi et l'acceptation : refus."""
        autre_owner = _make_recruteur("autre@post.dz", "autre_post")
        autre = _make_entreprise(autre_owner, nom="AutreCorp", rc="RC_AUTRE_P", premium=True)
        user = User.objects.create_user(username="mem_acc", email="mem@post.dz", password="MonPwd123!", role="RECRUTEUR")
        MembreEquipe.objects.create(user=user, entreprise=autre, role="UTILISATEUR")
        inv = self._make_invitation("mem@post.dz", "tok_mem_post")
        response = self.client.post(self._url(inv.token), {"password": "MonPwd123!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(MembreEquipe.objects.filter(user=user, entreprise=self.entreprise).exists())

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
