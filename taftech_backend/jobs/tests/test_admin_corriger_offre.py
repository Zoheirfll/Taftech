"""Correction d'une offre par l'admin pendant la modération : réservée à l'admin, seulement « En attente »,
champs sur liste blanche, audit et e-mail au recruteur."""
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import AuditLog, OffreEmploi, ProfilEntreprise

User = get_user_model()


class CorrigerOffreTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)
        self.rh = User.objects.create_user(username='rh', email='rh@test.dz', role='RECRUTEUR')
        entreprise = ProfilEntreprise.objects.create(user=self.rh, nom_entreprise='ACME', registre_commerce='RC1', est_approuvee=True)
        self.offre = OffreEmploi.objects.create(
            entreprise=entreprise, titre='Developeur web', description='Une offre avec une faute.',
            wilaya='16 - Alger', experience_requise='DEBUTANT', statut_moderation='EN_ATTENTE',
        )
        self.url = f'/api/jobs/admin/offres/{self.offre.id}/corriger/'
        self.client.force_authenticate(user=self.admin)

    def test_corrige_les_champs_trace_l_audit_et_previent_le_recruteur(self):
        reponse = self.client.patch(self.url, {'titre': 'Développeur web', 'description': 'Une offre corrigée.'}, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK, reponse.data)
        self.offre.refresh_from_db()
        self.assertEqual((self.offre.titre, self.offre.statut_moderation), ('Développeur web', 'EN_ATTENTE'))
        self.assertEqual(set(reponse.data['changements']), {'titre', 'description'})
        journal = AuditLog.objects.get(action='CORRIGER_OFFRE')
        self.assertIn('titre', journal.detail)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['rh@test.dz'])
        self.assertIn('Developeur web', mail.outbox[0].body)
        self.assertIn('Développeur web', mail.outbox[0].body)

    def test_une_correction_sans_changement_ne_trace_rien(self):
        reponse = self.client.patch(self.url, {'titre': 'Developeur web'}, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.assertEqual(reponse.data['changements'], [])
        self.assertFalse(AuditLog.objects.filter(action='CORRIGER_OFFRE').exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_refuse_une_offre_deja_publiee_ou_rejetee(self):
        for statut in ('APPROUVEE', 'REJETEE'):
            OffreEmploi.objects.filter(pk=self.offre.pk).update(statut_moderation=statut)
            reponse = self.client.patch(self.url, {'titre': 'Autre'}, format='json')
            self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST, statut)
            self.assertEqual(reponse.data['code'], 'OFFRE_NON_EN_ATTENTE')
        self.offre.refresh_from_db()
        self.assertEqual(self.offre.titre, 'Developeur web')

    def test_le_statut_de_moderation_n_est_pas_modifiable_par_cette_route(self):
        reponse = self.client.patch(self.url, {'titre': 'Titre', 'statut_moderation': 'APPROUVEE'}, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.offre.refresh_from_db()
        self.assertEqual(self.offre.statut_moderation, 'EN_ATTENTE')

    def test_aucun_champ_a_corriger(self):
        reponse = self.client.patch(self.url, {'statut_moderation': 'APPROUVEE'}, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reservee_a_l_admin(self):
        self.client.force_authenticate(user=self.rh)
        self.assertIn(self.client.patch(self.url, {'titre': 'X'}, format='json').status_code, (401, 403))
        self.client.force_authenticate(user=None)
        self.assertIn(self.client.patch(self.url, {'titre': 'X'}, format='json').status_code, (401, 403))
        self.offre.refresh_from_db()
        self.assertEqual(self.offre.titre, 'Developeur web')

    def test_corrige_les_lieux_et_contrats_supplementaires(self):
        reponse = self.client.patch(self.url, {
            'lieux_supplementaires': [{'wilaya': '27 - Mostaganem', 'commune': ''}],
            'types_contrat_supplementaires': ['MISSION'],
        }, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK, reponse.data)
        self.offre.refresh_from_db()
        self.assertEqual(self.offre.lieux_supplementaires, [{'wilaya': '27 - Mostaganem', 'commune': ''}])
        self.assertEqual(self.offre.types_contrat_supplementaires, ['MISSION'])
        self.assertEqual(set(reponse.data['changements']), {'lieux_supplementaires', 'types_contrat_supplementaires'})
        # L'e-mail au recruteur est lisible : jamais la représentation Python d'une liste de dictionnaires.
        self.assertIn('27 - Mostaganem', mail.outbox[0].body)
        self.assertNotIn("{'wilaya'", mail.outbox[0].body)

    def test_refuse_un_lieu_ou_un_contrat_supplementaire_invalide(self):
        invalides = (
            {'lieux_supplementaires': [{'wilaya': '99 - Atlantide'}]},
            {'lieux_supplementaires': [{'wilaya': '16 - Alger'}]},  # le lieu principal ne se répète pas
            {'types_contrat_supplementaires': ['INCONNU']},
            {'types_contrat_supplementaires': ['CDI']},  # le contrat principal ne se répète pas
        )
        for corps in invalides:
            reponse = self.client.patch(self.url, corps, format='json')
            self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST, corps)
        self.offre.refresh_from_db()
        self.assertEqual((self.offre.lieux_supplementaires, self.offre.types_contrat_supplementaires), ([], []))

    def test_offre_introuvable(self):
        reponse = self.client.patch('/api/jobs/admin/offres/999999/corriger/', {'titre': 'X'}, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_404_NOT_FOUND)
