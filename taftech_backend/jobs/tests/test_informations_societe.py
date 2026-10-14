"""Correction client n°21 : coordonnées et informations société en source unique, modifiable par
l'admin, sans fausse valeur de test affichée."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from jobs.informations_societe import MARQUE, ligne_pied_de_page
from jobs.models import AuditLog, MentionsLegalesEntreprise

User = get_user_model()

CHAMPS_VIDES_PAR_DEFAUT = (
    'forme_juridique', 'capital_social', 'registre_commerce', 'nif', 'nis', 'tva',
    'representant_legal', 'directeur_publication', 'hebergeur', 'adresse', 'telephone',
    'whatsapp', 'email_contact', 'horaires', 'facebook_url', 'instagram_url', 'linkedin_url',
)


class InformationsSocieteBase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_user(username='adm', email='adm@test.com', role='ADMIN', is_staff=True)
        self.recruteur = User.objects.create_user(username='rh', email='rh@test.com', role='RECRUTEUR')
        self.url_admin = reverse('admin-mentions-legales')
        self.url_public = reverse('informations-societe')


class LecturePubliqueTests(InformationsSocieteBase):
    def test_public_sans_authentification_et_champs_vides_par_defaut(self):
        response = self.client.get(self.url_public)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for champ in CHAMPS_VIDES_PAR_DEFAUT:
            with self.subTest(champ=champ):
                self.assertEqual(response.data[champ], '')

    def test_aucune_coordonnee_de_test_par_defaut(self):
        contenu = str(self.client.get(self.url_public).data)
        for ancien in ('taftech963', '770 123', '770123', 'Taftechemploi', 'oranemploi'):
            self.assertNotIn(ancien, contenu)

    def test_modification_visible_immediatement_malgre_le_cache(self):
        self.client.get(self.url_public)  # remplit le cache
        self.client.force_authenticate(user=self.admin)
        self.client.put(self.url_admin, {'email_contact': 'contact@exemple.dz'}, format='json')
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self.url_public).data['email_contact'], 'contact@exemple.dz')


class EcritureAdminTests(InformationsSocieteBase):
    def test_admin_modifie_et_audit_liste_les_champs_modifies(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(self.url_admin, {
            'registre_commerce': '31/00-1234567B20', 'telephone': '+213 41 00 00 00',
            'facebook_url': 'https://www.facebook.com/exemple',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        infos = MentionsLegalesEntreprise.objects.get(pk=1)
        self.assertEqual(infos.registre_commerce, '31/00-1234567B20')
        log = AuditLog.objects.get(action='MODIFIER_INFOS_SOCIETE')
        self.assertEqual(log.admin, self.admin)
        for champ in ('registre_commerce', 'telephone', 'facebook_url'):
            self.assertIn(champ, log.detail)

    def test_modification_identique_ne_cree_aucun_log(self):
        self.client.force_authenticate(user=self.admin)
        self.client.put(self.url_admin, {'raison_sociale': 'TafTech'}, format='json')
        self.assertFalse(AuditLog.objects.filter(action='MODIFIER_INFOS_SOCIETE').exists())

    def test_liens_javascript_ou_ftp_refuses(self):
        self.client.force_authenticate(user=self.admin)
        for valeur in ('javascript:alert(1)', 'ftp://exemple.dz/x', 'data:text/html,x', 'pas-un-lien'):
            with self.subTest(valeur=valeur):
                response = self.client.put(self.url_admin, {'linkedin_url': valeur}, format='json')
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MentionsLegalesEntreprise.get_solo().linkedin_url, '')

    def test_telephone_whatsapp_et_email_invalides_refuses(self):
        self.client.force_authenticate(user=self.admin)
        for payload in ({'telephone': 'abc<script>'}, {'whatsapp': '+213 770'}, {'email_contact': 'pas-un-email'}):
            with self.subTest(payload=payload):
                response = self.client.put(self.url_admin, payload, format='json')
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_champ_trop_long_refuse_au_lieu_d_une_erreur_serveur(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(self.url_admin, {'registre_commerce': 'x' * 51}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recruteur_et_anonyme_refuses(self):
        self.assertIn(self.client.get(self.url_admin).status_code, (401, 403))
        self.client.force_authenticate(user=self.recruteur)
        self.assertEqual(self.client.get(self.url_admin).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.put(self.url_admin, {'nif': '1'}, format='json').status_code, status.HTTP_403_FORBIDDEN)


class PiedDePageDocumentsTests(InformationsSocieteBase):
    def test_sans_coordonnees_la_ligne_ne_contient_que_la_marque_et_la_raison_sociale(self):
        self.assertEqual(ligne_pied_de_page(), f"{MARQUE} | TafTech")

    def test_champs_renseignes_seulement_dans_l_ordre(self):
        infos = MentionsLegalesEntreprise.get_solo()
        infos.email_contact, infos.adresse = 'contact@exemple.dz', 'Oran'
        infos.save()
        self.assertEqual(ligne_pied_de_page(), f"{MARQUE} | TafTech | contact@exemple.dz | Oran")

    def test_valeurs_echappees_pour_reportlab(self):
        infos = MentionsLegalesEntreprise.get_solo()
        infos.adresse = 'Rue <b>1</b> & Cie'
        infos.save()
        ligne = ligne_pied_de_page()
        self.assertNotIn('<b>', ligne)
        self.assertIn('&lt;b&gt;', ligne)
        self.assertIn('&amp;', ligne)
