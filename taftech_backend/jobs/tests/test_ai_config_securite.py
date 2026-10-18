"""Configuration IA : prompts réservés au Super Admin, audit des modifications, plafond global
et alertes de consommation (correction client n°18)."""
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.ia_quota import consommer_quota_ia, verifier_quota_ia
from jobs.models import AIConfig, AuditLog, QuotaIAOverride, UtilisationIA

User = get_user_model()

PROMPTS = (
    'parser_cv_prompt', 'analyse_carriere_prompt', 'analyse_recruteur_prompt',
    'generation_offre_prompt', 'conseils_dashboard_prompt',
)
SECRET = "INSTRUCTION CONFIDENTIELLE DU PROMPT"


class ConfigIATestBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse('admin-ai-config')
        self.super_admin = User.objects.create_user(
            username='sa', email='sa@test.com', role='ADMIN', is_staff=True, is_superuser=True,
        )
        self.admin = User.objects.create_user(
            username='adm', email='adm@test.com', role='ADMIN', is_staff=True,
        )
        self.recruteur = User.objects.create_user(username='rh', email='rh@test.com', role='RECRUTEUR')
        config = AIConfig.get_solo()
        config.parser_cv_prompt = SECRET
        config.save()
        cache.clear()


class AccesPromptsTests(ConfigIATestBase):
    def test_super_admin_voit_les_prompts(self):
        self.client.force_authenticate(user=self.super_admin)
        data = self.client.get(self.url).data
        self.assertTrue(data['prompts_accessibles'])
        self.assertEqual(data['parser_cv_prompt'], SECRET)
        for champ in PROMPTS:
            self.assertIn(champ, data)

    def test_admin_simple_ne_recoit_aucun_prompt(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['prompts_accessibles'])
        for champ in PROMPTS:
            self.assertNotIn(champ, response.data)
        self.assertNotIn(SECRET, response.content.decode())
        # le reste de la configuration reste accessible
        self.assertIn('budget_ia_appels_mois_max', response.data)

    def test_admin_simple_ne_peut_pas_modifier_un_prompt(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(self.url, {'parser_cv_prompt': 'piraté'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['code'], 'PROMPTS_RESERVES_SUPER_ADMIN')
        self.assertEqual(AIConfig.objects.get(pk=1).parser_cv_prompt, SECRET)
        self.assertFalse(AuditLog.objects.filter(action='MODIFIER_PROMPT_IA').exists())

    def test_admin_simple_peut_modifier_la_config_sans_prompt(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(self.url, {'parser_cv_limite_jour': 7}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('parser_cv_prompt', response.data)
        self.assertEqual(AIConfig.objects.get(pk=1).parser_cv_limite_jour, 7)

    def test_admin_simple_ne_peut_pas_changer_fournisseur_ni_modele(self):
        avant = AIConfig.objects.get(pk=1)
        valeurs_avant = (
            avant.provider, avant.groq_model, avant.ollama_model,
            avant.temperature, avant.reasoning_effort, avant.parser_cv_max_tokens,
        )
        self.client.force_authenticate(user=self.admin)
        for payload in (
            {'provider': 'OLLAMA'}, {'groq_model': 'autre-modele'}, {'ollama_model': 'autre'},
            {'temperature': 1.5}, {'reasoning_effort': 'high'}, {'parser_cv_max_tokens': 9000},
        ):
            response = self.client.put(self.url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(response.data['code'], 'MODELE_RESERVE_SUPER_ADMIN')
        apres = AIConfig.objects.get(pk=1)
        self.assertEqual(
            (apres.provider, apres.groq_model, apres.ollama_model,
             apres.temperature, apres.reasoning_effort, apres.parser_cv_max_tokens),
            valeurs_avant,
        )
        self.assertFalse(AuditLog.objects.filter(action='MODIFIER_CONFIG_IA').exists())
        self.assertFalse(self.client.get(self.url).data['modele_modifiable'])

    def test_super_admin_peut_changer_le_modele(self):
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.put(self.url, {'groq_model': 'autre-modele'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['modele_modifiable'])
        self.assertEqual(AIConfig.objects.get(pk=1).groq_model, 'autre-modele')
        self.assertTrue(AuditLog.objects.filter(action='MODIFIER_CONFIG_IA').exists())

    def test_admin_simple_ne_peut_pas_modifier_le_plafond_ni_le_seuil(self):
        self.client.force_authenticate(user=self.admin)
        for payload in ({'budget_ia_appels_mois_max': 500}, {'budget_ia_alerte_pct': 50}):
            response = self.client.put(self.url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(response.data['code'], 'BUDGET_RESERVE_SUPER_ADMIN')
        config = AIConfig.objects.get(pk=1)
        self.assertIsNone(config.budget_ia_appels_mois_max)
        self.assertEqual(config.budget_ia_alerte_pct, 80)
        self.assertFalse(AuditLog.objects.filter(action='MODIFIER_CONFIG_IA').exists())

    def test_admin_simple_voit_le_plafond_mais_pas_modifiable(self):
        self.client.force_authenticate(user=self.admin)
        data = self.client.get(self.url).data
        self.assertIn('budget_ia_appels_mois_max', data)
        self.assertFalse(data['budget_modifiable'])

    def test_super_admin_peut_modifier_le_plafond(self):
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.put(self.url, {'budget_ia_appels_mois_max': 500}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['budget_modifiable'])
        self.assertEqual(AIConfig.objects.get(pk=1).budget_ia_appels_mois_max, 500)

    def test_recruteur_refuse(self):
        self.client.force_authenticate(user=self.recruteur)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.put(self.url, {}, format='json').status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_sans_role_admin_refuse(self):
        faux = User.objects.create_user(username='st', email='st@test.com', role='RECRUTEUR', is_staff=True)
        self.client.force_authenticate(user=faux)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)


class AuditConfigIATests(ConfigIATestBase):
    def test_modification_de_prompt_est_journalisee_sans_le_texte(self):
        self.client.force_authenticate(user=self.super_admin)
        nouveau = "Nouveau prompt très secret {cv_text} {domaines_list}"
        response = self.client.put(self.url, {'parser_cv_prompt': nouveau}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        log = AuditLog.objects.get(action='MODIFIER_PROMPT_IA')
        self.assertEqual(log.admin, self.super_admin)
        self.assertIn('parser_cv', log.detail)
        self.assertIn(f"{len(SECRET)}→{len(nouveau)}", log.detail)
        self.assertNotIn('secret', log.detail.lower())
        self.assertNotIn(SECRET, log.detail)
        self.assertFalse(AuditLog.objects.filter(action='MODIFIER_CONFIG_IA').exists())

    def test_creation_et_suppression_de_quota_personnalise_sont_journalisees(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse('admin-quota-ia-overrides'),
            {'user': self.recruteur.id, 'fonction': 'PARSER_CV', 'limite_jour': None, 'limite_mois': 5},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        creation = AuditLog.objects.get(action='MODIFIER_CONFIG_IA')
        self.assertEqual(creation.admin, self.admin)
        for morceau in ('Quota personnalisé défini', self.recruteur.email, 'PARSER_CV', '∞/jour', '5/mois'):
            self.assertIn(morceau, creation.detail)

        override = QuotaIAOverride.objects.get(user=self.recruteur)
        response = self.client.delete(reverse('admin-quota-ia-override-detail', args=[override.pk]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        details = list(AuditLog.objects.filter(action='MODIFIER_CONFIG_IA').order_by('id').values_list('detail', flat=True))
        self.assertEqual(len(details), 2)
        self.assertIn('Quota personnalisé supprimé', details[1])
        self.assertIn(self.recruteur.email, details[1])

    def test_suppression_d_un_quota_inexistant_ne_cree_aucun_log(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse('admin-quota-ia-override-detail', args=[999999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(AuditLog.objects.count(), 0)

    def test_prompt_inchange_ne_cree_aucun_log(self):
        self.client.force_authenticate(user=self.super_admin)
        self.client.put(self.url, {'parser_cv_prompt': SECRET}, format='json')
        self.assertEqual(AuditLog.objects.count(), 0)

    def test_modification_de_config_journalisee_avec_ancienne_et_nouvelle_valeur(self):
        self.client.force_authenticate(user=self.super_admin)
        self.client.put(self.url, {'groq_model': 'autre-modele', 'budget_ia_appels_mois_max': 1000}, format='json')
        log = AuditLog.objects.get(action='MODIFIER_CONFIG_IA')
        self.assertEqual(log.admin, self.super_admin)
        self.assertIn('groq_model: openai/gpt-oss-20b→autre-modele', log.detail)
        self.assertIn('budget_ia_appels_mois_max: None→1000', log.detail)

    def test_detail_d_audit_tronque_a_255_caracteres(self):
        self.client.force_authenticate(user=self.super_admin)
        corps = {champ: f"{champ} " + "x" * 400 for champ in PROMPTS}
        response = self.client.put(self.url, corps, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(AuditLog.objects.get(action='MODIFIER_PROMPT_IA').detail), 255)


class PlafondEtAlerteTests(ConfigIATestBase):
    def _config(self, plafond, pct=80):
        config = AIConfig.get_solo()
        config.budget_ia_appels_mois_max = plafond
        config.budget_ia_alerte_pct = pct
        config.save()
        cache.clear()

    def _appels(self, n):
        for _ in range(n):
            UtilisationIA.objects.create(user=self.recruteur, fonction='PARSER_CV')

    def _consommer(self):
        with self.captureOnCommitCallbacks(execute=True):
            consommer_quota_ia(self.recruteur, 'PARSER_CV')

    def test_sans_plafond_aucune_alerte(self):
        self._appels(50)
        self._consommer()
        self.assertEqual(len(mail.outbox), 0)

    def test_alerte_au_seuil_une_seule_fois_puis_alerte_d_epuisement(self):
        self._config(plafond=10, pct=80)
        self._appels(6)
        self._consommer()                      # 7e appel : 70 %
        self.assertEqual(len(mail.outbox), 0)
        self._consommer()                      # 8e appel : 80 % → alerte
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('80 %', mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ['sa@test.com'])
        self._consommer()                      # 9e appel : même niveau → pas de doublon
        self.assertEqual(len(mail.outbox), 1)
        self._consommer()                      # 10e appel : plafond atteint → épuisement
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn('épuisé', mail.outbox[1].subject)
        self._consommer()                      # au-delà : plus d'email
        self.assertEqual(len(mail.outbox), 2)

    def test_plafond_atteint_bloque_l_ia_pour_tous(self):
        self._config(plafond=3)
        self._appels(3)
        ok, payload = verifier_quota_ia(self.recruteur, 'PARSER_CV')
        self.assertFalse(ok)
        self.assertEqual(payload['code'], 'BUDGET_IA_EPUISE')

    def test_modifier_le_plafond_rearme_les_alertes(self):
        self._config(plafond=10, pct=50)
        self._appels(4)
        self._consommer()                      # 5e appel : 50 % → alerte
        self.assertEqual(len(mail.outbox), 1)
        self.client.force_authenticate(user=self.super_admin)
        self.client.put(self.url, {'budget_ia_appels_mois_max': 12}, format='json')
        self.assertEqual(AIConfig.objects.get(pk=1).budget_ia_alertes_envoyees, [])
        self._appels(1)
        self._consommer()                      # 7e appel : 58 % du nouveau plafond → nouvelle alerte
        self.assertEqual(len(mail.outbox), 2)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_panne_d_envoi_ne_bloque_pas_l_utilisateur(self):
        from unittest import mock
        self._config(plafond=2, pct=50)
        with mock.patch('jobs.ia_quota.send_mail', side_effect=RuntimeError('smtp down')):
            self._consommer()                  # ne doit lever aucune exception
        self.assertEqual(UtilisationIA.objects.count(), 1)

    def test_get_expose_la_consommation_du_mois(self):
        self._config(plafond=100)
        self._appels(7)
        self.client.force_authenticate(user=self.admin)
        data = self.client.get(self.url).data
        self.assertEqual(data['appels_ia_mois'], 7)
        self.assertEqual(data['budget_ia_alerte_pct'], 80)
        self.assertNotIn('budget_ia_alertes_envoyees', data)

    def test_seuil_d_alerte_borne_entre_1_et_100(self):
        self.client.force_authenticate(user=self.super_admin)
        for valeur in (0, 101):
            response = self.client.put(self.url, {'budget_ia_alerte_pct': valeur}, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
