"""Correction client n°23 : validation / rejet des métiers proposés (même cycle que les compétences)."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import (
    Appellation, AuditLog, GroupeMetier, Metier, Notification, ProfilEntreprise, PropositionMetier,
)
from jobs.propositions_metier import MAX_PROPOSITIONS_OUVERTES_PAR_UTILISATEUR
from jobs.referentiel_utils import normaliser_recherche, resoudre_metier_depuis_texte

User = get_user_model()


class PropositionBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.groupe = GroupeMetier.objects.create(code='G-TEST', type_groupe='domaine', libelle='Informatique')
        self.metier = Metier.objects.create(
            code='M-TEST', libelle='Développeur web', cle_recherche='developpeur web',
            groupe_principal=self.groupe, selectionnable=True,
        )
        Appellation.objects.create(
            code='A-TEST', metier=self.metier, libelle='Développeur web', cle_recherche='developpeur web',
        )
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.candidat2 = User.objects.create_user(username='cand2', email='cand2@test.dz', role='CANDIDAT')
        self.rh = User.objects.create_user(username='rh', email='rh@test.dz', role='RECRUTEUR')
        ProfilEntreprise.objects.create(user=self.rh, nom_entreprise='ACME', registre_commerce='RC1', est_approuvee=True)
        self.rh_sans_entreprise = User.objects.create_user(username='rh0', email='rh0@test.dz', role='RECRUTEUR')
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)
        self.url_proposer = reverse('proposer-metier')
        self.url_liste = reverse('admin-propositions-metiers')

    def proposer(self, user, libelle='Technicien drone', contexte=''):
        self.client.force_authenticate(user=user)
        return self.client.post(self.url_proposer, {'libelle': libelle, 'contexte': contexte}, format='json')

    def creer(self, libelle='Technicien drone', user=None):
        self.proposer(user or self.candidat, libelle)
        return PropositionMetier.objects.get(cle_recherche=normaliser_recherche(libelle))

    def url_decision(self, proposition, action):
        return reverse(f'admin-proposition-metier-{action}', args=[proposition.pk])


class EnvoiTests(PropositionBase):
    def test_candidat_propose_sans_effet_sur_le_referentiel(self):
        avant = (Metier.objects.count(), Appellation.objects.count())
        reponse = self.proposer(self.candidat, 'Technicien drone', 'inspection de lignes')
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED)
        proposition = PropositionMetier.objects.get()
        self.assertEqual(proposition.statut, 'SUGGEREE')
        self.assertEqual(proposition.origine, 'CANDIDAT')
        self.assertEqual(proposition.contexte, 'inspection de lignes')
        self.assertEqual((Metier.objects.count(), Appellation.objects.count()), avant)
        self.assertIsNone(resoudre_metier_depuis_texte('Technicien drone'))

    def test_recruteur_avec_entreprise_peut_proposer(self):
        self.assertEqual(self.proposer(self.rh).status_code, status.HTTP_201_CREATED)
        self.assertEqual(PropositionMetier.objects.get().origine, 'RECRUTEUR')

    def test_roles_non_autorises_refuses(self):
        self.assertEqual(self.proposer(self.rh_sans_entreprise).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.proposer(self.admin).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(self.url_proposer, {'libelle': 'Technicien drone'}, format='json').status_code, 401)
        self.assertEqual(PropositionMetier.objects.count(), 0)

    def test_libelles_invalides(self):
        for libelle in ('ab', '   ', '12345', '!!! ???', 'x' * 121):
            with self.subTest(libelle=libelle):
                reponse = self.proposer(self.candidat, libelle)
                self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(reponse.data['code'], 'LIBELLE_INVALIDE')
        self.assertEqual(self.proposer(self.candidat, 'Technicien drone', 'x' * 301).data['code'], 'CONTEXTE_TROP_LONG')

    def test_metier_deja_present_refuse_meme_avec_accents_et_casse(self):
        reponse = self.proposer(self.candidat, '  DÉVELOPPEUR   Web ')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(reponse.data['code'], 'METIER_EXISTANT')
        self.assertEqual(reponse.data['metier_libelle'], 'Développeur web')

    def test_meme_demande_d_un_autre_compte_s_ajoute_sans_doublon(self):
        self.proposer(self.candidat)
        reponse = self.proposer(self.candidat2, 'technicien DRONE')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.assertTrue(reponse.data['deja_proposee'])
        self.assertEqual(PropositionMetier.objects.count(), 1)
        self.assertEqual(PropositionMetier.objects.get().demandeurs.count(), 2)

    def test_meme_compte_ne_compte_qu_une_fois(self):
        self.proposer(self.candidat)
        self.proposer(self.candidat)
        self.assertEqual(PropositionMetier.objects.get().demandeurs.count(), 1)

    def test_quota_de_propositions_ouvertes(self):
        for i in range(MAX_PROPOSITIONS_OUVERTES_PAR_UTILISATEUR):
            self.assertEqual(self.proposer(self.candidat, f'Métier inventé {chr(97 + i)}').status_code, 201)
        reponse = self.proposer(self.candidat, 'Un métier de trop')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(reponse.data['code'], 'TROP_DE_PROPOSITIONS')

    def test_proposition_rejetee_ne_peut_pas_etre_reproposee(self):
        proposition = self.creer()
        self.client.force_authenticate(user=self.admin)
        self.client.post(self.url_decision(proposition, 'rejeter'), {'motif': 'Trop spécifique'}, format='json')
        reponse = self.proposer(self.candidat2, 'Technicien drone')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(reponse.data['code'], 'DEJA_REJETEE')


class DecisionAdminTests(PropositionBase):
    def test_droits_admin_uniquement(self):
        proposition = self.creer()
        for user in (self.candidat, self.rh):
            self.client.force_authenticate(user=user)
            self.assertEqual(self.client.get(self.url_liste).status_code, status.HTTP_403_FORBIDDEN)
            reponse = self.client.post(self.url_decision(proposition, 'valider'), {'mode': 'RATTACHER', 'metier_id': self.metier.pk}, format='json')
            self.assertEqual(reponse.status_code, status.HTTP_403_FORBIDDEN)
        proposition.refresh_from_db()
        self.assertEqual(proposition.statut, 'SUGGEREE')

    def test_liste_avec_compteurs_et_email_reserve_a_l_admin(self):
        self.creer()
        self.client.force_authenticate(user=self.admin)
        donnees = self.client.get(self.url_liste, {'statut': 'SUGGEREE'}).data
        self.assertEqual(donnees['compteurs']['SUGGEREE'], 1)
        self.assertEqual(donnees['compteurs']['TOUTES'], 1)
        ligne = donnees['results'][0]
        self.assertEqual(ligne['proposee_par_email'], 'cand@test.dz')
        self.assertEqual(ligne['nb_demandeurs'], 1)
        self.assertEqual(ligne['transitions_possibles'], ['REJETEE', 'VALIDEE'])

    def test_groupes_charges_a_la_demande_et_limites_aux_vrais_groupes(self):
        vrai = GroupeMetier.objects.create(code='G-DOM', type_groupe='domaine_source', libelle='Drones et aéronautique', parent=self.groupe)
        GroupeMetier.objects.create(code='G-SEC', type_groupe='secteur_source', libelle='Secteur seulement')
        self.client.force_authenticate(user=self.admin)
        self.assertNotIn('groupes', self.client.get(self.url_liste).data)
        groupes = self.client.get(self.url_liste, {'groupes': '1'}).data['groupes']
        self.assertEqual([g['id'] for g in groupes], [vrai.id])
        self.assertEqual(groupes[0]['parent_libelle'], 'Informatique')

    def test_valider_en_rattachant_a_un_metier_existant(self):
        proposition = self.creer('Développeur front-end')
        self.proposer(self.candidat2, 'développeur front-end')
        self.client.force_authenticate(user=self.admin)
        reponse = self.client.post(
            self.url_decision(proposition, 'valider'), {'mode': 'RATTACHER', 'metier_id': self.metier.pk}, format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        proposition.refresh_from_db()
        self.assertEqual((proposition.statut, proposition.issue, proposition.traite_par), ('VALIDEE', 'RATTACHEE', self.admin))
        self.assertEqual(proposition.metier_resultat, self.metier)
        self.assertEqual(resoudre_metier_depuis_texte('Développeur front-end'), self.metier)
        self.assertEqual(Metier.objects.count(), 1)  # aucun nouveau métier
        self.assertEqual(Notification.objects.filter(titre='Métier ajouté à la liste').count(), 2)  # les 2 demandeurs
        self.assertTrue(AuditLog.objects.filter(action='STATUT_METIER', admin=self.admin).exists())

    def test_valider_en_creant_un_nouveau_metier(self):
        proposition = self.creer()
        self.client.force_authenticate(user=self.admin)
        reponse = self.client.post(
            self.url_decision(proposition, 'valider'), {'mode': 'CREER', 'groupe_id': self.groupe.pk}, format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        nouveau = Metier.objects.get(libelle='Technicien drone')
        self.assertEqual((nouveau.groupe_principal, nouveau.selectionnable, nouveau.metier_canonique), (self.groupe, True, nouveau))
        self.assertEqual(resoudre_metier_depuis_texte('technicien drone'), nouveau)
        proposition.refresh_from_db()
        self.assertEqual(proposition.issue, 'CREEE')

    def test_validations_invalides(self):
        proposition = self.creer()
        non_selectionnable = Metier.objects.create(
            code='M-OFF', libelle='Ancien métier', cle_recherche='ancien metier', selectionnable=False,
        )
        self.client.force_authenticate(user=self.admin)
        url = self.url_decision(proposition, 'valider')
        for corps in (
            {}, {'mode': 'INCONNU'}, {'mode': 'RATTACHER'}, {'mode': 'RATTACHER', 'metier_id': 999999},
            {'mode': 'CREER'}, {'mode': 'CREER', 'groupe_id': 999999},
            {'mode': 'RATTACHER', 'metier_id': non_selectionnable.pk},
        ):
            with self.subTest(corps=corps):
                self.assertEqual(self.client.post(url, corps, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        proposition.refresh_from_db()
        self.assertEqual(proposition.statut, 'SUGGEREE')
        self.assertEqual(Appellation.objects.filter(type_alias='proposition').count(), 0)

    def test_double_validation_refusee(self):
        proposition = self.creer()
        self.client.force_authenticate(user=self.admin)
        corps = {'mode': 'RATTACHER', 'metier_id': self.metier.pk}
        self.assertEqual(self.client.post(self.url_decision(proposition, 'valider'), corps, format='json').status_code, 200)
        self.assertEqual(self.client.post(self.url_decision(proposition, 'valider'), corps, format='json').status_code, 400)
        self.assertEqual(Appellation.objects.filter(type_alias='proposition').count(), 1)

    def test_rejet_avec_motif_notifie_le_proposant(self):
        proposition = self.creer()
        self.client.force_authenticate(user=self.admin)
        url = self.url_decision(proposition, 'rejeter')
        self.assertEqual(self.client.post(url, {'motif': 'ok'}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.post(url, {}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        reponse = self.client.post(url, {'motif': 'Intitulé trop spécifique'}, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        proposition.refresh_from_db()
        self.assertEqual((proposition.statut, proposition.motif_rejet), ('REJETEE', 'Intitulé trop spécifique'))
        notification = Notification.objects.get(destinataire=self.candidat)
        self.assertIn('Intitulé trop spécifique', notification.message)
        self.assertTrue(AuditLog.objects.filter(action='STATUT_METIER').exists())
        self.assertIsNone(resoudre_metier_depuis_texte('Technicien drone'))

    def test_rejetee_peut_etre_reexaminee_mais_pas_re_rejetee(self):
        proposition = self.creer()
        self.client.force_authenticate(user=self.admin)
        self.client.post(self.url_decision(proposition, 'rejeter'), {'motif': 'Premier avis'}, format='json')
        self.assertEqual(self.client.post(self.url_decision(proposition, 'rejeter'), {'motif': 'Encore non'}, format='json').status_code, 400)
        reponse = self.client.post(
            self.url_decision(proposition, 'valider'), {'mode': 'RATTACHER', 'metier_id': self.metier.pk}, format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        proposition.refresh_from_db()
        self.assertEqual((proposition.statut, proposition.motif_rejet), ('VALIDEE', ''))

    def test_proposition_inconnue_404(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.post(reverse('admin-proposition-metier-rejeter', args=[999999]), {'motif': 'Motif valable'}, format='json').status_code, 404)
