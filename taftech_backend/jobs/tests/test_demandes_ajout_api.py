"""Étape 1 des demandes d'ajout au référentiel : API publique de création et API admin de décision,
vérifiées sur de vraies routes (permissions, filtres, décisions, journal d'audit, statistiques)."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import (
    AliasDiplome, AuditLog, DemandeAjout, DiplomeSpecialite, DomaineFormation, ProfilCandidat, ProfilEntreprise,
    SpecialiteFormation, TypeDiplome,
)
from jobs.referentiel_utils import normaliser_recherche

User = get_user_model()
D = DemandeAjout


class ApiBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.licence = TypeDiplome.objects.create(code='D-LIC', libelle='Licence', systeme='superieur_lmd')
        self.autre = TypeDiplome.objects.create(code='D-AUTRE', libelle='Autre diplôme à préciser', systeme='autre')
        self.domaine = DomaineFormation.objects.create(code='DOM-1', libelle='Informatique', systeme='superieur_lmd')
        DomaineFormation.objects.create(code='D-AUTRE', libelle='Domaine non répertorié', systeme='autre')
        self.specialite = SpecialiteFormation.objects.create(
            code='SP-1', domaine=self.domaine, libelle='Génie logiciel', cle_recherche=normaliser_recherche('Génie logiciel'),
        )
        DiplomeSpecialite.objects.create(code='DS-1', diplome=self.licence, specialite=self.specialite)
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        ProfilCandidat.objects.create(user=self.candidat)
        self.rh = User.objects.create_user(username='rh', email='rh@test.dz', role='RECRUTEUR')
        ProfilEntreprise.objects.create(user=self.rh, nom_entreprise='ACME', registre_commerce='RC1', est_approuvee=True)
        self.rh_sans_entreprise = User.objects.create_user(username='rh0', email='rh0@test.dz', role='RECRUTEUR')
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)
        self.url_creer = reverse('demande-ajout-creer')
        self.url_liste = reverse('admin-demandes-ajout')

    def creer(self, utilisateur, libelle='Licence professionnelle', type_demande='DIPLOME', contexte=''):
        self.client.force_authenticate(user=utilisateur)
        return self.client.post(
            self.url_creer, {'type': type_demande, 'libelle': libelle, 'contexte': contexte}, format='json',
        )

    def demande(self, libelle='Licence professionnelle', type_demande='DIPLOME', utilisateur=None):
        reponse = self.creer(utilisateur or self.candidat, libelle, type_demande)
        self.assertIn(reponse.status_code, (200, 201), reponse.data)
        return D.objects.get(pk=reponse.data['id'])

    def url_decision(self, demande, action):
        return reverse(f'admin-demande-ajout-{action}', args=[demande.pk])


class CreationApiTests(ApiBase):
    def test_un_candidat_cree_une_demande_sans_effet_sur_le_referentiel(self):
        avant = (TypeDiplome.objects.count(), AliasDiplome.objects.count())
        reponse = self.creer(self.candidat, contexte='bac+3')
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED)
        self.assertFalse(reponse.data['deja_demandee'])
        demande = D.objects.get()
        self.assertEqual((demande.statut, demande.origine, demande.contexte), ('A_EXAMINER', 'CANDIDAT', 'bac+3'))
        self.assertEqual((TypeDiplome.objects.count(), AliasDiplome.objects.count()), avant)

    def test_un_recruteur_rattache_a_une_entreprise_peut_demander(self):
        reponse = self.creer(self.rh, 'Cybersécurité', 'SPECIALITE')
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED)
        self.assertEqual(D.objects.get().origine, 'RECRUTEUR')

    def test_une_demande_identique_est_rejointe(self):
        self.creer(self.candidat)
        reponse = self.creer(self.rh)
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.assertTrue(reponse.data['deja_demandee'])
        self.assertEqual((D.objects.count(), D.objects.get().demandeurs.count()), (1, 2))

    def test_recruteur_sans_entreprise_admin_et_anonyme_refuses(self):
        for utilisateur in (self.rh_sans_entreprise, self.admin):
            self.assertEqual(self.creer(utilisateur).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=None)
        reponse = self.client.post(self.url_creer, {'type': 'DIPLOME', 'libelle': 'Licence pro'}, format='json')
        self.assertIn(reponse.status_code, (401, 403))
        self.assertFalse(D.objects.exists())

    def test_erreurs_metier_avec_code_stable(self):
        cas = [
            ('INCONNU', 'Prompt engineering', 'TYPE_INCONNU'),
            ('DIPLOME', 'ab', 'LIBELLE_INVALIDE'),
            ('DIPLOME', 'Licence', 'ENTREE_EXISTANTE'),
            ('SPECIALITE', 'genie logiciel', 'ENTREE_EXISTANTE'),
        ]
        for type_demande, libelle, code in cas:
            reponse = self.creer(self.candidat, libelle, type_demande)
            self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST, libelle)
            self.assertEqual(reponse.data['code'], code, libelle)
        self.assertFalse(D.objects.exists())

    def test_entree_existante_renvoie_le_libelle_officiel(self):
        reponse = self.creer(self.candidat, 'licence')
        self.assertEqual(reponse.data['entree_libelle'], 'Licence')


class AccesAdminTests(ApiBase):
    def test_toutes_les_routes_admin_refusent_un_non_admin(self):
        demande = self.demande()
        routes = [
            ('get', self.url_liste, None),
            ('get', reverse('admin-demandes-ajout-parents') + '?type=DIPLOME', None),
            ('get', self.url_decision(demande, 'proches'), None),
            ('post', self.url_decision(demande, 'accepter'), {'parent': 'superieur_lmd'}),
            ('post', self.url_decision(demande, 'rattacher'), {'entree_id': self.licence.pk}),
            ('post', self.url_decision(demande, 'refuser'), {'motif': 'Hors périmètre'}),
        ]
        for utilisateur in (self.candidat, self.rh, None):
            self.client.force_authenticate(user=utilisateur)
            for methode, url, corps in routes:
                reponse = getattr(self.client, methode)(url, corps, format='json') if corps else getattr(self.client, methode)(url)
                self.assertIn(reponse.status_code, (401, 403), f"{utilisateur} {methode} {url}")
        demande.refresh_from_db()
        self.assertEqual(demande.statut, D.STATUT_A_EXAMINER)
        self.assertFalse(AuditLog.objects.filter(action='DECISION_DEMANDE_AJOUT').exists())


class ListeAdminTests(ApiBase):
    def setUp(self):
        super().setUp()
        self.d1 = self.demande('Licence professionnelle')
        self.d2 = self.demande('Cybersécurité', 'SPECIALITE')
        self.d3 = self.demande('Master professionnel')
        self.client.force_authenticate(user=self.admin)

    def liste(self, **parametres):
        return self.client.get(self.url_liste, parametres)

    def test_liste_filtree_par_type_avec_compteurs(self):
        reponse = self.liste(type='DIPLOME')
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual({d['libelle'] for d in reponse.data['results']}, {'Licence professionnelle', 'Master professionnel'})
        self.assertEqual((reponse.data['compteurs']['A_EXAMINER'], reponse.data['compteurs']['TOUTES']), (2, 2))
        self.assertEqual(reponse.data['count'], 2)

    def test_liste_filtree_par_statut_et_recherche(self):
        self.client.post(self.url_decision(self.d1, 'refuser'), {'motif': 'Hors périmètre'}, format='json')
        self.assertEqual([d['id'] for d in self.liste(type='DIPLOME', statut='REFUSEE').data['results']], [self.d1.pk])
        recherche = self.liste(type='DIPLOME', search='master').data['results']
        self.assertEqual([d['id'] for d in recherche], [self.d3.pk])

    def test_une_ligne_a_examiner_donne_les_entrees_proches_et_les_demandeurs(self):
        ligne = next(d for d in self.liste(type='DIPLOME').data['results'] if d['id'] == self.d1.pk)
        self.assertEqual(ligne['nb_demandeurs'], 1)
        self.assertEqual(ligne['demandeurs_apercu'][0]['email'], 'cand@test.dz')
        self.assertEqual(ligne['transitions_possibles'], ['ACCEPTEE', 'RATTACHEE', 'REFUSEE'])
        self.assertIn('Licence', [p['libelle'] for p in ligne['proches']])

    def test_une_demande_terminee_n_a_ni_proches_ni_transition(self):
        self.client.post(self.url_decision(self.d1, 'accepter'), {'parent': 'superieur_lmd'}, format='json')
        ligne = next(d for d in self.liste(type='DIPLOME').data['results'] if d['id'] == self.d1.pk)
        self.assertEqual((ligne['transitions_possibles'], ligne['proches'], ligne['statut']), ([], [], 'ACCEPTEE'))

    def test_statistiques_du_menu(self):
        stats = self.client.get('/api/jobs/admin/statistiques/')
        self.assertEqual(stats.status_code, 200)
        self.assertEqual(stats.data['demandes_a_examiner'], {'METIER': 0, 'COMPETENCE': 0, 'DIPLOME': 2, 'SPECIALITE': 1})
        self.client.post(self.url_decision(self.d1, 'refuser'), {'motif': 'Hors périmètre'}, format='json')
        stats = self.client.get('/api/jobs/admin/statistiques/')
        self.assertEqual(stats.data['demandes_a_examiner']['DIPLOME'], 1)

    def test_choix_du_formulaire_accepter(self):
        diplome = self.client.get(reverse('admin-demandes-ajout-parents'), {'type': 'DIPLOME'})
        self.assertEqual([s['valeur'] for s in diplome.data['systemes']], ['superieur_lmd'])
        specialite = self.client.get(reverse('admin-demandes-ajout-parents'), {'type': 'SPECIALITE'})
        self.assertEqual([d['libelle'] for d in specialite.data['domaines']], ['Informatique'])
        self.assertEqual([d['libelle'] for d in specialite.data['diplomes']], ['Licence'])
        self.assertEqual(self.client.get(reverse('admin-demandes-ajout-parents'), {'type': 'INCONNU'}).status_code, 400)

    def test_recherche_libre_d_une_entree_a_rattacher(self):
        url = self.url_decision(self.d1, 'proches')
        self.assertIn('Licence', [p['libelle'] for p in self.client.get(url).data['proches']])
        libre = self.client.get(url, {'q': 'lic'}).data['proches']
        self.assertEqual([p['libelle'] for p in libre], ['Licence'])


class DecisionsApiTests(ApiBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def demande(self, *args, **kwargs):
        demande = super().demande(*args, **kwargs)
        self.client.force_authenticate(user=self.admin)  # la création passe par le candidat : on repasse en admin pour décider
        return demande

    def test_accepter_cree_l_entree_et_ecrit_le_journal(self):
        demande = self.demande('Licence professionnelle')
        reponse = self.client.post(self.url_decision(demande, 'accepter'), {'parent': 'superieur_lmd'}, format='json')
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual((reponse.data['statut'], reponse.data['entree_libelle']), ('ACCEPTEE', 'Licence professionnelle'))
        self.assertTrue(TypeDiplome.objects.filter(code=f'TAF-DIP-{demande.pk}').exists())
        journal = AuditLog.objects.get(action='DECISION_DEMANDE_AJOUT')
        self.assertEqual(journal.admin, self.admin)
        self.assertIn('acceptée', journal.detail)

    def test_accepter_une_specialite_avec_domaine_et_diplomes(self):
        demande = self.demande('Cybersécurité', 'SPECIALITE')
        reponse = self.client.post(
            self.url_decision(demande, 'accepter'),
            {'parent': self.domaine.pk, 'diplomes_ids': [self.licence.pk]}, format='json',
        )
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertTrue(DiplomeSpecialite.objects.filter(code__startswith=f'TAF-DS-{demande.pk}-').exists())

    def test_rattacher_cree_un_alias_et_ecrit_le_journal(self):
        demande = self.demande('Licence pro')
        reponse = self.client.post(self.url_decision(demande, 'rattacher'), {'entree_id': self.licence.pk}, format='json')
        self.assertEqual((reponse.status_code, reponse.data['statut']), (200, 'RATTACHEE'))
        self.assertTrue(AliasDiplome.objects.filter(diplome=self.licence, cle_recherche='licence pro').exists())
        self.assertIn('rattachée', AuditLog.objects.get(action='DECISION_DEMANDE_AJOUT').detail)

    def test_refuser_exige_un_motif(self):
        demande = self.demande()
        url = self.url_decision(demande, 'refuser')
        self.assertEqual(self.client.post(url, {'motif': 'non'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {}, format='json').status_code, 400)
        reponse = self.client.post(url, {'motif': 'Hors périmètre'}, format='json')
        self.assertEqual((reponse.status_code, reponse.data['statut'], reponse.data['motif_refus']), (200, 'REFUSEE', 'Hors périmètre'))

    def test_erreurs_de_decision(self):
        demande = self.demande()
        self.assertEqual(self.client.post(self.url_decision(demande, 'accepter'), {}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url_decision(demande, 'rattacher'), {'entree_id': 99999}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url_decision(demande, 'rattacher'), {'entree_id': self.autre.pk}, format='json').status_code, 400)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, D.STATUT_A_EXAMINER)
        self.assertFalse(AuditLog.objects.filter(action='DECISION_DEMANDE_AJOUT').exists())

    def test_demande_inconnue(self):
        for action, corps in (('accepter', {}), ('rattacher', {}), ('refuser', {'motif': 'Hors périmètre'})):
            reponse = self.client.post(reverse(f'admin-demande-ajout-{action}', args=[99999]), corps, format='json')
            self.assertEqual(reponse.status_code, 404, action)
        self.assertEqual(self.client.get(reverse('admin-demande-ajout-proches', args=[99999])).status_code, 404)

    def test_une_decision_ne_se_rejoue_pas(self):
        demande = self.demande()
        self.client.post(self.url_decision(demande, 'accepter'), {'parent': 'superieur_lmd'}, format='json')
        reponse = self.client.post(self.url_decision(demande, 'refuser'), {'motif': 'Trop tard'}, format='json')
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(AuditLog.objects.filter(action='DECISION_DEMANDE_AJOUT').count(), 1)
