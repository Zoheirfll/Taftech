from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from jobs.models import ProfilCandidat, FormationCandidat, TypeDiplome, Notification

User = get_user_model()


class AdminFormationsAVerifierTest(APITestCase):
    """Refus d'une formation "à vérifier" — doit rester un soft-refuse traçable (statut_validation
    ='REFUSEE'), jamais une suppression réelle de la ligne (règle projet, voir CLAUDE.md)."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_fav', email='admin_fav@test.dz', password='pwd', role='ADMIN', is_staff=True,
        )
        self.candidat = User.objects.create_user(
            username='cand_fav', email='cand_fav@test.dz', password='pwd', role='CANDIDAT',
        )
        self.profil = ProfilCandidat.objects.create(user=self.candidat)
        self.diplome_ref = TypeDiplome.objects.create(code='TD-FAV-1', libelle='Licence', systeme='universitaire')
        self.formation = FormationCandidat.objects.create(
            profil=self.profil, diplome='Diplôme obscur en auto-école', statut='OBTENU',
        )
        self.assertEqual(self.formation.statut_validation, 'A_PRECISER')  # via save() auto

    def _url_liste(self):
        return reverse('admin-formations-a-verifier')

    def _url_detail(self, pk):
        return reverse('admin-formation-a-verifier-detail', kwargs={'pk': pk})

    # --- Accès ---

    def test_non_admin_refuse(self):
        self.client.force_authenticate(user=self.candidat)
        response = self.client.get(self._url_liste())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_sans_role_admin_refuse(self):
        staff_non_admin = User.objects.create_user(
            username='staff_fav', email='staff_fav@test.dz', password='pwd', role='RECRUTEUR', is_staff=True,
        )
        self.client.force_authenticate(user=staff_non_admin)
        response = self.client.delete(self._url_detail(self.formation.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Liste ---

    def test_liste_ne_contient_que_a_preciser(self):
        formation_ok = FormationCandidat.objects.create(
            profil=self.profil, diplome='Licence', diplome_ref=self.diplome_ref, statut='OBTENU',
        )
        self.assertEqual(formation_ok.statut_validation, 'DECLARE')
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self._url_liste())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in response.data['results']]
        self.assertIn(self.formation.id, ids)
        self.assertNotIn(formation_ok.id, ids)

    # --- Validation (PATCH) ---

    def test_valider_attribue_diplome_ref_et_sort_de_la_file(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(self._url_detail(self.formation.id), {'diplome_ref': self.diplome_ref.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.formation.refresh_from_db()
        self.assertEqual(self.formation.statut_validation, 'DECLARE')
        self.assertEqual(self.formation.diplome_ref_id, self.diplome_ref.id)
        self.assertTrue(
            Notification.objects.filter(destinataire=self.candidat, titre="Formation validée").exists()
        )

    # --- Refus (DELETE = soft-refuse, PAS de suppression) ---

    def test_refuser_ne_supprime_pas_la_ligne(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(self._url_detail(self.formation.id), {'motif': 'Intitulé non reconnu'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # La formation existe toujours en base — jamais un hard delete
        self.formation.refresh_from_db()
        self.assertEqual(self.formation.statut_validation, 'REFUSEE')
        self.assertEqual(self.formation.motif_refus, 'Intitulé non reconnu')
        self.assertEqual(self.formation.refusee_par_id, self.admin.id)
        self.assertIsNotNone(self.formation.date_refus)
        # Toujours visible sur le profil du candidat (related_name formations_detail)
        self.assertIn(self.formation, list(self.profil.formations_detail.all()))

    def test_formation_refusee_sort_de_la_file_a_verifier(self):
        self.client.force_authenticate(user=self.admin)
        self.client.delete(self._url_detail(self.formation.id))
        response = self.client.get(self._url_liste())
        ids = [item['id'] for item in response.data['results']]
        self.assertNotIn(self.formation.id, ids)

    def test_refuser_notifie_le_candidat_avec_le_motif(self):
        self.client.force_authenticate(user=self.admin)
        self.client.delete(self._url_detail(self.formation.id), {'motif': 'Spam'}, format='json')
        notif = Notification.objects.get(destinataire=self.candidat, titre="Formation non validée")
        self.assertIn('Spam', notif.message)

    def test_candidat_peut_corriger_apres_refus_et_repasser_declare(self):
        """Un candidat qui corrige l'intitulé après refus et se voit attribuer un diplome_ref
        valide (par lui-même via une résolution auto, ou par l'admin) doit ressortir de
        REFUSEE — pas rester bloqué indéfiniment."""
        self.client.force_authenticate(user=self.admin)
        self.client.delete(self._url_detail(self.formation.id))
        self.formation.refresh_from_db()
        self.assertEqual(self.formation.statut_validation, 'REFUSEE')

        self.formation.diplome_ref = self.diplome_ref
        self.formation.save()
        self.formation.refresh_from_db()
        self.assertEqual(self.formation.statut_validation, 'DECLARE')

    def test_refuser_formation_introuvable_404(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(self._url_detail(999999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
